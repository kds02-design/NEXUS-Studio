// 재질·조명·돌출·표면 처리·이펙트 등 옵션 정의 (INITIAL_OPTIONS).
// AI 분석/임포트로 동적으로 옵션이 추가될 수 있으므로 'initial' 상태로 관리.

export const INITIAL_OPTIONS = {
  typographyScales: [
    // "macro photography" 는 모델이 접사 줌으로 해석해 글자가 프레임 밖으로 잘리던 표현 → 프레이밍 안전 표현으로 교체.
    { id: "Macro", name: "대형 로고 (Macro)", en: "hyper-detailed large-scale typography, single focal point, entire text fully visible inside the frame with comfortable margins" },
    { id: "Dense", name: "복잡/작은 텍스트 (Dense)", en: "centered composition, medium-wide framing, subject occupies around 50% of the frame, highly legible and clean typography, simplified surface details to maintain readability, crisp clean typographic boundaries, reduced noise" },
  ],
  cameraLenses: [
    { id: "Telephoto", name: "망원 렌즈 (200mm) - 왜곡 제거", en: "shot on 200mm telephoto lens, extreme perspective compression, flat focal plane, strictly zero perspective distortion" },
    { id: "Standard", name: "표준 렌즈 (50mm) - 자연스러운 시야", en: "shot on 50mm standard lens, natural human eye perspective" },
    { id: "Wide", name: "광각 렌즈 (24mm) - 극적인 원근감", en: "shot on 24mm ultra wide angle lens, dramatic perspective distortion, dynamic vanishing point" },
    // "extreme close-up" 은 모델이 줌 크롭으로 해석해 글자가 잘리던 표현 → 디테일 의도만 남기고 교체.
    { id: "Macro", name: "매크로 (100mm) - 극접사", en: "shot on 100mm macro lens for extreme surface detail, focus stacking, infinite depth of field, edge-to-edge sharp focus, entirely in focus, entire text fully visible inside the frame" },
  ],
  intensities: [
    { id: "Low", name: "Subtle (미세)", en: "ultra-subtle refined details" },
    { id: "Mid", name: "Balanced (표준)", en: "refined balanced finish" },
    { id: "High", name: "High-Detail (고밀도)", en: "dense intricate macro detailing" },
  ],
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
  fxIntensities: [
    // 수량 표현 추가 — "subtle" 형용사만으로는 모델이 밀도를 줄이지 않아 과하게 나오던 문제.
    { id: "Subtle", name: "Subtle (은은하게)", en: "very subtle, minimalist, restrained — only a few sparse barely-visible" },
    { id: "Moderate", name: "Moderate (보통)", en: "balanced, clearly visible but non-overpowering" },
    { id: "Intense", name: "Intense (강하게)", en: "intense, highly dynamic, dramatic" },
  ],
  surfaceDetails: [
    { id: "Clean", name: "Clean (완벽히 매끄러움)", en: "perfectly smooth, flawless clean surface, absolutely NO scratches" },
    { id: "Standard", name: "Standard (자연스러운 결)", en: "natural physical surface micro-texture" },
    { id: "High", name: "High (미세 기스 밀도 극대화)", en: "intense micro-details, fine hairline scratches, refined elegant texture, rich tactile finish" },
  ],
  frontReliefs: [
    { id: "Flat", name: "평면형 (Flat)", en: "strictly flat core surface, no carved depth, subtle material treatment" },
    { id: "MicroBevel", name: "미세한 각 (Micro Bevel)", en: "maintaining flat core with sharp crisp angled micro-bevel on edges ONLY, rigid mechanical corners, NO soft rounded bevels, NO deep carving" },
    { id: "HairlineBevel", name: "초미세 칼각 (Hairline Bevel)", en: "microscopic 1px razor-edge highlight, ultra-thin minimal bevel width, sharp crisp boundary" },
    // "미세 컷 텍스처"가 아니라 "얕은 입체 + 각진 면으로 깎인 표면"으로 재정의 (사용자 기대 반영).
    { id: "MicroChiseled", name: "마이크로 치즐링 (Micro-Chiseled)", en: "surface carved into dense small angular chisel-cut facets, shallow low-relief depth, each cut leaving a crisp flat angular face, fine jewelry chisel work with machined precision, NO deep carving, NO large low-poly facets, NO cheap photoshop bevel" },
    // ─── 양각(Raised) 계열 — 음각(깊은 컷)이 배경을 판처럼 칠하는 성질이 있어 양각 위주로 다양화 ───
    { id: "RaisedEmboss", name: "메달 양각 (Raised Emboss)", en: "raised plateau letterforms rising from the front face, flat polished top surface with crisp angled side slopes, coin and medal embossing style, emboss contained strictly inside the letter strokes" },
    { id: "RaisedDome", name: "둥근 양각 (Raised Dome)", en: "smoothly domed convex letterforms rising from the front face, polished rounded emboss like a pressed metal coin, precise metallic dome surface, emboss contained strictly inside the letter strokes" },
    // "면이 큰 각으로 갈라져 명암이 뚝뚝 끊기는" 레퍼런스 룩 — 획 방향 능선 + 대형 평면 분할 명시.
    { id: "RaisedRidge", name: "릿지 양각 (Raised Ridge)", en: "raised roof-like ridge running along the full length of each stroke, positive V cross-section with a crisp continuous apex line, each side reads as one large clean angular plane — strong light/dark value separation between the two faces, blade-like prismatic elegance, machined precision, emboss contained strictly inside the letter strokes" },
    // "deep angular cuts" 가 사선 홈/격자 패턴으로 해석되던 문제 → "미세한 평면 파셋 모자이크" 로 재정의.
    { id: "Crystalline", name: "크리스탈 파셋 (Crystalline)", en: "front surface cut into many small flat crystalline facets at subtly varied angles, fine gem-faceted micro-plane mosaic covering the letterforms, each facet a clean flat plane catching light at a different angle, crisp facet borders, jewelry gem-cutting precision, NO diagonal groove lattice, NO cross-hatch pattern, NO soft bevels, facets contained strictly inside each letter stroke" },
    { id: "DiamondPrism", name: "다이아몬드 프리즘 각 (Diamond Prism)", en: "sharp prismatic beveled edges, deep V-carved angular facets, prominent center ridge, highly reflective diamond-cut geometry, NO flat front face, cuts contained strictly inside each letter stroke, background stays an untouched empty void" },
    { id: "DeepVCarve", name: "V자 음각 릿지 (Deep V-Carve)", en: "deep V-carved angular facets, prominent sharp center ridge running along the center of the strokes, perfectly smooth and flat angled inner walls, highly reflective crisp multi-faceted geometry, NO messy distortion, NO flat front face, cuts contained strictly inside each letter stroke, background stays an untouched empty void" },
    { id: "ChunkyToy", name: "Chunky (도톰한 곡면)", en: "soft, thick, rounded chunky toy-like front relief, inflated balloon volume" },
  ],
  projectionDepths: [
    // 완전 평면 — 기존에 "최소 돌출"에 강제로 얹혀 있던 razor-thin/코인 평면 강제를 분리한 전용 옵션.
    // 최소 돌출은 원래 의미(얇지만 물체다운 몸통 허용)로 복원 → 황금 유물 등 프리셋이 컨셉대로 나옴.
    { id: "Flat2D", name: "완전 평면 (Flat 2D)", en: "[PROJECTION: FLAT-2D] strictly flat 2D graphic with zero thickness, front-face only, razor-thin coin-face rendering." },
    { id: "None", name: "최소 돌출 (Minimal)", en: "[PROJECTION: MINIMAL] solid structural body with minimal side thickness, absolutely no deep rear 3D extrusion, no heavy perspective block. All dimensional depth must exist exclusively on the front-face." },
    { id: "Shallow", name: "얇은 돌출 (Shallow)", en: "[PROJECTION: SHALLOW] very thin shallow backward 3D extrusion, subtle slim side thickness, minimal perspective, NO heavy blocks." },
    { id: "Block", name: "블록 돌출 (Blocky)", en: "[PROJECTION: BLOCKY] Solid structural block thickness, distinct side planes and 3D perspective." },
    { id: "Monumental", name: "거대 돌출 (Epic 3D)", en: "[PROJECTION: MONUMENTAL] Massive cinematic backward 3D extrusion, epic perspective depth, deep architectural volume." },
  ],
  surfaceTreatments: [
    { id: "Standard", name: "Standard (표준)", en: "standard physical surface reaction" },
    { id: "SmoothFillet", name: "둥근 굴곡 (Smooth)", en: "elegant smooth filleted transitions" },
    { id: "MultiFaceted", name: "다각 면치기 (Faceted)", en: "highly luminous angular geometric facets" },
    { id: "HammeredFinish", name: "망치 자국 (Hammered)", en: "hand-hammered dimpled organic surface" },
    { id: "BrushedMetal", name: "직선 브러시 결 (Linear Brushed)", en: "straight linear horizontal brushed metal finish, perfectly parallel brushed lines, NO circular brushing, NO radial patterns" },
  ],
  energyCores: [
    { id: "None", name: "없음 (None)", en: "no surrounding FX" },
    { id: "GoldenDust", name: "황금 가루 흩뿌림", en: "glowing golden dust and scattering sparks" },
    { id: "ColdMist", name: "냉기와 안개 흐름", en: "rising cold mist and flowing icy vapor" },
    { id: "Sparkling", name: "반짝이는 빛/광택", en: "sparkling light effects and intense glossy lens flares" },
    { id: "Electricity", name: "흐르는 전류/스파크", en: "flowing static electricity and micro lightning arcs" },
    { id: "MicroParticles", name: "미세 파티클 발산", en: "emitting luminous micro floating particles" },
    { id: "MagmaEmbers", name: "불티와 아지랑이", en: "No flames, only very subtle glowing dust and faint residual heat shimmer at sharp edges" },
    { id: "DarkAura", name: "다크 오라", en: "subtle dark wispy shadowy aura creeping tightly" },
    // ─── 황금·럭셔리용 드라마틱 이펙트 ───
    { id: "HolyRays", name: "신성 광선 (God Rays)", en: "dramatic volumetric holy light rays radiating from behind the letters, divine golden beams piercing through the gaps between strokes, cathedral light shafts, rays stay strictly behind and around the text without covering the letterforms" },
    { id: "GoldFlakes", name: "금박 파편 부유", en: "delicate gold leaf flakes and gilded shards slowly drifting around the letters, each flake catching the light with tiny brilliant glints, luxurious golden confetti contained near the text" },
    { id: "StarGlints", name: "별빛 글린트 (Star Glints)", en: "a few precise star-shaped four-point light glints flashing on the sharpest edges and corners, jewelry commercial sparkle, cinematic starburst highlights, no hazy lens flare wash" },
  ],
  materials: [
    { id: "HyperChrome", name: "하이퍼 크롬 (Mirror)", en: "High-contrast bright liquid mirror chrome" },
    { id: "PolishedSilver", name: "폴리쉬드 실버 (Polished Silver)", en: "highly polished dark silver metal, pristine reflective chrome surface, elegant gunmetal finish" },
    { id: "DarkTitanium", name: "다크 티타늄 (Dark Titanium)", en: "heavy dark titanium metal, black chrome, extreme high contrast reflections, deep pitch black shadows and brilliant crisp edge highlights, sleek gunmetal finish, absolutely clean surface" },
    // 완전 무광은 금속감(광택·반사)이 죽음 — 새틴 폴리시 베이스 + 엣지/베벨의 거울성 반사로 절충.
    { id: "MatteGold", name: "무광 골드 (Matte Gold)", en: "rich warm 24-karat gold with satin-polished metallic sheen, soft mirror-like reflections sweeping across raised edges and bevels, strong specular response to light, deep saturated golden hue, dense solid precious metal, jewelry-grade refined finish, strong tonal depth between lit faces and shadowed grooves" },
    // 유광·무광의 중간 — 유광의 liquid-metal 반사가 글자의 파인 부분(홈·카운터)을 메꿔버리는
    // 문제의 대안. 형태 보존(홈은 홈대로 열려 있게)을 재질 정의에 내장.
    { id: "SemiGlossGold", name: "세미글로스 골드 (Semi-Gloss)", en: "semi-gloss 24-karat gold with softly polished lustre halfway between matte and mirror, controlled warm reflections that follow the letterform surfaces without flooding them, deep saturated golden hue, every notch, cut, counter and recessed detail of the letterforms stays crisp, open and clearly visible — reflections and highlights NEVER fill in, bridge or smooth over the carved gaps" },
    // "every surface"(측면 암시)·"flawless"(마모 옵션과 모순) 표현 제거 — 돌출 유발 + 마모 무시 원인.
    { id: "PolishedGold", name: "유광 골드 (Polished Gold)", en: "high-gloss mirror-polished 24-karat gold, brilliant liquid-metal reflections flowing across the front face, intense crisp specular highlights, deep saturated warm golden hue with rich amber shadow tones, jewelry-showroom grade polish, luxurious dazzling shine, reflections stay on the surface and never fill in the carved recesses of the letterforms" },
    { id: "GoldFoil", name: "금박 포일 (Gold Foil)", en: "luxurious hot-stamped gold foil, ultra-glossy mirror-like specular reflections, thin metallic foil sheet with subtle crinkled micro-wrinkles catching the light, premium print-finishing aesthetic" },
    { id: "AgedGilt", name: "낡은 금박 (Aged Gilt)", en: "antique gold leaf gilding pressed onto an old bible book cover, extremely thin hand-applied gilt foil, softly dulled warm sheen instead of mirror gloss, edges and high points gently rubbed off and flaked away revealing the darker base underneath, centuries-old gilt lettering aesthetic" },
    { id: "RoughStone", name: "거친 석재 (Rough Stone)", en: "Raw porous rough stone texture" },
    { id: "VolcanicRock", name: "단단한 화산암 (Volcanic Rock)", en: "Solid dark hardened volcanic rock, deep porous texture, physically un-meltable structure" },
    { id: "FrostedGlass", name: "반투명 유리 (Frosted)", en: "Frosted sandblasted glass" },
    { id: "IceCrystal", name: "단단한 빙결 수정 (Ice Crystal)", en: "Solid opaque ice crystal, frosted surface, crisp structural edges, completely opaque core" },
    { id: "Obsidian", name: "옵시디언 (Obsidian)", en: "Ultra-glossy jet black volcanic glass" },
    { id: "GothicSteel", name: "고딕 강철 (Hardened Steel)", en: "Cold hardened surgical steel" },
    { id: "AntiqueGold", name: "앤틱 골드 (Antique Gold)", en: "Aged and darkened rich antique gold" },
  ],
  dramaticTextures: [
    { id: "None", name: "None (매끄러움)", en: "flawless polished uniform material" },
    { id: "Auto", name: "AI 자율 (Auto)", en: "organically embedded detailed textures" },
    { id: "MicroGrain", name: "미세 입자결 (Micro Grain)", en: "ultra-fine brushed metal grain, intricate microscopic surface texture, highly refined elegant finish" },
    { id: "AncientErosion", name: "고대 풍화/부식 (Erosion)", en: "heavily eroded ancient surface, deep oxidized patina, chipped and weathered organic degradation, physically integrated into the core material, NO written text, NO runes" },
    { id: "ExplosiveFracture", name: "정교한 균열 (Fracture)", en: "Micro-detailed sharp fractures physically integrated into the core material" },
    { id: "GlowingVeins", name: "은은한 발광 맥 (Glowing Veins)", en: "Subtle glowing veins deeply etched into the solid core material, strictly contained inner glow, NO outer melting" },
    { id: "FoilLift", name: "들뜬 금박 (Foil Lift)", en: "thin gilt foil partially lifting and peeling away from the surface, delicately curled raised foil edges catching sharp light, tiny air pockets and blisters trapped under the leaf, fragile cracked flakes about to detach, subtle tactile depth from the lifted layer" },
    { id: "Damascus", name: "다마스쿠스 (Flow)", en: "swirling organic layered ripples" },
    { id: "GeometricMilling", name: "정밀 기하학 밀링 (Geometric Milling)", en: "delicate geometric diamond grid micro-engravings, precision-milled high-tech surface pattern" },
  ],
  rimThicknesses: [
    { id: "None", name: "없음 (None)", en: "strictly borderless, seamless organic blending edges, no outline" },
    { id: "Hairline", name: "아주 가는선", en: "microscopic elegant thin edge highlight, organic and uneven" },
    { id: "Normal", name: "보통 테두리", en: "solid structural outer edge, physically carved border with dynamic thickness, NOT a uniform stroke" },
  ],
  wearLevels: [
    { id: "None", name: "새것 (Pristine)", en: "factory-new flawless state" },
    { id: "MicroScratches", name: "미세 기스 (Light Wear)", en: "subtle surface micro-abrasions" },
    // 4단어짜리 약한 표현이라 재질의 폴리시 묘사에 항상 밀리던 문제 — 구체 묘사로 강화.
    { id: "TimeWorn", name: "세월의 흔적 (Time-Worn)", en: "aged and weathered patina, softly dulled sheen on high-touch areas, fine accumulated scratches and small dings from decades of use, oxidized darkening settled into the recesses" },
    { id: "BattleDamage", name: "전투 흔적 (Battle-Damaged)", en: "heavy battle-worn damage, deep structural scars, sword cuts, severely chipped and dented edges" },
  ],
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
  motionDynamics: [
    { id: "Flowing", name: "부드럽게 흐름 (Flowing)", en: "elegant slow flowing motion, highly viscous and smooth dynamics" },
    { id: "Turbulent", name: "거칠게 휘몰아침 (Turbulent)", en: "aggressive turbulent motion, fast swirling particles, high energy dynamics" },
    { id: "Pulsating", name: "맥동/호흡 (Pulsating)", en: "rhythmic pulsating glow, glowing intensely then fading smoothly" },
    { id: "SeamlessLoop", name: "무한 반복 (Seamless Web Loop)", en: "perfectly seamless loop, ending exactly where it begins, consistent infinite motion" },
  ],
};
