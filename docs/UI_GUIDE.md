# UI 디자인 가이드

> 이 문서는 **`design-package/agent-dashboard/project/tokens.css`** 와 6개 JSX 파일의 inline style 을 읽어서 정리한 것입니다. 진실의 원천은 디자인 원본 파일이므로 충돌 시 원본을 따르세요.

---

## 디자인 원칙

1. **도구처럼 보여야 한다.** 마케팅 페이지가 아니라 매일 쓰는 콘솔. 마우스 호버 시 큰 액션이 없는 게 좋다.
2. **Warm > Cool.** 베이지·brown·orange. 푸른 톤 금지.
3. **정보 우선.** 장식 요소 최소화. 데이터가 잘 읽혀야 한다.
4. **모노 vs 산세리프 명확히 구분.** 식별자·숫자·코드는 mono. 본문·라벨은 sans. 액센트(헤드라인 큰 숫자, 모달 아이콘)는 serif.
5. **상태 일관성.** 한번 정한 상태 색은 카드·뱃지·도트·필터칩·진행률바 어디서나 동일.

---

## AI 슬롭 안티패턴 — 절대 하지 마라

| 금지 | 이유 |
|------|------|
| `backdrop-filter: blur()` (Tweaks 패널 제외) | glass morphism은 AI 템플릿의 가장 흔한 징후 |
| Gradient text | AI 가 만든 SaaS 랜딩의 1번 특징 |
| 보라/인디고/시안 액센트 | "AI = 보라" 클리셰. 이 디자인은 clay-orange 한 종류뿐 |
| Glow / neon box-shadow 애니메이션 | 네온 글로우 = AI 슬롭 |
| 모든 카드에 동일한 `rounded-2xl` | 원본은 `--r-sm` `--r` `--r-lg` `--r-xl` 4단계 의도적 차이 |
| 배경 gradient orb | 모든 AI 랜딩의 클리셰 |
| "Powered by AI" 배지 / Sparkle 이모지 | 디자인에 없음 |
| 모든 곳에 그림자 | 원본은 hover/selected/drawer 에만 box-shadow |

---

## 컬러 토큰 (tokens.css 그대로)

### 따뜻한 중성색
| 토큰 | 값 | 용도 |
|------|------|------|
| `--bg` | `#f5f1e8` | 페이지 배경 |
| `--bg-2` | `#efe9dc` | 필터 행, 좀 더 깊은 영역 |
| `--surface` | `#fbf8f1` | 카드 표면 |
| `--surface-2` | `#f1ece0` | 카드 푸터, 인용 박스, 강조 영역 |
| `--line` | `#e2dcca` | 일반 보더 |
| `--line-2` | `#d8d0bb` | 강조 보더, 호버 보더 |

### 잉크 (텍스트)
| 토큰 | 값 | 용도 |
|------|------|------|
| `--ink` | `#29261b` | 1차 텍스트 (카드 제목, 헤드라인) |
| `--ink-2` | `#4a4538` | 본문, task 설명 |
| `--ink-3` | `#7b7561` | 보조, 라벨, mono 보조 텍스트 |
| `--ink-4` | `#a8a18a` | 비활성, 시간, ID 모노 |
| `--ink-5` | `#cdc6ad` | 구분자 `·` 같은 마이크로 디테일 |

### Claude clay 액센트
| 토큰 | 값 | 용도 |
|------|------|------|
| `--clay` | `#c96442` | 메인 액센트 — primary button, 선택 보더, 발신 채팅 버블 |
| `--clay-2` | `#d97757` | 호버용 밝은 버전 (잘 안 씀) |
| `--clay-soft` | `#f5dccd` | 선택 박스 외곽 글로우 (`box-shadow: 0 0 0 3px var(--clay-soft)`) |
| `--clay-bg` | `#faece4` | 선택된 리스트 행 배경 |

