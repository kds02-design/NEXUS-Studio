// BriefStudio · Prism — 요청서 파서 뷰 (version: "prism")
// 요청서(이미지/PDF/텍스트) → 구조+데이터 추출 → 슬롯필러 스키마 결합 ops 생성.
// 3단 수직 파이프라인. core/ 는 prism/ 하위에 provider 무관 코어로 분리.
// 테마: 라이트 기본 (브리프 스튜디오는 라이트 팔레트).
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Upload, FileText, Image as ImageIcon, X, Loader2, Copy, Check, AlertCircle, Trash2,
} from "lucide-react";
import { createParserCore } from "./prism/parserCore.js";
import { GeminiProvider } from "./prism/gemini.js";
import { loadPptx, slidesToText } from "./prism/pptx.js";
import SectionsView from "./prism/SectionsView.jsx";
import PromoSpecial from "./prism/PromoSpecial.jsx";
import { GEMINI_API_KEY } from "../../lib/gemini";

// 다크 팔레트 (THEME_DARK 계열) — 프리즘 전체 다크 기본.
const D = { bg: "#0A0A0F", panel: "#16161F", panel2: "#111118", border: "#23232f", text: "#E8E6FF", muted: "#8A8AA3", accent: "#A29BFE" };
const taCls =
  "w-full rounded-lg font-mono text-[13px] p-3 leading-relaxed resize-y outline-none placeholder:text-slate-500";
const taStyle = { background: D.panel2, border: `1px solid ${D.border}`, color: D.text };

// 한번 생성한 데이터가 새로고침·탭 이동 후에도 남도록 작업 세션을 localStorage 에 보존.
// 무거운 입력(파일 base64)은 제외하고, 추출/구조/ops 등 가벼운 텍스트 결과만 저장한다.
const PRISM_STORAGE_KEY = "briefStudio:prism:session:v1";
const loadPrismSession = () => {
  try { return JSON.parse(localStorage.getItem(PRISM_STORAGE_KEY) || "null") || {}; }
  catch { return {}; }
};

