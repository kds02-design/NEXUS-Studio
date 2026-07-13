// 배경 퀄리티업 — KV/배너 업로드 → 원본 형태는 유지한 채 배경의 빛·대기·파티클 등 분위기만 향상.
//   · 분위기 프리셋(갓레이/림라이트/파티클…) + 강도 선택 → 앱 지정 [강화] 항목으로 프롬프트에 삽입.
//   · 프로모션 컬러 시스템(KV 컴포저 테마 토큰) 연동 — 배경 그레이딩을 테마 팔레트 방향으로 통일.
//   · Gemini 분석으로 향상 프롬프트 생성 OR Pro 이미지 모델(4K)로 바로 렌더링.
// 분석 호출 전 ensureCanGenerate("analysis"), 렌더 호출 전 ensureCanGenerate("image") (프로젝트 규약).
// 업로드 이미지의 크기·위치 변형은 없음 — 원본을 그대로 모델에 전달해 비율 어긋남을 방지.
import { useRef, useState } from "react";
import { Upload, Sparkles, Copy, Check, RotateCcw, Wand2, Download, Plus, FolderCheck, Palette } from "lucide-react";
import { useUsageGate } from "../../../components/UsageGate";
import { useAuth } from "../../../context/AuthContext";
import { analyzeForQuality, renderEnhanced, saveEnhancedToPromptArc } from "../services/qualityEnhancer";
import { IMAGEN_MODELS } from "../../../lib/imagenRender";

const TOOLS = [
  { key: "gemini", label: "Gemini", sub: "Imagen / Nano Banana", color: "#8b5cf6" },
  { key: "gpt", label: "ChatGPT", sub: "GPT-4o 이미지 편집", color: "#10b981" },
];

// 분위기 프리셋 — 원본 형태를 유지한 채 배경에 얹는 빛·대기·입자 요소 (복수 선택).
const MOOD_PRESETS = [
  { key: "godray",   label: "갓레이 · 볼류메트릭", text: "상단/측면 광원에서 뻗는 볼류메트릭 갓레이(god rays)와 빛줄기" },
  { key: "rimlight", label: "림라이트 분리",       text: "강한 백라이트·림라이트로 피사체 외곽을 배경에서 또렷하게 분리" },
  { key: "particle", label: "파티클 · 먼지",       text: "광원 주변에 떠다니는 파티클·먼지·스파크 입자" },
  { key: "haze",     label: "안개 · 헤이즈",       text: "은은한 안개/헤이즈와 대기 원근으로 깊이 레이어 강조" },
  { key: "glow",     label: "글로우 · 블룸",       text: "광원의 렌즈 글로우·블룸으로 화사한 발광감" },
  { key: "ember",    label: "마법 입자 · 불씨",     text: "배경에 흩날리는 마법 입자/불씨/반딧불 같은 발광 입자" },
];
const STRENGTHS = [
  { key: "subtle",   label: "은은하게", text: "효과 강도: 은은하게 — 원본 무드를 유지한 채 미세하게만 얹을 것" },
  { key: "standard", label: "표준",     text: "" },
  { key: "dramatic", label: "드라마틱", text: "효과 강도: 과감하고 영화적으로 — 명암 대비와 빛 연출을 극대화 (단, 형태·콘텐츠는 그대로)" },
];

// 테마 토큰 → 배경 그레이딩 팔레트 지시문. 토큰이 없으면 빈 문자열.
function themePaletteText(theme) {
  const t = theme?.tokens || {};
  const cols = [];
  const grad = [t.bgTop, t.bgMid, t.bgBottom].filter(Boolean);
  if (grad.length) cols.push(`배경 그라데이션 ${grad.join(" → ")}`);
  if (t.primary) cols.push(`주조 ${t.primary}`);
  if (t.accent) cols.push(`강조 ${t.accent}`);
  if (!cols.length) return "";
  return `[컬러 시스템 연동] 배경의 빛 색·색온도·그레이딩은 프로모션 컬러 시스템과 조화되게: ${cols.join(", ")}. 이 팔레트 방향의 빛·대기 색으로 배경 무드를 통일할 것 (피사체·타이틀 고유색은 유지).`;
}

