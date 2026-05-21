export const LOOP_SURFACE_FX = [
  { id: 'none', label: '효과 없음 (None)', en: 'Perfectly static surface.', shapeRisk: 'low' },
  { id: 'metallic_sweep', label: '금속성 빛 훑기 (Metallic Sweep)', en: 'Metallic highlights shift across surface.', guardrail: 'Zero geometry alteration.', shapeRisk: 'low' },
  { id: 'light_shimmer', label: '은은한 빛 반짝임 (Light Shimmer)', en: 'Micro-shimmer confined inside letters.', guardrail: 'Maintain razor-sharp readability.', shapeRisk: 'low' },
  { id: 'crystal_refraction', label: '크리스탈 굴절 (Crystal Refraction)', en: 'Internal prismatic light refracting.', guardrail: 'Frozen solid silhouette.', shapeRisk: 'medium' },
  { id: 'liquid_reflection', label: '어두운 액체 반사 (Liquid Reflection)', en: 'Viscous dark liquid reflections ON surface.', guardrail: 'Zero dripping outside text.', shapeRisk: 'high', negExempt: [] },
  { id: 'hologram_glitch', label: '홀로그램 글리치 (Hologram Glitch)', en: 'Digital scan lines & micro glitches inside shapes.', guardrail: 'Zero displacement of silhouette.', shapeRisk: 'high' },
  { id: 'data_scan', label: '데이터 스캔 (Data Scan)', en: 'Vertical digital scan lines across typography.', shapeRisk: 'low' },
  { id: 'internal_glow', label: '내부 발광 맥박 (Internal Glow)', en: 'Deep stationary core glow intensifies organically.', guardrail: 'Glow must not leak outside.', shapeRisk: 'medium' },
  { id: 'magma_cracks', label: '용암 균열 (Magma Cracks)', en: 'Fine glowing cracks brighten like cooling magma.', guardrail: 'Zero breaking of structure.', shapeRisk: 'high' },
  { id: 'living_texture', label: '미세 질감 일렁임 (Living Texture)', en: 'Base micro-texture shifts/morphs across flat face.', guardrail: 'Confine morphing strictly inside letters. Zero black stains.', shapeRisk: 'medium' },
  { id: 'shifting_cracks', label: '꿈틀거리는 균열 (Shifting Cracks)', en: 'Existing cracks aggressively shift and pulse internally.', guardrail: 'Zero breaking of silhouette.', shapeRisk: 'high' }
];

export const LOOP_EDGE_FX = [
  { id: 'none', label: '효과 없음 (None)', en: 'Edges clean and static.', shapeRisk: 'low' },
  { id: 'rim_trace', label: '윤곽선 빛 흐름 (Rim Light Trace)', en: 'Light particles trace outer contours.', guardrail: 'Trace extremely tight to edge.', shapeRisk: 'low' },
  { id: 'soft_aura', label: '미세한 빛 번짐 (Soft Glow Aura)', en: 'A soft glowing aura continuously breathes, gently pulsing and shifting its light intensity around the edges.', guardrail: 'Allow dynamic light bleed. Do not alter solid core.', shapeRisk: 'low', negExempt: ['wide aura'] },
  { id: 'thin_electric', label: '얇은 전류 외곽선 (Thin Electric)', en: 'Aggressively animate and bring to life any existing lightning, sparks, or electric motifs in the original image. Bright electric arcs crackle and travel along the strokes.', guardrail: 'Zero wide aura expansion. Confine lightning strictly to the text surface.', shapeRisk: 'medium' },
  { id: 'edge_pulse', label: '외곽선 발광 펄스 (Edge Glow Pulse)', en: 'Soft edge illumination actively brightening and dimming rhythmically.', guardrail: 'Tight to contours, zero wide aura.', shapeRisk: 'low' },
  { id: 'burning_outline', label: '불타는 윤곽선 (Burning Outline)', en: 'Microscopic fire tongues tracing edges.', guardrail: 'Fire strictly microscopic, zero spreading.', shapeRisk: 'high', negExempt: ['no large flames'] }
];

