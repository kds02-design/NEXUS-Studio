// AI(Gemini) 섹션 4종 — NEXUS(로그인·크레딧) 환경 전용.
// useUsageGate → AuthContext → firebase 의존성이 있어 별도 파일로 분리하고 index.jsx 에서
// lazy 로드 — 독립 PWA(destiny.html) 번들에는 이 체인이 아예 포함되지 않는다.
import { useState } from "react";
import { useUsageGate } from "../../components/UsageGate";
import { C, OH_GLYPH, OH_EASY, LUCK_COLOR, inp } from "./shared";
import { Panel, Eyebrow } from "./ui";
import { generateOracleSummary, askOracle, generateTarotReading, generateTalisman } from "./services/gemini";

/* ── 1. AI 관측사의 심층 예언 — "운명은 이렇게 말한다" 패널 하단 ── */
export function OracleSection({ brief, summary, onText }) {
  const { ensureCanGenerate, modal } = useUsageGate();
  const [oracle, setOracle] = useState({ loading: false, text: "", error: "" });

  const run = async () => {
    if (oracle.loading) return;
    if (!(await ensureCanGenerate("analysis"))) return;
    setOracle({ loading: true, text: "", error: "" });
    try {
      const text = await generateOracleSummary(brief, summary);
      setOracle({ loading: false, text, error: "" });
      onText?.(text);
    } catch (e) {
      setOracle({ loading: false, text: "", error: e?.message || String(e) });
    }
  };

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
      {!oracle.text && (
        <button onClick={run} disabled={oracle.loading} style={{
          width: "100%", padding: "13px 0", borderRadius: 12, cursor: oracle.loading ? "wait" : "pointer",
          border: `1px solid ${C.gold}`, background: "rgba(245,135,15,0.10)", color: C.goldSoft,
          fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: 1,
          opacity: oracle.loading ? 0.7 : 1,
        }}>{oracle.loading ? "관측사가 별을 읽는 중…" : "✦ AI 관측사의 심층 예언 듣기 (1c)"}</button>
      )}
      {oracle.error && <p style={{ fontSize: 11.5, color: C.화, margin: "8px 0 0", textAlign: "center" }}>{oracle.error}</p>}
      {oracle.text && (
        <div className="destiny-reveal">
          <div style={{ fontSize: 11, letterSpacing: 3, color: C.gold, marginBottom: 10 }}>AI 관측사의 심층 예언</div>
          <p className="serif" style={{ fontSize: 14.5, lineHeight: 1.95, margin: 0, whiteSpace: "pre-line", letterSpacing: "0.01em" }}>{oracle.text}</p>
          <button onClick={run} disabled={oracle.loading} style={{
            marginTop: 12, padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 11.5,
            border: `1px solid ${C.line}`, background: "transparent", color: C.dim,
          }}>{oracle.loading ? "다시 읽는 중…" : "다시 예언 듣기 (1c)"}</button>
        </div>
      )}
      {modal}
    </div>
  );
}

/* ── 2. 오늘의 타로 × 명식 맞춤 풀이 — 카드 오픈 후 노출 ── */
export function TarotAiSection({ brief, card, todayStr }) {
  const { ensureCanGenerate, modal } = useUsageGate();
  const [tarotAi, setTarotAi] = useState({ loading: false, text: "", error: "" });

  const run = async () => {
    if (tarotAi.loading) return;
    if (!(await ensureCanGenerate("analysis"))) return;
    setTarotAi({ loading: true, text: "", error: "" });
    try {
      const text = await generateTarotReading(brief, card, todayStr);
      setTarotAi({ loading: false, text, error: "" });
    } catch (e) {
      setTarotAi({ loading: false, text: "", error: e?.message || String(e) });
    }
  };

  return (
    <div style={{ marginTop: 14 }}>
      {!tarotAi.text && (
        <button onClick={run} disabled={tarotAi.loading} style={{
          padding: "10px 20px", borderRadius: 10, cursor: tarotAi.loading ? "wait" : "pointer",
          border: `1px solid ${C.gold}`, background: "rgba(245,135,15,0.10)", color: C.goldSoft,
          fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 600, fontSize: 12.5,
          opacity: tarotAi.loading ? 0.7 : 1,
        }}>{tarotAi.loading ? "카드를 명식에 비추는 중…" : "내 명식으로 카드 풀이 (AI · 1c)"}</button>
      )}
      {tarotAi.error && <p style={{ fontSize: 11.5, color: C.화, margin: "8px 0 0" }}>{tarotAi.error}</p>}
      {tarotAi.text && (
        <p className="destiny-reveal" style={{
          fontSize: 13, color: C.ink, margin: "4px auto 0", lineHeight: 1.8, maxWidth: 340,
          whiteSpace: "pre-line", textAlign: "left", padding: "12px 14px",
          borderRadius: 10, border: `1px solid ${C.line}`, background: "rgba(24,24,22,0.4)",
        }}>{tarotAi.text}</p>
      )}
      {modal}
    </div>
  );
}

