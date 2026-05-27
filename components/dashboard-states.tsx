/**
 * Empty / Loading / Error states — 디자인 원본에 없는 보강 컴포넌트.
 *
 * 스펙: docs/UI_GUIDE.md "빈 상태 / 로딩 상태 / 에러 상태"
 *
 *  - EmptyState: 6가지 reason 분기 (no-projects-folder / no-cli-sessions /
 *    no-match / time-range-empty / status-empty / search-empty)
 *  - LoadingState: 6개 스켈레톤 카드, opacity 펄스
 *  - ErrorState: 빨간 ! (serif 40px) + Retry 버튼 (clay)
 *
 * 공통 컨테이너 스타일: padding 80px 40px, textAlign center, color var(--ink-4).
 */

'use client';

import type { ReactNode } from 'react';
import type { Status } from '@/lib/types';
import { STATUS_META } from '@/lib/status-meta';
import { Icon } from './dashboard-utils';

// ─── EmptyState ──────────────────────────────────────────────────────────────

export type EmptyReason =
  | 'no-projects-folder'
  | 'no-cli-sessions'
  | 'no-match'
  | 'time-range-empty'
  | 'status-empty'
  | 'search-empty';

export interface EmptyStateProps {
  reason?: EmptyReason;
  status?: Status;
  query?: string;
  onShowAllTime?: () => void;
  onClearStatusFilter?: () => void;
  onClearSearch?: () => void;
  onNewAgent?: () => void;
}

export function EmptyState({
  reason = 'no-match',
  status,
  query,
  onShowAllTime,
  onClearStatusFilter,
  onClearSearch,
  onNewAgent,
}: EmptyStateProps) {
  // 'no-match' 는 디자인 원본의 한 줄짜리 — 큰 아이콘 / CTA 없이 보조 텍스트만.
  if (reason === 'no-match') {
    return (
      <div style={CONTAINER}>
        <div style={MESSAGE_PRIMARY}>No agents match your filters.</div>
      </div>
    );
  }

  if (reason === 'search-empty') {
    return (
      <div style={CONTAINER}>
        <BigGlyph glyph="✦" />
        <div style={MESSAGE_PRIMARY}>
          No matches for <span style={QUERY_SPAN}>&ldquo;{query}&rdquo;</span>
        </div>
        {onClearSearch && (
          <GhostCTA onClick={onClearSearch} icon="x">
            Clear search
          </GhostCTA>
        )}
      </div>
    );
  }

  if (reason === 'status-empty' && status) {
    const meta = STATUS_META[status];
    return (
      <div style={CONTAINER}>
        <BigGlyph glyph="✦" />
        <div style={MESSAGE_PRIMARY}>
          No <span style={{ color: meta.fg, fontWeight: 500 }}>{meta.label.toLowerCase()}</span>{' '}
          agents.
        </div>
        {onClearStatusFilter && (
          <GhostCTA onClick={onClearStatusFilter} icon="x">
            Show all statuses
          </GhostCTA>
        )}
      </div>
    );
  }

  if (reason === 'time-range-empty') {
    return (
      <div style={CONTAINER}>
        <BigGlyph glyph="✦" />
        <div style={MESSAGE_PRIMARY}>No activity in this time range.</div>
        <div style={MESSAGE_SECONDARY}>
          Older sessions exist — switch to a wider range to see them.
        </div>
        {onShowAllTime && <PrimaryCTA onClick={onShowAllTime}>Show all time</PrimaryCTA>}
      </div>
    );
  }

  if (reason === 'no-cli-sessions') {
    return (
      <div style={CONTAINER}>
        <BigGlyph glyph="+" />
        <div style={MESSAGE_PRIMARY}>No Claude Code CLI sessions yet.</div>
        <div style={MESSAGE_SECONDARY}>
          Start a new agent with the button above, or run <code style={CODE_INLINE}>claude</code>{' '}
          in a terminal.
        </div>
        {onNewAgent && (
          <PrimaryCTA onClick={onNewAgent}>
            <Icon name="plus" size={12} /> New agent
          </PrimaryCTA>
        )}
      </div>
    );
  }

  // 'no-projects-folder'
  return (
    <div style={CONTAINER}>
      <BigGlyph glyph="+" />
      <div style={MESSAGE_PRIMARY}>Claude Code hasn&rsquo;t been used on this machine yet.</div>
      <div style={MESSAGE_SECONDARY}>
        We couldn&rsquo;t find{' '}
        <code style={CODE_INLINE}>~/.claude/projects/</code> — install or run{' '}
        <code style={CODE_INLINE}>claude</code> at least once to populate it.
      </div>
    </div>
  );
}

