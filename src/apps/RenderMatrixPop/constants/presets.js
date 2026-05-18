// Pop 전용 디렉터/프리셋/예산/Quick adjust/엔진 모음.
// RenderMatrix 와 비교했을 때 가장 큰 차이:
//   - Chameleon/ToyMaker/PopArt/Kawaii 페르소나 추가
//   - PRESET_GROUPS: toy/candy 카테고리 추가
//   - EDIT_BUDGETS: SilhouetteTrace, StyleTransfer 가 가장 위에 위치
//
// getOptionEn/Name/combineOptions 등 순수 helper 는 RenderMatrix 에서 직접 import (공통).

export { getOptionEn, getOptionName, combineOptions } from "../../RenderMatrix/constants/presets";

export const DIRECTOR_PERSONAS = [
  { id: "Chameleon", name: "🦎 카멜레온 (레퍼런스 완벽 복사)", desc: "장르 불문! AI의 편향을 없애고 레퍼런스의 재질/빛 1:1 카피", discipline: "MINDSET: 'I am a blank canvas mirroring the reference.' PRIORITY: 1. Exact Style Transfer 2. Identical Material Recreation 3. Match Lighting 1:1.", mj_tags: "exact aesthetic match, perfectly mimicking reference style, identical lighting setup, highly accurate material recreation, 1:1 style copy", auditRules: { maxFx: "Mid", prefMaterial: "Clean", avoid: "None" } },
  { id: "ToyMaker", name: "🧸 토이 메이커", desc: "아트토이, 플라스틱/실리콘 질감, 귀엽고 라운드된 3D", discipline: "MINDSET: 'Is this playful, cute, and tactile?' PRIORITY: 1. Soft Rounded Shapes 2. Vibrant Playful Colors 3. Art Toy Aesthetic.", mj_tags: "designer art toy, smooth plastic finish, playful vibrant colors, soft lighting, cute aesthetic, 3d icon style", auditRules: { maxFx: "Low", prefMaterial: "Plastic", avoid: "Gritty" } },
  { id: "PopArt", name: "🎨 팝아트 컬러리스트", desc: "쨍하고 대비가 강한 팝아트, 네온, 캔디 컬러", discipline: "MINDSET: 'Does it pop out like candy?' PRIORITY: 1. Extreme Color Contrast 2. Glossy Reflections 3. Trendy Vibe.", mj_tags: "pop art aesthetic, extremely vibrant neon colors, glossy candy finish, trendy typography, editorial photography", auditRules: { maxFx: "Mid", prefMaterial: "Glossy", avoid: "Worn" } },
  { id: "Kawaii", name: "☁️ 카와이 크리에이터", desc: "귀엽고 몽글몽글한 파스텔 톤, 솜사탕 분위기", discipline: "MINDSET: 'Is this soft, dreamy, and sweet?' PRIORITY: 1. Pastel Colors 2. Soft Textures 3. Dreamy Atmosphere.", mj_tags: "kawaii aesthetic, dreamy pastel color palette, soft fluffy lighting, cute and sweet, dreamy atmosphere", auditRules: { maxFx: "Mid", prefMaterial: "Soft", avoid: "Metallic" } },
  { id: "Cinematic", name: "🎬 시네마틱 디렉터", desc: "강한 명암, 서사적이고 묵직한 하이엔드 연출", discipline: "MINDSET: 'Is this memorable and epic?' PRIORITY: 1. Visual Focus 2. Extreme Contrast 3. Heavy Metallic Feel.", mj_tags: "dramatic lighting, extreme cinematic contrast, punchy vibrant shading, emotional vibe, AAA game title aesthetic", auditRules: { maxFx: "High", prefMaterial: "Metal", avoid: "Flat" } },
  { id: "DarkSmith", name: "⚔️ 다크 판타지 대장장이", desc: "다크 판타지, 그을린 금속, 전투의 흔적", discipline: "MINDSET: 'Was this forged in the abyss?' PRIORITY: 1. Gritty Realism 2. Heavy Metal Focus 3. Ancient Relic Vibe.", mj_tags: "dark fantasy mood, heavy dark metal, ancient relic, forged in fire, battle-worn, gritty realism, abyssal energy", auditRules: { maxFx: "Mid", prefMaterial: "Gritty", avoid: "GlossyPlastic" } },
];

