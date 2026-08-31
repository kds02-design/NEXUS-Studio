import { useRef, useState } from "react";
import { C, OH_GLYPH } from "./shared";
import { drawNormalizedHand, HAND_CONNECTIONS, recognizePalm } from "./handLandmarker";
import { analyzePalmWithVision } from "./palmVision";

const STAGES = [
  [86, "검출 좌표와 손바닥 영역 검증 중"],
  [100, "관측 결과 정리 중"],
];

const LINE_META = [
  { key: "heart", name: "감정선", element: "화", hint: "감정 표현과 관계의 흐름" },
  { key: "head", name: "두뇌선", element: "수", hint: "사고 방식과 집중의 흐름" },
  { key: "life", name: "생명선", element: "목", hint: "생활 리듬과 활력의 흐름" },
  { key: "fate", name: "운명선", element: "금", hint: "일과 방향성의 흐름" },
];

const LINE_COLORS = {
  heart: "#f04e45",
  head: "#4b89dc",
  life: "#55b89a",
  fate: "#e9e4d6",
};

const LINE_LABEL_LAYOUT = {
  heart: { side: "before", top: -19, anchor: 0.57 },
  head: { side: "after", top: -24, anchor: 0.68 },
  life: { side: "after", top: -12, anchor: 0.48 },
  fate: { side: "after", top: 7, anchor: 0.42 },
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

function levelOf(score) {
  if (score >= 76) return "뚜렷함";
  if (score >= 56) return "보통";
  return "섬세함";
}

function buildLine(meta, score) {
  const level = levelOf(score);
  const tone = level === "뚜렷함"
    ? `${meta.hint}이 비교적 또렷하게 잡혀요.`
    : level === "보통"
      ? `${meta.hint}이 무난하고 균형 있게 보여요.`
      : `${meta.hint}이 가늘고 세심하게 나타나요.`;
  return { ...meta, score, level, tone };
}

function buildRidgeMap(gray, maskPixels, edgeMaps, width, height) {
  const stride = width + 1;
  const integral = new Float64Array((width + 1) * (height + 1));
  for (let y = 1; y <= height; y += 1) {
    let row = 0;
    for (let x = 1; x <= width; x += 1) {
      row += gray[(y - 1) * width + x - 1];
      integral[y * stride + x] = integral[(y - 1) * stride + x] + row;
    }
  }

  const boxMean = (x, y, radius) => {
    const left = Math.max(0, x - radius);
    const right = Math.min(width - 1, x + radius);
    const top = Math.max(0, y - radius);
    const bottom = Math.min(height - 1, y + radius);
    const sum = integral[(bottom + 1) * stride + right + 1]
      - integral[top * stride + right + 1]
      - integral[(bottom + 1) * stride + left]
      + integral[top * stride + left];
    return sum / ((right - left + 1) * (bottom - top + 1));
  };

  const ridge = new Float32Array(width * height);
  for (let y = 6; y < height - 6; y += 1) {
    for (let x = 6; x < width - 6; x += 1) {
      const index = y * width + x;
      if (maskPixels[index * 4 + 3] === 0) continue;
      const darkness = Math.max(0, boxMean(x, y, 6) - boxMean(x, y, 1));
      ridge[index] = darkness * 2.4 + Math.min(36, edgeMaps.all[index] * 0.09);
    }
  }
  return ridge;
}

function smoothTrace(points, passes = 3) {
  let smoothed = points.map((point) => ({ ...point }));
  for (let pass = 0; pass < passes; pass += 1) {
    smoothed = smoothed.map((point, index, source) => {
      if (index === 0 || index === source.length - 1) return point;
      const before = source[Math.max(0, index - 2)];
      const previous = source[index - 1];
      const next = source[index + 1];
      const after = source[Math.min(source.length - 1, index + 2)];
      return {
        ...point,
        x: before.x * 0.08 + previous.x * 0.22 + point.x * 0.4 + next.x * 0.22 + after.x * 0.08,
        y: before.y * 0.08 + previous.y * 0.22 + point.y * 0.4 + next.y * 0.22 + after.y * 0.08,
      };
    });
  }
  return smoothed;
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];
    const intersects = ((a.y > point.y) !== (b.y > point.y))
      && point.x < ((b.x - a.x) * (point.y - a.y)) / ((b.y - a.y) || 0.00001) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function expandPolygon(polygon, scale, width, height) {
  const center = polygon.reduce((sum, point) => ({
    x: sum.x + point.x / polygon.length,
    y: sum.y + point.y / polygon.length,
  }), { x: 0, y: 0 });
  return polygon.map((point) => ({
    x: clamp(center.x + (point.x - center.x) * scale, 0, width),
    y: clamp(center.y + (point.y - center.y) * scale, 0, height),
  }));
}

function resamplePolyline(source, count = 32) {
  if (source.length < 2) return source;
  const lengths = [0];
  for (let index = 1; index < source.length; index += 1) {
    lengths.push(lengths.at(-1) + Math.hypot(source[index].x - source[index - 1].x, source[index].y - source[index - 1].y));
  }
  const total = lengths.at(-1);
  if (total < 1) return source;
  return Array.from({ length: count }, (_, index) => {
    const target = total * index / (count - 1);
    let segment = 1;
    while (segment < lengths.length - 1 && lengths[segment] < target) segment += 1;
    const start = source[segment - 1];
    const end = source[segment];
    const span = Math.max(0.00001, lengths[segment] - lengths[segment - 1]);
    const ratio = (target - lengths[segment - 1]) / span;
    return { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio };
  });
}

function refineVisionLine(visionLine, ridgeMap, maskPixels, width, height, geometry) {
  const analysisPolygon = geometry.analysisPolygon || geometry.palmPolygon;
  const source = visionLine.points.map((point) => ({ x: point.x / 1000 * width, y: point.y / 1000 * height }));
  const insideRatio = source.filter((point) => pointInPolygon(point, analysisPolygon)).length / source.length;
  if (insideRatio < 0.58) return null;

  const runs = source.reduce((result, point) => {
    if (pointInPolygon(point, analysisPolygon)) {
      if (!result.length || result.at(-1).closed) result.push({ points: [], closed: false });
      result.at(-1).points.push(point);
    } else if (result.length) {
      result.at(-1).closed = true;
    }
    return result;
  }, []);
  const visibleSource = runs.sort((a, b) => b.points.length - a.points.length)[0]?.points || [];
  if (visibleSource.length < 4) return null;
  const expected = resamplePolyline(visibleSource, 32);
  const palmWidth = Math.max(1, geometry.palmBounds?.width || Math.hypot(
    geometry.landmarks[17].x - geometry.landmarks[5].x,
    geometry.landmarks[17].y - geometry.landmarks[5].y,
  ));
  const searchRadius = clamp(Math.round(palmWidth * 0.018), 2, 6);
  const offsets = Array.from({ length: searchRadius * 2 + 1 }, (_, index) => index - searchRadius);
  const candidates = expected.map((point, pointIndex) => {
    const before = expected[Math.max(0, pointIndex - 1)];
    const after = expected[Math.min(expected.length - 1, pointIndex + 1)];
    const length = Math.max(1, Math.hypot(after.x - before.x, after.y - before.y));
    const normal = { x: -(after.y - before.y) / length, y: (after.x - before.x) / length };
    return offsets.map((offset) => {
      const x = Math.round(point.x + normal.x * offset);
      const y = Math.round(point.y + normal.y * offset);
      const pixelIndex = y * width + x;
      const valid = x >= 2 && x < width - 2 && y >= 2 && y < height - 2
        && maskPixels[pixelIndex * 4 + 3] > 0 && pointInPolygon({ x, y }, analysisPolygon);
      return { x, y, offset, response: valid ? ridgeMap[pixelIndex] - Math.abs(offset) * 0.45 : -1000 };
    });
  });

  const scores = candidates.map(() => new Float32Array(offsets.length));
  const parents = candidates.map(() => new Int16Array(offsets.length));
  candidates[0].forEach((candidate, index) => { scores[0][index] = candidate.response; parents[0][index] = -1; });
  for (let pointIndex = 1; pointIndex < candidates.length; pointIndex += 1) {
    candidates[pointIndex].forEach((candidate, candidateIndex) => {
      let bestScore = -Infinity;
      let bestParent = 0;
      candidates[pointIndex - 1].forEach((previous, previousIndex) => {
        const jump = Math.abs(candidate.offset - previous.offset);
        const score = scores[pointIndex - 1][previousIndex] + candidate.response - jump * 2.8 - Math.max(0, jump - 2) * 5;
        if (score > bestScore) { bestScore = score; bestParent = previousIndex; }
      });
      scores[pointIndex][candidateIndex] = bestScore;
      parents[pointIndex][candidateIndex] = bestParent;
    });
  }

  let bestIndex = 0;
  const lastScores = scores.at(-1);
  for (let index = 1; index < lastScores.length; index += 1) if (lastScores[index] > lastScores[bestIndex]) bestIndex = index;
  const traced = new Array(candidates.length);
  for (let pointIndex = candidates.length - 1; pointIndex >= 0; pointIndex -= 1) {
    traced[pointIndex] = candidates[pointIndex][bestIndex];
    bestIndex = parents[pointIndex][bestIndex];
  }
  if (traced.some((point) => point.response <= -900)) return null;
  const smoothed = smoothTrace(traced, 2);
  const length = smoothed.slice(1).reduce((sum, point, index) => sum + Math.hypot(point.x - smoothed[index].x, point.y - smoothed[index].y), 0);
  const spanX = Math.max(...smoothed.map((point) => point.x)) - Math.min(...smoothed.map((point) => point.x));
  if (length < palmWidth * 0.28) return null;
  if (["heart", "head"].includes(visionLine.key) && spanX < palmWidth * 0.2) return null;

  const averageRidge = traced.reduce((sum, point) => sum + Math.max(0, point.response), 0) / traced.length;
  const score = clamp(Math.round(visionLine.clarity * 0.55 + visionLine.confidence * 35 + Math.min(10, averageRidge * 0.3)));
  const anchorAt = LINE_LABEL_LAYOUT[visionLine.key]?.anchor ?? 0.5;
  const anchorPoint = smoothed[Math.round((smoothed.length - 1) * anchorAt)];
  return {
    anchor: {
      x: Number(clamp(anchorPoint.x / width * 100, 8, 92).toFixed(1)),
      y: Number(clamp(anchorPoint.y / height * 100, 10, 90).toFixed(1)),
    },
    path: smoothed.map((point) => ({
      x: Number((point.x / width * 100).toFixed(2)),
      y: Number((point.y / height * 100).toFixed(2)),
    })),
    score,
    confidence: visionLine.confidence,
  };
}

async function analyzePalmImage(file, onStage) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const node = new Image();
      node.onload = () => resolve(node);
      node.onerror = () => reject(new Error("사진을 읽지 못했습니다."));
      node.src = objectUrl;
    });

    const width = 360;
    const height = 450;
    const base = document.createElement("canvas");
    base.width = width;
    base.height = height;
    const context = base.getContext("2d", { willReadFrequently: true });

    const geometry = await recognizePalm(image, width, height);
    onStage?.(32, "손바닥 인식 완료 · 21개 관절점 정렬 중");
    drawNormalizedHand(context, image, geometry, width, height);
    const previewUrl = base.toDataURL("image/jpeg", 0.9);
    geometry.analysisPolygon = expandPolygon(geometry.palmPolygon, 1.18, width, height);

    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = width;
    maskCanvas.height = height;
    const maskContext = maskCanvas.getContext("2d");
    maskContext.beginPath();
    geometry.analysisPolygon.forEach((point, index) => {
      if (index === 0) maskContext.moveTo(point.x, point.y);
      else maskContext.lineTo(point.x, point.y);
    });
    maskContext.closePath();
    maskContext.fillStyle = "#fff";
    maskContext.fill();
    const maskPixels = maskContext.getImageData(0, 0, width, height).data;

    const frame = context.getImageData(0, 0, width, height);
    const pixels = frame.data;
    const gray = new Float32Array(width * height);
    let brightnessSum = 0;

    for (let i = 0, p = 0; i < pixels.length; i += 4, p += 1) {
      const value = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
      gray[p] = value;
      brightnessSum += value;
    }

    const brightness = brightnessSum / gray.length;
    let variance = 0;
    for (let i = 0; i < gray.length; i += 1) variance += (gray[i] - brightness) ** 2;
    const contrast = Math.sqrt(variance / gray.length);

    const overlay = document.createElement("canvas");
    overlay.width = width;
    overlay.height = height;
    const overlayContext = overlay.getContext("2d");
    const overlayFrame = overlayContext.createImageData(width, height);
    const edgeMaps = {
      all: new Float32Array(width * height),
      horizontal: new Float32Array(width * height),
      vertical: new Float32Array(width * height),
    };
    let edgeCount = 0;
    let palmEdgeCount = 0;
    let palmPixelCount = 0;

    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const at = (yy, xx) => gray[yy * width + xx];
        const gx = -at(y - 1, x - 1) - 2 * at(y, x - 1) - at(y + 1, x - 1)
          + at(y - 1, x + 1) + 2 * at(y, x + 1) + at(y + 1, x + 1);
        const gy = -at(y - 1, x - 1) - 2 * at(y - 1, x) - at(y - 1, x + 1)
          + at(y + 1, x - 1) + 2 * at(y + 1, x) + at(y + 1, x + 1);
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        const pixelIndex = y * width + x;
        if (maskPixels[pixelIndex * 4 + 3] === 0) continue;
        palmPixelCount += 1;
        edgeMaps.all[pixelIndex] = magnitude;
        edgeMaps.horizontal[pixelIndex] = Math.abs(gy);
        edgeMaps.vertical[pixelIndex] = Math.abs(gx);
        if (magnitude > 70) {
          edgeCount += 1;
          palmEdgeCount += 1;
        }
      }
    }
    overlayContext.putImageData(overlayFrame, 0, 0);
    overlayContext.lineCap = "round";
    overlayContext.lineJoin = "round";
    overlayContext.strokeStyle = "rgba(245,135,15,.48)";
    overlayContext.lineWidth = 1.1;
    HAND_CONNECTIONS.forEach(([from, to]) => {
      const a = geometry.landmarks[from];
      const b = geometry.landmarks[to];
      overlayContext.beginPath();
      overlayContext.moveTo(a.x, a.y);
      overlayContext.lineTo(b.x, b.y);
      overlayContext.stroke();
    });
    overlayContext.fillStyle = "rgba(233,228,214,.86)";
    geometry.landmarks.forEach((point) => {
      overlayContext.beginPath();
      overlayContext.arc(point.x, point.y, 1.65, 0, Math.PI * 2);
      overlayContext.fill();
    });

    const total = (width - 2) * (height - 2);
    const edgeDensity = (edgeCount / total) * 100;
    const centralDensity = (palmEdgeCount / Math.max(1, palmPixelCount)) * 100;
    const resolution = Math.min(1, Math.min(image.width / 720, image.height / 900));
    const brightnessScore = 1 - Math.min(1, Math.abs(brightness - 138) / 138);
    const contrastScore = Math.min(1, contrast / 58);
    const densityScore = Math.min(1, centralDensity / 10);
    const quality = clamp(Math.round(resolution * 20 + brightnessScore * 15 + contrastScore * 20 + densityScore * 15 + geometry.confidence * 30));

    onStage?.(58, "Google AI가 실제 손금선을 식별 중");
    const vision = await analyzePalmWithVision(previewUrl, geometry);
    onStage?.(78, "검출 좌표와 손바닥 영역 검증 중");
    const ridgeMap = buildRidgeMap(gray, maskPixels, edgeMaps, width, height);
    const metaByKey = Object.fromEntries(LINE_META.map((meta) => [meta.key, meta]));
    const lines = vision.lines
      .map((visionLine) => {
        const refined = refineVisionLine(visionLine, ridgeMap, maskPixels, width, height, geometry);
        return refined ? { ...buildLine(metaByKey[visionLine.key], refined.score), ...refined } : null;
      })
      .filter(Boolean);
    const requiredCount = lines.filter((line) => ["heart", "head", "life"].includes(line.key)).length;
    if (requiredCount < 1) {
      throw new Error("실제 손바닥 영역 안에서 확실한 주요 손금선을 확인하지 못했습니다. 손바닥을 정면으로 펴고 다시 찍어주세요.");
    }

    lines.forEach((line) => {
      overlayContext.save();
      overlayContext.beginPath();
      const points = line.path.map((point) => ({ x: point.x / 100 * width, y: point.y / 100 * height }));
      overlayContext.moveTo(points[0].x, points[0].y);
      for (let index = 1; index < points.length - 1; index += 1) {
        const midpoint = { x: (points[index].x + points[index + 1].x) / 2, y: (points[index].y + points[index + 1].y) / 2 };
        overlayContext.quadraticCurveTo(points[index].x, points[index].y, midpoint.x, midpoint.y);
      }
      overlayContext.lineTo(points.at(-1).x, points.at(-1).y);
      overlayContext.strokeStyle = LINE_COLORS[line.key];
      overlayContext.lineWidth = 1.8;
      overlayContext.globalAlpha = 0.84;
      overlayContext.shadowColor = LINE_COLORS[line.key];
      overlayContext.shadowBlur = 5;
      overlayContext.stroke();
      overlayContext.restore();
    });

    const lineScores = Object.fromEntries(lines.map((line) => [line.key, line.score]));
    const detectedAverage = lines.reduce((sum, line) => sum + line.score, 0) / lines.length;
    const heartScore = lineScores.heart ?? detectedAverage;
    const headScore = lineScores.head ?? detectedAverage;
    const lifeScore = lineScores.life ?? detectedAverage;
    const fateScore = lineScores.fate ?? detectedAverage;

    const currentState = {
      energy: clamp(Math.round(lifeScore * 0.72 + brightnessScore * 28)),
      focus: clamp(Math.round(headScore * 0.76 + contrastScore * 24)),
      stability: clamp(Math.round((heartScore + fateScore) * 0.42 + quality * 0.16)),
    };

    const strongest = [...lines].sort((a, b) => b.score - a.score)[0];
    const qualityNote = quality >= 78
      ? "초점과 대비가 좋아 주요 선 후보가 안정적으로 잡혔어요."
      : quality >= 58
        ? "분석 가능한 사진이에요. 더 밝은 곳에서 다시 찍으면 선이 또렷해져요."
        : "그림자나 초점 때문에 선 검출이 약해요. 손바닥을 펴고 밝은 곳에서 다시 찍어보세요.";

    return {
      version: 6,
      analysisMode: "gemini-vision",
      createdAt: Date.now(),
      previewUrl,
      overlayUrl: overlay.toDataURL("image/png"),
      quality,
      qualityNote,
      lines,
      strongest,
      currentState,
      hand: {
        detected: true,
        handedness: geometry.handedness,
        confidence: Math.round(geometry.confidence * 100),
        landmarkCount: geometry.landmarks.length,
      },
      vision: { model: vision.model, transmitted: true },
      metrics: {
        brightness: Math.round(brightness),
        contrast: Math.round(contrast),
        lineDensity: Number(edgeDensity.toFixed(1)),
        resolution: `${image.width}×${image.height}`,
      },
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function PalmScanner({ value, onChange }) {
  const inputRef = useRef(null);
  const runRef = useRef(0);
  const [status, setStatus] = useState(value ? "ready" : "idle");
  const [analysis, setAnalysis] = useState(value || null);
  const [progress, setProgress] = useState(value ? 100 : 0);
  const [stage, setStage] = useState(value ? "손금 관측 완료" : "");
  const [error, setError] = useState("");
  const [aiConsent, setAiConsent] = useState(false);

  const choosePhoto = () => {
    if (!aiConsent) {
      setError("Google AI 정밀 분석 전송에 동의한 뒤 사진을 선택해 주세요.");
      return;
    }
    setError("");
    inputRef.current?.click();
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("이미지 파일을 선택해 주세요."); return; }
    if (file.size > 12 * 1024 * 1024) { setError("12MB 이하 사진을 사용해 주세요."); return; }

    const run = ++runRef.current;
    setError("");
    setAnalysis(null);
    setStatus("preparing");
    setProgress(5);
    setStage("손바닥 탐지 모델 준비 중");
    onChange(null);

    try {
      const result = await analyzePalmImage(file, (nextProgress, label) => {
        if (run !== runRef.current) return;
        setProgress(nextProgress);
        setStage(label);
      });
      if (run !== runRef.current) return;
      setAnalysis(result);
      setStatus("scanning");
      for (const [nextProgress, label] of STAGES) {
        setProgress(nextProgress);
        setStage(label);
        await wait(nextProgress === 100 ? 220 : 330);
        if (run !== runRef.current) return;
      }
      setStatus("ready");
      setStage("손금 관측 완료");
      onChange(result);
    } catch (cause) {
      if (run !== runRef.current) return;
      setStatus("idle");
      setProgress(0);
      setError(cause?.message || "사진 분석 중 문제가 생겼습니다.");
    }
  };

  const reset = () => {
    runRef.current += 1;
    setStatus("idle");
    setAnalysis(null);
    setProgress(0);
    setStage("");
    setError("");
    onChange(null);
  };

  const busy = status === "preparing" || status === "scanning";

  return (
    <div>
      <style>{`
        @keyframes palmScanSweep{0%{top:5%;opacity:0}10%{opacity:1}90%{opacity:1}100%{top:94%;opacity:0}}
        @keyframes palmGridPulse{0%,100%{opacity:.18}50%{opacity:.42}}
        @keyframes palmPointPulse{0%,100%{transform:scale(.82);opacity:.55}50%{transform:scale(1.18);opacity:1}}
        .palm-scan-line{animation:palmScanSweep 1.55s cubic-bezier(.45,0,.55,1) infinite}
        .palm-grid{animation:palmGridPulse 1.8s ease-in-out infinite}
        .palm-point{animation:palmPointPulse 1.2s ease-in-out infinite}
        @media(prefers-reduced-motion:reduce){.palm-scan-line,.palm-grid,.palm-point{animation:none}}
      `}</style>

      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: "none" }} />

      {!analysis && status === "idle" && (
        <>
          <label style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 10, padding: "10px 11px", border: `1px solid ${aiConsent ? C.목 : C.line}`, color: aiConsent ? C.목 : C.dim, fontSize: 10.5, lineHeight: 1.55, cursor: "pointer" }}>
            <input type="checkbox" checked={aiConsent} onChange={(event) => { setAiConsent(event.target.checked); setError(""); }} style={{ marginTop: 2, accentColor: C.gold }} />
            <span>정규화된 손바닥 사진 1장, 주요 관절 좌표, 손 방향을 Google Gemini API로 전송하여 정밀 분석하는 데 동의합니다.</span>
          </label>
          <button type="button" onClick={choosePhoto} style={{
            width: "100%", minHeight: 196, padding: 22, cursor: "pointer", border: `1px dashed ${C.gold}`,
            background: "linear-gradient(145deg,rgba(245,135,15,.11),rgba(240,78,69,.035))", color: C.ink,
          }}>
            <span aria-hidden style={{ display: "block", fontSize: 40, color: C.gold, marginBottom: 12 }}>✋</span>
            <span className="destiny-display" style={{ display: "block", fontSize: 21, color: C.goldSoft }}>손바닥 촬영·사진 선택</span>
            <span style={{ display: "block", marginTop: 9, color: C.dim, fontSize: 11.5, lineHeight: 1.7 }}>
              손가락을 편 상태로 손바닥 전체가 나오게 찍어주세요.<br />밝고 그림자가 적을수록 실제 선을 안정적으로 찾을 수 있어요.
            </span>
          </button>
        </>
      )}

      {status === "preparing" && !analysis && (
        <div style={{ minHeight: 196, display: "grid", placeItems: "center", border: `1px solid ${C.line}`, background: C.bg2 }}>
          <div style={{ textAlign: "center" }}>
            <div className="keep-round" style={{ width: 36, height: 36, margin: "0 auto 14px", border: `2px solid ${C.line}`, borderTopColor: C.gold, animation: "destinySpin .8s linear infinite" }} />
            <div style={{ fontSize: 12, color: C.gold, letterSpacing: 2 }}>{stage}</div>
          </div>
        </div>
      )}

      {analysis && (
        <>
          <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 5", overflow: "hidden", border: `1px solid ${busy ? C.gold : C.line}`, background: "#0c0c0b" }}>
            <img src={analysis.previewUrl} alt="분석할 손바닥" style={{ width: "100%", height: "100%", objectFit: "fill", display: "block", filter: busy ? "saturate(.7) contrast(1.06) brightness(.78)" : "saturate(.82) contrast(1.04) brightness(.86)" }} />
            <img src={analysis.overlayUrl} alt="검출된 손바닥 선" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill", display: "block", opacity: busy ? 0.72 : 0.58, mixBlendMode: "screen", pointerEvents: "none" }} />
            <div className="palm-grid" aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${C.line} 1px,transparent 1px),linear-gradient(90deg,${C.line} 1px,transparent 1px)`, backgroundSize: "32px 32px" }} />
            {busy && <div className="palm-scan-line" aria-hidden style={{ position: "absolute", left: 0, right: 0, top: "5%", height: 2, background: C.gold, boxShadow: `0 0 8px ${C.gold},0 0 24px ${C.goldSoft}` }} />}
            <div aria-hidden style={{ position: "absolute", inset: 12, border: `1px solid rgba(245,135,15,.5)`, boxShadow: "inset 0 0 34px rgba(245,135,15,.06)" }} />
            {!busy && analysis.lines.map((line) => {
              const left = line.anchor?.x ?? 50;
              const top = line.anchor?.y ?? 50;
              const labelLayout = LINE_LABEL_LAYOUT[line.key] || { side: left > 64 ? "before" : "after", top: -10 };
              return (
                <div key={line.key} style={{ position: "absolute", left: `${left}%`, top: `${top}%`, width: 0, height: 0 }}>
                  <span className="palm-point keep-round" style={{ position: "absolute", left: -4, top: -4, width: 8, height: 8, background: C[line.element], boxShadow: `0 0 10px ${C[line.element]}` }} />
                  <span style={{ position: "absolute", top: labelLayout.top, ...(labelLayout.side === "before" ? { right: 10 } : { left: 10 }), whiteSpace: "nowrap", padding: "3px 6px", fontSize: 9, letterSpacing: 1, color: C.ink, background: "rgba(12,12,11,.84)", border: `1px solid ${C[line.element]}` }}>{line.name}</span>
                </div>
              );
            })}
            <div style={{ position: "absolute", left: 14, right: 14, bottom: 12, display: "flex", justifyContent: "space-between", color: C.ink, fontSize: 9, letterSpacing: 1.5, textShadow: "0 1px 4px #000" }}>
              <span>PALM FOUND · {analysis.hand.handedness} {analysis.hand.confidence}%</span><span>{analysis.metrics.resolution}</span>
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, fontSize: 11 }}>
              <span style={{ color: busy ? C.gold : C.목 }}>{stage}</span>
              <span className="destiny-display" style={{ color: C.ink, fontSize: 14 }}>{progress}%</span>
            </div>
            <div style={{ height: 5, background: "rgba(233,228,214,.08)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(90deg,${C.gold},${C.goldSoft})`, transition: "width .28s ease" }} />
            </div>
          </div>
        </>
      )}

      {status === "ready" && analysis && <PalmResult palm={analysis} compact />}

      {(analysis || busy) && (
        <button type="button" onClick={busy ? undefined : reset} disabled={busy} style={{ width: "100%", marginTop: 10, padding: "11px 14px", cursor: busy ? "wait" : "pointer", border: `1px solid ${C.line}`, background: "transparent", color: busy ? C.dim : C.ink, fontSize: 12 }}>
          {busy ? "AI가 실제 손금선을 확인하고 있어요" : "다른 사진으로 다시 관측"}
        </button>
      )}

      {error && <p role="alert" style={{ margin: "9px 0 0", color: C.goldSoft, fontSize: 11.5 }}>{error}</p>}
      <p style={{ color: C.dim, fontSize: 10.5, lineHeight: 1.65, margin: "10px 0 0" }}>
        손 인식은 기기에서 먼저 처리됩니다. 동의한 경우에만 정규화된 손바닥 사진과 주요 관절 좌표가 Google Gemini API로 전송됩니다. 앱 서버에는 사진을 저장하지 않으며, AI와 손바닥 영역 검증을 모두 통과한 선만 표시합니다.
      </p>
    </div>
  );
}

