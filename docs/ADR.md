# Architecture Decision Records

## 철학

> **디자인은 이미 결정됐다. 우리 일은 픽셀 퍼펙트하게 옮기는 것 + 실제 데이터를 꽂는 것 + 솔직하게 한계를 말하는 것.**

핵심 원칙:
- 디자인 원본 신뢰. 자체 판단으로 색·간격·폰트 변경 금지.
- 외부 의존성 최소화. Next.js + TypeScript 외 추가 없음.
- 로컬에서 돌아야 한다. 클라우드 의존 없음.
- 작동하는 최소 구현 우선. **할 수 없는 건 명시적으로 disabled / demo 처리.**

---

## ADR-001: Next.js 15 App Router 채택

**결정**: Next.js 15 App Router + React 18 + TypeScript strict

**이유**:
- 디자인이 React 18 기반 → 그대로 이식 가능
- App Router 의 API Route 가 `fs` 호출에 적합 (`~/.claude/` 읽기 필수)
- `next/font` 로 Geist · Geist Mono · Instrument Serif 자동 self-host
- 단일 프레임워크에서 서버 + 클라이언트 완결

**트레이드오프**:
- Vite + SPA 보다 약간 무거움 (다만 API Route 필요하므로 어차피 서버 필요)
- Server Components 이득은 거의 못 봄 (페이지 전체가 인터랙티브)

---

## ADR-002: Tailwind 미사용 — inline style + CSS variables 만

**결정**: 디자인 원본의 스타일링 방식 그대로 유지

**이유**:
- 디자인 원본 6개 JSX 가 `style={{...}}` + `var(--xxx)` 만 사용
- 토큰 한 곳만 바꾸면 전체 톤 일관 변경 — 핵심 가치
- Tailwind 변환 시 임의 라운딩 (예: `11.5px`, `13.5px` 같은 정밀 값 손실)
- Tweaks 패널의 accent 색 동적 변경이 CSS variable 로 자연 작동

**트레이드오프**:
- inline style 객체로 컴포넌트 코드 김
- 재사용 유틸 클래스 없음

---

## ADR-003: 데이터 소스 = ~/.claude/projects/**/*.jsonl

**결정**: Anthropic API 직접 호출 X · 클라우드 백엔드 X · 로컬 JSONL 만 읽음

**이유**:
- 유저가 명시: "개인 개발자 (혼자 여러 에이전트 돌림)"
- API 키 / 인증 / 호스팅 모두 불필요
- 토큰 사용량, 모델, 타임스탬프, cwd, gitBranch, tool 호출 등 필요한 데이터 다 있음

**트레이드오프**:
- Claude Code CLI 가 깔려있고 한 번이라도 써본 사람만 사용 가능 (타겟 유저 = 본인이라 OK)
- 다른 기기에서 못 봄 (로컬 한정)
- JSONL 포맷이 비공개라 Anthropic 이 바꾸면 깨질 수 있음 → `lib/claude-logs.ts` 한 곳에서만 파싱

---

## ADR-004: 컴포넌트 파일은 디자인 원본 JSX 와 1:1 매핑

**결정**: `dashboard-app.jsx → dashboard-app.tsx`, `dashboard-card.jsx → dashboard-card.tsx` 등 1:1 유지

**이유**:
- 원본의 분리가 책임 단위로 잘 쪼개져 있음
- 1:1 이면 grep 으로 위치 찾기 쉬움
- 미래 디자인 패치 머지 쉬움

**트레이드오프**:
- 한 파일에 5~6개 함수 컴포넌트 (React 베스트 프랙티스 일탈)

---

## ADR-005: 상태 관리는 useState + props drilling 만

**결정**: Context / Redux / Zustand 등 추가 안 함

**이유**:
- 디자인 원본이 이미 그렇게 작동
- 컴포넌트 트리 깊이 2~3 단계, drilling 비용 무시 가능
- 추가 의존성 없음

**트레이드오프**:
- 카드 100+ 시 메모이제이션 필요 → 그때 `React.memo` 도입

