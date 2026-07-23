// IR(Intermediate Representation) 빌더 + 모델별 prompt 컴파일 + 룰 검증/품질 점수.
// 원본 RenderMatrix index.jsx 의 generate*/compile*/performLogicAudit/calculateQualityScore 들을 그대로 옮긴 모듈.
// 각 compile 함수는 IR + state 를 받아 모델 syntax 에 맞는 prompt 문자열을 반환한다.

import { DIRECTOR_PERSONAS, EDIT_BUDGETS, RENDER_ENGINES, getOptionEn, getOptionName } from "../constants/presets";

// ─── 예상 결과 요약 (한국어) ───
// Quality Score 는 수치 예측일 뿐 실제 질감·느낌을 보여주지 못한다는 피드백으로 신설.
// 현재 옵션 조합을 규칙 기반으로 짧은 한국어 라인들로 요약 — API 비용 0, 옵션 변경 즉시 갱신.
const PERSONA_MOOD_KO = {
  Cinematic: "묵직하고 극적인 명암 — 시네마틱한 무게감",
  Alchemist: "재질의 물성이 살아있는 사실적 접사 무드",
  DarkSmith: "그을리고 단조된 다크 판타지 무드",
  Premium: "절제된 빛과 흠 없는 마감 — 럭셔리 무드",
};
export const buildFeelSummary = (state, appOptions) => {
  const name = (list, id) => getOptionName(list, id);
  const tex = state.dramaticTex !== "None" && state.dramaticTex !== "Auto" ? name(appOptions.dramaticTextures, state.dramaticTex) : null;
  const rim = state.rimColor !== "None" ? `${name(appOptions.rimColors, state.rimColor)} 림라이트(${name(appOptions.rimIntensities, state.rimIntensity)})` : null;
  // generateIR 과 동일 로직 — 연출 모드 OFF 면 이펙트 없음, ON + None 이면 GoldenDust 폴백.
  const coreId = state.enableVfx ? (state.energyCore === "None" ? "GoldenDust" : state.energyCore) : "None";
  return {
    mood: PERSONA_MOOD_KO[state.directorPersona] || "",
    material: [name(appOptions.materials, state.material), name(appOptions.surfaceDetails, state.surfaceDetail), name(appOptions.wearLevels, state.wearLevel), tex].filter(Boolean).join(" · "),
    form: [name(appOptions.frontReliefs, state.frontRelief), name(appOptions.projectionDepths, state.projectionDepth)].filter(Boolean).join(" + "),
    lighting: [rim, state.enableGlint ? "반사광 글린트" : null, state.enableShadow ? "바닥 그림자" : "그림자 없음(플로팅)"].filter(Boolean).join(" · "),
    fx: coreId === "None"
      ? "주변 이펙트 없음 — 깨끗한 캔버스"
      : `${name(appOptions.energyCores, coreId)} · ${name(appOptions.fxOrigins, state.fxOrigin)} · ${name(appOptions.fxIntensities, state.fxIntensity)}`,
    background: name(appOptions.backgrounds, state.background),
  };
};

// 페르소나별 톤 키워드 — 이전엔 모든 prompt 가 'cinematic' 으로 강제됐으나, persona 마다 다른 톤을 입혀
// 결과 다양성 확보. id 가 매핑 표에 없으면 Cinematic 으로 fallback.
const PERSONA_TONE = {
  Cinematic: {
    headlineKind: 'epic cinematic typography graphic',
    subjectKind: 'cinematic legendary logo',
    colorGrading: 'cinematic color grading, dramatic contrast, deep rich blacks',
    remixTag: 'cinematic remix',
    motionKind: 'high-quality cinematic video',
  },
  Alchemist: {
    headlineKind: 'hyper-realistic material study typography graphic',
    subjectKind: 'macro material product emblem',
    colorGrading: 'physically-based natural color, high tonal range, true-to-life palette, accurate optical reaction',
    remixTag: 'material macro remix',
    motionKind: 'high-quality macro material study video',
  },
  DarkSmith: {
    headlineKind: 'dark fantasy forged typography graphic',
    subjectKind: 'gritty dark fantasy battle emblem',
    colorGrading: 'desaturated dark fantasy palette, brooding mood, deep shadow color grading, scorched warm undertones',
    remixTag: 'dark fantasy forged remix',
    motionKind: 'dark fantasy cinematic video',
  },
  // Premium 톤 — "editorial/minimalist" 는 모델이 세리프·장식을 걷어내고 산세리프로
  // 단순화(고딕체화)하는 방향으로 읽던 단어들 → 표면 마감 중심 표현으로 교체.
  Premium: {
    headlineKind: 'premium luxury typography graphic',
    subjectKind: 'luxury polished emblem',
    // "neutral tones / restrained palette" 는 금·보석 재질의 색을 탈색시키던 표현 →
    // 재질 고유색의 깊이를 존중하는 럭셔리 그레이딩으로 교체.
    colorGrading: 'clean luxurious color grading, rich true-to-material color depth, high-key balance with deep shadow anchors, polished premium tonality',
    remixTag: 'premium luxury remix',
    motionKind: 'premium luxury video',
  },
};
const getTone = (personaId) => PERSONA_TONE[personaId] || PERSONA_TONE.Cinematic;

// "후면 돌출 최소" 강제용 — projectionDepth='None' (isMinimal) 일 때 두꺼운 평면 강제.
// 이전엔 "minimal side thickness, no rear extrusion" 정도만 박혀서 모델이 자주 무시 → 두께가 생김.
// "flat / zero extrusion / paper-thin" 키워드를 positive · negative 양쪽에 동시 박아 강제력 ↑.
// 추가로 "측면이 밝게 라이팅" 되는 사고 방지 — front-face only lighting + side walls drown in shadow.
// ⚠️ "side planes drown in pitch-black shadow" 류 표현 금지 — 모델이 "검은 측면을 그려라"로
//    해석해 글자 뒤에 단색 오프셋 실루엣(가짜 돌출 뒤판)을 만들던 원인. 측면은 "없다"로만 서술.
const FLAT_POSITIVE = "strictly flat letterform with zero extrusion depth, paper-thin profile, 2D surface only, no thickness, completely flat back face, razor-thin structure, front-face only rendering, zero rear depth, no 3D block, no side walls at all, no extrusion volume, flat planar surface, lighting strictly confined to the front face, nothing rendered behind the letterforms. Viewed perfectly straight-on, ONLY the front face of each letter is visible — no left or right side surfaces exist";
// 네거티브 다이어트 — 22개 나열 → 3그룹. Gemini 계열엔 네거티브가 텍스트로 읽히므로
// 입체 단어 노출 자체를 줄이는 것이 곧 돌출 억제다.
const FLAT_NEGATIVE = "(3d extrusion, rear depth, letter body thickness, block letters, visible side walls, extruded geometry:2.0), (deep letterpress, raised block, chunky 3d text:1.9), (lit or highlighted side planes, illuminated thickness, glowing chamfer, golden side faces:1.9)";
// Midjourney 용 --no flags (가중치 문법 미지원이라 단어만 나열).
const FLAT_MJ_NEGATIVE = "3d extrusion, rear depth, letter body thickness, block letters, visible side walls, extruded geometry, deep letterpress, raised block, chunky 3d text, lit side planes, illuminated thickness, glowing chamfer, golden side faces";

// ─── 조각형 릴리프(음각/양각) 전용 평면 강제 ───
// FLAT_* 의 "2D surface only / no thickness / deep letterpress·volumetric depth 금지"가
// 전면 조각(딥 V카브·크리스탈 파셋 등)과 정면 충돌해 릴리프를 골라도 평면으로 렌더되던 문제.
// 후면 돌출 금지는 그대로 유지하되, 전면 깊이를 죽이는 토큰만 제거/치환한다.
// Raised* 3종 = 양각 계열 (음각의 배경 판化 문제를 피하는 대안으로 신설).
// MicroChiseled = "얕은 입체 + 각진 면" — 한때 장난감化 사고로 제외했으나 원인은 분류가 아닌
// "deeply sculpted" 언어였음이 판명 → 전용 얕은(shallow) 브랜치로 재편입.
const SCULPTED_RELIEF_IDS = ["MicroChiseled", "Crystalline", "DiamondPrism", "DeepVCarve", "ChunkyToy", "RaisedEmboss", "RaisedDome", "RaisedRidge"];
// "글자 몸통 두께" 와 "전면 조각 깊이" 를 명시적으로 구분 — 초기 버전에서 thickness 계열
// 토큰을 통째로 뺐더니 모델이 몸통에 돌출 두께를 만들던 문제 보강. 조각 깊이는 front face
// 안의 홈/능선으로만 존재하고, 글자 몸통 자체는 razor-thin 이어야 한다.
const FLAT_REAR_ONLY_POSITIVE = "zero rear extrusion depth, completely flat unlit back face, no side walls, no 3D block behind the letters, the letter body itself is razor-thin with no visible thickness — like the face of a minted coin: flat thin body, all depth carved into the front surface only (grooves, ridges, facets). Viewed perfectly straight-on, ONLY the front face of each letter is visible — the letters have no left or right side surfaces at all";
const FLAT_REAR_ONLY_NEGATIVE = "(3d extrusion, rear depth, visible letter body thickness, extruded letter body, 3d slab letters, visible side walls:2.0), (dark under-edge thickness:1.8), (lit or highlighted side planes, illuminated thickness, glowing chamfer, golden side faces:1.9)";
const FLAT_MJ_REAR_ONLY = "3d extrusion, rear depth, visible letter body thickness, extruded letter body, 3d slab letters, visible side walls, lit side planes, illuminated thickness, glowing chamfer, golden side faces";

