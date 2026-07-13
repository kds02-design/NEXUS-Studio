// 이미지 유틸 — 투명 PNG 여백 자동 트림 등.

export function loadImageEl(src) {
  return new Promise((resolve, reject) => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지 로드 실패"));
    img.src = src;
  });
}

// 투명 여백을 잘라낸다. 불투명 이미지(투명 픽셀 없음)는 원본을 그대로 반환.
// 반환: { dataUrl, width, height, trimmed }
export async function trimTransparent(dataUrl, alphaThreshold = 8) {
  const img = await loadImageEl(dataUrl);
  if (!img) return { dataUrl, width: 0, height: 0, trimmed: false };
  const W = img.naturalWidth, H = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  let data;
  try { data = ctx.getImageData(0, 0, W, H).data; }
  catch { return { dataUrl, width: W, height: H, trimmed: false }; } // CORS 등

  let minX = W, minY = H, maxX = -1, maxY = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] > alphaThreshold) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  // 투명 픽셀이 전혀 없거나(=불투명), 완전 투명이면 트림 불필요
  if (maxX < 0) return { dataUrl, width: W, height: H, trimmed: false };
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  if (cw === W && ch === H) return { dataUrl, width: W, height: H, trimmed: false };

  const out = document.createElement("canvas");
  out.width = cw; out.height = ch;
  out.getContext("2d").drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch);
  return { dataUrl: out.toDataURL("image/png"), width: cw, height: ch, trimmed: true };
}

// CSS/canvas 공용 필터 문자열 — 채도/밝기/대비/색조.
export function filterString(f) {
  if (!f) return "none";
  const sat = f.sat ?? 100, bri = f.bri ?? 100, con = f.con ?? 100, hue = f.hue ?? 0;
  if (sat === 100 && bri === 100 && con === 100 && hue === 0) return "none";
  return `saturate(${sat}%) brightness(${bri}%) contrast(${con}%) hue-rotate(${hue}deg)`;
}
