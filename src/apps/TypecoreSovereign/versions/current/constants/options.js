/* eslint-disable */
// 버전 스냅샷: TypecoreSovereign current. 격리된 정적 옵션 사본.

export const staticOptions = {
  // 글자 모양 프리셋 — 결과물 "형태" 기준 (게임별 구분에서 개편).
  // 선택 시 획·마감·동세 옵션을 한 번에 세팅(SCRIPT_PRESETS)하고,
  // en 토큰이 프롬프트 본문에 스타일 힌트로 주입된다 (buildPromptIR 의 shapeStyleBlock).
  shapePresets: [
    { id: "Shape_Clean",       name: "깔끔 기본",     emoji: "✨",  hint: "군더더기 없는 표준형",   en: "clean modern refined letterform structure" },
    { id: "Shape_Massive",     name: "묵직한 바위",   emoji: "🗿",  hint: "두껍고 웅장하게",        en: "monolithic massive stone-slab letterform structure" },
    { id: "Shape_Blade",       name: "날카로운 칼날", emoji: "⚔️", hint: "베일 듯 예리한 끝",      en: "aggressive blade-sharp slashing letterforms" },
    { id: "Shape_Thorn",       name: "가시 돋친",     emoji: "🥀",  hint: "뾰족한 가시 장식",       en: "thorn-spiked dark fantasy letterforms" },
    { id: "Shape_Elegant",     name: "우아한 세리프", emoji: "👑",  hint: "고급스러운 클래식",      en: "elegant sophisticated serif typography" },
    { id: "Shape_Round",       name: "둥글둥글",      emoji: "🫧",  hint: "부드럽고 친근하게",      en: "soft rounded friendly letterforms" },
    { id: "Shape_Speed",       name: "속도감",        emoji: "💨",  hint: "달려나가는 기울기",      en: "dynamic italic speed-driven letterforms" },
    { id: "Shape_Brush",       name: "붓글씨",        emoji: "🖌️", hint: "붓으로 그린 필체",       en: "expressive brush calligraphy strokes" },
    { id: "Shape_Blackletter", name: "블랙레터",      emoji: "🏰",  hint: "중세 고딕 성서체",       en: "blackletter fraktur gothic script, medieval calligraphic broken strokes with angular diamond serifs" },
    { id: "Shape_Cinema",      name: "영화 타이틀",   emoji: "🎬",  hint: "실사 영화 포스터 세리프", en: "weathered antique serif capitals, cinematic movie title lettering, wide letter spacing, subtly distressed serif edges" },
  ],
  // 리터칭 "느낌 미세 조절" 축 — 양방향 슬라이더 (-2..+2, 0=유지).
  // 0 이 아닌 축만 프롬프트에 주입: ±1 → "subtly …" 1.15 가중치, ±2 → "noticeably …" 1.35 가중치.
  // 형태 95% 보존 락과 함께 쓰여 "원본을 지키면서 느낌만 살짝" 이라는 리터칭 본연의 목적을 표현.
  editFeelAxes: [
    { id: "sharpness", label: "예리함",   left: "부드럽게",  right: "날카롭게",   negEn: "softer rounder stroke terminals and edges",       posEn: "sharper crisper stroke terminals and edges" },
    { id: "weight",    label: "획 굵기",  left: "얇게",      right: "두껍게",     negEn: "thinner lighter stroke weight",                    posEn: "thicker heavier stroke weight" },
    { id: "texture",   label: "표면 질감", left: "매끈하게",  right: "거칠게",     negEn: "cleaner smoother pristine stroke surface",         posEn: "more weathered rough eroded surface texture" },
    { id: "motion",    label: "동세",     left: "차분하게",  right: "역동적으로", negEn: "calmer static stable letterform posture",          posEn: "more dynamic kinetic tension across strokes" },
    { id: "ornament",  label: "장식",     left: "미니멀",    right: "화려하게",   negEn: "more minimal simplified stroke detailing",         posEn: "richer ornamental decorative stroke detailing" },
  ],
  // Purpose-Driven Presets (V18)
  purposes: [
    { id: "Purpose_GameLogo", name: "게임 메인 로고형", en: "AAA Game Title Logo", layout: "Center", ratio: "16:9", occ: "50%", core: "core_fortress", frame: "Emblem" },
    { id: "Purpose_BrandHero", name: "브랜드사이트 히어로형", en: "Brand Hero Title", layout: "1Line", ratio: "2.76:1", occ: "40%", core: "core_fortress", frame: "Horizontal" },
    { id: "Purpose_PromoVisual", name: "프로모션 상단 비주얼", en: "Promotion Top Visual", layout: "TitleSub", ratio: "16:9", occ: "65%", core: "core_kinetic", frame: "Expanded" },
    { id: "Purpose_EventTitle", name: "이벤트 강렬한 타이틀", en: "High-impact Event Title", layout: "2Lines", ratio: "1:1", occ: "80%", core: "core_blade", frame: "Compressed" },
    { id: "Purpose_Symbol", name: "심볼 / 엠블럼형", en: "Symbolic Emblem", layout: "Center", ratio: "1:1", occ: "65%", core: "core_glyph", frame: "Emblem" }
  ],
  layoutPresets: [ { id: "WideTitle", name: "와이드 타이틀형", en: "Wide Title Layout" }, { id: "CenterLogo", name: "중앙 로고형", en: "Center Logo Layout" }, { id: "CinematicPan", name: "시네마틱 파노라마형", en: "Cinematic Panorama Layout" }, { id: "TitleSubPre", name: "메인(상) + 서브(하)", en: "Main Title + Subtitle Layout" }, { id: "SubTitlePre", name: "서브(상) + 메인(하)", en: "Subtitle + Main Title Layout" } ],
  base: [ { id: "BlackWhite", name: "블랙 / 화이트", en: "JET BLACK Background, RADIANT WHITE Subject" }, { id: "WhiteBlack", name: "화이트 / 블랙", en: "STARK WHITE Background, SOLID BLACK Subject" } ],
  ratios: [ { id: "16:9", name: "16:9 와이드", en: "16:9" }, { id: "1:1", name: "1:1 스퀘어", en: "1:1" }, { id: "9:16", name: "9:16 세로형", en: "9:16" }, { id: "2.76:1", name: "2.76:1 시네마틱", en: "2.76:1" }, { id: "2.39:1", name: "2.39:1 시네마스코프", en: "2.39:1" } ],
  occupancies: [
    { id: "40%", name: "40% 억제", en: "(bold typography centered with expansive negative space:1.4), (text occupying 40-50% of canvas width:1.3), vast negative space margins" },
    { id: "50%", name: "50% 표준", en: "(generous negative space margins:1.3), perfectly centered balanced layout" },
    { id: "65%", name: "65% 확장", en: "moderate margins, screen filling text layout" },
    { id: "80%", name: "80% 최대", en: "(extreme tight margins:1.4), (massive text pushing canvas edges:1.4)" }
  ],
  layouts: [ { id: "1Line", name: "1줄 수평 강제", en: "single horizontal row typography" }, { id: "2Lines", name: "2줄 상하 정렬", en: "Two-tier vertical stacked composition." }, { id: "TitleSub", name: "메인(상) + 서브(하)", en: "Hierarchical composition. Main title on top." }, { id: "SubTitle", name: "서브(상) + 메인(하)", en: "Hierarchical composition. Subtitle on top." }, { id: "Center", name: "중앙 집중형", en: "Centralized balanced composition." } ],
  subTitleSizes: [ { id: "Sub_Small", name: "소형 (30%)", en: "Subtitle is strictly 30% scale." }, { id: "Sub_Medium", name: "중형 (50%)", en: "Subtitle is strictly 50% scale." }, { id: "Sub_Large", name: "대형 (70%)", en: "Subtitle is strictly 70% scale." }, { id: "Sub_Equal", name: "동일 크기", en: "Both rows have equal font scale." } ],
  proportions: [
    { id: "P_Std", name: "기본형 (정방형)", en: "(balanced letterform skeleton with natural horizontal proportions:1.4)" },
    { id: "P_Condensed", name: "압축형 (세로장평)", en: "condensed tall aspect ratio, narrow vertical stems" },
    { id: "P_Extended", name: "확장형 (가로장평)", en: "(extended wide panoramic letterforms:1.5), heavily stretched horizontally" },
    { id: "P_FlatWide", name: "납작 와이드형", en: "(compress vertical stroke proportions:1.4), (horizontally extended character frame:1.4), (wide aspect ratio letterforms:1.5), (flat low-profile characters:1.3)" }
  ],
  MMOSilhouetteFramings: [ { id: "Auto", name: "자동", en: "Automatic silhouette framing" }, { id: "Horizontal", name: "수평형", en: "Strict horizontal alignment framing" }, { id: "Compressed", name: "압축형", en: "Tightly compressed inner structure framing" }, { id: "Expanded", name: "확장형", en: "Outwardly expanded wing-like framing" }, { id: "Emblem", name: "엠블럼형", en: "Cohesive unified emblem framing" } ],
  MMOSurroundingElements: [ { id: "Clean", name: "없음", en: "NO surrounding VFX, perfectly clean canvas" }, { id: "FloatingRunes", name: "부유하는 룬", en: "Floating geometric runes around text" }, { id: "Shattered", name: "파괴된 파편", en: "Shattered stone and metal debris floating" }, { id: "RadialSpikes", name: "마법 방사선", en: "Sharp radial energy spikes" } ],
  stemWeights: [ { id: "Stem_Light", name: "가벼움", en: "light razor thin stems" }, { id: "Stem_Std", name: "표준", en: "medium balanced stems" }, { id: "Stem_Heavy", name: "묵직함", en: "heavy thick stems" }, { id: "Stem_Ultra", name: "초중량", en: "massive ultra heavy block stems" } ],
  letterConnections: [ { id: "Conn_Indep", name: "독립형", en: "Cleanly separated individual characters" }, { id: "Conn_Tight", name: "밀착형", en: "Tightly packed characters" }, { id: "Conn_Partial", name: "부분 결합", en: "Partially merged letter structures" }, { id: "Conn_Full", name: "완전 결합", en: "Fully fused typographic emblem" } ],
  internalSpaces: [ { id: "Space_Loose", name: "여유", en: "Spacious internal negative space counters" }, { id: "Space_Std", name: "표준", en: "Standard internal space" }, { id: "Space_Dense", name: "조밀", en: "Dense complex internal structures" }, { id: "Space_Closed", name: "폐쇄적", en: "Closed solid internal mass, completely filled counters" } ],
  logoDegrees: [ { id: "Logo_Low", name: "텍스트 중심", en: "Text-focused typography" }, { id: "Logo_Std", name: "표준 로고타입", en: "Standard logotype" }, { id: "Logo_High", name: "강한 로고화", en: "Highly stylized logotype" }, { id: "Logo_Emblem", name: "완전 엠블럼형", en: "Unified emblem structure" } ],
  kerningOptions: [ { id: "Kern_Loose", name: "여유 (+여백)", en: "wide loose spacing" }, { id: "Kern_Std", name: "표준", en: "standard balanced kerning" }, { id: "Kern_Tight", name: "타이트 (-여백)", en: "tight kerning" }, { id: "Kern_Overlap", name: "초밀착 (오버랩)", en: "high density overlapping letters" } ],
  terminalStyles: [ { id: "Term_Clean", name: "단면형 (Clean)", en: "clean flat terminals" }, { id: "Term_Chisel", name: "조각형 (Chisel)", en: "(sharp chisel-cut terminals:1.3), acute terminal angles" }, { id: "Term_Blade", name: "칼날형 (Blade)", en: "(razor-sharp blade tip terminals:1.4), blade-sharp stroke endings, acute terminal angles" }, { id: "Term_Slab", name: "석판형 (Slab)", en: "heavy slab serifs" }, { id: "Term_Flare", name: "플레어", en: "elegant flared terminals" }, { id: "Term_Round", name: "라운드", en: "smooth rounded terminals" }, { id: "Term_Serif", name: "세리프", en: "classic serif" }, { id: "Term_Thorn", name: "가시 삐침", en: "(sharp thorn terminals:1.3), acute thorn angles" }, { id: "Term_Claw", name: "악마 발톱", en: "demonic claw terminals" }, { id: "Term_BrushFray", name: "필선형 (Brush)", en: "frayed brush terminals" } ],
  strokeTextures: [ { id: "Tex_Clean", name: "완전 매끄러움", en: "perfectly smooth pristine vector surface" }, { id: "Tex_Frayed", name: "필선 갈라짐", en: "frayed ink texture" }, { id: "Tex_Scorched", name: "탄화된 필선", en: "scorched etched texture" }, { id: "Tex_Subtle", name: "미세 침식", en: "subtle weathered micro-erosion" }, { id: "Tex_DryBrush", name: "건조한 붓결", en: "dry brush strokes" } ],
  strokeSharpness: [ { id: "Sharp_Soft", name: "부드러움", en: "softened edges" }, { id: "Sharp_Std", name: "표준", en: "crisp clean edges" }, { id: "Sharp_Crisp", name: "날카로움", en: "(sharp clean lines:1.3)" }, { id: "Sharp_Razor", name: "극예리", en: "(micro-chiseled razor-sharp edges:1.4)" } ],
  strokeExtensions: [ { id: "Ext_None", name: "연장 없음", en: "contained terminals" }, { id: "Ext_Elegant", name: "유려한 연장", en: "elegant tapered extensions" }, { id: "Ext_Razor", name: "날카로운 끝단", en: "razor-sharp stroke tails" }, { id: "Ext_Infinite", name: "무한 확장", en: "hyper-extended stroke ends" } ],
  kineticVelocities: [ { id: "Vel_Static", name: "정중동 (Static)", en: "perfectly still, static form" }, { id: "Vel_Swift", name: "질주 (Swift)", en: "dynamic forward momentum" }, { id: "Vel_Slashing", name: "격베기 (Slashing)", en: "aggressive slashing momentum" } ],
  slantAngles: [ { id: "Slant_0", name: "0도 (수직)", en: "perfect verticality" }, { id: "Slant_Forward", name: "15도 (기울기)", en: "15-degree dynamic slant" }, { id: "Slant_Extreme", name: "25도 (급격함)", en: "Aggressive 25-degree slant" } ],
  slicingIntensities: [ { id: "Slic_None", name: "절단 없음", en: "intact strokes" }, { id: "Slic_Partial", name: "부분 절단", en: "micro-incisions and structural cuts" }, { id: "Slic_Diagonal", name: "사선 절단", en: "diagonal slicing" }, { id: "Slic_Deep", name: "깊은 절단", en: "deep structural severance" }, { id: "Slic_Total", name: "전체 절단", en: "massive severance" } ],
  cornerStyles: [ { id: "Corner_Right", name: "직각", en: "sharp 90-degree right-angle corners" }, { id: "Corner_Round", name: "둥근형", en: "smooth rounded corners" }, { id: "Corner_Wedge", name: "쐐기형", en: "wedge-shaped corners" }, { id: "Corner_Blade", name: "칼날형", en: "blade-like pointed corners" } ],
  deformationDamages: [ { id: "Damage_None", name: "상태 깨끗함", en: "pristine solid form, zero damage" }, { id: "Damage_Erosion", name: "미세 침식", en: "(subtle surface grain texture:1.2)" }, { id: "Damage_Cracking", name: "균열과 실금", en: "(intricate 2D crack pattern:1.3)" } ],
  widths: [ { id: "Narrow", name: "좁게", en: "condensed slim width" }, { id: "Normal", name: "표준", en: "standard balanced width" }, { id: "Wide", name: "넓게", en: "wide expansive width" }, { id: "UltraWide", name: "초광폭", en: "ultra wide panoramic width" } ],
  editStrokeMods: [ { id: "E_Stroke_None", name: "기본 유지", en: "Keep original stroke intact" }, { id: "E_Stroke_Angled", name: "꺾임/예리함 강조", en: "Sharpen joints and emphasize jagged edges" }, { id: "E_Stroke_Extended", name: "연장 라인 추가", en: "Pull and extend key stroke terminals" }, { id: "E_Stroke_Thickened", name: "두께 대비 극대화", en: "Exaggerate thick/thin stroke contrast" } ],
  editElementMods: [ { id: "E_Elem_None", name: "기본 유지", en: "Maintain original structure" }, { id: "E_Elem_Object", name: "오브제화/무기화", en: "Morph focal letters into weapons/objects" }, { id: "E_Elem_Rhythm", name: "유기적 리듬감", en: "Inject rhythmic flow and bounce" }, { id: "E_Elem_Disconnect", name: "의도적 단절", en: "Introduce micro-gaps for fragmentation" } ],
  editSurfaceMods: [ { id: "E_Surf_None", name: "기본 유지", en: "Keep flat surface" }, { id: "E_Surf_Speed", name: "속도감 텍스처", en: "Apply directional motion scratches" }, { id: "E_Surf_Dry", name: "부식/거친 질감", en: "Apply heavy weathered erosion" }, { id: "E_Surf_Crystalline", name: "결정/파편화", en: "Render crystalline shattered debris" } ]
};
