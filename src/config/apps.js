export const THEME = {
  bg: "#0A0A0F", surface: "#111118", card: "#16161F",
  border: "#1E1E2E", accent: "#6C5CE7", accentSoft: "#2D2A4A",
  text: "#E8E6FF", textMuted: "#7A7A9A", textDim: "#3A3A5A",
};

export const APP_REGISTRY = [
  { id: "prompt-arc",          label: "프롬프트 아크",      sub: "Prompt Arche",        abbr: "Pa", icon: "⊕", desc: "이지와 함께하는 프롬프트 공유 플랫폼",              group: "explore", color: "#6C5CE7", canReceive: ["typecore-sovereign","typecore-breeze","render-metrics","motion-metrics","design-lexicon"], canSend: ["typecore-sovereign","typecore-breeze","render-metrics","motion-metrics","design-eval"] },
  { id: "banner-codex",        label: "배너 코덱스",       sub: "Banner Codex",        abbr: "Bc", icon: "◈", desc: "배너 탐색 및 평가 시스템",                        group: "explore", color: "#0eb9b3", canReceive: [],                                                                              canSend: ["design-eval"] },
  { id: "promotion-archive",   label: "Brand Web Library",  sub: "Brand Web Library",   abbr: "Bw", icon: "▦", desc: "브랜드 웹 디자인 자료 라이브러리 · AI 검색/분석",      group: "explore", color: "#C8A969", canReceive: [],                                                                              canSend: ["design-eval", "brand-web-review"] },
  { id: "brand-web-review",    label: "Brand Web Review",   sub: "Brand Web Review",    abbr: "Br", icon: "◆", desc: "브랜드 웹 디자인 컨펌 및 리뷰 플랫폼",                 group: "explore", color: "#FD79A8", canReceive: ["promotion-archive"],                                                          canSend: ["design-eval"], disabled: true },
  { id: "brief-studio",        label: "브리프 스튜디오",    sub: "Brief Studio",        abbr: "Bs", icon: "◐", desc: "문서와 레퍼런스로 디자인 방향성을 잡아주는 AI 브리프 도구", group: "explore", color: "#A29BFE", canReceive: [],                                                                              canSend: ["typecore-sovereign","typecore-breeze","render-metrics","design-eval"], disabled: true },
  { id: "typecore-sovereign",  label: "타이프코어 소버린",  sub: "Typecore Sovereign",  abbr: "Ts", icon: "⟁", desc: "RPG류 게임의 타이포그래피 프롬프트 생성 — 버전 선택 가능",  group: "generate", color: "#A29BFE", canReceive: ["prompt-arc"],                                                                  canSend: ["prompt-arc","render-metrics"],
    versions: [
      { key: "v1",     label: "v1 안정",  color: "#74B9FF" },
      { key: "v2",     label: "v2 개선",  color: "#A29BFE" },
      { key: "latest", label: "최신",     color: "#0eb9b3" },
    ],
    defaultVersion: "latest" },
  { id: "typecore-breeze",     label: "타이프코어 브리즈",  sub: "Typecore Breeze",     abbr: "Tb", icon: "◎", desc: "캐주얼 게임 · 타이포 · 캘리그라피 프롬프트 생성",  group: "generate", color: "#74B9FF", canReceive: ["prompt-arc"],                                                                  canSend: ["prompt-arc","render-metrics"], disabled: true },
  { id: "render-metrics",      label: "렌더 메트릭스",      sub: "Render Matrix",       abbr: "Rm", icon: "⬡", desc: "2D 플랫 이미지에 입체감 · 재질감을 입히는 프롬프트 생성", group: "generate", color: "#00CEC9", canReceive: ["prompt-arc","typecore-sovereign","typecore-breeze"],                    canSend: ["prompt-arc","motion-metrics","design-eval"] },
  { id: "render-matrix-pop",   label: "Render Matrix: Pop", sub: "Render Matrix: Pop", abbr: "Rp", icon: "✦", desc: "캐주얼·팝 톤의 렌더링 프롬프트 생성기 — 버전 선택 가능",  group: "generate", color: "#55EFC4", canReceive: ["prompt-arc","typecore-sovereign","typecore-breeze"],                    canSend: ["prompt-arc","motion-metrics","design-eval"], beta: true,
    versions: [
      { key: "v1",      label: "v1 안정", color: "#F4B860" },
      { key: "current", label: "최신",    color: "#A29BFE" },
    ],
    defaultVersion: "current" },
  { id: "motion-metrics",      label: "모션 메트릭스",      sub: "Motion Matrix",       abbr: "Mm", icon: "⟳", desc: "생성된 결과물에 모션 효과를 만드는 프롬프트 생성",    group: "generate", color: "#FDCB6E", canReceive: ["prompt-arc","render-metrics"],                                             canSend: ["prompt-arc","design-eval"] },
  { id: "prompt-builder",      label: "Prompt Builder",     sub: "Prompt Builder",      abbr: "Pb", icon: "◐", desc: "카드형 프롬프트 조립 시스템",                          group: "generate", color: "#A29BFE", canReceive: ["prompt-arc","render-metrics","motion-metrics","typecore-sovereign","typecore-breeze"], canSend: ["prompt-arc","motion-metrics","render-metrics","design-eval"], disabled: true },
  { id: "rubicon-forge",       label: "루비콘 포지",        sub: "Rubicon Forge",       abbr: "Rf", icon: "⬢", desc: "버튼 · 카드 · 패널 등 캠페인 컴포넌트 생성기",        group: "generate", color: "#55EFC4", canReceive: [],                                                                              canSend: ["prompt-arc","design-eval"], disabled: true },
  { id: "logo-forge",          label: "Logo Forge",         sub: "Logo Forge",          abbr: "Lf", icon: "◈", desc: "로고 디자인 프롬프트 생성 도구",                       group: "generate", color: "#FD79A8", canReceive: ["prompt-arc","brief-studio"],                                                  canSend: ["prompt-arc","design-eval"], disabled: true },
  { id: "design-lexicon",      label: "디자인 렉시콘",      sub: "Design Lexicon",      abbr: "Dl", icon: "⊟", desc: "디자인 용어·레퍼런스 사전 (준비 중)",                  group: "generate", color: "#55EFC4", canReceive: [],                                                                              canSend: ["prompt-arc","design-eval"], disabled: true, status: "coming-soon" },
  { id: "design-eval",         label: "디자인 평가도구",    sub: "Design Evaluator",    abbr: "De", icon: "◉", desc: "브랜드 사이트 · 프로모션 · 배너 디자인 평가",          group: "explore", color: "#FD79A8", canReceive: ["banner-codex","prompt-arc","render-metrics","motion-metrics","rubicon-forge"], canSend: [], disabled: true },
  { id: "banner-creator",       label: "배너 생성기",        sub: "Banner Creator",      abbr: "Bc", icon: "▣", desc: "이미지 업로드 후 Split 배너 즉시 제작 · 다운로드",         group: "production", color: "#E17055", canReceive: [],                                                                              canSend: [] },
  { id: "visual-flux",         label: "Visual Flux",        sub: "Visual Flux",         abbr: "Vf", icon: "▣", desc: "배너·비주얼 자동 생성 (준비 중)",                       group: "production", color: "#E17055", canReceive: ["banner-codex"],                                                              canSend: ["banner-codex","design-eval"], disabled: true, status: "coming-soon" },
  { id: "nexus-admin",         label: "NEXUS Admin",        sub: "NEXUS Admin",         abbr: "Na", icon: "⚙", desc: "플랫폼 관리자 전용 설정 및 관리 도구",                  group: "admin",    color: "#6C5CE7", canReceive: [],                                                                              canSend: [], adminOnly: true },
];

export const APP_MAP = Object.fromEntries(APP_REGISTRY.map(a => [a.id, a]));
