import { describe, it, expect, beforeEach } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, writeFile, appendFile, utimes, stat } from 'node:fs/promises';
import { getCachedOrParse, clearLogCache } from '../lib/log-cache';
import { sessionToAgent } from '../lib/claude-logs';
import type { SessionMeta } from '../lib/sessions-meta';

async function tmpFile(name: string, contents: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'cache-'));
  const file = path.join(dir, name);
  await writeFile(file, contents);
  return file;
}

const TS = '2026-05-30T10:00:00.000Z';
const ONE_USER = `{"type":"user","timestamp":"${TS}","sessionId":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","uuid":"u1","entrypoint":"cli","cwd":"/x","message":{"role":"user","content":"hi"}}\n`;

describe('getCachedOrParse', () => {
  beforeEach(() => clearLogCache());

  it('첫 호출(캐시 miss) → 파싱 + 저장', async () => {
    const file = await tmpFile('a.jsonl', ONE_USER);
    const records = await getCachedOrParse(file);
    expect(records.length).toBe(1);
    expect(records[0].type).toBe('user');
  });

  it('두 번째 호출, mtime+size 동일 → 동일 배열 ref 반환(재파싱 안 함)', async () => {
    const file = await tmpFile('b.jsonl', ONE_USER);
    const r1 = await getCachedOrParse(file);
    const r2 = await getCachedOrParse(file);
    expect(r2).toBe(r1);
  });

  it('mtime 같은데 size 변경 → 무효화', async () => {
    const file = await tmpFile('c.jsonl', ONE_USER);
    const r1 = await getCachedOrParse(file);
    const st1 = await stat(file);
    // append 한 줄 → size 증가. mtime 은 다시 원래 값으로 되돌려 mtime 동일 조건 보존.
    await appendFile(file, ONE_USER);
    await utimes(file, st1.atime, st1.mtime);
    const r2 = await getCachedOrParse(file);
    expect(r2).not.toBe(r1);
    expect(r2.length).toBe(2);
  });

  it('mtime 변경 → 무효화', async () => {
    const file = await tmpFile('d.jsonl', ONE_USER);
    const r1 = await getCachedOrParse(file);
    const st = await stat(file);
    // 미래로 mtime 만 변경 (size 동일)
    await utimes(file, st.atime, new Date(st.mtime.getTime() + 60_000));
    const r2 = await getCachedOrParse(file);
    expect(r2).not.toBe(r1);
    expect(r2.length).toBe(1);
  });

  it('존재하지 않는 파일 → 빈 배열', async () => {
    expect(await getCachedOrParse('/nope/zzz/file.jsonl')).toEqual([]);
  });

  it('status 는 캐시 안 함 — 동일 records 로 sessionToAgent 호출 시 meta 에 따라 status 변동', async () => {
    // 파일명 = sessionId(sessionToAgent 가 basename 으로 도출).
    const file = await tmpFile('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.jsonl', ONE_USER);
    const records = await getCachedOrParse(file);

    const dead = sessionToAgent(file, records, new Map());
    expect(dead.status).toBe('idle'); // no meta → idle

    const aliveMeta: SessionMeta = {
      pid: process.pid, sessionId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      cwd: '/x', startedAt: 0, version: '0', kind: 'interactive', entrypoint: 'cli',
    };
    const alive = sessionToAgent(file, records, new Map([[aliveMeta.sessionId, aliveMeta]]));
    expect(alive.status).not.toBe('idle');
  });
});
