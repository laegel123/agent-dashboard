# 데이터 모델

> 디자인 mock (18개 가공된 코딩 에이전트) 을 실제 `~/.claude/projects/**/*.jsonl` 로그에 어떻게 매핑할지 정리.

---

## 1. 원천: Claude Code 로컬 로그

### 1.1 디렉토리 구조

```
~/.claude/                               (Windows: C:\Users\<user>\.claude\)
├── projects/                            ★ 메인 데이터 소스 — 메시지 흐름
│   ├── C--Users-oneoone-...-agents/
│   │   ├── e0e7e075-4249-...jsonl       ← 한 세션 = 한 파일 (★ 1 카드 단위)
│   │   └── e0e7e075-.../subagents/
│   │       ├── agent-xxx.jsonl          ← 서브에이전트 (detail drawer 안에서 표시)
│   │       └── agent-xxx.meta.json
│   └── ...
├── sessions/                            ★ 살아있는 세션 메타 — Status 추론 핵심
│   └── <pid>.json                       파일 존재 = alive (종료 시 삭제)
│                                        { pid, sessionId, cwd, startedAt,
│                                          entrypoint, version, kind }
├── ide/                                 IDE 통합 세션 lock (보조)
│   └── <port>.lock                      { pid, workspaceFolders, ideName, ... }
├── history.jsonl                        (글로벌 명령 히스토리 — 사용 안 함)
└── settings.json
```

### 1.1.1 sessions/ 파일 예시

```json
// ~/.claude/sessions/6068.json
{
  "pid": 6068,
  "sessionId": "149ad4a3-f1b4-4999-8282-732b4b3feba7",
  "cwd": "C:\\Users\\oneoone\\Documents\\workspace\\p\\agents",
  "startedAt": 1779852625737,
  "version": "2.1.149",
  "peerProtocol": 1,
  "kind": "interactive",
  "entrypoint": "claude-desktop"
}
```

**핵심**:
- 세션이 실행 중일 때만 파일이 존재. 종료 시 자동 삭제.
- `sessionId` 가 `.jsonl` 의 sessionId 와 정확히 매칭됨.
- `entrypoint` 가 여기에도 있어서 CLI 필터 보조 가능.
- 파일명이 PID — `process.kill(pid, 0)` 으로 진짜 alive 인지 한번 더 검증.

**프로젝트 디렉토리명 규칙**: 절대 경로의 `\` 와 `:` 를 `-` 로 치환.
- `C:\Users\oneoone\Documents\workspace\p\agents` → `C--Users-oneoone-Documents-workspace-p-agents`
- 정확한 역변환 어려움 → JSONL 안의 `cwd` 필드 신뢰

### 1.2 JSONL 레코드 타입 (25종 발견)

각 줄이 독립된 JSON 오브젝트. `type` 필드로 종류 구분. **실데이터에서 발견된 type 값 25종**:

**우리가 의존하는 핵심 5종** (deriveStatus / 토큰 합산 / 파일 추출에 사용):
- `assistant` — 모델 응답 + usage
- `user` — 사용자 입력
- `tool_use` — 툴 호출
- `tool_result` — 툴 결과
- `system` — 시스템 메시지 (error 감지용)

**메타 / 부수 타입 20종** (타입 정의에는 명시하되 처리 안 함):
- `attachment`, `ai-title`, `thinking`, `text`, `message`, `direct`
- `permission-mode`, `command_permissions`, `task_reminder`
- `skill_listing`, `tool_reference`, `hook_non_blocking_error`
- `plan_mode`, `plan_mode_exit`
- `messages_changed`, `model_changed`
- `queue-operation`, `create`, `update`, `last-prompt`, `deferred_tools_delta`

```typescript
// 모든 type 값을 union 으로 정의
type RecordType =
  | 'assistant' | 'user' | 'tool_use' | 'tool_result' | 'system'
  | 'attachment' | 'ai-title' | 'thinking' | 'text' | 'message' | 'direct'
  | 'permission-mode' | 'command_permissions' | 'task_reminder'
  | 'skill_listing' | 'tool_reference' | 'hook_non_blocking_error'
  | 'plan_mode' | 'plan_mode_exit'
  | 'messages_changed' | 'model_changed'
  | 'queue-operation' | 'create' | 'update' | 'last-prompt' | 'deferred_tools_delta';

