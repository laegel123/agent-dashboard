// Main dashboard app — top bar, filter row, layout switcher, sidebar,
// detail drawer, new-agent modal, Tweaks panel. Holds all interactive state.

const { Icon: AppIcon, fmtTok: AppFmtTok, fmt$: AppFmt$ } = window.DashUtils;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "layout": "grid",
  "density": "comfortable",
  "showSidebar": true,
  "accent": "#c96442"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const [agents, setAgents] = React.useState(() => window.AGENTS.map(a => ({ ...a })));
  const [filter, setFilter] = React.useState('all');
  const [query, setQuery] = React.useState('');
  const [selectedId, setSelectedId] = React.useState(null);
  const [newAgentOpen, setNewAgentOpen] = React.useState(false);
  const [chats, setChats] = React.useState({});
  const [activity, setActivity] = React.useState(() => ([
    { id: 1, t: '14:32', who: 'refactor-api',    what: 'edited handlers/payment.ts',   tone: 'edit' },
    { id: 2, t: '14:31', who: 'test-coverage',   what: 'opened PR #482',                tone: 'pr' },
    { id: 3, t: '14:28', who: 'docs-update',     what: 'awaiting your review',          tone: 'review' },
    { id: 4, t: '14:26', who: 'security-review', what: 'tool error: snyk rate limit',   tone: 'error' },
    { id: 5, t: '14:21', who: 'a11y-pass',       what: 'fixed 4 axe violations',        tone: 'ok' },
    { id: 6, t: '14:18', who: 'perf-audit',      what: 'flagged FeedItem.render()',     tone: 'flag' },
    { id: 7, t: '14:14', who: 'changelog',       what: 'spawned by you',                tone: 'spawn' },
    { id: 8, t: '14:09', who: 'feature-search',  what: 'finished step 6/8',             tone: 'progress' },
  ]));

  // Apply accent via CSS var
  React.useEffect(() => {
    document.documentElement.style.setProperty('--clay', t.accent || '#c96442');
  }, [t.accent]);

  // Derived
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return agents.filter(a => {
      if (filter !== 'all' && a.status !== filter) return false;
      if (!q) return true;
      return (a.name + ' ' + a.id + ' ' + a.task + ' ' + a.repo + ' ' + a.branch).toLowerCase().includes(q);
    });
  }, [agents, filter, query]);

  const totals = React.useMemo(() => ({
    total: agents.length,
    running: agents.filter(x => x.status === 'running').length,
    review:  agents.filter(x => x.status === 'review').length,
    error:   agents.filter(x => x.status === 'error').length,
    waiting: agents.filter(x => x.status === 'waiting').length,
    idle:    agents.filter(x => x.status === 'idle').length,
    tokens:  agents.reduce((s, x) => s + x.tokens, 0),
    cost:    agents.reduce((s, x) => s + x.cost, 0),
    edited:  agents.reduce((s, x) => s + x.edited, 0),
  }), [agents]);

  const selected = agents.find(a => a.id === selectedId) || null;

  const pushActivity = React.useCallback((e) => {
    setActivity(list => [{ ...e, id: Date.now() + Math.random(), t: clockNow() }, ...list].slice(0, 30));
  }, []);

  // ─── Agent actions ───
  const onAction = React.useCallback((id, action) => {
    setAgents(list => list.map(a => {
      if (a.id !== id) return a;
      switch (action) {
        case 'pause':   pushActivity({ who: a.name, what: 'paused by you', tone: 'action' });   return { ...a, status: 'waiting', last: 'paused by you — awaiting next move' };
        case 'retry':   pushActivity({ who: a.name, what: 'retry requested', tone: 'action' }); return { ...a, status: 'running', last: 'retrying previous step…' };
        case 'approve': pushActivity({ who: a.name, what: 'approved & merged', tone: 'ok' });   return { ...a, status: 'idle', step: a.steps, last: 'approved by you · merged' };
        case 'reject':  pushActivity({ who: a.name, what: 'rejected', tone: 'flag' });          return { ...a, status: 'running', step: Math.max(0, a.step - 1), last: 'rejected — revising approach' };
        case 'start':   pushActivity({ who: a.name, what: 'started by you', tone: 'spawn' });   return { ...a, status: 'running', started: 'just now', last: 'starting now…' };
        case 'stop':    pushActivity({ who: a.name, what: 'stopped', tone: 'action' });         return { ...a, status: 'idle', last: 'stopped by you' };
        default: return a;
      }
    }));
  }, [pushActivity]);

  // ─── Chat ───
  const onChatSend = React.useCallback((id, text) => {
    setChats(c => {
      const cur = c[id] || initialChatForId(id, agents);
      const next = [...cur, { role: 'user', text }];
      return { ...c, [id]: next };
    });
    pushActivity({ who: agentName(id, agents), what: 'received your message', tone: 'msg' });
    // Simulated agent reply
    setTimeout(() => {
      setChats(c => {
        const cur = c[id] || [];
        const a = agents.find(x => x.id === id);
        return { ...c, [id]: [...cur, { role: 'agent', text: cannedReply(a, text) }] };
      });
    }, 900);
  }, [agents, pushActivity]);

  // ─── Create agent ───
  const onCreate = (a) => {
    setAgents(list => [{ ...a }, ...list]);
    pushActivity({ who: a.name, what: 'spawned by you', tone: 'spawn' });
    setNewAgentOpen(false);
    setSelectedId(a.id);
  };

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', background: 'var(--bg)',
      color: 'var(--ink)', fontFamily: 'var(--sans)',
      position: 'relative',
    }} className="dash">
      <TopBar totals={totals} onNew={() => setNewAgentOpen(true)} />
      <FilterRow filter={filter} setFilter={setFilter} totals={totals}
        query={query} setQuery={setQuery} layout={t.layout} setLayout={(v) => setTweak('layout', v)}
        count={filtered.length} />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <div style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
          {t.layout === 'grid' && <GridBody filtered={filtered} density={t.density}
            onOpen={(id) => setSelectedId(id)} onAction={onAction} selectedId={selectedId} />}
          {t.layout === 'list' && <ListBody filtered={filtered} density={t.density}
            onOpen={(id) => setSelectedId(id)} onAction={onAction} selectedId={selectedId} />}
          {t.layout === 'timeline' && <TimelineView agents={filtered}
            onOpen={(id) => setSelectedId(id)} selectedId={selectedId} />}
        </div>
        {t.showSidebar && <Sidebar agents={agents} activity={activity} onSelectAgent={setSelectedId} />}

        {selected && (
          <DetailDrawer agent={selected} onClose={() => setSelectedId(null)}
            onAction={onAction} chats={chats} onChatSend={onChatSend} />
        )}
      </div>

      {newAgentOpen && <NewAgentModal onClose={() => setNewAgentOpen(false)} onCreate={onCreate} />}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Layout" />
        <TweakRadio label="View" value={t.layout} options={['grid', 'list', 'timeline']}
          onChange={(v) => setTweak('layout', v)} />
        <TweakRadio label="Density" value={t.density} options={['compact', 'comfortable']}
          onChange={(v) => setTweak('density', v)} />
        <TweakToggle label="Show sidebar" value={t.showSidebar}
          onChange={(v) => setTweak('showSidebar', v)} />
        <TweakSection label="Theme" />
        <TweakColor label="Accent" value={t.accent}
          options={['#c96442', '#b45e8f', '#5e8a6a', '#6b6699', '#a0764a']}
          onChange={(v) => setTweak('accent', v)} />
      </TweaksPanel>
    </div>
  );
}

