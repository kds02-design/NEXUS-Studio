// 9-슬라이스(나인패치) 렌더링 유틸 — 단일 원본 이미지를 4 모서리·4 변·1 중앙으로 자르고
// 목표 크기에 맞춰 각각 다르게 늘려서 합성한다.
//   - 모서리(TL/TR/BL/BR): 고정 크기, 그대로 복사
//   - 변(T/B): 가로로만 늘림 / (L/R): 세로로만 늘림
//   - 중앙: 가로·세로 모두 늘림
// 결과: 임의의 W×H 로도 외곽 장식과 모서리 비율을 유지한 채 늘려 그릴 수 있다.

// insets 는 원본 이미지의 픽셀 단위. 합이 원본을 초과하지 않도록 호출자가 clamp 권장.
// (이 함수 내부에서도 안전하게 clamp 함)
export function drawNineSlice(ctx, img, insets, targetW, targetH) {
  const sw = img.naturalWidth || img.width;
  const sh = img.naturalHeight || img.height;

  // clamp — 인셋 합이 원본 W/H 를 넘으면 비례 축소.
  let { left, right, top, bottom } = insets;
  left   = Math.max(0, Math.min(left,   sw));
  right  = Math.max(0, Math.min(right,  sw));
  top    = Math.max(0, Math.min(top,    sh));
  bottom = Math.max(0, Math.min(bottom, sh));
  if (left + right > sw) {
    const ratio = sw / (left + right);
    left = Math.floor(left * ratio);
    right = Math.floor(right * ratio);
  }
  if (top + bottom > sh) {
    const ratio = sh / (top + bottom);
    top = Math.floor(top * ratio);
    bottom = Math.floor(bottom * ratio);
  }

  const sCenterW = Math.max(1, sw - left - right);
  const sCenterH = Math.max(1, sh - top - bottom);

  // 목표 캔버스에서도 코너가 잘리지 않도록 보정.
  const cornerSumX = left + right;
  const cornerSumY = top + bottom;
  const tw = Math.max(cornerSumX, targetW);
  const th = Math.max(cornerSumY, targetH);
  const tCenterW = Math.max(0, tw - cornerSumX);
  const tCenterH = Math.max(0, th - cornerSumY);

  // 깨끗한 픽셀 보간 — 검은 배경 + 외곽선 보존을 위해 medium 권장.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 코너 4개 — 1:1 복사
  if (left > 0 && top > 0)        ctx.drawImage(img, 0, 0, left, top,                                   0, 0, left, top);
  if (right > 0 && top > 0)       ctx.drawImage(img, sw - right, 0, right, top,                         tw - right, 0, right, top);
  if (left > 0 && bottom > 0)     ctx.drawImage(img, 0, sh - bottom, left, bottom,                      0, th - bottom, left, bottom);
  if (right > 0 && bottom > 0)    ctx.drawImage(img, sw - right, sh - bottom, right, bottom,            tw - right, th - bottom, right, bottom);

  // 변 4개 — 한 방향만 늘림
  if (tCenterW > 0 && top > 0)    ctx.drawImage(img, left, 0, sCenterW, top,                            left, 0, tCenterW, top);
  if (tCenterW > 0 && bottom > 0) ctx.drawImage(img, left, sh - bottom, sCenterW, bottom,               left, th - bottom, tCenterW, bottom);
  if (left > 0 && tCenterH > 0)   ctx.drawImage(img, 0, top, left, sCenterH,                            0, top, left, tCenterH);
  if (right > 0 && tCenterH > 0)  ctx.drawImage(img, sw - right, top, right, sCenterH,                  tw - right, top, right, tCenterH);

  // 중앙 — 양방향 늘림
  if (tCenterW > 0 && tCenterH > 0) ctx.drawImage(img, left, top, sCenterW, sCenterH,                   left, top, tCenterW, tCenterH);
}

// dataURL 또는 HTMLImageElement 를 받아 target 크기로 9-슬라이스 렌더 → dataURL 반환.
// 검은 배경은 그대로 유지 (투명 변환은 별도 단계).
export function renderNineSliceToDataUrl(source, insets, targetW, targetH, mimeType = 'image/png') {
  return new Promise((resolve, reject) => {
    const finalize = (img) => {
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      drawNineSlice(ctx, img, insets, targetW, targetH);
      try { resolve(canvas.toDataURL(mimeType === 'image/jpeg' ? 'image/jpeg' : 'image/png')); }
      catch (e) { reject(e); }
    };
    if (source instanceof HTMLImageElement && source.complete && source.naturalWidth) {
      finalize(source);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => finalize(img);
    img.onerror = () => reject(new Error('이미지 로드 실패'));
    img.src = typeof source === 'string' ? source : source.src;
  });
}

// 인셋의 비율 표기 — CSS `border-image-slice` 는 픽셀 정수만 받음.
export function insetsToCssBorderImageSlice(insets, fill = true) {
  const { top, right, bottom, left } = insets;
  const values = `${top} ${right} ${bottom} ${left}`;
  return fill ? `${values} fill` : values;
}
