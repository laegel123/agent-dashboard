/**
 * Status inference v2 (ADR-013 / DATA_MODEL §3).
 *
 * Three signals: PID alive (from sessions/<pid>.json + process.kill probe),
 * the last *core* record's type, and its age. Time alone is unreliable.
 *
 * Real-data note: tool_use / tool_result are content blocks inside
 * assistant / user messages, not top-level records. And the trailing records
 * of a live file are often metadata (permission-mode, ai-title, agent-name…)
 * with null timestamps — so we walk back to the last record that is both a
 * core type and timestamped, rather than blindly taking records[last].
 */

import { isProcessAlive, type SessionMeta } from './sessions-meta';
import type { JsonlRecord, Status, AssistantMsg, SystemMsg } from './types';

const CORE_TYPES = new Set(['assistant', 'user', 'system', 'tool_use', 'tool_result']);

function parseTimestamp(ts: string | undefined): number {
  return ts ? new Date(ts).getTime() : NaN;
}

/** Last record that is a core type AND carries a timestamp. */
function lastCoreRecord(records: JsonlRecord[]): JsonlRecord | undefined {
  for (let i = records.length - 1; i >= 0; i--) {
    const r = records[i];
    if (CORE_TYPES.has(r.type) && typeof r.timestamp === 'string') return r;
  }
  return undefined;
}

export function deriveStatus(
  records: JsonlRecord[],
  meta: SessionMeta | undefined,
  now: number = Date.now()
): Status {
  if (records.length === 0) return 'idle';

  // 1) Alive? No sessions/ file or dead PID → idle.
  const alive = meta != null && isProcessAlive(meta.pid);
  if (!alive) return 'idle';

  // 2) Alive → classify substate from the last meaningful record.
  const last = lastCoreRecord(records);
  if (!last) return 'waiting';

  const ageSec = (now - parseTimestamp(last.timestamp)) / 1000;

  if (last.type === 'system' && (last as SystemMsg & { level?: string }).level === 'error') {
    return 'error';
  }
  if (last.type === 'assistant' && (last as AssistantMsg).message?.stop_reason === 'tool_use') {
    return 'running'; // mid tool execution
  }
  if (last.type === 'tool_result') return ageSec < 60 ? 'running' : 'waiting';
  if (last.type === 'user') return ageSec < 60 ? 'running' : 'waiting';
  if (last.type === 'assistant' && (last as AssistantMsg).message?.stop_reason === 'end_turn') {
    return 'waiting'; // awaiting user input
  }

  return 'waiting'; // alive but unmatched pattern
}
