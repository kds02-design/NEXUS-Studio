#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const [renderArg, maskArg, outputArg, modeArg] = process.argv.slice(2);
if (!renderArg || !maskArg || !outputArg) throw new Error('Usage: node scripts/maskforge-shape-lock.mjs <transparent-render> <reference-mask> <output>');

const render = await loadImage(path.resolve(renderArg));
const reference = await loadImage(path.resolve(maskArg));
const canvas = createCanvas(render.width, render.height);
const ctx = canvas.getContext('2d');
ctx.drawImage(render, 0, 0);
const pixels = ctx.getImageData(0, 0, render.width, render.height);

const bbox = (data, width, height, test) => {
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const i = (y * width + x) * 4;
    if (!test(data, i)) continue;
    if (x < left) left = x; if (x > right) right = x;
    if (y < top) top = y; if (y > bottom) bottom = y;
  }
  if (right < left || bottom < top) throw new Error('Shape bbox not found');
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
};

const renderBox = bbox(pixels.data, render.width, render.height, (d, i) => d[i + 3] > 48);
const refCanvas = createCanvas(reference.width, reference.height);
const refCtx = refCanvas.getContext('2d');
refCtx.drawImage(reference, 0, 0);
const refPixels = refCtx.getImageData(0, 0, reference.width, reference.height);
const refBox = bbox(refPixels.data, reference.width, reference.height,
  (d, i) => d[i + 3] > 48 && Math.max(d[i], d[i + 1], d[i + 2]) > 128);

// One canonical placement for the entire catalogue. This prevents the renderer from
// changing character proportions or apparent scale between presets.
const targetBox = {
  width: Math.round(render.width * 0.842),
  height: Math.round((render.width * 0.842) * (refBox.height / refBox.width)),
};
targetBox.left = Math.round((render.width - targetBox.width) / 2);
targetBox.top = Math.round(render.height * 0.264);

const materialCanvas = createCanvas(render.width, render.height);
const materialCtx = materialCanvas.getContext('2d');
materialCtx.imageSmoothingEnabled = true;
materialCtx.imageSmoothingQuality = 'high';
materialCtx.drawImage(render, renderBox.left, renderBox.top, renderBox.width, renderBox.height,
  targetBox.left, targetBox.top, targetBox.width, targetBox.height);
const materialPixels = materialCtx.getImageData(0, 0, render.width, render.height);

const lockedMask = createCanvas(render.width, render.height);
const lockCtx = lockedMask.getContext('2d');
lockCtx.imageSmoothingEnabled = true;
lockCtx.imageSmoothingQuality = 'high';
lockCtx.drawImage(reference, refBox.left, refBox.top, refBox.width, refBox.height,
  targetBox.left, targetBox.top, targetBox.width, targetBox.height);
const lockPixels = lockCtx.getImageData(0, 0, render.width, render.height);
if (modeArg !== 'placement-only') {
  for (let i = 0; i < materialPixels.data.length; i += 4) {
    const maskLuma = Math.max(lockPixels.data[i], lockPixels.data[i + 1], lockPixels.data[i + 2]);
    materialPixels.data[i + 3] = Math.round(maskLuma * (lockPixels.data[i + 3] / 255));
  }
}
ctx.clearRect(0, 0, render.width, render.height);
ctx.putImageData(materialPixels, 0, 0);
const output = path.resolve(outputArg);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, canvas.toBuffer('image/png'));
console.log(JSON.stringify({ output, renderBox, refBox, targetBox, geometry: modeArg === 'placement-only' ? 'alpha-preserved-placement' : 'reference-mask-locked' }));
