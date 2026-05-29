/**
 * Read ~/.claude/projects/**\/*.jsonl and turn each session into an Agent card.
 *
 * Real-format notes (verified against live logs, 2026-05):
 *  - The filename IS the sessionId — the most reliable source.
 *  - tool_use / tool_result / thinking are CONTENT BLOCKS inside assistant /
 *    user messages, not top-level records. So `edited` and tool counts come
 *    from assistant.message.content[], not from a top-level record type.
 *  - Metadata records (permission-mode, ai-title, agent-name, mode, last-prompt,
 *    file-history-snapshot) carry null cwd / entrypoint / timestamp. We scan for
 *    the first record that actually has each field instead of trusting records[0].
 *
 * See DATA_MODEL §1, §4 and ADR-010.
 */

import os from 'node:os';
import path from 'node:path';
import { readdir, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import type {
  JsonlRecord,
  Agent,
  AssistantMsg,
  UserMsg,
  ToolUseBlock,
  Entrypoint,
} from './types';
import type { SessionMeta } from './sessions-meta';
import { deriveStatus } from './status-deriver';
import { calculateCost, shortModel } from './pricing';
import { relativeTime } from './format-time';

const EDIT_TOOLS = /^(Edit|Write|MultiEdit|NotebookEdit)$/;
const STEP_CAP = 10;
const MIN_STEPS = 8;

export function getClaudeHome(): string {
  return path.join(os.homedir(), '.claude');
}

function projectsRoot(): string {
  return path.join(getClaudeHome(), 'projects');
}

/** Distinguishes "Claude never ran here" from "ran, but no CLI sessions". */
export async function projectsRootExists(): Promise<boolean> {
  try {
    return (await stat(projectsRoot())).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Absolute paths of every main-session .jsonl. Subagent files live in a
 * `subagents/` subdir and are skipped (ADR-010); we only read the top level
 * of each project directory.
 */
export async function scanProjects(): Promise<string[]> {
  const root = projectsRoot();
  let dirs;
  try {
    dirs = await readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }

  const out: string[] = [];
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const projDir = path.join(root, d.name);
    let entries;
    try {
      entries = await readdir(projDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (e.isFile() && e.name.endsWith('.jsonl')) {
        out.push(path.join(projDir, e.name));
      }
    }
  }
  return out;
}

/**
 * Line-by-line streaming parse. A line that fails JSON.parse is skipped with a
 * warning — this routinely happens for the last line of a session that is being
 * appended to concurrently.
 */
export async function readSession(filePath: string): Promise<JsonlRecord[]> {
  const records: JsonlRecord[] = [];
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      records.push(JSON.parse(trimmed) as JsonlRecord);
    } catch {
      // partial/concurrent-append line — skip
    }
  }
  return records;
}

/** Session entrypoint: live meta wins, else first record that declares one. */
export function sessionEntrypoint(
  records: JsonlRecord[],
  meta?: SessionMeta
): Entrypoint | undefined {
  if (meta?.entrypoint) return meta.entrypoint;
  for (const r of records) {
    const ep = (r as { entrypoint?: Entrypoint }).entrypoint;
    if (ep) return ep;
  }
  return undefined;
}

export function sessionToAgent(
  filePath: string,
  records: JsonlRecord[],
  activeSessions: Map<string, SessionMeta>
): Agent {
  const sessionId = path.basename(filePath, '.jsonl');
  const meta = activeSessions.get(sessionId);

  const cwd = meta?.cwd ?? firstField<string>(records, 'cwd') ?? '';
  const gitBranch = firstField<string>(records, 'gitBranch') ?? '—';
  const slug = firstField<string>(records, 'slug');

  const timestamped = records.filter((r) => typeof r.timestamp === 'string');
  const firstTs = timestamped.length ? parseTimestamp(timestamped[0].timestamp) : 0;
  const lastTs = timestamped.length
    ? parseTimestamp(timestamped[timestamped.length - 1].timestamp)
    : 0;

  let tokens = 0;
  let cost = 0;
  let lastModel = 'claude-sonnet-4-6';
  const editedFiles = new Set<string>();
  let toolUseCount = 0;

  for (const r of records) {
    if (r.type !== 'assistant') continue;
    const msg = (r as AssistantMsg).message;
    if (!msg) continue;

    if (msg.usage) {
      tokens += (msg.usage.input_tokens ?? 0) + (msg.usage.output_tokens ?? 0);
      cost += calculateCost(msg.usage, msg.model);
    }
    // Ignore synthetic/internal messages (model: '<synthetic>') for display.
    if (msg.model && msg.model.startsWith('claude')) lastModel = msg.model;

    if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block && block.type === 'tool_use') {
          toolUseCount++;
          const tu = block as ToolUseBlock;
          if (EDIT_TOOLS.test(tu.name ?? '')) {
            const fp = (tu.input as { file_path?: string } | undefined)?.file_path;
            if (fp) editedFiles.add(fp);
          }
        }
      }
    }
  }

  return {
    id: sessionId.slice(0, 8),
    name: meta?.name || slug || deriveNameFromCwd(cwd),
    status: deriveStatus(records, meta),
    task: (firstUserText(records) || slug || 'session').slice(0, 80),
    repo: parseRepo(cwd),
    branch: gitBranch,
    step: Math.min(toolUseCount, STEP_CAP),
    steps: Math.max(MIN_STEPS, toolUseCount + 2),
    tokens,
    cost,
    model: shortModel(lastModel),
    edited: editedFiles.size,
    started: firstTs ? relativeTime(firstTs) : '—',
    last: summarizeLast(records),
    sessionId,
    filePath,
    cwd,
    firstTimestamp: firstTs,
    lastTimestamp: lastTs,
    entrypoint: 'cli', // route only converts cli sessions
  };
}

