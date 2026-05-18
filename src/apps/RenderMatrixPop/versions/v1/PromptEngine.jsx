/* eslint-disable */
// 버전 스냅샷(아카이브): RenderMatrixPop v1. 이 파일은 의도적으로 동결되어 있어 ESLint 검사에서 제외한다.
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    Smile, Sparkles, Box, Palette, Layers, Star,
    ChevronDown, Copy, RefreshCw, Loader2, Target,
    ScanLine, Wand2, Highlighter, CheckCircle, Flame,
    Check, Info, Download, Terminal, MessageSquare,
    Eraser, ImagePlus, X, AlertCircle, RefreshCcw,
    Layers3, PenTool, ShieldCheck, ActivitySquare, Users,
    ChevronRight, PieChart, Focus, Sliders, Video, Heart, Music,
    Scissors
} from 'lucide-react';

/**
 * Render Matrix: Pop - Version 2.2 (Cinematic Faceted Steal)
 * - 블랙팬서 등 시네마틱 로고 스틸을 위한 '정밀 다각면 세공(FacetedBevel)' 옵션 신설
 * - 비전 AI가 정교하게 깎인 금속/다이아몬드 베벨을 인지하여 자동으로 FacetedBevel을 적용하는 분석 로직 강화
 */

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
    try {
        let clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const startObj = clean.indexOf('{');
        const startArr = clean.indexOf('[');

        if (startObj !== -1 && (startArr === -1 || startObj < startArr)) {
            let end = clean.lastIndexOf('}');
            while (end > startObj) {
                try {
                    return JSON.parse(clean.substring(startObj, end + 1));
                } catch (err) {
                    end = clean.lastIndexOf('}', end - 1);
                }
            }
        } else if (startArr !== -1) {
            let end = clean.lastIndexOf(']');
            while (end > startArr) {
                try {
                    return JSON.parse(clean.substring(startArr, end + 1));
                } catch (err) {
                    end = clean.lastIndexOf(']', end - 1);
                }
            }
        }
        return null;
    } catch (e) {
        return null;
    }
};

const DIRECTOR_PERSONAS = [
    { id: "AutoRef", name: "🖼️ 레퍼런스 무드 (Auto)", desc: "레퍼런스의 장르와 분위기를 100% 그대로 복사", discipline: "MINDSET: 'Match the reference vibe completely'", mj_tags: "", auditRules: { outlineReq: false, depthSafe: false } },
    { id: "CasualUI", name: "📱 모바일 게임 UI 디자이너", desc: "모바일 화면에서 한눈에 띄는 명확하고 경쾌한 타이틀", discipline: "MINDSET: 'Is this highly readable and fun?' PRIORITY: 1. Clarity 2. Brightness 3. Friendly Shapes", mj_tags: "casual mobile game UI logo typography, bright clear cheerful colors, highly legible, clean vector art style, playful energy", auditRules: { outlineReq: true, depthSafe: true } },
    { id: "Sticker", name: "✨ 스티커 공방 장인", desc: "다꾸 스타일의 두꺼운 외곽선과 플랫 컬러", discipline: "MINDSET: 'Can I peel this off and stick it?' PRIORITY: 1. Bold Outline 2. Flat Pop Colors 3. Die-cut Feel", mj_tags: "die-cut sticker graphic design, kawaii cute sticker typography, 2d vector flat style, bold graphic composition", auditRules: { outlineReq: true, depthSafe: false } },
    { id: "Toy", name: "🧸 장난감 연구소장", desc: "피규어나 장난감처럼 통통하고 매끄러운 플라스틱 재질", discipline: "MINDSET: 'Does this feel like a premium blind-box toy?' PRIORITY: 1. Smooth Plastic 2. Soft Gloss 3. Puffy Volume", mj_tags: "designer vinyl toy aesthetic, 3d soft plastic render, smooth rounded glossy typography, bright playful studio lighting", auditRules: { outlineReq: false, depthSafe: true } },
    { id: "Candy", name: "🍬 달콤한 디저트 셰프", desc: "사탕, 젤리, 크림 같은 쫀득하고 투명한 재질감", discipline: "MINDSET: 'Does this look delicious and sweet?' PRIORITY: 1. Translucent Material 2. High Gloss 3. Vibrant Candy Colors", mj_tags: "sweet gummy jelly material, translucent candy text, creamy pastel glossy highlights, delicious 3d food typography", auditRules: { outlineReq: false, depthSafe: true } },
    { id: "Monster", name: "🧟 몬스터 크루 (Halloween)", desc: "슬라임, 호박, 괴물 느낌의 팝한 할로윈/몬스터 타이틀", discipline: "MINDSET: 'Is it spooky but vibrant and cute?' PRIORITY: 1. Slime/Goo 2. Toxic Colors 3. Playful Spooky", mj_tags: "playful spooky monster game typography, gooey slime drips, vibrant toxic colors, halloween pop art style", auditRules: { outlineReq: false, depthSafe: true } }
];

const AI_MODELS = [{ id: 'NanoBanana', name: 'NanoBanana' }, { id: 'ChatGPT', name: 'ChatGPT' }, { id: 'Midjourney', name: 'Midjourney' }];

