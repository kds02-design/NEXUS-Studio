import { useEffect, useMemo, useRef, useState } from 'react';
import { GEMINI_API_KEY, geminiUrl } from "../../lib/gemini";
import { useGlobal } from "../../context/GlobalContext";

/* ════════ Theme ════════ */
const T = {
  bg: "#0f1115", surface: "#1a1d23", card: "#16181d",
  border: "#272a31", borderHi: "#3a3e47",
  text: "#e3e3e3", textMuted: "#9aa0a8", textDim: "#5e636b",
  accent: "#FD79A8",
};

/* ════════ Options (id + 한글 라벨 + 영문 표현) ════════ */
const LOGO_TYPES = [
  { id: "wordmark",    ko: "워드마크",   en: "wordmark" },
  { id: "lettermark",  ko: "레터마크",   en: "lettermark monogram" },
  { id: "symbolmark",  ko: "심볼마크",   en: "symbol mark icon" },
  { id: "combination", ko: "콤비네이션", en: "combination mark with text and symbol" },
  { id: "emblem",      ko: "엠블럼",     en: "emblem badge" },
];
const INDUSTRIES = [
  { id: "game",          ko: "게임",         en: "gaming" },
  { id: "tech",          ko: "테크",         en: "technology" },
  { id: "entertainment", ko: "엔터테인먼트", en: "entertainment" },
  { id: "fashion",       ko: "패션",         en: "fashion" },
  { id: "fnb",           ko: "식음료",       en: "food and beverage" },
  { id: "finance",       ko: "금융",         en: "finance" },
  { id: "education",     ko: "교육",         en: "education" },
  { id: "health",        ko: "헬스",         en: "health and wellness" },
  { id: "sports",        ko: "스포츠",       en: "sports" },
  { id: "other",         ko: "기타",         en: "general" },
];
const MOODS = [
  { id: "minimal",     ko: "미니멀",     en: "minimal" },
  { id: "modern",      ko: "모던",       en: "modern" },
  { id: "vintage",     ko: "빈티지",     en: "vintage retro" },
  { id: "luxury",      ko: "럭셔리",     en: "luxurious premium" },
  { id: "cute",        ko: "귀여움",     en: "cute playful" },
  { id: "intense",     ko: "강렬함",     en: "bold and intense" },
  { id: "trustworthy", ko: "신뢰감",     en: "trustworthy professional" },
  { id: "innovative",  ko: "혁신적",     en: "innovative futuristic" },
  { id: "natural",     ko: "자연친화",   en: "organic and natural" },
  { id: "dynamic",     ko: "다이나믹",   en: "dynamic energetic" },
];
const COLOR_MODES = [
  { id: "monochrome", ko: "모노크롬",   en: "monochrome black-and-white" },
  { id: "single",     ko: "단색",       en: "single dominant color" },
  { id: "duotone",    ko: "듀오톤",     en: "duotone two-color" },
  { id: "multi",      ko: "멀티컬러",   en: "multi-color palette" },
];
const FONT_STYLES = [
  { id: "serif",     ko: "세리프",     en: "serif" },
  { id: "sans",      ko: "산세리프",   en: "sans-serif" },
  { id: "slab",      ko: "슬랩세리프", en: "slab serif" },
  { id: "script",    ko: "스크립트",   en: "script" },
  { id: "display",   ko: "디스플레이", en: "display" },
];
const FONT_WEIGHTS = [
  { id: "thin",    ko: "씬",     en: "thin" },
  { id: "regular", ko: "레귤러", en: "regular" },
  { id: "bold",    ko: "볼드",   en: "bold" },
  { id: "black",   ko: "블랙",   en: "black weight" },
];
const SYMBOL_STYLES = [
  { id: "geometric",  ko: "기하학적",     en: "geometric" },
  { id: "organic",    ko: "유기적",       en: "organic flowing" },
  { id: "abstract",   ko: "추상적",       en: "abstract" },
  { id: "figurative", ko: "구상적",       en: "figurative representational" },
  { id: "letterform", ko: "문자 변형",    en: "stylized letterform" },
];
const REFERENCES = [
  { id: "apple",      ko: "애플",       en: "Apple" },
  { id: "nike",       ko: "나이키",     en: "Nike" },
  { id: "google",     ko: "구글",       en: "Google" },
  { id: "lv",         ko: "루이비통",   en: "Louis Vuitton" },
  { id: "netflix",    ko: "넷플릭스",   en: "Netflix" },
  { id: "starbucks",  ko: "스타벅스",   en: "Starbucks" },
  { id: "tesla",      ko: "테슬라",     en: "Tesla" },
  { id: "adidas",     ko: "아디다스",   en: "Adidas" },
];
const AI_MODELS = [
  { id: "midjourney",  ko: "미드저니",    en: "midjourney" },
  { id: "nanobanana",  ko: "나노바나나",  en: "nano banana" },
  { id: "chatgpt",     ko: "ChatGPT",     en: "chatgpt" },
  { id: "dalle",       ko: "DALL-E",      en: "dall-e" },
];