export const LOOP_AMBIENT_FX = [
  { id: 'none', label: '효과 없음 (Clean Space)', en: 'Pure black background. Zero ambient FX.', alphaRisk: 'low' },
  { id: 'animate_existing', label: '원본 주변 효과 살리기 (Animate Existing)', en: 'CRITICAL: Actively animate any existing smoke, frost, aura, or glow surrounding the text in the original image. Make these ambient elements drift, flow, and dissipate naturally instead of being frozen.', guardrail: 'Do not freeze ambient details. Allow natural atmospheric movement.', alphaRisk: 'high', negExempt: ['no smoke', 'no fog', 'wide aura', 'frozen frame'] },
  { id: 'ash_particles', label: '어두운 재 입자 (Dark Ash)', en: 'Sparse dark ash trapped close to letters.', guardrail: 'Particles dissolve before leaving center. Zero outward momentum.', alphaRisk: 'low' },
  { id: 'gold_dust', label: '금빛 먼지 (Gold Dust)', en: 'Micro gold dust flickers in place within tight radius.', guardrail: 'No outward drift, no expansion.', alphaRisk: 'low' },
  { id: 'energy_sparks', label: '미세 불꽃 스파크 (Micro Sparks)', en: 'Tiny short-lived sparks snapping near letters.', guardrail: 'Zero flying outwards.', alphaRisk: 'medium' },
  { id: 'haze_smoke', label: '미세한 연기 (Subtle Wisps)', en: 'Subtle thin wisps attached near letters.', guardrail: 'Dissipate instantly. Zero large smoke.', alphaRisk: 'high', negExempt: ['no smoke', 'no fog'] }
];

export const INTRO_SURFACE_FX = [
  { id: 'none', label: '효과 없음 (None)', en: 'No extra surface FX during reveal.', shapeRisk: 'low' },
  { id: 'shimmer_reveal', label: '은은한 빛 생성 (Shimmer Reveal)', en: 'Subtle light shimmers across surface as it materializes.', guardrail: 'Do not alter original silhouette.', shapeRisk: 'low' },
  { id: 'energy_fill', label: '내부 에너지 차오름 (Energy Fill)', en: 'Internal energy fills strokes from core outward.', guardrail: 'Confine light inside strokes.', shapeRisk: 'medium' },
  { id: 'frost_form', label: '결빙되며 등장 (Frost Form)', en: 'Ice crystals rapidly form across surface.', guardrail: 'Keep silhouette locked.', shapeRisk: 'medium' }
];

export const INTRO_EDGE_FX = [
  { id: 'none', label: '효과 없음 (None)', en: 'No extra edge FX.', shapeRisk: 'low' },
  { id: 'soft_aura', label: '빛 번지며 등장 (Aura Bloom)', en: 'A soft glowing aura actively pulses and blooms outward from the edges as the text reveals.', guardrail: 'Allow dynamic light bleed. Keep core intact.', shapeRisk: 'low', negExempt: ['wide aura'] },
  { id: 'trace_reveal', label: '윤곽선 스캔 (Trace Reveal)', en: 'Bright laser traces outline to reveal shape.', guardrail: 'Trace strictly to edge.', shapeRisk: 'low' },
  { id: 'spark_ignite', label: '불꽃 튀며 등장 (Spark Ignite)', en: 'Edges catch fire and spark violently.', guardrail: 'Sparks must not obscure text.', shapeRisk: 'medium' },
  { id: 'electric_surge', label: '전류 쇄도 (Electric Surge)', en: 'High voltage surges around borders to shock text into existence.', guardrail: 'Zero wide aura.', shapeRisk: 'medium' }
];

export const INTRO_AMBIENT_FX = [
  { id: 'none', label: '효과 없음 (Clean Space)', en: 'Pure black background.', alphaRisk: 'low' },
  { id: 'animate_existing', label: '원본 주변 효과 살리기 (Animate Existing)', en: 'CRITICAL: As the text reveals, actively animate the existing smoke, frost, or aura from the original image, making it billow and flow naturally rather than appearing as a static painting.', guardrail: 'Do not freeze ambient details.', alphaRisk: 'high', negExempt: ['no smoke', 'no fog', 'wide aura', 'frozen frame'] },
  { id: 'inward_dust', label: '먼지 모여듦 (Inward Dust)', en: 'Micro dust gathers inward to form text.', guardrail: 'No outward drift. Do not trigger zoom out.', alphaRisk: 'medium' },
  { id: 'spark_burst', label: '스파크 점화 (Spark Burst)', en: 'Quick contained burst of sparks flashes in place.', guardrail: 'Confine sparks near text.', alphaRisk: 'medium' },
  { id: 'clearing_fog', label: '연기 걷힘 (Clearing Fog)', en: 'Thick smoke clears rapidly in place to reveal text.', guardrail: 'Smoke must clear completely.', alphaRisk: 'high', negExempt: ['no smoke', 'no fog'] }
];

