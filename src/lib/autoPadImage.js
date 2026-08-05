// 여백 없는 이미지 자동 패딩 — 피사체가 프레임 가장자리에 붙어 있으면
// 주변 캔버스를 확장해 광원·빛효과가 실루엣 바깥으로 퍼질 공간을 확보한다.
// (RubiconForge 광원·빛효과 모드의 '형태 참고' 업로드에서 사용)
//
// 여백은 "긴 변" 기준의 절대 px 목표로, 부족한 변만 채워 상하좌우를 대칭으로 맞춘다.
// → 가로로 긴 배너처럼 상하만 꽉 찬 경우에도 상/하에 넉넉한 공간이 생긴다.
// opts.aspectRatio(예: 16/9)를 주면 최소 여백 확보 후 무조건 그 비율이 되도록 확장한다(크롭 없음).
//
//   autoPadImage(src, opts) → { padded, dataUrl, reason, marginRatio }
//     padded=false 면 dataUrl 은 원본 그대로.
//     reason: 'padded' | 'has-margin' | 'empty' | 'load' | 'taint'
//
// 배경/콘텐츠 판정:
//   - 모서리가 투명한 PNG → 알파 기준 바운딩박스 산출, 패딩은 투명으로 채움.
//   - 불투명 단색 배경   → 모서리 평균색 기준 바운딩박스, 패딩은 그 배경색으로 채움.
//   원격 URL(Cloudinary 등)은 CORS 불허 시 canvas taint 로 실패 → { padded:false, reason:'taint' }.

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('load'));
  img.src = src;
});

export async function autoPadImage(src, {
  marginThreshold = 0.06,  // 네 변 중 하나라도 이 비율 미만이면 "여백 없음"으로 판정
  targetMargin = 0.22,     // 패딩 후 콘텐츠 크기 기준 각 변 여백 목표 비율
  alphaThreshold = 12,     // 이 알파 미만은 투명(배경)으로 간주
  colorThreshold = 24,     // 단색 배경과의 색 거리 이 값 초과면 콘텐츠
  aspectRatio = null,      // 지정 시(예: 16/9) 무조건 그 비율이 되도록 여백을 추가(크롭 없음)
} = {}) {
  if (!src) return { padded: false, dataUrl: src, reason: 'empty' };

  let img;
  try { img = await loadImage(src); }
  catch { return { padded: false, dataUrl: src, reason: 'load' }; }

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return { padded: false, dataUrl: src, reason: 'load' };

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);

  let data;
  try { data = ctx.getImageData(0, 0, w, h).data; } // taint 시 throw
  catch { return { padded: false, dataUrl: src, reason: 'taint' }; }

  // 배경 판정 — 네 모서리 샘플. 전부 알파가 낮으면 투명 배경, 아니면 모서리 평균색.
  const corner = (x, y) => { const i = (y * w + x) * 4; return [data[i], data[i + 1], data[i + 2], data[i + 3]]; };
  const corners = [corner(0, 0), corner(w - 1, 0), corner(0, h - 1), corner(w - 1, h - 1)];
  const transparentBg = corners.every(c => c[3] < alphaThreshold);
  const bg = corners.reduce((a, c) => [a[0] + c[0], a[1] + c[1], a[2] + c[2]], [0, 0, 0]).map(v => v / 4);

  const isContent = (i) => {
    const a = data[i + 3];
    if (transparentBg) return a >= alphaThreshold;
    if (a < alphaThreshold) return false;
    return Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2]) > colorThreshold;
  };

  // 콘텐츠 바운딩박스 — 대형 이미지는 서브샘플링으로 스캔 비용 제한.
  let minX = w, minY = h, maxX = -1, maxY = -1;
  const step = Math.max(1, Math.floor(Math.min(w, h) / 400));
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (isContent((y * w + x) * 4)) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { padded: false, dataUrl: src, reason: 'empty' };

  // 각 변의 현재 여백(px). 가로로 긴 배너처럼 상하만 꽉 찬 경우 curT/curB 가 0에 가깝다.
  const curL = minX, curR = w - 1 - maxX, curT = minY, curB = h - 1 - maxY;
  const minMargin = Math.min(curL / w, curR / w, curT / h, curB / h);
  // 비율 강제가 없을 때만: 네 변 모두 이미 충분한 여백이 있으면 원본 유지.
  // aspectRatio 가 지정되면 무조건 그 비율로 맞춰야 하므로 이 조기 반환을 건너뛴다.
  if (!aspectRatio && minMargin >= marginThreshold) {
    return { padded: false, dataUrl: src, reason: 'has-margin', marginRatio: minMargin };
  }

  // 1단계: 광원이 퍼질 최소 여백 확보 — "긴 변" 기준 절대 px 목표로 부족한 변만 채운다.
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  const desired = Math.max(1, Math.round(Math.max(cw, ch) * targetMargin));
  let addL = Math.max(0, desired - curL), addR = Math.max(0, desired - curR);
  let addT = Math.max(0, desired - curT), addB = Math.max(0, desired - curB);

  // 2단계(선택): 지정 비율로 강제 — 부족한 축에만 좌우/상하 대칭으로 여백을 더한다(크롭 없음).
  if (aspectRatio && aspectRatio > 0) {
    let curW = w + addL + addR, curH = h + addT + addB;
    if (curW / curH < aspectRatio) {
      const extra = Math.round(curH * aspectRatio) - curW; // 가로가 부족 → 좌우로
      addL += Math.floor(extra / 2); addR += extra - Math.floor(extra / 2);
    } else if (curW / curH > aspectRatio) {
      const extra = Math.round(curW / aspectRatio) - curH; // 세로가 부족 → 상하로
      addT += Math.floor(extra / 2); addB += extra - Math.floor(extra / 2);
    }
  }

  if (addL + addR + addT + addB === 0) {
    return { padded: false, dataUrl: src, reason: 'has-margin', marginRatio: minMargin };
  }
  const outW = w + addL + addR, outH = h + addT + addB;

  const out = document.createElement('canvas');
  out.width = outW; out.height = outH;
  const octx = out.getContext('2d');
  if (!transparentBg) {
    octx.fillStyle = `rgb(${Math.round(bg[0])},${Math.round(bg[1])},${Math.round(bg[2])})`;
    octx.fillRect(0, 0, outW, outH);
  }
  octx.drawImage(img, addL, addT, w, h);

  return { padded: true, dataUrl: out.toDataURL('image/png'), reason: 'padded', marginRatio: minMargin };
}
