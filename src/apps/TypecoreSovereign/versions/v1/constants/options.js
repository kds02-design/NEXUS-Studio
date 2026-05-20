/* eslint-disable */
// v1 전용 staticOptions 사전 — 옵션 ID/한글명/영문 프롬프트 매핑. 원본 그대로.

export const staticOptions = {
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
