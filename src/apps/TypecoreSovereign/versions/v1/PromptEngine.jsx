/* eslint-disable */
// 버전 스냅샷(아카이브): TypecoreSovereign v1. 이 파일은 의도적으로 동결되어 있어 ESLint 검사에서 제외한다.
import React, { useState, useRef, useEffect } from 'react';
import { collection, addDoc, onSnapshot, db, appId } from '../../services/firebase';
import { GEMINI_API_KEY } from '../../services/gemini';
import { useUsageGate } from '../../../../components/UsageGate';
import { useGlobal } from '../../../../context/GlobalContext';
import {
    Command, LayoutTemplate, Anchor, Brush, Settings, Activity, Sparkles, Sparkle, Sparkles as SparkleIcon,
    HelpCircle, ChevronDown, Wand, ShieldCheck, FastForward,
    Sun, Moon, Copy, CheckCircle, RefreshCcw, Loader2, Stars, Info, Save, X, UploadCloud, Upload,
    Cpu, Terminal, Heart, Share2, Download, FileUp, Menu,
    PenTool, Image as ImageIcon, Box as BoxIcon, Link, Zap as ZapPulse, ScanLine, Highlighter,
    Bot, Clapperboard, Layers3, AlignCenter,
    MessageSquare, Play, Edit3, SlidersHorizontal, Crown, Swords, Hexagon, Scale, AlertCircle, Wind
} from 'lucide-react';

