/* eslint-disable */
// 버전 스냅샷(아카이브): TypecoreSovereign v2. 이 파일은 의도적으로 동결되어 있어 ESLint 검사에서 제외한다.
import { useState, useRef, useEffect } from 'react';
import { GEMINI_API_KEY } from '../../services/gemini';
import { useUsageGate } from '../../../../components/UsageGate';
import { useGlobal } from '../../../../context/GlobalContext';
import {
    Command, LayoutTemplate, Anchor, Brush, Settings, Activity, Sparkles, Sparkles as SparkleIcon,
    ChevronDown, Wand, ShieldCheck, FastForward,
    Copy, CheckCircle, RefreshCcw, Loader2, Stars, Info, X,
    Download, FileUp, Menu,
    PenTool, Image as ImageIcon, Box as BoxIcon, ScanLine, Highlighter,
    Bot, Layers3,
    MessageSquare, Play, Edit3, SlidersHorizontal, Crown, Swords, AlertCircle, Wind, Pipette
} from 'lucide-react';

/**
 * Core & RPG Specialized Typography Engine - Stable Refactoring
 * - Fix: Relocated ALL UI rendering helper functions (`renderSidebarHeader`, `renderOverviewTab`, `renderDashboard`, `renderAiOutputBox`) to the bottom of the component structure, right before the final `return` statement.
 * - This resolves the repeated `ReferenceError` caused by attempting to render components before they (or their dependencies) were fully initialized.
 * - Integrity: ALL AI logic, persona prompts, UI parameters, and state configurations have been completely preserved without any abbreviations.
 */

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

// --- AI DIRECTOR PERSONAS ---
const directorPersonas = [
    {
        id: 'sovereign',
        icon: <Crown className="w-4 h-4 text-amber-400" />,
        shortTitle: "Typecore Sovereign (왕권/신전 구조)",
        subtitle: "장엄한 RPG 권위감, 수직 기둥과 밀도",
        role: "Typecore Sovereign. Focus solely on stroke morphology. Treat vertical stems as monumental fortress pillars and kerning as compressed stone pressure. Build dense, royal, and sacred structures.",
        keywords: "monumental, imperial, sacred, dense fortress, stone gate, royal authority, heavy vertical pillars",
        tone: "[장엄하고 숭고한] 고대 비석처럼 속이 꽉 찬 엄숙한 문체.",
        forbidden: "NO organic tentacle curves. NO excessive flying debris. NO asymmetrical collapse. NO futuristic cyber lines. NO thin/light strokes. Ornamentation MUST NOT override the main skeleton."
    },
    {
        id: 'obsidian',
        icon: <Swords className="w-4 h-4 text-rose-400" />,
        shortTitle: "Typecore Obsidian (검/금속 파열)",
        subtitle: "전투적이고 날카로운 다크 판타지, 칼날 마감",
        role: "Typecore Obsidian. Treat vertical stems as forged steel slabs and terminals as lethal blade edges. Use controlled slash cuts and aggressive geometric tension.",
        keywords: "forged steel, blade serif, dark fantasy, weaponized typography, slash cuts, aggressive terminals",
        tone: "[전투적이고 날카로운] 날이 선 검이 허공을 가르듯 서늘하고 공격적인 문체.",
        forbidden: "NO substituting aggression with fire/magic FX. Blade details MUST NOT float disconnected; all cuts must bind to stroke anatomy. NO illegible over-spiking. NO sci-fi mecha panel lines."
    },
    {
        id: 'aether',
        icon: <Wind className="w-4 h-4 text-sky-400" />,
        shortTitle: "Typecore Aether (신성/기운 흐름)",
        subtitle: "신비롭고 유려한 동양 판타지, 붓획과 에너지",
        role: "Typecore Aether. Combine disciplined brush anatomy with blade-like precision. Design strokes with flowing energy rhythm and elegant spiritual tension.",
        keywords: "mythic, ethereal, celestial, brush blade, spiritual energy, flowing stroke, martial elegance",
        tone: "[유려하고 신비로운] 기운이 흐르듯 유연하면서도 정교한 문체.",
        forbidden: "NO heavy fortress pillar structures. NO excessive metal/blade density. NO pure western gothic serifs. Energy/flow lines MUST NOT float aimlessly without structural connection."
    },
    {
        id: 'director',
        icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
        shortTitle: "Typecore Director (상업적 완성도)",
        subtitle: "실제 적용 가능한 가독성과 완벽한 로고 구조",
        role: "Typecore Director. Prioritize premium brand readability, flawless optical balance, and scalable silhouette. Act as a Director Override maintaining commercial validity.",
        keywords: "production-ready, brand site typography, premium readability, optical balance, scalable logo",
        tone: "[정교하고 실무적인] 프리미엄 브랜드 로고로서의 완벽한 광학적 균형을 논하는 문체.",
        forbidden: "NO micro-details that break upon scaling down. NO illegible distortion. NO irregular outlines hindering logo systemization. Clarity OVER extreme mood. NO purposeless over-ornamentation."
    }
];

const sliderDesc = { leftLabel: "무게감", rightLabel: "예리함", leftDesc: "거대 암석 같은 묵직한 실루엣", rightDesc: "공간을 베어내는 듯한 예리함" };

const getSliderText = (val) => {
    if (val < 35) return `[EXTREME FOCUS]: ${sliderDesc.leftDesc}`;
    if (val > 65) return `[EXTREME FOCUS]: ${sliderDesc.rightDesc}`;
    return `[BALANCED FOCUS]: '${sliderDesc.leftLabel}'과 '${sliderDesc.rightLabel}'의 완벽한 형태적 조화`;
};

const getSliderTextKo = (val) => {
    if (val < 35) return `[극단적 집중]: ${sliderDesc.leftDesc}`;
    if (val > 65) return `[극단적 집중]: ${sliderDesc.rightDesc}`;
    return `[균형적 집중]: '${sliderDesc.leftLabel}'과 '${sliderDesc.rightLabel}'의 완벽한 조화`;
};

// --- TROUBLESHOOTER & SAFETY GUARDS ---
const troubleshooterOptions = [
    { id: 'ts_mutation', label: '글자가 다른 문자로 바뀌어요', desc: '형태 예산을 잠그고 문자의 기본 골격을 완벽히 유지합니다.', fixEn: 'ANTI-MUTATION: STRICT TEXT LOCK. ZERO morphological deviation from the literal characters. Force 100% structural retention of the original alphabet.', fixKo: '변형 방지: 텍스트를 정확하게 잠급니다. 형태적 일탈 절대 금지. 원래 알파벳/문자의 구조적 보존 100% 강제.' },
    { id: 'ts_3d', label: '원치 않는 입체감(3D)이 생겨요', desc: '후면 돌출(Extrusion)을 완벽히 차단하고 평면을 강제합니다.', fixEn: 'FLAT ENFORCEMENT: ABSOLUTELY NO EXTRUSION. Force strict 2D vector path flat graphic. Kill all depth, shadows, and 3D bevels.', fixKo: '평면 강제: 후면 돌출 절대 금지. 엄격한 2D 평면 벡터 그래픽 강제. 모든 깊이감, 그림자, 3D 베벨 제거.' },
    { id: 'ts_legibility', label: '형태를 알아보기 너무 힘듭니다', desc: '모디파이어 강도를 절반으로 낮추고 자간을 엽니다.', fixEn: 'READABILITY OVERRIDE: Reduce ALL modifier and deformation intensity by 50%. Force clear letter separation and distinct open counterforms. Readability is priority ONE.', fixKo: '가독성 최우선: 모든 모디파이어 및 변형 강도를 절반으로 줄입니다. 글자 간 분리와 내부 여백을 명확히 확보.' },
    { id: 'ts_fx', label: '이펙트가 글자를 가려요', desc: '주변 효과를 차단하고 피사체를 배경과 격리합니다.', fixEn: 'CLEAN SILHOUETTE: REMOVE ALL SURROUNDING FX AND CLUTTER. Keep background perfectly clean. Subject typography must be fully isolated.', fixKo: '실루엣 분리: 모든 주변 효과와 불필요한 장식을 제거합니다. 배경을 완전히 비우고 타이포그래피 대상만 명확하게 격리.' }
];

const safetyGuards = [
    { id: 'guard_mutation', label: '텍스트 변형 방지', desc: '원문 무결성 100% 보존', fixEn: 'ANTI-MUTATION MAX: STRICT TEXT LOCK. Force 100% structural retention of original characters. ZERO morphing into unreadable glyphs.', fixKo: '텍스트 변형 방지 적용: 원문 100% 구조적 보존. 임의 기호/외계어 변형 완벽 차단.' },
    { id: 'guard_3d', label: '3D 돌출 방지', desc: '완벽한 2D 평면 실루엣 강제', fixEn: '2D FLAT ENFORCEMENT: STRICTLY 2D FLAT GRAPHIC. Kill all depth, shadows, 3D bevels.', fixKo: '3D 돌출 방지 적용: 깊이, 베벨, 돌출 효과 차단. 완벽한 2D 평면 벡터 실루엣 강제.' },
    { id: 'guard_layout', label: '세로 붕괴/늘어남 방지', desc: '정상 폰트 비율 유지 및 수평 확장', fixEn: 'ANTI-STACKING & ANTI-SQUISHING: FORCE STRONG HORIZONTAL GRAVITY. Preserve normal font aspect ratio. Strictly prohibit vertical squishing, stretching, or unwanted vertical stacking.', fixKo: '세로 붕괴 방지 적용: 정상적인 글자 비율 유지. 세로로 길게 늘어나거나 찌그러지는 현상 엄격히 금지. 강력한 수평 방향 전개 강제.' },
    { id: 'guard_noise', label: '외곽 노이즈 억제', desc: '불필요한 파편 효과 차단', fixEn: 'CLEAN SILHOUETTE: REMOVE ALL NOISE. Force clean, sharp boundaries. Isolate text clearly from background.', fixKo: '외곽 노이즈 억제 적용: 불필요한 파편과 배경 간섭 제거. 선명한 형태 분리 강제.' }
];

const staticOptions = {
    layoutPresets: [{ id: "WideTitle", name: "와이드 타이틀형", en: "Wide Title Layout" }, { id: "CenterLogo", name: "중앙 로고형", en: "Center Logo Layout" }, { id: "CinematicPan", name: "시네마틱 파노라마형", en: "Cinematic Panorama Layout" }, { id: "TitleSubPre", name: "메인(상) + 서브(하)", en: "Main Title + Subtitle Layout" }, { id: "SubTitlePre", name: "서브(상) + 메인(하)", en: "Subtitle + Main Title Layout" }],
    base: [{ id: "BlackWhite", name: "블랙 / 화이트", en: "JET BLACK Background, RADIANT WHITE Subject" }, { id: "WhiteBlack", name: "화이트 / 블랙", en: "STARK WHITE Background, SOLID BLACK Subject" }],
    ratios: [{ id: "16:9", name: "16:9 와이드", en: "16:9" }, { id: "1:1", name: "1:1 스퀘어", en: "1:1" }, { id: "9:16", name: "9:16 세로형", en: "9:16" }, { id: "2.76:1", name: "2.76:1 시네마틱", en: "2.76:1" }],
    occupancies: [
        { id: "40%", name: "40% 여유", en: "Vast empty background space. Subject is small and strictly contained in the center 40%. DO NOT FILL THE CANVAS." },
        { id: "50%", name: "50% 표준", en: "Generous negative space margins. Subject is contained perfectly within the center 50%. Leave wide borders." },
        { id: "65%", name: "65% 크게", en: "Moderate margins. Subject occupies 65% of the canvas area." },
        { id: "80%", name: "80% 꽉 참", en: "Subject occupies 80% of the canvas, pushing heavily towards the edges." }
    ],
    layouts: [{ id: "1Line", name: "1줄 가로", en: "STRICT SINGLE HORIZONTAL LINE." }, { id: "2Lines", name: "2줄 상하", en: "Two-tier vertical stacked composition." }, { id: "TitleSub", name: "메인(상) + 서브(하)", en: "Hierarchical composition. Main title on top." }, { id: "SubTitle", name: "서브(상) + 메인(하)", en: "Hierarchical composition. Subtitle on top." }, { id: "Center", name: "중앙 집중형", en: "Centralized balanced composition." }],
    subTitleSizes: [{ id: "Sub_Small", name: "작게 (기본)", en: "Subtitle is significantly smaller (approx 30% scale)." }, { id: "Sub_Medium", name: "중간 (50%)", en: "Subtitle is moderately sized (approx 50% scale)." }, { id: "Sub_Large", name: "크게 (70%)", en: "Subtitle is prominent (approx 70% scale)." }, { id: "Sub_Equal", name: "동일 크기", en: "Both rows have equal font scale." }],
    proportions: [
        { id: "P_Std", name: "기본형", en: "Standard balanced proportion, perfectly square typographic skeleton. No vertical distortion." },
        { id: "P_Condensed", name: "압축형", en: "Condensed tall proportion, narrow vertical stems." },
        { id: "P_Extended", name: "확장형", en: "Extended wide proportion, heavily stretched horizontally. Short vertical height." },
        { id: "P_Tall", name: "장방형", en: "Elongated vertical proportion, tall and imposing." }
    ],
    MMOStyles: [{ id: "Gen_Original", name: "오리지널", en: "Monolithic stone-steel structure" }, { id: "Gen_Fantasy", name: "하이 판타지", en: "Elegant high-fantasy aesthetic" }, { id: "Lineage_M", name: "리니지 M", en: "Chiseled faceted Gothic structure" }, { id: "Lineage_2M", name: "리니지 2M", en: "Jewelry-precision thorn serifs" }, { id: "Lineage_W", name: "리니지 W", en: "Cruel realism with wedge terminals" }, { id: "Aion_Original", name: "아이온", en: "Vertical tower-pillar with speed terminals" }, { id: "Aion_2", name: "아이온 2", en: "Atreia-style script with fluid curves" }, { id: "BNS", name: "블레이드 & 소울", en: "Oriental martial arts calligraphy" }, { id: "Throne_Liberty", name: "쓰론 앤 리버티", en: "Sophisticated medieval serif" }, { id: "MMO_Saviors", name: "구원자들", en: "Clean script with sharp vertical stems" }, { id: "MMO_Antharas", name: "안타라스", en: "Demonic cursive script" }, { id: "MMO_Aden", name: "아덴 대침공", en: "Imposing monolithic structure" }],
    MMOSilhouetteFramings: [{ id: "Auto", name: "자동", en: "Automatic silhouette framing" }, { id: "Horizontal", name: "수평형", en: "Strict horizontal alignment framing" }, { id: "Compressed", name: "압축형", en: "Tightly compressed inner structure framing" }, { id: "Expanded", name: "확장형", en: "Outwardly expanded wing-like framing" }, { id: "Emblem", name: "엠블럼형", en: "Cohesive unified emblem framing" }],
    MMOSurroundingElements: [{ id: "Clean", name: "없음", en: "Clean background" }, { id: "FloatingRunes", name: "부유하는 룬", en: "Floating geometric runes" }, { id: "Shattered", name: "파괴된 파편", en: "Shattered stone and metal debris" }, { id: "RadialSpikes", name: "마법적 방사선", en: "Sharp radial spikes" }],
    stemWeights: [{ id: "Stem_Light", name: "가벼움", en: "light razor thin stems" }, { id: "Stem_Std", name: "표준", en: "medium balanced stems" }, { id: "Stem_Heavy", name: "묵직함", en: "heavy thick stems" }, { id: "Stem_Ultra", name: "초중량", en: "massive ultra heavy block stems" }],
    letterConnections: [{ id: "Conn_Indep", name: "독립형", en: "Cleanly separated characters" }, { id: "Conn_Tight", name: "밀착형", en: "Tightly packed characters" }, { id: "Conn_Partial", name: "부분 결합", en: "Partially merged structures" }, { id: "Conn_Full", name: "완전 결합", en: "Fully merged characters" }],
    internalSpaces: [{ id: "Space_Loose", name: "여유", en: "Spacious internal space" }, { id: "Space_Std", name: "표준", en: "Standard internal space" }, { id: "Space_Dense", name: "조밀", en: "Dense internal structures" }, { id: "Space_Closed", name: "폐쇄적", en: "Closed solid internal mass" }],
    logoDegrees: [{ id: "Logo_Low", name: "낮음", en: "Text-focused readable typography" }, { id: "Logo_Std", name: "표준", en: "Standard game title logotype" }, { id: "Logo_High", name: "높음", en: "Highly stylized graphic logotype" }, { id: "Logo_Emblem", name: "엠블럼형", en: "Unified emblem structure" }],
    kerningOptions: [{ id: "Kern_Loose", name: "여유", en: "wide loose spacing" }, { id: "Kern_Std", name: "표준", en: "standard balanced kerning" }, { id: "Kern_Tight", name: "타이트", en: "tight kerning" }, { id: "Kern_Overlap", name: "초밀착", en: "extreme high density overlapping" }],
    terminalStyles: [{ id: "Term_Clean", name: "깨끗함", en: "clean flat terminals" }, { id: "Term_Chisel", name: "치즐드", en: "sharp chisel-cut terminals" }, { id: "Term_Blade", name: "블레이드", en: "razor blade tips" }, { id: "Term_Slab", name: "석판형", en: "heavy slab serifs" }, { id: "Term_Flare", name: "플레어", en: "elegant flared terminals" }, { id: "Term_Round", name: "라운드", en: "smooth rounded terminals" }, { id: "Term_Serif", name: "클래식 세리프", en: "classic serif" }, { id: "Term_Thorn", name: "가시 삐침", en: "sharp thorn terminals" }, { id: "Term_Claw", name: "악마 발톱", en: "demonic claw terminals" }, { id: "Term_BrushFray", name: "갈라진 붓끝", en: "frayed brush terminals" }],
    strokeTextures: [{ id: "Tex_Clean", name: "완전 매끄루움", en: "perfectly smooth vector edge" }, { id: "Tex_Frayed", name: "필선 갈라짐", en: "frayed ink texture" }, { id: "Tex_Scorched", name: "탄화된 필선", en: "scorched etched texture" }, { id: "Tex_Subtle", name: "미세 침식", en: "subtle weathered erosion" }, { id: "Tex_DryBrush", name: "건조한 붓결", en: "dry brush strokes" }],
    strokeSharpness: [{ id: "Sharp_Soft", name: "부드러움", en: "softened edges" }, { id: "Sharp_Std", name: "표준", en: "crisp vector edges" }, { id: "Sharp_Crisp", name: "날카로움", en: "sharp clean lines" }, { id: "Sharp_Razor", name: "극예리", en: "razor-sharp edges" }],
    strokeExtensions: [{ id: "Ext_None", name: "없음", en: "contained terminals" }, { id: "Ext_Elegant", name: "유려한 연장", en: "elegant tapered extensions" }, { id: "Ext_Razor", name: "날카로운 끝단", en: "razor-sharp stroke tails" }, { id: "Ext_Infinite", name: "무한 확장", en: "hyper-extended stroke ends" }],
    kineticVelocities: [{ id: "Vel_Static", name: "정중동", en: "zero momentum" }, { id: "Vel_Swift", name: "질주", en: "dynamic forward momentum" }, { id: "Vel_Slashing", name: "격베기", en: "aggressive slashing momentum" }],
    slantAngles: [{ id: "Slant_0", name: "0도", en: "perfect verticality" }, { id: "Slant_Forward", name: "15도", en: "15-degree dynamic slant" }, { id: "Slant_Extreme", name: "25도", en: "Aggressive 25-degree slant" }],
    slicingIntensities: [{ id: "Slic_None", name: "없음", en: "intact strokes" }, { id: "Slic_Partial", name: "부분 절단", en: "micro-incisions" }, { id: "Slic_Diagonal", name: "사선 절단", en: "diagonal slicing" }, { id: "Slic_Deep", name: "깊은 절단", en: "deep structural severance" }, { id: "Slic_Total", name: "전체 절단", en: "massive severance" }],
    cornerStyles: [{ id: "Corner_Right", name: "직각", en: "sharp right-angle corners" }, { id: "Corner_Round", name: "둥근형", en: "rounded corners" }, { id: "Corner_Wedge", name: "쐐기형", en: "wedge-shaped corners" }, { id: "Corner_Blade", name: "칼날형", en: "blade-like pointed corners" }],
    deformationDamages: [{ id: "Damage_None", name: "상태 깨끗함", en: "pristine solid form" }, { id: "Damage_Erosion", name: "미세 침식", en: "subtle weathered erosion" }, { id: "Damage_Cracking", name: "균열과 실금", en: "intricate 2D cracks" }],
    widths: [{ id: "Narrow", name: "좁게", en: "condensed slim width" }, { id: "Normal", name: "표준", en: "standard balanced width" }, { id: "Wide", name: "넓게", en: "wide expansive width" }, { id: "UltraWide", name: "초광폭", en: "ultra wide panoramic width" }],
    editStrokeMods: [{ id: "E_Stroke_None", name: "기본 유지", en: "Keep original stroke intact" }, { id: "E_Stroke_Angled", name: "꺾임/예리함 강조", en: "Sharpen joints and emphasize jagged edges" }, { id: "E_Stroke_Extended", name: "연장 라인 추가", en: "Pull and extend key stroke terminals" }, { id: "E_Stroke_Thickened", name: "두께 대비 극대화", en: "Exaggerate thick/thin stroke contrast" }],
    editElementMods: [{ id: "E_Elem_None", name: "기본 유지", en: "Maintain original structure" }, { id: "E_Elem_Object", name: "오브제화/무기화", en: "Morph focal letters into weapons/objects" }, { id: "E_Elem_Rhythm", name: "유기적 리듬감", en: "Inject rhythmic flow and bounce" }, { id: "E_Elem_Disconnect", name: "의도적 단절", en: "Introduce micro-gaps for fragmentation" }],
    editSurfaceMods: [{ id: "E_Surf_None", name: "기본 유지", en: "Keep flat surface" }, { id: "E_Surf_Speed", name: "속도감 텍스처", en: "Apply directional motion scratches" }, { id: "E_Surf_Dry", name: "부식/거친 질감", en: "Apply heavy weathered erosion" }, { id: "E_Surf_Crystalline", name: "결정/파편화", en: "Render crystalline shattered debris" }]
};

