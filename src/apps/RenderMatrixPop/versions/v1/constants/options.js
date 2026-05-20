/* eslint-disable */
// v1 전용 정적 옵션 사전 (격리 사본).

export const DIRECTOR_PERSONAS = [
    { id: "AutoRef", name: "🖼️ 레퍼런스 무드 (Auto)", desc: "레퍼런스의 장르와 분위기를 100% 그대로 복사", discipline: "MINDSET: 'Match the reference vibe completely'", mj_tags: "", auditRules: { outlineReq: false, depthSafe: false } },
    { id: "CasualUI", name: "📱 모바일 게임 UI 디자이너", desc: "모바일 화면에서 한눈에 띄는 명확하고 경쾌한 타이틀", discipline: "MINDSET: 'Is this highly readable and fun?' PRIORITY: 1. Clarity 2. Brightness 3. Friendly Shapes", mj_tags: "casual mobile game UI logo typography, bright clear cheerful colors, highly legible, clean vector art style, playful energy", auditRules: { outlineReq: true, depthSafe: true } },
    { id: "Sticker", name: "✨ 스티커 공방 장인", desc: "다꾸 스타일의 두꺼운 외곽선과 플랫 컬러", discipline: "MINDSET: 'Can I peel this off and stick it?' PRIORITY: 1. Bold Outline 2. Flat Pop Colors 3. Die-cut Feel", mj_tags: "die-cut sticker graphic design, kawaii cute sticker typography, 2d vector flat style, bold graphic composition", auditRules: { outlineReq: true, depthSafe: false } },
    { id: "Toy", name: "🧸 장난감 연구소장", desc: "피규어나 장난감처럼 통통하고 매끄러운 플라스틱 재질", discipline: "MINDSET: 'Does this feel like a premium blind-box toy?' PRIORITY: 1. Smooth Plastic 2. Soft Gloss 3. Puffy Volume", mj_tags: "designer vinyl toy aesthetic, 3d soft plastic render, smooth rounded glossy typography, bright playful studio lighting", auditRules: { outlineReq: false, depthSafe: true } },
    { id: "Candy", name: "🍬 달콤한 디저트 셰프", desc: "사탕, 젤리, 크림 같은 쫀득하고 투명한 재질감", discipline: "MINDSET: 'Does this look delicious and sweet?' PRIORITY: 1. Translucent Material 2. High Gloss 3. Vibrant Candy Colors", mj_tags: "sweet gummy jelly material, translucent candy text, creamy pastel glossy highlights, delicious 3d food typography", auditRules: { outlineReq: false, depthSafe: true } },
    { id: "Monster", name: "🧟 몬스터 크루 (Halloween)", desc: "슬라임, 호박, 괴물 느낌의 팝한 할로윈/몬스터 타이틀", discipline: "MINDSET: 'Is it spooky but vibrant and cute?' PRIORITY: 1. Slime/Goo 2. Toxic Colors 3. Playful Spooky", mj_tags: "playful spooky monster game typography, gooey slime drips, vibrant toxic colors, halloween pop art style", auditRules: { outlineReq: false, depthSafe: true } }
];

export const AI_MODELS = [{ id: 'NanoBanana', name: 'NanoBanana' }, { id: 'ChatGPT', name: 'ChatGPT' }, { id: 'Midjourney', name: 'Midjourney' }];

