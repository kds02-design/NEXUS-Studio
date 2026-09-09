#!/usr/bin/env node
// brandweb-lnb — 메뉴 JSON + 스타일(base + variant + override) → lnb-spec.json / figma-code.js / preview.svg
// 사용: node scripts/build-lnb.mjs --menu assets/examples/dowon-menu.json --variant dowon-red-knot --out <dir>
//       [--set style.line.color=#3A0C06 --set structure.rows.pitch1=40] [--pages 01_인덱스,06_삼국지콜라보]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

// ---------- CLI ----------
const argv = process.argv.slice(2);
const opt = { set: [], pages: null, variant: null, menu: null, out: null, styleFile: null };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--menu') opt.menu = argv[++i];
  else if (a === '--variant') opt.variant = argv[++i];
  else if (a === '--style') opt.styleFile = argv[++i];
  else if (a === '--out') opt.out = argv[++i];
  else if (a === '--pages') opt.pages = argv[++i].split(',').map(s => s.trim()).filter(Boolean);
  else if (a === '--set') opt.set.push(argv[++i]);
  else if (a === '-h' || a === '--help') { console.log(fs.readFileSync(new URL(import.meta.url)).toString().split('\n').slice(1, 4).join('\n')); process.exit(0); }
}
if (!opt.menu) { console.error('--menu <menu.json> 필요'); process.exit(1); }
opt.out = opt.out || path.join(process.cwd(), 'lnb-out');
fs.mkdirSync(opt.out, { recursive: true });

// ---------- style resolve ----------
const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const merge = (a, b) => { const o = { ...a }; for (const k of Object.keys(b || {})) o[k] = isObj(a?.[k]) && isObj(b[k]) ? merge(a[k], b[k]) : b[k]; return o; };
const loadStyle = name => {
  if (name === 'base' || !name) return readJson(path.join(ROOT, 'styles', 'base.json'));
  const p = fs.existsSync(name) ? name : path.join(ROOT, 'styles', 'variants', `${name}.json`);
  const v = readJson(p);
  const parent = loadStyle(v.extends || 'base');
  const merged = merge(parent, { structure: v.structure || {}, style: v.style || {} });
  merged.name = v.name; merged.description = v.description; merged.source = v.source; merged.extends = v.extends || 'base';
  return merged;
};
let style = loadStyle(opt.styleFile || opt.variant || 'base');
const coerce = s => (s === 'true' ? true : s === 'false' ? false : s === 'null' ? null : /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : s.startsWith('[') ? JSON.parse(s) : s);
for (const kv of opt.set) {
  const [k, v] = kv.split('=');
  const keys = k.split('.'); let cur = style;
  for (let i = 0; i < keys.length - 1; i++) { cur[keys[i]] = isObj(cur[keys[i]]) ? { ...cur[keys[i]] } : {}; cur = cur[keys[i]]; }
  cur[keys[keys.length - 1]] = coerce(v);
}
const S = style.structure, T = style.style;

