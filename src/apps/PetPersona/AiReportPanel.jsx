// AI 심층 리포트 패널 — NEXUS(로그인·크레딧) 환경 전용.
// useUsageGate → AuthContext → firebase 의존성이 있어 별도 파일로 분리하고
// index.jsx 에서 lazy 로드 — 독립 PWA(pet.html) 번들에는 이 체인이 아예 포함되지 않는다.
import { useState } from "react";
import { useUsageGate } from "../../components/UsageGate";
import { generatePetReport } from "./services/gemini";

// index.jsx 와 동일 팔레트 (독립 번들 분리를 위해 의도적 중복)
const C = {
  bg: "#FBF5EA", card: "#FFFFFF", ink: "#3E362E", dim: "#A2937F",
  line: "#EEE3D2", accent: "#E8795E",
};
const card = { background: C.card, borderRadius: 20, padding: 20, boxShadow: "0 8px 30px rgba(160,130,90,0.12)", textAlign: "left" };

export default function AiReportPanel({ SP, who, type, T, score, answers, ownerMbti, compat, onText }) {
  const { ensureCanGenerate, modal: usageModal } = useUsageGate();
  const [ai, setAi] = useState({ loading: false, text: "", error: "" });

  const run = async () => {
    if (ai.loading) return;
    if (!(await ensureCanGenerate("analysis"))) return;
    setAi({ loading: true, text: "", error: "" });
    try {
      const observations = answers.map((p, i) => {
        const q = SP.questions[i];
        const chosen = q.a.p === p ? q.a : q.b;
        return { q: q.q, a: chosen.t };
      });
      const axisSummary = SP.axes
        .map(([l, r]) => `${l} ${score[l]} : ${score[r]} ${r}`)
        .join(" · ");
      const text = await generatePetReport({
        speciesLabel: SP.label, callName: SP.callName, name: who,
        type, typeName: T.n, typeDesc: T.d, axisSummary, observations,
        ownerMbti: ownerMbti || null, compat,
      });
      setAi({ loading: false, text, error: "" });
      onText?.(text);
    } catch (e) {
      setAi({ loading: false, text: "", error: e?.message || String(e) });
    }
  };

  return (
    <div style={{ ...card, marginTop: 14 }}>
      <div className="pet-jua" style={{ fontSize: 16, color: C.accent, marginBottom: 10 }}>🤖 AI 심층 리포트</div>
      {!ai.text && (
        <>
          <p style={{ fontSize: 13, lineHeight: 1.65, margin: "0 0 12px", color: C.dim }}>
            12개 관찰 응답을 AI가 읽고 {who}만의 속마음·맞춤 케어 꿀팁·집사 케미를 풀어드려요.
          </p>
          <button onClick={run} disabled={ai.loading} style={{
            width: "100%", padding: "14px 0", borderRadius: 14, border: "none", cursor: ai.loading ? "wait" : "pointer",
            background: C.accent, color: "#fff", fontFamily: "'Jua','Noto Sans KR',sans-serif", fontSize: 16,
            boxShadow: "0 6px 18px rgba(232,121,94,0.35)", opacity: ai.loading ? 0.7 : 1,
          }}>{ai.loading ? `${SP.emoji} 리포트 쓰는 중…` : `${SP.emoji} 심층 리포트 받기 (1c)`}</button>
        </>
      )}
      {ai.error && <p style={{ fontSize: 12.5, color: C.accent, margin: "10px 0 0" }}>{ai.error}</p>}
      {ai.text && (
        <div className="pet-pop">
          <p style={{ fontSize: 14, lineHeight: 1.8, margin: 0, color: C.ink, whiteSpace: "pre-line" }}>{ai.text}</p>
          <button onClick={run} disabled={ai.loading} style={{
            marginTop: 12, padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontSize: 12,
            border: `1.5px solid ${C.line}`, background: "transparent", color: C.dim, fontFamily: "inherit",
          }}>{ai.loading ? "쓰는 중…" : "다시 받기 (1c)"}</button>
        </div>
      )}
      <p style={{ fontSize: 10.5, color: C.dim, margin: "12px 0 0", lineHeight: 1.6 }}>
        ※ AI 리포트 사용 시 이름·관찰 응답이 Gemini API로 전송돼요. 의학적 진단이 아닌 재미용 해석입니다.
      </p>
      {usageModal}
    </div>
  );
}