---

## ADR-006: 진짜 동작하는 액션은 "+ New agent" (= spawn) 만 ⭐ 갱신됨

**결정**: 외부 프로세스 제어가 가능한 것 / 불가능한 것을 명확히 구분.

| 액션 | 실제 동작 | UI 처리 |
|------|----------|--------|
| **+ New agent** | ✅ `spawn()` 으로 새 터미널 + `claude` 실행 | 정상 활성 |
| **Open folder** | ✅ OS 파일 탐색기/에디터 | 정상 활성 (drawer 헤더의 폴더 아이콘) |
| Pause | ❌ 외부에서 못 멈춤 | Demo toast + **Activity 피드 기록만**. ★ **카드 status 안 변경** — 다음 폴링이 source of truth |
| Approve / Reject | ❌ review IPC 없음 | 같음 |
| Retry | ❌ 같음 | 같음 |
| Start / Stop | ❌ 같음 | 같음 |
| Chat 송신 | ❌ 진행 중 세션에 메시지 주입 불가 | "Preview only" 라벨 + mock 응답. 카드 status 영향 없음 |

> ★ **중요 (v3.3 변경)**: 디자인 원본의 `onAction` 이 setAgents 로 status 를 변경하던 패턴을 **포기**. 클라이언트가 임의로 status 를 변경하면 30초 후 폴링이 실 status 로 되돌려 사용자 혼란. 폴링이 source of truth.

**이유**:
- Claude Code CLI 는 SIGCONT/SIGSTOP 처리에 대한 공식 보장 없음
- Windows 는 SIGSTOP 자체가 없음
- 외부 IPC (소켓, named pipe) 인터페이스 없음
- 정직하게 표시하는 게 거짓 약속보다 낫다

**트레이드오프**:
- 디자인의 멋진 인터랙션 중 일부가 mock 으로 남음 → PRD 의 "솔직한 한계" 섹션에서 명시
- 추후 Claude Code SDK 가 IPC 노출 시 점진적 활성화 가능

---

## ADR-007: SQLite 캐시 도입 보류

**결정**: better-sqlite3 미도입. JSONL 직접 파싱 + 메모리 캐시 (mtime 기반) 만 사용.

**이유**:
- 본인 머신 211 레코드 / 433KB 수준에서는 매 요청 파싱해도 ms 단위
- 의존성 추가 → 네이티브 빌드 → OS 호환성 문제
- mtime 캐시로 incremental 파싱하면 충분 (ADR-011 참조)

**트레이드오프**:
- 추후 수만 레코드면 도입 필요

---

## ADR-008: 다크 모드 / 모바일 / 다른 variant 제외

**결정**: warm 라이트 톤 단일 · 1280px+ 데스크탑만 · Operations / Atelier variant 무시

**이유**:
- chat1.md 에서 "A(Warm) 카드 + C(Operations) 사이드패널" 만 채택
- `variant-*.jsx` 는 비교 시안일 뿐 최종 아님
- 데스크탑 콘솔이라 모바일 우선순위 낮음

---

## ADR-009: 폰트는 next/font 로 self-host

**결정**: Google Fonts CDN 대신 `next/font/google` 의 Geist · Geist_Mono · Instrument_Serif

**이유**:
- next/font 가 자동 self-host + preload + CLS 방지
- 오프라인 사용 가능

---

## ADR-010: 에이전트 단위 = 1 세션(.jsonl) = 1 카드, CLI 전용 ⭐ 신규

**결정**:
- **1 세션 (`.jsonl` 파일 하나) = 1 Agent 카드**
- subagent (`subagents/agent-xxx.jsonl`) 는 부모 세션의 detail drawer 안 sub-section 으로 표시 (별도 카드 X)
- **`entrypoint === 'cli'` 인 세션만 표시**. Desktop / VSCode 세션 제외 → 카드의 "코딩 에이전트" 톤 일관성 유지

