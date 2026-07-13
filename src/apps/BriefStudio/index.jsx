// BriefStudio — 4단 레이아웃: 분석 기록 / 요청서 / 레퍼런스 / AI 분석 결과.
// 분석 완료 후 결과를 Firestore (briefHistory) 에 저장하고, 좌측 기록 메뉴에서 다시 불러온다.
// 작업 플로우 버튼으로 각 앱에 payload 전달. 기본 테마는 다크모드.
import { useEffect, useRef, useState } from "react";
import {
  collection, deleteDoc, doc, onSnapshot, query, getDocs, orderBy, serverTimestamp, setDoc, updateDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { GEMINI_API_KEY } from "../../lib/gemini";
import { useAuth } from "../../context/AuthContext";
import { useGlobal } from "../../context/GlobalContext";
import { APP_MAP } from "../../config/apps";
import {
  Upload, FileText, Image as ImageIcon, X, Loader2, Sparkles,
  ArrowRight, Type, Box, Video, AlertCircle, Users, Check, ChevronRight,
  Palette, Layers, History, Plus, Trash2, PanelLeftClose, PanelLeftOpen, Pencil, Save,
  Move, ZoomIn, ZoomOut, Grid3X3, Maximize2,
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

const DRAFT_STAGE_META = {
  form: { label: "1단계 · 형태", short: "형태", color: "#74B9FF" },
  render: { label: "2단계 · 렌더링", short: "렌더링", color: "#FDCB6E" },
};

async function detectDraftStage(dataUrl) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 160;
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(image, 0, 0, size, size);
      const pixels = ctx.getImageData(0, 0, size, size).data;
      let dark = 0; let light = 0; let neutral = 0; let samples = 0;
      for (let i = 0; i < pixels.length; i += 16) {
        if (pixels[i + 3] < 40) continue;
        const r = pixels[i]; const g = pixels[i + 1]; const b = pixels[i + 2];
        const max = Math.max(r, g, b); const min = Math.min(r, g, b); const value = (r + g + b) / 3;
        if (value < 45) dark += 1;
        if (value > 205) light += 1;
        if (max - min < 24) neutral += 1;
        samples += 1;
      }
      const stage = samples && dark / samples > 0.48 && light / samples > 0.008 && neutral / samples > 0.78 ? "form" : "render";
      resolve({ stage, confidence: stage === "form" ? "high" : "medium" });
    };
    image.onerror = () => resolve({ stage: "render", confidence: "low" });
    image.src = dataUrl;
  });
}

