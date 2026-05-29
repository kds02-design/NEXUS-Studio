// CompetitorRadar — 이미지 입력 유틸 (File/blob → dataURL, canvas 압축).

export const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export const compressDataUrl = (dataUrl, maxWidth = 1280, quality = 0.82) => new Promise((resolve) => {
  if (!dataUrl) { resolve(null); return; }
  const img = new Image();
  img.src = dataUrl;
  img.onload = () => {
    const canvas = document.createElement("canvas");
    let w = img.width, h = img.height;
    if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth; }
    canvas.width = w; canvas.height = h;
    try { canvas.getContext("2d").drawImage(img, 0, 0, w, h); resolve(canvas.toDataURL("image/jpeg", quality)); }
    catch { resolve(dataUrl); }
  };
  img.onerror = () => resolve(dataUrl);
});

// 클립보드/드롭 이벤트에서 첫 이미지 파일을 추출.
export const extractImageFile = (e) => {
  const items = e.clipboardData?.items || e.dataTransfer?.items;
  if (items) {
    for (const it of items) {
      if (it.kind === "file" && it.type.startsWith("image/")) return it.getAsFile();
    }
  }
  const files = e.dataTransfer?.files;
  if (files) {
    for (const f of files) if (f.type.startsWith("image/")) return f;
  }
  return null;
};