export function PalmResult({ palm, compact = false }) {
  if (!palm) return null;
  return (
    <div style={{ marginTop: compact ? 14 : 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: C.dim, letterSpacing: 2 }}>PALM OBSERVATION · BETA</div>
          <div className="destiny-display" style={{ marginTop: 5, fontSize: 22, color: C.goldSoft }}>{palm.strongest.name}이 가장 선명</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 9, color: C.dim }}>사진 품질</div>
          <div className="destiny-display" style={{ fontSize: 22, color: palm.quality >= 70 ? C.목 : C.gold }}>{palm.quality}</div>
        </div>
      </div>
      <p style={{ margin: "0 0 12px", color: C.dim, fontSize: 11.5, lineHeight: 1.65 }}>{palm.qualityNote}</p>
      <div style={{ margin: "0 0 10px", padding: "8px 10px", border: `1px solid ${C.목}`, color: C.목, fontSize: 10.5, letterSpacing: .4 }}>
        AI 정밀 손금 분석 완료 · {palm.hand.handedness} · 랜드마크 {palm.hand.landmarkCount}개 · 손 인식 신뢰도 {palm.hand.confidence}%
      </div>
      <div style={{ display: "grid", gap: 7 }}>
        {palm.lines.map((line) => (
          <div key={line.key} style={{ display: "grid", gridTemplateColumns: "68px 1fr auto", alignItems: "center", gap: 8, padding: "9px 10px", border: `1px solid ${C.line}`, background: "rgba(24,24,22,.35)" }}>
            <span style={{ color: C[line.element], fontSize: 12 }}>{OH_GLYPH[line.element]} {line.name}</span>
            <span style={{ color: C.dim, fontSize: 10.5, lineHeight: 1.45 }}>{line.tone}</span>
            <span style={{ color: C.ink, fontSize: 10 }}>{line.level}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 7, marginTop: 10 }}>
        {[["활력", palm.currentState.energy], ["집중", palm.currentState.focus], ["안정", palm.currentState.stability]].map(([label, value]) => (
          <div key={label} style={{ padding: "10px 6px", textAlign: "center", border: `1px solid ${C.line}` }}>
            <div style={{ fontSize: 9, color: C.dim, letterSpacing: 1 }}>{label}</div>
            <div className="destiny-display" style={{ fontSize: 19, color: C.gold, marginTop: 3 }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