type JsonlRecord =
  | UserMsg | AssistantMsg | ToolUseMsg | ToolResultMsg | SystemMsg
  | { type: Exclude<RecordType, 'assistant' | 'user' | 'tool_use' | 'tool_result' | 'system'> } & BaseRecord;

interface BaseRecord {
  type: RecordType;
  timestamp: string;          // ★ ISO-8601 UTC 만 (실측 100%: "2026-05-27T00:43:48.496Z")
  sessionId: string;          // UUID
  uuid: string;               // 레코드 UUID
  userType?: 'external' | 'internal';
  entrypoint?: 'cli' | 'claude-desktop' | 'claude-vscode';   // ★ MVP: 'cli' 만 통과
  cwd?: string;               // 절대 경로
  version?: string;
  gitBranch?: string;
  slug?: string;
  parentUuid?: string;
}

interface AssistantMsg extends BaseRecord {
  type: 'assistant';
  message: {
    model: string;            // 'claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001' 등
    stop_reason: 'tool_use' | 'end_turn' | 'max_tokens';
    requestId: string;
    usage: {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens: number;
      cache_read_input_tokens: number;
      server_tool_use?: { web_search_requests?: number; web_fetch_requests?: number };
      cache_creation?: { ephemeral_1h_input_tokens?: number; ephemeral_5m_input_tokens?: number };
      service_tier?: 'standard' | 'priority';
      // ★ 추가 발견 필드 (비용 계산엔 영향 없지만 타입에 명시)
      inference_geo?: string;
      iterations?: Array<{ input_tokens?: number; output_tokens?: number; [k: string]: any }>;
      speed?: 'standard' | string;
    };
    content: Array<TextBlock | ToolUseBlock>;
  };
}

interface ToolUseMsg extends BaseRecord {
  type: 'tool_use';
  name: string;               // 'Edit'/'Write'/'MultiEdit'/'NotebookEdit'/'Read'/'Bash'/'AskUserQuestion'/'Skill'/'ToolSearch'/MCP tools 등
  input?: { file_path?: string; [k: string]: any };
}
```

### 1.3 실측 데이터 (참고)

| 프로젝트 | 세션 ID 앞 8자 | 레코드 | 모델 | entrypoint |
|---------|--------------|------|------|-----------|
| agents | `e0e7e075` | 26 | claude-sonnet-4-6 | **claude-desktop** ← MVP 제외 |
| overseas-cost-app | `06db7f0c` | 37 | 혼합 | 혼합 |
| overseas-app | `41c66f9b` | 75 | claude-opus-4-7 | **cli** ← MVP 포함 |

→ 본인 머신 기준 **CLI 세션이 1개뿐**. 카드가 1장만 나올 수 있음. EmptyState 또는 minimal-state 표시 잘 작동해야 함.

---

## 2. 도메인 타입 (디자인이 기대하는 형태)

```typescript
// lib/types.ts

export type Status = 'running' | 'waiting' | 'review' | 'error' | 'idle';
//                  ★ review 운명:
//                    - 디자인 원본 보존 위해 타입에 유지
//                    - deriveStatus v2 가 절대 'review' 반환 안 함 (실데이터 자동 추론 신호 없음)
//                    - Phase 3 의 mock-data.ts 에서만 트리거됨
//                    - Phase 4 시작 시 mock-data.ts 제거 → review 카드 실제로 절대 안 나타남
//                    - 추후 Claude SDK 가 review IPC 노출 시 부활 여지로 코드는 보존

export interface Agent {
  id: string;                  // sessionId.slice(0, 8) — 'e0e7e075'
  name: string;                // slug 또는 폴더명 마지막 단계
  status: Status;
  task: string;                // slug 또는 첫 user 메시지 80자
  repo: string;                // 폴더명 마지막 2단계 'p/agents'
  branch: string;              // gitBranch || '—'
  step: number;                // 휴리스틱 — 완료된 tool_use 수 (cap 10)
  steps: number;               // 휴리스틱 — max(8, step+2). 정확도 보장 X
  tokens: number;              // ★ input + output 합. cache 제외 (카드 표시용)
  cost: number;                // ★ USD. cache 포함 (lookupPricing 이 캐시 가산)
  model: string;               // 짧은 표기 'opus-4.7' (shortModel 변환)
  edited: number;              // ★ tool_use 중 Edit|Write|MultiEdit|NotebookEdit 의 고유 file_path 수
  started: string;             // 사람이 읽는 상대 시간 '14m', 'just now', '—'
  last: string;                // 마지막 액션 요약 한 줄
  deps?: string[];             // (옵션 — handoff. 실데이터에선 비어있음)

