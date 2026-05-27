// Mock data for 18 Claude Code agents — shared by all variations.
window.AGENTS = [
  { id: 'opus-01', name: 'refactor-api',        status: 'running', task: 'Extracting user-service into typed handlers', repo: 'acme/payments', branch: 'refactor/handlers', step: 4, steps: 7, tokens: 184500, cost: 2.71, model: 'opus-4.5',  edited: 23, started: '14m', last: 'Touched 12 files · running test suite', deps: ['test-coverage'] },
  { id: 'opus-02', name: 'test-coverage',       status: 'running', task: 'Adding integration tests for /checkout',       repo: 'acme/payments', branch: 'tests/checkout-flow', step: 2, steps: 5, tokens: 92300,  cost: 1.42, model: 'opus-4.5',  edited: 6,  started: '8m',  last: 'Drafting fixture for declined-card path', deps: ['refactor-api'] },
  { id: 'sonnet-1',name: 'docs-update',         status: 'review',  task: 'Rewrite README, regen API docs',                 repo: 'acme/payments', branch: 'docs/v3',            step: 5, steps: 5, tokens: 41200,  cost: 0.48, model: 'sonnet-4.5',edited: 3,  started: '32m', last: 'Awaiting your approval on the new intro' },
  { id: 'opus-03', name: 'bug-triage',          status: 'running', task: 'Reading 47 open GitHub issues, clustering',     repo: 'acme/web',      branch: 'main',                step: 1, steps: 3, tokens: 71800,  cost: 1.08, model: 'opus-4.5',  edited: 0,  started: '5m',  last: 'Found 9 likely duplicates, drafting summaries' },
  { id: 'sonnet-2',name: 'ui-polish',           status: 'waiting', task: 'Polishing onboarding flow per Figma',           repo: 'acme/web',      branch: 'feat/onboarding-v2',  step: 3, steps: 6, tokens: 56400,  cost: 0.66, model: 'sonnet-4.5',edited: 14, started: '1h 4m', last: 'Needs the Figma URL you mentioned' },
  { id: 'opus-04', name: 'perf-audit',          status: 'running', task: 'Profile home feed, isolate render thrash',       repo: 'acme/web',      branch: 'perf/home-feed',      step: 2, steps: 4, tokens: 132900, cost: 1.95, model: 'opus-4.5',  edited: 4,  started: '21m', last: 'Captured 3 traces, narrowing on FeedItem' },
  { id: 'opus-05', name: 'migrate-ts',          status: 'running', task: 'Migrating remaining JS files to TypeScript',     repo: 'acme/web',      branch: 'chore/ts-migration',  step: 8, steps: 14,tokens: 248100, cost: 3.65, model: 'opus-4.5',  edited: 38, started: '2h 12m', last: 'Converted 38/52 modules, 0 type errors so far' },
  { id: 'opus-06', name: 'security-review',     status: 'error',   task: 'Audit auth/* for OWASP top-10 issues',            repo: 'acme/auth',     branch: 'audit/owasp',         step: 2, steps: 5, tokens: 64200,  cost: 0.94, model: 'opus-4.5',  edited: 0,  started: '11m', last: 'Tool error: rate-limit on Snyk API' },
  { id: 'haiku-1', name: 'dep-bump',            status: 'idle',    task: 'Weekly dependency bump + lockfile refresh',       repo: 'acme/web',      branch: '—',                   step: 0, steps: 3, tokens: 0,      cost: 0,    model: 'haiku-4.5', edited: 0,  started: '—',   last: 'Scheduled for Mon 09:00' },
  { id: 'opus-07', name: 'feature-search',      status: 'review',  task: 'Build new full-text search panel',               repo: 'acme/web',      branch: 'feat/cmd-k',          step: 6, steps: 8, tokens: 312400, cost: 4.60, model: 'opus-4.5',  edited: 19, started: '3h 41m', last: 'Diff ready — 19 files, please review' },
  { id: 'sonnet-3',name: 'changelog',           status: 'running', task: 'Compile CHANGELOG from last 47 commits',          repo: 'acme/web',      branch: 'release/2.4',         step: 1, steps: 2, tokens: 22800,  cost: 0.27, model: 'sonnet-4.5',edited: 1,  started: '3m',  last: 'Reading commit graph' },
  { id: 'opus-08', name: 'design-system',       status: 'waiting', task: 'Extract Button variants → shared package',       repo: 'acme/design-system', branch: 'feat/button-extract', step: 1, steps: 4, tokens: 38900, cost: 0.57, model: 'opus-4.5',  edited: 2,  started: '17m', last: 'Needs: which package name should I publish under?' },
  { id: 'sonnet-4',name: 'icon-sweep',          status: 'idle',    task: 'Normalize icon sizes across the app',             repo: 'acme/web',      branch: '—',                   step: 0, steps: 3, tokens: 0,      cost: 0,    model: 'sonnet-4.5',edited: 0,  started: '—',   last: 'Idle since 11:42' },
  { id: 'opus-09', name: 'a11y-pass',           status: 'running', task: 'Pass through forms, add labels + roles',          repo: 'acme/web',      branch: 'a11y/forms',          step: 3, steps: 5, tokens: 84600,  cost: 1.24, model: 'opus-4.5',  edited: 11, started: '28m', last: 'Form 11/19, axe reports 0 violations' },
  { id: 'opus-10', name: 'analytics-events',    status: 'error',   task: 'Backfill missing PostHog events',                 repo: 'acme/web',      branch: 'data/events-v2',      step: 4, steps: 6, tokens: 102400, cost: 1.50, model: 'opus-4.5',  edited: 7,  started: '46m', last: 'Test failure: event-name-format on 3 events' },
  { id: 'sonnet-5',name: 'release-notes',       status: 'review',  task: 'Draft customer-facing release notes',             repo: 'acme/web',      branch: 'release/2.4',         step: 2, steps: 2, tokens: 18700,  cost: 0.22, model: 'sonnet-4.5',edited: 0,  started: '6m',  last: 'Two phrasings ready — pick one' },
  { id: 'opus-11', name: 'db-index-tune',       status: 'running', task: 'Profile slow queries, propose indices',           repo: 'acme/data',     branch: 'perf/indices',        step: 2, steps: 4, tokens: 73200,  cost: 1.08, model: 'opus-4.5',  edited: 3,  started: '19m', last: 'EXPLAIN ANALYZE on 14 candidates' },
  { id: 'haiku-2', name: 'screenshot-bot',      status: 'idle',    task: 'Capture nightly UI screenshots',                  repo: 'acme/web',      branch: '—',                   step: 0, steps: 2, tokens: 0,      cost: 0,    model: 'haiku-4.5', edited: 0,  started: '—',   last: 'Next run in 6h 12m' },
];

window.STATUS_META = {
  running: { label: 'Running',  fg: 'var(--running)', bg: 'var(--running-bg)' },
  waiting: { label: 'Waiting',  fg: 'var(--waiting)', bg: 'var(--waiting-bg)' },
  review:  { label: 'Review',   fg: 'var(--review)',  bg: 'var(--review-bg)'  },
  error:   { label: 'Error',    fg: 'var(--error)',   bg: 'var(--error-bg)'   },
  idle:    { label: 'Idle',     fg: 'var(--idle)',    bg: 'var(--idle-bg)'    },
};

window.totals = (() => {
  const a = window.AGENTS;
  return {
    total: a.length,
    running: a.filter(x => x.status === 'running').length,
    review:  a.filter(x => x.status === 'review').length,
    error:   a.filter(x => x.status === 'error').length,
    waiting: a.filter(x => x.status === 'waiting').length,
    idle:    a.filter(x => x.status === 'idle').length,
    tokens:  a.reduce((s, x) => s + x.tokens, 0),
    cost:    a.reduce((s, x) => s + x.cost, 0),
    edited:  a.reduce((s, x) => s + x.edited, 0),
  };
})();
