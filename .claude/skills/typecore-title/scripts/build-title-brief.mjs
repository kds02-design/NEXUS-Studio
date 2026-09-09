import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const get = (name, fallback = '') => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const text = get('text').trim();
if (!text) throw new Error('--text is required');
const concept = get('concept', 'production-ready Korean game title');
const geometryPlanPath = get('geometry-plan');
const explicitRatio = get('ratio');
const proxyRecompose = args.includes('--proxy-recompose');
const requested = get('engine', 'auto').toLowerCase();
const breezeRx = /casual|cute|friendly|festival|sticker|rounded|brush|calligraph|soft|flower|wind|water|캐주얼|귀여|축제|스티커|둥근|붓|캘리|부드|꽃|바람|물/i;
const engine = requested === 'auto' ? (breezeRx.test(concept) ? 'breeze' : 'sovereign') : requested;
if (!['sovereign', 'breeze'].includes(engine)) throw new Error('--engine must be auto, sovereign, or breeze');

const normalizedText = text.replace(/\\n/g, '\n').normalize('NFC');
let geometryPlan = null;
if (geometryPlanPath) {
  const resolvedPlanPath = path.resolve(geometryPlanPath);
  geometryPlan = JSON.parse(fs.readFileSync(resolvedPlanPath, 'utf8'));
  if (!['typecore-title-geometry-plan/v1', 'typecore-title-geometry-plan/v2'].includes(geometryPlan?.schema) || geometryPlan?.status !== 'planned' || !geometryPlan?.selected) {
    throw new Error(`Geometry plan must be a planned typecore-title-geometry-plan artifact: ${resolvedPlanPath}`);
  }
  const inputKey = normalizedText.replace(/\s*\r?\n\s*/g, ' ').trim();
  if (geometryPlan.exactText !== inputKey) throw new Error('Geometry plan exactText does not match --text');
}
if (!geometryPlan && !explicitRatio) {
  throw new Error('Use --geometry-plan <title-geometry-plan.json>; --ratio is allowed only as an explicit legacy override');
}
if (proxyRecompose && (!geometryPlan?.proxyRecomposition?.eligible || !geometryPlan?.proxyRecomposition?.candidate)) {
  throw new Error('--proxy-recompose requires an eligible passing single-line geometry plan');
}
const lines = proxyRecompose
  ? geometryPlan.proxyRecomposition.candidate.rows
  : geometryPlan
    ? geometryPlan.selected.rows
  : (normalizedText.includes('\n') ? normalizedText.split(/\r?\n/).map(s => s.trim()).filter(Boolean) : [normalizedText]);
const ratio = geometryPlan
  ? (geometryPlan.renderCanvas?.aspectRatio || geometryPlan.selected.canvasAspectRatio || geometryPlan.selected.outputRatio)
  : explicitRatio;
const activeGeometry = proxyRecompose ? geometryPlan.proxyRecomposition.candidate : geometryPlan?.selected;
const placement = activeGeometry?.renderPlacement || null;
const style = engine === 'sovereign'
  ? 'custom MMORPG title lettering with a strong silhouette, disciplined stroke hierarchy, controlled ornamental detail'
  : 'custom casual or calligraphic title lettering with expressive rhythm, friendly silhouette, controlled decorative detail';