// ============================================================
// IR Builders
// ============================================================
export const generateIR = (state, appOptions) => {
  const { directorPersona, complexity, typographyScale, cameraLens, frontRelief, projectionDepth, surfaceTreatment, energyCore, material, materialInt, dramaticTex, wearLevel, rimMaterial, rimThickness, rimColor, rimIntensity, enableGlint, background, renderEngine, userIntent, fxOrigin, fxIntensity, surfaceDetail, vfxPassMode, vfxPassOverlay, enableVfx, enableShadow } = state;
  const activeEnergyCore = enableVfx ? (energyCore === "None" ? "GoldenDust" : energyCore) : "None";
  // 시안 연출 모드 배경 — 기존 "질감 슬레이트 + 비네팅"은 이펙트 소스 추출(합성용 키잉)이
  // 불가능해 순수 리얼블랙으로 교체. 이펙트는 글자 주변에만, 배경은 균일한 #000000.
  // ⚠️ 배경 문자열은 1.4 가중치로 주입됨 — "glowing effects" 언급을 넣으면 이펙트 증폭 신호가 됨.
  //    배경은 배경만 서술 (합성/봉쇄 의도는 무가중치 containment_rule 이 담당).
  const activeBackground = enableVfx
    ? "pure solid #000000 matte black void background, completely clean and uniform from corner to corner — no texture, no vignette, no gradient"
    : getOptionEn(appOptions.backgrounds, background);
  const ir = {
    _meta: { version: "19.34", persona: DIRECTOR_PERSONAS.find(p => p.id === directorPersona), complexityLevel: complexity },
    subject: { type: "typography graphic", scale: getOptionEn(appOptions.typographyScales, typographyScale), fidelity_enforcement: "STRICT RULE: Use the input image as the exact structural reference. 95% shape preservation. EXACT ORIGINAL SILHOUETTE — same letterforms, same proportions, same spacing. NO TEXT MUTATION. NO extra letters. NO font substitution. Ensure high legibility.", intent: userIntent || null },
    // isFlat2D = 완전 평면 강제(razor-thin 코인) / isMinimal = 얇은 몸통 허용(원래 의미).
    camera_and_depth: { projectionId: projectionDepth, projection: getOptionEn(appOptions.projectionDepths, projectionDepth), isFlat2D: projectionDepth === "Flat2D", isMinimal: projectionDepth === "None", lens: getOptionEn(appOptions.cameraLenses, cameraLens) },
    surface_morphology: { reliefId: frontRelief, relief: getOptionEn(appOptions.frontReliefs, frontRelief), treatment: getOptionEn(appOptions.surfaceTreatments, surfaceTreatment), wear: getOptionEn(appOptions.wearLevels, wearLevel) },
    material_stack: { base: getOptionEn(appOptions.materials, material), intensity: getOptionEn(appOptions.intensities, materialInt), internal_texture: dramaticTex === "Auto" ? "organically embedded dynamic textures" : getOptionEn(appOptions.dramaticTextures, dramaticTex), surface_detail: getOptionEn(appOptions.surfaceDetails, surfaceDetail), integration_rule: "Textures MUST be physically carved or etched INTO the base material. NO floating decals." },
    edge_and_lighting: {
      outline: rimThickness === "None" ? "strictly borderless, seamless organic edges, no outline" : `${getOptionEn(appOptions.rimThicknesses, rimThickness)} using ${getOptionEn(appOptions.materials, rimMaterial)}`,
      rim_light: rimColor === "None" ? "no artificial rim light" : `${getOptionEn(appOptions.rimIntensities, rimIntensity)} ${getOptionEn(appOptions.rimColors, rimColor)} ambient rim light organically wrapping the 3D surface edges, NOT a uniform line`,
      rimColorId: rimColor,
      glint: enableGlint ? "(sharp crisp metallic specular highlights mapped dynamically to the surface:1.35), polished reflective sweeps along raised edges, brilliant light catches on bevels" : "smooth balanced lighting without sharp glares",
      shadow: enableShadow,
    },
    fx: { core: getOptionEn(appOptions.energyCores, activeEnergyCore), origin: getOptionEn(appOptions.fxOrigins, fxOrigin), intensity: getOptionEn(appOptions.fxIntensities, fxIntensity), containment_rule: activeEnergyCore === "None" ? "No FX." : `Ensure FX is ${getOptionEn(appOptions.fxIntensities, fxIntensity)} and ${getOptionEn(appOptions.fxOrigins, fxOrigin)}. It MUST NOT overpower the main shape. All FX must stay tightly clustered around the typography and fade out completely BEFORE reaching the frame edges — the outer border of the canvas stays clean pure background.` },
    environment: { background: activeBackground, engine: RENDER_ENGINES.find(e => e.id === renderEngine)?.en || RENDER_ENGINES[0].en },
    vfxPassMode,
    vfxPassOverlay: vfxPassMode ? !!vfxPassOverlay : false,
    typographyScale,
  };
  if (vfxPassMode) {
    ir.subject.type = "pure pitch-black silhouette typography, holdout matte pass";
    ir.material_stack.base = "Vantablack, completely light-absorbing black hole material";
    ir.material_stack.internal_texture = "none, pure black flat void";
    ir.material_stack.integration_rule = "The text itself MUST be completely unlit and black (#000000). ONLY the surrounding FX should be visible. This is for alpha masking.";
    ir.edge_and_lighting.rim_light = "NO rim light on the text itself";
    ir.edge_and_lighting.glint = "ZERO specular highlights on the text";
    ir.surface_morphology.relief = "Flat 2D cutout silhouette";
  }
  return ir;
};

export const generateEditIR = (state, appOptions) => {
  const { editBudget, activeEditIntents, cameraLens, frontRelief, editBg, editRearExtrusion, editIntent, editVfxPassMode, editMaterial, editWearLevel, editRimColor, editRimIntensity, editEnergyCore, editFxOrigin, editFxIntensity, directorPersona } = state;
  const budgetLevel = EDIT_BUDGETS.find(b => b.id === editBudget);
  // directorPersona 도 함께 — edit 모드의 컬러/remix 톤이 페르소나에 맞춰 분기됨.
  const persona = DIRECTOR_PERSONAS.find(p => p.id === directorPersona) || DIRECTOR_PERSONAS[0];
  const ir = {
    _meta: { mode: "Micro-Edit", version: "19.34", persona },
    locks: { glyph: "Strictly lock exact character types, sequence, and spacing.", contour: "Preserve original outer silhouette perfectly.", stroke: "Maintain exact stroke thickness and internal counter spaces." },
    budget: budgetLevel,
    camera: getOptionEn(appOptions.cameraLenses, cameraLens),
    reliefId: frontRelief,
    constraints: {
      anti_mutation: "Do NOT reinterpret letters, do NOT add new text or watermarks. Render each line of text EXACTLY ONCE — NO duplicated title, NO text rendered twice, same line count as the base image.",
      fx_containment: "All FX MUST originate from surface cracks/edges and remain tightly bound to the shape. NO floating particles.",
      material_integration: "All textures/FX MUST be physically embedded into the base material. NO floating decals.",
      extrusionId: editRearExtrusion,
      extrusion: editRearExtrusion === "None" ? `[PROJECTION: MINIMAL] ${FLAT_POSITIVE}. Absolutely zero rear depth, NO 3D block, NO side walls.` : editRearExtrusion === "Shallow" ? "Allow ONLY very shallow thin backward 3D extrusion. NO thick blocks." : "Allow controlled backward 3D extrusion.",
    },
    intents: activeEditIntents,
    details: {
      material: activeEditIntents.material ? `${getOptionEn(appOptions.materials, editMaterial)}, ${getOptionEn(appOptions.wearLevels, editWearLevel)}` : null,
      lighting: activeEditIntents.lighting ? `${getOptionEn(appOptions.rimIntensities, editRimIntensity)} ${getOptionEn(appOptions.rimColors, editRimColor)} rim light organically wrapping the edges, NOT a uniform line` : null,
      rimColorId: editRimColor,
      vfx: activeEditIntents.vfx ? `${getOptionEn(appOptions.fxIntensities, editFxIntensity)} ${getOptionEn(appOptions.energyCores, editEnergyCore)} originating from ${getOptionEn(appOptions.fxOrigins, editFxOrigin)}` : null,
    },
    customIntent: editIntent || "subtle surface enhancement",
    background: getOptionEn(appOptions.backgrounds, editBg),
    vfxPassMode: editVfxPassMode,
  };
  if (editVfxPassMode) {
    ir.constraints.vfx_pass = "Render the typography as a pure Vantablack (#000000), completely unlit flat 2D shape. ZERO reflections, ZERO highlights. ONLY render the glowing FX surrounding this black void.";
  }
  return ir;
};

export const generateMotionIR = (state, appOptions) => {
  const { cameraMotion, vfxDynamics, motionIntent, energyCore, directorPersona } = state;
  const persona = DIRECTOR_PERSONAS.find(p => p.id === directorPersona) || DIRECTOR_PERSONAS[0];
  return {
    _meta: { mode: "Video-Motion", version: "19.34", persona },
    subject_lock: "CRITICAL: The main typography and object shapes MUST remain perfectly solid and absolutely static. DO NOT morph, warp, melt, or distort the text structural integrity.",
    motion: { camera: getOptionEn(appOptions.cameraMotions, cameraMotion), dynamics: getOptionEn(appOptions.motionDynamics, vfxDynamics) },
    customIntent: motionIntent || "",
    energyCore: getOptionEn(appOptions.energyCores, energyCore),
  };
};

// ============================================================
// Logic Audit + Quality Score
// ============================================================
export const performLogicAudit = (state) => {
  const issues = [];
  if (state.currentView === "editor") {
    const persona = DIRECTOR_PERSONAS.find(p => p.id === state.directorPersona);
    if (persona.auditRules.maxFx === "None" && state.enableVfx) {
      issues.push({ code: "PERSONA_FX_CLASH", title: `[${persona.name}] 룰 위반: 이펙트 과다`, desc: "현재 디렉터는 완벽한 형태와 여백을 중시하므로 주변 이펙트를 억제합니다.", options: [{ label: "A. 시안 모드 끄기", action: { enableVfx: false } }] });
    }
    if (state.vfxPassMode && !state.enableVfx) {
      issues.push({ code: "VFX_PASS_NO_FX", title: "이펙트 소스 분리 모드 충돌", desc: "타이포그래피를 블랙아웃시켰지만, 추출할 주변 효과(VFX)가 꺼져있습니다.", options: [{ label: "A. 이펙트 활성화", action: { enableVfx: true, energyCore: state.energyCore === "None" ? "MagmaEmbers" : state.energyCore } }, { label: "B. 매트 패스 끄기", action: { vfxPassMode: false } }] });
    }
    if (state.typographyScale === "Dense" && (state.surfaceDetail === "High" || state.dramaticTex === "ExplosiveFracture")) {
      issues.push({ code: "DENSE_TEXT_NOISE", title: "가독성 저하 위험: 디테일 과다", desc: "작거나 복잡한 글씨에 미세 스크래치나 균열을 강하게 넣으면 렌더링이 뭉개질 수 있습니다.", options: [{ label: "A. 표면 매끄럽게", action: { surfaceDetail: "Standard", dramaticTex: "None" } }, { label: "B. 대형 로고로 간주", action: { typographyScale: "Macro" } }] });
    }
  } else if (state.currentView === "edit") {
    if (state.editBudget === "Expressive" && state.editRearExtrusion === "None") {
      issues.push({ code: "EDIT_DEPTH_CONFLICT", title: "과한 연출 확장 + 돌출 제한 충돌", desc: "연출을 강하게 넓히면서(Expressive) 후면 돌출은 막으면 인공지능이 혼란을 겪을 수 있습니다.", options: [{ label: "A. 예산 보수적으로", action: { editBudget: "Conservative" } }, { label: "B. 입체 허용", action: { editRearExtrusion: "Shallow" } }] });
    }
    if (state.editVfxPassMode && (!state.activeEditIntents.vfx || state.editEnergyCore === "None")) {
      issues.push({ code: "VFX_PASS_NO_FX", title: "이펙트 소스 분리 모드 충돌", desc: "타이포그래피를 블랙아웃시켰지만, 추출할 주변 효과(VFX) 레이어가 활성화되지 않았습니다.", options: [{ label: "A. 이펙트 활성화", action: { activeEditIntents: { ...state.activeEditIntents, vfx: true }, editEnergyCore: "GoldenDust" } }, { label: "B. 소스 분리 모드 끄기", action: { editVfxPassMode: false } }] });
    }
  }
  return issues;
};

export const calculateQualityScore = (state) => {
  let structure = 100, material = 90, visibility = 95, fxControl = 100;
  if (state.currentView === "editor") {
    if (state.projectionDepth === "Monumental") structure -= 25;
    else if (state.projectionDepth !== "None") structure -= 10;
    if (state.enableVfx && state.complexity === 3) fxControl -= 20;
    if (state.typographyScale === "Dense" && state.surfaceDetail === "High") visibility -= 20;
  } else if (state.currentView === "edit") {
    if (state.editBudget === "Expressive") structure = 70;
    else if (state.editBudget === "Balanced") structure = 85;
    else if (state.editBudget === "Locked") structure = 100;
    if (state.activeEditIntents.material) material = 95;
    if (state.activeEditIntents.vfx) fxControl = 80;
  } else if (state.currentView === "motion") {
    if (state.cameraMotion !== "Static") structure -= 15;
    if (state.vfxDynamics === "Turbulent") fxControl -= 30;
  }
  return {
    structure: Math.max(0, Math.min(100, structure)),
    material: Math.max(0, Math.min(100, material)),
    visibility: Math.max(0, Math.min(100, visibility)),
    fxControl: Math.max(0, Math.min(100, fxControl)),
  };
};

