import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import { sessionToAgent, sessionEntrypoint, scanProjects, readSession } from '../lib/claude-logs';
import type { JsonlRecord } from '../lib/types';
import type { SessionMeta } from '../lib/sessions-meta';

const FIX = (name: string) => path.resolve(__dirname, 'fixtures', name);

const rec = (o: Record<string, unknown>) => o as unknown as JsonlRecord;

// Mirrors real format: tool_use lives inside assistant.message.content[];
// metadata records carry null cwd/entrypoint/timestamp.
const records: JsonlRecord[] = [
  rec({ type: 'permission-mode', timestamp: null, cwd: null, entrypoint: null }),
  rec({
    type: 'user',
    timestamp: '2026-05-01T00:00:00.000Z',
    entrypoint: 'cli',
    cwd: '/Users/x/workspace/acme',
    gitBranch: 'main',
    slug: 'cool-session',
    message: { role: 'user', content: 'Refactor the auth module please' },
  }),
  rec({
    type: 'assistant',
    timestamp: '2026-05-01T00:00:05.000Z',
    message: {
      model: 'claude-opus-4-7',
      stop_reason: 'tool_use',
      usage: { input_tokens: 100, output_tokens: 200, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
      content: [
        { type: 'thinking', thinking: '…' },
        { type: 'tool_use', name: 'Edit', input: { file_path: '/a.ts' } },
        { type: 'tool_use', name: 'Write', input: { file_path: '/b.ts' } },
      ],
    },
  }),
  rec({
    type: 'assistant',
    timestamp: '2026-05-01T00:00:10.000Z',
    message: {
      model: 'claude-opus-4-7',
      stop_reason: 'end_turn',
      usage: { input_tokens: 50, output_tokens: 50, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
      content: [{ type: 'tool_use', name: 'Edit', input: { file_path: '/a.ts' } }], // duplicate path
    },
  }),
  rec({ type: 'ai-title', timestamp: null }),
];

describe('sessionToAgent', () => {
  const agent = sessionToAgent('/p/abcd1234-1111-2222.jsonl', records, new Map<string, SessionMeta>());

  it('derives id from filename (sessionId)', () => {
    expect(agent.sessionId).toBe('abcd1234-1111-2222');
    expect(agent.id).toBe('abcd1234');
  });
  it('sums display tokens (input + output, cache excluded)', () => {
    expect(agent.tokens).toBe(400);
  });
  it('cost is positive and bounded for this tiny session', () => {
    expect(agent.cost).toBeGreaterThan(0);
    expect(agent.cost).toBeLessThan(1);
  });
  it('counts unique edited file_paths from content tool_use blocks', () => {
    expect(agent.edited).toBe(2); // /a.ts (x2) + /b.ts
  });
  it('counts tool_use blocks for step (cap 10), min steps 8', () => {
    expect(agent.step).toBe(3);
    expect(agent.steps).toBe(8);
  });
  it('extracts meta fields by scanning (records[0] is a null-field metadata record)', () => {
    expect(agent.repo).toBe('workspace/acme');
    expect(agent.branch).toBe('main');
    expect(agent.name).toBe('cool-session');
    expect(agent.task).toBe('Refactor the auth module please');
    expect(agent.model).toBe('opus-4.7');
  });
  it('no live meta → idle', () => {
    expect(agent.status).toBe('idle');
  });
});

describe('sessionEntrypoint', () => {
  it('finds cli from the first record that declares one', () => {
    expect(sessionEntrypoint(records)).toBe('cli');
  });
  it('undefined when no record declares an entrypoint', () => {
    expect(sessionEntrypoint([rec({ type: 'user', timestamp: 't' })])).toBeUndefined();
  });
  it('live meta entrypoint wins', () => {
    const meta = { entrypoint: 'claude-desktop' } as SessionMeta;
    expect(sessionEntrypoint(records, meta)).toBe('claude-desktop');
  });
});

// ─── Filesystem-backed cases (fixtures) ───

describe('scanProjects', () => {
  let originalHome: string | undefined;
  beforeEach(() => { originalHome = process.env.HOME; });
  afterEach(() => { process.env.HOME = originalHome; });

  it('claude-home-normal → 3 jsonl 경로 (서브에이전트 없음)', async () => {
    process.env.HOME = FIX('claude-home-normal');
    const files = await scanProjects();
    expect(files.length).toBe(3);
    expect(files.every((f) => f.endsWith('.jsonl'))).toBe(true);
  });

  it('claude-home-empty (projects 폴더 없음) → []', async () => {
    process.env.HOME = FIX('claude-home-empty');
    expect(await scanProjects()).toEqual([]);
  });
});

describe('readSession', () => {
  it('BOM 시작 → 첫 라인 정상 파싱', async () => {
    const file = path.join(
      FIX('claude-home-bom'),
      '.claude/projects/-Users-test-workspace-app1/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee.jsonl'
    );
    const records = await readSession(file);
    expect(records.length).toBe(1);
    expect(records[0].type).toBe('user');
  });

  it('마지막 라인 깨진 jsonl → 그 라인만 skip', async () => {
    const file = path.join(
      FIX('claude-home-broken'),
      '.claude/projects/-Users-test-workspace-app1/dddddddd-dddd-dddd-dddd-dddddddddddd.jsonl'
    );
    const records = await readSession(file);
    expect(records.length).toBe(2);
    expect(records.map((r) => r.type)).toEqual(['user', 'assistant']);
  });
});

describe('sessionToAgent — edge cases', () => {
  it('assistant 레코드 0 → tokens=0, cost=0, edited=0', () => {
    const onlyUser: JsonlRecord[] = [
      rec({ type: 'user', timestamp: '2026-05-01T00:00:00.000Z', entrypoint: 'cli', cwd: '/x', message: { content: 'hi' } }),
    ];
    const a = sessionToAgent('/p/zzzz-zzzz-zzzz-zzzz-zzzzzzzz.jsonl', onlyUser, new Map());
    expect(a.tokens).toBe(0);
    expect(a.cost).toBe(0);
    expect(a.edited).toBe(0);
  });

  it('tool_use 가 Bash 뿐이면 edited=0 (Edit/Write 류만 카운트)', () => {
    const bashOnly: JsonlRecord[] = [
      rec({
        type: 'assistant', timestamp: '2026-05-01T00:00:05.000Z',
        message: {
          model: 'claude-opus-4-7', stop_reason: 'tool_use', requestId: 'r',
          usage: { input_tokens: 10, output_tokens: 10, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
          content: [
            { type: 'tool_use', name: 'Bash', input: { command: 'ls' } },
            { type: 'tool_use', name: 'Read', input: { file_path: '/a' } },
          ],
        },
      }),
    ];
    const a = sessionToAgent('/p/zzzz-zzzz-zzzz-zzzz-zzzzzzzz.jsonl', bashOnly, new Map());
    expect(a.edited).toBe(0);
    expect(a.step).toBe(2); // Bash + Read counted as tool_use
  });
});