**이유**:
- 가장 단순하고 mock 18개 카드와 비슷한 규모가 나옴
- subagent 별도 카드 시 그래프 폭발 + handoff 의미 모호
- Desktop / VSCode 대화 세션은 "에이전트" 라기보다 일반 대화 → 디자인 톤과 안 맞음

**트레이드오프**:
- "이 세션 안에서 어떤 subagent 가 뭘 했나" 는 detail drawer 안에서만 보임
- Desktop / VSCode 사용자에게는 보이는 데이터가 줄어듬 (다만 타겟 = CLI 헤비유저)

---

## ADR-011: 폴링 + mtime 캐시 incremental 파싱 ⭐ 신규

**결정**:
- 클라이언트가 30초 간격 `/api/agents` 폴링
- 서버는 각 `.jsonl` 파일의 mtime 을 마지막 파싱 시점과 비교
- mtime 동일 → 캐시된 Agent 반환
- mtime 변경 → 마지막 파싱 offset 이후만 추가 파싱 → 캐시 머지

**이유**:
- 큰 세션 (수십 MB) 도 변경 없으면 zero-cost
- WebSocket / SSE 보다 단순
- 새 세션 (새 .jsonl 파일) 도 30초 안에 감지

**트레이드오프**:
- "진짜 실시간" 아님 (최대 30초 지연)
- 캐시 키는 in-memory — 서버 재시작 시 첫 fetch 가 느림 (수십 ms 수준이라 무시 가능)

---

## ADR-012: 기본 필터 = 최근 7일 ⭐ 신규

**결정**:
- 카드 그리드 기본 필터: `lastActiveAt >= now - 7days`
- 상단에 "Last 7 days · Last 30 days · All time" 세그먼트 컨트롤
- 모든 시간 범위에서 entrypoint==='cli' 필터는 항상 적용

**이유**:
- 1세션=1카드 + 모든 시간 범위면 수십~수백 카드 가능 → UX 깨짐
- 7일이 "현재 작업 중인 것들" 의 자연스러운 경계
- 디자인의 18개 mock 규모와 비슷한 시야

**트레이드오프**:
- "오래된 큰 비용 세션" 을 기본 시야에서 놓침 → All time 토글로 해결
- "Last 30 days" 같은 중간 옵션 필요 → 추가됨

---

## ADR-013: Status 추론 = PID alive + 마지막 레코드 + mtime (v2) ⭐ 갱신

**결정**: 단순 시간 / 단순 마지막 레코드 기반이 아니라 **3-신호 통합 휴리스틱** 사용.

### 데이터 소스 확장
- `~/.claude/projects/<dir>/<sessionId>.jsonl` — 메시지 흐름
- `~/.claude/sessions/<pid>.json` — **살아있는 세션 메타** (세션 종료 시 파일 삭제)
- `~/.claude/ide/<port>.lock` — IDE 통합 세션 lock (보조)

### 분류 알고리즘

```typescript
function deriveStatus(
  records: JsonlRecord[],
  meta: SessionMeta | undefined,    // sessions/<pid>.json 로드 결과
  now: number = Date.now()
): Status {
  // 1단계 — 살아있는가?
  const alive = meta != null && isProcessAlive(meta.pid);
  if (!alive) return 'idle';        // 세션 종료 = idle 로 통일

  // 2단계 — alive 일 때 마지막 레코드 타입 분석
  const last = records[records.length - 1];
  const ageSec = (now - parseTimestamp(last.timestamp)) / 1000;

  if (last.type === 'system' && /error|failed|crashed/i.test(JSON.stringify(last))) return 'error';
  if (last.type === 'assistant' && (last as AssistantMsg).message?.stop_reason === 'tool_use') return 'running';
  if (last.type === 'tool_result') return ageSec < 60 ? 'running' : 'waiting';
  if (last.type === 'user')        return ageSec < 60 ? 'running' : 'waiting';
  if (last.type === 'assistant' && (last as AssistantMsg).message?.stop_reason === 'end_turn') return 'waiting';
  return 'waiting';                 // alive 인데 패턴 매치 안 되면 default = waiting
}
```

