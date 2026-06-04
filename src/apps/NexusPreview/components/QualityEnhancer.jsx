// 퀄리티 업 — 배너 업로드 → Gemini 분석으로 향상 프롬프트 생성 OR Pro 이미지 모델로 바로 렌더링.
// 분석 호출 전 ensureCanGenerate("analysis"), 렌더 호출 전 ensureCanGenerate("image") (프로젝트 규약).
// 업로드 이미지의 크기·위치 변형은 제거 — 원본을 그대로 모델에 전달해 비율 어긋남을 방지.
import { useRef, useState } from "react";
import { Upload, Sparkles, Copy, Check, RotateCcw, Wand2, Download, Plus } from "lucide-react";
import { useUsageGate } from "../../../components/UsageGate";
import { analyzeForQuality, renderEnhanced } from "../services/qualityEnhancer";

const TOOLS = [
  { key: "gemini", label: "Gemini", sub: "Imagen / Nano Banana", color: "#8b5cf6" },
  { key: "gpt", label: "ChatGPT", sub: "GPT-4o 이미지 편집", color: "#10b981" },
];

export default function QualityEnhancer({ T, accent }) {
  const { ensureCanGenerate, modal } = useUsageGate();
  const [dataUrl, setDataUrl] = useState(null);
  const [aspect, setAspect] = useState(16 / 9);

  const [tool, setTool] = useState(null);
  const [loading, setLoading] = useState(""); // '' | 'prompt' | 'render'
  const [result, setResult] = useState(null);     // 프롬프트 결과
  const [renderedUrl, setRenderedUrl] = useState(null); // 렌더 결과
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  // 사용자가 추가로 원하는 효과/지시 — 분석/렌더 양쪽 호출에 함께 전달.
  const [extraInstructions, setExtraInstructions] = useState("");

  const fileRef = useRef(null);

  const onFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target.result;
      const probe = new Image();
      probe.onload = () => setAspect(probe.naturalWidth / probe.naturalHeight || 16 / 9);
      probe.src = url;
      setDataUrl(url);
      setResult(null); setRenderedUrl(null); setError("");
    };
    reader.readAsDataURL(file);
  };

  const reset = () => {
    setDataUrl(null); setResult(null); setRenderedUrl(null); setError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  // 입력은 업로드된 원본 그대로 — 비율/내용 손상 없이 모델에 전달.
  const getInput = () => Promise.resolve(dataUrl);

  const runPrompt = async () => {
    if (!dataUrl || !tool || loading) return;
    setError("");
    if (!(await ensureCanGenerate("analysis"))) return;
    setLoading("prompt"); setResult(null); setRenderedUrl(null);
    try {
      const input = await getInput();
      const r = await analyzeForQuality(input, tool, extraInstructions);
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
      const url = await renderEnhanced(input, undefined, extraInstructions);
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

      {/* 업로드 미리보기 — 원본 그대로 표시. 크기·위치 조절 UI 제거 (비율 어긋남 방지). */}
      {dataUrl ? (
        <div style={{ marginBottom: 18 }}>
          <div style={{
            position: "relative", width: "100%", aspectRatio: String(aspect),
            maxHeight: 360, borderRadius: 12, border: `1px solid ${T.border}`,
            background: "#0c0c12", overflow: "hidden",
          }}>
            <img src={dataUrl} alt="preview" draggable={false} style={{
              position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain",
              pointerEvents: "none", userSelect: "none",
            }} />
            <button onClick={reset} style={{
              position: "absolute", top: 8, right: 8, padding: "6px 12px", borderRadius: 8,
              background: "rgba(0,0,0,0.7)", border: `1px solid ${T.border}`, color: T.text, fontSize: 12, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}><RotateCcw size={12} /> 다시 선택</button>
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

      {/* 사용자 추가 지시 — 분석/렌더 양쪽에 동일 텍스트가 추가 요청으로 합쳐짐.
          단, [절대 유지]·[얼굴 변형 금지] 등 핵심 정책과 충돌 시 정책이 우선. */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: T.textMuted, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={12} /> 추가 효과 / 지시 (선택)
          </div>
          {extraInstructions && (
            <button onClick={() => setExtraInstructions("")} style={{ fontSize: 11, color: T.textDim, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
              지우기
            </button>
          )}
        </div>
        <textarea
          value={extraInstructions}
          onChange={(e) => setExtraInstructions(e.target.value)}
          placeholder={"예) 배경에 차가운 푸른 안개를 살짝 깔아주세요\n예) 타이틀에 메탈릭 광택과 림라이트를 더해 배경 톤에 어울리게 (형태는 그대로)\n예) 캐릭터 갑옷의 금속 반사를 더 강하게"}
          rows={3}
          style={{
            width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${T.border}`,
            background: T.surface, color: T.text, fontSize: 13, lineHeight: 1.5, resize: "vertical",
            fontFamily: "inherit", outline: "none", boxSizing: "border-box",
          }}
        />
        <div style={{ fontSize: 11, color: T.textDim, marginTop: 6 }}>
          * 추가 지시 안에 ★<b>얼굴 인상</b>(생김새/표정/연령) / 타이틀 <b>형태</b>(글자·자형·실루엣) /
          <b>구도·레이아웃·색상 계열</b> / <b>가장자리 그라데이션 채움</b>★ 변경 요청이 있어도
          <b>자동으로 무시되고 핵심 정책이 무조건 우선</b>합니다.
          타이틀 <b>질감/마감</b>(메탈릭·반사·글로우·림라이트 등)은 배경과 어울리게 조정 가능하며,
          타이틀은 항상 <b>시각적 HERO</b>(1차 focal point)로 가장 돋보이게 강조됩니다.
        </div>
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