async function evaluateDesignDraft(report, dataUrl, stage = "render") {
  if (!GEMINI_API_KEY) throw new Error("Gemini API 키가 없습니다.");
  const base64 = String(dataUrl || "").split(",")[1];
  const brief = JSON.stringify({
    type: report.designIdeas?.primaryType || report.productionTypes?.[0],
    title: report.projectName,
    concept: report.designIdeas?.visualDirection || report.directionSummary,
    requiredElements: report.requiredElements || [],
    checkpoints: report.designIdeas?.checkpoints || [],
  });
  const stageInstruction = stage === "form"
    ? `이 이미지는 1단계 형태 시안이다. 블랙 배경과 흰색 타이포를 기준으로 글자 실루엣, 비례, 자간, 획의 균형, 가독성, 컨셉을 표현하는 형태만 평가하라. 재질, 조명, 색상, 3D 완성도는 절대 감점하거나 요구하지 마라. JSON만 출력: {"stage":"form","conceptFit":0~100,"formQuality":0~100,"readability":0~100,"summary":"한 문장 총평","strengths":["강점"],"improvements":["형태 수정점"],"nextIdeas":["2단계 렌더 전 발전 방향"]}`
    : `이 이미지는 2단계 렌더링 시안이다. 1단계에서 확정된 타이포 형태를 훼손하지 않았는지, 재질·조명·입체감·디테일이 컨셉과 맞는지 평가하라. 형태 자체를 불필요하게 다시 설계하라고 하지 마라. JSON만 출력: {"stage":"render","conceptFit":0~100,"formPreservation":0~100,"renderQuality":0~100,"summary":"한 문장 총평","strengths":["강점"],"improvements":["렌더 수정점"],"nextIdeas":["렌더 발전 방향"]}`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [
        { text: `당신은 게임 타이포그래피 아트 디렉터입니다. 브리프와 제작 시안을 비교해 짧고 실행 가능하게 평가하세요.\n[브리프]\n${brief}\n[단계별 평가 규칙]\n${stageInstruction}` },
        { inlineData: { mimeType: String(dataUrl).match(/^data:([^;]+)/)?.[1] || "image/png", data: base64 } },
      ] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.35 },
    }),
  });
  if (!response.ok) throw new Error(`Gemini ${response.status}`);
  const json = await response.json();
  return JSON.parse(json?.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
}

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
const makeStoredDraftImage = (dataUrl) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => {
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    let quality = 0.86;
    let result = canvas.toDataURL("image/jpeg", quality);
    while (result.length > 850000 && quality > 0.42) {
      quality -= 0.08;
      result = canvas.toDataURL("image/jpeg", quality);
    }
    resolve(result);
  };
  image.onerror = reject;
  image.src = dataUrl;
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
  const [requestOpen, setRequestOpen] = useState(true);
  const [referenceOpen, setReferenceOpen] = useState(true);
  const [resultOpen, setResultOpen] = useState(true);
  const [drafts, setDrafts] = useState([]);
  const [draftEvaluation, setDraftEvaluation] = useState(null);
  const [evaluatingDraft, setEvaluatingDraft] = useState(false);

  // 0단 — 분석 기록 (서버 저장)
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState("");
  const [resetNotice, setResetNotice] = useState("");
  const resetNoticeTimer = useRef(null);
  const [selectedId, setSelectedId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_STORAGE) !== "0"; } catch { return true; }
  });

  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_STORAGE, sidebarOpen ? "1" : "0"); } catch { /* ignore */ }
  }, [sidebarOpen]);

  useEffect(() => () => {
    if (resetNoticeTimer.current) clearTimeout(resetNoticeTimer.current);
  }, []);

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
    if (!user) {
      // 로그아웃 시 직전 사용자의 메모리 목록과 선택 결과를 즉시 제거한다.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHistory([]);
      setSelectedId(null);
      setReport(null);
      setReportId(null);
      return undefined;
    }
    const q = query(
      collection(db, "briefHistory", user.uid, "reports"),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(q,
      (snap) => {
        setHistory(snap.docs.map(d => ({ id: d.id, ...d.data(), syncState: d.metadata.hasPendingWrites ? "saving" : "saved" })));
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
  const loadHistory = async (item) => {
    setResetNotice("");
    setReport(item);
    setReportId(item.id);
    setSelectedId(item.id);
    setIncludeMotion(false);
    setError("");
    if (item.genre) setGenre(item.genre);
    if (item.platform) setPlatform(item.platform);
    if (item.assigneeUid !== undefined) setAssigneeUid(item.assigneeUid || "");
    try {
      const draftSnap = await getDocs(collection(db, "briefHistory", user.uid, "reports", item.id, "drafts"));
      setDrafts(draftSnap.docs.map((draftDoc) => ({ id: draftDoc.id, ...draftDoc.data() })).sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0)));
    } catch (draftError) {
      console.warn("[BriefStudio] 시안 불러오기 실패", draftError);
      setDrafts([]);
      setHistoryError(`시안을 불러오지 못했습니다: ${draftError?.code || draftError?.message || "연결 오류"}`);
    }
  };
  const newAnalysis = () => {
    if (isAnalyzing) return;
    setReport(null);
    setReportId(null);
    setSelectedId(null);
    setError("");
    setAnalysisPercent(0);
    setAnalysisStage("");
    setDocFiles([]);
    setDocText("");
    setImageFiles([]);
    setGenre("rpg");
    setPlatform("mobile");
    setAssigneeUid("");
    setDrafts([]);
    setDraftEvaluation(null);
    setRequestOpen(true);
    setReferenceOpen(true);
    setResultOpen(true);
    setResetNotice("새 분석 준비 완료 · 요청서나 레퍼런스를 추가하세요");
    if (resetNoticeTimer.current) clearTimeout(resetNoticeTimer.current);
    resetNoticeTimer.current = setTimeout(() => setResetNotice(""), 3500);
  };

  const addDraftFiles = async (files) => {
    const images = Array.from(files || []).filter((file) => file.type.startsWith("image/")).slice(0, 8 - drafts.length);
    const next = await Promise.all(images.map(async (file) => {
      const originalDataUrl = await fileToDataUrl(file);
      const dataUrl = await makeStoredDraftImage(originalDataUrl);
      const detected = await detectDraftStage(dataUrl);
      return { id: `${Date.now()}-${crypto.randomUUID()}`, name: file.name, dataUrl, stage: detected.stage, stageConfidence: detected.confidence, createdAtMs: Date.now() };
    }));
    setDrafts((prev) => [...prev, ...next].slice(0, 8));
    if (!user || !reportId) {
      setHistoryError("시안은 현재 화면에만 추가됐습니다. 저장된 분석 기록을 선택한 뒤 추가해 주세요");
      return;
    }
    next.forEach((draft) => {
      setDoc(doc(db, "briefHistory", user.uid, "reports", reportId, "drafts", draft.id), draft).catch((saveError) => {
        console.warn("[BriefStudio] 시안 저장 실패", saveError);
        setHistoryError(`시안을 저장하지 못했습니다: ${saveError?.code || saveError?.message || "연결 오류"}`);
      });
    });
  };
  const updateDraftStage = (id, stage) => {
    setDrafts((prev) => prev.map((item) => item.id === id ? { ...item, stage, stageConfidence: "manual" } : item));
    if (user && reportId) updateDoc(doc(db, "briefHistory", user.uid, "reports", reportId, "drafts", id), { stage, stageConfidence: "manual" }).catch((stageError) => setHistoryError(`시안 단계를 저장하지 못했습니다: ${stageError?.code || stageError?.message}`));
  };
  const deleteDraft = (id) => {
    setDrafts((prev) => prev.filter((item) => item.id !== id));
    if (user && reportId) deleteDoc(doc(db, "briefHistory", user.uid, "reports", reportId, "drafts", id)).catch((draftError) => setHistoryError(`시안을 삭제하지 못했습니다: ${draftError?.code || draftError?.message}`));
  };
  const evaluateLatestDraft = async (selectedDraftId) => {
    const target = drafts.find((item) => item.id === selectedDraftId) || drafts[drafts.length - 1];
    if (!target || !report || evaluatingDraft) return;
    setEvaluatingDraft(true);
    try {
      const evaluation = { ...(await evaluateDesignDraft(report, target.dataUrl, target.stage)), draftId: target.id, draftName: target.name };
      setDraftEvaluation(evaluation);
      setDrafts((prev) => prev.map((item) => item.id === target.id ? { ...item, evaluation } : item));
      if (user && reportId) updateDoc(doc(db, "briefHistory", user.uid, "reports", reportId, "drafts", target.id), { evaluation }).catch((evaluationError) => setHistoryError(`평가를 저장하지 못했습니다: ${evaluationError?.code || evaluationError?.message}`));
    }
    catch (err) { setError(`시안 평가 실패: ${err.message || err}`); }
    finally { setEvaluatingDraft(false); }
  };
  const deleteHistory = async (e, id) => {
    e.stopPropagation();
    if (!user) { setHistoryError("로그인해야 분석 기록을 삭제할 수 있습니다"); return; }
    if (!window.confirm("이 분석 기록을 삭제할까요?")) return;
    const deleted = history.find((item) => item.id === id);
    setHistory((prev) => prev.filter((item) => item.id !== id));
    if (selectedId === id) newAnalysis();
    setHistoryError("");
    try {
      await deleteDoc(doc(db, "briefHistory", user.uid, "reports", id));
    } catch (err) {
      console.warn("[BriefStudio] 기록 삭제 실패", err);
      if (deleted) setHistory((prev) => prev.some((item) => item.id === id) ? prev : [deleted, ...prev]);
      setHistoryError(`삭제하지 못했습니다: ${err?.code || err?.message || "서버 연결 오류"}`);
    }
  };
  const saveHistoryEdit = async (patch) => {
    if (!user || !editingItem?.id) { setHistoryError("로그인해야 분석 기록을 저장할 수 있습니다"); return; }
    const targetId = editingItem.id;
    const previous = editingItem;
    setHistory((items) => items.map((item) => item.id === targetId ? { ...item, ...patch, syncState: "saving" } : item));
    if (selectedId === targetId) setReport((prev) => prev ? { ...prev, ...patch } : prev);
    setEditingItem(null);
    setHistoryError("");
    try {
      await updateDoc(doc(db, "briefHistory", user.uid, "reports", targetId), {
        ...patch,
        updatedAt: serverTimestamp(),
      });
      setHistory((items) => items.map((item) => item.id === targetId ? { ...item, syncState: "saved" } : item));
    } catch (err) {
      console.warn("[BriefStudio] 기록 수정 실패", err);
      setHistory((items) => items.map((item) => item.id === targetId ? previous : item));
      if (selectedId === targetId) setReport((prev) => prev ? { ...prev, ...previous } : prev);
      setHistoryError(`수정 내용을 저장하지 못했습니다: ${err?.code || err?.message || "서버 연결 오류"}`);
    }
  };

  // ─── Gemini 분석 ────────────────────────────────────────
  const handleAnalyze = async () => {
    setResetNotice("");
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
  },
  "requiredElements": ["다음 제작 단계에서도 반드시 유지할 필수 요소 3~6개"],
  "designIdeas": {
    "primaryType": "typography|banner|promotion|brandweb 중 가장 우선인 작업 한 개",
    "conceptTitle": "아이디어 보드 제목",
    "visualDirection": "형태·구도·재질·색·조명까지 포함한 구체적인 제작 방향 3~5문장",
    "ideaCards": [{"title":"아이디어 이름","description":"실제 제작 가능한 구체적 설명","keywords":["키워드"],"priority":"core|option"}],
    "checkpoints": ["시안 검토 체크 항목"],
    "nextDevelopment": ["완성 시안을 더 발전시키는 방향"]
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
        const ref = doc(collection(db, "briefHistory", user.uid, "reports"));
        const savedReport = {
          ...parsed, genre, platform,
          assigneeUid: assignee?.uid || "",
          assigneeName: assignee?.displayName || assignee?.email || "",
          docFiles: docSummaries,
          imageCount: imageFiles.length,
          createdAt: serverTimestamp(),
        };
        savedId = ref.id;
        setHistory((prev) => [{ id: ref.id, ...savedReport, createdAt: new Date(), syncState: "saving" }, ...prev.filter((item) => item.id !== ref.id)]);
        setDoc(ref, savedReport).then(() => {
          setHistory((prev) => prev.map((item) => item.id === ref.id ? { ...item, syncState: "saved" } : item));
          setHistoryError("");
        }).catch((saveError) => {
          console.warn("[BriefStudio] 저장 실패", saveError);
          setHistory((prev) => prev.map((item) => item.id === ref.id ? { ...item, syncState: "failed" } : item));
          setHistoryError(`분석 결과를 서버에 저장하지 못했습니다: ${saveError?.code || saveError?.message || "연결 오류"}`);
        });
      } else {
        setHistoryError("분석은 완료됐지만 기록 저장에는 로그인이 필요합니다");
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
  const sendDraftToRender = () => {
    const latest = drafts[drafts.length - 1];
    if (!latest) return;
    navigate("render-metrics", {
      ...buildPayload("render-metrics"),
      image: { url: latest.dataUrl, metadata: { from: "brief-studio-board", name: latest.name } },
      params: { ...buildPayload("render-metrics").params, designEvaluation: draftEvaluation || null },
    });
  };

  const hasInputs = docFiles.length > 0 || docText.trim() || imageFiles.length > 0;
  const hasType = (t) => report?.productionTypes?.includes(t);
  const isAppDisabled = (id) => !!APP_MAP[id]?.disabled;

  return (
    <div
      className="flex flex-col h-full overflow-hidden bg-[#0a0a0f] text-slate-100"
      style={{ fontFamily: "'Noto Sans KR', sans-serif", height: "100%" }}
    >
      <style>{`
        .bs-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
        .bs-scroll::-webkit-scrollbar-track { background: transparent; }
        .bs-scroll::-webkit-scrollbar-thumb { background: rgba(162,155,254,0.25); border-radius: 5px; }
        .bs-scroll:hover::-webkit-scrollbar-thumb { background: rgba(162,155,254,0.5); }
      `}</style>

      {report && <CoreBriefBar report={report} />}
      <div className="flex flex-1 min-h-0 overflow-hidden">

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
              disabled={isAnalyzing}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[11px] font-bold border border-[#A29BFE]/40 text-[#A29BFE] hover:bg-[#A29BFE]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                <div
                  key={item.id}
                  onClick={() => loadHistory(item)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") loadHistory(item); }}
                  role="button"
                  tabIndex={0}
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
                    <span className="flex items-center gap-0.5 shrink-0">
                    {item.syncState === "saving" && <Loader2 size={10} className="animate-spin text-amber-300" aria-label="서버에 저장 중" />}
                    {item.syncState === "failed" && <AlertCircle size={10} className="text-rose-400" aria-label="저장 실패" />}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEditingItem(item); }}
                      title="편집"
                      className="text-slate-500 hover:text-[#A29BFE] transition-colors cursor-pointer p-1"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => deleteHistory(e, item.id)}
                      title="삭제"
                      className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer p-1"
                    >
                      <Trash2 size={12} />
                    </button>
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
                </div>
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
      <section className={`${requestOpen ? "flex-1 min-w-[280px]" : "w-11"} flex flex-col overflow-hidden border-r border-white/10 transition-[width]`}>
        <PanelHeader icon={<FileText size={14} />} title="요청서" subtitle="문서 / 텍스트 / 기본 설정" collapsed={!requestOpen} onCollapse={() => setRequestOpen((v) => !v)} />
        {requestOpen && <>
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
          {resetNotice && (
            <div className="flex items-start gap-2 p-2.5 bg-[#A29BFE]/10 border border-[#A29BFE]/30 rounded-lg text-[11px] text-[#c8c3ff]">
              <Check size={12} className="shrink-0 mt-0.5" /> <span>{resetNotice}</span>
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
        </>}
      </section>

      {/* PANEL 2 — 레퍼런스 */}
      <section className={`${referenceOpen ? "flex-1 min-w-[260px]" : "w-11"} flex flex-col overflow-hidden border-r border-white/10 transition-[width]`}>
        <PanelHeader
          icon={<ImageIcon size={14} />}
          title="레퍼런스"
          subtitle={`이미지 ${imageFiles.length} / ${MAX_IMAGES}장`}
          collapsed={!referenceOpen}
          onCollapse={() => setReferenceOpen((v) => !v)}
        />
        {referenceOpen && <>
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
        </>}
      </section>

      {/* PANEL 3 — AI 분석 결과 */}
      <section className={`${resultOpen ? "flex-1 min-w-[320px]" : "w-11"} flex flex-col overflow-hidden transition-[width]`}>
        <PanelHeader icon={<Sparkles size={14} />} title="디자인 아이디어 보드" subtitle={report ? (selectedId && !isAnalyzing ? "기록 불러옴" : "완료") : isAnalyzing ? "분석 중" : "대기"} collapsed={!resultOpen} onCollapse={() => setResultOpen((v) => !v)} />
        {resultOpen && <>
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
            <><ResultView
              report={report}
              imageFiles={imageFiles}
              includeMotion={includeMotion}
              setIncludeMotion={setIncludeMotion}
              goToApp={goToApp}
              isAppDisabled={isAppDisabled}
              hasType={hasType}
            /><ProductionBoard report={report} drafts={drafts} onFiles={addDraftFiles} onDelete={deleteDraft} onStageChange={updateDraftStage} evaluation={draftEvaluation} evaluating={evaluatingDraft} onEvaluate={evaluateLatestDraft} onRender={sendDraftToRender} /></>
          )}
        </div>
        </>}
      </section>
      </div>
      {editingItem && <HistoryEditModal item={editingItem} onClose={() => setEditingItem(null)} onSave={saveHistoryEdit} />}
    </div>
  );
}

