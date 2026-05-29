// NEXUS Preview — canvas 합성 + 유틸. BannerCreator.renderBannerToCanvas 패턴 확장.
// 레이어: 배경(cover) → 딤 → 스크림 → 하단페이드(프로모션) → 비네팅(브랜드)
//        → 타이틀(슬롯 contain fit) → 서브카피/날짜(또는 이미지) → 게임로고(배너).
// 수식은 index.jsx 의 DOM 프리뷰와 1:1 대응 → 화면에서 본 배치가 다운로드 PNG 에 그대로.

import { scrimToCss } from "../constants/platformTemplates";

const loadImage = (src) => new Promise((resolve, reject) => {
  if (!src) { resolve(null); return; }
  const img = new Image();
  img.crossOrigin = "anonymous"; // Cloudinary canvas 오염 방지 (getImageData / toBlob 가능하도록)
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

// 검정(어두운) 배경 → 투명. 단색 블랙 배경 타이틀용 클라이언트 사이드 녹아웃.
export async function knockoutBlack(src, threshold = 40, softness = 24) {
  const img = await loadImage(src).catch(() => null);
  if (!img) return src;
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  let imageData;
  try { imageData = ctx.getImageData(0, 0, w, h); }
  catch { return src; }
  const px = imageData.data;
  const hi = threshold + Math.max(softness, 1);
  for (let i = 0; i < px.length; i += 4) {
    const lum = Math.max(px[i], px[i + 1], px[i + 2]);
    if (lum <= threshold) px[i + 3] = 0;
    else if (lum < hi) px[i + 3] = Math.round(px[i + 3] * (lum - threshold) / (hi - threshold));
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

function drawCover(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale, sh = h / scale;
  const sx = (img.width - sw) / 2, sy = (img.height - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// 박스(중심 cx,cy / 폭·높이 maxW,maxH) 안에 이미지를 contain fit 후 그림.
function drawContained(ctx, img, cx, cy, boxW, boxH) {
  const fit = Math.min(boxW / img.width, boxH / img.height);
  const w = img.width * fit, h = img.height * fit;
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
}

function paintScrim(ctx, scrim, W, H) {
  if (!scrim) return;
  const grad = scrim.dir === "left" ? ctx.createLinearGradient(0, 0, W, 0)
    : scrim.dir === "bottom" ? ctx.createLinearGradient(0, H, 0, 0)
    : ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, scrim.from);
  grad.addColorStop(1, scrim.to);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

function paintBottomFade(ctx, fade, color, W, H) {
  if (!fade || !color) return;
  const grad = ctx.createLinearGradient(0, fade.start * H, 0, H);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, fade.start * H, W, H - fade.start * H);
}

function paintVignette(ctx, intensity, W, H) {
  if (!intensity || intensity <= 0) return;
  const a = Math.min(Math.max(intensity, 0), 0.9);
  const cx = W / 2, cy = H / 2;
  const inner = Math.min(W, H) * 0.45;
  const outer = Math.hypot(W, H) / 2;
  const grad = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, `rgba(0,0,0,${a})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

// 타이틀 뒤 원형/타원 딤 — slot 중심. radialDimToCss(DOM)와 동일 수식.
// shape: { scale=1, aspect=1, softness=0 } — 원을 ctx.scale 로 눌러 타원화.
function paintRadialDim(ctx, slot, intensity, W, H, shape = {}) {
  if (!intensity || intensity <= 0) return;
  const a = Math.min(Math.max(intensity, 0), 0.92);
  const scale = shape.scale > 0 ? shape.scale : 1;
  const aspect = shape.aspect > 0 ? shape.aspect : 1;
  const soft = Math.min(Math.max(shape.softness || 0, 0), 0.95);
  const baseR = Math.max(slot.maxW * W, slot.maxH * H) * 0.8 * scale; // 원형 기준 반지름(px)
  const sa = Math.sqrt(aspect);
  const rx = baseR * sa, ry = baseR / sa;
  const cx = slot.cx * W, cy = slot.cy * H;
  const sy = ry / rx; // 세로 압축비
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, sy);
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  grad.addColorStop(0, `rgba(0,0,0,${a})`);
  if (soft > 0) grad.addColorStop(soft, `rgba(0,0,0,${a})`);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(-cx, -cy / sy, W, H / sy); // 변환 공간에서 캔버스 전체 커버
  ctx.restore();
}

function wrapLines(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split(/\n/)) {
    let line = "";
    for (const word of para.split(" ")) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = word; }
      else line = test;
    }
    out.push(line);
  }
  return out.length ? out : [String(text)];
}

// 서브카피(상단) + 날짜(하단) 텍스트. font/size/weight/color/offset 런타임 오버라이드.
function drawSubText(ctx, subSlot, opt, W, H) {
  const { copy, date, fontFamily, copyColor, dateColor } = opt;
  const hasCopy = !!(copy && copy.trim());
  const hasDate = !!(date && date.trim());
  if (!hasCopy && !hasDate) return;
  const ff = fontFamily || "'Noto Sans KR', sans-serif";
  const cw = opt.copyWeight || subSlot.copyWeight || 600;
  const dw = opt.dateWeight || subSlot.dateWeight || 400;
  const maxW = subSlot.maxW * W;
  const copyFont = (opt.copyFont ?? subSlot.copyFont) * H;
  const dateFont = (opt.dateFont ?? subSlot.dateFont) * H;
  const copyLH = copyFont * 1.3, dateLH = dateFont * 1.4;
  const cyFrac = subSlot.cy + (opt.offsetY || 0);

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.55)";

  let copyLines = [], dateLines = [];
  if (hasCopy) { ctx.font = `${cw} ${copyFont}px ${ff}`; copyLines = wrapLines(ctx, copy.trim(), maxW); }
  if (hasDate) { ctx.font = `${dw} ${dateFont}px ${ff}`; dateLines = wrapLines(ctx, date.trim(), maxW); }
  const gap = (hasCopy && hasDate) ? subSlot.gap * H : 0;
  const totalH = copyLines.length * copyLH + gap + dateLines.length * dateLH;
  let y = cyFrac * H - totalH / 2;

  if (hasCopy) {
    ctx.font = `${cw} ${copyFont}px ${ff}`;
    ctx.fillStyle = copyColor || subSlot.copyColor || "#FFFFFF";
    ctx.shadowBlur = copyFont * 0.25;
    copyLines.forEach((l) => { ctx.fillText(l, subSlot.cx * W, y); y += copyLH; });
    y += gap;
  }
  if (hasDate) {
    ctx.font = `${dw} ${dateFont}px ${ff}`;
    ctx.fillStyle = dateColor || subSlot.dateColor || "#E6E6F0";
    ctx.shadowBlur = dateFont * 0.25;
    dateLines.forEach((l) => { ctx.fillText(l, subSlot.cx * W, y); y += dateLH; });
  }
  ctx.restore();
}

// template + opts → HTMLCanvasElement
//   opts: { bgSrc, titleSrc, titleScale, dim, subCopy, dateText, subFont, subCopyColor, dateColor,
//           subImageSrc, vignette, bottomFadeColor, logoSrc, outScale }
export async function renderPlatformToCanvas(template, opts = {}) {
  const {
    bgSrc, titleSrc, titleScale = 1, dim = 0, radialDim = 0, radialShape,
    subCopy = "", dateText = "", subFont, subCopyColor, dateColor, subImageSrc,
    subCopyFont, subDateFont, subCopyWeight, subDateWeight, subOffsetY = 0,
    vignette = 0, bottomFadeColor, logoSrc, outScale = 1,
  } = opts;
  const W = Math.round(template.width * outScale);
  const H = Math.round(template.height * outScale);
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  try { await document.fonts.ready; } catch { /* noop */ }

  // 외부 이미지 선로드 (병렬)
  const [bg, title, subImg, logo] = await Promise.all([
    loadImage(bgSrc).catch(() => null),
    loadImage(titleSrc).catch(() => null),
    template.subSlot && subImageSrc ? loadImage(subImageSrc).catch(() => null) : Promise.resolve(null),
    template.logoSlot && logoSrc ? loadImage(logoSrc).catch(() => null) : Promise.resolve(null),
  ]);

  if (bg) drawCover(ctx, bg, 0, 0, W, H);
  else { ctx.fillStyle = "#16161F"; ctx.fillRect(0, 0, W, H); }

  if (dim > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.min(Math.max(dim, 0), 0.85)})`; ctx.fillRect(0, 0, W, H); }

  paintScrim(ctx, template.scrim, W, H);
  if (template.bottomFade) paintBottomFade(ctx, template.bottomFade, bottomFadeColor, W, H);
  if (template.vignette) paintVignette(ctx, vignette, W, H);
  paintRadialDim(ctx, template.slot, radialDim, W, H, radialShape); // 타이틀 뒤 원형/타원 딤

  if (title) {
    const { cx, cy, maxW, maxH } = template.slot;
    const fit = Math.min((maxW * W) / title.width, (maxH * H) / title.height);
    const tw = title.width * fit * titleScale, th = title.height * fit * titleScale;
    ctx.drawImage(title, cx * W - tw / 2, cy * H - th / 2, tw, th);
  }

  // 서브 영역 — 이미지 대체 우선, 없으면 텍스트. (offsetY = 타이틀↔카피 간격)
  if (template.subSlot) {
    const s = template.subSlot;
    if (subImg) drawContained(ctx, subImg, s.cx * W, (s.cy + subOffsetY) * H, s.maxW * W, (s.imgMaxH || 0.16) * H);
    else drawSubText(ctx, s, {
      copy: subCopy, date: dateText, fontFamily: subFont, copyColor: subCopyColor, dateColor,
      copyFont: subCopyFont, dateFont: subDateFont, copyWeight: subCopyWeight, dateWeight: subDateWeight, offsetY: subOffsetY,
    }, W, H);
  }

  // 게임 로고 — 배너 우측 상단.
  if (logo && template.logoSlot) {
    const lg = template.logoSlot;
    const fit = Math.min((lg.maxW * W) / logo.width, (lg.maxH * H) / logo.height);
    const lw = logo.width * fit, lh = logo.height * fit;
    const pad = lg.pad * W;
    ctx.drawImage(logo, W - pad - lw, pad, lw, lh); // top-right
  }

  return canvas;
}

export async function downloadPlatformPng(template, opts = {}) {
  const canvas = await renderPlatformToCanvas(template, { ...opts, outScale: 1 });
  await new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) { resolve(); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nexus-preview_${template.id}_${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      resolve();
    }, "image/png");
  });
}

export { scrimToCss };
