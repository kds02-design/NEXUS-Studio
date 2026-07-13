import { analyzeAssetImage } from "./gemini";
import { createAsset, fetchMyTemporaryPromptImages } from "./firebase";

const REMOVE_BG_KEY = "mask-forge:apiKey";

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

async function urlToDataUrl(url) {
  if (String(url).startsWith("data:")) return url;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`이미지 다운로드 실패 (${response.status})`);
  return blobToDataUrl(await response.blob());
}

const loadImage = (src) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
  image.src = src;
});

async function removeWithApi(dataUrl, apiKey) {
  const response = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ image_file_b64: String(dataUrl).split(",")[1], size: "auto" }),
  });
  if (!response.ok) throw new Error(`Remove.bg 처리 실패 (${response.status})`);
  return blobToDataUrl(await response.blob());
}

// MaskForge의 로컬 키 방식과 같은 목적의 가장자리 연결 배경 제거.
// 네 모서리의 평균색과 연결된 픽셀만 지우므로 에셋 내부의 유사색은 최대한 보존한다.
async function removeEdgeBackground(dataUrl) {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = pixels;
  let alreadyTransparent = false;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 250) { alreadyTransparent = true; break; }
  if (alreadyTransparent) return { dataUrl, width, height, method: "existing-alpha" };

  const sample = Math.max(2, Math.round(Math.min(width, height) * .025));
  let rr = 0, gg = 0, bb = 0, count = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (!((x < sample || x >= width - sample) && (y < sample || y >= height - sample))) continue;
    const i = (y * width + x) * 4; rr += data[i]; gg += data[i + 1]; bb += data[i + 2]; count++;
  }
  const bg = [rr / count, gg / count, bb / count];
  const distance = (i) => Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2]);
  const tolerance = 46, feather = 34, seen = new Uint8Array(width * height), queue = [];
  const push = (x, y) => { const p = y * width + x; if (seen[p]) return; const i = p * 4; if (distance(i) > tolerance + feather) return; seen[p] = 1; queue.push(p); };
  for (let x = 0; x < width; x++) { push(x, 0); push(x, height - 1); }
  for (let y = 1; y < height - 1; y++) { push(0, y); push(width - 1, y); }
  for (let q = 0; q < queue.length; q++) {
    const p = queue[q], x = p % width, y = (p / width) | 0, i = p * 4, d = distance(i);
    data[i + 3] = d <= tolerance ? 0 : Math.round(255 * (d - tolerance) / feather);
    if (x) push(x - 1, y); if (x + 1 < width) push(x + 1, y);
    if (y) push(x, y - 1); if (y + 1 < height) push(x, y + 1);
  }
  ctx.putImageData(pixels, 0, 0);
  return { dataUrl: canvas.toDataURL("image/png"), width, height, method: "edge-key" };
}

async function makeTransparent(dataUrl) {
  const apiKey = localStorage.getItem(REMOVE_BG_KEY)?.trim();
  if (apiKey) {
    try {
      const result = await removeWithApi(dataUrl, apiKey);
      const image = await loadImage(result);
      return { dataUrl: result, width: image.naturalWidth, height: image.naturalHeight, method: "remove-bg" };
    } catch (error) {
      console.warn("[AssetLibrary] Remove.bg 실패, 로컬 키로 대체", error);
    }
  }
  return removeEdgeBackground(dataUrl);
}

export async function importPromptArcTemporaryAssets({ uid, existingAssets = [], onProgress }) {
  const sources = await fetchMyTemporaryPromptImages(uid);
  const importedKeys = new Set(existingAssets.map((a) => `${a.source?.promptArcId || ""}:${a.source?.imageIndex ?? 0}`));
  const pending = sources.filter((s) => !importedKeys.has(`${s.promptId}:${s.imageIndex}`));
  const summary = { total: pending.length, imported: 0, failed: 0, skipped: sources.length - pending.length, errors: [] };

  for (let index = 0; index < pending.length; index++) {
    const source = pending[index];
    onProgress?.({ current: index + 1, total: pending.length, title: source.title });
    try {
      const original = await urlToDataUrl(source.imageUrl);
      const transparent = await makeTransparent(original);
      const analysis = await analyzeAssetImage(transparent.dataUrl);
      await createAsset({
        uid,
        dataUrl: transparent.dataUrl,
        width: transparent.width,
        height: transparent.height,
        category: analysis.suggestedCategory || "etc",
        title: analysis.title || source.title,
        tags: [...new Set([...(analysis.tags || []), ...source.promptTags])].slice(0, 8),
        isTemp: false,
        source: {
          app: "prompt-arc",
          promptArcId: source.promptId,
          imageIndex: source.imageIndex,
          sourceImageUrl: source.imageUrl,
          sourceApp: source.sourceApp,
          backgroundRemoval: transparent.method,
        },
      });
      summary.imported++;
    } catch (error) {
      summary.failed++;
      summary.errors.push(`${source.title}: ${error?.message || error}`);
    }
  }
  return summary;
}
