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
function effectToCanvas(srcData, { cutoff, gamma, opacity, recoverColor, trim, bg }) {
  const W = srcData.width, H = srcData.height, s = srcData.data;
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const out = ctx.createImageData(W, H), o = out.data;
  const threshold = Math.min(0.95, Math.max(0, cutoff / 255));
  const curve = Math.max(0.2, gamma);
  const gain = Math.max(0, opacity / 100);
  const rgb = toRgb(bg);
  const br = (rgb[0] || 0) / 255, bgr = (rgb[1] || 0) / 255, bb = (rgb[2] || 0) / 255;
  for (let i = 0; i < s.length; i += 4) {
    const sr = s[i] / 255, sg = s[i + 1] / 255, sb = s[i + 2] / 255;
    // 배경과의 색거리 = 참 알파 근사 — 검정 배경이면 max(RGB) 밝기와 동일
    const d = Math.max(Math.abs(sr - br), Math.abs(sg - bgr), Math.abs(sb - bb));
    let a = d <= threshold ? 0 : (d - threshold) / Math.max(0.001, 1 - threshold);
    a = Math.min(1, Math.pow(a, curve) * gain) * (s[i + 3] / 255);
    if (a <= 0.0001) { o[i] = o[i + 1] = o[i + 2] = o[i + 3] = 0; continue; }
    if (recoverColor && d > 0.0001) {
      // 배경 성분 역산 제거 — 검정 배경에선 C/peak(기존 발광색 복원)와 동일
      o[i] = clamp255(((sr - (1 - d) * br) / d) * 255);
      o[i + 1] = clamp255(((sg - (1 - d) * bgr) / d) * 255);
      o[i + 2] = clamp255(((sb - (1 - d) * bb) / d) * 255);
    } else {
      o[i] = s[i]; o[i + 1] = s[i + 1]; o[i + 2] = s[i + 2];
    }
    o[i + 3] = clamp255(a * 255);
  }
  ctx.putImageData(out, 0, 0);
  if (trim) {
    const box = alphaTrimBox(o, W, H);
    if (box) {
      const ec = document.createElement('canvas'); ec.width = box.w; ec.height = box.h;
      ec.getContext('2d').drawImage(canvas, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
      return ec;
    }
  }
  return canvas;
}

// MaskForge 호환 시그니처 — { blob, width, height } 반환.
export function effectToBlob(srcData, opts) {
  const canvas = effectToCanvas(srcData, opts);
  const ow = canvas.width, oh = canvas.height;
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve({ blob: b, width: ow, height: oh }) : reject(new Error('PNG 변환 실패'))), 'image/png'));
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
        const canvas = effectToCanvas(srcData, { ...EFFECT_DEFAULTS, ...params, bg });
        resolve(canvas.toDataURL('image/png'));
      } catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error('이미지 로드 실패'));
    img.src = src;
  });
}
