import { uploadBase64 } from "../../../lib/storage";

export { uploadBase64 };

export const blobUrlToBase64 = async (url) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Blob conversion failed", e);
    return url;
  }
};

export const compressImage = (base64Str, maxWidth = 400, quality = 0.7) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64Str);
  });
};

// Convert any image source (data URL, http(s), blob:, raw base64) to a raw
// base64 string suitable for Gemini's inlineData. Compresses to maxWidth.
export const prepareImageForAI = async (imgSource, maxWidth = 1024, quality = 0.8) => {
  if (!imgSource) return null;
  if (imgSource.startsWith('data:image')) {
    const compressed = await compressImage(imgSource, maxWidth, quality);
    return compressed.split(',')[1];
  }
  if (imgSource.startsWith('http') || imgSource.startsWith('blob:')) {
    const dataUrl = await blobUrlToBase64(imgSource);
    if (!dataUrl) throw new Error("이미지 다운로드 실패 (CORS 또는 네트워크)");
    const compressed = await compressImage(dataUrl, maxWidth, quality);
    return compressed.split(',')[1];
  }
  if (imgSource.includes(',')) return imgSource.split(',')[1];
  return imgSource;
};
