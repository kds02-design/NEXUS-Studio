#!/usr/bin/env node
// Mask Forge 이펙트 커브 투명화 — NEXUS Studio 앱의 src/lib/effectExtract.js(extractEffectPixels)를 그대로 호출한다.
// PowerShell/Python 재구현 대신 이 스크립트를 쓰면 앱·MCP(nexus_extract_effect)와 픽셀 단위로 같은 결과가 나온다.
// 사용: node maskforge_effect_transparency.mjs --input fx.png --output fx_alpha.png [--report fx.qa.json]
//       [--bg black|#rrggbb|auto] [--cutoff 6] [--gamma 0.85] [--opacity 100] [--no-recover-color] [--trim]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// NEXUS Studio 루트 찾기 — 1) NEXUS_STUDIO_ROOT 2) 스크립트 위치에서 위로 탐색 3) 기본 경로.
function resolveProjectRoot() {
  const probe = (dir) => fs.existsSync(path.join(dir, 'src', 'lib', 'effectExtract.js'));
  const env = process.env.NEXUS_STUDIO_ROOT;
  if (env && probe(env)) return path.resolve(env);
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i += 1) { if (probe(dir)) return dir; const parent = path.dirname(dir); if (parent === dir) break; dir = parent; }
  const fallback = 'C:/work/00_claude';
  if (probe(fallback)) return fallback;
  throw new Error('NEXUS Studio 루트를 찾지 못했습니다. NEXUS_STUDIO_ROOT 환경변수를 설정하세요.');
}
const projectRoot = resolveProjectRoot();
const lib = (rel) => import(pathToFileURL(path.join(projectRoot, rel)).href);
const canvasMod = () => import(pathToFileURL(path.join(projectRoot, 'node_modules', '@napi-rs', 'canvas', 'index.js')).href);

const argv = process.argv.slice(2), opt = {};
for (let i = 0; i < argv.length; i += 1) {
  const t = argv[i]; if (!t.startsWith('--')) continue;
  const k = t.slice(2);
  if (k === 'no-recover-color' || k === 'trim') opt[k] = true; else opt[k] = argv[++i];
}
if (!opt.input || !opt.output) { console.error('Usage: --input in.png --output out.png [--report qa.json] [--bg black] [--cutoff 6] [--gamma 0.85] [--opacity 100] [--no-recover-color] [--trim]'); process.exit(2); }

const { EFFECT_DEFAULTS, extractEffectPixels } = await lib('src/lib/effectExtract.js');
const { detectBg, alphaTrimBox, cropPixels, toRgb } = await lib('src/lib/colorKeyExtract.js');
const { createCanvas, loadImage } = await canvasMod();

const img = await loadImage(path.resolve(opt.input));
const cv = createCanvas(img.width, img.height); const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0);
const src = ctx.getImageData(0, 0, img.width, img.height);
const bgArg = opt.bg || 'black';
const bg = bgArg === 'auto' ? detectBg(src.data, src.width, src.height) : (bgArg === 'black' ? [0, 0, 0] : toRgb(bgArg));
const params = {
  cutoff: opt.cutoff != null ? Number(opt.cutoff) : EFFECT_DEFAULTS.cutoff,
  gamma: opt.gamma != null ? Number(opt.gamma) : EFFECT_DEFAULTS.gamma,
  opacity: opt.opacity != null ? Number(opt.opacity) : EFFECT_DEFAULTS.opacity,
  recoverColor: !opt['no-recover-color'],
  bg,
};
const fx = extractEffectPixels({ data: src.data, width: src.width, height: src.height }, params);
const box = opt.trim ? alphaTrimBox(fx.data, fx.width, fx.height) : null;
const result = box ? cropPixels(fx, box) : fx;
const out = createCanvas(result.width, result.height); const octx = out.getContext('2d');
const od = octx.createImageData(result.width, result.height); od.data.set(result.data); octx.putImageData(od, 0, 0);
fs.mkdirSync(path.dirname(path.resolve(opt.output)), { recursive: true });
fs.writeFileSync(path.resolve(opt.output), out.toBuffer('image/png'));
const q = fx.qa; const visible = q.partialPixels + q.opaquePixels;
const report = {
  input: path.resolve(opt.input), output: path.resolve(opt.output), engine: 'nexus-studio/src/lib/effectExtract.js',
  params: { ...params, bg: { r: bg[0], g: bg[1], b: bg[2] }, trim: !!opt.trim, cropBox: box || null },
  size: { width: result.width, height: result.height }, qa: { ...q, coverage: q.totalPixels ? visible / q.totalPixels : 0 },
  warnings: [
    ...(q.transparentPixels === 0 ? ['완전 투명 픽셀 없음 — 매트 색/ cutoff 확인'] : []),
    ...(visible === 0 ? ['남은 이펙트 없음'] : []),
  ],
};
if (opt.report) { fs.mkdirSync(path.dirname(path.resolve(opt.report)), { recursive: true }); fs.writeFileSync(path.resolve(opt.report), JSON.stringify(report, null, 2) + '\n'); }
console.log(JSON.stringify({ output: report.output, width: result.width, height: result.height, qa: report.qa, warnings: report.warnings }));
