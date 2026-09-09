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
  {
    id: 'ground', label: '바닥 이펙트 · 그라운드', desc: '바닥에 깔리는 발광 풀·스플래시',
    accent: '#a5b4fc', ratio: '16:9',
    promptHint: 'a low ground-level luminous FLOOR effect — a radiant pool / splash of light hugging the ground plane, spreading low and horizontally, brightest at the center core and fading softly outward into darkness, as if glowing energy is cast across the floor beneath a subject; low-lying, wide and grounded (not floating). Magic splash, glowing pool, swirling ground vortex or drifting low mist depending on style/material/color',
    placeholder: '예: 바닥에 퍼지는 보라 마법광 스플래시 / 낮게 깔리는 금빛 빛 회오리 / 바닥 글로우 풀',
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
  { id: 'boxGlow',    label: '박스 아웃그로우',  desc: '사각 외곽을 감싸는 외부광', accent: '#7dd3fc', edgeHug: true,
    placementHint: 'render an OUTER GLOW that hugs and traces the rectangular box/panel/button silhouette edges and spills outward — a clean luminous rim following the outline, glow only ON and OUTSIDE the perimeter, no fill inside' },
  { id: 'circleGlow', label: '원형 아웃그로우',  desc: '원 외곽을 감싸는 외부광', accent: '#a5b4fc', edgeHug: true,
    placementHint: 'render an OUTER GLOW that hugs and traces a CIRCULAR / RING outline and spills outward — a clean luminous rim following the circle perimeter, brightest right along the circular edge and softly bleeding outward, with a HOLLOW DARK CENTER (no fill inside the circle). The overall silhouette reads clearly as a glowing ring/circle' },
  { id: 'charAura',   label: '캐릭터 외곽 아우라', desc: '실루엣을 따라 도는 아우라', accent: '#c084fc', edgeHug: true,
    placementHint: 'render an AURA tracing the character/figure silhouette outline — a luminous rim-light contour wrapping the body shape, brightest along the silhouette edge and softly bleeding outward, following the organic outline' },
  { id: 'textGlow',   label: '텍스트 글로우',    desc: '글자 획을 따라 발광', accent: '#f0abfc', edgeHug: true,
    placementHint: 'render glow that follows the letterform strokes of the referenced text — luminous emission tracing each stroke and outline, brightest along the letter edges; do NOT draw solid letters, glow only' },
  { id: 'titleFront', label: '타이틀 전방 FX',    desc: '타이틀 앞 글린트·입자', accent: '#f0abfc', refMode: 'front',
    placementHint: 'render a restrained FOREGROUND accent pass in front of the title position — sparse glints, short light streaks and fine particles crossing only selected lower edges and corners, with the title itself left completely absent' },
  { id: 'itemFront',  label: '아이템 전방 FX',    desc: '아이템 앞 접촉광·입자', accent: '#fde68a', refMode: 'front',
    placementHint: 'render a restrained FOREGROUND accent pass in front of the item position — selective contact glow near the lower front edge, a few rising sparks and short wisps wrapping across small portions of the foreground, with the item itself left completely absent' },
  { id: 'groundPool', label: '바닥 광 풀',       desc: '피사체 아래 고이는 빛', accent: '#a5b4fc',
    placementHint: 'render a pool of light gathering BENEATH the subject — a bright elliptical ground glow and soft cast radiance as if the object emits light onto the floor below, brightest at the base and fading upward/outward' },
];
export const LIGHTFX_FORM_BY_ID = Object.fromEntries(LIGHTFX_FORMS.map(f => [f.id, f]));

