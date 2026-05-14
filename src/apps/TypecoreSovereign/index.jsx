import React, { useState, useRef, useEffect } from 'react';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../../lib/firebase';
import { GEMINI_API_KEY } from '../../lib/gemini';
import { useUsageGate } from '../../components/UsageGate';
import { useGlobal } from '../../context/GlobalContext';
import {
  Command, LayoutTemplate, Anchor, Brush, Settings, Activity, Sparkles, Sparkle, Sparkles as SparkleIcon,
  HelpCircle, ChevronDown, Wand, ShieldCheck, FastForward, ArrowDown,
  Sun, Moon, Copy, CheckCircle, RefreshCcw, Loader2, Stars, Info, Save, X, UploadCloud, Upload,
  Cpu, Terminal, Heart, Share2, Download, FileUp, Menu,
  PenTool, Image as ImageIcon, Box as BoxIcon, Link, Zap as ZapPulse, ScanLine, Highlighter,
  Bot, Clapperboard, Layers3, AlignCenter,
  MessageSquare, Play, Edit3, SlidersHorizontal, Crown, Swords, Hexagon, Scale, AlertCircle, Wind, Shield, Lock, Database, Code
} from 'lucide-react';

/**
 * Typecore: Sovereign v18.0.0 (Enterprise Result Control System)
 * SYSTEM SPECIFICATION ARCHITECTURE
 * - Prompt IR (Intermediate Representation) implemented.
 * - Validation Engine now features Auto-Correction (Auto-fixing dangerous parameters).
 * - Purpose-Driven Presets replaced generic game titles.
 * - JSON Recipe Import/Export functionality added.
 * - Global Version Control enforced.
 * - JSX syntax errors and unclosed tags strictly resolved.
 */

const TYPECORE_VERSION = "18.0.0";

const aiOptimizationModels = [
  { id: 'NanoBanana', name: 'Nano Banana 2' },
  { id: 'Midjourney', name: 'Midjourney' },
  { id: 'ChatGPT', name: 'ChatGPT (DALL-E)' }
];

const extractJson = (text) => {
  try {
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    let start, end;
    if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
      start = firstBracket; end = cleaned.lastIndexOf(']');
    } else if (firstBrace !== -1) {
      start = firstBrace; end = cleaned.lastIndexOf('}');
    } else {
      throw new Error("No JSON structure found");
    }
    const jsonStr = cleaned.substring(start, end + 1);
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed[0] : parsed;
  } catch (e) { return {}; }
};

const getOptionEn = (list, id) => {
  if (!Array.isArray(list)) return "";
  const found = list.find(o => o.id === id);
  return found?.en_desc || found?.en || found?.name || "";
};

const getOptionName = (list, id) => {
  if (!Array.isArray(list)) return "";
  const found = list.find(o => o.id === id);
  return found?.name || "";
};

// --- CORE ARCHETYPES (V18 SYSTEM) ---
const coreArchetypes = [
  {
    id: 'core_fortress',
    icon: <Crown className="w-4 h-4 text-amber-400" />,
    shortTitle: "Core / Fortress (성채)",
    subtitle: "거대한 수직 기둥, 압축된 구조",
    role: "Typecore Architect. Focus on impenetrable structural mass.",
    tone: "[장엄/엄숙] 강한 구조적 압력을 강제하는 시스템 명령어 톤.",
    keywords: "monumental, dense fortress, bottom-heavy, architectural",
    language: "dominant vertical pillar rhythm, heavily compressed structural spacing, bottom-heavy mass, impenetrable solid monolith",
    weightTags: "(massive architectural pillar stems:1.4), (impenetrable thick monolithic structure:1.3), (heavily compressed spacing:1.2), bottom-heavy typographic mass",
    forbidden: "NO extreme thin lines. NO fragile/broken elements. NO fluid organic curves."
  },
  {
    id: 'core_blade',
    icon: <Swords className="w-4 h-4 text-rose-400" />,
    shortTitle: "Core / Blade (검날)",
    subtitle: "극단적 얇은 획, 날카로운 절단",
    role: "Typecore Assassin. Focus on lethal geometric precision and sharp incisions.",
    tone: "[전투/예리함] 공간을 분할하는 날카로움을 강제하는 시스템 명령어 톤.",
    keywords: "forged steel, razor-sharp, weaponized typography, slash cuts",
    language: "extreme thick/thin stroke contrast, razor-sharp incisive terminals, space-slashing geometric tension, aggressive lethal cuts",
    weightTags: "(extreme thick-thin stroke contrast:1.4), (razor-sharp blade incisive terminals:1.5), (lethal geometric space-slashing cuts:1.3)",
    forbidden: "NO soft rounded corners. NO heavy blocky mass. NO decorative floral ornaments."
  },
  {
    id: 'core_relic',
    icon: <Database className="w-4 h-4 text-amber-600" />,
    shortTitle: "Core / Relic (유물)",
    subtitle: "균열/침식/마모, 비대칭 구조",
    role: "Typecore Archaeologist. Focus on ancient weathering and asymmetrical history.",
    tone: "[고대/신비] 시간의 풍파와 유기적 손상을 묘사하는 시스템 명령어 톤.",
    keywords: "ancient, weathered, irregular erosion, broken symmetry",
    language: "broken symmetry, irregular historical erosion, ancient structural damage, time-weathered organic imperfections",
    weightTags: "(irregular ancient eroded silhouette:1.4), (time-weathered broken symmetry:1.3), (intricate microscopic cracks and damage:1.2)",
    forbidden: "NO perfectly pristine modern vectors. NO sci-fi futuristic lines. NO flawless symmetry."
  },
  {
    id: 'core_glyph',
    icon: <Hexagon className="w-4 h-4 text-indigo-400" />,
    shortTitle: "Core / Glyph (문장)",
    subtitle: "문자 → 문양화, 내부 공간 폐쇄",
    role: "Typecore Symbologist. Focus on converting text into a unified emblem seal.",
    tone: "[주술/상징] 문자를 하나의 엠블럼 덩어리로 융합하는 시스템 명령어 톤.",
    keywords: "symbolic, emblem fusion, closed counters, esoteric",
    language: "closed internal counters, emblem-like symbolic fusion, highly codified abstract letterforms, impenetrable typographic seal",
    weightTags: "(highly fused symbolic emblem structure:1.5), (closed internal negative space counters:1.3), abstract typographic seal",
    forbidden: "NO widely separated letters. NO loose airy spacing. NO simple handwriting."
  },
  {
    id: 'core_kinetic',
    icon: <Wind className="w-4 h-4 text-sky-400" />,
    shortTitle: "Core / Kinetic (동세)",
    subtitle: "흐름/방향성, 비대칭 리듬",
    role: "Typecore Animator. Focus on implied velocity and directional momentum.",
    tone: "[역동/속도] 움직임의 궤적과 비대칭 텐션을 강제하는 시스템 명령어 톤.",
    keywords: "fluid, directional momentum, aerodynamic, velocity",
    language: "aggressive directional momentum, fluid asymmetric rhythm, velocity-implied trailing structures, dynamic sweeping flow",
    weightTags: "(aggressive forward directional momentum:1.4), (fluid asymmetric trailing rhythm:1.3), aerodynamic swept-back structure",
    forbidden: "NO static perfectly vertical alignment. NO stiff blocky stability."
  }
];

const sliderDesc = { leftLabel: "무게감 (Mass)", rightLabel: "예리함 (Sharpness)", leftDesc: "거대 암석 같은 묵직한 실루엣", rightDesc: "공간을 베어내는 듯한 예리함" };

const getSliderText = (val) => {
  if (val < 35) return `(extreme heavy mass and solid monumentality:1.3)`;
  if (val > 65) return `(extreme razor-sharp incisive edges:1.3)`;
  return `balanced equilibrium between mass and sharpness`;
};

// --- SAFETY GUARDS ---
const safetyGuards = [
  { id: 'guard_mutation', label: '[L1] 텍스트 보존 락', desc: '원문 100% 유지. 철자 누락/변형 절대 금지.', fixEn: '(perfectly intact text legibility:1.4), (100% correct spelling:1.5), absolutely NO missing letters' },
  { id: 'guard_3d', label: '[L6] 2D 평면 강제 락', desc: '뎁스, 베벨, 그림자 생성 원천 차단.', fixEn: '(strictly zero perspective distortion:1.5), (flat focal plane:1.4), absolutely NO rear extrusion' },
  { id: 'guard_layout', label: '[L2] 세로 붕괴 방지 락', desc: '세로 찌그러짐/늘어남 방지. 1:1 골격 강제.', fixEn: '(strictly normal horizontal text proportions:1.5), (perfect text baseline:1.4), NO vertical stretching, NO tall letters' },
  { id: 'guard_noise', label: '[L7] VFX 억제 락', desc: '실루엣을 해치는 부유물 및 파편 제거.', fixEn: '(clear cutout text shape:1.4), (flawless outer silhouette boundary:1.3), NO floating noise' }
];

const staticOptions = {
  // Purpose-Driven Presets (V18)
  purposes: [
    { id: "Purpose_GameLogo", name: "게임 메인 로고형", en: "AAA Game Title Logo", layout: "Center", ratio: "16:9", occ: "50%", core: "core_fortress", frame: "Emblem" },
    { id: "Purpose_BrandHero", name: "브랜드사이트 히어로형", en: "Brand Hero Title", layout: "1Line", ratio: "2.76:1", occ: "40%", core: "core_fortress", frame: "Horizontal" },
    { id: "Purpose_PromoVisual", name: "프로모션 상단 비주얼", en: "Promotion Top Visual", layout: "TitleSub", ratio: "16:9", occ: "65%", core: "core_kinetic", frame: "Expanded" },
    { id: "Purpose_EventTitle", name: "이벤트 강렬한 타이틀", en: "High-impact Event Title", layout: "2Lines", ratio: "1:1", occ: "80%", core: "core_blade", frame: "Compressed" },
    { id: "Purpose_Symbol", name: "심볼 / 엠블럼형", en: "Symbolic Emblem", layout: "Center", ratio: "1:1", occ: "65%", core: "core_glyph", frame: "Emblem" }
  ],
  base: [ { id: "BlackWhite", name: "블랙 / 화이트", en: "JET BLACK Background, RADIANT WHITE Subject" }, { id: "WhiteBlack", name: "화이트 / 블랙", en: "STARK WHITE Background, SOLID BLACK Subject" } ],
  ratios: [ { id: "16:9", name: "16:9 와이드", en: "16:9" }, { id: "1:1", name: "1:1 스퀘어", en: "1:1" }, { id: "9:16", name: "9:16 세로형", en: "9:16" }, { id: "2.76:1", name: "2.76:1 시네마틱", en: "2.76:1" } ],
  occupancies: [
    { id: "40%", name: "40% 억제", en: "(massive empty void surrounding the text:1.6), (small typography strictly confined to center:1.5), vast negative space margins" },
    { id: "50%", name: "50% 표준", en: "(generous negative space margins:1.3), perfectly centered balanced layout" },
    { id: "65%", name: "65% 확장", en: "moderate margins, screen filling text layout" },
    { id: "80%", name: "80% 최대", en: "(extreme tight margins:1.4), (massive text pushing canvas edges:1.4)" }
  ],
  layouts: [ { id: "1Line", name: "1줄 수평 강제", en: "single horizontal row typography" }, { id: "2Lines", name: "2줄 상하 정렬", en: "Two-tier vertical stacked composition." }, { id: "TitleSub", name: "메인(상) + 서브(하)", en: "Hierarchical composition. Main title on top." }, { id: "SubTitle", name: "서브(상) + 메인(하)", en: "Hierarchical composition. Subtitle on top." }, { id: "Center", name: "중앙 집중형", en: "Centralized balanced composition." } ],
  subTitleSizes: [ { id: "Sub_Small", name: "소형 (30%)", en: "Subtitle is strictly 30% scale." }, { id: "Sub_Medium", name: "중형 (50%)", en: "Subtitle is strictly 50% scale." }, { id: "Sub_Large", name: "대형 (70%)", en: "Subtitle is strictly 70% scale." }, { id: "Sub_Equal", name: "동일 크기", en: "Both rows have equal font scale." } ],
  proportions: [
    { id: "P_Std", name: "기본형 (정방형)", en: "(perfectly square letterform skeleton:1.5), (natural horizontal text proportions:1.4)" },
    { id: "P_Condensed", name: "압축형 (세로장평)", en: "condensed tall aspect ratio, narrow vertical stems" },
    { id: "P_Extended", name: "확장형 (가로장평)", en: "(extended wide panoramic letterforms:1.5), heavily stretched horizontally" }
  ],
  MMOSilhouetteFramings: [ { id: "Auto", name: "자동", en: "Automatic silhouette framing" }, { id: "Horizontal", name: "수평형", en: "Strict horizontal alignment framing" }, { id: "Compressed", name: "압축형", en: "Tightly compressed inner structure framing" }, { id: "Expanded", name: "확장형", en: "Outwardly expanded wing-like framing" }, { id: "Emblem", name: "엠블럼형", en: "Cohesive unified emblem framing" } ],
  MMOSurroundingElements: [ { id: "Clean", name: "없음", en: "NO surrounding VFX, perfectly clean canvas" }, { id: "FloatingRunes", name: "부유하는 룬", en: "Floating geometric runes around text" }, { id: "Shattered", name: "파괴된 파편", en: "Shattered stone and metal debris floating" }, { id: "RadialSpikes", name: "마법 방사선", en: "Sharp radial energy spikes" } ],
  stemWeights: [ { id: "Stem_Light", name: "가벼움", en: "light razor thin stems" }, { id: "Stem_Std", name: "표준", en: "medium balanced stems" }, { id: "Stem_Heavy", name: "묵직함", en: "heavy thick stems" }, { id: "Stem_Ultra", name: "초중량", en: "massive ultra heavy block stems" } ],
  letterConnections: [ { id: "Conn_Indep", name: "독립형", en: "Cleanly separated individual characters" }, { id: "Conn_Tight", name: "밀착형", en: "Tightly packed characters" }, { id: "Conn_Partial", name: "부분 결합", en: "Partially merged letter structures" }, { id: "Conn_Full", name: "완전 결합", en: "Fully fused typographic emblem" } ],
  internalSpaces: [ { id: "Space_Loose", name: "여유", en: "Spacious internal negative space counters" }, { id: "Space_Std", name: "표준", en: "Standard internal space" }, { id: "Space_Dense", name: "조밀", en: "Dense complex internal structures" }, { id: "Space_Closed", name: "폐쇄적", en: "Closed solid internal mass, completely filled counters" } ],
  logoDegrees: [ { id: "Logo_Low", name: "텍스트 중심", en: "Text-focused typography" }, { id: "Logo_Std", name: "표준 로고타입", en: "Standard logotype" }, { id: "Logo_High", name: "강한 로고화", en: "Highly stylized logotype" }, { id: "Logo_Emblem", name: "완전 엠블럼형", en: "Unified emblem structure" } ],
  kerningOptions: [ { id: "Kern_Loose", name: "여유 (+여백)", en: "wide loose spacing" }, { id: "Kern_Std", name: "표준", en: "standard balanced kerning" }, { id: "Kern_Tight", name: "타이트 (-여백)", en: "tight kerning" }, { id: "Kern_Overlap", name: "초밀착 (오버랩)", en: "high density overlapping letters" } ],
  terminalStyles: [ { id: "Term_Clean", name: "단면형 (Clean)", en: "clean flat terminals" }, { id: "Term_Chisel", name: "조각형 (Chisel)", en: "sharp chisel-cut terminals" }, { id: "Term_Blade", name: "칼날형 (Blade)", en: "razor blade tips" }, { id: "Term_Slab", name: "석판형 (Slab)", en: "heavy slab serifs" }, { id: "Term_Flare", name: "플레어", en: "elegant flared terminals" }, { id: "Term_Round", name: "라운드", en: "smooth rounded terminals" }, { id: "Term_Serif", name: "세리프", en: "classic serif" }, { id: "Term_Thorn", name: "가시 삐침", en: "sharp thorn terminals" }, { id: "Term_Claw", name: "악마 발톱", en: "demonic claw terminals" }, { id: "Term_BrushFray", name: "필선형 (Brush)", en: "frayed brush terminals" } ],
  strokeTextures: [ { id: "Tex_Clean", name: "완전 매끄러움", en: "perfectly smooth pristine vector surface" }, { id: "Tex_Frayed", name: "필선 갈라짐", en: "frayed ink texture" }, { id: "Tex_Scorched", name: "탄화된 필선", en: "scorched etched texture" }, { id: "Tex_Subtle", name: "미세 침식", en: "subtle weathered micro-erosion" }, { id: "Tex_DryBrush", name: "건조한 붓결", en: "dry brush strokes" } ],
  strokeSharpness: [ { id: "Sharp_Soft", name: "부드러움", en: "softened edges" }, { id: "Sharp_Std", name: "표준", en: "crisp clean edges" }, { id: "Sharp_Crisp", name: "날카로움", en: "sharp clean lines" }, { id: "Sharp_Razor", name: "극예리", en: "micro-chiseled razor-sharp edges" } ],
  strokeExtensions: [ { id: "Ext_None", name: "연장 없음", en: "contained terminals" }, { id: "Ext_Elegant", name: "유려한 연장", en: "elegant tapered extensions" }, { id: "Ext_Razor", name: "날카로운 끝단", en: "razor-sharp stroke tails" }, { id: "Ext_Infinite", name: "무한 확장", en: "hyper-extended stroke ends" } ],
  kineticVelocities: [ { id: "Vel_Static", name: "정중동 (Static)", en: "perfectly still, static form" }, { id: "Vel_Swift", name: "질주 (Swift)", en: "dynamic forward momentum" }, { id: "Vel_Slashing", name: "격베기 (Slashing)", en: "aggressive slashing momentum" } ],
  slantAngles: [ { id: "Slant_0", name: "0도 (수직)", en: "perfect verticality" }, { id: "Slant_Forward", name: "15도 (기울기)", en: "15-degree dynamic slant" }, { id: "Slant_Extreme", name: "25도 (급격함)", en: "Aggressive 25-degree slant" } ],
  slicingIntensities: [ { id: "Slic_None", name: "절단 없음", en: "intact strokes" }, { id: "Slic_Partial", name: "부분 절단", en: "micro-incisions and structural cuts" }, { id: "Slic_Diagonal", name: "사선 절단", en: "diagonal slicing" }, { id: "Slic_Deep", name: "깊은 절단", en: "deep structural severance" }, { id: "Slic_Total", name: "전체 절단", en: "massive severance" } ],
  cornerStyles: [ { id: "Corner_Right", name: "직각", en: "sharp 90-degree right-angle corners" }, { id: "Corner_Round", name: "둥근형", en: "smooth rounded corners" }, { id: "Corner_Wedge", name: "쐐기형", en: "wedge-shaped corners" }, { id: "Corner_Blade", name: "칼날형", en: "blade-like pointed corners" } ],
  deformationDamages: [ { id: "Damage_None", name: "상태 깨끗함", en: "pristine solid form, zero damage" }, { id: "Damage_Erosion", name: "미세 침식", en: "subtle weathered erosion" }, { id: "Damage_Cracking", name: "균열과 실금", en: "intricate 2D cracks" } ],
  widths: [ { id: "Narrow", name: "좁게", en: "condensed slim width" }, { id: "Normal", name: "표준", en: "standard balanced width" }, { id: "Wide", name: "넓게", en: "wide expansive width" }, { id: "UltraWide", name: "초광폭", en: "ultra wide panoramic width" } ],
  editStrokeMods: [ { id: "E_Stroke_None", name: "기본 유지", en: "Keep original stroke intact" }, { id: "E_Stroke_Angled", name: "꺾임/예리함 강조", en: "Sharpen joints and emphasize jagged edges" }, { id: "E_Stroke_Extended", name: "연장 라인 추가", en: "Pull and extend key stroke terminals" }, { id: "E_Stroke_Thickened", name: "두께 대비 극대화", en: "Exaggerate thick/thin stroke contrast" } ],
  editElementMods: [ { id: "E_Elem_None", name: "기본 유지", en: "Maintain original structure" }, { id: "E_Elem_Object", name: "오브제화/무기화", en: "Morph focal letters into weapons/objects" }, { id: "E_Elem_Rhythm", name: "유기적 리듬감", en: "Inject rhythmic flow and bounce" }, { id: "E_Elem_Disconnect", name: "의도적 단절", en: "Introduce micro-gaps for fragmentation" } ],
  editSurfaceMods: [ { id: "E_Surf_None", name: "기본 유지", en: "Keep flat surface" }, { id: "E_Surf_Speed", name: "속도감 텍스처", en: "Apply directional motion scratches" }, { id: "E_Surf_Dry", name: "부식/거친 질감", en: "Apply heavy weathered erosion" }, { id: "E_Surf_Crystalline", name: "결정/파편화", en: "Render crystalline shattered debris" } ]
};

