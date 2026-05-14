import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Zap, Shield, Smile, Cpu, Droplets, Sun, Moon, Sparkles,
  ChevronDown, Copy, FileText, MousePointer2,
  Layers, Gem, Mountain, RefreshCw, Loader2,
  BoxSelect, Target, ScanLine, Frame,
  MousePointerClick, Waves, Boxes, Wand2, Highlighter, Palette,
  CheckCircle, Upload, Wand, Scissors, Flame,
  Diamond, Hammer, Settings, Activity, ZapIcon, Wind, Layers2,
  Stars, Languages, Play, MonitorCheck, CpuIcon,
  Check, Info, Download, Terminal, Maximize,
  MessageSquare, Eraser, MoveDiagonal, Eye, ImagePlus, Box, Code2,
  CloudFog, SunSnow, Gamepad2, Ghost, X, AlertCircle, Grid, Filter,
  Heart, Share2 as ShareIcon, FileUp, RefreshCcw, Save, Clapperboard, Layers3,
  ListFilter, PenTool, Trash2, BookOpen, Lock, ShieldCheck, ActivitySquare, Users, Wrench, ChevronRight, PieChart, Focus, Sliders, Video,
  Image as ImageIcon,
  TextCursorInput
} from 'lucide-react';
import { GEMINI_API_KEY } from '../../lib/gemini';
import { useUsageGate } from '../../components/UsageGate';
import { useGlobal } from '../../context/GlobalContext';

const fetchWithRetry = async (url, options, retries = 5) => {
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, delays[i]));
    }
  }
};

const parseJSON = (text) => {
    if (!text) return null;
    try { return JSON.parse(text); }
    catch (e) {
        let clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const startObj = clean.indexOf('{');
        const startArr = clean.indexOf('[');
        if (startObj !== -1 && (startArr === -1 || startObj < startArr)) {
            let end = clean.lastIndexOf('}');
            while (end > startObj) {
                try { return JSON.parse(clean.substring(startObj, end + 1)); }
                catch (err) { end = clean.lastIndexOf('}', end - 1); }
            }
        } else if (startArr !== -1) {
            let end = clean.lastIndexOf(']');
            while (end > startArr) {
                try { return JSON.parse(clean.substring(startArr, end + 1)); }
                catch (err) { end = clean.lastIndexOf(']', end - 1); }
            }
        }
        console.error("JSON Parsing Error:", e, text);
        throw new Error("응답 포맷을 읽을 수 없습니다.");
    }
};

const DIRECTOR_PERSONAS = [
  { id: "Cinematic", name: "🎬 시네마틱 디렉터", desc: "강한 명암, 서사적이고 묵직한 하이엔드 연출", discipline: "MINDSET: 'Is this memorable and epic?' PRIORITY: 1. Visual Focus 2. Extreme Contrast 3. Heavy Metallic Feel.", mj_tags: "dramatic lighting, extreme cinematic contrast, punchy vibrant shading, emotional vibe, AAA game title aesthetic", auditRules: { maxFx: "High", prefMaterial: "Metal", avoid: "Flat" } },
  { id: "Alchemist", name: "⚗️ 매테리얼 알케미스트", desc: "재질의 물리적 특성, 표면 질감 최우선", discipline: "MINDSET: 'Does this look like a real, tangible substance?' PRIORITY: 1. Material Reality 2. Surface Density 3. Optical Reaction.", mj_tags: "insane micro-details, hyper-realistic material, macro photography style, extreme optical reaction, dense surface texture", auditRules: { maxFx: "Low", prefMaterial: "Complex", avoid: "None" } },
  { id: "DarkSmith", name: "⚔️ 다크 판타지 대장장이", desc: "다크 판타지, 그을린 금속, 전투의 흔적", discipline: "MINDSET: 'Was this forged in the abyss?' PRIORITY: 1. Gritty Realism 2. Heavy Metal Focus 3. Ancient Relic Vibe.", mj_tags: "dark fantasy mood, heavy dark metal, ancient relic, forged in fire, battle-worn, gritty realism, abyssal energy", auditRules: { maxFx: "Mid", prefMaterial: "Gritty", avoid: "GlossyPlastic" } },
  { id: "Premium", name: "💎 클린 프리미엄", desc: "여백, 절제된 빛, 애플/나이키풍의 고급감", discipline: "MINDSET: 'Is this structurally perfect and elegant?' PRIORITY: 1. Shape Fidelity 2. Clean Edges 3. Premium Luxury Finish. FX MUST BE MINIMIZED.", mj_tags: "highly organized, structural perfection, clean edges, solid stable structure, minimalist fx, noise-free, premium luxury render, elegant, sleek", auditRules: { maxFx: "None", prefMaterial: "Clean", avoid: "Rough" } }
];

const AI_MODELS = [ { id: 'NanoBanana', name: 'NanoBanana' }, { id: 'ChatGPT', name: 'ChatGPT' }, { id: 'Midjourney', name: 'Midjourney' } ];
const VIDEO_AI_MODELS = [ { id: 'Veo', name: 'Veo (Google)' }, { id: 'Runway', name: 'Runway Gen-3' }, { id: 'Luma', name: 'Luma / Kling' }, { id: 'Sequence', name: 'AE / Web Sequence' } ];

const RENDER_ENGINES = [
  { id: "Unreal", name: "언리얼 엔진 5 (에픽/게임)", en: "unreal engine 5 style, AAA-quality physically believable surface rendering" },
  { id: "Octane", name: "옥테인 렌더 (실사/크리스탈)", en: "octane render, photorealistic, front-lit studio realism" },
  { id: "Redshift", name: "레드시프트 (광고/트렌디)", en: "redshift render, vibrant studio lighting, crisp reflections" },
  { id: "VRay", name: "브이레이 (차분/스튜디오)", en: "v-ray render, clean global illumination, realistic studio light" }
];

