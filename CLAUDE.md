# CLAUDE.md

이 저장소에서 코딩 에이전트가 작업할 때 참고하는 가이드. 자세한 사항은 모두 [`docs/`](./docs/) 아래에 있습니다.

---

## 한 줄 요약

**Claude Code 세션 대시보드** — 본인 머신의 `~/.claude/projects/**/*.jsonl` 을 읽어, 여러 Claude Code (CLI) 세션의 토큰·비용·활동을 한 화면에서 본다. 진짜로 동작하는 액션은 **"새 세션 spawn"** 하나. 나머지 버튼은 시각/데모용.

> **솔직한 한계**: "라이브 오케스트레이션 콘솔" 이 아니라 **세션 시야 도구**입니다. 디자인은 야심차지만 실제 데이터는 정적 로그라 Pause/Approve 같은 제어는 불가능. 이 한계가 명시된 문서를 먼저 읽으세요 → [`docs/PRD.md`](./docs/PRD.md).

---

## 기술 스택

- **Next.js 15** App Router · React 18 · TypeScript (strict)
- **inline style + CSS variables** (Tailwind 사용 금지)
- 폰트: Geist / Geist Mono / Instrument Serif (next/font 로 self-host)
- 로컬 전용. 인증 없음. 배포 없음.

---

## CRITICAL — 반드시 지킬 규칙

1. **`design-package/` 절대 수정 금지.** Claude Design 핸드오프 번들. 픽셀 퍼펙트 기준이라 read-only.
2. **Tailwind utility class 금지.** 디자인 원본 토큰 정밀도 유지 위해 inline style + `var(--xxx)` 만 사용.
3. **색·간격·폰트사이즈는 원본 JSX 에서 직접 읽어 이식.** 임의 라운딩 / 가까운 값 치환 금지 (예: `11.5px` 그대로 유지).
4. **fs 접근은 API Route 안에서만.** 클라이언트 직접 호출 금지.
5. **`Agent` 도메인 타입은 [`docs/DATA_MODEL.md`](./docs/DATA_MODEL.md) 의 형태를 정확히 따를 것.**

---

## 핵심 결정 요약 (자세한 건 ADR)

| 결정 | 핵심 |
|------|------|
| 에이전트 단위 | **1 세션(.jsonl) = 1 카드**. subagent 는 detail drawer 의 sub-section. |
| 진입점 | **CLI 전용** (`entrypoint === 'cli'`). Desktop/VSCode 세션 제외. |
| 진짜 동작 | **새 세션 spawn 만**. 나머지 액션 버튼은 disabled 또는 "demo" 처리. |
| 기본 노출 | **최근 7일** 활동 세션. "All time" 토글로 전체 보기. |
| 새로고침 | 30초 폴링 + 파일 mtime 캐시 (incremental 파싱). |

---

## 디렉토리 구조 (최종 목표)

```
agents/
├── CLAUDE.md
├── docs/                 # 모든 문서 — 작업 시작 전 훑어볼 것
├── design-package/       # ⚠️ Read-only — Claude Design 핸드오프
├── app/                  # Next.js App Router
│   ├── layout.tsx · page.tsx · globals.css
│   └── api/agents/route.ts
├── components/           # design-package 의 6개 핵심 JSX 와 1:1 매핑 + tweaks-panel 1개 (선택)
└── lib/                  # types · pricing · claude-logs · status-meta · spawn
```

---

## 작업 전 읽기 순서

1. [`docs/README.md`](./docs/README.md) — 문서 인덱스
2. [`docs/PRD.md`](./docs/PRD.md) — 무엇을 만드는가 + 솔직한 한계
3. [`design-package/agent-dashboard/chats/chat1.md`](./design-package/agent-dashboard/chats/chat1.md) — 유저-디자이너 합의 원본
4. [`docs/UI_GUIDE.md`](./docs/UI_GUIDE.md) — 디자인 토큰 + 안티패턴
5. [`docs/DATA_MODEL.md`](./docs/DATA_MODEL.md) — JSONL → Agent 매핑
6. [`docs/COMPONENTS.md`](./docs/COMPONENTS.md) — 6개 JSX 의 책임 / props
7. [`docs/TESTING.md`](./docs/TESTING.md) — 테스트 전략 + 모듈별 115개 케이스
8. [`docs/IMPLEMENTATION.md`](./docs/IMPLEMENTATION.md) — 단계별 체크리스트

---

## 명령어

```bash
npm install          # 의존성
npm run dev          # 개발 서버 (3000)
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 서버
```

자세한 환경 설정은 [`docs/GETTING_STARTED.md`](./docs/GETTING_STARTED.md).

---

## 디자인 의도가 불분명할 때

- 색 / 폰트 / 간격 모름 → `design-package/agent-dashboard/project/tokens.css` + 해당 컴포넌트의 `*.jsx`
- 유저 의도 모름 → `design-package/agent-dashboard/chats/chat1.md`
- 데이터 매핑 모름 → `docs/DATA_MODEL.md`
- 의사결정 배경 모름 → `docs/ADR.md`

> **디자인 원본을 렌더링하지 마세요.** README 권장 사항. 텍스트로 읽으면 충분.

---

## 개발 프로세스

- 새 기능 → 먼저 `docs/` 에 적기 → 동의 → 구현
- 한 컴포넌트 = 한 커밋 (`dashboard-utils → card → app → sidebar → detail → modals`)
- 커밋 메시지: conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`)
- 디자인 변경은 **반드시 원본 근거** — 자체 판단 금지