function CoreBriefBar({ report }) {
  const primary = report.designIdeas?.primaryType || report.productionTypes?.[0] || "작업";
  const typeLabel = PRODUCTION_TYPE_META[primary]?.label || primary;
  return (
    <div className="shrink-0 min-h-12 px-4 py-2 border-b border-[#A29BFE]/25 bg-[#111118] flex items-center gap-3 overflow-x-auto">
      <span className="shrink-0 px-2 py-1 rounded-md bg-[#A29BFE]/15 border border-[#A29BFE]/35 text-[#A29BFE] text-[10px] font-black">{typeLabel}</span>
      <div className="shrink-0"><div className="text-[10px] text-slate-500">타이틀명</div><div className="text-[12px] font-bold text-white">{report.projectName || report.gameName || "제목 미정"}</div></div>
      <div className="w-px h-7 bg-white/10 shrink-0" />
      <div className="min-w-[240px] flex-1"><div className="text-[10px] text-slate-500">핵심 컨셉</div><div className="text-[11px] text-slate-300 truncate">{report.designIdeas?.conceptTitle || report.directionSummary}</div></div>
      {(report.requiredElements || []).slice(0, 4).map((item) => <span key={item} className="shrink-0 text-[9.5px] px-2 py-1 rounded-full border border-white/10 bg-white/[.03] text-slate-400">{item}</span>)}
    </div>
  );
}

