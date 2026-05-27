/**
 * Main dashboard shell: TopBar + FilterRow + GridBody/ListBody + EmptyState.
 * Port of design-package/agent-dashboard/project/dashboard-app.jsx — only the
 * parts listed in IMPLEMENTATION.md §3.1.
 *
 * Sidebar (3.2), DetailDrawer (3.3), Modals/Timeline (3.4), Tweaks (3.8) come later.
 */

'use client';

import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { STATUS_META } from '@/lib/status-meta';
import { MOCK_ACTIVITY } from '@/lib/mock-data';
import type { Agent, ActivityEvent, ChatMsg, Status } from '@/lib/types';
import { Icon } from './dashboard-utils';
import { GridCard, ListRow, LIST_GRID_COLS, type CardAction, type Density } from './dashboard-card';
import { Sidebar } from './dashboard-sidebar';
import { DetailDrawer, initialChat } from './dashboard-detail';

export type Layout = 'grid' | 'list' | 'timeline';
type Filter = 'all' | Status;

interface Totals {
  total: number;
  running: number;
  review: number;
  error: number;
  waiting: number;
  idle: number;
  tokens: number;
  cost: number;
  edited: number;
}

export interface AppProps {
  initialAgents: Agent[];
}

export function App({ initialAgents }: AppProps) {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [layout, setLayout] = useState<Layout>('grid');
  const [density] = useState<Density>('comfortable');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activity] = useState<ActivityEvent[]>(MOCK_ACTIVITY);
  const [chats, setChats] = useState<Record<string, ChatMsg[]>>({});

  const selectedAgent = useMemo(
    () => (selectedId ? agents.find((a) => a.id === selectedId) ?? null : null),
    [agents, selectedId]
  );

  const onChatSend = useCallback(
    (id: string, text: string) => {
      const agent = agents.find((a) => a.id === id);
      if (!agent) return;
      setChats((prev) => {
        const cur = prev[id] ?? initialChat(agent);
        return { ...prev, [id]: [...cur, { role: 'user', text }] };
      });
      // Canned mock reply — preview-only chat. Replace with real IPC if/when Claude SDK exposes it.
      window.setTimeout(() => {
        setChats((prev) => {
          const cur = prev[id] ?? [];
          return {
            ...prev,
            [id]: [...cur, { role: 'agent', text: cannedReply(agent, text) }],
          };
        });
      }, 900);
    },
    [agents]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return agents.filter((a) => {
      if (filter !== 'all' && a.status !== filter) return false;
      if (!q) return true;
      return (a.name + ' ' + a.id + ' ' + a.task + ' ' + a.repo + ' ' + a.branch).toLowerCase().includes(q);
    });
  }, [agents, filter, query]);

  const totals: Totals = useMemo(() => ({
    total:   agents.length,
    running: agents.filter((x) => x.status === 'running').length,
    review:  agents.filter((x) => x.status === 'review').length,
    error:   agents.filter((x) => x.status === 'error').length,
    waiting: agents.filter((x) => x.status === 'waiting').length,
    idle:    agents.filter((x) => x.status === 'idle').length,
    tokens:  agents.reduce((s, x) => s + x.tokens, 0),
    cost:    agents.reduce((s, x) => s + x.cost, 0),
    edited:  agents.reduce((s, x) => s + x.edited, 0),
  }), [agents]);

  // Mock-only action handler — mirrors design source behavior so 3.1 stays
  // functionally faithful. Real actions land in Phase 5; per ADR-013 §T the
  // status-mutation side will be removed at that point.
  const onAction = useCallback((id: string, action: CardAction) => {
    setAgents((list) =>
      list.map((a) => {
        if (a.id !== id) return a;
        switch (action) {
          case 'pause':   return { ...a, status: 'waiting', last: 'paused by you — awaiting next move' };
          case 'retry':   return { ...a, status: 'running', last: 'retrying previous step…' };
          case 'approve': return { ...a, status: 'idle',    step: a.steps, last: 'approved by you · merged' };
          case 'reject':  return { ...a, status: 'running', step: Math.max(0, a.step - 1), last: 'rejected — revising approach' };
          case 'start':   return { ...a, status: 'running', started: 'just now', last: 'starting now…' };
          case 'stop':    return { ...a, status: 'idle', last: 'stopped by you' };
          default: return a;
        }
      })
    );
  }, []);

  return (
    <div
      className="dash"
      style={{
        width: '100vw', height: '100vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', background: 'var(--bg)',
        color: 'var(--ink)', fontFamily: 'var(--sans)', position: 'relative',
      }}
    >
      <TopBar totals={totals} onNew={() => { /* Phase 3.4 wires NewAgentModal */ }} />
      <FilterRow
        filter={filter} setFilter={setFilter}
        totals={totals}
        query={query} setQuery={setQuery}
        layout={layout} setLayout={setLayout}
        count={filtered.length}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <div style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
          {layout === 'grid' && (
            <GridBody
              filtered={filtered} density={density}
              onOpen={setSelectedId} onAction={onAction} selectedId={selectedId}
            />
          )}
          {layout === 'list' && (
            <ListBody
              filtered={filtered} density={density}
              onOpen={setSelectedId} onAction={onAction} selectedId={selectedId}
            />
          )}
          {layout === 'timeline' && (
            <div style={{ padding: 80, textAlign: 'center', color: 'var(--ink-4)', fontSize: 14 }}>
              Timeline view ships in Phase 3.4.
            </div>
          )}
        </div>
        <Sidebar agents={agents} activity={activity} onSelectAgent={setSelectedId} />

        {selectedAgent && (
          <DetailDrawer
            agent={selectedAgent}
            onClose={() => setSelectedId(null)}
            onAction={onAction}
            chats={chats}
            onChatSend={onChatSend}
          />
        )}
      </div>
    </div>
  );
}

