import { useRef, useState } from "react";
import { Download, Layers, Loader2, RotateCcw, Sparkles, Upload, Wand2 } from "lucide-react";
import { useUsageGate } from "../../../components/UsageGate";
import { IMAGEN_MODELS } from "../../../lib/imagenRender";
import QualityEnhancer from "./QualityEnhancer";
import PsdImportModal from "./PsdImportModal";
import { renderBgCompose, renderBgGenerate } from "../services/bgTools";

const DEFAULT_MODEL = "gemini-3-pro-image-preview";
const MODES = [
  { key: "quality", label: "배경 품질 개선", desc: "원본 구도는 유지하고 빛과 분위기를 개선합니다." },
  { key: "compose", label: "배경 합성", desc: "배경에 이미지나 PSD 레이어를 자연스럽게 합성합니다." },
  { key: "generate", label: "배경 생성", desc: "설명과 참고 이미지로 새로운 KV 배경을 만듭니다." },
];

export default function KvEdit({ T, accent }) {
  const [mode, setMode] = useState("quality");
  return (
    <div style={{ width: "100%", padding: "clamp(14px, 2vw, 28px)", boxSizing: "border-box" }}>
      <div style={{ display: "flex", gap: 4, overflowX: "auto", background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 4, width: "fit-content", maxWidth: "100%" }}>
        {MODES.map((m) => <button key={m.key} onClick={() => setMode(m.key)} style={{ padding: "9px 16px", borderRadius: 7, border: `1px solid ${mode === m.key ? accent : "transparent"}`, background: mode === m.key ? `${accent}20` : "transparent", color: mode === m.key ? accent : T.textDim, fontSize: 12, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>{m.label}</button>)}
      </div>
      <div style={{ fontSize: 12, color: T.textDim, margin: "8px 0 18px" }}>{MODES.find((m) => m.key === mode)?.desc}</div>
      {mode === "quality" && <QualityEnhancer T={T} accent={accent} />}
      {mode === "compose" && <BgCompose T={T} accent={accent} />}
      {mode === "generate" && <BgGenerate T={T} accent={accent} />}
    </div>
  );
}

function ModelSelect({ T, model, onChange }) {
  return <label style={{ display: "grid", gap: 6, flex: "1 1 220px" }}><span style={{ fontSize: 11, fontWeight: 700, color: T.textMuted }}>Gemini 이미지 모델</span><select value={model} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", padding: "11px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.surface, color: T.text, fontSize: 12 }}>{IMAGEN_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>;
}

function Dropzone({ T, accent, dataUrl, onFile, onClear, title, sub, accept = "image/*", onRawFile }) {
  const fileRef = useRef(null);
  const [over, setOver] = useState(false);
  const read = (file) => {
    if (!file) return;
    if (onRawFile?.(file) === true) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => onFile(e.target.result);
    reader.readAsDataURL(file);
  };
  if (dataUrl) return <div style={{ position: "relative", minHeight: 150, borderRadius: 12, border: `1px solid ${T.border}`, background: "#0b0c10", overflow: "hidden", display: "grid", placeItems: "center" }}><img src={dataUrl} alt="업로드 미리보기" style={{ maxWidth: "100%", maxHeight: 280, objectFit: "contain" }} /><button onClick={onClear} style={{ position: "absolute", top: 8, right: 8, padding: "6px 10px", borderRadius: 7, background: "rgba(0,0,0,.75)", border: `1px solid ${T.border}`, color: T.text, cursor: "pointer" }}><RotateCcw size={12} /> 다시 선택</button></div>;
  return <div onClick={() => fileRef.current?.click()} onDrop={(e) => { e.preventDefault(); setOver(false); read(e.dataTransfer.files?.[0]); }} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} style={{ minHeight: 150, display: "grid", placeItems: "center", textAlign: "center", border: `1.5px dashed ${over ? accent : T.border}`, borderRadius: 12, padding: 20, background: over ? `${accent}14` : T.surface, cursor: "pointer", boxSizing: "border-box" }}><div><Upload size={20} color={accent} /><div style={{ marginTop: 8, color: T.text, fontSize: 13, fontWeight: 700 }}>{title}</div><div style={{ marginTop: 4, color: T.textMuted, fontSize: 11 }}>{sub || "클릭하거나 파일을 끌어 놓으세요"}</div></div><input ref={fileRef} type="file" accept={accept} hidden onChange={(e) => read(e.target.files?.[0])} /></div>;
}