// ─── Top bar ───
function TopBar({ totals, onNew }) {
  return (
    <header style={{
      padding: '22px 32px 16px', borderBottom: '1px solid var(--line)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24,
      background: 'var(--surface)',
    }}>
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
        <SummaryStat label="Files edited" value={totals.edited} sub="across 6 repos" />
        <SummaryStat label="Active" value={`${totals.total - totals.idle}/${totals.total}`} sub={`${totals.idle} idle`} last />
        <button onClick={onNew} style={{
          marginLeft: 14, padding: '10px 16px', borderRadius: 10,
          border: '1px solid var(--clay)', background: 'var(--clay)', color: '#fff',
          fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <AppIcon name="plus" size={13} />
          New agent
        </button>
      </div>
    </header>
  );
}

function SummaryStat({ label, value, sub, last }) {
  return (
    <div style={{ padding: '4px 16px', borderRight: last ? 'none' : '1px solid var(--line)', minWidth: 110 }}>
      <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</div>
      <div className="tnum" style={{ fontSize: 20, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.1, marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 1 }}>{sub}</div>
    </div>
  );
}

// ─── Filter row ───
function FilterRow({ filter, setFilter, totals, query, setQuery, layout, setLayout, count }) {
  const S = window.STATUS_META;
  return (
    <div style={{
      padding: '12px 32px', display: 'flex', alignItems: 'center', gap: 8,
      borderBottom: '1px solid var(--line)', background: 'var(--bg-2)',
    }}>
      <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} count={totals.total}>All</FilterChip>
      {['running', 'review', 'waiting', 'error', 'idle'].map(k => (
        <FilterChip key={k} active={filter === k} onClick={() => setFilter(k)} count={totals[k]} color={S[k].fg}>
          {S[k].label}
        </FilterChip>
      ))}
      <div style={{ flex: 1 }} />
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
        background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--line)',
        width: 220,
      }}>
        <AppIcon name="search" size={12} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search agents…"
          style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12.5, color: 'var(--ink)', flex: 1, fontFamily: 'var(--sans)' }} />
        {query && (
          <button onClick={() => setQuery('')} style={{ background: 'transparent', border: 'none', color: 'var(--ink-4)', cursor: 'pointer', display: 'flex' }}>
            <AppIcon name="x" size={11} />
          </button>
        )}
      </div>
      <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', minWidth: 60, textAlign: 'right' }}>{count} shown</div>
      <LayoutSwitch layout={layout} setLayout={setLayout} />
    </div>
  );
}

