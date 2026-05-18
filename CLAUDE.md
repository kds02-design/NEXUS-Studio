# NEXUS Studio — Claude 작업 가이드

Creative Nexus Platform — 디자인·프롬프트·AI 도구를 묶은 단일 React 앱. 한 Shell이 여러 서브앱을 라우팅하는 구조.

## 1. 기술 스택

- **빌드**: Vite 8 + React 19 + Tailwind v4 (CSS `@theme` 기반 토큰)
- **상태 관리**: React Context 두 개 (`AuthContext`, `GlobalContext`)
- **백엔드**: Firebase Auth + Firestore
- **이미지 호스팅**: Cloudinary (`unsigned upload preset`)
- **AI**: Gemini API (`gemini-2.5-flash` 기본 모델)
- **폰트**: Noto Sans KR (본문), Teko (타이틀), JetBrains Mono (코드/프롬프트 미리보기)

## 2. 환경 변수 (`.env`)

```bash
VITE_FIREBASE_*=          # Firebase Web SDK config
VITE_GEMINI_API_KEY=      # Gemini REST API key
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
```

`src/lib/firebase.js` / `src/lib/gemini.js` / `src/lib/storage.js`에서 각각 읽어 사용.

## 3. 디렉터리 구조

```
src/
├── apps/                    ← 서브앱들 (각 폴더 = 하나의 앱)
│   ├── BannerCodex/         ← 배너 탐색·평가
│   ├── BrandWebReview/      ← 브랜드 웹 컨펌 워크플로
│   ├── BriefStudio/         ← AI 브리프 도구
│   ├── DesignEvaluator/     ← 디자인 평가
│   ├── LogoForge/           ← 로고 프롬프트 생성 (단일 파일)
│   ├── MotionMatrix/        ← 모션 효과 프롬프트
│   ├── NexusAdmin/          ← 관리자 콘솔
│   ├── PromotionArchive/    ← Brand Web Library
│   ├── PromptArc/           ← 프롬프트 공유 허브 (Firestore)
│   ├── PromptBuilder/       ← 카드형 프롬프트 빌더
│   ├── RenderMatrix/        ← 렌더링 프롬프트
│   ├── RenderMatrixPop/     ← 캐주얼·팝 변형 (v1/current 버전)
│   ├── RubiconForge/        ← 캠페인 컴포넌트 생성기 (disabled)
│   ├── TypecoreBreeze/      ← 캐주얼 타이포 (disabled)
│   ├── TypecoreSovereign/   ← RPG 타이포 (v1/v2/current 버전)
│   └── PlaceholderApp.jsx   ← 폴백
├── components/              ← Shell 전역 컴포넌트
│   ├── Shell.jsx            ← Topbar + AppRouter + Hero (메인 진입점)
│   ├── AppNavPopover.jsx    ← 햄버거 클릭 → 좌측 슬라이드 앱 목록
│   ├── DashboardHero.jsx    ← Runway 스타일 풀스크린 히어로
│   ├── DashboardRecentPrompts.jsx ← 16:9 썸네일 4개
│   ├── IndexSearchBar.jsx   ← Gemini 앱 추천 검색
│   ├── ProfilePopover.jsx   ← 우측 프로필 메뉴
│   ├── UserAvatar.jsx       ← 아바타 렌더 (emoji/initial/photo)
│   ├── AvatarPicker.jsx     ← 아바타 선택 모달
│   ├── UpgradeRequestModal.jsx
│   ├── InviteCodeModal.jsx
│   ├── AdminPanel.jsx       ← 레거시 관리자 패널 (NexusAdmin과 별도)
│   ├── UsageGate.jsx        ← 등급별 사용량 게이트
│   ├── LoginScreen.jsx / PendingScreen.jsx
│   └── NexusLogo.jsx        ← (현재 미사용) SVG 로고
├── config/
│   └── apps.js              ← APP_REGISTRY + THEME (단일 진실 소스)
├── context/
│   ├── AuthContext.jsx      ← Firebase Auth + profile + grade
│   └── GlobalContext.jsx    ← currentApp, navigate, payload, theme
├── lib/
│   ├── firebase.js          ← Firebase 싱글톤 (db, auth, appId)
│   ├── gemini.js            ← GEMINI_API_KEY + geminiUrl()
│   ├── storage.js           ← Cloudinary uploadBase64()
│   ├── grades.js            ← 등급/상태/초대코드/아바타/업그레이드 요청
│   ├── dashboardSettings.js ← 히어로 이미지 등 settings/dashboard 문서
│   ├── evaluationCriteria.js
│   └── folderPicker.js
├── App.jsx / main.jsx       ← 엔트리
└── index.css                ← 글로벌 (font-sans=Noto Sans KR, font-display=Teko)
```

