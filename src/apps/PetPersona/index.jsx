// 반려동물 MBTI — 고양이/강아지 성격 유형 테스트 (재미용).
// 유형 판정·궁합은 결정론 로직, AI 심층 리포트만 Gemini(분석 1c) 사용.
// standalone 모드(pet.html 독립 PWA): AI 패널(로그인·크레딧 필요)을 뺀 전체 기능.
import { Suspense, lazy, useState } from "react";
import { SPECIES, MBTI_LIST, ownerCompat, loadHistory, saveHistory, removeHistory } from "./constants";
import { sharePetResult, hasKakaoKey } from "./share";

// AI 패널만 별도 청크 — firebase/AuthContext 의존성이 독립 PWA 번들에 섞이지 않게 lazy.
const AiReportPanel = lazy(() => import("./AiReportPanel"));

/* ───────── 팔레트 — 따뜻한 크림 톤 (앱 고유 무드, 의도적 독자 팔레트) ───────── */
const C = {
  bg: "#FBF5EA", card: "#FFFFFF", ink: "#3E362E", dim: "#A2937F",
  line: "#EEE3D2", accent: "#E8795E", accent2: "#F2B441", soft: "#FCEEE4",
};

const card = { background: C.card, borderRadius: 20, padding: 20, boxShadow: "0 8px 30px rgba(160,130,90,0.12)", textAlign: "left" };

