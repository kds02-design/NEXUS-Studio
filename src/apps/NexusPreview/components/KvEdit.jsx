import { useRef, useState } from "react";
import { Download, FolderCheck, Gift, Layers, Loader2, RotateCcw, Sparkles, Upload, Wand2, X } from "lucide-react";
import { useUsageGate } from "../../../components/UsageGate";
import { useAuth } from "../../../context/AuthContext";
import { IMAGEN_MODELS } from "../../../lib/imagenRender";
import QualityEnhancer from "./QualityEnhancer";
import PsdImportModal from "./PsdImportModal";
import { renderBgCompose, renderBgGenerate, renderItemBundle, saveBundleToPromptArc, BUNDLE_LIGHT_OPTIONS, BUNDLE_GROUND_OPTIONS, BUNDLE_MAGIC_COLORS, BUNDLE_BG_OPTIONS, BUNDLE_LAYOUT_OPTIONS } from "../services/bgTools";
import { renderCharEnhanced, saveCharToPromptArc, resolveCharBg, CHAR_LIGHT_OPTIONS, CHAR_PARTICLE_OPTIONS, CHAR_INTENSITY_OPTIONS, CHAR_BG_OPTIONS } from "../services/characterEnhancer";
import { charSplitToBlobs, dataUrlToImageData, CHAR_SPLIT_DEFAULTS } from "../../../lib/charEffectSplit";

