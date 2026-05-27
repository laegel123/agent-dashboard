# 아키텍처

## 디렉토리 구조

```
agents/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # next/font 로 Geist · Geist Mono · Instrument Serif 로드 + globals.css
│   ├── page.tsx                # "use client" — App 컴포넌트 마운트
│   ├── globals.css             # tokens.css + Dashboard.html <style> 합본
│   └── api/
│       ├── agents/
│       │   └── route.ts        # GET /api/agents — JSONL 스캔 → Agent[]
│       └── spawn/
│           └── route.ts        # POST /api/spawn — 새 터미널 + claude 실행
│
├── components/                 # 디자인 6 JSX → TSX 1:1
│   ├── dashboard-utils.tsx
│   ├── dashboard-card.tsx
│   ├── dashboard-sidebar.tsx
│   ├── dashboard-detail.tsx
│   ├── dashboard-modals.tsx
│   ├── tweaks-panel.tsx        # 선택 — 후순위
│   └── dashboard-app.tsx
│
├── lib/                        # 순수 함수 / 노드 전용
│   ├── types.ts                # Agent, Status, ChatMsg, ActivityEvent, JsonlRecord
│   ├── status-meta.ts          # STATUS_META = { running: {fg, bg, label}, ... }
│   ├── pricing.ts              # 모델별 단가 + calculateCost
│   ├── format-time.ts          # 로컬 타임존 변환 + relativeTime
│   ├── claude-logs.ts          # ~/.claude/projects 스캔 + JSONL 파싱 + sessionToAgent
│   ├── sessions-meta.ts        # ★ ~/.claude/sessions/*.json 로드 + isProcessAlive — ADR-013
│   ├── status-deriver.ts       # deriveStatus(records, meta, now) — ADR-013 v2
│   ├── log-cache.ts            # mtime 캐시 + incremental 파싱 — ADR-011
│   ├── spawn.ts                # spawnClaudeSession({ task, cwd, ... }) OS 분기
│   └── open-folder.ts          # openFolder(cwd) OS 분기
│
└── design-package/             # ⚠️ Read-only — 핸드오프 원본
```

---

## 데이터 흐름 (읽기)

```
   [요청 시작]
        │
        ├──→ ⓐ ~/.claude/sessions/*.json 전체 로드 (lib/sessions-meta.ts)
        │    └─ Map<sessionId, SessionMeta>  (살아있는 세션 + PID)
        │
        └──→ ⓑ ~/.claude/projects/**/*.jsonl 스캔 (lib/claude-logs.ts)
                    │
                    │ ① fs.readdir + fs.stat (lib/log-cache.ts)
                    ↓
                mtime 캐시 확인
                    │
           ┌────────┴────────┐
           │                 │
        캐시 hit          캐시 miss / stale
           │                 │
           │           ② fs.readFile + JSONL 파싱 (lib/claude-logs.ts)
           │                 │
           │           ③ deriveStatus(records, sessionsMeta) ★ v2
           │                 │   (lib/status-deriver.ts)
           │                 │   PID alive 체크 (lib/sessions-meta.ts::isProcessAlive)
           │                 │
           │           ④ sessionToAgent(filePath, records, sessionsMap)
           │                 │
           │           ⑤ 캐시 저장 (mtime + 파싱 결과)
           └────────┬────────┘
                    ↓
           ⑥ entrypoint === 'cli' 필터 (ADR-010)
                    ↓
           ⑦ since 필터 (default 7d, ADR-012)
                    ↓
           ⑧ GET /api/agents 응답 (Agent[] + totals)
                    │
                    ↓
           ⑨ app/page.tsx fetch → setAgents
                    ↓
           ⑩ <App agents={...} /> 렌더
```

> **ⓐ 단계가 매 요청마다 실행되어야 함** — `~/.claude/sessions/` 폴더는 PID 단위로 파일이 생기고 종료 시 삭제되므로, 실시간 alive 판정을 위해 캐시하지 않음. 폴더 안 파일이 수십 개 수준이라 매번 읽어도 비용 무시 가능.

### 새로고침 주기 (ADR-011)
- **클라이언트**: 30초 폴링 (`setInterval`)
- **서버**: 매 요청마다 `fs.stat` 으로 mtime 확인 → 변경된 파일만 재파싱
- **새 .jsonl 파일** (spawn 결과): `fs.readdir` 가 새 파일을 발견 → 최대 30초 안에 카드 등장