const find = (list, id) => list.find((x) => x.id === id);

/* ════════ Prompt builders ════════ */
function buildPositive(s) {
  const lt  = find(LOGO_TYPES, s.logoType);
  const ind = find(INDUSTRIES, s.industry);
  const mood = find(MOODS, s.mood);
  const cm  = find(COLOR_MODES, s.colorMode);
  const fs  = find(FONT_STYLES, s.fontStyle);
  const fw  = find(FONT_WEIGHTS, s.fontWeight);
  const sym = find(SYMBOL_STYLES, s.symbolStyle);
  const ref = s.reference === "custom" ? s.referenceCustom : find(REFERENCES, s.reference)?.en;
  const model = find(AI_MODELS, s.model);

  const brand = (s.brandName || "BRAND").trim();
  const tag = s.tagline.trim();

  const showSymbol = s.logoType === "symbolmark" || s.logoType === "combination";
  const colorClause = cm.en + (s.colorKeyword.trim() ? ` with colors ${s.colorKeyword.trim()}` : "");

  const parts = [
    `Professional ${lt.en} logo for "${brand}"`,
    tag ? `tagline "${tag}"` : null,
    `${ind.en} industry`,
    `${mood.en} style`,
    `${colorClause} color scheme`,
    `${fs.en} typography`,
    `${fw.en} weight`,
    showSymbol ? `${sym.en} symbol direction` : null,
    ref ? `inspired by ${ref}'s aesthetic` : null,
    "clean vector design",
    "white background",
    "scalable",
    "memorable",
    "high contrast",
  ].filter(Boolean);

  let prompt = parts.join(", ");
  // 모델별 suffix
  if (model.id === "midjourney") prompt += " --ar 1:1 --style raw --v 6";
  return prompt;
}

const NEGATIVE_PROMPT =
  "(complex, cluttered, amateur, blurry, watermark, signature, text errors, illegible, low quality, jpeg artifacts, distorted, deformed letters, asymmetric:1.4)";

/* ════════ Primitives ════════ */
const btn = (bg, fg = T.text, border = bg) => ({
  background: bg, color: fg, border: `1px solid ${border}`, borderRadius: 6,
  padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "filter 0.12s",
  fontFamily: "inherit",
});
const lbl = { display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: T.textMuted, marginBottom: 8 };
const inp = { width: "100%", background: T.bg, color: T.text, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" };

function Section({ title, children, accent }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ ...lbl, color: accent ? T.accent : T.textMuted, borderLeft: accent ? `2px solid ${T.accent}` : "none", paddingLeft: accent ? 8 : 0 }}>{title}</div>
      {children}
    </div>
  );
}

