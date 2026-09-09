// 발광 이펙트(광원·글로우·파티클) 전용 투명 추출 — 마스크 포지의 "이펙트 추출"과 동일 로직.
// 배경 B 위 프리멀티플라이(C = A·F + (1−A)·B)로 보고, 참 알파를 배경과의 색거리(max-norm)로
// 근사, F = (C − (1−A)·B)/A 로 역산해 헤일로 없는 straight-alpha PNG를 만든다.
// bg 미지정/검정이면 max(RGB) 밝기 방식과 동일 — 크로마 그린/블루 등 단색 배경 발광 렌더도 같은 수식으로 추출.
//
// MaskForge(index.jsx) 와 RubiconForge 결과 셀 다운로드가 공유하는 단일 진실 소스.
//   effectToBlob(srcData, opts)          → { blob, width, height }   (MaskForge 실시간/내보내기용)
//   effectToTransparentPng(dataUrl, opts) → Promise<dataUrl PNG 문자열>  (다운로드용 편의 래퍼)

export const EFFECT_DEFAULTS = { cutoff: 6, gamma: 0.85, opacity: 100, recoverColor: true, trim: false };

const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

// 투명 여백 자동 잘라내기용 바운딩 박스.
function alphaTrimBox(o, W, H) {
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

// hex 문자열 / [r,g,b] 배열 / falsy → [r,g,b] 0-255 (falsy=검정).
function toRgb(bg) {
  if (Array.isArray(bg)) return bg;
  if (typeof bg === 'string') {
    const h = bg.replace('#', '');
    const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const int = parseInt(n, 16);
    if (Number.isNaN(int)) return [0, 0, 0];
    return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
  }
  return [0, 0, 0];
}

// 이펙트 추출 → 트림된 캔버스. (effectToBlob/effectToTransparentPng 공용 코어)
// DOM 없이도 회귀 테스트 가능한 픽셀 코어. 색 복원에는 반드시 최종 매트 알파를 사용한다.
// 이전 구현은 RGB에는 원시 색거리 d, 출력 알파에는 cutoff/gamma가 적용된 값을 사용해
// 두 값이 불일치했고, 그 결과 검정 위 재합성만으로도 밝기·채도 변화가 생길 수 있었다.
export function extractEffectPixels(srcData, { cutoff, gamma, opacity, recoverColor, bg }) {
  const W = srcData.width, H = srcData.height, s = srcData.data;
  const o = new Uint8ClampedArray(s.length);
  const threshold = Math.min(0.95, Math.max(0, cutoff / 255));
  const curve = Math.max(0.2, gamma);
  const gain = Math.max(0, opacity / 100);
  const rgb = toRgb(bg);
  const br = (rgb[0] || 0) / 255, bgr = (rgb[1] || 0) / 255, bb = (rgb[2] || 0) / 255;
  let transparentPixels = 0, opaquePixels = 0, partialPixels = 0;
  let reconstructionError = 0, reconstructionSamples = 0;
  for (let i = 0; i < s.length; i += 4) {
    const sr = s[i] / 255, sg = s[i + 1] / 255, sb = s[i + 2] / 255;
    // 배경과의 색거리 = 참 알파 근사 — 검정 배경이면 max(RGB) 밝기와 동일
    const d = Math.max(Math.abs(sr - br), Math.abs(sg - bgr), Math.abs(sb - bb));
    let matteAlpha = d <= threshold ? 0 : (d - threshold) / Math.max(0.001, 1 - threshold);
    matteAlpha = Math.min(1, Math.pow(matteAlpha, curve) * gain);
    const sourceAlpha = s[i + 3] / 255;
    const outputAlpha = matteAlpha * sourceAlpha;
    if (outputAlpha <= 0.0001) {
      o[i] = o[i + 1] = o[i + 2] = o[i + 3] = 0;
      transparentPixels++;
      continue;
    }
    if (recoverColor && matteAlpha >= 8 / 255) {
      // Photoshop Remove Black Matte와 같은 목적의 straight-alpha unmix.
      // RGB와 출력 알파가 같은 matteAlpha를 사용하므로 원래 매트 위 외관이 보존된다.
      o[i] = clamp255(((sr - (1 - matteAlpha) * br) / matteAlpha) * 255);
      o[i + 1] = clamp255(((sg - (1 - matteAlpha) * bgr) / matteAlpha) * 255);
      o[i + 2] = clamp255(((sb - (1 - matteAlpha) * bb) / matteAlpha) * 255);
    } else {
      o[i] = s[i]; o[i + 1] = s[i + 1]; o[i + 2] = s[i + 2];
    }
    o[i + 3] = clamp255(outputAlpha * 255);
    if (o[i + 3] >= 254) opaquePixels++; else partialPixels++;

    if (recoverColor) {
      const rr = (o[i] / 255) * matteAlpha + (1 - matteAlpha) * br;
      const rg = (o[i + 1] / 255) * matteAlpha + (1 - matteAlpha) * bgr;
      const rb = (o[i + 2] / 255) * matteAlpha + (1 - matteAlpha) * bb;
      reconstructionError += Math.abs(rr - sr) + Math.abs(rg - sg) + Math.abs(rb - sb);
      reconstructionSamples += 3;
    }
  }
  return {
    data: o, width: W, height: H,
    qa: {
      transparentPixels, opaquePixels, partialPixels, totalPixels: W * H,
      reconstructionMae: reconstructionSamples ? reconstructionError / reconstructionSamples : 0,
    },
  };
}

function effectToCanvas(srcData, { cutoff, gamma, opacity, recoverColor, trim, bg }) {
  const { data, width: W, height: H, qa } = extractEffectPixels(srcData, {
    cutoff, gamma, opacity, recoverColor, bg,
  });
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const out = ctx.createImageData(W, H), o = out.data;
  o.set(data);
  ctx.putImageData(out, 0, 0);
  if (trim) {
    const box = alphaTrimBox(o, W, H);
    if (box) {
      const ec = document.createElement('canvas'); ec.width = box.w; ec.height = box.h;
      ec.getContext('2d').drawImage(canvas, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
      return { canvas: ec, qa };
    }
  }
  return { canvas, qa };
}

// MaskForge 호환 시그니처 — { blob, width, height } 반환.
export function effectToBlob(srcData, opts) {
  const { canvas, qa } = effectToCanvas(srcData, opts);
  const ow = canvas.width, oh = canvas.height;
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve({ blob: b, width: ow, height: oh, qa }) : reject(new Error('PNG 변환 실패'))), 'image/png'));
}

// 다운로드용 편의 래퍼 — dataURL(또는 URL) → 이펙트 추출 투명 PNG dataURL.
// opts.bg 는 hex 문자열 / [r,g,b] / 생략(검정). 그 외는 EFFECT_DEFAULTS.
export function effectToTransparentPng(src, opts = {}) {
  return new Promise((resolve, reject) => {
    if (!src) { reject(new Error('이미지 데이터가 없습니다.')); return; }
    const { bg, ...params } = opts;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        const srcData = ctx.getImageData(0, 0, c.width, c.height);
        const { canvas } = effectToCanvas(srcData, { ...EFFECT_DEFAULTS, ...params, bg });
        resolve(canvas.toDataURL('image/png'));
      } catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error('이미지 로드 실패'));
    img.src = src;
  });
}
