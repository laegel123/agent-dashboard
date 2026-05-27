# 구현 계획

> 단계별 체크리스트. 각 Phase 끝나면 사용자 검토 → 다음.

---

## Phase 0 — 문서화 (✅ 진행 중)

- [x] 디자인 패키지 분석
- [x] CLAUDE.md + docs/ 1차 작성
- [x] 기획 이슈 발견 & 결정 (1세션=1카드, CLI only, spawn만 실동작, 7일 기본 필터)
- [x] 모든 문서 결정사항 반영 재정비
- [x] 사용자 최종 검토 → Phase 1 진입

**산출물**: CLAUDE.md + docs/ 8개 문서.

---

## Phase 1 — 프로젝트 부팅 ✅ (commit `163e1e5`)

> ⚠️ 사용자 동의 후 실행.

- [x] `npm install` (Next.js 15 · React 18 · TypeScript)
- [x] **`package.json` scripts 에 `--hostname 127.0.0.1` 추가** (ADR-015 보안):
  ```json
  "dev":   "next dev --hostname 127.0.0.1",
  "start": "next start --hostname 127.0.0.1"
  ```
- [x] `app/layout.tsx` — next/font 로 Geist · Geist Mono · Instrument Serif 로딩
- [x] `app/globals.css` — `design-package/.../tokens.css` 이식 + Dashboard.html `<style>` 키프레임/스크롤바 합본
- [x] `app/page.tsx` 빈 셸 (`"use client"` + 로딩 텍스트)
- [x] `npm run dev` 에러 없이 부팅

**검증**: localhost:3000 에 베이지 배경 + "Loading…" 만 보이면 OK.

---

## Phase 2 — 타입 & 상수 (`lib/`) ✅ (commit `142fe62`)

- [x] `lib/types.ts` — `Agent`, `Status`, `ChatMsg`, `ActivityEvent`, `JsonlRecord` (간소화 버전)
- [x] `lib/status-meta.ts` — `STATUS_META` 단일 출처
- [x] `lib/pricing.ts` — `PRICING`, `lookupPricing(model)` (prefix match), `calculateCost`, `shortModel`. **단가 출처 코멘트 + 검증일 표기** (2026-05-27)
- [x] `lib/format-time.ts` — `relativeTime(ts)`, `formatClock(ts)` 로컬 타임존 처리

**검증**: `npm run build` 통과. 타입 오류 없음.

---

## Phase 3 — 디자인 셸 (mock 데이터로 픽셀 검증)

> 실데이터 연결 전, mock 18개로 디자인 100% 재현.

### 3.1 유틸 & 카드 ✅ (commits `be5e2be`, `11331c6`, `f94f4c4`)
- [x] `lib/mock-data.ts` — 디자인 `mock-data.js` 18개 그대로 TS 변환. **⚠️ Phase 4 시작 시 완전 제거** (ADR-014)
- [x] `components/dashboard-utils.tsx` — `Icon` (디자인 원본 14개 + ★ `folder` 신규), `StatusDot`, `fmtTok`, `fmt$`
- [x] `components/dashboard-card.tsx` — `GridCard`, `ListRow`, `CardActions`, `BtnGhost`, `BtnPrimary`
- [x] `components/dashboard-app.tsx` — App + TopBar + FilterRow + GridBody + ListBody + EmptyState
- [x] `app/page.tsx` → `<App initialAgents={MOCK_AGENTS} />`

**검증**: 18 카드 그리드, 필터 칩, 검색, grid/list 전환 동작.

### 3.2 사이드바 ✅ (commit `1a22eb6`)
- [x] `components/dashboard-sidebar.tsx` — `Sidebar`, `CollabGraphWarm`, `ActivityFeedWarm`
- [x] 사이드바 우측 320px 폭, mock 6 노드 handoff 표시
- [x] **"demo data" 라벨** 사이드바 헤더에 추가 (UI_GUIDE 참조)

### 3.3 디테일 드로어 ✅ (commit `b9fcef2`)
- [x] `components/dashboard-detail.tsx` — DetailDrawer + 4탭 (Stream/Files/Chat/Settings)
- [x] `streamFor`, `logsFor`, `filesFor`, `initialChat` mock 함수 이식
- [x] **Chat 탭 헤더에 "preview only" 라벨**

