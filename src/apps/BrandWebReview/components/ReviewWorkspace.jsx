// 브랜드 웹 리뷰 — 컨펌·피드백 워크스페이스.
// 레퍼런스: C:\work\00_AI연습\05_스마트프로모션검색\app\my-design-app\src\components\modals\ConfirmWorkspace.jsx
// 단순화: 버전 히스토리/PC·모바일 토글/HTML 리포트 export 제거 → 핵심 워크플로우(영역 선택+피드백 노트)에 집중.
// 노트 저장은 props.notes / props.onNotesChange 로 부모(BrandWebReview)가 영구화 담당.
import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { Image as ImageIcon, CheckSquare, Lock, ChevronLeft, Sparkles, Smartphone, Monitor, Layers, Plus, ListTree, X, History, ZoomIn } from "lucide-react";

// 페이지 상태 dot — 부모(index.jsx)의 STATUS_DOT 과 동기 유지.
const PAGE_STATUS_COLOR = {
  none:    "#71717a",
  pending: "#FDCB6E",
  done:    "#0eb9b3",
};
const PAGE_STATUS_LABEL = {
  none:    "수정 없음",
  pending: "수정 요청",
  done:    "수정 완료",
};

export default function ReviewWorkspace({
  title,            // 평가/시안 제목
  image,            // 이미지 dataURL or URL (활성 버전 url)
  meta,             // 추가 메타(점수 등 + device) — 표시만, 동작 없음
  notes,            // [{ id, rect:{x,y,w,h} (0~1 비율), text, attachment, viewMode, date, resolved }]
  onNotesChange,    // (nextNotes) => void
  onConfirm,        // () => void — 모든 노트 resolved 일 때 활성화
  onBack,           // () => void — 좌측 < 버튼 / 닫기
  // ─── 좌측 PPT 썸네일 패널 (같은 device 페이지 목록) ───
  pages,            // [{ id, name, thumbUrl, pageNumber, status, versionsCount, isActive }]
  activePageId,
  onSelectPage,     // (pageId) => void
  // ─── 헤더 버전 탭 ───
  versions,         // [{ id, label, url, addedAt, notes, confirmed }]
  activeVersionId,
  onSelectVersion,  // (versionId) => void
  onUploadNewVersion, // (file) => Promise<void>
  device,           // "pc" | "mobile" | "banner" — 썸네일 패널 헤더 표시 + 캔버스 max-width 결정
  // ─── 컨펌 중 PC/Mobile/Banner 전환 ───
  availableDevices, // string[] — 현재 프로젝트에 존재하는 device 목록. 비면 토글 안 보임.
  onSwitchDevice,   // (device) => void — 토글 클릭 시 호출. 부모가 첫 페이지로 active 변경.
  // ─── 프로젝트 전체 수정사항 리스트 + 점프 ───
  allNotes,         // [{ id, text, resolved, date, attachment, rect, pageId, pageName, pageNumber, device, versionId, versionLabel, isLatestVersion }]
  onJumpToNote,     // (pageId, versionId, noteId) => void
  onToggleNoteResolved, // (pageId, versionId, noteId) => void — 임의 페이지·버전 노트 resolved 토글
  jumpTargetNoteId, // 부모가 점프 직후 세팅 — useEffect 로 스크롤
  onJumpHandled,    // 스크롤 완료 후 부모 state 클리어
}) {
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const fileInputRef = useRef(null);
  const versionFileRef = useRef(null);
  const noteRefs = useRef({});

  const [isDrawing, setIsDrawing] = useState(false);
  const [selectionPx, setSelectionPx] = useState(null);
  const [comment, setComment] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [hoveredNoteId, setHoveredNoteId] = useState(null);
  const [isButtonUnlocked, setIsButtonUnlocked] = useState(false);
  const [notesMode, setNotesMode] = useState("page");      // "page" | "all"
  const [allNotesFilter, setAllNotesFilter] = useState("all"); // "all" | "open" | "done"
  // 모바일 캔버스 줌 — 1x(viewport fit) → 1.5x → 2x → 1x. device 가 바뀌면 리셋.
  const [zoom, setZoom] = useState(1);
  useEffect(() => { setZoom(1); }, [device, activePageId]);
  const cycleZoom = () => setZoom((z) => (z === 1 ? 1.5 : z === 1.5 ? 2 : 1));
  const [showPrevNotes, setShowPrevNotes] = useState(true);    // 이전 버전 노트 오버레이

  // 활성 버전 직전(이전) 버전 — 1차→2차 시안 비교 오버레이용.
  const previousVersion = useMemo(() => {
    if (!Array.isArray(versions) || versions.length < 2 || !activeVersionId) return null;
    const idx = versions.findIndex(v => v.id === activeVersionId);
    if (idx <= 0) return null;
    return versions[idx - 1];
  }, [versions, activeVersionId]);
  const previousNotes = previousVersion?.notes || [];

  const unresolvedCount = notes.filter(n => !n.resolved).length;
  const isConfirmDisabled = notes.length === 0 || unresolvedCount > 0;
  const activeHighlightId = editingNoteId || hoveredNoteId;

  // 전체 리스트에서 노트 클릭 — 같은 페이지+버전이면 스크롤, 다르면 부모에 점프 요청.
  const handleAllNoteClick = useCallback((n) => {
    if (n.pageId === activePageId && n.versionId === activeVersionId) {
      const target = noteRefs.current[n.id];
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHoveredNoteId(n.id);
    } else if (onJumpToNote) {
      onJumpToNote(n.pageId, n.versionId, n.id);
    }
  }, [activePageId, activeVersionId, onJumpToNote]);

  // 부모가 jumpTargetNoteId 를 세팅하면 — 새 image/notes 가 렌더된 다음 그 노트로 스크롤.
  useEffect(() => {
    if (!jumpTargetNoteId) return;
    const t = setTimeout(() => {
      const target = noteRefs.current[jumpTargetNoteId];
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHoveredNoteId(jumpTargetNoteId);
      }
      onJumpHandled?.();
    }, 120);
    return () => clearTimeout(t);
  }, [jumpTargetNoteId, image, notes, onJumpHandled]);

  // 첨부 파일 미리보기 — dataURL 변환.
  const handleAttach = (file) => {
    setAttachedFile(file);
    if (!file) { setPreviewUrl(null); return; }
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result);
    reader.readAsDataURL(file);
  };

  const scrollToNote = useCallback((noteId) => {
    const target = noteRefs.current[noteId];
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHoveredNoteId(noteId);
  }, []);

  // 영역 + 코멘트 등록.
  const addFeedback = () => {
    if (!comment.trim() || !selectionPx || !imageRef.current) return;
    const rW = imageRef.current.offsetWidth, rH = imageRef.current.offsetHeight;
    const finalRect = {
      x: selectionPx.x / rW,
      y: selectionPx.y / rH,
      w: selectionPx.w / rW,
      h: selectionPx.h / rH,
    };
    const newNote = {
      id: editingNoteId || Date.now(),
      rect: finalRect,
      text: comment,
      attachment: previewUrl || null,
      date: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      resolved: false,
    };
    const nextNotes = editingNoteId
      ? notes.map(n => n.id === editingNoteId ? newNote : n)
      : [...notes, newNote];
    onNotesChange?.(nextNotes);
    setSelectionPx(null); setComment(""); setAttachedFile(null); setPreviewUrl(null); setEditingNoteId(null);
  };

  const toggleResolved = (noteId) => {
    const next = notes.map(n => n.id === noteId ? { ...n, resolved: !n.resolved } : n);
    onNotesChange?.(next);
  };

  const removeNote = (noteId) => {
    onNotesChange?.(notes.filter(n => n.id !== noteId));
  };

  if (!image) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
        이미지가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0c0c0e] text-zinc-300 overflow-hidden">

      {/* HEADER — 좌(뒤로 + 제목) / 중앙(메타) / 우(컨펌 승인) */}
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-5 bg-[#121214] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button onClick={onBack} className="p-1.5 hover:bg-white/5 rounded text-zinc-400" title="목록으로">
              <ChevronLeft size={18} />
            </button>
          )}
          {/* 제목 — 차분한 톤. 버전 컨트롤은 우측 이미지 영역으로 분리되어 제목 길이가 바뀌어도 버전 버튼이 이동하지 않는다. */}
          <h2 className="text-[12px] font-medium text-zinc-400 truncate min-w-0">{title || '리뷰 항목'}</h2>
          {meta?.finalScore != null && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#df6a78]/15 border border-[#df6a78]/40 text-[#df6a78] tabular-nums shrink-0">
              점수 {meta.finalScore}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-zinc-500 tabular-nums font-mono">
            {notes.filter(n => n.resolved).length}/{notes.length} 처리
          </span>
          <button
            disabled={isConfirmDisabled}
            onClick={() => {
              if (isConfirmDisabled) return;
              if (!isButtonUnlocked) { setIsButtonUnlocked(true); return; }
              onConfirm?.();
            }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[11px] font-bold transition-all border
              ${isConfirmDisabled ? 'bg-zinc-800 border-zinc-700 text-zinc-600 cursor-not-allowed'
                : isButtonUnlocked ? 'bg-violet-600 border-violet-500 text-white shadow-lg'
                : 'bg-violet-600/10 border-violet-500/30 text-violet-300 hover:bg-violet-600/20'}`}
          >
            {isConfirmDisabled ? <Lock size={12} /> : <CheckSquare size={12} />}
            {isConfirmDisabled ? '해결 필요' : isButtonUnlocked ? '한 번 더 — 확정' : '최종 컨펌 승인'}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">

        {/* LEFT — PPT 썸네일 패널 (같은 device 의 페이지 목록) */}
        {Array.isArray(pages) && pages.length > 0 && (
          <aside className="w-[180px] shrink-0 border-r border-white/5 bg-[#0f0f12] flex flex-col">
            {/* Device 토글 — 사이드바 상단. 여러 device 존재 시 segmented control, 1개면 라벨만. */}
            {Array.isArray(availableDevices) && availableDevices.length > 1 ? (
              <div className="shrink-0 p-2 border-b border-white/5">
                <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-black/30 border border-white/5">
                  {availableDevices.map((d) => {
                    const active = d === device;
                    const meta_ = {
                      pc:     { Icon: Monitor,    label: "PC",     color: "#74B9FF" },
                      mobile: { Icon: Smartphone, label: "Mobile", color: "#FD79A8" },
                      banner: { Icon: Layers,     label: "Banner", color: "#FDCB6E" },
                    }[d] || { Icon: Monitor, label: d, color: "#71717a" };
                    const { Icon, label, color } = meta_;
                    return (
                      <button
                        key={d}
                        onClick={() => onSwitchDevice?.(d)}
                        title={`${label} 페이지로 전환`}
                        className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                          active ? "text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"
                        }`}
                        style={active ? { background: `${color}30`, color, boxShadow: `inset 0 0 0 1px ${color}50` } : undefined}
                      >
                        <Icon className="w-3 h-3" /> {label}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-1.5 px-1 flex items-center justify-end text-[9px] text-zinc-600 font-mono">
                  {pages.length}p
                </div>
              </div>
            ) : (
              <div className="shrink-0 px-3 py-2.5 border-b border-white/5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                {device === "mobile"
                  ? <Smartphone className="w-3 h-3 text-[#FD79A8]" />
                  : device === "banner"
                    ? <Layers className="w-3 h-3 text-[#FDCB6E]" />
                    : <Monitor className="w-3 h-3 text-[#74B9FF]" />}
                <span>{device === "mobile" ? "Mobile" : device === "banner" ? "Banner" : "PC"}</span>
                <span className="ml-auto text-zinc-600 font-mono">{pages.length}</span>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
              {pages.map(pg => {
                const active = pg.id === activePageId;
                const dotColor = PAGE_STATUS_COLOR[pg.status] || "#71717a";
                const dotLabel = PAGE_STATUS_LABEL[pg.status] || "";
                return (
                  <button
                    key={pg.id}
                    onClick={() => onSelectPage?.(pg.id)}
                    title={`${pg.pageNumber}. ${pg.name}${dotLabel ? ` · ${dotLabel}` : ""}`}
                    className={`group w-full flex items-center gap-2 p-1.5 rounded-md transition-colors text-left ${
                      active
                        ? "bg-violet-500/15 ring-1 ring-violet-400/40"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <span className="shrink-0 w-5 text-[10px] font-mono font-semibold text-zinc-500 text-right tabular-nums">
                      {pg.pageNumber}
                    </span>
                    <div className={`relative shrink-0 ${device === "mobile" ? "w-[48px] aspect-[9/16]" : device === "banner" ? "w-[112px] aspect-[16/5]" : "w-[88px] aspect-[16/10]"} rounded-sm overflow-hidden bg-[#0c0c0e] border border-white/5`}>
                      {pg.thumbUrl ? (
                        <img src={pg.thumbUrl} alt={pg.name} className={`w-full h-full ${device === "pc" ? "object-cover" : "object-contain"}`} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700">
                          <ImageIcon className="w-3 h-3" />
                        </div>
                      )}
                      {pg.versionsCount > 1 && (
                        <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-violet-600/80 text-[8px] font-bold font-mono text-white leading-tight">
                          v{pg.versionsCount}
                        </span>
                      )}
                    </div>
                    <span
                      className="shrink-0 w-1.5 h-1.5 rounded-full ml-auto"
                      style={{ background: dotColor }}
                      title={dotLabel}
                    />
                  </button>
                );
              })}
            </div>
            {/* 범례 */}
            <div className="shrink-0 px-3 py-2 border-t border-white/5 flex items-center justify-between text-[9px] text-zinc-600">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: PAGE_STATUS_COLOR.none }} /> 없음
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: PAGE_STATUS_COLOR.pending }} /> 수정
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: PAGE_STATUS_COLOR.done }} /> 완료
              </span>
            </div>
          </aside>
        )}

        {/* IMAGE + 드래그 선택 */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto relative custom-scrollbar"
          onPointerDown={(e) => {
            if (e.target.closest('.popover-input') || e.target.closest('button') || e.target.closest('aside')) return;
            if (!imageRef.current) return;
            const rect = imageRef.current.getBoundingClientRect();
            setSelectionPx({
              x: e.clientX - rect.left, y: e.clientY - rect.top,
              startX: e.clientX - rect.left, startY: e.clientY - rect.top,
              w: 0, h: 0,
            });
            setEditingNoteId(null); setIsDrawing(true);
          }}
          onPointerMove={(e) => {
            if (!isDrawing || !selectionPx || !imageRef.current) return;
            const rect = imageRef.current.getBoundingClientRect();
            const curX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            const curY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
            setSelectionPx(p => ({
              ...p,
              x: Math.min(curX, p.startX), y: Math.min(curY, p.startY),
              w: Math.abs(curX - p.startX), h: Math.abs(curY - p.startY),
            }));
          }}
          onPointerUp={() => setIsDrawing(false)}
        >
          {/* 우상단 sticky 컨트롤 바 — 줌(모바일 한정) + 버전 + 이전 버전 영역 토글.
              제목과 분리되어 헤더 제목이 바뀌어도 위치가 흔들리지 않음. */}
          <div className="sticky top-0 z-30 flex justify-end gap-2 px-6 pt-3 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-2 flex-wrap justify-end">
              {device === "mobile" && (
                <button
                  onClick={cycleZoom}
                  title="모바일 캔버스 확대/축소 (클릭하여 1x → 1.5x → 2x 순환)"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#121214]/90 backdrop-blur-md border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 text-[10px] font-bold transition-colors shadow-lg"
                >
                  <ZoomIn className="w-3 h-3" />
                  {Math.round(zoom * 100)}%
                </button>
              )}
              {Array.isArray(versions) && versions.length > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#121214]/90 backdrop-blur-md border border-white/10 shadow-lg">
                  <Layers className="w-3 h-3 text-zinc-500 shrink-0" />
                  {versions.map((v) => {
                    const active = v.id === activeVersionId;
                    return (
                      <button
                        key={v.id}
                        onClick={() => onSelectVersion?.(v.id)}
                        title={v.confirmed ? `${v.label} (컨펌)` : v.label}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-colors ${
                          active
                            ? "bg-violet-500/30 text-violet-200 ring-1 ring-violet-400/40"
                            : "text-zinc-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {v.label}
                        {v.confirmed && <span className="ml-1 text-[#0eb9b3]">✓</span>}
                      </button>
                    );
                  })}
                  <input
                    ref={versionFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f && onUploadNewVersion) onUploadNewVersion(f);
                      e.target.value = "";
                    }}
                  />
                  <button
                    onClick={() => versionFileRef.current?.click()}
                    title="수정된 디자인 업로드 (새 버전)"
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[10px] font-bold transition-colors"
                  >
                    <Plus className="w-3 h-3" /> 새 버전
                  </button>
                  {previousVersion && (
                    <button
                      onClick={() => setShowPrevNotes((v) => !v)}
                      title={`이전 버전(${previousVersion.label}) 수정요청 영역을 ${showPrevNotes ? "숨기기" : "표시"} (${previousNotes.length}개)`}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold transition-colors ${
                        showPrevNotes
                          ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                          : "bg-white/5 border-white/10 text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      <History className="w-3 h-3" /> {previousVersion.label} {previousNotes.length}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="min-h-full mx-auto py-10 px-10 relative flex justify-center items-start cursor-crosshair">
            {/* device 별 캔버스 max-width — Mobile 은 모바일 해상도(~420px), zoom 으로 확대 가능. */}
            <div
              className={`relative shadow-2xl w-full ${
                device === "mobile" ? "" : device === "banner" ? "max-w-[1920px]" : "max-w-[1400px]"
              }`}
              style={device === "mobile" ? { maxWidth: `${440 * zoom}px` } : undefined}
            >
              <img
                ref={imageRef}
                src={image}
                alt="Review canvas"
                // Mobile: viewport 높이 안에 맞도록 max-h 적용해 세로 잘림 방지. zoom 따라 max-h 도 동기 확대.
                // 그 외 device 는 기존처럼 w-full h-auto.
                className={
                  device === "mobile"
                    ? "block max-w-full w-auto mx-auto border border-white/5 rounded-sm select-none"
                    : "block w-full h-auto border border-white/5 rounded-sm select-none"
                }
                style={device === "mobile" ? { maxHeight: `calc((100vh - 200px) * ${zoom})` } : undefined}
                draggable={false}
              />

              {/* 이전 버전 수정요청 영역 — 점선 오버레이. 현재 버전의 노트 아래(z-20) 에 그려 클릭 방해 안 함. */}
              {showPrevNotes && previousVersion && previousNotes.map((pn, idx) => (
                <div
                  key={`prev_${pn.id}`}
                  title={`${previousVersion.label} · ${pn.resolved ? "해결됨" : "미해결"} · ${pn.text || ""}`}
                  className={`absolute z-20 border-2 border-dashed rounded-sm pointer-events-none ${
                    pn.resolved
                      ? "border-emerald-400/50 bg-emerald-400/5"
                      : "border-amber-400/70 bg-amber-400/10"
                  }`}
                  style={{
                    left: `${pn.rect.x * 100}%`, top: `${pn.rect.y * 100}%`,
                    width: `${pn.rect.w * 100}%`, height: `${pn.rect.h * 100}%`,
                  }}
                >
                  <div className={`absolute -top-2.5 -left-2.5 px-1 h-5 min-w-5 rounded-full flex items-center justify-center text-[9px] font-black shadow ${
                    pn.resolved ? "bg-emerald-500/80 text-white" : "bg-amber-500 text-black"
                  }`}>
                    {previousVersion.label}·{idx + 1}
                  </div>
                </div>
              ))}

              {/* 등록된 노트 박스 */}
              {notes.map((note, idx) => {
                const isActive = note.id === activeHighlightId;
                return (
                  <div
                    key={note.id}
                    ref={el => (noteRefs.current[note.id] = el)}
                    onMouseEnter={() => setHoveredNoteId(note.id)}
                    onMouseLeave={() => setHoveredNoteId(null)}
                    onClick={(e) => { e.stopPropagation(); scrollToNote(note.id); }}
                    className={`absolute border-2 transition-all duration-200 rounded-sm cursor-pointer ${
                      isActive
                        ? 'z-40 border-cyan-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.55),0_0_15px_rgba(34,211,238,0.5)]'
                        : 'z-30 border-white/30 hover:border-white/60'
                    }`}
                    style={{
                      left: `${note.rect.x * 100}%`, top: `${note.rect.y * 100}%`,
                      width: `${note.rect.w * 100}%`, height: `${note.rect.h * 100}%`,
                    }}
                  >
                    <div className={`absolute -top-2.5 -left-2.5 w-5 h-5 ${
                      isActive ? 'bg-cyan-500 scale-110' : note.resolved ? 'bg-green-600' : 'bg-red-600'
                    } text-white rounded-full flex items-center justify-center text-[9px] font-black shadow`}>{idx + 1}</div>
                  </div>
                );
              })}

              {/* 드로잉 중인 선택 박스 */}
              {selectionPx && (
                <div
                  className="absolute border-2 border-dashed border-cyan-400 bg-cyan-400/10 z-[70] pointer-events-none rounded-sm"
                  style={{ left: selectionPx.x, top: selectionPx.y, width: selectionPx.w, height: selectionPx.h }}
                />
              )}

              {/* 코멘트 입력 popover */}
              {selectionPx && !isDrawing && selectionPx.w > 5 && selectionPx.h > 5 && (
                <div
                  className="absolute z-[80] popover-input"
                  style={{
                    left: (imageRef.current && imageRef.current.offsetWidth - (selectionPx.x + selectionPx.w) < 420)
                      ? Math.max(0, selectionPx.x - 400) : selectionPx.x + selectionPx.w + 12,
                    top: selectionPx.y,
                  }}
                >
                  <div className="w-[380px] bg-[#1c1c1f] border border-zinc-700 rounded-lg shadow-2xl p-4 backdrop-blur-xl">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] text-cyan-400 font-black uppercase tracking-widest">피드백 추가</span>
                      <button onClick={() => { setSelectionPx(null); setComment(""); setAttachedFile(null); setPreviewUrl(null); setEditingNoteId(null); }} className="text-zinc-500 hover:text-white"><X size={14} /></button>
                    </div>
                    <textarea
                      autoFocus
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="이 영역에 대한 피드백을 작성하세요..."
                      className="w-full bg-black/40 border border-zinc-800 rounded p-3 text-[13px] text-white resize-none outline-none focus:border-cyan-500/50 min-h-[80px]"
                      rows={4}
                    />
                    {previewUrl && (
                      <div className="mt-2 relative">
                        <img src={previewUrl} alt="" className="w-full h-auto rounded border border-white/5" />
                        <button onClick={() => { setAttachedFile(null); setPreviewUrl(null); }}
                          className="absolute top-1 right-1 bg-black/70 text-white rounded p-1"><X size={12} /></button>
                      </div>
                    )}
                    <div className="mt-3 flex justify-between items-center">
                      <button onClick={() => fileInputRef.current?.click()} title="이미지 첨부"
                        className="p-2 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white border border-zinc-800">
                        <ImageIcon size={14} />
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                          onChange={(e) => handleAttach(e.target.files?.[0])} />
                      </button>
                      <div className="flex gap-2">
                        <button onClick={() => { setSelectionPx(null); setComment(""); setAttachedFile(null); setPreviewUrl(null); setEditingNoteId(null); }}
                          className="text-[11px] text-zinc-500 px-3 py-1.5 hover:text-white">취소</button>
                        <button onClick={addFeedback}
                          disabled={!comment.trim()}
                          className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-[11px] font-bold px-5 py-1.5 rounded">
                          등록
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SIDE PANEL — 노트 리스트 (이 페이지 / 전체) */}
        <aside className="w-80 border-l border-white/5 bg-[#121214] flex flex-col shrink-0">
          <div className="p-5 border-b border-white/5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
                Design Review <Sparkles size={10} className="text-cyan-500" />
              </h3>
              {/* 모드 토글 */}
              {Array.isArray(allNotes) && (
                <div className="flex bg-black/40 border border-white/10 rounded-md p-0.5">
                  <button
                    onClick={() => setNotesMode("page")}
                    className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded transition-colors ${
                      notesMode === "page" ? "bg-cyan-500/20 text-cyan-300" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                    title="현재 페이지의 노트만"
                  >
                    이 페이지
                  </button>
                  <button
                    onClick={() => setNotesMode("all")}
                    className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-1 ${
                      notesMode === "all" ? "bg-cyan-500/20 text-cyan-300" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                    title="프로젝트 전체 수정사항"
                  >
                    <ListTree className="w-2.5 h-2.5" /> 전체
                  </button>
                </div>
              )}
            </div>
            {/* 카운트 — 모드에 따라 소스 변경 */}
            {(() => {
              const src = notesMode === "all" ? (allNotes || []) : notes;
              const doneCnt = src.filter(n => n.resolved).length;
              return (
                <div className="grid grid-cols-2 gap-2 mb-1">
                  <div className="bg-white/5 border border-white/5 rounded-lg p-2.5">
                    <p className="text-[9px] text-zinc-500 uppercase font-black mb-0.5">TOTAL</p>
                    <p className="text-lg font-mono font-black text-white">{src.length}</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-lg p-2.5">
                    <p className="text-[9px] text-zinc-500 uppercase font-black mb-0.5">DONE</p>
                    <p className="text-lg font-mono font-black text-green-500">{doneCnt}</p>
                  </div>
                </div>
              );
            })()}
            {/* 전체 모드 필터 */}
            {notesMode === "all" && (
              <div className="flex items-center gap-1 mt-2">
                {[
                  { id: "all", label: "전체" },
                  { id: "open", label: "미해결" },
                  { id: "done", label: "해결" },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setAllNotesFilter(f.id)}
                    className={`flex-1 px-2 py-1 text-[9px] font-semibold rounded transition-colors ${
                      allNotesFilter === f.id
                        ? "bg-white/10 text-zinc-200"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 custom-scrollbar">
            {notesMode === "page" ? (
              // ─── 이 페이지(현재 활성 버전) 노트 ───
              notes.length === 0 ? (
                <div className="text-center py-12 text-[11px] text-zinc-600 leading-relaxed">
                  이미지 위에서 마우스로 영역을<br/>드래그하면 피드백을 추가할 수 있습니다.
                </div>
              ) : notes.map((note, index) => (
                <div
                  key={note.id}
                  onMouseEnter={() => setHoveredNoteId(note.id)}
                  onMouseLeave={() => setHoveredNoteId(null)}
                  onClick={() => scrollToNote(note.id)}
                  className={`relative border p-3 rounded-lg transition-all bg-zinc-900/40 cursor-pointer group ${
                    activeHighlightId === note.id ? 'ring-1 ring-cyan-500/50 border-transparent bg-zinc-800/80' : 'border-white/5 hover:bg-zinc-800/40'
                  }`}
                >
                  <div className="flex justify-between mb-2 items-start">
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-black ${
                        note.resolved ? 'bg-green-500/20 text-green-500' : 'bg-red-500 text-white'
                      }`}>{index + 1}</div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleResolved(note.id); }}
                        className={`text-[9px] px-2 py-0.5 rounded border transition-all font-black uppercase ${
                          note.resolved ? 'bg-green-500/10 text-green-500 border-green-500/30'
                            : 'bg-zinc-900 text-zinc-500 border-zinc-700 hover:text-zinc-200'
                        }`}
                      >{note.resolved ? 'Done' : 'Review'}</button>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm('이 피드백을 삭제할까요?')) removeNote(note.id); }}
                      className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-opacity"
                      title="삭제"
                    ><X size={12} /></button>
                  </div>
                  <p
                    className={`text-[12px] leading-relaxed break-words whitespace-pre-wrap ${
                      note.resolved ? 'text-zinc-600 line-through opacity-60' : 'text-zinc-300'
                    }`}
                    style={{ fontFamily: "'Noto Sans KR', sans-serif" }}
                  >
                    {note.text}
                  </p>
                  {note.attachment && (
                    <img src={note.attachment} alt="" className="mt-2 w-full h-auto rounded border border-white/5" />
                  )}
                  <div className="mt-2 pt-2 border-t border-white/5 text-[9px] text-zinc-600 font-mono">{note.date}</div>
                </div>
              ))
            ) : (
              // ─── 전체 모드 — 프로젝트 모든 페이지/버전 노트 ───
              (() => {
                const list = (allNotes || []).filter(n =>
                  allNotesFilter === "open" ? !n.resolved :
                  allNotesFilter === "done" ? n.resolved : true
                );
                if (list.length === 0) {
                  return (
                    <div className="text-center py-12 text-[11px] text-zinc-600 leading-relaxed">
                      {allNotesFilter === "open" ? "미해결" : allNotesFilter === "done" ? "해결된" : ""} 수정사항이 없습니다.
                    </div>
                  );
                }
                return list.map((n) => {
                  const isCurrent = n.pageId === activePageId && n.versionId === activeVersionId;
                  const devColor = n.device === "mobile" ? "#FD79A8" : "#74B9FF";
                  return (
                    <div
                      key={`${n.versionId}_${n.id}`}
                      onClick={() => handleAllNoteClick(n)}
                      className={`relative border p-3 rounded-lg transition-all cursor-pointer group ${
                        isCurrent
                          ? "bg-cyan-500/5 border-cyan-500/30 hover:bg-cyan-500/10"
                          : "bg-zinc-900/40 border-white/5 hover:bg-zinc-800/40"
                      }`}
                    >
                      {/* 페이지/버전 라벨 */}
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold tabular-nums"
                          style={{ background: `${devColor}22`, color: devColor }}
                        >
                          {n.device === "mobile" ? "M" : "PC"} · P{n.pageNumber}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono ${
                          n.isLatestVersion ? "bg-violet-500/20 text-violet-300" : "bg-zinc-800 text-zinc-500"
                        }`}>
                          {n.versionLabel}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); onToggleNoteResolved?.(n.pageId, n.versionId, n.id); }}
                          title={n.resolved ? "다시 열기" : "수정 완료로 표시"}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border transition-colors ${
                            n.resolved
                              ? "bg-green-500/10 text-green-500 border-green-500/30 hover:bg-green-500/20"
                              : "bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25"
                          }`}
                        >
                          {n.resolved ? "Done" : "Open"}
                        </button>
                        {isCurrent && (
                          <span className="ml-auto text-[8px] text-cyan-400 font-mono">현재</span>
                        )}
                      </div>
                      <p
                        className={`text-[12px] leading-relaxed break-words whitespace-pre-wrap ${
                          n.resolved ? "text-zinc-600 line-through opacity-60" : "text-zinc-300"
                        }`}
                        style={{ fontFamily: "'Noto Sans KR', sans-serif" }}
                      >
                        {n.text}
                      </p>
                      {n.attachment && (
                        <img src={n.attachment} alt="" className="mt-2 w-full h-auto rounded border border-white/5" />
                      )}
                      <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[9px] text-zinc-600 font-mono">
                        <span className="truncate max-w-[180px]" title={n.pageName}>{n.pageName}</span>
                        <span>{n.date}</span>
                      </div>
                    </div>
                  );
                });
              })()
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
