import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const get = (name, fallback = '') => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] !== undefined ? args[index + 1] : fallback;
};

const exactText = get('text').replace(/\\n/g, '\n').trim().normalize('NFC');
if (!exactText) throw new Error('--text is required');

const numberArg = (name, fallback) => {
  const parsed = Number(get(name, fallback));
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`--${name} must be a positive number`);
  return parsed;
};
const ratioArg = (name, fallback) => {
  const value = get(name, fallback).trim();
  const match = value.match(/^([0-9]*\.?[0-9]+)(?::([0-9]*\.?[0-9]+))?$/);
  if (!match) throw new Error(`--${name} must be a ratio such as 2.76:1`);
  const width = Number(match[1]);
  const height = Number(match[2] || 1);
  if (!(width > 0 && height > 0)) throw new Error(`--${name} must be a positive ratio`);
  return {label: `${Number(width.toFixed(4))}:${Number(height.toFixed(4))}`, value: width / height};
};

const slotWidth = numberArg('slot-width');
const slotHeight = numberArg('slot-height');
const renderCanvasRatio = ratioArg('render-canvas-ratio', '2.76:1');
const preferredWidthOccupancy = numberArg('width-occupancy', 0.9);
const maxHeightOccupancy = numberArg('max-height-occupancy', 0.9);
const minRenderHeightOccupancy = numberArg('min-render-height-occupancy', 0.18);
const minGlyphHeight = numberArg('min-glyph-height', 32);
const minGlyphAspectRatio = numberArg('min-glyph-aspect-ratio', 0.78);
const maxGlyphAspectRatio = numberArg('max-glyph-aspect-ratio', 1.15);
const rowGapRatio = numberArg('row-gap-ratio', 0.12);
const proxyMinLength = numberArg('proxy-min-length', 9);
const requestedLines = get('lines', 'auto').toLowerCase();
if (!['auto', '1', '2'].includes(requestedLines)) throw new Error('--lines must be auto, 1, or 2');
if (preferredWidthOccupancy > 1 || maxHeightOccupancy > 1 || minRenderHeightOccupancy > 1) {
  throw new Error('occupancy arguments must be between 0 and 1');
}
if (minGlyphAspectRatio >= maxGlyphAspectRatio) throw new Error('minimum glyph aspect ratio must be below maximum');

