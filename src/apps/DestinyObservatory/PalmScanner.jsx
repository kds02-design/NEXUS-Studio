import { useRef, useState } from "react";
import { C, OH_GLYPH } from "./shared";
import { drawNormalizedHand, HAND_CONNECTIONS, recognizePalm } from "./handLandmarker";

const STAGES = [
  [32, "손바닥 인식 완료"],
  [52, "21개 랜드마크 정렬 중"],
  [72, "손바닥 내부 선 후보 추적 중"],
  [86, "선의 깊이와 흐름 비교 중"],
  [100, "관측 결과 정리 중"],
];

const LINE_META = [
  { key: "heart", name: "감정선", element: "화", hint: "감정 표현과 관계의 흐름" },
  { key: "head", name: "두뇌선", element: "수", hint: "사고 방식과 집중의 흐름" },
  { key: "life", name: "생명선", element: "목", hint: "생활 리듬과 활력의 흐름" },
  { key: "fate", name: "운명선", element: "금", hint: "일과 방향성의 흐름" },
];

const LINE_TRACE_CONFIG = {
  heart: { map: "horizontal", samples: 34, search: 0.075, anchor: 0.58 },
  head: { map: "horizontal", samples: 34, search: 0.08, anchor: 0.7 },
  life: { map: "all", samples: 36, search: 0.085, anchor: 0.48 },
  fate: { map: "vertical", samples: 30, search: 0.07, anchor: 0.38 },
};

const LINE_COLORS = {
  heart: "#f04e45",
  head: "#4b89dc",
  life: "#55b89a",
  fate: "#e9e4d6",
};

