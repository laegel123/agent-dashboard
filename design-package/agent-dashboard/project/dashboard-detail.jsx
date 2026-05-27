// Slide-in detail drawer with tabs: Stream, Files, Chat, Settings.

const { Icon: DIcon, StatusDot: DStatusDot, fmtTok: DfmtTok, fmt$: Dfmt$ } = window.DashUtils;

// Mock per-agent stream (steps + log lines)
function streamFor(a) {
  const stepNames = {
    'refactor-api':     ['Read service tree', 'Identify shared helpers', 'Plan handler split', 'Extract handlers', 'Update imports', 'Run typecheck', 'Run tests'],
    'test-coverage':    ['Inspect /checkout route', 'List edge cases', 'Write happy-path tests', 'Cover declined-card', 'Run with --coverage'],
    'docs-update':      ['Skim repo', 'Outline sections', 'Rewrite intro', 'Regen API tables', 'Final pass'],
    'bug-triage':       ['Fetch open issues', 'Cluster by component', 'Draft summary'],
    'ui-polish':        ['Open Figma spec', 'Compare to current', 'Diff list', 'Apply spacing tokens', 'Wire animations', 'Capture before/after'],
    'perf-audit':       ['Capture profile', 'Identify hot paths', 'Propose fix', 'Validate'],
    'migrate-ts':       ['List remaining .js', 'Convert modules', 'Add types', 'Resolve any', 'Validate', 'Validate', 'Run tests', 'Run e2e', 'Open PR', 'Address review', 'Merge prep', 'Stage', 'Stage', 'Final'],
    'security-review':  ['Walk auth/', 'Run static analyzer', 'Test rate-limits', 'Cross-ref OWASP', 'Write report'],
    'feature-search':   ['Spec from notion', 'Sketch UX', 'Backend index', 'Frontend panel', 'Keybindings', 'Tests', 'Polish', 'PR'],
    'a11y-pass':        ['List form components', 'Add aria labels', 'Add roles', 'Run axe', 'Visual regression'],
    'analytics-events': ['Audit existing', 'Plan additions', 'Add wrappers', 'Backfill', 'Validate', 'Document'],
  };
  const names = stepNames[a.name] || Array.from({ length: a.steps }, (_, i) => `Step ${i + 1}`);
  return names.slice(0, a.steps).map((n, i) => ({
    name: n,
    state: i < a.step ? 'done' : i === a.step ? (a.status === 'running' ? 'running' : a.status === 'error' ? 'failed' : a.status === 'waiting' ? 'paused' : a.status === 'review' ? 'done' : 'pending') : 'pending',
  }));
}

function logsFor(a) {
  // 4-7 mock log lines per agent
  const banks = {
    running: [
      '$ pnpm tsc --noEmit',
      '✓ no type errors (1.2s)',
      'reading src/services/payment/handlers/*.ts',
      'extracted 4 handlers into ./handlers/',
      'updating 12 imports across the repo',
      '› ' + a.last,
    ],
    review: [
      'diff ready · 19 files',
      'tests passing · 312 passed · 0 failed',
      'awaiting human review on PR description',
      '› ' + a.last,
    ],
    error: [
      'tool: snyk_scan',
      'response: 429 too many requests',
      'retry policy: backoff 30s · attempt 3/3',
      '✗ giving up — needs manual intervention',
      '› ' + a.last,
    ],
    waiting: [
      'paused: question raised',
      'question: ' + a.last,
      '— awaiting your reply —',
    ],
    idle: [
      'last run completed at 11:42',
      'next scheduled run: ' + a.last,
    ],
  };
  return banks[a.status] || [a.last];
}

