import fs from 'node:fs';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('usage: node render-locked-title-material.mjs flat.png rendered.png');
const img = await loadImage(input);
const w = img.width, h = img.height;

const mask = createCanvas(w, h);
mask.getContext('2d').drawImage(img, 0, 0);

const tinted = (color) => {
  const c = createCanvas(w, h), x = c.getContext('2d');
  x.drawImage(mask, 0, 0); x.globalCompositeOperation = 'source-in';
  x.fillStyle = color; x.fillRect(0, 0, w, h); return c;
};
const dark = tinted('#123e16');
const gold = tinted('#f4d86b');

const out = createCanvas(w, h), ctx = out.getContext('2d');

// Soft cast shadow.
ctx.save(); ctx.globalAlpha = .48; ctx.shadowColor = 'rgba(7,24,8,.75)'; ctx.shadowBlur = 16; ctx.drawImage(dark, 3, 10); ctx.restore();

// Deep forest outer keyline, preserving the exact source silhouette.
for (let a = 0; a < 360; a += 12) {
  const r = 13; ctx.drawImage(dark, Math.cos(a*Math.PI/180)*r, Math.sin(a*Math.PI/180)*r);
}

// Fine warm keyline.
for (let a = 0; a < 360; a += 20) {
  const r = 5; ctx.drawImage(gold, Math.cos(a*Math.PI/180)*r, Math.sin(a*Math.PI/180)*r);
}

// Spring-green material inside the immutable alpha.
const body = createCanvas(w, h), bx = body.getContext('2d');
const grad = bx.createLinearGradient(0, 0, 0, h);
grad.addColorStop(0, '#fff18a'); grad.addColorStop(.30, '#cbea55');
grad.addColorStop(.68, '#65b82d'); grad.addColorStop(1, '#2e7c1f');
bx.fillStyle = grad; bx.fillRect(0, 0, w, h);
bx.globalCompositeOperation = 'destination-in'; bx.drawImage(mask, 0, 0);
ctx.drawImage(body, 0, 0);

// Ivory top-left bevel and darker lower-right bevel, clipped by the same alpha.
ctx.save(); ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = .72; ctx.drawImage(tinted('#fffbd2'), -3, -4); ctx.restore();
ctx.save(); ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = .26; ctx.drawImage(tinted('#164b18'), 4, 5); ctx.restore();

fs.writeFileSync(output, out.toBuffer('image/png'));
console.log(JSON.stringify({ output, width:w, height:h, silhouette:'locked' }));
