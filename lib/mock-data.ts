/**
 * Mock data for Phase 3 design-fidelity work.
 *
 * ⚠️ Per ADR-014, this file is DELETED at the start of Phase 4.
 * Do not depend on its contents from any production code path.
 *
 * Source: design-package/agent-dashboard/project/mock-data.js (18 agents).
 * Fields not present in the design (sessionId, filePath, cwd, *Timestamp,
 * entrypoint) are filled with stub values so the design-layer types compile.
 */

import type { Agent, ActivityEvent } from './types';

const MS_PER_MIN = 60_000;
const now = Date.now();
const stubMeta = (idx: number, startedMinAgo: number) => ({
  sessionId: `mock-${idx.toString().padStart(8, '0')}-mock-mock-mock-mockmockmock`,
  filePath: '',
  cwd: '',
  firstTimestamp: now - startedMinAgo * MS_PER_MIN,
  lastTimestamp: now - Math.max(0, startedMinAgo - 1) * MS_PER_MIN,
  entrypoint: 'cli' as const,
});

export const MOCK_AGENTS: Agent[] = [
  { id: 'opus-01', name: 'refactor-api',     status: 'running', task: 'Extracting user-service into typed handlers', repo: 'acme/payments',      branch: 'refactor/handlers',  step: 4, steps: 7,  tokens: 184500, cost: 2.71, model: 'opus-4.5',   edited: 23, started: '14m',    last: 'Touched 12 files · running test suite',  deps: ['test-coverage'], ...stubMeta(1, 14) },
  { id: 'opus-02', name: 'test-coverage',    status: 'running', task: 'Adding integration tests for /checkout',       repo: 'acme/payments',      branch: 'tests/checkout-flow',step: 2, steps: 5,  tokens: 92300,  cost: 1.42, model: 'opus-4.5',   edited: 6,  started: '8m',     last: 'Drafting fixture for declined-card path', deps: ['refactor-api'],  ...stubMeta(2, 8)  },
  { id: 'sonnet-1',name: 'docs-update',      status: 'review',  task: 'Rewrite README, regen API docs',                repo: 'acme/payments',      branch: 'docs/v3',            step: 5, steps: 5,  tokens: 41200,  cost: 0.48, model: 'sonnet-4.5', edited: 3,  started: '32m',    last: 'Awaiting your approval on the new intro', ...stubMeta(3, 32) },
  { id: 'opus-03', name: 'bug-triage',       status: 'running', task: 'Reading 47 open GitHub issues, clustering',     repo: 'acme/web',           branch: 'main',               step: 1, steps: 3,  tokens: 71800,  cost: 1.08, model: 'opus-4.5',   edited: 0,  started: '5m',     last: 'Found 9 likely duplicates, drafting summaries', ...stubMeta(4, 5)  },
  { id: 'sonnet-2',name: 'ui-polish',        status: 'waiting', task: 'Polishing onboarding flow per Figma',           repo: 'acme/web',           branch: 'feat/onboarding-v2', step: 3, steps: 6,  tokens: 56400,  cost: 0.66, model: 'sonnet-4.5', edited: 14, started: '1h 4m',  last: 'Needs the Figma URL you mentioned', ...stubMeta(5, 64) },
  { id: 'opus-04', name: 'perf-audit',       status: 'running', task: 'Profile home feed, isolate render thrash',      repo: 'acme/web',           branch: 'perf/home-feed',     step: 2, steps: 4,  tokens: 132900, cost: 1.95, model: 'opus-4.5',   edited: 4,  started: '21m',    last: 'Captured 3 traces, narrowing on FeedItem', ...stubMeta(6, 21) },
  { id: 'opus-05', name: 'migrate-ts',       status: 'running', task: 'Migrating remaining JS files to TypeScript',    repo: 'acme/web',           branch: 'chore/ts-migration', step: 8, steps: 14, tokens: 248100, cost: 3.65, model: 'opus-4.5',   edited: 38, started: '2h 12m', last: 'Converted 38/52 modules, 0 type errors so far', ...stubMeta(7, 132) },
  { id: 'opus-06', name: 'security-review',  status: 'error',   task: 'Audit auth/* for OWASP top-10 issues',          repo: 'acme/auth',          branch: 'audit/owasp',        step: 2, steps: 5,  tokens: 64200,  cost: 0.94, model: 'opus-4.5',   edited: 0,  started: '11m',    last: 'Tool error: rate-limit on Snyk API', ...stubMeta(8, 11) },
  { id: 'haiku-1', name: 'dep-bump',         status: 'idle',    task: 'Weekly dependency bump + lockfile refresh',     repo: 'acme/web',           branch: '—',                  step: 0, steps: 3,  tokens: 0,      cost: 0,    model: 'haiku-4.5',  edited: 0,  started: '—',      last: 'Scheduled for Mon 09:00', ...stubMeta(9, 0)  },
  { id: 'opus-07', name: 'feature-search',   status: 'review',  task: 'Build new full-text search panel',              repo: 'acme/web',           branch: 'feat/cmd-k',         step: 6, steps: 8,  tokens: 312400, cost: 4.60, model: 'opus-4.5',   edited: 19, started: '3h 41m', last: 'Diff ready — 19 files, please review', ...stubMeta(10, 221) },
  { id: 'sonnet-3',name: 'changelog',        status: 'running', task: 'Compile CHANGELOG from last 47 commits',        repo: 'acme/web',           branch: 'release/2.4',        step: 1, steps: 2,  tokens: 22800,  cost: 0.27, model: 'sonnet-4.5', edited: 1,  started: '3m',     last: 'Reading commit graph', ...stubMeta(11, 3)  },
  { id: 'opus-08', name: 'design-system',    status: 'waiting', task: 'Extract Button variants → shared package',     repo: 'acme/design-system', branch: 'feat/button-extract',step: 1, steps: 4,  tokens: 38900,  cost: 0.57, model: 'opus-4.5',   edited: 2,  started: '17m',    last: 'Needs: which package name should I publish under?', ...stubMeta(12, 17) },
  { id: 'sonnet-4',name: 'icon-sweep',       status: 'idle',    task: 'Normalize icon sizes across the app',           repo: 'acme/web',           branch: '—',                  step: 0, steps: 3,  tokens: 0,      cost: 0,    model: 'sonnet-4.5', edited: 0,  started: '—',      last: 'Idle since 11:42', ...stubMeta(13, 0)  },
  { id: 'opus-09', name: 'a11y-pass',        status: 'running', task: 'Pass through forms, add labels + roles',        repo: 'acme/web',           branch: 'a11y/forms',         step: 3, steps: 5,  tokens: 84600,  cost: 1.24, model: 'opus-4.5',   edited: 11, started: '28m',    last: 'Form 11/19, axe reports 0 violations', ...stubMeta(14, 28) },
  { id: 'opus-10', name: 'analytics-events', status: 'error',   task: 'Backfill missing PostHog events',               repo: 'acme/web',           branch: 'data/events-v2',     step: 4, steps: 6,  tokens: 102400, cost: 1.50, model: 'opus-4.5',   edited: 7,  started: '46m',    last: 'Test failure: event-name-format on 3 events', ...stubMeta(15, 46) },
  { id: 'sonnet-5',name: 'release-notes',    status: 'review',  task: 'Draft customer-facing release notes',           repo: 'acme/web',           branch: 'release/2.4',        step: 2, steps: 2,  tokens: 18700,  cost: 0.22, model: 'sonnet-4.5', edited: 0,  started: '6m',     last: 'Two phrasings ready — pick one', ...stubMeta(16, 6)  },
  { id: 'opus-11', name: 'db-index-tune',    status: 'running', task: 'Profile slow queries, propose indices',         repo: 'acme/data',          branch: 'perf/indices',       step: 2, steps: 4,  tokens: 73200,  cost: 1.08, model: 'opus-4.5',   edited: 3,  started: '19m',    last: 'EXPLAIN ANALYZE on 14 candidates', ...stubMeta(17, 19) },
  { id: 'haiku-2', name: 'screenshot-bot',   status: 'idle',    task: 'Capture nightly UI screenshots',                repo: 'acme/web',           branch: '—',                  step: 0, steps: 2,  tokens: 0,      cost: 0,    model: 'haiku-4.5',  edited: 0,  started: '—',      last: 'Next run in 6h 12m', ...stubMeta(18, 0)  },
];

export const MOCK_ACTIVITY: ActivityEvent[] = [
  { id: 1, t: '14:32', who: 'refactor-api',    what: 'edited handlers/payment.ts',   tone: 'edit' },
  { id: 2, t: '14:31', who: 'test-coverage',   what: 'opened PR #482',               tone: 'pr' },
  { id: 3, t: '14:28', who: 'docs-update',     what: 'awaiting your review',         tone: 'review' },
  { id: 4, t: '14:26', who: 'security-review', what: 'tool error: snyk rate limit',  tone: 'error' },
  { id: 5, t: '14:21', who: 'a11y-pass',       what: 'fixed 4 axe violations',       tone: 'ok' },
  { id: 6, t: '14:18', who: 'perf-audit',      what: 'flagged FeedItem.render()',    tone: 'flag' },
  { id: 7, t: '14:14', who: 'changelog',       what: 'spawned by you',               tone: 'spawn' },
  { id: 8, t: '14:09', who: 'feature-search',  what: 'finished step 6/8',            tone: 'progress' },
];
