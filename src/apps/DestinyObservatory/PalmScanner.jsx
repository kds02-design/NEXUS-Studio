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

const LINE_ANCHOR_CONFIG = {
  heart: { map: "horizontal", fallback: [0.5, 0.25], regions: [[0.1, 0.9, 0.12, 0.36]] },
  head: { map: "horizontal", fallback: [0.5, 0.47], regions: [[0.1, 0.9, 0.35, 0.58]] },
  life: { map: "all", fallback: [0.34, 0.65], regions: [[0.08, 0.48, 0.38, 0.9], [0.52, 0.92, 0.38, 0.9]] },
  fate: { map: "vertical", fallback: [0.5, 0.7], regions: [[0.35, 0.65, 0.4, 0.92]] },
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

function findLineAnchor(key, edgeMaps, width, height, palmBounds) {
  const config = LINE_ANCHOR_CONFIG[key];
  const source = edgeMaps[config.map];
  let best = null;

  for (const [x0, x1, y0, y1] of config.regions) {
    const minX = Math.max(7, Math.round(palmBounds.minX + palmBounds.width * x0));
    const maxX = Math.min(width - 8, Math.round(palmBounds.minX + palmBounds.width * x1));
    const minY = Math.max(7, Math.round(palmBounds.minY + palmBounds.height * y0));
    const maxY = Math.min(height - 8, Math.round(palmBounds.minY + palmBounds.height * y1));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    for (let y = minY; y <= maxY; y += 4) {
      for (let x = minX; x <= maxX; x += 4) {
        let local = 0;
        for (let yy = -6; yy <= 6; yy += 3) {
          for (let xx = -6; xx <= 6; xx += 3) local += source[(y + yy) * width + x + xx] || 0;
        }
        const dx = Math.abs(x - centerX) / Math.max(1, maxX - minX);
        const dy = Math.abs(y - centerY) / Math.max(1, maxY - minY);
        const score = local * (1 - (dx + dy) * 0.12);
        if (!best || score > best.score) best = { x, y, score };
      }
    }
  }

  if (!best || best.score < 1) {
    return {
      x: Number(((palmBounds.minX + palmBounds.width * config.fallback[0]) / width * 100).toFixed(1)),
      y: Number(((palmBounds.minY + palmBounds.height * config.fallback[1]) / height * 100).toFixed(1)),
    };
  }
  return {
    x: Number(clamp((best.x / width) * 100, 8, 92).toFixed(1)),
    y: Number(clamp((best.y / height) * 100, 10, 90).toFixed(1)),
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
          overlayFrame.data[index + 3] = clamp(Math.round((magnitude - 60) * 0.72), 34, 190);
        }
      }
    }
    overlayContext.putImageData(overlayFrame, 0, 0);
    overlayContext.lineCap = "round";
    overlayContext.lineJoin = "round";
    overlayContext.strokeStyle = "rgba(245,135,15,.72)";
    overlayContext.lineWidth = 1.35;
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

    const heartScore = clamp(Math.round(44 + contrast * 0.52 + centralDensity * 1.2));
    const headScore = clamp(Math.round(50 + (155 - Math.abs(145 - brightness)) * 0.1 + edgeDensity * 0.8));
    const lifeScore = clamp(Math.round(42 + resolution * 22 + centralDensity * 1.5));
    const fateScore = clamp(Math.round(38 + contrast * 0.38 + edgeDensity * 1.25));
    const lineScores = { heart: heartScore, head: headScore, life: lifeScore, fate: fateScore };
    const lines = LINE_META.map((meta) => ({
      ...buildLine(meta, lineScores[meta.key]),
      anchor: findLineAnchor(meta.key, edgeMaps, width, height, geometry.palmBounds),
    }));

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
      version: 3,
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
              const labelToLeft = left > 64;
              return (
                <div key={line.key} style={{ position: "absolute", left: `${left}%`, top: `${top}%`, width: 0, height: 0 }}>
                  <span className="palm-point keep-round" style={{ position: "absolute", left: -4, top: -4, width: 8, height: 8, background: C[line.element], boxShadow: `0 0 10px ${C[line.element]}` }} />
                  <span style={{ position: "absolute", top: -10, ...(labelToLeft ? { right: 10 } : { left: 10 }), whiteSpace: "nowrap", padding: "3px 6px", fontSize: 9, letterSpacing: 1, color: C.ink, background: "rgba(12,12,11,.78)", border: `1px solid ${C[line.element]}` }}>{line.name}</span>
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
