#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const category = process.argv[2];
const outputArg = process.argv[3];
if (!category || !outputArg) throw new Error('Usage: node scripts/compose-render-matrix-preset-board.mjs <category> <output>');

const labels = {
  gold: ['고대 유물', '전투 흔적', '왕실 보석', '골드 나이트', '성스러운 황금', '제국 황금', '금박 스티커', '낡은 금박', '낡은 금박·들뜸', '모던 다크 골드'],
  steel: ['칼날 강철', '기사 투구', '헤비 브러시드 강철', '서릿발 강철'],
  ice: ['빙하 수정', '심연 얼음', '얼음 유물', '북극 파편'],
  lava: ['용암 맥', '열화 강철'],
}[category];
if (!labels) throw new Error(`Unknown category: ${category}`);

const cols = category === 'gold' ? 5 : 2;
const rows = Math.ceil(labels.length / cols);
const width = 1536;
const header = 78;
const cellW = width / cols;
const cellH = category === 'lava' ? 470 : category === 'gold' ? 330 : 480;
const height = header + rows * cellH;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#000';
ctx.fillRect(0, 0, width, height);
ctx.fillStyle = '#e8e8e8';
ctx.font = '600 28px "Malgun Gothic", sans-serif';
ctx.fillText(`Render Matrix · Pro 1K · ${category.toUpperCase()}`, 28, 48);

for (let i = 0; i < labels.length; i += 1) {
  const image = await loadImage(path.resolve(`output/render-matrix-full-comparison/individual/${category}-${i + 1}.png`));
  const col = i % cols;
  const row = Math.floor(i / cols);
  const x = col * cellW;
  const y = header + row * cellH;
  ctx.strokeStyle = '#292929';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, cellW - 1, cellH - 1);
  // Keep the rendered title area and discard model-generated captions; labels are deterministic below.
  const cropH = Math.round(image.height * 0.77);
  const inset = 12;
  ctx.drawImage(image, 0, 0, image.width, cropH, x + inset, y + inset, cellW - inset * 2, cellH - 66);
  ctx.fillStyle = '#ededed';
  ctx.font = `${category === 'gold' ? 20 : 26}px "Malgun Gothic", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(`${i + 1}. ${labels[i]}`, x + cellW / 2, y + cellH - 23);
  ctx.textAlign = 'left';
}

const output = path.resolve(outputArg);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, canvas.toBuffer('image/png'));
console.log(output);
