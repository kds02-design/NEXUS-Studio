// 퀄리티 업 — 배너 업로드 → (크기·위치 조절) → Gemini 분석으로 향상 프롬프트 생성 OR Pro 이미지 모델로 바로 렌더링.
// 분석 호출 전 ensureCanGenerate("analysis"), 렌더 호출 전 ensureCanGenerate("image") (프로젝트 규약).
import { useRef, useState } from "react";
import { Upload, Sparkles, Copy, Check, RotateCcw, Wand2, Download, Move } from "lucide-react";
import { useUsageGate } from "../../../components/UsageGate";
import { analyzeForQuality, renderEnhanced } from "../services/qualityEnhancer";

const TOOLS = [
  { key: "gemini", label: "Gemini", sub: "Imagen / Nano Banana", color: "#8b5cf6" },
  { key: "gpt", label: "ChatGPT", sub: "GPT-4o 이미지 편집", color: "#10b981" },
];

// 변환(스케일·위치) 적용본을 원본 해상도 캔버스로 평탄화 → dataURL.
function flatten(dataUrl, frameW, scale, pos) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const nW = img.naturalWidth, nH = img.naturalHeight;
      if (scale === 1 && pos.x === 0 && pos.y === 0) { resolve(dataUrl); return; }
      const ratio = nW / (frameW || nW);
      const canvas = document.createElement("canvas");
      canvas.width = nW; canvas.height = nH;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, nW, nH);
      const dW = nW * scale, dH = nH * scale;
      ctx.drawImage(img, (nW - dW) / 2 + pos.x * ratio, (nH - dH) / 2 + pos.y * ratio, dW, dH);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export default function QualityEnhancer({ T, accent }) {
  const { ensureCanGenerate, modal } = useUsageGate();
  const [dataUrl, setDataUrl] = useState(null);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [aspect, setAspect] = useState(16 / 9);

  const [tool, setTool] = useState(null);
  const [loading, setLoading] = useState(""); // '' | 'prompt' | 'render'
  const [result, setResult] = useState(null);     // 프롬프트 결과
  const [renderedUrl, setRenderedUrl] = useState(null); // 렌더 결과
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [dragging, setDragging] = useState(false);

  const fileRef = useRef(null);
  const frameRef = useRef(null);
  const dragRef = useRef(null);

  const onFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target.result;
      const probe = new Image();
      probe.onload = () => setAspect(probe.naturalWidth / probe.naturalHeight || 16 / 9);
      probe.src = url;
      setDataUrl(url); setScale(1); setPos({ x: 0, y: 0 });
      setResult(null); setRenderedUrl(null); setError("");
    };
    reader.readAsDataURL(file);
  };

  const reset = () => {
    setDataUrl(null); setResult(null); setRenderedUrl(null); setError("");
    setScale(1); setPos({ x: 0, y: 0 });
    if (fileRef.current) fileRef.current.value = "";
  };

  // 드래그 팬
  const onDown = (e) => { dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y }; setDragging(true); };
  const onMove = (e) => {
    if (!dragRef.current) return;
    setPos({ x: dragRef.current.ox + (e.clientX - dragRef.current.sx), y: dragRef.current.oy + (e.clientY - dragRef.current.sy) });
  };
  const onUp = () => { dragRef.current = null; setDragging(false); };

  const getInput = () => flatten(dataUrl, frameRef.current?.clientWidth || 0, scale, pos);

  const runPrompt = async () => {
    if (!dataUrl || !tool || loading) return;
    setError("");
    if (!(await ensureCanGenerate("analysis"))) return;
    setLoading("prompt"); setResult(null); setRenderedUrl(null);
    try {
      const input = await getInput();
      const r = await analyzeForQuality(input, tool);
      setResult(r); setActiveTab(0);
    } catch (e) { setError(e?.message || "분석 중 오류가 발생했습니다."); }
    finally { setLoading(""); }
  };

  const runRender = async () => {
    if (!dataUrl || loading) return;
    setError("");
    if (!(await ensureCanGenerate("image"))) return;
    setLoading("render"); setRenderedUrl(null); setResult(null);
    try {
      const input = await getInput();
      const url = await renderEnhanced(input);
      setRenderedUrl(url);
    } catch (e) { setError(e?.message || "렌더링 중 오류가 발생했습니다."); }
    finally { setLoading(""); }
  };

  const downloadRendered = () => {
    if (!renderedUrl) return;
    const a = document.createElement("a");
    a.href = renderedUrl; a.download = `quality-up_${Date.now()}.png`; a.click();
  };

  const busy = !!loading;

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "8px 4px 40px" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", color: T.text, fontFamily: "'Teko', sans-serif" }}>
          이미지 분석 → <span style={{ color: accent }}>향상 프롬프트</span> 또는 <span style={{ color: accent }}>바로 렌더링</span>
        </h2>
        <p style={{ fontSize: 13, color: T.textMuted, marginTop: 6 }}>
          배너를 올리고 크기·위치를 맞춘 뒤, 프롬프트를 생성하거나 Pro 모델로 바로 향상 렌더링하세요
        </p>
      </div>

      {/* 업로드 / 변환 프레임 */}
      {dataUrl ? (
        <div style={{ marginBottom: 18 }}>
          <div
            ref={frameRef}
            onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
            style={{
              position: "relative", width: "100%", aspectRatio: String(aspect),
              maxHeight: 360, borderRadius: 12, border: `1px solid ${T.border}`,
              background: "#0c0c12", overflow: "hidden", cursor: dragging ? "grabbing" : "grab",
            }}
          >
            <img src={dataUrl} alt="preview" draggable={false} style={{
              position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain",
              transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`, transformOrigin: "center",
              pointerEvents: "none", userSelect: "none",
            }} />
            <div style={{ position: "absolute", top: 8, left: 8, display: "flex", alignItems: "center", gap: 5, padding: "4px 8px", borderRadius: 6, background: "rgba(0,0,0,0.45)", color: "#fff", fontSize: 11, pointerEvents: "none" }}>
              <Move size={12} /> 드래그로 위치 이동
            </div>
            <button onClick={reset} style={{
              position: "absolute", top: 8, right: 8, padding: "6px 12px", borderRadius: 8,
              background: "rgba(0,0,0,0.7)", border: `1px solid ${T.border}`, color: T.text, fontSize: 12, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}><RotateCcw size={12} /> 다시 선택</button>
          </div>
          {/* 크기 / 위치 조절 */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
            <span style={{ fontSize: 12, color: T.textMuted, minWidth: 80 }}>크기 · {Math.round(scale * 100)}%</span>
            <input type="range" min={0.5} max={3} step={0.02} value={scale}
              onChange={(e) => setScale(Number(e.target.value))} style={{ flex: 1, accentColor: accent }} />
            <button onClick={() => { setScale(1); setPos({ x: 0, y: 0 }); }} style={{
              padding: "6px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent",
              color: T.textMuted, fontSize: 12, cursor: "pointer",
            }}>리셋</button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); onFile(e.dataTransfer.files?.[0]); }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          style={{
            border: `1.5px dashed ${dragOver ? accent : T.border}`, borderRadius: 16, padding: "44px 24px",
            textAlign: "center", cursor: "pointer", marginBottom: 18,
            background: dragOver ? `${accent}14` : T.surface, transition: "all .2s",
          }}
        >
          <div style={{ width: 46, height: 46, borderRadius: 12, background: T.card, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <Upload size={20} color={T.textMuted} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, color: T.text }}>배너 이미지 업로드</div>
          <div style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>클릭하거나 드래그 · PNG, JPG, WEBP</div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
      )}

      {/* 프롬프트 타겟 툴 */}
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: T.textMuted, textTransform: "uppercase", marginBottom: 8 }}>프롬프트 타겟</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
        {TOOLS.map(t => {
          const on = tool === t.key;
          return (
            <button key={t.key} onClick={() => setTool(t.key)} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderRadius: 12, cursor: "pointer",
              border: `1.5px solid ${on ? t.color : T.border}`, background: on ? `${t.color}1F` : T.surface, color: T.text, textAlign: "left",
            }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: t.color, flexShrink: 0 }} />
              <span>
                <strong style={{ fontSize: 14, fontWeight: 600, display: "block" }}>{t.label}</strong>
                <small style={{ fontSize: 11, color: T.textMuted }}>{t.sub}</small>
              </span>
            </button>
          );
        })}
      </div>

      {/* 액션 — 프롬프트 생성 / 바로 렌더링 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <button onClick={runPrompt} disabled={!dataUrl || !tool || busy} style={actionStyle(T, accent, !dataUrl || !tool || busy, false)}>
          <Sparkles size={16} /> {loading === "prompt" ? "분석 중..." : "프롬프트 생성"}
        </button>
        <button onClick={runRender} disabled={!dataUrl || busy} style={actionStyle(T, accent, !dataUrl || busy, true)}>
          <Wand2 size={16} /> {loading === "render" ? "렌더링 중..." : "바로 렌더링 (Pro)"}
        </button>
      </div>
      {!tool && dataUrl && <div style={{ fontSize: 11, color: T.textDim, marginTop: 6 }}>프롬프트 생성은 타겟 툴 선택 필요 · 렌더링은 바로 가능</div>}

      {error && (
        <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 10, fontSize: 13, color: "#f87171", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
          오류: {error}
        </div>
      )}

      {/* 렌더 결과 */}
      {renderedUrl && (
        <div style={{ marginTop: 30 }}>
          <SectionLabel T={T}>향상 렌더링 결과 (Pro)</SectionLabel>
          <img src={renderedUrl} alt="rendered" style={{ width: "100%", borderRadius: 12, border: `1px solid ${T.border}`, background: "#0c0c12" }} />
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button onClick={downloadRendered} style={{ flex: 1, padding: 11, borderRadius: 10, border: `1px solid ${accent}55`, background: `${accent}1C`, color: accent, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Download size={14} /> 다운로드 (PNG)
            </button>
            <button onClick={runRender} disabled={busy} style={{ flex: 1, padding: 11, borderRadius: 10, border: `1px solid ${T.border}`, background: "transparent", color: T.textMuted, fontSize: 13, fontWeight: 600, cursor: busy ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Wand2 size={14} /> 다시 렌더링
            </button>
          </div>
        </div>
      )}

      {/* 프롬프트 결과 */}
      {result && (
        <div style={{ marginTop: 30 }}>
          <SectionLabel T={T}>이미지 분석 결과</SectionLabel>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18, fontSize: 14, lineHeight: 1.75, color: T.text, whiteSpace: "pre-wrap", marginBottom: 22 }}>
            {result.analysis}
          </div>
          <SectionLabel T={T}>퀄리티 업 프롬프트</SectionLabel>
          {result.prompts.length > 1 && (
            <div style={{ display: "flex", gap: 6, marginBottom: 14, borderBottom: `1px solid ${T.border}`, paddingBottom: 10 }}>
              {result.prompts.map((p, i) => (
                <button key={i} onClick={() => setActiveTab(i)} style={{
                  padding: "6px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer",
                  border: `1px solid ${activeTab === i ? accent : T.border}`,
                  background: activeTab === i ? `${accent}1C` : "transparent",
                  color: activeTab === i ? accent : T.textMuted,
                }}>{p.step || `Step ${i + 1}`}</button>
              ))}
            </div>
          )}
          {result.prompts[activeTab] && <PromptBlock T={T} prompt={result.prompts[activeTab]} />}
          {result.tip && (
            <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 10, fontSize: 12.5, lineHeight: 1.6, color: accent, background: `${accent}14`, border: `1px solid ${accent}40` }}>
              💡 {result.tip}
            </div>
          )}
        </div>
      )}

      {modal}
    </div>
  );
}

function actionStyle(T, accent, disabled, filled) {
  return {
    padding: 14, borderRadius: 12, border: filled ? "none" : `1px solid ${accent}55`,
    background: disabled ? T.card : filled ? accent : `${accent}1C`,
    color: disabled ? T.textDim : filled ? "#fff" : accent,
    fontSize: 15, fontWeight: 700, fontFamily: "'Teko', sans-serif", letterSpacing: "0.01em",
    cursor: disabled ? "not-allowed" : "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  };
}

function PromptBlock({ T, prompt }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(prompt.content || "").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 6, background: T.card, color: T.textMuted, border: `1px solid ${T.border}` }}>{prompt.step}</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{prompt.title}</span>
        </div>
        <button onClick={copy} style={{
          display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer",
          border: `1px solid ${copied ? "#10b981" : T.border}`, background: T.card, color: copied ? "#10b981" : T.textMuted,
        }}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "복사됨" : "복사"}</button>
      </div>
      <div style={{ padding: 16, fontSize: 13, lineHeight: 1.8, color: T.text, whiteSpace: "pre-wrap" }}>{prompt.content}</div>
    </div>
  );
}

function SectionLabel({ T, children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: T.textMuted, textTransform: "uppercase", marginBottom: 10 }}>
      {children}
    </div>
  );
}