export const getQualityFeedback = (scores) => {
  const minScore = Math.min(scores.structure, scores.material, scores.visibility, scores.fxControl);
  if (minScore >= 90) return "탁월합니다. 안정적이고 퀄리티 높은 렌더링이 예상됩니다.";
  if (scores.structure === minScore) return "형태 보존력이 불안합니다. '돌출(Extrusion)'을 줄이거나 형태를 고정하세요.";
  if (scores.visibility === minScore) return "가시성이 낮습니다. 글씨가 작다면 스케일을 변경하거나 조명을 추가하세요.";
  if (scores.fxControl === minScore) return "이펙트가 과해 형태를 가릴 위험이 있습니다. 주변 효과를 낮추세요.";
  if (scores.material === minScore) return "재질이 다소 단조롭거나 어색할 수 있습니다.";
  return "설정을 렌더링 엔진이 해석하기 좋은 상태로 유지하고 있습니다.";
};

// ============================================================
// Creation compilers (Editor view)
// ============================================================
const frontVolumeModifierFor = (reliefId) => {
  if (reliefId === "Flat") return "strictly flat front core without deep carving";
  if (reliefId === "MicroBevel") return "maintaining a flat core with only subtle edge bevels, NO deep carving";
  if (reliefId === "HairlineBevel") return "featuring a flat front with microscopic razor-thin edges";
  if (reliefId === "MicroChiseled") return "featuring densely micro-chiseled intricate cuts on the surface";
  if (reliefId === "RaisedEmboss") return "featuring raised flat-top emboss plateaus with crisp angled side slopes";
  if (reliefId === "RaisedDome") return "featuring smoothly domed convex raised letterforms";
  if (reliefId === "RaisedRidge") return "featuring a raised roof-like center ridge with a crisp apex line";
  if (reliefId === "EdgelessConcave") return "featuring a continuous edge-to-edge concave hollow without any outer borders";
  if (reliefId === "Crystalline") return "featuring sharp crystalline geometric facets and deep jewel-like cuts";
  if (reliefId === "DiamondPrism") return "featuring sharp prismatic V-carved angular facets with a prominent center ridge";
  if (reliefId === "DeepVCarve") return "featuring a sharp center ridge running along the strokes with deep V-carved inner facets";
  return "with balanced front volume";
};

