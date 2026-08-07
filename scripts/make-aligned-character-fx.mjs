import fs from 'node:fs';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('usage: node make-aligned-character-fx.mjs input.png output.png');
const img = await loadImage(input);
const w = img.width, h = img.height;

const alpha = createCanvas(w, h);
const ax = alpha.getContext('2d');
ax.drawImage(img, 0, 0);
ax.globalCompositeOperation = 'source-in';
ax.fillStyle = '#d9ff49';
ax.fillRect(0, 0, w, h);

const out = createCanvas(w, h);
const ctx = out.getContext('2d');

// Broad spring-green bloom, derived from the exact source alpha.
ctx.save();
ctx.globalAlpha = 0.58;
ctx.shadowColor = 'rgba(174,255,62,0.95)';
ctx.shadowBlur = 34;
ctx.drawImage(alpha, 0, 0);
ctx.restore();

// Crisp warm/cool contour. Multiple offset stamps avoid silhouette drift.
const offsets = [];
for (let a = 0; a < 360; a += 20) {
  const r = 7;
  offsets.push([Math.cos(a * Math.PI / 180) * r, Math.sin(a * Math.PI / 180) * r]);
}
ctx.globalAlpha = 0.88;
for (const [x, y] of offsets) ctx.drawImage(alpha, x, y);

// Remove all original interior pixels; leave light outside the character only.
ctx.globalCompositeOperation = 'destination-out';
ctx.globalAlpha = 1;
ctx.drawImage(img, 0, 0);

fs.writeFileSync(output, out.toBuffer('image/png'));
console.log(JSON.stringify({ input, output, width: w, height: h }));