export const INTRO_STYLES = [
  { id: 'fade_in', label: '서서히 밝아짐 (Fade In)', en: 'Starts as PURE BLACK VOID. Text slowly fades in (0% to 100% opacity) in place.' },
  { id: 'light_sweep', label: '빛으로 훑으며 등장 (Light Sweep)', en: 'Starts as PURE BLACK VOID. A tight vertical band of light sweeps across text surface. Illumination STRICTLY CONFINED to letters. ZERO external light beams.' },
  { id: 'glitch_reveal', label: '글리치 점등 (Glitch Reveal)', en: 'Starts as PURE BLACK VOID. Text aggressively stutters, sparks, and glitches into full visibility in place.' },
  { id: 'ember_ignite', label: '불씨 점화 (Ember Ignite)', en: 'Starts as PURE BLACK VOID. Glowing embers spark at center and spread outwards, burning text into existence.' }
];

export const TRANS_SURFACE_FX = [
  { id: 'none', label: '효과 없음 (None)', en: 'No extra companion surface FX.', shapeRisk: 'low' },
  { id: 'melting_heat', label: '경계선 고열 (Melting Heat)', en: 'Surface glows intensely hot at active transition boundary.', guardrail: 'Do not melt outline.', shapeRisk: 'medium' },
  { id: 'freezing_frost', label: '얼어붙는 파동 (Freezing Frost)', en: 'Frost rapidly shoots ahead of transition line.', guardrail: 'Do not grow text.', shapeRisk: 'medium' },
  { id: 'digital_glitch', label: '글리치 파괴 (Digital Glitch)', en: 'Digital glitch blocks corrupt surface strictly along transition wave.', guardrail: 'Zero slicing outside bounds.', shapeRisk: 'high' },
  { id: 'corrosion_spread', label: '산화/부식 확산 (Corrosion Spread)', en: 'Heavy oxidation eats surface at transition front.', guardrail: 'Keep geometry locked.', shapeRisk: 'medium' }
];

export const TRANS_EDGE_FX = [
  { id: 'none', label: '효과 없음 (None)', en: 'No extra companion edge FX.', shapeRisk: 'low' },
  { id: 'light_bleed', label: '경계선 빛 번짐 (Light Bleed)', en: 'Intense glowing aura actively pulses and bleeds outward specifically from the moving transition boundary.', guardrail: 'Allow dynamic glow expansion only at boundary.', shapeRisk: 'low', negExempt: ['wide aura'] },
  { id: 'burning_edge', label: '타오르는 경계 (Burning Edge)', en: 'Transition line burns heavily as it eats original edge.', guardrail: 'Strictly localized fire.', shapeRisk: 'high', negExempt: ['no large flames'] },
  { id: 'electric_zip', label: '경계선 전류 (Electric Zip)', en: 'Electricity actively zips strictly along boundary between materials.', guardrail: 'Zero wide aura.', shapeRisk: 'medium' },
  { id: 'crystal_shatter', label: '결정화 파열 (Crystal Shatter)', en: 'Micro-shards of crystal burst at transition edge.', guardrail: 'Do not distort main text body.', shapeRisk: 'high' }
];

export const TRANS_AMBIENT_FX = [
  { id: 'none', label: '효과 없음 (Clean Space)', en: 'Pure black background.', alphaRisk: 'low' },
  { id: 'animate_existing', label: '원본 주변 효과 살리기 (Animate Existing)', en: 'Actively animate the existing ambient effects (smoke, frost, aura) from the base image around the transition boundary to make them flow dynamically.', guardrail: 'Do not freeze ambient details.', alphaRisk: 'high', negExempt: ['no smoke', 'no fog', 'wide aura', 'frozen frame'] },
  { id: 'ash_debris', label: '부서지는 파편 (Ash Debris)', en: 'Old material sheds dark debris particles.', guardrail: 'Debris must dissolve quickly.', alphaRisk: 'medium' },
  { id: 'frost_dust', label: '얼음 가루 흩날림 (Frost Dust)', en: 'Cold frost dust blows off active transition boundary.', guardrail: 'Do not obscure readability.', alphaRisk: 'medium' },
  { id: 'energy_sparks', label: '스파크 방출 (Energy Sparks)', en: 'Bright sparks aggressively fly off transition boundary.', guardrail: 'Sparks dissipate instantly.', alphaRisk: 'medium' }
];