const SectionHeader = ({ id, label, icon }) => (
  <div className="flex items-center gap-2 pl-1 text-[#a6a6a6] relative mt-4 first:mt-0 transition-all duration-700">
    {icon}
    <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#a6a6a6]">{id} {label}</h3>
  </div>
);

const DropdownControl = ({ label, icon, data = [], value, onChange, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = data.find(o => o.id === value) || data[0] || { name: 'None', en: '' };

  return (
    <div className={`space-y-1.5 relative transition-all duration-300 ${disabled ? 'opacity-40 grayscale pointer-events-none' : ''} ${isOpen ? 'z-[9999]' : 'z-10'}`} ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between pl-1">
          <p className="text-[11px] font-bold tracking-tight flex items-center gap-1.5 text-zinc-400">
            {icon} {label}
          </p>
        </div>
      )}
      <button onClick={(e) => { e.preventDefault(); if(!disabled) setIsOpen(!isOpen); }} title={selectedOption?.en} className="w-full flex items-center justify-between px-3 py-2.5 rounded-[8px] border transition-all bg-[#0A0A0A] border-zinc-800 hover:border-zinc-600 outline-none shadow-sm">
        <span className="text-[12px] font-bold truncate text-zinc-200 tracking-tight">{selectedOption?.name || 'None'}</span>
        <ChevronDown className="w-4 h-4 text-zinc-500" />
      </button>
      {isOpen && (
        <div className="nx-popover-panel absolute left-0 w-full mt-1 max-h-[250px] overflow-y-auto z-[9999] custom-scrollbar py-1">
          {data.map(opt => (
             <button key={opt.id} onClick={() => { onChange(opt.id); setIsOpen(false); }} title={opt.en} className={`nx-popover-item ${value === opt.id ? 'is-active' : ''}`}>
                <span>{opt.name}</span>
             </button>
          ))}
        </div>
      )}
    </div>
  );
};

const OptionGroupCard = ({ id, title, icon, summary, children, openCardId, onToggle }) => {
  const isOpen = openCardId === id;
  return (
    <div className={`rounded-[10px] border shadow-sm mb-3 transition-all duration-300 relative hover:z-[100] focus-within:z-[100] ${isOpen ? 'z-40 border-indigo-500/30 bg-[#16161E]' : 'z-10 border-zinc-800/80 bg-[#121212] hover:border-zinc-700'}`}>
      <button onClick={(e) => { e.preventDefault(); onToggle(id); }} className="w-full flex items-center justify-between p-4 transition-colors outline-none rounded-[10px] bg-transparent cursor-pointer">
        <div className="flex flex-col items-start gap-1 text-left flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 text-[12px] font-bold text-zinc-100 tracking-wide w-full">
            {icon} {title}
          </div>
          {!isOpen && summary && <div className="text-[11px] text-zinc-500 font-medium ml-6 truncate w-full">{summary}</div>}
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 text-indigo-400' : 'text-zinc-500'}`} />
      </button>
      <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1500px] opacity-100 overflow-visible' : 'max-h-0 opacity-0 overflow-hidden'}`}>
         <div className="px-4 pb-4">
           <div className={`pt-3 border-t space-y-4 ${isOpen ? 'border-indigo-500/20' : 'border-zinc-800/50'}`}>
             {children}
           </div>
         </div>
      </div>
    </div>
  );
};