export const compileNanoBanana = (ir, state) => {
  const isVFXPass = state.vfxPassMode || ir.vfxPassMode;
  const fxTag = ir.fx ? (ir.fx.core !== "no surrounding FX" ? `${ir.fx.intensity} ${ir.fx.core} ${ir.fx.origin}` : "") : "";
  if (isVFXPass) {
    // 오버레이 변형 — 이펙트가 검은 글자 "위"를 자유롭게 가로지름 (타이틀 앞 레이어 합성용).
    // 홀드아웃(기본) — 이펙트가 글자에 가려진 형태 (타이틀 뒤 발광 합성용).
    const overlay = ir.vfxPassOverlay === true;
    const passDirective = overlay
      ? "the effects drift and pass FREELY IN FRONT of the black letterforms, crossing over the letter shapes — the black letters serve only as a position guide underneath the effects"
      : "the effects stay around and behind the letterforms — the black letters occlude any effect passing behind them (holdout matte)";
    const posTags = ["masterpiece, best quality, ultra highres, 8k resolution", "pure pitch-black silhouette typography, absolute flat 2d cutout, holdout matte pass, vantablack text, completely unlit, pure #000000 shape", passDirective, ir.subject.fidelity_enforcement.replace("STRICT RULE: ", ""), fxTag, ir.environment.background, ir.environment.engine, ir.subject.intent].filter(Boolean).map(t => t.trim()).join(", ");
    const negTags = ["(worst quality, low quality:1.4), text mutation, extra letters, hallucinated text", "(rim light:1.8), (edge highlight:1.8), (glowing edge:1.8), (3d:1.8), (thickness:1.8), (extrusion:1.8), (bevel:1.8), (metallic:1.8), (reflections:1.8), (lighting on text:1.8), (3d block:1.8)", "lit text, text texture, outline, border, drop shadow, inner glow, lens flare", overlay ? "" : "(effects crossing in front of the letters:1.5)"].filter(Boolean).map(t => t.trim()).join(", ");
    return `${posTags}\n\nNegative prompt: STRICTLY FORBIDDEN — the image must NOT contain any of the following: ${negTags}`;
  }
  const scaleTag = ir.subject.scale;
  const lensTag = ir.camera_and_depth.lens;
  // prose 는 '얇기/돌출' 골격만 담고, 구체 sculpting 디테일(MicroBevel/Crystalline 등)은 posTags 의 ir.surface_morphology.relief 에서만 한 번 출력 — 같은 정보를 두 번 다른 표현으로 박으면 옵티마이저가 "shallow relief" 같은 잘못된 가중치 태그를 만들어냄.
  const hasSculptedRelief = SCULPTED_RELIEF_IDS.includes(ir.surface_morphology.reliefId);
  const projectionDesc = ir.camera_and_depth.isFlat2D
    ? (hasSculptedRelief
      ? `It has absolutely no rear depth — completely flat back face, no side walls — BUT the front face is deeply carved: the front-face relief defines its entire dimensionality with real depth, ridges and internal shadows.`
      : `It is presented as a ${FLAT_POSITIVE}. The form has absolutely no rear depth — only the front face surface relief defines its dimensionality.`)
    : ir.camera_and_depth.isMinimal
    ? `It has a solid but thin structural body with minimal side thickness — clearly front-facing, no deep rear extrusion, no heavy 3D block. The subtle natural thickness of a real object is allowed.`
    : ir.camera_and_depth.projectionId === "Shallow"
      ? "It is presented with only a very shallow front-face micro-depth — the rear face stays completely flat, unlit, and submerged in shadow. The sense of dimension comes from front-face bevel and lighting, NOT from rear extrusion. Absolutely zero rear 3D block."
      : "It is presented with bold 3D depth and rear extrusion.";
  const tone = getTone(ir._meta.persona.id);
  const prose = `An ${tone.headlineKind} rendered in a ${ir._meta.persona.name.split(' ')[1]} style. ${scaleTag}. ${lensTag}. The text is crafted from ${ir.material_stack.base} featuring ${ir.material_stack.internal_texture}. ${projectionDesc}`;
  const posTags = [
    prose,
    "masterpiece, best quality, ultra highres, insanely detailed, 8k resolution",
    "isolated standalone typography graphic, clear cutout text shape against background, highly legible",
    "infinite depth of field, entirely in focus, edge-to-edge sharp focus, zero background blur, crisp and clear entire frame",
    // 프레이밍 가드 — 접사 줌/크롭으로 글자가 프레임 밖으로 잘리는 현상 방지.
    "(entire text fully inside the frame with safe margins:1.4), same framing and scale as the input image, no zoom-in",
    // 측면 그림자 지시는 돌출이 실제로 있을 때만 — 평면(Flat2D)에서 상시 주입하면 모델이
    // "어두운 돌출"을 만들기 위해 글자 뒤에 단색 오프셋 실루엣을 그리던 원인.
    ir.camera_and_depth.isFlat2D ? "" : ir.camera_and_depth.isMinimal ? "thin side edges fall into soft dark shadow, never brightly lit" : "deep shadowed side walls, dark unlit extrusion, heavy ambient occlusion on thickness",
    ir.subject.fidelity_enforcement.replace("STRICT RULE: ", ""),
    // 가중치 형태 락 — 무가중치 fidelity 문장만으로는 페르소나의 고밀도 연출 문맥
    // ("AAA game title"·"structural perfection")에 밀려 레터폼이 재설계되던 문제 보강.
    "(exact original letterform silhouette from the input image:1.5), (strict shape preservation lock:1.4), (same letter proportions and spacing as the input image:1.3)",
    // 디테일 보존 락 — 실루엣 보존만으로는 세리프·장식을 걷어내는 "산세리프화"가 그물을 빠져나감.
    "(preserve every serif, flourish and decorative detail of the original letterforms:1.45)",
    // 중복 렌더 차단 — image-to-image 에서 참조의 타이틀 줄을 한 번 더 그리는 현상 방지.
    // 무가중치 문장은 고밀도 연출 토큰에 밀려 무시되던 사례가 있어 가중치로 승격.
    "(single composition — each line of text rendered exactly once:1.5), (same line count and same text content as the input image:1.4), no additional copy of the title anywhere on the canvas",
    ir._meta.persona.shapeLockEn || "",
    ir._meta.persona.mj_tags.split(" --no ")[0],
    // 배경은 가중치로 — 무가중치일 땐 고가중치 재질 토큰이 배경 색까지 점령(금판化)하던 문제.
    `(${ir.environment.background}:1.4)`,
    ir.environment.engine,
    ir.subject.intent,
  ];
  if (ir.edge_and_lighting.shadow) posTags.push("grounded with realistic drop shadow, soft cast shadow on backdrop, deep contact shadow anchoring the text");
  // 네거티브 다이어트 — 사고마다 쌓인 ~150개 나열을 의미 그룹으로 통합.
  // Gemini 계열엔 네거티브가 텍스트로 읽히므로 항목 수 자체가 attention 오염원이었음.
  const negTags = [
    "(worst quality, low quality:1.4), text mutation, extra letters, hallucinated text, floating decal",
    "(duplicated or repeated text, any line rendered twice, extra copy of the title, mirrored or echoed text:1.8)",
    "(cropped or cut-off text, letters extending beyond the canvas, zoomed-in crop, extreme close-up:1.7)",
    "(redesigned or substituted font, altered proportions or spacing, simplified idealized letterforms, restyled logo:1.6)",
    "(sans-serif conversion, removed serifs or decorative details, straightened strokes:1.6)",
    "(runes, hieroglyphs, symbols, written text on surface, watermark, gibberish:1.6), (merged letters, illegible blob, melted together:1.5)",
    "(filigree, floral patterns, ornate engravings:1.5)",
    "(background plate, plaque, signboard, engraved on a wall, solid metal block background, framed box around text:1.9), text engraved on surface, shield, baseplate, flat paper cutout, flat 2d sticker, vector graphic",
    "(uniform stroke outline, even border thickness, artificial outline:1.9), cheap 3d effect, wordart, distorted stroke proportions, (low poly, messy bevel, crunchy artifacts:1.5)",
    "(photoshop bevel and emboss, cheap v-carve, uniform V-shape depth, inner shadow or inner stroke layer style, fake 2d deboss:1.9)",
    "disconnected or floating rim light, artificial halo, separated highlight, (messy edge blending:1.6)",
    "messy glow, background clutter",
    "(depth of field, bokeh, background blur, lens blur, out of focus, soft focus, blurry edges, smudged:1.9)",
    "(melted shape, illegible, transparent text blending into background, excessive glow destroying shape, loss of silhouette:1.5)",
    "(circular brushing, radial metal grain, anisotropic reflection:1.5), curved scratches",
    ir.camera_and_depth.isFlat2D ? (hasSculptedRelief ? FLAT_REAR_ONLY_NEGATIVE : FLAT_NEGATIVE)
      : ir.camera_and_depth.isMinimal ? "(heavy extrusion, massive depth, thick 3d block, deep rear extrusion:1.8)"
      : ir.camera_and_depth.projectionId === "Shallow" ? "(thick extrusion, heavy 3d block, massive depth, deep rear extrusion, visible lit back face:1.9)" : "",
  ];
  if (ir.edge_and_lighting.rimColorId === "None") negTags.push("(bottom light:1.8), (underglow:1.8), (colored rim light:1.5), bright glow from below");
  if (!ir.edge_and_lighting.shadow) {
    // 그림자 OFF 강화 — drop/cast/contact 3종만으로는 모델이 만드는 "글자 뒤 어두운 후광(AO)·
    // 바닥 반사·접지 연출"이 그물을 빠져나가 그림자가 계속 생기던 문제.
    posTags.push("floating perfectly without floor shadows, zero surface contact, no darkening of the background anywhere");
    negTags.push("(drop shadow, cast shadow, contact shadow, shadow or dark halo behind text, floor reflection, grounding shadow, darkened area under text:1.9)");
  }
  // 시안 연출 모드 — 배경은 리얼블랙 균일 유지(이펙트 추출용). 이펙트 자체는 허용하되
  // 배경에 질감/비네팅/그라데이션이 깔리는 것만 차단.
  if (state.enableVfx) {
    posTags.push("(pure solid #000000 matte black background:1.5), background stays perfectly uniform black");
    negTags.push("(vignette:1.7), (background texture:1.6), (textured slate backdrop:1.6), (gradient background:1.6)");
    // 이펙트 확산 제한 — 화면 가장자리까지 퍼지면 소스 추출·합성이 불가능.
    posTags.push("(all effects stay tightly clustered around the letterforms:1.4), fading out completely well before the frame edges, generous clean black margin along all four canvas borders");
    negTags.push("(effects touching the frame edges:1.7), (effects spreading across the whole canvas:1.6), (full-screen particle field:1.6), (edge-to-edge glow:1.6), (corner light flares:1.5)");
  }
  // 강도별 이펙트 절제 — "은은하게"의 무가중치 문구는 고가중치 연출 토큰에 밀려 무시되던 문제.
  // 이펙트는 타이틀의 분위기를 보조하는 조연임을 가중치로 명시한다.
  if (fxTag && state.fxIntensity === "Subtle") {
    posTags.push("(the effects are a quiet supporting accent for the typography's mood — barely visible, sparse, occupying only a small fraction of the canvas:1.4), the typography itself remains the absolute visual dominant");
    negTags.push("(dense particle field:1.7), (heavy thick effects:1.6), (effects covering large areas:1.6), (effects competing with the text:1.5), (strong bright glow:1.5), (abundant particles:1.5)");
  } else if (fxTag && state.fxIntensity === "Moderate") {
    negTags.push("(dense particle field:1.5), (effects overpowering the text:1.5)");
  }
  // 단색 배경 강제 — RealBlack/PureWhite/ChromaGreen 은 완전 균일 단색이 의도.
  // "solid background" 긍정문만으로는 모델이 비네팅/그라데이션/스포트라이트 폴오프를 얹음.
  // ⚠️ 배경 "색"을 가중치로 명시해야 함 — 색 없는 uniform 지시만 주면 모델이 재질 색(금 등)을
  //    배경까지 칠해 "금판에 새긴 텍스트"가 되던 사고. 재질 색의 배경 번짐도 네거티브로 차단.
  if (!state.enableVfx && ["RealBlack", "PureWhite", "ChromaGreen"].includes(state.background)) {
    const bgColorEn = state.background === "RealBlack" ? "pure solid #000000 matte black"
      : state.background === "PureWhite" ? "pure solid #FFFFFF white"
      : "pure solid #00FF00 chroma green";
    posTags.push(`(${bgColorEn} background:1.6), (perfectly uniform solid background, zero background gradient:1.4), background stays ${bgColorEn} from corner to corner, (strong color separation between the text material and the background:1.3)`);
    negTags.push("(vignette:1.7), (background gradient:1.7), (background texture:1.6), (spotlight falloff on background:1.6), (radial light on background:1.5), (smoky background:1.5), (dusty backdrop:1.5), (uneven background illumination:1.5)");
    negTags.push("(background sharing the text material color:1.8), (material color spreading into the background:1.7), (metallic backdrop:1.7), (gold background:1.7), (colored backdrop behind the text:1.5)");
    if (state.background === "RealBlack") negTags.push("(bright background:1.7), (white background:1.6), (warm-toned backdrop:1.5)");
    if (state.background === "PureWhite") negTags.push("(dark background:1.7), (black backdrop:1.6)");
  }
  // ─── 조각형 릴리프 타입 언어 — 돌출 모드와 무관하게 전면 조형에 적용 ───
  // ⚠️ "sculpted"(조소) 계열 표현 금지 — 모델이 점토처럼 말랑한 유기 곡면으로 해석하던 원인.
  //    파셋 계열은 "평평한 면 + 면도날 능선 + 기계 세공 정밀도" 언어로 요구한다.
  if (hasSculptedRelief) {
    // 배경 침범 차단 — 음각/양각이 배경까지 판처럼 칠하던 성질 억제. 조형은 획 안에서만.
    posTags.push("(the dimensional form exists strictly inside the letter strokes:1.4), background remains an untouched empty void");
    negTags.push("(carved background plate:1.9), (background filled with material:1.9), (relief slab behind the letters:1.8), (engraved backdrop:1.8)");
    const rid = ir.surface_morphology.reliefId;
    if (rid === "ChunkyToy") {
      posTags.push("(soft rounded chunky front volume with real depth:1.4), (inflated smooth surface transitions:1.3)");
    } else if (rid === "RaisedDome") {
      posTags.push("(smoothly domed convex letterforms with real raised depth:1.4), (polished metallic dome surface, coin-emboss precision:1.35)");
      negTags.push("(doughy toy-like puffiness:1.5), (clay-like organic sculpt:1.5)");
    } else if (rid === "MicroChiseled") {
      // 마이크로 치즐링 — 얕은 저부조 + 각진 치즐 컷 면. "deep" 언어 금지 (장난감化 방지).
      posTags.push("(dense small angular chisel-cut facets across the front face:1.45), (shallow low-relief depth with crisp flat cut planes:1.35), (clearly visible facet pattern — each cut face readable as a distinct plane with its own light value:1.3)");
      negTags.push("(deep carving:1.6), (thick puffy volume:1.6), (soft doughy surface:1.6), (clay-like organic sculpt:1.5), (blurred cut edges:1.5)");
    } else if (rid === "Crystalline") {
      // 크리스탈 파셋 — 깊은 사선 홈이 아니라 얕고 미세한 평면 파셋들의 모자이크.
      posTags.push("(front face cut into many small flat crystalline facets:1.45), (fine gem-faceted micro-plane mosaic, each facet catching light at a different angle:1.4), (crisp facet borders, jewelry cutting precision:1.35)");
      negTags.push("(diagonal groove lattice:1.7), (cross-hatch carving:1.7), (diamond grid engraving:1.6), (deep V grooves:1.5), (soft doughy carving:1.6), (melted rounded facets:1.6), (blurred crease lines:1.5)");
    } else if (rid === "RaisedEmboss" || rid === "RaisedRidge") {
      posTags.push("(crisply raised letterforms with real emboss depth:1.45), (flat planes and slopes meeting at razor-sharp crease edges:1.4), (machined hard-surface precision, crisp specular breaks:1.35)");
      // 면 분할 명암 대비 — 인접한 평면끼리 밝기가 확실히 갈라져야 "각지게 깎인" 느낌이 산다.
      posTags.push("(strong tonal separation between adjacent planes, each plane one clean light value:1.35)");
      negTags.push("(soft doughy emboss:1.6), (melted rounded transitions:1.6), (clay-like organic sculpt:1.5), (blurred crease lines:1.5), (puffy inflated volume:1.5), (uniform flat shading across planes:1.4)");
    } else {
      posTags.push("(deep faceted front-face carving with real depth:1.45), (flat facet planes meeting at razor-sharp crease edges:1.4), (machined hard-surface precision, crisp specular breaks between facets:1.35)");
      negTags.push("(soft doughy carving:1.6), (melted rounded facets:1.6), (clay-like organic sculpt:1.5), (soft transitions between planes:1.5), (blurred crease lines:1.5), (puffy inflated volume:1.5)");
    }
    negTags.push("(completely flat front face:1.6), (featureless flat surface:1.5), (flat 2d sticker look:1.5), (missing carve depth:1.5)");
  }
  if (ir.camera_and_depth.isFlat2D) {
    negTags.push("(angled view, side view, isometric, 3d perspective, tilt, diagonal, skewed:1.9)");
    // 가짜 돌출 뒤판 차단 — 글자 뒤에 단색 오프셋 실루엣을 그리는 현상 전용.
    negTags.push("(dark offset silhouette, solid extrusion shape or fake 3d backing behind the letters:1.8)");
    posTags.push(hasSculptedRelief
      // 조각형 — 후면만 평면 강제(FLAT_REAR_ONLY), 전면 조각 깊이는 위 타입 언어가 담당.
      ? `perfectly straight-on front facing view, dead center orthographic layout, ${FLAT_REAR_ONLY_POSITIVE}`
      // FLAT_POSITIVE 는 prose(projectionDesc)에 이미 포함 — 여기서 반복하면 60단어 통째 중복.
      : "perfectly straight-on front facing view, dead center orthographic layout, strict 2D planar composition");
  } else if (ir.camera_and_depth.isMinimal) {
    // 최소 돌출 — 얇은 몸통은 허용하되 정면성/과한 블록만 제어 (평면 강제 아님).
    posTags.push("straight-on front facing view, dead center, thin structural body with minimal natural side thickness");
    negTags.push("(extreme angled view, side view, tilt:1.5)");
  } else if (ir.camera_and_depth.projectionId === "Shallow") {
    posTags.push("straight-on front facing view, dead center, very shallow front-face micro-depth only, rear face flat and unlit, depth from front-face lighting not rear extrusion");
    negTags.push("(extreme angled view:1.5), (side view:1.5), tilt");
  } else {
    posTags.push("straight-on front facing view, dead center");
    negTags.push("(extreme angled view:1.5), (side view:1.5), tilt");
  }
  if (state.currentView === 'editor' && !state.enableVfx) {
    negTags.push("(particle effects:1.9), (floating dust:1.9), (magic sparkles:1.9), (glowing embers:1.9), (smoke:1.9), (fog:1.9), (mist:1.9), (lens flare:1.9), (bloom:1.9), light leaks, fire, flames, glowing background");
  }
  if (ir.surface_morphology.reliefId !== "ChunkyToy") {
    posTags.push("rigid hard-surface, sharp geometric corners, precise metallic structure");
    negTags.push("(plastic toy balloon inflatable look, play-doh, marshmallow squishy, soft rounded bevels and blunt corners:1.6)");
  }
  if (["MicroBevel", "HairlineBevel", "Flat", "MicroChiseled"].includes(ir.surface_morphology.reliefId)) {
    negTags.push("(deeply carved:1.5), (heavy embossing:1.5), (intense 3d front:1.5), (deep valleys:1.5), deep chiseled");
  }
  if (state.cameraLens === "Telephoto") negTags.push("(wide angle distortion:1.5), (perspective distortion:1.5), fisheye, vanishing point");
  // 마모도 None = 완전 청결이 의도 — 네거티브가 없으면 모델이 임의로 오염 반점을 얹음.
  if (state.wearLevel === "None") negTags.push("(dirt specks, dark stains, grime spots, splatter marks, random black dots:1.6)");
  // 광택 재질의 디테일 메꿈 방지 — liquid-metal 반사가 글자의 파인 홈·카운터를 채워
  // 형태 디테일이 뭉개지는 현상 (유광 골드에서 보고됨).
  if (["SemiGlossGold", "PolishedGold", "GoldFoil", "HyperChrome", "PolishedSilver"].includes(state.material)) {
    posTags.push("(every notch, counter and recessed cut of the letterforms stays crisp and open:1.4)");
    negTags.push("(molten metal or reflections filling the letter gaps and notches, melted merged counters, smoothed-over details:1.6)");
  }
  if (state.typographyScale === "Dense") {
    posTags.push("clean legible typography, simplified readable shapes");
    negTags.push("(excessive noise, cluttered details, unreadable, chaotic textures:1.5)");
  }
  // 채도 지시는 페르소나 그레이딩과 모순되지 않게 — DarkSmith 는 "desaturated dark palette" 가
  // 정체성인데 "highly saturated" + "(desaturated:1.5)" 네거티브가 정면충돌하던 문제.
  const darkMood = ir._meta.persona.id === "DarkSmith";
  posTags.push(darkMood ? `${tone.colorGrading}, rich deep colors` : `highly saturated, punchy vibrant colors, ${tone.colorGrading}, rich deep colors`);
  negTags.push(darkMood ? "(washed out, dull muddy colors:1.4), faded, grayscale" : "(washed out, desaturated, dull colors:1.5), faded, grayscale, (dark, underexposed, gloomy:1.5)");
  // 재질 균일 커버리지 — 방향성 라이팅과 결합 시 모델이 시선 중심(좌상단)에만 재질을
  // 몰아주고 우하단/마지막 글자를 어둡거나 밋밋하게 남기던 문제 (금박 등에서 두드러짐).
  posTags.push("(uniform material application across every letter, consistent texture edge to edge:1.4), every letter fully rendered with identical treatment including the last characters, no letter left in darkness");
  negTags.push("(untextured or partially textured areas, material fading toward one side, unfinished last letters, letters swallowed by shadow:1.6)");
  posTags.push(`(dramatic directional lighting:1.4), clearly lit front face, ${ir.camera_and_depth.isFlat2D ? "" : "side thickness falls into deep shadow, "}preserve clean silhouette edges, flawless silhouette boundary, surface detail must not distort the outer contour, damage stays inside the front face only, clean and readable typography, (rich luminous midtones:1.3), (rich tactile material finish:1.4), (crisp sharp specular highlights:1.4), (high-end PBR physically-based shading:1.4), (strong material contrast:1.3), (deep tonal range, lustrous reflective surface, photorealistic material depth:1.4)`);
  // 조각형 릴리프는 가중치로 승격 — FLAT 계열 상시 토큰에 밀리지 않도록.
  // 마모(wear) 도 가중치 승격 + 무결점 표현 차단 — 재질의 폴리시 묘사("showroom polish")가
  // 4단어짜리 무가중치 마모 토큰을 항상 이겨 "세월의 흔적"이 매끈하게 나오던 문제.
  const wearActive = state.wearLevel && state.wearLevel !== "None";
  posTags.push(hasSculptedRelief ? `(${ir.surface_morphology.relief}:1.4)` : ir.surface_morphology.relief, wearActive ? `(${ir.surface_morphology.wear}:1.35)` : "");
  if (wearActive) negTags.push("(flawless pristine untouched factory-new surface, showroom-perfect polish:1.5)");
  posTags.push(ir.edge_and_lighting.rim_light, ir.edge_and_lighting.glint, "texture physically embedded into material");
  if (fxTag) posTags.push(fxTag);
  // 표면 디테일 반영 — 이전엔 nano 컴파일러가 surface_detail 을 프롬프트에 넣지 않아
  // High 를 선택해도 렌더에 반영되지 않던 문제. High 는 접사급 미세 질감을 고가중치로.
  if (state.surfaceDetail === "High") {
    posTags.push("(intense surface micro-details, fine hairline scratches, tactile material grain visible under raking light:1.45), dense refined micro-texture across the entire surface");
    negTags.push("(flat featureless surface, smooth plain material, blurry low-detail texture:1.5)");
  } else if (state.surfaceDetail === "Standard") {
    posTags.push(`(${ir.material_stack.surface_detail}:1.2)`);
  } else if (state.surfaceDetail === "Clean") {
    posTags.push("(perfectly smooth flawless pristine surface:1.3)");
    negTags.push("scratches, grunge, noise, dents, dust, imperfections, distressed surface");
  }
  // 말미 재확인 — 페르소나/재질 연출 토큰들 "뒤"에서 형태 락을 마지막으로 한 번 더.
  // 프롬프트 후반 토큰이 최종 인상을 좌우하는 order 효과로, 연출에 밀린 락을 복원한다.
  posTags.push("(final rule — letterform shapes identical to the input image, restyle nothing:1.4)");
  // "Negative prompt:" 는 Gemini 계열엔 실제 네거티브 컨디셔닝이 아니라 그냥 텍스트 —
  // 명령형 금지문으로 감싸야 지시로 작동한다 (단어 나열만 하면 오히려 해당 개념을 유도).
  return `${posTags.filter(Boolean).map(t => t.trim()).join(", ")}\n\nNegative prompt: STRICTLY FORBIDDEN — the image must NOT contain any of the following: ${negTags.filter(Boolean).map(t => t.trim()).join(", ")}`;
};

