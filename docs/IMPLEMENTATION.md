# 구현 계획

> 단계별 체크리스트. 각 Phase 끝나면 사용자 검토 → 다음.

---

## Phase 0 — 문서화 ✅

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

### 3.5 시간 범위 필터 ⭐ 신규 ✅ (commit `8d47581`)
- [x] `FilterRow` 옆에 세그먼트 컨트롤: `Last 7 days / Last 30 days / All time`
- [x] mock 데이터에서는 의미 없지만 UI 동작 확인

### 3.6 Demo 토스트 ⭐ 신규 ✅ (commit `0041cc4`)
- [x] `components/toast.tsx` — `useToast()` 훅 + `<ToastHost />`
- [x] 액션 버튼 클릭 시 토스트 표시
- [x] App 에 `<ToastHost />` 마운트

### 3.7 Empty / Loading / Error 상태 ⭐ 신규 ✅ (commit `2c490b1`)
- [x] `EmptyState` 6가지 케이스 분기 (UI_GUIDE 참조)
- [x] `LoadingState` 스켈레톤 6개
- [x] `ErrorState` Retry 버튼 포함

### 3.8 Tweaks (선택)
- [ ] `components/tweaks-panel.tsx` — `useTweaks`, `TweaksPanel`, 컨트롤들
- [ ] App 에서 `useTweaks(TWEAK_DEFAULTS)` 사용

**Phase 3 완료 기준**: 디자인 원본 HTML 과 우리 dev 서버를 좌우 비교해서 시각 차이 못 찾음.

---

## Phase 4 — 데이터 레이어

### 4.0 mock-data 제거 (ADR-014) ✅
- [x] `lib/mock-data.ts` 에서 **`MOCK_AGENTS` 제거**. ⚠️ `MOCK_ACTIVITY` 는 유지 — 사이드바 Activity 피드는 "demo data" 배지가 붙은 데모로 Phase 7 까지 존속 (사용자 결정).
- [x] `app/page.tsx` 에서 `MOCK_AGENTS` import 제거
- [x] `App` 시그니처에서 `initialAgents` 제거 → 자체 fetch (4.3)

### 4.1 메타 + 파서 + 추론기 + 캐시 ✅

> ⚠️ **실 포맷 반영** (라이브 로그 검증, 2026-05): DATA_MODEL 가정과 다른 점 —
> ① `tool_use`/`tool_result`/`thinking` 은 top-level 레코드가 아니라 `assistant.content`/`user.content` 블록에 임베드 → `edited`/`step` 은 content 블록에서 추출.
> ② 메타 레코드(permission-mode/ai-title/agent-name/mode/last-prompt/…)는 `cwd`/`entrypoint`/`timestamp` 가 null → `records[0]` 대신 필드 보유 레코드를 스캔.
> ③ 파일명 = sessionId (가장 신뢰).
> ④ `system` 레코드에 실제 error 없음 → error 판정은 `level==='error'` 로 엄격화.

- [x] `lib/sessions-meta.ts` — `SessionMeta`, `loadActiveSessions()`(sessionId 키 Map), `isProcessAlive()`(EPERM=alive)
- [x] `lib/status-deriver.ts` — `deriveStatus(records, meta?, now?)`. meta 없음/PID dead → idle. alive 면 **마지막 core 레코드**(timestamp 보유 assistant/user/system)로 substate. trailing 메타 레코드 무시.
- [x] `lib/claude-logs.ts` — `getClaudeHome()`, `projectsRootExists()`, `scanProjects()`(subagents/ skip), `readSession()`(readline 스트리밍, 라인별 parse 실패 skip), `sessionEntrypoint()`, `sessionToAgent()`
- [x] `lib/log-cache.ts` — mtime+size 캐시. 변경 없으면 캐시된 records 반환(재파싱 X, dev hit 로그). **status 는 캐시 안 함** — sessionToAgent 에서 매 요청 재추론. (byte-offset incremental 은 후속 최적화, 현재는 mtime 기준 whole-file 재읽기)

- [x] **단위 테스트 75 케이스** (스펙 80 중 format-path 5 ⏸) — 풀 fixtures(`test/fixtures/claude-home-{normal,empty,broken,bom,root}`), HOME override, mtime 캐시 무효화, BOM/깨진 jsonl 처리, vi.mock child_process platform branch 검증.

### 4.2 API Routes ✅
- [x] `app/api/agents/route.ts` — GET, `runtime='nodejs'`, `dynamic='force-dynamic'`, `Cache-Control: no-store`. since(7d/30d/all) cutoff + cli 필터 + lastTimestamp 정렬 + totals + `projectsFound` 플래그.
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