**이유**:
- `process.kill(pid, 0)` 으로 alive 체크는 cross-platform 신뢰 가능 (Node.js Windows/macOS/Linux 모두 지원)
- `sessions/<pid>.json` 파일이 살아있는 세션만 만드는 강한 신호 → idle/alive 가장 정확
- alive 안에서 마지막 레코드 타입은 의미적으로 정확한 substate 신호
- mtime / ageSec 은 tool 실행 중인지 단순 대기인지 구분하는 보조 신호

**트레이드오프**:
- `'review'` 는 외부 신호 없어 자동 추론 불가 → **타입에는 유지하되 deriveStatus 가 절대 반환 안 함**. Phase 3 의 mock-data.ts 에서만 트리거. Phase 4 시작 시 mock-data 제거 → review 카드 실제로는 안 보임. 추후 SDK 가 IPC 노출 시 부활 여지로 코드는 보존.
- `'paused'` 구분 불가 — SIGSTOP 으로 정지된 프로세스도 alive 리턴. **MVP 에서 Pause/Resume 구분 포기** (alive 면 running/waiting 둘 중 하나로만)
- Subagent 의 독립적 살아있음 여부는 부모 PID 기준 가정 (불완전)
- `sessions/` 디렉토리에 stale 파일이 남는 경우 (드물지만) 가짜 alive 가능 → `isProcessAlive` 가 한번 더 검증해줌

### 새 모듈 시그니처

```typescript
// lib/sessions-meta.ts
export interface SessionMeta {
  pid: number;
  sessionId: string;
  cwd: string;
  startedAt: number;
  entrypoint: 'cli' | 'claude-desktop' | 'claude-vscode';
  version: string;
  kind: 'interactive' | 'agent';
}

export async function loadActiveSessions(): Promise<Map<string, SessionMeta>>;  // sessionId 키

// ★ EPERM 도 alive 로 처리 (권한 없어도 프로세스는 존재)
export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e: any) {
    return e?.code === 'EPERM';
  }
}
```

---

## ADR-014: Real data only + Optimistic placeholder ⭐ 신규

**결정**:
1. **MVP에서는 mock data toggle 도입하지 않음**. 카드는 100% 실 `~/.claude/projects/` 데이터로만 그림. 0개면 EmptyState, 1~2개면 그대로 노출.
2. **spawn 직후 그리드 최상단에 Optimistic placeholder 카드 즉시 삽입** — `id` 는 **클라이언트가 `crypto.randomUUID()` 로 생성한 UUID** (spawn 의 `--session-id` 와 동일 값). status='running', name=입력값, expiresAt=now+60s. 폴링 시 실 Agent 의 `sessionId === placeholder.id` 정확 매칭으로 자연 교체. **cwd 휴리스틱 매칭 불필요** (v3.4 — claude `--session-id` 인자 활용).
3. **mock-data.ts 의 라이프사이클** — Phase 3 (디자인 픽셀 검증) 단계에서만 작성·import. **Phase 4 시작 시 `lib/mock-data.ts` 완전 제거 + 모든 import 도 제거**. 이후 카드는 100% 실데이터 + Optimistic placeholder 만으로 채워짐.

---

## ADR-015: 로컬 API 보안 — host 127.0.0.1 + Origin 체크 ⭐ 신규

**결정**:
1. **Next.js 서버를 `127.0.0.1` 에만 바인딩** (loopback 외부 접근 차단):
   ```json
   // package.json
   "dev":   "next dev --hostname 127.0.0.1",
   "start": "next start --hostname 127.0.0.1"
   ```
2. **부수효과 있는 API (`/api/spawn`, `/api/open-folder`) 는 Origin 헤더 체크**:
   ```typescript
   const allowed = new Set([
     'http://localhost:3000', 'http://127.0.0.1:3000',
   ]);
   if (!allowed.has(req.headers.get('origin') ?? '')) return new Response('Forbidden', { status: 403 });
   ```