  // ★ 메타 — 디자인에 없지만 우리는 필요
  sessionId: string;           // 풀 UUID
  filePath: string;            // 절대 경로
  cwd: string;                 // JSONL 의 cwd
  firstTimestamp: number;      // ms epoch
  lastTimestamp: number;       // ms epoch — Status 추론용
  entrypoint: 'cli';           // 항상 'cli' (필터로 걸러서 진입)
}

export interface ChatMsg { role: 'user' | 'agent'; text: string; }

export interface ActivityEvent {
  id: number;
  t: string;                   // 'HH:MM' (로컬 타임존)
  who: string;                 // agent.name
  what: string;
  tone: 'edit' | 'pr' | 'review' | 'error' | 'ok' | 'flag' | 'spawn' | 'progress' | 'msg' | 'action';
}
```

---

## 3. Status 추론 휴리스틱 v2 (ADR-013)

> **3-신호 통합**: PID alive + 마지막 레코드 타입 + 시간(ageSec). 시간 단독으로는 부정확.

### 입력
- `records: JsonlRecord[]` — 해당 세션 jsonl 의 전체 레코드
- `meta: SessionMeta | undefined` — `~/.claude/sessions/<pid>.json` 에서 sessionId 로 찾은 매칭 (없을 수도 있음)

### 알고리즘

```typescript
// lib/status-deriver.ts
import { isProcessAlive, type SessionMeta } from './sessions-meta';

export function deriveStatus(
  records: JsonlRecord[],
  meta: SessionMeta | undefined,
  now: number = Date.now()
): Status {
  if (records.length === 0) return 'idle';

  // ── 1단계: 살아있는가? ───────────────────────────────
  const alive = meta != null && isProcessAlive(meta.pid);
  if (!alive) return 'idle';     // sessions/ 에 파일 없거나 PID dead

  // ── 2단계: alive 면 마지막 레코드 타입으로 substate ─
  const last = records[records.length - 1];
  const ageSec = (now - parseTimestamp(last.timestamp)) / 1000;

  if (last.type === 'system' && /error|failed|crashed/i.test(JSON.stringify(last))) return 'error';

  if (last.type === 'assistant' && (last as AssistantMsg).message?.stop_reason === 'tool_use') {
    return 'running';            // 툴 실행 중
  }

  if (last.type === 'tool_result') return ageSec < 60 ? 'running' : 'waiting';

  if (last.type === 'user')        return ageSec < 60 ? 'running' : 'waiting';

  if (last.type === 'assistant' && (last as AssistantMsg).message?.stop_reason === 'end_turn') {
    return 'waiting';            // 사용자 입력 대기
  }

  return 'waiting';              // alive 인데 패턴 매치 안 됨 = 기본 waiting
}
```

### 신호 우선순위 표

| PID 신호 | 마지막 레코드 | ageSec | 결과 |
|---------|--------------|-------|------|
| alive | `assistant` + `stop_reason: tool_use` | 임의 | **running** (툴 실행 중) |
| alive | `tool_result` | < 60 | **running** |
| alive | `tool_result` | ≥ 60 | **waiting** |
| alive | `user` | < 60 | **running** (응답 생성 중) |
| alive | `user` | ≥ 60 | **waiting** |
| alive | `assistant` + `stop_reason: end_turn` | 임의 | **waiting** (사용자 입력 대기) |
| alive | `system` + error 단어 | 임의 | **error** |
| dead / 매칭 없음 | 임의 | 임의 | **idle** |

### 못 잡는 것 (의도된 한계)

- **`review`** — JSONL 에 "human review 대기" 명시 마커 없음. mock 카드 전용 (ADR-013 트레이드오프).
- **`paused`** — SIGSTOP 으로 정지된 프로세스도 `process.kill(pid, 0)` 은 true 반환. SIGSTOP/CONT 구분 cross-platform 불가능. **MVP 에서 Pause 구분 포기**.
- **Subagent alive** — 부모 PID 기준 가정. 독립 프로세스로 실행되는 경우 추적 불가.

### 휴리스틱 검증 방법

1. 본인 머신의 `~/.claude/sessions/` 와 `~/.claude/projects/` 동시 확인
2. 살아있는 세션의 sessionId 가 sessions/ 에 매칭되는지
3. 카드의 status 가 직관과 안 맞으면 ageSec 임계값(현재 60초) 조정

---

## 4. JSONL → Agent 변환 (lib/claude-logs.ts)

### 4.1 메인 함수

```typescript
import type { SessionMeta } from './sessions-meta';