### 4.3 클라이언트 연결 ✅
- [x] `App` 이 mount 시 `/api/agents?since=` 호출 (page.tsx 는 `<App />` 만 렌더)
- [x] 응답을 App 의 `agents` 상태로 (initialAgents prop 폐기)
- [x] 30초 setInterval 폴링 (silent — 스켈레톤 깜빡임 없음, poll 실패는 stale 데이터 유지)
- [x] 시간 범위 토글 변경 시 다시 fetch (`useEffect([since])`)
- [x] LoadingState / ErrorState / EmptyState 분기 (`pickEmptyReason` 에 `projectsFound` 반영 → no-projects-folder vs no-cli-sessions)
- [x] ⭐ 사이드바 Hand-offs 그래프를 실 agent → 슬롯 매핑 (엣지는 데모, "demo data" 배지 유지)

### 4.4 API Route 통합 테스트 — `docs/TESTING.md` §6
- [x] `/api/agents` 8 통합 케이스 — fixtures + isProcessAlive mock + 가짜 시간(2026-06-01). cli 필터, since 3종, 정렬, totals, 깨진 jsonl 부분 통과.

**검증** — (전제 갱신: 이 머신은 CLI 세션 다수 — 7d 기본 2장, all 41장):
- [x] **토큰 합 일치**: 29c9699d 카드 `tokens` = JSONL `input+output` 합 = **1,637,860** 정확 일치
- [x] **비용 합 일치**: 동 세션 `cost` ≈ $1057 = output·cache_write·**cache_read(541M×$1.5)** 합산과 검산 일치. (장기 opus 세션은 cache_read 누적으로 실제 고비용 — DATA_MODEL "~$10" 추정이 낙관적이었던 것, 버그 아님)
- [x] **모델 표기**: `opus-4.7` / `sonnet-4.6`. `<synthetic>` 메시지는 표기에서 제외
- [x] **edited 카운트**: content 블록의 Edit/Write/MultiEdit/NotebookEdit 고유 file_path (단위 테스트로 검증)
- [x] **mtime 캐시**: 2번째 요청부터 재파싱 안 함 (dev 로그 `[log-cache] hit` 82건)
- [x] **시간 범위 토글**: 7d=2장 / all=41장 동작
- [x] **Status 추론 v2**: 라이브 세션(5bd0b4cc, pid 66365) → `running`, 종료 세션 → `idle`
- [x] **브라우저 시각 검증**: playwright-core + 시스템 Chrome 헤드리스로 6개 상태 캡처 — 7d 뷰(실 카드 2장, 합계 일치), All time(41장 + Hand-offs 6노드), detail drawer(실 통계 헤더), search-empty, LoadingState 스켈레톤, EmptyState(no-cli-sessions). 앱 런타임 에러 0.
- [ ] **alive 토글 검증**: 새 터미널 `claude` → 새 카드 `running`, `exit` → `idle` (수동)
- [ ] **EmptyState 케이스**: `~/.claude/projects/` 임시 rename 후 새로고침 (수동)

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

### 5.1 Spawn API — claude 인자 4종 활용 (v3.4) ✅

> 구현은 아래 코드 블록과 거의 동일. 차이: `lib/spawn.ts` 가 헬퍼(`sqPosix`/`dqWin`)를 export 가능한 형태로 정리하고, darwin osascript 호출에 `detached: true` + `unref()` 추가, linux 후보 순서 동일.


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

- [x] `app/api/spawn/route.ts` — POST. Origin 화이트리스트 + body 검증 5종(UUID/cwd 절대+isDir/name ≤100/model alias/task ≤500). `lib/spawn::spawnClaudeSession` 호출.

- [x] NewAgentModal: `crypto.randomUUID()` 로 sessionId 생성 → `/api/spawn` POST → 성공 시 부모(App)에 SpawnedAgent 전달, 부모가 placeholder 카드 push. 폴링이 같은 sessionId 발견 시 자동 교체.
  - ⚠️ UX 변경: "Repository" 드롭다운 → "Working directory" 절대경로 입력. "Start immediately" 토글 제거(spawn = 시작, 중복 의미).

### 5.2 Open Folder API ✅
- [x] `lib/open-folder.ts` — OS 분기. ⚠️ `exec` 대신 `spawn` + array args 사용(셸 인젝션 방지). darwin `open` / linux `xdg-open` / win32 `cmd /c start`.
- [x] `app/api/open-folder/route.ts` — POST. Origin + cwd(절대+isDir) 검증.
- [x] **Detail drawer 헤더 폴더 아이콘** — × 옆에 추가. 클릭 → POST /api/open-folder, 실패 시 toast.error.

