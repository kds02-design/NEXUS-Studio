// 앵커(기준점) 썸네일을 Gemini inlineData 용 base64 로 변환 + 세션 캐싱.
// 시각 few-shot 주입 시 3개 앱(BannerCodex / DesignEvaluator / PromotionArchive)이 공유.
// lib 은 app 에 의존하지 않으므로 압축 로직을 자체 포함(= BannerCodex/cloudinary.prepareImageForAI 와 동일 기법).
//
// 캐시: 앵커 id → base64. 일괄 분석에서 같은 앵커 이미지를 매번 재다운로드/재압축하지 않도록 함.

const _cache = new Map(); // anchorId -> base64 (raw, no data: prefix)

const _compress = (src, maxWidth = 512, quality = 0.8) => new Promise((resolve) => {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  img.onload = () => {
    const canvas = document.createElement("canvas");
    let w = img.width, h = img.height;
    if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth; }
    canvas.width = w;
    canvas.height = h;
    try {
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    } catch { resolve(src); }
  };
  img.onerror = () => resolve(null);
});

const _urlToDataUrl = async (url) => {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const _toBase64 = async (thumbnailUrl) => {
  if (!thumbnailUrl) return null;
  let dataUrl = thumbnailUrl;
  if (thumbnailUrl.startsWith("http") || thumbnailUrl.startsWith("blob:")) {
    dataUrl = await _urlToDataUrl(thumbnailUrl);
  }
  if (typeof dataUrl !== "string") return null;
  if (dataUrl.startsWith("data:image")) {
    const compressed = await _compress(dataUrl);
    if (!compressed) return null;
    return compressed.split(",")[1];
  }
  if (dataUrl.includes(",")) return dataUrl.split(",")[1];
  return dataUrl;
};

// 입력 앵커 배열 → [{ anchor, base64 }] (성공분만, 입력 순서 보존).
// 실패(CORS/네트워크/형식)한 앵커는 조용히 제외.
export async function prepareAnchorImages(anchors) {
  const list = Array.isArray(anchors) ? anchors : [];
  const out = [];
  for (const a of list) {
    if (!a || !a.thumbnailUrl) continue;
    try {
      let base64 = a.id && _cache.has(a.id) ? _cache.get(a.id) : null;
      if (!base64) {
        base64 = await _toBase64(a.thumbnailUrl);
        if (base64 && a.id) _cache.set(a.id, base64);
      }
      if (base64) out.push({ anchor: a, base64 });
    } catch (e) {
      console.warn("[anchorImages] prepare failed for anchor", a?.id, e);
    }
  }
  return out;
}