## 4. APP_REGISTRY (단일 진실 소스)

| id | 그룹 | label / sub | 상태 | 색상 |
|---|---|---|---|---|
| `prompt-arc`           | hub      | 프롬프트 아크 / Prompt Arche       | 활성 | #6C5CE7 |
| `brief-studio`         | hub      | 브리프 스튜디오 / Brief Studio      | 활성 | #A29BFE |
| `prompt-builder`       | hub      | Prompt Builder                     | 활성 (beta) | #A29BFE |
| `banner-codex`         | evaluate | 배너 코덱스 / Banner Codex          | 활성 | #0eb9b3 |
| `promotion-archive`    | evaluate | Brand Web Library                  | 활성 | #C8A969 |
| `brand-web-review`     | evaluate | Brand Web Review                   | 활성 | #FD79A8 |
| `design-eval`          | evaluate | 디자인 평가도구 / Design Evaluator   | 준비 중 | #FD79A8 |
| `typecore-sovereign`   | generate | 타이프코어 소버린 / Typecore Sovereign | 활성 (v1/v2/latest 버전 통합) | #A29BFE |
| `typecore-breeze`      | generate | 타이프코어 브리즈 / Typecore Breeze  | 준비 중 | #74B9FF |
| `render-metrics`       | generate | 렌더 메트릭스 / Render Matrix        | 활성 | #00CEC9 |
| `render-matrix-pop`    | generate | Render Matrix: Pop                 | 활성 (beta, v1/current 버전 통합) | #55EFC4 |
| `motion-metrics`       | generate | 모션 메트릭스 / Motion Matrix         | 활성 | #FDCB6E |
| `rubicon-forge`        | generate | 루비콘 포지 / Rubicon Forge          | 준비 중 | #55EFC4 |
| `logo-forge`           | generate | Logo Forge                         | 활성 | #FD79A8 |
| `design-lexicon`       | generate | 디자인 렉시콘 / Design Lexicon       | 준비 중 | #55EFC4 |
| `banner-creator`       | generate | 배너 생성기 / Banner Creator         | 준비 중 (coming-soon) | #E17055 |
| `nexus-admin`          | admin    | NEXUS Admin                        | adminOnly | #6C5CE7 |

**필드 의미**:
- `versions: [...]` — 한 카드에 여러 버전 통합 (Typecore Sovereign, Render Matrix: Pop). localStorage `${id}:version` 키로 영속화
- `canReceive` / `canSend` — payload 흐름 그래프 (다른 앱에서 받기 / 보내기). 다른 앱이 사용하는 카드 칩에 표시됨
- `disabled: true` — "준비 중" 뱃지, 비활성 (admin은 admin-unlocked로 진입 가능)
- `adminOnly: true` — admin 사용자에게만 카드 노출
- `beta: true` — BETA 뱃지
- `color` — 카드 보더, Topbar 앱이름 색상 등에 사용

## 5. 라우팅 / 페이로드 흐름

- `useGlobal()` 의 `currentApp` 이 현재 앱 id (또는 null = 인덱스)
- `navigate(targetId, payload)` 로 앱 전환 + payload 전달
- 페이로드 구조: `{ source, target, prompt:{text, tags, style}, image:{url, metadata}, params }`
- 대시보드 카드 클릭 / Topbar 햄버거 메뉴 / 앱 내부 "보내기" 버튼 모두 동일 인터페이스 사용
- 앱 내부에서 `useEffect([payload])` 로 수신 처리:
  - `payload.params.viewPromptId` 있으면 → PromptArc는 상세보기 모달 오픈
  - `payload.prompt.text` 있으면 → PromptArc는 신규 등록 모달 오픈

## 6. Shell.jsx 핵심

- **height: 100vh, overflow: hidden** — 외부 컨테이너
- **Topbar** — sticky top:0, zIndex 1000, height 52px 고정
  - 좌측: `[☰ 햄버거]` + `[NEXUS STUDIO]` (인덱스) 또는 `[앱 이름]` (서브앱) — 모두 흰색 Teko
  - 인덱스에서만 스크롤 기반 투명도/블러 그라데이션 (0~50px 투명 → 150px+ opaque)
  - 우측: 프로필 아바타 (클릭 → `ProfilePopover`)