// ─── LoadingState ────────────────────────────────────────────────────────────

export function LoadingState({ count = 6 }: { count?: number }) {
  return (
    <div
      style={{
        padding: '20px 28px 28px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
        gap: 16,
        alignContent: 'start',
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} delay={i * 80} />
      ))}
    </div>
  );
}

function SkeletonCard({ delay }: { delay: number }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-lg)',
        padding: 16,
        minHeight: 180,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        animation: 'skeleton-pulse 1.5s ease-in-out infinite',
        animationDelay: `${delay}ms`,
      }}
    >
      <SkeletonLine width="40%" height={10} />
      <SkeletonLine width="80%" height={12} />
      <SkeletonLine width="60%" height={10} />
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <SkeletonLine width={60} height={8} />
        <SkeletonLine width={50} height={8} />
        <SkeletonLine width={70} height={8} />
      </div>
    </div>
  );
}

function SkeletonLine({ width, height }: { width: number | string; height: number }) {
  return (
    <div
      style={{
        width,
        height,
        background: 'var(--line-2)',
        borderRadius: height / 2,
      }}
    />
  );
}

// ─── ErrorState ──────────────────────────────────────────────────────────────

export interface ErrorStateProps {
  title?: string;
  detail?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Couldn't read ~/.claude/projects",
  detail,
  onRetry,
}: ErrorStateProps) {
  return (
    <div style={CONTAINER}>
      <div
        className="serif"
        style={{ fontSize: 40, color: 'var(--error)', lineHeight: 1, marginBottom: 12 }}
        aria-hidden
      >
        !
      </div>
      <div style={MESSAGE_PRIMARY}>{title}</div>
      {detail && (
        <pre
          className="mono"
          style={{
            fontSize: 12,
            color: 'var(--ink-3)',
            background: 'var(--surface-2)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-sm)',
            padding: '8px 12px',
            margin: '12px auto 0',
            maxWidth: 480,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            textAlign: 'left',
          }}
        >
          {detail}
        </pre>
      )}
      {onRetry && (
        <PrimaryCTA onClick={onRetry}>
          <Icon name="retry" size={12} /> Retry
        </PrimaryCTA>
      )}
    </div>
  );
}

// ─── Sub-bits ────────────────────────────────────────────────────────────────

const CONTAINER = {
  padding: '80px 40px',
  textAlign: 'center' as const,
  color: 'var(--ink-4)',
  fontSize: 14,
};

const MESSAGE_PRIMARY = {
  color: 'var(--ink-2)',
  fontSize: 14,
  fontWeight: 500,
  marginBottom: 4,
};

const MESSAGE_SECONDARY = {
  color: 'var(--ink-4)',
  fontSize: 12.5,
  lineHeight: 1.55,
  maxWidth: 380,
  margin: '0 auto 16px',
};

const QUERY_SPAN = {
  color: 'var(--ink)',
  fontFamily: 'var(--mono)',
  fontSize: 13,
};

const CODE_INLINE = {
  fontFamily: 'var(--mono)',
  fontSize: 11.5,
  background: 'var(--surface-2)',
  padding: '1px 5px',
  borderRadius: 4,
  color: 'var(--ink-2)',
};

function BigGlyph({ glyph }: { glyph: string }) {
  return (
    <div
      className="serif"
      style={{
        fontSize: 60,
        color: 'var(--ink-5)',
        lineHeight: 1,
        marginBottom: 16,
      }}
      aria-hidden
    >
      {glyph}
    </div>
  );
}

function GhostCTA({ onClick, icon, children }: { onClick: () => void; icon?: 'x'; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        marginTop: 12,
        padding: '7px 14px',
        borderRadius: 'var(--r)',
        border: '1px solid var(--line-2)',
        background: 'transparent',
        color: 'var(--ink-2)',
        fontFamily: 'var(--sans)',
        fontSize: 12.5,
        fontWeight: 500,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {icon && <Icon name={icon} size={11} />}
      {children}
    </button>
  );
}

function PrimaryCTA({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        marginTop: 16,
        padding: '8px 14px',
        borderRadius: 'var(--r)',
        border: '1px solid var(--clay)',
        background: 'var(--clay)',
        color: '#fff',
        fontFamily: 'var(--sans)',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {children}
    </button>
  );
}
