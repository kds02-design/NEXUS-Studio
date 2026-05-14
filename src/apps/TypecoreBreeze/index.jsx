import React, { useState, useRef, useEffect } from 'react';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../../lib/firebase';
import { GEMINI_API_KEY } from '../../lib/gemini';
import { useUsageGate } from '../../components/UsageGate';
import {
  Command, LayoutTemplate, Anchor, Settings, Activity, Star, Sparkles,
  HelpCircle, ChevronDown, Shield, ShieldCheck, ShieldAlert, FastForward,
  Sun, Moon, Copy, CheckCircle, CheckCircle2, RefreshCcw, Loader2, Info, Save, X, UploadCloud, Upload,
  Cpu, Terminal, Heart, Share2, Download, Menu,
  PenTool, Image as ImageIcon, Box, Link, Zap, Target, Edit2, Edit3, SlidersHorizontal, Palette,
  Film, Clapperboard, Layers, AlignCenter, MessageSquare, Play, AlertTriangle, FileText, Monitor, Droplet, Award, Smile, Feather, Music, MousePointer, MousePointerClick, Type, Wand2 as Wand2Icon, Bot, ScanLine
} from 'lucide-react';

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

const Tooltip = ({ children, text, position = 'top' }) => {
  return (
    <div className="relative group flex items-center justify-center">
      {children}
      <div className={`absolute ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} hidden group-hover:block w-max max-w-[200px] whitespace-normal bg-zinc-800 text-zinc-200 text-[10px] px-2.5 py-1.5 rounded-md shadow-xl border border-zinc-700 z-[9999] opacity-0 group-hover:opacity-100 transition-opacity duration-200 leading-tight text-center`}>
        {text}
      </div>
    </div>
  );
};

const editOptions = {
  categories: [
    { id: "texture", name: "내부 질감 변경", icon: <Palette className="w-3.5 h-3.5"/>, desc: "붓의 속도감, 분필 가루 등 표면 느낌 변경" },
    { id: "edge", name: "획의 꺾임/마감", icon: <PenTool className="w-3.5 h-3.5"/>, desc: "글자 끝부분을 둥글게, 날카롭게 등 형태 수정" },
    { id: "extension", name: "연장선/꼬리 장식", icon: <Feather className="w-3.5 h-3.5"/>, desc: "스워시, 돼지꼬리, 잉크 튀김 등 꾸미기" },
    { id: "rhythm", name: "리듬감/배치 변경", icon: <Activity className="w-3.5 h-3.5"/>, desc: "바운스, 사선 등 동세와 리듬 부여" },
    { id: "object", name: "특정 글자 오브제 치환", icon: <Type className="w-3.5 h-3.5"/>, desc: "ㅇ을 하트로, 1을 별모양으로 변경 등" },
  ],
  textures: [
    { id: "Tex_DryBrush", name: "마른 붓질 (속도감/갈라짐)", en: "Fast dry brush texture with frayed ink splinters and high speed friction" },
    { id: "Tex_Chalk", name: "거친 분필 가루", en: "Rough, dusty chalkboard chalk texture" },
    { id: "Tex_Glossy", name: "매끄러운 젤리 광택", en: "Smooth, glossy jelly highlight reflections" },
    { id: "Tex_Watercolor", name: "촉촉한 수채화 번짐", en: "Wet watercolor bleed and soft ink pooling" },
    { id: "Tex_Grunge", name: "거친 스크래치 파편", en: "Heavy grunge texture with scratches and battle damage" }
  ],
  edges: [
    { id: "Edge_Round", name: "말랑하고 둥글게 (Jelly/Bubble)", en: "Soft, round, bubble-like chewy edges and corners" },
    { id: "Edge_Block", name: "단단하고 직선적으로 (Block)", en: "Solid, straight, sharp geometric corners and flat terminals" },
    { id: "Edge_Sharp", name: "날카롭고 예리하게 (Speed)", en: "Sharp, pointy, aggressive blade-like terminals and corners" },
    { id: "Edge_Rough", name: "거칠고 불규칙하게 (Torn)", en: "Rough, torn, jagged irregular edges" }
  ],
  extensions: [
    { id: "Ext_Swash", name: "유려한 캘리 스워시", en: "Elegant calligraphic swash extensions on terminals" },
    { id: "Ext_Curly", name: "귀여운 돼지꼬리", en: "Cute, playful curly pig-tail stroke extensions" },
    { id: "Ext_Splash", name: "잉크 튀김/물방울", en: "Dynamic ink splatters and dripping drops at stroke ends" },
    { id: "Ext_SpeedLine", name: "가속도 스피드 라인", en: "Action speed lines trailing from the ends of the strokes" }
  ],
  rhythms: [
    { id: "Rhythm_Bounce", name: "통통 튀는 바운스", en: "Playful bouncing baseline with varying letter heights" },
    { id: "Rhythm_Speed", name: "빠른 사선 속도감", en: "Aggressive forward italic slant with dynamic speed" },
    { id: "Rhythm_Wave", name: "부드러운 물결", en: "Flowing, wavy baseline rhythm" }
  ]
};

const directorPersonas = [
  { id: 'bubble_pop', category: 'casual', icon: <Smile className="w-4 h-4" />, shortTitle: "말랑 젤리/큐트 팝", subtitle: "통통 튀는 바운스와 젤리 볼륨감", role: "너는 대중적이고 귀여운 매력을 듬뿍 담은 '캐주얼 팝아트 크리에이터'야. 날카로운 모서리를 배제하고 말랑하게 녹아내리는 젤리나 통통한 풍선처럼 글자를 디자인해.", keywords: "Bouncy bubble letters, chewy jelly shapes, soft rounded corners, playful height variations, kawaii pastel pop sticker", tone: "[발랄하고 에너지 넘치는] 톡톡 튀는 아이디어와 경쾌한 리듬감을 강조하는 문체를 사용하라.", instructionRule: "- Rule: Focus on friendly, bouncy, and playful bubble shapes. Eliminate all sharp corners and apply dynamic bouncing rhythms." },
  { id: 'comic_artist', category: 'casual', icon: <MessageSquare className="w-4 h-4" />, shortTitle: "만화/코믹북 팝", subtitle: "굵은 아웃라인과 하프톤 도트", role: "너는 역동적이고 팝한 만화책 타이틀을 그리는 '코믹북 아티스트'야. 글자 외곽에 굵고 선명한 까만 테두리를 두르고, 내부는 망점이나 스피드 라인으로 채워.", keywords: "Comic book pop art, bold black outlines, halftone dot patterns, dynamic cartoon energy, speech bubble typography, 2D illustration", tone: "[경쾌하고 만화적인] 액션 만화의 한 컷을 묘사하듯 과장되고 유쾌한 문체를 사용하라.", instructionRule: "- Rule: Emphasize 2D comic book styles. Use bold black outlines, pop-art halftone dots, and expressive cartoon-like deformations." },
  { id: 'block_architect', category: 'casual', icon: <Box className="w-4 h-4" />, shortTitle: "직선/모던 블록", subtitle: "단단하고 굵은 직선의 신뢰감", role: "너는 깔끔하면서도 임팩트 있는 형태를 설계하는 '모던 블록 아키텍트'야. 귀여운 곡선보다는 단단하고 굵은 직선, 두툼한 덩어리감을 활용해.", keywords: "Straight geometric blocks, thick chunky layout, college sports emblem, modern clean pop, solid flat graphics, architectural letters", tone: "[단단하고 명확한] 흔들림 없이 튼튼한 건축물을 설명하듯 깔끔하고 신뢰감 있는 문체를 사용하라.", instructionRule: "- Rule: Use straight, thick, blocky geometric letterforms. Avoid soft jelly curves and focus on solid, modern, and clean flat typography." },
  { id: 'variety_director', category: 'casual', icon: <Clapperboard className="w-4 h-4" />, shortTitle: "예능/썸네일 팝업", subtitle: "압도적인 시인성과 3D 입체 테두리", role: "너는 예능 프로그램 타이틀이나 유튜브 썸네일을 디자인하는 '방송 타이틀 디렉터'야. 화면 밖으로 튀어나올 듯한 3D 입체감, 아주 두껍고 명확한 스티커 테두리를 활용해.", keywords: "K-variety show title, YouTube thumbnail pop, thick sticker border cut-out, 3D extruded shadow, bold high impact legibility", tone: "[주목도 높고 직관적인] 시선을 단번에 사로잡는 방송국 자막처럼 텐션 높고 시원시원한 문체를 사용하라.", instructionRule: "- Rule: Prioritize extreme legibility and pop impact. Use very thick sticker borders and 3D extruded drop shadows for a variety show vibe." },
  { id: 'action_retro', category: 'casual', icon: <FastForward className="w-4 h-4" />, shortTitle: "스피드/액션 레트로", subtitle: "강렬한 속도감과 힙스터 스트릿 텍스처", role: "너는 아케이드 레트로 감성이나 역동적인 액션을 표현하는 '액션 & 레트로 디렉터'야. 거친 스크래치 텍스처, 그래피티 마커펜의 흔적, 사선 절단면을 활용해.", keywords: "Dynamic racing speed, heavy grunge texture, retro arcade blocky shapes, sliced tension, urban street graffiti marker", tone: "[강렬하고 역동적인] 아드레날린이 솟구치듯 속도감 있고 파워풀한 문체를 사용하라.", instructionRule: "- Rule: Inject high momentum or raw street energy. Use aggressive italic slants, speed cuts, chunky retro blocks, or heavy grunge/marker textures." },
  { id: 'idol_trendsetter', category: 'casual', icon: <Star className="w-4 h-4" />, shortTitle: "아이돌/Y2K 팝", subtitle: "사이버틱 반짝임과 세련된 하이틴 감성", role: "너는 세기말의 화려함과 K-Pop 아이돌 감성을 사랑하는 'Y2K 트렌드세터'야. 메탈릭한 질감, 영롱하게 빛나는 별조각 장식, 얇고 세련된 선을 활용해.", keywords: "Y2K aesthetic, K-Pop idol logo, cyber metallic shine, retro futuristic, nostalgic teen pop, sparkly stars, elegant clean pop", tone: "[화려하고 트렌디한] 패션 매거진처럼 감각적이고 세련된 문체를 사용하라.", instructionRule: "- Rule: Emphasize 2000s Y2K or modern K-Pop aesthetics. Use clean lines, sparkling stars, glossy cyber textures, and a trendy high-teen vibe." },
  { id: 'ink_master', category: 'calli', icon: <Feather className="w-4 h-4" />, shortTitle: "수묵/붓글씨 장인", subtitle: "아날로그 필압과 먹 번짐의 미학", role: "너는 종이와 붓의 마찰, 그리고 먹이 번지는 물성을 조형으로 승화시키는 '붓글씨 장인'이야.", keywords: "Emotional brush calligraphy, variable stroke pressure, wet ink bleed, traditional or modern elegant sweeps, human touch", tone: "[따뜻하고 서정적인] 붓끝에서 피어나는 감정과 먹물의 흐름을 시적으로 서술하라.", instructionRule: "- Rule: Emphasize variable brush pressure (thick downstrokes, thin upstrokes) and organic, analogue ink bleeding textures." },
  { id: 'monoline_crafter', category: 'calli', icon: <PenTool className="w-4 h-4" />, shortTitle: "다꾸/펜글씨 작가", subtitle: "정갈하고 일정한 두께의 담백함", role: "너는 일정한 굵기의 펜촉으로 소박하고 깔끔한 감성을 만들어내는 '펜글씨 작가'야.", keywords: "Clean monoline pen, neat handwritten script, minimalist diary aesthetic, uniform stroke thickness, cozy and simple vector", tone: "[차분하고 정갈한] 과장 없이 담백하고 깨끗한 문체를 사용하라.", instructionRule: "- Rule: Keep it clean, neat, and highly legible. Emphasize uniform monoline purity, minimal fuss, and a cozy layout." },
  { id: 'flourish_artist', category: 'calli', icon: <Edit2 className="w-4 h-4" />, shortTitle: "리본 스크립트 작가", subtitle: "화려한 꼬리와 연속적인 곡선미", role: "너는 글자와 글자가 유려하게 이어지는 곡선미를 극한으로 다루는 '리본 스크립트 작가'야.", keywords: "Elegant cursive script, decorative calligraphic flourishes, continuous ribbon flow, sophisticated swashes, graceful curves", tone: "[우아하고 화려한] 정교한 드로잉을 설명하듯 매끄럽고 우아한 문체를 사용하라.", instructionRule: "- Rule: Maximize elegant ligatures, decorative swashes on terminals, and continuous flowing ribbon-like connections between letters." }
];

const sliderDesc = { leftLabel: "감성 & 우아함", rightLabel: "캐주얼 & 리듬감", leftDesc: "아날로그 감성과 부드러운 흐름", rightDesc: "통통 튀는 바운스와 귀여움" };

const getSliderText = (val) => {
  if (val < 35) return `[EXTREME FOCUS]: ${sliderDesc.leftDesc}`;
  if (val > 65) return `[EXTREME FOCUS]: ${sliderDesc.rightDesc}`;
  return `[BALANCED FOCUS]: '${sliderDesc.leftLabel}'과 '${sliderDesc.rightLabel}'의 조화로운 형태`;
};