- **AppCardGrid** (인덱스 화면):
  - `DashboardHero` → `IndexSearchBar` → `DashboardRecentPrompts` → 그룹별 카드 그리드
  - `onScroll` → Shell의 `scrollY` 상태 갱신 → Topbar 투명도 계산
- **AppRouter** — currentApp id 기반 switch 케이스
- **selectedVersion 관리** — `versions` 배열을 가진 앱(Typecore Sovereign, Render Matrix: Pop)의 활성 버전. Topbar 중앙에 버전 탭 노출.

## 7. Firestore 스키마 요약

- `users/{uid}` — `email, displayName, role, status, grade, avatarType, avatarValue, createdAt, updatedAt`
- `users/{uid}/usage/{YYYY-MM-DD}` — `count, grade`
- `inviteCodes/{CODE}` — `active, maxUses, usedCount, expiresAt`
- `upgradeRequests/{auto}` — `uid, currentGrade, targetGrade, reason, status, createdAt`
- `settings/dashboard` — `heroImageUrl, updatedAt` (관리자 NexusAdmin에서 수정)
- `artifacts/{appId}/public/data/prompts/{id}` — PromptArc 컬렉션 (다른 앱들도 같은 경로 패턴 사용)
- `evaluationCriteria/{type}/versions/{version}` — DesignEvaluator 평가 기준

## 8. 등급 시스템 (`lib/grades.js`)

- `general` (10/day) → `pro` (50/day) → `expert` (∞)
- 자동 승급: `ncsoft.com` 이메일 도메인 또는 local-part에 `ncsoft` 포함 시 pro
- Admin 이메일 화이트리스트: `ADMIN_EMAILS = ["kds02@ncsoft.com"]`
- 초대 코드: `expert`로 즉시 승급 (트랜잭션으로 usedCount 증가)

## 9. 컨벤션 (지난 작업에서 정착된 패턴)

- **앱 내부 타이틀 없음** — 좌측 상단 앱 이름은 오직 Shell Topbar만 표시. 각 앱은 자기 이름을 다시 표시하지 않음
- **포인트 컬러는 `app.color` 사용** — 하드코딩 금지. 대시보드 카드·Topbar·내부 액센트 모두 한 값
- **사이드바 접기/펴기** — 햄버거 버튼 없이 빈 공간 클릭으로 토글. `handleSidebarClick` 패턴 (BannerCodex/PromptArc)
- **버전 통합 카드** — `versions:[{key,label,color}]` + `defaultVersion`. Shell이 localStorage로 영속화 + prop으로 앱에 주입
- **lazy + Suspense** — 큰 PromptEngine은 `React.lazy(() => import(...))`로 코드 스플리팅
- **services/ 폴더 패턴** — 큰 앱은 `<App>/services/firebase.js`, `<App>/services/gemini.js`로 외부 의존성 캡슐화 (MotionMatrix, RubiconForge, RenderMatrix 등에 적용됨)
- **AppTitle 컴포넌트 없음** — `src/components/AppTitle.jsx`는 의도적으로 제거됨 (revert된 상태)

## 10. 진행 현황 (최근 작업 정리)

### 완료된 큰 단위

- ✅ **Topbar 통합** — 햄버거 + 앱이름 + 프로필 1줄. 인덱스에서 스크롤 투명도 그라데이션
- ✅ **인덱스 히어로** — `DashboardHero`(Cloudinary 업로드 지원) + Gemini 검색 + 16:9 썸네일 4개
- ✅ **프로필 시스템** — 아바타 선택 (이모지 12종 / 이니셜 6컬러), 등급 업그레이드 요청, 초대 코드 입력
- ✅ **앱 통합** — Banner Codex / Brand Web Library / Brand Web Review / Brief Studio / Design Evaluator / Logo Forge / Motion Matrix / NexusAdmin / Prompt Arc / Prompt Builder / Render Matrix / Render Matrix: Pop / Rubicon Forge / Typecore Breeze / Typecore Sovereign 모두 작동
- ✅ **TypecoreSovereign 버전 통합** — v1/v2/current 한 카드에서 선택. 공통 폴더 구조 (versions/, services/, components/, hooks/, constants/) 마련됨 (Phase 1 구조 이동만 완료)
- ✅ **RenderMatrixPop 버전 통합** — v1/current 한 카드
- ✅ **RubiconForge 모듈 분리** — components/services/hooks/constants/index.jsx 38줄 엔트리로 정리 (979줄 → 다중 파일)
- ✅ **MotionMatrix/RenderMatrix 모듈 분리** — services/hooks/components 분리됨
- ✅ **Logo Forge 신규 앱** — 단일 파일, 3패널, Gemini 이미지 분석 + 프리셋
- ✅ **폰트 정책** — 본문 Noto Sans KR / 타이틀 Teko / 코드 JetBrains Mono. 인덱스 표지는 Teko로 통일
- ✅ **이미지 줌 슬라이더** — BannerCodex/PromptArc 상세보기에서 공통 컴포넌트형 (compact + backdrop-blur, 44px 터치 영역)

