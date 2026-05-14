import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Zap, Shield, Smile, Cpu, Droplets, Sun, Moon, Sparkles,
  ChevronDown, Copy, Sparkle, FileText, MousePointer2,
  Layers, Gem, Mountain, RefreshCw, Loader2,
  Image as ImageIcon, BoxSelect, Target, ScanLine, Frame,
  MousePointerClick, Waves, Boxes, Wand2, Highlighter, Palette,
  CheckCircle2, UploadCloud, Wand, Scissors, Flame, SunMedium,
  Diamond, Hammer, Settings, Activity, ZapIcon, Wind, Layers2,
  Sparkle as SparkleIcon, Stars, Languages, Play, MonitorCheck, CpuIcon,
  Check, Info, Download, Terminal, Maximize,
  MessageSquare, Eraser, MoveDiagonal, Eye, ImagePlus, Box, Code2,
  FlameKindling, CloudFog, SunSnow, Gamepad2, Ghost, X, AlertCircle, Grid, Filter,
  Heart, Share2 as ShareIcon, FileUp, RefreshCcw, Upload, Save, Clapperboard, Layers3,
  ListFilter, PenTool, Trash2, BookOpen, MousePointerClickIcon, LayoutGrid, Maximize2, SplitSquareHorizontal, Edit2,
  UserCog, SlidersHorizontal, Image as ImageRef, Megaphone,
  LayoutTemplate, CheckSquare, Stamp, Shapes, PaintBucket, Sparkles as SparkleFX, Columns
} from 'lucide-react';
import { GEMINI_API_KEY } from '../../lib/gemini';

const AI_MODELS = [
  { id: 'NanoBanana', name: 'NanoBanana' },
  { id: 'ChatGPT', name: 'ChatGPT' },
  { id: 'Midjourney', name: 'Midjourney' },
];

