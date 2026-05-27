/**
 * "+ New agent" modal + Timeline view.
 * Port of design-package/agent-dashboard/project/dashboard-modals.jsx.
 *
 * Phase 3 emits a mock Agent locally (handler in dashboard-app fills the meta
 * stubs). Phase 5 replaces this with a real `/api/spawn` call.
 */

'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { STATUS_META } from '@/lib/status-meta';
import type { Agent } from '@/lib/types';
import { Icon } from './dashboard-utils';

// ─── Templates ───────────────────────────────────────────────────────────────

interface Template {
  id: string;
  icon: string;
  title: string;
  desc: string;
  defaultModel: string;
}

const TEMPLATES: Template[] = [
  { id: 'tpl-feature',  icon: '✦', title: 'Build a feature',     desc: 'Plans, edits, tests, opens a PR.',         defaultModel: 'opus-4.5'   },
  { id: 'tpl-refactor', icon: '↻', title: 'Refactor / cleanup',  desc: 'Surgical edits with strong tests.',        defaultModel: 'opus-4.5'   },
  { id: 'tpl-bug',      icon: '☉', title: 'Reproduce & fix bug', desc: 'Repro test → root cause → minimal fix.',   defaultModel: 'opus-4.5'   },
  { id: 'tpl-review',   icon: '◐', title: 'Code review',         desc: 'Reviews open PRs, flags issues.',          defaultModel: 'sonnet-4.5' },
  { id: 'tpl-docs',     icon: '¶', title: 'Documentation pass',  desc: 'Updates README, code comments, API docs.', defaultModel: 'sonnet-4.5' },
  { id: 'tpl-deps',     icon: '◇', title: 'Dependency bump',     desc: 'Bumps deps, fixes breakages.',             defaultModel: 'haiku-4.5'  },
  { id: 'tpl-research', icon: '∿', title: 'Research / explore',  desc: 'Read repo, propose architecture.',         defaultModel: 'opus-4.5'   },
  { id: 'tpl-blank',    icon: '+', title: 'Blank',               desc: 'Start from scratch.',                      defaultModel: 'opus-4.5'   },
];

export interface NewAgentDraft {
  name: string;
  task: string;
  repo: string;
  branch: string;
  model: string;
  autoStart: boolean;
}

export interface NewAgentModalProps {
  onClose: () => void;
  onCreate: (draft: NewAgentDraft) => void;
}

const INPUT: CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--line-2)', background: 'var(--surface)',
  fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink)',
  outline: 'none', boxSizing: 'border-box',
};

const modalBtn = (primary: boolean): CSSProperties => ({
  padding: '8px 16px', borderRadius: 8,
  border: '1px solid ' + (primary ? 'var(--clay)' : 'var(--line-2)'),
  background: primary ? 'var(--clay)' : 'transparent',
  color: primary ? '#fff' : 'var(--ink-2)',
  fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
});