export const FLOW_STYLES = [
  { id: 'contour_trace', label: '윤곽선 흐름 (Contour Trace)', loop_en: 'Motion follows existing contours and stroke boundaries.', trans_en: 'New material traces along contours, filling strokes.' },
  { id: 'core_radiate', label: '중심부 맥박 (Core Pulse)', loop_en: 'Energy smoothly swells and pulses from the center core outward, remaining strictly inside the boundaries.', trans_en: 'The material transformation radiates smoothly from the center to the edges without expanding the shape.' },
  { id: 'edge_creep', label: '외곽선 침식 (Edge Creep)', loop_en: 'FX actively bites inward from extreme outer edges to center core, then dissolves.', trans_en: 'Aggressive erosion: New material bites and creeps inward from extreme edges.' },
  { id: 'particle_impact', label: '입자 충돌 확산 (Particle Impact)', loop_en: 'FX erupts from localized micro-impact points, spreading and fading.', trans_en: 'Micro-particles collide. New material aggressively spreads outward from impacts.' },
  { id: 'linear_sweep', label: '선형 스캔 훑기 (Linear Sweep)', loop_en: 'Controlled wave of energy/FX sweeps linearly across typography.', trans_en: 'Controlled wave of new material sweeps linearly across typography.' }
];

export const MOTION_DYNAMICS = [
  { id: 'smooth', label: '일정하고 부드럽게 (Smooth & Steady)', en: 'Smooth consistent speed.' },
  { id: 'erratic_bursts', label: '불규칙한 강약 (Erratic Bursts)', en: 'Erratic unpredictable rhythm. Sharp flickers then calm. Never moves toward camera.' },
  { id: 'organic_swell', label: '내부 에너지 집중 (Internal Build-up)', en: 'Localized internal intensity build-up. Peaks in thicker strokes. Zero breathing scale.' }
];

export const INTENSITY_LEVELS = [
  { id: 'subtle', label: '은은하게 (Subtle)', en: 'Subtle minimal' },
  { id: 'medium', label: '보통 (Medium)', en: 'Noticeable precise' },
  { id: 'intense', label: '강하게 (Intense)', en: 'High-energy strictly confined' }
];

export const TIME_DURATION = [
  { id: '3s', label: '3초 (빠른 진행)' },
  { id: '5s', label: '5초 (표준 진행)' },
  { id: '8s', label: '8초 (여유로운 진행)' }
];

export const TRANSITION_TARGETS = [
  { id: 'ice', label: '얼음/서리 (Frosted Ice)', base: 'solid frosted ice and sharp ice crystals', auto: { surface: 'freezing_frost', edge: 'crystal_shatter', ambient: 'frost_dust', intensity: 'medium' } },
  { id: 'rust', label: '부식/녹 (Corroded Rust)', base: 'rough flaky brown oxidation heavily corroded metal', auto: { surface: 'corrosion_spread', edge: 'none', ambient: 'ash_debris', intensity: 'subtle' } },
  { id: 'magma', label: '불씨/용암 (Glowing Magma)', base: 'cooling dark rock and intensely glowing red-hot embers', auto: { surface: 'melting_heat', edge: 'burning_edge', ambient: 'energy_sparks', intensity: 'intense' } },
  { id: 'crystal', label: '크리스탈 (Shiny Crystal)', base: 'transparent refractive shiny clear crystal glass', auto: { surface: 'freezing_frost', edge: 'crystal_shatter', ambient: 'none', intensity: 'medium' } },
  { id: 'cyber', label: '디지털화 (Cyber Glitch)', base: 'glowing neon circuits and holographic digital data blocks', auto: { surface: 'digital_glitch', edge: 'electric_zip', ambient: 'none', intensity: 'medium' } },
  { id: 'stone', label: '석화 (Petrification)', base: 'ancient cracked dry petrified stone', auto: { surface: 'corrosion_spread', edge: 'none', ambient: 'ash_debris', intensity: 'subtle' } }
];

export const TARGET_MODELS = [
  { id: 'universal', label: 'Universal (통용 표준)' },
  { id: 'runway', label: 'Runway Gen-4/5 (줌인 방지 최적화)' },
  { id: 'kling', label: 'Kling 1.5/3.0 (초압축/동적 활성화)' },
  { id: 'gemini', label: 'Gemini Video (미니멀/효과억제 최적화)' },
  { id: 'luma', label: 'Luma Dream Machine (자연어 묘사 최적화)' }
];

