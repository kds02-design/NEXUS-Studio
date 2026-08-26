#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const [category, outputArg] = process.argv.slice(2);
if (!category || !outputArg) throw new Error('Usage: node scripts/build-render-matrix-category-prompt.mjs <gold|steel|ice|lava|banner|variety>[-N] <output>');

const groups = {
  gold: [
    ['고대 유물', 'DarkSmith; antique gold, ancient erosion, time-worn oxidation, restrained golden dust'],
    ['전투 흔적', 'DarkSmith; antique gold, blade scratches, dents, shallow battle fractures'],
    ['성스러운 황금', 'Premium; matte 24K gold, hairline front bevel, refined micro-grain, subtle white rim and sacred glints'],
    ['제국 황금', 'Cinematic; dense matte gold, micro-chiseled front face, micro scratches, restrained golden dust and strong rim'],
    ['금박 스티커', 'Premium; paper-thin mirror hot-stamped gold foil, flat front, micro wrinkles and white hairline rim'],
    ['낡은 금박 (성경책)', 'Alchemist; aged gilt, flat front, micro-grain, time-worn rubbed edges and muted-gold rim'],
    ['낡은 금박 · 들뜸', 'Alchemist; aged gilt, flat front, tiny lifted foil edges, bubbles, curled flakes and muted-gold rim'],
    ['모던 다크 골드', 'Cinematic; brushed muted matte gold, micro bevel, shallow depth, micro scratches and strong muted-gold hairline rim'],
  ],
  steel: [
    ['칼날 강철', 'Cinematic; bright hardened blade steel, hairline bevel, fine battle scratches'],
    ['기사 투구', 'DarkSmith; dark gothic steel, hammered finish, time-worn erosion'],
    ['헤비 브러시드 강철', 'Cinematic; dense industrial steel, strong directional brushing, micro scratches'],
    ['서릿발 강철', 'DarkSmith; cold gothic steel, micro-chiseled erosion, restrained frost and cold mist'],
    ['하이테크 기하학 스틸', 'Cinematic; polished silver, clean crystalline front, precise geometric milling, shallow depth, subtle blue hairline rim and restrained glint'],
  ],
  ice: [
    ['빙하 수정', 'Alchemist; pale opaque glacier crystal, fine front facets, moderate cold mist'],
    ['심연 얼음', 'Alchemist; deep obsidian navy ice, blue-white fissures, restrained dark aura'],
    ['얼음 유물', 'DarkSmith; aged frosted ice, shallow cracks, ancient erosion and subtle cold mist'],
    ['북극 파편', 'Cinematic; bright opaque blue-white polar ice, clean sharp front facets, subtle sparkles'],
  ],
  lava: [
    ['용암 맥', 'DarkSmith; volcanic rock, recessed thin glowing magma veins, sparse edge embers'],
    ['열화 강철', 'DarkSmith; dark forged gothic steel, micro-grain, fine scratches, minimal red heat between strokes'],
  ],
  banner: [
    ['시즌 메인 · 실버 골드', 'Premium; bright polished silver front face, shallow raised ridge contained inside the face, thin irregular warm muted-gold hairline edge, restrained star glints, very low relief and high banner readability'],
    ['대형 업데이트 · 로열 골드', 'Cinematic; semi-gloss 24K royal gold front face, fine micro-chiseled detail, subtle neutral-white hairline edge and restrained golden glints'],
    ['다크 판타지 · 흑요석', 'DarkSmith; bright black-chrome dark titanium front face with broad readable silver reflections, refined micro-grain, sparse scratches and a thin blood-red hairline edge; never crush the face to black'],
    ['신규 시즌 · 실버 블루', 'Premium; bright polished silver front face, shallow raised ridge contained inside the face and a thin ice-blue hairline edge; clean cool light, no fog'],
    ['기념 이벤트 · 아이보리 골드', 'Premium; warm opaque pearl-ivory enamel front face, satin nacre sheen and a thin champagne muted-gold hairline edge; elegant anniversary finish'],
    ['보상 이벤트 · 크림슨 골드', 'Cinematic; vivid opaque crimson enamel front face with controlled ruby reflections and a thin warm-gold hairline edge; high small-banner contrast'],
    ['동양 판타지 · 비취 골드', 'Artifact; pale opaque celadon jade ceramic front face, subtle mineral clouding contained inside the strokes and a thin muted-gold hairline edge'],
    ['여름 이벤트 · 아쿠아 실버', 'Premium; bright aqua-blue glass front face with a frosted opaque core, contained water highlights and a thin silver-white hairline edge; no transparent holes'],
  ],
  variety: [
    ['미래 이벤트 · 홀로그램 크롬', 'Tech; bright satin silver chrome front face with restrained cyan, violet and rose interference bands contained only inside the strokes, thin white edge'],
    ['사이버 이벤트 · 네온 글라스', 'Tech; opaque midnight glass front face with clean cyan and magenta luminous channels inset inside the strokes, crisp blue edge, no exterior bloom or fog'],
    ['전통 이벤트 · 다크 월넛 목각', 'Artifact; premium dark walnut front face, fine grain following the strokes, shallow carved highlights and a thin warm honey edge; no signboard'],
    ['모험 이벤트 · 엠보스 가죽', 'Artifact; dense oxblood full-grain leather front face, refined micro-pebble texture, pressed highlights and a thin muted brass edge; no leather patch or plaque'],
    ['캐주얼 이벤트 · 페이퍼 컷', 'Clean; premium warm-white art-paper front face with subtle cotton fibers and precision-cut edges, completely flat, no stacked rear paper layers'],
    ['축제 이벤트 · 캔디 레진', 'Playful; glossy coral candy-resin front face with an opaque luminous core and smooth rounded internal highlights, thin white edge, no exterior blob'],
  ],
};

