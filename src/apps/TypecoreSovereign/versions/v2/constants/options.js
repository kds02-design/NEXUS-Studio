/* eslint-disable */
// v2 전용 staticOptions / troubleshooterOptions / safetyGuards / aiOptimizationModels.
// v1과 옵션 일부가 다르므로 별도 격리 사본. 원본 PromptEngine.jsx 의 정의 그대로.

export const aiOptimizationModels = [
    { id: 'NanoBanana', name: 'Nano Banana 2' },
    { id: 'ChatGPT', name: 'ChatGPT' },
    { id: 'Midjourney', name: 'Midjourney' }
];

export const sliderDesc = {
    leftLabel: "무게감",
    rightLabel: "예리함",
    leftDesc: "거대 암석 같은 묵직한 실루엣",
    rightDesc: "공간을 베어내는 듯한 예리함"
};

export const troubleshooterOptions = [
    { id: 'ts_mutation', label: '글자가 다른 문자로 바뀌어요', desc: '형태 예산을 잠그고 문자의 기본 골격을 완벽히 유지합니다.', fixEn: 'ANTI-MUTATION: STRICT TEXT LOCK. ZERO morphological deviation from the literal characters. Force 100% structural retention of the original alphabet.', fixKo: '변형 방지: 텍스트를 정확하게 잠급니다. 형태적 일탈 절대 금지. 원래 알파벳/문자의 구조적 보존 100% 강제.' },
    { id: 'ts_3d', label: '원치 않는 입체감(3D)이 생겨요', desc: '후면 돌출(Extrusion)을 완벽히 차단하고 평면을 강제합니다.', fixEn: 'FLAT ENFORCEMENT: ABSOLUTELY NO EXTRUSION. Force strict 2D vector path flat graphic. Kill all depth, shadows, and 3D bevels.', fixKo: '평면 강제: 후면 돌출 절대 금지. 엄격한 2D 평면 벡터 그래픽 강제. 모든 깊이감, 그림자, 3D 베벨 제거.' },
    { id: 'ts_legibility', label: '형태를 알아보기 너무 힘듭니다', desc: '모디파이어 강도를 절반으로 낮추고 자간을 엽니다.', fixEn: 'READABILITY OVERRIDE: Reduce ALL modifier and deformation intensity by 50%. Force clear letter separation and distinct open counterforms. Readability is priority ONE.', fixKo: '가독성 최우선: 모든 모디파이어 및 변형 강도를 절반으로 줄입니다. 글자 간 분리와 내부 여백을 명확히 확보.' },
    { id: 'ts_fx', label: '이펙트가 글자를 가려요', desc: '주변 효과를 차단하고 피사체를 배경과 격리합니다.', fixEn: 'CLEAN SILHOUETTE: REMOVE ALL SURROUNDING FX AND CLUTTER. Keep background perfectly clean. Subject typography must be fully isolated.', fixKo: '실루엣 분리: 모든 주변 효과와 불필요한 장식을 제거합니다. 배경을 완전히 비우고 타이포그래피 대상만 명확하게 격리.' }
];

export const safetyGuards = [
    { id: 'guard_mutation', label: '텍스트 변형 방지', desc: '원문 무결성 100% 보존', fixEn: 'ANTI-MUTATION MAX: STRICT TEXT LOCK. Force 100% structural retention of original characters. ZERO morphing into unreadable glyphs.', fixKo: '텍스트 변형 방지 적용: 원문 100% 구조적 보존. 임의 기호/외계어 변형 완벽 차단.' },
    { id: 'guard_3d', label: '3D 돌출 방지', desc: '완벽한 2D 평면 실루엣 강제', fixEn: '2D FLAT ENFORCEMENT: STRICTLY 2D FLAT GRAPHIC. Kill all depth, shadows, 3D bevels.', fixKo: '3D 돌출 방지 적용: 깊이, 베벨, 돌출 효과 차단. 완벽한 2D 평면 벡터 실루엣 강제.' },
    { id: 'guard_layout', label: '세로 붕괴/늘어남 방지', desc: '정상 폰트 비율 유지 및 수평 확장', fixEn: 'ANTI-STACKING & ANTI-SQUISHING: FORCE STRONG HORIZONTAL GRAVITY. Preserve normal font aspect ratio. Strictly prohibit vertical squishing, stretching, or unwanted vertical stacking.', fixKo: '세로 붕괴 방지 적용: 정상적인 글자 비율 유지. 세로로 길게 늘어나거나 찌그러지는 현상 엄격히 금지. 강력한 수평 방향 전개 강제.' },
    { id: 'guard_noise', label: '외곽 노이즈 억제', desc: '불필요한 파편 효과 차단', fixEn: 'CLEAN SILHOUETTE: REMOVE ALL NOISE. Force clean, sharp boundaries. Isolate text clearly from background.', fixKo: '외곽 노이즈 억제 적용: 불필요한 파편과 배경 간섭 제거. 선명한 형태 분리 강제.' }
];

export const staticOptions = {
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
