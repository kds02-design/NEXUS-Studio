import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X, ChevronLeft, ChevronRight, Upload, ImageIcon, Trash2, CheckCircle2,
  FileText, Edit2, History, Monitor, Smartphone, Sparkles, CheckSquare, Lock
} from "lucide-react";

const ConfirmWorkspace = ({
  banner,
  initialHistory,
  onSaveNewVersion,
  onUpdate,
  onClose,
  isOpen
}) => {
  const [history, setHistory] = useState([]);
  const [currentVidx, setCurrentVidx] = useState(0);
  const [activeTab, setActiveTab] = useState('pc');
  const [isButtonUnlocked, setIsButtonUnlocked] = useState(false);

  const [isDrawing, setIsDrawing] = useState(false);
  const [selectionPx, setSelectionPx] = useState(null);
  const [comment, setComment] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [zoomedImage, setZoomedImage] = useState(null);

  const [editingNoteId, setEditingNoteId] = useState(null);
  const [hoveredNoteId, setHoveredNoteId] = useState(null);

  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const fileInputRef = useRef(null);
  const noteRefs = useRef({});

  useEffect(() => {
    if (banner && isOpen) {
      const baseData = (initialHistory && initialHistory.length > 0) ? initialHistory : [{
        version: 1, img: banner.full_image || banner.preview, mobile_img: banner.mobile_image || null,
        notes: [], date: new Date().toISOString()
      }];
      setHistory(baseData);
      setCurrentVidx(baseData.length - 1);
    }
  }, [isOpen, banner?.id]);

  useEffect(() => {
    if (attachedFile) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result);
      reader.readAsDataURL(attachedFile);
    } else setPreviewUrl(null);
  }, [attachedFile]);

  const scrollToNote = useCallback((noteId) => {
    const target = noteRefs.current[noteId];
    if (target && containerRef.current) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHoveredNoteId(noteId);
  }, []);

  if (!isOpen || !banner || history.length === 0) return null;

  const currentVersion = history[currentVidx] || history[history.length - 1];
  const currentImg = (activeTab === 'mobile' && currentVersion.mobile_img) ? currentVersion.mobile_img : currentVersion.img;
  const filteredNotes = (currentVersion.notes || []).filter(n => n.viewMode === activeTab || (activeTab === 'pc' && !n.viewMode));

  const unresolvedCount = filteredNotes.filter(n => !n.resolved).length;
  const isConfirmDisabled = filteredNotes.length === 0 || unresolvedCount > 0;
  const activeHighlightId = editingNoteId || hoveredNoteId;

  // ✨ 750px 센터 크롭 엔진
  const processMobileCrop = (src) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const targetWidth = 750;
        const targetHeight = img.naturalHeight;
        canvas.width = targetWidth; canvas.height = targetHeight;
        const startX = Math.max(0, (img.naturalWidth - targetWidth) / 2);
        ctx.drawImage(img, startX, 0, targetWidth, targetHeight, 0, 0, targetWidth, targetHeight);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.src = src;
    });
  };

  // 시안 삭제 기능
  const handleDeleteVersion = () => {
    if (currentVersion.version === 1) return alert("원본 시안은 삭제할 수 없습니다.");
    if (!window.confirm(`v${currentVersion.version}.0 시안을 삭제하시겠습니까?`)) return;
    const updatedHistory = history.filter((_, i) => i !== currentVidx);
    setHistory(updatedHistory);
    setCurrentVidx(Math.max(0, currentVidx - 1));
    onUpdate?.(updatedHistory);
  };

  const handleExportDocument = async () => {
    if (filteredNotes.length === 0) return alert("피드백이 없습니다.");
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const mainImg = new Image();
    mainImg.crossOrigin = "anonymous";
    mainImg.src = currentImg;
    await new Promise(r => mainImg.onload = r);

    const reportItems = filteredNotes.map((n, idx) => {
      const boxX = n.rect.x * mainImg.naturalWidth, boxY = n.rect.y * mainImg.naturalHeight;
      const boxW = n.rect.w * mainImg.naturalWidth, boxH = n.rect.h * mainImg.naturalHeight;
      const p = 100;
      const cX = Math.max(0, boxX - p), cY = Math.max(0, boxY - p);
      const cW = Math.min(mainImg.naturalWidth - cX, boxW + p * 2), cH = Math.min(mainImg.naturalHeight - cY, boxH + p * 2);
      canvas.width = cW; canvas.height = cH;
      ctx.drawImage(mainImg, cX, cY, cW, cH, 0, 0, cW, cH);
      const relX = boxX - cX, relY = boxY - cY;
      ctx.strokeStyle = n.resolved ? '#22c55e' : '#ef4444'; ctx.lineWidth = 4; ctx.strokeRect(relX, relY, boxW, boxH);
      ctx.fillStyle = n.resolved ? '#22c55e' : '#ef4444'; ctx.beginPath(); ctx.arc(relX, relY, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'white'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(idx + 1, relX, relY + 5);
      return { id: idx + 1, crop: canvas.toDataURL('image/jpeg', 0.9), text: n.text };
    });

    const win = window.open('', '_blank');
    win.document.write(`<html><body style="font-family:sans-serif; background:#f4f4f5; padding:40px;"><div style="max-width:800px; margin:0 auto; background:white; padding:40px; border-radius:16px;"><h1>${banner.title}</h1>${reportItems.map(it => `<div style="display:flex; gap:24px; border-top:1px solid #eee; padding-top:24px; margin-bottom:24px;"><img src="${it.crop}" style="width:50%; border-radius:8px;"/><p>${it.text}</p></div>`).join('')}</div></body></html>`);
    win.document.close();
  };

  const addFeedback = () => {
    if (!comment.trim() || !selectionPx || !imageRef.current) return;
    const rW = imageRef.current.offsetWidth, rH = imageRef.current.offsetHeight;
    const finalRect = { x: selectionPx.x / rW, y: selectionPx.y / rH, w: selectionPx.w / rW, h: selectionPx.h / rH };
    const newNote = { id: editingNoteId || Date.now(), rect: finalRect, text: comment, attachment: previewUrl, viewMode: activeTab, date: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }), resolved: false };
    const updatedNotes = editingNoteId ? currentVersion.notes.map(n => n.id === editingNoteId ? newNote : n) : [...(currentVersion.notes || []), newNote];
    const updatedHistory = history.map((v, i) => i === currentVidx ? { ...v, notes: updatedNotes } : v);
    setHistory(updatedHistory); onUpdate?.(updatedHistory);
    setSelectionPx(null); setComment(""); setAttachedFile(null); setEditingNoteId(null);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0c0c0e] flex flex-col animate-in fade-in duration-300 select-none overflow-hidden outline-none font-sans text-zinc-300">

      {/* HEADER */}
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#121214] z-[110] shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 transition-colors"><ChevronLeft size={24} /></button>
          <h2 className="text-sm font-bold text-white tracking-tight">{banner.title}</h2>
        </div>

        <div className="flex p-1 rounded-lg bg-black/40 border border-zinc-800">
          <button onClick={() => { setActiveTab('pc'); setSelectionPx(null); }} className={`flex items-center gap-2 px-5 py-1.5 rounded-md text-[11px] font-black transition-all ${activeTab === 'pc' ? 'bg-zinc-700 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}><Monitor size={14} /> PC</button>
          <button onClick={() => { setActiveTab('mobile'); setSelectionPx(null); }} className={`flex items-center gap-2 px-5 py-1.5 rounded-md text-[11px] font-black transition-all ${activeTab === 'mobile' ? 'bg-zinc-700 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}><Smartphone size={14} /> MOBILE</button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-black/40 p-1 rounded-lg border border-zinc-800 px-2 shadow-inner">
            <button disabled={currentVidx === 0} onClick={() => setCurrentVidx(v => v - 1)} className="p-1 disabled:opacity-20 text-zinc-400"><ChevronLeft size={16} /></button>
            <span className="text-[12px] font-black text-white px-1">v{currentVersion.version}.0</span>
            <button disabled={currentVidx === history.length - 1} onClick={() => setCurrentVidx(v => v + 1)} className="p-1 disabled:opacity-20 text-zinc-400"><ChevronRight size={16} /></button>
            {currentVersion.version > 1 && <button onClick={handleDeleteVersion} className="p-1 text-zinc-600 hover:text-red-500 border-l border-white/5 ml-1 transition-colors"><Trash2 size={14} /></button>}
          </div>

          {/* ✨ [수정] 최종 컨펌 버튼: 부모의 프리뷰 모달과 즉시 동기화 */}
          <button
            disabled={isConfirmDisabled}
            onClick={() => isButtonUnlocked ? onSaveNewVersion(history, currentVersion.img, currentVersion.mobile_img, true) : setIsButtonUnlocked(true)}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-black transition-all border 
              ${isConfirmDisabled ? 'bg-zinc-800 border-zinc-700 text-zinc-600 cursor-not-allowed'
                : isButtonUnlocked ? 'bg-violet-600 border-violet-500 text-white shadow-lg' : 'bg-violet-600/10 border-violet-500/20 text-violet-400 hover:bg-violet-600/20'}`}
          >
            {isConfirmDisabled ? <Lock size={14} /> : <CheckSquare size={14} />}
            {isConfirmDisabled ? "해결 필요" : isButtonUnlocked ? "승인 완료 (Sync)" : "최종 컨펌 승인"}
          </button>

          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-zinc-400"><X size={20} /></button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative bg-[#080809]">
        <div ref={containerRef} className="flex-1 overflow-auto relative cursor-crosshair scrollbar-hide touch-none"
          onPointerDown={(e) => {
            if (e.target.closest('.popover-input') || e.target.closest('button') || e.target.closest('aside')) return;
            const rect = imageRef.current.getBoundingClientRect();
            setSelectionPx({ x: e.clientX - rect.left, y: e.clientY - rect.top, startX: e.clientX - rect.left, startY: e.clientY - rect.top, w: 0, h: 0 });
            setEditingNoteId(null); setIsDrawing(true);
          }}
          onPointerMove={(e) => {
            if (!isDrawing || !selectionPx) return;
            const rect = imageRef.current.getBoundingClientRect();
            const curX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            const curY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
            setSelectionPx(p => ({ ...p, x: Math.min(curX, p.startX), y: Math.min(curY, p.startY), w: Math.abs(curX - p.startX), h: Math.abs(curY - p.startY) }));
          }}
          onPointerUp={() => setIsDrawing(false)}>

          <div className="min-h-full mx-auto py-24 px-24 relative flex justify-center items-start">
            <div className={`relative shadow-2xl transition-all duration-300 ${activeTab === 'mobile' ? 'w-[360px]' : 'w-fit max-w-[1200px]'}`}>
              <img ref={imageRef} src={currentImg} alt="Canvas" className="block w-full h-auto border border-white/5 rounded-sm" draggable={false} />

              {filteredNotes.map((note, idx) => {
                const isActive = note.id === activeHighlightId;
                return (
                  <div key={note.id} ref={el => noteRefs.current[note.id] = el} onMouseEnter={() => setHoveredNoteId(note.id)} onMouseLeave={() => setHoveredNoteId(null)}
                    /* ✨ 스포트라이트: 박스 내부 투명 유지 */
                    className={`absolute border-2 transition-all duration-300 rounded-sm ${isActive ? 'z-40 border-cyan-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.65),0_0_15px_rgba(34,211,238,0.5)]' : 'z-30 border-white/20'
                      }`}
                    style={{ left: `${note.rect.x * 100}%`, top: `${note.rect.y * 100}%`, width: `${note.rect.w * 100}%`, height: `${note.rect.h * 100}%` }}>
                    <div className={`absolute -top-3 -left-3 w-6 h-6 ${isActive ? 'bg-cyan-500 scale-110' : note.resolved ? 'bg-green-600' : 'bg-red-600'} text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg`}>{idx + 1}</div>
                    {(isActive && !editingNoteId) && (
                      <div className="absolute bottom-full left-0 mb-4 z-[100] min-w-[300px] max-w-[400px] bg-[#1a1a1e]/95 border border-cyan-500/30 p-5 rounded-lg shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-2">
                        <div className="absolute bottom-[-6px] left-4 w-3 h-3 bg-[#1a1a1e] border-r border-b border-cyan-500/30 rotate-45" />
                        <p className="text-[14px] text-zinc-100 leading-relaxed font-medium whitespace-pre-wrap">{note.text}</p>
                      </div>
                    )}
                  </div>
                );
              })}

              {selectionPx && <div className={`absolute border-2 border-dashed border-cyan-400 bg-cyan-400/10 z-[70] pointer-events-none rounded-sm`} style={{ left: selectionPx.x, top: selectionPx.y, width: selectionPx.w, height: selectionPx.h }} />}

              {selectionPx && !isDrawing && (
                <div className="absolute z-[80] popover-input animate-in zoom-in-95 origin-top" style={{ left: (imageRef.current.offsetWidth - (selectionPx.x + selectionPx.w) < 480) ? (selectionPx.x - 460) : (selectionPx.x + selectionPx.w + 15), top: selectionPx.y }}>
                  <div className="w-[450px] bg-[#1c1c1f] border border-zinc-700 rounded-lg shadow-[0_40px_80px_rgba(0,0,0,0.9)] p-6 backdrop-blur-3xl ring-1 ring-white/5">
                    <div className="flex justify-between items-center mb-4"><span className="text-[10px] text-cyan-400 font-black uppercase tracking-[0.2em]">Add Feedback</span><span className="text-[9px] text-zinc-500 font-mono uppercase">{activeTab}</span></div>
                    <textarea autoFocus className="w-full bg-black/40 border border-zinc-800 rounded-md p-5 text-[15px] text-white resize-none outline-none focus:border-cyan-500/40 shadow-inner" rows={5} value={comment} onChange={(e) => setComment(e.target.value)} />
                    <div className="mt-5 flex justify-between items-center popover-footer">
                      <button onClick={() => fileInputRef.current.click()} className="p-3 hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-white transition-all border border-zinc-800"><ImageIcon size={20} /><input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => setAttachedFile(e.target.files[0])} /></button>
                      <div className="flex gap-2"><button onClick={() => { setSelectionPx(null); setEditingNoteId(null); setComment(""); setAttachedFile(null); }} className="text-xs text-zinc-500 px-5 py-2 hover:text-white font-bold transition-colors">취소</button><button onClick={addFeedback} className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black px-8 py-2.5 rounded-md shadow-lg transition-all">등록하기</button></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="w-96 border-l border-white/5 bg-[#121214] flex flex-col shrink-0 z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.3)]">
          <div className="p-6 border-b border-white/5 bg-gradient-to-b from-zinc-900/50 to-transparent">
            <div className="flex items-center justify-between mb-4"><h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] flex items-center gap-2">Design Review <Sparkles size={10} className="text-cyan-500 animate-pulse" /></h3><span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-md border border-cyan-500/20 font-bold tracking-tighter uppercase">v{currentVersion.version}.0</span></div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/5 border border-white/5 rounded-lg p-3 shadow-inner"><p className="text-[9px] text-zinc-500 uppercase font-black mb-1">TOTAL</p><p className="text-xl font-mono font-black text-white">{filteredNotes.length}</p></div>
              <div className="bg-white/5 border border-white/5 rounded-lg p-3 shadow-inner"><p className="text-[9px] text-zinc-500 uppercase font-black mb-1">DONE</p><p className="text-xl font-mono font-black text-green-500">{filteredNotes.filter(n => n.resolved).length}</p></div>
            </div>

            {/* ✨ 업로드 핸들러: 현재 탭에 맞춰 데이터 분류 및 즉시 동기화 */}
            <div className="mb-4">
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-zinc-800 hover:border-cyan-500/40 bg-black/20 hover:bg-cyan-500/5 rounded-lg cursor-pointer transition-all group">
                <Upload size={20} className="text-zinc-500 group-hover:text-cyan-400 mb-2" />
                <p className="text-[10px] font-bold text-zinc-500 group-hover:text-cyan-200 uppercase tracking-tighter">새 {activeTab.toUpperCase()} 시안 업로드</p>
                <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                      let finalImg = ev.target.result;
                      // 모바일 탭이면 750px 크롭 수행
                      if (activeTab === 'mobile') finalImg = await processMobileCrop(finalImg);

                      const nextVer = history.length + 1;
                      const newVersion = {
                        version: nextVer,
                        img: activeTab === 'pc' ? finalImg : currentVersion.img,
                        mobile_img: activeTab === 'mobile' ? finalImg : currentVersion.mobile_img,
                        notes: [], date: new Date().toISOString()
                      };
                      const updatedHistory = [...history, newVersion];
                      setHistory(updatedHistory);
                      setCurrentVidx(updatedHistory.length - 1);
                      // 최종 반영된 PC 이미지와 모바일 이미지를 각각 추출해서 부모로 전달합니다.
                      const latestVersion = updatedHistory[updatedHistory.length - 1];
                      onSaveNewVersion?.(updatedHistory, latestVersion.img, latestVersion.mobile_img, false);
                    };
                    reader.readAsDataURL(file);
                  }
                }} />
              </label>
            </div>
            <button onClick={handleExportDocument} className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-black border border-white/5 shadow-md active:scale-95 transition-all"><FileText size={14} className="text-zinc-500" /> 가이드 리포트 생성</button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 pb-10 space-y-4 scrollbar-hide mt-4">
            {filteredNotes.map((note, index) => (
              <div key={note.id} onMouseEnter={() => setHoveredNoteId(note.id)} onMouseLeave={() => setHoveredNoteId(null)} onClick={() => scrollToNote(note.id)}
                className={`note-item relative border p-6 rounded-lg transition-all duration-300 bg-zinc-900/40 cursor-pointer group/item ${(activeHighlightId === note.id) ? 'ring-1 ring-cyan-500/50 border-transparent bg-zinc-800/80 shadow-2xl translate-x-1' : 'border-white/5 shadow-sm hover:bg-zinc-800/40'}`}>
                <div className="flex justify-between mb-4 items-start relative">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black shadow-inner ${note.resolved ? 'bg-green-500/20 text-green-500' : 'bg-red-500 text-white'}`}>{index + 1}</div>
                    <button onClick={(e) => {
                      e.stopPropagation();
                      const updated = currentVersion.notes.map(n => n.id === note.id ? { ...n, resolved: !n.resolved } : n);
                      const updatedHistory = history.map((v, i) => i === currentVidx ? { ...v, notes: updated } : v);
                      setHistory(updatedHistory); onUpdate?.(updatedHistory);
                    }} className={`text-[9px] px-3 py-1 rounded-lg border transition-all font-black uppercase ${note.resolved ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-zinc-900 text-zinc-500 border-zinc-700 hover:text-zinc-200'}`}> {note.resolved ? 'Done' : 'Review'}</button>
                  </div>
                </div>
                <p className={`text-[14px] leading-relaxed break-words whitespace-pre-wrap font-medium transition-colors ${note.resolved ? 'text-zinc-600 line-through opacity-50' : 'text-zinc-300'}`}>{note.text}</p>
                {note.attachment && (<div className="mt-4 rounded-lg overflow-hidden border border-white/5" onClick={(e) => { e.stopPropagation(); setZoomedImage(note.attachment); }}><img src={note.attachment} alt="Attachment" className="block w-full h-auto" /></div>)}
                <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center"><span className="text-[9px] text-zinc-700 font-mono tracking-tight">{note.date}</span></div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ConfirmWorkspace;