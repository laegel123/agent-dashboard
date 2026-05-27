# 테스트 전략

> 단위 / 통합 / UI 테스트의 도구·전략·모듈별 케이스 명세. **테스트 환경은 격리된 fixtures**, 본인 머신의 ~/.claude 의존 0. CI 없음 — 로컬 `npm test` 수동만.

---

## 1. 도구

| 종류 | 도구 | 용도 |
|------|------|------|
| 단위 / 통합 | **Vitest** | `lib/*` 모듈 + API Routes |
| DOM 시뮬레이션 | **jsdom** | UI 컴포넌트가 document/window 가짜 환경에서 작동 |
| UI 컴포넌트 | **React Testing Library** (RTL) | 핵심 상호작용 15개 시나리오 |
| 비주얼 회귀 | **없음** | Phase 3 픽셀 검증은 사람 눈 좌우 비교 (ADR-016) |
| 커버리지 | **Vitest 내장** (`@vitest/coverage-v8`) | `npm run test:coverage` |

### 1.1 의존성 추가

```bash
npm install --save-dev vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

### 1.2 명령어 (`package.json` scripts)

```json
{
  "scripts": {
    "test":          "vitest run",
    "test:watch":    "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui":       "vitest --ui"
  }
}
```

---

## 2. 디렉토리 구조

```
test/
├── fixtures/
│   ├── claude-home/                    # 가짜 ~/.claude/ 구조
│   │   ├── projects/
│   │   │   ├── C--Users-test-app1/
│   │   │   │   └── 11111111-1111-1111-1111-111111111111.jsonl
│   │   │   └── C--Users-test-app2/
│   │   │       └── 22222222-2222-2222-2222-222222222222.jsonl
│   │   ├── sessions/
│   │   │   └── 12345.json              # alive 세션 메타
│   │   └── ide/
│   │       └── 54321.lock
│   └── records/                        # 단일 JSONL 레코드 fixture (deriveStatus 단위 테스트용)
│       ├── assistant-tool-use.json
│       ├── assistant-end-turn.json
│       ├── user-message.json
│       ├── tool-result.json
│       └── system-error.json
├── unit/                               # lib/* 단위 테스트
│   ├── pricing.test.ts
│   ├── status-deriver.test.ts
│   ├── sessions-meta.test.ts
│   ├── claude-logs.test.ts
│   ├── log-cache.test.ts
│   ├── spawn.test.ts
│   ├── open-folder.test.ts
│   ├── format-time.test.ts
│   └── format-path.test.ts
├── integration/                        # API Routes 통합 테스트
│   ├── api-agents.test.ts
│   ├── api-spawn.test.ts
│   └── api-open-folder.test.ts
├── components/                         # UI 컴포넌트 RTL 테스트
│   ├── app.test.tsx
│   ├── grid-card.test.tsx
│   ├── new-agent-modal.test.tsx
│   ├── detail-drawer.test.tsx
│   ├── sidebar.test.tsx
│   └── toast.test.tsx
└── setup.ts                            # Vitest 글로벌 설정 (jsdom + @testing-library/jest-dom)
```

---

## 3. 환경 변수 / HOME mock

`lib/claude-logs.ts::getClaudeHome()` 가 `os.homedir() + '/.claude'` 를 반환하므로, 테스트에서 환경 변수로 override:

```typescript
// test/setup.ts
process.env.HOME = path.join(__dirname, 'fixtures/claude-home');
process.env.USERPROFILE = process.env.HOME;   // Windows
```

또는 더 깔끔하게 **의존성 주입**:
```typescript
// lib/claude-logs.ts
export function getClaudeHome(homeDir = os.homedir()): string {
  return path.join(homeDir, '.claude');
}
// 테스트에서: getClaudeHome('test/fixtures/claude-home')
```

권장: **의존성 주입 방식**. 환경 변수는 cross-platform 차이가 있고 (Windows USERPROFILE), 병렬 테스트 시 race 가능성.

---

## 4. fixtures 작성 가이드

### 4.1 `claude-home/projects/<encoded-cwd>/<uuid>.jsonl`

각 라인 = 독립 JSON. 최소 fixture:
```jsonl
{"type":"user","timestamp":"2026-05-27T00:00:00.000Z","sessionId":"11111111-1111-1111-1111-111111111111","uuid":"u1","cwd":"C:\\Users\\test\\app1","entrypoint":"cli","gitBranch":"main","slug":"test-app1","message":{"content":[{"type":"text","text":"Hello"}]}}
{"type":"assistant","timestamp":"2026-05-27T00:00:01.000Z","sessionId":"11111111-1111-1111-1111-111111111111","uuid":"a1","message":{"model":"claude-sonnet-4-6","stop_reason":"end_turn","requestId":"req_1","usage":{"input_tokens":10,"output_tokens":20,"cache_creation_input_tokens":0,"cache_read_input_tokens":0}}}
```

### 4.2 `claude-home/sessions/<pid>.json`

```json
{
  "pid": 12345,
  "sessionId": "11111111-1111-1111-1111-111111111111",
  "cwd": "C:\\Users\\test\\app1",
  "startedAt": 1748304000000,
  "version": "2.1.149",
  "kind": "interactive",
  "entrypoint": "cli"
}
```

> ⚠️ PID `12345` 가 실제 alive 인지 테스트마다 다름 — `isProcessAlive` mock 필요. `vi.mock('@/lib/sessions-meta', ...)` 또는 의존성 주입.

### 4.3 fixtures 변형

| 시나리오 | 파일 |
|---------|------|
| 빈 디렉토리 | `claude-home-empty/` (디렉토리만, 안에 없음) |
| projects 부재 | `claude-home-no-projects/` (sessions/ 만) |
| sessions 부재 | `claude-home-no-sessions/` |
| 깨진 JSONL | `claude-home-broken-jsonl/projects/.../X.jsonl` 마지막 라인 잘림 |
| BOM 시작 | `claude-home-bom/` |
| 대용량 (10MB+) | `claude-home-large/` — 빌드 시 생성 (`scripts/generate-large-fixture.ts`) |

---

## 5. 모듈별 테스트 케이스 (lib/*)

### 5.1 `lib/pricing.ts`

```typescript
describe('shortModel', () => {
  it('claude-opus-4-7 → opus-4.7', () => { ... });
  it('claude-sonnet-4-6 → sonnet-4.6', () => { ... });
  it('claude-haiku-4-5 → haiku-4.5', () => { ... });
  it('full ID claude-haiku-4-5-20251001 → haiku-4.5', () => { ... });
  it('unknown format → 원본 그대로 반환', () => { ... });
});