export const VFX_TARGETS = [
  { id: 'all', label: 'All Combined (모든 효과 통합 매트)' },
  { id: 'surface', label: 'Surface Pass (표면 효과 전용 매트)' },
  { id: 'edge', label: 'Edge Pass (외곽선 효과 전용 매트)' },
  { id: 'ambient', label: 'Ambient Pass (주변 입자 전용 매트)' }
];

export const EXPORT_MODES = [
  { id: 'production', label: 'Production (표준)', desc: '실무용 완벽 통제 프롬프트' },
  { id: 'lite_test', label: 'Lite Test (테스트)', desc: '저렴한 터보 모델 테스트용' },
  { id: 'vfx_pass', label: 'VFX Pass (합성용)', desc: 'Screen/Add 합성용 흑백 매트 추출' },
  { id: 'strict_lock', label: 'Strict Lock (고정)', desc: '형태 유지가 안 될 때 강제 고정' },
  { id: 'web_alpha', label: 'Web Alpha (추출)', desc: '투명 추출을 위한 가장자리/블랙 강조' }
];

export const EXPORT_MODE_INFO = {
  production: { title: "Production (실무용 표준 프롬프트)", desc: "가장 기본이 되는 모드입니다. 카메라 고정, 형태 보존, 자연스러운 효과 연출 밸런스가 잡혀있습니다. 고급 모델에서 처음 영상을 생성할 때 무조건 이 프롬프트를 복사해서 사용하세요." },
  lite_test: { title: "Lite Test (초기 테스트용 초압축)", desc: "빠르고 저렴한 모델(터보, 프리뷰 등)에서 컨셉을 빠르게 확인할 때 사용합니다. 수식어구를 최대한 쳐내어 글자수를 절반 이하로 줄였습니다." },
  vfx_pass: { title: "VFX Pass (합성용 소스 분리 추출 모드)", desc: "원본 텍스트를 완전히 보이지 않는 '검은색 실루엣(Matte)'으로 처리하고, 오직 빛이나 이펙트 요소만 렌더링합니다. 애프터이펙트나 프리미어에서 'Screen'이나 'Add' 블렌딩 모드로 합성하기 위한 최고의 전문가용 모드입니다." },
  strict_lock: { title: "Strict Lock (극단적 강제 고정 모드)", desc: "생성 결과물의 텍스트 형태가 녹아내리거나, 글자가 변형될 때 사용하는 '방어용' 프롬프트입니다. 창의적인 효과는 줄지만 형태가 얼어붙듯 고정됩니다." },
  web_alpha: { title: "Web Alpha Focus (합성 최적화 모드)", desc: "영상을 애프터이펙트의 '스크린 모드'로 합성하거나, 웹사이트 배경에 올리고 싶을 때 사용합니다. 빛 번짐과 연기를 극단적으로 억제하여 외곽선을 예리하게 만듭니다." }
};

