// 로컬 색상 키잉 — 단색 배경(검정/크로마/화이트 등) 위 "불투명 피사체"를 배경색 거리 기반으로
// 투명화한다. 마스크 포지의 '로컬 색상 키(luma)' 모드와 동일 로직 — 밝기 키(lumaKey)와 달리
// 피사체의 어두운 내부가 뚫리지 않도록 형태 보호(hole protect)와 디프린지(decontam)를 포함.
// 불투명 아이템을 검은 배경에서 깔끔히 추출할 때 사용.
//
// MaskForge(index.jsx) 와 NexusPreview 아이템 꾸러미 합성이 공유하는 단일 진실 소스.
//   colorKeyToBlob(srcData, opts)          → { blob, width, height }   (MaskForge 실시간/내보내기)
//   colorKeyToTransparentPng(src, opts)    → Promise<dataUrl PNG>        (자동 투명화 편의 래퍼)

export const KEY_DEFAULTS = {
  tolerance: 40,   // 배경으로 간주할 색 거리 (0~160)
  feather: 22,     // 경계 페더링 폭 (1~120)
  holeSize: 2,     // 사용자가 명시적으로 복원할 닫힌 영역 최대 크기 (0~100%)
  // 닫힌 배경도 피사체로 복원하는 옵션이라 한글 카운터(ㅇ·ㅁ·ㅂ)를 막을 수 있다.
  // 타이틀/로고의 음각 공간 보존을 위해 기본값은 반드시 false 이다.
  holeProtect: false,
  decontam: true,
  trim: false,
};

const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

export const toRgb = (bg) => {
  if (Array.isArray(bg)) return bg;
  if (typeof bg === "string") {
    const h = bg.replace("#", "");
    const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const int = parseInt(n, 16);
    if (Number.isNaN(int)) return [0, 0, 0];
    return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
  }
  return null;
};

// 테두리 링을 샘플링해 가장 빈번한 색을 배경으로 추정 (피사체가 모서리에 닿아도 견고).
export function detectBg(d, w, h) {
  const buckets = {};
  const add = (x, y) => {
    const i = (y * w + x) * 4;
    const key = (d[i] >> 3) + "," + (d[i + 1] >> 3) + "," + (d[i + 2] >> 3);
    const bk = (buckets[key] = buckets[key] || { n: 0, r: 0, g: 0, b: 0 });
    bk.n++; bk.r += d[i]; bk.g += d[i + 1]; bk.b += d[i + 2];
  };
  const step = Math.max(1, Math.floor(Math.min(w, h) / 120));
  for (let x = 0; x < w; x += step) { add(x, 0); add(x, h - 1); }
  for (let y = 0; y < h; y += step) { add(0, y); add(w - 1, y); }
  let best = null;
  for (const k in buckets) { if (!best || buckets[k].n > best.n) best = buckets[k]; }
  if (!best) return [0, 0, 0];
  return [Math.round(best.r / best.n), Math.round(best.g / best.n), Math.round(best.b / best.n)];
}