function ResultView({ T, accent, url, busy, onRetry, filePrefix }) {
  const download = () => { const a = document.createElement("a"); a.href = url; a.download = `${filePrefix}_${Date.now()}.png`; a.click(); };
  return <section style={{ minHeight: 430, border: `1px solid ${T.border}`, background: T.surface, borderRadius: 14, padding: 16, boxSizing: "border-box" }}><div style={{ fontSize: 11, fontWeight: 800, color: T.textMuted, marginBottom: 12 }}>렌더 결과</div>{url ? <><img src={url} alt="렌더 결과" style={{ width: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: 10, background: "#08090b" }} /><div style={{ display: "flex", gap: 8, marginTop: 12 }}><button onClick={download} style={secondaryBtn(T, accent)}><Download size={14} /> PNG 다운로드</button><button onClick={onRetry} disabled={busy} style={secondaryBtn(T, accent)}><Wand2 size={14} /> 다시 렌더링</button></div></> : <div style={{ minHeight: 350, display: "grid", placeItems: "center", color: T.textDim, fontSize: 13, border: `1px dashed ${T.border}`, borderRadius: 10 }}>{busy ? <><Loader2 className="animate-spin" size={22} /> 렌더링 중...</> : "왼쪽에서 설정한 뒤 바로 렌더링하세요."}</div>}</section>;
}

const panelGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", gap: 18, alignItems: "start" };
const fieldStyle = (T) => ({ width: "100%", padding: "11px 13px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface, color: T.text, fontSize: 13, lineHeight: 1.6, resize: "vertical", boxSizing: "border-box" });
const primaryBtn = (T, accent, disabled) => ({ flex: "1 1 230px", padding: 13, borderRadius: 10, border: 0, background: disabled ? T.card : accent, color: disabled ? T.textDim : "#061b1d", fontWeight: 900, cursor: disabled ? "not-allowed" : "pointer", display: "flex", gap: 8, alignItems: "center", justifyContent: "center" });
const secondaryBtn = (T, accent) => ({ flex: 1, padding: 10, borderRadius: 9, border: `1px solid ${accent}55`, background: `${accent}12`, color: accent, cursor: "pointer", display: "flex", gap: 6, alignItems: "center", justifyContent: "center" });

function BgCompose({ T, accent }) {
  const { ensureCanGenerate, modal } = useUsageGate();
  const [background, setBackground] = useState(null), [asset, setAsset] = useState(null), [psdFile, setPsdFile] = useState(null);
  const [intent, setIntent] = useState(""), [model, setModel] = useState(DEFAULT_MODEL), [busy, setBusy] = useState(false), [result, setResult] = useState(null), [error, setError] = useState("");
  const handleAssetFile = (file) => { if (/\.psd$/i.test(file?.name || "") || file?.type === "image/vnd.adobe.photoshop") { setPsdFile(file); return true; } return false; };
  const run = async () => { if (!background || !intent.trim() || busy || !(await ensureCanGenerate("image"))) return; setBusy(true); setResult(null); setError(""); try { const url = await renderBgCompose(background, intent, asset, model); if (!url) throw new Error("렌더 결과가 비어 있습니다."); setResult(url); } catch (e) { setError(e?.message || "합성 중 오류가 발생했습니다."); } finally { setBusy(false); } };
  return <div style={panelGrid}><section style={{ display: "grid", gap: 14 }}><Dropzone T={T} accent={accent} dataUrl={background} onFile={setBackground} onClear={() => setBackground(null)} title="1. 배경 이미지" sub="합성의 기준이 되는 KV 배경" /><Dropzone T={T} accent={accent} dataUrl={asset} onFile={setAsset} onClear={() => setAsset(null)} onRawFile={handleAssetFile} accept="image/*,.psd" title="2. 합성할 이미지 또는 PSD" sub="PNG·JPG·WEBP·PSD (PSD는 레이어 선택 가능)" /><label><span style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.textMuted, marginBottom: 7 }}><Layers size={12} /> 합성 위치와 방식</span><textarea value={intent} onChange={(e) => setIntent(e.target.value)} rows={4} placeholder="예: 업로드한 캐릭터를 오른쪽에 배치하고 배경 조명과 그림자를 자연스럽게 맞춰줘." style={fieldStyle(T)} /></label><div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}><ModelSelect T={T} model={model} onChange={setModel} /><button onClick={run} disabled={!background || !intent.trim() || busy} style={primaryBtn(T, accent, !background || !intent.trim() || busy)}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />} 바로 렌더링</button></div>{error && <div style={{ color: "#f87171", fontSize: 12 }}>{error}</div>}</section><ResultView T={T} accent={accent} url={result} busy={busy} onRetry={run} filePrefix="kv-compose" />{psdFile && <PsdImportModal T={T} accent={accent} file={psdFile} slots={[{ id: "composeAsset", t: "합성 이미지로 사용" }]} onClose={() => setPsdFile(null)} onAdd={(_, url) => { setAsset(url); setPsdFile(null); }} />}{modal}</div>;
}

