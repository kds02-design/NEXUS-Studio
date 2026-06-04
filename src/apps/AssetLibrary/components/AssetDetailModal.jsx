// 에셋 상세 모달 — BannerCodex CodexDetailModal 레이아웃 준용.
// 좌: 이미지 (zoom/pan), 우: 메타 패널 (제목/카테고리/태그/출처/액션).
// 핵심 기능: "원본 PNG 업로드" — 임시 캡처를 가공된 깨끗한 파일로 교체 + Gemini 자동 분석.
import { useEffect, useRef, useState } from "react";
import {
  X, Download, ExternalLink, Trash2, Edit3, Save, Heart, Upload, Wand2,
  Loader2, Image as ImageIcon, RefreshCw, Check, Clock, CheckCircle2,
} from "lucide-react";
import {
  ASSET_CATEGORY_LIST, getCategoryMeta, getCategoryIcon,
  CATEGORY_BADGE_TONE, TEMP_BADGE_TONE, isTempAsset,
} from "../constants/categories";
import { ASSET_THEME_LIST, getThemeMeta } from "../constants/themes";
import { readFileAsDataUrl, probeImageSize } from "../services/cropper";
import { replaceAssetImage, updateAssetMeta } from "../services/firebase";
import { analyzeAssetImage, inferAssetTheme } from "../services/gemini";
import { useAuth } from "../../../context/AuthContext";

const sourceLabel = (app) =>
  app === "banner-codex" ? "배너 코덱스"
  : app === "promotion-archive" ? "Brand Web Library"
  : app || "";