### 캐시 구조 (in-memory)
```typescript
// lib/log-cache.ts
type CacheEntry = {
  mtimeMs: number;
  size: number;
  lastByteOffset: number;     // 다음 incremental 파싱 시작 위치
  // ★ agent.status 는 캐시하지 말 것 — 매 요청마다 sessionsMeta 와 함께 재계산
  partialAgent: Omit<Agent, 'status'>;
  records: JsonlRecord[];     // 마지막 ~50 레코드만 (detail drawer 용)
};
const cache = new Map<string, CacheEntry>();  // key = 파일 절대경로
```

서버 재시작 시 cache 비어있음 → 첫 fetch 가 모든 파일 풀 파싱 (수십 ms 예상).

### 캐시 유효성 검사 (mtime + size 동시)
```typescript
function isCacheValid(entry: CacheEntry, stat: fs.Stats): boolean {
  return entry.mtimeMs === stat.mtimeMs && entry.size === stat.size;
}
```
ext3 / FAT 같은 1초 정밀도 파일시스템에서 1초 안 두 번 변경되면 mtime 동일. `size` 도 같이 비교해야 안전.

### cwd 정규화 (디스플레이 / 중복 카드 감지용)
```typescript
// lib/format-path.ts
export function normalizeCwd(p: string): string {
  return path
    .resolve(p)
    .replace(/[\\/]+$/, '')
    .replace(/\\/g, '/')
    .toLowerCase();
}
```
**v3.4 이후 placeholder 매칭은 sessionId 기준** (cwd 매칭 불필요).
이 함수는 카드의 cwd 표시 정규화 / 같은 cwd 의 중복 세션 감지 등 보조 용도로만 유지.

### 파싱 방식 — readline streaming
큰 jsonl (수 MB ~ 수십 MB) 도 메모리 안전하게 처리. `readline.createInterface({ input: fs.createReadStream(filepath) })` 패턴. 각 line 을 `JSON.parse` 시 실패하면 console.warn 후 그 한 줄만 skip (동시에 append 되는 파일의 마지막 불완전 라인 케이스).

### 부분 실패 처리
- 한 파일 파싱이 실패 (권한, 깨진 JSON, 디렉토리 사라짐 등) → `console.warn` + 그 파일만 skip
- API 는 best-effort 로 정상 파일들만 반환 (500 안 띄움)
- 다만 `~/.claude/projects/` 디렉토리 자체가 없으면 → `{ agents: [], totals: {...zeros} }` + 클라이언트가 적절한 EmptyState 노출

### 폴링 인디케이터
TopBar 우상단 `live` 라벨 옆에 작은 dot (5px, `var(--running)`, pulse-dot 애니메이션). fetch 중인 동안 opacity 1, 아니면 0.4 — subtle 한 라이브 표시.

---

## 데이터 흐름 (쓰기 — spawn) — Optimistic placeholder 포함

