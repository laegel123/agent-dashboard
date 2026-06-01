import { describe, it, expect, vi, beforeEach } from 'vitest';
const REAL_DIR = process.cwd();

vi.mock('@/lib/open-folder', () => ({
  openFolder: vi.fn(async (cwd: string) => ({ ok: true, method: `mock:${cwd}` })),
}));

import { POST } from '../app/api/open-folder/route';
import { openFolder } from '@/lib/open-folder';

const OK_ORIGIN = 'http://127.0.0.1:3000';

const post = (body: unknown, headers: Record<string, string> = { origin: OK_ORIGIN }) =>
  POST(
    new Request('http://127.0.0.1:3000/api/open-folder', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
  );

beforeEach(() => vi.mocked(openFolder).mockClear());

describe('POST /api/open-folder', () => {
  it('rejects missing Origin with 403', async () => {
    const res = await post({ cwd: REAL_DIR }, {});
    expect(res.status).toBe(403);
    expect(openFolder).not.toHaveBeenCalled();
  });
  it('rejects relative cwd', async () => {
    const res = await post({ cwd: 'relative' });
    expect(res.status).toBe(400);
  });
  it('rejects non-existent cwd', async () => {
    const res = await post({ cwd: '/nope/does/not/exist/zzz' });
    expect(res.status).toBe(400);
  });
  it('accepts an existing absolute dir and calls openFolder', async () => {
    const res = await post({ cwd: REAL_DIR });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, method: `mock:${REAL_DIR}` });
    expect(openFolder).toHaveBeenCalledWith(REAL_DIR);
  });
});
