import { useRef, useState } from "react";
import { Download, FolderCheck, Gift, Layers, Loader2, Orbit, RotateCcw, Sparkles, Type, Upload, Wand2, X } from "lucide-react";
import { useUsageGate } from "../../../components/UsageGate";
import { useAuth } from "../../../context/AuthContext";
import { useGlobal } from "../../../context/GlobalContext";
import { IMAGEN_MODELS } from "../../../lib/imagenRender";
import { transparentForSave } from "../../../lib/saveTransparent";
import QualityEnhancer from "./QualityEnhancer";
import PsdImportModal from "./PsdImportModal";
import { renderBgCompose, renderBgGenerate, renderItemBundle, saveBundleToPromptArc, BUNDLE_LIGHT_OPTIONS, BUNDLE_BG_OPTIONS, BUNDLE_LAYOUT_OPTIONS, renderFloatingItems, saveFloatingToPromptArc, FLOATING_OUTPUT_OPTIONS, FLOATING_EFFECT_OPTIONS, FLOATING_FORM_OPTIONS, FLOATING_LAYOUT_OPTIONS, FLOATING_GROUP_OPTIONS, FLOATING_COLORS, FLOATING_INTENSITY_OPTIONS, FLOATING_MOTION_OPTIONS, FLOATING_DENSITY_OPTIONS, resolveFloatingGroupPlan } from "../services/bgTools";
import { colorKeyToTransparentPng } from "../../../lib/colorKeyExtract";
import { renderCharEnhanced, saveCharToPromptArc, resolveCharBg, CHAR_LIGHT_OPTIONS, CHAR_PARTICLE_OPTIONS, CHAR_INTENSITY_OPTIONS, CHAR_BG_OPTIONS } from "../services/characterEnhancer";
import { renderTitleEffect, saveTitleToPromptArc, TITLE_FX_EFFECTS, TITLE_FX_COLORS, TITLE_FX_DIRECTIONS, TITLE_FX_INTENSITY, TITLE_FX_BG_OPTIONS } from "../services/titleEffect";
import { charSplitToBlobs, dataUrlToImageData, CHAR_SPLIT_DEFAULTS } from "../../../lib/charEffectSplit";
import { autoPadImage } from "../../../lib/autoPadImage";
import LightFxStudio from "../../RubiconForge/components/LightFxStudio";
import { renderBundleLayers } from "../services/bundleLayers";
import { LIGHTFX_COLORS } from "../../RubiconForge/constants/lightfx";

const DEFAULT_MODEL = "gemini-3-pro-image-preview";
const MODES = [
  { key: "quality", label: "배경 품질 개선", desc: "원본 구도는 유지하고 빛과 분위기를 개선합니다." },
  { key: "charfx", label: "캐릭터 렌더 향상", desc: "캐릭터 형태를 분석해 어울리는 빛·파티클 연출을 더합니다 (원본 99% · 얼굴 99.9% 보존)." },
  { key: "titlefx", label: "타이틀 이펙트", desc: "타이틀·대형 텍스트 이미지에 속도감·서리·아우라·안개·금빛·글리치·모션블러 등을 더해 생명력을 넣습니다 (글자 철자·서체 100% 보존)." },
  { key: "compose", label: "배경 합성", desc: "배경에 이미지나 PSD 레이어를 자연스럽게 합성합니다." },
  { key: "generate", label: "배경 생성", desc: "설명과 참고 이미지로 새로운 KV 배경을 만듭니다." },
  { key: "bundle", label: "아이템 꾸러미", desc: "아이템 이미지 여러 장을 형태 그대로 하나의 보상 꾸러미로 합성합니다." },
  { key: "floating", label: "공중부양 아이템", desc: "아이템을 물방울·번개·금빛·회오리 등 원형 이펙트로 감싸 공중에 띄웁니다 (원 하나에 1개 또는 여러 개)." },
  { key: "lightfx", label: "광원·빛효과", desc: "광원·후광·파티클·빛효과를 순흑(#000000) 배경 발광 에셋으로 생성합니다 (스크린/애드 블렌드·투명 PNG 추출용)." },
];

