// Variant 2 — "Atelier"
// Editorial / artisan feel. Serif display numerals, italic labels,
// index-card style agents with corner status tabs.

const Atelier = () => {
  const A = window.AGENTS;
  const T = window.totals;
  const S = window.STATUS_META;

  return (
    <div className="dash" style={{
      width: '100%', height: '100%', background: '#f8f2e3',
      color: 'var(--ink)', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* ───── Masthead ───── */}
      <header style={{
        padding: '32px 48px 24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        borderBottom: '1px solid var(--line-2)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <h1 className="serif" style={{ margin: 0, fontSize: 56, fontWeight: 400, letterSpacing: -1.5, lineHeight: 1, color: 'var(--ink)' }}>
              The Atelier
            </h1>
            <span className="serif" style={{ fontStyle: 'italic', fontSize: 22, color: 'var(--ink-3)' }}>
              — vol. 47
            </span>
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-3)', display: 'flex', gap: 14 }}>
            <span className="mono">Tue 14:32</span>
            <span>·</span>
            <span className="serif" style={{ fontStyle: 'italic', fontSize: 14 }}>An afternoon's labour, eighteen hands</span>
          </div>
        </div>

        {/* Headline stats */}
        <div style={{ display: 'flex', gap: 36, alignItems: 'flex-end' }}>
          <BigStat value={T.running} label="at work" color="var(--running)" />
          <BigStat value={T.review} label="for review" color="var(--review)" />
          <BigStat value={`$${T.cost.toFixed(0)}`} sub={`.${(T.cost % 1).toFixed(2).slice(2)}`} label="spent today" />
        </div>
      </header>

      {/* ───── Section heading ───── */}
      <div style={{ padding: '20px 48px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h2 className="serif" style={{ margin: 0, fontStyle: 'italic', fontWeight: 400, fontSize: 22, color: 'var(--ink-2)' }}>
            The fellowship
          </h2>
          <span style={{ height: 1, flex: 1, background: 'var(--line-2)', display: 'inline-block', width: 80 }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['running', 'review', 'waiting', 'error', 'idle'].map(k => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--ink-3)',
              padding: '4px 9px', borderRadius: 999, border: '1px solid var(--line-2)', background: 'rgba(255,255,255,0.4)' }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: S[k].fg }} />
              <span className="serif" style={{ fontStyle: 'italic' }}>{S[k].label.toLowerCase()}</span>
              <span className="mono tnum" style={{ color: 'var(--ink-2)' }}>{T[k]}</span>
            </div>
          ))}
          <button style={{
            padding: '5px 14px', borderRadius: 999, border: '1px solid var(--ink)',
            background: 'var(--ink)', color: '#f8f2e3', fontSize: 12, fontWeight: 500, cursor: 'pointer',
            fontFamily: 'var(--sans)',
          }}>+ commission</button>
        </div>
      </div>

      {/* ───── Index-card grid ───── */}
      <div style={{
        flex: 1, overflow: 'auto', padding: '8px 48px 48px',
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, alignContent: 'start',
      }}>
        {A.map((a, i) => <AtelierCard key={a.id} a={a} idx={i} />)}
      </div>
    </div>
  );
};