/**
 * Core & RPG Specialized Typography Engine - Version 16.2
 * - Critical Anti-Scene Mandate: Strongly prevents AI (especially NanoBanana) from hallucinating 3D landscapes, people, and real architecture out of metaphorical persona descriptions.
 * - Unified Card Structure: Basic and Advanced modes now share the exact same 5 option cards. Advanced mode simply expands inner details.
 * - Added Sub(Top)+Title(Bottom) Layout preset.
 * - Added detailed brush/frayed textures and terminal styles.
 * - Smart Prompt Conflict Resolution.
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

const compressImage = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new window.Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200;
                let width = img.width; let height = img.height;
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
        };
    });
};

// --- AI DIRECTOR PERSONAS (V15.9) ---
const directorPersonas = [
    {
        id: 'sovereign',
        icon: <Crown className="w-4 h-4 text-amber-400" />,
        shortTitle: "Typecore Sovereign (왕권/신전 구조)",
        subtitle: "장엄한 RPG 권위감, 수직 기둥과 밀도",
        role: "너는 조형 의사결정 방식 'Typecore Sovereign'을 따르는 수석 아트 디렉터야. 캔버스의 공간 점유(Occupancy)나 전체 비율(Proportion)에는 절대 영향을 주지 말고, 오직 '글자 획 자체의 두께와 마감'에만 집중해. 획은 기둥이고 자간은 돌문 사이의 압력으로 설계하여 고대 왕국, 성채, 신전의 단단한 인상을 글자의 뼈대에만 부여해.",
        keywords: "monumental, imperial, sacred, dense fortress, stone gate, royal authority, high fantasy, ceremonial, serif, heavy vertical pillars",
        tone: "[장엄하고 숭고한] 캔버스를 덮어버리는 크기나 구도 묘사를 절대 배제하고, 고대 비석처럼 속이 꽉 찬 엄숙한 문체로 오직 '글자 획의 위엄과 구조적 밀도'만을 시각적 언어로 치환할 것."
    },
    {
        id: 'obsidian',
        icon: <Swords className="w-4 h-4 text-rose-400" />,
        shortTitle: "Typecore Obsidian (검/금속 파열)",
        subtitle: "전투적이고 날카로운 다크 판타지, 칼날 마감",
        role: "너는 조형 의사결정 방식 'Typecore Obsidian'을 따르는 수석 아트 디렉터야. 캔버스의 레이아웃이나 크기 확대에 관여하지 말고, 오직 '글자 획 내부의 텐션과 단부(Terminal)'에만 집중해. 획은 검신이고 끝단은 칼날, 내부 공간은 베인 상처로 설계하며 공격적인 대각선 컷과 금속성 구조감만 부여해.",
        keywords: "forged steel, blade serif, dark fantasy, weaponized typography, slash cuts, battle scar, obsidian, death knight, gothic metal, aggressive terminals",
        tone: "[전투적이고 날카로운] 전체 캔버스의 여백이나 구도에 대한 언급을 철저히 배제하고, 오직 날이 선 검이 허공을 가르듯 서늘하고 공격적인 문체로 '글자 획의 긴장감과 강철의 물성'만을 묘사할 것."
    },
    {
        id: 'aether',
        icon: <Wind className="w-4 h-4 text-sky-400" />,
        shortTitle: "Typecore Aether (신성/기운 흐름)",
        subtitle: "신비롭고 유려한 동양 판타지, 붓획과 에너지",
        role: "너는 조형 의사결정 방식 'Typecore Aether'를 따르는 수석 아트 디렉터야. 전체 비율이나 레이아웃 공간은 전혀 건드리지 말고, 오직 '글자 획의 유려한 흐름과 마감'에만 집중해. 획은 붓이면서 검이고, 내부 여백은 호흡으로 설계하여 우아하고 신비로운 곡선과 날렵한 기운을 글자 뼈대 위에만 조화롭게 배치해.",
        keywords: "mythic, ethereal, celestial, brush blade, spiritual energy, eastern fantasy, flowing stroke, divine aura, martial elegance, wind path",
        tone: "[유려하고 신비로운] 공간이나 크기에 대한 묘사는 철저히 배제하고, 기운이 흐르듯 유연하면서도 정교한 문체로 오직 '단일 글자 획의 호흡과 에너지의 궤적'만을 묘사할 것."
    },
    {
        id: 'director',
        icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
        shortTitle: "Typecore Director (상업적 완성도)",
        subtitle: "실제 적용 가능한 가독성과 완벽한 로고 구조",
        role: "너는 조형 의사결정 방식 'Typecore Director'를 따르는 수석 아트 디렉터야. 레이아웃(배열 방식)이나 캔버스 비율, 공간 점유율은 사용자가 지정한 값을 완벽히 따르며 절대 간섭하지 마. 배너 등 어느 환경에서든 깨지지 않는 시각적 균형과 확장성을 중시하여, 오직 '글자 획 자체의 상업적 완성도와 광학적 균형'만을 다듬어.",
        keywords: "production-ready, brand site typography, premium readability, commercial polish, optical balance, scalable logo, layout-safe, refined, usable, high-end game branding",
        tone: "[정교하고 실무적인] 구도나 전체 크기에 대한 설명을 완전히 배제하고, 프리미엄 브랜드 로고로서 '글자 획이 가지는 완벽한 광학적 균형과 정교함'에만 초점을 맞춘 전문적인 문체를 사용하라."
    }
];

const sliderDesc = {
    leftLabel: "무게감", rightLabel: "예리함", leftDesc: "거대 암석(Monolith) 같은 묵직하고 파괴 불가능한 실루엣", rightDesc: "공간을 베어내는 듯한 극단적인 칼날(Blade)의 예리함"
};

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

const dictionary = {
    ko: {
        cancel: "취소", save: "저장하기", loadSettings: "에디터로 설정 불러오기"
    }
};

const staticOptions = {
    layoutPresets: [
        { id: "WideTitle", name: "와이드 타이틀형", en: "Wide Title Layout" },
        { id: "CenterLogo", name: "중앙 로고형", en: "Center Logo Layout" },
        { id: "CinematicPan", name: "시네마틱 파노라마형", en: "Cinematic Panorama Layout" },
        { id: "TitleSubPre", name: "메인(상) + 서브(하)", en: "Main Title + Subtitle Layout" },
        { id: "SubTitlePre", name: "서브(상) + 메인(하)", en: "Subtitle + Main Title Layout" }
    ],
    base: [{ id: "BlackWhite", name: "블랙 / 화이트", en: "JET BLACK Background, RADIANT WHITE Subject" }, { id: "WhiteBlack", name: "화이트 / 블랙", en: "STARK WHITE Background, SOLID BLACK Subject" }],
    ratios: [
        { id: "16:9", name: "16:9 와이드", en: "16:9" },
        { id: "1:1", name: "1:1 스퀘어", en: "1:1" },
        { id: "9:16", name: "9:16 세로형", en: "9:16" },
        { id: "2.76:1", name: "2.76:1 시네마틱", en: "2.76:1" }
    ],
    occupancies: [
        { id: "40%", name: "40% 여유", en: "Generous negative space. Subject occupies 40% of the canvas." },
        { id: "50%", name: "50% 표준", en: "STRICT CENTRAL BUFFER. The subject occupies 50% of the area." },
        { id: "65%", name: "65% 크게", en: "Dominant scale. Subject occupies 65% of the area." },
        { id: "80%", name: "80% 꽉 참", en: "MAXIMUM SCALE. Subject occupies 80% hitting near the edges." }
    ],
    layouts: [
        { id: "1Line", name: "1줄 가로", en: "STRICT SINGLE HORIZONTAL LINE. ABSOLUTELY NO VERTICAL STACKING. Even for long text, maintain one linear row." },
        { id: "2Lines", name: "2줄 상하", en: "Two-tier vertical stacked composition. Split text into two balanced horizontal rows." },
        { id: "TitleSub", name: "메인(상) + 서브(하)", en: "Hierarchical composition with a large main title on top and a smaller subtitle below." },
        { id: "SubTitle", name: "서브(상) + 메인(하)", en: "Hierarchical composition with a smaller subtitle on top and a large main title below." },
        { id: "Center", name: "중앙 집중형", en: "Centralized composition, perfectly balanced and centered." }
    ],
    subTitleSizes: [
        { id: "Sub_Small", name: "작게 (기본)", en: "Subtitle is significantly smaller (approx 30% scale of main title)." },
        { id: "Sub_Medium", name: "중간 (50%)", en: "Subtitle is moderately sized (approx 50% scale of main title)." },
        { id: "Sub_Large", name: "크게 (70%)", en: "Subtitle is prominent and large (approx 70% scale of main title)." },
        { id: "Sub_Equal", name: "동일 크기", en: "Both top and bottom rows have the exact same font size and scale." }
    ],
    proportions: [
        { id: "P_Std", name: "기본형", en: "Standard balanced proportion" },
        { id: "P_Condensed", name: "압축형", en: "Condensed tall proportion" },
        { id: "P_Extended", name: "확장형", en: "Extended wide proportion" },
        { id: "P_Tall", name: "장방형", en: "Elongated vertical proportion" }
    ],
    MMOStyles: [
        { id: "Gen_Original", name: "오리지널 (Original)", en: "Monolithic stone-steel block structure" },
        { id: "Gen_Fantasy", name: "하이 판타지 (Fantasy)", en: "Elegant high-fantasy aesthetic" },
        { id: "Gen_Gothic", name: "고딕 아키텍처 (Gothic)", en: "Chiseled faceted Gothic structure" },
        { id: "Gen_Thorn", name: "럭셔리 쏜 (Thorn)", en: "Jewelry-precision thorn serifs" },
        { id: "Gen_Agony", name: "다크 리얼리즘 (Agony)", en: "Cruel realism with wedge-shaped terminals" },
        { id: "Gen_Tower", name: "타워 필라 (Tower)", en: "Vertical tower-pillar structure" },
        { id: "Epic", name: "에픽 판타지 (Epic)", en: "Epic AAA Serif royal structure" },
        { id: "Lineage_Classic", name: "리니지 (Lineage)", en: "Monolithic stone-steel block structure with heavy gravity and charred battle-worn textures" },
        { id: "Lineage_2", name: "리니지 2 (Lineage 2)", en: "Elegant high-fantasy aesthetic with elaborate sharp serifs and crystalline precision" },
        { id: "Lineage_M", name: "리니지 M (Lineage M)", en: "Chiseled faceted Gothic structure with solid metal planes for high authority" },
        { id: "Lineage_2M", name: "리니지 2M (Lineage 2M)", en: "Jewelry-precision thorn serifs and needle-sharp lines for a luxury aura" },
        { id: "Lineage_W", name: "리니지 W (Lineage W)", en: "Cruel realism with wedge-shaped 'Battlefield' terminals, claw-like hooks, and diamond-edge accents for dark realistic narrative" },
        { id: "Aion_Original", name: "아이온 (Aion)", en: "Vertical tower-pillar structure with 'Rift' gapped glyphs, English-A hybrid skeletons, and sleek aerodynamic speed terminals" },
        { id: "Aion_2", name: "아이온 2 (Aion 2)", en: "Atreia-style high-fantasy script featuring light radiance symbols, asymmetric strong terminals, elegant fluid curves, and 'Breakthrough' upward momentum" },
        { id: "BNS", name: "블레이드 & 소울 (B&S)", en: "Oriental martial arts calligraphy mixed with sharp modern vector dynamics" },
        { id: "Throne_Liberty", name: "쓰론 앤 리버티 (TL)", en: "Sophisticated medieval serif with high contrast, sharp weapon-like terminals, and elegant authority" },
        { id: "MMO_Saviors", name: "구원자들 (Saviors)", en: "Clean high-fantasy script with sharp, high-contrast vertical stems and elegant agile tension" },
        { id: "MMO_Antharas", name: "안타라스 (Antharas)", en: "Demonic cursive fantasy script with curved needle-sharp terminals and aggressive organic flow" },
        { id: "MMO_Aden", name: "아덴 대침공 (Aden)", en: "Imposing monolithic structure with sharp thorn serifs and high architectural authority" }
    ],
    MMOSilhouetteFramings: [
        { id: "Auto", name: "자동", en: "Automatic silhouette framing based on context." },
        { id: "Horizontal", name: "수평형", en: "Strict horizontal alignment framing." },
        { id: "Compressed", name: "압축형", en: "Tightly compressed inner structure framing." },
        { id: "Expanded", name: "확장형", en: "Outwardly expanded wing-like framing." },
        { id: "Emblem", name: "엠블럼형", en: "Cohesive unified emblem framing." }
    ],
    MMOSurroundingElements: [{ id: "Clean", name: "없음", en: "Clean background" }, { id: "FloatingRunes", name: "부유하는 룬", en: "Floating geometric runes" }, { id: "Shattered", name: "파괴된 파편", en: "Shattered stone and metal debris" }, { id: "RadialSpikes", name: "마법적 방사선", en: "Sharp radial spikes" }],
    stemWeights: [
        { id: "Stem_Light", name: "가벼움", en: "light razor thin stems" },
        { id: "Stem_Std", name: "표준", en: "medium balanced stems" },
        { id: "Stem_Heavy", name: "묵직함", en: "heavy thick stems" },
        { id: "Stem_Ultra", name: "초중량", en: "massive ultra heavy block stems" }
    ],
    letterConnections: [
        { id: "Conn_Indep", name: "독립형", en: "Cleanly separated independent characters" },
        { id: "Conn_Tight", name: "밀착형", en: "Tightly packed characters touching each other" },
        { id: "Conn_Partial", name: "부분 결합", en: "Partially merged and interlocked character structures" },
        { id: "Conn_Full", name: "완전 결합", en: "Fully merged characters functioning as a single continuous unit" }
    ],
    internalSpaces: [
        { id: "Space_Loose", name: "여유", en: "Spacious internal negative space" },
        { id: "Space_Std", name: "표준", en: "Standard balanced internal space" },
        { id: "Space_Dense", name: "조밀", en: "Dense internal structures with minimal gaps" },
        { id: "Space_Closed", name: "폐쇄적", en: "Closed solid internal mass with nearly zero negative space" }
    ],
    logoDegrees: [
        { id: "Logo_Low", name: "낮음", en: "Text-focused readable typography" },
        { id: "Logo_Std", name: "표준", en: "Standard game title logotype" },
        { id: "Logo_High", name: "높음", en: "Highly stylized graphic logotype" },
        { id: "Logo_Emblem", name: "엠블럼형", en: "Cohesive unified emblem structure" }
    ],
    kerningOptions: [
        { id: "Kern_Loose", name: "여유", en: "wide loose letter spacing" },
        { id: "Kern_Std", name: "표준", en: "standard balanced kerning" },
        { id: "Kern_Tight", name: "타이트", en: "tight kerning" },
        { id: "Kern_Overlap", name: "초밀착", en: "extreme high density overlapping kerning" }
    ],
    terminalStyles: [
        { id: "Term_Clean", name: "깨끗함", en: "clean flat terminals" },
        { id: "Term_Chisel", name: "치즐드", en: "sharp faceted chisel-cut terminals" },
        { id: "Term_Blade", name: "블레이드", en: "razor blade tips" },
        { id: "Term_Slab", name: "석판형", en: "heavy slab serifs" },
        { id: "Term_Flare", name: "플레어", en: "elegant flared terminals" },
        { id: "Term_Round", name: "라운드", en: "smooth rounded terminals" },
        { id: "Term_Serif", name: "클래식 세리프", en: "classic serif" },
        { id: "Term_Thorn", name: "가시 삐침", en: "sharp thorn terminals" },
        { id: "Term_Claw", name: "악마의 발톱", en: "demonic claw and hook terminals" },
        { id: "Term_BrushFray", name: "갈라진 붓끝", en: "frayed and split brush terminals showing speed and force" }
    ],
    strokeTextures: [
        { id: "Tex_Clean", name: "완전 매끄루움", en: "perfectly smooth vector edge" },
        { id: "Tex_Frayed", name: "필선 갈라짐", en: "frayed ink texture" },
        { id: "Tex_Scorched", name: "탄화된 필선", en: "scorched etched texture" },
        { id: "Tex_Subtle", name: "미세 침식", en: "subtle weathered erosion" },
        { id: "Tex_DryBrush", name: "건조한 붓결 (속도감)", en: "dry brush strokes with high-speed friction and frayed edges" }
    ],
    strokeSharpness: [
        { id: "Sharp_Soft", name: "부드러움", en: "softened edges" },
        { id: "Sharp_Std", name: "표준", en: "standard crisp vector edges" },
        { id: "Sharp_Crisp", name: "날카로움", en: "sharp clean vector lines" },
        { id: "Sharp_Razor", name: "극예리", en: "extreme razor-sharp blade edges" }
    ],
    strokeExtensions: [{ id: "Ext_None", name: "확장 없음", en: "contained terminals" }, { id: "Ext_Elegant", name: "유려한 연장", en: "elegant tapered stroke extensions" }, { id: "Ext_Razor", name: "날카로운 끝단", en: "razor-sharp elongated stroke tails" }, { id: "Ext_Infinite", name: "무한한 확장", en: "dramatic hyper-extended stroke ends" }],
    kineticVelocities: [{ id: "Vel_Static", name: "정중동", en: "zero momentum, stable" }, { id: "Vel_Swift", name: "질주", en: "dynamic forward momentum" }, { id: "Vel_Slashing", name: "격베기", en: "aggressive slashing momentum" }],
    slantAngles: [{ id: "Slant_0", name: "0도", en: "perfectly upright verticality" }, { id: "Slant_Forward", name: "15도", en: "15-degree dynamic forward slant" }, { id: "Slant_Extreme", name: "25도", en: "Aggressive 25-degree fast slant" }],
    slicingIntensities: [
        { id: "Slic_None", name: "없음", en: "perfectly intact strokes" },
        { id: "Slic_Partial", name: "부분 절단", en: "partially sliced letters, sharp cuts and incisions within characters" },
        { id: "Slic_Diagonal", name: "사선 절단", en: "aggressive diagonal slicing" },
        { id: "Slic_Deep", name: "깊은 절단", en: "deep structural severance" },
        { id: "Slic_Total", name: "전체 절단", en: "treating entire text as monolithic block with massive severance" }
    ],
    cornerStyles: [
        { id: "Corner_Right", name: "직각", en: "sharp right-angle corners" },
        { id: "Corner_Round", name: "둥근형", en: "rounded corners" },
        { id: "Corner_Wedge", name: "쐐기형", en: "wedge-shaped corners" },
        { id: "Corner_Blade", name: "칼날형", en: "blade-like pointed corners" }
    ],
    deformationDamages: [{ id: "Damage_None", name: "상태 깨끗함", en: "pristine solid form" }, { id: "Damage_Erosion", name: "미세 침식", en: "subtle weathered erosion" }, { id: "Damage_Cracking", name: "균열과 실금", en: "intricate 2D cracks" }],
    widths: [
        { id: "Narrow", name: "좁게", en: "condensed slim width" },
        { id: "Normal", name: "표준", en: "standard balanced width" },
        { id: "Wide", name: "넓게", en: "wide expansive width" },
        { id: "UltraWide", name: "초광폭", en: "ultra wide panoramic width" }
    ],
    editStrokeMods: [
        { id: "E_Stroke_None", name: "기본 획 유지", en: "Keep original stroke shapes strictly intact" },
        { id: "E_Stroke_Angled", name: "꺾임 강조 (예리함)", en: "Sharpen joints, emphasize hard angular intersections and jagged edges" },
        { id: "E_Stroke_Extended", name: "연장 라인 추가", en: "Pull and extend key stroke terminals to create sweeping flourish lines" },
        { id: "E_Stroke_Thickened", name: "두께 대비 극대화", en: "Exaggerate the contrast between thick structural masses and razor-thin connector lines" }
    ],
    editElementMods: [
        { id: "E_Elem_None", name: "기본 형태 유지", en: "Maintain original typographic structure" },
        { id: "E_Elem_Object", name: "특정 글자 오브제화", en: "Morph one or two focal letters into symbolic objects/weapons retaining readability" },
        { id: "E_Elem_Rhythm", name: "리듬감 및 바운스", en: "Inject dynamic rhythmic flow, varying baseline heights, and organic bounce" },
        { id: "E_Elem_Disconnect", name: "의도적 단절 (스텐실)", en: "Introduce intentional micro-gaps and stroke disconnections for a fragmented effect" }
    ],
    editSurfaceMods: [
        { id: "E_Surf_None", name: "기본 질감 유지", en: "Keep original flat surface" },
        { id: "E_Surf_Speed", name: "속도감 (모션 텍스처)", en: "Apply high-speed directional motion blurs and kinetic friction scratches internally" },
        { id: "E_Surf_Dry", name: "마른 질감 (부식)", en: "Apply dry, porous, and heavily weathered erosion textures" },
        { id: "E_Surf_Crystalline", name: "결정화 (파편/균열)", en: "Render surfaces with crystalline faceted fractures and shattered debris" }
    ]
};

const SectionHeader = ({ id, label, icon, theme }) => {
    return (
        <div className={`flex items-center gap-2 pl-1 text-[#a6a6a6] relative mt-4 first:mt-0 transition-all duration-700`}>
            {icon}
            <h3 className={`text-[10px] font-bold uppercase tracking-widest text-[#a6a6a6]`}>{id}. {label}</h3>
        </div>
    );
};

const DropdownControl = ({ label, icon, data = [], value, onChange, theme, disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedOption = data.find(o => o.id === value) || data[0] || { name: 'None', en: '' };
    const displayLabel = selectedOption?.name || 'None';

    return (
        <div className={`space-y-1.5 relative transition-all duration-300 ${disabled ? 'opacity-40 grayscale pointer-events-none' : ''} ${isOpen ? 'z-[9999]' : 'z-10'}`} ref={containerRef}>
            {label && (
                <div className="flex items-center justify-between pl-1">
                    <p className={`text-[10px] font-bold uppercase tracking-tighter flex items-center gap-1.5 text-[#a6a6a6]`}>
                        {icon} {label}
                    </p>
                </div>
            )}
            <button
                onClick={(e) => { e.preventDefault(); if (!disabled) setIsOpen(!isOpen); }}
                title={selectedOption?.en}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-[6px] border transition-all bg-[#121212] border-zinc-700/60 hover:border-zinc-500 outline-none shadow-sm`}
            >
                <span className={`text-[11px] font-bold truncate text-zinc-200`}>{displayLabel}</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            </button>
            {isOpen && (
                <div className={`absolute left-0 w-full mt-1 max-h-[250px] overflow-y-auto rounded-[8px] border backdrop-blur-xl z-[9999] shadow-2xl bg-[#1C1C1C] border-zinc-600 custom-scrollbar py-1`}>
                    {data.map(opt => (
                        <div
                            key={opt.id}
                            onClick={() => { onChange(opt.id); setIsOpen(false); }}
                            title={opt.en}
                            className={`px-3 py-2 mx-1 text-[11px] cursor-pointer rounded-[4px] transition-all group ${value === opt.id ? `bg-indigo-500/15 text-indigo-300 font-bold border-l-[3px] border-indigo-500` : 'text-[#a6a6a6] hover:bg-[#262626] hover:text-zinc-100 border-l-[3px] border-transparent'}`}
                        >
                            {opt.name}
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
                        {icon} {title}
                    </div>
                    {!isOpen && summary && <div className="text-[10px] text-[#a6a6a6] font-medium ml-6 truncate w-full">{summary}</div>}
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

const App = () => {
    const apiKey = GEMINI_API_KEY;
    const { ensureCanGenerate, modal: usageModal } = useUsageGate();
    const { payload, clearPayload } = useGlobal();
    const [theme, setTheme] = useState("dark");
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

    const [copiedTop, setCopiedTop] = useState(false);
    const [copiedBottom, setCopiedBottom] = useState(false);
    const [baseLangView, setBaseLangView] = useState('ko');

    // Manual Override Prompts
    const [manualBasePrompt, setManualBasePrompt] = useState(null);
    const [editManualBasePrompt, setEditManualBasePrompt] = useState(null);

    // Edit Mode States
    const [editUploadedImage, setEditUploadedImage] = useState(null);
    const [editInstruction, setEditInstruction] = useState("");
    const [editAuraPriority, setEditAuraPriority] = useState("Balanced");
    const [applyAiRecInEdit, setApplyAiRecInEdit] = useState(false);
    const [applyAutoRefine, setApplyAutoRefine] = useState(false);
    const [editAiModel, setEditAiModel] = useState("Overview");
    const [editDramaticPrompt, setEditDramaticPrompt] = useState("");
    const [editMjPrompt, setEditMjPrompt] = useState("");
    const [editCgPrompt, setEditCgPrompt] = useState("");

    const [editStrokeMod, setEditStrokeMod] = useState("E_Stroke_None");
    const [editElementMod, setEditElementMod] = useState("E_Elem_None");
    const [editSurfaceMod, setEditSurfaceMod] = useState("E_Surf_None");

    const [openCardId, setOpenCardId] = useState("layout");
    const [editOpenCardId, setEditOpenCardId] = useState("edit_retouch");

    const [isEditEnhancing, setIsEditEnhancing] = useState(false);
    const [isEditMjOptimizing, setIsEditMjOptimizing] = useState(false);
    const [isEditCgEnhancing, setIsEditCgEnhancing] = useState(false);
    const [isEditExpandingIntent, setIsEditExpandingIntent] = useState(false);

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
    const moodImageRef = useRef(null);
    const [isAnalyzingMood, setIsAnalyzingMood] = useState(false);

    // Prompt Inspector States
    const [isInspectorModalOpen, setIsInspectorModalOpen] = useState(false);
    const [isInspecting, setIsInspecting] = useState(false);
    const [inspectionResult, setInspectionResult] = useState(null);
    const [selectedResolutionIndex, setSelectedResolutionIndex] = useState(0);

    const tuningChatRef = useRef(null);
    const editTuningChatRef = useRef(null);

    const [user, setUser] = useState(null);

    const dict = dictionary.ko;

    const handleToggleCard = (id) => {
        setOpenCardId(prev => prev === id ? null : id);
    };

    const handleEditToggleCard = (id) => {
        setEditOpenCardId(prev => prev === id ? null : id);
    };

    // Options Change Detection
    useEffect(() => {
        setIsOutdated(true);
        setManualBasePrompt(null);
    }, [aiPersona, personaSliderValue, inputText, customDesignInjections, isEnhanceModeEnabled, enhanceMode, momentumActive, baseStyle, aspectRatio, occupancy, layoutType, layoutPreset, stemWeight, charWidth, charProportion, kerning, subTitleSize, scriptType, terminalStyle, strokeTexture, strokeSharpness, strokeExtension, cornerStyle, slantAngle, kineticVelocity, slicingIntensity, deformationDamage, letterConnection, internalSpace, logoDegree, mmoSilhouetteFraming, mmoSurroundingElement, isAdvancedOptionsEnabled]);

    useEffect(() => {
        setIsEditOutdated(true);
        setEditManualBasePrompt(null);
    }, [aiPersona, personaSliderValue, editInstruction, editUploadedImage, editAuraPriority, applyAiRecInEdit, applyAutoRefine, isEnhanceModeEnabled, enhanceMode, momentumActive, layoutType, subTitleSize, mmoSilhouetteFraming, mmoSurroundingElement, kineticVelocity, slantAngle, deformationDamage, slicingIntensity, editStrokeMod, editElementMod, editSurfaceMod, cornerStyle]);

    // Auth/Firestore init은 프로젝트 글로벌 Auth 플로우에서 처리 — 앱 로컬 signin 제거

    useEffect(() => {
        if (tuningChatRef.current) tuningChatRef.current.scrollTop = tuningChatRef.current.scrollHeight;
    }, [tuningChatHistory, isTuningLoading]);

    useEffect(() => {
        if (editTuningChatRef.current) editTuningChatRef.current.scrollTop = editTuningChatRef.current.scrollHeight;
    }, [editTuningChatHistory, isEditTuningLoading]);

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

    const handleScriptPresetChange = (presetId) => {
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
    };

    const handleLayoutPresetChange = (presetId) => {
        setLayoutPreset(presetId);
        if (presetId === "WideTitle") {
            setAspectRatio("16:9"); setLayoutType("1Line"); setOccupancy("50%"); setMmoSilhouetteFraming("Horizontal");
        } else if (presetId === "CenterLogo") {
            setAspectRatio("1:1"); setLayoutType("Center"); setOccupancy("65%"); setMmoSilhouetteFraming("Auto");
        } else if (presetId === "CinematicPan") {
            setAspectRatio("2.76:1"); setLayoutType("1Line"); setOccupancy("40%"); setMmoSilhouetteFraming("Expanded");
        } else if (presetId === "TitleSubPre") {
            setAspectRatio("16:9"); setLayoutType("TitleSub"); setOccupancy("50%"); setMmoSilhouetteFraming("Horizontal");
        } else if (presetId === "SubTitlePre") {
            setAspectRatio("16:9"); setLayoutType("SubTitle"); setOccupancy("50%"); setMmoSilhouetteFraming("Horizontal");
        }
    };

    const handleReset = () => {
        setDynamicOptions({ MMOStyles: [], strokeTextures: [], deformationDamages: [], terminalStyles: [], stemWeights: [], strokeSharpness: [], writingSpeeds: [], widths: [], kerningOptions: [], strokeExtensions: [], kineticVelocities: [], slicingIntensities: [], editStrokeMods: [], editElementMods: [], editSurfaceMods: [] });
        setCustomDesignInjections(""); setDramaticPrompt("");
        setMjOptimizedPrompt(""); setCgEnhancedPrompt(""); setEnhanceMode("refine"); setMomentumActive(false); setIsAdvancedOptionsEnabled(false);
        setAuraPriority("Balanced"); setPersonaSliderValue(50); setBase64Image(null); setAiRecSummary(null); setAiPersona('sovereign');
        handleScriptPresetChange("Lineage_M");
        setLetterConnection("Conn_Indep"); setInternalSpace("Space_Std"); setLogoDegree("Logo_Std"); setSubTitleSize("Sub_Small");
        setManualBasePrompt(null);
        setTuningReferenceImage(null);
        setEditTuningReferenceImage(null);
    };

    const handleAiRecommendation = async () => {
        if (isRecommending) return;
        setIsRecommending(true);
        const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];

        const prompt = `Act as an Elite Art Director for a Dark Fantasy RPG typography project.
    [YOUR PERSONA]: ${persona.role}
    [YOUR TONE]: ${persona.tone}
    [KEYWORDS YOU FAVOR]: ${persona.keywords}
    [CURRENT SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)}
    
    [USER INPUT]: Text: "${inputText}"
    [DETAILED DESIGN INTENT / AURA]: "${customDesignInjections || "None"}"
    [CRITICAL INSTRUCTION]: You MUST base your setup heavily on the "[DETAILED DESIGN INTENT / AURA]" and your Persona. Reflect the [CURRENT SUB-TRAIT FOCUS] deeply in your choices.
    IMPORTANT: You must create ENTIRELY NEW CUSTOM OPTIONS that perfectly manifest the user's aura. Do not just use existing vague IDs.
    For each typography property, you MUST return a JSON object with this exact structure: { "id": "Unique_English_ID", "name": "Korean Display Name", "en": "English technical prompt description" }
    
    Return JSON: { 
      "summary": { "title": "한글 제목", "reason": "추천 사유" }, 
      "setStyle": { "id": "...", "name": "...", "en": "..." }, 
      "setWeight": { "id": "...", "name": "...", "en": "..." }, 
      "setTerminal": { "id": "...", "name": "...", "en": "..." }, 
      "setTexture": { "id": "...", "name": "...", "en": "..." }, 
      "setKinetic": { "id": "...", "name": "...", "en": "..." }, 
      "setSharpness": { "id": "...", "name": "...", "en": "..." }, 
      "setKerning": { "id": "...", "name": "..." , "en": "..."} 
    }`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.7 } })
            });
            const data = await response.json();
            const res = extractJson(data.candidates[0].content.parts[0].text);

            if (res?.summary) setAiRecSummary(res.summary);
            if (res?.setStyle) setScriptType(updateDynamic('MMOStyles', res.setStyle));
            if (res?.setWeight) setStemWeight(updateDynamic('stemWeights', res.setWeight));
            if (res?.setTerminal) setTerminalStyle(updateDynamic('terminalStyles', res.setTerminal));
            if (res?.setTexture) setStrokeTexture(updateDynamic('strokeTextures', res.setTexture));
            if (res?.setKinetic) setKineticVelocity(updateDynamic('kineticVelocities', res.setKinetic));
            if (res?.setSharpness) setStrokeSharpness(updateDynamic('strokeSharpness', res.setSharpness));
            if (res?.setKerning) setKerning(updateDynamic('kerningOptions', res.setKerning));

            setIsAdvancedOptionsEnabled(true);
        } catch (e) { console.error(e); } finally { setIsRecommending(false); }
    };

    const copyToClipboard = (text, type) => {
        const textArea = document.createElement("textarea");
        textArea.value = text || '';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            if (type === 'top') {
                setCopiedTop(true);
            } else {
                setCopiedBottom(true);
            }
            setTimeout(() => {
                setCopiedTop(false);
                setCopiedBottom(false);
            }, 2000);
        } catch (err) {
            console.error("Failed to copy", err);
        }
        document.body.removeChild(textArea);
    };

    const processFile = (file) => {
        const reader = new FileReader();
        reader.onloadend = () => { setBase64Image(reader.result.split(',')[1]); };
        reader.readAsDataURL(file);
    };

    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => { setIsDragging(false); };
    const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file && file.type.startsWith('image/')) processFile(file); };

    const handleEditDrop = (e) => {
        e.preventDefault(); setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => setEditUploadedImage(reader.result);
            reader.readAsDataURL(file);
        }
    };
    const handleEditImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setEditUploadedImage(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleMoodImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setIsAnalyzingMood(true);

        try {
            // 업로드된 모든 이미지를 Base64로 변환하여 배열로 준비 (여러 장 동시 처리)
            const base64Promises = files.map(file => {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve({ inlineData: { mimeType: file.type, data: reader.result.split(',')[1] } });
                    reader.readAsDataURL(file);
                });
            });

            const imageParts = await Promise.all(base64Promises);
            const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];

            const systemPrompt = `You are a legendary Typography Art Director specialized in STRICTLY 2D FLAT BLACK-AND-WHITE SILHOUETTE typography.
      [YOUR PERSONA]: ${persona.role}
      [YOUR TONE]: ${persona.tone}
      
      Analyze the provided reference image(s). They may include a single background, or a mix of backgrounds, characters, and props.
      Synthesize their core worldview, narrative tension, and character traits.
      
      [CRITICAL RULE FOR TYPOGRAPHY AURA]: 
      The resulting typography MUST be a pure 2D flat silhouette. ABSOLUTELY NO textures, NO lighting, NO 3D, NO materials, NO gradient colors.
      Focus ONLY on structural morphology: stroke weight, edge sharpness, tension, flow, structural proportion, dynamic momentum, and rhythm.
      
      Return ONLY a 2-3 sentence Korean description (Aura) detailing how the structural lines and shapes of the typography should be formed to match the combined mood of the images.
      Example: "거대한 배경의 압도적인 스케일과 캐릭터의 예리한 무기 형태를 결합합니다. 묵직하고 단단한 사각 기둥 뼈대를 바탕으로, 획의 끝단에 베어내는 듯한 날카로운 사선 텐션을 주입하여 질감이 배제된 서늘한 2D 실루엣을 완성합니다."`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: systemPrompt },
                            ...imageParts // 변환된 모든 이미지를 프롬프트에 주입
                        ]
                    }],
                    generationConfig: { temperature: 0.7 }
                })
            });
            const data = await response.json();
            const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (resultText) {
                setCustomDesignInjections(resultText.trim());
            }
        } catch (error) {
            console.error("Mood analysis failed:", error);
        } finally {
            setIsAnalyzingMood(false);
            if (moodImageRef.current) moodImageRef.current.value = "";
        }
    };

    const handleTuningImageUpload = (e, isEdit) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result.split(',')[1];
                if (isEdit) setEditTuningReferenceImage(base64);
                else setTuningReferenceImage(base64);
            };
            reader.readAsDataURL(file);
        }
    };

    const openTuningRoom = () => {
        setCurrentTunedAura(customDesignInjections);
        setTuningChatHistory([{ role: 'assistant', content: "안녕하세요! 현재 구체화된 아이디어를 바탕으로 어떤 부분들을 더 추가하거나 수정하고 싶으신가요?\n원하시는 방향을 자유롭게 말씀해 주세요! (예: '조금 더 차갑고 날카로운 느낌으로 바꿔줘')" }]);
        setIsTuningModalOpen(true);
    };

    const openEditTuningRoom = () => {
        setCurrentTunedEditAura(editInstruction);
        setEditTuningChatHistory([{ role: 'assistant', content: "이미지 편집 튜닝룸입니다!\n현재 작성된 지시사항을 바탕으로 원하시는 수정 방향을 대화하듯 말씀해 주세요.\n(예: '지금 묘사에서 부식된 효과를 조금 더 세게 강조해줘')" }]);
        setIsEditTuningModalOpen(true);
    };

    const handleSendTuningMessage = async () => {
        if (!tuningInputValue.trim() && !tuningReferenceImage) return;
        const userMsg = tuningInputValue.trim() || "이미지 스타일을 분석해줘.";
        setTuningInputValue("");
        setTuningChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsTuningLoading(true);

        const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];

        const systemPrompt = `You are a Typography Art Director and a friendly assistant. [YOUR PERSONA]: ${persona.role}
    [CURRENT SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)}
    [Current Aura]: "${currentTunedAura}"
    [User Request]: "${userMsg}"
    
    IF a reference image is provided: Visually analyze its typography morphology (weight, terminals, texture, layout, kinetics). You MUST return 'updateOptions' to change the editor settings to match the image perfectly. Create ENTIRELY NEW CUSTOM OPTIONS for properties that manifest the image's aura exactly.
    Task: Update the [Current Aura] to reflect the [User Request] and visual analysis. Make it professional. APPLY YOUR PERSONA'S VIBE AND KEYWORDS: ${persona.keywords}. Reflect the [CURRENT SUB-TRAIT FOCUS].
    Write a short, friendly reply in Korean explaining what you changed and analyzed. Tone: ${persona.tone}.
    Return JSON strictly in this format: { 
      "newAura": "The updated aura string", 
      "replyMessage": "Your friendly reply in Korean",
      "updateOptions": {
         "setStyle": { "id": "...", "name": "...", "en": "..." }, 
         "setWeight": { "id": "...", "name": "...", "en": "..." }, 
         "setTerminal": { "id": "...", "name": "...", "en": "..." }, 
         "setTexture": { "id": "...", "name": "...", "en": "..." }, 
         "setKinetic": { "id": "...", "name": "...", "en": "..." }, 
         "setSharpness": { "id": "...", "name": "...", "en": "..." }, 
         "setKerning": { "id": "...", "name": "...", "en": "..." }
      } // Include updateOptions ONLY if a reference image is analyzed or structural change is requested.
    }`;

        const parts = [{ text: "Process the tuning request. Analyze the reference image if provided." }];
        if (tuningReferenceImage) {
            parts.push({ inlineData: { mimeType: "image/jpeg", data: tuningReferenceImage } });
        }

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json", temperature: 0.7 } })
            });
            const data = await response.json(); const result = extractJson(data.candidates?.[0]?.content?.parts?.[0]?.text);
            if (result?.newAura && result?.replyMessage) {
                setCurrentTunedAura(result.newAura);
                setTuningChatHistory(prev => [...prev, { role: 'assistant', content: result.replyMessage }]);
                if (result.updateOptions) {
                    const opts = result.updateOptions;
                    if (opts.setStyle) setScriptType(updateDynamic('MMOStyles', opts.setStyle));
                    if (opts.setWeight) setStemWeight(updateDynamic('stemWeights', opts.setWeight));
                    if (opts.setTerminal) setTerminalStyle(updateDynamic('terminalStyles', opts.setTerminal));
                    if (opts.setTexture) setStrokeTexture(updateDynamic('strokeTextures', opts.setTexture));
                    if (opts.setKinetic) setKineticVelocity(updateDynamic('kineticVelocities', opts.setKinetic));
                    if (opts.setSharpness) setStrokeSharpness(updateDynamic('strokeSharpness', opts.setSharpness));
                    if (opts.setKerning) setKerning(updateDynamic('kerningOptions', opts.setKerning));
                    setIsAdvancedOptionsEnabled(true);
                }
            }
        } catch (e) { setTuningChatHistory(prev => [...prev, { role: 'assistant', content: "오류가 발생했습니다." }]); } finally { setIsTuningLoading(false); setTuningReferenceImage(null); }
    };

    const handleSendEditTuningMessage = async () => {
        if (!editTuningInputValue.trim() && !editTuningReferenceImage) return;
        const userMsg = editTuningInputValue.trim() || "이미지 스타일을 분석해줘.";
        setEditTuningInputValue("");
        setEditTuningChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsEditTuningLoading(true);

        const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];

        const systemPrompt = `You are an expert Typography Art Director adjusting an Image-to-Image edit instruction. [YOUR PERSONA]: ${persona.role}
    [CURRENT SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)}
    [Current Edit Direction]: "${currentTunedEditAura}"
    [User Request]: "${userMsg}"
    
    IF a reference image is provided: Visually analyze its typography morphology. Return 'updateOptions' to change the micro-refinement settings (Stroke Mod, Element Mod, Surface Mod, Kinetic, Damage) to perfectly match the image. Create ENTIRELY NEW CUSTOM OPTIONS for these properties if needed.
    Task: Update the [Current Edit Direction] integrating the user's request and image analysis. Maintain a professional tone while applying your persona's vibe and keywords: ${persona.keywords}. Reflect the [CURRENT SUB-TRAIT FOCUS].
    Write a friendly response in Korean explaining the update. Tone: ${persona.tone}.
    Return JSON strictly: { 
      "newAura": "Updated instruction string", 
      "replyMessage": "Friendly response in Korean",
      "updateOptions": {
         "setEditStroke": { "id": "...", "name": "...", "en": "..." }, 
         "setEditElement": { "id": "...", "name": "...", "en": "..." }, 
         "setEditSurface": { "id": "...", "name": "...", "en": "..." }, 
         "setKinetic": { "id": "...", "name": "...", "en": "..." }, 
         "setDamage": { "id": "...", "name": "...", "en": "..." }
      } // Include updateOptions ONLY if a reference image is analyzed or structural change is requested.
    }`;

        const parts = [{ text: "Process the tuning request. Analyze the reference image if provided." }];
        if (editTuningReferenceImage) {
            parts.push({ inlineData: { mimeType: "image/jpeg", data: editTuningReferenceImage } });
        }

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json", temperature: 0.7 } })
            });
            const data = await response.json(); const result = extractJson(data.candidates?.[0]?.content?.parts?.[0]?.text);
            if (result?.newAura && result?.replyMessage) {
                setCurrentTunedEditAura(result.newAura);
                setEditTuningChatHistory(prev => [...prev, { role: 'assistant', content: result.replyMessage }]);
                if (result.updateOptions) {
                    const opts = result.updateOptions;
                    if (opts.setEditStroke) setEditStrokeMod(updateDynamic('editStrokeMods', opts.setEditStroke));
                    if (opts.setEditElement) setEditElementMod(updateDynamic('editElementMods', opts.setEditElement));
                    if (opts.setEditSurface) setEditSurfaceMod(updateDynamic('editSurfaceMods', opts.setEditSurface));
                    if (opts.setKinetic) setKineticVelocity(updateDynamic('kineticVelocities', opts.setKinetic));
                    if (opts.setDamage) setDeformationDamage(updateDynamic('deformationDamages', opts.setDamage));
                }
            }
        } catch (e) { setEditTuningChatHistory(prev => [...prev, { role: 'assistant', content: "오류가 발생했습니다." }]); } finally { setIsEditTuningLoading(false); setEditTuningReferenceImage(null); }
    };

    const handleExpandIntent = async () => {
        if (!customDesignInjections.trim() || isExpandingIntent) return;
        setIsExpandingIntent(true);
        const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];

        const systemPrompt = `[YOUR PERSONA]: ${persona.role}\n[YOUR TONE]: ${persona.tone}\n[CURRENT SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)}\nExpand the user's keyword into a detailed, highly professional morphological design direction. NO MATERIALS / NO LIGHTING. FOCUS ON PURE FORM. 2-3 sentences. Return ONLY the expanded text in Korean.`;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: customDesignInjections }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.7 } })
            });
            const data = await response.json(); if (data.candidates?.[0]?.content?.parts?.[0]?.text) setCustomDesignInjections(data.candidates[0].content.parts[0].text.trim());
        } catch (e) { } finally { setIsExpandingIntent(false); }
    };

    const handleEditExpandIntent = async () => {
        if (!editInstruction.trim() || isEditExpandingIntent) return;
        setIsEditExpandingIntent(true);
        const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];

        const systemPrompt = `[YOUR PERSONA]: ${persona.role}\n[YOUR TONE]: ${persona.tone}\n[CURRENT SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)}\nExpand the user's short edit keyword into a detailed, structural Image-to-Image morphological edit instruction incorporating the sub-trait focus. NO 3D/MATERIALS. Keep it 2D flat. Focus on stroke edges, dynamics, and destruction. Return only the expanded text in Korean.`;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: editInstruction }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.7 } })
            });
            const data = await response.json(); if (data.candidates?.[0]?.content?.parts?.[0]?.text) setEditInstruction(data.candidates[0].content.parts[0].text.trim());
        } catch (e) { } finally { setIsEditExpandingIntent(false); }
    };

    const runInspector = async (isEdit = false) => {
        setIsInspecting(true);
        setSelectedResolutionIndex(0); // 결과 모달을 띄울 때 선택 초기화
        const { baseTechnicalEn } = isEdit ? buildEditPrompts() : buildPrompts();

        const systemPrompt = `You are the 'Prompt Integrity Inspector' for an elite Dark Fantasy RPG typography generation engine.
    Your task is to analyze the user's [Base Technical Prompt] for logical conflicts that could confuse the AI image generator.

    [CRITICAL OCCUPANCY RULE]: 
    The specified "SPATIAL MANDATE" (Occupancy/Margin, e.g., 50%) is the ABSOLUTE boundary. 
    If the Persona, Aura, or any descriptive text includes size-enlarging adjectives (e.g., 'massive', 'giant', 'epic scale', 'huge', '거대한', '압도적인 크기'), you MUST rewrite them to describe 'density', 'thickness', or 'heavy mass' (e.g., 'dense', 'heavy structure', '고밀도의', '묵직한 덩어리감') instead. Descriptive adjectives MUST NEVER override or conflict with the Occupancy margin.

    Common conflicts include:
    - A Director Persona (like 'flawless balance') clashing with a Modifier (like 'Wild/Controlled Chaos' forcing asymmetry and distortion).
    - High Occupancy (e.g., 100%) but requesting many 'surrounding elements'.
    - Aura text that contradicts the chosen morphology settings (e.g., aura says "smooth curves" but terminal is set to "Chiseled/Blade").

    Analyze the prompt. If there is a logical clash or redundancy:
    1. "hasConflict": true
    2. "analysisMessage": Professional Korean explanation of what is conflicting and why it causes issues. (Start with '⚠️ [충돌 감지]')
    3. "resolutions": Provide EXACTLY TWO different resolution paths as objects in an array.
       - Path 1 (Aura Priority): Resolve conflicts by prioritizing the user's [USER DESIGN DIRECTION / AURA]. Adjust the conflicting mechanical options or Persona constraints to perfectly match the user's intended Aura.
       - Path 2 (System Priority): Resolve conflicts by strictly enforcing the selected system settings and [DIRECTOR PERSONA MANDATE]. Reinterpret or dial down the user's Aura so it fits the mechanical rules perfectly.
       Each object must have:
       - "title": "Korean Title (e.g., '🎨 아우라(의도) 최우선 반영' or '⚙️ 시스템 설정 및 페르소나 유지')"
       - "desc": "Brief Korean description of what was modified (e.g., '사용자의 의도를 살리기 위해 페르소나의 제한을 일부 완화했습니다.')."
       - "resolvedPromptEn": "The full revised prompt in English"
       - "resolvedPromptKo": "The full revised prompt translated to highly professional Korean"

    If the prompt is completely logical and synergistic:
    1. "hasConflict": false
    2. "analysisMessage": Professional Korean praise of the synergy. Explain why this combination will work well. (Start with '✅ [무결성 완벽]')
    3. "resolutions": []

    Return STRICTLY a valid JSON object: { "hasConflict": boolean, "analysisMessage": "string", "resolutions": [ { "title": "string", "desc": "string", "resolvedPromptEn": "string", "resolvedPromptKo": "string" } ] }`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: baseTechnicalEn }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json", temperature: 0.2 } })
            });
            const data = await response.json();
            const result = extractJson(data.candidates[0].content.parts[0].text);
            setInspectionResult({ ...result, isEdit });
            setIsInspectorModalOpen(true);
        } catch (e) {
            console.error("Inspector error", e);
        } finally {
            setIsInspecting(false);
        }
    };

    const buildPrompts = () => {
        const styleList = [...staticOptions.MMOStyles, ...(dynamicOptions.MMOStyles || [])];
        const weightList = [...staticOptions.stemWeights, ...(dynamicOptions.stemWeights || [])];
        const kerningList = [...staticOptions.kerningOptions, ...(dynamicOptions.kerningOptions || [])];
        const terminalList = [...staticOptions.terminalStyles, ...(dynamicOptions.terminalStyles || [])];
        const sharpnessList = [...staticOptions.strokeSharpness, ...(dynamicOptions.strokeSharpness || [])];
        const textureList = staticOptions.strokeTextures;
        const kineticList = [...staticOptions.kineticVelocities, ...(dynamicOptions.kineticVelocities || [])];
        const slantList = staticOptions.slantAngles;
        const destList = staticOptions.deformationDamages;

        // EN Strings
        const styleEn = getOptionEn(styleList, scriptType);
        const weightEn = getOptionEn(weightList, stemWeight);
        const kerningEn = getOptionEn(kerningList, kerning);
        const terminalEn = getOptionEn(terminalList, terminalStyle);
        const sharpnessEn = getOptionEn(sharpnessList, strokeSharpness);
        const textureEn = getOptionEn(textureList, strokeTexture);
        const widthEn = getOptionEn(staticOptions.widths, charWidth);
        const proportionEn = getOptionEn(staticOptions.proportions, charProportion);
        const extensionEn = getOptionEn(staticOptions.strokeExtensions, strokeExtension);
        const cornerList = [...staticOptions.cornerStyles, ...(dynamicOptions.cornerStyles || [])];
        const cornerEn = getOptionEn(cornerList, cornerStyle);
        const kineticEn = getOptionEn(kineticList, kineticVelocity);
        const slantEn = getOptionEn(slantList, slantAngle);
        const destructionEn = getOptionEn(destList, deformationDamage);
        const slicingEn = getOptionEn(staticOptions.slicingIntensities, slicingIntensity);
        const occupancyEn = getOptionEn(staticOptions.occupancies, occupancy);

        const letterConnEn = getOptionEn(staticOptions.letterConnections, letterConnection);
        const internalSpaceEn = getOptionEn(staticOptions.internalSpaces, internalSpace);
        const logoDegreeEn = getOptionEn(staticOptions.logoDegrees, logoDegree);

        const mmoSilhouetteEn = getOptionEn(staticOptions.MMOSilhouetteFramings, mmoSilhouetteFraming);
        const mmoSurroundEn = getOptionEn(staticOptions.MMOSurroundingElements, mmoSurroundingElement);

        // KO Strings
        const styleKo = getOptionName(styleList, scriptType);
        const weightKo = getOptionName(weightList, stemWeight);
        const kerningKo = getOptionName(kerningList, kerning);
        const terminalKo = getOptionName(terminalList, terminalStyle);
        const sharpnessKo = getOptionName(sharpnessList, strokeSharpness);
        const textureKo = getOptionName(textureList, strokeTexture);
        const widthKo = getOptionName(staticOptions.widths, charWidth);
        const proportionKo = getOptionName(staticOptions.proportions, charProportion);
        const extensionKo = getOptionName(staticOptions.strokeExtensions, strokeExtension);
        const cornerKo = getOptionName(cornerList, cornerStyle);
        const kineticKo = getOptionName(kineticList, kineticVelocity);
        const slantKo = getOptionName(slantList, slantAngle);
        const destructionKo = getOptionName(destList, deformationDamage);
        const occupancyKo = getOptionName(staticOptions.occupancies, occupancy);

        const letterConnKo = getOptionName(staticOptions.letterConnections, letterConnection);
        const internalSpaceKo = getOptionName(staticOptions.internalSpaces, internalSpace);
        const logoDegreeKo = getOptionName(staticOptions.logoDegrees, logoDegree);

        const mmoSilhouetteKo = getOptionName(staticOptions.MMOSilhouetteFramings, mmoSilhouetteFraming);
        const mmoSurroundKo = getOptionName(staticOptions.MMOSurroundingElements, mmoSurroundingElement);

        const genreSpecEn = `- Letter Connection: ${letterConnEn}\n- Internal Space: ${internalSpaceEn}\n- Logo Degree: ${logoDegreeEn}\n- Silhouette Framing: ${mmoSilhouetteEn}\n- Surrounding FX: ${mmoSurroundEn}\n- Dynamics: Slicing(${slicingEn})`;
        const genreSpecKo = `- 글자 결합: ${letterConnKo}\n- 내부 공간: ${internalSpaceKo}\n- 로고화 정도: ${logoDegreeKo}\n- 실루엣 프레이밍: ${mmoSilhouetteKo}\n- 주변 장식: ${mmoSurroundKo}\n- 동세/절단: ${getOptionName(staticOptions.slicingIntensities, slicingIntensity)}`;

        const subSizeEn = getOptionEn(staticOptions.subTitleSizes, subTitleSize);
        const subSizeKo = getOptionName(staticOptions.subTitleSizes, subTitleSize);

        let layoutEn = "";
        let layoutKo = "";
        if (layoutType === "1Line") {
            layoutEn = "[LAYOUT MANDATE]: STRICT SINGLE HORIZONTAL ROW. ABSOLUTELY NO VERTICAL STACKING. Prevent multi-line arrangements.";
            layoutKo = "[레이아웃 강제]: 엄격한 1줄 가로 배열. 세로 적층 절대 금지.";
        } else if (layoutType === "2Lines") {
            layoutEn = "[LAYOUT MANDATE]: Balanced Two-tier vertical stacked composition. Split text into two horizontal rows.";
            layoutKo = "[레이아웃 강제]: 균형잡힌 2줄 세로 적층 배열.";
        } else if (layoutType === "TitleSub") {
            layoutEn = `[LAYOUT MANDATE]: STRICT Hierarchical composition. Main title on top, subtitle below. CRITICAL: The subtitle MUST be visibly smaller. [SUBTITLE SCALE]: ${subSizeEn}`;
            layoutKo = `[레이아웃 강제]: 엄격한 계층적 구도. 큰 메인 타이틀이 상단, 서브 타이틀이 하단 배치. 서브타이틀은 메인 타이틀과 크기가 같으면 안 되며 확연히 작아야 함. [서브타이틀 크기]: ${subSizeKo}`;
        } else if (layoutType === "SubTitle") {
            layoutEn = `[LAYOUT MANDATE]: STRICT Hierarchical composition. Subtitle on top, main title below. CRITICAL: The subtitle MUST be visibly smaller. [SUBTITLE SCALE]: ${subSizeEn}`;
            layoutKo = `[레이아웃 강제]: 엄격한 계층적 구도. 서브 타이틀이 상단, 큰 메인 타이틀이 하단 배치. 서브타이틀은 메인 타이틀과 크기가 같으면 안 되며 확연히 작아야 함. [서브타이틀 크기]: ${subSizeKo}`;
        } else if (layoutType === "Center") {
            layoutEn = "[LAYOUT MANDATE]: Centralized composition, perfectly balanced and centered layout.";
            layoutKo = "[레이아웃 강제]: 완벽한 균형을 갖춘 중앙 집중형 구도.";
        }

        const isMultiLine = layoutType === "2Lines" || layoutType === "TitleSub" || layoutType === "SubTitle";
        const isHierarchical = layoutType === "TitleSub" || layoutType === "SubTitle";

        const proportionSafetyEn = isMultiLine
            ? `[PROPORTION SAFETY]: Force individual character proportion to ${proportionEn} and width to ${widthEn}. Strictly PROHIBIT vertical stretching of individual letters. Allow vertical stacking of rows as per layout mandate.`
            : `[PROPORTION SAFETY]: Force character proportion to ${proportionEn} and width to ${widthEn}. Expand horizontally. Strictly PROHIBIT vertical stretching or 'compressed vertical aspect ratios' to prevent vertical text stacking. Maintain strong horizontal gravity.`;

        const proportionSafetyKo = isMultiLine
            ? `[비율 안전장치]: 개별 글자 비율을 ${proportionKo}(으)로, 자폭을 ${widthKo}(으)로 강제. 개별 글자의 세로 늘리기를 엄격히 금지. 레이아웃 지시에 따른 줄(Row) 단위의 세로 적층은 허용.`
            : `[비율 안전장치]: 글자 비율을 ${proportionKo}(으)로, 자폭을 ${widthKo}(으)로 강제. 가로 확장. 세로 적층을 막기 위해 '세로로 늘리기'나 '압축된 세로 종횡비' 엄격히 금지. 강력한 수평 중력 유지.`;

        const userAuraEn = customDesignInjections ? `\n[USER DESIGN DIRECTION / AURA]: ${customDesignInjections}` : "";
        const userAuraKo = customDesignInjections ? `\n[유저 디자인 방향성 / 아우라]: ${customDesignInjections}` : "";

        const subTraitContextEn = `\n[SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)}`;
        const subTraitContextKo = `\n[세부 속성 집중도]: ${getSliderTextKo(personaSliderValue)}`;

        const priorityOverrideEn = auraPriority === "AuraMax" ? `\n[CRITICAL OVERRIDE]: The Aura MUST completely override base settings if conflicted.` : "";
        const priorityOverrideKo = auraPriority === "AuraMax" ? `\n[치명적 덮어쓰기]: 사용자의 아우라(Aura)가 다른 모든 기본 설정을 무시하고 최우선 적용되어야 합니다.` : "";

        let modifierBoostEn = "";
        let modifierBoostKo = "";

        if (isEnhanceModeEnabled) {
            if (enhanceMode === 'refine') {
                modifierBoostEn = `\n[REFINEMENT SYSTEM]: ENABLED.\n- MAXIMIZE STRUCTURAL PERFECTION: Maintain the original text and base skeleton. Refine optical balance, stroke contrast, spacing, and terminal structures to the highest commercial quality.\n- READABILITY PRIORITY: Suppress unnecessary deformation. Enhance both legibility and morphological density simultaneously.\n- TENSION & POLISH: Strengthen the tension of strokes and meticulously polish edges, serifs, and cuts.`;
                modifierBoostKo = `\n[정제 시스템]: 활성화됨.\n- 조형적 완결성 극대화: 원래 텍스트와 기본 골격을 최대한 유지하되, 광학 균형, 획 대비, 간격, 단부 구조를 정교하게 다듬어 최종 완성도를 높인다.\n- 가독성 우선: 불필요한 변형은 억제하고, 가독성과 조형적 밀도를 동시에 향상시킨다.\n- 텐션 및 정교화: 획의 긴장감을 강화하고 단부, 세리프, 절단면을 정교하게 다듬어 평범한 모양을 프리미엄 수준으로 끌어올린다.`;
            } else if (enhanceMode === 'variation') {
                modifierBoostEn = `\n[VARIATION SYSTEM]: ENABLED.\n- EXPAND STYLE CANDIDATES: Maintain core readability and base structure, but explore diverse morphological interpretations.\n- STRUCTURAL VARIATION: Allow modifications in proportion, stroke contrast, connection methods, and terminal treatments.\n- COUNTERFORM REINTERPRETATION: Reinterpret internal counterforms and stroke flows. Alter the cohesiveness between letters.\n- PRESERVE LOGIC: Ensure the design does not collapse completely; maintain legibility and structural logic while changing the overall impression.`;
                modifierBoostKo = `\n[변주 시스템]: 활성화됨.\n- 스타일 후보군 확장: 텍스트의 핵심 읽힘과 기본 구조는 유지하되, 다양한 조형적 해석을 탐색한다.\n- 구조적 변주: 비례, 획 대비, 결합 방식, 단부 처리의 변형을 허용한다.\n- 카운터폼 재해석: 내부 카운터폼과 획의 흐름을 재해석하고, 글자 간 응집도를 다르게 가져간다.\n- 논리 유지: 형태가 완전히 무너지지 않도록 가독성과 구조 논리를 유지하되, 전체적인 인상은 새롭게 바꾼다.`;
            } else if (enhanceMode === 'deconstruct') {
                modifierBoostEn = `\n[DECONSTRUCTION SYSTEM]: ENABLED.\n- RADICAL STYLE EXPERIMENT: Maintain minimal recognizability of the text, but disassemble and rearrange strokes.\n- FRAGMENTATION & MERGE: Allow cutting, deleting, overlapping, and fusing of structures to create a new 2D morphological language.\n- REDESIGN COUNTERFORMS: Rebuild counterforms and reassemble fragmented connections. Can form cohesive emblem-like structures.\n- LOGICAL DECONSTRUCTION: This is not simple noise. Create highly original silhouettes through logical deconstruction and reconstruction, enhancing asymmetry and tension.`;
                modifierBoostKo = `\n[해체 시스템]: 활성화됨.\n- 급진적 스타일 실험: 텍스트의 최소한의 인식 가능성은 유지하되, 획을 분해하고 재배열한다.\n- 파편화 및 융합: 구조의 절단, 생략, 중첩, 융합을 허용하여 새로운 2D 조형 언어를 만든다.\n- 카운터폼 재설계: 카운터폼을 재설계하고 파편화된 연결부를 재조립하여 응집형 엠블럼 구조를 형성할 수 있다.\n- 논리적 해체: 단순한 노이즈가 아닌 논리적인 해체와 재구성을 통해 독창적인 실루엣을 만들고 비대칭과 긴장감을 강화한다.`;
            }
        }

        const momentumBoostEn = momentumActive ? `\n[COMBAT DYNAMICS ENGINE]: ENABLED.\n- FORCE VECTOR INJECTION: Every form must have a clear direction vector showing where it is being pushed/pulled.\n- PRIMARY STRIKE AXIS: Establish one main strike axis traversing the entire structure. All distortion occurs along this axis.\n- STRUCTURAL DEFORMATION: Actual physical deformation required (compression, stretch, shear, displacement). No simple effects.\n- IMPACT ZONES: Clearly define 'Impact Zones' where force originates and where it erupts.\n- ASYMMETRIC FORCE DISTRIBUTION: Distribute force unevenly (heavy on one side, torn/light on the other).\n- SLASH IS NOT DECORATION: Slashing marks must actually cut through the structural mass.\n- MOTION TRAIL LOGIC: Motion trails must act as structural remnants of previous positions.\n- NO FAKE FX: Strictly prohibit light, particles, and magic FX. Express speed and force purely through structural deformation.` : "";
        const momentumBoostKo = momentumActive ? `\n[전투 동세 엔진]: 활성화됨.\n- 힘의 벡터 주입: 모든 형태는 어디로 밀리거나 당겨지는지 명확한 방향 벡터를 가져야 함.\n- 주 타격 축: 전체 구조를 관통하는 하나의 주 타격 축 설정. 모든 왜곡은 이 축을 따라 발생.\n- 구조적 변형: 단순 효과가 아닌 실제 물리적 변형(압축, 인장, 전단, 변위) 필수.\n- 임팩트 존: 힘이 시작되고 폭발하는 '임팩트 존' 명확히 정의.\n- 비대칭 힘 분배: 힘을 불균형하게 분배 (한쪽은 무겁고, 다른 쪽은 기어지거나 가볍게).\n- 베기(Slash)는 장식이 아님: 베기 자국은 실제 구조적 덩어리를 잘라내야 함.\n- 모션 트레일 논리: 모션 트레일은 이전 위치의 구조적 잔해 역할을 해야 함.\n- 가짜 FX 금지: 빛, 파티클, 마법 FX 엄격히 금지. 속도와 힘을 오직 구조적 변형으로만 표현.` : "";

        const bgDescEn = getOptionEn(staticOptions.base, baseStyle) || "JET BLACK Background";
        const bgDescKo = baseStyle === 'BlackWhite' ? "완전한 검은색 배경" : "완전한 흰색 배경";

        let personaSpecificInstructionEn = "";
        let personaSpecificInstructionKo = "";
        const activePersonaData = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];

        if (activePersonaData.id === 'sovereign') {
            personaSpecificInstructionEn = "\n- Structural Law: Build each character like an ancient fortress gate. Use heavy vertical pillars, controlled serif flares, and strict horizontal stability. Prioritize density, legibility, architectural balance, and premium RPG presence. Avoid excessive distortion, chaotic cracks, cartoon styling, or modern sci-fi shapes.";
            personaSpecificInstructionKo = "\n- 구조적 법칙: 각 글자를 고대 요새의 성문처럼 구축하십시오. 묵직한 수직 기둥, 절제된 세리프 확장, 엄격한 수평적 안정성을 사용하십시오. 획의 밀도, 가독성, 건축적 균형, 프리미엄 RPG의 존재감을 우선시하십시오. 과도한 왜곡, 혼란스러운 균열, 캐주얼한 형태를 피하십시오.";
        } else if (activePersonaData.id === 'obsidian') {
            personaSpecificInstructionEn = "\n- Structural Law: Treat vertical stems as forged steel slabs and terminals as lethal blade edges. Use controlled slash cuts, compressed tension, sharp serif extensions, and battle-forged silhouettes. Preserve strong readability while giving the typography a dangerous, premium combat presence.";
            personaSpecificInstructionKo = "\n- 구조적 법칙: 수직 획을 단조된 강철판으로, 끝단을 치명적인 칼날로 취급하십시오. 절제된 사선 절단, 압축된 긴장감, 날카로운 세리프 확장을 사용하십시오. 강력한 가독성을 유지하면서 타이포그래피에 위험하고 프리미엄한 전투적 존재감을 부여하십시오.";
        } else if (activePersonaData.id === 'aether') {
            personaSpecificInstructionEn = "\n- Structural Law: Combine disciplined brush anatomy with blade-like precision, flowing energy rhythm, and elegant spiritual tension. Use dynamic stroke contrast, graceful terminals, and controlled negative space to create a premium eastern-fantasy presence.";
            personaSpecificInstructionKo = "\n- 구조적 법칙: 절제된 붓획 구조와 칼날 같은 정밀함, 흐르는 에너지 리듬, 우아한 영적 긴장감을 결합하십시오. 역동적인 획 두께 대비, 우아한 마감, 절제된 여백을 사용하여 프리미엄 동양 판타지의 존재감을 만드십시오.";
        } else if (activePersonaData.id === 'director') {
            personaSpecificInstructionEn = "\n- Structural Law: Prioritize clear readability, optical balance, scalable silhouette, refined details, and strong brand usability across desktop, mobile, banners, and promotional pages. Keep the fantasy mood powerful but controlled. Avoid over-rendering, unreadable deformation, and excessive ornamentation.";
            personaSpecificInstructionKo = "\n- 구조적 법칙: 데스크탑, 모바일, 배너 전반에 걸쳐 명확한 가독성, 광학적 균형, 확장 가능한 실루엣, 정제된 디테일, 강력한 브랜드 사용성을 우선시하십시오. 판타지 분위기를 강력하지만 통제된 상태로 유지하십시오. 과도한 렌더링, 읽을 수 없는 왜곡, 지나친 장식을 피하십시오.";
        }

        const personaMandateEn = `\n[DIRECTOR PERSONA MANDATE - ${activePersonaData.shortTitle}]:\n- Role: ${activePersonaData.role}\n- Focus: Apply '${activePersonaData.keywords}' aesthetics heavily.${personaSpecificInstructionEn}`;
        const personaMandateKo = `\n[디렉터 페르소나 명령 - ${activePersonaData.shortTitle}]:\n- 역할: ${activePersonaData.role}\n- 집중: '${activePersonaData.keywords}' 미학을 강력하게 적용하십시오.${personaSpecificInstructionKo}`;

        const morphologyBodyEn = `${weightEn}, ${kerningEn}, Width(${widthEn}), Specific Proportion(${proportionEn}).`;
        const morphologyDetailEn = isAdvancedOptionsEnabled ? `\n- Detail: ${terminalEn}, ${sharpnessEn}, Texture(${textureEn}), Extension(${extensionEn}), Corner(${cornerEn}).\n${genreSpecEn}\n- Damage: ${destructionEn}\n- Slant: ${slantEn}` : "";

        const morphologyBodyKo = `${weightKo}, ${kerningKo}, 자폭(${widthKo}), 특정 비율(${proportionKo}).`;
        const morphologyDetailKo = isAdvancedOptionsEnabled ? `\n- 디테일: ${terminalKo}, ${sharpnessKo}, 질감(${textureKo}), 확장(${extensionKo}), 코너(${cornerKo}).\n${genreSpecKo}\n- 파괴: ${destructionKo}\n- 기울기: ${slantKo}` : "";

        const generatedBaseEn = `[MASTER TYPO SPECS V16.2 - RPG CORE] Text: "${inputText}". ${userAuraEn}${subTraitContextEn}
[CORE PHILOSOPHY & MANDATE]:
1. DO NOT render standard flat fonts. Prohibit 'Standard System Font' aesthetics.
2. Render characters as epic logotypes with strong structural integrity.
[STRICT MONOCHROME]: NO COLORS, ZERO CHROMA, STRICT BLACK AND WHITE ONLY.
[2D MANDATE]: STRICTLY FLAT GRAPHIC SILHOUETTE. ZERO DEPTH. NO 3D render. ABSOLUTELY NO LANDSCAPES, NO REALISTIC ARCHITECTURE, NO PEOPLE, NO SCENES.
[SPATIAL MANDATE]: ${occupancyEn}
${layoutEn}${personaMandateEn}
${proportionSafetyEn}
[MORPHOLOGY]: 
- Theme: ${isAdvancedOptionsEnabled ? styleEn : `MMO Base Theme`}.
- Body: ${morphologyBodyEn}${morphologyDetailEn}
[MOMENTUM]: ${kineticEn}. ${priorityOverrideEn}
[ENVIRONMENT]: AR ${aspectRatio}, ${bgDescEn}.${modifierBoostEn}${momentumBoostEn}`.trim();

        const generatedBaseKo = `[마스터 타이포 스펙 V16.2 - RPG 코어] 텍스트: "${inputText}". ${userAuraKo}${subTraitContextKo}
[핵심 철학 및 지시사항]:
1. 일반 폰트 렌더링 금지. '표준 시스템 폰트' 미학 배제.
2. 강력한 구조적 무결성을 지닌 에픽 로고타입으로 각 캐릭터 렌더링.
[엄격한 단색화]: 색상 금지, 채도 0, 순수 흑백으로만 구성.
[2D 강제]: 완벽한 평면 그래픽 실루엣. 깊이감 제로. 3D 렌더링 금지. 풍경, 실제 건축물, 인물, 배경 묘사 절대 금지.
[공간 할당]: ${occupancyKo}
${layoutKo}${personaMandateKo}
${proportionSafetyKo}
[형태학]: 
- 테마: ${isAdvancedOptionsEnabled ? styleKo : `MMO 기본 테마`}.
- 뼈대: ${morphologyBodyKo}${morphologyDetailKo}
[동세]: ${kineticKo}. ${priorityOverrideKo}
[환경]: 화면비 ${aspectRatio}, ${bgDescKo}.${modifierBoostKo}${momentumBoostKo}`.trim();

        const baseTechnicalEn = manualBasePrompt?.en || generatedBaseEn;
        const baseTechnicalKo = manualBasePrompt?.ko || generatedBaseKo;

        const overview = `[ V16.2 RPG TYPOGRAPHY OVERVIEW ]
■ SUBJECT: "${inputText}"
■ DIRECTOR PERSONA: ${activePersonaData.shortTitle}
■ DESIGN AURA: ${customDesignInjections || "기본 셋업"}

[ CORE SETTINGS ]
• Theme: ${styleKo}
• Weight: ${weightKo}
• Terminal: ${terminalKo}
• Sharpness: ${sharpnessKo}
• Dynamics: ${kineticKo}

[ LAYOUT & CANVAS ]
• Layout: ${getOptionName(staticOptions.layouts, layoutType).split(' ')[0]}
• Proportion & Width: ${getOptionName(staticOptions.proportions, charProportion)} / ${getOptionName(staticOptions.widths, charWidth)}
• Aspect Ratio & Occupancy: ${aspectRatio} / ${occupancyKo}

[ MODIFIERS ]
• Enhance Mode: ${isEnhanceModeEnabled ? (enhanceMode === 'refine' ? 'REFINE' : enhanceMode === 'variation' ? 'VARIATION' : 'DECONSTRUCT') : 'OFF'}
• Combat Dynamics: ${momentumActive ? "ON" : "OFF"}`;

        let cgTextInstruction = `Render "${inputText}"`;
        if (inputText.includes('\n')) {
            const lines = inputText.split('\n');
            if (layoutType === "TitleSub") {
                cgTextInstruction = `Render the following 2 lines EXACTLY in this vertical order:\n- [TOP ROW]: "${lines[0]}" (Main Title - Huge/Prominent)\n- [BOTTOM ROW]: "${lines[1] || ''}" (Subtitle - explicitly smaller scale)`;
            } else if (layoutType === "SubTitle") {
                cgTextInstruction = `Render the following 2 lines EXACTLY in this vertical order:\n- [TOP ROW]: "${lines[0]}" (Subtitle - explicitly smaller scale)\n- [BOTTOM ROW]: "${lines[1] || ''}" (Main Title - Huge/Prominent)`;
            } else if (layoutType === "2Lines") {
                cgTextInstruction = `Render the following 2 lines EXACTLY in this vertical order with equal scale:\n- [TOP ROW]: "${lines[0]}"\n- [BOTTOM ROW]: "${lines[1] || ''}"`;
            }
        }

        const chatGPTOutput = `Act as an expert Typography Engine. ${cgTextInstruction} in a 2D flat silhouette graphic. 
1. Constraints: Pure black and white, ${occupancyEn}. 
2. Layout & Proportion: ${layoutEn} Force ${proportionEn}. Prevent individual vertical stretching.
3. Directing Aura: ${customDesignInjections} ${subTraitContextEn}. 
4. Modifiers: ${isEnhanceModeEnabled ? enhanceMode + ' mode. ' : ''}${momentumActive ? 'Combat kinetics.' : ''}
5. Details: ${isAdvancedOptionsEnabled ? `Texture(${textureEn}), Damage(${destructionEn}), Slicing(${slicingEn}), Corner(${cornerEn}), Slant(${slantEn})` : 'Aura Driven'}`;

        const midjourneyOutput = `${inputText.replace(/\n/g, ' ')} typography logotype, ${customDesignInjections}, MMO RPG theme, 2D flat graphic silhouette, pure black and white, ${isEnhanceModeEnabled ? (enhanceMode === 'deconstruct' ? 'iconic structural silhouette, morphological fun, ' : (enhanceMode === 'variation' ? 'diverse structural interpretations, ' : 'sharp architectural lines, ')) : ''}${momentumActive ? 'extreme dynamic momentum, ' : ''}${isAdvancedOptionsEnabled ? textureEn + ', ' + destructionEn + ', ' + slicingEn + ', ' + cornerEn + ', ' : ''}${isMultiLine ? (isHierarchical ? `hierarchical multi-line composition, explicitly smaller subtitle scale (${subSizeEn}), ` : 'balanced multi-line composition, ') : 'strictly single horizontal row, '}${proportionEn}, wide panoramic span, ${occupancy.replace('%', ' percent')} occupancy, --ar ${aspectRatio.replace(':', ':')} --no 3d, realistic background, landscape, people, font, color, texture, compressed vertical aspect ratio`;

        let finalOut = overview;
        if (aiModel === 'NanoBanana') finalOut = dramaticPrompt || "Click Build first.";
        else if (aiModel === 'ChatGPT') finalOut = cgEnhancedPrompt || chatGPTOutput;
        else if (aiModel === 'Midjourney') finalOut = mjOptimizedPrompt || midjourneyOutput;

        return { baseTechnicalEn, baseTechnicalKo, outputContent: finalOut, chatGPTOutput, midjourneyOutput, overview };
    };

    const buildEditPrompts = () => {
        const instruction = editInstruction || "원본 이미지의 형태를 유지하며 디테일을 보완합니다.";
        let priorityOverrideEn = "";
        let priorityOverrideKo = "";
        if (editAuraPriority === "AuraMax" || editAuraPriority === "Balanced" || editAuraPriority === "OptionMax") {
            priorityOverrideEn = `\n[AURA OVERRIDE SAFETY LIMIT]:\nCore silhouette MUST remain recognizable. Structural deformation limited to 15% maximum. Aura can influence detail, NOT structure replacement.`;
            priorityOverrideKo = `\n[아우라 덮어쓰기 안전 한계]:\n핵심 실루엣은 반드시 인식 가능해야 합니다. 구조적 변형은 최대 15%로 제한. 아우라는 디테일에만 영향을 미치며 구조 자체를 대체할 수 없습니다.`;
        }

        const subTraitContextEn = `\n[SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)}`;
        const subTraitContextKo = `\n[세부 속성 집중도]: ${getSliderTextKo(personaSliderValue)}`;

        const aiRecInstructionEn = applyAiRecInEdit ? "\n[AI RECOMMENDATION ENABLED]: AI will actively recommend and apply optimal micro-details." : "";
        const aiRecInstructionKo = applyAiRecInEdit ? "\n[AI 추천 활성화됨]: AI가 최적의 마이크로 디테일을 적극적으로 추천하고 적용합니다." : "";

        const autoRefineInstructionEn = applyAutoRefine ? `\n\n[SHAPE NORMALIZATION PROTOCOL]\nIf the base image appears rough, sketched, or geometrically imperfect, you MUST auto-correct its foundational structure:\n1. Stroke Consistency: Mathematically unify stroke weights and styling logic.\n2. Silhouette Clarity: Sharpen outer boundaries to create a premium 2D vector-level form.` : "";
        const autoRefineInstructionKo = applyAutoRefine ? `\n\n[형태 정규화 프로토콜]\n원본 이미지가 거칠거나 스케치 형태, 기하학적으로 불완전할 경우 기본 구조를 자동 교정합니다:\n1. 획 일관성: 획 두께와 스타일 논리를 수학적으로 통일.\n2. 실루엣 선명도: 외부 경계를 선명하게 다듬어 프리미엄 2D 벡터 수준의 형태로 만듦.` : "";

        const mmoSilhouetteEn = getOptionEn(staticOptions.MMOSilhouetteFramings, mmoSilhouetteFraming);
        const mmoSurroundEn = getOptionEn(staticOptions.MMOSurroundingElements, mmoSurroundingElement);
        const kineticEn = getOptionEn(staticOptions.kineticVelocities, kineticVelocity);
        const slantEn = getOptionEn(staticOptions.slantAngles, slantAngle);
        const destructionEn = getOptionEn(staticOptions.deformationDamages, deformationDamage);
        const slicingEn = getOptionEn(staticOptions.slicingIntensities, slicingIntensity);
        const cornerEn = getOptionEn(staticOptions.cornerStyles, cornerStyle);

        const mmoSilhouetteKo = getOptionName(staticOptions.MMOSilhouetteFramings, mmoSilhouetteFraming);
        const mmoSurroundKo = getOptionName(staticOptions.MMOSurroundingElements, mmoSurroundingElement);
        const kineticKo = getOptionName(staticOptions.kineticVelocities, kineticVelocity);
        const slantKo = getOptionName(staticOptions.slantAngles, slantAngle);
        const destructionKo = getOptionName(staticOptions.deformationDamages, deformationDamage);
        const cornerKo = getOptionName(staticOptions.cornerStyles, cornerStyle);

        const editStrokeEn = getOptionEn(staticOptions.editStrokeMods, editStrokeMod);
        const editElementEn = getOptionEn(staticOptions.editElementMods, editElementMod);
        const editSurfaceEn = getOptionEn(staticOptions.editSurfaceMods, editSurfaceMod);

        const editStrokeKo = getOptionName(staticOptions.editStrokeMods, editStrokeMod);
        const editElementKo = getOptionName(staticOptions.editElementMods, editElementMod);
        const editSurfaceKo = getOptionName(staticOptions.editSurfaceMods, editSurfaceMod);

        const subSizeEn = getOptionEn(staticOptions.subTitleSizes, subTitleSize);
        const subSizeKo = getOptionName(staticOptions.subTitleSizes, subTitleSize);

        let layoutEn = "";
        let layoutKo = "";
        if (layoutType === "1Line") {
            layoutEn = "[LAYOUT MANDATE]: STRICT SINGLE HORIZONTAL ROW. ABSOLUTELY NO VERTICAL STACKING. Prevent multi-line arrangements.";
            layoutKo = "[레이아웃 강제]: 엄격한 1줄 가로 배열. 세로 적층 절대 금지.";
        } else if (layoutType === "2Lines") {
            layoutEn = "[LAYOUT MANDATE]: Balanced Two-tier vertical stacked composition. Split text into two horizontal rows.";
            layoutKo = "[레이아웃 강제]: 균형잡힌 2줄 세로 적층 배열.";
        } else if (layoutType === "TitleSub") {
            layoutEn = `[LAYOUT MANDATE]: STRICT Hierarchical composition. Main title on top, subtitle below. CRITICAL: The subtitle MUST be visibly smaller. [SUBTITLE SCALE]: ${subSizeEn}`;
            layoutKo = `[레이아웃 강제]: 엄격한 계층적 구도. 큰 메인 타이틀이 상단, 서브 타이틀이 하단 배치. 서브타이틀은 메인 타이틀과 크기가 같으면 안 되며 확연히 작아야 함. [서브타이틀 크기]: ${subSizeKo}`;
        } else if (layoutType === "SubTitle") {
            layoutEn = `[LAYOUT MANDATE]: STRICT Hierarchical composition. Subtitle on top, main title below. CRITICAL: The subtitle MUST be visibly smaller. [SUBTITLE SCALE]: ${subSizeEn}`;
            layoutKo = `[레이아웃 강제]: 엄격한 계층적 구도. 서브 타이틀이 상단, 큰 메인 타이틀이 하단 배치. 서브타이틀은 메인 타이틀과 크기가 같으면 안 되며 확연히 작아야 함. [서브타이틀 크기]: ${subSizeKo}`;
        } else if (layoutType === "Center") {
            layoutEn = "[LAYOUT MANDATE]: Centralized composition, perfectly balanced and centered layout.";
            layoutKo = "[레이아웃 강제]: 완벽한 균형을 갖춘 중앙 집중형 구도.";
        }

        const isMultiLine = layoutType === "2Lines" || layoutType === "TitleSub" || layoutType === "SubTitle";
        const isHierarchical = layoutType === "TitleSub" || layoutType === "SubTitle";

        const proportionLockEn = isMultiLine
            ? `4. PROPORTION LOCK: Maintain the multi-line hierarchical layout. Prohibit vertical stretching of individual letters. [SUBTITLE SCALE IF APPLICABLE]: ${subSizeEn}`
            : `4. PROPORTION LOCK: Maintain horizontal panoramic frame. Prohibit vertical stacking.`;
        const proportionLockKo = isMultiLine
            ? `4. 비율 고정: 다중 줄 계층형 레이아웃을 유지. 개별 글자의 세로 늘리기 금지. [해당 시 서브타이틀 크기]: ${subSizeKo}`
            : `4. 비율 고정: 가로 파노라마 프레임 유지. 세로 적층 금지.`;

        const activePersonaData = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];
        const personaMandateEn = `\n[DIRECTOR PERSONA MANDATE - ${activePersonaData.shortTitle}]:\n- Role: ${activePersonaData.role}\n- Focus: Apply '${activePersonaData.keywords}' aesthetics.`;
        const personaMandateKo = `\n[디렉터 페르소나 명령 - ${activePersonaData.shortTitle}]:\n- 역할: ${activePersonaData.role}\n- 집중: '${activePersonaData.keywords}' 미학을 적용하십시오.`;

        const generatedBaseEn = `[IMAGE-TO-IMAGE TYPOGRAPHY EDIT V16.2 - RPG CORE]
[CORE MANDATE]:
1. BASE LOCK: Use the provided base image as the exact structural foundation. Do not reinvent the entire word.
2. STRICT MONOCHROME: Maintain Pure Black background, White subject.
3. STRICT 2D: Flat graphic silhouette only. ZERO 3D. ABSOLUTELY NO LANDSCAPES, NO REALISTIC ARCHITECTURE, NO PEOPLE, NO SCENES.
${proportionLockEn}

[EDIT DIRECTION / AURA]: ${instruction}${subTraitContextEn}
${personaMandateEn}

[FOCUSED MICRO-REFINEMENTS]:
- Stroke/Edge Mod: ${editStrokeEn}
- Element/Rhythm Mod: ${editElementEn}
- Surface/Texture Mod: ${editSurfaceEn}

[GLOBAL SHAPE & DYNAMICS]:
- Framing: ${mmoSilhouetteEn}
- FX & Surround: ${mmoSurroundEn}
- Kinetic Force: ${kineticEn}, Slant: ${slantEn}
- Corner Style: ${cornerEn}
- Damage/Erosion: ${destructionEn}
${priorityOverrideEn}${aiRecInstructionEn}${autoRefineInstructionEn}`.trim();

        const generatedBaseKo = `[이미지-투-이미지 타이포그래피 편집 V16.2 - RPG 코어]
[핵심 명령]:
1. 베이스 고정: 제공된 원본 이미지를 정확한 구조적 기반으로 사용. 전체 단어를 새로 디자인하지 말 것.
2. 엄격한 단색화: 순수 검은색 배경, 흰색 피사체 유지.
3. 엄격한 2D: 평면 그래픽 실루엣 전용. 3D 제로. 풍경, 실제 건축물, 인물, 배경 묘사 절대 금지.
${proportionLockKo}

[EDIT DIRECTION / AURA]: ${instruction}${subTraitContextKo}
${personaMandateKo}

[집중 마이크로-리터칭]:
- 획/엣지 수정: ${editStrokeKo}
- 요소/리듬 수정: ${editElementKo}
- 표면/질감 수정: ${editSurfaceKo}

[글로벌 형태 및 동세]:
- 프레이밍: ${mmoSilhouetteKo}
- FX & 장식: ${mmoSurroundKo}
- 물리적 힘: ${kineticKo}, 기울기: ${slantKo}
- 코너 성격: ${cornerKo}
- 파괴/침식: ${destructionKo}
${priorityOverrideKo}${aiRecInstructionKo}${autoRefineInstructionKo}`.trim();

        const baseTechnicalEn = editManualBasePrompt?.en || generatedBaseEn;
        const baseTechnicalKo = editManualBasePrompt?.ko || generatedBaseKo;

        const overview = `[ V16.2 I2I EDIT OVERVIEW ]
■ EDIT DIRECTION: ${instruction}
■ DIRECTOR PERSONA: ${activePersonaData.shortTitle}

[ MICRO REFINEMENTS ]
• Stroke Mod: ${editStrokeKo}
• Element Mod: ${editElementKo}
• Surface Mod: ${editSurfaceKo}

[ SHAPE & DYNAMICS ]
• Silhouette: ${mmoSilhouetteKo}
• Kinetic/Slant: ${kineticKo} / ${slantKo}
• Damage: ${destructionKo}

[ SETTINGS ]
• AI Recommendation: ${applyAiRecInEdit ? "ON" : "OFF"}
• Sketch Auto-Refine: ${applyAutoRefine ? "ON" : "OFF"}`;

        let cgEditTextInstruction = `Redraw the provided image. STRICTLY MAINTAIN basic shape, pure black/white monochrome, and 2D flat graphic style.`;
        if (inputText.includes('\n') && isMultiLine) {
            const lines = inputText.split('\n');
            if (layoutType === "TitleSub") {
                cgEditTextInstruction += `\nEnsure the text is placed exactly as:\n- [TOP ROW]: "${lines[0]}" (Main Title)\n- [BOTTOM ROW]: "${lines[1] || ''}" (Subtitle - explicitly smaller scale)`;
            } else if (layoutType === "SubTitle") {
                cgEditTextInstruction += `\nEnsure the text is placed exactly as:\n- [TOP ROW]: "${lines[0]}" (Subtitle - explicitly smaller scale)\n- [BOTTOM ROW]: "${lines[1] || ''}" (Main Title)`;
            }
        }

        const chatGPTOutput = `Act as an expert Typography Engine. ${cgEditTextInstruction}
1. Focused Edits: ${instruction} ${subTraitContextEn}. 
2. Retouching: Stroke(${editStrokeEn}), Element(${editElementEn}), Surface(${editSurfaceEn}).
3. Dynamics: ${kineticEn}, ${destructionEn}, ${slicingEn}, Corner(${cornerEn}).
4. Layout Constraint: Keep horizontal ratio.`;

        const midjourneyOutput = `[UPLOAD BASE IMAGE AS REFERENCE] typography logotype, image-to-image edit, exact structural foundation, pure black and white, 2D flat graphic silhouette, ${instruction}, ${editStrokeEn}, ${editElementEn}, ${editSurfaceEn}, ${kineticEn}, ${destructionEn}, ${slicingEn}, ${cornerEn}, ${isMultiLine ? (isHierarchical ? `hierarchical multi-line composition, explicitly smaller subtitle scale (${subSizeEn}), ` : 'balanced multi-line composition, ') : 'strictly single horizontal row, '} wide panoramic span, --ar 16:9 --iw 1.5 --style raw --no 3d, realistic background, landscape, people, font, color, compressed vertical aspect ratio`;

        let finalOut = overview;
        if (editAiModel === 'NanoBanana') finalOut = editDramaticPrompt || "Click Build first.";
        else if (editAiModel === 'ChatGPT') finalOut = editCgPrompt || chatGPTOutput;
        else if (editAiModel === 'Midjourney') finalOut = editMjPrompt || midjourneyOutput;

        return { baseTechnicalEn, baseTechnicalKo, outputContent: finalOut };
    };

    const requestDramaticEnhancement = async () => {
        if (isEnhancing) return;
        setIsEnhancing(true);
        const { baseTechnicalEn } = buildPrompts();
        const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];

        const systemPrompt = `You are a visionary Art Director for "Nano Banana 2". Transform technical specs into a morphological masterpiece. 
    [YOUR PERSONA]: ${persona.role} 
    [YOUR WRITING TONE]: ${persona.tone} 
    [KEYWORDS]: ${persona.keywords} 
    [CURRENT SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)} 
    PROHIBIT 3D and MATERIALS.
    [CRITICAL ANTI-SCENE RULE]: NEVER describe landscapes, skies, realistic 3D buildings, environments, or people. The metaphors (e.g., fortress, blades) are strictly for 2D FLAT LETTER SHAPES. The output must remain a flat typography logotype on a solid background.
    [CRITICAL LAYOUT RULE]: Never suggest "compressed vertical aspect ratio". Strictly follow the [PROPORTION SAFETY] and [LAYOUT MANDATE] defined in the user prompt. If a subtitle is present, emphasize the size contrast heavily so they are not rendered at the same size. Describe horizontal expansion and heavy grounded gravity.
    Output format: \n1. # ARCHITECTURAL EVOLUTION \n2. # KINETIC ORGANIC ANATOMY \n3. # THE UNBOUNDED BOUNDARY \n4. # THE SUPREME COMMAND: Consolidated elite prompt string.`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: baseTechnicalEn }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.7 } })
            });
            const data = await response.json(); setDramaticPrompt(data.candidates?.[0]?.content?.parts?.[0]?.text || "");
            setIsOutdated(false);
        } catch (err) { } finally { setIsEnhancing(false); }
    };

    const requestEditDramaticEnhancement = async () => {
        if (isEditEnhancing) return;
        setIsEditEnhancing(true);
        const { baseTechnicalEn } = buildEditPrompts();
        const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];

        const systemPrompt = `You are a visionary Art Director for Nano Banana 2 Image-to-Image generation.
    [YOUR PERSONA]: ${persona.role} 
    [YOUR WRITING TONE]: ${persona.tone} 
    [KEYWORDS]: ${persona.keywords} 
    PROHIBIT 3D and MATERIALS. \n[INTERPRETATION LIMIT]: Do NOT reinterpret the structure. Only enhance existing geometry. \n[CRITICAL ANTI-SCENE RULE]: NEVER describe landscapes, skies, realistic 3D buildings, environments, or people. The metaphors (e.g., fortress, blades) are strictly for 2D FLAT LETTER SHAPES. The output must remain a flat typography logotype on a solid background. \n[CRITICAL LAYOUT RULE]: Never suggest "compressed vertical aspect ratio". Strictly follow the [PROPORTION SAFETY] and [LAYOUT MANDATE] defined in the user prompt. If a subtitle is present, emphasize the size contrast heavily so they are not rendered at the same size. Describe horizontal expansion and heavy grounded gravity. \nOutput format: \n1. # ARCHITECTURAL EVOLUTION \n2. # KINETIC ORGANIC ANATOMY \n3. # THE UNBOUNDED BOUNDARY \n4. # THE SUPREME COMMAND: Consolidated elite I2I prompt string.`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: baseTechnicalEn }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.7 } })
            });
            const data = await response.json(); setEditDramaticPrompt(data.candidates?.[0]?.content?.parts?.[0]?.text || "");
            setIsEditOutdated(false);
        } catch (err) { } finally { setIsEditEnhancing(false); }
    };

    const requestMidjourneyOptimization = async (isEdit = false) => {
        if (isEdit) { if (isEditMjOptimizing) return; setIsEditMjOptimizing(true); } else { if (isMjOptimizing) return; setIsMjOptimizing(true); }
        const { baseTechnicalEn, midjourneyOutput } = isEdit ? buildEditPrompts() : buildPrompts();
        const currentAR = isEdit ? "16:9" : aspectRatio;

        const systemPrompt = `Convert specs into Midjourney V6 tag string. Use ::2 for critical traits. Force 2D flat silhouette. 
End exactly with this exact suffix (DO NOT omit the --ar parameter): " --ar ${currentAR} --iw 1.5 --style raw --no 3d, volumetric, perspective, emboss, bevel, shadow, color, standard font, texture, glowing shader, material"`;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: baseTechnicalEn }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.2 } })
            });
            const data = await response.json();
            if (isEdit) { setEditMjPrompt(data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || midjourneyOutput); setIsEditOutdated(false); }
            else { setMjOptimizedPrompt(data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || midjourneyOutput); setIsOutdated(false); }
        } catch (err) { } finally { if (isEdit) setIsEditMjOptimizing(false); else setIsMjOptimizing(false); }
    };

    const requestChatGPTEnhancement = async (isEdit = false) => {
        if (isEdit) { if (isEditCgEnhancing) return; setIsEditCgEnhancing(true); } else { if (isCgEnhancing) return; setIsCgEnhancing(true); }
        const { baseTechnicalEn, chatGPTOutput } = isEdit ? buildEditPrompts() : buildPrompts();
        const systemPrompt = `Create DALL-E 3 instructions for this typography prompt. Bullet points for edits. Strictly forbid 3D/materials. Output ONLY the final prompt text.`;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: baseTechnicalEn }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.7 } })
            });
            const data = await response.json();
            if (isEdit) { setEditCgPrompt(data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || chatGPTOutput); setIsEditOutdated(false); }
            else { setCgEnhancedPrompt(data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || chatGPTOutput); setIsOutdated(false); }
        } catch (err) { } finally { if (isEdit) setIsEditCgEnhancing(false); else setIsCgEnhancing(false); }
    };

    const renderAiOutputBox = (modelState, content, isEdit = false, outdatedFlag = false) => {
        const isPlaceholderContent = content.startsWith('[ V16.2 RPG TYPOGRAPHY OVERVIEW ]') || content.startsWith('[ V16.2 I2I EDIT OVERVIEW ]');

        return (
            <div className={`rounded-[10px] p-6 sm:p-8 border bg-[#121212] border-zinc-800 relative transition-all duration-500`}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 flex-wrap w-full sm:w-auto">
                        <p className="text-[12px] font-bold uppercase text-[#a6a6a6] flex items-center gap-2"><Terminal className="w-4 h-4" /> {modelState} Output</p>
                        {outdatedFlag && !isPlaceholderContent && (
                            <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20" title="옵션이 변경되었습니다. 최신 프롬프트를 위해 다시 생성해주세요.">
                                <AlertCircle className="w-3 h-3" /> 재생성 필요
                            </span>
                        )}
                    </div>
                    <button onClick={() => copyToClipboard(content, 'bottom')} className="p-2.5 rounded-[10px] bg-blue-500 hover:bg-blue-600 text-white transition-colors flex items-center justify-center shadow-sm" title={copiedBottom ? "복사 완료!" : "결과물 복사"}>
                        {copiedBottom ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>
                <div className={`max-w-[800px] w-full mx-auto text-left whitespace-pre-wrap font-mono text-[13px] leading-relaxed p-6 rounded-[10px] border bg-[#1C1C1C] border-zinc-800 transition-colors duration-500 text-zinc-300 ${outdatedFlag && !isPlaceholderContent ? 'opacity-60 grayscale' : 'opacity-100'}`}>
                    {content}
                </div>
            </div>
        );
    };

    const t = {
        bg: theme === 'dark' ? 'bg-black' : 'bg-zinc-200',
        sidebarLeft: theme === 'dark' ? 'bg-[#1A1A1A]/50 backdrop-blur-xl border-zinc-800/60' : 'bg-white border-zinc-300',
        textColor: theme === 'dark' ? 'text-zinc-100' : 'text-zinc-900',
    };

    return (
        <div className={`flex flex-col h-screen ${t.bg} ${t.textColor} overflow-hidden transition-colors duration-500 relative p-4`}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap');
        body, input, textarea, button, select, div, p, span { font-family: 'Noto Sans KR', sans-serif !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; } 
        .custom-scrollbar::-webkit-scrollbar-track { margin: 10px; background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(63, 63, 70, 0.5); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(82, 82, 91, 0.5); }
      `}</style>
            <main className="flex-1 flex overflow-hidden gap-4">

                {/* Left Navigation Sidebar */}
                <aside className={`${isSidebarOpen ? 'w-[240px]' : 'w-[72px]'} shrink-0 border ${t.sidebarLeft} rounded-[10px] flex flex-col transition-all duration-300 z-[200] overflow-hidden shadow-2xl`}>
                    <div className="h-[72px] flex items-center px-5 justify-end border-b border-zinc-800/50 shrink-0">
                        {!isSidebarOpen && (
                            <Menu className="w-5 h-5 mx-auto text-zinc-400 cursor-pointer hover:text-white transition-colors" onClick={() => setIsSidebarOpen(true)} />
                        )}
                    </div>
                    <div className="p-4 shrink-0">
                        <div className="flex bg-[#121212] rounded-[10px] p-1 border border-zinc-800/60 shadow-inner">
                            <button onClick={() => setCurrentView('editor')} className={`flex-1 py-2 px-1 text-[11px] font-bold rounded-[10px] flex items-center justify-center gap-1.5 transition-all duration-200 whitespace-nowrap ${currentView === 'editor' ? 'bg-[#2A2A2E] text-white shadow-sm border border-zinc-600/30' : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#1C1C1C] border border-transparent'}`}>
                                <PenTool className="w-3.5 h-3.5 shrink-0" /> {isSidebarOpen && <span>Creation</span>}
                            </button>
                            <button onClick={() => setCurrentView('edit')} className={`flex-1 py-2 px-1 text-[11px] font-bold rounded-[10px] flex items-center justify-center gap-1.5 transition-all duration-200 whitespace-nowrap ${currentView === 'edit' ? 'bg-[#2A2A2E] text-white shadow-sm border border-zinc-600/30' : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#1C1C1C] border border-transparent'}`}>
                                <Edit3 className="w-3.5 h-3.5 shrink-0" /> {isSidebarOpen && <span>Micro-Edit</span>}
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar mt-auto">
                        {/* Mode Indicator */}
                        <div className={`flex items-center w-full px-4 py-3 rounded-[10px] justify-start gap-3 bg-[#121212] border border-zinc-800/50 text-[#a6a6a6] cursor-default`} title="현재 코어 & RPG 특화 모드로 작동 중입니다.">
                            <ShieldCheck className="w-4 h-4 shrink-0 opacity-60" /> {isSidebarOpen && <span className="text-[11px] font-medium tracking-wide opacity-80">RPG 특화 엔진</span>}
                        </div>
                    </div>
                </aside>

                {/* --- 편집(Edit) 뷰 렌더링 --- */}
                {currentView === 'edit' && (
                    <>
                        <aside className="w-[360px] shrink-0 border border-zinc-800/60 bg-[#1A1A1A]/50 backdrop-blur-xl rounded-[10px] flex flex-col shadow-2xl relative overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                                {/* Persona Selector (Edit Mode) */}
                                <div className="mb-2 shrink-0">
                                    <div className="flex items-center gap-2 mb-3 px-1">
                                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#a6a6a6] flex items-center gap-2">
                                            <Crown className="w-3.5 h-3.5" /> AI Director Persona
                                        </h3>
                                    </div>
                                    <div className={`relative ${personaDropdownOpen ? 'z-[9999]' : 'z-10'}`}>
                                        <button onClick={() => setPersonaDropdownOpen(!personaDropdownOpen)} className="w-full flex items-center justify-between p-4 rounded-[10px] border border-zinc-800 bg-[#1C1C1C] hover:bg-[#262626] transition-all text-left shadow-sm focus:border-indigo-500/50">
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5 opacity-80">{directorPersonas.find(p => p.id === aiPersona)?.icon}</div>
                                                <div>
                                                    <div className="text-[12px] font-bold text-zinc-200">{directorPersonas.find(p => p.id === aiPersona)?.shortTitle}</div>
                                                </div>
                                            </div>
                                            <ChevronDown className={`w-4 h-4 text-[#a6a6a6] transition-transform ${personaDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {personaDropdownOpen && (
                                            <div className="absolute top-full left-0 w-full mt-2 bg-[#1C1C1C] border border-zinc-700 rounded-[10px] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-[1000] flex flex-col">
                                                {directorPersonas.map(p => (
                                                    <button key={p.id} onClick={() => { setAiPersona(p.id); setPersonaDropdownOpen(false); }} className={`w-full text-left p-4 flex items-start gap-3 transition-all ${aiPersona === p.id ? 'border-l-[3px] border-indigo-400 bg-indigo-500/10' : 'border-l-[3px] border-transparent hover:bg-[#262626]'}`}>
                                                        <div className="mt-0.5 opacity-80">{p.icon}</div>
                                                        <div className="flex-1">
                                                            <div className={`text-[11px] font-bold flex items-center justify-between ${aiPersona === p.id ? 'text-indigo-300' : 'text-[#a6a6a6]'}`}>
                                                                {p.shortTitle}
                                                            </div>
                                                            <div className="text-[10px] text-zinc-500 mt-1">{p.subtitle}</div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="shrink-0 rounded-[10px] border border-zinc-800 p-6 bg-[#121212] shadow-lg space-y-6 mt-2 relative overflow-hidden">
                                    <div>
                                        <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#a6a6a6] flex items-center justify-between">
                                            <span className="flex items-center gap-1.5"><ImageIcon className="w-3 h-3" /> Base Image</span>
                                            <span className="opacity-50 text-[9px]">(1차 결과물)</span>
                                        </div>
                                        <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleEditDrop} className={`relative rounded-[10px] border border-dashed p-6 text-center transition-all min-h-[120px] flex flex-col items-center justify-center ${isDragging ? 'border-indigo-400 bg-[#262626]' : 'border-zinc-700 bg-[#1C1C1C] hover:bg-[#262626]'}`}>
                                            {editUploadedImage ? (
                                                <div className="flex items-center justify-between w-full">
                                                    <img src={editUploadedImage} className="h-16 object-cover rounded opacity-90 border border-zinc-700/50" />
                                                    <button onClick={() => setEditUploadedImage(null)} title="이미지 제거" className="p-2 hover:bg-red-500/20 rounded-[10px] transition-colors"><X className="w-5 h-5 text-zinc-400 hover:text-red-400" /></button>
                                                </div>
                                            ) : <div className="text-[11px] font-bold text-[#a6a6a6] py-3 flex flex-col items-center gap-2"><UploadCloud className="w-6 h-6 opacity-50 mb-1" /> 클릭하거나 이미지를 드래그하여 업로드</div>}
                                            {!editUploadedImage && <input type="file" title="" onChange={handleEditImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />}
                                        </div>
                                    </div>

                                    <div className={`transition-all duration-300 relative ${!editUploadedImage ? 'opacity-40 pointer-events-none grayscale-[30%]' : ''}`}>
                                        {!editUploadedImage && (
                                            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[10px] bg-[#121212]/40 backdrop-blur-[1.5px]">
                                                <div className="bg-[#1C1C1C] px-4 py-2 rounded-[10px] border border-indigo-500/20 flex items-center gap-2 shadow-2xl">
                                                    <AlertCircle className="w-4 h-4 text-indigo-400" />
                                                    <span className="text-[11px] font-bold text-indigo-300">Base Image를 먼저 업로드해주세요</span>
                                                </div>
                                            </div>
                                        )}
                                        <div className="mb-2 flex items-center justify-between">
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-[#a6a6a6] flex items-center gap-1.5">
                                                <Brush className="w-3 h-3" /> Edit Direction
                                            </div>
                                            <div className="flex gap-1.5">
                                                <button onClick={openEditTuningRoom} disabled={!editInstruction.trim()} title="튜닝룸: AI와 대화하며 수정 방향을 다듬습니다." className={`p-2 rounded-[10px] transition-all flex items-center justify-center ${!editInstruction.trim() ? 'opacity-30 cursor-not-allowed text-zinc-600' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20'}`}>
                                                    <MessageSquare className="w-4 h-4" />
                                                </button>
                                                <button onClick={handleEditExpandIntent} disabled={isEditExpandingIntent || !editInstruction.trim()} title="자동 구체화: 간단한 키워드를 전문적인 프롬프트로 확장합니다." className={`p-2 rounded-[10px] transition-all flex items-center justify-center ${isEditExpandingIntent ? 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/30' : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/30 shadow-sm'}`}>
                                                    {isEditExpandingIntent ? <Loader2 className="w-4 h-4 animate-spin" /> : <SparkleIcon className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                        <textarea value={editInstruction} onChange={e => setEditInstruction(e.target.value)} placeholder="원하는 리터칭 방향을 입력하세요." className="w-full bg-[#1C1C1C] text-[13px] p-4 rounded-[10px] border border-zinc-800 outline-none min-h-[5rem] resize-none text-zinc-200 custom-scrollbar placeholder:text-zinc-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm" />

                                        <div className="mt-5 bg-[#1C1C1C] rounded-[10px] p-4 shadow-inner border border-zinc-800">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-[10px] font-bold text-[#a6a6a6]">{sliderDesc.leftLabel}</span>
                                                <SlidersHorizontal className="w-3 h-3 text-emerald-400/60" />
                                                <span className="text-[10px] font-bold text-emerald-400">{sliderDesc.rightLabel}</span>
                                            </div>
                                            <input type="range" min="0" max="100" value={personaSliderValue} onChange={e => setPersonaSliderValue(e.target.value)} className="w-full h-1.5 bg-zinc-700 rounded-[10px] appearance-none cursor-pointer accent-indigo-500" />
                                        </div>

                                        <div className="mt-5 flex flex-col gap-2">
                                            <div className="flex items-center justify-between bg-[#1C1C1C] rounded-[10px] border border-zinc-800/80 p-3 hover:border-zinc-700 transition-colors shadow-sm">
                                                <div className="flex items-center gap-2">
                                                    <Bot className={`w-4 h-4 ${applyAiRecInEdit ? 'text-purple-400' : 'text-zinc-600'}`} />
                                                    <span className={`text-[11px] font-bold tracking-wide ${applyAiRecInEdit ? 'text-purple-300' : 'text-[#a6a6a6]'}`} title="AI가 적절한 세부 조형 옵션을 자동으로 추천하고 적용합니다.">AI 최적화 추천</span>
                                                </div>
                                                <button onClick={() => setApplyAiRecInEdit(!applyAiRecInEdit)} className={`w-10 h-5 rounded-full p-1 flex items-center transition-colors shadow-inner ${applyAiRecInEdit ? 'bg-purple-500' : 'bg-[#121212] border border-zinc-800'}`}>
                                                    <div className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${applyAiRecInEdit ? 'translate-x-5' : 'translate-x-0'}`} />
                                                </button>
                                            </div>

                                            <div className="flex items-center justify-between bg-[#1C1C1C] rounded-[10px] border border-zinc-800/80 p-3 hover:border-zinc-700 transition-colors shadow-sm">
                                                <div className="flex items-start gap-2">
                                                    <Wand className={`w-4 h-4 mt-0.5 ${applyAutoRefine ? 'text-purple-400' : 'text-zinc-600'}`} />
                                                    <div>
                                                        <span className={`block text-[11px] font-bold tracking-wide ${applyAutoRefine ? 'text-purple-300' : 'text-[#a6a6a6]'}`}>스케치 자동 보정</span>
                                                        <span className="block text-[9px] text-zinc-500 mt-0.5">거친 선을 깔끔한 벡터 형태로 정규화합니다.</span>
                                                    </div>
                                                </div>
                                                <button onClick={() => setApplyAutoRefine(!applyAutoRefine)} className={`w-10 h-5 rounded-full p-1 flex items-center shrink-0 transition-colors shadow-inner ${applyAutoRefine ? 'bg-purple-500' : 'bg-[#121212] border border-zinc-800'}`}>
                                                    <div className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${applyAutoRefine ? 'translate-x-5' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 mb-4 px-1">
                                    <div className="shrink-0 mb-4 p-2.5 rounded-[10px] border border-zinc-800 bg-[#121212] flex items-center justify-between shadow-sm transition-colors">
                                        <div className="flex items-center gap-2 pl-1">
                                            <Settings className="w-4 h-4 text-[#a6a6a6]" />
                                            <h3 className="text-[11px] font-bold uppercase tracking-wide text-zinc-300">조형 설정</h3>
                                        </div>
                                        <div className="flex bg-[#1C1C1C] rounded-[6px] p-0.5 border border-zinc-800 shadow-inner">
                                            <button onClick={() => setIsAdvancedOptionsEnabled(false)} className={`px-3 py-1.5 text-[10px] font-bold rounded-[4px] transition-all ${!isAdvancedOptionsEnabled ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>요약 보기</button>
                                            <div className="w-[1px] bg-zinc-800 my-1 mx-0.5" />
                                            <button onClick={() => setIsAdvancedOptionsEnabled(true)} className={`px-3 py-1.5 text-[10px] font-bold rounded-[4px] transition-all ${isAdvancedOptionsEnabled ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>세부 편집</button>
                                        </div>
                                    </div>

                                    <OptionGroupCard
                                        id="edit_retouch" openCardId={editOpenCardId} onToggle={handleEditToggleCard}
                                        title="세부 조형 리터칭"
                                        icon={<Highlighter className="w-3.5 h-3.5 text-zinc-400" />}
                                        summary={`${getOptionName([...staticOptions.editStrokeMods, ...(dynamicOptions.editStrokeMods || [])], editStrokeMod).split(' ')[0]} · ${getOptionName([...staticOptions.editElementMods, ...(dynamicOptions.editElementMods || [])], editElementMod).split(' ')[0]}`}
                                    >
                                        <div className="space-y-3">
                                            <DropdownControl label="획(Stroke) 변형" data={[...staticOptions.editStrokeMods, ...(dynamicOptions.editStrokeMods || [])]} value={editStrokeMod} onChange={setEditStrokeMod} theme={theme} />
                                            <DropdownControl label="요소(Element) 변환" data={[...staticOptions.editElementMods, ...(dynamicOptions.editElementMods || [])]} value={editElementMod} onChange={setEditElementMod} theme={theme} />
                                            <DropdownControl label="표면(Surface) 질감" data={[...staticOptions.editSurfaceMods, ...(dynamicOptions.editSurfaceMods || [])]} value={editSurfaceMod} onChange={setEditSurfaceMod} theme={theme} />
                                        </div>
                                    </OptionGroupCard>

                                    <OptionGroupCard
                                        id="edit_layout" openCardId={editOpenCardId} onToggle={handleEditToggleCard}
                                        title="구조 배치 및 실루엣"
                                        icon={<Settings className="w-3.5 h-3.5 text-zinc-400" />}
                                        summary={`${getOptionName(staticOptions.MMOSilhouetteFramings, mmoSilhouetteFraming).split(' ')[0]}`}
                                    >
                                        <div className="space-y-3">
                                            <div className="mb-3">
                                                <DropdownControl label="타입 프리셋" data={staticOptions.layoutPresets} value={layoutPreset} onChange={handleLayoutPresetChange} theme={theme} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 mb-3">
                                                <DropdownControl label="비율" data={staticOptions.ratios} value={aspectRatio} onChange={(val) => { setAspectRatio(val); setLayoutPreset(''); }} theme={theme} />
                                                <DropdownControl label="크기 / 여백" data={staticOptions.occupancies} value={occupancy} onChange={(val) => { setOccupancy(val); setLayoutPreset(''); }} theme={theme} />
                                            </div>
                                            <div className="mb-3">
                                                <DropdownControl label="배열 방식" data={staticOptions.layouts} value={layoutType} onChange={(val) => { setLayoutType(val); setLayoutPreset(''); }} theme={theme} />
                                            </div>
                                            {(layoutType === "TitleSub" || layoutType === "SubTitle") && (
                                                <div className="mb-3">
                                                    <DropdownControl label="서브 텍스트 크기" data={staticOptions.subTitleSizes} value={subTitleSize} onChange={setSubTitleSize} theme={theme} />
                                                </div>
                                            )}
                                            <div className="mt-3 pt-3 border-t border-zinc-800/50">
                                                <DropdownControl label="고급 (전체 실루엣)" data={staticOptions.MMOSilhouetteFramings} value={mmoSilhouetteFraming} onChange={(val) => { setMmoSilhouetteFraming(val); setLayoutPreset(''); }} theme={theme} />
                                            </div>
                                        </div>
                                    </OptionGroupCard>

                                    <OptionGroupCard
                                        id="edit_intensity" openCardId={editOpenCardId} onToggle={handleEditToggleCard}
                                        title="동세 및 파괴"
                                        icon={<Activity className="w-3.5 h-3.5 text-zinc-400" />}
                                        summary={`${getOptionName([...staticOptions.kineticVelocities, ...(dynamicOptions.kineticVelocities || [])], kineticVelocity).split(' ')[0]} · 파괴: ${getOptionName([...staticOptions.deformationDamages, ...(dynamicOptions.deformationDamages || [])], deformationDamage).split(' ')[0]}`}
                                    >
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <DropdownControl label="조형적 동세" data={[...staticOptions.kineticVelocities, ...(dynamicOptions.kineticVelocities || [])]} value={kineticVelocity} onChange={setKineticVelocity} theme={theme} />
                                                <DropdownControl label="전체 기울기" data={staticOptions.slantAngles} value={slantAngle} onChange={setSlantAngle} theme={theme} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <DropdownControl label="파괴 및 침식" data={[...staticOptions.deformationDamages, ...(dynamicOptions.deformationDamages || [])]} value={deformationDamage} onChange={setDeformationDamage} theme={theme} />
                                                <DropdownControl label="사선 절단" data={[...staticOptions.slicingIntensities, ...(dynamicOptions.slicingIntensities || [])]} value={slicingIntensity} onChange={setSlicingIntensity} theme={theme} />
                                            </div>
                                        </div>
                                    </OptionGroupCard>
                                </div>
                            </div>
                        </aside>

                        <div className="flex-1 flex flex-col bg-[#1A1A1A]/50 backdrop-blur-xl rounded-[10px] border border-zinc-800/60 shadow-2xl relative overflow-hidden">
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 lg:p-12">
                                <div className="max-w-[850px] w-full mx-auto space-y-8 pb-20">

                                    {/* Header Action Bar */}
                                    <div className="flex items-center justify-between w-full pb-4 border-b border-zinc-800/50 mb-6">
                                        <div>
                                            <h2 className="text-xl font-bold text-white flex items-center gap-2"><Edit3 className="w-5 h-5 text-zinc-400" /> Image Retouching</h2>
                                            <p className="text-[12px] text-[#a6a6a6] mt-1">기존 형태를 유지하며 디테일을 다듬고 퀄리티를 향상시킵니다.</p>
                                        </div>
                                    </div>

                                    {/* Accordion Prompt View */}
                                    <div className={`rounded-[10px] border bg-[#121212] border-zinc-800 shadow-sm transition-all overflow-hidden flex flex-col`}>
                                        <div className="flex justify-between items-center p-3 border-b border-zinc-800/50">
                                            <div className="flex items-center gap-4 flex-wrap">
                                                <button onClick={() => setIsEditPromptExpanded(!isEditPromptExpanded)} className="flex items-center gap-2 hover:bg-[#1C1C1C] p-1.5 rounded-[10px] transition-all group" title={isEditPromptExpanded ? "프롬프트 접기" : "프롬프트 펼치기"}>
                                                    <div className={`p-1 rounded-[10px] bg-[#1C1C1C] group-hover:bg-[#262626] transition-colors`}>
                                                        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isEditPromptExpanded ? 'rotate-180' : ''}`} />
                                                    </div>
                                                    <p className="text-[12px] font-bold uppercase text-[#a6a6a6] tracking-wider">Base Technical Prompt</p>
                                                </button>
                                                <div className="flex gap-2">
                                                    {applyAiRecInEdit && <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] font-bold rounded-[10px] uppercase border border-purple-500/20" title="AI 추천이 반영된 상태입니다">AI Rec</span>}
                                                    {editManualBasePrompt && <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] font-bold rounded-[10px] uppercase border border-purple-500/20" title="무결성 검사를 통해 교정된 상태입니다">Resolved</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => runInspector(true)} disabled={isInspecting} title="무결성 검사: 설정된 옵션 간의 논리적 충돌을 검사하고 교정합니다." className="p-2 rounded-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 transition-all flex items-center justify-center shadow-sm">
                                                    {isInspecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
                                                </button>
                                                <button onClick={() => copyToClipboard(baseLangView === 'ko' ? buildEditPrompts().baseTechnicalKo : buildEditPrompts().baseTechnicalEn, 'top')} title={copiedTop ? "복사 완료!" : "전체 프롬프트 복사"} className="p-2 rounded-[10px] bg-blue-500 hover:bg-blue-600 text-white transition-all shadow-sm flex items-center justify-center">
                                                    {copiedTop ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                </button>
                                                <div className="flex bg-[#1C1C1C] rounded-[10px] p-1 border border-zinc-800 shadow-inner ml-1">
                                                    <button onClick={() => setBaseLangView('en')} className={`px-3 py-1 text-[10px] font-bold uppercase rounded-[10px] transition-all ${baseLangView === 'en' ? 'bg-zinc-700 text-white shadow-sm' : 'text-[#a6a6a6] hover:text-zinc-300'}`}>EN</button>
                                                    <button onClick={() => setBaseLangView('ko')} className={`px-3 py-1 text-[10px] font-bold uppercase rounded-[10px] transition-all ${baseLangView === 'ko' ? 'bg-zinc-700 text-white shadow-sm' : 'text-[#a6a6a6] hover:text-zinc-300'}`}>KO</button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`relative font-mono text-[12px] bg-[#1C1C1C] text-zinc-400 whitespace-pre-wrap leading-[1.625] transition-[max-height] duration-500 ease-in-out overflow-hidden ${isEditPromptExpanded ? 'max-h-[3000px]' : 'max-h-[220px]'}`}>
                                            <div className="p-6 pb-8">
                                                {baseLangView === 'ko' ? buildEditPrompts().baseTechnicalKo : buildEditPrompts().baseTechnicalEn}
                                            </div>
                                            {!isEditPromptExpanded && (
                                                <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#1C1C1C] via-[#1C1C1C]/80 to-transparent pointer-events-none" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Output Generation Actions */}
                                    <div className="space-y-4">
                                        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto custom-scrollbar pb-2">
                                            <button onClick={() => setEditAiModel('Overview')} className={`shrink-0 min-w-max px-6 py-3 border rounded-[10px] text-[11px] font-bold tracking-wide transition-all shadow-sm ${editAiModel === 'Overview' ? 'border-zinc-500 bg-zinc-800 text-white' : 'border-zinc-800 bg-[#1C1C1C] text-zinc-500 hover:bg-[#262626] hover:text-zinc-300'}`}>Overview</button>
                                            {aiOptimizationModels.map(model => (
                                                <button key={model.id} onClick={() => setEditAiModel(model.id)} className={`shrink-0 min-w-max px-6 py-3 border rounded-[10px] text-[11px] font-bold tracking-wide transition-all shadow-sm ${editAiModel === model.id ? 'border-zinc-500 bg-zinc-800 text-white' : 'border-zinc-800 bg-[#1C1C1C] text-zinc-500 hover:bg-[#262626] hover:text-zinc-300'}`}>{model.name}</button>
                                            ))}
                                        </div>

                                        {editAiModel === 'NanoBanana' && (
                                            <div className="flex flex-nowrap gap-3">
                                                <button onClick={() => requestEditDramaticEnhancement()} disabled={isEditEnhancing} title="풍부한 묘사가 포함된 서술형 프롬프트를 생성합니다." className="shrink-0 flex-1 px-6 py-3.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:border-purple-500/50 rounded-[10px] font-bold text-[12px] uppercase flex justify-center items-center gap-2 transition-all shadow-sm">
                                                    {isEditEnhancing ? <Loader2 className="w-4 h-4 animate-spin text-purple-400" /> : <Stars className="w-4 h-4 text-purple-400" />} 프롬프트 빌드
                                                </button>
                                            </div>
                                        )}
                                        {editAiModel === 'Midjourney' && (
                                            <button onClick={() => requestMidjourneyOptimization(true)} disabled={isEditMjOptimizing} title="미드저니 V6 형식에 맞춘 프롬프트를 생성합니다." className="w-full shrink-0 px-6 py-3.5 bg-purple-600 hover:bg-purple-500 text-white rounded-[10px] font-black text-[12px] uppercase flex justify-center items-center gap-2 transition-all shadow-md">
                                                {isEditMjOptimizing ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <RefreshCcw className="w-4 h-4 text-white" />} 미드저니 최적화
                                            </button>
                                        )}
                                        {editAiModel === 'ChatGPT' && (
                                            <button onClick={() => requestChatGPTEnhancement(true)} disabled={isEditCgEnhancing} title="DALL-E 3 생성을 위한 자연어 지시문을 생성합니다." className="w-full shrink-0 px-6 py-3.5 bg-purple-600 hover:bg-purple-500 text-white rounded-[10px] font-bold text-[12px] uppercase flex justify-center items-center gap-2 transition-all shadow-sm">
                                                {isCgEnhancing ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Stars className="w-4 h-4 text-white" />} DALL-E 지시문 빌드
                                            </button>
                                        )}
                                    </div>

                                    {renderAiOutputBox(editAiModel, buildEditPrompts().outputContent, true, isEditOutdated)}

                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* --- 생성(Editor) 뷰 렌더링 --- */}
                {currentView === 'editor' && (
                    <>
                        <aside className="w-[360px] shrink-0 border border-zinc-800/60 bg-[#1A1A1A]/50 backdrop-blur-xl rounded-[10px] flex flex-col shadow-2xl relative overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                                {/* Persona Selector (Create Mode) */}
                                <div className="mb-2 shrink-0">
                                    <div className="flex items-center gap-2 mb-3 px-1">
                                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#a6a6a6] flex items-center gap-2">
                                            <Crown className="w-3.5 h-3.5" /> AI Director Persona
                                        </h3>
                                    </div>
                                    <div className={`relative ${personaDropdownOpen ? 'z-[9999]' : 'z-10'}`}>
                                        <button onClick={() => setPersonaDropdownOpen(!personaDropdownOpen)} className="w-full flex items-center justify-between p-4 rounded-[10px] border border-zinc-800 bg-[#1C1C1C] hover:bg-[#262626] transition-all text-left shadow-sm focus:border-indigo-500/50">
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5 opacity-80">{directorPersonas.find(p => p.id === aiPersona)?.icon}</div>
                                                <div>
                                                    <div className="text-[12px] font-bold text-zinc-200">{directorPersonas.find(p => p.id === aiPersona)?.shortTitle}</div>
                                                </div>
                                            </div>
                                            <ChevronDown className={`w-4 h-4 text-[#a6a6a6] transition-transform ${personaDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {personaDropdownOpen && (
                                            <div className="absolute top-full left-0 w-full mt-2 bg-[#1C1C1C] border border-zinc-700 rounded-[10px] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-[1000] flex flex-col">
                                                {directorPersonas.map(p => (
                                                    <button key={p.id} onClick={() => { setAiPersona(p.id); setPersonaDropdownOpen(false); }} className={`w-full text-left p-4 flex items-start gap-3 transition-all ${aiPersona === p.id ? 'border-l-[3px] border-indigo-400 bg-indigo-500/10' : 'border-l-[3px] border-transparent hover:bg-[#262626]'}`}>
                                                        <div className="mt-0.5 opacity-80">{p.icon}</div>
                                                        <div className="flex-1">
                                                            <div className={`text-[11px] font-bold flex items-center justify-between ${aiPersona === p.id ? 'text-indigo-300' : 'text-[#a6a6a6]'}`}>
                                                                {p.shortTitle}
                                                            </div>
                                                            <div className="text-[10px] text-zinc-500 mt-1">{p.subtitle}</div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="shrink-0 rounded-[10px] border border-zinc-800 p-6 bg-[#121212] shadow-lg space-y-6 mt-2 relative overflow-hidden">
                                    <div>
                                        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#a6a6a6] flex items-center gap-1.5">
                                            <Command className="w-3 h-3" /> Subject Text
                                        </div>
                                        <textarea
                                            value={inputText}
                                            onChange={e => setInputText(e.target.value)}
                                            placeholder="텍스트 입력 (엔터로 줄바꿈)"
                                            rows={inputText.includes('\n') ? 2 : 1}
                                            className={`w-full bg-[#15171C] font-black outline-none text-white border border-zinc-800 rounded-[10px] px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm resize-none custom-scrollbar ${inputText.includes('\n') || inputText.length > 10 ? 'text-[15px] leading-tight' : 'text-[20px] leading-tight'}`}
                                        />
                                    </div>
                                    <div>
                                        <div className="mb-2 flex items-center justify-between">
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-[#a6a6a6] flex items-center gap-1.5">
                                                <Sparkles className="w-3 h-3" /> Design Aura
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => moodImageRef.current?.click()} disabled={isAnalyzingMood} title="배경 무드 분석: 원화나 다중 이미지(배경+캐릭터)를 업로드하면 구조적인 타이포 아우라를 자동 추출합니다." className={`p-2 rounded-[10px] transition-all flex items-center justify-center ${isAnalyzingMood ? 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/30' : 'bg-[#1C1C1C] hover:bg-[#262626] text-[#a6a6a6] hover:text-white border border-zinc-700/60 shadow-sm'}`}>
                                                    {isAnalyzingMood ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                                                </button>
                                                <input type="file" ref={moodImageRef} className="hidden" accept="image/*" multiple onChange={handleMoodImageUpload} />
                                                <button onClick={() => openTuningRoom()} disabled={!customDesignInjections.trim()} title="튜닝룸: AI와 대화하며 형태적 아이디어를 구체화합니다." className={`p-2 rounded-[10px] transition-all flex items-center justify-center ${!customDesignInjections.trim() ? 'opacity-30 cursor-not-allowed text-zinc-600' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20'}`}>
                                                    <MessageSquare className="w-4 h-4" />
                                                </button>
                                                <button onClick={handleExpandIntent} disabled={isExpandingIntent || !customDesignInjections.trim()} title="자동 구체화: 간단한 키워드를 전문적인 형태 묘사로 확장합니다." className={`p-2 rounded-[10px] transition-all flex items-center justify-center ${isExpandingIntent ? 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/30' : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/30 shadow-sm'}`}>
                                                    {isExpandingIntent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                        <textarea value={customDesignInjections} onChange={e => setCustomDesignInjections(e.target.value)} placeholder="원하는 분위기나 형태를 묘사하세요." className="w-full bg-[#1C1C1C] text-[13px] p-4 rounded-[10px] border border-zinc-800 outline-none min-h-[5rem] resize-none text-zinc-200 custom-scrollbar placeholder:text-zinc-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm" />

                                        <div className="mt-4 bg-[#1C1C1C] rounded-[10px] p-5 shadow-inner border border-zinc-800">
                                            <div className="flex justify-between items-center mb-4">
                                                <span className="text-[10px] font-bold text-[#a6a6a6]">{sliderDesc.leftLabel}</span>
                                                <SlidersHorizontal className="w-4 h-4 text-zinc-600" />
                                                <span className="text-[10px] font-bold text-emerald-400">{sliderDesc.rightLabel}</span>
                                            </div>
                                            <input type="range" min="0" max="100" value={personaSliderValue} onChange={e => setPersonaSliderValue(e.target.value)} className="w-full h-1.5 bg-zinc-700 rounded-[10px] appearance-none cursor-pointer accent-indigo-500" />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-5 gap-2 pt-2 mt-4">
                                    <button onClick={handleAiRecommendation} disabled={isRecommending} title="현재 텍스트와 아우라를 분석하여 AI가 최적의 구조를 추천합니다." className="col-span-4 py-3.5 rounded-[10px] bg-purple-600/10 text-purple-400 border border-purple-500/20 hover:bg-purple-600/20 font-bold text-[11px] uppercase flex items-center justify-center gap-2 transition-colors shadow-sm">
                                        {isRecommending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />} AI 스마트 셋업
                                    </button>
                                    <button onClick={handleReset} title="모든 설정을 초기화합니다." className="bg-[#1C1C1C] border border-zinc-800 hover:bg-[#262626] hover:text-white text-[#a6a6a6] rounded-[10px] flex items-center justify-center transition-colors">
                                        <RefreshCcw className="w-4 h-4" />
                                    </button>
                                </div>
                                {aiRecSummary && (
                                    <div className={`mt-3 p-4 rounded-[10px] border animate-in fade-in duration-500 bg-[#1C1C1C] border-zinc-700`}>
                                        <p className={`text-[11px] font-bold mb-1 text-zinc-300 flex items-center gap-1.5`}><Sparkles className="w-3 h-3 text-[#a6a6a6]" /> {aiRecSummary.title}</p>
                                        <p className={`text-[10px] leading-relaxed text-[#a6a6a6]`}>{aiRecSummary.reason}</p>
                                    </div>
                                )}

                                <div className="mt-6 mb-4 px-1">
                                    <div className="mb-3">
                                        <DropdownControl label="타입 프리셋" icon={<Anchor className="w-3.5 h-3.5 text-zinc-400" />} data={[...staticOptions.MMOStyles, ...(dynamicOptions.MMOStyles || [])]} value={scriptType} onChange={handleScriptPresetChange} theme={theme} />
                                    </div>

                                    <div className="shrink-0 mb-4 p-2.5 rounded-[10px] border border-zinc-800 bg-[#121212] flex items-center justify-between shadow-sm transition-colors">
                                        <div className="flex items-center gap-2 pl-1">
                                            <Settings className="w-4 h-4 text-[#a6a6a6]" />
                                            <h3 className="text-[11px] font-bold uppercase tracking-wide text-zinc-300">조형 설정</h3>
                                        </div>
                                        <div className="flex bg-[#1C1C1C] rounded-[6px] p-0.5 border border-zinc-800 shadow-inner">
                                            <button onClick={() => setIsAdvancedOptionsEnabled(false)} className={`px-3 py-1.5 text-[10px] font-bold rounded-[4px] transition-all ${!isAdvancedOptionsEnabled ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>요약 보기</button>
                                            <div className="w-[1px] bg-zinc-800 my-1 mx-0.5" />
                                            <button onClick={() => setIsAdvancedOptionsEnabled(true)} className={`px-3 py-1.5 text-[10px] font-bold rounded-[4px] transition-all ${isAdvancedOptionsEnabled ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>세부 편집</button>
                                        </div>
                                    </div>

                                    <OptionGroupCard
                                        id="layout" openCardId={openCardId} onToggle={handleToggleCard}
                                        title="구조 배치"
                                        icon={<LayoutTemplate className="w-3.5 h-3.5 text-zinc-400" />}
                                        summary={`${getOptionName(staticOptions.ratios, aspectRatio)} · ${getOptionName(staticOptions.layouts, layoutType).split(' ')[0]} · ${getOptionName(staticOptions.occupancies, occupancy).split(' ')[0]}`}
                                    >
                                        <div className="mb-3">
                                            <DropdownControl label="레이아웃 프리셋" data={staticOptions.layoutPresets} value={layoutPreset} onChange={handleLayoutPresetChange} theme={theme} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <DropdownControl label="비율" data={staticOptions.ratios} value={aspectRatio} onChange={(val) => { setAspectRatio(val); setLayoutPreset(''); }} theme={theme} />
                                            <DropdownControl label="크기 / 여백" data={staticOptions.occupancies} value={occupancy} onChange={(val) => { setOccupancy(val); setLayoutPreset(''); }} theme={theme} />
                                        </div>
                                        <div className="mb-3">
                                            <DropdownControl label="배열 방식" data={staticOptions.layouts} value={layoutType} onChange={(val) => { setLayoutType(val); setLayoutPreset(''); }} theme={theme} />
                                        </div>
                                        {(layoutType === "TitleSub" || layoutType === "SubTitle") && (
                                            <div className="mb-3">
                                                <DropdownControl label="서브 텍스트 크기" data={staticOptions.subTitleSizes} value={subTitleSize} onChange={setSubTitleSize} theme={theme} />
                                            </div>
                                        )}
                                        {isAdvancedOptionsEnabled && (
                                            <div className="mt-3 pt-3 border-t border-zinc-800/50">
                                                <DropdownControl label="고급 (전체 실루엣)" data={staticOptions.MMOSilhouetteFramings} value={mmoSilhouetteFraming} onChange={(val) => { setMmoSilhouetteFraming(val); setLayoutPreset(''); }} theme={theme} />
                                            </div>
                                        )}
                                    </OptionGroupCard>

                                    {isAdvancedOptionsEnabled && (
                                        <OptionGroupCard
                                            id="density" openCardId={openCardId} onToggle={handleToggleCard}
                                            title="글자 밀도"
                                            icon={<BoxIcon className="w-3.5 h-3.5 text-zinc-400" />}
                                            summary={`${{ "Narrow": "좁은", "Normal": "표준", "Wide": "넓은", "UltraWide": "초광폭" }[charWidth] || '표준'} 폭 · ${getOptionName(staticOptions.proportions, charProportion)}${isAdvancedOptionsEnabled ? ` · ${getOptionName([...staticOptions.stemWeights, ...(dynamicOptions.stemWeights || [])], stemWeight).split(' ')[0]}` : ''}`}
                                        >
                                            <div className="grid grid-cols-2 gap-3">
                                                <DropdownControl label="폭감" data={staticOptions.widths} value={charWidth} onChange={setCharWidth} theme={theme} />
                                                <DropdownControl label="비례" data={staticOptions.proportions} value={charProportion} onChange={setCharProportion} theme={theme} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 mt-3">
                                                <DropdownControl label="획 두께" data={[...staticOptions.stemWeights, ...(dynamicOptions.stemWeights || [])]} value={stemWeight} onChange={setStemWeight} theme={theme} />
                                            </div>
                                        </OptionGroupCard>
                                    )}

                                    <OptionGroupCard
                                        id="terminal" openCardId={openCardId} onToggle={handleToggleCard}
                                        title="획 마감"
                                        icon={<Brush className="w-3.5 h-3.5 text-zinc-400" />}
                                        summary={isAdvancedOptionsEnabled ? `${getOptionName([...staticOptions.terminalStyles, ...(dynamicOptions.terminalStyles || [])], terminalStyle).split(' ')[0]} 마감 · ${getOptionName([...staticOptions.strokeSharpness, ...(dynamicOptions.strokeSharpness || [])], strokeSharpness).split(' ')[0]}` : `${getOptionName([...staticOptions.terminalStyles, ...(dynamicOptions.terminalStyles || [])], terminalStyle).split(' ')[0]} 마감`}
                                    >
                                        <div className={`grid gap-3 ${isAdvancedOptionsEnabled ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                            <DropdownControl label="마감 방식" data={[...staticOptions.terminalStyles, ...(dynamicOptions.terminalStyles || [])]} value={terminalStyle} onChange={setTerminalStyle} theme={theme} />
                                            {isAdvancedOptionsEnabled && <DropdownControl label="예리함" data={[...staticOptions.strokeSharpness, ...(dynamicOptions.strokeSharpness || [])]} value={strokeSharpness} onChange={setStrokeSharpness} theme={theme} />}
                                        </div>
                                        {isAdvancedOptionsEnabled && (
                                            <div className="grid grid-cols-2 gap-3 mt-3">
                                                <DropdownControl label="절단 방식" data={[...staticOptions.slicingIntensities, ...(dynamicOptions.slicingIntensities || [])]} value={slicingIntensity} onChange={setSlicingIntensity} theme={theme} />
                                                <DropdownControl label="코너 성격" data={[...staticOptions.cornerStyles, ...(dynamicOptions.cornerStyles || [])]} value={cornerStyle} onChange={setCornerStyle} theme={theme} />
                                            </div>
                                        )}
                                    </OptionGroupCard>

                                    <OptionGroupCard
                                        id="connection" openCardId={openCardId} onToggle={handleToggleCard}
                                        title="문자 결속"
                                        icon={<Layers3 className="w-3.5 h-3.5 text-zinc-400" />}
                                        summary={isAdvancedOptionsEnabled ? `글자 ${getOptionName(staticOptions.letterConnections, letterConnection).split(' ')[0]} · 내부공간 ${getOptionName(staticOptions.internalSpaces, internalSpace).split(' ')[0]}` : `글자 ${getOptionName(staticOptions.letterConnections, letterConnection).split(' ')[0]}`}
                                    >
                                        <div className={`grid gap-3 ${isAdvancedOptionsEnabled ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                            <DropdownControl label="글자 결합" data={staticOptions.letterConnections} value={letterConnection} onChange={setLetterConnection} theme={theme} />
                                            {isAdvancedOptionsEnabled && <DropdownControl label="자간" data={[...staticOptions.kerningOptions, ...(dynamicOptions.kerningOptions || [])]} value={kerning} onChange={setKerning} theme={theme} />}
                                        </div>
                                        {isAdvancedOptionsEnabled && (
                                            <div className={`grid gap-3 mt-3 grid-cols-2`}>
                                                <DropdownControl label="내부 공간" data={staticOptions.internalSpaces} value={internalSpace} onChange={setInternalSpace} theme={theme} />
                                                <DropdownControl label="로고화 정도" data={staticOptions.logoDegrees} value={logoDegree} onChange={setLogoDegree} theme={theme} />
                                            </div>
                                        )}
                                    </OptionGroupCard>

                                    <OptionGroupCard
                                        id="intensity" openCardId={openCardId} onToggle={handleToggleCard}
                                        title="표현 강도"
                                        icon={<Activity className="w-3.5 h-3.5 text-zinc-400" />}
                                        summary={isAdvancedOptionsEnabled ? `동세: ${getOptionName([...staticOptions.kineticVelocities, ...(dynamicOptions.kineticVelocities || [])], kineticVelocity).split(' ')[0]} · 파괴: ${getOptionName([...staticOptions.deformationDamages, ...(dynamicOptions.deformationDamages || [])], deformationDamage).split(' ')[0]}` : `동세: ${getOptionName([...staticOptions.kineticVelocities, ...(dynamicOptions.kineticVelocities || [])], kineticVelocity).split(' ')[0]}`}
                                    >
                                        <div className={`grid gap-3 ${isAdvancedOptionsEnabled ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                            <DropdownControl label="조형적 동세" data={[...staticOptions.kineticVelocities, ...(dynamicOptions.kineticVelocities || [])]} value={kineticVelocity} onChange={setKineticVelocity} theme={theme} />
                                            {isAdvancedOptionsEnabled && <DropdownControl label="전체 기울기" data={staticOptions.slantAngles} value={slantAngle} onChange={setSlantAngle} theme={theme} />}
                                        </div>
                                        <div className={`grid gap-3 mt-3 ${isAdvancedOptionsEnabled ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                            <DropdownControl label="배경 대비" icon={<BoxIcon className="w-3 h-3" />} data={staticOptions.base} value={baseStyle} onChange={setBaseStyle} theme={theme} />
                                            {isAdvancedOptionsEnabled && <DropdownControl label="파괴 및 침식" data={[...staticOptions.deformationDamages, ...(dynamicOptions.deformationDamages || [])]} value={deformationDamage} onChange={setDeformationDamage} theme={theme} />}
                                        </div>
                                        {isAdvancedOptionsEnabled && (
                                            <div className="grid grid-cols-2 gap-3 mt-3">
                                                <DropdownControl label="주변 장식" data={staticOptions.MMOSurroundingElements} value={mmoSurroundingElement} onChange={setMmoSurroundingElement} theme={theme} />
                                            </div>
                                        )}
                                    </OptionGroupCard>
                                </div>

                                <section className="mt-8 border-t border-zinc-800/50 pt-4 mb-4 px-5">
                                    <div className="flex items-center justify-between">
                                        <SectionHeader id="06" label="모디파이어 (구조 강제)" icon={<Wand className="w-3.5 h-3.5" />} theme={theme} />
                                        <div className="flex items-center gap-2 mt-3 cursor-pointer" onClick={() => setIsEnhanceModeEnabled(!isEnhanceModeEnabled)}>
                                            <span className={`text-[10px] font-bold uppercase tracking-wide ${isEnhanceModeEnabled ? 'text-purple-400' : 'text-zinc-500'}`}>{isEnhanceModeEnabled ? '활성화됨' : '비활성'}</span>
                                            <div className={`w-8 h-4 rounded-full p-1 flex items-center transition-colors shadow-inner ${isEnhanceModeEnabled ? 'bg-purple-500' : 'bg-[#1C1C1C] border border-zinc-800'}`}>
                                                <div className={`w-2.5 h-2.5 bg-white rounded-full transition-transform ${isEnhanceModeEnabled ? 'translate-x-4 border-none' : 'translate-x-0 border border-zinc-600'}`} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`p-3 rounded-[10px] border bg-[#121212] border-zinc-800 mt-3 shadow-sm transition-all duration-300 ${!isEnhanceModeEnabled ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
                                        <div className="flex bg-[#1C1C1C] rounded-[10px] p-1 border border-zinc-800">
                                            <button onClick={() => isEnhanceModeEnabled && setEnhanceMode('refine')} title="가장 안전하고 실무적인 모드. 조형적 완결성을 극대화합니다." className={`flex-1 py-2.5 rounded-[8px] text-[11px] font-bold transition-all ${enhanceMode === 'refine' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.1)]' : 'text-[#a6a6a6] hover:text-zinc-300 border border-transparent'}`}>💎 정제</button>
                                            <button onClick={() => isEnhanceModeEnabled && setEnhanceMode('variation')} title="본질은 유지하되 다양한 조형적 해석을 탐색합니다." className={`flex-1 py-2.5 rounded-[8px] text-[11px] font-bold transition-all ${enhanceMode === 'variation' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'text-[#a6a6a6] hover:text-zinc-300 border border-transparent'}`}>🎨 변주</button>
                                            <button onClick={() => isEnhanceModeEnabled && setEnhanceMode('deconstruct')} title="글자를 분해하고 재구성하여 급진적 스타일을 실험합니다." className={`flex-1 py-2.5 rounded-[8px] text-[11px] font-bold transition-all ${enhanceMode === 'deconstruct' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.1)]' : 'text-[#a6a6a6] hover:text-zinc-300 border border-transparent'}`}>💥 해체</button>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </aside>

                        <div className="flex-1 flex flex-col bg-[#1A1A1A]/50 backdrop-blur-xl rounded-[10px] border border-zinc-800/60 shadow-2xl relative overflow-hidden">
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 lg:p-12">
                                <div className="max-w-[850px] w-full mx-auto space-y-8 pb-20">

                                    {/* Header Action Bar */}
                                    <div className="flex items-center justify-between w-full pb-4 border-b border-zinc-800/50 mb-6">
                                        <div>
                                            <h2 className="text-xl font-bold text-white flex items-center gap-2"><PenTool className="w-5 h-5 text-zinc-400" /> Typography Generator</h2>
                                            <p className="text-[12px] text-[#a6a6a6] mt-1">지정된 옵션과 아우라를 바탕으로 최적화된 프롬프트를 생성합니다.</p>
                                        </div>
                                    </div>

                                    {/* Accordion Prompt View */}
                                    <div className={`rounded-[10px] border bg-[#121212] border-zinc-800 shadow-sm transition-all overflow-hidden flex flex-col`}>
                                        <div className="flex justify-between items-center p-3 border-b border-zinc-800/50">
                                            <div className="flex items-center gap-4 flex-wrap">
                                                <button onClick={() => setIsPromptExpanded(!isPromptExpanded)} className="flex items-center gap-2 hover:bg-[#1A1A1A] p-1.5 rounded-[10px] transition-all group" title={isPromptExpanded ? "프롬프트 접기" : "프롬프트 펼치기"}>
                                                    <div className={`p-1 rounded-[10px] bg-[#1C1C1C] group-hover:bg-[#262626] transition-colors`}>
                                                        <ChevronDown className={`w-4 h-4 text-[#a6a6a6] transition-transform ${isPromptExpanded ? 'rotate-180' : ''}`} />
                                                    </div>
                                                    <p className="text-[12px] font-bold uppercase text-[#a6a6a6] tracking-wider">Base Technical Prompt</p>
                                                </button>
                                                <div className="flex gap-2">
                                                    {manualBasePrompt && <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] font-bold rounded-[10px] uppercase border border-purple-500/20" title="무결성 검사를 통해 교정된 상태입니다">Resolved</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => runInspector(false)} disabled={isInspecting} title="무결성 검사: 설정된 옵션 간의 논리적 충돌을 검사하고 교정합니다." className="p-2 rounded-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 transition-all flex items-center justify-center shadow-sm">
                                                    {isInspecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
                                                </button>
                                                <button onClick={() => copyToClipboard(baseLangView === 'ko' ? buildPrompts().baseTechnicalKo : buildPrompts().baseTechnicalEn, 'top')} title={copiedTop ? "복사 완료!" : "전체 프롬프트 복사"} className="p-2 rounded-[10px] bg-blue-500 hover:bg-blue-600 text-white transition-all shadow-sm flex items-center justify-center">
                                                    {copiedTop ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                </button>
                                                <div className="flex bg-[#1C1C1C] rounded-[10px] p-1 border border-zinc-800 shadow-inner ml-1">
                                                    <button onClick={() => setBaseLangView('en')} className={`px-3 py-1 text-[10px] font-bold uppercase rounded-[10px] transition-all ${baseLangView === 'en' ? 'bg-zinc-700 text-white shadow-sm' : 'text-[#a6a6a6] hover:text-zinc-300'}`}>EN</button>
                                                    <button onClick={() => setBaseLangView('ko')} className={`px-3 py-1 text-[10px] font-bold uppercase rounded-[10px] transition-all ${baseLangView === 'ko' ? 'bg-zinc-700 text-white shadow-sm' : 'text-[#a6a6a6] hover:text-zinc-300'}`}>KO</button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`relative font-mono text-[12px] bg-[#1C1C1C] text-[#a6a6a6] whitespace-pre-wrap leading-[1.625] transition-[max-height] duration-500 ease-in-out overflow-hidden ${isPromptExpanded ? 'max-h-[3000px]' : 'max-h-[220px]'}`}>
                                            <div className="p-6 pb-8">
                                                {baseLangView === 'ko' ? buildPrompts().baseTechnicalKo : buildPrompts().baseTechnicalEn}
                                            </div>
                                            {!isPromptExpanded && (
                                                <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#1C1C1C] via-[#1C1C1C]/80 to-transparent pointer-events-none" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Output Generation Actions */}
                                    <div className="space-y-4">
                                        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto custom-scrollbar pb-2">
                                            <button onClick={() => setAiModel('Overview')} className={`shrink-0 min-w-max px-6 py-3 border rounded-[10px] text-[11px] font-bold tracking-wide transition-all shadow-sm ${aiModel === 'Overview' ? 'border-zinc-500 bg-zinc-800 text-white' : 'border-zinc-800 bg-[#121212] text-[#a6a6a6] hover:bg-[#262626] hover:text-zinc-300'}`}>Overview</button>
                                            {aiOptimizationModels.map(model => (
                                                <button key={model.id} onClick={() => setAiModel(model.id)} className={`shrink-0 min-w-max px-6 py-3 border rounded-[10px] text-[11px] font-bold tracking-wide transition-all shadow-sm ${aiModel === model.id ? 'border-zinc-500 bg-zinc-800 text-white' : 'border-zinc-800 bg-[#121212] text-[#a6a6a6] hover:bg-[#262626] hover:text-zinc-300'}`}>{model.name}</button>
                                            ))}
                                        </div>

                                        {aiModel === 'NanoBanana' && (
                                            <div className="flex flex-nowrap gap-3">
                                                <button onClick={() => requestDramaticEnhancement()} disabled={isEnhancing} title="풍부한 묘사가 포함된 서술형 프롬프트를 생성합니다." className="shrink-0 flex-1 px-6 py-3.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:border-purple-500/50 rounded-[10px] font-bold text-[12px] uppercase flex justify-center items-center gap-2 transition-all shadow-sm">
                                                    {isEnhancing ? <Loader2 className="w-4 h-4 animate-spin text-purple-400" /> : <Stars className="w-4 h-4 text-purple-400" />} 프롬프트 빌드
                                                </button>
                                            </div>
                                        )}
                                        {aiModel === 'Midjourney' && (
                                            <button onClick={() => requestMidjourneyOptimization(false)} disabled={isMjOptimizing} title="미드저니 V6 형식에 맞춘 프롬프트를 생성합니다." className="w-full shrink-0 px-6 py-3.5 bg-purple-600 hover:bg-purple-500 text-white rounded-[10px] font-black text-[12px] uppercase flex justify-center items-center gap-2 transition-all shadow-md">
                                                {isMjOptimizing ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <RefreshCcw className="w-4 h-4 text-white" />} 미드저니 최적화
                                            </button>
                                        )}
                                        {aiModel === 'ChatGPT' && (
                                            <button onClick={() => requestChatGPTEnhancement(false)} disabled={isCgEnhancing} title="DALL-E 3 생성을 위한 자연어 지시문을 생성합니다." className="w-full shrink-0 px-6 py-3.5 bg-purple-600 hover:bg-purple-500 text-white rounded-[10px] font-bold text-[12px] uppercase flex justify-center items-center gap-2 transition-all shadow-sm">
                                                {isCgEnhancing ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Stars className="w-4 h-4 text-white" />} DALL-E 지시문 빌드
                                            </button>
                                        )}
                                    </div>

                                    {renderAiOutputBox(aiModel, buildPrompts().outputContent, false, isOutdated)}

                                </div>
                            </div>
                        </div>
                    </>
                )}

            </main>

            {/* Idea Tuning Room Modal */}
            {isTuningModalOpen && (
                <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-[460px] h-[750px] max-h-[90vh] bg-[#121212] border border-zinc-800 rounded-[10px] shadow-2xl flex flex-col relative overflow-hidden">
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
                            <p className="text-[13px] text-indigo-300 bg-indigo-500/10 leading-relaxed max-h-[150px] overflow-y-auto custom-scrollbar whitespace-pre-wrap px-3 py-2.5 border-l-[3px] border-indigo-500 rounded-[6px]">"{currentTunedAura}"</p>
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
                                        className="w-full bg-[#1C1C1C] border-2 border-zinc-800 rounded-[10px] pl-4 pr-12 py-3.5 text-sm text-zinc-200 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all placeholder:text-zinc-600 shadow-sm"
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
                <div className="fixed inset0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-[460px] h-[750px] max-h-[90vh] bg-[#121212] border border-zinc-800 rounded-[10px] shadow-2xl flex flex-col relative overflow-hidden">
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
                            <p className="text-[13px] text-indigo-300 bg-indigo-500/10 leading-relaxed max-h-[150px] overflow-y-auto custom-scrollbar whitespace-pre-wrap px-3 py-2.5 border-l-[3px] border-indigo-500 rounded-[6px]">"{currentTunedEditAura}"</p>
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
                                        className="w-full bg-[#1C1C1C] border-2 border-zinc-800 rounded-[10px] pl-4 pr-12 py-3.5 text-sm text-zinc-200 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all placeholder:text-zinc-600 shadow-sm"
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
                            <div className={`p-5 rounded-[10px] border ${inspectionResult.hasConflict ? 'bg-[#1C1C1C] border-zinc-600' : 'bg-[#1C1C1C] border-zinc-700'}`}>
                                <h4 className={`text-[12px] font-bold flex items-center gap-2 mb-3 ${inspectionResult.hasConflict ? 'text-zinc-200' : 'text-[#a6a6a6]'}`}>
                                    {inspectionResult.hasConflict ? <><AlertCircle className="w-4 h-4" /> 논리적 충돌 감지됨</> : <><CheckCircle className="w-4 h-4" /> 무결성 검증 완료</>}
                                </h4>
                                <p className="text-[13px] text-[#a6a6a6] leading-relaxed whitespace-pre-wrap">{inspectionResult.analysisMessage}</p>
                            </div>

                            {inspectionResult.hasConflict && inspectionResult.resolutions && inspectionResult.resolutions.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3 px-1">
                                        <Sparkles className="w-4 h-4 text-[#a6a6a6]" />
                                        <h4 className="text-[12px] font-bold text-zinc-300">AI 교정 방향 선택</h4>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        {inspectionResult.resolutions.map((res, idx) => (
                                            <div key={idx} onClick={() => setSelectedResolutionIndex(idx)} className={`p-4 rounded-[10px] border cursor-pointer transition-all ${selectedResolutionIndex === idx ? 'border-purple-500 bg-purple-500/10' : 'border-zinc-800 bg-[#1C1C1C] hover:border-zinc-600'}`}>
                                                <h5 className={`text-[12px] font-bold mb-1.5 ${selectedResolutionIndex === idx ? 'text-purple-300' : 'text-zinc-200'}`}>{res.title}</h5>
                                                <p className="text-[10px] text-[#a6a6a6] leading-relaxed break-keep">{res.desc}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="p-5 bg-[#1C1C1C] border border-zinc-800 rounded-[10px] shadow-inner">
                                        <p className="text-[12px] font-mono text-zinc-400 leading-relaxed whitespace-pre-wrap">{inspectionResult.resolutions[selectedResolutionIndex]?.resolvedPromptKo}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-5 border-t border-zinc-800/60 bg-[#1A1A1A] flex justify-end gap-3 shrink-0">
                            <button onClick={() => setIsInspectorModalOpen(false)} className="px-5 py-2.5 rounded-[10px] text-[12px] font-bold text-[#a6a6a6] hover:text-white hover:bg-zinc-800 transition-colors">
                                닫기
                            </button>
                            {inspectionResult.hasConflict && inspectionResult.resolutions && inspectionResult.resolutions.length > 0 && (
                                <button onClick={() => {
                                    const selectedRes = inspectionResult.resolutions[selectedResolutionIndex];
                                    if (inspectionResult.isEdit) setEditManualBasePrompt({ en: selectedRes.resolvedPromptEn, ko: selectedRes.resolvedPromptKo });
                                    else setManualBasePrompt({ en: selectedRes.resolvedPromptEn, ko: selectedRes.resolvedPromptKo });
                                    setIsInspectorModalOpen(false);
                                }} className="px-6 py-2.5 rounded-[10px] text-[12px] font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md">
                                    선택한 교정안 적용
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default App;