/**
 * Grid card + list row + card actions + ghost/primary buttons.
 * Port of design-package/agent-dashboard/project/dashboard-card.jsx.
 *
 * Pixel values (e.g. 13.5, 10.5, 11.5) preserved verbatim from the design source.
 */

'use client';

import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { STATUS_META } from '@/lib/status-meta';
import type { Agent } from '@/lib/types';
import { Icon, StatusDot, fmtTok, fmt$ } from './dashboard-utils';

export type Density = 'compact' | 'comfortable';
export type CardAction =
  | 'pause' | 'retry' | 'approve' | 'reject'
  | 'start' | 'stop' | 'chat' | 'open';

export interface CardProps {
  a: Agent;
  density: Density;
  onOpen: () => void;
  onAction: (id: string, action: CardAction) => void;
  selected: boolean;
}

// ───── Grid card ──────────────────────────────────────────────────────────────
export function GridCard({ a, density, onOpen, onAction, selected }: CardProps) {
  const s = STATUS_META[a.status];
  const compact = density === 'compact';
  return (
    <div
      onClick={onOpen}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.borderColor = 'var(--line-2)'; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.borderColor = 'var(--line)'; }}
      style={{
        background: 'var(--surface)',
        borderRadius: 'var(--r-lg)',
        border: '1px solid ' + (selected ? 'var(--clay)' : 'var(--line)'),
        boxShadow: selected ? '0 0 0 3px var(--clay-soft)' : 'none',
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color .15s, box-shadow .15s, transform .15s',
      }}
    >
      <div style={{ height: 3, background: s.fg, opacity: a.status === 'idle' ? 0.3 : 1 }} />

      <div style={{ padding: compact ? '10px 14px 8px' : '14px 16px 12px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <StatusDot status={a.status} size={7} />
            <div style={{
              fontWeight: 600, fontSize: compact ? 13.5 : 15, color: 'var(--ink)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{a.name}</div>
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-4)', letterSpacing: 0.2 }}>
            {a.id} · {a.model}
          </div>
        </div>
        <span
          className="mono"
          style={{
            fontSize: 10.5, padding: '3px 8px', borderRadius: 999,
            background: s.bg, color: s.fg, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: 0.6, flex: '0 0 auto',
          }}
        >
          {s.label}
        </span>
      </div>

      <div style={{ padding: compact ? '0 14px 10px' : '0 16px 14px' }}>
        <div
          style={{
            fontSize: compact ? 12.5 : 13.5, color: 'var(--ink-2)', lineHeight: 1.45,
            marginBottom: compact ? 8 : 10,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          } as CSSProperties}
        >
          {a.task}
        </div>

        <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: compact ? 8 : 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="branch" size={10} />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {a.repo} <span style={{ color: 'var(--ink-5)' }}>·</span> {a.branch}
          </span>
        </div>

        {a.steps > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: compact ? 0 : 10 }}>
            <div style={{ display: 'flex', gap: 3, flex: 1 }}>
              {Array.from({ length: a.steps }, (_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1, height: 4, borderRadius: 2,
                    background:
                      i < a.step ? s.fg
                      : i === a.step && a.status === 'running' ? s.fg
                      : 'var(--line-2)',
                    opacity: i < a.step ? 1 : i === a.step && a.status === 'running' ? 0.5 : 1,
                  }}
                />
              ))}
            </div>
            <span className="mono tnum" style={{ fontSize: 11, color: 'var(--ink-3)', flex: '0 0 auto' }}>
              {a.step}/{a.steps}
            </span>
          </div>
        )}

        {!compact && (
          <div
            style={{
              fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic',
              padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 8,
              lineHeight: 1.4, marginTop: 10,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            } as CSSProperties}
          >
            {a.last}
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 'auto', padding: compact ? '8px 14px' : '10px 16px',
          borderTop: '1px solid var(--line)', background: 'var(--surface-2)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}
      >
        <div className="mono tnum" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
          {fmtTok(a.tokens)} · {fmt$(a.cost)} · {a.started}
        </div>
        <div style={{ flex: 1 }} />
        <CardActions a={a} onAction={onAction} />
      </div>
    </div>
  );
}

