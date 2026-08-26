#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';

const argv = process.argv.slice(2);
const opt = {};
for (let i = 0; i < argv.length; i += 2) opt[argv[i].replace(/^--/, '')] = argv[i + 1];
for (const key of ['original', 'rendered', 'output']) if (!opt[key]) throw new Error(`Missing --${key}`);

GlobalFonts.registerFromPath('C:/Windows/Fonts/NotoSansKR-VF.ttf', 'Noto Sans KR');
const original = await loadImage(path.resolve(opt.original));
const rendered = await loadImage(path.resolve(opt.rendered));
const width = 1600;
const height = 650;
const pad = 28;
const header = 62;
const gutter = 20;
const panelWidth = (width - pad * 2 - gutter) / 2;
const panelHeight = height - header - pad;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#e7e7e7';
ctx.fillRect(0, 0, width, height);

const drawPanel = (image, x, label) => {
  ctx.fillStyle = '#111111';
  ctx.fillRect(x, header, panelWidth, panelHeight);
  const scale = Math.min(panelWidth / image.width, panelHeight / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  ctx.drawImage(image, x + (panelWidth - w) / 2, header + (panelHeight - h) / 2, w, h);
  ctx.fillStyle = '#202020';
  ctx.font = '700 25px "Noto Sans KR"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + panelWidth / 2, header / 2);
};

drawPanel(original, pad, '기존 ImageGen 샘플');
drawPanel(rendered, pad + panelWidth + gutter, 'Render Matrix · AI 최적화 · Pro 1K');
const output = path.resolve(opt.output);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, canvas.toBuffer('image/png'));
console.log(output);
