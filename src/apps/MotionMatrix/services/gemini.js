import { GEMINI_API_KEY } from '../../../lib/gemini';
import {
  LOOP_SURFACE_FX, LOOP_EDGE_FX, LOOP_AMBIENT_FX,
  INTENSITY_LEVELS, MOTION_DYNAMICS, TIME_DURATION,
  FLOW_STYLES, INTRO_STYLES,
} from '../constants/presets';

export const apiKey = GEMINI_API_KEY;

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export const fetchWithRetry = async (url, options, retries = 3) => {
  const delays = [1000, 2000, 4000];
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP error ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, delays[i]));
    }
  }
};

// RenderMatrix payload → motion option recommendation.
// Returns { summary, surface, edge, ambient, intensity, dynamics, duration } with non-matching ids filtered to null.
export const analyzeRenderPayloadForMotion = async ({ text, style, tags }, { signal } = {}) => {
  if (!text || !GEMINI_API_KEY) throw new Error('NO_TEXT_OR_KEY');

  const surfaceIds = LOOP_SURFACE_FX.map((o) => o.id).join(', ');
  const edgeIds = LOOP_EDGE_FX.map((o) => o.id).join(', ');
  const ambientIds = LOOP_AMBIENT_FX.map((o) => o.id).join(', ');
  const intensityIds = INTENSITY_LEVELS.map((o) => o.id).join(', ');
  const dynamicsIds = MOTION_DYNAMICS.map((o) => o.id).join(', ');
  const durationIds = TIME_DURATION.map((o) => o.id).join(', ');

  const sysPrompt = `이 렌더링 프롬프트의 스타일과 분위기를 분석해서 어울리는 모션 효과를 추천하세요.\n반드시 아래 ID 목록 중에서 한 개씩만 골라 JSON으로 반환 (코드블록·설명 금지):\n- surface (글자 표면 효과): ${surfaceIds}\n- edge (외곽선 효과): ${edgeIds}\n- ambient (주변 입자/연기): ${ambientIds}\n- intensity (효과 강도): ${intensityIds}\n- dynamics (속도감/리듬): ${dynamicsIds}\n- duration (지속 시간): ${durationIds}\n\n[입력 프롬프트]\n${text}\n[스타일 메타]\n${style || '(없음)'}\n[태그]\n${(tags || []).join(', ') || '(없음)'}\n\n출력 형식:\n{ "summary": "한 문장 한국어 설명 (왜 이 조합인지)", "surface":"...", "edge":"...", "ambient":"...", "intensity":"...", "dynamics":"...", "duration":"..." }`;

  const resp = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: sysPrompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
    }),
    signal,
  });
  if (!resp.ok) throw new Error(`Gemini ${resp.status}`);
  const json = await resp.json();
  const txt = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!txt) throw new Error('빈 응답');
  const parsed = JSON.parse(txt);
  const filterId = (val, list) => (list.some((o) => o.id === val) ? val : null);
  return {
    summary: parsed.summary || '',
    surface: filterId(parsed.surface, LOOP_SURFACE_FX),
    edge: filterId(parsed.edge, LOOP_EDGE_FX),
    ambient: filterId(parsed.ambient, LOOP_AMBIENT_FX),
    intensity: filterId(parsed.intensity, INTENSITY_LEVELS),
    dynamics: filterId(parsed.dynamics, MOTION_DYNAMICS),
    duration: filterId(parsed.duration, TIME_DURATION),
  };
};

// AI Director: analyze image/note → return chosen surface/edge/ambient/intensity/flow/intro/dynamics + interpretation.
export const analyzeImageAndNote = async ({ animationMode, image, directorNote, isSurpriseMode, surfaceOptions, edgeOptions, ambientOptions }) => {
  const surfaceIds = surfaceOptions.map((o) => o.id).join(', ');
  const edgeIds = edgeOptions.map((o) => o.id).join(', ');
  const ambientIds = ambientOptions.map((o) => o.id).join(', ');
  const flowIds = FLOW_STYLES.map((o) => o.id).join(', ');
  const introIds = INTRO_STYLES.map((o) => o.id).join(', ');
  const dynamicsIds = MOTION_DYNAMICS.map((o) => o.id).join(', ');

  let promptText = `You are a world-class Hollywood Title Sequence Director and Senior Motion Graphics Artist with 15 years of experience in creating high-end typography animations.
Your goal is to interpret the user's intent and the visual reference to create a breathtaking, perfectly balanced, and highly professional motion graphics sequence.
Do not just pick randomly. Think deeply about material physics, lighting, emotional weight, and visual hierarchy.
Current Animation Mode: ${animationMode}\n\n`;

  if (isSurpriseMode) promptText += `User Request: "SURPRISE ME. I rely entirely on your expert eye. Analyze the provided image's texture, shape, and vibe, and select the most spectacular and fitting combination of effects for it."\n`;
  else if (directorNote?.trim()) promptText += `User's Director Note (Vibe/Feeling): "${directorNote}"\n`;
  if (image) promptText += `Please carefully align your choices with the physical and visual properties of the attached image.\n`;

  promptText += `
Select the absolute BEST motion effect ID from the provided lists for 'surface', 'edge', and 'ambient' layers.
If NONE of the existing IDs fit perfectly, you MUST create a NEW, highly descriptive dynamic effect object for that layer.
New dynamic effect format: {"id": "dynamic_...", "label": "Korean Label", "en": "English desc. NO camera movement."}

Existing IDs:
- Surface [${surfaceIds}]
- Edge [${edgeIds}]
- Ambient [${ambientIds}]
- Flow (if mode is loop/transition) [${flowIds}]
- Intro (if mode is intro) [${introIds}]
- Dynamics [${dynamicsIds}]
- Intensity [subtle, medium, intense]

Respond ONLY with a JSON object exactly matching this structure:
{
  "interpretation": "한국어로 1~2줄 연출 의도 및 세팅 결과 설명 (전문 모션 디자이너의 톤앤매너로 작성. e.g. '이미지의 거친 돌 질감에 맞춰 산화가 퍼지는 효과와 파편이 날리는 연출을 조합하여 고대의 느낌을 극대화했습니다.')",
  "surface": "id" or {obj},
  "edge": "id" or {obj},
  "ambient": "id" or {obj},
  "intensity": "subtle|medium|intense",
  "flow": "id",
  "intro": "id",
  "dynamics": "id"
}`;

  const parts = [{ text: promptText }];
  if (image) {
    const base64Data = image.split(',')[1];
    const mimeType = image.match(/data:(.*?);/)?.[1] || 'image/png';
    parts.push({ inlineData: { mimeType, data: base64Data } });
  }

  const result = await fetchWithRetry(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { responseMimeType: 'application/json', temperature: 0.7 } }),
  });
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No response from API.');
  return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
};