const staticOptions = {
  base: [ { id: "BlackWhite", name: "블랙 / 화이트", en: "JET BLACK Background, RADIANT WHITE Subject" }, { id: "WhiteBlack", name: "화이트 / 블랙", en: "STARK WHITE Background, SOLID BLACK Subject" } ],
  ratios: [{ id: "1:1", name: "1:1 정방형", en: "1:1" }, { id: "16:9", name: "16:9 와이드", en: "16:9" }, { id: "2.76:1", name: "시네마틱", en: "2.76:1" }],
  occupancies: [
    { id: "30%", name: "30% (극강의 여백)", en: "EXTREME SPATIAL ISOLATION." },
    { id: "50%", name: "50% (충분한 여백)", en: "STRICT CENTRAL BUFFER." },
    { id: "70%", name: "70% (표준/권장)", en: "Balanced occupancy." },
    { id: "85%", name: "85% (공간 강조)", en: "Dominant scale." },
    { id: "100%", name: "100% (가득 찬 형태)", en: "MAXIMUM SCALE." }
  ],
  layouts: [
    { id: "1Line", name: "1줄 (가로)", en: "STRICT SINGLE HORIZONTAL LINE." },
    { id: "2Lines", name: "2줄 (적층)", en: "Two-tier vertical stacked composition." }
  ],
  proportions: [
    { id: "P_Condensed", name: "5:10 (매우 좁음)", en: "Condensed 5:10 ratio" }, { id: "P_Slim", name: "6:10 (좁음)", en: "Slim 6:10 ratio" },
    { id: "P_Std", name: "7:10 (표준)", en: "Standard 7:10 ratio" }, { id: "P_Wide", name: "8.5:10 (넓음)", en: "Wide 8.5:10 ratio" },
    { id: "P_Extended", name: "12:10 (확장)", en: "Extended 12:10 ratio" }
  ],
  CasualStyles: [
    { id: "Calli_Brush", name: "감성 붓글씨 (Brush Calligraphy)", en: "Emotional watercolor brush calligraphy with variable thick-to-thin strokes" },
    { id: "Casual_Bubble", name: "말랑 버블 팝 (Bubble Pop)", en: "Chunky, cute, and bouncy bubble letters like balloons" },
    { id: "Casual_Comic", name: "코믹북 팝 (Comic Book)", en: "Dynamic comic book style with bold black outlines and halftone dots" },
    { id: "Casual_Block", name: "모던 팝 블록 (Modern Block)", en: "Clean, straight geometric block lettering for modern sports or tech pop" },
    { id: "Casual_Marker", name: "마카펜 감성 (Marker Pen)", en: "Round and smooth thick marker pen handwriting" },
    { id: "Calli_Ribbon", name: "우아한 리본 (Elegant Ribbon)", en: "Flowing, elegant script typography resembling swirling ribbons" },
    { id: "Casual_Jelly", name: "말랑말랑 젤리 (Slime/Jelly)", en: "Soft, melting, jelly-like casual typographic forms" },
    { id: "Street_Graffiti", name: "힙스터 그래피티 (Graffiti)", en: "Urban hipster street tagging style with sharp fast marker strokes" },
    { id: "Vintage_Chalk", name: "빈티지 분필 (Chalkboard)", en: "Rough, textured vintage chalk lettering aesthetic" },
    { id: "Diary_Pen", name: "다꾸 펜글씨 (Diary Pen)", en: "Clean, minimal, cute monoline pen handwriting" },
    { id: "Casual_RetroChalk", name: "레트로 팝 분필 (Retro Chalk)", en: "Playful retro chalkboard lettering with dusty, rough chalk textures and bouncy baseline" },
    { id: "Casual_Variety", name: "예능/유튜브 팝 (Variety Pop)", en: "K-variety show title style with 3D pop and thick sticker outlines" },
    { id: "Casual_Emblem", name: "스포츠 엠블럼 (Sports Emblem)", en: "College sports team emblem style with arch and ribbon banners" },
    { id: "Casual_Racing", name: "레이싱/스피드 (Racing Action)", en: "Dynamic racing game title with high speed slant and sliced strokes" },
    { id: "Casual_Idol", name: "아이돌/하이틴 (Idol Pop)", en: "Soft, clean, elegant and cute pastel idol group logo typography" },
    { id: "Casual_Grunge", name: "거친 영화 타이틀 (Grunge Movie)", en: "Aggressive action thriller title with heavy grunge distressed textures" }
  ],
  InternalDecorations: [ { id: "Solid", name: "꽉 찬 단색", en: "Solid filled internal mass" }, { id: "Hatched", name: "스케치 빗금", en: "Hand-drawn hatched sketch lines inside" }, { id: "Hatched_Chalk", name: "거친 분필 빗금", en: "rough chalk hatched shading inside" }, { id: "PolkaDots", name: "코믹 하프톤 도트", en: "Comic book pop-art halftone dots inside" }, { id: "Highlight", name: "반짝임/글로시", en: "Cartoonish glossy highlights and reflections" }, { id: "Extruded3D", name: "3D 입체/그림자", en: "Thick 3D extruded block depth and heavy drop shadow" }, { id: "StickerBorder", name: "스티커 컷아웃 테두리", en: "Thick, bold white sticker cut-out border surrounding the text" } ],
  TextFlows: [ { id: "Straight", name: "단정하게 (수평)", en: "Straight horizontal baseline" }, { id: "Bouncy", name: "통통 튀는 리듬감", en: "Bouncy, playful baseline with alternating letter heights" }, { id: "Wave", name: "물결 치듯", en: "Flowing wave-like baseline" }, { id: "Arch", name: "아치형", en: "Playful arching baseline" } ],
  LetterConnections: [ { id: "Separated", name: "개별 분리", en: "Clearly separated individual characters" }, { id: "CursiveFlow", name: "자연스러운 이어쓰기", en: "Organic cursive flow, characters seamlessly connecting" }, { id: "Overlapping", name: "캐주얼한 겹침", en: "Playful overlapping of letters, squished together" } ],
  CasualSurroundings: [ { id: "Clean", name: "없음", en: "Clean background" }, { id: "Sparkles", name: "반짝이와 별조각", en: "Decorated with cute sparkles, stars, and twinkles" }, { id: "Splatter", name: "잉크/물방울 튀김", en: "Artistic ink splatters and cute paint drops" }, { id: "HeartsClouds", name: "하트와 둥근 구름", en: "Surrounded by minimal cute hearts and fluffy clouds" }, { id: "SpeedLines", name: "스피드 라인/모션", en: "Dynamic speed lines and motion blur effects shooting from the letters" }, { id: "RibbonBanner", name: "하단 엠블럼 리본", en: "A bold sports/collegiate ribbon banner framing the bottom" }, { id: "IconicLineArt", name: "포인트 라인아트 아이콘", en: "Integrated playful line-art icons attached to strokes" } ],
  strokeWeights: [ { id: "Weight_Thin", name: "얇은 모노라인", en: "thin consistent monoline pen strokes" }, { id: "Weight_Brush", name: "가변적인 붓필압", en: "variable pressure brush strokes (thick downstrokes, thin upstrokes)" }, { id: "Weight_Chunky", name: "두툼한 볼륨감", en: "chunky, thick, fat stroke mass" }, { id: "Weight_Marker", name: "굵직한 마카펜", en: "bold, uniform marker pen thickness" } ],
  kerningOptions: [ { id: "Kern_Wide", name: "넓은 자간", en: "airy, relaxed wide letter spacing" }, { id: "Kern_Std", name: "표준 자간", en: "standard comfortable kerning" }, { id: "Kern_Tight", name: "오밀조밀하게", en: "tight, cozy, and playful squished kerning" } ],
  strokeEnds: [ { id: "End_Round", name: "둥글고 귀엽게", en: "softly rounded, friendly terminals" }, { id: "End_Block", name: "단단하고 직선으로", en: "solid, straight, sharp geometric flat terminals" }, { id: "End_Brush", name: "날카로운 붓끝", en: "tapered, sharp brush tips" }, { id: "End_Blunt", name: "뭉툭한 마카", en: "blunt, flat marker cut terminals" }, { id: "End_Swash", name: "화려한 스워시", en: "decorative, elegant curly swash terminals" } ],
  strokeTextures: [ { id: "Tex_Smooth", name: "깔끔한 벡터", en: "perfectly smooth, crisp vector edges" }, { id: "Tex_Watercolor", name: "수채화 번짐", en: "soft watercolor ink bleed and organic texture" }, { id: "Tex_Chalk", name: "거친 크레용/분필", en: "rough, dry chalk or crayon texture" }, { id: "Tex_DustyChalk", name: "흩날리는 분필 가루", en: "dusty, scattered chalk powder texture" }, { id: "Tex_Grunge", name: "스크래치/파편 (Grunge)", en: "Rough, distressed grunge texture with scratches and battle damage" } ],
  strokeSharpness: [ { id: "Sharp_Soft", name: "말랑말랑한 테두리", en: "soft, chewy, slightly rounded micro-edges" }, { id: "Sharp_Crisp", name: "선명하고 쨍하게", en: "crisp, sharp, perfectly defined edges" } ],
  strokeExtensions: [ { id: "Ext_None", name: "장식 없음", en: "contained, simple strokes" }, { id: "Ext_Playful", name: "장난스러운 꼬리", en: "playful, curly extending stroke tails" }, { id: "Ext_Elegant", name: "우아한 플로리시", en: "elaborate, elegant calligraphic flourishes" } ],
  rhythmDynamics: [ { id: "Rhythm_Calm", name: "차분한 정렬", en: "calm, stable, well-aligned rhythm" }, { id: "Rhythm_Bouncy", name: "통통 튀는 즐거움", en: "joyful, bouncing kinetic rhythm" }, { id: "Rhythm_Fast", name: "빠른 흘림체 속도감", en: "fast, energetic sweeping motion" } ],
  slantAngles: [ { id: "Slant_0", name: "기울기 없음 (0도)", en: "perfectly upright verticality" }, { id: "Slant_Casual", name: "캐주얼한 기울기 (10도)", en: "casual, playful 10-degree forward slant" }, { id: "Slant_Italic", name: "날렵한 필기체 (20도)", en: "aggressive 20-degree italic slant" } ],
  playfulDistortions: [ { id: "Distort_None", name: "변형 없음", en: "perfectly intact, geometric shapes" }, { id: "Distort_Squeeze", name: "살짝 찌그러짐", en: "cute, slightly squeezed and squished playful distortion" }, { id: "Distort_Jelly", name: "젤리 같은 출렁임", en: "organic, wobbly jelly-like form distortion" }, { id: "Distort_SpeedCut", name: "사선 스피드 절단", en: "Aggressive diagonal slices and speed cuts through the letterforms" } ],
  analogImperfections: [ { id: "Imp_None", name: "완벽하게 깨끗함", en: "pristine, flawless digital vector form" }, { id: "Imp_Bleed", name: "자연스러운 잉크 번짐", en: "organic handwritten ink bleed and pooling" }, { id: "Imp_RoughEdge", name: "아날로그 종이 질감", en: "subtle, rough paper texture edges" }, { id: "Imp_ChalkSmudge", name: "분필 지워짐/문질러짐", en: "smudged and partially erased chalk marks" } ],
  widths: [{ id: "Narrow", name: "좁게", en: "condensed slim width" }, { id: "Normal", name: "표준", en: "standard balanced width" }, { id: "Wide", name: "넓고 시원하게", en: "wide, airy expansive width" }]
};

const SectionHeader = ({ id, label, icon }) => (
  <div className="flex items-center gap-2 pl-1 text-zinc-500 relative mt-4 first:mt-0 transition-all duration-700">
    {icon}
    <h3 className="text-[10px] font-semibold uppercase tracking-wider">{id}. {label}</h3>
  </div>
);

