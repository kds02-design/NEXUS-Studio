// 플랫폼 템플릿 — 출력 캔버스 픽셀 + 타이틀 세이프존(슬롯) + (선택) 서브카피·로고·페이드·가이드.
// 카테고리(프로모션/브랜드/배너)로 묶고, 각 카테고리는 PC/모바일·사이즈 변형을 가진다.
//   slot.cx/cy/maxW/maxH — 타이틀 중심·최대 박스 (캔버스 비율 0~1). 런타임 스케일 추가 적용.
//   subSlot              — 타이틀 하단 서브카피(큰)+날짜(작은). imgMaxH = 이미지 대체 시 높이.
//   bottomFade           — (프로모션) 하단을 색으로 연결. start(0~1)~하단 그라데이션.
//   vignette: true       — (브랜드) 비네팅 허용. 강도 런타임 조절.
//   logoSlot             — (배너) 게임 로고 코너 배치.
//   guides: [width,...]  — 프리뷰 전용 콘텐츠 폭 가이드(px). 캔버스 중앙 기준 세로선. 다운로드엔 미포함.
//   scrim                — 가독성 그라데이션 (dir: top|bottom|left)

const SUB_DESKTOP = { copyFont: 0.034, copyWeight: 600, copyColor: "#FFFFFF", dateFont: 0.025, dateWeight: 400, dateColor: "#E6E6F0" };
const SUB_MOBILE = { copyFont: 0.04, copyWeight: 600, copyColor: "#FFFFFF", dateFont: 0.03, dateWeight: 400, dateColor: "#E6E6F0" };

export const PLATFORM_TEMPLATES = [
  // ── 프로모션 ──────────────────────────────────────────
  {
    id: "promo-pc", category: "promo", variant: "PC",
    label: "프로모션 상단", sub: "PC · 2560×1400 (가이드 1920/1200)",
    width: 2560, height: 1400,
    slot: { cx: 0.5, cy: 0.38, maxW: 0.44, maxH: 0.3 },
    subSlot: { cx: 0.5, cy: 0.62, maxW: 0.46, gap: 0.016, imgMaxH: 0.14, ...SUB_DESKTOP },
    bottomFade: { start: 0.56 },
    guides: [1920, 1200],
    scrim: { dir: "top", from: "rgba(0,0,0,0.38)", to: "rgba(0,0,0,0)" },
  },
  {
    id: "promo-mobile", category: "promo", variant: "모바일",
    label: "프로모션 상단", sub: "모바일 · 750×1000",
    width: 750, height: 1000,
    slot: { cx: 0.5, cy: 0.36, maxW: 0.82, maxH: 0.28 },
    subSlot: { cx: 0.5, cy: 0.6, maxW: 0.88, gap: 0.018, imgMaxH: 0.14, ...SUB_MOBILE },
    bottomFade: { start: 0.6 },
    scrim: { dir: "top", from: "rgba(0,0,0,0.4)", to: "rgba(0,0,0,0)" },
  },

  // ── 브랜드 ────────────────────────────────────────────
  {
    id: "brand-pc", category: "brand", variant: "PC",
    label: "브랜드 메인", sub: "PC · 1920×1080 (가이드 1200)",
    width: 1920, height: 1080,
    slot: { cx: 0.5, cy: 0.44, maxW: 0.52, maxH: 0.4 },
    subSlot: { cx: 0.5, cy: 0.66, maxW: 0.56, gap: 0.016, imgMaxH: 0.14, ...SUB_DESKTOP },
    vignette: true,
    guides: [1200],
    scrim: { dir: "left", from: "rgba(0,0,0,0.32)", to: "rgba(0,0,0,0)" },
  },
  {
    id: "brand-mobile", category: "brand", variant: "모바일",
    label: "브랜드 메인", sub: "모바일 · 750×1200",
    width: 750, height: 1200,
    slot: { cx: 0.5, cy: 0.4, maxW: 0.82, maxH: 0.3 },
    subSlot: { cx: 0.5, cy: 0.62, maxW: 0.86, gap: 0.018, imgMaxH: 0.14, ...SUB_MOBILE },
    vignette: true,
    scrim: { dir: "top", from: "rgba(0,0,0,0.4)", to: "rgba(0,0,0,0)" },
  },

  // ── 배너 ──────────────────────────────────────────────
  {
    id: "banner-tall", category: "banner", variant: "1180×750",
    label: "배너", sub: "1180×750",
    width: 1180, height: 750,
    slot: { cx: 0.5, cy: 0.4, maxW: 0.64, maxH: 0.34 },
    subSlot: { cx: 0.5, cy: 0.73, maxW: 0.74, gap: 0.02, imgMaxH: 0.18, copyFont: 0.05, copyWeight: 600, copyColor: "#FFFFFF", dateFont: 0.038, dateWeight: 400, dateColor: "#E6E6F0" },
    logoSlot: { corner: "top-right", maxW: 0.22, maxH: 0.15, pad: 0.045 },
    scrim: { dir: "bottom", from: "rgba(0,0,0,0.34)", to: "rgba(0,0,0,0)" },
  },
  {
    id: "banner-wide", category: "banner", variant: "1200×630",
    label: "배너", sub: "1200×630",
    width: 1200, height: 630,
    slot: { cx: 0.5, cy: 0.42, maxW: 0.58, maxH: 0.36 },
    subSlot: { cx: 0.5, cy: 0.74, maxW: 0.72, gap: 0.022, imgMaxH: 0.2, copyFont: 0.05, copyWeight: 600, copyColor: "#FFFFFF", dateFont: 0.038, dateWeight: 400, dateColor: "#E6E6F0" },
    logoSlot: { corner: "top-right", maxW: 0.2, maxH: 0.16, pad: 0.045 },
    scrim: { dir: "bottom", from: "rgba(0,0,0,0.34)", to: "rgba(0,0,0,0)" },
  },
];

