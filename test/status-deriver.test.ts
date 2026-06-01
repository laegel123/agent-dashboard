import { describe, it, expect } from 'vitest';
import { deriveStatus } from '../lib/status-deriver';
import type { JsonlRecord } from '../lib/types';
import type { SessionMeta } from '../lib/sessions-meta';

const NOW = 1_700_000_000_000;
const iso = (sec: number) => new Date(NOW - sec * 1000).toISOString();

// process.pid is guaranteed alive while the test runs.
const aliveMeta: SessionMeta = {
  pid: process.pid,
  sessionId: 's',
  cwd: '/x',
  startedAt: NOW,
  entrypoint: 'cli',
  version: '0',
  kind: 'interactive',
};

const rec = (over: Partial<JsonlRecord> & { type: string }) => over as unknown as JsonlRecord;

describe('deriveStatus', () => {
  it('empty records → idle', () => {
    expect(deriveStatus([], aliveMeta, NOW)).toBe('idle');
  });

  it('no live meta → idle (session ended / no sessions file)', () => {
    const records = [rec({ type: 'assistant', timestamp: iso(1), message: { stop_reason: 'tool_use' } as never })];
    expect(deriveStatus(records, undefined, NOW)).toBe('idle');
  });

  it('alive + assistant stop_reason tool_use → running', () => {
    const records = [rec({ type: 'assistant', timestamp: iso(300), message: { stop_reason: 'tool_use' } as never })];
    expect(deriveStatus(records, aliveMeta, NOW)).toBe('running');
  });

  it('alive + assistant end_turn → waiting', () => {
    const records = [rec({ type: 'assistant', timestamp: iso(5), message: { stop_reason: 'end_turn' } as never })];
    expect(deriveStatus(records, aliveMeta, NOW)).toBe('waiting');
  });

  it('alive + recent user → running, old user → waiting', () => {
    expect(deriveStatus([rec({ type: 'user', timestamp: iso(10) })], aliveMeta, NOW)).toBe('running');
    expect(deriveStatus([rec({ type: 'user', timestamp: iso(120) })], aliveMeta, NOW)).toBe('waiting');
  });

  it('alive + system level=error → error', () => {
    const records = [rec({ type: 'system', timestamp: iso(2), level: 'error' } as never)];
    expect(deriveStatus(records, aliveMeta, NOW)).toBe('error');
  });

  it('ignores trailing metadata records with null timestamps', () => {
    const records = [
      rec({ type: 'assistant', timestamp: iso(300), message: { stop_reason: 'tool_use' } as never }),
      rec({ type: 'ai-title', timestamp: undefined }),
      rec({ type: 'permission-mode', timestamp: undefined }),
    ];
    expect(deriveStatus(records, aliveMeta, NOW)).toBe('running');
  });

  it('meta 있지만 PID dead → idle', () => {
    // 절대 살아있지 않을 PID 로 isProcessAlive 가 false → idle
    const deadMeta = { ...aliveMeta, pid: 99999999 };
    const records = [rec({ type: 'assistant', timestamp: iso(5), message: { stop_reason: 'tool_use' } as never })];
    expect(deriveStatus(records, deadMeta, NOW)).toBe('idle');
  });

  it('alive + top-level tool_result + ageSec < 60 → running', () => {
    const records = [rec({ type: 'tool_result', timestamp: iso(10) })];
    expect(deriveStatus(records, aliveMeta, NOW)).toBe('running');
  });

  it('alive + top-level tool_result + ageSec >= 60 → waiting', () => {
    const records = [rec({ type: 'tool_result', timestamp: iso(120) })];
    expect(deriveStatus(records, aliveMeta, NOW)).toBe('waiting');
  });

  it('alive + 알 수 없는 type (thinking) → default waiting (core record 없음)', () => {
    const records = [rec({ type: 'thinking', timestamp: iso(5) })];
    expect(deriveStatus(records, aliveMeta, NOW)).toBe('waiting');
  });
});
