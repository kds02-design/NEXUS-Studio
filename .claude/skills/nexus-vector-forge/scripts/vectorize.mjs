#!/usr/bin/env node
// nexus-vector-forge — 비트맵(PNG/JPG/WEBP) → SVG 벡터. potrace(Node) 또는 Illustrator Image Trace 엔진.
//
//   node vectorize.mjs <input> [--out <dir>] [--name <base>]
//        [--engine potrace|illustrator]        (기본 potrace)
//        [--preset title|sharp|smooth|detail|clean]
//        [--threshold auto|1..254] [--invert auto|true|false] [--alpha auto|on|off]
//        [--alphamax 0..1.34] [--turdsize N] [--opttolerance 0..1] [--no-optcurve] [--blur px]  (blur: 이진화 전 미세 블러, 렌더 텍스처 얼룩 완화)
//        [--fg #000000] [--bg #ffffff] [--opaque]
//        [--refine off|light|normal|strong]  (기본 normal: 직선화·꺾임 복원·각도 스냅. Illustrator 엔진은 '곡선을 직선에 스냅' 옵션)
//        [--min-iou 0.985] [--max-missing 0.02]
//        Illustrator 전용: [--ai-paths 0..100] [--ai-corners 0..100] [--ai-noise 1..100] [--ai-timeout 300]
//
// 산출물 (out 디렉터리):
//   <name>_bw.png   이진화된 원본(검정 잉크 / 흰 배경) — 두 엔진 모두 이 파일을 추적한다
//   <name>.svg      결과 벡터 (potrace: 단일 <path fill-rule=evenodd>, 절대 px 좌표 / illustrator: AI 내보내기)
//   <name>.ai       illustrator 엔진일 때만
//   <name>.qa.json  원본 마스크 대비 IoU·누락·초과 + 파라미터
// 종료 코드: 0 합격, 2 QA 미달, 1 오류.  stdout 마지막 줄은 결과 JSON 한 줄.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../../..');
const require = createRequire(path.join(ROOT, 'package.json'));
const { createCanvas, loadImage, Path2D } = require('@napi-rs/canvas');
const potraceMod = require('potrace');
const { Potrace } = potraceMod;
const core = await import(new URL('file:///' + path.join(ROOT, 'src/lib/vectorCore.js').replace(/\\/g, '/')).href);

// ─── 인자 파싱 ───
const argv = process.argv.slice(2);
if (!argv.length || argv.includes('--help')) {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 22).join('\n').replace(/^\/\/ ?/gm, ''));
  process.exit(argv.length ? 0 : 1);
}
const input = path.resolve(argv[0]);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 && argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const flag = (k) => argv.includes(`--${k}`);
if (!fs.existsSync(input)) { console.error(`입력 파일 없음: ${input}`); process.exit(1); }

const outDir = path.resolve(opt('out', path.dirname(input)));
const name = opt('name', path.basename(input).replace(/\.[^.]+$/, ''));
const engine = opt('engine', 'potrace');
const presetId = opt('preset', 'title');
const preset = core.PRESETS.find((p) => p.id === presetId);
if (!preset) { console.error(`알 수 없는 프리셋: ${presetId} (${core.PRESETS.map((p) => p.id).join('|')})`); process.exit(1); }
const thrArg = opt('threshold', 'auto');
const invArg = opt('invert', 'auto');
const alphaMode = opt('alpha', 'auto');
const o = {
  ...core.DEFAULT_OPTIONS,
  ...preset.values,
  autoThreshold: thrArg === 'auto',
  threshold: thrArg === 'auto' ? 128 : Math.max(1, Math.min(254, parseInt(thrArg, 10))),
  invert: invArg === 'auto' ? 'auto' : invArg === 'true',
  alphaMode,
  alphaMax: parseFloat(opt('alphamax', preset.values.alphaMax)),
  turdSize: parseInt(opt('turdsize', preset.values.turdSize), 10),
  optTolerance: parseFloat(opt('opttolerance', preset.values.optTolerance)),
  optCurve: !flag('no-optcurve'),
  fg: opt('fg', '#000000'),
  bg: opt('bg', '#ffffff'),
  transparentBg: !flag('opaque'),
};
const refineLevel = opt('refine', 'normal');
if (!core.REFINE_LEVELS.some((l) => l.id === refineLevel)) { console.error(`알 수 없는 refine: ${refineLevel}`); process.exit(1); }
const minIou = parseFloat(opt('min-iou', '0.985'));
const maxMissing = parseFloat(opt('max-missing', '0.02'));
fs.mkdirSync(outDir, { recursive: true });