export default function App({ standalone = false }) {
  const [species, setSpecies] = useState("cat");
  const [phase, setPhase] = useState("intro");
  const [name, setName] = useState("");
  const [ownerMbti, setOwnerMbti] = useState("");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [history, setHistory] = useState(loadHistory);
  const [aiText, setAiText] = useState(""); // AI 리포트 본문 — 공유 텍스트에 포함용

  const SP = SPECIES[species];
  const QUESTIONS = SP.questions;

  const finish = (finalAnswers) => {
    setAnswers(finalAnswers);
    setPhase("result");
    // 검사 기록 저장 — 답변까지 저장해 기록에서 결과를 그대로 복원.
    const sc = tally(finalAnswers);
    const t = typeOf(sc);
    setHistory(saveHistory({
      name: name.trim(), species, type: t, answers: finalAnswers, ownerMbti,
    }));
  };

  const answer = (pole) => {
    const next = [...answers, pole];
    if (step + 1 < QUESTIONS.length) { setAnswers(next); setStep(step + 1); }
    else finish(next);
  };
  const back = () => { if (step > 0) { setAnswers(answers.slice(0, -1)); setStep(step - 1); } };
  const restart = () => {
    setPhase("intro"); setStep(0); setAnswers([]); setCopied(false); setShared(false);
    setAiText("");
  };
  const loadEntry = (e) => {
    setSpecies(e.species); setName(e.name || ""); setOwnerMbti(e.ownerMbti || "");
    setAnswers(e.answers); setStep(e.answers.length - 1); setCopied(false); setShared(false);
    setAiText("");
    setPhase("result");
  };

  const tally = (list) => {
    const s = { E: 0, I: 0, N: 0, S: 0, T: 0, F: 0, J: 0, P: 0 };
    list.forEach((p) => s[p]++);
    return s;
  };
  const typeOf = (s) =>
    (s.E >= s.I ? "E" : "I") + (s.N >= s.S ? "N" : "S") + (s.T >= s.F ? "T" : "F") + (s.J >= s.P ? "J" : "P");

  const score = tally(answers);
  const type = typeOf(score);
  const T = SP.types[type];
  const who = name.trim() || `우리 ${SP.callName}`;
  const compat = ownerCompat(type, ownerMbti, SP.types);

  const shareText =
    `${SP.emoji} 우리 ${SP.label} MBTI\n\n${who}는 ${type} 「${T?.n}」!\n${T?.d}\n\n` +
    `잘 맞는 집사 MBTI: ${T?.owner.join(", ")}\n집사 꿀팁: ${T?.tip}\n` +
    (compat ? `\n집사(${ownerMbti})와의 궁합: ${compat.score}점 · ${compat.t}\n${compat.c}\n` : "") +
    (aiText ? `\n[ AI 심층 리포트 ]\n${aiText}\n` : "") +
    `\n— 재미로 보는 반려동물 테스트 🐾`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(shareText); setCopied(true); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = shareText; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); setCopied(true); } catch { /* noop */ }
      document.body.removeChild(ta);
    }
    setTimeout(() => setCopied(false), 2000);
  };

  // 공유 링크는 항상 독립 PWA 페이지 — 받은 사람이 로그인 없이 바로 테스트 가능.
  const doShare = async () => {
    const r = await sharePetResult({
      title: `${SP.emoji} 우리 ${SP.label} MBTI`,
      text: shareText,
      url: `${window.location.origin}/pet.html`,
    });
    if (r === "copied") { setShared(true); setTimeout(() => setShared(false), 2000); }
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", background: C.bg, color: C.ink, fontFamily: "'Noto Sans KR', system-ui, sans-serif", padding: "30px 16px 60px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Jua&display=swap');
        @keyframes petPop{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}
        @keyframes petWig{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}
        .pet-jua{font-family:'Jua','Noto Sans KR',system-ui,sans-serif}
        .pet-pop{animation:petPop .4s cubic-bezier(.2,.7,.2,1) both}
        .pet-opt:active{transform:scale(.98)}
        @media(prefers-reduced-motion:reduce){.pet-pop{animation:none}}
      `}</style>

      <div style={{ maxWidth: 460, margin: "0 auto" }}>

        {phase === "intro" && (
          <div className="pet-pop" style={{ textAlign: "center", paddingTop: 12 }}>
            <div style={{ fontSize: 72, animation: "petWig 1.6s ease-in-out infinite", display: "inline-block" }}>{SP.emoji}</div>
            <p style={{ color: C.dim, fontSize: 14, margin: "12px 0 24px", lineHeight: 1.6 }}>
              집사가 관찰한 대로 12문항에 답하면<br />우리 {SP.callName}의 성격 유형이 나와요
            </p>

            {/* 종 선택 */}
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              {Object.values(SPECIES).map((s) => {
                const on = species === s.key;
                return (
                  <button key={s.key} onClick={() => setSpecies(s.key)} style={{
                    flex: 1, padding: "16px 0 13px", borderRadius: 18, cursor: "pointer",
                    border: `2px solid ${on ? C.accent : C.line}`,
                    background: on ? C.soft : C.card, transition: "all .15s",
                    boxShadow: on ? "0 6px 18px rgba(232,121,94,0.2)" : "none",
                  }}>
                    <div style={{ fontSize: 38 }}>{s.emoji}</div>
                    <div className="pet-jua" style={{ fontSize: 16, color: on ? C.accent : C.dim, marginTop: 4 }}>{s.label}</div>
                  </button>
                );
              })}
            </div>

            <div style={card}>
              <label style={{ fontSize: 13, color: C.dim, fontWeight: 600 }}>{SP.label} 이름 (선택)</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={SP.placeholder} maxLength={12}
                style={{ width: "100%", marginTop: 8, padding: "13px 15px", borderRadius: 12, border: `1.5px solid ${C.line}`, background: C.bg, color: C.ink, fontSize: 15, fontFamily: "inherit" }} />
              <label style={{ display: "block", fontSize: 13, color: C.dim, fontWeight: 600, marginTop: 14 }}>집사 MBTI (선택 · 궁합 계산에 사용)</label>
              <select value={ownerMbti} onChange={(e) => setOwnerMbti(e.target.value)}
                style={{ width: "100%", marginTop: 8, padding: "13px 15px", borderRadius: 12, border: `1.5px solid ${C.line}`, background: C.bg, color: ownerMbti ? C.ink : C.dim, fontSize: 15, fontFamily: "inherit" }}>
                <option value="">모름 / 건너뛰기</option>
                {MBTI_LIST.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <button onClick={() => { setStep(0); setAnswers([]); setPhase("quiz"); }} style={{ width: "100%", marginTop: 16, padding: "16px 0", borderRadius: 14, border: "none", background: C.accent, color: "#fff", fontFamily: "'Jua','Noto Sans KR',sans-serif", fontSize: 18, cursor: "pointer", boxShadow: "0 6px 18px rgba(232,121,94,0.35)" }}>테스트 시작하기</button>
            </div>

            {/* 검사 기록 */}
            {history.length > 0 && (
              <div style={{ ...card, marginTop: 14 }}>
                <div className="pet-jua" style={{ fontSize: 15, color: C.accent, marginBottom: 10 }}>📋 우리 집 검사 기록</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {history.map((e) => (
                    <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button onClick={() => loadEntry(e)} style={{
                        flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "10px 13px",
                        borderRadius: 12, border: `1.5px solid ${C.line}`, background: C.bg, cursor: "pointer",
                        fontFamily: "inherit", textAlign: "left",
                      }}>
                        <span style={{ fontSize: 20 }}>{SPECIES[e.species]?.emoji}</span>
                        <span style={{ fontSize: 14, color: C.ink, fontWeight: 600 }}>{e.name || `우리 ${SPECIES[e.species]?.callName}`}</span>
                        <span className="pet-jua" style={{ fontSize: 12.5, color: C.accent, letterSpacing: 1 }}>{e.type}</span>
                        <span style={{ fontSize: 13, color: C.dim }}>「{SPECIES[e.species]?.types[e.type]?.n}」</span>
                        <span style={{ marginLeft: "auto", fontSize: 11, color: C.dim }}>{e.date?.slice(5)}</span>
                      </button>
                      <button onClick={() => setHistory(removeHistory(e.id))} aria-label="기록 삭제" style={{
                        border: "none", background: "transparent", color: C.dim, fontSize: 16, cursor: "pointer", padding: "4px 6px",
                      }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p style={{ color: C.dim, fontSize: 11.5, marginTop: 18 }}>※ 재미로 보는 콘텐츠예요 🐾</p>
          </div>
        )}

        {phase === "quiz" && (
          <div>
            {/* 진행바 */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
              <button onClick={back} disabled={step === 0} style={{ border: "none", background: "transparent", color: step === 0 ? C.line : C.dim, fontSize: 22, cursor: step === 0 ? "default" : "pointer", padding: 0, width: 24 }}>‹</button>
              <div style={{ flex: 1, height: 8, borderRadius: 8, background: C.soft, overflow: "hidden" }}>
                <div style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${C.accent2}, ${C.accent})`, borderRadius: 8, transition: "width .35s" }} />
              </div>
              <span className="pet-jua" style={{ fontSize: 14, color: C.accent, minWidth: 40, textAlign: "right" }}>{step + 1}/{QUESTIONS.length}</span>
            </div>

            <div key={step} className="pet-pop" style={{ ...card, borderRadius: 22, padding: "30px 22px" }}>
              <div style={{ fontSize: 34, textAlign: "center", marginBottom: 12 }}>{SP.quizEmoji}</div>
              <h2 className="pet-jua" style={{ fontSize: 22, textAlign: "center", lineHeight: 1.4, margin: "0 0 24px", color: C.ink }}>{QUESTIONS[step].q}</h2>
              {["a", "b"].map((k) => (
                <button key={k} className="pet-opt" onClick={() => answer(QUESTIONS[step][k].p)}
                  style={{ display: "block", width: "100%", marginBottom: 12, padding: "18px 18px", borderRadius: 16, border: `1.5px solid ${C.line}`, background: C.bg, color: C.ink, fontSize: 15.5, lineHeight: 1.5, textAlign: "left", cursor: "pointer", transition: "transform .1s, border-color .15s, background .15s", fontFamily: "inherit" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.background = C.soft; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.line; e.currentTarget.style.background = C.bg; }}>
                  {QUESTIONS[step][k].t}
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === "result" && T && (
          <div className="pet-pop" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 60, marginBottom: 4 }}>{SP.resultEmoji}</div>
            <p style={{ color: C.dim, fontSize: 14, margin: "0 0 2px" }}>{who}는</p>
            <div className="pet-jua" style={{ display: "inline-block", background: C.accent, color: "#fff", fontSize: 15, letterSpacing: 3, padding: "5px 16px", borderRadius: 20, margin: "4px 0 8px" }}>{type}</div>
            <h1 className="pet-jua" style={{ fontSize: 32, margin: "2px 0 14px", color: C.ink }}>「{T.n}」</h1>

            <div style={{ ...card, padding: 22 }}>
              <p style={{ fontSize: 15, lineHeight: 1.75, margin: 0, color: C.ink }}>{T.d}</p>

              {/* 축 성향 바 */}
              <div style={{ display: "grid", gap: 10, margin: "20px 0 4px" }}>
                {SP.axes.map(([l, r, ln, rn], i) => {
                  const lv = score[l], rv = score[r], total = lv + rv || 1, leftWin = lv >= rv;
                  return (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: leftWin ? C.accent : C.dim, fontWeight: leftWin ? 700 : 400 }}>{ln} {l}</span>
                        <span style={{ color: !leftWin ? C.accent : C.dim, fontWeight: !leftWin ? 700 : 400 }}>{r} {rn}</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 8, background: C.soft, overflow: "hidden", display: "flex" }}>
                        <div style={{ width: `${(lv / total) * 100}%`, background: leftWin ? C.accent : C.line }} />
                        <div style={{ width: `${(rv / total) * 100}%`, background: !leftWin ? C.accent : C.line }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 집사 궁합 */}
            {compat && (
              <div style={{ ...card, marginTop: 14 }}>
                <div className="pet-jua" style={{ fontSize: 16, color: C.accent, marginBottom: 12 }}>💞 집사({ownerMbti})와의 궁합</div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                  <span className="pet-jua" style={{ fontSize: 38, color: C.accent }}>{compat.score}<span style={{ fontSize: 16 }}>점</span></span>
                  <span className="pet-jua" style={{ fontSize: 17, color: C.ink, padding: "6px 14px", borderRadius: 12, background: C.soft }}>{compat.t}</span>
                </div>
                <div style={{ height: 10, borderRadius: 8, background: C.soft, overflow: "hidden", marginBottom: 10 }}>
                  <div style={{ width: `${compat.score}%`, height: "100%", background: `linear-gradient(90deg, ${C.accent2}, ${C.accent})`, borderRadius: 8 }} />
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0, color: C.ink }}>{compat.c}</p>
              </div>
            )}

            <div style={{ ...card, marginTop: 14 }}>
              <div className="pet-jua" style={{ fontSize: 16, color: C.accent, marginBottom: 10 }}>🧑 잘 맞는 집사 MBTI</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {T.owner.map((m) => <span key={m} className="pet-jua" style={{ fontSize: 15, letterSpacing: 1, padding: "7px 14px", borderRadius: 12, background: C.soft, color: C.accent }}>{m}</span>)}
              </div>
              <div className="pet-jua" style={{ fontSize: 16, color: C.accent, marginBottom: 8 }}>🐾 집사 꿀팁</div>
              <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0, color: C.ink }}>{T.tip}</p>
            </div>

            {/* AI 심층 리포트 — 독립 PWA(standalone)에선 로그인·크레딧이 없어 제외 */}
            {!standalone && (
              <Suspense fallback={null}>
                <AiReportPanel SP={SP} who={who} type={type} T={T} score={score}
                  answers={answers} ownerMbti={ownerMbti} compat={compat} onText={setAiText} />
              </Suspense>
            )}

            {/* 카카오톡 공유 — SDK 키 없으면 OS 공유시트/클립보드 폴백 */}
            <button onClick={doShare} style={{
              width: "100%", marginTop: 16, padding: "15px 0", borderRadius: 14, border: "none",
              background: shared ? "#7CB342" : "#FEE500", color: shared ? "#fff" : "#191919",
              fontFamily: "'Jua','Noto Sans KR',sans-serif", fontSize: 16, cursor: "pointer",
              transition: "background .2s", boxShadow: "0 6px 18px rgba(242,180,65,0.3)",
            }}>{shared ? "링크가 복사됐어요 ✓" : hasKakaoKey ? "💬 카카오톡으로 공유하기" : "💬 친구에게 공유하기"}</button>

            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button onClick={copy} style={{ flex: 1, padding: "15px 0", borderRadius: 14, border: "none", background: copied ? "#7CB342" : C.accent, color: "#fff", fontFamily: "'Jua','Noto Sans KR',sans-serif", fontSize: 16, cursor: "pointer", transition: "background .2s" }}>{copied ? "복사됐어요 ✓" : "결과 복사"}</button>
              <button onClick={restart} style={{ flex: 1, padding: "15px 0", borderRadius: 14, border: `1.5px solid ${C.accent}`, background: "transparent", color: C.accent, fontFamily: "'Jua','Noto Sans KR',sans-serif", fontSize: 16, cursor: "pointer" }}>다시 하기</button>
            </div>
            <p style={{ color: C.dim, fontSize: 11.5, marginTop: 16 }}>※ 재미로 보는 콘텐츠예요 🐾</p>
          </div>
        )}
      </div>
    </div>
  );
}