const DEFAULT_MODEL = "gemini-3-pro-image-preview";
const MODES = [
  { key: "quality", label: "배경 품질 개선", desc: "원본 구도는 유지하고 빛과 분위기를 개선합니다." },
  { key: "charfx", label: "캐릭터 렌더 향상", desc: "캐릭터 형태를 분석해 어울리는 빛·파티클 연출을 더합니다 (원본 99% · 얼굴 99.9% 보존)." },
  { key: "compose", label: "배경 합성", desc: "배경에 이미지나 PSD 레이어를 자연스럽게 합성합니다." },
  { key: "generate", label: "배경 생성", desc: "설명과 참고 이미지로 새로운 KV 배경을 만듭니다." },
  { key: "bundle", label: "아이템 꾸러미", desc: "아이템 이미지 여러 장을 형태 그대로 하나의 보상 꾸러미로 합성합니다." },
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
      {mode === "charfx" && <CharEnhance T={T} accent={accent} />}
      {mode === "compose" && <BgCompose T={T} accent={accent} />}
      {mode === "generate" && <BgGenerate T={T} accent={accent} />}
      {mode === "bundle" && <ItemBundle T={T} accent={accent} />}
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

// ─── 캐릭터 렌더 향상 — 형태 분석 기반 빛·파티클 연출 (원본 99% · 얼굴 99.9% 보존) ───
function CharEnhance({ T, accent }) {
  const { ensureCanGenerate, modal } = useUsageGate();
  const { user } = useAuth();
  const [source, setSource] = useState(null);
  const [light, setLight] = useState("auto");
  const [particle, setParticle] = useState("auto");
  const [intensity, setIntensity] = useState("normal");
  const [bg, setBg] = useState("auto");
  const [intent, setIntent] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [busy, setBusy] = useState(false), [result, setResult] = useState(null), [error, setError] = useState("");
  const [savedArc, setSavedArc] = useState("");
  const [splitBusy, setSplitBusy] = useState(false);
  // 자동 배경이 실제로 어떤 색으로 결정되는지 실시간 표시
  const resolvedBg = resolveCharBg(light, particle, bg);
  const resolvedBgOpt = CHAR_BG_OPTIONS.find((o) => o.key === resolvedBg);

  // 이펙트만 분리 다운로드 — 결과(블랙 배경)에서 캐릭터를 지우고 발광·파티클만 남긴
  // 스크린 블렌드용 레이어. 마스크 포지 '캐릭터+이펙트' 분리와 동일 알고리즘(lib 공용).
  const downloadFxOnly = async () => {
    if (!result || splitBusy) return;
    setSplitBusy(true); setError("");
    try {
      const data = await dataUrlToImageData(result);
      const { fxBlob } = await charSplitToBlobs(data, { bg: [0, 0, 0], ...CHAR_SPLIT_DEFAULTS });
      const url = URL.createObjectURL(fxBlob);
      const a = document.createElement("a");
      a.href = url; a.download = `char-fx_screen_${Date.now()}.png`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(e?.message || "이펙트 분리에 실패했습니다."); }
    finally { setSplitBusy(false); }
  };

  const run = async () => {
    if (!source || busy || !(await ensureCanGenerate("image"))) return;
    setBusy(true); setResult(null); setError(""); setSavedArc("");
    try {
      const url = await renderCharEnhanced(source, { modelId: model, light, particle, intensity, bg, intent });
      if (!url) throw new Error("렌더 결과가 비어 있습니다.");
      setResult(url);
      if (user?.uid) {
        setSavedArc("saving");
        try {
          await saveCharToPromptArc(url, user, { light, particle, intensity, bg, intent });
          setSavedArc("done");
        } catch (e) {
          console.error("[CharEnhance] PromptArc 저장 실패", e);
          setSavedArc("failed");
        }
      }
    } catch (e) { setError(e?.message || "캐릭터 렌더 향상 중 오류가 발생했습니다."); }
    finally { setBusy(false); }
  };

  const chip = (on) => ({ padding: "7px 12px", borderRadius: 8, border: `1px solid ${on ? accent : T.border}`, background: on ? `${accent}20` : T.surface, color: on ? accent : T.textMuted, cursor: "pointer", fontSize: 12, fontWeight: 700 });
  const optionLabel = { display: "block", fontSize: 11, fontWeight: 700, color: T.textMuted, marginBottom: 7 };

  return <div style={panelGrid}>
    <section style={{ display: "grid", gap: 14 }}>
      <Dropzone T={T} accent={accent} dataUrl={source} onFile={setSource} onClear={() => setSource(null)} title="1. 캐릭터 이미지" sub="누끼 PNG 또는 배경 포함 원본 — 형태·얼굴은 그대로 보존됩니다" />

      <div>
        <span style={optionLabel}><Sparkles size={12} /> 2. 빛 효과</span>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {CHAR_LIGHT_OPTIONS.map((o) => <button key={o.key} onClick={() => setLight(o.key)} style={chip(light === o.key)}>{o.ko}</button>)}
        </div>
      </div>

      <div>
        <span style={optionLabel}>3. 파티클</span>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {CHAR_PARTICLE_OPTIONS.map((o) => <button key={o.key} onClick={() => setParticle(o.key)} style={chip(particle === o.key)}>{o.ko}</button>)}
        </div>
        <div style={{ fontSize: 11, color: T.textDim, marginTop: 6 }}>자동을 선택하면 캐릭터의 속성·컨셉을 분석해 어울리는 연출을 스스로 고릅니다. 연출은 캐릭터 바깥에만 얹히고 얼굴에는 절대 겹치지 않아요.</div>
      </div>

      <div>
        <span style={optionLabel}>4. 연출 강도</span>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {CHAR_INTENSITY_OPTIONS.map((o) => <button key={o.key} onClick={() => setIntensity(o.key)} style={chip(intensity === o.key)}>{o.ko}</button>)}
        </div>
      </div>

      <div>
        <span style={optionLabel}>5. 배경 (누끼 작업용)</span>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {CHAR_BG_OPTIONS.map((o) => <button key={o.key} onClick={() => setBg(o.key)} style={chip(bg === o.key)}>
            {o.fill && <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: o.fill, border: "1px solid rgba(255,255,255,.3)", marginRight: 6, verticalAlign: "-1px" }} />}{o.ko}
          </button>)}
        </div>
        <div style={{ fontSize: 11, color: T.textDim, marginTop: 6 }}>
          {bg === "auto"
            ? <>선택한 연출 기준으로 <b style={{ color: accent }}>{resolvedBgOpt?.ko}</b>{resolvedBg === "black" ? " — 발광 연출은 블랙에서 이펙트 추출이 가장 깔끔해요" : " — 발광이 없는 연출은 색상 키 분리가 유리해요"} (마스크 포지 연계)</>
            : "블랙=발광 추출 · 크로마 그린=색상 키 · 원본 유지=누끼 리소스 그대로"}
        </div>
      </div>

      <label><span style={optionLabel}>추가 지시 (선택)</span><textarea value={intent} onChange={(e) => setIntent(e.target.value)} rows={3} placeholder="예: 푸른 계열의 차가운 빛으로, 파티클은 아래에서 위로 떠오르게." style={fieldStyle(T)} /></label>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
        <ModelSelect T={T} model={model} onChange={setModel} />
        <button onClick={run} disabled={!source || busy} style={primaryBtn(T, accent, !source || busy)}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />} 바로 렌더링</button>
      </div>
      {error && <div style={{ color: "#f87171", fontSize: 12 }}>{error}</div>}
      {savedArc === "saving" && <div style={{ color: T.textDim, fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}><Loader2 size={12} className="animate-spin" /> 프롬프트 아크에 저장 중…</div>}
      {savedArc === "done" && <div style={{ color: accent, fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}><FolderCheck size={13} /> 프롬프트 아크 내 폴더에 자동 저장됐어요.</div>}
      {savedArc === "failed" && <div style={{ color: "#f87171", fontSize: 12 }}>프롬프트 아크 저장에 실패했어요 (렌더 결과는 유지됩니다).</div>}

      {result && (
        <div style={{ display: "grid", gap: 6, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, background: T.card }}>
          <button onClick={downloadFxOnly} disabled={splitBusy || resolvedBg !== "black"} style={{ ...secondaryBtn(T, accent), opacity: (splitBusy || resolvedBg !== "black") ? 0.5 : 1 }}>
            {splitBusy ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} 이펙트만 PNG (스크린 블렌드용)
          </button>
          <div style={{ fontSize: 11, color: T.textDim, lineHeight: 1.6 }}>
            {resolvedBg === "black"
              ? "결과에서 캐릭터를 지우고 발광·파티클만 남긴 레이어예요. Figma/포토샵에서 블렌드 '스크린'으로 얹으면 밝은 배경에서도 정확합니다. 캐릭터 자체 누끼는 마스크 포지의 '캐릭터+이펙트' 모드로."
              : "이펙트 분리는 블랙 배경 결과에서만 가능해요 — 배경을 자동 또는 블랙으로 렌더하세요."}
          </div>
        </div>
      )}
    </section>
    <ResultView T={T} accent={accent} url={result} busy={busy} onRetry={run} filePrefix="char-enhance" />
    {modal}
  </div>;
}

// ─── 아이템 꾸러미 제작 — 아이템 N장 → 형태 보존 클러스터 합성 ───
const BUNDLE_MAX = 8;
function ItemBundle({ T, accent }) {
  const { ensureCanGenerate, modal } = useUsageGate();
  const { user } = useAuth();
  const fileRef = useRef(null);
  const [items, setItems] = useState([]); // dataURL[]
  const [light, setLight] = useState("soft");
  const [ground, setGround] = useState("magic");
  const [magicColor, setMagicColor] = useState("purple");
  const [bg, setBg] = useState("black");
  const [layout, setLayout] = useState("normal");
  const [intent, setIntent] = useState("");
  const [size, setSize] = useState("2K");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [busy, setBusy] = useState(false), [result, setResult] = useState(null), [error, setError] = useState("");
  const [over, setOver] = useState(false);
  const [savedArc, setSavedArc] = useState(""); // "" | "saving" | "done" | "failed"

  const addFiles = (fileList) => {
    const files = [...(fileList || [])].filter((f) => f.type?.startsWith("image/"));
    if (!files.length) return;
    files.slice(0, BUNDLE_MAX).forEach((f) => {
      const reader = new FileReader();
      reader.onload = (e) => setItems((prev) => (prev.length >= BUNDLE_MAX ? prev : [...prev, e.target.result]));
      reader.readAsDataURL(f);
    });
  };
  const removeItem = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const run = async () => {
    if (items.length < 2 || busy || !(await ensureCanGenerate("image"))) return;
    setBusy(true); setResult(null); setError(""); setSavedArc("");
    try {
      const url = await renderItemBundle(items, { light, ground, magicColor, bg, layout, intent, imageSize: size, modelId: model });
      if (!url) throw new Error("렌더 결과가 비어 있습니다.");
      setResult(url);
      // 렌더 완료 즉시 PromptArc 내 폴더에 자동 저장 — 실패해도 렌더 결과는 유지.
      if (user?.uid) {
        setSavedArc("saving");
        try {
          await saveBundleToPromptArc(url, user, { light, ground, magicColor, bg, layout, intent, itemCount: items.length });
          setSavedArc("done");
        } catch (e) {
          console.error("[ItemBundle] PromptArc 저장 실패", e);
          setSavedArc("failed");
        }
      }
    } catch (e) { setError(e?.message || "꾸러미 합성 중 오류가 발생했습니다."); }
    finally { setBusy(false); }
  };

  const chip = (on) => ({ padding: "7px 12px", borderRadius: 8, border: `1px solid ${on ? accent : T.border}`, background: on ? `${accent}20` : T.surface, color: on ? accent : T.textMuted, cursor: "pointer", fontSize: 12, fontWeight: 700 });
  const optionLabel = { display: "block", fontSize: 11, fontWeight: 700, color: T.textMuted, marginBottom: 7 };

  return <div style={panelGrid}>
    <section style={{ display: "grid", gap: 14 }}>
      {/* 멀티 업로드 */}
      <div>
        <span style={optionLabel}><Gift size={12} /> 1. 아이템 이미지 ({items.length}/{BUNDLE_MAX}) — 2장 이상, 배경 없는 PNG 권장</span>
        {items.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(86px, 1fr))", gap: 8, marginBottom: 8 }}>
            {items.map((url, i) => (
              <div key={i} style={{ position: "relative", aspectRatio: "1", borderRadius: 10, border: `1px solid ${T.border}`, background: "#0b0c10", overflow: "hidden", display: "grid", placeItems: "center" }}>
                <img src={url} alt={`아이템 ${i + 1}`} style={{ maxWidth: "92%", maxHeight: "92%", objectFit: "contain" }} />
                <button onClick={() => removeItem(i)} aria-label="아이템 제거" style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: 6, background: "rgba(0,0,0,.75)", border: `1px solid ${T.border}`, color: T.text, cursor: "pointer", display: "grid", placeItems: "center", padding: 0 }}><X size={11} /></button>
              </div>
            ))}
          </div>
        )}
        {items.length < BUNDLE_MAX && (
          <div onClick={() => fileRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); setOver(false); addFiles(e.dataTransfer.files); }}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
            style={{ minHeight: items.length ? 64 : 130, display: "grid", placeItems: "center", textAlign: "center", border: `1.5px dashed ${over ? accent : T.border}`, borderRadius: 12, padding: 14, background: over ? `${accent}14` : T.surface, cursor: "pointer", boxSizing: "border-box" }}>
            <div><Upload size={18} color={accent} /><div style={{ marginTop: 6, color: T.text, fontSize: 12.5, fontWeight: 700 }}>{items.length ? "아이템 추가" : "아이템 이미지들을 올려놓으세요"}</div><div style={{ marginTop: 3, color: T.textMuted, fontSize: 11 }}>여러 장 동시 선택 가능 · 클릭 또는 드래그</div></div>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          </div>
        )}
      </div>

      {/* 배치 밀도 */}
      <div>
        <span style={optionLabel}>2. 배치</span>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {BUNDLE_LAYOUT_OPTIONS.map((o) => <button key={o.key} onClick={() => setLayout(o.key)} style={chip(layout === o.key)}>{o.ko}</button>)}
        </div>
        <div style={{ fontSize: 11, color: T.textDim, marginTop: 6 }}>기본=각 아이템이 또렷하게 · 좁게=조금씩 겹치며 한 덩어리로</div>
      </div>

      {/* 빛효과 */}
      <div>
        <span style={optionLabel}><Sparkles size={12} /> 3. 빛효과</span>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {BUNDLE_LIGHT_OPTIONS.map((o) => <button key={o.key} onClick={() => setLight(o.key)} style={chip(light === o.key)}>{o.ko}</button>)}
        </div>
      </div>

      {/* 바닥 이펙트 */}
      <div>
        <span style={optionLabel}>4. 바닥 이펙트</span>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {BUNDLE_GROUND_OPTIONS.map((o) => <button key={o.key} onClick={() => setGround(o.key)} style={chip(ground === o.key)}>{o.ko}</button>)}
        </div>
        {ground === "magic" && (
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 8 }}>
            {BUNDLE_MAGIC_COLORS.map((c) => <button key={c.key} onClick={() => setMagicColor(c.key)} style={chip(magicColor === c.key)}>{c.ko}</button>)}
          </div>
        )}
      </div>

      {/* 배경 — 누끼 방식에 맞춰 선택 */}
      <div>
        <span style={optionLabel}>5. 배경 (누끼 작업용)</span>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {BUNDLE_BG_OPTIONS.map((o) => <button key={o.key} onClick={() => setBg(o.key)} style={chip(bg === o.key)}><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: o.fill, border: "1px solid rgba(255,255,255,.3)", marginRight: 6, verticalAlign: "-1px" }} />{o.ko}</button>)}
        </div>
        <div style={{ fontSize: 11, color: T.textDim, marginTop: 6 }}>블랙=발광 추출 · 크로마 그린=색상 키 추출 (마스크 포지의 이펙트/색상 키 모드와 짝) · 화이트=레퍼런스 스타일</div>
      </div>

      <label><span style={optionLabel}>추가 지시 (선택)</span><textarea value={intent} onChange={(e) => setIntent(e.target.value)} rows={3} placeholder="예: 보물상자만 1.5배 크게 키워서 중심으로, 카드는 앞줄에 세워줘." style={fieldStyle(T)} /></label>

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{["2K", "4K"].map((v) => <button key={v} onClick={() => setSize(v)} style={chip(size === v)}>{v}</button>)}</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
        <ModelSelect T={T} model={model} onChange={setModel} />
        <button onClick={run} disabled={items.length < 2 || busy} style={primaryBtn(T, accent, items.length < 2 || busy)}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Gift size={15} />} 꾸러미 렌더링</button>
      </div>
      {items.length === 1 && <div style={{ color: T.textDim, fontSize: 12 }}>꾸러미 합성에는 아이템이 2장 이상 필요해요.</div>}
      {error && <div style={{ color: "#f87171", fontSize: 12 }}>{error}</div>}
      {savedArc === "saving" && <div style={{ color: T.textDim, fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}><Loader2 size={12} className="animate-spin" /> 프롬프트 아크에 저장 중…</div>}
      {savedArc === "done" && <div style={{ color: accent, fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}><FolderCheck size={13} /> 프롬프트 아크 내 폴더에 자동 저장됐어요.</div>}
      {savedArc === "failed" && <div style={{ color: "#f87171", fontSize: 12 }}>프롬프트 아크 저장에 실패했어요 (렌더 결과는 유지됩니다).</div>}
    </section>
    <ResultView T={T} accent={accent} url={result} busy={busy} onRetry={run} filePrefix="item-bundle" />
    {modal}
  </div>;
}

const ASPECTS = ["16:9", "21:9", "4:3"];
function BgGenerate({ T, accent }) {
  const { ensureCanGenerate, modal } = useUsageGate();
  const [concept, setConcept] = useState(""), [refUrl, setRefUrl] = useState(null), [aspect, setAspect] = useState("16:9"), [size, setSize] = useState("2K"), [model, setModel] = useState(DEFAULT_MODEL), [busy, setBusy] = useState(false), [result, setResult] = useState(null), [error, setError] = useState("");
  const run = async () => { if (!concept.trim() || busy || !(await ensureCanGenerate("image"))) return; setBusy(true); setResult(null); setError(""); try { const url = await renderBgGenerate(concept, refUrl, { aspectRatio: aspect, imageSize: size, modelId: model }); if (!url) throw new Error("렌더 결과가 비어 있습니다."); setResult(url); } catch (e) { setError(e?.message || "생성 중 오류가 발생했습니다."); } finally { setBusy(false); } };
  const chip = (on) => ({ padding: "7px 12px", borderRadius: 8, border: `1px solid ${on ? accent : T.border}`, background: on ? `${accent}20` : T.surface, color: on ? accent : T.textMuted, cursor: "pointer" });
  return <div style={panelGrid}><section style={{ display: "grid", gap: 14 }}><label><span style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.textMuted, marginBottom: 7 }}>배경 콘셉트</span><textarea value={concept} onChange={(e) => setConcept(e.target.value)} rows={5} placeholder="예: 어두운 중세 성채, 중앙은 타이틀을 위한 여백, 좌우에 푸른 마법광." style={fieldStyle(T)} /></label><Dropzone T={T} accent={accent} dataUrl={refUrl} onFile={setRefUrl} onClear={() => setRefUrl(null)} title="참고 이미지 (선택)" /><div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{ASPECTS.map((v) => <button key={v} onClick={() => setAspect(v)} style={chip(aspect === v)}>{v}</button>)}{["2K", "4K"].map((v) => <button key={v} onClick={() => setSize(v)} style={chip(size === v)}>{v}</button>)}</div><div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}><ModelSelect T={T} model={model} onChange={setModel} /><button onClick={run} disabled={!concept.trim() || busy} style={primaryBtn(T, accent, !concept.trim() || busy)}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} 바로 렌더링</button></div>{error && <div style={{ color: "#f87171", fontSize: 12 }}>{error}</div>}</section><ResultView T={T} accent={accent} url={result} busy={busy} onRetry={run} filePrefix="kv-background" />{modal}</div>;
}