export async function sessionToAgent(
  filePath: string,
  records: JsonlRecord[],
  activeSessions: Map<string, SessionMeta>   // ★ sessionId 로 매칭, deriveStatus 에 전달
): Promise<Agent> {
  const first = records[0];
  const last = records[records.length - 1];
  const assistants = records.filter((r): r is AssistantMsg => r.type === 'assistant');
  const meta = activeSessions.get(first.sessionId);   // undefined 면 종료된 세션

  const tokens = assistants.reduce((s, r) =>
    s + (r.message.usage.input_tokens + r.message.usage.output_tokens), 0);
  const cost = assistants.reduce((s, r) =>
    s + calculateCost(r.message.usage, r.message.model), 0);

  // ★ edited = 파일 편집 tool 4종의 고유 file_path 수만 셈. 다른 tool (Bash, AskUserQuestion 등) 무시.
  const editedFiles = new Set<string>();
  const EDIT_TOOLS = /^(Edit|Write|MultiEdit|NotebookEdit)$/;
  for (const r of records) {
    if (r.type === 'tool_use' && EDIT_TOOLS.test((r as ToolUseMsg).name ?? '')) {
      const path = (r as ToolUseMsg).input?.file_path;
      if (path) editedFiles.add(path);
    }
  }

  return {
    id:        (first.sessionId ?? '').slice(0, 8),
    name:      first.slug ?? deriveNameFromCwd(first.cwd ?? ''),
    status:    deriveStatus(records, meta),            // ★ meta 전달 — v2 휴리스틱
    task:      first.slug ?? firstUserText(records).slice(0, 80),
    repo:      parseRepo(first.cwd ?? ''),
    branch:    first.gitBranch ?? '—',
    // ★ step/steps 는 진행률 시각화용 휴리스틱 — 정확도 보장 X.
    //   step  = 완료된 tool_use 수 (최대 10 cap, 카드 진행률 점이 너무 많아지지 않게)
    //   steps = max(8, step+2) — 최소 8칸은 보여야 디자인 점 그리드가 예쁘게 보이기 때문
    step:      Math.min(records.filter(r => r.type === 'tool_use').length, 10),
    steps:     Math.max(8, records.filter(r => r.type === 'tool_use').length + 2),
    tokens,
    cost,
    model:     shortModel(last && (last as AssistantMsg).message?.model ?? 'claude-sonnet-4-6'),
    edited:    editedFiles.size,
    started:   relativeTime(parseTimestamp(first.timestamp)),
    last:      summarizeLast(records),
    sessionId: first.sessionId,
    filePath,
    cwd:       first.cwd ?? '',
    firstTimestamp: parseTimestamp(first.timestamp),
    lastTimestamp:  parseTimestamp(last.timestamp),
    entrypoint: 'cli',
  };
}
```

### 4.2 헬퍼

```typescript
function shortModel(full: string): string {
  // 'claude-opus-4-7' → 'opus-4.7'
  const m = full.match(/claude-(opus|sonnet|haiku)-(\d+)-(\d+)/);
  return m ? `${m[1]}-${m[2]}.${m[3]}` : full;
}

function parseRepo(cwd: string): string {
  // 'C:\\Users\\oneoone\\Documents\\workspace\\p\\agents' → 'p/agents'
  const parts = cwd.replace(/\\/g, '/').split('/').filter(Boolean);
  return parts.slice(-2).join('/') || '—';
}