export function NewAgentModal({ onClose, onCreate }: NewAgentModalProps) {
  const [tpl, setTpl] = useState('tpl-feature');
  const [name, setName] = useState('');
  const [task, setTask] = useState('');
  const [repo, setRepo] = useState('acme/web');
  const [branch, setBranch] = useState('');
  const [model, setModel] = useState('opus-4.5');
  const [autoStart, setAutoStart] = useState(true);

  useEffect(() => {
    const t = TEMPLATES.find((x) => x.id === tpl);
    if (t) setModel(t.defaultModel);
  }, [tpl]);

  const canSubmit = !!(name.trim() && task.trim());

  const submit = () => {
    if (!canSubmit) return;
    onCreate({ name: name.trim(), task: task.trim(), repo, branch: branch.trim(), model, autoStart });
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 30,
        background: 'rgba(40,30,20,0.32)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 40, animation: 'fade-in .15s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Spawn a new agent"
        style={{
          width: 720, maxWidth: '100%', maxHeight: '92%',
          background: 'var(--surface)', borderRadius: 16,
          boxShadow: '0 30px 80px rgba(40,30,20,0.3)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'scale-in .2s cubic-bezier(.2,.7,.3,1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px', borderBottom: '1px solid var(--line)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--ink)', letterSpacing: -0.2 }}>
              Spawn a new agent
            </h2>
            <div style={{ marginTop: 3, fontSize: 12.5, color: 'var(--ink-3)' }}>
              Pick a template, give it a task, send it off.
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              border: '1px solid var(--line-2)', background: 'transparent',
              width: 30, height: 30, borderRadius: 8, cursor: 'pointer',
              color: 'var(--ink-3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="x" size={13} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          {/* Templates */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 22 }}>
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTpl(t.id)}
                style={{
                  padding: '14px 12px', textAlign: 'left', cursor: 'pointer',
                  border: '1px solid ' + (tpl === t.id ? 'var(--clay)' : 'var(--line)'),
                  background: tpl === t.id ? 'var(--clay-bg)' : 'var(--surface)',
                  borderRadius: 10, fontFamily: 'var(--sans)',
                  boxShadow: tpl === t.id ? '0 0 0 3px var(--clay-soft)' : 'none',
                  transition: 'all .12s',
                }}
              >
                <div
                  style={{
                    fontSize: 18, fontFamily: 'var(--serif)',
                    color: tpl === t.id ? 'var(--clay)' : 'var(--ink-2)',
                    marginBottom: 6,
                  }}
                >
                  {t.icon}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{t.title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.4 }}>{t.desc}</div>
              </button>
            ))}
          </div>

          {/* Form */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FormField label="Agent name" hint="lowercase, kebab-case">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. checkout-flow" style={INPUT} />
            </FormField>
            <FormField label="Model">
              <select value={model} onChange={(e) => setModel(e.target.value)} style={INPUT}>
                <option value="opus-4.5">opus-4.5 — most capable</option>
                <option value="sonnet-4.5">sonnet-4.5 — balanced</option>
                <option value="haiku-4.5">haiku-4.5 — fast &amp; cheap</option>
              </select>
            </FormField>
            <FormField label="Task / commission" full>
              <textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="Describe what this agent should accomplish…"
                style={{ ...INPUT, height: 80, resize: 'vertical', padding: '10px 12px', fontFamily: 'var(--sans)' }}
              />
            </FormField>
            <FormField label="Repository">
              <select value={repo} onChange={(e) => setRepo(e.target.value)} style={INPUT}>
                <option>acme/web</option>
                <option>acme/payments</option>
                <option>acme/auth</option>
                <option>acme/data</option>
                <option>acme/design-system</option>
              </select>
            </FormField>
            <FormField label="Branch" hint="leave blank to auto-create">
              <input
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="auto"
                style={{ ...INPUT, fontFamily: 'var(--mono)' }}
              />
            </FormField>
          </div>

          <div
            style={{
              marginTop: 18, padding: '12px 14px', borderRadius: 10,
              background: 'var(--surface-2)', border: '1px solid var(--line)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--ink-2)' }}>
              <input type="checkbox" checked={autoStart} onChange={(e) => setAutoStart(e.target.checked)} />
              Start immediately
            </label>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
              (otherwise it stays Idle and waits for you to kick it off)
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px', borderTop: '1px solid var(--line)',
            background: 'var(--surface-2)', display: 'flex', alignItems: 'center', gap: 10,
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
            Budget cap: <span className="mono tnum" style={{ color: 'var(--ink-2)' }}>$5.00</span>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={modalBtn(false)}>Cancel</button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            style={{ ...modalBtn(true), opacity: canSubmit ? 1 : 0.4 }}
          >
            Spawn agent
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, hint, full, children }: { label: string; hint?: string; full?: boolean; children: ReactNode }) {
  return (
    <div style={{ gridColumn: full ? 'span 2' : 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-2)' }}>{label}</span>
        {hint && <span style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// ─── Timeline view ───────────────────────────────────────────────────────────

const SPAN = 240;                                       // 4 hours visible (minutes)
const HOUR_LABELS = ['4h ago', '3h', '2h', '1h', 'now'];

function parseStarted(s: string): number | null {
  if (!s || s === '—') return null;
  if (s === 'just now') return 0;
  const h = parseInt((s.match(/(\d+)\s*h/) ?? ['', '0'])[1], 10) || 0;
  const m = parseInt((s.match(/(\d+)\s*m/) ?? ['', '0'])[1], 10) || 0;
  return h * 60 + m;
}

export interface TimelineViewProps {
  agents: Agent[];
  onOpen: (id: string) => void;
  selectedId: string | null;
}

export function TimelineView({ agents, onOpen, selectedId }: TimelineViewProps) {
  const items = agents.map((a) => ({ a, startedMin: parseStarted(a.started) }));
  const scheduled = items.filter((x) => x.startedMin == null);
  const active    = items.filter((x): x is { a: Agent; startedMin: number } => x.startedMin != null);

  return (
    <div style={{ padding: '20px 28px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Last 4 hours</h3>
        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
          {active.length} agents on the wire · {scheduled.length} scheduled
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', marginBottom: 8 }}>
        <div />
        <div style={{ position: 'relative', height: 18, borderBottom: '1px solid var(--line-2)' }}>
          {HOUR_LABELS.map((lab, i) => (
            <div
              key={i}
              className="mono"
              style={{
                position: 'absolute', left: `${(i / 4) * 100}%`,
                top: 0, transform: 'translateX(-50%)',
                fontSize: 11, color: 'var(--ink-4)',
              }}
            >
              {lab}
            </div>
          ))}
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                position: 'absolute', left: `${(i / 4) * 100}%`, top: 14,
                width: 1, bottom: -8, background: 'var(--line)',
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {active.map(({ a, startedMin }) => (
          <TimelineRow
            key={a.id}
            a={a}
            startedMin={startedMin}
            onOpen={() => onOpen(a.id)}
            selected={a.id === selectedId}
          />
        ))}
      </div>

      {scheduled.length > 0 && (
        <>
          <div style={{ marginTop: 24, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>Scheduled / idle</h3>
            <span style={{ flex: 1, height: 1, background: 'var(--line-2)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {scheduled.map(({ a }) => (
              <div
                key={a.id}
                onClick={() => onOpen(a.id)}
                style={{
                  padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                  background: 'var(--surface)', border: '1px solid var(--line)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--ink-4)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{a.last}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface TimelineRowProps {
  a: Agent;
  startedMin: number;
  onOpen: (e: MouseEvent) => void;
  selected: boolean;
}

export function TimelineRow({ a, startedMin, onOpen, selected }: TimelineRowProps) {
  const s = STATUS_META[a.status];
  const leftPct = Math.max(0, Math.min(100, ((SPAN - startedMin) / SPAN) * 100));
  const widthPct = Math.max(2, 100 - leftPct);

  return (
    <div
      onClick={onOpen}
      style={{
        display: 'grid', gridTemplateColumns: '180px 1fr',
        alignItems: 'center', gap: 0, padding: '4px 0',
        cursor: 'pointer', borderRadius: 6,
        background: selected ? 'var(--clay-bg)' : 'transparent',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 12, minWidth: 0 }}>
        <span style={{ width: 6, height: 6, borderRadius: 3, background: s.fg, flex: '0 0 auto' }} />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600, fontSize: 12.5, color: 'var(--ink)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}
          >
            {a.name}
          </div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-4)' }}>{a.id}</div>
        </div>
      </div>

      <div style={{ position: 'relative', height: 28 }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{ position: 'absolute', left: `${(i / 4) * 100}%`, top: 0, bottom: 0, width: 1, background: 'var(--line)' }}
          />
        ))}

        <div
          style={{
            position: 'absolute',
            left: `${leftPct}%`, width: `${widthPct}%`, top: 4, bottom: 4,
            background: s.bg, borderRadius: 4,
            borderLeft: `3px solid ${s.fg}`,
            display: 'flex', alignItems: 'center', paddingLeft: 8, gap: 8,
            overflow: 'hidden',
          }}
        >
          <span
            style={{
              fontSize: 11, color: 'var(--ink-2)', fontWeight: 500,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}
          >
            {a.task}
          </span>
        </div>

        {a.status === 'running' && (
          <span
            style={{
              position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)',
              width: 9, height: 9, borderRadius: 5, background: s.fg,
              boxShadow: `0 0 0 4px ${s.bg}`,
            }}
          />
        )}
      </div>
    </div>
  );
}