### 3.4 모달 & 타임라인 ✅ (commit `0417a09`)
- [x] `components/dashboard-modals.tsx` — `NewAgentModal`, `TimelineView`, `TimelineRow`
- [x] mock 환경에서 Spawn 클릭 → 더미 Agent 생성하여 그리드 추가 (실제 API 호출은 Phase 5)

### 3.5 시간 범위 필터 ⭐ 신규
- [ ] `FilterRow` 옆에 세그먼트 컨트롤: `Last 7 days / Last 30 days / All time`
- [ ] mock 데이터에서는 의미 없지만 UI 동작 확인

### 3.6 Demo 토스트 ⭐ 신규
- [ ] `components/toast.tsx` — `useToast()` 훅 + `<ToastHost />`
- [ ] 액션 버튼 클릭 시 토스트 표시
- [ ] App 에 `<ToastHost />` 마운트

### 3.7 Empty / Loading / Error 상태 ⭐ 신규
- [ ] `EmptyState` 6가지 케이스 분기 (UI_GUIDE 참조)
- [ ] `LoadingState` 스켈레톤 6개
- [ ] `ErrorState` Retry 버튼 포함

### 3.8 Tweaks (선택)
- [ ] `components/tweaks-panel.tsx` — `useTweaks`, `TweaksPanel`, 컨트롤들
- [ ] App 에서 `useTweaks(TWEAK_DEFAULTS)` 사용

**Phase 3 완료 기준**: 디자인 원본 HTML 과 우리 dev 서버를 좌우 비교해서 시각 차이 못 찾음.

---

## Phase 4 — 데이터 레이어

### 4.0 mock-data 제거 (ADR-014)
- [ ] `lib/mock-data.ts` **삭제**
- [ ] `app/page.tsx` 에서 mock 데이터 import 제거
- [ ] `<App initialAgents={[]} />` 로 변경 (또는 props 시그니처를 옵셔널로) — Phase 4.3 에서 실 API 로 채움

### 4.1 메타 + 파서 + 추론기 + 캐시

- [ ] `lib/sessions-meta.ts` ⭐ 신규 (ADR-013)
  - `interface SessionMeta { pid, sessionId, cwd, startedAt, entrypoint, version, kind }`
  - `loadActiveSessions(): Promise<Map<string, SessionMeta>>` — `~/.claude/sessions/*.json` 전체 로드, `JSON.parse` 실패는 skip, sessionId 키 Map 반환
  - `isProcessAlive(pid: number): boolean` — `try { process.kill(pid, 0); return true } catch (e) { return e.code === 'EPERM' }` 패턴. Windows/macOS/Linux 모두 작동.

- [ ] `lib/status-deriver.ts` ⭐ 시그니처 변경 (ADR-013 v2)
  - `deriveStatus(records, meta?, now?): Status`
  - DATA_MODEL §3 의 알고리즘 그대로
  - meta === undefined 또는 PID dead → `'idle'`
  - alive 면 마지막 레코드 타입 분기

- [ ] `lib/claude-logs.ts`
  - `getClaudeHome(): string` — `os.homedir() + '/.claude'`
  - `scanProjects(): Promise<string[]>` — 모든 `.jsonl` 절대 경로 (subagents 폴더 포함하되 메인과 구분)
  - `readSession(filepath): Promise<JsonlRecord[]>` — **`readline` 으로 line-by-line streaming**. 각 line `JSON.parse` 실패 시 console.warn + skip (동시 append 의 마지막 불완전 라인 케이스)
  - `sessionToAgent(filepath, records, activeSessions): Agent` — ★ 세 번째 인자에 `Map<sessionId, SessionMeta>` 전달

- [ ] `lib/log-cache.ts` — mtime 캐시 + incremental 파싱 (ADR-011)
  - 캐시 키 = 파일 절대경로
  - 캐시 값 = `{ mtimeMs, size, lastByteOffset, partialAgent (status 제외), records: last 50 }`
  - **주의**: `agent.status` 는 캐시하지 말 것 — status 는 매 요청마다 `deriveStatus` 재호출 (sessions/ 가 매번 바뀔 수 있음). 캐시는 records / tokens / cost / files 등 정적 데이터만.
  - 부분 실패: 한 파일 파싱이 던지면 console.warn + 해당 파일만 skip. 다른 파일 정상 진행.

