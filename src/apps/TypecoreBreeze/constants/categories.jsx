import {
  Activity, Star, Smile, Feather, PenTool, Edit2, Box, FastForward,
  Clapperboard, MessageSquare, Palette, Type
} from 'lucide-react';

export const aiOptimizationModels = [
  { id: 'NanoBanana', name: 'Nano Banana 2' },
  { id: 'ChatGPT', name: 'ChatGPT' },
  { id: 'Midjourney', name: 'Midjourney' }
];

export const editOptions = {
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

export const directorPersonas = [
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

// 슬라이더 — 페르소나 무드를 가로지르지 않고 "현재 페르소나의 강도"만 조절.
// 예전 'balanced' 모드는 '감성 & 우아함' + '캐주얼 & 리듬감' 두 키워드를 동시에 주입해
// variety_director(예능 팝) 같은 페르소나와 정면 충돌했음. 이제는 강·중·약 강도 1축만.
export const sliderDesc = {
  leftLabel: "절제",
  rightLabel: "강렬",
  leftDesc: "차분하고 절제된 표현",
  rightDesc: "과감하고 강렬한 표현"
};

export const getSliderText = (val) => {
  if (val < 35) return `[INTENSITY]: Restrained, calm execution of the selected persona — gentle emphasis, minimal exaggeration.`;
  if (val > 65) return `[INTENSITY]: Bold, exaggerated execution of the selected persona — maximum emphasis on its signature traits.`;
  return `[INTENSITY]: Standard execution of the selected persona — its signature traits applied at full but not exaggerated.`;
};