### 알려진 미완성 / 의도적 미구현

- `TypecoreSovereign/{components, hooks, constants}/*.jsx` — 대부분 stub (Phase 2 작업 대기)
- 각 PromptEngine 내부는 1500~2400줄 (Phase 1 구조 이동만 완료, 진짜 UI 추출은 Phase 2)
- 채팅 튜닝 룸 — RubiconForge에 state/handler만 있고 UI 미렌더 (의도적 dead code)
- `design-eval` / `design-lexicon` / `typecore-breeze` / `rubicon-forge` / `banner-creator` — `disabled: true` 플레이스홀더
- `ThemeToggle.jsx` — 라이트 모드 미완성 (다크 강제 고정)

## 11. 다음 작업 후보

### 우선순위 높음 (UX 마무리)

- [ ] **모바일 반응형** — 현재 데스크톱 우선. Topbar 햄버거 popover는 OK이지만 3패널 앱들은 모바일에서 깨짐
- [ ] **PromptArc viewPromptId 인입 검증** — 인덱스 썸네일 클릭 시 상세보기 자동 오픈 동작 실 테스트
- [ ] **대시보드 적응형 그룹 라벨** — admin 전용 그룹이 빈 줄로 남는 경우 없는지 확인

### Phase 2 작업 (코드 정리)

- [ ] **TypecoreSovereign 공통 UI 추출** — v1/v2/current PromptEngine에서 사이드바·헤더·결과 패널을 진짜로 공유 컴포넌트로 뽑기 (현재는 각 버전 내부 인라인)
- [ ] **각 PromptEngine 200줄 목표** — 옵션 데이터를 `constants/`, 핸들러를 `hooks/`로 추출
- [ ] **services/ 패턴 확산** — Firebase·Gemini 호출이 산재한 작은 앱들(BriefStudio, DesignEvaluator, PromptArc 일부)에도 같은 패턴 적용
- [ ] **`AdminPanel.jsx` 제거** — `NexusAdmin/UsersPanel`로 기능 이전 완료, 레거시 컴포넌트만 남음. ProfilePopover에서 호출하는 부분 정리하면 삭제 가능
- [ ] **`NexusLogo.jsx` / `NexusTitle.jsx`** — 현재 미사용. 향후 사용 계획 없으면 삭제

### 신규 기능

- [ ] **테마 토글** — 라이트 모드 완성. `GlobalContext.theme` 토글 살리기
- [ ] **언어 토글** — i18n 도입 (한국어/English). ProfilePopover에 stub만 있음
- [ ] **PromptArc 폴더 공유** — 현재는 user별 private. 팀 공유 기능 필요 시 Firestore Rule 추가 작업
- [ ] **Banner Creator** — coming-soon 플레이스홀더. 실제 구현 필요
- [ ] **Design Lexicon** — 디자인 용어 사전, 미구현
- [ ] **Banner Codex AI 검색** — Cross-Check(OpenAI) 기능 미완성 (apiKey 입력란만 있음)

## 12. 개발 명령

```bash
npm run dev       # 개발 서버 (포트 5173~5179 자동)
npm run build     # 프로덕션 빌드
npm run lint      # ESLint
npm run cors:set  # GCS CORS 설정 (스크립트)
```

## 13. 자주 쓰는 디버깅

- **Firestore 권한 에러**: `firestore.rules`가 등록되어 있는지 확인. 사용자 doc은 자기 자신 또는 admin만 쓰기 가능.
- **Cloudinary 업로드 실패**: `.env`의 `VITE_CLOUDINARY_*` 두 변수 확인 + Cloudinary console에서 unsigned upload preset 활성화 여부
- **Gemini 429**: API 키 quota 초과 또는 키 누락. 인덱스 `IndexSearchBar`·`LogoForge` AI 분석·`NexusAdmin` settings 모두 동일 키 사용
- **앱 추가/삭제**: `src/config/apps.js`의 APP_REGISTRY 수정 + `src/components/Shell.jsx`의 `AppRouter` switch 케이스에 import/case 추가 (두 곳 동기화 필수)
