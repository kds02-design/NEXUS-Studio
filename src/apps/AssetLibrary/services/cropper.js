// 캔버스 기반 이미지 영역 크롭. 좌표는 0-1 비율(rect) 로 받음 → 원본 픽셀로 변환 후 추출.
// 원본 이미지는 fetch (CORS 통과 필요 — Cloudinary 는 기본 통과).
// 결과는 dataURL(image/jpeg) — Cloudinary 업로드용으로 그대로 사용 가능.

export async function cropImageToDataUrl(srcUrl, rect, options = {}) {
  const { quality = 0.92, mimeType = "image/jpeg" } = options;
  if (!srcUrl) throw new Error("이미지 URL 이 없습니다.");
  if (!rect || rect.w <= 0 || rect.h <= 0) throw new Error("잘못된 영역입니다.");

  // 이미지 로드. CORS 차단 대비해 crossOrigin 사용.
  const img = await loadImage(srcUrl);
  const naturalW = img.naturalWidth || img.width;
  const naturalH = img.naturalHeight || img.height;

  // rect 는 0-1 비율 — 실제 픽셀로 환산.
  const sx = Math.max(0, Math.round(rect.x * naturalW));
  const sy = Math.max(0, Math.round(rect.y * naturalH));
  const sw = Math.min(naturalW - sx, Math.round(rect.w * naturalW));
  const sh = Math.min(naturalH - sy, Math.round(rect.h * naturalH));

  if (sw < 4 || sh < 4) throw new Error("선택 영역이 너무 작습니다.");

  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

  // CORS 잘못 설정된 이미지는 toDataURL 에서 SecurityError → 호출부에서 처리.
  return {
    dataUrl: canvas.toDataURL(mimeType, quality),
    width: sw,
    height: sh,
  };
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지 로드 실패 (CORS 또는 네트워크)"));
    img.src = url;
  });
}

// 파일을 dataURL 로 변환.
export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsDataURL(file);
  });
}

// dataURL 로부터 자연 크기(width/height) 측정.
export function probeImageSize(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("이미지 크기 측정 실패"));
    img.src = dataUrl;
  });
}