// Mock canned reply — chat is preview-only in Phase 3.
function cannedReply(a: Agent, userText: string): string {
  const tx = userText.toLowerCase();
  if (a.status === 'waiting') {
    return "Got it — proceeding with that. I'll update you once I have something to show.";
  }
  if (a.status === 'error') {
    if (tx.includes('retry') || tx.includes('again')) return "Retrying now. I'll pause and ping you if it fails again.";
    return 'Understood. Should I retry with a longer backoff, or hand the task to another agent?';
  }
  if (a.status === 'review') {
    if (tx.includes('approve') || tx.includes('ship')) return 'Great — merging and closing the PR. Anything else for me?';
    if (tx.includes('reject') || tx.includes('redo')) return "No problem, I'll revise. What specifically should change?";
    return 'Happy to revise. Which part should I focus on?';
  }
  if (tx.includes('stop')  || tx.includes('pause'))  return "Pausing. I'll wait for your next instruction.";
  if (tx.includes('?')) {
    return `Good question. Based on what I'm seeing in ${a.repo}: the cleanest path is the one I'm already on — let me know if you'd like me to consider alternatives.`;
  }
  return `Noted. I'll fold that into my current step (${a.step + 1}/${a.steps}) and report back.`;
}

// ─── TopBar ──────────────────────────────────────────────────────────────────
function TopBar({ totals, onNew }: { totals: Totals; onNew: () => void }) {
  return (
    <header
      style={{
        padding: '22px 32px 16px', borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24,
        background: 'var(--surface)',
      }}
    >
      <div>
        <div className="mono" style={{ fontSize: 11, letterSpacing: 1.2, color: 'var(--ink-3)', textTransform: 'uppercase', marginBottom: 4 }}>
          Agent Console · Tuesday 14:32
        </div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 500, letterSpacing: -0.5, color: 'var(--ink)' }}>
          Good afternoon, Jamie.
        </h1>
        <div style={{ marginTop: 4, color: 'var(--ink-3)', fontSize: 13.5 }}>
          <span style={{ color: 'var(--running)', fontWeight: 500 }}>{totals.running} running</span>
          <span style={{ margin: '0 8px', color: 'var(--ink-5)' }}>·</span>
          <span style={{ color: 'var(--review)', fontWeight: 500 }}>{totals.review} need your review</span>
          <span style={{ margin: '0 8px', color: 'var(--ink-5)' }}>·</span>
          <span style={{ color: 'var(--error)', fontWeight: 500 }}>{totals.error} blocked</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        <SummaryStat label="Today's spend" value={`$${totals.cost.toFixed(2)}`} sub={`${(totals.tokens / 1000).toFixed(0)}k tokens`} />
        <SummaryStat label="Files edited"  value={String(totals.edited)} sub="across 6 repos" />
        <SummaryStat label="Active"        value={`${totals.total - totals.idle}/${totals.total}`} sub={`${totals.idle} idle`} last />
        <button
          onClick={onNew}
          style={{
            marginLeft: 14, padding: '10px 16px', borderRadius: 10,
            border: '1px solid var(--clay)', background: 'var(--clay)', color: '#fff',
            fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <Icon name="plus" size={13} />
          New agent
        </button>
      </div>
    </header>
  );
}

