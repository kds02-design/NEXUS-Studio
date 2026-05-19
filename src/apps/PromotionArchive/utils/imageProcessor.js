/**
 * 이미지를 규격에 맞게 크롭하고 최적화하는 엔진.
 *
 * 디코딩 전략 (관대한 순서):
 *  1) createImageBitmap(file)  — 가장 빠르고 포맷에 관대 (브라우저 네이티브 디코더)
 *  2) URL.createObjectURL(file) + <img>  — File 객체 직접 (MIME 손실 없음)
 *  3) (구) ArrayBuffer → Blob → URL  — 파기 (file.type 누락 시 디코딩 실패의 주범)
 *
 * 처리 후 캔버스·BitMap 즉시 파기.
 */

// ─── 사전 가드 — 명백히 브라우저가 못 읽는 포맷 차단 ───
const UNSUPPORTED_EXT = /\.(heic|heif|tiff?|psd|ai|raw|cr2|nef|arw|dng|svg)$/i;
const MAX_BYTES = 50 * 1024 * 1024;

function preflightCheck(file) {
  if (!file) throw new Error("파일이 비어 있습니다.");
  const name = file.name || "(이름 없음)";
  if (UNSUPPORTED_EXT.test(name)) {
    throw new Error(`지원하지 않는 형식: ${name} (HEIC/TIFF/PSD/AI/RAW/SVG 등은 JPG/PNG로 변환 후 업로드)`);
  }
  if (file.size === 0) {
    throw new Error(`파일 크기가 0입니다: ${name} (네트워크 폴더에서 직접 드롭 시 권한 문제일 수 있음. 바탕화면으로 복사 후 시도)`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`파일이 너무 큽니다 (${(file.size / 1024 / 1024).toFixed(1)}MB > ${MAX_BYTES / 1024 / 1024}MB): ${name}`);
  }
}

// File → HTMLImageElement (폴백 디코더)
function loadViaImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file); // File을 그대로 사용 → MIME 자동 감지
    const img = new Image();
    img.onload = () => resolve({ source: img, cleanup: () => { URL.revokeObjectURL(url); img.src = ""; } });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`<img> 디코딩 실패 (file.type="${file.type || '미상'}", size=${file.size})`));
    };
    img.src = url;
  });
}

// File → 디코딩된 이미지 (BitMap or Image), 어느 쪽이든 drawImage 가능
async function decodeImage(file) {
  // 1순위: createImageBitmap — 가장 관대하고 빠름
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file);
      return { source: bmp, cleanup: () => { if (bmp.close) bmp.close(); } };
    } catch (e) {
      console.warn(`[imageProcessor] createImageBitmap 실패, <img> 폴백 시도: ${file.name}`, e);
    }
  }
  // 2순위: <img> 엘리먼트
  return await loadViaImageElement(file);
}

export const processAndCropImage = async (file, isMobile) => {
  preflightCheck(file);

  const { source: img, cleanup } = await decodeImage(file);

  try {
    const targetW = isMobile ? 750 : 1920;
    const targetH = img.height;

    if (!img.width || !img.height) {
      throw new Error(`디코딩된 이미지 크기가 0입니다: ${file.name}`);
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context 생성 실패");

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    let sourceX = 0;
    let sourceW = img.width;
    if (img.width > targetW) {
      sourceX = (img.width - targetW) / 2;
      sourceW = targetW;
    }

    ctx.drawImage(
      img,
      sourceX, 0, sourceW, targetH,
      (targetW - sourceW) / 2, 0, sourceW, targetH
    );

    const thumbW = 800;
    const thumbH = (targetH * thumbW) / targetW;
    const thumbCanvas = document.createElement("canvas");
    thumbCanvas.width = thumbW;
    thumbCanvas.height = thumbH;
    const thumbCtx = thumbCanvas.getContext("2d");
    thumbCtx.imageSmoothingEnabled = true;
    thumbCtx.imageSmoothingQuality = "high";
    thumbCtx.drawImage(canvas, 0, 0, thumbW, thumbH);

    const results = {
      thumbnail: thumbCanvas.toDataURL("image/jpeg", 0.85),
      detail: canvas.toDataURL("image/jpeg", 0.9),
    };

    // 캔버스 즉시 파기 (메모리 회수)
    canvas.width = 0; canvas.height = 0;
    thumbCanvas.width = 0; thumbCanvas.height = 0;

    return results;
  } finally {
    cleanup();
  }
};