// ─── 1) 로드 + 이진화 ───
const img = await loadImage(input);
const W = img.width; const H = img.height;
const cv = createCanvas(W, H); const cx = cv.getContext('2d');
const blur = parseFloat(opt('blur', '0'));
if (blur > 0) { try { cx.filter = `blur(${blur}px)`; } catch { /* 필터 미지원이면 무시 */ } }
cx.drawImage(img, 0, 0);
cx.filter = 'none';
const rgba = cx.getImageData(0, 0, W, H).data;
const binRaw = core.binarizeRGBA(rgba, W, H, o);
// 디스페클: turdSize 미만 성분(잉크·구멍)을 마스크에서 먼저 제거 → 추적 입력과 QA 기준이 같은 '깨끗한 마스크'가 된다.
const ds = core.despeckleMask(binRaw.mask, W, H, Math.max(0, Math.round(o.turdSize)));
const bin = { ...binRaw, mask: ds.mask, removedInk: ds.removedInk, removedHoles: ds.removedHoles };
const bwCanvas = createCanvas(W, H);
const bwData = bwCanvas.getContext('2d').createImageData(W, H);
bwData.data.set(core.maskToRGBA(bin.mask, W, H));
bwCanvas.getContext('2d').putImageData(bwData, 0, 0);
const bwPath = path.join(outDir, `${name}_bw.png`);
fs.writeFileSync(bwPath, bwCanvas.toBuffer('image/png'));

const svgPath = path.join(outDir, `${name}.svg`);
const qaPath = path.join(outDir, `${name}.qa.json`);
let svg = ''; let pathD = ''; let rawD = ''; let extra = {};

// ─── 2) 추적 ───
if (engine === 'potrace') {
  const tracer = new Potrace({
    threshold: 128, blackOnWhite: true,
    turdSize: Math.max(0, Math.round(o.turdSize)),
    alphaMax: o.alphaMax,
    optCurve: o.optCurve,
    optTolerance: o.optTolerance,
    turnPolicy: Potrace.TURNPOLICY_MAJORITY,
  });
  await new Promise((res, rej) => tracer.loadImage(bwCanvas.toBuffer('image/png'), (err) => (err ? rej(err) : res())));
  const tag = tracer.getPathTag();
  rawD = (tag.match(/ d="([^"]*)"/) || [, ''])[1].replace(/\s+/g, ' ').trim();
  const rf = core.refinePath(rawD, { level: refineLevel, width: W, height: H });
  pathD = rf.d;
  svg = core.buildSvg({ width: W, height: H, paths: [pathD], fg: o.fg, bg: o.bg, transparentBg: o.transparentBg });
  fs.writeFileSync(svgPath, svg, 'utf8');
  if (refineLevel !== 'off') fs.writeFileSync(path.join(outDir, `${name}_raw.svg`), core.buildSvg({ width: W, height: H, paths: [rawD], fg: o.fg, bg: o.bg, transparentBg: o.transparentBg }), 'utf8');
  extra = { ...core.countPathStats(pathD), refine: { level: rf.level, before: rf.before, after: rf.after, snapAngles: rf.snapAngles, snapped: rf.snapped } };
} else if (engine === 'illustrator') {
  if (process.platform !== 'win32') { console.error('illustrator 엔진은 Windows COM 자동화만 지원'); process.exit(1); }
  const ps1 = path.join(__dirname, 'run-illustrator-trace.ps1');
  const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1,
    '-InputPng', bwPath, '-OutDir', outDir, '-Name', name,
    '-Threshold', '128', '-Paths', opt('ai-paths', '50'), '-Corners', opt('ai-corners', '75'), '-Noise', opt('ai-noise', '25'),
    '-TimeoutSec', opt('ai-timeout', '300'), '-Snap', refineLevel === 'off' ? '0' : '1'];
  const r = spawnSync('powershell.exe', args, { encoding: 'utf8' });
  process.stderr.write(r.stderr || '');
  const lines = (r.stdout || '').trim().split('\n');
  let res = null; try { res = JSON.parse(lines[lines.length - 1]); } catch { /* ignore */ }
  if (r.status !== 0 || !res || !res.ok) { console.error('Illustrator 추적 실패:', (res && res.error) || r.stdout); process.exit(1); }
  // 경로는 PS stdout 을 거치며 한글이 깨질 수 있어 결과 JSON 대신 우리가 정한 경로를 쓴다.
  extra = { pathCount: res.pathCount, ai: path.join(outDir, `${name}.ai`), tracePng: path.join(outDir, `${name}_trace.png`), props: res.props };
  svg = fs.existsSync(svgPath) ? fs.readFileSync(svgPath, 'utf8') : '';
} else {
  console.error(`알 수 없는 엔진: ${engine}`); process.exit(1);
}

