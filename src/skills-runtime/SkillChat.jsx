// 대화형 스킬 오버레이 — 채팅창 하나가 스킬 선택부터 생성까지 담당.
// 열면 스킬 선택 화면 → 고르면 대화 시작(요청 입력 → 옵션 자동 매핑 → 못 채운 필수만 되물음 →
// 요약 확인/수정 → ensureCanGenerate → 구글 이미지 API 호출 → 결과). 창 안에서 스킬 전환 가능.
// 세션 로직은 매니페스트(registry)만으로 동작 — 스킬을 추가해도 이 파일은 그대로 재사용된다.
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Download, Loader2, RotateCcw, Scissors, Send, Sparkles, Upload, Wand2, X } from "lucide-react";
import { useGlobal, useTheme } from "../context/GlobalContext";
import { useUsageGate } from "../components/UsageGate";
import { SKILL_REGISTRY, SKILL_MAP } from "./registry";
import { resolveSlots } from "./slotResolver";
import { smartTransparentPng } from "../lib/smartTransparency";

// 투명 미리보기용 체커보드 배경.
const CHECKER = "repeating-conic-gradient(rgba(255,255,255,.14) 0% 25%, transparent 0% 50%) 50% / 16px 16px";

const uid = (() => { let n = 0; return () => `m${++n}`; })();
const isFileSlot = (slot) => slot?.type === "file" || slot?.type === "files";