// ───── Card actions ───────────────────────────────────────────────────────────
export function CardActions({ a, onAction }: { a: Agent; onAction: CardProps['onAction'] }) {
  const stop = (e: MouseEvent) => e.stopPropagation();
  const fire = (action: CardAction) => (e: MouseEvent) => { stop(e); onAction(a.id, action); };

  if (a.status === 'review') return (
    <>
      <BtnGhost onClick={fire('reject')}>Reject</BtnGhost>
      <BtnPrimary onClick={fire('approve')}>Approve</BtnPrimary>
    </>
  );
  if (a.status === 'error') return (
    <>
      <BtnGhost onClick={fire('open')}>Logs</BtnGhost>
      <BtnPrimary onClick={fire('retry')}>Retry</BtnPrimary>
    </>
  );
  if (a.status === 'running') return (
    <>
      <BtnGhost onClick={fire('chat')}>Chat</BtnGhost>
      <BtnGhost onClick={fire('pause')}>Pause</BtnGhost>
    </>
  );
  if (a.status === 'waiting') return (
    <>
      <BtnGhost onClick={fire('chat')}>Chat</BtnGhost>
      <BtnPrimary onClick={fire('open')}>Answer</BtnPrimary>
    </>
  );
  return (
    <>
      <BtnGhost onClick={fire('chat')}>Chat</BtnGhost>
      <BtnPrimary onClick={fire('start')}>Start</BtnPrimary>
    </>
  );
}

const BTN_BASE: CSSProperties = {
  padding: '5px 10px', borderRadius: 6,
  fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
};

export function BtnGhost({ children, onClick }: { children: ReactNode; onClick: (e: MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      style={{ ...BTN_BASE, border: '1px solid var(--line-2)', background: 'transparent', color: 'var(--ink-2)' }}
    >
      {children}
    </button>
  );
}

export function BtnPrimary({ children, onClick }: { children: ReactNode; onClick: (e: MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      style={{ ...BTN_BASE, border: '1px solid var(--clay)', background: 'var(--clay)', color: '#fff' }}
    >
      {children}
    </button>
  );
}

// ───── List row ───────────────────────────────────────────────────────────────
const LIST_COLS = '160px 80px 1fr 220px 110px 90px 90px 100px 130px';

export function ListRow({ a, density, onOpen, onAction, selected }: CardProps) {
  const s = STATUS_META[a.status];
  const compact = density === 'compact';
  return (
    <div
      onClick={onOpen}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = 'var(--surface-2)'; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'var(--surface)'; }}
      style={{
        display: 'grid',
        gridTemplateColumns: LIST_COLS,
        alignItems: 'center', gap: 14,
        padding: compact ? '8px 16px' : '12px 16px',
        borderBottom: '1px solid var(--line)',
        background: selected ? 'var(--clay-bg)' : 'var(--surface)',
        cursor: 'pointer',
        borderLeft: '3px solid ' + (selected ? 'var(--clay)' : s.fg),
        transition: 'background .12s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <StatusDot status={a.status} size={7} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {a.name}
          </div>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>{a.id}</div>
        </div>
      </div>

      <span
        className="mono"
        style={{
          fontSize: 10, padding: '2px 7px', borderRadius: 999,
          background: s.bg, color: s.fg, fontWeight: 600, justifySelf: 'start',
          textTransform: 'uppercase', letterSpacing: 0.5,
        }}
      >
        {s.label}
      </span>

      <div style={{ fontSize: 12.5, color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {a.task}
      </div>

      <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {a.repo} <span style={{ color: 'var(--ink-5)' }}>·</span> {a.branch}
      </div>

      {a.steps > 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, height: 4, background: 'var(--line-2)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(a.step / a.steps) * 100}%`, background: s.fg }} />
          </div>
          <span className="mono tnum" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{a.step}/{a.steps}</span>
        </div>
      ) : (
        <span className="mono" style={{ color: 'var(--ink-5)' }}>—</span>
      )}

      <span className="mono tnum" style={{ fontSize: 11.5, color: 'var(--ink-2)', textAlign: 'right' }}>{fmtTok(a.tokens)}</span>
      <span className="mono tnum" style={{ fontSize: 11.5, color: 'var(--ink-2)', textAlign: 'right' }}>{fmt$(a.cost)}</span>
      <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{a.started}</span>

      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <CardActions a={a} onAction={onAction} />
      </div>
    </div>
  );
}

export const LIST_GRID_COLS = LIST_COLS;
