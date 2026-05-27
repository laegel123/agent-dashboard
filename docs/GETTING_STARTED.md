# 시작하기

> 이 프로젝트의 로컬 개발 환경을 처음부터 셋업하는 가이드. **Phase 0 (문서화) 완료 후, Phase 1 진입 시점에 따라 실행할 것.**

---

## 사전 요구사항

| 도구 | 버전 | 확인 명령 | 비고 |
|------|------|----------|------|
| Node.js | 18.17 이상 (20+ 권장, 본 환경은 v22.16.0) | `node --version` | next/font 가 18.17 미만에서 깨짐 |
| npm | 9 이상 | `npm --version` | pnpm/yarn 도 가능하지만 본 환경 미설치 |
| Claude Code CLI | 임의 — **CLI 세션이 하나라도 있어야** 카드가 노출 | `claude --version` | 없으면 EmptyState |
| Git | 2.x | `git --version` | 필수는 아니지만 `gitBranch` 값 추출에 영향 |

### OS 별 주의

**Windows**:
- 경로는 `path.join(os.homedir(), '.claude', 'projects')` 로 추상화 (POSIX-style 혼용 금지)
- spawn 시 `child_process.spawn('cmd', ['/c', 'start', 'cmd', '/k', 'claude'], { cwd, detached: true })`
- 파일 시스템은 case-insensitive — sessionId 비교 시 대소문자 통일

**macOS**:
- `osascript` 가 기본 — 별도 설치 불필요
- `xattr` 권한 이슈 없음

**Linux**:
- 터미널 emulator 명령이 배포판마다 다름 → `x-terminal-emulator` (Debian) / `gnome-terminal` / `konsole` / `xterm` 순서로 시도
- `~/.claude/projects/` 가 읽기 가능한지 확인

---

## 디렉토리 위치

```
C:\Users\oneoone\Documents\workspace\p\agents\           ← 프로젝트 루트
~/.claude/projects/                                        ← 데이터 소스 (Claude Code 가 자동 생성)
```

---

## 의존성 설치

```bash
cd C:\Users\oneoone\Documents\workspace\p\agents
npm install
```

설치되는 주요 패키지:
- `next@15.0.3`
- `react@18.3.1`, `react-dom@18.3.1`
- `typescript@^5`, `@types/node@^22`, `@types/react@^18`, `@types/react-dom@^18`

> `package.json` 은 이미 생성돼 있습니다. 따로 `npm init` 필요 없음.

---

## 개발 서버 실행

```bash
npm run dev
```

→ `http://localhost:3000` 에서 확인.

기본적으로:
- 파일 저장 시 자동 핫 리로드
- TypeScript 에러 즉시 표시
- `app/api/agents` 가 매 요청마다 `~/.claude/projects/` 스캔 (`dynamic = 'force-dynamic'`)

---

## 디자인 원본 검증용

디자인 원본을 브라우저에서 직접 열어보고 싶다면 (옵션, 디버깅용):

```bash
cd design-package/agent-dashboard/project
# Python 3 기준 간단 서버
python -m http.server 8080
```

→ `http://localhost:8080/Dashboard.html` 열기.

> ⚠️ README 권장사항에 따라 평소엔 **렌더링 / 스크린샷 없이** 소스 파일을 직접 읽으세요. 위 명령은 픽셀 차이 디버깅 시에만.

---

## 환경 변수

현재 없음. 모든 데이터가 로컬 파일 시스템에서 옴.

추후 도입 시 `.env.local` 에 추가하고 `.gitignore` 에 포함시킬 것.

---

## 빌드 / 프로덕션

```bash
npm run build          # .next/ 생성
npm run start          # 프로덕션 서버 (포트 3000)
```

> 로컬 도구라 배포 안 합니다. 빌드는 검증용.

---

## 자주 만나는 문제

### `EACCES` 또는 `~/.claude/projects` 못 읽음
- 파일 권한 문제 — 본인 홈 디렉토리니까 보통은 OK
- macOS Sandbox 환경이면 추가 권한 필요할 수 있음

### `~/.claude/projects` 가 비어있음 또는 CLI 세션이 0개
- Claude Code CLI 를 한 번도 안 썼다는 뜻
- 또는 Claude Desktop 만 써서 세션이 모두 `claude-desktop` entrypoint (MVP 에서 제외됨)
- 터미널에서 `claude` 한 번 실행하면 첫 CLI 세션 파일이 생김
- 또는 EmptyState UI 검증 용도로 그대로 둬도 OK

### Spawn 이 새 터미널을 못 띄움 (Linux)
- 기본 터미널 emulator 가 감지 안 됨
- `which x-terminal-emulator gnome-terminal konsole xterm` 으로 확인
- 환경 변수 `TERMINAL=<command>` 로 명시 지정 (예: `TERMINAL=alacritty`)

### Geist 폰트가 안 보임
- `app/layout.tsx` 의 `next/font/google` import 확인
- 처음 빌드 시 폰트 다운로드 — 인터넷 필요
- 두 번째부터는 self-host 캐시

### 디자인이 원본과 어긋남
- 디자인 원본 JSX 의 inline style 을 다시 한 번 비교
- `tokens.css` 의 변수 값이 `globals.css` 에 그대로 옮겨졌는지
- 화살표 함수 / arrow function 안에서 색 값을 임의 라운딩 안 했는지 (예: `padding: 11.5px` 그대로 유지)

### `npm install` 이 멈춤
- 백그라운드로 시간이 오래 걸릴 수 있음
- 진행이 5분 이상 안 보이면 `Ctrl+C` 로 끊고 다시 `npm install --verbose` 로 시도
- 또는 `node_modules` 와 `package-lock.json` 삭제 후 재시도

---

## VS Code 권장 확장 (옵션)

- `dbaeumer.vscode-eslint`
- `esbenp.prettier-vscode`
- `bradlc.vscode-tailwindcss` ← **❌ 비활성화하세요. Tailwind 안 씁니다.**

---

## 진행 상황 확인

현재 단계는 [`IMPLEMENTATION.md`](./IMPLEMENTATION.md) 에서 체크박스로 추적.

각 Phase 완료 시:
1. 사용자에게 검토 요청
2. 동의 후 다음 Phase 진입
3. CLAUDE.md / docs/IMPLEMENTATION.md 의 체크박스 업데이트

---

## 도움 받기

- 디자인 의도 불명확 → `design-package/agent-dashboard/chats/chat1.md` 다시 읽기
- 토큰 값 모름 → `design-package/agent-dashboard/project/tokens.css`
- JSONL 스키마 모름 → `docs/DATA_MODEL.md`
- 컴포넌트 구조 모름 → `docs/COMPONENTS.md`
- 의사결정 배경 모름 → `docs/ADR.md`