### 5.3 Optimistic placeholder 카드 (ADR-014 + v3.4 Z) ✅
- [x] App 상태: `placeholders: Array<{ agent: Agent; expiresAt: number }>` — agent 는 status='running', sessionId=spawn 으로 보낸 UUID.
- [x] spawn 응답 200 시 부모 onCreate 가 placeholder push (`expiresAt: now + 60_000`).
- [x] `displayAgents = useMemo(...)` 로 agents + 미매칭 placeholders 머지 → 카드/사이드바/totals/EmptyState 모두 머지된 뷰 사용.
- [x] 폴링 reconciliation: load() 후 sessionId 매칭 placeholder 제거, 만료된 것 청소 + toast.error("didn't show up within 60s").
- 🔴 **버그 수정**: `load` useCallback 의 deps 에 `toast` 객체를 넣으면 매 렌더 새 객체 → effect 재실행 → setInterval 폭주(ERR_INSUFFICIENT_RESOURCES). `toastRef` 로 안정화.

### 5.4 Demo 액션 — Toast only ✅
- [x] `onAction` 의 6개 분기 setAgents 로직 완전 삭제, 토스트만 유지(폴링이 source of truth).
- [ ] Activity 피드 이벤트 push — 현 단계 생략(Activity 는 여전히 데모 MOCK_ACTIVITY).

### 5.5 통합 테스트 — `docs/TESTING.md` §6.2 / §6.3 ✅
- [x] `/api/spawn` — 10케이스 (Origin 부재/mismatch, body 검증 5종, 정상 path mocked spawnClaudeSession). 실 spawn 은 mock.
- [x] `/api/open-folder` — 4케이스 (Origin/cwd 검증 + 정상 path mocked openFolder).
- [x] lib 단위: spawn 10 (Win 4 + Darwin 2 + Linux 4 platform branch + arg quoting) + open-folder 4 (3 OS + 셸 메타문자 안전).
- [x] vitest.config 에 `@` alias 추가(라우트 import 호환).

**검증**:
- [x] **API 보안 표면 curl 검증**: spawn — Origin 누락/잘못 → 403, body 검증(UUID/model/cwd) → 400. open-folder — Origin 누락 → 403, 상대경로 → 400.
- [x] **UI 시각 검증**: NewAgentModal 새 폼(Working directory + Branch hint 변경, autoStart 제거), Detail drawer 헤더 폴더 버튼 위치(× 옆).
- [ ] ⏳ **수동**: Spawn 으로 실 터미널 + claude 실행, Optimistic placeholder 즉시 등장 → 30s 안에 실 jsonl 매칭 → 자동 교체. 60s 무응답 시 placeholder 사라짐 + toast. (UI 에서 "+ New agent" 클릭으로 검증)
- [ ] ⏳ **수동**: Detail drawer 폴더 아이콘 → Finder/탐색기 뜸.

---

## Phase 6 — 마무리 ✅ (핵심) / ⏳ (풀 테스트·Electron)

- [x] 에러 처리 — `/api/agents` try/catch 500, fs 부재 시 빈 응답 + `projectsFound:false`, `getCachedOrParse` 파일 단위 skip, spawn/open-folder 라우트 400/403/500 분기. Phase 4·5 에서 누적 적용 완료.
- [x] 빌드 검증 — `npm run build` 통과 (4 라우트: `/`, `/api/agents`, `/api/spawn`, `/api/open-folder`).
- [x] **사용자용 `README.md` 작성** — 상단 README + `docs/screenshots/dashboard.png`.
- [x] ESLint: Next.js `core-web-vitals` — `.eslintrc.json` 셋업, `npm run lint` warnings/errors 0.
- [x] **사람 눈 비주얼 검증** — Phase 4 verify 캡처 6장(7d/All/drawer/search-empty/loading/empty) + Phase 5 verify 2장(modal/folder btn). 디자인 원본과 시각 일치.
- [x] **UI 컴포넌트 테스트 (RTL) 15개 시나리오** — jsdom + RTL + userEvent. `test/components.test.tsx` 15 케이스 통과.
- [x] **풀 테스트 + 커버리지 임계값** — **112케이스 통과** (115 중 format-path 5 = 모듈 미존재 ⏸).
  - lib: pricing 12 + status-deriver 11 + sessions-meta 9 + claude-logs 16 + log-cache 6 + spawn 10 + open-folder 4 + format-time 7 = **75**
  - API: agents 8 + spawn 10 + open-folder 4 = **22**
  - UI/RTL: **15**
  - `npm run test:coverage`: lib 라인 **95.57%** / 함수 **100%** (목표 80/90), API 라인 **88-97%** (목표 70) — 모두 압도적 통과.
- [ ] ⏸ (선택) Electron 패키징 검토 — 보류.

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