function ProductionBoard({ report, drafts, onFiles, onDelete, onStageChange, evaluation, evaluating, onEvaluate, onRender }) {
  const inputRef = useRef(null);
  const canvasRef = useRef(null);
  const [layout, setLayout] = useState("grid");
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [placements, setPlacements] = useState({});
  const [isDraggingUpload, setIsDraggingUpload] = useState(false);

  const arrangeDrafts = (mode = layout) => {
    const count = Math.max(1, drafts.length);
    const columns = mode === "grid" ? Math.min(3, Math.ceil(Math.sqrt(count))) : Math.min(2, count);
    const width = mode === "grid" ? Math.max(24, Math.min(42, 88 / columns)) : 42;
    const next = {};
    drafts.forEach((item, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      next[item.id] = { x: 4 + column * (92 / columns), y: 5 + row * 32, width };
    });
    setPlacements(next);
  };

  const resizeSelected = (delta) => {
    if (!selectedDraft) return;
    setPlacements((prev) => ({
      ...prev,
      [selectedDraft]: { ...prev[selectedDraft], width: Math.max(18, Math.min(72, (prev[selectedDraft]?.width || 42) + delta)) },
    }));
  };

  const beginDrag = (event, id) => {
    if (!canvasRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedDraft(id);
    const rect = canvasRef.current.getBoundingClientRect();
    const start = placements[id] || { x: 5, y: 5, width: 42 };
    const origin = { x: event.clientX, y: event.clientY };
    const move = (moveEvent) => {
      const dx = ((moveEvent.clientX - origin.x) / rect.width) * 100;
      const dy = ((moveEvent.clientY - origin.y) / rect.height) * 100;
      setPlacements((prev) => ({ ...prev, [id]: { ...start, x: Math.max(0, Math.min(100 - start.width, start.x + dx)), y: Math.max(0, Math.min(78, start.y + dy)) } }));
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  };

  const beginResize = (event, id, fallback) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedDraft(id);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const start = placements[id] || fallback;
    const startX = event.clientX;
    const move = (moveEvent) => {
      const width = Math.max(18, Math.min(72, start.width + ((moveEvent.clientX - startX) / rect.width) * 100));
      setPlacements((prev) => ({ ...prev, [id]: { ...start, width } }));
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  };

  const hasDraggedFiles = (event) => Array.from(event.dataTransfer?.types || []).includes("Files");
  const handleCanvasDragOver = (event) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDraggingUpload(true);
  };
  const handleCanvasDrop = (event) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    setIsDraggingUpload(false);
    const files = Array.from(event.dataTransfer.files || []).filter((file) => file.type.startsWith("image/"));
    if (files.length) onFiles(files);
  };

  const selectedItem = drafts.find((item) => item.id === selectedDraft);
  const visibleEvaluation = selectedDraft ? selectedItem?.evaluation : evaluation;

  return (
    <section className="mt-7 pt-6 border-t border-white/10">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div><SectionTitle>시안 비교 캔버스</SectionTitle><p className="text-[11px] text-slate-500 mt-1">{report.projectName || "현재 브리프"} · <span className="text-sky-300">1단계 형태 {drafts.filter((item) => item.stage === "form").length}</span> · <span className="text-amber-300">2단계 렌더링 {drafts.filter((item) => item.stage !== "form").length}</span></p></div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => { setLayout("grid"); setTimeout(() => arrangeDrafts("grid"), 0); }} className={`px-2.5 py-2 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 ${layout === "grid" ? "border-[#A29BFE]/60 bg-[#A29BFE]/15 text-[#c8c3ff]" : "border-white/10 text-slate-400"}`}><Grid3X3 size={12}/>자동 비교</button>
          <button onClick={() => setLayout("free")} className={`px-2.5 py-2 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 ${layout === "free" ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-300" : "border-white/10 text-slate-400"}`}><Move size={12}/>자유 배치</button>
          <button onClick={() => arrangeDrafts(layout)} disabled={!drafts.length} title="화면에 모두 맞추기" className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white disabled:opacity-30"><Maximize2 size={13}/></button>
          <button onClick={() => resizeSelected(-5)} disabled={!selectedDraft} title="선택 시안 축소" className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white disabled:opacity-30"><ZoomOut size={13}/></button>
          <button onClick={() => resizeSelected(5)} disabled={!selectedDraft} title="선택 시안 확대" className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white disabled:opacity-30"><ZoomIn size={13}/></button>
          {drafts.length < 8 && <button onClick={() => inputRef.current?.click()} className="px-3 py-2 rounded-lg bg-[#A29BFE] text-[#101018] text-[10px] font-black flex items-center gap-1.5"><Plus size={13}/>시안 추가</button>}
        </div>
      </div>
      <div ref={canvasRef} onPointerDown={(e) => { if (e.target === e.currentTarget) setSelectedDraft(null); }} onDragEnter={handleCanvasDragOver} onDragOver={handleCanvasDragOver} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDraggingUpload(false); }} onDrop={handleCanvasDrop} className={`relative h-[clamp(360px,52vh,620px)] overflow-hidden rounded-xl border bg-[#0b0b11] transition-colors ${isDraggingUpload ? "border-[#A29BFE] ring-2 ring-[#A29BFE]/25" : "border-white/10"}`} style={{ backgroundImage: "radial-gradient(circle, rgba(162,155,254,.16) 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
        {isDraggingUpload && <div className="absolute inset-3 z-50 rounded-xl border-2 border-dashed border-[#A29BFE]/70 bg-[#0b0b11]/90 backdrop-blur-sm grid place-items-center pointer-events-none"><span className="flex flex-col items-center gap-2 text-[12px] font-bold text-[#c8c3ff]"><Upload size={24}/>여기에 놓으면 시안으로 추가됩니다<span className="text-[10px] font-normal text-slate-500">여러 이미지를 한 번에 놓을 수 있습니다</span></span></div>}
        {!drafts.length && <button onClick={() => inputRef.current?.click()} className="absolute inset-5 rounded-xl border border-dashed border-white/15 grid place-items-center text-slate-500 hover:border-[#A29BFE]/50 hover:text-[#A29BFE]"><span className="flex flex-col items-center gap-2 text-[11px]"><Upload size={22}/>첫 시안을 올려 비교를 시작하세요</span></button>}
        {drafts.map((item, index) => {
          const place = placements[item.id] || { x: 5 + (index % 2) * 46, y: 6 + Math.floor(index / 2) * 34, width: 42 };
          const selected = selectedDraft === item.id;
          const stage = item.stage || "render";
          const stageMeta = DRAFT_STAGE_META[stage];
          return <div key={item.id} onPointerDown={(e) => beginDrag(e, item.id)} className={`group absolute select-none rounded-lg overflow-hidden border bg-black/70 shadow-xl cursor-grab active:cursor-grabbing ${selected ? "border-[#A29BFE] ring-2 ring-[#A29BFE]/25 z-20" : "border-white/15 z-10"}`} style={{ left: `${place.x}%`, top: `${place.y}%`, width: `${place.width}%`, touchAction: "none" }}>
            <div className="relative aspect-video bg-black/40"><img draggable="false" src={item.dataUrl} alt={item.name} className="w-full h-full object-contain pointer-events-none"/><span className="absolute left-2 top-2 px-2 py-1 rounded-md border bg-black/75 text-[9px] font-black" style={{ color: stageMeta.color, borderColor: `${stageMeta.color}66` }}>{stageMeta.label}{item.stageConfidence !== "manual" && " · 자동"}</span></div>
            <div className="min-h-8 px-2 flex items-center gap-2 bg-[#15151d]"><Move size={10} className="text-slate-600"/><span className="flex-1 text-[9px] text-slate-300 truncate">{item.name}</span><select onPointerDown={(e) => e.stopPropagation()} value={stage} onChange={(e) => onStageChange(item.id, e.target.value)} aria-label={`${item.name} 시안 단계`} className="h-6 rounded border border-white/10 bg-black/40 px-1 text-[9px] text-slate-300 outline-none"><option value="form">1단계 형태</option><option value="render">2단계 렌더링</option></select><button onPointerDown={(e) => e.stopPropagation()} onClick={() => onDelete(item.id)} className="p-1 text-slate-600 hover:text-rose-400" aria-label={`${item.name} 삭제`}><Trash2 size={11}/></button></div>
            <button type="button" onPointerDown={(e) => beginResize(e, item.id, place)} className="absolute right-0 bottom-0 z-30 w-5 h-5 cursor-se-resize text-[#A29BFE] grid place-items-center bg-[#A29BFE]/15 rounded-tl" title="드래그하여 시안 크기 조절" aria-label={`${item.name} 크기 조절`}><span className="block w-2 h-2 border-r border-b border-current"/></button>
          </div>;
        })}
        {!!drafts.length && <div className="absolute left-3 bottom-3 z-30 px-2 py-1 rounded-md bg-black/70 border border-white/10 text-[9px] text-slate-500">이미지 파일을 캔버스에 놓아 추가 · 시안 선택 후 드래그로 배치</div>}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
      <div className="flex gap-2 mt-3">
        <button onClick={() => onEvaluate(selectedDraft)} disabled={!drafts.length || evaluating} className="flex-1 py-2.5 rounded-lg bg-[#A29BFE] text-[#0a0a0f] text-[11px] font-black flex items-center justify-center gap-1.5 disabled:opacity-40">{evaluating ? <Loader2 size={13} className="animate-spin"/> : <Sparkles size={13}/>} {selectedDraft ? "선택 시안 단계별 평가" : "최근 시안 단계별 평가"}</button>
        <button onClick={onRender} disabled={!drafts.length} className="flex-1 py-2.5 rounded-lg border border-cyan-500/35 bg-cyan-500/10 text-cyan-300 text-[11px] font-bold disabled:opacity-40">렌더링 단계로 이동</button>
      </div>
      {visibleEvaluation && <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 space-y-3"><div className="flex items-center gap-2"><span className={`px-2 py-1 rounded-md text-[9px] font-black ${visibleEvaluation.stage === "form" ? "bg-sky-400/10 text-sky-300" : "bg-amber-400/10 text-amber-300"}`}>{DRAFT_STAGE_META[visibleEvaluation.stage || "render"].label} 평가</span><span className="text-[10px] text-slate-500 truncate">{visibleEvaluation.draftName}</span></div>{visibleEvaluation.stage === "form" ? <div className="grid grid-cols-3 gap-2"><Score label="컨셉 형태" value={visibleEvaluation.conceptFit}/><Score label="형태 완성도" value={visibleEvaluation.formQuality}/><Score label="가독성" value={visibleEvaluation.readability}/></div> : <div className="grid grid-cols-3 gap-2"><Score label="컨셉 충실도" value={visibleEvaluation.conceptFit}/><Score label="형태 보존" value={visibleEvaluation.formPreservation}/><Score label="렌더 완성도" value={visibleEvaluation.renderQuality}/></div>}<div className="text-[11px] text-slate-300 leading-relaxed">{visibleEvaluation.summary}</div><IdeaList title="잘 표현된 점" items={visibleEvaluation.strengths}/><IdeaList title="보완할 점" items={visibleEvaluation.improvements}/><IdeaList title={visibleEvaluation.stage === "form" ? "2단계 전에 발전할 점" : "렌더 발전 아이디어"} items={visibleEvaluation.nextIdeas} accent/></div>}
      {selectedDraft && !visibleEvaluation && <div className="mt-3 rounded-xl border border-dashed border-white/10 bg-white/[.02] p-4 text-center text-[10px] text-slate-500">선택한 시안은 아직 평가하지 않았습니다. 위의 ‘선택 시안 단계별 평가’를 눌러주세요.</div>}
    </section>
  );
}

function Score({ label, value }) { return <div className="rounded-lg border border-white/10 bg-white/[.03] p-2.5"><div className="text-[9px] text-slate-500">{label}</div><div className="text-xl font-black text-[#A29BFE] mt-0.5">{Number(value) || 0}<span className="text-[10px] text-slate-600">/100</span></div></div>; }
function IdeaList({ title, items, accent = false }) { if (!Array.isArray(items) || !items.length) return null; return <div><div className={`text-[10px] font-bold mb-1 ${accent ? "text-[#A29BFE]" : "text-slate-500"}`}>{title}</div><ul className="space-y-1 text-[10.5px] text-slate-400">{items.map((item, i) => <li key={i}>• {item}</li>)}</ul></div>; }

function HistoryEditModal({ item, onClose, onSave }) {
  const [draft, setDraft] = useState(() => ({
    gameName: item.gameName || "",
    projectName: item.projectName || "",
    directionSummary: item.directionSummary || "",
    keywordsText: Array.isArray(item.keywords) ? item.keywords.join(", ") : "",
  }));
  const [saving, setSaving] = useState(false);
  const update = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));
  const submit = async () => {
    if (saving || !draft.projectName.trim()) return;
    setSaving(true);
    await onSave({
      gameName: draft.gameName.trim(),
      projectName: draft.projectName.trim(),
      directionSummary: draft.directionSummary.trim(),
      keywords: draft.keywordsText.split(",").map((v) => v.trim()).filter(Boolean).slice(0, 12),
    });
    setSaving(false);
  };
  const fieldClass = "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-[12px] text-slate-200 outline-none focus:border-[#A29BFE]/60";
  return (
    <div className="fixed inset-0 z-[2300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111118] shadow-2xl overflow-hidden">
        <header className="flex items-center gap-2 px-5 py-4 border-b border-white/10">
          <Pencil size={14} className="text-[#A29BFE]" />
          <div className="flex-1">
            <div className="text-[13px] font-bold text-slate-100">분석 기록 편집</div>
            <div className="text-[10px] text-slate-500 mt-0.5">목록과 AI 분석 결과에 함께 반영됩니다.</div>
          </div>
          <button onClick={onClose} aria-label="닫기" className="p-1.5 rounded-md text-slate-500 hover:text-white hover:bg-white/5"><X size={14}/></button>
        </header>
        <div className="p-5 space-y-4">
          <label className="block"><Label>게임명</Label><input value={draft.gameName} onChange={(e) => update("gameName", e.target.value)} className={fieldClass} placeholder="게임명" /></label>
          <label className="block"><Label>프로젝트명 *</Label><input value={draft.projectName} onChange={(e) => update("projectName", e.target.value)} className={fieldClass} placeholder="프로젝트명" autoFocus /></label>
          <label className="block"><Label>디자인 방향</Label><textarea value={draft.directionSummary} onChange={(e) => update("directionSummary", e.target.value)} rows={5} className={`${fieldClass} resize-y leading-relaxed`} placeholder="분석된 디자인 방향" /></label>
          <label className="block"><Label>핵심 키워드</Label><input value={draft.keywordsText} onChange={(e) => update("keywordsText", e.target.value)} className={fieldClass} placeholder="판타지, 웅장함, 금속" /><div className="mt-1 text-[10px] text-slate-600">쉼표로 구분해 최대 12개까지 저장됩니다.</div></label>
        </div>
        <footer className="flex justify-end gap-2 px-5 py-4 border-t border-white/10 bg-[#0d0d14]">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-white/10 text-[11px] font-bold text-slate-400 hover:text-white">취소</button>
          <button onClick={submit} disabled={saving || !draft.projectName.trim()} className="px-4 py-2 rounded-lg bg-[#A29BFE] text-[#0a0a0f] text-[11px] font-black flex items-center gap-1.5 disabled:opacity-40">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} {saving ? "저장 중…" : "변경 저장"}
          </button>
        </footer>
      </div>
    </div>
  );
}

