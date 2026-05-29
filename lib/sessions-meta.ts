/**
 * Live-session metadata from ~/.claude/sessions/<pid>.json.
 *
 * Claude Code writes one JSON file per running session and deletes it on exit,
 * so a present file is a strong "alive" signal. `isProcessAlive` double-checks
 * the PID to guard against stale files (rare). See ADR-013 / DATA_MODEL §1.1.1.
 */

import os from 'node:os';
import path from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import type { Entrypoint } from './types';

export interface SessionMeta {
  pid: number;
  sessionId: string;
  cwd: string;
  startedAt: number;
  entrypoint: Entrypoint;
  version: string;
  kind: string;          // 'interactive' | 'agent' | …
  name?: string;         // user-facing session name (alive sessions only)
  status?: string;       // 'busy' | 'idle' | … (advisory; not used by deriveStatus)
}

function sessionsDir(): string {
  return path.join(os.homedir(), '.claude', 'sessions');
}

/**
 * `process.kill(pid, 0)` throws ESRCH if the process is gone, EPERM if it
 * exists but we lack permission to signal it — the latter still means alive.
 */
export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException)?.code === 'EPERM';
  }
}

/** Map keyed by sessionId. Missing dir → empty map. Bad JSON files are skipped. */
export async function loadActiveSessions(): Promise<Map<string, SessionMeta>> {
  const dir = sessionsDir();
  const map = new Map<string, SessionMeta>();

  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return map; // sessions/ may not exist yet
  }

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const raw = await readFile(path.join(dir, file), 'utf8');
      const meta = JSON.parse(raw) as SessionMeta;
      if (meta && typeof meta.sessionId === 'string') {
        map.set(meta.sessionId, meta);
      }
    } catch {
      // skip unreadable / malformed session files
    }
  }

  return map;
}