function filesFor(a) {
  if (!a.edited) return [];
  const repo = a.repo.split('/')[1] || 'repo';
  const samples = {
    'refactor-api':  ['src/services/payment/handlers/charge.ts (+128 -42)', 'src/services/payment/handlers/refund.ts (+89 -31)', 'src/services/payment/handlers/dispute.ts (+76 -28)', 'src/services/payment/index.ts (+12 -180)', 'src/lib/payments.ts (+24 -6)', 'tests/payment/charge.test.ts (+44 -0)', 'tests/payment/index.test.ts (+0 -52)'],
    'feature-search':['apps/web/components/CmdK.tsx (+412 -0)', 'apps/web/components/CmdK.module.css (+118 -0)', 'apps/web/hooks/useSearch.ts (+96 -0)', 'apps/web/lib/searchIndex.ts (+204 -0)', 'apps/web/pages/_app.tsx (+8 -2)'],
    'migrate-ts':    ['src/utils/format.ts (+62 -58 was .js)', 'src/utils/dates.ts (+44 -41 was .js)', 'src/components/Feed.tsx (+88 -80 was .jsx)', 'src/components/Sidebar.tsx (+72 -65 was .jsx)', '... 34 more'],
    'a11y-pass':     ['components/forms/Input.tsx (+12 -2)', 'components/forms/Select.tsx (+18 -3)', 'components/forms/Checkbox.tsx (+14 -1)', 'components/forms/Radio.tsx (+11 -2)', 'components/forms/TextArea.tsx (+9 -1)'],
  };
  const list = samples[a.name];
  if (list) return list;
  return Array.from({ length: Math.min(a.edited, 5) }, (_, i) => `${repo}/file-${i + 1}.ts (+${Math.floor(Math.random() * 60 + 10)} -${Math.floor(Math.random() * 30)})`);
}

function initialChat(a) {
  if (a.status === 'waiting') return [
    { role: 'agent', text: 'I want to start, but I need a clarification first.' },
    { role: 'agent', text: a.last },
  ];
  if (a.status === 'review') return [
    { role: 'agent', text: `I'm done with "${a.task}". ${a.last}` },
  ];
  if (a.status === 'error') return [
    { role: 'agent', text: `Hit an error: ${a.last}` },
    { role: 'agent', text: 'I can retry once the rate limit clears, or you can grant elevated access.' },
  ];
  if (a.status === 'running') return [
    { role: 'agent', text: `Working on "${a.task}". Currently: ${a.last}` },
  ];
  return [
    { role: 'agent', text: `Idle. Last activity: ${a.last}` },
  ];
}

