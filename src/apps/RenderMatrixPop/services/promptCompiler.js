// Pop 의 IR 빌더 + 모델별 prompt 컴파일 + 룰 검증/품질 점수 (v20.6.1).
// RenderMatrix 와의 핵심 차이:
//   - anti_engraving 강조 (스톤/금속이면 monolith 회피)
//   - casualReliefs (ChunkyToy/SoftRounded/PuffyBalloon) 분기 — 토이/풍선 미학
//   - Chameleon persona → 1:1 카피 모드
//   - SilhouetteTrace/StyleTransfer budget — 새 모드 2종
//   - persona safe access (`?.`) — Chameleon 등 일부 페르소나가 mj_tags 없을 수 있음
//
// motion 컴파일러(Veo/Runway/Luma/Sequence)와 getQualityFeedback 은 RenderMatrix 와 100% 동일.

import { DIRECTOR_PERSONAS, EDIT_BUDGETS, RENDER_ENGINES } from "../constants/presets";
import { getOptionEn } from "../constants/presets";

export { compileVeo, compileRunway, compileLuma, compileSequence, getQualityFeedback } from "../../RenderMatrix/services/promptCompiler";

const CASUAL_RELIEFS = ["ChunkyToy", "SoftRounded", "PuffyBalloon"];
const HEAVY_MATERIALS = ["RoughStone", "VolcanicRock", "Obsidian", "GothicSteel", "AntiqueGold"];