export const compileChatGPT = (ir, state) => {
  const isVFXPass = state.vfxPassMode || ir.vfxPassMode;
  let depthStr = ir.camera_and_depth.projection;
  if (isVFXPass) {
    return `Create an epic masterpiece image based on the following exact specifications.

### 1. VFX EXTRACTION PASS (CRITICAL)
- **Type**: Pure flat 2D pitch-black silhouette typography.
- **Constraint**: ${ir.subject.fidelity_enforcement}
- **Vibe**: Technical Matte Pass for VFX Compositing.
- **Rule (ABSOLUTE)**: Render the typography as a pure Vantablack (#000000), completely unlit flat 2D shape. STRICTLY FORBIDDEN: Do NOT add any rim lights, edge highlights, 3D thickness, bevels, or reflections to the letters. The text itself must be an invisible black hole. ONLY render the glowing FX.
- **Layering**: ${ir.vfxPassOverlay ? "The effects drift and pass FREELY IN FRONT of the black letterforms, crossing over the letter shapes — the black letters are only a position guide underneath (front-layer compositing source)." : "The effects stay around and behind the letterforms — the black letters occlude effects passing behind them (holdout matte for behind-title compositing)."}

### 2. Surrounding VFX
- **FX Type**: ${ir.fx.core !== "no surrounding FX" ? `${ir.fx.intensity} ${ir.fx.core}. Origin: ${ir.fx.origin}.` : "No surrounding FX."}
- **Rule**: ${ir.fx.containment_rule}

### 3. Environment
- **Canvas**: ${ir.environment.background}
- **Render Engine**: ${ir.environment.engine}`;
  }
  const cgSculpted = SCULPTED_RELIEF_IDS.includes(ir.surface_morphology.reliefId);
  if (ir.camera_and_depth.isFlat2D) depthStr = cgSculpted
    ? `CRITICAL RULE: Absolutely zero REAR depth — completely flat back face, NO 3D block, NO side walls, NO extruded geometry. The letter body itself is razor-thin with NO visible thickness. BUT the FRONT face MUST be deeply carved with MACHINED PRECISION: flat facet planes meeting at razor-sharp crease edges, crisp internal shadows inside the grooves, hard-surface exactness. NEVER soft, doughy, clay-like or melted transitions between planes. All dimensionality lives inside the front surface. The camera MUST be positioned perfectly straight-on, dead center. Absolutely NO angled views, NO side views, NO isometric angles.`
    : `CRITICAL RULE: The typography must be a strictly flat letterform with zero extrusion depth and paper-thin profile. It is a 2D surface only with no thickness — completely flat back face, razor-thin structure, front-face only rendering. The outer contour reads as a flat 2D cutout shape. Absolutely zero rear depth, NO 3D block, NO side walls, NO extruded geometry, NO visible side planes, NO object thickness. All dimensionality must exist ONLY inside the front face as surface relief and shading. The camera MUST be positioned perfectly straight-on, dead center. Absolutely NO angled views, NO side views, NO isometric angles.`;
  else if (ir.camera_and_depth.projectionId === "Shallow") depthStr = `CRITICAL RULE: The typography must have ONLY a very shallow, thin 3D extrusion. Absolutely NO thick heavy 3D blocks. Keep the depth minimal.`;
  const lensDirective = `\n- **Lens & Perspective**: ${ir.camera_and_depth.lens}. CRITICAL: Use infinite depth of field. Every part of the text must be entirely in focus. Absolutely NO background blur, NO bokeh, NO blurry edges.`;
  let materialRule = ir.material_stack.integration_rule + " Must look highly organic, authentic, and photorealistic (PBR). STRICTLY AVOID cheap plastic, fake gold foil, or tacky over-shiny CGI look. Ensure extreme sharpness and elegant micro-details. The surface must not look chunky, blurry, or low-resolution. STRICTLY FORBIDDEN: Do NOT use cheap photoshop bevel and emboss effects, and avoid uniform V-shaped carving. AVOID decorative filigree, floral patterns, or ornate engravings. Do NOT use fake inner shadow or inner stroke layer styles.";
  materialRule += " CRITICAL: Do NOT let transparent ice blend into the background. Do NOT let glowing lava melt or break the shape. High legibility is mandatory. Ensure strictly linear brushed patterns if brushed metal is used, NO circular or radial grain.";
  materialRule += " UNIFORM COVERAGE: Apply the material and texture EVENLY across every letter — the last characters, right side and bottom edges must receive exactly the same material treatment as the center. No untextured areas, no letters swallowed by shadow, no material fading toward one side.";
  if (ir.surface_morphology.reliefId !== "ChunkyToy") materialRule += " The object must have a rigid hard-surface with sharp metallic corners. It MUST NOT look like a plastic toy, a balloon, soft rounded bevels, or an inflatable bubble text.";
  if (state.surfaceDetail === "Clean") materialRule += " Ensure the surface is perfectly smooth and clean, absolutely NO scratches or grunge.";
  if (state.surfaceDetail === "High") materialRule += " Add INTENSE macro-photography-level micro-details: fine hairline scratches, tactile material grain visible under raking light, and dense refined micro-texture across the ENTIRE surface. The surface must never look flat, plain or blurry up close.";
  if (state.typographyScale === "Dense") materialRule += " VERY IMPORTANT: Because the text is dense/complex, prioritize legibility. Reduce excessive noise or overly deep fractures that might make the letters unreadable. Keep the boundaries crisp.";
  return `Create an epic masterpiece image based on the following exact specifications.

### 1. Core Directives
- **Type**: Isolated standalone typography graphic. ${ir.subject.scale}.
- **Vibe**: ${ir._meta.persona.discipline}
- **Constraint**: ${ir.subject.fidelity_enforcement}${ir._meta.persona.shapeLockEn ? ` ${ir._meta.persona.shapeLockEn}.` : ""} Render the composition EXACTLY ONCE — each line of text appears one single time, same line count as the input image. Absolutely NO duplicated title, NO text rendered twice.

### 2. Camera & Depth
- **Perspective**: ${depthStr}${lensDirective}
- **Front-Face Sculpting**: ${ir.surface_morphology.relief} with ${ir.surface_morphology.treatment}. CRITICAL: This describes the front-face carving of the isolated typography itself — it MUST NOT be interpreted as a relief carved onto a background wall, plaque, or solid slab. The text is a standalone graphic, not a relief mounted on a surface.

### 3. Layered Material Stack
- **Base Material**: ${ir.material_stack.base} (${ir.surface_morphology.wear})
- **Internal Texture**: ${ir.material_stack.internal_texture}
- **Color Grading**: ${getTone(ir._meta.persona.id).colorGrading}. Rich, naturally saturated colors with controlled highlights — avoid washed-out dullness, but EQUALLY avoid oversaturated neon harshness, blown-out contrast or HDR-like glare. Aim for physically-believable premium color depth. (Note: this model tends to over-boost saturation — keep it restrained and cinematic.)
- **Tone Stability**: ONE coherent lighting setup — a single key light with a soft fill, consistent light direction across the whole image. Balanced, stable exposure edge to edge: no HDR processing, no tone-mapped look, no crushed blacks or clipped highlights, stable midtones. The overall tone must read as one continuous photograph, not a composite of differently-lit parts.
- **Rule**: ${materialRule}

### 4. Lighting & VFX
- **Lighting**: Dramatic directional lighting. ${ir.camera_and_depth.isFlat2D ? "Clearly lit front face. There is NO side thickness at all — NEVER render dark side planes, offset silhouettes, or any solid dark shape behind the letters." : "Clearly lit front face, but any side thickness MUST fall into deep dark shadow. Avoid overlit side planes."} ${ir.edge_and_lighting.glint}. Add ${ir.edge_and_lighting.rim_light}. ${ir.edge_and_lighting.rimColorId === "None" ? "CRITICAL: Do not add any glowing underlight or bottom light." : ""} Ensure perfect exposure on the front, deep controlled shadows on the sides, clean high-value highlights, strong material contrast. Avoid unnatural or uniform glowing borders.
- **Optical Integration**: Edge highlights and rim lights MUST be physically integrated into the surface edges only. Strictly NO floating glow, detached halos, or separated stroke lines. Do NOT overexpose the side extrusions.
- **Edge/Outline**: ${ir.edge_and_lighting.outline}
- **Surrounding VFX**: ${ir.fx.core !== "no surrounding FX" ? `${ir.fx.intensity} ${ir.fx.core}. Origin: ${ir.fx.origin}.` : "No surrounding FX."} ${ir.fx.containment_rule}
${state.currentView === 'editor' && !state.enableVfx ? "- **VFX RULE**: Ensure absolutely ZERO particles, zero dust, zero smoke, and zero lens flares. Keep the background completely clean." : ""}

### 5. Environment
- **Canvas**: Maintain ${ir.environment.background}. CRITICAL: The text must be an isolated, standalone graphic. Do NOT engrave the text onto a solid metal wall, plaque, or background plate. The background must remain a separate, simple canvas behind the text cutout.${!state.enableVfx && ["RealBlack", "PureWhite", "ChromaGreen"].includes(state.background) ? " The background MUST stay EXACTLY the specified color, perfectly uniform from corner to corner — absolutely NO vignette, NO gradient, NO texture, NO spotlight falloff. The background must NEVER share or borrow the text's material color (e.g. NO gold backdrop behind gold text — the text material exists ONLY inside the letterforms)." : ""}
- **Shadow**: ${ir.edge_and_lighting.shadow ? "MUST include grounded realistic drop shadow and cast shadows on the background canvas." : "ABSOLUTELY ZERO drop shadows. No cast shadows. No dark halo or ambient occlusion behind the text. No floor reflection. The text must appear to be floating with zero darkening of the background anywhere."}
- **Render Engine**: ${ir.environment.engine}
${ir.subject.intent ? `\n### 6. Special Intent\n- ${ir.subject.intent}` : ''}`;
};

