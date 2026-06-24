// BriefStudio · Prism — prism/PromoSpecial.jsx
// "오늘의 상품 스페셜" 전용 모드 (다크). 수정요청서 → (Gemini, 플러그인 구조 스키마) 구조화 추출
// → 실제 페이지 디자인 구조를 닮은 기획서 미리보기 + 플러그인 "데이터 채우기"용 JSON.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Upload, FileText, Image as ImageIcon, X, Loader2, Copy, Check, AlertCircle,
  Sparkles, Search, ScrollText, Plus, History, Gem, Trash2,
} from "lucide-react";
import { useGlobal } from "../../../context/GlobalContext";
import { subscribePromoItems, savePromoItem, deletePromoItem } from "./promoStore.js";
import { GeminiProvider } from "./gemini.js";
import { loadPptx, slidesToText } from "./pptx.js";
import { PROMO_SCHEMA, TRANSCRIBE_SCHEMA, toPluginJson, promoStats } from "./promoSchema.js";
import { promoExtractionPrompt, promoMergePrompt, transcribePrompt } from "./promoPrompt.js";

// 1단계: 이미지/PDF가 있으면 "반영 희망 내용"만 텍스트로 전사(배너 무시) 후 baseText와 합침.
// 반환 { sourceText, redByBox } — redByBox 는 상자별 빨강 아이템 묶음(코드에서 slotIcons 결정적 주입에 사용).
async function transcribeIfImages(provider, files, baseText) {
  if (!files.length) return { sourceText: baseText, redByBox: [] };
  // flash(기본) — 빠르고 배포 환경 타임아웃 없음. 빨강 인식이 일부 빠져도 결정적 주입 + 수동 편집(검수 패널)으로 보완.
  const tr = await provider.generateJSON({
    prompt: transcribePrompt(),
    parts: files.map((f) => ({ mimeType: f.mimeType, base64: f.base64 })),
    schema: TRANSCRIBE_SCHEMA, temperature: 0,
  });
  const transcript = (tr && tr.transcript) || "";
  const reds = (tr && tr.redItems) || [];
  // 같은 상자(box)의 빨강 항목 여러 개를 모은다 — 대표 아이콘 4종이 모두 들어가게.
  const byBox = new Map();
  for (const r of reds) {
    if (!r || !r.item) continue;
    const box = (r.box || "?").trim();
    const it = String(r.item).trim();
    if (!it) continue;
    if (!byBox.has(box)) byBox.set(box, []);
    if (!byBox.get(box).includes(it)) byBox.get(box).push(it);
  }
  const redByBox = [...byBox.entries()].map(([box, items]) => ({ box, items }));
  const redInfo = redByBox.map(({ box, items }) => `${box} → ${items.join(" + ")}`).join("\n");
  const sourceText = [
    transcript,
    redInfo ? "[붉은색 대표 아이콘 (상자→아이템)]\n" + redInfo : "",
    baseText ? "[추가 입력 텍스트]\n" + baseText : "",
  ].filter(Boolean).join("\n\n");
  return { sourceText, redByBox };
}

// transcribe 가 잡은 상자별 빨강 아이템을 boxes 순서에 맞춰 slotIcons 에 결정적으로 주입한다.
// (모델이 여러 빨강을 1개로 합치거나 grouped 힌트를 무시하는 문제를 코드에서 차단)
// 상자명은 공백 무시 + 포함 관계로 매칭. 매칭되는 상자만 덮어쓰고, 없으면 모델 값 유지.
function applyRedIconsToBoxes(out, redByBox) {
  if (!out || !Array.isArray(out.boxes) || !Array.isArray(redByBox) || !redByBox.length) return out;
  const norm = (s) => String(s || "").replace(/\s+/g, "").toLowerCase();
  const slot = Array.isArray(out.slotIcons) ? out.slotIcons.slice() : [];
  out.boxes.forEach((b, i) => {
    const nm = norm(b && b.name);
    const full = norm(b && (b.top ? b.top + b.name : b.name));
    const hit = redByBox.find((rb) => {
      const k = norm(rb.box);
      if (!k) return false;
      return (nm && (k.includes(nm) || nm.includes(k))) || (full && (k.includes(full) || full.includes(k)));
    });
    if (hit && hit.items && hit.items.length) slot[i] = hit.items.join(" + ");
  });
  out.slotIcons = slot;
  return out;
}

// 큰 이미지(특히 세로로 긴 캡처)는 Gemini 처리가 느려 타임아웃 → 보내기 전 4MP 이하로 다운스케일(텍스트 가독성 유지).
function downscaleImagePart(file) {
  return new Promise((resolve) => {
    const fr = new FileReader();
    fr.onload = () => {
      const dataUrl = String(fr.result);
      const img = new Image();
      img.onload = () => {
        const MAX_PX = 4000000;
        const px = (img.width || 0) * (img.height || 0);
        if (!px || px <= MAX_PX) { resolve({ mimeType: file.type, base64: dataUrl.split(",")[1] }); return; }
        const scale = Math.sqrt(MAX_PX / px);
        const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
        try {
          const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
          cv.getContext("2d").drawImage(img, 0, 0, w, h);
          resolve({ mimeType: "image/jpeg", base64: cv.toDataURL("image/jpeg", 0.85).split(",")[1], scaled: `${img.width}x${img.height}→${w}x${h}` });
        } catch (e) { resolve({ mimeType: file.type, base64: dataUrl.split(",")[1] }); }
      };
      img.onerror = () => resolve({ mimeType: file.type, base64: dataUrl.split(",")[1] });
      img.src = dataUrl;
    };
    fr.onerror = () => resolve(null);
    fr.readAsDataURL(file);
  });
}
import { GEMINI_API_KEY } from "../../../lib/gemini";

// 앱 크롬 다크 토큰 (THEME_DARK 계열)
const C = { bg: "#0A0A0F", panel: "#16161F", panel2: "#111118", border: "#23232f", text: "#E8E6FF", muted: "#8A8AA3", accent: "#0eb9b3" };
const taCls =
  "w-full rounded-lg font-mono text-[13px] p-3 leading-relaxed resize-y outline-none placeholder:text-slate-500";
const taStyle = { background: C.panel2, border: `1px solid ${C.border}`, color: C.text };

// 보너스 상세 팝업(돋보기 연결)의 ptxt 슬롯키 — 플러그인 ptxt/{키} 노드와 1:1.
const POPUP_SLOTS = ["무기제목", "천체조각제목", "천체조각1명", "천체조각2명", "흑장미제목", "의상제목"];

const STORE = "briefStudio:promoSpecial:v1";
const loadSession = () => { try { return JSON.parse(localStorage.getItem(STORE) || "null") || {}; } catch { return {}; } };

