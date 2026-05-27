// Right sidebar: hand-off graph + live activity feed. Warm theme.

const { Icon: SidebarIcon } = window.DashUtils;

function Sidebar({ agents, activity, onSelectAgent }) {
  return (
    <aside style={{
      width: 320, flex: '0 0 320px',
      borderLeft: '1px solid var(--line)', background: 'var(--surface)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <CollabGraphWarm agents={agents} onSelectAgent={onSelectAgent} />
      <ActivityFeedWarm activity={activity} />
    </aside>
  );
}

function CollabGraphWarm({ agents, onSelectAgent }) {
  // Compute nodes from agents that have deps, plus their referenced peers.
  const lookupByName = Object.fromEntries(agents.map(a => [a.name, a]));
  const seeds = ['refactor-api', 'test-coverage', 'docs-update', 'a11y-pass', 'perf-audit', 'feature-search'];
  const seen = new Set();
  const nodes = [];
  const positions = {
    'refactor-api':  { x: 60,  y: 50 },
    'test-coverage': { x: 155, y: 80 },
    'docs-update':   { x: 245, y: 55 },
    'a11y-pass':     { x: 90,  y: 145 },
    'perf-audit':    { x: 185, y: 155 },
    'feature-search':{ x: 260, y: 135 },
  };
  for (const name of seeds) {
    const a = lookupByName[name];
    if (!a || seen.has(name)) continue;
    seen.add(name);
    nodes.push({ ...a, ...positions[name] });
  }
  const edges = [
    ['refactor-api', 'test-coverage'],
    ['test-coverage', 'docs-update'],
    ['refactor-api', 'a11y-pass'],
    ['a11y-pass', 'perf-audit'],
    ['perf-audit', 'feature-search'],
    ['test-coverage', 'feature-search'],
  ];
  const byName = Object.fromEntries(nodes.map(n => [n.name, n]));
  const STATUS = window.STATUS_META;

  return (
    <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--line)', background: 'var(--surface-2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <h3 className="mono" style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Hand-offs
        </h3>
        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-4)' }}>last 1h</span>
      </div>
      <svg viewBox="0 0 320 200" style={{ width: '100%', height: 190, display: 'block' }}>
        <defs>
          <marker id="arr-warm" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--ink-4)" />
          </marker>
        </defs>
        {edges.map(([from, to], i) => {
          const a = byName[from], b = byName[to];
          if (!a || !b) return null;
          // Shorten so the arrow tip lands at the edge of the destination dot
          const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
          const r = 12;
          const x2 = b.x - (dx / len) * r, y2 = b.y - (dy / len) * r;
          return (
            <line key={i} x1={a.x} y1={a.y} x2={x2} y2={y2}
              stroke="var(--ink-4)" strokeWidth="1.2" strokeDasharray={i === 2 ? '3 3' : ''}
              opacity="0.5" markerEnd="url(#arr-warm)" />
          );
        })}
        {nodes.map((n) => {
          const s = STATUS[n.status];
          return (
            <g key={n.id} style={{ cursor: 'pointer' }} onClick={() => onSelectAgent(n.id)}>
              <circle cx={n.x} cy={n.y} r="13" fill={s.bg} opacity="1" />
              <circle cx={n.x} cy={n.y} r="6" fill={s.fg} />
              <text x={n.x} y={n.y + 26} textAnchor="middle"
                fontSize="9.5" fill="var(--ink-2)" fontFamily="var(--sans)" fontWeight="500">{n.name}</text>
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

function ActivityFeedWarm({ activity }) {
  const toneColor = {
    edit: 'var(--ink-3)', pr: 'var(--clay)', review: 'var(--review)', error: 'var(--error)',
    ok: 'var(--running)', flag: 'var(--waiting)', spawn: 'var(--clay)', progress: 'var(--running)',
    msg: 'var(--review)', action: 'var(--ink-2)',
  };
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '14px 18px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 className="mono" style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Activity
        </h3>
        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-4)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 5, height: 5, borderRadius: 2.5, background: 'var(--running)',
            boxShadow: '0 0 0 2.5px var(--running-bg)' }} />
          live
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {activity.map((e, i) => (
          <div key={e.id ?? i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 12 }}>
            <span className="mono tnum" style={{ fontSize: 10.5, color: 'var(--ink-4)', flex: '0 0 auto', paddingTop: 1, width: 32 }}>{e.t}</span>
            <span style={{ width: 5, height: 5, borderRadius: 3, background: toneColor[e.tone] || 'var(--ink-4)', marginTop: 6, flex: '0 0 auto' }} />
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

window.Sidebar = Sidebar;
