const PALM_VISION_MODEL = "gemini-2.5-flash";
const TIMEOUT_MS = 45000;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    image_valid: { type: "BOOLEAN" },
    rejection_reason: { type: "STRING" },
    lines: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          key: { type: "STRING", enum: ["heart", "head", "life", "fate"] },
          detected: { type: "BOOLEAN" },
          confidence: { type: "NUMBER" },
          clarity: { type: "NUMBER" },
          points: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                x: { type: "INTEGER" },
                y: { type: "INTEGER" },
              },
              required: ["x", "y"],
            },
          },
        },
        required: ["key", "detected", "confidence", "clarity", "points"],
      },
    },
  },
  required: ["image_valid", "rejection_reason", "lines"],
};

function stripDataUrl(dataUrl) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i.exec(dataUrl || "");
  if (!match) throw new Error("AI 분석용 손바닥 이미지를 만들지 못했습니다.");
  return { mimeType: match[1], data: match[2] };
}

function cleanLine(line) {
  const key = String(line?.key || "");
  const points = Array.isArray(line?.points)
    ? line.points
      .map((point) => ({ x: Number(point?.x), y: Number(point?.y) }))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
      .map((point) => ({
        x: Math.max(0, Math.min(1000, Math.round(point.x))),
        y: Math.max(0, Math.min(1000, Math.round(point.y))),
      }))
    : [];
  return {
    key,
    detected: line?.detected === true,
    confidence: Math.max(0, Math.min(1, Number(line?.confidence) || 0)),
    clarity: Math.max(0, Math.min(100, Math.round(Number(line?.clarity) || 0))),
    points,
  };
}

function parseStructuredResponse(parts) {
  const texts = (Array.isArray(parts) ? parts : [])
    .filter((part) => typeof part?.text === "string" && part.text.trim() && part.thought !== true)
    .map((part) => part.text.trim());
  const attempts = [...texts].reverse();
  if (texts.length > 1) attempts.push(texts.join("\n"));

  for (const attempt of attempts) {
    const unfenced = attempt
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const firstBrace = unfenced.indexOf("{");
    const lastBrace = unfenced.lastIndexOf("}");
    const candidates = [unfenced];
    if (firstBrace >= 0 && lastBrace > firstBrace) candidates.push(unfenced.slice(firstBrace, lastBrace + 1));
    for (const candidate of candidates) {
      try { return JSON.parse(candidate); } catch { /* 다음 후보를 확인한다. */ }
    }
  }
  throw new SyntaxError("structured palm response is not valid JSON");
}

export async function analyzePalmWithVision(imageDataUrl, geometry, imageSize = { width: 720, height: 900 }) {
  const image = stripDataUrl(imageDataUrl);
  const landmarkIndices = [0, 5, 9, 13, 17];
  const landmarkGuide = Object.fromEntries(landmarkIndices.map((index) => [index, {
    x: Math.round(geometry.landmarks[index].x / imageSize.width * 1000),
    y: Math.round(geometry.landmarks[index].y / imageSize.height * 1000),
  }]));
  const prompt = `Analyze the clean, normalized PALM photograph as a computer-vision tracing task.

Image geometry:
- Image is a high-resolution normalized 4:5 palm crop (${imageSize.width} x ${imageSize.height}); fingers point upward and wrist points downward.
- Return every point as x,y integers normalized from 0 to 1000 relative to the entire image.
- Detected hand: ${geometry.handedness}.
- Landmark guide (0 wrist, 5 index MCP, 9 middle MCP, 13 ring MCP, 17 little MCP): ${JSON.stringify(landmarkGuide)}

Trace only the CENTER of genuinely visible principal palm creases. Do not draw an anatomical template and do not infer a line where the crease is not visible.
- heart: upper major transverse crease below the finger bases, from little-finger side toward index/middle side.
- head: middle major transverse crease, beginning near the thumb-index web and crossing toward the little-finger side.
- life: curved major crease beginning near the thumb-index web and arcing around the thenar/thumb mound toward the wrist.
- fate: optional central longitudinal crease from the wrist area toward the middle-finger direction. Mark detected=false when it is absent or ambiguous.

Rules:
- For each detected line return 16 to 28 ordered points that follow the exact same continuous visible crease at pixel-level precision.
- Never connect separate wrinkles, skin texture, shadows, finger joints, the hand outline, or background edges.
- confidence is 0..1 for semantic identity; clarity is 0..100 for visual visibility.
- If a principal line cannot be followed confidently, detected=false and points=[] instead of guessing.
- image_valid=true when at least one principal line can be traced reliably, even if other lines are unclear or partially cropped.
- image_valid=false only when no principal line can be traced because blur, glare, crop, overlays, or shadows are too severe.
- This is visual localization only, not medical diagnosis and not a fortune interpretation.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const target = `/v1beta/models/${PALM_VISION_MODEL}:generateContent`;
    const response = await fetch(`/api/gemini?target=${encodeURIComponent(target)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: prompt },
          { inlineData: { mimeType: image.mimeType, data: image.data } },
        ] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`AI 손금 분석을 완료하지 못했습니다. (${response.status}${detail ? ` · ${detail.slice(0, 90)}` : ""})`);
    }
    const payload = await response.json();
    const parts = payload.candidates?.[0]?.content?.parts || [];
    if (!parts.some((part) => typeof part?.text === "string" && part.text.trim() && part.thought !== true)) {
      const finishReason = payload.candidates?.[0]?.finishReason;
      throw new Error(`AI 손금 분석 결과가 비어 있습니다.${finishReason ? ` (${finishReason})` : ""} 다시 촬영해 주세요.`);
    }
    const parsed = parseStructuredResponse(parts);
    if (parsed.image_valid !== true) {
      throw new Error(parsed.rejection_reason || "AI가 손금선을 확실히 확인하지 못했습니다. 밝은 곳에서 다시 촬영해 주세요.");
    }
    const keys = new Set();
    const lines = (Array.isArray(parsed.lines) ? parsed.lines : [])
      .map(cleanLine)
      .filter((line) => {
        if (!["heart", "head", "life", "fate"].includes(line.key) || keys.has(line.key)) return false;
        keys.add(line.key);
        return line.detected && line.confidence >= 0.42 && line.points.length >= 6;
      });
    const requiredCount = lines.filter((line) => ["heart", "head", "life"].includes(line.key)).length;
    if (requiredCount < 1) {
      throw new Error("AI가 확실한 주요 손금선을 구분하지 못했습니다. 손바닥에 초점을 맞춰 밝은 곳에서 다시 찍어주세요.");
    }
    return { model: PALM_VISION_MODEL, lines };
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("AI 손금 분석 시간이 초과됐습니다. 네트워크를 확인하고 다시 시도해 주세요.", { cause: error });
    if (error instanceof SyntaxError) throw new Error("AI 손금 좌표를 해석하지 못했습니다. 다시 시도해 주세요.", { cause: error });
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