// 여백 자동 추가 프로필 — '형태 참고' 업로드 시 캔버스 여백을 얼마나 줄지를 배치 형태/종류로 결정.
// 예전엔 무조건 16:9 + 긴 변 80% 였는데, 실루엣 밀착형(아우라·텍스트 글로우)은 피사체가 작아져 윤곽 정밀도가
// 떨어지고, 반대로 바닥 이펙트는 옆으로 넓게 깔릴 가로 공간이 필요하다. 형태에 맞춰 나눈다.
//   targetMargin: 콘텐츠 긴 변 대비 각 변 여백 목표 비율 · aspectRatio: 지정 시 그 비율로 강제(크롭 없음)
export const LIGHTFX_PAD_PROFILES = {
  hug:    { id: 'hug',    label: '밀착 25%',       targetMargin: 0.25, aspectRatio: null,   desc: '실루엣을 따라가는 형태 — 피사체를 크게 유지해 윤곽 정밀도 확보' },
  front:  { id: 'front',  label: '전방 35%',       targetMargin: 0.35, aspectRatio: null,   desc: '전방 글린트·접촉광 — 하단·모서리 바깥으로 짧게 퍼질 공간' },
  spread: { id: 'spread', label: '확산 60%',       targetMargin: 0.6,  aspectRatio: null,   desc: '뒤쪽 광원·후광·파티클 — 실루엣 바깥으로 넓게 퍼질 공간' },
  ground: { id: 'ground', label: '바닥 60% · 16:9', targetMargin: 0.6,  aspectRatio: 16 / 9, desc: '바닥 이펙트 — 옆으로 넓게 깔리도록 가로 캔버스 확보' },
};
export const lightFxPadProfile = (categoryId, formId) => {
  if (categoryId === 'ground' || formId === 'groundPool') return LIGHTFX_PAD_PROFILES.ground;
  const form = LIGHTFX_FORM_BY_ID[formId];
  if (form?.edgeHug) return LIGHTFX_PAD_PROFILES.hug;
  if (form?.refMode === 'front') return LIGHTFX_PAD_PROFILES.front;
  return LIGHTFX_PAD_PROFILES.spread;
};

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

// 재질 · 질감 — 빛의 "표면 결/재질감"을 물·불·전기 등으로 변주 (종류·스타일과 별개 축).
// 핵심: 빛의 전체 형태·배치·실루엣은 그대로 두고, 내부 질감·표면 무브먼트만 그 원소처럼 만든다.
// (구 '형태 변형'을 재정의 — 실루엣을 통째로 바꾸지 않아 광원 정체성 보존)
export const LIGHTFX_MATERIALS = [
  { id: 'none',     label: '기본',   desc: '재질 없음',          hint: '' },
  { id: 'water',    label: '물',     desc: '액체 · 굴절 · 코스틱', hint: 'give the light a WATER material — liquid luminous surface with wet sheen, refraction and rippling caustic highlights, glossy fluid texture as if made of glowing water' },
  { id: 'fire',     label: '불',     desc: '화염 질감 · 불티',    hint: 'give the light a FIRE material — flickering flame texture, glowing embers and sparks, hot-to-cool heat gradient (white-hot core to amber edges) with a burning surface feel' },
  { id: 'electric', label: '전기',   desc: '플라즈마 · 아크',      hint: 'give the light an ELECTRIC / PLASMA material — crackling energy surface with fine branching arcs, current filaments and sharp luminous sparks threading through the glow' },
  { id: 'smoke',    label: '연기',   desc: '발광 스모크 결',      hint: 'give the light a SMOKE material — soft curling luminous smoke texture with silky turbulent wisps and gentle billowing detail across the surface' },
  { id: 'mist',     label: '안개',   desc: '플라즈마 헤이즈',      hint: 'give the light a MIST / HAZE material — soft volumetric haze texture, diffuse veils and gentle depth, a nebulous glowing vapor surface' },
  { id: 'crystal',  label: '크리스탈', desc: '결정 · 프리즘',       hint: 'give the light a CRYSTAL material — faceted prismatic surface with sharp refractive glints, sparkling shards and clean geometric light dispersion' },
];
export const LIGHTFX_MATERIAL_BY_ID = Object.fromEntries(LIGHTFX_MATERIALS.map(m => [m.id, m]));

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