const brief = {
  version: 2,
  engine,
  sourceLogic: engine === 'sovereign' ? 'Typecore Sovereign' : 'Typecore Breeze',
  generationMode: proxyRecompose ? 'two-row-proxy-for-single-line-recomposition' : 'direct-shape',
  exactText: normalizedText.replace(/\s*\r?\n\s*/g, ' '),
  lines,
  concept,
  ratio,
  geometryPlan: geometryPlan ? {
    schema: geometryPlan.schema,
    titleLength: geometryPlan.titleLength,
    lengthClass: geometryPlan.lengthClass,
    slot: geometryPlan.slot,
    lineCount: geometryPlan.selected.lineCount,
    rows: geometryPlan.selected.rows,
    horizontalScale: geometryPlan.selected.horizontalScale,
    verticalScale: geometryPlan.selected.verticalScale,
    glyphAspectRatios: geometryPlan.selected.glyphAspectRatios,
    meanGlyphAspectRatio: geometryPlan.selected.meanGlyphAspectRatio,
    artworkRatio: geometryPlan.selected.artworkRatio,
    canvasAspectRatio: ratio,
    slotPlacement: geometryPlan.selected.slotPlacement,
    renderPlacement: geometryPlan.selected.renderPlacement,
    nonProportionalScaling: geometryPlan.selected.nonProportionalScaling,
    requiresSemanticApproval: geometryPlan.selected.requiresSemanticApproval
  } : {legacyExplicitRatio: true},
  proxyRecomposition: proxyRecompose ? {
    sourceRows: geometryPlan.proxyRecomposition.candidate.rows,
    sourceArtworkRatio: geometryPlan.proxyRecomposition.candidate.artworkRatio,
    finalRows: geometryPlan.selected.rows,
    finalArtworkRatio: geometryPlan.selected.artworkRatio,
    canvasAspectRatio: ratio,
    verticalScale: 1,
    requiredPostProcess: 'recompose-title-line.py',
    materialBeforeRecompositionAllowed: false
  } : null,
  occupancy: placement ? {
    width: placement.widthOccupancy,
    height: placement.heightOccupancy,
    topBottomMargin: placement.topBottomMargin
  } : {legacy: '70%'},
  prompt: [
    `[TEXT LOCK] Render exactly: "${lines.join(' / ')}". Preserve every Korean syllable and spacing.`,
    `[CANVAS LOCK] Render canvas aspect ratio ${ratio}. This canvas ratio is not the visible title artwork ratio.`,
    ...(activeGeometry && placement ? [`[VISIBLE TITLE GEOMETRY] ${lines.length} row(s), visible artwork ratio about ${activeGeometry.artworkRatio}:1, width occupancy ${(placement.widthOccupancy * 100).toFixed(1)}%, height occupancy ${(placement.heightOccupancy * 100).toFixed(1)}%, top and bottom margin about ${(placement.topBottomMargin * 100).toFixed(1)}% each.`] : [`[LAYOUT LOCK] ${lines.length} row(s), aspect ratio ${ratio}.`]),
    '[GLYPH PROPORTION LOCK] Preserve natural near-square Hangul skeletons. Do not narrow glyph width, use condensed/tall letterforms, squeeze tracking to disguise overflow, or stretch individual glyphs. Fit the whole title through uniform scaling and canvas whitespace.',
    ...(proxyRecompose ? ['[PROXY LOCK] This is an intermediate two-row flat shape source. Keep both rows at identical glyph height, weight, and scale. Do not add row-specific hierarchy; the rows will be translated into one line without distortion before material rendering.'] : []),
    `[TYPECORE ENGINE] ${style}.`,
    `[ART DIRECTION] ${concept}.`,
    '[READABILITY] Commercial game-publishing quality; readable at banner size; no missing, substituted, duplicated, or romanized characters.',
    '[ISOLATION] Typography artwork only. No character, landscape, UI, logo, date, subtitle, mockup, frame, or unrelated words.',
    '[COMPOSITING] Solid uniform pure-black background (#000000). Generate the lettering body without glow or cast light; lighting effects will be handled after approval.'
  ].join('\n'),
  negativePrompt: 'misspelled Hangul, extra text, English translation, character, scenery, checkerboard pattern, non-black background, merged glow, illegible distortion',
  handoff: {
    sourceApp: engine === 'sovereign' ? 'typecore-sovereign' : 'typecore-breeze',
    targetApp: 'render-metrics',
    preferredMode: engine === 'sovereign' ? 'pipeline' : 'creation',
    requireBaseImageImport: true,
    candidateCount: 2,
    requireExplicitApproval: true,
    immutableReference: 'title-flat-approved.png'
  },
  deliverables: proxyRecompose
    ? ['title-flat-proxy-2row-a.png', 'title-flat-proxy-2row-b.png', 'title-flat-recomposed-1row.png', 'title-proxy-recomposition.json', 'title-brief.json', 'render-matrix-handoff.json']
    : ['title-flat-a.png', 'title-flat-b.png', 'title-flat-approved.png', 'title-brief.json', 'render-matrix-handoff.json']
};

const output = get('output');
const json = JSON.stringify(brief, null, 2);
if (output) {
  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  fs.writeFileSync(output, json, 'utf8');
}
process.stdout.write(json + '\n');
