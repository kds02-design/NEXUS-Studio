// Pop 의 드롭다운 옵션 카테고리/태그 정의 (INITIAL_OPTIONS).
// RenderMatrix 와 비교 시 차이점:
//   - frontReliefs: ChunkyToy / SoftRounded / PuffyBalloon 추가 (캐주얼)
//   - materials: GlossyPlastic / SoftSilicone / GummyJelly / FoilBalloon / FluffyFabric 추가
//   - dramaticTextures: GlitterDust / SugarCoating 추가
//   - energyCores: ConfettiPop / SoapBubbles / PastelAura 추가
//   - rimColors: PastelPink / MintGreen / NeonYellow 추가
// AI 분석/임포트로 동적 옵션이 추가될 수 있어 'initial' 상태로 관리.

export const INITIAL_OPTIONS = {
  typographyScales: [
    { id: "Macro", name: "대형 로고 (Macro)", en: "macro photography, hyper-detailed single focal point, large typography" },
    { id: "Dense", name: "복잡/작은 텍스트 (Dense)", en: "centered composition, medium-wide framing, subject occupies around 50% of the frame, highly legible and clean typography, simplified surface details to maintain readability, crisp clean typographic boundaries, reduced noise" },
  ],
  cameraLenses: [
    { id: "Telephoto", name: "망원 렌즈 (200mm) - 왜곡 제거", en: "shot on 200mm telephoto lens, extreme perspective compression, flat focal plane, strictly zero perspective distortion" },
    { id: "Standard", name: "표준 렌즈 (50mm) - 자연스러운 시야", en: "shot on 50mm standard lens, natural human eye perspective" },
    { id: "Wide", name: "광각 렌즈 (24mm) - 극적인 원근감", en: "shot on 24mm ultra wide angle lens, dramatic perspective distortion, dynamic vanishing point" },
    { id: "Macro", name: "매크로 (100mm) - 극접사", en: "shot on 100mm macro lens, extreme close-up, focus stacking, infinite depth of field, edge-to-edge sharp focus, entirely in focus" },
  ],
  intensities: [{ id: "Low", name: "Subtle (미세)", en: "ultra-subtle refined details" }, { id: "Mid", name: "Balanced (표준)", en: "refined balanced finish" }, { id: "High", name: "High-Detail (고밀도)", en: "dense intricate macro detailing" }],
  backgrounds: [
    { id: "RealBlack", name: "Deep Black (Matte)", en: "Pure solid #000000 matte black void, completely clean background" },
    { id: "StudioGray", name: "Neutral Gray", en: "Professional neutral gray with subtle depth" },
    { id: "PureWhite", name: "High-Key White", en: "Pristine white studio background" },
    { id: "ChromaGreen", name: "Chroma Green", en: "Pure chroma green screen #00FF00" },
  ],
  fxOrigins: [
    { id: "Edges", name: "가장자리/끝부분 집중", en: "originating strictly from the sharp edges and tips" },
    { id: "Overall", name: "글자 전체를 감싸듯", en: "softly enveloping the entire typography surface" },
    { id: "BetweenLetters", name: "글자 사이를 연결하듯", en: "arcing and intertwining between the gaps of the letters" },
  ],
  fxIntensities: [{ id: "Subtle", name: "Subtle (은은하게)", en: "very subtle, minimalist, restrained" }, { id: "Moderate", name: "Moderate (보통)", en: "balanced, clearly visible but non-overpowering" }, { id: "Intense", name: "Intense (강하게)", en: "intense, highly dynamic, dramatic" }],
  surfaceDetails: [
    { id: "Clean", name: "Clean (완벽히 매끄러움)", en: "perfectly smooth, flawless clean surface, absolutely NO scratches" },
    { id: "Standard", name: "Standard (자연스러운 결)", en: "natural physical surface micro-texture" },
    { id: "High", name: "High (미세 기스 밀도 극대화)", en: "intense micro-details, fine hairline scratches, refined elegant texture, rich tactile finish" },
  ],
  frontReliefs: [
    { id: "Flat", name: "평면형 (Flat)", en: "strictly flat core surface, no carved depth, subtle material treatment" },
    { id: "MicroBevel", name: "미세한 각 (Micro Bevel)", en: "maintaining flat core with sharp crisp angled micro-bevel on edges ONLY, rigid mechanical corners, NO soft rounded bevels, NO deep carving" },
    { id: "HairlineBevel", name: "초미세 칼각 (Hairline Bevel)", en: "microscopic 1px razor-edge highlight, ultra-thin minimal bevel width, sharp crisp boundary" },
    { id: "MicroChiseled", name: "마이크로 치즐링 (Micro-Chiseled)", en: "densely micro-chiseled surface, hundreds of tiny intricate cuts, fine jewelry carving, NO large low-poly facets, NO cheap photoshop bevel" },
    { id: "Crystalline", name: "크리스탈 파셋 (Crystalline)", en: "sharp crystalline geometric facets, deep angular jewel-like cuts, rigid hard-surface ice formations, grand clear facets, NO soft bevels" },
    { id: "ChunkyToy", name: "둥근 덩어리 (Chunky Toy)", en: "soft, thick, rounded chunky toy-like front relief, inflated volume" },
    { id: "SoftRounded", name: "부드러운 곡면 (Soft Rounded)", en: "smooth rounded edges, soft filleted corners, gentle curves, NO sharp edges" },
    { id: "PuffyBalloon", name: "빵빵한 풍선 (Puffy Balloon)", en: "puffy inflated balloon shape, thick and bulging volume, overly rounded toy-like form" },
  ],
  projectionDepths: [
    { id: "None", name: "최소 돌출 (Minimal)", en: "[PROJECTION: MINIMAL] solid structural body with minimal side thickness, absolutely no deep rear 3D extrusion, no heavy perspective block. All dimensional depth must exist exclusively on the front-face." },
    { id: "Shallow", name: "얇은 돌출 (Shallow)", en: "[PROJECTION: SHALLOW] very thin shallow backward 3D extrusion, subtle slim side thickness, minimal perspective, NO heavy blocks." },
    { id: "Block", name: "블록 돌출 (Blocky)", en: "[PROJECTION: BLOCKY] Solid structural block thickness, distinct side planes and 3D perspective." },
    { id: "Monumental", name: "거대 돌출 (Epic 3D)", en: "[PROJECTION: MONUMENTAL] Massive cinematic backward 3D extrusion, epic perspective depth, deep architectural volume." },
  ],
  surfaceTreatments: [{ id: "Standard", name: "Standard (표준)", en: "standard physical surface reaction" }, { id: "SmoothFillet", name: "둥근 굴곡 (Smooth)", en: "elegant smooth filleted transitions" }, { id: "MultiFaceted", name: "다각 면치기 (Faceted)", en: "highly luminous angular geometric facets" }, { id: "HammeredFinish", name: "망치 자국 (Hammered)", en: "hand-hammered dimpled organic surface" }, { id: "BrushedMetal", name: "직선 브러시 결 (Linear Brushed)", en: "straight linear horizontal brushed metal finish, perfectly parallel brushed lines, NO circular brushing, NO radial patterns" }],
  energyCores: [
    { id: "None", name: "없음 (None)", en: "no surrounding FX" },
    { id: "GoldenDust", name: "황금 가루 흩뿌림", en: "glowing golden dust and scattering sparks" },
    { id: "ColdMist", name: "냉기와 안개 흐름", en: "rising cold mist and flowing icy vapor" },
    { id: "Sparkling", name: "반짝이는 빛/광택", en: "sparkling light effects and intense glossy lens flares" },
    { id: "Electricity", name: "흐르는 전류/스파크", en: "flowing static electricity and micro lightning arcs" },
    { id: "MicroParticles", name: "미세 파티클 발산", en: "emitting luminous micro floating particles" },
    { id: "MagmaEmbers", name: "불티와 아지랑이", en: "No flames, only very subtle glowing dust and faint residual heat shimmer at sharp edges" },
    { id: "DarkAura", name: "다크 오라", en: "subtle dark wispy shadowy aura creeping tightly" },
    { id: "ConfettiPop", name: "색종이 폭죽 (Confetti)", en: "bursting colorful confetti and party ribbons" },
    { id: "SoapBubbles", name: "비눗방울 (Bubbles)", en: "floating iridescent soap bubbles" },
    { id: "PastelAura", name: "파스텔 오라 (Pastel Aura)", en: "soft glowing pastel gradient aura, dreamy atmosphere" },
  ],
  materials: [
    { id: "HyperChrome", name: "하이퍼 크롬 (Mirror)", en: "High-contrast bright liquid mirror chrome" },
    { id: "MatteGold", name: "무광 골드 (Matte Gold)", en: "Hardened premium matte gold metal finish, solid metallic structure" },
    { id: "RoughStone", name: "거친 석재 (Rough Stone)", en: "Raw porous rough stone texture" },
    { id: "VolcanicRock", name: "단단한 화산암 (Volcanic Rock)", en: "Solid dark hardened volcanic rock, deep porous texture, physically un-meltable structure" },
    { id: "FrostedGlass", name: "반투명 유리 (Frosted)", en: "Frosted sandblasted glass" },
    { id: "IceCrystal", name: "단단한 빙결 수정 (Ice Crystal)", en: "Solid opaque ice crystal, frosted surface, crisp structural edges, completely opaque core" },
    { id: "Obsidian", name: "옵시디언 (Obsidian)", en: "Ultra-glossy jet black volcanic glass" },
    { id: "GothicSteel", name: "고딕 강철 (Hardened Steel)", en: "Cold hardened surgical steel" },
    { id: "AntiqueGold", name: "앤틱 골드 (Antique Gold)", en: "Aged and darkened rich antique gold" },
    { id: "GlossyPlastic", name: "유광 플라스틱 (Glossy Plastic)", en: "smooth high-gloss shiny plastic, designer art toy material, flawless reflections" },
    { id: "SoftSilicone", name: "무광 실리콘 (Soft Silicone)", en: "soft matte silicone, velvet touch finish, smooth pastel aesthetic" },
    { id: "GummyJelly", name: "반투명 젤리 (Gummy Jelly)", en: "translucent squishy gummy jelly, subsurface scattering, soft inner glow" },
    { id: "FoilBalloon", name: "호일 풍선 (Foil Balloon)", en: "inflated mylar foil balloon material, wrinkled seams, highly reflective puffy metallic film" },
    { id: "FluffyFabric", name: "플러시 인형 (Fluffy Plush)", en: "soft fluffy plush fabric, hairy fuzzy texture, stuffed animal material" },
  ],
  dramaticTextures: [
    { id: "None", name: "None (매끄러움)", en: "flawless polished uniform material" },
    { id: "Auto", name: "AI 자율 (Auto)", en: "organically embedded detailed textures" },
    { id: "MicroGrain", name: "미세 입자결 (Micro Grain)", en: "ultra-fine brushed metal grain, intricate microscopic surface texture, highly refined elegant finish" },
    { id: "AncientErosion", name: "고대 풍화/부식 (Erosion)", en: "heavily eroded ancient surface, deep oxidized patina, chipped and weathered organic degradation, physically integrated into the core material, NO written text, NO runes" },
    { id: "ExplosiveFracture", name: "정교한 균열 (Fracture)", en: "Micro-detailed sharp fractures physically integrated into the core material" },
    { id: "GlowingVeins", name: "은은한 발광 맥 (Glowing Veins)", en: "Subtle glowing veins deeply etched into the solid core material, strictly contained inner glow, NO outer melting" },
    { id: "Damascus", name: "다마스쿠스 (Flow)", en: "swirling organic layered ripples" },
    { id: "GlitterDust", name: "글리터/펄 (Glitter)", en: "densely packed sparkling glitter dust embedded in the surface" },
    { id: "SugarCoating", name: "설탕 코팅 (Sugar Sanded)", en: "coated with semi-translucent sugar crystals, sour patch texture" },
  ],
  rimThicknesses: [{ id: "None", name: "없음 (None)", en: "strictly borderless, seamless organic blending edges, no outline" }, { id: "Hairline", name: "아주 가는선", en: "microscopic elegant thin edge highlight, organic and uneven" }, { id: "Normal", name: "보통 테두리", en: "solid structural outer edge, physically carved border with dynamic thickness, NOT a uniform stroke" }],
  wearLevels: [{ id: "None", name: "새것 (Pristine)", en: "factory-new flawless state" }, { id: "MicroScratches", name: "미세 기스 (Light Wear)", en: "subtle surface micro-abrasions" }, { id: "TimeWorn", name: "세월의 흔적 (Time-Worn)", en: "aged and weathered patina" }, { id: "BattleDamage", name: "전투 흔적 (Battle-Damaged)", en: "heavy battle-worn damage, deep structural scars, sword cuts, severely chipped and dented edges" }],
  rimColors: [
    { id: "None", name: "없음 (None)", en: "no secondary rim light" },
    { id: "White", name: "퓨어 화이트", en: "clean sharp neutral white rim light" },
    { id: "Blue", name: "아이스 블루", en: "cold piercing bright blue rim light" },
    { id: "Amber", name: "엠버 오렌지", en: "warm glowing intense orange rim light" },
    { id: "MutedGold", name: "차분한 웜골드", en: "desaturated muted gold rim light, subtle elegant warm edge highlight" },
    { id: "NeonPink", name: "네온 핑크", en: "vibrant highly saturated neon pink rim light" },
    { id: "Cyan", name: "사이버 사이언", en: "vibrant cyber cyan bright rim light" },
    { id: "BloodRed", name: "블러드 레드", en: "deep dark blood crimson red rim light" },
    { id: "SoftPurple", name: "뮤트 퍼플", en: "soft desaturated purple rim light, atmospheric purple edge glow" },
    { id: "PastelPink", name: "파스텔 핑크", en: "soft pastel pink rim light" },
    { id: "MintGreen", name: "민트 그린", en: "fresh pastel mint green rim light" },
    { id: "NeonYellow", name: "네온 옐로우", en: "vibrant pop neon yellow rim light" },
  ],
  rimIntensities: [
    { id: "Subtle", name: "은은하게 (Subtle)", en: "very faint and subtle" },
    { id: "Moderate", name: "보통 (Moderate)", en: "clear and balanced" },
    { id: "Strong", name: "강렬하게 (Strong)", en: "intense and bright" },
  ],
  cameraMotions: [
    { id: "Static", name: "고정 (Static)", en: "completely static camera, locked off shot on tripod, ZERO zoom in, ZERO zoom out, fixed text scale, absolutely NO camera movement" },
    { id: "SlowZoom", name: "천천히 줌인 (Slow Zoom)", en: "very slow cinematic push in, subtle zoom" },
    { id: "Orbit", name: "가벼운 궤도 회전 (Orbit)", en: "subtle slow parallax orbit, shifting perspective slightly" },
  ],
  motionDynamics: [{ id: "Flowing", name: "부드럽게 흐름 (Flowing)", en: "elegant slow flowing motion, highly viscous and smooth dynamics" }, { id: "Turbulent", name: "거칠게 휘몰아침 (Turbulent)", en: "aggressive turbulent motion, fast swirling particles, high energy dynamics" }, { id: "Pulsating", name: "맥동/호흡 (Pulsating)", en: "rhythmic pulsating glow, glowing intensely then fading smoothly" }, { id: "SeamlessLoop", name: "무한 반복 (Seamless Web Loop)", en: "perfectly seamless loop, ending exactly where it begins, consistent infinite motion" }],
};