describe('lookupPricing', () => {
  it('정확 매칭 → 해당 단가', () => { expect(lookupPricing('claude-opus-4-7')).toEqual({ input: 15, output: 75 }); });
  it('prefix 매칭 → claude-haiku-4-5-20251001 → haiku-4-5 단가', () => { ... });
  it('완전 알 수 없는 모델 → default 단가', () => { ... });
});

describe('calculateCost', () => {
  it('input + output 만 → 정확 계산', () => { ... });
  it('cache_creation 1.25× 가산', () => { ... });
  it('cache_read 0.10× 가산', () => { ... });
  it('0 토큰 → $0', () => { ... });
});
```

**총 케이스: 12**

### 5.2 `lib/status-deriver.ts`

```typescript
describe('deriveStatus', () => {
  it('빈 records → idle', () => { ... });
  it('meta undefined → idle', () => { ... });
  it('meta 있지만 PID dead → idle', () => { ... });
  it('alive + system error 단어 → error', () => { ... });
  it('alive + assistant stop_reason=tool_use → running', () => { ... });
  it('alive + tool_result + 시각 30초 전 → running', () => { ... });
  it('alive + tool_result + 시각 120초 전 → waiting', () => { ... });
  it('alive + user + 30초 전 → running', () => { ... });
  it('alive + user + 120초 전 → waiting', () => { ... });
  it('alive + assistant stop_reason=end_turn → waiting', () => { ... });
  it('alive + 알 수 없는 type (예: thinking) → waiting (default)', () => { ... });
});
```

**총 케이스: 11**

> 시간 의존 테스트는 `vi.useFakeTimers()` + `vi.setSystemTime(...)` 으로 결정론적 처리.

### 5.3 `lib/sessions-meta.ts`

```typescript
describe('loadActiveSessions', () => {
  it('sessions/ 디렉토리 없음 → 빈 Map', () => { ... });
  it('정상 1개 파일 → Map size 1, sessionId 키', () => { ... });
  it('정상 3개 파일 → Map size 3', () => { ... });
  it('깨진 JSON 1개 + 정상 2개 → Map size 2 + warn', () => { ... });
  it('빈 파일 → skip', () => { ... });
});