function deriveNameFromCwd(cwd: string): string {
  const parts = cwd.replace(/\\/g, '/').split('/').filter(Boolean);
  return parts[parts.length - 1] || 'session';
}

function firstUserText(records: JsonlRecord[]): string {
  const first = records.find(r => r.type === 'user');
  return (first as any)?.message?.content?.[0]?.text ?? 'New session';
}

function summarizeLast(records: JsonlRecord[]): string {
  const last = records[records.length - 1];
  if (!last) return 'idle';
  if (last.type === 'user')      return 'awaiting next turn';
  if (last.type === 'assistant') return 'sent a response';
  if (last.type === 'tool_use')  return `running tool: ${(last as any).name}`;
  if (last.type === 'tool_result') return 'tool completed';
  return last.type;
}

export function relativeTime(ts: number, now: number = Date.now()): string {
  const sec = Math.floor((now - ts) / 1000);
  if (sec < 30) return 'just now';
  if (sec < 60 * 60) return `${Math.floor(sec / 60)}m`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ★ 실데이터 100% ISO-8601 UTC — 단순 처리만
function parseTimestamp(ts: string): number {
  return new Date(ts).getTime();
}

// v3.4 이후 placeholder 매칭은 sessionId 기준 (cwd 매칭 불필요).
// normalizeCwd 는 디스플레이 / 중복 카드 감지 등 보조 용도로만 유지.
// lib/format-path.ts
import path from 'node:path';
export function normalizeCwd(p: string): string {
  return path
    .resolve(p)
    .replace(/[\\/]+$/, '')
    .replace(/\\/g, '/')
    .toLowerCase();
}
```

---

## 5. 비용 계산 (lib/pricing.ts)

> 단가 출처: https://www.anthropic.com/pricing  (작성 시점 — 코드에 코멘트로 갱신일 표기 필수)

```typescript
// 단위: $ / MTok (Million Tokens)
export const PRICING = {
  'claude-opus-4-7':    { input: 15,   output: 75   },
  'claude-sonnet-4-6':  { input: 3,    output: 15   },
  'claude-haiku-4-5':   { input: 0.80, output: 4    },
  'default':            { input: 3,    output: 15   },
} as const;

const CACHE_WRITE_MULT = 1.25;
const CACHE_READ_MULT  = 0.10;

// ★ 정확 매칭 → prefix 매칭 → default 순서. 'claude-opus-4-7-20250101' 같은 풀 ID 대응.
export function lookupPricing(model: string) {
  if ((PRICING as any)[model]) return (PRICING as any)[model];
  for (const key of Object.keys(PRICING)) {
    if (key !== 'default' && model.startsWith(key)) return (PRICING as any)[key];
  }
  return PRICING.default;
}

export function calculateCost(
  usage: { input_tokens: number; output_tokens: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number },
  model: string
): number {
  const p = lookupPricing(model);
  const inputCost       = (usage.input_tokens                / 1_000_000) * p.input;
  const outputCost      = (usage.output_tokens               / 1_000_000) * p.output;
  const cacheWriteCost  = ((usage.cache_creation_input_tokens ?? 0) / 1_000_000) * p.input * CACHE_WRITE_MULT;
  const cacheReadCost   = ((usage.cache_read_input_tokens     ?? 0) / 1_000_000) * p.input * CACHE_READ_MULT;
  return inputCost + outputCost + cacheWriteCost + cacheReadCost;
}
```

> **검증 TODO**: Phase 1 시작 시 Anthropic 공식 가격 페이지와 비교. 모델 alias (`claude-opus-4-5`, `claude-haiku-4` 등) 변형 처리 추가 검토.

---

## 6. 필터 적용 순서 (서버 사이드)

```
1. ~/.claude/projects/**/*.jsonl 전체 스캔
2. 각 파일을 파싱 (캐시 활용)
3. entrypoint === 'cli' 만 통과     ← ADR-010
4. lastTimestamp >= cutoff           ← ADR-012 (cutoff 는 query param)
5. sessionToAgent 변환
6. lastTimestamp 내림차순 정렬
7. 응답
```

### API 쿼리 파라미터
```
GET /api/agents?since=7d            # 7d (default) | 30d | all
```

---

## 7. 추가 데이터 (드로어용)

```typescript
// GET /api/agents/:id
interface AgentDetail {
  agent: Agent;
  logs:  string[];                  // 마지막 10개 메시지를 콘솔 라인으로 포맷
  files: { path: string; adds?: number; dels?: number }[];   // tool_use 의 Edit/Write 입력
  stream: { name: string; state: 'done'|'running'|'failed'|'paused'|'pending' }[];   // tool_use 시퀀스
  subagents: Array<{ name: string; status: Status; tokens: number; cost: number }>;   // ★ subagents/ 폴더의 별도 jsonl
}
```

### Subagent 처리 (ADR-010 + v3.3 X)
- **MVP 에서는 `subagents/agent-*.jsonl` 완전 무시**
- `scanProjects()` 는 메인 세션 `.jsonl` 만 반환. `subagents/` 하위 폴더는 skip.
- 추후 detail drawer 안 sub-section 표시는 Phase 6+ 후순위
- 본인 머신 현재 데이터에 subagents 폴더 없음 → 실 영향 0

---

## 8. API 응답 스키마

### `GET /api/agents?since=7d`
```json
{
  "agents": [ /* Agent[] */ ],
  "totals": {
    "total":   3,
    "running": 1,
    "review":  0,
    "error":   0,
    "waiting": 1,
    "idle":    1,
    "tokens":  234500,
    "cost":    3.42,
    "edited":  18
  },
  "filter": { "since": "7d", "entrypoint": "cli" },
  "generatedAt": 1716796800000
}
```

### `GET /api/agents/:id`
위의 `AgentDetail` 형태.

### `POST /api/spawn`
```json
// request
{
  "task":  "Refactor auth module",
  "cwd":   "C:\\Users\\oneoone\\workspace\\acme",
  "model": "opus-4.7",
  "autoStart": true
}
// response
{
  "ok": true,
  "method": "win32-start-cmd",
  "pid": 12345
}
```

### Cache-Control
모든 API 응답에 `Cache-Control: no-store` (변동성 큼).

---

## 9. 데이터가 비어 있을 때 (EmptyState)

| 상황 | 응답 / UI |
|------|----------|
| `~/.claude/projects/` 가 아예 없음 | `{ agents: [], totals: { ...zeros } }` → 카드 영역에 "Claude Code 가 설치되어 있지 않거나 한 번도 사용되지 않았어요" + Install 링크 |
| 폴더는 있지만 CLI 세션 없음 (Desktop 세션만) | 같은 빈 응답 → "CLI 세션이 없어요. + New agent 로 시작하세요" 안내 |
| CLI 세션은 있지만 최근 7일 안에는 없음 | 응답은 빈 배열 → 카드 영역에 "최근 7일 활동이 없어요. All time 으로 전환해 보세요" + 토글 |

---

## 10. 검증 체크리스트

1차 매핑 완료 후 다음을 검증:

- [ ] CLI 세션만 카드로 나오는가 (Desktop 세션 제외 확인)
- [ ] 카드의 `tokens` 합계 = JSONL 의 `input_tokens + output_tokens` 합 (오차 0)
- [ ] `cost` 가 합리적 범위 (단발 ~$1, 장기 ~$10)
- [ ] 모델 표기가 `opus-4.7`, `sonnet-4.6` 형태로 짧음
- [ ] `repo` 가 폴더명 마지막 2 단계로 잘 추출
- [ ] `started` 가 "14m", "1h 4m", "just now" 패턴
- [ ] EmptyState 가 빈 디렉토리에서 노출
- [ ] `since=7d` 기본, `since=all` 토글 작동
- [ ] Status 추론이 직관과 맞음 (수동 검증)
- [ ] mtime 캐시가 변경 없는 파일을 재파싱 안 함 (로그로 확인)

---

## 11. 추후 확장 가능성 (이 문서 범위 밖)

- handoff 그래프 실데이터: `parentUuid` 체인을 따라 subagent invocation 그래프 구성
- Activity 피드 실데이터: 모든 세션의 tool_use 이벤트를 시간순 머지
- 가격 변동 처리: `PRICING` 을 별도 JSON 으로 외부화 + 가격 변경일 추적
- git remote 읽어 진짜 repo 이름 (`oneoone/agents`) 표시
- Claude Code SDK 가 IPC 노출 시 Pause / Approve 활성화
