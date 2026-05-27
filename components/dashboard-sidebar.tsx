/**
 * Right sidebar: hand-off graph + live activity feed.
 * Port of design-package/agent-dashboard/project/dashboard-sidebar.jsx.
 *
 * Adds the "demo data" badge per UI_GUIDE.md (sidebar visualizes mock relations
 * that we cannot derive from real JSONL).
 */

'use client';

import type { CSSProperties } from 'react';
import { STATUS_META } from '@/lib/status-meta';
import type { Agent, ActivityEvent, ActivityTone } from '@/lib/types';

export interface SidebarProps {
  agents: Agent[];
  activity: ActivityEvent[];
  onSelectAgent: (id: string) => void;
}

export function Sidebar({ agents, activity, onSelectAgent }: SidebarProps) {
  return (
    <aside
      style={{
        width: 320, flex: '0 0 320px',
        borderLeft: '1px solid var(--line)', background: 'var(--surface)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}
    >
      <CollabGraphWarm agents={agents} onSelectAgent={onSelectAgent} />
      <ActivityFeedWarm activity={activity} />
    </aside>
  );
}

// ─── Demo-data badge (UI_GUIDE) ──────────────────────────────────────────────
const DEMO_BADGE: CSSProperties = {
  fontSize: 9.5,
  fontFamily: 'var(--mono)',
  color: 'var(--ink-4)',
  textTransform: 'uppercase',
  letterSpacing: 0.7,
  padding: '1px 6px',
  borderRadius: 3,
  background: 'var(--surface-2)',
  border: '1px solid var(--line-2)',
};

function DemoBadge() {
  return <span style={DEMO_BADGE}>demo data</span>;
}

// ─── Hand-off graph ──────────────────────────────────────────────────────────
const SEED_NAMES = [
  'refactor-api', 'test-coverage', 'docs-update',
  'a11y-pass',    'perf-audit',    'feature-search',
] as const;

const POSITIONS: Record<string, { x: number; y: number }> = {
  'refactor-api':   { x: 60,  y: 50  },
  'test-coverage':  { x: 155, y: 80  },
  'docs-update':    { x: 245, y: 55  },
  'a11y-pass':      { x: 90,  y: 145 },
  'perf-audit':     { x: 185, y: 155 },
  'feature-search': { x: 260, y: 135 },
};

const EDGES: Array<[string, string]> = [
  ['refactor-api',  'test-coverage'],
  ['test-coverage', 'docs-update'],
  ['refactor-api',  'a11y-pass'],
  ['a11y-pass',     'perf-audit'],
  ['perf-audit',    'feature-search'],
  ['test-coverage', 'feature-search'],
];

interface GraphNode extends Agent {
  x: number;
  y: number;
}

function CollabGraphWarm({ agents, onSelectAgent }: { agents: Agent[]; onSelectAgent: (id: string) => void }) {
  const lookupByName: Record<string, Agent> = Object.fromEntries(agents.map((a) => [a.name, a]));
  const seen = new Set<string>();
  const nodes: GraphNode[] = [];
  for (const name of SEED_NAMES) {
    const a = lookupByName[name];
    const pos = POSITIONS[name];
    if (!a || !pos || seen.has(name)) continue;
    seen.add(name);
    nodes.push({ ...a, x: pos.x, y: pos.y });
  }
  const byName: Record<string, GraphNode> = Object.fromEntries(nodes.map((n) => [n.name, n]));

  return (
    <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--line)', background: 'var(--surface-2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
        <h3
          className="mono"
          style={{
            margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--ink-2)',
            textTransform: 'uppercase', letterSpacing: 0.8,
          }}
        >
          Hand-offs
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <DemoBadge />
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-4)' }}>last 1h</span>
        </div>
      </div>

      <svg viewBox="0 0 320 200" style={{ width: '100%', height: 190, display: 'block' }}>
        <defs>
          <marker id="arr-warm" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--ink-4)" />
          </marker>
        </defs>
        {EDGES.map(([from, to], i) => {
          const a = byName[from];
          const b = byName[to];
          if (!a || !b) return null;
          // Shorten so the arrow tip lands at the destination dot edge
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          const r = 12;
          const x2 = b.x - (dx / len) * r;
          const y2 = b.y - (dy / len) * r;
          return (
            <line
              key={i}
              x1={a.x} y1={a.y} x2={x2} y2={y2}
              stroke="var(--ink-4)" strokeWidth="1.2"
              strokeDasharray={i === 2 ? '3 3' : undefined}
              opacity="0.5" markerEnd="url(#arr-warm)"
            />
          );
        })}
        {nodes.map((n) => {
          const s = STATUS_META[n.status];
          return (
            <g key={n.id} style={{ cursor: 'pointer' }} onClick={() => onSelectAgent(n.id)}>
              <circle cx={n.x} cy={n.y} r="13" fill={s.bg} opacity="1" />
              <circle cx={n.x} cy={n.y} r="6"  fill={s.fg} />
              <text
                x={n.x} y={n.y + 26} textAnchor="middle"
                fontSize="9.5" fill="var(--ink-2)"
                fontFamily="var(--sans)" fontWeight="500"
              >
                {n.name}
              </text>
            </g>
          );
        })}
      </svg>

      <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 10.5, color: 'var(--ink-3)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--running)' }} />running
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--review)' }} />review
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--ink-4)' }} />arrow = hand-off
        </span>
      </div>
    </div>
  );
}

// ─── Activity feed ───────────────────────────────────────────────────────────
const TONE_COLOR: Record<ActivityTone, string> = {
  edit:     'var(--ink-3)',
  pr:       'var(--clay)',
  review:   'var(--review)',
  error:    'var(--error)',
  ok:       'var(--running)',
  flag:     'var(--waiting)',
  spawn:    'var(--clay)',
  progress: 'var(--running)',
  msg:      'var(--review)',
  action:   'var(--ink-2)',
};

function ActivityFeedWarm({ activity }: { activity: ActivityEvent[] }) {
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '14px 18px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
        <h3
          className="mono"
          style={{
            margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--ink-2)',
            textTransform: 'uppercase', letterSpacing: 0.8,
          }}
        >
          Activity
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <DemoBadge />
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-4)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span
              style={{
                width: 5, height: 5, borderRadius: 2.5,
                background: 'var(--running)',
                boxShadow: '0 0 0 2.5px var(--running-bg)',
              }}
            />
            live
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {activity.map((e) => (
          <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 12 }}>
            <span
              className="mono tnum"
              style={{ fontSize: 10.5, color: 'var(--ink-4)', flex: '0 0 auto', paddingTop: 1, width: 32 }}
            >
              {e.t}
            </span>
            <span
              style={{
                width: 5, height: 5, borderRadius: 3,
                background: TONE_COLOR[e.tone] ?? 'var(--ink-4)',
                marginTop: 6, flex: '0 0 auto',
              }}
            />
            <div style={{ flex: 1, lineHeight: 1.4 }}>
              <span className="mono" style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{e.who}</span>
              <span style={{ color: 'var(--ink-3)' }}> {e.what}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
