/* eslint-disable */
// TypecoreSovereign v1 — Calligraphy Engine V10 단일 파일 통합본.
// 격리 원칙: versions/v1/ 외부 모듈은 services/gemini (공용 API key) 만 사용.
// Shell 안에 마운트되므로 외곽은 h-full (h-screen 금지 — Topbar 52px 영역 잘림).
// 모든 Gemini fetch 는 ?key= 쿼리에 GEMINI_API_KEY 를 직접 부착.
import React, { useState, useRef, useEffect } from 'react';
// lucide-react 1.14.0 는 오래된 버전 — Wand2/Stars/Loader2/CheckCircle2/Layers3/GitCommit/Fingerprint/BoxSelect/ImageIcon
// export 가 없음. 누락된 것은 동등한 아이콘으로 alias 매핑. 미사용 import 는 정리.
import {
  Shield, Droplets, PenTool as PenIcon, Binary, Zap,
  Sun, Moon, ChevronDown, Settings, Brush, Anchor, LayoutTemplate, Activity,
  CloudRain, RotateCw, Scaling, Sticker, FileText, LayoutGrid, Highlighter,
  Menu, Feather, Copy, X, RefreshCcw, Link, Bot, Stamp,
  Layers, SunMedium, Sparkle, HelpCircle, ShieldCheck, Command, Gamepad2,
  Box as BoxIcon, ScanLine as ScanLineIcon,
  Wand as Wand2Icon, Wand as WandMagic,
  Sparkles as SparkleIcon, Sparkles as Stars,
  Loader as Loader2,
  Ghost as GhostIcon,
  Zap as ZapPulse,
  FastForward as FastIcon,
} from 'lucide-react';
import { GEMINI_API_KEY } from '../../services/gemini';

// Gemini 호출 URL — 키를 ?key= 로 부착. 기본 모델은 lib/gemini.js 와 동일하게 2.5-flash.
const GEMINI_MODEL = 'gemini-2.5-flash';
const geminiUrl = () =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// --- 1. 전역 상수 및 유틸리티 ---
const aiOptimizationModels = [
  { id: 'NanoBanana', name: 'Nano Banana 2' },
  { id: 'ChatGPT', name: 'ChatGPT' },
  { id: 'Midjourney', name: 'Midjourney' }
];

const extractJson = (text) => {
  try {
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    let start, end;
    if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
      start = firstBracket;
      end = cleaned.lastIndexOf(']');
    } else if (firstBrace !== -1) {
      start = firstBrace;
      end = cleaned.lastIndexOf('}');
    } else {
      throw new Error("No JSON structure found");
    }
    const jsonStr = cleaned.substring(start, end + 1);
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed[0] : parsed;
  } catch (e) {
    return {};
  }
};

const getOptionEn = (list, id) => {
  if (!Array.isArray(list)) return "";
  const found = list.find(o => o.id === id);
  return found?.en_desc || found?.en || found?.name || "";
};

const dictionary = {
  ko: {
    baseLayout: "기본 레이아웃 및 설정",
    catSpecs: "장르별 핵심 조형",
    strokeDetail: "필획 세부 설정",
    catDetails: "장르별 특화 옵션",
    dynamics: "동세 및 꾸밈",
    ratio: "비율",
    occupancy: "비중 (여백 조절)",
    background: "배경 설정",
    layout: "배치",
    subTheme: "하위 테마 프리셋",
    stemWeight: "뼈대 두께",
    casualWeight: "뼈대 볼륨감",
    casualBounce: "바운스 동세",
    calliBrush: "붓의 종류",
    westernNib: "펜촉의 종류",
    westernStrokeLine: "필선 및 연장선",
    charWidth: "자폭 (Width)",
    charProportion: "글자 비율 (W:H)",
    terminal: "끝 획 마감",
    texture: "경계 질감",
    sharpness: "필선 예리함",
    bending: "획의 꺾임 강도",
    speed: "필속 (갈라짐 제어)",
    extension: "획의 확장성 (Tail)",
    kerning: "자간 밀도",
    slant: "전체 기울기",
    kineticVelocity: "조형적 동세 (Kinetic)",
    slicingIntensity: "절단과 어긋남 (Slicing)",
    damage: "파괴 컨셉 (Damage)",
    specialPlaceholder: "디자인 추가 지시 (예: '중후하고 날카로운 금속의 긴장감')",
    enhanceBtn: "나노바나나 조형미 강화",
    recommendBtn: "AI 스마트 추천 & 셋업",
    resetBtn: "설정 초기화",
    copyBase: "프롬프트 복사",
    translateBase: "한글 번역",
    copyOut: "프롬프트 복사",
    overviewTitle: "최종 조형 프롬프트",
    artisticMode: "조형적 파격 (Artistic)",
    artisticHelp: "엄격한 수치를 넘어 형태적인 재미와 파격적인 구성을 부여합니다. 한 눈에 시선을 잡아끄는 독창적인 실루엣과 조형적 밸런스를 극대화합니다.",
    perfectionMode: "디자인 완성도 (Quality)",
    perfectionHelp: "상용 로고의 조형적 특징을 반영합니다. 기본 폰트 느낌을 완전히 배제하고 고도로 설계된 전문 타이틀 디자인 수준으로 재구성합니다.",
    overDeformationMode: "창조적 변형 (Transformation)",
    overDeformationHelp: "장르별 특성에 맞춰 글자의 비례를 비틀거나 파괴하여 압도적인 시각적 임팩트를 생성합니다.",
    momentumMode: "동적 운동량 (Momentum)",
    momentumHelp: "대칭성과 정적 균형을 깨고, 순수한 운동 에너지와 날카로운 절단 궤적을 우선시하여 동적인 생명력을 주입합니다.",
    help01: "사용자가 설정한 비율과 배치를 엄격히 준수하며 배경색 및 강력한 공간 여백을 제어합니다. 모든 결과물은 완전한 2D 평면을 지향합니다.",
    help02: "장르의 정체성을 결정하는 핵심 골격과 서체를 설정합니다. 획 두께, 자간, 자폭, 그리고 세부 비율을 조절할 수 있습니다.",
    help03: "이미지의 예리한 필선과 수평적 잔상 효과 등을 조절합니다.",
    help04: "장르 고유의 독특한 장식선, 연결성 및 재질 효과입니다.",
    help05: "기울기와 동세를 통해 타이포에 리듬감과 에너지를 주입합니다.",
    aiRecSummaryTitle: "AI 추천 분석 결과",
    styleInsight: "선택된 테마의 조형적 의도"
  },
  en: {
    baseLayout: "Base Layout & Setup",
    catSpecs: "Core Morphology",
    strokeDetail: "Stroke Detail",
    catDetails: "Specialized Options",
    dynamics: "Dynamics & Energy",
    ratio: "Aspect Ratio",
    occupancy: "Occupancy",
    background: "Background",
    layout: "Composition",
    subTheme: "Sub-Theme Preset",
    stemWeight: "Stem Weight",
    casualWeight: "Bone Volume",
    casualBounce: "Bounce Motion",
    calliBrush: "Brush Type",
    westernNib: "Nib Type",
    westernStrokeLine: "Strokes & Trails",
    charWidth: "Width Proportion",
    charProportion: "Char Proportion (W:H)",
    terminal: "Terminal Style",
    texture: "Edge Texture",
    sharpness: "Sharpness",
    bending: "Angularity",
    speed: "Writing Speed",
    extension: "Stroke Extension",
    kerning: "Kerning",
    slant: "Total Slant",
    kineticVelocity: "Kinetic Velocity",
    slicingIntensity: "Slicing & Offset",
    damage: "Deformation/Damage",
    specialPlaceholder: "Enter manual instructions",
    enhanceBtn: "Aesthetic Enhancement",
    recommendBtn: "AI Smart Setup",
    resetBtn: "Reset Config",
    copyBase: "Copy Prompt",
    translateBase: "To Korean",
    copyOut: "Copy Prompt",
    overviewTitle: "Consolidated Prompt",
    artisticMode: "Artistic Form",
    artisticHelp: "Goes beyond strict specs to add morphological fun and daring compositions. Maximizes unique silhouettes and eye-catching balance.",
    perfectionMode: "Design Quality",
    perfectionHelp: "Reflects characteristics of commercial logos. Completely excludes basic font looks and reconstructs into professional-grade title designs.",
    overDeformationMode: "Creative Transformation",
    overDeformationHelp: "Distorts or destroys letterforms based on genre-specific rules to generate overwhelming visual impact.",
    momentumMode: "Dynamic Momentum",
    momentumHelp: "Prioritizes pure kinetic energy and sharp cutting trajectories over symmetry to inject dynamic vitality.",
    help01: "Strictly adheres to ratio, layout, and background settings with powerful spatial isolation. Enforces 100% 2D flatness.",
    help02: "Defines the core structural identity. Controls stem weight, kerning, width, and individual character proportions.",
    help03: "Adjusts sharp stroke effects and horizontal motion trails.",
    help04: "Unique flourishing, connectivity, and ink effects for the genre.",
    help05: "Injects energy through rhythm, slant, and decorative tension.",
    aiRecSummaryTitle: "AI Analysis Result",
    styleInsight: "Theme's Design Intent"
  }
};

