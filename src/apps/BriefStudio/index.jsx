import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  collection, doc, getDocs, addDoc, query, orderBy, limit, serverTimestamp,
} from "firebase/firestore";
import { db, appId } from "../../lib/firebase";
import { GEMINI_API_KEY } from "../../lib/gemini";
import { useAuth } from "../../context/AuthContext";
import { useGlobal } from "../../context/GlobalContext";
import { APP_MAP } from "../../config/apps";
import {
  Upload, FileText, Image as ImageIcon, X, Loader2, Sparkles, Check,
  ChevronDown, ChevronRight, Type, Box, Video, Star, Palette,
  Users, AlertCircle, RefreshCw, ArrowLeft, Save,
} from "lucide-react";

const GENRES = [
  { id: "rpg",      label: "RPG / 판타지" },
  { id: "casual",   label: "캐주얼 / 카툰" },
  { id: "sf",       label: "SF / 사이버펑크" },
  { id: "shooter",  label: "슈팅 / 액션" },
  { id: "puzzle",   label: "퍼즐 / 보드" },
  { id: "sports",   label: "스포츠" },
  { id: "other",    label: "기타" },
];
const PLATFORMS = [
  { id: "mobile",   label: "모바일" },
  { id: "pc",       label: "PC" },
  { id: "console",  label: "콘솔" },
  { id: "web",      label: "웹/프로모션" },
  { id: "multi",    label: "멀티플랫폼" },
];
const STYLE_KEYS = [
  { id: "rpg",       label: "RPG/판타지",   color: "#A29BFE" },
  { id: "casual",    label: "캐주얼/카툰",   color: "#74B9FF" },
  { id: "sf",        label: "SF/사이버펑크", color: "#0eb9b3" },
  { id: "minimal",   label: "미니멀/모던",   color: "#dfe6e9" },
  { id: "luxury",    label: "고급/럭셔리",   color: "#FDCB6E" },
  { id: "horror",    label: "호러/다크",     color: "#FD79A8" },
];
const SEND_TARGETS = [
  { id: "typecore-sovereign", label: "타이프코어 소버린",   icon: <Type size={14}/> },
  { id: "render-metrics",     label: "렌더 메트릭스",       icon: <Box size={14}/> },
  { id: "design-eval",        label: "디자인 평가도구",     icon: <Star size={14}/> },
];

const SUPPORTED_DOC_EXT = /\.(pdf|txt|md|json)$/i;
const SUPPORTED_DOC_HINT = "PDF / TXT / MD / JSON";

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(",")[1] || "");
  r.onerror = reject;
  r.readAsDataURL(file);
});
const fileToText = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result));
  r.onerror = reject;
  r.readAsText(file);
});

