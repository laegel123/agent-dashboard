/**
 * Domain + raw JSONL types.
 * Source of truth: docs/DATA_MODEL.md §1.2 and §2.
 *
 * Two layers:
 *   1. JsonlRecord — what we read from ~/.claude/projects/**\/*.jsonl
 *   2. Agent       — what the dashboard renders (1 session = 1 card)
 *
 * `review` is kept in the Status union for design-fidelity, even though
 * deriveStatus v2 (ADR-013) can never emit it from real data. See DATA_MODEL §2.
 */

export type Status = 'running' | 'waiting' | 'review' | 'error' | 'idle';

// ─── Domain ──────────────────────────────────────────────────────────────────

export interface Agent {
  id: string;                   // sessionId.slice(0, 8)
  name: string;                 // slug or last cwd segment
  status: Status;
  task: string;                 // slug or first user text (≤ 80)
  repo: string;                 // last 2 cwd segments, joined with '/'
  branch: string;               // gitBranch || '—'
  step: number;                 // heuristic — completed tool_use count, cap 10
  steps: number;                // heuristic — max(8, step + 2)
  tokens: number;               // input + output (cache excluded)
  cost: number;                 // USD (cache included via calculateCost)
  model: string;                // short form 'opus-4.7'
  edited: number;               // unique file_paths from Edit/Write/MultiEdit/NotebookEdit
  started: string;              // 'just now' / '14m' / '1h 4m' / '—'
  last: string;                 // one-line last action summary
  deps?: string[];              // optional handoff (empty in real data)

  // Meta — not in design, but we need it
  sessionId: string;            // full UUID
  filePath: string;             // absolute jsonl path
  cwd: string;                  // from JSONL
  firstTimestamp: number;       // ms epoch
  lastTimestamp: number;        // ms epoch
  entrypoint: 'cli';            // always 'cli' (filtered upstream)
}

export interface ChatMsg {
  role: 'user' | 'agent';
  text: string;
}

export type ActivityTone =
  | 'edit' | 'pr' | 'review' | 'error' | 'ok'
  | 'flag' | 'spawn' | 'progress' | 'msg' | 'action';

export interface ActivityEvent {
  id: number;
  t: string;                    // 'HH:MM' (local timezone)
  who: string;                  // agent.name
  what: string;
  tone: ActivityTone;
}

// ─── Raw JSONL records ───────────────────────────────────────────────────────

export type RecordType =
  | 'assistant' | 'user' | 'tool_use' | 'tool_result' | 'system'
  | 'attachment' | 'ai-title' | 'thinking' | 'text' | 'message' | 'direct'
  | 'permission-mode' | 'command_permissions' | 'task_reminder'
  | 'skill_listing' | 'tool_reference' | 'hook_non_blocking_error'
  | 'plan_mode' | 'plan_mode_exit'
  | 'messages_changed' | 'model_changed'
  | 'queue-operation' | 'create' | 'update' | 'last-prompt' | 'deferred_tools_delta';

export type Entrypoint = 'cli' | 'claude-desktop' | 'claude-vscode';

export interface BaseRecord {
  type: RecordType;
  timestamp: string;            // ISO-8601 UTC (100% in real data)
  sessionId: string;
  uuid: string;
  userType?: 'external' | 'internal';
  entrypoint?: Entrypoint;
  cwd?: string;
  version?: string;
  gitBranch?: string;
  slug?: string;
  parentUuid?: string;
}

export interface UsageBlock {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  server_tool_use?: {
    web_search_requests?: number;
    web_fetch_requests?: number;
  };
  cache_creation?: {
    ephemeral_1h_input_tokens?: number;
    ephemeral_5m_input_tokens?: number;
  };
  service_tier?: 'standard' | 'priority';
  inference_geo?: string;
  iterations?: Array<{
    input_tokens?: number;
    output_tokens?: number;
    [k: string]: unknown;
  }>;
  speed?: 'standard' | string;
}

export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input?: Record<string, unknown>;
}

export interface AssistantMsg extends BaseRecord {
  type: 'assistant';
  message: {
    model: string;              // 'claude-opus-4-7' etc.
    stop_reason: 'tool_use' | 'end_turn' | 'max_tokens';
    requestId: string;
    usage: UsageBlock;
    content: Array<TextBlock | ToolUseBlock>;
  };
}

export interface UserMsg extends BaseRecord {
  type: 'user';
  message?: {
    role: 'user';
    content: Array<{ type: 'text'; text: string } | Record<string, unknown>>;
  };
}

export interface ToolUseMsg extends BaseRecord {
  type: 'tool_use';
  name: string;
  input?: { file_path?: string; [k: string]: unknown };
}

export interface ToolResultMsg extends BaseRecord {
  type: 'tool_result';
  tool_use_id?: string;
  content?: unknown;
  is_error?: boolean;
}

export interface SystemMsg extends BaseRecord {
  type: 'system';
  content?: unknown;
}

export type OtherRecordType = Exclude<
  RecordType,
  'assistant' | 'user' | 'tool_use' | 'tool_result' | 'system'
>;

export interface OtherMsg extends BaseRecord {
  type: OtherRecordType;
}

export type JsonlRecord =
  | AssistantMsg
  | UserMsg
  | ToolUseMsg
  | ToolResultMsg
  | SystemMsg
  | OtherMsg;
