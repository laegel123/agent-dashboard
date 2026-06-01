import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { spawnMock } = vi.hoisted(() => ({
  spawnMock: vi.fn(() => ({ unref: () => {} })),
}));

vi.mock('node:child_process', () => ({ spawn: spawnMock }));

import { spawnClaudeSession, type SpawnOpts } from '../lib/spawn';

const ORIGINAL_PLATFORM = process.platform;
const setPlatform = (p: NodeJS.Platform) =>
  Object.defineProperty(process, 'platform', { value: p, writable: true, configurable: true });
const restorePlatform = () =>
  Object.defineProperty(process, 'platform', { value: ORIGINAL_PLATFORM, writable: true, configurable: true });

const opts = (over: Partial<SpawnOpts> = {}): SpawnOpts => ({
  cwd: '/test/path',
  name: 'demo',
  model: 'opus',
  sessionId: '11111111-2222-3333-4444-555555555555',
  task: 'do thing',
  ...over,
});

beforeEach(() => {
  spawnMock.mockReset();
  spawnMock.mockImplementation(() => ({ unref: () => {} }));
});

describe('spawnClaudeSession — Windows', () => {
  beforeEach(() => setPlatform('win32'));
  afterEach(restorePlatform);

  it('cmd /c start "" cmd /k <claude ...> 형태', async () => {
    const res = await spawnClaudeSession(opts());
    expect(res).toEqual({ ok: true, method: 'win32-start-cmd' });
    expect(spawnMock).toHaveBeenCalledWith(
      'cmd',
      expect.arrayContaining(['/c', 'start', '""', 'cmd', '/k']),
      expect.objectContaining({ cwd: '/test/path', detached: true, stdio: 'ignore' })
    );
    const args = spawnMock.mock.calls[0][1] as string[];
    expect(args[5]).toMatch(/^claude /);
    expect(args[5]).toContain('--session-id');
  });

  it('name 에 공백 포함 → "" 로 quote', async () => {
    await spawnClaudeSession(opts({ name: 'my agent' }));
    const args = spawnMock.mock.calls[0][1] as string[];
    expect(args[5]).toContain('"my agent"');
  });

  it('task 에 따옴표 포함 → \\" escape', async () => {
    await spawnClaudeSession(opts({ task: 'say "hi"' }));
    const args = spawnMock.mock.calls[0][1] as string[];
    expect(args[5]).toContain('"say \\"hi\\""');
  });

  it('detached + stdio ignore + unref 호출', async () => {
    const unref = vi.fn();
    spawnMock.mockReturnValueOnce({ unref });
    await spawnClaudeSession(opts());
    expect(unref).toHaveBeenCalled();
    expect(spawnMock.mock.calls[0][2]).toMatchObject({ detached: true, stdio: 'ignore' });
  });
});

describe('spawnClaudeSession — macOS', () => {
  beforeEach(() => setPlatform('darwin'));
  afterEach(restorePlatform);

  it('osascript -e tell application "Terminal" to do script — cd ... && claude ...', async () => {
    const res = await spawnClaudeSession(opts());
    expect(res).toEqual({ ok: true, method: 'macos-osascript' });
    const [bin, args] = spawnMock.mock.calls[0] as [string, string[]];
    expect(bin).toBe('osascript');
    expect(args[0]).toBe('-e');
    expect(args[1]).toContain('tell application "Terminal" to do script');
    expect(args[1]).toContain("cd '/test/path'");
    expect(args[1]).toContain("claude '--name' 'demo'");
  });

  it("cwd 에 따옴표 포함 → POSIX 단일따옴표 escape", async () => {
    await spawnClaudeSession(opts({ cwd: "/users/it's/path" }));
    const args = spawnMock.mock.calls[0][1] as string[];
    // POSIX 단일따옴표 escape("'\\''") 가 AppleScript 더블쿼트 안에 들어가면서
    // 각 backslash 가 한 번 더 escape 됨 → "'\\\\''" (실제 문자열 4-char: '\\''→'\\\\'')
    expect(args[1]).toContain("'/users/it'\\\\''s/path'");
  });
});

describe('spawnClaudeSession — Linux', () => {
  let originalTerm: string | undefined;
  beforeEach(() => { setPlatform('linux'); originalTerm = process.env.TERMINAL; delete process.env.TERMINAL; });
  afterEach(() => { restorePlatform(); if (originalTerm) process.env.TERMINAL = originalTerm; else delete process.env.TERMINAL; });

  it('$TERMINAL 환경변수 우선', async () => {
    process.env.TERMINAL = 'kitty';
    const res = await spawnClaudeSession(opts());
    expect(res).toEqual({ ok: true, method: 'linux-kitty' });
    expect(spawnMock).toHaveBeenCalledWith(
      'kitty',
      expect.arrayContaining(['--working-directory', '/test/path', '--', 'claude']),
      expect.any(Object)
    );
  });

  it('$TERMINAL 없으면 gnome-terminal --working-directory ... -- claude ... 형태', async () => {
    const res = await spawnClaudeSession(opts());
    expect(res).toEqual({ ok: true, method: 'linux-gnome-terminal' });
    expect(spawnMock.mock.calls[0][0]).toBe('gnome-terminal');
  });

  it('모든 후보 실패 → throw', async () => {
    spawnMock.mockImplementation(() => { throw new Error('not found'); });
    await expect(spawnClaudeSession(opts())).rejects.toThrow(/No terminal emulator/);
  });

  it('첫 후보 실패하면 다음 후보 시도', async () => {
    process.env.TERMINAL = 'nonexistent';
    let firstCall = true;
    spawnMock.mockImplementation(() => {
      if (firstCall) { firstCall = false; throw new Error('ENOENT'); }
      return { unref: () => {} };
    });
    const res = await spawnClaudeSession(opts());
    expect(res.method).toBe('linux-gnome-terminal');
  });
});