const segmenter = new Intl.Segmenter('ko', {granularity: 'grapheme'});
const graphemes = (text) => [...segmenter.segment(text)].map(({segment}) => segment);
const visibleGraphemes = (text) => graphemes(text).filter((item) => !/^\s$/u.test(item));
const advance = (item) => {
  if (/^\s$/u.test(item)) return 0.34;
  if (/^[가-힣ㄱ-ㅎㅏ-ㅣ]$/u.test(item)) return 0.92;
  if (/^[A-Z]$/u.test(item)) return 0.7;
  if (/^[a-z]$/u.test(item)) return 0.56;
  if (/^[0-9]$/u.test(item)) return 0.58;
  if (/^[.,:;!?·'"()\[\]{}\-_/]$/u.test(item)) return 0.4;
  return 0.9;
};
const lineAdvance = (line) => {
  const items = graphemes(line);
  return items.reduce((sum, item) => sum + advance(item), 0) + Math.max(0, items.length - 1) * 0.025;
};
const lineGlyphAspectRatio = (line) => {
  const items = visibleGraphemes(line);
  if (!items.length) return 0;
  return items.reduce((sum, item) => sum + advance(item), 0) / items.length;
};
const round = (value, digits = 4) => Number(value.toFixed(digits));

const explicitRows = exactText.includes('\n')
  ? exactText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  : null;
if (explicitRows && explicitRows.length > 2) throw new Error('At most two explicit title rows are supported');

const splitCandidates = (text) => {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return Array.from({length: words.length - 1}, (_, index) => ({
      rows: [words.slice(0, index + 1).join(' '), words.slice(index + 1).join(' ')],
      breakKind: 'word-boundary',
      requiresSemanticApproval: false
    }));
  }

  const items = graphemes(text);
  if (items.length < 4) return [];
  return Array.from({length: Math.max(0, items.length - 3)}, (_, index) => {
    const splitAt = index + 2;
    return {
      rows: [items.slice(0, splitAt).join(''), items.slice(splitAt).join('')],
      breakKind: 'grapheme-balance-proposal',
      requiresSemanticApproval: true
    };
  });
};

const evaluate = (rows, metadata = {}) => {
  const lineCount = rows.length;
  const normalizedHeight = lineCount + Math.max(0, lineCount - 1) * rowGapRatio;
  const advances = rows.map(lineAdvance);
  const normalizedWidth = Math.max(...advances);
  const artworkRatio = normalizedWidth / normalizedHeight;

  // Preserve the natural glyph skeleton. Fit the whole title uniformly; never narrow glyph width to fill the slot.
  const uniformScale = Math.min(
    slotWidth / normalizedWidth,
    slotHeight * maxHeightOccupancy / normalizedHeight
  );
  const visibleWidth = normalizedWidth * uniformScale;
  const visibleHeight = normalizedHeight * uniformScale;
  const slotWidthOccupancy = visibleWidth / slotWidth;
  const slotHeightOccupancy = visibleHeight / slotHeight;

  // Canvas ratio and visible-art ratio are independent. Long one-line titles intentionally use more top/bottom whitespace.
  const renderWidthOccupancy = Math.min(
    preferredWidthOccupancy,
    maxHeightOccupancy * artworkRatio / renderCanvasRatio.value
  );
  const renderHeightOccupancy = renderWidthOccupancy * renderCanvasRatio.value / artworkRatio;
  const topBottomMargin = Math.max(0, (1 - renderHeightOccupancy) / 2);
  const glyphAspectRatios = rows.map(lineGlyphAspectRatio);
  const meanGlyphAspectRatio = glyphAspectRatios.reduce((sum, value) => sum + value, 0) / glyphAspectRatios.length;

  const glyphAspectPass = glyphAspectRatios.every((value) => value >= minGlyphAspectRatio && value <= maxGlyphAspectRatio);
  const pixelHeightPass = uniformScale >= minGlyphHeight;
  const renderHeightPass = renderHeightOccupancy >= minRenderHeightOccupancy;
  const capacityPass = glyphAspectPass && pixelHeightPass && renderHeightPass;
  const balancePenalty = lineCount === 2 ? Math.abs(advances[0] - advances[1]) / Math.max(...advances) : 0;
  return {
    rows,
    lineCount,
    breakKind: metadata.breakKind || (lineCount === 1 ? 'single-line' : 'explicit'),
    requiresSemanticApproval: Boolean(metadata.requiresSemanticApproval),
    targetGlyphHeight: round(uniformScale, 2),
    glyphAspectRatios: glyphAspectRatios.map((value) => round(value)),
    meanGlyphAspectRatio: round(meanGlyphAspectRatio),
    horizontalScale: 1,
    verticalScale: 1,
    nonProportionalScaling: false,
    visibleArtworkWidth: round(visibleWidth, 2),
    visibleArtworkHeight: round(visibleHeight, 2),
    artworkRatio: round(artworkRatio),
    canvasAspectRatio: renderCanvasRatio.label,
    outputRatio: renderCanvasRatio.label,
    slotPlacement: {
      widthOccupancy: round(slotWidthOccupancy),
      heightOccupancy: round(slotHeightOccupancy),
      topBottomMargin: round(Math.max(0, (1 - slotHeightOccupancy) / 2))
    },
    renderPlacement: {
      widthOccupancy: round(renderWidthOccupancy),
      heightOccupancy: round(renderHeightOccupancy),
      topBottomMargin: round(topBottomMargin)
    },
    balancePenalty: round(balancePenalty),
    capacityPass,
    rejectionReasons: [
      ...(!glyphAspectPass ? [`mean per-glyph width/height must remain within ${minGlyphAspectRatio}-${maxGlyphAspectRatio}`] : []),
      ...(!pixelHeightPass ? [`natural glyph height ${round(uniformScale, 2)}px is below ${minGlyphHeight}px in the destination slot`] : []),
      ...(!renderHeightPass ? [`render height occupancy ${round(renderHeightOccupancy)} is below ${minRenderHeightOccupancy}`] : [])
    ]
  };
};

const oneLineText = exactText.replace(/\s*\r?\n\s*/g, ' ');
const oneLine = evaluate([oneLineText]);
let considered = [oneLine];
let selected = null;
let twoLineCandidates = [];

if (explicitRows) {
  const explicit = evaluate(explicitRows, {breakKind: 'explicit', requiresSemanticApproval: false});
  considered = [explicit];
  selected = explicit.capacityPass ? explicit : null;
} else if (requestedLines === '1') {
  selected = oneLine.capacityPass ? oneLine : null;
} else {
  twoLineCandidates = splitCandidates(oneLineText).map((candidate) => evaluate(candidate.rows, candidate));
  considered.push(...twoLineCandidates);
  if (requestedLines === '2') {
    selected = twoLineCandidates.filter((candidate) => candidate.capacityPass).sort((a, b) => a.balancePenalty - b.balancePenalty)[0] || null;
  } else {
    selected = oneLine.capacityPass
      ? oneLine
      : twoLineCandidates.filter((candidate) => candidate.capacityPass).sort((a, b) => a.balancePenalty - b.balancePenalty)[0] || null;
  }
}

const titleLength = visibleGraphemes(oneLineText).length;
const proxyCandidate = twoLineCandidates
  .filter((candidate) => candidate.capacityPass)
  .sort((a, b) => a.balancePenalty - b.balancePenalty)[0] || null;
const proxyEligible = Boolean(selected?.lineCount === 1 && titleLength >= proxyMinLength && proxyCandidate);
const result = {
  schema: 'typecore-title-geometry-plan/v2',
  status: selected ? 'planned' : 'blocked',
  exactText: oneLineText,
  titleLength,
  lengthClass: titleLength <= 5 ? 'short' : titleLength <= 8 ? 'medium' : titleLength <= 14 ? 'long' : 'extra-long',
  slot: {width: slotWidth, height: slotHeight},
  renderCanvas: {aspectRatio: renderCanvasRatio.label},
  constraints: {
    minGlyphAspectRatio,
    maxGlyphAspectRatio,
    minGlyphHeight,
    minRenderHeightOccupancy,
    preferredWidthOccupancy,
    maxHeightOccupancy,
    horizontalGlyphCondensationAllowed: false,
    nonProportionalScalingAllowed: false
  },
  requestedLines,
  selected,
  proxyRecomposition: {
    eligible: proxyEligible,
    reason: proxyEligible
      ? 'long final single-line goal passes at natural glyph proportions; a two-row proxy may be generated and recomposed without distortion'
      : (selected?.lineCount !== 1 ? 'final geometry plan is not single-line' : `title is shorter than ${proxyMinLength} graphemes or no valid two-row proxy exists`),
    candidate: proxyEligible ? proxyCandidate : null,
    finalLineCount: selected?.lineCount || null,
    materialBeforeRecompositionAllowed: false
  },
  considered,
  alternatives: selected ? [] : [
    'use a two-row semantic break',
    'separate a qualifier or season token',
    'increase the measured title slot',
    'keep natural glyph proportions and reduce title height only through uniform scaling'
  ]
};

const output = get('output');
const json = `${JSON.stringify(result, null, 2)}\n`;
if (output) {
  fs.mkdirSync(path.dirname(path.resolve(output)), {recursive: true});
  fs.writeFileSync(output, json, 'utf8');
}
process.stdout.write(json);
if (!selected) process.exitCode = 2;