// 평면 배열 — 기존 import (PRESETS) 호환 유지. usePresets/handleApplyPreset 도 이걸 lookup.
// 무한 반복 루프 프리셋들: 메탈/얼음/화염 각 5개씩 추가됨 (2026-05-21).
// 각 layer 값은 LOOP_SURFACE_FX / LOOP_EDGE_FX / LOOP_AMBIENT_FX / FLOW_STYLES / INTRO_STYLES / MOTION_DYNAMICS / INTENSITY_LEVELS / TIME_DURATION 의 id 만 사용.
export const PRESETS = [
  // ─── 기존 ────────────────────────────────────────────────────────────
  { id: 'premium_metal', label: 'Premium Metal',       description: '금속성 빛 흐름 + 윤곽선 트레이스. 절제된 프리미엄 모션.',                   layers: { surface: 'metallic_sweep', edge: 'rim_trace',      ambient: 'none',          intensity: 'subtle', duration: '5s', flow: 'contour_trace', intro: 'fade_in',       dynamics: 'smooth' } },
  { id: 'dark_fantasy',  label: 'Dark Fantasy Relic',  description: '용암 균열 + 외곽선 펄스 + 어두운 재. 다크 판타지 유물 분위기.',             layers: { surface: 'magma_cracks',    edge: 'edge_pulse',     ambient: 'ash_particles', intensity: 'medium', duration: '5s', flow: 'core_radiate',  intro: 'ember_ignite',  dynamics: 'organic_swell' } },
  { id: 'cyber_scan',    label: 'Cyber Data Scan',     description: '데이터 스캔 + 얇은 전류. 빠르고 불규칙한 사이버 디지털 모션.',              layers: { surface: 'data_scan',       edge: 'thin_electric',  ambient: 'none',          intensity: 'medium', duration: '3s', flow: 'linear_sweep',  intro: 'glitch_reveal', dynamics: 'erratic_bursts' } },

  // ─── 메탈 무한 루프 5종 ───────────────────────────────────────────────
  { id: 'metal_liquid_gold',     label: '황금 일렁임',        description: '황금 표면 위로 액체 같은 빛이 천천히 일렁이는 무한 루프.',                   layers: { surface: 'metallic_sweep', edge: 'rim_trace',     ambient: 'gold_dust',     intensity: 'subtle', duration: '5s', flow: 'contour_trace',  intro: 'fade_in',       dynamics: 'smooth' } },
  { id: 'metal_steel_galvanic',  label: '강철 갈바닉',        description: '강철 모서리를 따라 푸른 갈바닉 전류가 맥동하는 루프.',                       layers: { surface: 'light_shimmer',  edge: 'thin_electric', ambient: 'energy_sparks', intensity: 'medium', duration: '5s', flow: 'contour_trace',  intro: 'light_sweep',   dynamics: 'erratic_bursts' } },
  { id: 'metal_chrome_wave',     label: '크롬 미러 파동',     description: '크롬 미러 표면을 가로지르는 어두운 반사 파동의 무한 루프.',                  layers: { surface: 'living_texture', edge: 'rim_trace',     ambient: 'none',          intensity: 'subtle', duration: '5s', flow: 'linear_sweep',   intro: 'light_sweep',   dynamics: 'smooth' } },
  { id: 'metal_brushed_sweep',   label: '브러시드 골드 스윕', description: '수평 브러시 결을 따라 좌→우로 빛이 스윕하는 루프.',                          layers: { surface: 'metallic_sweep', edge: 'none',          ambient: 'gold_dust',     intensity: 'subtle', duration: '5s', flow: 'linear_sweep',   intro: 'light_sweep',   dynamics: 'smooth' } },
  { id: 'metal_ember_forge',     label: '엠버 포지 펄스',     description: '단조된 금속 내부에서 잔열이 호흡하듯 맥동하는 루프 (Dark Fantasy 와는 다른 잔잔한 톤).', layers: { surface: 'internal_glow',  edge: 'edge_pulse',    ambient: 'ash_particles', intensity: 'subtle', duration: '5s', flow: 'core_radiate',   intro: 'fade_in',       dynamics: 'organic_swell' } },

  // ─── 얼음 무한 루프 5종 ───────────────────────────────────────────────
  { id: 'ice_glacier_vapor',     label: '빙하 안개 흐름',     description: '빙하 결정 위로 끝없이 흐르는 차가운 안개 루프.',                              layers: { surface: 'living_texture',     edge: 'soft_aura',  ambient: 'haze_smoke',    intensity: 'subtle', duration: '8s', flow: 'contour_trace', intro: 'fade_in', dynamics: 'smooth' } },
  { id: 'ice_crystal_refraction',label: '결정 굴절 사이클',   description: '크리스탈 내부에서 빛이 끝없이 굴절되는 만화경 루프.',                        layers: { surface: 'crystal_refraction', edge: 'none',       ambient: 'none',          intensity: 'medium', duration: '5s', flow: 'core_radiate',  intro: 'fade_in', dynamics: 'organic_swell' } },
  { id: 'ice_frost_crawl',       label: '서리 기어가기',      description: '어두운 표면 모서리에서 서리가 자라고 사라지는 루프.',                        layers: { surface: 'light_shimmer',      edge: 'rim_trace',  ambient: 'none',          intensity: 'subtle', duration: '8s', flow: 'edge_creep',    intro: 'fade_in', dynamics: 'smooth' } },
  { id: 'ice_aurora_sheen',      label: '오로라 광택',        description: '얼음 표면을 대각선으로 흐르는 오로라 색감의 무한 루프.',                      layers: { surface: 'living_texture',     edge: 'soft_aura',  ambient: 'none',          intensity: 'subtle', duration: '5s', flow: 'linear_sweep',  intro: 'fade_in', dynamics: 'smooth' } },
  { id: 'ice_polar_twinkle',     label: '북극 반짝임',        description: '얼음 모서리의 미세한 흰 반짝임이 깜빡이는 루프.',                              layers: { surface: 'light_shimmer',      edge: 'edge_pulse', ambient: 'energy_sparks', intensity: 'medium', duration: '3s', flow: 'particle_impact', intro: 'glitch_reveal', dynamics: 'erratic_bursts' } },

  // ─── 화염 무한 루프 5종 ───────────────────────────────────────────────
  { id: 'fire_lava_vein',        label: '용암 맥동',          description: '화산암 균열 속 용암 맥이 강하게 호흡하는 무한 루프 (Dark Fantasy 보다 강렬).', layers: { surface: 'magma_cracks',    edge: 'burning_outline', ambient: 'energy_sparks', intensity: 'intense', duration: '5s', flow: 'core_radiate',    intro: 'ember_ignite', dynamics: 'organic_swell' } },
  { id: 'fire_ember_drift',      label: '불티 흩날림',        description: '글자 모서리에서 위로 천천히 떠오르는 불티 루프.',                             layers: { surface: 'shifting_cracks', edge: 'burning_outline', ambient: 'energy_sparks', intensity: 'medium',  duration: '5s', flow: 'edge_creep',      intro: 'ember_ignite', dynamics: 'smooth' } },
  { id: 'fire_phoenix_ring',     label: '피닉스 화염 고리',   description: '글자 외곽선을 따라 회전하는 불꽃 고리 루프.',                                 layers: { surface: 'internal_glow',   edge: 'burning_outline', ambient: 'energy_sparks', intensity: 'medium',  duration: '5s', flow: 'contour_trace',   intro: 'ember_ignite', dynamics: 'smooth' } },
  { id: 'fire_heat_haze',        label: '열기 아지랑이',      description: '달궈진 금속 모서리에서 열기 아지랑이가 미세하게 일렁이는 루프.',              layers: { surface: 'living_texture',  edge: 'soft_aura',       ambient: 'haze_smoke',    intensity: 'subtle',  duration: '5s', flow: 'core_radiate',    intro: 'fade_in',      dynamics: 'smooth' } },
  { id: 'fire_magma_surge',      label: '매그마 거품',        description: '글자 균열 안에서 끓어오르는 용암 거품이 솟구치는 루프.',                       layers: { surface: 'magma_cracks',    edge: 'edge_pulse',      ambient: 'energy_sparks', intensity: 'intense', duration: '8s', flow: 'particle_impact', intro: 'ember_ignite', dynamics: 'erratic_bursts' } },
];

