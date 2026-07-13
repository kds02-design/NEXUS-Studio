// KV(키 비주얼) 컴포저 — 프로모션 상단 비주얼 임시 구도 + Figma용 레이어 분리 출력.
//   좌표계: 페이지 3000×3620 (Figma 문서 기준). KV 출력 영역 = 상단 3000×1688.
//   레이어: 배경이미지 · 여캐 · 남캐 · 타이틀 (자유 사각형 {src,x,y,w,h,visible,opacity})
//   배경 = 단색 컬러 + 패턴 "이미지"(스모그 등) 오버레이. 하단 알파 페이드는 배경색을 비춤(미리보기).
//   출력: kv_배경.png(단색+패턴+배경이미지, 상단 1688, 불투명) · kv_좌측캐릭터 / kv_우측캐릭터 / kv_타이틀(투명).

export const KV_W = 3000;
export const KV_EXPORT_H = 1688;  // 실제 출력되는 KV 높이
export const PAGE_H = 3620;       // 편집 화면 전체 페이지 높이(Figma BG 프레임 기준)

export const BLEND_MODES = [
  { id: "soft-light", label: "소프트라이트" },
  { id: "overlay",    label: "오버레이" },
  { id: "multiply",   label: "멀티플라이" },
  { id: "screen",     label: "스크린" },
  { id: "source-over", label: "노멀" },
];

import { filterString } from "./imageUtils";

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지 로드 실패"));
    img.src = src;
  });
}

// ─── 배경 베이스(단색 + 패턴 이미지) ─────────────────────────────────────────
// pattern: { src, opacity, blend, fit:"cover"|"tile" }
export async function renderBase({ bgColor = "#14181C", pattern } = {}, W = KV_W, H = PAGE_H, outScale = 1) {
  const cw = Math.round(W * outScale), ch = Math.round(H * outScale);
  const canvas = document.createElement("canvas");
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, cw, ch);
  if (pattern?.src) {
    const img = await loadImage(pattern.src);
    if (img) {
      ctx.save();
      ctx.globalAlpha = pattern.opacity ?? 0.35;
      ctx.globalCompositeOperation = pattern.blend || "soft-light";
      if (pattern.fit === "tile") {
        const p = ctx.createPattern(img, "repeat");
        ctx.fillStyle = p;
        ctx.fillRect(0, 0, cw, ch);
      } else {
        const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
        const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
        ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
      }
      ctx.restore();
    }
  }
  return canvas;
}

// ─── 배경 레이어 flatten (단색+패턴+배경이미지) — 상단 exportH, 불투명 ─────────
// 패턴은 미리보기와 동일하게 "페이지 전체 cover" 로 그린 뒤 상단 출력영역을 크롭한다.
// 캔버스 치수는 opts.pageW/pageH/exportH 로 오버라이드 가능 (레이아웃별 — 브랜드웹 1920×1080 등).
export async function renderKvBackground(opts = {}, outScale = 1) {
  const pageW = opts.pageW || KV_W, pageH = opts.pageH || PAGE_H, exportH = opts.exportH || KV_EXPORT_H;
  const full = await renderBase(opts, pageW, pageH, outScale);
  const W = Math.round(pageW * outScale), H = Math.round(exportH * outScale);
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(full, 0, 0, W, H, 0, 0, W, H); // 상단 KV 영역 크롭
  const bi = opts.bgImage;
  if (bi?.src && bi.visible !== false) {
    const img = await loadImage(bi.src);
    if (img) {
      ctx.globalAlpha = bi.opacity ?? 1;
      ctx.filter = filterString(bi.filter);
      ctx.drawImage(img, bi.x * outScale, bi.y * outScale, bi.w * outScale, bi.h * outScale);
      ctx.filter = "none";
      ctx.globalAlpha = 1;
    }
  }
  return canvas;
}

// ─── KV 썸네일(배경+캐릭터 합성) — 월 테마 분석용 저해상 dataURL ──────────────
export async function renderKvThumb(opts = {}, outScale = 0.26) {
  const canvas = await renderKvBackground(opts, outScale); // 배경색+패턴+배경이미지 (출력영역)
  const ctx = canvas.getContext("2d");
  for (const key of ["female", "male"]) {
    const L = opts[key];
    if (L?.src && L.visible !== false) {
      const img = await loadImage(L.src);
      if (img) {
        ctx.globalAlpha = L.opacity ?? 1;
        ctx.filter = filterString(L.filter);
        ctx.drawImage(img, L.x * outScale, L.y * outScale, L.w * outScale, L.h * outScale);
        ctx.filter = "none"; ctx.globalAlpha = 1;
      }
    }
  }
  return canvas.toDataURL("image/jpeg", 0.85);
}

