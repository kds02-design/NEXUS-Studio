// 브랜드 웹 리뷰 — 컨펌·피드백 워크스페이스.
// 레퍼런스: C:\work\00_AI연습\05_스마트프로모션검색\app\my-design-app\src\components\modals\ConfirmWorkspace.jsx
// 단순화: 버전 히스토리/PC·모바일 토글/HTML 리포트 export 제거 → 핵심 워크플로우(영역 선택+피드백 노트)에 집중.
// 노트 저장은 props.notes / props.onNotesChange 로 부모(BrandWebReview)가 영구화 담당.
import { useRef, useState, useCallback } from "react";
import { Image as ImageIcon, CheckSquare, Lock, ChevronLeft, Sparkles, Smartphone, Monitor, Layers, Plus, X } from "lucide-react";

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
  device,           // "pc" | "mobile" — 썸네일 패널 헤더 표시
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

  const unresolvedCount = notes.filter(n => !n.resolved).length;
  const isConfirmDisabled = notes.length === 0 || unresolvedCount > 0;
  const activeHighlightId = editingNoteId || hoveredNoteId;

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
          <h2 className="text-[13px] font-bold text-white truncate">{title || '리뷰 항목'}</h2>
          {meta?.finalScore != null && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#df6a78]/15 border border-[#df6a78]/40 text-[#df6a78] tabular-nums shrink-0">
              점수 {meta.finalScore}
            </span>
          )}
          {/* 버전 탭 + 새 버전 업로드 */}
          {Array.isArray(versions) && versions.length > 0 && (
            <div className="flex items-center gap-1 shrink-0 ml-1">
              <Layers className="w-3 h-3 text-zinc-500 mr-0.5" />
              <div className="flex items-center gap-0.5 px-1 py-0.5 rounded-md bg-white/5 border border-white/10">
                {versions.map(v => {
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
              </div>
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
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[10px] font-bold transition-colors"
              >
                <Plus className="w-3 h-3" />
                새 버전
              </button>
            </div>
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
            <div className="shrink-0 px-3 py-2.5 border-b border-white/5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              {device === "mobile"
                ? <Smartphone className="w-3 h-3 text-[#FD79A8]" />
                : <Monitor className="w-3 h-3 text-[#74B9FF]" />}
              <span>{device === "mobile" ? "Mobile" : "PC"}</span>
              <span className="ml-auto text-zinc-600 font-mono">{pages.length}</span>
            </div>
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
                    <div className="relative shrink-0 w-[88px] aspect-[16/10] rounded-sm overflow-hidden bg-[#0c0c0e] border border-white/5">
                      {pg.thumbUrl ? (
                        <img src={pg.thumbUrl} alt={pg.name} className="w-full h-full object-cover" />
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
          <div className="min-h-full mx-auto py-10 px-10 relative flex justify-center items-start cursor-crosshair">
            <div className="relative shadow-2xl w-fit max-w-[1200px]">
              <img
                ref={imageRef}
                src={image}
                alt="Review canvas"
                className="block w-full h-auto border border-white/5 rounded-sm select-none"
                draggable={false}
              />

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

        {/* SIDE PANEL — 노트 리스트 */}
        <aside className="w-80 border-l border-white/5 bg-[#121214] flex flex-col shrink-0">
          <div className="p-5 border-b border-white/5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
                Design Review <Sparkles size={10} className="text-cyan-500" />
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-1">
              <div className="bg-white/5 border border-white/5 rounded-lg p-2.5">
                <p className="text-[9px] text-zinc-500 uppercase font-black mb-0.5">TOTAL</p>
                <p className="text-lg font-mono font-black text-white">{notes.length}</p>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-lg p-2.5">
                <p className="text-[9px] text-zinc-500 uppercase font-black mb-0.5">DONE</p>
                <p className="text-lg font-mono font-black text-green-500">{notes.filter(n => n.resolved).length}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 custom-scrollbar">
            {notes.length === 0 ? (
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
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