describe('isProcessAlive', () => {
  it('현재 프로세스 PID → true', () => { expect(isProcessAlive(process.pid)).toBe(true); });
  it('확실히 없는 PID 99999999 → false', () => { expect(isProcessAlive(99999999)).toBe(false); });
  it('EPERM 시뮬레이션 (mock) → true', () => {
    vi.spyOn(process, 'kill').mockImplementation(() => { const e: any = new Error('EPERM'); e.code = 'EPERM'; throw e; });
    expect(isProcessAlive(1)).toBe(true);
  });
  it('ESRCH 시뮬레이션 → false', () => { ... });
});
```

**총 케이스: 9**

### 5.4 `lib/claude-logs.ts`

```typescript
describe('scanProjects', () => {
  it('빈 projects/ → []', () => { ... });
  it('정상 2개 프로젝트 → 2개 jsonl 경로', () => { ... });
  it('subagents/ 폴더 무시 (메인 .jsonl 만 반환)', () => { ... });
});

describe('readSession', () => {
  it('정상 jsonl → 모든 레코드 파싱', () => { ... });
  it('마지막 라인 깨진 jsonl → 그 라인 skip + 나머지 정상', () => { ... });
  it('BOM 시작 → 첫 라인도 정상 파싱', () => { ... });
  it('완전 빈 파일 → []', () => { ... });
});

describe('sessionToAgent', () => {
  it('모든 필드 정확 산출 (id/name/task/repo/tokens/cost/model 등)', () => { ... });
  it('assistant 레코드 0 → tokens=0, cost=0', () => { ... });
  it('slug 없음 → firstUserText 80자 cut', () => { ... });
  it('gitBranch 없음 → branch="—"', () => { ... });
  it('cwd 절대경로 → repo 마지막 2단계 추출', () => { ... });
  it('edited = Edit/Write/MultiEdit/NotebookEdit 고유 file_path 수', () => { ... });
  it('tool_use Bash 만 있음 → edited=0', () => { ... });
  it('activeSessions Map 에 매칭 X → status=idle', () => { ... });
  it('activeSessions Map 매칭 + alive → 적절한 status', () => { ... });
});
```

**총 케이스: 16**

### 5.5 `lib/log-cache.ts`

```typescript
describe('getCachedOrParse', () => {
  it('첫 호출 (캐시 miss) → 파싱 + 저장', () => { ... });
  it('두 번째 호출, mtime+size 동일 → 재파싱 안 함', () => { ... });
  it('mtime 같은데 size 변경 → invalidate, 재파싱', () => { ... });
  it('mtime 변경 → invalidate', () => { ... });
  it('파싱 중 에러 → console.warn + undefined 반환 (caller 가 skip)', () => { ... });
  it('status 는 캐시 안 함 → 매번 deriveStatus 재호출', () => { ... });
});
```

**총 케이스: 6**

### 5.6 `lib/spawn.ts`

`child_process.spawn` 을 `vi.mock` 으로 가로채 호출 인자만 검증.

```typescript
describe('spawnClaudeSession', () => {
  describe('Windows', () => {
    beforeEach(() => { vi.stubGlobal('process', { ...process, platform: 'win32' }); });
    it('cmd /c start "" cmd /k claude --name ... 형태', () => { ... });
    it('name 에 공백 포함 → "" quote', () => { ... });
    it('task 에 따옴표 포함 → \\" escape', () => { ... });
    it('detached: true + stdio: ignore + unref() 호출', () => { ... });
  });

  describe('macOS', () => {
    beforeEach(() => { vi.stubGlobal('process', { ...process, platform: 'darwin' }); });
    it('osascript 의 do script 문자열에 cd \\"path\\" && claude ... 포함', () => { ... });
    it('cwd 의 따옴표 escape', () => { ... });
  });

  describe('Linux', () => {
    beforeEach(() => { vi.stubGlobal('process', { ...process, platform: 'linux' }); });
    it('TERMINAL 환경변수 우선', () => { ... });
    it('gnome-terminal --working-directory ... -- claude ... 형태', () => { ... });
    it('모든 후보 실패 → throw', () => { ... });
  });
});
```

**총 케이스: 10**

### 5.7 `lib/open-folder.ts`

```typescript
describe('openFolder', () => {
  it('Windows → start "" "<cwd>" 호출', () => { ... });
  it('macOS → open "<cwd>" 호출', () => { ... });
  it('Linux → xdg-open "<cwd>" 호출', () => { ... });
  it('cwd 가 존재하지 않으면 throw', () => { ... });
});
```

**총 케이스: 4**

### 5.8 `lib/format-time.ts`

```typescript
describe('relativeTime', () => {
  it('30초 이내 → "just now"', () => { ... });
  it('1분 → "1m"', () => { ... });
  it('59분 → "59m"', () => { ... });
  it('1시간 → "1h"', () => { ... });
  it('1시간 30분 → "1h 30m"', () => { ... });
  it('미래 시각 → "just now" (clamp)', () => { ... });
});