export const compileMidjourney = (ir, state) => {
  const isVFXPass = state.vfxPassMode || ir.vfxPassMode;
  const fxPhrase = ir.fx ? (ir.fx.core !== "no surrounding FX" ? `${ir.fx.intensity} ${ir.fx.core} ${ir.fx.origin}` : "") : "";
  const intent = ir.subject.intent ? `, ${ir.subject.intent}` : "";
  if (isVFXPass) {
    const subject = ir.vfxPassOverlay
      ? `pure pitch-black silhouette typography, effects passing freely in front of and across the black letterforms, letters as position guide only`
      : `pure pitch-black silhouette typography, holdout matte pass, effects occluded behind the letterforms`;
    const lightingFx = `${fxPhrase}, ${ir.environment.background}`;
    const mjNegatives = "--no rim light, edge light, edge highlight, 3d, bevel, thickness, extrusion, metallic, reflections, lit text, text texture, outline, border, floating effects, background clutter, text mutation ";
    return `/imagine prompt: ${subject}, completely unlit black hole material, zero reflections, zero highlights, ${lightingFx} ${intent} ${mjNegatives}--style raw --v 6.1`.replace(/\s+/g, ' ').replace(/, ,/g, ',');
  }
  const lensTag = ir.camera_and_depth.lens;
  const mjTone = getTone(ir._meta.persona.id);
  const mjSculpted = SCULPTED_RELIEF_IDS.includes(ir.surface_morphology.reliefId);
  const mjFlat = ir.camera_and_depth.isFlat2D
    ? (mjSculpted ? `${FLAT_REAR_ONLY_POSITIVE}, deep faceted front-face carving, flat facet planes meeting at razor-sharp crease edges, machined hard-surface precision, crisp internal shadows` : FLAT_POSITIVE)
    : ir.camera_and_depth.projection;
  let subject = `${mjTone.subjectKind}, isolated standalone typography graphic, clear cutout text shape against background, highly legible, infinite depth of field, entirely in focus, crisp and clear entire frame, ${ir.subject.scale}, ${lensTag}, ${ir.subject.fidelity_enforcement}${ir._meta.persona.shapeLockEn ? `, ${ir._meta.persona.shapeLockEn}` : ""}, ${mjFlat}, ${ir.surface_morphology.relief}`;
  let detailTag = "";
  if (state.surfaceDetail === "Clean") detailTag = "perfectly smooth flawless clean surface, ";
  else if (state.surfaceDetail === "High") detailTag = "intense macro-level surface micro-details, fine hairline scratches, tactile material grain under raking light, dense refined micro-texture, ";
  const materialMood = `${ir._meta.persona.discipline}, ${ir._meta.persona.mj_tags}, highly saturated, punchy vibrant colors, ${detailTag}${ir.material_stack.base} material with ${ir.material_stack.internal_texture}, ${ir.surface_morphology.wear} surface, uniform material coverage across every letter edge to edge, no letter left untextured or in darkness`;
  let lightingFx = `${fxPhrase}, (dramatic directional lighting:1.4), ${ir.camera_and_depth.isFlat2D ? "clearly lit front face, no side walls at all, nothing rendered behind the letterforms" : ir.camera_and_depth.isMinimal ? "clearly lit front face, thin side edges in soft dark shadow" : "clearly lit front face, dark shadowed side walls, deep ambient occlusion on extrusion"}, ${ir.edge_and_lighting.outline}, ${ir.edge_and_lighting.rim_light}, (physically attached crisp specular highlights:1.4), ${ir.edge_and_lighting.glint}, deep controlled shadows, clean high-value highlights, (strong material contrast:1.3), (high-end PBR physically-based shading, lustrous reflective surface, photorealistic material depth:1.4), ${ir.environment.background}`.replace(/^,\s*/, '');
  if (ir.edge_and_lighting.shadow) lightingFx += ", grounded with realistic drop shadow, soft cast shadow on backdrop, deep contact shadow anchoring the text";
  let mjNegatives = "--no background plate, plaque, signboard, engraved on a wall, solid metal block background, floating effects, background clutter, text mutation, extra letters, duplicated text, repeated title, text rendered twice, stacked duplicate lines, altered silhouette, redesigned letterforms, different font, sans-serif conversion, removed serifs, stripped decorative details, idealized letter shapes, random text, runes, hieroglyphs, symbols, written text on surface, watermark, gibberish, merged letters, illegible blob, melted together, filigree, floral patterns, decorative ornaments, ornate engravings, uniform stroke, photoshop bevel and emboss, cheap v-carve, wordart, disconnected rim light, floating edge light, artificial halo, separated highlight, dull gray midtones, framed, box around text, shield, emblem, baseplate, flat paper cutout, flat 2d sticker, inner shadow layer style, inner stroke, fake 2d deboss, flat paper with bevel, washed out, desaturated, faded, unnatural outline, glowing border, depth of field, bokeh, background blur, lens blur, out of focus, soft focus, blurred foreground, blurry edges, smudged, melted shape, illegible, transparent text blending into background, excessive glow destroying shape, loss of silhouette, bright side walls, overlit extrusion, glowing thickness, washed out sides, circular brushing, radial metal grain, anisotropic reflection, curved scratches, ";
  if (ir.edge_and_lighting.rimColorId === "None") mjNegatives += "bottom light, underglow, colored rim light, bright glow from below, ";
  if (!ir.edge_and_lighting.shadow) {
    subject += ", floating perfectly without floor shadows, zero darkening of the background";
    mjNegatives += "drop shadow, cast shadow, contact shadow, drop shadow on background, shadow behind text, dark halo around text, floor reflection, grounding shadow, ";
  }
  if (state.enableVfx) {
    subject += ", pure solid black uniform background, all effects tightly clustered around the letterforms and fading out well before the frame edges";
    mjNegatives += "vignette, background texture, gradient background, textured slate backdrop, effects touching the frame edges, full-screen particle field, edge-to-edge glow, ";
  }
  if (fxPhrase && state.fxIntensity === "Subtle") {
    subject += ", the effects are only a quiet sparse accent — the typography stays the absolute visual dominant";
    mjNegatives += "dense particle field, heavy effects, effects covering large areas, abundant particles, ";
  }
  if (!state.enableVfx && ["RealBlack", "PureWhite", "ChromaGreen"].includes(state.background)) {
    subject += ", perfectly uniform solid background color exactly as specified, zero background gradient, text material exists only inside the letterforms";
    mjNegatives += "vignette, background gradient, background texture, spotlight falloff, radial light on background, smoky background, metallic backdrop, gold background, background sharing the text material color, ";
  }
  if (ir.camera_and_depth.isFlat2D) {
    subject += mjSculpted
      ? `, perfectly straight-on front facing view, dead center orthographic layout, ${FLAT_REAR_ONLY_POSITIVE}`
      : `, perfectly straight-on front facing view, dead center orthographic layout, 2D flat composition, ${FLAT_POSITIVE}`;
    mjNegatives += `angled view, side view, isometric, 3d perspective, tilt, diagonal, skewed, ${mjSculpted ? `${FLAT_MJ_REAR_ONLY}, completely flat front face, missing carve depth` : FLAT_MJ_NEGATIVE}, `;
  } else if (ir.camera_and_depth.isMinimal) {
    subject += ", straight-on front facing view, dead center, thin structural body with minimal natural side thickness";
    mjNegatives += "heavy 3d block, massive depth, deep rear extrusion, extreme angled view, side view, tilt, ";
  } else if (ir.camera_and_depth.projectionId === "Shallow") {
    subject += ", straight-on front facing view, dead center, very shallow thin 3d extrusion";
    mjNegatives += "extreme angled view, side view, tilt, heavy 3d block, massive depth, thick extrusion, deep rear extrusion, ";
  } else {
    subject += ", straight-on front facing view, dead center";
    mjNegatives += "extreme angled view, side view, tilt, ";
  }
  if (state.currentView === 'editor' && !state.enableVfx) mjNegatives += "particle effects, floating dust, magic sparkles, glowing embers, smoke, fog, mist, lens flare, bloom, light leaks, fire, flames, glowing background, ";
  if (ir.surface_morphology.reliefId !== "ChunkyToy") {
    lightingFx += ", rigid hard-surface, sharp geometric corners, precise metallic structure";
    mjNegatives += "plastic, toy, balloon, inflatable, bubble text, play-doh, soft rounded edges, marshmallow, squishy, 3d render style, soft rounded bevels, blunt corners, smooth edges, ";
  }
  if (ir.camera_and_depth.isFlat2D || ir.camera_and_depth.isMinimal) mjNegatives += "heavy 3d block, perspective depth, deep rear extrusion, isometric, angled view ";
  if (state.surfaceDetail === "Clean") mjNegatives += "scratches, grunge, noise, dents, dust, imperfections ";
  if (state.typographyScale === "Dense") mjNegatives += "excessive noise, cluttered details, unreadable, chaotic textures ";
  if (state.cameraLens === "Telephoto") mjNegatives += "wide angle distortion, perspective distortion, fisheye, vanishing point ";
  if (["MicroBevel", "HairlineBevel", "Flat", "MicroChiseled"].includes(ir.surface_morphology.reliefId)) mjNegatives += "deeply carved, heavy embossing, intense 3d front, deep valleys, deep chiseled ";
  return `/imagine prompt: ${subject}, ${materialMood}, ${lightingFx}, ${ir.environment.engine}, perfectly exposed, vivid, highly detailed${intent} ${mjNegatives}--style raw --v 6.1`.replace(/\s+/g, ' ').replace(/, ,/g, ',');
};

