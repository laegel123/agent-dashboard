// Variant 3 — "Operations"
// Dense ops console. Compact metrics ribbon, activity timeline, sidebar
// with collaboration graph. Mono-heavy, but still warm.

const Operations = () => {
  const A = window.AGENTS;
  const T = window.totals;
  const S = window.STATUS_META;

  return (
    <div className="dash" style={{
      width: '100%', height: '100%', background: '#1c1812',
      color: '#e8e0cc', overflow: 'hidden',
      display: 'grid', gridTemplateColumns: '1fr 320px', gridTemplateRows: 'auto auto 1fr',
      gridTemplateAreas: '"top top" "ribbon ribbon" "grid side"',
    }}>
      {/* ───── Top bar ───── */}
      <div style={{
        gridArea: 'top', padding: '12px 20px',
        display: 'flex', alignItems: 'center', gap: 18,
        borderBottom: '1px solid #2c2618', background: '#221d15',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--clay-2)' }} />
          <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: '#fbf8f1', letterSpacing: 0.5 }}>
            agents.ops
          </span>
          <span className="mono" style={{ fontSize: 11, color: '#8a836f' }}>/ jamie@laptop</span>
        </div>

        <div style={{ display: 'flex', gap: 4, marginLeft: 12 }}>
          {['Fleet', 'Activity', 'Costs', 'Graph', 'Settings'].map((t, i) => (
            <div key={t} style={{
              padding: '5px 11px', borderRadius: 6,
              background: i === 0 ? '#2c2618' : 'transparent',
              color: i === 0 ? '#fbf8f1' : '#8a836f',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
            }} className="mono">{t}</div>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        <div className="mono" style={{ fontSize: 11, color: '#8a836f', display: 'flex', gap: 14, alignItems: 'center' }}>
          <span><span style={{ color: '#cdc6ad' }}>uptime</span> 03:14:08</span>
          <span style={{ color: '#3d3624' }}>·</span>
          <span><span style={{ color: '#cdc6ad' }}>queue</span> 3</span>
          <span style={{ color: '#3d3624' }}>·</span>
          <span><span style={{ color: '#cdc6ad' }}>budget</span> $24.8 / $50</span>
        </div>

        <button style={{
          padding: '6px 12px', borderRadius: 6, marginLeft: 6,
          background: 'var(--clay-2)', color: '#1c1812',
          border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'var(--mono)',
        }}>+ spawn</button>
      </div>

      {/* ───── Metrics ribbon ───── */}
      <div style={{
        gridArea: 'ribbon', padding: '14px 20px',
        display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 0,
        borderBottom: '1px solid #2c2618', background: '#1f1a13',
      }}>
        <MetricCell label="running"  value={T.running} of={T.total} color="var(--running)" />
        <MetricCell label="review"   value={T.review}  of={T.total} color="var(--review)"  />
        <MetricCell label="waiting"  value={T.waiting} of={T.total} color="var(--waiting)" />
        <MetricCell label="error"    value={T.error}   of={T.total} color="var(--error)"   />
        <MetricCell label="tok/min"  value="14.2k"     spark color="var(--clay-2)" sub="last 60m" />
        <MetricCell label="$/hr"     value={`$${(T.cost / 3.5).toFixed(2)}`} spark color="#cdc6ad" sub="trailing avg" last />
      </div>

      {/* ───── Card grid ───── */}
      <div style={{
        gridArea: 'grid', overflow: 'auto', padding: '12px 16px 20px',
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, alignContent: 'start',
      }}>
        {A.map(a => <OpsRow key={a.id} a={a} />)}
      </div>

      {/* ───── Side panel ───── */}
      <aside style={{
        gridArea: 'side',
        borderLeft: '1px solid #2c2618', background: '#1f1a13',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <CollabGraph />
        <ActivityFeed />
      </aside>
    </div>
  );
};

const MetricCell = ({ label, value, of, color, spark, sub, last }) => (
  <div style={{
    padding: '4px 14px',
    borderRight: last ? 'none' : '1px solid #2c2618',
  }}>
    <div className="mono" style={{ fontSize: 10, color: '#8a836f', textTransform: 'uppercase', letterSpacing: 0.6, display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 5, height: 5, borderRadius: 2.5, background: color }} />
      {label}
    </div>
    <div className="mono tnum" style={{ fontSize: 22, fontWeight: 500, color: '#fbf8f1', lineHeight: 1.15, marginTop: 2 }}>
      {value}{of != null && <span style={{ fontSize: 13, color: '#5e573e' }}> / {of}</span>}
    </div>
    {spark && (
      <svg width="100%" height="14" viewBox="0 0 100 14" preserveAspectRatio="none" style={{ marginTop: 2, opacity: 0.7 }}>
        <polyline fill="none" stroke={color} strokeWidth="1"
          points="0,9 8,8 16,11 24,7 32,8 40,6 48,7 56,5 64,8 72,4 80,6 88,3 96,5" />
      </svg>
    )}
    {sub && <div className="mono" style={{ fontSize: 9.5, color: '#5e573e', marginTop: 1 }}>{sub}</div>}
  </div>
);

const OpsRow = ({ a }) => {
  const s = window.STATUS_META[a.status];
  const fg = a.status === 'running' ? '#a8c87c' : a.status === 'error' ? '#e08a78' : a.status === 'review' ? '#a8a3c8' : a.status === 'waiting' ? '#d9b56e' : '#a8a18a';
  return (
    <div style={{
      background: '#26211a', borderRadius: 6, border: '1px solid #2c2618',
      borderLeft: `2px solid ${fg}`,
      padding: '10px 12px', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', gap: 7,
    }}>
      {/* Row 1: name + status + cost */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: 3, background: fg, flex: '0 0 auto',
          boxShadow: a.status === 'running' ? `0 0 0 2.5px ${fg}33` : 'none' }} />
        <span className="mono" style={{ fontWeight: 600, fontSize: 13, color: '#fbf8f1',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>{a.name}</span>
        <span className="mono" style={{ fontSize: 10, color: fg, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</span>
      </div>

      {/* Row 2: identifiers */}
      <div className="mono" style={{ fontSize: 10, color: '#7a7359', display: 'flex', gap: 8, whiteSpace: 'nowrap', overflow: 'hidden' }}>
        <span style={{ color: '#a89d7c' }}>{a.id}</span>
        <span>·</span>
        <span>{a.repo.split('/')[1]}</span>
        <span>·</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.branch}</span>
      </div>

      {/* Row 3: task */}
      <div style={{ fontSize: 12.5, color: '#e8e0cc', lineHeight: 1.4,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {a.task}
      </div>

      {/* Row 4: progress bar with step ticks */}
      {a.steps > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 4, background: '#2c2618', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', inset: 0, width: `${(a.step / a.steps) * 100}%`,
              background: fg, opacity: 0.85,
            }} />
            {Array.from({ length: a.steps - 1 }, (_, i) => (
              <div key={i} style={{
                position: 'absolute', left: `${((i + 1) / a.steps) * 100}%`, top: 0, bottom: 0,
                width: 1, background: '#1c1812',
              }} />
            ))}
          </div>
          <span className="mono tnum" style={{ fontSize: 10, color: '#a89d7c' }}>{a.step}/{a.steps}</span>
        </div>
      )}

      {/* Row 5: last line as log */}
      <div className="mono" style={{
        fontSize: 10.5, color: '#a89d7c', lineHeight: 1.35,
        padding: '5px 7px', background: '#1c1812', borderRadius: 4,
        display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        <span style={{ color: '#5e573e' }}>{'›'} </span>{a.last}
      </div>

      {/* Row 6: footer stats */}
      <div className="mono tnum" style={{ fontSize: 10, color: '#7a7359', display: 'flex', gap: 10, alignItems: 'center' }}>
        <span>{(a.tokens / 1000).toFixed(1)}k tok</span>
        <span style={{ color: '#3d3624' }}>·</span>
        <span style={{ color: '#cdc6ad' }}>${a.cost.toFixed(2)}</span>
        <span style={{ color: '#3d3624' }}>·</span>
        <span>{a.edited}f</span>
        <span style={{ color: '#3d3624' }}>·</span>
        <span>{a.started}</span>
        <div style={{ flex: 1 }} />
        <span style={{ cursor: 'pointer', color: '#cdc6ad' }}>chat</span>
        <span style={{ color: '#3d3624' }}>·</span>
        <span style={{ cursor: 'pointer', color: 'var(--clay-2)', fontWeight: 600 }}>
          {a.status === 'review' ? 'review →' : a.status === 'error' ? 'retry' : a.status === 'running' ? 'pause' : 'open'}
        </span>
      </div>
    </div>
  );
};

// Tiny collaboration graph — 5 nodes, hand-positioned, with edges showing
// who hands off to whom.
const CollabGraph = () => {
  const nodes = [
    { id: 'refactor-api',  x: 50,  y: 50, color: 'var(--running)', size: 22 },
    { id: 'test-coverage', x: 145, y: 80, color: 'var(--running)', size: 18 },
    { id: 'docs-update',   x: 230, y: 55, color: 'var(--review)',  size: 16 },
    { id: 'a11y-pass',     x: 80,  y: 145,color: 'var(--running)', size: 16 },
    { id: 'perf-audit',    x: 180, y: 150,color: 'var(--running)', size: 17 },
    { id: 'feature-search',x: 250, y: 130,color: 'var(--review)',  size: 19 },
  ];
  const edges = [
    [0, 1], [1, 2], [0, 3], [3, 4], [4, 5], [1, 5],
  ];
  return (
    <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #2c2618' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h3 className="mono" style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#cdc6ad', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Hand-offs
        </h3>
        <span className="mono" style={{ fontSize: 10, color: '#5e573e' }}>last 1h</span>
      </div>
      <svg viewBox="0 0 300 200" style={{ width: '100%', height: 180, display: 'block' }}>
        {edges.map(([a, b], i) => (
          <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
            stroke="#3d3624" strokeWidth="1.2" strokeDasharray={i === 2 ? '3 3' : ''} />
        ))}
        {nodes.map(n => (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r={n.size / 2} fill={n.color} opacity="0.25" />
            <circle cx={n.x} cy={n.y} r={n.size / 2 - 4} fill={n.color} />
            <text x={n.x} y={n.y + n.size / 2 + 11} textAnchor="middle"
              fontSize="9" fill="#a89d7c" fontFamily="var(--mono)">{n.id}</text>
          </g>
        ))}
      </svg>
    </div>
  );
};

const ActivityFeed = () => {
  const events = [
    { t: '14:32', who: 'refactor-api',    what: 'edited handlers/payment.ts',   tone: 'edit' },
    { t: '14:31', who: 'test-coverage',   what: 'opened PR #482',                tone: 'pr' },
    { t: '14:28', who: 'docs-update',     what: 'awaiting your review',          tone: 'review' },
    { t: '14:26', who: 'security-review', what: 'tool error: snyk rate limit',   tone: 'error' },
    { t: '14:21', who: 'a11y-pass',       what: 'fixed 4 axe violations',        tone: 'ok' },
    { t: '14:18', who: 'perf-audit',      what: 'flagged FeedItem.render()',     tone: 'flag' },
    { t: '14:14', who: 'changelog',       what: 'spawned by you',                tone: 'spawn' },
    { t: '14:09', who: 'feature-search',  what: 'finished step 6/8',             tone: 'progress' },
  ];
  const toneColor = {
    edit: '#cdc6ad', pr: 'var(--clay-2)', review: '#a8a3c8', error: '#e08a78',
    ok: '#a8c87c', flag: '#d9b56e', spawn: 'var(--clay-2)', progress: '#a8c87c',
  };
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <h3 className="mono" style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#cdc6ad', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Activity
        </h3>
        <span className="mono" style={{ fontSize: 10, color: '#5e573e' }}>live</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {events.map((e, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12 }}>
            <span className="mono" style={{ fontSize: 10, color: '#5e573e', flex: '0 0 auto', paddingTop: 1 }}>{e.t}</span>
            <span style={{ width: 4, height: 4, borderRadius: 2, background: toneColor[e.tone], marginTop: 7, flex: '0 0 auto' }} />
            <div style={{ flex: 1, lineHeight: 1.4 }}>
              <span className="mono" style={{ color: '#cdc6ad', fontWeight: 500 }}>{e.who}</span>
              <span style={{ color: '#a89d7c' }}> {e.what}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

window.Operations = Operations;
