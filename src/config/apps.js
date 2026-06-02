// 다크 — 기존 토큰. 모든 셸/앱이 기본으로 참조.
export const THEME_DARK = {
  bg: "#0A0A0F", surface: "#111118", card: "#16161F",
  border: "#1E1E2E", accent: "#6C5CE7", accentSoft: "#2D2A4A",
  text: "#E8E6FF", textMuted: "#7A7A9A", textDim: "#3A3A5A",
  // 다크 전용 보조(라이트와 톤이 다른 곳에서 사용)
  hoverBg: "rgba(255,255,255,0.05)",
};

// 라이트 — Vercel / Linear 스타일 화이트 톤. surface=흰색, card=살짝 회색.
export const THEME_LIGHT = {
  bg: "#F7F7FA", surface: "#FFFFFF", card: "#F2F2F6",
  border: "#E4E4EC", accent: "#6C5CE7", accentSoft: "#EFEDFE",
  text: "#1A1A24", textMuted: "#6B6B80", textDim: "#9696A8",
  hoverBg: "rgba(0,0,0,0.04)",
};

// 하위 호환 — 기존 `THEME` 참조는 다크를 가리킴.
// 새 코드는 `useTheme()`(GlobalContext)을 통해 활성 토큰을 받아야 함.
export const THEME = THEME_DARK;

export const pickTheme = (isLight) => (isLight ? THEME_LIGHT : THEME_DARK);