### 상태 색 (동일 채도)
| 상태 | fg | bg | 의미 |
|------|------|------|------|
| running | `#6b8e4e` (moss) | `#e6ecd6` | 지금 일하고 있음 — pulse 애니메이션 |
| waiting | `#c8943a` (amber) | `#f5e7c4` | 사용자에게 질문해서 멈춤 |
| review  | `#6b6699` (plum) | `#e1ddee` | 사람 리뷰 대기 |
| error   | `#b54a3a` (terracotta) | `#f3d6cd` | 실패 |
| idle    | `#8a836f` (muted) | `#e8e3d4` | 정지 / 스케줄 대기 |

**활용 예시**:
- 카드 상단 라이트 바: `background: var(--running)`, 높이 3px
- 상태 도트: `width: 7px, height: 7px, borderRadius: 50%, background: var(--running)` + running 시 `box-shadow: 0 0 0 3.5px var(--running-bg)` + pulse 애니메이션
- 상태 뱃지: `background: var(--running-bg), color: var(--running)` + uppercase + 글자 6px letterSpacing

---

## 타이포그래피

```css
--sans: 'Geist', ui-sans-serif, -apple-system, system-ui, sans-serif;
--mono: 'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace;
--serif: 'Instrument Serif', 'Times New Roman', serif;
```

### 클래스
| 클래스 | 효과 | 적용 대상 |
|--------|------|----------|
| `.dash` | 기본 sans 적용 | 앱 루트 |
| `.mono` | Geist Mono + ss01, cv11 | **세션 ID** (`opus-01`, `e0e7e075`), **model** (`opus-4.7`), **repo · branch** (`p/agents`, `feat/foo`), **모든 토큰/비용/시간 숫자** (`184k`, `$2.71`, `14:32`), **카드 푸터의 메타 라인**, **콘솔 로그**, **시스템 프롬프트 블록**, **uppercase 섹션 라벨** |
| `.serif` | Instrument Serif | 모달 아이콘 (`✦ ↻ ☉` 등), 큰 액센트 헤드라인, EmptyState 의 큰 + 아이콘 |
| `.tnum` | `font-variant-numeric: tabular-nums` | **모든 숫자 카운터** (스텝 진행 `4/7`, 카드 수, KPI 큰 숫자 등) — mono 와 함께 적용해 자릿수 흔들림 방지 |

### 자주 쓰는 스타일

| 용도 | 스타일 |
|------|--------|
| 페이지 헤드라인 (`Good afternoon, Jamie.`) | `fontSize: 26, fontWeight: 500, letterSpacing: -0.5, color: var(--ink)` |
| 섹션 라벨 (mono uppercase) | `fontSize: 10.5~11, fontWeight: 600, letterSpacing: 0.8, textTransform: uppercase, fontFamily: var(--mono), color: var(--ink-2/3)` |
| 카드 제목 | `fontWeight: 600, fontSize: 15 (comfortable) / 13.5 (compact), color: var(--ink)` |
| 카드 식별자 (mono) | `fontSize: 11, color: var(--ink-4), fontFamily: var(--mono), letterSpacing: 0.2` |
| 본문 / task 설명 | `fontSize: 13.5, color: var(--ink-2), lineHeight: 1.45` |
| 보조 텍스트 | `fontSize: 12, color: var(--ink-3)` |
| 마이크로 텍스트 (시간, 시그) | `fontSize: 10.5~11, color: var(--ink-4)` |
| 큰 통계 숫자 | `fontSize: 20, fontWeight: 500, color: var(--ink), .tnum` |
| 코드 / 시스템 프롬프트 블록 | `fontFamily: var(--mono), fontSize: 11.5, lineHeight: 1.55` |
| 다크 콘솔 로그 | `background: #231f17, color: #e8e0cc, fontSize: 11.5, lineHeight: 1.65, fontFamily: var(--mono)` |

---

## 라운드 모서리 (의도적 4단계)

