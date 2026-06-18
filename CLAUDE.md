# NEXUS Studio — Claude 작업 가이드

Creative Nexus Platform — 디자인·프롬프트·AI 도구를 묶은 단일 React 앱. 한 Shell이 여러 서브앱을 라우팅하는 구조.

## 1. 기술 스택

- Vite 8 + React 19 + Tailwind v4 (`@theme` 토큰)
- Firebase Auth + Firestore, Cloudinary (unsigned preset), Gemini API (`gemini-2.5-flash` 기본)
- 폰트: Noto Sans KR 본문 / Teko 타이틀 / JetBrains Mono 코드·프롬프트 미리보기

## 2. 환경 변수 (`.env`)

```bash
VITE_FIREBASE_*=          # Firebase Web SDK config
VITE_GEMINI_API_KEY=      # Gemini REST API key
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
```

`src/lib/firebase.js` / `gemini.js` / `storage.js` 가 각각 읽음.

⚠️ **Gemini 키는 백엔드 프록시로 격리** — 모든 `generativelanguage.googleapis.com` 호출은 `lib/gemini.js` 의 `window.fetch` 래퍼가 가로채 **`/api/gemini` 프록시로 우회**하고 `key` 파라미터를 제거한다. 실제 키는 서버 전용 `GEMINI_API_KEY`(VITE_ 아님)에만 둔다 — 프로덕션은 `api/gemini.js`(Vercel Edge), 개발은 `vite.config.js` 의 dev 미들웨어가 처리. 클라이언트의 `VITE_GEMINI_API_KEY` 는 더미('proxy')이며 "키 존재" 가드 통과용일 뿐 노출돼도 무해. 새 Gemini 호출을 추가할 때 URL/키를 직접 만들어도 래퍼가 자동 우회하므로 호출부 수정 불필요.

## 3. 단일 진실 소스

- **앱 목록**: `src/config/apps.js` 의 `APP_REGISTRY` (그룹: explore / generate / production / admin)
- **테마 토큰**: 같은 파일의 `THEME_DARK` / `THEME_LIGHT` + `pickTheme(isLight)`
- **앱 라우팅 switch**: `src/components/Shell.jsx` 의 `AppRouter`
- ⚠️ **앱 추가·삭제는 두 곳 동기화 필수** — `APP_REGISTRY` 와 `AppRouter` 의 import/case 양쪽

APP_REGISTRY 필드 의미:
- `versions:[{key,label,color}]` + `defaultVersion` — 한 카드에 여러 버전 통합. Shell이 `localStorage('${id}:version')` 영속화 + prop 주입. 적용: `typecore-sovereign`, `render-matrix-pop`. **같은 도메인의 변종은 카드 늘리지 말고 versions 로.**
- `canReceive` / `canSend` — payload 흐름 그래프 (다른 앱이 사용하는 카드 칩에 표시)
- `disabled: true` — "준비 중" 뱃지, 비활성 (admin은 unlock 진입 가능)
- `adminOnly: true` — admin 사용자에게만 노출
- `beta: true` — BETA 뱃지
- `color` — 카드 보더, Topbar 앱이름, 내부 액센트 등에 사용

## 4. 라우팅 / 페이로드 흐름

- `useGlobal().currentApp` — 현재 앱 id (null = 인덱스)
- `navigate(targetId, payload)` 로 앱 전환 + payload 전달
- 페이로드 구조: `{ source, target, prompt:{text,tags,style}, image:{url,metadata}, params }`
- 대시보드 카드 / 햄버거 메뉴 / 앱 내부 "보내기" 모두 같은 인터페이스
- 앱은 `useEffect([payload])` 로 수신. 예) PromptArc:
  - `payload.params.viewPromptId` → 상세보기 모달
  - `payload.prompt.text` → 신규 등록 모달

## 5. Firestore 스키마

