import React, { useState, useEffect, useRef } from 'react';
import { GEMINI_API_KEY as apiKey } from '../../lib/gemini';
import { useGlobal } from '../../context/GlobalContext';

const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>
);

const MonitorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
    <line x1="8" y1="21" x2="16" y2="21"></line>
    <line x1="12" y1="17" x2="12" y2="21"></line>
  </svg>
);

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const PauseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="4" height="16"></rect>
    <rect x="14" y="4" width="4" height="16"></rect>
  </svg>
);

const LoopIcon = ({ active }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#a8c7fa" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 3 21 3 21 8"></polyline>
    <line x1="4" y1="22" x2="4" y2="22"></line>
    <polyline points="8 21 3 21 3 16"></polyline>
    <path d="M21 3v5h-5"></path>
    <path d="M3 21v-5h5"></path>
    <path d="M21 8a9 9 0 0 1-9 9 9 9 0 0 1-9-9"></path>
    <path d="M3 16a9 9 0 0 1 9-9 9 9 0 0 1 9 9"></path>
  </svg>
);

const LOOP_SURFACE_FX = [
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

const LOOP_EDGE_FX = [
  { id: 'none', label: '효과 없음 (None)', en: 'Edges clean and static.', shapeRisk: 'low' },
  { id: 'rim_trace', label: '윤곽선 빛 흐름 (Rim Light Trace)', en: 'Light particles trace outer contours.', guardrail: 'Trace extremely tight to edge.', shapeRisk: 'low' },
  { id: 'soft_aura', label: '미세한 빛 번짐 (Soft Glow Aura)', en: 'A soft glowing aura continuously breathes, gently pulsing and shifting its light intensity around the edges.', guardrail: 'Allow dynamic light bleed. Do not alter solid core.', shapeRisk: 'low', negExempt: ['wide aura'] },
  { id: 'thin_electric', label: '얇은 전류 외곽선 (Thin Electric)', en: 'Aggressively animate and bring to life any existing lightning, sparks, or electric motifs in the original image. Bright electric arcs crackle and travel along the strokes.', guardrail: 'Zero wide aura expansion. Confine lightning strictly to the text surface.', shapeRisk: 'medium' },
  { id: 'edge_pulse', label: '외곽선 발광 펄스 (Edge Glow Pulse)', en: 'Soft edge illumination actively brightening and dimming rhythmically.', guardrail: 'Tight to contours, zero wide aura.', shapeRisk: 'low' },
  { id: 'burning_outline', label: '불타는 윤곽선 (Burning Outline)', en: 'Microscopic fire tongues tracing edges.', guardrail: 'Fire strictly microscopic, zero spreading.', shapeRisk: 'high', negExempt: ['no large flames'] },
];

const LOOP_AMBIENT_FX = [
  { id: 'none', label: '효과 없음 (Clean Space)', en: 'Pure black background. Zero ambient FX.', alphaRisk: 'low' },
  { id: 'animate_existing', label: '원본 주변 효과 살리기 (Animate Existing)', en: 'CRITICAL: Actively animate any existing smoke, frost, aura, or glow surrounding the text in the original image. Make these ambient elements drift, flow, and dissipate naturally instead of being frozen.', guardrail: 'Do not freeze ambient details. Allow natural atmospheric movement.', alphaRisk: 'high', negExempt: ['no smoke', 'no fog', 'wide aura', 'frozen frame'] },
  { id: 'ash_particles', label: '어두운 재 입자 (Dark Ash)', en: 'Sparse dark ash trapped close to letters.', guardrail: 'Particles dissolve before leaving center. Zero outward momentum.', alphaRisk: 'low' },
  { id: 'gold_dust', label: '금빛 먼지 (Gold Dust)', en: 'Micro gold dust flickers in place within tight radius.', guardrail: 'No outward drift, no expansion.', alphaRisk: 'low' },
  { id: 'energy_sparks', label: '미세 불꽃 스파크 (Micro Sparks)', en: 'Tiny short-lived sparks snapping near letters.', guardrail: 'Zero flying outwards.', alphaRisk: 'medium' },
  { id: 'haze_smoke', label: '미세한 연기 (Subtle Wisps)', en: 'Subtle thin wisps attached near letters.', guardrail: 'Dissipate instantly. Zero large smoke.', alphaRisk: 'high', negExempt: ['no smoke', 'no fog'] },
];

const INTRO_SURFACE_FX = [
  { id: 'none', label: '효과 없음 (None)', en: 'No extra surface FX during reveal.', shapeRisk: 'low' },
  { id: 'shimmer_reveal', label: '은은한 빛 생성 (Shimmer Reveal)', en: 'Subtle light shimmers across surface as it materializes.', guardrail: 'Do not alter original silhouette.', shapeRisk: 'low' },
  { id: 'energy_fill', label: '내부 에너지 차오름 (Energy Fill)', en: 'Internal energy fills strokes from core outward.', guardrail: 'Confine light inside strokes.', shapeRisk: 'medium' },
  { id: 'frost_form', label: '결빙되며 등장 (Frost Form)', en: 'Ice crystals rapidly form across surface.', guardrail: 'Keep silhouette locked.', shapeRisk: 'medium' }
];

const INTRO_EDGE_FX = [
  { id: 'none', label: '효과 없음 (None)', en: 'No extra edge FX.', shapeRisk: 'low' },
  { id: 'soft_aura', label: '빛 번지며 등장 (Aura Bloom)', en: 'A soft glowing aura actively pulses and blooms outward from the edges as the text reveals.', guardrail: 'Allow dynamic light bleed. Keep core intact.', shapeRisk: 'low', negExempt: ['wide aura'] },
  { id: 'trace_reveal', label: '윤곽선 스캔 (Trace Reveal)', en: 'Bright laser traces outline to reveal shape.', guardrail: 'Trace strictly to edge.', shapeRisk: 'low' },
  { id: 'spark_ignite', label: '불꽃 튀며 등장 (Spark Ignite)', en: 'Edges catch fire and spark violently.', guardrail: 'Sparks must not obscure text.', shapeRisk: 'medium' },
  { id: 'electric_surge', label: '전류 쇄도 (Electric Surge)', en: 'High voltage surges around borders to shock text into existence.', guardrail: 'Zero wide aura.', shapeRisk: 'medium' }
];

const INTRO_AMBIENT_FX = [
  { id: 'none', label: '효과 없음 (Clean Space)', en: 'Pure black background.', alphaRisk: 'low' },
  { id: 'animate_existing', label: '원본 주변 효과 살리기 (Animate Existing)', en: 'CRITICAL: As the text reveals, actively animate the existing smoke, frost, or aura from the original image, making it billow and flow naturally rather than appearing as a static painting.', guardrail: 'Do not freeze ambient details.', alphaRisk: 'high', negExempt: ['no smoke', 'no fog', 'wide aura', 'frozen frame'] },
  { id: 'inward_dust', label: '먼지 모여듦 (Inward Dust)', en: 'Micro dust gathers inward to form text.', guardrail: 'No outward drift. Do not trigger zoom out.', alphaRisk: 'medium' },
  { id: 'spark_burst', label: '스파크 점화 (Spark Burst)', en: 'Quick contained burst of sparks flashes in place.', guardrail: 'Confine sparks near text.', alphaRisk: 'medium' },
  { id: 'clearing_fog', label: '연기 걷힘 (Clearing Fog)', en: 'Thick smoke clears rapidly in place to reveal text.', guardrail: 'Smoke must clear completely.', alphaRisk: 'high', negExempt: ['no smoke', 'no fog'] }
];

const INTRO_STYLES = [
  { id: 'fade_in', label: '서서히 밝아짐 (Fade In)', en: 'Starts as PURE BLACK VOID. Text slowly fades in (0% to 100% opacity) in place.' },
  { id: 'light_sweep', label: '빛으로 훑으며 등장 (Light Sweep)', en: 'Starts as PURE BLACK VOID. A tight vertical band of light sweeps across text surface. Illumination STRICTLY CONFINED to letters. ZERO external light beams.' },
  { id: 'glitch_reveal', label: '글리치 점등 (Glitch Reveal)', en: 'Starts as PURE BLACK VOID. Text aggressively stutters, sparks, and glitches into full visibility in place.' },
  { id: 'ember_ignite', label: '불씨 점화 (Ember Ignite)', en: 'Starts as PURE BLACK VOID. Glowing embers spark at center and spread outwards, burning text into existence.' }
];

const TRANS_SURFACE_FX = [
  { id: 'none', label: '효과 없음 (None)', en: 'No extra companion surface FX.', shapeRisk: 'low' },
  { id: 'melting_heat', label: '경계선 고열 (Melting Heat)', en: 'Surface glows intensely hot at active transition boundary.', guardrail: 'Do not melt outline.', shapeRisk: 'medium' },
  { id: 'freezing_frost', label: '얼어붙는 파동 (Freezing Frost)', en: 'Frost rapidly shoots ahead of transition line.', guardrail: 'Do not grow text.', shapeRisk: 'medium' },
  { id: 'digital_glitch', label: '글리치 파괴 (Digital Glitch)', en: 'Digital glitch blocks corrupt surface strictly along transition wave.', guardrail: 'Zero slicing outside bounds.', shapeRisk: 'high' },
  { id: 'corrosion_spread', label: '산화/부식 확산 (Corrosion Spread)', en: 'Heavy oxidation eats surface at transition front.', guardrail: 'Keep geometry locked.', shapeRisk: 'medium' }
];

const TRANS_EDGE_FX = [
  { id: 'none', label: '효과 없음 (None)', en: 'No extra companion edge FX.', shapeRisk: 'low' },
  { id: 'light_bleed', label: '경계선 빛 번짐 (Light Bleed)', en: 'Intense glowing aura actively pulses and bleeds outward specifically from the moving transition boundary.', guardrail: 'Allow dynamic glow expansion only at boundary.', shapeRisk: 'low', negExempt: ['wide aura'] },
  { id: 'burning_edge', label: '타오르는 경계 (Burning Edge)', en: 'Transition line burns heavily as it eats original edge.', guardrail: 'Strictly localized fire.', shapeRisk: 'high', negExempt: ['no large flames'] },
  { id: 'electric_zip', label: '경계선 전류 (Electric Zip)', en: 'Electricity actively zips strictly along boundary between materials.', guardrail: 'Zero wide aura.', shapeRisk: 'medium' },
  { id: 'crystal_shatter', label: '결정화 파열 (Crystal Shatter)', en: 'Micro-shards of crystal burst at transition edge.', guardrail: 'Do not distort main text body.', shapeRisk: 'high' }
];

const TRANS_AMBIENT_FX = [
  { id: 'none', label: '효과 없음 (Clean Space)', en: 'Pure black background.', alphaRisk: 'low' },
  { id: 'animate_existing', label: '원본 주변 효과 살리기 (Animate Existing)', en: 'Actively animate the existing ambient effects (smoke, frost, aura) from the base image around the transition boundary to make them flow dynamically.', guardrail: 'Do not freeze ambient details.', alphaRisk: 'high', negExempt: ['no smoke', 'no fog', 'wide aura', 'frozen frame'] },
  { id: 'ash_debris', label: '부서지는 파편 (Ash Debris)', en: 'Old material sheds dark debris particles.', guardrail: 'Debris must dissolve quickly.', alphaRisk: 'medium' },
  { id: 'frost_dust', label: '얼음 가루 흩날림 (Frost Dust)', en: 'Cold frost dust blows off active transition boundary.', guardrail: 'Do not obscure readability.', alphaRisk: 'medium' },
  { id: 'energy_sparks', label: '스파크 방출 (Energy Sparks)', en: 'Bright sparks aggressively fly off transition boundary.', guardrail: 'Sparks dissipate instantly.', alphaRisk: 'medium' }
];

const FLOW_STYLES = [
  { id: 'contour_trace', label: '윤곽선 흐름 (Contour Trace)', loop_en: 'Motion follows existing contours and stroke boundaries.', trans_en: 'New material traces along contours, filling strokes.' },
  { id: 'core_radiate', label: '중심부 맥박 (Core Pulse)', loop_en: 'Energy smoothly swells and pulses from the center core outward, remaining strictly inside the boundaries.', trans_en: 'The material transformation radiates smoothly from the center to the edges without expanding the shape.' },
  { id: 'edge_creep', label: '외곽선 침식 (Edge Creep)', loop_en: 'FX actively bites inward from extreme outer edges to center core, then dissolves.', trans_en: 'Aggressive erosion: New material bites and creeps inward from extreme edges.' },
  { id: 'particle_impact', label: '입자 충돌 확산 (Particle Impact)', loop_en: 'FX erupts from localized micro-impact points, spreading and fading.', trans_en: 'Micro-particles collide. New material aggressively spreads outward from impacts.' },
  { id: 'linear_sweep', label: '선형 스캔 훑기 (Linear Sweep)', loop_en: 'Controlled wave of energy/FX sweeps linearly across typography.', trans_en: 'Controlled wave of new material sweeps linearly across typography.' }
];

const MOTION_DYNAMICS = [
  { id: 'smooth', label: '일정하고 부드럽게 (Smooth & Steady)', en: 'Smooth consistent speed.' },
  { id: 'erratic_bursts', label: '불규칙한 강약 (Erratic Bursts)', en: 'Erratic unpredictable rhythm. Sharp flickers then calm. Never moves toward camera.' },
  { id: 'organic_swell', label: '내부 에너지 집중 (Internal Build-up)', en: 'Localized internal intensity build-up. Peaks in thicker strokes. Zero breathing scale.' },
];

const INTENSITY_LEVELS = [
  { id: 'subtle', label: '은은하게 (Subtle)', en: 'Subtle minimal' },
  { id: 'medium', label: '보통 (Medium)', en: 'Noticeable precise' },
  { id: 'intense', label: '강하게 (Intense)', en: 'High-energy strictly confined' }
];

const TIME_DURATION = [
  { id: '3s', label: '3초 (빠른 진행)' },
  { id: '5s', label: '5초 (표준 진행)' },
  { id: '8s', label: '8초 (여유로운 진행)' }
];

const TRANSITION_TARGETS = [
  { id: 'ice', label: '얼음/서리 (Frosted Ice)', base: 'solid frosted ice and sharp ice crystals', auto: { surface: 'freezing_frost', edge: 'crystal_shatter', ambient: 'frost_dust', intensity: 'medium' } },
  { id: 'rust', label: '부식/녹 (Corroded Rust)', base: 'rough flaky brown oxidation heavily corroded metal', auto: { surface: 'corrosion_spread', edge: 'none', ambient: 'ash_debris', intensity: 'subtle' } },
  { id: 'magma', label: '불씨/용암 (Glowing Magma)', base: 'cooling dark rock and intensely glowing red-hot embers', auto: { surface: 'melting_heat', edge: 'burning_edge', ambient: 'energy_sparks', intensity: 'intense' } },
  { id: 'crystal', label: '크리스탈 (Shiny Crystal)', base: 'transparent refractive shiny clear crystal glass', auto: { surface: 'freezing_frost', edge: 'crystal_shatter', ambient: 'none', intensity: 'medium' } },
  { id: 'cyber', label: '디지털화 (Cyber Glitch)', base: 'glowing neon circuits and holographic digital data blocks', auto: { surface: 'digital_glitch', edge: 'electric_zip', ambient: 'none', intensity: 'medium' } },
  { id: 'stone', label: '석화 (Petrification)', base: 'ancient cracked dry petrified stone', auto: { surface: 'corrosion_spread', edge: 'none', ambient: 'ash_debris', intensity: 'subtle' } }
];

const TARGET_MODELS = [
  { id: 'universal', label: 'Universal (통용 표준)' },
  { id: 'runway', label: 'Runway Gen-4/5 (줌인 방지 최적화)' },
  { id: 'kling', label: 'Kling 1.5/3.0 (초압축/동적 활성화)' },
  { id: 'gemini', label: 'Gemini Video (미니멀/효과억제 최적화)' },
  { id: 'luma', label: 'Luma Dream Machine (자연어 묘사 최적화)' }
];

const VFX_TARGETS = [
  { id: 'all', label: 'All Combined (모든 효과 통합 매트)' },
  { id: 'surface', label: 'Surface Pass (표면 효과 전용 매트)' },
  { id: 'edge', label: 'Edge Pass (외곽선 효과 전용 매트)' },
  { id: 'ambient', label: 'Ambient Pass (주변 입자 전용 매트)' }
];

const EXPORT_MODES = [
  { id: 'production', label: 'Production (표준)', desc: '실무용 완벽 통제 프롬프트' },
  { id: 'lite_test', label: 'Lite Test (테스트)', desc: '저렴한 터보 모델 테스트용' },
  { id: 'vfx_pass', label: 'VFX Pass (합성용)', desc: 'Screen/Add 합성용 흑백 매트 추출' },
  { id: 'strict_lock', label: 'Strict Lock (고정)', desc: '형태 유지가 안 될 때 강제 고정' },
  { id: 'web_alpha', label: 'Web Alpha (추출)', desc: '투명 추출을 위한 가장자리/블랙 강조' }
];

const EXPORT_MODE_INFO = {
  production: { title: "Production (실무용 표준 프롬프트)", desc: "가장 기본이 되는 모드입니다. 카메라 고정, 형태 보존, 자연스러운 효과 연출 밸런스가 잡혀있습니다." },
  lite_test: { title: "Lite Test (초기 테스트용 초압축)", desc: "빠르고 저렴한 모델에서 컨셉을 빠르게 확인할 때 사용합니다. 글자수를 절반 이하로 줄였습니다." },
  vfx_pass: { title: "VFX Pass (합성용 소스 분리 추출 모드)", desc: "원본 텍스트를 검은색 실루엣(Matte)으로 처리하고 빛/이펙트만 렌더링합니다. Screen/Add 합성에 최적." },
  strict_lock: { title: "Strict Lock (극단적 강제 고정 모드)", desc: "텍스트 형태가 변형될 때 사용하는 방어용 프롬프트입니다." },
  web_alpha: { title: "Web Alpha Focus (합성 최적화 모드)", desc: "스크린 모드 합성용. 빛 번짐/연기를 억제하여 외곽선을 예리하게 만듭니다." }
};

const PRESETS = [
  { id: 'premium_metal', label: 'Premium Metal', layers: { surface: 'metallic_sweep', edge: 'rim_trace', ambient: 'none', intensity: 'subtle', duration: '5s', flow: 'contour_trace', intro: 'fade_in', dynamics: 'smooth' } },
  { id: 'dark_fantasy', label: 'Dark Fantasy Relic', layers: { surface: 'magma_cracks', edge: 'edge_pulse', ambient: 'ash_particles', intensity: 'medium', duration: '5s', flow: 'core_radiate', intro: 'ember_ignite', dynamics: 'organic_swell' } },
  { id: 'cyber_scan', label: 'Cyber Data Scan', layers: { surface: 'data_scan', edge: 'thin_electric', ambient: 'none', intensity: 'medium', duration: '3s', flow: 'linear_sweep', intro: 'glitch_reveal', dynamics: 'erratic_bursts' } }
];

const inspectAndOptimizePrompt = (rawText, targetModel) => {
  let opt = rawText || "";
  const logs = [];
  let replacements = [
      { rx: /\b(sweeps across|sweeps|sweeping)\b/gi, rep: 'scans in-place across', reason: '카메라 패닝 유발 방지' },
      { rx: /\b(radiates outward|radiates|radiating)\b/gi, rep: 'pulses in-place', reason: '형태 팽창(Scale up) 방지' },
      { rx: /\b(creeps inward|creeping inward|creeps)\b/gi, rep: 'materializes', reason: 'Z축 줌인 유발 방지' },
      { rx: /\b(erupts from|erupts|erupting)\b/gi, rep: 'flashes at', reason: '오브젝트 파괴/변형 방지' },
      { rx: /\b(fly off|flying outwards?)\b/gi, rep: 'spark locally', reason: '입자 프레임 이탈 방지' },
      { rx: /\b(blows off|blowing)\b/gi, rep: 'dissolves near', reason: '연기/가루의 화면 잠식 방지' },
      { rx: /\b(aggressively spreads|spreads outward|spreads)\b/gi, rep: 'illuminates', reason: '질감의 스케일 확장 방지' },
      { rx: /\b(organic swell)\b/gi, rep: 'in-place swell', reason: '스케일 꿀렁임(Wobbling) 방지' },
      { rx: /\b(aggressively animate|animate heavily)\b/gi, rep: 'animate in-place', reason: '과도한 픽셀 뭉개짐 방지' }
  ];
  if (targetModel === 'kling') {
      replacements = replacements.filter(r => !['오브젝트 파괴/변형 방지', '과도한 픽셀 뭉개짐 방지', '스케일 꿀렁임(Wobbling) 방지', '질감의 스케일 확장 방지'].includes(r.reason));
  }
  replacements.forEach(({rx, rep, reason}) => {
      const match = opt.match(rx);
      if(match && match.length > 0) {
          opt = opt.replace(rx, rep);
          logs.push(`⚠️ 단어 교체: "${match[0]}" ➡️ "${rep}" (${reason})`);
      }
  });
  const oldLen = opt.length;
  opt = opt.replace(/\n\s*\n/g, '\n');
  opt = opt.replace(/  +/g, ' ');
  if (oldLen > opt.length + 20) logs.push(`✅ 빈칸 및 토큰 낭비 압축 완료`);
  return { optimizedText: opt, logs };
};

const compileNegativePrompt = (layers, exportMode, animationMode, targetModel, surfaceOpts, edgeOpts, ambientOpts) => {
  const sOpt = surfaceOpts.find(o => o.id === layers.surface);
  const eOpt = edgeOpts.find(o => o.id === layers.edge);
  const aOpt = ambientOpts.find(o => o.id === layers.ambient);
  const exempt = [...(sOpt?.negExempt || []), ...(eOpt?.negExempt || []), ...(aOpt?.negExempt || [])];
  let baseNegatives = [];
  if (exportMode === 'lite_test') {
    baseNegatives = ["camera movement", "zoom", "lens flare", "external laser beams", "distortion", "morphing", "warping", "wobbling", "scenery", "3D"];
    if (animationMode === 'loop') baseNegatives.push("non-looping");
  } else if (exportMode === 'vfx_pass') {
    baseNegatives = [
      "camera movement", "zoom", "pan", "scale change",
      "morphing", "distortion", "typography changes", "visible text face", "textured letters", "lit background",
      "scenery", "background scene", "floor shadow", "lens flare", "anamorphic streak", "external laser beams", "audio",
      "original texture", "visible letters", "surface details", "base image colors", "lit text", "metal texture", "stone texture",
      "reflections on text", "ambient light on letters", "inner fill"
    ];
    if (animationMode === 'loop') baseNegatives.push("lingering glow", "non-looping");
  } else {
    baseNegatives = [
      "camera movement", "zoom", "zoom out", "zoom in", "pan", "dolly", "parallax", "reframe", "crop shift",
      "scale change", "shrinking text", "growing text", "depth motion", "backward drift", "forward drift", "breathing scale",
      "morphing", "distortion", "typography changes", "warping", "wobbling", "liquefying", "jelly-like motion", "melting",
      "scenery", "background scene", "floor shadow",
      "large smoke", "messy particles", "clipping edges", "wide aura", "lens flare", "anamorphic streak", "volumetric light", "external laser beams", "flash", "glare", "amateur", "flat lighting",
      "audio", "abrupt cuts", "high contrast black stains"
    ];
    if (animationMode === 'loop') baseNegatives.push("lingering glow", "non-looping", "one-way movement", "linear animation");
    else baseNegatives = baseNegatives.filter(n => n !== "typography changes");
  }
  if (animationMode === 'intro') baseNegatives.push("flying in", "scaling up", "zooming out from black", "pop in", "sliding text", "moving text", "visible at start");
  if (targetModel === 'runway') baseNegatives.push("micro-zoom", "creeping scale", "subtle zoom", "slow push-in", "perspective shift");
  else if (targetModel === 'gemini') baseNegatives.push("excessive effects", "flashy", "cluttered", "busy", "over-the-top", "chaotic");
  else if (targetModel === 'kling') {
    baseNegatives = baseNegatives.filter(n => !["typography changes"].includes(n));
    baseNegatives.push("frozen texture", "static photo", "dead pixels", "wobbling", "warping", "liquefying", "morphing letterforms", "letter deformation");
  }
  return baseNegatives.filter(n => !exempt.includes(n)).join(", ");
};

const compileRawPrompt = (layers, exportMode, animationMode, targetMat, vfxTarget, targetModel, surfaceOpts, edgeOpts, ambientOpts) => {
  const sOpt = surfaceOpts.find(f => f.id === layers.surface) || surfaceOpts[0];
  const eOpt = edgeOpts.find(f => f.id === layers.edge) || edgeOpts[0];
  const aOpt = ambientOpts.find(f => f.id === layers.ambient) || ambientOpts[0];
  const tMat = TRANSITION_TARGETS.find(t => t.id === targetMat) || TRANSITION_TARGETS[0];
  const flowOpt = FLOW_STYLES.find(f => f.id === layers.flow) || FLOW_STYLES[0];
  const introOpt = INTRO_STYLES.find(i => i.id === layers.intro) || INTRO_STYLES[0];
  const intensity = INTENSITY_LEVELS.find(f => f.id === layers.intensity).en;
  const dynamics = MOTION_DYNAMICS.find(f => f.id === layers.dynamics).en;
  const guardrails = Array.from(new Set([sOpt.guardrail, eOpt.guardrail, aOpt.guardrail].filter(Boolean))).join(" ");
  const halfway = parseInt(layers.duration) / 2;

  let modelInjection = "";
  if (targetModel === 'runway') modelInjection = `[ANTI-ZOOM] Do not scale, reframe, or zoom. Keep bounds identical. Zero depth motion.\n`;
  else if (targetModel === 'kling') modelInjection = `[KLING DYNAMICS] Outer silhouette is mathematically FROZEN. Zero morphing or shape distortion. BUT the INTERNAL textures, edges, and lighting MUST flow and animate vividly.\n`;
  else if (targetModel === 'gemini') modelInjection = `[MINIMALIST] Restrain effects. Subtle, clean motion. Do not over-render.\n`;

  const cinematicTone = `[TONE] Hollywood title sequence, masterpiece, photorealistic, cinematic lighting.\n`;

  if (exportMode === 'vfx_pass') {
    let fxToRender = "";
    if (vfxTarget === 'surface') fxToRender = `[SURFACE FX ONLY] ${sOpt.en} Zero edge/ambient.`;
    else if (vfxTarget === 'edge') fxToRender = `[EDGE FX ONLY] ${eOpt.en} Zero surface/ambient.`;
    else if (vfxTarget === 'ambient') fxToRender = `[AMBIENT FX ONLY] ${aOpt.en} Zero surface/edge.`;
    else fxToRender = `[FX] Surface: ${sOpt.en} Edge: ${eOpt.en} Ambient: ${aOpt.en}`;
    let modeLine = "";
    if (animationMode === 'transition') modeLine = `Progression: ${flowOpt.trans_en} End: Full FX.`;
    else if (animationMode === 'intro') modeLine = `Intro Reveal. Start(0s): Pitch black empty space. Progression: ${introOpt.en} End: Fully visible FX.`;
    else modeLine = `Seamless ${layers.duration} loop. ${flowOpt.loop_en} Dormant start -> peak ${halfway}s -> dormant end.`;
    return `${modelInjection}VFX Luma Matte Render Pass on pure #000000 background.\n${cinematicTone}[MASK OVERRIDE] IGNORE input textures/colors. OVERWRITE base image. ${animationMode === 'intro' ? 'Frame 0 MUST be completely black.' : ''} Transform typography into a flat, unlit, pure #000000 silhouette. Base text acts ONLY as hidden collision mesh. DO NOT render original material.\n[MOTION] ${modeLine} ${dynamics} (${intensity}). Zero camera movement. Zero depth drift.\n${fxToRender}\nRender ONLY bright glowing FX for Add/Screen compositing.\n[RULE] Preserve exact bounds & size. Pure #000000 BG. Zero flares, zero external lasers, zero scenery. --no-audio --zoom 0`;
  }

  if (exportMode === 'lite_test') {
    let modeLine = "";
    let baseImgLock = "Use original image exactly as first frame.";
    if (animationMode === 'transition') modeLine = `Linear trans to ${tMat.base}. ${flowOpt.trans_en}`;
    else if (animationMode === 'intro') { modeLine = `Intro Reveal. ${introOpt.en}`; baseImgLock = "CRITICAL: Image is FINAL target frame. Frame 0 MUST be pitch black."; }
    else modeLine = `Seamless ${layers.duration} loop. ${flowOpt.loop_en}`;
    let motionLock = targetModel === 'kling'
        ? "Outline is mathematically frozen. INTERNAL textures MUST animate vividly and shift continuously."
        : "Outer shape frozen. INTERNAL textures animate vividly.";
    return `${modelInjection}2D text on pure #000000. ${baseImgLock} 100% static camera. Zero zoom/pan/drift. Preserve exact size. Immutable shape.\n[MOTION] ${motionLock} ${modeLine} ${dynamics} (${intensity}).\n[FX] ${sOpt.en} ${eOpt.en} ${aOpt.en}\n[RULE] ${guardrails} Zero flares/scenery. --no-audio --zoom 0`;
  }

  let lockSection = "";
  if (targetModel === 'kling') {
      lockSection = animationMode === 'intro'
        ? `[CAM/SHAPE] CRITICAL OVERRIDE: Provided image is FINAL TARGET FRAME. Frame 0 MUST be completely pitch black. Fixed camera. Text boundaries are mathematically frozen. Zero wobbling or warping.`
        : `[CAM/SHAPE] Fixed camera, zero zoom/pan/drift. Text boundaries are mathematically frozen. Zero morphing, wobbling, or warping. The letters MUST NOT deform. Only the internal textures and edge lighting can shift.`;
  } else {
      if (animationMode === 'intro') lockSection = `[CAM/SHAPE LOCK]\nCRITICAL OVERRIDE: The provided image is the FINAL TARGET FRAME, NOT the first frame. Frame 0 MUST be completely pitch black and invisible. 100% static locked-off camera. The outer silhouette and bounding box are completely frozen. Zero zoom, pan, parallax, or perspective shift. Preserve the exact original text size, position, and margins.`;
      else lockSection = `[CAM/SHAPE LOCK]\nUse the provided image exactly as the first frame reference. 100% static locked-off camera. The outer silhouette and bounding box are completely frozen. Zero zoom, pan, parallax, or perspective shift. Preserve the exact original text size, position, and margins. CRITICAL: While the outer shape is locked, the INTERNAL textures, cracks, and existing electric/energy motifs MUST animate vividly.`;
  }

  let loopSection = "";
  let motionSection = "";
  if (animationMode === 'transition') {
    loopSection = `[TRANSITION] ONE-WAY cinematic material transition. Start(0s): Original base texture. Progression: ${flowOpt.trans_en} End(${layers.duration}): Surface converts entirely into ${tMat.base}.`;
    motionSection = `[MOTION] ${dynamics} (${intensity}). FX animate heavily during transition. Never move toward camera. Zero depth drift. No outward expansion.`;
  } else if (animationMode === 'intro') {
    loopSection = `[INTRO] ONE-WAY reveal animation. Start(0s): Typography is completely invisible, pitch black. Progression: ${introOpt.en} End(${layers.duration}): Text is 100% visible exactly as reference image.`;
    motionSection = `[MOTION] ${dynamics} (${intensity}). Text must reveal IN PLACE. Never move toward camera. Zero depth drift. No scaling/flying in.`;
  } else {
    loopSection = `[LOOP] Seamless ${layers.duration} loop. Frame 0 and final frame visually identical. Dormant start -> peak at ${halfway}s -> dormant end. Return to dormant affects only light intensity, never scale. Zero lingering FX.`;
    motionSection = `[MOTION] ${flowOpt.loop_en} Never move toward camera. Zero depth drift. ${dynamics} (${intensity}). Only internal FX animate. No expansion/shrink.`;
  }

  let fxSection = `[FX] Apply tracing & enhancing existing design elements (e.g. lightning, cracks).\nSurface: ${sOpt.en}\nEdge: ${eOpt.en}\nAmbient: ${aOpt.en}`;
  let guardrailSection = `[RULE] Razor-sharp readability. Pure #000000 background. Zero heat haze/scenery/smoke. CRITICAL: Zero lens flares, zero anamorphic streaks, zero external laser beams from empty space. Confine FX strictly to text surface. Particles MUST NOT clip frame edges. ${guardrails}`;

  if (exportMode === 'production' || exportMode === 'strict_lock') guardrailSection += ` --no-audio --zoom 0`;
  else if (exportMode === 'web_alpha') guardrailSection = `[RULE] Ultra-sharp edges. Zero wide glow. Particles dissolve before edges. ${guardrails} --no-audio --zoom 0`;

  if (targetModel === 'luma') {
      let refInst = animationMode === 'intro' ? "CRITICAL: Image represents FINAL frame. Video MUST start completely black (Frame 0)." : "Use image exactly as first frame reference.";
      return `Create a breathtaking Hollywood title sequence. Isolated 2D typography on pure #000000. Masterpiece, photorealistic cinematic lighting. ${refInst} 100% static camera. Zero zoom/pan/depth drift. Preserve exact text size.\nOuter silhouette is completely frozen, but internal textures/motifs animate vividly.\n${animationMode === 'transition' ? `Cinematic material transition. ${flowOpt.trans_en} Surface converts into ${tMat.base}.` : animationMode === 'intro' ? `Intro Reveal. ${introOpt.en} Fully visible by ${layers.duration}.` : `Seamless ${layers.duration} loop. ${flowOpt.loop_en} Dormant start, peak at ${halfway}s, completely dormant end.`}\nApply overlays: ${sOpt.en} ${eOpt.en} ${aOpt.en}\nDynamics: ${dynamics} (${intensity}). Razor-sharp readability. Zero lens flares, external lasers, volumetric light. Confine FX to text surface. ${guardrails} --no-audio --zoom 0`;
  }
  return `${modelInjection}Isolated 2D typography motion on pure #000000.\n${cinematicTone}${lockSection}\n${loopSection}\n${motionSection}\n${fxSection}\n${guardrailSection}`;
};

const DropdownControl = ({ label, value, options, onChange, highlight = false, recommendedId = null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState('bottom');
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 250) setPlacement('top');
      else setPlacement('bottom');
    }
    setIsOpen(!isOpen);
  };

  const selectedOption = options.find(o => o.id === value);
  const selectedLabel = selectedOption?.label || 'Select...';
  const isDynamic = selectedOption?.id?.startsWith('dynamic_');
  // 추천 옵션이 있고 아직 선택 전이면 트리거에 ★ 강조
  const hasUnpickedRec = recommendedId && recommendedId !== value && options.some(o => o.id === recommendedId);

  return (
    <div className="flex flex-col gap-1.5" ref={dropdownRef}>
      <label className="text-[10px] font-medium text-[#9ca3af] tracking-wider uppercase flex items-center justify-between">
        {label}
        {isDynamic && <span className="text-[9px] text-[#a8c7fa] bg-[#a8c7fa]/10 px-1.5 py-0.5 rounded">Dynamic AI</span>}
      </label>
      <div className="relative" ref={buttonRef}>
        <button
          onClick={handleToggle}
          className={`w-full bg-[#181a1f] border ${highlight ? 'border-[#a8c7fa] text-[#a8c7fa] shadow-[0_0_10px_rgba(168,199,250,0.1)]' : hasUnpickedRec ? 'border-amber-400/60 text-amber-300 ring-1 ring-amber-400/30' : 'border-[#2b2d31] hover:border-[#4b4d52] text-[#e3e3e3]'} py-2.5 px-3 rounded-lg text-left text-[11px] transition-colors flex justify-between items-center group ${isDynamic ? 'border-[#a8c7fa]/40 bg-[#a8c7fa]/5' : ''}`}
        >
          <span className="truncate pr-2 flex items-center gap-1.5">
            {hasUnpickedRec && <span className="text-amber-400 text-[10px]" title="렌더 메트릭스에서 추천된 옵션">★</span>}
            {selectedLabel}
          </span>
          <svg className={`w-3.5 h-3.5 ${highlight ? 'text-[#a8c7fa]' : 'text-[#6b7280] group-hover:text-[#e3e3e3]'} transition-transform ${isOpen ? (placement === 'top' ? '-rotate-180' : 'rotate-180') : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </button>

        {isOpen && (
          <div className={`nx-popover-panel absolute z-50 w-full max-h-60 overflow-y-auto custom-scrollbar py-1 ${placement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}`}>
            {options.map((opt) => {
              const isSelected = value === opt.id;
              const isRecommended = recommendedId === opt.id;
              return (
                <button
                  key={opt.id}
                  className={`nx-popover-item ${isSelected ? 'is-active' : ''}`}
                  onClick={() => { onChange(opt.id); setIsOpen(false); }}
                >
                  <span className="truncate flex-1 flex items-center gap-1.5">
                    {!isSelected && isRecommended && <span className="text-amber-400 text-[10px]">★</span>}
                    {opt.label}
                  </span>
                  {isSelected && (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                  {!isSelected && isRecommended && <span className="text-[8px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300 uppercase">추천</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

function App() {
  const [activeTab, setActiveTab] = useState('generate');
  const [animationMode, setAnimationMode] = useState('loop');
  const [targetModel, setTargetModel] = useState('universal');
  const [targetMaterial, setTargetMaterial] = useState('ice');
  const [vfxTarget, setVfxTarget] = useState('all');
  const [isOptimized, setIsOptimized] = useState(true);
  const { payload, clearPayload } = useGlobal();
  const [incomingFromRender, setIncomingFromRender] = useState(null); // { source, text, tags, style, status, summary, errorMessage }
  const [arcRecommended, setArcRecommended] = useState(null); // { surface, edge, ambient, intensity, dynamics, duration }
  const [isArcAnalyzing, setIsArcAnalyzing] = useState(false);
  const consumedPayloadRef = useRef(null);
  const [layers, setLayers] = useState({
    surface: 'metallic_sweep', edge: 'rim_trace', ambient: 'none', intensity: 'subtle', duration: '5s', flow: 'contour_trace', intro: 'fade_in', dynamics: 'smooth'
  });
  const [exportMode, setExportMode] = useState('production');
  const [activePreset, setActivePreset] = useState('');
  const [surfaceOptions, setSurfaceOptions] = useState(LOOP_SURFACE_FX);
  const [edgeOptions, setEdgeOptions] = useState(LOOP_EDGE_FX);
  const [ambientOptions, setAmbientOptions] = useState(LOOP_AMBIENT_FX);
  const [image, setImage] = useState(null);
  const [isImageDragging, setIsImageDragging] = useState(false);
  const [directorNote, setDirectorNote] = useState("");
  const [aiInterpretation, setAiInterpretation] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [baseValidatePrompt, setBaseValidatePrompt] = useState("");
  const [evalChecks, setEvalChecks] = useState({ cameraMoved: false, shapeMutated: false, loopBroken: false, particlesEscaped: false, alphaDirty: false });
  const [aiDetectedErrors, setAiDetectedErrors] = useState(null);
  const [resultVideo, setResultVideo] = useState(null);
  const [analyzedFrames, setAnalyzedFrames] = useState([]);
  const [isResultAnalyzing, setIsResultAnalyzing] = useState(false);
  const [isResultDragging, setIsResultDragging] = useState(false);
  const resultVideoRef = useRef(null);
  const [analysisModal, setAnalysisModal] = useState({ isOpen: false, results: null });
  const [toastMsg, setToastMsg] = useState("");
  const toastTimer = useRef(null);
  const fileInputRef = useRef(null);
  const [leftPaneWidth, setLeftPaneWidth] = useState(45);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);

  // 렌더 메트릭스에서 전달된 payload 수신 — Gemini로 모션 옵션 추천
  useEffect(() => {
    if (!payload || payload.target !== 'motion-metrics') return;
    if (!payload.timestamp) return;
    if (consumedPayloadRef.current === payload.timestamp) return;
    consumedPayloadRef.current = payload.timestamp;

    const text = payload.prompt?.text || '';
    const tags = Array.isArray(payload.prompt?.tags) ? payload.prompt.tags : [];
    const style = payload.prompt?.style || '';
    const source = payload.source || 'unknown';

    setIncomingFromRender({ source, text, tags, style, status: 'analyzing' });
    try { clearPayload(); } catch {}
    if (!text || !apiKey) {
      setIncomingFromRender((s) => s ? { ...s, status: 'no-text' } : null);
      return;
    }

    (async () => {
      setIsArcAnalyzing(true);
      const surfaceIds   = LOOP_SURFACE_FX.map(o => o.id).join(', ');
      const edgeIds      = LOOP_EDGE_FX.map(o => o.id).join(', ');
      const ambientIds   = LOOP_AMBIENT_FX.map(o => o.id).join(', ');
      const intensityIds = INTENSITY_LEVELS.map(o => o.id).join(', ');
      const dynamicsIds  = MOTION_DYNAMICS.map(o => o.id).join(', ');
      const durationIds  = TIME_DURATION.map(o => o.id).join(', ');

      const sysPrompt = `이 렌더링 프롬프트의 스타일과 분위기를 분석해서 어울리는 모션 효과를 추천하세요.\n반드시 아래 ID 목록 중에서 한 개씩만 골라 JSON으로 반환 (코드블록·설명 금지):\n- surface (글자 표면 효과): ${surfaceIds}\n- edge (외곽선 효과): ${edgeIds}\n- ambient (주변 입자/연기): ${ambientIds}\n- intensity (효과 강도): ${intensityIds}\n- dynamics (속도감/리듬): ${dynamicsIds}\n- duration (지속 시간): ${durationIds}\n\n[입력 프롬프트]\n${text}\n[스타일 메타]\n${style || '(없음)'}\n[태그]\n${tags.join(', ') || '(없음)'}\n\n출력 형식:\n{ "summary": "한 문장 한국어 설명 (왜 이 조합인지)", "surface":"...", "edge":"...", "ambient":"...", "intensity":"...", "dynamics":"...", "duration":"..." }`;
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(new Error("Gemini timeout 30s")), 30000);
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: sysPrompt }] }],
              generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
            }),
            signal: ctrl.signal,
          },
        );
        clearTimeout(t);
        if (!resp.ok) throw new Error(`Gemini ${resp.status}`);
        const json = await resp.json();
        const txt = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!txt) throw new Error('빈 응답');
        const parsed = JSON.parse(txt);
        const filterId = (val, list) => list.some(o => o.id === val) ? val : null;
        setArcRecommended({
          summary: parsed.summary || '',
          surface:   filterId(parsed.surface,   LOOP_SURFACE_FX),
          edge:      filterId(parsed.edge,      LOOP_EDGE_FX),
          ambient:   filterId(parsed.ambient,   LOOP_AMBIENT_FX),
          intensity: filterId(parsed.intensity, INTENSITY_LEVELS),
          dynamics:  filterId(parsed.dynamics,  MOTION_DYNAMICS),
          duration:  filterId(parsed.duration,  TIME_DURATION),
        });
        setIncomingFromRender((s) => s ? { ...s, status: 'done', summary: parsed.summary } : null);
      } catch (e) {
        console.error('[MotionMatrix] 추천 분석 실패', e);
        setIncomingFromRender((s) => s ? { ...s, status: 'failed', errorMessage: e.message } : null);
      } finally { setIsArcAnalyzing(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload?.timestamp, payload?.target]);

  const [qaVideoSrc, setQaVideoSrc] = useState(null);
  const [qaVideoInfo, setQaVideoInfo] = useState({ width: 0, height: 0 });
  const [qaIsPlaying, setQaIsPlaying] = useState(false);
  const [qaIsLooping, setQaIsLooping] = useState(true);
  const [qaCurrentTime, setQaCurrentTime] = useState(0);
  const [qaDuration, setQaDuration] = useState(0);
  const [qaPlaybackRate, setQaPlaybackRate] = useState(1);
  const [qaBgType, setQaBgType] = useState('checker-dark');
  const [qaBgColor, setQaBgColor] = useState('#00FF00');
  const [qaBgImageSrc, setQaBgImageSrc] = useState(null);
  const [qaBlendMode, setQaBlendMode] = useState('screen');
  const [qaSettings, setQaSettings] = useState({ scale: 100, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [qaDragActiveVideo, setQaDragActiveVideo] = useState(false);
  const qaVideoRef = useRef(null);

  const currentMaxLimit = targetModel === 'kling' ? 2500 : (exportMode === 'lite_test' ? 1000 : 1200);

  const showToast = (msg) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(""), 3000);
  };

  const downloadBlackFrame = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1920; canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const link = document.createElement('a');
    link.download = 'kling_start_frame_black.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast("✅ 시작용 1080p 블랙 프레임이 다운로드되었습니다.");
  };

  useEffect(() => {
    let newSurf, newEdge, newAmb;
    if (animationMode === 'loop') { newSurf = LOOP_SURFACE_FX; newEdge = LOOP_EDGE_FX; newAmb = LOOP_AMBIENT_FX; }
    else if (animationMode === 'intro') { newSurf = INTRO_SURFACE_FX; newEdge = INTRO_EDGE_FX; newAmb = INTRO_AMBIENT_FX; }
    else { newSurf = TRANS_SURFACE_FX; newEdge = TRANS_EDGE_FX; newAmb = TRANS_AMBIENT_FX; }
    setSurfaceOptions(newSurf); setEdgeOptions(newEdge); setAmbientOptions(newAmb);
    setLayers(prev => ({
      ...prev,
      surface: newSurf.some(o => o.id === prev.surface) ? prev.surface : newSurf[0].id,
      edge: newEdge.some(o => o.id === prev.edge) ? prev.edge : newEdge[0].id,
      ambient: newAmb.some(o => o.id === prev.ambient) ? prev.ambient : newAmb[0].id,
    }));
  }, [animationMode]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      if (newWidth > 25 && newWidth < 75) setLeftPaneWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.userSelect = '';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleCopy = (text) => {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.top = '-9999px'; ta.style.left = '-9999px';
      document.body.appendChild(ta); ta.focus(); ta.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(ta);
      if (successful) showToast(`✅ 클립보드에 복사되었습니다!`);
      else showToast(`❌ 복사에 실패했습니다. 수동으로 복사해주세요.`);
    } catch (err) { showToast(`❌ 복사 중 오류가 발생했습니다.`); }
  };

  const handleReset = () => {
    setLayers({ surface: 'none', edge: 'none', ambient: 'none', intensity: 'subtle', duration: '5s', flow: 'contour_trace', intro: 'fade_in', dynamics: 'smooth' });
    setImage(null); setResultVideo(null); setAnalyzedFrames([]);
    setSurfaceOptions(LOOP_SURFACE_FX); setEdgeOptions(LOOP_EDGE_FX); setAmbientOptions(LOOP_AMBIENT_FX);
    setEvalChecks({ cameraMoved: false, shapeMutated: false, loopBroken: false, particlesEscaped: false, alphaDirty: false });
    setAiDetectedErrors(null); setTargetMaterial('ice'); setExportMode('production'); setAnimationMode('loop'); setVfxTarget('all'); setTargetModel('universal');
    setImportText(''); setIsImportOpen(false); setBaseValidatePrompt('');
    setDirectorNote(''); setAiInterpretation(''); setIsOptimized(true);
    setQaVideoSrc(null); setQaBgImageSrc(null); setQaBgType('checker-dark'); setQaBlendMode('screen');
    setQaSettings({ scale: 100, x: 0, y: 0 });
    showToast("초기화되었습니다.");
  };

  const applyPreset = (presetId) => {
    const preset = PRESETS.find(p => p.id === presetId);
    if (preset) { setLayers(preset.layers); setActivePreset(presetId); showToast(`✨ 프리셋 적용: ${preset.label}`); }
  };

  const handleTargetMaterialChange = (newTarget) => {
    setTargetMaterial(newTarget);
    const targetInfo = TRANSITION_TARGETS.find(t => t.id === newTarget);
    if (targetInfo && targetInfo.auto) {
      setLayers(prev => ({ ...prev, ...targetInfo.auto }));
      showToast(`✨ [${targetInfo.label}]에 최적화된 효과들이 자동 적용되었습니다.`);
    }
  };

  const handleImageChange = (file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setImage(e.target.result); reader.readAsDataURL(file);
      showToast("이미지가 로드되었습니다. AI 연출 해석을 실행해보세요.");
    } else if (file) showToast("❌ 이미지 파일만 업로드 가능합니다.");
  };

  const handleResultChange = (file) => {
    if (file && (file.type === 'video/mp4' || file.type === 'video/webm')) {
      handleResultVideoAnalysis(file);
    } else if (file) showToast("❌ 영상 파일(.mp4, .webm)만 업로드 가능합니다.");
  };

  const fetchWithRetry = async (url, options, retries = 3) => {
    const delays = [1000, 2000, 4000];
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url, options);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({})); throw new Error(errData.error?.message || `HTTP error ${res.status}`);
        }
        return await res.json();
      } catch (err) {
        if (i === retries - 1) throw err;
        await new Promise(resolve => setTimeout(resolve, delays[i]));
      }
    }
  };

  const handleImportPrompt = () => {
    if (!importText.trim()) return showToast("프롬프트를 입력해주세요.");
    const newLayers = { ...layers };
    const sMatch = surfaceOptions.find(opt => importText.includes(opt.en));
    if (sMatch) newLayers.surface = sMatch.id;
    const eMatch = edgeOptions.find(opt => importText.includes(opt.en));
    if (eMatch) newLayers.edge = eMatch.id;
    const aMatch = ambientOptions.find(opt => importText.includes(opt.en));
    if (aMatch) newLayers.ambient = aMatch.id;
    const fMatch = FLOW_STYLES.find(opt => importText.includes(opt.loop_en) || importText.includes(opt.trans_en));
    if (fMatch) newLayers.flow = fMatch.id;
    const iMatch = INTRO_STYLES.find(opt => importText.includes(opt.en));
    if (iMatch) newLayers.intro = iMatch.id;
    const dynMatch = MOTION_DYNAMICS.find(opt => importText.includes(opt.en));
    if (dynMatch) newLayers.dynamics = dynMatch.id;
    const intMatch = INTENSITY_LEVELS.find(opt => importText.includes(opt.en) || importText.includes(`(${opt.en})`));
    if (intMatch) newLayers.intensity = intMatch.id;
    const durMatch = TIME_DURATION.find(opt => importText.includes(`${opt.id} loop`) || importText.includes(`End (${opt.id})`));
    if (durMatch) newLayers.duration = durMatch.id;
    setLayers(newLayers); setActivePreset(''); setIsImportOpen(false); setImportText('');
    showToast("✅ 기존 설정이 성공적으로 복원되었습니다.");
  };

  const handleAiAnalysis = async (isSurpriseMode = false) => {
    if (!image && !directorNote.trim() && !isSurpriseMode) return showToast("이미지를 업로드하거나 연출 노트를 작성해주세요.");
    setIsAnalyzing(true);
    showToast(isSurpriseMode ? "🎲 마스터 디렉터가 이미지를 분석하여 최적의 세팅을 도출 중입니다..." : "AI Director가 연출 의도를 분석 중입니다...");
    try {
      const surfaceIds = surfaceOptions.map(o => o.id).join(', ');
      const edgeIds = edgeOptions.map(o => o.id).join(', ');
      const ambientIds = ambientOptions.map(o => o.id).join(', ');
      const flowIds = FLOW_STYLES.map(o => o.id).join(', ');
      const introIds = INTRO_STYLES.map(o => o.id).join(', ');
      const dynamicsIds = MOTION_DYNAMICS.map(o => o.id).join(', ');

      let promptText = `You are a world-class Hollywood Title Sequence Director. Current Animation Mode: ${animationMode}\n\n`;
      if (isSurpriseMode) promptText += `User Request: "SURPRISE ME. Analyze the image and select the best combination of effects."\n`;
      else if (directorNote.trim()) promptText += `User's Director Note: "${directorNote}"\n`;
      if (image) promptText += `Align your choices with the attached image.\n`;
      promptText += `Select the BEST motion effect ID. If none fit, create a NEW dynamic effect: {"id": "dynamic_...", "label": "Korean Label", "en": "English desc"}.\nExisting IDs: Surface [${surfaceIds}], Edge [${edgeIds}], Ambient [${ambientIds}], Flow [${flowIds}], Intro [${introIds}], Dynamics [${dynamicsIds}], Intensity [subtle, medium, intense]\nRespond ONLY with JSON: {"interpretation": "한국어 1~2줄", "surface": "id" or {obj}, "edge": "id" or {obj}, "ambient": "id" or {obj}, "intensity": "subtle|medium|intense", "flow": "id", "intro": "id", "dynamics": "id"}`;

      const parts = [{ text: promptText }];
      if (image) {
        const base64Data = image.split(',')[1];
        const mimeType = image.match(/data:(.*?);/)?.[1] || "image/png";
        parts.push({ inlineData: { mimeType, data: base64Data } });
      }

      const payload = { contents: [{ role: "user", parts }], generationConfig: { responseMimeType: "application/json", temperature: 0.7 } };
      const result = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("No response from API.");
      const analysisResult = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
      const newLayers = { ...layers };

      const processLayer = (layerName, currentOptions, setOptions, resultValue) => {
        if (typeof resultValue === 'string' && currentOptions.some(o => o.id === resultValue)) {
          newLayers[layerName] = resultValue;
        } else if (resultValue && typeof resultValue === 'object' && resultValue.id && resultValue.label && resultValue.en) {
          setOptions(prev => prev.some(o => o.id === resultValue.id) ? prev : [...prev, resultValue]);
          newLayers[layerName] = resultValue.id;
        }
      };

      processLayer('surface', surfaceOptions, setSurfaceOptions, analysisResult.surface);
      processLayer('edge', edgeOptions, setEdgeOptions, analysisResult.edge);
      processLayer('ambient', ambientOptions, setAmbientOptions, analysisResult.ambient);
      if (analysisResult.intensity) newLayers.intensity = analysisResult.intensity;
      if (animationMode !== 'intro' && analysisResult.flow) newLayers.flow = analysisResult.flow;
      if (animationMode === 'intro' && analysisResult.intro) newLayers.intro = analysisResult.intro;
      if (analysisResult.dynamics) newLayers.dynamics = analysisResult.dynamics;
      setLayers(newLayers); setActivePreset('');
      if (analysisResult.interpretation) setAiInterpretation(analysisResult.interpretation);
      showToast("✨ 마스터 AI 디렉팅이 완료되었습니다.");
    } catch (error) {
      showToast(`분석 중 오류가 발생했습니다: ${error.message}`);
    } finally { setIsAnalyzing(false); }
  };

  const handleResultVideoAnalysis = async (file) => {
    if (!file) return;
    setIsResultAnalyzing(true);
    const videoUrl = URL.createObjectURL(file);
    setResultVideo(videoUrl); setAnalyzedFrames([]); setAiDetectedErrors(null);
    showToast("영상을 정밀 분석 중입니다...");
    try {
      const extractFrames = (url) => new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.src = url; video.muted = true; video.playsInline = true; video.preload = 'metadata';
        video.onloadedmetadata = async () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth; canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          const frames = [];
          const captureFrame = (time, label) => new Promise((res, rej) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
              ctx.fillRect(10, 10, 480, 90);
              ctx.font = 'bold 50px sans-serif';
              ctx.fillStyle = 'white';
              ctx.fillText(label, 30, 70);
              res(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
            };
            video.addEventListener('seeked', onSeeked);
            video.addEventListener('error', rej);
            video.currentTime = time;
          });
          try {
            const dur = (video.duration && !isNaN(video.duration) && video.duration !== Infinity) ? video.duration : 5;
            frames.push(await captureFrame(0.0, "FRAME 1 (START)"));
            frames.push(await captureFrame(dur / 2, "FRAME 2 (MIDDLE)"));
            frames.push(await captureFrame(Math.max(0, dur - 0.05), "FRAME 3 (END)"));
            resolve(frames);
          } catch (e) { reject(e); }
        };
        video.onerror = () => reject(new Error("Failed to load video"));
      });

      const frames = await extractFrames(videoUrl);
      setAnalyzedFrames(frames.map(f => `data:image/jpeg;base64,${f}`));
      const prompt = `You are a strict Video QA Expert. Analyze the 3-frame sequence step-by-step. 1. Scale & Camera (cameraMoved). 2. Geometry (shapeMutated). 3. Loop (loopBroken: F1 must equal F3). 4. Particles (particlesEscaped). 5. Background (alphaDirty).`;
      const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }, ...frames.map(f => ({ inlineData: { mimeType: "image/jpeg", data: f } }))] }],
        generationConfig: {
          temperature: 0.0, responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              cameraMovedReasoning: { type: "STRING" }, cameraMoved: { type: "BOOLEAN" },
              shapeMutatedReasoning: { type: "STRING" }, shapeMutated: { type: "BOOLEAN" },
              loopBrokenReasoning: { type: "STRING" }, loopBroken: { type: "BOOLEAN" },
              particlesEscapedReasoning: { type: "STRING" }, particlesEscaped: { type: "BOOLEAN" },
              alphaDirtyReasoning: { type: "STRING" }, alphaDirty: { type: "BOOLEAN" }
            },
            required: ["cameraMovedReasoning", "cameraMoved", "shapeMutatedReasoning", "shapeMutated", "loopBrokenReasoning", "loopBroken", "particlesEscapedReasoning", "particlesEscaped", "alphaDirtyReasoning", "alphaDirty"]
          }
        }
      };
      const result = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("No response from API");
      const analysisResult = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
      setAiDetectedErrors({
        cameraMoved: !!analysisResult.cameraMoved, shapeMutated: !!analysisResult.shapeMutated,
        loopBroken: !!analysisResult.loopBroken, particlesEscaped: !!analysisResult.particlesEscaped,
        alphaDirty: !!analysisResult.alphaDirty,
        cameraMovedReasoning: analysisResult.cameraMovedReasoning,
        shapeMutatedReasoning: analysisResult.shapeMutatedReasoning,
        loopBrokenReasoning: analysisResult.loopBrokenReasoning,
        particlesEscapedReasoning: analysisResult.particlesEscapedReasoning,
        alphaDirtyReasoning: analysisResult.alphaDirtyReasoning
      });
      const errorCount = [analysisResult.cameraMoved, analysisResult.shapeMutated, analysisResult.loopBroken, analysisResult.particlesEscaped, analysisResult.alphaDirty].filter(Boolean).length;
      if (errorCount > 0) setAnalysisModal({ isOpen: true, results: analysisResult });
      else showToast(`✅ AI 검수 완료: 오류가 발견되지 않은 완벽한 영상입니다.`);
    } catch (err) {
      console.error(err);
      showToast("영상 분석 중 오류가 발생했습니다.");
    } finally { setIsResultAnalyzing(false); }
  };

  const processQaVideoFile = (file) => {
    if (file && file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setQaVideoSrc(url); setQaIsPlaying(true); setQaSettings({ scale: 100, x: 0, y: 0 });
    } else showToast("❌ 영상 파일만 업로드 가능합니다.");
  };
  const processQaBgImageFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setQaBgImageSrc(url); setQaBgType('image');
    } else showToast("❌ 이미지 파일만 업로드 가능합니다.");
  };
  const handleQaDropMain = (e) => {
    e.preventDefault(); e.stopPropagation();
    setQaDragActiveVideo(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.type.startsWith('video/')) processQaVideoFile(file);
    else if (file.type.startsWith('image/')) processQaBgImageFile(file);
  };
  const toggleQaPlay = () => {
    if (qaVideoRef.current) {
      if (qaIsPlaying) qaVideoRef.current.pause();
      else qaVideoRef.current.play();
      setQaIsPlaying(!qaIsPlaying);
    }
  };
  const handleQaTimeUpdate = () => { if (qaVideoRef.current) setQaCurrentTime(qaVideoRef.current.currentTime); };
  const handleQaLoadedMetadata = () => {
    if (qaVideoRef.current) {
      setQaDuration(qaVideoRef.current.duration);
      setQaVideoInfo({ width: qaVideoRef.current.videoWidth, height: qaVideoRef.current.videoHeight });
      qaVideoRef.current.playbackRate = qaPlaybackRate;
    }
  };
  const handleQaSeek = (e) => {
    const time = parseFloat(e.target.value);
    if (qaVideoRef.current) { qaVideoRef.current.currentTime = time; setQaCurrentTime(time); }
  };
  const handleQaSpeedChange = (e) => {
    const speed = parseFloat(e.target.value);
    setQaPlaybackRate(speed);
    if (qaVideoRef.current) qaVideoRef.current.playbackRate = speed;
  };
  const formatTime = (time) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${min}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };
  const getCanvasBackgroundStyle = () => {
    if (qaBgType === 'color') return { backgroundColor: qaBgColor };
    if (qaBgType === 'image' && qaBgImageSrc) return {
      backgroundImage: `url(${qaBgImageSrc})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat'
    };
    return {};
  };
  const handlePanStart = (e) => {
    setIsPanning(true);
    setPanStart({ x: e.clientX - qaSettings.x, y: e.clientY - qaSettings.y });
  };
  const handlePanMove = (e) => {
    if (!isPanning) return;
    setQaSettings(prev => ({ ...prev, x: e.clientX - panStart.x, y: e.clientY - panStart.y }));
  };
  const handlePanEnd = () => setIsPanning(false);

  const rawPromptData = compileRawPrompt(layers, exportMode, animationMode, targetMaterial, vfxTarget, targetModel, surfaceOptions, edgeOptions, ambientOptions);
  const { optimizedText, logs } = inspectAndOptimizePrompt(rawPromptData, targetModel);
  const activePrompt = isOptimized ? optimizedText : rawPromptData;

  let correctionsList = [];
  if (evalChecks.cameraMoved) correctionsList.push("[CAMERA OVERRIDE] FORCE 100% STATIC FRAMING. Zero zoom/dolly/drift. Fixed pixel dimensions and exact margins.");
  if (evalChecks.shapeMutated) correctionsList.push("Strict geometry lock. Zero melting/deformation. Preserve exact bounding box.");
  if (evalChecks.loopBroken && animationMode === 'loop') correctionsList.push("Force identical first/last frames. Zero popping. The return to dormant affects only light, never scale.");
  if (evalChecks.particlesEscaped) correctionsList.push("Confine particles to text radius. No outward expansion. Dissolve before frame edges.");
  if (evalChecks.alphaDirty) correctionsList.push("Pure #000000 background only. Zero scenery/smoke/wide glow.");

  const correctionsText = correctionsList.length > 0 ? `\n\n[CRITICAL CORRECTIONS]\n${correctionsList.join("\n")}` : "";
  const validatedPromptResult = baseValidatePrompt.trim()
    ? `${baseValidatePrompt.trim()}${correctionsText}`
    : correctionsText.trim();

  const finalOutput = activeTab === 'generate' ? activePrompt : validatedPromptResult;
  const activeNegPrompt = compileNegativePrompt(layers, exportMode, animationMode, targetModel, surfaceOptions, edgeOptions, ambientOptions);

  let combinedOutput = "";
  if (activeTab === 'generate') {
    combinedOutput = `${activePrompt}\n\nNegative prompt:\n${activeNegPrompt}`;
  } else if (activeTab === 'validate') {
    const hasNegative = baseValidatePrompt.toLowerCase().includes("negative prompt");
    combinedOutput = hasNegative
      ? validatedPromptResult
      : `${validatedPromptResult}\n\nNegative prompt:\n${activeNegPrompt}`;
  }

  const promptLength = combinedOutput ? combinedOutput.length : 0;
  const isOverLimit = promptLength > currentMaxLimit;

  return (
    <div className="flex flex-col h-screen w-full bg-[#0f1115] text-[#e3e3e3] overflow-hidden relative selection:bg-[#a8c7fa]/30" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Space+Grotesk:wght@700&display=swap');
          .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #2b2d31; border-radius: 3px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4b4d52; }
          @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fade-in-down { animation: fadeInDown 0.2s ease-out forwards; }
          .bg-checker-dark {
            background-image: linear-gradient(45deg, #181a1f 25%, transparent 25%), linear-gradient(-45deg, #181a1f 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #181a1f 75%), linear-gradient(-45deg, transparent 75%, #181a1f 75%);
            background-color: #0f1115; background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
          }
          .bg-checker-light {
            background-image: linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%);
            background-color: #eee; background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
          }
        `}
      </style>

      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#181a1f] text-[#e3e3e3] px-5 py-2.5 rounded-full shadow-2xl font-medium text-[11px] border border-[#2b2d31] transition-all duration-300 animate-fade-in-down flex items-center gap-2">
          {toastMsg}
        </div>
      )}

      {analysisModal.isOpen && (
        <div className="fixed inset-0 z-[100] bg-[#0f1115]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181a1f] border border-[#2b2d31] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-down">
             <div className="bg-[#2b2d31]/30 px-5 py-3.5 border-b border-[#2b2d31]">
               <h3 className="text-[12px] font-bold text-[#e3e3e3] flex items-center gap-2">
                 <svg className="w-4 h-4 text-[#a8c7fa]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                 AI 영상 검수 리포트
               </h3>
             </div>
             <div className="p-5 flex flex-col gap-4">
                <p className="text-[11px] text-[#9ca3af] leading-relaxed">
                  영상 분석 결과 아래 오류가 감지되었습니다. <b>현재 우측 원본 프롬프트</b>에 보정 지시어를 추가하시겠습니까?
                </p>
                <div className="flex flex-col gap-2 bg-[#0f1115] p-3.5 rounded-xl border border-[#2b2d31]">
                  {['cameraMoved', 'shapeMutated', 'loopBroken', 'particlesEscaped', 'alphaDirty'].map(key => {
                    if (!analysisModal.results[key]) return null;
                    if (key === 'loopBroken' && animationMode !== 'loop') return null;
                    const labels = {
                      cameraMoved: "카메라 줌 아웃 / 이동 감지됨",
                      shapeMutated: "타이포 형태 변형 및 왜곡 감지됨",
                      loopBroken: "루프 깨짐 / 끝부분 뚝 끊김 감지됨",
                      particlesEscaped: "입자의 프레임 외곽 이탈 감지됨",
                      alphaDirty: "배경 오염 감지됨"
                    };
                    return (
                      <div key={key} className="flex flex-col gap-1 mb-1.5 last:mb-0">
                        <span className="text-[11px] text-[#e3e3e3] flex items-center gap-2 font-medium">
                          <span className="w-1.5 h-1.5 bg-[#f28b82] rounded-full"></span> {labels[key]}
                        </span>
                        <span className="text-[10px] text-[#9ca3af] pl-3.5 leading-relaxed bg-[#181a1f] p-1.5 rounded border border-[#2b2d31]">
                          <span className="font-bold text-[#8e918f]">AI 분석:</span> {analysisModal.results[`${key}Reasoning`]}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2.5 mt-2">
                  <button onClick={() => setAnalysisModal({ isOpen: false, results: null })} className="flex-1 py-2 rounded-lg bg-[#0f1115] hover:bg-[#2b2d31] text-[#9ca3af] hover:text-[#e3e3e3] text-[11px] font-medium transition-colors border border-[#2b2d31]">
                    취소 (무시)
                  </button>
                  <button onClick={() => {
                    setEvalChecks(prev => ({
                      cameraMoved: prev.cameraMoved || analysisModal.results.cameraMoved,
                      shapeMutated: prev.shapeMutated || analysisModal.results.shapeMutated,
                      loopBroken: prev.loopBroken || analysisModal.results.loopBroken,
                      particlesEscaped: prev.particlesEscaped || analysisModal.results.particlesEscaped,
                      alphaDirty: prev.alphaDirty || analysisModal.results.alphaDirty
                    }));
                    setAnalysisModal({ isOpen: false, results: null });
                    showToast("보정 프롬프트가 설정에 반영되었습니다.");
                  }} className="flex-1 py-2 rounded-lg bg-[#a8c7fa] hover:bg-[#c2d7fa] text-[#062e6f] text-[11px] font-semibold transition-colors">
                    보정 프롬프트 자동 적용
                  </button>
                </div>
             </div>
          </div>
        </div>
      )}

      <header className="h-14 border-b border-[#2b2d31] bg-[#181a1f] flex items-center justify-between px-5 shrink-0 z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded flex items-center justify-center text-[#a8c7fa]">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
            </div>
            <span className="app-title text-2xl tracking-wide flex items-baseline gap-1.5 text-white">
              <span className="font-light">Motion</span> <span className="font-semibold">Metrics</span>
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('generate')} className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-colors ${activeTab === 'generate' ? 'bg-[#a8c7fa]/10 text-[#a8c7fa] border border-[#a8c7fa]/30' : 'text-[#9ca3af] hover:bg-[#2b2d31] hover:text-[#e3e3e3] border border-transparent'}`}>
              프롬프트 생성 모드
            </button>
            <button onClick={() => setActiveTab('validate')} className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-colors ${activeTab === 'validate' ? 'bg-[#a8c7fa]/10 text-[#a8c7fa] border border-[#a8c7fa]/30' : 'text-[#9ca3af] hover:bg-[#2b2d31] hover:text-[#e3e3e3] border border-transparent'}`}>
              영상 검수 및 보정 모드
            </button>
            <button onClick={() => setActiveTab('compositing')} className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-colors flex items-center gap-1.5 ${activeTab === 'compositing' ? 'bg-[#0F82FF]/10 text-[#0F82FF] border border-[#0F82FF]/30' : 'text-[#9ca3af] hover:bg-[#2b2d31] hover:text-[#e3e3e3] border border-transparent'}`}>
              <MonitorIcon /> 영상 합성 테스트
            </button>
          </div>
        </div>
        <button onClick={handleReset} className="text-[11px] font-medium text-[#9ca3af] hover:text-[#e3e3e3] px-2.5 py-1.5 rounded hover:bg-[#2b2d31]/50 transition-colors">
          Reset Workspace
        </button>
      </header>

      <div ref={containerRef} className="flex-1 flex overflow-hidden">

        <div style={{ width: `${leftPaneWidth}%` }} className="h-full flex flex-col bg-[#0f1115]">
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 custom-scrollbar">
            {incomingFromRender && (
              <div className="bg-amber-500/10 border border-amber-400/40 rounded-xl p-3.5 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 z-[80]">
                <svg className={`w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5 ${isArcAnalyzing ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {isArcAnalyzing
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-6.219-8.56"/>
                    : <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L23 12l-5.714 2.143L15 21l-2.286-6.857L7 12l5.714-2.143L15 3z"/>}
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-amber-300 tracking-wider uppercase">렌더 메트릭스에서 전달된 프롬프트</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5 leading-snug">
                    {incomingFromRender.status === 'analyzing' && 'Gemini로 모션 추천 분석 중...'}
                    {incomingFromRender.status === 'done' && (incomingFromRender.summary || '분석 완료. 아래 패널에 ★로 추천 모션이 강조 표시됩니다.')}
                    {incomingFromRender.status === 'no-text' && '프롬프트 텍스트가 비어있어서 추천을 건너뜁니다.'}
                    {incomingFromRender.status === 'failed' && `분석 실패: ${incomingFromRender.errorMessage || ''}`}
                  </div>
                  {incomingFromRender.style && (
                    <div className="mt-1.5 text-[9px] text-zinc-500 font-mono">style: {incomingFromRender.style}</div>
                  )}
                  {incomingFromRender.text && (
                    <details className="mt-1.5 text-[9px]">
                      <summary className="text-amber-400 cursor-pointer hover:text-amber-300">전달된 프롬프트 보기</summary>
                      <pre className="mt-1.5 p-2 bg-black/40 rounded text-[9px] text-zinc-400 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto custom-scrollbar">{incomingFromRender.text}</pre>
                    </details>
                  )}
                </div>
                <button onClick={() => { setIncomingFromRender(null); setArcRecommended(null); }} className="text-zinc-500 hover:text-zinc-300 shrink-0" title="배지 닫기">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            )}
            {activeTab === 'generate' ? (
              <>
                <div className="bg-[#181a1f] border border-[#2b2d31] rounded-xl p-4 flex flex-col gap-3 relative z-[70]">
                  <h3 className="text-[11px] font-bold text-[#a8c7fa] tracking-wide flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                    Target AI Model (출력 모델 최적화)
                  </h3>
                  <DropdownControl label="" value={targetModel} options={TARGET_MODELS} onChange={setTargetModel} highlight={true} />
                </div>

                <div className="bg-[#181a1f] border border-[#2b2d31] rounded-xl p-4 flex flex-col gap-3 relative z-[60]">
                  <h3 className="text-[11px] font-bold text-[#e3e3e3] tracking-wide">Animation Mode (진행 방식)</h3>
                  <div className="flex bg-[#0f1115] rounded-lg p-1 border border-[#2b2d31]">
                    <button onClick={() => setAnimationMode('loop')} className={`flex-1 px-2 py-2 text-[11px] font-bold rounded transition-colors ${animationMode === 'loop' ? 'bg-[#2b2d31] text-[#e3e3e3]' : 'text-[#9ca3af] hover:text-[#e3e3e3]'}`}>🔄 무한 반복 (Loop)</button>
                    <button onClick={() => setAnimationMode('intro')} className={`flex-1 px-2 py-2 text-[11px] font-bold rounded transition-colors ${animationMode === 'intro' ? 'bg-[#a8c7fa]/20 text-[#a8c7fa]' : 'text-[#9ca3af] hover:text-[#e3e3e3]'}`}>✨ 등장 모션 (Intro)</button>
                    <button onClick={() => setAnimationMode('transition')} className={`flex-1 px-2 py-2 text-[11px] font-bold rounded transition-colors ${animationMode === 'transition' ? 'bg-[#a8c7fa]/20 text-[#a8c7fa]' : 'text-[#9ca3af] hover:text-[#e3e3e3]'}`}>➡️ 재질 변환 (Trans)</button>
                  </div>
                  {animationMode === 'transition' && (
                    <div className="pt-3 mt-1 border-t border-[#2b2d31] animate-fade-in-down flex flex-col gap-3">
                       <DropdownControl label="Target Material (목표 재질)" value={targetMaterial} options={TRANSITION_TARGETS} onChange={handleTargetMaterialChange} highlight={true} />
                       <p className="text-[9.5px] text-[#8e918f] mt-1 leading-relaxed">※ 재질 선택 시 최적 효과가 자동 매칭됩니다.</p>
                    </div>
                  )}
                  {animationMode === 'intro' && (
                    <div className="pt-3 mt-1 border-t border-[#2b2d31] animate-fade-in-down flex flex-col gap-3">
                       <DropdownControl label="Intro Style (등장 연출)" value={layers.intro} options={INTRO_STYLES} onChange={(val) => {setLayers({...layers, intro: val}); setActivePreset('');}} highlight={true} />
                       {targetModel === 'kling' && (
                         <div className="bg-[#f28b82]/10 border border-[#f28b82]/30 p-2.5 rounded-lg flex flex-col gap-2 mt-1">
                           <span className="text-[10px] font-bold text-[#f28b82]">🚨 Kling 3.0 Intro 가이드</span>
                           <span className="text-[9.5px] text-[#e3e3e3] leading-relaxed">Start Image에 빈 검은 화면, End Image에 원본 이미지를 넣어야 합니다.</span>
                           <button onClick={downloadBlackFrame} className="w-full py-1.5 mt-1 bg-[#181a1f] border border-[#f28b82]/50 hover:bg-[#f28b82]/20 text-[#f28b82] text-[10px] font-bold rounded">
                             시작용 1080p 블랙 프레임 다운로드
                           </button>
                         </div>
                       )}
                    </div>
                  )}
                </div>

                {animationMode === 'loop' && (
                  <div className="bg-[#181a1f] border border-[#2b2d31] rounded-xl p-4 relative z-[50]">
                     <h3 className="text-[10px] font-medium text-[#9ca3af] tracking-wider uppercase mb-3 flex items-center justify-between">
                       Production Presets
                       <button onClick={() => setIsImportOpen(!isImportOpen)} className="text-[#a8c7fa] flex items-center gap-1 hover:text-[#c2d7fa] transition-colors">Import</button>
                     </h3>
                     <div className="flex flex-wrap gap-2">
                       {PRESETS.map(p => (
                         <button key={p.id} onClick={() => applyPreset(p.id)} className={`px-3 py-1.5 rounded-full text-[10px] font-medium transition-colors border ${activePreset === p.id ? 'bg-[#a8c7fa]/10 border-[#a8c7fa]/50 text-[#a8c7fa]' : 'bg-[#0f1115] border-[#2b2d31] text-[#e3e3e3] hover:bg-[#2b2d31]'}`}>{p.label}</button>
                       ))}
                     </div>
                     {isImportOpen && (
                       <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-[#2b2d31] animate-fade-in-down w-full box-border">
                         <textarea className="w-full bg-[#0f1115] border border-[#2b2d31] rounded-lg p-3 text-[11px] text-[#e3e3e3] outline-none focus:border-[#a8c7fa] resize-y custom-scrollbar min-h-[60px]" placeholder="이전 프롬프트를 붙여넣어 설정을 복원하세요." value={importText} onChange={(e) => setImportText(e.target.value)} />
                         <button onClick={handleImportPrompt} className="w-full py-2 bg-[#2b2d31] hover:bg-[#3f4145] text-[#e3e3e3] rounded-lg text-[11px] font-medium transition-colors">설정 복원하기</button>
                       </div>
                     )}
                  </div>
                )}

                <div className="bg-[#181a1f] border border-[#2b2d31] rounded-xl p-5 flex flex-col gap-4 relative z-[40]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-bold text-[#e3e3e3] tracking-wide">AI Director's Note</h3>
                    <button onClick={() => handleAiAnalysis(true)} disabled={!image || isAnalyzing} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 ${!image ? 'bg-[#0f1115] text-[#4b4d52] border border-[#2b2d31] cursor-not-allowed' : 'bg-gradient-to-r from-[#0F82FF]/20 to-[#a8c7fa]/20 border border-[#0F82FF]/50 text-[#a8c7fa] hover:from-[#0F82FF]/30 hover:to-[#a8c7fa]/30'}`}>
                      🎲 전문가 픽 (Surprise Me)
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 mt-1">
                    <div className="text-[10px] font-medium text-[#9ca3af]">1. 레퍼런스 이미지 (선택)</div>
                    <div className={`relative border border-dashed rounded-xl transition-all aspect-video flex flex-col items-center justify-center overflow-hidden ${image ? 'border-[#2b2d31] bg-[#181a1f]' : isImageDragging ? 'border-[#a8c7fa] bg-[#a8c7fa]/5' : 'border-[#2b2d31] hover:border-[#6b7280] hover:bg-[#181a1f] cursor-pointer'}`}
                      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsImageDragging(true); }}
                      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsImageDragging(false); }}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setIsImageDragging(false); handleImageChange(e.dataTransfer.files[0]); }}
                      onClick={() => !image && fileInputRef.current.click()}
                    >
                      {image ? (
                        <div className="relative group w-full h-full flex items-center justify-center p-2">
                          <img src={image} alt="Upload preview" className="max-w-full max-h-full object-contain rounded-lg shadow-md" />
                          <div className="absolute inset-0 bg-[#0f1115]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-sm" onClick={() => fileInputRef.current.click()}>
                            <span className="bg-[#2b2d31] px-3 py-1.5 rounded-full text-[11px] font-medium text-[#e3e3e3] border border-[#4b4d52]">Change Image</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-[#9ca3af]">
                          <div className="w-10 h-10 bg-[#0f1115] border border-[#2b2d31] rounded-full flex items-center justify-center mb-2.5">
                            <svg className="h-4 w-4 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                          </div>
                          <p className="text-[11px] font-medium text-[#e3e3e3] mb-1">타이포 이미지를 드래그하세요</p>
                          <p className="text-[9px] text-[#6b7280] max-w-[80%] text-center leading-relaxed">⚠️ 텍스트 주변에 최소 25% 이상의 검정 여백이 필요합니다.</p>
                        </div>
                      )}
                      <input type="file" ref={fileInputRef} onChange={(e) => handleImageChange(e.target.files[0])} accept="image/*" className="hidden" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="text-[10px] font-medium text-[#9ca3af] flex justify-between">
                      <span>2. 연출 요구사항 (선택)</span>
                      {directorNote && <button onClick={() => {setDirectorNote(''); setAiInterpretation('');}} className="text-[#a8c7fa] hover:text-[#c2d7fa]">지우기</button>}
                    </div>
                    <textarea value={directorNote} onChange={(e) => setDirectorNote(e.target.value)} placeholder="ex) 사이버펑크 느낌으로 네온사인이 번쩍이면서 노이즈가 끼게 해줘." className="w-full bg-[#0f1115] border border-[#2b2d31] rounded-lg p-3 text-[11px] text-[#e3e3e3] outline-none focus:border-[#a8c7fa] resize-y custom-scrollbar min-h-[70px] placeholder:text-[#6b7280]" />
                  </div>
                  <button onClick={() => handleAiAnalysis(false)} disabled={(!image && !directorNote.trim()) || isAnalyzing} className={`w-full py-3 px-4 rounded-xl text-[11px] font-bold transition-colors flex items-center justify-center gap-2 mt-1 ${(!image && !directorNote.trim()) ? 'bg-[#181a1f] text-[#6b7280] cursor-not-allowed border border-[#2b2d31]' : isAnalyzing ? 'bg-[#2b2d31] text-[#e3e3e3] cursor-wait' : 'bg-[#a8c7fa] hover:bg-[#c2d7fa] text-[#062e6f]'}`}>
                    {isAnalyzing ? "AI Director가 셋업 중입니다..." : "✨ AI 연출 해석 및 자동 세팅 (Gemini)"}
                  </button>
                  {aiInterpretation && (
                    <div className="mt-1 p-3.5 bg-[#a8c7fa]/10 border border-[#a8c7fa]/30 rounded-xl animate-fade-in-down">
                       <div className="text-[10px] font-bold text-[#a8c7fa] mb-1.5">🤖 AI Director's Feedback:</div>
                       <div className="text-[11px] text-[#e3e3e3] leading-relaxed break-keep">{aiInterpretation}</div>
                    </div>
                  )}
                </div>

                <div className="bg-[#181a1f] border border-[#2b2d31] rounded-xl p-5 flex flex-col gap-5 relative z-[30] mb-10">
                  <div className="flex flex-col gap-3">
                    <h3 className="text-[11px] font-medium text-[#e3e3e3]">Flow & Rhythm</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {animationMode === 'intro'
                        ? <DropdownControl label="Intro Style" value={layers.intro} options={INTRO_STYLES} onChange={(val) => {setLayers({...layers, intro: val}); setActivePreset('');}} />
                        : <DropdownControl label="Flow Style" value={layers.flow} options={FLOW_STYLES} onChange={(val) => {setLayers({...layers, flow: val}); setActivePreset('');}} />
                      }
                      <DropdownControl label="Dynamics" value={layers.dynamics} options={MOTION_DYNAMICS} onChange={(val) => {setLayers({...layers, dynamics: val}); setActivePreset('');}} recommendedId={arcRecommended?.dynamics} />
                    </div>
                  </div>
                  <div className="h-px bg-[#2b2d31] w-full"></div>
                  <div className="flex flex-col gap-3">
                     <h3 className="text-[11px] font-medium text-[#e3e3e3]">Visual Matrix Layers</h3>
                    <div className="space-y-3">
                      <DropdownControl label="Surface" value={layers.surface} options={surfaceOptions} onChange={(val) => {setLayers({...layers, surface: val}); setActivePreset('');}} recommendedId={arcRecommended?.surface} />
                      <DropdownControl label="Edge" value={layers.edge} options={edgeOptions} onChange={(val) => {setLayers({...layers, edge: val}); setActivePreset('');}} recommendedId={arcRecommended?.edge} />
                      <DropdownControl label="Ambient" value={layers.ambient} options={ambientOptions} onChange={(val) => {setLayers({...layers, ambient: val}); setActivePreset('');}} recommendedId={arcRecommended?.ambient} />
                      <div className="grid grid-cols-2 gap-3 pt-3 mt-1 border-t border-[#2b2d31]">
                        <DropdownControl label="Duration" value={layers.duration} options={TIME_DURATION} onChange={(val) => {setLayers({...layers, duration: val}); setActivePreset('');}} recommendedId={arcRecommended?.duration} />
                        <DropdownControl label="Intensity" value={layers.intensity} options={INTENSITY_LEVELS} onChange={(val) => {setLayers({...layers, intensity: val}); setActivePreset('');}} recommendedId={arcRecommended?.intensity} />
                      </div>
                      {exportMode === 'vfx_pass' && (
                        <div className="pt-3 mt-1 border-t border-[#2b2d31] animate-fade-in-down flex flex-col gap-3">
                           <DropdownControl label="VFX Render Target" value={vfxTarget} options={VFX_TARGETS} onChange={setVfxTarget} highlight={true} />
                           <div className="bg-[#f28b82]/10 border border-[#f28b82]/30 p-2.5 rounded-lg flex flex-col gap-1.5 mt-1">
                             <span className="text-[10px] font-bold text-[#f28b82]">🚨 완벽한 추출 팁</span>
                             <span className="text-[9.5px] text-[#e3e3e3] leading-relaxed">텍스처 있는 원본 대신 흑백 실루엣 이미지(Matte)를 업로드하세요.</span>
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : activeTab === 'validate' ? (
              <div className="flex flex-col gap-5">
                <div className="bg-[#181a1f] border border-[#2b2d31] rounded-xl overflow-hidden flex flex-col">
                  <div className="bg-[#2b2d31]/20 px-5 py-3 border-b border-[#2b2d31] flex justify-between items-center">
                    <span className="text-[11px] font-bold text-[#e3e3e3] tracking-wide">생성된 영상 업로드</span>
                    <button onClick={() => {setEvalChecks({cameraMoved: false, shapeMutated: false, loopBroken: false, particlesEscaped: false, alphaDirty: false}); setAiDetectedErrors(null); setResultVideo(null); setAnalyzedFrames([]);}} className="text-[10px] text-[#a8c7fa] hover:text-[#e3e3e3] transition-colors">업로드 초기화</button>
                  </div>
                  <div className="p-5 flex flex-col gap-4">
                    <p className="text-[11px] text-[#9ca3af] leading-relaxed">AI 영상 모델 결과물(.mp4)을 업로드하면 핵심 프레임을 추출하여 오류를 시각적으로 감지합니다.</p>
                    <div className={`relative w-full aspect-video max-h-64 rounded-lg border border-dashed flex flex-col items-center justify-center overflow-hidden transition-colors ${isResultDragging ? 'border-[#a8c7fa] bg-[#a8c7fa]/5' : resultVideo ? 'border-[#2b2d31] bg-black' : 'border-[#444746] hover:border-[#8e918f] bg-[#0f1115] cursor-pointer'}`}
                      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsResultDragging(true); }}
                      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsResultDragging(false); }}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setIsResultDragging(false); handleResultChange(e.dataTransfer.files[0]); }}
                      onClick={() => { if (!resultVideo && !isResultAnalyzing) resultVideoRef.current.click(); }}
                    >
                      {resultVideo ? (
                        <div className="relative w-full h-full group flex flex-col">
                          <video src={resultVideo} className="w-full h-full object-contain bg-black rounded-lg" controls autoPlay loop muted playsInline />
                          <button onClick={(e) => { e.stopPropagation(); resultVideoRef.current.click(); }} className="absolute top-2 right-2 bg-[#1e1e1f]/80 text-[#e3e3e3] px-2.5 py-1.5 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm border border-[#444746] font-medium shadow-md">다른 영상 업로드</button>
                        </div>
                      ) : (
                        <>
                          <svg className="w-6 h-6 text-[#6b7280] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                          <span className="text-[11px] font-medium text-[#e3e3e3]">클릭하거나 영상을 드래그하세요</span>
                        </>
                      )}
                      {isResultAnalyzing && (
                        <div className="absolute inset-0 bg-[#0f1115]/80 flex flex-col items-center justify-center backdrop-blur-sm z-10 gap-2">
                          <svg className="animate-spin w-5 h-5 text-[#a8c7fa]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          <span className="text-[10px] text-[#a8c7fa]">AI 영상 프레임 추출 및 추론 중...</span>
                        </div>
                      )}
                      <input type="file" accept="video/mp4,video/webm" className="hidden" ref={resultVideoRef} onChange={(e) => handleResultChange(e.target.files[0])} />
                    </div>
                    {analyzedFrames.length > 0 && (
                      <div className="flex gap-2">
                        {analyzedFrames.map((src, i) => (
                          <div key={i} className="flex-1 aspect-video rounded-md relative overflow-hidden border border-[#2b2d31] bg-[#0f1115]">
                            <span className="absolute top-1 left-1 bg-[#181a1f]/80 px-1.5 py-0.5 text-[9px] text-[#e3e3e3] rounded font-medium backdrop-blur-md z-10 border border-[#2b2d31]/50">{['Start', 'Mid', 'End'][i]}</span>
                            <img src={src} className="w-full h-full object-cover opacity-80" alt={`frame ${i}`} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-[#181a1f] border border-[#2b2d31] rounded-xl p-5 mb-10">
                   <h3 className="text-[11px] font-bold text-[#e3e3e3] tracking-wide mb-4">매뉴얼 검수 및 보정 적용</h3>
                   <div className="flex flex-col gap-3">
                     {[
                       { id: 'cameraMoved', label: '카메라 줌 아웃 / 무빙 발생' },
                       { id: 'shapeMutated', label: '타이포 형태가 녹거나 변형됨' },
                       { id: 'loopBroken', label: '루프 마지막에 부자연스럽게 끊김' },
                       { id: 'particlesEscaped', label: '입자가 프레임을 벗어남' },
                       { id: 'alphaDirty', label: '배경에 연기 등 불순물 발생' }
                     ].map(item => (
                       <div key={item.id} className="flex items-center gap-3 cursor-pointer group w-full" onClick={() => setEvalChecks(prev => ({...prev, [item.id]: !prev[item.id]}))}>
                         <div className={`w-4 h-4 rounded-[3px] border flex items-center justify-center transition-colors shrink-0 ${evalChecks[item.id] ? 'bg-[#a8c7fa] border-[#a8c7fa] text-[#062e6f]' : 'border-[#6b7280] group-hover:border-[#9ca3af] bg-[#0f1115]'}`}>
                           {evalChecks[item.id] && <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>}
                         </div>
                         <span className={`text-[12px] truncate ${evalChecks[item.id] ? 'text-[#e3e3e3] font-medium' : 'text-[#9ca3af] group-hover:text-[#e3e3e3]'} ${item.id === 'loopBroken' && animationMode !== 'loop' ? 'line-through text-[#6b7280]' : ''}`}>
                           {item.label} {item.id === 'loopBroken' && animationMode !== 'loop' && "(루프 모드 전용)"}
                         </span>
                         {aiDetectedErrors && aiDetectedErrors[item.id] && animationMode === 'loop' && (
                           <span className="ml-auto text-[9px] font-bold bg-[#f28b82]/10 text-[#f28b82] px-1.5 py-0.5 rounded border border-[#f28b82]/20 flex items-center gap-1 shrink-0 animate-fade-in-down">
                             <span className="w-1.5 h-1.5 bg-[#f28b82] rounded-full animate-pulse"></span> AI 감지됨
                           </span>
                         )}
                       </div>
                     ))}
                   </div>
                   <p className="text-[10px] text-[#6b7280] mt-4 pt-3 border-t border-[#2b2d31]">※ 체크 시 우측 원본 프롬프트 하단에 방어 코드가 자동 병합됩니다.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-5 pb-10">
                <div className="bg-[#181a1f] border border-[#2b2d31] rounded-xl p-5 flex flex-col gap-4">
                  <h3 className="text-[11px] font-bold text-[#e3e3e3] tracking-wide flex items-center gap-2"><MonitorIcon /> 검수할 영상 (VFX Pass 등)</h3>
                  <label className={`flex flex-col items-center justify-center w-full py-8 px-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${qaDragActiveVideo ? 'border-[#0F82FF] bg-[#0F82FF]/10' : 'border-[#2b2d31] hover:border-[#4b4d52] hover:bg-[#2b2d31]/30'}`}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setQaDragActiveVideo(true); }}
                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setQaDragActiveVideo(false); }}
                    onDrop={handleQaDropMain}
                  >
                    <div className={`transition-transform duration-200 ${qaDragActiveVideo ? 'scale-110 text-[#0F82FF]' : 'text-[#6b7280]'}`}><UploadIcon /></div>
                    <span className="mt-3 text-[11px] text-[#e3e3e3] font-medium">{qaVideoSrc ? '다른 영상 불러오기' : '합성할 영상을 드래그 앤 드롭'}</span>
                    <span className="mt-1 text-[10px] text-[#9ca3af]">알파 포함 WebM/MOV 또는 검은 배경 MP4</span>
                    <input type="file" accept="video/webm, video/quicktime, video/mp4" className="hidden" onChange={(e) => processQaVideoFile(e.target.files[0])} />
                  </label>
                  {qaVideoSrc && (
                    <div className="bg-[#0f1115] border border-[#2b2d31] rounded-lg p-3 text-[10px] text-[#9ca3af] grid grid-cols-2 gap-2">
                      <div>해상도: <span className="text-[#e3e3e3] font-mono">{qaVideoInfo.width}x{qaVideoInfo.height}</span></div>
                      <div>총 길이: <span className="text-[#e3e3e3] font-mono">{qaDuration.toFixed(2)}s</span></div>
                    </div>
                  )}
                </div>
                <div className="bg-[#181a1f] border border-[#2b2d31] rounded-xl p-5 flex flex-col gap-4">
                  <h3 className="text-[11px] font-bold text-[#e3e3e3] tracking-wide">배경 환경 세팅</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setQaBgType('checker-dark')} className={`py-2 text-[11px] rounded-lg border transition-colors ${qaBgType === 'checker-dark' ? 'border-[#0F82FF] bg-[#0F82FF]/10 text-[#0F82FF]' : 'border-[#2b2d31] bg-[#0f1115] text-[#9ca3af] hover:text-[#e3e3e3]'}`}>다크 체커보드</button>
                    <button onClick={() => setQaBgType('checker-light')} className={`py-2 text-[11px] rounded-lg border transition-colors ${qaBgType === 'checker-light' ? 'border-[#0F82FF] bg-[#0F82FF]/10 text-[#0F82FF]' : 'border-[#2b2d31] bg-[#0f1115] text-[#9ca3af] hover:text-[#e3e3e3]'}`}>라이트 체커보드</button>
                  </div>
                  <div className="space-y-2 mt-2">
                    <span className="text-[10px] text-[#9ca3af]">단색 크로마키 배경</span>
                    <div className="flex space-x-2">
                      {[{ color: '#000000', label: 'Black' }, { color: '#FFFFFF', label: 'White' }, { color: '#00FF00', label: 'Green' }, { color: '#FF00FF', label: 'Magenta' }].map(swatch => (
                        <button key={swatch.color} onClick={() => { setQaBgType('color'); setQaBgColor(swatch.color); }} className={`w-8 h-8 rounded-full border-2 transition-transform ${qaBgType === 'color' && qaBgColor === swatch.color ? 'border-[#0F82FF] scale-110' : 'border-[#4b4d52] hover:scale-105'}`} style={{ backgroundColor: swatch.color }} title={swatch.label} />
                      ))}
                      <div className="relative">
                        <input type="color" value={qaBgColor} onChange={(e) => { setQaBgType('color'); setQaBgColor(e.target.value); }} className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" title="커스텀 색상" />
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] transition-transform ${qaBgType === 'color' && !['#000000','#FFFFFF','#00FF00','#FF00FF'].includes(qaBgColor) ? 'border-[#0F82FF] scale-110' : 'border-[#4b4d52] hover:scale-105'}`} style={{ backgroundColor: qaBgColor }}>
                          <span className="mix-blend-difference text-white">+</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 mt-2">
                     <span className="text-[10px] text-[#9ca3af]">실제 이미지 위에 합성</span>
                     <label className={`block text-center py-2.5 px-3 border border-[#2b2d31] rounded-lg text-[11px] cursor-pointer hover:border-[#4b4d52] transition-colors ${qaBgType === 'image' ? 'border-[#0F82FF] text-[#0F82FF] bg-[#0F82FF]/5' : 'bg-[#0f1115] text-[#e3e3e3]'}`}>
                        {qaBgImageSrc ? '배경 이미지 변경' : '배경 이미지 업로드'}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => processQaBgImageFile(e.target.files[0])} />
                     </label>
                  </div>
                </div>
                <div className="bg-[#181a1f] border border-[#2b2d31] rounded-xl p-5 flex flex-col gap-4">
                  <h3 className="text-[11px] font-bold text-[#e3e3e3] tracking-wide">블렌딩 모드</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setQaBlendMode('normal')} className={`py-2 text-[11px] rounded-lg border transition-colors ${qaBlendMode === 'normal' ? 'border-[#0F82FF] bg-[#0F82FF]/10 text-[#0F82FF]' : 'border-[#2b2d31] bg-[#0f1115] text-[#9ca3af] hover:text-[#e3e3e3]'}`}>Normal (알파)</button>
                    <button onClick={() => setQaBlendMode('screen')} className={`py-2 text-[11px] rounded-lg border transition-colors ${qaBlendMode === 'screen' ? 'border-[#0F82FF] bg-[#0F82FF]/10 text-[#0F82FF]' : 'border-[#2b2d31] bg-[#0f1115] text-[#9ca3af] hover:text-[#e3e3e3]'}`}>Screen</button>
                    <button onClick={() => setQaBlendMode('color-dodge')} className={`py-2 text-[11px] rounded-lg border transition-colors ${qaBlendMode === 'color-dodge' ? 'border-[#0F82FF] bg-[#0F82FF]/10 text-[#0F82FF]' : 'border-[#2b2d31] bg-[#0f1115] text-[#9ca3af] hover:text-[#e3e3e3]'}`}>Color Dodge</button>
                    <button onClick={() => setQaBlendMode('plus-lighter')} className={`py-2 text-[11px] rounded-lg border transition-colors ${qaBlendMode === 'plus-lighter' ? 'border-[#0F82FF] bg-[#0F82FF]/10 text-[#0F82FF]' : 'border-[#2b2d31] bg-[#0f1115] text-[#9ca3af] hover:text-[#e3e3e3]'}`}>Add</button>
                  </div>
                  <p className="text-[9.5px] text-[#6b7280]">※ VFX Pass 영상은 Screen이나 Add 모드에서 배경이 투명하게 빠집니다.</p>
                </div>
                <div className="bg-[#181a1f] border border-[#2b2d31] rounded-xl p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-bold text-[#e3e3e3] tracking-wide">트랜스폼</h3>
                    <button onClick={() => setQaSettings({ scale: 100, x: 0, y: 0 })} className="text-[10px] text-[#0F82FF] hover:text-[#a8c7fa]">리셋</button>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-[#9ca3af]">확대 (Scale)</span>
                        <span className="text-[#e3e3e3] font-mono">{qaSettings.scale}%</span>
                      </div>
                      <input type="range" min="10" max="500" value={qaSettings.scale} onChange={(e) => setQaSettings({...qaSettings, scale: parseInt(e.target.value)})} className="w-full h-1.5 bg-[#2b2d31] rounded-lg appearance-none cursor-pointer" />
                    </div>
                    <p className="text-[9.5px] text-[#6b7280]">※ 우측 캔버스를 마우스로 드래그하여 이동(Pan)할 수 있습니다.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div onMouseDown={() => setIsResizing(true)} className="w-1 cursor-col-resize bg-transparent hover:bg-[#4b4d52] active:bg-[#0F82FF] transition-colors relative z-30 group flex items-center justify-center shrink-0">
          <div className="w-[1px] h-full bg-[#2b2d31] group-hover:bg-[#4b4d52] group-active:bg-[#0F82FF]"></div>
        </div>

        <div style={{ width: `${100 - leftPaneWidth}%` }} className="h-full flex flex-col bg-[#181a1f] overflow-hidden">
          <header className="h-14 flex items-center px-6 border-b border-[#2b2d31] shrink-0 justify-between bg-[#181a1f]">
            {activeTab === 'compositing' ? (
              <div className="w-full flex items-center space-x-4">
                <button onClick={toggleQaPlay} disabled={!qaVideoSrc} className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-colors ${qaVideoSrc ? 'bg-[#0F82FF] hover:bg-[#3b9cff] text-white shadow-[0_0_10px_rgba(15,130,255,0.4)]' : 'bg-[#2b2d31] text-[#6b7280] cursor-not-allowed'}`}>
                  {qaIsPlaying ? <PauseIcon /> : <PlayIcon />}
                </button>
                <div className="flex-1 flex items-center space-x-3">
                  <span className="text-[11px] font-mono text-[#a8c7fa] w-12 text-right">{formatTime(qaCurrentTime)}</span>
                  <input type="range" min="0" max={qaDuration || 100} step="0.01" value={qaCurrentTime} onChange={handleQaSeek} disabled={!qaVideoSrc} className="flex-1 h-1.5 bg-[#2b2d31] rounded-lg appearance-none cursor-pointer" />
                  <span className="text-[11px] font-mono text-[#9ca3af] w-12">{formatTime(qaDuration)}</span>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0 border-l border-[#2b2d31] pl-4">
                  <button onClick={() => setQaIsLooping(!qaIsLooping)} className={`p-1.5 rounded transition-colors ${qaIsLooping ? 'bg-[#0F82FF]/10' : 'hover:bg-[#2b2d31]'}`} title="반복 재생">
                    <LoopIcon active={qaIsLooping} />
                  </button>
                  <select value={qaPlaybackRate} onChange={handleQaSpeedChange} disabled={!qaVideoSrc} className="bg-[#0f1115] border border-[#2b2d31] text-[10px] text-[#e3e3e3] rounded p-1.5 focus:outline-none focus:border-[#a8c7fa] font-mono">
                    <option value="0.25">0.25x</option>
                    <option value="0.5">0.5x</option>
                    <option value="1">1.0x (Normal)</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2.0x</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-[#e3e3e3] font-medium text-[13px]">{activeTab === 'generate' ? "Engine Output" : "Validation Workflow"}</span>
                {activeTab === 'generate' && (
                  <>
                    <div className="h-3 w-[1px] bg-[#2b2d31] mx-1"></div>
                    <div className="flex flex-wrap gap-1 bg-[#0f1115] rounded-md p-0.5 border border-[#2b2d31]">
                      {EXPORT_MODES.map(mode => (
                        <button key={mode.id} onClick={() => setExportMode(mode.id)} className={`px-2.5 py-1 text-[10px] font-medium rounded transition-colors ${exportMode === mode.id ? 'bg-[#2b2d31] text-[#e3e3e3]' : 'text-[#9ca3af] hover:text-[#e3e3e3]'}`}>
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </header>

          {activeTab === 'generate' && EXPORT_MODE_INFO[exportMode] && (
            <div className="mx-5 mt-5 px-4 py-3 bg-[#a8c7fa]/5 border border-[#a8c7fa]/20 rounded-lg shrink-0">
              <p className="text-[11px] font-bold text-[#a8c7fa] mb-1">{EXPORT_MODE_INFO[exportMode].title}</p>
              <p className="text-[10px] text-[#9ca3af] leading-relaxed">{EXPORT_MODE_INFO[exportMode].desc}</p>
            </div>
          )}

          {activeTab === 'generate' ? (
            <div className={`flex-1 p-5 flex flex-col custom-scrollbar overflow-hidden ${EXPORT_MODE_INFO[exportMode] ? 'pt-3' : ''}`}>
              <div className={`bg-[#0f1115] border ${isOverLimit ? 'border-[#f28b82]' : 'border-[#2b2d31]'} rounded-xl flex flex-col shadow-lg h-full overflow-hidden`}>
                <div className="bg-[#1e1e1f] px-5 py-3.5 border-b border-[#2b2d31] flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3">
                    <span className={`text-[11px] font-medium tracking-wide flex items-center gap-2 ${isOverLimit ? 'text-[#f28b82]' : 'text-[#e3e3e3]'}`}>Target Model Prompt</span>
                    <button onClick={() => setIsOptimized(!isOptimized)} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-bold border transition-colors ${isOptimized ? 'bg-[#a8c7fa]/20 border-[#a8c7fa]/50 text-[#a8c7fa]' : 'bg-[#0f1115] border-[#4b4d52] text-[#6b7280]'}`} title="위험 단어 자동 필터링 및 압축">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                      {isOptimized ? 'Auto-Optimized ON' : 'Auto-Optimized OFF'}
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-mono ${isOverLimit ? 'text-[#f28b82] font-bold' : 'text-[#9ca3af]'}`}>{promptLength} / {currentMaxLimit} chars</span>
                    <button onClick={() => handleCopy(combinedOutput)} className="text-[11px] bg-[#a8c7fa] hover:bg-[#c2d7fa] text-[#062e6f] px-3.5 py-1.5 rounded-lg transition-colors font-bold shrink-0">Copy Prompt</button>
                  </div>
                </div>
                {isOptimized && logs.length > 0 && (
                  <div className="bg-[#0f1115] border-b border-[#2b2d31] p-3 px-5 flex flex-col gap-1.5 shrink-0">
                    <div className="text-[10px] font-bold text-[#a8c7fa] flex items-center gap-1.5 mb-1">Prompt Inspector Logs (자동 보정 내역)</div>
                    {logs.map((log, i) => (
                      <div key={i} className={`text-[9.5px] font-mono leading-relaxed ${log.includes('⚠️') ? 'text-[#f28b82]' : 'text-[#9ca3af]'}`}>{log}</div>
                    ))}
                  </div>
                )}
                <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
                  <p className="text-[13px] font-mono text-[#e3e3e3] whitespace-pre-wrap leading-relaxed select-all">{combinedOutput}</p>
                </div>
              </div>
            </div>
          ) : activeTab === 'validate' ? (
            <div className="flex-1 p-5 flex flex-col gap-4 custom-scrollbar overflow-hidden">
              <div className="bg-[#181a1f] border border-[#2b2d31] rounded-xl flex flex-col shadow-lg shrink-0">
                 <div className="bg-[#1e1e1f] px-5 py-3 border-b border-[#2b2d31] shrink-0">
                   <span className="text-[11px] font-medium text-[#e3e3e3] tracking-wide">Original Prompt (원본 프롬프트 입력)</span>
                 </div>
                 <div className="p-4 bg-[#0f1115]">
                   <textarea className="w-full bg-[#131314] border border-[#2b2d31] rounded-lg p-3 text-[12px] text-[#e3e3e3] outline-none focus:border-[#a8c7fa] resize-y custom-scrollbar min-h-[100px]" placeholder="문제가 발생한 영상 제작에 사용했던 원본 프롬프트를 붙여넣으세요..." value={baseValidatePrompt} onChange={(e) => setBaseValidatePrompt(e.target.value)} />
                 </div>
              </div>
              <div className="flex justify-center shrink-0">
                <svg className="w-5 h-5 text-[#444746]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
              </div>
              <div className={`bg-[#0f1115] border ${isOverLimit ? 'border-[#f28b82]' : 'border-[#a8c7fa]/50'} rounded-xl flex flex-col shadow-lg flex-1 min-h-0 overflow-hidden`}>
                <div className="bg-[#1e1e1f] px-5 py-3.5 border-b border-[#2b2d31] flex justify-between items-center shrink-0">
                  <span className={`text-[11px] font-medium tracking-wide flex items-center gap-2 ${isOverLimit ? 'text-[#f28b82]' : 'text-[#a8c7fa]'}`}>Corrected Prompt</span>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-mono ${isOverLimit ? 'text-[#f28b82] font-bold' : 'text-[#9ca3af]'}`}>{promptLength} / {currentMaxLimit} chars</span>
                    <button onClick={() => handleCopy(combinedOutput)} disabled={!finalOutput} className="text-[11px] bg-[#a8c7fa] hover:bg-[#c2d7fa] text-[#062e6f] px-3.5 py-1.5 rounded-lg transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed shrink-0">Copy Correction</button>
                  </div>
                </div>
                <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
                  <p className="text-[13px] font-mono text-[#e3e3e3] whitespace-pre-wrap leading-relaxed select-all">{combinedOutput || "원본 프롬프트를 입력하고 좌측에서 검수를 진행하면 보정 코드가 추가됩니다."}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className={`flex-1 relative flex items-center justify-center overflow-hidden ${qaBgType === 'checker-dark' ? 'bg-checker-dark' : qaBgType === 'checker-light' ? 'bg-checker-light' : ''} ${isPanning ? 'cursor-grabbing' : (qaSettings.scale > 100 ? 'cursor-grab' : 'default')}`}
              style={getCanvasBackgroundStyle()}
              onMouseDown={handlePanStart}
              onMouseMove={handlePanMove}
              onMouseUp={handlePanEnd}
              onMouseLeave={handlePanEnd}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setQaDragActiveVideo(true); }}
              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setQaDragActiveVideo(false); }}
              onDrop={handleQaDropMain}
            >
              {qaDragActiveVideo && (
                <div className="absolute inset-0 z-50 bg-[#0F82FF]/10 backdrop-blur-sm border-2 border-[#0F82FF] border-dashed m-4 rounded-xl flex items-center justify-center pointer-events-none">
                  <div className="bg-[#181a1f] text-[#e3e3e3] px-6 py-4 rounded-xl font-bold shadow-2xl flex items-center space-x-3 border border-[#2b2d31]">
                    <UploadIcon /><span>영상을 여기에 놓으세요</span>
                  </div>
                </div>
              )}
              {!qaVideoSrc ? (
                 <div className="text-center p-8 border-2 border-dashed border-[#2b2d31] rounded-xl max-w-md bg-[#181a1f]/80 backdrop-blur-md pointer-events-none">
                    <div className="flex justify-center mb-4 text-[#a8c7fa]"><MonitorIcon /></div>
                    <h3 className="text-[14px] font-bold text-[#e3e3e3] mb-2 tracking-tight">알파 채널 및 합성 검수</h3>
                    <p className="text-[11px] text-[#9ca3af] leading-relaxed">투명 배경 영상이나 VFX Pass 모드 추출 영상을 드래그 앤 드롭하세요. 좌측에서 Screen 모드 선택 시 배경과 완벽하게 합성됩니다.</p>
                 </div>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center overflow-visible pointer-events-none">
                  <video
                    ref={qaVideoRef}
                    src={qaVideoSrc}
                    loop={qaIsLooping}
                    muted
                    playsInline
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                    onTimeUpdate={handleQaTimeUpdate}
                    onLoadedMetadata={handleQaLoadedMetadata}
                    style={{
                      transform: `translate(${qaSettings.x}px, ${qaSettings.y}px) scale(${qaSettings.scale / 100})`,
                      transformOrigin: 'center center',
                      width: '100%', height: '100%',
                      objectFit: 'contain',
                      mixBlendMode: qaBlendMode,
                      pointerEvents: 'none',
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );

}

export default App;