// ---------- menu → rows ----------
const menu = readJson(opt.menu);
const flat = [];
for (const it of menu.items) {
  flat.push({ id: it.id, label: it.label, badge: it.badge || null, depth: 1 });
  for (const c of it.children || []) flat.push({ id: c.id, label: (S.rows.subPrefix || '') + c.label, badge: c.badge || null, depth: 2, parent: it.id });
}
const textH = size => Math.round(size * 1.2);
const layoutRows = activeId => {
  let c = 0; const rows = [];
  for (let i = 0; i < flat.length; i++) {
    const r = flat[i], prev = flat[i - 1];
    if (prev) c += prev.depth === 1 && r.depth === 2 ? S.rows.subEnter : prev.depth === 2 && r.depth === 2 ? S.rows.subPitch : prev.depth === 2 && r.depth === 1 ? S.rows.subExit : S.rows.pitch1;
    const active = r.id === activeId;
    const size = active ? T.text.sizeActive : r.depth === 1 ? T.text.size1 : T.text.size2;
    rows.push({ ...r, active, size, h: textH(size), relCenter: c });
  }
  const span = rows[rows.length - 1].relCenter - rows[0].relCenter;
  const firstCenter = S.blockAnchorY - span / 2;
  for (const r of rows) { r.center = Math.round(firstCenter + r.relCenter); r.y = Math.round(r.center - r.h / 2); r.x = S.menuX + (r.depth === 2 ? S.rows.subIndent : 0); }
  const top = rows[0].y, bottom = rows[rows.length - 1].y + rows[rows.length - 1].h;
  const line = T.line.mode === 'block'
    ? { y: rows[0].center - T.line.padTop, h: rows[rows.length - 1].center + T.line.padBottom - (rows[0].center - T.line.padTop) }
    : { y: T.line.y, h: T.line.h };
  const act = rows.find(r => r.active);
  const knots = T.knot.type === 'none' ? [] : rows.filter(r => r.depth === 1 && !(r.active && T.emblem.type !== 'none')).map(r => ({ id: r.id, x: S.lineX - T.knot.size / 2, y: r.center - T.knot.size / 2 }));
  const emblem = act && T.emblem.type !== 'none' ? { x: S.emblemX, y: Math.round(act.center - T.emblem.h / 2), w: T.emblem.w, h: T.emblem.h } : null;
  return { rows, block: { top, bottom, center: (top + bottom) / 2, height: bottom - top }, line: { x: S.lineX - T.line.width / 2, w: T.line.width, ...line }, knots, emblem };
};

const pages = (menu.pages || [{ frame: null, active: menu.active || flat[0].id }]).filter(p => !opt.pages || opt.pages.includes(p.frame));
const spec = { skill: 'brandweb-lnb', builtAt: new Date().toISOString(), style: { name: style.name, extends: style.extends, source: style.source, structure: S, style: T }, menu: { campaign: menu.campaign, game: menu.game, items: flat }, pages: pages.map(p => ({ ...p, layout: layoutRows(p.active) })) };
fs.writeFileSync(path.join(opt.out, 'lnb-spec.json'), JSON.stringify(spec, null, 2));

// ---------- assets ----------
const b64 = rel => rel ? fs.readFileSync(path.isAbsolute(rel) ? rel : path.join(ROOT, rel)).toString('base64') : null;
const IMG = { emblem: T.emblem.type === 'image' ? b64(T.emblem.asset) : null, knot: T.knot.type === 'image' ? b64(T.knot.asset) : null };