```
[클라이언트] NewAgentModal "Spawn agent" 클릭
            │
            ├──→ const sessionId = crypto.randomUUID()
            │     (placeholder + spawn 의 --session-id 양쪽에 같은 값 사용)
            │
            ↓
[POST /api/spawn] body = { name, task, cwd, model, sessionId }
            │
            ↓
[lib/spawn.ts] OS 분기 — `claude` 인자 4종 활용 (W 확정):

  공통 claude 인자 (모든 OS):
    ['claude', '--name', name, '--model', model,
     '--session-id', sessionId, ...(task ? [task] : [])]
    (--session-id 는 클라이언트가 crypto.randomUUID() 로 생성한 UUID)

  Windows:
    // cmd /k 뒤에 명령 문자열이 오므로 quote 처리 필요
    const claudeCmdline = ['claude', '--name', q(name), '--model', q(model),
                           '--session-id', sessionId, ...(task ? [q(task)] : [])].join(' ');
    // q() = 공백/특수문자 포함 시 "" 로 감싸고 내부 " 를 \" escape
    const child = spawn('cmd', ['/c', 'start', '""', 'cmd', '/k', claudeCmdline], {
      cwd, detached: true, stdio: 'ignore',
    });
    child.unref();

  macOS:
    // osascript do script 는 shell 문자열 한 줄. 모든 변수 shell-escape.
    const cdEsc      = sh(cwd);
    const nameEsc    = sh(name);
    const modelEsc   = sh(model);
    const taskEsc    = task ? sh(task) : '';
    const inner = `cd ${cdEsc} && claude --name ${nameEsc} --model ${modelEsc} ` +
                  `--session-id ${sessionId}${taskEsc ? ' ' + taskEsc : ''}`;
    // sh() = single-quote 로 감싸고 내부 ' 를 '\'' 로 escape
    // 그 후 osascript 의 큰 따옴표 escape
    spawn('osascript', ['-e',
      `tell application "Terminal" to do script "${inner.replace(/"/g, '\\"')}"`
    ]);

  Linux (env TERMINAL 우선 → 후보 5종 순차 시도, spawn 의 array args 자동 quote):
    const args = ['--working-directory', cwd, '--', 'claude',
                  '--name', name, '--model', model,
                  '--session-id', sessionId, ...(task ? [task] : [])];
    // gnome-terminal / x-terminal-emulator 패턴. konsole/xterm 은 -e 단일 문자열 필요 → 별도 분기
    for (const t of [process.env.TERMINAL, 'gnome-terminal', 'x-terminal-emulator',
                     'konsole', 'xfce4-terminal', 'xterm'].filter(Boolean)) {
      try { spawn(t, args, { detached: true, stdio: 'ignore' }).unref(); return { ok: true, method: t }; }
      catch (_) { continue; }
    }
            │
            ↓
[응답] { ok: true, method: '...' }
            │
            ↓
[클라이언트] 모달 닫기 + activity 피드에 "spawned by you" 추가
            │
            ↓
[Optimistic placeholder 즉시 삽입 — ADR-014 + v3.4 Z]
   - id: sessionId (★ spawn 의 --session-id 와 동일 UUID — 결정론적 매칭)
   - status: 'running', name: 입력값 or 'Spawning…'
   - 그리드 최상단에 표시
   - placeholderCards 에 { id: sessionId, expiresAt: now + 60_000 } 등록
            │
            ↓
[30초 폴링이 새 .jsonl 발견]
   - agent.sessionId === placeholderCards[*].id 정확 매칭
   - 매칭되면 placeholder 제거 + 실 카드로 교체 (자연스러운 전환)
   - 60초 만료 시 placeholder 자동 제거 + toast "세션이 아직 활성화되지 않았어요"
            │
            ↓
[정상화]
```

### Open folder 흐름

```
[Detail drawer 헤더의 폴더 아이콘 클릭]
            │
            ↓
[POST /api/open-folder] body = { cwd }
            │
            ↓
[lib/open-folder.ts] OS 분기:
   - Windows:  child_process.exec(`start "" "${cwd}"`)  // 또는 code "${cwd}"
   - macOS:    child_process.exec(`open "${cwd}"`)
   - Linux:    child_process.exec(`xdg-open "${cwd}"`)
            │
            ↓
[응답] { ok: true }
            │
            ↓