describe('formatClock', () => {
  it('ISO 타임스탬프 → "HH:MM" 로컬 타임존', () => { ... });
});
```

**총 케이스: 7**

### 5.9 `lib/format-path.ts`

```typescript
describe('normalizeCwd', () => {
  it('Windows backslash → forward slash', () => { ... });
  it('trailing slash 제거', () => { ... });
  it('case insensitive 비교 가능', () => { ... });
  it('상대 경로 → 절대 경로', () => { ... });
  it('".." 해석', () => { ... });
});
```

**총 케이스: 5**

---

## 6. API Routes 통합 테스트 (`test/integration/`)

Next.js App Router 의 route handler 를 직접 import 해서 `Request` 객체로 호출.

### 6.1 `/api/agents`

```typescript
describe('GET /api/agents', () => {
  beforeEach(() => { setClaudeHome('test/fixtures/claude-home'); });

  it('빈 디렉토리 → { agents: [], totals: zeros }', () => { ... });
  it('entrypoint=cli 만 통과 (desktop 세션 제외)', () => { ... });
  it('?since=7d (default) → 최근 7일만', () => { ... });
  it('?since=30d → 최근 30일', () => { ... });
  it('?since=all → 전체', () => { ... });
  it('lastTimestamp 내림차순 정렬', () => { ... });
  it('totals 정확 (cache 제외 tokens, cache 포함 cost)', () => { ... });
  it('일부 jsonl 깨짐 → 정상 파일만 반환 + warn', () => { ... });
});
```

**총 케이스: 8**

### 6.2 `/api/spawn`

```typescript
describe('POST /api/spawn', () => {
  it('Origin 헤더 부재 → 403', () => { ... });
  it('Origin mismatch → 403', () => { ... });
  it('Origin http://localhost:3000 → 통과', () => { ... });
  it('Origin http://127.0.0.1:3000 → 통과', () => { ... });
  it('body 의 cwd 가 존재하지 않는 디렉토리 → 400', () => { ... });
  it('body 의 sessionId 가 UUID 형식 아님 → 400', () => { ... });
  it('body 의 model 이 sonnet/opus/haiku 아님 → 400', () => { ... });
  it('정상 body + Origin → spawnClaudeSession 호출 + 200', () => { ... });
  it('spawn 실패 → 500 + 메시지', () => { ... });
});
```

**총 케이스: 9**

### 6.3 `/api/open-folder`

```typescript
describe('POST /api/open-folder', () => {
  it('Origin 체크', () => { ... });
  it('cwd 존재 검증 후 openFolder 호출', () => { ... });
  it('정상 → 200', () => { ... });
});
```

**총 케이스: 3**

---

## 7. UI 컴포넌트 테스트 (`test/components/`)

> RTL 의 `render`, `screen`, `fireEvent`, `userEvent` 사용. **15개 핵심 시나리오만** — 디자인 픽셀 검증은 사람 눈 비교.

```typescript
describe('App', () => {
  it('1. agents prop 18개 → 카드 18개 렌더', () => { ... });
  it('2. 검색어 "refactor" 입력 → filtered 줄어듦', () => { ... });
  it('3. "Running" 칩 클릭 → running 상태 카드만', () => { ... });
  it('4. 레이아웃 grid → list 토글 → ListBody 렌더', () => { ... });
});

describe('GridCard', () => {
  it('5. 카드 클릭 → onOpen(id) 호출', () => { ... });
  it('6. 액션 버튼 클릭 → 카드 onOpen 호출 안 됨 (stopPropagation)', () => { ... });
});

