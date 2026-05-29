/**
 * Demo activity feed for the sidebar.
 *
 * Per ADR-014 the agent *cards* are now 100% real data — MOCK_AGENTS is gone.
 * The sidebar Activity feed (and Hand-offs graph) stay illustrative until we can
 * derive them from real tool_use events / parentUuid chains (Phase 7). Both carry
 * a "demo data" badge in dashboard-sidebar.tsx, so this content is honest.
 */

import type { ActivityEvent } from './types';

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