export const PRESET_GROUPS = [
    {
        id: "pop",
        icon: "🌟",
        name: "팝 & 스티커",
        presets: [
            { id: "pop_sticker", label: "다꾸 스티커 팝", settings: { directorPersona: "Sticker", shapeFeel: "SoftRounded", shapeFidelity: "Strict", baseStyle: "FlatColor", colorPalette: "VividPop", outlineStyle: "ThickSticker", depthStyle: "StickerLift", fxStyle: "Sparkle", background: "Transparent", userIntent: "모바일 게임 배너나 다이어리에 붙이는 스티커처럼 팝하고 귀여운 스타일." } },
            { id: "pop_retro", label: "레트로 아케이드", settings: { directorPersona: "CasualUI", shapeFeel: "Original", shapeFidelity: "Strict", baseStyle: "SoftPlastic", colorPalette: "CoolFresh", outlineStyle: "DoubleOutline", depthStyle: "Puffy25D", fxStyle: "StarPop", background: "SolidPop", userIntent: "90년대 오락실 아케이드 게임 타이틀 느낌." } },
        ]
    },
    {
        id: "sweet",
        icon: "🍬",
        name: "스위트 & 토이",
        presets: [
            { id: "sweet_jelly", label: "과일 젤리", settings: { directorPersona: "Candy", shapeFeel: "Balloon", shapeFidelity: "Strict", baseStyle: "Jelly", colorPalette: "RainbowCandy", outlineStyle: "None", depthStyle: "SoftShadow", fxStyle: "Bubble", background: "PastelGradient", userIntent: "말랑말랑하고 투명한 과일 젤리 재질." } },
            { id: "toy_plastic", label: "비닐 토이 플라스틱", settings: { directorPersona: "Toy", shapeFeel: "SoftRounded", shapeFidelity: "Strict", baseStyle: "GlossyToy", colorPalette: "WarmCute", outlineStyle: "None", depthStyle: "Puffy25D", fxStyle: "None", background: "SolidPop", userIntent: "프리미엄 블라인드 박스 장난감 같은 매끄러운 플라스틱 로고." } },
            { id: "pop_chrome", label: "캐주얼 팝 크롬", settings: { directorPersona: "CasualUI", shapeFeel: "Original", shapeFidelity: "Strict", baseStyle: "PopChrome", colorPalette: "VividPop", outlineStyle: "None", depthStyle: "Chunky3D", fxStyle: "Sparkle", background: "SolidPop", userIntent: "화려하고 쨍한 캐주얼 액션 게임 타이틀." } },
            { id: "toxic_monster", label: "몬스터 슬라임", settings: { directorPersona: "Monster", shapeFeel: "Original", shapeFidelity: "Relaxed", baseStyle: "ToxicSlime", colorPalette: "VividPop", outlineStyle: "OrganicBorder", depthStyle: "Chunky3D", fxStyle: "SlimeDrips", background: "Transparent", userIntent: "할로윈 몬스터 느낌. 위쪽은 밝은 녹색 슬라임이 흐르고 아래쪽은 단단한 보라색 블록으로 분리된 느낌." } }
        ]
    }
];

export const EDIT_BUDGETS = [
    { id: "Locked", name: "Strict Shape (완벽 보존)", en: "Strict shape lock, preserved exact typography silhouette, purely texture swap" },
    { id: "Playful", name: "Playful Remix (둥글기 허용)", en: "Playful remix, soften edges slightly, maintain readability but add cute volume" },
    { id: "Distorted", name: "Surface Glitch/Goo (표면 변형)", en: "Strict shape lock for core readability, apply stylistic glitch, sliced edges, or melting goo ON THE SURFACE AND EDGES, do NOT shatter the main structure" }
];

