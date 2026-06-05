// Promo Skin Studio — 캔버스 상수, 헬퍼, 프리셋 데이터.
// 캔버스는 2560px 고정. 디자인 모듈은 420 베이스에서 스케일 변환.

export const CANVAS_W = 2560;
export const CONTENT_W = 1200;
export const CONTENT_X = (CANVAS_W - CONTENT_W) / 2;
export const S = CONTENT_W / 420;            // design unit scale
export const u = (n) => Math.round(n * S);   // 420-base design px -> 2560 canvas px
export const H_HERO = 900;

// hex + alpha → rgba 문자열.
export const hx = (hex, a) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

// hex 명도 조정. p<0: 어둡게, p>0: 밝게.
export const shade = (hex, p) => {
  const h = hex.replace("#", "");
  let r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  if (p < 0) { const f = 1 + p / 100; r *= f; g *= f; b *= f; }
  else { r += (255 - r) * p / 100; g += (255 - g) * p / 100; b += (255 - b) * p / 100; }
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
};

export const PRESETS = {
  april: {
    name: "4월 · 봄 들판", concept: "4월 봄, 들판, 밝고 화사한",
    tokens: { primary: "#5FCF7A", accent: "#B6EE7E", title: "#B6EE7E", textLight: "#EAFBF0", panel: "#0E4A38", bgTop: "#8FC9CE", bgMid: "#33A37C", bgBottom: "#147257", radius: 16, glow: 14 },
    variants: { background: "field", frame: "glow", container: "scroll", button: "glow", motif: "diamond" },
  },
  december: {
    name: "12월 · 겨울 블루", concept: "12월 겨울, 눈, 차분하고 시린",
    tokens: { primary: "#5AA9E6", accent: "#A9D8FF", title: "#CFE9FF", textLight: "#EAF4FF", panel: "#0E2A4A", bgTop: "#9FB8D6", bgMid: "#2E5C99", bgBottom: "#14264A", radius: 14, glow: 16 },
    variants: { background: "snow", frame: "glow", container: "box", button: "glow", motif: "gem" },
  },
  january: {
    name: "1월 · 다크 판타지", concept: "1월 다크 판타지, 금장식, 무게감",
    tokens: { primary: "#B83A33", accent: "#E6C879", title: "#F0D58A", textLight: "#E9E0CE", panel: "#211A29", bgTop: "#2A1418", bgMid: "#1A1018", bgBottom: "#15111B", radius: 10, glow: 10 },
    variants: { background: "dark", frame: "metal", container: "box", button: "metal", motif: "diamond" },
  },
};

export const DEFAULT_CONTENT = {
  titleMonth: "4월", titleMain: "오늘의 상품 스페셜",
  sales: "2026. 4. 30.(목) 00시 00분 ~ 2026. 5. 5.(화) 23시 59분",
  claim: "2026. 5. 1.(금) 10시 ~ 2026. 5. 13.(수) 정기점검 전",
};
export const DEFAULT_TITLE = { x: CANVAS_W / 2, y: 560, scale: 1.3 };

// 상단 비주얼 — 두 가지 모드.
//   "single"   : 합성 이미지 한 장(NEXUS Preview 패턴). 배경/캐릭터/타이틀이 모두 통합된 이미지 + scrim/dim/vignette 조절.
//   "composed" : 분리 슬롯(배경 / 캐릭터 1,2 / 타이틀 / 날짜) 각각 표시·이미지·텍스트 조작.
// 초보자에겐 single 모드가 기본 — 한 장만 업로드하면 작동.
export const DEFAULT_HERO = {
  mode: "single",
  singleImage: null,
  // single 모드용 효과 (NEXUS Preview 차용)
  dim: 0.2,           // 전체 어둡게 (0~0.85)
  vignette: 0.3,      // 비네팅 (0~0.9)
  bottomFade: 0.35,   // 하단 배경 페이드 (다음 섹션과 연결, 0~0.9)
  fadeColor: "#0E4A38",
  // composed 모드용 표시 토글
  showBackground: true,
  showChar1: true,
  showChar2: true,
  showTitle: true,
  showDate: true,
};

// 하단 섹션별 이미지 대체 — 있으면 해당 섹션 전체를 그 이미지가 덮음(텍스트/프레임/버튼 모두).
// 자동화 흐름: 디자이너가 섹션을 통째 PNG 로 제작 → 슬롯에 드롭만 하면 완성.
export const DEFAULT_SECTION_OVERRIDES = {
  productsImage: null,    // ① "이 달의 스페셜 상품" 섹션 전체
  bonusImage: null,       // ② "보너스 혜택" 섹션 전체
  milestonesImage: null,  // ③ "획득 가능한 보너스 선물" 섹션 전체
  footerImage: null,      // ④ 푸터 주의사항
};

// 각 섹션 표시 토글 (이미지 override 가 없을 때만 적용)
export const DEFAULT_SECTION_VISIBILITY = {
  products: true,
  bonus: true,
  milestones: true,
  footer: true,
};

export const PARTICLES = [
  { x: "8%", y: "12%" }, { x: "30%", y: "26%" }, { x: "76%", y: "9%" },
  { x: "60%", y: "30%" }, { x: "18%", y: "50%" }, { x: "88%", y: "40%" }, { x: "46%", y: "16%" },
];

export const DATA = {
  subtitle: "매월 입고되는 스페셜 상품들을 확인해 보세요!",
  bonusSub: "오늘의 상품 스페셜 구매에 사용한 신석만큼 보너스 보상으로 돌려드려요!",
  counter: "NNN,NNN",
  products: [
    { icon: "gift", name: ["오늘의 선물상자", "금강투신"] },
    { icon: "diamond", name: ["오늘의 선물상자", "新뇌천석"] },
    { icon: "box", name: ["찬란한 합성", "금화상자"] },
    { icon: "coins", name: ["찬란한", "보화 상자"] },
  ],
  milestones: [
    { at: "10,000", icon: "diamond", name: "천회 진화석", done: false },
    { at: "20,000", icon: "sparkles", name: "천체 조각 선택권", done: false },
    { at: "30,000", icon: "sparkles", name: "빛나는 천회석", done: true },
    { at: "40,000", icon: "shirt", name: "은백연 의상 세트", done: false },
    { at: "50,000", icon: "gem", name: "뇌천석 결정 (10개)", done: false },
  ],
};

export const ENUMS = {
  background: ["field", "dark", "snow", "plain"],
  frame: ["glow", "metal", "flat"],
  container: ["scroll", "box"],
  button: ["glow", "metal", "flat"],
  motif: ["diamond", "gem", "none"],
};

// AI 응답 검증 + 기존 테마와 병합. 잘못된 hex/range 값은 무시.
export function mergePreset(prev, p, concept) {
  const t = { ...prev.tokens }, pt = p.tokens || {};
  ["primary", "accent", "title", "textLight", "panel", "bgTop", "bgMid", "bgBottom"].forEach((k) => {
    if (typeof pt[k] === "string" && /^#([0-9a-f]{6})$/i.test(pt[k])) t[k] = pt[k];
  });
  if (Number.isFinite(pt.radius)) t.radius = Math.max(8, Math.min(24, Math.round(pt.radius)));
  if (Number.isFinite(pt.glow)) t.glow = Math.max(0, Math.min(30, Math.round(pt.glow)));
  const vr = { ...prev.variants }, pv = p.variants || {};
  Object.keys(ENUMS).forEach((k) => { if (ENUMS[k].includes(pv[k])) vr[k] = pv[k]; });
  return { name: (typeof p.name === "string" && p.name) || concept.slice(0, 24), concept, tokens: t, variants: vr };
}
