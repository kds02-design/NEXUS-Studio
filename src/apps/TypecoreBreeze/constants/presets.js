export const staticOptions = {
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
    { id: "2Lines", name: "2줄 (적층)", en: "Two-tier vertical stacked composition." },
    { id: "3Lines", name: "3줄 (적층)", en: "Three-tier vertical stacked composition." }
  ],
  proportions: [
    { id: "P_Condensed", name: "5:10 (매우 좁음)", en: "Condensed 5:10 ratio" }, { id: "P_Slim", name: "6:10 (좁음)", en: "Slim 6:10 ratio" },
    { id: "P_Std", name: "7:10 (표준)", en: "Standard 7:10 ratio" }, { id: "P_Wide", name: "8.5:10 (넓음)", en: "Wide 8.5:10 ratio" },
    { id: "P_Extended", name: "12:10 (확장)", en: "Extended 12:10 ratio" }
  ],
  // cat — 좌측 카테고리(casual / calli) 필터용. 효과 갤러리가 selectedCategory 로 거른다.
  CasualStyles: [
    { id: "Calli_Brush", name: "감성 붓글씨 (Brush Calligraphy)", en: "Emotional watercolor brush calligraphy with variable thick-to-thin strokes", cat: "calli" },
    { id: "Calli_Ribbon", name: "우아한 리본 (Elegant Ribbon)", en: "Flowing, elegant script typography resembling swirling ribbons", cat: "calli" },
    { id: "Diary_Pen", name: "다꾸 펜글씨 (Diary Pen)", en: "Clean, minimal, cute monoline pen handwriting", cat: "calli" },
    { id: "Calli_Ink", name: "수묵 먹글씨 (Ink Wash)", en: "Traditional East-Asian ink wash brush calligraphy with heavy wet ink bleed, soft tapered tips and meditative spacing", cat: "calli" },
    { id: "Calli_Modern", name: "모던 캘리 (Modern Brush)", en: "Clean modern brush lettering with crisp confident thick-to-thin strokes and a playful bouncing rhythm", cat: "calli" },
    { id: "Calli_DryBrush", name: "갈필 마른붓 (Dry Brush)", en: "Rough dry brush calligraphy with frayed, splintered strokes and high-speed friction texture", cat: "calli" },
    { id: "Calli_Marker", name: "브러시 마커 (Brush Marker)", en: "Energetic brush pen marker calligraphy, smooth tapered strokes with playful confident flicks", cat: "calli" },
    { id: "Casual_Bubble", name: "말랑 버블 팝 (Bubble Pop)", en: "Chunky, cute, and bouncy bubble letters like balloons", cat: "casual" },
    { id: "Casual_Comic", name: "코믹북 팝 (Comic Book)", en: "Dynamic comic book style with bold black outlines and halftone dots", cat: "casual" },
    { id: "Casual_Block", name: "모던 팝 블록 (Modern Block)", en: "Clean, straight geometric block lettering for modern sports or tech pop", cat: "casual" },
    { id: "Casual_Marker", name: "마카펜 감성 (Marker Pen)", en: "Round and smooth thick marker pen handwriting", cat: "casual" },
    { id: "Casual_Jelly", name: "말랑말랑 젤리 (Slime/Jelly)", en: "Soft, melting, jelly-like casual typographic forms", cat: "casual" },
    { id: "Street_Graffiti", name: "힙스터 그래피티 (Graffiti)", en: "Urban hipster street tagging style with sharp fast marker strokes", cat: "casual" },
    { id: "Vintage_Chalk", name: "빈티지 분필 (Chalkboard)", en: "Rough, textured vintage chalk lettering aesthetic", cat: "casual" },
    { id: "Casual_RetroChalk", name: "레트로 팝 분필 (Retro Chalk)", en: "Playful retro chalkboard lettering with dusty, rough chalk textures and bouncy baseline", cat: "casual" },
    { id: "Casual_Variety", name: "예능/유튜브 팝 (Variety Pop)", en: "K-variety show title style with 3D pop and thick sticker outlines", cat: "casual" },
    { id: "Casual_Emblem", name: "스포츠 엠블럼 (Sports Emblem)", en: "College sports team emblem style with arch and ribbon banners", cat: "casual" },
    { id: "Casual_Racing", name: "레이싱/스피드 (Racing Action)", en: "Dynamic racing game title with high speed slant and sliced strokes", cat: "casual" },
    { id: "Casual_Idol", name: "아이돌/하이틴 (Idol Pop)", en: "Soft, clean, elegant and cute pastel idol group logo typography", cat: "casual" },
    { id: "Casual_Grunge", name: "거친 영화 타이틀 (Grunge Movie)", en: "Aggressive action thriller title with heavy grunge distressed textures", cat: "casual" },
    { id: "Casual_StencilBlock", name: "스텐실 블록 (Stencil Block)", en: "Bold geometric stencil block lettering with hard right-angle corners, heavy condensed solid strokes, thick chunky mass, modern stamped block forms with sharp flat terminals", cat: "casual" }
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

export const getOptionEn = (list, id) => {
  if (!Array.isArray(list)) return "";
  const found = list.find(o => o.id === id);
  return found?.en_desc || found?.en || found?.name || "";
};

export const getOptionName = (list, id) => {
  if (!Array.isArray(list)) return "";
  const found = list.find(o => o.id === id);
  return found?.name || "";
};