export const PLATFORM_MAP = Object.fromEntries(PLATFORM_TEMPLATES.map(p => [p.id, p]));

// 카테고리 — 상단 탭. ids 순서대로 그 카테고리의 변형(PC/모바일·사이즈)을 표시.
export const CATEGORIES = [
  { key: "promo", label: "프로모션" },
  { key: "brand", label: "브랜드" },
  { key: "banner", label: "배너" },
];
export const idsOfCategory = (key) => PLATFORM_TEMPLATES.filter(p => p.category === key).map(p => p.id);

// 스크림 방향 → CSS linear-gradient.
export function scrimToCss(scrim) {
  if (!scrim) return "none";
  const angle = scrim.dir === "left" ? "90deg" : scrim.dir === "bottom" ? "0deg" : "180deg";
  return `linear-gradient(${angle}, ${scrim.from}, ${scrim.to})`;
}
export function bottomFadeToCss(fade, color) {
  if (!fade || !color) return "none";
  return `linear-gradient(180deg, transparent ${Math.round(fade.start * 100)}%, ${color} 100%)`;
}
export function vignetteToCss(intensity) {
  if (!intensity || intensity <= 0) return "none";
  const a = Math.min(Math.max(intensity, 0), 0.9).toFixed(3);
  return `radial-gradient(ellipse 75% 75% at 50% 50%, transparent 45%, rgba(0,0,0,${a}) 100%)`;
}

const RADIAL_FACTOR = 0.8;
export function radialDimRadiusFracW(slot, template) {
  return Math.max(slot.maxW, slot.maxH * (template.height / template.width)) * RADIAL_FACTOR;
}
// shape: { scale=1, aspect=1, softness=0 }
//   scale    — 전체 크기 배율
//   aspect   — 가로:세로 비율 (1=원, >1 가로로 넓은 타원, <1 세로로 긴 타원). 면적은 대략 유지.
//   softness — 중심 솔리드 코어 비율(0~0.95). 0=중심부터 바로 감쇠, 높을수록 또렷한 코어 + 가장자리만 페이드.
// 기본값(1,1,0)은 기존 원형 딤과 동일.
export function radialDimToCss(slot, template, intensity, shape = {}) {
  if (!intensity || intensity <= 0) return "none";
  const a = Math.min(Math.max(intensity, 0), 0.92).toFixed(3);
  const scale = shape.scale > 0 ? shape.scale : 1;
  const aspect = shape.aspect > 0 ? shape.aspect : 1;
  const soft = Math.min(Math.max(shape.softness || 0, 0), 0.95);
  const base = radialDimRadiusFracW(slot, template) * scale;
  const sa = Math.sqrt(aspect);
  const rxW = (base * sa * 100).toFixed(2);                                       // cqw — 가로 반지름
  const ryH = (base * (template.width / template.height) / sa * 100).toFixed(2);  // cqh — 세로 반지름
  const core = soft > 0 ? `, rgba(0,0,0,${a}) ${(soft * 100).toFixed(1)}%` : "";
  return `radial-gradient(ellipse ${rxW}cqw ${ryH}cqh at ${(slot.cx * 100).toFixed(2)}% ${(slot.cy * 100).toFixed(2)}%, rgba(0,0,0,${a}) 0%${core}, rgba(0,0,0,0) 100%)`;
}

export const SUB_FONT_OPTIONS = [
  { label: "Noto Sans KR", css: "'Noto Sans KR', sans-serif" },
  { label: "Teko", css: "'Teko', sans-serif" },
  { label: "JetBrains Mono", css: "'JetBrains Mono', monospace" },
];
