/**
 * Single source of truth for status labels and palette tokens.
 * Mirrors design-package/agent-dashboard/project/mock-data.js `window.STATUS_META`.
 *
 * `fg` / `bg` resolve to CSS variables defined in app/globals.css.
 */

import type { Status } from './types';

export interface StatusMeta {
  label: string;
  fg: string;   // CSS var() reference
  bg: string;
}

export const STATUS_META: Record<Status, StatusMeta> = {
  running: { label: 'Running', fg: 'var(--running)', bg: 'var(--running-bg)' },
  waiting: { label: 'Waiting', fg: 'var(--waiting)', bg: 'var(--waiting-bg)' },
  review:  { label: 'Review',  fg: 'var(--review)',  bg: 'var(--review-bg)'  },
  error:   { label: 'Error',   fg: 'var(--error)',   bg: 'var(--error-bg)'   },
  idle:    { label: 'Idle',    fg: 'var(--idle)',    bg: 'var(--idle-bg)'    },
};