function ChipGroup({ options, value, onChange, columns = 0 }) {
  return (
    <div style={{
      display: columns > 0 ? "grid" : "flex",
      gridTemplateColumns: columns > 0 ? `repeat(${columns}, 1fr)` : undefined,
      flexWrap: columns > 0 ? undefined : "wrap",
      gap: 6,
    }}>
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            style={{
              padding: "7px 12px", borderRadius: 6, cursor: "pointer",
              background: active ? `${T.accent}22` : "transparent",
              border: `1px solid ${active ? T.accent : T.border}`,
              color: active ? T.accent : T.textMuted,
              fontSize: 12, fontWeight: active ? 700 : 500,
              fontFamily: "inherit", transition: "all 0.12s",
              textAlign: "center", whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => { if (!active) { e.currentTarget.style.borderColor = `${T.accent}66`; e.currentTarget.style.color = T.text; } }}
            onMouseLeave={(e) => { if (!active) { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textMuted; } }}
          >
            {opt.ko}
          </button>
        );
      })}
    </div>
  );
}

/* ════════ AI 이미지 분석 ════════ */
async function analyzeLogoImage(base64) {
  if (!GEMINI_API_KEY) throw new Error("Gemini API 키가 설정되지 않았습니다.");
  const inline = base64.startsWith("data:") ? base64.split(",")[1] : base64;
  const systemPrompt = `당신은 로고 디자인 분석가입니다. 업로드된 로고 이미지를 보고 아래 JSON 한 줄로 답하세요. 마크다운/코드펜스 금지.

형식: {"logoType":"<id>","industry":"<id>","mood":"<id>","colorMode":"<id>","fontStyle":"<id>","fontWeight":"<id>","symbolStyle":"<id>","colorKeyword":"<한국어로 컬러 키워드 2~4개>"}

각 필드 허용 id:
- logoType: ${LOGO_TYPES.map((x) => x.id).join(", ")}
- industry: ${INDUSTRIES.map((x) => x.id).join(", ")}
- mood: ${MOODS.map((x) => x.id).join(", ")}
- colorMode: ${COLOR_MODES.map((x) => x.id).join(", ")}
- fontStyle: ${FONT_STYLES.map((x) => x.id).join(", ")}
- fontWeight: ${FONT_WEIGHTS.map((x) => x.id).join(", ")}
- symbolStyle: ${SYMBOL_STYLES.map((x) => x.id).join(", ")}

업종이 분명하지 않으면 "other". 없는 id는 절대 만들지 마세요.`;
  const res = await fetch(geminiUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ inlineData: { mimeType: "image/jpeg", data: inline } }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  return JSON.parse(raw);
}

