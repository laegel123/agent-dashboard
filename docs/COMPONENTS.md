# 컴포넌트 가이드

디자인 원본의 6개 JSX 파일을 Next.js TSX 로 어떻게 이식할지 정리. 각 파일별 책임·내부 컴포넌트·받는 props·이식 시 주의점.

> 원본 위치: `design-package/agent-dashboard/project/`
> 목표 위치: `components/`

---

## 컴포넌트 트리 한눈에

```
<App>                                       ← dashboard-app.tsx
├── <TopBar />                              인사말 + 통계 + "+ New agent"
├── <FilterRow />                           상태 필터 칩 + 검색 + 레이아웃 토글
├── (메인 영역)
│   ├── <GridBody>                          layout === 'grid'
│   │   └── <GridCard /> × N                ← dashboard-card.tsx
│   │       └── <CardActions />
│   ├── <ListBody>                          layout === 'list'
│   │   └── <ListRow /> × N
│   └── <TimelineView />                    layout === 'timeline'  ← dashboard-modals.tsx
│       └── <TimelineRow /> × N
├── <Sidebar />  (showSidebar 시)           ← dashboard-sidebar.tsx
│   ├── <CollabGraphWarm />                 6노드 hand-off SVG
│   └── <ActivityFeedWarm />                실시간 활동 피드
├── <DetailDrawer>  (selectedId 시)         ← dashboard-detail.tsx
│   ├── (헤더 = name + 모델 + repo + branch + 5 stats)
│   ├── (탭 4개)
│   │   ├── <StreamTab />                   plan 체크리스트 + 다크 콘솔
│   │   ├── <FilesTab />                    편집 파일 목록
│   │   ├── <ChatTab />                     ChatBubble × N + 인풋
│   │   └── <SettingsTab />                 Field × 4 + 시스템 프롬프트 + Tools
│   └── (푸터 = 상태별 액션 버튼)
├── <NewAgentModal /> (newAgentOpen 시)    ← dashboard-modals.tsx
│   ├── (템플릿 그리드 × 8)
│   └── (폼 + Budget cap + Cancel/Spawn)
└── <TweaksPanel>  (우측 하단 토글)         ← tweaks-panel.tsx
    ├── <TweakRadio /> Layout
    ├── <TweakRadio /> Density
    ├── <TweakToggle /> Sidebar
    └── <TweakColor /> Accent
```

---

## 1. `components/dashboard-utils.tsx`

> 원본: `dashboard-utils.jsx` (45줄)

### 책임
순수 유틸 + 디자인 시그니처 UI 요소.

### Export
```typescript
export function fmtTok(n: number): string;          // 184500 → '184k', 1200 → '1.2k', 800 → '800'
export function fmt$(n: number): string;            // 2.71 → '$2.71'

export function Icon(props: {
  name: 'pause' | 'play' | 'check' | 'x' | 'retry' | 'chat' | 'search'
      | 'plus' | 'branch' | 'gear' | 'dots' | 'arrow' | 'file' | 'bolt';
  size?: number;
}): JSX.Element;

export function StatusDot(props: { status: Status; size?: number }): JSX.Element;
```

