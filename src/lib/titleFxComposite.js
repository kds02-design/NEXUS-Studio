import { extractShapeLockPixels } from './colorKeyExtract.js';
import { EFFECT_DEFAULTS, extractEffectPixels } from './effectExtract.js';

const ALPHA_EPS = 8;

const assertSameCanvas = (base, candidate, label) => {
  if (!candidate) return;
  if (base.width !== candidate.width || base.height !== candidate.height) {
    throw new Error(`${label} 크기가 다릅니다. 기준 ${base.width}×${base.height}, ${label} ${candidate.width}×${candidate.height}`);
  }
};

const hasUsefulTransparency = (imageData) => {
  if (!imageData) return false;
  let transparent = 0, visible = 0;
  for (let i = 3; i < imageData.data.length; i += 4) {
    if (imageData.data[i] < 250) transparent++;
    if (imageData.data[i] > ALPHA_EPS) visible++;
  }
  return transparent > 0 && visible > 0;
};

const normalizeEffect = (imageData, effectOptions) => {
  if (!imageData) return null;
  if (hasUsefulTransparency(imageData)) {
    return { data: new Uint8ClampedArray(imageData.data), width: imageData.width, height: imageData.height };
  }
  return extractEffectPixels(imageData, { ...EFFECT_DEFAULTS, bg: [0, 0, 0], ...effectOptions });
};

// 모든 유효 FX 픽셀에서 최근접 전파 지도를 만든다. 후방은 타이틀 아래 전체를 채우고,
// 전방은 지정 반경까지만 부드럽게 연장하는 데 같은 지도를 사용한다.
function nearestEffectMap(fx, titleAlpha) {
  const W = fx.width, H = fx.height, N = W * H;
  const source = new Int32Array(N); source.fill(-1);
  const distance = new Int32Array(N); distance.fill(-1);
  const queue = new Int32Array(N);
  let head = 0, tail = 0;
  for (let p = 0; p < N; p++) {
    if (titleAlpha[p] <= ALPHA_EPS && fx.data[p * 4 + 3] > ALPHA_EPS) {
      source[p] = p; distance[p] = 0; queue[tail++] = p;
    }
  }
  while (head < tail) {
    const p = queue[head++], x = p % W, y = (p / W) | 0;
    const visit = (n) => {
      if (distance[n] >= 0) return;
      distance[n] = distance[p] + 1;
      source[n] = source[p];
      queue[tail++] = n;
    };
    if (x > 0) visit(p - 1);
    if (x + 1 < W) visit(p + 1);
    if (y > 0) visit(p - W);
    if (y + 1 < H) visit(p + W);
  }
  return { source, distance };
}

export function healBackEffectUnderTitle(effectData, titleAlpha) {
  const fx = { data: new Uint8ClampedArray(effectData.data), width: effectData.width, height: effectData.height };
  const { source } = nearestEffectMap(fx, titleAlpha);
  let filledPixels = 0;
  for (let p = 0; p < titleAlpha.length; p++) {
    if (titleAlpha[p] <= ALPHA_EPS || source[p] < 0) continue;
    const si = source[p] * 4, i = p * 4;
    if (fx.data[i + 3] >= fx.data[si + 3]) continue;
    fx.data[i] = fx.data[si]; fx.data[i + 1] = fx.data[si + 1]; fx.data[i + 2] = fx.data[si + 2]; fx.data[i + 3] = fx.data[si + 3];
    filledPixels++;
  }
  return { ...fx, filledPixels };
}

export function softenFrontEffectAcrossTitle(effectData, titleAlpha, radius = 12) {
  const fx = { data: new Uint8ClampedArray(effectData.data), width: effectData.width, height: effectData.height };
  const { source, distance } = nearestEffectMap(fx, titleAlpha);
  const R = Math.max(1, Math.round(radius));
  let extendedPixels = 0;
  for (let p = 0; p < titleAlpha.length; p++) {
    if (titleAlpha[p] <= ALPHA_EPS || source[p] < 0 || distance[p] <= 0 || distance[p] > R) continue;
    const si = source[p] * 4, i = p * 4;
    const weight = Math.max(0, 1 - (distance[p] - 1) / R);
    const candidateAlpha = fx.data[si + 3] * weight * (titleAlpha[p] / 255);
    if (candidateAlpha <= fx.data[i + 3]) continue;
    fx.data[i] = fx.data[si]; fx.data[i + 1] = fx.data[si + 1]; fx.data[i + 2] = fx.data[si + 2]; fx.data[i + 3] = candidateAlpha;
    extendedPixels++;
  }
  return { ...fx, extendedPixels, radius: R };
}

