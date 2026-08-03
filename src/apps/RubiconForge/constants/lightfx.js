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

// 배치 형태 — 빛이 "무엇에 어떻게" 붙는지(적용 위치). 종류(효과 유형)와는 별개 축.
// 형태 참고(샘플 이미지)와 함께 쓰면 그 오브젝트에 맞춰 광원만 순흑 위에 별도 렌더된다.
// placementHint: 빛이 피사체에 대해 "어디에" 놓이는지만 기술 (오브젝트 자체는 그리지 않음).
export const LIGHTFX_FORMS = [
  { id: 'free',       label: '자유 · 배치 없음', desc: '위치 지정 없이 빛만', accent: '#9ca3af',
    placementHint: '' },
  { id: 'iconBack',   label: '아이콘 뒤 광원',   desc: '피사체 뒤쪽에서 방사', accent: '#fde68a',
    placementHint: 'position the glow BEHIND the subject as a backlight — a radiant burst emanating from behind and around the silhouette, as if light shines out from behind an icon; brightest just outside the silhouette edge and fading outward' },
  { id: 'boxGlow',    label: '박스 아웃그로우',  desc: '사각 외곽을 감싸는 외부광', accent: '#7dd3fc',
    placementHint: 'render an OUTER GLOW that hugs and traces the rectangular box/panel/button silhouette edges and spills outward — a clean luminous rim following the outline, glow only ON and OUTSIDE the perimeter, no fill inside' },
  { id: 'charAura',   label: '캐릭터 외곽 아우라', desc: '실루엣을 따라 도는 아우라', accent: '#c084fc',
    placementHint: 'render an AURA tracing the character/figure silhouette outline — a luminous rim-light contour wrapping the body shape, brightest along the silhouette edge and softly bleeding outward, following the organic outline' },
  { id: 'textGlow',   label: '텍스트 글로우',    desc: '글자 획을 따라 발광', accent: '#f0abfc',
    placementHint: 'render glow that follows the letterform strokes of the referenced text — luminous emission tracing each stroke and outline, brightest along the letter edges; do NOT draw solid letters, glow only' },
  { id: 'groundPool', label: '바닥 광 풀',       desc: '피사체 아래 고이는 빛', accent: '#a5b4fc',
    placementHint: 'render a pool of light gathering BENEATH the subject — a bright elliptical ground glow and soft cast radiance as if the object emits light onto the floor below, brightest at the base and fading upward/outward' },
];
export const LIGHTFX_FORM_BY_ID = Object.fromEntries(LIGHTFX_FORMS.map(f => [f.id, f]));

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

// 형태 변형 — 빛의 흐름·형상을 물·안개 같은 자연 형상으로 변형 (종류·스타일과 별개 축).
export const LIGHTFX_MOTIONS = [
  { id: 'none',     label: '기본',      desc: '변형 없음',           hint: '' },
  { id: 'water',    label: '물의 흐름', desc: '유체 · 물결 커런트',   hint: 'shape the light like FLOWING WATER — fluid luminous liquid streams, rippling waves and smooth curving currents of light, wave-like flowing motion' },
  { id: 'mist',     label: '안개',      desc: '낮게 깔린 헤이즈',     hint: 'shape the light as glowing MIST / FOG — soft volumetric haze banks and wispy diffuse veils drifting slowly, low-lying luminous fog with gentle depth' },
  { id: 'smoke',    label: '연기',      desc: '피어오르는 스모크',    hint: 'shape the light as luminous SMOKE — curling glowing plumes swirling and rising upward with soft turbulence and silky curls' },
  { id: 'flame',    label: '불꽃',      desc: '타오르는 화염 결',     hint: 'shape the light like FLAMES — licking fire tongues and rising flame-shaped luminous wisps with subtle heat shimmer' },
  { id: 'wind',     label: '바람 결',   desc: '휘도는 리본 기류',     hint: 'shape the light as WIND STREAMS — sweeping curved air currents and ribbon-like flowing streaks gliding gracefully across' },
  { id: 'electric', label: '전기',      desc: '번개 · 아크 방전',     hint: 'shape the light as ELECTRIC energy — crackling lightning tendrils and fine branching arcs with sharp luminous cores' },
];
export const LIGHTFX_MOTION_BY_ID = Object.fromEntries(LIGHTFX_MOTIONS.map(m => [m.id, m]));

// 입자 크기 — 파티클·글린트·스파클의 스케일.
export const LIGHTFX_GRAINS = [
  { id: 'normal', label: '기본', hint: '' },
  { id: 'fine',   label: '세밀', hint: 'PARTICLE SCALE — FINE: render every particle, sparkle, glint and speck at a fine SMALL scale — many tiny delicate micro-particles instead of large blobs; crisp refined micro-detail throughout' },
];
export const LIGHTFX_GRAIN_BY_ID = Object.fromEntries(LIGHTFX_GRAINS.map(g => [g.id, g]));

// 보케 사이즈 — 아웃포커스 빛망울의 스케일.
export const LIGHTFX_BOKEHS = [
  { id: 'normal', label: '기본', hint: '' },
  { id: 'fine',   label: '세밀', hint: 'BOKEH SCALE — FINE: keep all bokeh discs and out-of-focus light circles SMALL and subtle — fine delicate bokeh specks, never oversized orbs dominating the frame' },
];
export const LIGHTFX_BOKEH_BY_ID = Object.fromEntries(LIGHTFX_BOKEHS.map(b => [b.id, b]));

// 한 번에 생성할 변형 수.
export const LIGHTFX_COUNTS = [2, 4, 6];
