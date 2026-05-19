import { uploadBase64, uploadBase64Many, uploadVideoFile } from "../../../lib/storage";

// Cloudinary 영상 URL → 자동 썸네일 URL (.mp4 → .jpg)
export const cloudinaryVideoThumb = (url) => {
  if (typeof url !== "string") return null;
  if (!/^https?:\/\/res\.cloudinary\.com\//i.test(url)) return null;
  return url.replace(/\.(mp4|webm|mov|m4v|ogv|mkv)(\?.*)?$/i, ".jpg$2");
};

// 영상의 첫 프레임을 캡처해서 data URL(image/jpeg) 반환. source는 File 또는 string URL.
export async function captureVideoFirstFrame(source) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "metadata";
    video.playsInline = true;
    let blobUrl = null;
    if (source instanceof File) {
      blobUrl = URL.createObjectURL(source);
      video.src = blobUrl;
    } else if (typeof source === "string") {
      video.crossOrigin = "anonymous";
      video.src = source;
    } else {
      reject(new Error("지원하지 않는 영상 소스입니다."));
      return;
    }
    const cleanup = () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
    const onError = () => { cleanup(); reject(new Error("영상 로드 실패 (CORS 또는 손상된 파일)")); };
    video.addEventListener("error", onError, { once: true });
    video.addEventListener("loadeddata", async () => {
      try {
        video.currentTime = Math.min(0.1, (video.duration || 1) / 2);
        await new Promise((r) => video.addEventListener("seeked", r, { once: true }));
        const w = video.videoWidth || 640;
        const h = video.videoHeight || 360;
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        cleanup();
        resolve(dataUrl);
      } catch (e) { cleanup(); reject(e); }
    }, { once: true });
  });
}

export const compressImage = (file, maxW = 1600, maxH = 1600, q = 0.85) =>
  new Promise((res, rej) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = ev => {
      const img = new Image(); img.src = ev.target.result;
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > h) { if (w > maxW) { h *= maxW / w; w = maxW; } }
        else { if (h > maxH) { w *= maxH / h; h = maxH; } }
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        res(c.toDataURL('image/jpeg', q));
      };
      img.onerror = rej;
    };
    reader.onerror = rej;
  });

export const processMultipleFiles = async (files, currentCount = 0, callback, showToast) => {
  const results = [];
  let skipped = false;
  for (let i = 0; i < files.length; i++) {
    if (currentCount + results.length >= 2) { skipped = true; break; }
    if (files[i].type.startsWith('image/')) { results.push(await compressImage(files[i])); }
  }
  if (skipped && showToast) showToast('최대 2장까지만 업로드 가능합니다.', 'error');
  if (results.length > 0) callback(results);
};

// Upload base64 images and any pending video Files to Cloudinary.
// - images: each entry is uploaded sequentially with individual error tolerance.
// - videos: entries may be File (new) or string (already uploaded URL).
export const uploadPromptImages = async (uid, promptId, prompt) => {
  const out = { ...prompt };
  const ts = Date.now();
  if (Array.isArray(out.images) && out.images.length > 0) {
    const uploaded = await uploadBase64Many(out.images, (i) =>
      `users/${uid}/prompts/${promptId}/img-${i}-${ts}.jpg`);
    const keep = uploaded.map((u) => !!u);
    const droppedCount = keep.filter((k) => !k).length;
    if (droppedCount > 0) {
      console.warn(`[uploadPromptImages] dropped ${droppedCount}/${uploaded.length} failed image(s) for ${promptId}`);
    }
    out.images = uploaded.filter(Boolean);
    const STEP_KEYS = ['stepPrompts', 'stepLabels', 'stepTags', 'stepKeywords', 'stepDescriptions'];
    for (const key of STEP_KEYS) {
      if (Array.isArray(out[key]) && out[key].length === keep.length) {
        out[key] = out[key].filter((_, i) => keep[i]);
      }
    }
  }
  if (out.thumbnail) {
    try {
      const url = await uploadBase64(out.thumbnail,
        `users/${uid}/prompts/${promptId}/thumb-${ts}.jpg`);
      out.thumbnail = url || '';
    } catch (e) {
      console.warn(`[uploadPromptImages] thumbnail upload failed for ${promptId}:`, e?.message || e);
      out.thumbnail = '';
    }
  }
  // 사용자가 영상에서 직접 캡처한 프레임 — dataURL 이면 업로드, 이미 URL 이면 그대로 둠.
  if (typeof out.videoPoster === 'string' && out.videoPoster.startsWith('data:')) {
    try {
      const url = await uploadBase64(out.videoPoster,
        `users/${uid}/prompts/${promptId}/poster-${ts}.jpg`);
      out.videoPoster = url || '';
    } catch (e) {
      console.warn(`[uploadPromptImages] videoPoster upload failed for ${promptId}:`, e?.message || e);
      out.videoPoster = '';
    }
  }
  if (Array.isArray(out.videos) && out.videos.length > 0) {
    const uploaded = [];
    for (const v of out.videos) {
      if (typeof v === 'string') { uploaded.push(v); continue; }
      if (v instanceof File) {
        try {
          const url = await uploadVideoFile(v);
          uploaded.push(url);
        } catch (e) {
          console.error(`[uploadPromptImages] video upload failed for ${promptId}:`, e?.message || e);
        }
      }
    }
    out.videos = uploaded;
  }
  return out;
};
