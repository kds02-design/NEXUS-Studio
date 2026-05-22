// friendly 모드 — 5개 코어 archetype 의 SVG 캐리커처.
// 카드에 작은 미리보기 글리프로 표시해 "이걸 누르면 어떤 글자가 나오는지" 가시화한다.
// 모두 24~40px 영역에서 동작, currentColor 사용.
import React from 'react';

// 묵직한 구조 — 굵은 H 모양 기둥
export const FortressGlyph = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <rect x="6"  y="6"  width="8" height="28" fill="currentColor" />
    <rect x="26" y="6"  width="8" height="28" fill="currentColor" />
    <rect x="6"  y="17" width="28" height="6"  fill="currentColor" />
  </svg>
);

// 날카로운 절단 — 가는 V 와 두꺼운 V 의 대비
export const BladeGlyph = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeLinecap="square">
    <polyline points="6,6 20,34 34,6" strokeWidth="1.5" />
    <polyline points="11,6 20,24 29,6" strokeWidth="6" />
  </svg>
);

// 풍화된 유물 — 균열이 있는 사각형
export const RelicGlyph = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <rect x="7" y="7" width="26" height="26" fill="currentColor" />
    <path d="M 7 18 L 14 22 L 16 28 L 22 33" stroke="#09090B" strokeWidth="1.5" fill="none" />
    <path d="M 24 7 L 27 13 L 33 16" stroke="#09090B" strokeWidth="1.5" fill="none" />
    <circle cx="20" cy="20" r="1.5" fill="#09090B" />
  </svg>
);

// 엠블럼·심볼 — 육각형 + 내부 점
export const GlyphGlyph = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <polygon points="20,5 33,12 33,28 20,35 7,28 7,12" fill="currentColor" />
    <polygon points="20,12 27,16 27,24 20,28 13,24 13,16" fill="#09090B" />
    <circle cx="20" cy="20" r="2.5" fill="currentColor" />
  </svg>
);

// 흐르는 동세 — 기울어진 평행사변형 + 트레일
export const KineticGlyph = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <polygon points="14,6 34,6 26,34 6,34" fill="currentColor" />
    <line x1="2" y1="12" x2="12" y2="12" stroke="currentColor" strokeWidth="2" opacity="0.4" />
    <line x1="2" y1="20" x2="10" y2="20" stroke="currentColor" strokeWidth="2" opacity="0.25" />
  </svg>
);

export const CORE_GLYPHS = {
  core_fortress: FortressGlyph,
  core_blade:    BladeGlyph,
  core_relic:    RelicGlyph,
  core_glyph:    GlyphGlyph,
  core_kinetic:  KineticGlyph,
};