// ---------- figma code ----------
const hex = h => { const n = parseInt(h.slice(1), 16); return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }; };
const code = `// brandweb-lnb generated ${spec.builtAt} — style ${style.name}
const SPEC = ${JSON.stringify(spec.pages.map(p => ({ frame: p.frame, active: p.active, layout: p.layout })))};
const S = ${JSON.stringify(S)}; const T = ${JSON.stringify(T)};
const IMG = ${JSON.stringify(IMG)};
const rgb = h => { const n = parseInt(h.slice(1), 16); return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }; };
const stops = (color, arr) => arr.map(([p, a]) => ({ position: p, color: { ...rgb(color), a } }));
const fam = T.text.family;
await figma.loadFontAsync({ family: fam, style: T.text.styleOff });
await figma.loadFontAsync({ family: fam, style: T.text.styleActive });
const imgHash = {}; for (const k of ["emblem", "knot"]) if (IMG[k]) imgHash[k] = figma.createImage(figma.base64Decode(IMG[k])).hash;
const results = [];
for (const P of SPEC) {
  const top = figma.currentPage.children.find(n => n.type === "FRAME" && n.name === P.frame);
  if (!top) { results.push({ frame: P.frame, error: "frame not found" }); continue; }
  const ui = top.children.find(n => n.name.startsWith("공통UI")) || top;
  const old = ui.children.find(n => n.name === "LNB" || n.name.startsWith("LNB "));
  const lnb = figma.createFrame(); lnb.name = "LNB"; lnb.resizeWithoutConstraints(S.frame.w, S.frame.h); lnb.x = S.frame.x; lnb.y = S.frame.y; lnb.fills = []; lnb.clipsContent = false;
  if (old) { ui.insertChild(ui.children.indexOf(old), lnb); old.remove(); } else ui.insertChild(0, lnb);
  const L = P.layout;
  const dim = figma.createRectangle(); dim.name = "lnb-dim"; dim.resize(T.dim.w, S.frame.h); dim.x = 0; dim.y = 0;
  dim.fills = [{ type: "GRADIENT_LINEAR", gradientTransform: [[1, 0, 0], [0, 1, 0]], gradientStops: stops(T.dim.color, T.dim.stops) }]; lnb.appendChild(dim);
  const line = figma.createRectangle(); line.name = "lnb-line"; line.resize(L.line.w, L.line.h); line.x = L.line.x; line.y = L.line.y;
  line.fills = T.line.stops ? [{ type: "GRADIENT_LINEAR", gradientTransform: [[0, 1, 0], [-1, 0, 1]], gradientStops: stops(T.line.color, T.line.stops) }] : [{ type: "SOLID", color: rgb(T.line.color) }]; lnb.appendChild(line);
  const menu = figma.createFrame(); menu.name = "menu"; menu.fills = []; menu.clipsContent = false; menu.resizeWithoutConstraints(300, 10); menu.x = 0; menu.y = 0; lnb.appendChild(menu);
  for (const r of L.rows) {
    const t = figma.createText(); t.name = "nav-" + r.id + (r.active ? " (active)" : ""); t.fontName = { family: fam, style: r.active ? T.text.styleActive : T.text.styleOff };
    t.characters = r.label; t.fontSize = r.size; t.letterSpacing = { unit: "PERCENT", value: T.text.letterSpacing };
    t.fills = [{ type: "SOLID", color: rgb(r.active ? T.text.colorActive : T.text.color) }]; t.opacity = r.active ? T.text.opacityActive : T.text.opacityOff;
    t.x = r.x; t.y = r.y; menu.appendChild(t);
    if (r.badge) { const b = figma.createText(); b.name = "badge-" + r.id; b.fontName = { family: fam, style: T.text.styleOff }; b.characters = r.badge; b.fontSize = T.badge.size; b.letterSpacing = { unit: "PERCENT", value: T.badge.letterSpacing }; b.fills = [{ type: "SOLID", color: rgb(T.badge.color) }]; b.opacity = T.badge.opacity; b.x = r.x + t.width + S.rows.badgeGap; b.y = r.y + S.rows.badgeDy; menu.appendChild(b); }
  }
  for (const k of L.knots) {
    let n; if (T.knot.type === "image" && imgHash.knot) { n = figma.createRectangle(); n.fills = [{ type: "IMAGE", imageHash: imgHash.knot, scaleMode: "FILL" }]; } else { n = figma.createEllipse(); n.fills = [{ type: "SOLID", color: rgb(T.knot.color) }]; }
    n.name = "knot-" + k.id; n.resize(T.knot.size, T.knot.size); n.x = k.x; n.y = k.y; lnb.appendChild(n);
  }
  if (T.glow.enabled && L.emblem) { const gl = figma.createEllipse(); gl.name = "active-glow"; gl.resize(T.glow.size, T.glow.size); gl.x = S.lineX - T.glow.size / 2; gl.y = L.emblem.y + L.emblem.h / 2 - T.glow.size / 2; gl.fills = [{ type: "GRADIENT_RADIAL", gradientTransform: [[1, 0, 0], [0, 1, 0]], gradientStops: [{ position: 0, color: { ...rgb(T.glow.color), a: 0.6 } }, { position: 1, color: { ...rgb(T.glow.color), a: 0 } }] }]; lnb.appendChild(gl); }
  if (L.emblem) { const e = figma.createRectangle(); e.name = "active-emblem"; e.resize(L.emblem.w, L.emblem.h); e.x = L.emblem.x; e.y = L.emblem.y; e.fills = imgHash.emblem ? [{ type: "IMAGE", imageHash: imgHash.emblem, scaleMode: "FIT" }] : [{ type: "SOLID", color: rgb(T.text.colorActive) }]; lnb.appendChild(e); }
  const texts = menu.children.filter(n => n.name.startsWith("nav-"));
  const top0 = Math.min(...texts.map(n => n.y)), bot0 = Math.max(...texts.map(n => n.y + n.height));
  const emblemNode = lnb.children.find(n => n.name === "active-emblem");
  results.push({ frame: P.frame, lnbId: lnb.id, active: P.active, measured: { top: top0, bottom: bot0, center: (top0 + bot0) / 2 }, expectedCenter: S.blockAnchorY, emblemY: L.emblem ? L.emblem.y : null, emblemId: emblemNode ? emblemNode.id : null });
}
return results;`;
fs.writeFileSync(path.join(opt.out, 'figma-code.js'), code);