describe('NewAgentModal', () => {
  it('7. name + task 입력 → spawn 버튼 enabled', () => { ... });
  it('8. name 또는 task 비어있음 → spawn 버튼 disabled', () => { ... });
});

describe('DetailDrawer', () => {
  it('9. agent=null → 안 렌더', () => { ... });
  it('10. Files 탭 클릭 → Files 콘텐츠 노출', () => { ... });
  it('11. Chat 탭 인풋에 Enter → onChatSend 호출', () => { ... });
});

describe('CardActions', () => {
  it('12. status=review → Reject + Approve 버튼 노출', () => { ... });
});

describe('FilterRow', () => {
  it('13. 검색어 X 버튼 클릭 → query 비움', () => { ... });
});

describe('Sidebar', () => {
  it('14. handoff 그래프 노드 클릭 → onSelectAgent(id)', () => { ... });
});

describe('Toast', () => {
  it('15. toast.demo() 호출 → 표시 + 3초 후 자동 dismiss', () => { ... });
});
```

**총 케이스: 15**

---

## 8. 커버리지 목표

| 영역 | 목표 |
|------|------|
| `lib/*` 라인 | **80%** |
| `lib/*` 함수 | **90%** |
| `app/api/*` 라인 | **70%** |
| 컴포넌트 라인 | 측정만 — 임계값 없음 |

`vitest.config.ts` 에 `coverage.thresholds` 설정:
```typescript
coverage: {
  provider: 'v8',
  thresholds: {
    'lib/**/*.ts': { lines: 80, functions: 90 },
    'app/api/**/*.ts': { lines: 70 },
  },
}
```

목표 미달 시 `npm test` 자체는 통과하지만 `npm run test:coverage` 가 실패.

---

## 9. 시간 / 타임존 / OS 처리

### 시간
- `vi.useFakeTimers()` + `vi.setSystemTime('2026-05-27T12:00:00Z')` 로 결정론
- `deriveStatus`, `relativeTime`, `placeholder TTL` 모두 시간 의존 → fake timer 필수

### 타임존
- 테스트 환경에서 `process.env.TZ = 'UTC'` 강제 (다른 머신에서 재현 가능)
- `relativeTime` 은 타임존 무관 (ms 차이 계산)
- `formatClock` 만 타임존 영향

### OS
- `vi.stubGlobal('process', { ...process, platform: 'win32' })` 패턴
- `spawn.test.ts` 의 OS별 describe 블록마다 platform stub

---

## 10. 통계 및 총 케이스

| 모듈 | 케이스 수 |
|------|---------|
| pricing | 12 |
| status-deriver | 11 |
| sessions-meta | 9 |
| claude-logs | 16 |
| log-cache | 6 |
| spawn | 10 |
| open-folder | 4 |
| format-time | 7 |
| format-path | 5 |
| **lib/* 합** | **80** |
| /api/agents | 8 |
| /api/spawn | 9 |
| /api/open-folder | 3 |
| **API 합** | **20** |
| UI 컴포넌트 | 15 |
| **총합** | **115** |

---

## 11. 안 하는 것 (트레이드오프)

- ❌ **E2E (Playwright)** — 실 spawn 이 OS 의존이라 CI 환경에서 안정성 낮음. 사람이 수동 검증.
- ❌ **비주얼 회귀 (screenshot diff)** — 디자인 픽셀 검증은 Phase 3 의 디자인 원본 좌우 비교로 충분.
- ❌ **Mutation testing** — 과한 투자.
- ❌ **Snapshot 테스트** — UI 가 디자인 픽셀-퍼펙트라 snapshot 이 의미 적음. 명시적 어설션만.
- ❌ **CI 자동화** — 로컬 도구. 수동 `npm test` 만.

---

## 12. 검증 워크플로우

1. **각 모듈 구현 → 단위 테스트 작성 → 통과 확인 → 커밋** (TDD 권장)
2. **Phase 4 끝나면** `npm test` 전체 통과 + `npm run test:coverage` 임계값 통과
3. **Phase 5 끝나면** 통합 테스트 추가 + OS별 spawn 케이스 통과
4. **Phase 6 끝나면** UI 컴포넌트 15개 통과 + 사람 눈으로 디자인 원본 비교 OK