export default function QualityEnhancer({ T, accent, theme = null }) {
  const { ensureCanGenerate, modal } = useUsageGate();
  const { user } = useAuth();
  const [dataUrl, setDataUrl] = useState(null);
  const [aspect, setAspect] = useState(16 / 9);

  const [tool, setTool] = useState(null);
  const [renderModel, setRenderModel] = useState("gemini-3-pro-image-preview");
  const [loading, setLoading] = useState(""); // '' | 'prompt' | 'render'
  const [result, setResult] = useState(null);     // 프롬프트 결과
  const [renderedUrl, setRenderedUrl] = useState(null); // 렌더 결과
  const [savedToArc, setSavedToArc] = useState(""); // '' | 'saving' | 'done' | 'failed'
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  // 분위기 부스트 — 프리셋(복수) + 강도 + 컬러 시스템 연동
  const [presets, setPresets] = useState([]);
  const [strength, setStrength] = useState("standard");
  const hasTheme = !!themePaletteText(theme);
  const [linkTheme, setLinkTheme] = useState(true);
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

  const togglePreset = (key) => setPresets((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));

  // 프리셋/강도/테마 → 서비스로 넘길 boost 문자열 조립.
  const buildBoost = () => {
    const lines = MOOD_PRESETS.filter((p) => presets.includes(p.key)).map((p) => `- ${p.text}`);
    const st = STRENGTHS.find((s) => s.key === strength)?.text;
    if (st) lines.push(`- ${st}`);
    return {
      moodPresets: lines.join("\n"),
      themePalette: linkTheme && hasTheme ? themePaletteText(theme) : "",
    };
  };

  const runPrompt = async () => {
    if (!dataUrl || !tool || loading) return;
    setError("");
    if (!(await ensureCanGenerate("analysis"))) return;
    setLoading("prompt"); setResult(null); setRenderedUrl(null);
    try {
      const r = await analyzeForQuality(dataUrl, tool, extraInstructions, buildBoost());
      setResult(r); setActiveTab(0);
    } catch (e) { setError(e?.message || "분석 중 오류가 발생했습니다."); }
    finally { setLoading(""); }
  };

  const runRender = async () => {
    if (!dataUrl || loading) return;
    setError("");
    if (!(await ensureCanGenerate("image"))) return;
    setLoading("render"); setRenderedUrl(null); setResult(null); setSavedToArc("");
    try {
      const url = await renderEnhanced(dataUrl, renderModel, extraInstructions, buildBoost());
      if (!url) throw new Error("렌더 결과가 비어 있습니다. 다시 시도해 주세요.");
      setRenderedUrl(url);
      // 렌더 완료 즉시 PromptArc 내 폴더에 자동 업로드 — 로그인 사용자만. 실패해도 렌더 결과는 유지.
      if (user?.uid) {
        setSavedToArc("saving");
        try { await saveEnhancedToPromptArc(url, user); setSavedToArc("done"); }
        catch (e) { console.error("[QualityEnhancer] PromptArc 저장 실패", e); setSavedToArc("failed"); }
      }
    } catch (e) { setError(e?.message || "렌더링 중 오류가 발생했습니다."); }
    finally { setLoading(""); }
  };

  const downloadRendered = () => {
    if (!renderedUrl) return;
    const a = document.createElement("a");
    a.href = renderedUrl; a.download = `bg-quality-up_${Date.now()}.png`; a.click();
  };

  const busy = !!loading;

  return (
    <div style={{ width: "100%", margin: "0 auto", padding: "8px 0 40px" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", color: T.text, fontFamily: "'Teko', sans-serif" }}>
          <span style={{ color: accent }}>배경</span> 분위기 업그레이드 — <span style={{ color: accent }}>빛 · 대기 · 파티클</span>
        </h2>
        <p style={{ fontSize: 13, color: T.textMuted, marginTop: 6 }}>
          캐릭터·타이틀·구도는 그대로 두고, 배경의 조명·대기·입자만 영화적으로 끌어올립니다 (Pro 모델 · 4K)
        </p>
        <div style={{
          marginTop: 12, display: "inline-block", textAlign: "left", maxWidth: 620,
          padding: "10px 14px", borderRadius: 10, fontSize: 12, lineHeight: 1.6,
          color: T.textMuted, background: `${accent}10`, border: `1px solid ${accent}33`,
        }}>
          ⚠️ 캐릭터가 있으면 <b style={{ color: T.text }}>외형 보존 가드</b>(얼굴·체형·의상·포즈)를 강하게 적용하지만,
          image-to-image 특성상 <b style={{ color: T.text }}>100% 고정은 어렵습니다</b>. 외형이 바뀌면 다시 렌더링하거나,
          아래 <b style={{ color: T.text }}>추가 지시</b>에 "캐릭터는 절대 바꾸지 말고 배경 빛만" 처럼 명시하면 더 안정적입니다.
        </div>
      </div>

      {/* 업로드 미리보기 — 원본 그대로 표시. 크기·위치 조절 UI 없음 (비율 어긋남 방지). */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", gap: 18, alignItems: "start" }}>
      <section style={{ minWidth: 0 }}>
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
          <div style={{ fontSize: 15, fontWeight: 500, color: T.text }}>KV / 배경 이미지 업로드</div>
          <div style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>클릭하거나 드래그 · PNG, JPG, WEBP</div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
      )}

      {/* 분위기 프리셋 — 원본 형태 유지, 빛/대기/입자 요소만 (복수 선택) */}
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: T.textMuted, textTransform: "uppercase", marginBottom: 8 }}>분위기 프리셋 (복수 선택)</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {MOOD_PRESETS.map((p) => {
          const on = presets.includes(p.key);
          return (
            <button key={p.key} onClick={() => togglePreset(p.key)} title={p.text} style={{
              padding: "8px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: on ? 800 : 600, cursor: "pointer",
              border: `1px solid ${on ? accent : T.border}`, background: on ? `${accent}1F` : T.surface,
              color: on ? accent : T.textMuted,
            }}>{p.label}</button>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          <span style={{ fontSize: 11.5, color: T.textDim }}>강도</span>
          {STRENGTHS.map((s) => {
            const on = strength === s.key;
            return (
              <button key={s.key} onClick={() => setStrength(s.key)} style={{
                padding: "5px 11px", borderRadius: 8, fontSize: 12, fontWeight: on ? 800 : 600, cursor: "pointer",
                border: `1px solid ${on ? accent : T.border}`, background: on ? `${accent}1C` : "transparent",
                color: on ? accent : T.textMuted,
              }}>{s.label}</button>
            );
          })}
        </div>
        {/* 컬러 시스템 연동 — KV 컴포저에서 추출한 프로모션 테마 팔레트 방향으로 배경 그레이딩 */}
        <button onClick={() => hasTheme && setLinkTheme((v) => !v)} disabled={!hasTheme}
          title={hasTheme ? "배경 그레이딩을 프로모션 컬러 시스템(테마 토큰) 방향으로 통일" : "KV 컴포저에서 팔레트를 먼저 추출하세요"}
          style={{
            display: "flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 8,
            border: `1px solid ${hasTheme && linkTheme ? accent : T.border}`,
            background: hasTheme && linkTheme ? `${accent}1C` : "transparent",
            color: !hasTheme ? T.textDim : linkTheme ? accent : T.textMuted,
            fontSize: 12, fontWeight: 700, cursor: hasTheme ? "pointer" : "not-allowed",
          }}>
          <Palette size={13} /> 컬러 시스템 연동 {hasTheme ? (linkTheme ? "ON" : "OFF") : "(테마 없음)"}
        </button>
        {hasTheme && linkTheme && (
          <div style={{ display: "flex", gap: 4 }}>
            {[theme.tokens.bgTop, theme.tokens.bgMid, theme.tokens.bgBottom, theme.tokens.primary, theme.tokens.accent].filter(Boolean).map((c, i) => (
              <span key={i} title={c} style={{ width: 18, height: 18, borderRadius: 5, background: c, border: "1px solid rgba(255,255,255,0.2)" }} />
            ))}
          </div>
        )}
      </div>

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
          placeholder={"예) 배경에 차가운 푸른 안개를 살짝 깔아주세요\n예) 좌측 상단에서 내려오는 황금빛 역광으로\n예) 캐릭터는 절대 바꾸지 말고 배경 빛만"}
          rows={3}
          style={{
            width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${T.border}`,
            background: T.surface, color: T.text, fontSize: 13, lineHeight: 1.5, resize: "vertical",
            fontFamily: "inherit", outline: "none", boxSizing: "border-box",
          }}
        />
        <div style={{ fontSize: 11, color: T.textDim, marginTop: 6 }}>
          * 추가 지시 안에 ★<b>얼굴 인상</b>(생김새/표정/연령) / 타이틀 <b>형태</b>(글자·자형·실루엣) /
          <b>구도·레이아웃·피사체 배치</b> / <b>가장자리 그라데이션 채움</b>★ 변경 요청이 있어도
          <b>자동으로 무시되고 핵심 정책이 무조건 우선</b>합니다.
          배경의 빛·색·대기·입자와 타이틀 <b>질감/마감</b>(메탈릭·반사·글로우·림라이트 등)만 조정됩니다.
        </div>
      </div>

      {/* 액션 — 프롬프트 생성 / 바로 렌더링 */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.textMuted }}>Gemini 이미지 모델</span>
          <select value={renderModel} onChange={(e) => setRenderModel(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface, color: T.text }}>
            {IMAGEN_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, .65fr) minmax(0, 1.35fr)", gap: 12 }}>
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
      </section>
      <section style={{ minWidth: 0, minHeight: 430, border: `1px solid ${T.border}`, background: T.surface, borderRadius: 14, padding: 16, boxSizing: "border-box" }}>
      {!renderedUrl && !result && (
        <div style={{ minHeight: 396, display: "grid", placeItems: "center", textAlign: "center", color: T.textDim, fontSize: 13, border: `1px dashed ${T.border}`, borderRadius: 10 }}>
          {loading === "render" ? "배경을 개선하고 있습니다..." : loading === "prompt" ? "프롬프트를 만들고 있습니다..." : "왼쪽에서 이미지를 올리고 바로 렌더링하세요."}
        </div>
      )}
      {renderedUrl && (
        <div style={{ marginTop: 30 }}>
          <SectionLabel T={T}>향상 렌더링 결과 (Pro · 4K)</SectionLabel>
          <img src={renderedUrl} alt="rendered" style={{ width: "100%", borderRadius: 12, border: `1px solid ${T.border}`, background: "#0c0c12" }} />
          {savedToArc && (
            <div style={{
              marginTop: 10, display: "flex", alignItems: "center", gap: 7, fontSize: 12,
              color: savedToArc === "failed" ? "#f87171" : savedToArc === "done" ? "#10b981" : T.textMuted,
            }}>
              {savedToArc === "saving" && <>프롬프트 아크 내 폴더에 저장 중…</>}
              {savedToArc === "done" && <><FolderCheck size={14} /> 프롬프트 아크 내 폴더에 저장됨</>}
              {savedToArc === "failed" && <>프롬프트 아크 저장 실패 (렌더 결과는 다운로드 가능)</>}
            </div>
          )}
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

      </section>
      </div>
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
