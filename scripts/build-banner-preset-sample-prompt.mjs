#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const opt = {};
for (let i = 0; i < argv.length; i += 2) opt[argv[i].replace(/^--/, '')] = argv[i + 1];
if (!opt.preset || !opt.output) throw new Error('Missing --preset or --output');

const presets = {
  royal: {
    label: '대형 업데이트 · 로열 골드',
    material: 'dense semi-gloss 24-karat royal gold with controlled warm reflections, precise micro-chiseled front face, refined micro-grain, bright jewelry-grade highlights',
    edge: 'razor-thin pale highlight on the outermost edge',
    lighting: 'cinematic upper-left key light with restrained golden dust only at the immediate edges',
  },
  reward: {
    label: '보상·상점 · 레드 골드',
    material: 'deep premium crimson vitreous enamel on the front face, glossy ruby reflections, clean shallow raised emboss contained inside the strokes',
    edge: 'thin structural muted 24-karat gold edge, crisp and even without expanding the silhouette',
    lighting: 'clean commercial key light with only a few pinpoint star glints at corners',
  },
  mystic: {
    label: '판타지 이벤트 · 비취',
    material: 'polished pale jade ceramic, elegant celadon body, restrained milky mineral clouding contained inside the strokes, solid opaque readable core',
    edge: 'hairline muted-gold edge with a micro-bevel only on the front face',
    lighting: 'soft premium key light with extremely sparse tiny particles between letters',
  },
  summer: {
    label: '여름 이벤트 · 아쿠아',
    material: 'bright aqua-blue architectural glass with a frosted opaque core, clean cyan refraction and fine crystalline facets contained inside the front face',
    edge: 'hairline neutral-white edge highlight without any side wall',
    lighting: 'fresh cool studio light with tiny controlled sparkles and clean readable midtones',
  },
  clean: {
    label: '공지·서브카피 · 펄 아이보리',
    material: 'warm ivory pearl enamel with fine satin nacre sheen, opaque pristine body and restrained champagne reflection',
    edge: 'microscopic champagne hairline bevel contained inside the front-face silhouette',
    lighting: 'soft neutral studio light, no particles, no glow, calm and highly readable',
  },
};

const preset = presets[opt.preset];
if (!preset) throw new Error(`Unknown preset: ${opt.preset}`);
const exactText = opt.text
  ? `The exact Korean text is ${JSON.stringify(opt.text)}. It must remain character-for-character identical, in one single horizontal line, and appear exactly once. `
  : '';
const prompt = `[RENDER MATRIX — ${preset.label} — SHAPE-ONLY SOURCE]\n\nUse the supplied flat black-and-white typography image as an immutable shape mask. ${exactText}Preserve the exact white silhouette, every Korean glyph, counter, stroke terminal, spacing, line count, scale, and canvas placement. Render the composition exactly once.\n\nPRESET MATERIAL:\n- ${preset.material}.\n- ${preset.edge}.\n- ${preset.lighting}.\n- Apply all material and light strictly inside the existing white letter shapes.\n\nDEPTH CONTRACT:\n- Flat2D projection with front-face surface treatment only.\n- Absolutely zero rear extrusion, zero side walls, zero letter-body thickness, zero offset silhouette, and zero backing shadow.\n- A perfectly straight-on telephoto view. Any bevel, ridge, facet, or emboss exists only inside the front face and may not expand the outer silhouette.\n\nBACKGROUND:\n- Perfectly uniform pure black background from corner to corner.\n- No scenery, plaque, frame, emblem, subtitle, extra text, second line, translation, phonetic spelling, repeated title, broad glow, drop shadow, cast shadow, watermark, or background texture.\n\nFINAL LOCK:\nThe output silhouette must remain pixel-faithful to the supplied white mask. Do not redraw, improve, simplify, widen, squeeze, or substitute the typography.`;

const output = path.resolve(opt.output);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, prompt);
console.log(output);