```css
--r-sm: 6px;     /* 작은 칩, 인풋 */
--r:    10px;    /* 일반 버튼, 입력 박스 */
--r-lg: 14px;    /* 카드 */
--r-xl: 20px;    /* (현재 미사용) */
```

| 요소 | 라운드 |
|------|--------|
| 카드 | `var(--r-lg)` = 14px |
| 모달 | 16px (직접 지정) |
| 버튼 일반 | 6~8px |
| 필터 칩 | 999px (pill) |
| 상태 뱃지 | 999px (pill) |
| 입력 박스 | 8~10px |

---

## 컴포넌트 패턴

### 카드 (GridCard)
```
border: 1px solid var(--line)
borderRadius: var(--r-lg) (14px)
background: var(--surface)
overflow: hidden
flexDirection: column

[3px 상태 라이트 바] background: var(--running) (또는 해당 상태 색)
[헤더]    padding: 14px 16px 12px
[본문]    padding: 0 16px 14px
[푸터]    padding: 10px 16px, borderTop, background: var(--surface-2)

선택 시: border var(--clay), box-shadow 0 0 0 3px var(--clay-soft)
호버 시: borderColor → var(--line-2)
```

### 버튼

**Primary (clay)**
```
padding: 5~7px 10~14px
borderRadius: 6~10px
border: 1px solid var(--clay)
background: var(--clay)
color: #fff
fontSize: 12~13, fontWeight: 500
```

**Ghost**
```
padding: 5px 10px
borderRadius: 6px
border: 1px solid var(--line-2)
background: transparent
color: var(--ink-2)
```

**Danger Ghost (Stop)**
```
같은 ghost 스타일
color: var(--error)
```

### 필터 칩
```
padding: 5px 11px
borderRadius: 999px
border: 1px solid var(--line-2) → active 시 var(--ink)
background: transparent → active 시 var(--ink)
color: var(--ink-2) → active 시 var(--surface)
fontSize: 12.5, fontWeight: 500

상태 칩의 경우 앞에 6×6 색 dot:
<span style={{ width: 6, height: 6, borderRadius: 3, background: statusFg }} />
```

### 상태 뱃지 (카드 우상단)
```
fontSize: 10.5
padding: 3px 8px
borderRadius: 999px
background: var(--{status}-bg)
color: var(--{status})
fontWeight: 600
textTransform: uppercase
letterSpacing: 0.6
fontFamily: var(--mono)
```

### 진행률 바 (카드 안)
**단계 점 방식** (디자인 시그니처):
```
[배열을 a.steps 만큼 렌더링]
- 각 칸: flex: 1, height: 4px, borderRadius: 2px
- i < a.step: background: statusFg, opacity: 1     ← 완료
- i === a.step && running: statusFg, opacity: 0.5  ← 현재
- 그 외: var(--line-2)                              ← 미시작
[마지막에] {step}/{steps} mono tnum
```

### 채팅 버블
**유저(우측)**
```
alignSelf: flex-end
maxWidth: 85%
padding: 8px 12px
borderRadius: 12px (좌·우상·좌하) + 4px (우하)
background: var(--clay)
color: #fff
fontSize: 13
```

**에이전트(좌측)**
```
alignSelf: flex-start
maxWidth: 85%
padding: 8px 12px
borderRadius: 12px (좌·우상·우하) + 4px (좌하)
background: var(--surface-2)
color: var(--ink-2)
```

### 입력 박스
```
border: 1px solid var(--line-2)
borderRadius: 8px
background: var(--surface)
padding: 8px 12px
fontSize: 13
color: var(--ink)
outline: none
```

---

## 레이아웃 / 간격

