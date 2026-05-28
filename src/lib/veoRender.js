// Veo 3 — 텍스트 + (선택) 기본 이미지 → 영상 생성.
// VITE_GEMINI_API_KEY 사용. predictLongRunning + 폴링으로 mp4 dataURL 반환.
//
// 호출 가드 (필수):
//   import { useUsageGate } from "../components/UsageGate";
//   const { ensureCanGenerate, modal } = useUsageGate();
//   if (await ensureCanGenerate('video') === false) return; // 30c 차감, 부족 시 모달
//   const result = await renderWithVeo(prompt, modelId, refImg);
// — 자세한 단가는 src/lib/grades.js ACTION_COSTS.video (= 30 credits) 참조.

// 모델 ID — fast 변종(veo-3.0-fast-generate-preview)은 v1beta 에서 deprecated(404) 되어 제거.
// 현재 유효: veo-3.1-generate-preview(최신) / veo-3.0-generate-preview(안정).
export const VEO_MODELS = [
  {
    id: "veo-3.1-generate-preview",
    label: "Veo 3.1",
    desc: "최신 · 8s",
    color: "#FD79A8",
  },
  {
    id: "veo-3.0-generate-preview",
    label: "Veo 3",
    desc: "안정 · 8s",
    color: "#FDCB6E",
  },
];

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 5 * 60_000; // 5분

// Veo 콘텐츠 안전 필터 회피용 순화 매핑.
// 다크판타지 타이포 프롬프트의 폭력·유혈 연상 단어가 영상 생성에서 정책 위반으로 거부되는 경우가 많음
// (Imagen 정지 이미지보다 Veo 가 훨씬 보수적). 분위기는 유지하면서 트리거 단어만 중립 표현으로 치환.
const VEO_SAFETY_REMAP = [
  [/\bblood(?:y|ied|stained)?\b/gi, "crimson"],
  [/\bgore\b/gi, "intense detail"],
  [/\bgory\b/gi, "intense"],
  [/\bsword\s*cuts?\b/gi, "sharp incisions"],
  [/\bsword\b/gi, "blade-like form"],
  [/\bbattle[-\s]?damage[d]?\b/gi, "weathered wear"],
  [/\bbattle[-\s]?worn\b/gi, "aged and worn"],
  [/\bbattle[-\s]?scarred?\b/gi, "deeply weathered"],
  [/\bbattle\b/gi, "epic"],
  [/\bscorched\b/gi, "darkened and charred"],
  [/\babyssal\b/gi, "deep dark"],
  [/\babyss\b/gi, "deep void"],
  [/\bweapon(?:ized|ry|s)?\b/gi, "metallic"],
  [/\bkill(?:ing|s|ed)?\b/gi, "intense"],
  [/\bviolen(?:t|ce)\b/gi, "intense"],
  [/\bwound(?:ed|s)?\b/gi, "mark"],
  [/\bdemonic\b/gi, "dark fantasy"],
  [/\bdemon\b/gi, "dark creature"],
  [/\bsever(?:ed|ing|s)?\b/gi, "split"],
  [/\bslash(?:ed|ing|es)?\b/gi, "sharp stroke"],
  [/\bgrisly\b/gi, "gritty"],
  [/\bbrutal\b/gi, "powerful"],
  [/\bcorpse\b/gi, "dark form"],
];

export function sanitizeForVeo(text) {
  if (!text || typeof text !== "string") return text;
  let out = text;
  for (const [re, rep] of VEO_SAFETY_REMAP) out = out.replace(re, rep);
  return out;
}

// MotionMatrix 프롬프트는 여러 모델(Runway/Kling/Luma/Veo)을 겨냥해 만들어져서
// "본문 + Negative prompt: ..." + Midjourney 플래그(--no-audio --zoom 0)가 섞여 있다.
// Veo 는 (1) --flag 문법을 이해 못 하고 (2) negativePrompt 를 parameters 로 별도 수신한다.
// 따라서 본문/네거티브를 분리하고 플래그를 제거해 Veo 형식에 맞춰야 카메라 고정 negative 가 실제로 적용됨.
const MJ_FLAG_RE = /--[a-z-]+(?:\s+[0-9.]+)?/gi;
export function splitVeoPrompt(text) {
  if (!text || typeof text !== "string") return { positive: text || "", negative: "" };
  const parts = text.split(/\n*\s*Negative prompt:\s*/i);
  let positive = (parts[0] || "").replace(MJ_FLAG_RE, "").replace(/\s{2,}/g, " ").trim();
  let negative = (parts[1] || "").replace(MJ_FLAG_RE, "").replace(/\s{2,}/g, " ").trim();
  return { positive, negative };
}