export const APP_REGISTRY = [
  { id: "prompt-arc",          label: "프롬프트 아크",      sub: "Prompt Arche",        abbr: "Pa", icon: "⊕", desc: "이지와 함께하는 프롬프트 공유 플랫폼",              group: "explore", color: "#6C5CE7", canReceive: ["typecore-sovereign","typecore-breeze","render-metrics","motion-metrics","design-lexicon"], canSend: ["typecore-sovereign","typecore-breeze","render-metrics","motion-metrics","design-eval"] },
  { id: "banner-codex",        label: "배너 코덱스",       sub: "Banner Codex",        abbr: "Bc", icon: "◈", desc: "배너 탐색 및 평가 시스템",                        group: "explore", color: "#0eb9b3", canReceive: [],                                                                              canSend: ["design-eval", "asset-library"] },
  { id: "promotion-archive",   label: "Brand Web Library",  sub: "Brand Web Library",   abbr: "Bw", icon: "▦", desc: "브랜드 웹 디자인 자료 라이브러리 · AI 검색/분석",      group: "explore", color: "#C8A969", canReceive: [],                                                                              canSend: ["design-eval", "brand-web-review", "asset-library"] },
  { id: "brand-web-review",    label: "Brand Web Review",   sub: "Brand Web Review",    abbr: "Br", icon: "◆", desc: "브랜드 웹 디자인 컨펌 및 리뷰 플랫폼",                 group: "explore", color: "#FD79A8", canReceive: ["promotion-archive","design-eval"],                                            canSend: ["design-eval"] },
  { id: "competitor-radar",    label: "경쟁사 레이더",      sub: "Competitor Radar",    abbr: "Cr", icon: "⊙", desc: "경쟁사 프로모션·업데이트 디자인 정기 모니터링 · 트렌드 리포트", group: "explore", color: "#FF7675", canReceive: [],                                                                              canSend: ["design-eval"], beta: true, adminOnly: true },
  { id: "prompt-audit",        label: "프롬프트 최적화",    sub: "Prompt Optimizer",    abbr: "Po", icon: "◎", desc: "프롬프트 충돌 검출 + 대안 제시 + 엔진 학습용 데이터 적재",   group: "explore", color: "#A29BFE", canReceive: ["prompt-arc","typecore-sovereign","typecore-breeze","render-metrics","motion-metrics"], canSend: ["prompt-arc","typecore-sovereign","render-metrics","motion-metrics"], beta: true },
  { id: "asset-library",       label: "에셋 라이브러리",   sub: "Asset Library",       abbr: "Al", icon: "▥", desc: "타이틀·버튼·박스·아이콘 등 영역 선택으로 모은 에셋 보관소", group: "explore", color: "#55EFC4", canReceive: ["banner-codex","promotion-archive"],                                          canSend: [] },
  { id: "brief-studio",        label: "브리프 스튜디오",    sub: "Brief Studio",        abbr: "Bs", icon: "◐", desc: "문서와 레퍼런스로 디자인 방향성을 잡아주는 AI 브리프 도구", group: "explore", color: "#A29BFE", canReceive: [],                                                                              canSend: ["typecore-sovereign","typecore-breeze","render-metrics","design-eval"], disabled: true, adminOnly: true },
  { id: "typecore-sovereign",  label: "타이프코어 소버린",  sub: "Typecore Sovereign",  abbr: "Ts", icon: "⟁", desc: "RPG류 게임의 타이포그래피 프롬프트 생성",  group: "generate", color: "#A29BFE", canReceive: ["prompt-arc"],                                                                  canSend: ["prompt-arc","render-metrics"],
    versions: [
      { key: "latest",   label: "최신",      color: "#0eb9b3" },
    ],
    defaultVersion: "latest" },
  { id: "typecore-breeze",     label: "타이프코어 브리즈",  sub: "Typecore Breeze",     abbr: "Tb", icon: "◎", desc: "캐주얼 게임 · 타이포 · 캘리그라피 프롬프트 생성",  group: "generate", color: "#74B9FF", canReceive: ["prompt-arc"],                                                                  canSend: ["prompt-arc","render-metrics"] },
  { id: "render-metrics",      label: "렌더 메트릭스",      sub: "Render Matrix",       abbr: "Rm", icon: "⬡", desc: "2D 플랫 이미지에 입체감 · 재질감을 입히는 프롬프트 생성", group: "generate", color: "#00CEC9", canReceive: ["prompt-arc","typecore-sovereign","typecore-breeze"],                    canSend: ["prompt-arc","motion-metrics","design-eval"] },
  { id: "render-matrix-pop",   label: "Render Matrix: Pop", sub: "Render Matrix: Pop", abbr: "Rp", icon: "✦", desc: "캐주얼·팝 톤의 렌더링 프롬프트 생성기 — 버전 선택 가능",  group: "generate", color: "#55EFC4", canReceive: ["prompt-arc","typecore-sovereign","typecore-breeze"],                    canSend: ["prompt-arc","motion-metrics","design-eval"], beta: true, adminOnly: true,
    versions: [
      { key: "v1",      label: "v1 안정", color: "#F4B860" },
      { key: "current", label: "최신",    color: "#A29BFE" },
    ],
    defaultVersion: "current" },
  { id: "motion-metrics",      label: "모션 메트릭스",      sub: "Motion Matrix",       abbr: "Mm", icon: "⟳", desc: "생성된 결과물에 모션 효과를 만드는 프롬프트 생성",    group: "generate", color: "#FDCB6E", canReceive: ["prompt-arc","render-metrics"],                                             canSend: ["prompt-arc","design-eval"] },
  { id: "prompt-builder",      label: "Prompt Builder",     sub: "Prompt Builder",      abbr: "Pb", icon: "◐", desc: "카드형 프롬프트 조립 — 모션·렌더링·타이포·배너 5 카테고리 + 커스텀 카드 + 프리셋",  group: "generate", color: "#A29BFE", canReceive: ["prompt-arc","render-metrics","motion-metrics","typecore-sovereign","typecore-breeze"], canSend: ["prompt-arc","motion-metrics","render-metrics","design-eval"], beta: true, adminOnly: true },
  { id: "prompt-builder-v2",   label: "프롬프트 빌더 v2",   sub: "Prompt Builder v2",   abbr: "P2", icon: "◑", desc: "CLI 패치 기반 카드형 프롬프트 빌더 — 모션·타이포 13장 카드 + 검증 + 프리셋",          group: "generate", color: "#FFD166", canReceive: [],                                                                              canSend: [], beta: true, adminOnly: true },
  { id: "rubicon-forge",       label: "루비콘 포지",        sub: "Rubicon Forge",       abbr: "Rf", icon: "⬢", desc: "버튼 · 카드 · 패널 등 캠페인 컴포넌트 생성기",        group: "generate", color: "#55EFC4", canReceive: [],                                                                              canSend: ["prompt-arc","design-eval"], disabled: true, adminOnly: true },
  { id: "logo-forge",          label: "Logo Forge",         sub: "Logo Forge",          abbr: "Lf", icon: "◈", desc: "로고 디자인 프롬프트 생성 도구",                       group: "generate", color: "#FD79A8", canReceive: ["prompt-arc","brief-studio"],                                                  canSend: ["prompt-arc","design-eval"], disabled: true, adminOnly: true },
  { id: "design-lexicon",      label: "디자인 렉시콘",      sub: "Design Lexicon",      abbr: "Dl", icon: "⊟", desc: "디자인 방법론 지식 베이스 — 용어·이론·예시 검색",       group: "generate", color: "#55EFC4", canReceive: [],                                                                              canSend: ["prompt-arc","design-eval"], beta: true, adminOnly: true },
  { id: "design-eval",         label: "디자인 평가도구",    sub: "Design Evaluator",    abbr: "De", icon: "◉", desc: "브랜드 사이트 · 프로모션 · 배너 디자인 평가",          group: "explore", color: "#FD79A8", canReceive: ["banner-codex","prompt-arc","render-metrics","motion-metrics","rubicon-forge"], canSend: [], disabled: true, adminOnly: true },
  { id: "banner-creator",      label: "배너 생성기",        sub: "Banner Creator",      abbr: "Bc", icon: "▣", desc: "이미지 업로드 후 Split 배너 즉시 제작 · 다운로드",         group: "production", color: "#E17055", canReceive: [],                                                                              canSend: [], adminOnly: true },
  { id: "nexus-preview",       label: "NEXUS Preview",      sub: "NEXUS Preview",       abbr: "Np", icon: "▤", desc: "생성된 타이틀을 실제 플랫폼 목업 위에 자동 배치·검수·출력",   group: "production", color: "#22B8CF", canReceive: ["typecore-sovereign","typecore-breeze","mask-forge","banner-codex","render-matrix-pop"], canSend: ["design-eval"], adminOnly: true },
  { id: "mask-forge",          label: "Mask Forge",         sub: "Mask Forge",          abbr: "Mf", icon: "✂", desc: "Remove.bg AI로 이미지 배경을 4K 해상도까지 정밀 제거",   group: "production", color: "#FF3366", canReceive: [],                                                                              canSend: ["nexus-preview"] },
  { id: "vector-forge",        label: "Vector Forge",       sub: "Vector Forge",        abbr: "Vf", icon: "◇", desc: "비트맵 이미지를 SVG 벡터로 변환 — Marching Squares + 베지어 피팅",  group: "production", color: "#3DDC84", canReceive: [],                                                                              canSend: [] },
  { id: "lumkey",              label: "루마키",             sub: "LumKey",              abbr: "Lk", icon: "◐", desc: "영상 배경 제거 — 루마키·스크린·크로마·멀티플라이",        group: "production", color: "#C8FF00", canReceive: [],                                                                              canSend: [] },
  { id: "figma-l10n",          label: "피그마 번역기",      sub: "Figma L10N",          abbr: "Fl", icon: "文", desc: "엑셀 번역표 → Figma 번역 플러그인 자동 생성 · 언어 자동 감지", group: "production", color: "#5C7CFA", canReceive: [],                                                                              canSend: [] },
  { id: "visual-flux",         label: "Visual Flux",        sub: "Visual Flux",         abbr: "Vf", icon: "▣", desc: "배너·비주얼 자동 생성 (준비 중)",                       group: "production", color: "#E17055", canReceive: ["banner-codex"],                                                              canSend: ["banner-codex","design-eval"], disabled: true, status: "coming-soon", adminOnly: true },
  { id: "nexus-admin",         label: "NEXUS Admin",        sub: "NEXUS Admin",         abbr: "Na", icon: "⚙", desc: "플랫폼 관리자 전용 설정 및 관리 도구",                  group: "admin",    color: "#6C5CE7", canReceive: [],                                                                              canSend: [], adminOnly: true },
];

export const APP_MAP = Object.fromEntries(APP_REGISTRY.map(a => [a.id, a]));