// ---------- preview svg (first page) ----------
const p0 = spec.pages[0]; const L0 = p0.layout;
const g = (c, arr, x1, y1, x2, y2, id) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${arr.map(([p, a]) => `<stop offset="${p}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="620" height="1080" viewBox="0 0 620 1080"><defs>${g(T.dim.color, T.dim.stops, 0, 0, T.dim.w, 0, 'dim')}${g(T.line.color, T.line.stops || [[0, 1], [1, 1]], 0, L0.line.y, 0, L0.line.y + L0.line.h, 'ln')}</defs>
<rect width="620" height="1080" fill="#5a5750"/><rect width="${T.dim.w}" height="1080" fill="url(#dim)"/>
<rect x="${L0.line.x}" y="${L0.line.y}" width="${L0.line.w}" height="${L0.line.h}" fill="url(#ln)"/>
${L0.knots.map(k => `<rect x="${k.x}" y="${k.y}" width="${T.knot.size}" height="${T.knot.size}" rx="${T.knot.size / 2}" fill="${T.knot.color || '#371310'}"/>`).join('')}
${L0.emblem ? `<rect x="${L0.emblem.x}" y="${L0.emblem.y}" width="${L0.emblem.w}" height="${L0.emblem.h}" fill="#b89a5a"/>` : ''}
${L0.rows.map(r => `<text x="${r.x}" y="${r.y + r.h * 0.78}" font-family="Noto Sans KR, sans-serif" font-size="${r.size}" fill="${r.active ? T.text.colorActive : T.text.color}" fill-opacity="${r.active ? T.text.opacityActive : T.text.opacityOff}">${r.label.replace(/&/g, '&amp;').replace(/</g, '&lt;')}${r.badge ? `<tspan dx="${S.rows.badgeGap}" font-size="${T.badge.size}">${r.badge}</tspan>` : ''}</text>`).join('\n')}
<line x1="0" y1="${S.blockAnchorY}" x2="620" y2="${S.blockAnchorY}" stroke="#0f0" stroke-dasharray="4 4"/><text x="480" y="${S.blockAnchorY - 4}" fill="#0f0" font-size="10">anchor ${S.blockAnchorY}</text>
</svg>`;
fs.writeFileSync(path.join(opt.out, 'preview.svg'), svg);

// ---------- report ----------
console.log(`style ${style.name} (extends ${style.extends})  rows ${flat.length}  pages ${spec.pages.length}`);
for (const p of spec.pages) console.log(`  ${p.frame || '(single)'}  active ${p.active}  block ${p.layout.block.top}~${p.layout.block.bottom} center ${p.layout.block.center}  line y${p.layout.line.y} h${p.layout.line.h}  knots ${p.layout.knots.length}`);
if (IMG.emblem) console.log(`NOTE 엠블럼은 createImage 로 렌더가 안 될 수 있음 → use_figma 결과의 emblemId 로 upload_assets(${T.emblem.asset}) 재업로드`);
console.log(`out: ${opt.out}\\{lnb-spec.json, figma-code.js (${code.length} chars), preview.svg}`);
if (code.length > 50000) console.warn('WARN figma-code.js > 50000 chars — --pages 로 나눠서 실행');
