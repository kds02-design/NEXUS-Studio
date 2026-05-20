// Index 페이지의 검색 바 — Gemini가 사용자 질문을 보고 적합한 앱을 추천.
// 추천 결과 카드 + 빠른 이동 칩(quick chips).
import { useState } from "react";
import { APP_MAP, APP_REGISTRY } from "../config/apps";
import { useGlobal, useTheme } from "../context/GlobalContext";
import { GEMINI_API_KEY, geminiUrl } from "../lib/gemini";

// 칩 라벨 → 이동할 앱 id. 사용자 친화적 문구로 두고 안쪽에서 매핑.
const QUICK_CHIPS = [
  { label: "타이포 만들기",   appId: "typecore-sovereign" },
  { label: "배너 분석",       appId: "banner-codex" },
  { label: "렌더링 효과",     appId: "render-metrics" },
  { label: "모션 추가",       appId: "motion-metrics" },
];

// Gemini에게 사용자 문의를 보내고 가장 적합한 app id 하나를 받는 한 줄 프롬프트.
async function recommendApp(query) {
  if (!GEMINI_API_KEY) throw new Error("Gemini API 키가 설정되지 않았습니다.");
  const list = APP_REGISTRY
    .filter((a) => !a.adminOnly && !a.disabled)
    .map((a) => `- ${a.id}: ${a.sub} — ${a.desc}`)
    .join("\n");

  const systemPrompt = `당신은 NEXUS Studio 플랫폼의 앱 추천 어시스턴트입니다. 사용자의 요청을 보고 아래 앱 목록 중 가장 적합한 앱 1개를 골라주세요.

[사용 가능 앱]
${list}

[규칙]
- 반드시 JSON 한 줄로만 답하세요. 다른 텍스트, 마크다운, 코드펜스 금지.
- 형식: {"appId":"<id>","reason":"<한 문장 한국어 추천 이유>"}
- appId는 위 목록의 id 그대로 사용. 없는 id는 절대 만들지 마세요.
- 적합한 앱이 모호하면 가장 가까운 하나를 선택.`;

  const res = await fetch(geminiUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: query }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  let parsed;
  try { parsed = JSON.parse(raw); } catch { parsed = {}; }
  if (!parsed.appId || !APP_MAP[parsed.appId]) {
    throw new Error("적합한 앱을 찾지 못했습니다.");
  }
  return parsed;
}

export default function IndexSearchBar() {
  const { navigate, isLight } = useGlobal();
  const T = useTheme();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");

  const submit = async () => {
    const q = query.trim();
    if (!q || busy) return;
    setBusy(true); setErr(""); setResult(null);
    try {
      const rec = await recommendApp(q);
      setResult(rec);
    } catch (e) {
      setErr(e.message || "분석 실패");
    } finally { setBusy(false); }
  };

  const goApp = (id) => {
    navigate(id, {
      source: "index", target: id,
      prompt: { text: query, tags: [], style: "" },
      image: { url: "", metadata: {} },
      params: {},
    });
  };

  const recApp = result ? APP_MAP[result.appId] : null;

  return (
    <div style={{
      padding:"0 40px", maxWidth: 720, margin:"0 auto 36px", width:"100%", boxSizing:"border-box",
      // 히어로 이미지와 썸네일 카드 사이 시각적 중심을 살짝 위로 끌어올림.
      // translateY 를 쓰면 layout flow 는 그대로라 RecentPrompts 위치는 변하지 않음.
      transform: "translateY(-24px)",
    }}>
      {/* 검색 입력 */}
      <div style={{
        display:"flex", alignItems:"center", gap:8,
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 999,
        padding: "6px 6px 6px 22px",
        boxShadow: isLight ? "0 8px 28px rgba(0,0,0,0.08)" : "0 8px 28px rgba(0,0,0,0.35)",
      }}>
        <span style={{ color: T.textMuted, fontSize: 16 }}>🔮</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="무엇을 만들고 싶으신가요?"
          style={{
            flex: 1, background: "transparent", border: 0, outline: "none",
            color: T.text, fontSize: 14, padding: "10px 4px",
            fontFamily: "'Noto Sans KR', sans-serif",
          }}
        />
        <button
          onClick={submit}
          disabled={busy || !query.trim()}
          style={{
            padding: "8px 18px", borderRadius: 999,
            background: busy || !query.trim() ? T.border : T.accent,
            color: "#ffffff", border: 0, fontSize: 12, fontWeight: 700,
            cursor: busy || !query.trim() ? "not-allowed" : "pointer",
            transition: "background 0.12s",
          }}
        >{busy ? "분석 중…" : "추천"}</button>
      </div>

      {/* 빠른 칩 */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:14, justifyContent:"center" }}>
        {QUICK_CHIPS.map((c) => {
          const target = APP_MAP[c.appId];
          if (!target) return null;
          return (
            <button key={c.label}
              onClick={() => goApp(c.appId)}
              style={{
                padding: "6px 14px", borderRadius: 999,
                background: T.hoverBg,
                border: `1px solid ${T.border}`,
                color: T.textMuted, fontSize: 11, fontWeight: 600,
                cursor: "pointer", transition: "all 0.12s",
                fontFamily: "'Noto Sans KR', sans-serif",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${target.color}aa`; e.currentTarget.style.color = target.color; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textMuted; }}
            >
              <span style={{ color: target.color, marginRight: 5 }}>{target.icon}</span>
              {c.label}
            </button>
          );
        })}
      </div>

      {/* 결과 카드 */}
      {result && recApp && (
        <div style={{
          marginTop: 18, padding: "16px 18px",
          background: T.card, border: `1px solid ${recApp.color}55`,
          borderRadius: 12, display: "flex", alignItems: "center", gap: 14,
          animation: "fadeUp 0.25s ease-out",
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: `${recApp.color}1A`, border: `1px solid ${recApp.color}55`, color: recApp.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
            {recApp.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: recApp.color, textTransform: "uppercase", marginBottom: 4 }}>추천</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>{recApp.sub}</div>
            <div style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.5 }}>{result.reason}</div>
          </div>
          <button onClick={() => goApp(result.appId)}
            style={{ padding: "8px 16px", borderRadius: 6, background: recApp.color, color: "#fff", border: 0, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
          >바로 이동 →</button>
        </div>
      )}

      {err && (
        <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontSize: 11, color: "#fca5a5", textAlign: "center" }}>
          {err}
        </div>
      )}
    </div>
  );
}