const assetStyleModifiers = {
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

const staticOptions = {
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

const getOptionEn = (list, id) => (list || []).find(o => o.id === id)?.en || String(id);
const getOptionProp = (list, id, prop) => (list || []).find(o => o.id === id)?.[prop] || null;
const getOptionName = (list, id, dynamicNames = {}) => {
    const found = (list || []).find(o => o.id === id);
    if (found) return found.name;
    return dynamicNames[id] ? `✨ ${dynamicNames[id]}` : `✨ ${String(id)}`;
};

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

const ToggleControl = ({ label, enabled, onChange, theme, disabled = false }) => (
  <div onClick={() => !disabled && onChange()} className={`w-full flex items-center justify-between px-4 py-3 rounded-sm border transition-all ${disabled ? 'opacity-30 cursor-not-allowed grayscale' : 'cursor-pointer'} ${theme === 'dark' ? 'bg-[#18181B] border-zinc-800 hover:border-[#76cee0]/50' : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'}`}>
    <span className={`text-[11px] font-bold transition-colors ${enabled ? (theme === 'dark' ? 'text-[#76cee0]' : 'text-[#76cee0]') : 'text-zinc-500'}`}>{label}</span>
    <div className={`w-8 h-4 rounded-full relative transition-colors ${enabled ? 'bg-[#76cee0]' : 'bg-zinc-700'}`}>
        <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all`} style={{ left: enabled ? 'calc(100% - 14px)' : '2px' }} />
    </div>
  </div>
);

const DropdownControl = ({ label, icon, data = [], value, onChange, theme, disabled = false, dynamicNames = {} }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const toggleDropdown = () => !disabled && setIsOpen(!isOpen);

  useEffect(() => {
    const handleClick = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const combinedData = useMemo(() => {
      const safeData = data || [];
      if (!value) return safeData;
      const exists = safeData.find(o => o.id === value);
      if (exists) return safeData;
      const displayName = dynamicNames[value] ? dynamicNames[value] : value;
      return [{ id: value, name: `✨ ${displayName}`, en: value }, ...safeData];
  }, [data, value, dynamicNames]);

  const selectedOption = combinedData.find(o => o.id === value) || combinedData[0] || { name: 'Select' };

  return (
    <div className={`w-full space-y-1.5 relative transition-all ${disabled ? 'opacity-30 grayscale pointer-events-none' : ''}`} ref={containerRef}>
      {label && <p className="text-[10px] font-bold uppercase tracking-widest pl-1 flex items-center gap-1.5 text-zinc-500">{icon} {label}</p>}
      <button onClick={toggleDropdown} className={`w-full flex items-center justify-between px-4 py-3 rounded-md border transition-all ${theme === 'dark' ? 'bg-[#111111] border-zinc-800 hover:border-[#76cee0]/50 text-zinc-200 shadow-inner' : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'}`}>
        <div className="flex items-center gap-2 overflow-hidden">
            {selectedOption.hex && <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: selectedOption.hex, border: selectedOption.id === 'White' ? '1px solid #444' : 'none' }} />}
            <span className="text-[11px] truncate font-bold">{selectedOption.name}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-600 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="nx-popover-panel absolute left-0 right-0 mt-2 z-[999]">
          <div className="max-h-[220px] overflow-y-auto custom-scrollbar py-1">
            {combinedData.map(opt => (
              <button key={opt.id} onClick={() => { onChange(opt.id); setIsOpen(false); }} className={`nx-popover-item ${value === opt.id ? 'is-active' : ''}`}>
                <span className="flex items-center gap-2">
                    {opt.hex && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.hex }} />}
                    <span>{opt.name}</span>
                </span>
                {value === opt.id && <Sparkle className="w-3.5 h-3.5 animate-pulse" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const PopoverSelect = ({ label, icon, value, options = [], onChange, highlight }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedOption = options.find(o => o.id === value) || options[0] || {};
  let borderClass = "border-zinc-800";
  let bgClass = "bg-[#111111]";
  let textClass = "text-zinc-200";
  let labelClass = "text-[#65a3b3]";
  let iconClass = "text-[#65a3b3]";
  if (highlight === 'step') {
      borderClass = "border-zinc-800 hover:border-[#76cee0]/60";
      bgClass = "bg-[#111315]";
      textClass = "text-zinc-100";
  }

  return (
    <div className="w-full space-y-2 relative" ref={containerRef}>
      <div className={`flex items-center gap-2 mb-1 ${labelClass}`}>
        <span className={iconClass}>{icon}</span>
        <h3 className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1">{label}</h3>
      </div>
      <button onClick={() => setIsOpen(!isOpen)} className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all shadow-inner ${bgClass} ${borderClass} ${textClass}`}>
        <div className="flex flex-col items-start text-left gap-0.5">
          <span className="text-[12px] font-bold">{selectedOption.name || selectedOption.label || ''}</span>
          {selectedOption.en && <span className="text-[9px] text-zinc-500 font-normal uppercase tracking-wider line-clamp-1">{selectedOption.en}</span>}
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="nx-popover-panel absolute left-0 right-0 mt-2 z-[999]">
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar py-1">
            {options.map(opt => (
              <button key={opt.id} onClick={() => { onChange(opt.id); setIsOpen(false); }} className={`nx-popover-item ${value === opt.id ? 'is-active' : ''}`}>
                <span className="flex flex-col gap-0.5 pr-4 text-left">
                  <span className={`text-[12px] font-bold`}>{opt.name || opt.label}</span>
                  {opt.en && <span className="text-[9px] opacity-60 leading-tight font-normal">{opt.en}</span>}
                </span>
                {value === opt.id && <SparkleIcon className="w-4 h-4 animate-pulse shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const App = () => {
  const [theme] = useState("dark");
  const [currentView, setCurrentView] = useState("creation");

  const [themeDna, setThemeDna] = useState("LineageDarkRoyal");
  const [assetType, setAssetType] = useState("Button");
  const [outputFormat, setOutputFormat] = useState("Isolated");
  const [layoutArchetype, setLayoutArchetype] = useState("SingleFocal");
  const [slotStructure, setSlotStructure] = useState("CenterCTA");
  const [buttonShape, setButtonShape] = useState("PointedHexagon");
  const [buttonRatio, setButtonRatio] = useState("Wide");
  const [textSafeZone, setTextSafeZone] = useState("Wide");
  const [surfaceTreatment, setSurfaceTreatment] = useState("Glossy3D");
  const [material, setMaterial] = useState("DarkCrimson");
  const [dramaticTex, setDramaticTex] = useState("None");
  const [rimThickness, setRimThickness] = useState("Narrow");
  const [rimMaterial, setRimMaterial] = useState("OrnateGold");
  const [rimColor, setRimColor] = useState("LuxuryGold");
  const [buttonDeco, setButtonDeco] = useState("CompactCorner");
  const [energyCore, setEnergyCore] = useState("None");
  const [enableGlint, setEnableGlint] = useState(false);
  const [shapeDistortion, setShapeDistortion] = useState("None");
  const [userIntent, setUserIntent] = useState("");

  const [styleImage, setStyleImage] = useState(null);
  const [isDraggingStyle, setIsDraggingStyle] = useState(false);
  const [isExpandingIntent, setIsExpandingIntent] = useState(false);
  const [isKeywordSetting, setIsKeywordSetting] = useState(false);
  const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false);
  const [isCopiedBase, setIsCopiedBase] = useState(false);
  const [isCopiedEnhanced, setIsCopiedEnhanced] = useState(false);

  const [aiModel, setAiModel] = useState("NanoBanana");
  const [showOriginalPrompt, setShowOriginalPrompt] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [outputLang, setOutputLang] = useState("EN");
  const [optimizedPrompts, setOptimizedPrompts] = useState({});
  const [translatedPrompts, setTranslatedPrompts] = useState({});
  const [lore, setLore] = useState("");
  const [isGeneratingLore, setIsGeneratingLore] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [tempIntent, setTempIntent] = useState("");
  const chatScrollRef = useRef(null);

  const handleAssetTypeChange = (type) => {
    setAssetType(type);
    if (type === 'Button') {
        setLayoutArchetype('SingleFocal'); setSlotStructure('CenterCTA');
        setButtonShape(themeDna === 'ModernFlatBrand' ? 'Pill' : 'PointedHexagon');
        setButtonRatio('Wide'); setButtonDeco('None');
    } else if (type === 'UtilityButton') {
        setLayoutArchetype('SingleFocal'); setSlotStructure('CenterCTA');
        setButtonShape('ChamferedRect'); setButtonRatio('Standard'); setButtonDeco('None'); setRimMaterial('HeavyIron');
    } else if (type === 'RewardCard') {
        setLayoutArchetype('FocalPlusDesc'); setSlotStructure('TopObjectBottomText');
        setButtonShape('RoundedRect'); setButtonRatio('Vertical'); setButtonDeco('None');
    } else if (type === 'FeatureCard') {
        setLayoutArchetype('FocalPlusDesc'); setSlotStructure('TopObjectBottomText');
        setButtonShape('RoundedRect'); setButtonRatio('Square'); setButtonDeco('None');
    } else if (type === 'EventPanel') {
        setLayoutArchetype('HeaderFocalFooter'); setSlotStructure('HeaderBodyFooter');
        setButtonShape('TopTabPanel'); setButtonRatio('Wide'); setButtonDeco('CompactCorner');
    } else if (type === 'SplitPanel') {
        setLayoutArchetype('SplitTwoColumn'); setSlotStructure('LeftTextRightObject');
        setButtonShape('ChamferedRect'); setButtonRatio('Wide'); setButtonDeco('None');
    } else if (type === 'HeaderTab') {
        setLayoutArchetype('SingleFocal'); setSlotStructure('CenterCTA');
        setButtonShape('Ribbon'); setButtonRatio('Wide'); setButtonDeco('None');
    } else if (type === 'BadgeStamp') {
        setLayoutArchetype('SingleFocal'); setSlotStructure('CenterCTA');
        setButtonShape('Starburst'); setButtonRatio('Square'); setButtonDeco('None');
    } else if (type === 'DecoPart') {
        setLayoutArchetype('SingleFocal'); setSlotStructure('FullBleedGraphic');
        setButtonShape('Pedestal'); setButtonRatio('Wide'); setButtonDeco('FloatingShapes');
    }
  };

  const handleThemeDnaChange = (newDna) => {
    setThemeDna(newDna);
    if (newDna === 'LineageDarkRoyal' || newDna === 'CrimsonSiege') {
        setSurfaceTreatment('RoughStone'); setRimThickness('Narrow'); setRimMaterial('OrnateGold');
        setButtonDeco('CompactCorner'); setEnergyCore('None');
    } else if (newDna === 'ImperialBronze') {
        setSurfaceTreatment('Parchment'); setRimThickness('Narrow'); setRimMaterial('HeavyIron'); setEnergyCore('None');
    } else if (newDna === 'ModernFlatBrand') {
        setSurfaceTreatment('Flat'); setRimThickness('None'); setRimMaterial('SolidColor');
        setButtonDeco('None'); setEnergyCore('DropShadow');
    } else if (newDna === 'SoftPastel3D') {
        setSurfaceTreatment('SoftClay'); setRimThickness('None'); setRimMaterial('None');
        setButtonDeco('FloatingShapes'); setEnergyCore('None');
    }
  };

  const handleResetSettings = () => {
    handleThemeDnaChange("LineageDarkRoyal");
    handleAssetTypeChange("Button");
    setOutputFormat("Isolated"); setRimThickness("Narrow"); setEnergyCore("None"); setUserIntent("");
  };

  useEffect(() => {
    setOptimizedPrompts({});
    setTranslatedPrompts({});
  }, [themeDna, assetType, layoutArchetype, slotStructure, buttonShape, buttonRatio, textSafeZone, outputFormat, surfaceTreatment, material, dramaticTex, rimThickness, rimMaterial, rimColor, energyCore, buttonDeco, shapeDistortion, enableGlint, userIntent]);

  const copyToClipboard = (text, type = "enhanced") => {
    if (!text) return;
    const textArea = document.createElement("textarea");
    textArea.value = text; document.body.appendChild(textArea); textArea.select();
    try {
        document.execCommand('copy');
        if (type === "base") { setIsCopiedBase(true); setTimeout(() => setIsCopiedBase(false), 2000); }
        else { setIsCopiedEnhanced(true); setTimeout(() => setIsCopiedEnhanced(false), 2000); }
    } catch (err) { setErrorMsg("클립보드 복사에 실패했습니다."); }
    document.body.removeChild(textArea);
  };

  const handleStyleFile = (file) => {
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setStyleImage(reader.result);
        reader.readAsDataURL(file);
    }
  };
  const handleStyleImageUpload = (e) => handleStyleFile(e.target.files[0]);
  const handleStyleDragOver = useCallback((e) => { e.preventDefault(); setIsDraggingStyle(true); }, []);
  const handleStyleDragLeave = useCallback((e) => { e.preventDefault(); setIsDraggingStyle(false); }, []);
  const handleStyleDrop = useCallback((e) => { e.preventDefault(); setIsDraggingStyle(false); handleStyleFile(e.dataTransfer.files[0]); }, []);
  const handleClearStyleImage = (e) => { e.stopPropagation(); e.preventDefault(); setStyleImage(null); };

  const buildPrompts = useCallback((rawOnly = false, forceLang = null, ignoreOpt = false) => {
    const activeLang = forceLang || outputLang;
    const themeEn = getOptionEn(staticOptions.themeDna, themeDna);
    const typeEn = getOptionEn(staticOptions.assetTypes, assetType);
    const layoutEn = getOptionEn(staticOptions.layoutArchetypes, layoutArchetype);
    const slotEn = getOptionEn(staticOptions.slotStructures, slotStructure);
    const shapeEn = getOptionEn(staticOptions.buttonShapes, buttonShape);
    const ratioEn = getOptionEn(staticOptions.buttonRatios, buttonRatio);
    const safeZoneEn = getOptionEn(staticOptions.textSafeZones, textSafeZone);
    const formatEn = getOptionEn(staticOptions.outputFormats, outputFormat);
    const surfaceEn = getOptionEn(staticOptions.surfaceTreatments, surfaceTreatment);
    const matEn = getOptionEn(staticOptions.materials, material);
    const texEn = getOptionEn(staticOptions.dramaticTextures, dramaticTex);
    const rimThickEn = getOptionEn(staticOptions.rimThicknesses, rimThickness);
    const rimMatEn = getOptionEn(staticOptions.rimMaterials, rimMaterial);
    const rimColorEn = getOptionEn(staticOptions.rimColors, rimColor);
    const energyEn = getOptionEn(staticOptions.energyCores, energyCore);
    const decoEn = getOptionEn(staticOptions.buttonDecos, buttonDeco);
    const distortEn = getOptionEn(staticOptions.shapeDistortions, shapeDistortion);

    let targetAR = getOptionProp(staticOptions.buttonRatios, buttonRatio, 'ar') || "2:1";
    if (outputFormat === "HeroMockup") targetAR = "16:9";

    if (rawOnly) return `[COMPONENT ARCHITECTURE SPEC]\nTheme DNA: ${themeDna}\nComponent Type: ${assetType}\nLayout Archetype: ${layoutArchetype}\nSlot Structure: ${slotStructure}\nShape/Ratio: ${shapeEn} (${ratioEn})\nSafeZone: ${safeZoneEn}\nSurface/Frame: ${surfaceEn} + ${rimThickEn} ${rimMatEn}\nDeco: ${decoEn}\nFX: ${energyEn}\nOutput: ${formatEn}\n${userIntent ? `User Intent: ${userIntent}` : ''}`;

    const baseNegatives = "text, words, typography, watermark, photograph, hand holding phone, screen perspective, messy, cluttered";
    let lightNegatives = "";
    if (energyCore === "None" || energyCore === "DropShadow") {
        lightNegatives = "sunburst, light rays, glowing background, backlighting, ambient light, glowing aura, radiating rays, light beams";
    }
    let structuralNegatives = "protruding ornaments, messy spreading borders, overly thick frame";
    let styleNegatives = "";
    if (themeDna === 'ModernFlatBrand') styleNegatives = "3d render, photorealism, realistic textures, glossy, heavy shading, volumetric lighting, bevel, emboss";
    if (themeDna === 'SoftPastel3D') styleNegatives = "sharp edges, metallic, dirty, noisy, grunge, realistic, dark fantasy";

    const mjNegatives = `--no ${baseNegatives}, ${lightNegatives}, ${structuralNegatives}, ${styleNegatives}`.replace(/,\s*,/g, ',');

    let layoutConstraint = "CRITICAL BACKGROUND: Strictly pure matte black background. ZERO background lighting, NO sunburst, NO backglow. Tightly bounded edges. The component MUST be perfectly isolated in the center with AMPLE EMPTY SPACE around it.";
    if (outputFormat === "HeroMockup") layoutConstraint = "CRITICAL CANVAS: Full screen dramatic promotional web banner layout, central focus on the component, complementary immersive background environment.";
    if (outputFormat === "Kit") layoutConstraint = "CRITICAL CANVAS: A sprite sheet or kit layout containing multiple variations of this component on a dark background.";

    const colorConsistencyRule = `STRICT COLOR PALETTE: Main body is ${matEn}. Frame is ${rimMatEn} with ${rimColorEn} accents.`;
    const textSpaceConstraint = `CRITICAL TEXT SAFE ZONE: ${safeZoneEn}. The central area MUST remain completely empty and clean for typography. No icons or patterns in the exact center.`;
    const decorationRules = buttonDeco === "None" ? "STRICTLY NO decorations." : `DECORATIONS: ${decoEn}. Must remain compact.`;
    const frameConstraint = `FRAME: ${rimThickEn} made of ${rimMatEn}. Ensure it is tightly bounded and does not protrude excessively.`;
    const glintTechnical = enableGlint ? "Add dramatic crisp specular highlights on the edges to draw attention." : "Soft diffuse lighting on edges.";

    const gptPrompt = `Create a professional promotional web component.
Theme/Vibe: ${themeEn}
Component Type: ${typeEn}
Layout Archetype: ${layoutEn}
Slot Structure (CRITICAL): ${slotEn}
Base Shape & Ratio: ${shapeEn}, ${ratioEn}
Surface Finish: ${surfaceEn}
Frame & Border: ${frameConstraint}
Decorations & FX: ${decorationRules} ${energyEn}. ${glintTechnical}
Output Constraint: ${layoutConstraint}
${textSpaceConstraint}
${userIntent ? `Specific Feature: ${userIntent}. ` : ''}The final image must be perfectly structured for use in a campaign website layout. Ensure edges are tight and background is free of stray light rays unless specified.`.trim();

    let strictNanoBackground = outputFormat === 'Isolated' ? 'isolated on pure black background void, (no background light:1.5), (no sunburst:1.5), perfectly clean background, tightly bounded shape' : 'campaign mockup';
    const nanoPrompt = `masterpiece, best quality, web promotional asset, ${typeEn}, ${themeEn}, ${layoutEn}, ${slotEn}, ${shapeEn}, ${surfaceEn}, ${rimThickEn} ${rimMatEn} frame, tightly contained edges, non-protruding, ${decoEn}, ${energyEn}, ${enableGlint ? "crisp highlights" : "flat lighting"}, ${strictNanoBackground}, ${safeZoneEn}, blank central area for text, vector graphic style, highly detailed, 8k${userIntent ? `, ${userIntent}` : ''}`.trim();

    const mjPrompt = `/imagine prompt: masterpiece game UI asset design, ${typeEn} component. THEME: ${themeEn}. LAYOUT ARCHETYPE: ${layoutEn}. SLOT STRUCTURE: ${slotEn}. BASE SHAPE: ${shapeEn} (${ratioEn}). SURFACE: ${surfaceEn}. ${frameConstraint} DECORATION: ${decoEn}. ${textSpaceConstraint} ${layoutConstraint} ${energyEn}. ${glintTechnical} ${userIntent ? `Focus: ${userIntent}. ` : ''}highly detailed marketing graphic, 8k --ar ${targetAR} --stylize 150 ${mjNegatives} --v 6.1`.trim();

    const summaryKo = `[Rubicon Forge 컴포넌트 설계서]\n- 테마 DNA: ${getOptionName(staticOptions.themeDna, themeDna)}\n- 컴포넌트: ${getOptionName(staticOptions.assetTypes, assetType)}\n- 레이아웃: ${getOptionName(staticOptions.layoutArchetypes, layoutArchetype)}\n- 베이스 형태: ${getOptionName(staticOptions.buttonShapes, buttonShape)}\n- 텍스트 세이프존: ${getOptionName(staticOptions.textSafeZones, textSafeZone)}\n- 표면: ${getOptionName(staticOptions.surfaceTreatments, surfaceTreatment)}\n- 프레임 굵기: ${getOptionName(staticOptions.rimThicknesses, rimThickness)}\n- 프레임 재질: ${getOptionName(staticOptions.rimMaterials, rimMaterial)}\n- 주변 효과: ${getOptionName(staticOptions.energyCores, energyCore)}\n${userIntent ? `- 커스텀 요구사항: ${userIntent}\n` : ''}`;

    let finalStr = "";
    if (aiModel === "NanoBanana") finalStr = (!ignoreOpt && optimizedPrompts[aiModel]) ? optimizedPrompts[aiModel] : nanoPrompt;
    else if (aiModel === "ChatGPT") finalStr = (!ignoreOpt && optimizedPrompts[aiModel]) ? optimizedPrompts[aiModel] : gptPrompt;
    else if (aiModel === "Midjourney") finalStr = (!ignoreOpt && optimizedPrompts[aiModel]) ? optimizedPrompts[aiModel] : mjPrompt;
    else return summaryKo;

    return (activeLang === "KR" && aiModel !== "Overview") ? (translatedPrompts[aiModel + finalStr] || finalStr) : finalStr;
  }, [aiModel, outputLang, themeDna, assetType, layoutArchetype, slotStructure, buttonShape, buttonRatio, textSafeZone, outputFormat, surfaceTreatment, material, dramaticTex, rimThickness, rimMaterial, rimColor, energyCore, buttonDeco, shapeDistortion, enableGlint, optimizedPrompts, translatedPrompts, userIntent]);

  const finalOutput = buildPrompts(false, null, showOriginalPrompt);
  const originalOutput = buildPrompts(false, null, true);
  const baseSpec = buildPrompts(true);

  const handleTranslatePrompt = async (englishText) => {
    if (!englishText || translatedPrompts[aiModel + englishText]) return;
    setIsTranslating(true);
    try {
      const apiKey = GEMINI_API_KEY; const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const payload = { contents: [{ role: "user", parts: [{ text: `Explain this prompt in Korean: ${englishText}` }] }], systemInstruction: { parts: [{ text: "전문 프로모션 아트 디렉터로서 영어 프롬프트를 실무적인 한국어로 설명하십시오." }] } };
      const result = await fetchWithRetry(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) setTranslatedPrompts(prev => ({ ...prev, [aiModel + englishText]: text }));
    } catch (err) { setErrorMsg("한국어 번역 중 오류가 발생했습니다."); }
    finally { setIsTranslating(false); }
  };

  const toggleLanguage = () => {
    const nextLang = outputLang === "EN" ? "KR" : "EN";
    setOutputLang(nextLang);
    if (nextLang === "KR" && aiModel !== "Overview") {
        handleTranslatePrompt(buildPrompts(false, "EN", true));
        if (optimizedPrompts[aiModel]) handleTranslatePrompt(optimizedPrompts[aiModel]);
    }
  };

  const handleOptimizePrompt = async () => {
    if (aiModel === 'Overview') return;
    const currentBase = buildPrompts(true, "EN");
    setIsOptimizing(true);
    try {
      const apiKey = GEMINI_API_KEY; const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const systemPrompt = `You are a world-class campaign visual prompt engineer. Refine this spec into a perfect prompt. CRITICAL RULES: 1. STRUCTURAL PROMO COMPONENT. 2. Focus on SLOT STRUCTURE and TEXT SAFE ZONES. 3. Strict background rules (zero light bleed for isolated). 4. NO TEXT IN THE MIDDLE. 5. ONLY the prompt text.`;
      const payload = { contents: [{ role: "user", parts: [{ text: `Refine this Component Architecture spec: ${currentBase}` }] }], systemInstruction: { parts: [{ text: systemPrompt }] } };
      const result = await fetchWithRetry(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
          setOptimizedPrompts(prev => ({ ...prev, [aiModel]: text }));
          if (outputLang === "KR") handleTranslatePrompt(text);
      }
    } catch (err) { setErrorMsg("프롬프트 최적화 실패."); }
    finally { setIsOptimizing(false); }
  };

  const handleExpandIntent = async () => {
    if (!userIntent) { setErrorMsg("확장할 짧은 키워드나 아이디어를 먼저 입력해주세요."); return; }
    setIsExpandingIntent(true);
    try {
        const apiKey = GEMINI_API_KEY;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const systemPrompt = `You are an elite campaign visual designer. The user will provide a short concept/keyword for a promotional ${assetType}. Expand it into a detailed visual description for a ${themeDna} style banner asset. Korean, under 3 sentences.`;
        const payload = { contents: [{ role: "user", parts: [{ text: `Expand this campaign visual concept in Korean: "${userIntent}"` }] }], systemInstruction: { parts: [{ text: systemPrompt }] } };
        const result = await fetchWithRetry(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) setUserIntent(text.trim());
    } catch (err) { setErrorMsg("아이디어 구체화에 실패했습니다."); }
    finally { setIsExpandingIntent(false); }
  };

  const handleKeywordSetup = async () => {
    if (!userIntent) { setErrorMsg("키워드나 요구사항을 먼저 입력해주세요."); return; }
    setIsKeywordSetting(true);
    try {
        const apiKey = GEMINI_API_KEY;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const validIds = {
            buttonShape: staticOptions.buttonShapes.map(o=>o.id).join(', '),
            textSafeZone: staticOptions.textSafeZones.map(o=>o.id).join(', '),
            buttonDeco: staticOptions.buttonDecos.map(o=>o.id).join(', '),
            shapeDistortion: staticOptions.shapeDistortions.map(o=>o.id).join(', '),
            surfaceTreatment: staticOptions.surfaceTreatments.map(o=>o.id).join(', '),
            material: staticOptions.materials.map(o=>o.id).join(', '),
            dramaticTex: staticOptions.dramaticTextures.map(o=>o.id).join(', '),
            rimThickness: staticOptions.rimThicknesses.map(o=>o.id).join(', '),
            rimMaterial: staticOptions.rimMaterials.map(o=>o.id).join(', '),
            rimColor: staticOptions.rimColors.map(o=>o.id).join(', ')
        };
        const systemPrompt = `Configure the BEST matching parameter IDs for a ${themeDna} style ${assetType}. STRICTLY select ONLY from these lists.\nAvailable IDs:\n${Object.entries(validIds).map(([k,v]) => `- ${k}: [${v}]`).join('\n')}\nOutput MUST be a pure JSON object containing exactly these keys.`;
        const payload = { contents: [{ role: "user", parts: [{ text: `Suggest the best setting IDs for this concept: "${userIntent}". Persona: ${themeDna}, type: ${assetType}.` }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json" } };
        const result = await fetchWithRetry(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const config = JSON.parse(result.candidates?.[0]?.content?.parts?.[0]?.text);
        if (config.buttonShape) setButtonShape(config.buttonShape);
        if (config.textSafeZone) setTextSafeZone(config.textSafeZone);
        if (config.buttonDeco) setButtonDeco(config.buttonDeco);
        if (config.shapeDistortion) setShapeDistortion(config.shapeDistortion);
        if (config.surfaceTreatment) setSurfaceTreatment(config.surfaceTreatment);
        if (config.material) setMaterial(config.material);
        if (config.dramaticTex) setDramaticTex(config.dramaticTex);
        if (config.rimThickness) setRimThickness(config.rimThickness);
        if (config.rimMaterial) setRimMaterial(config.rimMaterial);
        if (config.rimColor) setRimColor(config.rimColor);
    } catch (err) { setErrorMsg("키워드 기반 옵션 자동 셋업에 실패했습니다. 다시 시도해주세요."); }
    finally { setIsKeywordSetting(false); }
  };

  const openChatModal = () => {
    if (!userIntent) { setErrorMsg("먼저 키워드를 입력하거나 구체화해주세요."); return; }
    setTempIntent(userIntent);
    setChatMessages([{ role: 'model', text: "안녕하세요! 현재 프로모션 에셋 시안을 어떻게 튜닝해 드릴까요?" }]);
    setIsChatModalOpen(true);
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const newMessages = [...chatMessages, { role: 'user', text: chatInput }];
    setChatMessages(newMessages); setChatInput(""); setIsChatting(true);
    try {
        const apiKey = GEMINI_API_KEY; const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const systemPrompt = `당신은 웹 캠페인 비주얼 아트 디렉터입니다. [현재 아이디어]: ${tempIntent}\nJSON으로 응답: {"message": "친절한 설명", "updated_intent": "수정된 한글 묘사"}`;
        const payload = { contents: newMessages.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] })), systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json" } };
        const result = await fetchWithRetry(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const parsed = JSON.parse(result.candidates?.[0]?.content?.parts?.[0]?.text);
        if (parsed.message && parsed.updated_intent) {
            setChatMessages([...newMessages, { role: 'model', text: parsed.message }]);
            setTempIntent(parsed.updated_intent);
        }
    } catch (err) { setChatMessages([...newMessages, { role: 'model', text: "오류가 발생했습니다." }]); }
    finally { setIsChatting(false); }
  };
  const applyChatIntent = () => { setUserIntent(tempIntent); setIsChatModalOpen(false); };
  useEffect(() => { if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight; }, [chatMessages]);

  const analyzeStyle = async () => {
    if (!styleImage) return;
    setIsAnalyzingStyle(true);
    try {
        const apiKey = GEMINI_API_KEY; const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const systemPrompt = `Analyze ONLY visual style of provided promotional ${assetType}. Persona: ${themeDna}. Output ONLY JSON: {surfaceTreatment, material, dramaticTex, rimColor, rimMaterial, rimThickness, buttonShape, textSafeZone, buttonDeco, shapeDistortion, energyCore}.`;
        const payload = { contents: [{ role: "user", parts: [{ text: `Analyze this campaign asset style.` }, { inlineData: { mimeType: "image/png", data: styleImage.split(',')[1] } }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json" } };
        const result = await fetchWithRetry(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const config = JSON.parse(result.candidates?.[0]?.content?.parts?.[0]?.text);
        if (config.surfaceTreatment) setSurfaceTreatment(config.surfaceTreatment);
        if (config.material) setMaterial(config.material);
        if (config.dramaticTex) setDramaticTex(config.dramaticTex);
        if (config.rimThickness) setRimThickness(config.rimThickness);
        if (config.rimColor) setRimColor(config.rimColor);
        if (config.rimMaterial) setRimMaterial(config.rimMaterial);
        if (config.buttonShape) setButtonShape(config.buttonShape);
        if (config.textSafeZone) setTextSafeZone(config.textSafeZone);
        if (config.buttonDeco) setButtonDeco(config.buttonDeco);
        if (config.shapeDistortion) setShapeDistortion(config.shapeDistortion);
        if (config.energyCore) setEnergyCore(config.energyCore);
    } catch (err) { setErrorMsg("스타일 추출에 실패했습니다."); }
    finally { setIsAnalyzingStyle(false); }
  };

  const validation = useMemo(() => {
    let warnings = [];
    if (textSafeZone === "Narrow" && (assetType === "EventPanel" || assetType === "Button")) warnings.push("패널/버튼에 텍스트 세이프존이 좁아 가독성 확보가 어려울 수 있습니다.");
    if (outputFormat === "Isolated" && energyCore !== "None") warnings.push("누끼 작업 시 배경 효과로 인해 경계가 지저분해질 수 있습니다.");
    if (rimThickness === "Thick" && assetType === "Button") warnings.push("프레임이 너무 두꺼우면 텍스트 공간이 침범될 수 있습니다.");
    if (buttonDeco === "CornerOrnaments" && textSafeZone === "UltraWide") warnings.push("화려한 모서리 장식이 넓은 텍스트 영역을 침범할 수 있습니다.");
    if (warnings.length === 0) return { status: 'Optimal', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', icon: <CheckCircle2 className="w-3.5 h-3.5" />, msg: '배너/캠페인 최적화됨' };
    if (warnings.length <= 1) return { status: 'Warning', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', icon: <AlertCircle className="w-3.5 h-3.5" />, msg: '사용 양호 (유의사항 확인)' };
    return { status: 'Danger', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: <X className="w-3.5 h-3.5" />, msg: '주의 (실사용성 저하 우려)' };
  }, [outputFormat, energyCore, rimThickness, buttonDeco, assetType, textSafeZone]);

  const handleFixValidation = () => {
    if (assetType === "EventPanel" || assetType === "Button") setTextSafeZone("Wide");
    if (outputFormat === "Isolated") setEnergyCore("None");
    if (assetType === "Button") setRimThickness("Narrow");
    if (buttonDeco === "CornerOrnaments") setButtonDeco("CompactCorner");
  };

  const handleGenerateLore = async () => {
    if (!finalOutput) return;
    setIsGeneratingLore(true);
    try {
        const apiKey = GEMINI_API_KEY; const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const payload = { contents: [{ role: "user", parts: [{ text: `이 프로모션 에셋 명세서를 바탕으로, 매력적인 [캠페인 타이틀]과 2문장짜리 [분위기 설명]을 작성해 줘.\n${finalOutput}` }] }], systemInstruction: { parts: [{ text: "당신은 프로모션 브랜드 카피라이터입니다." }] } };
        const result = await fetchWithRetry(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) setLore(text);
    } catch (err) { setErrorMsg("카피 생성 실패."); }
    finally { setIsGeneratingLore(false); }
  };

  const isOptionDisabled = useCallback((key) => {
    if (themeDna === 'ModernFlatBrand') return ['dramaticTex', 'shapeDistortion'].includes(key);
    if (themeDna === 'SoftPastel3D') return ['dramaticTex', 'shapeDistortion'].includes(key);
    return false;
  }, [themeDna, assetType]);

  return (
    <div className={`flex flex-col h-screen ${theme === 'dark' ? 'bg-[#030304] text-zinc-100' : 'bg-white text-zinc-900'} overflow-hidden relative`} style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap');
        .custom-scrollbar::-webkit-scrollbar { width: 2px; height: 2px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(161, 161, 170, 0.1); border-radius: 10px; transition: background 0.3s; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(161, 161, 170, 0.3); }
      `}</style>

      {errorMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-red-500/95 text-white px-6 py-3 rounded-md font-bold text-[12px] shadow-[0_10px_30px_rgba(239,68,68,0.3)] z-[1000] flex items-center gap-3 animate-in slide-in-from-top-4">
            <AlertCircle className="w-4 h-4" />
            {errorMsg}
            <button onClick={() => setErrorMsg(null)} className="ml-2 hover:bg-white/20 p-1 rounded-full transition-colors"><X className="w-3 h-3" /></button>
        </div>
      )}

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-[420px] border-r border-zinc-800/60 bg-[#0F0F12] flex flex-col shadow-2xl z-20 shrink-0">

          <div className="px-6 py-6 border-b border-zinc-800/50 flex flex-col gap-6">
            <div className="flex items-end gap-1.5 px-2">
              <h1 className="app-title text-2xl tracking-wide flex items-baseline gap-1.5 text-white">
                <span className="font-light">Rubicon</span>
                <span className="font-semibold">Forge</span>
              </h1>
              <span className="text-[11px] font-bold text-zinc-500 tracking-wide">v45.2</span>
            </div>

            <div className="flex bg-[#111111] p-1.5 rounded-lg border border-zinc-800/50 w-full shadow-inner">
              <button onClick={() => setCurrentView('creation')} className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-md text-[13px] font-bold transition-all ${currentView === 'creation' ? 'bg-[#2A2A2E] text-white shadow-md border border-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}>
                 <LayoutTemplate className="w-4 h-4" /> Component
              </button>
              <button onClick={() => setCurrentView('micro-edit')} className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-md text-[13px] font-bold transition-all ${currentView === 'micro-edit' ? 'bg-[#2A2A2E] text-white shadow-md border border-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}>
                 <Edit2 className="w-4 h-4" /> Micro-Edit
              </button>
            </div>
          </div>

          {currentView === 'creation' ? (
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-10 pb-20">

              <div className="space-y-5">
                  <div className="flex items-center gap-2 text-zinc-500 mb-2"><UserCog className="w-4 h-4 text-[#76cee0]" /><h3 className="text-[11px] font-black uppercase tracking-widest text-[#76cee0]">1. Brand & Theme</h3></div>
                  <PopoverSelect label="THEME DNA (브랜드 모티프)" icon={<></>} value={themeDna} options={staticOptions.themeDna} onChange={handleThemeDnaChange} highlight="step" />
              </div>

              <div className="border-t border-zinc-800/50 pt-8 space-y-5">
                  <div className="flex items-center gap-2 text-zinc-500 mb-2"><Columns className="w-4 h-4 text-[#76cee0]" /><h3 className="text-[11px] font-black uppercase tracking-widest text-[#76cee0]">2. Architecture (구조 설계)</h3></div>
                  <PopoverSelect label="COMPONENT TYPE (에셋 종류)" icon={<></>} value={assetType} options={staticOptions.assetTypes} onChange={handleAssetTypeChange} highlight="step" />
                  <PopoverSelect label="LAYOUT ARCHETYPE (레이아웃 골격)" icon={<></>} value={layoutArchetype} options={staticOptions.layoutArchetypes} onChange={setLayoutArchetype} highlight="step" />
                  <PopoverSelect label="SLOT STRUCTURE (정보/여백 슬롯)" icon={<></>} value={slotStructure} options={staticOptions.slotStructures} onChange={setSlotStructure} highlight="step" />
                  <DropdownControl label="출력 모드 (Output Mode)" icon={<MonitorCheck className="w-3.5 h-3.5" />} data={staticOptions.outputFormats} value={outputFormat} onChange={setOutputFormat} theme={theme} />
              </div>

              <div className="border-t border-zinc-800/50 pt-8 space-y-4">
                  <div className="flex items-center gap-2 text-zinc-500 mb-4"><Shapes className="w-4 h-4 text-[#76cee0]" /><h3 className="text-[11px] font-black uppercase tracking-widest text-[#76cee0]">3. Base Form & Shape</h3></div>

                  <div className="flex gap-3 mb-6">
                      <div onDragOver={handleStyleDragOver} onDragLeave={handleStyleDragLeave} onDrop={handleStyleDrop} className={`relative border border-dashed rounded-lg h-24 flex-1 flex flex-col items-center justify-center transition-all overflow-hidden group ${isDraggingStyle ? 'border-[#76cee0] bg-[#76cee0]/10' : 'border-zinc-700/50 bg-[#111111] hover:border-[#76cee0]/50'}`}>
                        {styleImage ? (
                            <div className="relative w-full h-full p-2 flex flex-col items-center justify-center group-hover:opacity-90 transition-all">
                                <img src={styleImage} className="w-full h-full object-cover rounded-md" alt="Style Source" />
                                <button onClick={handleClearStyleImage} className="absolute top-2 right-2 bg-black/60 hover:bg-red-500 text-white p-1.5 rounded-sm backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all shadow-md z-10"><X className="w-3 h-3" /></button>
                            </div>
                        ) : <div className="flex flex-col items-center gap-1.5 opacity-40 text-zinc-400"><UploadCloud className="w-4 h-4" /><p className="text-[9px] font-bold uppercase tracking-widest text-center">SHAPE REF</p></div>}
                        {!styleImage && <input type="file" onChange={handleStyleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />}
                      </div>
                      <div className="relative border border-dashed rounded-lg h-24 flex-1 flex flex-col items-center justify-center transition-all overflow-hidden opacity-50 border-zinc-700/50 bg-[#111111] cursor-not-allowed">
                          <div className="flex flex-col items-center gap-1.5 text-zinc-500"><Palette className="w-4 h-4" /><p className="text-[9px] font-bold uppercase tracking-widest text-center">TEXTURE REF</p></div>
                      </div>
                  </div>

                  <DropdownControl label="기본 형태 (Base Shape)" data={staticOptions.buttonShapes} value={buttonShape} onChange={setButtonShape} theme={theme} />
                  <DropdownControl label="비율 (Aspect Ratio)" data={staticOptions.buttonRatios} value={buttonRatio} onChange={setButtonRatio} theme={theme} />
                  <DropdownControl label="텍스트 세이프존 (가독성 여백)" data={staticOptions.textSafeZones} value={textSafeZone} onChange={setTextSafeZone} theme={theme} />
                  <DropdownControl label="형태 왜곡 (Distortion)" data={staticOptions.shapeDistortions} value={shapeDistortion} onChange={setShapeDistortion} theme={theme} disabled={isOptionDisabled('shapeDistortion')} />
              </div>

              <div className="border-t border-zinc-800/50 pt-8 space-y-4">
                  <div className="flex items-center gap-2 text-zinc-500 mb-4"><PaintBucket className="w-4 h-4 text-[#76cee0]" /><h3 className="text-[11px] font-black uppercase tracking-widest text-[#76cee0]">4. Surface & Polish</h3></div>
                  <DropdownControl label="표면 가공 (Surface)" data={staticOptions.surfaceTreatments} value={surfaceTreatment} onChange={setSurfaceTreatment} theme={theme} disabled={isOptionDisabled('surfaceTreatment')} />
                  <DropdownControl label="바디 색상/재질 (Color/Mat)" data={staticOptions.materials} value={material} onChange={setMaterial} theme={theme} disabled={isOptionDisabled('material')} />
                  <DropdownControl label="내부 질감/패턴 (Texture)" data={staticOptions.dramaticTextures} value={dramaticTex} onChange={setDramaticTex} theme={theme} disabled={isOptionDisabled('dramaticTex')} />
                  <div className="pt-2 pb-2 border-l-2 border-[#76cee0]/30 pl-4 ml-1 space-y-4">
                     <DropdownControl label="프레임 두께 및 굵기" data={staticOptions.rimThicknesses} value={rimThickness} onChange={setRimThickness} theme={theme} disabled={isOptionDisabled('rimThickness')} />
                     <DropdownControl label="프레임 재질" data={staticOptions.rimMaterials} value={rimMaterial} onChange={setRimMaterial} theme={theme} disabled={isOptionDisabled('rimMaterial')} />
                  </div>
              </div>

              <div className="border-t border-zinc-800/50 pt-8 space-y-4">
                  <div className="flex items-center gap-2 text-zinc-500 mb-4"><SparkleFX className="w-4 h-4 text-[#76cee0]" /><h3 className="text-[11px] font-black uppercase tracking-widest text-[#76cee0]">5. Decoration & FX</h3></div>
                  <DropdownControl label="장식 요소 (Deco)" data={staticOptions.buttonDecos} value={buttonDeco} onChange={setButtonDeco} theme={theme} />
                  <DropdownControl label="배경 효과/광원 (Background FX)" data={staticOptions.energyCores} value={energyCore} onChange={setEnergyCore} theme={theme} disabled={isOptionDisabled('energyCore')} />
                  <div className="pt-2">
                     <ToggleControl label="강렬한 스페큘러/하이라이트 (Glint)" enabled={enableGlint} onChange={() => setEnableGlint(!enableGlint)} theme={theme} disabled={isOptionDisabled('enableGlint')} />
                  </div>
              </div>

              <div className="border-t border-zinc-800/50 pt-8 space-y-4">
                  <h3 className="text-[11px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-2">
                     <Wand2 className="w-4 h-4" /> AI DIRECTIVE (Quick Actions)
                  </h3>
                  <div className="w-full flex flex-col bg-[#111111] border border-zinc-700/50 rounded-xl focus-within:border-purple-500/50 transition-all overflow-hidden">
                      <textarea value={userIntent} onChange={(e) => setUserIntent(e.target.value)} placeholder={`원하는 캠페인 느낌을 입력하세요 (예: 여름 세일, 청량한 느낌)...`} className="w-full h-24 bg-transparent p-4 text-[12px] text-zinc-300 focus:outline-none resize-none custom-scrollbar" />
                      <div className="flex justify-end gap-1.5 p-3 pt-0 bg-transparent">
                          <button onClick={handleExpandIntent} disabled={isExpandingIntent || !userIntent} className="p-1.5 text-purple-500/60 hover:text-purple-400 transition-colors disabled:opacity-50">
                              {isExpandingIntent ? <Loader2 className="w-4 h-4 animate-spin" /> : <SparkleIcon className="w-4 h-4" />}
                          </button>
                          <button onClick={openChatModal} disabled={!userIntent} className="p-1.5 text-purple-500/60 hover:text-purple-400 transition-colors disabled:opacity-50">
                              <MessageSquare className="w-4 h-4" />
                          </button>
                      </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                     <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Auto Setup & Reset</span>
                     <div className="flex gap-2">
                        <button onClick={handleKeywordSetup} disabled={isKeywordSetting || !userIntent} className="p-2 rounded-md bg-[#111111] text-zinc-400 border border-zinc-800 hover:border-purple-500/50 hover:text-purple-400 transition-colors">
                           <Wand className="w-4 h-4" />
                        </button>
                        <button onClick={analyzeStyle} disabled={isAnalyzingStyle || !styleImage} className="p-2 rounded-md bg-[#111111] text-zinc-400 border border-zinc-800 hover:border-[#76cee0]/50 hover:text-[#76cee0] transition-colors">
                           <ScanLine className="w-4 h-4" />
                        </button>
                        <button onClick={handleResetSettings} className="p-2 rounded-md bg-[#111111] text-zinc-400 border border-zinc-800 hover:border-red-500/50 hover:text-red-400 transition-colors">
                           <RefreshCw className="w-4 h-4" />
                        </button>
                     </div>
                  </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col items-center justify-center text-zinc-500">
                 <Edit2 className="w-12 h-12 mb-4 opacity-20" />
                 <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Micro-Edit Mode</h2>
                 <p className="text-xs opacity-60 mt-2 text-center break-keep-all">기존 컴포넌트의 레이아웃은 유지한 채, 재질/테마/광원만 교체하는 모드입니다. (준비 중)</p>
            </div>
          )}
        </aside>

        <div className="flex-1 flex flex-col bg-[#050507] overflow-y-auto custom-scrollbar relative">

          {currentView === 'creation' && (
            <div className="p-12 lg:p-20 max-w-[1400px] mx-auto w-full space-y-16 pb-32">
              <div className="flex flex-col gap-10">
                <div className="max-w-[1000px] mx-auto w-full flex flex-col gap-10">

                  <div className="p-8 lg:p-10 rounded-sm border border-zinc-800/60 bg-[#0F0F12] relative shadow-[0_40px_120px_rgba(0,0,0,0.8)] flex flex-col">
                      <div className="flex justify-between items-center mb-6 relative z-20">
                          <div className="flex items-center gap-3">
                              <div className="flex items-center gap-3 text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em]">
                                 <Code2 className="w-5 h-5 opacity-40" /> Architecture Blueprint
                              </div>
                              <button
                                onClick={() => { if (validation.status !== 'Optimal') handleFixValidation(); }}
                                disabled={validation.status === 'Optimal'}
                                title={validation.status !== 'Optimal' ? "클릭하여 자동 수정합니다." : ""}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-[10px] font-bold transition-all ${validation.status !== 'Optimal' ? 'hover:scale-105 active:scale-95 cursor-pointer shadow-sm hover:brightness-125' : 'cursor-default opacity-80'} ${validation.color} ${validation.bg}`}
                              >
                                  {validation.icon} {validation.msg}
                                  {validation.status !== 'Optimal' && <span className="ml-1.5 px-1.5 py-0.5 bg-black/30 rounded text-[9px] uppercase tracking-wider flex items-center gap-1"><Wand2 className="w-2.5 h-2.5" /> Fix</span>}
                              </button>
                          </div>
                          <div className="flex gap-2">
                             <button onClick={handleResetSettings} className="p-3 rounded-md transition-all text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 border border-zinc-800"><RefreshCw className="w-4 h-4" /></button>
                             <button onClick={() => copyToClipboard(baseSpec, 'base')} className={`p-3 rounded-md transition-all active:scale-90 ${isCopiedBase ? 'bg-blue-600 text-white' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/30'}`}>
                                 {isCopiedBase ? <Check className="w-4 h-4 animate-in zoom-in" /> : <Copy className="w-4 h-4" />}
                             </button>
                          </div>
                      </div>

                      <div className="font-mono text-[14px] leading-[1.6] whitespace-pre-wrap opacity-60 tracking-tight bg-black/20 p-8 rounded-sm border border-white/5 max-h-[300px] overflow-y-auto custom-scrollbar text-[#7ea6ae]">
                          {baseSpec}
                      </div>
                  </div>

                  <div className="flex flex-col gap-6">
                      <div className="flex gap-2 p-2 bg-zinc-900/40 border border-zinc-800/50 rounded-sm shadow-xl w-full">
                          {["NanoBanana", "ChatGPT", "Midjourney", "Overview"].map(tab => (
                              <button key={tab} onClick={() => { setAiModel(tab); setShowOriginalPrompt(false); }} className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest rounded-sm transition-all ${aiModel === tab ? 'bg-[#488c9c] text-white shadow-2xl scale-[1.02]' : 'text-zinc-500 hover:text-zinc-300'}`}>{tab}</button>
                          ))}
                      </div>

                      <div className="p-8 lg:p-10 rounded-sm border border-zinc-800/60 bg-[#0F0F12] relative shadow-[0_40px_120px_rgba(0,0,0,0.8)] flex flex-col min-h-[500px]">
                          <div className="flex justify-between items-center mb-8 relative z-20">
                              <div className="flex items-center gap-3 text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em]">
                                 <Terminal className="w-5 h-5 opacity-40" /> Prompt Output
                              </div>
                              <div className="flex items-center gap-3">
                                  {aiModel !== 'Overview' && (
                                      <>
                                          {optimizedPrompts[aiModel] && (
                                              <button onClick={() => setShowOriginalPrompt(!showOriginalPrompt)} className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase rounded-sm border transition-all shadow-sm active:scale-95 ${showOriginalPrompt ? 'bg-zinc-800 border-zinc-500 text-white' : 'border-zinc-700/50 text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>
                                                  <FileText className="w-3.5 h-3.5" /> {showOriginalPrompt ? '✨ 최적화 뷰' : '📄 원문 뷰'}
                                              </button>
                                          )}
                                          <button onClick={handleOptimizePrompt} disabled={isOptimizing} className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase rounded-sm border border-purple-500/40 text-purple-400 hover:bg-purple-600 hover:text-white transition-all shadow-sm active:scale-95">
                                              {isOptimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SparkleIcon className="w-3.5 h-3.5" />} 프롬프트 최적화
                                          </button>
                                          <div className="flex bg-black/40 p-1 rounded-sm border border-white/5">
                                              {['EN', 'KR'].map(lang => (
                                                  <button key={lang} onClick={toggleLanguage} className={`px-5 py-2 text-[9px] font-black rounded-sm transition-all ${outputLang === lang ? 'bg-[#488c9c] text-white shadow-lg' : 'text-zinc-600 hover:text-zinc-300'}`}>{lang}</button>
                                              ))}
                                          </div>
                                      </>
                                  )}
                                  <button onClick={() => copyToClipboard(finalOutput, 'enhanced')} className={`p-3 rounded-md transition-all active:scale-90 ${isCopiedEnhanced ? 'bg-blue-600 text-white' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/30'}`}>
                                      {isCopiedEnhanced ? <Check className="w-4 h-4 animate-in zoom-in" /> : <Copy className="w-4 h-4" />}
                                  </button>
                              </div>
                          </div>

                          <div className={`flex-1 leading-relaxed text-zinc-300 transition-all duration-700 relative z-20 ${isOptimizing || isTranslating ? 'opacity-10 blur-xl scale-[0.98]' : 'opacity-100'}`}>
                              {aiModel === 'Overview' ? (
                                  <div className="space-y-6">
                                      {finalOutput.split('\n').map((line, i) => (
                                          <p key={i} className={i === 0 ? "text-3xl font-black text-white mb-8 border-b-2 border-zinc-800/60 pb-6 tracking-tighter" : "text-zinc-500 text-[14px] font-bold leading-8 tracking-tight"}>{line}</p>
                                      ))}
                                  </div>
                              ) : (
                                  <div className="flex flex-col h-full gap-4 overflow-hidden">
                                      {optimizedPrompts[aiModel] && !showOriginalPrompt ? (
                                          <div className="font-mono text-[14px] leading-[1.6] whitespace-pre-wrap opacity-100 select-all tracking-tight bg-[#488c9c]/10 p-8 rounded-sm border border-[#488c9c]/30 shadow-inner relative flex-1 overflow-y-auto custom-scrollbar">
                                              <div className="absolute top-0 right-0 bg-[#488c9c] text-white text-[9px] px-4 py-1 rounded-bl-sm font-black uppercase tracking-widest flex items-center gap-1 shadow-lg">
                                                  <SparkleIcon className="w-3 h-3" /> AI Optimized
                                              </div>
                                              {outputLang === "KR" ? (translatedPrompts[aiModel + optimizedPrompts[aiModel]] || optimizedPrompts[aiModel]) : optimizedPrompts[aiModel]}
                                          </div>
                                      ) : (
                                          <div className="font-mono text-[14px] leading-[1.6] whitespace-pre-wrap opacity-90 select-all tracking-tight bg-black/40 p-8 rounded-sm border border-white/5 shadow-inner relative flex-1 overflow-y-auto custom-scrollbar text-[#7ea6ae]">
                                              <div className="absolute top-0 right-0 bg-zinc-800 text-zinc-400 text-[9px] px-3 py-1 rounded-bl-sm font-bold uppercase">
                                                  {optimizedPrompts[aiModel] ? 'Original Output (최적화 전)' : 'Basic Output'}
                                              </div>
                                              {outputLang === "KR" ? (translatedPrompts[aiModel + originalOutput] || originalOutput) : originalOutput}
                                          </div>
                                      )}
                                  </div>
                              )}
                          </div>
                      </div>

                      <div className="mt-4 p-6 rounded-sm border border-zinc-800/60 bg-[#0F0F12] relative shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                          <div className="flex justify-between items-center mb-4">
                              <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                                  <BookOpen className="w-4 h-4" /> ✨ Campaign Copy & Vibe
                              </h4>
                              <button onClick={handleGenerateLore} disabled={isGeneratingLore || !finalOutput} className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 border border-purple-500/30 rounded text-[10px] font-bold transition-all disabled:opacity-30 flex items-center gap-1.5">
                                  {isGeneratingLore ? <Loader2 className="w-3 h-3 animate-spin" /> : <SparkleIcon className="w-3 h-3" />} {lore ? '다시 쓰기' : '카피 제안 생성'}
                              </button>
                          </div>
                          {isGeneratingLore ? (
                              <div className="h-16 flex items-center justify-center text-zinc-600 font-bold text-[11px] uppercase tracking-widest animate-pulse">Generating copy...</div>
                          ) : lore ? (
                              <p className="text-[13px] text-zinc-300 leading-loose">{lore}</p>
                          ) : (
                              <p className="text-[11px] text-zinc-600 leading-loose">현재 설정된 프롬프트를 바탕으로 이 에셋이 쓰일법한 매력적인 캠페인 타이틀과 분위기를 제안합니다.</p>
                          )}
                      </div>

                  </div>
                </div>
              </div>
            </div>
          )}

          {(isOptimizing || isTranslating || isAnalyzingStyle || isExpandingIntent || isKeywordSetting) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-40 backdrop-blur-sm bg-black/20">
                  <div className="relative mb-6 text-[#76cee0]">
                      <Stars className="w-24 h-24 animate-pulse" /><Loader2 className="w-12 h-12 absolute inset-0 m-auto animate-spin opacity-40" />
                  </div>
                  <p className="text-sm font-black uppercase tracking-[0.4em] text-[#76cee0] text-center px-20">
                      {isKeywordSetting ? 'Configuring Options...' :
                       isExpandingIntent ? 'Expanding Idea...' :
                       isAnalyzingStyle ? 'Analyzing Reference...' :
                       isTranslating ? 'Translating...' : 'Optimizing Prompt...'}
                  </p>
              </div>
          )}
        </div>
      </main>

    </div>
  );

};

export default App;