// PNG 다운로드 — 렌더 순수성 규칙을 피하려 모듈 스코프에 둔다(클릭 핸들러에서만 호출).
function downloadPng(url, name) {
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}_${Date.now()}.png`;
  a.click();
}

const readFileAsDataUrl = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = rej;
  r.readAsDataURL(file);
});

// 파일 첨부 UI — 단일/다중 이미지 슬롯을 채팅 안에서 업로드.
function UploadBlock({ T, accent, upload, values, onFile, onAdd, onRemove, onDone }) {
  const ref = useRef(null);
  const { slotKey, multi, min } = upload;
  const list = values[slotKey];
  const ready = multi ? Array.isArray(list) && list.length >= min : false;
  const readMany = (files) => {
    const arr = [...(files || [])].filter((f) => f.type?.startsWith("image/"));
    if (!arr.length) return;
    Promise.all(arr.map(readFileAsDataUrl)).then((urls) => {
      if (multi) onAdd(slotKey, urls);
      else if (urls[0]) onFile(slotKey, urls[0]);
    });
  };
  return (
    <div style={{ marginTop: 8 }}>
      {multi && Array.isArray(list) && list.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))", gap: 6, marginBottom: 8 }}>
          {list.map((u, i) => (
            <div key={i} style={{ position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden", border: `1px solid ${T.border}`, background: "#0b0c10" }}>
              <img src={u} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              <button onClick={() => onRemove(slotKey, i)} style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: 5, background: "rgba(0,0,0,.7)", border: `1px solid ${T.border}`, color: "#fff", cursor: "pointer", display: "grid", placeItems: "center", padding: 0 }}><X size={10} /></button>
            </div>
          ))}
        </div>
      )}
      <div onClick={() => ref.current?.click()} onDrop={(e) => { e.preventDefault(); readMany(e.dataTransfer.files); }} onDragOver={(e) => e.preventDefault()} style={{ border: `1.5px dashed ${accent}66`, borderRadius: 10, padding: 16, textAlign: "center", cursor: "pointer", background: `${accent}08`, color: T.textMuted, fontSize: 12 }}>
        <Upload size={18} color={accent} />
        <div style={{ marginTop: 6, fontWeight: 700, color: T.text }}>{multi ? "이미지 추가 (여러 장)" : "이미지 올리기"}</div>
        <div style={{ marginTop: 2 }}>클릭 또는 드래그</div>
        <input ref={ref} type="file" accept="image/*" multiple={multi} hidden onChange={(e) => { readMany(e.target.files); e.target.value = ""; }} />
      </div>
      {multi && (
        <button onClick={() => onDone(slotKey)} disabled={!ready} style={{ marginTop: 8, width: "100%", padding: 10, borderRadius: 9, border: 0, background: ready ? accent : T.border, color: ready ? "#061b1d" : T.textMuted, fontWeight: 800, cursor: ready ? "pointer" : "default" }}>
          {Array.isArray(list) ? list.length : 0}장 · 다음
        </button>
      )}
    </div>
  );
}

// ─── 셸: 오버레이 + 헤더 + (스킬 선택 | 세션) ──────────────────────────────
export default function SkillChat({ openId, onClose }) {
  const open = openId !== null && openId !== undefined;
  const T = useTheme();
  const { isLight } = useGlobal();
  // 초기 활성 스킬 = openId(팔레트에서 특정 스킬로 진입 시). '' 이거나 없으면 선택 화면.
  const [activeId, setActiveId] = useState(openId || null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") { e.preventDefault(); onClose?.(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const skill = activeId ? SKILL_MAP[activeId] : null;
  const accent = skill?.color || T.accent;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 50000, background: isLight ? "rgba(0,0,0,0.25)" : "rgba(5,5,12,0.55)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }} />
      <div onClick={(e) => e.stopPropagation()} style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "min(680px, calc(100vw - 32px))", height: "min(760px, calc(100vh - 64px))", zIndex: 50001, background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, boxShadow: isLight ? "0 24px 60px rgba(0,0,0,0.15)" : "0 24px 60px rgba(0,0,0,0.55)", overflow: "hidden", display: "flex", flexDirection: "column", fontFamily: "'Noto Sans KR', sans-serif" }}>
        {/* 헤더 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", borderBottom: `1px solid ${T.border}` }}>
          {skill && (
            <button onClick={() => setActiveId(null)} title="스킬 목록으로" style={{ width: 28, height: 28, border: `1px solid ${T.border}`, borderRadius: 7, background: "transparent", color: T.textMuted, cursor: "pointer", display: "grid", placeItems: "center" }}><ChevronLeft size={16} /></button>
          )}
          <span style={{ width: 30, height: 30, borderRadius: 8, background: `${accent}1f`, border: `1px solid ${accent}40`, display: "grid", placeItems: "center", color: accent }}><Sparkles size={15} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{skill ? skill.label : "AI 생성 스킬"}</div>
            <div style={{ fontSize: 10, color: T.textMuted }}>{skill ? `${skill.sub} · 대화형 생성` : "무엇을 만들지 골라주세요"}</div>
          </div>
          <button onClick={onClose} title="닫기 (ESC)" style={{ width: 28, height: 28, border: 0, borderRadius: 6, background: "transparent", color: T.textMuted, cursor: "pointer" }}><X size={16} /></button>
        </div>

        {/* 본문 */}
        {skill
          ? <SkillSession key={activeId} skill={skill} T={T} onClose={onClose} />
          : <SkillPicker T={T} onPick={setActiveId} />}
      </div>
    </>
  );
}

// ─── 스킬 선택 화면 ────────────────────────────────────────────────────
function SkillPicker({ T, onPick }) {
  return (
    <div className="cp-scroll" style={{ flex: 1, overflowY: "auto", padding: 16 }}>
      <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.6, marginBottom: 14 }}>
        요청을 말하면 필요한 것만 되묻고 바로 만들어 드려요. 먼저 무엇을 만들지 골라주세요.
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {SKILL_REGISTRY.map((s) => (
          <button key={s.id} onClick={() => onPick(s.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", textAlign: "left", background: `${s.color}10`, border: `1px solid ${s.color}44`, borderRadius: 12, cursor: "pointer" }}>
            <span style={{ width: 38, height: 38, borderRadius: 9, flexShrink: 0, display: "grid", placeItems: "center", background: `${s.color}1f`, border: `1px solid ${s.color}40`, color: s.color }}><Sparkles size={17} /></span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13, fontWeight: 800, color: T.text }}>{s.label}</span>
              <span style={{ display: "block", fontSize: 11, color: T.textMuted, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.sub} · 요청 입력 → 자동 생성</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── 세션: 한 스킬의 대화→생성 루프 (activeId 로 remount 되어 상태가 깨끗) ──────
function SkillSession({ skill, T, onClose }) {
  const { ensureCanGenerate, modal } = useUsageGate();
  const { navigate } = useGlobal();
  const [messages, setMessages] = useState(() => [{ id: uid(), role: "assistant", text: skill.intro }]);
  const [values, setValues] = useState({});
  const [pending, setPending] = useState([]);
  const [phase, setPhase] = useState("intro"); // intro | resolving | asking | ready | rendering | done
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const accent = skill.color;

  const push = (m) => setMessages((prev) => [...prev, { id: uid(), ...m }]);
  const replaceLast = (m) => setMessages((prev) => prev.map((x, i) => (i === prev.length - 1 ? { ...x, ...m } : x)));

  useEffect(() => { const t = requestAnimationFrame(() => inputRef.current?.focus()); return () => cancelAnimationFrame(t); }, []);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  // 슬롯 옵션 — 정적 배열이거나, 상위 선택에 종속된 함수(v => [...]). 러너가 양쪽을 처리.
  const optsOf = (slot, vals) => (typeof slot?.options === "function" ? slot.options(vals) : slot?.options) || [];
  const labelOf = (slotKey, id, vals) => {
    const slot = skill.slots.find((s) => s.key === slotKey);
    return optsOf(slot, vals).find((o) => o.id === id)?.label || id;
  };
  // 슬롯이 채워졌는지 — 파일 슬롯은 dataURL(단일) / min 장수 이상(다중) 이어야 완료.
  const isFilled = (slot, v) => {
    if (!slot) return v != null;
    if (slot.type === "files") return Array.isArray(v) && v.length >= (slot.min || 1);
    if (slot.type === "file") return typeof v === "string" && !!v;
    return v != null && v !== "";
  };
  const slotSummary = (s, vals) => {
    if (s.type === "file") return vals[s.key] ? "이미지 첨부됨" : "미첨부";
    if (s.type === "files") return `이미지 ${Array.isArray(vals[s.key]) ? vals[s.key].length : 0}장`;
    return labelOf(s.key, vals[s.key], vals);
  };

  const goReady = (nextValues) => {
    setPhase("ready");
    const summary = skill.slots.map((s) => `· ${s.label}: ${slotSummary(s, nextValues)}`).join("\n");
    push({ role: "assistant", text: `이렇게 만들게요 — 필요하면 아래에서 바꿀 수 있어요.\n${summary}`, ready: true });
  };

  // 되물을 슬롯 큐를 소진: 파일 슬롯은 업로드, 옵션 1개면 자동 채움, 종속 슬롯은 자유텍스트 추론, 나머지는 칩.
  const advance = async (nextValues, queueIn) => {
    const queue = queueIn.filter((k) => !isFilled(skill.slots.find((s) => s.key === k), nextValues[k]));
    if (queue.length === 0) { setValues(nextValues); goReady(nextValues); return; }
    const head = queue[0];
    const rest = queue.slice(1);
    const slot = skill.slots.find((s) => s.key === head);

    if (isFileSlot(slot)) {
      setValues(nextValues);
      push({ role: "assistant", text: slot.question, upload: { slotKey: head, multi: slot.type === "files", min: slot.min || 1 } });
      setPending(queue);
      setPhase("asking");
      return;
    }

    const opts = optsOf(slot, nextValues);
    if (opts.length === 0) { await advance(nextValues, rest); return; } // 후보 없음 → 건너뜀(렌더 시 기본값)
    if (opts.length === 1) {
      const nv = { ...nextValues, [head]: opts[0].id };
      setValues(nv);
      await advance(nv, rest);
      return;
    }
    const userText = nextValues[skill.freeTextKey];
    if (typeof slot.options === "function" && userText) {
      const r = await resolveSlots(userText, [{ ...slot, options: opts }]);
      if (r[head]) {
        const nv = { ...nextValues, [head]: r[head] };
        setValues(nv);
        push({ role: "user", text: labelOf(head, r[head], nv) });
        await advance(nv, rest);
        return;
      }
    }
    setValues(nextValues);
    push({ role: "assistant", text: slot.question, chips: opts.map((o) => ({ label: o.label, slotKey: head, id: o.id })) });
    setPending(queue);
    setPhase("asking");
  };

  const submitText = async () => {
    const text = input.trim();
    if (!text || phase === "resolving" || phase === "rendering") return;
    setInput("");
    push({ role: "user", text });
    setPhase("resolving");
    push({ role: "assistant", text: "설정을 분석하고 있어요…", loading: true });

    const staticSlots = skill.slots.filter((s) => typeof s.options !== "function");
    const filled = await resolveSlots(text, staticSlots);
    const next = { ...values, [skill.freeTextKey]: text, ...filled };
    for (const s of skill.slots) {
      if (next[s.key] == null && !s.required && s.default != null) next[s.key] = s.default;
    }
    replaceLast({ text: Object.keys(filled).length ? "요청을 반영했어요." : "좋아요, 몇 가지만 확인할게요.", loading: false });

    const queue = skill.slots.filter((s) => !isFilled(s, next[s.key])).map((s) => s.key);
    await advance(next, queue);
  };

  const onChip = async (slotKey, id) => {
    if (phase === "rendering") return;
    const next = { ...values, [slotKey]: id };
    setValues(next);
    push({ role: "user", text: labelOf(slotKey, id, next) });
    if (phase === "asking") await advance(next, pending.filter((k) => k !== slotKey));
  };

  // ── 파일 슬롯 핸들러 ──
  const setFile = async (slotKey, dataUrl) => {
    const next = { ...values, [slotKey]: dataUrl };
    setValues(next);
    push({ role: "user", text: "이미지 첨부됨", image: dataUrl });
    if (phase === "asking") await advance(next, pending.filter((k) => k !== slotKey));
  };
  const addFiles = (slotKey, urls) => setValues((prev) => ({ ...prev, [slotKey]: [...(prev[slotKey] || []), ...urls] }));
  const removeFile = (slotKey, idx) => setValues((prev) => ({ ...prev, [slotKey]: (prev[slotKey] || []).filter((_, i) => i !== idx) }));
  const filesDone = async (slotKey) => {
    push({ role: "user", text: `이미지 ${(values[slotKey] || []).length}장 첨부됨` });
    if (phase === "asking") await advance(values, pending.filter((k) => k !== slotKey));
  };

  const generate = async () => {
    if (phase === "rendering") return;
    if (!(await ensureCanGenerate(skill.action))) return; // 크레딧 부족 → 모달
    setPhase("rendering");
    push({ role: "assistant", text: "생성 중이에요…", loading: true });
    try {
      const r = await skill.render(values);
      if (!r?.ok || !r?.dataUrl) throw new Error(r?.error || "결과가 비어 있습니다.");
      replaceLast({ text: "완성됐어요.", loading: false, image: r.dataUrl });
      setPhase("done");
    } catch (e) {
      replaceLast({ text: `생성 실패: ${e?.message || e}`, loading: false, error: true });
      setPhase("ready");
    }
  };

  const restart = () => {
    setValues({});
    setPending([]);
    setPhase("intro");
    setMessages([{ id: uid(), role: "assistant", text: skill.intro }]);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  // ── 배경 투명화 ──
  // 자동: smartTransparentPng 가 배경을 분석해 루마키/색상키를 스스로 선택. 복잡 배경이면 Mask Forge 권유.
  const [txBusy, setTxBusy] = useState(false);
  const makeTransparent = async (dataUrl) => {
    if (txBusy) return;
    setTxBusy(true);
    push({ role: "assistant", text: "배경을 분석해 자동 투명화 중…", loading: true });
    try {
      const r = await smartTransparentPng(dataUrl);
      if (r.ok) replaceLast({ text: `투명 PNG 완성 — ${r.method === "luma" ? "발광 루마키" : "색상 키"}로 분리했어요.`, loading: false, image: r.dataUrl, transparent: true });
      else replaceLast({ text: r.reason === "complex" ? "배경이 복잡해 자동 투명화가 어려워요. Mask Forge의 AI 배경 제거로 보내는 게 좋아요." : "이 이미지는 자동 투명화가 안 돼요 (원격 이미지 제약). Mask Forge에서 처리하세요.", loading: false, maskForge: dataUrl });
    } catch (e) {
      replaceLast({ text: `투명화 실패: ${e?.message || e}`, loading: false, error: true });
    } finally { setTxBusy(false); }
  };
  const toMaskForge = (dataUrl) => { navigate("mask-forge", { source: "skill", image: { url: dataUrl, metadata: {} } }); onClose?.(); };

  const chipStyle = (on) => ({ padding: "6px 12px", borderRadius: 999, border: `1px solid ${on ? accent : T.border}`, background: on ? `${accent}20` : T.surface, color: on ? accent : T.textMuted, cursor: "pointer", fontSize: 12, fontWeight: 700 });

  return (
    <>
      <div ref={scrollRef} className="cp-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((m) => (
          <div key={m.id} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%" }}>
            <div style={{ padding: "10px 13px", borderRadius: 12, whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.55, background: m.role === "user" ? `${accent}18` : T.surface, border: `1px solid ${m.error ? "#f8717155" : T.border}`, color: m.error ? "#f87171" : T.text }}>
              {m.loading ? <span style={{ display: "inline-flex", gap: 7, alignItems: "center", color: T.textMuted }}><Loader2 size={14} className="animate-spin" /> {m.text}</span> : m.text}
              {/* 업로드한 원본 미리보기 (사용자 메시지) */}
              {m.image && m.role === "user" && (
                <div style={{ marginTop: 8 }}><img src={m.image} alt="첨부" style={{ maxWidth: 160, borderRadius: 8, border: `1px solid ${T.border}`, display: "block" }} /></div>
              )}
              {/* 생성/투명화 결과 (어시스턴트 메시지) */}
              {m.image && m.role !== "user" && (
                <div style={{ marginTop: 10 }}>
                  <img src={m.image} alt="결과" style={{ width: "100%", borderRadius: 10, background: m.transparent ? CHECKER : "#000", display: "block" }} />
                  {m.transparent ? (
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button onClick={() => downloadPng(m.image, `${skill.id}_transparent`)} style={{ ...chipStyle(false), display: "flex", gap: 6, alignItems: "center" }}><Download size={13} /> 투명 PNG</button>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        <button onClick={() => downloadPng(m.image, skill.id)} style={{ ...chipStyle(false), display: "flex", gap: 6, alignItems: "center" }}><Download size={13} /> PNG</button>
                        <button onClick={generate} style={{ ...chipStyle(false), display: "flex", gap: 6, alignItems: "center" }}><RotateCcw size={13} /> 다시 생성</button>
                        <button onClick={restart} style={{ ...chipStyle(false), display: "flex", gap: 6, alignItems: "center" }}><Wand2 size={13} /> 새 요청</button>
                      </div>
                      {skill.transparent !== "none" && (
                        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                          {skill.transparent === "ai" ? (
                            <button onClick={() => toMaskForge(m.image)} style={{ ...chipStyle(false), display: "flex", gap: 6, alignItems: "center" }}><Scissors size={13} /> 배경 제거 (Mask Forge)</button>
                          ) : (
                            <>
                              <button onClick={() => makeTransparent(m.image)} disabled={txBusy} style={{ ...chipStyle(false), display: "flex", gap: 6, alignItems: "center", opacity: txBusy ? 0.5 : 1 }}><Scissors size={13} /> 배경 투명화</button>
                              <button onClick={() => toMaskForge(m.image)} style={{ ...chipStyle(false), display: "flex", gap: 6, alignItems: "center" }}>Mask Forge에서</button>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              {/* 복잡 배경 → Mask Forge 라우팅 안내 버튼 */}
              {m.maskForge && (
                <div style={{ marginTop: 8 }}>
                  <button onClick={() => toMaskForge(m.maskForge)} style={{ ...chipStyle(false), display: "flex", gap: 6, alignItems: "center" }}><Scissors size={13} /> Mask Forge로 보내기 →</button>
                </div>
              )}
            </div>
            {m.chips && (
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 8 }}>
                {m.chips.map((c) => <button key={c.id} onClick={() => onChip(c.slotKey, c.id)} style={chipStyle(values[c.slotKey] === c.id)}>{c.label}</button>)}
              </div>
            )}
            {m.upload && <UploadBlock T={T} accent={accent} upload={m.upload} values={values} onFile={setFile} onAdd={addFiles} onRemove={removeFile} onDone={filesDone} />}
            {m.ready && phase !== "done" && (
              <div style={{ marginTop: 10, padding: 12, borderRadius: 12, border: `1px solid ${T.border}`, background: T.surface, display: "grid", gap: 10 }}>
                {skill.slots.map((s) => (
                  <div key={s.key}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, marginBottom: 5 }}>{s.label}</div>
                    {isFileSlot(s)
                      ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {(s.type === "files" ? (values[s.key] || []) : [values[s.key]].filter(Boolean)).map((u, i) => <img key={i} src={u} alt="" style={{ width: 44, height: 44, objectFit: "contain", borderRadius: 6, border: `1px solid ${T.border}`, background: "#0b0c10" }} />)}
                        </div>
                      : <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {optsOf(s, values).map((o) => <button key={o.id} onClick={() => onChip(s.key, o.id)} style={chipStyle(values[s.key] === o.id)}>{o.label}</button>)}
                        </div>}
                  </div>
                ))}
                <button onClick={generate} disabled={phase === "rendering"} style={{ marginTop: 4, padding: 12, borderRadius: 10, border: 0, background: accent, color: "#061b1d", fontWeight: 900, cursor: "pointer", display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
                  {phase === "rendering" ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />} 생성하기
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 입력창 */}
      <div style={{ borderTop: `1px solid ${T.border}`, padding: 12, display: "flex", gap: 8, background: T.surface }}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitText(); } }}
          placeholder={skill.placeholder || "요청을 입력하세요…"}
          style={{ flex: 1, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "11px 13px", color: T.text, fontSize: 13, outline: "none", fontFamily: "inherit" }}
        />
        <button onClick={submitText} disabled={!input.trim() || phase === "resolving" || phase === "rendering"} title="보내기 (Enter)" style={{ width: 44, borderRadius: 10, border: 0, background: input.trim() ? accent : T.border, color: input.trim() ? "#061b1d" : T.textMuted, cursor: input.trim() ? "pointer" : "default", display: "grid", placeItems: "center" }}>
          <Send size={16} />
        </button>
      </div>
      {modal}
    </>
  );
}
