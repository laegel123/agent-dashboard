// Grid card (warm) + list row. Both density variants supported.

const { Icon, StatusDot, fmtTok, fmt$ } = window.DashUtils;

function GridCard({ a, density, onOpen, onAction, selected }) {
  const s = window.STATUS_META[a.status];
  const compact = density === 'compact';
  return (
    <div onClick={onOpen} style={{
      background: 'var(--surface)', borderRadius: 'var(--r-lg)',
      border: '1px solid ' + (selected ? 'var(--clay)' : 'var(--line)'),
      boxShadow: selected ? '0 0 0 3px var(--clay-soft)' : 'none',
      overflow: 'hidden', cursor: 'pointer',
      display: 'flex', flexDirection: 'column',
      transition: 'border-color .15s, box-shadow .15s, transform .15s',
    }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.borderColor = 'var(--line-2)'; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.borderColor = 'var(--line)'; }}
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
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-4)', letterSpacing: 0.2 }}>{a.id} · {a.model}</div>
        </div>
        <span style={{
          fontSize: 10.5, padding: '3px 8px', borderRadius: 999,
          background: s.bg, color: s.fg, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: 0.6, flex: '0 0 auto',
        }} className="mono">{s.label}</span>
      </div>

      <div style={{ padding: compact ? '0 14px 10px' : '0 16px 14px' }}>
        <div style={{
          fontSize: compact ? 12.5 : 13.5, color: 'var(--ink-2)', lineHeight: 1.45,
          marginBottom: compact ? 8 : 10,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{a.task}</div>

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

        {!compact && (
          <div style={{
            fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic',
            padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 8,
            lineHeight: 1.4, marginTop: 10,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{a.last}</div>
        )}
      </div>

      <div style={{
        marginTop: 'auto', padding: compact ? '8px 14px' : '10px 16px',
        borderTop: '1px solid var(--line)', background: 'var(--surface-2)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)' }} className="mono tnum">
          {fmtTok(a.tokens)} · {fmt$(a.cost)} · {a.started}
        </div>
        <div style={{ flex: 1 }} />
        <CardActions a={a} onAction={onAction} />
      </div>
    </div>
  );
}

function CardActions({ a, onAction }) {
  const stop = (e) => e.stopPropagation();
  if (a.status === 'review') return (
    <>
      <BtnGhost onClick={(e) => { stop(e); onAction(a.id, 'reject'); }}>Reject</BtnGhost>
      <BtnPrimary onClick={(e) => { stop(e); onAction(a.id, 'approve'); }}>Approve</BtnPrimary>
    </>
  );
  if (a.status === 'error') return (
    <>
      <BtnGhost onClick={(e) => { stop(e); onAction(a.id, 'open'); }}>Logs</BtnGhost>
      <BtnPrimary onClick={(e) => { stop(e); onAction(a.id, 'retry'); }}>Retry</BtnPrimary>
    </>
  );
  if (a.status === 'running') return (
    <>
      <BtnGhost onClick={(e) => { stop(e); onAction(a.id, 'chat'); }}>Chat</BtnGhost>
      <BtnGhost onClick={(e) => { stop(e); onAction(a.id, 'pause'); }}>Pause</BtnGhost>
    </>
  );
  if (a.status === 'waiting') return (
    <>
      <BtnGhost onClick={(e) => { stop(e); onAction(a.id, 'chat'); }}>Chat</BtnGhost>
      <BtnPrimary onClick={(e) => { stop(e); onAction(a.id, 'open'); }}>Answer</BtnPrimary>
    </>
  );
  return (
    <>
      <BtnGhost onClick={(e) => { stop(e); onAction(a.id, 'chat'); }}>Chat</BtnGhost>
      <BtnPrimary onClick={(e) => { stop(e); onAction(a.id, 'start'); }}>Start</BtnPrimary>
    </>
  );
}

const btnBase = {
  padding: '5px 10px', borderRadius: 6,
  fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
};
function BtnGhost({ children, onClick }) {
  return <button onClick={onClick} style={{ ...btnBase, border: '1px solid var(--line-2)', background: 'transparent', color: 'var(--ink-2)' }}>{children}</button>;
}
function BtnPrimary({ children, onClick }) {
  return <button onClick={onClick} style={{ ...btnBase, border: '1px solid var(--clay)', background: 'var(--clay)', color: '#fff' }}>{children}</button>;
}

// ───── List row ─────
function ListRow({ a, density, onOpen, onAction, selected }) {
  const s = window.STATUS_META[a.status];
  const compact = density === 'compact';
  return (
    <div onClick={onOpen} style={{
      display: 'grid',
      gridTemplateColumns: '160px 80px 1fr 220px 110px 90px 90px 100px 130px',
      alignItems: 'center', gap: 14,
      padding: compact ? '8px 16px' : '12px 16px',
      borderBottom: '1px solid var(--line)',
      background: selected ? 'var(--clay-bg)' : 'var(--surface)',
      cursor: 'pointer',
      borderLeft: '3px solid ' + (selected ? 'var(--clay)' : s.fg),
      transition: 'background .12s',
    }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = 'var(--surface-2)'; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'var(--surface)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <StatusDot status={a.status} size={7} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>{a.id}</div>
        </div>
      </div>
      <span style={{
        fontSize: 10, padding: '2px 7px', borderRadius: 999,
        background: s.bg, color: s.fg, fontWeight: 600, justifySelf: 'start',
        textTransform: 'uppercase', letterSpacing: 0.5,
      }} className="mono">{s.label}</span>
      <div style={{ fontSize: 12.5, color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.task}</div>
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
      ) : <span style={{ color: 'var(--ink-5)' }} className="mono">—</span>}
      <span className="mono tnum" style={{ fontSize: 11.5, color: 'var(--ink-2)', textAlign: 'right' }}>{fmtTok(a.tokens)}</span>
      <span className="mono tnum" style={{ fontSize: 11.5, color: 'var(--ink-2)', textAlign: 'right' }}>{fmt$(a.cost)}</span>
      <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{a.started}</span>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <CardActions a={a} onAction={onAction} />
      </div>
    </div>
  );
}

window.GridCard = GridCard;
window.ListRow = ListRow;