function DetailDrawer({ agent, onClose, onAction, chats, onChatSend }) {
  const [tab, setTab] = React.useState('stream');
  const [draft, setDraft] = React.useState('');
  const chatRef = React.useRef(null);

  React.useEffect(() => {
    setTab('stream');
    setDraft('');
  }, [agent && agent.id]);

  React.useEffect(() => {
    if (tab === 'chat' && chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [tab, chats]);

  if (!agent) return null;
  const s = window.STATUS_META[agent.status];
  const stream = streamFor(agent);
  const logs = logsFor(agent);
  const files = filesFor(agent);
  const msgs = chats[agent.id] || initialChat(agent);

  const send = () => {
    const v = draft.trim();
    if (!v) return;
    onChatSend(agent.id, v);
    setDraft('');
  };

  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(40,30,20,0.18)',
        backdropFilter: 'blur(2px)', zIndex: 20,
        animation: 'fade-in .15s ease-out',
      }} />
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 560,
        background: 'var(--surface)', borderLeft: '1px solid var(--line-2)',
        boxShadow: '-20px 0 60px rgba(40,30,20,0.12)',
        zIndex: 21, display: 'flex', flexDirection: 'column',
        animation: 'slide-in .22s cubic-bezier(.2,.7,.3,1)',
      }}>
        {/* Top */}
        <div style={{ height: 3, background: s.fg, opacity: agent.status === 'idle' ? 0.3 : 1 }} />
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                <DStatusDot status={agent.status} size={9} />
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: 'var(--ink)', letterSpacing: -0.3 }}>
                  {agent.name}
                </h2>
                <span style={{
                  fontSize: 10.5, padding: '3px 8px', borderRadius: 999,
                  background: s.bg, color: s.fg, fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: 0.6,
                }} className="mono">{s.label}</span>
              </div>
              <div className="mono" style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                {agent.id} · {agent.model} · {agent.repo} · {agent.branch}
              </div>
            </div>
            <button onClick={onClose} style={{
              border: '1px solid var(--line-2)', background: 'transparent',
              width: 30, height: 30, borderRadius: 8, cursor: 'pointer',
              color: 'var(--ink-3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><DIcon name="x" size={13} /></button>
          </div>

          <div style={{
            marginTop: 14, padding: '10px 12px', borderRadius: 10,
            background: 'var(--surface-2)', display: 'flex', gap: 18, alignItems: 'center',
          }}>
            <Stat label="step" value={`${agent.step}/${agent.steps}`} />
            <Stat label="tokens" value={DfmtTok(agent.tokens)} />
            <Stat label="cost" value={Dfmt$(agent.cost)} />
            <Stat label="files" value={agent.edited} />
            <Stat label="started" value={agent.started} />
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 0, padding: '0 22px',
          borderBottom: '1px solid var(--line)', background: 'var(--surface)',
        }}>
          {[
            { k: 'stream', label: 'Stream' },
            { k: 'files',  label: `Files · ${agent.edited}` },
            { k: 'chat',   label: 'Chat' },
            { k: 'settings', label: 'Settings' },
          ].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} style={{
              padding: '11px 14px', border: 'none', background: 'transparent',
              borderBottom: '2px solid ' + (tab === t.k ? 'var(--clay)' : 'transparent'),
              color: tab === t.k ? 'var(--ink)' : 'var(--ink-3)',
              fontFamily: 'var(--sans)', fontSize: 13, fontWeight: tab === t.k ? 600 : 500,
              cursor: 'pointer', marginBottom: -1,
            }}>{t.label}</button>
          ))}
        </div>

        {/* Tab bodies */}
        <div style={{ flex: 1, overflow: 'auto', background: 'var(--surface)' }}>
          {tab === 'stream' && <StreamTab agent={agent} stream={stream} logs={logs} />}
          {tab === 'files' && <FilesTab agent={agent} files={files} />}
          {tab === 'chat' && (
            <ChatTab chatRef={chatRef} msgs={msgs} draft={draft} setDraft={setDraft} send={send} />
          )}
          {tab === 'settings' && <SettingsTab agent={agent} />}
        </div>

        {/* Footer actions */}
        <div style={{
          padding: '12px 22px', borderTop: '1px solid var(--line)',
          background: 'var(--surface-2)', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <button onClick={() => onAction(agent.id, 'stop')} style={drawerBtn(false, true)}>Stop</button>
          <div style={{ flex: 1 }} />
          {agent.status === 'review' && (
            <>
              <button onClick={() => onAction(agent.id, 'reject')} style={drawerBtn(false)}>Reject</button>
              <button onClick={() => onAction(agent.id, 'approve')} style={drawerBtn(true)}>Approve & merge</button>
            </>
          )}
          {agent.status === 'error' && (
            <>
              <button onClick={() => onAction(agent.id, 'open')} style={drawerBtn(false)}>Open logs</button>
              <button onClick={() => onAction(agent.id, 'retry')} style={drawerBtn(true)}>Retry</button>
            </>
          )}
          {agent.status === 'running' && (
            <>
              <button onClick={() => onAction(agent.id, 'pause')} style={drawerBtn(false)}>Pause</button>
              <button onClick={() => { setTab('chat'); }} style={drawerBtn(true)}>Interrupt & chat</button>
            </>
          )}
          {agent.status === 'waiting' && (
            <button onClick={() => setTab('chat')} style={drawerBtn(true)}>Answer question</button>
          )}
          {agent.status === 'idle' && (
            <button onClick={() => onAction(agent.id, 'start')} style={drawerBtn(true)}>Start now</button>
          )}
        </div>
      </div>
    </>
  );
}

const Stat = ({ label, value }) => (
  <div>
    <div className="mono" style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</div>
    <div className="tnum" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', marginTop: 2 }}>{value}</div>
  </div>
);

const drawerBtn = (primary, danger) => ({
  padding: '7px 14px', borderRadius: 8,
  border: '1px solid ' + (primary ? 'var(--clay)' : danger ? 'var(--line-2)' : 'var(--line-2)'),
  background: primary ? 'var(--clay)' : 'transparent',
  color: primary ? '#fff' : danger ? 'var(--error)' : 'var(--ink-2)',
  fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
});

