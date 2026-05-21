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

export async function renderWithImagen(
  promptText,
  modelId,
  referenceImageDataUrl = null
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

  const body = {
    contents: [{ parts }],
    generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
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
