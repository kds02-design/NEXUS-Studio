// IR(Intermediate Representation) 빌더 + 모델별 prompt 컴파일 + 룰 검증/품질 점수.
// 원본 RenderMatrix index.jsx 의 generate*/compile*/performLogicAudit/calculateQualityScore 들을 그대로 옮긴 모듈.
// 각 compile 함수는 IR + state 를 받아 모델 syntax 에 맞는 prompt 문자열을 반환한다.

import { DIRECTOR_PERSONAS, EDIT_BUDGETS, RENDER_ENGINES, getOptionEn } from "../constants/presets";

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
    _meta: { version: "19.34", persona: DIRECTOR_PERSONAS.find(p => p.id === directorPersona), complexityLevel: complexity },
    subject: { type: "typography graphic", scale: getOptionEn(appOptions.typographyScales, typographyScale), fidelity_enforcement: "STRICT RULE: 95% shape preservation. EXACT ORIGINAL SILHOUETTE. NO TEXT MUTATION. NO extra letters. Ensure high legibility.", intent: userIntent || null },
    camera_and_depth: { projectionId: projectionDepth, projection: getOptionEn(appOptions.projectionDepths, projectionDepth), isMinimal: projectionDepth === "None", lens: getOptionEn(appOptions.cameraLenses, cameraLens) },
    surface_morphology: { reliefId: frontRelief, relief: getOptionEn(appOptions.frontReliefs, frontRelief), treatment: getOptionEn(appOptions.surfaceTreatments, surfaceTreatment), wear: getOptionEn(appOptions.wearLevels, wearLevel) },
    material_stack: { base: getOptionEn(appOptions.materials, material), intensity: getOptionEn(appOptions.intensities, materialInt), internal_texture: dramaticTex === "Auto" ? "organically embedded dynamic textures" : getOptionEn(appOptions.dramaticTextures, dramaticTex), surface_detail: getOptionEn(appOptions.surfaceDetails, surfaceDetail), integration_rule: "Textures MUST be physically carved or etched INTO the base material. NO floating decals." },
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
  const ir = {
    _meta: { mode: "Micro-Edit", version: "19.34" },
    locks: { glyph: "Strictly lock exact character types, sequence, and spacing.", contour: "Preserve original outer silhouette perfectly.", stroke: "Maintain exact stroke thickness and internal counter spaces." },
    budget: budgetLevel,
    camera: getOptionEn(appOptions.cameraLenses, cameraLens),
    reliefId: frontRelief,
    constraints: {
      anti_mutation: "Do NOT reinterpret letters, do NOT add new text or watermarks.",
      fx_containment: "All FX MUST originate from surface cracks/edges and remain tightly bound to the shape. NO floating particles.",
      material_integration: "All textures/FX MUST be physically embedded into the base material. NO floating decals.",
      extrusionId: editRearExtrusion,
      extrusion: editRearExtrusion === "None" ? `[PROJECTION: MINIMAL] solid structural body with minimal side thickness, NO deep rear extrusion, NO heavy 3D block.` : editRearExtrusion === "Shallow" ? "Allow ONLY very shallow thin backward 3D extrusion. NO thick blocks." : "Allow controlled backward 3D extrusion.",
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
  const { cameraMotion, vfxDynamics, motionIntent, energyCore } = state;
  return {
    _meta: { mode: "Video-Motion", version: "19.34" },
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
    const posTags = ["masterpiece, best quality, ultra highres, 8k resolution", "pure pitch-black silhouette typography, absolute flat 2d cutout, holdout matte pass, vantablack text, completely unlit, pure #000000 shape", ir.subject.fidelity_enforcement.replace("STRICT RULE: ", ""), fxTag, ir.environment.background, ir.environment.engine, ir.subject.intent].filter(Boolean).map(t => t.trim()).join(", ");
    const negTags = ["(worst quality, low quality:1.4), text mutation, extra letters, hallucinated text", "(rim light:1.8), (edge highlight:1.8), (glowing edge:1.8), (3d:1.8), (thickness:1.8), (extrusion:1.8), (bevel:1.8), (metallic:1.8), (reflections:1.8), (lighting on text:1.8), (3d block:1.8)", "lit text, text texture, outline, border, drop shadow, inner glow, lens flare"].filter(Boolean).map(t => t.trim()).join(", ");
    return `${posTags}\n\nNegative prompt: ${negTags}`;
  }
  const scaleTag = ir.subject.scale;
  const lensTag = ir.camera_and_depth.lens;
  const frontVolumeModifier = frontVolumeModifierFor(ir.surface_morphology.reliefId);
  const projectionDesc = ir.camera_and_depth.isMinimal ? `It is presented as a solid structural body with minimal side thickness. Absolutely no rear extrusion, BUT ${frontVolumeModifier}.` : "It is presented with 3D depth and extrusion.";
  const prose = `An epic cinematic typography graphic rendered in a ${ir._meta.persona.name.split(' ')[1]} style. ${scaleTag}. ${lensTag}. The text is crafted from ${ir.material_stack.base} featuring ${ir.material_stack.internal_texture}. ${projectionDesc}`;
  const posTags = [
    prose,
    "masterpiece, best quality, ultra highres, insanely detailed, 8k resolution",
    "isolated standalone typography graphic, clear cutout text shape against background, highly legible",
    "infinite depth of field, entirely in focus, edge-to-edge sharp focus, zero background blur, crisp and clear entire frame",
    "deep shadowed side walls, dark unlit extrusion, heavy ambient occlusion on thickness",
    ir.subject.fidelity_enforcement.replace("STRICT RULE: ", ""),
    ir._meta.persona.mj_tags.split(" --no ")[0],
    ir.environment.background,
    ir.environment.engine,
    ir.subject.intent,
  ];
  if (ir.edge_and_lighting.shadow) posTags.push("grounded with realistic drop shadow, soft cast shadow on backdrop, deep contact shadow anchoring the text");
  const negTags = [
    "(worst quality, low quality:1.4), text mutation, extra letters, hallucinated text, floating decal",
    "(runes, hieroglyphs, symbols, written text on surface, watermark, gibberish:1.6), (merged letters, illegible blob, melted together, fused typography:1.5)",
    "(filigree, floral patterns, decorative ornaments, ornate engravings:1.5)",
    "(background plate:1.9), (plaque:1.9), (signboard:1.9), (engraved on a wall:1.9), (solid metal block background:1.9), (framed:1.8), (box around text:1.8), text engraved on surface, shield, baseplate, mounted metal plate, flat paper cutout, flat 2d sticker, dull shading, vector graphic",
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
  if (ir.surface_morphology.reliefId !== "ChunkyToy") {
    posTags.push("rigid hard-surface, sharp geometric corners, precise metallic structure");
    negTags.push("(plastic, toy, balloon, inflatable, bubble text, play-doh, soft rounded edges, marshmallow, squishy, 3d render style:1.6), (soft rounded bevels, blunt corners, smooth edges:1.5)");
  }
  if (ir.surface_morphology.reliefId === "MicroBevel" || ir.surface_morphology.reliefId === "HairlineBevel" || ir.surface_morphology.reliefId === "Flat") {
    negTags.push("(deeply carved:1.5), (heavy embossing:1.5), (intense 3d front:1.5), (deep valleys:1.5), deep chiseled");
  }
  if (state.cameraLens === "Telephoto") negTags.push("(wide angle distortion:1.5), (perspective distortion:1.5), fisheye, vanishing point");
  if (state.typographyScale === "Dense") {
    posTags.push("clean legible typography, simplified readable shapes");
    negTags.push("(excessive noise, cluttered details, unreadable, chaotic textures:1.5)");
  }
  posTags.push("highly saturated, punchy vibrant colors, cinematic color grading, rich deep colors");
  negTags.push("(washed out:1.5), (desaturated:1.5), (dull colors:1.5), faded, grayscale, (dark, underexposed, gloomy:1.5)");
  posTags.push("dramatic directional lighting, clearly lit front face, side thickness falls into deep shadow, preserve clean silhouette edges, flawless silhouette boundary, surface detail must not distort the outer contour, damage stays inside the front face only, clean and readable typography, rich luminous midtones, elegant material finish, crisp specular highlights on edges, high-end PBR shading, strong material contrast");
  posTags.push(ir.surface_morphology.relief, ir.surface_morphology.wear !== "factory-new flawless state" ? ir.surface_morphology.wear : "");
  posTags.push(ir.edge_and_lighting.rim_light, ir.edge_and_lighting.glint, "texture physically embedded into material");
  if (fxTag) posTags.push(fxTag);
  if (state.surfaceDetail === "Clean") negTags.push("scratches, grunge, noise, dents, dust, imperfections, distressed surface");
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
  let materialRule = ir.material_stack.integration_rule + " Must look highly organic, authentic, and photorealistic (PBR). STRICTLY AVOID cheap plastic, fake gold foil, or tacky over-shiny CGI look. Ensure extreme sharpness and elegant micro-details. The surface must not look chunky, blurry, or low-resolution. STRICTLY FORBIDDEN: Do NOT use cheap photoshop bevel and emboss effects, and avoid uniform V-shaped carving. AVOID decorative filigree, floral patterns, or ornate engravings. Do NOT use fake inner shadow or inner stroke layer styles.";
  materialRule += " CRITICAL: Do NOT let transparent ice blend into the background. Do NOT let glowing lava melt or break the shape. High legibility is mandatory. Ensure strictly linear brushed patterns if brushed metal is used, NO circular or radial grain.";
  if (ir.surface_morphology.reliefId !== "ChunkyToy") materialRule += " The object must have a rigid hard-surface with sharp metallic corners. It MUST NOT look like a plastic toy, a balloon, soft rounded bevels, or an inflatable bubble text.";
  if (state.surfaceDetail === "Clean") materialRule += " Ensure the surface is perfectly smooth and clean, absolutely NO scratches or grunge.";
  if (state.surfaceDetail === "High") materialRule += " Add intense micro-details, fine hairline scratches, and rich tactile texture.";
  if (state.typographyScale === "Dense") materialRule += " VERY IMPORTANT: Because the text is dense/complex, prioritize legibility. Reduce excessive noise or overly deep fractures that might make the letters unreadable. Keep the boundaries crisp.";
  return `Create an epic masterpiece image based on the following exact specifications.

### 1. Core Directives
- **Type**: Isolated standalone typography graphic. ${ir.subject.scale}.
- **Vibe**: ${ir._meta.persona.discipline}
- **Constraint**: ${ir.subject.fidelity_enforcement}

### 2. Camera & Depth
- **Perspective**: ${depthStr}${lensDirective}
- **Relief**: ${ir.surface_morphology.relief} with ${ir.surface_morphology.treatment}

### 3. Layered Material Stack
- **Base Material**: ${ir.material_stack.base} (${ir.surface_morphology.wear})
- **Internal Texture**: ${ir.material_stack.internal_texture}
- **Color Grading**: Highly saturated, punchy vibrant colors, rich deep colors. Never washed out or dull.
- **Rule**: ${materialRule}

### 4. Lighting & VFX
- **Lighting**: Dramatic directional lighting. Clearly lit front face, but any side thickness MUST fall into deep dark shadow. Avoid overlit side planes. ${ir.edge_and_lighting.glint}. Add ${ir.edge_and_lighting.rim_light}. ${ir.edge_and_lighting.rimColorId === "None" ? "CRITICAL: Do not add any glowing underlight or bottom light." : ""} Ensure perfect exposure on the front, deep controlled shadows on the sides, clean high-value highlights, strong material contrast. Avoid unnatural or uniform glowing borders.
- **Optical Integration**: Edge highlights and rim lights MUST be physically integrated into the surface edges only. Strictly NO floating glow, detached halos, or separated stroke lines. Do NOT overexpose the side extrusions.
- **Edge/Outline**: ${ir.edge_and_lighting.outline}
- **Surrounding VFX**: ${ir.fx.core !== "no surrounding FX" ? `${ir.fx.intensity} ${ir.fx.core}. Origin: ${ir.fx.origin}.` : "No surrounding FX."} ${ir.fx.containment_rule}
${state.currentView === 'editor' && !state.enableVfx ? "- **VFX RULE**: Ensure absolutely ZERO particles, zero dust, zero smoke, and zero lens flares. Keep the background completely clean." : ""}

### 5. Environment
- **Canvas**: Maintain ${ir.environment.background}. CRITICAL: The text must be an isolated, standalone graphic. Do NOT engrave the text onto a solid metal wall, plaque, or background plate. The background must remain a separate, simple canvas behind the text cutout.
- **Shadow**: ${ir.edge_and_lighting.shadow ? "MUST include grounded realistic drop shadow and cast shadows on the background canvas." : "ABSOLUTELY ZERO drop shadows. No cast shadows. The text must appear to be floating."}
- **Render Engine**: ${ir.environment.engine}
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
  const lensTag = ir.camera_and_depth.lens;
  let subject = `cinematic legendary logo, isolated standalone typography graphic, clear cutout text shape against background, highly legible, infinite depth of field, entirely in focus, crisp and clear entire frame, ${ir.subject.scale}, ${lensTag}, ${ir.subject.fidelity_enforcement}, ${ir.camera_and_depth.isMinimal ? "solid structural body with minimal side thickness, zero deep rear extrusion" : ir.camera_and_depth.projection}, ${ir.surface_morphology.relief}`;
  let detailTag = "";
  if (state.surfaceDetail === "Clean") detailTag = "perfectly smooth flawless clean surface, ";
  else if (state.surfaceDetail === "High") detailTag = "intense micro-details, fine hairline scratches, rich surface noise, ";
  const materialMood = `${ir._meta.persona.discipline}, ${ir._meta.persona.mj_tags}, highly saturated, punchy vibrant colors, ${detailTag}${ir.material_stack.base} material with ${ir.material_stack.internal_texture}, ${ir.surface_morphology.wear} surface`;
  let lightingFx = `${fxPhrase}, dramatic directional lighting, clearly lit front face, dark shadowed side walls, deep ambient occlusion on extrusion, ${ir.edge_and_lighting.outline}, ${ir.edge_and_lighting.rim_light}, physically attached specular highlights, ${ir.edge_and_lighting.glint}, deep controlled shadows, clean high-value highlights, strong material contrast, ${ir.environment.background}`.replace(/^,\s*/, '');
  if (ir.edge_and_lighting.shadow) lightingFx += ", grounded with realistic drop shadow, soft cast shadow on backdrop, deep contact shadow anchoring the text";
  let mjNegatives = "--no background plate, plaque, signboard, engraved on a wall, solid metal block background, floating effects, background clutter, text mutation, extra letters, altered silhouette, random text, runes, hieroglyphs, symbols, written text on surface, watermark, gibberish, merged letters, illegible blob, melted together, filigree, floral patterns, decorative ornaments, ornate engravings, uniform stroke, photoshop bevel and emboss, cheap v-carve, wordart, disconnected rim light, floating edge light, artificial halo, separated highlight, dull gray midtones, framed, box around text, shield, emblem, baseplate, flat paper cutout, flat 2d sticker, inner shadow layer style, inner stroke, fake 2d deboss, flat paper with bevel, washed out, desaturated, faded, unnatural outline, glowing border, depth of field, bokeh, background blur, lens blur, out of focus, soft focus, blurred foreground, blurry edges, smudged, melted shape, illegible, transparent text blending into background, excessive glow destroying shape, loss of silhouette, bright side walls, overlit extrusion, glowing thickness, washed out sides, circular brushing, radial metal grain, anisotropic reflection, curved scratches, ";
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
  if (ir.camera_and_depth.isMinimal) mjNegatives += "heavy 3d block, perspective depth, deep rear extrusion, isometric, angled view ";
  if (state.surfaceDetail === "Clean") mjNegatives += "scratches, grunge, noise, dents, dust, imperfections ";
  if (state.typographyScale === "Dense") mjNegatives += "excessive noise, cluttered details, unreadable, chaotic textures ";
  if (state.cameraLens === "Telephoto") mjNegatives += "wide angle distortion, perspective distortion, fisheye, vanishing point ";
  if (ir.surface_morphology.reliefId === "MicroBevel" || ir.surface_morphology.reliefId === "HairlineBevel" || ir.surface_morphology.reliefId === "Flat") mjNegatives += "deeply carved, heavy embossing, intense 3d front, deep valleys, deep chiseled ";
  return `/imagine prompt: ${subject}, ${materialMood}, ${lightingFx}, ${ir.environment.engine}, perfectly exposed, vivid, highly detailed${intent} ${mjNegatives}--style raw --v 6.1`.replace(/\s+/g, ' ').replace(/, ,/g, ',');
};

// ============================================================
// Edit compilers (Micro-Edit view)
// ============================================================
export const compileEditNanoBanana = (ir, state) => {
  if (ir.vfxPassMode) {
    const posTags = ["masterpiece, best quality, ultra highres, 8k resolution", "pure pitch-black silhouette typography, holdout matte pass, vantablack text, completely unlit, pure #000000 shape", ir.details.vfx || "", ir.background, ir.customIntent !== "subtle surface enhancement" ? ir.customIntent : ""].filter(Boolean).map(t => t.trim()).join(", ");
    const negTags = ["(worst quality, low quality:1.4), text mutation, extra letters, hallucinated text", "(rim light:1.8), (edge highlight:1.8), (glowing edge:1.8), (3d:1.8), (thickness:1.8), (extrusion:1.8), (bevel:1.8), (metallic:1.8), (reflections:1.8), (lighting on text:1.8), (3d block:1.8)", "lit text, text texture, outline, border, drop shadow, inner glow, lens flare"].filter(Boolean).map(t => t.trim()).join(", ");
    return `${posTags}\n\nNegative prompt: ${negTags}`;
  }
  const frontVolumeModifier = frontVolumeModifierFor(ir.reliefId);
  const projectionTag = ir.constraints.extrusion.includes("MINIMAL") ? `solid structural body with minimal side thickness, absolutely no rear extrusion, BUT ${frontVolumeModifier}` : "allow 3d extrusion";
  const posTags = [
    "masterpiece, best quality, ultra highres, 8k resolution, perfectly exposed, bright base material",
    "isolated standalone typography graphic, clear cutout text shape against background",
    "clean and readable typography, rich luminous midtones, elegant material finish, crisp specular highlights, clearly lit front face, deep shadowed side walls",
    "highly saturated, punchy vibrant colors, cinematic color grading, rich deep colors",
    "infinite depth of field, entirely in focus, edge-to-edge sharp focus, zero background blur, crisp and clear entire frame",
    `cinematic remix, ${ir.budget.en}`,
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
    "(filigree, floral patterns, decorative ornaments, ornate engravings:1.5)",
    "(background plate:1.9), (plaque:1.9), (signboard:1.9), (engraved on a wall:1.9), (solid metal block background:1.9), (framed:1.8), (box around text:1.8), text engraved on surface, shield, baseplate, flat paper cutout, flat 2d sticker, mounted metal plate, vector graphic",
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
  if (ir.reliefId !== "ChunkyToy") {
    posTags.push("rigid hard-surface, sharp geometric corners, precise metallic structure");
    negTags.push("(plastic, toy, balloon, inflatable, bubble text, play-doh, soft rounded edges, marshmallow, squishy, 3d render style:1.6), (soft rounded bevels, blunt corners, smooth edges:1.5)");
  }
  if (state.cameraLens === "Telephoto") negTags.push("(wide angle distortion:1.5), (perspective distortion:1.5), fisheye, vanishing point");
  if (ir.reliefId === "MicroBevel" || ir.reliefId === "Flat" || ir.reliefId === "HairlineBevel") negTags.push("(deeply carved:1.5), (heavy embossing:1.5), (intense 3d front:1.5), (deep valleys:1.5), deep chiseled");
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
  if (ir.constraints.extrusionId === "MINIMAL" || ir.constraints.extrusionId === "None") extrConstraint = "CRITICAL RULE: The typography must remain a perfectly front-facing orthographic silhouette. The outer contour must read as a flat 2D cutout shape. Absolutely no rear extrusion, no visible side planes, and no object thickness. All dimensionality must exist only inside the front face as surface relief and shading. The camera MUST be positioned perfectly straight-on, dead center. Absolutely NO angled views, NO side views, NO isometric angles.";
  else if (ir.constraints.extrusionId === "Shallow") extrConstraint = "CRITICAL RULE: The typography must have ONLY a very shallow, thin 3D extrusion. Absolutely NO thick heavy 3D blocks. Keep the depth minimal.";
  const lensDirective = `\n- **Lens & Perspective**: ${ir.camera}. CRITICAL: Use infinite depth of field. Every part of the text must be entirely in focus. Absolutely NO background blur, NO bokeh, NO blurry edges.`;
  let antiToyRule = " AVOID decorative filigree, floral patterns, or ornate engravings. Ensure high legibility and perfectly intact silhouette. Do NOT melt the shape.";
  if (ir.reliefId !== "ChunkyToy") antiToyRule += " The object must have a rigid hard-surface with sharp metallic corners. It MUST NOT look like a plastic toy, a balloon, soft rounded bevels, or an inflatable bubble text.";
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
- **Optical Integration**: Edge highlights and rim lights MUST be physically integrated into the surface. Strictly NO floating glow, detached halos, or separated stroke lines. Ensure a clearly lit and well-exposed subject. Deep controlled shadows, clean high-value highlights, strong material contrast. Avoid unnatural or uniform glowing borders.
- **Color Grading**: Highly saturated, punchy vibrant colors, rich deep colors. Never washed out or dull.
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
  let subject = `cinematic legendary logo remix, isolated standalone typography graphic, strict shape lock, exact silhouette preservation, Use the input image as the exact structural reference, highly legible, infinite depth of field, entirely in focus, crisp and clear entire frame, ${ir.camera}, ${ir.budget.en}`;
  const scope = intentsArr.length > 0 ? intentsArr.join(", ") : "surface polish";
  const custom = ir.customIntent !== "subtle surface enhancement" ? `, ${ir.customIntent}` : "";
  const constraints = `${ir.constraints.extrusion}, ${ir.constraints.material_integration}, ${ir.constraints.fx_containment}, physically attached specular highlights, deep controlled shadows, clean high-value highlights, strong material contrast, highly saturated, punchy vibrant colors`;
  let mjNegatives = "--no background plate, plaque, signboard, engraved on a wall, solid metal block background, text mutation, shape drift, stroke swell, floating FX, background noise, material sticker, extra letters, runes, hieroglyphs, symbols, written text on surface, watermark, gibberish, merged letters, illegible blob, melted together, filigree, floral patterns, decorative ornaments, ornate engravings, uniform stroke, photoshop bevel and emboss, cheap v-carve, wordart, disconnected rim light, floating edge light, artificial halo, separated highlight, dull gray midtones, framed, box around text, shield, emblem, baseplate, drop shadow, cast shadow revealing thickness, inner shadow layer style, inner stroke, fake 2d deboss, flat paper with bevel, washed out, desaturated, faded, unnatural outline, glowing border, depth of field, bokeh, background blur, lens blur, out of focus, soft focus, blurred foreground, blurry edges, smudged, melted shape, illegible, transparent text blending into background, excessive glow destroying shape, loss of silhouette, bright side walls, overlit extrusion, glowing thickness, washed out sides, circular brushing, radial metal grain, anisotropic reflection, curved scratches, ";
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
  if (ir.reliefId !== "ChunkyToy") {
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
  return `Create a high-quality cinematic video of an isolated standalone typography graphic on a pure black background.
Camera Motion: ${ir.motion.camera}
Dynamics: ${ir.motion.dynamics} ${fxRule}
${ir.customIntent ? `Action: ${ir.customIntent}` : ""}

CRITICAL RULE: ${ir.subject_lock} Do not allow the text to distort or melt. Maintain perfectly crisp edges.
FX CONTAINMENT: Visual effects MUST be highly controlled and strictly confined to the text surface and immediate edges. Do NOT let effects fill the entire screen. The background MUST remain a pure, unaffected black void. NO global color washes or full-screen filters.
${staticRule}`;
};
