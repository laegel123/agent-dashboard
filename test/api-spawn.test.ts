import { describe, it, expect, vi, beforeEach } from 'vitest';
import os from 'node:os';

// Replace the spawn lib so tests never actually open a terminal window.
vi.mock('@/lib/spawn', () => ({
  spawnClaudeSession: vi.fn(async () => ({ ok: true, method: 'mock' })),
}));

import { POST } from '../app/api/agents/../spawn/route';
import { spawnClaudeSession } from '@/lib/spawn';

const OK_ORIGIN = 'http://127.0.0.1:3000';
const HOME = os.homedir();
const UUID = '11111111-2222-3333-4444-555555555555';

const post = (body: unknown, headers: Record<string, string> = { origin: OK_ORIGIN }) =>
  POST(
    new Request('http://127.0.0.1:3000/api/spawn', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
  );

beforeEach(() => {
  vi.mocked(spawnClaudeSession).mockClear();
});

describe('POST /api/spawn — Origin enforcement (ADR-015)', () => {
  it('rejects missing Origin with 403', async () => {
    const res = await post({ sessionId: UUID, name: 'x', model: 'opus', cwd: HOME }, {});
    expect(res.status).toBe(403);
    expect(spawnClaudeSession).not.toHaveBeenCalled();
  });
  it('rejects unknown Origin with 403', async () => {
    const res = await post(
      { sessionId: UUID, name: 'x', model: 'opus', cwd: HOME },
      { origin: 'https://evil.example' }
    );
    expect(res.status).toBe(403);
  });
});

describe('POST /api/spawn — body validation', () => {
  it('rejects invalid JSON with 400', async () => {
    const res = await post('not-json{');
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/JSON/i);
  });
  it('rejects bad sessionId', async () => {
    const res = await post({ sessionId: 'not-a-uuid', name: 'x', model: 'opus', cwd: HOME });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/UUID/i);
  });
  it('rejects missing name', async () => {
    const res = await post({ sessionId: UUID, name: '   ', model: 'opus', cwd: HOME });
    expect(res.status).toBe(400);
  });
  it('rejects unknown model', async () => {
    const res = await post({ sessionId: UUID, name: 'x', model: 'gpt-4', cwd: HOME });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/opus.*sonnet.*haiku/);
  });
  it('rejects relative cwd', async () => {
    const res = await post({ sessionId: UUID, name: 'x', model: 'opus', cwd: 'relative/path' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/absolute/i);
  });
  it('rejects non-existent cwd', async () => {
    const res = await post({ sessionId: UUID, name: 'x', model: 'opus', cwd: '/nope/does/not/exist/zzz' });
    expect(res.status).toBe(400);
  });
  it('rejects task > 500 chars', async () => {
    const res = await post({
      sessionId: UUID, name: 'x', model: 'opus', cwd: HOME, task: 'a'.repeat(501),
    });
    expect(res.status).toBe(400);
  });
  it('accepts a valid body and calls spawnClaudeSession exactly once', async () => {
    const res = await post({ sessionId: UUID, name: 'demo', model: 'opus', cwd: HOME, task: 'do the thing' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, method: 'mock' });
    expect(spawnClaudeSession).toHaveBeenCalledTimes(1);
    expect(spawnClaudeSession).toHaveBeenCalledWith({
      sessionId: UUID, name: 'demo', model: 'opus', cwd: HOME, task: 'do the thing',
    });
  });
});
