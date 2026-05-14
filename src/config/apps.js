export const THEME = {
  bg: "#0A0A0F", surface: "#111118", card: "#16161F",
  border: "#1E1E2E", accent: "#6C5CE7", accentSoft: "#2D2A4A",
  text: "#E8E6FF", textMuted: "#7A7A9A", textDim: "#3A3A5A",
};

export const APP_REGISTRY = [
  { id: "banner-codex",        label: "배너 코덱스",       sub: "Banner Codex",        icon: "◈", desc: "배너 탐색 및 평가 시스템",                        group: "evaluate", color: "#E17055", canReceive: [],                                                                              canSend: ["design-eval"] },
  { id: "promotion-archive",   label: "프로모션 아카이브",  sub: "Promotion Archive",   icon: "▦", desc: "Dexie 기반 배너 아카이브 · AI 검색/분석",          group: "evaluate", color: "#E84393", canReceive: [],                                                                              canSend: ["design-eval"] },
  { id: "prompt-arc",          label: "프롬프트 아크",      sub: "Prompt Arc",          icon: "⊕", desc: "이지와 함께하는 프롬프트 공유 플랫폼",              group: "hub",      color: "#6C5CE7", canReceive: ["typecore-sovereign","typecore-breeze","render-metrics","motion-metrics","design-lexicon"], canSend: ["typecore-sovereign","typecore-breeze","render-metrics","motion-metrics","design-eval"] },
  { id: "brief-studio",        label: "브리프 스튜디오",    sub: "Brief Studio",        icon: "◐", desc: "문서와 레퍼런스로 디자인 방향성을 잡아주는 AI 브리프 도구", group: "hub",      color: "#A29BFE", canReceive: [],                                                                              canSend: ["typecore-sovereign","typecore-breeze","render-metrics","design-eval"] },
  { id: "typecore-sovereign",  label: "타이프코어 소버린",  sub: "Typecore Sovereign",  icon: "⟁", desc: "RPG류 게임의 타이포그래피 프롬프트 생성",            group: "generate", color: "#A29BFE", canReceive: ["prompt-arc"],                                                                  canSend: ["prompt-arc","render-metrics"] },
  { id: "typecore-breeze",     label: "타이프코어 브리즈",  sub: "Typecore Breeze",     icon: "◎", desc: "캐주얼 게임 · 타이포 · 캘리그라피 프롬프트 생성",  group: "generate", color: "#74B9FF", canReceive: ["prompt-arc"],                                                                  canSend: ["prompt-arc","render-metrics"], disabled: true },
  { id: "render-metrics",      label: "렌더 메트릭스",      sub: "Render Metrics",      icon: "⬡", desc: "2D 플랫 이미지에 입체감 · 재질감을 입히는 프롬프트 생성", group: "generate", color: "#00CEC9", canReceive: ["prompt-arc","typecore-sovereign","typecore-breeze"],                    canSend: ["prompt-arc","motion-metrics","design-eval"] },
  { id: "motion-metrics",      label: "모션 메트릭스",      sub: "Motion Metrics",      icon: "⟳", desc: "생성된 결과물에 모션 효과를 만드는 프롬프트 생성",    group: "generate", color: "#FDCB6E", canReceive: ["prompt-arc","render-metrics"],                                             canSend: ["prompt-arc","design-eval"] },
  { id: "rubicon-forge",       label: "루비콘 포지",        sub: "Rubicon Forge",       icon: "⬢", desc: "버튼 · 카드 · 패널 등 캠페인 컴포넌트 생성기",        group: "generate", color: "#55EFC4", canReceive: [],                                                                              canSend: ["prompt-arc","design-eval"], disabled: true },
  { id: "design-eval",         label: "디자인 평가도구",    sub: "Design Evaluator",    icon: "◉", desc: "브랜드 사이트 · 프로모션 · 배너 디자인 평가",          group: "evaluate", color: "#FD79A8", canReceive: ["banner-codex","prompt-arc","render-metrics","motion-metrics","rubicon-forge"], canSend: [], disabled: true },
  { id: "banner-creator",      label: "배너 생성기",        sub: "Banner Creator",      icon: "▣", desc: "배너 코덱스 자료를 기반으로 배너 자동 생성 (준비 중)", group: "generate", color: "#E17055", canReceive: ["banner-codex"],                                                                canSend: ["banner-codex","design-eval"], disabled: true, status: "coming-soon" },
];

export const APP_MAP = Object.fromEntries(APP_REGISTRY.map(a => [a.id, a]));