/* ════════ Persistence ════════ */
const STORAGE_PRESETS = "logo-forge:presets";
const STORAGE_STATE = "logo-forge:state";
const load = (k, fb) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? fb; } catch { return fb; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

const DEFAULT_STATE = {
  brandName: "",
  tagline: "",
  logoType: "wordmark",
  industry: "tech",
  mood: "minimal",
  colorMode: "monochrome",
  colorKeyword: "",
  fontStyle: "sans",
  fontWeight: "bold",
  symbolStyle: "geometric",
  reference: "",
  referenceCustom: "",
  model: "midjourney",
};

/* ════════ Main ════════ */
export default function LogoForge() {
  const { navigate, setNotification, isLight } = useGlobal();
  // Phase 2.5 — 루트만 light 대응. 내부 위젯은 T 토큰(다크) 그대로.
  const rootBg   = isLight ? "#F7F7FA" : T.bg;
  const rootText = isLight ? "#1A1A24" : T.text;
  const [state, setStateRaw] = useState(() => load(STORAGE_STATE, null) || DEFAULT_STATE);
  const [presets, setPresets] = useState(() => load(STORAGE_PRESETS, {}));
  const [presetName, setPresetName] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [flash, setFlash] = useState("");
  const [analyzeErr, setAnalyzeErr] = useState("");
  const fileRef = useRef(null);

  const setState = (patch) => setStateRaw((s) => ({ ...s, ...patch }));

  useEffect(() => { save(STORAGE_STATE, state); }, [state]);

  const positivePrompt = useMemo(() => buildPositive(state), [state]);
  const negativePrompt = NEGATIVE_PROMPT;
  const showSymbol = state.logoType === "symbolmark" || state.logoType === "combination";

  const showFlash = (m) => { setFlash(m); setTimeout(() => setFlash(""), 1500); };
  const copy = async (txt, label) => {
    try { await navigator.clipboard.writeText(txt); showFlash(`복사됨: ${label}`); } catch { showFlash("복사 실패"); }
  };

  /* AI 분석 */
  const onAnalyzeFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { setAnalyzeErr("이미지 파일만 가능합니다."); return; }
    if (file.size > 8 * 1024 * 1024) { setAnalyzeErr("파일 크기가 8MB를 초과합니다."); return; }
    setAnalyzing(true); setAnalyzeErr("");
    try {
      const dataUrl = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result || ""));
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const result = await analyzeLogoImage(dataUrl);
      const patch = {};
      ["logoType","industry","mood","colorMode","fontStyle","fontWeight","symbolStyle"].forEach((k) => {
        if (result[k] && (
          (k === "logoType"   && LOGO_TYPES.some(o => o.id === result[k])) ||
          (k === "industry"   && INDUSTRIES.some(o => o.id === result[k])) ||
          (k === "mood"       && MOODS.some(o => o.id === result[k])) ||
          (k === "colorMode"  && COLOR_MODES.some(o => o.id === result[k])) ||
          (k === "fontStyle"  && FONT_STYLES.some(o => o.id === result[k])) ||
          (k === "fontWeight" && FONT_WEIGHTS.some(o => o.id === result[k])) ||
          (k === "symbolStyle"&& SYMBOL_STYLES.some(o => o.id === result[k]))
        )) patch[k] = result[k];
      });
      if (result.colorKeyword) patch.colorKeyword = String(result.colorKeyword).slice(0, 80);
      setState(patch);
      showFlash("AI 분석 완료");
    } catch (err) {
      console.error("[LogoForge] analyze failed", err);
      setAnalyzeErr(err.message || "분석 실패");
    } finally { setAnalyzing(false); }
  };

  /* Arc 전송 */
  const sendToArc = () => {
    const brand = (state.brandName || "BRAND").trim();
    navigate("prompt-arc", {
      source: "logo-forge", target: "prompt-arc",
      prompt: { text: positivePrompt, tags: ["로고", find(INDUSTRIES, state.industry)?.ko || ""], style: find(MOODS, state.mood)?.en || "" },
      image: { url: "", metadata: { brand, negative: negativePrompt } },
      params: { brand },
    });
    setNotification?.(`Prompt Arche로 전송: ${brand}`);
    showFlash("아크에 저장됨");
  };

  /* 프리셋 */
  const savePreset = () => {
    const n = presetName.trim();
    if (!n) { showFlash("프리셋 이름을 입력하세요"); return; }
    const next = { ...presets, [n]: JSON.parse(JSON.stringify(state)) };
    setPresets(next); save(STORAGE_PRESETS, next); setPresetName("");
    showFlash(`프리셋 저장됨: ${n}`);
  };
  const loadPreset = (n) => { if (presets[n]) { setStateRaw(presets[n]); showFlash(`불러옴: ${n}`); } };
  const deletePreset = (n) => {
    const next = { ...presets }; delete next[n];
    setPresets(next); save(STORAGE_PRESETS, next); showFlash(`삭제됨: ${n}`);
  };
  const reset = () => {
    if (!confirm("모든 설정을 기본값으로 되돌리시겠습니까?")) return;
    setStateRaw(DEFAULT_STATE); showFlash("초기화됨");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: rootBg, color: rootText, fontFamily: "'Noto Sans KR', sans-serif" }}>
      {/* 3-PANEL BODY */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "320px 1fr 420px", overflow: "hidden" }}>
        {/* ─── LEFT: 기본 설정 ─── */}
        <aside style={{ borderRight: `1px solid ${T.border}`, overflowY: "auto", padding: 22, background: T.surface }}>
          <Section title="1. 브랜드명" accent>
            <input
              value={state.brandName} onChange={(e) => setState({ brandName: e.target.value })}
              placeholder="예: AETHER, 다크엘프, NCSOFT"
              style={{ ...inp, fontSize: 15, padding: "10px 12px", fontWeight: 600 }}
              maxLength={40}
            />
          </Section>

          <Section title="2. 슬로건/태그라인 (선택)">
            <input
              value={state.tagline} onChange={(e) => setState({ tagline: e.target.value })}
              placeholder="예: Forge your legend"
              style={inp} maxLength={60}
            />
          </Section>

          <Section title="3. 로고 유형">
            <ChipGroup options={LOGO_TYPES} value={state.logoType} onChange={(v) => setState({ logoType: v })} />
          </Section>

          <Section title="4. 업종/카테고리">
            <ChipGroup options={INDUSTRIES} value={state.industry} onChange={(v) => setState({ industry: v })} />
          </Section>

          <Section title="5. 분위기/톤">
            <ChipGroup options={MOODS} value={state.mood} onChange={(v) => setState({ mood: v })} />
          </Section>
        </aside>

        {/* ─── CENTER: 세부 옵션 ─── */}
        <main style={{ overflowY: "auto", padding: 24, background: T.bg }}>
          <Section title="6. 컬러 방향">
            <ChipGroup options={COLOR_MODES} value={state.colorMode} onChange={(v) => setState({ colorMode: v })} columns={4} />
            <input
              value={state.colorKeyword} onChange={(e) => setState({ colorKeyword: e.target.value })}
              placeholder="컬러 키워드 (예: 딥 네이비, 골드)"
              style={{ ...inp, marginTop: 10 }} maxLength={80}
            />
          </Section>

          <Section title="7. 폰트 스타일">
            <ChipGroup options={FONT_STYLES} value={state.fontStyle} onChange={(v) => setState({ fontStyle: v })} />
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, color: T.textDim, marginBottom: 6, fontWeight: 700, letterSpacing: "0.08em" }}>굵기</div>
              <ChipGroup options={FONT_WEIGHTS} value={state.fontWeight} onChange={(v) => setState({ fontWeight: v })} columns={4} />
            </div>
          </Section>

          <Section title={`8. 심볼 방향${showSymbol ? "" : " (심볼/콤비네이션 선택 시)"}`}>
            <div style={{ opacity: showSymbol ? 1 : 0.4, pointerEvents: showSymbol ? "auto" : "none" }}>
              <ChipGroup options={SYMBOL_STYLES} value={state.symbolStyle} onChange={(v) => setState({ symbolStyle: v })} />
            </div>
          </Section>

          <Section title="9. 레퍼런스 스타일">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {REFERENCES.map((opt) => {
                const active = state.reference === opt.id;
                return (
                  <button key={opt.id} onClick={() => setState({ reference: active ? "" : opt.id })}
                    style={{ padding: "6px 12px", borderRadius: 6, cursor: "pointer", background: active ? `${T.accent}22` : "transparent", border: `1px solid ${active ? T.accent : T.border}`, color: active ? T.accent : T.textMuted, fontSize: 12, fontWeight: active ? 700 : 500, fontFamily: "inherit", transition: "all 0.12s" }}>
                    {opt.ko}
                  </button>
                );
              })}
              <button onClick={() => setState({ reference: "custom" })}
                style={{ padding: "6px 12px", borderRadius: 6, cursor: "pointer", background: state.reference === "custom" ? `${T.accent}22` : "transparent", border: `1px solid ${state.reference === "custom" ? T.accent : T.border}`, color: state.reference === "custom" ? T.accent : T.textMuted, fontSize: 12, fontWeight: state.reference === "custom" ? 700 : 500, fontFamily: "inherit" }}>
                직접 입력
              </button>
            </div>
            {state.reference === "custom" && (
              <input value={state.referenceCustom} onChange={(e) => setState({ referenceCustom: e.target.value })}
                placeholder="브랜드명 입력 (예: Patagonia)"
                style={{ ...inp, marginTop: 10 }} maxLength={40} />
            )}
          </Section>

          <Section title="10. 출력 모델">
            <ChipGroup options={AI_MODELS} value={state.model} onChange={(v) => setState({ model: v })} columns={4} />
          </Section>

          <Section title="11. AI 로고 분석 (옵션 자동 설정)">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={() => fileRef.current?.click()} disabled={analyzing}
                style={{ ...btn(`${T.accent}22`, T.accent, T.accent), padding: "10px 14px", opacity: analyzing ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {analyzing ? "분석 중…" : "📷 레퍼런스 이미지 업로드"}
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onAnalyzeFile} />
              <div style={{ fontSize: 11, color: T.textDim }}>이미지를 올리면 Gemini가 스타일을 분석해 옵션들을 자동으로 채워줍니다.</div>
              {analyzeErr && <div style={{ fontSize: 11, color: "#ff7575" }}>{analyzeErr}</div>}
            </div>
          </Section>

          {/* 프리셋 */}
          <Section title="프리셋">
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <input value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="프리셋 이름" style={inp} />
              <button onClick={savePreset} style={btn(T.border)}>저장</button>
              <button onClick={reset} style={btn(T.border)} title="모든 옵션 기본값으로">↺</button>
            </div>
            {Object.keys(presets).length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {Object.keys(presets).map((n) => (
                  <span key={n} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, border: `1px solid ${T.border}`, fontSize: 11, background: T.surface }}>
                    <button onClick={() => loadPreset(n)} style={{ background: "none", border: 0, color: T.text, cursor: "pointer", padding: 0, fontSize: 11 }}>{n}</button>
                    <button onClick={() => deletePreset(n)} style={{ background: "none", border: 0, color: T.textDim, cursor: "pointer", padding: 0, fontSize: 11 }}>✕</button>
                  </span>
                ))}
              </div>
            )}
          </Section>
        </main>

        {/* ─── RIGHT: 프롬프트 미리보기 ─── */}
        <aside style={{ borderLeft: `1px solid ${T.border}`, display: "flex", flexDirection: "column", background: T.surface }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: T.textMuted, textTransform: "uppercase" }}>프롬프트 미리보기</div>
              <div style={{ fontSize: 10, color: T.textDim }}>{positivePrompt.length.toLocaleString()} chars</div>
            </div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>{find(AI_MODELS, state.model)?.ko || "모델"} · {find(LOGO_TYPES, state.logoType)?.ko}</div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: T.accent, marginBottom: 6, textTransform: "uppercase" }}>+ Positive</div>
              <pre style={{ margin: 0, fontSize: 12, lineHeight: 1.65, color: T.text, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "'JetBrains Mono', monospace", padding: 12, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8 }}>
                {positivePrompt}
              </pre>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#ff7575", marginBottom: 6, textTransform: "uppercase" }}>− Negative</div>
              <pre style={{ margin: 0, fontSize: 12, lineHeight: 1.65, color: T.textMuted, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "'JetBrains Mono', monospace", padding: 12, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8 }}>
                {negativePrompt}
              </pre>
            </div>
          </div>
          <div style={{ padding: 12, borderTop: `1px solid ${T.border}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button onClick={() => copy(`${positivePrompt}\n\n--- NEGATIVE ---\n${negativePrompt}`, "전체")} style={btn(T.accent, "#fff", T.accent)}>📋 전체 복사</button>
            <button onClick={() => copy(positivePrompt, "포지티브")} style={btn(T.border)}>포지티브만 복사</button>
            <button onClick={sendToArc} style={btn(T.border)}>↪ 아크에 저장</button>
            <button onClick={savePreset} style={btn(T.border)}>💾 프리셋 저장</button>
          </div>
        </aside>
      </div>

      {flash && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: T.accent, color: "#0f1115", padding: "10px 22px", borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 998, boxShadow: "0 10px 40px rgba(253,121,168,0.3)" }}>
          ✓ {flash}
        </div>
      )}
    </div>
  );
}
