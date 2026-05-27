# PRD: Claude Agent Dashboard

## 한 줄 목표

**여러 Claude Code (CLI) 세션의 토큰·비용·활동을 한 화면에서 보고, 새 세션을 한 번에 띄울 수 있는 로컬 콘솔.**

---

## ⚠️ 솔직한 한계 — 먼저 읽기

이 프로젝트는 디자인 (`design-package/`) 이 약속하는 "**라이브 오케스트레이션 콘솔**" 의 시각적 인터페이스를 가지지만, **실제로 가능한 건 그보다 좁습니다**. 시작 전에 이 한계를 명확히 합니다.

### 가능한 것 (✅ 진짜 동작)
- **세션 시야** — `~/.claude/projects/**/*.jsonl` 의 모든 CLI 세션을 카드로 표시
- **토큰 / 비용 집계** — 세션별·전체 누적, 일별 추이
- **Status 추론 — 거의 정확함** (ADR-013 v2):
  - `~/.claude/sessions/<pid>.json` 로 살아있는 세션의 PID 를 알아내고 `process.kill(pid, 0)` 로 검증
  - alive 면 마지막 레코드 타입(`tool_use` / `tool_result` / `user` / `assistant end_turn`)으로 running vs waiting 구분
  - dead 면 idle
  - error 는 system 레코드의 error 단어로 부분 추론
- **+ New agent** → 실제로 새 터미널 창을 띄워 **`claude --name <X> --model <alias> --session-id <UUID> "<task>"`** 실행 (Windows / macOS / Linux 분기)
  - `--session-id` UUID 가 클라이언트의 Optimistic placeholder 와 결정론적으로 매칭 (cwd 휴리스틱 불필요)
  - task 텍스트가 새 세션의 첫 prompt 로 자동 전달됨 ⭐
- **Open folder** → `code <cwd>` 또는 OS 파일 탐색기
- **검색 / 필터 / 그리드/리스트/타임라인 전환**

### 불가능한 것 (❌ 디자인이 약속하지만 진짜로는 못 함)
- **Pause / Resume 구분** — SIGSTOP 으로 정지된 프로세스도 `process.kill(pid, 0)` 은 true. 정지 상태를 외부에서 식별 불가 → **MVP 에서 Pause 구분 포기**, alive 면 running/waiting 둘 중 하나
- **외부에서 살아있는 프로세스 Pause/Stop** — IPC 없음
- **Approve / Reject / Retry** — review 상태 외부 제어 인터페이스 없음
- **Chat 탭에서 진행 중 세션에 메시지 주입** — IPC 없음 (mock 응답)
- **`review` 상태 자동 추론** — JSONL 에 "human review 대기" 마커 없음 → mock 카드 전용
- **handoff 그래프의 의존성 데이터** — JSONL 에 에이전트 간 hand-off 메타가 없음 → mock

### 한계를 UI 에서 어떻게 다룰까 (v3.3)

- **진짜 동작하는 액션 (외부 효과 있음)**: 두 개뿐
  - `+ New agent` (spawn) — 새 터미널 + claude
  - drawer 헤더 폴더 아이콘 (Open folder) — OS 파일 탐색기
- **Demo 액션 (Pause / Approve / Reject / Retry / Start / Stop / Chat 송신)**:
  - 버튼은 디자인 원본 그대로 노출
  - 클릭 시 toast: *"Real control of running Claude Code processes is not available — this is a display-only action."*
  - **카드 status 는 변경 안 함** ⭐ (디자인 원본의 onAction 패턴 포기 — 폴링이 source of truth)
  - Activity 피드에는 이벤트만 기록 (시각적 피드백)
- **handoff 그래프 / Chat 탭 / Activity 피드**: mock 데이터. 카드 헤더에 **"demo data"** 라벨 작게 표시

---

## 사용자

**한 명** — 본인. 혼자 여러 Claude Code 세션을 동시에 돌리는 개발자.

- 멀티테넌트 아님 · 인증 없음 · 클라우드 없음
- 데이터는 본인 머신의 `~/.claude/projects/` 에서만 옴
- 다른 디바이스에서 접근 불가 (= 의도)

---

## 가치 제안 우선순위

가장 강력한 것부터:

1. **🥇 세션 시야 + 비용 추적** (확실하게 진짜로 동작)
   - "지금까지 Claude Code 에 얼마 썼지?"
   - "어떤 프로젝트가 토큰을 많이 먹나?"
   - "오늘 활동한 세션은 몇 개?"
2. **🥈 새 세션 빠르게 띄우기** (진짜 동작)
   - 템플릿 8개 + 폼 + 즉시 spawn — 터미널 명령 외울 필요 없음
3. **🥉 시각적 즐거움** (mock 인터랙션 포함)
   - 보기 좋은 콘솔. 실용성 외에 매일 열고 싶은 도구

> 진짜 가치 1·2 가 작동하면 MVP는 성공. 3 은 보너스.

---

## 데이터 범위

| 항목 | MVP 범위 |
|------|----------|
| 진입점 | **CLI 만** (`entrypoint === 'cli'`). Desktop / VSCode 세션 제외 |
| 시간 범위 | **3개 옵션** — `Last 7 days` (기본) · `Last 30 days` · `All time`. 세그먼트 컨트롤로 전환. |
| 단위 | **1 세션 (.jsonl 한 파일) = 1 카드**. subagent 는 detail drawer 안 sub-section |
| 모델 표기 | shortModel() 결과: `opus-4.7` / `sonnet-4.6` / `haiku-4.5` (실데이터 일치) |
| 상태 (status) | `running` / `waiting` / `error` / `idle` 만 실데이터에서 자동 추론. **`review` 는 데이터 신호 없어 실데이터 카드에 절대 안 나타남** — 코드는 디자인 원본 보존 위해 유지, mock-data 에서만 트리거. |
| 비고 | 사용자의 `~/.claude` 가 없거나 비어있으면 EmptyState 표시 |

---

## 핵심 기능 (MVP)

### 1. Agent 카드 그리드
- 1 세션 = 1 카드
- 카드 정보: 세션 이름 (slug), 모델, 추론된 status, 마지막 task 요약, 폴더 경로, branch, 토큰, 비용, 시작 시간, 마지막 활동 한 줄

### 2. 필터 + 검색 + 레이아웃
- 상태 칩 필터 (All / Running / Review / Waiting / Error / Idle)
- 텍스트 검색 (이름·id·task·repo·branch)
- 레이아웃 토글: **Grid / List / Timeline**
- **시간 범위 필터: Last 7 days (기본) / Last 30 days / All time** ← 새로 추가

### 3. 상단 요약 바
- 인사말 + 시계
- "X running · Y review · Z blocked" 한 줄 상태
- 오늘의 비용 / 편집한 파일 수 / Active/Total
- **+ New agent** 버튼 ← 진짜 동작

### 4. 우측 사이드바
- **Hand-off 그래프** — mock 그대로 (실데이터로 못 만듦. "demo data" 라벨)
- **Activity 피드** — mock + 사용자 액션(spawn 등)을 실 이벤트로 추가

### 5. 디테일 드로어 (카드 클릭)
- 슬라이드인 560px 우측 드로어
- 헤더: 이름·모델·repo·branch + 진행률·토큰·비용·파일 수·시작 시간
- 4 탭:
  - **Stream** — 실 JSONL 의 마지막 5~10 메시지를 다크 콘솔 표시
  - **Files** — JSONL 의 tool_use (Edit/Write) 에서 추출한 파일 경로 목록
  - **Chat** — mock 응답 (실 메시지 주입 불가 — UI 위에 "preview only" 라벨)
  - **Settings** — 세션 메타 표시 (편집 불가)
- 푸터 액션:
  - `+ Open folder in editor` — 실 동작 (`code <cwd>`)
  - 나머지 액션 (Pause / Approve / Reject / Retry / Start / Stop) — demo 라벨

### 6. New Agent 모달
- 8개 템플릿 (디자인 원본 그대로)
- 폼: 이름 · task · **cwd 선택 (기존 카드의 cwd 목록 select + "새 경로" 텍스트 입력)** · model
- 디자인 원본의 fake `acme/web` 같은 Repo select 는 제거. **실제 사용자의 cwd 만 노출**.
- "Spawn agent" 클릭 →
  - Windows: `child_process.spawn('cmd', ['/c', 'start', 'cmd', '/k', 'claude'], { cwd, detached: true })`
  - macOS: `osascript` 로 Terminal 새 창 + `cd <cwd>; claude`
  - Linux: `x-terminal-emulator` 등 + claude
  - 결과: 새 터미널이 뜨고 Claude Code 시작