export const QUICK_ADJUSTMENTS = [
    { id: "MAKE_JELLY", label: "🍬 투명한 젤리로 굽기", desc: "재질을 투명하고 달콤한 젤리 텍스처로 변경합니다.", action: { directorPersona: "Candy", baseStyle: "Jelly", outlineStyle: "None", shapeFidelity: "Strict" } },
    { id: "MAKE_STICKER", label: "🏷️ 두꺼운 스티커로 만들기", desc: "다꾸 스티커처럼 두꺼운 흰색 외곽선과 그림자를 추가합니다.", action: { directorPersona: "Sticker", outlineStyle: "ThickSticker", depthStyle: "StickerLift", baseStyle: "FlatColor", shapeFidelity: "Strict" } },
    { id: "MAKE_CHROME", label: "⚡ 쨍한 팝 크롬으로 변경", desc: "화려한 크롬 광택과 두꺼운 3D 볼륨을 줍니다.", action: { directorPersona: "CasualUI", baseStyle: "PopChrome", depthStyle: "Chunky3D", outlineStyle: "None", shapeFidelity: "Strict" } },
    { id: "MAKE_SLIME", label: "🧪 몬스터 슬라임 적용", desc: "글자에 점액질이 묻고 상/하단 재질이 대비되게 합니다.", action: { directorPersona: "Monster", baseStyle: "ToxicSlime", depthStyle: "Chunky3D", outlineStyle: "OrganicBorder", fxStyle: "SlimeDrips", shapeFidelity: "Relaxed" } }
];

export const EDIT_QUICK_ADJUSTMENTS = [
    { id: "EDIT_JELLY", label: "🍬 투명한 젤리로 덮어쓰기", desc: "기존 형태를 유지하면서 투명한 젤리 재질로 리믹스합니다.", action: { editBaseStyle: "Jelly", activeEditIntents: { material: true, color: false, outline: false, vfx: false } } },
    { id: "EDIT_STICKER", label: "🏷️ 스티커 외곽선 추가", desc: "기존 로고 주변에 굵은 스티커 외곽선을 추가합니다.", action: { editOutlineStyle: "ThickSticker", activeEditIntents: { material: false, color: false, outline: true, vfx: false } } },
    { id: "EDIT_ORGANIC", label: "🪨 비정형 자연스런 입체", desc: "기계적인 흰선을 없애고 불규칙하고 역동적인 입체 효과를 줍니다.", action: { editOutlineStyle: "OrganicBorder", activeEditIntents: { material: false, color: false, outline: true, vfx: false } } },
    { id: "EDIT_FACETED", label: "💎 정밀 다각면 세공", desc: "보석이나 메탈처럼 날카롭게 세공된 3D 엣지를 줍니다.", action: { editBudget: "Locked", editOutlineStyle: "None", editFxStyle: "None", activeEditIntents: { material: false, color: false, outline: true, vfx: false } } }
];

