// Variant 1 — "Warm Studio"
// Claude brand baseline. Calm, generous whitespace, gallery-style cards.
// Top: greeting + summary stats + global controls.
// Body: 3-column card grid with status bar at top of each card.

const WarmStudio = () => {
  const A = window.AGENTS;
  const T = window.totals;
  const S = window.STATUS_META;
  const [filter, setFilter] = React.useState('all');
  const filtered = filter === 'all' ? A : A.filter(x => x.status === filter);

  return (
    <div className="dash" style={{
      width: '100%', height: '100%', background: 'var(--bg)',
      color: 'var(--ink)', fontSize: 14, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* ───── Top bar ───── */}
      <header style={{
        padding: '28px 40px 22px', borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32,
      }}>
        <div>
          <div style={{ fontSize: 12, letterSpacing: 1.2, color: 'var(--ink-3)', textTransform: 'uppercase', marginBottom: 6 }} className="mono">
            Agent Console · Tuesday
          </div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 500, letterSpacing: -0.6, color: 'var(--ink)' }}>
            Good afternoon, Jamie.
          </h1>
          <div style={{ marginTop: 6, color: 'var(--ink-3)', fontSize: 14 }}>
            <span style={{ color: 'var(--running)', fontWeight: 500 }}>{T.running} running</span>
            <span style={{ margin: '0 8px', color: 'var(--ink-5)' }}>·</span>
            <span style={{ color: 'var(--review)', fontWeight: 500 }}>{T.review} need your review</span>
            <span style={{ margin: '0 8px', color: 'var(--ink-5)' }}>·</span>
            <span style={{ color: 'var(--error)', fontWeight: 500 }}>{T.error} blocked</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SummaryStat label="Today's spend" value={`$${T.cost.toFixed(2)}`} sub={`${(T.tokens / 1000).toFixed(0)}k tokens`} />
          <SummaryStat label="Files edited" value={T.edited} sub="across 6 repos" />
          <SummaryStat label="Agents" value={`${T.total - T.idle}/${T.total}`} sub={`${T.idle} idle`} />
          <button style={ctaBtn}>+ New agent</button>
        </div>
      </header>

      {/* ───── Filter row ───── */}
      <div style={{
        padding: '14px 40px', display: 'flex', alignItems: 'center', gap: 8,
        borderBottom: '1px solid var(--line)', background: 'var(--bg-2)',
      }}>
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} count={T.total}>All</FilterChip>
        {['running', 'review', 'waiting', 'error', 'idle'].map(k => (
          <FilterChip key={k} active={filter === k} onClick={() => setFilter(k)} count={T[k]} color={S[k].fg}>
            {S[k].label}
          </FilterChip>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--line)', fontSize: 13, color: 'var(--ink-3)' }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14" strokeLinecap="round"/></svg>
          Search agents…
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)' }} className="mono">{filtered.length} shown</div>
      </div>

      {/* ───── Card grid ───── */}
      <div style={{
        flex: 1, overflow: 'auto', padding: '24px 40px 40px',
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, alignContent: 'start',
      }}>
        {filtered.map(a => <WarmCard key={a.id} a={a} />)}
      </div>
    </div>
  );
};

const SummaryStat = ({ label, value, sub }) => (
  <div style={{
    padding: '8px 16px', borderRight: '1px solid var(--line)',
    minWidth: 120,
  }}>
    <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.8 }} className="mono">{label}</div>
    <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.1, marginTop: 2 }} className="tnum">{value}</div>
    <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{sub}</div>
  </div>
);

const ctaBtn = {
  padding: '10px 16px', borderRadius: 10, border: '1px solid var(--clay)',
  background: 'var(--clay)', color: '#fff', fontFamily: 'var(--sans)',
  fontSize: 13, fontWeight: 500, cursor: 'pointer', marginLeft: 8,
};

const FilterChip = ({ active, onClick, count, color, children }) => (
  <button onClick={onClick} style={{
    padding: '6px 12px', borderRadius: 999, border: '1px solid ' + (active ? 'var(--ink)' : 'var(--line-2)'),
    background: active ? 'var(--ink)' : 'transparent',
    color: active ? 'var(--surface)' : 'var(--ink-2)',
    fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 6,
  }}>
    {color && !active && <span style={{ width: 6, height: 6, borderRadius: 3, background: color, display: 'inline-block' }} />}
    {children}
    <span style={{ opacity: active ? 0.7 : 0.55, fontWeight: 400 }} className="tnum">{count}</span>
  </button>
);

const WarmCard = ({ a }) => {
  const s = window.STATUS_META[a.status];
  const pct = a.steps ? Math.round((a.step / a.steps) * 100) : 0;
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 'var(--r-lg)',
      border: '1px solid var(--line)', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Status bar */}
      <div style={{ height: 3, background: s.fg, opacity: a.status === 'idle' ? 0.3 : 1 }} />

      <div style={{ padding: '14px 16px 12px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <div style={{ width: 7, height: 7, borderRadius: 4, background: s.fg, flex: '0 0 auto',
              boxShadow: a.status === 'running' ? `0 0 0 3px ${s.bg}` : 'none' }} />
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-4)', letterSpacing: 0.2 }}>{a.id} · {a.model}</div>
        </div>
        <span style={{
          fontSize: 10.5, padding: '3px 8px', borderRadius: 999,
          background: s.bg, color: s.fg, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: 0.6,
        }} className="mono">{s.label}</span>
      </div>

      {/* Task */}
      <div style={{ padding: '0 16px 14px' }}>
        <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.45, marginBottom: 10,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {a.task}
        </div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 8h6M8 5v6"/><circle cx="8" cy="8" r="6.5"/></svg>
          {a.repo} <span style={{ color: 'var(--ink-5)' }}>·</span> {a.branch}
        </div>

        {/* Progress dots */}
        {a.steps > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 3, flex: 1 }}>
              {Array.from({ length: a.steps }, (_, i) => (
                <div key={i} style={{
                  flex: 1, height: 4, borderRadius: 2,
                  background: i < a.step ? s.fg : i === a.step && a.status === 'running' ? s.fg : 'var(--line-2)',
                  opacity: i < a.step ? 1 : i === a.step && a.status === 'running' ? 0.5 : 1,
                }} />
              ))}
            </div>
            <span className="mono tnum" style={{ fontSize: 11, color: 'var(--ink-3)', flex: '0 0 auto' }}>{a.step}/{a.steps}</span>
          </div>
        )}

        {/* Last line */}
        <div style={{
          fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic',
          padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 8,
          lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {a.last}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 'auto', padding: '10px 16px', borderTop: '1px solid var(--line)',
        background: 'var(--surface-2)', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)' }} className="mono tnum">
          {(a.tokens / 1000).toFixed(0)}k · ${a.cost.toFixed(2)} · {a.started}
        </div>
        <div style={{ flex: 1 }} />
        <CardBtn>Chat</CardBtn>
        {a.status === 'review' ? <CardBtn primary>Review</CardBtn>
         : a.status === 'error' ? <CardBtn primary>Retry</CardBtn>
         : a.status === 'running' ? <CardBtn>Pause</CardBtn>
         : <CardBtn>Open</CardBtn>}
      </div>
    </div>
  );
};

const CardBtn = ({ primary, children }) => (
  <button style={{
    padding: '5px 10px', borderRadius: 6,
    border: '1px solid ' + (primary ? 'var(--clay)' : 'var(--line-2)'),
    background: primary ? 'var(--clay)' : 'transparent',
    color: primary ? '#fff' : 'var(--ink-2)',
    fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
  }}>{children}</button>
);

window.WarmStudio = WarmStudio;
