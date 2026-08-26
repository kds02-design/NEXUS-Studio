#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const [inputArg, outputArg, toleranceArg, featherArg, modeArg] = process.argv.slice(2);
if (!inputArg || !outputArg) throw new Error('Usage: node scripts/maskforge-transparent-node.mjs <input> <output> [tolerance] [feather] [black|green]');
const image = await loadImage(path.resolve(inputArg));
const canvas = createCanvas(image.width, image.height);
const ctx = canvas.getContext('2d');
ctx.drawImage(image, 0, 0);
const src = ctx.getImageData(0, 0, image.width, image.height);
const { data, width: W, height: H } = src;
const N = W * H;
const tolerance = Number.isFinite(Number(toleranceArg)) ? Number(toleranceArg) : 32;
const feather = Number.isFinite(Number(featherArg)) ? Number(featherArg) : 24;
const mode = modeArg === 'green' ? 'green' : 'black';
const alpha = new Uint8ClampedArray(N);
for (let p = 0; p < N; p += 1) {
  const i = p * 4;
  const dist = mode === 'green'
    ? Math.sqrt(data[i] ** 2 + (data[i + 1] - 255) ** 2 + data[i + 2] ** 2)
    : Math.sqrt(data[i] ** 2 + data[i + 1] ** 2 + data[i + 2] ** 2);
  alpha[p] = dist <= tolerance ? 0 : dist >= tolerance + feather ? 255 : ((dist - tolerance) / feather) * 255;
}

// Mask Forge hole protection: background-reachable transparent pixels stay transparent;
// enclosed dark texture inside a glyph is restored as opaque material.
const exterior = new Uint8Array(N);
const stack = [];
const seed = (idx) => { if (alpha[idx] < 250 && !exterior[idx]) { exterior[idx] = 1; stack.push(idx); } };
for (let x = 0; x < W; x += 1) { seed(x); seed((H - 1) * W + x); }
for (let y = 0; y < H; y += 1) { seed(y * W); seed(y * W + W - 1); }
while (stack.length) {
  const idx = stack.pop();
  const x = idx % W;
  const y = Math.floor(idx / W);
  if (x > 0) seed(idx - 1);
  if (x + 1 < W) seed(idx + 1);
  if (y > 0) seed(idx - W);
  if (y + 1 < H) seed(idx + W);
}
const seen = new Uint8Array(N);
const fill = new Uint8Array(N);
for (let i = 0; i < N; i += 1) {
  if (alpha[i] >= 250 || exterior[i] || seen[i]) continue;
  const component = [];
  const pending = [i];
  seen[i] = 1;
  while (pending.length) {
    const idx = pending.pop();
    component.push(idx);
    const x = idx % W;
    const y = Math.floor(idx / W);
    const next = [];
    if (x > 0) next.push(idx - 1);
    if (x + 1 < W) next.push(idx + 1);
    if (y > 0) next.push(idx - W);
    if (y + 1 < H) next.push(idx + W);
    for (const n of next) if (alpha[n] < 250 && !exterior[n] && !seen[n]) { seen[n] = 1; pending.push(n); }
  }
  if (component.length <= N * 0.6) for (const idx of component) fill[idx] = 1;
}

for (let p = 0; p < N; p += 1) {
  const i = p * 4;
  let a = fill[p] ? 255 : alpha[p];
  if (!fill[p] && a > 0 && a < 255) {
    const af = a / 255;
    data[i] = Math.max(0, Math.min(255, data[i] / af));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] / af));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] / af));
  }
  if (mode === 'green' && a > 0) data[i + 1] = Math.min(data[i + 1], Math.max(data[i], data[i + 2]));
  data[i + 3] = a;
}
ctx.putImageData(src, 0, 0);
const output = path.resolve(outputArg);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, canvas.toBuffer('image/png'));
console.log(output);