// ─── 3) QA — 결과를 래스터화해 원본 마스크와 비교 ───
function rasterMask() {
  const c = createCanvas(W, H); const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
  if (engine === 'potrace') {
    x.fillStyle = '#000';
    x.fill(new Path2D(pathD), 'evenodd');
  } else {
    return null; // Illustrator: PNG 비교는 별도 (아래)
  }
  const d = x.getImageData(0, 0, W, H).data; const m = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) m[i] = d[i * 4] < 128 ? 1 : 0;
  return m;
}
const rasterD = (d) => { const c = createCanvas(W, H); const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.fillStyle = '#000'; x.fill(new Path2D(d), 'evenodd'); const dd = x.getImageData(0, 0, W, H).data; const m = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) m[i] = dd[i * 4] < 128 ? 1 : 0; return m; };
const cmpRaw = (engine === 'potrace' && rawD && refineLevel !== 'off') ? core.compareMasks(bin.mask, rasterD(rawD)) : null;
let resultMask = rasterMask();
if (!resultMask && extra.tracePng && fs.existsSync(extra.tracePng)) {
  const t = await loadImage(extra.tracePng);
  const c = createCanvas(W, H); const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.drawImage(t, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H).data; resultMask = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) resultMask[i] = d[i * 4] < 128 ? 1 : 0;
}
const cmp = resultMask ? core.compareMasks(bin.mask, resultMask) : { iou: null, missing: null, extra: null };
// 합격 기준: 정리 전(raw) 이 있으면 raw 로 판정하고, 정리 후는 raw 대비 0.01 이상 떨어지지 않아야 한다(과도한 정리 가드).
const gate = cmpRaw || cmp;
const overRefined = cmpRaw ? (cmp.iou < cmpRaw.iou - 0.01) : false;
const pass = gate.iou !== null && gate.iou >= minIou && gate.missing <= maxMissing && !overRefined;

const report = {
  ok: pass, engine, input, out: { bw: bwPath, svg: svgPath, ...(extra.ai ? { ai: extra.ai } : {}) },
  size: { width: W, height: H },
  binarize: { mode: bin.mode, threshold: bin.threshold, inverted: bin.inverted, inkRatio: +bin.inkRatio.toFixed(4), despeckled: { ink: bin.removedInk, holes: bin.removedHoles } },
  params: { preset: presetId, alphaMax: o.alphaMax, turdSize: o.turdSize, optTolerance: o.optTolerance, optCurve: o.optCurve, blur },
  qa: {
    iou: cmp.iou === null ? null : +cmp.iou.toFixed(4), missing: cmp.missing === null ? null : +cmp.missing.toFixed(4), extra: cmp.extra === null ? null : +cmp.extra.toFixed(4),
    ...(cmpRaw ? { rawIou: +cmpRaw.iou.toFixed(4), rawMissing: +cmpRaw.missing.toFixed(4), overRefined } : {}),
    minIou, maxMissing,
  },
  refine: refineLevel,
  stats: extra,
  svgBytes: svg.length,
};
fs.writeFileSync(qaPath, JSON.stringify(report, null, 2), 'utf8');
// Windows 에서 stdout 이 파이프면 비동기라 console.log 직후 process.exit 하면 출력이 잘리거나 대기할 수 있다 → 쓰기 콜백에서 종료.
process.exitCode = pass ? 0 : 2;
process.stdout.write(JSON.stringify(report) + '\n', () => process.exit(pass ? 0 : 2));