3. **`/api/agents` (GET, read-only) 는 Origin 체크 면제** — 외부 브라우저가 GET 만 한다고 위험 적음. (선택적으로 체크해도 됨)

**이유**:
- spawn API 는 사실상 RCE — 임의 명령으로 새 터미널 띄움 + 사용자 환경에서 실행
- 같은 머신의 다른 origin (악성 페이지) 이 `fetch('http://localhost:3000/api/spawn')` 호출 시 임의 명령 실행 가능 → CSRF
- 다른 머신은 host binding 으로 차단
- 같은 머신의 다른 origin 은 Origin 헤더로 차단
- 두 겹의 방어

**트레이드오프**:
- 같은 머신의 다른 호스트네임 (예: 회사 망의 .local DNS) 로 접근하던 케이스 막힘 → 의도된 (로컬 도구)
- Origin 헤더는 fetch 가 자동 설정. iframe / cross-tab 등 일부 케이스는 Origin 없을 수도 있어 체크 정책 명확히 ("absent or mismatch → 403")

---

## ADR-016: 테스트 전략 — Vitest + RTL + fixtures + 로컬 only ⭐ 신규

**결정**: 모듈별 테스트 케이스 명세는 [`TESTING.md`](./TESTING.md) 가 단일 출처.

핵심 결정 4가지:
1. **도구**: Vitest (단위/통합) + RTL + jsdom (UI). Playwright / E2E / 비주얼 회귀 도구 미도입.
2. **fixtures**: 격리된 `test/fixtures/claude-home/` 폴더 + 가짜 jsonl / sessions-meta. 본인 머신 ~/.claude 의존 0.
3. **CI**: 로컬 `npm test` 수동만. pre-commit hook / GitHub Actions / Chromatic 모두 미도입.
4. **커버리지**: `lib/*` 라인 80% + 함수 90%, API Routes 라인 70%, UI 컴포넌트 임계값 없음.

**케이스 규모**: 총 **115개** — lib/* 80 + API 20 + UI 15.

**이유**:
- 로컬 개인 도구 → CI 가 과한 투자. 본인이 푸시 전 한 번 `npm test` 면 충분.
- 본인 머신의 실 ~/.claude 의존 = 다른 머신 재현 불가 + 데이터 변동 위험 → 격리 fixtures 필수.
- 디자인 원본의 픽셀-퍼펙트 이식 + inline-style 패턴 → snapshot / 비주얼 회귀 도구 가치 적음. 사람 눈 비교가 더 정확.
- Playwright = OS 의존 spawn 검증에 불안정. 사람이 spawn 한 번 눌러 확인.

**트레이드오프**:
- spawn 명령의 OS별 실 동작은 자동 검증 안 됨 → 본인이 3 OS 에서 직접 한 번씩 실행해야 안심
- UI 회귀는 사람 눈 의존 → 디자인 변경 빈도 적은 MVP 에서는 OK, 장기적으론 위험
- 커버리지 목표가 강제 (`thresholds`) — 미달 시 `npm run test:coverage` 실패

**이유**:
- Mock toggle = 디자인 검증과 솔직한 한계 사이에서 어정쩡함. 화면 비어 보여도 "이게 실데이터" 가 더 정직.
- 디자인 픽셀 검증은 **Phase 3 의 단계 한정 mock-data.ts** (18 카드) 로 끝냄. 그 이후로는 mock 안 씀.
- Optimistic placeholder = spawn 직후 즉각 피드백. 사용자가 "spawn 됐는데 카드 어딨지?" 헷갈리는 케이스 차단.

**트레이드오프**:
- 본인 머신 CLI 세션이 1개뿐이면 그리드가 비어 보일 수 있음 → 솔직한 한계
- Placeholder 가 실 카드와 매칭되는 로직(cwd 매칭)이 정확하지 않으면 한 세션이 두 카드로 보일 수 있음 → cwd + 시간 window 매칭으로 mitigate