> **`STATUS_META` 는 여기 두지 않고 [`lib/status-meta.ts`](#)** — 서버 API 응답에서도 label 을 쓸 수 있게 별도 lib 로 분리.
> `dashboard-utils.tsx` 는 `import { STATUS_META } from '@/lib/status-meta'`.

### 이식 주의
- 원본은 `window.DashUtils = (() => {...})()` IIFE → TSX 에선 단순 export 함수
- `Icon` 내부의 SVG path 들 (paths 오브젝트) 그대로 복붙
- `StatusDot` 의 pulse 애니메이션 (`animation: 'pulse-dot 2.2s ease-out infinite'`) 은 **`status === 'running'` 일 때만** — 그리고 ADR-013 v2 에 의하면 running 은 **`sessions/<pid>.json` 이 alive 한 세션 중 tool 실행/응답 생성 중인 것만** 이므로 자동으로 정확히 표현됨.
- 디자인 원본은 status 만 보고 pulse 결정 → 우리도 동일하게 유지. 추가 로직 불필요.

---

## 2. `components/dashboard-card.tsx`

> 원본: `dashboard-card.jsx` (194줄)

### 책임
- 그리드 카드 한 장 (`GridCard`)
- 리스트 행 한 줄 (`ListRow`)
- 상태별 카드 액션 버튼 (`CardActions`)

### Export & Props
```typescript
export function GridCard(props: {
  a: Agent;
  density: 'compact' | 'comfortable';
  onOpen: () => void;
  onAction: (id: string, action: string) => void;
  selected: boolean;
}): JSX.Element;

export function ListRow(props: {  /* 같은 props */ }): JSX.Element;
```

### 카드 구조 요약
```
[3px 상단 상태 라이트 바]
[헤더] StatusDot · name | 상태 뱃지
       mono id · model
[본문] task (2줄 clamp)
       branch · repo · branch  (mono)
       단계 점 진행률 ••○○○○○  4/7
       (comfortable일 때) last 한 줄 인용박스
[푸터] mono: 184k · $2.71 · 14m  |  CardActions
```

### `CardActions` 상태별 버튼 + 실 동작 매트릭스 (v3.3 갱신)

| 상태 | 버튼 (왼→오른쪽) | 실제 동작 |
|------|----------------|----------|
| running | Chat (ghost) · Pause (ghost) | Chat = drawer Chat 탭 점프 ✅ / Pause = Demo (toast+activity, **status 안 변경**) |
| waiting | Chat (ghost) · Answer (primary) | 둘 다 drawer 점프 ✅ |
| review  | Reject (ghost) · Approve (primary) | 둘 다 Demo (**status 안 변경**) |
| error   | Logs (ghost) · Retry (primary) | Logs = drawer Stream 탭 ✅ / Retry = Demo |
| idle    | Chat (ghost) · Start (primary) | Chat = drawer ✅ / Start = Demo |

> ADR-006 참조. **진짜 외부 효과 액션은 "+ New agent" (spawn) + drawer 헤더 "Open folder" 뿐.**

**Demo 액션 클릭 시 흐름** (v3.3):
1. 토스트 표시 ("Real control of running Claude Code processes is not available — this is a display-only action")
2. Activity 피드에 이벤트 추가
3. **카드 status 는 안 건드림** (디자인 원본 변경. 폴링이 source of truth)

> 카드 자체 클릭 → `onOpen()` 드로어 열림. 버튼 클릭은 `stopPropagation()` 으로 드로어 안 열리게 막아야 함 (원본 동일).

### 이식 주의
- `density === 'compact'` 분기 인자가 padding/fontSize 거의 모든 줄에 영향 → 그대로 보존
- 단계 점은 `Array.from({ length: a.steps }, ...)` 패턴. `i < a.step` / `i === a.step && running` / 그 외 3분기
- 카드 hover: selected 가 아닐 때만 `onMouseEnter/Leave` 로 borderColor 변경
- ListRow 의 `gridTemplateColumns` 9열 폭 (`'160px 80px 1fr 220px 110px 90px 90px 100px 130px'`) 그대로

---

## 3. `components/dashboard-sidebar.tsx`

> 원본: `dashboard-sidebar.jsx` (138줄)

### 책임
- 우측 사이드바 컨테이너 (`Sidebar`)
- 6노드 hand-off SVG 그래프 (`CollabGraphWarm`)
- 라이브 활동 피드 (`ActivityFeedWarm`)

### Export & Props
```typescript
export function Sidebar(props: {
  agents: Agent[];
  activity: ActivityEvent[];
  onSelectAgent: (id: string) => void;
}): JSX.Element;
```

### ActivityFeed tone → CSS var 매핑 (dashboard-sidebar.jsx L104-108)

```typescript
const toneColor: Record<ActivityEvent['tone'], string> = {
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
```

각 활동 이벤트의 도트 색은 tone 값으로 결정. 10개 tone 모두 위 CSS variable 에 매핑.

### 이식 주의
- **CollabGraph 의 노드 위치는 하드코딩**:
  ```
  'refactor-api':   { x: 60,  y: 50  },
  'test-coverage':  { x: 155, y: 80  },
  'docs-update':    { x: 245, y: 55  },
  'a11y-pass':      { x: 90,  y: 145 },
  'perf-audit':     { x: 185, y: 155 },
  'feature-search': { x: 260, y: 135 },
  ```
  → 실데이터에서는 의미 없음. 1차에서는 mock 으로 보여주고, 후에 layout 알고리즘(d3-force 등) 도입.

- **Edge 도 하드코딩 6개**. SVG `<marker id="arr-warm">` 화살촉 정의 그대로 옮기기.

- ActivityFeed 의 tone 색 매핑 9개:
  ```
  edit→ink-3, pr→clay, review→review, error→error, ok→running,
  flag→waiting, spawn→clay, progress→running, msg→review, action→ink-2
  ```

- "live" 점 (오른쪽 상단) 의 `box-shadow: 0 0 0 2.5px var(--running-bg)` 효과

---

## 4. `components/dashboard-detail.tsx`

> 원본: `dashboard-detail.jsx` (471줄) — 가장 큰 파일

### 책임
- 슬라이드인 우측 드로어 (`DetailDrawer`)
- 4개 탭: Stream / Files / Chat / Settings
- 상태별 푸터 액션 (Stop · Approve · Reject · Retry · Pause · Interrupt & chat · Answer question · Start now)

### Export & Props
```typescript
export function DetailDrawer(props: {
  agent: Agent | null;
  onClose: () => void;
  onAction: (id: string, action: string) => void;
  chats: Record<string, ChatMsg[]>;
  onChatSend: (id: string, text: string) => void;
}): JSX.Element | null;
```

### 내부 모킹 함수 3개 (원본에 그대로 있음)

```typescript
function streamFor(a: Agent): Array<{ name: string; state: 'done'|'running'|'failed'|'paused'|'pending' }>;
function logsFor(a: Agent): string[];        // 콘솔 라인
function filesFor(a: Agent): string[];       // '경로 (+추가 -삭제)' 문자열
```

> **1차에서는 원본 함수 그대로 가져와 mock 데이터 유지**.
> 후순위로 실제 JSONL 의 tool_use 레코드에서 추출하도록 교체.

### 헤더의 Open folder 아이콘 ⭐ (신규 — 디자인 원본에 없음)

drawer 헤더의 `id · model · repo · branch` 표시줄 끝(오른쪽)에 작은 폴더 아이콘 버튼 추가:

```tsx
<button
  onClick={async () => {
    await fetch('/api/open-folder', { method: 'POST', body: JSON.stringify({ cwd: agent.cwd }) });
    toast.success('Folder opened');
  }}
  style={{
    border: 'none', background: 'transparent',
    color: 'var(--ink-3)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', padding: '2px 4px',
  }}
  title="Open folder in editor"
>
  <Icon name="folder" size={14} />
</button>
```

> `Icon` 의 `folder` path 가 원본에 없으면 `dashboard-utils.tsx` 에 추가 필요 (디자인 톤 유지: `viewBox="0 0 20 20"`, `strokeWidth="1.6"`, `stroke="currentColor"`).

### 탭 컴포넌트들

| 탭 | 컴포넌트 | 핵심 |
|---|---------|------|
| Stream | `<StreamTab>` | Plan 체크리스트 + 다크 콘솔(`background: #231f17, color: #e8e0cc`) |
| Files | `<FilesTab>` | 파일 경로 + `+12 -3` mono 숫자, alternating row background |
| Chat | `<ChatTab>` | `<ChatBubble>` (clay vs surface-2), 인풋 + Send (clay). 헤더에 "preview only" 라벨 (실 메시지 주입 불가) |
| Settings | `<SettingsTab>` | `<Field>` × 4 + 시스템 프롬프트 mono 블록 + Tools 태그 |

### DetailDrawer 푸터 액션 — 5개 상태 분기 (dashboard-detail.jsx L217-240)

| 상태 | 좌측 (Stop) | 우측 (상태별 액션) | 실 동작 |
|------|------------|-----------------|--------|
| review | Stop (ghost · danger color) | `Reject` (ghost) + `Approve & merge` (primary clay) | 둘 다 Demo 토스트 |
| error | Stop | `Open logs` (ghost) + `Retry` (primary) | Open logs = Stream 탭 점프 ✅ / Retry = Demo |
| running | Stop | `Pause` (ghost) + `Interrupt & chat` (primary) | Pause = Demo / Interrupt & chat = Chat 탭 점프 ✅ |
| waiting | Stop | `Answer question` (primary, 단일) | Chat 탭 점프 ✅ |
| idle | Stop | `Start now` (primary, 단일) | Demo 토스트 |

> `Stop` 은 모든 상태에서 좌측에 노출. 클릭 시 Demo 토스트 + 클라이언트 상태만 변경.

### 이식 주의
- 드로어 자체에 `animation: slide-in .22s cubic-bezier(.2,.7,.3,1)` 적용 → CSS 키프레임 globals.css 에 정의 필요
- 오버레이 `background: rgba(40,30,20,0.18)` + `backdropFilter: blur(2px)` (이건 예외적으로 허용 — 원본대로)
- 드로어 폭 `560px` 절대값
- 챗 인풋의 `onKeyDown` 으로 Enter(전송) / Shift+Enter(줄바꿈) 분기
- 새 agent 선택 시 `tab` 을 'stream' 으로 리셋 (`useEffect([agent?.id], ...)`)

---

## 5. `components/dashboard-modals.tsx`

> 원본: `dashboard-modals.jsx` (333줄)

### 책임
- "+ New agent" 모달 (`NewAgentModal`)
- 타임라인 뷰 (`TimelineView`)

### Export & Props
```typescript
export function NewAgentModal(props: {
  onClose: () => void;
  onCreate: (newAgent: Agent) => void;
}): JSX.Element;

export function TimelineView(props: {
  agents: Agent[];
  onOpen: (id: string) => void;
  selectedId: string | null;
}): JSX.Element;
```

### NewAgentModal 내부
- `TEMPLATES` 상수 (8개): feature, refactor, bug, review, docs, deps, research, blank
- 폼 상태: tpl, name, task, **cwd (select + "새 경로" text input)**, model, autoStart
- 템플릿 변경 시 `defaultModel` 자동 적용
- **`cwd` 입력 방식 — 디자인 원본 변경 ⭐**:
  - 디자인의 `Repo: acme/web | acme/payments ...` fake select 는 **제거**
  - 대신: 기존 카드들의 `cwd` 를 prop 으로 받아 select 옵션으로 (recent paths)
  - 추가로 "Or enter a new path" 텍스트 입력 필드
  - select + input 둘 중 하나만 활성 (mutually exclusive)
- **Spawn 클릭 시** (v3.4):
  1. **`const sessionId = crypto.randomUUID()`** — 클라이언트가 UUID 생성 (placeholder + spawn 의 --session-id 양쪽에 사용)
  2. `POST /api/spawn` 호출 — body: `{ name, task, cwd, model: 'sonnet'|'opus'|'haiku', sessionId }`
  3. 응답 200 OK → 모달 닫기 + 성공 toast + Activity 피드에 "spawned by you"
  4. **Optimistic placeholder 카드 즉시 등록**:
     - `id: sessionId` (UUID 그대로 — 결정론적 매칭 ⭐)
     - `status: 'running'`, `name: 입력값 || 'Spawning…'`, `cwd`, `model`, `expiresAt: now + 60_000`
     - 그리드 최상단에 표시
  5. **폴링 시 매칭**: 실 Agent 의 `sessionId === placeholder.id` 이면 placeholder 제거 + 실 카드로 자연 전환
  6. 60초 만료 시 placeholder 제거 + toast "세션이 아직 활성화되지 않았어요"
  7. 응답 4xx/5xx → 모달 내부 에러 메시지 (placeholder 안 만듬)
- 모달 자체 클릭은 `stopPropagation`, 오버레이 클릭 시 `onClose`

**`model` select 옵션** (v3.4 — claude CLI alias 사용):
```
sonnet  — Latest Sonnet (balanced)
opus    — Latest Opus (most capable)
haiku   — Latest Haiku (fast & cheap)
```
풀 ID 가 아니라 alias 사용 → Claude Code 가 자동으로 최신 버전 매핑.

### TimelineView 내부
- `parseStarted(s)`: `'14m'` `'1h 4m'` `'just now'` `'—'` → 분 단위 숫자 (또는 null)
- 4시간(240분) 가로 타임라인
- 5개 시간 라벨: `4h ago / 3h / 2h / 1h / now`
- 각 행: `[160px name | 1fr bar]`
- bar 위치: `left% = ((SPAN - startedMin) / SPAN) * 100`
- scheduled (started === null) 은 하단 3열 그리드로 별도 표시

### 이식 주의
- 모달 애니메이션 `scale-in .2s cubic-bezier(.2,.7,.3,1)`
- 템플릿 카드의 아이콘이 serif 폰트 글자 (`✦ ↻ ☉ ◐ ¶ ◇ ∿ +`) 사용
- 모델 select 의 옵션 표기:
  ```
  opus-4.5 — most capable
  sonnet-4.5 — balanced
  haiku-4.5 — fast & cheap
  ```

---

## 6. `components/dashboard-app.tsx`

> 원본: `dashboard-app.jsx` (380줄) — 메인 셸

### 책임
- 최상위 `App` 컴포넌트 (모든 상태 보유)
- `TopBar` (인사말 + 통계 + New agent 버튼)
- `FilterRow` (상태 필터 칩 + 검색 + 레이아웃 토글)
- `GridBody` / `ListBody` / `EmptyState`
- 채팅 시뮬레이션 (`cannedReply`)

### App 상태 (8개)
```typescript
const [agents,        setAgents]        = useState<Agent[]>(initial);
const [filter,        setFilter]        = useState<Status | 'all'>('all');
const [query,         setQuery]         = useState('');
const [selectedId,    setSelectedId]    = useState<string | null>(null);
const [newAgentOpen,  setNewAgentOpen]  = useState(false);
const [chats,         setChats]         = useState<Record<string, ChatMsg[]>>({});
const [activity,      setActivity]      = useState<ActivityEvent[]>(initialActivity);
const [tweaks,        setTweak]         = useTweaks(TWEAK_DEFAULTS);
```

### Derived
- `filtered` = agents.filter(filter + query)
- `totals` = useMemo(집계) ← 카드 수, 상태별 카운트, 토큰합, 비용합
- `selected` = agents.find(id === selectedId)

### 이식 주의

#### a) "use client" 필수
파일 맨 위에 `'use client'` 선언 (useState 사용).

#### b) Tweaks 의 accent 색 동적 적용
```typescript
useEffect(() => {
  document.documentElement.style.setProperty('--clay', tweaks.accent || '#c96442');
}, [tweaks.accent]);
```

#### c) `onAction` 분기 6개 — ⭐ v3.3 변경: Toast + Activity 만, **카드 status 안 변경**

> 디자인 원본은 `setAgents(list => list.map(...))` 로 status 변경하지만, **우리는 setAgents 호출 안 함**. 이유: 30초 후 폴링이 실 데이터로 되돌려 사용자 혼란 (ADR-013 T).

```typescript
const onAction = (id, action) => {
  const a = agents.find(x => x.id === id);
  if (!a) return;

  // 1) Demo toast
  toast.demo(`Real control of running Claude Code processes is not available — this is a display-only action.`);

  // 2) Activity 피드에 이벤트 기록
  pushActivity({
    who: a.name,
    what: ({
      pause:   'paused by you',
      retry:   'retry requested',
      approve: 'approved & merged',
      reject:  'rejected',
      start:   'started by you',
      stop:    'stopped',
    }[action] ?? action),
    tone: ({
      pause: 'action', retry: 'action', approve: 'ok',
      reject: 'flag', start: 'spawn', stop: 'action',
    }[action] ?? 'action'),
  });

  // ★ 카드 status 는 안 건드림. 폴링이 source of truth.
};
```

> **별도로** spawn 액션은 `onCreate` 핸들러 → `POST /api/spawn` + Optimistic placeholder 카드 등록 (실 동작).
> **별도로** open folder 액션 (drawer 헤더 아이콘) → `POST /api/open-folder` (실 동작).

#### d) `onChatSend` 시뮬레이션
- 즉시 user 메시지 추가
- 900ms 후 `cannedReply()` 결과로 agent 메시지 추가
- `cannedReply` 는 상태(error/waiting/review)에 따라 다른 응답 분기

#### e) `clockNow()` 유틸
`new Date()` 에서 `HH:MM` 추출 → Activity 이벤트의 `t` 필드.

#### f) `FilterChip` 의 active 상태
- active 시 background `var(--ink)`, color `var(--surface)`
- 비활성 시 상태 색 dot 표시

#### g) `LayoutSwitch` 의 3가지 SVG 아이콘
원본 그대로 (grid 2x2 사각형 / list 3가로줄 / timeline 원+선).

### TopBar 의 SummaryStat 3개
- Today's spend = `$${totals.cost.toFixed(2)}` · sub: `${(totals.tokens / 1000).toFixed(0)}k tokens`
- Files edited = `totals.edited` · sub: 'across 6 repos'
- Active = `${totals.total - totals.idle}/${totals.total}` · sub: `${totals.idle} idle`

---

## 7. `components/tweaks-panel.tsx`  (선택 — 후순위)

> 원본: `tweaks-panel.jsx` (530줄)

### 책임
- 우측 하단 fixed 패널 + 드래그 가능
- 컨트롤 helpers: `TweakSection`, `TweakSlider`, `TweakToggle`, `TweakRadio`, `TweakSelect`, `TweakColor`, `TweakNumber`, `TweakText`, `TweakButton`
- `useTweaks(defaults)` 훅 — 값 + setter 반환

### 이식 주의
- 원본은 `window.parent.postMessage(...)` 로 Claude Design 호스트와 통신 → **이식 시 이 부분은 제거 또는 무시**
- 디자인 캔버스 안에서만 의미 있는 코드 (`__activate_edit_mode` 등 메시지) → 우리 환경에서는 패널 토글 버튼을 직접 만들어야 함
- 1차에서는 useTweaks 만 가져와서 단순 상태 관리로 쓰고, TweaksPanel UI 는 작은 토글 버튼 하나로 시작 가능

### 단순화 옵션
1차 구현에서는 **Tweaks 패널 완전 생략** + tweaks 기본값 하드코딩도 OK. (`layout: 'grid'`, `density: 'comfortable'`, `showSidebar: true`)

---

## 8. App 외 추가 페이지/컴포넌트?

- **현재는 1페이지 SPA**. 라우팅 없음. 모든 게 `app/page.tsx` 한 화면.
- `app/api/agents/route.ts` 만 별도 라우트.
- 추후 `/settings`, `/history` 같은 페이지 추가 시 App Router 의 폴더 라우팅 사용.

---

## 의존성 (각 컴포넌트가 무엇을 import 하는가)

> 모든 `STATUS_META` 참조는 **`@/lib/status-meta`** 한 곳에서. 컴포넌트끼리 재export 안 함.

```
dashboard-app.tsx
├── @/components/dashboard-card     (GridCard, ListRow)
├── @/components/dashboard-sidebar  (Sidebar)
├── @/components/dashboard-detail   (DetailDrawer)
├── @/components/dashboard-modals   (NewAgentModal, TimelineView)
├── @/components/dashboard-utils    (Icon, fmtTok, fmt$, StatusDot)
├── @/components/tweaks-panel       (useTweaks, TweaksPanel, controls)
├── @/lib/types                     (Agent, Status, ChatMsg, ActivityEvent)
└── @/lib/status-meta               (STATUS_META)

dashboard-card.tsx
├── @/components/dashboard-utils    (Icon, StatusDot, fmtTok, fmt$)
├── @/lib/types
└── @/lib/status-meta

dashboard-sidebar.tsx
├── @/lib/types
└── @/lib/status-meta

dashboard-detail.tsx
├── @/components/dashboard-utils    (Icon, StatusDot, fmtTok, fmt$)
├── @/lib/types
└── @/lib/status-meta

dashboard-modals.tsx
├── @/components/dashboard-utils    (Icon)
├── @/lib/types
└── @/lib/status-meta

dashboard-utils.tsx
├── @/lib/types
└── @/lib/status-meta

tweaks-panel.tsx
(no internal deps — useState/useRef 만)
```

---

## 컴포넌트 우선순위

빨리 동작하는 화면을 만드는 순서:

1. `dashboard-utils.tsx` ✅ 가장 단순, 기반
2. `lib/types.ts` + `lib/status-meta.ts` ✅ 타입 / 상수
3. `dashboard-card.tsx` ✅ 가장 시각적 핵심
4. `dashboard-app.tsx` (App / TopBar / FilterRow / GridBody / ListBody 만) ✅ 이 단계에서 그리드/리스트 동작
5. `dashboard-sidebar.tsx` ✅ 사이드바 + handoff 그래프
6. `dashboard-detail.tsx` ✅ 드로어 + 4탭
7. `dashboard-modals.tsx` ✅ New agent + Timeline
8. `tweaks-panel.tsx` (선택) ⚠️ 후순위, 단순 토글로 대체 가능

각 단계마다 `/api/agents` 가 빈 배열을 리턴해도 화면이 깨지지 않는지 확인.