const BigStat = ({ value, sub, label, color }) => (
  <div style={{ textAlign: 'right' }}>
    <div className="serif tnum" style={{
      fontSize: 44, fontWeight: 400, lineHeight: 1, letterSpacing: -1,
      color: color || 'var(--ink)',
    }}>
      {value}{sub && <span style={{ fontSize: 22, opacity: 0.6 }}>{sub}</span>}
    </div>
    <div className="serif" style={{ fontStyle: 'italic', fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>
      {label}
    </div>
  </div>
);

const AtelierCard = ({ a, idx }) => {
  const s = window.STATUS_META[a.status];
  const pct = a.steps ? Math.round((a.step / a.steps) * 100) : 0;
  return (
    <article style={{
      background: '#fdfaf0', borderRadius: 4,
      border: '1px solid var(--line-2)',
      boxShadow: '0 1px 2px rgba(80,60,30,0.05)',
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Corner ribbon */}
      <div style={{
        position: 'absolute', top: 14, right: -32, width: 110,
        background: s.fg, color: '#fff',
        transform: 'rotate(35deg)', textAlign: 'center',
        fontSize: 9.5, padding: '3px 0', fontWeight: 600,
        letterSpacing: 1.2, textTransform: 'uppercase',
        opacity: a.status === 'idle' ? 0.4 : 1,
      }} className="mono">{s.label}</div>

      <div style={{ padding: '18px 20px 14px' }}>
        {/* Plate number + name */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span className="serif tnum" style={{
            fontSize: 36, fontWeight: 400, lineHeight: 0.9, color: 'var(--ink-3)',
            fontStyle: 'italic',
          }}>№{String(idx + 1).padStart(2, '0')}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="serif" style={{ fontSize: 22, fontWeight: 400, lineHeight: 1.05, color: 'var(--ink)', letterSpacing: -0.4,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {a.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }} className="mono">{a.model} · {a.id}</div>
          </div>
        </div>

        {/* Role / current commission */}
        <div className="serif" style={{
          fontStyle: 'italic', fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.4,
          margin: '14px 0 12px',
          paddingLeft: 12, borderLeft: '2px solid ' + s.fg,
        }}>
          “{a.task}”
        </div>

        {/* Meta line */}
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="mono">{a.repo}</span>
          <span style={{ color: 'var(--ink-5)' }}>/</span>
          <span className="mono">{a.branch}</span>
        </div>

        {/* Progress as bar segments */}
        {a.steps > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 5 }}>
              <span className="serif" style={{ fontStyle: 'italic', fontSize: 12, color: 'var(--ink-3)' }}>progress</span>
              <span className="serif tnum" style={{ fontSize: 16, color: 'var(--ink)' }}>
                {a.step}<span style={{ color: 'var(--ink-4)', fontStyle: 'italic' }}> of </span>{a.steps}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 2, height: 6 }}>
              {Array.from({ length: a.steps }, (_, i) => (
                <div key={i} style={{
                  flex: 1,
                  background: i < a.step ? s.fg : 'var(--line)',
                  opacity: i === a.step && a.status === 'running' ? 0.45 : 1,
                }} />
              ))}
            </div>
          </div>
        )}

        {/* Footnote / last activity */}
        <div className="serif" style={{
          fontSize: 13, fontStyle: 'italic', color: 'var(--ink-2)',
          lineHeight: 1.45, paddingTop: 12, borderTop: '1px dashed var(--line-2)',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {a.last}
        </div>
      </div>

      {/* Foot — billing line */}
      <div style={{
        marginTop: 'auto', padding: '9px 20px',
        borderTop: '1px solid var(--line-2)', background: 'rgba(245,235,210,0.4)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span className="mono tnum" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
          {(a.tokens / 1000).toFixed(0)}k tok
        </span>
        <span className="serif tnum" style={{ fontSize: 13, color: 'var(--ink)', fontStyle: 'italic' }}>
          ${a.cost.toFixed(2)}
        </span>
        <span style={{ color: 'var(--ink-5)' }}>·</span>
        <span className="serif" style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--ink-3)' }}>
          {a.started === '—' ? 'awaiting' : `${a.started} in`}
        </span>
        <div style={{ flex: 1 }} />
        <button style={atelierBtn(false)}>chat</button>
        <button style={atelierBtn(a.status === 'review' || a.status === 'error')}>
          {a.status === 'review' ? 'review' : a.status === 'error' ? 'retry' : a.status === 'running' ? 'pause' : 'open'}
        </button>
      </div>
    </article>
  );
};

const atelierBtn = (primary) => ({
  padding: '4px 12px', borderRadius: 999,
  border: '1px solid ' + (primary ? 'var(--ink)' : 'var(--line-2)'),
  background: primary ? 'var(--ink)' : 'transparent',
  color: primary ? '#fdfaf0' : 'var(--ink-2)',
  fontFamily: 'var(--serif)', fontSize: 13, fontStyle: 'italic', cursor: 'pointer',
});

window.Atelier = Atelier;