// ============================================================
// Edit compilers (Micro-Edit view)
// ============================================================
export const compileEditNanoBanana = (ir, state) => {
  if (ir.vfxPassMode) {
    const posTags = ["masterpiece, best quality, ultra highres, 8k resolution", "pure pitch-black silhouette typography, holdout matte pass, vantablack text, completely unlit, pure #000000 shape", ir.details.vfx || "", ir.background, ir.customIntent !== "subtle surface enhancement" ? ir.customIntent : ""].filter(Boolean).map(t => t.trim()).join(", ");
    const negTags = ["(worst quality, low quality:1.4), text mutation, extra letters, hallucinated text", "(rim light:1.8), (edge highlight:1.8), (glowing edge:1.8), (3d:1.8), (thickness:1.8), (extrusion:1.8), (bevel:1.8), (metallic:1.8), (reflections:1.8), (lighting on text:1.8), (3d block:1.8)", "lit text, text texture, outline, border, drop shadow, inner glow, lens flare"].filter(Boolean).map(t => t.trim()).join(", ");
    return `${posTags}\n\nNegative prompt: STRICTLY FORBIDDEN — the image must NOT contain any of the following: ${negTags}`;
  }
  const editTone = getTone(ir._meta?.persona?.id);
  // 평면 유지 모드 — 후면 돌출(None)이 기본값. 이때는 입체화를 유발하던 상시 토큰
  // (전면 릴리프 요구·측면 그림자·스펙큘러·메탈 하드서피스)을 끄고 "베이스 이미지의
  // 차원감 보존"을 명시한다. frontVolumeModifier 는 에디트 UI 에 없는 생성 탭 상태
  // (frontRelief, 기본 MicroChiseled)가 새어 들어와 평면 입력에 표면 조각 볼륨을
  // 항상 요구하던 주범 — 돌출을 명시적으로 허용했을 때만 적용.
  const isFlatEdit = ir.constraints.extrusionId === "None";
  const frontVolumeModifier = frontVolumeModifierFor(ir.reliefId);
  const projectionTag = isFlatEdit
    ? `${FLAT_POSITIVE}, (preserve the original dimensionality and front-face relief of the base image exactly:1.4), do NOT add new carving, bevels, embossing or surface sculpting`
    : `allow 3d extrusion, ${frontVolumeModifier}`;
  const posTags = [
    "masterpiece, best quality, ultra highres, 8k resolution, perfectly exposed, bright base material",
    "isolated standalone typography graphic, clear cutout text shape against background",
    isFlatEdit
      ? "clean and readable typography, rich luminous midtones, faithful to the original material and shading style of the base image"
      : "clean and readable typography, rich luminous midtones, elegant material finish, crisp specular highlights, clearly lit front face, deep shadowed side walls",
    `highly saturated, punchy vibrant colors, ${editTone.colorGrading}, rich deep colors`,
    "infinite depth of field, entirely in focus, edge-to-edge sharp focus, zero background blur, crisp and clear entire frame",
    `${editTone.remixTag}, ${ir.budget.en}`,
    "Use the input image as the exact structural reference",
    "strict shape lock, exact silhouette preservation, preserve the original typography silhouette, spacing, stroke proportions, and letter shapes",
    ir.camera, projectionTag,
    ir.details.material ? `change material to ${ir.details.material}` : "",
    ir.details.lighting ? `dynamic lighting, ${ir.details.lighting}, physically attached specular highlights` : "",
    ir.details.vfx ? `surrounding VFX, ${ir.details.vfx}, contained energy` : "",
    ir.customIntent !== "subtle surface enhancement" ? ir.customIntent : "",
    "texture physically embedded into material", ir.background,
  ];
  const negTags = [
    "(worst quality, low quality:1.4), (washed out:1.5), (desaturated:1.5), (dull colors:1.5), (noisy, dirty surface, overcooked, dark patches, messy shading, burnt shadows:1.5), (dark, underexposed, gloomy:1.5)",
    "text mutation, shape drift, stroke swell, extra letters, hallucinated text, floating decal, material sticker, distorted stroke proportions, altered spacing",
    "(duplicated text:1.8), (repeated title:1.8), (two copies of the same text:1.8), (text rendered twice:1.7), (extra text lines:1.6)",
    "(runes, hieroglyphs, symbols, written text on surface, watermark, gibberish:1.6), (merged letters, illegible blob, melted together, fused typography:1.5)",
    "(filigree, floral patterns, decorative ornaments, ornate engravings:1.5)",
    // 평면 유지 모드에선 "flat paper cutout / flat 2d sticker / vector graphic" 금지를 제외 —
    // 평면 그래픽 룩 자체를 배척해 모델을 입체 쪽으로 밀던 토큰들.
    isFlatEdit
      ? "(background plate:1.9), (plaque:1.9), (signboard:1.9), (engraved on a wall:1.9), (solid metal block background:1.9), (framed:1.8), (box around text:1.8), text engraved on surface, shield, baseplate, mounted metal plate"
      : "(background plate:1.9), (plaque:1.9), (signboard:1.9), (engraved on a wall:1.9), (solid metal block background:1.9), (framed:1.8), (box around text:1.8), text engraved on surface, shield, baseplate, flat paper cutout, flat 2d sticker, mounted metal plate, vector graphic",
    ir.constraints.extrusionId === "None" ? FLAT_NEGATIVE : ir.constraints.extrusionId === "Shallow" ? "(thick extrusion:1.8), (heavy 3d block:1.8), (massive depth:1.8), (deep rear extrusion:1.8), (chunky text:1.8)" : "(thick extrusion:1.4), (heavy 3d block:1.4)",
    "(uniform stroke:1.9), (even border thickness:1.9), (artificial outline:1.9), (unnatural outline:1.5), (glowing border:1.5), cheap 3d effect, wordart, 2d border, (low poly, jagged edges, messy bevel, crunchy artifacts, unrefined sculpt:1.5)",
    "(photoshop bevel and emboss:1.9), (cheap v-carve:1.9), (uniform V-shape depth:1.9), (inner shadow layer style:1.9), (inner stroke:1.9), (fake 2d deboss:1.9), (flat paper with bevel:1.9)",
    "floating FX, background noise, messy glow, overglare, disconnected rim light, floating edge light, artificial halo, separated highlight, (messy edge blending:1.6), detached stroke, (depth of field:1.9), (bokeh:1.9), (background blur:1.9), (lens blur:1.9), out of focus, soft focus, blurred foreground, blurry edges, smudged",
    "(melted shape:1.5), (illegible:1.5), (transparent text blending into background:1.5), (excessive glow destroying shape:1.5), (loss of silhouette:1.5)",
    "(bright side walls:1.5), (overlit extrusion:1.5), (glowing thickness:1.5)",
    "(circular brushing:1.5), (radial metal grain:1.5), (anisotropic reflection:1.5), curved scratches",
  ];
  if (ir.details.rimColorId === "None") negTags.push("(bottom light:1.8), (underglow:1.8), (colored rim light:1.5)");
  if (ir.constraints.extrusionId === "None") {
    posTags.push(`perfectly straight-on front facing view, dead center orthographic layout, strict 2D planar composition, ${FLAT_POSITIVE}`);
    negTags.push("(angled view:1.9), (side view:1.9), (isometric:1.9), (3d perspective:1.9), (tilt:1.9), diagonal, skewed");
    // FLAT_NEGATIVE 는 후면 돌출만 금지 — 전면 볼륨(베벨/엠보싱/조각) 추가도 명시적으로 차단.
    negTags.push("(added bevel:1.7), (new embossed relief:1.7), (deep carving:1.6), (sculpted 3d surface:1.6), (letterpress depth:1.5)");
  } else if (ir.constraints.extrusionId === "Shallow") {
    posTags.push("straight-on front facing view, dead center, very shallow thin 3d extrusion");
    negTags.push("(extreme angled view:1.5), (side view:1.5), tilt");
  } else {
    posTags.push("straight-on front facing view, dead center");
    negTags.push("(extreme angled view:1.5), (side view:1.5), tilt");
  }
  // 메탈 하드서피스 강제는 재질 변경을 명시적으로 켰을 때만 — 평면 유지 모드에서
  // 원본이 부드러운/납작한 스타일이어도 금속 입체로 밀어붙이던 상시 토큰이었음.
  if (ir.intents.material && ir.reliefId !== "ChunkyToy") {
    posTags.push("rigid hard-surface, sharp geometric corners, precise metallic structure");
    negTags.push("(plastic, toy, balloon, inflatable, bubble text, play-doh, soft rounded edges, marshmallow, squishy, 3d render style:1.6), (soft rounded bevels, blunt corners, smooth edges:1.5)");
  }
  if (state.cameraLens === "Telephoto") negTags.push("(wide angle distortion:1.5), (perspective distortion:1.5), fisheye, vanishing point");
  if (ir.reliefId === "MicroBevel" || ir.reliefId === "Flat" || ir.reliefId === "HairlineBevel") negTags.push("(deeply carved:1.5), (heavy embossing:1.5), (intense 3d front:1.5), (deep valleys:1.5), deep chiseled");
  return `${posTags.filter(Boolean).map(t => t.trim()).join(", ")}\n\nNegative prompt: STRICTLY FORBIDDEN — the image must NOT contain any of the following: ${negTags.filter(Boolean).map(t => t.trim()).join(", ")}`;
};

export const compileEditChatGPT = (ir) => {
  if (ir.vfxPassMode) {
    return `Create a Shape-Locked Image-to-Image Remix based on the exact specifications below.

### 1. VFX EXTRACTION PASS (CRITICAL)
- **Type**: Pure flat 2D pitch-black silhouette typography.
- **Vibe**: Technical Matte Pass for VFX Compositing.
- **Rule (ABSOLUTE)**: Render the typography as a pure Vantablack (#000000), completely unlit flat 2D shape. STRICTLY FORBIDDEN: Do NOT add any rim lights, edge highlights, 3D thickness, bevels, or reflections to the letters. ONLY render the glowing FX surrounding this black void.

### 2. Constraints & Integrity
- **Glyph Lock**: ${ir.locks.glyph}
- **Contour Lock**: ${ir.locks.contour}
- **Anti-Mutation**: ${ir.constraints.anti_mutation}

### 3. Edit Scope & VFX
- **Surrounding VFX**: ${ir.details.vfx || "No VFX specified."}
- **FX Containment**: ${ir.constraints.fx_containment}
- **Custom Directive**: ${ir.customIntent}
- **Background**: Maintain ${ir.background}`;
  }
  const intentsArr = [];
  if (ir.details.material) intentsArr.push(`Material Override: ${ir.details.material}`);
  if (ir.details.lighting) intentsArr.push(`Lighting Enhance: ${ir.details.lighting}`);
  if (ir.details.vfx) intentsArr.push(`Contained VFX: ${ir.details.vfx}`);
  let extrConstraint = ir.constraints.extrusion;
  if (ir.constraints.extrusionId === "MINIMAL" || ir.constraints.extrusionId === "None") extrConstraint = "CRITICAL RULE: The typography must remain a perfectly front-facing orthographic silhouette. The outer contour must read as a flat 2D cutout shape. Absolutely no rear extrusion, no visible side planes, and no object thickness. Preserve the original dimensionality of the base image — do NOT add new bevels, embossing, carving or surface relief that the base image does not already have. The camera MUST be positioned perfectly straight-on, dead center. Absolutely NO angled views, NO side views, NO isometric angles.";
  else if (ir.constraints.extrusionId === "Shallow") extrConstraint = "CRITICAL RULE: The typography must have ONLY a very shallow, thin 3D extrusion. Absolutely NO thick heavy 3D blocks. Keep the depth minimal.";
  const lensDirective = `\n- **Lens & Perspective**: ${ir.camera}. CRITICAL: Use infinite depth of field. Every part of the text must be entirely in focus. Absolutely NO background blur, NO bokeh, NO blurry edges.`;
  let antiToyRule = " AVOID decorative filigree, floral patterns, or ornate engravings. Ensure high legibility and perfectly intact silhouette. Do NOT melt the shape.";
  // 메탈 하드서피스 강제는 재질 변경 의도가 켜졌을 때만 (평면 원본 입체화 방지).
  if (ir.intents.material && ir.reliefId !== "ChunkyToy") antiToyRule += " The object must have a rigid hard-surface with sharp metallic corners. It MUST NOT look like a plastic toy, a balloon, soft rounded bevels, or an inflatable bubble text.";
  // 라이팅/재질 의도가 없으면 새 림라이트·스펙큘러·드라마틱 셰도우를 추가하지 않도록.
  const opticalRule = (ir.intents.material || ir.intents.lighting)
    ? "Edge highlights and rim lights MUST be physically integrated into the surface. Strictly NO floating glow, detached halos, or separated stroke lines. Ensure a clearly lit and well-exposed subject. Deep controlled shadows, clean high-value highlights, strong material contrast. Avoid unnatural or uniform glowing borders."
    : "Preserve the original lighting and shading style of the base image. Do NOT add new rim lights, edge highlights, specular effects or dramatic shadows that the base image does not already have.";
  return `Create a Shape-Locked Image-to-Image Remix based on the exact specifications below.

### 1. Structure Lock (CRITICAL)
- **Reference**: Use the input image as the exact structural reference.
- **Glyph Lock**: ${ir.locks.glyph}
- **Contour Lock**: ${ir.locks.contour}
- **Stroke Lock**: ${ir.locks.stroke}
- **Budget Level**: ${ir.budget.name}

### 2. Constraints & Integrity
- **Anti-Mutation**: ${ir.constraints.anti_mutation}
- **Material Integration**: ${ir.constraints.material_integration} Must look highly organic, authentic, and photorealistic (PBR). STRICTLY AVOID cheap plastic, fake gold foil, or tacky over-shiny CGI look. Ensure extreme sharpness and intricate micro-details on the facets. STRICTLY FORBIDDEN: Do NOT use cheap photoshop bevel and emboss effects, and avoid uniform V-shaped carving. AVOID fake inner shadow or inner stroke layer styles.${antiToyRule} Ensure straight linear brushed lines, NO circular brushing.
- **Optical Integration**: ${opticalRule}
- **Color Grading**: Rich, naturally saturated colors with controlled highlights — avoid washed-out dullness, but EQUALLY avoid oversaturated neon harshness or blown-out contrast. Preserve the base image's original color mood. (Note: this model tends to over-boost saturation — keep it restrained.)
- **FX Containment**: ${ir.constraints.fx_containment}
- **Depth/Extrusion**: ${extrConstraint}${lensDirective} Ensure side planes (thickness) fall into deep shadow and do NOT glow brightly.

### 3. Edit Scope & Intents
- **Target Changes**: \n  - ${intentsArr.length > 0 ? intentsArr.join("\n  - ") : "Subtle Polish"}
- **Custom Directive**: ${ir.customIntent}
- **Background**: Maintain ${ir.background}. CRITICAL: The text must be an isolated, standalone graphic. Do NOT engrave the text onto a solid metal wall, plaque, or background plate. The background must remain a separate, simple canvas behind the text cutout.

*Ensure the output preserves 95%+ of the original core morphology while only swapping the outer aesthetic layers. Do not use cheap uniform 2D strokes or photoshop bevel effects.*`;
};