// RenderMatrix PRESET_GROUPS 패턴 — 그룹 탭으로 카테고리화. id 는 PRESETS 의 id 와 동일하게 매핑.
// 새 프리셋은 PRESETS 에 추가한 뒤 여기 그룹 안에 같은 id 만 nest 하면 됨 (단일 진실 소스).
const _presetMap = Object.fromEntries(PRESETS.map(p => [p.id, p]));
export const PRESET_GROUPS = [
  {
    id: 'metal', icon: '🟡', name: '메탈',
    presets: [
      _presetMap.premium_metal,
      _presetMap.metal_liquid_gold,
      _presetMap.metal_steel_galvanic,
      _presetMap.metal_chrome_wave,
      _presetMap.metal_brushed_sweep,
      _presetMap.metal_ember_forge,
    ],
  },
  {
    id: 'ice', icon: '🧊', name: '얼음',
    presets: [
      _presetMap.ice_glacier_vapor,
      _presetMap.ice_crystal_refraction,
      _presetMap.ice_frost_crawl,
      _presetMap.ice_aurora_sheen,
      _presetMap.ice_polar_twinkle,
    ],
  },
  {
    id: 'fire', icon: '🔥', name: '화염',
    presets: [
      _presetMap.fire_lava_vein,
      _presetMap.fire_ember_drift,
      _presetMap.fire_phoenix_ring,
      _presetMap.fire_heat_haze,
      _presetMap.fire_magma_surge,
    ],
  },
  {
    id: 'fantasy', icon: '⚔️', name: '판타지',
    presets: [_presetMap.dark_fantasy],
  },
  {
    id: 'tech', icon: '💻', name: '사이버',
    presets: [_presetMap.cyber_scan],
  },
];