function FilterChip({ active, onClick, count, color, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 11px', borderRadius: 999,
      border: '1px solid ' + (active ? 'var(--ink)' : 'var(--line-2)'),
      background: active ? 'var(--ink)' : 'transparent',
      color: active ? 'var(--surface)' : 'var(--ink-2)',
      fontFamily: 'var(--sans)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {color && !active && <span style={{ width: 6, height: 6, borderRadius: 3, background: color, display: 'inline-block' }} />}
      {children}
      <span style={{ opacity: active ? 0.7 : 0.55, fontWeight: 400 }} className="tnum">{count}</span>
    </button>
  );
}

function LayoutSwitch({ layout, setLayout }) {
  return (
    <div style={{
      display: 'flex', padding: 2, borderRadius: 8,
      background: 'var(--surface-2)', border: '1px solid var(--line)',
    }}>
      {[
        { k: 'grid',     icon: <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="0" width="6" height="6" rx="1"/><rect x="8" y="0" width="6" height="6" rx="1"/><rect x="0" y="8" width="6" height="6" rx="1"/><rect x="8" y="8" width="6" height="6" rx="1"/></svg> },
        { k: 'list',     icon: <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="2" rx="1"/><rect x="0" y="6" width="14" height="2" rx="1"/><rect x="0" y="11" width="14" height="2" rx="1"/></svg> },
        { k: 'timeline', icon: <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="3" cy="3" r="1.5"/><line x1="4.5" y1="3" x2="13" y2="3"/><circle cx="3" cy="7" r="1.5"/><line x1="4.5" y1="7" x2="10" y2="7"/><circle cx="3" cy="11" r="1.5"/><line x1="4.5" y1="11" x2="12" y2="11"/></svg> },
      ].map(o => (
        <button key={o.k} onClick={() => setLayout(o.k)} style={{
          padding: '4px 9px', borderRadius: 6, border: 'none', cursor: 'pointer',
          background: layout === o.k ? 'var(--surface)' : 'transparent',
          color: layout === o.k ? 'var(--ink)' : 'var(--ink-3)',
          boxShadow: layout === o.k ? '0 1px 2px rgba(40,30,20,0.08)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{o.icon}</button>
      ))}
    </div>
  );
}

// ─── Grid / List bodies ───
function GridBody({ filtered, density, onOpen, onAction, selectedId }) {
  if (!filtered.length) return <EmptyState />;
  return (
    <div style={{
      padding: '20px 28px 28px',
      display: 'grid',
      gridTemplateColumns: density === 'compact' ? 'repeat(auto-fill, minmax(280px, 1fr))' : 'repeat(auto-fill, minmax(330px, 1fr))',
      gap: density === 'compact' ? 12 : 16, alignContent: 'start',
    }}>
      {filtered.map(a => (
        <GridCard key={a.id} a={a} density={density}
          onOpen={() => onOpen(a.id)} onAction={onAction}
          selected={a.id === selectedId} />
      ))}
    </div>
  );
}

function ListBody({ filtered, density, onOpen, onAction, selectedId }) {
  if (!filtered.length) return <EmptyState />;
  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '160px 80px 1fr 220px 110px 90px 90px 100px 130px',
        gap: 14, padding: '8px 16px 8px 19px',
        borderBottom: '1px solid var(--line)', background: 'var(--bg-2)',
        fontSize: 10.5, fontWeight: 600, color: 'var(--ink-3)',
        textTransform: 'uppercase', letterSpacing: 0.7, fontFamily: 'var(--mono)',
      }}>
        <span>Agent</span><span>Status</span><span>Task</span><span>Repo · Branch</span>
        <span>Progress</span><span style={{ textAlign: 'right' }}>Tokens</span>
        <span style={{ textAlign: 'right' }}>Cost</span><span>Started</span><span></span>
      </div>
      {filtered.map(a => (
        <ListRow key={a.id} a={a} density={density}
          onOpen={() => onOpen(a.id)} onAction={onAction}
          selected={a.id === selectedId} />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{
      padding: 80, textAlign: 'center',
      color: 'var(--ink-4)', fontSize: 14,
    }}>
      No agents match your filters.
    </div>
  );
}

// ─── helpers ───
function clockNow() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function agentName(id, agents) {
  return (agents.find(a => a.id === id) || {}).name || id;
}

function initialChatForId(id, agents) {
  const a = agents.find(x => x.id === id);
  if (!a) return [];
  if (a.status === 'waiting') return [
    { role: 'agent', text: 'I want to start, but I need a clarification first.' },
    { role: 'agent', text: a.last },
  ];
  if (a.status === 'review') return [{ role: 'agent', text: `I'm done with "${a.task}". ${a.last}` }];
  if (a.status === 'error')  return [{ role: 'agent', text: `Hit an error: ${a.last}` }];
  if (a.status === 'running') return [{ role: 'agent', text: `Working on "${a.task}". Currently: ${a.last}` }];
  return [{ role: 'agent', text: `Idle. Last activity: ${a.last}` }];
}

function cannedReply(a, userText) {
  if (!a) return 'Acknowledged.';
  const tx = userText.toLowerCase();
  if (a.status === 'waiting') {
    return `Got it — proceeding with that. I'll update you once I have something to show.`;
  }
  if (a.status === 'error') {
    if (tx.includes('retry') || tx.includes('again')) return 'Retrying now. I\'ll pause and ping you if it fails again.';
    return 'Understood. Should I retry with a longer backoff, or hand the task to another agent?';
  }
  if (a.status === 'review') {
    if (tx.includes('approve') || tx.includes('ship')) return 'Great — merging and closing the PR. Anything else for me?';
    if (tx.includes('reject') || tx.includes('redo')) return 'No problem, I\'ll revise. What specifically should change?';
    return 'Happy to revise. Which part should I focus on?';
  }
  if (tx.includes('stop') || tx.includes('pause')) return 'Pausing. I\'ll wait for your next instruction.';
  if (tx.includes('?')) return `Good question. Based on what I\'m seeing in ${a.repo}: the cleanest path is the one I\'m already on — let me know if you\'d like me to consider alternatives.`;
  return `Noted. I\'ll fold that into my current step (${a.step + 1}/${a.steps}) and report back.`;
}

window.App = App;