export const AI_MODELS = [{ id: 'NanoBanana', name: 'NanoBanana' }, { id: 'ChatGPT', name: 'ChatGPT' }, { id: 'Midjourney', name: 'Midjourney' }];
export const VIDEO_AI_MODELS = [{ id: 'Veo', name: 'Veo (Google)' }, { id: 'Runway', name: 'Runway Gen-3' }, { id: 'Luma', name: 'Luma / Kling' }, { id: 'Sequence', name: 'AE / Web Sequence' }];

export const RENDER_ENGINES = [
  { id: "Unreal", name: "언리얼 엔진 5 (에픽/게임)", en: "unreal engine 5 style, AAA-quality physically believable surface rendering" },
  { id: "Octane", name: "옥테인 렌더 (실사/크리스탈/토이)", en: "octane render, photorealistic, front-lit studio realism" },
  { id: "Redshift", name: "레드시프트 (광고/팝아트)", en: "redshift render, vibrant studio lighting, crisp reflections" },
  { id: "VRay", name: "브이레이 (차분/스튜디오)", en: "v-ray render, clean global illumination, realistic studio light" },
];

// 캐주얼/팝 전용 프리셋 (toy/candy) + 카피·MMO 유틸 프리셋.
export const PRESET_GROUPS = [
  {
    id: "utility", icon: "🛠️", name: "카피/특수",
    presets: [
      { id: "ref_copy", label: "레퍼런스 완벽 복사 모드", settings: { directorPersona: "Chameleon", material: "HyperChrome", dramaticTex: "Auto", surfaceDetail: "Standard", wearLevel: "None", energyCore: "None", fxOrigin: "Overall", fxIntensity: "Subtle", rimIntensity: "Moderate", rimColor: "White", vfxPassMode: false }, description: "업로드한 타겟 이미지의 렌더링 스타일, 질감, 톤앤매너를 그대로 1:1로 카피하는 데 집중합니다." },
      { id: "vfx_pass", label: "이펙트 소스 추출 (매트)", settings: { vfxPassMode: true, background: "RealBlack", cameraLens: "Telephoto", energyCore: "MagmaEmbers", fxOrigin: "Overall", fxIntensity: "Intense", rimIntensity: "None" }, description: "타이포그래피 본체는 완전히 블랙아웃 처리하고, 주변에 발생하는 이펙트 요소만 분리하여 추출합니다." },
    ],
  },
  {
    id: "toy", icon: "🧸", name: "토이/플라스틱",
    presets: [
      { id: "toy_glossy", label: "유광 아트토이", settings: { directorPersona: "ToyMaker", material: "GlossyPlastic", frontRelief: "ChunkyToy", surfaceDetail: "Clean", dramaticTex: "None", wearLevel: "None", projectionDepth: "Block", cameraLens: "Standard", energyCore: "None", fxOrigin: "Overall", fxIntensity: "Subtle", rimIntensity: "Subtle", rimColor: "White", background: "PureWhite", vfxPassMode: false }, description: "매끄럽고 반짝이는 유광 플라스틱 장난감 질감. 둥글고 귀여운 덩어리감이 특징입니다." },
      { id: "toy_matte", label: "소프트 무광 실리콘", settings: { directorPersona: "ToyMaker", material: "SoftSilicone", frontRelief: "SoftRounded", surfaceDetail: "Standard", dramaticTex: "None", wearLevel: "None", projectionDepth: "Shallow", cameraLens: "Standard", energyCore: "None", fxOrigin: "Overall", fxIntensity: "Subtle", rimIntensity: "Moderate", rimColor: "PastelPink", background: "StudioGray", vfxPassMode: false }, description: "보들보들하고 매트한 실리콘 재질. 파스텔 톤의 차분하고 고급스러운 아트토이 감성." },
    ],
  },
  {
    id: "candy", icon: "🍬", name: "캔디/풍선",
    presets: [
      { id: "jelly_gummy", label: "투명 구미 젤리", settings: { directorPersona: "Kawaii", material: "GummyJelly", frontRelief: "ChunkyToy", surfaceDetail: "Clean", dramaticTex: "SugarCoating", wearLevel: "None", projectionDepth: "Block", cameraLens: "Macro", energyCore: "SoapBubbles", fxOrigin: "Overall", fxIntensity: "Subtle", rimIntensity: "Strong", rimColor: "White", background: "PureWhite", vfxPassMode: false }, description: "빛이 투과되는 반투명하고 쫀득한 젤리 재질. 겉면에 달콤한 설탕 코팅이 묻어있습니다." },
      { id: "balloon_foil", label: "호일 파티 풍선", settings: { directorPersona: "PopArt", material: "FoilBalloon", frontRelief: "PuffyBalloon", surfaceDetail: "Standard", dramaticTex: "None", wearLevel: "None", projectionDepth: "Shallow", cameraLens: "Wide", energyCore: "ConfettiPop", fxOrigin: "Overall", fxIntensity: "Moderate", rimIntensity: "Strong", rimColor: "White", background: "ChromaGreen", vfxPassMode: false }, description: "빵빵하게 공기가 찬 호일 파티 풍선. 쨍한 반사와 주변에 흩날리는 색종이 폭죽 효과가 연출됩니다." },
    ],
  },
  {
    id: "gold", icon: "🟡", name: "황금/강철",
    presets: [
      { id: "gold_relic", label: "고대 유물 (MMO)", settings: { directorPersona: "DarkSmith", material: "AntiqueGold", frontRelief: "MicroBevel", surfaceDetail: "High", dramaticTex: "AncientErosion", wearLevel: "TimeWorn", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "GoldenDust", fxOrigin: "Edges", fxIntensity: "Subtle", rimIntensity: "Subtle", background: "RealBlack", vfxPassMode: false }, description: "수백 외곽선이 부식된 고대 황금." },
      { id: "steel_blade", label: "칼날 강철 (MMO)", settings: { directorPersona: "Cinematic", material: "HyperChrome", frontRelief: "HairlineBevel", surfaceDetail: "High", dramaticTex: "ExplosiveFracture", wearLevel: "MicroScratches", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "Sparkling", fxOrigin: "Edges", fxIntensity: "Subtle", rimIntensity: "Moderate", background: "RealBlack", vfxPassMode: false }, description: "날카롭게 벼려낸 금속 재질." },
    ],
  },
];