const PRESET_GROUPS = [
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

const EDIT_BUDGETS = [
    { id: "Locked", name: "Strict Shape (완벽 보존)", en: "Strict shape lock, preserved exact typography silhouette, purely texture swap" },
    { id: "Playful", name: "Playful Remix (둥글기 허용)", en: "Playful remix, soften edges slightly, maintain readability but add cute volume" },
    { id: "Distorted", name: "Surface Glitch/Goo (표면 변형)", en: "Strict shape lock for core readability, apply stylistic glitch, sliced edges, or melting goo ON THE SURFACE AND EDGES, do NOT shatter the main structure" }
];

const QUICK_ADJUSTMENTS = [
    { id: "MAKE_JELLY", label: "🍬 투명한 젤리로 굽기", desc: "재질을 투명하고 달콤한 젤리 텍스처로 변경합니다.", action: { directorPersona: "Candy", baseStyle: "Jelly", outlineStyle: "None", shapeFidelity: "Strict" } },
    { id: "MAKE_STICKER", label: "🏷️ 두꺼운 스티커로 만들기", desc: "다꾸 스티커처럼 두꺼운 흰색 외곽선과 그림자를 추가합니다.", action: { directorPersona: "Sticker", outlineStyle: "ThickSticker", depthStyle: "StickerLift", baseStyle: "FlatColor", shapeFidelity: "Strict" } },
    { id: "MAKE_CHROME", label: "⚡ 쨍한 팝 크롬으로 변경", desc: "화려한 크롬 광택과 두꺼운 3D 볼륨을 줍니다.", action: { directorPersona: "CasualUI", baseStyle: "PopChrome", depthStyle: "Chunky3D", outlineStyle: "None", shapeFidelity: "Strict" } },
    { id: "MAKE_SLIME", label: "🧪 몬스터 슬라임 적용", desc: "글자에 점액질이 묻고 상/하단 재질이 대비되게 합니다.", action: { directorPersona: "Monster", baseStyle: "ToxicSlime", depthStyle: "Chunky3D", outlineStyle: "OrganicBorder", fxStyle: "SlimeDrips", shapeFidelity: "Relaxed" } }
];

const EDIT_QUICK_ADJUSTMENTS = [
    { id: "EDIT_JELLY", label: "🍬 투명한 젤리로 덮어쓰기", desc: "기존 형태를 유지하면서 투명한 젤리 재질로 리믹스합니다.", action: { editBaseStyle: "Jelly", activeEditIntents: { material: true, color: false, outline: false, vfx: false } } },
    { id: "EDIT_STICKER", label: "🏷️ 스티커 외곽선 추가", desc: "기존 로고 주변에 굵은 스티커 외곽선을 추가합니다.", action: { editOutlineStyle: "ThickSticker", activeEditIntents: { material: false, color: false, outline: true, vfx: false } } },
    { id: "EDIT_ORGANIC", label: "🪨 비정형 자연스런 입체", desc: "기계적인 흰선을 없애고 불규칙하고 역동적인 입체 효과를 줍니다.", action: { editOutlineStyle: "OrganicBorder", activeEditIntents: { material: false, color: false, outline: true, vfx: false } } },
    { id: "EDIT_FACETED", label: "💎 정밀 다각면 세공", desc: "보석이나 메탈처럼 날카롭게 세공된 3D 엣지를 줍니다.", action: { editBudget: "Locked", editOutlineStyle: "None", editFxStyle: "None", activeEditIntents: { material: false, color: false, outline: true, vfx: false } } } // Action 맵핑은 아래 depthStyle에서 처리해야하나 편의상 추가
];

const staticOptions = {
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
        { id: "FacetedBevel", name: "💎 정밀 다각면 세공 (Faceted Chiseled)", en: "sharp angled faceted cuts, high-end jewelry chiseling, complex geometric angular relief, diamond-like precision metallic bevel" }, // ✨ 신규 추가: 시네마틱 무비 로고 스틸용
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

const getOptionEn = (list, id) => list.find(o => o.id === id)?.en || String(id);

const combineOptions = (baseList, currentValue, dynamicNames = {}) => {
    if (!currentValue) return baseList;
    if (baseList.find(o => o.id === currentValue)) return baseList;
    return [{ id: currentValue, name: `✨ ${dynamicNames[currentValue] || currentValue}`, en: currentValue }, ...baseList];
};

const ToggleControl = ({ label, desc, enabled, onChange, colorClass = "bg-rose-500" }) => (
    <div onClick={onChange} className={`w-full flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${enabled ? `bg-zinc-900 border-zinc-700 shadow-inner` : `bg-[#18181B] border-zinc-800 hover:border-zinc-600`}`}>
        <div className="flex flex-col">
            <span className={`text-[11px] font-bold transition-colors ${enabled ? 'text-white' : 'text-zinc-300'}`}>{label}</span>
            {desc && <span className="text-[9px] text-zinc-500 mt-0.5">{desc}</span>}
        </div>
        <div className={`w-8 h-4 rounded-full relative transition-colors ${enabled ? colorClass : 'bg-zinc-700'}`}>
            <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all shadow-sm`} style={{ left: enabled ? 'calc(100% - 14px)' : '2px' }} />
        </div>
    </div>
);

const ImageDropzone = ({ image, onClear, onUpload, onDragOver, onDragLeave, onDrop, isDragging, title, sub, icon: Icon, heightClass = "h-36", isLoading = false }) => {
    return (
        <label
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (onDragOver) onDragOver(e); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); if (onDragLeave) onDragLeave(e); }}
            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (onDrop) onDrop(e); }}
            className={`relative border border-dashed rounded-xl flex-1 flex flex-col items-center justify-center transition-all overflow-hidden group cursor-pointer ${heightClass} ${isDragging ? `border-pink-500 bg-pink-500/10` : `border-zinc-700/50 bg-[#18181B] hover:border-zinc-500`}`}
        >
            {isLoading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
                    <Loader2 className="w-6 h-6 text-pink-500 animate-spin mb-2" />
                    <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest">분석 중...</span>
                </div>
            )}
            {image ? (
                <div className="relative w-full h-full p-2 flex flex-col items-center justify-center group-hover:opacity-90 transition-all">
                    <img src={image} className="w-full h-full object-contain drop-shadow-xl pointer-events-none" alt="Source" />
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClear(e); }} className={`absolute top-2 right-2 bg-black/80 hover:bg-zinc-800 text-white p-1.5 rounded-sm backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all shadow-md z-30`}><X className="w-3 h-3" /></button>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-2 opacity-40 pointer-events-none">
                    <Icon className={`w-6 h-6 text-zinc-500`} />
                    <div className="text-center">
                        <p className="text-[9px] font-bold tracking-tight text-center leading-snug text-zinc-400">{title}</p>
                        {sub && <p className="text-[8px] text-zinc-500 mt-0.5">{sub}</p>}
                    </div>
                </div>
            )}
            {!image && <input type="file" onChange={onUpload} className="hidden" accept="image/*" disabled={isLoading} />}
        </label>
    );
};

const DropdownControl = ({ label, icon, data = [], value, onChange, disabled = false, dynamicNames = {} }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClick = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false); };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const combinedData = useMemo(() => combineOptions(data, value, dynamicNames), [data, value, dynamicNames]);
    const selectedOption = combinedData.find(o => o.id === value) || combinedData[0];

    return (
        <div className={`w-full space-y-1.5 relative ${disabled ? 'opacity-40 pointer-events-none' : ''}`} ref={containerRef}>
            {label && <p className="text-[10px] font-bold uppercase tracking-widest pl-1 flex items-center gap-1.5 text-zinc-400">{icon} {label}</p>}
            <button onClick={() => !disabled && setIsOpen(!isOpen)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all bg-[#18181B] text-zinc-200 outline-none ${isOpen ? 'border-pink-500' : 'border-zinc-800 hover:border-zinc-600'}`}>
                <span className="text-[11px] truncate font-bold">{selectedOption.name}</span>
                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className={`absolute left-0 right-0 mt-2 rounded-xl border z-[999] bg-[#121214] border-zinc-700 shadow-2xl`}>
                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar py-1">
                        {combinedData.map(opt => (
                            <div key={opt.id} onClick={() => { onChange(opt.id); setIsOpen(false); }} className={`px-4 py-3 text-[11px] cursor-pointer hover:bg-zinc-800 transition-colors flex justify-between ${value === opt.id ? 'text-pink-400 font-bold' : 'text-zinc-400'}`}>
                                {opt.name} {value === opt.id && <Check className="w-3.5 h-3.5" />}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const performLogicAudit = (state) => {
    const issues = [];
    if (state.currentView === "editor") {
        if (state.outlineStyle === "None" && state.depthStyle === "Flat2D" && state.baseStyle === "FlatColor") {
            issues.push({ code: "TOO_FLAT", title: `가독성 저하 위험`, desc: "외곽선도 없고 입체감도 없으면 배경과 섞여 글자가 안 보일 수 있습니다.", options: [{ label: "A. 스티커 외곽선 추가", action: { outlineStyle: "ThickSticker" } }, { label: "B. 그림자 추가", action: { depthStyle: "SoftShadow" } }] });
        }
        if (state.vfxPassMode && state.fxStyle === "None") {
            issues.push({ code: "VFX_PASS_NO_FX", title: "이펙트 분리 모드 충돌", desc: "이펙트 소스 분리 모드가 켜져있지만, 장식 이펙트가 '없음'입니다. 이펙트를 추가해주세요.", options: [{ label: "A. 반짝임 효과 추가", action: { fxStyle: "Sparkle" } }, { label: "B. 매트 패스 끄기", action: { vfxPassMode: false } }] });
        }
    }
    return issues;
};

const calculateQualityScore = (state) => {
    let structure = 100, cuteFeel = 95, readability = 95, fxControl = 100;
    if (state.currentView === "editor") {
        if (state.shapeFeel === "Balloon") cuteFeel = 100;
        else if (state.shapeFeel === "Original") cuteFeel = 85;

        if (state.outlineStyle !== "None") readability += 5;
        if (state.fxStyle !== "None") { fxControl -= 15; readability -= 10; }

        if (state.baseStyle === "Jelly" && state.depthStyle === "Flat2D") structure -= 15;
        if (state.shapeFidelity === "Relaxed") { structure -= 10; readability -= 5; }
    }
    return { structure: Math.max(0, Math.min(100, structure)), cuteFeel: Math.max(0, Math.min(100, cuteFeel)), readability: Math.max(0, Math.min(100, readability)), fxControl: Math.max(0, Math.min(100, fxControl)) };
};

const getQualityFeedback = (scores) => {
    const minScore = Math.min(scores.structure, scores.cuteFeel, scores.readability, scores.fxControl);
    if (minScore >= 90) return "완벽합니다! 훌륭한 로고 결과물이 예상됩니다.";
    if (scores.structure === minScore) return "형태 보존이 Relaxed 모드입니다. 가독성을 해치지 않게 주의하세요.";
    if (scores.readability === minScore) return "가독성이 다소 낮습니다. 뚜렷한 외곽선(Outline)을 추가해 보세요.";
    if (scores.fxControl === minScore) return "이펙트가 글자를 가릴 위험이 있습니다. 장식을 줄이세요.";
    if (scores.cuteFeel === minScore) return "너무 딱딱해 보일 수 있습니다. '풍선형'이나 '둥근 각'을 적용해보세요.";
    return "설정이 안정적으로 유지되고 있습니다.";
};

const calculatePromptBudget = (state) => {
    let budget = { shape: 40, material: 20, color: 25, env: 15 };
    if (state.currentView === "editor") {
        if (state.fxStyle !== "None") { budget.env += 15; budget.shape -= 10; budget.material -= 5; }
        if (state.outlineStyle !== "None") { budget.shape += 10; budget.color -= 5; budget.env -= 5; }
        if (state.vfxPassMode) { budget.material = 5; budget.shape = 45; budget.env = 50; }
        if (state.shapeFidelity === "Relaxed") { budget.shape -= 10; budget.material += 5; budget.env += 5; }
    } else if (state.currentView === "edit") {
        budget.shape = state.editBudget === "Locked" ? 60 : (state.editBudget === "Playful" ? 45 : 35);
        budget.material = state.activeEditIntents.material ? 25 : 10;
        budget.color = state.activeEditIntents.color ? 20 : 10;
        budget.env = state.activeEditIntents.vfx ? 20 : 10;
        if (state.editVfxPassMode) { budget.material = 5; budget.shape = 45; budget.env = 50; }
    }
    return budget;
};

const ScoreBar = ({ label, score, colorClass }) => (
    <div className="flex flex-col gap-1 w-full">
        <div className="flex justify-between items-center text-[10px] font-bold">
            <span className="text-zinc-400">{label}</span>
            <span className={score >= 90 ? "text-pink-400" : score >= 70 ? "text-amber-400" : "text-rose-400"}>{score}</span>
        </div>
        <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${score}%` }} />
        </div>
    </div>
);

const generateIR = (state) => {
    const { directorPersona, typographyScale, shapeFeel, shapeFidelity, baseStyle, colorPalette, outlineStyle, depthStyle, fxStyle, background, userIntent, hasRefImage, extractedRefDetails, vfxPassMode } = state;

    let ir = {
        _meta: { version: "Pop 2.2", persona: DIRECTOR_PERSONAS.find(p => p.id === directorPersona) || DIRECTOR_PERSONAS[0] },
        subject: {
            type: "logo typography graphic design",
            scale: getOptionEn(staticOptions.typographyScales, typographyScale),
            fidelityId: shapeFidelity,
            fidelity_enforcement: getOptionEn(staticOptions.fidelityLevels, shapeFidelity),
            intent: userIntent || null
        },
        reference: {
            hasRefImage: hasRefImage,
            instruction: hasRefImage ? "CRITICAL: Extract and strictly apply the exact genre vibe, color palette, material finish, and lighting from the provided reference image." : "Use generic colors based on palette selection.",
            extractedDetails: extractedRefDetails || null
        },
        styling: {
            shape: getOptionEn(staticOptions.shapeFeels, shapeFeel),
            material: getOptionEn(staticOptions.baseStyles, baseStyle),
            colors: getOptionEn(staticOptions.colorPalettes, colorPalette),
        },
        structure: {
            outline: getOptionEn(staticOptions.outlineStyles, outlineStyle),
            depth: getOptionEn(staticOptions.depthStyles, depthStyle)
        },
        fx: getOptionEn(staticOptions.fxStyles, fxStyle),
        environment: getOptionEn(staticOptions.backgrounds, background),
        vfxPassMode: vfxPassMode
    };

    if (vfxPassMode) {
        ir.subject.type = "pure pitch-black silhouette typography, holdout matte pass";
        ir.styling.material = "Vantablack, completely light-absorbing black hole material, zero reflections";
        ir.styling.colors = "pure black (#000000)";
        ir.structure.outline = "no outline";
    }

    return ir;
};

const generateEditIR = (state) => {
    const { editBudget, activeEditIntents, editBaseStyle, editColorPalette, editOutlineStyle, editFxStyle, editIntent, editBg, directorPersona, editVfxPassMode, hasRefImage, extractedRefDetails } = state;
    let budgetLevel = EDIT_BUDGETS.find(b => b.id === editBudget) || EDIT_BUDGETS[0];

    let ir = {
        _meta: { mode: "Pop-Remix", version: "Pop 2.2", persona: DIRECTOR_PERSONAS.find(p => p.id === directorPersona) || DIRECTOR_PERSONAS[0] },
        budget: budgetLevel,
        constraints: {
            anti_mutation: budgetLevel.id === "Distorted"
                ? "STRICT RULE: Maintain core readability and structural integrity. Do NOT shatter the letters. Apply stylistic glitch, slicing, or chromatic aberration to the surface and edges only."
                : "STRICT RULE: Use input image as exact structural reference. Do NOT reinterpret letters. NO shape alteration. Maintain exact original silhouette."
        },
        reference: {
            hasRefImage: hasRefImage,
            extractedDetails: extractedRefDetails || null
        },
        intents: activeEditIntents,
        details: {
            material: activeEditIntents.material ? getOptionEn(staticOptions.baseStyles, editBaseStyle) : null,
            color: activeEditIntents.color ? getOptionEn(staticOptions.colorPalettes, editColorPalette) : null,
            outline: activeEditIntents.outline ? getOptionEn(staticOptions.outlineStyles, editOutlineStyle) : null,
            fx: activeEditIntents.vfx || editVfxPassMode ? getOptionEn(staticOptions.fxStyles, editFxStyle) : null
        },
        customIntent: editIntent || "subtle casual polish",
        background: getOptionEn(staticOptions.backgrounds, editBg),
        vfxPassMode: editVfxPassMode
    };

    if (editVfxPassMode) {
        ir.constraints.vfx_pass = "Render the typography as a pure Vantablack (#000000), completely unlit flat 2D shape. ZERO reflections, ZERO highlights. ONLY render the glowing FX surrounding this black void.";
    }

    return ir;
};

// --- ✨ Model Compilers ---
const compileNanoBanana = (ir, state) => {
    const isPopForce = ir._meta.persona.id !== "AutoRef" && ir._meta.persona.id !== "Monster";
    const isVFXPass = ir.vfxPassMode;
    const isRelaxed = ir.subject.fidelityId === "Relaxed";

    if (isVFXPass) {
        const posTags = [
            "masterpiece, best quality, ultra highres",
            "pure pitch-black silhouette typography, holdout matte pass, vantablack text, completely unlit, pure #000000 shape",
            isRelaxed ? "strict shape preservation, highly readable, apply stylistic glitch and sliced edges" : "strict shape preservation, exact typography silhouette",
            ir.subject.fidelity_enforcement.replace("STRICT RULE: ", ""),
            ir.fx !== "no surrounding visual effects, clean isolation" ? ir.fx : "",
            ir.environment,
            ir.subject.intent
        ].filter(Boolean).map(t => t.trim()).join(", ");

        const negTags = [
            "(worst quality, low quality:1.4), text mutation, extra letters, hallucinated text",
            "rim light, edge highlight, glowing edge, 3d, thickness, extrusion, bevel, metallic, reflections, lit text, 3d block",
            "lit text, text texture, outline, border, drop shadow, inner glow"
        ].filter(Boolean).map(t => t.trim()).join(", ");

        return `${posTags}\n\nNegative prompt: ${negTags}`;
    }

    let posTags = [
        "masterpiece, best quality, ultra highres",
        isPopForce ? "mobile game logo typography, casual game UI title, cute text design" : "epic typography graphic design, highly detailed logo",
        isRelaxed ? "strict shape preservation, highly readable, apply stylistic glitch, sliced edges, chromatic aberration" : "strict shape preservation, exact typography silhouette",
        ir.subject.fidelity_enforcement.replace("STRICT RULE: ", ""),
        ir._meta.persona.mj_tags,
        ir.styling.shape,
        ir.styling.material,
        ir.reference.hasRefImage && ir.reference.extractedDetails ? ir.reference.extractedDetails : ir.styling.colors,
        ir.structure.outline,
        ir.structure.depth,
        ir.environment,
        ir.subject.intent
    ];

    if (ir.fx !== "no surrounding visual effects, clean isolation") {
        posTags.push(ir.fx);
    }

    let negTags = [
        "(worst quality, low quality:1.4)",
        isRelaxed ? "unreadable text, completely shattered, destroyed shape, illegible blob, text mutation, extra letters, hallucinated text" : "(text mutation:1.5), (shape alteration:1.5), (different font:1.5), (deformed letters:1.5), altered silhouette, extra letters, hallucinated text, illegible blob, unreadable text, melted together",
        "(photorealistic:1.5), (PBR:1.5), noisy texture, muddy colors, washed out, dull colors",
        "(messy background:1.8), (background clutter:1.8), (background noise:1.8), (complex background details:1.8), (burnt shadows:1.4), muddy shadows, dark extrusion, dirty shadows",
        "plaque, baseplate, signboard, framed, shield",
        "(cheap photoshop bevel:1.5), (perfectly uniform stroke:1.5), (even border thickness:1.5), artificial white outline, perfectly symmetrical, rigid uniform geometry, flat 3d"
    ];

    if (state.outlineStyle === "None") negTags.push("outline, border, stroke, thick lines");
    if (state.depthStyle === "Flat2D") negTags.push("3d block, massive depth, extrusion, heavy bevel");

    if (isPopForce) {
        negTags.push("realistic, dirt, rusty metal, scratched, damaged, dark fantasy, scary, horror, dark cinematic mood");
    }

    const refPrefix = ir.reference.hasRefImage && ir.reference.extractedDetails ? `[Reference Style Override Active]\n\n` : "";
    return `${refPrefix}${posTags.filter(Boolean).map(t => t.trim()).join(", ")}\n\nNegative prompt: ${negTags.filter(Boolean).map(t => t.trim()).join(", ")}`;
};

const compileChatGPT = (ir, state) => {
    const isPopForce = ir._meta.persona.id !== "AutoRef" && ir._meta.persona.id !== "Monster";
    const isVFXPass = ir.vfxPassMode;
    const isRelaxed = ir.subject.fidelityId === "Relaxed";

    if (isVFXPass) {
        return `Create an epic masterpiece image based on the following exact specifications.

### 1. VFX EXTRACTION PASS (CRITICAL)
- **Type**: Pure flat 2D pitch-black silhouette typography.
- **Constraint**: ${ir.subject.fidelity_enforcement}
- **Vibe**: Technical Matte Pass for VFX Compositing.
- **Rule (ABSOLUTE)**: Render the typography as a pure Vantablack (#000000), completely unlit flat 2D shape. STRICTLY FORBIDDEN: Do NOT add any rim lights, edge highlights, 3D thickness, bevels, or reflections to the letters. ONLY render the glowing FX surrounding this black void.

### 2. Surrounding VFX & Environment
- **Decorations**: ${ir.fx}. Ensure FX surrounds the text shape beautifully.
- **Canvas**: ${ir.environment}. CRITICAL: Ensure NO BACKGROUND NOISE or clutter. Keep it strictly clean.`;
    }

    return `Create a masterpiece image based on these exact specifications.
${ir.reference.hasRefImage ? `\n### 0. STYLE REFERENCE OVERRIDE (CRITICAL)\n- Match the overall vibe of the reference image.\n- FORCE THIS MATERIAL, GENRE, AND COLOR: "${ir.reference.extractedDetails}"\n` : ''}
### 1. Core Concept
- **Subject**: ${ir.subject.type}. ${ir.subject.scale}.
- **Vibe**: ${ir._meta.persona.discipline}
- **Constraint**: ${ir.subject.fidelity_enforcement}

### 2. Styling (CRITICAL)
- **Shape Feel**: ${ir.styling.shape}. ${isRelaxed ? "CRITICAL: Maintain absolute readability of the letters. Apply glitch, slice, or shatter effects ONLY to the surface and edges. Do not destroy the core shape." : "CRITICAL: Do NOT alter the fundamental font shape or layout. Keep the silhouette perfectly intact."}
- **Material & Color**: ${ir.reference.hasRefImage && ir.reference.extractedDetails ? `Ignore base material logic. Use ONLY this description: "${ir.reference.extractedDetails}"` : `${ir.styling.material}. ${ir.styling.colors}. Ensure vibrant pop colors.`}
${isPopForce ? `- **Rule**: STRICTLY AVOID gritty, rusty, or dark cinematic textures. Keep it clean and highly stylized.` : `- **Rule**: Fully embrace the genre, mood, and texture defined in the reference extraction. Do not force it to be cute if the reference is dark.`}

### 3. Structure & FX
- **Outline**: ${ir.structure.outline}. AVOID perfectly uniform strokes or cheap photoshop effects unless requested. Ensure a dynamic, organic look.
- **Depth**: ${ir.structure.depth}. Ensure side walls are vibrantly colored. STRICTLY AVOID muddy, dark, or dirty black shadows in the 3D extrusion.
- **Decorations**: ${ir.fx}. Ensure FX does not overpower or cover the main typography.

### 4. Environment
- **Canvas**: ${ir.environment}. CRITICAL RULE: The background MUST BE ABSOLUTELY CLEAN and isolated for easy keying. DO NOT render any background clutter, noise, circuitry, or messy scenery.
${ir.subject.intent ? `\n### 5. Special Intent\n- ${ir.subject.intent}` : ''}`;
};

const compileMidjourney = (ir, state) => {
    const isPopForce = ir._meta.persona.id !== "AutoRef" && ir._meta.persona.id !== "Monster";
    const isVFXPass = ir.vfxPassMode;
    const isRelaxed = ir.subject.fidelityId === "Relaxed";
    const intent = ir.subject.intent ? `, ${ir.subject.intent}` : "";

    if (isVFXPass) {
        const subject = `pure pitch-black silhouette typography, holdout matte pass`;
        const materialMood = `vantablack text, pure #000000 shape, completely unlit text, zero reflections, zero rim light, zero highlights`;
        const lightingFx = `${ir.fx}, ${ir.environment}`;
        const mjNegatives = "--no rim light, edge light, edge highlight, 3d, bevel, thickness, extrusion, metallic, reflections, lit text, text texture, outline, border, background clutter, text mutation ";
        return `/imagine prompt: ${subject}, completely unlit black hole material, zero reflections, zero highlights, ${lightingFx} ${intent} ${mjNegatives}--style raw --v 6.1`.replace(/\s+/g, ' ').replace(/, ,/g, ',');
    }

    const colorAndMaterialTag = ir.reference.hasRefImage && ir.reference.extractedDetails
        ? `${ir.reference.extractedDetails}`
        : [ir.styling.material, ir.styling.colors].filter(Boolean).join(", ");

    const shapeControl = isRelaxed ? "strict shape lock, preserve readability, apply stylistic glitch and slice effects on edges" : "strict shape preservation, exact typography silhouette";
    const subject = `${isPopForce ? "casual mobile game " : ""}logo typography, highly readable vector UI title, ${shapeControl}, ${ir.subject.scale}, ${ir.subject.fidelity_enforcement}`;
    const materialMood = `${ir._meta.persona.discipline}, ${ir._meta.persona.mj_tags}, ${ir.styling.shape}, ${colorAndMaterialTag}`;
    const structFx = `${ir.structure.outline}, ${ir.structure.depth}, ${ir.fx}, isolated on clean solid background, absolutely no background clutter, no background noise, ${ir.environment}`.replace(/^,\s*/, '');

    let mjNegatives = isRelaxed
        ? "--no completely shattered, destroyed shape, unreadable blob, illegible blob, melted together, unreadable text, noisy texture, muddy colors, dull colors, muddy shadows, dark extrusion, plaque, signboard, messy background, background clutter, complex background details "
        : "--no text mutation, shape alteration, different font, deformed letters, altered silhouette, extra letters, illegible blob, melted together, unreadable text, noisy texture, muddy colors, dull colors, muddy shadows, dark extrusion, plaque, signboard, messy background, background clutter, complex background details ";

    if (state.depthStyle === "Flat2D") mjNegatives += "3d block, massive depth, extrusion, heavy bevel ";

    if (isPopForce) {
        mjNegatives += "realistic, gritty, dirt, rusty metal, scratches, dark fantasy, scary, cinematic lighting, ";
    }

    mjNegatives += "uniform stroke, even border thickness, cheap photoshop bevel, flat 3d, artificial white outline, stiff geometry, perfectly symmetrical ";

    const srefTag = ir.reference.hasRefImage ? " --sref [INSERT_REF_IMAGE_URL] --cw 100" : "";

    return `/imagine prompt: ${subject}, ${materialMood}, ${structFx}${intent} ${mjNegatives}--style raw --v 6.1${srefTag}`.replace(/\s+/g, ' ').replace(/, ,/g, ',');
};

// --- ✨ Edit (Remix) Compilers ---
const compileEditNanoBanana = (ir, state) => {
    const isPopForce = ir._meta.persona.id !== "AutoRef" && ir._meta.persona.id !== "Monster";
    const isVFXPass = ir.vfxPassMode;
    const isDistorted = ir.budget.id === "Distorted";

    if (isVFXPass) {
        const posTags = [
            "masterpiece, best quality, ultra highres",
            "pure pitch-black silhouette typography, holdout matte pass, vantablack text, completely unlit, pure #000000 shape",
            ir.details.vfx || "", ir.background, ir.customIntent !== "subtle casual polish" ? ir.customIntent : ""
        ].filter(Boolean).map(t => t.trim()).join(", ");

        const negTags = [
            "(worst quality, low quality:1.4), text mutation, extra letters, hallucinated text",
            "rim light, edge highlight, glowing edge, 3d, thickness, extrusion, bevel, metallic, reflections, lit text, 3d block",
            "lit text, text texture, outline, border, drop shadow, inner glow, lens flare"
        ].filter(Boolean).map(t => t.trim()).join(", ");

        return `${posTags}\n\nNegative prompt: ${negTags}`;
    }

    const posTags = [
        "masterpiece, best quality, ultra highres",
        isPopForce ? "mobile game logo typography, casual game UI title, cute pop design" : "epic typography graphic design, detailed logo",
        "Use the input image as the exact structural reference",
        isDistorted ? "maintain core readability, apply glitch and slice effects on the surface and edges" : "strict shape lock, exact silhouette preservation, preserve the original typography silhouette and spacing",
        ir.budget.en,

        ir.reference.hasRefImage && ir.reference.extractedDetails ? ir.reference.extractedDetails : [
            ir.details.material ? `change material to ${ir.details.material}` : (isPopForce ? "casual vector shading" : ""),
            ir.details.color ? `color palette: ${ir.details.color}` : (isPopForce ? "vivid highly saturated colors" : "")
        ].join(", "),

        ir.details.outline && ir.details.outline !== "AutoRef" ? `apply ${ir.details.outline}` : "",
        ir.details.fx ? `add casual FX: ${ir.details.fx}` : "",
        "isolated on clean solid background",
        ir.customIntent !== "subtle casual polish" ? ir.customIntent : "",
        ir.background
    ].filter(Boolean).map(t => t.trim()).join(", ");

    let negTags = [
        "(worst quality, low quality:1.4)",
        isDistorted ? "completely shattered, destroyed shape, unreadable blob, hallucinated text" : "(text mutation:1.5), (shape alteration:1.5), (different font:1.5), (deformed letters:1.5), extra letters, shape drift, altered silhouette",
        "(photorealistic:1.5), (PBR:1.5), noisy texture, muddy colors, washed out, dull colors, muddy shadows, dark extrusion",
        "(messy background:1.8), (background clutter:1.8), (background noise:1.8)",
        "(cheap photoshop bevel:1.5), (perfectly uniform stroke:1.5), (even border thickness:1.5), artificial white outline, perfectly symmetrical, rigid uniform geometry, flat 3d",
        "plaque, baseplate, signboard, framed, shield"
    ];

    if (isPopForce) {
        negTags.push("gritty, realistic, dirt, rusty metal, scratched, dark fantasy");
    }

    if (!ir.details.outline || ir.details.outline.includes("None")) negTags.push("outline, border, stroke");

    return `${posTags}\n\nNegative prompt: ${negTags.join(", ")}`;
};

const compileEditChatGPT = (ir) => {
    const isPopForce = ir._meta.persona.id !== "AutoRef" && ir._meta.persona.id !== "Monster";
    const isVFXPass = ir.vfxPassMode;
    const isDistorted = ir.budget.id === "Distorted";

    if (isVFXPass) {
        return `Create a Shape-Locked Image-to-Image Remix based on the exact specifications below.

### 1. VFX EXTRACTION PASS (CRITICAL)
- **Type**: Pure flat 2D pitch-black silhouette typography.
- **Vibe**: Technical Matte Pass for VFX Compositing.
- **Rule (ABSOLUTE)**: Render the typography as a pure Vantablack (#000000), completely unlit flat 2D shape. STRICTLY FORBIDDEN: Do NOT add any rim lights, edge highlights, 3D thickness, bevels, or reflections to the letters. ONLY render the glowing FX surrounding this black void.

### 2. Constraints & Integrity
- **Anti-Mutation**: ${ir.constraints.anti_mutation}

### 3. Edit Scope & VFX
- **Surrounding VFX**: ${ir.details.vfx || "No VFX specified."}
- **Custom Directive**: ${ir.customIntent}
- **Background**: Maintain ${ir.background}. Ensure it is completely clean for extraction.`;
    }

    let intentsArr = [];
    if (ir.reference.hasRefImage && ir.reference.extractedDetails) {
        intentsArr.push(`FORCE THIS MATERIAL, GENRE, AND COLOR: "${ir.reference.extractedDetails}"`);
    } else {
        if (ir.details.material) intentsArr.push(`Material Override: ${ir.details.material}`);
        if (ir.details.color) intentsArr.push(`Color Override: ${ir.details.color}`);
    }
    if (ir.details.outline) intentsArr.push(`Outline Style: ${ir.details.outline}`);
    if (ir.details.fx) intentsArr.push(`Casual FX: ${ir.details.fx}`);

    return `Create a Shape-Locked Image-to-Image Remix based on the exact specifications below.

### 1. Structure Reference
- **Reference**: Use the input image as the structural reference.
- **Budget Level**: ${ir.budget.name}. ${ir.budget.en}.
- **Anti-Mutation**: ${ir.constraints.anti_mutation}

### 2. Styling Rules
- **Vibe**: ${isPopForce ? "Casual, cheerful, highly readable pop art / mobile game UI aesthetic." : "Follow the requested artistic direction perfectly."}
${isPopForce ? `- **Material & Texture**: STRICTLY AVOID gritty, realistic, rusty metal, or dark cinematic textures. Keep it clean and stylized.\n- **Color Grading**: Highly saturated, vibrant pop colors.` : ""}
- **Rule**: STRICTLY AVOID cheap uniform strokes, perfectly even borders, and basic photoshop bevels. Give the typography organic, dynamic, and uneven depth/borders. Keep 3D extrusion bright and colorful, NO muddy black shadows.

### 3. Edit Scope & Intents
- **Target Changes**: \n  - ${intentsArr.length > 0 ? intentsArr.join("\n  - ") : "Subtle Polish"}
- **Custom Directive**: ${ir.customIntent}
- **Background**: Maintain ${ir.background}. CRITICAL RULE: The background MUST BE ABSOLUTELY CLEAN and isolated for easy keying. DO NOT render any background clutter, noise, circuitry, or messy scenery. Do NOT render the text on a plaque or shield.

*Ensure the output matches the requested budget level for shape preservation.*`;
};

const compileEditMidjourney = (ir, state) => {
    const isPopForce = ir._meta.persona.id !== "AutoRef" && ir._meta.persona.id !== "Monster";
    const isVFXPass = ir.vfxPassMode;
    const isDistorted = ir.budget.id === "Distorted";

    if (isVFXPass) {
        const subject = `pure pitch-black silhouette typography, holdout matte pass`;
        const lightingFx = `${ir.details.vfx || ""}, ${ir.background}`;
        const mjNegatives = "--no rim light, edge light, edge highlight, 3d, bevel, thickness, extrusion, metallic, reflections, lit text, text texture, outline, border, background clutter, text mutation ";
        return `/imagine prompt: ${subject}, completely unlit black hole material, zero reflections, zero highlights, ${lightingFx} ${mjNegatives}--style raw --v 6.1`.replace(/\s+/g, ' ').replace(/, ,/g, ',');
    }

    let intentsArr = [];
    if (ir.reference.hasRefImage && ir.reference.extractedDetails) {
        intentsArr.push(`match reference style: ${ir.reference.extractedDetails}`);
    } else {
        if (ir.details.material) intentsArr.push(`material shift to ${ir.details.material}`);
        if (ir.details.color) intentsArr.push(`color palette: ${ir.details.color}`);
    }
    if (ir.details.outline && ir.details.outline !== "AutoRef") intentsArr.push(`apply ${ir.details.outline}`);
    if (ir.details.fx) intentsArr.push(`add FX: ${ir.details.fx}`);

    const shapeControl = isDistorted ? "strict shape lock, preserve readability, apply stylistic glitch and slice effects" : "strict shape lock, exact silhouette preservation";
    const subject = `${isPopForce ? "casual game " : ""}logo remix, ${shapeControl}, Use the input image as the structural reference, ${ir.budget.en}`;
    const scope = intentsArr.length > 0 ? intentsArr.join(", ") : (isPopForce ? "casual pop polish" : "subtle polish");
    const custom = ir.customIntent !== "subtle casual polish" ? `, ${ir.customIntent}` : "";

    let mjNegatives = isDistorted
        ? "--no completely shattered, destroyed shape, unreadable blob, muddy colors, dull colors, muddy shadows, dark extrusion, plaque, signboard, messy background, background clutter, complex background details "
        : "--no text mutation, shape alteration, different font, deformed letters, shape drift, altered silhouette, extra letters, unreadable text, muddy colors, dull colors, muddy shadows, dark extrusion, plaque, signboard, messy background, background clutter, complex background details ";

    if (isPopForce) {
        mjNegatives += "realistic, gritty, dirt, rusty metal, scratches, dark fantasy, ";
    }

    mjNegatives += "uniform stroke, even border thickness, cheap photoshop bevel, flat 3d, artificial white outline, stiff geometry, perfectly symmetrical ";

    const mj_iw = ir.budget.id === "Locked" ? "--iw 2.0" : (isDistorted ? "--iw 1.25" : "--iw 1.5");

    return `/imagine prompt: ${subject}, applied ${scope}${custom}, vivid highly saturated colors, isolated on clean solid background, background ${ir.background} ${mjNegatives}${mj_iw} --style raw --v 6.1`.replace(/\s+/g, ' ');
};

const App = () => {
    const [currentView, setCurrentView] = useState("editor");

    // Creation State
    const [directorPersona, setDirectorPersona] = useState("CasualUI");
    const [typographyScale, setTypographyScale] = useState("Macro");
    const [shapeFeel, setShapeFeel] = useState("Original");
    const [shapeFidelity, setShapeFidelity] = useState("Strict");
    const [baseStyle, setBaseStyle] = useState("PopChrome");
    const [colorPalette, setColorPalette] = useState("VividPop");
    const [outlineStyle, setOutlineStyle] = useState("None");
    const [depthStyle, setDepthStyle] = useState("Chunky3D");
    const [fxStyle, setFxStyle] = useState("Sparkle");
    const [background, setBackground] = useState("SolidPop");
    const [userIntent, setUserIntent] = useState("");
    const [vfxPassMode, setVfxPassMode] = useState(false);

    // Reference Image State
    const [refImage, setRefImage] = useState(null);
    const [isDraggingRef, setIsDraggingRef] = useState(false);
    const [isAnalyzingRef, setIsAnalyzingRef] = useState(false);
    const [extractedRefDetails, setExtractedRefDetails] = useState("");

    const [aiModel, setAiModel] = useState("NanoBanana");

    // Micro-Edit State
    const [editImage, setEditImage] = useState(null);
    const [editBudget, setEditBudget] = useState("Locked");
    const [activeEditIntents, setActiveEditIntents] = useState({ material: false, color: false, outline: false, vfx: false });
    const [editBaseStyle, setEditBaseStyle] = useState("Jelly");
    const [editColorPalette, setEditColorPalette] = useState("PastelDream");
    const [editOutlineStyle, setEditOutlineStyle] = useState("CleanStroke");
    const [editFxStyle, setEditFxStyle] = useState("Bubble");
    const [editBg, setEditBg] = useState("Transparent");
    const [editIntent, setEditIntent] = useState("");
    const [editVfxPassMode, setEditVfxPassMode] = useState(false);
    const [isDraggingEdit, setIsDraggingEdit] = useState(false);

    // Output State
    const [currentIR, setCurrentIR] = useState(null);
    const [compiledOutputs, setCompiledOutputs] = useState({ NanoBanana: "", ChatGPT: "", Midjourney: "", Runway: "", Luma: "" });

    const [optimizedPrompts, setOptimizedPrompts] = useState({ NanoBanana: null, ChatGPT: null, Midjourney: null });
    const [isOptimizing, setIsOptimizing] = useState(false);

    const [auditIssues, setAuditIssues] = useState([]);
    const [qualityScores, setQualityScores] = useState({ structure: 100, cuteFeel: 100, readability: 100, fxControl: 100 });
    const [promptBudget, setPromptBudget] = useState({ shape: 40, material: 20, color: 25, env: 15 });
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
        if (activePresetId) {
            setIsPresetModified(true);
        }
        setActiveTroubleshoots([]);
        setTroubleshootHistory({});
        setOptimizedPrompts({ NanoBanana: null, ChatGPT: null, Midjourney: null });
    }

    const analyzeReferenceImage = async (dataUrl) => {
        setIsAnalyzingRef(true);
        setToastMsg("🔍 레퍼런스 이미지의 장르와 디테일을 분석 중입니다...");

        try {
            const [prefix, base64Data] = dataUrl.split(',');
            const mimeType = prefix.match(/:(.*?);/)[1];

            const apiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

            const prompt = `You are an expert game UI and pop-art designer. Analyze this logo image's typography, materials, depth, and effects.
          CRITICAL INSTRUCTION 1: Write a highly detailed English prompt phrase describing the OVERALL GENRE (e.g., 'dark sci-fi cyberpunk', 'glitch art', 'cute pastel pop'), the EXACT material of the text face (e.g., 'bright polished silver chrome text face'), the color and style of the 3D extrusion/sides (e.g., 'thick deep black sides with glowing fiery orange edges'), and any specific lighting or FX.
          CRITICAL INSTRUCTION 2: Does the typography have stylistic distortion, like glitching, sliced letters, or chromatic aberration? Output "Relaxed" for shapeFidelity if it does, otherwise "Strict".
          CRITICAL INSTRUCTION 3: Pay close attention to the uniformity and bevels of the shapes. 
          - If the text has irregular, hand-carved, asymmetrical bevels (like rock or wood), output "OrganicBorder" and "OrganicBevel".
          - If the text has sharp, precision-cut metallic angles like diamond or cinematic movie logos (e.g., Wakanda Forever), output "FacetedBevel" for depthStyle and describe the "sharp chiseled metallic bevels" in the extracted_prompt.
          CRITICAL INSTRUCTION 4 (MULTI-PART TYPOGRAPHY): If the text is split into multiple lines with DIFFERENT materials or colors (e.g., top word is green dripping slime, bottom word is chunky purple block), EXPLICITLY state this split in the extracted_prompt (e.g., 'Two-part typography: top text is dripping toxic green slime, bottom text is purple stone block').
          Respond STRICTLY in JSON format with exactly these keys:
          {
            "shapeFeel": "Original" | "SoftRounded" | "Balloon" | "ClayLike",
            "shapeFidelity": "Strict" | "Relaxed",
            "outlineStyle": "None" | "CleanStroke" | "ThickSticker" | "DoubleOutline" | "SoftShadowOutline" | "OrganicBorder",
            "depthStyle": "Flat2D" | "SoftShadow" | "StickerLift" | "Puffy25D" | "LayeredPaper" | "Chunky3D" | "OrganicBevel" | "FacetedBevel",
            "fxStyle": "None" | "Sparkle" | "Confetti" | "Bubble" | "StarPop" | "HeartPop" | "MagicDust" | "Glitch" | "SlimeDrips",
            "extracted_prompt": "An English phrase strictly describing the overall genre/vibe, the face material(s), and the color/lighting of the 3D extrusion side walls. Detail multi-part colors if necessary. DO NOT describe the background.",
            "intent_ko": "A 1-2 sentence description in Korean"
          }`;

            const payload = {
                contents: [{
                    role: "user",
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType, data: base64Data } }
                    ]
                }],
                generationConfig: { responseMimeType: "application/json" }
            };

            const response = await fetchWithRetry(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

            if (text) {
                const parsed = parseJSON(text);
                if (parsed) {
                    setDirectorPersona("AutoRef");
                    setBaseStyle("AutoRef");
                    setColorPalette("AutoRef");
                    setEditBaseStyle("AutoRef");
                    setEditColorPalette("AutoRef");

                    if (parsed.shapeFeel) setShapeFeel(parsed.shapeFeel);
                    if (parsed.shapeFidelity) setShapeFidelity(parsed.shapeFidelity);
                    if (parsed.outlineStyle) {
                        setOutlineStyle(parsed.outlineStyle);
                        setEditOutlineStyle(parsed.outlineStyle);
                    }
                    if (parsed.depthStyle) setDepthStyle(parsed.depthStyle);
                    if (parsed.fxStyle) {
                        setFxStyle(parsed.fxStyle);
                        setEditFxStyle(parsed.fxStyle);
                    }
                    if (parsed.intent_ko) setUserIntent(parsed.intent_ko);
                    if (parsed.extracted_prompt) setExtractedRefDetails(parsed.extracted_prompt);

                    setActivePresetId(null);

                    if (parsed.depthStyle === "FacetedBevel") {
                        setToastMsg("💎 정밀 세공 감지! 다이아몬드처럼 날카롭게 깎인 시네마틱 입체를 복사합니다.");
                    } else if (parsed.shapeFidelity === "Relaxed") {
                        setToastMsg("💥 실무용 글리치/슬라임(Relaxed) 모드 활성화! 형태는 지키되 표면 효과를 적용합니다.");
                    } else {
                        setToastMsg("✨ 무드 완벽 동기화! 배경 노이즈를 제거하고 텍스트 디테일만 복사했습니다.");
                    }
                    setTimeout(() => setToastMsg(null), 3500);
                }
            }
        } catch (error) {
            console.error("Analysis Error:", error);
            setToastMsg("❌ 이미지 분석에 실패했습니다.");
            setTimeout(() => setToastMsg(null), 3000);
        } finally {
            setIsAnalyzingRef(false);
        }
    };

    const handleRefImageUpload = (file) => {
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = async () => {
            const dataUrl = reader.result;
            setRefImage(dataUrl);
            await analyzeReferenceImage(dataUrl);
        };
        reader.readAsDataURL(file);
    };

    const handleOptimizePrompt = async () => {
        if (!currentIR) return;
        setIsOptimizing(true);

        try {
            const apiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

            const targetPrompt = compiledOutputs[aiModel];
            const currentIntentText = currentView === 'editor' ? userIntent : editIntent;

            const systemPrompt = `You are a world-class AI Prompt Engineer.
Your task is to optimize the given base prompt for a typography graphic.
CRITICAL RULES:
1. If the prompt contains extracted details from a reference image (e.g., "[Reference Style Override Active]"), YOU MUST STRICTLY PRESERVE THOSE DETAILS. Do NOT force the style to be "casual" or "cute" if the reference is epic, metallic, sci-fi, or dark. Enhance the reference's specific vibe instead.
2. If it is purely a "casual pop" prompt without a reference, add powerful negative prompts against gritty textures, rust, horror, and cinematic darkness.
3. ALWAYS enforce a clean, isolated background without any messy details, noise, or clutter to make it easy to extract (mask).

Maintain the model's syntax (e.g., tags and Negative prompt for NanoBanana).
Output JSON with exactly two keys:
"en": The heavily optimized prompt string in English.
"ko": A short Korean explanation of what you optimized.`;

            const payload = {
                contents: [{ role: "user", parts: [{ text: `Model Type: ${aiModel}\nOriginal Custom Intent: ${currentIntentText || "None"}\nBase Prompt to optimize:\n${targetPrompt}` }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
                generationConfig: { responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { en: { type: "STRING" }, ko: { type: "STRING" } }, required: ["en", "ko"] } }
            };

            const result = await fetchWithRetry(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (text) {
                const parsed = parseJSON(text);
                if (parsed && parsed.en) {
                    setOptimizedPrompts(prev => ({ ...prev, [aiModel]: parsed.en }));
                    setToastMsg(`✨ 최적화 완료: ${parsed.ko.substring(0, 30)}...`);
                    setTimeout(() => setToastMsg(null), 4000);
                }
            }
        } catch (err) {
            console.error(err);
            setToastMsg("❌ 최적화 중 오류가 발생했습니다.");
            setTimeout(() => setToastMsg(null), 3000);
        } finally {
            setIsOptimizing(false);
        }
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
            const apiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

            let systemPrompt = `당신은 아트 디렉터입니다. 사용자의 짧은 키워드를 시각적 묘사로 구체화하세요. 3문장 이내(한국어)로 작성하세요.`;

            const payload = { contents: [{ role: "user", parts: [{ text: `Expand this concept in Korean: "${currentIntentText}"` }] }], systemInstruction: { parts: [{ text: systemPrompt }] } };
            const result = await fetchWithRetry(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (text) currentView === 'editor' ? setUserIntent(text.trim()) : setEditIntent(text.trim());
        } catch (err) {
            setToastMsg("❌ 통신에 실패했습니다.");
            setTimeout(() => setToastMsg(null), 3000);
        } finally {
            setIsExpandingIntent(false);
        }
    };

    const openChatModal = () => {
        const currentIntentText = currentView === 'editor' ? userIntent : editIntent;
        setTempIntent(currentIntentText);
        setChatMessages([{ role: 'model', text: currentIntentText ? `현재 의도: "${currentIntentText}"\n어떤 부분을 더 캐주얼하거나 팝하게 바꾸고 싶으신가요? (예: '색감을 더 쨍하게 해줘')` : "어떤 느낌을 원하시는지 자유롭게 말씀해 주세요!" }]);
        setIsChatModalOpen(true);
    };

    const handleSendChatMessage = async () => {
        if (!chatInput.trim()) return;
        const newMessages = [...chatMessages, { role: 'user', text: chatInput }];
        setChatMessages(newMessages);
        setChatInput("");
        setIsChatting(true);

        try {
            const apiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

            const systemPrompt = `당신은 아트 디렉터입니다. 사용자의 피드백을 반영해 텍스트의 재질이나 효과를 보완하세요. 형태 변형 금지.
          반드시 JSON 형식으로 응답: { "message": "친절한 응답", "updated_intent": "수정된 최종 3문장 이내 한글 묘사" }`;

            const payload = {
                contents: newMessages.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] })),
                systemInstruction: { parts: [{ text: systemPrompt }] },
                generationConfig: { responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { message: { type: "STRING" }, updated_intent: { type: "STRING" } }, required: ["message", "updated_intent"] } }
            };

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
            setChatMessages([...newMessages, { role: 'model', text: "오류가 발생했습니다." }]);
        } finally { setIsChatting(false); }
    };

    const applyChatIntent = () => { currentView === 'editor' ? setUserIntent(tempIntent) : setEditIntent(tempIntent); setIsChatModalOpen(false); };

    useEffect(() => {
        const stateObj = {
            currentView, directorPersona, typographyScale, shapeFeel, shapeFidelity, baseStyle, colorPalette, outlineStyle, depthStyle, fxStyle, background, userIntent, vfxPassMode,
            hasRefImage: !!refImage, extractedRefDetails,
            editImage, editBudget, activeEditIntents, editBg, editIntent, editBaseStyle, editColorPalette, editOutlineStyle, editFxStyle, editVfxPassMode
        };

        if (currentView === "editor") {
            const ir = generateIR(stateObj);
            setCurrentIR(ir);
            setCompiledOutputs({ NanoBanana: compileNanoBanana(ir, stateObj), ChatGPT: compileChatGPT(ir, stateObj), Midjourney: compileMidjourney(ir, stateObj) });
        } else if (currentView === "edit") {
            const ir = generateEditIR(stateObj);
            setCurrentIR(ir);
            setCompiledOutputs({
                NanoBanana: !editImage ? "Target 이미지를 업로드해주세요." : compileEditNanoBanana(ir, stateObj),
                ChatGPT: !editImage ? "Target 이미지를 업로드해주세요." : compileEditChatGPT(ir),
                Midjourney: !editImage ? "Target 이미지를 업로드해주세요." : compileEditMidjourney(ir, stateObj)
            });
        }

        setAuditIssues(performLogicAudit(stateObj));
        setQualityScores(calculateQualityScore(stateObj));
        setPromptBudget(calculatePromptBudget(stateObj));

    }, [directorPersona, typographyScale, shapeFeel, shapeFidelity, baseStyle, colorPalette, outlineStyle, depthStyle, fxStyle, background, userIntent, extractedRefDetails, vfxPassMode, currentView, editImage, editBudget, activeEditIntents, editBg, editIntent, editBaseStyle, editColorPalette, editOutlineStyle, editFxStyle, editVfxPassMode]);

    const copyToClipboard = () => {
        const text = optimizedPrompts[aiModel] || compiledOutputs[aiModel];
        if (!text) return;
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try { document.execCommand('copy'); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); } catch (err) { }
        document.body.removeChild(textArea);
    };

    const handleApplyPreset = (preset) => {
        if (!preset) return;

        setRefImage(null);
        setExtractedRefDetails("");

        if (preset.settings.directorPersona) setDirectorPersona(preset.settings.directorPersona);
        if (preset.settings.shapeFeel) setShapeFeel(preset.settings.shapeFeel);
        if (preset.settings.shapeFidelity) setShapeFidelity(preset.settings.shapeFidelity);
        if (preset.settings.baseStyle) setBaseStyle(preset.settings.baseStyle);
        if (preset.settings.colorPalette) setColorPalette(preset.settings.colorPalette);
        if (preset.settings.outlineStyle) setOutlineStyle(preset.settings.outlineStyle);
        if (preset.settings.depthStyle) setDepthStyle(preset.settings.depthStyle);
        if (preset.settings.fxStyle) setFxStyle(preset.settings.fxStyle);
        if (preset.settings.background) setBackground(preset.settings.background);
        if (preset.settings.userIntent !== undefined) setUserIntent(preset.settings.userIntent);

        setActivePresetId(preset.id); setIsPresetModified(false);
        setActiveTroubleshoots([]); setTroubleshootHistory({});
        setOptimizedPrompts({ NanoBanana: null, ChatGPT: null, Midjourney: null });

        setToastMsg(`✨ [${preset.label}] 스타일 적용됨`); setTimeout(() => setToastMsg(null), 3000);
    };

    const stateSetters = {
        directorPersona: setDirectorPersona,
        shapeFeel: setShapeFeel,
        shapeFidelity: setShapeFidelity,
        baseStyle: setBaseStyle,
        colorPalette: setColorPalette,
        outlineStyle: setOutlineStyle,
        depthStyle: setDepthStyle,
        fxStyle: setFxStyle,
        background: setBackground,
        userIntent: setUserIntent,
        typographyScale: setTypographyScale,
        vfxPassMode: setVfxPassMode,
        editVfxPassMode: setEditVfxPassMode,
        editBudget: setEditBudget,
        editBaseStyle: setEditBaseStyle,
        editColorPalette: setEditColorPalette,
        editOutlineStyle: setEditOutlineStyle,
        editFxStyle: setEditFxStyle,
        editBg: setEditBg,
        editIntent: setEditIntent,
        activeEditIntents: setActiveEditIntents
    };
    const currentStateVals = { directorPersona, shapeFeel, shapeFidelity, baseStyle, colorPalette, outlineStyle, depthStyle, fxStyle, background, userIntent, typographyScale, vfxPassMode, editVfxPassMode, editBudget, editBaseStyle, editColorPalette, editOutlineStyle, editFxStyle, editBg, editIntent, activeEditIntents };

    const applyAction = (opt, isTroubleshoot = false) => {
        if (!opt || !opt.action) return;
        setOptimizedPrompts({ NanoBanana: null, ChatGPT: null, Midjourney: null });

        if (isTroubleshoot && opt.id && activeTroubleshoots.includes(opt.id)) {
            const historyToRestore = troubleshootHistory[opt.id];
            if (historyToRestore) {
                Object.keys(historyToRestore).forEach(key => {
                    const setter = stateSetters[key];
                    if (setter && typeof setter === 'function') {
                        setter(historyToRestore[key]);
                    }
                });
            }
            setActiveTroubleshoots(prev => prev.filter(id => id !== opt.id));
            if (opt.label) { setToastMsg(`↩️ '${opt.label.split(' ').slice(1).join(' ')}' 조치 해제됨`); setTimeout(() => setToastMsg(null), 3000); }
            return;
        }

        const action = opt.action;
        if (isTroubleshoot && opt.id) {
            const historyToSave = {};
            Object.keys(action).forEach(key => {
                if (currentStateVals[key] !== undefined) {
                    historyToSave[key] = currentStateVals[key];
                }
            });
            setTroubleshootHistory(prev => ({ ...prev, [opt.id]: historyToSave }));
            setActiveTroubleshoots(prev => [...prev, opt.id]);
        }

        Object.keys(action).forEach(key => {
            const setter = stateSetters[key];
            if (setter && typeof setter === 'function') {
                setter(action[key]);
            }
        });

        if (activePresetId) setIsPresetModified(true);
        if (opt.label) { setToastMsg(`✅ '${opt.label.split(' ').slice(1).join(' ')}' 조치 반영됨`); setTimeout(() => setToastMsg(null), 3000); }
    };

    const handleEditFile = (file) => { if (file && file.type.startsWith('image/')) { const reader = new FileReader(); reader.onloadend = () => setEditImage(reader.result); reader.readAsDataURL(file); } };

    return (
        <div className="flex flex-col h-screen bg-[#09090B] text-zinc-100 p-5 overflow-hidden" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap');
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(236, 72, 153, 0.2); border-radius: 4px; transition: background 0.2s; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(236, 72, 153, 0.5); }
      `}</style>

            {toastMsg && (
                <div className={`fixed top-8 left-1/2 -translate-x-1/2 text-white px-6 py-3 rounded-full font-bold text-[12px] shadow-2xl z-[1000] flex items-center gap-2 animate-in slide-in-from-top-4 fade-in whitespace-nowrap border backdrop-blur-md transition-colors ${toastMsg.includes('해제') ? 'bg-zinc-800/90 border-zinc-600' : 'bg-pink-500/90 border-pink-400/50'}`}>
                    {toastMsg.includes('해제') ? <RefreshCw className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
                    {toastMsg}
                </div>
            )}

            {isChatModalOpen && (
                <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className={`max-w-md w-full h-[600px] flex flex-col bg-[#121214] border border-pink-900/50 rounded-[2rem] shadow-[0_0_50px_rgba(236,72,153,0.1)] relative overflow-hidden`}>
                        <div className={`p-5 border-b border-zinc-800/50 flex items-center justify-between shrink-0`}>
                            <h3 className={`text-white text-[14px] font-bold flex items-center gap-2`}><MessageSquare className={`w-4 h-4 text-pink-400`} /> Pop Tuning Room</h3>
                            <button onClick={() => setIsChatModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div className={`px-5 py-4 bg-[#18181B] border-b border-zinc-800/50 shrink-0 max-h-[140px] overflow-y-auto custom-scrollbar`}>
                            <p className={`text-[10px] font-bold text-pink-400 uppercase tracking-widest mb-1.5 flex items-center gap-1`}><Highlighter className="w-3 h-3" /> 적용 예정 묘사</p>
                            <p className={`text-zinc-300 font-normal break-keep-all leading-relaxed text-[12px]`}>{tempIntent || "어떤 느낌을 원하시는지 말씀해주세요!"}</p>
                        </div>
                        <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-[#121214]">
                            {chatMessages.map((msg, idx) => (
                                <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-md ${msg.role === 'user' ? 'bg-zinc-800 text-white rounded-br-sm' : 'bg-pink-950/30 text-zinc-300 rounded-bl-sm border border-pink-500/20'}`}>
                                        <span className="whitespace-pre-wrap font-normal">{msg.text}</span>
                                    </div>
                                </div>
                            ))}
                            {isChatting && <div className="text-[12px] text-zinc-500 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin text-pink-500" />수정 중...</div>}
                        </div>
                        <div className={`p-4 bg-[#121214] flex flex-col gap-3 shrink-0 border-t border-zinc-800/50`}>
                            <div className="flex gap-2 relative">
                                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSendChatMessage(); }} placeholder="Type a message..." className={`flex-1 bg-[#1A1A1E] border border-zinc-800 rounded-full pl-5 pr-14 py-3 text-[13px] text-white font-normal outline-none focus:border-pink-500/50 transition-all placeholder:text-zinc-600`} disabled={isChatting} />
                            </div>
                            <button onClick={applyChatIntent} disabled={isChatting} className={`w-full py-3.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-[12px] font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-2 border-none`}>
                                <Check className="w-4 h-4" /> 묘사 반영
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-1 flex gap-5 h-full overflow-hidden">

                {/* SIDEBAR */}
                <aside className="w-[340px] bg-[#18181B] border border-zinc-800 rounded-2xl flex flex-col shrink-0 shadow-2xl overflow-y-auto custom-scrollbar relative z-10">
                    <div className="p-6 border-b border-zinc-800">
                        <h1 className="text-xl font-black text-white">Render Matrix: <span className="text-pink-400">Pop</span></h1>
                        <span className="text-[10px] font-bold text-zinc-500">v2.2 - Cinematic Faceted Steal</span>
                    </div>

                    <div className="p-6 space-y-6">

                        <div className="flex bg-[#121214] p-1.5 rounded-xl border border-zinc-800/80 shadow-inner">
                            <button onClick={() => setCurrentView('editor')} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[11px] font-bold transition-all ${currentView === 'editor' ? 'bg-[#27272A] text-white shadow-sm border border-zinc-700/50' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                <PenTool className="w-3.5 h-3.5 shrink-0" /> Pop Creation
                            </button>
                            <button onClick={() => setCurrentView('edit')} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[11px] font-bold transition-all ${currentView === 'edit' ? 'bg-[#27272A] text-white shadow-sm border border-zinc-700/50' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                <Eraser className="w-3.5 h-3.5 shrink-0" /> Pop Remix
                            </button>
                        </div>

                        {currentView === "editor" && (
                            <>
                                {/* Persona */}
                                <div className={`space-y-3 p-4 transition-all ${directorPersona === 'AutoRef' ? 'bg-emerald-950/10 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-pink-950/10 border border-pink-500/20'} rounded-xl relative`}>
                                    <div className="flex items-center gap-2 mb-2 relative z-10">
                                        <Smile className={`w-4 h-4 ${directorPersona === 'AutoRef' ? 'text-emerald-400' : 'text-pink-400'}`} />
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${directorPersona === 'AutoRef' ? 'text-emerald-400' : 'text-pink-400'}`}>
                                            AI Director Persona {directorPersona === 'AutoRef' && '(Auto)'}
                                        </span>
                                    </div>
                                    <DropdownControl data={DIRECTOR_PERSONAS.map(p => ({ id: p.id, name: p.name }))} value={directorPersona} onChange={handleChange(setDirectorPersona)} disabled={vfxPassMode} />
                                </div>

                                {/* Reference Image Upload */}
                                <div className={`space-y-3 pt-2 transition-opacity ${vfxPassMode ? 'opacity-30 pointer-events-none' : ''}`}>
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2 text-zinc-400">
                                            <ImagePlus className="w-4 h-4 shrink-0" />
                                            <h3 className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Style/Color Reference</h3>
                                        </div>
                                        {refImage && !isAnalyzingRef && <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">Auto Override</span>}
                                    </div>
                                    <ImageDropzone
                                        image={refImage}
                                        isLoading={isAnalyzingRef}
                                        onClear={(e) => {
                                            e.stopPropagation();
                                            setRefImage(null);
                                            setExtractedRefDetails("");
                                            setShapeFidelity("Strict");
                                            if (directorPersona === "AutoRef") setDirectorPersona("CasualUI");
                                            if (baseStyle === "AutoRef") { setBaseStyle("PopChrome"); setEditBaseStyle("PopChrome"); }
                                            if (colorPalette === "AutoRef") { setColorPalette("VividPop"); setEditColorPalette("VividPop"); }
                                        }}
                                        onUpload={(e) => handleRefImageUpload(e.target.files[0])}
                                        onDragOver={(e) => { e.preventDefault(); setIsDraggingRef(true); }}
                                        onDragLeave={(e) => { e.preventDefault(); setIsDraggingRef(false); }}
                                        onDrop={(e) => { e.preventDefault(); setIsDraggingRef(false); handleRefImageUpload(e.dataTransfer.files[0]); }}
                                        isDragging={isDraggingRef}
                                        title="COLOR & STYLE UPLOAD"
                                        sub="가져오고 싶은 색감이나 분위기 이미지"
                                        icon={Palette}
                                        heightClass="h-28"
                                    />
                                </div>

                                {/* Presets - ✨ Ref 이미지가 있을 때 시각적으로 비활성화 */}
                                <div className={`transition-all duration-300 ${refImage ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2 pl-1 flex justify-between items-center">
                                        Theme Presets
                                        {refImage && <span className="text-[8px] text-amber-500 font-normal normal-case">레퍼런스 모드 작동 중</span>}
                                    </label>
                                    <div className="flex gap-1 bg-[#121214] p-1 rounded-xl border border-zinc-800/80 mb-2 shadow-inner">
                                        {PRESET_GROUPS.map(group => (
                                            <button key={group.id} onClick={() => setActivePresetGroup(group.id)} className={`flex-1 text-[10px] py-2 rounded-lg transition-colors font-bold flex items-center justify-center gap-1 ${activePresetGroup === group.id ? 'bg-[#27272A] text-white shadow-sm border border-zinc-700/50' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                                {group.icon} {group.name}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex flex-col gap-1.5 p-2 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                                        {PRESET_GROUPS.find(g => g.id === activePresetGroup)?.presets.map(p => {
                                            const isSelected = activePresetId === p.id && !refImage;
                                            return (
                                                <button key={p.id} onClick={() => handleApplyPreset(p)} className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all group flex flex-col gap-0.5 ${isSelected ? (isPresetModified ? 'bg-amber-950/20 border-amber-500/40 shadow-sm' : 'bg-pink-950/20 border-pink-500/40 shadow-sm') : 'bg-[#1A1A1E] hover:bg-zinc-800 border-zinc-800 hover:border-zinc-600 text-zinc-300'}`}>
                                                    <div className="flex items-center justify-between w-full">
                                                        <span className={`text-[11px] font-bold transition-colors flex items-center gap-1.5 ${isSelected ? (isPresetModified ? 'text-amber-400' : 'text-pink-400') : 'text-white'}`}>
                                                            {isSelected && !isPresetModified && <CheckCircle className="w-3.5 h-3.5" />} {p.label}
                                                        </span>
                                                    </div>
                                                    <span className="text-[9px] text-zinc-500 truncate w-full">{p.settings.userIntent}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Custom Intent */}
                                <div className="space-y-1 pt-2">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Custom Directive</label>
                                    <div className="w-full flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl focus-within:border-pink-500 transition-all shadow-inner">
                                        <textarea value={userIntent} onChange={e => handleChange(setUserIntent)(e.target.value)} placeholder="원하는 분위기 (예: 슬라임처럼 녹아내리는 느낌)" className="w-full h-16 bg-transparent p-3 text-[11px] outline-none resize-none text-zinc-300 custom-scrollbar placeholder:text-zinc-600" />
                                        <div className="flex justify-end gap-1 p-1 bg-transparent border-t border-zinc-800">
                                            <button onClick={handleExpandIntent} disabled={isExpandingIntent || !userIntent} className="p-1.5 text-zinc-400 hover:text-pink-400" title="구체화"><Sparkles className="w-3.5 h-3.5" /></button>
                                            <button onClick={openChatModal} className="p-1.5 text-zinc-400 hover:text-pink-400"><MessageSquare className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </div>
                                </div>

                                {/* Shape Feel */}
                                <div className={`space-y-3 p-4 bg-orange-950/10 border border-orange-500/20 rounded-xl transition-opacity ${vfxPassMode ? 'opacity-30 pointer-events-none' : ''}`}>
                                    <div className="flex items-center gap-2 text-orange-400 mb-2">
                                        <Box className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Shape Feel (형태감)</span>
                                    </div>
                                    <DropdownControl label="Scale (화면 비중)" data={staticOptions.typographyScales} value={typographyScale} onChange={handleChange(setTypographyScale)} />
                                    <DropdownControl label="Corner & Volume (표면 볼륨)" data={staticOptions.shapeFeels} value={shapeFeel} onChange={handleChange(setShapeFeel)} />

                                    {/* ✨ 형태 보존력 분리 */}
                                    <div className="pt-2 border-t border-orange-500/20">
                                        <DropdownControl label="Shape Fidelity (형태 보존력)" data={staticOptions.fidelityLevels} value={shapeFidelity} onChange={handleChange(setShapeFidelity)} />
                                    </div>
                                </div>

                                {/* Color & Material */}
                                <div className={`space-y-3 p-4 transition-all ${baseStyle === 'AutoRef' ? 'bg-emerald-950/10 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-cyan-950/10 border border-cyan-500/20'} rounded-xl ${vfxPassMode ? 'opacity-30 pointer-events-none' : ''}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Palette className={`w-4 h-4 ${baseStyle === 'AutoRef' ? 'text-emerald-400' : 'text-cyan-400'}`} />
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${baseStyle === 'AutoRef' ? 'text-emerald-400' : 'text-cyan-400'}`}>Color & Material (재질)</span>
                                    </div>
                                    <DropdownControl label="Base Material (베이스 재질)" data={staticOptions.baseStyles} value={baseStyle} onChange={handleChange(setBaseStyle)} disabled={baseStyle === 'AutoRef'} />
                                    <DropdownControl label="Color Palette (색상 팔레트)" data={staticOptions.colorPalettes} value={colorPalette} onChange={handleChange(setColorPalette)} disabled={colorPalette === 'AutoRef'} />
                                </div>

                                {/* Outline & Depth */}
                                <div className={`space-y-3 transition-opacity ${vfxPassMode ? 'opacity-30 pointer-events-none' : ''}`}>
                                    <DropdownControl label="Outline Style (외곽선)" data={staticOptions.outlineStyles} value={outlineStyle} onChange={handleChange(setOutlineStyle)} />
                                    <DropdownControl label="Depth & Shadow (입체/그림자)" data={staticOptions.depthStyles} value={depthStyle} onChange={handleChange(setDepthStyle)} />
                                </div>

                                {/* Decorations & Env */}
                                <div className="space-y-3 pt-4 border-t border-zinc-800">
                                    <DropdownControl label="Decoration FX (장식 이펙트)" data={staticOptions.fxStyles} value={fxStyle} onChange={handleChange(setFxStyle)} />

                                    <ToggleControl
                                        label="VFX 소스 분리 렌더링 모드"
                                        desc="타이포를 블랙아웃시키고 이펙트만 추출합니다."
                                        enabled={vfxPassMode}
                                        onChange={() => handleChange(setVfxPassMode)(!vfxPassMode)}
                                        colorClass="bg-pink-500"
                                    />

                                    <DropdownControl label="Background (배경)" data={staticOptions.backgrounds} value={background} onChange={handleChange(setBackground)} />
                                </div>
                            </>
                        )}

                        {currentView === "edit" && (
                            <>
                                {/* Edit 모드 VFX 분리 매트 패스 */}
                                <div className="space-y-3">
                                    <div
                                        onClick={() => handleChange(setEditVfxPassMode)(!editVfxPassMode)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all shadow-md group ${editVfxPassMode ? 'bg-pink-500/20 border-pink-500/50' : 'bg-black/30 border-zinc-700/50 hover:bg-black/50 hover:border-zinc-500'}`}
                                    >
                                        <div className={`p-1.5 rounded-lg ${editVfxPassMode ? 'bg-pink-500' : 'bg-zinc-800'}`}>
                                            <Scissors className={`w-4 h-4 ${editVfxPassMode ? 'text-white' : 'text-zinc-400'}`} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`text-[11px] font-bold ${editVfxPassMode ? 'text-pink-400' : 'text-zinc-300'}`}>VFX 소스 분리 매트 패스</span>
                                            <span className="text-[9px] text-zinc-500">타이포를 블랙아웃하고 이펙트만 추출</span>
                                        </div>
                                        <div className={`ml-auto w-3 h-3 rounded-full border ${editVfxPassMode ? 'border-pink-400 bg-pink-400' : 'border-zinc-600 bg-transparent'}`} />
                                    </div>

                                    <div className={`space-y-3 p-4 transition-all ${directorPersona === 'AutoRef' ? 'bg-emerald-950/10 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-pink-950/10 border border-pink-500/20'} rounded-xl relative ${editVfxPassMode ? 'opacity-30 pointer-events-none' : ''}`}>
                                        <div className="flex items-center gap-2 mb-2 relative z-10">
                                            <Smile className={`w-4 h-4 ${directorPersona === 'AutoRef' ? 'text-emerald-400' : 'text-pink-400'}`} />
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${directorPersona === 'AutoRef' ? 'text-emerald-400' : 'text-pink-400'}`}>
                                                AI Director Persona {directorPersona === 'AutoRef' && '(Auto)'}
                                            </span>
                                        </div>
                                        <DropdownControl data={DIRECTOR_PERSONAS.map(p => ({ id: p.id, name: p.name }))} value={directorPersona} onChange={handleChange(setDirectorPersona)} />
                                    </div>

                                    <ImageDropzone image={editImage} onClear={(e) => { e.stopPropagation(); setEditImage(null); }} onUpload={(e) => { if (e.target.files[0]) { const r = new FileReader(); r.onload = () => setEditImage(r.result); r.readAsDataURL(e.target.files[0]); } }} onDragOver={(e) => { e.preventDefault(); setIsDraggingEdit(true); }} onDragLeave={(e) => { e.preventDefault(); setIsDraggingEdit(false); }} onDrop={(e) => { e.preventDefault(); setIsDraggingEdit(false); if (e.dataTransfer.files[0]) { const r = new FileReader(); r.onload = () => setEditImage(r.result); r.readAsDataURL(e.dataTransfer.files[0]); } }} isDragging={isDraggingEdit} title="TARGET UPLOAD" sub="리믹스할 원본 로고 이미지" icon={ImagePlus} heightClass="h-40" />
                                </div>

                                <div className="space-y-1 pt-4 border-t border-zinc-800/80">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Custom Directive</label>
                                    <div className="w-full flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl focus-within:border-pink-500 shadow-inner">
                                        <textarea value={editIntent} onChange={e => handleChange(setEditIntent)(e.target.value)} placeholder="원하는 분위기..." className="w-full h-16 bg-transparent p-3 text-[11px] outline-none resize-none text-zinc-300 custom-scrollbar" />
                                    </div>
                                </div>

                                <div className={`pt-4 border-t border-zinc-800/80 space-y-3 ${editVfxPassMode ? 'opacity-30 pointer-events-none' : ''}`}>
                                    <DropdownControl label="Edit Budget (형태 변형 허용)" data={EDIT_BUDGETS} value={editBudget} onChange={handleChange(setEditBudget)} />
                                </div>

                                <div className="pt-4 border-t border-zinc-800/80 space-y-3">
                                    <div className="flex items-center gap-2 text-zinc-400 mb-2">
                                        <Layers className="w-4 h-4 shrink-0" />
                                        <h3 className="text-[10px] font-bold uppercase tracking-widest">Edit Scope (레이어)</h3>
                                    </div>
                                    <div className="flex flex-col gap-2">

                                        <div className={`rounded-xl border transition-all ${activeEditIntents.material ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'} ${editVfxPassMode ? 'hidden' : ''}`}>
                                            <div onClick={() => handleChange(setActiveEditIntents)(p => ({ ...p, material: !p.material }))} className="p-3 cursor-pointer flex items-center justify-between group">
                                                <div className="flex items-center gap-3"><Palette className={`w-4 h-4 ${activeEditIntents.material ? 'text-cyan-400' : 'text-zinc-500'}`} />
                                                    <div className="flex flex-col"><span className={`text-[11px] font-bold ${activeEditIntents.material ? 'text-white' : 'text-zinc-300'}`}>재질 덮어쓰기</span></div>
                                                </div>
                                                <div className={`w-3 h-3 rounded-full border ${activeEditIntents.material ? 'border-cyan-400 bg-cyan-400' : 'border-zinc-600 bg-transparent'}`} />
                                            </div>
                                            {activeEditIntents.material && (
                                                <div className="p-3 bg-black/20 border-t border-cyan-500/20 space-y-3">
                                                    <DropdownControl label="Target Material" data={staticOptions.baseStyles.filter(s => s.id !== 'AutoRef')} value={editBaseStyle} onChange={handleChange(setEditBaseStyle)} />
                                                </div>
                                            )}
                                        </div>

                                        <div className={`rounded-xl border transition-all ${activeEditIntents.color ? 'bg-orange-500/10 border-orange-500/50' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'} ${editVfxPassMode ? 'hidden' : ''}`}>
                                            <div onClick={() => handleChange(setActiveEditIntents)(p => ({ ...p, color: !p.color }))} className="p-3 cursor-pointer flex items-center justify-between group">
                                                <div className="flex items-center gap-3"><Smile className={`w-4 h-4 ${activeEditIntents.color ? 'text-orange-400' : 'text-zinc-500'}`} />
                                                    <div className="flex flex-col"><span className={`text-[11px] font-bold ${activeEditIntents.color ? 'text-white' : 'text-zinc-300'}`}>색상 팔레트</span></div>
                                                </div>
                                                <div className={`w-3 h-3 rounded-full border ${activeEditIntents.color ? 'border-orange-400 bg-orange-400' : 'border-zinc-600 bg-transparent'}`} />
                                            </div>
                                            {activeEditIntents.color && (
                                                <div className="p-3 bg-black/20 border-t border-orange-500/20 space-y-3">
                                                    <DropdownControl label="Target Colors" data={staticOptions.colorPalettes.filter(s => s.id !== 'AutoRef')} value={editColorPalette} onChange={handleChange(setEditColorPalette)} />
                                                </div>
                                            )}
                                        </div>

                                        <div className={`rounded-xl border transition-all ${activeEditIntents.outline ? 'bg-pink-500/10 border-pink-500/50' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'} ${editVfxPassMode ? 'hidden' : ''}`}>
                                            <div onClick={() => handleChange(setActiveEditIntents)(p => ({ ...p, outline: !p.outline }))} className="p-3 cursor-pointer flex items-center justify-between group">
                                                <div className="flex items-center gap-3"><Box className={`w-4 h-4 ${activeEditIntents.outline ? 'text-pink-400' : 'text-zinc-500'}`} />
                                                    <div className="flex flex-col"><span className={`text-[11px] font-bold ${activeEditIntents.outline ? 'text-white' : 'text-zinc-300'}`}>외곽선 변경</span></div>
                                                </div>
                                                <div className={`w-3 h-3 rounded-full border ${activeEditIntents.outline ? 'border-pink-400 bg-pink-400' : 'border-zinc-600 bg-transparent'}`} />
                                            </div>
                                            {activeEditIntents.outline && (
                                                <div className="p-3 bg-black/20 border-t border-pink-500/20 space-y-3">
                                                    <DropdownControl label="Outline" data={staticOptions.outlineStyles} value={editOutlineStyle} onChange={handleChange(setEditOutlineStyle)} />
                                                </div>
                                            )}
                                        </div>

                                        <div className={`rounded-xl border transition-all ${activeEditIntents.vfx || editVfxPassMode ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'}`}>
                                            <div onClick={() => !editVfxPassMode && handleChange(setActiveEditIntents)(p => ({ ...p, vfx: !p.vfx }))} className="p-3 cursor-pointer flex items-center justify-between group">
                                                <div className="flex items-center gap-3"><Star className={`w-4 h-4 ${activeEditIntents.vfx || editVfxPassMode ? 'text-indigo-400' : 'text-zinc-500'}`} />
                                                    <div className="flex flex-col"><span className={`text-[11px] font-bold ${activeEditIntents.vfx || editVfxPassMode ? 'text-white' : 'text-zinc-300'}`}>장식/이펙트</span></div>
                                                </div>
                                                <div className={`w-3 h-3 rounded-full border ${activeEditIntents.vfx || editVfxPassMode ? 'border-indigo-400 bg-indigo-400' : 'border-zinc-600 bg-transparent'}`} />
                                            </div>
                                            {(activeEditIntents.vfx || editVfxPassMode) && (
                                                <div className="p-3 bg-black/20 border-t border-indigo-500/20 space-y-3">
                                                    <DropdownControl label="FX Style" data={staticOptions.fxStyles} value={editFxStyle} onChange={handleChange(setEditFxStyle)} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-zinc-800/80 space-y-3">
                                    <DropdownControl label="Background" data={staticOptions.backgrounds} value={editBg} onChange={handleChange(setEditBg)} />
                                </div>
                            </>
                        )}
                    </div>
                </aside>

                {/* WORKSPACE */}
                <div className="flex-1 flex flex-col gap-5 overflow-hidden">

                    {/* TOP PANELS */}
                    <div className="grid grid-cols-3 gap-5 h-[280px] shrink-0">

                        {/* 1. Audit Viewer */}
                        <div className="bg-[#18181B] border border-zinc-800 rounded-2xl p-5 flex flex-col overflow-y-auto custom-scrollbar relative">
                            <div className="flex items-center gap-2 mb-4 text-pink-400 shrink-0">
                                <ShieldCheck className="w-4 h-4" />
                                <h2 className="text-[11px] font-black uppercase tracking-widest">Logic Audit</h2>
                            </div>
                            {auditIssues.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-[11px] font-bold bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-6 text-center leading-relaxed">
                                    <CheckCircle className="w-6 h-6 text-pink-500/20 mb-2" />
                                    충돌 없음.<br />명확하고 경쾌한 조형입니다.
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

                        {/* 2. Quality Score Viewer */}
                        <div className="bg-[#18181B] border border-zinc-800 rounded-2xl p-5 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
                            <div className="flex items-center gap-2 mb-4 text-cyan-400 shrink-0">
                                <ActivitySquare className="w-4 h-4" />
                                <h2 className="text-[11px] font-black uppercase tracking-widest">Pop Quality</h2>
                            </div>
                            <div className="flex-1 flex flex-col justify-center gap-3 bg-black/20 p-4 rounded-xl border border-zinc-800/50">
                                <ScoreBar label="귀여운 형태 (Cute Feel)" score={qualityScores.cuteFeel} colorClass="bg-orange-400" />
                                <ScoreBar label="판독/가시성 (Readability)" score={qualityScores.readability} colorClass="bg-blue-400" />
                                <ScoreBar label="장식 절제 (FX Control)" score={qualityScores.fxControl} colorClass="bg-pink-400" />
                                <ScoreBar label="재질 통합 (Structure)" score={qualityScores.structure} colorClass="bg-emerald-400" />
                            </div>

                            <div className="mt-3 flex items-start gap-2 bg-cyan-950/20 border border-cyan-500/20 p-3 rounded-lg">
                                <ChevronRight className="w-3 h-3 text-cyan-400 mt-0.5 shrink-0" />
                                <p className="text-[10px] text-cyan-200 leading-snug font-medium">
                                    {getQualityFeedback(qualityScores)}
                                </p>
                            </div>
                        </div>

                        {/* 3. Quick Adjustments */}
                        <div className="bg-[#1E1B24] border border-pink-900/30 rounded-2xl p-5 flex flex-col shrink-0 shadow-[inset_0_0_40px_rgba(236,72,153,0.03)] relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none"><Music className="w-20 h-20 text-pink-500" /></div>
                            <div className="flex items-center gap-2 mb-4 text-pink-400 shrink-0 relative z-10">
                                <Sliders className="w-4 h-4" />
                                <h2 className="text-[11px] font-black uppercase tracking-widest">Pop Adjustments</h2>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 relative z-10 pr-1">
                                {(currentView === 'editor' ? QUICK_ADJUSTMENTS : EDIT_QUICK_ADJUSTMENTS).map((opt, i) => {
                                    if (!opt.action) return null;
                                    const isActive = activeTroubleshoots.includes(opt.id);
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => applyAction(opt, true)}
                                            className={`w-full text-left p-3 rounded-xl transition-all group flex gap-3 items-start
                                        ${isActive ? 'bg-pink-900/30 border border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.2)]' : 'bg-black/40 hover:bg-pink-900/20 border border-pink-500/10 hover:border-pink-500/30'}`}
                                        >
                                            <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors
                                        ${isActive ? 'bg-pink-500 border-pink-400 text-white' : 'border-zinc-700 bg-transparent'}`}>
                                                {isActive && <Check className="w-3 h-3" />}
                                            </div>
                                            <div className="flex flex-col">
                                                <div className={`text-[11px] font-bold mb-1 leading-snug transition-colors ${isActive ? 'text-pink-300' : 'text-zinc-300 group-hover:text-pink-300'}`}>
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

                    {/* Compiled Prompt Viewer */}
                    <div className="bg-[#18181B] border border-zinc-800 rounded-2xl flex-1 flex flex-col overflow-hidden">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800 bg-[#121214]">
                            <div className="flex gap-2">
                                {AI_MODELS.map(model => (
                                    <button key={model.id} onClick={() => setAiModel(model.id)} className={`px-4 py-2 text-[11px] font-bold rounded-lg transition-colors ${aiModel === model.id ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                        {model.name}
                                    </button>
                                ))}
                            </div>

                            <div className="hidden lg:flex items-center gap-3 bg-black/40 border border-zinc-800/80 px-4 py-1.5 rounded-full">
                                <PieChart className="w-3.5 h-3.5 text-zinc-500" />
                                <span className="text-[9px] font-bold text-zinc-500 mr-1">Weight Budget:</span>
                                <div className="flex h-1.5 w-48 rounded-full overflow-hidden bg-zinc-800">
                                    <div style={{ width: `${promptBudget.shape}%` }} className="bg-orange-500 transition-all duration-500" title={`조형: ${promptBudget.shape}%`} />
                                    <div style={{ width: `${promptBudget.material}%` }} className="bg-cyan-500 transition-all duration-500" title={`재질: ${promptBudget.material}%`} />
                                    <div style={{ width: `${promptBudget.color}%` }} className="bg-pink-500 transition-all duration-500" title={`색상: ${promptBudget.color}%`} />
                                    <div style={{ width: `${promptBudget.env}%` }} className="bg-indigo-500 transition-all duration-500" title={`장식/배경: ${promptBudget.env}%`} />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button onClick={handleOptimizePrompt} disabled={isOptimizing || !currentIR} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-[11px] transition-all active:scale-95 shadow-md whitespace-nowrap bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50`}>
                                    {isOptimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5" />}
                                    AI 최적화
                                </button>
                                <button onClick={copyToClipboard} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-[11px] transition-all active:scale-95 shadow-md whitespace-nowrap ${isCopied ? 'bg-pink-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
                                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {isCopied ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                        </div>

                        <div className="p-6 flex-1 flex gap-5 overflow-hidden">
                            {/* Compiled Output View */}
                            <div className="flex-1 h-full overflow-y-auto custom-scrollbar">
                                <div className={`font-mono text-[13px] whitespace-pre-wrap leading-[1.8] p-6 rounded-xl border min-h-full relative group transition-colors ${currentIR?.vfxPassMode ? 'bg-pink-950/20 border-pink-500/30 text-pink-200' : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-200'}`}>

                                    {optimizedPrompts[aiModel] && (
                                        <div className="absolute top-0 right-0 bg-pink-500/10 text-pink-400 text-[9px] px-3 py-1.5 rounded-bl-xl font-bold uppercase tracking-widest flex items-center gap-1 shadow-sm border-b border-l border-pink-500/20">
                                            <Star className="w-3 h-3" /> OPTIMIZED
                                        </div>
                                    )}

                                    <div className="absolute top-4 right-4 bg-zinc-800/80 text-zinc-400 text-[9px] px-2 py-1 rounded border border-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {aiModel} {optimizedPrompts[aiModel] ? "Optimized" : "Engine"}
                                    </div>

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