const SectionHeader = ({ id, label, icon }) => (
    <div className="flex items-center gap-2 pl-1 text-[#a6a6a6] relative mt-4 first:mt-0 transition-all duration-700">
        {icon}
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#a6a6a6]">{String(id)}. {String(label)}</h3>
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
                    <p className="text-[10px] font-bold uppercase tracking-tighter flex items-center gap-1.5 text-[#a6a6a6]">
                        {icon} {String(label)}
                    </p>
                </div>
            )}
            <button onClick={(e) => { e.preventDefault(); if (!disabled) setIsOpen(!isOpen); }} title={String(selectedOption?.en)} className="w-full flex items-center justify-between px-2.5 py-2 rounded-[6px] border transition-all bg-[#121212] border-zinc-700/60 hover:border-zinc-500 outline-none shadow-sm">
                <span className="text-[11px] font-bold truncate text-zinc-200">{String(selectedOption?.name || 'None')}</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            </button>
            {isOpen && (
                <div className="absolute left-0 w-full mt-1 max-h-[250px] overflow-y-auto rounded-[8px] border backdrop-blur-xl z-[9999] shadow-2xl bg-[#1C1C1C] border-zinc-600 custom-scrollbar py-1">
                    {data.map(opt => (
                        <div key={opt.id} onClick={() => { onChange(opt.id); setIsOpen(false); }} title={String(opt.en)} className={`px-3 py-2 mx-1 text-[11px] cursor-pointer rounded-[4px] transition-all group ${value === opt.id ? 'bg-indigo-500/15 text-indigo-300 font-bold border-l-[3px] border-indigo-500' : 'text-[#a6a6a6] hover:bg-[#262626] hover:text-zinc-100 border-l-[3px] border-transparent'}`}>
                            {String(opt.name)}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const OptionGroupCard = ({ id, title, icon, summary, children, openCardId, onToggle }) => {
    const isOpen = openCardId === id;
    return (
        <div className={`rounded-[10px] border shadow-sm mb-3 transition-all duration-300 relative hover:z-[100] focus-within:z-[100] ${isOpen ? 'z-40 border-indigo-500/30 bg-[#16161E]' : 'z-10 border-zinc-800 bg-[#121212] hover:border-zinc-700'}`}>
            <button onClick={(e) => { e.preventDefault(); onToggle(id); }} className="w-full flex items-center justify-between p-3.5 transition-colors outline-none rounded-[10px] bg-transparent cursor-pointer">
                <div className="flex flex-col items-start gap-1 text-left flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-200 tracking-wide w-full">
                        {icon} {String(title)}
                    </div>
                    {!isOpen && summary && <div className="text-[10px] text-[#a6a6a6] font-medium ml-6 truncate w-full">{String(summary)}</div>}
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 text-indigo-400' : 'text-zinc-500'}`} />
            </button>
            <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100 overflow-visible' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className="px-4 pb-4">
                    <div className={`pt-3 border-t space-y-3 ${isOpen ? 'border-indigo-500/20' : 'border-zinc-800/50'}`}>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

const App = ({ version, setVersion, versions } = {}) => {
    // === 1. HOOKS & STATE DECLARATIONS ===
    const apiKey = GEMINI_API_KEY;
    const { ensureCanGenerate, modal: usageModal } = useUsageGate();
    const { payload, clearPayload } = useGlobal();
    const [theme] = useState("dark");
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [currentView, setCurrentView] = useState("editor");

    const [inputText, setInputText] = useState("데스나이트");
    const [base64Image, setBase64Image] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    // 페르소나 및 핵심 옵션
    const [aiPersona, setAiPersona] = useState('sovereign');
    const [personaDropdownOpen, setPersonaDropdownOpen] = useState(false);
    const [isAdvancedOptionsEnabled, setIsAdvancedOptionsEnabled] = useState(false);
    const [isEnhanceModeEnabled, setIsEnhanceModeEnabled] = useState(true);
    const [enhanceMode, setEnhanceMode] = useState("refine");
    const [momentumActive, setMomentumActive] = useState(false);
    const [auraPriority, setAuraPriority] = useState("Balanced");
    const [personaSliderValue, setPersonaSliderValue] = useState(50);

    // MMO Specific States
    const [baseStyle, setBaseStyle] = useState("BlackWhite");
    const [aspectRatio, setAspectRatio] = useState("16:9");
    const [occupancy, setOccupancy] = useState("50%");
    const [layoutType, setLayoutType] = useState("1Line");
    const [layoutPreset, setLayoutPreset] = useState("WideTitle");
    const [stemWeight, setStemWeight] = useState("Stem_Heavy");
    const [charWidth, setCharWidth] = useState("Normal");
    const [charProportion, setCharProportion] = useState("P_Std");
    const [kerning, setKerning] = useState("Kern_Std");
    const [subTitleSize, setSubTitleSize] = useState("Sub_Small");

    const [scriptType, setScriptType] = useState("Lineage_M");
    const [terminalStyle, setTerminalStyle] = useState("Term_Chisel");
    const [strokeTexture, setStrokeTexture] = useState("Tex_Frayed");
    const [strokeSharpness, setStrokeSharpness] = useState("Sharp_Razor");
    const [strokeExtension, setStrokeExtension] = useState("Ext_Razor");
    const [cornerStyle, setCornerStyle] = useState("Corner_Right");
    const [slantAngle, setSlantAngle] = useState("Slant_0");
    const [kineticVelocity, setKineticVelocity] = useState("Vel_Slashing");
    const [slicingIntensity, setSlicingIntensity] = useState("Slic_Partial");
    const [deformationDamage, setDeformationDamage] = useState("Damage_None");

    const [letterConnection, setLetterConnection] = useState("Conn_Indep");
    const [internalSpace, setInternalSpace] = useState("Space_Std");
    const [logoDegree, setLogoDegree] = useState("Logo_Std");

    const [mmoSilhouetteFraming, setMmoSilhouetteFraming] = useState("Horizontal");
    const [mmoSurroundingElement, setMmoSurroundingElement] = useState("Clean");

    const [dynamicOptions, setDynamicOptions] = useState({
        MMOStyles: [], strokeTextures: [], deformationDamages: [], terminalStyles: [], stemWeights: [],
        strokeSharpness: [], writingSpeeds: [], widths: [], kerningOptions: [], strokeExtensions: [],
        kineticVelocities: [], slicingIntensities: [], editStrokeMods: [], editElementMods: [], editSurfaceMods: []
    });

    const [customDesignInjections, setCustomDesignInjections] = useState("");
    const [aiModel, setAiModel] = useState("Overview");
    const [editAiModel, setEditAiModel] = useState("Overview");

    // Prompt Output States
    const [dramaticPrompt, setDramaticPrompt] = useState("");
    const [mjOptimizedPrompt, setMjOptimizedPrompt] = useState("");
    const [cgEnhancedPrompt, setCgEnhancedPrompt] = useState("");

    const [aiRecSummary, setAiRecSummary] = useState(null);

    // Loading States
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
    const [baseLangView, setBaseLangView] = useState('ko');

    // Manual Override Prompts
    const [manualBasePrompt, setManualBasePrompt] = useState(null);
    const [editManualBasePrompt, setEditManualBasePrompt] = useState(null);
    const [activeTroubleshoots, setActiveTroubleshoots] = useState([]);
    const [activeGuards, setActiveGuards] = useState(['guard_mutation', 'guard_3d', 'guard_layout']);

    // Edit Mode States
    const [editUploadedImage, setEditUploadedImage] = useState(null);
    const [editInstruction, setEditInstruction] = useState("");
    const [applyAiRecInEdit, setApplyAiRecInEdit] = useState(false);
    const [applyAutoRefine, setApplyAutoRefine] = useState(false);

    const [editStrokeMod, setEditStrokeMod] = useState("E_Stroke_None");
    const [editElementMod, setEditElementMod] = useState("E_Elem_None");
    const [editSurfaceMod, setEditSurfaceMod] = useState("E_Surf_None");

    const [openCardId, setOpenCardId] = useState("layout");
    const [editOpenCardId, setEditOpenCardId] = useState("edit_retouch");

    // Prompt Collapse States
    const [isPromptExpanded, setIsPromptExpanded] = useState(false);
    const [isEditPromptExpanded, setIsEditPromptExpanded] = useState(false);

    // Outdated Prompt States
    const [isOutdated, setIsOutdated] = useState(false);
    const [isEditOutdated, setIsEditOutdated] = useState(false);

    // Tuning Modals
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

    // Tuning Reference Image States
    const [tuningReferenceImage, setTuningReferenceImage] = useState(null);
    const [editTuningReferenceImage, setEditTuningReferenceImage] = useState(null);

    // Background Mood Analysis State
    const [isAnalyzingMood, setIsAnalyzingMood] = useState(false);
    const [isExtractingReference, setIsExtractingReference] = useState(false);

    const [isInspectorModalOpen, setIsInspectorModalOpen] = useState(false);
    const [isInspecting, setIsInspecting] = useState(false);
    const [inspectionResult, setInspectionResult] = useState(null);
    const [selectedResolutionIndex, setSelectedResolutionIndex] = useState(0);

    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importInputValue, setImportInputValue] = useState("");

    const [editDramaticPrompt, setEditDramaticPrompt] = useState("");
    const [editMjPrompt, setEditMjPrompt] = useState("");
    const [editCgPrompt, setEditCgPrompt] = useState("");

    const [user, setUser] = useState(null);

    // === 2. REFS ===
    const moodImageRef = useRef(null);
    const referenceExtractRef = useRef(null);
    const tuningChatRef = useRef(null);
    const editTuningChatRef = useRef(null);
    const editImageRef = useRef(null);

    // === 3. DERIVED STATES ===
    const isEditMode = currentView === 'edit';
    const currentModel = isEditMode ? editAiModel : aiModel;
    const setModel = isEditMode ? setEditAiModel : setAiModel;
    const isPromptOutdated = isEditMode ? isEditOutdated : isOutdated;
    const isExpanded = isEditMode ? isEditPromptExpanded : isPromptExpanded;
    const setExpanded = isEditMode ? setIsEditPromptExpanded : setIsPromptExpanded;

    const isGeneratingDramatic = isEditMode ? isEditEnhancing : isEnhancing;
    const isGeneratingMj = isEditMode ? isEditMjOptimizing : isMjOptimizing;
    const isGeneratingCg = isEditMode ? isEditCgEnhancing : isCgEnhancing;

    const hasManualBasePrompt = isEditMode ? editManualBasePrompt : manualBasePrompt;

    const t = {
        bg: theme === 'dark' ? 'bg-[#0A0A0A]' : 'bg-zinc-200',
        sidebarLeft: theme === 'dark' ? 'bg-[#1A1A1A]/50 backdrop-blur-xl border-zinc-800/60' : 'bg-white border-zinc-300',
        textColor: theme === 'dark' ? 'text-zinc-100' : 'text-zinc-900',
    };

    // === 4. EFFECTS ===
    useEffect(() => {
        setIsOutdated(true); setManualBasePrompt(null); setInspectionResult(null);
    }, [aiPersona, personaSliderValue, inputText, customDesignInjections, isEnhanceModeEnabled, enhanceMode, momentumActive, baseStyle, aspectRatio, occupancy, layoutType, layoutPreset, stemWeight, charWidth, charProportion, kerning, subTitleSize, scriptType, terminalStyle, strokeTexture, strokeSharpness, strokeExtension, cornerStyle, slantAngle, kineticVelocity, slicingIntensity, deformationDamage, letterConnection, internalSpace, logoDegree, mmoSilhouetteFraming, mmoSurroundingElement, isAdvancedOptionsEnabled, activeGuards, activeTroubleshoots]);

    useEffect(() => {
        setIsEditOutdated(true); setEditManualBasePrompt(null); setInspectionResult(null);
    }, [aiPersona, personaSliderValue, editInstruction, editUploadedImage, applyAiRecInEdit, applyAutoRefine, isEnhanceModeEnabled, enhanceMode, momentumActive, layoutType, subTitleSize, mmoSilhouetteFraming, mmoSurroundingElement, kineticVelocity, slantAngle, deformationDamage, slicingIntensity, editStrokeMod, editElementMod, editSurfaceMod, cornerStyle, activeGuards, activeTroubleshoots]);

    // Auth/Firestore init은 프로젝트 글로벌 Auth 플로우에서 처리 — 앱 로컬 signin 제거

    useEffect(() => {
        if (tuningChatRef.current) tuningChatRef.current.scrollTop = tuningChatRef.current.scrollHeight;
    }, [tuningChatHistory, isTuningLoading]);

    useEffect(() => {
        if (editTuningChatRef.current) editTuningChatRef.current.scrollTop = editTuningChatRef.current.scrollHeight;
    }, [editTuningChatHistory, isEditTuningLoading]);

    // === 5. HOISTED FUNCTIONS ===
    function handleToggleCard(id) { setOpenCardId(prev => prev === id ? null : id); }
    function handleEditToggleCard(id) { setEditOpenCardId(prev => prev === id ? null : id); }
    function toggleGuard(id) { setActiveGuards(prev => prev.includes(id) ? prev.filter(guardId => guardId !== id) : [...prev, id]); }
    function toggleTroubleshoot(id) { setActiveTroubleshoots(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]); }

    function updateDynamic(key, val) {
        if (val && typeof val === 'object' && val.id && val.name) {
            setDynamicOptions(prev => {
                const exists = prev[key]?.find(o => o.id === val.id);
                if (!exists) return { ...prev, [key]: [...(prev[key] || []), val] };
                return prev;
            });
            return val.id;
        }
        return val && typeof val === 'object' ? val.id || val : val;
    }

    function handleScriptPresetChange(presetId) {
        setScriptType(presetId);
        if (presetId === "Gen_Original" || presetId === "Lineage_Classic") { setStemWeight("Stem_Ultra"); setTerminalStyle("Term_Serif"); setStrokeTexture("Tex_Scorched"); setDeformationDamage("Damage_Erosion"); }
        else if (presetId === "Gen_Fantasy" || presetId === "Lineage_2") { setStemWeight("Stem_Light"); setTerminalStyle("Term_Serif"); setStrokeSharpness("Sharp_Crisp"); setKineticVelocity("Vel_Static"); }
        else if (presetId === "Gen_Gothic" || presetId === "Lineage_M") { setStemWeight("Stem_Heavy"); setTerminalStyle("Term_Chisel"); setStrokeSharpness("Sharp_Razor"); setKineticVelocity("Vel_Slashing"); }
        else if (presetId === "Gen_Thorn" || presetId === "Lineage_2M") { setStemWeight("Stem_Light"); setTerminalStyle("Term_Thorn"); setStrokeSharpness("Sharp_Razor"); setCharProportion("P_Slim"); }
        else if (presetId === "Gen_Agony" || presetId === "Lineage_W") { setStemWeight("Stem_Ultra"); setTerminalStyle("Term_Blade"); setDeformationDamage("Damage_Erosion"); setSlicingIntensity("Slic_Partial"); }
        else if (presetId === "Gen_Tower" || presetId === "Aion_Original") { setCharProportion("P_Condensed"); setStemWeight("Stem_Std"); setTerminalStyle("Term_Round"); setKineticVelocity("Vel_Swift"); }
        else if (presetId === "Aion_2") { setTerminalStyle("Term_Blade"); setStrokeTexture("Tex_Hologram"); setKineticVelocity("Vel_Warp"); setCharProportion("P_Slim"); }
        else if (presetId === "BNS") { setStemWeight("Stem_Heavy"); setTerminalStyle("Term_Blade"); setStrokeSharpness("Sharp_Razor"); setKineticVelocity("Vel_Swift"); setSlantAngle("Slant_Forward"); }
        else if (presetId === "Throne_Liberty") { setStemWeight("Stem_Light"); setTerminalStyle("Term_Serif"); setStrokeSharpness("Sharp_Crisp"); setCharProportion("P_Std"); setKineticVelocity("Vel_Static"); }
        else if (presetId === "Epic") { setStemWeight("Stem_Ultra"); setTerminalStyle("Term_Chisel"); setStrokeSharpness("Sharp_Razor"); setKineticVelocity("Vel_Static"); setCharWidth("Wide"); }
        else if (presetId === "MMO_Saviors") { setStemWeight("Stem_Light"); setTerminalStyle("Term_Blade"); setStrokeSharpness("Sharp_Crisp"); setKineticVelocity("Vel_Static"); setCharProportion("P_Slim"); }
        else if (presetId === "MMO_Antharas") { setStemWeight("Stem_Heavy"); setTerminalStyle("Term_Thorn"); setStrokeSharpness("Sharp_Razor"); setKineticVelocity("Vel_Slashing"); }
        else if (presetId === "MMO_Aden") { setStemWeight("Stem_Ultra"); setTerminalStyle("Term_Chisel"); setStrokeSharpness("Sharp_Razor"); setKineticVelocity("Vel_Static"); setCharWidth("Wide"); }
    }

    function handleLayoutPresetChange(presetId) {
        setLayoutPreset(presetId);
        if (presetId === "WideTitle") { setAspectRatio("16:9"); setLayoutType("1Line"); setOccupancy("50%"); setMmoSilhouetteFraming("Horizontal"); }
        else if (presetId === "CenterLogo") { setAspectRatio("1:1"); setLayoutType("Center"); setOccupancy("65%"); setMmoSilhouetteFraming("Auto"); }
        else if (presetId === "CinematicPan") { setAspectRatio("2.76:1"); setLayoutType("1Line"); setOccupancy("40%"); setMmoSilhouetteFraming("Expanded"); }
        else if (presetId === "TitleSubPre") { setAspectRatio("16:9"); setLayoutType("TitleSub"); setOccupancy("50%"); setMmoSilhouetteFraming("Horizontal"); }
        else if (presetId === "SubTitlePre") { setAspectRatio("16:9"); setLayoutType("SubTitle"); setOccupancy("50%"); setMmoSilhouetteFraming("Horizontal"); }
    }

    function handleReset() {
        setDynamicOptions({ MMOStyles: [], strokeTextures: [], deformationDamages: [], terminalStyles: [], stemWeights: [], strokeSharpness: [], writingSpeeds: [], widths: [], kerningOptions: [], strokeExtensions: [], kineticVelocities: [], slicingIntensities: [], editStrokeMods: [], editElementMods: [], editSurfaceMods: [] });
        setCustomDesignInjections(""); setDramaticPrompt(""); setMjOptimizedPrompt(""); setCgEnhancedPrompt(""); setEnhanceMode("refine"); setMomentumActive(false); setIsAdvancedOptionsEnabled(false);
        setPersonaSliderValue(50); setBase64Image(null); setAiRecSummary(null); setAiPersona('sovereign');
        handleScriptPresetChange("Lineage_M"); setLetterConnection("Conn_Indep"); setInternalSpace("Space_Std"); setLogoDegree("Logo_Std"); setSubTitleSize("Sub_Small");
        setManualBasePrompt(null); setEditManualBasePrompt(null); setTuningReferenceImage(null); setEditTuningReferenceImage(null); setActiveGuards(['guard_mutation', 'guard_3d', 'guard_layout']);
        setActiveTroubleshoots([]);
    }

    function generateSaveCode() {
        const state = {
            txt: inputText, per: aiPersona, adv: isAdvancedOptionsEnabled, enh: isEnhanceModeEnabled, eMd: enhanceMode,
            mom: momentumActive, sld: personaSliderValue, bs: baseStyle, ar: aspectRatio, occ: occupancy, lyt: layoutType,
            lPre: layoutPreset, sw: stemWeight, cw: charWidth, cp: charProportion, krn: kerning, sts: subTitleSize,
            scr: scriptType, term: terminalStyle, tex: strokeTexture, shp: strokeSharpness, ext: strokeExtension,
            cor: cornerStyle, slt: slantAngle, kin: kineticVelocity, sli: slicingIntensity, dmg: deformationDamage,
            lc: letterConnection, is: internalSpace, ld: logoDegree, mmoF: mmoSilhouetteFraming, mmoS: mmoSurroundingElement,
            cdi: customDesignInjections, grd: activeGuards, ts: activeTroubleshoots,
            eInst: editInstruction, eAi: applyAiRecInEdit, eRef: applyAutoRefine,
            eStr: editStrokeMod, eEle: editElementMod, eSur: editSurfaceMod
        };
        try { return `[TC-SAVE:${btoa(encodeURIComponent(JSON.stringify(state)))}]`; } catch (e) { return ""; }
    }

    function getQualityScores() {
        let structure = 100, material = 100, visibility = 100, fxControl = 100, warnings = [];
        if (isEnhanceModeEnabled) {
            if (enhanceMode === 'variation') { structure -= 15; visibility -= 10; }
            if (enhanceMode === 'deconstruct') { structure -= 40; visibility -= 30; }
        }
        if (kineticVelocity !== 'Vel_Static') { structure -= 10; visibility -= 5; fxControl -= 5; }
        if (kineticVelocity === 'Vel_Slashing') { structure -= 15; fxControl -= 10; }
        if (momentumActive) { structure -= 15; visibility -= 10; fxControl -= 10; }
        if (slicingIntensity !== 'Slic_None') { structure -= 10; visibility -= 10; }
        if (slicingIntensity === 'Slic_Total') { structure -= 25; visibility -= 20; }
        if (deformationDamage !== 'Damage_None') { structure -= 5; fxControl -= 5; }
        if (deformationDamage === 'Damage_Cracking') { visibility -= 5; fxControl -= 10; }
        if (mmoSurroundingElement !== 'Clean') { fxControl -= 20; visibility -= 5; }
        if (kerning === 'Kern_Overlap') { visibility -= 15; structure -= 5; }
        if (letterConnection === 'Conn_Full') { visibility -= 15; structure -= 10; }

        structure = Math.max(0, Math.min(100, structure)); material = Math.max(0, Math.min(100, material));
        visibility = Math.max(0, Math.min(100, visibility)); fxControl = Math.max(0, Math.min(100, fxControl));

        if (visibility < 50) warnings.push("가독성이 심각하게 훼손될 위험이 있습니다. 해체 강도를 낮추세요.");
        if (fxControl < 60) warnings.push("이펙트가 과해 형태를 가릴 위험이 있습니다. 주변 효과를 낮추세요.");
        if (structure < 40) warnings.push("구조가 크게 붕괴될 수 있습니다. 텍스트 무결성 유지를 확인하세요.");

        return { structure, material, visibility, fxControl, warnings };
    }

    function getAdapterNotes(model) {
        if (model === 'NanoBanana') return { purpose: "형태 보존형 2D 렌더링 프롬프트", guards: "Text Lock · 2D Flat · Layout Guard", note: "- Nano Banana 2 모델의 임의 변형을 막기 위해 Text Lock을 최상단에 배치했습니다.\n- 3D 오해 방지를 위해 'No Extrusion', 'Flat Silhouette' 규칙을 다중으로 주입했습니다.\n- 가독성 하한선 이하로 구조가 붕괴되는 것을 방지합니다." };
        if (model === 'Midjourney') return { purpose: "시각적 미학 중심 프롬프트 (V6 압축형)", guards: "Strict Tagging · Aspect Ratio Enforced", note: "- Midjourney V6 특성에 맞춰 가중치(::) 태그 및 파라미터(--ar, --no) 위주로 문장형보다 단어형으로 압축 구성했습니다.\n- No-text-mutation 보다는 전반적인 실루엣 스타일링에 초점을 맞춥니다." };
        if (model === 'ChatGPT') return { purpose: "DALL-E 3용 자연어 지시문", guards: "Logical Bullets · 2D Rules", note: "- DALL-E가 이해하기 쉽도록 구조화된 불릿 포인트(Bullet Points) 형태로 자연어 번역을 수행했습니다.\n- 질감보다 구조 자체의 묘사를 중심으로 서술합니다." };
        return null;
    }

    function copyToClipboard(text, type) {
        const textArea = document.createElement("textarea"); textArea.value = text || ''; document.body.appendChild(textArea); textArea.select();
        try { document.execCommand('copy'); if (type === 'top') { setCopiedTop(true); setTimeout(() => setCopiedTop(false), 2000); } else { setCopiedBottom(true); setTimeout(() => setCopiedBottom(false), 2000); } } catch (err) { console.error("Failed to copy", err); } document.body.removeChild(textArea);
    }

    function processFile(file) { const reader = new FileReader(); reader.onloadend = () => { setBase64Image(reader.result.split(',')[1]); }; reader.readAsDataURL(file); }
    function handleDragOver(e) { e.preventDefault(); setIsDragging(true); }
    function handleDragLeave() { setIsDragging(false); }
    function handleDrop(e) { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file && file.type.startsWith('image/')) processFile(file); }
    function handleEditDrop(e) { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file && file.type.startsWith('image/')) { const reader = new FileReader(); reader.onloadend = () => setEditUploadedImage(reader.result); reader.readAsDataURL(file); } }

    function handleEditImageUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setEditUploadedImage(reader.result);
            reader.readAsDataURL(file);
        }
        if (editImageRef.current) editImageRef.current.value = "";
    }

    function handleTuningImageUpload(e, isEditFlag) { const file = e.target.files[0]; if (file && file.type.startsWith('image/')) { const reader = new FileReader(); reader.onloadend = () => { const base64 = reader.result.split(',')[1]; if (isEditFlag) setEditTuningReferenceImage(base64); else setTuningReferenceImage(base64); }; reader.readAsDataURL(file); } }

    function openTuningRoom() { setCurrentTunedAura(customDesignInjections); setTuningChatHistory([{ role: 'assistant', content: "안녕하세요! 현재 구체화된 아이디어를 바탕으로 어떤 부분들을 더 추가하거나 수정하고 싶으신가요?\n원하시는 방향을 자유롭게 말씀해 주세요! (예: '조금 더 차갑고 날카로운 느낌으로 바꿔줘')" }]); setIsTuningModalOpen(true); }
    function openEditTuningRoom() { setCurrentTunedEditAura(editInstruction); setEditTuningChatHistory([{ role: 'assistant', content: "이미지 편집 튜닝룸입니다!\n현재 작성된 지시사항을 바탕으로 원하시는 수정 방향을 대화하듯 말씀해 주세요.\n(예: '지금 묘사에서 부식된 효과를 조금 더 세게 강조해줘')" }]); setIsEditTuningModalOpen(true); }

    function handleImportPrompt() {
        if (!importInputValue.trim()) return;
        const text = importInputValue;

        const saveCodeMatch = text.match(/\[TC-SAVE:(.*?)\]/);
        if (saveCodeMatch) {
            try {
                const state = JSON.parse(decodeURIComponent(atob(saveCodeMatch[1])));
                if (state.txt !== undefined) setInputText(state.txt);
                if (state.per) setAiPersona(state.per);
                if (state.adv !== undefined) setIsAdvancedOptionsEnabled(state.adv);
                if (state.enh !== undefined) setIsEnhanceModeEnabled(state.enh);
                if (state.eMd) setEnhanceMode(state.eMd);
                if (state.mom !== undefined) setMomentumActive(state.mom);
                if (state.sld) setPersonaSliderValue(state.sld);
                if (state.bs) setBaseStyle(state.bs);
                if (state.ar) setAspectRatio(state.ar);
                if (state.occ) setOccupancy(state.occ);
                if (state.lyt) setLayoutType(state.lyt);
                if (state.lPre) setLayoutPreset(state.lPre);
                if (state.sw) setStemWeight(state.sw);
                if (state.cw) setCharWidth(state.cw);
                if (state.cp) setCharProportion(state.cp);
                if (state.krn) setKerning(state.krn);
                if (state.sts) setSubTitleSize(state.sts);
                if (state.scr) setScriptType(state.scr);
                if (state.term) setTerminalStyle(state.term);
                if (state.tex) setStrokeTexture(state.tex);
                if (state.shp) setStrokeSharpness(state.shp);
                if (state.ext) setStrokeExtension(state.ext);
                if (state.cor) setCornerStyle(state.cor);
                if (state.slt) setSlantAngle(state.slt);
                if (state.kin) setKineticVelocity(state.kin);
                if (state.sli) setSlicingIntensity(state.sli);
                if (state.dmg) setDeformationDamage(state.dmg);
                if (state.lc) setLetterConnection(state.lc);
                if (state.is) setInternalSpace(state.is);
                if (state.ld) setLogoDegree(state.ld);
                if (state.mmoF) setMmoSilhouetteFraming(state.mmoF);
                if (state.mmoS) setMmoSurroundingElement(state.mmoS);
                if (state.cdi !== undefined) setCustomDesignInjections(state.cdi);
                if (state.grd) setActiveGuards(state.grd);
                if (state.ts) setActiveTroubleshoots(state.ts);
                if (state.eInst !== undefined) setEditInstruction(state.eInst);
                if (state.eAi !== undefined) setApplyAiRecInEdit(state.eAi);
                if (state.eRef !== undefined) setApplyAutoRefine(state.eRef);
                if (state.eStr) setEditStrokeMod(state.eStr);
                if (state.eEle) setEditElementMod(state.eEle);
                if (state.eSur) setEditSurfaceMod(state.eSur);

                setIsImportModalOpen(false); setImportInputValue(""); return;
            } catch (e) { console.error("Failed to parse save code from token", e); }
        }
    }

    // --- 6. PROMPT BUILDERS ---
    function buildPrompts() {
        const styleList = [...staticOptions.MMOStyles, ...(dynamicOptions.MMOStyles || [])];
        const weightList = [...staticOptions.stemWeights, ...(dynamicOptions.stemWeights || [])];
        const kerningList = [...staticOptions.kerningOptions, ...(dynamicOptions.kerningOptions || [])];
        const terminalList = [...staticOptions.terminalStyles, ...(dynamicOptions.terminalStyles || [])];
        const sharpnessList = [...staticOptions.strokeSharpness, ...(dynamicOptions.strokeSharpness || [])];
        const textureList = staticOptions.strokeTextures;
        const kineticList = [...staticOptions.kineticVelocities, ...(dynamicOptions.kineticVelocities || [])];
        const slantList = staticOptions.slantAngles;
        const destList = staticOptions.deformationDamages;

        const styleEn = getOptionEn(styleList, scriptType); const weightEn = getOptionEn(weightList, stemWeight); const kerningEn = getOptionEn(kerningList, kerning); const terminalEn = getOptionEn(terminalList, terminalStyle); const sharpnessEn = getOptionEn(sharpnessList, strokeSharpness); const textureEn = getOptionEn(textureList, strokeTexture); const widthEn = getOptionEn(staticOptions.widths, charWidth); const proportionEn = getOptionEn(staticOptions.proportions, charProportion); const extensionEn = getOptionEn(staticOptions.strokeExtensions, strokeExtension); const cornerList = [...staticOptions.cornerStyles, ...(dynamicOptions.cornerStyles || [])]; const cornerEn = getOptionEn(cornerList, cornerStyle); const kineticEn = getOptionEn(kineticList, kineticVelocity); const slantEn = getOptionEn(slantList, slantAngle); const destructionEn = getOptionEn(destList, deformationDamage); const occupancyEn = getOptionEn(staticOptions.occupancies, occupancy); const letterConnEn = getOptionEn(staticOptions.letterConnections, letterConnection); const internalSpaceEn = getOptionEn(staticOptions.internalSpaces, internalSpace); const logoDegreeEn = getOptionEn(staticOptions.logoDegrees, logoDegree); const mmoSilhouetteEn = getOptionEn(staticOptions.MMOSilhouetteFramings, mmoSilhouetteFraming); const mmoSurroundEn = getOptionEn(staticOptions.MMOSurroundingElements, mmoSurroundingElement); const slicingEn = getOptionEn(staticOptions.slicingIntensities, slicingIntensity); const subSizeEn = getOptionEn(staticOptions.subTitleSizes, subTitleSize);

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

        const activePersonaData = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];
        const userAuraEn = customDesignInjections || "Standard deployment";
        const bgDescEn = getOptionEn(staticOptions.base, baseStyle) || "JET BLACK Background";

        let troubleshootingBlockEn = ""; let troubleshootingBlockKo = "";
        if (activeTroubleshoots.length > 0) {
            const activeTs = troubleshooterOptions.filter(opt => activeTroubleshoots.includes(opt.id));
            troubleshootingBlockEn = `\n\n[8. TROUBLESHOOTING OVERRIDE - MAXIMUM PRIORITY]\n` + activeTs.map(opt => `- ${opt.fixEn}`).join("\n");
            troubleshootingBlockKo = `\n\n[8. 트러블슈팅 강제 적용 - 최우선 순위]\n` + activeTs.map(opt => `- ${opt.fixKo}`).join("\n");
        }

        const generatedBaseEn = `[TYPECORE V17.1 MASTER INSTRUCTION]\n\n[1. TEXT LOCK - PRIORITY 1]\n- Exact Text: "${inputText}"\n- Rule: NO text mutation, NO extra letters, NO missing letters, NO unrequested translation.\n\n[2. LAYOUT LOCK - PRIORITY 2]\n- Composition: ${layoutEn}\n- Alignment: ${mmoSilhouetteEn}\n- Occupancy: ${occupancyEn}\n- Aspect Ratio: ${aspectRatio}\n\n[3. PERSONA MORPHOLOGY - PRIORITY 3]\n- Director Persona: ${activePersonaData.shortTitle}\n- Role Focus: ${activePersonaData.role}\n- Primary Aesthetic: ${styleEn}\n- Stroke Body: ${weightEn}, ${widthEn} width, ${proportionEn} proportion.\n- Joints & Flow: ${kerningEn}, ${letterConnEn}, ${internalSpaceEn}.\n- Terminals & Edges: ${terminalEn}, ${sharpnessEn}, ${cornerEn}, ${extensionEn}.\n- Design Aura (User Intent): ${userAuraEn}\n- Sub-Trait Focus: ${getSliderText(personaSliderValue)}\n\n[4. MODIFIER ENGINE (STRENGTH & READABILITY) - PRIORITY 4]\n- Mode: ${isEnhanceModeEnabled ? enhanceMode.toUpperCase() : "OFF"}\n- Intensity Budget: ${modIntensityEn}\n- Legibility Floor: MUST maintain at least ${readabilityFloorEn} readability.\n- Allowed Edits: ${modAllowedEn}\n- Forbidden Edits: ${modForbiddenEn}\n\n[5. COMBAT DYNAMICS - PRIORITY 5]\n- Status: ${momentumActive ? "ENABLED" : "DISABLED"}\n- Kinetic Velocity: ${kineticEn}\n- Slant: ${slantEn}\n- Slicing Force: ${slicingEn}\n- Damage/Erosion: ${destructionEn}\n- Vector/Impact Constraints: Vector(${combatVectorEn}), Impact Zone(${combatImpactZoneEn}), Deformation Budget(${combatDeformationEn}).\n\n[6. STYLE GUARDRAILS & RENDER MATRIX]\n- 2D Rule: STRICTLY flat graphic silhouette. ZERO depth.\n- Material Rule: NO colors, ZERO chroma. Strict monochrome (${bgDescEn}).\n- Surrounding FX: ${mmoSurroundEn}. Effects MUST NOT override stroke geometry.\n\n[7. NEGATIVE PROMPT (STRICT PROHIBITIONS)]\n- ${activePersonaData.forbidden}\n- NO 3D rendering, NO bevel, NO drop shadows.\n- NO illegible distortion falling below the Legibility Floor.\n- NO unrequested layout drifting or vertical squishing.${troubleshootingBlockEn}`.trim();
        const generatedBaseKo = `[타이프코어 V17.1 마스터 지시서]\n\n[1. 텍스트 잠금 - 우선순위 1]\n- 정확한 텍스트: "${inputText}"\n- 규칙: 텍스트 변형 절대 금지, 글자 추가/누락 금지, 임의 번역 금지.\n\n[2. 레이아웃 잠금 - 우선순위 2]\n- 구도: ${getOptionName(staticOptions.layouts, layoutType)}\n- 정렬: ${getOptionName(staticOptions.MMOSilhouetteFramings, mmoSilhouetteFraming)}\n- 공간 점유율: ${getOptionName(staticOptions.occupancies, occupancy)}\n- 화면비: ${aspectRatio}\n\n[3. 페르소나 형태학 - 우선순위 3]\n- 디렉터 페르소나: ${activePersonaData.shortTitle}\n- 역할 집중: ${activePersonaData.role}\n- 기본 미학: ${getOptionName(styleList, scriptType)}\n- 획 뼈대: ${getOptionName(weightList, stemWeight)}, ${getOptionName(staticOptions.widths, charWidth)} 자폭, ${getOptionName(staticOptions.proportions, charProportion)} 비율.\n- 결합 및 흐름: ${getOptionName(kerningList, kerning)}, ${getOptionName(staticOptions.letterConnections, letterConnection)}, ${getOptionName(staticOptions.internalSpaces, internalSpace)}.\n- 말단 및 엣지: ${getOptionName(terminalList, terminalStyle)}, ${getOptionName(sharpnessList, strokeSharpness)}, ${getOptionName(cornerList, cornerStyle)}, ${getOptionName(staticOptions.strokeExtensions, strokeExtension)}.\n- 디자인 아우라 (사용자 의도): ${customDesignInjections || "기본 셋업"}\n- 세부 속성 집중도: ${getSliderTextKo(personaSliderValue)}\n\n[4. 모디파이어 엔진 (강도 및 가독성) - 우선순위 4]\n- 모드: ${isEnhanceModeEnabled ? enhanceMode.toUpperCase() : "비활성"}\n- 변형 허용치: ${modIntensityEn}\n- 최소 가독성: 가독성 ${readabilityFloorEn} 이상 절대 유지.\n- 허용된 변형: ${isEnhanceModeEnabled ? (enhanceMode === 'refine' ? '광학적 균형 조정, 세리프 정밀화' : enhanceMode === 'variation' ? '카운터폼 재해석, 획 비례 변주' : '획 분해, 응집형 엠블럼화') : '없음'}\n- 금지된 변형: ${isEnhanceModeEnabled ? (enhanceMode === 'refine' ? '구조 재해석, 해체' : enhanceMode === 'variation' ? '읽을 수 없는 해체' : '가독성 하한선 붕괴') : '구조 변경 금지'}\n\n[5. 전투 동세 - 우선순위 5]\n- 상태: ${momentumActive ? "활성화" : "비활성"}\n- 동세 속도: ${getOptionName(kineticList, kineticVelocity)}\n- 기울기: ${getOptionName(slantList, slantAngle)}\n- 사선 절단: ${getOptionName(staticOptions.slicingIntensities, slicingIntensity)}\n- 파괴/침식: ${getOptionName(destList, deformationDamage)}\n- 벡터/임팩트 제한: 변형 한계(${combatDeformationEn}). 동세는 장식이 아닌 실제 획의 변형으로 표현.\n\n[6. 스타일 가드레일 및 렌더 매트릭스]\n- 2D 규칙: 엄격한 평면 그래픽 실루엣. 깊이감 절대 없음.\n- 질 규칙: 색상 금지. 완전한 단색화 (블랙/화이트).\n- 주변 효과: ${getOptionName(staticOptions.MMOSurroundingElements, mmoSurroundingElement)}. 효과가 글자 뼈대를 덮어쓰면 안 됨.\n\n[7. 네거티브 프롬프트 (엄격한 금지 사항)]\n- ${activePersonaData.forbidden}\n- 3D 렌더링, 베벨, 그림자 효과 절대 금지.\n- 가독성 하한선을 무너뜨리는 무작위 노이즈 왜곡 금지.${troubleshootingBlockKo}`.trim();

        let cgTextInstruction = `Render EXACTLY the text "${inputText}"`;
        if (inputText.includes('\n')) {
            const lines = inputText.split('\n');
            if (layoutType === "TitleSub") cgTextInstruction = `Render exactly 2 lines:\n- [TOP ROW]: "${lines[0]}" (Huge Main Title)\n- [BOTTOM ROW]: "${lines[1] || ''}" (Explicitly smaller Subtitle)`;
            else if (layoutType === "SubTitle") cgTextInstruction = `Render exactly 2 lines:\n- [TOP ROW]: "${lines[0]}" (Explicitly smaller Subtitle)\n- [BOTTOM ROW]: "${lines[1] || ''}" (Huge Main Title)`;
            else if (layoutType === "2Lines") cgTextInstruction = `Render exactly 2 lines:\n- [TOP ROW]: "${lines[0]}"\n- [BOTTOM ROW]: "${lines[1] || ''}"`;
        }

        const chatGPTOutput = `Act as an expert Typography Engine. ${cgTextInstruction} in a 2D flat silhouette graphic. \n1. Constraints: Pure black and white, ${occupancyEn}. NO 3D.\n2. Layout & Proportion: ${layoutEn} Force ${proportionEn}. \n3. Directing Aura: ${customDesignInjections} ${getSliderText(personaSliderValue)}. \n4. Modifiers: ${isEnhanceModeEnabled ? enhanceMode + ' mode (' + modIntensityEn + ' intensity). ' : ''}Maintain ${readabilityFloorEn} readability.\n5. Dynamics: ${momentumActive ? combatDeformationEn + ' max combat deformation. ' : 'Static.'} Details: ${textureEn}, ${destructionEn}.`;
        const midjourneyOutput = `${inputText.replace(/\n/g, ' ')} typography logotype, ${customDesignInjections}, MMO RPG theme, 2D flat graphic silhouette, pure black and white, ${isEnhanceModeEnabled ? (enhanceMode === 'deconstruct' ? 'iconic structural emblem silhouette, ' : (enhanceMode === 'variation' ? 'diverse structural interpretations, ' : 'sharp architectural lines, ')) : ''}${momentumActive ? 'extreme dynamic momentum, ' : ''}${isAdvancedOptionsEnabled ? textureEn + ', ' + destructionEn + ', ' : ''}${layoutType.includes("Line") ? 'balanced composition, ' : 'strictly single horizontal row, '}${proportionEn}, wide panoramic span, ${occupancy.replace('%', ' percent')} occupancy, --ar ${aspectRatio.replace(':', ':')} --no 3d, font, color, texture, compressed vertical aspect ratio`;

        const baseTechnicalEnResult = manualBasePrompt?.en || generatedBaseEn;
        const baseTechnicalKoResult = manualBasePrompt?.ko || generatedBaseKo;

        const overview = `[ V17.1 RPG TYPOGRAPHY OVERVIEW ]\n■ SUBJECT: "${inputText}"\n■ DIRECTOR PERSONA: ${activePersonaData.shortTitle}\n■ AURA: ${customDesignInjections || "기본 셋업"}\n\n[ PRIORITY QUEUE ]\n1. Text Integrity (${inputText})\n2. Legibility Floor (${readabilityFloorEn})\n3. Layout Lock (${getOptionName(staticOptions.layouts, layoutType).split(' ')[0]})\n\n[ CORE MORPHOLOGY ]\n• Theme: ${getOptionName(styleList, scriptType)} / ${getOptionName(weightList, stemWeight)}\n• Terminal: ${getOptionName(terminalList, terminalStyle)}\n• Modifier: ${isEnhanceModeEnabled ? enhanceMode.toUpperCase() : 'OFF'} (Budget: ${modIntensityEn})\n• Combat Dynamics: ${momentumActive ? "ON" : "OFF"}`;

        return { baseTechnicalEn: baseTechnicalEnResult, baseTechnicalKo: baseTechnicalKoResult, chatGPTOutput, midjourneyOutput, overview };
    }

    function buildEditPrompts() {
        const instruction = editInstruction || "원본 이미지의 형태를 유지하며 디테일을 보완합니다.";
        let modIntensityEn = "5-15%"; let readabilityFloorEn = "85%";
        const autoRefineInstructionEn = applyAutoRefine ? `[SHAPE NORMALIZATION PROTOCOL] Auto-correct rough/sketched geometry into premium 2D vector forms.` : "Maintain base sketch quality.";
        const activePersonaData = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];

        let troubleshootingBlockEn = ""; let troubleshootingBlockKo = "";
        if (activeTroubleshoots.length > 0) {
            const activeTs = troubleshooterOptions.filter(opt => activeTroubleshoots.includes(opt.id));
            troubleshootingBlockEn = `\n\n[8. TROUBLESHOOTING OVERRIDE - MAXIMUM PRIORITY]\n` + activeTs.map(opt => `- ${opt.fixEn}`).join("\n");
            troubleshootingBlockKo = `\n\n[8. 트러블슈팅 강제 적용 - 최우선 순위]\n` + activeTs.map(opt => `- ${opt.fixKo}`).join("\n");
        }

        const generatedBaseEn = `[IMAGE-TO-IMAGE TYPOGRAPHY EDIT V17.1 MASTER]\n\n[1. BASE LOCK & INTEGRITY]\n- Base Image: Treat as the STRICT structural foundation.\n- Readability Floor: Minimum ${readabilityFloorEn}.\n- Deformation Budget: Maximum ${modIntensityEn} structural shift.\n\n[2. EDIT DIRECTION (AURA) & PERSONA]\n- Aura: "${instruction}"\n- Sub-Trait Focus: ${getSliderText(personaSliderValue)}\n- Director Persona: ${activePersonaData.shortTitle}\n- Persona Constraints: Apply '${activePersonaData.keywords}'.\n\n[3. MICRO-REFINEMENTS (MODIFIERS)]\n- Stroke Mod: ${getOptionEn(staticOptions.editStrokeMods, editStrokeMod)}\n- Element Mod: ${getOptionEn(staticOptions.editElementMods, editElementMod)}\n- Surface Mod: ${getOptionEn(staticOptions.editSurfaceMods, editSurfaceMod)}\n- Auto-Refine: ${autoRefineInstructionEn}\n\n[4. GLOBAL SHAPE & DYNAMICS]\n- Framing/Layout: ${getOptionEn(staticOptions.MMOSilhouetteFramings, mmoSilhouetteFraming)}\n- Kinetic Force: ${getOptionEn(staticOptions.kineticVelocities, kineticVelocity)}\n- Damage: ${getOptionEn(staticOptions.deformationDamages, deformationDamage)}\n\n[5. STRICT PROHIBITIONS]\n- NO 3D rendering. NO materials. Pure Black & White ONLY.\n- ${activePersonaData.forbidden}${troubleshootingBlockEn}`.trim();
        const generatedBaseKo = `[이미지-투-이미지 타이포그래피 편집 V17.1 마스터]\n\n[1. 베이스 고정 및 무결성]\n- 원본 이미지: 엄격한 구조적 기반으로 취급.\n- 최소 가독성: ${readabilityFloorEn} 유지.\n- 변형 허용치: 구조적 변형 최대 ${modIntensityEn} 제한.\n\n[2. 편집 방향 (아우라) 및 페르소나]\n- 아우라: "${instruction}"\n- 세부 속성 집중도: ${getSliderTextKo(personaSliderValue)}\n- 디렉터 페르소나: ${activePersonaData.shortTitle}\n- 페르소나 제약: '${activePersonaData.keywords}' 미학 적용.\n\n[3. 마이크로-리터칭 (모디파이어)]\n- 획 수정: ${getOptionName(staticOptions.editStrokeMods, editStrokeMod)}\n- 요소 수정: ${getOptionName(staticOptions.editElementMods, editElementMod)}\n- 표면 수정: ${getOptionName(staticOptions.editSurfaceMods, editSurfaceMod)}\n- 자동 보정: ${applyAutoRefine ? "거친 스케치를 프리미엄 2D 벡터 형태로 정규화 교정." : "기본 형태 퀄리티 유지."}\n\n[4. 글로벌 형태 및 동세]\n- 프레이밍: ${getOptionName(staticOptions.MMOSilhouetteFramings, mmoSilhouetteFraming)}\n- 물리적 힘: ${getOptionName(staticOptions.kineticVelocities, kineticVelocity)}\n- 파괴: ${getOptionName(staticOptions.deformationDamages, deformationDamage)}\n\n[5. 엄격한 금지 사항]\n- 3D 렌더링 금지. 재질 표현 금지. 순수 블랙/화이트 전용.\n- ${activePersonaData.forbidden}${troubleshootingBlockKo}`.trim();

        const baseTechnicalEnResult = editManualBasePrompt?.en || generatedBaseEn;
        const baseTechnicalKoResult = editManualBasePrompt?.ko || generatedBaseKo;

        const overview = `[ V17.1 I2I EDIT OVERVIEW ]\n■ EDIT DIRECTION: ${instruction}\n■ DIRECTOR PERSONA: ${activePersonaData.shortTitle}\n\n[ MICRO REFINEMENTS ]\n• Deformation Budget: ${modIntensityEn}\n• Stroke Mod: ${getOptionName(staticOptions.editStrokeMods, editStrokeMod).split(' ')[0]}\n• Auto-Refine: ${applyAutoRefine ? "ON" : "OFF"}\n\n[ SHAPE & DYNAMICS ]\n• Silhouette: ${getOptionName(staticOptions.MMOSilhouetteFramings, mmoSilhouetteFraming)}\n• Kinetic/Damage: ${getOptionName(staticOptions.kineticVelocities, kineticVelocity)} / ${getOptionName(staticOptions.deformationDamages, deformationDamage).split(' ')[0]}`;

        const cgEditTextInstruction = `Redraw the provided image. STRICTLY MAINTAIN basic shape, pure black/white monochrome, and 2D flat graphic style. Maximum deformation ${modIntensityEn}.`;
        const chatGPTOutput = `Act as an expert Typography Engine. ${cgEditTextInstruction}\n1. Focused Edits: ${instruction} ${getSliderText(personaSliderValue)}. \n2. Retouching: Stroke(${getOptionEn(staticOptions.editStrokeMods, editStrokeMod)}), Surface(${getOptionEn(staticOptions.editSurfaceMods, editSurfaceMod)}).\n3. Dynamics: ${getOptionEn(staticOptions.kineticVelocities, kineticVelocity)}, ${getOptionEn(staticOptions.deformationDamages, deformationDamage)}.\n4. Rule: Readability floor ${readabilityFloorEn}. NO 3D.`;
        const midjourneyOutput = `[UPLOAD BASE IMAGE AS REFERENCE] typography logotype, image-to-image edit, exact structural foundation, pure black and white, 2D flat graphic silhouette, ${instruction}, ${getOptionEn(staticOptions.editStrokeMods, editStrokeMod)}, ${getOptionEn(staticOptions.editSurfaceMods, editSurfaceMod)}, ${getOptionEn(staticOptions.kineticVelocities, kineticVelocity)}, wide panoramic span, --ar 16:9 --iw 1.5 --style raw --no 3d, font, color, compressed vertical aspect ratio`;

        return { baseTechnicalEn: baseTechnicalEnResult, baseTechnicalKo: baseTechnicalKoResult, chatGPTOutput, midjourneyOutput, overview };
    }

    // --- 7. ASYNC API HANDLERS (Hoisted) ---
    async function handleAiRecommendation() {
        if (isRecommending) return; setIsRecommending(true);
        const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];
        const prompt = `Act as an Elite Art Director for a Dark Fantasy RPG typography project.\n[YOUR PERSONA]: ${persona.role}\n[YOUR TONE]: ${persona.tone}\n[KEYWORDS YOU FAVOR]: ${persona.keywords}\n[CURRENT SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)}\n[USER INPUT]: Text: "${inputText}"\n[DETAILED DESIGN INTENT / AURA]: "${customDesignInjections || "None"}"\n[CRITICAL INSTRUCTION]: You MUST base your setup heavily on the "[DETAILED DESIGN INTENT / AURA]" and your Persona. Reflect the [CURRENT SUB-TRAIT FOCUS] deeply in your choices.\nReturn JSON: { "summary": { "title": "...", "reason": "..." }, "setStyle": { "id": "...", "name": "...", "en": "..." }, "setWeight": { "id": "...", "name": "...", "en": "..." }, "setTerminal": { "id": "...", "name": "...", "en": "..." }, "setTexture": { "id": "...", "name": "...", "en": "..." }, "setKinetic": { "id": "...", "name": "...", "en": "..." }, "setSharpness": { "id": "...", "name": "...", "en": "..." }, "setKerning": { "id": "...", "name": "..." , "en": "..."} }`;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.7 } }) });
            const data = await response.json(); const res = extractJson(data.candidates[0].content.parts[0].text);
            if (res?.summary) setAiRecSummary(res.summary);
            if (res?.setStyle) setScriptType(updateDynamic('MMOStyles', res.setStyle));
            if (res?.setWeight) setStemWeight(updateDynamic('stemWeights', res.setWeight));
            if (res?.setTerminal) setTerminalStyle(updateDynamic('terminalStyles', res.setTerminal));
            if (res?.setTexture) setStrokeTexture(updateDynamic('strokeTextures', res.setTexture));
            if (res?.setKinetic) setKineticVelocity(updateDynamic('kineticVelocities', res.setKinetic));
            if (res?.setSharpness) setStrokeSharpness(updateDynamic('strokeSharpness', res.setSharpness));
            if (res?.setKerning) setKerning(updateDynamic('kerningOptions', res.setKerning));
            setIsAdvancedOptionsEnabled(true);
        } catch (e) { } finally { setIsRecommending(false); }
    }

    async function handleReferenceExtraction(e) {
        const files = Array.from(e.target.files); if (files.length === 0) return; setIsExtractingReference(true);
        try {
            const base64Promises = files.map(file => { return new Promise((resolve) => { const reader = new FileReader(); reader.onloadend = () => resolve({ inlineData: { mimeType: file.type, data: reader.result.split(',')[1] } }); reader.readAsDataURL(file); }); });
            const imageParts = await Promise.all(base64Promises);
            const systemPrompt = `You are a master Typography Structural Analyst. Analyze the typography in the provided reference image.
      1. Write a 2-3 sentence Korean description of its morphological characteristics (weight, edges, layout, texture) to use as the 'Design Aura'.
      2. Map its structural traits to our engine's exact parameters. If a trait is unique, create a NEW custom object.
      Return JSON STRICTLY in this format:
      {
        "extractedAura": "Korean description of the visual mood and structural anatomy...",
        "updateOptions": {
           "setStyle": { "id": "...", "name": "...", "en": "..." },
           "setWeight": { "id": "...", "name": "...", "en": "..." },
           "setTerminal": { "id": "...", "name": "...", "en": "..." },
           "setTexture": { "id": "...", "name": "...", "en": "..." },
           "setLayout": { "id": "...", "name": "...", "en": "..." },
           "setDamage": { "id": "...", "name": "...", "en": "..." }
        }
      }`;
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }, ...imageParts] }], generationConfig: { responseMimeType: "application/json", temperature: 0.7 } }) });
            const data = await response.json();
            const result = extractJson(data.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
            if (result?.extractedAura) setCustomDesignInjections(String(result.extractedAura).trim());
            if (result?.updateOptions) {
                const opts = result.updateOptions;
                if (opts.setStyle) setScriptType(updateDynamic('MMOStyles', opts.setStyle));
                if (opts.setWeight) setStemWeight(updateDynamic('stemWeights', opts.setWeight));
                if (opts.setTerminal) setTerminalStyle(updateDynamic('terminalStyles', opts.setTerminal));
                if (opts.setTexture) setStrokeTexture(updateDynamic('strokeTextures', opts.setTexture));
                if (opts.setLayout) setLayoutType(updateDynamic('layouts', opts.setLayout));
                if (opts.setDamage) setDeformationDamage(updateDynamic('deformationDamages', opts.setDamage));
                setIsAdvancedOptionsEnabled(true);
            }
        } catch (error) { console.error("Reference extraction failed:", error); } finally { setIsExtractingReference(false); if (referenceExtractRef.current) referenceExtractRef.current.value = ""; }
    }

    async function handleMoodImageUpload(e) {
        const files = Array.from(e.target.files); if (files.length === 0) return; setIsAnalyzingMood(true);
        try {
            const base64Promises = files.map(file => { return new Promise((resolve) => { const reader = new FileReader(); reader.onloadend = () => resolve({ inlineData: { mimeType: file.type, data: reader.result.split(',')[1] } }); reader.readAsDataURL(file); }); });
            const imageParts = await Promise.all(base64Promises);
            const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];
            const systemPrompt = `You are a legendary Typography Art Director specialized in STRICTLY 2D FLAT BLACK-AND-WHITE SILHOUETTE typography. [YOUR PERSONA]: ${persona.role}\n[YOUR TONE]: ${persona.tone}\nAnalyze the provided reference image(s). Synthesize their core worldview, narrative tension, and character traits.\n[CRITICAL RULE FOR TYPOGRAPHY AURA]: The resulting typography MUST be a pure 2D flat silhouette. ABSOLUTELY NO textures, NO lighting, NO 3D, NO materials, NO gradient colors. Focus ONLY on structural morphology.\nReturn ONLY a 2-3 sentence Korean description (Aura) detailing how the structural lines and shapes of the typography should be formed to match the combined mood.`;
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }, ...imageParts] }], generationConfig: { temperature: 0.7 } }) });
            const data = await response.json(); const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (resultText) setCustomDesignInjections(resultText.trim());
        } catch (error) { console.error("Mood analysis failed:", error); } finally { setIsAnalyzingMood(false); if (moodImageRef.current) moodImageRef.current.value = ""; }
    }

    async function handleSendTuningMessage() {
        if (!tuningInputValue.trim() && !tuningReferenceImage) return;
        const userMsg = tuningInputValue.trim() || "이미지 스타일을 분석해줘.";
        setTuningInputValue(""); setTuningChatHistory(prev => [...prev, { role: 'user', content: userMsg }]); setIsTuningLoading(true);
        const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];
        const systemPrompt = `You are a Typography Art Director and a friendly assistant. [YOUR PERSONA]: ${persona.role}\n[CURRENT SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)}\n[Current Aura]: "${currentTunedAura}"\n[User Request]: "${userMsg}"\nTask: Update the [Current Aura] to reflect the [User Request] and visual analysis. Make it professional. APPLY YOUR PERSONA'S VIBE AND KEYWORDS: ${persona.keywords}. Reflect the [CURRENT SUB-TRAIT FOCUS].\nWrite a short, friendly reply in Korean explaining what you changed and analyzed. Tone: ${persona.tone}.\nReturn JSON strictly in this format: { "newAura": "The updated aura string", "replyMessage": "Your friendly reply in Korean", "updateOptions": { "setStyle": { "id": "...", "name": "...", "en": "..." }, ... } }`;
        const parts = [{ text: "Process the tuning request. Analyze the reference image if provided." }];
        if (tuningReferenceImage) parts.push({ inlineData: { mimeType: "image/jpeg", data: tuningReferenceImage } });
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json", temperature: 0.7 } }) });
            const data = await response.json(); const result = extractJson(data.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
            if (result?.newAura && result?.replyMessage) {
                setCurrentTunedAura(String(result.newAura)); setTuningChatHistory(prev => [...prev, { role: 'assistant', content: String(result.replyMessage) }]);
                if (result.updateOptions) { const opts = result.updateOptions; if (opts.setStyle) setScriptType(updateDynamic('MMOStyles', opts.setStyle)); if (opts.setWeight) setStemWeight(updateDynamic('stemWeights', opts.setWeight)); if (opts.setTerminal) setTerminalStyle(updateDynamic('terminalStyles', opts.setTerminal)); if (opts.setTexture) setStrokeTexture(updateDynamic('strokeTextures', opts.setTexture)); if (opts.setKinetic) setKineticVelocity(updateDynamic('kineticVelocities', opts.setKinetic)); if (opts.setSharpness) setStrokeSharpness(updateDynamic('strokeSharpness', opts.setSharpness)); if (opts.setKerning) setKerning(updateDynamic('kerningOptions', opts.setKerning)); setIsAdvancedOptionsEnabled(true); }
            }
        } catch (e) { setTuningChatHistory(prev => [...prev, { role: 'assistant', content: "오류가 발생했습니다." }]); } finally { setIsTuningLoading(false); setTuningReferenceImage(null); }
    }

    async function handleSendEditTuningMessage() {
        if (!editTuningInputValue.trim() && !editTuningReferenceImage) return;
        const userMsg = editTuningInputValue.trim() || "이미지 스타일을 분석해줘.";
        setEditTuningInputValue(""); setEditTuningChatHistory(prev => [...prev, { role: 'user', content: userMsg }]); setIsEditTuningLoading(true);
        const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];
        const systemPrompt = `You are an expert Typography Art Director adjusting an Image-to-Image edit instruction. [YOUR PERSONA]: ${persona.role}\n[CURRENT SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)}\n[Current Edit Direction]: "${currentTunedEditAura}"\n[User Request]: "${userMsg}"\nTask: Update the [Current Edit Direction] integrating the user's request and image analysis. Maintain a professional tone while applying your persona's vibe and keywords: ${persona.keywords}. Reflect the [CURRENT SUB-TRAIT FOCUS].\nWrite a friendly response in Korean explaining the update. Tone: ${persona.tone}.\nReturn JSON strictly: { "newAura": "Updated instruction string", "replyMessage": "Friendly response in Korean", "updateOptions": { "setEditStroke": { "id": "...", "name": "...", "en": "..." }, ... } }`;
        const parts = [{ text: "Process the tuning request. Analyze the reference image if provided." }];
        if (editTuningReferenceImage) parts.push({ inlineData: { mimeType: "image/jpeg", data: editTuningReferenceImage } });
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json", temperature: 0.7 } }) });
            const data = await response.json(); const result = extractJson(data.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
            if (result?.newAura && result?.replyMessage) {
                setCurrentTunedEditAura(String(result.newAura)); setTuningChatHistory(prev => [...prev, { role: 'assistant', content: String(result.replyMessage) }]);
                if (result.updateOptions) { const opts = result.updateOptions; if (opts.setEditStroke) setEditStrokeMod(updateDynamic('editStrokeMods', opts.setEditStroke)); if (opts.setEditElement) setEditElementMod(updateDynamic('editElementMods', opts.setEditElement)); if (opts.setEditSurface) setEditSurfaceMod(updateDynamic('editSurfaceMods', opts.setEditSurface)); if (opts.setKinetic) setKineticVelocity(updateDynamic('kineticVelocities', opts.setKinetic)); if (opts.setDamage) setDeformationDamage(updateDynamic('deformationDamages', opts.setDamage)); }
            }
        } catch (e) { setEditTuningChatHistory(prev => [...prev, { role: 'assistant', content: "오류가 발생했습니다." }]); } finally { setIsEditTuningLoading(false); setEditTuningReferenceImage(null); }
    }

    async function handleExpandIntent() {
        if (!customDesignInjections.trim() || isExpandingIntent) return; setIsExpandingIntent(true);
        const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];
        const systemPrompt = `[YOUR PERSONA]: ${persona.role}\n[YOUR TONE]: ${persona.tone}\n[CURRENT SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)}\nExpand the user's keyword into a detailed, highly professional morphological design direction. NO MATERIALS / NO LIGHTING. FOCUS ON PURE FORM. 2-3 sentences. Return ONLY the expanded text in Korean.`;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: customDesignInjections }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.7 } }) });
            const data = await response.json(); if (data.candidates?.[0]?.content?.parts?.[0]?.text) setCustomDesignInjections(String(data.candidates[0].content.parts[0].text).trim());
        } catch (e) { } finally { setIsExpandingIntent(false); }
    }

    async function handleEditExpandIntent() {
        if (!editInstruction.trim() || isEditExpandingIntent) return; setIsEditExpandingIntent(true);
        const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];
        const systemPrompt = `[YOUR PERSONA]: ${persona.role}\n[YOUR TONE]: ${persona.tone}\n[CURRENT SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)}\nExpand the user's short edit keyword into a detailed, structural Image-to-Image morphological edit instruction incorporating the sub-trait focus. NO 3D/MATERIALS. Keep it 2D flat. Focus on stroke edges, dynamics, and destruction. Return only the expanded text in Korean.`;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: editInstruction }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.7 } }) });
            const data = await response.json(); if (data.candidates?.[0]?.content?.parts?.[0]?.text) setEditInstruction(String(data.candidates[0].content.parts[0].text).trim());
        } catch (e) { } finally { setIsEditExpandingIntent(false); }
    }

    async function runInspector(isEditFlag = false) {
        setIsInspecting(true); setSelectedResolutionIndex(0);
        const { baseTechnicalEn } = isEditFlag ? buildEditPrompts() : buildPrompts();
        const systemPrompt = `You are the 'Prompt Integrity Inspector' for an elite Dark Fantasy RPG typography generation engine.
    Your task is to analyze the user's [Base Technical Prompt] for logical conflicts that could confuse the AI image generator.
    Pay attention to the strict block structure: [TEXT LOCK], [LAYOUT LOCK], [PERSONA MORPHOLOGY], etc.
    Return STRICTLY a valid JSON object: { "hasConflict": boolean, "analysisMessage": "string", "resolutions": [ { "title": "string", "desc": "string", "resolvedPromptEn": "string", "resolvedPromptKo": "string" } ] }`;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: baseTechnicalEn }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json", temperature: 0.2 } }) });
            const data = await response.json(); const result = extractJson(data.candidates[0].content.parts[0].text);
            setInspectionResult({ ...result, isEdit: isEditFlag }); setIsInspectorModalOpen(true);
        } catch (e) { console.error("Inspector error", e); } finally { setIsInspecting(false); }
    }

    async function requestDramaticEnhancement() {
        if (isEnhancing) return; setIsEnhancing(true);
        const { baseTechnicalEn } = buildPrompts();
        const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];
        const systemPrompt = `You are a visionary Art Director for "Nano Banana 2". Transform technical specs into a morphological masterpiece. \n[YOUR PERSONA]: ${persona.role} \n[YOUR WRITING TONE]: ${persona.tone} \n[KEYWORDS]: ${persona.keywords} \n[CURRENT SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)} \nPROHIBIT 3D and MATERIALS.\n[CRITICAL RULE]: Adhere to the [PRIORITY 1-7] block structure in your mind. Emphasize the allowed deformation budget and Legibility floor.\nOutput format: \n1. # ARCHITECTURAL EVOLUTION \n2. # KINETIC ORGANIC ANATOMY \n3. # THE UNBOUNDED BOUNDARY \n4. # THE SUPREME COMMAND: Consolidated elite prompt string.`;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: baseTechnicalEn }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.7 } }) });
            const data = await response.json();
            const saveCode = generateSaveCode();
            const finalPrompt = String(data.candidates?.[0]?.content?.parts?.[0]?.text || "") + `\n\n${saveCode}`;
            setDramaticPrompt(finalPrompt);
            setIsOutdated(false);
        } catch (err) { } finally { setIsEnhancing(false); }
    }

    async function requestEditDramaticEnhancement() {
        if (isEditEnhancing) return; setIsEditEnhancing(true);
        const { baseTechnicalEn } = buildEditPrompts();
        const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];
        const systemPrompt = `You are a visionary Art Director for Nano Banana 2 Image-to-Image generation.\n[YOUR PERSONA]: ${persona.role} \n[YOUR WRITING TONE]: ${persona.tone} \n[KEYWORDS]: ${persona.keywords} \nPROHIBIT 3D and MATERIALS. \n[INTERPRETATION LIMIT]: Do NOT reinterpret the structure beyond the deformation budget. Focus on Micro-refinements. \nOutput format: \n1. # ARCHITECTURAL EVOLUTION \n2. # KINETIC ORGANIC ANATOMY \n3. # THE UNBOUNDED BOUNDARY \n4. # THE SUPREME COMMAND: Consolidated elite I2I prompt string.`;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: baseTechnicalEn }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.7 } }) });
            const data = await response.json();
            const saveCode = generateSaveCode();
            const finalPrompt = String(data.candidates?.[0]?.content?.parts?.[0]?.text || "") + `\n\n${saveCode}`;
            setEditDramaticPrompt(finalPrompt);
            setIsEditOutdated(false);
        } catch (err) { } finally { setIsEditEnhancing(false); }
    }

    async function requestMidjourneyOptimization(isEditFlag = false) {
        if (isEditFlag) { if (isEditMjOptimizing) return; setIsEditMjOptimizing(true); } else { if (isMjOptimizing) return; setIsMjOptimizing(true); }
        const { baseTechnicalEn, midjourneyOutput } = isEditFlag ? buildEditPrompts() : buildPrompts();
        const currentAR = aspectRatio;
        const systemPrompt = `Convert specs into Midjourney V6 tag string. Use ::2 for critical traits. Force 2D flat silhouette. \nEnd exactly with this exact suffix (DO NOT omit the --ar parameter): " --ar ${currentAR} --iw 1.5 --style raw --no 3d, volumetric, perspective, emboss, bevel, shadow, color, standard font, texture, glowing shader, material"`;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: baseTechnicalEn }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.2 } }) });
            const data = await response.json();
            let resultText = String(data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || midjourneyOutput);
            const saveCode = generateSaveCode();
            if (resultText.includes('--ar')) resultText = resultText.replace('--ar', `${saveCode} --ar`);
            else resultText += ` ${saveCode}`;

            if (isEditFlag) { setEditMjPrompt(resultText); setIsEditOutdated(false); }
            else { setMjOptimizedPrompt(resultText); setIsOutdated(false); }
        } catch (err) { } finally { if (isEditFlag) setIsEditMjOptimizing(false); else setIsMjOptimizing(false); }
    }

    async function requestChatGPTEnhancement(isEditFlag = false) {
        if (isEditFlag) { if (isEditCgEnhancing) return; setIsEditCgEnhancing(true); } else { if (isCgEnhancing) return; setIsCgEnhancing(true); }
        const { baseTechnicalEn, chatGPTOutput } = isEditFlag ? buildEditPrompts() : buildPrompts();
        const systemPrompt = `Create DALL-E 3 instructions for this typography prompt. Bullet points for edits. Strictly forbid 3D/materials. Output ONLY the final prompt text.`;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: baseTechnicalEn }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.7 } }) });
            const data = await response.json();
            const saveCode = generateSaveCode();
            const resultText = String(data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || chatGPTOutput) + `\n\n${saveCode}`;
            if (isEditFlag) { setEditCgPrompt(resultText); setIsEditOutdated(false); }
            else { setCgEnhancedPrompt(resultText); setIsOutdated(false); }
        } catch (err) { } finally { if (isEditFlag) setIsEditCgEnhancing(false); else setIsCgEnhancing(false); }
    }

    async function handleCompileDramatic() {
        if (isEditMode) { await requestEditDramaticEnhancement(); } else { await requestDramaticEnhancement(); }
    }

    function handleCompileMj() {
        requestMidjourneyOptimization(isEditMode);
    }

    function handleCompileCg() {
        requestChatGPTEnhancement(isEditMode);
    }

    // --- 7. UI RENDER HELPERS (정의가 누락되어 있던 헬퍼 함수들) ---
    // 현재 모드(생성/리터칭)에 맞는 컴파일된 베이스 프롬프트 — JSX에서 직접 참조
    const currentPrompts = isEditMode ? buildEditPrompts() : buildPrompts();

    const currentOutputContent = (() => {
        if (currentModel === 'NanoBanana') return isEditMode ? editDramaticPrompt : dramaticPrompt;
        if (currentModel === 'Midjourney') return isEditMode ? editMjPrompt : mjOptimizedPrompt;
        if (currentModel === 'ChatGPT')    return isEditMode ? editCgPrompt : cgEnhancedPrompt;
        return '';
    })();

    // 상단 툴바 — 버전 셀렉터 + 애니메이션 슬라이딩 필 토글 (햄버거 제거)
    const renderSidebarHeader = () => (
        <div className="shrink-0 z-20 border-b border-zinc-800/80 bg-[#1A1A1A]">
            <div className="p-4 space-y-3">
                {/* 버전 셀렉터 — 토글 위 */}
                {versions?.length > 0 && setVersion && (
                    <div className="flex items-center gap-1 bg-[#0A0A0A] border border-zinc-800/60 rounded-full p-1">
                        {versions.map((v) => {
                            const isActive = v.key === version;
                            return (
                                <button
                                    key={v.key}
                                    onClick={() => setVersion(v.key)}
                                    title={`${v.label} 버전으로 전환`}
                                    className={`flex-1 px-2 py-1 rounded-full text-[10px] font-bold tracking-[0.04em] transition-all whitespace-nowrap ${
                                        isActive ? '' : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                                    style={isActive ? { background: `${v.color}22`, color: v.color } : undefined}
                                >
                                    {v.label}
                                </button>
                            );
                        })}
                    </div>
                )}
                {/* 생성/리터칭 토글 — Breeze 슬라이딩 필 */}
                <div className="flex rounded-md p-1 bg-[#1A1A1A] border border-zinc-800 relative">
                    <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded shadow-[0_1px_3px_rgba(0,0,0,0.5)] bg-[#2C2C2C] transition-all duration-300 ${!isEditMode ? 'left-1' : 'left-[calc(50%+2px)]'}`} />
                    <button onClick={() => setCurrentView('editor')} className={`flex-1 py-1.5 text-[11px] font-bold rounded relative z-10 flex items-center justify-center gap-1.5 whitespace-nowrap ${!isEditMode ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
                        <PenTool className="w-3.5 h-3.5 shrink-0" /> <span>생성 어셈블리</span>
                    </button>
                    <button onClick={() => setCurrentView('edit')} className={`flex-1 py-1.5 text-[11px] font-bold rounded relative z-10 flex items-center justify-center gap-1.5 whitespace-nowrap ${isEditMode ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
                        <Edit3 className="w-3.5 h-3.5 shrink-0" /> <span>마이크로 리터칭</span>
                    </button>
                </div>
            </div>
        </div>
    );

    const renderDashboard = (editMode) => (
        <div className="bg-[#0A0A0A] border border-zinc-800/60 rounded-[10px] p-4 mt-4 flex items-center gap-3 flex-wrap text-[11px] text-zinc-400">
            <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold text-zinc-300">{editMode ? '리터칭 모드' : '생성 모드'}</span>
            <span className="text-zinc-500">·</span>
            <span>활성 모델: <span className="text-zinc-200 font-medium">{currentModel}</span></span>
            {isPromptOutdated && (
                <>
                    <span className="text-zinc-500">·</span>
                    <span className="text-amber-400">옵션이 변경되었습니다. 재생성을 권장합니다.</span>
                </>
            )}
        </div>
    );

    const renderOverviewTab = () => (
        <div className="mt-6 animate-in fade-in duration-300">
            <div className="bg-[#0A0A0A] border border-zinc-800/60 rounded-[12px] p-6 text-zinc-400 text-[12px] leading-relaxed">
                <div className="flex items-center gap-2 mb-3">
                    <Info className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-[13px] font-bold text-zinc-200 uppercase tracking-widest">Overview</h3>
                </div>
                <p>현재 옵션 조합으로 컴파일된 베이스 프롬프트는 위쪽 패널에서 확인할 수 있습니다. AI 모델 탭을 선택하면 각 모델에 최적화된 변환 결과가 표시됩니다.</p>
                <ul className="mt-4 space-y-1.5 text-[11px] text-zinc-500 list-disc list-inside">
                    <li>NanoBanana — 단일 이미지 생성용 드라마틱 프롬프트</li>
                    <li>Midjourney — 짧고 함축적인 v6/v7 최적화 프롬프트</li>
                    <li>ChatGPT (DALL-E) — 자연어 지시문 형태의 프롬프트</li>
                </ul>
            </div>
        </div>
    );

    const renderAiOutputBox = (modelKey, content, editFlag, outdatedFlag) => (
        <div className={`mt-6 rounded-[12px] border bg-[#0A0A0A] border-zinc-800/60 shadow-sm transition-all overflow-hidden ${outdatedFlag ? 'opacity-60' : ''}`}>
            <div className="flex justify-between items-center p-3 border-b border-zinc-800/60 bg-[#121212]">
                <p className="text-[12px] font-bold uppercase text-[#a6a6a6] tracking-wider">{modelKey} Output {editFlag ? '(Edit)' : ''}</p>
                {content && (
                    <button onClick={() => copyToClipboard(content, 'bottom')} title={copiedBottom ? "복사 완료!" : "결과 복사"} className="p-2 rounded-[8px] bg-indigo-500 hover:bg-indigo-600 text-white transition-all shadow-sm flex items-center justify-center">
                        {copiedBottom ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                )}
            </div>
            <div className="relative font-mono text-[12px] bg-[#0A0A0A] text-zinc-400 whitespace-pre-wrap leading-[1.625] p-6 min-h-[140px]">
                {content || <span className="text-zinc-600">아직 생성된 결과물이 없습니다. 상단의 빌드 버튼을 눌러 생성하세요.</span>}
            </div>
        </div>
    );

    // --- 8. SINGLE UNIFIED RETURN ---
    return (
        <div className={`flex flex-col h-screen ${t.bg} ${t.textColor} overflow-hidden transition-colors duration-500 relative p-4 font-sans`}>
            <style>{`
        /* 글로벌 폰트(Noto Sans KR / Teko / JetBrains Mono)는 index.html에서 로드됨. 앱 내부 강제 오버라이드 제거. */
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { margin: 10px; background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(63, 63, 70, 0.5); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(82, 82, 91, 0.5); }
      `}</style>

            <main className="flex-1 flex overflow-hidden gap-5">

                {/* === MAIN SIDEBAR === */}
                <aside className={`${isSidebarOpen ? 'w-[380px]' : 'w-0 border-none opacity-0 m-0 p-0'} shrink-0 border border-zinc-800/80 bg-[#141414] rounded-[16px] flex flex-col shadow-2xl relative overflow-hidden transition-all duration-300 z-50`}>

                    {renderSidebarHeader()}

                    <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">

                        {/* 1. Persona Selector */}
                        <div className="shrink-0">
                            <div className="flex items-center gap-2 mb-3 px-1">
                                <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#a6a6a6] flex items-center gap-2">
                                    <Crown className="w-3.5 h-3.5" /> AI Director Persona
                                </h3>
                            </div>
                            <div className={`relative ${personaDropdownOpen ? 'z-[9999]' : 'z-10'}`}>
                                <button onClick={() => setPersonaDropdownOpen(!personaDropdownOpen)} className="w-full flex items-center justify-between p-4 rounded-[12px] border border-zinc-800 bg-[#1C1C1C] hover:bg-[#262626] transition-all text-left shadow-sm focus:border-indigo-500/50 outline-none">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 opacity-80">{directorPersonas.find(p => p.id === aiPersona)?.icon}</div>
                                        <div>
                                            <div className="text-[12px] font-bold text-zinc-200">{directorPersonas.find(p => p.id === aiPersona)?.shortTitle}</div>
                                        </div>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-[#a6a6a6] transition-transform ${personaDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {personaDropdownOpen && (
                                    <div className="absolute top-full left-0 w-full mt-2 bg-[#1C1C1C] border border-zinc-700 rounded-[12px] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-[1000] flex flex-col">
                                        {directorPersonas.map(p => (
                                            <button key={p.id} onClick={() => { setAiPersona(p.id); setPersonaDropdownOpen(false); }} className={`w-full text-left p-4 flex items-start gap-3 transition-all ${aiPersona === p.id ? 'border-l-[3px] border-emerald-400 bg-emerald-500/10' : 'border-l-[3px] border-transparent hover:bg-[#262626]'}`}>
                                                <div className="mt-0.5 opacity-80">{p.icon}</div>
                                                <div className="flex-1">
                                                    <div className={`text-[11px] font-bold flex items-center justify-between ${aiPersona === p.id ? 'text-emerald-300' : 'text-[#a6a6a6]'}`}>{p.shortTitle}</div>
                                                    <div className="text-[10px] text-zinc-500 mt-1">{p.subtitle}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. Specific Inputs (Creation vs Edit) */}
                        {!isEditMode ? (
                            <div className="shrink-0 rounded-[12px] border border-zinc-800/80 p-5 bg-[#171717] shadow-lg space-y-6 relative overflow-hidden">
                                <div>
                                    <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#a6a6a6] flex items-center gap-1.5"><Command className="w-3 h-3" /> Subject Text</div>
                                    <textarea value={inputText} onChange={e => setInputText(e.target.value)} placeholder="텍스트 입력 (엔터로 줄바꿈)" rows={inputText.includes('\n') ? 2 : 1} className={`w-full bg-[#0A0A0A] font-black outline-none text-white border border-zinc-800 rounded-[10px] px-4 py-3 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all shadow-inner resize-none custom-scrollbar ${inputText.includes('\n') || inputText.length > 10 ? 'text-[15px] leading-tight' : 'text-[20px] leading-tight'}`} />
                                </div>
                                <div>
                                    <div className="mb-2 flex items-center justify-between">
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-[#a6a6a6] flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Design Aura</div>
                                        <div className="flex gap-1.5">
                                            <button onClick={() => moodImageRef.current?.click()} disabled={isAnalyzingMood} title="배경 무드 분석" className={`p-2 rounded-[8px] transition-all flex items-center justify-center ${isAnalyzingMood ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30' : 'bg-[#1C1C1C] hover:bg-[#262626] text-zinc-400 hover:text-white border border-zinc-700/60 shadow-sm'}`}>
                                                {isAnalyzingMood ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                                            </button>
                                            <input type="file" ref={moodImageRef} className="hidden" accept="image/*" multiple onChange={handleMoodImageUpload} />
                                            <button onClick={() => referenceExtractRef.current?.click()} disabled={isExtractingReference} title="레퍼런스 구조 추출 (이미지 속 타이포의 레이아웃과 뼈대 DNA 스틸)" className={`p-2 rounded-[8px] transition-all flex items-center justify-center ${isExtractingReference ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30' : 'bg-[#1C1C1C] hover:bg-[#262626] text-zinc-400 hover:text-white border border-zinc-700/60 shadow-sm'}`}>
                                                {isExtractingReference ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pipette className="w-3.5 h-3.5" />}
                                            </button>
                                            <input type="file" ref={referenceExtractRef} className="hidden" accept="image/*" onChange={handleReferenceExtraction} />
                                            <button onClick={() => openTuningRoom()} disabled={!customDesignInjections.trim()} title="AI 튜닝룸" className={`p-2 rounded-[8px] transition-all flex items-center justify-center ${!customDesignInjections.trim() ? 'opacity-30 cursor-not-allowed text-zinc-600' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20'}`}>
                                                <MessageSquare className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={handleExpandIntent} disabled={isExpandingIntent || !customDesignInjections.trim()} title="자동 구체화" className={`p-2 rounded-[8px] transition-all flex items-center justify-center ${isExpandingIntent ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 shadow-sm'}`}>
                                                {isExpandingIntent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </div>
                                    <textarea value={customDesignInjections} onChange={e => setCustomDesignInjections(e.target.value)} placeholder="원하는 분위기나 형태를 묘사하세요." className="w-full bg-[#1C1C1C] text-[12px] p-4 rounded-[10px] border border-zinc-800 outline-none min-h-[5rem] resize-none text-zinc-300 custom-scrollbar placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all shadow-sm" />

                                    <div className="mt-4 bg-[#1C1C1C] rounded-[10px] p-4 shadow-inner border border-zinc-800/60">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-[10px] font-bold text-[#a6a6a6]">{sliderDesc.leftLabel}</span>
                                            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500/60" />
                                            <span className="text-[10px] font-bold text-emerald-500">{sliderDesc.rightLabel}</span>
                                        </div>
                                        <input type="range" min="0" max="100" value={personaSliderValue} onChange={e => setPersonaSliderValue(e.target.value)} className="w-full h-1.5 bg-zinc-700 rounded-[10px] appearance-none cursor-pointer accent-emerald-500" />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="shrink-0 rounded-[12px] border border-zinc-800/80 p-5 bg-[#171717] shadow-lg space-y-6 relative overflow-hidden">
                                <div>
                                    <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#a6a6a6] flex items-center gap-1.5"><ImageIcon className="w-3 h-3" /> Target Image</div>

                                    <div
                                        onClick={() => editImageRef.current?.click()}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleEditDrop}
                                        className={`relative rounded-[10px] border border-dashed border-zinc-700/60 p-5 text-center cursor-pointer transition-all min-h-[130px] flex flex-col items-center justify-center ${isDragging ? 'bg-[#262626] border-emerald-500/50' : 'bg-[#121212] hover:bg-[#1A1A1A]'}`}
                                    >
                                        {editUploadedImage ? (
                                            <div className="flex flex-col items-center justify-center w-full gap-3">
                                                <img src={editUploadedImage} className="h-20 object-contain rounded-[6px] border border-zinc-700/50 shadow-md" />
                                                <button onClick={(e) => { e.stopPropagation(); setEditUploadedImage(null); }} className="text-[9px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 px-3 py-1.5 bg-red-500/10 rounded-full transition-colors border border-red-500/20"><X className="w-3 h-3" /> REMOVE</button>
                                            </div>
                                        ) : (
                                            <div className="text-[11px] font-bold text-[#a6a6a6] flex flex-col items-center gap-2">
                                                <ImageIcon className="w-7 h-7 opacity-40 mb-1" />
                                                <span className="text-zinc-400">TARGET UPLOAD</span>
                                                <span className="text-[9px] text-zinc-600 font-normal">클릭하거나 리믹스할 이미지를 드롭하세요</span>
                                            </div>
                                        )}
                                        <input type="file" ref={editImageRef} className="hidden" accept="image/*" onChange={handleEditImageUpload} />
                                    </div>

                                    {!editUploadedImage && (
                                        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[12px] bg-[#121212]/60 backdrop-blur-[2px] pointer-events-none">
                                            <div className="bg-[#1C1C1C] px-4 py-2 rounded-[8px] border border-emerald-500/30 flex items-center gap-2 shadow-2xl">
                                                <AlertCircle className="w-4 h-4 text-emerald-400" />
                                                <span className="text-[11px] font-bold text-emerald-300">Target Image를 업로드해주세요</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className={`transition-all duration-300 relative ${!editUploadedImage ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
                                    <div className="mb-2 flex items-center justify-between">
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-[#a6a6a6] flex items-center gap-1.5"><Brush className="w-3 h-3" /> Edit Direction</div>
                                        <div className="flex gap-1.5">
                                            <button onClick={openEditTuningRoom} disabled={!editInstruction.trim()} title="튜닝룸" className={`p-2 rounded-[8px] transition-all flex items-center justify-center ${!editInstruction.trim() ? 'opacity-30 cursor-not-allowed text-zinc-600' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20'}`}>
                                                <MessageSquare className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={handleEditExpandIntent} disabled={isEditExpandingIntent || !editInstruction.trim()} title="자동 구체화" className={`p-2 rounded-[8px] transition-all flex items-center justify-center ${isEditExpandingIntent ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 shadow-sm'}`}>
                                                {isEditExpandingIntent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SparkleIcon className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </div>
                                    <textarea value={editInstruction} onChange={e => setEditInstruction(e.target.value)} placeholder="리터칭 방향을 입력하세요." className="w-full bg-[#1C1C1C] text-[12px] p-4 rounded-[10px] border border-zinc-800 outline-none min-h-[5rem] resize-none text-zinc-300 custom-scrollbar placeholder:text-zinc-600 focus:border-emerald-500/50 transition-all shadow-sm" />

                                    <div className="mt-4 bg-[#1C1C1C] rounded-[10px] p-4 shadow-inner border border-zinc-800/60">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-[10px] font-bold text-[#a6a6a6]">{sliderDesc.leftLabel}</span>
                                            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500/60" />
                                            <span className="text-[10px] font-bold text-emerald-500">{sliderDesc.rightLabel}</span>
                                        </div>
                                        <input type="range" min="0" max="100" value={personaSliderValue} onChange={e => setPersonaSliderValue(e.target.value)} className="w-full h-1.5 bg-zinc-700 rounded-[10px] appearance-none cursor-pointer accent-emerald-500" />
                                    </div>

                                    <div className="mt-5 space-y-2">
                                        <div className="flex items-center justify-between bg-[#1C1C1C] rounded-[10px] border border-zinc-800/80 p-3 hover:border-zinc-700 transition-colors shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <Bot className={`w-4 h-4 ${applyAiRecInEdit ? 'text-indigo-400' : 'text-zinc-600'}`} />
                                                <span className={`text-[11px] font-bold tracking-wide ${applyAiRecInEdit ? 'text-indigo-300' : 'text-[#a6a6a6]'}`}>AI 조형 자동 추천</span>
                                            </div>
                                            <button onClick={() => setApplyAiRecInEdit(!applyAiRecInEdit)} className={`w-9 h-5 rounded-full p-1 flex items-center transition-colors shadow-inner ${applyAiRecInEdit ? 'bg-indigo-500' : 'bg-[#121212] border border-zinc-800'}`}>
                                                <div className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${applyAiRecInEdit ? 'translate-x-4 border-none' : 'translate-x-0 border border-zinc-600'}`} />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between bg-[#1C1C1C] rounded-[10px] border border-zinc-800/80 p-3 hover:border-zinc-700 transition-colors shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <Wand className={`w-4 h-4 ${applyAutoRefine ? 'text-emerald-400' : 'text-zinc-600'}`} />
                                                <span className={`text-[11px] font-bold tracking-wide ${applyAutoRefine ? 'text-emerald-300' : 'text-[#a6a6a6]'}`}>스케치 자동 정규화</span>
                                            </div>
                                            <button onClick={() => setApplyAutoRefine(!applyAutoRefine)} className={`w-9 h-5 rounded-full p-1 flex items-center transition-colors shadow-inner ${applyAutoRefine ? 'bg-emerald-500' : 'bg-[#121212] border border-zinc-800'}`}>
                                                <div className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${applyAutoRefine ? 'translate-x-4 border-none' : 'translate-x-0 border border-zinc-600'}`} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3. AI Recommend & Reset Buttons (Common) */}
                        {!isEditMode && (
                            <div className="grid grid-cols-6 gap-2 pt-2">
                                <button onClick={handleAiRecommendation} disabled={isRecommending} className="col-span-4 py-3 rounded-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 font-bold text-[11px] uppercase flex items-center justify-center gap-2 transition-colors shadow-sm">
                                    {isRecommending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />} AI 스마트 셋업
                                </button>
                                <button onClick={() => setIsImportModalOpen(true)} title="프롬프트로 설정 복원" className="col-span-1 bg-[#1C1C1C] border border-zinc-800 hover:bg-[#262626] hover:text-white text-zinc-400 rounded-[10px] flex items-center justify-center transition-colors">
                                    <FileUp className="w-4 h-4" />
                                </button>
                                <button onClick={handleReset} title="초기화" className="col-span-1 bg-[#1C1C1C] border border-zinc-800 hover:bg-[#262626] hover:text-white text-zinc-400 rounded-[10px] flex items-center justify-center transition-colors">
                                    <RefreshCcw className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                        {(!isEditMode && aiRecSummary) && (
                            <div className={`mt-2 p-4 rounded-[10px] border animate-in fade-in duration-500 bg-[#1C1C1C] border-zinc-700/60 shadow-sm`}>
                                <p className={`text-[11px] font-bold mb-1 text-emerald-300 flex items-center gap-1.5`}><Sparkles className="w-3 h-3 text-emerald-400/70" /> {String(aiRecSummary.title)}</p>
                                <p className={`text-[10px] leading-relaxed text-zinc-400`}>{String(aiRecSummary.reason)}</p>
                            </div>
                        )}

                        {/* 4. Core Options Wrapper */}
                        <div className={`transition-all duration-300 pb-8 ${(isEditMode && !editUploadedImage) ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
                            <div className="mt-4 mb-4 px-1">
                                <div className="mb-3">
                                    <DropdownControl label="타입 프리셋" icon={<Anchor className="w-3.5 h-3.5 text-zinc-400" />} data={[...staticOptions.MMOStyles, ...(dynamicOptions.MMOStyles || [])]} value={scriptType} onChange={handleScriptPresetChange} theme={theme} />
                                </div>

                                <div className="shrink-0 mb-4 p-2.5 rounded-[10px] border border-zinc-800/80 bg-[#171717] flex items-center justify-between shadow-sm transition-colors">
                                    <div className="flex items-center gap-2 pl-1">
                                        <Settings className="w-4 h-4 text-[#a6a6a6]" />
                                        <h3 className="text-[11px] font-bold uppercase tracking-wide text-zinc-300">조형 설정</h3>
                                    </div>
                                    <div className="flex bg-[#0A0A0A] rounded-[6px] p-0.5 border border-zinc-800 shadow-inner">
                                        <button onClick={() => setIsAdvancedOptionsEnabled(false)} className={`px-3 py-1 text-[10px] font-bold rounded-[4px] transition-all ${!isAdvancedOptionsEnabled ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>요약</button>
                                        <div className="w-[1px] bg-zinc-800 my-1 mx-0.5" />
                                        <button onClick={() => setIsAdvancedOptionsEnabled(true)} className={`px-3 py-1 text-[10px] font-bold rounded-[4px] transition-all ${isAdvancedOptionsEnabled ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>고급</button>
                                    </div>
                                </div>

                                {isEditMode && (
                                    <OptionGroupCard id="edit_retouch" openCardId={editOpenCardId} onToggle={handleEditToggleCard} title="세부 조형 리터칭" icon={<Highlighter className="w-3.5 h-3.5 text-zinc-400" />} summary={`${getOptionName([...staticOptions.editStrokeMods, ...(dynamicOptions.editStrokeMods || [])], editStrokeMod).split(' ')[0]} · ${getOptionName([...staticOptions.editElementMods, ...(dynamicOptions.editElementMods || [])], editElementMod).split(' ')[0]}`}>
                                        <div className="space-y-3">
                                            <DropdownControl label="획(Stroke) 변형" data={[...staticOptions.editStrokeMods, ...(dynamicOptions.editStrokeMods || [])]} value={editStrokeMod} onChange={setEditStrokeMod} theme={theme} />
                                            <DropdownControl label="요소(Element) 변환" data={[...staticOptions.editElementMods, ...(dynamicOptions.editElementMods || [])]} value={editElementMod} onChange={setEditElementMod} theme={theme} />
                                            <DropdownControl label="표면(Surface) 질감" data={[...staticOptions.editSurfaceMods, ...(dynamicOptions.editSurfaceMods || [])]} value={editSurfaceMod} onChange={setEditSurfaceMod} theme={theme} />
                                        </div>
                                    </OptionGroupCard>
                                )}

                                <OptionGroupCard id="layout" openCardId={isEditMode ? editOpenCardId : openCardId} onToggle={isEditMode ? handleEditToggleCard : handleToggleCard} title="구조 배치" icon={<LayoutTemplate className="w-3.5 h-3.5 text-zinc-400" />} summary={`${getOptionName(staticOptions.ratios, aspectRatio)} · ${getOptionName(staticOptions.layouts, layoutType).split(' ')[0]}`}>
                                    <div className="mb-3"><DropdownControl label="레이아웃 프리셋" data={staticOptions.layoutPresets} value={layoutPreset} onChange={handleLayoutPresetChange} theme={theme} /></div>
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <DropdownControl label="비율" data={staticOptions.ratios} value={aspectRatio} onChange={(val) => { setAspectRatio(val); setLayoutPreset(''); }} theme={theme} />
                                        <DropdownControl label="크기/여백" data={staticOptions.occupancies} value={occupancy} onChange={(val) => { setOccupancy(val); setLayoutPreset(''); }} theme={theme} />
                                    </div>
                                    <div className="mb-3"><DropdownControl label="배열 방식" data={staticOptions.layouts} value={layoutType} onChange={(val) => { setLayoutType(val); setLayoutPreset(''); }} theme={theme} /></div>
                                    {(layoutType === "TitleSub" || layoutType === "SubTitle") && (<div className="mb-3"><DropdownControl label="서브 텍스트 크기" data={staticOptions.subTitleSizes} value={subTitleSize} onChange={setSubTitleSize} theme={theme} /></div>)}
                                    {isAdvancedOptionsEnabled && (<div className="mt-3 pt-3 border-t border-zinc-800/50"><DropdownControl label="고급 실루엣" data={staticOptions.MMOSilhouetteFramings} value={mmoSilhouetteFraming} onChange={(val) => { setMmoSilhouetteFraming(val); setLayoutPreset(''); }} theme={theme} /></div>)}
                                </OptionGroupCard>

                                {isAdvancedOptionsEnabled && (
                                    <OptionGroupCard id="terminal" openCardId={isEditMode ? editOpenCardId : openCardId} onToggle={isEditMode ? handleEditToggleCard : handleToggleCard} title="획 마감" icon={<Brush className="w-3.5 h-3.5 text-zinc-400" />} summary={`${getOptionName([...staticOptions.terminalStyles, ...(dynamicOptions.terminalStyles || [])], terminalStyle).split(' ')[0]} · ${getOptionName([...staticOptions.strokeSharpness, ...(dynamicOptions.strokeSharpness || [])], strokeSharpness).split(' ')[0]}`}>
                                        <div className="grid grid-cols-2 gap-3">
                                            <DropdownControl label="마감 방식" data={[...staticOptions.terminalStyles, ...(dynamicOptions.terminalStyles || [])]} value={terminalStyle} onChange={setTerminalStyle} theme={theme} />
                                            <DropdownControl label="예리함" data={[...staticOptions.strokeSharpness, ...(dynamicOptions.strokeSharpness || [])]} value={strokeSharpness} onChange={setStrokeSharpness} theme={theme} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mt-3">
                                            <DropdownControl label="절단 방식" data={[...staticOptions.slicingIntensities, ...(dynamicOptions.slicingIntensities || [])]} value={slicingIntensity} onChange={setSlicingIntensity} theme={theme} />
                                            <DropdownControl label="코너 성격" data={[...staticOptions.cornerStyles, ...(dynamicOptions.cornerStyles || [])]} value={cornerStyle} onChange={setCornerStyle} theme={theme} />
                                        </div>
                                    </OptionGroupCard>
                                )}

                                {(!isEditMode && isAdvancedOptionsEnabled) && (
                                    <OptionGroupCard id="connection" openCardId={openCardId} onToggle={handleToggleCard} title="문자 결속" icon={<Layers3 className="w-3.5 h-3.5 text-zinc-400" />} summary={`결합 ${getOptionName(staticOptions.letterConnections, letterConnection).split(' ')[0]}`}>
                                        <div className="grid grid-cols-2 gap-3">
                                            <DropdownControl label="글자 결합" data={staticOptions.letterConnections} value={letterConnection} onChange={setLetterConnection} theme={theme} />
                                            <DropdownControl label="자간" data={[...staticOptions.kerningOptions, ...(dynamicOptions.kerningOptions || [])]} value={kerning} onChange={setKerning} theme={theme} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mt-3">
                                            <DropdownControl label="내부 공간" data={staticOptions.internalSpaces} value={internalSpace} onChange={setInternalSpace} theme={theme} />
                                            <DropdownControl label="로고화 정도" data={staticOptions.logoDegrees} value={logoDegree} onChange={setLogoDegree} theme={theme} />
                                        </div>
                                    </OptionGroupCard>
                                )}

                                {isAdvancedOptionsEnabled && (
                                    <OptionGroupCard id="intensity" openCardId={isEditMode ? editOpenCardId : openCardId} onToggle={isEditMode ? handleEditToggleCard : handleToggleCard} title="표현 강도" icon={<Activity className="w-3.5 h-3.5 text-zinc-400" />} summary={`동세: ${getOptionName([...staticOptions.kineticVelocities, ...(dynamicOptions.kineticVelocities || [])], kineticVelocity).split(' ')[0]} · 파괴: ${getOptionName([...staticOptions.deformationDamages, ...(dynamicOptions.deformationDamages || [])], deformationDamage).split(' ')[0]}`}>
                                        <div className="grid grid-cols-2 gap-3">
                                            <DropdownControl label="조형적 동세" data={[...staticOptions.kineticVelocities, ...(dynamicOptions.kineticVelocities || [])]} value={kineticVelocity} onChange={setKineticVelocity} theme={theme} />
                                            <DropdownControl label="기울기" data={staticOptions.slantAngles} value={slantAngle} onChange={setSlantAngle} theme={theme} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mt-3">
                                            <DropdownControl label="배경 대비" icon={<BoxIcon className="w-3 h-3" />} data={staticOptions.base} value={baseStyle} onChange={setBaseStyle} theme={theme} />
                                            <DropdownControl label="파괴/침식" data={[...staticOptions.deformationDamages, ...(dynamicOptions.deformationDamages || [])]} value={deformationDamage} onChange={setDeformationDamage} theme={theme} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mt-3">
                                            <DropdownControl label="주변 장식" data={staticOptions.MMOSurroundingElements} value={mmoSurroundingElement} onChange={setMmoSurroundingElement} theme={theme} />
                                        </div>
                                    </OptionGroupCard>
                                )}
                            </div>

                            <section className="mt-6 border-t border-zinc-800/50 pt-4 px-3">
                                <div className="flex items-center justify-between">
                                    <SectionHeader id="06" label="모디파이어 (구조 강제)" icon={<Wand className="w-3.5 h-3.5" />} theme={theme} />
                                    <div className="flex items-center gap-2 mt-3 cursor-pointer" onClick={() => setIsEnhanceModeEnabled(!isEnhanceModeEnabled)}>
                                        <span className={`text-[10px] font-bold uppercase tracking-wide ${isEnhanceModeEnabled ? 'text-indigo-400' : 'text-zinc-500'}`}>{isEnhanceModeEnabled ? '활성화됨' : '비활성'}</span>
                                        <div className={`w-8 h-4 rounded-full p-1 flex items-center transition-colors shadow-inner ${isEnhanceModeEnabled ? 'bg-indigo-500' : 'bg-[#1C1C1C] border border-zinc-800'}`}>
                                            <div className={`w-2.5 h-2.5 bg-white rounded-full transition-transform ${isEnhanceModeEnabled ? 'translate-x-4 border-none' : 'translate-x-0 border border-zinc-600'}`} />
                                        </div>
                                    </div>
                                </div>
                                <div className={`p-3 rounded-[10px] border bg-[#171717] border-zinc-800/80 mt-3 shadow-sm transition-all duration-300 ${!isEnhanceModeEnabled ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
                                    <div className="flex bg-[#0A0A0A] rounded-[10px] p-1 border border-zinc-800/60">
                                        <button onClick={() => isEnhanceModeEnabled && setEnhanceMode('refine')} className={`flex-1 py-2 rounded-[8px] text-[11px] font-bold transition-all ${enhanceMode === 'refine' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 shadow-sm' : 'text-[#a6a6a6] hover:text-zinc-300 border border-transparent'}`}>💎 정제</button>
                                        <button onClick={() => isEnhanceModeEnabled && setEnhanceMode('variation')} className={`flex-1 py-2 rounded-[8px] text-[11px] font-bold transition-all ${enhanceMode === 'variation' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm' : 'text-[#a6a6a6] hover:text-zinc-300 border border-transparent'}`}>🎨 변주</button>
                                        <button onClick={() => isEnhanceModeEnabled && setEnhanceMode('deconstruct')} className={`flex-1 py-2 rounded-[8px] text-[11px] font-bold transition-all ${enhanceMode === 'deconstruct' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-sm' : 'text-[#a6a6a6] hover:text-zinc-300 border border-transparent'}`}>💥 해체</button>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-zinc-800/50">
                                    <div className="flex items-center justify-between pl-1">
                                        <div className="flex items-center gap-2">
                                            <FastForward className="w-3.5 h-3.5 text-[#a6a6a6]" />
                                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#a6a6a6]">전투 동세 (Combat Dynamics)</h3>
                                        </div>
                                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setMomentumActive(!momentumActive)}>
                                            <span className={`text-[10px] font-bold uppercase tracking-wide ${momentumActive ? 'text-amber-400' : 'text-zinc-500'}`}>{momentumActive ? 'ON' : 'OFF'}</span>
                                            <div className={`w-8 h-4 rounded-full p-1 flex items-center transition-colors shadow-inner ${momentumActive ? 'bg-amber-500' : 'bg-[#1C1C1C] border border-zinc-800'}`}>
                                                <div className={`w-2.5 h-2.5 bg-white rounded-full transition-transform ${momentumActive ? 'translate-x-4 border-none' : 'translate-x-0 border border-zinc-600'}`} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                    </div>
                </aside>

                {/* === MAIN RIGHT PANEL === */}
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
                                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                            {isEditMode ? <><Edit3 className="w-5 h-5 text-zinc-400" /> Image Retouching</> : <><PenTool className="w-5 h-5 text-zinc-400" /> Typography Generator</>}
                                        </h2>
                                        <p className="text-[12px] text-zinc-500 mt-0.5">{isEditMode ? '기존 형태를 유지하며 디테일을 다듬습니다.' : '지정된 옵션을 바탕으로 최적화된 프롬프트를 생성합니다.'}</p>
                                    </div>
                                </div>
                            </div>

                            {renderDashboard(isEditMode)}

                            <div className="space-y-8 mt-8">
                                {/* Accordion Prompt View */}
                                <div className={`rounded-[12px] border bg-[#0A0A0A] border-zinc-800/60 shadow-sm transition-all overflow-hidden flex flex-col`}>
                                    <div className="flex justify-between items-center p-3 border-b border-zinc-800/60 bg-[#121212]">
                                        <div className="flex items-center gap-4 flex-wrap">
                                            <button onClick={() => setExpanded(!isExpanded)} className="flex items-center gap-2 hover:bg-[#1A1A1A] p-1.5 rounded-[10px] transition-all group outline-none" title={isExpanded ? "프롬프트 접기" : "프롬프트 펼치기"}>
                                                <div className={`p-1 rounded-[8px] bg-[#1C1C1C] group-hover:bg-[#262626] transition-colors`}>
                                                    <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                </div>
                                                <p className="text-[12px] font-bold uppercase text-[#a6a6a6] tracking-wider">Base Technical Prompt</p>
                                            </button>
                                            <div className="flex gap-2">
                                                {hasManualBasePrompt && <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-bold rounded-[6px] uppercase border border-emerald-500/20">Resolved</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => runInspector(isEditMode)} disabled={isInspecting} title="무결성 검사" className="p-2 rounded-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all flex items-center justify-center shadow-sm">
                                                {isInspecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
                                            </button>
                                            <button onClick={() => copyToClipboard(baseLangView === 'ko' ? currentPrompts.baseTechnicalKo : currentPrompts.baseTechnicalEn, 'top')} title={copiedTop ? "복사 완료!" : "전체 프롬프트 복사"} className="p-2 rounded-[8px] bg-indigo-500 hover:bg-indigo-600 text-white transition-all shadow-sm flex items-center justify-center">
                                                {copiedTop ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                            <div className="flex bg-[#0A0A0A] rounded-[8px] p-1 border border-zinc-800 shadow-inner ml-1">
                                                <button onClick={() => setBaseLangView('en')} className={`px-3 py-1 text-[10px] font-bold uppercase rounded-[6px] transition-all ${baseLangView === 'en' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>EN</button>
                                                <button onClick={() => setBaseLangView('ko')} className={`px-3 py-1 text-[10px] font-bold uppercase rounded-[6px] transition-all ${baseLangView === 'ko' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>KO</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`relative font-mono text-[12px] bg-[#0A0A0A] text-zinc-400 whitespace-pre-wrap leading-[1.625] transition-[max-height] duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[3000px]' : 'max-h-[220px]'}`}>
                                        <div className="p-6 pb-8">
                                            {baseLangView === 'ko' ? currentPrompts.baseTechnicalKo : currentPrompts.baseTechnicalEn}
                                        </div>
                                        {!isExpanded && <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/80 to-transparent pointer-events-none" />}
                                    </div>
                                </div>

                                {/* Output Generation Actions */}
                                <div className="space-y-4">
                                    <div className="flex flex-nowrap items-center gap-2 overflow-x-auto custom-scrollbar pb-2">
                                        <button onClick={() => setModel('Overview')} className={`shrink-0 min-w-max px-6 py-2.5 border rounded-[8px] text-[11px] font-bold tracking-wide transition-all shadow-sm ${currentModel === 'Overview' ? 'border-zinc-500 bg-zinc-800 text-white' : 'border-zinc-800/80 bg-[#121212] text-zinc-500 hover:bg-[#1A1A1A] hover:text-zinc-300'}`}>Overview</button>
                                        {aiOptimizationModels.map(model => (
                                            <button key={model.id} onClick={() => setModel(model.id)} className={`shrink-0 min-w-max px-6 py-2.5 border rounded-[8px] text-[11px] font-bold tracking-wide transition-all shadow-sm ${currentModel === model.id ? 'border-zinc-500 bg-zinc-800 text-white' : 'border-zinc-800/80 bg-[#121212] text-zinc-500 hover:bg-[#1A1A1A] hover:text-zinc-300'}`}>{model.name}</button>
                                        ))}
                                    </div>

                                    {currentModel === 'NanoBanana' && (
                                        <button onClick={handleCompileDramatic} disabled={isGeneratingDramatic} className="w-full shrink-0 px-6 py-3.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/50 rounded-[10px] font-bold text-[12px] uppercase flex justify-center items-center gap-2 transition-all shadow-sm">
                                            {isGeneratingDramatic ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <Stars className="w-4 h-4 text-emerald-400" />} 프롬프트 빌드
                                        </button>
                                    )}
                                    {currentModel === 'Midjourney' && (
                                        <button onClick={handleCompileMj} disabled={isGeneratingMj} className="w-full shrink-0 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[10px] font-black text-[12px] uppercase flex justify-center items-center gap-2 transition-all shadow-md">
                                            {isGeneratingMj ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <RefreshCcw className="w-4 h-4 text-white" />} 미드저니 최적화
                                        </button>
                                    )}
                                    {currentModel === 'ChatGPT' && (
                                        <button onClick={handleCompileCg} disabled={isGeneratingCg} className="w-full shrink-0 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[10px] font-bold text-[12px] uppercase flex justify-center items-center gap-2 transition-all shadow-sm">
                                            {isGeneratingCg ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Stars className="w-4 h-4 text-white" />} DALL-E 지시문 빌드
                                        </button>
                                    )}
                                </div>

                                {currentModel === 'Overview' ? renderOverviewTab() : renderAiOutputBox(currentModel, currentOutputContent, isEditMode, isPromptOutdated)}

                            </div>
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
                                <h3 className="text-white font-bold text-sm tracking-wide">형태 아이디어 튜닝룸</h3>
                            </div>
                            <button onClick={() => setIsTuningModalOpen(false)} className="text-[#a6a6a6] hover:text-white transition-colors p-1 rounded-[10px] hover:bg-zinc-800">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4 border-b border-zinc-800/50 bg-[#121212] shrink-0">
                            <div className="flex items-center gap-1.5 mb-2">
                                <Edit3 className="w-3.5 h-3.5 text-zinc-500" />
                                <span className="text-[11px] font-bold text-[#a6a6a6] tracking-wider uppercase">현재 묘사 내용</span>
                            </div>
                            <p className="text-[13px] text-emerald-300 bg-emerald-500/10 leading-relaxed max-h-[150px] overflow-y-auto custom-scrollbar whitespace-pre-wrap px-3 py-2.5 border-l-[3px] border-emerald-500 rounded-[6px]">"{String(currentTunedAura)}"</p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar bg-[#1A1A1A]" ref={tuningChatRef}>
                            {tuningChatHistory.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-[10px] px-4 py-3 text-[13px] leading-relaxed shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-zinc-700 text-white rounded-br-sm' : 'bg-[#121212] border border-zinc-800/80 text-zinc-300 rounded-tl-sm'}`}>
                                        {String(msg.content)}
                                    </div>
                                </div>
                            ))}
                            {isTuningLoading && (
                                <div className="flex justify-start">
                                    <div className="max-w-[85%] rounded-[10px] px-4 py-3 bg-[#121212] border border-zinc-800/80 text-zinc-400 rounded-tl-sm flex items-center gap-2 text-[13px]">
                                        <Loader2 className="w-4 h-4 animate-spin" /> 분석 및 튜닝 중...
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-4 shrink-0 bg-[#1A1A1A] flex flex-col gap-3 border-t border-zinc-800/60">
                            {tuningReferenceImage && (
                                <div className="flex items-center justify-between bg-[#1C1C1C] p-2 rounded-[10px] border border-zinc-700 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <img src={`data:image/jpeg;base64,${tuningReferenceImage}`} className="h-10 w-auto rounded-[10px] border border-zinc-700 object-cover opacity-80" alt="ref" />
                                        <div className="text-[11px] text-zinc-300 font-bold">스타일 레퍼런스 첨부됨</div>
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
                                        onKeyDown={e => { if (e.key === 'Enter') handleSendTuningMessage(); }}
                                        placeholder="수정 요청이나 이미지 분석을 지시하세요."
                                        className="w-full bg-[#1C1C1C] border-2 border-zinc-800 rounded-[10px] pl-4 pr-12 py-3.5 text-sm text-zinc-200 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-zinc-600 shadow-sm"
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
                                className="w-full py-4 bg-[#1C1C1C] hover:bg-zinc-800 rounded-[10px] font-bold text-[13px] text-white flex items-center justify-center gap-2 transition-all shadow-sm border border-zinc-700"
                            >
                                <CheckCircle className="w-4 h-4" /> 튜닝 완료 및 닫기
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
                                <h3 className="text-white font-bold text-sm tracking-wide">마이크로 리터칭 룸</h3>
                            </div>
                            <button onClick={() => setIsEditTuningModalOpen(false)} className="text-[#a6a6a6] hover:text-white transition-colors p-1 rounded-[10px] hover:bg-zinc-800">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4 border-b border-zinc-800/50 bg-[#121212] shrink-0">
                            <div className="flex items-center gap-1.5 mb-2">
                                <Settings className="w-3.5 h-3.5 text-zinc-500" />
                                <span className="text-[11px] font-bold text-[#a6a6a6] tracking-wider uppercase">현재 편집 지시 내용</span>
                            </div>
                            <p className="text-[13px] text-emerald-300 bg-emerald-500/10 leading-relaxed max-h-[150px] overflow-y-auto custom-scrollbar whitespace-pre-wrap px-3 py-2.5 border-l-[3px] border-emerald-500 rounded-[6px]">"{String(currentTunedEditAura)}"</p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar bg-[#1A1A1A]" ref={editTuningChatRef}>
                            {editTuningChatHistory.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-[10px] px-4 py-3 text-[13px] leading-relaxed shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-zinc-700 text-white rounded-br-sm' : 'bg-[#121212] border border-zinc-800/80 text-zinc-300 rounded-tl-sm'}`}>
                                        {String(msg.content)}
                                    </div>
                                </div>
                            ))}
                            {isEditTuningLoading && (
                                <div className="flex justify-start">
                                    <div className="max-w-[85%] rounded-[10px] px-4 py-3 bg-[#121212] border border-zinc-800/80 text-zinc-400 rounded-tl-sm flex items-center gap-2 text-[13px]">
                                        <Loader2 className="w-4 h-4 animate-spin" /> 파라미터 튜닝 중...
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-4 shrink-0 bg-[#1A1A1A] flex flex-col gap-3 border-t border-zinc-800/60">
                            {editTuningReferenceImage && (
                                <div className="flex items-center justify-between bg-[#1C1C1C] p-2 rounded-[10px] border border-zinc-700 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <img src={`data:image/jpeg;base64,${editTuningReferenceImage}`} className="h-10 w-auto rounded-[10px] border border-zinc-700 object-cover opacity-80" alt="ref" />
                                        <div className="text-[11px] text-zinc-300 font-bold">리터칭 레퍼런스 첨부됨</div>
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
                                        onKeyDown={e => { if (e.key === 'Enter') handleSendEditTuningMessage(); }}
                                        placeholder="예: 낡은 부식 효과를 더 추가해줘"
                                        className="w-full bg-[#1C1C1C] border-2 border-zinc-800 rounded-[10px] pl-4 pr-12 py-3.5 text-sm text-zinc-200 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-zinc-600 shadow-sm"
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
                                className="w-full py-4 bg-[#1C1C1C] hover:bg-zinc-800 rounded-[10px] font-bold text-[13px] text-white flex items-center justify-center gap-2 transition-all shadow-sm border border-zinc-700"
                            >
                                <CheckCircle className="w-4 h-4" /> 리터칭 지시 완료
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Prompt Inspector Modal */}
            {isInspectorModalOpen && inspectionResult && (
                <div className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-[600px] bg-[#121212] border border-zinc-800 rounded-[10px] shadow-2xl flex flex-col relative overflow-hidden">
                        <div className="flex items-center justify-between p-5 border-b border-zinc-800/60 shrink-0 bg-[#1A1A1A]">
                            <div className="flex items-center gap-2.5">
                                <ScanLine className="w-5 h-5 text-zinc-300" />
                                <h3 className="text-white font-bold text-[15px] tracking-wide">프롬프트 무결성 검사</h3>
                            </div>
                            <button onClick={() => setIsInspectorModalOpen(false)} className="text-[#a6a6a6] hover:text-white transition-colors p-1 rounded-[10px] hover:bg-zinc-800">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar space-y-6 bg-[#121212]">
                            <div className={`p-5 rounded-[12px] border shadow-sm ${inspectionResult.hasConflict ? 'bg-[#1C1C1C] border-zinc-600' : 'bg-[#1C1C1C] border-zinc-700'}`}>
                                <h4 className={`text-[12px] font-bold flex items-center gap-2 mb-3 ${inspectionResult.hasConflict ? 'text-zinc-200' : 'text-[#a6a6a6]'}`}>
                                    {inspectionResult.hasConflict ? <><AlertCircle className="w-4 h-4 text-red-400" /> 논리적 충돌 감지됨</> : <><CheckCircle className="w-4 h-4 text-emerald-400" /> 무결성 검증 완료</>}
                                </h4>
                                <p className="text-[13px] text-[#a6a6a6] leading-relaxed whitespace-pre-wrap">{String(inspectionResult.analysisMessage)}</p>
                            </div>

                            {inspectionResult.hasConflict && inspectionResult.resolutions && inspectionResult.resolutions.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3 px-1">
                                        <Sparkles className="w-4 h-4 text-[#a6a6a6]" />
                                        <h4 className="text-[12px] font-bold text-zinc-300">AI 교정 방향 선택</h4>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        {inspectionResult.resolutions.map((res, idx) => (
                                            <div key={idx} onClick={() => setSelectedResolutionIndex(idx)} className={`p-4 rounded-[12px] border cursor-pointer transition-all shadow-sm ${selectedResolutionIndex === idx ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800 bg-[#1C1C1C] hover:border-zinc-600'}`}>
                                                <h5 className={`text-[12px] font-bold mb-1.5 ${selectedResolutionIndex === idx ? 'text-emerald-400' : 'text-zinc-200'}`}>{String(res.title)}</h5>
                                                <p className="text-[10px] text-[#a6a6a6] leading-relaxed break-keep">{String(res.desc)}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="p-5 bg-[#1A1A1A] border border-zinc-800/80 rounded-[12px] shadow-inner">
                                        <p className="text-[12px] font-mono text-zinc-400 leading-relaxed whitespace-pre-wrap">{String(inspectionResult.resolutions[selectedResolutionIndex]?.resolvedPromptKo)}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-5 border-t border-zinc-800/60 bg-[#1A1A1A] flex justify-end gap-3 shrink-0">
                            <button onClick={() => setIsInspectorModalOpen(false)} className="px-5 py-2.5 rounded-[8px] text-[12px] font-bold text-[#a6a6a6] hover:text-white hover:bg-zinc-800 transition-colors">
                                닫기
                            </button>
                            {inspectionResult.hasConflict && inspectionResult.resolutions && inspectionResult.resolutions.length > 0 && (
                                <button onClick={() => {
                                    const selectedRes = inspectionResult.resolutions[selectedResolutionIndex];
                                    if (inspectionResult.isEdit) setEditManualBasePrompt({ en: selectedRes.resolvedPromptEn, ko: selectedRes.resolvedPromptKo });
                                    else setManualBasePrompt({ en: selectedRes.resolvedPromptEn, ko: selectedRes.resolvedPromptKo });
                                    setIsInspectorModalOpen(false);
                                }} className="px-6 py-2.5 rounded-[8px] text-[12px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md">
                                    선택한 교정안 적용
                                </button>
                            )}
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
                                <h3 className="text-white font-bold text-[15px] tracking-wide">프롬프트로 설정 복원 (Import)</h3>
                            </div>
                            <button onClick={() => setIsImportModalOpen(false)} className="text-[#a6a6a6] hover:text-white transition-colors p-1 rounded-[10px] hover:bg-zinc-800">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 flex flex-col gap-4">
                            <p className="text-[12px] text-zinc-400 leading-relaxed">
                                이전에 생성했던 <span className="text-zinc-200 font-bold">[Base Technical Prompt]</span> 전문을 아래에 붙여넣으세요. 엔진이 텍스트를 분석하여 당시의 모든 패널 설정을 자동으로 복구합니다.
                            </p>
                            <textarea
                                value={importInputValue}
                                onChange={e => setImportInputValue(e.target.value)}
                                placeholder="[TYPECORE V17... MASTER INSTRUCTION] 으로 시작하는 프롬프트를 붙여넣으세요."
                                className="w-full h-[250px] bg-[#0A0A0A] text-[11px] font-mono text-zinc-300 p-4 rounded-[8px] border border-zinc-700 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all custom-scrollbar resize-none"
                            />
                        </div>
                        <div className="p-5 border-t border-zinc-800/60 bg-[#1A1A1A] flex justify-end gap-3 shrink-0">
                            <button onClick={() => setIsImportModalOpen(false)} className="px-5 py-2.5 rounded-[8px] text-[12px] font-bold text-[#a6a6a6] hover:text-white hover:bg-zinc-800 transition-colors">
                                취소
                            </button>
                            <button onClick={handleImportPrompt} disabled={!importInputValue.trim()} className="px-6 py-2.5 rounded-[8px] text-[12px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md disabled:opacity-50 flex items-center gap-2">
                                <Download className="w-4 h-4" /> 설정 불러오기
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default App;