// Video QA: 3-frame analysis → boolean error flags + reasoning.
export const analyzeResultVideoFrames = async (frames) => {
  const prompt = `You are an extremely strict Video Quality Assurance Expert analyzing a 3-frame sequence of a typography motion video.
FRAME 1 is the START. FRAME 2 is the MIDDLE. FRAME 3 is the END.

You MUST analyze the frames step-by-step before making a final boolean judgment.

1. Scale & Camera (cameraMoved): Compare the exact size and margins of the text between FRAME 1 and FRAME 3. Did the text shrink (zoom out), grow, or shift position?
2. Geometry (shapeMutated): Did the text geometry melt, warp, or distort?
3. Loop Seamlessness (loopBroken): CRITICAL - A perfect loop requires FRAME 1 and FRAME 3 to be EXACTLY identical. Compare the brightness, glow, and internal cracks between FRAME 1 and FRAME 3. If FRAME 1 has light/glow but FRAME 3 is completely dark (or vice-versa), the loop is broken. They must match perfectly.
4. Boundaries (particlesEscaped): Are particles hitting the extreme edges of the frame?
5. Alpha/Background (alphaDirty): Is the pure black background polluted with wide fog, glow, or smoke?`;

  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }, ...frames.map((f) => ({ inlineData: { mimeType: 'image/jpeg', data: f } }))] }],
    generationConfig: {
      temperature: 0.0,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          cameraMovedReasoning: { type: 'STRING' }, cameraMoved: { type: 'BOOLEAN' },
          shapeMutatedReasoning: { type: 'STRING' }, shapeMutated: { type: 'BOOLEAN' },
          loopBrokenReasoning: { type: 'STRING' }, loopBroken: { type: 'BOOLEAN' },
          particlesEscapedReasoning: { type: 'STRING' }, particlesEscaped: { type: 'BOOLEAN' },
          alphaDirtyReasoning: { type: 'STRING' }, alphaDirty: { type: 'BOOLEAN' },
        },
        required: ['cameraMovedReasoning', 'cameraMoved', 'shapeMutatedReasoning', 'shapeMutated', 'loopBrokenReasoning', 'loopBroken', 'particlesEscapedReasoning', 'particlesEscaped', 'alphaDirtyReasoning', 'alphaDirty'],
      },
    },
  };

  const result = await fetchWithRetry(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No response from API');
  return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
};

// Extracts 3 evenly-spaced frames (start/mid/end) from a video file URL.
// Returns base64 JPEG data (without data URL prefix).
export const extractVideoFrames = (url) =>
  new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = url; video.muted = true; video.playsInline = true; video.preload = 'metadata';
    video.onloadedmetadata = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      const frames = [];
      const captureFrame = (time, label) => new Promise((res, rej) => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          ctx.fillRect(10, 10, 480, 90);
          ctx.font = 'bold 50px sans-serif';
          ctx.fillStyle = 'white';
          ctx.fillText(label, 30, 70);
          res(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
        };
        video.addEventListener('seeked', onSeeked);
        video.addEventListener('error', rej);
        video.currentTime = time;
      });
      try {
        const dur = video.duration && !isNaN(video.duration) && video.duration !== Infinity ? video.duration : 5;
        frames.push(await captureFrame(0.0, 'FRAME 1 (START)'));
        frames.push(await captureFrame(dur / 2, 'FRAME 2 (MIDDLE)'));
        frames.push(await captureFrame(Math.max(0, dur - 0.05), 'FRAME 3 (END)'));
        resolve(frames);
      } catch (e) { reject(e); }
    };
    video.onerror = () => reject(new Error('Failed to load video'));
  });
