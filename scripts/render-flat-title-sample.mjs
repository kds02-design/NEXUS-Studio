import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), all[index + 1]]);
  return pairs;
}, []));

if (!args.text || !args.output) throw new Error('--text and --output are required');

const width = 1536;
const height = 1024;
const fontPath = 'C:/Windows/Fonts/NotoSerifKR-VF.ttf';
GlobalFonts.registerFromPath(fontPath, 'Noto Serif KR');

const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#000000';
ctx.fillRect(0, 0, width, height);
ctx.fillStyle = '#ffffff';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';

let size = 430;
do {
  ctx.font = `900 ${size}px "Noto Serif KR"`;
  if (ctx.measureText(args.text).width <= width * 0.76) break;
  size -= 8;
} while (size > 120);

ctx.fillText(args.text, width / 2, height / 2);
fs.mkdirSync(path.dirname(path.resolve(args.output)), { recursive: true });
fs.writeFileSync(path.resolve(args.output), canvas.toBuffer('image/png'));
console.log(path.resolve(args.output));