const LINE_LABEL_LAYOUT = {
  heart: { side: "before", top: -16 },
  head: { side: "after", top: -30 },
  life: { side: "after", top: -13 },
  fate: { side: "after", top: 8 },
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

function cubicPoint(start, controlA, controlB, end, t) {
  const inverse = 1 - t;
  return {
    u: inverse ** 3 * start.u + 3 * inverse ** 2 * t * controlA.u + 3 * inverse * t ** 2 * controlB.u + t ** 3 * end.u,
    v: inverse ** 3 * start.v + 3 * inverse ** 2 * t * controlA.v + 3 * inverse * t ** 2 * controlB.v + t ** 3 * end.v,
  };
}

function lineTemplatePoint(key, t) {
  if (key === "heart") {
    return { u: -0.43 + 0.9 * t, v: 0.75 - Math.sin(Math.PI * t) * 0.045 + (t - 0.5) * 0.025 };
  }
  if (key === "head") {
    return { u: -0.45 + 0.94 * t, v: 0.65 - 0.15 * t + Math.sin(Math.PI * t) * 0.02 };
  }
  if (key === "life") {
    return cubicPoint(
      { u: -0.42, v: 0.72 },
      { u: -0.65, v: 0.57 },
      { u: -0.57, v: 0.23 },
      { u: -0.2, v: 0.09 },
      t,
    );
  }
  return cubicPoint(
    { u: 0.02, v: 0.12 },
    { u: -0.04, v: 0.31 },
    { u: 0.05, v: 0.55 },
    { u: 0, v: 0.73 },
    t,
  );
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

function tracePalmLine(key, ridgeMap, edgeMaps, maskPixels, width, height, geometry) {
  const config = LINE_TRACE_CONFIG[key];
  const wrist = geometry.landmarks[0];
  const middle = geometry.landmarks[9];
  const indexMcp = geometry.landmarks[5];
  const pinkyMcp = geometry.landmarks[17];
  const acrossX = pinkyMcp.x - indexMcp.x;
  const acrossY = pinkyMcp.y - indexMcp.y;
  const palmWidth = Math.max(1, Math.hypot(acrossX, acrossY));
  const cross = { x: acrossX / palmWidth, y: acrossY / palmWidth };
  const expected = Array.from({ length: config.samples }, (_, index) => {
    const t = index / (config.samples - 1);
    const template = lineTemplatePoint(key, t);
    return {
      x: wrist.x + (middle.x - wrist.x) * template.v + cross.x * palmWidth * template.u,
      y: wrist.y + (middle.y - wrist.y) * template.v + cross.y * palmWidth * template.u,
    };
  });
  const searchRadius = Math.max(7, Math.round(palmWidth * config.search));
  const offsets = [];
  for (let offset = -searchRadius; offset <= searchRadius; offset += 2) offsets.push(offset);
  const candidates = expected.map((point, pointIndex) => {
    const previous = expected[Math.max(0, pointIndex - 1)];
    const next = expected[Math.min(expected.length - 1, pointIndex + 1)];
    const tangentLength = Math.max(1, Math.hypot(next.x - previous.x, next.y - previous.y));
    const normal = { x: -(next.y - previous.y) / tangentLength, y: (next.x - previous.x) / tangentLength };
    return offsets.map((offset) => {
      const x = Math.round(point.x + normal.x * offset);
      const y = Math.round(point.y + normal.y * offset);
      const pixelIndex = y * width + x;
      const valid = x >= 2 && x < width - 2 && y >= 2 && y < height - 2 && maskPixels[pixelIndex * 4 + 3] > 0;
      const directionalEdge = valid ? edgeMaps[config.map][pixelIndex] : 0;
      const response = valid ? ridgeMap[pixelIndex] + Math.min(24, directionalEdge * 0.055) : -1000;
      return { x, y, offset, response };
    });
  });

  const scores = candidates.map(() => new Float32Array(offsets.length));
  const parents = candidates.map(() => new Int16Array(offsets.length));
  candidates[0].forEach((candidate, index) => {
    scores[0][index] = candidate.response - Math.abs(candidate.offset) * 0.025;
    parents[0][index] = -1;
  });
  for (let pointIndex = 1; pointIndex < candidates.length; pointIndex += 1) {
    candidates[pointIndex].forEach((candidate, candidateIndex) => {
      let bestScore = -Infinity;
      let bestParent = 0;
      candidates[pointIndex - 1].forEach((previous, previousIndex) => {
        const offsetJump = Math.abs(candidate.offset - previous.offset);
        const continuityPenalty = offsetJump * 1.25 + Math.max(0, offsetJump - 4) * 3.5;
        const score = scores[pointIndex - 1][previousIndex] + candidate.response - continuityPenalty;
        if (score > bestScore) {
          bestScore = score;
          bestParent = previousIndex;
        }
      });
      scores[pointIndex][candidateIndex] = bestScore;
      parents[pointIndex][candidateIndex] = bestParent;
    });
  }

  let bestIndex = 0;
  const lastScores = scores.at(-1);
  for (let index = 1; index < lastScores.length; index += 1) {
    if (lastScores[index] > lastScores[bestIndex]) bestIndex = index;
  }
  const traced = new Array(candidates.length);
  for (let pointIndex = candidates.length - 1; pointIndex >= 0; pointIndex -= 1) {
    traced[pointIndex] = candidates[pointIndex][bestIndex];
    bestIndex = parents[pointIndex][bestIndex];
  }
  const validPoints = traced.filter((point) => point.response > -100);
  const averageResponse = validPoints.reduce((sum, point) => sum + Math.max(0, point.response), 0) / Math.max(1, validPoints.length);
  const smoothed = smoothTrace(traced);
  const anchorPoint = smoothed[Math.round((smoothed.length - 1) * config.anchor)];
  return {
    anchor: {
      x: Number(clamp((anchorPoint.x / width) * 100, 8, 92).toFixed(1)),
      y: Number(clamp((anchorPoint.y / height) * 100, 10, 90).toFixed(1)),
    },
    path: smoothed.map((point) => ({
      x: Number(((point.x / width) * 100).toFixed(2)),
      y: Number(((point.y / height) * 100).toFixed(2)),
    })),
    clarity: clamp(Math.round(34 + averageResponse * 1.9)),
  };
}

async function analyzePalmImage(file) {
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
    drawNormalizedHand(context, image, geometry, width, height);

    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = width;
    maskCanvas.height = height;
    const maskContext = maskCanvas.getContext("2d");
    maskContext.beginPath();
    geometry.palmPolygon.forEach((point, index) => {
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
          const index = (y * width + x) * 4;
          overlayFrame.data[index] = magnitude > 180 ? 240 : 245;
          overlayFrame.data[index + 1] = magnitude > 180 ? 78 : 135;
          overlayFrame.data[index + 2] = magnitude > 180 ? 69 : 15;
          overlayFrame.data[index + 3] = clamp(Math.round((magnitude - 60) * 0.42), 24, 112);
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

    const ridgeMap = buildRidgeMap(gray, maskPixels, edgeMaps, width, height);
    const baseScores = {
      heart: clamp(Math.round(44 + contrast * 0.52 + centralDensity * 1.2)),
      head: clamp(Math.round(50 + (155 - Math.abs(145 - brightness)) * 0.1 + edgeDensity * 0.8)),
      life: clamp(Math.round(42 + resolution * 22 + centralDensity * 1.5)),
      fate: clamp(Math.round(38 + contrast * 0.38 + edgeDensity * 1.25)),
    };
    const lines = LINE_META.map((meta) => {
      const trace = tracePalmLine(meta.key, ridgeMap, edgeMaps, maskPixels, width, height, geometry);
      const score = clamp(Math.round(baseScores[meta.key] * 0.42 + trace.clarity * 0.58));
      return { ...buildLine(meta, score), ...trace };
    });

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
    const { heart: heartScore, head: headScore, life: lifeScore, fate: fateScore } = lineScores;

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
      version: 5,
      createdAt: Date.now(),
      previewUrl: base.toDataURL("image/jpeg", 0.82),
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

  const choosePhoto = () => inputRef.current?.click();

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
      const result = await analyzePalmImage(file);
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
        <button type="button" onClick={choosePhoto} style={{
          width: "100%", minHeight: 196, padding: 22, cursor: "pointer", border: `1px dashed ${C.gold}`,
          background: "linear-gradient(145deg,rgba(245,135,15,.11),rgba(240,78,69,.035))", color: C.ink,
        }}>
          <span aria-hidden style={{ display: "block", fontSize: 40, color: C.gold, marginBottom: 12 }}>✋</span>
          <span className="destiny-display" style={{ display: "block", fontSize: 21, color: C.goldSoft }}>손바닥 촬영·사진 선택</span>
          <span style={{ display: "block", marginTop: 9, color: C.dim, fontSize: 11.5, lineHeight: 1.7 }}>
            손가락을 편 상태로 손바닥 전체가 나오게 찍어주세요.<br />밝고 그림자가 적을수록 선이 잘 보여요.
          </span>
        </button>
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
          {busy ? "손금선을 추적하고 있어요" : "다른 사진으로 다시 관측"}
        </button>
      )}

      {error && <p role="alert" style={{ margin: "9px 0 0", color: C.goldSoft, fontSize: 11.5 }}>{error}</p>}
      <p style={{ color: C.dim, fontSize: 10.5, lineHeight: 1.65, margin: "10px 0 0" }}>
        첫 분석 때 약 8MB 손 인식 모델을 내려받습니다. 사진은 기기 안에서 처리되며 서버로 전송하거나 저장하지 않습니다. 손바닥과 21개 랜드마크를 찾은 경우에만 선 후보 분석을 진행합니다.
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
        손바닥 인식 완료 · {palm.hand.handedness} · 랜드마크 {palm.hand.landmarkCount}개 · 신뢰도 {palm.hand.confidence}%
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
