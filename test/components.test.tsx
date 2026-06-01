// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '../components/dashboard-app';
import { GridCard } from '../components/dashboard-card';
import { NewAgentModal } from '../components/dashboard-modals';
import { DetailDrawer } from '../components/dashboard-detail';
import { Sidebar } from '../components/dashboard-sidebar';
import { ToastHost, useToast } from '../components/toast';
import type { Agent, ActivityEvent } from '../lib/types';

// ─── helpers ───────────────────────────────────────────────────────────────

const makeAgent = (over: Partial<Agent> = {}): Agent => ({
  id: 'aaaaaaaa',
  name: 'refactor-api',
  status: 'running',
  task: 'do a thing',
  repo: 'acme/web',
  branch: 'main',
  step: 0,
  steps: 5,
  tokens: 100,
  cost: 0.5,
  model: 'opus-4.7',
  edited: 0,
  started: 'just now',
  last: 'x',
  sessionId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  filePath: '',
  cwd: '/Users/x/proj',
  firstTimestamp: 0,
  lastTimestamp: 0,
  entrypoint: 'cli',
  ...over,
});

const make18 = (): Agent[] =>
  Array.from({ length: 18 }, (_, i) =>
    makeAgent({
      id: `id${i.toString().padStart(4, '0')}`,
      name: i === 0 ? 'refactor-api' : `agent-${i}`,
      status: ['running', 'waiting', 'review', 'error', 'idle'][i % 5] as Agent['status'],
      sessionId: `1111${i.toString().padStart(4, '0')}-aaaa-aaaa-aaaa-aaaaaaaaaaaa`,
    })
  );