// ============================================================
// IR Builders
// ============================================================
export const generateIR = (state, appOptions) => {
  const { directorPersona, complexity, typographyScale, cameraLens, frontRelief, projectionDepth, surfaceTreatment, energyCore, material, materialInt, dramaticTex, wearLevel, rimMaterial, rimThickness, rimColor, rimIntensity, enableGlint, background, renderEngine, userIntent, fxOrigin, fxIntensity, surfaceDetail, vfxPassMode, enableVfx, enableShadow } = state;
  const activeEnergyCore = enableVfx ? (energyCore === "None" ? "GoldenDust" : energyCore) : "None";
  const activeBackground = enableVfx
    ? "pitch black textured slate backdrop, extremely dark moody cinematic vignette, deep dark void, pure deep black presentation canvas highlighting the glowing effects"
    : getOptionEn(appOptions.backgrounds, background);
  const ir = {
    _meta: { version: "20.6.1", persona: DIRECTOR_PERSONAS.find(p => p.id === directorPersona), complexityLevel: complexity },
    subject: { type: "typography graphic", scale: getOptionEn(appOptions.typographyScales, typographyScale), fidelity_enforcement: "CRITICAL: Ensure the typography consists of individual, independent cutout letters. It MUST NOT be engraved, etched, or carved into a background plate, stone slab, or wall. EXACT ORIGINAL SILHOUETTE. NO TEXT MUTATION. NO extra letters. Ensure high legibility.", intent: userIntent || null },
    camera_and_depth: { projectionId: projectionDepth, projection: getOptionEn(appOptions.projectionDepths, projectionDepth), isMinimal: projectionDepth === "None", lens: getOptionEn(appOptions.cameraLenses, cameraLens) },
    surface_morphology: { reliefId: frontRelief, relief: getOptionEn(appOptions.frontReliefs, frontRelief), treatment: getOptionEn(appOptions.surfaceTreatments, surfaceTreatment), wear: getOptionEn(appOptions.wearLevels, wearLevel) },
    material_stack: { baseId: material, base: getOptionEn(appOptions.materials, material), intensity: getOptionEn(appOptions.intensities, materialInt), internal_texture: dramaticTex === "Auto" ? "organically embedded dynamic textures" : getOptionEn(appOptions.dramaticTextures, dramaticTex), surface_detail: getOptionEn(appOptions.surfaceDetails, surfaceDetail), integration_rule: "Textures MUST be physically carved or etched INTO the base material. NO floating decals." },
    edge_and_lighting: {
      outline: rimThickness === "None" ? "strictly borderless, seamless organic edges, no outline" : `${getOptionEn(appOptions.rimThicknesses, rimThickness)} using ${getOptionEn(appOptions.materials, rimMaterial)}`,
      rim_light: rimColor === "None" ? "no artificial rim light" : `${getOptionEn(appOptions.rimIntensities, rimIntensity)} ${getOptionEn(appOptions.rimColors, rimColor)} ambient rim light organically wrapping the 3D surface edges, NOT a uniform line`,
      rimColorId: rimColor,
      glint: enableGlint ? "sharp intense specular highlights mapped dynamically to the uneven surface" : "smooth balanced lighting without sharp glares",
      shadow: enableShadow,
    },
    fx: { core: getOptionEn(appOptions.energyCores, activeEnergyCore), origin: getOptionEn(appOptions.fxOrigins, fxOrigin), intensity: getOptionEn(appOptions.fxIntensities, fxIntensity), containment_rule: activeEnergyCore === "None" ? "No FX." : `Ensure FX is ${getOptionEn(appOptions.fxIntensities, fxIntensity)} and ${getOptionEn(appOptions.fxOrigins, fxOrigin)}. It MUST NOT overpower the main shape.` },
    environment: { background: activeBackground, engine: RENDER_ENGINES.find(e => e.id === renderEngine)?.en || RENDER_ENGINES[0].en },
    vfxPassMode,
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
  const { editBudget, activeEditIntents, cameraLens, frontRelief, editBg, editRearExtrusion, editIntent, editVfxPassMode, editMaterial, editWearLevel, editRimColor, editRimIntensity, editEnergyCore, editFxOrigin, editFxIntensity } = state;
  const budgetLevel = EDIT_BUDGETS.find(b => b.id === editBudget);
  const isTransferOrTrace = budgetLevel.id === "StyleTransfer" || budgetLevel.id === "SilhouetteTrace";
  const ir = {
    _meta: { mode: "Micro-Edit", version: "20.6.1" },
    locks: { glyph: "Strictly lock exact character types, sequence, and spacing.", contour: "Preserve original outer silhouette perfectly.", stroke: "Maintain exact stroke thickness and internal counter spaces." },
    budget: budgetLevel,
    camera: getOptionEn(appOptions.cameraLenses, cameraLens),
    reliefId: frontRelief,
    constraints: {
      anti_mutation: "Do NOT reinterpret letters, do NOT add new text or watermarks.",
      anti_engraving: "CRITICAL: The text MUST be an isolated, individual cutout shape. It MUST NOT be engraved, embossed, or carved into a background plate, stone slab, or solid wall. Each letter must have its own independent 3D shape.",
      fx_containment: "All FX MUST originate from surface cracks/edges and remain tightly bound to the shape. NO floating particles.",
      material_integration: "All textures/FX MUST be physically embedded into the base material. NO floating decals.",
      extrusionId: editRearExtrusion,
      extrusion: editRearExtrusion === "None" ? `[PROJECTION: MINIMAL] solid structural body with minimal side thickness, NO deep rear extrusion, NO heavy 3D block.` : editRearExtrusion === "Shallow" ? "Allow ONLY very shallow thin backward 3D extrusion. NO thick blocks." : "Allow controlled backward 3D extrusion.",
    },
    intents: activeEditIntents,
    details: {
      material: (activeEditIntents.material || isTransferOrTrace) ? `${getOptionEn(appOptions.materials, editMaterial)}, ${getOptionEn(appOptions.wearLevels, editWearLevel)}` : null,
      lighting: (activeEditIntents.lighting || isTransferOrTrace) ? `${getOptionEn(appOptions.rimIntensities, editRimIntensity)} ${getOptionEn(appOptions.rimColors, editRimColor)} rim light organically wrapping the edges, NOT a uniform line` : null,
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
  const { cameraMotion, vfxDynamics, motionIntent, energyCore } = state;
  return {
    _meta: { mode: "Video-Motion", version: "20.6.1" },
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
    if (persona?.auditRules?.maxFx === "None" && state.enableVfx) {
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
    else if (state.editBudget === "Locked" || state.editBudget === "StyleTransfer" || state.editBudget === "SilhouetteTrace") structure = 100;
    if (state.activeEditIntents.material || state.editBudget === "StyleTransfer") material = 95;
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

// ============================================================
// Creation compilers (Editor view)
// ============================================================
const frontVolumeModifierFor = (reliefId) => {
  if (reliefId === "Flat") return "strictly flat front core without deep carving";
  if (reliefId === "MicroBevel") return "maintaining a flat core with only subtle edge bevels, NO deep carving";
  if (reliefId === "HairlineBevel") return "featuring a flat front with microscopic razor-thin edges";
  if (reliefId === "MicroChiseled") return "featuring densely micro-chiseled intricate cuts on the surface";
  if (reliefId === "EdgelessConcave") return "featuring a continuous edge-to-edge concave hollow without any outer borders";
  return "with balanced front volume";
};

export const compileNanoBanana = (ir, state) => {
  const isVFXPass = state.vfxPassMode || ir.vfxPassMode;
  const fxTag = ir.fx ? (ir.fx.core !== "no surrounding FX" ? `${ir.fx.intensity} ${ir.fx.core} ${ir.fx.origin}` : "") : "";
  if (isVFXPass) {
    const posTags = ["masterpiece, best quality, ultra highres, 8k resolution", "pure pitch-black silhouette typography, absolute flat 2d cutout, holdout matte pass, vantablack text, completely unlit, pure #000000 shape", ir.subject.fidelity_enforcement.replace("CRITICAL: ", ""), fxTag, ir.environment.background, ir.environment.engine, ir.subject.intent].filter(Boolean).map(t => t.trim()).join(", ");
    const negTags = ["(worst quality, low quality:1.4), text mutation, extra letters, hallucinated text", "(rim light:1.8), (edge highlight:1.8), (glowing edge:1.8), (3d:1.8), (thickness:1.8), (extrusion:1.8), (bevel:1.8), (metallic:1.8), (reflections:1.8), (lighting on text:1.8), (3d block:1.8)", "lit text, text texture, outline, border, drop shadow, inner glow, lens flare"].filter(Boolean).map(t => t.trim()).join(", ");
    return `${posTags}\n\nNegative prompt: ${negTags}`;
  }
  const fvm = frontVolumeModifierFor(ir.surface_morphology.reliefId);
  // 2D 평면 모드 — frontRelief=Flat + projectionDepth=None 이면 입체 묘사 전부 차단.
  // 카멜레온(레퍼런스 복사) 모드에서 2D 그래픽 레퍼런스가 와도 결과가 무조건 3D 입체로 가는 문제 해결.
  const isFlat2D = ir.surface_morphology.reliefId === "Flat" && ir.camera_and_depth.isMinimal;
  const projectionDesc = isFlat2D
    ? `It is a strictly flat 2D graphic with NO 3D extrusion, NO bevel, NO side thickness, NO depth. The letters lie flat on the canvas like a screen-print, poster art, or distressed paint graphic. All character is in the surface treatment (paint, grunge, distressed texture) — not in carved geometry.`
    : ir.camera_and_depth.isMinimal
      ? `It is presented as a solid structural body with minimal side thickness. Absolutely no rear extrusion, BUT ${fvm}.`
      : "It is presented with 3D depth and extrusion.";
  const proseLead = isFlat2D
    ? `A flat 2D typography graphic rendered in a ${ir._meta.persona?.name?.split(' ')[1] || 'custom'} style.`
    : `An epic cinematic typography graphic rendered in a ${ir._meta.persona?.name?.split(' ')[1] || 'custom'} style.`;
  const prose = `${proseLead} ${ir.subject.scale}. ${ir.camera_and_depth.lens}. The text is crafted from ${ir.material_stack.base} featuring ${ir.material_stack.internal_texture}. ${projectionDesc}`;
  const posTags = [
    prose,
    "masterpiece, best quality, ultra highres, insanely detailed, 8k resolution",
    isFlat2D
      ? "isolated standalone flat 2D typography graphic, individual flat letters with NO thickness, clear cutout text shape against background, highly legible, strict 2D planar composition, sticker-flat silhouette"
      : "isolated standalone typography graphic, individual independent 3D letters, clear cutout text shape against background, highly legible",
    "infinite depth of field, entirely in focus, edge-to-edge sharp focus, zero background blur, crisp and clear entire frame",
    // 입체감 강제 태그는 3D 모드에서만.
    isFlat2D ? "" : "deep shadowed side walls, dark unlit extrusion, heavy ambient occlusion on thickness",
    // 2D 평면 강조 태그 — distressed/screen-print 표현 강제.
    isFlat2D ? "flat 2D screen-print aesthetic, distressed grunge surface treatment, poster art style, painterly texture inside flat shapes, zero rear extrusion, zero side wall, zero bevel, zero embossing, pure flat silhouette letters" : "",
    ir.subject.fidelity_enforcement.replace("CRITICAL: ", ""),
    ir._meta.persona?.mj_tags?.split(" --no ")[0] || "",
    ir.environment.background,
    // engine 은 3D 모드에서만. 2D 모드는 graphic design 으로.
    isFlat2D ? "2D graphic design, illustration, poster art, NOT a 3D render engine" : ir.environment.engine,
    ir.subject.intent,
  ];
  if (ir.edge_and_lighting.shadow && !isFlat2D) posTags.push("grounded with realistic drop shadow, soft cast shadow on backdrop, deep contact shadow anchoring the text");
  const negTags = [
    "(worst quality, low quality:1.4), text mutation, extra letters, hallucinated text, floating decal",
    "(runes, hieroglyphs, symbols, written text on surface, watermark, gibberish:1.6), (merged letters, illegible blob, melted together, fused typography:1.5)",
    "(background plate:2.0), (plaque:2.0), (signboard:2.0), (engraved on a wall:2.0), (solid metal block background:2.0), (stone slab:2.0), (monolith:2.0), (carved into stone:2.0), (text etched into wall:2.0), (framed:1.8), (box around text:1.8), text engraved on surface, shield, baseplate, mounted metal plate, flat paper cutout, flat 2d sticker, dull shading, vector graphic",
    "(uniform stroke:1.9), (even border thickness:1.9), (artificial outline:1.9), cheap 3d effect, wordart, 2d border, badge, distorted stroke proportions, altered spacing, (low poly, jagged edges, messy bevel, crunchy artifacts, unrefined sculpt:1.5)",
    "(photoshop bevel and emboss:1.9), (cheap v-carve:1.9), (uniform V-shape depth:1.9), (inner shadow layer style:1.9), (inner stroke:1.9), (fake 2d deboss:1.9), (flat paper with bevel:1.9)",
    "disconnected rim light, floating edge light, artificial halo, separated highlight, (messy edge blending:1.6), detached stroke",
    "(bright side walls:1.5), (overlit extrusion:1.5), (glowing thickness:1.5), washed out sides",
    "messy glow, background clutter",
    "(depth of field:1.9), (bokeh:1.9), (background blur:1.9), (lens blur:1.9), out of focus, soft focus, blurred foreground, blurry edges, smudged",
    "(melted shape:1.5), (illegible:1.5), (transparent text blending into background:1.5), (excessive glow destroying shape:1.5), (loss of silhouette:1.5)",
    "(circular brushing:1.5), (radial metal grain:1.5), (anisotropic reflection:1.5), curved scratches",
    ir.camera_and_depth.isMinimal ? "(heavy 3d block:1.8), (deep rear extrusion:1.8), (massive depth:1.8), visible side walls, tilt" : ir.camera_and_depth.projectionId === "Shallow" ? "(thick extrusion:1.8), (heavy 3d block:1.8), (massive depth:1.8), (deep rear extrusion:1.8)" : "",
  ];
  if (ir.edge_and_lighting.rimColorId === "None") negTags.push("(bottom light:1.8), (underglow:1.8), (colored rim light:1.5), bright glow from below");
  if (!ir.edge_and_lighting.shadow) {
    posTags.push("floating perfectly without floor shadows");
    negTags.push("(drop shadow:1.9), (cast shadow:1.9), (contact shadow:1.9), floating shadow, drop shadow on background");
  }
  if (ir.camera_and_depth.isMinimal) {
    posTags.push("perfectly straight-on front facing view, dead center orthographic layout, strict 2D planar composition");
    negTags.push("(angled view:1.9), (side view:1.9), (isometric:1.9), (3d perspective:1.9), (tilt:1.9), diagonal, skewed");
  } else if (ir.camera_and_depth.projectionId === "Shallow") {
    posTags.push("straight-on front facing view, dead center, very shallow thin 3d extrusion");
    negTags.push("(extreme angled view:1.5), (side view:1.5), tilt");
  } else {
    posTags.push("straight-on front facing view, dead center");
    negTags.push("(extreme angled view:1.5), (side view:1.5), tilt");
  }
  if (state.currentView === 'editor' && !state.enableVfx) {
    negTags.push("(particle effects:1.9), (floating dust:1.9), (magic sparkles:1.9), (glowing embers:1.9), (smoke:1.9), (fog:1.9), (mist:1.9), (lens flare:1.9), (bloom:1.9), light leaks, fire, flames, glowing background");
  }
  if (ir._meta.persona?.id === "Chameleon") {
    posTags.push("exactly mimic the lighting and material of the reference, 1:1 precise style copy, highly faithful replication");
  }
  const isCasualRelief = CASUAL_RELIEFS.includes(ir.surface_morphology.reliefId);
  // 2D 평면 모드에서는 hard-surface/금속 구조 강조를 빼고 평면 페인트 가정으로 대체.
  if (isFlat2D) {
    posTags.push("flat painted shapes, distressed brush-stroke surface, grunge ink texture inside the flat silhouette, no carved geometry");
    negTags.push("(rigid hard-surface:1.7), (precise metallic structure:1.7), (plastic, toy, balloon, inflatable, bubble text:1.4)");
  } else if (!isCasualRelief) {
    posTags.push("rigid hard-surface, sharp geometric corners, precise metallic structure");
    negTags.push("(plastic, toy, balloon, inflatable, bubble text, play-doh, soft rounded edges, marshmallow, squishy, 3d render style:1.6), (soft rounded bevels, blunt corners, smooth edges:1.5)");
    negTags.push("(filigree, floral patterns, decorative ornaments, ornate engravings:1.5)");
  } else {
    posTags.push("soft rounded edges, smooth playful design, delightful aesthetic, soft curves");
    negTags.push("(sharp edges:1.5), (dangerous:1.5), (aggressive geometric cuts:1.5), dark fantasy, gritty, grunge, battle damage");
  }
  if (HEAVY_MATERIALS.includes(ir.material_stack.baseId)) {
    posTags.push("CRITICAL: MUST BE INDIVIDUAL CUTOUT LETTERS ONLY, NO BACKGROUND SLAB");
    negTags.push("(massive stone slab:2.0), (engraved into rock:2.0), (carved monolith:2.0), (background stone wall:2.0), (text carved into a solid block:2.0)");
  }
  if (["MicroBevel", "HairlineBevel", "Flat"].includes(ir.surface_morphology.reliefId)) {
    negTags.push("(deeply carved:1.5), (heavy embossing:1.5), (intense 3d front:1.5), (deep valleys:1.5), deep chiseled");
  }
  if (state.cameraLens === "Telephoto") negTags.push("(wide angle distortion:1.5), (perspective distortion:1.5), fisheye, vanishing point");
  if (state.typographyScale === "Dense") {
    posTags.push("clean legible typography, simplified readable shapes");
    negTags.push("(excessive noise, cluttered details, unreadable, chaotic textures:1.5)");
  }
  // 카멜레온(1:1 복사) 모드에서는 채도 강제 push 가 레퍼런스 색감과 충돌 — 단색 레퍼런스가 무지개로 변함.
  // 카멜레온일 때는 레퍼런스 팔레트 보존을 우선시. 그 외에는 기존 강한 색감 push.
  const isChameleon = ir._meta.persona?.id === "Chameleon";
  if (isChameleon) {
    posTags.push("preserve the exact color palette from the reference image, maintain the reference's exact hue and saturation, 1:1 color matching, single-tone color fidelity if the reference is monochrome");
    negTags.push("(multi-color rainbow palette:2.0), (polychrome:2.0), (rainbow colors:1.9), (multi-hue gradient:1.8), (over-saturation:1.6), (color shifting:1.6), (introducing new colors not in the reference:1.8)");
  } else {
    posTags.push("highly saturated, punchy vibrant colors, rich deep colors");
    if (!isFlat2D) posTags.push("cinematic color grading");
    negTags.push("(washed out:1.5), (desaturated:1.5), (dull colors:1.5), faded, grayscale, (dark, underexposed, gloomy:1.5)");
  }
  // 입체 라이팅/PBR 묘사는 3D 모드에서만. 2D 모드는 그래픽 디자인용 균일 라이팅으로.
  if (isFlat2D) {
    posTags.push("uniform graphic lighting suitable for flat 2D poster, even illumination across the flat silhouette, NO volumetric lighting, NO specular highlights on side walls (there are no side walls), preserve clean silhouette edges, flawless silhouette boundary, surface treatment lives only inside the flat shape, clean and readable typography");
  } else {
    posTags.push("dramatic directional lighting, clearly lit front face, side thickness falls into deep shadow, preserve clean silhouette edges, flawless silhouette boundary, surface detail must not distort the outer contour, damage stays inside the front face only, clean and readable typography, rich luminous midtones, elegant material finish, crisp specular highlights on edges, high-end PBR shading, strong material contrast");
  }
  posTags.push(ir.surface_morphology.relief, ir.surface_morphology.wear !== "factory-new flawless state" ? ir.surface_morphology.wear : "");
  // rim_light/glint 와 "texture physically embedded into material" 은 3D 가정 — 2D 모드에서는 제외.
  if (isFlat2D) {
    posTags.push("painterly grunge texture printed onto the flat letter shape, distressed surface treatment");
  } else {
    posTags.push(ir.edge_and_lighting.rim_light, ir.edge_and_lighting.glint, "texture physically embedded into material");
  }
  if (fxTag) posTags.push(fxTag);
  if (state.surfaceDetail === "Clean") negTags.push("scratches, grunge, noise, dents, dust, imperfections, distressed surface");
  // 2D 평면 모드에서 3D 입체 신호를 강제로 차단 — 카멜레온 복사 모드의 평면 레퍼런스가 입체로 가는 것 방지.
  if (isFlat2D) {
    negTags.push("(3D extrusion:2.0), (rear extrusion:2.0), (side walls:2.0), (thickness:2.0), (depth:1.9), (bevel:2.0), (embossing:1.9), (chiseled:1.9), (carved:1.9), (relief:1.9), (sculpted volume:1.9), (3D render:1.7), (cinematic 3D:1.7), (AAA game logo:1.7), (PBR shading:1.7), (rim light wrapping around volume:1.5), (drop shadow:1.7), (cast shadow:1.7), (ambient occlusion:1.7), (specular highlight on side walls:1.8)");
  }
  return `${posTags.filter(Boolean).map(t => t.trim()).join(", ")}\n\nNegative prompt: ${negTags.filter(Boolean).map(t => t.trim()).join(", ")}`;
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
- **Rule (ABSOLUTE)**: Render the typography as a pure Vantablack (#000000), completely unlit flat 2D shape. STRICTLY FORBIDDEN: Do NOT add any rim lights, edge highlights, 3D thickness, bevels, or reflections to the letters. The text itself must be an invisible black hole. ONLY render the glowing FX surrounding this black void.

### 2. Surrounding VFX
- **FX Type**: ${ir.fx.core !== "no surrounding FX" ? `${ir.fx.intensity} ${ir.fx.core}. Origin: ${ir.fx.origin}.` : "No surrounding FX."}
- **Rule**: ${ir.fx.containment_rule}

### 3. Environment
- **Canvas**: ${ir.environment.background}
- **Render Engine**: ${ir.environment.engine}`;
  }
  if (ir.camera_and_depth.isMinimal) depthStr = `CRITICAL RULE: The typography must remain a perfectly front-facing orthographic silhouette. The outer contour must read as a flat 2D cutout shape. Absolutely no rear extrusion, no visible side planes, and no object thickness. All dimensionality must exist only inside the front face as surface relief and shading. The camera MUST be positioned perfectly straight-on, dead center. Absolutely NO angled views, NO side views, NO isometric angles.`;
  else if (ir.camera_and_depth.projectionId === "Shallow") depthStr = `CRITICAL RULE: The typography must have ONLY a very shallow, thin 3D extrusion. Absolutely NO thick heavy 3D blocks. Keep the depth minimal.`;
  const lensDirective = `\n- **Lens & Perspective**: ${ir.camera_and_depth.lens}. CRITICAL: Use infinite depth of field. Every part of the text must be entirely in focus. Absolutely NO background blur, NO bokeh, NO blurry edges.`;
  let materialRule = ir.material_stack.integration_rule + " Must look highly organic, authentic, and photorealistic (PBR). Ensure extreme sharpness and elegant details. The surface must not look blurry or low-resolution. STRICTLY FORBIDDEN: Do NOT use cheap photoshop bevel and emboss effects, and avoid uniform V-shaped carving. Do NOT use fake inner shadow or inner stroke layer styles.";
  materialRule += " CRITICAL: The typography MUST consist of individual cutout letters. It MUST NOT be engraved, etched, or carved into a background plate or stone slab.";
  materialRule += " CRITICAL: Do NOT let transparent ice blend into the background. Do NOT let glowing lava melt or break the shape. High legibility is mandatory. Ensure strictly linear brushed patterns if brushed metal is used, NO circular or radial grain.";
  if (ir._meta.persona?.id === "Chameleon") {
    materialRule += " UNIVERSAL COPY RULE: Disregard inherent genre biases. You MUST PERFECTLY COPY AND REPLICATE the material, texture, lighting, and general aesthetic vibe from the provided reference or intent.";
  }
  const isCasualRelief = CASUAL_RELIEFS.includes(ir.surface_morphology.reliefId);
  if (!isCasualRelief) {
    materialRule += " AVOID decorative filigree, floral patterns, or ornate engravings. The object must have a rigid hard-surface with sharp metallic corners. It MUST NOT look like a plastic toy, a balloon, soft rounded bevels, or an inflatable bubble text.";
  } else {
    materialRule += " The object should embrace soft, rounded, playful aesthetic without sharp, dangerous geometric corners. Emphasize delightful toy-like or inflatable volumes if applicable.";
  }
  if (HEAVY_MATERIALS.includes(ir.material_stack.baseId)) {
    materialRule += " CRITICAL WARNING: Because the material is stone/rock/metal, you MUST NOT render a massive stone background or a monolith. The letters MUST float individually without being carved into a wall.";
  }
  if (state.surfaceDetail === "Clean") materialRule += " Ensure the surface is perfectly smooth and clean, absolutely NO scratches or grunge.";
  if (state.surfaceDetail === "High") materialRule += " Add intense micro-details, fine hairline scratches, and rich tactile texture.";
  if (state.typographyScale === "Dense") materialRule += " VERY IMPORTANT: Because the text is dense/complex, prioritize legibility. Reduce excessive noise or overly deep fractures that might make the letters unreadable. Keep the boundaries crisp.";
  // 2D 평면 모드 가드 — frontRelief=Flat + projectionDepth=None.
  const isFlat2D = ir.surface_morphology.reliefId === "Flat" && ir.camera_and_depth.isMinimal;
  if (isFlat2D) {
    depthStr = `CRITICAL ABSOLUTE RULE: This is a FLAT 2D graphic. The letters lie completely flat on the canvas. There is NO 3D extrusion, NO rear depth, NO side walls, NO bevel, NO embossing, NO carved relief. All character must exist in the surface treatment (paint, grunge, distressed texture, screen-print) — not in geometry. Treat it like poster art, a movie title card, or a screen-printed graphic. The camera is perfectly straight-on, dead center.`;
    materialRule += " CRITICAL 2D OVERRIDE: This reference is flat 2D, NOT a 3D rendered object. The material must read as surface paint/grunge/distressed ink on a flat shape, NOT as PBR shaded geometry. DO NOT add rim lights wrapping around volume, DO NOT add specular highlights on side walls (there are no side walls), DO NOT add cast shadows that imply depth. Lighting must be uniform and graphic, NOT volumetric.";
  }
  return `Create an epic masterpiece image based on the following exact specifications.

### 1. Core Directives
- **Type**: ${isFlat2D ? 'Isolated standalone FLAT 2D typography graphic with NO 3D depth, NO extrusion, NO bevel.' : 'Isolated standalone typography graphic.'} ${ir.subject.scale}.
- **Vibe**: ${ir._meta.persona?.discipline || 'custom'}
- **Constraint**: ${ir.subject.fidelity_enforcement}
${isFlat2D ? '- **Dimensional Read**: STRICTLY 2D FLAT. This is graphic art, not a rendered 3D object.' : ''}

### 2. Camera & Depth
- **Perspective**: ${depthStr}${lensDirective}
- **Relief**: ${ir.surface_morphology.relief} with ${ir.surface_morphology.treatment}

### 3. Layered Material Stack
- **Base Material**: ${ir.material_stack.base} (${ir.surface_morphology.wear})
- **Internal Texture**: ${ir.material_stack.internal_texture}
- **Color Grading**: ${ir._meta?.persona?.id === "Chameleon"
    ? 'CRITICAL: Preserve the EXACT color palette from the reference image. Match the reference hue and saturation 1:1. If the reference is monochrome (single hue), the output MUST also be monochrome. DO NOT introduce new colors. DO NOT create a rainbow / multi-color / polychrome palette. NO over-saturation.'
    : 'Highly saturated, punchy vibrant colors, rich deep colors. Never washed out or dull.'}
- **Rule**: ${materialRule}

### 4. Lighting & VFX
- **Lighting**: ${isFlat2D
    ? `Uniform graphic lighting suitable for a flat 2D poster. NO volumetric lighting, NO rim lights wrapping around 3D forms, NO specular highlights on side walls. Keep everything inside the 2D plane.`
    : `Dramatic directional lighting. Clearly lit front face, but any side thickness MUST fall into deep dark shadow. Avoid overlit side planes. ${ir.edge_and_lighting.glint}. Add ${ir.edge_and_lighting.rim_light}. ${ir.edge_and_lighting.rimColorId === "None" ? "CRITICAL: Do not add any glowing underlight or bottom light." : ""} Ensure perfect exposure on the front, deep controlled shadows on the sides, clean high-value highlights, strong material contrast. Avoid unnatural or uniform glowing borders.`}
- **Optical Integration**: ${isFlat2D ? 'Pure flat graphic — no optical depth cues.' : 'Edge highlights and rim lights MUST be physically integrated into the surface edges only. Strictly NO floating glow, detached halos, or separated stroke lines. Do NOT overexpose the side extrusions.'}
- **Edge/Outline**: ${ir.edge_and_lighting.outline}
- **Surrounding VFX**: ${ir.fx.core !== "no surrounding FX" ? `${ir.fx.intensity} ${ir.fx.core}. Origin: ${ir.fx.origin}.` : "No surrounding FX."} ${ir.fx.containment_rule}
${state.currentView === 'editor' && !state.enableVfx ? "- **VFX RULE**: Ensure absolutely ZERO particles, zero dust, zero smoke, and zero lens flares. Keep the background completely clean." : ""}

### 5. Environment
- **Canvas**: Maintain ${ir.environment.background}. CRITICAL: The text must be an isolated, standalone graphic. Do NOT engrave the text onto a solid metal wall, plaque, or background plate. The background must remain a separate, simple canvas behind the text cutout.
- **Shadow**: ${isFlat2D ? 'ABSOLUTELY ZERO 3D drop shadows. NO cast shadows that imply depth. The graphic exists in a pure 2D plane.' : (ir.edge_and_lighting.shadow ? 'MUST include grounded realistic drop shadow and cast shadows on the background canvas.' : 'ABSOLUTELY ZERO drop shadows. No cast shadows. The text must appear to be floating.')}
- **Render Engine**: ${isFlat2D ? '2D graphic design / illustration (NOT a 3D render engine).' : ir.environment.engine}
${ir.subject.intent ? `\n### 6. Special Intent\n- ${ir.subject.intent}` : ''}`;
};

export const compileMidjourney = (ir, state) => {
  const isVFXPass = state.vfxPassMode || ir.vfxPassMode;
  const fxPhrase = ir.fx ? (ir.fx.core !== "no surrounding FX" ? `${ir.fx.intensity} ${ir.fx.core} ${ir.fx.origin}` : "") : "";
  const intent = ir.subject.intent ? `, ${ir.subject.intent}` : "";
  if (isVFXPass) {
    const subject = `pure pitch-black silhouette typography, holdout matte pass`;
    const lightingFx = `${fxPhrase}, ${ir.environment.background}`;
    const mjNegatives = "--no rim light, edge light, edge highlight, 3d, bevel, thickness, extrusion, metallic, reflections, lit text, text texture, outline, border, floating effects, background clutter, text mutation ";
    return `/imagine prompt: ${subject}, completely unlit black hole material, zero reflections, zero highlights, ${lightingFx} ${intent} ${mjNegatives}--style raw --v 6.1`.replace(/\s+/g, ' ').replace(/, ,/g, ',');
  }
  // 2D 평면 가드 — frontRelief=Flat + projectionDepth=None.
  const isFlat2D = ir.surface_morphology.reliefId === "Flat" && ir.camera_and_depth.isMinimal;
  let subject = isFlat2D
    ? `flat 2D typography graphic poster, screen-print aesthetic, isolated standalone graphic, clear cutout text shape against background, individual flat letters with NO thickness, NO 3D extrusion, NO bevel, NO embossing, distressed grunge surface treatment, painterly texture inside flat shapes, sticker-flat silhouette, strict 2D planar composition, highly legible, ${ir.subject.scale}, ${ir.camera_and_depth.lens}, ${ir.subject.fidelity_enforcement}, ${ir.surface_morphology.relief}`
    : `cinematic legendary logo, isolated standalone typography graphic, clear cutout text shape against background, individual independent 3D letters, highly legible, infinite depth of field, entirely in focus, crisp and clear entire frame, ${ir.subject.scale}, ${ir.camera_and_depth.lens}, ${ir.subject.fidelity_enforcement}, ${ir.camera_and_depth.isMinimal ? "solid structural body with minimal side thickness, zero deep rear extrusion" : ir.camera_and_depth.projection}, ${ir.surface_morphology.relief}`;
  let detailTag = "";
  if (state.surfaceDetail === "Clean") detailTag = "perfectly smooth flawless clean surface, ";
  else if (state.surfaceDetail === "High") detailTag = "intense micro-details, fine hairline scratches, rich surface noise, ";
  // 카멜레온은 레퍼런스 색을 그대로 복사해야 하므로 채도 강제 push 제외.
  const colorMood = ir._meta.persona?.id === "Chameleon"
    ? "preserve exact reference color palette, 1:1 color matching, monochrome if reference is monochrome, no rainbow, no polychrome, no over-saturation"
    : "highly saturated, punchy vibrant colors";
  const materialMood = `${ir._meta.persona?.discipline || ''}, ${ir._meta.persona?.mj_tags || ''}, ${colorMood}, ${detailTag}${ir.material_stack.base} material with ${ir.material_stack.internal_texture}, ${ir.surface_morphology.wear} surface`;
  let lightingFx = isFlat2D
    ? `${fxPhrase}, uniform graphic lighting for flat 2D poster, no volumetric lighting, no rim wrapping around 3D volume, ${ir.edge_and_lighting.outline}, ${ir.environment.background}`.replace(/^,\s*/, '')
    : `${fxPhrase}, dramatic directional lighting, clearly lit front face, dark shadowed side walls, deep ambient occlusion on extrusion, ${ir.edge_and_lighting.outline}, ${ir.edge_and_lighting.rim_light}, physically attached specular highlights, ${ir.edge_and_lighting.glint}, deep controlled shadows, clean high-value highlights, strong material contrast, ${ir.environment.background}`.replace(/^,\s*/, '');
  if (ir.edge_and_lighting.shadow) lightingFx += ", grounded with realistic drop shadow, soft cast shadow on backdrop, deep contact shadow anchoring the text";
  let mjNegatives = "--no background plate, plaque, signboard, engraved on a wall, solid metal block background, stone slab, monolith, carved into stone, text etched into wall, floating effects, background clutter, text mutation, extra letters, altered silhouette, random text, runes, hieroglyphs, symbols, written text on surface, watermark, gibberish, merged letters, illegible blob, melted together, uniform stroke, photoshop bevel and emboss, cheap v-carve, wordart, disconnected rim light, floating edge light, artificial halo, separated highlight, dull gray midtones, framed, box around text, shield, emblem, baseplate, flat paper cutout, flat 2d sticker, inner shadow layer style, inner stroke, fake 2d deboss, flat paper with bevel, washed out, desaturated, faded, unnatural outline, glowing border, depth of field, bokeh, background blur, lens blur, out of focus, soft focus, blurred foreground, blurry edges, smudged, melted shape, illegible, transparent text blending into background, excessive glow destroying shape, loss of silhouette, bright side walls, overlit extrusion, glowing thickness, washed out sides, circular brushing, radial metal grain, anisotropic reflection, curved scratches, ";
  if (ir.edge_and_lighting.rimColorId === "None") mjNegatives += "bottom light, underglow, colored rim light, bright glow from below, ";
  if (!ir.edge_and_lighting.shadow) {
    subject += ", floating perfectly without floor shadows";
    mjNegatives += "drop shadow, cast shadow, contact shadow, drop shadow on background, shadow behind text, ";
  }
  if (ir.camera_and_depth.isMinimal) {
    subject += ", perfectly straight-on front facing view, dead center orthographic layout, 2D flat composition";
    mjNegatives += "angled view, side view, isometric, 3d perspective, tilt, diagonal, skewed, heavy 3d block, perspective depth, deep rear extrusion, ";
  } else if (ir.camera_and_depth.projectionId === "Shallow") {
    subject += ", straight-on front facing view, dead center, very shallow thin 3d extrusion";
    mjNegatives += "extreme angled view, side view, tilt, heavy 3d block, massive depth, thick extrusion, deep rear extrusion, chunky text, ";
  } else {
    subject += ", straight-on front facing view, dead center";
    mjNegatives += "extreme angled view, side view, tilt, ";
  }
  if (state.currentView === 'editor' && !state.enableVfx) mjNegatives += "particle effects, floating dust, magic sparkles, glowing embers, smoke, fog, mist, lens flare, bloom, light leaks, fire, flames, glowing background, ";
  const isCasualRelief = CASUAL_RELIEFS.includes(ir.surface_morphology.reliefId);
  if (!isCasualRelief) {
    lightingFx += ", rigid hard-surface, sharp geometric corners, precise metallic structure";
    mjNegatives += "plastic, toy, balloon, inflatable, bubble text, play-doh, soft rounded edges, marshmallow, squishy, 3d render style, soft rounded bevels, blunt corners, smooth edges, filigree, floral patterns, decorative ornaments, ornate engravings, ";
  }
  if (HEAVY_MATERIALS.includes(ir.material_stack.baseId)) {
    subject += ", CRITICAL: INDIVIDUAL CUTOUT LETTERS ONLY, NO BACKGROUND SLAB";
    mjNegatives += "massive stone slab, engraved into rock, carved monolith, background stone wall, text carved into a solid block, ";
  }
  if (ir.camera_and_depth.isMinimal) mjNegatives += "heavy 3d block, perspective depth, deep rear extrusion, isometric, angled view ";
  if (state.surfaceDetail === "Clean") mjNegatives += "scratches, grunge, noise, dents, dust, imperfections ";
  if (state.typographyScale === "Dense") mjNegatives += "excessive noise, cluttered details, unreadable, chaotic textures ";
  if (state.cameraLens === "Telephoto") mjNegatives += "wide angle distortion, perspective distortion, fisheye, vanishing point ";
  if (["MicroBevel", "HairlineBevel", "Flat"].includes(ir.surface_morphology.reliefId)) {
    mjNegatives += "deeply carved, heavy embossing, intense 3d front, deep valleys, deep chiseled ";
  }
  // 2D 평면 가드 — 3D 입체 신호를 강하게 차단.
  if (isFlat2D) {
    mjNegatives += "3D extrusion, rear extrusion, side walls, thickness, depth, bevel, embossing, chiseled, carved, relief, sculpted volume, 3D render, cinematic 3D, AAA game logo, PBR shading, rim light wrapping around volume, specular highlights on side walls, ambient occlusion, drop shadow implying depth, ";
  }
  // 카멜레온 — 무지개/폴리크롬 차단으로 단색 레퍼런스 보존.
  if (ir._meta.persona?.id === "Chameleon") {
    mjNegatives += "multi-color rainbow palette, polychrome, multi-hue gradient, rainbow colors, color shifting, over-saturation, introducing new colors not in the reference, ";
  }
  const srefHint = ir._meta.persona?.id === "Chameleon" ? " --sref [INSERT_YOUR_REFERENCE_IMAGE_URL_HERE] --sw 1000" : "";
  const engineTag = isFlat2D ? "2D graphic design, illustration" : ir.environment.engine;
  return `/imagine prompt: ${subject}, ${materialMood}, ${lightingFx}, ${engineTag}, perfectly exposed, vivid, highly detailed${intent} ${mjNegatives}--style raw --v 6.1${srefHint}`.replace(/\s+/g, ' ').replace(/, ,/g, ',');
};

// ============================================================
// Edit compilers (Micro-Edit view)
// ============================================================
const editFrontVolumeFor = (reliefId) => {
  if (reliefId === "Flat") return "strictly flat front core without deep carving";
  if (reliefId === "MicroBevel") return "maintaining a flat core with only subtle edge bevels, NO deep carving";
  if (reliefId === "HairlineBevel") return "featuring a flat front with microscopic razor-thin edges";
  if (reliefId === "MicroChiseled") return "featuring densely micro-chiseled intricate cuts on the surface";
  if (reliefId === "Crystalline") return "featuring sharp crystalline geometric facets and deep jewel-like cuts";
  return "with balanced front volume";
};

export const compileEditNanoBanana = (ir, state) => {
  if (ir.vfxPassMode) {
    const posTags = [
      "masterpiece, best quality, ultra highres, 8k resolution",
      "pure pitch-black silhouette typography, holdout matte pass, vantablack text, completely unlit, pure #000000 shape",
      ir.details.vfx || "", ir.background, ir.customIntent !== "subtle surface enhancement" ? ir.customIntent : "",
    ].filter(Boolean).map(t => t.trim()).join(", ");
    const negTags = [
      "(worst quality, low quality:1.4), text mutation, extra letters, hallucinated text",
      "(rim light:1.8), (edge highlight:1.8), (glowing edge:1.8), (3d:1.8), (thickness:1.8), (extrusion:1.8), (bevel:1.8), (metallic:1.8), (reflections:1.8), (lighting on text:1.8), (3d block:1.8)",
      "lit text, text texture, outline, border, drop shadow, inner glow, lens flare",
    ].filter(Boolean).map(t => t.trim()).join(", ");
    return `${posTags}\n\nNegative prompt: ${negTags}`;
  }
  const fvm = editFrontVolumeFor(ir.reliefId);
  const projectionTag = ir.constraints.extrusion.includes("MINIMAL") ? `solid structural body with minimal side thickness, absolutely no rear extrusion, BUT ${fvm}` : "allow 3d extrusion";
  let budgetEn = ir.budget.en;
  if (ir.budget.id === "StyleTransfer") budgetEn = "CRITICAL: EXACT 1:1 STYLE TRANSFER FROM REFERENCE, perfectly mimic the aesthetic, identical material recreation";
  else if (ir.budget.id === "SilhouetteTrace") budgetEn = "CRITICAL: EXACT SILHOUETTE TRACE, perfect geometric replication of the input mask";
  const posTags = [
    "masterpiece, best quality, ultra highres, 8k resolution, perfectly exposed, bright base material",
    "isolated standalone typography graphic, individual independent 3D letters, clear cutout text shape against background",
    "CRITICAL: TEXT MUST NOT BE ENGRAVED INTO A WALL OR PLATE. Each letter is a separate 3D object.",
    "clean and readable typography, rich luminous midtones, elegant material finish, crisp specular highlights, clearly lit front face, deep shadowed side walls",
    "highly saturated, punchy vibrant colors, cinematic color grading, rich deep colors",
    "infinite depth of field, entirely in focus, edge-to-edge sharp focus, zero background blur, crisp and clear entire frame",
    budgetEn,
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
    "(runes, hieroglyphs, symbols, written text on surface, watermark, gibberish:1.6), (merged letters, illegible blob, melted together, fused typography:1.5)",
    "(background plate:2.0), (plaque:2.0), (signboard:2.0), (engraved on a wall:2.0), (solid metal block background:2.0), (stone slab:2.0), (monolith:2.0), (carved into stone:2.0), (text etched into wall:2.0), (framed:1.8), (box around text:1.8), text engraved on surface, shield, baseplate, flat paper cutout, flat 2d sticker, mounted metal plate, vector graphic",
    ir.constraints.extrusionId === "None" ? "(heavy 3d block:1.8), (isometric:1.8), (perspective:1.8), (side view:1.8), (angled view:1.8), visible sides, tilt, (deep rear extrusion:1.8)" : ir.constraints.extrusionId === "Shallow" ? "(thick extrusion:1.8), (heavy 3d block:1.8), (massive depth:1.8), (deep rear extrusion:1.8), (chunky text:1.8)" : "(thick extrusion:1.4), (heavy 3d block:1.4)",
    "(uniform stroke:1.9), (even border thickness:1.9), (artificial outline:1.9), (unnatural outline:1.5), (glowing border:1.5), cheap 3d effect, wordart, 2d border, (low poly, jagged edges, messy bevel, crunchy artifacts, unrefined sculpt:1.5)",
    "(photoshop bevel and emboss:1.9), (cheap v-carve:1.9), (uniform V-shape depth:1.9), (inner shadow layer style:1.9), (inner stroke:1.9), (fake 2d deboss:1.9), (flat paper with bevel:1.9)",
    "floating FX, background noise, messy glow, overglare, disconnected rim light, floating edge light, artificial halo, separated highlight, (messy edge blending:1.6), detached stroke, (depth of field:1.9), (bokeh:1.9), (background blur:1.9), (lens blur:1.9), out of focus, soft focus, blurred foreground, blurry edges, smudged",
    "(melted shape:1.5), (illegible:1.5), (transparent text blending into background:1.5), (excessive glow destroying shape:1.5), (loss of silhouette:1.5)",
    "(bright side walls:1.5), (overlit extrusion:1.5), (glowing thickness:1.5)",
    "(circular brushing:1.5), (radial metal grain:1.5), (anisotropic reflection:1.5), curved scratches",
  ];
  if (ir.details.rimColorId === "None") negTags.push("(bottom light:1.8), (underglow:1.8), (colored rim light:1.5)");
  if (ir.constraints.extrusionId === "None") {
    posTags.push("perfectly straight-on front facing view, dead center orthographic layout, strict 2D planar composition");
    negTags.push("(angled view:1.9), (side view:1.9), (isometric:1.9), (3d perspective:1.9), (tilt:1.9), diagonal, skewed");
  } else if (ir.constraints.extrusionId === "Shallow") {
    posTags.push("straight-on front facing view, dead center, very shallow thin 3d extrusion");
    negTags.push("(extreme angled view:1.5), (side view:1.5), tilt");
  } else {
    posTags.push("straight-on front facing view, dead center");
    negTags.push("(extreme angled view:1.5), (side view:1.5), tilt");
  }
  const isCasualRelief = CASUAL_RELIEFS.includes(ir.reliefId);
  if (!isCasualRelief) {
    posTags.push("rigid hard-surface, sharp geometric corners, precise metallic structure");
    negTags.push("(plastic, toy, balloon, inflatable, bubble text, play-doh, soft rounded edges, marshmallow, squishy, 3d render style:1.6), (soft rounded bevels, blunt corners, smooth edges:1.5)");
    negTags.push("(filigree, floral patterns, decorative ornaments, ornate engravings:1.5)");
  } else {
    posTags.push("soft rounded edges, smooth playful design, delightful aesthetic, soft curves");
    negTags.push("(sharp edges:1.5), (dangerous:1.5), (aggressive geometric cuts:1.5), dark fantasy, gritty, grunge, battle damage");
  }
  if (state.cameraLens === "Telephoto") negTags.push("(wide angle distortion:1.5), (perspective distortion:1.5), fisheye, vanishing point");
  if (["MicroBevel", "Flat", "HairlineBevel"].includes(ir.reliefId)) {
    negTags.push("(deeply carved:1.5), (heavy embossing:1.5), (intense 3d front:1.5), (deep valleys:1.5), deep chiseled");
  }
  return `${posTags.filter(Boolean).map(t => t.trim()).join(", ")}\n\nNegative prompt: ${negTags.filter(Boolean).map(t => t.trim()).join(", ")}`;
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
  if (ir.constraints.extrusionId === "MINIMAL" || ir.constraints.extrusionId === "None") extrConstraint = "CRITICAL RULE: The object must remain a perfectly front-facing orthographic silhouette. The outer contour must read as a flat 2D cutout shape. Absolutely no rear extrusion, no visible side planes, and no object thickness. All dimensionality must exist only inside the front face as surface relief and shading. The camera MUST be positioned perfectly straight-on, dead center. Absolutely NO angled views, NO side views, NO isometric angles.";
  else if (ir.constraints.extrusionId === "Shallow") extrConstraint = "CRITICAL RULE: The object must have ONLY a very shallow, thin 3D extrusion. Absolutely NO thick heavy 3D blocks. Keep the depth minimal.";
  const lensDirective = `\n- **Lens & Perspective**: ${ir.camera}. CRITICAL: Use infinite depth of field. Every part of the object must be entirely in focus. Absolutely NO background blur, NO bokeh, NO blurry edges.`;
  let antiToyRule = " AVOID fake inner shadow or inner stroke layer styles.";
  const isCasualRelief = CASUAL_RELIEFS.includes(ir.reliefId);
  if (!isCasualRelief) antiToyRule += " AVOID decorative filigree, floral patterns, or ornate engravings. The object must have a rigid hard-surface with sharp metallic corners. It MUST NOT look like a plastic toy, a balloon, soft rounded bevels, or an inflatable bubble text.";
  else antiToyRule += " The object should embrace soft, rounded, playful aesthetic without sharp, dangerous geometric corners. Emphasize delightful toy-like or inflatable volumes if applicable.";
  const styleTransferRule = ir.budget.id === "StyleTransfer" ? "CRITICAL: You MUST perform an exact 1:1 style transfer. Override the original image's materials, textures, and lighting to completely match the target aesthetic vibe." : "";
  const silhouetteTraceRule = ir.budget.id === "SilhouetteTrace" ? "CRITICAL: EXACT SILHOUETTE TRACE. You MUST treat the input image as an absolute 2D geometry mask. Do NOT regenerate or reinterpret the text. Extrude the exact provided shape into 3D. Preserve every detailed shape, cut, decoration, and character feature perfectly as it is in the reference. Do NOT replace it with a generic font." : "";
  return `Create a Shape-Locked Image-to-Image Remix based on the exact specifications below.

### 1. Structure Lock (CRITICAL)
- **Reference**: Use the input image as the exact structural reference.
- **Budget Level**: ${ir.budget.name}
${silhouetteTraceRule ? `- **Geometry Mask**: ${silhouetteTraceRule}` : `- **Contour Lock**: ${ir.locks.contour}`}
${styleTransferRule ? `- **Style Transfer**: ${styleTransferRule}` : ""}

### 2. Constraints & Integrity
- **Anti-Mutation (CRITICAL)**: Do NOT hallucinate new typography. Do NOT reinterpret letters. Treat the reference image purely as a visual shape/mask.
- **Material Integration**: ${ir.constraints.material_integration} Must look highly organic, authentic, and photorealistic (PBR). STRICTLY AVOID tacky CGI look. Ensure extreme sharpness and intricate micro-details on the facets. STRICTLY FORBIDDEN: Do NOT use cheap photoshop bevel and emboss effects, and avoid uniform V-shaped carving.${antiToyRule} Ensure straight linear brushed lines, NO circular brushing.
- **Anti-Engraving (CRITICAL)**: ${ir.constraints.anti_engraving} The object MUST remain as independent cutout elements, exactly like the source image. It must NEVER turn into a solid block, monolith, or a wall with shapes etched into it.
- **Optical Integration**: Edge highlights and rim lights MUST be physically integrated into the surface. Strictly NO floating glow, detached halos, or separated stroke lines. Ensure a clearly lit and well-exposed subject. Deep controlled shadows, clean high-value highlights, strong material contrast. Avoid unnatural or uniform glowing borders.
- **Color Grading**: ${ir._meta?.persona?.id === "Chameleon"
    ? 'CRITICAL: Preserve the EXACT color palette from the reference image. Match the reference hue and saturation 1:1. If the reference is monochrome (single hue), the output MUST also be monochrome. DO NOT introduce new colors. DO NOT create a rainbow / multi-color / polychrome palette. NO over-saturation.'
    : 'Highly saturated, punchy vibrant colors, rich deep colors. Never washed out or dull.'}
- **FX Containment**: ${ir.constraints.fx_containment}
- **Depth/Extrusion**: ${extrConstraint}${lensDirective} Ensure side planes (thickness) fall into deep shadow and do NOT glow brightly.

### 3. Edit Scope & Intents
- **Target Changes**: \n  - ${intentsArr.length > 0 ? intentsArr.join("\n  - ") : "Subtle Polish"}
- **Custom Directive**: ${ir.customIntent}
- **Background**: Maintain ${ir.background}. CRITICAL: The object must be an isolated, standalone graphic. Do NOT engrave it onto a solid metal wall, plaque, or background plate. The background must remain a separate, simple canvas behind the cutout.

*Ensure the output preserves 100% of the original core morphology while only swapping the outer aesthetic layers. Do not use cheap uniform 2D strokes or photoshop bevel effects.*`;
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
  const scope = intentsArr.length > 0 ? intentsArr.join(", ") : "surface polish";
  const custom = ir.customIntent !== "subtle surface enhancement" ? `, ${ir.customIntent}` : "";
  let subject = ir.budget.id === "SilhouetteTrace"
    ? `exact 3D geometric recreation of the provided image mask, CRITICAL: DO NOT reinterpret as text, treat input as absolute vector silhouette, perfect shape trace, exact detailed contours preserved, individual independent 3D elements, infinite depth of field, entirely in focus, crisp and clear entire frame, ${ir.camera}`
    : `cinematic legendary logo remix, isolated standalone typography graphic, individual independent 3D letters, strict shape lock, exact silhouette preservation, Use the input image as the exact structural reference, highly legible, infinite depth of field, entirely in focus, crisp and clear entire frame, ${ir.camera}, ${ir.budget.en}`;
  const styleConstraint = ir.budget.id === "StyleTransfer" ? "CRITICAL: EXACT 1:1 STYLE TRANSFER FROM REFERENCE, perfectly mimic the aesthetic, " : "";
  const constraints = `${styleConstraint}MUST NOT BE ENGRAVED INTO A WALL, independent cutout elements, ${ir.constraints.extrusion}, ${ir.constraints.material_integration}, ${ir.constraints.fx_containment}, physically attached specular highlights, deep controlled shadows, clean high-value highlights, strong material contrast, highly saturated, punchy vibrant colors`;
  let mjNegatives = "--no background plate, plaque, signboard, engraved on a wall, solid metal block background, stone slab, monolith, carved into stone, text etched into wall, text hallucination, new typography, font replacement, shape drift, stroke swell, floating FX, background noise, material sticker, extra letters, runes, hieroglyphs, symbols, written text on surface, watermark, gibberish, merged letters, illegible blob, melted together, uniform stroke, photoshop bevel and emboss, cheap v-carve, wordart, disconnected rim light, floating edge light, artificial halo, separated highlight, dull gray midtones, framed, box around text, shield, emblem, baseplate, drop shadow, cast shadow revealing thickness, inner shadow layer style, inner stroke, fake 2d deboss, flat paper with bevel, washed out, desaturated, faded, unnatural outline, glowing border, depth of field, bokeh, background blur, lens blur, out of focus, soft focus, blurred foreground, blurry edges, smudged, melted shape, illegible, transparent text blending into background, excessive glow destroying shape, loss of silhouette, bright side walls, overlit extrusion, glowing thickness, washed out sides, circular brushing, radial metal grain, anisotropic reflection, curved scratches, ";
  if (ir.constraints.extrusionId === "None" || ir.constraints.extrusionId === "MINIMAL") {
    subject += ", perfectly straight-on front facing view, dead center orthographic layout, 2D flat composition";
    mjNegatives += "angled view, side view, isometric, 3d perspective, tilt, diagonal, skewed, heavy 3d block, perspective depth, deep rear extrusion, ";
  } else if (ir.constraints.extrusionId === "Shallow") {
    subject += ", straight-on front facing view, dead center, very shallow thin 3d extrusion";
    mjNegatives += "extreme angled view, side view, tilt, heavy 3d block, massive depth, thick extrusion, deep rear extrusion, ";
  } else {
    subject += ", straight-on front facing view, dead center";
    mjNegatives += "extreme angled view, side view, tilt, ";
  }
  let lightingFx = "dramatic directional lighting, clearly lit front face, dark shadowed side walls, deep ambient occlusion on extrusion";
  const isCasualRelief = CASUAL_RELIEFS.includes(ir.reliefId);
  if (!isCasualRelief) {
    lightingFx += ", rigid hard-surface, sharp geometric corners, precise metallic structure";
    mjNegatives += "plastic, toy, balloon, inflatable, bubble text, play-doh, soft rounded edges, marshmallow, squishy, 3d render style, soft rounded bevels, blunt corners, smooth edges, filigree, floral patterns, decorative ornaments, ornate engravings, ";
  }
  if (state.cameraLens === "Telephoto") mjNegatives += "wide angle distortion, perspective distortion, fisheye, vanishing point ";
  if (["MicroBevel", "HairlineBevel", "Flat"].includes(ir.reliefId)) mjNegatives += "deeply carved, heavy embossing, intense 3d front, deep valleys, deep chiseled ";
  let mj_iw = "--iw 1.0";
  if (ir.budget.id === "Locked" || ir.budget.id === "SilhouetteTrace") mj_iw = "--iw 2.0";
  else if (ir.budget.id === "Conservative") mj_iw = "--iw 1.5";
  else if (ir.budget.id === "Expressive") mj_iw = "--iw 0.5";
  else if (ir.budget.id === "StyleTransfer") mj_iw = "--iw 1.5";
  const srefHint = (ir.budget.id === "StyleTransfer" || ir.budget.id === "SilhouetteTrace") ? " --sref [INSERT_STYLE_REFERENCE_IMAGE_URL_HERE] --sw 1000" : "";
  return `/imagine prompt: ${subject}, applied ${scope}${custom}, ${constraints}, ${lightingFx}, background ${ir.background} ${mjNegatives}${mj_iw}${srefHint} --style raw --v 6.1`.replace(/\s+/g, ' ');
};