- [ ] **단위 테스트** — `docs/TESTING.md` §5 참조
  - 의존성 설치: `npm install --save-dev vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event`
  - `test/fixtures/claude-home/` 생성 (가짜 ~/.claude 구조)
  - `lib/*` 9개 모듈에 대해 **80개 케이스** 작성 (pricing 12 + status-deriver 11 + sessions-meta 9 + claude-logs 16 + log-cache 6 + spawn 10 + open-folder 4 + format-time 7 + format-path 5)
  - `npm run test:coverage` 임계값 통과 (lib/* 라인 80% / 함수 90%)

### 4.2 API Routes
- [ ] `app/api/agents/route.ts`
  ```typescript
  export const runtime = 'nodejs';
  export const dynamic = 'force-dynamic';

  export async function GET(req: Request) {
    const since = new URL(req.url).searchParams.get('since') ?? '7d';
    const cutoff = computeCutoff(since);

    // ⓐ 살아있는 세션 메타 매번 새로 로드 (캐시 X)
    const activeSessions = await loadActiveSessions();

    // ⓑ 프로젝트 jsonl 스캔 + 캐시 활용 파싱
    const files = await scanProjects();
    const agents = await Promise.all(
      files.map(f => getCachedOrParse(f, activeSessions))
    );

    const filtered = agents
      .filter(a => a.entrypoint === 'cli')        // ADR-010
      .filter(a => a.lastTimestamp >= cutoff)     // ADR-012
      .sort((a, b) => b.lastTimestamp - a.lastTimestamp);

    return Response.json({ agents: filtered, totals: computeTotals(filtered) });
  }
  ```

### 4.3 클라이언트 연결
- [ ] `app/page.tsx` 가 mount 시 `/api/agents?since=7d` 호출
- [ ] 응답을 App 의 `initialAgents` 로 전달
- [ ] 30초 setInterval 폴링
- [ ] 시간 범위 토글 변경 시 다시 fetch
- [ ] EmptyState / LoadingState / ErrorState 분기

### 4.4 API Route 통합 테스트 — `docs/TESTING.md` §6
- [ ] `/api/agents` — 8개 케이스 (entrypoint cli 필터, since 옵션 3종, 정렬, totals, 부분 실패)

**검증** — 본인 머신 CLI 세션이 1개뿐 (`overseas-app`) 임을 전제로 수동 검증:
- [ ] **1-card 케이스**: `overseas-app` CLI 세션이 카드 1장으로 노출
- [ ] **토큰 합 일치**: 카드 `tokens` 값 = JSONL 의 `input_tokens + output_tokens` 합 (cache 제외, 오차 0)
- [ ] **비용 합 일치**: 카드 `cost` 값 = `calculateCost` 결과 (cache 포함). 직접 수동 계산해 비교
- [ ] **모델 표기**: 카드 `model` 이 `opus-4.7` / `sonnet-4.6` / `haiku-4.5` 형태로 짧게
- [ ] **edited 카운트**: tool_use Edit/Write/MultiEdit/NotebookEdit 의 고유 file_path 수와 일치 (수동 grep 으로 검증)
- [ ] **mtime 캐시**: 두 번째 요청에서 재파싱 안 함 (dev 콘솔 로그)
- [ ] **시간 범위 토글**: `Last 7 days` / `Last 30 days` / `All time` 모두 동작
- [ ] **Status 추론 v2**: `~/.claude/sessions/<pid>.json` 이 존재 → `running`/`waiting`, 없음 → `idle`
- [ ] **alive 검증**: 새 터미널 `claude` 실행 → 30초 안에 새 카드 `running`. 그 터미널 `exit` → `idle`
- [ ] **EmptyState 케이스 수동**: `~/.claude/projects/` 임시 rename 후 페이지 새로고침 → "No Claude Code sessions yet" 안내
- [ ] **Few-cards 케이스 수동**: 새 cwd 에서 `claude` 두 번 실행해 세션 2-3 개 추가 → 그리드가 자연스럽게 채워지는지

---

## Phase 5 — 실 동작 액션

### 5.0 사전 — claude CLI 인자 ✅ 확정 (v3.4)

활용할 인자 4종:
- `[prompt]` positional — 사용자의 task 텍스트
- `-n, --name <name>` — 세션 표시 이름
- `--model <alias>` — `sonnet` / `opus` / `haiku`
- `--session-id <uuid>` ⭐ — placeholder 매칭용 결정론적 ID

완성된 명령:
```
claude --name <name> --model <alias> --session-id <uuid> "<prompt>"
```

### 5.1 Spawn API — claude 인자 4종 활용 (v3.4)

```typescript
// lib/spawn.ts
import { spawn } from 'node:child_process';

export interface SpawnOpts {
  cwd: string;
  name: string;
  model: string;       // 'sonnet' | 'opus' | 'haiku' (alias)
  sessionId: string;   // 클라이언트 crypto.randomUUID()
  task?: string;       // optional positional prompt
}

export async function spawnClaudeSession(opts: SpawnOpts): Promise<{ ok: true; method: string }> {
  const { cwd, name, model, sessionId, task } = opts;
  const claudeArgs = ['--name', name, '--model', model, '--session-id', sessionId, ...(task ? [task] : [])];

  if (process.platform === 'win32') {
    // cmd /k 뒤에 명령 한 줄. 각 인자 quote.
    const q = (s: string) => /["\s]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s;
    const cmdline = ['claude', ...claudeArgs].map(q).join(' ');
    const child = spawn('cmd', ['/c', 'start', '""', 'cmd', '/k', cmdline], {
      cwd, detached: true, stdio: 'ignore',
    });
    child.unref();
    return { ok: true, method: 'win32-start-cmd' };
  }

  if (process.platform === 'darwin') {
    const sh = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;
    const cmdline = `cd ${sh(cwd)} && claude ${claudeArgs.map(sh).join(' ')}`;
    const dq = cmdline.replace(/"/g, '\\"');
    spawn('osascript', ['-e', `tell application "Terminal" to do script "${dq}"`]);
    return { ok: true, method: 'macos-osascript' };
  }

  // Linux — spawn 의 array args 가 인자별 자동 quote
  const candidates = [process.env.TERMINAL, 'gnome-terminal', 'x-terminal-emulator',
                      'konsole', 'xfce4-terminal', 'xterm'].filter(Boolean) as string[];
  const args = ['--working-directory', cwd, '--', 'claude', ...claudeArgs];
  for (const t of candidates) {
    try {
      spawn(t, args, { detached: true, stdio: 'ignore' }).unref();
      return { ok: true, method: `linux-${t}` };
    } catch (_) { continue; }
  }
  throw new Error('No terminal emulator found');
}
```

- [ ] `app/api/spawn/route.ts` — POST 핸들러
  - **Origin 헤더 체크** (ADR-015): `http://localhost:3000` 또는 `http://127.0.0.1:3000` 이 아니면 403
  - body 검증:
    - `sessionId`: UUID 형식
    - `cwd`: `fs.statSync(cwd).isDirectory()` 통과
    - `name`: 비어있지 않음, 100자 이내
    - `model`: `sonnet` / `opus` / `haiku` 중 하나
    - `task`: 옵션, 500자 이내
  - `lib/spawn::spawnClaudeSession` 호출

- [ ] NewAgentModal:
  - `crypto.randomUUID()` 로 sessionId 생성
  - body 에 sessionId 포함해 fetch
  - 성공 시 **id=sessionId 로 Optimistic placeholder 카드 등록**
  - **폴링이 같은 sessionId 의 실 Agent 발견 시 자동 교체** (결정론적)

### 5.2 Open Folder API
- [ ] `lib/open-folder.ts` — OS 분기:
  - Windows: `child_process.exec(`start "" "${cwd}"`)`
  - macOS: `child_process.exec(`open "${cwd}"`)`
  - Linux: `child_process.exec(`xdg-open "${cwd}"`)`
- [ ] `app/api/open-folder/route.ts` — POST 핸들러
- [ ] **Detail drawer 헤더의 폴더 아이콘** 에 연결 (디자인 원본에 없는 신규 — COMPONENTS.md 참조)

### 5.3 Optimistic placeholder 카드 (ADR-014 + v3.4 Z)
- [ ] App 상태에 `placeholderCards: Array<{ id: string; name: string; cwd: string; model: string; expiresAt: number }>` 추가
  - **id = spawn 으로 보낸 sessionId (UUID)**
- [ ] spawn 응답 200 시 즉시 push (`expiresAt: Date.now() + 60_000`)
- [ ] 폴링 시 — 각 실 Agent 의 `sessionId` 와 placeholder.id 비교, 매칭되면 placeholder 제거
- [ ] 매 폴링마다 `Date.now() > expiresAt` 인 placeholder 청소 + toast

### 5.4 Demo 액션 — Toast + Activity only (ADR-013 T)
- [ ] dashboard-app 의 `onAction` 6개 분기 모두:
  - Demo toast 표시 ("Real control of running Claude Code processes is not available — this is a display-only action")
  - Activity 피드에 이벤트 push
  - **카드 status 안 변경** — `setAgents` 호출 X (디자인 원본 패턴 포기)
- [ ] 디자인 원본의 `setAgents(list => list.map(a => a.id === id ? { ...a, status: ... } : a))` 로직 제거
- [ ] 폴링이 다음 응답에서 실 status 반환 → UI 자동 갱신

### 5.5 통합 테스트 추가 — `docs/TESTING.md` §6.2 / §6.3
- [ ] `/api/spawn` — 9개 케이스 (Origin 부재/mismatch/정상, body 검증 5종, spawn 실패)
- [ ] `/api/open-folder` — 3개 케이스

**검증**:
- [ ] Spawn 시 새 터미널 창 뜸 + claude 실행
- [ ] **Optimistic placeholder 카드 즉시 등장**
- [ ] 30초 안에 실 jsonl 매칭 → placeholder 가 실 카드로 교체
- [ ] 30초 후에도 안 뜨면 placeholder 사라짐 + 안내 toast
- [ ] Detail drawer 헤더의 폴더 아이콘 클릭 → 에디터 / 파일 탐색기 뜸
- [ ] 다른 액션 클릭 시 demo toast 정상 노출

---

## Phase 6 — 마무리

- [ ] 에러 처리 정교화 (fs 오류 / API 오류 분기)
- [ ] 빌드 검증 (`npm run build`)
- [ ] 사용자용 `README.md` 작성 (설치/실행/스크린샷)
- [ ] **UI 컴포넌트 테스트 (RTL) 15개 시나리오** — `docs/TESTING.md` §7
- [ ] **전체 테스트 통과** — `npm test` 115개 케이스 모두 green
- [ ] **커버리지 임계값 통과** — `npm run test:coverage` lib/* 80%+, API 70%+
- [ ] **사람 눈 비주얼 검증** — `design-package` HTML 과 dev 서버 좌우 비교
- [ ] ESLint: Next.js 기본만 (Prettier 별도 도입 X)
- [ ] (선택) Electron 패키징 검토

---

## Phase 7 — MVP 이후 (이 문서 범위 밖)

- handoff 그래프를 `parentUuid` 체인 기반 실데이터로
- Activity 피드를 실 tool_use 이벤트로
- Claude Code SDK IPC 노출 시 Pause/Approve 활성화
- 통계 페이지 (일별 비용 차트, 모델별 분포)
- 다크 모드
- 비용 한도 알림
- 다중 머신 (~/.claude 원격 마운트)

---

## 단계별 산출물 요약

| Phase | 산출물 | 검증 |
|-------|--------|------|
| 0 | docs/ + CLAUDE.md | 사용자 검토 |
| 1 | 부팅 가능 | localhost:3000 베이지 |
| 2 | 타입 / 상수 | tsc 통과 |
| 3 | mock 디자인 픽셀 매칭 | 원본 HTML 과 시각 비교 |
| 4 | 실데이터 노출 | 본인 머신 데이터로 검증 |
| 5 | spawn / open folder 동작 | 새 터미널·에디터 띄움 |
| 6 | 프로덕션 빌드 | `npm run build` 성공 |

---

## 한 컴포넌트 = 한 커밋 워크플로우

1. **디자인 원본 JSX 끝까지 읽기** — 색·간격·라인 모두 메모
2. **TSX 로 옮기기** — style 객체 그대로, 타입만 추가
3. **App 에 마운트**
4. **mock 데이터로 시각 검증** — 원본 HTML 좌우 비교
5. **타입 + 콘솔 에러 0**
6. **커밋: `feat: port <component>`**
7. **다음**

> 한꺼번에 만들고 합치면 디버깅이 폭발합니다. 한 컴포넌트 = 한 커밋.