function SummaryStat({ label, value, sub, last }: { label: string; value: string; sub: string; last?: boolean }) {
  return (
    <div style={{ padding: '4px 16px', borderRight: last ? 'none' : '1px solid var(--line)', minWidth: 110 }}>
      <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</div>
      <div className="tnum" style={{ fontSize: 20, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.1, marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 1 }}>{sub}</div>
    </div>
  );
}

// ─── FilterRow ───────────────────────────────────────────────────────────────
interface FilterRowProps {
  filter: Filter;
  setFilter: (f: Filter) => void;
  totals: Totals;
  query: string;
  setQuery: (q: string) => void;
  layout: Layout;
  setLayout: (l: Layout) => void;
  count: number;
}

function FilterRow({ filter, setFilter, totals, query, setQuery, layout, setLayout, count }: FilterRowProps) {
  return (
    <div
      style={{
        padding: '12px 32px', display: 'flex', alignItems: 'center', gap: 8,
        borderBottom: '1px solid var(--line)', background: 'var(--bg-2)',
      }}
    >
      <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} count={totals.total}>All</FilterChip>
      {(['running', 'review', 'waiting', 'error', 'idle'] as Status[]).map((k) => (
        <FilterChip
          key={k}
          active={filter === k}
          onClick={() => setFilter(k)}
          count={totals[k]}
          color={STATUS_META[k].fg}
        >
          {STATUS_META[k].label}
        </FilterChip>
      ))}
      <div style={{ flex: 1 }} />

      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
          background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--line)',
          width: 220,
        }}
      >
        <Icon name="search" size={12} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search agents…"
          style={{
            border: 'none', background: 'transparent', outline: 'none',
            fontSize: 12.5, color: 'var(--ink)', flex: 1, fontFamily: 'var(--sans)',
            minWidth: 0,
          }}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            style={{ background: 'transparent', border: 'none', color: 'var(--ink-4)', cursor: 'pointer', display: 'flex' }}
            aria-label="Clear search"
          >
            <Icon name="x" size={11} />
          </button>
        )}
      </div>

      <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', minWidth: 60, textAlign: 'right' }}>
        {count} shown
      </div>
      <LayoutSwitch layout={layout} setLayout={setLayout} />
    </div>
  );
}

interface ChipProps {
  active: boolean;
  onClick: () => void;
  count: number;
  color?: string;
  children: ReactNode;
}

function FilterChip({ active, onClick, count, color, children }: ChipProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 11px', borderRadius: 999,
        border: '1px solid ' + (active ? 'var(--ink)' : 'var(--line-2)'),
        background: active ? 'var(--ink)' : 'transparent',
        color: active ? 'var(--surface)' : 'var(--ink-2)',
        fontFamily: 'var(--sans)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 6,
      }}
    >
      {color && !active && (
        <span style={{ width: 6, height: 6, borderRadius: 3, background: color, display: 'inline-block' }} />
      )}
      {children}
      <span className="tnum" style={{ opacity: active ? 0.7 : 0.55, fontWeight: 400 }}>{count}</span>
    </button>
  );
}