- **Optimistic placeholder 카드 즉시 등장** (ADR-014): spawn 응답 200 시 그리드 최상단에 임시 카드. 30초 안에 실 jsonl 매칭 시 교체, 안 뜨면 자동 제거 + 안내 toast.
- **claude CLI 인자 (`--task` / `--model`) 지원 여부는 Phase 5 시작 시 검증** 필요. 안 지원하면 task 는 clipboard 복사로 대체.

### 6.1 Open folder 액션 ⭐ (디자인 원본에 없는 신규)
- **Detail drawer 헤더 — repo · branch 표시 옆에 작은 폴더 아이콘 추가** (Icon size 14, ghost 스타일).
- 클릭 시 `POST /api/open-folder` → OS 파일 탐색기 또는 에디터 (`code <cwd>` / `open <cwd>` / `xdg-open <cwd>`) 호출.
- 카드 자체에는 추가하지 않음 (디자인 원본 보존).

### 7. Tweaks 패널 (우측 하단)
- Layout / Density / Sidebar 토글 / Accent 색
- 우선순위: 낮음. 시간 부족 시 마지막에 또는 생략

---

## 빈 상태 / 로딩 상태 / 에러 상태

디자인 원본에 명시되지 않은 상태들. 이 PRD 에서 정의:

### EmptyState
- `~/.claude/projects/` 가 없거나 비어있음
- "No Claude Code sessions yet. Start one with the **+ New agent** button above, or run `claude` in any terminal." 메시지
- 큰 + 아이콘 + 톤은 디자인 톤 유지

### LoadingState
- 첫 fetch 동안 — 그리드 자리에 skeleton 카드 6개 (실제 카드 폭과 동일, 회색 placeholder)
- 30초 폴링 동안 — UI 변경 없음 (백그라운드)

### ErrorState
- API 가 fs 오류 등으로 실패 시
- 카드 영역에 "Couldn't read ~/.claude/projects. Check permissions." + Retry 버튼

---

## MVP 제외 사항

| 항목 | 이유 |
|------|------|
| 멀티 유저 / 인증 | 개인용 로컬 도구 |
| WebSocket / SSE | 30초 폴링으로 충분 |
| Pause / Resume / Kill 등 외부 프로세스 제어 | IPC 없음 |
| Chat 탭에서 실제 메시지 주입 | 불가능 |
| handoff 그래프 실데이터 연결 | JSONL 에 데이터 없음 |
| 비용 budget 강제 차단 | 표시만 |
| 모바일 반응형 | 1280px+ 데스크탑 |
| 다크 모드 | warm 라이트 단일 |
| 다국어 | 영어 (원본대로) |
| 노티피케이션 | 없음 |
| Electron 패키징 | 후순위 |

---

## 디자인 방향

- **Warm Studio 카드 + Operations 사이드패널** (chat1.md 합의)
- Claude 브랜드 톤: 베이지(`#f5f1e8`) · clay-orange(`#c96442`) · brown 텍스트(`#29261b`)
- 데스크탑 1280px+
- 애니메이션 4개: fade-in / slide-in / scale-in / pulse-dot

자세한 토큰은 [`UI_GUIDE.md`](./UI_GUIDE.md).

---

## 성공 기준

- ✅ 본인 `~/.claude/projects/` 의 CLI 세션이 빠짐없이 카드로 노출
- ✅ 카드의 토큰/비용이 JSONL `usage` 합과 일치 (오차 0)
- ✅ "+ New agent" → 실제로 새 터미널 창이 뜨고 `claude` 실행
- ✅ 30초 후 폴링이 새 jsonl 을 감지해 카드 등장
- ✅ "Last 7 days" 기본 필터로 카드 수가 폭발하지 않음
- ✅ 디자인 원본 HTML 과 시각 비교 시 차이 못 느낌 (mock 화면 기준)
- ✅ 빈 디렉토리에서 EmptyState 정상 노출
- ✅ macOS / Windows 양 OS 에서 spawn 작동

---

## 비-목표

- ❌ Claude Code 대체재 아님
- ❌ AI 마케팅 페이지 아님 — 매일 쓰는 콘솔
- ❌ 클라우드 SaaS 아님
- ❌ "진짜 라이브 제어" 콘솔 아님 (= 솔직한 한계 섹션 참조)
