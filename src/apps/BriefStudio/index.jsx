// BriefStudio — 4단 레이아웃: 분석 기록 / 요청서 / 레퍼런스 / AI 분석 결과.
// 분석 완료 후 결과를 Firestore (briefHistory) 에 저장하고, 좌측 기록 메뉴에서 다시 불러온다.
// 작업 플로우 버튼으로 각 앱에 payload 전달. 기본 테마는 다크모드.
import { useEffect, useRef, useState } from "react";
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, query, getDocs, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { GEMINI_API_KEY } from "../../lib/gemini";
import { useAuth } from "../../context/AuthContext";
import { useGlobal } from "../../context/GlobalContext";
import { APP_MAP } from "../../config/apps";
import {
  Upload, FileText, Image as ImageIcon, X, Loader2, Sparkles,
  ArrowRight, Type, Box, Video, AlertCircle, Users, Check, ChevronRight,
  Palette, Layers, History, Plus, Trash2, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { extractDocxText, extractPptxText, isDocx, isPptx } from "./officeExtract";
import Prism from "./Prism";

// 버전 스위치 — "studio"(디자인 방향성, 기본) / "prism"(요청서 파서 → ops).
// Shell 이 APP_REGISTRY.versions 기준으로 version prop 주입 + 상단 VersionSubHeader 렌더.
export default function BriefStudio({ version = "studio" }) {
  return version === "prism" ? <Prism /> : <StudioView />;
}

// ─── 정적 데이터 ─────────────────────────────────────────
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

const PRODUCTION_TYPE_META = {
  typography: { label: "타이포", color: "#A29BFE" },
  banner:     { label: "배너",   color: "#74B9FF" },
  promotion:  { label: "프로모션", color: "#FDCB6E" },
  brandweb:   { label: "브랜드웹", color: "#0eb9b3" },
};

const SUPPORTED_DOC_EXT = /\.(pdf|txt|md|json|docx|pptx)$/i;
const MAX_IMAGES = 10;
const POINT = "#A29BFE";
const SIDEBAR_STORAGE = "brief-studio:historyOpen";

// ─── 파일 헬퍼 ───────────────────────────────────────────
const fileToBase64 = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result).split(",")[1] || "");
  r.onerror = rej;
  r.readAsDataURL(file);
});
const fileToDataUrl = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result));
  r.onerror = rej;
  r.readAsDataURL(file);
});
const fileToText = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result));
  r.onerror = rej;
  r.readAsText(file);
});

// AI JSON 응답 파싱 — 코드블록/잡음 제거 후 추출.
const parseGeminiJson = (raw) => {
  if (!raw) return null;
  let s = String(raw).replace(/```json/gi, "").replace(/```/g, "").trim();
  const a = s.indexOf("{"); const b = s.lastIndexOf("}");
  if (a === -1 || b === -1) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
};

