// Director persona / engine / preset / budget / quick-adjustment 상수 모음.
// PRESET_GROUPS 의 각 preset.settings 는 useRenderPrompt 의 setter 들과 1:1 대응.

export const DIRECTOR_PERSONAS = [
  { id: "Cinematic", name: "🎬 시네마틱 디렉터", desc: "강한 명암, 서사적이고 묵직한 하이엔드 연출", discipline: "MINDSET: 'Is this memorable and epic?' PRIORITY: 1. Visual Focus 2. Extreme Contrast 3. Heavy Metallic Feel.", mj_tags: "dramatic lighting, extreme cinematic contrast, punchy vibrant shading, emotional vibe, AAA game title aesthetic", auditRules: { maxFx: "High", prefMaterial: "Metal", avoid: "Flat" } },
  { id: "Alchemist", name: "⚗️ 매테리얼 알케미스트", desc: "재질의 물리적 특성, 표면 질감 최우선", discipline: "MINDSET: 'Does this look like a real, tangible substance?' PRIORITY: 1. Material Reality 2. Surface Density 3. Optical Reaction.", mj_tags: "insane micro-details, hyper-realistic material, macro photography style, extreme optical reaction, dense surface texture", auditRules: { maxFx: "Low", prefMaterial: "Complex", avoid: "None" } },
  { id: "DarkSmith", name: "⚔️ 다크 판타지 대장장이", desc: "다크 판타지, 그을린 금속, 전투의 흔적", discipline: "MINDSET: 'Was this forged in the abyss?' PRIORITY: 1. Gritty Realism 2. Heavy Metal Focus 3. Battle-Forged Aesthetic on an ISOLATED standalone typography.", mj_tags: "dark fantasy aesthetic, heavy dark forged metal, battle-worn standalone emblem, scorched typography, gritty realism, abyssal energy, isolated cutout against pure black void", auditRules: { maxFx: "Mid", prefMaterial: "Gritty", avoid: "GlossyPlastic" } },
  { id: "Premium", name: "💎 클린 프리미엄", desc: "여백, 절제된 빛, 애플/나이키풍의 고급감", discipline: "MINDSET: 'Is this structurally perfect and elegant?' PRIORITY: 1. Shape Fidelity 2. Clean Edges 3. Premium Luxury Finish. FX MUST BE MINIMIZED.", mj_tags: "highly organized, structural perfection, clean edges, solid stable structure, minimalist fx, noise-free, premium luxury render, elegant, sleek", auditRules: { maxFx: "None", prefMaterial: "Clean", avoid: "Rough" } },
];

export const AI_MODELS = [
  { id: 'NanoBanana', name: 'NanoBanana' },
  { id: 'ChatGPT', name: 'ChatGPT' },
  { id: 'Midjourney', name: 'Midjourney' },
];

export const VIDEO_AI_MODELS = [
  { id: 'Veo', name: 'Veo (Google)' },
  { id: 'Runway', name: 'Runway Gen-3' },
  { id: 'Luma', name: 'Luma / Kling' },
  { id: 'Sequence', name: 'AE / Web Sequence' },
];

export const RENDER_ENGINES = [
  { id: "Unreal", name: "언리얼 엔진 5 (에픽/게임)", en: "unreal engine 5 style, AAA-quality physically believable surface rendering" },
  { id: "Octane", name: "옥테인 렌더 (실사/크리스탈)", en: "octane render, photorealistic, front-lit studio realism" },
  { id: "Redshift", name: "레드시프트 (광고/트렌디)", en: "redshift render, vibrant studio lighting, crisp reflections" },
  { id: "VRay", name: "브이레이 (차분/스튜디오)", en: "v-ray render, clean global illumination, realistic studio light" },
];

