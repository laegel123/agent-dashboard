# Docs

Claude Agent Dashboard 의 모든 문서 인덱스.

---

## 읽는 순서

| 순서 | 파일 | 내용 | 누가 읽나 |
|------|------|------|----------|
| 1 | [`../CLAUDE.md`](../CLAUDE.md) | 프로젝트 한 줄 요약 + CRITICAL 규칙 | 모든 코딩 에이전트 |
| 2 | [`PRD.md`](./PRD.md) | 무엇을 만드는가 + **솔직한 한계** | 모든 사람 |
| 3 | [`../design-package/agent-dashboard/chats/chat1.md`](../design-package/agent-dashboard/chats/chat1.md) | 유저-디자이너 합의 원본 | 모든 사람 |
| 4 | [`UI_GUIDE.md`](./UI_GUIDE.md) | 디자인 토큰 + Empty/Loading/Error 상태 + Demo 토스트 | UI 작업자 |
| 5 | [`ARCHITECTURE.md`](./ARCHITECTURE.md) | 디렉토리 + 데이터 흐름 + spawn 흐름 + mtime 캐시 | 모든 코더 |
| 6 | [`DATA_MODEL.md`](./DATA_MODEL.md) | JSONL → Agent 매핑 + Status 추론 | 데이터 / API 작업자 |
| 7 | [`COMPONENTS.md`](./COMPONENTS.md) | 6 JSX → TSX 매핑 + 액션 매트릭스 | UI 작업자 |
| 8 | [`ADR.md`](./ADR.md) | 의사결정 16건 (Why) | 큰 변경 전에 참고 |
| 9 | [`TESTING.md`](./TESTING.md) | 테스트 전략 + 모듈별 케이스 115개 명세 | 단위/통합/UI 테스트 작성 시 |
| 10 | [`IMPLEMENTATION.md`](./IMPLEMENTATION.md) | Phase 0-7 단계 체크리스트 | 진행 추적 |
| 11 | [`GETTING_STARTED.md`](./GETTING_STARTED.md) | 환경 셋업 + 명령어 | 처음 시작할 때 |

---

## 핵심 사실 8가지 (TLDR)

1. **데이터 소스**: `~/.claude/projects/**/*.jsonl` (메시지 흐름) + `~/.claude/sessions/<pid>.json` (살아있는 세션 메타).
2. **카드 단위**: 1 세션 (`.jsonl` 한 파일) = 1 카드. subagent 는 detail drawer 안에서.
3. **진입점**: CLI 전용 (`entrypoint === 'cli'`). Desktop / VSCode 세션 제외.
4. **기본 필터**: 최근 7일 (`Last 30 days` / `All time` 토글 가능).
5. **진짜 동작하는 액션**: "+ New agent" (= spawn) + "Open folder" 두 개. 나머지는 Demo 토스트.
6. **Status 추론 (v2)**: `~/.claude/sessions/<pid>.json` + `process.kill(pid, 0)` + 마지막 레코드 타입 + mtime. **Pause 구분은 MVP에서 포기** (alive 면 running/waiting 둘 중 하나만).
7. **스택**: Next.js 15 App Router + React 18 + TypeScript. **Tailwind 안 씀** — inline style + CSS variables.
8. **디자인 출처**: Claude Design 핸드오프 번들 (`design-package/`). **읽기 전용**, 픽셀 퍼펙트 이식 대상.

---

## 자주 묻는 질문

**Q. 디자인을 더 화려하게 / 다른 톤으로 바꾸고 싶어요.**
→ [`UI_GUIDE.md`](./UI_GUIDE.md) 의 안티패턴 표 + [`ADR.md`](./ADR.md) ADR-008. 톤은 유저-디자이너 합의 사항이라 임의 변경 금지.

**Q. Tailwind 쓰면 안 되나요?**
→ [`ADR.md`](./ADR.md) ADR-002. 디자인 원본 토큰 정밀도(`11.5px` 같은 값)가 Tailwind 와 안 맞음.

**Q. 실제 Claude API 호출 안 함?**
→ [`ADR.md`](./ADR.md) ADR-003. 로컬 로그만 읽음.

**Q. "Pause / Approve" 버튼이 진짜로 동작 안 한다고요?**
→ [`PRD.md`](./PRD.md) "솔직한 한계" 섹션 + [`ADR.md`](./ADR.md) ADR-006. 외부에서 살아있는 Claude Code 프로세스 제어할 IPC 가 없음. Demo 토스트로 안내.

**Q. 새 에이전트 spawn 은 정확히 뭐 하나요?**
→ [`ARCHITECTURE.md`](./ARCHITECTURE.md) "데이터 흐름 (쓰기 — spawn)" 섹션. OS 별로 새 터미널 창 띄우고 `claude` 명령 실행.

**Q. 다크 모드 / 모바일 / Desktop 세션 지원?**
→ ADR-008, ADR-010 에서 MVP 제외 명시. 모두 Phase 7 후순위.

**Q. 어디서부터 코드를 쓰면 되나요?**
→ [`IMPLEMENTATION.md`](./IMPLEMENTATION.md) Phase 1 부터. 단계별 체크리스트.

**Q. 본인 머신에 CLI 세션이 1개밖에 없는데 잘 보일까요?**
→ 잘 보입니다. EmptyState / 1 card / few cards 모두 디자인 톤 유지. [`UI_GUIDE.md`](./UI_GUIDE.md) "Empty 상태 6가지 케이스".

---

## 진실의 원천

| 무엇 | 어디 | 비고 |
|------|------|------|
| 디자인의 색 / 픽셀 / 폰트사이즈 | `design-package/agent-dashboard/project/*.jsx` + `tokens.css` | read-only |
| 유저 의도 / 합의 사항 | `design-package/agent-dashboard/chats/chat1.md` | |
| 도메인 타입 | `lib/types.ts` | Phase 2 완료 후 존재 |
| 비용 단가 | `lib/pricing.ts` | **갱신일 코멘트 필수**. `lookupPricing()` prefix match |
| API 응답 스키마 | `docs/DATA_MODEL.md` §8 | |
| JSONL 25개 타입 정의 | `docs/DATA_MODEL.md` §1.2 | 우리가 의존하는 건 5종 |
| Status 추론 v2 | `docs/ADR.md` ADR-013 + `lib/status-deriver.ts` | |
| Empty / Loading / Error / Demo 토스트 UI | `docs/UI_GUIDE.md` | 원본에 없음 |
| 진짜 동작 vs Demo 액션 매트릭스 | `docs/ARCHITECTURE.md` "액션 라우팅" + `docs/COMPONENTS.md` | |
| review 상태 운명 | `docs/ADR.md` ADR-013 트레이드오프 | mock 전용, 실데이터 절대 안 나옴 |
| mock-data Phase 4 제거 | `docs/ADR.md` ADR-014 | |
| API 보안 (host 127.0.0.1 + Origin) | `docs/ADR.md` ADR-015 + `docs/ARCHITECTURE.md` 보안 | |
| 테스트 전략 + 모듈별 케이스 115개 | `docs/TESTING.md` + `docs/ADR.md` ADR-016 | |

문서와 디자인 원본 간 충돌 시 → **디자인 원본 파일이 우선**.
문서끼리 충돌 시 → **이 README 의 TLDR 이 합의 기준**.