// ─── 공용 UI 컴포넌트 ────────────────────────────────────
function PanelHeader({ icon, title, subtitle, collapsed = false, onCollapse }) {
  return (
    <header className={`h-12 flex items-center ${collapsed ? "justify-center px-0" : "px-4"} border-b border-white/10 bg-[#0d0d14] shrink-0`}>
      <div className="flex items-center gap-2 text-[12px] flex-1">
        <span className="text-[#A29BFE]">{icon}</span>
        {!collapsed && <><span className="font-bold text-slate-200">{title}</span>{subtitle && <span className="text-slate-500">· {subtitle}</span>}</>}
      </div>
      {onCollapse && <button onClick={onCollapse} title={collapsed ? `${title} 펼치기` : `${title} 접기`} className="p-1.5 rounded-md text-slate-500 hover:text-white hover:bg-white/5 shrink-0">{collapsed ? <ChevronRight size={14}/> : <PanelLeftClose size={14}/>}</button>}
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
  const ideas = report.designIdeas || {};
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

      {(ideas.visualDirection || ideas.ideaCards?.length) && (
        <section>
          <SectionTitle>디자인 아이디어 보드</SectionTitle>
          <div className="rounded-xl border border-[#A29BFE]/25 bg-[#A29BFE]/[.06] p-3 mb-3">
            <div className="text-[13px] font-black text-[#A29BFE]">{ideas.conceptTitle || "추천 제작 방향"}</div>
            {ideas.visualDirection && <p className="text-[11px] leading-relaxed text-slate-300 mt-1.5 whitespace-pre-wrap">{ideas.visualDirection}</p>}
          </div>
          <div className="space-y-2">
            {(ideas.ideaCards || []).map((idea, index) => <div key={`${idea.title}-${index}`} className="rounded-lg border border-white/10 bg-white/[.025] p-3"><div className="flex items-center gap-2"><span className="w-5 h-5 rounded-full grid place-items-center text-[9px] font-black bg-[#A29BFE]/15 text-[#A29BFE]">{index + 1}</span><div className="text-[11px] font-bold text-slate-200">{idea.title}</div>{idea.priority === "core" && <span className="ml-auto text-[8px] rounded px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-300">필수</span>}</div><p className="text-[10.5px] text-slate-400 leading-relaxed mt-2">{idea.description}</p><div className="flex flex-wrap gap-1 mt-2">{(idea.keywords || []).map((keyword) => <span key={keyword} className="text-[9px] text-slate-500">#{keyword}</span>)}</div></div>)}
          </div>
          <IdeaList title="시안 검토 기준" items={ideas.checkpoints} />
          <IdeaList title="완성 후 발전 방향" items={ideas.nextDevelopment} accent />
        </section>
      )}

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
              <WorkflowStep n={2} appId="render-metrics" goTo={goToApp} disabled={isAppDisabled("render-metrics")} />
              <WorkflowArrow dim={!includeMotion} />
              <WorkflowStep
                n={3}
                appId="motion-metrics"
                goTo={goToApp}
                disabled={isAppDisabled("motion-metrics") || !includeMotion}
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
