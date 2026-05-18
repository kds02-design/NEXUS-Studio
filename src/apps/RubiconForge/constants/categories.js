// RubiconForge 정적 옵션 사전 + 헬퍼.
// 원본 index.jsx 의 AI_MODELS, assetStyleModifiers, staticOptions, getOption* 헬퍼를 그대로 이전.

export const AI_MODELS = [
  { id: 'NanoBanana', name: 'NanoBanana' },
  { id: 'ChatGPT', name: 'ChatGPT' },
  { id: 'Midjourney', name: 'Midjourney' },
];

export const assetStyleModifiers = {
  MegaCTA: "large dominant CTA, high contrast, strong clickable presence, premium conversion-focused button",
  Secondary: "smaller restrained secondary button, clean readable shape, minimal decoration",
  Floating: "floating separated element with soft depth, clean drop shadow, strong separation from background",
  PromoSticker: "bold sticker badge, playful emphasis, high visibility promotional mark",
  TrustTag: "reliable trust tag, certification badge, official and elegant look",
  HeroItem: "hero reward object, premium high-detail centerpiece, very eye-catching",
  SubItem: "simple supporting reward icon, lower visual complexity, supplementary item",
  RewardBoard: "ornate event reward board, elaborate presentation panel, clear sections",
  EventTitle: "decorative event title ribbon, grand announcement header, epic scale",
  InfoBox: "clean information box panel, readable layout, subtle framing for text"
};