/* ── 3. 행운 부적 이미지 생성 ── */
export function TalismanPanel({ yong, coined }) {
  const { ensureCanGenerate, modal } = useUsageGate();
  const [talisman, setTalisman] = useState({ loading: false, url: "", error: "" });

  const run = async () => {
    if (talisman.loading) return;
    if (!(await ensureCanGenerate("image"))) return;
    setTalisman((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const url = await generateTalisman({
        yongGlyph: OH_GLYPH[yong],
        luckColorNames: LUCK_COLOR[yong].name,
        luckColorHex: LUCK_COLOR[yong].hex.join(", "),
        archetype: coined,
      });
      setTalisman({ loading: false, url, error: "" });
    } catch (e) {
      setTalisman((prev) => ({ ...prev, loading: false, error: e?.message || String(e) }));
    }
  };

  return (
    <Panel style={{ textAlign: "center" }}>
      <Eyebrow>행운 부적 · AI 생성</Eyebrow>
      {talisman.url ? (
        <div className="destiny-reveal">
          <img src={talisman.url} alt={`${OH_EASY[yong].n}(${yong}) 행운 부적`} style={{
            width: 220, maxWidth: "80%", borderRadius: 14, border: `2px solid ${C.gold}`,
            display: "block", margin: "0 auto 12px", boxShadow: "0 10px 30px rgba(245,135,15,0.25)",
          }} />
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <a href={talisman.url} download={`행운부적_${OH_EASY[yong].n}.png`} style={{
              padding: "10px 20px", borderRadius: 10, textDecoration: "none",
              background: C.gold, color: "#141412",
              fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: 12.5,
            }}>부적 다운로드</a>
            <button onClick={run} disabled={talisman.loading} style={{
              padding: "10px 16px", borderRadius: 10, cursor: "pointer", fontSize: 12,
              border: `1px solid ${C.line}`, background: "transparent", color: C.dim,
            }}>{talisman.loading ? "그리는 중…" : "다시 생성 (10c)"}</button>
          </div>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 12.5, color: C.dim, margin: "0 0 12px", lineHeight: 1.65 }}>
            용신 '{OH_EASY[yong].n}({yong})' 문양과 행운 컬러({LUCK_COLOR[yong].name})를 담은
            나만의 부적 카드를 AI가 그려드려요.
          </p>
          <button onClick={run} disabled={talisman.loading} style={{
            padding: "13px 32px", borderRadius: 12, cursor: talisman.loading ? "wait" : "pointer", border: "none",
            background: C.gold, color: "#141412",
            fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: 1,
            opacity: talisman.loading ? 0.7 : 1,
          }}>{talisman.loading ? "부적을 그리는 중… (최대 1분)" : `☾ ${OH_GLYPH[yong]} 부적 생성하기 (10c)`}</button>
        </>
      )}
      {talisman.error && <p style={{ fontSize: 11.5, color: C.화, margin: "10px 0 0" }}>{talisman.error}</p>}
      {modal}
    </Panel>
  );
}

/* ── 4. 관측소에 물어보기 (명식 기반 상담) ── */
export function ConsultPanel({ brief }) {
  const { ensureCanGenerate, modal } = useUsageGate();
  const [chat, setChat] = useState([]); // [{ q, a }]
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatErr, setChatErr] = useState("");

  const submit = async () => {
    const q = chatInput.trim();
    if (!q || chatBusy) return;
    if (!(await ensureCanGenerate("analysis"))) return;
    setChatBusy(true); setChatErr("");
    try {
      const a = await askOracle(brief, q, chat.slice(-4));
      setChat((prev) => [...prev, { q, a }]);
      setChatInput("");
    } catch (e) {
      setChatErr(e?.message || String(e));
    } finally {
      setChatBusy(false);
    }
  };

  return (
    <Panel>
      <Eyebrow>관측소에 물어보기 · AI 상담</Eyebrow>
      {chat.length > 0 && (
        <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
          {chat.map((c, i) => (
            <div key={i} className="destiny-reveal">
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                <span style={{ maxWidth: "85%", padding: "9px 13px", borderRadius: "12px 12px 3px 12px", background: "rgba(245,135,15,0.14)", border: `1px solid ${C.line}`, color: C.goldSoft, fontSize: 13, lineHeight: 1.6 }}>{c.q}</span>
              </div>
              <div style={{ display: "flex" }}>
                <span style={{ maxWidth: "92%", padding: "11px 14px", borderRadius: "12px 12px 12px 3px", background: "rgba(24,24,22,0.5)", border: `1px solid ${C.line}`, color: C.ink, fontSize: 13, lineHeight: 1.75, whiteSpace: "pre-line" }}>{c.a}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) submit(); }}
          placeholder="고민을 한 줄로 적어보세요 (예: 올해 이직해도 될까요?)"
          maxLength={200} disabled={chatBusy}
          style={{ ...inp, width: "auto" }}
        />
        <button onClick={submit} disabled={chatBusy || !chatInput.trim()} style={{
          flex: "0 0 92px", borderRadius: 10, cursor: chatBusy ? "wait" : "pointer", border: "none",
          background: C.gold, color: "#141412",
          fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: 13,
          opacity: (chatBusy || !chatInput.trim()) ? 0.55 : 1,
        }}>{chatBusy ? "읽는 중…" : "묻기 (1c)"}</button>
      </div>
      {chatErr && <p style={{ fontSize: 11.5, color: C.화, margin: "8px 0 0" }}>{chatErr}</p>}
      <p style={{ fontSize: 10.5, color: C.dim, margin: "10px 0 0", lineHeight: 1.6 }}>
        ※ AI 기능(예언·타로 풀이·상담·부적)을 사용하면 생년월일·이름 등 명식 정보가 Gemini API로 전송돼요.
        답변은 재미로만 참고해 주세요. 크레딧: 텍스트 1c · 부적 이미지 10c.
      </p>
      {modal}
    </Panel>
  );
}