groups.gold_a = groups.gold.slice(0, 5);
groups.gold_b = groups.gold.slice(5);

let items = groups[category];
let singleNumber = null;
if (!items) {
  const match = category.match(/^(gold|steel|ice|lava|banner|variety)-(\d+)$/);
  if (match) {
    const index = Number(match[2]) - 1;
    if (groups[match[1]]?.[index]) {
      items = [groups[match[1]][index]];
      singleNumber = index + 1;
    }
  }
}
if (!items) throw new Error(`Unknown category: ${category}`);
const cols = items.length === 1 ? 1 : items.length === 5 ? 5 : 2;
const rows = Math.ceil(items.length / cols);
const numberOffset = singleNumber ? singleNumber - 1 : category === 'gold_b' ? 5 : 0;
const list = items.map(([label, spec], i) => `${i + 1 + numberOffset}. ${label}: ${spec}.`).join('\n');
const prompt = singleNumber
  ? `[RENDER MATRIX SINGLE PRESET]\n\nUse the supplied black-and-white image as an immutable shape mask for the exact Korean title 렌더. The only Korean text permitted in the output is 렌더. Render exactly ONE isolated title, centered once on a uniform pure-black 1K canvas, at the same scale, spacing, safe margins and perfectly straight-on telephoto view as the input.\n\nMATERIAL DIRECTION:\n${items[0][1]}.\n\nRENDER MATRIX CONTRACT:\n- Locked edit budget. The director persona affects ONLY material finish, lighting, color grading and restrained FX.\n- Preserve every supplied glyph contour, gap, stroke terminal and proportion. Do not redraw, normalize, simplify, widen or squeeze the typography.\n- ProjectionDepth None: zero rear extrusion, zero side walls, zero body thickness, no offset silhouette, no backing plate and no cast shadow. Any bevel, carving, facet, crack or emboss exists entirely inside the front face.\n- Material exists ONLY inside the supplied white glyph silhouette. Every corner and every pixel outside the title remains uniform pure #000000. Never switch to white, gray, a checkerboard, or a studio backdrop.\n- No preset label, number, caption, subtitle or any additional text in the rendered image. Labels are added later outside the renderer.\n- Render the supplied title exactly once.\n\nFINAL NEGATIVE LOCK: no comparison sheet, no grid, no tile, no panel, no plaque, no slab, no signboard, no frame, no border, no pedestal, no material rectangle, no white background, no gradient backdrop, no altered Hangul, no font substitution, no duplicated title, no chunky 3D text, no perspective angle, no rear body, no visible side planes, no filled gaps, no crop.`
  : `[RENDER MATRIX CATEGORY CONTACT SHEET — ${category.toUpperCase()}]\n\nUse the supplied black-and-white image as an immutable shape mask for the exact Korean title 렌더. Create a single landscape 1K comparison board with ${cols} columns and ${rows} rows, equal pure-black tiles. Repeat the exact supplied silhouette once in every tile at identical scale, spacing, safe margins and perfectly straight-on telephoto view. Add the numbered Korean preset label beneath each tile in small neutral-white type.\n\nPRESET CELLS:\n${list}\n\nRENDER MATRIX CONTRACT:\n- Locked edit budget. Each cell uses its stated director persona only for material finish, lighting, color grading and restrained FX.\n- Preserve every supplied glyph contour, gap, stroke terminal and proportion. Do not redesign or normalize the typography.\n- ProjectionDepth None: zero rear extrusion, zero side walls, zero body thickness, no offset silhouette, no backing plate and no cast shadow. Any bevel, carving, facet, crack or emboss exists entirely inside the front face.\n- Pure black background. Material and light may not leak outside the title except the explicitly restrained particles or mist.\n- Render each preset exactly once, in the listed order. No additional title, translation, subtitle, emblem, frame, scenery or watermark.\n\nFINAL NEGATIVE LOCK: no altered Hangul, no font substitution, no duplicated cell, no missing cell, no chunky 3D text, no perspective angle, no rear body, no visible side planes, no filled gaps, no crop.`;

const output = path.resolve(outputArg);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, prompt);
console.log(output);
