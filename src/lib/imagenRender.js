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

// 출력 해상도 — Pro 모델만 1K/2K/4K 지원, Flash 는 1K 고정.
// id 가 generationConfig.imageConfig.imageSize 로 그대로 전달됨.
export const RENDER_SIZES = [
  { id: "1K", label: "1K", desc: "~1024px · 빠름" },
  { id: "2K", label: "2K", desc: "~2048px · 기본" },
  { id: "4K", label: "4K", desc: "~4096px · Pro 전용" },
];

// 모델이 Pro(1K/2K/4K) 인지. Flash 는 imageSize 미지원 → 1K 기본.
export const isProImageModel = (modelId) =>
  typeof modelId === "string" && modelId.includes("3-pro");

// 요청 사이즈를 모델 능력에 맞게 보정. Flash 는 무조건 undefined(=1K 기본),
// Pro 는 1K/2K/4K 만 허용하고 그 외 값이면 2K 로 fallback.
export const clampImageSize = (modelId, requested) => {
  if (!isProImageModel(modelId)) return undefined;
  return ["1K", "2K", "4K"].includes(requested) ? requested : "2K";
};

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

// 원본 dataURL 의 실제 비율(원본 그대로의 W/H) 측정 — 표준 비율 매핑 전 단계.
// 출력 후 이 비율로 center crop 하기 위함.
function probeRawAspectRatio(dataUrl) {
  return new Promise((resolve) => {
    if (!dataUrl || typeof Image === "undefined") { resolve(null); return; }
    const img = new Image();
    img.onload = () => {
      const r = img.naturalWidth / img.naturalHeight;
      resolve(Number.isFinite(r) && r > 0 ? r : null);
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

// 결과 이미지를 targetAspect(W/H) 비율로 center crop → 새 dataURL 반환.
// 출력 비율과 거의 같으면 (오차 0.2% 이내) 원본 그대로 반환.
// 임계값을 작게 둬서 미세한 비율 차이도 보정 → 사용자가 인지할 수 있는 비율 어긋남 차단.
function cropToAspect(dataUrl, targetAspect, mimeType = "image/png") {
  return new Promise((resolve) => {
    if (!dataUrl || !targetAspect || typeof Image === "undefined") { resolve(dataUrl); return; }
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth, h = img.naturalHeight;
      const cur = w / h;
      if (!Number.isFinite(cur) || cur <= 0 || Math.abs(cur - targetAspect) / targetAspect < 0.002) {
        resolve(dataUrl); return;
      }
      let cw, ch, sx, sy;
      if (cur > targetAspect) {
        // 출력이 원본보다 가로로 더 김 → 좌우를 자름
        ch = h;
        cw = Math.round(h * targetAspect);
        sx = Math.round((w - cw) / 2);
        sy = 0;
      } else {
        // 출력이 원본보다 세로로 더 김 → 상하를 자름
        cw = w;
        ch = Math.round(w / targetAspect);
        sx = 0;
        sy = Math.round((h - ch) / 2);
      }
      const canvas = document.createElement("canvas");
      canvas.width = cw; canvas.height = ch;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, sx, sy, cw, ch, 0, 0, cw, ch);
      try {
        const out = canvas.toDataURL(mimeType === "image/jpeg" ? "image/jpeg" : "image/png");
        resolve(out);
      } catch { resolve(dataUrl); }
    };
    img.onerror = () => resolve(dataUrl);
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

  // referenceImage 는 단일 dataURL string 또는 배열을 받음 — 배열일 경우 모든 이미지를 reference 로 전달.
  // (변형 모드에서 원본 + 배경 참고를 동시에 보내기 위함; 기존 호출은 string 그대로 동작)
  const refs = Array.isArray(referenceImageDataUrl)
    ? referenceImageDataUrl.filter(Boolean)
    : (referenceImageDataUrl ? [referenceImageDataUrl] : []);
  const primaryRef = refs[0] || null;

  const parts = [];

  for (const ref of refs) {
    const [meta, base64] = ref.split(",");
    const mimeType = meta.match(/data:([^;]+);/)?.[1] || "image/jpeg";
    parts.push({
      inlineData: { mimeType, data: base64 },
    });
  }

  parts.push({ text: promptText });

  // 출력 비율 — 명시값(options.aspectRatio) 우선, 없으면 첫 번째(primary) reference 비율 자동 감지.
  // 이전엔 imageConfig 가 없어 기본 1:1 정사각형으로 나와 가로로 긴 타이포가 압축돼 디테일이 떨어졌음.
  const aspectRatio = options.aspectRatio
    || (primaryRef ? await probeAspectRatio(primaryRef) : null);

  // 원본 정확 비율 — 출력 후 center crop 으로 원본 비율 복원.
  // (Gemini API 는 21:9 / 16:9 등 표준 비율만 지원해 원본이 비표준 비율이면 가장 가까운 표준으로 매핑됨 →
  //  출력이 원본과 미세하게 다른 비율로 나옴. 원본 비율로 잘라내 일치시킴.)
  const matchInputAspect = options.matchInputAspect !== false; // 기본 ON
  const originalAspect = (matchInputAspect && primaryRef)
    ? await probeRawAspectRatio(primaryRef) : null;

  // 출력 해상도 — Pro 모델만 1K/2K/4K, Flash 는 1K 고정.
  // options.imageSize 가 있으면 그 값을, 없으면 Pro 기본 2K. clampImageSize 가 모델 능력에 맞춰 보정:
  //   Flash → undefined(=1K 기본), Pro → 1K/2K/4K (그 외 값이면 2K).
  const imageSize = clampImageSize(modelId, options.imageSize || "2K");

  const generationConfig = { responseModalities: ["IMAGE", "TEXT"] };
  if (aspectRatio || imageSize) {
    generationConfig.imageConfig = {};
    if (aspectRatio) generationConfig.imageConfig.aspectRatio = aspectRatio;
    if (imageSize) generationConfig.imageConfig.imageSize = imageSize;
  }

  const body = {
    contents: [{ parts }],
    generationConfig,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // Google API 는 실패 시 JSON 본문에 { error: { message, status } } 를 담아줌.
    // 상태코드만 던지면 원인(프롬프트 길이/안전필터/잘못된 인자 등)을 알 수 없어 본문을 까서 전달.
    let detail = "";
    try {
      const err = await res.json();
      detail = err?.error?.message || "";
    } catch { /* 본문 파싱 실패 시 상태코드만 */ }
    throw new Error(`Imagen API ${res.status}${detail ? ` — ${detail}` : ""}`);
  }
  const data = await res.json();

  const resParts = data.candidates?.[0]?.content?.parts || [];
  const imgPart = resParts.find(
    p => p.inlineData?.mimeType?.startsWith("image/")
  );
  if (!imgPart) {
    // 이미지가 없을 때 — 모델이 텍스트만 돌려준 경우(안전필터/프롬프트 거부) finishReason 과
    // 텍스트를 함께 노출해야 "왜 안 나왔는지" 가 보임. promptFeedback 의 block 사유도 포함.
    const cand = data.candidates?.[0];
    const reason = cand?.finishReason;
    const textPart = resParts.find(p => p.text)?.text;
    const blockReason = data.promptFeedback?.blockReason;
    const bits = [
      reason && `finishReason: ${reason}`,
      blockReason && `blocked: ${blockReason}`,
      textPart && `"${textPart.slice(0, 240)}"`,
    ].filter(Boolean);
    throw new Error(`이미지 응답 없음${bits.length ? ` — ${bits.join(" / ")}` : ""}`);
  }

  const rawDataUrl = `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
  // 원본 비율로 자동 center crop — 표준 비율 매핑으로 인한 미세 비율 차이를 복원.
  const finalDataUrl = originalAspect
    ? await cropToAspect(rawDataUrl, originalAspect, imgPart.inlineData.mimeType)
    : rawDataUrl;

  return {
    base64: imgPart.inlineData.data,
    mimeType: imgPart.inlineData.mimeType,
    dataUrl: finalDataUrl,
    modelId,
  };
}