function StreamTab({ agent, stream, logs }) {
  return (
    <div style={{ padding: '20px 22px' }}>
      <h4 style={sectionHd}>Plan</h4>
      <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {stream.map((st, i) => <StreamStep key={i} idx={i} step={st} />)}
      </ol>

      <h4 style={{ ...sectionHd, marginTop: 22 }}>Latest log</h4>
      <pre style={{
        margin: 0, padding: '12px 14px', background: '#231f17', borderRadius: 8,
        color: '#e8e0cc', fontFamily: 'var(--mono)', fontSize: 11.5, lineHeight: 1.65,
        overflow: 'auto', whiteSpace: 'pre-wrap',
      }}>
        {logs.map((l, i) => {
          const isOk = l.startsWith('✓');
          const isErr = l.startsWith('✗');
          const isCmd = l.startsWith('$');
          const isPipe = l.startsWith('›') || l.startsWith('—');
          return <div key={i} style={{
            color: isOk ? '#a8c87c' : isErr ? '#e08a78' : isCmd ? '#d9b56e' : isPipe ? '#cdc6ad' : '#a89d7c',
          }}>{l}</div>;
        })}
      </pre>
    </div>
  );
}

function StreamStep({ idx, step }) {
  const dotColor = {
    done: 'var(--running)', running: 'var(--running)',
    failed: 'var(--error)', paused: 'var(--waiting)', pending: 'var(--ink-5)',
  }[step.state];
  const isCurrent = step.state === 'running' || step.state === 'failed' || step.state === 'paused';
  return (
    <li style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 10px', borderRadius: 8,
      background: isCurrent ? 'var(--surface-2)' : 'transparent',
      border: isCurrent ? '1px solid var(--line)' : '1px solid transparent',
    }}>
      <span style={{
        width: 16, height: 16, borderRadius: 8,
        background: step.state === 'pending' ? 'transparent' : dotColor,
        border: '1.5px solid ' + dotColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
      }}>
        {step.state === 'done' && <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6.5l2.5 2.5L10 3.5"/></svg>}
        {step.state === 'running' && <span style={{ width: 6, height: 6, borderRadius: 3, background: '#fff' }} />}
        {step.state === 'failed' && <svg width="7" height="7" viewBox="0 0 8 8" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M1 1l6 6M7 1L1 7"/></svg>}
      </span>
      <span className="tnum" style={{ fontSize: 11, color: 'var(--ink-4)', width: 18 }}>{String(idx + 1).padStart(2, '0')}</span>
      <span style={{
        fontSize: 13, color: step.state === 'pending' ? 'var(--ink-4)' : 'var(--ink-2)',
        fontWeight: isCurrent ? 500 : 400,
      }}>{step.name}</span>
    </li>
  );
}