export function buildTitleFxLayers(titleRender, titleMask, backEffect, frontEffect, { frontOverlap = 12, effectOptions = {} } = {}) {
  assertSameCanvas(titleRender, titleMask, '형태 마스크');
  assertSameCanvas(titleRender, backEffect, '후방 FX');
  assertSameCanvas(titleRender, frontEffect, '전방 FX');
  const body = extractShapeLockPixels(titleRender, titleMask);
  const N = titleRender.width * titleRender.height;
  const titleAlpha = new Uint8ClampedArray(N);
  for (let p = 0; p < N; p++) titleAlpha[p] = body.data[p * 4 + 3];

  const empty = () => ({ data: new Uint8ClampedArray(N * 4), width: titleRender.width, height: titleRender.height });
  const normalizedBack = normalizeEffect(backEffect, effectOptions) || empty();
  const normalizedFront = normalizeEffect(frontEffect, effectOptions) || empty();
  const back = healBackEffectUnderTitle(normalizedBack, titleAlpha);
  const front = softenFrontEffectAcrossTitle(normalizedFront, titleAlpha, frontOverlap);
  return {
    width: titleRender.width,
    height: titleRender.height,
    body,
    back,
    front,
    qa: {
      shapeLocked: true,
      backFilledPixels: back.filledPixels,
      frontExtendedPixels: front.extendedPixels,
      frontOverlap: front.radius,
      sameCanvas: true,
    },
  };
}

const canvasFromPixels = (pixels, W, H) => {
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(W, H); image.data.set(pixels); ctx.putImageData(image, 0, 0);
  return canvas;
};

const toBlob = (canvas) => new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG 변환 실패')), 'image/png'));

const alphaBounds = (pixels, W, H) => {
  let left = W, top = H, right = -1, bottom = -1;
  for (let p = 0; p < W * H; p++) {
    if (pixels[p * 4 + 3] <= ALPHA_EPS) continue;
    const x = p % W, y = (p / W) | 0;
    left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  if (right < left) return null;
  return { x: Math.max(0, left - 2), y: Math.max(0, top - 2), right: Math.min(W - 1, right + 2), bottom: Math.min(H - 1, bottom + 2) };
};

export async function composeTitleFxToBlobs(titleRender, titleMask, backEffect, frontEffect, options = {}) {
  const layers = buildTitleFxLayers(titleRender, titleMask, backEffect, frontEffect, options);
  const { width: W, height: H } = layers;
  const backCanvas = canvasFromPixels(layers.back.data, W, H);
  const bodyCanvas = canvasFromPixels(layers.body.data, W, H);
  const frontCanvas = canvasFromPixels(layers.front.data, W, H);
  const combined = document.createElement('canvas'); combined.width = W; combined.height = H;
  const ctx = combined.getContext('2d');
  ctx.drawImage(backCanvas, 0, 0);
  ctx.drawImage(bodyCanvas, 0, 0);
  ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(frontCanvas, 0, 0);
  ctx.globalCompositeOperation = 'source-over';

  const combinedPixels = ctx.getImageData(0, 0, W, H).data;
  let transparentPixels = 0, opaquePixels = 0, partialPixels = 0;
  for (let i = 3; i < combinedPixels.length; i += 4) {
    if (combinedPixels[i] === 0) transparentPixels++;
    else if (combinedPixels[i] >= 254) opaquePixels++;
    else partialPixels++;
  }

  let exportCanvas = combined;
  if (options.trim) {
    const box = alphaBounds(combinedPixels, W, H);
    if (box) {
      exportCanvas = document.createElement('canvas');
      exportCanvas.width = box.right - box.x + 1; exportCanvas.height = box.bottom - box.y + 1;
      exportCanvas.getContext('2d').drawImage(combined, box.x, box.y, exportCanvas.width, exportCanvas.height, 0, 0, exportCanvas.width, exportCanvas.height);
    }
  }
  const [combinedBlob, bodyBlob, backBlob, frontBlob] = await Promise.all([
    toBlob(exportCanvas), toBlob(bodyCanvas), toBlob(backCanvas), toBlob(frontCanvas),
  ]);
  return {
    blob: combinedBlob,
    width: exportCanvas.width,
    height: exportCanvas.height,
    layers: { bodyBlob, backBlob, frontBlob, canvasWidth: W, canvasHeight: H },
    qa: { ...layers.qa, transparentPixels, opaquePixels, partialPixels, totalPixels: W * H },
  };
}