| 요소 | 크기 |
|------|------|
| 전체 폭 | `100vw` (overflow hidden) |
| 전체 높이 | `100vh` |
| TopBar | `padding: 22px 32px 16px` |
| FilterRow | `padding: 12px 32px` |
| GridBody | `padding: 20px 28px 28px`, gap 12~16px |
| 그리드 카드 폭 | comfortable `minmax(330px, 1fr)` / compact `minmax(280px, 1fr)` |
| 사이드바 | `width: 320px`, `flex: 0 0 320px` |
| DetailDrawer | `width: 560px` (absolute right) |
| NewAgentModal | `width: 720px`, `maxHeight: 92%` |
| Tweaks 패널 | `width: 280px`, 우측하단 fixed |

---

## 애니메이션 (Dashboard.html `<style>` 블록)

```css
@keyframes pulse-dot {
  0%, 100% { box-shadow: 0 0 0 3px var(--running-bg); }
  50%      { box-shadow: 0 0 0 5px var(--running-bg); }
}
@keyframes fade-in  { from { opacity: 0; } to { opacity: 1; } }
@keyframes slide-in { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes scale-in { from { transform: scale(.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }

button:active { transform: translateY(0.5px); }
```

| 애니메이션 | 어디 |
|-----------|------|
| `pulse-dot` 2.2s infinite | running 상태 dot |
| `fade-in` .15s | 모달 오버레이, 드로어 오버레이 |
| `slide-in` .22s cubic-bezier(.2,.7,.3,1) | DetailDrawer 본체 |
| `scale-in` .2s cubic-bezier(.2,.7,.3,1) | NewAgentModal 본체 |
| `transform: translateY(0.5px)` | 모든 버튼 active 상태 |

> 이 4개 외의 애니메이션 추가 금지. 특히 fade/slide 의 `ease-out`, `cubic-bezier(.2,.7,.3,1)` 같은 곡선을 임의로 바꾸지 말 것.

---

## 스크롤바 (Dashboard.html 글로벌 스타일)

```css
*::-webkit-scrollbar { width: 10px; height: 10px; }
*::-webkit-scrollbar-thumb {
  background: var(--line-2);
  borderRadius: 8px;
  border: 2px solid transparent;
  background-clip: content-box;
}
*::-webkit-scrollbar-thumb:hover {
  background: var(--ink-5);
  border: 2px solid transparent;
  background-clip: content-box;
}
```

---

## 아이콘 시스템

디자인 원본 `dashboard-utils.jsx` 의 `Icon` 컴포넌트는 단순 SVG path 모음:

| name | 용도 |
|------|------|
| `pause` `play` | 일시정지 / 재생 |
| `check` `x` | 승인 / 닫기 |
| `retry` | 재시도 (원형 화살표) |
| `chat` | 말풍선 |
| `search` `plus` `dots` `arrow` `bolt` `gear` | 검색 / 추가 / 더보기 / 화살표 / 번개 / 톱니 |
| `branch` `file` | git branch / 파일 |

모두 viewBox `0 0 20 20`, strokeWidth `1.6`, `stroke="currentColor"`, fill="none".

```tsx
<Icon name="plus" size={13} />
```

---

## 레이아웃 변형 (Tweaks)

| 모드 | 효과 |
|------|------|
| `grid` | 카드 그리드 (기본) |
| `list` | 9열 데이터 테이블 (`gridTemplateColumns: '160px 80px 1fr 220px 110px 90px 90px 100px 130px'`) |
| `timeline` | 가로 4시간 타임라인 + scheduled/idle 카드 그리드 |

| 밀도 | grid | list |
|------|------|------|
| compact | 280px minimum, gap 12, padding 10/14 | row padding 8/16 |
| comfortable | 330px minimum, gap 16, padding 14/16 | row padding 12/16 |

---

## 폼 요소

### Input / Select
```
width: 100%
padding: 8px 12px
borderRadius: 8px
border: 1px solid var(--line-2)
background: var(--surface)
fontFamily: var(--sans)
fontSize: 13
color: var(--ink)
outline: none
```