function FilesTab({ agent, files }) {
  if (!files.length) return (
    <div style={{ padding: '40px 22px', textAlign: 'center', color: 'var(--ink-4)' }}>
      No files edited yet.
    </div>
  );
  return (
    <div style={{ padding: '14px 22px' }}>
      {files.map((f, i) => {
        const m = f.match(/^(.+?)\s*\(\+(\d+)\s*-(\d+)/);
        const path = m ? m[1] : f;
        const adds = m ? parseInt(m[2]) : null;
        const dels = m ? parseInt(m[3]) : null;
        return (
          <div key={i} style={{
            padding: '10px 12px', borderRadius: 8,
            display: 'flex', alignItems: 'center', gap: 10,
            background: i % 2 ? 'transparent' : 'var(--surface-2)',
          }}>
            <DIcon name="file" size={13} />
            <span className="mono" style={{ fontSize: 12, color: 'var(--ink-2)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{path}</span>
            {adds != null && (
              <>
                <span className="mono tnum" style={{ fontSize: 11, color: 'var(--running)', fontWeight: 600 }}>+{adds}</span>
                <span className="mono tnum" style={{ fontSize: 11, color: 'var(--error)', fontWeight: 600 }}>-{dels}</span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ChatTab({ chatRef, msgs, draft, setDraft, send }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div ref={chatRef} style={{ flex: 1, overflow: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {msgs.map((m, i) => <ChatBubble key={i} m={m} />)}
      </div>
      <div style={{ padding: '12px 18px 14px', borderTop: '1px solid var(--line)', background: 'var(--surface-2)' }}>
        <div style={{
          display: 'flex', gap: 8, alignItems: 'flex-end',
          padding: '8px 10px', borderRadius: 10,
          background: 'var(--surface)', border: '1px solid var(--line-2)',
        }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Reply, guide, or interrupt the agent…"
            style={{
              flex: 1, border: 'none', background: 'transparent', resize: 'none',
              fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink)',
              outline: 'none', minHeight: 22, maxHeight: 100, padding: 4,
            }}
            rows={1}
          />
          <button onClick={send} disabled={!draft.trim()} style={{
            padding: '6px 14px', borderRadius: 7, border: 'none',
            background: draft.trim() ? 'var(--clay)' : 'var(--line-2)',
            color: '#fff', fontSize: 12, fontWeight: 500,
            cursor: draft.trim() ? 'pointer' : 'default', fontFamily: 'var(--sans)',
          }}>Send</button>
        </div>
        <div style={{ marginTop: 6, fontSize: 10.5, color: 'var(--ink-4)', display: 'flex', gap: 12 }}>
          <span>Enter to send · Shift+Enter for newline</span>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ m }) {
  const isUser = m.role === 'user';
  return (
    <div style={{
      alignSelf: isUser ? 'flex-end' : 'flex-start',
      maxWidth: '85%',
      padding: '8px 12px', borderRadius: 12,
      background: isUser ? 'var(--clay)' : 'var(--surface-2)',
      color: isUser ? '#fff' : 'var(--ink-2)',
      fontSize: 13, lineHeight: 1.5,
      borderBottomRightRadius: isUser ? 4 : 12,
      borderBottomLeftRadius: isUser ? 12 : 4,
      whiteSpace: 'pre-wrap',
    }}>{m.text}</div>
  );
}

function SettingsTab({ agent }) {
  return (
    <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Field label="Display name" value={agent.name} />
      <Field label="Model" value={agent.model} />
      <Field label="Repo" value={agent.repo} />
      <Field label="Branch" value={agent.branch} />
      <div>
        <div style={sectionHd}>System prompt</div>
        <pre style={{
          margin: '8px 0 0', padding: '12px 14px',
          background: 'var(--surface-2)', border: '1px solid var(--line)',
          borderRadius: 8, fontFamily: 'var(--mono)', fontSize: 11.5,
          color: 'var(--ink-2)', lineHeight: 1.55, whiteSpace: 'pre-wrap',
        }}>{`You are ${agent.name}, a focused engineering agent.
Your current commission: "${agent.task}".

Operating rules:
  · Edit files in ${agent.repo} on branch \`${agent.branch}\`.
  · Run tests after every change set.
  · Pause and ask Jamie when a non-obvious decision arises.
  · Prefer small commits with clear messages.`}</pre>
      </div>
      <div>
        <div style={sectionHd}>Tools</div>
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['bash', 'fs.read', 'fs.write', 'git', 'github', 'pnpm', 'pytest', 'node'].map(t => (
            <span key={t} className="mono" style={{
              fontSize: 11, padding: '3px 8px', borderRadius: 6,
              background: 'var(--surface-2)', border: '1px solid var(--line-2)', color: 'var(--ink-2)',
            }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div style={sectionHd}>{label}</div>
      <div style={{
        marginTop: 6, padding: '8px 12px',
        background: 'var(--surface-2)', border: '1px solid var(--line)',
        borderRadius: 8, fontSize: 13, color: 'var(--ink)',
        fontFamily: label === 'Repo' || label === 'Branch' || label === 'Model' ? 'var(--mono)' : 'var(--sans)',
      }}>{value}</div>
    </div>
  );
}

const sectionHd = {
  fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase',
  letterSpacing: 0.8, fontWeight: 600, fontFamily: 'var(--mono)',
  margin: '0 0 8px',
};

window.DetailDrawer = DetailDrawer;
