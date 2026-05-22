// friendly 모드 — 10개 스타일별 SVG 미리보기 글리프.
// 모두 글자 'A' 를 그 스타일로 표현해서 카드 간 비교가 직관적이도록.
// viewBox 50x50, currentColor.
import React from 'react';

const wrap = (children, extra = {}) => (
  <svg width="50" height="50" viewBox="0 0 50 50" fill="none" {...extra}>{children}</svg>
);

// 1. 메탈 헤비 — 매우 두꺼운 A
export const MetalHeavyGlyph = () => wrap(
  <>
    <polygon points="6,42 18,42 18,30 32,30 32,42 44,42 44,28 28,8 22,8 6,28" fill="currentColor" />
    <rect x="20" y="20" width="10" height="6" fill="currentColor" />
  </>
);

// 2. 샤프 액션 — 가는 V 와 굵은 슬래시
export const SharpActionGlyph = () => wrap(
  <>
    <polyline points="10,44 25,8 40,44" stroke="currentColor" strokeWidth="2" />
    <polygon points="14,44 25,18 36,44 32,44 25,28 18,44" fill="currentColor" />
    <line x1="18" y1="32" x2="32" y2="32" stroke="currentColor" strokeWidth="3" />
  </>
);

// 3. 풍화 유물 — A + 균열
export const WeatheredGlyph = () => wrap(
  <>
    <polygon points="8,42 25,8 42,42 35,42 25,22 15,42" fill="currentColor" />
    <rect x="18" y="32" width="14" height="4" fill="currentColor" />
    <path d="M 14 38 L 18 34 M 25 14 L 28 18 L 26 22 M 35 36 L 38 30" stroke="#09090B" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="22" cy="28" r="1" fill="#09090B" />
    <circle cx="30" cy="38" r="1" fill="#09090B" />
  </>
);

// 4. 엠블럼 — 다이아몬드 + 내부 A
export const EmblemGlyph = () => wrap(
  <>
    <polygon points="25,4 46,25 25,46 4,25" fill="currentColor" />
    <polygon points="17,36 25,16 33,36 30,36 25,24 20,36" fill="#09090B" />
    <rect x="20" y="30" width="10" height="2" fill="#09090B" />
  </>
);

// 5. 키네틱 동세 — 기울어진 A + 트레일
export const KineticGlyph = () => wrap(
  <>
    <polygon points="6,44 30,8 44,44 36,44 28,24 14,44" fill="currentColor" />
    <rect x="18" y="34" width="13" height="3" fill="currentColor" transform="skewX(-15)" />
    <line x1="2" y1="20" x2="10" y2="20" stroke="currentColor" strokeWidth="2" opacity="0.4" />
    <line x1="2" y1="30" x2="8" y2="30" stroke="currentColor" strokeWidth="2" opacity="0.25" />
  </>
);

// 6. 네온 사이버 — A outline + glow
export const NeonGlyph = () => wrap(
  <>
    <polygon points="8,42 25,8 42,42 35,42 25,22 15,42" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" strokeLinejoin="round" />
    <polygon points="10,42 25,12 40,42 34,42 25,24 16,42" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <rect x="18" y="32" width="14" height="2" fill="currentColor" />
    <circle cx="25" cy="22" r="1.5" fill="currentColor" />
  </>,
  { filter: 'drop-shadow(0 0 2px currentColor)' }
);

// 7. 클래식 세리프 — A + 세리프 feet + 가로 막대
export const SerifGlyph = () => wrap(
  <>
    <polygon points="12,40 25,10 38,40 33,40 25,18 17,40" fill="currentColor" />
    <rect x="19" y="30" width="12" height="2.5" fill="currentColor" />
    {/* 좌측 발 */}
    <rect x="8"  y="40" width="12" height="3" fill="currentColor" />
    {/* 우측 발 */}
    <rect x="30" y="40" width="12" height="3" fill="currentColor" />
    {/* 윗꼭짓점 세리프 */}
    <rect x="22" y="9"  width="6" height="2" fill="currentColor" />
  </>
);

// 8. 모던 산세리프 — 깔끔한 A 라인
export const ModernSansGlyph = () => wrap(
  <>
    <polygon points="10,42 25,8 40,42 35,42 25,18 15,42" fill="currentColor" />
    <rect x="18" y="30" width="14" height="3" fill="currentColor" />
  </>
);

// 9. 기하 모듈러 — 삼각형 + 가로 막대 (분리된 모듈)
export const GeometricGlyph = () => wrap(
  <>
    <polygon points="25,8 42,40 8,40" fill="none" stroke="currentColor" strokeWidth="2.5" />
    <rect x="16" y="26" width="18" height="3" fill="currentColor" />
    <circle cx="25" cy="36" r="2" fill="currentColor" />
  </>
);

// 10. 손글씨 캘리 — 곡선 A
export const HandwrittenGlyph = () => wrap(
  <>
    <path d="M 8 44 C 12 30 18 16 24 8 C 30 14 36 28 42 44" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M 17 32 C 22 30 28 30 33 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
  </>
);

export const STYLE_GLYPHS = {
  'metal-heavy':     MetalHeavyGlyph,
  'sharp-action':    SharpActionGlyph,
  'weathered-relic': WeatheredGlyph,
  'emblem-glyph':    EmblemGlyph,
  'kinetic-flow':    KineticGlyph,
  'neon-cyber':      NeonGlyph,
  'classic-serif':   SerifGlyph,
  'modern-sans':     ModernSansGlyph,
  'geometric':       GeometricGlyph,
  'handwritten':     HandwrittenGlyph,
};