export default function AssetDetailModal({
  asset, onClose, onLike, onDelete, onJumpToSource,
  user, showToast, ensureCanGenerate,
}) {
  // ── zoom/pan ─────────────────────────────────────────────────────
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, baseX: 0, baseY: 0 });

  // ── edit state ───────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({ title: "", tags: [], category: "etc" });
  const [tagInput, setTagInput] = useState("");

  // ── upload state ────────────────────────────────────────────────
  const fileRef = useRef(null);
  // step: 'idle' | 'pickFile' | 'preview' | 'analyzing' | 'uploading'
  const [step, setStep] = useState("idle");
  const [pending, setPending] = useState(null); // { dataUrl, width, height, suggestedCategory }

  // ── reset when asset changes ────────────────────────────────────
  useEffect(() => {
    setZoom(1); setPan({ x: 0, y: 0 });
    setIsEditing(false);
    setDraft({
      title: asset?.title || "",
      tags: Array.isArray(asset?.tags) ? [...asset.tags] : [],
      category: asset?.category || "etc",
    });
    setStep("idle"); setPending(null); setTagInput("");
  }, [asset?.id, asset?.title, asset?.category, asset?.imageUrl]);

  if (!asset) return null;

  const meta = getCategoryMeta(asset.category);
  const temp = isTempAsset(asset);
  const canJump = !!(asset.source?.app && asset.source?.bannerId);
  const { isAdmin } = useAuth();
  const isOwner = user?.uid && user.uid === asset.ownerUid;
  // 어드민은 본인 소유가 아닌 옛 에셋도 수정 가능. UI 가드만이고 Firestore rules 는 별도.
  const canEdit = isOwner || isAdmin;
  const hasChanges = isEditing && (
    draft.title !== (asset.title || "") ||
    draft.category !== (asset.category || "etc") ||
    JSON.stringify(draft.tags) !== JSON.stringify(asset.tags || [])
  );

  // ── zoom/pan handlers ───────────────────────────────────────────
  const onWheel = (e) => {
    e.preventDefault();
    const dz = e.deltaY * -0.0025;
    setZoom((z) => Math.min(5, Math.max(1, z + dz)));
  };
  const onMouseDown = (e) => {
    // 드래그로 이미지/텍스트가 선택되는 것 방지 — pan 동작과 무관하게 항상 prevent.
    e.preventDefault();
    if (zoom <= 1) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: pan.x, baseY: pan.y };
    setIsDragging(true);
  };
  const onMouseMove = (e) => {
    if (!isDragging) return;
    setPan({ x: dragRef.current.baseX + (e.clientX - dragRef.current.startX), y: dragRef.current.baseY + (e.clientY - dragRef.current.startY) });
  };
  const onMouseUp = () => { if (isDragging) setIsDragging(false); };

  // ── download ────────────────────────────────────────────────────
  const handleDownload = async () => {
    try {
      const res = await fetch(asset.imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = blob.type === "image/png" ? "png" : "jpg";
      a.download = `${asset.category}_${asset.id}.${ext}`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (_e) {
      showToast?.("다운로드 실패", "error");
    }
  };

  // ── tag edit ────────────────────────────────────────────────────
  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (draft.tags.includes(t)) { setTagInput(""); return; }
    setDraft((d) => ({ ...d, tags: [...d.tags, t] }));
    setTagInput("");
  };
  const removeTag = (t) => setDraft((d) => ({ ...d, tags: d.tags.filter((x) => x !== t) }));

  // 테마는 편집 토글 없이 즉시 반영 — 클릭 한 번에 저장. 사용자 의도 = "user" 마킹.
  const [themeBusy, setThemeBusy] = useState(false);
  const handlePickTheme = async (themeId) => {
    if (themeBusy) return;
    setThemeBusy(true);
    try {
      // 같은 값 다시 클릭 = 해제 (null 로).
      const next = asset.theme === themeId ? null : themeId;
      await updateAssetMeta(asset.id, { theme: next, themeSource: next ? "user" : null });
      showToast?.(next ? `테마: ${getThemeMeta(next)?.name}` : "테마 해제");
    } catch (e) {
      showToast?.(`테마 저장 실패: ${e.message}`, "error");
    } finally { setThemeBusy(false); }
  };
  const handleInferTheme = async () => {
    if (themeBusy) return;
    if (!asset.imageUrl) { showToast?.("이미지가 없어요", "error"); return; }
    if (ensureCanGenerate) {
      const ok = await ensureCanGenerate("analysis");
      if (!ok) return;
    }
    setThemeBusy(true);
    try {
      const res = await fetch(asset.imageUrl);
      const blob = await res.blob();
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
      const theme = await inferAssetTheme(dataUrl);
      if (theme) {
        await updateAssetMeta(asset.id, { theme, themeSource: "ai" });
        showToast?.(`AI 추정: ${getThemeMeta(theme)?.name}`);
      } else {
        showToast?.("추정 실패 — 직접 선택해주세요", "error");
      }
    } catch (e) {
      showToast?.(`AI 추정 실패: ${e.message}`, "error");
    } finally { setThemeBusy(false); }
  };

  const handleSaveMeta = async () => {
    try {
      await updateAssetMeta(asset.id, {
        title: draft.title || "",
        tags: draft.tags,
        category: draft.category,
      });
      showToast?.("저장됨");
      setIsEditing(false);
    } catch (e) {
      showToast?.(`저장 실패: ${e.message}`, "error");
    }
  };
  const handleCancelEdit = () => {
    setDraft({
      title: asset.title || "",
      tags: Array.isArray(asset.tags) ? [...asset.tags] : [],
      category: asset.category || "etc",
    });
    setIsEditing(false);
  };

  // ── upload + analyze ────────────────────────────────────────────
  const handlePickFile = () => fileRef.current?.click();

  const handleFileChosen = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!/^image\//.test(f.type)) { showToast?.("이미지 파일만 가능해요", "error"); return; }
    try {
      const dataUrl = await readFileAsDataUrl(f);
      const { width, height } = await probeImageSize(dataUrl);
      setPending({ dataUrl, width, height, suggestedCategory: null, mime: f.type });
      setStep("preview");
      // 업로드 직후 AI 자동 분석 트리거 — setPending 으로 state 갱신을 기다리지 않도록
      // dataUrl 을 직접 인자로 넘김. 사용자는 분석 결과를 검토 후 저장.
      handleAnalyze(dataUrl);
    } catch (err) {
      showToast?.(`파일 읽기 실패: ${err.message}`, "error");
    }
  };

  const handleAnalyze = async (overrideDataUrl) => {
    const dataUrl = overrideDataUrl || pending?.dataUrl;
    if (!dataUrl) return;
    // 중복 호출 차단 — handleFileChosen 자동 트리거 + 사용자가 수동 "분석" 버튼 클릭이
    // 동시에 일어나면 같은 credits doc 에 transaction race 가 발생할 수 있음.
    if (step === "analyzing") return;
    if (ensureCanGenerate) {
      const ok = await ensureCanGenerate("analysis");
      if (!ok) return;
    }
    setStep("analyzing");
    try {
      const { title, tags, suggestedCategory } = await analyzeAssetImage(dataUrl);
      setDraft((d) => ({
        ...d,
        title: title || d.title,
        tags: tags?.length ? Array.from(new Set([...d.tags, ...tags])) : d.tags,
        category: suggestedCategory || d.category,
      }));
      setPending((p) => p && ({ ...p, suggestedCategory }));
      setIsEditing(true);
      showToast?.("이미지 분석 완료 — 결과를 확인하고 저장하세요");
    } catch (err) {
      showToast?.(`분석 실패: ${err.message}`, "error");
    } finally {
      setStep("preview");
    }
  };

  const handleConfirmReplace = async () => {
    if (!pending?.dataUrl) return;
    setStep("uploading");
    try {
      await replaceAssetImage(asset.id, {
        dataUrl: pending.dataUrl,
        width: pending.width,
        height: pending.height,
        title: isEditing ? draft.title : undefined,
        tags: isEditing ? draft.tags : undefined,
        category: isEditing ? draft.category : undefined,
      });
      showToast?.("원본으로 교체 완료");
      setStep("idle"); setPending(null);
      setIsEditing(false);
    } catch (err) {
      showToast?.(`교체 실패: ${err.message}`, "error");
      setStep("preview");
    }
  };

  const handleCancelUpload = () => { setStep("idle"); setPending(null); };

  // 좌측 이미지 영역에서 미리보기를 띄울 때 사용할 이미지 — pending 있으면 그것.
  const displayedImage = pending?.dataUrl || asset.imageUrl;

  // ── render ─────────────────────────────────────────────────────
  return (
    <div
      className="fixed top-[52px] left-0 right-0 bottom-0 z-[2000] flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-3 right-3 sm:top-5 sm:right-5 p-2.5 rounded-full transition-colors z-[600] border bg-[#1a1a1a] border-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white shadow-lg"
      >
        <X className="w-5 h-5" />
      </button>

      <div
        className="w-full max-w-[1340px] flex rounded-[20px] overflow-hidden shadow-2xl relative bg-[#0c0c0e] border border-white/10"
        style={{ height: "min(calc(100vh - 76px), 740px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* LEFT — image area */}
        <div
          className="flex-1 relative overflow-hidden flex flex-col items-center justify-center bg-black py-16 select-none"
          style={{ userSelect: "none", WebkitUserSelect: "none" }}
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {/* top-left action chips */}
          <div className="absolute top-6 left-6 z-[510] flex gap-1.5 flex-wrap">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-bold border bg-black/50 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 backdrop-blur-md transition-all"
            >
              <Download className="w-3.5 h-3.5" /> 이미지 저장
            </button>
            {canEdit && (
              <button
                onClick={handlePickFile}
                disabled={step === "uploading" || step === "analyzing"}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-bold border backdrop-blur-md transition-all disabled:opacity-50 disabled:cursor-wait ${
                  pending
                    ? "bg-amber-500/20 border-amber-400/40 text-amber-200"
                    : "bg-black/50 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10"
                }`}
                title="가공된 깨끗한 PNG 로 교체"
              >
                <Upload className="w-3.5 h-3.5" />
                {pending ? "다른 파일로" : (temp ? "원본 업로드" : "원본 교체")}
              </button>
            )}
            {canJump && (
              <button
                onClick={() => onJumpToSource?.(asset)}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-bold border bg-black/50 border-white/10 text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/10 backdrop-blur-md transition-all"
                title={`${sourceLabel(asset.source.app)} 에서 출처로 이동`}
              >
                <ExternalLink className="w-3.5 h-3.5" /> 출처로 이동
              </button>
            )}
          </div>

          {/* status badge (temp / uploaded) */}
          <div className="absolute top-6 right-6 z-[510]">
            {temp && !pending ? (
              <span
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold border backdrop-blur-md"
                style={{
                  background: TEMP_BADGE_TONE.bg,
                  color: TEMP_BADGE_TONE.text,
                  borderColor: TEMP_BADGE_TONE.border,
                }}
              >
                <Clock className="w-3.5 h-3.5" /> 임시 캡처
              </span>
            ) : !temp && !pending ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold border bg-emerald-500/15 border-emerald-500/40 text-emerald-300 backdrop-blur-md">
                <CheckCircle2 className="w-3.5 h-3.5" /> 가공 완료
              </span>
            ) : null}
            {pending && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold border bg-cyan-500/15 border-cyan-500/40 text-cyan-200 backdrop-blur-md">
                <RefreshCw className="w-3.5 h-3.5" /> 교체 대기 ({pending.width}×{pending.height})
              </span>
            )}
          </div>

          {/* image */}
          {displayedImage ? (
            <img
              src={displayedImage}
              alt={asset.title || asset.category}
              draggable={false}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
                transition: isDragging ? "none" : "transform 0.1s ease-out",
                imageRendering: "auto",
              }}
              className="max-w-full max-h-full object-contain pointer-events-none"
              onDragStart={(e) => e.preventDefault()}
            />
          ) : (
            <div className="flex items-center justify-center text-zinc-700">
              <ImageIcon className="w-12 h-12" />
            </div>
          )}

          {/* hidden file input */}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChosen}
          />

          {/* upload action bar (bottom) */}
          {pending && (
            <div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[520] flex items-center gap-2 px-3 py-2.5 bg-[#1a1a1a]/95 border border-white/10 rounded-xl shadow-2xl backdrop-blur-md"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleAnalyze}
                disabled={step === "analyzing" || step === "uploading"}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold bg-violet-500/15 border border-violet-500/40 text-violet-300 hover:bg-violet-500/25 transition-colors disabled:opacity-50 disabled:cursor-wait"
                title="이미지 분석 → 제목·태그·카테고리 자동 채움"
              >
                {step === "analyzing"
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 분석 중...</>
                  : <><Wand2 className="w-3.5 h-3.5" /> AI 자동 분석</>}
              </button>
              <button
                onClick={handleConfirmReplace}
                disabled={step === "uploading" || step === "analyzing"}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 hover:bg-emerald-500/30 transition-colors disabled:opacity-50 disabled:cursor-wait"
              >
                {step === "uploading"
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 업로드 중...</>
                  : <><Check className="w-3.5 h-3.5" /> 이 파일로 교체</>}
              </button>
              <button
                onClick={handleCancelUpload}
                disabled={step === "uploading"}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] text-zinc-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30"
              >
                취소
              </button>
            </div>
          )}

          {/* zoom slider */}
          <div
            className="absolute bottom-4 right-4 flex items-center gap-2 z-[510] px-2.5 py-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-full shadow-lg"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <span className="text-[11px] font-bold text-white w-9 text-center tabular-nums shrink-0">{Math.round(zoom * 100)}%</span>
            <input
              type="range" min="1" max="5" step="0.1" value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-[100px] md:w-[120px] accent-[#7895c2]"
            />
          </div>
        </div>

        {/* RIGHT — meta panel */}
        <div className="w-[280px] shrink-0 flex flex-col h-full shadow-2xl z-[510] relative bg-[#111111] border-l border-white/5">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pt-5 pb-16">
            {/* title row */}
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 border bg-black border-zinc-800"
                style={{ color: meta.color }}
              >
                {getCategoryIcon(meta.id, 20)}
              </div>
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text" value={draft.title}
                      onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                      placeholder="에셋 제목"
                      className="w-full text-base font-bold px-2 py-1.5 border rounded-lg focus:outline-none transition-colors bg-zinc-900 border-zinc-700 text-white focus:border-[#0eb9b3]"
                    />
                    <select
                      value={draft.category}
                      onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                      className="w-full text-xs px-2 py-1.5 border rounded-lg focus:outline-none bg-zinc-900 border-zinc-700 text-white appearance-none"
                    >
                      {ASSET_CATEGORY_LIST.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
                    <h2 className="text-base font-bold leading-tight mb-1.5 break-words text-white" title={asset.title}>
                      {asset.title || <span className="text-zinc-600 italic">제목 없음</span>}
                    </h2>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider"
                        style={{
                          background: CATEGORY_BADGE_TONE.bg,
                          color: CATEGORY_BADGE_TONE.text,
                          border: `1px solid ${CATEGORY_BADGE_TONE.border}`,
                        }}
                      >
                        {meta.name}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">{asset.width}×{asset.height}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* action row */}
            <div className="flex items-center gap-1.5 mb-4 border-b border-white/5 pb-4">
              {canEdit && (
                <button
                  onClick={() => onDelete?.(asset)}
                  className="w-9 h-9 rounded-full border flex items-center justify-center transition-colors border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  title={isOwner ? "삭제" : "삭제 (어드민 권한)"}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              {canEdit && (
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${
                    isEditing ? "bg-[#0eb9b3] text-white border-[#0eb9b3]" : "border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  }`}
                  title={isOwner ? "속성 편집" : "속성 편집 (어드민 권한)"}
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => onLike?.(asset)}
                className={`flex items-center gap-1.5 h-9 px-3.5 rounded-full border text-[12px] font-bold transition-colors ${
                  asset.liked ? "border-red-500/50 text-red-400 bg-red-500/10" : "border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                <Heart className={`w-4 h-4 ${asset.liked ? "fill-current text-red-400" : ""}`} />
                <span>{asset.liked ? "1" : "0"}</span>
              </button>
            </div>

            {/* theme — 컬러톤 4단계. 클릭 한 번에 즉시 저장. */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                  테마
                  {asset.themeSource === "ai" && asset.theme && (
                    <span
                      title="AI 추정 — 직접 클릭하면 수동 지정으로 바뀝니다"
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] bg-purple-500/15 border border-purple-500/30 text-purple-300 normal-case tracking-normal"
                    >
                      <Wand2 className="w-2.5 h-2.5" /> AI
                    </span>
                  )}
                </div>
                {canEdit && (
                  <button
                    onClick={handleInferTheme}
                    disabled={themeBusy}
                    className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-200 disabled:opacity-50"
                    title={`Gemini 로 이미지 컬러톤 재추정 (analysis 1c 소모)${!isOwner ? " · 어드민 권한" : ""}`}
                  >
                    {themeBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                    AI 추정
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ASSET_THEME_LIST.map((t) => {
                  const active = asset.theme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => canEdit && handlePickTheme(t.id)}
                      disabled={!canEdit || themeBusy}
                      title={!canEdit ? "본인 또는 어드민만 수정 가능" : (active ? "다시 클릭하면 해제" : "테마로 지정")}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                        active
                          ? "bg-white/10 border-white/30 text-white"
                          : "bg-transparent border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                      } ${(!canEdit || themeBusy) ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-white/20"
                        style={{ background: t.swatch }}
                      />
                      {t.name}
                    </button>
                  );
                })}
              </div>
              {!asset.theme && (
                <div className="mt-1.5 text-[10px] text-zinc-600">
                  {canEdit ? "테마 미지정 — 칩 클릭 또는 'AI 추정'" : "테마 미지정"}
                </div>
              )}
            </div>

            {/* tags */}
            <div className="mb-4">
              <div className="text-[10px] font-bold mb-2 uppercase tracking-wider text-zinc-500">태그</div>
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {draft.tags.map((t, i) => (
                      <span key={i} className="px-2 py-1 text-[11px] font-medium rounded flex items-center gap-1.5 border bg-zinc-800 border-zinc-700 text-zinc-300">
                        #{t}
                        <button onClick={() => removeTag(t)} className="hover:text-red-500 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text" value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                      placeholder="태그 입력 후 엔터"
                      className="flex-1 text-xs px-3 py-2 border rounded-lg focus:outline-none bg-zinc-900 border-zinc-700 text-white focus:border-[#0eb9b3]"
                    />
                    <button onClick={addTag} className="px-3 py-2 bg-[#0eb9b3] text-white text-xs font-bold rounded-lg hover:bg-[#39d4ce] transition-colors">
                      추가
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {(asset.tags || []).length === 0 ? (
                    <span className="text-[11px] text-zinc-600 italic">태그 없음 — 편집으로 추가하거나 원본 업로드 시 AI 자동 분석</span>
                  ) : (
                    (asset.tags || []).map((t, i) => (
                      <span key={i} className="px-2.5 py-1 text-[11px] font-medium rounded border bg-transparent border-zinc-800 text-zinc-400">
                        #{t}
                      </span>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* source info */}
            {asset.source?.bannerTitle && (
              <div className="mb-4">
                <div className="text-[10px] font-bold mb-2 uppercase tracking-wider text-zinc-500">출처</div>
                <div className="p-3 rounded-lg border border-white/5 bg-white/[0.02]">
                  <div className="text-[11px] text-zinc-400 mb-0.5">[{sourceLabel(asset.source.app)}]</div>
                  <div className="text-xs text-zinc-200 break-words leading-snug">{asset.source.bannerTitle}</div>
                  {canJump && (
                    <button
                      onClick={() => onJumpToSource?.(asset)}
                      className="mt-2 flex items-center gap-1 text-[11px] text-cyan-300 hover:text-cyan-200"
                    >
                      <ExternalLink size={11} /> 출처로 이동
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* upload hint */}
            {temp && !pending && (
              <div className="mb-4 p-3 rounded-lg border border-amber-500/30 bg-amber-500/[0.06]">
                <div className="flex items-start gap-2 text-[11px] text-amber-200/90 leading-relaxed">
                  <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <div>
                    이 에셋은 가공 전 임시 캡처입니다.
                    원본 폴더에서 깨끗한 PNG 를 찾아 <b className="text-amber-300">"원본 업로드"</b> 로 교체하면 임시 딱지가 사라지고 업로드 완료 목록에 추가됩니다.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* save/cancel sticky footer (meta edit) */}
          {hasChanges && !pending && (
            <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/5 flex gap-2 shrink-0 bg-[#111111]/90 backdrop-blur">
              <button
                onClick={handleCancelEdit}
                className="flex-1 py-2.5 rounded-lg text-xs font-bold transition-colors border bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800"
              >
                취소
              </button>
              <button
                onClick={handleSaveMeta}
                className="flex-[2] py-2.5 rounded-lg text-xs font-bold bg-[#0b948f] hover:bg-[#0eb9b3] text-white transition-colors shadow-lg shadow-[#0eb9b3]/20 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" /> 저장
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