const App = () => {
  // 1. Context & Global States
  const apiKey = GEMINI_API_KEY;
  const { ensureCanGenerate, modal: usageModal } = useUsageGate();
  const { payload, clearPayload } = useGlobal();
  const [incomingFromArc, setIncomingFromArc] = useState(null); // { from, hasImage, text }
  const consumedPayloadRef = useRef(null);
  const [theme] = useState("dark");
  const [currentView, setCurrentView] = useState("editor");
  const isEditMode = currentView === 'edit';

  const [activeModel, setActiveModel] = useState("NanoBanana");
  const [activeEditModel, setActiveEditModel] = useState("NanoBanana");
  const currentModel = isEditMode ? activeEditModel : activeModel;

  const setModel = (m) => {
    if (isEditMode) setActiveEditModel(m);
    else setActiveModel(m);
  };

  // 2. Local Setup States
  const [inputText, setInputText] = useState("데스나이트");
  const [base64Image, setBase64Image] = useState(null);

  const [activePurpose, setActivePurpose] = useState('Purpose_GameLogo');
  const [coreArchetype, setCoreArchetype] = useState('core_fortress');
  const [coreDropdownOpen, setCoreDropdownOpen] = useState(false);

  const [isAdvancedOptionsEnabled, setIsAdvancedOptionsEnabled] = useState(false);
  const [isEnhanceModeEnabled, setIsEnhanceModeEnabled] = useState(true);
  const [enhanceMode, setEnhanceMode] = useState("refine");
  const [momentumActive, setMomentumActive] = useState(false);
  const [personaSliderValue, setPersonaSliderValue] = useState(50);

  const [baseStyle, setBaseStyle] = useState("BlackWhite");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [occupancy, setOccupancy] = useState("50%");
  const [layoutType, setLayoutType] = useState("Center");
  const [layoutPreset, setLayoutPreset] = useState("CenterLogo");
  const [stemWeight, setStemWeight] = useState("Stem_Heavy");
  const [charWidth, setCharWidth] = useState("Normal");
  const [charProportion, setCharProportion] = useState("P_Std");
  const [kerning, setKerning] = useState("Kern_Std");
  const [subTitleSize, setSubTitleSize] = useState("Sub_Small");

  const [terminalStyle, setTerminalStyle] = useState("Term_Chisel");
  const [strokeTexture, setStrokeTexture] = useState("Tex_Clean");
  const [strokeSharpness, setStrokeSharpness] = useState("Sharp_Std");
  const [strokeExtension, setStrokeExtension] = useState("Ext_None");
  const [cornerStyle, setCornerStyle] = useState("Corner_Right");
  const [slantAngle, setSlantAngle] = useState("Slant_0");
  const [kineticVelocity, setKineticVelocity] = useState("Vel_Static");
  const [slicingIntensity, setSlicingIntensity] = useState("Slic_None");
  const [deformationDamage, setDeformationDamage] = useState("Damage_None");

  const [letterConnection, setLetterConnection] = useState("Conn_Indep");
  const [internalSpace, setInternalSpace] = useState("Space_Std");
  const [logoDegree, setLogoDegree] = useState("Logo_Std");

  const [mmoSilhouetteFraming, setMmoSilhouetteFraming] = useState("Emblem");
  const [mmoSurroundingElement, setMmoSurroundingElement] = useState("Clean");

  const [dynamicOptions, setDynamicOptions] = useState({
    strokeTextures: [], deformationDamages: [], terminalStyles: [], stemWeights: [],
    strokeSharpness: [], cornerStyles: [], widths: [], kerningOptions: [], kineticVelocities: [], slicingIntensities: [],
    editStrokeMods: [], editElementMods: [], editSurfaceMods: [], strokeExtensions: [], letterConnections: [], internalSpaces: [], logoDegrees: [], MMOSilhouetteFramings: [], MMOSurroundingElements: []
  });

  const [customDesignInjections, setCustomDesignInjections] = useState("");

  // Prompt Output States
  const [dramaticPrompt, setDramaticPrompt] = useState("");
  const [mjOptimizedPrompt, setMjOptimizedPrompt] = useState("");
  const [cgEnhancedPrompt, setCgEnhancedPrompt] = useState("");
  const [editDramaticPrompt, setEditDramaticPrompt] = useState("");
  const [editMjPrompt, setEditMjPrompt] = useState("");
  const [editCgPrompt, setEditCgPrompt] = useState("");

  const [aiRecSummary, setAiRecSummary] = useState(null);

  // Loading & View States
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isMjOptimizing, setIsMjOptimizing] = useState(false);
  const [isCgEnhancing, setIsCgEnhancing] = useState(false);
  const [isExpandingIntent, setIsExpandingIntent] = useState(false);
  const [isRecommending, setIsRecommending] = useState(false);

  const [isEditEnhancing, setIsEditEnhancing] = useState(false);
  const [isEditMjOptimizing, setIsEditMjOptimizing] = useState(false);
  const [isEditCgEnhancing, setIsEditCgEnhancing] = useState(false);
  const [isEditExpandingIntent, setIsEditExpandingIntent] = useState(false);

  const [copiedTop, setCopiedTop] = useState(false);
  const [copiedBottom, setCopiedBottom] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Modals & Panels
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importInputValue, setImportInputValue] = useState("");

  const [activeGuards, setActiveGuards] = useState(['guard_mutation', 'guard_3d', 'guard_layout', 'guard_noise']);

  // File Upload States
  const [creationUploadedImage, setCreationUploadedImage] = useState(null);
  const [isCreationDragging, setIsCreationDragging] = useState(false);
  const [isAnalyzingCreation, setIsAnalyzingCreation] = useState(false);

  const [editUploadedImage, setEditUploadedImage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const [editInstruction, setEditInstruction] = useState("");
  const [applyAiRecInEdit, setApplyAiRecInEdit] = useState(false);
  const [applyAutoRefine, setApplyAutoRefine] = useState(false);

  const [editStrokeMod, setEditStrokeMod] = useState("E_Stroke_None");
  const [editElementMod, setEditElementMod] = useState("E_Elem_None");
  const [editSurfaceMod, setEditSurfaceMod] = useState("E_Surf_None");

  const [openCardId, setOpenCardId] = useState("layout");
  const [editOpenCardId, setEditOpenCardId] = useState("edit_retouch");

  const [isOutdated, setIsOutdated] = useState(false);
  const [isEditOutdated, setIsEditOutdated] = useState(false);

  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const [isEditPromptExpanded, setIsEditPromptExpanded] = useState(false);

  const [isTuningModalOpen, setIsTuningModalOpen] = useState(false);
  const [isEditTuningModalOpen, setIsEditTuningModalOpen] = useState(false);
  const [tuningChatHistory, setTuningChatHistory] = useState([]);
  const [editTuningChatHistory, setEditTuningChatHistory] = useState([]);
  const [tuningInputValue, setTuningInputValue] = useState("");
  const [editTuningInputValue, setEditTuningInputValue] = useState("");
  const [isTuningLoading, setIsTuningLoading] = useState(false);
  const [isEditTuningLoading, setIsEditTuningLoading] = useState(false);
  const [currentTunedAura, setCurrentTunedAura] = useState("");
  const [currentTunedEditAura, setCurrentTunedEditAura] = useState("");

  const [tuningReferenceImage, setTuningReferenceImage] = useState(null);
  const [editTuningReferenceImage, setEditTuningReferenceImage] = useState(null);

  const moodImageRef = useRef(null);
  const tuningChatRef = useRef(null);
  const editTuningChatRef = useRef(null);

  const t = {
    bg: theme === 'dark' ? 'bg-[#0A0A0A]' : 'bg-zinc-200',
    textColor: theme === 'dark' ? 'text-zinc-100' : 'text-zinc-900',
  };

  // Derivative States
  const isPromptOutdated = isEditMode ? isEditOutdated : isOutdated;
  const isExpanded = isEditMode ? isEditPromptExpanded : isPromptExpanded;
  const setExpanded = isEditMode ? setIsEditPromptExpanded : setIsPromptExpanded;

  const handleToggleCard = (id) => setOpenCardId(prev => prev === id ? null : id);
  const handleEditToggleCard = (id) => setEditOpenCardId(prev => prev === id ? null : id);

  // 글자수 5자 이상 시 자동 시네마틱 강제 전환
  useEffect(() => {
    const textLen = inputText.replace(/\s/g, '').length;
    if (textLen >= 5 && layoutType !== "1Line") {
      setLayoutType("1Line");
      setAspectRatio("2.76:1");
      setOccupancy("40%");
      setMmoSilhouetteFraming("Horizontal");
    }
  }, [inputText]);

  // Change Detection
  useEffect(() => { setIsOutdated(true); }, [activePurpose, coreArchetype, personaSliderValue, inputText, customDesignInjections, isEnhanceModeEnabled, enhanceMode, momentumActive, baseStyle, aspectRatio, occupancy, layoutType, stemWeight, charWidth, charProportion, kerning, subTitleSize, terminalStyle, strokeTexture, strokeSharpness, strokeExtension, cornerStyle, slantAngle, kineticVelocity, slicingIntensity, deformationDamage, letterConnection, internalSpace, logoDegree, mmoSilhouetteFraming, mmoSurroundingElement, isAdvancedOptionsEnabled, activeGuards]);

  useEffect(() => { setIsEditOutdated(true); }, [activePurpose, coreArchetype, personaSliderValue, editInstruction, editUploadedImage, applyAiRecInEdit, applyAutoRefine, isEnhanceModeEnabled, enhanceMode, momentumActive, layoutType, subTitleSize, kineticVelocity, slantAngle, deformationDamage, slicingIntensity, editStrokeMod, editElementMod, editSurfaceMod, mmoSilhouetteFraming, mmoSurroundingElement, cornerStyle, activeGuards]);

  // Auth is owned by the platform-wide AuthProvider (src/context/AuthContext.jsx).
  // This app must not call signInAnonymously / onAuthStateChanged — doing so
  // would replace the real signed-in user with an anonymous one and bounce
  // them to the pending-approval screen.

  useEffect(() => { if (tuningChatRef.current) tuningChatRef.current.scrollTop = tuningChatRef.current.scrollHeight; }, [tuningChatHistory, isTuningLoading]);
  useEffect(() => { if (editTuningChatRef.current) editTuningChatRef.current.scrollTop = editTuningChatRef.current.scrollHeight; }, [editTuningChatHistory, isEditTuningLoading]);

  const toggleGuard = (id) => setActiveGuards(prev => prev.includes(id) ? prev.filter(guardId => guardId !== id) : [...prev, id]);

  const hasKoreanAura = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(customDesignInjections);
  const hasKoreanEdit = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(editInstruction);

  const handlePurposeChange = (presetId) => {
    setActivePurpose(presetId);
    const p = staticOptions.purposes.find(o => o.id === presetId);
    if(p) {
        setLayoutType(p.layout);
        setAspectRatio(p.ratio);
        setOccupancy(p.occ);
        setCoreArchetype(p.core);
        setMmoSilhouetteFraming(p.frame);
    }
  };

  // V18 Validation Engine
  const getValidationScores = () => {
    let shapeIntegrity = 100, legibility = 100, styleConsistency = 100, layoutStability = 100, conflicts = [];

    if (isEnhanceModeEnabled) {
      if (enhanceMode === 'variation') { shapeIntegrity -= 20; legibility -= 15; }
      if (enhanceMode === 'deconstruct') { shapeIntegrity -= 45; legibility -= 45; layoutStability -= 10; }
    }

    if (kineticVelocity !== 'Vel_Static') { shapeIntegrity -= 10; styleConsistency -= 5; layoutStability -= 10; }
    if (kineticVelocity === 'Vel_Slashing') { shapeIntegrity -= 15; legibility -= 10; layoutStability -= 15; }
    if (momentumActive) { shapeIntegrity -= 20; legibility -= 15; styleConsistency -= 10; layoutStability -= 15; }
    if (slicingIntensity !== 'Slic_None') { shapeIntegrity -= 15; legibility -= 15; }
    if (slicingIntensity === 'Slic_Deep' || slicingIntensity === 'Slic_Total') { shapeIntegrity -= 35; legibility -= 30; }

    if (kerning === 'Kern_Overlap') { legibility -= 20; shapeIntegrity -= 10; }
    if (letterConnection === 'Conn_Full') { legibility -= 15; shapeIntegrity -= 15; }

    if (deformationDamage !== 'Damage_None') { shapeIntegrity -= 5; layoutStability -= 10; styleConsistency -= 5; }
    if (deformationDamage === 'Damage_Cracking') { legibility -= 10; layoutStability -= 15; }
    if (strokeTexture !== 'Tex_Clean') { styleConsistency -= 10; layoutStability -= 10; }
    if (mmoSurroundingElement !== 'Clean') { layoutStability -= 20; legibility -= 5; }

    shapeIntegrity = Math.max(0, Math.min(100, shapeIntegrity)); legibility = Math.max(0, Math.min(100, legibility));
    styleConsistency = Math.max(0, Math.min(100, styleConsistency)); layoutStability = Math.max(0, Math.min(100, layoutStability));

    if (shapeIntegrity < 50) conflicts.push({ level: '치명적 위험', rule: '형태 원형 붕괴 (Shape Drift)', action: '텍스트 보존 락 활성화 및 해체 모드 해제', fixId: 'fix_shape' });
    if (legibility < 55) conflicts.push({ level: '경고', rule: '가독성 하한선 도달 (Legibility Breach)', action: '자간 확보 및 절단 강도 완화', fixId: 'fix_legibility' });
    if (styleConsistency < 80 && !activeGuards.includes('guard_3d')) conflicts.push({ level: '경고', rule: '입체(3D) 발생 가능성', action: '[L6] 2D 평면 강제 락 활성화', fixId: 'fix_3d' });
    if (layoutStability < 60 && !activeGuards.includes('guard_noise')) conflicts.push({ level: '경고', rule: '실루엣 간섭 및 노이즈', action: '[L7] VFX 억제 락 활성화', fixId: 'fix_noise' });

    if ((layoutType === '2Lines' || layoutType === 'TitleSub' || layoutType === 'SubTitle') && !activeGuards.includes('guard_layout')) {
       conflicts.push({ level: '경고', rule: '세로 붕괴(Squishing) 위험', action: '[L2] 세로 붕괴 락 활성화', fixId: 'fix_squish' });
    }

    return { shapeIntegrity, legibility, styleConsistency, layoutStability, conflicts };
  };

  const executeAutoCorrection = (fixId) => {
      let newGuards = [...activeGuards];
      if (fixId === 'fix_shape') {
          setEnhanceMode('refine');
          if(!newGuards.includes('guard_mutation')) newGuards.push('guard_mutation');
      }
      if (fixId === 'fix_legibility') {
          if (slicingIntensity === 'Slic_Deep' || slicingIntensity === 'Slic_Total') setSlicingIntensity('Slic_Partial');
          if (kerning === 'Kern_Overlap') setKerning('Kern_Std');
          if(!newGuards.includes('guard_mutation')) newGuards.push('guard_mutation');
      }
      if (fixId === 'fix_3d' && !newGuards.includes('guard_3d')) newGuards.push('guard_3d');
      if (fixId === 'fix_noise' && !newGuards.includes('guard_noise')) newGuards.push('guard_noise');
      if (fixId === 'fix_squish' && !newGuards.includes('guard_layout')) newGuards.push('guard_layout');

      setActiveGuards(newGuards);
      setIsOutdated(true);
      setIsEditOutdated(true);
  };

  const handleApplyAllCorrections = () => {
      const scores = getValidationScores();
      scores.conflicts.forEach(c => executeAutoCorrection(c.fixId));
  };

  const renderScoreBar = (label, score, color) => (
    <div className="flex flex-col gap-1.5 mb-3">
      <div className="flex justify-between items-center text-[11px] tracking-tight">
        <span className="text-zinc-400 uppercase font-bold">{label}</span>
        <span style={{ color }} className="font-bold">{score}%</span>
      </div>
      <div className="w-full bg-[#0A0A0A] h-1.5 rounded-full overflow-hidden border border-zinc-800/50">
        <div className="h-full transition-all duration-500" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
    </div>
  );

  const renderOverviewTab = () => {
    const scores = getValidationScores();
    return (
      <div className="space-y-6 animate-in fade-in duration-300 mt-6">
         <div className="bg-[#121212] border border-zinc-800/80 rounded-[12px] shadow-sm flex flex-col md:flex-row overflow-hidden">

            {/* Validation Dashboard */}
            <div className="w-full md:w-1/2 p-6 border-b md:border-b-0 md:border-r border-zinc-800/80 bg-[#171717] relative">
               <div className="flex items-center gap-2 mb-6">
                  <Database className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-[13px] font-bold text-zinc-200 uppercase tracking-widest">시스템 검증 엔진</h3>
               </div>
               <div className="space-y-4">
                  {renderScoreBar("Shape Integrity (형태 무결성)", scores.shapeIntegrity, "#3b82f6")}
                  {renderScoreBar("Legibility (가독성 보존)", scores.legibility, "#10b981")}
                  {renderScoreBar("Style Consistency (스타일 일관성)", scores.styleConsistency, "#a855f7")}
                  {renderScoreBar("Layout Stability (레이아웃 안정성)", scores.layoutStability, "#f59e0b")}
               </div>
            </div>

            {/* Conflict Resolution Log & Auto Correction */}
            <div className="w-full md:w-1/2 p-6 bg-[#0A0A0A] relative flex flex-col">
               <div className="flex items-center gap-2 mb-6 shrink-0">
                  <Terminal className="w-4 h-4 text-rose-400" />
                  <h3 className="text-[13px] font-bold text-zinc-200 uppercase tracking-widest">시스템 로그 및 충돌 해결</h3>
               </div>
               <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
                  {scores.conflicts.map((c, idx) => (
                     <div key={idx} className={`p-3.5 rounded-[8px] border text-[11px] flex flex-col gap-2.5 shadow-inner ${c.level === '치명적 위험' ? 'bg-rose-500/10 border-rose-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                        <div className="flex items-center justify-between">
                           <span className={`font-bold ${c.level === '치명적 위험' ? 'text-rose-400' : 'text-amber-400'}`}>[{c.level}] {c.rule}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-zinc-400">조치 권고: {c.action}</span>
                            <button onClick={() => executeAutoCorrection(c.fixId)} className={`px-2.5 py-1 rounded-[4px] font-bold transition-colors ${c.level === '치명적 위험' ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}>보정</button>
                        </div>
                     </div>
                  ))}
                  {scores.conflicts.length === 0 && (
                     <div className="p-3.5 rounded-[8px] border border-emerald-500/20 bg-emerald-500/10 text-[11px] flex flex-col gap-1 shadow-inner">
                        <span className="font-bold text-emerald-400">[검증 완료] 모든 파라미터 정상 조화</span>
                        <span className="text-zinc-400">파라미터 간 논리적 충돌이 발견되지 않았습니다. 즉시 컴파일 가능합니다.</span>
                     </div>
                  )}
               </div>
               {scores.conflicts.length > 0 && (
                   <div className="mt-4 pt-4 border-t border-zinc-800/60 shrink-0">
                       <button onClick={handleApplyAllCorrections} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[8px] text-[12px] font-bold transition-colors flex items-center justify-center gap-2">
                           <Wand className="w-4 h-4"/> 추천 안전 모드로 일괄 보정
                       </button>
                   </div>
               )}
            </div>
         </div>
      </div>
    );
  };

  const updateDynamic = (key, val) => {
    if (val && typeof val === 'object' && val.id && val.name) {
      setDynamicOptions(prev => {
        const exists = prev[key]?.find(o => o.id === val.id);
        if (!exists) return { ...prev, [key]: [...(prev[key] || []), val] };
        return prev;
      });
      return val.id;
    }
    return val && typeof val === 'object' ? val.id || val : val;
  };

  const handleReset = () => {
    setDynamicOptions({ strokeTextures: [], deformationDamages: [], terminalStyles: [], stemWeights: [], strokeSharpness: [], cornerStyles: [], widths: [], kerningOptions: [], kineticVelocities: [], slicingIntensities: [], editStrokeMods: [], editElementMods: [], editSurfaceMods: [], strokeExtensions: [], letterConnections: [], internalSpaces: [], logoDegrees: [], MMOSilhouetteFramings: [], MMOSurroundingElements: [] });
    setCustomDesignInjections(""); setDramaticPrompt(""); setMjOptimizedPrompt(""); setCgEnhancedPrompt(""); setEnhanceMode("refine"); setMomentumActive(false); setIsAdvancedOptionsEnabled(false);
    setPersonaSliderValue(50); setAiRecSummary(null); setCoreArchetype('core_fortress');
    setCreationUploadedImage(null); setEditUploadedImage(null);
    setStemWeight("Stem_Heavy"); setTerminalStyle("Term_Chisel"); setStrokeTexture("Tex_Clean"); setStrokeSharpness("Sharp_Std"); setStrokeExtension("Ext_None"); setKineticVelocity("Vel_Static"); setSlicingIntensity("Slic_None"); setSubTitleSize("Sub_Small"); setLetterConnection("Conn_Indep"); setInternalSpace("Space_Std"); setLogoDegree("Logo_Std");
    setTuningReferenceImage(null); setEditTuningReferenceImage(null); setActiveGuards(['guard_mutation', 'guard_3d', 'guard_layout', 'guard_noise']);
  };

  const copyToClipboard = (text, type = 'bottom') => {
    const textArea = document.createElement("textarea"); textArea.value = text || ''; document.body.appendChild(textArea); textArea.select();
    try {
      document.execCommand('copy');
      if (type === 'top') { setCopiedTop(true); setTimeout(() => setCopiedTop(false), 2000); }
      else { setCopiedBottom(true); setTimeout(() => setCopiedBottom(false), 2000); }
    } catch (err) { console.error("Failed to copy", err); } document.body.removeChild(textArea);
  };

  const handleCreationDragOver = (e) => { e.preventDefault(); setIsCreationDragging(true); };
  const handleCreationDragLeave = () => { setIsCreationDragging(false); };
  const handleCreationDrop = async (e) => {
    e.preventDefault(); setIsCreationDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => { setCreationUploadedImage(reader.result); analyzeCreationImage(reader.result); };
        reader.readAsDataURL(file);
    }
  };
  const handleCreationImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => { setCreationUploadedImage(reader.result); analyzeCreationImage(reader.result); };
        reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => { setIsDragging(false); };
  const handleEditDrop = (e) => {
    e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) { const reader = new FileReader(); reader.onloadend = () => setEditUploadedImage(reader.result); reader.readAsDataURL(file); }
  };
  const handleEditImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) { const reader = new FileReader(); reader.onloadend = () => setEditUploadedImage(reader.result); reader.readAsDataURL(file); }
  };

  const analyzeCreationImage = async (dataUrl) => {
    if (!dataUrl) return;
    setIsAnalyzingCreation(true);
    try {
      const base64Data = dataUrl.split(',')[1];
      const mimeType = dataUrl.substring(dataUrl.indexOf(":")+1, dataUrl.indexOf(";"));
      const imageParts = [{ inlineData: { mimeType, data: base64Data } }];
      const persona = coreArchetypes.find(p => p.id === coreArchetype) || coreArchetypes[0];
      const systemPrompt = `You are a legendary Typography Art Director and System Engineer.
[YOUR PERSONA]: ${persona.role}
Task: Analyze the uploaded reference image's typography style. Extract its structural morphology, weight, terminals, kerning, and texture.
IMPORTANT: You MUST generate precise, dynamically created options (id, name(Korean), en(English description)) that perfectly match the uploaded image's style. Do not just use existing options; invent detailed new ones.
CRITICAL CONSTRAINT: This engine is STRICTLY for 2D FLAT BLACK-AND-WHITE SILHOUETTES. The dynamically created options MUST NOT contain any 3D effects, colors (e.g., gold, silver), lighting, shadows, or realistic materials. Invent ONLY structural and 2D morphological descriptors (e.g., "Deep geometric cuts", "Aggressive razor stems", "Blocky massive terminals").
Core Archetypes available: 'core_fortress', 'core_blade', 'core_relic', 'core_glyph', 'core_kinetic'. Choose the best fit.
Return strictly in JSON format:
{
  "summary": { "title": "분석된 스타일 요약 (한국어)", "reason": "해당 세팅을 추천하는 이유 (한국어)" },
  "aura": "Detailed English description of the structural lines, shapes, and rhythm to match the image. NO vague emotional words. Focus on geometry and tension.",
  "setArchetype": "core_...",
  "setWeight": { "id": "...", "name": "...", "en": "..." },
  "setTerminal": { "id": "...", "name": "...", "en": "..." },
  "setTexture": { "id": "...", "name": "...", "en": "..." },
  "setKinetic": { "id": "...", "name": "...", "en": "..." },
  "setSharpness": { "id": "...", "name": "...", "en": "..." },
  "setKerning": { "id": "...", "name": "...", "en": "..." }
}`;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [ { text: systemPrompt }, ...imageParts ] }], generationConfig: { responseMimeType: "application/json", temperature: 0.7 } }) });
      const data = await response.json();
      const res = extractJson(data.candidates[0].content.parts[0].text);

      if (res?.summary) setAiRecSummary(res.summary);
      if (res?.aura) setCustomDesignInjections(res.aura);
      if (res?.setArchetype) {
         const match = coreArchetypes.find(a => a.id === res.setArchetype);
         if (match) setCoreArchetype(match.id);
      }
      if (res?.setWeight) setStemWeight(updateDynamic('stemWeights', res.setWeight));
      if (res?.setTerminal) setTerminalStyle(updateDynamic('terminalStyles', res.setTerminal));
      if (res?.setTexture) setStrokeTexture(updateDynamic('strokeTextures', res.setTexture));
      if (res?.setKinetic) setKineticVelocity(updateDynamic('kineticVelocities', res.setKinetic));
      if (res?.setSharpness) setStrokeSharpness(updateDynamic('strokeSharpness', res.setSharpness));
      if (res?.setKerning) setKerning(updateDynamic('kerningOptions', res.setKerning));

      setIsAdvancedOptionsEnabled(true);
    } catch (error) { console.error("Image analysis failed:", error); } finally { setIsAnalyzingCreation(false); }
  };

  // 다른 앱(주로 프롬프트 아크)에서 전달된 payload 수신 — 진입 시 자동 적용 + 자동 분석.
  useEffect(() => {
    if (!payload || payload.target !== 'typecore-sovereign') return;
    if (!payload.timestamp) return;
    if (consumedPayloadRef.current === payload.timestamp) return;
    consumedPayloadRef.current = payload.timestamp;

    const imgUrl = payload.image?.url || '';
    const text = payload.prompt?.text || '';
    const tags = Array.isArray(payload.prompt?.tags) ? payload.prompt.tags : [];
    const source = payload.source || 'unknown';

    (async () => {
      let dataUrl = null;
      if (imgUrl) {
        try {
          const res = await fetch(imgUrl, { mode: 'cors' });
          if (!res.ok) throw new Error(`이미지 fetch 실패: ${res.status}`);
          const blob = await res.blob();
          dataUrl = await new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onloadend = () => resolve(String(r.result));
            r.onerror = reject;
            r.readAsDataURL(blob);
          });
          // 업로드 영역에 표시
          setCreationUploadedImage(dataUrl);
        } catch (e) {
          console.error('[TypecoreSovereign] 전달 이미지 로드 실패', e);
        }
      }
      // 사용자 텍스트가 있으면 inputText로 치환 (우선순위 높음)
      if (text) setInputText(text.slice(0, 60));
      setIncomingFromArc({ from: source, hasImage: !!dataUrl, text, tags });
      // 자동 역설계 분석 — 기존 함수가 모든 옵션을 자동으로 채워줌
      if (dataUrl) {
        try { await analyzeCreationImage(dataUrl); }
        catch (e) { console.error('[TypecoreSovereign] 자동 분석 실패', e); }
      }
      try { clearPayload(); } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload?.timestamp, payload?.target]);

  const handleTuningImageUpload = (e, isEdit) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader(); reader.onloadend = () => { const base64 = reader.result.split(',')[1]; if (isEdit) setEditTuningReferenceImage(base64); else setTuningReferenceImage(base64); }; reader.readAsDataURL(file);
    }
  };

  const openTuningRoom = () => { setCurrentTunedAura(customDesignInjections); setTuningChatHistory([{ role: 'assistant', content: "안녕하세요! 현재 구체화된 아이디어를 바탕으로 어떤 부분들을 더 추가하거나 수정하고 싶으신가요?\n원하시는 방향을 자유롭게 말씀해 주세요! (예: '조금 더 차갑고 날카로운 느낌으로 바꿔줘')" }]); setIsTuningModalOpen(true); };
  const openEditTuningRoom = () => { setCurrentTunedEditAura(editInstruction); setEditTuningChatHistory([{ role: 'assistant', content: "이미지 편집 튜닝룸입니다!\n현재 작성된 지시사항을 바탕으로 원하시는 수정 방향을 대화하듯 말씀해 주세요.\n(예: '지금 묘사에서 부식된 효과를 조금 더 세게 강조해줘')" }]); setIsEditTuningModalOpen(true); };

  const handleSendTuningMessage = async () => {
    if (!tuningInputValue.trim() && !tuningReferenceImage) return;
    const userMsg = tuningInputValue.trim() || "이미지 스타일을 분석해줘.";
    setTuningInputValue(""); setTuningChatHistory(prev => [...prev, { role: 'user', content: userMsg }]); setIsTuningLoading(true);
    const persona = coreArchetypes.find(p => p.id === coreArchetype) || coreArchetypes[0];
    const systemPrompt = `You are a Typography Art Director and a friendly assistant. [YOUR PERSONA]: ${persona.role}\n[CURRENT SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)}\n[Current Aura]: "${currentTunedAura}"\n[User Request]: "${userMsg}"\nTask: Update the [Current Aura] to reflect the [User Request] and visual analysis. Make it professional. APPLY YOUR PERSONA'S VIBE AND KEYWORDS: ${persona.keywords}. Reflect the [CURRENT SUB-TRAIT FOCUS].
CRITICAL CONSTRAINT: Maintain strictly 2D flat silhouette graphic structure. DO NOT invent options related to 3D, colors, or realistic materials. ONLY focus on 2D morphology (shape, cuts, stems).
Write a short, friendly reply in Korean explaining what you changed and analyzed. Tone: ${persona.tone}.\nReturn JSON strictly in this format: { "newAura": "The updated aura string IN ENGLISH", "replyMessage": "Your friendly reply in Korean", "updateOptions": { "setWeight": { "id": "...", "name": "...", "en": "..." }, ... } }`;
    const parts = [{ text: "Process the tuning request. Analyze the reference image if provided." }];
    if (tuningReferenceImage) parts.push({ inlineData: { mimeType: "image/jpeg", data: tuningReferenceImage } });
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json", temperature: 0.7 } }) });
      const data = await response.json(); const result = extractJson(data.candidates?.[0]?.content?.parts?.[0]?.text);
      if (result?.newAura && result?.replyMessage) {
         setCurrentTunedAura(result.newAura); setTuningChatHistory(prev => [...prev, { role: 'assistant', content: result.replyMessage }]);
         if (result.updateOptions) { const opts = result.updateOptions; if (opts.setWeight) setStemWeight(updateDynamic('stemWeights', opts.setWeight)); if (opts.setTerminal) setTerminalStyle(updateDynamic('terminalStyles', opts.setTerminal)); if (opts.setTexture) setStrokeTexture(updateDynamic('strokeTextures', opts.setTexture)); if (opts.setKinetic) setKineticVelocity(updateDynamic('kineticVelocities', opts.setKinetic)); if (opts.setSharpness) setStrokeSharpness(updateDynamic('strokeSharpness', opts.setSharpness)); if (opts.setKerning) setKerning(updateDynamic('kerningOptions', opts.setKerning)); setIsAdvancedOptionsEnabled(true); }
      }
    } catch (e) { setTuningChatHistory(prev => [...prev, { role: 'assistant', content: "오류가 발생했습니다." }]); } finally { setIsTuningLoading(false); setTuningReferenceImage(null); }
  };

  const handleSendEditTuningMessage = async () => {
    if (!editTuningInputValue.trim() && !editTuningReferenceImage) return;
    const userMsg = editTuningInputValue.trim() || "이미지 스타일을 분석해줘.";
    setEditTuningInputValue(""); setEditTuningChatHistory(prev => [...prev, { role: 'user', content: userMsg }]); setIsEditTuningLoading(true);
    const persona = coreArchetypes.find(p => p.id === coreArchetype) || coreArchetypes[0];
    const systemPrompt = `You are an expert Typography Art Director adjusting an Image-to-Image edit instruction. [YOUR PERSONA]: ${persona.role}\n[CURRENT SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)}\n[Current Edit Direction]: "${currentTunedEditAura}"\n[User Request]: "${userMsg}"\nTask: Update the [Current Edit Direction] integrating the user's request and image analysis. Maintain a professional tone while applying your persona's vibe and keywords: ${persona.keywords}. Reflect the [CURRENT SUB-TRAIT FOCUS].
CRITICAL CONSTRAINT: Maintain strictly 2D flat silhouette graphic structure. DO NOT invent options related to 3D, colors, or realistic materials. ONLY focus on 2D morphology (shape, cuts, stems).
Write a friendly response in Korean explaining the update. Tone: ${persona.tone}.\nReturn JSON strictly: { "newAura": "Updated instruction string IN ENGLISH", "replyMessage": "Friendly response in Korean", "updateOptions": { "setEditStroke": { "id": "...", "name": "...", "en": "..." }, ... } }`;
    const parts = [{ text: "Process the tuning request. Analyze the reference image if provided." }];
    if (editTuningReferenceImage) parts.push({ inlineData: { mimeType: "image/jpeg", data: editTuningReferenceImage } });
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json", temperature: 0.7 } }) });
      const data = await response.json(); const result = extractJson(data.candidates?.[0]?.content?.parts?.[0]?.text);
      if (result?.newAura && result?.replyMessage) {
         setCurrentTunedEditAura(result.newAura); setEditTuningChatHistory(prev => [...prev, { role: 'assistant', content: result.replyMessage }]);
         if (result.updateOptions) { const opts = result.updateOptions; if (opts.setEditStroke) setEditStrokeMod(updateDynamic('editStrokeMods', opts.setEditStroke)); if (opts.setEditElement) setEditElementMod(updateDynamic('editElementMods', opts.setEditElement)); if (opts.setEditSurface) setEditSurfaceMod(updateDynamic('editSurfaceMods', opts.setEditSurface)); if (opts.setKinetic) setKineticVelocity(updateDynamic('kineticVelocities', opts.setKinetic)); if (opts.setDamage) setDeformationDamage(updateDynamic('deformationDamages', opts.setDamage)); }
      }
    } catch (e) { setEditTuningChatHistory(prev => [...prev, { role: 'assistant', content: "오류가 발생했습니다." }]); } finally { setIsEditTuningLoading(false); setEditTuningReferenceImage(null); }
  };

  const extractRecipe = () => {
    const recipe = {
      typecoreVersion: TYPECORE_VERSION,
      mode: currentView,
      text: inputText,
      purpose: activePurpose,
      coreArchetype: coreArchetype,
      layoutType: layoutType,
      aspectRatio: aspectRatio,
      occupancy: occupancy,
      stemWeight: stemWeight,
      charWidth: charWidth,
      charProportion: charProportion,
      kerning: kerning,
      terminalStyle: terminalStyle,
      strokeTexture: strokeTexture,
      strokeSharpness: strokeSharpness,
      kineticVelocity: kineticVelocity,
      slicingIntensity: slicingIntensity,
      deformationDamage: deformationDamage,
      activeGuards: activeGuards,
      customDesignInjections: customDesignInjections,
      personaSliderValue: personaSliderValue,
      isEnhanceModeEnabled: isEnhanceModeEnabled,
      enhanceMode: enhanceMode,
      momentumActive: momentumActive
    };
    copyToClipboard(JSON.stringify(recipe, null, 2), 'top');
    alert("Recipe JSON 복사 완료!");
  };

  const handleImportPrompt = () => {
    if (!importInputValue.trim()) return;
    try {
        const recipe = JSON.parse(importInputValue);
        if(recipe.typecoreVersion) {
            if(recipe.text) setInputText(recipe.text);
            if(recipe.purpose) setActivePurpose(recipe.purpose);
            if(recipe.coreArchetype) setCoreArchetype(recipe.coreArchetype);
            if(recipe.layoutType) setLayoutType(recipe.layoutType);
            if(recipe.aspectRatio) setAspectRatio(recipe.aspectRatio);
            if(recipe.occupancy) setOccupancy(recipe.occupancy);
            if(recipe.stemWeight) setStemWeight(recipe.stemWeight);
            if(recipe.charWidth) setCharWidth(recipe.charWidth);
            if(recipe.charProportion) setCharProportion(recipe.charProportion);
            if(recipe.kerning) setKerning(recipe.kerning);
            if(recipe.terminalStyle) setTerminalStyle(recipe.terminalStyle);
            if(recipe.strokeTexture) setStrokeTexture(recipe.strokeTexture);
            if(recipe.strokeSharpness) setStrokeSharpness(recipe.strokeSharpness);
            if(recipe.kineticVelocity) setKineticVelocity(recipe.kineticVelocity);
            if(recipe.slicingIntensity) setSlicingIntensity(recipe.slicingIntensity);
            if(recipe.deformationDamage) setDeformationDamage(recipe.deformationDamage);
            if(recipe.activeGuards) setActiveGuards(recipe.activeGuards);
            if(recipe.customDesignInjections) setCustomDesignInjections(recipe.customDesignInjections);
            if(recipe.personaSliderValue) setPersonaSliderValue(recipe.personaSliderValue);
            if(recipe.isEnhanceModeEnabled !== undefined) setIsEnhanceModeEnabled(recipe.isEnhanceModeEnabled);
            if(recipe.enhanceMode) setEnhanceMode(recipe.enhanceMode);
            if(recipe.momentumActive !== undefined) setMomentumActive(recipe.momentumActive);

            setIsAdvancedOptionsEnabled(true);
            setIsImportModalOpen(false);
            setImportInputValue("");
            return;
        }
    } catch(e) {}

    const text = importInputValue;
    const safeMatch = (regex) => { const m = text.match(regex); return m ? m[1].trim() : null; };

    const textMatch = safeMatch(/Exact Text:\s*"(.*?)"/);
    if (textMatch) setInputText(textMatch);

    const layoutMatch = safeMatch(/Composition:\s*(.*?)\n/);
    if (layoutMatch) {
        const match = staticOptions.layouts.find(opt => layoutMatch.includes(opt.en) || opt.en.includes(layoutMatch));
        if (match) setLayoutType(match.id);
    }

    const occMatch = safeMatch(/Occupancy:\s*(.*?)\n/);
    if (occMatch) {
        const match = staticOptions.occupancies.find(opt => occMatch.includes(opt.en) || opt.en.includes(occMatch));
        if (match) setOccupancy(match.id);
    }

    const arMatch = safeMatch(/Aspect Ratio:\s*(.*?)\n/);
    if (arMatch) setAspectRatio(arMatch);

    const personaMatch = safeMatch(/Core Archetype:\s*(.*?)\n/) || safeMatch(/Director Persona:\s*(.*?)\n/);
    if (personaMatch) {
        const match = coreArchetypes.find(p => personaMatch.includes(p.shortTitle));
        if (match) setCoreArchetype(match.id);
    }

    const bodyMatch = safeMatch(/Stroke Body:\s*(.*?)\n/);
    if (bodyMatch) {
        const wMatch = staticOptions.stemWeights.find(opt => bodyMatch.includes(opt.en));
        if (wMatch) setStemWeight(wMatch.id);
        const wdMatch = staticOptions.widths.find(opt => bodyMatch.includes(opt.en));
        if (wdMatch) setCharWidth(wdMatch.id);
        const pMatch = staticOptions.proportions.find(opt => bodyMatch.includes(opt.en));
        if (pMatch) setCharProportion(pMatch.id);
    }

    const jointsMatch = safeMatch(/Joints & Flow:\s*(.*?)\n/);
    if (jointsMatch) {
        const kMatch = staticOptions.kerningOptions.find(opt => jointsMatch.includes(opt.en));
        if (kMatch) setKerning(kMatch.id);
        const lMatch = staticOptions.letterConnections.find(opt => jointsMatch.includes(opt.en));
        if (lMatch) setLetterConnection(lMatch.id);
        const iMatch = staticOptions.internalSpaces.find(opt => jointsMatch.includes(opt.en));
        if (iMatch) setInternalSpace(iMatch.id);
    }

    const termMatch = safeMatch(/Terminals & Edges:\s*(.*?)\n/);
    if (termMatch) {
        const tMatch = staticOptions.terminalStyles.find(opt => termMatch.includes(opt.en));
        if (tMatch) setTerminalStyle(tMatch.id);
        const sMatch = staticOptions.strokeSharpness.find(opt => termMatch.includes(opt.en));
        if (sMatch) setStrokeSharpness(sMatch.id);
        const cMatch = staticOptions.cornerStyles.find(opt => termMatch.includes(opt.en));
        if (cMatch) setCornerStyle(cMatch.id);
        const eMatch = staticOptions.strokeExtensions.find(opt => termMatch.includes(opt.en));
        if (eMatch) setStrokeExtension(eMatch.id);
    }

    const auraMatch = safeMatch(/Design Aura \(Normalized Intent\):\s*(.*?)\n/);
    if (auraMatch && auraMatch !== "Standard deployment") setCustomDesignInjections(auraMatch);

    const modeMatch = safeMatch(/Mode:\s*(.*?)\n/);
    if (modeMatch) {
        if (modeMatch.includes("OFF")) {
            setIsEnhanceModeEnabled(false);
        } else {
            setIsEnhanceModeEnabled(true);
            if (modeMatch.includes("REFINE")) setEnhanceMode("refine");
            if (modeMatch.includes("VARIATION")) setEnhanceMode("variation");
            if (modeMatch.includes("DECONSTRUCT")) setEnhanceMode("deconstruct");
        }
    }

    const dynStatusMatch = safeMatch(/Status:\s*(.*?)\n/);
    if (dynStatusMatch) setMomentumActive(dynStatusMatch.includes("ENABLED"));

    const kinMatch = safeMatch(/Kinetic Velocity:\s*(.*?)\n/);
    if (kinMatch) {
        const match = staticOptions.kineticVelocities.find(opt => kinMatch.includes(opt.en));
        if (match) setKineticVelocity(match.id);
    }

    const slantMatch = safeMatch(/Slant:\s*(.*?)\n/);
    if (slantMatch) {
        const match = staticOptions.slantAngles.find(opt => slantMatch.includes(opt.en));
        if (match) setSlantAngle(match.id);
    }

    const slicingMatch = safeMatch(/Slicing Force:\s*(.*?)\n/);
    if (slicingMatch) {
        const match = staticOptions.slicingIntensities.find(opt => slicingMatch.includes(opt.en));
        if (match) setSlicingIntensity(match.id);
    }

    const damageMatch = safeMatch(/Damage\/Erosion:\s*(.*?)\n/);
    if (damageMatch) {
        const match = staticOptions.deformationDamages.find(opt => damageMatch.includes(opt.en));
        if (match) setDeformationDamage(match.id);
    }

    let newGuards = [];
    if (text.includes("ANTI-MUTATION MAX") || text.includes("[L1 LOCK] TEXT INTEGRITY MAX")) newGuards.push("guard_mutation");
    if (text.includes("2D FLAT ENFORCEMENT") || text.includes("[L6 LOCK] 2D FLAT ENFORCEMENT") || text.includes("[L6: STYLE GUARDRAILS - CRITICAL 2D ENFORCEMENT]")) newGuards.push("guard_3d");
    if (text.includes("ANTI-STACKING") || text.includes("[L2 LOCK] ANTI-SQUISHING")) newGuards.push("guard_layout");
    if (text.includes("CLEAN SILHOUETTE") || text.includes("[L7 LOCK] CLEAN SILHOUETTE")) newGuards.push("guard_noise");
    setActiveGuards(newGuards);

    setIsAdvancedOptionsEnabled(true);
    setIsImportModalOpen(false);
    setImportInputValue("");
  };

  const handleExpandIntent = async () => {
    if (!customDesignInjections.trim() || isExpandingIntent) return; setIsExpandingIntent(true);
    const persona = coreArchetypes.find(p => p.id === coreArchetype) || coreArchetypes[0];
    const systemPrompt = `[YOUR PERSONA]: ${persona.role}
Task: AURA NORMALIZATION ENGINE.
Convert the user's emotional/abstract keyword into strict structural, morphological, and parameter-based directives IN ENGLISH ONLY.
DO NOT use vague emotional words in the output. Translate feelings into edges, contrast, kerning, and terminal shapes.
Format: ONLY English, 2-3 sentences of highly optimized structural prompt descriptions (comma separated if needed).`;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: customDesignInjections }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.7 } }) });
      const data = await response.json(); if (data.candidates?.[0]?.content?.parts?.[0]?.text) setCustomDesignInjections(data.candidates[0].content.parts[0].text.trim());
    } catch (e) {} finally { setIsExpandingIntent(false); }
  };

  const handleEditExpandIntent = async () => {
    if (!editInstruction.trim() || isEditExpandingIntent) return; setIsEditExpandingIntent(true);
    const persona = coreArchetypes.find(p => p.id === coreArchetype) || coreArchetypes[0];
    const systemPrompt = `[YOUR PERSONA]: ${persona.role}
Task: AURA NORMALIZATION ENGINE (Micro-Edit Mode).
Expand the user's short edit keyword into a detailed, structural Image-to-Image morphological edit instruction IN ENGLISH ONLY.
CRITICAL RULE: Must enforce 95-98% silhouette preservation. NO structure changes, NO layout drift.
Focus only on edge refinement, surface detail, or micro incisions.
Format: ONLY English, strict structural commands.`;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: editInstruction }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.7 } }) });
      const data = await response.json(); if (data.candidates?.[0]?.content?.parts?.[0]?.text) setEditInstruction(data.candidates[0].content.parts[0].text.trim());
    } catch (e) {} finally { setIsEditExpandingIntent(false); }
  };

  // --- V18: Prompt Intermediate Representation (IR) Compiler ---
  const buildPromptIR = () => {
    const weightList = [...staticOptions.stemWeights, ...(dynamicOptions.stemWeights || [])];
    const kerningList = [...staticOptions.kerningOptions, ...(dynamicOptions.kerningOptions || [])];
    const terminalList = [...staticOptions.terminalStyles, ...(dynamicOptions.terminalStyles || [])];
    const sharpnessList = [...staticOptions.strokeSharpness, ...(dynamicOptions.strokeSharpness || [])];
    const textureList = staticOptions.strokeTextures;
    const kineticList = [...staticOptions.kineticVelocities, ...(dynamicOptions.kineticVelocities || [])];
    const slantList = staticOptions.slantAngles;
    const destList = staticOptions.deformationDamages;

    const weightEn = getOptionEn(weightList, stemWeight); const kerningEn = getOptionEn(kerningList, kerning); const terminalEn = getOptionEn(terminalList, terminalStyle); const sharpnessEn = getOptionEn(sharpnessList, strokeSharpness); const textureEn = getOptionEn(textureList, strokeTexture); const widthEn = getOptionEn(staticOptions.widths, charWidth); const proportionEn = getOptionEn(staticOptions.proportions, charProportion); const cornerList = [...staticOptions.cornerStyles, ...(dynamicOptions.cornerStyles || [])]; const cornerEn = getOptionEn(cornerList, cornerStyle); const kineticEn = getOptionEn(kineticList, kineticVelocity); const slantEn = getOptionEn(slantList, slantAngle); const destructionEn = getOptionEn(destList, deformationDamage); const occupancyEn = getOptionEn(staticOptions.occupancies, occupancy); const slicingEn = getOptionEn(staticOptions.slicingIntensities, slicingIntensity); const subSizeEn = getOptionEn(staticOptions.subTitleSizes, subTitleSize);
    const extensionEn = getOptionEn([...staticOptions.strokeExtensions, ...(dynamicOptions.strokeExtensions || [])], strokeExtension);
    const letterConnEn = getOptionEn([...staticOptions.letterConnections, ...(dynamicOptions.letterConnections || [])], letterConnection);
    const internalSpaceEn = getOptionEn([...staticOptions.internalSpaces, ...(dynamicOptions.internalSpaces || [])], internalSpace);
    const mmoSilhouetteEn = getOptionEn([...staticOptions.MMOSilhouetteFramings, ...(dynamicOptions.MMOSilhouetteFramings || [])], mmoSilhouetteFraming);

    let modIntensityEn = "0%"; let readabilityFloorEn = "90%"; let modAllowedEn = "None"; let modForbiddenEn = "Any structural mutation";
    if (isEnhanceModeEnabled) {
      if (enhanceMode === 'refine') { modIntensityEn = "5-15%"; readabilityFloorEn = "85%"; modAllowedEn = "Optical balance, serif sharpening, minor cut refinements."; modForbiddenEn = "Structural reinterpretation, letter merging, excessive ornamentation."; }
      else if (enhanceMode === 'variation') { modIntensityEn = "20-45%"; readabilityFloorEn = "70%"; modAllowedEn = "Stroke proportion variation, partial merging, counterform reinterpretation."; modForbiddenEn = "Illegible deconstruction, total structural collapse."; }
      else if (enhanceMode === 'deconstruct') { modIntensityEn = "50-75%"; readabilityFloorEn = "40%"; modAllowedEn = "Stroke disassembly, severe overlapping, asymmetric fragmentation, emblemization."; modForbiddenEn = "Dropping below minimum readability floor. Random noise generation."; }
    }

    let combatVectorEn = "None"; let combatImpactZoneEn = "None"; let combatDeformationEn = "0%";
    if (momentumActive) { combatVectorEn = "Right-to-left slash or diagonal compression based on aura"; combatImpactZoneEn = "Asymmetrical focus (e.g., right terminal or center core)"; combatDeformationEn = "20-35% maximum deformation limit"; }

    let layoutEn = "Single horizontal row.";
    if (layoutType === "2Lines") layoutEn = "Two-tier vertical stacked composition.";
    else if (layoutType === "TitleSub") layoutEn = `Hierarchical composition. Main title on top, explicitly smaller subtitle below (${subSizeEn}).`;
    else if (layoutType === "SubTitle") layoutEn = `Hierarchical composition. Explicitly smaller subtitle on top (${subSizeEn}), Main title below.`;
    else if (layoutType === "Center") layoutEn = "Centralized balanced composition.";

    let aspectRatioEn = "";
    if (aspectRatio === "1:1") aspectRatioEn = "(perfectly 1:1 square canvas resolution:1.5), symmetric square frame, ";
    else if (aspectRatio === "16:9") aspectRatioEn = "(16:9 widescreen canvas format:1.4), horizontal wide framing, ";
    else if (aspectRatio === "9:16") aspectRatioEn = "(9:16 vertical portrait canvas format:1.5), tall vertical framing, ";
    else if (aspectRatio === "2.76:1") aspectRatioEn = "(ultra-wide 2.76:1 cinematic panorama canvas:1.5), extreme horizontal framing, ";

    const activeCoreData = coreArchetypes.find(p => p.id === coreArchetype) || coreArchetypes[0];
    const userAuraEn = customDesignInjections || "Standard deployment";

    const isWhiteBg = baseStyle === "WhiteBlack";
    const bgDescEn = isWhiteBg ? "STARK WHITE Background, SOLID BLACK Subject" : "JET BLACK Background, RADIANT WHITE Subject";
    const solidBgPrompt = isWhiteBg ? "pure solid #FFFFFF bright white void background, solid #000000 matte black text" : "pure solid #000000 matte black void background, solid #FFFFFF bright white text";

    const isSlicingActive = slicingIntensity !== "Slic_None";
    const intactGuard = isSlicingActive ? "" : "perfectly intact silhouette, ";
    const optimizedBase = `masterpiece, best quality, ultra highres, insanely detailed, 8k resolution, isolated standalone typography graphic, clear cutout text shape, flawless silhouette boundary, ${intactGuard}highly legible, AAA game title aesthetic, sharp geometric corners, precise structural lines, strong material contrast`;

    let troubleshootingBlockEn = "";
    let activeGuardsEn = [];
    if (activeGuards.length > 0) {
        const activeTs = safetyGuards.filter(opt => activeGuards.includes(opt.id));
        troubleshootingBlockEn = `\n\n[L8: NEGATIVE ENFORCEMENT & GUARDS]\n` + activeTs.map(opt => `- ${opt.fixEn}`).join("\n");
        activeGuardsEn = activeTs.map(opt => opt.fixEn);
    }

    let cgTextInstruction = `Render EXACTLY the text "${inputText}"`;
    let explicitTwoLineInstruction = `The text "${inputText.replace(/\n/g, ' ')}"`;

    if (inputText.includes('\n') || layoutType !== "1Line") {
        const lines = inputText.split('\n');
        const topRow = lines[0] || "";
        const bottomRow = lines[1] || topRow;

        if (layoutType === "TitleSub") {
             cgTextInstruction = `Render exactly 2 lines:\n- [TOP ROW]: "${topRow}" (Huge Main Title)\n- [BOTTOM ROW]: "${bottomRow}" (Explicitly smaller Subtitle)`;
             explicitTwoLineInstruction = `(Two lines of text:1.4). Top row: "${topRow}". Bottom row: "${bottomRow}".`;
        } else if (layoutType === "SubTitle") {
             cgTextInstruction = `Render exactly 2 lines:\n- [TOP ROW]: "${topRow}" (Explicitly smaller Subtitle)\n- [BOTTOM ROW]: "${bottomRow}" (Huge Main Title)`;
             explicitTwoLineInstruction = `(Two lines of text:1.4). Top row: "${topRow}". Bottom row: "${bottomRow}".`;
        } else if (layoutType === "2Lines" || layoutType === "Center") {
             cgTextInstruction = `Render exactly 2 lines:\n- [TOP ROW]: "${topRow}"\n- [BOTTOM ROW]: "${bottomRow}"`;
             explicitTwoLineInstruction = `(Strictly two lines of text vertical stacked:1.5). Top row: "${topRow}". Bottom row: "${bottomRow}".`;
        }
    }

    return {
        inputText, layoutEn, mmoSilhouetteEn, occupancyEn, aspectRatio, activeCoreData, weightEn, widthEn, proportionEn, kerningEn, letterConnEn, internalSpaceEn, terminalEn, sharpnessEn, cornerEn, extensionEn, userAuraEn, personaSliderValue, modIntensityEn, readabilityFloorEn, modAllowedEn, modForbiddenEn, momentumActive, kineticEn, slantEn, slicingEn, combatVectorEn, combatImpactZoneEn, combatDeformationEn, bgDescEn, destructionEn, troubleshootingBlockEn, cgTextInstruction, explicitTwoLineInstruction, optimizedBase, solidBgPrompt, isSlicingActive, activeGuardsEn, aspectRatioEn
    };
  };

  const buildPrompts = () => {
    const ir = buildPromptIR();

    const generatedBaseEn = `[TYPECORE ${TYPECORE_VERSION} SYSTEM SPECIFICATION]

[L1: TEXT LOCK - MAX PRIORITY]
- Exact Text: "${ir.inputText}"
- Expected Output: 100% structural retention.
- Rule: NO text mutation, NO extra letters, NO missing letters, NO unrequested translation.

[L2: LAYOUT LOCK]
- Composition: ${ir.layoutEn}
- Alignment: ${ir.mmoSilhouetteEn}
- Occupancy: ${ir.occupancyEn}
- Aspect Ratio: ${ir.aspectRatio}

[L3: MORPHOLOGY]
- Core Archetype: ${ir.activeCoreData.shortTitle}
[STRUCTURAL SILHOUETTE LANGUAGE]
- ${ir.activeCoreData.language.split(', ').join('\n- ')}
- Stroke Body: ${ir.weightEn}, ${ir.widthEn} width, ${ir.proportionEn} proportion.
- Joints & Flow: ${ir.kerningEn}, ${ir.letterConnEn}, ${ir.internalSpaceEn}.
- Terminals & Edges: ${ir.terminalEn}, ${ir.sharpnessEn}, ${ir.cornerEn}, ${ir.extensionEn}.
- Design Aura (Normalized Intent): ${ir.userAuraEn}
- Sub-Trait Focus: ${getSliderText(ir.personaSliderValue)}

[L4: MODIFIER ENGINE]
- Mode: ${isEnhanceModeEnabled ? enhanceMode.toUpperCase() : "OFF"}
- Intensity Budget: ${ir.modIntensityEn}
- Legibility Floor: MUST maintain at least ${ir.readabilityFloorEn} readability.
- Allowed Edits: ${ir.modAllowedEn}
- Forbidden Edits: ${ir.modForbiddenEn}

[L5: COMBAT DYNAMICS]
- Status: ${ir.momentumActive ? "ENABLED" : "DISABLED"}
- Kinetic Velocity: ${ir.kineticEn}
- Slant: ${ir.slantEn}
- Slicing Force: ${ir.slicingEn}
- Vector/Impact Constraints: Vector(${ir.combatVectorEn}), Impact Zone(${ir.combatImpactZoneEn}), Deformation Budget(${ir.combatDeformationEn}).

[L6: STYLE GUARDRAILS - CRITICAL 2D ENFORCEMENT]
- 2D Vector Rule: STRICTLY flat 2D vector silhouette graphic. ZERO depth. NO lighting. NO shading.
- Background Rule: Isolated on solid background. NO scenery. NO environmental elements.
- Material Rule: NO colors, ZERO chroma. Strict monochrome (${ir.bgDescEn}).
- Damage/Erosion: ${ir.destructionEn}

[NEGATIVE PROMPT (STRICT PROHIBITIONS)]
- ${ir.activeCoreData.forbidden}
- NO 3D rendering, NO bevel, NO drop shadows, NO shading, NO volumetric lighting.
- NO background scenery, NO gradient, NO realistic textures.
- NO illegible distortion falling below the Legibility Floor.
- NO unrequested layout drifting or vertical squishing.${ir.troubleshootingBlockEn}`.trim();

    const chatGPTOutput = `Generate a masterpiece, ultra highres, insanely detailed 2D flat typography graphic for EXACTLY the text "${ir.inputText}".

Aesthetic & Style: AAA game title aesthetic, pure 2D custom typography silhouette, logo-grade flat graphic (not a generic font, not a plain vector icon). ${ir.userAuraEn}.
Morphology ([${ir.activeCoreData.shortTitle}]): Enforce ${ir.activeCoreData.language}. Implement ${ir.weightEn}, ${ir.widthEn} width, ${ir.proportionEn}, ${ir.kerningEn}, ${ir.letterConnEn}, ${ir.internalSpaceEn}. Terminals should be ${ir.terminalEn}, ${ir.sharpnessEn}, ${ir.cornerEn}, ${ir.extensionEn}.
Surface & Dynamics: Apply ${ir.destructionEn}. The text should show ${ir.kineticEn}, ${ir.slantEn}, and ${ir.slicingEn}.
Layout constraints: ${ir.layoutEn} Occupancy must be ${ir.occupancyEn}. Canvas size should be ${ir.aspectRatio}.
Environment: MUST be isolated on a ${ir.solidBgPrompt}.
CRITICAL NEGATIVE PROMPT: Absolutely NO 3D extrusion, NO shading, NO lighting, NO background scenery, NO gradients, NO realistic textures. Flawless silhouette boundary with sharp geometric corners and perfectly intact layout.`;

    const midjourneyOutput = `An epic cinematic 2D flat typography graphic, ${ir.userAuraEn}, typography logotype for exactly the text "${ir.inputText.replace(/\n/g, ' ')}", ${ir.optimizedBase}, pure 2D custom typography silhouette, logo-grade flat graphic, not generic font, not plain vector icon, [${ir.activeCoreData.shortTitle}], ${ir.activeCoreData.language}, ${ir.weightEn}, ${ir.widthEn} width, ${ir.proportionEn}, ${ir.kerningEn}, ${ir.letterConnEn}, ${ir.internalSpaceEn}, ${ir.terminalEn}, ${ir.sharpnessEn}, ${ir.cornerEn}, ${ir.extensionEn}, ${ir.destructionEn}, ${ir.kineticEn}, ${ir.slantEn}, ${ir.slicingEn}, ${ir.mmoSilhouetteEn}, ${ir.solidBgPrompt}, isolated on solid background, wide panoramic span, ${ir.layoutEn}, ${occupancy.replace('%', ' percent')} occupancy, --ar ${ir.aspectRatio.replace(':', ':')} --no 3d, depth, shading, lighting, realistic, shadow, volumetric, bevel, emboss, texture, background elements, scenery, gradient, color, generic font, plain vector, plain svg`;

    const holeGuard = ir.isSlicingActive ? "" : "perfectly intact silhouette, absolutely NO holes through text. ";
    const nanoBananaOutput = `An epic cinematic 2D flat typography graphic, macro photography, hyper-detailed single focal point, large typography, flat focal plane, strictly zero perspective distortion. ${ir.aspectRatioEn}${ir.explicitTwoLineInstruction} is crafted as a pure 2D custom typography silhouette, logo-grade flat graphic, not generic font, not plain vector icon. Feature: ${ir.activeCoreData.weightTags}, ${ir.weightEn}, ${ir.kerningEn}, ${ir.terminalEn}. The structure is modified by ${ir.kineticEn}, ${ir.slantEn}, and (${ir.slicingEn}:1.4). The surface is transformed by ${ir.destructionEn}, ${ir.optimizedBase}, ${ir.solidBgPrompt}. Highly legible, 95% shape preservation, AAA game title aesthetic. Flawless silhouette boundary, ${holeGuard}(pure 2D flat silhouette:1.5), ${ir.layoutEn}, ${ir.occupancyEn}, ${getSliderText(ir.personaSliderValue)}, ${ir.userAuraEn}, ${ir.activeGuardsEn.join(', ')}.
Negative prompt: (3D rendering:1.9), (drop shadows:1.9), (bevel:1.8), (perspective:1.8), (background scenery:1.8), (gradients:1.5), (shading:1.5), (lighting:1.5), ${ir.activeCoreData.forbidden}`;

    return { baseTechnicalEn: generatedBaseEn, baseTechnicalKo: generatedBaseEn, chatGPTOutput, midjourneyOutput, nanoBananaOutput };
  };

  const buildEditPrompts = () => {
    const ir = buildPromptIR();
    const instruction = editInstruction || "원본 이미지의 형태를 유지하며 디테일을 보완합니다.";
    const autoRefineInstructionEn = applyAutoRefine ? `[SHAPE NORMALIZATION PROTOCOL] Auto-correct rough/sketched geometry into premium 2D vector forms.` : "Maintain base sketch quality.";

    const generatedBaseEn = `[TYPECORE V17 MICRO-EDIT SPECIFICATION]

[L1: BASE LOCK & INTEGRITY (MAX PRIORITY)]
- Base Image: Treat as the STRICT structural foundation.
- Shape Preservation Lock: MUST preserve 95-98% of the original silhouette.
- Readability Floor: Minimum ${ir.readabilityFloorEn}.
- Deformation Budget: Maximum ${ir.modIntensityEn} structural shift. Outline changes FORBIDDEN.

[L3: EDIT DIRECTION & MORPHOLOGY]
- Aura (Normalized): "${instruction}"
- Sub-Trait Focus: ${getSliderText(ir.personaSliderValue)}
- Core Archetype: ${ir.activeCoreData.shortTitle}
[STRUCTURAL SILHOUETTE LANGUAGE]
- ${ir.activeCoreData.language.split(', ').join('\n- ')}

[L4: MICRO-REFINEMENT MODIFIERS]
- Framing/Alignment: ${ir.mmoSilhouetteEn}
- Scope: Edge refinement, surface detail, micro incision ONLY.
- Stroke Mod: ${getOptionEn(staticOptions.editStrokeMods, editStrokeMod)}
- Element Mod: ${getOptionEn(staticOptions.editElementMods, editElementMod)}
- Surface Mod: ${getOptionEn(staticOptions.editSurfaceMods, editSurfaceMod)}
- Auto-Refine: ${autoRefineInstructionEn}

[L5: KINETIC & DAMAGE]
- Kinetic Force: ${ir.kineticEn}
- Damage: ${ir.destructionEn}

[L6: STYLE GUARDRAILS - CRITICAL 2D ENFORCEMENT]
- 2D Vector Rule: STRICTLY flat 2D vector silhouette graphic. ZERO depth. NO lighting. NO shading.
- Background Rule: Isolated on solid background. NO scenery. NO environmental elements.
- Material Rule: NO colors. Strict monochrome (${ir.bgDescEn}).

[NEGATIVE PROMPT (STRICT PROHIBITIONS)]
- NO structure changes. NO layout drift.
- NO 3D rendering. NO shading, NO volumetric lighting. NO materials. Pure Black & White ONLY.
- NO background scenery.
- ${ir.activeCoreData.forbidden}${ir.troubleshootingBlockEn}`.trim();

    const chatGPTOutput = `Act as an expert Typography Engine (V17 Edit Mode). Redraw the provided reference image into a masterpiece, ultra highres, insanely detailed 2D flat typography graphic. STRICTLY MAINTAIN basic shape (95-98% silhouette preservation lock). Maximum deformation ${ir.modIntensityEn}.

Aesthetic & Style: AAA game title aesthetic, pure 2D custom typography silhouette, logo-grade flat graphic (not generic font, not plain vector icon). ${instruction} ${getSliderText(ir.personaSliderValue)}.
Micro-Refinements ([${ir.activeCoreData.shortTitle}]): Enforce ${ir.activeCoreData.language}. Apply Stroke(${getOptionEn(staticOptions.editStrokeMods, editStrokeMod)}) and Surface(${getOptionEn(staticOptions.editSurfaceMods, editSurfaceMod)}).
Dynamics: ${ir.kineticEn}, ${ir.destructionEn}.
Environment: ${ir.solidBgPrompt}. Readability floor ${ir.readabilityFloorEn}.
CRITICAL NEGATIVE PROMPT: Absolutely NO 3D extrusion, NO shading, NO lighting, NO background scenery, NO gradients. Flawless silhouette boundary.`;

    const midjourneyOutput = `[UPLOAD BASE IMAGE AS REFERENCE] An epic cinematic 2D flat typography graphic, image-to-image edit, exact structural foundation, ${ir.userAuraEn}, ${ir.optimizedBase}, pure 2D custom typography silhouette, logo-grade flat graphic, not generic font, not plain vector icon, [${ir.activeCoreData.shortTitle}], ${ir.activeCoreData.language}, ${ir.solidBgPrompt}, isolated on solid background, ${getOptionEn(staticOptions.editStrokeMods, editStrokeMod)}, ${getOptionEn(staticOptions.editSurfaceMods, editSurfaceMod)}, ${ir.kineticEn}, wide panoramic span, --ar 16:9 --iw 1.5 --style raw --no 3d, depth, shading, lighting, realistic, shadow, volumetric, bevel, emboss, texture, background elements, scenery, gradient, color, generic font, plain vector, plain svg`;

    const holeGuard = ir.isSlicingActive ? "" : "perfectly intact silhouette, absolutely NO holes through text. ";
    const nanoBananaOutput = `[UPLOAD BASE IMAGE AS REFERENCE] An epic cinematic 2D flat typography graphic, macro photography, hyper-detailed single focal point, flat focal plane, strictly zero perspective distortion. Image-to-image edit, strictly maintain basic shape, (95-98% silhouette preservation lock:1.5). ${ir.aspectRatioEn}The text is crafted as a pure 2D custom typography silhouette, logo-grade flat graphic, not generic font, not plain vector icon. Feature: ${ir.activeCoreData.weightTags}, ${getOptionEn(staticOptions.editStrokeMods, editStrokeMod)}, ${getOptionEn(staticOptions.editSurfaceMods, editSurfaceMod)}. The structure is modified by ${ir.kineticEn}, ${ir.slantEn}, and (${ir.slicingEn}:1.4). The surface is transformed by ${ir.destructionEn}, ${ir.optimizedBase}, ${ir.solidBgPrompt}. Highly legible, AAA game title aesthetic. Flawless silhouette boundary. ${holeGuard}(pure 2D flat silhouette:1.5), ${getSliderText(ir.personaSliderValue)}, ${instruction}, ${ir.activeGuardsEn.join(', ')}.
Negative prompt: (3D rendering:1.9), (drop shadows:1.9), (bevel:1.8), (perspective:1.8), (background scenery:1.8), (gradients:1.5), (shading:1.5), (lighting:1.5), ${ir.activeCoreData.forbidden}`;

    return { baseTechnicalEn: generatedBaseEn, baseTechnicalKo: generatedBaseEn, chatGPTOutput, midjourneyOutput, nanoBananaOutput };
  };

  const currentPrompts = isEditMode ? buildEditPrompts() : buildPrompts();
  let currentOutputContent = "";
  if (currentModel === 'NanoBanana') currentOutputContent = isEditMode ? editDramaticPrompt : dramaticPrompt;
  else if (currentModel === 'Midjourney') currentOutputContent = isEditMode ? editMjPrompt : mjOptimizedPrompt;
  else if (currentModel === 'ChatGPT') currentOutputContent = isEditMode ? editCgPrompt : cgEnhancedPrompt;

  if(!currentOutputContent && currentModel !== 'Overview') currentOutputContent = "프롬프트를 컴파일해주세요.";

  const handleCompileDramatic = async () => {
    if (isEnhancing) return;
    if (!(await ensureCanGenerate())) return;
    setIsEnhancing(true);
    setTimeout(() => {
       setDramaticPrompt(currentPrompts.nanoBananaOutput);
       setIsOutdated(false);
       setIsEnhancing(false);
    }, 400);
  };

  const requestEditDramaticEnhancement = async () => {
    if (isEditEnhancing) return;
    setIsEditEnhancing(true);
    setTimeout(() => {
       setEditDramaticPrompt(currentPrompts.nanoBananaOutput);
       setIsEditOutdated(false);
       setIsEditEnhancing(false);
    }, 400);
  };

  const handleCompileMj = () => {
    setIsMjOptimizing(true);
    setTimeout(() => {
      if (isEditMode) { setEditMjPrompt(currentPrompts.midjourneyOutput); setIsEditOutdated(false); }
      else { setMjOptimizedPrompt(currentPrompts.midjourneyOutput); setIsOutdated(false); }
      setIsMjOptimizing(false);
    }, 400);
  };

  const handleCompileCg = () => {
    setIsCgEnhancing(true);
    setTimeout(() => {
      if (isEditMode) { setEditCgPrompt(currentPrompts.chatGPTOutput); setIsEditOutdated(false); }
      else { setCgEnhancedPrompt(currentPrompts.chatGPTOutput); setIsOutdated(false); }
      setIsCgEnhancing(false);
    }, 400);
  };

  const renderAiOutputBox = (modelState, content, outdatedFlag = false) => {
    return (
    <div className={`rounded-[10px] p-6 sm:p-8 border bg-[#121212] border-zinc-800 relative transition-all duration-500 mt-4`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap w-full sm:w-auto">
            <p className="text-[12px] font-bold uppercase text-[#a6a6a6] flex items-center gap-2 font-mono"><Terminal className="w-4 h-4"/> {modelState} Assembly</p>
            {outdatedFlag && (
               <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-mono" title="옵션이 변경되었습니다. 최신 프롬프트를 위해 다시 생성해주세요.">
                 <AlertCircle className="w-3 h-3" /> 재생성 필요
               </span>
            )}
          </div>
          <button onClick={() => copyToClipboard(content, 'bottom')} className="p-2.5 rounded-[10px] bg-indigo-500 hover:bg-indigo-600 text-white transition-colors flex items-center justify-center shadow-sm" title={copiedBottom ? "복사 완료!" : "결과물 복사"}>
             {copiedBottom ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
      </div>
      <div className={`max-w-[800px] w-full mx-auto text-left whitespace-pre-wrap text-[13px] leading-relaxed p-6 rounded-[10px] border bg-[#1C1C1C] border-zinc-800 transition-colors duration-500 text-zinc-300 ${outdatedFlag ? 'opacity-60 grayscale' : 'opacity-100'}`} style={{fontFamily: "'JetBrains Mono', monospace"}}>
         {content}
      </div>
    </div>
    );
  };

  const renderSidebarHeader = () => (
    <div className="shrink-0 border-b border-zinc-800/80 bg-[#1A1A1A] p-5 flex flex-col gap-4 z-20">
      <div className="flex items-center justify-between">
         <h1 className="app-title text-2xl tracking-wide flex items-baseline gap-1.5 text-white">
           <span className="font-light">Typecore</span>
           <span className="font-semibold">Sovereign</span>
         </h1>
         <button onClick={() => setIsSidebarOpen(false)} title="사이드바 닫기" className="text-zinc-500 hover:text-white transition-colors p-1.5 rounded-md hover:bg-zinc-800">
           <Menu className="w-5 h-5" />
         </button>
      </div>
      <div className="flex bg-[#0A0A0A] rounded-[10px] p-1 border border-zinc-800/60 shadow-inner">
        <button onClick={() => setCurrentView('editor')} className={`flex-1 py-2.5 px-2 text-[12px] font-bold rounded-[8px] flex items-center justify-center gap-2 transition-all duration-200 whitespace-nowrap ${!isEditMode ? 'bg-[#2A2A2E] text-white shadow-sm border border-zinc-600/30' : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#1C1C1C] border border-transparent'}`}>
          <PenTool className="w-3.5 h-3.5 shrink-0" /> <span>생성 어셈블리</span>
        </button>
        <button onClick={() => setCurrentView('edit')} className={`flex-1 py-2.5 px-2 text-[12px] font-bold rounded-[8px] flex items-center justify-center gap-2 transition-all duration-200 whitespace-nowrap ${isEditMode ? 'bg-[#2A2A2E] text-white shadow-sm border border-zinc-600/30' : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#1C1C1C] border border-transparent'}`}>
          <Edit3 className="w-3.5 h-3.5 shrink-0" /> <span>마이크로 리터칭</span>
        </button>
      </div>
    </div>
  );

  const isGeneratingMj = isEditMode ? isEditMjOptimizing : isMjOptimizing;
  const isGeneratingCg = isEditMode ? isEditCgEnhancing : isCgEnhancing;

  return (
    <div className={`flex flex-col h-screen ${t.bg} ${t.textColor} overflow-hidden transition-colors duration-500 relative p-4 font-sans`}>
      {usageModal}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&family=JetBrains+Mono:wght@400;700&display=swap');
        body, input, textarea, button, select, div, p, span, h1, h2, h3, h4, h5 { font-family: 'Noto Sans KR', sans-serif !important; }
        .app-title, .app-title * { font-family: 'Teko', sans-serif !important; letter-spacing: 0.5px; }
        .font-mono { font-family: 'JetBrains Mono', monospace !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { margin: 10px; background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(63, 63, 70, 0.5); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(82, 82, 91, 0.5); }
      `}</style>

      <main className="flex-1 flex overflow-hidden gap-5">

        {/* Unified Left Sidebar (Settings + Nav) */}
        <aside className={`${isSidebarOpen ? 'w-[380px]' : 'w-0 border-none opacity-0 m-0 p-0'} shrink-0 border border-zinc-800/80 bg-[#141414] rounded-[16px] flex flex-col shadow-2xl relative overflow-hidden transition-all duration-300 z-50`}>

          {renderSidebarHeader()}

          {/* Scrollable Setup Options */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">

             {/* 1. Purpose & Archetype Selector (V18 Enhancements) */}
             <div className="shrink-0 space-y-4">
                 <div>
                   <div className="flex items-center gap-2 mb-3 px-1">
                      <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2 font-mono">
                         <LayoutTemplate className="w-3.5 h-3.5" /> [L1/L2] 목적 프리셋 (Purpose)
                      </h3>
                   </div>
                   <DropdownControl data={staticOptions.purposes} value={activePurpose} onChange={handlePurposeChange} theme={theme} />
                 </div>

                 <div>
                   <div className="flex items-center gap-2 mb-3 px-1">
                      <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2 font-mono">
                         <Cpu className="w-3.5 h-3.5" /> [L3] 형태 철학 (Core Archetype)
                      </h3>
                   </div>
                   <div className={`relative ${coreDropdownOpen ? 'z-[9999]' : 'z-10'}`}>
                     <button onClick={() => setCoreDropdownOpen(!coreDropdownOpen)} className="w-full flex items-center justify-between p-4 rounded-[12px] border border-zinc-800 bg-[#1C1C1C] hover:bg-[#262626] transition-all text-left shadow-sm focus:border-indigo-500/50 outline-none">
                       <div className="flex items-start gap-3">
                          <div className="mt-0.5 opacity-80">{coreArchetypes.find(p=>p.id===coreArchetype)?.icon}</div>
                          <div>
                             <div className="text-[13px] font-bold text-zinc-200 tracking-tight font-mono">{coreArchetypes.find(p=>p.id===coreArchetype)?.shortTitle}</div>
                          </div>
                       </div>
                       <ChevronDown className={`w-4 h-4 text-[#a6a6a6] transition-transform ${coreDropdownOpen ? 'rotate-180' : ''}`} />
                     </button>
                     {coreDropdownOpen && (
                       <div className="absolute top-full left-0 w-full mt-2 bg-[#1C1C1C] border border-zinc-700 rounded-[12px] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-[1000] flex flex-col">
                         {coreArchetypes.map(p => (
                           <button key={p.id} onClick={() => { setCoreArchetype(p.id); setCoreDropdownOpen(false); }} className={`w-full text-left p-4 flex items-start gap-3 transition-all ${coreArchetype === p.id ? 'border-l-[3px] border-emerald-400 bg-emerald-500/10' : 'border-l-[3px] border-transparent hover:bg-[#262626]'}`}>
                             <div className="mt-0.5 opacity-80">{p.icon}</div>
                             <div className="flex-1">
                               <div className={`text-[12px] font-bold flex items-center justify-between tracking-tight font-mono ${coreArchetype === p.id ? 'text-emerald-300' : 'text-[#a6a6a6]'}`}>{p.shortTitle}</div>
                               <div className="text-[10px] text-zinc-500 mt-1 tracking-tight font-mono">{p.subtitle}</div>
                             </div>
                           </button>
                         ))}
                       </div>
                     )}
                   </div>
                 </div>
             </div>

             {/* 2. Specific Inputs (Creation vs Edit) */}
             {!isEditMode ? (
                <div className="shrink-0 rounded-[12px] border border-zinc-800/80 p-5 bg-[#171717] shadow-lg space-y-6 relative overflow-hidden">
                   <div>
                      <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5 font-mono"><Lock className="w-3 h-3" /> [L1] 텍스트 보존 락</div>
                      <textarea value={inputText} onChange={e => setInputText(e.target.value)} placeholder="텍스트 입력 (엔터로 줄바꿈)" rows={inputText.includes('\n') ? 2 : 1} className={`w-full bg-[#0A0A0A] font-black outline-none text-white border border-zinc-800 rounded-[10px] px-4 py-3 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all shadow-inner resize-none custom-scrollbar font-mono ${inputText.includes('\n') || inputText.length > 10 ? 'text-[15px] leading-tight' : 'text-[20px] leading-tight'}`} />
                   </div>

                   <div>
                      <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center justify-between font-mono">
                         <div className="flex items-center gap-1.5"><ScanLine className="w-3 h-3" /> [L3] 이미지 역설계 (레퍼런스 분석)</div>
                      </div>
                      {incomingFromArc && (
                        <div className="mb-3 px-3 py-2 rounded-[8px] border border-[#6C5CE7]/40 bg-[#6C5CE7]/10 flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                          <Sparkles className="w-3.5 h-3.5 text-[#A29BFE] shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0 text-left">
                            <div className="text-[10px] font-bold text-[#A29BFE] tracking-wider uppercase">프롬프트 아크에서 전달됨</div>
                            <div className="text-[10px] text-zinc-400 mt-0.5">
                              {incomingFromArc.hasImage
                                ? (isAnalyzingCreation ? '이미지 분석 중... 옵션 자동 설정' : '이미지 + 옵션 자동 설정 완료')
                                : '이미지 로드 실패. 텍스트만 적용됨'}
                            </div>
                            {incomingFromArc.tags?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {incomingFromArc.tags.slice(0, 6).map((t, i) => (
                                  <span key={i} className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-bold text-zinc-300">#{t}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button onClick={() => setIncomingFromArc(null)} className="text-zinc-500 hover:text-zinc-300 shrink-0" title="배지 닫기">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <div
                         onDragOver={handleCreationDragOver}
                         onDragLeave={handleCreationDragLeave}
                         onDrop={handleCreationDrop}
                         className={`relative rounded-[10px] border border-dashed p-4 text-center transition-all flex flex-col items-center justify-center ${isCreationDragging ? 'bg-[#262626] border-emerald-500/50' : 'border-zinc-700/60 bg-[#121212] hover:bg-[#1A1A1A]'}`}
                      >
                         {creationUploadedImage ? (
                            <div className="flex flex-col items-center gap-3 w-full">
                               <img src={creationUploadedImage} className="h-20 object-contain rounded-[6px] border border-zinc-700/50 shadow-md" />
                               <div className="flex gap-2">
                                   <button onClick={() => analyzeCreationImage(creationUploadedImage)} disabled={isAnalyzingCreation} className="text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-[6px] flex items-center gap-1.5 transition-colors disabled:opacity-50">
                                      {isAnalyzingCreation ? <Loader2 className="w-3 h-3 animate-spin"/> : <Cpu className="w-3 h-3"/>} 역설계 분석
                                   </button>
                                   <button onClick={() => setCreationUploadedImage(null)} className="text-[10px] font-bold text-red-400 hover:text-red-300 px-3 py-1.5 bg-red-500/10 rounded-[6px] transition-colors border border-red-500/20">제거</button>
                               </div>
                            </div>
                         ) : (
                            <div className="text-[11px] font-bold text-[#a6a6a6] flex flex-col items-center gap-2 py-2">
                               <ImageIcon className="w-6 h-6 opacity-40 mb-1"/>
                               <span className="text-zinc-400 tracking-wider font-mono">REFERENCE UPLOAD</span>
                               <span className="text-[9px] text-zinc-600 font-normal">레퍼런스 이미지 드래그 앤 드롭</span>
                            </div>
                         )}
                         {!creationUploadedImage && <input type="file" onChange={handleCreationImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />}
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                         <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5 font-mono"><ZapPulse className="w-3 h-3" /> 조형 오라 정규화</div>
                         <button onClick={handleExpandIntent} disabled={isExpandingIntent || !customDesignInjections.trim()} title="자동 구체화" className={`p-1.5 rounded-[6px] transition-all flex items-center justify-center ${isExpandingIntent ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 shadow-sm'}`}>
                            {isExpandingIntent ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand className="w-3 h-3" />}
                         </button>
                      </div>
                      <textarea value={customDesignInjections} onChange={e => setCustomDesignInjections(e.target.value)} placeholder="역설계 분석 시 텍스트가 자동 생성됩니다. 직접 입력도 가능합니다." className={`mt-2 w-full bg-[#1C1C1C] text-[12px] p-4 rounded-[10px] border outline-none min-h-[5rem] resize-none text-zinc-300 custom-scrollbar tracking-tight placeholder:text-zinc-600 focus:ring-2 transition-all shadow-sm font-mono ${hasKoreanAura ? 'border-amber-500/50 focus:border-amber-500 focus:ring-amber-500/20' : 'border-zinc-800 focus:border-emerald-500/50 focus:ring-emerald-500/10'}`} />
                      {hasKoreanAura && (
                         <div className="mt-2 flex items-start gap-1.5 text-[10px] text-amber-400/90 font-bold bg-amber-500/10 p-2 rounded-[6px] border border-amber-500/20">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>한글이 포함되어 있습니다. AI 최적화를 위해 마술봉 버튼을 눌러 영문으로 정규화하세요.</span>
                         </div>
                      )}

                      <div className="mt-4 bg-[#1C1C1C] rounded-[10px] p-4 shadow-inner border border-zinc-800/60">
                         <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] font-bold text-zinc-500 font-mono tracking-tighter">{sliderDesc.leftLabel}</span>
                            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500/60" />
                            <span className="text-[10px] font-bold text-emerald-500 font-mono tracking-tighter">{sliderDesc.rightLabel}</span>
                         </div>
                         <input type="range" min="0" max="100" value={personaSliderValue} onChange={e => setPersonaSliderValue(e.target.value)} className="w-full h-1.5 bg-zinc-700 rounded-[10px] appearance-none cursor-pointer accent-emerald-500" />
                      </div>
                   </div>
                </div>
             ) : (
                <div className="shrink-0 rounded-[12px] border border-zinc-800/80 p-5 bg-[#171717] shadow-lg space-y-6 relative overflow-hidden">
                   <div>
                      <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5 font-mono"><Lock className="w-3 h-3" /> [L1] 타겟 형태 보존 락</div>
                      <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleEditDrop} className={`relative rounded-[10px] border border-dashed border-zinc-700/60 p-5 text-center transition-all min-h-[130px] flex flex-col items-center justify-center ${isDragging ? 'bg-[#262626] border-emerald-500/50' : 'bg-[#121212] hover:bg-[#1A1A1A]'}`}>
                        {editUploadedImage ? (
                          <div className="flex flex-col items-center justify-center w-full gap-3">
                              <img src={editUploadedImage} className="h-20 object-contain rounded-[6px] border border-zinc-700/50 shadow-md" />
                              <button onClick={() => setEditUploadedImage(null)} className="text-[9px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 px-3 py-1.5 bg-red-500/10 rounded-full transition-colors border border-red-500/20"><X className="w-3 h-3" /> 제거</button>
                          </div>
                        ) : (
                          <div className="text-[12px] font-bold text-[#a6a6a6] flex flex-col items-center gap-2">
                            <ImageIcon className="w-7 h-7 opacity-40 mb-1"/>
                            <span className="text-zinc-400 font-mono">TARGET UPLOAD</span>
                            <span className="text-[10px] text-zinc-600 font-normal">95% 실루엣 보존 락 활성화됨</span>
                          </div>
                        )}
                        {!editUploadedImage && <input type="file" title="" onChange={handleEditImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />}
                      </div>
                      {!editUploadedImage && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[12px] bg-[#121212]/60 backdrop-blur-[2px]">
                           <div className="bg-[#1C1C1C] px-4 py-2 rounded-[8px] border border-emerald-500/30 flex items-center gap-2 shadow-2xl">
                              <AlertCircle className="w-4 h-4 text-emerald-400" />
                              <span className="text-[12px] font-bold text-emerald-300">기준 이미지가 필요합니다</span>
                           </div>
                        </div>
                      )}
                   </div>

                   <div className={`transition-all duration-300 relative ${!editUploadedImage ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
                      <div className="mb-2 flex items-center justify-between">
                         <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5 font-mono"><Brush className="w-3 h-3" /> [L3] 마이크로 리터칭 오라</div>
                         <div className="flex gap-1.5">
                           <button onClick={openEditTuningRoom} disabled={!editInstruction.trim()} title="튜닝룸" className={`p-2 rounded-[8px] transition-all flex items-center justify-center ${!editInstruction.trim() ? 'opacity-30 cursor-not-allowed text-zinc-600' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20'}`}>
                              <MessageSquare className="w-3.5 h-3.5" />
                           </button>
                           <button onClick={handleEditExpandIntent} disabled={isEditExpandingIntent || !editInstruction.trim()} title="자동 구체화" className={`p-2 rounded-[8px] transition-all flex items-center justify-center ${isEditExpandingIntent ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 shadow-sm'}`}>
                              {isEditExpandingIntent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SparkleIcon className="w-3.5 h-3.5" />}
                           </button>
                         </div>
                      </div>
                      <textarea value={editInstruction} onChange={e => setEditInstruction(e.target.value)} placeholder="리터칭 방향 입력 후 마술봉 버튼을 눌러 영문으로 변환하세요." className={`w-full bg-[#1C1C1C] text-[12px] tracking-tight p-4 rounded-[10px] border outline-none min-h-[5rem] resize-none text-zinc-300 custom-scrollbar placeholder:text-zinc-600 focus:ring-2 transition-all shadow-sm font-mono ${hasKoreanEdit ? 'border-amber-500/50 focus:border-amber-500 focus:ring-amber-500/20' : 'border-zinc-800 focus:border-emerald-500/50 focus:ring-emerald-500/10'}`} />
                      {hasKoreanEdit && (
                         <div className="mt-2 flex items-start gap-1.5 text-[10px] text-amber-400/90 font-bold bg-amber-500/10 p-2 rounded-[6px] border border-amber-500/20">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>한글이 포함되어 있습니다. AI 최적화를 위해 마술봉 버튼을 눌러 영문으로 정규화하세요.</span>
                         </div>
                      )}

                      <div className="mt-4 bg-[#1C1C1C] rounded-[10px] p-4 shadow-inner border border-zinc-800/60">
                         <div className="flex justify-between items-center mb-3">
                            <span className="text-[9px] font-bold text-zinc-500 font-mono tracking-tighter">{sliderDesc.leftLabel}</span>
                            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500/60" />
                            <span className="text-[9px] font-bold text-emerald-500 font-mono tracking-tighter">{sliderDesc.rightLabel}</span>
                         </div>
                         <input type="range" min="0" max="100" value={personaSliderValue} onChange={e => setPersonaSliderValue(e.target.value)} className="w-full h-1.5 bg-zinc-700 rounded-[10px] appearance-none cursor-pointer accent-emerald-500" />
                      </div>

                      <div className="mt-5 space-y-2">
                         <div className="flex items-center justify-between bg-[#1C1C1C] rounded-[10px] border border-zinc-800/80 p-3 hover:border-zinc-700 transition-colors shadow-sm">
                            <div className="flex items-center gap-2">
                               <Wand className={`w-4 h-4 ${applyAutoRefine ? 'text-emerald-400' : 'text-zinc-600'}`} />
                               <span className={`text-[12px] font-bold tracking-wide font-mono ${applyAutoRefine ? 'text-emerald-300' : 'text-zinc-500'}`}>Sketch Normalization</span>
                            </div>
                            <button onClick={() => setApplyAutoRefine(!applyAutoRefine)} className={`w-9 h-5 rounded-full p-1 flex items-center transition-colors shadow-inner ${applyAutoRefine ? 'bg-emerald-500' : 'bg-[#121212] border border-zinc-800'}`}>
                               <div className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${applyAutoRefine ? 'translate-x-4 border-none' : 'translate-x-0 border border-zinc-600'}`} />
                            </button>
                         </div>
                      </div>
                   </div>
                </div>
             )}

             {/* 3. Export / Reset Buttons (Common) */}
             {!isEditMode && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button onClick={extractRecipe} title="현재 설정들을 Typecore JSON Recipe 형태로 복사합니다" className="py-3 bg-indigo-600/10 border border-indigo-500/30 hover:bg-indigo-600/20 text-indigo-400 rounded-[10px] flex items-center justify-center gap-2 transition-all shadow-sm">
                    <Code className="w-4 h-4" /> <span className="text-[11px] font-bold tracking-wide font-mono">Export JSON Recipe</span>
                  </button>
                  <button onClick={handleReset} title="초기화" className="py-3 bg-[#1C1C1C] border border-zinc-800 hover:bg-[#262626] hover:text-white text-zinc-400 rounded-[10px] flex items-center justify-center gap-2 transition-colors">
                    <RefreshCcw className="w-4 h-4" /> <span className="text-[11px] font-bold tracking-wide font-mono">Reset Parameters</span>
                  </button>
                </div>
             )}

             {/* 4. Core Options Wrapper */}
             <div className={`transition-all duration-300 pb-8 ${(isEditMode && !editUploadedImage) ? 'opacity-30 pointer-events-none grayscale' : ''}`}>

                 <div className="shrink-0 my-4 p-2.5 rounded-[10px] border border-zinc-800/80 bg-[#171717] flex items-center justify-between shadow-sm transition-colors">
                     <div className="flex items-center gap-2 pl-1">
                        <Settings className="w-4 h-4 text-zinc-500" />
                        <h3 className="text-[11px] font-bold uppercase tracking-wide text-zinc-300 font-mono">Advanced Parameters</h3>
                     </div>
                     <div className="flex bg-[#0A0A0A] rounded-[6px] p-0.5 border border-zinc-800 shadow-inner">
                        <button onClick={() => setIsAdvancedOptionsEnabled(false)} className={`px-3 py-1 text-[10px] font-bold rounded-[4px] transition-all font-mono ${!isAdvancedOptionsEnabled ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Basic</button>
                        <div className="w-[1px] bg-zinc-800 my-1 mx-0.5" />
                        <button onClick={() => setIsAdvancedOptionsEnabled(true)} className={`px-3 py-1 text-[10px] font-bold rounded-[4px] transition-all font-mono ${isAdvancedOptionsEnabled ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Advanced</button>
                     </div>
                 </div>

                 {isEditMode && (
                    <OptionGroupCard id="edit_retouch" openCardId={editOpenCardId} onToggle={handleEditToggleCard} title="[L4] 마이크로 리터칭" icon={<Highlighter className="w-3.5 h-3.5 text-zinc-500" />} summary={`${getOptionName([...staticOptions.editStrokeMods, ...(dynamicOptions.editStrokeMods || [])], editStrokeMod).split(' ')[0]} · ${getOptionName([...staticOptions.editElementMods, ...(dynamicOptions.editElementMods || [])], editElementMod).split(' ')[0]}`}>
                      <div className="space-y-3">
                          <DropdownControl label="획(Stroke) 변형" data={[...staticOptions.editStrokeMods, ...(dynamicOptions.editStrokeMods || [])]} value={editStrokeMod} onChange={setEditStrokeMod} theme={theme} />
                          <DropdownControl label="요소(Element) 변환" data={[...staticOptions.editElementMods, ...(dynamicOptions.editElementMods || [])]} value={editElementMod} onChange={setEditElementMod} theme={theme} />
                          <DropdownControl label="표면(Surface) 질감" data={[...staticOptions.editSurfaceMods, ...(dynamicOptions.editSurfaceMods || [])]} value={editSurfaceMod} onChange={setEditSurfaceMod} theme={theme} />
                      </div>
                    </OptionGroupCard>
                 )}

                 {isAdvancedOptionsEnabled && (
                     <OptionGroupCard id="stroke_body" openCardId={isEditMode ? editOpenCardId : openCardId} onToggle={isEditMode ? handleEditToggleCard : handleToggleCard} title="[L3] 서체 골격 & 비례" icon={<AlignCenter className="w-3.5 h-3.5 text-zinc-500" />} summary={`${getOptionName([...staticOptions.stemWeights, ...(dynamicOptions.stemWeights || [])], stemWeight).split(' ')[0]} · ${getOptionName(staticOptions.proportions, charProportion).split(' ')[0]}`}>
                        <div className="grid grid-cols-2 gap-3">
                          <DropdownControl label="획 굵기 (Weight)" data={[...staticOptions.stemWeights, ...(dynamicOptions.stemWeights || [])]} value={stemWeight} onChange={setStemWeight} theme={theme} />
                          <DropdownControl label="글자 폭 (Width)" data={staticOptions.widths} value={charWidth} onChange={setCharWidth} theme={theme} />
                        </div>
                        <div className="mt-3">
                          <DropdownControl label="골격 비례 (Proportion)" data={staticOptions.proportions} value={charProportion} onChange={setCharProportion} theme={theme} />
                        </div>
                     </OptionGroupCard>
                 )}

                 {isAdvancedOptionsEnabled && (
                     <OptionGroupCard id="terminal" openCardId={isEditMode ? editOpenCardId : openCardId} onToggle={isEditMode ? handleEditToggleCard : handleToggleCard} title="[L3] 획 마감 & 엣지" icon={<Brush className="w-3.5 h-3.5 text-zinc-500" />} summary={`${getOptionName([...staticOptions.terminalStyles, ...(dynamicOptions.terminalStyles || [])], terminalStyle).split(' ')[0]} · ${getOptionName([...staticOptions.strokeSharpness, ...(dynamicOptions.strokeSharpness || [])], strokeSharpness).split(' ')[0]}`}>
                        <div className="grid grid-cols-2 gap-3">
                          <DropdownControl label="마감(Terminal) 방식" data={[...staticOptions.terminalStyles, ...(dynamicOptions.terminalStyles || [])]} value={terminalStyle} onChange={setTerminalStyle} theme={theme} />
                          <DropdownControl label="예리함 강도" data={[...staticOptions.strokeSharpness, ...(dynamicOptions.strokeSharpness || [])]} value={strokeSharpness} onChange={setStrokeSharpness} theme={theme} />
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <DropdownControl label="구조적 절단" data={[...staticOptions.slicingIntensities, ...(dynamicOptions.slicingIntensities || [])]} value={slicingIntensity} onChange={setSlicingIntensity} theme={theme} />
                          <DropdownControl label="코너 모서리 성격" data={[...staticOptions.cornerStyles, ...(dynamicOptions.cornerStyles || [])]} value={cornerStyle} onChange={setCornerStyle} theme={theme} />
                        </div>
                        <div className="mt-3">
                          <DropdownControl label="끝단 연장선" data={[...staticOptions.strokeExtensions, ...(dynamicOptions.strokeExtensions || [])]} value={strokeExtension} onChange={setStrokeExtension} theme={theme} />
                        </div>
                     </OptionGroupCard>
                 )}

                 {(!isEditMode && isAdvancedOptionsEnabled) && (
                     <OptionGroupCard id="connection" openCardId={openCardId} onToggle={handleToggleCard} title="[L3] 결속 & 흐름" icon={<Layers3 className="w-3.5 h-3.5 text-zinc-500" />} summary={`${getOptionName([...staticOptions.kerningOptions, ...(dynamicOptions.kerningOptions || [])], kerning).split(' ')[0]}`}>
                        <div className="grid grid-cols-2 gap-3">
                          <DropdownControl label="자간 조절" data={[...staticOptions.kerningOptions, ...(dynamicOptions.kerningOptions || [])]} value={kerning} onChange={setKerning} theme={theme} />
                          <DropdownControl label="문자 간 결합" data={[...staticOptions.letterConnections, ...(dynamicOptions.letterConnections || [])]} value={letterConnection} onChange={setLetterConnection} theme={theme} />
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <DropdownControl label="내부 공간(Counter)" data={[...staticOptions.internalSpaces, ...(dynamicOptions.internalSpaces || [])]} value={internalSpace} onChange={setInternalSpace} theme={theme} />
                          <DropdownControl label="로고화 및 엠블럼" data={[...staticOptions.logoDegrees, ...(dynamicOptions.logoDegrees || [])]} value={logoDegree} onChange={setLogoDegree} theme={theme} />
                        </div>
                     </OptionGroupCard>
                 )}

                 {isAdvancedOptionsEnabled && (
                     <OptionGroupCard id="intensity" openCardId={isEditMode ? editOpenCardId : openCardId} onToggle={isEditMode ? handleEditToggleCard : handleToggleCard} title="[L6/L7] 스타일 가드레일 & VFX" icon={<BoxIcon className="w-3.5 h-3.5 text-zinc-500" />} summary={`${getOptionName(staticOptions.base, baseStyle).split(' ')[0]}`}>
                        <div className="grid grid-cols-2 gap-3">
                          <DropdownControl label="배경 대비 제어" icon={<BoxIcon className="w-3 h-3" />} data={staticOptions.base} value={baseStyle} onChange={setBaseStyle} theme={theme} />
                          <DropdownControl label="표면 부식 한계" data={[...staticOptions.deformationDamages, ...(dynamicOptions.deformationDamages || [])]} value={deformationDamage} onChange={setDeformationDamage} theme={theme} />
                        </div>
                        <div className="mt-3">
                          <DropdownControl label="주변 이펙트(VFX)" data={[...staticOptions.MMOSurroundingElements, ...(dynamicOptions.MMOSurroundingElements || [])]} value={mmoSurroundingElement} onChange={setMmoSurroundingElement} theme={theme} />
                        </div>
                     </OptionGroupCard>
                 )}

               <section className="mt-6 border-t border-zinc-800/50 pt-4 px-3">
                 <div className="flex items-center justify-between">
                    <SectionHeader id="[L4]" label="모디파이어 (구조 강제)" icon={<Wand className="w-3.5 h-3.5" />} theme={theme} />
                    <div className="flex items-center gap-2 mt-3 cursor-pointer" onClick={() => setIsEnhanceModeEnabled(!isEnhanceModeEnabled)}>
                       <span className={`text-[11px] font-bold uppercase tracking-wide font-mono ${isEnhanceModeEnabled ? 'text-indigo-400' : 'text-zinc-500'}`}>{isEnhanceModeEnabled ? 'ACTIVE' : 'OFF'}</span>
                       <div className={`w-9 h-5 rounded-full p-1 flex items-center transition-colors shadow-inner ${isEnhanceModeEnabled ? 'bg-indigo-500' : 'bg-[#1C1C1C] border border-zinc-800'}`}>
                          <div className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${isEnhanceModeEnabled ? 'translate-x-4 border-none' : 'translate-x-0 border border-zinc-600'}`} />
                       </div>
                    </div>
                 </div>
                 <div className={`p-3 rounded-[10px] border bg-[#171717] border-zinc-800/80 mt-3 shadow-sm transition-all duration-300 ${!isEnhanceModeEnabled ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
                    <div className="flex bg-[#0A0A0A] rounded-[10px] p-1 border border-zinc-800/60">
                       <button onClick={() => isEnhanceModeEnabled && setEnhanceMode('refine')} className={`flex-1 py-2.5 rounded-[8px] text-[12px] font-bold font-mono transition-all ${enhanceMode === 'refine' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 shadow-sm' : 'text-[#a6a6a6] hover:text-zinc-300 border border-transparent'}`}>Refine</button>
                       <button onClick={() => isEnhanceModeEnabled && setEnhanceMode('variation')} className={`flex-1 py-2.5 rounded-[8px] text-[12px] font-bold font-mono transition-all ${enhanceMode === 'variation' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm' : 'text-[#a6a6a6] hover:text-zinc-300 border border-transparent'}`}>Variation</button>
                       <button onClick={() => isEnhanceModeEnabled && setEnhanceMode('deconstruct')} className={`flex-1 py-2.5 rounded-[8px] text-[12px] font-bold font-mono transition-all ${enhanceMode === 'deconstruct' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-sm' : 'text-[#a6a6a6] hover:text-zinc-300 border border-transparent'}`}>Deconstruct</button>
                    </div>
                 </div>

                 <div className="mt-4 pt-4 border-t border-zinc-800/50">
                   <div className="flex items-center justify-between pl-1">
                      <div className="flex items-center gap-2">
                         <FastForward className="w-3.5 h-3.5 text-zinc-500" />
                         <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 font-mono">[L5] 전투 동세</h3>
                      </div>
                      <div className="flex items-center gap-2 cursor-pointer" onClick={() => setMomentumActive(!momentumActive)}>
                         <span className={`text-[10px] font-bold uppercase tracking-wide font-mono ${momentumActive ? 'text-amber-400' : 'text-zinc-500'}`}>{momentumActive ? 'ACTIVE' : 'OFF'}</span>
                         <div className={`w-9 h-5 rounded-full p-1 flex items-center transition-colors shadow-inner ${momentumActive ? 'bg-amber-500' : 'bg-[#1C1C1C] border border-zinc-800'}`}>
                            <div className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${momentumActive ? 'translate-x-4 border-none' : 'translate-x-0 border border-zinc-600'}`} />
                         </div>
                      </div>
                   </div>
                 </div>
               </section>
             </div>


          </div>
        </aside>

        {/* Right Main Panel */}
        <div className="flex-1 flex flex-col bg-[#141414] backdrop-blur-xl rounded-[16px] border border-zinc-800/80 shadow-2xl relative overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10">
            <div className="max-w-[850px] w-full mx-auto pb-20">

              {/* Header Action Bar */}
              <div className="flex items-center justify-between w-full pb-4 border-b border-zinc-800/60 mb-6">
                 <div className="flex items-center gap-3">
                    {!isSidebarOpen && (
                       <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-[#1C1C1C] hover:bg-zinc-800 rounded-[8px] border border-zinc-700 transition-colors shadow-sm shrink-0">
                          <Menu className="w-5 h-5 text-zinc-400 hover:text-white transition-colors" />
                       </button>
                    )}
                    <div>
                       <h2 className="text-[20px] font-bold text-white flex items-center gap-2 font-mono">
                         {isEditMode ? <><Edit3 className="w-5 h-5 text-zinc-400" /> L1-L7 Micro-Edit Assembly</> : <><PenTool className="w-5 h-5 text-zinc-400" /> L1-L7 Generator Assembly</>}
                       </h2>
                       <p className="text-[11px] font-mono tracking-tighter text-zinc-500 mt-1">{isEditMode ? 'Enforces 95% shape preservation for structural modifications.' : 'Compiles parameter locks into a predictable model prompt.'}</p>
                    </div>
                 </div>
                 {!isEditMode && (
                    <button onClick={() => setIsImportModalOpen(true)} title="프롬프트 역설계 (텍스트/JSON)" className="p-2.5 rounded-[10px] bg-[#1C1C1C] border border-zinc-700 hover:bg-[#262626] text-zinc-400 transition-colors flex items-center justify-center shadow-sm">
                       <FileUp className="w-4 h-4" />
                    </button>
                 )}
              </div>

              {/* Model Adapters Tabs */}
              <div className="flex flex-nowrap items-center gap-2 overflow-x-auto custom-scrollbar mb-6">
                 <button onClick={() => setModel('Overview')} className={`shrink-0 min-w-max px-6 py-2.5 rounded-[8px] text-[12px] font-bold tracking-wide font-mono transition-all shadow-sm ${currentModel === 'Overview' ? 'bg-zinc-800 text-white' : 'bg-[#121212] text-zinc-500 hover:bg-[#1A1A1A] hover:text-zinc-300'}`}>Validation</button>
                 {aiOptimizationModels.map(model => (
                   <button key={model.id} onClick={() => setModel(model.id)} className={`shrink-0 min-w-max px-6 py-2.5 rounded-[8px] text-[12px] font-bold tracking-wide font-mono transition-all shadow-sm ${currentModel === model.id ? 'bg-indigo-600 text-white' : 'bg-[#121212] text-zinc-500 hover:bg-[#1A1A1A] hover:text-zinc-300'}`}>{model.name}</button>
                 ))}
              </div>

              {/* Dynamic Content based on selected Model */}
              {currentModel === 'Overview' ? renderOverviewTab() : (
                 <>
                    {/* Visual representation of active guards instead of full code block */}
                    <div className="bg-[#1C1C1C] border border-zinc-800/80 rounded-[12px] p-5 shadow-sm mb-8">
                       <div className="flex justify-between items-center mb-5 border-b border-zinc-800/50 pb-3">
                          <div>
                             <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest font-mono block mb-1">Source of Truth</span>
                             <h4 className="text-zinc-200 text-[13px] font-bold font-mono">System Specification Matrix</h4>
                          </div>
                          <button onClick={() => setExpanded(!isExpanded)} className="text-[11px] font-bold font-mono bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5">
                             {isExpanded ? 'Summary' : 'View Raw'} <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                       </div>

                       {!isExpanded ? (
                          <div className="grid grid-cols-2 gap-4">
                             <div className="bg-[#121212] p-3.5 rounded-[8px] border border-zinc-800/50">
                                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1 block font-mono">[L1] Text Lock</span>
                                <p className="text-[13px] text-indigo-300 font-bold break-all font-mono">"{inputText}"</p>
                                <p className="text-[9px] text-zinc-500 mt-1 font-mono tracking-tighter">100% Mutation Prevention</p>
                             </div>
                             <div className="bg-[#121212] p-3.5 rounded-[8px] border border-zinc-800/50">
                                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1 block font-mono">[L2] Layout Lock</span>
                                <p className="text-[12px] text-zinc-300 font-bold font-mono tracking-tight">{getOptionName(staticOptions.layouts, layoutType).split(' ')[0]}</p>
                                <p className="text-[9px] text-zinc-500 mt-1 font-mono tracking-tighter">{getOptionName(staticOptions.ratios, aspectRatio)} / {getOptionName(staticOptions.occupancies, occupancy).split(' ')[0]}</p>
                             </div>
                             <div className="bg-[#121212] p-3.5 rounded-[8px] border border-zinc-800/50">
                                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1 block font-mono">[L3] Morphology</span>
                                <p className="text-[12px] text-zinc-300 font-bold font-mono tracking-tight">{coreArchetypes.find(p=>p.id===coreArchetype)?.shortTitle}</p>
                             </div>
                             <div className="bg-[#121212] p-3.5 rounded-[8px] border border-zinc-800/50">
                                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5 font-mono"><Shield className="w-3 h-3 text-emerald-500"/> [L8] Active Guards</span>
                                <div className="flex flex-wrap gap-1.5 mt-1 font-mono">
                                   {activeGuards.includes('guard_mutation') && <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded">L1_TEXT</span>}
                                   {activeGuards.includes('guard_layout') && <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded">L2_LAYOUT</span>}
                                   {activeGuards.includes('guard_3d') && <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded">L6_STYLE</span>}
                                </div>
                             </div>
                          </div>
                       ) : (
                          <div className="bg-[#0A0A0A] p-4 rounded-[8px] border border-zinc-800 relative">
                             <button onClick={() => copyToClipboard(currentPrompts.baseTechnicalEn, 'top')} className="absolute top-3 right-3 p-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-[10px] flex items-center gap-1 font-mono">
                                {copiedTop ? <CheckCircle className="w-3 h-3"/> : <Copy className="w-3 h-3" />} Copy
                             </button>
                             <pre className="text-[11px] text-zinc-400 whitespace-pre-wrap leading-relaxed font-mono">{currentPrompts.baseTechnicalEn}</pre>
                          </div>
                       )}
                    </div>

                    {/* Action Button for the selected Model */}
                    <div className="mt-8 flex justify-end">
                       {currentModel === 'NanoBanana' && (
                          <button onClick={handleCompileDramatic} disabled={isEnhancing} className={`px-6 py-3.5 rounded-[8px] font-bold font-mono text-[13px] transition-all flex items-center justify-center gap-2 shadow-md w-full sm:w-auto ${isPromptOutdated ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400 cursor-default'}`}>
                             {isEnhancing ? <Loader2 className="w-4 h-4 animate-spin" /> : (isPromptOutdated ? <RefreshCcw className="w-4 h-4" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />)}
                             {isPromptOutdated ? 'Compile Directives' : 'Compiled (Up to date)'}
                          </button>
                       )}
                       {currentModel === 'Midjourney' && (
                          <button onClick={handleCompileMj} disabled={isGeneratingMj} className={`px-6 py-3.5 rounded-[8px] font-bold font-mono text-[13px] transition-all flex items-center justify-center gap-2 shadow-md w-full sm:w-auto ${isPromptOutdated ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400 cursor-default'}`}>
                             {isGeneratingMj ? <Loader2 className="w-4 h-4 animate-spin" /> : (isPromptOutdated ? <RefreshCcw className="w-4 h-4" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />)}
                             {isPromptOutdated ? 'Compile Directives' : 'Compiled (Up to date)'}
                          </button>
                       )}
                       {currentModel === 'ChatGPT' && (
                          <button onClick={handleCompileCg} disabled={isGeneratingCg} className={`px-6 py-3.5 rounded-[8px] font-bold font-mono text-[13px] transition-all flex items-center justify-center gap-2 shadow-md w-full sm:w-auto ${isPromptOutdated ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400 cursor-default'}`}>
                             {isGeneratingCg ? <Loader2 className="w-4 h-4 animate-spin" /> : (isPromptOutdated ? <RefreshCcw className="w-4 h-4" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />)}
                             {isPromptOutdated ? 'Compile Directives' : 'Compiled (Up to date)'}
                          </button>
                       )}
                    </div>

                    {/* Output Box */}
                    {currentModel === 'NanoBanana' && renderAiOutputBox(currentModel, currentOutputContent, isPromptOutdated)}
                    {currentModel === 'Midjourney' && renderAiOutputBox(currentModel, currentOutputContent, isPromptOutdated)}
                    {currentModel === 'ChatGPT' && renderAiOutputBox(currentModel, currentOutputContent, isPromptOutdated)}
                 </>
              )}

            </div>
          </div>
        </div>


      </main>

      {/* Idea Tuning Room Modal */}
      {isTuningModalOpen && (
         <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-[460px] h-[750px] max-h-[90vh] bg-[#121212] border border-zinc-800 rounded-[12px] shadow-2xl flex flex-col relative overflow-hidden">
               <div className="flex items-center justify-between p-4 border-b border-zinc-800/60 shrink-0 bg-[#1A1A1A]">
                  <div className="flex items-center gap-2">
                     <MessageSquare className="w-4 h-4 text-zinc-300" />
                     <h3 className="text-white font-bold text-sm tracking-wide font-mono">L3 Aura Tuning Room</h3>
                  </div>
                  <button onClick={() => setIsTuningModalOpen(false)} className="text-[#a6a6a6] hover:text-white transition-colors p-1 rounded-[10px] hover:bg-zinc-800">
                     <X className="w-4 h-4" />
                  </button>
               </div>
               <div className="p-4 border-b border-zinc-800/50 bg-[#121212] shrink-0">
                  <div className="flex items-center gap-1.5 mb-2">
                     <Edit3 className="w-3.5 h-3.5 text-zinc-500" />
                     <span className="text-[11px] font-bold text-[#a6a6a6] tracking-wider uppercase font-mono">Current Normalized Aura</span>
                  </div>
                  <p className="text-[13px] font-mono tracking-tight text-emerald-300 bg-emerald-500/10 leading-relaxed max-h-[150px] overflow-y-auto custom-scrollbar whitespace-pre-wrap px-3 py-2.5 border-l-[3px] border-emerald-500 rounded-[6px]">"{currentTunedAura}"</p>
               </div>
               <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar bg-[#1A1A1A]" ref={tuningChatRef}>
                  {tuningChatHistory.map((msg, idx) => (
                     <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-[10px] px-4 py-3 text-[13px] leading-relaxed shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-zinc-700 text-white rounded-br-sm' : 'bg-[#121212] border border-zinc-800/80 text-zinc-300 rounded-tl-sm'}`}>
                           {msg.content}
                        </div>
                     </div>
                  ))}
                  {isTuningLoading && (
                     <div className="flex justify-start">
                        <div className="max-w-[85%] rounded-[10px] px-4 py-3 bg-[#121212] border border-zinc-800/80 text-zinc-400 rounded-tl-sm flex items-center gap-2 text-[13px] font-mono">
                           <Loader2 className="w-4 h-4 animate-spin" /> Normalizing...
                        </div>
                     </div>
                  )}
               </div>
               <div className="p-4 shrink-0 bg-[#1A1A1A] flex flex-col gap-3 border-t border-zinc-800/60">
                  {tuningReferenceImage && (
                    <div className="flex items-center justify-between bg-[#1C1C1C] p-2 rounded-[10px] border border-zinc-700 shadow-sm">
                      <div className="flex items-center gap-3">
                        <img src={`data:image/jpeg;base64,${tuningReferenceImage}`} className="h-10 w-auto rounded-[10px] border border-zinc-700 object-cover opacity-80" alt="ref" />
                        <div className="text-[11px] text-zinc-300 font-bold font-mono">Reference Image Attached</div>
                      </div>
                      <button onClick={() => setTuningReferenceImage(null)} title="레퍼런스 제거" className="p-1 hover:bg-red-500/20 rounded-[10px] text-red-400 transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                  )}
                  <div className="relative flex items-center gap-2">
                     <label title="스타일 분석을 위한 레퍼런스 이미지를 업로드합니다." className="cursor-pointer p-3.5 bg-[#1C1C1C] hover:bg-[#262626] border border-zinc-700 rounded-[10px] transition-colors shrink-0 shadow-sm group">
                       <ImageIcon className="w-4 h-4 text-[#a6a6a6] group-hover:text-white transition-colors" />
                       <input type="file" className="hidden" accept="image/*" onChange={(e) => handleTuningImageUpload(e, false)} />
                     </label>
                     <div className="relative flex-1">
                       <input
                          value={tuningInputValue}
                          onChange={e => setTuningInputValue(e.target.value)}
                          onKeyDown={e => { if(e.key === 'Enter') handleSendTuningMessage(); }}
                          placeholder="수정 요청이나 감성 키워드를 입력하세요."
                          className="w-full bg-[#1C1C1C] font-mono tracking-tighter border-2 border-zinc-800 rounded-[10px] pl-4 pr-12 py-3.5 text-[13px] text-zinc-200 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-zinc-600 shadow-sm"
                       />
                       <button
                          onClick={handleSendTuningMessage}
                          disabled={isTuningLoading || (!tuningInputValue.trim() && !tuningReferenceImage)}
                          title="전송"
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-[10px] transition-colors disabled:opacity-50"
                       >
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                       </button>
                     </div>
                  </div>
                  <button
                     onClick={() => { setCustomDesignInjections(currentTunedAura); setIsTuningModalOpen(false); }}
                     className="w-full py-4 bg-[#1C1C1C] hover:bg-zinc-800 rounded-[10px] font-bold font-mono text-[13px] text-white flex items-center justify-center gap-2 transition-all shadow-sm border border-zinc-700"
                  >
                     <CheckCircle className="w-4 h-4" /> Apply Directives & Close
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Edit Tuning Room Modal */}
      {isEditTuningModalOpen && (
         <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-[460px] h-[750px] max-h-[90vh] bg-[#121212] border border-zinc-800 rounded-[12px] shadow-2xl flex flex-col relative overflow-hidden">
               <div className="flex items-center justify-between p-4 border-b border-zinc-800/60 shrink-0 bg-[#1A1A1A]">
                  <div className="flex items-center gap-2">
                     <MessageSquare className="w-4 h-4 text-zinc-300" />
                     <h3 className="text-white font-bold text-sm tracking-wide font-mono">L4 Micro-Retouch Room</h3>
                  </div>
                  <button onClick={() => setIsEditTuningModalOpen(false)} className="text-[#a6a6a6] hover:text-white transition-colors p-1 rounded-[10px] hover:bg-zinc-800">
                     <X className="w-4 h-4" />
                  </button>
               </div>
               <div className="p-4 border-b border-zinc-800/50 bg-[#121212] shrink-0">
                  <div className="flex items-center gap-1.5 mb-2">
                     <Settings className="w-3.5 h-3.5 text-zinc-500" />
                     <span className="text-[11px] font-bold text-[#a6a6a6] tracking-wider uppercase font-mono">Current Instructions</span>
                  </div>
                  <p className="text-[13px] font-mono tracking-tight text-emerald-300 bg-emerald-500/10 leading-relaxed max-h-[150px] overflow-y-auto custom-scrollbar whitespace-pre-wrap px-3 py-2.5 border-l-[3px] border-emerald-500 rounded-[6px]">"{currentTunedEditAura}"</p>
               </div>
               <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar bg-[#1A1A1A]" ref={editTuningChatRef}>
                  {editTuningChatHistory.map((msg, idx) => (
                     <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-[10px] px-4 py-3 text-[13px] leading-relaxed shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-zinc-700 text-white rounded-br-sm' : 'bg-[#121212] border border-zinc-800/80 text-zinc-300 rounded-tl-sm'}`}>
                           {msg.content}
                        </div>
                     </div>
                  ))}
                  {isEditTuningLoading && (
                     <div className="flex justify-start">
                        <div className="max-w-[85%] rounded-[10px] px-4 py-3 bg-[#121212] border border-zinc-800/80 text-zinc-400 rounded-tl-sm flex items-center gap-2 text-[13px] font-mono">
                           <Loader2 className="w-4 h-4 animate-spin" /> Normalizing...
                        </div>
                     </div>
                  )}
               </div>
               <div className="p-4 shrink-0 bg-[#1A1A1A] flex flex-col gap-3 border-t border-zinc-800/60">
                  {editTuningReferenceImage && (
                    <div className="flex items-center justify-between bg-[#1C1C1C] p-2 rounded-[10px] border border-zinc-700 shadow-sm">
                      <div className="flex items-center gap-3">
                        <img src={`data:image/jpeg;base64,${editTuningReferenceImage}`} className="h-10 w-auto rounded-[10px] border border-zinc-700 object-cover opacity-80" alt="ref" />
                        <div className="text-[11px] text-zinc-300 font-bold font-mono">Reference Image Attached</div>
                      </div>
                      <button onClick={() => setEditTuningReferenceImage(null)} title="레퍼런스 제거" className="p-1 hover:bg-red-500/20 rounded-[10px] text-red-400 transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                  )}
                  <div className="relative flex items-center gap-2">
                     <label title="스타일 분석을 위한 레퍼런스 이미지를 업로드합니다." className="cursor-pointer p-3.5 bg-[#1C1C1C] hover:bg-[#262626] border border-zinc-700 rounded-[10px] transition-colors shrink-0 shadow-sm group">
                       <ImageIcon className="w-4 h-4 text-[#a6a6a6] group-hover:text-white transition-colors" />
                       <input type="file" className="hidden" accept="image/*" onChange={(e) => handleTuningImageUpload(e, true)} />
                     </label>
                     <div className="relative flex-1">
                       <input
                          value={editTuningInputValue}
                          onChange={e => setEditTuningInputValue(e.target.value)}
                          onKeyDown={e => { if(e.key === 'Enter') handleSendEditTuningMessage(); }}
                          placeholder="예: 낡은 부식 효과를 더 추가해줘"
                          className="w-full bg-[#1C1C1C] font-mono tracking-tighter border-2 border-zinc-800 rounded-[10px] pl-4 pr-12 py-3.5 text-[13px] text-zinc-200 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-zinc-600 shadow-sm"
                       />
                       <button
                          onClick={handleSendEditTuningMessage}
                          disabled={isEditTuningLoading || (!editTuningInputValue.trim() && !editTuningReferenceImage)}
                          title="전송"
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-[10px] transition-colors disabled:opacity-50"
                       >
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                       </button>
                     </div>
                  </div>
                  <button
                     onClick={() => { setEditInstruction(currentTunedEditAura); setIsEditTuningModalOpen(false); }}
                     className="w-full py-4 bg-[#1C1C1C] hover:bg-zinc-800 rounded-[10px] font-bold font-mono text-[13px] text-white flex items-center justify-center gap-2 transition-all shadow-sm border border-zinc-700"
                  >
                     <CheckCircle className="w-4 h-4" /> Apply Directives & Close
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Prompt Import Modal */}
      {isImportModalOpen && (
         <div className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-[600px] bg-[#121212] border border-zinc-800 rounded-[12px] shadow-2xl flex flex-col relative overflow-hidden">
               <div className="flex items-center justify-between p-5 border-b border-zinc-800/60 shrink-0 bg-[#1A1A1A]">
                  <div className="flex items-center gap-2.5">
                     <FileUp className="w-5 h-5 text-emerald-400" />
                     <h3 className="text-white font-bold text-[15px] tracking-wide font-mono">Import System Specification</h3>
                  </div>
                  <button onClick={() => setIsImportModalOpen(false)} className="text-[#a6a6a6] hover:text-white transition-colors p-1 rounded-[10px] hover:bg-zinc-800">
                     <X className="w-5 h-5" />
                  </button>
               </div>
               <div className="p-6 flex flex-col gap-4">
                  <p className="text-[12px] text-zinc-400 leading-relaxed font-mono tracking-tight">
                     이전에 복사해둔 <span className="text-zinc-200 font-bold">JSON Recipe</span> 또는 <span className="text-zinc-200 font-bold">[Base Technical Prompt]</span> 텍스트 전문을 붙여넣으세요. 엔진이 자동으로 이전 세팅을 완벽하게 복원합니다.
                  </p>
                  <textarea
                     value={importInputValue}
                     onChange={e => setImportInputValue(e.target.value)}
                     placeholder="Paste JSON Recipe or Text Prompt here..."
                     className="w-full h-[250px] bg-[#0A0A0A] text-[11px] font-mono text-zinc-300 p-4 rounded-[8px] border border-zinc-700 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all custom-scrollbar resize-none"
                  />
               </div>
               <div className="p-5 border-t border-zinc-800/60 bg-[#1A1A1A] flex justify-end gap-3 shrink-0">
                  <button onClick={() => setIsImportModalOpen(false)} className="px-5 py-2.5 rounded-[8px] text-[12px] font-bold text-[#a6a6a6] hover:text-white hover:bg-zinc-800 transition-colors font-mono">
                     Cancel
                  </button>
                  <button onClick={handleImportPrompt} disabled={!importInputValue.trim()} className="px-6 py-2.5 rounded-[8px] text-[12px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md disabled:opacity-50 flex items-center gap-2 font-mono">
                     <Download className="w-4 h-4" /> Import Specs
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default App;