const ASPECTS = ["16:9", "21:9", "4:3"];
function BgGenerate({ T, accent }) {
  const { ensureCanGenerate, modal } = useUsageGate();
  const [concept, setConcept] = useState(""), [refUrl, setRefUrl] = useState(null), [aspect, setAspect] = useState("16:9"), [size, setSize] = useState("2K"), [model, setModel] = useState(DEFAULT_MODEL), [busy, setBusy] = useState(false), [result, setResult] = useState(null), [error, setError] = useState("");
  const run = async () => { if (!concept.trim() || busy || !(await ensureCanGenerate("image"))) return; setBusy(true); setResult(null); setError(""); try { const url = await renderBgGenerate(concept, refUrl, { aspectRatio: aspect, imageSize: size, modelId: model }); if (!url) throw new Error("렌더 결과가 비어 있습니다."); setResult(url); } catch (e) { setError(e?.message || "생성 중 오류가 발생했습니다."); } finally { setBusy(false); } };
  const chip = (on) => ({ padding: "7px 12px", borderRadius: 8, border: `1px solid ${on ? accent : T.border}`, background: on ? `${accent}20` : T.surface, color: on ? accent : T.textMuted, cursor: "pointer" });
  return <div style={panelGrid}><section style={{ display: "grid", gap: 14 }}><label><span style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.textMuted, marginBottom: 7 }}>배경 콘셉트</span><textarea value={concept} onChange={(e) => setConcept(e.target.value)} rows={5} placeholder="예: 어두운 중세 성채, 중앙은 타이틀을 위한 여백, 좌우에 푸른 마법광." style={fieldStyle(T)} /></label><Dropzone T={T} accent={accent} dataUrl={refUrl} onFile={setRefUrl} onClear={() => setRefUrl(null)} title="참고 이미지 (선택)" /><div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{ASPECTS.map((v) => <button key={v} onClick={() => setAspect(v)} style={chip(aspect === v)}>{v}</button>)}{["2K", "4K"].map((v) => <button key={v} onClick={() => setSize(v)} style={chip(size === v)}>{v}</button>)}</div><div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}><ModelSelect T={T} model={model} onChange={setModel} /><button onClick={run} disabled={!concept.trim() || busy} style={primaryBtn(T, accent, !concept.trim() || busy)}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} 바로 렌더링</button></div>{error && <div style={{ color: "#f87171", fontSize: 12 }}>{error}</div>}</section><ResultView T={T} accent={accent} url={result} busy={busy} onRetry={run} filePrefix="kv-background" />{modal}</div>;
}