function LayoutSwitch({ layout, setLayout }: { layout: Layout; setLayout: (l: Layout) => void }) {
  const options: Array<{ k: Layout; icon: ReactNode }> = [
    {
      k: 'grid',
      icon: (
        <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor">
          <rect x="0" y="0" width="6" height="6" rx="1" />
          <rect x="8" y="0" width="6" height="6" rx="1" />
          <rect x="0" y="8" width="6" height="6" rx="1" />
          <rect x="8" y="8" width="6" height="6" rx="1" />
        </svg>
      ),
    },
    {
      k: 'list',
      icon: (
        <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor">
          <rect x="0" y="1"  width="14" height="2" rx="1" />
          <rect x="0" y="6"  width="14" height="2" rx="1" />
          <rect x="0" y="11" width="14" height="2" rx="1" />
        </svg>
      ),
    },
    {
      k: 'timeline',
      icon: (
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="3" cy="3"  r="1.5" />
          <line   x1="4.5" y1="3"  x2="13" y2="3" />
          <circle cx="3" cy="7"  r="1.5" />
          <line   x1="4.5" y1="7"  x2="10" y2="7" />
          <circle cx="3" cy="11" r="1.5" />
          <line   x1="4.5" y1="11" x2="12" y2="11" />
        </svg>
      ),
    },
  ];
  return (
    <div
      style={{
        display: 'flex', padding: 2, borderRadius: 8,
        background: 'var(--surface-2)', border: '1px solid var(--line)',
      }}
    >
      {options.map((o) => (
        <button
          key={o.k}
          onClick={() => setLayout(o.k)}
          aria-label={`Switch to ${o.k} view`}
          style={{
            padding: '4px 9px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: layout === o.k ? 'var(--surface)' : 'transparent',
            color:      layout === o.k ? 'var(--ink)'     : 'var(--ink-3)',
            boxShadow:  layout === o.k ? '0 1px 2px rgba(40,30,20,0.08)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {o.icon}
        </button>
      ))}
    </div>
  );
}

// ─── Bodies ──────────────────────────────────────────────────────────────────
interface BodyProps {
  filtered: Agent[];
  density: Density;
  onOpen: (id: string) => void;
  onAction: (id: string, action: CardAction) => void;
  selectedId: string | null;
}

function GridBody({ filtered, density, onOpen, onAction, selectedId }: BodyProps) {
  if (!filtered.length) return <EmptyState />;
  return (
    <div
      style={{
        padding: '20px 28px 28px',
        display: 'grid',
        gridTemplateColumns: density === 'compact'
          ? 'repeat(auto-fill, minmax(280px, 1fr))'
          : 'repeat(auto-fill, minmax(330px, 1fr))',
        gap: density === 'compact' ? 12 : 16,
        alignContent: 'start',
      }}
    >
      {filtered.map((a) => (
        <GridCard
          key={a.id}
          a={a}
          density={density}
          onOpen={() => onOpen(a.id)}
          onAction={onAction}
          selected={a.id === selectedId}
        />
      ))}
    </div>
  );
}

function ListBody({ filtered, density, onOpen, onAction, selectedId }: BodyProps) {
  if (!filtered.length) return <EmptyState />;
  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: LIST_GRID_COLS,
          gap: 14, padding: '8px 16px 8px 19px',
          borderBottom: '1px solid var(--line)', background: 'var(--bg-2)',
          fontSize: 10.5, fontWeight: 600, color: 'var(--ink-3)',
          textTransform: 'uppercase', letterSpacing: 0.7, fontFamily: 'var(--mono)',
        }}
      >
        <span>Agent</span><span>Status</span><span>Task</span><span>Repo · Branch</span>
        <span>Progress</span>
        <span style={{ textAlign: 'right' }}>Tokens</span>
        <span style={{ textAlign: 'right' }}>Cost</span>
        <span>Started</span><span></span>
      </div>
      {filtered.map((a) => (
        <ListRow
          key={a.id}
          a={a}
          density={density}
          onOpen={() => onOpen(a.id)}
          onAction={onAction}
          selected={a.id === selectedId}
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ padding: 80, textAlign: 'center', color: 'var(--ink-4)', fontSize: 14 }}>
      No agents match your filters.
    </div>
  );
}
