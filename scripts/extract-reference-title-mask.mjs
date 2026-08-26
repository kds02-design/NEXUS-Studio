#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const [inputArg, outputArg] = process.argv.slice(2);
if (!inputArg || !outputArg) throw new Error('Usage: node scripts/extract-reference-title-mask.mjs <input> <output>');

const image = await loadImage(path.resolve(inputArg));
// The supplied comparison image contains the clean heat-forged title in the right half.
const sx = Math.round(image.width * 0.515);
const sy = Math.round(image.height * 0.285);
const sw = Math.round(image.width * 0.455);
const sh = Math.round(image.height * 0.38);
const canvas = createCanvas(1536, 768);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#000';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.drawImage(image, sx, sy, sw, sh, 110, 135, 1316, 500);

const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
for (let i = 0; i < pixels.data.length; i += 4) {
  const value = Math.max(pixels.data[i], pixels.data[i + 1], pixels.data[i + 2]) > 26 ? 255 : 0;
  pixels.data[i] = value;
  pixels.data[i + 1] = value;
  pixels.data[i + 2] = value;
  pixels.data[i + 3] = 255;
}
ctx.putImageData(pixels, 0, 0);

// Fill dark texture pinholes enclosed by the glyph while preserving true counters/open gaps.
const cleaned = ctx.getImageData(0, 0, canvas.width, canvas.height);
const seen = new Uint8Array(canvas.width * canvas.height);
const queue = new Int32Array(canvas.width * canvas.height);
let head = 0;
let tail = 0;
const enqueue = (x, y) => {
  const index = y * canvas.width + x;
  if (seen[index] || cleaned.data[index * 4] !== 0) return;
  seen[index] = 1;
  queue[tail++] = index;
};
for (let x = 0; x < canvas.width; x += 1) { enqueue(x, 0); enqueue(x, canvas.height - 1); }
for (let y = 0; y < canvas.height; y += 1) { enqueue(0, y); enqueue(canvas.width - 1, y); }
while (head < tail) {
  const index = queue[head++];
  const x = index % canvas.width;
  const y = Math.floor(index / canvas.width);
  if (x > 0) enqueue(x - 1, y);
  if (x + 1 < canvas.width) enqueue(x + 1, y);
  if (y > 0) enqueue(x, y - 1);
  if (y + 1 < canvas.height) enqueue(x, y + 1);
}
for (let i = 0; i < seen.length; i += 1) {
  if (cleaned.data[i * 4] === 0 && !seen[i]) {
    cleaned.data[i * 4] = 255;
    cleaned.data[i * 4 + 1] = 255;
    cleaned.data[i * 4 + 2] = 255;
  }
}
ctx.putImageData(cleaned, 0, 0);

const output = path.resolve(outputArg);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, canvas.toBuffer('image/png'));
console.log(output);