- `users/{uid}` — `email, displayName, role, status, grade, avatarType, avatarValue, createdAt, updatedAt`
- `users/{uid}/usage/{YYYY-MM-DD}` — `count, grade` (레거시 일일 카운트)
- `users/{uid}/credits/{YYYY-Www}` — `used, byAction:{image,video,analysis}, grade, updatedAt` (주간 크레딧, ISO 주)
- `inviteCodes/{CODE}` — `active, maxUses, usedCount, expiresAt`
- `upgradeRequests/{auto}` — `uid, currentGrade, targetGrade, reason, status, createdAt`
- `settings/dashboard` — `heroImageUrl, updatedAt` (NexusAdmin 에서 수정)
- `artifacts/{appId}/public/data/settings/gameLogos` — `{ [gameName]: base64 dataURL }`. **단일 진실 소스**: NexusAdmin → "게임 로고" 패널이 유일한 쓰기 권한자. BannerCodex / PromotionArchive 는 `lib/gameLogos.js` 로 읽기만.
- `artifacts/{appId}/public/data/prompts/{id}` — PromptArc (다른 앱들도 같은 경로 패턴)
- `artifacts/{appId}/public/data/banners/{id}` — BannerCodex
- `artifacts/{appId}/users/{uid}/brandWebProjects/{projectId}` — BrandWebReview
- `artifacts/{appId}/users/{uid}/evaluations/{id}` — DesignEvaluator
- `artifacts/{appId}/users/{uid}/audits/{id}` — PromptAudit
- `evaluationCriteria/{type}/versions/{version}` — DesignEvaluator·BrandWebLibrary 평가 기준 (브랜드웹/프로모션 분리)

## 6. 등급 / 주간 크레딧 (`lib/grades.js`)

**등급 4단계** — `general` → `pro` → `pro_plus` → `expert`
- 자동 승급: `ncsoft.com` 도메인 또는 local-part에 `ncsoft` 토큰 포함 시 → pro
- `pro_plus` — 내부 관계자, NexusAdmin 에서 관리자가 직접 부여
- Admin 화이트리스트: `ADMIN_EMAILS = ["kds02@ncsoft.com"]`
- 초대 코드: expert 즉시 승급 (트랜잭션으로 `usedCount` 증가)

**주간 크레딧** (`WEEKLY_CREDITS`, 월요일 00:00 KST 리셋, ISO `weekKey()`)
- general 50 / pro 150 / pro_plus 300 / expert 1000

**액션 단가** (`ACTION_COSTS`)
- `image` 10c — Imagen, Banner Creator 등
- `video` 30c — MotionMatrix Veo 3
- `analysis` 1c — Gemini 텍스트 (검색·평가·PromptAudit)

**호출 가드 필수** — 모든 생성 호출 전 `useUsageGate().ensureCanGenerate(action)` 통과. 부족하면 업그레이드 모달 자동 표시. 훅이 반환하는 `modal` JSX 도 컴포넌트 트리에 포함해야 모달이 보임.

레거시 `DAILY_LIMITS` 와 `usage/{YYYY-MM-DD}` 는 일부 컴포넌트가 아직 사용. 신규 코드는 주간 크레딧 권장.

## 7. 컨벤션 (안 지키면 자주 깨지는 약속)

- **앱 내부 타이틀 금지** — 좌측 상단 앱 이름은 Shell Topbar 만 표시. 각 앱이 자기 이름을 다시 표시하지 않음.
- **포인트 컬러는 `app.color`** — 하드코딩 금지. 대시보드 카드 / Topbar / 내부 액센트 모두 한 값.
- **테마 토큰 참조** — 새 코드는 `useTheme()`(GlobalContext) 로 활성 토큰을 받음. 다크 컬러 직접 하드코딩 금지.
- **사이드바 토글은 빈 공간 클릭** — 햄버거 버튼 없음. `handleSidebarClick` 패턴 (BannerCodex / PromptArc / BrandWebReview).
- **사이드바 그룹 접기** — `SectionGroup` + `storageKey` 로 열림 상태 영속화. 사이드바 최상단을 `<SectionGroupAccent value={app.color}>` 로 감싸면 펼친 카드 tint 자동 적용.
- **services/ 폴더 패턴** — 큰 앱은 `<App>/services/firebase.js` / `services/gemini.js` 로 외부 의존성 캡슐화. components / hooks / constants 도 같이 분리.
- **이미지·노트는 Cloudinary URL 만 Firestore 에 저장** — dataURL 은 localStorage 캐시까지만. 이유: Firestore doc 1MB 제한.
- **공유 폴더 경로 헬퍼** — `buildSharedFolderPath()` 로 `\\ppc-file\{게임}\{연도}\{섹션}\{캠페인}\03.디자인` 일관 생성. BrandWebReview·PromotionArchive 의 폴더 URL 입력에 사용.
- **게임 로고는 NexusAdmin 단일 관리** — `lib/gameLogos.js` 의 `subscribeToGameLogos` 로 읽기만. 쓰기(`saveGameLogo`/`removeGameLogo`)는 NexusAdmin 패널이 유일. 새 앱에 로고 칩 추가 시 같은 lib 으로 구독.
- **lazy + Suspense** — 큰 PromptEngine 은 `React.lazy()` 로 코드 스플리팅.
- **글로벌 nav popover z-index 50000+** — AppNavPopover / ProfilePopover / CommandPalette. 일반 모달은 9999 이하.
- **결과 프롬프트 인라인 압축** — `lib/promptCompressor.js` 의 `compressPrompt()` 가 PromptAudit 분석 로직을 재사용. 결과가 긴 앱(Render/Motion Matrix 등)에서 동일 함수 호출.

