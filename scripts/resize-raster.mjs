import fs from 'node:fs/promises';
import path from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const readArg = (name, fallback = '') => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
};

const input = readArg('input');
const output = readArg('output');
const max = Number(readArg('max', '1500'));
if (!input || !output || !Number.isFinite(max) || max <= 0) throw new Error('--input, --output and a positive --max are required');

const image = await loadImage(await fs.readFile(input));
const scale = Math.min(1, max / Math.max(image.width, image.height));
const width = Math.round(image.width * scale);
const height = Math.round(image.height * scale);
const canvas = createCanvas(width, height);
const context = canvas.getContext('2d');
context.imageSmoothingEnabled = true;
context.imageSmoothingQuality = 'high';
context.drawImage(image, 0, 0, width, height);
await fs.mkdir(path.dirname(output), { recursive: true });
const extension = path.extname(output).toLowerCase();
const bytes = extension === '.png' ? canvas.toBuffer('image/png') : canvas.toBuffer('image/jpeg', 0.9);
await fs.writeFile(output, bytes);
process.stdout.write(JSON.stringify({ input: { width: image.width, height: image.height }, output: { width, height, path: output } }, null, 2));
