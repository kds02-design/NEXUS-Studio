/* eslint-disable */
// v1 전용 IR/컴파일러/오딧/스코어 (격리 사본).
import { DIRECTOR_PERSONAS, EDIT_BUDGETS, staticOptions } from './options.js';
import { getOptionEn } from './utils.js';

export const performLogicAudit = (state) => {
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

export const calculateQualityScore = (state) => {
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

export const getQualityFeedback = (scores) => {
    const minScore = Math.min(scores.structure, scores.cuteFeel, scores.readability, scores.fxControl);
    if (minScore >= 90) return "완벽합니다! 훌륭한 로고 결과물이 예상됩니다.";
    if (scores.structure === minScore) return "형태 보존이 Relaxed 모드입니다. 가독성을 해치지 않게 주의하세요.";
    if (scores.readability === minScore) return "가독성이 다소 낮습니다. 뚜렷한 외곽선(Outline)을 추가해 보세요.";
    if (scores.fxControl === minScore) return "이펙트가 글자를 가릴 위험이 있습니다. 장식을 줄이세요.";
    if (scores.cuteFeel === minScore) return "너무 딱딱해 보일 수 있습니다. '풍선형'이나 '둥근 각'을 적용해보세요.";
    return "설정이 안정적으로 유지되고 있습니다.";
};

export const calculatePromptBudget = (state) => {
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

export const generateIR = (state) => {
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

export const generateEditIR = (state) => {
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

// --- Model Compilers ---
export const compileNanoBanana = (ir, state) => {
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

export const compileChatGPT = (ir, state) => {
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

export const compileMidjourney = (ir, state) => {
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

// --- Edit (Remix) Compilers ---
export const compileEditNanoBanana = (ir, state) => {
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

export const compileEditChatGPT = (ir) => {
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

export const compileEditMidjourney = (ir, state) => {
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
