// Cloudinary uploader (unsigned upload preset).
// Same export signatures as before — callers in PromptArc/BannerCodex don't need changes.
// The legacy `path` argument is accepted for compatibility but ignored; Cloudinary auto-generates public_ids.

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

if (!CLOUD_NAME || !UPLOAD_PRESET) {
  console.warn(
    "[cloudinary] VITE_CLOUDINARY_CLOUD_NAME 또는 VITE_CLOUDINARY_UPLOAD_PRESET 누락. .env 확인 후 dev 서버 재시작."
  );
}

const isHttpUrl = (s) => typeof s === "string" && /^https?:\/\//i.test(s);
const toDataUrl = (v) =>
  v.startsWith("data:") ? v : `data:image/jpeg;base64,${v}`;

// Upload a base64/data-URL image to Cloudinary, return secure_url.
// If `value` is already an http(s) URL it is returned as-is (idempotent).
export async function uploadBase64(value /*, _path (legacy, ignored) */) {
  if (!value) return null;
  if (isHttpUrl(value)) return value;
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "[cloudinary] cloud name / upload preset가 설정되지 않았습니다. .env 확인."
    );
  }
  const formData = new FormData();
  formData.append("file", toDataUrl(value));
  formData.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Cloudinary upload failed (${res.status} ${res.statusText}): ${text.slice(0, 300)}`
    );
  }
  const data = await res.json();
  return data.secure_url || data.url;
}

// Upload many sequentially, preserving order. Individual failures are tolerated:
// they appear as `null` at the same index so callers can realign companion arrays.
// (Cloudinary's unsigned upload endpoint can rate-limit parallel uploads, which
//  previously caused Promise.all to reject and drop the whole prompt.)
export async function uploadBase64Many(values /*, _pathFn */) {
  if (!Array.isArray(values) || values.length === 0) return [];
  const results = new Array(values.length);
  let okCount = 0;
  for (let i = 0; i < values.length; i++) {
    try {
      results[i] = await uploadBase64(values[i]);
      if (results[i]) okCount++;
    } catch (e) {
      console.error(`[uploadBase64Many] index ${i + 1}/${values.length} failed:`, e?.message || e);
      results[i] = null;
    }
  }
  if (okCount < values.length) {
    console.warn(`[uploadBase64Many] partial upload: ${okCount}/${values.length} succeeded`);
  }
  return results;
}

// Upload a raw image File to Cloudinary (binary body — no canvas re-encode, so
// the original pixels are preserved losslessly). Use this over uploadBase64 when
// the original File is available; the dataURL path is only needed for paste/blob.
// Returns secure_url. Idempotent guard: callers should fall back to uploadBase64
// when no File object exists.
export async function uploadImageFile(file) {
  if (!file) return null;
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "[cloudinary] cloud name / upload preset가 설정되지 않았습니다. .env 확인."
    );
  }
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Cloudinary image upload failed (${res.status} ${res.statusText}): ${text.slice(0, 300)}`
    );
  }
  const data = await res.json();
  return data.secure_url || data.url;
}

// --- Video upload (Cloudinary unsigned, raw File body) ----------------------

export const VIDEO_MAX_BYTES = 50 * 1024 * 1024; // 50MB
export const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime";
const VIDEO_MIME_OK = /^video\/(mp4|webm|quicktime|x-matroska)$/i;
const VIDEO_EXT_OK = /\.(mp4|webm|mov)$/i;

export function isVideoFile(file) {
  if (!file) return false;
  if (VIDEO_MIME_OK.test(file.type || "")) return true;
  return VIDEO_EXT_OK.test(file.name || "");
}

export class VideoUploadError extends Error {
  constructor(message, code) { super(message); this.code = code; }
}

/**
 * Upload a video File to Cloudinary via the unsigned preset.
 * Returns the secure_url. Size limit enforced client-side at 50MB.
 */
export async function uploadVideoFile(file) {
  if (!file) throw new VideoUploadError("파일이 없습니다.", "NO_FILE");
  if (!isVideoFile(file)) {
    throw new VideoUploadError("지원하지 않는 형식이에요 (mp4, webm, mov만 가능).", "BAD_TYPE");
  }
  if (file.size > VIDEO_MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    throw new VideoUploadError(`영상 파일은 50MB 이하만 업로드할 수 있어요 (현재 ${mb}MB).`, "TOO_LARGE");
  }
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new VideoUploadError(
      "[cloudinary] cloud name / upload preset가 설정되지 않았습니다. .env 확인.",
      "NO_CONFIG",
    );
  }
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
    { method: "POST", body: formData },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new VideoUploadError(
      `Cloudinary 영상 업로드 실패 (${res.status} ${res.statusText}): ${text.slice(0, 300)}`,
      "UPLOAD_FAILED",
    );
  }
  const data = await res.json();
  return data.secure_url || data.url;
}
