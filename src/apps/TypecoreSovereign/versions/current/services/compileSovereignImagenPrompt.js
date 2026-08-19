const cleanPromptToken = (value) => String(value || '')
  .replace(/\(([^()]+?):\s*[\d.]+\)/g, '$1')
  .replace(/\bNO\s+/gi, 'avoid ')
  .replace(/\s+/g, ' ')
  .trim();

export function compileSovereignImagenPrompt({
  ir,
  isEnhanceModeEnabled = true,
  enhanceMode = 'refine',
  surroundingMode = 'Clean',
}) {
  if (!ir?.inputText || !ir?.activeCoreData) throw new Error('Sovereign prompt IR requires inputText and activeCoreData');
  const G = cleanPromptToken;
  const renderSurface = (ir.hasTexture || ir.hasDamage)
    ? `Apply only this flat, ink-like surface treatment inside the letter silhouettes: ${G(ir.surfaceEn)}. It must not create lighting, depth, bevels, or realistic material volume.`
    : 'Use a perfectly uniform, opaque, matte fill with clean vector-like edges and no surface modulation.';
  const renderSurrounding = surroundingMode === 'Clean'
    ? 'Keep the area around the typography completely empty. Do not add symbols, particles, debris, frames, or scenery.'
    : `Use the selected surrounding element sparingly and keep it clearly secondary to the readable title: ${G(ir.mmoSurroundingElementEn)}.`;

  return `Create one production-ready flat 2D typography logo asset.

TEXT — highest priority:
Render exactly this text and nothing else: "${ir.inputText}". Preserve every character, spelling, line break, and reading order. Do not add, omit, translate, or substitute characters.

LETTERFORM DESIGN:
Create custom-drawn letterforms based on ${ir.activeCoreData.shortTitle}. ${G(ir.activeCoreData.language)}. ${ir.shapeStyleEn ? `Shape direction: ${G(ir.shapeStyleEn)}.` : ''} Use ${G(ir.weightEn)}, ${G(ir.widthEn)}, ${G(ir.proportionEn)}, ${G(ir.kerningEn)}, ${G(ir.letterConnEn)}, and ${G(ir.internalSpaceEn)}. Edge treatment: ${G(ir.terminalEn)}, ${G(ir.sharpnessEn)}, ${G(ir.cornerEn)}, ${G(ir.extensionEn)}. ${ir.userAuraEn !== 'Standard deployment' ? `Creative intent: ${G(ir.userAuraEn)}.` : ''}

CONTROLLED MODIFICATION:
${isEnhanceModeEnabled ? `Use ${enhanceMode} mode within a ${ir.modIntensityEn} change budget. Allowed: ${G(ir.modAllowedEn)} Forbidden: ${G(ir.modForbiddenEn)} Maintain at least ${ir.readabilityFloorEn} readability.` : 'Keep the structure controlled, coherent, and highly readable.'} ${ir.momentumActive ? `Apply controlled motion through ${G(ir.kineticEn)}, ${G(ir.slantEn)}, and ${G(ir.slicingEn)}, without changing the text.` : ''}

COMPOSITION:
${ir.cgTextInstruction}. ${G(ir.layoutEn)} ${G(ir.mmoSilhouetteEn)}. The typography occupancy is ${G(ir.occupancyEn)}. Use ${ir.aspectRatio} canvas framing and keep comfortable margins on every side.

COLOR AND SURFACE:
${ir.bgDescEn}. Use exactly two flat colors with hard separation. ${renderSurface}

SURROUNDINGS:
${renderSurrounding}

ABSOLUTE RESTRICTIONS:
This is a front-facing flat graphic, not a photograph and not a 3D render. Do not create extrusion, bevel, embossing, perspective, shadows, highlights, gradients, glow, bloom, atmospheric effects, realistic materials, environmental backgrounds, mockups, or extra text. Keep the native uniform solid background and a crisp, readable silhouette suitable for later material rendering.`;
}
