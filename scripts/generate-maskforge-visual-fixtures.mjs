import { createCanvas } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const W = 800;
const H = 360;
const outputDir = path.resolve('scripts/fixtures/maskforge-visual');

function drawGlyphBodies(ctx, dx = 0, dy = 0) {
  ctx.beginPath();
  ctx.roundRect(92 + dx, 92 + dy, 184, 176, 28);
  ctx.roundRect(308 + dx, 92 + dy, 184, 176, 28);
  ctx.roundRect(524 + dx, 92 + dy, 184, 176, 28);
  ctx.fill();
}

function cutCounters(ctx, dx = 0, dy = 0) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.roundRect(145 + dx, 136 + dy, 78, 88, 18);
  ctx.roundRect(361 + dx, 136 + dy, 78, 88, 18);
  ctx.roundRect(577 + dx, 136 + dy, 78, 88, 18);
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.restore();
}

function createTitleMask() {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  drawGlyphBodies(ctx);
  cutCounters(ctx);
  return canvas;
}

function createTitleRender() {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#050608';
  ctx.fillRect(0, 0, W, H);
  const gold = ctx.createLinearGradient(0, 82, 0, 280);
  gold.addColorStop(0, '#fff5bc');
  gold.addColorStop(0.35, '#e3a83e');
  gold.addColorStop(0.58, '#6e3510');
  gold.addColorStop(1, '#f0c865');
  ctx.fillStyle = gold;
  drawGlyphBodies(ctx);
  ctx.strokeStyle = '#fff1a0';
  ctx.lineWidth = 5;
  drawGlyphBodies(ctx);
  ctx.stroke();
  cutCounters(ctx);
  return canvas;
}

function createBackFx() {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(400, 180, 26, 400, 180, 330);
  glow.addColorStop(0, '#d6ffff');
  glow.addColorStop(0.18, '#35d7ff');
  glow.addColorStop(0.48, '#0b568e');
  glow.addColorStop(1, '#000');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(400, 180);
  ctx.strokeStyle = '#4cdfff';
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 10;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 120, Math.sin(a) * 65);
    ctx.lineTo(Math.cos(a) * 350, Math.sin(a) * 190);
    ctx.stroke();
  }
  ctx.restore();
  // 생성 결과에서 타이틀이 +9px 어긋난 채 검게 비워진 상황을 재현한다.
  ctx.fillStyle = '#000';
  drawGlyphBodies(ctx, 9, 0);
  return canvas;
}

function createFrontFx() {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.shadowBlur = 28;
  ctx.shadowColor = '#ff8b2c';
  ctx.strokeStyle = '#fff4c2';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(34, 258);
  ctx.bezierCurveTo(225, 42, 570, 320, 768, 92);
  ctx.stroke();
  ctx.strokeStyle = '#ff6a18';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(28, 266);
  ctx.bezierCurveTo(230, 50, 565, 312, 776, 84);
  ctx.stroke();
  ctx.restore();
  // 전방 FX는 -8px 어긋난 타이틀 모양으로 하드 컷한다.
  ctx.fillStyle = '#000';
  drawGlyphBodies(ctx, -8, 0);
  return canvas;
}

await mkdir(outputDir, { recursive: true });
const fixtures = [
  ['title-render.png', createTitleRender()],
  ['title-mask.png', createTitleMask()],
  ['back-fx-offset.png', createBackFx()],
  ['front-fx-offset.png', createFrontFx()],
];
for (const [name, canvas] of fixtures) {
  await writeFile(path.join(outputDir, name), canvas.toBuffer('image/png'));
}
console.log(`Created ${fixtures.length} Mask Forge visual fixtures in ${outputDir}`);
