import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import { GET } from '../app/api/agents/route';
import { clearLogCache } from '../lib/log-cache';
import * as sessionsMeta from '../lib/sessions-meta';

const FIX = (name: string) => path.resolve(__dirname, 'fixtures', name);
const NOW = new Date('2026-06-01T00:00:00.000Z');

const fetchAgents = async (since?: string) => {
  const url = `http://127.0.0.1:3000/api/agents${since ? `?since=${since}` : ''}`;
  const res = await GET(new Request(url));
  return { status: res.status, body: await res.json() };
};

let originalHome: string | undefined;

beforeAll(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
});
afterAll(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  clearLogCache();
  originalHome = process.env.HOME;
  // Treat the lone fixture PID (99999) as alive so the matching session has a
  // non-idle status. All other PIDs fall back to the real isProcessAlive check
  // (which says 'no' for them).
  vi.spyOn(sessionsMeta, 'isProcessAlive').mockImplementation((pid) => pid === 99999);
});
afterEach(() => {
  process.env.HOME = originalHome;
  vi.restoreAllMocks();
});

describe('GET /api/agents', () => {
  it('빈 디렉토리 (projects 부재) → agents []·projectsFound false', async () => {
    process.env.HOME = FIX('claude-home-empty');
    const { status, body } = await fetchAgents('all');
    expect(status).toBe(200);
    expect(body.agents).toEqual([]);
    expect(body.projectsFound).toBe(false);
    expect(body.totals).toMatchObject({ total: 0, running: 0, tokens: 0, cost: 0 });
  });

  it('entrypoint=cli 만 통과 (desktop 세션 제외)', async () => {
    process.env.HOME = FIX('claude-home-normal');
    const { body } = await fetchAgents('all');
    // normal fixture has 2 cli (aaa, ccc) + 1 desktop (bbb) → 2 cli 카드.
    expect(body.agents.length).toBe(2);
    const ids = body.agents.map((a: { id: string }) => a.id);
    expect(ids).toContain('aaaaaaaa');
    expect(ids).toContain('cccccccc');
    expect(ids).not.toContain('bbbbbbbb');
  });

  it('?since=7d (default) → 최근 7일 안 활동 세션만', async () => {
    process.env.HOME = FIX('claude-home-normal');
    const { body } = await fetchAgents(); // no since → 7d default
    expect(body.agents.length).toBe(1);
    expect(body.agents[0].id).toBe('aaaaaaaa');
  });

  it('?since=30d → 최근 30일', async () => {
    process.env.HOME = FIX('claude-home-normal');
    const { body } = await fetchAgents('30d');
    expect(body.agents.length).toBe(1); // ccc 는 April → 47일 전, 30d 밖
    expect(body.agents[0].id).toBe('aaaaaaaa');
  });

  it('?since=all → 전체 cli 세션', async () => {
    process.env.HOME = FIX('claude-home-normal');
    const { body } = await fetchAgents('all');
    expect(body.agents.length).toBe(2);
  });

  it('lastTimestamp 내림차순 정렬', async () => {
    process.env.HOME = FIX('claude-home-normal');
    const { body } = await fetchAgents('all');
    expect(body.agents[0].id).toBe('aaaaaaaa'); // May 30
    expect(body.agents[1].id).toBe('cccccccc'); // April 15
  });

  it('totals — tokens = input+output (cache 제외), cost > 0, edited unique paths 수', async () => {
    process.env.HOME = FIX('claude-home-normal');
    const { body } = await fetchAgents('all');
    // aaa: usage1 100+200=300, usage2 50+80=130 → 430. ccc: 10+20=30. Total 460.
    expect(body.totals.tokens).toBe(460);
    expect(body.totals.cost).toBeGreaterThan(0);
    expect(body.totals.edited).toBe(1); // aaa 의 Edit auth.ts 1개. ccc 0.
  });

  it('일부 jsonl 깨짐 → 정상 라인만 파싱하여 1개 카드 반환', async () => {
    process.env.HOME = FIX('claude-home-broken');
    const { body } = await fetchAgents('all');
    expect(body.agents.length).toBe(1);
    expect(body.agents[0].id).toBe('dddddddd');
  });
});