// 생성한 데이터 목록(다건) — 좌측 사이드바. 분석/병합할 때마다 항목으로 쌓이고 클릭해 불러온다.
const ITEMS_KEY = "briefStudio:promoSpecial:items:v1";
const loadItems = () => { try { return JSON.parse(localStorage.getItem(ITEMS_KEY) || "[]") || []; } catch { return []; } };
const saveItems = (arr) => { try { localStorage.setItem(ITEMS_KEY, JSON.stringify(arr)); } catch { /* quota: 다음 변경 시 재시도 */ } };
const titleOf = (d) => (d?.meta?.month ? d.meta.month + " " : "") + "오늘의 상품 스페셜";
const fmtTime = (ms) => {
  if (!ms) return "";
  try { const d = new Date(ms); const p = (n) => String(n).padStart(2, "0"); return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`; }
  catch { return ""; }
};

export default function PromoSpecial() {
  const provider = useMemo(() => {
    try { return new GeminiProvider({ apiKey: GEMINI_API_KEY }); } catch (e) { return { _err: e.message }; }
  }, []);
  const { user } = useGlobal();
  const seed = useState(loadSession)[0];

  // 좌측 목록(다건) + 현재 활성 항목 id. 레거시(단일 STORE) 세션은 첫 로드 시 목록에 1건으로 흡수.
  const legacyId = seed.currentId || (seed.data ? "s-legacy" : null);
  const [items, setItems] = useState(() => {
    const list = loadItems();
    if (seed.data && legacyId && !list.some((x) => x.id === legacyId)) {
      list.unshift({ id: legacyId, title: titleOf(seed.data), month: seed.data?.meta?.month || "", rev: seed.rev || 1, stats: promoStats(seed.data), kvTheme: seed.kvTheme || null, kvName: seed.kvName || "", data: seed.data, createdAt: Date.now(), updatedAt: Date.now() });
      saveItems(list);
    }
    return list;
  });
  const [currentId, setCurrentId] = useState(legacyId);

  const [files, setFiles] = useState([]);
  const [pptxTexts, setPptxTexts] = useState([]);
  const [pasted, setPasted] = useState(seed.pasted || "");
  const [note, setNote] = useState(seed.note || "");
  const [data, setData] = useState(seed.data || null);
  const [rev, setRev] = useState(seed.rev || (seed.data ? 1 : 0)); // 적용 차수 (1차/2차/…)
  const [lastChanges, setLastChanges] = useState(seed.lastChanges || []); // 직전 병합 변경내역
  const [st, setSt] = useState({ state: "", msg: "" });
  const [isDragging, setIsDragging] = useState(false);
  const [tab, setTab] = useState("brief");
  const [copyMsg, setCopyMsg] = useState("");
  const [view, setView] = useState("pc"); // 기획서 PC/모바일 미리보기
  const [kvTheme, setKvTheme] = useState(seed.kvTheme || null); // 키비주얼 추출 테마(없으면 기본 그린)
  const [kvName, setKvName] = useState(seed.kvName || "");      // 키비주얼 파일명(썸네일 라벨)
  const [showEdit, setShowEdit] = useState(false);             // 텍스트 검수·수정 패널 토글
  const fileRef = useRef(null);
  const kvRef = useRef(null);

  // 2차(이후) 수정요청서 입력
  const [secFiles, setSecFiles] = useState([]);
  const [secPptx, setSecPptx] = useState([]);
  const [secPasted, setSecPasted] = useState("");
  const [secNote, setSecNote] = useState("");
  const [secDrag, setSecDrag] = useState(false);

  // 서버(Firestore) 동기화 — 로그인 사용자 기준으로 목록을 구독. 다른 컴퓨터에서도 동일 목록이 보이고
  // 삭제 전까지 유지된다. 첫 스냅샷에서 로컬(localStorage) 전용 항목을 서버로 1회 마이그레이션.
  const migratedRef = useRef(false);
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribePromoItems(user.uid, (serverItems) => {
      if (!migratedRef.current) {
        migratedRef.current = true;
        const ids = new Set(serverItems.map((s) => s.id));
        loadItems().forEach((it) => { if (it?.id && it.data && !ids.has(it.id)) savePromoItem(user.uid, it).catch(() => {}); });
      }
      setItems(serverItems);
      saveItems(serverItems); // 로컬 캐시도 최신으로
    });
    return () => unsub();
  }, [user]);

  // 작업본을 STORE(마지막 세션) 에 저장하고, data·currentId 가 있으면 좌측 목록에도 upsert(+서버 저장).
  // (effect 가 아니라 명시적 호출 — 모든 데이터 변경 지점이 이미 persist 를 호출함)
  const persist = (next) => {
    const obj = { pasted, note, data, rev, lastChanges, kvTheme, kvName, currentId, ...next };
    try { localStorage.setItem(STORE, JSON.stringify(obj)); } catch { /* noop */ }
    if (obj.data && obj.currentId) {
      const existing = items.find((x) => x.id === obj.currentId); // 생성 시각 보존(위치 고정)
      const ts = Date.now();
      const entry = { id: obj.currentId, title: titleOf(obj.data), month: obj.data?.meta?.month || "", rev: obj.rev, stats: promoStats(obj.data), kvTheme: obj.kvTheme, kvName: obj.kvName, data: obj.data, createdAt: existing?.createdAt || ts, updatedAt: ts };
      setItems((prev) => {
        const idx = prev.findIndex((x) => x.id === obj.currentId);
        const arr = idx >= 0 ? prev.map((x, i) => (i === idx ? entry : x)) : [entry, ...prev];
        saveItems(arr);
        return arr;
      });
      if (user?.uid) savePromoItem(user.uid, entry).catch((e) => console.warn("[promoStore] 저장 실패", e?.code || e));
    }
  };

  // 새 분석 시작 — 현재 작업창만 비움(목록은 유지). 기존 작업은 이미 목록에 저장돼 있음.
  const newAnalysis = () => {
    setCurrentId(null); setData(null); setRev(0); setLastChanges([]);
    setFiles([]); setPptxTexts([]); setPasted(""); setNote("");
    setSecFiles([]); setSecPptx([]); setSecPasted(""); setSecNote("");
    setKvTheme(null); setKvName(""); setSt({ state: "", msg: "" }); setTab("brief");
    persist({ data: null, rev: 0, lastChanges: [], kvTheme: null, kvName: "", pasted: "", note: "", currentId: null });
  };

  // 목록 항목 불러오기 — 그 데이터를 작업창으로 복원.
  const loadItem = (it) => {
    setCurrentId(it.id); setData(it.data || null); setRev(it.rev || 1); setLastChanges([]);
    setKvTheme(it.kvTheme || null); setKvName(it.kvName || "");
    setFiles([]); setPptxTexts([]); setPasted(""); setNote("");
    setSecFiles([]); setSecPptx([]); setSecPasted(""); setSecNote("");
    setSt({ state: "", msg: "" }); setTab("brief");
    persist({ data: it.data || null, rev: it.rev || 1, lastChanges: [], kvTheme: it.kvTheme || null, kvName: it.kvName || "", pasted: "", note: "", currentId: it.id });
  };

  // 목록 항목 삭제. 현재 보고 있던 항목이면 작업창도 비움.
  const deleteItem = (id, e) => {
    if (e) e.stopPropagation();
    if (!confirm("이 분석 기록을 삭제할까요?")) return;
    setItems((prev) => { const nextArr = prev.filter((x) => x.id !== id); saveItems(nextArr); return nextArr; });
    if (user?.uid) deletePromoItem(user.uid, id).catch((e2) => console.warn("[promoStore] 삭제 실패", e2?.code || e2));
    if (currentId === id) newAnalysis();
  };

  // 키비주얼 업로드 → 색 추출 → 기획서 테마 교체
  const onKvPick = async (file) => {
    if (!file) return;
    setKvName(file.name);
    const theme = await extractKvTheme(file);
    if (theme) { setKvTheme(theme); persist({ kvTheme: theme, kvName: file.name }); }
    else { setKvName(""); }
  };
  const clearKv = () => { setKvTheme(null); setKvName(""); persist({ kvTheme: null, kvName: "" }); if (kvRef.current) kvRef.current.value = ""; };

  // ── 추출 결과 직접 수정 (오타 교정·검수) — popupTexts/replacements 편집 후 즉시 반영·영속 ──
  const patchData = (patch) => { const next = { ...(data || {}), ...patch }; setData(next); persist({ data: next }); };
  const setPText = (i, value) => { const a = [...(data.popupTexts || [])]; a[i] = { ...a[i], value }; patchData({ popupTexts: a }); };
  const setPKey = (i, key) => { const a = [...(data.popupTexts || [])]; a[i] = { ...a[i], key }; patchData({ popupTexts: a }); };
  // 상품별 대표 아이콘 직접 편집 — 여러 종은 ' + '로 구분(플러그인이 분리·합성).
  const setSlotIcon = (i, value) => { const a = [...(data.slotIcons || [])]; while (a.length <= i) a.push(""); a[i] = value; patchData({ slotIcons: a }); };
  const addPText = () => patchData({ popupTexts: [...(data.popupTexts || []), { key: POPUP_SLOTS.find((k) => !(data.popupTexts || []).some((t) => t.key === k)) || POPUP_SLOTS[0], value: "" }] });
  const delPText = (i) => { const a = [...(data.popupTexts || [])]; a.splice(i, 1); patchData({ popupTexts: a }); };
  const setRep = (i, f, v) => { const a = [...(data.replacements || [])]; a[i] = { ...a[i], [f]: v }; patchData({ replacements: a }); };
  const addRep = () => patchData({ replacements: [...(data.replacements || []), { before: "", after: "" }] });
  const delRep = (i) => { const a = [...(data.replacements || [])]; a.splice(i, 1); patchData({ replacements: a }); };

  const pluginJson = useMemo(() => (data ? toPluginJson(data) : null), [data]);
  const pluginJsonText = useMemo(() => (pluginJson ? JSON.stringify(pluginJson, null, 2) : ""), [pluginJson]);

  // 파일 수집기 (1차/2차 공용) — setF: 파일 setter, setP: pptx 텍스트 setter
  const ingest = (list, setF, setP) => {
    [...list].forEach(async (f) => {
      const isPdf = f.type === "application/pdf";
      const isImg = /^image\/(png|jpe?g|webp|gif)$/.test(f.type);
      const isPptx = /\.pptx$/i.test(f.name) || f.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation";
      if (isPptx) {
        try {
          // OOXML <a:t> 가 authoritative — 표·넘침·노트까지 전부 텍스트로 들어온다.
          // 임베드 이미지(대개 옛 배너 스크린샷)는 비전 왜곡원이라 자동 첨부하지 않음 → PPT는 텍스트 전용(완전 자동).
          // 배너 레이아웃 확인이 필요하면 사용자가 해당 이미지를 따로 올리면 된다.
          const { slides } = await loadPptx(f);
          setP((p) => [...p, { name: f.name, text: slidesToText(slides) }]);
        } catch (e) { setSt({ state: "err", msg: "PPTX 읽기 실패: " + e.message }); }
        return;
      }
      if (!isPdf && !isImg) return;
      if (isImg) {
        const part = await downscaleImagePart(f);
        if (part && part.base64) setF((p) => [...p, { name: f.name, mimeType: part.mimeType, base64: part.base64 }]);
        return;
      }
      const r = new FileReader();
      r.onload = () => setF((p) => [...p, { name: f.name, mimeType: f.type, base64: String(r.result).split(",")[1] }]);
      r.readAsDataURL(f);
    });
  };
  const addFiles = (list) => ingest(list, setFiles, setPptxTexts);
  const addSecFiles = (list) => ingest(list, setSecFiles, setSecPptx);

  // 클립보드 붙여넣기(Ctrl+V) — 이미지가 있으면 파일로 추가. (텍스트는 textarea 기본 동작 유지)
  const handlePaste = (e, addFn) => {
    const items = (e.clipboardData && e.clipboardData.items) || [];
    const imgs = [];
    for (const it of items) {
      if (it.type && it.type.indexOf("image") === 0) {
        const f = it.getAsFile();
        if (f) imgs.push(f.name ? f : new File([f], `붙여넣은이미지-${imgs.length + 1}.png`, { type: f.type || "image/png" }));
      }
    }
    if (imgs.length) { e.preventDefault(); addFn(imgs); }
  };

  const analyze = async () => {
    if (provider._err) return setSt({ state: "err", msg: provider._err });
    if (!files.length && !pasted.trim() && !pptxTexts.length) return setSt({ state: "err", msg: "요청서 파일이나 텍스트를 먼저 넣어주세요" });
    setSt({ state: "run", msg: files.length ? "1/2 요청서 전사 중… (이미지→텍스트, 배너 무시)" : "요청서 분석 중… (20~50초)" });
    try {
      const baseText = [...pptxTexts.map((p) => `[${p.name}]\n${p.text}`), pasted.trim()].filter(Boolean).join("\n\n");
      const { sourceText, redByBox } = await transcribeIfImages(provider, files, baseText);
      if (files.length) setSt({ state: "run", msg: "2/2 구조화 추출 중…" });
      const prompt = promoExtractionPrompt(note.trim()) + (sourceText ? "\n\n[반영 희망 내용 (전사)]\n" + sourceText : "");
      const out = applyRedIconsToBoxes(await provider.generateJSON({ prompt, parts: [], schema: PROMO_SCHEMA, temperature: 0 }), redByBox);
      const id = "s" + Date.now(); // 새 분석마다 새 목록 항목
      setCurrentId(id);
      setData(out); setRev(1); setLastChanges([]); persist({ data: out, rev: 1, lastChanges: [], currentId: id }); setTab("brief");
      const s = promoStats(out);
      setSt({ state: "ok", msg: `1차 분석 완료 — 상품 ${s.boxes} · 보너스 ${s.milestones} · 팝업 ${s.days}일 · 치환 ${s.replacements}` });
    } catch (e) { setSt({ state: "err", msg: "실패: " + e.message }); }
  };

  // 2차(이후) 수정요청서 병합 — 1차 데이터에 변경/추가분만 반영
  const applySecond = async () => {
    if (provider._err) return setSt({ state: "err", msg: provider._err });
    if (!data) return setSt({ state: "err", msg: "먼저 1차 요청서를 분석해주세요" });
    if (!secFiles.length && !secPasted.trim() && !secPptx.length) return setSt({ state: "err", msg: "2차 수정요청서 파일이나 텍스트를 넣어주세요" });
    const next = rev + 1;
    setSt({ state: "run", msg: secFiles.length ? `${next}차 1/2 전사 중…` : `${next}차 수정요청서 반영 중…` });
    try {
      const baseText = [...secPptx.map((p) => `[${p.name}]\n${p.text}`), secPasted.trim()].filter(Boolean).join("\n\n");
      const { sourceText, redByBox } = await transcribeIfImages(provider, secFiles, baseText);
      if (secFiles.length) setSt({ state: "run", msg: `${next}차 2/2 반영 중…` });
      const base = { meta: data.meta, boxes: data.boxes, slotIcons: data.slotIcons, rollovers: data.rollovers, milestones: data.milestones, popupDays: data.popupDays, popupTexts: data.popupTexts, replacements: data.replacements };
      const prompt = promoMergePrompt(JSON.stringify(base, null, 1), secNote.trim()) + (sourceText ? "\n\n[이번 차수 변경 (전사)]\n" + sourceText : "");
      const out = applyRedIconsToBoxes(await provider.generateJSON({ prompt, parts: [], schema: PROMO_SCHEMA, temperature: 0 }), redByBox);
      const changes = out.changes || [];
      setData(out); setRev(next); setLastChanges(changes); persist({ data: out, rev: next, lastChanges: changes }); setTab("brief");
      setSecFiles([]); setSecPptx([]); setSecPasted(""); setSecNote("");
      setSt({ state: "ok", msg: `${next}차 반영 완료 — 변경 ${changes.length}건` });
    } catch (e) { setSt({ state: "err", msg: "실패: " + e.message }); }
  };

  const copyJson = () => navigator.clipboard.writeText(pluginJsonText)
    .then(() => { setCopyMsg("복사됨 ✓"); setTimeout(() => setCopyMsg(""), 2000); })
    .catch(() => setCopyMsg("복사 실패"));


  // 생성 시각(createdAt) 고정 정렬 — 불러오기/편집으로 updatedAt 이 바뀌어도 위치가 안 움직인다. (없으면 updatedAt 폴백)
  const sortedItems = items.slice().sort((a, b) => ((b.createdAt || b.updatedAt || 0) - (a.createdAt || a.updatedAt || 0)));

  return (
    <div className="h-full flex" style={{ background: C.bg, color: C.text, fontFamily: "'Noto Sans KR', sans-serif" }}>
      {/* 좌측 — 생성한 데이터 목록 */}
      <aside className="w-[244px] shrink-0 flex flex-col" style={{ borderRight: `1px solid ${C.border}`, background: C.panel2 }}>
        <div className="flex items-center justify-between px-3 py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
          <span className="text-[12.5px] font-bold flex items-center gap-1.5" style={{ color: C.text }}>
            <History size={14} style={{ color: C.accent }} /> 생성한 데이터
            <span className="text-[11px] font-normal" style={{ color: C.muted }}>{items.length}</span>
          </span>
          <button onClick={newAnalysis} title="새 분석 시작"
            className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-colors"
            style={{ background: C.panel, border: `1px solid ${C.border}`, color: C.accent }}>
            <Plus size={12} /> 새로
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
          {sortedItems.length === 0 ? (
            <div className="text-[11px] px-2 py-8 text-center leading-relaxed" style={{ color: C.muted }}>
              아직 생성한 데이터가 없습니다.<br />요청서를 분석하면 여기에 쌓입니다.
            </div>
          ) : sortedItems.map((it) => {
            const active = it.id === currentId;
            return (
              <div key={it.id} onClick={() => loadItem(it)}
                className="group relative rounded-lg px-2.5 py-2 cursor-pointer transition-colors"
                style={{ background: active ? "rgba(14,185,179,0.12)" : C.panel, border: `1px solid ${active ? C.accent : C.border}` }}>
                <div className="text-[12px] font-bold truncate pr-5" style={{ color: active ? C.accent : C.text }}>{it.title || "오늘의 상품 스페셜"}</div>
                <div className="text-[10px] mt-0.5 truncate" style={{ color: C.muted }}>
                  {it.rev ? `${it.rev}차` : ""}{it.rev && it.stats ? " · " : ""}{it.stats ? `상품 ${it.stats.boxes} · 보너스 ${it.stats.milestones}` : ""}
                </div>
                <div className="text-[9.5px] mt-0.5" style={{ color: C.muted }}>{fmtTime(it.createdAt || it.updatedAt)}</div>
                <button onClick={(e) => deleteItem(it.id, e)} title="삭제"
                  className="absolute top-1.5 right-1.5 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:text-rose-400" style={{ color: C.muted }}>
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      </aside>

      {/* 우측 — 작업 영역 */}
      <div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar">
      <div className="max-w-[920px] mx-auto px-5 py-8">
        <div className="flex items-start justify-between gap-3 mb-6">
          <p className="text-[14px] leading-relaxed" style={{ color: C.muted }}>
            <b style={{ color: C.accent }}>오늘의 상품 스페셜</b> 수정요청서를 읽어 페이지 디자인 구조(상품 4칸 · 보너스 5단계 · 전체상품 팝업 · 개별 팝업 · 공지)에 맞춰 데이터를 추출하고,
            <b style={{ color: C.text }}> 기획서로 시각화</b>합니다. 결과 JSON은 오상스 플러그인 <b style={{ color: C.text }}>"데이터 채우기"</b>에 그대로 붙여넣을 수 있습니다.
          </p>
          {data && (
            <button onClick={newAnalysis} className="shrink-0 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors hover:text-rose-400"
              style={{ background: C.panel, border: `1px solid ${C.border}`, color: C.muted }}>새 분석</button>
          )}
        </div>

        {/* 입력 */}
        <div className="rounded-xl p-4 mb-5" style={{ background: C.panel, border: `1px solid ${C.border}` }} onPaste={(e) => handlePaste(e, addFiles)}>
          <label
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
            className="relative block w-full py-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors text-center"
            style={{ borderColor: isDragging ? C.accent : C.border, background: isDragging ? "rgba(14,185,179,0.08)" : C.panel2 }}
          >
            <Upload size={22} className="mx-auto mb-2" style={{ color: C.muted }} />
            <div className="text-[13px]" style={{ color: C.text }}>수정요청서를 드래그 · 클릭 · <b style={{ color: C.accent }}>붙여넣기(Ctrl+V)</b></div>
            <div className="text-[11px] mt-1" style={{ color: C.muted }}>PPTX · PDF · 이미지 — 캡처 이미지는 아래 칸 클릭 후 Ctrl+V 로 바로 붙여넣기</div>
            <input ref={fileRef} type="file" multiple
              accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx"
              className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          </label>

          {(files.length > 0 || pptxTexts.length > 0) && (
            <div className="mt-2.5 space-y-1.5">
              {pptxTexts.map((p, i) => (
                <div key={"p" + i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px]" style={{ background: C.panel2, border: `1px solid ${C.border}` }}>
                  <FileText size={13} style={{ color: C.accent }} className="shrink-0" />
                  <span className="flex-1 truncate" style={{ color: C.muted }}><b style={{ color: C.accent }}>PPTX</b> {p.name} · {p.text.split("\n").length}줄</span>
                  <button onClick={() => setPptxTexts(pptxTexts.filter((_, j) => j !== i))} className="shrink-0 hover:text-rose-400" style={{ color: C.muted }}><X size={13} /></button>
                </div>
              ))}
              {files.map((f, i) => (
                <div key={"f" + i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px]" style={{ background: C.panel2, border: `1px solid ${C.border}` }}>
                  {f.mimeType === "application/pdf" ? <FileText size={13} className="shrink-0" style={{ color: C.muted }} /> : <ImageIcon size={13} className="shrink-0" style={{ color: C.muted }} />}
                  <span className="flex-1 truncate" style={{ color: C.muted }}>{f.name}{f.source ? <span> ← {f.source}</span> : null}</span>
                  <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="shrink-0 hover:text-rose-400" style={{ color: C.muted }}><X size={13} /></button>
                </div>
              ))}
            </div>
          )}

          <textarea className={`${taCls} h-[100px] mt-3`} style={taStyle} value={pasted} onChange={(e) => { setPasted(e.target.value); persist({ pasted: e.target.value }); }}
            placeholder="요청서 본문을 텍스트로 붙여넣어도 됩니다." />
          <input type="text" className={`${taCls} mt-2`} style={taStyle} value={note} onChange={(e) => { setNote(e.target.value); persist({ note: e.target.value }); }}
            placeholder='추가 지시 (선택) — 예: "셋째 줄 보너스는 돋보기 없음"' />

          <div className="flex items-center gap-3 mt-3.5">
            <button onClick={analyze} disabled={st.state === "run"}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] font-bold text-white disabled:opacity-45 transition-colors"
              style={{ background: C.accent }}>
              {st.state === "run" ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} 요청서 분석 · 기획서 생성
            </button>
            {st.msg && (
              <span className="font-mono text-[12.5px]" style={{ color: st.state === "run" ? C.accent : st.state === "ok" ? "#34d399" : st.state === "err" ? "#fb7185" : C.muted }}>{st.msg}</span>
            )}
          </div>
        </div>

        {/* 결과 */}
        {data && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>결과</span>
              {rev > 0 && <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ background: "rgba(14,185,179,0.15)", color: C.accent }}>{rev}차 반영본</span>}
              <div className="ml-auto flex items-center gap-2">
                {tab === "brief" && (
                  <>
                    {/* 키비주얼 색 추출 — 그 달의 키비주얼을 올리면 기획서 테마색을 거기에 맞춤 */}
                    <input ref={kvRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => { onKvPick(e.target.files && e.target.files[0]); }} />
                    {kvTheme ? (
                      <div className="inline-flex items-center gap-1.5 rounded-md px-2 py-1" style={{ border: `1px solid ${C.border}`, background: C.panel }}>
                        <span className="inline-block w-3.5 h-3.5 rounded-sm" style={{ background: G.green }} title="추출 액센트" />
                        <span className="text-[11px] max-w-[120px] truncate" style={{ color: C.text }} title={kvName}>{kvName || "키비주얼 테마"}</span>
                        <button onClick={() => kvRef.current && kvRef.current.click()} className="text-[11px] underline" style={{ color: C.accent }}>교체</button>
                        <button onClick={clearKv} className="text-[12px] leading-none px-0.5" style={{ color: C.muted }} title="기본 그린 테마로">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => kvRef.current && kvRef.current.click()} className="rounded-md px-2.5 py-1.5 text-[12px] font-medium"
                        style={{ border: `1px solid ${C.border}`, background: C.panel, color: C.muted }} title="그 달의 키비주얼 이미지에서 색을 추출해 기획서에 적용">🎨 키비주얼 색 추출</button>
                    )}
                    <div className="inline-flex rounded-md overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
                      {[["pc", "PC"], ["mobile", "모바일"]].map(([v, label]) => (
                        <button key={v} onClick={() => setView(v)} className="px-3 py-1.5 text-[12px] font-medium transition-colors"
                          style={view === v ? { background: "#6C5CE7", color: "#fff" } : { background: C.panel, color: C.muted }}>{label}</button>
                      ))}
                    </div>
                  </>
                )}
                <button onClick={() => setShowEdit((v) => !v)} className="rounded-md px-2.5 py-1.5 text-[12px] font-medium"
                  style={showEdit ? { background: "rgba(251,191,36,0.16)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.4)" } : { background: C.panel, color: C.muted, border: `1px solid ${C.border}` }}
                  title="추출된 팝업 텍스트의 오타를 직접 고치고, 전체 일괄 교체 규칙을 추가">✏️ 텍스트 수정</button>
                <div className="inline-flex rounded-md overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
                  {[["brief", "기획서"], ["json", "플러그인 JSON"]].map(([m, label]) => (
                    <button key={m} onClick={() => setTab(m)} className="px-3 py-1.5 text-[12px] font-medium transition-colors"
                      style={tab === m ? { background: C.accent, color: "#fff" } : { background: C.panel, color: C.muted }}>{label}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* ✏️ 텍스트 검수·수정 — 보너스 팝업 텍스트 오타 교정 + 전체 일괄 교체 */}
            {showEdit && (
              <div className="rounded-xl p-4 mb-4 space-y-5" style={{ background: C.panel, border: "1px solid rgba(251,191,36,0.3)" }}>
                {/* 대표 아이콘 (상품별) — 빨강 자동감지가 놓친 경우 직접 입력. 여러 종은 ' + '로 구분. */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[12.5px] font-bold" style={{ color: C.text }}>대표 아이콘 (상품별)</span>
                    <span className="text-[11px] font-mono px-1.5 py-0.5 rounded" style={{ color: G.gold, background: "rgba(236,220,160,0.1)" }}>{(data.boxes || []).length}</span>
                  </div>
                  <p className="text-[10.5px] mb-2.5" style={{ color: C.muted }}>각 상품 카드에 삽입될 대표 아이콘. 빨강 자동감지가 일부를 놓쳤으면 여기서 직접 고치세요. <span className="font-mono" style={{ color: G.gold }}>여러 종은 +로 구분</span> (예: <span className="font-mono">진무강 200개 + 홍문수 결정 400개</span>) — 플러그인이 분리해 한 장으로 합성합니다.</p>
                  <div className="space-y-1.5">
                    {(data.boxes || []).map((b, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-[11px] rounded px-1.5 py-1.5 shrink-0 truncate" style={{ background: C.panel2, border: `1px solid ${C.border}`, color: C.muted, width: 104 }} title={(b && b.top ? b.top + " " : "") + ((b && b.name) || "")}>{(b && b.name) || `상품 ${i + 1}`}</span>
                        <input value={(data.slotIcons || [])[i] || ""} onChange={(e) => setSlotIcon(i, e.target.value)}
                          placeholder="대표 아이콘 (여러 종은 +)"
                          className="flex-1 rounded px-2 py-1.5 text-[12px] leading-snug outline-none" style={{ background: C.panel2, border: `1px solid ${C.border}`, color: C.text }} />
                      </div>
                    ))}
                  </div>
                </div>
                {/* 개별 팝업 텍스트 (돋보기 상세 팝업) */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[12.5px] font-bold" style={{ color: C.text }}>개별 팝업 텍스트</span>
                    <span className="text-[11px] font-mono px-1.5 py-0.5 rounded" style={{ color: G.gold, background: "rgba(236,220,160,0.1)" }}>{(data.popupTexts || []).length}</span>
                  </div>
                  <p className="text-[10.5px] mb-2.5" style={{ color: C.muted }}>보너스 상세 팝업(돋보기)의 제목·아이템명. 오타를 직접 고치세요 — 플러그인이 <span className="font-mono">ptxt/{"{키}"}</span> 슬롯에 그대로 자동 입력합니다.</p>
                  <div className="space-y-1.5">
                    {(data.popupTexts || []).map((t, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <select value={t.key} onChange={(e) => setPKey(i, e.target.value)} className="text-[11px] rounded px-1.5 py-1.5 shrink-0 outline-none" style={{ background: C.panel2, border: `1px solid ${C.border}`, color: G.gold, width: 104 }}>
                          {POPUP_SLOTS.map((k) => <option key={k} value={k}>{k}</option>)}
                          {!POPUP_SLOTS.includes(t.key) && <option value={t.key}>{t.key}</option>}
                        </select>
                        <textarea value={t.value} onChange={(e) => setPText(i, e.target.value)} rows={1}
                          className="flex-1 rounded px-2 py-1.5 text-[12px] leading-snug resize-y outline-none" style={{ background: C.panel2, border: `1px solid ${C.border}`, color: C.text }} />
                        <button onClick={() => delPText(i)} className="text-[13px] px-1.5 py-1.5 leading-none shrink-0" style={{ color: C.muted }} title="이 항목 삭제">✕</button>
                      </div>
                    ))}
                    <button onClick={addPText} className="text-[11.5px] font-medium px-2 py-1 rounded" style={{ color: C.accent, border: `1px dashed ${C.border}` }}>+ 팝업 텍스트 추가</button>
                  </div>
                </div>
                {/* 오타·문구 일괄 교체 */}
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[12.5px] font-bold" style={{ color: C.text }}>오타 · 문구 일괄 교체</span>
                    <span className="text-[11px] font-mono px-1.5 py-0.5 rounded" style={{ color: G.gold, background: "rgba(236,220,160,0.1)" }}>{(data.replacements || []).length}</span>
                  </div>
                  <p className="text-[10.5px] mb-2.5" style={{ color: C.muted }}>입력한 <b>이전 → 이후</b>가 기획서·플러그인의 <b>모든 텍스트</b>에서 부분 일치로 일괄 교체됩니다. (반복되는 오타·공지·기간 문구 정정용)</p>
                  <div className="space-y-1.5">
                    {(data.replacements || []).map((r, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input value={r.before} onChange={(e) => setRep(i, "before", e.target.value)} placeholder="이전 (오타)"
                          className="flex-1 rounded px-2 py-1.5 text-[12px] outline-none" style={{ background: C.panel2, border: `1px solid ${C.border}`, color: "#f0a5a5" }} />
                        <span className="text-[12px] shrink-0" style={{ color: C.muted }}>→</span>
                        <input value={r.after} onChange={(e) => setRep(i, "after", e.target.value)} placeholder="이후 (정정)"
                          className="flex-1 rounded px-2 py-1.5 text-[12px] outline-none" style={{ background: C.panel2, border: `1px solid ${C.border}`, color: "#9fe6a5" }} />
                        <button onClick={() => delRep(i)} className="text-[13px] px-1.5 py-1.5 leading-none shrink-0" style={{ color: C.muted }} title="이 규칙 삭제">✕</button>
                      </div>
                    ))}
                    <button onClick={addRep} className="text-[11.5px] font-medium px-2 py-1 rounded" style={{ color: C.accent, border: `1px dashed ${C.border}` }}>+ 교체 규칙 추가</button>
                  </div>
                </div>
              </div>
            )}

            {tab === "brief" ? (
              <>
                <p className="text-[10.5px] mb-2" style={{ color: C.muted }}>※ 하단 <b>"필독! 주의사항"</b>은 요청서에 없는 기본 양식이라 자동 삽입됩니다 — 월·날짜는 확인 후 수정하세요. (이 문구는 기획서에 포함되지 않습니다)</p>
                <BriefSheet data={data} view={view} kvTheme={kvTheme} />
              </>
            ) : (
              <div className="rounded-xl p-4" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[12px]" style={{ color: C.muted }}>오상스 플러그인 <b style={{ color: C.text }}>1 · 데이터 채우기</b> 칸에 그대로 붙여넣으세요.</span>
                  <button onClick={copyJson} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors"
                    style={{ background: C.panel2, border: `1px solid ${C.border}`, color: C.text }}>
                    {copyMsg ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />} JSON 복사
                  </button>
                  {copyMsg && <span className="font-mono text-[12px] text-emerald-400">{copyMsg}</span>}
                </div>
                <pre className="rounded-lg p-3 text-[12px] leading-relaxed overflow-auto max-h-[560px] custom-scrollbar font-mono whitespace-pre-wrap break-words"
                  style={{ background: "#07070b", color: "#cdd3e0", border: `1px solid ${C.border}` }}>{pluginJsonText}</pre>
              </div>
            )}

            {/* 직전 차수 변경내역 */}
            {lastChanges.length > 0 && (
              <div className="mt-4 rounded-xl p-3.5" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
                <div className="flex items-center gap-1.5 text-[12.5px] font-bold mb-2" style={{ color: C.accent }}><History size={14} /> {rev}차 반영 변경사항 · {lastChanges.length}건</div>
                <ul className="text-[12.5px] pl-4 list-disc space-y-0.5" style={{ color: C.text }}>
                  {lastChanges.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}

            {/* 2차(이후) 수정요청서 반영 */}
            <div className="mt-4 rounded-xl p-4" style={{ background: C.panel, border: `1px solid ${C.border}` }} onPaste={(e) => handlePaste(e, addSecFiles)}>
              <div className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: C.text }}><Plus size={15} style={{ color: C.accent }} /> {rev + 1}차 수정요청서 반영</div>
              <p className="text-[12px] mt-1 mb-3" style={{ color: C.muted }}>1차에서 <b style={{ color: C.text }}>변경·추가된 부분만</b> 담긴 수정요청서를 넣으면 기존 데이터에 그 변경만 병합합니다. (반복 가능 — 3차·4차…)</p>
              <label
                onDragOver={(e) => { e.preventDefault(); setSecDrag(true); }}
                onDragLeave={(e) => { e.preventDefault(); setSecDrag(false); }}
                onDrop={(e) => { e.preventDefault(); setSecDrag(false); addSecFiles(e.dataTransfer.files); }}
                className="relative block w-full py-5 border-2 border-dashed rounded-xl cursor-pointer transition-colors text-center"
                style={{ borderColor: secDrag ? C.accent : C.border, background: secDrag ? "rgba(14,185,179,0.08)" : C.panel2 }}
              >
                <Upload size={20} className="mx-auto mb-1.5" style={{ color: C.muted }} />
                <div className="text-[12.5px]" style={{ color: C.text }}>2차 수정요청서 드래그 · 클릭 · <b style={{ color: C.accent }}>붙여넣기(Ctrl+V)</b></div>
                <input type="file" multiple
                  accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx"
                  className="hidden" onChange={(e) => { addSecFiles(e.target.files); e.target.value = ""; }} />
              </label>
              {(secFiles.length > 0 || secPptx.length > 0) && (
                <div className="mt-2 space-y-1.5">
                  {secPptx.map((p, i) => (
                    <div key={"sp" + i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px]" style={{ background: C.panel2, border: `1px solid ${C.border}` }}>
                      <FileText size={13} style={{ color: C.accent }} className="shrink-0" />
                      <span className="flex-1 truncate" style={{ color: C.muted }}><b style={{ color: C.accent }}>PPTX</b> {p.name}</span>
                      <button onClick={() => setSecPptx(secPptx.filter((_, j) => j !== i))} className="shrink-0 hover:text-rose-400" style={{ color: C.muted }}><X size={13} /></button>
                    </div>
                  ))}
                  {secFiles.map((f, i) => (
                    <div key={"sf" + i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px]" style={{ background: C.panel2, border: `1px solid ${C.border}` }}>
                      {f.mimeType === "application/pdf" ? <FileText size={13} className="shrink-0" style={{ color: C.muted }} /> : <ImageIcon size={13} className="shrink-0" style={{ color: C.muted }} />}
                      <span className="flex-1 truncate" style={{ color: C.muted }}>{f.name}{f.source ? <span> ← {f.source}</span> : null}</span>
                      <button onClick={() => setSecFiles(secFiles.filter((_, j) => j !== i))} className="shrink-0 hover:text-rose-400" style={{ color: C.muted }}><X size={13} /></button>
                    </div>
                  ))}
                </div>
              )}
              <textarea className={`${taCls} h-[80px] mt-2.5`} style={taStyle} value={secPasted} onChange={(e) => setSecPasted(e.target.value)}
                placeholder="2차 변경 내용을 텍스트로 붙여넣어도 됩니다." />
              <input type="text" className={`${taCls} mt-2`} style={taStyle} value={secNote} onChange={(e) => setSecNote(e.target.value)}
                placeholder='추가 지시 (선택) — 예: "표의 가격만 갱신, 보너스는 유지"' />
              <button onClick={applySecond} disabled={st.state === "run"}
                className="mt-3 flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] font-bold text-white disabled:opacity-45 transition-colors"
                style={{ background: C.accent }}>
                {st.state === "run" ? <Loader2 size={14} className="animate-spin" /> : <History size={14} />} {rev + 1}차 반영 (병합)
              </button>
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}

// ─── 기획서 미리보기 — 실제 "오늘의 상품 스페셜" 페이지 구조를 그대로 재현 ───
// 기본 테마 = 6월 그린(샘플). 키비주얼 업로드 시 makeGTFromSeed()가 만든 테마로 교체.
const DEFAULT_GT = {
  gold: "#f2da7e", goldDim: "#cdb463", green: "#a8cf5f",
  card: "linear-gradient(180deg,#34301d 0%,#252012 100%)", cardBd: "#6c5d2b",
  bonus: "linear-gradient(180deg,#3a2f1c 0%,#261e11 100%)", bonusBd: "#7a6228",
  tip: "#15230e", tipBd: "#3d4e27", panelBd: "#2b3520",
  parch: "linear-gradient(180deg,#efe4c4 0%,#e1d2a4 100%)", parchBd: "#b59a5e",
  hairline: "rgba(255,255,255,0.06)",
  sheetBg: "linear-gradient(180deg,#1c2616 0%,#11170d 42%,#0b0f08 100%)",
  greenBtn: "linear-gradient(180deg,#b6d76d 0%,#6e9a37 100%)",
  greenGlow: "0 1px 3px rgba(0,0,0,0.4)",
};
// 활성 테마 — BriefSheet가 렌더 시작 시 applyGT()로 교체. (단일 미리보기 컴포넌트라 안전)
let G = DEFAULT_GT;
let sheetBg = DEFAULT_GT.sheetBg, greenBtn = DEFAULT_GT.greenBtn, greenGlow = DEFAULT_GT.greenGlow;
function applyGT(t) { G = t || DEFAULT_GT; sheetBg = G.sheetBg; greenBtn = G.greenBtn; greenGlow = G.greenGlow; }

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); if (mx === r) h = (g - b) / d + (g < b ? 6 : 0); else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h /= 6; }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}
// 배경 HSL + 액센트 HSL → 기획서 테마(어두운 배경은 이미지 색조, 헤딩·버튼은 액센트).
function makeGTFromSeed(bgHsl, accHsl) {
  const bh = bgHsl[0], bs = Math.min(bgHsl[1], 45);
  const dark = (l) => `hsl(${bh}, ${bs}%, ${l}%)`;
  const ch = accHsl[0], cs = Math.min(Math.max(accHsl[1], 45), 90);
  const acc = (l, s = cs) => `hsl(${ch}, ${s}%, ${l}%)`;
  return {
    gold: acc(72, Math.min(cs + 5, 92)), goldDim: acc(60), green: acc(58),
    card: `linear-gradient(180deg, ${dark(14)} 0%, ${dark(9)} 100%)`, cardBd: dark(28),
    bonus: `linear-gradient(180deg, ${dark(15)} 0%, ${dark(9)} 100%)`, bonusBd: dark(30),
    tip: dark(11), tipBd: dark(26), panelBd: dark(20),
    parch: "linear-gradient(180deg,#efe4c4 0%,#e1d2a4 100%)", parchBd: "#b59a5e",
    hairline: "rgba(255,255,255,0.06)",
    sheetBg: `linear-gradient(180deg, ${dark(13)} 0%, ${dark(7)} 42%, ${dark(4)} 100%)`,
    greenBtn: `linear-gradient(180deg, ${acc(60)} 0%, ${acc(40)} 100%)`,
    greenGlow: "0 1px 3px rgba(0,0,0,0.4)",
  };
}
// 키비주얼 이미지 → 대표 색(배경 평균 + 가장 선명한 액센트) → 기획서 테마.
function extractKvTheme(file) {
  return new Promise((resolve) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const W = 64, H = Math.max(1, Math.round(64 * (img.height || 1) / (img.width || 1)));
          const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
          const ctx = cv.getContext("2d"); ctx.drawImage(img, 0, 0, W, H);
          const { data } = ctx.getImageData(0, 0, W, H);
          let rs = 0, gs = 0, bs = 0, n = 0, best = null, bestScore = -1;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
            if (a < 128) continue;
            rs += r; gs += g; bs += b; n++;
            const hsl = rgbToHsl(r, g, b);
            const score = hsl[1] * (hsl[2] > 20 && hsl[2] < 80 ? 1 : 0.3);
            if (score > bestScore) { bestScore = score; best = hsl; }
          }
          if (!n) { resolve(null); return; }
          resolve(makeGTFromSeed(rgbToHsl(rs / n, gs / n, bs / n), best || rgbToHsl(rs / n, gs / n, bs / n)));
        } catch (e) { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = String(fr.result);
    };
    fr.onerror = () => resolve(null);
    fr.readAsDataURL(file);
  });
}

function GreenBtn({ children, full, lg }) {
  return (
    <span className={`inline-block ${full ? "w-full" : ""} ${lg ? "px-7 py-2.5 text-[14px]" : "px-5 py-1.5 text-[12px]"} rounded-md font-bold text-center`}
      style={{ background: greenBtn, color: "#1f2f0e", boxShadow: `inset 0 1px 0 rgba(255,255,255,0.35), ${greenGlow}` }}>{children}</span>
  );
}
// 상품 카드 (보물상자 + 돋보기 + 상품명 + 대표 아이콘). 돋보기 유무·대표 아이콘을 항상 함께 표시.
function ProductCard({ b, slotIcon, hasRollover }) {
  // 윗줄(카테고리)/아랫줄(상품명) 분리 — top이 비고 name에 합쳐졌으면 알려진 접두어로 나눔
  let top = b.top || "", name = b.name || "";
  if (!top && name) {
    const m = name.match(/^(오늘의\s*선물상자|화려한\s*결정|영롱한\s+\S+)\s+(.+)$/);
    if (m) { top = m[1]; name = m[2]; }
  }
  // top·name 접두어 중복 제거 — name이 top(공백 무시)으로 시작하면 그 부분을 떼어 중복 표시 방지.
  if (top && name) {
    const pat = top.trim().split(/\s+/).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s*");
    const stripped = name.replace(new RegExp("^" + pat + "\\s*"), "").trim();
    if (stripped) name = stripped;   // 남는 이름이 있으면 접두어만 제거
    else top = "";                   // name이 top과 동일하면 타이틀만 표시
  }
  // 대표 아이콘 — 여러 종이면 ' + '로 묶여 오므로 쪼개서 각각 칩으로 표시.
  const icons = String(slotIcon || "").split(/\s*\+\s*/).map((s) => s.trim()).filter(Boolean);
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: G.card, border: `1px solid ${G.cardBd}` }}>
      <div className="pt-4 pb-2 flex justify-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,0,0,0.32)", border: `1px solid ${G.cardBd}` }}>
            <ImageIcon size={26} style={{ color: "#c7cdb6" }} />
          </div>
          {hasRollover && (
            <span className="absolute -right-1.5 -bottom-1.5 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(180deg,#84bd44,#5c8a2c)", boxShadow: greenGlow }} title="상세보기(롤오버) 있음">
              <Search size={12} className="text-white" />
            </span>
          )}
        </div>
      </div>
      <div className="px-2 pb-2.5 text-center">
        {top && <div className="text-[11px] leading-snug" style={{ color: "#b3bb98", wordBreak: "keep-all" }}>{top}</div>}
        <div className="text-[15px] font-black leading-snug mt-0.5" style={{ color: G.gold, textShadow: "0 1px 4px rgba(0,0,0,0.5)", wordBreak: "keep-all" }}>{name}</div>
        {/* 표시: 대표 아이콘 — 여러 종이면(빨강 여럿) ' + '로 쪼개 칩 N개. 모두 합성되어 들어간다. */}
        <div className="mt-2 flex flex-col items-center gap-1">
          {icons.length ? icons.map((ic, k) => (
            <div key={k} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded max-w-full"
              style={{ background: "rgba(236,220,160,0.12)", border: `1px solid ${G.cardBd}` }} title="대표 아이콘으로 삽입되는 아이템">
              <span className="text-[8px] font-bold px-1 rounded shrink-0" style={{ background: G.gold, color: "#2a230f" }}>아이콘</span>
              <span className="text-[9.5px] truncate" style={{ color: "#d8cfa6" }}>{ic}</span>
            </div>
          )) : (
            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded max-w-full"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)" }} title="대표 아이콘으로 삽입되는 아이템">
              <span className="text-[8px] font-bold px-1 rounded shrink-0" style={{ background: "#6b6b55", color: "#2a230f" }}>아이콘</span>
              <span className="text-[9.5px] truncate" style={{ color: "#8a8a72" }}>미지정</span>
            </div>
          )}
          <div className="inline-flex items-center gap-1 text-[9px]" style={{ color: hasRollover ? "#a8cf5f" : "#6f7a5a" }} title="마우스 오버 시 상세 구성(롤오버) 노출 여부">
            <Search size={9} /> {hasRollover ? "돋보기(상세) 있음" : "돋보기 없음"}
          </div>
        </div>
      </div>
    </div>
  );
}
// 상품 상세 구성 — PC=롤오버 말풍선 / 모바일=선물상자 팝업 카드. 대표 아이템(slotIcon)엔 "아이콘" 배지.
function GiftDetail({ name, ro, slotIcon, view }) {
  const items = (ro && ro.items) || [];
  const norm = (s) => String(s || "").replace(/\s+/g, "");
  const Item = ({ it, w }) => {
    const isIcon = slotIcon && norm(it.name) === norm(slotIcon);
    return (
      <div className="flex flex-col items-center text-center shrink-0" style={{ width: w }}>
        <div className="rounded-lg" style={{ width: Math.round(w * 0.6), height: Math.round(w * 0.6), background: "rgba(168,207,95,0.14)", border: `1px solid ${G.cardBd}` }} />
        <div className="text-[10px] mt-1 leading-tight" style={{ color: isIcon ? G.gold : "#cdd6bb" }}>{it.name}<br /><span style={{ color: G.gold }}>{it.count}</span></div>
        {isIcon && <span className="text-[7px] mt-0.5 px-1 rounded" style={{ background: G.gold, color: "#2a230f" }}>아이콘</span>}
      </div>
    );
  };
  if (view === "pc") {
    // PC: 마우스 오버 롤오버(초록 말풍선 + 꼬리)
    return (
      <div className="flex items-center gap-3">
        <div className="text-[12px] font-bold shrink-0 text-right" style={{ width: 90, color: "#cdd6bb" }}>{name || "(상품)"}</div>
        <div className="relative inline-block rounded-lg px-3.5 py-3" style={{ background: G.tip, border: `1px solid ${G.tipBd}` }}>
          {items.length ? <div className="flex gap-3">{items.map((it, k) => <Item key={k} it={it} w={62} />)}</div> : <span className="text-[11px]" style={{ color: "#6f7a5a" }}>구성 없음</span>}
          <span className="absolute -left-1.5 top-1/2 w-3 h-3 -translate-y-1/2 rotate-45" style={{ background: G.tip, borderLeft: `1px solid ${G.tipBd}`, borderBottom: `1px solid ${G.tipBd}` }} />
        </div>
      </div>
    );
  }
  // 모바일: 선물상자 팝업 카드 (헤더 상품명 + 아이템 그리드)
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: G.card, border: `1px solid ${G.cardBd}` }}>
      <div className="px-3 py-2 text-center" style={{ borderBottom: `1px solid ${G.panelBd}` }}>
        <div className="text-[13px] font-bold" style={{ color: G.gold }}>{name || "(상품)"}</div>
      </div>
      <div className="px-3 py-3 flex justify-center gap-2.5 flex-wrap">
        {items.length ? items.map((it, k) => <Item key={k} it={it} w={72} />) : <span className="text-[11px]" style={{ color: "#6f7a5a" }}>구성 없음</span>}
      </div>
    </div>
  );
}
// 보너스 카드 (젬 + "10,000 누적 시" 헤더 + 점선 아이콘 + 보상 받기)
function BonusCard({ m }) {
  return (
    <div className="rounded-xl overflow-hidden text-center" style={{ background: G.bonus, border: `1px solid ${G.bonusBd}` }}>
      <div className="pt-1.5 flex justify-center"><Gem size={15} style={{ color: "#7fd3ff" }} /></div>
      <div className="mt-1 py-0.5 text-[11px] font-bold" style={{ color: G.gold, background: "rgba(0,0,0,0.28)", borderTop: `1px solid ${G.hairline}`, borderBottom: `1px solid ${G.hairline}` }}>
        {m.threshold ? `${m.threshold} 누적 시` : "누적 보상"}
      </div>
      <div className="px-2 pt-2.5 flex flex-col items-center">
        <div className="relative">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,0,0,0.28)", border: "1px dashed rgba(168,207,95,0.5)" }}>
            <ImageIcon size={18} style={{ color: "#c7cdb6" }} />
          </div>
          {m.magnify && (
            <span className="absolute -right-1 -bottom-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(180deg,#84bd44,#5c8a2c)" }} title="상세 팝업 연결(돋보기)">
              <Search size={10} className="text-white" />
            </span>
          )}
        </div>
        <div className="text-[11.5px] font-medium leading-tight mt-1.5 px-1" style={{ color: "#eef2e5" }}>{m.name}</div>
      </div>
      <div className="px-2 py-2"><GreenBtn full>보상 받기</GreenBtn></div>
    </div>
  );
}
function SubHeading({ children }) {
  return <div className="text-center text-[15px] font-extrabold mb-4" style={{ color: G.gold, textShadow: "0 1px 8px rgba(0,0,0,0.5)" }}>✦ {children} ✦</div>;
}

// 타이틀을 실제 페이지처럼 3줄로: "{월}" / "오늘의 상품" / "스페셜".
// "오늘의 상품 스페셜" 고정 문구를 인식해 앞부분(월)만 1줄로 분리, 미인식 시 첫/중간/끝 3줄 폴백.
function splitTitle(title) {
  const t = String(title || "오늘의 상품 스페셜").trim();
  const m = t.match(/^(.*?)\s*오늘의\s*상품\s*스페셜\s*$/);
  if (m) { const pre = m[1].trim(); return pre ? [pre, "오늘의 상품", "스페셜"] : ["오늘의 상품", "스페셜"]; }
  const w = t.split(/\s+/);
  if (w.length >= 3) return [w[0], w.slice(1, -1).join(" "), w[w.length - 1]];
  return w;
}

function BriefSheet({ data, view, kvTheme }) {
  applyGT(kvTheme); // 키비주얼 테마(있으면)로 색 교체 — 렌더 시작 시점(자식 렌더 전)
  const isM = view === "mobile";
  const prodCols = isM ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4";
  const bonusCols = isM ? "grid-cols-2" : "grid-cols-3 sm:grid-cols-5";
  const popupCols = isM ? "" : "sm:grid-cols-2";
  const meta = data.meta || {};
  const boxes = data.boxes || [];
  const slotIcons = data.slotIcons || [];
  const rollovers = data.rollovers || [];
  const milestones = data.milestones || [];
  const popupDays = data.popupDays || [];
  const popupTexts = data.popupTexts || [];
  const replacements = data.replacements || [];
  const uncertain = data.uncertain || [];
  const rollOf = (i) => rollovers.find((r) => String(r.card) === String(i + 1));
  const month = meta.month || "";
  // 타이틀 포맷 고정: "{월} 오늘의 상품 스페셜" (월만 변동). 추출된 제목 대신 월로 구성.
  const heroTitle = month ? `${month} 오늘의 상품 스페셜` : (meta.title || "오늘의 상품 스페셜");
  const titleLines = splitTitle(heroTitle);

  const mp = month ? month + " " : "";
  const rewardEnd = meta.rewardPeriod ? String(meta.rewardPeriod).split("~").pop().trim() : "정기점검 전";
  const cautions = [
    "본 이벤트는 Blade & Soul 이벤트 규약을 따릅니다.",
    "제재 계정은 이벤트 참여가 불가능합니다.",
    "향후 동일 또는 유사 프로모션이 진행될 수 있습니다.",
    "신석 사용 현황은 전일(00시 ~ 23시 59분) 사용한 내역을 당일 10시 이후에 확인할 수 있습니다.",
    `${mp}오늘의 상품 스페셜 구매에 사용한 신석 사용량만 누적되며, 그 외 상품의 신석 사용량은 누적되지 않습니다.`,
    `${mp}오늘의 상품 스페셜 보너스 선물의 각 아이템은 계정 당 1회만 교환할 수 있습니다.`,
    `${mp}오늘의 상품 스페셜 보너스 선물은 ${rewardEnd} 까지 수령할 수 있습니다.`,
    `${mp}오늘의 상품 스페셜 보너스 선물은 쿠폰함으로 지급되며, 지급일로부터 정해진 기간까지 사용할 수 있습니다. (계정당 1회)`,
  ];
  const hasGift = boxes.some((_, i) => (rollOf(i)?.items || []).length);
  const hasPopupPage = popupDays.length > 0 || popupTexts.length > 0 || hasGift;

  return (
    <div className="space-y-5" style={{ fontFamily: "'Noto Sans KR', sans-serif", maxWidth: isM ? 400 : "100%", margin: isM ? "0 auto" : undefined }}>
      {/* ════════ 본문 페이지 ════════ */}
      <div>
      <PageLabel title="본문 페이지" sub={isM ? "모바일 화면" : "PC 화면"} />
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${G.panelBd}`, background: sheetBg }}>
      {/* HERO */}
      <div className="px-6 pt-10 pb-8 text-center">
        <div className="text-[28px] font-black leading-[1.15] tracking-tight" style={{ color: "#f3f6ee", textShadow: "0 2px 14px rgba(0,0,0,0.5)" }}>
          {titleLines.map((w, i) => <div key={i}>{w}</div>)}
        </div>
        <div className="mt-4 inline-flex flex-col gap-0.5 text-[12.5px]" style={{ color: "#cfd8c0" }}>
          {meta.salePeriod && <span>상품 판매 기간 : <b style={{ color: "#eaf0df" }}>{meta.salePeriod}</b></span>}
          {meta.rewardPeriod && <span>보상 수령 기간 : <b style={{ color: "#eaf0df" }}>{meta.rewardPeriod}</b></span>}
        </div>
      </div>

      {/* 스페셜 상품 */}
      <PageSection title={`${month}의 스페셜 상품`.trim()} sub="매일 변경되는 스페셜 상품들을 확인해 보세요!">
        <div className={`grid ${prodCols} gap-3 max-w-[700px] mx-auto`}>
          {boxes.map((b, i) => <ProductCard key={i} b={b} slotIcon={slotIcons[i]} hasRollover={(rollOf(i)?.items || []).length > 0} />)}
        </div>
        <div className="text-center mt-6"><GreenBtn lg>전체 상품 자세히 보기</GreenBtn></div>
      </PageSection>

      {/* (상품 상세구성은 팝업 페이지의 "오늘의 선물상자"로 이동 — PC 롤오버 / 모바일 팝업) */}

      {/* 오늘의 상품 / 신석 사용 현황 */}
      <PageSection big title="오늘의 상품" sub={`${month ? month + " " : ""}오늘의 상품 스페셜 구매에 사용한 신석만큼 보너스 보상으로 돌려드려요!`}>
        <SubHeading>신석 사용 현황</SubHeading>
        <div className="max-w-[440px] mx-auto rounded-lg px-6 py-7 text-center" style={{ background: G.parch, border: `2px solid ${G.parchBd}`, boxShadow: "0 2px 10px rgba(0,0,0,0.45)" }}>
          {isM ? (
            <div className="text-[13px] leading-relaxed" style={{ color: "#5a4a28" }}>신석 사용 현황 확인 및 보상 받기는<br /><b>PC웹</b>에서만 가능합니다.</div>
          ) : (
            <>
              <div className="text-[13px] leading-relaxed" style={{ color: "#5a4a28" }}>로그인 후 신석 사용 현황을<br />확인해 보세요!</div>
              <div className="mt-3"><GreenBtn>로그인</GreenBtn></div>
            </>
          )}
        </div>
        <div className="max-w-[620px] mx-auto mt-4 space-y-0.5 text-[11px] leading-relaxed" style={{ color: "#9aa384" }}>
          <div>※ 신석 사용 현황은 전일 00시 ~ 23시 59분 까지 사용한 내역을 당일 10시 이후에 확인할 수 있습니다.</div>
          <div>※ {month ? month + " " : ""}오늘의 상품 스페셜 상품 구매에 사용한 신석 사용량만 누적되며, 그 외 상품의 신석 사용량은 제외됩니다.</div>
        </div>
      </PageSection>

      {/* 보너스 선물 */}
      <PageSection title="획득 가능한 보너스 선물" decor>
        <div className={`grid ${bonusCols} gap-3 max-w-[780px] mx-auto`}>
          {milestones.map((m, i) => <BonusCard key={i} m={m} />)}
        </div>
        <div className="text-center text-[11px] mt-5" style={{ color: "#9aa384" }}>※ 보너스 보상은 아이템 별 계정당 1회만 획득 가능합니다.</div>
      </PageSection>

      {/* 필독! 주의사항 (요청서에 없는 기본 양식) */}
      <div className="px-6 pb-8 pt-1">
        <div className="rounded-lg p-4" style={{ background: "rgba(0,0,0,0.28)", border: `1px solid ${G.panelBd}` }}>
          <div className="flex items-center gap-1.5 text-[13px] font-bold mb-2" style={{ color: G.goldDim }}>📢 필독! 주의사항</div>
          <ol className="text-[11px] leading-relaxed space-y-0.5 pl-5 list-decimal" style={{ color: "#9aa384" }}>
            {cautions.map((c, i) => <li key={i}>{c}</li>)}
          </ol>
        </div>
      </div>
      </div>
      </div>

      {/* ════════ 팝업 페이지 ════════ */}
      {hasPopupPage && (
      <div>
      <PageLabel title="팝업 페이지" sub={isM ? "모바일 화면 — 팝업" : "PC 화면 — 롤오버 / 팝업"} />
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${G.panelBd}`, background: sheetBg }}>
      {hasGift && (
        <PageSection title="오늘의 선물상자 — 상품 상세 구성" sub={isM ? "모바일: 팝업으로 표시 · 대표 아이템엔 아이콘" : "PC: 마우스 오버 롤오버 · 대표 아이템엔 아이콘"}>
          <div className="flex flex-col gap-3 max-w-[720px] mx-auto">
            {boxes.map((b, i) => (rollOf(i)?.items || []).length ? <GiftDetail key={i} name={b.name} ro={rollOf(i)} slotIcon={slotIcons[i]} view={view} /> : null)}
          </div>
        </PageSection>
      )}
      {popupDays.length > 0 && (
        <PageSection title="전체 상품 자세히 보기" sub={`팝업 · ${popupDays.length}일`}>
          <div className={`grid ${popupCols} gap-3 max-w-[760px] mx-auto`}>
            {popupDays.map((day, i) => (
              <div key={i} className="rounded-lg overflow-hidden" style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${G.panelBd}` }}>
                <div className="px-3 py-1.5 flex items-center justify-between" style={{ background: "rgba(159,206,94,0.08)", borderBottom: `1px solid ${G.panelBd}` }}>
                  <span className="text-[12.5px] font-bold" style={{ color: G.gold }}>{day.date}</span>
                  <span className="text-[10px]" style={{ color: "#8a9670" }}>가격</span>
                </div>
                <div>
                  {(day.rows || []).map((row, k) => {
                    const free = !row.price || row.price === "0" || row.price === "-";
                    return (
                      <div key={k} className="flex items-center justify-between gap-2 px-3 py-1 text-[11px]" style={{ borderTop: k ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                        <span className="truncate" style={{ color: "#c3cdb2" }}>{row.name}</span>
                        <span className="font-mono shrink-0" style={{ color: free ? "#5c6749" : "#e6ecd9" }}>{free ? "무료" : row.price}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </PageSection>
      )}
      {popupTexts.length > 0 && (
        <PageSection title="개별 팝업" sub="타이틀 · 아이템명 (무기 · 천체조각 · 흑장미 · 의상 등)">
          <div className={`grid ${popupCols} gap-2 max-w-[700px] mx-auto`}>
            {popupTexts.map((t, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(0,0,0,0.28)", border: `1px solid ${G.panelBd}` }}>
                <span className="text-[10px] font-mono rounded px-1.5 py-0.5 shrink-0" style={{ color: G.gold, background: "rgba(236,220,160,0.1)" }}>{t.key}</span>
                <span className="text-[12px] whitespace-pre-wrap leading-tight" style={{ color: "#d3dcc4" }}>{t.value}</span>
              </div>
            ))}
          </div>
        </PageSection>
      )}
      </div>
      </div>
      )}

      {/* ════════ 데이터 (공지 치환 / 확인 필요) — 페이지 아님 ════════ */}
      {(replacements.length > 0 || uncertain.length > 0) && (
        <div className="rounded-xl p-4 grid sm:grid-cols-2 gap-3" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          {replacements.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2 text-[12.5px] font-bold" style={{ color: C.text }}><ScrollText size={13} /> 공지·타이틀 치환</div>
              {replacements.map((r, i) => (
                <div key={i} className="flex items-center gap-2 py-1 text-[11.5px]">
                  <span className="line-through truncate flex-1" style={{ color: C.muted }}>{r.before}</span>
                  <span style={{ color: C.muted }}>→</span>
                  <span className="font-medium truncate flex-1" style={{ color: C.text }}>{r.after}</span>
                </div>
              ))}
            </div>
          )}
          {uncertain.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2 text-[12.5px] font-bold" style={{ color: "#fbbf24" }}><AlertCircle size={13} /> 확인 필요</div>
              <ul className="text-[12px] pl-4 list-disc space-y-0.5" style={{ color: "#e3c98a" }}>
                {uncertain.map((u, i) => <li key={i}>{u}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 페이지 구분 라벨 (본문/팝업)
function PageLabel({ title, sub }) {
  return (
    <div className="flex items-center gap-2 mb-2 px-0.5">
      <span className="text-[12px] font-bold px-2.5 py-1 rounded-md" style={{ background: "rgba(14,185,179,0.15)", color: C.accent, border: `1px solid ${C.border}` }}>{title}</span>
      {sub && <span className="text-[11px]" style={{ color: C.muted }}>{sub}</span>}
    </div>
  );
}

function PageSection({ title, sub, decor, big, children }) {
  return (
    <section className="px-6 py-8" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="text-center mb-6">
        <h3 className={`font-black tracking-tight ${big ? "text-[30px]" : "text-[22px]"}`} style={{ color: G.gold, textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>{decor ? `✦ ${title} ✦` : title}</h3>
        {sub && <p className="text-[12px] mt-2 max-w-[560px] mx-auto" style={{ color: "#a7b292" }}>{sub}</p>}
      </div>
      {children}
    </section>
  );
}