// ─── 단일 레이어 — 상단 출력영역 투명 PNG ────────────────────────────────────
export async function renderKvLayer(layer, outScale = 1, dims = {}) {
  if (!layer?.src || layer.visible === false) return null;
  const img = await loadImage(layer.src);
  if (!img) return null;
  const W = Math.round((dims.pageW || KV_W) * outScale), H = Math.round((dims.exportH || KV_EXPORT_H) * outScale);
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.globalAlpha = layer.opacity ?? 1;
  ctx.filter = filterString(layer.filter);
  ctx.drawImage(img, layer.x * outScale, layer.y * outScale, layer.w * outScale, layer.h * outScale);
  return canvas;
}

// ─── 딤 레이어 (투명 PNG — Figma 에서 별도 레이어로 조립) ─────────────────────
// 타이틀 뒤 원형(타원) 딤 — rect: { cx, cy, w, h } (타이틀 영역), 미리보기 CSS 와 동일 수식.
export function dimRadialParams(rect, { scale = 1, aspect = 1.6, softness = 0.5 } = {}) {
  const base = Math.max(rect.w, rect.h * 2) / 2;
  return { rx: base * scale * aspect, ry: base * scale, inner: Math.max(0, Math.min(0.95, (1 - softness) * 0.6)) };
}
export function renderRadialDimLayer({ rect, amount, scale, aspect, softness }, W, H, outScale = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(W * outScale); canvas.height = Math.round(H * outScale);
  const ctx = canvas.getContext("2d");
  const { rx, ry, inner } = dimRadialParams(rect, { scale, aspect, softness });
  const R = Math.max(rx, ry);
  ctx.save();
  ctx.translate(rect.cx * outScale, rect.cy * outScale);
  ctx.scale((rx / R) * outScale, (ry / R) * outScale);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
  g.addColorStop(0, `rgba(0,0,0,${amount})`);
  g.addColorStop(inner, `rgba(0,0,0,${amount})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(-R * 2, -R * 2, R * 4, R * 4);
  ctx.restore();
  return canvas;
}
// 좌측 메뉴 뒤 딤 — 좌측에서 오른쪽으로 사라지는 밴드. width: 캔버스 폭 대비 비율(0~1).
export function renderLeftDimLayer({ amount, width = 0.3 }, W, H, outScale = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(W * outScale); canvas.height = Math.round(H * outScale);
  const ctx = canvas.getContext("2d");
  const bw = Math.round(W * width * outScale);
  const g = ctx.createLinearGradient(0, 0, bw, 0);
  g.addColorStop(0, `rgba(0,0,0,${amount})`);
  g.addColorStop(0.55, `rgba(0,0,0,${(amount * 0.7).toFixed(3)})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, bw, canvas.height);
  return canvas;
}

// ─── 출력 ────────────────────────────────────────────────────────────────────
function downloadCanvas(canvas, filename) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve();
    }, "image/png");
  });
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function downloadKvSet(opts = {}) {
  const results = [];
  const prefix = opts.filePrefix || "kv"; // 브랜드웹은 "bw" — 피그마 플러그인 규격 구분
  const dims = { pageW: opts.pageW, pageH: opts.pageH, exportH: opts.exportH };
  const W = dims.pageW || KV_W, EH = dims.exportH || KV_EXPORT_H;
  const bg = await renderKvBackground(opts, 1);
  await downloadCanvas(bg, `${prefix}_배경.png`); results.push(`${prefix}_배경.png`); await wait(350);
  // 좌측 메뉴 딤 (브랜드웹) — 배경 바로 위 스택
  if (opts.menuDim?.amount > 0) {
    const c = renderLeftDimLayer(opts.menuDim, W, EH, 1);
    await downloadCanvas(c, `${prefix}_메뉴딤.png`); results.push(`${prefix}_메뉴딤.png`); await wait(350);
  }
  for (const [layer, name] of [[opts.female, `${prefix}_좌측캐릭터.png`], [opts.male, `${prefix}_우측캐릭터.png`]]) {
    if (!layer?.src || layer.visible === false) continue;
    const c = await renderKvLayer(layer, 1, dims);
    if (c) { await downloadCanvas(c, name); results.push(name); await wait(350); }
  }
  // 타이틀 뒤 딤 — 캐릭터 위·타이틀 아래 스택
  if (opts.titleDim?.amount > 0 && opts.titleDim.rect) {
    const c = renderRadialDimLayer(opts.titleDim, W, EH, 1);
    await downloadCanvas(c, `${prefix}_타이틀딤.png`); results.push(`${prefix}_타이틀딤.png`); await wait(350);
  }
  if (opts.title?.src && opts.title.visible !== false) {
    const c = await renderKvLayer(opts.title, 1, dims);
    if (c) { await downloadCanvas(c, `${prefix}_타이틀.png`); results.push(`${prefix}_타이틀.png`); await wait(350); }
  }
  return results;
}