export const staticOptions = {
    shapeFeels: [
        { id: "Original", name: "원본 유지 (Original)", en: "maintain exact original typography silhouette" },
        { id: "SoftRounded", name: "살짝 둥근 각 (Soft Rounded)", en: "soft rounded friendly corners, smooth surface treatment" },
        { id: "Balloon", name: "풍선형 빵빵함 (Balloon)", en: "inflated balloon surface volume, extremely puffy and round" },
        { id: "ClayLike", name: "찰흙 뭉치 (Clay-like)", en: "hand-sculpted organic clay surface, slightly imperfect but cute" }
    ],
    fidelityLevels: [
        { id: "Strict", name: "Strict (형태 완벽 보존)", en: "STRICT RULE: PRESERVE EXACT ORIGINAL TYPOGRAPHY SHAPE. NO TEXT MUTATION. perfectly clear spelling." },
        { id: "Relaxed", name: "Relaxed (표면 왜곡 허용)", en: "STRICT RULE: Maintain core readability and main silhouette. Apply stylistic glitch, sliced effects, or melting slime drips on the surface and edges. Do NOT completely shatter or destroy the typography." }
    ],
    baseStyles: [
        { id: "AutoRef", name: "🖼️ 레퍼런스 질감 (Auto)", en: "" },
        { id: "FlatColor", name: "플랫 컬러 (Flat Color)", en: "clean flat vector color design, 2d shading, no complex 3d materials" },
        { id: "GlossyToy", name: "유광 장난감 (Glossy Toy)", en: "smooth glossy plastic material, vinyl designer toy texture, bright specular highlights" },
        { id: "SoftPlastic", name: "무광 장난감 (Soft Plastic)", en: "soft matte plastic material, clean uniform surface, no harsh reflections" },
        { id: "Jelly", name: "달콤한 젤리 (Jelly)", en: "translucent gummy jelly material, subsurface scattering, sweet candy texture, glowing edges" },
        { id: "Candy", name: "반짝이는 사탕 (Hard Candy)", en: "hard glossy candy material, bright reflections, colorful swirls" },
        { id: "Clay", name: "소프트 클레이 (Clay)", en: "soft matte clay 3d render, playdough texture, tactile and warm" },
        { id: "Paper", name: "겹친 종이 (Paper Cutout)", en: "layered paper cutout craft, pastel cardboard material" },
        { id: "Bubble", name: "비누방울 (Bubble)", en: "iridescent clear soap bubble material, fragile and reflective" },
        { id: "PopChrome", name: "팝 크롬 (Bright Chrome)", en: "bright high-contrast chrome material, glossy metallic but casual and highly stylized, sharp specular highlights, vibrant bounce light" },
        { id: "PopGold", name: "팝 골드 (Shiny Gold)", en: "shiny polished gold material, vibrant and rich, smooth metallic pop finish, wealthy casino/casual game vibe" },
        { id: "ToxicSlime", name: "맹독 슬라임 (Toxic Slime)", en: "gooey dripping toxic slime material, wet and glossy, melting thick liquid surface physically integrated into the letters" }
    ],
    colorPalettes: [
        { id: "AutoRef", name: "🎨 레퍼런스 색상 (Auto)", en: "" },
        { id: "VividPop", name: "비비드 팝 (Vivid Pop)", en: "vivid pop colors, highly saturated cheerful palette, primary colors" },
        { id: "PastelDream", name: "파스텔 드림 (Pastel)", en: "soft dreamy pastel colors, baby pink and baby blue, gentle harmonious palette" },
        { id: "RainbowCandy", name: "무지개 캔디 (Rainbow)", en: "colorful rainbow gradient palette, vibrant candy colors" },
        { id: "CoolFresh", name: "쿨 앤 프레쉬 (Cool Fresh)", en: "cool fresh color palette, mint green, cyan, bright blue, refreshing summer vibe" },
        { id: "WarmCute", name: "웜 앤 코지 (Warm Cute)", en: "warm cozy cute colors, sunny yellow, orange, peach, friendly palette" }
    ],
    outlineStyles: [
        { id: "None", name: "외곽선 없음 (None)", en: "clean edges with no outline stroke" },
        { id: "OrganicBorder", name: "비정형 자연스런 테두리 (Organic)", en: "dynamic uneven thickness outline, chunky irregular border, organic hand-drawn edges, NO uniform stroke, NO artificial white outline" },
        { id: "CleanStroke", name: "깔끔한 스트로크 (Clean Stroke)", en: "crisp clean vector outline stroke wrapping the text" },
        { id: "ThickSticker", name: "두꺼운 스티커 흰선 (Sticker)", en: "thick solid white sticker outline border wrapping the entire text mass cleanly" },
        { id: "DoubleOutline", name: "이중 외곽선 (Double Outline)", en: "thick double colored outline border, arcade game title style" },
        { id: "SoftShadowOutline", name: "소프트 섀도우 경계", en: "soft colored shadow acting as an outline, fuzzy warm border" }
    ],
    depthStyles: [
        { id: "Flat2D", name: "플랫 2D (Flat 2D)", en: "strictly flat 2D graphic, no 3D extrusion, no perspective depth" },
        { id: "OrganicBevel", name: "비정형 조각 입체 (Organic Carved)", en: "irregular chunky 3D bevels, organic asymmetrical facets, uneven hand-carved depth, dynamic changing extrusion, NO flat uniform bevel" },
        { id: "FacetedBevel", name: "💎 정밀 다각면 세공 (Faceted Chiseled)", en: "sharp angled faceted cuts, high-end jewelry chiseling, complex geometric angular relief, diamond-like precision metallic bevel" },
        { id: "SoftShadow", name: "바닥 그림자 (Drop Shadow)", en: "flat graphic with a soft contact drop shadow grounding it to the surface, avoiding floating look" },
        { id: "StickerLift", name: "스티커 입체 (Sticker Lift)", en: "flat text lifted slightly off the background like a thick paper sticker, hard drop shadow" },
        { id: "Puffy25D", name: "빵빵한 2.5D (Puffy 2.5D)", en: "chunky 2.5D isometric depth, front-facing but with cute puffy volume and thick cute sides, soft ambient occlusion at the base" },
        { id: "Chunky3D", name: "청키 3D (Heavy Extrusion)", en: "chunky bold 3D extrusion, vibrant colored side walls, NO muddy dark shadows, heavy volume typical of bold casual game titles" },
        { id: "LayeredPaper", name: "겹친 종이 단차 (Layered)", en: "multiple 2D flat layers stacked with subtle shadows between them" }
    ],
    fxStyles: [
        { id: "None", name: "이펙트 없음 (Clean)", en: "no surrounding visual effects, clean isolation" },
        { id: "Sparkle", name: "반짝임 (Sparkle Pop)", en: "cute cartoon sparkles and 2d starbursts popping around the text" },
        { id: "Confetti", name: "색종이 조각 (Confetti)", en: "colorful party confetti floating dynamically around the subject" },
        { id: "Bubble", name: "비누방울 (Bubbles)", en: "playful translucent soap bubbles floating gently" },
        { id: "StarPop", name: "입체 별 (3D Stars)", en: "cute rounded 3d star icons floating in the background" },
        { id: "HeartPop", name: "입체 하트 (3D Hearts)", en: "cute rounded 3d heart icons floating in the background" },
        { id: "MagicDust", name: "마법 가루 (Magic Dust)", en: "soft glowing pastel magic dust and luminous light motes" },
        { id: "SlimeDrips", name: "밀착 슬라임 뚝뚝 (Slime Drips)", en: "dripping slime physically attached to the typography, gooey liquid melting down from the text edges, NO floating background slime" },
        { id: "Glitch", name: "글리치/홀로그램 (Glitch)", en: "cyberpunk glitch hologram effects, chromatic aberration, digital artifacts scattered around" }
    ],
    backgrounds: [
        { id: "Transparent", name: "투명/알파배경 (Alpha)", en: "pure solid white background for easy masking, isolated subject, NO background clutter, strictly clean solid background" },
        { id: "ChromaGreen", name: "크로마키 그린 (누끼용)", en: "solid chroma key green screen background (#00FF00), crisp high-contrast edges for easy keying, NO background noise, strictly clean solid background" },
        { id: "DeepViolet", name: "다크 바이올렛 (Dark Solid)", en: "solid deep violet studio background, subject is grounded with a soft contact shadow and subtle ambient color bounce, strictly clean solid background" },
        { id: "SolidPop", name: "단색 팝 컬러 (Solid Pop)", en: "clean flat pop color background contrasting the main text, soft contact shadow to prevent floating, strictly clean solid background" },
        { id: "PastelGradient", name: "파스텔 그라디언트", en: "soft dreamy pastel gradient background, completely clean" },
        { id: "PolkaDots", name: "도트 패턴 (Polka Dots)", en: "cute pop art polka dot pattern background" },
        { id: "ConfettiPattern", name: "축제 패턴 (Confetti)", en: "festive flat confetti pattern background" }
    ],
    typographyScales: [
        { id: "Macro", name: "대형 로고 (Macro)", en: "macro frame, highly detailed center subject, big bold typography" },
        { id: "Dense", name: "작은 텍스트 보호 (Legibility)", en: "highly legible and clean typography, optimized for small mobile screens, simplified details to maintain extreme readability, crisp boundaries" }
    ]
};