### Textarea
같은 스타일 + `height: 80, resize: vertical, padding: 10px 12px`.

### 라벨
```
fontSize: 11.5
fontWeight: 600
color: var(--ink-2)
marginBottom: 5
힌트(우측): fontSize: 10.5, color: var(--ink-4)
```

---

## 빈 상태 / 로딩 상태 / 에러 상태 (디자인 원본 보강)

> 디자인 원본에는 EmptyState 한 줄짜리 ("No agents match your filters.") 만 있음.
> 실제 데이터 연결 시 필요한 추가 상태들을 여기서 정의.

### EmptyState — 6가지 케이스

| 케이스 | 화면 |
|--------|------|
| `~/.claude/projects/` 없음 | 큰 + 아이콘 (var(--ink-4), serif) + "Claude Code 가 아직 설치되어 있지 않거나 사용된 적이 없어요." + 작은 안내 링크 |
| CLI 세션 0개 | + 아이콘 + "CLI 세션이 없어요." + "+ New agent 버튼으로 시작하세요" |
| 필터 조건 미일치 | 작은 안내 텍스트 "No agents match your filters." (원본 그대로) |
| 최근 7일 활동 0 + 전체에는 있음 | "최근 7일 활동이 없어요." + "Show all time" 버튼 (clay) |
| Status 필터 결과 0 | "No {status} agents." + 필터 초기화 칩 |
| 검색 결과 0 | "No matches for "{query}"" + Clear 버튼 |

**공통 스타일**:
```
padding: 80px 40px
textAlign: center
color: var(--ink-4)
fontSize: 14
```

큰 아이콘은 60px serif (`fontFamily: var(--serif), fontSize: 60, color: var(--ink-5)`).
보조 버튼은 ghost 스타일, 메인 액션은 primary (clay).

### LoadingState — 스켈레톤 카드

첫 fetch 동안 그리드 자리에 6개 skeleton 카드 표시:

```
Skeleton 카드 한 장:
- 같은 폭 (330px) / 같은 높이 (~180px)
- background: var(--surface)
- border: 1px solid var(--line)
- borderRadius: var(--r-lg)
- 내부에 회색 placeholder 라인 3개 (var(--line-2))
- 애니메이션: opacity 0.5 → 1 → 0.5 (1.5s ease-in-out infinite)
```

스피너 같은 거 도입 X. **카드 자리에 카드 모양 placeholder** — 레이아웃 점프 방지.

폴링 (30초마다) 중에는 LoadingState 표시 안 함 (조용히 백그라운드).

### ErrorState

API 실패 (5xx / fs 오류) 시:

```
[빨간 ! 아이콘 — var(--error), serif, 40px]
"Couldn't read ~/.claude/projects"
[작은 에러 메시지 — var(--ink-3), fontSize: 12, mono]
[Retry 버튼 (primary clay)]
```

`padding: 80px 40px`, `textAlign: center`.

### Toast — useToast() 훅 시그니처

```typescript
// components/toast.tsx
type ToastKind = 'demo' | 'success' | 'error' | 'info';
interface ToastItem { id: string; kind: ToastKind; text: string; expiresAt: number; }

export function useToast(): {
  demo:    (text: string) => void;
  success: (text: string) => void;
  error:   (text: string) => void;
  info:    (text: string) => void;
};

export function ToastHost(): JSX.Element;   // App 루트에 한 번 마운트
```

- 동시 표시 가능 토스트 **최대 3개**. 초과 시 가장 오래된 것부터 제거.
- 자동 만료: 3초 (success/info) / 4초 (demo/error)
- 클릭으로 즉시 dismiss

### Toast — Demo 모드 안내

진짜 동작 안 하는 액션 (Pause/Approve/Reject/Retry/Start/Stop/Chat 송신) 클릭 시 우상단 토스트:

```
배경: rgba(40,30,20,0.92)   // 어두운 brown (반투명)
색: #fbf8f1                  // surface 색 텍스트
padding: 12px 16px
borderRadius: 10px
fontSize: 12.5
boxShadow: 0 8px 24px rgba(0,0,0,0.18)
animation: slide-in .2s + fade-out .3s after 2.7s
position: fixed; top: 16px; right: 16px;
zIndex: 50

내용:
"Demo mode"   ← mono 11px 600 opacity 0.7
"Actual control of running Claude Code processes is not available yet."
```

성공 toast (spawn 성공 등) 도 같은 구조 + 좌측 var(--running) dot:

```
●  Spawned new agent · check the new terminal
```

### Detail drawer 헤더 — Open folder 아이콘 ⭐ (디자인 원본에 없는 신규)

원본의 헤더 `{id} · {model} · {repo} · {branch}` 한 줄 끝(오른쪽)에 작은 폴더 아이콘 버튼:

```
[StatusDot · name · 상태뱃지]                              [X 닫기]
[mono: id · model · repo · branch]                  [📁 폴더 아이콘]
```

스타일:
- `display: inline-flex; align-items: center; padding: 2px 4px`
- `border: none; background: transparent`
- `color: var(--ink-3)`, hover → `color: var(--ink)`
- `cursor: pointer`
- `Icon` size 14, `strokeWidth: 1.6`
- `title="Open folder in editor"`
- 클릭 시 `POST /api/open-folder` → 성공 시 작은 toast "Folder opened"

이건 디자인 원본에 없지만 **유일하게 추가하는 UI 요소**. 디자인 톤 (mono · ghost) 유지로 자연스럽게 녹임.

### 폴링 인디케이터 ⭐ (디자인 원본에 없는 신규)

TopBar 우상단의 시계 텍스트 (`Tuesday 14:32`) 옆에 작은 dot:

```
fontSize: 9.5
color: var(--ink-4)
display: inline-flex; align-items: center; gap: 5px

[dot] LIVE
width: 5px, height: 5px, borderRadius: 50%
background: var(--running)
animation: pulse-dot 2.2s ease-out infinite
opacity: fetch 중 1.0, idle 시 0.4
transition: opacity .3s
```

### "demo data" 라벨

handoff 그래프 / Chat 탭 같은 mock 데이터 영역에 작게:

```
fontSize: 9.5
fontFamily: var(--mono)
color: var(--ink-4)
textTransform: uppercase
letterSpacing: 0.7
padding: 1px 6px
borderRadius: 3px
background: var(--surface-2)
border: 1px solid var(--line-2)

text: "demo data"
```

위치: 해당 섹션 헤더 우측, 작은 보조 표시.

---

## 진실의 원천

> 위 토큰과 패턴은 모두 디자인 원본 파일에서 추출한 것이지만, **세부 픽셀 값이 충돌하면 원본 파일을 우선**하세요. **빈/로딩/에러/토스트/demo 라벨** 은 원본에 없어서 이 문서가 1차 출처입니다.

| 무엇을 찾을 때 | 어디 봐야 |
|--------------|----------|
| 컬러 / 폰트 변수 | `design-package/agent-dashboard/project/tokens.css` |
| 카드 / 리스트 행 | `dashboard-card.jsx` |
| 사이드바 (handoff + activity) | `dashboard-sidebar.jsx` |
| 디테일 드로어 | `dashboard-detail.jsx` |
| 모달 / 타임라인 | `dashboard-modals.jsx` |
| 헤더 / 필터 / 그리드 셸 | `dashboard-app.jsx` |
| Tweaks 패널 (CSS-in-JS) | `tweaks-panel.jsx` |
| 글로벌 키프레임 / 스크롤바 | `Dashboard.html` 의 `<style>` 블록 |
| Empty / Loading / Error 상태 | **이 문서** (디자인 원본 보강) |
| Demo 토스트 / "demo data" 라벨 | **이 문서** (디자인 원본 보강) |