export default function BriefStudio() {
  const { user, isAdmin } = useAuth();
  const { navigate } = useGlobal();

  const [step, setStep] = useState(1);
  const [docFiles, setDocFiles] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [genre, setGenre] = useState("rpg");
  const [platform, setPlatform] = useState("mobile");
  const [assigneeUid, setAssigneeUid] = useState("");
  const [users, setUsers] = useState([]);
  const [usersError, setUsersError] = useState("");
  const [analysisStage, setAnalysisStage] = useState("");
  const [analysisPercent, setAnalysisPercent] = useState(0);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const docInputRef = useRef(null);
  const imgInputRef = useRef(null);

  // 담당자 목록 로드 — Firestore users (admin은 전체 read 가능, 일반 사용자는 본인만 보일 수 있음)
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "users"));
        const list = snap.docs.map(d => ({ uid: d.id, ...d.data() }))
                      .filter(u => u.email)
                      .sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email));
        setUsers(list);
      } catch (e) {
        console.warn("[BriefStudio] users 조회 실패", e);
        setUsersError("담당자 목록을 불러올 수 없습니다 (권한 부족 가능)");
      }
    })();
  }, []);

  // 본인의 과거 리포트 로드
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const colRef = collection(db, "briefHistory", user.uid, "reports");
        const q = query(colRef, orderBy("createdAt", "desc"), limit(20));
        const snap = await getDocs(q);
        setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.warn("[BriefStudio] history 조회 실패", e);
      }
    })();
  }, [user, report]);

  const onDocPick = (e) => {
    const arr = Array.from(e.target.files || []);
    e.target.value = "";
    if (arr.length === 0) return;
    const ok = arr.filter(f => SUPPORTED_DOC_EXT.test(f.name));
    if (ok.length < arr.length) {
      setError(`지원하지 않는 형식이 일부 제외됨 (지원: ${SUPPORTED_DOC_HINT}). docx는 PDF로 변환 후 다시 시도하세요.`);
    } else { setError(""); }
    setDocFiles(prev => [...prev, ...ok]);
  };
  const onImagePick = (e) => {
    const arr = Array.from(e.target.files || []);
    e.target.value = "";
    const ok = arr.filter(f => f.type.startsWith("image/"));
    setImageFiles(prev => [...prev, ...ok]);
  };

  const removeDoc = (i) => setDocFiles(prev => prev.filter((_, idx) => idx !== i));
  const removeImage = (i) => setImageFiles(prev => prev.filter((_, idx) => idx !== i));

  const startAnalysis = async () => {
    if (docFiles.length === 0 && imageFiles.length === 0) {
      setError("문서나 이미지를 1개 이상 업로드해주세요.");
      return;
    }
    if (!GEMINI_API_KEY) { setError("Gemini API 키가 없습니다."); return; }
    setError(""); setReport(null); setStep(2); setAnalysisPercent(0);
    try {
      // === Stage 1: 파일 준비 ===
      setAnalysisStage("문서 텍스트 추출 중..."); setAnalysisPercent(10);
      const parts = [];
      const docSummaries = [];
      for (const f of docFiles) {
        const ext = (f.name.split(".").pop() || "").toLowerCase();
        if (ext === "pdf") {
          const b64 = await fileToBase64(f);
          parts.push({ inlineData: { mimeType: "application/pdf", data: b64 } });
          docSummaries.push(`${f.name} (${(f.size/1024).toFixed(1)}KB, PDF)`);
        } else {
          const text = await fileToText(f);
          parts.push({ text: `[문서: ${f.name}]\n${text.slice(0, 30000)}` });
          docSummaries.push(`${f.name} (${(f.size/1024).toFixed(1)}KB, 텍스트 ${text.length}자)`);
        }
      }

      setAnalysisStage("이미지 인코딩 중..."); setAnalysisPercent(30);
      const imageSummaries = [];
      for (const f of imageFiles) {
        const b64 = await fileToBase64(f);
        const mime = f.type || "image/jpeg";
        parts.push({ inlineData: { mimeType: mime, data: b64 } });
        imageSummaries.push(`${f.name} (${(f.size/1024).toFixed(1)}KB)`);
      }

      // 담당자 정보
      const assignee = users.find(u => u.uid === assigneeUid);
      const assigneeBlock = assignee
        ? `[담당자] ${assignee.displayName || assignee.email} / 등급: ${assignee.grade || "general"} / 이메일: ${assignee.email}`
        : "[담당자] 미지정";

      // === Stage 2: Gemini 호출 ===
      setAnalysisStage("Gemini 2.5 Pro로 분석 중... (30~60초)"); setAnalysisPercent(55);
      const styleIds = STYLE_KEYS.map(s => s.id).join(", ");
      const sysPrompt = `당신은 게임 디자인 브리프 분석 전문가입니다. 첨부된 문서와 레퍼런스 이미지를 종합 분석해 디자인 방향성을 도출하세요.\n\n[기본 설정]\n- 장르: ${GENRES.find(g => g.id === genre)?.label || genre}\n- 플랫폼: ${PLATFORMS.find(p => p.id === platform)?.label || platform}\n- ${assigneeBlock}\n\n[입력 파일]\n- 문서 ${docFiles.length}개: ${docSummaries.join(" / ") || "(없음)"}\n- 이미지 ${imageFiles.length}개: ${imageSummaries.join(" / ") || "(없음)"}\n\n반드시 아래 JSON 스키마로만 출력 (코드블록·설명 금지). 누락 필드 없게:\n{\n  "directionSummary": "전체 디자인 방향 한국어 요약 (3~5문장)",\n  "keywords": [{"label": "한국어 키워드", "weight": 0.0~1.0}, ...총 5~7개],\n  "styleScores": { ${STYLE_KEYS.map(s => `"${s.id}": 0.0~1.0`).join(", ")} },\n  "colorPalette": [{"hex": "#RRGGBB", "name": "한국어 색상 이름", "role": "primary|accent|background|text"}, ...4~6개],\n  "typography": {\n    "weight": "thin|light|regular|medium|bold|black",\n    "style": "serif|sans|display|script",\n    "mood": "한국어 분위기 키워드 2~3개",\n    "recommendations": "추천 폰트 또는 폰트 패밀리 (영문)"\n  },\n  "assigneeMatch": {\n    "score": 0.0~1.0,\n    "reasoning": "담당자 성향과 이 방향이 맞는지 한국어 1~2문장"\n  },\n  "referenceSummary": "레퍼런스 이미지/문서에서 발견한 핵심 시각 패턴 한국어 요약 (2~3문장)",\n  "risks": ["주의해야 할 점 한국어 1~3개"]\n}`;

      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(new Error("Gemini timeout 90s")), 90000);
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: sysPrompt }, ...parts] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
          }),
          signal: ctrl.signal,
        },
      );
      clearTimeout(t);
      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(`Gemini ${resp.status}: ${txt.slice(0, 300)}`);
      }
      const data = await resp.json();
      const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!txt) throw new Error("AI 응답이 비어있어요");
      const parsed = JSON.parse(txt);

      // === Stage 3: Firestore 저장 ===
      setAnalysisStage("결과 저장 중..."); setAnalysisPercent(90);
      const savedReport = {
        ownerUid: user.uid,
        ownerEmail: user.email || "",
        genre, platform,
        assigneeUid: assigneeUid || null,
        assigneeName: assignee?.displayName || assignee?.email || null,
        docNames: docFiles.map(f => f.name),
        imageNames: imageFiles.map(f => f.name),
        result: parsed,
        createdAt: serverTimestamp(),
        createdAtMs: Date.now(),
      };
      let savedId = null;
      try {
        const ref = await addDoc(collection(db, "briefHistory", user.uid, "reports"), savedReport);
        savedId = ref.id;
      } catch (e) {
        console.warn("[BriefStudio] Firestore 저장 실패 (결과는 표시됨):", e);
      }

      setAnalysisPercent(100);
      setReport({ ...savedReport, id: savedId, result: parsed });
      setStep(3);
    } catch (e) {
      console.error("[BriefStudio] 분석 실패", e);
      setError(`분석 실패: ${e.message || e}`);
      setStep(1);
    }
  };

  const resetAll = () => {
    setStep(1); setDocFiles([]); setImageFiles([]); setReport(null); setError("");
    setAnalysisStage(""); setAnalysisPercent(0);
  };

  const sendToApp = (targetId) => {
    if (!report) return;
    const r = report.result || {};
    const text = [
      r.directionSummary || "",
      r.keywords?.length ? "키워드: " + r.keywords.map(k => k.label).join(", ") : "",
      r.typography ? `타이포: ${r.typography.style} / ${r.typography.weight} / ${r.typography.mood}` : "",
      r.colorPalette?.length ? "팔레트: " + r.colorPalette.map(c => `${c.name}(${c.hex})`).join(", ") : "",
    ].filter(Boolean).join("\n\n");
    const tags = (r.keywords || []).slice(0, 5).map(k => k.label);
    navigate(targetId, {
      source: "brief-studio",
      target: targetId,
      prompt: { text, tags, style: r.typography ? `${r.typography.style}-${r.typography.weight}` : "" },
      image: { url: "", metadata: { palette: r.colorPalette, styleScores: r.styleScores } },
      params: { briefReportId: report.id, genre, platform },
    });
  };

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0f] text-zinc-200" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>
      <div className="max-w-5xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="app-title text-2xl tracking-wide flex items-baseline gap-1.5 mb-1 text-white"><span className="font-light">Brief</span> <span className="font-semibold">Studio</span></h1>
            <div className="text-xs text-zinc-400">브리프 스튜디오</div>
            <p className="text-xs text-zinc-500 mt-1">문서와 레퍼런스를 업로드하면 AI가 디자인 방향을 잡아드려요</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowHistory(v => !v)} className="px-3 py-2 text-xs rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600">
              내 리포트 ({history.length})
            </button>
            {step > 1 && (
              <button onClick={resetAll} className="px-3 py-2 text-xs rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 flex items-center gap-1.5">
                <RefreshCw size={12}/> 새로 시작
              </button>
            )}
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[
            { n: 1, label: "업로드" },
            { n: 2, label: "분석 중" },
            { n: 3, label: "결과" },
          ].map((s, i) => (
            <React.Fragment key={s.n}>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border ${step === s.n ? "bg-[#A29BFE]/20 border-[#A29BFE]/50 text-[#A29BFE] font-bold" : step > s.n ? "bg-[#A29BFE]/10 border-[#A29BFE]/30 text-[#A29BFE]" : "border-zinc-800 text-zinc-500"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step >= s.n ? "bg-[#A29BFE] text-zinc-900" : "bg-zinc-800 text-zinc-500"}`}>
                  {step > s.n ? <Check size={10}/> : s.n}
                </span>
                {s.label}
              </div>
              {i < 2 && <div className={`flex-1 h-px ${step > s.n ? "bg-[#A29BFE]/30" : "bg-zinc-800"}`}/>}
            </React.Fragment>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg border border-red-900/50 bg-red-950/30 text-red-300 text-xs flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5"/>
            <span>{error}</span>
          </div>
        )}

        {showHistory && (
          <div className="mb-6 p-4 rounded-xl border border-zinc-800 bg-zinc-950/40">
            <div className="text-xs font-bold text-zinc-300 mb-3">최근 리포트</div>
            {history.length === 0 ? (
              <div className="text-xs text-zinc-500 py-4 text-center">아직 저장된 리포트가 없어요</div>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {history.map(h => (
                  <button key={h.id} onClick={() => { setReport(h); setStep(3); setShowHistory(false); }} className="w-full text-left p-2.5 rounded-lg bg-zinc-900/50 hover:bg-zinc-800/70 border border-zinc-800 transition-colors">
                    <div className="text-xs text-zinc-200 font-medium truncate">{h.result?.directionSummary?.slice(0, 80) || "(요약 없음)"}</div>
                    <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-2">
                      <span>{GENRES.find(g => g.id === h.genre)?.label}</span>
                      <span>·</span>
                      <span>{PLATFORMS.find(p => p.id === h.platform)?.label}</span>
                      <span>·</span>
                      <span>{h.createdAtMs ? new Date(h.createdAtMs).toLocaleString("ko-KR") : "-"}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === Step 1: Upload === */}
        {step === 1 && (
          <div className="space-y-5">
            {/* 문서 */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-bold text-zinc-300 flex items-center gap-2"><FileText size={14}/> 문서</div>
                <span className="text-[10px] text-zinc-500">{SUPPORTED_DOC_HINT}</span>
              </div>
              <button onClick={() => docInputRef.current?.click()} className="w-full py-6 rounded-lg border border-dashed border-zinc-700 hover:border-[#A29BFE]/50 hover:bg-[#A29BFE]/5 transition-colors text-xs text-zinc-400 flex flex-col items-center gap-2">
                <Upload size={20}/>
                <span>클릭해서 문서 추가</span>
              </button>
              <input ref={docInputRef} type="file" multiple accept=".pdf,.txt,.md,.json" onChange={onDocPick} className="hidden"/>
              {docFiles.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {docFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-zinc-900/60 border border-zinc-800 text-xs">
                      <span className="truncate text-zinc-300"><FileText size={11} className="inline mr-1.5 text-zinc-500"/>{f.name} <span className="text-zinc-600">{(f.size/1024).toFixed(1)}KB</span></span>
                      <button onClick={() => removeDoc(i)} className="text-zinc-500 hover:text-red-400"><X size={12}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 이미지 */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-bold text-zinc-300 flex items-center gap-2"><ImageIcon size={14}/> 레퍼런스 / 작업물 / 경쟁사</div>
                <span className="text-[10px] text-zinc-500">JPG / PNG / WEBP</span>
              </div>
              <button onClick={() => imgInputRef.current?.click()} className="w-full py-6 rounded-lg border border-dashed border-zinc-700 hover:border-[#A29BFE]/50 hover:bg-[#A29BFE]/5 transition-colors text-xs text-zinc-400 flex flex-col items-center gap-2">
                <Upload size={20}/>
                <span>클릭해서 이미지 추가</span>
              </button>
              <input ref={imgInputRef} type="file" multiple accept="image/*" onChange={onImagePick} className="hidden"/>
              {imageFiles.length > 0 && (
                <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {imageFiles.map((f, i) => (
                    <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900">
                      <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover"/>
                      <button onClick={() => removeImage(i)} className="absolute top-1 right-1 p-1 bg-black/70 rounded text-zinc-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={11}/>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 기본 설정 */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">장르</label>
                <select value={genre} onChange={e => setGenre(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:border-[#A29BFE] outline-none">
                  {GENRES.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">플랫폼</label>
                <select value={platform} onChange={e => setPlatform(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:border-[#A29BFE] outline-none">
                  {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5"><Users size={11}/> 담당자</label>
                {usersError ? (
                  <div className="text-[10px] text-zinc-600 px-3 py-2 bg-zinc-900/40 border border-zinc-800 rounded-lg">{usersError}</div>
                ) : (
                  <select value={assigneeUid} onChange={e => setAssigneeUid(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:border-[#A29BFE] outline-none">
                    <option value="">미지정</option>
                    {users.map(u => <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>)}
                  </select>
                )}
              </div>
            </div>

            {/* Start button */}
            <div className="flex justify-end">
              <button onClick={startAnalysis} disabled={docFiles.length === 0 && imageFiles.length === 0} className="px-6 py-3 rounded-lg bg-[#A29BFE] hover:bg-[#8b82f5] text-zinc-900 font-bold text-sm flex items-center gap-2 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <Sparkles size={14}/> 분석 시작
              </button>
            </div>
          </div>
        )}

        {/* === Step 2: Analyzing === */}
        {step === 2 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto text-[#A29BFE] animate-spin mb-6"/>
            <div className="text-base font-bold text-zinc-200 mb-2">{analysisStage}</div>
            <div className="text-xs text-zinc-500 mb-6">잠시만 기다려주세요. gemini-2.5-pro 모델은 정확도가 높은 만큼 응답이 다소 느려요.</div>
            <div className="max-w-md mx-auto">
              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full bg-[#A29BFE] transition-all duration-300" style={{ width: `${analysisPercent}%` }}/>
              </div>
              <div className="mt-2 text-[10px] text-zinc-500 text-right">{analysisPercent}%</div>
            </div>
          </div>
        )}

        {/* === Step 3: Result === */}
        {step === 3 && report && (
          <ReportView report={report} onSendToApp={sendToApp}/>
        )}
      </div>
    </div>
  );
}

function ReportView({ report, onSendToApp }) {
  const r = report.result || {};
  const styleScores = r.styleScores || {};
  const palette = Array.isArray(r.colorPalette) ? r.colorPalette : [];
  const keywords = Array.isArray(r.keywords) ? r.keywords : [];

  return (
    <div className="space-y-5">
      {/* Direction Summary */}
      <div className="rounded-xl border border-[#A29BFE]/30 bg-[#A29BFE]/5 p-5">
        <div className="text-[10px] font-bold tracking-wider text-[#A29BFE] uppercase mb-2">디자인 방향 요약</div>
        <p className="text-sm text-zinc-200 leading-relaxed">{r.directionSummary || "-"}</p>
      </div>

      {/* Keywords */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
        <div className="text-xs font-bold text-zinc-300 mb-3 flex items-center gap-2"><Sparkles size={14}/> 핵심 키워드</div>
        <div className="flex flex-wrap gap-2">
          {keywords.length === 0 ? <span className="text-xs text-zinc-500">-</span> : keywords.map((k, i) => (
            <div key={i} className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center gap-2">
              <span className="text-sm font-bold text-zinc-100">{k.label}</span>
              <span className="text-[10px] text-[#A29BFE] font-mono">{Math.round((k.weight || 0) * 100)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Style Match */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
          <div className="text-xs font-bold text-zinc-300 mb-3">스타일 매칭</div>
          <div className="space-y-2.5">
            {STYLE_KEYS.map(s => {
              const v = Math.max(0, Math.min(1, Number(styleScores[s.id]) || 0));
              return (
                <div key={s.id}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-zinc-400">{s.label}</span>
                    <span className="font-mono text-zinc-500">{Math.round(v * 100)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-900 overflow-hidden">
                    <div className="h-full transition-all" style={{ width: `${v * 100}%`, background: s.color }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Color Palette */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
          <div className="text-xs font-bold text-zinc-300 mb-3 flex items-center gap-2"><Palette size={14}/> 컬러 팔레트</div>
          {palette.length === 0 ? <span className="text-xs text-zinc-500">-</span> : (
            <div className="space-y-2">
              <div className="flex rounded-lg overflow-hidden border border-zinc-800 h-12">
                {palette.map((c, i) => (
                  <div key={i} className="flex-1" style={{ background: c.hex }} title={`${c.name} ${c.hex}`}/>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {palette.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded bg-zinc-900/60 border border-zinc-800">
                    <div className="w-6 h-6 rounded shrink-0" style={{ background: c.hex }}/>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium text-zinc-200 truncate">{c.name}</div>
                      <div className="text-[9px] font-mono text-zinc-500">{c.hex} {c.role && `· ${c.role}`}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Typography */}
        {r.typography && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
            <div className="text-xs font-bold text-zinc-300 mb-3 flex items-center gap-2"><Type size={14}/> 타이포그래피 방향</div>
            <div className="space-y-2 text-xs">
              <Row label="굵기"   value={r.typography.weight}/>
              <Row label="스타일" value={r.typography.style}/>
              <Row label="분위기" value={r.typography.mood}/>
              <Row label="추천"   value={r.typography.recommendations}/>
            </div>
          </div>
        )}

        {/* Assignee Match */}
        {r.assigneeMatch && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
            <div className="text-xs font-bold text-zinc-300 mb-3 flex items-center gap-2"><Users size={14}/> 담당자 컨펌 예상도</div>
            <div className="flex items-center gap-3 mb-3">
              <div className="text-3xl font-black text-[#A29BFE] font-mono">{Math.round((r.assigneeMatch.score || 0) * 100)}%</div>
              <div className="flex-1 h-1.5 rounded-full bg-zinc-900 overflow-hidden">
                <div className="h-full bg-[#A29BFE] transition-all" style={{ width: `${(r.assigneeMatch.score || 0) * 100}%` }}/>
              </div>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">{r.assigneeMatch.reasoning || "-"}</p>
          </div>
        )}
      </div>

      {/* Reference summary + Risks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {r.referenceSummary && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
            <div className="text-xs font-bold text-zinc-300 mb-3">레퍼런스 분석 요약</div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">{r.referenceSummary}</p>
          </div>
        )}
        {Array.isArray(r.risks) && r.risks.length > 0 && (
          <div className="rounded-xl border border-amber-900/30 bg-amber-950/20 p-5">
            <div className="text-xs font-bold text-amber-300 mb-3 flex items-center gap-2"><AlertCircle size={14}/> 주의 사항</div>
            <ul className="space-y-1.5 text-[11px] text-amber-100/80 leading-relaxed list-disc pl-4">
              {r.risks.map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* Send to apps */}
      <div className="rounded-xl border border-[#A29BFE]/30 bg-[#A29BFE]/5 p-5">
        <div className="text-xs font-bold text-[#A29BFE] mb-3">이 브리프로 이어서 작업</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {SEND_TARGETS.map(t => (
            <button key={t.id} onClick={() => onSendToApp(t.id)} className="flex items-center justify-between gap-2 px-3 py-2.5 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 hover:border-[#A29BFE]/40 rounded-lg text-[11px] font-medium text-zinc-300 hover:text-white transition-colors text-left">
              <span className="flex items-center gap-2"><span style={{color: APP_MAP[t.id]?.color}}>{t.icon}</span> {t.label}</span>
              <ChevronRight size={12} className="text-zinc-600"/>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider w-14 shrink-0 pt-0.5">{label}</span>
      <span className="text-zinc-200 flex-1">{value || "-"}</span>
    </div>
  );
}
