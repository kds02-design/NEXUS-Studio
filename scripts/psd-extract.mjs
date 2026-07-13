// PSD 레이어 추출 (Node) — 브라우저 메모리 한계를 받는 초대형 PSD 용.
//   폴더(그룹)는 하나로 합쳐 1장, 최상위 단일 레이어는 그대로 → PNG 로 저장.
// 사용: node scripts/psd-extract.mjs "경로/메인.psd" [maxDim=3000] [출력폴더]
import fs from "fs";
import path from "path";
import { createCanvas } from "@napi-rs/canvas";
import { readPsd, initializeCanvas } from "ag-psd";

initializeCanvas(createCanvas);

const inPath = process.argv[2];
const MAX = Number(process.argv[3]) || 3000;
const outDir = process.argv[4] || path.dirname(inPath || ".");
if (!inPath) { console.error("사용: node scripts/psd-extract.mjs <psd경로> [maxDim] [출력폴더]"); process.exit(1); }

const sanitize = (s) => (s || "layer").replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_").slice(0, 60);
const layerRect = (n) => ({ x: n.left || 0, y: n.top || 0, w: n.canvas ? n.canvas.width : 0, h: n.canvas ? n.canvas.height : 0 });

// ag-psd blendMode(camelCase) → canvas globalCompositeOperation
const BLEND = {
  normal: "source-over", passThrough: "source-over", dissolve: "source-over",
  multiply: "multiply", screen: "screen", overlay: "overlay", darken: "darken", lighten: "lighten",
  colorDodge: "color-dodge", colorBurn: "color-burn", hardLight: "hard-light", softLight: "soft-light",
  difference: "difference", exclusion: "exclusion", hue: "hue", saturation: "saturation", color: "color", luminosity: "luminosity",
  linearDodge: "lighter", linearBurn: "multiply", darkerColor: "darken", lighterColor: "lighten",
};
const blendOp = (m) => BLEND[m] || "source-over";

function collectLeaves(nodes, out) {
  for (const n of nodes || []) {
    if (n.children && n.children.length) collectLeaves(n.children, out);
    else if (n.canvas && !n.hidden) out.push(n);
  }
}

function downscaleCanvas(src, maxDim) {
  const s = Math.min(1, maxDim / Math.max(src.width, src.height));
  if (s >= 1) return src;
  const o = createCanvas(Math.max(1, Math.round(src.width * s)), Math.max(1, Math.round(src.height * s)));
  o.getContext("2d").drawImage(src, 0, 0, o.width, o.height);
  return o;
}

function mergeGroup(group, maxDim) {
  const leaves = [];
  collectLeaves(group.children, leaves);
  if (!leaves.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const lf of leaves) { const r = layerRect(lf); if (r.x < minX) minX = r.x; if (r.y < minY) minY = r.y; if (r.x + r.w > maxX) maxX = r.x + r.w; if (r.y + r.h > maxY) maxY = r.y + r.h; }
  const cw = maxX - minX, ch = maxY - minY;
  if (cw <= 0 || ch <= 0) return null;
  const scale = Math.min(1, maxDim / Math.max(cw, ch));
  const c = createCanvas(Math.max(1, Math.round(cw * scale)), Math.max(1, Math.round(ch * scale)));
  const ctx = c.getContext("2d");
  leaves.forEach((lf, i) => {
    const r = layerRect(lf);
    ctx.globalAlpha = lf.opacity == null ? 1 : lf.opacity; // ag-psd opacity 는 0~1
    ctx.globalCompositeOperation = i === 0 ? "source-over" : blendOp(lf.blendMode);
    ctx.drawImage(lf.canvas, (r.x - minX) * scale, (r.y - minY) * scale, r.w * scale, r.h * scale);
  });
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  return c;
}

const buf = fs.readFileSync(inPath);
console.log(`읽는 중: ${inPath}`);
// totalMemoryLimit: undefined — ag-psd 기본 2GB 디코드 가드 해제 (초대형 PSD 용도이므로).
const psd = readPsd(buf, { useImageData: false, skipLayerImageData: false, skipCompositeImageData: true, skipThumbnail: true, totalMemoryLimit: undefined });
console.log(`문서 ${psd.width}x${psd.height}, 최상위 ${(psd.children || []).length}개, maxDim=${MAX}`);
fs.mkdirSync(outDir, { recursive: true });

let n = 0;
for (const node of psd.children || []) {
  if (node.hidden) continue;
  let canvas = null;
  if (node.children && node.children.length) canvas = mergeGroup(node, MAX);
  else if (node.canvas) canvas = downscaleCanvas(node.canvas, MAX);
  if (!canvas) { console.log(`- (건너뜀) ${node.name}`); continue; }
  const out = path.join(outDir, `${sanitize(node.name)}.png`);
  fs.writeFileSync(out, canvas.toBuffer("image/png"));
  console.log(`✓ ${node.name}  →  ${out}  (${canvas.width}x${canvas.height})`);
  n++;
}
console.log(`완료: ${n}개 추출`);