export default function Prism() {
  const core = useMemo(() => {
    try { return createParserCore({ provider: new GeminiProvider({ apiKey: GEMINI_API_KEY }) }); }
    catch (e) { return { _initError: e.message }; }
  }, []);

  const [hydrated] = useState(loadPrismSession); // 최초 마운트 시 1회 복원
  const [files, setFiles] = useState([]); // 입력 파일은 비영속(용량 큼) — 재추출 시에만 필요
  const [pptxTexts, setPptxTexts] = useState([]); // {name, text} — 슬라이드에서 추출한 텍스트 (비영속)
  const [pasted, setPasted] = useState(hydrated.pasted || "");
  const [note, setNote] = useState(hydrated.note || "");
  const [extracted, setExtracted] = useState(hydrated.extracted || "");
  const [structure, setStructure] = useState(hydrated.structure || []);
  const [uncertain, setUncertain] = useState(hydrated.uncertain || []);
  const [schemaText, setSchemaText] = useState(hydrated.schemaText || "");
  const [opsText, setOpsText] = useState(hydrated.opsText || "");
  const [st, setSt] = useState({}); // {1:{state,msg}, 3:{state,msg}}
  const [stage, setStage] = useState(hydrated.stage || 1);
  const [copyMsg, setCopyMsg] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState(hydrated.viewMode || "visual"); // 세부 데이터 표시: visual | json
  const [promoType, setPromoType] = useState(hydrated.promoType || "special"); // special(오늘의 상품 스페셜) | generic(범용 파서)
  const fileRef = useRef(null);

  // 자동 저장 — 가벼운 텍스트 상태만 직렬화해 localStorage 에 보존.
  useEffect(() => {
    try {
      localStorage.setItem(PRISM_STORAGE_KEY, JSON.stringify({
        pasted, note, extracted, structure, uncertain, schemaText, opsText, stage, viewMode, promoType,
      }));
    } catch { /* quota 초과 등은 무시 — 다음 변경 시 재시도 */ }
  }, [pasted, note, extracted, structure, uncertain, schemaText, opsText, stage, viewMode, promoType]);

  // 현재 작업 데이터 초기화 — 저장본까지 제거하고 처음 상태로.
  const clearSession = () => {
    if (!confirm("현재 작업 데이터를 모두 지우고 처음부터 시작할까요?")) return;
    try { localStorage.removeItem(PRISM_STORAGE_KEY); } catch { /* noop */ }
    setFiles([]); setPptxTexts([]); setPasted(""); setNote("");
    setExtracted(""); setStructure([]); setUncertain([]);
    setSchemaText(""); setOpsText(""); setSt({}); setStage(1); setViewMode("visual");
  };

  // 편집된 JSON 을 그대로 파싱해 비주얼에 반영 (확인용 일관성). 파싱 실패(편집 중) 시 null.
  const parsed = useMemo(() => {
    try { return extracted ? JSON.parse(extracted) : null; } catch { return null; }
  }, [extracted]);

  const addFiles = (list) => {
    [...list].forEach(async (f) => {
      const isPdf = f.type === "application/pdf";
      const isImg = /^image\/(png|jpe?g|webp|gif)$/.test(f.type);
      const isPptx = /\.pptx$/i.test(f.name) || f.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation";
      if (isPptx) {
        try {
          const { slides, images } = await loadPptx(f);
          setPptxTexts((prev) => [...prev, { name: f.name, text: slidesToText(slides) }]);
          setFiles((prev) => [...prev, ...images.map((im) => ({ ...im, source: f.name }))]);
        } catch (e) {
          setSt((s) => ({ ...s, 1: { state: "err", msg: "PPTX 읽기 실패: " + e.message } }));
        }
        return;
      }
      if (!isPdf && !isImg) return;
      const r = new FileReader();
      r.onload = () => setFiles((prev) => [...prev, { name: f.name, mimeType: f.type, base64: String(r.result).split(",")[1] }]);
      r.readAsDataURL(f);
    });
  };

  const runExtract = async () => {
    if (core._initError) return setSt((s) => ({ ...s, 1: { state: "err", msg: core._initError } }));
    if (!files.length && !pasted.trim() && !pptxTexts.length) return setSt((s) => ({ ...s, 1: { state: "err", msg: "요청서 파일이나 텍스트를 먼저 넣어주세요" } }));
    setSt((s) => ({ ...s, 1: { state: "run", msg: "요청서 분석 중…" } }));
    try {
      const combinedText = [
        ...pptxTexts.map((p) => `[${p.name}]\n${p.text}`),
        pasted.trim(),
      ].filter(Boolean).join("\n\n");
      const out = await core.extract({ files, text: combinedText, note: note.trim() });
      setExtracted(JSON.stringify(out, null, 1));
      setStructure(out.structure);
      setUncertain(out.uncertain);
      setSt((s) => ({ ...s, 1: { state: "ok", msg: "추출 완료" } }));
      setStage(2);
    } catch (e) {
      setSt((s) => ({ ...s, 1: { state: "err", msg: "실패: " + e.message } }));
    }
  };

  const runOps = async () => {
    if (!extracted.trim()) return setSt((s) => ({ ...s, 3: { state: "err", msg: "②의 추출 데이터가 필요합니다" } }));
    if (!schemaText.trim()) return setSt((s) => ({ ...s, 3: { state: "err", msg: "플러그인 스키마를 붙여넣어주세요" } }));
    setSt((s) => ({ ...s, 3: { state: "run", msg: "스키마에 값 매핑 중…" } }));
    try {
      const out = await core.generateOps({ extracted, schema: schemaText });
      const reviews = out.ops.filter((o) => o._review).length;
      setOpsText(JSON.stringify({ ops: out.ops }, null, 1));
      setSt((s) => ({ ...s, 3: { state: "ok", msg: `생성 완료 — ${out.ops.length}개 op${reviews ? ` · 검토필요 ${reviews}` : ""}${out._guard.restored ? ` · 골격복원 ${out._guard.restored}` : ""}` } }));
      setStage(3);
    } catch (e) {
      setSt((s) => ({ ...s, 3: { state: "err", msg: "실패: " + e.message } }));
    }
  };

  const copy = (text, key) =>
    navigator.clipboard.writeText(text)
      .then(() => setCopyMsg((c) => ({ ...c, [key]: "복사됨 ✓" })))
      .catch(() => setCopyMsg((c) => ({ ...c, [key]: "복사 실패" })));

  if (promoType === "special") {
    return (
      <div className="h-full flex flex-col" style={{ background: D.bg, color: D.text, fontFamily: "'Noto Sans KR', sans-serif" }}>
        <ModeBar promoType={promoType} setPromoType={setPromoType} />
        <div className="flex-1 min-h-0"><PromoSpecial /></div>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col"
      style={{ background: D.bg, color: D.text, fontFamily: "'Noto Sans KR', sans-serif" }}
    >
      <ModeBar promoType={promoType} setPromoType={setPromoType} />
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
      <div className="max-w-[800px] mx-auto px-5 py-8">
        <div className="flex items-start justify-between gap-3 mb-7">
          <p className="text-[13.5px] leading-relaxed" style={{ color: D.muted }}>
            비정형 제작요청서·수정요청서를 읽고 페이지 구조와 세부 데이터를 추출합니다.
            추출 데이터는 슬롯 필러 플러그인의 스키마와 결합해 ops로 변환됩니다.
            <span className="block mt-1 text-[12px]" style={{ color: "#6b6b85" }}>작업 데이터는 자동 저장되어 새로고침·탭 이동 후에도 유지됩니다 (파일 첨부 제외).</span>
          </p>
          {(extracted || opsText || pasted || schemaText) && (
            <button onClick={clearSession}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors hover:text-rose-400"
              style={{ background: D.panel, border: `1px solid ${D.border}`, color: D.muted }}>
              <Trash2 size={13} /> 초기화
            </button>
          )}
        </div>

        {/* ── STAGE ① 요청서 입력 ───────────────────────── */}
        <StageCard n={1} title="요청서 입력" sub="이미지 · PDF · 텍스트" active={stage === 1} done={stage > 1}>
          <label
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
            className="relative block w-full py-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors text-center"
            style={{ borderColor: isDragging ? D.accent : D.border, background: isDragging ? "rgba(162,155,254,0.08)" : D.panel2 }}
          >
            <Upload size={22} className="mx-auto mb-2" style={{ color: D.muted }} />
            <div className="text-[13px]" style={{ color: D.text }}>요청서 파일을 드래그하거나 클릭해서 선택</div>
            <div className="text-[11px] mt-1" style={{ color: D.muted }}>PPTX · PDF · 이미지 — PPTX는 텍스트·임베드 이미지를 자동 추출합니다</div>
            <input ref={fileRef} type="file" multiple
              accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx"
              className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          </label>
          {files.length > 0 && (
            <div className="mt-2.5 space-y-1.5">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px]" style={{ background: D.panel2, border: `1px solid ${D.border}` }}>
                  {f.mimeType === "application/pdf" ? <FileText size={13} className="shrink-0" style={{ color: D.muted }} /> : <ImageIcon size={13} className="shrink-0" style={{ color: D.muted }} />}
                  <span className="flex-1 truncate" style={{ color: D.muted }}>{f.name}{f.source ? <span> ← {f.source}</span> : null}</span>
                  <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="shrink-0 hover:text-rose-400" style={{ color: D.muted }}><X size={13} /></button>
                </div>
              ))}
            </div>
          )}
          {pptxTexts.length > 0 && (
            <div className="mt-1.5 space-y-1.5">
              {pptxTexts.map((p, i) => (
                <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px]" style={{ background: D.panel2, border: `1px solid ${D.border}` }}>
                  <FileText size={13} className="shrink-0" style={{ color: D.accent }} />
                  <span className="flex-1 truncate" style={{ color: D.muted }}><b style={{ color: D.accent }}>PPTX</b> {p.name} · {p.text.split("\n").length}줄</span>
                  <button onClick={() => setPptxTexts(pptxTexts.filter((_, j) => j !== i))} className="shrink-0 hover:text-rose-400" style={{ color: D.muted }}><X size={13} /></button>
                </div>
              ))}
            </div>
          )}

          <FieldLabel>텍스트로 붙여넣기 (선택)</FieldLabel>
          <textarea className={`${taCls} h-[120px]`} style={taStyle} value={pasted} onChange={(e) => setPasted(e.target.value)}
            placeholder="요청서 본문이 텍스트로 있으면 여기에. 파일과 같이 보낼 수 있습니다." />

          <FieldLabel>추가 지시 (선택) — 추출 시 교정 지시</FieldLabel>
          <input type="text" className={taCls} style={taStyle} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder='예: "두 번째 섹션은 패키지가 아니라 확정 제작임"' />

          <div className="flex items-center gap-3 mt-3.5">
            <button onClick={runExtract} disabled={st[1]?.state === "run"}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] font-bold bg-[#A29BFE] text-white hover:bg-[#8f86f0] disabled:opacity-45 transition-colors">
              {st[1]?.state === "run" && <Loader2 size={14} className="animate-spin" />} 데이터 추출
            </button>
            <Status st={st[1]} />
          </div>
        </StageCard>

        {/* ── STAGE ② 추출 결과 ─────────────────────────── */}
        <StageCard n={2} title="추출 결과" sub="구조 + 세부 데이터 · 직접 수정 가능" active={stage === 2} done={stage > 2}>
          {!extracted ? (
            <div className="text-[12.5px]" style={{ color: D.muted }}>아직 추출된 데이터가 없습니다. ①에서 요청서를 넣고 실행하세요.</div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5 mb-3.5">
                {structure.map((s, i) => (
                  <div key={i} className="grid grid-cols-[auto_1fr_auto] gap-2.5 items-center rounded-md px-3 py-2 text-[13px]" style={{ background: D.panel2, border: `1px solid ${D.border}` }}>
                    <span className={`font-mono text-[11px] tracking-wide rounded px-1.5 py-0.5 border ${s.pattern === "unknown" ? "text-amber-400 border-amber-500/50" : "text-[#b3acff] border-[#A29BFE]/50"}`}>{s.pattern}</span>
                    <span className="truncate" style={{ color: D.text }}>{s.title || "(제목 없음)"}</span>
                    <span className="text-[11px] font-mono" style={{ color: D.muted }}>{s.note || ""}</span>
                  </div>
                ))}
              </div>
              {uncertain.length > 0 && (
                <ul className="text-[12.5px] text-amber-400 mb-3 pl-4 list-disc space-y-0.5">
                  {uncertain.map((u, i) => <li key={i}>{u}</li>)}
                </ul>
              )}
              <div className="flex items-center gap-2 mt-3.5 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: D.muted }}>세부 데이터</span>
                <div className="ml-auto inline-flex rounded-md overflow-hidden" style={{ border: `1px solid ${D.border}` }}>
                  {[["visual", "비주얼"], ["json", "JSON"]].map(([m, label]) => (
                    <button key={m} onClick={() => setViewMode(m)} className="px-2.5 py-1 text-[12px] font-medium transition-colors"
                      style={viewMode === m ? { background: D.accent, color: "#fff" } : { background: D.panel, color: D.muted }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {viewMode === "visual" ? (
                <SectionsView data={parsed} />
              ) : (
                <>
                  <textarea className={`${taCls} h-[260px]`} style={taStyle} value={extracted} onChange={(e) => setExtracted(e.target.value)} spellCheck={false} />
                  <CopyRow onClick={() => copy(extracted, "ex")} msg={copyMsg.ex} label="JSON 복사" />
                </>
              )}
            </>
          )}
        </StageCard>

        {/* ── STAGE ③ ops 생성 ──────────────────────────── */}
        <StageCard n={3} title="ops 생성" sub="플러그인 스키마와 결합" active={stage === 3} done={false} last>
          <FieldLabel>슬롯 필러 스키마 — 플러그인의 "스키마 내보내기" 출력</FieldLabel>
          <textarea className={`${taCls} h-[120px]`} style={taStyle} value={schemaText} onChange={(e) => setSchemaText(e.target.value)} spellCheck={false}
            placeholder='{"ops":[{"id":"craft0.c0","slot":"txt/product/name","type":"name","value":"…"}, …]}' />
          <div className="flex items-center gap-3 mt-3.5">
            <button onClick={runOps} disabled={st[3]?.state === "run"}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] font-bold bg-[#A29BFE] text-white hover:bg-[#8f86f0] disabled:opacity-45 transition-colors">
              {st[3]?.state === "run" && <Loader2 size={14} className="animate-spin" />} ops 생성
            </button>
            <Status st={st[3]} />
          </div>
          {opsText && (
            <>
              <FieldLabel>생성된 ops — 플러그인 빈 칸에 붙여넣기</FieldLabel>
              <textarea className={`${taCls} h-[200px]`} style={taStyle} value={opsText} onChange={(e) => setOpsText(e.target.value)} spellCheck={false} />
              <CopyRow onClick={() => copy(opsText, "ops")} msg={copyMsg.ops} label="ops 복사" />
            </>
          )}
          <div className="flex items-start gap-1.5 text-[12px] mt-2.5" style={{ color: D.muted }}>
            <AlertCircle size={13} className="shrink-0 mt-0.5" />
            <span>검토가 필요한 op에는 <code className="font-mono text-[#b3acff] text-[11.5px]">"_review"</code> 필드가 붙습니다 — 플러그인 실행 전 해당 값만 확인하세요.</span>
          </div>
        </StageCard>
      </div>
      </div>
    </div>
  );
}

// ─── UI 헬퍼 ─────────────────────────────────────────────
// 프로모션 유형 선택 — 오늘의 상품 스페셜(전용 구조 추출 + 기획서) / 범용 파서.
function ModeBar({ promoType, setPromoType }) {
  const opts = [
    ["special", "오늘의 상품 스페셜", "#0eb9b3"],
    ["generic", "범용 파서", "#A29BFE"],
  ];
  return (
    <div className="shrink-0 px-5 py-2.5 flex items-center gap-2.5" style={{ background: D.panel, borderBottom: `1px solid ${D.border}` }}>
      <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: D.muted }}>프로모션 유형</span>
      <div className="inline-flex rounded-lg overflow-hidden" style={{ border: `1px solid ${D.border}` }}>
        {opts.map(([v, label, color]) => (
          <button key={v} onClick={() => setPromoType(v)}
            className="px-3.5 py-1.5 text-[12.5px] font-bold transition-colors"
            style={promoType === v ? { background: color, color: "#fff" } : { background: D.panel2, color: D.muted }}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StageCard({ n, title, sub, active, done, last, children }) {
  const node = done
    ? { borderColor: "#10b981", color: "#34d399", background: "rgba(16,185,129,0.12)" }
    : active ? { borderColor: D.accent, color: "#b3acff", background: D.panel }
      : { borderColor: D.border, color: D.muted, background: D.panel };
  return (
    <div className="grid grid-cols-[40px_1fr] gap-x-3.5">
      <div className="flex flex-col items-center">
        <div className="w-7 h-7 rounded-full border-[1.5px] flex items-center justify-center font-mono text-[13px]" style={node}>{n}</div>
        {!last && <div className="w-[1.5px] flex-1 min-h-5" style={{ background: done ? "rgba(16,185,129,0.4)" : D.border }} />}
      </div>
      <div className="rounded-xl p-4 mb-6" style={{ background: D.panel, border: `1px solid ${D.border}` }}>
        <h2 className="text-[15px] font-bold flex items-baseline gap-2" style={{ color: D.text }}>
          {title} <span className="text-[12px] font-normal" style={{ color: D.muted }}>{sub}</span>
        </h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

function FieldLabel({ children }) {
  return <div className="text-[11px] font-bold uppercase tracking-widest mt-3.5 mb-1.5" style={{ color: D.muted }}>{children}</div>;
}

function Status({ st }) {
  if (!st?.msg) return null;
  const color = st.state === "run" ? "#b3acff" : st.state === "ok" ? "#34d399" : st.state === "err" ? "#fb7185" : D.muted;
  return <span className={`font-mono text-[12.5px] ${st.state === "run" ? "animate-pulse" : ""}`} style={{ color }}>{st.msg}</span>;
}

function CopyRow({ onClick, msg, label }) {
  return (
    <div className="flex items-center gap-3 mt-2.5">
      <button onClick={onClick} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors"
        style={{ background: D.panel2, border: `1px solid ${D.border}`, color: D.text }}>
        {msg ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />} {label}
      </button>
      {msg && <span className="font-mono text-[12px] text-emerald-400">{msg}</span>}
    </div>
  );
}