const PRESET_GROUPS = [
  {
    id: "gold", icon: "🟡", name: "황금",
    presets: [
      { id: "gold_relic", label: "고대 유물", settings: { directorPersona: "DarkSmith", material: "AntiqueGold", frontRelief: "MicroBevel", surfaceDetail: "High", dramaticTex: "AncientErosion", wearLevel: "TimeWorn", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "GoldenDust", fxOrigin: "Edges", fxIntensity: "Subtle", rimIntensity: "Subtle", background: "RealBlack", vfxPassMode: false }, description: "수백 년간 땅에 묻혀있던 짙은 산화와 녹(Patina), 깨진 모서리가 사실적으로 표현되는 거칠고 묵직한 고대 황금." },
      { id: "gold_war", label: "전투 흔적", settings: { directorPersona: "DarkSmith", material: "AntiqueGold", frontRelief: "MicroBevel", surfaceDetail: "High", dramaticTex: "ExplosiveFracture", wearLevel: "BattleDamage", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "MagmaEmbers", fxOrigin: "Edges", fxIntensity: "Subtle", rimIntensity: "Moderate", background: "RealBlack", vfxPassMode: false }, description: "전쟁을 수없이 겪어 칼자국, 찍힘, 얕은 균열이 표면에 거칠게 남아 있는 단단한 금속 덩어리 형태의 황금." },
      { id: "gold_holy", label: "성스러운 황금", settings: { directorPersona: "Premium", material: "MatteGold", frontRelief: "HairlineBevel", surfaceDetail: "Standard", dramaticTex: "MicroGrain", wearLevel: "None", rimThickness: "None", rimColor: "White", rimIntensity: "Subtle", projectionDepth: "None", cameraLens: "Standard", energyCore: "Sparkling", fxOrigin: "Overall", fxIntensity: "Subtle", background: "RealBlack", vfxPassMode: false }, description: "미세하고 정교한 금속 결(Micro-grain)이 명품처럼 살아있는 정제된 왕실 황금. 틈에서 은은한 신성광이 새어 나옴." },
      { id: "gold_imperial", label: "제국 황금", settings: { directorPersona: "Cinematic", material: "MatteGold", frontRelief: "MicroChiseled", surfaceDetail: "High", dramaticTex: "None", wearLevel: "MicroScratches", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "GoldenDust", fxOrigin: "Edges", fxIntensity: "Subtle", rimIntensity: "Strong", background: "RealBlack", vfxPassMode: false }, description: "미세한 조각칼로 정밀하게 세공된 표면이 명품처럼 정교하게 빛을 반사시키는 단단하고 밀도 높은 제국의 황금." },
      { id: "gold_midnight", label: "모던 다크 골드", settings: { directorPersona: "Cinematic", material: "MatteGold", frontRelief: "MicroBevel", surfaceTreatment: "BrushedMetal", surfaceDetail: "Standard", dramaticTex: "MicroGrain", wearLevel: "MicroScratches", projectionDepth: "Shallow", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Overall", fxIntensity: "Subtle", rimThickness: "Hairline", rimIntensity: "Strong", rimColor: "MutedGold", enableGlint: true, background: "RealBlack", vfxPassMode: false }, description: "얕은 3D 돌출부(Shallow)를 가진 묵직하고 모던한 무광 골드. 정면은 얇게 깎여 있으며, 날카로운 외곽선 하이라이트(Glint)가 고급스러운 무게감을 줍니다." }
    ]
  },
  {
    id: "steel", icon: "⚪", name: "강철",
    presets: [
      { id: "steel_blade", label: "칼날 강철", settings: { directorPersona: "Cinematic", material: "HyperChrome", frontRelief: "HairlineBevel", surfaceDetail: "High", dramaticTex: "ExplosiveFracture", wearLevel: "MicroScratches", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "Sparkling", fxOrigin: "Edges", fxIntensity: "Subtle", rimIntensity: "Moderate", background: "RealBlack", vfxPassMode: false }, description: "날카롭게 벼려낸 전투용 검의 금속감. 예리한 칼각과 표면에 거친 스크래치, 찍힘이 존재하여 실전 무기의 긴장감을 줌." },
      { id: "steel_helm", label: "기사 투구", settings: { directorPersona: "DarkSmith", material: "GothicSteel", frontRelief: "Stepped", surfaceTreatment: "HammeredFinish", surfaceDetail: "High", dramaticTex: "None", wearLevel: "TimeWorn", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Overall", fxIntensity: "Subtle", rimIntensity: "Moderate", background: "RealBlack", vfxPassMode: false }, description: "전장을 뒹군 낡은 장갑판 재질. 단조된 망치 자국(Hammered)과 세월에 마모된 묵직하고 거친 강철의 느낌." },
      { id: "steel_heavy", label: "헤비 브러시드 강철", settings: { directorPersona: "Cinematic", material: "HyperChrome", frontRelief: "MicroBevel", surfaceTreatment: "BrushedMetal", surfaceDetail: "High", dramaticTex: "None", wearLevel: "MicroScratches", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Overall", fxIntensity: "Subtle", rimIntensity: "Moderate", background: "RealBlack", vfxPassMode: false }, description: "가로/세로로 거칠게 연마된 공업용 헤비 금속. 직선의 날카로운 브러시 결 위에 미세한 스크래치들이 밀도 높게 덮여있는 질감." },
      { id: "steel_frost", label: "서릿발 강철", settings: { directorPersona: "DarkSmith", material: "GothicSteel", frontRelief: "MicroChiseled", surfaceDetail: "High", dramaticTex: "AncientErosion", wearLevel: "TimeWorn", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "ColdMist", fxOrigin: "BetweenLetters", fxIntensity: "Subtle", rimIntensity: "Moderate", background: "RealBlack", vfxPassMode: false }, description: "차가운 공기를 머금은 강철 재질. 잘게 쪼개진 표면 위에 차가운 서리가 맺혀 있으며, 글자 사이로 은은한 냉기가 흐름." },
      { id: "steel_hightech", label: "하이테크 기하학 스틸", settings: { directorPersona: "Cinematic", material: "PolishedSilver", frontRelief: "Crystalline", surfaceDetail: "Clean", dramaticTex: "GeometricMilling", wearLevel: "None", projectionDepth: "Shallow", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Overall", fxIntensity: "Subtle", rimThickness: "Hairline", rimIntensity: "Subtle", rimColor: "Blue", enableGlint: true, enableVfx: false, enableShadow: true, background: "RealBlack", vfxPassMode: false }, description: "차가운 하이테크 크롬 금속에 정밀한 기하학적 다이아몬드 격자 무늬가 새겨진 스타일. 얇은 두께감과 날카로운 크리스탈 각을 유지하며, 은은한 블루 림라이트가 차가운 느낌을 줍니다." }
    ]
  },
  {
    id: "ice", icon: "🧊", name: "얼음",
    presets: [
      { id: "ice_glacier", label: "빙하 수정", settings: { directorPersona: "Alchemist", material: "IceCrystal", frontRelief: "Crystalline", surfaceDetail: "Clean", dramaticTex: "None", wearLevel: "None", projectionDepth: "None", cameraLens: "Macro", energyCore: "ColdMist", fxOrigin: "Overall", fxIntensity: "Moderate", rimIntensity: "Strong", background: "RealBlack", vfxPassMode: false }, description: "차갑게 빛나는 빙하 수정 재질. 투명한 얼음과 잘게 쪼개진 파셋 결정면, 내부의 푸른 깊이감이 돋보임." },
      { id: "ice_abyss", label: "심연 얼음", settings: { directorPersona: "Alchemist", material: "Obsidian", frontRelief: "Crystalline", surfaceDetail: "High", dramaticTex: "ExplosiveFracture", wearLevel: "MicroScratches", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "DarkAura", fxOrigin: "Overall", fxIntensity: "Subtle", rimIntensity: "Subtle", background: "RealBlack", vfxPassMode: false }, description: "짙은 블루와 청백색 냉광이 층을 이루는 깊고 어두운 심연의 얼음. 묵직하고 거친 얼음맥과 균열 깊이감이 특징." },
      { id: "ice_relic", label: "얼음 유물", settings: { directorPersona: "DarkSmith", material: "IceCrystal", frontRelief: "Crystalline", surfaceDetail: "High", dramaticTex: "AncientErosion", wearLevel: "TimeWorn", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "ColdMist", fxOrigin: "Overall", fxIntensity: "Subtle", rimIntensity: "Moderate", background: "RealBlack", vfxPassMode: false }, description: "표면에 서리와 얕은 균열, 오래된 냉기 흔적이 남아 있는 묵직하고 오래된 빙결체 유물의 느낌." },
      { id: "ice_polar", label: "북극 파편", settings: { directorPersona: "Cinematic", material: "IceCrystal", frontRelief: "HairlineBevel", surfaceDetail: "Clean", dramaticTex: "None", wearLevel: "None", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "Sparkling", fxOrigin: "Edges", fxIntensity: "Subtle", rimIntensity: "Strong", background: "RealBlack", vfxPassMode: false }, description: "북극의 얼음 파편처럼 날카롭고 밝은 청백색 불투명 얼음 재질. 형태가 선명하고 모서리가 예리하게 살아 있음." }
    ]
  },
  {
    id: "lava", icon: "🌋", name: "용암",
    presets: [
      { id: "lava_ember", label: "용암 맥", settings: { directorPersona: "DarkSmith", material: "VolcanicRock", frontRelief: "EdgelessConcave", surfaceDetail: "High", dramaticTex: "GlowingVeins", wearLevel: "TimeWorn", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "MagmaEmbers", fxOrigin: "Edges", fxIntensity: "Moderate", rimIntensity: "Subtle", background: "RealBlack", vfxPassMode: false }, description: "어두운 화산암 틈 사이로 얇은 용암맥이 은은하게 흐름. 깊게 파인 지형을 따라 붉은 열기가 스며나옴." },
      { id: "lava_ashforge", label: "열화 강철", settings: { directorPersona: "DarkSmith", material: "GothicSteel", frontRelief: "MicroBevel", surfaceDetail: "Standard", dramaticTex: "MicroGrain", wearLevel: "MicroScratches", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "MagmaEmbers", fxOrigin: "BetweenLetters", fxIntensity: "Subtle", rimIntensity: "Moderate", background: "RealBlack", vfxPassMode: false }, description: "막 대장간에서 벼려낸 기계적이고 묵직한 장갑판. 열광 효과를 최소화하고 은은한 붉은빛만 도는 차분한 단조 금속." }
    ]
  },
  {
    id: "utility", icon: "🛠️", name: "특수",
    presets: [
      { id: "vfx_pass", label: "이펙트 소스 추출", settings: { vfxPassMode: true, background: "RealBlack", cameraLens: "Telephoto", energyCore: "MagmaEmbers", fxOrigin: "Overall", fxIntensity: "Intense", rimIntensity: "None" }, description: "타이포그래피 본체는 완전히 블랙아웃 처리하고, 주변에 발생하는 이펙트 요소만 분리하여 추출합니다." }
    ]
  }
];

const EDIT_BUDGETS = [
  { id: "Locked", name: "Locked (외관만 최소 변경)", en: "Conservative remix, strict shape lock, preserved exact typography" },
  { id: "Conservative", name: "Conservative (표면/빛 위주)", en: "Balanced surface remix, strong shape retention" },
  { id: "Balanced", name: "Balanced (내부/FX 확장)", en: "Creative remix, moderate shape retention, enhanced internal structures" },
  { id: "Expressive", name: "Expressive (연출 확장 우선)", en: "Expressive remix, flexible shape allowance for intense FX" }
];

const QUICK_ADJUSTMENTS = [
    { id: "BOOST_VIBRANCY", label: "🔥 채도 및 생동감 극대화", desc: "물빠진 색감을 없애고 강렬하고 풍부한 색감을 만듭니다.", action: { editIntent: "highly saturated, punchy vibrant colors, rich deep colors, cinematic color grading" } },
    { id: "CLEAN_UP_FX", label: "🧹 빛 번짐 및 파티클 억제", desc: "지저분한 주변 효과를 끄고 글자에만 집중합니다.", action: { enableVfx: false, enableGlint: false } },
    { id: "ADD_GRUNGE", label: "🪨 더 거칠고 묵직하게", desc: "텍스처와 미세 스크래치를 높여 유물 느낌을 줍니다.", action: { surfaceDetail: "High", wearLevel: "MicroScratches" } },
    { id: "MAKE_CLEAN", label: "✨ 더 깔끔하고 매끄럽게", desc: "노이즈를 제거하고 깔끔한 스튜디오 렌더 느낌을 줍니다.", action: { surfaceDetail: "Clean", wearLevel: "None", dramaticTex: "None" } },
    { id: "DENSE_TEXT_FIX", label: "🔍 작고 복잡한 글씨 교정", desc: "해상도 한계로 글씨가 뭉개지는 것을 막기 위해 가독성 모드로 변경합니다.", action: { typographyScale: "Dense", surfaceDetail: "Standard", dramaticTex: "None" } },
    { id: "COMPRESS_LENS", label: "🔭 망원 렌즈로 측면 왜곡 억제", desc: "원근감을 납작하게 압축하여 화면 끝부분의 좌우 측면 벽 노출을 없앱니다.", action: { cameraLens: "Telephoto", projectionDepth: "None" } }
];

const INITIAL_OPTIONS = {
  typographyScales: [
    { id: "Macro", name: "대형 로고 (Macro)", en: "macro photography, hyper-detailed single focal point, large typography" },
    { id: "Dense", name: "복잡/작은 텍스트 (Dense)", en: "centered composition, medium-wide framing, subject occupies around 50% of the frame, highly legible and clean typography, simplified surface details to maintain readability, crisp clean typographic boundaries, reduced noise" }
  ],
  cameraLenses: [
    { id: "Telephoto", name: "망원 렌즈 (200mm) - 왜곡 제거", en: "shot on 200mm telephoto lens, extreme perspective compression, flat focal plane, strictly zero perspective distortion" },
    { id: "Standard", name: "표준 렌즈 (50mm) - 자연스러운 시야", en: "shot on 50mm standard lens, natural human eye perspective" },
    { id: "Wide", name: "광각 렌즈 (24mm) - 극적인 원근감", en: "shot on 24mm ultra wide angle lens, dramatic perspective distortion, dynamic vanishing point" },
    { id: "Macro", name: "매크로 (100mm) - 극접사", en: "shot on 100mm macro lens, extreme close-up, focus stacking, infinite depth of field, edge-to-edge sharp focus, entirely in focus" }
  ],
  intensities: [ { id: "Low", name: "Subtle (미세)", en: "ultra-subtle refined details" }, { id: "Mid", name: "Balanced (표준)", en: "refined balanced finish" }, { id: "High", name: "High-Detail (고밀도)", en: "dense intricate macro detailing" } ],
  backgrounds: [ { id: "RealBlack", name: "Deep Black (Matte)", en: "Pure solid #000000 matte black void, completely clean background" }, { id: "StudioGray", name: "Neutral Gray", en: "Professional neutral gray with subtle depth" }, { id: "PureWhite", name: "High-Key White", en: "Pristine white studio background" }, { id: "ChromaGreen", name: "Chroma Green", en: "Pure chroma green screen #00FF00" } ],
  fxOrigins: [
    { id: "Edges", name: "가장자리/끝부분 집중", en: "originating strictly from the sharp edges and tips" },
    { id: "Overall", name: "글자 전체를 감싸듯", en: "softly enveloping the entire typography surface" },
    { id: "BetweenLetters", name: "글자 사이를 연결하듯", en: "arcing and intertwining between the gaps of the letters" }
  ],
  fxIntensities: [ { id: "Subtle", name: "Subtle (은은하게)", en: "very subtle, minimalist, restrained" }, { id: "Moderate", name: "Moderate (보통)", en: "balanced, clearly visible but non-overpowering" }, { id: "Intense", name: "Intense (강하게)", en: "intense, highly dynamic, dramatic" } ],
  surfaceDetails: [
    { id: "Clean", name: "Clean (완벽히 매끄러움)", en: "perfectly smooth, flawless clean surface, absolutely NO scratches" },
    { id: "Standard", name: "Standard (자연스러운 결)", en: "natural physical surface micro-texture" },
    { id: "High", name: "High (미세 기스 밀도 극대화)", en: "intense micro-details, fine hairline scratches, refined elegant texture, rich tactile finish" }
  ],
  frontReliefs: [
    { id: "Flat", name: "평면형 (Flat)", en: "strictly flat core surface, no carved depth, subtle material treatment" },
    { id: "MicroBevel", name: "미세한 각 (Micro Bevel)", en: "maintaining flat core with sharp crisp angled micro-bevel on edges ONLY, rigid mechanical corners, NO soft rounded bevels, NO deep carving" },
    { id: "HairlineBevel", name: "초미세 칼각 (Hairline Bevel)", en: "microscopic 1px razor-edge highlight, ultra-thin minimal bevel width, sharp crisp boundary" },
    { id: "MicroChiseled", name: "마이크로 치즐링 (Micro-Chiseled)", en: "densely micro-chiseled surface, hundreds of tiny intricate cuts, fine jewelry carving, NO large low-poly facets, NO cheap photoshop bevel" },
    { id: "Crystalline", name: "크리스탈 파셋 (Crystalline)", en: "sharp crystalline geometric facets, deep angular jewel-like cuts, rigid hard-surface ice formations, grand clear facets, NO soft bevels" },
    { id: "DiamondPrism", name: "다이아몬드 프리즘 각 (Diamond Prism)", en: "sharp prismatic beveled edges, deep V-carved angular facets, prominent center ridge, highly reflective diamond-cut geometry, NO flat front face" },
    { id: "DeepVCarve", name: "V자 음각 릿지 (Deep V-Carve)", en: "deep V-carved angular facets, prominent sharp center ridge running along the center of the strokes, perfectly smooth and flat angled inner walls, highly reflective crisp multi-faceted geometry, NO messy distortion, NO flat front face" },
    { id: "ChunkyToy", name: "Chunky (도톰한 곡면)", en: "soft, thick, rounded chunky toy-like front relief, inflated balloon volume" }
  ],
  projectionDepths: [
    { id: "None", name: "최소 돌출 (Minimal)", en: "[PROJECTION: MINIMAL] solid structural body with minimal side thickness, absolutely no deep rear 3D extrusion, no heavy perspective block. All dimensional depth must exist exclusively on the front-face." },
    { id: "Shallow", name: "얇은 돌출 (Shallow)", en: "[PROJECTION: SHALLOW] very thin shallow backward 3D extrusion, subtle slim side thickness, minimal perspective, NO heavy blocks." },
    { id: "Block", name: "블록 돌출 (Blocky)", en: "[PROJECTION: BLOCKY] Solid structural block thickness, distinct side planes and 3D perspective." },
    { id: "Monumental", name: "거대 돌출 (Epic 3D)", en: "[PROJECTION: MONUMENTAL] Massive cinematic backward 3D extrusion, epic perspective depth, deep architectural volume." }
  ],
  surfaceTreatments: [ { id: "Standard", name: "Standard (표준)", en: "standard physical surface reaction" }, { id: "SmoothFillet", name: "둥근 굴곡 (Smooth)", en: "elegant smooth filleted transitions" }, { id: "MultiFaceted", name: "다각 면치기 (Faceted)", en: "highly luminous angular geometric facets" }, { id: "HammeredFinish", name: "망치 자국 (Hammered)", en: "hand-hammered dimpled organic surface" }, { id: "BrushedMetal", name: "직선 브러시 결 (Linear Brushed)", en: "straight linear horizontal brushed metal finish, perfectly parallel brushed lines, NO circular brushing, NO radial patterns" } ],
  energyCores: [
    { id: "None", name: "없음 (None)", en: "no surrounding FX" },
    { id: "GoldenDust", name: "황금 가루 흩뿌림", en: "glowing golden dust and scattering sparks" },
    { id: "ColdMist", name: "냉기와 안개 흐름", en: "rising cold mist and flowing icy vapor" },
    { id: "Sparkling", name: "반짝이는 빛/광택", en: "sparkling light effects and intense glossy lens flares" },
    { id: "Electricity", name: "흐르는 전류/스파크", en: "flowing static electricity and micro lightning arcs" },
    { id: "MicroParticles", name: "미세 파티클 발산", en: "emitting luminous micro floating particles" },
    { id: "MagmaEmbers", name: "불티와 아지랑이", en: "No flames, only very subtle glowing dust and faint residual heat shimmer at sharp edges" },
    { id: "DarkAura", name: "다크 오라", en: "subtle dark wispy shadowy aura creeping tightly" }
  ],
  materials: [
    { id: "HyperChrome", name: "하이퍼 크롬 (Mirror)", en: "High-contrast bright liquid mirror chrome" },
    { id: "PolishedSilver", name: "폴리쉬드 실버 (Polished Silver)", en: "highly polished dark silver metal, pristine reflective chrome surface, elegant gunmetal finish" },
    { id: "DarkTitanium", name: "다크 티타늄 (Dark Titanium)", en: "heavy dark titanium metal, black chrome, extreme high contrast reflections, deep pitch black shadows and brilliant crisp edge highlights, sleek gunmetal finish, absolutely clean surface" },
    { id: "MatteGold", name: "무광 골드 (Matte Gold)", en: "Hardened premium matte gold metal finish, solid metallic structure" },
    { id: "RoughStone", name: "거친 석재 (Rough Stone)", en: "Raw porous rough stone texture" },
    { id: "VolcanicRock", name: "단단한 화산암 (Volcanic Rock)", en: "Solid dark hardened volcanic rock, deep porous texture, physically un-meltable structure" },
    { id: "FrostedGlass", name: "반투명 유리 (Frosted)", en: "Frosted sandblasted glass" },
    { id: "IceCrystal", name: "단단한 빙결 수정 (Ice Crystal)", en: "Solid opaque ice crystal, frosted surface, crisp structural edges, completely opaque core" },
    { id: "Obsidian", name: "옵시디언 (Obsidian)", en: "Ultra-glossy jet black volcanic glass" },
    { id: "GothicSteel", name: "고딕 강철 (Hardened Steel)", en: "Cold hardened surgical steel" },
    { id: "AntiqueGold", name: "앤틱 골드 (Antique Gold)", en: "Aged and darkened rich antique gold" }
  ],
  dramaticTextures: [
    { id: "None", name: "None (매끄러움)", en: "flawless polished uniform material" },
    { id: "Auto", name: "AI 자율 (Auto)", en: "organically embedded detailed textures" },
    { id: "MicroGrain", name: "미세 입자결 (Micro Grain)", en: "ultra-fine brushed metal grain, intricate microscopic surface texture, highly refined elegant finish" },
    { id: "AncientErosion", name: "고대 풍화/부식 (Erosion)", en: "heavily eroded ancient surface, deep oxidized patina, chipped and weathered organic degradation, physically integrated into the core material, NO written text, NO runes" },
    { id: "ExplosiveFracture", name: "정교한 균열 (Fracture)", en: "Micro-detailed sharp fractures physically integrated into the core material" },
    { id: "GlowingVeins", name: "은은한 발광 맥 (Glowing Veins)", en: "Subtle glowing veins deeply etched into the solid core material, strictly contained inner glow, NO outer melting" },
    { id: "Damascus", name: "다마스쿠스 (Flow)", en: "swirling organic layered ripples" },
    { id: "GeometricMilling", name: "정밀 기하학 밀링 (Geometric Milling)", en: "delicate geometric diamond grid micro-engravings, precision-milled high-tech surface pattern" }
  ],
  rimThicknesses: [ { id: "None", name: "없음 (None)", en: "strictly borderless, seamless organic blending edges, no outline" }, { id: "Hairline", name: "아주 가는선", en: "microscopic elegant thin edge highlight, organic and uneven" }, { id: "Normal", name: "보통 테두리", en: "solid structural outer edge, physically carved border with dynamic thickness, NOT a uniform stroke" } ],
  wearLevels: [ { id: "None", name: "새것 (Pristine)", en: "factory-new flawless state" }, { id: "MicroScratches", name: "미세 기스 (Light Wear)", en: "subtle surface micro-abrasions" }, { id: "TimeWorn", name: "세월의 흔적 (Time-Worn)", en: "aged and weathered patina" }, { id: "BattleDamage", name: "전투 흔적 (Battle-Damaged)", en: "heavy battle-worn damage, deep structural scars, sword cuts, severely chipped and dented edges" } ],
  rimColors: [
    { id: "None", name: "없음 (None)", en: "no secondary rim light" },
    { id: "White", name: "퓨어 화이트", en: "clean sharp neutral white rim light" },
    { id: "Blue", name: "아이스 블루", en: "cold piercing bright blue rim light" },
    { id: "Amber", name: "엠버 오렌지", en: "warm glowing intense orange rim light" },
    { id: "MutedGold", name: "차분한 웜골드", en: "desaturated muted gold rim light, subtle elegant warm edge highlight" },
    { id: "NeonPink", name: "네온 핑크", en: "vibrant highly saturated neon pink rim light" },
    { id: "Cyan", name: "사이버 사이언", en: "vibrant cyber cyan bright rim light" },
    { id: "BloodRed", name: "블러드 레드", en: "deep dark blood crimson red rim light" },
    { id: "SoftPurple", name: "뮤트 퍼플", en: "soft desaturated purple rim light, atmospheric purple edge glow" }
  ],
  rimIntensities: [
    { id: "Subtle", name: "은은하게 (Subtle)", en: "very faint and subtle" },
    { id: "Moderate", name: "보통 (Moderate)", en: "clear and balanced" },
    { id: "Strong", name: "강렬하게 (Strong)", en: "intense and bright" }
  ],
  cameraMotions: [
    { id: "Static", name: "고정 (Static)", en: "completely static camera, locked off shot on tripod, ZERO zoom in, ZERO zoom out, fixed text scale, absolutely NO camera movement" },
    { id: "SlowZoom", name: "천천히 줌인 (Slow Zoom)", en: "very slow cinematic push in, subtle zoom" },
    { id: "Orbit", name: "가벼운 궤도 회전 (Orbit)", en: "subtle slow parallax orbit, shifting perspective slightly" }
  ],
  motionDynamics: [ { id: "Flowing", name: "부드럽게 흐름 (Flowing)", en: "elegant slow flowing motion, highly viscous and smooth dynamics" }, { id: "Turbulent", name: "거칠게 휘몰아침 (Turbulent)", en: "aggressive turbulent motion, fast swirling particles, high energy dynamics" }, { id: "Pulsating", name: "맥동/호흡 (Pulsating)", en: "rhythmic pulsating glow, glowing intensely then fading smoothly" }, { id: "SeamlessLoop", name: "무한 반복 (Seamless Web Loop)", en: "perfectly seamless loop, ending exactly where it begins, consistent infinite motion" } ]
};

const getOptionEn = (list, id) => list.find(o => o.id === id)?.en || String(id);
const getOptionName = (list, id, dynamicNames = {}) => list.find(o => o.id === id)?.name || dynamicNames[id] || String(id);

const combineOptions = (baseList, currentValue, dynamicNames = {}) => {
  if (!currentValue) return baseList;
  if (baseList.find(o => o.id === currentValue)) return baseList;
  return [{ id: currentValue, name: `✨ ${dynamicNames[currentValue] || currentValue}`, en: currentValue }, ...baseList];
};

const ImageDropzone = ({ image, onClear, onUpload, onDragOver, onDragLeave, onDrop, isDragging, title, sub, icon: Icon, heightClass = "h-36", isLoading = false }) => {
  return (
      <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} className={`relative border border-dashed rounded-xl flex flex-col items-center justify-center transition-all overflow-hidden group ${heightClass} ${isDragging ? `border-indigo-500 bg-indigo-500/10` : `border-zinc-700/50 bg-[#18181B] hover:border-zinc-500`}`}>
          {image ? (
              <div className={`relative w-full h-full p-2 flex flex-col items-center justify-center transition-all ${isLoading ? 'opacity-30' : 'group-hover:opacity-90'}`}>
                  <img src={image} className="w-full h-full object-contain drop-shadow-xl" alt="Source" />
                  {!isLoading && <button onClick={onClear} className={`absolute top-2 right-2 bg-black/80 hover:bg-zinc-800 text-white p-1.5 rounded-sm backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all shadow-md z-10`}><X className="w-3 h-3" /></button>}
              </div>
          ) : (
              <div className="flex flex-col items-center gap-2 opacity-40">
                  <Icon className={`w-6 h-6 text-zinc-500`} />
                  <div className="text-center">
                      <p className="text-[9px] font-bold tracking-tight text-center leading-snug text-zinc-400">{title}</p>
                      {sub && <p className="text-[8px] text-zinc-500 mt-0.5">{sub}</p>}
                  </div>
              </div>
          )}
          {!image && !isLoading && <input type="file" accept="image/*" onChange={onUpload} className="absolute inset-0 opacity-0 cursor-pointer" />}
          {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-20">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mb-2" />
                  <span className="text-[10px] font-bold text-indigo-300 tracking-widest uppercase">Analyzing...</span>
              </div>
          )}
      </div>
  );
};

const DropdownControl = ({ label, icon, data = [], value, onChange, disabled = false, dynamicNames = {}, recommendedId = null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  useEffect(() => {
    const handleClick = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  const combinedData = useMemo(() => combineOptions(data, value, dynamicNames), [data, value, dynamicNames]);
  const selectedOption = combinedData.find(o => o.id === value) || combinedData[0];
  // 추천 옵션이 있고 아직 선택되지 않았으면 트리거 버튼에 ★ 배지
  const hasUnpickedRec = recommendedId && recommendedId !== value && combinedData.some(o => o.id === recommendedId);
  return (
    <div className={`w-full space-y-1.5 relative ${disabled ? 'opacity-40 pointer-events-none' : ''}`} ref={containerRef}>
      {label && <p className="text-[10px] font-bold uppercase tracking-widest pl-1 flex items-center gap-1.5 text-zinc-400">{icon} {label}</p>}
      <button onClick={() => !disabled && setIsOpen(!isOpen)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all bg-[#18181B] text-zinc-200 outline-none ${isOpen ? 'border-indigo-500' : hasUnpickedRec ? 'border-[#A29BFE]/60 ring-1 ring-[#A29BFE]/40' : 'border-zinc-800 hover:border-zinc-600'}`}>
        <span className="text-[11px] truncate font-bold flex items-center gap-1.5">
          {hasUnpickedRec && <span className="text-[#A29BFE] text-[10px]" title="프롬프트 아크에서 추천된 옵션이 있어요">★</span>}
          {selectedOption.name}
        </span>
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className={`absolute left-0 right-0 mt-2 rounded-xl border z-[999] bg-[#121214] border-zinc-700 shadow-2xl`}>
          <div className="max-h-[200px] overflow-y-auto custom-scrollbar py-1">
            {combinedData.map(opt => {
              const isSelected = value === opt.id;
              const isRecommended = recommendedId === opt.id;
              return (
                <div key={opt.id} onClick={() => { onChange(opt.id); setIsOpen(false); }} className={`px-4 py-3 text-[11px] cursor-pointer hover:bg-zinc-800 transition-colors flex justify-between items-center ${isSelected ? 'text-blue-400 font-bold' : isRecommended ? 'text-[#A29BFE]' : 'text-zinc-400'}`}>
                  <span className="flex items-center gap-1.5">
                    {isRecommended && !isSelected && <span className="text-[10px]" title="프롬프트 아크 추천">★</span>}
                    {opt.name}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                  {!isSelected && isRecommended && <span className="text-[8px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#A29BFE]/15 text-[#A29BFE] uppercase">추천</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const ToggleControl = ({ label, desc, enabled, onChange, colorClass = "bg-blue-600" }) => (
  <div onClick={onChange} className={`w-full flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${enabled ? `bg-zinc-900 border-zinc-700 shadow-inner` : `bg-[#18181B] border-zinc-800 hover:border-zinc-600`}`}>
    <div className="flex flex-col pr-4">
        <span className={`text-[11px] font-bold transition-colors ${enabled ? 'text-white' : 'text-zinc-300'}`}>{label}</span>
        {desc && <span className="text-[9px] text-zinc-500 mt-0.5 whitespace-pre-wrap">{desc}</span>}
    </div>
    <div className={`w-8 h-4 rounded-full shrink-0 relative transition-colors ${enabled ? colorClass : 'bg-zinc-700'}`}>
        <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all shadow-sm`} style={{ left: enabled ? 'calc(100% - 14px)' : '2px' }} />
    </div>
  </div>
);

const ScoreBar = ({ label, score, colorClass }) => (
    <div className="flex flex-col gap-1 w-full">
        <div className="flex justify-between items-center text-[10px] font-bold">
            <span className="text-zinc-400">{label}</span>
            <span className={score >= 90 ? "text-emerald-400" : score >= 70 ? "text-amber-400" : "text-rose-400"}>{score}</span>
        </div>
        <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${score}%` }} />
        </div>
    </div>
);

const performLogicAudit = (state, appOptions) => {
    const issues = [];
    if (state.currentView === "editor") {
        const persona = DIRECTOR_PERSONAS.find(p => p.id === state.directorPersona);
        if (persona.auditRules.maxFx === "None" && state.enableVfx) {
            issues.push({ code: "PERSONA_FX_CLASH", title: `[${persona.name}] 룰 위반: 이펙트 과다`, desc: "현재 디렉터는 완벽한 형태와 여백을 중시하므로 주변 이펙트를 억제합니다.", options: [{ label: "A. 시안 모드 끄기", action: { enableVfx: false } }] });
        }
        if (state.vfxPassMode && !state.enableVfx) {
            issues.push({ code: "VFX_PASS_NO_FX", title: "이펙트 소스 분리 모드 충돌", desc: "타이포그래피를 블랙아웃시켰지만, 추출할 주변 효과(VFX)가 꺼져있습니다.", options: [{ label: "A. 이펙트 활성화", action: { enableVfx: true, energyCore: state.energyCore === "None" ? "MagmaEmbers" : state.energyCore } }, { label: "B. 매트 패스 끄기", action: { vfxPassMode: false } }] });
        }
        if (state.typographyScale === "Dense" && (state.surfaceDetail === "High" || state.dramaticTex === "ExplosiveFracture")) {
            issues.push({ code: "DENSE_TEXT_NOISE", title: "가독성 저하 위험: 디테일 과다", desc: "작거나 복잡한 글씨에 미세 스크래치나 균열을 강하게 넣으면 렌더링이 뭉개질 수 있습니다.", options: [{ label: "A. 표면 매끄럽게", action: { surfaceDetail: "Standard", dramaticTex: "None" } }, { label: "B. 대형 로고로 간주", action: { typographyScale: "Macro" } }] });
        }
    } else if (state.currentView === "edit") {
        if (state.editBudget === "Expressive" && state.editRearExtrusion === "None") {
            issues.push({ code: "EDIT_DEPTH_CONFLICT", title: "과한 연출 확장 + 돌출 제한 충돌", desc: "연출을 강하게 넓히면서(Expressive) 후면 돌출은 막으면 인공지능이 혼란을 겪을 수 있습니다.", options: [{ label: "A. 예산 보수적으로", action: { editBudget: "Conservative" } }, { label: "B. 입체 허용", action: { editRearExtrusion: "Shallow" } }] });
        }
        if (state.editVfxPassMode && (!state.activeEditIntents.vfx || state.editEnergyCore === "None")) {
             issues.push({ code: "VFX_PASS_NO_FX", title: "이펙트 소스 분리 모드 충돌", desc: "타이포그래피를 블랙아웃시켰지만, 추출할 주변 효과(VFX) 레이어가 활성화되지 않았습니다.", options: [{ label: "A. 이펙트 활성화", action: { activeEditIntents: { ...state.activeEditIntents, vfx: true }, editEnergyCore: "GoldenDust" } }, { label: "B. 소스 분리 모드 끄기", action: { editVfxPassMode: false } }] });
        }
    }
    return issues;
};

const calculateQualityScore = (state) => {
    let structure = 100, material = 90, visibility = 95, fxControl = 100;
    if (state.currentView === "editor") {
        if (state.projectionDepth === "Monumental") structure -= 25;
        else if (state.projectionDepth !== "None") structure -= 10;
        if (state.enableVfx && state.complexity === 3) fxControl -= 20;
        if (state.typographyScale === "Dense" && state.surfaceDetail === "High") visibility -= 20;
    } else if (state.currentView === "edit") {
        if (state.editBudget === "Expressive") structure = 70;
        else if (state.editBudget === "Balanced") structure = 85;
        else if (state.editBudget === "Locked") structure = 100;
        if (state.activeEditIntents.material) material = 95;
        if (state.activeEditIntents.vfx) fxControl = 80;
    } else if (state.currentView === "motion") {
        if (state.cameraMotion !== "Static") structure -= 15;
        if (state.vfxDynamics === "Turbulent") fxControl -= 30;
    }
    return { structure: Math.max(0, Math.min(100, structure)), material: Math.max(0, Math.min(100, material)), visibility: Math.max(0, Math.min(100, visibility)), fxControl: Math.max(0, Math.min(100, fxControl)) };
};

const getQualityFeedback = (scores) => {
    const minScore = Math.min(scores.structure, scores.material, scores.visibility, scores.fxControl);
    if (minScore >= 90) return "탁월합니다. 안정적이고 퀄리티 높은 렌더링이 예상됩니다.";
    if (scores.structure === minScore) return "형태 보존력이 불안합니다. '돌출(Extrusion)'을 줄이거나 형태를 고정하세요.";
    if (scores.visibility === minScore) return "가시성이 낮습니다. 글씨가 작다면 스케일을 변경하거나 조명을 추가하세요.";
    if (scores.fxControl === minScore) return "이펙트가 과해 형태를 가릴 위험이 있습니다. 주변 효과를 낮추세요.";
    if (scores.material === minScore) return "재질이 다소 단조롭거나 어색할 수 있습니다.";
    return "설정을 렌더링 엔진이 해석하기 좋은 상태로 유지하고 있습니다.";
};

const generateIR = (state, appOptions) => {
    const { directorPersona, complexity, typographyScale, cameraLens, frontRelief, projectionDepth, surfaceTreatment, energyCore, material, materialInt, dramaticTex, wearLevel, rimMaterial, rimThickness, rimColor, rimIntensity, enableGlint, background, renderEngine, userIntent, fxOrigin, fxIntensity, surfaceDetail, vfxPassMode, enableVfx, enableShadow } = state;
    const activeEnergyCore = enableVfx ? (energyCore === "None" ? "GoldenDust" : energyCore) : "None";
    const activeBackground = enableVfx
        ? "pitch black textured slate backdrop, extremely dark moody cinematic vignette, deep dark void, pure deep black presentation canvas highlighting the glowing effects"
        : getOptionEn(appOptions.backgrounds, background);
    let ir = {
        _meta: { version: "19.34", persona: DIRECTOR_PERSONAS.find(p => p.id === directorPersona), complexityLevel: complexity },
        subject: { type: "typography graphic", scale: getOptionEn(appOptions.typographyScales, typographyScale), fidelity_enforcement: "STRICT RULE: 95% shape preservation. EXACT ORIGINAL SILHOUETTE. NO TEXT MUTATION. NO extra letters. Ensure high legibility.", intent: userIntent || null },
        camera_and_depth: { projectionId: projectionDepth, projection: getOptionEn(appOptions.projectionDepths, projectionDepth), isMinimal: projectionDepth === "None", lens: getOptionEn(appOptions.cameraLenses, cameraLens) },
        surface_morphology: { reliefId: frontRelief, relief: getOptionEn(appOptions.frontReliefs, frontRelief), treatment: getOptionEn(appOptions.surfaceTreatments, surfaceTreatment), wear: getOptionEn(appOptions.wearLevels, wearLevel) },
        material_stack: { base: getOptionEn(appOptions.materials, material), intensity: getOptionEn(appOptions.intensities, materialInt), internal_texture: dramaticTex === "Auto" ? "organically embedded dynamic textures" : getOptionEn(appOptions.dramaticTextures, dramaticTex), surface_detail: getOptionEn(appOptions.surfaceDetails, surfaceDetail), integration_rule: "Textures MUST be physically carved or etched INTO the base material. NO floating decals." },
        edge_and_lighting: {
            outline: rimThickness === "None" ? "strictly borderless, seamless organic edges, no outline" : `${getOptionEn(appOptions.rimThicknesses, rimThickness)} using ${getOptionEn(appOptions.materials, rimMaterial)}`,
            rim_light: rimColor === "None" ? "no artificial rim light" : `${getOptionEn(appOptions.rimIntensities, rimIntensity)} ${getOptionEn(appOptions.rimColors, rimColor)} ambient rim light organically wrapping the 3D surface edges, NOT a uniform line`,
            rimColorId: rimColor,
            glint: enableGlint ? "sharp intense specular highlights mapped dynamically to the uneven surface" : "smooth balanced lighting without sharp glares",
            shadow: enableShadow
        },
        fx: { core: getOptionEn(appOptions.energyCores, activeEnergyCore), origin: getOptionEn(appOptions.fxOrigins, fxOrigin), intensity: getOptionEn(appOptions.fxIntensities, fxIntensity), containment_rule: activeEnergyCore === "None" ? "No FX." : `Ensure FX is ${getOptionEn(appOptions.fxIntensities, fxIntensity)} and ${getOptionEn(appOptions.fxOrigins, fxOrigin)}. It MUST NOT overpower the main shape.` },
        environment: { background: activeBackground, engine: RENDER_ENGINES.find(e => e.id === renderEngine)?.en || RENDER_ENGINES[0].en },
        vfxPassMode: vfxPassMode,
        typographyScale: typographyScale
    };
    if (vfxPassMode) {
        ir.subject.type = "pure pitch-black silhouette typography, holdout matte pass";
        ir.material_stack.base = "Vantablack, completely light-absorbing black hole material";
        ir.material_stack.internal_texture = "none, pure black flat void";
        ir.material_stack.integration_rule = "The text itself MUST be completely unlit and black (#000000). ONLY the surrounding FX should be visible. This is for alpha masking.";
        ir.edge_and_lighting.rim_light = "NO rim light on the text itself";
        ir.edge_and_lighting.glint = "ZERO specular highlights on the text";
        ir.surface_morphology.relief = "Flat 2D cutout silhouette";
    }
    return ir;
};

const generateEditIR = (state, appOptions) => {
    const { editBudget, activeEditIntents, cameraLens, frontRelief, editBg, editRearExtrusion, editIntent, editVfxPassMode, editMaterial, editWearLevel, editRimColor, editRimIntensity, editEnergyCore, editFxOrigin, editFxIntensity } = state;
    let budgetLevel = EDIT_BUDGETS.find(b => b.id === editBudget);
    let ir = {
        _meta: { mode: "Micro-Edit", version: "19.34" },
        locks: { glyph: "Strictly lock exact character types, sequence, and spacing.", contour: "Preserve original outer silhouette perfectly.", stroke: "Maintain exact stroke thickness and internal counter spaces." },
        budget: budgetLevel,
        camera: getOptionEn(appOptions.cameraLenses, cameraLens),
        reliefId: frontRelief,
        constraints: {
            anti_mutation: "Do NOT reinterpret letters, do NOT add new text or watermarks.",
            fx_containment: "All FX MUST originate from surface cracks/edges and remain tightly bound to the shape. NO floating particles.",
            material_integration: "All textures/FX MUST be physically embedded into the base material. NO floating decals.",
            extrusionId: editRearExtrusion,
            extrusion: editRearExtrusion === "None" ? `[PROJECTION: MINIMAL] solid structural body with minimal side thickness, NO deep rear extrusion, NO heavy 3D block.` : editRearExtrusion === "Shallow" ? "Allow ONLY very shallow thin backward 3D extrusion. NO thick blocks." : "Allow controlled backward 3D extrusion."
        },
        intents: activeEditIntents,
        details: {
            material: activeEditIntents.material ? `${getOptionEn(appOptions.materials, editMaterial)}, ${getOptionEn(appOptions.wearLevels, editWearLevel)}` : null,
            lighting: activeEditIntents.lighting ? `${getOptionEn(appOptions.rimIntensities, editRimIntensity)} ${getOptionEn(appOptions.rimColors, editRimColor)} rim light organically wrapping the edges, NOT a uniform line` : null,
            rimColorId: editRimColor,
            vfx: activeEditIntents.vfx ? `${getOptionEn(appOptions.fxIntensities, editFxIntensity)} ${getOptionEn(appOptions.energyCores, editEnergyCore)} originating from ${getOptionEn(appOptions.fxOrigins, editFxOrigin)}` : null
        },
        customIntent: editIntent || "subtle surface enhancement",
        background: getOptionEn(appOptions.backgrounds, editBg),
        vfxPassMode: editVfxPassMode
    };
    if (editVfxPassMode) {
        ir.constraints.vfx_pass = "Render the typography as a pure Vantablack (#000000), completely unlit flat 2D shape. ZERO reflections, ZERO highlights. ONLY render the glowing FX surrounding this black void.";
    }
    return ir;
};

const generateMotionIR = (state, appOptions) => {
    const { cameraMotion, vfxDynamics, motionIntent, energyCore } = state;
    return {
        _meta: { mode: "Video-Motion", version: "19.34" },
        subject_lock: "CRITICAL: The main typography and object shapes MUST remain perfectly solid and absolutely static. DO NOT morph, warp, melt, or distort the text structural integrity.",
        motion: { camera: getOptionEn(appOptions.cameraMotions, cameraMotion), dynamics: getOptionEn(appOptions.motionDynamics, vfxDynamics) },
        customIntent: motionIntent || "",
        energyCore: getOptionEn(appOptions.energyCores, energyCore)
    };
};

const compileNanoBanana = (ir, state) => {
    const isVFXPass = state.vfxPassMode || ir.vfxPassMode;
    const fxTag = ir.fx ? (ir.fx.core !== "no surrounding FX" ? `${ir.fx.intensity} ${ir.fx.core} ${ir.fx.origin}` : "") : "";
    if (isVFXPass) {
        const posTags = ["masterpiece, best quality, ultra highres, 8k resolution", "pure pitch-black silhouette typography, absolute flat 2d cutout, holdout matte pass, vantablack text, completely unlit, pure #000000 shape", ir.subject.fidelity_enforcement.replace("STRICT RULE: ", ""), fxTag, ir.environment.background, ir.environment.engine, ir.subject.intent].filter(Boolean).map(t => t.trim()).join(", ");
        const negTags = ["(worst quality, low quality:1.4), text mutation, extra letters, hallucinated text", "(rim light:1.8), (edge highlight:1.8), (glowing edge:1.8), (3d:1.8), (thickness:1.8), (extrusion:1.8), (bevel:1.8), (metallic:1.8), (reflections:1.8), (lighting on text:1.8), (3d block:1.8)", "lit text, text texture, outline, border, drop shadow, inner glow, lens flare"].filter(Boolean).map(t => t.trim()).join(", ");
        return `${posTags}\n\nNegative prompt: ${negTags}`;
    }
    const scaleTag = ir.subject.scale;
    const lensTag = ir.camera_and_depth.lens;
    let frontVolumeModifier = "";
    if (ir.surface_morphology.reliefId === "Flat") frontVolumeModifier = "strictly flat front core without deep carving";
    else if (ir.surface_morphology.reliefId === "MicroBevel") frontVolumeModifier = "maintaining a flat core with only subtle edge bevels, NO deep carving";
    else if (ir.surface_morphology.reliefId === "HairlineBevel") frontVolumeModifier = "featuring a flat front with microscopic razor-thin edges";
    else if (ir.surface_morphology.reliefId === "MicroChiseled") frontVolumeModifier = "featuring densely micro-chiseled intricate cuts on the surface";
    else if (ir.surface_morphology.reliefId === "EdgelessConcave") frontVolumeModifier = "featuring a continuous edge-to-edge concave hollow without any outer borders";
    else if (ir.surface_morphology.reliefId === "Crystalline") frontVolumeModifier = "featuring sharp crystalline geometric facets and deep jewel-like cuts";
    else if (ir.surface_morphology.reliefId === "DiamondPrism") frontVolumeModifier = "featuring sharp prismatic V-carved angular facets with a prominent center ridge";
    else if (ir.surface_morphology.reliefId === "DeepVCarve") frontVolumeModifier = "featuring a sharp center ridge running along the strokes with deep V-carved inner facets";
    else frontVolumeModifier = "with balanced front volume";
    const projectionDesc = ir.camera_and_depth.isMinimal ? `It is presented as a solid structural body with minimal side thickness. Absolutely no rear extrusion, BUT ${frontVolumeModifier}.` : "It is presented with 3D depth and extrusion.";
    const prose = `An epic cinematic typography graphic rendered in a ${ir._meta.persona.name.split(' ')[1]} style. ${scaleTag}. ${lensTag}. The text is crafted from ${ir.material_stack.base} featuring ${ir.material_stack.internal_texture}. ${projectionDesc}`;
    let posTags = [
        prose,
        "masterpiece, best quality, ultra highres, insanely detailed, 8k resolution",
        "isolated standalone typography graphic, clear cutout text shape against background, highly legible",
        "infinite depth of field, entirely in focus, edge-to-edge sharp focus, zero background blur, crisp and clear entire frame",
        "deep shadowed side walls, dark unlit extrusion, heavy ambient occlusion on thickness",
        ir.subject.fidelity_enforcement.replace("STRICT RULE: ", ""),
        ir._meta.persona.mj_tags.split(" --no ")[0],
        ir.environment.background,
        ir.environment.engine,
        ir.subject.intent
    ];
    if (ir.edge_and_lighting.shadow) posTags.push("grounded with realistic drop shadow, soft cast shadow on backdrop, deep contact shadow anchoring the text");
    let negTags = [
        "(worst quality, low quality:1.4), text mutation, extra letters, hallucinated text, floating decal",
        "(runes, hieroglyphs, symbols, written text on surface, watermark, gibberish:1.6), (merged letters, illegible blob, melted together, fused typography:1.5)",
        "(filigree, floral patterns, decorative ornaments, ornate engravings:1.5)",
        "(background plate:1.9), (plaque:1.9), (signboard:1.9), (engraved on a wall:1.9), (solid metal block background:1.9), (framed:1.8), (box around text:1.8), text engraved on surface, shield, baseplate, mounted metal plate, flat paper cutout, flat 2d sticker, dull shading, vector graphic",
        "(uniform stroke:1.9), (even border thickness:1.9), (artificial outline:1.9), cheap 3d effect, wordart, 2d border, badge, distorted stroke proportions, altered spacing, (low poly, jagged edges, messy bevel, crunchy artifacts, unrefined sculpt:1.5)",
        "(photoshop bevel and emboss:1.9), (cheap v-carve:1.9), (uniform V-shape depth:1.9), (inner shadow layer style:1.9), (inner stroke:1.9), (fake 2d deboss:1.9), (flat paper with bevel:1.9)",
        "disconnected rim light, floating edge light, artificial halo, separated highlight, (messy edge blending:1.6), detached stroke",
        "(bright side walls:1.5), (overlit extrusion:1.5), (glowing thickness:1.5), washed out sides",
        "messy glow, background clutter",
        "(depth of field:1.9), (bokeh:1.9), (background blur:1.9), (lens blur:1.9), out of focus, soft focus, blurred foreground, blurry edges, smudged",
        "(melted shape:1.5), (illegible:1.5), (transparent text blending into background:1.5), (excessive glow destroying shape:1.5), (loss of silhouette:1.5)",
        "(circular brushing:1.5), (radial metal grain:1.5), (anisotropic reflection:1.5), curved scratches",
        ir.camera_and_depth.isMinimal ? "(heavy 3d block:1.8), (deep rear extrusion:1.8), (massive depth:1.8), visible side walls, tilt" : ir.camera_and_depth.projectionId === "Shallow" ? "(thick extrusion:1.8), (heavy 3d block:1.8), (massive depth:1.8), (deep rear extrusion:1.8)" : ""
    ];
    if (ir.edge_and_lighting.rimColorId === "None") negTags.push("(bottom light:1.8), (underglow:1.8), (colored rim light:1.5), bright glow from below");
    if (!ir.edge_and_lighting.shadow) {
        posTags.push("floating perfectly without floor shadows");
        negTags.push("(drop shadow:1.9), (cast shadow:1.9), (contact shadow:1.9), floating shadow, drop shadow on background");
    }
    if (ir.camera_and_depth.isMinimal) {
        posTags.push("perfectly straight-on front facing view, dead center orthographic layout, strict 2D planar composition");
        negTags.push("(angled view:1.9), (side view:1.9), (isometric:1.9), (3d perspective:1.9), (tilt:1.9), diagonal, skewed");
    } else if (ir.camera_and_depth.projectionId === "Shallow") {
        posTags.push("straight-on front facing view, dead center, very shallow thin 3d extrusion");
        negTags.push("(extreme angled view:1.5), (side view:1.5), tilt");
    } else {
        posTags.push("straight-on front facing view, dead center");
        negTags.push("(extreme angled view:1.5), (side view:1.5), tilt");
    }
    if (state.currentView === 'editor' && !state.enableVfx) {
        negTags.push("(particle effects:1.9), (floating dust:1.9), (magic sparkles:1.9), (glowing embers:1.9), (smoke:1.9), (fog:1.9), (mist:1.9), (lens flare:1.9), (bloom:1.9), light leaks, fire, flames, glowing background");
    }
    if (ir.surface_morphology.reliefId !== "ChunkyToy") {
        posTags.push("rigid hard-surface, sharp geometric corners, precise metallic structure");
        negTags.push("(plastic, toy, balloon, inflatable, bubble text, play-doh, soft rounded edges, marshmallow, squishy, 3d render style:1.6), (soft rounded bevels, blunt corners, smooth edges:1.5)");
    }
    if (ir.surface_morphology.reliefId === "MicroBevel" || ir.surface_morphology.reliefId === "HairlineBevel" || ir.surface_morphology.reliefId === "Flat") {
        negTags.push("(deeply carved:1.5), (heavy embossing:1.5), (intense 3d front:1.5), (deep valleys:1.5), deep chiseled");
    }
    if (state.cameraLens === "Telephoto") negTags.push("(wide angle distortion:1.5), (perspective distortion:1.5), fisheye, vanishing point");
    if (state.typographyScale === "Dense") {
        posTags.push("clean legible typography, simplified readable shapes");
        negTags.push("(excessive noise, cluttered details, unreadable, chaotic textures:1.5)");
    }
    posTags.push("highly saturated, punchy vibrant colors, cinematic color grading, rich deep colors");
    negTags.push("(washed out:1.5), (desaturated:1.5), (dull colors:1.5), faded, grayscale, (dark, underexposed, gloomy:1.5)");
    posTags.push("dramatic directional lighting, clearly lit front face, side thickness falls into deep shadow, preserve clean silhouette edges, flawless silhouette boundary, surface detail must not distort the outer contour, damage stays inside the front face only, clean and readable typography, rich luminous midtones, elegant material finish, crisp specular highlights on edges, high-end PBR shading, strong material contrast");
    posTags.push(ir.surface_morphology.relief, ir.surface_morphology.wear !== "factory-new flawless state" ? ir.surface_morphology.wear : "");
    posTags.push(ir.edge_and_lighting.rim_light, ir.edge_and_lighting.glint, "texture physically embedded into material");
    if (fxTag) posTags.push(fxTag);
    if (state.surfaceDetail === "Clean") negTags.push("scratches, grunge, noise, dents, dust, imperfections, distressed surface");
    return `${posTags.filter(Boolean).map(t => t.trim()).join(", ")}\n\nNegative prompt: ${negTags.filter(Boolean).map(t => t.trim()).join(", ")}`;
};

const compileChatGPT = (ir, state) => {
    const isVFXPass = state.vfxPassMode || ir.vfxPassMode;
    let depthStr = ir.camera_and_depth.projection;
    if (isVFXPass) {
        return `Create an epic masterpiece image based on the following exact specifications.

### 1. VFX EXTRACTION PASS (CRITICAL)
- **Type**: Pure flat 2D pitch-black silhouette typography.
- **Constraint**: ${ir.subject.fidelity_enforcement}
- **Vibe**: Technical Matte Pass for VFX Compositing.
- **Rule (ABSOLUTE)**: Render the typography as a pure Vantablack (#000000), completely unlit flat 2D shape. STRICTLY FORBIDDEN: Do NOT add any rim lights, edge highlights, 3D thickness, bevels, or reflections to the letters. The text itself must be an invisible black hole. ONLY render the glowing FX surrounding this black void.

### 2. Surrounding VFX
- **FX Type**: ${ir.fx.core !== "no surrounding FX" ? `${ir.fx.intensity} ${ir.fx.core}. Origin: ${ir.fx.origin}.` : "No surrounding FX."}
- **Rule**: ${ir.fx.containment_rule}

### 3. Environment
- **Canvas**: ${ir.environment.background}
- **Render Engine**: ${ir.environment.engine}`;
    }
    if(ir.camera_and_depth.isMinimal) depthStr = `CRITICAL RULE: The typography must remain a perfectly front-facing orthographic silhouette. The outer contour must read as a flat 2D cutout shape. Absolutely no rear extrusion, no visible side planes, and no object thickness. All dimensionality must exist only inside the front face as surface relief and shading. The camera MUST be positioned perfectly straight-on, dead center. Absolutely NO angled views, NO side views, NO isometric angles.`;
    else if (ir.camera_and_depth.projectionId === "Shallow") depthStr = `CRITICAL RULE: The typography must have ONLY a very shallow, thin 3D extrusion. Absolutely NO thick heavy 3D blocks. Keep the depth minimal.`;
    const lensDirective = `\n- **Lens & Perspective**: ${ir.camera_and_depth.lens}. CRITICAL: Use infinite depth of field. Every part of the text must be entirely in focus. Absolutely NO background blur, NO bokeh, NO blurry edges.`;
    let materialRule = ir.material_stack.integration_rule + " Must look highly organic, authentic, and photorealistic (PBR). STRICTLY AVOID cheap plastic, fake gold foil, or tacky over-shiny CGI look. Ensure extreme sharpness and elegant micro-details. The surface must not look chunky, blurry, or low-resolution. STRICTLY FORBIDDEN: Do NOT use cheap photoshop bevel and emboss effects, and avoid uniform V-shaped carving. AVOID decorative filigree, floral patterns, or ornate engravings. Do NOT use fake inner shadow or inner stroke layer styles.";
    materialRule += " CRITICAL: Do NOT let transparent ice blend into the background. Do NOT let glowing lava melt or break the shape. High legibility is mandatory. Ensure strictly linear brushed patterns if brushed metal is used, NO circular or radial grain.";
    if (ir.surface_morphology.reliefId !== "ChunkyToy") materialRule += " The object must have a rigid hard-surface with sharp metallic corners. It MUST NOT look like a plastic toy, a balloon, soft rounded bevels, or an inflatable bubble text.";
    if (state.surfaceDetail === "Clean") materialRule += " Ensure the surface is perfectly smooth and clean, absolutely NO scratches or grunge.";
    if (state.surfaceDetail === "High") materialRule += " Add intense micro-details, fine hairline scratches, and rich tactile texture.";
    if (state.typographyScale === "Dense") materialRule += " VERY IMPORTANT: Because the text is dense/complex, prioritize legibility. Reduce excessive noise or overly deep fractures that might make the letters unreadable. Keep the boundaries crisp.";
    return `Create an epic masterpiece image based on the following exact specifications.

### 1. Core Directives
- **Type**: Isolated standalone typography graphic. ${ir.subject.scale}.
- **Vibe**: ${ir._meta.persona.discipline}
- **Constraint**: ${ir.subject.fidelity_enforcement}

### 2. Camera & Depth
- **Perspective**: ${depthStr}${lensDirective}
- **Relief**: ${ir.surface_morphology.relief} with ${ir.surface_morphology.treatment}

### 3. Layered Material Stack
- **Base Material**: ${ir.material_stack.base} (${ir.surface_morphology.wear})
- **Internal Texture**: ${ir.material_stack.internal_texture}
- **Color Grading**: Highly saturated, punchy vibrant colors, rich deep colors. Never washed out or dull.
- **Rule**: ${materialRule}

### 4. Lighting & VFX
- **Lighting**: Dramatic directional lighting. Clearly lit front face, but any side thickness MUST fall into deep dark shadow. Avoid overlit side planes. ${ir.edge_and_lighting.glint}. Add ${ir.edge_and_lighting.rim_light}. ${ir.edge_and_lighting.rimColorId === "None" ? "CRITICAL: Do not add any glowing underlight or bottom light." : ""} Ensure perfect exposure on the front, deep controlled shadows on the sides, clean high-value highlights, strong material contrast. Avoid unnatural or uniform glowing borders.
- **Optical Integration**: Edge highlights and rim lights MUST be physically integrated into the surface edges only. Strictly NO floating glow, detached halos, or separated stroke lines. Do NOT overexpose the side extrusions.
- **Edge/Outline**: ${ir.edge_and_lighting.outline}
- **Surrounding VFX**: ${ir.fx.core !== "no surrounding FX" ? `${ir.fx.intensity} ${ir.fx.core}. Origin: ${ir.fx.origin}.` : "No surrounding FX."} ${ir.fx.containment_rule}
${state.currentView === 'editor' && !state.enableVfx ? "- **VFX RULE**: Ensure absolutely ZERO particles, zero dust, zero smoke, and zero lens flares. Keep the background completely clean." : ""}

### 5. Environment
- **Canvas**: Maintain ${ir.environment.background}. CRITICAL: The text must be an isolated, standalone graphic. Do NOT engrave the text onto a solid metal wall, plaque, or background plate. The background must remain a separate, simple canvas behind the text cutout.
- **Shadow**: ${ir.edge_and_lighting.shadow ? "MUST include grounded realistic drop shadow and cast shadows on the background canvas." : "ABSOLUTELY ZERO drop shadows. No cast shadows. The text must appear to be floating."}
- **Render Engine**: ${ir.environment.engine}
${ir.subject.intent ? `\n### 6. Special Intent\n- ${ir.subject.intent}` : ''}`;
};

const compileMidjourney = (ir, state) => {
    const isVFXPass = state.vfxPassMode || ir.vfxPassMode;
    const fxPhrase = ir.fx ? (ir.fx.core !== "no surrounding FX" ? `${ir.fx.intensity} ${ir.fx.core} ${ir.fx.origin}` : "") : "";
    const intent = ir.subject.intent ? `, ${ir.subject.intent}` : "";
    if (isVFXPass) {
        const subject = `pure pitch-black silhouette typography, holdout matte pass`;
        const lightingFx = `${fxPhrase}, ${ir.environment.background}`;
        const mjNegatives = "--no rim light, edge light, edge highlight, 3d, bevel, thickness, extrusion, metallic, reflections, lit text, text texture, outline, border, floating effects, background clutter, text mutation ";
        return `/imagine prompt: ${subject}, completely unlit black hole material, zero reflections, zero highlights, ${lightingFx} ${intent} ${mjNegatives}--style raw --v 6.1`.replace(/\s+/g, ' ').replace(/, ,/g, ',');
    }
    const lensTag = ir.camera_and_depth.lens;
    let subject = `cinematic legendary logo, isolated standalone typography graphic, clear cutout text shape against background, highly legible, infinite depth of field, entirely in focus, crisp and clear entire frame, ${ir.subject.scale}, ${lensTag}, ${ir.subject.fidelity_enforcement}, ${ir.camera_and_depth.isMinimal ? "solid structural body with minimal side thickness, zero deep rear extrusion" : ir.camera_and_depth.projection}, ${ir.surface_morphology.relief}`;
    let detailTag = "";
    if (state.surfaceDetail === "Clean") detailTag = "perfectly smooth flawless clean surface, ";
    else if (state.surfaceDetail === "High") detailTag = "intense micro-details, fine hairline scratches, rich surface noise, ";
    const materialMood = `${ir._meta.persona.discipline}, ${ir._meta.persona.mj_tags}, highly saturated, punchy vibrant colors, ${detailTag}${ir.material_stack.base} material with ${ir.material_stack.internal_texture}, ${ir.surface_morphology.wear} surface`;
    let lightingFx = `${fxPhrase}, dramatic directional lighting, clearly lit front face, dark shadowed side walls, deep ambient occlusion on extrusion, ${ir.edge_and_lighting.outline}, ${ir.edge_and_lighting.rim_light}, physically attached specular highlights, ${ir.edge_and_lighting.glint}, deep controlled shadows, clean high-value highlights, strong material contrast, ${ir.environment.background}`.replace(/^,\s*/, '');
    if (ir.edge_and_lighting.shadow) lightingFx += ", grounded with realistic drop shadow, soft cast shadow on backdrop, deep contact shadow anchoring the text";
    let mjNegatives = "--no background plate, plaque, signboard, engraved on a wall, solid metal block background, floating effects, background clutter, text mutation, extra letters, altered silhouette, random text, runes, hieroglyphs, symbols, written text on surface, watermark, gibberish, merged letters, illegible blob, melted together, filigree, floral patterns, decorative ornaments, ornate engravings, uniform stroke, photoshop bevel and emboss, cheap v-carve, wordart, disconnected rim light, floating edge light, artificial halo, separated highlight, dull gray midtones, framed, box around text, shield, emblem, baseplate, flat paper cutout, flat 2d sticker, inner shadow layer style, inner stroke, fake 2d deboss, flat paper with bevel, washed out, desaturated, faded, unnatural outline, glowing border, depth of field, bokeh, background blur, lens blur, out of focus, soft focus, blurred foreground, blurry edges, smudged, melted shape, illegible, transparent text blending into background, excessive glow destroying shape, loss of silhouette, bright side walls, overlit extrusion, glowing thickness, washed out sides, circular brushing, radial metal grain, anisotropic reflection, curved scratches, ";
    if (ir.edge_and_lighting.rimColorId === "None") mjNegatives += "bottom light, underglow, colored rim light, bright glow from below, ";
    if (!ir.edge_and_lighting.shadow) {
        subject += ", floating perfectly without floor shadows";
        mjNegatives += "drop shadow, cast shadow, contact shadow, drop shadow on background, shadow behind text, ";
    }
    if (ir.camera_and_depth.isMinimal) {
        subject += ", perfectly straight-on front facing view, dead center orthographic layout, 2D flat composition";
        mjNegatives += "angled view, side view, isometric, 3d perspective, tilt, diagonal, skewed, heavy 3d block, perspective depth, deep rear extrusion, ";
    } else if (ir.camera_and_depth.projectionId === "Shallow") {
        subject += ", straight-on front facing view, dead center, very shallow thin 3d extrusion";
        mjNegatives += "extreme angled view, side view, tilt, heavy 3d block, massive depth, thick extrusion, deep rear extrusion, chunky text, ";
    } else {
        subject += ", straight-on front facing view, dead center";
        mjNegatives += "extreme angled view, side view, tilt, ";
    }
    if (state.currentView === 'editor' && !state.enableVfx) mjNegatives += "particle effects, floating dust, magic sparkles, glowing embers, smoke, fog, mist, lens flare, bloom, light leaks, fire, flames, glowing background, ";
    if (ir.surface_morphology.reliefId !== "ChunkyToy") {
        lightingFx += ", rigid hard-surface, sharp geometric corners, precise metallic structure";
        mjNegatives += "plastic, toy, balloon, inflatable, bubble text, play-doh, soft rounded edges, marshmallow, squishy, 3d render style, soft rounded bevels, blunt corners, smooth edges, ";
    }
    if (ir.camera_and_depth.isMinimal) mjNegatives += "heavy 3d block, perspective depth, deep rear extrusion, isometric, angled view ";
    if (state.surfaceDetail === "Clean") mjNegatives += "scratches, grunge, noise, dents, dust, imperfections ";
    if (state.typographyScale === "Dense") mjNegatives += "excessive noise, cluttered details, unreadable, chaotic textures ";
    if (state.cameraLens === "Telephoto") mjNegatives += "wide angle distortion, perspective distortion, fisheye, vanishing point ";
    if (ir.surface_morphology.reliefId === "MicroBevel" || ir.surface_morphology.reliefId === "HairlineBevel" || ir.surface_morphology.reliefId === "Flat") mjNegatives += "deeply carved, heavy embossing, intense 3d front, deep valleys, deep chiseled ";
    return `/imagine prompt: ${subject}, ${materialMood}, ${lightingFx}, ${ir.environment.engine}, perfectly exposed, vivid, highly detailed${intent} ${mjNegatives}--style raw --v 6.1`.replace(/\s+/g, ' ').replace(/, ,/g, ',');
};

const compileEditNanoBanana = (ir, state) => {
    if (ir.vfxPassMode) {
        const posTags = ["masterpiece, best quality, ultra highres, 8k resolution", "pure pitch-black silhouette typography, holdout matte pass, vantablack text, completely unlit, pure #000000 shape", ir.details.vfx || "", ir.background, ir.customIntent !== "subtle surface enhancement" ? ir.customIntent : ""].filter(Boolean).map(t => t.trim()).join(", ");
        const negTags = ["(worst quality, low quality:1.4), text mutation, extra letters, hallucinated text", "(rim light:1.8), (edge highlight:1.8), (glowing edge:1.8), (3d:1.8), (thickness:1.8), (extrusion:1.8), (bevel:1.8), (metallic:1.8), (reflections:1.8), (lighting on text:1.8), (3d block:1.8)", "lit text, text texture, outline, border, drop shadow, inner glow, lens flare"].filter(Boolean).map(t => t.trim()).join(", ");
        return `${posTags}\n\nNegative prompt: ${negTags}`;
    }
    let frontVolumeModifier = "";
    if (ir.reliefId === "Flat") frontVolumeModifier = "strictly flat front core without deep carving";
    else if (ir.reliefId === "MicroBevel") frontVolumeModifier = "maintaining a flat core with only subtle edge bevels, NO deep carving";
    else if (ir.reliefId === "HairlineBevel") frontVolumeModifier = "featuring a flat front with microscopic razor-thin edges";
    else if (ir.reliefId === "MicroChiseled") frontVolumeModifier = "featuring densely micro-chiseled intricate cuts on the surface";
    else if (ir.reliefId === "Crystalline") frontVolumeModifier = "featuring sharp crystalline geometric facets and deep jewel-like cuts";
    else if (ir.reliefId === "DiamondPrism") frontVolumeModifier = "featuring sharp prismatic V-carved angular facets with a prominent center ridge";
    else if (ir.reliefId === "DeepVCarve") frontVolumeModifier = "featuring a sharp center ridge running along the strokes with deep V-carved inner facets";
    else frontVolumeModifier = "with balanced front volume";
    const projectionTag = ir.constraints.extrusion.includes("MINIMAL") ? `solid structural body with minimal side thickness, absolutely no rear extrusion, BUT ${frontVolumeModifier}` : "allow 3d extrusion";
    const posTags = [
        "masterpiece, best quality, ultra highres, 8k resolution, perfectly exposed, bright base material",
        "isolated standalone typography graphic, clear cutout text shape against background",
        "clean and readable typography, rich luminous midtones, elegant material finish, crisp specular highlights, clearly lit front face, deep shadowed side walls",
        "highly saturated, punchy vibrant colors, cinematic color grading, rich deep colors",
        "infinite depth of field, entirely in focus, edge-to-edge sharp focus, zero background blur, crisp and clear entire frame",
        `cinematic remix, ${ir.budget.en}`,
        "Use the input image as the exact structural reference",
        "strict shape lock, exact silhouette preservation, preserve the original typography silhouette, spacing, stroke proportions, and letter shapes",
        ir.camera, projectionTag,
        ir.details.material ? `change material to ${ir.details.material}` : "",
        ir.details.lighting ? `dynamic lighting, ${ir.details.lighting}, physically attached specular highlights` : "",
        ir.details.vfx ? `surrounding VFX, ${ir.details.vfx}, contained energy` : "",
        ir.customIntent !== "subtle surface enhancement" ? ir.customIntent : "",
        "texture physically embedded into material", ir.background
    ];
    let negTags = [
        "(worst quality, low quality:1.4), (washed out:1.5), (desaturated:1.5), (dull colors:1.5), (noisy, dirty surface, overcooked, dark patches, messy shading, burnt shadows:1.5), (dark, underexposed, gloomy:1.5)",
        "text mutation, shape drift, stroke swell, extra letters, hallucinated text, floating decal, material sticker, distorted stroke proportions, altered spacing",
        "(runes, hieroglyphs, symbols, written text on surface, watermark, gibberish:1.6), (merged letters, illegible blob, melted together, fused typography:1.5)",
        "(filigree, floral patterns, decorative ornaments, ornate engravings:1.5)",
        "(background plate:1.9), (plaque:1.9), (signboard:1.9), (engraved on a wall:1.9), (solid metal block background:1.9), (framed:1.8), (box around text:1.8), text engraved on surface, shield, baseplate, flat paper cutout, flat 2d sticker, mounted metal plate, vector graphic",
        ir.constraints.extrusionId === "None" ? "(heavy 3d block:1.8), (isometric:1.8), (perspective:1.8), (side view:1.8), (angled view:1.8), visible sides, tilt, (deep rear extrusion:1.8)" : ir.constraints.extrusionId === "Shallow" ? "(thick extrusion:1.8), (heavy 3d block:1.8), (massive depth:1.8), (deep rear extrusion:1.8), (chunky text:1.8)" : "(thick extrusion:1.4), (heavy 3d block:1.4)",
        "(uniform stroke:1.9), (even border thickness:1.9), (artificial outline:1.9), (unnatural outline:1.5), (glowing border:1.5), cheap 3d effect, wordart, 2d border, (low poly, jagged edges, messy bevel, crunchy artifacts, unrefined sculpt:1.5)",
        "(photoshop bevel and emboss:1.9), (cheap v-carve:1.9), (uniform V-shape depth:1.9), (inner shadow layer style:1.9), (inner stroke:1.9), (fake 2d deboss:1.9), (flat paper with bevel:1.9)",
        "floating FX, background noise, messy glow, overglare, disconnected rim light, floating edge light, artificial halo, separated highlight, (messy edge blending:1.6), detached stroke, (depth of field:1.9), (bokeh:1.9), (background blur:1.9), (lens blur:1.9), out of focus, soft focus, blurred foreground, blurry edges, smudged",
        "(melted shape:1.5), (illegible:1.5), (transparent text blending into background:1.5), (excessive glow destroying shape:1.5), (loss of silhouette:1.5)",
        "(bright side walls:1.5), (overlit extrusion:1.5), (glowing thickness:1.5)",
        "(circular brushing:1.5), (radial metal grain:1.5), (anisotropic reflection:1.5), curved scratches"
    ];
    if (ir.details.rimColorId === "None") negTags.push("(bottom light:1.8), (underglow:1.8), (colored rim light:1.5)");
    if (ir.constraints.extrusionId === "None") {
        posTags.push("perfectly straight-on front facing view, dead center orthographic layout, strict 2D planar composition");
        negTags.push("(angled view:1.9), (side view:1.9), (isometric:1.9), (3d perspective:1.9), (tilt:1.9), diagonal, skewed");
    } else if (ir.constraints.extrusionId === "Shallow") {
        posTags.push("straight-on front facing view, dead center, very shallow thin 3d extrusion");
        negTags.push("(extreme angled view:1.5), (side view:1.5), tilt");
    } else {
        posTags.push("straight-on front facing view, dead center");
        negTags.push("(extreme angled view:1.5), (side view:1.5), tilt");
    }
    if (ir.reliefId !== "ChunkyToy") {
        posTags.push("rigid hard-surface, sharp geometric corners, precise metallic structure");
        negTags.push("(plastic, toy, balloon, inflatable, bubble text, play-doh, soft rounded edges, marshmallow, squishy, 3d render style:1.6), (soft rounded bevels, blunt corners, smooth edges:1.5)");
    }
    if (state.cameraLens === "Telephoto") negTags.push("(wide angle distortion:1.5), (perspective distortion:1.5), fisheye, vanishing point");
    if (ir.reliefId === "MicroBevel" || ir.reliefId === "Flat" || ir.reliefId === "HairlineBevel") negTags.push("(deeply carved:1.5), (heavy embossing:1.5), (intense 3d front:1.5), (deep valleys:1.5), deep chiseled");
    return `${posTags.filter(Boolean).map(t => t.trim()).join(", ")}\n\nNegative prompt: ${negTags.filter(Boolean).map(t => t.trim()).join(", ")}`;
};

const compileEditChatGPT = (ir) => {
    if (ir.vfxPassMode) {
        return `Create a Shape-Locked Image-to-Image Remix based on the exact specifications below.

### 1. VFX EXTRACTION PASS (CRITICAL)
- **Type**: Pure flat 2D pitch-black silhouette typography.
- **Vibe**: Technical Matte Pass for VFX Compositing.
- **Rule (ABSOLUTE)**: Render the typography as a pure Vantablack (#000000), completely unlit flat 2D shape. STRICTLY FORBIDDEN: Do NOT add any rim lights, edge highlights, 3D thickness, bevels, or reflections to the letters. ONLY render the glowing FX surrounding this black void.

### 2. Constraints & Integrity
- **Glyph Lock**: ${ir.locks.glyph}
- **Contour Lock**: ${ir.locks.contour}
- **Anti-Mutation**: ${ir.constraints.anti_mutation}

### 3. Edit Scope & VFX
- **Surrounding VFX**: ${ir.details.vfx || "No VFX specified."}
- **FX Containment**: ${ir.constraints.fx_containment}
- **Custom Directive**: ${ir.customIntent}
- **Background**: Maintain ${ir.background}`;
    }
    let intentsArr = [];
    if(ir.details.material) intentsArr.push(`Material Override: ${ir.details.material}`);
    if(ir.details.lighting) intentsArr.push(`Lighting Enhance: ${ir.details.lighting}`);
    if(ir.details.vfx) intentsArr.push(`Contained VFX: ${ir.details.vfx}`);
    let extrConstraint = ir.constraints.extrusion;
    if(ir.constraints.extrusionId === "MINIMAL" || ir.constraints.extrusionId === "None") extrConstraint = "CRITICAL RULE: The typography must remain a perfectly front-facing orthographic silhouette. The outer contour must read as a flat 2D cutout shape. Absolutely no rear extrusion, no visible side planes, and no object thickness. All dimensionality must exist only inside the front face as surface relief and shading. The camera MUST be positioned perfectly straight-on, dead center. Absolutely NO angled views, NO side views, NO isometric angles.";
    else if (ir.constraints.extrusionId === "Shallow") extrConstraint = "CRITICAL RULE: The typography must have ONLY a very shallow, thin 3D extrusion. Absolutely NO thick heavy 3D blocks. Keep the depth minimal.";
    const lensDirective = `\n- **Lens & Perspective**: ${ir.camera}. CRITICAL: Use infinite depth of field. Every part of the text must be entirely in focus. Absolutely NO background blur, NO bokeh, NO blurry edges.`;
    let antiToyRule = " AVOID decorative filigree, floral patterns, or ornate engravings. Ensure high legibility and perfectly intact silhouette. Do NOT melt the shape.";
    if (ir.reliefId !== "ChunkyToy") antiToyRule += " The object must have a rigid hard-surface with sharp metallic corners. It MUST NOT look like a plastic toy, a balloon, soft rounded bevels, or an inflatable bubble text.";
    return `Create a Shape-Locked Image-to-Image Remix based on the exact specifications below.

### 1. Structure Lock (CRITICAL)
- **Reference**: Use the input image as the exact structural reference.
- **Glyph Lock**: ${ir.locks.glyph}
- **Contour Lock**: ${ir.locks.contour}
- **Stroke Lock**: ${ir.locks.stroke}
- **Budget Level**: ${ir.budget.name}

### 2. Constraints & Integrity
- **Anti-Mutation**: ${ir.constraints.anti_mutation}
- **Material Integration**: ${ir.constraints.material_integration} Must look highly organic, authentic, and photorealistic (PBR). STRICTLY AVOID cheap plastic, fake gold foil, or tacky over-shiny CGI look. Ensure extreme sharpness and intricate micro-details on the facets. STRICTLY FORBIDDEN: Do NOT use cheap photoshop bevel and emboss effects, and avoid uniform V-shaped carving. AVOID fake inner shadow or inner stroke layer styles.${antiToyRule} Ensure straight linear brushed lines, NO circular brushing.
- **Optical Integration**: Edge highlights and rim lights MUST be physically integrated into the surface. Strictly NO floating glow, detached halos, or separated stroke lines. Ensure a clearly lit and well-exposed subject. Deep controlled shadows, clean high-value highlights, strong material contrast. Avoid unnatural or uniform glowing borders.
- **Color Grading**: Highly saturated, punchy vibrant colors, rich deep colors. Never washed out or dull.
- **FX Containment**: ${ir.constraints.fx_containment}
- **Depth/Extrusion**: ${extrConstraint}${lensDirective} Ensure side planes (thickness) fall into deep shadow and do NOT glow brightly.

### 3. Edit Scope & Intents
- **Target Changes**: \n  - ${intentsArr.length > 0 ? intentsArr.join("\n  - ") : "Subtle Polish"}
- **Custom Directive**: ${ir.customIntent}
- **Background**: Maintain ${ir.background}. CRITICAL: The text must be an isolated, standalone graphic. Do NOT engrave the text onto a solid metal wall, plaque, or background plate. The background must remain a separate, simple canvas behind the text cutout.

*Ensure the output preserves 95%+ of the original core morphology while only swapping the outer aesthetic layers. Do not use cheap uniform 2D strokes or photoshop bevel effects.*`;
};

const compileEditMidjourney = (ir, state) => {
    if (ir.vfxPassMode) {
        const subject = `pure pitch-black silhouette typography, holdout matte pass`;
        const lightingFx = `${ir.details.vfx || ""}, ${ir.background}`;
        const mjNegatives = "--no rim light, edge light, edge highlight, 3d, bevel, thickness, extrusion, metallic, reflections, lit text, text texture, outline, border, floating effects, background clutter, text mutation ";
        return `/imagine prompt: ${subject}, completely unlit black hole material, zero reflections, zero highlights, ${lightingFx} ${mjNegatives}--style raw --v 6.1`.replace(/\s+/g, ' ').replace(/, ,/g, ',');
    }
    let intentsArr = [];
    if(ir.details.material) intentsArr.push(`material shift to ${ir.details.material}`);
    if(ir.details.lighting) intentsArr.push(`lighting tune: ${ir.details.lighting}`);
    if(ir.details.vfx) intentsArr.push(`surface VFX: ${ir.details.vfx}`);
    let subject = `cinematic legendary logo remix, isolated standalone typography graphic, strict shape lock, exact silhouette preservation, Use the input image as the exact structural reference, highly legible, infinite depth of field, entirely in focus, crisp and clear entire frame, ${ir.camera}, ${ir.budget.en}`;
    const scope = intentsArr.length > 0 ? intentsArr.join(", ") : "surface polish";
    const custom = ir.customIntent !== "subtle surface enhancement" ? `, ${ir.customIntent}` : "";
    const constraints = `${ir.constraints.extrusion}, ${ir.constraints.material_integration}, ${ir.constraints.fx_containment}, physically attached specular highlights, deep controlled shadows, clean high-value highlights, strong material contrast, highly saturated, punchy vibrant colors`;
    let mjNegatives = "--no background plate, plaque, signboard, engraved on a wall, solid metal block background, text mutation, shape drift, stroke swell, floating FX, background noise, material sticker, extra letters, runes, hieroglyphs, symbols, written text on surface, watermark, gibberish, merged letters, illegible blob, melted together, filigree, floral patterns, decorative ornaments, ornate engravings, uniform stroke, photoshop bevel and emboss, cheap v-carve, wordart, disconnected rim light, floating edge light, artificial halo, separated highlight, dull gray midtones, framed, box around text, shield, emblem, baseplate, drop shadow, cast shadow revealing thickness, inner shadow layer style, inner stroke, fake 2d deboss, flat paper with bevel, washed out, desaturated, faded, unnatural outline, glowing border, depth of field, bokeh, background blur, lens blur, out of focus, soft focus, blurred foreground, blurry edges, smudged, melted shape, illegible, transparent text blending into background, excessive glow destroying shape, loss of silhouette, bright side walls, overlit extrusion, glowing thickness, washed out sides, circular brushing, radial metal grain, anisotropic reflection, curved scratches, ";
    if (ir.constraints.extrusionId === "None" || ir.constraints.extrusionId === "MINIMAL") {
        subject += ", perfectly straight-on front facing view, dead center orthographic layout, 2D flat composition";
        mjNegatives += "angled view, side view, isometric, 3d perspective, tilt, diagonal, skewed, heavy 3d block, perspective depth, deep rear extrusion, ";
    } else if (ir.constraints.extrusionId === "Shallow") {
        subject += ", straight-on front facing view, dead center, very shallow thin 3d extrusion";
        mjNegatives += "extreme angled view, side view, tilt, heavy 3d block, massive depth, thick extrusion, deep rear extrusion, ";
    } else {
        subject += ", straight-on front facing view, dead center";
        mjNegatives += "extreme angled view, side view, tilt, ";
    }
    let lightingFx = "dramatic directional lighting, clearly lit front face, dark shadowed side walls, deep ambient occlusion on extrusion";
    if (ir.reliefId !== "ChunkyToy") {
        lightingFx += ", rigid hard-surface, sharp geometric corners, precise metallic structure";
        mjNegatives += "plastic, toy, balloon, inflatable, bubble text, play-doh, soft rounded edges, marshmallow, squishy, 3d render style, soft rounded bevels, blunt corners, smooth edges, ";
    }
    if (state.cameraLens === "Telephoto") mjNegatives += "wide angle distortion, perspective distortion, fisheye, vanishing point ";
    if (ir.reliefId === "MicroBevel" || ir.reliefId === "HairlineBevel" || ir.reliefId === "Flat") mjNegatives += "deeply carved, heavy embossing, intense 3d front, deep valleys, deep chiseled ";
    const mj_iw = ir.budget.id === "Locked" ? "--iw 2.0" : ir.budget.id === "Conservative" ? "--iw 1.5" : ir.budget.id === "Balanced" ? "--iw 1.0" : "--iw 0.5";
    return `/imagine prompt: ${subject}, applied ${scope}${custom}, ${constraints}, ${lightingFx}, background ${ir.background} ${mjNegatives}${mj_iw} --style raw --v 6.1`.replace(/\s+/g, ' ');
};

const compileRunway = (ir) => {
    const isStatic = ir.motion.camera.includes("ZERO zoom");
    const staticRule = isStatic ? "NO ZOOM IN. NO ZOOM OUT. NO CAMERA MOVEMENT. STRICTLY STATIC CAMERA. FIXED SCALE." : "";
    const fxRule = ir.energyCore !== "no surrounding FX" ? `${ir.energyCore}, highly controlled, strictly confined to the text area, pure black background must remain clean and unaffected by global color washes` : "None";
    const posTags = [`Camera: ${ir.motion.camera}`, staticRule, `Dynamics: ${ir.motion.dynamics}`, `VFX: ${fxRule}`, ir.customIntent, ir.subject_lock, "Do not deform. Maintain perfectly crisp edges. Do NOT fill the entire screen with effects."].filter(Boolean).join(". ");
    return posTags;
};

const compileLuma = (ir) => {
    const isStatic = ir.motion.camera.includes("ZERO zoom");
    const staticRule = isStatic ? "Strictly NO camera movement, NO zoom in, NO zoom out. The camera is locked." : "";
    const fxRule = ir.energyCore !== "no surrounding FX" ? `${ir.energyCore} effect, keeping the glow subtle, strictly confined to the letters, background must remain pure black, do NOT apply a full-screen gold filter` : "No FX";
    return `Cinematic motion, ${ir.motion.camera}. ${staticRule} Dynamics: ${ir.motion.dynamics}. VFX: ${fxRule}. ${ir.customIntent}. Keep the text absolutely solid and static, NO morphing, NO warping of the typography. Maintain perfectly crisp edges. Effects must not overwhelm the entire screen.`;
};

const compileSequence = (ir) => {
    return `// AE / Web Sequence Compositing Guide
// 1. Export Matte Pass from Creation Tab (VFX Source Extraction Mode)
// 2. Import into After Effects / WebGL Canvas
// 3. Blend Mode: Screen or Linear Dodge (Add)
// 4. Camera Dynamics: ${ir.motion.camera}
// 5. Particle/FX Behavior: ${ir.motion.dynamics} (${ir.energyCore})
// CRITICAL: To achieve a perfect seamless loop for web, ensure particle lifespans match the composition duration exactly.`;
};

const compileVeo = (ir) => {
    const isStatic = ir.motion.camera.includes("ZERO zoom");
    const staticRule = isStatic ? "ABSOLUTE CAMERA LOCK: The camera MUST NOT zoom out, MUST NOT zoom in, pan, or move. The text scale and position must remain perfectly fixed throughout the video." : "";
    const fxRule = ir.energyCore !== "no surrounding FX" ? `with ${ir.energyCore}` : "";
    return `Create a high-quality cinematic video of an isolated standalone typography graphic on a pure black background.
Camera Motion: ${ir.motion.camera}
Dynamics: ${ir.motion.dynamics} ${fxRule}
${ir.customIntent ? `Action: ${ir.customIntent}` : ""}

CRITICAL RULE: ${ir.subject_lock} Do not allow the text to distort or melt. Maintain perfectly crisp edges.
FX CONTAINMENT: Visual effects MUST be highly controlled and strictly confined to the text surface and immediate edges. Do NOT let effects fill the entire screen. The background MUST remain a pure, unaffected black void. NO global color washes or full-screen filters.
${staticRule}`;
};

const App = () => {
  const { ensureCanGenerate, modal: usageModal } = useUsageGate();
  const { payload, clearPayload, navigate } = useGlobal();
  const [incomingFromArc, setIncomingFromArc] = useState(null); // { from, tags, text } | null
  const consumedPayloadRef = useRef(null);
  const [currentView, setCurrentView] = useState("editor");
  const [appOptions, setAppOptions] = useState(INITIAL_OPTIONS);

  const [directorPersona, setDirectorPersona] = useState("Cinematic");
  const [complexity, setComplexity] = useState(3);
  const [typographyScale, setTypographyScale] = useState("Macro");
  const [cameraLens, setCameraLens] = useState("Telephoto");
  const [background, setBackground] = useState("RealBlack");
  const [frontRelief, setFrontRelief] = useState("MicroChiseled");
  const [projectionDepth, setProjectionDepth] = useState("None");
  const [surfaceTreatment, setSurfaceTreatment] = useState("Standard");
  const [enableVfx, setEnableVfx] = useState(false);
  const [enableShadow, setEnableShadow] = useState(false);
  const [energyCore, setEnergyCore] = useState("None");
  const [fxOrigin, setFxOrigin] = useState("Edges");
  const [fxIntensity, setFxIntensity] = useState("Subtle");
  const [vfxPassMode, setVfxPassMode] = useState(false);
  const [material, setMaterial] = useState("HyperChrome");
  const [materialInt, setMaterialInt] = useState("Mid");
  const [dramaticTex, setDramaticTex] = useState("Auto");
  const [surfaceDetail, setSurfaceDetail] = useState("Standard");
  const [rimMaterial, setRimMaterial] = useState("None");
  const [rimThickness, setRimThickness] = useState("None");
  const [wearLevel, setWearLevel] = useState("None");
  const [rimColor, setRimColor] = useState("White");
  const [rimIntensity, setRimIntensity] = useState("Moderate");
  const [enableGlint, setEnableGlint] = useState(false);
  const [renderEngine, setRenderEngine] = useState("Unreal");
  const [userIntent, setUserIntent] = useState("");
  const [imageRatio, setImageRatio] = useState("16:9");
  const [aiModel, setAiModel] = useState("NanoBanana");

  const [referenceImage, setReferenceImage] = useState(null);
  const [isDraggingRef, setIsDraggingRef] = useState(false);
  const [isAnalyzingRef, setIsAnalyzingRef] = useState(false);
  const [importPromptStr, setImportPromptStr] = useState("");
  const [isAnalyzingPrompt, setIsAnalyzingPrompt] = useState(false);

  // 프롬프트 아크에서 전달된 payload 수신.
  // 이미지 자동 삽입은 하지 않고, Gemini로 스타일 분석 → 옵션 ID 추천 → 패널에 하이라이트.
  // 추천 옵션은 arcRecommended state에 저장되고 UI에서 ★로 강조 표시됨.
  const [arcRecommended, setArcRecommended] = useState(null); // { material, frontRelief, surfaceTreatment, background, energyCore, summary }
  const [isArcAnalyzing, setIsArcAnalyzing] = useState(false);
  useEffect(() => {
    if (!payload || payload.target !== 'render-metrics') return;
    if (!payload.timestamp) return;
    if (consumedPayloadRef.current === payload.timestamp) return;
    consumedPayloadRef.current = payload.timestamp;

    const imgUrl = payload.image?.url || '';
    const text = payload.prompt?.text || '';
    const tags = Array.isArray(payload.prompt?.tags) ? payload.prompt.tags : [];
    const source = payload.source || 'unknown';

    (async () => {
      setIncomingFromArc({ from: source, tags, text, hasImage: !!imgUrl, status: 'starting' });
      try { clearPayload(); } catch {}
      if (!imgUrl || !GEMINI_API_KEY) {
        setIncomingFromArc((s) => s ? { ...s, status: 'no-image' } : null);
        return;
      }
      setIsArcAnalyzing(true);
      setIncomingFromArc((s) => s ? { ...s, status: 'fetching' } : null);
      let base64Data;
      try {
        const res = await fetch(imgUrl, { mode: 'cors' });
        if (!res.ok) throw new Error(`이미지 fetch ${res.status}`);
        const blob = await res.blob();
        const dataUrl = await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onloadend = () => resolve(String(r.result));
          r.onerror = reject;
          r.readAsDataURL(blob);
        });
        base64Data = dataUrl.split(',')[1];
      } catch (e) {
        console.error('[RenderMatrix] arc 이미지 다운로드 실패', e);
        setIsArcAnalyzing(false);
        setIncomingFromArc((s) => s ? { ...s, status: 'fetch-failed' } : null);
        return;
      }

      setIncomingFromArc((s) => s ? { ...s, status: 'analyzing' } : null);
      // 추천 가능한 옵션 ID 목록을 프롬프트에 포함시켜 Gemini가 정확히 그 중에서 고르도록 한다.
      const matIds  = appOptions.materials.map(o => o.id).join(', ');
      const reliefIds = appOptions.frontReliefs.map(o => o.id).join(', ');
      const surfIds = appOptions.surfaceTreatments.map(o => o.id).join(', ');
      const bgIds   = appOptions.backgrounds.map(o => o.id).join(', ');
      const fxIds   = appOptions.energyCores.map(o => o.id).join(', ');
      const detailIds = appOptions.surfaceDetails.map(o => o.id).join(', ');

      const sysPrompt = `이 이미지의 시각 스타일을 분석해서 어울리는 입체화 옵션을 추천하세요.\n반드시 아래 ID 목록 중에서 한 개씩만 골라 JSON으로 반환 (코드블록·설명 금지):\n- material: ${matIds}\n- frontRelief: ${reliefIds}\n- surfaceTreatment: ${surfIds}\n- background: ${bgIds}\n- energyCore: ${fxIds}\n- surfaceDetail: ${detailIds}\n\n참고 태그/프롬프트: ${tags.join(', ') || '(none)'}\n${text ? '추가 설명: ' + text : ''}\n\n출력 형식:\n{ "summary": "한 문장 한국어 설명 (왜 이 조합인지)", "material":"...", "frontRelief":"...", "surfaceTreatment":"...", "background":"...", "energyCore":"...", "surfaceDetail":"..." }`;
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(new Error("Gemini timeout 30s")), 30000);
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [
                { text: sysPrompt },
                { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
              ] }],
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
        // 받은 ID들이 실제 목록에 있는 것만 채택
        const filterId = (val, list) => list.some(o => o.id === val) ? val : null;
        setArcRecommended({
          summary: parsed.summary || '',
          material:         filterId(parsed.material,         appOptions.materials),
          frontRelief:      filterId(parsed.frontRelief,      appOptions.frontReliefs),
          surfaceTreatment: filterId(parsed.surfaceTreatment, appOptions.surfaceTreatments),
          background:       filterId(parsed.background,       appOptions.backgrounds),
          energyCore:       filterId(parsed.energyCore,       appOptions.energyCores),
          surfaceDetail:    filterId(parsed.surfaceDetail,    appOptions.surfaceDetails),
        });
        setIncomingFromArc((s) => s ? { ...s, status: 'done', summary: parsed.summary } : null);
      } catch (e) {
        console.error('[RenderMatrix] arc 추천 분석 실패', e);
        setIncomingFromArc((s) => s ? { ...s, status: 'analyze-failed', errorMessage: e.message } : null);
      } finally { setIsArcAnalyzing(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload?.timestamp, payload?.target]);

  const [editImage, setEditImage] = useState(null);
  const [editBudget, setEditBudget] = useState("Conservative");
  const [activeEditIntents, setActiveEditIntents] = useState({ material: false, lighting: false, vfx: false });
  const [editBg, setEditBg] = useState("RealBlack");
  const [editRearExtrusion, setEditRearExtrusion] = useState("None");
  const [editIntent, setEditIntent] = useState("");
  const [isDraggingEdit, setIsDraggingEdit] = useState(false);
  const [editMaterial, setEditMaterial] = useState("HyperChrome");
  const [editWearLevel, setEditWearLevel] = useState("None");
  const [editRimColor, setEditRimColor] = useState("White");
  const [editRimIntensity, setEditRimIntensity] = useState("Moderate");
  const [editEnergyCore, setEditEnergyCore] = useState("GoldenDust");
  const [editFxOrigin, setEditFxOrigin] = useState("Edges");
  const [editFxIntensity, setEditFxIntensity] = useState("Moderate");
  const [editVfxPassMode, setEditVfxPassMode] = useState(false);

  const [motionImage, setMotionImage] = useState(null);
  const [cameraMotion, setCameraMotion] = useState("Static");
  const [vfxDynamics, setVfxDynamics] = useState("Flowing");
  const [motionIntent, setMotionIntent] = useState("");
  const [isDraggingMotion, setIsDraggingMotion] = useState(false);

  const [currentIR, setCurrentIR] = useState(null);
  const [compiledOutputs, setCompiledOutputs] = useState({ NanoBanana: "", ChatGPT: "", Midjourney: "", Veo: "", Runway: "", Luma: "", Sequence: "" });
  const [optimizedPrompts, setOptimizedPrompts] = useState({ NanoBanana: null, ChatGPT: null, Midjourney: null });
  const [optimizedPromptsKo, setOptimizedPromptsKo] = useState({ NanoBanana: null, ChatGPT: null, Midjourney: null });
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [auditIssues, setAuditIssues] = useState([]);
  const [qualityScores, setQualityScores] = useState({ structure: 100, material: 100, visibility: 100, fxControl: 100 });
  const [isCopied, setIsCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [activeTroubleshoots, setActiveTroubleshoots] = useState([]);
  const [troubleshootHistory, setTroubleshootHistory] = useState({});
  const [isExpandingIntent, setIsExpandingIntent] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [tempIntent, setTempIntent] = useState("");
  const chatScrollRef = useRef(null);
  const [activePresetGroup, setActivePresetGroup] = useState(PRESET_GROUPS[0].id);
  const [activePresetId, setActivePresetId] = useState(null);
  const [isPresetModified, setIsPresetModified] = useState(false);

  const handleChange = (setter) => (val) => {
      setter(val);
      if (activePresetId) setIsPresetModified(true);
      setActiveTroubleshoots([]);
      setTroubleshootHistory({});
      setOptimizedPrompts({ NanoBanana: null, ChatGPT: null, Midjourney: null });
      setOptimizedPromptsKo({ NanoBanana: null, ChatGPT: null, Midjourney: null });
  };

  const applyAnalyzedOptions = (parsed) => {
    if (parsed.new_options && parsed.new_options.length > 0) {
        setAppOptions(prev => {
            const nextOptions = { ...prev };
            parsed.new_options.forEach(newOpt => {
                if (nextOptions[newOpt.category]) {
                    if (!nextOptions[newOpt.category].find(o => o.id === newOpt.id)) {
                        nextOptions[newOpt.category] = [...nextOptions[newOpt.category], { id: newOpt.id, name: `✨ ${newOpt.name}`, en: newOpt.en }];
                    }
                }
            });
            return nextOptions;
        });
    }
    const so = parsed.selected_options;
    if (so.material) setMaterial(so.material);
    if (so.surfaceDetail) setSurfaceDetail(so.surfaceDetail);
    if (so.dramaticTex) setDramaticTex(so.dramaticTex);
    if (so.wearLevel) setWearLevel(so.wearLevel);
    if (so.frontRelief) setFrontRelief(so.frontRelief);
    if (so.projectionDepth) setProjectionDepth(so.projectionDepth);
    if (so.energyCore) setEnergyCore(so.energyCore);
    if (so.enableVfx !== undefined) setEnableVfx(so.enableVfx);
    if (so.enableShadow !== undefined) setEnableShadow(so.enableShadow);
    if (so.rimIntensity) setRimIntensity(so.rimIntensity);
    if (so.rimColor) setRimColor(so.rimColor);
    if (parsed.custom_intent) setUserIntent(parsed.custom_intent);
    setActivePresetId(null);
  };

  const handleAnalyzeReference = async () => {
    if (!referenceImage) return;
    setIsAnalyzingRef(true);
    try {
        const apiKey = GEMINI_API_KEY;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const base64Data = referenceImage.split(',')[1];
        const systemPrompt = `You are an expert 3D Typography Art Director. Analyze the uploaded reference image and map characteristics to existing options. Return strict JSON with selected_options (material, surfaceDetail, dramaticTex, wearLevel, frontRelief, projectionDepth, energyCore, enableVfx, enableShadow, rimIntensity, rimColor), new_options array (category, id, name, en), and custom_intent.\n\nExisting Options Context:\n${JSON.stringify({ materials: appOptions.materials.map(m=>({id: m.id, desc: m.name})), frontReliefs: appOptions.frontReliefs.map(r=>({id: r.id, desc: r.name})), dramaticTextures: appOptions.dramaticTextures.map(t=>({id: t.id, desc: t.name})), energyCores: appOptions.energyCores.map(e=>({id: e.id, desc: e.name})), rimColors: appOptions.rimColors.map(r=>({id: r.id, desc: r.name})) })}`;
        const payload = { contents: [{ role: "user", parts: [{ text: "Analyze this typography reference image and provide the JSON mapping." }, { inlineData: { mimeType: "image/jpeg", data: base64Data } }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json" } };
        const response = await fetchWithRetry(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
            const parsed = parseJSON(text);
            if (parsed && parsed.selected_options) {
                applyAnalyzedOptions(parsed);
                setToastMsg("✨ 레퍼런스 분석 및 동적 옵션 생성 완료!");
                setTimeout(() => setToastMsg(null), 4000);
            }
        }
    } catch (err) {
        console.error(err);
        setToastMsg("❌ 이미지 분석에 실패했습니다.");
        setTimeout(() => setToastMsg(null), 3000);
    } finally { setIsAnalyzingRef(false); }
  };

  const handleAnalyzePrompt = async () => {
    if (!importPromptStr.trim()) return;
    setIsAnalyzingPrompt(true);
    try {
        const apiKey = GEMINI_API_KEY;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const systemPrompt = `Reverse-engineer this typography prompt and map characteristics to existing options. Return strict JSON. Existing Options Context:\n${JSON.stringify({ materials: appOptions.materials.map(m=>({id: m.id})), frontReliefs: appOptions.frontReliefs.map(r=>({id: r.id})), dramaticTextures: appOptions.dramaticTextures.map(t=>({id: t.id})), energyCores: appOptions.energyCores.map(e=>({id: e.id})), rimColors: appOptions.rimColors.map(r=>({id: r.id})) })}`;
        const payload = { contents: [{ role: "user", parts: [{ text: `Analyze this prompt and provide JSON mapping:\n\n${importPromptStr}` }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json" } };
        const response = await fetchWithRetry(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
            const parsed = parseJSON(text);
            if (parsed && parsed.selected_options) {
                applyAnalyzedOptions(parsed);
                setImportPromptStr("");
                setToastMsg("✨ 프롬프트 역설계 매핑 완료!");
                setTimeout(() => setToastMsg(null), 4000);
            }
        }
    } catch (err) {
        console.error(err);
        setToastMsg("❌ 프롬프트 분석에 실패했습니다.");
        setTimeout(() => setToastMsg(null), 3000);
    } finally { setIsAnalyzingPrompt(false); }
  };

  const handleOptimizePrompt = async () => {
      if (!currentIR) return;
      if (!(await ensureCanGenerate())) return;
      setIsOptimizing(true);
      try {
          const apiKey = GEMINI_API_KEY;
          const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
          const targetPrompt = compiledOutputs[aiModel];
          const isVfxPass = currentIR.vfxPassMode === true;
          const currentIntentText = currentView === 'editor' ? userIntent : (currentView === 'edit' ? editIntent : motionIntent);
          let systemPrompt = `You are a world-class AI Prompt Engineer. Optimize the given base prompt. Maintain model syntax. Output JSON: { "en": "optimized prompt", "ko": "한국어 설명" }`;
          if (isVfxPass) systemPrompt += `\n\nThis is a VFX matte pass. Force the typography to remain pure Vantablack with NO 3D/lighting/reflections.`;
          const payload = { contents: [{ role: "user", parts: [{ text: `Model: ${aiModel}\nIntent: ${currentIntentText || "None"}\nBase:\n${targetPrompt}` }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { en: { type: "STRING" }, ko: { type: "STRING" } }, required: ["en", "ko"] } } };
          const result = await fetchWithRetry(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
              const parsed = parseJSON(text);
              if (parsed && parsed.en) {
                  setOptimizedPrompts(prev => ({ ...prev, [aiModel]: parsed.en }));
                  if (parsed.ko) setOptimizedPromptsKo(prev => ({ ...prev, [aiModel]: parsed.ko }));
                  setToastMsg(`✨ AI 최적화 완료!`);
                  setTimeout(() => setToastMsg(null), 4000);
              }
          }
      } catch (err) {
          console.error(err);
          setToastMsg("❌ 최적화 중 오류가 발생했습니다.");
          setTimeout(() => setToastMsg(null), 3000);
      } finally { setIsOptimizing(false); }
  };

  const handleExpandIntent = async () => {
      const currentIntentText = currentView === 'editor' ? userIntent : editIntent;
      if (!currentIntentText) {
          setToastMsg("⚠️ 확장할 키워드나 아이디어를 먼저 입력해주세요.");
          setTimeout(() => setToastMsg(null), 3000);
          return;
      }
      setIsExpandingIntent(true);
      try {
          const apiKey = GEMINI_API_KEY;
          const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
          const systemPrompt = currentView === 'editor'
              ? `Expand the keyword into a detailed visual description for typography. Korean, under 3 sentences.`
              : `Expand the keyword into a detailed Image-to-Image edit description. Korean, under 3 sentences.`;
          const payload = { contents: [{ role: "user", parts: [{ text: `Expand: "${currentIntentText}"` }] }], systemInstruction: { parts: [{ text: systemPrompt }] } };
          const result = await fetchWithRetry(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) currentView === 'editor' ? setUserIntent(text.trim()) : setEditIntent(text.trim());
      } catch (err) {
          setToastMsg("❌ 구체화 통신에 실패했습니다.");
          setTimeout(() => setToastMsg(null), 3000);
      } finally { setIsExpandingIntent(false); }
  };

  const openChatModal = () => {
      const currentIntentText = currentView === 'editor' ? userIntent : editIntent;
      setTempIntent(currentIntentText);
      setChatMessages([{ role: 'model', text: currentIntentText ? `현재 의도: "${currentIntentText}"\n어떤 부분을 더 추가하거나 수정하고 싶으신가요?` : "어떤 분위기나 느낌을 원하시는지 자유롭게 말씀해 주세요!" }]);
      setIsChatModalOpen(true);
  };

  const handleSendChatMessage = async () => {
      if (!chatInput.trim()) return;
      const newMessages = [...chatMessages, { role: 'user', text: chatInput }];
      setChatMessages(newMessages);
      setChatInput("");
      setIsChatting(true);
      try {
          const apiKey = GEMINI_API_KEY;
          const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
          const systemPrompt = `당신은 시네마틱 3D 아트 디렉터입니다. JSON으로 응답: { "message": "친절한 응답", "updated_intent": "수정된 한글 묘사" }`;
          const payload = { contents: newMessages.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] })), systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { message: { type: "STRING" }, updated_intent: { type: "STRING" } }, required: ["message", "updated_intent"] } } };
          const result = await fetchWithRetry(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
              const parsed = parseJSON(text);
              if (parsed && parsed.message && parsed.updated_intent) {
                  setChatMessages([...newMessages, { role: 'model', text: parsed.message }]);
                  setTempIntent(parsed.updated_intent);
              }
          }
      } catch (err) {
          console.error(err);
          setChatMessages([...newMessages, { role: 'model', text: "오류가 발생했습니다." }]);
      } finally { setIsChatting(false); }
  };

  const applyChatIntent = () => {
      currentView === 'editor' ? setUserIntent(tempIntent) : setEditIntent(tempIntent);
      setIsChatModalOpen(false);
  };

  useEffect(() => {
      const stateObj = {
          currentView,
          directorPersona, complexity, typographyScale, cameraLens, frontRelief, projectionDepth, surfaceTreatment, energyCore, material, materialInt, dramaticTex, wearLevel, rimMaterial, rimThickness, rimColor, rimIntensity, enableGlint, background, renderEngine, userIntent, imageRatio,
          fxOrigin, fxIntensity, surfaceDetail, vfxPassMode, enableVfx, enableShadow,
          editImage, editBudget, activeEditIntents, editBg, editRearExtrusion, editIntent,
          editVfxPassMode, editMaterial, editWearLevel, editRimColor, editRimIntensity, editEnergyCore, editFxOrigin, editFxIntensity,
          motionImage, cameraMotion, vfxDynamics, motionIntent
      };
      if (currentView === "editor") {
          const ir = generateIR(stateObj, appOptions);
          setCurrentIR(ir);
          setCompiledOutputs({ NanoBanana: compileNanoBanana(ir, stateObj), ChatGPT: compileChatGPT(ir, stateObj), Midjourney: compileMidjourney(ir, stateObj) });
      } else if (currentView === "edit") {
          const ir = generateEditIR(stateObj, appOptions);
          setCurrentIR(ir);
          setCompiledOutputs({
              NanoBanana: !editImage ? "Target 이미지를 업로드해주세요." : compileEditNanoBanana(ir, stateObj),
              ChatGPT: !editImage ? "Target 이미지를 업로드해주세요." : compileEditChatGPT(ir),
              Midjourney: !editImage ? "Target 이미지를 업로드해주세요." : compileEditMidjourney(ir, stateObj)
          });
      } else if (currentView === "motion") {
          const ir = generateMotionIR(stateObj, appOptions);
          setCurrentIR(ir);
          setCompiledOutputs({
              Veo: !motionImage ? "Target 이미지를 업로드해주세요." : compileVeo(ir),
              Runway: !motionImage ? "Target 이미지를 업로드해주세요." : compileRunway(ir),
              Luma: !motionImage ? "Target 이미지를 업로드해주세요." : compileLuma(ir),
              Sequence: !motionImage ? "Target 이미지를 업로드해주세요." : compileSequence(ir)
          });
      }
      setAuditIssues(performLogicAudit(stateObj, appOptions));
      setQualityScores(calculateQualityScore(stateObj));
  }, [directorPersona, complexity, typographyScale, cameraLens, frontRelief, projectionDepth, surfaceTreatment, energyCore, fxOrigin, fxIntensity, material, materialInt, dramaticTex, wearLevel, rimMaterial, rimThickness, rimColor, rimIntensity, enableGlint, background, renderEngine, userIntent, imageRatio, currentView, editImage, editBudget, activeEditIntents, editBg, editRearExtrusion, editIntent, surfaceDetail, vfxPassMode, enableVfx, enableShadow, editVfxPassMode, editMaterial, editWearLevel, editRimColor, editRimIntensity, editEnergyCore, editFxOrigin, editFxIntensity, motionImage, cameraMotion, vfxDynamics, motionIntent, appOptions]);

  const sendToMotion = () => {
    const text = optimizedPrompts[aiModel] || compiledOutputs[aiModel];
    if (!text) return;
    // 현재 선택된 재질/이펙트 프리셋을 style 메타로 함께 전달
    const styleParts = [];
    const findName = (data, id) => data?.find?.(o => o.id === id)?.name;
    const m = findName(appOptions.materials, material);            if (m) styleParts.push(`material:${m}`);
    const fr = findName(appOptions.frontReliefs, frontRelief);     if (fr) styleParts.push(`relief:${fr}`);
    const ec = findName(appOptions.energyCores, energyCore);       if (ec && energyCore !== 'None') styleParts.push(`fx:${ec}`);
    const bg = findName(appOptions.backgrounds, background);       if (bg) styleParts.push(`bg:${bg}`);
    navigate('motion-metrics', {
      source: 'render-metrics', target: 'motion-metrics',
      prompt: { text, tags: ['Render', material, energyCore].filter(Boolean), style: styleParts.join(' · ') },
      image: { url: '', metadata: {} },
      params: { fromModel: aiModel },
    });
  };

  const copyToClipboard = () => {
    const text = optimizedPrompts[aiModel] || compiledOutputs[aiModel];
    if (!text) return;
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try { document.execCommand('copy'); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); }
    catch (err) { console.error("클립보드 복사 실패", err); }
    document.body.removeChild(textArea);
  };

  const handleApplyPreset = (preset) => {
    if (!preset) return;
    if (preset.settings.directorPersona) setDirectorPersona(preset.settings.directorPersona);
    if (preset.settings.material) setMaterial(preset.settings.material);
    if (preset.settings.frontRelief) setFrontRelief(preset.settings.frontRelief);
    if (preset.settings.projectionDepth) setProjectionDepth(preset.settings.projectionDepth);
    if (preset.settings.cameraLens) setCameraLens(preset.settings.cameraLens);
    if (preset.settings.dramaticTex) setDramaticTex(preset.settings.dramaticTex);
    if (preset.settings.surfaceTreatment !== undefined) setSurfaceTreatment(preset.settings.surfaceTreatment);
    if (preset.settings.surfaceDetail) setSurfaceDetail(preset.settings.surfaceDetail);
    if (preset.settings.wearLevel) setWearLevel(preset.settings.wearLevel);
    if (preset.settings.energyCore) setEnergyCore(preset.settings.energyCore);
    if (preset.settings.fxOrigin) setFxOrigin(preset.settings.fxOrigin);
    if (preset.settings.fxIntensity) setFxIntensity(preset.settings.fxIntensity);
    if (preset.settings.background) setBackground(preset.settings.background);
    if (preset.settings.rimThickness !== undefined) setRimThickness(preset.settings.rimThickness);
    if (preset.settings.rimColor !== undefined) setRimColor(preset.settings.rimColor);
    if (preset.settings.rimIntensity !== undefined) setRimIntensity(preset.settings.rimIntensity);
    if (preset.settings.vfxPassMode !== undefined) setVfxPassMode(preset.settings.vfxPassMode);
    if (preset.settings.enableGlint !== undefined) setEnableGlint(preset.settings.enableGlint);
    if (preset.settings.enableVfx !== undefined) setEnableVfx(preset.settings.enableVfx);
    if (preset.settings.enableShadow !== undefined) setEnableShadow(preset.settings.enableShadow);
    setActivePresetId(preset.id);
    setIsPresetModified(false);
    setActiveTroubleshoots([]);
    setTroubleshootHistory({});
    setOptimizedPrompts({ NanoBanana: null, ChatGPT: null, Midjourney: null });
    setOptimizedPromptsKo({ NanoBanana: null, ChatGPT: null, Midjourney: null });
    setToastMsg(`✨ [${preset.label}] 스타일 적용됨`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const stateSetters = {
      directorPersona: setDirectorPersona, projectionDepth: setProjectionDepth, frontRelief: setFrontRelief,
      energyCore: setEnergyCore, fxOrigin: setFxOrigin, fxIntensity: setFxIntensity, background: setBackground,
      dramaticTex: setDramaticTex, material: setMaterial, surfaceDetail: setSurfaceDetail, wearLevel: setWearLevel,
      rimThickness: setRimThickness, rimColor: setRimColor, rimIntensity: setRimIntensity, enableGlint: setEnableGlint, surfaceTreatment: setSurfaceTreatment,
      editBudget: setEditBudget, editRearExtrusion: setEditRearExtrusion, activeEditIntents: setActiveEditIntents,
      editIntent: setEditIntent, vfxPassMode: setVfxPassMode, editVfxPassMode: setEditVfxPassMode, editEnergyCore: setEditEnergyCore,
      userIntent: setUserIntent, cameraMotion: setCameraMotion, vfxDynamics: setVfxDynamics, motionIntent: setMotionIntent,
      typographyScale: setTypographyScale, cameraLens: setCameraLens, enableVfx: setEnableVfx, enableShadow: setEnableShadow
  };

  const currentStateVals = {
      directorPersona, projectionDepth, frontRelief, energyCore, fxOrigin, fxIntensity, background, dramaticTex, material, surfaceDetail, wearLevel, rimThickness, rimColor, rimIntensity, enableGlint, surfaceTreatment, editBudget, editRearExtrusion, activeEditIntents, editIntent, vfxPassMode, editVfxPassMode, editEnergyCore, userIntent, cameraMotion, vfxDynamics, motionIntent, typographyScale, cameraLens, enableVfx, enableShadow
  };

  const applyAction = (opt, isTroubleshoot = false) => {
      setOptimizedPrompts({ NanoBanana: null, ChatGPT: null, Midjourney: null });
      setOptimizedPromptsKo({ NanoBanana: null, ChatGPT: null, Midjourney: null });
      if (isTroubleshoot && opt.id && activeTroubleshoots.includes(opt.id)) {
          const historyToRestore = troubleshootHistory[opt.id];
          if (historyToRestore) {
              Object.keys(historyToRestore).forEach(key => { if (stateSetters[key]) stateSetters[key](historyToRestore[key]); });
          }
          setActiveTroubleshoots(prev => prev.filter(id => id !== opt.id));
          if (opt.label) {
              const shortLabel = opt.label.split(' ').slice(1).join(' ');
              setToastMsg(`↩️ '${shortLabel}' 조치가 해제되었습니다`);
              setTimeout(() => setToastMsg(null), 3000);
          }
          return;
      }
      const action = opt.action;
      if (isTroubleshoot && opt.id) {
          const historyToSave = {};
          Object.keys(action).forEach(key => { if (currentStateVals[key] !== undefined) historyToSave[key] = currentStateVals[key]; });
          setTroubleshootHistory(prev => ({ ...prev, [opt.id]: historyToSave }));
          setActiveTroubleshoots(prev => [...prev, opt.id]);
      }
      Object.keys(action).forEach(key => { if (stateSetters[key]) stateSetters[key](action[key]); });
      if (activePresetId) setIsPresetModified(true);
      if (opt.label) {
          const shortLabel = opt.label.split(' ').slice(1).join(' ');
          setToastMsg(`✅ '${shortLabel}' 조치가 반영되었습니다`);
          setTimeout(() => setToastMsg(null), 3000);
      }
  };

  const handleEditFile = (file) => { if (file && file.type.startsWith('image/')) { const reader = new FileReader(); reader.onloadend = () => setEditImage(reader.result); reader.readAsDataURL(file); } };
  const handleRefFile = (file) => { if (file && file.type.startsWith('image/')) { const reader = new FileReader(); reader.onloadend = () => setReferenceImage(reader.result); reader.readAsDataURL(file); } };
  const handleClearRefImage = (e) => { e.stopPropagation(); e.preventDefault(); setReferenceImage(null); };
  const handleRefUpload = (e) => handleRefFile(e.target.files[0]);
  const handleRefDragOver = useCallback((e) => { e.preventDefault(); setIsDraggingRef(true); }, []);
  const handleRefDragLeave = useCallback((e) => { e.preventDefault(); setIsDraggingRef(false); }, []);
  const handleRefDrop = useCallback((e) => { e.preventDefault(); setIsDraggingRef(false); handleRefFile(e.dataTransfer.files[0]); }, []);

  const renderChatModal = () => {
      if (!isChatModalOpen) return null;
      return (
         <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="max-w-md w-full h-[600px] flex flex-col bg-[#121214] border border-zinc-800 rounded-[2rem] shadow-2xl relative overflow-hidden">
               <div className="p-5 border-b border-zinc-800/50 flex items-center justify-between bg-[#121214] shrink-0">
                   <h3 className="text-white text-[14px] font-bold flex items-center gap-2"><MessageSquare className="w-4 h-4 text-emerald-400" /> 튜닝 룸</h3>
                   <button onClick={() => setIsChatModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
               </div>
               <div className="px-5 py-4 bg-[#18181B] border-b border-zinc-800/50 shrink-0 max-h-[140px] overflow-y-auto custom-scrollbar">
                   <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Highlighter className="w-3 h-3" /> 적용 예정 묘사</p>
                   <p className="text-zinc-300 font-normal break-keep-all leading-relaxed text-[12px]">{tempIntent || "어떤 느낌을 원하시는지 말씀해주세요!"}</p>
               </div>
               <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-[#121214]">
                   {chatMessages.map((msg, idx) => (
                       <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                           <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-md ${msg.role === 'user' ? 'bg-zinc-800 text-white rounded-br-sm' : 'bg-[#1E1E22] text-zinc-300 rounded-bl-sm border border-zinc-800/50'}`}>
                               <span className="whitespace-pre-wrap font-normal">{msg.text}</span>
                           </div>
                       </div>
                   ))}
                   {isChatting && (
                       <div className="flex w-full justify-start">
                           <div className="bg-[#1E1E22] border border-white/5 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2 shadow-md">
                               <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                               <span className="text-[12px] text-zinc-400 font-normal">수정 중...</span>
                           </div>
                       </div>
                   )}
               </div>
               <div className="p-4 bg-[#121214] flex flex-col gap-3 shrink-0 border-t border-zinc-800/50">
                   <div className="flex gap-2 relative">
                       <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSendChatMessage(); }} placeholder="Type a message..." className="flex-1 bg-[#1A1A1E] border border-zinc-800 rounded-full pl-5 pr-14 py-3 text-[13px] text-white font-normal outline-none focus:border-emerald-500/50 transition-all placeholder:text-zinc-600" disabled={isChatting} />
                       <button onClick={handleSendChatMessage} disabled={!chatInput.trim() || isChatting} className="absolute right-1 top-1 bottom-1 w-10 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-full transition-colors">
                           <Play className="w-4 h-4 fill-current ml-0.5" />
                       </button>
                   </div>
                   <button onClick={applyChatIntent} disabled={isChatting} className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[12px] font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-2 border-none">
                       <Check className="w-4 h-4" /> 묘사 반영
                   </button>
               </div>
            </div>
         </div>
      );
  };

  return (
    <div className="flex flex-col h-screen bg-[#09090B] text-zinc-100 p-5 font-sans overflow-hidden">
      {usageModal}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(161, 161, 170, 0.2); border-radius: 4px; transition: background 0.2s; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(161, 161, 170, 0.5); }
      `}</style>

      {toastMsg && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 text-white px-6 py-3 rounded-full font-bold text-[12px] shadow-2xl z-[1000] flex items-center gap-2 animate-in slide-in-from-top-4 fade-in whitespace-nowrap border backdrop-blur-md transition-colors ${toastMsg.includes('해제') || toastMsg.includes('실패') ? 'bg-zinc-800/90 border-zinc-600 shadow-[0_10px_30px_rgba(0,0,0,0.5)] text-rose-400' : 'bg-emerald-500/90 border-emerald-400/50 shadow-[0_10px_30px_rgba(16,185,129,0.3)]'}`}>
            {toastMsg.includes('해제') || toastMsg.includes('실패') ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
            {toastMsg}
        </div>
      )}

      {renderChatModal()}

      <main className="flex-1 flex gap-5 h-full overflow-hidden">

        <aside className="w-[340px] bg-[#18181B] border border-zinc-800 rounded-2xl flex flex-col shrink-0 shadow-2xl overflow-y-auto custom-scrollbar relative z-10">
          <div className="p-6 border-b border-zinc-800">
            <h1 className="app-title text-2xl text-white tracking-wide flex items-baseline gap-1.5"><span className="font-light">Render</span> <span className="font-semibold">Metrics</span></h1>
            <span className="text-[10px] font-bold text-zinc-500">v19.34 - Dark Elf & Neon Presets</span>
          </div>

          <div className="p-6 space-y-6">

              <div className="flex bg-[#121214] p-1.5 rounded-xl border border-zinc-800/80 shadow-inner">
                <button onClick={() => { setCurrentView('editor'); setAiModel('NanoBanana'); setActiveTroubleshoots([]); setTroubleshootHistory({}); setOptimizedPrompts({ NanoBanana: null, ChatGPT: null, Midjourney: null }); setOptimizedPromptsKo({ NanoBanana: null, ChatGPT: null, Midjourney: null }); }} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[11px] font-bold transition-all ${currentView === 'editor' ? 'bg-[#27272A] text-white shadow-sm border border-zinc-700/50' : 'text-zinc-500 hover:text-zinc-300'}`}>
                  <PenTool className="w-3.5 h-3.5 shrink-0" /> Creation
                </button>
                <button onClick={() => { setCurrentView('edit'); setAiModel('NanoBanana'); setActiveTroubleshoots([]); setTroubleshootHistory({}); setOptimizedPrompts({ NanoBanana: null, ChatGPT: null, Midjourney: null }); setOptimizedPromptsKo({ NanoBanana: null, ChatGPT: null, Midjourney: null }); }} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[11px] font-bold transition-all ${currentView === 'edit' ? 'bg-[#27272A] text-white shadow-sm border border-zinc-700/50' : 'text-zinc-500 hover:text-zinc-300'}`}>
                  <Eraser className="w-3.5 h-3.5 shrink-0" /> Micro-Edit
                </button>
                <button onClick={() => { setCurrentView('motion'); setAiModel('Veo'); setActiveTroubleshoots([]); setTroubleshootHistory({}); setOptimizedPrompts({ NanoBanana: null, ChatGPT: null, Midjourney: null }); setOptimizedPromptsKo({ NanoBanana: null, ChatGPT: null, Midjourney: null }); }} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[11px] font-bold transition-all ${currentView === 'motion' ? 'bg-[#27272A] text-white shadow-sm border border-zinc-700/50' : 'text-zinc-500 hover:text-zinc-300'}`}>
                  <Video className="w-3.5 h-3.5 shrink-0" /> Motion
                </button>
              </div>

              {currentView === "editor" && (
                  <>
                      <div className="space-y-3 p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-xl relative">
                          <div className="flex items-center gap-2 text-emerald-400 mb-3">
                              <ScanLine className="w-4 h-4" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Reverse Engineering Tools</span>
                          </div>
                          {incomingFromArc && (
                              <div className="mb-3 px-3 py-2.5 rounded-lg border border-[#6C5CE7]/40 bg-[#6C5CE7]/10 flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                                  {isArcAnalyzing
                                    ? <Loader2 className="w-3.5 h-3.5 text-[#A29BFE] shrink-0 mt-0.5 animate-spin" />
                                    : <Sparkles className="w-3.5 h-3.5 text-[#A29BFE] shrink-0 mt-0.5" />}
                                  <div className="flex-1 min-w-0">
                                      <div className="text-[10px] font-bold text-[#A29BFE] tracking-wider uppercase">
                                          프롬프트 아크에서 분석된 추천 효과
                                      </div>
                                      <div className="text-[10px] text-zinc-400 mt-0.5 leading-snug">
                                          {incomingFromArc.status === 'starting' && '시작 중...'}
                                          {incomingFromArc.status === 'fetching' && '이미지 다운로드 중...'}
                                          {incomingFromArc.status === 'analyzing' && 'Gemini로 스타일 분석 중...'}
                                          {incomingFromArc.status === 'done' && (incomingFromArc.summary || '분석 완료. 아래 옵션 패널에 ★로 추천 항목이 강조 표시됩니다.')}
                                          {incomingFromArc.status === 'no-image' && '이미지 URL이 없어서 추천을 건너뜁니다.'}
                                          {incomingFromArc.status === 'fetch-failed' && '이미지 다운로드 실패 (CORS 또는 네트워크). 추천을 건너뜁니다.'}
                                          {incomingFromArc.status === 'analyze-failed' && `분석 실패: ${incomingFromArc.errorMessage || ''}`}
                                      </div>
                                      {incomingFromArc.tags?.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mt-1.5">
                                              {incomingFromArc.tags.slice(0, 6).map((t, i) => (
                                                  <span key={i} className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-bold text-zinc-300">#{t}</span>
                                              ))}
                                          </div>
                                      )}
                                  </div>
                                  <button onClick={() => { setIncomingFromArc(null); setArcRecommended(null); }} className="text-zinc-500 hover:text-zinc-300 shrink-0" title="배지 닫기">
                                      <X className="w-3.5 h-3.5" />
                                  </button>
                              </div>
                          )}
                          <div className="space-y-1">
                              <p className="text-[9px] text-zinc-500 font-bold px-1 mb-1">IMAGE ANALYZER (이미지 역분석)</p>
                              <div className="relative">
                                  <ImageDropzone image={referenceImage} onClear={handleClearRefImage} onUpload={handleRefUpload} onDragOver={handleRefDragOver} onDragLeave={handleRefDragLeave} onDrop={handleRefDrop} isDragging={isDraggingRef} isLoading={isAnalyzingRef} title="REFERENCE IMAGE" sub="역설계할 타이포그래피 시안 업로드" icon={ImageIcon} heightClass="h-24" />
                                  {referenceImage && !isAnalyzingRef && (
                                      <button onClick={handleAnalyzeReference} className="absolute bottom-2 right-2 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded shadow-md flex items-center gap-1.5 text-[9px] font-bold tracking-wider transition-colors z-20">
                                          <Sparkles className="w-3 h-3" /> 분석
                                      </button>
                                  )}
                              </div>
                          </div>
                          <div className="space-y-1 mt-4 pt-4 border-t border-emerald-500/20">
                              <p className="text-[9px] text-zinc-500 font-bold px-1 mb-1">PROMPT ANALYZER (프롬프트 텍스트 역분석)</p>
                              <div className="relative">
                                  <textarea value={importPromptStr} onChange={e => setImportPromptStr(e.target.value)} placeholder="기존에 생성했던 프롬프트나 타 AI 프롬프트를 붙여넣으세요..." className="w-full h-20 bg-black/40 border border-zinc-700/50 rounded-xl p-3 text-[10px] text-zinc-300 custom-scrollbar placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition-colors"/>
                                  {importPromptStr.trim() && !isAnalyzingPrompt && (
                                      <button onClick={handleAnalyzePrompt} className="absolute bottom-2 right-2 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded shadow-md flex items-center gap-1.5 text-[9px] font-bold tracking-wider transition-colors z-20">
                                          <TextCursorInput className="w-3 h-3" /> 매핑
                                      </button>
                                  )}
                                  {isAnalyzingPrompt && (
                                      <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center z-30">
                                          <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>

                      <div className="space-y-3 p-4 bg-purple-950/20 border border-purple-500/30 rounded-xl shadow-inner relative mt-4">
                          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-xl">
                              <div className="absolute top-0 right-0 p-2 opacity-10"><Users className="w-16 h-16" /></div>
                          </div>
                          <div className="flex items-center gap-2 text-purple-400 mb-2 relative z-10">
                              <Users className="w-4 h-4" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Director Persona</span>
                          </div>
                          <div className="relative z-10">
                              <DropdownControl data={DIRECTOR_PERSONAS.map(p => ({id: p.id, name: p.name}))} value={directorPersona} onChange={handleChange(setDirectorPersona)} disabled={vfxPassMode} />
                          </div>
                      </div>

                      <div>
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2 pl-1">Theme Presets (스타일 템플릿)</label>
                          <div className="flex gap-1 bg-[#121214] p-1 rounded-xl border border-zinc-800/80 mb-2 shadow-inner">
                              {PRESET_GROUPS.map(group => (
                                  <button key={group.id} onClick={() => setActivePresetGroup(group.id)} className={`flex-1 text-[10px] py-2 rounded-lg transition-colors font-bold flex items-center justify-center gap-1 ${activePresetGroup === group.id ? 'bg-[#27272A] text-white shadow-sm border border-zinc-700/50' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                      {group.icon} {group.name}
                                  </button>
                              ))}
                          </div>
                          <div className="flex flex-col gap-1.5 p-2 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                              {PRESET_GROUPS.find(g => g.id === activePresetGroup)?.presets.map(p => {
                                  const isSelected = activePresetId === p.id;
                                  return (
                                  <button key={p.id} onClick={() => handleApplyPreset(p)} className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all group flex flex-col gap-0.5 ${isSelected ? (isPresetModified ? 'bg-amber-950/20 border-amber-500/40 shadow-sm' : 'bg-emerald-950/20 border-emerald-500/40 shadow-sm') : 'bg-[#1A1A1E] hover:bg-zinc-800 border-zinc-800 hover:border-zinc-600 text-zinc-300'}`}>
                                      <div className="flex items-center justify-between w-full">
                                          <span className={`text-[11px] font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${isSelected ? (isPresetModified ? 'text-amber-400' : 'text-emerald-400') : 'text-white group-hover:text-emerald-400'}`}>
                                              {isSelected && !isPresetModified && <CheckCircle className="w-3.5 h-3.5" />}
                                              {p.label}
                                          </span>
                                          {isSelected && isPresetModified && (
                                              <span className="px-1.5 py-0.5 text-[8px] bg-amber-500/20 text-amber-400 rounded font-black border border-amber-500/30">수정됨</span>
                                          )}
                                      </div>
                                      <span className="text-[9px] text-zinc-500 truncate leading-snug w-full">{p.description || "해당 테마 렌더링 세팅 적용"}</span>
                                  </button>
                                  );
                              })}
                          </div>
                      </div>

                      <div className="space-y-1 pt-2">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Custom Directive (자유 묘사)</label>
                          <div className="w-full flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all overflow-hidden shadow-inner">
                              <textarea value={userIntent} onChange={e => handleChange(setUserIntent)(e.target.value)} placeholder="원하는 세부 디테일을 적어주세요" className="w-full h-16 bg-transparent p-3 text-[11px] outline-none resize-none text-zinc-300 custom-scrollbar placeholder:text-zinc-600" />
                              <div className="flex justify-end gap-1 p-1 bg-transparent border-t border-zinc-800">
                                  <button onClick={handleExpandIntent} disabled={isExpandingIntent || !userIntent} className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors disabled:opacity-50" title="문장 자동 구체화">
                                      {isExpandingIntent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                  </button>
                                  <button onClick={openChatModal} className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors" title="대화형 튜닝룸 열기">
                                      <MessageSquare className="w-3.5 h-3.5" />
                                  </button>
                              </div>
                          </div>
                      </div>

                      <div className={`space-y-3 p-4 bg-indigo-950/20 border border-indigo-500/20 rounded-xl transition-opacity ${vfxPassMode ? 'opacity-30 pointer-events-none' : ''}`}>
                          <div className="flex items-center gap-2 text-indigo-400 mb-2">
                              <Box className="w-4 h-4" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Morphology (조형 제어)</span>
                          </div>
                          <DropdownControl label="Scale (글씨 구조)" data={appOptions.typographyScales} value={typographyScale} onChange={handleChange(setTypographyScale)} />
                          <DropdownControl label="Camera Lens (원근감)" data={appOptions.cameraLenses} value={cameraLens} onChange={handleChange(setCameraLens)} />
                          <DropdownControl label="Front Relief (정면 부조/음양각)" data={appOptions.frontReliefs} value={frontRelief} onChange={handleChange(setFrontRelief)} recommendedId={arcRecommended?.frontRelief} />
                          <DropdownControl label="Projection Depth (후면 돌출/원근)" data={appOptions.projectionDepths} value={projectionDepth} onChange={handleChange(setProjectionDepth)} />
                      </div>

                      <div className={`space-y-3 transition-opacity ${vfxPassMode ? 'opacity-30 pointer-events-none' : ''}`}>
                          <DropdownControl label="Base Material (베이스 재질)" data={appOptions.materials} value={material} onChange={handleChange(setMaterial)} recommendedId={arcRecommended?.material} />
                          <DropdownControl label="Surface Detail (미세 질감 밀도)" icon={<ScanLine className="w-4 h-4" />} data={appOptions.surfaceDetails} value={surfaceDetail} onChange={handleChange(setSurfaceDetail)} recommendedId={arcRecommended?.surfaceDetail} />
                          <DropdownControl label="Internal Texture (내부 질감)" data={appOptions.dramaticTextures} value={dramaticTex} onChange={handleChange(setDramaticTex)} />
                          <DropdownControl label="Surface Wear (마모도)" data={appOptions.wearLevels} value={wearLevel} onChange={handleChange(setWearLevel)} />
                      </div>

                      <div className={`space-y-3 p-4 bg-amber-950/20 border border-amber-500/20 rounded-xl mt-4 transition-opacity ${vfxPassMode ? 'opacity-30 pointer-events-none' : ''}`}>
                          <div className="flex items-center gap-2 text-amber-400 mb-2">
                              <Sun className="w-4 h-4" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Edge & Lighting</span>
                          </div>
                          <DropdownControl label="Outline Thickness" data={appOptions.rimThicknesses} value={rimThickness} onChange={handleChange(setRimThickness)} />
                          <div className="flex gap-2">
                              <DropdownControl label="Rim Light Intensity" data={appOptions.rimIntensities} value={rimIntensity} onChange={handleChange(setRimIntensity)} />
                              <DropdownControl label="Rim Light Color" data={appOptions.rimColors} value={rimColor} onChange={handleChange(setRimColor)} />
                          </div>
                          <ToggleControl label="Specular Glint (반사광 강조)" desc="강렬한 스펙큘러 하이라이트 활성화" enabled={enableGlint} onChange={() => handleChange(setEnableGlint)(!enableGlint)} />
                      </div>

                      <div className="space-y-3 mt-4">
                          <ToggleControl label="시안 연출 모드 (이펙트 & 배경)" desc="질감 있는 다크 캔버스를 깔고 특수 효과를 발동시킵니다." enabled={enableVfx} onChange={() => { const newVal = !enableVfx; handleChange(setEnableVfx)(newVal); if (newVal && energyCore === "None") handleChange(setEnergyCore)("GoldenDust"); }} />
                          {enableVfx && (
                              <div className="pl-4 border-l-2 border-zinc-800/80 space-y-3 animate-in fade-in slide-in-from-top-2 pt-1">
                                  <DropdownControl label="VFX Core (효과 종류)" data={appOptions.energyCores} value={editEnergyCore} onChange={handleChange(setEditEnergyCore)} />
                                  <DropdownControl label="Origin (발생 위치)" data={appOptions.fxOrigins} value={editFxOrigin} onChange={handleChange(setEditFxOrigin)} />
                                  <DropdownControl label="Intensity (강도)" data={appOptions.fxIntensities} value={editFxIntensity} onChange={handleChange(setEditFxIntensity)} />
                              </div>
                          )}
                          <ToggleControl label="바닥 그림자 (Drop Shadow)" desc="배경에 글자의 그림자를 드리워 묵직한 입체감을 더합니다." enabled={enableShadow} onChange={() => handleChange(setEnableShadow)(!enableShadow)} />
                          <ToggleControl label="VFX 소스 분리 렌더링 모드" desc="타이포를 블랙아웃시키고 주변 이펙트만 남겨 매트 패스를 추출합니다." enabled={vfxPassMode} onChange={() => handleChange(setVfxPassMode)(!vfxPassMode)} />
                          <DropdownControl label="Background (기본 배경)" data={appOptions.backgrounds} value={background} onChange={handleChange(setBackground)} disabled={enableVfx} recommendedId={arcRecommended?.background} />
                          <DropdownControl label="Render Engine" data={RENDER_ENGINES} value={renderEngine} onChange={handleChange(setRenderEngine)} />
                      </div>
                  </>
              )}

              {currentView === "edit" && (
                  <>
                      <div className="space-y-3">
                          <div onClick={() => handleChange(setEditVfxPassMode)(!editVfxPassMode)} className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all shadow-md group ${editVfxPassMode ? 'bg-blue-600/20 border-blue-500/50' : 'bg-black/30 border-zinc-700/50 hover:bg-black/50 hover:border-zinc-500'}`}>
                              <div className={`p-1.5 rounded-lg ${editVfxPassMode ? 'bg-blue-600' : 'bg-zinc-800'}`}>
                                  <Flame className={`w-4 h-4 ${editVfxPassMode ? 'text-white' : 'text-zinc-400'}`} />
                              </div>
                              <div className="flex flex-col">
                                  <span className={`text-[11px] font-bold ${editVfxPassMode ? 'text-blue-400' : 'text-zinc-300'}`}>VFX 소스 분리 매트 패스</span>
                                  <span className="text-[9px] text-zinc-500">타이포를 블랙아웃하고 이펙트만 추출</span>
                              </div>
                              <div className={`ml-auto w-3 h-3 rounded-full border ${editVfxPassMode ? 'border-blue-400 bg-blue-600' : 'border-zinc-600 bg-transparent'}`} />
                          </div>
                          <div className="flex items-center gap-2 text-zinc-400 mb-2 mt-4">
                              <Target className="w-4 h-4 shrink-0" />
                              <h3 className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Target Image</h3>
                          </div>
                          <ImageDropzone image={editImage} onClear={(e) => { e.stopPropagation(); e.preventDefault(); setEditImage(null); }} onUpload={(e) => handleEditFile(e.target.files[0])} onDragOver={(e) => { e.preventDefault(); setIsDraggingEdit(true); }} onDragLeave={(e) => { e.preventDefault(); setIsDraggingEdit(false); }} onDrop={(e) => { e.preventDefault(); setIsDraggingEdit(false); handleEditFile(e.dataTransfer.files[0]); }} isDragging={isDraggingEdit} title="TARGET UPLOAD" sub="리믹스할 원본 이미지" icon={ImagePlus} heightClass="h-40" />
                      </div>
                      <div className="space-y-1 pt-4 border-t border-zinc-800/80">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Custom Directive (자유 묘사)</label>
                          <div className="w-full flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all overflow-hidden shadow-inner">
                              <textarea value={editIntent} onChange={e => handleChange(setEditIntent)(e.target.value)} placeholder="원하는 분위기를 자유롭게 입력..." className="w-full h-16 bg-transparent p-3 text-[11px] outline-none resize-none text-zinc-300 custom-scrollbar placeholder:text-zinc-600" />
                              <div className="flex justify-end gap-1 p-1 bg-transparent border-t border-zinc-800">
                                  <button onClick={handleExpandIntent} disabled={isExpandingIntent || !editIntent} className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors disabled:opacity-50">
                                      {isExpandingIntent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                  </button>
                                  <button onClick={openChatModal} className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors">
                                      <MessageSquare className="w-3.5 h-3.5" />
                                  </button>
                              </div>
                          </div>
                      </div>
                      <div className="pt-4 border-t border-zinc-800/80 space-y-3">
                          <DropdownControl label="Edit Budget (변형 허용 예산)" data={EDIT_BUDGETS} value={editBudget} onChange={handleChange(setEditBudget)} disabled={editVfxPassMode} />
                      </div>
                      <div className="pt-4 border-t border-zinc-800/80 space-y-3">
                          <div className="flex items-center gap-2 text-zinc-400 mb-2">
                              <Layers className="w-4 h-4 shrink-0" />
                              <h3 className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Edit Scope (레이어)</h3>
                          </div>
                          <div className="flex flex-col gap-2">
                              <div className={`rounded-xl border transition-all ${activeEditIntents.material ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'} ${editVfxPassMode ? 'opacity-30 pointer-events-none' : ''}`}>
                                  <div onClick={() => handleChange(setActiveEditIntents)(p => ({...p, material: !p.material}))} className="p-3 cursor-pointer flex items-center justify-between group">
                                      <div className="flex items-center gap-3">
                                          <Palette className={`w-4 h-4 ${activeEditIntents.material ? 'text-indigo-400' : 'text-zinc-500'}`} />
                                          <div className="flex flex-col">
                                              <span className={`text-[11px] font-bold ${activeEditIntents.material ? 'text-white' : 'text-zinc-300'}`}>재질 덮어쓰기</span>
                                              <span className="text-[9px] text-zinc-500">형태 고정, 내부 재질/색상 교체</span>
                                          </div>
                                      </div>
                                      <div className={`w-3 h-3 rounded-full border ${activeEditIntents.material ? 'border-indigo-400 bg-indigo-400' : 'border-zinc-600 bg-transparent'}`} />
                                  </div>
                                  {activeEditIntents.material && (
                                      <div className="p-3 bg-black/20 border-t border-indigo-500/20 space-y-3">
                                          <DropdownControl label="Target Material" data={appOptions.materials} value={editMaterial} onChange={handleChange(setEditMaterial)} />
                                          <DropdownControl label="Surface Wear" data={appOptions.wearLevels} value={editWearLevel} onChange={handleChange(setEditWearLevel)} />
                                      </div>
                                  )}
                              </div>
                              <div className={`rounded-xl border transition-all ${activeEditIntents.lighting ? 'bg-amber-500/10 border-amber-500/50' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'} ${editVfxPassMode ? 'opacity-30 pointer-events-none' : ''}`}>
                                  <div onClick={() => handleChange(setActiveEditIntents)(p => ({...p, lighting: !p.lighting}))} className="p-3 cursor-pointer flex items-center justify-between group">
                                      <div className="flex items-center gap-3">
                                          <Sun className={`w-4 h-4 ${activeEditIntents.lighting ? 'text-amber-400' : 'text-zinc-500'}`} />
                                          <div className="flex flex-col">
                                              <span className={`text-[11px] font-bold ${activeEditIntents.lighting ? 'text-white' : 'text-zinc-300'}`}>엣지 / 림라이트</span>
                                              <span className="text-[9px] text-zinc-500">외곽선 빛의 방향/분위기 추가</span>
                                          </div>
                                      </div>
                                      <div className={`w-3 h-3 rounded-full border ${activeEditIntents.lighting ? 'border-amber-400 bg-amber-400' : 'border-zinc-600 bg-transparent'}`} />
                                  </div>
                                  {activeEditIntents.lighting && (
                                      <div className="p-3 bg-black/20 border-t border-amber-500/20 space-y-3">
                                          <div className="flex gap-2">
                                              <DropdownControl label="Rim Light Intensity" data={appOptions.rimIntensities} value={editRimIntensity} onChange={handleChange(setEditRimIntensity)} />
                                              <DropdownControl label="Rim Light Color" data={appOptions.rimColors} value={editRimColor} onChange={handleChange(setEditRimColor)} />
                                          </div>
                                      </div>
                                  )}
                              </div>
                              <div className={`rounded-xl border transition-all ${activeEditIntents.vfx || editVfxPassMode ? 'bg-rose-500/10 border-rose-500/50' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'}`}>
                                  <div onClick={() => !editVfxPassMode && handleChange(setActiveEditIntents)(p => ({...p, vfx: !p.vfx}))} className="p-3 cursor-pointer flex items-center justify-between group">
                                      <div className="flex items-center gap-3">
                                          <Flame className={`w-4 h-4 ${activeEditIntents.vfx || editVfxPassMode ? 'text-rose-400' : 'text-zinc-500'}`} />
                                          <div className="flex flex-col">
                                              <span className={`text-[11px] font-bold ${activeEditIntents.vfx || editVfxPassMode ? 'text-white' : 'text-zinc-300'}`}>주변 VFX (이펙트)</span>
                                              <span className="text-[9px] text-zinc-500">표면에 밀착된 입자/에너지 추가</span>
                                          </div>
                                      </div>
                                      <div className={`w-3 h-3 rounded-full border ${activeEditIntents.vfx || editVfxPassMode ? 'border-rose-400 bg-rose-400' : 'border-zinc-600 bg-transparent'}`} />
                                  </div>
                                  {(activeEditIntents.vfx || editVfxPassMode) && (
                                      <div className="p-3 bg-black/20 border-t border-rose-500/20 space-y-3">
                                          <DropdownControl label="VFX Core (효과 종류)" data={appOptions.energyCores} value={editEnergyCore} onChange={handleChange(setEditEnergyCore)} />
                                          <DropdownControl label="Origin (발생 위치)" data={appOptions.fxOrigins} value={editFxOrigin} onChange={handleChange(setEditFxOrigin)} />
                                          <DropdownControl label="Intensity (강도)" data={appOptions.fxIntensities} value={editFxIntensity} onChange={handleChange(setEditFxIntensity)} />
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>
                      <div className="pt-4 border-t border-zinc-800/80 space-y-3">
                          <DropdownControl label="Background Constraint" data={appOptions.backgrounds} value={editBg} onChange={handleChange(setEditBg)} />
                          <DropdownControl label="Depth Constraint" data={appOptions.projectionDepths} value={editRearExtrusion} onChange={handleChange(setEditRearExtrusion)} disabled={editVfxPassMode} />
                      </div>
                  </>
              )}

              {currentView === "motion" && (
                  <>
                      <div className="space-y-3">
                          <div className="flex items-center gap-2 text-zinc-400 mb-2 mt-2">
                              <Target className="w-4 h-4 shrink-0" />
                              <h3 className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Source Image</h3>
                          </div>
                          <ImageDropzone image={motionImage} onClear={(e) => { e.stopPropagation(); e.preventDefault(); setMotionImage(null); }} onUpload={(e) => { if(e.target.files[0]){ const r = new FileReader(); r.onload=()=>setMotionImage(r.result); r.readAsDataURL(e.target.files[0]); } }} onDragOver={(e) => { e.preventDefault(); setIsDraggingMotion(true); }} onDragLeave={(e) => { e.preventDefault(); setIsDraggingMotion(false); }} onDrop={(e) => { e.preventDefault(); setIsDraggingMotion(false); if(e.dataTransfer.files[0]){ const r = new FileReader(); r.onload=()=>setMotionImage(r.result); r.readAsDataURL(e.dataTransfer.files[0]); } }} isDragging={isDraggingMotion} title="STATIC IMAGE UPLOAD" sub="애니메이션을 부여할 원본 이미지" icon={ImagePlus} heightClass="h-40" />
                      </div>
                      <div className="pt-4 border-t border-zinc-800/80 space-y-3">
                          <DropdownControl label="Camera Motion (카메라 무빙)" data={appOptions.cameraMotions} value={cameraMotion} onChange={handleChange(setCameraMotion)} />
                          <DropdownControl label="VFX Dynamics (이펙트 움직임)" data={appOptions.motionDynamics} value={vfxDynamics} onChange={handleChange(setVfxDynamics)} />
                          <DropdownControl label="Target Energy (이펙트 소스)" data={appOptions.energyCores} value={energyCore} onChange={handleChange(setEnergyCore)} recommendedId={arcRecommended?.energyCore} />
                      </div>
                      <div className="space-y-1 pt-4 border-t border-zinc-800/80">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Motion Directive (애니메이션 묘사)</label>
                          <div className="w-full flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all overflow-hidden shadow-inner">
                              <textarea value={motionIntent} onChange={e => handleChange(setMotionIntent)(e.target.value)} placeholder="예: 불꽃이 천천히 타오르며 위로 흩날림" className="w-full h-16 bg-transparent p-3 text-[11px] outline-none resize-none text-zinc-300 custom-scrollbar placeholder:text-zinc-600" />
                          </div>
                      </div>
                  </>
              )}

          </div>
        </aside>

        <div className="flex-1 flex flex-col gap-5 overflow-hidden">
            <div className="grid grid-cols-3 gap-5 h-[280px] shrink-0">
                <div className="bg-[#18181B] border border-zinc-800 rounded-2xl p-5 flex flex-col overflow-y-auto custom-scrollbar relative">
                    <div className="flex items-center gap-2 mb-4 text-emerald-400 shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                        <h2 className="text-[11px] font-black uppercase tracking-widest">Logic Audit</h2>
                    </div>
                    {auditIssues.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-[11px] font-bold bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-6 text-center leading-relaxed">
                            <CheckCircle className="w-6 h-6 text-emerald-500/20 mb-2" />
                            충돌 없음.<br/>현재 룰에 완벽히 부합합니다.
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {auditIssues.map((issue, idx) => (
                                <div key={idx} className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-xl animate-in slide-in-from-top-2">
                                    <h3 className="text-[11px] font-bold text-amber-400 mb-1 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> {issue.title}</h3>
                                    <p className="text-[10px] text-zinc-300 mb-3 leading-relaxed">{issue.desc}</p>
                                    <div className="flex gap-2">
                                        {issue.options.map((opt, oIdx) => (
                                            <button key={oIdx} onClick={() => applyAction(opt)} className="flex-1 px-3 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-white text-[10px] font-bold rounded-lg transition-colors border border-zinc-700 text-left">
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-[#18181B] border border-zinc-800 rounded-2xl p-5 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center gap-2 mb-4 text-indigo-400 shrink-0">
                        <ActivitySquare className="w-4 h-4" />
                        <h2 className="text-[11px] font-black uppercase tracking-widest">Quality Score</h2>
                    </div>
                    <div className="flex-1 flex flex-col justify-center gap-3 bg-black/20 p-4 rounded-xl border border-zinc-800/50">
                        <ScoreBar label="형태 보존 (Structure)" score={qualityScores.structure} colorClass="bg-blue-500" />
                        <ScoreBar label="재질 통합 (Material)" score={qualityScores.material} colorClass="bg-purple-500" />
                        <ScoreBar label="판독/가시성 (Visibility)" score={qualityScores.visibility} colorClass="bg-emerald-500" />
                        <ScoreBar label="이펙트 절제 (FX Control)" score={qualityScores.fxControl} colorClass="bg-amber-500" />
                    </div>
                    <div className="mt-3 flex items-start gap-2 bg-indigo-950/20 border border-indigo-500/20 p-3 rounded-lg">
                        <ChevronRight className="w-3 h-3 text-indigo-400 mt-0.5 shrink-0" />
                        <p className="text-[10px] text-indigo-200 leading-snug font-medium">
                            {getQualityFeedback(qualityScores)}
                        </p>
                    </div>
                </div>

                <div className="bg-[#1E1B24] border border-emerald-900/30 rounded-2xl p-5 flex flex-col shrink-0 shadow-[inset_0_0_40px_rgba(16,185,129,0.03)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none"><Sliders className="w-20 h-20 text-emerald-500" /></div>
                    <div className="flex items-center gap-2 mb-4 text-emerald-400 shrink-0 relative z-10">
                        <Sliders className="w-4 h-4" />
                        <h2 className="text-[11px] font-black uppercase tracking-widest">Quick Adjustments</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 relative z-10 pr-1">
                        {(currentView === 'editor' ? QUICK_ADJUSTMENTS : EDIT_BUDGETS).map((opt, i) => {
                            if(!opt.action) return null;
                            const isActive = activeTroubleshoots.includes(opt.id);
                            return (
                                <button key={i} onClick={() => applyAction(opt, true)} className={`w-full text-left p-3 rounded-xl transition-all group flex gap-3 items-start ${isActive ? 'bg-emerald-900/30 border border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-black/40 hover:bg-emerald-900/20 border border-emerald-500/10 hover:border-emerald-500/30'}`}>
                                    <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${isActive ? 'bg-emerald-500 border-emerald-400 text-white' : 'border-zinc-700 bg-transparent'}`}>
                                        {isActive && <Check className="w-3 h-3" />}
                                    </div>
                                    <div className="flex flex-col">
                                        <div className={`text-[11px] font-bold mb-1 leading-snug transition-colors ${isActive ? 'text-emerald-300' : 'text-zinc-300 group-hover:text-emerald-300'}`}>
                                            {opt.label}
                                        </div>
                                        <div className="text-[9px] text-zinc-500 leading-snug">{opt.desc}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="bg-[#18181B] border border-zinc-800 rounded-2xl flex-1 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800 bg-[#121214]">
                    <div className="flex gap-2">
                        {(currentView === 'motion' ? VIDEO_AI_MODELS : AI_MODELS).map(model => (
                            <button key={model.id} onClick={() => setAiModel(model.id)} className={`px-4 py-2 text-[11px] font-bold rounded-lg transition-colors ${aiModel === model.id ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                {model.name}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleOptimizePrompt} disabled={isOptimizing || !currentIR} className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-[11px] transition-all active:scale-95 shadow-md whitespace-nowrap bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50">
                            {isOptimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Stars className="w-3.5 h-3.5" />}
                            AI 최적화
                        </button>
                        <button onClick={copyToClipboard} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-[11px] transition-all active:scale-95 shadow-md whitespace-nowrap ${isCopied ? 'bg-emerald-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
                            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {isCopied ? 'Copied!' : 'Copy'}
                        </button>
                        <button onClick={sendToMotion} disabled={!(optimizedPrompts[aiModel] || compiledOutputs[aiModel])} title="모션 메트릭스로 보내서 애니메이션 추천 받기" className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-[11px] transition-all active:scale-95 shadow-md whitespace-nowrap bg-amber-500 hover:bg-amber-400 text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed">
                            <Video className="w-3.5 h-3.5" /> Motion으로 →
                        </button>
                    </div>
                </div>
                <div className="p-6 flex-1 flex gap-5 overflow-hidden">
                    <div className="flex-1 h-full overflow-y-auto custom-scrollbar">
                        <div className={`font-mono text-[13px] whitespace-pre-wrap leading-[1.8] p-6 rounded-xl border min-h-full relative group transition-colors ${(currentView === "editor" ? vfxPassMode : editVfxPassMode) ? 'bg-orange-950/20 border-orange-500/30 text-orange-200' : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-200'}`}>
                            {optimizedPrompts[aiModel] && (
                                <div className="absolute top-0 right-0 bg-emerald-500/10 text-emerald-400 text-[9px] px-3 py-1.5 rounded-bl-xl font-bold uppercase tracking-widest flex items-center gap-1 shadow-sm border-b border-l border-emerald-500/20">
                                    <Stars className="w-3 h-3" /> OPTIMIZED
                                </div>
                            )}
                            <div className="absolute top-4 right-4 bg-zinc-800/80 text-zinc-400 text-[9px] px-2 py-1 rounded border border-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity">
                                {aiModel} {optimizedPrompts[aiModel] ? "Optimized" : "Engine"}
                            </div>
                            {optimizedPromptsKo[aiModel] && (
                                <div className="mb-5 p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-emerald-200 text-[12px] leading-relaxed font-sans shadow-inner">
                                    <span className="font-bold flex items-center gap-1.5 mb-2 text-emerald-400 tracking-wider">
                                        <Sparkles className="w-3.5 h-3.5" /> AI 최적화 의도 분석 리포트
                                    </span>
                                    {optimizedPromptsKo[aiModel]}
                                </div>
                            )}
                            {optimizedPrompts[aiModel] || compiledOutputs[aiModel]}
                        </div>
                    </div>
                </div>
            </div>
        </div>

      </main>
    </div>
  );
};

export default App;