export const compileEditMidjourney = (ir, state) => {
  if (ir.vfxPassMode) {
    const subject = `pure pitch-black silhouette typography, holdout matte pass`;
    const lightingFx = `${ir.details.vfx || ""}, ${ir.background}`;
    const mjNegatives = "--no rim light, edge light, edge highlight, 3d, bevel, thickness, extrusion, metallic, reflections, lit text, text texture, outline, border, floating effects, background clutter, text mutation ";
    return `/imagine prompt: ${subject}, completely unlit black hole material, zero reflections, zero highlights, ${lightingFx} ${mjNegatives}--style raw --v 6.1`.replace(/\s+/g, ' ').replace(/, ,/g, ',');
  }
  const intentsArr = [];
  if (ir.details.material) intentsArr.push(`material shift to ${ir.details.material}`);
  if (ir.details.lighting) intentsArr.push(`lighting tune: ${ir.details.lighting}`);
  if (ir.details.vfx) intentsArr.push(`surface VFX: ${ir.details.vfx}`);
  const editMjTone = getTone(ir._meta?.persona?.id);
  let subject = `${editMjTone.subjectKind} remix, isolated standalone typography graphic, strict shape lock, exact silhouette preservation, Use the input image as the exact structural reference, highly legible, infinite depth of field, entirely in focus, crisp and clear entire frame, ${ir.camera}, ${ir.budget.en}`;
  const scope = intentsArr.length > 0 ? intentsArr.join(", ") : "surface polish";
  const custom = ir.customIntent !== "subtle surface enhancement" ? `, ${ir.customIntent}` : "";
  // 스펙큘러·드라마틱 셰도우 푸시는 재질/라이팅 의도가 켜졌을 때만 (평면 원본 입체화 방지).
  const mjOptical = (ir.intents.material || ir.intents.lighting)
    ? ", physically attached specular highlights, deep controlled shadows, clean high-value highlights, strong material contrast"
    : ", preserve the original lighting and shading style of the base image";
  const constraints = `${ir.constraints.extrusion}, ${ir.constraints.material_integration}, ${ir.constraints.fx_containment}${mjOptical}, highly saturated, punchy vibrant colors`;
  let mjNegatives = "--no background plate, plaque, signboard, engraved on a wall, solid metal block background, text mutation, shape drift, stroke swell, floating FX, background noise, material sticker, extra letters, duplicated text, repeated title, text rendered twice, runes, hieroglyphs, symbols, written text on surface, watermark, gibberish, merged letters, illegible blob, melted together, filigree, floral patterns, decorative ornaments, ornate engravings, uniform stroke, photoshop bevel and emboss, cheap v-carve, wordart, disconnected rim light, floating edge light, artificial halo, separated highlight, dull gray midtones, framed, box around text, shield, emblem, baseplate, drop shadow, cast shadow revealing thickness, inner shadow layer style, inner stroke, fake 2d deboss, flat paper with bevel, washed out, desaturated, faded, unnatural outline, glowing border, depth of field, bokeh, background blur, lens blur, out of focus, soft focus, blurred foreground, blurry edges, smudged, melted shape, illegible, transparent text blending into background, excessive glow destroying shape, loss of silhouette, bright side walls, overlit extrusion, glowing thickness, washed out sides, circular brushing, radial metal grain, anisotropic reflection, curved scratches, ";
  if (ir.constraints.extrusionId === "None" || ir.constraints.extrusionId === "MINIMAL") {
    subject += `, perfectly straight-on front facing view, dead center orthographic layout, 2D flat composition, ${FLAT_POSITIVE}`;
    mjNegatives += `angled view, side view, isometric, 3d perspective, tilt, diagonal, skewed, ${FLAT_MJ_NEGATIVE}, `;
  } else if (ir.constraints.extrusionId === "Shallow") {
    subject += ", straight-on front facing view, dead center, very shallow thin 3d extrusion";
    mjNegatives += "extreme angled view, side view, tilt, heavy 3d block, massive depth, thick extrusion, deep rear extrusion, ";
  } else {
    subject += ", straight-on front facing view, dead center";
    mjNegatives += "extreme angled view, side view, tilt, ";
  }
  // 평면 유지 모드(후면 돌출 None)에선 드라마틱 라이팅·측면 셰도우 대신 원본 차원감 보존.
  let lightingFx = (ir.constraints.extrusionId === "None" || ir.constraints.extrusionId === "MINIMAL")
    ? "flat graphic front-face rendering, preserve the original dimensionality and shading style of the base image, no added bevel or embossing"
    : "dramatic directional lighting, clearly lit front face, dark shadowed side walls, deep ambient occlusion on extrusion";
  if (ir.intents.material && ir.reliefId !== "ChunkyToy") {
    lightingFx += ", rigid hard-surface, sharp geometric corners, precise metallic structure";
    mjNegatives += "plastic, toy, balloon, inflatable, bubble text, play-doh, soft rounded edges, marshmallow, squishy, 3d render style, soft rounded bevels, blunt corners, smooth edges, ";
  }
  if (state.cameraLens === "Telephoto") mjNegatives += "wide angle distortion, perspective distortion, fisheye, vanishing point ";
  if (ir.reliefId === "MicroBevel" || ir.reliefId === "HairlineBevel" || ir.reliefId === "Flat") mjNegatives += "deeply carved, heavy embossing, intense 3d front, deep valleys, deep chiseled ";
  const mj_iw = ir.budget.id === "Locked" ? "--iw 2.0" : ir.budget.id === "Conservative" ? "--iw 1.5" : ir.budget.id === "Balanced" ? "--iw 1.0" : "--iw 0.5";
  return `/imagine prompt: ${subject}, applied ${scope}${custom}, ${constraints}, ${lightingFx}, background ${ir.background} ${mjNegatives}${mj_iw} --style raw --v 6.1`.replace(/\s+/g, ' ');
};

// ============================================================
// Motion compilers
// ============================================================
export const compileRunway = (ir) => {
  const isStatic = ir.motion.camera.includes("ZERO zoom");
  const staticRule = isStatic ? "NO ZOOM IN. NO ZOOM OUT. NO CAMERA MOVEMENT. STRICTLY STATIC CAMERA. FIXED SCALE." : "";
  const fxRule = ir.energyCore !== "no surrounding FX" ? `${ir.energyCore}, highly controlled, strictly confined to the text area, pure black background must remain clean and unaffected by global color washes` : "None";
  const posTags = [`Camera: ${ir.motion.camera}`, staticRule, `Dynamics: ${ir.motion.dynamics}`, `VFX: ${fxRule}`, ir.customIntent, ir.subject_lock, "Do not deform. Maintain perfectly crisp edges. Do NOT fill the entire screen with effects."].filter(Boolean).join(". ");
  return posTags;
};

export const compileLuma = (ir) => {
  const isStatic = ir.motion.camera.includes("ZERO zoom");
  const staticRule = isStatic ? "Strictly NO camera movement, NO zoom in, NO zoom out. The camera is locked." : "";
  const fxRule = ir.energyCore !== "no surrounding FX" ? `${ir.energyCore} effect, keeping the glow subtle, strictly confined to the letters, background must remain pure black, do NOT apply a full-screen gold filter` : "No FX";
  return `Cinematic motion, ${ir.motion.camera}. ${staticRule} Dynamics: ${ir.motion.dynamics}. VFX: ${fxRule}. ${ir.customIntent}. Keep the text absolutely solid and static, NO morphing, NO warping of the typography. Maintain perfectly crisp edges. Effects must not overwhelm the entire screen.`;
};

export const compileSequence = (ir) =>
  `// AE / Web Sequence Compositing Guide
// 1. Export Matte Pass from Creation Tab (VFX Source Extraction Mode)
// 2. Import into After Effects / WebGL Canvas
// 3. Blend Mode: Screen or Linear Dodge (Add)
// 4. Camera Dynamics: ${ir.motion.camera}
// 5. Particle/FX Behavior: ${ir.motion.dynamics} (${ir.energyCore})
// CRITICAL: To achieve a perfect seamless loop for web, ensure particle lifespans match the composition duration exactly.`;

export const compileVeo = (ir) => {
  const isStatic = ir.motion.camera.includes("ZERO zoom");
  const staticRule = isStatic ? "ABSOLUTE CAMERA LOCK: The camera MUST NOT zoom out, MUST NOT zoom in, pan, or move. The text scale and position must remain perfectly fixed throughout the video." : "";
  const fxRule = ir.energyCore !== "no surrounding FX" ? `with ${ir.energyCore}` : "";
  const motionTone = getTone(ir._meta?.persona?.id);
  return `Create a ${motionTone.motionKind} of an isolated standalone typography graphic on a pure black background.
Camera Motion: ${ir.motion.camera}
Dynamics: ${ir.motion.dynamics} ${fxRule}
${ir.customIntent ? `Action: ${ir.customIntent}` : ""}

CRITICAL RULE: ${ir.subject_lock} Do not allow the text to distort or melt. Maintain perfectly crisp edges.
FX CONTAINMENT: Visual effects MUST be highly controlled and strictly confined to the text surface and immediate edges. Do NOT let effects fill the entire screen. The background MUST remain a pure, unaffected black void. NO global color washes or full-screen filters.
${staticRule}`;
};