export const staticOptions = {
  themeDna: [
    { id: "LineageDarkRoyal", name: "리니지 다크 로열 (다크/골드)", en: "Dark fantasy royal theme, dark slate and rich brown background, heavy gold frames, deep red gems, classic MMORPG style" },
    { id: "ImperialBronze", name: "임페리얼 브론즈 (세피아/고풍)", en: "Imperial bronze theme, aged metallic textures, warm sepia tones, historical grand strategy game vibe" },
    { id: "CrimsonSiege", name: "크림슨 시즈 (혈맹/전쟁)", en: "Crimson siege theme, dark blood red tones, dark iron forged metal, aggressive and epic war aesthetic" },
    { id: "ModernFlatBrand", name: "모던 플랫 브랜드 (IT/테크)", en: "Modern flat brand theme, clean solid colors, sharp vector edges, contemporary IT product promo style" },
    { id: "SoftPastel3D", name: "소프트 파스텔 3D (캐주얼/팝)", en: "Trendy soft 3D clay aesthetic, bright pastel colors, smooth diffuse lighting, cute pop promo style" }
  ],
  assetTypes: [
    { id: "Button", name: "Button (사전예약, 참여 등)", en: "Promotional CTA Button" },
    { id: "UtilityButton", name: "Utility Button (유의사항, 조회)", en: "Clean Utility Button" },
    { id: "RewardCard", name: "Reward Card (보상/아이템)", en: "Reward Showcase Card" },
    { id: "FeatureCard", name: "Feature Card (기능/스펙 설명)", en: "Event Feature Info Card" },
    { id: "EventPanel", name: "Event Panel (안내/이벤트 박스)", en: "Information Event Panel" },
    { id: "SplitPanel", name: "Split Panel (분할 레이아웃)", en: "Two-Column Split Event Panel" },
    { id: "HeaderTab", name: "Header Tab (상단 타이틀 탭)", en: "Title Header Tab Ribbon" },
    { id: "BadgeStamp", name: "Badge / Stamp (NEW, 도장)", en: "Accent Badge or Stamp" },
    { id: "DecoPart", name: "Decorative Part (코너장식, 받침)", en: "Supplemental Decorative Element" }
  ],
  layoutArchetypes: [
    { id: "SingleFocal", name: "단일 초점 (버튼/배지/장식)", en: "Single Focal Object" },
    { id: "FocalPlusDesc", name: "중앙 심벌 + 하단 설명 (보상카드)", en: "Center Showcase + Bottom Description" },
    { id: "HeaderFocalFooter", name: "상단탭 + 중앙심벌 + 하단설명", en: "Header Tab + Center Focal Object + Footer Copy" },
    { id: "HeaderGrid", name: "상단탭 + 그리드 아이템 (페이백)", en: "Header Tab + Grid Reward Layout" },
    { id: "SplitTwoColumn", name: "좌/우 영역 분할 (이중 정보)", en: "Split Two-Column Layout" }
  ],
  slotStructures: [
    { id: "CenterCTA", name: "중앙 텍스트 전용 (버튼)", en: "Center zone reserved strictly for large CTA typography" },
    { id: "TopObjectBottomText", name: "상단 오브젝트, 하단 텍스트 (카드)", en: "Top zone for focal 3D object, bottom safe zone for description text" },
    { id: "HeaderBodyFooter", name: "헤더 + 바디 + 푸터 (패널)", en: "Top header title zone, large blank center body zone, bottom utility text zone" },
    { id: "LeftTextRightObject", name: "좌측 텍스트, 우측 오브젝트 (분할)", en: "Left side safe zone for typography, right side for decorative object" },
    { id: "FullBleedGraphic", name: "여백 없는 그래픽 (장식/배지)", en: "Full bleed graphic element, minimal text space needed" }
  ],
  buttonShapes: [
    { id: "PointedHexagon", name: "양끝 뾰족 육각형 (MMO 버튼)", en: "elongated hexagon with sharply pointed left and right ends" },
    { id: "ChamferedRect", name: "모서리 깎인 사각형 (패널/카드)", en: "chamfered rectangle, diagonally cut corners" },
    { id: "TopTabPanel", name: "상단 탭 돌출 패널 (보상 보드)", en: "panel shape with a prominent top tab or header ribbon" },
    { id: "Pill", name: "알약형 (모던 CTA)", en: "pill shape, fully rounded ends" },
    { id: "RoundedRect", name: "둥근 직사각형 (카드 기본)", en: "rounded rectangle shape" },
    { id: "Circle", name: "원형 (도장/배지)", en: "perfect circle shape" },
    { id: "Ribbon", name: "리본형 (타이틀 탭)", en: "classic ribbon banner shape with folded ends" },
    { id: "Pedestal", name: "빛 받침대 (오브젝트 베이스)", en: "circular pedestal or glowing platform base" }
  ],
  buttonRatios: [
    { id: "Standard", name: "표준 (2:1)", en: "standard width, 2:1 aspect ratio", ar: "2:1" },
    { id: "Wide", name: "와이드 띠배너/버튼 (3:1)", en: "wide horizontal strip, 3:1 aspect ratio", ar: "3:1" },
    { id: "Square", name: "정방형 카드/도장 (1:1)", en: "perfectly square, 1:1 aspect ratio", ar: "1:1" },
    { id: "Vertical", name: "세로형 카드 (3:4)", en: "vertical portrait orientation, 3:4 aspect ratio", ar: "3:4" }
  ],
  textSafeZones: [
    { id: "Normal", name: "보통 (표준 여백)", en: "standard blank central area for text" },
    { id: "Wide", name: "넓음 (타이틀/긴 문구용)", en: "wide empty text safe zone in the center" },
    { id: "UltraWide", name: "매우 넓음 (텍스트 최우선)", en: "ultra wide massive empty text safe zone, strictly no center details" },
    { id: "Narrow", name: "좁음 (아이콘/단순 배지용)", en: "small text area, compact center" }
  ],
  outputFormats: [
    { id: "Isolated", name: "투명 PNG 누끼용 (Isolated Component)", en: "A single beautifully detailed isolated component on pure black background, ready for alpha masking" },
    { id: "HeroMockup", name: "히어로 섹션 프리뷰 (Web Mockup)", en: "Component placed within a dramatic campaign hero section mockup presentation" },
    { id: "Kit", name: "에셋 파츠 세트 (Parts Kit)", en: "A sprite sheet containing various decorative variations of the component" }
  ],
  surfaceTreatments: [
    { id: "RoughStone", name: "거친 스톤/대리석 (판타지 패널)", en: "rough medieval stone, rock, or dark marble texture" },
    { id: "Parchment", name: "낡은 양피지/종이 (정보 안내)", en: "old vintage parchment paper texture with burnt edges" },
    { id: "Glossy3D", name: "글로시 3D (시선 집중 보상/버튼)", en: "highly glossy 3D rendered surface with bright specular reflections" },
    { id: "SoftClay", name: "소프트 클레이 (캐주얼 보상/버튼)", en: "soft clay 3D render style, extremely smooth, matte finish" },
    { id: "Flat", name: "완전 평면 (텍스트 가독성 최우선)", en: "strictly flat vector surface, solid fill, perfect for text overlay" }
  ],
  rimThicknesses: [
    { id: "None", name: "테두리 없음", en: "0px border, borderless" },
    { id: "Hairline", name: "아주 얇은 선 (1px)", en: "very thin 1px crisp outline" },
    { id: "Narrow", name: "좁은 프레임 (슬림/심플)", en: "narrow slim stroke frame, tightly contained, non-protruding" },
    { id: "Normal", name: "기본 프레임 (스탠다드)", en: "standard balanced frame weight" },
    { id: "Thick", name: "두꺼운 프레임 (웅장/강조)", en: "bold thick heavy outer frame" }
  ],
  rimMaterials: [
    { id: "OrnateGold", name: "화려한 골드 조각 (판타지 메인)", en: "intricate ornate vintage gold sculpted frame, tightly bounded" },
    { id: "SleekGold", name: "매끄러운 골드 라인 (모던 고급)", en: "sleek polished gold metallic frame, smooth clean edges" },
    { id: "HeavyIron", name: "거친 흑철/무쇠 (다크/서브)", en: "heavy dark iron or gunmetal forged frame with scratches" },
    { id: "SolidColor", name: "단색 라인 (모던/플랫)", en: "solid color vector stroke" },
    { id: "None", name: "재질 없음 (테두리 없음)", en: "no border material" }
  ],
  buttonDecos: [
    { id: "None", name: "장식 없음 (깔끔한 정보 패널)", en: "strictly clean borders with no decorations, maximum text space" },
    { id: "CompactCorner", name: "컴팩트 모서리 장식 (돌출 안됨)", en: "compact internal metallic filigree decorations strictly inside the corners, non-protruding" },
    { id: "CornerOrnaments", name: "화려한 모서리 장식 (클래식)", en: "ornate metallic filigree decorations on the corners" },
    { id: "LightRays", name: "후광/집중선 (보상 카드/메인 CTA)", en: "dramatic light rays or sunburst effect radiating from behind" },
    { id: "FloatingShapes", name: "부유하는 파티클 (신비로움)", en: "small floating magical particles around the object" }
  ],
  energyCores: [
    { id: "None", name: "배경 효과 없음 (깔끔한 누끼용)", en: "absolutely ZERO background lighting, no backglow, pure dark void" },
    { id: "DropShadow", name: "바닥 그림자 (배치용)", en: "clean soft drop shadow beneath the element, NO radiating light" },
    { id: "OuterGlow", name: "아우터 글로우 (발광)", en: "intense colored outer glow radiating from the element" }
  ],
  materials: [
    { id: "VibrantColor", name: "비비드/팝 컬러 (프로모션)", en: "vibrant eye-catching pop solid colors" },
    { id: "PastelTone", name: "파스텔 톤 (브랜드)", en: "soft light pleasant pastel tones" },
    { id: "LuxuryDark", name: "럭셔리 다크 (VIP)", en: "deep premium dark tones with luxurious finish" },
    { id: "Holographic", name: "홀로그래픽 (이벤트)", en: "shiny iridescent holographic foil material" },
    { id: "DarkCrimson", name: "다크 크림슨 (판타지)", en: "deep dark crimson red tones" },
    { id: "DeepAbyss", name: "심연의 네이비 (판타지)", en: "dark abyss navy blue or midnight black" },
    { id: "VintageBrown", name: "빈티지 브라운/세피아", en: "warm dark vintage brown or sepia tones" }
  ],
  dramaticTextures: [
    { id: "None", name: "패턴 없음 (가독성 우수)", en: "clean empty central surface, high text legibility" },
    { id: "Halftone", name: "하프톤/코믹스 (레트로)", en: "comic book style pop-art halftone dot patterns fading subtly" },
    { id: "SparkleGrain", name: "반짝이는 글리터", en: "subtle sparkling glitter or shimmer texture overlay" }
  ],
  rimColors: [
    { id: "White", name: "화이트", en: "pure white", hex: "#ffffff" },
    { id: "BrandYellow", name: "브랜드 옐로우", en: "vibrant brand yellow", hex: "#fbbf24" },
    { id: "PromoRed", name: "프로모션 레드", en: "eye-catching promo red", hex: "#ef4444" },
    { id: "NeonCyan", name: "네온 시안", en: "electric cyan blue", hex: "#06b6d4" },
    { id: "LuxuryGold", name: "럭셔리 골드", en: "premium gold", hex: "#d4af37" }
  ],
  shapeDistortions: [
    { id: "None", name: "왜곡 없음 (깔끔한 배치)", en: "clean standard edges, perfect geometry" },
    { id: "DynamicPerspective", name: "역동적 투시 (3D 팝아웃)", en: "dynamic 3D perspective, slightly angled, popping out of the screen" },
    { id: "SoftOrganic", name: "부드러운 비대칭 (캐주얼)", en: "soft organic blob-like asymmetric shape" }
  ]
};

export const getOptionEn = (list, id) => (list || []).find(o => o.id === id)?.en || String(id);
export const getOptionProp = (list, id, prop) => (list || []).find(o => o.id === id)?.[prop] || null;
export const getOptionName = (list, id, dynamicNames = {}) => {
    const found = (list || []).find(o => o.id === id);
    if (found) return found.name;
    return dynamicNames[id] ? `✨ ${dynamicNames[id]}` : `✨ ${String(id)}`;
};