## 8. 함정 / 의도적 미구현 (모르면 잘못 고치기 쉬움)

- `design-eval` 의 `disabled: true` 플래그 — **플래그는 남아 있지만 실제 동작**(다른 앱에서 송신 정상). 플래그만 보고 비활성 처리 금지.
- RubiconForge 채팅 튜닝 룸 — state/handler 만 있고 UI 미렌더. **의도적 dead code.**
- TypecoreSovereign `components/hooks/constants/*.jsx` — 대부분 stub (Phase 2 대기). 각 PromptEngine 은 1500~2400 줄 인라인.
- `disabled: true` 플레이스홀더 — `brief-studio`, `typecore-breeze`, `rubicon-forge`, `logo-forge`, `visual-flux`.
- BrandWebReview `status='approved'` — 별도 큐로 이동·아카이브는 미구현.
- BannerCodex 드래그앤드롭 등록 모달 — 사용자 요청으로 deferred.
- `NexusLogo.jsx` / `NexusTitle.jsx` — 현재 미사용.

## 9. 개발 명령

```bash
npm run dev       # 개발 서버 (포트 5173~5179 자동)
npm run build
npm run lint
npm run cors:set  # GCS CORS 설정 스크립트
```

## 10. 디버깅 체크리스트

- **Firestore 권한 에러** — `firestore.rules` 등록 여부. 사용자 doc 은 본인 또는 admin 만 쓰기 가능. `lib/firebaseDebug.js` 로 진단.
- **Cloudinary 업로드 실패** — `.env` 의 `VITE_CLOUDINARY_*` 두 변수 + Cloudinary console 의 unsigned preset 활성화 여부.
- **Gemini 429** — 키 quota 초과 또는 누락. IndexSearchBar / LogoForge / NexusAdmin / PromptAudit 모두 동일 키 사용.
- **크레딧 모달이 안 뜸** — 생성 호출 직전 `await ensureCanGenerate(action)` 누락 또는 `useUsageGate()` 의 `modal` JSX 가 트리에 없음.
- **Veo 영상 폴링 타임아웃** — `veoRender.js` 의 `POLL_TIMEOUT_MS`(5분) 초과. 모델 ID(`VEO_MODELS.id`) 가 잘못된 경우도 같은 증상.
- **Remove.bg 402** — Mask Forge 크레딧 부족. 사용자 API 키는 `localStorage('mask-forge:apiKey')`.
- **BrandWebReview localStorage quota** — dataURL 오염 케이스. Cloudinary 정상이면 거의 발생 안 함. 콘솔 `[BrandWebReview] save failed` 확인.
- **모달이 햄버거 메뉴를 가림** — 새 모달이 z-index 50000+ 인 경우. 9999 이하로 조정.
- **SectionGroup tint 가 단조로움** — 앱 사이드바 최상단을 `<SectionGroupAccent>` 로 감싸지 않은 경우. 폴백 컬러로 그려짐.
- **앱 추가했는데 안 뜸** — `APP_REGISTRY` 만 추가하고 `Shell.jsx` `AppRouter` 의 import/case 누락.