// ─── helpers ───────────────────────────────────────────────────────────────

function parseTimestamp(ts: string | undefined): number {
  return ts ? new Date(ts).getTime() : 0;
}

function firstField<T>(records: JsonlRecord[], key: string): T | undefined {
  for (const r of records) {
    const v = (r as unknown as Record<string, unknown>)[key];
    if (v != null) return v as T;
  }
  return undefined;
}

function deriveNameFromCwd(cwd: string): string {
  const parts = cwd.replace(/\\/g, '/').split('/').filter(Boolean);
  return parts[parts.length - 1] || 'session';
}

function parseRepo(cwd: string): string {
  const parts = cwd.replace(/\\/g, '/').split('/').filter(Boolean);
  return parts.slice(-2).join('/') || '—';
}

function firstUserText(records: JsonlRecord[]): string {
  for (const r of records) {
    if (r.type !== 'user') continue;
    const content = (r as UserMsg).message?.content as unknown;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      for (const block of content) {
        const b = block as { type?: string; text?: string };
        if (b?.type === 'text' && typeof b.text === 'string') return b.text;
      }
    }
  }
  return '';
}

function summarizeLast(records: JsonlRecord[]): string {
  let last: JsonlRecord | undefined;
  for (let i = records.length - 1; i >= 0; i--) {
    const t = records[i].type;
    if (t === 'assistant' || t === 'user' || t === 'system') {
      last = records[i];
      break;
    }
  }
  if (!last) return 'idle';

  if (last.type === 'user') return 'awaiting next turn';
  if (last.type === 'system') return 'system event';
  if (last.type === 'assistant') {
    const msg = (last as AssistantMsg).message;
    if (msg?.stop_reason === 'tool_use') {
      const tool = lastToolName(msg.content);
      return tool ? `running tool: ${tool}` : 'running tools';
    }
    return 'sent a response';
  }
  return last.type;
}

function lastToolName(content: AssistantMsg['message']['content']): string | undefined {
  if (!Array.isArray(content)) return undefined;
  for (let i = content.length - 1; i >= 0; i--) {
    const block = content[i];
    if (block && block.type === 'tool_use') return (block as ToolUseBlock).name;
  }
  return undefined;
}
