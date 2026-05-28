// Imagen / Nano Banana — 텍스트 + (선택) 기본 이미지 → 이미지 생성.
// VITE_GEMINI_API_KEY 사용. referenceImageDataUrl 은 dataURL 문자열만 받음.

export const IMAGEN_MODELS = [
  {
    id: "gemini-3.1-flash-image-preview",
    label: "Nano Banana 2",
    desc: "빠름 · $0.067/장",
    color: "#00CEC9",
  },
  {
    id: "gemini-3-pro-image-preview",
    label: "Nano Banana Pro",
    desc: "고품질 · $0.134/장",
    color: "#6C5CE7",
  },
];

// Gemini image API 가 지원하는 출력 비율. 입력 시안 비율에 가장 가까운 값으로 매핑한다.
const SUPPORTED_RATIOS = [
  { id: "1:1", v: 1 }, { id: "2:3", v: 2 / 3 }, { id: "3:2", v: 3 / 2 },
  { id: "3:4", v: 3 / 4 }, { id: "4:3", v: 4 / 3 }, { id: "4:5", v: 4 / 5 },
  { id: "5:4", v: 5 / 4 }, { id: "9:16", v: 9 / 16 }, { id: "16:9", v: 16 / 9 },
  { id: "21:9", v: 21 / 9 },
];

// dataURL 의 실제 픽셀 크기를 측정 → 지원 비율 중 가장 가까운 것을 반환.
// 측정 실패 시 null (그러면 imageConfig 생략 → 모델 기본값).
function probeAspectRatio(dataUrl) {
  return new Promise((resolve) => {
    if (!dataUrl || typeof Image === "undefined") { resolve(null); return; }
    const img = new Image();
    img.onload = () => {
      const r = img.naturalWidth / img.naturalHeight;
      if (!Number.isFinite(r) || r <= 0) { resolve(null); return; }
      const nearest = SUPPORTED_RATIOS.reduce((best, cur) =>
        Math.abs(cur.v - r) < Math.abs(best.v - r) ? cur : best
      );
      resolve(nearest.id);
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

export async function renderWithImagen(
  promptText,
  modelId,
  referenceImageDataUrl = null,
  options = {}
) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

  const parts = [];

  // referenceImage가 있으면 dataURL에서 base64와 mimeType 추출
  if (referenceImageDataUrl) {
    const [meta, base64] = referenceImageDataUrl.split(",");
    const mimeType = meta.match(/data:([^;]+);/)?.[1] || "image/jpeg";
    parts.push({
      inlineData: { mimeType, data: base64 },
    });
  }

  parts.push({ text: promptText });

  // 출력 비율 — 명시값(options.aspectRatio) 우선, 없으면 입력 시안 비율 자동 감지.
  // 이전엔 imageConfig 가 없어 기본 1:1 정사각형으로 나와 가로로 긴 타이포가 압축돼 디테일이 떨어졌음.
  const aspectRatio = options.aspectRatio
    || (referenceImageDataUrl ? await probeAspectRatio(referenceImageDataUrl) : null);

  const generationConfig = { responseModalities: ["IMAGE", "TEXT"] };
  if (aspectRatio) generationConfig.imageConfig = { aspectRatio };

  const body = {
    contents: [{ parts }],
    generationConfig,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Imagen API ${res.status}`);
  const data = await res.json();

  const resParts = data.candidates?.[0]?.content?.parts || [];
  const imgPart = resParts.find(
    p => p.inlineData?.mimeType?.startsWith("image/")
  );
  if (!imgPart) throw new Error("이미지 응답 없음");

  return {
    base64: imgPart.inlineData.data,
    mimeType: imgPart.inlineData.mimeType,
    dataUrl: `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`,
    modelId,
  };
}
