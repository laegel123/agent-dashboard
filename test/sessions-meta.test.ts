import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { loadActiveSessions, isProcessAlive, type SessionMeta } from '../lib/sessions-meta';

const FIX = (name: string) => path.resolve(__dirname, 'fixtures', name);

async function tmpHomeWithSessions(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'cdh-'));
  const dir = path.join(root, '.claude', 'sessions');
  await mkdir(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    await writeFile(path.join(dir, name), content);
  }
  return root;
}

const meta = (pid: number, sessionId: string): string =>
  JSON.stringify({ pid, sessionId, cwd: '/x', startedAt: 0, version: '0', kind: 'interactive', entrypoint: 'cli' } satisfies SessionMeta);

describe('loadActiveSessions', () => {
  let original: string | undefined;
  beforeEach(() => { original = process.env.HOME; });
  afterEach(() => { process.env.HOME = original; });

  it('sessions/ 디렉토리 없음 → 빈 Map', async () => {
    process.env.HOME = FIX('claude-home-empty');
    const m = await loadActiveSessions();
    expect(m.size).toBe(0);
  });

  it('정상 1개 파일(fixture) → Map size 1, sessionId 키', async () => {
    process.env.HOME = FIX('claude-home-normal');
    const m = await loadActiveSessions();
    expect(m.size).toBe(1);
    expect(m.has('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')).toBe(true);
    expect(m.get('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')?.pid).toBe(99999);
  });

  it('정상 3개 파일 → Map size 3', async () => {
    process.env.HOME = await tmpHomeWithSessions({
      '1.json': meta(1, 's1'),
      '2.json': meta(2, 's2'),
      '3.json': meta(3, 's3'),
    });
    const m = await loadActiveSessions();
    expect(m.size).toBe(3);
  });

  it('깨진 JSON 1개 + 정상 2개 → Map size 2 (깨진 것만 skip)', async () => {
    process.env.HOME = await tmpHomeWithSessions({
      '1.json': meta(1, 's1'),
      '2.json': '{not-valid-json',
      '3.json': meta(3, 's3'),
    });
    const m = await loadActiveSessions();
    expect(m.size).toBe(2);
    expect(m.has('s2')).toBe(false);
  });

  it('빈 파일 → skip', async () => {
    process.env.HOME = await tmpHomeWithSessions({
      '1.json': meta(1, 's1'),
      'empty.json': '',
    });
    const m = await loadActiveSessions();
    expect(m.size).toBe(1);
  });
});

describe('isProcessAlive', () => {
  it('현재 프로세스 PID → true', () => {
    expect(isProcessAlive(process.pid)).toBe(true);
  });

  it('확실히 없는 PID 99999999 → false', () => {
    expect(isProcessAlive(99999999)).toBe(false);
  });

  it('EPERM 시뮬레이션 → true', () => {
    const spy = vi.spyOn(process, 'kill').mockImplementation(((..._a: unknown[]) => {
      const e = new Error('EPERM') as NodeJS.ErrnoException;
      e.code = 'EPERM';
      throw e;
    }) as unknown as typeof process.kill);
    expect(isProcessAlive(1)).toBe(true);
    spy.mockRestore();
  });

  it('ESRCH 시뮬레이션 → false', () => {
    const spy = vi.spyOn(process, 'kill').mockImplementation(((..._a: unknown[]) => {
      const e = new Error('ESRCH') as NodeJS.ErrnoException;
      e.code = 'ESRCH';
      throw e;
    }) as unknown as typeof process.kill);
    expect(isProcessAlive(1)).toBe(false);
    spy.mockRestore();
  });
});