const staticOptions = {
  categories: [
    { id: "MMO", name: "코어 & RPG", en: "Core & Hardcore RPG", icon: <Shield className="w-5 h-5 shrink-0" />, description: "Hardcore RPG, dark fantasy, heavy stone-metal structures, medieval authority" },
    { id: "Casual", name: "캐주얼 & 서브컬처", en: "Casual & Subculture", icon: <Gamepad2 className="w-5 h-5 shrink-0" />, description: "Mobile games, anime, pop art, bouncy volume, stickers, vibrant energy" },
    { id: "Calli", name: "동양 붓글씨", en: "Oriental Calligraphy", icon: <Droplets className="w-5 h-5 shrink-0" />, description: "Traditional ink wash, brush pressure, martial arts, elegant fluid strokes" },
    { id: "Western", name: "서양 펜글씨", en: "Western Calligraphy", icon: <PenIcon className="w-5 h-5 shrink-0" />, description: "Gothic Blackletter, Copperplate script, medieval manuscripts, ornate flourishes" },
    { id: "Cyber", name: "사이버펑크 & SF", en: "Cyberpunk & Sci-Fi", icon: <Binary className="w-5 h-5 shrink-0" />, isTest: true, description: "Future tech, digital noise, glitch, neon, modular geometry, hologram" },
    { id: "Street", name: "그라피티 & 스트릿", en: "Graffiti & Street Art", icon: <Zap className="w-5 h-5 shrink-0" />, isTest: true, description: "Hip-hop, urban street art, spray texture, paint drips, 3D wildstyle" },
  ],
  base: [
    { id: "BlackWhite", name: "블랙 / 화이트", en: "JET BLACK Background, RADIANT WHITE Subject", ko: "블랙 / 화이트" },
    { id: "WhiteBlack", name: "화이트 / 블랙", en: "STARK WHITE Background, SOLID BLACK Subject", ko: "화이트 / 블랙" }
  ],
  ratios: [{ id: "1:1", name: "1:1 정방형", en: "1:1", ko: "1:1 정방형" }, { id: "16:9", name: "16:9 와이드", en: "16:9", ko: "16:9 와이드" }, { id: "2.76:1", name: "시네마틱", en: "2.76:1", ko: "시네마틱" }],
  occupancies: [
    { id: "30%", name: "30% (극강의 여백)", en: "EXTREME SPATIAL ISOLATION. Small central subject surrounded by a massive void. 70% of the canvas MUST remain pure empty background. NO BLEED to edges.", ko: "30% (극강의 여백)" },
    { id: "50%", name: "50% (충분한 여백)", en: "STRICT CENTRAL BUFFER. The subject occupies only 50% of the area. Large mandatory negative space margin on ALL sides (Top, Bottom, Left, Right). DO NOT scale to fit canvas.", ko: "50% (충분한 여백)" },
    { id: "70%", name: "70% (표준/권장)", en: "Balanced occupancy. Comfortable negative space buffer around the central typography mass.", ko: "70% (표준/권장)" },
    { id: "85%", name: "85% (공간 강조)", en: "Dominant scale. Large subject with thin margins. The text mass takes priority over the background void.", ko: "85% (공간 강조)" },
    { id: "100%", name: "100% (가득 찬 형태)", en: "MAXIMUM SCALE. Subject hits the edges of the canvas. Zero negative space margin.", ko: "100% (가득 찬 형태)" }
  ],
  layouts: [
    { id: "1Line", name: "1줄 (가로)", en: "STRICT SINGLE HORIZONTAL LINE. ABSOLUTELY NO VERTICAL STACKING. Even for long text, maintain one linear row.", ko: "1줄 (가로)" },
    { id: "2Lines", name: "2줄 (적층)", en: "Two-tier vertical stacked composition. Split text into two balanced horizontal rows.", ko: "2줄 (적층)" }
  ],
  proportions: [
    { id: "P_Condensed", name: "5:10 (매우 좁음)", en: "Condensed 5:10 ratio (Extreme Tall/Skinny morphology)", ko: "5:10 (매우 좁음)" },
    { id: "P_Slim", name: "6:10 (좁음)", en: "Slim 6:10 ratio", ko: "6:10 (좁음)" },
    { id: "P_Std", name: "7:10 (표준)", en: "Standard 7:10 width-to-height ratio", ko: "7:10 (표준)" },
    { id: "P_Wide", name: "8.5:10 (넓음)", en: "Wide 8.5:10 ratio", ko: "8.5:10 (넓음)" },
    { id: "P_Square", name: "10:10 (정방형)", en: "Square 10:10 ratio (Balanced aspect for each glyph)", ko: "10:10 (정방형)" },
    { id: "P_Extended", name: "12:10 (확장)", en: "Extended 12:10 ratio (Horizontal breadth)", ko: "12:10 (확장)" },
    { id: "P_Panoramic", name: "15:10 (파노라마)", en: "Hyper Panoramic 15:10 ratio (Cinematic width)", ko: "15:10 (파노라마)" }
  ],
  CasualStyles: [
    { id: "Jelly", name: "통통 젤리 (Jelly)", en: "Bouncy soft jelly-like volume with high elasticity", ko: "통통 젤리" },
    { id: "Mecha", name: "스피디 메카 (Mecha)", en: "Sharp mechanical speed aesthetic with tech-vibe precision", ko: "스피디 메카" },
    { id: "Pop", name: "팝 코믹스 (Pop Comics)", en: "Bold primary-colored Marvel/DC style with high-impact comic book energy and black ink shades", ko: "팝 코믹스" },
    { id: "Neon", name: "네온 사인 (Neon)", en: "Glowing neon tube structure with radiant edge diffusion", ko: "네온 사인" }
  ],
  CasualWeights: [
    { id: "Slim", name: "슬림", en: "slender agile stems", ko: "슬림" },
    { id: "Standard", name: "표준", en: "balanced standard volume", ko: "표준" },
    { id: "Chunky", name: "청키 (Chunky)", en: "massive, fat and heavy volume with a fully filled chunky mass, no gaps", ko: "청키 (Chunky)" }
  ],
  CasualKernings: [
    { id: "Kern_Overlap", name: "겹침 (Overlapping)", en: "tightly overlapping character layout for a unified monolithic impact", ko: "겹침" },
    { id: "Kern_Std", name: "표준", en: "standard balanced kerning", ko: "표준" },
    { id: "Kern_Wide", name: "여유로운 자간", en: "wide spacious letter spacing", ko: "여유로운 자간" }
  ],
  CasualTerminals: [
    { id: "Term_Round", name: "라운드 (Round)", en: "perfectly smooth circular terminals", ko: "라운드" },
    { id: "Term_Cutoff", name: "컷오프 (Cut-off)", en: "blunt rectangular cut-off terminals", ko: "컷오프" },
    { id: "Term_Pointy", name: "뾰족 팝 (Pointy)", en: "sharp energetic pop-style needle tips", ko: "뾰족 팝" }
  ],
  CasualSharpness: [
    { id: "Sharp_Blunt", name: "뭉툭함", en: "heavy blunt edges with low definition", ko: "뭉툭함" },
    { id: "Sharp_Soft", name: "부드러움", en: "softened anti-aliased organic edges", ko: "부드러움" },
    { id: "Sharp_Crisp", name: "선명함", en: "razor-sharp clean vector contours for high readability", ko: "선명함" }
  ],
  CasualInnerSpaces: [
    { id: "Solid", name: "꽉 채움 (Solid)", en: "fully filled opaque character core with maximum density", ko: "꽉 채움" },
    { id: "Spacious", name: "틔움 (Spacious)", en: "breathable open interior space within character bodies", ko: "틔움" }
  ],
  CasualExtensions: [
    { id: "Ext_None", name: "일반", en: "standard contained terminals", ko: "일반" },
    { id: "Ext_Bubble", name: "버블 (Bubble)", en: "bubbly rounded stroke extensions", ko: "버블" },
    { id: "Ext_Bloated", name: "팽창 (Bloated)", en: "hyper-inflated volumetric stroke tails", ko: "팽창" }
  ],
  CasualOutlines: [
    { id: "Outline_None", name: "없음", en: "no boundary outline", ko: "없음" },
    { id: "Outline_Thin", name: "얇은 테두리", en: "delicate thin boundary line for clarity", ko: "얇은 테두리" },
    { id: "Outline_Double", name: "이중 외곽선 (Double)", en: "thick multiple layered outlines to pop text out from background", ko: "이중 외곽선" }
  ],
  CasualGlosses: [
    { id: "Gloss_None", name: "없음", en: "flat matte surface texture", ko: "없음" },
    { id: "Gloss_Candy", name: "캔디 하이라이트", en: "sweet candy-like specular highlights on the upper planes", ko: "캔디 하이라이트" },
    { id: "Gloss_Plastic", name: "플라스틱 광택", en: "sharp reflective plastic-like luster", ko: "플라스틱 광택" }
  ],
  CasualStickers: [
    { id: "Sticker_Off", name: "미적용", en: "standard graphic treatment", ko: "미적용" },
    { id: "Sticker_White", name: "흰색 테두리 (Sticker)", en: "thick white die-cut sticker border wrapping the entire text", ko: "흰색 테두리" },
    { id: "Sticker_Paper", name: "종이 질감 스티커", en: "paper-textured sticker finish with subtle drop shadow", ko: "종이 질감 스티커" }
  ],
  CasualKinetic: [
    { id: "Kinetic_Static", name: "안정적", en: "stable balanced structure", ko: "안정적" },
    { id: "Kinetic_Squash", name: "스쿼시 & 스트레치", en: "elastic animation-style Squash & Stretch deformation for impact", ko: "스쿼시 & 스트레치" },
    { id: "Kinetic_Balloon", name: "풍선 팽창", en: "balloon-like expanding pressure and volumetric growth", ko: "풍선 팽창" }
  ],
  CasualSlants: [
    { id: "Slant_Up", name: "15도 우상향 (도약)", en: "energetic 15-degree upward leap slant", ko: "15도 우상향" },
    { id: "Slant_0", name: "0도 (안정)", en: "perfectly upright vertical stability", ko: "0도" },
    { id: "Slant_Reverse", name: "-5도 (반전)", en: "subtle reverse slant for unique tension", ko: "-5도" }
  ],
  CasualDecorations: [
    { id: "Deco_None", name: "없음", en: "zero decorative additives", ko: "없음" },
    { id: "Deco_Star", name: "별 가루 (Star Dust)", en: "sparkling star dust and particles around the core", ko: "별 가루" },
    { id: "Deco_Speed", name: "스피드 라인 (Speed)", en: "dynamic speed lines and motion streaks behind the characters", ko: "스피드 라인" },
    { id: "Deco_Emoji", name: "이모지 결합 (Emoji)", en: "integrated manga-style illustrative emojis and emotion symbols", ko: "이모지 결합" }
  ],
  // --- 동양 붓글씨 특화 ---
  CalliStyles: [
    { id: "Hae", name: "해서(楷書)", en: "Standard script (Kaishu). Formal, structured, and highest legibility with solemn gravity", ko: "해서(정자)" },
    { id: "Haeng", name: "행서(行書)", en: "Semi-cursive script (Xingshu). Rhythmic, fluid, practical and smooth motion", ko: "행서(반흘림)" },
    { id: "Cho", name: "초서(草書)", en: "Cursive script (Caoshu). Dramatic stroke simplification with maximized artistic momentum", ko: "초서(흘림)" },
    { id: "Gwangcho", name: "광초(狂草)", en: "Wild cursive (Kuangcao). Explosive swirling energy, abstract shapes breaking boundaries", ko: "광초(광폭)" }
  ],
  CalliBrushes: [
    { id: "Hard", name: "강호모(剛毫毛)", en: "Stiff animal hair brush. High elasticity, sharp stroke ends, powerful tension", ko: "강호모(거침)" },
    { id: "Soft", name: "양호모(羊毫毛)", en: "Soft sheep hair brush. Rich ink retention, heavy and voluminous strokes, gentle depth", ko: "양호모(부드움)" }
  ],
  CalliConnections: [
    { id: "Independent", name: "독립적", en: "Isolated characters with clean spatial separation and formal clarity", ko: "독립적" },
    { id: "Organic", name: "유기적 연결", en: "Dynamic inter-character connections via trailing 'invisible' ink threads (Heohwoek)", ko: "유기적 연결" }
  ],
  CalliTerminals: [
    { id: "Pase", name: "파세(波磔)", en: "Wave-like terminal. Energetic upward flick at the end of horizontal strokes", ko: "파세(튕김)" },
    { id: "Hyeonchim", name: "현침(懸針)", en: "Needle terminal. Vertical stroke tapering into a razor-sharp downward point", ko: "현침(바늘)" },
    { id: "Hoebong", name: "회봉(回鋒)", en: "Returning tip. Round finish by returning the brush tip into the stroke core", ko: "회봉(갈무리)" }
  ],
  CalliStarts: [
    { id: "Nobong", name: "노봉(露鋒)", en: "Exposed brush tip. Sharp, blade-like initial contact with immediate kinetic energy", ko: "노봉(예리함)" },
    { id: "Jangbong", name: "장봉(藏鋒)", en: "Hidden brush tip. Rounded, heavy, and profound start emphasizing internal power", ko: "장봉(무게감)" }
  ],
  CalliDryBrushes: [
    { id: "Smooth", name: "매끄러움", en: "Wet brush with full ink saturation. Solid and continuous stroke mass", ko: "매끄러움" },
    { id: "Partial", name: "부분 갈라짐", en: "Semi-dry brush showing partial paper texture through the strokes", ko: "부분 갈라짐" },
    { id: "Dry", name: "완전 갈필(渴筆)", en: "Extreme dry brush (Feibai). Scorched brush hair texture expressing high speed and raw force", ko: "완전 갈필" }
  ],
  CalliInks: [
    { id: "Deep", name: "농묵(Deep)", en: "Heavy saturated ink. High contrast, sharp boundaries, solid black presence", ko: "농묵(진함)" },
    { id: "Faint", name: "담묵(Faint)", en: "Diluted translucent ink. Soft watery texture with subtle grey transparency", ko: "담묵(옅음)" },
    { id: "Bleeding", name: "번짐(Bleed)", en: "Active ink diffusion and bleeding into the paper fibers for organic atmosphere", ko: "번짐 효과" }
  ],
  CalliSeals: [
    { id: "None", name: "없음", en: "No seal", ko: "없음" },
    { id: "BR_Rect", name: "우하단/사각", en: "Square red vermilion seal at the bottom right corner", ko: "우하단/사각" },
    { id: "BL_Circle", name: "좌하단/원형", en: "Circular red vermilion seal at the bottom left corner", ko: "좌하단/원형" }
  ],
  CalliSplatters: [
    { id: "None", name: "없음", en: "Clean stroke boundaries", ko: "없음" },
    { id: "Light", name: "미세 튀김", en: "Subtle ink splatters around energetic stroke turns", ko: "미세 튀김" },
    { id: "Heavy", name: "격렬한 튀김", en: "Explosive ink splatters and droplets scattered around the typography", ko: "격렬한 튀김" }
  ],
  CalliPapers: [
    { id: "Standard", name: "화선지(표준)", en: "Standard white rice paper texture with natural absorbency", ko: "화선지" },
    { id: "Old", name: "황색 고서적", en: "Antique yellowed book paper texture with aged organic grains", ko: "황색 고서적" },
    { id: "Rough", name: "거친 한지", en: "Rough handmade Hanji paper with visible fiber textures", ko: "거친 한지" }
  ],
  CalliKinetics: [
    { id: "Sword", name: "검무(Sword)", en: "Sword-dance momentum. Sharp, linear, and aggressive slashing trajectories", ko: "검무(칼날)" },
    { id: "Water", name: "흐르는 물", en: "Flowing water motion. Serpentine curves and continuous rhythmic connections", ko: "흐르는 물" },
    { id: "Circular", name: "태극(Circular)", en: "Tai-chi circularity. Harmonious orbital placement with balanced rotational energy", ko: "태극(원형)" }
  ],
  CalliSpeeds: [
    { id: "Stable", name: "정중동(Stable)", en: "Slow, heavy, and compressed writing speed with profound pressure", ko: "정중동" },
    { id: "Fast", name: "질풍(Fast)", en: "Gale-force swift strokes with dynamic directional shifts", ko: "질풍" },
    { id: "Wild", name: "폭풍(Wild)", en: "Violent storm-like speed with chaotic and destructive ink flow", ko: "폭풍" }
  ],
  CalliDestructions: [
    { id: "None", name: "없음", en: "Pristine strokes", ko: "없음" },
    { id: "Splintering", name: "획의 비산", en: "Splintering effect where stroke parts fly off like fragments due to extreme kinetic speed", ko: "획의 비산" }
  ],
  // --- 서양 펜글씨 특화 ---
  WesternStyles: [
    { id: "Blackletter", name: "블랙레터(Blackletter)", en: "Medieval Gothic Blackletter. Vertical, solemn, and high-contrast broken script", ko: "블랙레터(고딕)" },
    { id: "Copperplate", name: "카퍼플레이트(Copperplate)", en: "Ornate Copperplate script. Flexible harmony of hair-thin and heavy swell lines", ko: "카퍼플레이트" },
    { id: "Italic", name: "이탤릭(Italic)", en: "Humanist Italic hand. Clean, slanted, legible, and sophisticated calligraphic hand", ko: "이탤릭" }
  ],
  WesternNibs: [
    { id: "Broad", name: "브로드 닙(Broad Nib)", en: "Flat-edged broad nib. Stroke thickness changes automatically with the writing angle", ko: "브로드 닙(평촉)" },
    { id: "Pointed", name: "포인티드 닙(Pointed)", en: "Sharp pointed flexible nib. Variable line width controlled by precise hand pressure", ko: "포인티드 닙" }
  ],
  WesternProportions: [
    { id: "Classic", name: "클래식", en: "Elegant classic proportions with low x-height and elongated ascenders/descenders", ko: "클래식" },
    { id: "Compact", name: "컴팩트", en: "Narrow width with high density, creating an imposing and authoritative visual impact", ko: "컴팩트" }
  ],
  WesternTerminals: [
    { id: "Ball", name: "볼 터미널(Ball)", en: "Rounded ball-shaped terminals resembling a hanging ink droplet", ko: "볼 터미널" },
    { id: "Swash", name: "스워시(Swash)", en: "Elongated curved stroke tails creating elegant and fluid decorative orbits", ko: "스워시" }
  ],
  WesternContrasts: [
    { id: "Extreme", name: "극단적 대비", en: "High-fashion contrast between thick vertical downstrokes and hair-thin horizontals", ko: "극단적 대비" },
    { id: "Uniform", name: "균일한 두께", en: "Modern monolinear style with consistent stroke width across all directions", ko: "균일한 두께" }
  ],
  WesternSerifs: [
    { id: "Hairline", name: "헤어라인(Hairline)", en: "Needle-thin decorative serifs for a delicate and luxury aesthetic", ko: "헤어라인" },
    { id: "Wedge", name: "웻지(Wedge)", en: "Sharp triangular wedge-shaped serifs creating aggressive directional tension", ko: "웻지(쐐기)" },
    { id: "Slab", name: "슬랩(Slab)", en: "Thick, blocky rectangular serifs for a solid and stable architectural foundation", ko: "슬랩" }
  ],
  WesternBaselines: [
    { id: "Horizontal", name: "수평 고정", en: "Strict and precise horizontal alignment following a rigid guide line", ko: "수평 고정" },
    { id: "Dancing", name: "댄싱 베이스라인", en: "Rhythmic and bouncy baseline where characters playfully shift up and down", ko: "댄싱 베이스라인" }
  ],
  WesternSlants: [
    { id: "Slant_55", name: "클래식 55도", en: "Formal 55-degree slant, the standard for traditional Western script hands", ko: "클래식 55도" },
    { id: "Slant_0", name: "수직(0도)", en: "Perfectly vertical posture expressing solemnity and Gothic discipline", ko: "수직(0도)" }
  ],
  WesternOrnaments: [
    { id: "Minimal", name: "미니멀", en: "Clean and focused forms with zero unnecessary ornamentation", ko: "미니멀" },
    { id: "Maximal", name: "맥시멀", en: "Extravagant ornamental density with complex flourishes filling the surrounding space", ko: "맥시멀" }
  ],
  WesternTensions: [
    { id: "Soft", name: "부드러운 탄성", en: "Gentle and gradual transitions in stroke width, creating a liquid organic flow", ko: "부드러운 탄성" },
    { id: "Sharp", name: "급격한 탄성", en: "Abrupt and sharp changes in thickness at impact points for dramatic tension", ko: "급격한 탄성" }
  ],
  WesternStrokeLines: [
    { id: "Standard", name: "표준 필선", en: "Standard clean calligraphic strokes", ko: "표준" },
    { id: "SharpBlade", name: "날카로운 칼날", en: "RAZOR-SHARP BLADE EDGES. Strokes have surgical precision and sharp tapered ends, reflecting intense structural tension", ko: "날카로운 칼날" },
    { id: "VelocityStrike", name: "속도감 스트라이크", en: "EXTREME VELOCITY STRIKES. Long, razor-thin horizontal motion lines and streaks piercing through the characters, creating a high-speed kinetic effect as seen in high-velocity graphics", ko: "속도감 스트라이크" }
  ],
  WesternKinetics: [
    { id: "Standard", name: "표준 동세", en: "Standard controlled calligraphic motion", ko: "표준" },
    { id: "SpeedTrails", name: "속도감 잔상", en: "Kinetic motion trails following the character flow", ko: "속도감 잔상" }
  ],
  // --- 사이버펑크 & SF 특화 ---
  CyberStyles: [
    { id: "NeonCity", name: "네온 시티", en: "Vibrant glowing city aesthetic with high-contrast electric hues", ko: "네온 시티" },
    { id: "DataGlitch", name: "데이터 글리치", en: "Fragmented digital glitch aesthetic with corrupted data artifacts", ko: "데이터 글리치" },
    { id: "HiTechMonolith", name: "하이테크 모놀리스", en: "Solid, imposing geometric structures with advanced technological precision", ko: "하이테크 모놀리스" },
    { id: "Hologram", name: "홀로그램", en: "Ethereal translucent hologram projection with interference scanlines", ko: "홀로그램" }
  ],
  CyberForms: [
    { id: "Modular", name: "모듈러 구조", en: "Assembled modular anatomy with visible technical joints and segmented parts", ko: "모듈러 구조" },
    { id: "Geometric", name: "기하학적 최소화", en: "Minimalist geometric skeleton with sharp mathematical reduction", ko: "기하학적 최소화" }
  ],
  CyberKernings: [
    { id: "Compressed", name: "압축 자간", en: "Ultra-tight compressed spacing for a dense technical density", ko: "압축 자간" },
    { id: "Wide", name: "광범위 자간", en: "Expansive floating kerning creating a zero-gravity spatial feel", ko: "광범위 자간" }
  ],
  CyberTerminals: [
    { id: "VerticalCut", name: "수직 절단", en: "Precise vertical clean-cut stroke terminals", ko: "수직 절단" },
    { id: "Discontinuous", name: "불연속적 필선", en: "Disconnected, intermittent digital stroke segments", ko: "불연속적 필선" }
  ],
  CyberSharpness: [
    { id: "LaserCut", name: "디지털 레이저 컷", en: "Perfectly sharp laser-cut boundaries with zero aliasing", ko: "레이저 컷" },
    { id: "Vibration", name: "전자기적 떨림", en: "Micro electromagnetic edge vibrations and high-frequency jitter", ko: "전자기적 떨림" }
  ],
  CyberTextures: [
    { id: "DigitalNoise", name: "디지털 노이즈", en: "Integrated digital static noise and granular corruption textures", ko: "디지털 노이즈" },
    { id: "Scanline", name: "스캔라인 테두리", en: "Boundary scanline artifacts consistent with CRT/Digital display aesthetics", ko: "스캔라인 테두리" }
  ],
  CyberConnections: [
    { id: "Wireless", name: "무선 통신 (끊김)", en: "Wireless disconnected segments with spiritual signal gaps", ko: "무선(끊김)" },
    { id: "Circuit", name: "서킷 보드 (연결)", en: "Circuit board pathways connecting character nodes with 90-degree technical turns", ko: "서킷 보드" }
  ],
  CyberGlitches: [
    { id: "None", name: "없음", en: "Stable data form", ko: "없음" },
    { id: "RGB_Split", name: "색수차 (RGB 분리)", en: "Chromatic aberration with offset Red/Green/Blue color channels at the edges", ko: "색수차 분리" },
    { id: "HorizontalDistort", name: "수평 뒤틀림", en: "Violent horizontal glitch distortion shifting character rows", ko: "수평 뒤틀림" }
  ],
  CyberGlows: [
    { id: "None", name: "없음", en: "Matte surface", ko: "없음" },
    { id: "OuterGlow", name: "외부 발광", en: "Intense neon outer glow radiating into the negative space", ko: "외부 발광" },
    { id: "GradientGlow", name: "색상 전이 발광", en: "Advanced gradient glow transitioning between electric cyan and magenta", ko: "색상 전이" }
  ],
  CyberTransparencies: [
    { id: "Opaque", name: "불투명", en: "Solid opaque mass", ko: "불투명" },
    { id: "HoloSemi", name: "반투명 홀로그램", en: "Holographic translucency allowing the background to bleed through the characters", ko: "반투명" }
  ],
  CyberKinetics: [
    { id: "DataFlow", name: "데이터 흐름", en: "Continuous horizontal data flow momentum", ko: "데이터 흐름" },
    { id: "Tremor", name: "홀로그램 떨림", en: "Unstable holographic flicker and high-frequency tremor", ko: "홀로그램 떨림" }
  ],
  CyberSlants: [
    { id: "Aggressive", name: "공격적 20도", en: "Aggressive 20-degree hi-tech slant for forward acceleration", ko: "공격적 20도" },
    { id: "ZeroG", name: "무중력 수평", en: "Perfectly stable zero-gravity horizontal alignment", ko: "무중력 수평" }
  ],
  CyberDestructions: [
    { id: "None", name: "없음", en: "Stable system", ko: "없음" },
    { id: "Pixelization", name: "픽셀화", en: "Digital pixelization where characters dissolve into square data blocks", ko: "픽셀화" },
    { id: "Decomposition", name: "전자기 분해", en: "Electromagnetic decomposition dissolving the structure into particles", ko: "전자기 분해" }
  ],
  // --- 그라피티 & 스트릿 특화 ---
  StreetStyles: [
    { id: "Bubble", name: "버블 스타일", en: "Soft, inflated bubble-letter aesthetic with smooth rounded volume", ko: "버블 스타일" },
    { id: "Wildstyle", name: "와일드스타일", en: "Complex, interlocking wildstyle with aggressive arrows and intertwined strokes", ko: "와일드스타일" },
    { id: "Tagging", name: "태깅(Tagging)", en: "Rapid, raw signature tagging style with high kinetic flow and hand-drawn speed", ko: "태깅" }
  ],
  StreetForms: [
    { id: "Inflation", name: "가변적 팽창", en: "Variable volumetric expansion with organic bulging centers", ko: "가변적 팽창" },
    { id: "Layering", name: "비정형적 레이어링", en: "Irregular character layering with complex overlap and depth stacking", ko: "비정형적 레이어링" }
  ],
  StreetKernings: [
    { id: "Interlocking", name: "완전 겹침", en: "Interlocking character clusters with zero spatial gap for a solid mural impact", ko: "완전 겹침" },
    { id: "FreePlacement", name: "자유로운 배치", en: "Chaotic free-form placement breaking standard alignment rules", ko: "자유로운 배치" }
  ],
  StreetTerminals: [
    { id: "Pooling", name: "잉크 고임", en: "Ink pooling effect at stroke ends as if heavy paint gathered", ko: "잉크 고임" },
    { id: "Arrow", name: "화살표 확장", en: "Sharp aggressive arrow-head extensions typical of advanced wildstyle", ko: "화살표 확장" }
  ],
  StreetTextures: [
    { id: "Granular", name: "스프레이 입자", en: "Granular spray-paint mist and porous particle textures", ko: "스프레이 입자" },
    { id: "RoughPaint", name: "거친 페인트 자국", en: "Rough heavy-stroke paint marks with visible bristle/cap textures", ko: "거친 자국" }
  ],
  StreetSharpness: [
    { id: "HandDrawn", name: "자유로운 필선", en: "Freehand manual stroke quality with organic human error and life", ko: "자유로운 필선" }
  ],
  StreetWeights: [
    { id: "Uneven", name: "비균일 두께", en: "Dynamic uneven stroke weight distribution based on manual pressure simulation", ko: "비균일 두께" }
  ],
  StreetExtrusions: [
    { id: "None", name: "없음", en: "2D flat graphic", ko: "없음" },
    { id: "DeepShadow", name: "강한 원근 그림자", en: "Heavy perspective-based 3D extrusion shadow creating depth", ko: "강한 원근" },
    { id: "Blocky3D", name: "입체적 돌출", en: "Solid blocky 3D extrusion popping characters out of the surface", ko: "입체적 돌출" }
  ],
  StreetDrips: [
    { id: "None", name: "없음", en: "Clean base", ko: "없음" },
    { id: "ShortDrip", name: "미세 드립", en: "Subtle paint drips gathering at the bottom of characters", ko: "미세 드립" },
    { id: "LongDrip", name: "긴 드립", en: "Aggressive elongated paint drips running down into the lower margin", ko: "긴 드립" }
  ],
  StreetBackgrounds: [
    { id: "None", name: "없음 (단색)", en: "Solid backdrop", ko: "없음" },
    { id: "BrickWall", name: "브릭 월 (Brick)", en: "Weathered urban brick wall texture integrated with the typography", ko: "브릭 월" },
    { id: "Shutter", name: "셔터 텍스처", en: "Metal rolling shutter texture with horizontal metallic lines", ko: "셔터 텍스처" }
  ],
  StreetKinetics: [
    { id: "Bouncing", name: "바운싱 리듬", en: "Rhythmic bouncing motion with elastic character heights", ko: "바운싱 리듬" },
    { id: "Explosive", name: "폭발적 확장", en: "Explosive radial expansion momentum from the center point", ko: "폭발적 확장" }
  ],
  StreetSlants: [
    { id: "Random", name: "무작위 회전", en: "Chaotic random rotation for each character, breaking the axis", ko: "무작위 회전" }
  ],
  StreetDestructions: [
    { id: "None", name: "없음", en: "Fresh mural", ko: "없음" },
    { id: "Overpaint", name: "덮어쓰기", en: "Overpainted layers with previous art bleeding through the edges", ko: "덮어쓰기" },
    { id: "TornPoster", name: "뜯겨진 벽보", en: "Torn paper/poster texture with fragmented character parts", ko: "뜯겨진 벽보" }
  ],
  // --- MMO / 표준 ---
  MMOStyles: [
    { id: "Lineage_Classic", name: "리니지 (Original)", en: "Monolithic stone-steel block structure with heavy gravity and charred battle-worn textures", ko: "리니지 (Original)" },
    { id: "Lineage_2", name: "리니지 2 (Fantasy)", en: "Elegant high-fantasy aesthetic with elaborate sharp serifs and crystalline precision", ko: "리니지 2 (Fantasy)" },
    { id: "Lineage_M", name: "리니지 M (Aden)", en: "Chiseled faceted Gothic structure with solid metal planes for high authority", ko: "리니지 M (Aden)" },
    { id: "Lineage_2M", name: "리니지 2M (Thorn)", en: "Jewelry-precision thorn serifs and needle-sharp lines for a luxury aura", ko: "리니지 2M (Thorn)" },
    { id: "Lineage_W", name: "리니지 W (Agony)", en: "Cruel realism with wedge-shaped 'Battlefield' terminals, claw-like hooks, and diamond-edge accents for dark realistic narrative", ko: "리니지 W (Agony)" },
    { id: "Aion_Original", name: "아이온 (Wings)", en: "Vertical tower-pillar structure with 'Rift' gapped glyphs, English-A hybrid skeletons, and sleek aerodynamic speed terminals", ko: "아이온 (Wings)" },
    { id: "Aion_2", name: "아이온 2 (Celestial)", en: "Atreia-style high-fantasy script featuring light radiance symbols, asymmetric strong terminals, elegant fluid curves, and 'Breakthrough' upward momentum", ko: "아이온 2 (Celestial)" },
    { id: "Brutal", name: "브루탈 고딕", en: "Brutal Dark Gothic architectural silhouette", ko: "브루탈 고딕" },
    { id: "Epic", name: "에픽 판타지", en: "Epic AAA Serif royal structure", ko: "에픽 판타지" }
  ],
  stemWeights: [
    { id: "Stem_Sharp", name: "예리하고 얇게", en: "razor thin stems", ko: "예리함" },
    { id: "Stem_Std", name: "표준 두께", en: "medium balanced stems", ko: "표준" },
    { id: "Stem_Block", name: "육중한 블록", en: "massive heavy block stems", ko: "육중함" },
    { id: "Stem_KineticVariable", name: "가변적 역동성 (Kinetic)", en: "dynamic variable stems with kinetic mass distribution, transitioning from heavy impact points to razor-thin tapering lines", ko: "가변(Kinetic)" }
  ],
  kerningOptions: [
    { id: "Kern_Wide", name: "넓은 자간", en: "wide letter spacing", ko: "넓은 자간" },
    { id: "Kern_Std", name: "표준 자간", en: "standard kerning", ko: "표준 자간" },
    { id: "Kern_Overlap", name: "글자 겹침", en: "tight overlapping architectural kerning", ko: "글자 겹침" }
  ],
  terminalStyles: [
    { id: "Term_Serif", name: "클래식 세리프", en: "classic serif", ko: "세리프" },
    { id: "Term_Round", name: "매끄러운 원형", en: "rounded terminals", ko: "원형" },
    { id: "Term_Blade", name: "검날 마감", en: "razor blade tips", ko: "검날" },
    { id: "Term_Thorn", name: "가시 삐침", en: "sharp thorn terminals", ko: "가시 삐침" },
    { id: "Term_Chisel", name: "치슬드 (Chisel)", en: "sharp faceted chisel-cut terminals with defined metal planes", ko: "치슬드" }
  ],
  strokeTextures: [
    { id: "Tex_Frayed", name: "필선 갈라짐", en: "frayed ink texture", ko: "갈라짐" },
    { id: "Tex_Clean", name: "완전 매끄루움", en: "perfectly smooth vector edge", ko: "매끄러움" },
    { id: "Tex_Scorched", name: "탄화된 필선", en: "scorched etched texture like charred steel", ko: "탄화" },
    { id: "Tex_Subtle", name: "미세 침식", en: "subtle weathered erosion", ko: "미세 침식" },
    { id: "Tex_Hologram", name: "홀로그램 (Holo)", en: "ethereal neon White/Mint holographic edge diffraction", ko: "홀로그램" }
  ],
  strokeSharpness: [
    { id: "Sharp_Razor", name: "극한의 예리함", en: "razor-sharp blade edges, aggressive cutting lines", ko: "극한의 예리함" },
    { id: "Sharp_Crisp", name: "선명한 필선", en: "crisp clean vector lines, high clarity", ko: "선명한 필선" },
    { id: "Sharp_Soft", name: "부드러운 질감", en: "softened organic edges, diffused borders", ko: "부드러운 질감" }
  ],
  strokeAngularity: [
    { id: "Bend_Angular", name: "각진 꺾임", en: "sharp angular geometric bends, high contrast turns", ko: "각진 꺾임" },
    { id: "Bend_Natural", name: "표준 굴곡", en: "balanced natural curvature, standard flow", ko: "표준 굴곡" },
    { id: "Bend_Fluid", name: "유려한 곡선", en: "smooth fluid serpentine curves, liquid transitions", ko: "유려한 곡선" }
  ],
  writingSpeeds: [
    { id: "Speed_Steady", name: "정갈함 (느림)", en: "steady controlled stroke with zero fraying", ko: "정갈함 (느림)" },
    { id: "Speed_Swift", name: "경쾌함 (보통)", en: "swift stroke with minor edge-bound ink flickers", ko: "경쾌함 (보통)" },
    { id: "Speed_Violent", name: "폭발적 (빠름)", en: "violent rapid stroke with explosive ink split at the boundary", ko: "폭발적 (빠름)" }
  ],
  strokeExtensions: [
    { id: "Ext_None", name: "확장 없음", en: "contained terminals with no trailing extensions", ko: "없음" },
    { id: "Ext_Elegant", name: "유려한 연장", en: "elegant tapered stroke extensions that flow into the margins", ko: "유려함" },
    { id: "Ext_Razor", name: "날카로운 끝단", en: "razor-sharp elongated stroke tails stretching horizontally", ko: "날카로움" },
    { id: "Ext_Infinite", name: "무한한 확장", en: "dramatic hyper-extended stroke ends that pierce boundaries", ko: "무한" }
  ],
  kineticVelocities: [
    { id: "Vel_Static", name: "정중동 (Static)", en: "zero momentum, stable and centered structural balance", ko: "정중동" },
    { id: "Vel_Swift", name: "질주 (Swift)", en: "dynamic forward momentum with subtle horizontal speed-stretching", ko: "질주" },
    { id: "Vel_Slashing", name: "격베기 (Slashing)", en: "aggressive slashing momentum, diagonal energy as if cut by a blade", ko: "격베기" },
    { id: "Vel_Warp", name: "시공 왜곡 (Warp)", en: "extreme kinetic acceleration, warped character edges", ko: "시공 왜곡" }
  ],
  slantAngles: [
    { id: "Slant_0", name: "0도", en: "perfectly upright verticality", ko: "0도" },
    { id: "Slant_Forward", name: "15도", en: "15-degree dynamic forward slant", ko: "15도" },
    { id: "Slant_Extreme", name: "25도", en: "Aggressive 25-degree fast slant", ko: "25도" }
  ],
  slicingIntensities: [
    { id: "Slic_None", name: "절단 없음", en: "perfectly intact strokes with no structural severance", ko: "없음" },
    { id: "Slic_Partial", name: "부분 절단", en: "micro-incisions within individual characters", ko: "부분" },
    { id: "Slic_Deep", name: "심층 파손", en: "aggressive diagonal slicing through character clusters", ko: "심층" },
    { id: "Slic_Total", name: "전체 절단", en: "treating entire text as monolithic block with massive severance", ko: "전체" }
  ],
  deformationDamages: [
    { id: "Damage_None", name: "상태 깨끗함", en: "pristine solid form", ko: "없음" },
    { id: "Damage_Erosion", name: "미세 침식 (Erosion)", en: "subtle weathered erosion on the boundaries", ko: "침식" },
    { id: "Damage_Cracking", name: "균열과 실금 (Cracks)", en: "intricate 2D cracks and micro-fractures across the body", ko: "균열" },
    { id: "Damage_Glitch", name: "글리치 (노이즈)", en: "digital noise and boundary glitch artifacts", ko: "글리치" }
  ],
  widths: [{ id: "Narrow", name: "좁게", en: "condensed slim width", ko: "좁게" }, { id: "Normal", name: "표준", en: "standard balanced width", ko: "표준" }, { id: "Wide", name: "웅장하게", en: "wide expansive epic width", ko: "웅장하게" }]
};