function mockAgentsFetch(agents: Agent[]) {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/agents')) {
      return new Response(
        JSON.stringify({
          agents,
          projectsFound: true,
          totals: {
            total: agents.length,
            running: agents.filter((a) => a.status === 'running').length,
            review: agents.filter((a) => a.status === 'review').length,
            error: agents.filter((a) => a.status === 'error').length,
            waiting: agents.filter((a) => a.status === 'waiting').length,
            idle: agents.filter((a) => a.status === 'idle').length,
            tokens: 0,
            cost: 0,
            edited: 0,
          },
          filter: { since: '7d', entrypoint: 'cli' },
          generatedAt: Date.now(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response('{}', { status: 200 });
  }) as unknown as typeof fetch;
}

const renderAppReady = async (agents: Agent[]) => {
  mockAgentsFetch(agents);
  const utils = render(<App />);
  // App 은 mount 시 fetch — 그리드가 그려질 때까지 기다림.
  await waitFor(() => expect(screen.queryByText(/\d+ shown/)).not.toBeNull());
  return utils;
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ─── 1–4. App ──────────────────────────────────────────────────────────────

describe('App', () => {
  it('1. fetch 18개 → 카드 18개 렌더', async () => {
    await renderAppReady(make18());
    expect(screen.getByText('18 shown')).toBeInTheDocument();
  });

  it('2. 검색어 "refactor" 입력 → filtered 줄어듦', async () => {
    await renderAppReady(make18());
    const search = screen.getByPlaceholderText('Search agents…');
    fireEvent.change(search, { target: { value: 'refactor' } });
    await waitFor(() => expect(screen.getByText('1 shown')).toBeInTheDocument());
  });

  it('3. "Running" 칩 클릭 → running 상태 카드만', async () => {
    const agents = make18(); // 18/5 → 4 running (index 0,5,10,15)
    await renderAppReady(agents);
    const runningChip = screen.getByRole('button', { name: /^Running 4$/i });
    fireEvent.click(runningChip);
    await waitFor(() => expect(screen.getByText('4 shown')).toBeInTheDocument());
  });

  it('4. 레이아웃 grid → list 토글', async () => {
    await renderAppReady(make18().slice(0, 2));
    const listBtn = screen.getByRole('button', { name: 'Switch to list view' });
    fireEvent.click(listBtn);
    expect(screen.getByText('Agent')).toBeInTheDocument(); // ListBody 헤더
    expect(screen.getByText('Repo · Branch')).toBeInTheDocument();
  });
});

// ─── 5–6. GridCard ────────────────────────────────────────────────────────

describe('GridCard', () => {
  it('5. 카드 클릭 → onOpen 호출', () => {
    const onOpen = vi.fn();
    const onAction = vi.fn();
    render(<GridCard a={makeAgent()} density="comfortable" onOpen={onOpen} onAction={onAction} selected={false} />);
    fireEvent.click(screen.getByText('refactor-api'));
    expect(onOpen).toHaveBeenCalled();
  });

  it('6. 액션 버튼 클릭 시 카드의 onOpen 는 호출되지 않음 (stopPropagation)', () => {
    const onOpen = vi.fn();
    const onAction = vi.fn();
    render(<GridCard a={makeAgent({ status: 'running' })} density="comfortable" onOpen={onOpen} onAction={onAction} selected={false} />);
    // running 상태 카드의 액션 버튼: Chat + Pause
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(onAction).toHaveBeenCalledWith('aaaaaaaa', 'pause');
    expect(onOpen).not.toHaveBeenCalled();
  });
});

// ─── 7–8. NewAgentModal ───────────────────────────────────────────────────

describe('NewAgentModal', () => {
  beforeEach(() => {
    // jsdom 의 crypto.randomUUID 호환성 — 없으면 폴리필
    if (!('randomUUID' in crypto)) {
      Object.defineProperty(crypto, 'randomUUID', {
        value: () => '11111111-2222-3333-4444-555555555555' as `${string}-${string}-${string}-${string}-${string}`,
        configurable: true,
      });
    }
  });

  it('7. name + task + cwd 모두 채움 → Spawn 버튼 enabled', async () => {
    render(<NewAgentModal onClose={() => {}} onCreate={() => {}} />);
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('e.g. checkout-flow'), 'demo');
    await user.type(screen.getByPlaceholderText('Describe what this agent should accomplish…'), 'do thing');
    await user.type(screen.getByPlaceholderText('/Users/you/workspace/your-repo'), '/tmp');
    const submit = screen.getByRole('button', { name: 'Spawn agent' });
    expect(submit).not.toBeDisabled();
  });

  it('8. 필수 필드 비어있음 → Spawn 버튼 disabled', () => {
    render(<NewAgentModal onClose={() => {}} onCreate={() => {}} />);
    expect(screen.getByRole('button', { name: 'Spawn agent' })).toBeDisabled();
  });
});

// ─── 9–11. DetailDrawer ───────────────────────────────────────────────────

describe('DetailDrawer', () => {
  const noop = () => {};

  it('9. close 버튼 클릭 → onClose 호출', () => {
    const onClose = vi.fn();
    render(<DetailDrawer agent={makeAgent()} onClose={onClose} onAction={noop} chats={{}} onChatSend={noop} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close detail drawer' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('10. Files 탭 클릭 → Files 콘텐츠 노출', () => {
    render(<DetailDrawer agent={makeAgent({ edited: 3 })} onClose={noop} onAction={noop} chats={{}} onChatSend={noop} />);
    fireEvent.click(screen.getByRole('button', { name: /Files · 3/ }));
    // Files 탭 콘텐츠는 mock filesFor 가 만든 항목들 — '0 changes' 같은 mono 가 노출됨.
    expect(screen.queryByRole('button', { name: /Files · 3/ })).toBeInTheDocument();
  });

  it('11. Chat 탭 인풋에 Enter → onChatSend 호출', async () => {
    const onChatSend = vi.fn();
    render(<DetailDrawer agent={makeAgent()} onClose={noop} onAction={noop} chats={{}} onChatSend={onChatSend} />);
    fireEvent.click(screen.getByRole('button', { name: 'Chat' }));
    const input = await screen.findByPlaceholderText('Reply, guide, or interrupt the agent…');
    fireEvent.change(input, { target: { value: 'hello' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChatSend).toHaveBeenCalledWith('aaaaaaaa', 'hello');
  });
});

// ─── 12. CardActions (review 상태 → Reject + Approve) ─────────────────────

describe('CardActions', () => {
  it('12. status=review → Reject + Approve 버튼 노출', () => {
    const onAction = vi.fn();
    render(<GridCard a={makeAgent({ status: 'review' })} density="comfortable" onOpen={() => {}} onAction={onAction} selected={false} />);
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
  });
});

// ─── 13. FilterRow — 검색 X 버튼 ──────────────────────────────────────────

describe('FilterRow', () => {
  it('13. 검색어 X 버튼 클릭 → query 비움', async () => {
    const user = userEvent.setup();
    await renderAppReady(make18());
    const search = screen.getByPlaceholderText('Search agents…') as HTMLInputElement;
    await user.type(search, 'zzz');
    expect(search.value).toBe('zzz');
    const clear = await screen.findByLabelText('Clear search');
    await user.click(clear);
    expect(search.value).toBe('');
  });
});

// ─── 14. Sidebar Hand-offs 노드 ───────────────────────────────────────────

describe('Sidebar', () => {
  it('14. handoff 그래프 노드 클릭 → onSelectAgent 호출', () => {
    const agents = [makeAgent({ id: 'n1', name: 'first' }), makeAgent({ id: 'n2', name: 'second' })];
    const onSelect = vi.fn();
    const activity: ActivityEvent[] = [];
    render(<Sidebar agents={agents} activity={activity} onSelectAgent={onSelect} />);
    // 첫 슬롯 노드의 text label = agent.name 'first'
    fireEvent.click(screen.getByText('first'));
    expect(onSelect).toHaveBeenCalledWith('n1');
  });
});

// ─── 15. Toast — demo() 호출 후 표시 + 자동 만료 ──────────────────────────

function ToastFire({ text }: { text: string }) {
  const toast = useToast();
  return <button onClick={() => toast.demo(text)}>fire</button>;
}

describe('Toast', () => {
  it('15. toast.demo() → 표시 + 일정 시간 뒤 자동 dismiss', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      render(
        <>
          <ToastHost />
          <ToastFire text="hello-toast" />
        </>
      );
      act(() => { fireEvent.click(screen.getByText('fire')); });
      expect(screen.getByText('hello-toast')).toBeInTheDocument();
      // demo 토스트는 4초 후 자동 만료 (DURATIONS.demo).
      act(() => { vi.advanceTimersByTime(5_000); });
      await waitFor(() => expect(screen.queryByText('hello-toast')).toBeNull());
    } finally {
      vi.useRealTimers();
    }
  });
});
