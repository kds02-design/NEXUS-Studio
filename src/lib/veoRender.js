// Veo 3 — 텍스트 + (선택) 기본 이미지 → 영상 생성.
// VITE_GEMINI_API_KEY 사용. predictLongRunning + 폴링으로 mp4 dataURL 반환.
//
// 호출 가드 (필수):
//   import { useUsageGate } from "../components/UsageGate";
//   const { ensureCanGenerate, modal } = useUsageGate();
//   if (await ensureCanGenerate('video') === false) return; // 30c 차감, 부족 시 모달
//   const result = await renderWithVeo(prompt, modelId, refImg);
// — 자세한 단가는 src/lib/grades.js ACTION_COSTS.video (= 30 credits) 참조.

export const VEO_MODELS = [
  {
    id: "veo-3.0-fast-generate-preview",
    label: "Veo 3 Fast",
    desc: "빠름 · 8s",
    color: "#FDCB6E",
  },
  {
    id: "veo-3.0-generate-preview",
    label: "Veo 3",
    desc: "고품질 · 8s",
    color: "#FD79A8",
  },
];

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 5 * 60_000; // 5분

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

  const instance = { prompt: promptText };
  if (referenceImageDataUrl) {
    const [meta, base64] = referenceImageDataUrl.split(",");
    const mimeType = meta.match(/data:([^;]+);/)?.[1] || "image/jpeg";
    instance.image = { bytesBase64Encoded: base64, mimeType };
  }

  const body = {
    instances: [instance],
    parameters: { aspectRatio, numberOfVideos: 1, durationSeconds },
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