// SilhouetteTrace / StyleTransfer 가 최상단 — Pop 의 주력 모드.
export const EDIT_BUDGETS = [
  { id: "SilhouetteTrace", name: "✂️ Silhouette Trace (2D 실루엣 완벽 보존)", en: "CRITICAL: EXACT SILHOUETTE TRACE. Treat the input image as an absolute 2D geometry mask. Do NOT regenerate or reinterpret the text. Extrude the exact provided shape into 3D. Preserve every detailed shape, cut, and character feature perfectly." },
  { id: "StyleTransfer", name: "🎯 Style Transfer (형태 고정 + 분위기 1:1 완벽 복제)", en: "extreme style transfer, strict shape lock, override original materials to completely match the target reference style 1:1, perfectly mimic the aesthetic" },
  { id: "Locked", name: "Locked (외관만 최소 변경)", en: "Conservative remix, strict shape lock, preserved exact typography" },
  { id: "Conservative", name: "Conservative (표면/빛 위주)", en: "Balanced surface remix, strong shape retention" },
  { id: "Expressive", name: "Expressive (연출 확장 우선)", en: "Expressive remix, flexible shape allowance for intense FX" },
];

export const QUICK_ADJUSTMENTS = [
  { id: "TRACE_SILHOUETTE", label: "✂️ 2D 실루엣 3D화 (형태 완벽 보존)", desc: "AI가 멋대로 폰트를 바꾸는 것을 막고, 업로드한 이미지의 형태(디테일, 장식 등)를 100% 강제 유지합니다.", action: { editBudget: "SilhouetteTrace", directorPersona: "PopArt", material: "GlossyPlastic" } },
  { id: "MATCH_EXACTLY", label: "🎯 레퍼런스 스타일 1:1 완벽 복제 모드", desc: "장르 불문, AI의 편향을 끄고 업로드한 레퍼런스의 재질과 빛만 철저하게 복사합니다.", action: { editBudget: "StyleTransfer", directorPersona: "Chameleon", dramaticTex: "Auto", surfaceDetail: "Standard", wearLevel: "None" } },
  { id: "CLEAN_UP_FX", label: "🧹 빛 번짐 및 파티클 억제", desc: "지저분한 주변 효과를 끄고 글자에만 집중합니다.", action: { enableVfx: false, enableGlint: false, activeEditIntents: { material: false, lighting: false, vfx: false } } },
  { id: "COMPRESS_LENS", label: "🔭 망원 렌즈로 측면 왜곡 억제", desc: "원근감을 납작하게 압축하여 화면 끝부분의 좌우 측면 벽 노출을 없앱니다.", action: { cameraLens: "Telephoto", projectionDepth: "None" } },
];