// 테두리에서 투명 픽셀을 따라 flood fill → 진짜 외부 배경 판별. 가장자리에서 도달 불가능한
// 투명 영역은 피사체 내부에 뚫린 구멍이므로 형태 유지를 위해 다시 채움. 단, 임계값보다 큰 구멍은 뚫린 채로.
export function computeFillMask(alphaArr, W, H, holeSizePct) {
  const N = W * H, OPAQUE = 250;
  const exterior = new Uint8Array(N);
  const stack = [];
  const seed = (idx) => { if (alphaArr[idx] < OPAQUE && !exterior[idx]) { exterior[idx] = 1; stack.push(idx); } };
  for (let x = 0; x < W; x++) { seed(x); seed((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { seed(y * W); seed(y * W + W - 1); }
  while (stack.length) {
    const idx = stack.pop(), x = idx % W, y = (idx / W) | 0;
    if (x > 0) seed(idx - 1);
    if (x < W - 1) seed(idx + 1);
    if (y > 0) seed(idx - W);
    if (y < H - 1) seed(idx + W);
  }
  const fill = new Uint8Array(N), seen = new Uint8Array(N);
  const maxFill = (holeSizePct / 100) * N * 0.6;
  for (let i = 0; i < N; i++) {
    if (alphaArr[i] < OPAQUE && !exterior[i] && !seen[i]) {
      const comp = [], st = [i]; seen[i] = 1;
      while (st.length) {
        const idx = st.pop(); comp.push(idx);
        const x = idx % W, y = (idx / W) | 0;
        if (x > 0 && alphaArr[idx - 1] < OPAQUE && !exterior[idx - 1] && !seen[idx - 1]) { seen[idx - 1] = 1; st.push(idx - 1); }
        if (x < W - 1 && alphaArr[idx + 1] < OPAQUE && !exterior[idx + 1] && !seen[idx + 1]) { seen[idx + 1] = 1; st.push(idx + 1); }
        if (y > 0 && alphaArr[idx - W] < OPAQUE && !exterior[idx - W] && !seen[idx - W]) { seen[idx - W] = 1; st.push(idx - W); }
        if (y < H - 1 && alphaArr[idx + W] < OPAQUE && !exterior[idx + W] && !seen[idx + W]) { seen[idx + W] = 1; st.push(idx + W); }
      }
      if (comp.length <= maxFill) for (const idx of comp) fill[idx] = 1;
    }
  }
  return fill;
}

// DOM 없이도 테스트할 수 있는 색상 키 코어. 반환 data 는 straight-alpha RGBA 이다.
export function extractColorKeyPixels(srcData, { bg, tolerance, feather, holeProtect, holeSize, decontam }) {
  const W = srcData.width, H = srcData.height, N = W * H;
  const s = srcData.data;
  const [br, bgC, bb] = bg;
  const T = tolerance, S = Math.max(1, feather);

  const alphaArr = new Uint8ClampedArray(N);
  for (let p = 0; p < N; p++) {
    const i = p * 4;
    const dr = s[i] - br, dg = s[i + 1] - bgC, db = s[i + 2] - bb;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    alphaArr[p] = dist <= T ? 0 : dist >= T + S ? 255 : ((dist - T) / S) * 255;
  }

  const fill = holeProtect ? computeFillMask(alphaArr, W, H, holeSize) : null;
  const out = new Uint8ClampedArray(s.length);
  let transparentPixels = 0, opaquePixels = 0, partialPixels = 0, restoredPixels = 0;
  for (let p = 0; p < N; p++) {
    const i = p * 4;
    let a = (s[i + 3] / 255) * alphaArr[p];
    let r = s[i], g = s[i + 1], b = s[i + 2];
    if (fill && fill[p]) {
      a = s[i + 3];
      restoredPixels++;
    } else if (decontam && a >= 8 && a < 255) {
      // 극저알파를 나누면 RGB가 0/255로 폭주한다. 8 미만은 색을 유지하고 알파만 사용한다.
      const af = a / 255, inv = 1 - af;
      r = clamp255((r - inv * br) / af);
      g = clamp255((g - inv * bgC) / af);
      b = clamp255((b - inv * bb) / af);
    }
    out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = a;
    if (a === 0) transparentPixels++;
    else if (a >= 254) opaquePixels++;
    else partialPixels++;
  }
  return {
    data: out, width: W, height: H,
    qa: { transparentPixels, opaquePixels, partialPixels, restoredPixels, totalPixels: N },
  };
}

// 승인된 평면 타이틀 형태를 알파 권위로 사용한다. 렌더는 RGB 재질만 제공하며
// 카운터·자간·외곽선은 maskData 에서만 결정된다. 두 캔버스는 정확히 같아야 한다.
export function extractShapeLockPixels(renderData, maskData) {
  if (renderData.width !== maskData.width || renderData.height !== maskData.height) {
    throw new Error(`형태 마스크 크기가 다릅니다. 렌더 ${renderData.width}×${renderData.height}, 마스크 ${maskData.width}×${maskData.height}`);
  }
  const W = renderData.width, H = renderData.height, N = W * H;
  const r = renderData.data, m = maskData.data;
  const out = new Uint8ClampedArray(r.length);
  let hasTransparentAlpha = false;
  for (let p = 0; p < N; p++) {
    if (m[p * 4 + 3] < 250) { hasTransparentAlpha = true; break; }
  }
  const maskBg = hasTransparentAlpha ? [0, 0, 0] : detectBg(m, W, H);
  let transparentPixels = 0, opaquePixels = 0, partialPixels = 0;
  for (let p = 0; p < N; p++) {
    const i = p * 4;
    let a;
    if (hasTransparentAlpha) {
      a = m[i + 3];
    } else {
      const dr = m[i] - maskBg[0], dg = m[i + 1] - maskBg[1], db = m[i + 2] - maskBg[2];
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);
      a = clamp255(((dist - 2) / 30) * 255);
    }
    out[i] = r[i]; out[i + 1] = r[i + 1]; out[i + 2] = r[i + 2];
    out[i + 3] = (r[i + 3] / 255) * a;
    if (out[i + 3] === 0) transparentPixels++;
    else if (out[i + 3] >= 254) opaquePixels++;
    else partialPixels++;
  }
  return {
    data: out, width: W, height: H,
    qa: { transparentPixels, opaquePixels, partialPixels, restoredPixels: 0, totalPixels: N, shapeLocked: true },
  };
}

export function shapeLockToBlob(renderData, maskData, { trim = false } = {}) {
  const { data, width: W, height: H, qa } = extractShapeLockPixels(renderData, maskData);
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const out = ctx.createImageData(W, H); out.data.set(data); ctx.putImageData(out, 0, 0);
  let exportCanvas = canvas;
  if (trim) {
    const box = alphaTrimBox(data, W, H);
    if (box) {
      exportCanvas = document.createElement('canvas'); exportCanvas.width = box.w; exportCanvas.height = box.h;
      exportCanvas.getContext('2d').drawImage(canvas, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
    }
  }
  return new Promise((resolve, reject) => exportCanvas.toBlob((blob) => blob
    ? resolve({ blob, width: exportCanvas.width, height: exportCanvas.height, qa })
    : reject(new Error('PNG 변환 실패')), 'image/png'));
}

// 불투명 픽셀의 경계 박스 (트림용). pad 여백 포함.
export function alphaTrimBox(o, W, H) {
  let minX = W, minY = H, maxX = 0, maxY = 0, found = false;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (o[(y * W + x) * 4 + 3] > 8) {
        found = true;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (!found) return null;
  const pad = 2;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(W - 1, maxX + pad); maxY = Math.min(H - 1, maxY + pad);
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// 로컬 색상 키잉 — ImageData → 배경색 거리 매트 → (형태 보호 + 디프린지 + 트림) → PNG blob.
// 1) 배경색 bg 와의 유클리드 거리. tolerance 이하 투명, +feather 이상 불투명, 사이 선형 램프.
// 2) holeProtect: 피사체 안쪽에 뚫린 구멍을 형태로 보고 복원. 3) decontam: 경계 디프린지. 4) trim.
export function colorKeyToBlob(srcData, { bg, tolerance, feather, holeProtect, holeSize, decontam, trim }) {
  const { data, width: W, height: H, qa } = extractColorKeyPixels(srcData, {
    bg, tolerance, feather, holeProtect, holeSize, decontam,
  });
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const out = ctx.createImageData(W, H), o = out.data;
  o.set(data);
  ctx.putImageData(out, 0, 0);

  let exportCanvas = canvas;
  if (trim) {
    const box = alphaTrimBox(o, W, H);
    if (box) {
      exportCanvas = document.createElement("canvas");
      exportCanvas.width = box.w; exportCanvas.height = box.h;
      exportCanvas.getContext("2d").drawImage(canvas, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
    }
  }
  const ow = exportCanvas.width, oh = exportCanvas.height;
  return new Promise((resolve, reject) => {
    exportCanvas.toBlob((b) => (b ? resolve({ blob: b, width: ow, height: oh, qa }) : reject(new Error("PNG 변환 실패"))), "image/png");
  });
}

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(new Error("PNG 변환 실패"));
  r.readAsDataURL(blob);
});

// 편의 래퍼 — dataURL/URL → 색상 키 투명 PNG dataURL.
// opts.bg 는 hex/[r,g,b], 생략 시 테두리에서 배경색 자동 추정. 그 외는 KEY_DEFAULTS.
export function colorKeyToTransparentPng(src, opts = {}) {
  return new Promise((resolve, reject) => {
    if (!src) { reject(new Error("이미지 데이터가 없습니다.")); return; }
    const { bg, ...params } = opts;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        const srcData = ctx.getImageData(0, 0, c.width, c.height);
        const bgRgb = bg != null ? toRgb(bg) : detectBg(srcData.data, c.width, c.height);
        const { blob } = await colorKeyToBlob(srcData, { ...KEY_DEFAULTS, ...params, bg: bgRgb || [0, 0, 0] });
        resolve(await blobToDataUrl(blob));
      } catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error("이미지 로드 실패"));
    img.src = src;
  });
}

// 픽셀 배열을 박스로 잘라낸다 — 캔버스 없이 동작(Node/MCP 공용). box 가 없으면 원본 그대로.
export function cropPixels({ data, width, height }, box) {
  if (!box || (box.x === 0 && box.y === 0 && box.w === width && box.h === height)) return { data, width, height };
  const out = new Uint8ClampedArray(box.w * box.h * 4);
  for (let y = 0; y < box.h; y++) {
    const src = ((box.y + y) * width + box.x) * 4;
    out.set(data.subarray(src, src + box.w * 4), y * box.w * 4);
  }
  return { data: out, width: box.w, height: box.h };
}