export default function KvEdit({ T, accent, forge }) {
  const [mode, setMode] = useState("quality");
  return (
    <div style={{ width: "100%", padding: "clamp(14px, 2vw, 28px)", boxSizing: "border-box" }}>
      <div style={{ display: "flex", gap: 4, overflowX: "auto", background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 4, width: "fit-content", maxWidth: "100%" }}>
        {MODES.map((m) => <button key={m.key} onClick={() => setMode(m.key)} style={{ padding: "9px 16px", borderRadius: 7, border: `1px solid ${mode === m.key ? accent : "transparent"}`, background: mode === m.key ? `${accent}20` : "transparent", color: mode === m.key ? accent : T.textDim, fontSize: 12, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>{m.label}</button>)}
      </div>
      <div style={{ fontSize: 12, color: T.textDim, margin: "8px 0 18px" }}>{MODES.find((m) => m.key === mode)?.desc}</div>
      {mode === "quality" && <QualityEnhancer T={T} accent={accent} />}
      {mode === "charfx" && <CharEnhance T={T} accent={accent} />}
      {mode === "titlefx" && <TitleEnhance T={T} accent={accent} />}
      {mode === "compose" && <BgCompose T={T} accent={accent} />}
      {mode === "generate" && <BgGenerate T={T} accent={accent} />}
      {mode === "bundle" && <ItemBundle T={T} accent={accent} />}
      {mode === "floating" && <FloatingItems T={T} accent={accent} />}
      {mode === "lightfx" && (
        <div style={{ height: "calc(100vh - 210px)", minHeight: 520 }}>
          <LightFxStudio forge={forge} />
        </div>
      )}
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

function ResultView({ T, accent, url, busy, onRetry, filePrefix, transparentOnSave = false, alreadyTransparent = false, colorKeyBlack = false, maxW }) {
  const { navigate } = useGlobal();
  const [txBusy, setTxBusy] = useState(false);
  const [maskSrc, setMaskSrc] = useState(null); // 자동 투명화 실패 시 Mask Forge 로 보낼 원본
  const anchor = (href, suffix) => { const a = document.createElement("a"); a.href = href; a.download = `${filePrefix}${suffix}_${Date.now()}.png`; a.click(); };
  // 오브젝트 결과는 저장 시 자동 투명화. 실패(복잡 배경) 시 원본 저장 + Mask Forge 안내.
  const download = async () => {
    if (alreadyTransparent) { anchor(url, "_transparent"); return; }
    if (!transparentOnSave) { anchor(url, ""); return; }
    setTxBusy(true); setMaskSrc(null);
    // 불투명 아이템(검은 배경) → 마스크 포지 로컬 색상 키(구멍 보호). 그 외 → 배경 분석 자동 투명화.
    if (colorKeyBlack) {
      try {
        const d = await colorKeyToTransparentPng(url, { bg: [0, 0, 0] });
        anchor(d, "_transparent");
        setTxBusy(false);
        return;
      } catch (e) { console.error("[ResultView] color-key 실패 — 자동 투명화로 폴백", e); }
    }
    const { dataUrl, transparent } = await transparentForSave(url);
    anchor(dataUrl, transparent ? "_transparent" : "");
    if (!transparent) setMaskSrc(url);
    setTxBusy(false);
  };
  const toMaskForge = () => navigate("mask-forge", { source: "nexus-preview", image: { url: maskSrc || url, metadata: {} } });
  return <section style={{ minHeight: 430, border: `1px solid ${T.border}`, background: T.surface, borderRadius: 14, padding: 16, boxSizing: "border-box" }}><div style={{ fontSize: 11, fontWeight: 800, color: T.textMuted, marginBottom: 12 }}>렌더 결과{alreadyTransparent ? " · 투명 레이어 합성 완료" : transparentOnSave ? " · 저장 시 자동 투명화" : ""}</div>{url ? <><img src={url} alt="렌더 결과" style={{ width: "100%", maxWidth: maxW || "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: 10, background: "#08090b", display: "block", margin: maxW ? "0 auto" : undefined }} /><div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}><button onClick={download} disabled={txBusy} style={{ ...secondaryBtn(T, accent), opacity: txBusy ? 0.6 : 1 }}>{txBusy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} {alreadyTransparent || transparentOnSave ? "투명 PNG 저장" : "PNG 다운로드"}</button><button onClick={onRetry} disabled={busy} style={secondaryBtn(T, accent)}><Wand2 size={14} /> 다시 렌더링</button></div>{maskSrc && <div style={{ marginTop: 8, fontSize: 11, color: T.textDim }}>배경이 복잡해 원본으로 저장했어요. <button onClick={toMaskForge} style={{ color: accent, background: "none", border: 0, cursor: "pointer", fontWeight: 700, padding: 0 }}>Mask Forge에서 배경 제거 →</button></div>}</> : <div style={{ minHeight: 350, display: "grid", placeItems: "center", color: T.textDim, fontSize: 13, border: `1px dashed ${T.border}`, borderRadius: 10 }}>{busy ? <><Loader2 className="animate-spin" size={22} /> 렌더링 중...</> : "왼쪽에서 설정한 뒤 바로 렌더링하세요."}</div>}</section>;
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
    <ResultView T={T} accent={accent} url={result} busy={busy} onRetry={run} filePrefix="char-enhance" transparentOnSave />
    {modal}
  </div>;
}

// ─── 타이틀 이펙트 — 타이틀/대형 텍스트에 연출을 더해 생명력 부여 (글자 철자·서체 100% 보존) ───
function TitleEnhance({ T, accent }) {
  const { ensureCanGenerate, modal } = useUsageGate();
  const { user } = useAuth();
  const [source, setSource] = useState(null);
  const [effects, setEffects] = useState([]); // 다중 선택 — 비어 있으면 자동
  const [color, setColor] = useState("auto");
  const [direction, setDirection] = useState("auto");
  const [intensity, setIntensity] = useState("normal");
  const [bg, setBg] = useState("keep");
  const [intent, setIntent] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [busy, setBusy] = useState(false), [result, setResult] = useState(null), [error, setError] = useState("");
  const [savedArc, setSavedArc] = useState("");
  // 여백 자동 확장 — 상하좌우 여백이 없는 타이틀에 가상 공간을 만들어 이펙트가 잘리지 않게.
  const [autoPad, setAutoPad] = useState(true);
  const [padded, setPadded] = useState(false); // 실제로 여백이 추가됐는지(안내 표시용)

  const toggleEffect = (key) => setEffects((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  // 업로드된 타이틀에 여백 자동 확장 적용. 이미 여백이 충분하거나 CORS 실패 시엔 원본 그대로.
  const applySource = async (dataUrl) => {
    if (!autoPad) { setSource(dataUrl); setPadded(false); return; }
    try {
      const { padded: didPad, dataUrl: out } = await autoPadImage(dataUrl, { targetMargin: 0.28 });
      setSource(out || dataUrl);
      setPadded(!!didPad);
    } catch {
      setSource(dataUrl);
      setPadded(false);
    }
  };
  const clearSource = () => { setSource(null); setPadded(false); };

  const run = async () => {
    if (!source || busy || !(await ensureCanGenerate("image"))) return;
    setBusy(true); setResult(null); setError(""); setSavedArc("");
    try {
      const url = await renderTitleEffect(source, { modelId: model, effects, color, direction, intensity, bg, intent });
      if (!url) throw new Error("렌더 결과가 비어 있습니다.");
      setResult(url);
      if (user?.uid) {
        setSavedArc("saving");
        try {
          await saveTitleToPromptArc(url, user, { effects, color, direction, intensity, bg, intent });
          setSavedArc("done");
        } catch (e) {
          console.error("[TitleEnhance] PromptArc 저장 실패", e);
          setSavedArc("failed");
        }
      }
    } catch (e) { setError(e?.message || "타이틀 이펙트 렌더 중 오류가 발생했습니다."); }
    finally { setBusy(false); }
  };

  const chip = (on) => ({ padding: "7px 12px", borderRadius: 8, border: `1px solid ${on ? accent : T.border}`, background: on ? `${accent}20` : T.surface, color: on ? accent : T.textMuted, cursor: "pointer", fontSize: 12, fontWeight: 700 });
  const optionLabel = { display: "block", fontSize: 11, fontWeight: 700, color: T.textMuted, marginBottom: 7 };
  // 방향은 흐름성 이펙트(속도감·모션블러)를 골랐을 때만 의미가 있어 노출.
  const showDirection = effects.length === 0 || effects.some((k) => ["speed", "blur", "spark", "shatter"].includes(k));

  return <div style={panelGrid}>
    <section style={{ display: "grid", gap: 14 }}>
      <Dropzone T={T} accent={accent} dataUrl={source} onFile={applySource} onClear={clearSource} title="1. 타이틀 이미지" sub="타이틀·로고·'COMING SOON' 등 대형 텍스트 — 글자 철자·서체는 그대로 보존됩니다" />

      {/* 여백 자동 확장 — 상하좌우 여백 없는 타이틀에 가상 공간 생성 */}
      <div>
        <button onClick={() => setAutoPad((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${autoPad ? accent : T.border}`, background: autoPad ? `${accent}14` : T.surface, cursor: "pointer", textAlign: "left" }}>
          <span style={{ width: 30, height: 18, borderRadius: 9, background: autoPad ? accent : T.border, position: "relative", flexShrink: 0, transition: "background .15s" }}>
            <span style={{ position: "absolute", top: 2, left: autoPad ? 14 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 12, fontWeight: 800, color: autoPad ? accent : T.text }}>여백 자동 확장</span>
            <span style={{ display: "block", fontSize: 11, color: T.textDim, marginTop: 2 }}>여백 없는 타이틀 주위에 가상 공간을 만들어 이펙트가 잘리지 않게 합니다</span>
          </span>
        </button>
        {padded && <div style={{ fontSize: 11, color: accent, marginTop: 6, display: "flex", gap: 6, alignItems: "center" }}><Sparkles size={12} /> 여백이 없어 이펙트 공간을 자동으로 넓혔습니다</div>}
      </div>

      <div>
        <span style={optionLabel}><Sparkles size={12} /> 2. 이펙트 (여러 개 선택 가능 · 미선택 시 자동)</span>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {TITLE_FX_EFFECTS.map((o) => <button key={o.key} onClick={() => toggleEffect(o.key)} style={chip(effects.includes(o.key))}>{o.ko}</button>)}
        </div>
        <div style={{ fontSize: 11, color: T.textDim, marginTop: 6 }}>{effects.length === 0 ? "아무것도 고르지 않으면 타이틀의 형태·컨셉을 분석해 어울리는 연출을 자동으로 조합합니다." : "선택한 연출을 조합해 글자 뒤·주변에만 얹습니다 — 글자 획은 원본이 그대로 비쳐 보입니다."}</div>
      </div>

      <div>
        <span style={optionLabel}>3. 색감</span>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {TITLE_FX_COLORS.map((o) => <button key={o.key} onClick={() => setColor(o.key)} style={chip(color === o.key)}>{o.ko}</button>)}
        </div>
      </div>

      {showDirection && (
        <div>
          <span style={optionLabel}>4. 방향 (속도감·모션블러 등)</span>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {TITLE_FX_DIRECTIONS.map((o) => <button key={o.key} onClick={() => setDirection(o.key)} style={chip(direction === o.key)}>{o.ko}</button>)}
          </div>
        </div>
      )}

      <div>
        <span style={optionLabel}>{showDirection ? "5" : "4"}. 연출 강도</span>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {TITLE_FX_INTENSITY.map((o) => <button key={o.key} onClick={() => setIntensity(o.key)} style={chip(intensity === o.key)}>{o.ko}</button>)}
        </div>
      </div>

      <div>
        <span style={optionLabel}>{showDirection ? "6" : "5"}. 배경 (누끼 작업용)</span>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {TITLE_FX_BG_OPTIONS.map((o) => <button key={o.key} onClick={() => setBg(o.key)} style={chip(bg === o.key)}>
            {o.fill && <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: o.fill, border: "1px solid rgba(255,255,255,.3)", marginRight: 6, verticalAlign: "-1px" }} />}{o.ko}
          </button>)}
        </div>
        <div style={{ fontSize: 11, color: T.textDim, marginTop: 6 }}>원본 유지=배경 그대로 · 블랙=발광 추출(스크린 블렌드) · 크로마 그린=색상 키 · 화이트=레퍼런스 (마스크 포지 연계)</div>
      </div>

      <label><span style={optionLabel}>추가 지시 (선택)</span><textarea value={intent} onChange={(e) => setIntent(e.target.value)} rows={3} placeholder="예: 글자 아래쪽으로만 냉기가 흐르고, 오른쪽 끝에서 금가루가 흩날리게." style={fieldStyle(T)} /></label>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
        <ModelSelect T={T} model={model} onChange={setModel} />
        <button onClick={run} disabled={!source || busy} style={primaryBtn(T, accent, !source || busy)}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Type size={15} />} 바로 렌더링</button>
      </div>
      {error && <div style={{ color: "#f87171", fontSize: 12 }}>{error}</div>}
      {savedArc === "saving" && <div style={{ color: T.textDim, fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}><Loader2 size={12} className="animate-spin" /> 프롬프트 아크에 저장 중…</div>}
      {savedArc === "done" && <div style={{ color: accent, fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}><FolderCheck size={13} /> 프롬프트 아크 내 폴더에 자동 저장됐어요.</div>}
      {savedArc === "failed" && <div style={{ color: "#f87171", fontSize: 12 }}>프롬프트 아크 저장에 실패했어요 (렌더 결과는 유지됩니다).</div>}
    </section>
    <ResultView T={T} accent={accent} url={result} busy={busy} onRetry={run} filePrefix="title-fx" />
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
  const [layout, setLayout] = useState("normal");
  const [intent, setIntent] = useState("");
  const [size, setSize] = useState("2K");
  const [model, setModel] = useState(DEFAULT_MODEL);
  // 바닥 이펙트는 RubiconForge 광원 효과로 이관 — 여기서는 아이템 클러스터만 렌더.
  const [busy, setBusy] = useState(false), [result, setResult] = useState(null), [error, setError] = useState("");
  const [over, setOver] = useState(false);
  const [savedArc, setSavedArc] = useState(""); // "" | "saving" | "done" | "failed"
  // 기본은 투명 레이어 자동 합성. 필요할 때 단일 이미지 또는 편집용 PSD를 선택.
  const [bundleOutput, setBundleOutput] = useState("layered-transparent");
  const psdMode = bundleOutput === "psd";
  const [fxColor, setFxColor] = useState("gold");
  const [fxLayers, setFxLayers] = useState({ back: true, ground: true, front: true });
  const [psdBusy, setPsdBusy] = useState(false), [psdResult, setPsdResult] = useState(null);
  const [psdProgress, setPsdProgress] = useState(""), [psdError, setPsdError] = useState("");

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
      // 아이템 클러스터만 — 바닥 이펙트 없이(ground=none) 순흑 배경으로. 저장 시 마스크 포지 색상 키(구멍 보호) 누끼.
      const url = await renderItemBundle(items, { light, ground: "none", bg: "black", layout, intent, imageSize: size, modelId: model });
      if (!url) throw new Error("렌더 결과가 비어 있습니다.");
      setResult(url);
      // PromptArc 자동 저장 — 실패해도 결과는 유지.
      if (user?.uid) {
        setSavedArc("saving");
        try {
          await saveBundleToPromptArc(url, user, { light, ground: "none", bg: "black", layout, intent, itemCount: items.length });
          setSavedArc("done");
        } catch (e) {
          console.error("[ItemBundle] PromptArc 저장 실패", e);
          setSavedArc("failed");
        }
      }
    } catch (e) { setError(e?.message || "꾸러미 합성 중 오류가 발생했습니다."); }
    finally { setBusy(false); }
  };

  // 4레이어 PSD 렌더 — 아이템 → 후광·바닥광·전방 이펙트 → 각 투명화 → 레이어드 .psd 조립.
  const runPsd = async () => {
    if (items.length < 2 || psdBusy || !(await ensureCanGenerate("image"))) return;
    setPsdBusy(true); setPsdResult(null); setPsdError(""); setPsdProgress("아이템 렌더 중…");
    try {
      const res = await renderBundleLayers(items, {
        layout, intent, imageSize: size, modelId: model,
        color: fxColor, backGlow: fxLayers.back, groundLight: fxLayers.ground, frontEffect: fxLayers.front,
        onProgress: setPsdProgress,
      });
      setPsdResult(res); setPsdProgress("");
    } catch (e) { setPsdError(e?.message || "레이어 렌더 중 오류가 발생했습니다."); setPsdProgress(""); }
    finally { setPsdBusy(false); }
  };
  const runTransparent = async () => {
    if (items.length < 2 || psdBusy || !(await ensureCanGenerate("image"))) return;
    setPsdBusy(true); setResult(null); setError(""); setPsdProgress("아이템 투명 레이어 렌더 중…"); setSavedArc("");
    try {
      const res = await renderBundleLayers(items, {
        layout, intent, imageSize: size, modelId: model,
        color: fxColor, backGlow: fxLayers.back, groundLight: fxLayers.ground, frontEffect: fxLayers.front,
        onProgress: setPsdProgress,
      });
      setResult(res.previewDataUrl); setPsdResult(res); setPsdProgress("");
      if (user?.uid) {
        setSavedArc("saving");
        try {
          await saveBundleToPromptArc(res.previewDataUrl, user, { light, ground: "none", bg: "transparent", layout, intent, itemCount: items.length, outputMode: "layered-transparent" });
          setSavedArc("done");
        } catch (e) { console.error("[ItemBundle] 투명 결과 PromptArc 저장 실패", e); setSavedArc("failed"); }
      }
    } catch (e) { setError(e?.message || "투명 레이어 합성 중 오류가 발생했습니다."); setPsdProgress(""); }
    finally { setPsdBusy(false); }
  };
  const downloadPsd = () => {
    if (!psdResult?.psdBlob) return;
    const url = URL.createObjectURL(psdResult.psdBlob);
    const a = document.createElement("a");
    a.href = url; a.download = `item-bundle_layered_${Date.now()}.psd`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
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

      {/* 4. 출력 방식 */}
      <div>
        <span style={optionLabel}><Layers size={12} /> 4. 출력 방식</span>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <button onClick={() => setBundleOutput("layered-transparent")} style={chip(bundleOutput === "layered-transparent")}>투명 레이어 자동 합성</button>
          <button onClick={() => setBundleOutput("flat")} style={chip(bundleOutput === "flat")}>단일 이미지</button>
          <button onClick={() => setBundleOutput("psd")} style={chip(bundleOutput === "psd")}>4레이어 PSD</button>
        </div>
        {bundleOutput !== "flat" && (
          <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
            <div style={{ fontSize: 11, color: T.textDim, lineHeight: 1.6 }}>아이템과 <strong>후광 · 바닥광 · 전방 이펙트</strong>를 각각 렌더·투명화해 같은 좌표로 합성합니다. {psdMode ? "편집 가능한 PSD도 함께 만듭니다." : "최종 RGBA 투명 PNG로 바로 내보냅니다."} (렌더 최대 4회)</div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {[["back", "후광"], ["ground", "바닥광"], ["front", "전방 이펙트"]].map(([k, ko]) => <button key={k} onClick={() => setFxLayers((s) => ({ ...s, [k]: !s[k] }))} style={chip(fxLayers[k])}>{fxLayers[k] ? "✓ " : ""}{ko}</button>)}
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {LIGHTFX_COLORS.map((c) => <button key={c.id} onClick={() => setFxColor(c.id)} style={{ ...chip(fxColor === c.id), display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: c.swatch || c.color, border: "1px solid rgba(255,255,255,.3)" }} />{c.label}</button>)}
            </div>
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, color: T.textDim, lineHeight: 1.6 }}>바닥 이펙트(마법광·연기·회오리 등)는 <strong>RubiconForge 광원 효과 → 바닥 이펙트·그라운드</strong>로 이동했어요. 여기서는 아이템 클러스터만 만들고, 바닥 이펙트는 거기서 별도로 만들어 겹쳐 쓰세요.</div>

      <label><span style={optionLabel}>추가 지시 (선택)</span><textarea value={intent} onChange={(e) => setIntent(e.target.value)} rows={3} placeholder="예: 보물상자만 1.5배 크게 키워서 중심으로, 카드는 앞줄에 세워줘." style={fieldStyle(T)} /></label>

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{["1K", "2K", "4K"].map((v) => <button key={v} onClick={() => setSize(v)} style={chip(size === v)}>{v}</button>)}</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
        <ModelSelect T={T} model={model} onChange={setModel} />
        <button onClick={psdMode ? runPsd : bundleOutput === "layered-transparent" ? runTransparent : run} disabled={items.length < 2 || busy || psdBusy} style={primaryBtn(T, accent, items.length < 2 || busy || psdBusy)}>{(busy || psdBusy) ? <Loader2 size={15} className="animate-spin" /> : (bundleOutput !== "flat" ? <Layers size={15} /> : <Gift size={15} />)} {psdMode ? "PSD 레이어 렌더" : bundleOutput === "layered-transparent" ? "투명 PNG 자동 합성" : "꾸러미 렌더링"}</button>
      </div>
      {bundleOutput !== "flat" && psdBusy && psdProgress && <div style={{ color: T.textDim, fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}><Loader2 size={12} className="animate-spin" /> {psdProgress}</div>}
      {bundleOutput !== "flat" && psdError && <div style={{ color: "#f87171", fontSize: 12 }}>{psdError}</div>}
      {items.length === 1 && <div style={{ color: T.textDim, fontSize: 12 }}>꾸러미 합성에는 아이템이 2장 이상 필요해요.</div>}
      {error && <div style={{ color: "#f87171", fontSize: 12 }}>{error}</div>}
      {savedArc === "saving" && <div style={{ color: T.textDim, fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}><Loader2 size={12} className="animate-spin" /> 프롬프트 아크에 저장 중…</div>}
      {savedArc === "done" && <div style={{ color: accent, fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}><FolderCheck size={13} /> 프롬프트 아크 내 폴더에 자동 저장됐어요.</div>}
      {savedArc === "failed" && <div style={{ color: "#f87171", fontSize: 12 }}>프롬프트 아크 저장에 실패했어요 (렌더 결과는 유지됩니다).</div>}
    </section>
    {psdMode ? (
      <section style={{ minHeight: 430, border: `1px solid ${T.border}`, background: T.surface, borderRadius: 14, padding: 16, boxSizing: "border-box" }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: T.textMuted, marginBottom: 12 }}>레이어드 PSD 결과{psdResult ? " · 포토샵에서 열면 레이어 분리됨" : ""}</div>
        {psdResult ? <>
          <img src={psdResult.previewDataUrl} alt="PSD 미리보기" style={{ width: "100%", maxWidth: 800, maxHeight: "58vh", objectFit: "contain", borderRadius: 10, background: "#08090b", display: "block", margin: "0 auto" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button onClick={downloadPsd} style={secondaryBtn(T, accent)}><Download size={14} /> PSD 다운로드</button>
            <button onClick={runPsd} disabled={psdBusy} style={secondaryBtn(T, accent)}><Wand2 size={14} /> 다시 렌더링</button>
          </div>
          <div style={{ fontSize: 10, fontWeight: 800, color: T.textMuted, margin: "14px 0 8px" }}>레이어 (아래→위)</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 8 }}>
            {[["back", "후광"], ["ground", "바닥광"], ["items", "아이템"], ["front", "전방"]].map(([k, ko]) => psdResult.layers[k] && (
              <div key={k} style={{ borderRadius: 8, border: `1px solid ${T.border}`, overflow: "hidden", background: "#0b0c10" }}>
                <div style={{ aspectRatio: "1", display: "grid", placeItems: "center", padding: 4 }}><img src={psdResult.layers[k]} alt={ko} style={{ maxWidth: "92%", maxHeight: "92%", objectFit: "contain" }} /></div>
                <div style={{ fontSize: 10, color: T.textMuted, textAlign: "center", padding: "3px 0", fontWeight: 700 }}>{ko}</div>
              </div>
            ))}
          </div>
        </> : <div style={{ minHeight: 350, display: "grid", placeItems: "center", color: T.textDim, fontSize: 13, border: `1px dashed ${T.border}`, borderRadius: 10, textAlign: "center", padding: 16 }}>{psdBusy ? <div><Loader2 className="animate-spin" size={22} /><div style={{ marginTop: 8 }}>{psdProgress || "렌더링 중…"}</div></div> : "왼쪽에서 설정한 뒤 ‘PSD 레이어 렌더’를 눌러주세요. (아이템·후광·바닥광·전방 4레이어 .psd)"}</div>}
      </section>
    ) : (
      <ResultView T={T} accent={accent} url={result} busy={busy || psdBusy} onRetry={bundleOutput === "layered-transparent" ? runTransparent : run} filePrefix="item-bundle" alreadyTransparent={bundleOutput === "layered-transparent"} transparentOnSave={bundleOutput === "flat"} colorKeyBlack={bundleOutput === "flat"} maxW={800} />
    )}
    {modal}
  </div>;
}

// ─── 공중부양 아이템 — 아이템을 원형 이펙트로 감싸 공중에 띄움 (원 하나에 1개 또는 여러 개) ───
const FLOATING_MAX = 8;
function FloatingItems({ T, accent }) {
  const { ensureCanGenerate, modal } = useUsageGate();
  const { user } = useAuth();
  const fileRef = useRef(null);
  const [items, setItems] = useState([]); // dataURL[]
  const [effect, setEffect] = useState("bubble");
  const [form, setForm] = useState("broken-orbit");
  const [layout, setLayout] = useState("each");
  const [groupMode, setGroupMode] = useState("auto");
  const [groupAssignments, setGroupAssignments] = useState([]);
  const [primaryIndex, setPrimaryIndex] = useState(0);
  const [groupConfirmed, setGroupConfirmed] = useState(false);
  const [color, setColor] = useState("auto");
  const [intensity, setIntensity] = useState("medium");
  const [motion, setMotion] = useState("clockwise");
  const [density, setDensity] = useState("medium");
  const [outputMode, setOutputMode] = useState("layered-transparent");
  const [opening, setOpening] = useState(25);
  const [frontCross, setFrontCross] = useState(10);
  const [bg, setBg] = useState("black");
  const [intent, setIntent] = useState("");
  const [size, setSize] = useState("2K");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [busy, setBusy] = useState(false), [result, setResult] = useState(null), [error, setError] = useState("");
  const [over, setOver] = useState(false);
  const [savedArc, setSavedArc] = useState("");

  const addFiles = (fileList) => {
    const files = [...(fileList || [])].filter((f) => f.type?.startsWith("image/"));
    if (!files.length) return;
    const selected = files.slice(0, Math.max(0, FLOATING_MAX - items.length));
    Promise.all(selected.map((f) => new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.onload = (e) => resolve(e.target.result); reader.onerror = reject; reader.readAsDataURL(f);
    }))).then((urls) => {
      setItems((prev) => [...prev, ...urls].slice(0, FLOATING_MAX));
      setGroupAssignments((prev) => [...prev, ...urls.map(() => "A")].slice(0, FLOATING_MAX));
      setGroupConfirmed(false);
    }).catch(() => setError("아이템 이미지를 읽지 못했습니다."));
  };
  const removeItem = (i) => {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
    setGroupAssignments((prev) => prev.filter((_, idx) => idx !== i));
    setPrimaryIndex((prev) => Math.max(0, Math.min(prev, items.length - 2)));
    setGroupConfirmed(false);
  };
  const groupPlan = resolveFloatingGroupPlan(items.length, groupMode, groupAssignments, primaryIndex);
  const groupPlanLabel = groupPlan.groups.map((g) => `${g.id}: ${g.itemIndices.map((i) => `아이템 ${i}`).join(", ")}`).join(" / ");

  const run = async () => {
    if (items.length < 1 || busy) return;
    if (groupPlan.requiresReview && !groupConfirmed) { setError("자동 그룹 제안을 확인하거나 그룹을 직접 지정해 주세요."); return; }
    if (!(await ensureCanGenerate("image"))) return;
    setBusy(true); setResult(null); setError(""); setSavedArc("");
    try {
      const url = await renderFloatingItems(items, { effect, form, layout, groupMode, groupAssignments: groupPlan.assignments, primaryIndex, color, intensity, motion, density, outputMode, opening, frontCross, bg: outputMode === "effect-only" ? "black" : bg, intent, imageSize: size, modelId: model });
      if (!url) throw new Error("렌더 결과가 비어 있습니다.");
      setResult(url);
      if (user?.uid) {
        setSavedArc("saving");
        try {
          await saveFloatingToPromptArc(url, user, { effect, form, layout, groupMode, groupAssignments: groupPlan.assignments, primaryIndex, color, intensity, motion, density, outputMode, opening, frontCross, bg: outputMode === "effect-only" ? "black" : bg, intent, itemCount: items.length });
          setSavedArc("done");
        } catch (e) {
          console.error("[FloatingItems] PromptArc 저장 실패", e);
          setSavedArc("failed");
        }
      }
    } catch (e) { setError(e?.message || "공중부양 합성 중 오류가 발생했습니다."); }
    finally { setBusy(false); }
  };

  const chip = (on) => ({ padding: "7px 12px", borderRadius: 8, border: `1px solid ${on ? accent : T.border}`, background: on ? `${accent}20` : T.surface, color: on ? accent : T.textMuted, cursor: "pointer", fontSize: 12, fontWeight: 700 });
  const optionLabel = { display: "block", fontSize: 11, fontWeight: 700, color: T.textMuted, marginBottom: 7 };

  return <div style={panelGrid}>
    <section style={{ display: "grid", gap: 14 }}>
      {/* 멀티 업로드 — 1장부터 가능 */}
      <div>
        <span style={optionLabel}><Orbit size={12} /> 1. 아이템 이미지 ({items.length}/{FLOATING_MAX}) — 1장 이상, 배경 없는 PNG 권장</span>
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
        {items.length < FLOATING_MAX && (
          <div onClick={() => fileRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); setOver(false); addFiles(e.dataTransfer.files); }}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
            style={{ minHeight: items.length ? 64 : 130, display: "grid", placeItems: "center", textAlign: "center", border: `1.5px dashed ${over ? accent : T.border}`, borderRadius: 12, padding: 14, background: over ? `${accent}14` : T.surface, cursor: "pointer", boxSizing: "border-box" }}>
            <div><Upload size={18} color={accent} /><div style={{ marginTop: 6, color: T.text, fontSize: 12.5, fontWeight: 700 }}>{items.length ? "아이템 추가" : "아이템 이미지를 올려놓으세요"}</div><div style={{ marginTop: 3, color: T.textMuted, fontSize: 11 }}>1장이면 원 하나 · 여러 장이면 배치 선택 가능</div></div>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          </div>
        )}
      </div>

      {items.length > 0 && <div>
        <span style={optionLabel}>2. 광원 묶음 방식</span>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {FLOATING_GROUP_OPTIONS.map((o) => <button key={o.key} onClick={() => { setGroupMode(o.key); setGroupConfirmed(o.key !== "auto"); }} style={chip(groupMode === o.key)}>{o.ko}</button>)}
        </div>
        {groupMode === "custom" && <div style={{ display: "grid", gap: 6, marginTop: 9 }}>
          {items.map((url, i) => <div key={i} style={{ display: "grid", gridTemplateColumns: "42px 1fr 130px", gap: 8, alignItems: "center", padding: 6, border: `1px solid ${T.border}`, borderRadius: 8 }}>
            <img src={url} alt="" style={{ width: 42, height: 42, objectFit: "contain", background: "#090a0d", borderRadius: 6 }} />
            <span style={{ fontSize: 12, color: T.text }}>아이템 {i + 1}</span>
            <select value={groupAssignments[i] || "A"} onChange={(e) => { const value = e.target.value; setGroupAssignments((prev) => Array.from({ length: items.length }, (_, idx) => idx === i ? value : (prev[idx] || "A"))); setGroupConfirmed(true); }} style={{ ...fieldStyle(T), padding: "7px 9px" }}>
              {["A","B","C","D"].map((g) => <option key={g} value={g}>그룹 {g}</option>)}
              <option value={`SOLO_${i + 1}`}>개별 광원</option>
            </select>
          </div>)}
        </div>}
        {groupMode === "primary-satellites" && <label style={{ display: "block", marginTop: 9 }}><span style={optionLabel}>중앙 핵심 아이템</span><select value={primaryIndex} onChange={(e) => { setPrimaryIndex(Number(e.target.value)); setGroupConfirmed(true); }} style={fieldStyle(T)}>{items.map((_, i) => <option key={i} value={i}>아이템 {i + 1}</option>)}</select></label>}
        <div style={{ marginTop: 8, padding: 9, borderRadius: 8, background: T.card, color: T.textMuted, fontSize: 11, lineHeight: 1.55 }}>
          <div>예상 구성: {groupPlanLabel || "없음"}</div>
          <div>판단 신뢰도: {groupPlan.confidence} · {groupPlan.rationale}</div>
          {groupPlan.requiresReview && !groupConfirmed && <button onClick={() => setGroupConfirmed(true)} style={{ ...chip(true), marginTop: 7 }}>이 구성 사용</button>}
        </div>
      </div>}

      <div>
        <span style={optionLabel}>3. 출력 방식</span>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {FLOATING_OUTPUT_OPTIONS.map((o) => <button key={o.key} onClick={() => setOutputMode(o.key)} style={chip(outputMode === o.key)}>{o.ko}</button>)}
        </div>
        <div style={{ fontSize: 11, color: T.textDim, marginTop: 6 }}>배너 자동화는 ‘효과만 분리’를 권장합니다. 원본 아이템은 생성하지 않고 합성 단계에서 그대로 사용합니다.</div>
      </div>

      {/* 원형 이펙트 형태 */}
      <div>
        <span style={optionLabel}><Sparkles size={12} /> 4. 이펙트 재질</span>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {FLOATING_EFFECT_OPTIONS.map((o) => <button key={o.key} onClick={() => setEffect(o.key)} style={chip(effect === o.key)}>{o.ko}</button>)}
        </div>
        <div style={{ fontSize: 11, color: T.textDim, marginTop: 6 }}>아이템을 감싸는 링/구체 형태를 정합니다.</div>
      </div>

      <div>
        <span style={optionLabel}>5. 감싸는 형태</span>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {FLOATING_FORM_OPTIONS.map((o) => <button key={o.key} onClick={() => setForm(o.key)} style={chip(form === o.key)}>{o.ko}</button>)}
        </div>
      </div>

      {/* 배치 — 개별 원 vs 한 원에 모아서 */}
      <div>
        <span style={optionLabel}>6. 시각적 배열</span>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {FLOATING_LAYOUT_OPTIONS.map((o) => <button key={o.key} onClick={() => setLayout(o.key)} style={chip(layout === o.key)}>{o.ko}</button>)}
        </div>
        <div style={{ fontSize: 11, color: T.textDim, marginTop: 6 }}>개별=아이템마다 원 하나씩(여러 오브) · 모아서=모든 아이템을 한 원 안에. (1장이면 자동으로 원 하나)</div>
      </div>

      {/* 이펙트 색 */}
      <div>
        <span style={optionLabel}>7. 이펙트 색</span>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {FLOATING_COLORS.map((o) => <button key={o.key} onClick={() => setColor(o.key)} style={chip(color === o.key)}>{o.ko}</button>)}
        </div>
      </div>

      <div>
        <span style={optionLabel}>8. 강도 · 흐름 · 파티클</span>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 7 }}>{FLOATING_INTENSITY_OPTIONS.map((o) => <button key={o.key} onClick={() => setIntensity(o.key)} style={chip(intensity === o.key)}>{o.ko}</button>)}</div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 7 }}>{FLOATING_MOTION_OPTIONS.map((o) => <button key={o.key} onClick={() => setMotion(o.key)} style={chip(motion === o.key)}>{o.ko}</button>)}</div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{FLOATING_DENSITY_OPTIONS.map((o) => <button key={o.key} onClick={() => setDensity(o.key)} style={chip(density === o.key)}>{o.ko}</button>)}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label><span style={optionLabel}>궤도 개방률 {opening}%</span><input type="range" min="0" max="50" step="5" value={opening} onChange={(e) => setOpening(Number(e.target.value))} style={{ width: "100%" }} /></label>
        <label><span style={optionLabel}>전면 교차 {frontCross}%</span><input type="range" min="0" max="15" step="1" value={frontCross} onChange={(e) => setFrontCross(Number(e.target.value))} style={{ width: "100%" }} /></label>
      </div>

      {/* 배경 — 누끼 방식 */}
      {outputMode !== "effect-only" && <div>
        <span style={optionLabel}>9. 배경 (누끼 작업용)</span>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {BUNDLE_BG_OPTIONS.map((o) => <button key={o.key} onClick={() => setBg(o.key)} style={chip(bg === o.key)}><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: o.fill, border: "1px solid rgba(255,255,255,.3)", marginRight: 6, verticalAlign: "-1px" }} />{o.ko}</button>)}
        </div>
        <div style={{ fontSize: 11, color: T.textDim, marginTop: 6 }}>블랙=발광 추출 · 크로마 그린=색상 키 · 화이트=레퍼런스. 저장 시 자동 투명화됩니다.</div>
      </div>}

      <label><span style={optionLabel}>추가 지시 (선택)</span><textarea value={intent} onChange={(e) => setIntent(e.target.value)} rows={3} placeholder="예: 원을 살짝 겹쳐서 대각선으로 배치, 물방울 안에 작은 반짝임 추가." style={fieldStyle(T)} /></label>

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{["1K", "2K", "4K"].map((v) => <button key={v} onClick={() => setSize(v)} style={chip(size === v)}>{v}</button>)}</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
        <ModelSelect T={T} model={model} onChange={setModel} />
        <button onClick={run} disabled={items.length < 1 || busy} style={primaryBtn(T, accent, items.length < 1 || busy)}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Orbit size={15} />} 공중부양 렌더링</button>
      </div>
      {error && <div style={{ color: "#f87171", fontSize: 12 }}>{error}</div>}
      {savedArc === "saving" && <div style={{ color: T.textDim, fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}><Loader2 size={12} className="animate-spin" /> 프롬프트 아크에 저장 중…</div>}
      {savedArc === "done" && <div style={{ color: accent, fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}><FolderCheck size={13} /> 프롬프트 아크 내 폴더에 자동 저장됐어요.</div>}
      {savedArc === "failed" && <div style={{ color: "#f87171", fontSize: 12 }}>프롬프트 아크 저장에 실패했어요 (렌더 결과는 유지됩니다).</div>}
    </section>
    <ResultView T={T} accent={accent} url={result} busy={busy} onRetry={run} filePrefix="floating-items" alreadyTransparent={outputMode === "layered-transparent"} transparentOnSave={outputMode === "effect-only"} colorKeyBlack={outputMode === "effect-only"} maxW={800} />
    {modal}
  </div>;
}

const ASPECTS = ["16:9", "21:9", "4:3"];
function BgGenerate({ T, accent }) {
  const { ensureCanGenerate, modal } = useUsageGate();
  const [concept, setConcept] = useState(""), [refUrl, setRefUrl] = useState(null), [aspect, setAspect] = useState("16:9"), [size, setSize] = useState("2K"), [model, setModel] = useState(DEFAULT_MODEL), [busy, setBusy] = useState(false), [result, setResult] = useState(null), [error, setError] = useState("");
  const run = async () => { if (!concept.trim() || busy || !(await ensureCanGenerate("image"))) return; setBusy(true); setResult(null); setError(""); try { const url = await renderBgGenerate(concept, refUrl, { aspectRatio: aspect, imageSize: size, modelId: model }); if (!url) throw new Error("렌더 결과가 비어 있습니다."); setResult(url); } catch (e) { setError(e?.message || "생성 중 오류가 발생했습니다."); } finally { setBusy(false); } };
  const chip = (on) => ({ padding: "7px 12px", borderRadius: 8, border: `1px solid ${on ? accent : T.border}`, background: on ? `${accent}20` : T.surface, color: on ? accent : T.textMuted, cursor: "pointer" });
  return <div style={panelGrid}><section style={{ display: "grid", gap: 14 }}><label><span style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.textMuted, marginBottom: 7 }}>배경 콘셉트</span><textarea value={concept} onChange={(e) => setConcept(e.target.value)} rows={5} placeholder="예: 어두운 중세 성채, 중앙은 타이틀을 위한 여백, 좌우에 푸른 마법광." style={fieldStyle(T)} /></label><Dropzone T={T} accent={accent} dataUrl={refUrl} onFile={setRefUrl} onClear={() => setRefUrl(null)} title="참고 이미지 (선택)" /><div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{ASPECTS.map((v) => <button key={v} onClick={() => setAspect(v)} style={chip(aspect === v)}>{v}</button>)}{["1K", "2K", "4K"].map((v) => <button key={v} onClick={() => setSize(v)} style={chip(size === v)}>{v}</button>)}</div><div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}><ModelSelect T={T} model={model} onChange={setModel} /><button onClick={run} disabled={!concept.trim() || busy} style={primaryBtn(T, accent, !concept.trim() || busy)}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} 바로 렌더링</button></div>{error && <div style={{ color: "#f87171", fontSize: 12 }}>{error}</div>}</section><ResultView T={T} accent={accent} url={result} busy={busy} onRetry={run} filePrefix="kv-background" />{modal}</div>;
}