async function fetchVideoAsDataUrl(uri, apiKey) {
  // Veo가 돌려주는 video.uri 는 key 가 필요한 endpoint. blob 으로 받아서 dataURL 로 변환.
  const url = uri.includes("key=") ? uri : `${uri}${uri.includes("?") ? "&" : "?"}key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Veo video download ${res.status}`);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export async function renderWithVeo(
  promptText,
  modelId,
  referenceImageDataUrl = null,
  { aspectRatio = "16:9", durationSeconds = 8, onProgress } = {},
) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("VITE_GEMINI_API_KEY 누락");

  // 본문/네거티브 분리 + Midjourney 플래그 제거 (Veo 미지원). 안전 순화는 분리 전에 적용.
  const { positive, negative } = splitVeoPrompt(sanitizeForVeo(promptText));
  // 카메라 고정을 Veo 가 가장 잘 따르는 명령형으로 본문 맨 앞에 강하게 prepend.
  const cameraLock = "STATIC LOCKED-OFF CAMERA, fixed tripod shot, absolutely zero camera movement, no zoom, no pan, no dolly, no parallax. ";
  const instance = { prompt: cameraLock + positive };
  if (referenceImageDataUrl) {
    const [meta, base64] = referenceImageDataUrl.split(",");
    const mimeType = meta.match(/data:([^;]+);/)?.[1] || "image/jpeg";
    instance.image = { bytesBase64Encoded: base64, mimeType };
  }

  // Veo 3.x parameters — numberOfVideos 는 미지원(400) 이라 제거.
  // negativePrompt 는 Veo 전용 파라미터로 전달해야 카메라 이동 억제가 실제로 적용됨 (본문에 섞으면 무시됨).
  const negativePrompt = [negative, "camera movement, zoom, pan, dolly, parallax, perspective shift, reframe, scale change"]
    .filter(Boolean).join(", ");
  const body = {
    instances: [instance],
    parameters: { aspectRatio, negativePrompt },
  };

  onProgress?.({ status: "submitting" });

  const startRes = await fetch(
    `${API_BASE}/models/${modelId}:predictLongRunning?key=${apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
  );
  if (!startRes.ok) {
    const text = await startRes.text().catch(() => "");
    throw new Error(`Veo submit ${startRes.status}: ${text.slice(0, 300)}`);
  }
  const startData = await startRes.json();
  const opName = startData.name;
  if (!opName) throw new Error("Veo operation name 없음");

  onProgress?.({ status: "polling", operation: opName });

  const startedAt = Date.now();
  // 폴링 — done=true 까지 5초 간격. 5분 타임아웃.
  while (true) {
    if (Date.now() - startedAt > POLL_TIMEOUT_MS) throw new Error("Veo 폴링 5분 초과");
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    const pollRes = await fetch(`${API_BASE}/${opName}?key=${apiKey}`);
    if (!pollRes.ok) {
      const text = await pollRes.text().catch(() => "");
      throw new Error(`Veo poll ${pollRes.status}: ${text.slice(0, 300)}`);
    }
    const pollData = await pollRes.json();
    onProgress?.({ status: "polling", elapsedMs: Date.now() - startedAt });
    if (!pollData.done) continue;
    if (pollData.error) {
      throw new Error(`Veo 실패: ${pollData.error.message || JSON.stringify(pollData.error)}`);
    }
    // 응답 위치 — 모델/SDK 버전에 따라 generateVideoResponse / response 둘 다 가능.
    const samples =
      pollData.response?.generateVideoResponse?.generatedSamples ||
      pollData.response?.generatedSamples ||
      pollData.response?.videos ||
      [];
    const first = samples[0];
    const videoUri = first?.video?.uri || first?.uri;
    if (!videoUri) throw new Error("Veo 응답에 video uri 없음");

    onProgress?.({ status: "downloading" });
    const dataUrl = await fetchVideoAsDataUrl(videoUri, apiKey);
    return {
      dataUrl,
      modelId,
      durationSeconds,
      aspectRatio,
    };
  }
}
