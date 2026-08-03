// 스마트 투명화 — 이미지 배경을 분석해 가장 적절한 투명화 방식을 자동 선택.
//
//   analyzeImageBg(src)    → { kind:'black'|'solid'|'complex', hex, image, canvas }
//   smartTransparentPng(src) → { ok:true, dataUrl, method:'luma'|'colorkey', bgHex }
//                            | { ok:false, reason:'complex'|'load'|'taint' }
//
// 방식 선택 규칙 (MaskForge / RubiconForge 키잉 로직과 동일 철학):
//   - 순흑 배경(광원·이펙트) → 루마키: alpha = 밝기. 발광의 부드러운 감쇠를 보존.
//   - 단색 배경(타이포·버튼·프레임 등 오브젝트) → 컬러 거리 키잉 + 페더 + 디프린지.
//   - 복잡 배경(키비주얼·사진·씬) → 로컬 키잉 불가 판정. 원본 유지 + AI 누끼(마스크 포지) 권장.
//
// 원격 URL(Cloudinary 등)은 crossOrigin 으로 로드 — CORS 불허 시 canvas taint 로 실패하며
// { ok:false, reason:'taint' } 를 반환하므로 호출부는 원본 저장으로 폴백하면 된다.

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('이미지 로드 실패'));
  img.src = src;
});

const toHex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');

// 테두리 링(2% 두께)을 샘플링해 배경 후보색 + 균일도를 계산.
export async function analyzeImageBg(src) {
  const img = await loadImage(src);
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, w, h).data; // taint 시 여기서 throw

  const ring = Math.max(2, Math.round(Math.min(w, h) * 0.02));
  const step = Math.max(1, Math.floor(Math.min(w, h) / 160));
  const samples = [];
  const push = (x, y) => { const i = (y * w + x) * 4; samples.push([d[i], d[i + 1], d[i + 2]]); };
  for (let x = 0; x < w; x += step) for (let t = 0; t < ring; t++) { push(x, t); push(x, h - 1 - t); }
  for (let y = 0; y < h; y += step) for (let t = 0; t < ring; t++) { push(t, y); push(w - 1 - t, y); }

  const mean = samples.reduce((a, s) => [a[0] + s[0], a[1] + s[1], a[2] + s[2]], [0, 0, 0]).map(v => v / samples.length);
  // 평균과의 색 거리 평균 = 균일도. 낮을수록 단색 배경.
  const avgDist = samples.reduce((a, s) => a + Math.hypot(s[0] - mean[0], s[1] - mean[1], s[2] - mean[2]), 0) / samples.length;

  const luminance = 0.2126 * mean[0] + 0.7152 * mean[1] + 0.0722 * mean[2];
  let kind = 'complex';
  if (avgDist < 20) kind = luminance < 18 ? 'black' : 'solid';

  return { kind, hex: toHex(mean), mean, avgDist, image: img, canvas, ctx, w, h };
}

// 루마키 — 순흑 배경 발광 에셋용. alpha = max(r,g,b) 기반, 소프트 글로우 감쇠 보존.
function lumaKey(ctx, w, h) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const px = imageData.data;
  const threshold = 10, feather = 28;
  for (let i = 0; i < px.length; i += 4) {
    const lum = Math.max(px[i], px[i + 1], px[i + 2]);
    if (lum <= threshold) px[i + 3] = 0;
    else if (lum < threshold + feather) px[i + 3] = Math.round(((lum - threshold) / feather) * 255);
  }
  ctx.putImageData(imageData, 0, 0);
}

// 컬러 거리 키잉 — 단색 배경 오브젝트용. 페더 + 반투명 픽셀 배경색 역산(디프린지).
function colorKey(ctx, w, h, [br, bg, bb]) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const px = imageData.data;
  const threshold = 26, feather = 56;
  const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
  for (let i = 0; i < px.length; i += 4) {
    const dist = Math.hypot(px[i] - br, px[i + 1] - bg, px[i + 2] - bb);
    if (dist <= threshold) { px[i + 3] = 0; continue; }
    if (dist < threshold + feather) {
      const a = (dist - threshold) / feather;
      px[i + 3] = Math.round(px[i + 3] * a);
      // 디프린지 — 경계 반투명 픽셀에서 배경색 성분 제거해 후광 방지.
      const inv = 1 - a;
      px[i] = clamp((px[i] - inv * br) / a);
      px[i + 1] = clamp((px[i + 1] - inv * bg) / a);
      px[i + 2] = clamp((px[i + 2] - inv * bb) / a);
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

export async function smartTransparentPng(src) {
  let a;
  try {
    a = await analyzeImageBg(src);
  } catch (e) {
    const taint = /insecure|tainted|SecurityError/i.test(String(e?.message || e?.name || e));
    return { ok: false, reason: taint ? 'taint' : 'load' };
  }
  if (a.kind === 'complex') return { ok: false, reason: 'complex', bgHex: a.hex };
  try {
    if (a.kind === 'black') lumaKey(a.ctx, a.w, a.h);
    else colorKey(a.ctx, a.w, a.h, a.mean);
    return { ok: true, dataUrl: a.canvas.toDataURL('image/png'), method: a.kind === 'black' ? 'luma' : 'colorkey', bgHex: a.hex };
  } catch {
    return { ok: false, reason: 'taint', bgHex: a.hex };
  }
}
