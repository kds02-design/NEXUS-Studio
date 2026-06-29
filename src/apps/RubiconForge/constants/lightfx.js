// 광원·빛효과(Light FX) 생성 모드 옵션.
// 순흑(#000000) 배경 위에 발광 효과만 렌더 → 스크린/애드 블렌드 합성 또는 검은배경 알파 추출로
// 오브젝트 위에 얹어 쓰는 라이트 에셋. (구 '벡터 생성' 탭을 대체)
//
// promptHint 작성 원칙:
//   - "무엇이 빛나는가(형태)" + "어떻게 퍼지는가(확산)" 만 기술
//   - 오브젝트/UI/텍스트/배경 장면을 만들지 않도록 항상 isolated glow 로 anchoring

// 카테고리 — 만들 빛효과의 종류.
export const LIGHTFX_CATEGORIES = [
  {
    id: 'lightSource', label: '광원 · 갓레이', desc: '중심 발광 · 방사 광선',
    accent: '#fde68a', ratio: '1:1',
    promptHint: 'a radiant central light source emitting volumetric god rays and light beams outward from the core, soft glowing bloom around the origin',
    placeholder: '예: 중심에서 퍼지는 황금빛 갓레이 / 강한 방사형 광선 버스트',
  },
  {
    id: 'halo', label: '후광 · 오라', desc: '원형 후광 · 백라이트 글로우',
    accent: '#a5b4fc', ratio: '1:1',
    promptHint: 'a soft circular halo / aura backlight glow — a luminous ring and rim-light bloom as if a subject is backlit, hollow soft center fading outward',
    placeholder: '예: 캐릭터 뒤 둥근 후광 / 신성한 오라 링 / 백라이트 글로우',
  },
  {
    id: 'particle', label: '파티클 · 입자', desc: '반짝임 · 불티 · 보케',
    accent: '#7dd3fc', ratio: '1:1',
    promptHint: 'floating luminous particles — sparkles, glowing embers, dust motes and bokeh of light drifting and scattered across the frame, varied sizes with soft falloff',
    placeholder: '예: 떠오르는 황금 불티 / 반짝이는 마법 입자 / 보케 스파클',
  },
  {
    id: 'lightStreak', label: '빛효과 · 플레어', desc: '렌즈 플레어 · 광선 스트릭',
    accent: '#f0abfc', ratio: '16:9',
    promptHint: 'dynamic light effects — lens flares, light streaks and energy wisps, shimmering light trails sweeping across the frame with glints and bloom',
    placeholder: '예: 가로지르는 빛줄기 / 렌즈 플레어 / 에너지 위습 트레일',
  },
];
export const LIGHTFX_CATEGORY_BY_ID = Object.fromEntries(LIGHTFX_CATEGORIES.map(c => [c.id, c]));

// 스타일 — 빛의 결.
export const LIGHTFX_STYLES = [
  { id: 'soft',      label: '소프트 글로우', desc: '부드러운 확산',
    hint: 'soft diffuse glow, gentle gaussian falloff, dreamy hazy bloom, smooth gradients' },
  { id: 'sharp',     label: '선명한 광선',   desc: '또렷한 빔·글린트',
    hint: 'sharp crisp light rays and glints, high-contrast beams, defined volumetric shafts, clean edges' },
  { id: 'magical',   label: '마법 · 판타지', desc: '아케인·신비',
    hint: 'magical fantasy energy, arcane swirling glow, mystical shimmer with fine sparkle accents' },
  { id: 'realistic', label: '사실적',        desc: '시네마틱 렌더',
    hint: 'photorealistic cinematic lighting, physically-based bloom and lens optics, filmic glow' },
];
export const LIGHTFX_STYLE_BY_ID = Object.fromEntries(LIGHTFX_STYLES.map(s => [s.id, s]));

// 컬러 — 빛의 색. swatch 는 UI 칩, hint 는 프롬프트.
export const LIGHTFX_COLORS = [
  { id: 'gold',   label: '골드',     color: '#fde68a', swatch: 'radial-gradient(circle,#fff7d6,#d4af37)',
    hint: 'warm golden-amber light' },
  { id: 'crimson',label: '크림슨',   color: '#f87171', swatch: 'radial-gradient(circle,#ffd2d2,#c41e3a)',
    hint: 'deep crimson-red energy light' },
  { id: 'cyan',   label: '시안',     color: '#7dd3fc', swatch: 'radial-gradient(circle,#d6f6ff,#2f7d8c)',
    hint: 'electric cyan-blue glow' },
  { id: 'violet', label: '바이올렛', color: '#c084fc', swatch: 'radial-gradient(circle,#ecd6ff,#7c3aed)',
    hint: 'arcane violet-purple light' },
  { id: 'white',  label: '화이트',   color: '#ffffff', swatch: 'radial-gradient(circle,#ffffff,#9ca3af)',
    hint: 'pure white radiant light' },
  { id: 'holo',   label: '홀로',     color: '#f0abfc', swatch: 'conic-gradient(from 0deg,#f0abfc,#7dd3fc,#fde68a,#f0abfc)',
    hint: 'iridescent holographic prismatic light with shifting spectral hues' },
];
export const LIGHTFX_COLOR_BY_ID = Object.fromEntries(LIGHTFX_COLORS.map(c => [c.id, c]));

// 한 번에 생성할 변형 수.
export const LIGHTFX_COUNTS = [2, 4, 6];