const DropdownControl = ({ label, icon, data = [], value, onChange, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const selectedOption = data.find(o => o.id === value) || data[0] || { name: 'None' };
  const displayLabel = selectedOption.name;

  return (
    <div className={`space-y-1.5 relative transition-all duration-300 ${disabled ? 'opacity-40 grayscale pointer-events-none' : ''}`} ref={containerRef}>
      {label && <div className="flex items-center justify-between pl-1"><p className="text-[10px] font-bold uppercase tracking-tighter flex items-center gap-1.5 text-zinc-500">{icon} {label}</p></div>}
      <button onClick={() => !disabled && setIsOpen(!isOpen)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-md border transition-all bg-[#111111] border-zinc-800 hover:border-zinc-600 focus:outline-none">
        <span className={`text-[11px] font-bold truncate ${!disabled ? 'text-zinc-200' : ''}`}>{displayLabel}</span>
        <ChevronDown className="w-3.5 h-3.5 text-zinc-600" />
      </button>
      {isOpen && (
        <div className="nx-popover-panel absolute left-0 w-full mt-1 max-h-[250px] overflow-y-auto z-[9999] py-1">
          {data.map(opt => (
             <button key={opt.id} onClick={() => { onChange(opt.id); setIsOpen(false); }} className={`nx-popover-item ${value === opt.id ? 'is-active' : ''}`}>
                <span>{opt.name}</span>
             </button>
          ))}
        </div>
      )}
    </div>
  );
};

const AiOutputBox = ({ modelState, viewModeState, setViewMode, content, isEdit = false, outdatedFlag = false, onCopy, copiedState }) => {
  const [lang, setLang] = useState('ko');
  let textContent = "";
  let isJsonContent = false;
  let engContentForCopy = "";
  if (!content) { textContent = "결과가 이곳에 표시됩니다."; }
  else if (typeof content === 'string') { textContent = content; engContentForCopy = content; }
  else if (content.en && content.ko) { isJsonContent = true; textContent = content[lang] || content.en; engContentForCopy = content.en; }
  else { textContent = JSON.stringify(content); engContentForCopy = textContent; }

  let btnClass = "bg-violet-600 text-white";
  const isPlaceholderContent = !content || (typeof content === 'string' && (content.startsWith('[ V') || content.startsWith('[ V2.0')));

  return (
    <div className="rounded-xl p-5 sm:p-6 border bg-[#111111] border-zinc-800 relative transition-all duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 pb-4 border-b border-zinc-800/80 gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-[10px] font-bold uppercase text-zinc-400 flex items-center gap-1.5">
               {modelState === 'NanoBanana' ? <Star className="w-3.5 h-3.5 text-zinc-300"/> : <Terminal className="w-3.5 h-3.5"/>}
               {modelState} Output
            </p>
            {outdatedFlag && !isPlaceholderContent && (
               <span className="text-[10px] text-zinc-300 font-bold flex items-center gap-1 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">⚠️ 재생성 필요</span>
            )}
            {modelState === 'NanoBanana' && !isPlaceholderContent && (
                <div className="flex bg-zinc-900 rounded p-0.5 border border-zinc-800">
                  <button onClick={() => setViewMode('enhanced')} className={`px-3 py-1 text-[10px] font-bold rounded ${viewModeState === 'enhanced' ? btnClass : 'text-zinc-600 hover:text-zinc-400'}`}>서술형</button>
                  <button onClick={() => setViewMode('optimized')} className={`px-3 py-1 text-[10px] font-bold rounded ${viewModeState === 'optimized' ? btnClass : 'text-zinc-600 hover:text-zinc-400'}`}>태그형</button>
                </div>
            )}
            {isJsonContent && !isPlaceholderContent && (
                <div className="flex bg-zinc-900 rounded p-0.5 border border-zinc-800 ml-auto sm:ml-2">
                  <button onClick={() => setLang('ko')} className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${lang === 'ko' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>KO</button>
                  <button onClick={() => setLang('en')} className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${lang === 'en' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>EN</button>
                </div>
            )}
          </div>
          <Tooltip text={copiedState ? "복사 완료!" : (isJsonContent ? "AI용 영문 프롬프트 복사" : "복사하기")} position="top">
             <button onClick={() => onCopy(isJsonContent ? engContentForCopy : textContent, 'bottom')} className="p-1.5 rounded-md transition-all text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 flex items-center justify-center">
                {copiedState ? <CheckCircle2 className="w-4 h-4 text-blue-400" /> : <Copy className="w-4 h-4 text-blue-400" />}
             </button>
          </Tooltip>
      </div>
      <div className={`w-full text-left whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-zinc-300 ${outdatedFlag && !isPlaceholderContent ? 'opacity-50' : 'opacity-100'}`}>
         {textContent}
      </div>
    </div>
  );
};

const App = () => {
  const { ensureCanGenerate, modal: usageModal } = useUsageGate();
  const [theme, setTheme] = useState("dark");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState("editor");
  const [selectedCategory, setSelectedCategory] = useState("casual");

  const [inputText, setInputText] = useState("해피데이");
  const [base64Image, setBase64Image] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const [aiPersona, setAiPersona] = useState('bubble_pop');
  const [personaDropdownOpen, setPersonaDropdownOpen] = useState(false);
  const [isAdvancedOptionsEnabled, setIsAdvancedOptionsEnabled] = useState(false);
  const [enhanceMode, setEnhanceMode] = useState("perfection");
  const [momentumActive, setMomentumActive] = useState(false);
  const [personaSliderValue, setPersonaSliderValue] = useState(50);
  const [baseStyle, setBaseStyle] = useState("BlackWhite");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [occupancy, setOccupancy] = useState("50%");
  const [layoutType, setLayoutType] = useState("1Line");

  const [stemWeight, setStemWeight] = useState("Weight_Chunky");
  const [charWidth, setCharWidth] = useState("Normal");
  const [charProportion, setCharProportion] = useState("P_Std");
  const [kerning, setKerning] = useState("Kern_Std");
  const [scriptType, setScriptType] = useState("Casual_Bubble");
  const [terminalStyle, setTerminalStyle] = useState("End_Round");
  const [strokeTexture, setStrokeTexture] = useState("Tex_Smooth");
  const [strokeSharpness, setStrokeSharpness] = useState("Sharp_Soft");
  const [strokeExtension, setStrokeExtension] = useState("Ext_None");
  const [slantAngle, setSlantAngle] = useState("Slant_0");
  const [rhythmDynamic, setRhythmDynamic] = useState("Rhythm_Bouncy");
  const [playfulDistortion, setPlayfulDistortion] = useState("Distort_Squeeze");
  const [analogImperfection, setAnalogImperfection] = useState("Imp_None");
  const [internalDecoration, setInternalDecoration] = useState("Solid");
  const [textFlow, setTextFlow] = useState("Straight");
  const [letterConnection, setLetterConnection] = useState("Separated");
  const [casualSurrounding, setCasualSurrounding] = useState("Clean");

  const [dynamicOptions, setDynamicOptions] = useState({ CasualStyles: [], strokeTextures: [], analogImperfections: [], strokeEnds: [], strokeWeights: [], strokeSharpness: [], widths: [], kerningOptions: [], strokeExtensions: [], rhythmDynamics: [], playfulDistortions: [] });

  const [customDesignInjections, setCustomDesignInjections] = useState("");
  const [aiModel, setAiModel] = useState("Overview");

  const [dramaticPrompt, setDramaticPrompt] = useState(null);
  const [optimizedPrompt, setOptimizedPrompt] = useState(null);
  const [mjOptimizedPrompt, setMjOptimizedPrompt] = useState(null);
  const [cgEnhancedPrompt, setCgEnhancedPrompt] = useState(null);
  const [nanoViewMode, setNanoViewMode] = useState("enhanced");

  const [aiRecSummary, setAiRecSummary] = useState(null);
  const [lastRecSource, setLastRecSource] = useState(null);

  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isMjOptimizing, setIsMjOptimizing] = useState(false);
  const [isCgEnhancing, setIsCgEnhancing] = useState(false);
  const [isExpandingIntent, setIsExpandingIntent] = useState(false);
  const [isRecommending, setIsRecommending] = useState(false);

  const [isVerifyingLogic, setIsVerifyingLogic] = useState(false);
  const [verificationLog, setVerificationLog] = useState("");
  const [isAuditedHighlight, setIsAuditedHighlight] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  const [copiedTop, setCopiedTop] = useState(false);
  const [copiedBottom, setCopiedBottom] = useState(false);
  const [baseLangView, setBaseLangView] = useState('ko');

  const [editUploadedImage, setEditUploadedImage] = useState(null);
  const [editInstruction, setEditInstruction] = useState("");
  const [editTargetCategory, setEditTargetCategory] = useState("texture");
  const [editTexStyle, setEditTexStyle] = useState("Tex_DryBrush");
  const [editEdgeStyle, setEditEdgeStyle] = useState("Edge_Round");
  const [editExtStyle, setEditExtStyle] = useState("Ext_Swash");
  const [editRhythmStyle, setEditRhythmStyle] = useState("Rhythm_Bounce");
  const [editObjLetter, setEditObjLetter] = useState("");
  const [editObjItem, setEditObjItem] = useState("");

  const [editAiModel, setEditAiModel] = useState("Overview");
  const [editNanoMode, setEditNanoMode] = useState("enhanced");
  const [editDramaticPrompt, setEditDramaticPrompt] = useState(null);
  const [editOptimizedPrompt, setEditOptimizedPrompt] = useState(null);
  const [editMjPrompt, setEditMjPrompt] = useState(null);
  const [editCgPrompt, setEditCgPrompt] = useState(null);

  const [isEditEnhancing, setIsEditEnhancing] = useState(false);
  const [isEditOptimizing, setIsEditOptimizing] = useState(false);
  const [isEditMjOptimizing, setIsEditMjOptimizing] = useState(false);
  const [isEditCgEnhancing, setIsEditCgEnhancing] = useState(false);
  const [isEditExpandingIntent, setIsEditExpandingIntent] = useState(false);

  const [styleImage, setStyleImage] = useState(null);
  const [isStyleDragging, setIsStyleDragging] = useState(false);
  const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false);

  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const [isEditPromptExpanded, setIsEditPromptExpanded] = useState(false);
  const [isBaseContextExpanded, setIsBaseContextExpanded] = useState(false);

  const [isOutdated, setIsOutdated] = useState(false);
  const [isEditOutdated, setIsEditOutdated] = useState(false);

  const [isTuningModalOpen, setIsTuningModalOpen] = useState(false);
  const [tuningChatHistory, setTuningChatHistory] = useState([]);
  const [tuningInputValue, setTuningInputValue] = useState("");
  const [isTuningLoading, setIsTuningLoading] = useState(false);
  const [currentTunedAura, setCurrentTunedAura] = useState("");
  const tuningChatRef = useRef(null);

  const [isEditTuningModalOpen, setIsEditTuningModalOpen] = useState(false);
  const [editTuningChatHistory, setEditTuningChatHistory] = useState([]);
  const [editTuningInputValue, setEditTuningInputValue] = useState("");
  const [isEditTuningLoading, setIsEditTuningLoading] = useState(false);
  const [currentTunedEditAura, setCurrentTunedEditAura] = useState("");
  const editTuningChatRef = useRef(null);

  useEffect(() => {
    setIsOutdated(true);
    setVerificationLog("");
  }, [aiPersona, personaSliderValue, inputText, customDesignInjections, enhanceMode, momentumActive, baseStyle, aspectRatio, occupancy, layoutType, stemWeight, charWidth, charProportion, kerning, scriptType, terminalStyle, strokeTexture, strokeSharpness, strokeExtension, slantAngle, rhythmDynamic, playfulDistortion, analogImperfection, internalDecoration, textFlow, letterConnection, casualSurrounding, isAdvancedOptionsEnabled]);

  useEffect(() => { setIsEditOutdated(true); }, [editInstruction, editUploadedImage, editTargetCategory, editTexStyle, editEdgeStyle, editExtStyle, editRhythmStyle, editObjLetter, editObjItem]);

  // Auth is owned by the platform-wide AuthProvider (src/context/AuthContext.jsx).
  // This app must not call signInAnonymously / onAuthStateChanged — doing so
  // would replace the real signed-in user with an anonymous one and bounce
  // them to the pending-approval screen.

  useEffect(() => { if (tuningChatRef.current) tuningChatRef.current.scrollTop = tuningChatRef.current.scrollHeight; }, [tuningChatHistory, isTuningLoading]);
  useEffect(() => { if (editTuningChatRef.current) editTuningChatRef.current.scrollTop = editTuningChatRef.current.scrollHeight; }, [editTuningChatHistory, isEditTuningLoading]);

  const handleScriptPresetChange = (presetId) => {
    setScriptType(presetId);
    if (presetId === "Calli_Brush") { setStemWeight("Weight_Brush"); setTerminalStyle("End_Brush"); setStrokeTexture("Tex_Watercolor"); setAnalogImperfection("Imp_Bleed"); setStrokeExtension("Ext_Elegant"); setLetterConnection("CursiveFlow"); }
    else if (presetId === "Casual_Bubble") { setStemWeight("Weight_Chunky"); setTerminalStyle("End_Round"); setStrokeSharpness("Sharp_Soft"); setRhythmDynamic("Rhythm_Bouncy"); setTextFlow("Bouncy"); setPlayfulDistortion("Distort_Squeeze"); }
    else if (presetId === "Casual_Comic") { setStemWeight("Weight_Chunky"); setTerminalStyle("End_Round"); setStrokeTexture("Tex_Smooth"); setInternalDecoration("PolkaDots"); setRhythmDynamic("Rhythm_Bouncy"); setPlayfulDistortion("Distort_Squeeze"); }
    else if (presetId === "Casual_Block") { setStemWeight("Weight_Chunky"); setTerminalStyle("End_Block"); setStrokeTexture("Tex_Smooth"); setRhythmDynamic("Rhythm_Calm"); setPlayfulDistortion("Distort_None"); }
    else if (presetId === "Casual_Marker") { setStemWeight("Weight_Marker"); setTerminalStyle("End_Round"); setStrokeSharpness("Sharp_Crisp"); setStrokeTexture("Tex_Smooth"); setRhythmDynamic("Rhythm_Calm"); }
    else if (presetId === "Calli_Ribbon") { setStemWeight("Weight_Brush"); setTerminalStyle("End_Swash"); setStrokeSharpness("Sharp_Crisp"); setCharProportion("P_Slim"); setStrokeExtension("Ext_Elegant"); setLetterConnection("CursiveFlow"); }
    else if (presetId === "Casual_Jelly") { setStemWeight("Weight_Chunky"); setTerminalStyle("End_Round"); setPlayfulDistortion("Distort_Jelly"); setStrokeSharpness("Sharp_Soft"); setRhythmDynamic("Rhythm_Bouncy"); setInternalDecoration("Highlight"); }
    else if (presetId === "Street_Graffiti") { setCharProportion("P_Condensed"); setStemWeight("Weight_Marker"); setTerminalStyle("End_Brush"); setRhythmDynamic("Rhythm_Fast"); setLetterConnection("Overlapping"); setCasualSurrounding("Splatter"); }
    else if (presetId === "Vintage_Chalk") { setTerminalStyle("End_Blunt"); setStrokeTexture("Tex_Chalk"); setAnalogImperfection("Imp_RoughEdge"); setCharProportion("P_Std"); setInternalDecoration("Hatched"); }
    else if (presetId === "Diary_Pen") { setStemWeight("Weight_Thin"); setTerminalStyle("End_Round"); setStrokeSharpness("Sharp_Crisp"); setRhythmDynamic("Rhythm_Calm"); setSlantAngle("Slant_0"); setTextFlow("Straight"); }
    else if (presetId === "Casual_RetroChalk") { setStemWeight("Weight_Chunky"); setTerminalStyle("End_Blunt"); setStrokeTexture("Tex_DustyChalk"); setAnalogImperfection("Imp_ChalkSmudge"); setRhythmDynamic("Rhythm_Bouncy"); setInternalDecoration("Hatched_Chalk"); }
    else if (presetId === "Casual_Variety") { setStemWeight("Weight_Chunky"); setTerminalStyle("End_Round"); setInternalDecoration("Extruded3D"); setStrokeSharpness("Sharp_Crisp"); setRhythmDynamic("Rhythm_Bouncy"); setCasualSurrounding("Clean"); }
    else if (presetId === "Casual_Emblem") { setStemWeight("Weight_Chunky"); setTerminalStyle("End_Blunt"); setTextFlow("Arch"); setCasualSurrounding("RibbonBanner"); setRhythmDynamic("Rhythm_Calm"); setInternalDecoration("Solid"); }
    else if (presetId === "Casual_Racing") { setStemWeight("Weight_Marker"); setTerminalStyle("End_Blunt"); setSlantAngle("Slant_Italic"); setPlayfulDistortion("Distort_SpeedCut"); setCasualSurrounding("SpeedLines"); setRhythmDynamic("Rhythm_Fast"); }
    else if (presetId === "Casual_Idol") { setStemWeight("Weight_Thin"); setTerminalStyle("End_Round"); setStrokeSharpness("Sharp_Soft"); setInternalDecoration("Solid"); setCasualSurrounding("Sparkles"); setRhythmDynamic("Rhythm_Calm"); }
    else if (presetId === "Casual_Grunge") { setStemWeight("Weight_Chunky"); setTerminalStyle("End_Blunt"); setStrokeTexture("Tex_Grunge"); setCasualSurrounding("Clean"); setSlantAngle("Slant_0"); setRhythmDynamic("Rhythm_Calm"); }
  };

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    if (cat === 'calli') { setAiPersona('ink_master'); handleScriptPresetChange('Calli_Brush'); }
    else if (cat === 'casual') { setAiPersona('bubble_pop'); handleScriptPresetChange('Casual_Bubble'); }
  };

  const handleReset = () => {
    setDynamicOptions({ CasualStyles: [], strokeTextures: [], analogImperfections: [], strokeEnds: [], strokeWeights: [], strokeSharpness: [], widths: [], kerningOptions: [], strokeExtensions: [], rhythmDynamics: [], playfulDistortions: [] });
    setCustomDesignInjections(""); setNanoViewMode("enhanced"); setAiModel("Overview");
    setEnhanceMode("perfection"); setMomentumActive(false); setIsAdvancedOptionsEnabled(false);
    setPersonaSliderValue(50); setBase64Image(null);
    setAiRecSummary(null); setLastRecSource(null);
    setStyleImage(null); setVerificationLog("");
    setDramaticPrompt(null); setOptimizedPrompt(null); setMjOptimizedPrompt(null); setCgEnhancedPrompt(null);
    setEditDramaticPrompt(null); setEditOptimizedPrompt(null); setEditMjPrompt(null); setEditCgPrompt(null);
    handleCategoryChange(selectedCategory);
  };

  const verifyPromptLogic = async () => {
    if (isVerifyingLogic) return;
    setIsVerifyingLogic(true);
    const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];
    const currentStateStr = `Persona: ${persona.shortTitle}\nAura: "${customDesignInjections}"\nOptions: Weight(${stemWeight}), Terminal(${terminalStyle}), Texture(${strokeTexture}), Sharpness(${strokeSharpness}), Rhythm(${rhythmDynamic}), Distortion(${playfulDistortion}), Internal(${internalDecoration})`;
    const systemPrompt = `Audit prompt logic. Return JSON: { "auditLog": "한글 요약", "fixedAura": "...", "fixedOptions": { "stemWeight": "...", "terminalStyle": "...", "strokeTexture": "...", "strokeSharpness": "...", "rhythmDynamic": "...", "playfulDistortion": "...", "internalDecoration": "..." } }`;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: "Audit:\n" + currentStateStr }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json", temperature: 0.2 } }) });
      const data = await response.json();
      const res = extractJson(data.candidates[0].content.parts[0].text);
      if (res.auditLog) { setVerificationLog(res.auditLog); setIsAuditedHighlight(true); setIsAuditModalOpen(true); setTimeout(() => setIsAuditedHighlight(false), 2000); }
      if (res.fixedAura) setCustomDesignInjections(res.fixedAura);
      if (res.fixedOptions) {
        if (res.fixedOptions.stemWeight) setStemWeight(res.fixedOptions.stemWeight);
        if (res.fixedOptions.terminalStyle) setTerminalStyle(res.fixedOptions.terminalStyle);
        if (res.fixedOptions.strokeTexture) setStrokeTexture(res.fixedOptions.strokeTexture);
        if (res.fixedOptions.strokeSharpness) setStrokeSharpness(res.fixedOptions.strokeSharpness);
        if (res.fixedOptions.rhythmDynamic) setRhythmDynamic(res.fixedOptions.rhythmDynamic);
        if (res.fixedOptions.playfulDistortion) setPlayfulDistortion(res.fixedOptions.playfulDistortion);
        if (res.fixedOptions.internalDecoration) setInternalDecoration(res.fixedOptions.internalDecoration);
      }
    } catch (e) { console.error("Audit failed", e); } finally { setIsVerifyingLogic(false); }
  };

  const handleAiRecommendation = async () => {
    if (isRecommending) return;
    setIsRecommending(true);
    const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];
    const prompt = `Persona: ${persona.role}\nText: "${inputText}"\nAura: "${customDesignInjections || 'None'}"\nReturn JSON: { "summary": { "title": "...", "reason": "..." }, "setStyle": { "id": "...", "name": "...", "en": "..." }, "setWeight": { "id": "...", "name": "...", "en": "..." }, "setTerminal": { "id": "...", "name": "...", "en": "..." }, "setTexture": { "id": "...", "name": "...", "en": "..." }, "setRhythm": { "id": "...", "name": "...", "en": "..." }, "setSharpness": { "id": "...", "name": "...", "en": "..." }, "setKerning": { "id": "...", "name": "...", "en": "..." } }`;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.7 } }) });
      const data = await response.json();
      const res = extractJson(data.candidates[0].content.parts[0].text);
      const updateDynamic = (key, val) => {
        if (val && typeof val === 'object' && val.id && val.name) {
          setDynamicOptions(prev => { const exists = prev[key]?.find(o => o.id === val.id); if (!exists) return { ...prev, [key]: [...(prev[key] || []), val] }; return prev; });
          return val.id;
        }
        return val && typeof val === 'object' ? val.id || val : val;
      };
      if (res.summary) { setAiRecSummary({ ...res.summary, source: 'text' }); setLastRecSource('text'); }
      if (res.setStyle) setScriptType(updateDynamic('CasualStyles', res.setStyle));
      if (res.setWeight) setStemWeight(updateDynamic('strokeWeights', res.setWeight));
      if (res.setTerminal) setTerminalStyle(updateDynamic('strokeEnds', res.setTerminal));
      if (res.setTexture) setStrokeTexture(updateDynamic('strokeTextures', res.setTexture));
      if (res.setRhythm) setRhythmDynamic(updateDynamic('rhythmDynamics', res.setRhythm));
      if (res.setSharpness) setStrokeSharpness(updateDynamic('strokeSharpness', res.setSharpness));
      if (res.setKerning) setKerning(updateDynamic('kerningOptions', res.setKerning));
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
      if(type === 'top') setCopiedTop(true); else setCopiedBottom(true);
      setTimeout(() => { setCopiedTop(false); setCopiedBottom(false); }, 2000);
    } catch (err) { console.error("Failed to copy", err); }
    document.body.removeChild(textArea);
  };

  const handleEditDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) { const reader = new FileReader(); reader.onloadend = () => setEditUploadedImage(reader.result); reader.readAsDataURL(file); }
  };
  const handleEditImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) { const reader = new FileReader(); reader.onloadend = () => setEditUploadedImage(reader.result); reader.readAsDataURL(file); }
  };

  const processStyleFile = (file) => { const reader = new FileReader(); reader.onloadend = () => setStyleImage(reader.result); reader.readAsDataURL(file); };
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => { setIsDragging(false); };
  const handleStyleDragOver = (e) => { e.preventDefault(); setIsStyleDragging(true); };
  const handleStyleDragLeave = () => { setIsStyleDragging(false); };
  const handleStyleDrop = (e) => { e.preventDefault(); setIsStyleDragging(false); const file = e.dataTransfer.files[0]; if (file && file.type.startsWith('image/')) processStyleFile(file); };
  const handleStyleImageUpload = (e) => { const file = e.target.files[0]; if (file) processStyleFile(file); };

  const analyzeStyleImage = async () => {
    if (!styleImage || isAnalyzingStyle) return;
    setIsAnalyzingStyle(true);
    const base64Data = styleImage.split(',')[1];
    const mimeType = styleImage.split(';')[0].split(':')[1];
    const prompt = `Analyze typography style. Return JSON: { "aura": "Korean 2-3 sentences", "setStyle": {...}, "setWeight": {...}, "setTexture": {...}, "setTerminal": {...}, "setRhythm": {...} }`;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data: base64Data } }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.7 } }) });
      const data = await response.json();
      const res = extractJson(data.candidates[0].content.parts[0].text);
      if (res.aura) setCustomDesignInjections(res.aura);
      const updateDynamic = (key, val) => {
        if (val && typeof val === 'object' && val.id && val.name) {
          setDynamicOptions(prev => { const exists = prev[key]?.find(o => o.id === val.id); if (!exists) return { ...prev, [key]: [...(prev[key] || []), val] }; return prev; });
          return val.id;
        }
        return val && typeof val === 'object' ? val.id || val : val;
      };
      if (res.setStyle) setScriptType(updateDynamic('CasualStyles', res.setStyle));
      if (res.setWeight) setStemWeight(updateDynamic('strokeWeights', res.setWeight));
      if (res.setTexture) setStrokeTexture(updateDynamic('strokeTextures', res.setTexture));
      if (res.setTerminal) setTerminalStyle(updateDynamic('strokeEnds', res.setTerminal));
      if (res.setRhythm) setRhythmDynamic(updateDynamic('rhythmDynamics', res.setRhythm));
      setAiRecSummary({ title: "이미지 스타일 학습 완료", reason: "업로드한 레퍼런스의 조형적 특징을 분석하여 텍스트 프롬프트와 엔진 옵션에 자동 적용했습니다.", source: 'image' });
      setLastRecSource('image');
      setIsAdvancedOptionsEnabled(true);
    } catch (e) { console.error("Style Analysis Failed:", e); } finally { setIsAnalyzingStyle(false); }
  };

  const openTuningRoom = () => {
    setCurrentTunedAura(customDesignInjections);
    setTuningChatHistory([{ role: 'assistant', content: "안녕하세요! 구체화된 아이디어를 바탕으로 추가 수정하고 싶으신 방향을 자유롭게 말씀해 주세요." }]);
    setTuningInputValue("");
    setIsTuningModalOpen(true);
  };

  const handleSendTuningMessage = async () => {
    if (!tuningInputValue.trim() || isTuningLoading) return;
    const userMsg = tuningInputValue.trim();
    setTuningInputValue(""); setTuningChatHistory(prev => [...prev, { role: 'user', content: userMsg }]); setIsTuningLoading(true);
    const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];
    const systemPrompt = `Update Aura. Return JSON: { "newAura": "...", "replyMessage": "..." }`;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: `Persona: ${persona.role}\nCurrent: ${currentTunedAura}\nUser: ${userMsg}` }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json", temperature: 0.7 } }) });
      const data = await response.json(); const result = extractJson(data.candidates?.[0]?.content?.parts?.[0]?.text);
      if (result.newAura && result.replyMessage) { setCurrentTunedAura(result.newAura); setTuningChatHistory(prev => [...prev, { role: 'assistant', content: result.replyMessage }]); }
    } catch (e) { setTuningChatHistory(prev => [...prev, { role: 'assistant', content: "오류가 발생했습니다." }]); } finally { setIsTuningLoading(false); }
  };

  const openEditTuningRoom = () => {
    setCurrentTunedEditAura(editInstruction);
    setEditTuningChatHistory([{ role: 'assistant', content: "이미지 편집 튜닝룸입니다! 원하시는 수정 방향을 대화하듯 말씀해 주세요." }]);
    setEditTuningInputValue("");
    setIsEditTuningModalOpen(true);
  };

  const handleSendEditTuningMessage = async () => {
    if (!editTuningInputValue.trim() || isEditTuningLoading) return;
    const userMsg = editTuningInputValue.trim();
    setEditTuningInputValue(""); setEditTuningChatHistory(prev => [...prev, { role: 'user', content: userMsg }]); setIsEditTuningLoading(true);
    const systemPrompt = `Update edit direction. Return JSON: { "newAura": "...", "replyMessage": "..." }`;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: `Current: ${currentTunedEditAura}\nUser: ${userMsg}` }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json", temperature: 0.7 } }) });
      const data = await response.json(); const result = extractJson(data.candidates?.[0]?.content?.parts?.[0]?.text);
      if (result.newAura && result.replyMessage) { setCurrentTunedEditAura(result.newAura); setEditTuningChatHistory(prev => [...prev, { role: 'assistant', content: result.replyMessage }]); }
    } catch (e) { setEditTuningChatHistory(prev => [...prev, { role: 'assistant', content: "오류가 발생했습니다." }]); } finally { setIsEditTuningLoading(false); }
  };

  const handleExpandIntent = async () => {
    if (!customDesignInjections.trim() || isExpandingIntent) return;
    setIsExpandingIntent(true);
    const systemPrompt = `Expand the user's keyword into a detailed Korean morphological design direction (2-3 sentences max).`;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: customDesignInjections }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.7 } }) });
      const data = await response.json(); if (data.candidates?.[0]?.content?.parts?.[0]?.text) setCustomDesignInjections(data.candidates[0].content.parts[0].text.trim());
    } catch (e) {} finally { setIsExpandingIntent(false); }
  };

  const handleEditExpandIntent = async () => {
    if (!editInstruction.trim() || isEditExpandingIntent) return;
    setIsEditExpandingIntent(true);
    const systemPrompt = `Expand edit keyword into structural Image-to-Image instruction. Return Korean.`;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: editInstruction }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.7 } }) });
      const data = await response.json(); if (data.candidates?.[0]?.content?.parts?.[0]?.text) setEditInstruction(data.candidates[0].content.parts[0].text.trim());
    } catch (e) {} finally { setIsEditExpandingIntent(false); }
  };

  const buildPrompts = () => {
    const styleList = [...staticOptions.CasualStyles, ...(dynamicOptions.CasualStyles || [])];
    const weightList = [...staticOptions.strokeWeights, ...(dynamicOptions.strokeWeights || [])];
    const kerningList = [...staticOptions.kerningOptions, ...(dynamicOptions.kerningOptions || [])];
    const terminalList = [...staticOptions.strokeEnds, ...(dynamicOptions.strokeEnds || [])];
    const sharpnessList = [...staticOptions.strokeSharpness, ...(dynamicOptions.strokeSharpness || [])];
    const textureList = [...staticOptions.strokeTextures, ...(dynamicOptions.strokeTextures || [])];
    const rhythmList = [...staticOptions.rhythmDynamics, ...(dynamicOptions.rhythmDynamics || [])];
    const slantList = staticOptions.slantAngles;
    const destList = [...staticOptions.analogImperfections, ...(dynamicOptions.analogImperfections || [])];

    const styleEn = getOptionEn(styleList, scriptType);
    const weightEn = getOptionEn(weightList, stemWeight);
    const kerningEn = getOptionEn(kerningList, kerning);
    const terminalEn = getOptionEn(terminalList, terminalStyle);
    const sharpnessEn = getOptionEn(sharpnessList, strokeSharpness);
    const textureEn = getOptionEn(textureList, strokeTexture);
    const widthEn = getOptionEn(staticOptions.widths, charWidth);
    const proportionEn = getOptionEn(staticOptions.proportions, charProportion);
    const extensionEn = getOptionEn(staticOptions.strokeExtensions, strokeExtension);
    const rhythmEn = getOptionEn(rhythmList, rhythmDynamic);
    const slantEn = getOptionEn(slantList, slantAngle);
    const imperfectionEn = getOptionEn(destList, analogImperfection);
    const occupancyEn = getOptionEn(staticOptions.occupancies, occupancy);
    const internalEn = getOptionEn(staticOptions.InternalDecorations, internalDecoration);
    const textFlowEn = getOptionEn(staticOptions.TextFlows, textFlow);
    const connectionEn = getOptionEn(staticOptions.LetterConnections, letterConnection);
    const surroundEn = getOptionEn(staticOptions.CasualSurroundings, casualSurrounding);

    const styleKo = getOptionName(styleList, scriptType);
    const weightKo = getOptionName(weightList, stemWeight);
    const kerningKo = getOptionName(kerningList, kerning);
    const terminalKo = getOptionName(terminalList, terminalStyle);
    const sharpnessKo = getOptionName(sharpnessList, strokeSharpness);
    const textureKo = getOptionName(textureList, strokeTexture);
    const widthKo = getOptionName(staticOptions.widths, charWidth);
    const proportionKo = getOptionName(staticOptions.proportions, charProportion);
    const extensionKo = getOptionName(staticOptions.strokeExtensions, strokeExtension);
    const rhythmKo = getOptionName(rhythmList, rhythmDynamic);
    const slantKo = getOptionName(slantList, slantAngle);
    const occupancyKo = getOptionName(staticOptions.occupancies, occupancy);
    const internalKo = getOptionName(staticOptions.InternalDecorations, internalDecoration);
    const textFlowKo = getOptionName(staticOptions.TextFlows, textFlow);
    const connectionKo = getOptionName(staticOptions.LetterConnections, letterConnection);
    const surroundKo = getOptionName(staticOptions.CasualSurroundings, casualSurrounding);

    const genreSpecEn = `- Fill Decoration: ${internalEn}\n- Text Flow Baseline: ${textFlowEn}\n- Connections: ${connectionEn}\n- Surrounding Elements: ${surroundEn}\n- Distortions: ${getOptionEn(staticOptions.playfulDistortions, playfulDistortion)}`;
    const layoutEn = layoutType === "1Line" ? `[LAYOUT MANDATE]: STRICT SINGLE HORIZONTAL ROW. ABSOLUTELY NO VERTICAL STACKING.` : `[LAYOUT MANDATE]: Balanced Two-tier vertical stacked composition.`;
    const userAuraEn = customDesignInjections ? `\n[USER DESIGN DIRECTION / AURA]: ${customDesignInjections}` : "";

    const layoutKo = layoutType === "1Line" ? `[레이아웃 강제]: 엄격한 1줄 가로 배열. 세로 적층 절대 금지.` : `[레이아웃 강제]: 균형잡힌 2줄 세로 적층 구성.`;
    const userAuraKo = customDesignInjections ? `\n[사용자 디자인 지시 / 아우라]: ${customDesignInjections}` : "";
    const subTraitContextKo = `\n[세부 속성 집중도]: ${getSliderText(personaSliderValue)}`;
    const subTraitContext = `\n[SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)}`;

    const artisticBoost = enhanceMode === 'wild' ? `\n[PLAYFUL CHAOS ENGINE]: ENABLED.` : "";
    const qualityBoost = enhanceMode === 'perfection' ? `\n[FLAWLESS VECTOR ENGINE]: ENABLED.` : "";
    const transformationBoost = enhanceMode === 'creative' ? `\n[CALLIGRAPHIC ORNAMENT ENGINE]: ENABLED.` : "";
    const momentumBoost = momentumActive ? `\n[RHYTHMIC BOUNCE ENGINE]: ENABLED.` : "";
    const bgDesc = getOptionEn(staticOptions.base, baseStyle) || "JET BLACK Background";
    const bgDescKo = getOptionName(staticOptions.base, baseStyle) || "제트 블랙 배경";

    const artisticBoostKo = enhanceMode === 'wild' ? `\n[유쾌한 혼돈 시스템]: 활성화됨.` : "";
    const qualityBoostKo = enhanceMode === 'perfection' ? `\n[무결점 벡터 시스템]: 활성화됨.` : "";
    const transformationBoostKo = enhanceMode === 'creative' ? `\n[캘리그라피 장식 시스템]: 활성화됨.` : "";
    const momentumBoostKo = momentumActive ? `\n[리듬 바운스 시스템]: 활성화됨.` : "";

    const activePersonaData = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];
    const morphologyBody = `${weightEn}, ${kerningEn}, Width(${widthEn}), Specific Proportion(${proportionEn}).`;
    const morphologyDetail = isAdvancedOptionsEnabled ? `\n- Detail: ${terminalEn}, ${sharpnessEn}, Texture(${textureEn}), Extension(${extensionEn}).\n${genreSpecEn}\n- Slant: ${slantEn}` : "";

    const morphologyBodyKo = `${weightKo}, ${kerningKo}, 자폭(${widthKo}), 특정 비율(${proportionKo}).`;
    const morphologyDetailKo = isAdvancedOptionsEnabled ? `\n- 디테일: ${terminalKo}, ${sharpnessKo}, 텍스처(${textureKo}), 연장선(${extensionKo}).\n- 채우기 장식: ${internalKo}\n- 베이스라인 흐름: ${textFlowKo}\n- 글자 연결성: ${connectionKo}\n- 주변 요소: ${surroundKo}\n- 왜곡: ${getOptionName(staticOptions.playfulDistortions, playfulDistortion)}\n- 기울기: ${slantKo}` : "";

    const personaMandate = `\n[DIRECTOR PERSONA MANDATE - ${activePersonaData.shortTitle}]:\n- Focus: Apply '${activePersonaData.keywords}' aesthetics heavily.\n${activePersonaData.instructionRule}`;
    const personaMandateKo = `\n[디렉터 페르소나 명령 - ${activePersonaData.shortTitle}]:\n- 역할: ${activePersonaData.role}\n- 집중: '${activePersonaData.keywords}' 미학을 강력하게 적용하십시오.`;

    const baseTechnicalEn = `[MASTER TYPO SPECS V2.5] Text: "${inputText}". ${userAuraEn}${subTraitContext}
[CORE PHILOSOPHY]: DO NOT render standard flat fonts. Create artistic custom typography.
[STRICT MONOCHROME]: NO COLORS. STRICT BLACK AND WHITE ONLY.
[SPATIAL MANDATE]: ${occupancyEn}
${layoutEn}${personaMandate}
[PROPORTION SAFETY]: Force ${proportionEn} proportion and ${widthEn} width. Strictly PROHIBIT vertical stretching.
[MORPHOLOGY]:
- Theme: ${isAdvancedOptionsEnabled ? styleEn : `Casual Theme`}.
- Body: ${morphologyBody}${morphologyDetail}
[RHYTHM]: ${rhythmEn}.
[ENVIRONMENT]: AR ${aspectRatio}, ${bgDesc}.${artisticBoost}${qualityBoost}${transformationBoost}${momentumBoost}`.trim();

    const baseTechnicalKo = `[마스터 타이포 스펙 V2.9 - 캐주얼 코어] 텍스트: "${inputText}". ${userAuraKo}${subTraitContextKo}
[핵심 철학]: 일반 폰트 렌더링 금지. 예술적인 커스텀 타이포그래피 생성.
[엄격한 단색화]: 색상 금지, 채도 0, 순수 흑백.
[공간 할당]: ${occupancyKo}
${layoutKo}${personaMandateKo}
[비율 안전장치]: ${proportionKo} 비율, ${widthKo} 자폭. 세로 적층 금지.
[형태학]:
- 테마: ${isAdvancedOptionsEnabled ? styleKo : `캐주얼 기본 테마`}.
- 뼈대: ${morphologyBodyKo}${morphologyDetailKo}
[리듬감]: ${rhythmKo}.
[환경]: 화면비 ${aspectRatio}, ${bgDescKo}.${artisticBoostKo}${qualityBoostKo}${transformationBoostKo}${momentumBoostKo}`.trim();

    const baseTechnical = { en: baseTechnicalEn, ko: baseTechnicalKo };

    const overview = `[ V2.6 CASUAL & CALLI OVERVIEW ]
■ SUBJECT: "${inputText}"
■ DIRECTOR PERSONA: ${activePersonaData.shortTitle}
■ DESIGN AURA: ${customDesignInjections || "기본 셋업"}

[ CORE SETTINGS ]
• Theme: ${styleEn}
• Ends/Terminals: ${terminalEn}
• Rhythm: ${rhythmEn}`;

    const chatGPTOutput = {
      en: `Render "${inputText}" in 2D flat silhouette graphic. Layout: ${layoutEn}. Aura: ${customDesignInjections}. ${isAdvancedOptionsEnabled ? `Texture(${textureEn}), Slant(${slantEn})` : 'Aura Driven'}`,
      ko: `"${inputText}" 텍스트를 2D 흑백 그래픽으로 렌더링. 레이아웃: ${layoutKo}. 방향성: ${customDesignInjections}. ${isAdvancedOptionsEnabled ? `텍스처(${textureKo}), 기울기(${slantKo})` : '아우라 기반'}`
    };

    const midjourneyOutput = {
      en: `${inputText} typography logotype, ${customDesignInjections}, ${isAdvancedOptionsEnabled ? textureEn : ''} pure black and white, --ar ${aspectRatio.replace(':', ':')} --no 3d, font, color`,
      ko: `${inputText} 타이포그래피 로고타입, ${customDesignInjections}, ${isAdvancedOptionsEnabled ? textureKo : ''} 완전한 흑백, --ar ${aspectRatio.replace(':', ':')} --no 3d, font, color`
    };

    let finalOut = overview;
    if (aiModel === 'NanoBanana') finalOut = nanoViewMode === 'optimized' ? optimizedPrompt : (dramaticPrompt || null);
    else if (aiModel === 'ChatGPT') finalOut = cgEnhancedPrompt || chatGPTOutput;
    else if (aiModel === 'Midjourney') finalOut = mjOptimizedPrompt || midjourneyOutput;

    return { baseTechnical, outputContent: finalOut || overview, overview };
  };

  const buildEditPrompts = () => {
    const baseLock = `[ABSOLUTE LOCKS]:\n1. PURE BLACK BACKGROUND.\n2. STRUCTURE PRESERVATION.`;
    const baseLockKo = `[절대 규칙]:\n1. 순수 블랙 배경 유지.\n2. 구조 보존.`;

    let targetDetails = "";
    let targetDetailsKo = "";

    if (editTargetCategory === "texture") { targetDetails = `Apply internal texture: ${getOptionEn(editOptions.textures, editTexStyle)}`; targetDetailsKo = `내부 질감 적용: ${getOptionName(editOptions.textures, editTexStyle)}`; }
    else if (editTargetCategory === "edge") { targetDetails = `Modify stroke terminals and corners: ${getOptionEn(editOptions.edges, editEdgeStyle)}`; targetDetailsKo = `획 마감 및 모서리 수정: ${getOptionName(editOptions.edges, editEdgeStyle)}`; }
    else if (editTargetCategory === "extension") { targetDetails = `Add stroke extensions: ${getOptionEn(editOptions.extensions, editExtStyle)}`; targetDetailsKo = `획 연장 및 장식 추가: ${getOptionName(editOptions.extensions, editExtStyle)}`; }
    else if (editTargetCategory === "rhythm") { targetDetails = `Modify overall rhythm: ${getOptionEn(editOptions.rhythms, editRhythmStyle)}`; targetDetailsKo = `전체 리듬감 수정: ${getOptionName(editOptions.rhythms, editRhythmStyle)}`; }
    else if (editTargetCategory === "object") { targetDetails = `Replace the letter '${editObjLetter || "?"}' with a stylized graphic object of '${editObjItem || "?"}'.`; targetDetailsKo = `'${editObjLetter || "?"}' 글자를 '${editObjItem || "?"}' 그래픽 오브제로 치환.`; }

    const instruction = editInstruction ? `\n- Additional Note: ${editInstruction}` : "";
    const instructionKo = editInstruction ? `\n- 추가 노트: ${editInstruction}` : "";

    const baseTechnicalEn = `[IMAGE-TO-IMAGE TYPOGRAPHY MICRO-EDIT V2.0]\n${baseLock}\n\n[TARGETED EDIT INSTRUCTION]:\n- Edit Goal: MICRO-ADJUSTMENT\n- Focus: ${targetDetails}${instruction}\n\n[EXECUTION RULE]: ONLY apply the targeted edit.`;
    const baseTechnicalKo = `[이미지-투-이미지 타이포그래피 마이크로 편집]\n${baseLockKo}\n\n[타겟 편집 지시]:\n- 편집 목표: 마이크로-조정\n- 집중: ${targetDetailsKo}${instructionKo}\n\n[실행 규칙]: 오직 타겟이 된 영역만 편집할 것.`;

    const baseTechnical = { en: baseTechnicalEn, ko: baseTechnicalKo };

    const overview = `[ V2.6 I2I MICRO-EDIT OVERVIEW ]
■ EXPERT MODE: Surgical Precision Editor

[ ABSOLUTE LOCKS ]
• Background: STRICTLY BLACK
• Rule: Preserve base shape and layout

[ TARGET INSTRUCTION ]
• Category: ${editOptions.categories.find(c=>c.id === editTargetCategory)?.name}
• Target Detail: ${targetDetails.split(':')[1]?.trim() || targetDetails}
• Custom Note: ${editInstruction || "None"}`;

    const chatGPTOutput = {
      en: `Redraw the provided base image applying ONLY a micro-edit. Edit Request: ${targetDetails}. ${editInstruction}`,
      ko: `제공된 베이스 이미지를 바탕으로 마이크로 에디팅만 적용. 수정 요청: ${targetDetailsKo}. ${editInstruction}`
    };

    const midjourneyOutput = {
      en: `[UPLOAD BASE IMAGE] image-to-image micro edit, ${targetDetails.replace(':', '')}, ${editInstruction}, --ar 16:9 --iw 1.8 --style raw --no 3d, font, color`,
      ko: `[베이스 이미지 업로드] 이미지-투-이미지 마이크로 에디트, ${targetDetailsKo.replace(':', '')}, ${editInstruction}, --ar 16:9 --iw 1.8 --style raw --no 3d, font, color`
    };

    let finalOut = overview;
    if (editAiModel === 'NanoBanana') finalOut = editNanoMode === 'optimized' ? editOptimizedPrompt : (editDramaticPrompt || null);
    else if (editAiModel === 'ChatGPT') finalOut = editCgPrompt || chatGPTOutput;
    else if (editAiModel === 'Midjourney') finalOut = editMjPrompt || midjourneyOutput;

    return { baseTechnical, outputContent: finalOut || overview };
  };

  const requestDramaticEnhancement = async () => {
    if (isEnhancing) return;
    if (!(await ensureCanGenerate())) return;
    setIsEnhancing(true);
    const { baseTechnical } = buildPrompts();
    const systemPrompt = `Return STRICTLY JSON: { "en": "...", "ko": "..." }`;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: baseTechnical.en }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json", temperature: 0.7 } }) });
      const data = await response.json();
      const resultObj = extractJson(data.candidates?.[0]?.content?.parts?.[0]?.text);
      setDramaticPrompt(resultObj); setNanoViewMode('enhanced'); setIsOutdated(false);
    } catch (err) {} finally { setIsEnhancing(false); }
  };

  const requestEditDramaticEnhancement = async () => {
    if (isEditEnhancing) return;
    setIsEditEnhancing(true);
    const { baseTechnical } = buildEditPrompts();
    const systemPrompt = `Return STRICTLY JSON: { "en": "...", "ko": "..." }`;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: baseTechnical.en }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json", temperature: 0.7 } }) });
      const data = await response.json();
      const resultObj = extractJson(data.candidates?.[0]?.content?.parts?.[0]?.text);
      setEditDramaticPrompt(resultObj); setEditNanoMode('enhanced'); setIsEditOutdated(false);
    } catch (err) {} finally { setIsEditEnhancing(false); }
  };

  const requestPromptOptimization = async (isEdit = false) => {
    if (isEdit) { if (isEditOptimizing) return; setIsEditOptimizing(true); } else { if (isOptimizing) return; setIsOptimizing(true); }
    const { baseTechnical } = isEdit ? buildEditPrompts() : buildPrompts();
    const systemPrompt = `Convert into dense comma-separated tag string. Return STRICTLY JSON: { "en": "...", "ko": "..." }`;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: baseTechnical.en }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json", temperature: 0.2 } }) });
      const data = await response.json();
      const resultObj = extractJson(data.candidates?.[0]?.content?.parts?.[0]?.text);
      if (isEdit) { setEditOptimizedPrompt(resultObj); setEditNanoMode("optimized"); setIsEditOutdated(false); }
      else { setOptimizedPrompt(resultObj); setNanoViewMode("optimized"); setIsOutdated(false); }
    } catch (err) {} finally { if (isEdit) setIsEditOptimizing(false); else setIsOptimizing(false); }
  };

  const requestMidjourneyOptimization = async (isEdit = false) => {
    if (isEdit) { if (isEditMjOptimizing) return; setIsEditMjOptimizing(true); } else { if (isMjOptimizing) return; setIsMjOptimizing(true); }
    const { baseTechnical } = isEdit ? buildEditPrompts() : buildPrompts();
    const systemPrompt = `Convert into Midjourney V6 tag string. Return STRICTLY JSON: { "en": "...", "ko": "..." }`;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: baseTechnical.en }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json", temperature: 0.2 } }) });
      const data = await response.json();
      const resultObj = extractJson(data.candidates?.[0]?.content?.parts?.[0]?.text);
      if (isEdit) { setEditMjPrompt(resultObj); setIsEditOutdated(false); } else { setMjOptimizedPrompt(resultObj); setIsOutdated(false); }
    } catch (err) {} finally { if (isEdit) setIsEditMjOptimizing(false); else setIsMjOptimizing(false); }
  };

  const requestChatGPTEnhancement = async (isEdit = false) => {
    if (isEdit) { if (isEditCgEnhancing) return; setIsEditCgEnhancing(true); } else { if (isCgEnhancing) return; setIsCgEnhancing(true); }
    const { baseTechnical } = isEdit ? buildEditPrompts() : buildPrompts();
    const systemPrompt = `Create DALL-E 3 instructions. Return STRICTLY JSON: { "en": "...", "ko": "..." }`;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: baseTechnical.en }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json", temperature: 0.7 } }) });
      const data = await response.json();
      const resultObj = extractJson(data.candidates?.[0]?.content?.parts?.[0]?.text);
      if (isEdit) { setEditCgPrompt(resultObj); setIsEditOutdated(false); } else { setCgEnhancedPrompt(resultObj); setIsOutdated(false); }
    } catch (err) {} finally { if (isEdit) setIsEditCgEnhancing(false); else setIsCgEnhancing(false); }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0A] text-zinc-200 font-sans overflow-hidden transition-colors duration-500 relative selection:bg-zinc-700 selection:text-white">
      {usageModal}
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }`}</style>
      <main className="flex-1 flex overflow-hidden">

        {/* Left Navigation Sidebar */}
        <aside className={`${isSidebarOpen ? 'w-[240px]' : 'w-[72px]'} border-r bg-[#111111] border-zinc-800/80 flex flex-col transition-all duration-300 shrink-0 z-[200]`}>
          <div className="h-[72px] flex items-center px-6 justify-between border-b border-zinc-800/80">
             {isSidebarOpen ? <h1 className="app-title text-2xl text-white tracking-wide flex items-baseline gap-1.5"><span className="font-light">Typecore</span> <span className="font-semibold">Breeze</span></h1> : <Menu className="w-5 h-5 mx-auto text-zinc-500 cursor-pointer hover:text-zinc-300" onClick={() => setIsSidebarOpen(true)}/>}
          </div>
          <div className="p-4">
             <div className="flex rounded-md p-1 bg-[#1A1A1A] border border-zinc-800 relative">
                <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded shadow-[0_1px_3px_rgba(0,0,0,0.5)] transition-all duration-300 ${currentView === 'editor' ? 'left-1 bg-[#2C2C2C]' : 'left-[calc(50%+2px)] bg-[#2C2C2C]'}`}></div>
                <button onClick={() => { setCurrentView('editor'); setBaseLangView('ko'); }} className={`flex-1 py-1.5 text-[11px] font-bold rounded relative z-10 flex items-center justify-center gap-1.5 ${currentView === 'editor' ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}><PenTool className="w-3.5 h-3.5" /> Creation</button>
                <button onClick={() => { setCurrentView('edit'); setBaseLangView('ko'); }} className={`flex-1 py-1.5 text-[11px] font-bold rounded relative z-10 flex items-center justify-center gap-1.5 ${currentView === 'edit' ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}><Edit3 className="w-3.5 h-3.5" /> Micro-Edit</button>
             </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 custom-scrollbar">
             <div className="text-[10px] font-bold text-zinc-600 mb-3 px-1">WORKSPACE</div>
             <button onClick={() => handleCategoryChange('casual')} className={`flex items-center w-full px-3 py-2.5 rounded-md justify-start gap-3 transition-all ${selectedCategory === 'casual' ? 'bg-zinc-800 text-zinc-100 font-bold shadow-sm' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>
               <Smile className={`w-4 h-4 shrink-0 ${selectedCategory === 'casual' ? 'text-zinc-300' : ''}`} /> {isSidebarOpen && <span className="text-[12px]">Casual Pop</span>}
             </button>
             <button onClick={() => handleCategoryChange('calli')} className={`flex items-center w-full px-3 py-2.5 rounded-md justify-start gap-3 transition-all ${selectedCategory === 'calli' ? 'bg-zinc-800 text-zinc-100 font-bold shadow-sm' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>
               <Feather className={`w-4 h-4 shrink-0 ${selectedCategory === 'calli' ? 'text-zinc-300' : ''}`} /> {isSidebarOpen && <span className="text-[12px]">Calligraphy</span>}
             </button>
          </div>
        </aside>

        {/* MICRO-EDIT VIEW */}
        {currentView === 'edit' && (
        <>
          <aside className="w-[360px] shrink-0 border-r bg-[#111111] flex flex-col border-zinc-800/80 overflow-y-auto p-5 space-y-6 custom-scrollbar">
             <div className="space-y-3">
               <div className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> 1. Reference Image</div>
               <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleEditDrop} className={`relative rounded-xl border-2 border-dashed p-5 text-center transition-all flex flex-col items-center justify-center min-h-[100px] ${isDragging ? 'border-zinc-500 bg-zinc-800' : 'border-zinc-800 bg-[#16161D] hover:border-zinc-700'}`}>
                  {editUploadedImage ? (
                    <div className="w-full relative group">
                        <img src={editUploadedImage} className="max-h-24 mx-auto object-contain rounded" />
                        <button onClick={() => setEditUploadedImage(null)} className="absolute top-1 right-1 p-1 bg-black/70 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3.5 h-3.5 text-zinc-300" /></button>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="w-5 h-5 text-zinc-600 mb-2" />
                      <div className="text-[11px] text-zinc-400">Click or drag image here</div>
                    </>
                  )}
                  {!editUploadedImage && <input type="file" onChange={handleEditImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />}
               </div>
             </div>

             <hr className="border-zinc-800/80" />

             <div className={`transition-all duration-300 space-y-4 ${!editUploadedImage ? 'opacity-30 pointer-events-none' : ''}`}>
                 <div className="text-[10px] font-bold uppercase text-zinc-500 flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><MousePointerClick className="w-3.5 h-3.5" /> 2. Target Element</span>
                 </div>
                 <div className="flex flex-col gap-1.5">
                    {editOptions.categories.map(cat => (
                      <button key={cat.id} onClick={() => setEditTargetCategory(cat.id)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left ${editTargetCategory === cat.id ? 'bg-[#1E1E1E] border-zinc-600' : 'bg-transparent border-transparent hover:bg-zinc-800/50 hover:border-zinc-800'}`}>
                         <div className={`${editTargetCategory === cat.id ? 'text-zinc-200' : 'text-zinc-500'}`}>{cat.icon}</div>
                         <div className="flex-1 overflow-hidden">
                            <div className={`text-[11px] font-bold truncate ${editTargetCategory === cat.id ? 'text-zinc-100' : 'text-zinc-400'}`}>{cat.name}</div>
                         </div>
                      </button>
                    ))}
                 </div>

                 <div className="pt-4 border-t border-zinc-800/80">
                    <div className="text-[10px] font-bold uppercase text-zinc-500 mb-3">Sub-Style</div>
                    {editTargetCategory === 'texture' && <DropdownControl data={editOptions.textures} value={editTexStyle} onChange={setEditTexStyle} disabled={false} />}
                    {editTargetCategory === 'edge' && <DropdownControl data={editOptions.edges} value={editEdgeStyle} onChange={setEditEdgeStyle} disabled={false} />}
                    {editTargetCategory === 'extension' && <DropdownControl data={editOptions.extensions} value={editExtStyle} onChange={setEditExtStyle} disabled={false} />}
                    {editTargetCategory === 'rhythm' && <DropdownControl data={editOptions.rhythms} value={editRhythmStyle} onChange={setEditRhythmStyle} disabled={false} />}
                    {editTargetCategory === 'object' && (
                      <div className="space-y-3">
                         <div className="flex gap-2">
                            <input value={editObjLetter} onChange={e => setEditObjLetter(e.target.value)} placeholder="Target Letter (e.g. A)" className="w-1/3 bg-[#111111] border border-zinc-800 rounded-md p-2.5 text-[11px] text-white outline-none focus:border-zinc-500 transition-colors" />
                            <input value={editObjItem} onChange={e => setEditObjItem(e.target.value)} placeholder="Object (e.g. Star, Heart)" className="flex-1 bg-[#111111] border border-zinc-800 rounded-md p-2.5 text-[11px] text-white outline-none focus:border-zinc-500 transition-colors" />
                         </div>
                      </div>
                    )}
                 </div>

                 <div className="pt-4 border-t border-zinc-800/80">
                    <div className="text-[10px] font-bold uppercase text-zinc-500 mb-3 flex justify-between items-center">
                       <span>Additional Instructions</span>
                       {editInstruction && <button onClick={() => setEditInstruction("")} className="text-[9px] hover:text-zinc-300">Clear</button>}
                    </div>
                    <textarea value={editInstruction} onChange={e => setEditInstruction(e.target.value)} placeholder="e.g., Make it look slightly worn out..." className="w-full bg-[#111111] border border-zinc-800 rounded-md p-3 outline-none min-h-[4rem] resize-none text-[11px] text-zinc-200 focus:border-zinc-500 transition-colors custom-scrollbar" />
                    <div className="mt-3 flex justify-end gap-2">
                      <Tooltip text="AI 튜닝 어시스턴트 열기">
                        <button onClick={openEditTuningRoom} className="w-8 h-8 rounded-md flex items-center justify-center bg-[#1A1A1A] hover:bg-[#2C2C2C] border border-zinc-800 transition-colors text-violet-400 hover:text-violet-300">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    </div>
                 </div>
             </div>
          </aside>

          <div className="flex-1 flex flex-col p-8 lg:p-12 overflow-y-auto custom-scrollbar bg-[#0A0A0A]">
            <div className="max-w-[800px] w-full mx-auto space-y-6 pb-20">
              <div className="flex items-center gap-3 px-2">
                <Shield className="w-5 h-5 text-zinc-500" />
                <div>
                   <h2 className="text-[13px] font-bold text-zinc-200">Surgical Micro-Edit Mode</h2>
                   <p className="text-[11px] text-zinc-500 mt-0.5">Strictly preserves 2D shape & layout while modifying specific textures or terminals.</p>
                </div>
              </div>

              <div className="rounded-xl border bg-[#111111] border-zinc-800 overflow-hidden">
                <div className="w-full flex justify-between items-center p-4 bg-[#141414]">
                  <button onClick={() => setIsEditPromptExpanded(!isEditPromptExpanded)} className="flex items-center gap-2 hover:bg-zinc-800/50 p-1.5 rounded-md transition-all">
                    <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isEditPromptExpanded ? 'rotate-180' : ''}`} />
                    <span className="text-[11px] font-bold uppercase text-zinc-300">Base Technical Prompt (I2I)</span>
                  </button>
                  <div className="flex bg-zinc-900 rounded p-0.5 border border-zinc-800">
                    <button onClick={(e) => { e.stopPropagation(); setBaseLangView('en'); }} className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded transition-all ${baseLangView === 'en' ? 'bg-zinc-700 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>EN</button>
                    <button onClick={(e) => { e.stopPropagation(); setBaseLangView('ko'); }} className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded transition-all ${baseLangView === 'ko' ? 'bg-zinc-700 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>KO</button>
                  </div>
                </div>
                <div className={`font-mono text-[11px] text-zinc-400 whitespace-pre-wrap leading-relaxed relative transition-all duration-300 ${isEditPromptExpanded ? 'max-h-[800px] p-5 opacity-100' : 'max-h-0 p-0 opacity-0'}`}>
                  {baseLangView === 'ko' ? buildEditPrompts().baseTechnical.ko : buildEditPrompts().baseTechnical.en}
                </div>
              </div>

              <div className="flex p-1 bg-[#111111] rounded-lg border border-zinc-800">
                 <button onClick={() => setEditAiModel('Overview')} className={`flex-1 py-2.5 rounded-md text-[11px] font-bold uppercase transition-all ${editAiModel === 'Overview' ? 'bg-[#2C2C2C] text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Overview</button>
                 {aiOptimizationModels.map(model => (
                   <button key={model.id} onClick={() => setEditAiModel(model.id)} className={`flex-1 py-2.5 rounded-md text-[11px] font-bold uppercase transition-all ${editAiModel === model.id ? 'bg-[#2C2C2C] text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>{model.name}</button>
                 ))}
              </div>

              <div className="flex gap-2 w-full overflow-x-auto custom-scrollbar pb-1">
                 {editAiModel === 'NanoBanana' && (
                   <>
                      <button onClick={() => requestEditDramaticEnhancement()} disabled={isEditEnhancing} className="flex-1 min-w-[150px] whitespace-nowrap px-4 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold text-[11px] uppercase flex justify-center items-center gap-2 transition-colors shadow-sm disabled:opacity-50">
                         {isEditEnhancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5" />} Generate Prompt
                      </button>
                      <button onClick={() => requestPromptOptimization(true)} disabled={isEditOptimizing} className="flex-1 min-w-[150px] whitespace-nowrap px-4 py-3 bg-violet-900/30 hover:bg-violet-900/50 text-violet-300 border border-violet-500/30 rounded-lg font-bold text-[11px] uppercase flex justify-center items-center gap-2 transition-colors disabled:opacity-50">
                         {isEditOptimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />} Optimize Tags
                      </button>
                   </>
                 )}
                 {editAiModel === 'Midjourney' && (
                   <button onClick={() => requestMidjourneyOptimization(true)} disabled={isEditMjOptimizing} className="flex-1 whitespace-nowrap px-4 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold text-[11px] uppercase flex justify-center items-center gap-2 transition-colors shadow-sm disabled:opacity-50">
                      {isEditMjOptimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />} Generate MJ V6
                   </button>
                 )}
                 {editAiModel === 'ChatGPT' && (
                   <button onClick={() => requestChatGPTEnhancement(true)} disabled={isEditCgEnhancing} className="flex-1 whitespace-nowrap px-4 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold text-[11px] uppercase flex justify-center items-center gap-2 transition-colors shadow-sm disabled:opacity-50">
                      {isEditCgEnhancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5" />} Generate DALL-E 3
                   </button>
                 )}
              </div>

              <AiOutputBox modelState={editAiModel} viewModeState={editNanoMode} setViewMode={setEditNanoMode} content={buildEditPrompts().outputContent} isEdit={true} outdatedFlag={isEditOutdated} onCopy={copyToClipboard} copiedState={copiedBottom}/>

              {editUploadedImage && (
                 <div className="p-6 border bg-[#18181B] border-zinc-800 rounded-md flex justify-center">
                    <img src={editUploadedImage} alt="Base" className="max-h-[400px] rounded border border-zinc-700" />
                 </div>
              )}
            </div>
          </div>
        </>
        )}

        {/* CREATION VIEW */}
        {currentView === 'editor' && (
        <>
        <aside className="w-[360px] shrink-0 border-r bg-[#111111] flex flex-col border-zinc-800/80 overflow-y-auto p-5 space-y-6 custom-scrollbar">

          <div className="space-y-3">
            <div className="flex items-center justify-between">
               <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Director Persona</h3>
            </div>
            <div className="relative">
              <button onClick={() => setPersonaDropdownOpen(!personaDropdownOpen)} className="w-full flex items-center justify-between p-3.5 rounded-xl border border-zinc-700/80 bg-[#16161D] hover:border-zinc-600 transition-all text-left">
                <div className="flex items-center gap-3">
                   <div className="text-zinc-400 bg-zinc-800 p-2 rounded-md">{directorPersonas.find(p=>p.id===aiPersona)?.icon || <Star className="w-4 h-4" />}</div>
                   <div className="overflow-hidden">
                      <div className="text-[11px] font-bold text-zinc-200 truncate">{directorPersonas.find(p=>p.id===aiPersona)?.shortTitle || "Select Persona"}</div>
                      <div className="text-[9px] text-zinc-500 mt-0.5 truncate">{directorPersonas.find(p=>p.id===aiPersona)?.subtitle || "..."}</div>
                   </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${personaDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {personaDropdownOpen && (
                <div className="absolute top-full left-0 w-full mt-2 bg-[#1A1A1A] border border-zinc-700 rounded-xl overflow-hidden shadow-2xl z-[1000] flex flex-col max-h-[300px] overflow-y-auto custom-scrollbar">
                  {directorPersonas.filter(p => p.category === selectedCategory).map(p => (
                    <button key={p.id} onClick={() => { setAiPersona(p.id); setPersonaDropdownOpen(false); }} className={`w-full text-left p-3.5 flex items-center gap-3 transition-all ${aiPersona === p.id ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'}`}>
                      <div className={`p-2 rounded-md ${aiPersona === p.id ? 'bg-white text-black' : 'bg-[#111] text-zinc-500'}`}>{p.icon}</div>
                      <div className="flex-1 overflow-hidden">
                        <div className={`text-[11px] font-bold truncate ${aiPersona === p.id ? 'text-white' : 'text-zinc-300'}`}>{p.shortTitle}</div>
                        <div className="text-[9px] text-zinc-500 mt-0.5 truncate">{p.subtitle}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <hr className="border-zinc-800/80" />

          <div className="rounded-xl border border-[#D4AF37]/30 bg-[#16161D]/40 p-5 space-y-6 shadow-[0_0_15px_rgba(212,175,55,0.05)]">
            <div className="space-y-4">
               <div>
                  <div className="mb-2 text-[10px] font-bold uppercase text-zinc-400 flex items-center gap-1.5">Subject Text</div>
                  <input value={inputText} onChange={e => setInputText(e.target.value)} className="w-full bg-transparent border-b border-zinc-600 focus:border-[#D4AF37] text-[20px] font-bold outline-none pb-2 text-zinc-100 transition-colors" placeholder="Enter text..." />
               </div>

               <div>
                  <div className="mb-2 flex items-center justify-between">
                     <div className="text-[10px] font-bold uppercase text-violet-400">Design Aura</div>
                     <div className="flex gap-1.5">
                       <Tooltip text="AI 튜닝 어시스턴트">
                         <button onClick={() => openTuningRoom()} disabled={!customDesignInjections.trim()} className={`w-6 h-6 rounded flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${!customDesignInjections.trim() ? 'bg-zinc-800 text-zinc-500' : 'bg-violet-900/50 text-violet-300 hover:bg-violet-600 hover:text-white border border-violet-500/50'}`}><MessageSquare className="w-3 h-3" /></button>
                       </Tooltip>
                       <Tooltip text="키워드 상세 구체화">
                         <button onClick={handleExpandIntent} disabled={isExpandingIntent || !customDesignInjections.trim()} className={`w-6 h-6 rounded flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isExpandingIntent ? 'bg-violet-600 text-white' : (!customDesignInjections.trim() ? 'bg-zinc-800 text-zinc-500' : 'bg-violet-900/50 text-violet-300 hover:bg-violet-600 hover:text-white border border-violet-500/50')}`}>{isExpandingIntent ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2Icon className="w-3 h-3" />}</button>
                       </Tooltip>
                     </div>
                  </div>
                  <textarea value={customDesignInjections} onChange={e => setCustomDesignInjections(e.target.value)} placeholder="e.g. Minimalist, bouncy..." className="w-full bg-[#1A1A24] border border-violet-500/30 text-[11px] rounded-md p-3 outline-none min-h-[4rem] resize-none text-violet-100 custom-scrollbar focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all placeholder:text-zinc-600" />

                  <div className="mt-3 px-1">
                     <div className="flex justify-between items-center mb-2">
                        <span className="text-[9px] font-bold text-zinc-500">{sliderDesc.leftLabel}</span>
                        <span className="text-[9px] font-bold text-zinc-500">{sliderDesc.rightLabel}</span>
                     </div>
                     <input type="range" min="0" max="100" value={personaSliderValue} onChange={e => setPersonaSliderValue(e.target.value)} className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-violet-400 [&::-webkit-slider-thumb]:rounded-full" />
                  </div>
               </div>
            </div>

            <hr className="border-zinc-700/50" />

            <div className="space-y-3">
               <div className="text-[10px] font-bold uppercase text-zinc-400">Reference Style (I2P)</div>
               <div onDragOver={handleStyleDragOver} onDragLeave={handleStyleDragLeave} onDrop={handleStyleDrop} className={`relative rounded-xl border-2 border-dashed p-4 transition-all flex flex-col items-center justify-center min-h-[90px] ${isStyleDragging ? 'border-violet-500 bg-violet-900/20' : 'border-zinc-700 bg-[#111111] hover:border-zinc-500'}`}>
                  {styleImage ? (
                    <div className="w-full space-y-3">
                        <div className="relative group mx-auto w-max">
                          <img src={styleImage} className="h-14 object-cover rounded border border-zinc-600" />
                          <button onClick={() => setStyleImage(null)} className="absolute -top-1 -right-1 p-1 bg-black/80 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3 text-zinc-300" /></button>
                        </div>
                        <button onClick={analyzeStyleImage} disabled={isAnalyzingStyle} className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white rounded font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 transition-all shadow-[0_0_10px_rgba(139,92,246,0.3)]">
                          {isAnalyzingStyle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanLine className="w-3.5 h-3.5" />} Extract Style
                        </button>
                    </div>
                  ) : (
                    <div className="text-center pointer-events-none">
                       <ImageIcon className="w-4 h-4 text-zinc-500 mx-auto mb-1.5" />
                       <div className="text-[10px] text-zinc-400">Drop style reference here</div>
                    </div>
                  )}
                  {!styleImage && <input type="file" accept="image/*" onChange={handleStyleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />}
               </div>
            </div>
          </div>

          <hr className="border-zinc-800/80" />

          <section>
            <SectionHeader id="01" label="Base Layout" icon={<LayoutTemplate className="w-3.5 h-3.5" />} />
            <div className="p-4 rounded-xl border bg-[#111111] border-zinc-800/80 space-y-4 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <DropdownControl label="Ratio" data={staticOptions.ratios} value={aspectRatio} onChange={setAspectRatio} disabled={false} />
                <DropdownControl label="Occupancy" data={staticOptions.occupancies} value={occupancy} onChange={setOccupancy} disabled={false} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <DropdownControl label="Background" icon={<Box className="w-3 h-3" />} data={staticOptions.base} value={baseStyle} onChange={setBaseStyle} disabled={false} />
                <DropdownControl label="Layout" data={staticOptions.layouts} value={layoutType} onChange={setLayoutType} disabled={false} />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-800/50">
                <DropdownControl label="Width" data={staticOptions.widths} value={charWidth} onChange={setCharWidth} disabled={false} />
                <DropdownControl label="Proportion" data={staticOptions.proportions} value={charProportion} onChange={setCharProportion} disabled={false} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <DropdownControl label="Weight" data={[...staticOptions.strokeWeights, ...(dynamicOptions.strokeWeights || [])]} value={stemWeight} onChange={setStemWeight} disabled={false} />
                <DropdownControl label="Kerning" data={[...staticOptions.kerningOptions, ...(dynamicOptions.kerningOptions || [])]} value={kerning} onChange={setKerning} disabled={false} />
              </div>

              <div className="flex gap-2 pt-3 border-t border-zinc-800/50">
                <button onClick={handleAiRecommendation} disabled={isRecommending} className="flex-1 py-2.5 rounded-md bg-violet-600 hover:bg-violet-500 text-white font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 transition-colors shadow-md">
                  {isRecommending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5" />} Smart Auto-Setup
                </button>
                <Tooltip text="옵션 초기화">
                  <button onClick={handleReset} className="w-9 rounded-md border border-zinc-800 hover:bg-zinc-800 flex items-center justify-center transition-colors text-zinc-500 hover:text-zinc-300 shrink-0">
                    <RefreshCcw className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
              </div>

              {aiRecSummary && (
                <div className="mt-3 p-3 rounded-md bg-violet-900/10 border border-violet-500/20 text-left">
                   <div className="flex items-center gap-2 mb-1.5">
                      <Star className="w-3.5 h-3.5 text-violet-400" />
                      <p className="text-[11px] font-bold text-violet-300">{aiRecSummary.title}</p>
                   </div>
                   <p className="text-[10px] leading-relaxed text-zinc-400">{aiRecSummary.reason}</p>
                </div>
              )}
            </div>
          </section>

          <div className="mt-6 mb-2 p-3 rounded-lg border border-zinc-800 bg-[#111111] flex items-center justify-between">
             <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-zinc-500" />
                <h3 className="text-[10px] font-bold uppercase text-zinc-400">Advanced Controls</h3>
             </div>
             <button onClick={() => setIsAdvancedOptionsEnabled(!isAdvancedOptionsEnabled)} className={`w-9 h-5 rounded-full p-0.5 flex items-center transition-colors duration-300 ${isAdvancedOptionsEnabled ? 'bg-zinc-300' : 'bg-zinc-800'}`}>
                <div className={`w-4 h-4 bg-[#111] rounded-full transition-transform duration-300 shadow-sm ${isAdvancedOptionsEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
             </button>
          </div>

          <div className={`transition-all duration-500 space-y-4 ${!isAdvancedOptionsEnabled ? 'opacity-20 pointer-events-none grayscale max-h-0 overflow-hidden' : 'max-h-[2000px]'}`}>
             <section>
                <SectionHeader id="02" label="Preset Theme" icon={<Anchor className="w-3.5 h-3.5" />} />
                <div className="p-4 rounded-xl border bg-[#111111] border-zinc-800 mt-3">
                   <DropdownControl data={[...staticOptions.CasualStyles, ...(dynamicOptions.CasualStyles || [])]} value={scriptType} onChange={handleScriptPresetChange} disabled={false} />
                </div>
             </section>

             <section>
                <SectionHeader id="03" label="Stroke Details" icon={<Edit2 className="w-3.5 h-3.5" />} />
                <div className="p-4 rounded-xl border bg-[#111111] border-zinc-800 space-y-4 mt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <DropdownControl label="Terminal" data={[...staticOptions.strokeEnds, ...(dynamicOptions.strokeEnds || [])]} value={terminalStyle} onChange={setTerminalStyle} disabled={false} />
                    <DropdownControl label="Sharpness" data={[...staticOptions.strokeSharpness, ...(dynamicOptions.strokeSharpness || [])]} value={strokeSharpness} onChange={setStrokeSharpness} disabled={false} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <DropdownControl label="Texture" data={[...staticOptions.strokeTextures, ...(dynamicOptions.strokeTextures || [])]} value={strokeTexture} onChange={setStrokeTexture} disabled={false} />
                    <DropdownControl label="Extension" data={[...staticOptions.strokeExtensions, ...(dynamicOptions.strokeExtensions || [])]} value={strokeExtension} onChange={setStrokeExtension} disabled={false} />
                  </div>
                </div>
             </section>

             <section>
                <SectionHeader id="04" label="Decorations" icon={<Heart className="w-3.5 h-3.5" />} />
                <div className="p-4 rounded-xl border bg-[#111111] border-zinc-800 space-y-4 mt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <DropdownControl label="Internal" data={staticOptions.InternalDecorations} value={internalDecoration} onChange={setInternalDecoration} disabled={false} />
                    <DropdownControl label="Baseline Flow" data={staticOptions.TextFlows} value={textFlow} onChange={setTextFlow} disabled={false} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <DropdownControl label="Connections" data={staticOptions.LetterConnections} value={letterConnection} onChange={setLetterConnection} disabled={false} />
                    <DropdownControl label="Surroundings" data={staticOptions.CasualSurroundings} value={casualSurrounding} onChange={setCasualSurrounding} disabled={false} />
                  </div>
                </div>
             </section>

             <section>
                <SectionHeader id="05" label="Rhythm & Deforms" icon={<Activity className="w-3.5 h-3.5" />} />
                <div className="p-4 rounded-xl border bg-[#111111] border-zinc-800 space-y-4 mt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <DropdownControl label="Rhythm Dynamics" data={[...staticOptions.rhythmDynamics, ...(dynamicOptions.rhythmDynamics || [])]} value={rhythmDynamic} onChange={setRhythmDynamic} disabled={false} />
                    <DropdownControl label="Slant Angle" data={staticOptions.slantAngles} value={slantAngle} onChange={setSlantAngle} disabled={false} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <DropdownControl label="Distortion" data={[...staticOptions.playfulDistortions, ...(dynamicOptions.playfulDistortions || [])]} value={playfulDistortion} onChange={setPlayfulDistortion} disabled={false} />
                    <DropdownControl label="Imperfections" data={[...staticOptions.analogImperfections, ...(dynamicOptions.analogImperfections || [])]} value={analogImperfection} onChange={setAnalogImperfection} disabled={false} />
                  </div>
                </div>
             </section>
          </div>
        </aside>

        <div className="flex-1 flex flex-col p-8 lg:p-12 overflow-y-auto custom-scrollbar bg-[#0A0A0A]">
          <div className="max-w-[800px] w-full mx-auto space-y-6 pb-20">
            <div className="flex items-center gap-3 px-2">
                <PenTool className="w-5 h-5 text-zinc-500" />
                <div>
                   <h2 className="text-[13px] font-bold text-zinc-200">Creation Workspace</h2>
                   <p className="text-[11px] text-zinc-500 mt-0.5">Define your core aesthetic and generate robust prompts for text-to-image models.</p>
                </div>
            </div>

            <div className="rounded-xl p-6 border bg-[#111111] border-zinc-800/80 shadow-xl relative">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold uppercase text-zinc-500">Base Context</span>
                  <div className="flex bg-zinc-900 rounded p-0.5 border border-zinc-800">
                    <button onClick={(e) => { e.stopPropagation(); setBaseLangView('en'); }} className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded transition-all ${baseLangView === 'en' ? 'bg-zinc-700 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>EN</button>
                    <button onClick={(e) => { e.stopPropagation(); setBaseLangView('ko'); }} className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded transition-all ${baseLangView === 'ko' ? 'bg-zinc-700 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>KO</button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Tooltip text="옵션 간 논리적 모순 수정">
                    <button onClick={verifyPromptLogic} disabled={isVerifyingLogic} className="h-7 px-3 rounded text-[10px] font-bold bg-violet-900/30 text-violet-300 hover:bg-violet-900/50 hover:text-violet-200 transition-colors border border-violet-500/30 flex items-center gap-1.5 disabled:opacity-50">
                      {isVerifyingLogic ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldAlert className="w-3 h-3" />} Logic Audit
                    </button>
                  </Tooltip>
                  <Tooltip text="프롬프트 복사">
                    <button onClick={() => copyToClipboard(baseLangView === 'ko' ? buildPrompts().baseTechnical.ko : buildPrompts().baseTechnical.en, 'top')} className="h-7 w-8 flex items-center justify-center rounded bg-[#1A1A1A] text-zinc-400 border border-zinc-700 hover:bg-[#2C2C2C] hover:text-zinc-200 transition-colors">
                      {copiedTop ? <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> : <Copy className="w-3.5 h-3.5 text-blue-400" />}
                    </button>
                  </Tooltip>
                </div>
              </div>

              <div className={`font-mono text-[11px] p-4 rounded border whitespace-pre-wrap leading-relaxed shadow-inner transition-all duration-500 ${isAuditedHighlight ? 'ring-1 ring-violet-500 bg-violet-900/10 text-violet-200 border-violet-500/50' : 'bg-[#0F0F0F] border-zinc-800 text-zinc-400'}`}>
                 {(() => {
                    const text = baseLangView === 'ko' ? buildPrompts().baseTechnical.ko : buildPrompts().baseTechnical.en;
                    const lines = text.split('\n');
                    const isLong = lines.length > 10;
                    return (!isBaseContextExpanded && isLong) ? lines.slice(0, 10).join('\n') + '\n...' : text;
                 })()}
              </div>
              {(() => {
                 const text = baseLangView === 'ko' ? buildPrompts().baseTechnical.ko : buildPrompts().baseTechnical.en;
                 if (text.split('\n').length > 10) {
                    return (
                       <button onClick={() => setIsBaseContextExpanded(!isBaseContextExpanded)} className="w-full mt-2 py-1.5 bg-[#141414] hover:bg-[#1E1E1E] border border-zinc-800/80 rounded text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors flex items-center justify-center gap-1.5">
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isBaseContextExpanded ? 'rotate-180' : ''}`} />
                          {isBaseContextExpanded ? '접기' : '더보기'}
                       </button>
                    );
                 }
                 return null;
              })()}
            </div>

            <div className="flex p-1 bg-[#111111] rounded-lg border border-zinc-800">
               <button onClick={() => setAiModel('Overview')} className={`flex-1 py-2.5 rounded-md text-[11px] font-bold uppercase transition-all ${aiModel === 'Overview' ? 'bg-[#2C2C2C] text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Overview</button>
               {aiOptimizationModels.map(model => (
                 <button key={model.id} onClick={() => setAiModel(model.id)} className={`flex-1 py-2.5 rounded-md text-[11px] font-bold uppercase transition-all ${aiModel === model.id ? 'bg-[#2C2C2C] text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>{model.name}</button>
               ))}
            </div>

            <div className="flex gap-2 w-full overflow-x-auto custom-scrollbar pb-1">
               {aiModel === 'NanoBanana' && (
                 <>
                    <button onClick={() => requestDramaticEnhancement()} disabled={isEnhancing} className="flex-1 min-w-[150px] whitespace-nowrap px-4 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold text-[11px] uppercase flex justify-center items-center gap-2 transition-colors shadow-sm disabled:opacity-50">
                       {isEnhancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Generate Prompt
                    </button>
                    <button onClick={() => requestPromptOptimization(false)} disabled={isOptimizing} className="flex-1 min-w-[150px] whitespace-nowrap px-4 py-3 bg-violet-900/40 text-violet-300 hover:bg-violet-900/60 border border-violet-500/30 rounded-lg font-bold text-[11px] uppercase flex justify-center items-center gap-2 transition-colors disabled:opacity-50">
                       {isOptimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />} Optimize Tags
                    </button>
                 </>
               )}
               {aiModel === 'Midjourney' && (
                 <button onClick={() => requestMidjourneyOptimization(false)} disabled={isMjOptimizing} className="flex-1 whitespace-nowrap px-4 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold text-[11px] uppercase flex justify-center items-center gap-2 transition-colors shadow-sm disabled:opacity-50">
                    {isMjOptimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />} Generate MJ V6
                 </button>
               )}
               {aiModel === 'ChatGPT' && (
                 <button onClick={() => requestChatGPTEnhancement(false)} disabled={isCgEnhancing} className="flex-1 whitespace-nowrap px-4 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold text-[11px] uppercase flex justify-center items-center gap-2 transition-colors shadow-sm disabled:opacity-50">
                    {isCgEnhancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Generate DALL-E 3
                 </button>
               )}
            </div>

            <AiOutputBox modelState={aiModel} viewModeState={nanoViewMode} setViewMode={setNanoViewMode} content={buildPrompts().outputContent} isEdit={false} outdatedFlag={isOutdated} onCopy={copyToClipboard} copiedState={copiedBottom}/>
          </div>
        </div>
        </>
        )}

      </main>

      {/* Idea Tuning Room Modal (Create) */}
      {isTuningModalOpen && (
         <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-[420px] h-[700px] max-h-[90vh] bg-[#111111] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col relative overflow-hidden">
               <div className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0 bg-[#16161D]">
                  <div className="flex items-center gap-2">
                     <MessageSquare className="w-4 h-4 text-violet-400" />
                     <h3 className="text-zinc-100 font-bold text-[13px]">AI Tuning Room</h3>
                  </div>
                  <button onClick={() => setIsTuningModalOpen(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                     <X className="w-4 h-4" />
                  </button>
               </div>
               <div className="p-4 border-b border-zinc-800 bg-[#0F0F0F] shrink-0">
                  <div className="flex items-center gap-1.5 mb-2">
                     <Edit3 className="w-3.5 h-3.5 text-zinc-500" />
                     <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Current Aura</span>
                  </div>
                  <p className="text-[12px] text-zinc-300 leading-relaxed max-h-[100px] overflow-y-auto custom-scrollbar whitespace-pre-wrap">"{currentTunedAura}"</p>
               </div>
               <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#111]" ref={tuningChatRef}>
                  {tuningChatHistory.map((msg, idx) => (
                     <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[12px] leading-relaxed shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-zinc-200 text-zinc-900 rounded-br-sm' : 'bg-zinc-800 text-zinc-200 rounded-tl-sm'}`}>
                           {msg.content}
                        </div>
                     </div>
                  ))}
                  {isTuningLoading && (
                     <div className="flex justify-start">
                        <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-zinc-800 text-zinc-400 rounded-tl-sm flex items-center gap-2 text-[12px]">
                           <Loader2 className="w-3.5 h-3.5 animate-spin" /> Adjusting...
                        </div>
                     </div>
                  )}
               </div>
               <div className="p-4 shrink-0 bg-[#16161D] flex flex-col gap-3 border-t border-zinc-800">
                  <div className="relative flex items-center">
                     <input value={tuningInputValue} onChange={e => setTuningInputValue(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') handleSendTuningMessage(); }} placeholder="Ask to change style, mood, etc..." className="w-full bg-[#111] border border-zinc-700 rounded-lg pl-4 pr-12 py-3 text-[12px] text-zinc-200 outline-none focus:border-zinc-400 transition-colors placeholder:text-zinc-600"/>
                     <button onClick={handleSendTuningMessage} disabled={isTuningLoading || !tuningInputValue.trim()} className="absolute right-2 w-7 h-7 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md transition-colors disabled:opacity-50">
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                     </button>
                  </div>
                  <button onClick={() => { setCustomDesignInjections(currentTunedAura); setIsTuningModalOpen(false); }} className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold text-[12px] flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                     <CheckCircle2 className="w-4 h-4 text-white" /> Apply Changes
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Idea Tuning Room Modal (Edit) */}
      {isEditTuningModalOpen && (
         <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-[420px] h-[700px] max-h-[90vh] bg-[#111111] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col relative overflow-hidden">
               <div className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0 bg-[#16161D]">
                  <div className="flex items-center gap-2">
                     <MessageSquare className="w-4 h-4 text-violet-400" />
                     <h3 className="text-white font-black text-sm">Micro-Edit Tuning Room</h3>
                  </div>
                  <button onClick={() => setIsEditTuningModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                     <X className="w-4 h-4" />
                  </button>
               </div>
               <div className="p-4 border-b border-zinc-800 bg-[#0F0F0F] shrink-0">
                  <div className="flex items-center gap-1.5 mb-2">
                     <Settings className="w-3.5 h-3.5 text-zinc-500" />
                     <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Current Edit Note</span>
                  </div>
                  <p className="text-[12px] text-zinc-300 leading-relaxed max-h-[100px] overflow-y-auto custom-scrollbar whitespace-pre-wrap">"{currentTunedEditAura}"</p>
               </div>
               <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#111]" ref={editTuningChatRef}>
                  {editTuningChatHistory.map((msg, idx) => (
                     <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[12px] leading-relaxed shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-zinc-200 text-zinc-900 rounded-br-sm' : 'bg-zinc-800 text-zinc-200 rounded-tl-sm'}`}>
                           {msg.content}
                        </div>
                     </div>
                  ))}
                  {isEditTuningLoading && (
                     <div className="flex justify-start">
                        <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-zinc-800 text-zinc-400 rounded-tl-sm flex items-center gap-2 text-[12px]">
                           <Loader2 className="w-3.5 h-3.5 animate-spin" /> Adjusting...
                        </div>
                     </div>
                  )}
               </div>
               <div className="p-4 shrink-0 bg-[#16161D] flex flex-col gap-3 border-t border-zinc-800">
                  <div className="relative flex items-center">
                     <input value={editTuningInputValue} onChange={e => setEditTuningInputValue(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') handleSendEditTuningMessage(); }} placeholder="Ask to refine the instruction..." className="w-full bg-[#111] border border-zinc-700 rounded-lg pl-4 pr-12 py-3 text-[12px] text-zinc-200 outline-none focus:border-zinc-400 transition-colors placeholder:text-zinc-600"/>
                     <button onClick={handleSendEditTuningMessage} disabled={isEditTuningLoading || !editTuningInputValue.trim()} className="absolute right-2 w-7 h-7 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md transition-colors disabled:opacity-50">
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                     </button>
                  </div>
                  <button onClick={() => { setEditInstruction(currentTunedEditAura); setIsEditTuningModalOpen(false); }} className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold text-[12px] flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                     <CheckCircle2 className="w-4 h-4 text-white" /> Apply Changes
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Logic Audit Modal */}
      {isAuditModalOpen && (
         <div className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-[400px] bg-[#111111] border border-violet-500/30 rounded-2xl shadow-[0_0_40px_rgba(139,92,246,0.2)] flex flex-col overflow-hidden relative">
               <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-[#16161D]">
                  <div className="flex items-center gap-2">
                     <ShieldAlert className="w-4 h-4 text-violet-400" />
                     <h3 className="text-white font-bold text-[13px]">프롬프트 논리 교정 완료</h3>
                  </div>
                  <button onClick={() => setIsAuditModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                     <X className="w-4 h-4" />
                  </button>
               </div>
               <div className="p-6">
                  <div className="text-[12px] text-zinc-300 leading-relaxed whitespace-pre-wrap flex gap-3 items-start">
                     <Info className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
                     <p>{verificationLog}</p>
                  </div>
               </div>
               <div className="p-4 border-t border-zinc-800 bg-[#0F0F0F] flex justify-end">
                  <button onClick={() => setIsAuditModalOpen(false)} className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold text-[12px] transition-all">
                     확인 완료
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default App;