export const PRESET_GROUPS = [
  {
    id: "gold", icon: "🟡", name: "황금",
    presets: [
      { id: "gold_relic", label: "고대 유물", settings: { directorPersona: "DarkSmith", material: "AntiqueGold", frontRelief: "MicroBevel", surfaceDetail: "High", dramaticTex: "AncientErosion", wearLevel: "TimeWorn", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "GoldenDust", fxOrigin: "Edges", fxIntensity: "Subtle", rimIntensity: "Subtle", background: "RealBlack", vfxPassMode: false }, description: "수백 년간 땅에 묻혀있던 짙은 산화와 녹(Patina), 깨진 모서리가 사실적으로 표현되는 거칠고 묵직한 고대 황금." },
      { id: "gold_war", label: "전투 흔적", settings: { directorPersona: "DarkSmith", material: "AntiqueGold", frontRelief: "MicroBevel", surfaceDetail: "High", dramaticTex: "ExplosiveFracture", wearLevel: "BattleDamage", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "MagmaEmbers", fxOrigin: "Edges", fxIntensity: "Subtle", rimIntensity: "Moderate", background: "RealBlack", vfxPassMode: false }, description: "전쟁을 수없이 겪어 칼자국, 찍힘, 얕은 균열이 표면에 거칠게 남아 있는 단단한 금속 덩어리 형태의 황금." },
      { id: "gold_holy", test: true, label: "성스러운 황금", settings: { directorPersona: "Premium", material: "MatteGold", frontRelief: "HairlineBevel", surfaceDetail: "Standard", dramaticTex: "MicroGrain", wearLevel: "None", rimThickness: "None", rimColor: "White", rimIntensity: "Subtle", projectionDepth: "None", cameraLens: "Standard", energyCore: "Sparkling", fxOrigin: "Overall", fxIntensity: "Subtle", background: "RealBlack", vfxPassMode: false }, description: "미세하고 정교한 금속 결(Micro-grain)이 명품처럼 살아있는 정제된 왕실 황금. 틈에서 은은한 신성광이 새어 나옴." },
      { id: "gold_imperial", test: true, label: "제국 황금", settings: { directorPersona: "Cinematic", material: "MatteGold", frontRelief: "MicroChiseled", surfaceDetail: "High", dramaticTex: "None", wearLevel: "MicroScratches", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "GoldenDust", fxOrigin: "Edges", fxIntensity: "Subtle", rimIntensity: "Strong", background: "RealBlack", vfxPassMode: false }, description: "미세한 조각칼로 정밀하게 세공된 표면이 명품처럼 정교하게 빛을 반사시키는 단단하고 밀도 높은 제국의 황금." },
      { id: "gold_midnight", test: true, label: "모던 다크 골드", settings: { directorPersona: "Cinematic", material: "MatteGold", frontRelief: "MicroBevel", surfaceTreatment: "BrushedMetal", surfaceDetail: "Standard", dramaticTex: "MicroGrain", wearLevel: "MicroScratches", projectionDepth: "Shallow", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Overall", fxIntensity: "Subtle", rimThickness: "Hairline", rimIntensity: "Strong", rimColor: "MutedGold", enableGlint: true, background: "RealBlack", vfxPassMode: false }, description: "얕은 3D 돌출부(Shallow)를 가진 묵직하고 모던한 무광 골드. 정면은 얇게 깎여 있으며, 날카로운 외곽선 하이라이트(Glint)가 고급스러운 무게감을 줍니다." },
    ],
  },
  {
    id: "steel", icon: "⚪", name: "강철",
    presets: [
      { id: "steel_blade", test: true, label: "칼날 강철", settings: { directorPersona: "Cinematic", material: "HyperChrome", frontRelief: "HairlineBevel", surfaceDetail: "High", dramaticTex: "ExplosiveFracture", wearLevel: "MicroScratches", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "Sparkling", fxOrigin: "Edges", fxIntensity: "Subtle", rimIntensity: "Moderate", background: "RealBlack", vfxPassMode: false }, description: "날카롭게 벼려낸 전투용 검의 금속감. 예리한 칼각과 표면에 거친 스크래치, 찍힘이 존재하여 실전 무기의 긴장감을 줌." },
      { id: "steel_helm", test: true, label: "기사 투구", settings: { directorPersona: "DarkSmith", material: "GothicSteel", frontRelief: "MicroBevel", surfaceTreatment: "HammeredFinish", surfaceDetail: "High", dramaticTex: "AncientErosion", wearLevel: "TimeWorn", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Overall", fxIntensity: "Subtle", rimIntensity: "Moderate", background: "RealBlack", vfxPassMode: false }, description: "전장을 뒹군 낡은 장갑판 재질. 단조된 망치 자국(Hammered)과 세월에 마모된 묵직하고 거친 강철의 느낌." },
      { id: "steel_heavy", test: true, label: "헤비 브러시드 강철", settings: { directorPersona: "Cinematic", material: "HyperChrome", frontRelief: "MicroBevel", surfaceTreatment: "BrushedMetal", surfaceDetail: "High", dramaticTex: "None", wearLevel: "MicroScratches", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Overall", fxIntensity: "Subtle", rimIntensity: "Moderate", background: "RealBlack", vfxPassMode: false }, description: "가로/세로로 거칠게 연마된 공업용 헤비 금속. 직선의 날카로운 브러시 결 위에 미세한 스크래치들이 밀도 높게 덮여있는 질감." },
      { id: "steel_frost", test: true, label: "서릿발 강철", settings: { directorPersona: "DarkSmith", material: "GothicSteel", frontRelief: "MicroChiseled", surfaceDetail: "High", dramaticTex: "AncientErosion", wearLevel: "TimeWorn", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "ColdMist", fxOrigin: "BetweenLetters", fxIntensity: "Subtle", rimIntensity: "Moderate", background: "RealBlack", vfxPassMode: false }, description: "차가운 공기를 머금은 강철 재질. 잘게 쪼개진 표면 위에 차가운 서리가 맺혀 있으며, 글자 사이로 은은한 냉기가 흐름." },
      { id: "steel_hightech", test: true, label: "하이테크 기하학 스틸", settings: { directorPersona: "Cinematic", material: "PolishedSilver", frontRelief: "Crystalline", surfaceDetail: "Clean", dramaticTex: "GeometricMilling", wearLevel: "None", projectionDepth: "Shallow", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Overall", fxIntensity: "Subtle", rimThickness: "Hairline", rimIntensity: "Subtle", rimColor: "Blue", enableGlint: true, enableVfx: false, enableShadow: true, background: "RealBlack", vfxPassMode: false }, description: "차가운 하이테크 크롬 금속에 정밀한 기하학적 다이아몬드 격자 무늬가 새겨진 스타일. 얇은 두께감과 날카로운 크리스탈 각을 유지하며, 은은한 블루 림라이트가 차가운 느낌을 줍니다." },
    ],
  },
  {
    id: "ice", icon: "🧊", name: "얼음",
    presets: [
      { id: "ice_glacier", test: true, label: "빙하 수정", settings: { directorPersona: "Alchemist", material: "IceCrystal", frontRelief: "Crystalline", surfaceDetail: "Clean", dramaticTex: "None", wearLevel: "None", projectionDepth: "None", cameraLens: "Macro", energyCore: "ColdMist", fxOrigin: "Overall", fxIntensity: "Moderate", rimColor: "Blue", rimIntensity: "Strong", background: "RealBlack", vfxPassMode: false }, description: "차갑게 빛나는 빙하 수정 재질. 투명한 얼음과 잘게 쪼개진 파셋 결정면, 내부의 푸른 깊이감이 돋보임." },
      { id: "ice_abyss", test: true, label: "심연 얼음", settings: { directorPersona: "Alchemist", material: "Obsidian", frontRelief: "Crystalline", surfaceDetail: "High", dramaticTex: "ExplosiveFracture", wearLevel: "MicroScratches", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "DarkAura", fxOrigin: "Overall", fxIntensity: "Subtle", rimIntensity: "Subtle", background: "RealBlack", vfxPassMode: false }, description: "짙은 블루와 청백색 냉광이 층을 이루는 깊고 어두운 심연의 얼음. 묵직하고 거친 얼음맥과 균열 깊이감이 특징." },
      { id: "ice_relic", test: true, label: "얼음 유물", settings: { directorPersona: "DarkSmith", material: "IceCrystal", frontRelief: "Crystalline", surfaceDetail: "High", dramaticTex: "AncientErosion", wearLevel: "TimeWorn", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "ColdMist", fxOrigin: "Overall", fxIntensity: "Subtle", rimIntensity: "Moderate", background: "RealBlack", vfxPassMode: false }, description: "표면에 서리와 얕은 균열, 오래된 냉기 흔적이 남아 있는 묵직하고 오래된 빙결체 유물의 느낌." },
      { id: "ice_polar", test: true, label: "북극 파편", settings: { directorPersona: "Cinematic", material: "IceCrystal", frontRelief: "HairlineBevel", surfaceDetail: "Clean", dramaticTex: "None", wearLevel: "None", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "Sparkling", fxOrigin: "Edges", fxIntensity: "Subtle", rimIntensity: "Strong", background: "RealBlack", vfxPassMode: false }, description: "북극의 얼음 파편처럼 날카롭고 밝은 청백색 불투명 얼음 재질. 형태가 선명하고 모서리가 예리하게 살아 있음." },
    ],
  },
  {
    id: "lava", icon: "🌋", name: "용암",
    presets: [
      { id: "lava_ember", test: true, label: "용암 맥", settings: { directorPersona: "DarkSmith", material: "VolcanicRock", frontRelief: "EdgelessConcave", surfaceDetail: "High", dramaticTex: "GlowingVeins", wearLevel: "TimeWorn", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "MagmaEmbers", fxOrigin: "Edges", fxIntensity: "Moderate", rimIntensity: "Subtle", background: "RealBlack", vfxPassMode: false }, description: "어두운 화산암 틈 사이로 얇은 용암맥이 은은하게 흐름. 깊게 파인 지형을 따라 붉은 열기가 스며나옴." },
      { id: "lava_ashforge", test: true, label: "열화 강철", settings: { directorPersona: "DarkSmith", material: "GothicSteel", frontRelief: "MicroBevel", surfaceDetail: "Standard", dramaticTex: "MicroGrain", wearLevel: "MicroScratches", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "MagmaEmbers", fxOrigin: "BetweenLetters", fxIntensity: "Subtle", rimIntensity: "Moderate", background: "RealBlack", vfxPassMode: false }, description: "막 대장간에서 벼려낸 기계적이고 묵직한 장갑판. 열광 효과를 최소화하고 은은한 붉은빛만 도는 차분한 단조 금속." },
    ],
  },
  {
    id: "utility", icon: "🛠️", name: "특수",
    presets: [
      { id: "vfx_pass", test: true, label: "이펙트 소스 추출", settings: { vfxPassMode: true, background: "RealBlack", cameraLens: "Telephoto", energyCore: "MagmaEmbers", fxOrigin: "Overall", fxIntensity: "Intense", rimIntensity: "None" }, description: "타이포그래피 본체는 완전히 블랙아웃 처리하고, 주변에 발생하는 이펙트 요소만 분리하여 추출합니다." },
    ],
  },
];

export const EDIT_BUDGETS = [
  { id: "Locked", name: "Locked (외관만 최소 변경)", en: "Conservative remix, strict shape lock, preserved exact typography" },
  { id: "Conservative", name: "Conservative (표면/빛 위주)", en: "Balanced surface remix, strong shape retention" },
  { id: "Balanced", name: "Balanced (내부/FX 확장)", en: "Creative remix, moderate shape retention, enhanced internal structures" },
  { id: "Expressive", name: "Expressive (연출 확장 우선)", en: "Expressive remix, flexible shape allowance for intense FX" },
];

export const QUICK_ADJUSTMENTS = [
  { id: "BOOST_VIBRANCY", label: "🔥 채도 및 생동감 극대화", desc: "물빠진 색감을 없애고 강렬하고 풍부한 색감을 만듭니다.", action: { editIntent: "highly saturated, punchy vibrant colors, rich deep colors, cinematic color grading" } },
  { id: "CLEAN_UP_FX", label: "🧹 빛 번짐 및 파티클 억제", desc: "지저분한 주변 효과를 끄고 글자에만 집중합니다.", action: { enableVfx: false, enableGlint: false } },
  { id: "ADD_GRUNGE", label: "🪨 더 거칠고 묵직하게", desc: "텍스처와 미세 스크래치를 높여 유물 느낌을 줍니다.", action: { surfaceDetail: "High", wearLevel: "MicroScratches" } },
  { id: "MAKE_CLEAN", label: "✨ 더 깔끔하고 매끄럽게", desc: "노이즈를 제거하고 깔끔한 스튜디오 렌더 느낌을 줍니다.", action: { surfaceDetail: "Clean", wearLevel: "None", dramaticTex: "None" } },
  { id: "DENSE_TEXT_FIX", label: "🔍 작고 복잡한 글씨 교정", desc: "해상도 한계로 글씨가 뭉개지는 것을 막기 위해 가독성 모드로 변경합니다.", action: { typographyScale: "Dense", surfaceDetail: "Standard", dramaticTex: "None" } },
  { id: "COMPRESS_LENS", label: "🔭 망원 렌즈로 측면 왜곡 억제", desc: "원근감을 납작하게 압축하여 화면 끝부분의 좌우 측면 벽 노출을 없앱니다.", action: { cameraLens: "Telephoto", projectionDepth: "None" } },
];

// 옵션 ID → English prompt fragment.
export const getOptionEn = (list, id) => list.find(o => o.id === id)?.en || String(id);
// 옵션 ID → 표시명. dynamicNames 는 임포트/AI 동적 옵션이 우선될 때 사용.
export const getOptionName = (list, id, dynamicNames = {}) => list.find(o => o.id === id)?.name || dynamicNames[id] || String(id);

// 외부에서 들어온(분석/임포트) custom id 를 기존 리스트 상단에 ✨ prefix 로 합성.
export const combineOptions = (baseList, currentValue, dynamicNames = {}) => {
  if (!currentValue) return baseList;
  if (baseList.find(o => o.id === currentValue)) return baseList;
  return [{ id: currentValue, name: `✨ ${dynamicNames[currentValue] || currentValue}`, en: currentValue }, ...baseList];
};