[클라이언트] 성공 toast (간단)
```

> **주의**: spawn 의 책임은 "터미널 띄우기 + claude 실행" 까지. 사용자가 그 터미널에서 첫 메시지를 입력하기 전까지는 .jsonl 파일이 안 생길 수 있음 → Optimistic placeholder 가 그 갭을 메움.

---

## 패턴

### Server Component vs Client Component
- `app/page.tsx` = **Client Component** (`"use client"`). 디자인이 useState/useEffect 위에 무겁게 올라가 있어 서버 컴포넌트 분리 의미 적음.
- `app/layout.tsx` = **Server Component**. next/font 로딩만.
- API Route (`/api/agents`, `/api/spawn`) = **Node runtime** 명시 (`export const runtime = 'nodejs'`).

### 상태 관리 (ADR-005)
- 로컬 컴포넌트 상태: 모달 / 입력 폼 / 탭 → `useState`
- 앱 단위 상태: agents / filter / selectedId / chats / activity / tweaks → App 의 `useState` + props drilling
- 서버 상태: API 응답 → 첫 로드 후 클라이언트 상태로 흡수
- Redux/Zustand 미도입

### 스타일링 (ADR-002)
- inline style 객체 + CSS variable
- `app/globals.css` 한 파일: 토큰 + 키프레임 + 스크롤바
- 클래스: `.dash` `.mono` `.serif` `.tnum` 4개만

### 타입
- `lib/types.ts` 한 곳에 모든 도메인 타입
- API 응답도 같은 타입 사용 (Frontend ↔ Backend 일치)

---

## 액션 라우팅 (어떤 클릭이 어디로 가는가)

| UI | 라우트 | 실제 동작 |
|----|--------|----------|
| `+ New agent` → `Spawn agent` | `POST /api/spawn` | ✅ 새 터미널 + Optimistic placeholder |
| Detail drawer 헤더의 **폴더 아이콘** | `POST /api/open-folder` | ✅ OS 파일 탐색기 / 에디터 |
| 카드의 `Pause` 버튼 | (없음 — 클라이언트만) | ❌ Demo toast + 상태 변경 |
| 카드의 `Approve` 버튼 | (없음 — 클라이언트만) | ❌ Demo toast + 상태 변경 |
| 카드의 `Reject` 버튼 | (없음 — 클라이언트만) | ❌ Demo toast + 상태 변경 |
| 카드의 `Retry` 버튼 | (없음 — 클라이언트만) | ❌ Demo toast + 상태 변경 |
| 카드의 `Start` / `Stop` | (없음 — 클라이언트만) | ❌ Demo toast + 상태 변경 |
| Chat 탭에서 `Send` | (없음 — 클라이언트만) | ❌ "Preview only" 라벨 + mock 응답 |

### Demo 액션 토스트 UX
```
"Demo mode — actual control of running Claude Code processes isn't available yet.
The card state has been updated for visualization only."
```

토스트 위치: 우상단 / fade-in 3초 자동 해제.

---

## 빌드 / 배포

- **로컬 전용**. 배포 없음.
- `npm run build` → `.next/`
- `npm run start` → 3000 포트
- 추후 Electron 패키징은 ADR 검토 필요 (현재 없음)

---

## Filter / Search 처리 위치 (ADR-013 U)

| 필터 차원 | 위치 | 이유 |
|---------|------|------|
| 시간 범위 (`since=7d/30d/all`) | **서버** | 파일 수 자체를 줄여 응답 가벼움 |
| entrypoint = 'cli' | **서버** | 항상 강제 적용 (사용자 토글 불가) |
| 상태 칩 (running/waiting/...) | **클라이언트** | 디자인 원본의 `filtered = useMemo(...)` 그대로 |
| 검색 텍스트 | **클라이언트** | debounce 150ms 후 useMemo |
| 레이아웃 (grid/list/timeline) | **클라이언트** | 순수 UI 전환 |
| 정렬 | **클라이언트** | 사이즈 작아 비용 무시 |

## 보안 / 권한 (ADR-015)

- **호스트 바인딩**: Next.js 서버를 **`127.0.0.1` 에만** 바인딩 (loopback 외 차단)
  ```json
  "dev":   "next dev --hostname 127.0.0.1",
  "start": "next start --hostname 127.0.0.1"
  ```
- **부수효과 API 의 Origin 체크**: `/api/spawn` `/api/open-folder` 는 Origin 헤더가 `http://localhost:3000` 또는 `http://127.0.0.1:3000` 인지 확인. 부재/불일치 → 403.
- 로컬 머신의 `~/.claude` 만 읽음 → 추가 권한 없음
- spawn 은 사용자 본인 권한으로 실행 → 추가 권한 없음

---

## 시간대 처리

- JSONL 의 `timestamp` 는 ISO-8601 (보통 UTC) 또는 Unix ms
- 카드의 "14:32" / "14m ago" 등은 모두 **사용자 로컬 타임존** 기준
- 변환은 `lib/format-time.ts` (또는 `dashboard-utils.tsx`) 에서 일괄 처리
- `Intl.DateTimeFormat` + `Date.toLocaleTimeString` 사용

---

## 폴더 위치 디테일

| 무엇 | 어디 | 이유 |
|------|------|------|
| 디자인 원본 | `design-package/` | 핸드오프 번들 위치 유지 |
| TSX 포팅본 | `components/` | Next.js 컨벤션 |
| 노드 전용 코드 | `lib/` | fs / child_process 등 |
| API 라우트 | `app/api/<name>/route.ts` | App Router 표준 |
| 토큰 CSS | `app/globals.css` | layout 에서 import |
| 폰트 | `app/layout.tsx` (next/font) | 자동 self-host |
