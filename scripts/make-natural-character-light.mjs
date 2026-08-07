import fs from 'node:fs';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('usage: node make-natural-character-light.mjs input.png output.png');
const img = await loadImage(input);
const { width: w, height: h } = img;

const gold = createCanvas(w, h);
const gx = gold.getContext('2d');
gx.drawImage(img, 0, 0);
gx.globalCompositeOperation = 'source-in';
gx.fillStyle = '#fff0a3';
gx.fillRect(0, 0, w, h);

const jade = createCanvas(w, h);
const jx = jade.getContext('2d');
jx.drawImage(img, 0, 0);
jx.globalCompositeOperation = 'source-in';
jx.fillStyle = '#b9e97a';
jx.fillRect(0, 0, w, h);

const out = createCanvas(w, h);
const ctx = out.getContext('2d');

// Light arrives from upper-right: restrained directional bloom only.
ctx.save();
ctx.globalAlpha = 0.22;
ctx.shadowColor = 'rgba(255,236,156,0.55)';
ctx.shadowBlur = 22;
ctx.drawImage(gold, 7, -4);
ctx.restore();

// Thin gold key rim and a subtler jade bounce on the opposite edge.
ctx.globalAlpha = 0.60;
ctx.drawImage(gold, 4, -2);
ctx.globalAlpha = 0.24;
ctx.drawImage(jade, -3, 2);

// Keep all character pixels untouched; retain light outside the source alpha.
ctx.globalCompositeOperation = 'destination-out';
ctx.globalAlpha = 1;
ctx.drawImage(img, 0, 0);

fs.writeFileSync(output, out.toBuffer('image/png'));
console.log(JSON.stringify({ output, width: w, height: h, direction: 'upper-right' }));
