import { describe, it, expect } from 'vitest';
import { sessionToAgent, sessionEntrypoint } from '../lib/claude-logs';
import type { JsonlRecord } from '../lib/types';
import type { SessionMeta } from '../lib/sessions-meta';

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