// --- 2. 하위 UI 컴포넌트 ---
const SectionHeader = ({ id, label, icon, helpText, theme, isHighlighted }) => {
  const [showHelp, setShowHelp] = useState(false);
  return (
    <div className={`flex items-center justify-between pl-1 pr-1 text-zinc-500 relative mt-4 first:mt-0 transition-all duration-700 ${isHighlighted ? 'scale-[1.02] text-indigo-400 font-black' : ''}`}>
      <div className="flex items-center gap-2">
        {icon}
        <h3 className={`text-[10px] font-semibold uppercase tracking-wider ${theme === 'dark' ? '' : 'text-zinc-600 font-bold'}`}>{id}. {label}</h3>
        {isHighlighted && <Sparkle className="w-3 h-3 animate-pulse text-indigo-400" />}
      </div>
      <div className="relative" onMouseEnter={() => setShowHelp(true)} onMouseLeave={() => setShowHelp(false)}>
        <HelpCircle className={`w-3.5 h-3.5 cursor-help transition-colors ${showHelp ? 'text-indigo-500' : 'text-zinc-400 hover:text-indigo-400'}`} />
        {showHelp && (
          <div className={`absolute right-0 top-6 w-72 p-4 rounded-md text-[10px] leading-relaxed z-[10000] border shadow-2xl animate-in fade-in slide-in-from-top-1 duration-200 ${theme === 'dark' ? 'bg-[#1A1A22] border-white/10 text-zinc-300' : 'bg-white border-black/10 text-zinc-600 font-medium'}`}>
            <p className="font-bold mb-2 text-indigo-500 uppercase tracking-tighter border-b border-indigo-500/20 pb-1">{label} Guide</p>
            <div className="space-y-2">{helpText}</div>
          </div>
        )}
      </div>
    </div>
  );
};

