/**
 * In-memory mtime cache over readSession (ADR-011).
 *
 * Unchanged files (same mtime + size) skip the disk read + per-line JSON.parse.
 * We cache the parsed records, NOT the derived status — status depends on live
 * session/PID state and must be recomputed every request (done in sessionToAgent).
 */

import { stat } from 'node:fs/promises';
import { readSession } from './claude-logs';
import type { JsonlRecord } from './types';

interface CacheEntry {
  mtimeMs: number;
  size: number;
  records: JsonlRecord[];
}

const cache = new Map<string, CacheEntry>();

export async function getCachedOrParse(filePath: string): Promise<JsonlRecord[]> {
  let st;
  try {
    st = await stat(filePath);
  } catch {
    return [];
  }

  const hit = cache.get(filePath);
  if (hit && hit.mtimeMs === st.mtimeMs && hit.size === st.size) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[log-cache] hit ${filePath}`);
    }
    return hit.records;
  }

  try {
    const records = await readSession(filePath);
    cache.set(filePath, { mtimeMs: st.mtimeMs, size: st.size, records });
    return records;
  } catch (e) {
    console.warn(`[log-cache] failed to read ${filePath}:`, e);
    return hit?.records ?? [];
  }
}

/** Test helper — reset between cases. */
export function clearLogCache(): void {
  cache.clear();
}
