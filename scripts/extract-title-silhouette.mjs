#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const argv = process.argv.slice(2);
const opt = {};
for (let i = 0; i < argv.length; i += 2) opt[argv[i].replace(/^--/, '')] = argv[i + 1];
if (!opt.input || !opt.output) throw new Error('Missing --input or --output');

const source = await loadImage(path.resolve(opt.input));
const canvas = createCanvas(source.width, source.height);
const ctx = canvas.getContext('2d');
ctx.drawImage(source, 0, 0);
const pixels = ctx.getImageData(0, 0, source.width, source.height);
const { data, width, height } = pixels;
const mask = new Uint8Array(width * height);

for (let i = 0; i < mask.length; i += 1) {
  const p = i * 4;
  const luminance = Math.max(data[p], data[p + 1], data[p + 2]);
  if (data[p + 3] > 16 && luminance > 24) mask[i] = 1;
}

// Remove tiny detached glints/particles so only the typography silhouette remains.
const seen = new Uint8Array(mask.length);
const keep = new Uint8Array(mask.length);
const queue = new Int32Array(mask.length);
for (let seed = 0; seed < mask.length; seed += 1) {
  if (!mask[seed] || seen[seed]) continue;
  let head = 0;
  let tail = 0;
  queue[tail++] = seed;
  seen[seed] = 1;
  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);
    const neighbors = [index - 1, index + 1, index - width, index + width];
    for (const next of neighbors) {
      if (next < 0 || next >= mask.length || seen[next] || !mask[next]) continue;
      const nx = next % width;
      const ny = Math.floor(next / width);
      if (Math.abs(nx - x) + Math.abs(ny - y) !== 1) continue;
      seen[next] = 1;
      queue[tail++] = next;
    }
  }
  if (tail >= 150) for (let i = 0; i < tail; i += 1) keep[queue[i]] = 1;
}

for (let i = 0; i < keep.length; i += 1) {
  const p = i * 4;
  const value = keep[i] ? 255 : 0;
  data[p] = value;
  data[p + 1] = value;
  data[p + 2] = value;
  data[p + 3] = 255;
}
ctx.putImageData(pixels, 0, 0);
const output = path.resolve(opt.output);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, canvas.toBuffer('image/png'));
console.log(output);