const DropdownControl = ({ label, icon, data = [], value, onChange, theme, activeCat, disabled = false, isHighlighted, lang }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const toggleDropdown = () => { if (!disabled) setIsOpen(!isOpen); };
  useEffect(() => {
    const handleClickOutside = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = data.find(o => o.id === value) || data[0] || { name: 'None' };
  const displayLabel = lang === 'ko' ? (selectedOption.ko || selectedOption.name) : (selectedOption.en || selectedOption.name);
  // 액센트 컬러는 hex 로 직접 매핑 — Tailwind JIT 가 dynamic `bg-${x}-500` 패턴을 못 잡아서 인라인 style 로 적용.
  const accentHex = activeCat === 'Casual' ? '#F43F5E' : (activeCat === 'Calli' ? '#10B981' : (activeCat === 'Western' ? '#F59E0B' : (activeCat === 'Cyber' ? '#06B6D4' : (activeCat === 'Street' ? '#F97316' : '#6366F1'))));

  return (
    <div className={`space-y-1 relative transition-all duration-1000 ${disabled ? 'opacity-40 grayscale pointer-events-none' : ''}`} ref={containerRef}>
      {label && <div className="flex items-center justify-between pl-1"><p className={`text-[10px] font-bold uppercase tracking-tighter flex items-center gap-1.5 ${theme === 'dark' ? 'text-zinc-600' : 'text-zinc-500 font-bold'}`}>{icon} {label}</p></div>}
      <button onClick={toggleDropdown} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md border transition-all duration-700 ${isHighlighted ? 'shadow-lg scale-[1.02] ring-1' : (theme === 'dark' ? 'bg-[#212126] border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-300 hover:border-zinc-400 shadow-sm')}`}
        style={isHighlighted ? { background: `${accentHex}33`, borderColor: accentHex, boxShadow: `0 0 0 1px ${accentHex}55` } : {}}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <span className={`text-[11px] font-bold truncate ${!disabled ? (theme === 'dark' ? 'text-zinc-100' : 'text-zinc-900') : ''}`}>{displayLabel}</span>
          {selectedOption.isNew && <span className="bg-amber-500/20 text-amber-500 text-[8px] font-black px-1.5 py-0.5 rounded-full ring-1 ring-amber-500/30 shadow-sm uppercase shrink-0">AI NEW</span>}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400'}`} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {isOpen && (
        <div className={`absolute left-0 w-full mt-1 max-h-[250px] overflow-y-auto rounded-md border backdrop-blur-xl z-[9999] shadow-2xl animate-in fade-in slide-in-from-top-1 duration-200 ${theme === 'dark' ? 'bg-[#1A1A22]/95 border-white/10' : 'bg-white/95 border-black/10'}`}>
          {data.map(opt => {
            const optLabel = lang === 'ko' ? (opt.ko || opt.name) : (opt.en || opt.name);
            const isActive = value === opt.id;
            return (
              <div key={opt.id} onClick={() => { onChange(opt.id); setIsOpen(false); }}
                className={`px-4 py-2.5 text-[11px] cursor-pointer transition-all flex items-center justify-between group ${
                  isActive
                    ? (theme === 'dark' ? 'text-white font-bold' : 'font-bold')
                    : (theme === 'dark' ? 'text-zinc-400 hover:bg-white/5 hover:text-white' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900')
                }`}
                style={isActive ? { background: `${accentHex}33`, color: theme === 'dark' ? '#fff' : accentHex } : {}}
              >
                <div className="flex items-center gap-2">
                  <span>{optLabel}</span>
                  {opt.isNew && <span className="text-[7px] text-amber-500 border border-amber-500/30 rounded px-1 uppercase font-black">Ai</span>}
                </div>
                {isActive && <Sparkle className="w-3 h-3 animate-pulse" style={{ color: accentHex }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// --- 3. 메인 앱 컴포넌트 ---
// Shell 에서 호출 시 version/setVersion/versions props 가 전달됨 — 본 엔진은 자체 카테고리 탭만 쓰므로 props 는 무시한다.
// eslint-disable-next-line no-unused-vars
const App = ({ version, setVersion, versions } = {}) => {
  const [theme, setTheme] = useState("dark");
  const [lang] = useState("ko");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeCat, setActiveCat] = useState("MMO");
  const [inputText, setInputText] = useState("데스나이트");
  const [base64Image, setBase64Image] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [artisticFreedom, setArtisticFreedom] = useState(false);
  const [perfectionMode, setPerfectionMode] = useState(false);
  const [overDeformation, setOverDeformation] = useState(false);
  const [momentumActive, setMomentumActive] = useState(false);

  // 컴포넌트 레벨에서의 장르 상태 정의
  const isCasual = activeCat === 'Casual';
  const isMMO = activeCat === 'MMO';
  const isCalli = activeCat === 'Calli';
  const isWestern = activeCat === 'Western';
  const isCyber = activeCat === 'Cyber';
  const isStreet = activeCat === 'Street';

  // 설정 상태
  const [baseStyle, setBaseStyle] = useState("BlackWhite");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [occupancy, setOccupancy] = useState("50%");
  const [layoutType, setLayoutType] = useState("1Line");

  // 공용 필드 (02번 핵심 조형)
  const [scriptType, setScriptType] = useState("Lineage_M");
  const [stemWeight, setStemWeight] = useState("Stem_KineticVariable");
  const [charWidth, setCharWidth] = useState("Normal");
  const [charProportion, setCharProportion] = useState("P_Std");
  const [kerning, setKerning] = useState("Kern_Std");

  // 기타 필드
  const [terminalStyle, setTerminalStyle] = useState("Term_Chisel");
  const [strokeTexture, setStrokeTexture] = useState("Tex_Frayed");
  const [strokeSharpness, setStrokeSharpness] = useState("Sharp_Razor");
  const [strokeAngularity] = useState("Bend_Angular");
  const [writingSpeed, setWritingSpeed] = useState("Speed_Swift");
  const [strokeExtension, setStrokeExtension] = useState("Ext_Razor");
  const [slantAngle, setSlantAngle] = useState("Slant_0");
  const [kineticVelocity, setKineticVelocity] = useState("Vel_Slashing");
  const [slicingIntensity, setSlicingIntensity] = useState("Slic_Partial");
  const [deformationDamage, setDeformationDamage] = useState("Damage_None");

  // 캐주얼 특화 상태
  const [casualInnerSpace, setCasualInnerSpace] = useState("Solid");
  const [casualOutline, setCasualOutline] = useState("Outline_Double");
  const [casualGloss, setCasualGloss] = useState("Gloss_None");
  const [casualSticker, setCasualSticker] = useState("Sticker_Off");
  const [casualDecoration, setCasualDecoration] = useState("Deco_None");

  // 동양 붓글씨 특화 상태
  const [calliConnection, setCalliConnection] = useState("Independent");
  const [calliInitial, setCalliInitial] = useState("Nobong");
  const [calliInk, setCalliInk] = useState("Deep");
  const [calliSeal, setCalliSeal] = useState("None");
  const [calliSplatter, setCalliSplatter] = useState("None");
  const [calliPaper, setCalliPaper] = useState("Standard");
  const [calliDestruction, setCalliDestruction] = useState("None");

  // 서양 펜글씨 특화 상태
  const [westernProportion, setWesternProportion] = useState("Classic");
  const [westernContrast, setWesternContrast] = useState("Extreme");
  const [westernSerif, setWesternSerif] = useState("Hairline");
  const [westernBaseline] = useState("Horizontal");
  const [westernFlourish, setWesternFlourish] = useState("None");
  const [westernLigature, setWesternLigature] = useState("Std");
  const [westernBleeding, setWesternBleeding] = useState("Off");
  const [westernOrnament, setWesternOrnament] = useState("Minimal");
  const [westernTension, setWesternTension] = useState("Soft");
  const [westernKinetic, setWesternKinetic] = useState("Standard");
  const [westernStrokeLine, setWesternStrokeLine] = useState("Standard");

  // 사이버펑크 & SF 특화 상태
  const [cyberConnection, setCyberConnection] = useState("Wireless");
  const [cyberGlitch, setCyberGlitch] = useState("None");
  const [cyberGlow, setCyberGlow] = useState("None");
  const [cyberTrans, setCyberTrans] = useState("Opaque");

  // 그라피티 & 스트릿 특화 상태
  const [streetWeightContrast, setStreetWeightContrast] = useState("Uneven");
  const [streetExtrusion, setStreetExtrusion] = useState("None");
  const [streetDrip, setStreetDrip] = useState("None");
  const [streetBG, setStreetBG] = useState("None");

  // 동적 옵션
  const [dynamicOptions, setDynamicOptions] = useState({
    MMOStyles: [], CasualStyles: [], CalliStyles: [], WesternStyles: [], CyberStyles: [], StreetStyles: [],
    strokeTextures: [], deformationDamages: [],
    terminalStyles: [], stemWeights: [],
    strokeSharpness: [], strokeAngularity: [], writingSpeeds: [],
    widths: [], kerningOptions: [], strokeExtensions: [], kineticVelocities: [], slicingIntensities: []
  });

  const [customDesignInjections, setCustomDesignInjections] = useState("");
  const [aiRecSummary, setAiRecSummary] = useState(null);
  const [highlightedFields, setHighlightedFields] = useState(new Set());

  const [aiModel, setAiModel] = useState("Overview");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isRecommending, setIsRecommending] = useState(false);

  const [dramaticPrompt, setDramaticPrompt] = useState("");
  const [translatedBase, setTranslatedBase] = useState("");
  const [translatedEnhanced, setTranslatedEnhanced] = useState("");
  const [isTranslatingBase, setIsTranslatingBase] = useState(false);
  const [isTranslatingEnhanced, setIsTranslatingEnhanced] = useState(false);

  // 언어 뷰 모드 ('en' | 'ko')
  const [baseLangView, setBaseLangView] = useState('en');
  const [enhancedLangView, setEnhancedLangView] = useState('en');

  const [copiedTop, setCopiedTop] = useState(false);
  const [copiedBottom, setCopiedBottom] = useState(false);

  const dict = dictionary[lang];

  // --- 하위 테마 프리셋 선택 시 자동 옵션 변경 핸들러 ---
  const handleScriptPresetChange = (presetId) => {
    setScriptType(presetId);

    // 테마별 초기 셋업 값 맵핑
    if (activeCat === "MMO") {
      if (presetId === "Lineage_Classic") {
        setStemWeight("Stem_Block"); setTerminalStyle("Term_Serif"); setStrokeTexture("Tex_Scorched"); setDeformationDamage("Damage_Erosion");
      } else if (presetId === "Lineage_2") {
        setStemWeight("Stem_Sharp"); setTerminalStyle("Term_Serif"); setStrokeSharpness("Sharp_Crisp"); setKineticVelocity("Vel_Static");
      } else if (presetId === "Lineage_M") {
        setStemWeight("Stem_KineticVariable"); setTerminalStyle("Term_Chisel"); setStrokeSharpness("Sharp_Razor"); setKineticVelocity("Vel_Slashing");
      } else if (presetId === "Lineage_2M") {
        setStemWeight("Stem_Sharp"); setTerminalStyle("Term_Thorn"); setStrokeSharpness("Sharp_Razor"); setCharProportion("P_Slim");
      } else if (presetId === "Lineage_W") {
        setStemWeight("Stem_Block"); setTerminalStyle("Term_Blade"); setDeformationDamage("Damage_Erosion"); setSlicingIntensity("Slic_Partial");
      } else if (presetId === "Aion_Original") {
        setCharProportion("P_Condensed"); setStemWeight("Stem_Std"); setTerminalStyle("Term_Round"); setKineticVelocity("Vel_Swift");
      } else if (presetId === "Aion_2") {
        setTerminalStyle("Term_Blade"); setStrokeTexture("Tex_Hologram"); setKineticVelocity("Vel_Warp"); setCharProportion("P_Slim");
      }
    } else if (activeCat === "Casual") {
      if (presetId === "Jelly") {
        setStemWeight("Chunky"); setTerminalStyle("Term_Round"); setKineticVelocity("Kinetic_Squash"); setCasualGloss("Gloss_Candy");
      } else if (presetId === "Mecha") {
        setStemWeight("Slim"); setTerminalStyle("Term_Pointy"); setKineticVelocity("Kinetic_Squash"); setStrokeSharpness("Sharp_Crisp");
      } else if (presetId === "Pop") {
        setStemWeight("Chunky"); setTerminalStyle("Term_Pointy"); setCasualOutline("Outline_Double"); setCasualSticker("Sticker_White");
      }
    } else if (activeCat === "Calli") {
      if (presetId === "Haeng") {
        setWritingSpeed("Fast"); setCalliConnection("Organic"); setKineticVelocity("Sword");
      } else if (presetId === "Cho") {
        setWritingSpeed("Wild"); setCalliConnection("Organic"); setStrokeTexture("Partial");
      }
    } else if (activeCat === "Western") {
      if (presetId === "Blackletter") {
        setStemWeight("Broad"); setSlantAngle("Slant_0"); setWesternSerif("Slab"); setWesternOrnament("Minimal");
      } else if (presetId === "Copperplate") {
        setStemWeight("Pointed"); setSlantAngle("Slant_55"); setWesternSerif("Hairline"); setWesternOrnament("Maximal");
      }
    } else if (activeCat === "Cyber") {
      if (presetId === "DataGlitch") {
        setDeformationDamage("Pixelization"); setCyberGlitch("HorizontalDistort"); setStrokeTexture("DigitalNoise");
      } else if (presetId === "NeonCity") {
        setCyberGlow("OuterGlow"); setStrokeTexture("Tex_Hologram"); setKineticVelocity("DataFlow");
      }
    } else if (activeCat === "Street") {
      if (presetId === "Wildstyle") {
        setKineticVelocity("Explosive"); setTerminalStyle("Arrow"); setStreetExtrusion("DeepShadow");
      } else if (presetId === "Tagging") {
        setWritingSpeed("Violent"); setStreetDrip("LongDrip"); setStrokeSharpness("HandDrawn");
      }
    }

    // 변경된 필드들에 하이라이트 효과 트리거
    triggerHighlight('weight'); triggerHighlight('terminal'); triggerHighlight('texture'); triggerHighlight('kinetic');
  };

  // --- 핸들러 함수들 ---
  const handleCategoryChange = (catId) => {
    setActiveCat(catId);
    setCustomDesignInjections("");
    setAspectRatio("16:9");
    setLayoutType("1Line");
    setCharProportion("P_Std");
    setCharWidth("Normal");

    // 카테고리 변경 시 기본 프리셋 초기화 및 적용
    if (catId === "MMO") {
      handleScriptPresetChange("Lineage_M");
    } else if (catId === "Casual") {
      handleScriptPresetChange("Pop");
    } else if (catId === "Calli") {
      handleScriptPresetChange("Haeng");
    } else if (catId === "Western") {
      handleScriptPresetChange("Copperplate");
    } else if (catId === "Cyber") {
      handleScriptPresetChange("NeonCity");
    } else if (catId === "Street") {
      handleScriptPresetChange("Wildstyle");
    }
  };

  const triggerHighlight = (fieldId) => {
    setHighlightedFields(prev => new Set([...prev, fieldId]));
    setTimeout(() => { setHighlightedFields(prev => { const next = new Set(prev); next.delete(fieldId); return next; }); }, 3000);
  };

  const updateDynamicField = (setter, val, currentVal, fieldId, stateKey) => {
    if (!val) return;
    if (typeof val === 'object' && val.id) {
      const newItem = { id: val.id, ko: val.name_ko || val.name || val.id, en: val.name_en || val.name || val.id, name: val.name_ko || val.name || val.id, en_desc: val.en_desc || val.en || val.name || "", isNew: true };
      setDynamicOptions(prev => {
        const list = prev[stateKey] || [];
        if (list.some(item => item.id === newItem.id)) return prev;
        return { ...prev, [stateKey]: [...list, newItem] };
      });
      setter(val.id); triggerHighlight(fieldId);
    } else if (typeof val === 'string' && val !== currentVal) {
      setter(val); triggerHighlight(fieldId);
    }
  };

  const handleReset = () => {
    setDynamicOptions({
      MMOStyles: [], CasualStyles: [], CalliStyles: [], WesternStyles: [], CyberStyles: [], StreetStyles: [],
      strokeTextures: [], deformationDamages: [],
      terminalStyles: [], stemWeights: [],
      strokeSharpness: [], strokeAngularity: [], writingSpeeds: [],
      widths: [], kerningOptions: [], strokeExtensions: [], kineticVelocities: [], slicingIntensities: []
    });
    setCustomDesignInjections("");
    setDramaticPrompt("");
    setTranslatedBase("");
    setTranslatedEnhanced("");
    setAiRecSummary(null);
    setBase64Image(null);
    setBaseLangView('en');
    setEnhancedLangView('en');
    setArtisticFreedom(false);
    setPerfectionMode(false);
    setOverDeformation(false);
    setMomentumActive(false);
    handleCategoryChange(activeCat);
  };

  const processFile = (file) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1];
      setBase64Image(base64);
      handleImageAnalysis(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => { setIsDragging(false); };
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file && file.type.startsWith('image/')) processFile(file); };
  const handleImageUpload = (e) => { const file = e.target.files[0]; if (file) processFile(file); };

  const translateWithAi = async (text, setter, loadingSetter, viewSetter) => {
    if (!text) return;
    loadingSetter(true);
    const prompt = `Translate the following technical typography prompt into natural, expert-level Korean. [STRICT]: Use professional design terminology. Maintain all special technical tags [BRACKETS]. Text: \n\n ${text}`;
    try {
      const response = await fetch(geminiUrl(), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0 }
        })
      });
      const data = await response.json();
      setter(data.candidates[0].content.parts[0].text);
      if (viewSetter) viewSetter('ko');
    } catch (e) { console.error(e); } finally { loadingSetter(false); }
  };

  const handleImageAnalysis = async (imgData) => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    const catDesc = staticOptions.categories.find(c => c.id === activeCat)?.description || "";
    const prompt = `Act as a master typography analyst. You are currently working on a "${activeCat}" project.
    [GENRE CONSTRAINTS]: ${catDesc}.
    Analyze the uploaded image. [STRICT]: Your analysis and recommendations MUST strictly stay within the aesthetic language of "${activeCat}".
    Focus on morphology. If you create a new style, use object format: {"id":"new_id","isNew":true,"name_ko":"한글명","name_en":"EngName","en_desc":"Technical description"}.
    Return JSON: {"setCategory":"${activeCat}","setStyle":"id_or_obj","setWeight":"id_or_obj","creativeInjection":"text"}`;
    try {
      const response = await fetch(geminiUrl(), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "image/png", data: imgData } }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0 }
        })
      });
      const data = await response.json();
      const res = extractJson(data.candidates[0].content.parts[0].text);
      updateDynamicField(handleScriptPresetChange, res.setStyle, scriptType, 'subTheme', activeCat + 'Styles');
      updateDynamicField(setStemWeight, res.setWeight, stemWeight, 'weight', 'stemWeights');
      if (res.creativeInjection) setCustomDesignInjections(res.creativeInjection);
    } catch (e) { console.error(e); } finally { setIsAnalyzing(false); }
  };

  const handleAiRecommendation = async () => {
    if (isRecommending) return;
    setIsRecommending(true);
    const catDesc = staticOptions.categories.find(c => c.id === activeCat)?.description || "";
    const prompt = `Act as an Elite Art Director for a "${activeCat}" typography project. Analyze user's text "${inputText}" and design directive "Aura".
    [MANDATORY GENRE FOCUS]: ${catDesc}.
    [USER INPUT]: Text: "${inputText}", Manual Direction: "${customDesignInjections || "None"}".
    [STRICT]: Your recommendations MUST strictly adhere to the visual logic of the "${activeCat}" genre. DO NOT suggest elements from other genres.
    [DYNAMIC OPTIONS]: If a perfect match isn't in the preset list, real-time generate a NEW formative option: {"id":"new_id","isNew":true,"name_ko":"한글명","name_en":"EngName","en_desc":"Technical description"}.
    Return JSON: { "summary": { "title": "한글 제목", "reason": "추천 사유" }, "setStyle": "id_or_obj", "setWeight": "id_or_obj", "setTerminal": "id_or_obj", "setTexture": "id_or_obj", "setKinetic": "id_or_obj", "setSharpness": "id_or_obj", "setKerning": "id_or_obj" }`;
    try {
      const response = await fetch(geminiUrl(), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0 }
        })
      });
      const data = await response.json();
      const res = extractJson(data.candidates[0].content.parts[0].text);
      if (res.summary) setAiRecSummary(res.summary);
      updateDynamicField(handleScriptPresetChange, res.setStyle, scriptType, 'subTheme', activeCat + 'Styles');
      updateDynamicField(setStemWeight, res.setWeight, stemWeight, 'weight', 'stemWeights');
      updateDynamicField(setTerminalStyle, res.setTerminal, terminalStyle, 'terminal', 'terminalStyles');
      updateDynamicField(setStrokeTexture, res.setTexture, strokeTexture, 'texture', 'strokeTextures');
      updateDynamicField(setKineticVelocity, res.setKinetic, kineticVelocity, 'kinetic', 'kineticVelocities');
      updateDynamicField(setStrokeSharpness, res.setSharpness, strokeSharpness, 'sharpness', 'strokeSharpness');
      updateDynamicField(setKerning, res.setKerning, kerning, 'kerning', 'kerningOptions');
    } catch (e) { console.error(e); } finally { setIsRecommending(false); }
  };

  const buildPrompts = () => {
    const isKr = lang === 'ko';
    const styleList = [...(staticOptions[activeCat + 'Styles'] || []), ...(dynamicOptions[activeCat + 'Styles'] || [])];
    const weightList = isCasual ? [...staticOptions.CasualWeights, ...(dynamicOptions.stemWeights || [])] : (isCalli ? [...staticOptions.CalliBrushes, ...(dynamicOptions.stemWeights || [])] : (isWestern ? [...staticOptions.WesternNibs, ...(dynamicOptions.stemWeights || [])] : (isCyber ? [...staticOptions.CyberForms, ...(dynamicOptions.stemWeights || [])] : (isStreet ? [...staticOptions.StreetForms, ...(dynamicOptions.stemWeights || [])] : [...staticOptions.stemWeights, ...(dynamicOptions.stemWeights || [])]))));
    const kerningList = isCasual ? [...staticOptions.CasualKernings, ...(dynamicOptions.kerningOptions || [])] : (isCalli ? [...staticOptions.CalliConnections, ...(dynamicOptions.kerningOptions || [])] : (isWestern ? [...staticOptions.WesternProportions, ...(dynamicOptions.kerningOptions || [])] : (isCyber ? [...staticOptions.CyberKernings, ...(dynamicOptions.kerningOptions || [])] : (isStreet ? [...staticOptions.StreetKernings, ...(dynamicOptions.kerningOptions || [])] : [...staticOptions.kerningOptions, ...(dynamicOptions.kerningOptions || [])]))));
    const terminalList = isCasual ? [...staticOptions.CasualTerminals, ...(dynamicOptions.terminalStyles || [])] : (isCalli ? [...staticOptions.CalliTerminals, ...(dynamicOptions.terminalStyles || [])] : (isWestern ? [...staticOptions.WesternTerminals, ...(dynamicOptions.terminalStyles || [])] : (isCyber ? [...staticOptions.CyberTerminals, ...(dynamicOptions.terminalStyles || [])] : (isStreet ? [...staticOptions.StreetTerminals, ...(dynamicOptions.terminalStyles || [])] : [...staticOptions.terminalStyles, ...(dynamicOptions.terminalStyles || [])]))));
    const sharpnessList = isCasual ? [...staticOptions.CasualSharpness, ...(dynamicOptions.strokeSharpness || [])] : (isCalli ? [...staticOptions.CalliStarts, ...(dynamicOptions.strokeSharpness || [])] : (isWestern ? [...staticOptions.WesternContrasts, ...(dynamicOptions.strokeSharpness || [])] : (isCyber ? [...staticOptions.CyberSharpness, ...(dynamicOptions.strokeSharpness || [])] : (isStreet ? [...staticOptions.StreetSharpness, ...(dynamicOptions.strokeSharpness || [])] : [...staticOptions.strokeSharpness, ...(dynamicOptions.strokeSharpness || [])]))));
    const textureList = isCyber ? [...staticOptions.CyberTextures, ...(dynamicOptions.strokeTextures || [])] : (isStreet ? [...staticOptions.StreetTextures, ...(dynamicOptions.strokeTextures || [])] : [...staticOptions.strokeTextures, ...(dynamicOptions.strokeTextures || [])]);
    const kineticList = isCasual ? [...staticOptions.CasualKinetic, ...(dynamicOptions.kineticVelocities || []).filter(v => v.id.startsWith('Casual'))] : (isCalli ? [...staticOptions.CalliKinetics, ...(dynamicOptions.kineticVelocities || [])] : (isWestern ? [...staticOptions.WesternKinetics, ...(dynamicOptions.kineticVelocities || [])] : (isCyber ? [...staticOptions.CyberKinetics, ...(dynamicOptions.kineticVelocities || [])] : (isStreet ? [...staticOptions.StreetKinetics, ...(dynamicOptions.kineticVelocities || [])] : [...staticOptions.kineticVelocities, ...(dynamicOptions.kineticVelocities || [])]))));
    const slantList = isCasual ? staticOptions.CasualSlants : (isCalli ? staticOptions.CalliSpeeds : (isWestern ? staticOptions.WesternSlants : (isCyber ? staticOptions.CyberSlants : (isStreet ? staticOptions.StreetSlants : staticOptions.slantAngles))));
    const destList = isCalli ? staticOptions.CalliDestructions : (isCyber ? staticOptions.CyberDestructions : (isStreet ? staticOptions.StreetDestructions : staticOptions.deformationDamages));

    const styleEn = getOptionEn(styleList, scriptType);
    const weightEn = getOptionEn(weightList, stemWeight);
    const kerningEn = getOptionEn(kerningList, kerning);
    const terminalEn = getOptionEn(terminalList, terminalStyle);
    const sharpnessEn = getOptionEn(sharpnessList, strokeSharpness);
    const textureEn = getOptionEn(textureList, strokeTexture);
    const widthEn = getOptionEn(staticOptions.widths, charWidth);
    const proportionEn = getOptionEn(staticOptions.proportions, charProportion);
    const kineticEn = getOptionEn(kineticList, isWestern ? westernKinetic : kineticVelocity);
    const slantEn = getOptionEn(slantList, slantAngle);
    const destructionEn = getOptionEn(destList, deformationDamage);

    let genreSpecEn = "";
    if (isCasual) {
      genreSpecEn = `- Inner Core Density: ${getOptionEn(staticOptions.CasualInnerSpaces, casualInnerSpace)}
- Layered Boundary: ${getOptionEn(staticOptions.CasualOutlines, casualOutline)}
- Surface Finish: ${getOptionEn(staticOptions.CasualGlosses, casualGloss)}
- Graphic Treatment: ${getOptionEn(staticOptions.CasualStickers, casualSticker)}
- Manga Elements: ${getOptionEn(staticOptions.CasualDecorations, casualDecoration)}`;
    } else if (isCalli) {
      genreSpecEn = `- Ink Style: ${getOptionEn(staticOptions.CalliInks, calliInk)}
- Edge Texture (Dry Brush): ${textureEn}
- Authentication: ${getOptionEn(staticOptions.CalliSeals, calliSeal)}
- Spatter: ${getOptionEn(staticOptions.CalliSplatters, calliSplatter)}
- Medium: ${getOptionEn(staticOptions.CalliPapers, calliPaper)}
- Initial Touch: ${getOptionEn(staticOptions.CalliStarts, calliInitial)}
- Advanced Energy: ${getOptionEn(staticOptions.CalliDestructions, calliDestruction)}`;
    } else if (isWestern) {
      genreSpecEn = `- Proportion: ${getOptionEn(staticOptions.WesternProportions, westernProportion)}
- Contrast: ${getOptionEn(staticOptions.WesternContrasts, westernContrast)}
- Serif Type: ${getOptionEn(staticOptions.WesternSerifs, westernSerif)}
- Baseline Rhythm: ${getOptionEn(staticOptions.WesternBaselines, westernBaseline)}
- Ornamentation: Flourish(${westernFlourish}), Ornaments(${getOptionEn(staticOptions.WesternOrnaments, westernOrnament)})
- Stroke Effect: ${getOptionEn(staticOptions.WesternStrokeLines, westernStrokeLine)}
- Technical: Ligature(${westernLigature}), Bleeding(${westernBleeding}), Tension(${getOptionEn(staticOptions.WesternTensions, westernTension)})
- Slant Angle: ${slantEn}`;
    } else if (isCyber) {
      genreSpecEn = `- Connection: ${getOptionEn(staticOptions.CyberConnections, cyberConnection)}
- Glitch Effect: ${getOptionEn(staticOptions.CyberGlitches, cyberGlitch)}
- Neon Intensity: ${getOptionEn(staticOptions.CyberGlows, cyberGlow)}
- Transparency: ${getOptionEn(staticOptions.CyberTransparencies, cyberTrans)}
- Dynamics: Kinetic(${kineticEn}), Slant(${slantEn})
- Destruction: ${destructionEn}`;
    } else if (isStreet) {
      genreSpecEn = `- Weight Contrast: ${getOptionEn(staticOptions.StreetWeights, streetWeightContrast)}
- 3D Extrusion: ${getOptionEn(staticOptions.StreetExtrusions, streetExtrusion)}
- Paint Drip: ${getOptionEn(staticOptions.StreetDrips, streetDrip)}
- Background Synthesis: ${getOptionEn(staticOptions.StreetBackgrounds, streetBG)}
- Urban Destruction: ${destructionEn}`;
    } else {
      genreSpecEn = `- Execution: Speed(${getOptionEn(staticOptions.writingSpeeds, writingSpeed)}), Slant(${slantEn}), Texture(${textureEn}), Angularity(${getOptionEn(staticOptions.strokeAngularity, strokeAngularity)}), ${destructionEn}
- Dynamics: Slicing(${getOptionEn(staticOptions.slicingIntensities, slicingIntensity)})`;
    }

    const occupancyEn = getOptionEn(staticOptions.occupancies, occupancy);
    const bgOption = staticOptions.base.find(o => o.id === baseStyle);
    const bgDesc = bgOption?.en || "JET BLACK Background";

    const isSingleLine = layoutType === "1Line";
    const layoutEn = isSingleLine
      ? `[LAYOUT MANDATE]: ABSOLUTELY SINGLE HORIZONTAL ROW. NO VERTICAL STACKING. Even for long text "${inputText}", maintain one continuous linear row. PROHIBIT MULTI-LINE ARRANGEMENTS.`
      : `[LAYOUT MANDATE]: Balanced Two-tier vertical stacked composition. Split text into two horizontal rows.`;

    const artisticBoost = artisticFreedom ? `
[ULTRA MORPHOLOGICAL INNOVATION]: ENABLED. PRIORITIZE UNIQUE STRUCTURAL FORM OVER PARAMETRIC RIGIDITY.
- Morphology: Experiment with bespoke anatomical breakthroughs in character skeletons. Focus on creating eye-catching, interesting shapes that break standard expectations.
- Balance: Achieve a high-impact 'Twisted Balance' where asymmetrical energy creates a gripping visual weight.
- Silhouette: Maximize the distinctiveness of the character mass. Ensure the overall silhouette is captivating and iconic.
- Aesthetic: Avoid superficial effects (motion blur, heavy texturing, material shaders). Instead, refine the architecture of the glyphs to evoke artistic brilliance and structural fun.` : "";

    const qualityBoost = perfectionMode ? `
[PREMIUM LOGOTYPE SYNTHESIS]: ENABLED. EMULATE HIGH-END COMMERCIAL TYPOGRAPHY.
- Non-Generic Morphology: PROHIBIT generic font appearances. Reconstruct each character as a bespoke architectural element.
- Design Integration: Synthesize characters into a unified visual mark. Integrate negative space intelligently as seen in premium branding.
- Stroke Engineering: Apply professional stroke modifications (sharp chamfers, custom filleting, and balanced counter-forms) common in AAA game titles and luxury brand identities.
- Completion: Maximize visual density and structural integrity. Every glyph must feel like it was manually refined by a senior art director.` : "";

    const transformationBoost = overDeformation ? (() => {
      switch (activeCat) {
        case 'MMO': return `\n[CREATIVE TRANSFORMATION: DESTRUCTION]: MANDATORY. Select one core part and destroy/deform it excessively to create high visual tension and battle-worn structural severance.`;
        case 'Casual': return `\n[CREATIVE TRANSFORMATION: EXAGGERATION]: MANDATORY. Apply extreme exaggeration of size and volume. Push character proportions to a surreal, hyper-inflated, or squashed level for maximum visual energy.`;
        case 'Calli': return `\n[CREATIVE TRANSFORMATION: PROPORTIONAL TENSION]: MANDATORY. Create extreme contrast in character proportions. Elongate specific strokes excessively while shrinking others to maximize dramatic negative space and rhythmic tension.`;
        case 'Western': return `\n[CREATIVE TRANSFORMATION: ORNAMENTAL EXTENSION]: MANDATORY. Unleash hyper-extended ornate swashes and flourishes. Decorative lines must aggressively pierce through character boundaries and dominate the surrounding space.`;
        case 'Cyber': return `\n[CREATIVE TRANSFORMATION: DECOMPOSITION]: MANDATORY. Violently slice and decompose character data. Create massive structural gaps, digital fragmentation, and electronic severance that break the core silhouette.`;
        case 'Street': return `\n[CREATIVE TRANSFORMATION: DISTORTION]: MANDATORY. Warp and twist character silhouettes into aggressive, fluid distortions typical of advanced wildstyle graffiti. Break all standard anatomical rules for form.`;
        default: return `\n[CREATIVE TRANSFORMATION]: MANDATORY. Apply aggressive structural transformation and rule-breaking to create a unique 'Twisted Balance'.`;
      }
    })() : "";

    const momentumBoost = momentumActive ? (() => {
      switch (activeCat) {
        case 'MMO': return `\n[DYNAMIC MOMENTUM: KINETIC IMPACT]: MANDATORY. Prioritize raw kinetic energy over symmetry. Use aggressive angular cuts and sharp cutting trajectories that feel like physical strikes with heavy mass.`;
        case 'Casual': return `\n[DYNAMIC MOMENTUM: ELASTIC BOUNCE]: MANDATORY. Prioritize bouncy, asymmetric motion energy. Unleash pure kinetic elasticity with exaggerated squash-and-stretch trajectories that break formal balance.`;
        case 'Calli': return `\n[DYNAMIC MOMENTUM: SWORD-DANCE]: MANDATORY. Prioritize explosive brush speed and fluid 'Sword-dance' trajectories. Break classic calligraphy symmetry to favor pure directional momentum and rapid ink flow.`;
        case 'Western': return `\n[DYNAMIC MOMENTUM: RHYTHMIC TENSION]: MANDATORY. Prioritize energetic rhythmic tension and sharp, fast-tapering trajectories. Use kinetic stroke flares to break formal alignment and traditional balance.`;
        case 'Cyber': return `\n[DYNAMIC MOMENTUM: DATA FLOW]: MANDATORY. Prioritize high-frequency digital jitter and erratic data-flow momentum. Break structural symmetry with sharp horizontal shifts and electromagnetic kinetic trajectories.`;
        case 'Street': return `\n[DYNAMIC MOMENTUM: EXPLOSION]: MANDATORY. Prioritize explosive radial energy erupting from the center. Break symmetry with chaotic, high-velocity trajectories and aggressive spatial expansion.`;
        default: return `\n[DYNAMIC MOMENTUM]: MANDATORY. Prioritize pure kinetic energy and sharp cutting trajectories over symmetry to achieve a dynamic 'Twisted Balance'.`;
      }
    })() : "";

    const userAura = customDesignInjections ? `\n[USER DESIGN DIRECTION]: ${customDesignInjections}` : "";

    const baseTechnical = `[MASTER TYPO SPECS V10] Text: "${inputText}". ${userAura}
[CORE PHILOSOPHY & MANDATE]:
1. DO NOT render standard flat fonts. Prohibit 'Standard System Font' aesthetics.
2. Render characters as 'Physical Objects' (물체) with structural mass, not mere text symbols.
3. Apply aggressive variable stroke mass: Interplay between razor-thin lines and heavy, angular block masses.
[HIERARCHY]: Character mass is primary. 2D FLAT SILHOUETTE only.
[STRICT MONOCHROME]: NO COLORS, ZERO CHROMA, STRICT BLACK AND WHITE ONLY.
[2D MANDATE]: STRICTLY FLAT GRAPHIC SILHOUETTE. ZERO DEPTH. NO 3D render. ABSOLUTELY NO perspective, bevel, shadow, or embossing.
[ANTI-MATERIAL MANDATE]: PROHIBIT MATERIAL-BASED METAPHORS. NO MAGMA, NO OBSIDIAN, NO METAL SHADERS, NO GLASS TEXTURES, NO INTERNAL LIGHT SOURCES. FOCUS PURELY ON 2D PATH GEOMETRY AND VECTOR SILHOUETTE.
[SPATIAL MANDATE]: THE SUBJECT MUST RESIDE STRICTLY WITHIN THE SPECIFIED OCCUPANCY ZONE (${occupancyEn}). DO NOT STRETCH OR SCALE CHARACTERS TO TOUCH THE EDGES. RESPECT THE NEGATIVE SPACE BORDERS.
[PROPORTION & SCALE]: Maintain wide horizontal proportions. Maximize horizontal span to fill the occupancy zone. Prohibit tall, vertically stretched, or elongated letterforms. If the canvas is wide (16:9 or Cinematic), stretch the kerning or character width horizontally, but keep character height normalized.
${layoutEn}
[MORPHOLOGY]:
- Theme: ${styleEn}.
- Body: ${isWestern ? `Tool(${weightEn}), Proportion(${kerningEn})` : (isCyber ? `ModularForm(${weightEn}), Kerning(${kerningEn})` : (isStreet ? `Structure(${weightEn}), Kerning(${kerningEn})` : `${weightEn}, ${isCalli ? `Connection(${kerningEn})` : `Kerning(${kerningEn})`}`))}, Width(${widthEn}), Specific Proportion(${proportionEn}).
- Detail: ${isCalli ? `Start(${sharpnessEn}), Finish(${terminalEn}), Texture(${textureEn})` : (isWestern ? `Contrast(${sharpnessEn}), Finish(${terminalEn})` : (isCyber ? `Term(${terminalEn}), Sharp(${sharpnessEn}), Texture(${textureEn})` : (isStreet ? `Term(${terminalEn}), Texture(${textureEn}), Sharp(${sharpnessEn})` : `${terminalEn}, ${sharpnessEn}, ${getOptionEn(staticOptions.strokeExtensions, strokeExtension)}`)))}.
${genreSpecEn}
[MOMENTUM]: ${kineticEn}.
[ENVIRONMENT]: AR ${aspectRatio}, ${bgDesc}.${artisticBoost}${qualityBoost}${transformationBoost}${momentumBoost}`.trim();

    const overview = isKr ? `"${inputText}" V10 프롬프트` : `"${inputText}" Prompt`;

    const chatGPTOutput = `Act as an expert Typography Engine. Render "${inputText}" with a 'Twisted Balance' philosophy:
1. User Direction: ${customDesignInjections || "Follow professional typography logic."}
2. Anti-Font & Anti-Material Mandate: Prohibit standard font looks and 3D material shaders (magma, obsidian, metal). Reconstruct characters as 'Graphic Objects' rendered in 2D flat silhouette.
3. Form & Balance: ${artisticFreedom ? 'Prioritize unique morphological breakthroughs and interesting structural fun over symmetry.' : 'Maintain structural integrity.'}
4. Transformation: ${transformationBoost ? transformationBoost.replace('\n', '') : 'Break symmetry for artistic tension.'}
5. Momentum: ${momentumBoost ? momentumBoost.replace('\n', '') : 'Prioritize kinetic energy and sharp cutting trajectories.'}
6. Core Specs: ${activeCat} theme, ${styleEn}, ${weightEn} stem, ${widthEn} width, ${proportionEn} ratio.
7. Detail: ${terminalEn} terminals, ${sharpnessEn} edges, ${textureEn} surface.
8. Constraints: STRICT BLACK AND WHITE, 2D FLAT GRAPHIC.`.trim();

    const midjourneyOutput = `${inputText} typography logotype, ${customDesignInjections ? customDesignInjections + ', ' : ''}twisted balance, bespoke object-like morphology, ${activeCat} ${transformationBoost ? 'transformation' : 'deformation'}, ${momentumActive ? 'extreme dynamic momentum' : 'kinetic energy'}, ${artisticFreedom ? 'iconic structural silhouette, morphological fun' : 'sharp architectural lines'}, angular cuts, ${baseStyle === 'BlackWhite' ? 'white on black' : 'black on white'}, 2D flat graphic silhouette, ${kineticEn}, ${styleEn}, ${isSingleLine ? "single horizontal line, " : "stacked lines, "}${isCasual ? `bold outlines, sticker effect, ` : (isWestern ? `ornate flourishes, ` : (isCyber ? `glitch digital artifacts, neon glow, ` : (isStreet ? `3D extrusion mural, spray paint, ` : "")))} ${terminalEn}, ${occupancyEn}, --ar ${aspectRatio.replace(':', ':')} --no 3d, volumetric, perspective, emboss, bevel, shadow, color, font, texture, glow`.trim();

    let finalOut = overview;
    if (aiModel === 'NanoBanana') finalOut = dramaticPrompt || "Enhance first.";
    else if (aiModel === 'ChatGPT') finalOut = chatGPTOutput;
    else if (aiModel === 'Midjourney') finalOut = midjourneyOutput;
    else if (aiModel === 'Overview') finalOut = overview;

    return { baseTechnical, outputContent: finalOut, weightList, kerningList, terminalList, sharpnessList, textureList, kineticList, styleList, slantList };
  };

  const copyToClipboard = (text, type) => {
    const textArea = document.createElement("textarea"); textArea.value = text || ''; document.body.appendChild(textArea); textArea.select();
    try { document.execCommand('copy'); if (type === 'top') setCopiedTop(true); else setCopiedBottom(true); setTimeout(() => { setCopiedTop(false); setCopiedBottom(false); }, 2000); } catch (err) { /* ignore */ }
    document.body.removeChild(textArea);
  };

  const requestDramaticEnhancement = async () => {
    if (isEnhancing) return;
    setIsEnhancing(true);
    const { baseTechnical } = buildPrompts();
    const systemPrompt = `You are a visionary Avant-Garde Art Director for "Nano Banana 2".
    [CORE VISION]: Transform technical specs into a morphological masterpiece. Focus on structural intrigue and bespoke character anatomy.
    [STRICT AESTHETIC MANDATE]:
    1. PROHIBIT ALL MATERIAL SHADERS: Do NOT use metaphors like magma, obsidian, lava, chrome, liquid metal, glass, or stone.
    2. PROHIBIT VOLUMETRIC LIGHTING: Do NOT use terms like internal light source, glowing core, radiating energy, or ambient occlusion.
    3. FOCUS ON SILHOUETTE: The artistic value must come purely from the 2D path geometry, stroke weight variations, and the interesting 'fun' of the character skeleton.
    [TWISTED BALANCE]: Violently disrupt standard symmetry to find a new, gripping structural center.
    [MORPHOLOGY OVERHAUL]: Morph letters into a physical 'Object' but rendered as a 100% FLAT VECTOR SILHOUETTE.
    ${perfectionMode ? `[PREMIUM QUALITY]: Reconstruct characters into a high-end commercial logotype. Zero resemblance to standard fonts.` : ""}
    ${artisticFreedom ? `[ARTISTIC FORM FOCUS]: Actively experiment with daring morphological breakthroughs. Create an iconic, eye-catching silhouette that is visually addictive. Focus on the 'fun' of the structure geometry.` : ""}
    ${overDeformation ? `[MAXIMAL TRANSFORMATION]: Actively transform the anatomy based on genre: ${activeCat}.` : ""}
    ${momentumActive ? `[DYNAMIC MOMENTUM]: Inject asymmetric kinetic energy through sharp cutting trajectories and vector velocity trails.` : ""}
    [STRICT 2D RULE]: 100% flat graphic silhouette. ABSOLUTELY NO 3D, NO PERSPECTIVE, NO VOLUME, NO TEXTURE-BASED DEPTH.
    [OUTPUT FORMAT]: Bold Artistic Headers, structural Markdown.
    1. # ARCHITECTURAL EVOLUTION (The evolution of form geometry)
    2. # KINETIC ORGANIC ANATOMY (The flow of vector lines)
    3. # THE UNBOUNDED BOUNDARY (The eye-catching flat balance)
    4. # THE SUPREME COMMAND: Consolidated elite prompt string.`;
    try {
      const response = await fetch(geminiUrl(), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: baseTechnical }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { temperature: 0 }
        })
      });
      const data = await response.json();
      setDramaticPrompt(data.candidates?.[0]?.content?.parts?.[0]?.text || "");
      setTranslatedEnhanced("");
      setEnhancedLangView('en');
      setAiModel('NanoBanana');
    } catch (err) { /* ignore */ } finally { setIsEnhancing(false); }
  };

  const {
    baseTechnical,
    outputContent,
    styleList,
    weightList,
    kerningList,
    terminalList,
    sharpnessList,
    textureList,
    kineticList,
    slantList
  } = buildPrompts();

  const StructuredText = ({ content }) => {
    if (!content || typeof content !== 'string') return null;
    const lines = content.split('\n');
    return lines.map((line, i) => {
      const isHeader = line.trim().startsWith('#') || line.trim().startsWith('**');
      if (isHeader) return <p key={i} className="text-white font-black text-[16px] uppercase tracking-tighter mt-8 mb-4 border-l-4 border-indigo-500 pl-4">{line.replace(/#|\*/g, '').trim()}</p>;
      return <p key={i} className={`mb-2 leading-relaxed ${line.trim().startsWith('-') ? 'pl-6 text-indigo-200/90 font-medium' : 'text-zinc-300'}`}>{line}</p>;
    });
  };

  const t = {
    bg: theme === 'dark' ? 'bg-[#121212]' : 'bg-zinc-100',
    sidebarLeft: theme === 'dark' ? 'bg-[#121212] border-zinc-800' : 'bg-white border-zinc-300',
    sidebarRight: theme === 'dark' ? 'bg-[#18181B] border-zinc-800' : 'bg-zinc-50 border-zinc-300',
    menuItem: theme === 'dark' ? 'border-transparent text-zinc-500 hover:bg-zinc-800/30 hover:text-zinc-200' : 'border-transparent text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 font-medium',
    card: theme === 'dark' ? 'bg-[#18181B] border-zinc-800' : 'bg-white border-zinc-300 shadow-sm',
    textColor: theme === 'dark' ? 'text-zinc-100' : 'text-zinc-900',
  };

  // 카테고리 액센트 컬러 (hex) — Tailwind JIT 가 동적 클래스를 못 잡기에 인라인 style 로 처리.
  const accentHex = activeCat === 'Casual' ? '#F43F5E' : (activeCat === 'Calli' ? '#10B981' : (activeCat === 'Western' ? '#F59E0B' : (activeCat === 'Cyber' ? '#06B6D4' : (activeCat === 'Street' ? '#F97316' : '#6366F1'))));

  return (
    <div className={`flex flex-col h-full ${t.bg} ${t.textColor} font-sans overflow-hidden transition-all duration-300`}>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 5px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 10px; }`}</style>
      <main className="flex-1 flex overflow-hidden">
        <aside className={`${isSidebarOpen ? 'w-[240px]' : 'w-[72px]'} border-r ${t.sidebarLeft} flex flex-col transition-[width] duration-300 relative z-[200]`}>
          <div className="h-[72px] flex items-center px-6 justify-between overflow-hidden">
            {isSidebarOpen ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-gradient-to-br from-indigo-600 to-rose-500 text-white flex items-center justify-center shrink-0 shadow-lg"><Feather className="w-4 h-4" /></div>
                <h1 className="text-xl font-black tracking-tighter">TypoCore <span className="text-[10px] opacity-40">v10</span></h1>
              </div>
            ) : (
              <button onClick={() => setIsSidebarOpen(true)} className="w-11 h-11 mx-auto rounded-md flex items-center justify-center hover:bg-zinc-800/50"><Menu className="w-5 h-5" /></button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 custom-scrollbar">
            {staticOptions.categories.map(cat => {
              const isActive = activeCat === cat.id;
              return (
                <button key={cat.id} onClick={() => handleCategoryChange(cat.id)}
                  className={`flex items-center transition-all border ${isSidebarOpen ? 'w-full px-3 py-2.5 rounded-md justify-start gap-3' : 'w-11 h-11 mx-auto rounded-md justify-center'} ${isActive ? 'text-zinc-100' : t.menuItem}`}
                  style={isActive ? { background: `${accentHex}1A`, borderColor: `${accentHex}4D` } : {}}
                >
                  <div className="shrink-0">{cat.icon}</div>
                  {isSidebarOpen && (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[12px] font-bold">{cat.name}</span>
                      {cat.isTest && <span className="text-[8px] bg-indigo-500 text-white px-1.5 py-0.5 rounded font-black tracking-tighter shadow-sm animate-pulse">TEST</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <div className="px-3 pb-5">
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className={`flex items-center border ${t.menuItem} ${isSidebarOpen ? 'w-full px-3 py-2.5 rounded-md justify-start gap-3' : 'w-11 h-11 mx-auto rounded-md justify-center'}`}>
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </aside>

        <aside className="w-[360px] border-r bg-zinc-900/10 flex flex-col z-[100] border-zinc-800/50 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          <div className={`rounded-xl border-2 p-5 bg-[#1F1F27] border-indigo-500/40 shadow-2xl space-y-5`}>
            <div>
              <div className="mb-1 text-[10px] font-black uppercase opacity-50 flex items-center gap-1.5"><Command className="w-3 h-3" /> Subject Text</div>
              <input value={inputText} onChange={e => setInputText(e.target.value)} className="w-full bg-transparent text-[24px] font-black outline-none" />
            </div>
            <div>
              <div className="mb-1 text-[10px] font-black uppercase opacity-50 flex items-center gap-1.5"><SparkleIcon className="w-3 h-3" /> Design Direction (Aura)</div>
              <textarea value={customDesignInjections} onChange={e => setCustomDesignInjections(e.target.value)} placeholder={dict.specialPlaceholder} className="w-full bg-transparent text-[11px] outline-none h-16 resize-none" />
            </div>
            <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`relative rounded-lg border-2 border-dashed p-4 text-center transition-all ${isDragging ? 'border-indigo-400 bg-indigo-500/10' : 'border-zinc-700'}`}>
              {base64Image ? <div className="flex items-center justify-between"><img src={`data:image/png;base64,${base64Image}`} className="w-8 h-8 rounded" alt="reference" /><button onClick={() => setBase64Image(null)}><X className="w-4 h-4 text-red-500" /></button></div> : <div className="text-[10px] opacity-40 uppercase">Mimic Image Form</div>}
              {!base64Image && <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />}
            </div>
          </div>

          <section>
            <SectionHeader id="01" label={dict.baseLayout} icon={<LayoutTemplate className="w-3.5 h-3.5" />} theme={theme} helpText={dict.help01} />
            <div className={`p-4 rounded-lg border ${t.card} space-y-4 mt-2`}>
              <div className="grid grid-cols-2 gap-3">
                <DropdownControl label={dict.ratio} data={staticOptions.ratios} value={aspectRatio} onChange={setAspectRatio} theme={theme} activeCat={activeCat} lang={lang} />
                <DropdownControl label={dict.occupancy} data={staticOptions.occupancies} value={occupancy} onChange={setOccupancy} theme={theme} activeCat={activeCat} lang={lang} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <DropdownControl label={dict.background} icon={<BoxIcon className="w-3 h-3" />} data={staticOptions.base} value={baseStyle} onChange={setBaseStyle} theme={theme} activeCat={activeCat} lang={lang} />
                <DropdownControl label={dict.layout} data={staticOptions.layouts} value={layoutType} onChange={setLayoutType} theme={theme} activeCat={activeCat} lang={lang} />
              </div>

              <DropdownControl label={dict.subTheme} data={styleList} value={scriptType} onChange={handleScriptPresetChange} theme={theme} activeCat={activeCat} lang={lang} />

              <div className="grid grid-cols-5 gap-2">
                <button onClick={handleAiRecommendation} disabled={isRecommending} className="col-span-4 py-3 rounded-lg bg-indigo-600 text-white font-black text-[11px] uppercase flex items-center justify-center gap-2">{isRecommending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />} {dict.recommendBtn}</button>
                <button onClick={handleReset} className="border border-zinc-800 rounded-lg flex items-center justify-center"><RefreshCcw className="w-4 h-4 opacity-40" /></button>
              </div>
              {aiRecSummary && (
                <div className={`mt-2 p-3 rounded-lg border animate-in fade-in duration-500 ${theme === 'dark' ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
                  <p className={`text-[11px] font-black mb-1 ${theme === 'dark' ? 'text-indigo-300' : 'text-indigo-900'}`}>{aiRecSummary.title}</p>
                  <p className={`text-[10px] leading-relaxed ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>{aiRecSummary.reason}</p>
                </div>
              )}
            </div>
          </section>

          <section>
            <SectionHeader id="02" label={dict.catSpecs} icon={<Anchor className="w-3.5 h-3.5" />} theme={theme} helpText={dict.help02} />
            <div className={`p-4 rounded-lg border ${t.card} space-y-4 mt-2`}>
              <div className="grid grid-cols-2 gap-3">
                <DropdownControl label={isCasual ? dict.casualWeight : (isCalli ? dict.calliBrush : (isWestern ? dict.westernNib : (isCyber ? "뼈대 조형" : (isStreet ? "뼈대 구조" : dict.stemWeight))))} data={weightList} value={stemWeight} onChange={setStemWeight} theme={theme} activeCat={activeCat} isHighlighted={highlightedFields.has('weight')} lang={lang} />
                <DropdownControl label={isCalli ? "글자 간 연면" : (isWestern ? "글꼴 비례" : dict.kerning)} data={kerningList} value={isCalli ? calliConnection : (isWestern ? westernProportion : kerning)} onChange={isCalli ? setCalliConnection : (isWestern ? setWesternProportion : setKerning)} theme={theme} activeCat={activeCat} lang={lang} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <DropdownControl label={dict.charWidth} data={staticOptions.widths} value={charWidth} onChange={setCharWidth} theme={theme} activeCat={activeCat} lang={lang} />
                <DropdownControl label={dict.charProportion} data={staticOptions.proportions} value={charProportion} onChange={setCharProportion} theme={theme} activeCat={activeCat} lang={lang} />
              </div>
            </div>
          </section>

          <section>
            <SectionHeader id="03" label={dict.strokeDetail} icon={<Brush className="w-3.5 h-3.5" />} theme={theme} helpText={dict.help03} />
            <div className={`p-4 rounded-lg border ${t.card} space-y-4 mt-2`}>
              <div className="grid grid-cols-2 gap-3">
                <DropdownControl label={isCalli ? "수필(끝) 마감" : (isWestern ? "끝 획 마감" : (isCyber ? "끝 획 마감" : (isStreet ? "끝 획 마감" : dict.terminal)))} data={terminalList} value={terminalStyle} onChange={setTerminalStyle} theme={theme} activeCat={activeCat} lang={lang} />
                <DropdownControl label={isCalli ? "기필(시작) 방식" : (isWestern ? "획의 대비" : (isCyber ? "필선 예리함" : (isStreet ? "필선 질감" : dict.sharpness)))} data={sharpnessList} value={isCalli ? calliInitial : (isWestern ? westernContrast : (isCyber ? strokeSharpness : (isStreet ? strokeTexture : strokeSharpness)))} onChange={isCalli ? setCalliInitial : (isWestern ? setWesternContrast : (isCyber ? setStrokeSharpness : setStrokeTexture))} theme={theme} activeCat={activeCat} lang={lang} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <DropdownControl label={isCasual ? "필선 속 공간" : (isCalli ? "필선 갈라짐" : (isWestern ? "세리프 형태" : (isCyber ? "필선 질감" : (isStreet ? "필선 예리함" : dict.texture))))} data={textureList} value={isCasual ? casualInnerSpace : (isWestern ? westernSerif : strokeTexture)} onChange={isCasual ? setCasualInnerSpace : (isWestern ? setWesternSerif : setStrokeTexture)} theme={theme} activeCat={activeCat} lang={lang} />
                <DropdownControl label={isCalli ? "먹물의 농담/번짐" : (isWestern ? dict.westernStrokeLine : (isCyber ? "획의 연결성" : (isStreet ? "두께 대비" : dict.extension)))} data={isCasual ? staticOptions.CasualExtensions : (isCalli ? staticOptions.CalliInks : (isWestern ? staticOptions.WesternStrokeLines : (isCyber ? staticOptions.CyberConnections : (isStreet ? staticOptions.StreetWeights : staticOptions.strokeExtensions))))} value={isCalli ? calliInk : (isWestern ? westernStrokeLine : (isCyber ? cyberConnection : (isStreet ? streetWeightContrast : strokeExtension)))} onChange={isCalli ? setCalliInk : (isWestern ? setWesternStrokeLine : (isCyber ? setCyberConnection : (isStreet ? setStreetWeightContrast : setStrokeExtension)))} theme={theme} activeCat={activeCat} lang={lang} />
              </div>
            </div>
          </section>

          <section>
            <SectionHeader id="04" label={dict.catDetails} icon={<Settings className="w-3.5 h-3.5" />} theme={theme} helpText={dict.help04} />
            <div className={`p-4 rounded-lg border ${t.card} space-y-4 mt-2`}>
              {isCasual ? (
                <>
                  <DropdownControl label="이중 외곽선 (Outline)" icon={<Layers className="w-3 h-3" />} data={staticOptions.CasualOutlines} value={casualOutline} onChange={setCasualOutline} theme={theme} activeCat={activeCat} lang={lang} />
                  <div className="grid grid-cols-2 gap-3">
                    <DropdownControl label="하이라이트 (Gloss)" icon={<SunMedium className="w-3 h-3" />} data={staticOptions.CasualGlosses} value={casualGloss} onChange={setCasualGloss} theme={theme} activeCat={activeCat} lang={lang} />
                    <DropdownControl label="스티커 효과 (Sticker)" icon={<Sticker className="w-3 h-3" />} data={staticOptions.CasualStickers} value={casualSticker} onChange={setCasualSticker} theme={theme} activeCat={activeCat} lang={lang} />
                  </div>
                </>
              ) : isCalli ? (
                <>
                  <DropdownControl label="낙관 (Seal)" icon={<Stamp className="w-3 h-3" />} data={staticOptions.CalliSeals} value={calliSeal} onChange={setCalliSeal} theme={theme} activeCat={activeCat} lang={lang} />
                  <div className="grid grid-cols-2 gap-3">
                    <DropdownControl label="먹물 튀김" icon={<Droplets className="w-3 h-3" />} data={staticOptions.CalliSplatters} value={calliSplatter} onChange={setCalliSplatter} theme={theme} activeCat={activeCat} lang={lang} />
                    <DropdownControl label="종이 질감" icon={<FileText className="w-3 h-3" />} data={staticOptions.CalliPapers} value={calliPaper} onChange={setCalliPaper} theme={theme} activeCat={activeCat} lang={lang} />
                  </div>
                </>
              ) : isWestern ? (
                <>
                  <DropdownControl label="플러리시 (Flourish)" icon={<RotateCw className="w-3 h-3" />} data={[{ id: "None", name: "없음" }, { id: "Low", name: "심플함" }, { id: "High", name: "화려함" }]} value={westernFlourish} onChange={setWesternFlourish} theme={theme} activeCat={activeCat} lang={lang} />
                  <div className="grid grid-cols-2 gap-3">
                    <DropdownControl label="합자 (Ligature)" icon={<Link className="w-3 h-3" />} data={[{ id: "Off", name: "없음" }, { id: "Std", name: "표준" }, { id: "Full", name: "전체" }]} value={westernLigature} onChange={setWesternLigature} theme={theme} activeCat={activeCat} lang={lang} />
                    <DropdownControl label="잉크 번짐" icon={<CloudRain className="w-3 h-3" />} data={[{ id: "Off", name: "없음" }, { id: "Low", name: "미세 번짐" }, { id: "High", name: "강한 번짐" }]} value={westernBleeding} onChange={setWesternBleeding} theme={theme} activeCat={activeCat} lang={lang} />
                  </div>
                </>
              ) : isCyber ? (
                <>
                  <DropdownControl label="글리치 강도" icon={<ZapPulse className="w-3 h-3" />} data={staticOptions.CyberGlitches} value={cyberGlitch} onChange={setCyberGlitch} theme={theme} activeCat={activeCat} lang={lang} />
                  <div className="grid grid-cols-2 gap-3">
                    <DropdownControl label="네온 글로우" icon={<SunMedium className="w-3 h-3" />} data={staticOptions.CyberGlows} value={cyberGlow} onChange={setCyberGlow} theme={theme} activeCat={activeCat} lang={lang} />
                    <DropdownControl label="투명도" icon={<GhostIcon className="w-3 h-3" />} data={staticOptions.CyberTransparencies} value={cyberTrans} onChange={setCyberTrans} theme={theme} activeCat={activeCat} lang={lang} />
                  </div>
                </>
              ) : isStreet ? (
                <>
                  <DropdownControl label="3D 돌출 (Extrusion)" icon={<BoxIcon className="w-3 h-3" />} data={staticOptions.StreetExtrusions} value={streetExtrusion} onChange={setStreetExtrusion} theme={theme} activeCat={activeCat} lang={lang} />
                  <div className="grid grid-cols-2 gap-3">
                    <DropdownControl label="드립 효과" icon={<Droplets className="w-3 h-3" />} data={staticOptions.StreetDrips} value={streetDrip} onChange={setStreetDrip} theme={theme} activeCat={activeCat} lang={lang} />
                    <DropdownControl label="배경 합성" icon={<LayoutGrid className="w-3 h-3" />} data={staticOptions.StreetBackgrounds} value={streetBG} onChange={setStreetBG} theme={theme} activeCat={activeCat} lang={lang} />
                  </div>
                </>
              ) : (
                <div className="text-[10px] opacity-30 italic text-center py-2">Technical Engine Standard Mode</div>
              )}
            </div>
          </section>

          <section>
            <SectionHeader id="05" label={dict.dynamics} icon={<Activity className="w-3.5 h-3.5" />} theme={theme} helpText={dict.help05} />
            <div className={`p-4 rounded-lg border ${t.card} space-y-4 mt-2`}>
              <div className="grid grid-cols-2 gap-3">
                <DropdownControl label={isCasual ? dict.casualBounce : (isCalli ? "조형적 동세" : (isWestern ? "조형적 동세" : (isCyber ? "조형적 동세" : (isStreet ? "조형적 동세" : dict.kineticVelocity))))} data={kineticList} value={isWestern ? westernKinetic : kineticVelocity} onChange={isWestern ? setWesternKinetic : setKineticVelocity} theme={theme} activeCat={activeCat} lang={lang} />
                <DropdownControl label={isCalli ? "필속(Speed)" : (isCyber ? "전체 기울기" : (isStreet ? "전체 기울기" : (isWestern ? "전체 기울기" : dict.slant)))} data={slantList} value={isCalli ? writingSpeed : slantAngle} onChange={isCalli ? setWritingSpeed : setSlantAngle} theme={theme} activeCat={activeCat} lang={lang} />
              </div>
              {isMMO ? (
                <div className="grid grid-cols-2 gap-3">
                  <DropdownControl label={dict.slicingIntensity} data={staticOptions.slicingIntensities} value={slicingIntensity} onChange={setSlicingIntensity} theme={theme} activeCat={activeCat} lang={lang} />
                  <DropdownControl label={dict.damage} data={staticOptions.deformationDamages} value={deformationDamage} onChange={setDeformationDamage} theme={theme} activeCat={activeCat} lang={lang} />
                </div>
              ) : isCalli ? (
                <DropdownControl label="파괴 컨셉" icon={<Zap className="w-3 h-3" />} data={staticOptions.CalliDestructions} value={calliDestruction} onChange={setCalliDestruction} theme={theme} activeCat={activeCat} lang={lang} />
              ) : isWestern ? (
                <div className="grid grid-cols-2 gap-3">
                  <DropdownControl label="장식 밀도" icon={<Sparkle className="w-3 h-3" />} data={staticOptions.WesternOrnaments} value={westernOrnament} onChange={setWesternOrnament} theme={theme} activeCat={activeCat} lang={lang} />
                  <DropdownControl label="필압의 탄성" icon={<Scaling className="w-3 h-3" />} data={staticOptions.WesternTensions} value={westernTension} onChange={setWesternTension} theme={theme} activeCat={activeCat} lang={lang} />
                </div>
              ) : isCyber ? (
                <DropdownControl label="파괴 컨셉" icon={<ScanLineIcon className="w-3 h-3" />} data={staticOptions.CyberDestructions} value={deformationDamage} onChange={setDeformationDamage} theme={theme} activeCat={activeCat} lang={lang} />
              ) : isStreet ? (
                <DropdownControl label="파괴 컨셉" icon={<Highlighter className="w-3 h-3" />} data={staticOptions.StreetDestructions} value={deformationDamage} onChange={setDeformationDamage} theme={theme} activeCat={activeCat} lang={lang} />
              ) : (
                <DropdownControl label="장식 요소" icon={<Sparkle className="w-3 h-3" />} data={staticOptions.CasualDecorations} value={casualDecoration} onChange={setCasualDecoration} theme={theme} activeCat={activeCat} disabled={!isCasual} lang={lang} />
              )}

              <div className="pt-2 border-t border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wand2Icon className={`w-3.5 h-3.5 ${artisticFreedom ? 'text-indigo-400' : 'text-zinc-500'}`} />
                    <span className={`text-[10px] font-black uppercase ${artisticFreedom ? 'text-indigo-400' : 'text-zinc-500'}`}>{dict.artisticMode}</span>
                  </div>
                  <button onClick={() => setArtisticFreedom(!artisticFreedom)} className={`w-10 h-5 rounded-full p-1 transition-all flex items-center ${artisticFreedom ? 'bg-indigo-600' : 'bg-zinc-800'}`}>
                    <div className={`w-3 h-3 bg-white rounded-full transition-all ${artisticFreedom ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={`w-3.5 h-3.5 ${perfectionMode ? 'text-emerald-400' : 'text-zinc-500'}`} />
                    <span className={`text-[10px] font-black uppercase ${perfectionMode ? 'text-emerald-400' : 'text-zinc-500'}`}>{dict.perfectionMode}</span>
                  </div>
                  <button onClick={() => setPerfectionMode(!perfectionMode)} className={`w-10 h-5 rounded-full p-1 transition-all flex items-center ${perfectionMode ? 'bg-emerald-600' : 'bg-zinc-800'}`}>
                    <div className={`w-3 h-3 bg-white rounded-full transition-all ${perfectionMode ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <WandMagic className={`w-3.5 h-3.5 ${overDeformation ? 'text-rose-400' : 'text-zinc-500'}`} />
                    <span className={`text-[10px] font-black uppercase ${overDeformation ? 'text-rose-400' : 'text-zinc-500'}`}>{dict.overDeformationMode}</span>
                  </div>
                  <button onClick={() => setOverDeformation(!overDeformation)} className={`w-10 h-5 rounded-full p-1 transition-all flex items-center ${overDeformation ? 'bg-rose-600' : 'bg-zinc-800'}`}>
                    <div className={`w-3 h-3 bg-white rounded-full transition-all ${overDeformation ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FastIcon className={`w-3.5 h-3.5 ${momentumActive ? 'text-amber-400' : 'text-zinc-500'}`} />
                    <span className={`text-[10px] font-black uppercase ${momentumActive ? 'text-amber-400' : 'text-zinc-500'}`}>{dict.momentumMode}</span>
                  </div>
                  <button onClick={() => setMomentumActive(!momentumActive)} className={`w-10 h-5 rounded-full p-1 transition-all flex items-center ${momentumActive ? 'bg-amber-600' : 'bg-zinc-800'}`}>
                    <div className={`w-3 h-3 bg-white rounded-full transition-all ${momentumActive ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                <p className="text-[9px] text-zinc-600 font-medium leading-tight">
                  {momentumActive ? (() => {
                    if (isMMO) return "육중한 구조적 타격감과 공격적 절단 궤적 형성";
                    if (isCasual) return "정적인 대칭을 깨는 유연하고 활기찬 탄성 에너지 주입";
                    if (isCalli) return "형식적 균형을 탈피한 폭발적 필속과 검무의 궤적";
                    if (isWestern) return "리드미컬한 필압의 긴장감과 역동적인 뻗침 효과";
                    if (isCyber) return "불규칙한 데이터 흐름과 고주파 진동의 디지털 동세";
                    if (isStreet) return "중심부에서 뿜어져 나오는 파괴적인 방사형 에너지";
                    return dict.momentumHelp;
                  })() : overDeformation ? "장르 특화 변형 모드 활성 중" : perfectionMode ? dict.perfectionHelp : artisticFreedom ? dict.artisticHelp : "Activate creative mods for advanced results."}
                </p>
              </div>
            </div>
          </section>
        </aside>

        <div className="flex-1 flex flex-col p-8 lg:p-12 overflow-y-auto custom-scrollbar">
          <div className="max-w-[800px] w-full mx-auto space-y-8 pb-20">
            <div className={`rounded-md p-6 border bg-[#18181B] border-zinc-800 shadow-xl`}>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                  <p className="text-[12px] font-black uppercase text-zinc-500">Base Technical Prompt</p>
                  <div className="flex bg-zinc-900 rounded p-0.5 border border-zinc-800">
                    <button onClick={() => setBaseLangView('en')} className={`px-3 py-1 text-[10px] font-black uppercase rounded transition-all ${baseLangView === 'en' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}>EN</button>
                    <button onClick={() => { if (!translatedBase) translateWithAi(baseTechnical, setTranslatedBase, setIsTranslatingBase, setBaseLangView); else setBaseLangView('ko'); }} className={`px-3 py-1 text-[10px] font-black uppercase rounded transition-all flex items-center gap-1.5 ${baseLangView === 'ko' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}>
                      {isTranslatingBase && <Loader2 className="w-3 h-3 animate-spin" />} KO
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => copyToClipboard(baseLangView === 'ko' ? translatedBase : baseTechnical, 'top')} title="Copy Prompt" className="px-3 py-1.5 rounded-sm text-[11px] font-bold bg-zinc-800 text-zinc-300 transition-all hover:bg-zinc-700">{copiedTop ? 'Copied!' : <Copy className="w-3.5 h-3.5" />}</button>
                </div>
              </div>
              <div className="font-mono text-[12px] p-5 rounded-md border bg-zinc-900/50 border-zinc-800 text-zinc-400 whitespace-pre-wrap leading-relaxed shadow-inner">
                {baseLangView === 'ko' && translatedBase ? (
                  <div className="text-indigo-200 font-sans text-[14px] leading-relaxed animate-in fade-in duration-300">{translatedBase}</div>
                ) : (
                  <div className="animate-in fade-in duration-300">{baseTechnical}</div>
                )}
              </div>
            </div>

            <div className="flex gap-2.5">
              {aiOptimizationModels.map(model => (
                <button key={model.id} onClick={() => { setAiModel(model.id); }} className={`flex-1 py-3.5 rounded-md border transition-all text-[11px] font-black uppercase ${aiModel === model.id ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 shadow-md scale-[1.02]' : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>{model.name}</button>
              ))}
              <button onClick={() => { setAiModel('Overview'); }} className={`flex-1 py-3.5 rounded-md border transition-all text-[11px] font-black uppercase ${aiModel === 'Overview' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-md scale-[1.02]' : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>Overview</button>
            </div>

            <button onClick={requestDramaticEnhancement} disabled={isEnhancing} className={`w-full flex items-center justify-center gap-3 py-4 rounded-md border-2 font-black text-xs uppercase shadow-lg transition-all ${isEnhancing ? 'opacity-50' : 'hover:scale-[1.01] border-indigo-500/30 bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20'}`}>{isEnhancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Stars className="w-4 h-4" />} <span>{dict.enhanceBtn}</span></button>

            <div className={`rounded-md p-10 border bg-[#18181B] border-zinc-800 relative transition-all duration-500 shadow-2xl`}>
              <div className="flex justify-between items-center mb-8 border-b pb-4 border-zinc-200/10">
                <div className="flex items-center gap-4">
                  <p className="text-[10px] font-black uppercase text-zinc-500">{aiModel} Prompt Output</p>
                  {aiModel === 'NanoBanana' && (
                    <div className="flex bg-zinc-900 rounded p-0.5 border border-zinc-800">
                      <button onClick={() => setEnhancedLangView('en')} className={`px-3 py-1 text-[10px] font-black uppercase rounded transition-all ${enhancedLangView === 'en' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}>EN</button>
                      <button onClick={() => { if (!translatedEnhanced) translateWithAi(dramaticPrompt, setTranslatedEnhanced, setIsTranslatingEnhanced, setEnhancedLangView); else setEnhancedLangView('ko'); }} className={`px-3 py-1 text-[10px] font-black uppercase rounded transition-all flex items-center gap-1.5 ${enhancedLangView === 'ko' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}>
                        {isTranslatingEnhanced && <Loader2 className="w-3 h-3 animate-spin" />} KO
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => copyToClipboard(aiModel === 'NanoBanana' && enhancedLangView === 'ko' ? translatedEnhanced : outputContent, 'bottom')} title="Copy Prompt" className="px-3 py-1.5 rounded-sm text-[10px] font-bold bg-zinc-800 text-zinc-300 transition-all hover:bg-zinc-700">{copiedBottom ? 'Copied!' : <Copy className="w-3.5 h-3.5" />}</button>
                </div>
              </div>
              <div className="max-w-[800px] w-full mx-auto text-left whitespace-pre-wrap">
                {aiModel === 'NanoBanana' ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {enhancedLangView === 'ko' && translatedEnhanced ? (
                      <div className="font-sans text-[15px] leading-relaxed text-indigo-100">
                        <StructuredText content={translatedEnhanced} />
                      </div>
                    ) : (
                      <StructuredText content={outputContent} />
                    )}
                  </div>
                ) : (
                  <div className="animate-in fade-in duration-300">
                    <StructuredText content={outputContent} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