// Firestore timestamp → 짧은 한국어 날짜.
const fmtDate = (ts) => {
  const d = ts?.toDate?.() || (ts instanceof Date ? ts : null);
  if (!d) return "";
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// 작업 플로우 카드용 메타.
const FLOW_APPS = {
  "typecore-sovereign": { label: "타이프코어 소버린", desc: "타이포그래피 설계",     icon: <Type size={16} />,  color: "#A29BFE" },
  "render-matrix":      { label: "렌더 메트릭스",     desc: "재질·라이팅 시뮬레이션", icon: <Box size={16} />,   color: "#74B9FF" },
  "motion-matrix":      { label: "모션 메트릭스",     desc: "모션·인트로 합성",     icon: <Video size={16} />, color: "#FD79A8" },
  "banner-codex":       { label: "배너 코덱스",       desc: "배너 라이브러리",      icon: <Layers size={16} />, color: "#74B9FF" },
  "promotion-archive":  { label: "프로모션 아카이브", desc: "프로모션 자산 관리",   icon: <Layers size={16} />, color: "#FDCB6E" },
  "brand-web-review":   { label: "브랜드웹 리뷰",     desc: "브랜드웹 검수",        icon: <Layers size={16} />, color: "#0eb9b3" },
};

function StudioView() {
  const { user } = useAuth();
  const { navigate } = useGlobal();

  // 1단 — 요청서
  const [docFiles, setDocFiles] = useState([]);
  const [docText, setDocText] = useState("");
  const [genre, setGenre] = useState("rpg");
  const [platform, setPlatform] = useState("mobile");
  const [assigneeUid, setAssigneeUid] = useState("");
  const [users, setUsers] = useState([]);
  const [usersError, setUsersError] = useState("");
  const [isDraggingDoc, setIsDraggingDoc] = useState(false);
  const docInputRef = useRef(null);

  // 2단 — 레퍼런스
  const [imageFiles, setImageFiles] = useState([]); // {file, preview, name, size}
  const [isDraggingImg, setIsDraggingImg] = useState(false);
  const imgInputRef = useRef(null);

  // 3단 — 분석 결과
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState("");
  const [analysisPercent, setAnalysisPercent] = useState(0);
  const [report, setReport] = useState(null);
  const [reportId, setReportId] = useState(null);
  const [error, setError] = useState("");
  const [includeMotion, setIncludeMotion] = useState(false);

  // 0단 — 분석 기록 (서버 저장)
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_STORAGE) !== "0"; } catch { return true; }
  });

  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_STORAGE, sidebarOpen ? "1" : "0"); } catch { /* ignore */ }
  }, [sidebarOpen]);

  // ─── 담당자 목록 로드 ──────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "users"), orderBy("email")));
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

  // ─── 분석 기록 실시간 구독 ─────────────────────────────
  useEffect(() => {
    if (!user) return undefined;
    const q = query(
      collection(db, "briefHistory", user.uid, "reports"),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(q,
      (snap) => {
        setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setHistoryError("");
      },
      (e) => {
        console.warn("[BriefStudio] history 구독 실패", e);
        setHistoryError("기록을 불러올 수 없습니다");
      },
    );
    return unsub;
  }, [user]);

  // ─── 문서/이미지 받기 ──────────────────────────────────
  const acceptDocs = (arr) => {
    if (!arr?.length) return;
    const ok = arr.filter(f => SUPPORTED_DOC_EXT.test(f.name));
    if (ok.length < arr.length) setError("지원 형식: PDF / DOCX / PPTX / TXT / MD / JSON.");
    else setError("");
    setDocFiles(prev => [...prev, ...ok]);
  };
  const acceptImages = async (arr) => {
    if (!arr?.length) return;
    const imgs = arr.filter(f => f.type.startsWith("image/"));
    const room = MAX_IMAGES - imageFiles.length;
    const slice = imgs.slice(0, room);
    if (imgs.length > room) setError(`최대 ${MAX_IMAGES}장까지만 업로드 가능합니다.`);
    const withPreview = await Promise.all(slice.map(async (f) => ({
      file: f, name: f.name, size: f.size, preview: await fileToDataUrl(f),
    })));
    setImageFiles(prev => [...prev, ...withPreview]);
  };

  const onDocPick = (e) => { const arr = Array.from(e.target.files || []); e.target.value = ""; acceptDocs(arr); };
  const onImgPick = (e) => { const arr = Array.from(e.target.files || []); e.target.value = ""; acceptImages(arr); };
  const removeDoc = (i) => setDocFiles(prev => prev.filter((_, idx) => idx !== i));
  const removeImage = (i) => setImageFiles(prev => prev.filter((_, idx) => idx !== i));

  // ─── 기록 불러오기 / 새 분석 / 삭제 ───────────────────
  const loadHistory = (item) => {
    setReport(item);
    setReportId(item.id);
    setSelectedId(item.id);
    setIncludeMotion(false);
    setError("");
    if (item.genre) setGenre(item.genre);
    if (item.platform) setPlatform(item.platform);
    if (item.assigneeUid !== undefined) setAssigneeUid(item.assigneeUid || "");
  };
  const newAnalysis = () => {
    setReport(null);
    setReportId(null);
    setSelectedId(null);
    setError("");
    setAnalysisPercent(0);
    setAnalysisStage("");
  };
  const deleteHistory = async (e, id) => {
    e.stopPropagation();
    if (!user) return;
    if (!window.confirm("이 분석 기록을 삭제할까요?")) return;
    try {
      await deleteDoc(doc(db, "briefHistory", user.uid, "reports", id));
      if (selectedId === id) newAnalysis();
    } catch (err) {
      console.warn("[BriefStudio] 기록 삭제 실패", err);
      setHistoryError("삭제하지 못했습니다");
    }
  };

  // ─── Gemini 분석 ────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!GEMINI_API_KEY) { setError("Gemini API 키가 없습니다."); return; }
    if (docFiles.length === 0 && !docText.trim() && imageFiles.length === 0) {
      setError("문서·텍스트·이미지 중 최소 하나는 필요합니다."); return;
    }
    setError(""); setReport(null); setReportId(null); setSelectedId(null);
    setIsAnalyzing(true); setAnalysisStage("파일 준비 중…"); setAnalysisPercent(10);

    try {
      const parts = [];
      const docSummaries = [];
      // 문서
      for (const f of docFiles) {
        const ext = (f.name.split(".").pop() || "").toLowerCase();
        if (ext === "pdf") {
          const b64 = await fileToBase64(f);
          parts.push({ inlineData: { mimeType: "application/pdf", data: b64 } });
          docSummaries.push(`${f.name} (${(f.size/1024).toFixed(1)}KB, PDF)`);
        } else if (isDocx(f)) {
          try {
            const text = await extractDocxText(f);
            parts.push({ text: `[문서: ${f.name} (DOCX)]\n${text.slice(0, 30000)}` });
            docSummaries.push(`${f.name} (${text.length}자, DOCX)`);
          } catch (e) {
            console.warn("[BriefStudio] DOCX 추출 실패", e);
            setError(`${f.name} 의 텍스트를 읽지 못했습니다. PDF 로 변환해주세요.`);
          }
        } else if (isPptx(f)) {
          try {
            const text = await extractPptxText(f);
            parts.push({ text: `[프레젠테이션: ${f.name} (PPTX)]\n${text.slice(0, 30000)}` });
            docSummaries.push(`${f.name} (${text.length}자, PPTX)`);
          } catch (e) {
            console.warn("[BriefStudio] PPTX 추출 실패", e);
            setError(`${f.name} 의 텍스트를 읽지 못했습니다. PDF 로 변환해주세요.`);
          }
        } else {
          const text = await fileToText(f);
          parts.push({ text: `[문서: ${f.name}]\n${text.slice(0, 30000)}` });
          docSummaries.push(`${f.name} (${text.length}자)`);
        }
      }
      // 직접 입력 텍스트
      if (docText.trim()) parts.push({ text: `[추가 메모]\n${docText.trim().slice(0, 30000)}` });

      setAnalysisStage("이미지 인코딩 중…"); setAnalysisPercent(30);
      const imgSummaries = [];
      for (const it of imageFiles) {
        const b64 = await fileToBase64(it.file);
        parts.push({ inlineData: { mimeType: it.file.type || "image/jpeg", data: b64 } });
        imgSummaries.push(`${it.name} (${(it.size/1024).toFixed(1)}KB)`);
      }

      const assignee = users.find(u => u.uid === assigneeUid);
      const assigneeBlock = assignee
        ? `담당자: ${assignee.displayName || assignee.email} (${assignee.email})`
        : "담당자: 미지정";

      const sysPrompt = `당신은 게임 디자인 브리프 분석 전문가입니다. 첨부된 문서와 레퍼런스 이미지를 종합 분석해 디자인 방향성을 도출하세요.

[기본 설정]
- 장르: ${GENRES.find(g => g.id === genre)?.label || genre}
- 플랫폼: ${PLATFORMS.find(p => p.id === platform)?.label || platform}
- ${assigneeBlock}

[입력 파일]
- 문서 ${docFiles.length}개: ${docSummaries.join(" / ") || "(없음)"}
- 이미지 ${imageFiles.length}개: ${imgSummaries.join(" / ") || "(없음)"}

반드시 아래 JSON 스키마로만 출력 (코드블록·설명 금지). 누락 필드 없게:
{
  "gameName": "게임명 (문서/이미지에서 추출 또는 추정)",
  "projectName": "프로젝트명 (예: 신규 출시 배너, 시즌2 프로모션)",
  "productionTypes": ["typography" 또는 "banner" 또는 "promotion" 또는 "brandweb" 중 해당하는 것들 (복수 가능)],
  "directionSummary": "전체 디자인 방향 한국어 요약 (2~3문장)",
  "keywords": ["핵심 키워드", ...총 3~5개],
  "colorPalette": [{"hex":"#RRGGBB","name":"한국어 색상 이름","role":"primary|accent|background|text"}, ...4~6개],
  "typography": {
    "weight": "thin|light|regular|medium|bold|black",
    "style": "serif|sans|display|script",
    "mood": "한국어 분위기 키워드 2~3개",
    "recommendations": "추천 폰트 또는 폰트 패밀리 (영문)"
  }
}`;

      parts.unshift({ text: sysPrompt });

      setAnalysisStage("Gemini 2.5 분석 중… (30~60초)"); setAnalysisPercent(60);

      const body = {
        contents: [{ role: "user", parts }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
      };
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
      );
      if (!res.ok) throw new Error(`Gemini ${res.status}`);
      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = parseGeminiJson(text);
      if (!parsed) throw new Error("AI 응답을 해석할 수 없습니다.");

      setAnalysisStage("저장 중…"); setAnalysisPercent(90);
      // Firestore 저장
      let savedId = null;
      if (user) {
        try {
          const ref = await addDoc(collection(db, "briefHistory", user.uid, "reports"), {
            ...parsed,
            genre, platform,
            assigneeUid: assignee?.uid || "",
            assigneeName: assignee?.displayName || assignee?.email || "",
            docFiles: docSummaries,
            imageCount: imageFiles.length,
            createdAt: serverTimestamp(),
          });
          savedId = ref.id;
        } catch (e) {
          console.warn("[BriefStudio] 저장 실패", e);
        }
      }

      setReport(parsed);
      setReportId(savedId);
      setSelectedId(savedId);
      setIncludeMotion(false);
      setAnalysisPercent(100); setAnalysisStage("완료");
    } catch (e) {
      setError(`분석 실패: ${e.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ─── 작업 플로우 → 각 앱 ───────────────────────────────
  const buildPayload = (target) => ({
    source: "brief-studio",
    target,
    prompt: {
      text: report?.directionSummary || "",
      tags: report?.keywords || [],
      style: report?.typography?.mood || "",
    },
    image: {
      url: imageFiles[0]?.preview || "",
      metadata: { count: imageFiles.length },
    },
    params: {
      briefReportId: reportId,
      gameName: report?.gameName || "",
      projectName: report?.projectName || "",
      productionTypes: report?.productionTypes || [],
      colorPalette: report?.colorPalette || [],
      typography: report?.typography || {},
    },
  });
  const goToApp = (target) => { navigate(target, buildPayload(target)); };

  const hasInputs = docFiles.length > 0 || docText.trim() || imageFiles.length > 0;
  const hasType = (t) => report?.productionTypes?.includes(t);
  const isAppDisabled = (id) => !!APP_MAP[id]?.disabled;

  return (
    <div
      className="flex h-full overflow-hidden bg-[#0a0a0f] text-slate-100"
      style={{ fontFamily: "'Noto Sans KR', sans-serif", height: "100%" }}
    >
      <style>{`
        .bs-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
        .bs-scroll::-webkit-scrollbar-track { background: transparent; }
        .bs-scroll::-webkit-scrollbar-thumb { background: rgba(162,155,254,0.25); border-radius: 5px; }
        .bs-scroll:hover::-webkit-scrollbar-thumb { background: rgba(162,155,254,0.5); }
      `}</style>

      {/* PANEL 0 — 분석 기록 (서버 저장) */}
      {sidebarOpen ? (
        <aside className="w-[230px] shrink-0 flex flex-col overflow-hidden border-r border-white/10 bg-[#0d0d14]">
          <header className="h-12 flex items-center px-4 border-b border-white/10 shrink-0">
            <History size={14} style={{ color: POINT }} />
            <span className="ml-2 text-[12px] font-bold text-slate-200 flex-1">분석 기록</span>
            <button
              onClick={() => setSidebarOpen(false)}
              title="기록 패널 접기"
              className="text-slate-500 hover:text-slate-200 transition-colors"
            >
              <PanelLeftClose size={15} />
            </button>
          </header>

          <div className="p-3 shrink-0">
            <button
              onClick={newAnalysis}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[11px] font-bold border border-[#A29BFE]/40 text-[#A29BFE] hover:bg-[#A29BFE]/10 transition-colors"
            >
              <Plus size={13} /> 새 분석
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1 bs-scroll">
            {historyError && (
              <div className="text-[10px] text-amber-400/80 px-2 py-1.5">{historyError}</div>
            )}
            {!historyError && history.length === 0 && (
              <div className="text-[10px] text-slate-600 px-2 py-6 text-center leading-relaxed">
                저장된 분석이 없습니다.<br />분석을 실행하면 여기 쌓입니다.
              </div>
            )}
            {history.map((item) => {
              const active = selectedId === item.id;
              const title = item.projectName || item.gameName || "(제목 없음)";
              return (
                <button
                  key={item.id}
                  onClick={() => loadHistory(item)}
                  className={`group w-full text-left px-2.5 py-2 rounded-lg border transition-colors ${
                    active
                      ? "bg-[#A29BFE]/15 border-[#A29BFE]/40"
                      : "bg-white/[0.02] border-transparent hover:border-white/10 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`flex-1 text-[11px] font-bold truncate ${active ? "text-[#A29BFE]" : "text-slate-200"}`}>
                      {title}
                    </span>
                    <span
                      onClick={(e) => deleteHistory(e, item.id)}
                      title="삭제"
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-all shrink-0 cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </span>
                  </div>
                  {item.gameName && item.projectName && (
                    <div className="text-[9px] text-slate-500 truncate mt-0.5">{item.gameName}</div>
                  )}
                  <div className="flex items-center gap-1.5 mt-1">
                    {(item.productionTypes || []).slice(0, 4).map(t => {
                      const m = PRODUCTION_TYPE_META[t]; if (!m) return null;
                      return <span key={t} className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />;
                    })}
                    <span className="text-[9px] text-slate-600 ml-auto">{fmtDate(item.createdAt)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
      ) : (
        <button
          onClick={() => setSidebarOpen(true)}
          title="기록 패널 펼치기"
          className="w-10 shrink-0 flex flex-col items-center pt-3.5 gap-2 border-r border-white/10 bg-[#0d0d14] text-slate-500 hover:text-slate-200 transition-colors"
        >
          <PanelLeftOpen size={16} />
          <History size={14} />
        </button>
      )}

      {/* PANEL 1 — 요청서 */}
      <section className="flex-1 flex flex-col overflow-hidden border-r border-white/10">
        <PanelHeader icon={<FileText size={14} />} title="요청서" subtitle="문서 / 텍스트 / 기본 설정" />
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bs-scroll">
          {/* 문서 업로드 */}
          <div>
            <Label>요청서 문서 <span className="text-slate-500 font-normal">(PDF / DOCX / PPTX / TXT / MD / JSON)</span></Label>
            <label
              onDragOver={(e) => { e.preventDefault(); setIsDraggingDoc(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDraggingDoc(false); }}
              onDrop={(e) => { e.preventDefault(); setIsDraggingDoc(false); acceptDocs(Array.from(e.dataTransfer.files || [])); }}
              className={`relative block w-full py-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors text-center ${
                isDraggingDoc ? "border-[#A29BFE] bg-[#A29BFE]/10" : "border-white/10 hover:border-white/20 bg-white/[0.02]"
              }`}
            >
              <Upload size={20} className="mx-auto mb-2 text-slate-500" />
              <div className="text-[11px] text-slate-500">클릭하거나 드래그하여 업로드</div>
              <input ref={docInputRef} type="file" accept=".pdf,.txt,.md,.json,.docx,.pptx" multiple className="hidden" onChange={onDocPick} />
            </label>
            {docFiles.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {docFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-white/[0.03] border border-white/10 rounded-md text-[11px]">
                    <FileText size={12} className="text-slate-500 shrink-0" />
                    <span className="flex-1 truncate text-slate-300">{f.name}</span>
                    <span className="text-[9px] text-slate-500">{(f.size / 1024).toFixed(1)}KB</span>
                    <button onClick={() => removeDoc(i)} className="text-slate-500 hover:text-slate-200 shrink-0"><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 직접 입력 텍스트 */}
          <div>
            <Label>또는 직접 입력</Label>
            <textarea
              value={docText}
              onChange={(e) => setDocText(e.target.value)}
              placeholder="요청 내용을 텍스트로 입력하세요…"
              rows={5}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-[12px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-[#A29BFE]/50 resize-y leading-relaxed"
              style={{ fontFamily: "inherit" }}
            />
          </div>

          {/* 기본 설정 */}
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="장르" value={genre} onChange={setGenre} options={GENRES} />
            <SelectField label="플랫폼" value={platform} onChange={setPlatform} options={PLATFORMS} />
          </div>

          <div>
            <Label><Users size={11} className="inline mr-1" />담당자</Label>
            {usersError ? (
              <div className="text-[10px] text-amber-400/80 px-2 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded">{usersError}</div>
            ) : (
              <select value={assigneeUid} onChange={(e) => setAssigneeUid(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-[12px] text-slate-200 outline-none focus:border-[#A29BFE]/50">
                <option value="">미지정</option>
                {users.map(u => (
                  <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
                ))}
              </select>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-[11px] text-rose-400">
              <AlertCircle size={12} className="shrink-0 mt-0.5" /> <span>{error}</span>
            </div>
          )}
        </div>

        {/* 분석 시작 */}
        <div className="border-t border-white/10 bg-[#0d0d14] p-3 shrink-0">
          <button
            onClick={handleAnalyze}
            disabled={!hasInputs || isAnalyzing}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg text-[12px] font-bold transition-colors ${
              hasInputs && !isAnalyzing
                ? "bg-[#A29BFE] text-[#0a0a0f] hover:bg-[#b3acff]"
                : "bg-white/5 text-slate-600 cursor-not-allowed"
            }`}
          >
            {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {isAnalyzing ? "분석 중…" : "분석 시작"}
          </button>
        </div>
      </section>

      {/* PANEL 2 — 레퍼런스 */}
      <section className="flex-1 flex flex-col overflow-hidden border-r border-white/10">
        <PanelHeader
          icon={<ImageIcon size={14} />}
          title="레퍼런스"
          subtitle={`이미지 ${imageFiles.length} / ${MAX_IMAGES}장`}
        />
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bs-scroll">
          <label
            onDragOver={(e) => { e.preventDefault(); setIsDraggingImg(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDraggingImg(false); }}
            onDrop={(e) => { e.preventDefault(); setIsDraggingImg(false); acceptImages(Array.from(e.dataTransfer.files || [])); }}
            className={`relative block w-full py-10 border-2 border-dashed rounded-xl cursor-pointer transition-colors text-center ${
              isDraggingImg ? "border-[#A29BFE] bg-[#A29BFE]/10" : "border-white/10 hover:border-white/20 bg-white/[0.02]"
            } ${imageFiles.length >= MAX_IMAGES ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Upload size={24} className="mx-auto mb-2 text-slate-500" />
            <div className="text-[12px] text-slate-300 font-medium">이미지 드래그 앤 드롭</div>
            <div className="text-[10px] text-slate-500 mt-1">최대 {MAX_IMAGES}장</div>
            <input ref={imgInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onImgPick}
              disabled={imageFiles.length >= MAX_IMAGES} />
          </label>

          {imageFiles.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {imageFiles.map((it, i) => (
                <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-white/10 bg-black/30">
                  <img src={it.preview} alt={it.name} className="w-full h-full object-cover" />
                  <button onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-rose-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={11} />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1 bg-gradient-to-t from-black/80 to-transparent text-[9px] text-slate-300 truncate">
                    {it.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* PANEL 3 — AI 분석 결과 */}
      <section className="flex-1 flex flex-col overflow-hidden">
        <PanelHeader icon={<Sparkles size={14} />} title="AI 분석 결과" subtitle={report ? (selectedId && !isAnalyzing ? "기록 불러옴" : "완료") : isAnalyzing ? "분석 중" : "대기"} />
        <div className="flex-1 overflow-y-auto p-5 bs-scroll">
          {!report && !isAnalyzing && (
            <div className="text-center py-16 text-slate-500">
              <Sparkles size={32} className="mx-auto mb-3 text-slate-700" />
              <div className="text-[12px] leading-relaxed">
                좌측에 요청서와 레퍼런스를 등록하고<br />
                <span className="text-[#A29BFE]">[분석 시작]</span> 을 눌러주세요.
              </div>
            </div>
          )}
          {isAnalyzing && (
            <div className="py-16 px-4">
              <div className="flex flex-col items-center gap-3 mb-6">
                <Loader2 size={32} className="animate-spin" style={{ color: POINT }} />
                <div className="text-[12px] text-slate-300 font-medium">{analysisStage}</div>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full transition-all duration-500" style={{ width: `${analysisPercent}%`, background: POINT }} />
              </div>
              <div className="text-[10px] text-slate-500 mt-2 text-center">{analysisPercent}%</div>
            </div>
          )}
          {report && (
            <ResultView
              report={report}
              imageFiles={imageFiles}
              includeMotion={includeMotion}
              setIncludeMotion={setIncludeMotion}
              goToApp={goToApp}
              isAppDisabled={isAppDisabled}
              hasType={hasType}
            />
          )}
        </div>
      </section>
    </div>
  );
}

// ─── 공용 UI 컴포넌트 ────────────────────────────────────
function PanelHeader({ icon, title, subtitle }) {
  return (
    <header className="h-12 flex items-center px-5 border-b border-white/10 bg-[#0d0d14] shrink-0">
      <div className="flex items-center gap-2 text-[12px] flex-1">
        <span className="text-[#A29BFE]">{icon}</span>
        <span className="font-bold text-slate-200">{title}</span>
        {subtitle && <span className="text-slate-500">· {subtitle}</span>}
      </div>
    </header>
  );
}
function Label({ children }) {
  return <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{children}</div>;
}
function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <Label>{label}</Label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-[12px] text-slate-200 outline-none focus:border-[#A29BFE]/50">
        {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ─── 분석 결과 뷰 ────────────────────────────────────────
function ResultView({ report, imageFiles, includeMotion, setIncludeMotion, goToApp, isAppDisabled, hasType }) {
  return (
    <div className="space-y-6">
      {/* 자동 분석 */}
      <section>
        <SectionTitle>자동 분석 결과</SectionTitle>
        <div className="space-y-2 mb-3">
          <KV label="게임명" value={report.gameName} />
          <KV label="프로젝트" value={report.projectName} />
        </div>
        <div className="text-[10px] font-bold text-slate-500 mb-2">제작 종류</div>
        <div className="flex flex-wrap gap-1.5">
          {(report.productionTypes || []).map(t => {
            const m = PRODUCTION_TYPE_META[t]; if (!m) return null;
            return (
              <span key={t} className="px-2.5 py-1 rounded-md text-[10px] font-bold border"
                style={{ background: `${m.color}1A`, color: m.color, borderColor: `${m.color}55` }}>
                {m.label}
              </span>
            );
          })}
        </div>
      </section>

      {/* 컨셉 제안 */}
      <section>
        <SectionTitle>AI 컨셉 제안</SectionTitle>
        {report.directionSummary && (
          <div className="bg-[#A29BFE]/10 border border-[#A29BFE]/20 rounded-lg p-3 mb-3">
            <div className="text-[11px] leading-relaxed text-slate-200 whitespace-pre-wrap">{report.directionSummary}</div>
          </div>
        )}
        {Array.isArray(report.keywords) && report.keywords.length > 0 && (
          <div className="mb-3">
            <div className="text-[10px] font-bold text-slate-500 mb-1.5">핵심 키워드</div>
            <div className="flex flex-wrap gap-1.5">
              {report.keywords.map((k, i) => (
                <span key={i} className="px-2.5 py-1 bg-white/[0.04] border border-white/10 rounded-md text-[10px] text-slate-300">#{k}</span>
              ))}
            </div>
          </div>
        )}
        {Array.isArray(report.colorPalette) && report.colorPalette.length > 0 && (
          <div className="mb-3">
            <div className="text-[10px] font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Palette size={11} /> 컬러 팔레트
            </div>
            <div className="flex flex-wrap gap-1.5">
              {report.colorPalette.map((c, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-white/[0.03] border border-white/10 rounded-md">
                  <span className="w-4 h-4 rounded border border-white/10 shrink-0" style={{ background: c.hex }} />
                  <span className="text-[9px] text-slate-400 font-mono">{c.hex}</span>
                  {c.name && <span className="text-[9px] text-slate-500">· {c.name}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
        {report.typography && (
          <div>
            <div className="text-[10px] font-bold text-slate-500 mb-1.5">타이포 방향</div>
            <div className="bg-white/[0.03] border border-white/10 rounded-lg p-2.5 space-y-1">
              <KV small label="weight" value={report.typography.weight} />
              <KV small label="style" value={report.typography.style} />
              <KV small label="mood" value={report.typography.mood} />
              <KV small label="추천" value={report.typography.recommendations} />
            </div>
          </div>
        )}
      </section>

      {/* 작업 플로우 */}
      {(hasType("typography") || hasType("banner") || hasType("promotion") || hasType("brandweb")) && (
        <section>
          <SectionTitle>작업 플로우</SectionTitle>

          {/* 타이포 워크플로우: Sovereign → Render → Motion(선택) */}
          {hasType("typography") && (
            <div className="space-y-2 mb-3">
              <WorkflowStep n={1} appId="typecore-sovereign" goTo={goToApp} disabled={isAppDisabled("typecore-sovereign")} />
              <WorkflowArrow />
              <WorkflowStep n={2} appId="render-matrix" goTo={goToApp} disabled={isAppDisabled("render-matrix")} />
              <WorkflowArrow dim={!includeMotion} />
              <WorkflowStep
                n={3}
                appId="motion-matrix"
                goTo={goToApp}
                disabled={isAppDisabled("motion-matrix") || !includeMotion}
                optional
                onToggle={() => setIncludeMotion(v => !v)}
                included={includeMotion}
              />
            </div>
          )}

          {/* 단일 앱 이동 */}
          <div className="space-y-2">
            {hasType("banner") &&    <DirectStep appId="banner-codex"       goTo={goToApp} disabled={isAppDisabled("banner-codex")} />}
            {hasType("promotion") && <DirectStep appId="promotion-archive"  goTo={goToApp} disabled={isAppDisabled("promotion-archive")} />}
            {hasType("brandweb") &&  <DirectStep appId="brand-web-review"   goTo={goToApp} disabled={isAppDisabled("brand-web-review")} />}
          </div>
        </section>
      )}

      {!imageFiles.length && (
        <div className="text-[10px] text-slate-500 px-1">
          <AlertCircle size={11} className="inline mr-1" />
          레퍼런스 이미지가 없으면 다음 앱에 전달되는 image 가 비어있습니다.
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }) {
  return <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">{children}</div>;
}
function KV({ label, value, small }) {
  if (!value) return null;
  return (
    <div className={`flex items-start gap-2 ${small ? "text-[10px]" : "text-[11px]"}`}>
      <div className={`${small ? "w-14" : "w-16"} shrink-0 text-slate-500`}>{label}</div>
      <div className="flex-1 text-slate-200 leading-relaxed break-words">{value}</div>
    </div>
  );
}

function WorkflowArrow({ dim }) {
  return (
    <div className={`flex justify-center ${dim ? "opacity-30" : ""}`}>
      <ChevronRight size={14} className="text-slate-600 rotate-90" />
    </div>
  );
}

function WorkflowStep({ n, appId, goTo, disabled, optional, onToggle, included }) {
  const m = FLOW_APPS[appId] || {};
  return (
    <div className={`bg-white/[0.03] border rounded-lg p-3 ${disabled && !optional ? "border-white/10 opacity-50" : "border-white/10"}`}>
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 flex items-center justify-center rounded-md text-[#0a0a0f]" style={{ background: m.color }}>
          {m.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono text-slate-500">STEP {n}</span>
            <span className="text-[12px] font-bold text-slate-200">{m.label}</span>
            {optional && (
              <span className="text-[8px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-slate-400 uppercase">선택</span>
            )}
          </div>
          <div className="text-[10px] text-slate-500">{m.desc}</div>
        </div>
        {optional ? (
          <button onClick={onToggle}
            className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${
              included
                ? "bg-[#A29BFE]/15 border-[#A29BFE]/40 text-[#A29BFE]"
                : "border-white/15 text-slate-400 hover:text-slate-200"
            }`}>
            {included ? <><Check size={10} className="inline mr-0.5" />포함</> : "포함하기"}
          </button>
        ) : null}
        <button
          onClick={() => goTo(appId)}
          disabled={disabled}
          className={`px-2.5 py-1.5 rounded text-[10px] font-bold flex items-center gap-1 transition-colors ${
            disabled
              ? "bg-white/5 text-slate-600 cursor-not-allowed"
              : "bg-[#A29BFE] text-[#0a0a0f] hover:bg-[#b3acff]"
          }`}
        >
          {disabled ? "준비중" : <>바로 이동 <ArrowRight size={11} /></>}
        </button>
      </div>
    </div>
  );
}

function DirectStep({ appId, goTo, disabled }) {
  const m = FLOW_APPS[appId] || {};
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-lg p-3 flex items-center gap-2.5">
      <div className="w-7 h-7 flex items-center justify-center rounded-md text-[#0a0a0f]" style={{ background: m.color }}>
        {m.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-bold text-slate-200">{m.label}</div>
        <div className="text-[10px] text-slate-500">{m.desc}</div>
      </div>
      <button
        onClick={() => goTo(appId)}
        disabled={disabled}
        className={`px-3 py-1.5 rounded text-[10px] font-bold flex items-center gap-1 transition-colors ${
          disabled
            ? "bg-white/5 text-slate-600 cursor-not-allowed"
            : "bg-[#A29BFE] text-[#0a0a0f] hover:bg-[#b3acff]"
        }`}
      >
        {disabled ? "준비중" : <>이동 <ArrowRight size={11} /></>}
      </button>
    </div>
  );
}
