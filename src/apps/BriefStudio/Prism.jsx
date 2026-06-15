// BriefStudio · Prism — 요청서 파서 뷰 (version: "prism")
// 요청서(이미지/PDF/텍스트) → 구조+데이터 추출 → 슬롯필러 스키마 결합 ops 생성.
// 3단 수직 파이프라인. core/ 는 prism/ 하위에 provider 무관 코어로 분리.
// 테마: 라이트 기본 (브리프 스튜디오는 라이트 팔레트).
import { useMemo, useRef, useState } from "react";
import {
  Upload, FileText, Image as ImageIcon, X, Loader2, Copy, Check, AlertCircle,
} from "lucide-react";
import { createParserCore } from "./prism/parserCore.js";
import { GeminiProvider } from "./prism/gemini.js";
import { loadPptx, slidesToText } from "./prism/pptx.js";
import { GEMINI_API_KEY } from "../../lib/gemini";

const taCls =
  "w-full bg-white border border-slate-200 rounded-lg text-slate-800 font-mono text-[12px] p-3 leading-relaxed resize-y outline-none focus:border-[#A29BFE] placeholder:text-slate-400";

export default function Prism() {
  const core = useMemo(() => {
    try { return createParserCore({ provider: new GeminiProvider({ apiKey: GEMINI_API_KEY }) }); }
    catch (e) { return { _initError: e.message }; }
  }, []);

  const [files, setFiles] = useState([]); // {name, mimeType, base64, source?}
  const [pptxTexts, setPptxTexts] = useState([]); // {name, text} — 슬라이드에서 추출한 텍스트
  const [pasted, setPasted] = useState("");
  const [note, setNote] = useState("");
  const [extracted, setExtracted] = useState("");
  const [structure, setStructure] = useState([]);
  const [uncertain, setUncertain] = useState([]);
  const [schemaText, setSchemaText] = useState("");
  const [opsText, setOpsText] = useState("");
  const [st, setSt] = useState({}); // {1:{state,msg}, 3:{state,msg}}
  const [stage, setStage] = useState(1);
  const [copyMsg, setCopyMsg] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef(null);

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

  return (
    <div
      className="h-full overflow-y-auto custom-scrollbar bg-slate-50 text-slate-900"
      style={{ fontFamily: "'Noto Sans KR', sans-serif" }}
    >
      <div className="max-w-[780px] mx-auto px-5 py-8">
        <p className="text-[12.5px] text-slate-500 mb-7 leading-relaxed">
          비정형 제작요청서·수정요청서를 읽고 페이지 구조와 세부 데이터를 추출합니다.
          추출 데이터는 슬롯 필러 플러그인의 스키마와 결합해 ops로 변환됩니다.
        </p>

        {/* ── STAGE ① 요청서 입력 ───────────────────────── */}
        <StageCard n={1} title="요청서 입력" sub="이미지 · PDF · 텍스트" active={stage === 1} done={stage > 1}>
          <label
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
            className={`relative block w-full py-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors text-center ${
              isDragging ? "border-[#A29BFE] bg-[#A29BFE]/10" : "border-slate-300 hover:border-slate-400 bg-white"
            }`}
          >
            <Upload size={20} className="mx-auto mb-2 text-slate-400" />
            <div className="text-[12px] text-slate-600">요청서 파일을 드래그하거나 클릭해서 선택</div>
            <div className="text-[10px] text-slate-400 mt-1">PPTX · PDF · 이미지 — PPTX는 텍스트·임베드 이미지를 자동 추출합니다</div>
            <input ref={fileRef} type="file" multiple
              accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx"
              className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          </label>
          {files.length > 0 && (
            <div className="mt-2.5 space-y-1.5">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-md text-[11px]">
                  {f.mimeType === "application/pdf" ? <FileText size={12} className="text-slate-400 shrink-0" /> : <ImageIcon size={12} className="text-slate-400 shrink-0" />}
                  <span className="flex-1 truncate text-slate-600">{f.name}{f.source ? <span className="text-slate-400"> ← {f.source}</span> : null}</span>
                  <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-500 shrink-0"><X size={12} /></button>
                </div>
              ))}
            </div>
          )}
          {pptxTexts.length > 0 && (
            <div className="mt-1.5 space-y-1.5">
              {pptxTexts.map((p, i) => (
                <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-md text-[11px]">
                  <FileText size={12} className="text-[#A29BFE] shrink-0" />
                  <span className="flex-1 truncate text-slate-600"><b className="text-[#6c5ce7]">PPTX</b> {p.name} · {p.text.split("\n").length}줄</span>
                  <button onClick={() => setPptxTexts(pptxTexts.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-500 shrink-0"><X size={12} /></button>
                </div>
              ))}
            </div>
          )}

          <FieldLabel>텍스트로 붙여넣기 (선택)</FieldLabel>
          <textarea className={`${taCls} h-[120px]`} value={pasted} onChange={(e) => setPasted(e.target.value)}
            placeholder="요청서 본문이 텍스트로 있으면 여기에. 파일과 같이 보낼 수 있습니다." />

          <FieldLabel>추가 지시 (선택) — 추출 시 교정 지시</FieldLabel>
          <input type="text" className={`${taCls} h-auto`} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder='예: "두 번째 섹션은 패키지가 아니라 확정 제작임"' />

          <div className="flex items-center gap-3 mt-3.5">
            <button onClick={runExtract} disabled={st[1]?.state === "run"}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-bold bg-[#A29BFE] text-white hover:bg-[#8f86f0] disabled:opacity-45 transition-colors">
              {st[1]?.state === "run" && <Loader2 size={13} className="animate-spin" />} 데이터 추출
            </button>
            <Status st={st[1]} />
          </div>
        </StageCard>

        {/* ── STAGE ② 추출 결과 ─────────────────────────── */}
        <StageCard n={2} title="추출 결과" sub="구조 + 세부 데이터 · 직접 수정 가능" active={stage === 2} done={stage > 2}>
          {!extracted ? (
            <div className="text-[11.5px] text-slate-400">아직 추출된 데이터가 없습니다. ①에서 요청서를 넣고 실행하세요.</div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5 mb-3.5">
                {structure.map((s, i) => (
                  <div key={i} className="grid grid-cols-[auto_1fr_auto] gap-2.5 items-center bg-white border border-slate-200 rounded-md px-3 py-2 text-[12px]">
                    <span className={`font-mono text-[10px] tracking-wide rounded px-1.5 py-0.5 border ${s.pattern === "unknown" ? "text-amber-600 border-amber-300" : "text-[#6c5ce7] border-[#A29BFE]/50"}`}>{s.pattern}</span>
                    <span className="truncate text-slate-700">{s.title || "(제목 없음)"}</span>
                    <span className="text-slate-400 text-[10px] font-mono">{s.note || ""}</span>
                  </div>
                ))}
              </div>
              {uncertain.length > 0 && (
                <ul className="text-[11.5px] text-amber-600 mb-3 pl-4 list-disc space-y-0.5">
                  {uncertain.map((u, i) => <li key={i}>{u}</li>)}
                </ul>
              )}
              <FieldLabel>추출 데이터 (JSON)</FieldLabel>
              <textarea className={`${taCls} h-[200px]`} value={extracted} onChange={(e) => setExtracted(e.target.value)} spellCheck={false} />
              <CopyRow onClick={() => copy(extracted, "ex")} msg={copyMsg.ex} label="JSON 복사" />
            </>
          )}
        </StageCard>

        {/* ── STAGE ③ ops 생성 ──────────────────────────── */}
        <StageCard n={3} title="ops 생성" sub="플러그인 스키마와 결합" active={stage === 3} done={false} last>
          <FieldLabel>슬롯 필러 스키마 — 플러그인의 "스키마 내보내기" 출력</FieldLabel>
          <textarea className={`${taCls} h-[120px]`} value={schemaText} onChange={(e) => setSchemaText(e.target.value)} spellCheck={false}
            placeholder='{"ops":[{"id":"craft0.c0","slot":"txt/product/name","type":"name","value":"…"}, …]}' />
          <div className="flex items-center gap-3 mt-3.5">
            <button onClick={runOps} disabled={st[3]?.state === "run"}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-bold bg-[#A29BFE] text-white hover:bg-[#8f86f0] disabled:opacity-45 transition-colors">
              {st[3]?.state === "run" && <Loader2 size={13} className="animate-spin" />} ops 생성
            </button>
            <Status st={st[3]} />
          </div>
          {opsText && (
            <>
              <FieldLabel>생성된 ops — 플러그인 빈 칸에 붙여넣기</FieldLabel>
              <textarea className={`${taCls} h-[200px]`} value={opsText} onChange={(e) => setOpsText(e.target.value)} spellCheck={false} />
              <CopyRow onClick={() => copy(opsText, "ops")} msg={copyMsg.ops} label="ops 복사" />
            </>
          )}
          <div className="flex items-start gap-1.5 text-[11px] text-slate-400 mt-2.5">
            <AlertCircle size={12} className="shrink-0 mt-0.5" />
            <span>검토가 필요한 op에는 <code className="font-mono text-[#6c5ce7] text-[10.5px]">"_review"</code> 필드가 붙습니다 — 플러그인 실행 전 해당 값만 확인하세요.</span>
          </div>
        </StageCard>
      </div>
    </div>
  );
}

// ─── UI 헬퍼 ─────────────────────────────────────────────
function StageCard({ n, title, sub, active, done, last, children }) {
  const nodeCls = done ? "border-emerald-500 text-emerald-600 bg-emerald-50" : active ? "border-[#A29BFE] text-[#6c5ce7] bg-white" : "border-slate-300 text-slate-400 bg-white";
  return (
    <div className="grid grid-cols-[40px_1fr] gap-x-3.5">
      <div className="flex flex-col items-center">
        <div className={`w-7 h-7 rounded-full border-[1.5px] flex items-center justify-center font-mono text-[12px] ${nodeCls}`}>{n}</div>
        {!last && <div className={`w-[1.5px] flex-1 min-h-5 ${done ? "bg-emerald-400/50" : "bg-slate-200"}`} />}
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-sm">
        <h2 className="text-[14px] font-bold flex items-baseline gap-2 text-slate-800">
          {title} <span className="text-[11px] font-normal text-slate-400">{sub}</span>
        </h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

function FieldLabel({ children }) {
  return <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-3.5 mb-1.5">{children}</div>;
}

function Status({ st }) {
  if (!st?.msg) return null;
  const cls = st.state === "run" ? "text-[#6c5ce7] animate-pulse" : st.state === "ok" ? "text-emerald-600" : st.state === "err" ? "text-rose-600" : "text-slate-500";
  return <span className={`font-mono text-[11.5px] ${cls}`}>{st.msg}</span>;
}

function CopyRow({ onClick, msg, label }) {
  return (
    <div className="flex items-center gap-3 mt-2.5">
      <button onClick={onClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-600 transition-colors">
        {msg ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />} {label}
      </button>
      {msg && <span className="font-mono text-[11px] text-emerald-600">{msg}</span>}
    </div>
  );
}
