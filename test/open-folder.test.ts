import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { spawnMock } = vi.hoisted(() => ({
  spawnMock: vi.fn(() => ({ unref: () => {} })),
}));

vi.mock('node:child_process', () => ({ spawn: spawnMock }));

import { openFolder } from '../lib/open-folder';

const ORIGINAL_PLATFORM = process.platform;
const setPlatform = (p: NodeJS.Platform) =>
  Object.defineProperty(process, 'platform', { value: p, writable: true, configurable: true });
const restorePlatform = () =>
  Object.defineProperty(process, 'platform', { value: ORIGINAL_PLATFORM, writable: true, configurable: true });

beforeEach(() => {
  spawnMock.mockReset();
  spawnMock.mockImplementation(() => ({ unref: () => {} }));
});

describe('openFolder', () => {
  afterEach(restorePlatform);

  it('macOS → `open <cwd>` 호출', async () => {
    setPlatform('darwin');
    const res = await openFolder('/Users/x/proj');
    expect(res).toEqual({ ok: true, method: 'macos-open' });
    expect(spawnMock).toHaveBeenCalledWith('open', ['/Users/x/proj'], expect.objectContaining({ detached: true, stdio: 'ignore' }));
  });

  it('Windows → `cmd /c start "" <cwd>` 호출', async () => {
    setPlatform('win32');
    const res = await openFolder('C:\\proj');
    expect(res).toEqual({ ok: true, method: 'win32-start' });
    expect(spawnMock).toHaveBeenCalledWith('cmd', ['/c', 'start', '""', 'C:\\proj'], expect.objectContaining({ detached: true, stdio: 'ignore' }));
  });

  it('Linux → `xdg-open <cwd>` 호출', async () => {
    setPlatform('linux');
    const res = await openFolder('/home/x/proj');
    expect(res).toEqual({ ok: true, method: 'linux-xdg-open' });
    expect(spawnMock).toHaveBeenCalledWith('xdg-open', ['/home/x/proj'], expect.objectContaining({ detached: true, stdio: 'ignore' }));
  });

  it('cwd 에 셸 메타문자 포함되어도 인자로만 전달(셸 해석 X)', async () => {
    setPlatform('darwin');
    await openFolder('/path/with; rm -rf');
    expect(spawnMock).toHaveBeenCalledWith('open', ['/path/with; rm -rf'], expect.any(Object));
  });
});
