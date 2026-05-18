import { useState, useEffect, useMemo, useRef } from "react";
import {
  X, Copy, Trash2, Edit2, Heart, Star, Check, ChevronLeft, ChevronRight,
  Play, Folder, FolderPlus, Plus, Type, Box, Video, MoreHorizontal,
  Link2, Search, Download,
} from "lucide-react";
import { APP_MAP } from "../../../config/apps";
import { STYLE_FILTERS, matchesFilter, inferRelatedType } from "../constants/categories";
import { PromptImage } from "./ArcCard";

const TYPE_BADGE_COLOR = {
  '2D': 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
  '3D/렌더링': 'bg-violet-500/15 border-violet-500/30 text-violet-300',
  '모션': 'bg-rose-500/15 border-rose-500/30 text-rose-300',
  '기타': 'bg-zinc-500/15 border-zinc-500/30 text-zinc-300',
};

const copyToClipboard = async (text, onSuccess) => {
  try { await navigator.clipboard.writeText(text); onSuccess?.(); }
  catch {
    const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t);
    t.select(); document.execCommand('copy'); document.body.removeChild(t); onSuccess?.();
  }
};

export default function ArcDetailModal({
  prompt, onClose, onEdit, onDelete, onLike, onPin, onLive, onFavorite,
  isLiked, isFavorite, onSendToApp, folders, onToggleFolderItem, onCreateFolder,
  showToast, currentUserId, isAdmin = false,
  allPrompts = [], onLinkRelated, onUnlinkRelated, onOpenRelated,
}) {
  const images = prompt.images?.length ? prompt.images : (prompt.image ? [prompt.image] : []);
  const videoUrl = Array.isArray(prompt.videos) && typeof prompt.videos[0] === 'string' ? prompt.videos[0] : null;
  const mediaTabs = [
    ...(videoUrl ? [{ type: 'video', src: videoUrl }] : []),
    ...images.map(src => ({ type: 'image', src })),
  ];
  const [mediaIdx, setMediaIdx] = useState(0);
  const activeMedia = mediaTabs[mediaIdx] || null;
  const mainIdx = activeMedia?.type === 'image' ? (mediaIdx - (videoUrl ? 1 : 0)) : 0;
  const [copied, setCopied] = useState(false);
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const folderMenuRef = useRef(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const actionMenuRef = useRef(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [panPos, setPanPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => { setZoomScale(1); setPanPos({ x: 0, y: 0 }); }, [mediaIdx]);

  // 이미지 저장 — Cloudinary 등 CORS 가 허용되면 blob 다운로드, 막히면 새 탭으로 폴백.
  const handleDownload = async () => {
    if (activeMedia?.type !== 'image' || !activeMedia.src) return;
    const url = activeMedia.src;
    const base = (prompt.title || 'image').replace(/[\\/:*?"<>|]/g, '_');
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const ext = (blob.type.split('/')[1] || url.split('.').pop() || 'png').replace('+xml', '').split('?')[0];
      const obj = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = obj; a.download = `${base}.${ext}`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(obj);
      showToast?.('이미지를 저장했습니다.');
    } catch {
      // CORS 차단 시 새 탭으로 이동 → 사용자가 우클릭 저장 가능
      window.open(url, '_blank', 'noopener');
      showToast?.('이미지 새 탭에서 열림 — 우클릭하여 저장하세요.');
    }
  };

  const handleZoomWheel = (e) => { const adj = e.deltaY * -0.001; setZoomScale((prev) => Math.min(Math.max(1, prev + adj), 5)); };
  const handleZoomMouseDown = (e) => { if (zoomScale <= 1) return; e.preventDefault(); setIsDragging(true); setDragStart({ x: e.clientX - panPos.x, y: e.clientY - panPos.y }); };
  const handleZoomMouseMove = (e) => { if (!isDragging) return; setPanPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); };
  const handleZoomMouseUp = () => setIsDragging(false);

  const isAuthor = (prompt.ownerUid && prompt.ownerUid === currentUserId) || (!prompt.ownerUid && (!prompt.authorId || prompt.authorId === currentUserId));
  // 관리자는 모든 프롬프트를 수정/삭제할 수 있음
  const canEdit = isAuthor || isAdmin;
  const inAnyFolder = (folders || []).some(f => (f.items || []).includes(prompt.id));

  useEffect(() => {
    if (!folderMenuOpen) return;
    const onDocClick = (e) => { if (folderMenuRef.current && !folderMenuRef.current.contains(e.target)) setFolderMenuOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [folderMenuOpen]);

  useEffect(() => {
    if (!actionMenuOpen) return;
    const onDocClick = (e) => { if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) setActionMenuOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [actionMenuOpen]);

  const currentPrompt = prompt.stepPrompts?.[mainIdx] || prompt.content || '';
  const currentTags = Array.isArray(prompt.stepTags?.[mainIdx]) ? prompt.stepTags[mainIdx] : (prompt.tags || []);
  const currentDesc = prompt.stepDescriptions?.[mainIdx] || prompt.description || '';
  const currentKws = (prompt.stepKeywords?.[mainIdx] || prompt.aiKeywords || '').split(',').map(k => k.trim()).filter(Boolean);

  const detectedStyles = useMemo(() => {
    const out = new Set();
    for (const f of STYLE_FILTERS) {
      if (matchesFilter(prompt, f)) out.add(f.id);
    }
    return out;
  }, [prompt]);

  const sendTargets = useMemo(() => {
    const list = [
      { id: 'typecore-sovereign', label: '타이프코어 소버린으로 편집', icon: <Type size={13} /> },
    ];
    if (detectedStyles.has('2d_bw') || detectedStyles.has('calligraphy')) {
      list.push({ id: 'render-metrics', label: '렌더 메트릭스로 입체화', icon: <Box size={13} /> });
    }
    if (detectedStyles.has('3d_render')) {
      list.push({ id: 'motion-metrics', label: '모션 메트릭스로 애니메이션', icon: <Video size={13} /> });
    }
    list.push({ id: 'design-eval', label: '디자인 평가도구로 평가', icon: <Star size={13} /> });
    return list;
  }, [detectedStyles]);

  const cleanTags = currentTags.filter(t => t && typeof t === 'string');
  const cleanKws = currentKws.filter(Boolean);

  // ─── 연관 아이템 ───────────────────────────────────────────────
  const relatedIds = Array.isArray(prompt.relatedIds) ? prompt.relatedIds : [];
  const promptsById = useMemo(() => {
    const m = new Map();
    for (const p of allPrompts) m.set(p.id, p);
    return m;
  }, [allPrompts]);
  const relatedItems = useMemo(
    () => relatedIds.map(id => promptsById.get(id)).filter(Boolean),
    [relatedIds, promptsById]
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const pickerRef = useRef(null);
  useEffect(() => {
    if (!pickerOpen) return;
    const onDocClick = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [pickerOpen]);
  const pickerResults = useMemo(() => {
    if (!pickerOpen) return [];
    const q = pickerQuery.trim().toLowerCase();
    const exclude = new Set([prompt.id, ...relatedIds]);
    let pool = allPrompts.filter(p => !exclude.has(p.id));
    if (q) {
      pool = pool.filter(p => {
        const hay = [(p.title || ''), (p.aiKeywords || ''), ...(p.tags || [])].join(' ').toLowerCase();
        return hay.includes(q);
      });
    }
    return pool.slice(0, 30);
  }, [pickerOpen, pickerQuery, allPrompts, prompt.id, relatedIds]);

  const handleAddRelated = async (targetId) => {
    if (!onLinkRelated) return;
    try {
      await onLinkRelated(prompt.id, targetId);
      setPickerQuery('');
      showToast?.('연결됐어요.');
    } catch (e) {
      console.error('[PromptArc] add related failed', e);
      showToast?.(`연결 실패: ${e.message || e}`, 'error');
    }
  };
  const handleRemoveRelated = async (targetId) => {
    if (!onUnlinkRelated) return;
    try {
      await onUnlinkRelated(prompt.id, targetId);
      showToast?.('연결을 해제했어요.');
    } catch (e) {
      console.error('[PromptArc] remove related failed', e);
      showToast?.(`해제 실패: ${e.message || e}`, 'error');
    }
  };

  return (
    <div className="fixed top-[52px] left-0 right-0 bottom-0 z-[2000] flex items-center justify-center p-6 sm:p-10 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <button onClick={onClose} className="absolute top-6 right-6 sm:top-8 sm:right-8 p-2.5 rounded-full transition-colors z-[2010] border bg-[#1a1a1a] border-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white shadow-lg">
        <X className="w-5 h-5" />
      </button>
      <div className="w-full max-w-5xl h-[90vh] bg-[#111] rounded-2xl border border-white/10 flex overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Left: media */}
        <div className="w-[60%] bg-[#050505] relative flex flex-col">
          {activeMedia?.type === 'image' && (
            <div className="absolute top-4 left-4 z-[20]">
              <button onClick={handleDownload}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-bold border bg-black/50 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 backdrop-blur-md transition-all">
                <Download className="w-3.5 h-3.5" /> 이미지 저장
              </button>
            </div>
          )}
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden"
            onWheel={activeMedia?.type === 'image' ? handleZoomWheel : undefined}
            onMouseDown={activeMedia?.type === 'image' ? handleZoomMouseDown : undefined}
            onMouseMove={activeMedia?.type === 'image' ? handleZoomMouseMove : undefined}
            onMouseUp={activeMedia?.type === 'image' ? handleZoomMouseUp : undefined}
            onMouseLeave={activeMedia?.type === 'image' ? handleZoomMouseUp : undefined}
          >
            {activeMedia?.type === 'video' ? (
              <video src={activeMedia.src} controls playsInline preload="metadata" className="max-w-full max-h-full bg-black rounded" />
            ) : (
              <img src={activeMedia?.src} alt=""
                style={{
                  transform: `translate(${panPos.x}px, ${panPos.y}px) scale(${zoomScale})`,
                  cursor: zoomScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                }}
                className="max-w-full max-h-full object-scale-down select-none"
                onDragStart={(e) => e.preventDefault()}
              />
            )}
          </div>
          {activeMedia?.type === 'image' && (
            <div className="absolute bottom-4 right-4 flex items-center gap-2 z-[20] px-2.5 py-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-full shadow-lg" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
              <span className="text-[11px] font-bold text-white w-9 text-center tabular-nums shrink-0">{Math.round(zoomScale * 100)}%</span>
              <div className="relative flex items-center w-[100px] md:w-[120px] h-11" style={{ touchAction: 'none' }}>
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[5px] bg-white/15 rounded-full pointer-events-none"></div>
                <input type="range" min="1" max="5" step="0.1" value={zoomScale} onChange={(e) => setZoomScale(parseFloat(e.target.value))} onWheel={(e) => { e.stopPropagation(); const adj = e.deltaY * -0.002; setZoomScale((prev) => Math.min(Math.max(1, prev + adj), 5)); }} style={{ touchAction: 'none' }} className="w-full h-full bg-transparent appearance-none cursor-pointer outline-none relative z-10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-11 [&::-webkit-slider-thumb]:h-11 [&::-webkit-slider-thumb]:bg-[#7895c2] [&::-webkit-slider-thumb]:bg-clip-content [&::-webkit-slider-thumb]:p-[10px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-grab active:[&::-webkit-slider-thumb]:cursor-grabbing active:[&::-webkit-slider-thumb]:scale-110 [&::-moz-range-thumb]:w-11 [&::-moz-range-thumb]:h-11 [&::-moz-range-thumb]:bg-[#7895c2] [&::-moz-range-thumb]:bg-clip-content [&::-moz-range-thumb]:p-[10px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:shadow-lg active:[&::-moz-range-thumb]:scale-110 transition-transform" />
              </div>
            </div>
          )}
          {mediaTabs.length > 1 && (
            <>
              <button onClick={() => setMediaIdx(p => p > 0 ? p - 1 : mediaTabs.length - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 text-white rounded-full hover:bg-black/70"><ChevronLeft size={18} /></button>
              <button onClick={() => setMediaIdx(p => p < mediaTabs.length - 1 ? p + 1 : 0)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 text-white rounded-full hover:bg-black/70"><ChevronRight size={18} /></button>
              <div className="absolute bottom-4 left-4 flex gap-2">
                {mediaTabs.map((m, idx) => (
                  <div key={idx} onClick={() => setMediaIdx(idx)} className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 cursor-pointer ${idx === mediaIdx ? 'border-[#C8A969]' : 'border-transparent hover:border-white/30'}`}>
                    {m.type === 'video' ? (
                      <>
                        <video src={m.src} muted playsInline preload="metadata" className="w-full h-full object-cover bg-black" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
                          <Play size={14} className="text-white" fill="currentColor" />
                        </div>
                      </>
                    ) : (
                      <img src={m.src} className="w-full h-full object-cover" alt="" />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        {/* Right: info */}
        <div className="flex-1 flex flex-col bg-[#111] relative">
          <div className="p-5 border-b border-white/5">
            <div className="text-base font-bold text-zinc-200 mb-1">{prompt.title || 'Untitled'}</div>
            <div className="flex items-center gap-2 mt-3">
              {canEdit && <>
                <button onClick={() => onDelete(prompt.id)} className="p-2 rounded-full bg-white/5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10" title={isAuthor ? '삭제' : '관리자 권한으로 삭제'}><Trash2 size={13} /></button>
                <button onClick={() => onEdit(mainIdx)} className="p-2 rounded-full bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10" title={isAuthor ? '수정' : '관리자 권한으로 수정'}><Edit2 size={13} /></button>
                <button
                  onClick={() => onLive && onLive(prompt.id, prompt.isLive)}
                  className={`px-2.5 py-1.5 rounded-full text-[10px] font-bold tracking-wider transition-colors ${prompt.isLive ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-white/5 text-zinc-500 hover:text-rose-300 border border-transparent'}`}
                  title={prompt.isLive ? 'LIVE 해제' : 'LIVE 표시'}
                >LIVE</button>
                <button
                  onClick={() => onPin && onPin(prompt.id, prompt.isPinned)}
                  className={`px-2.5 py-1.5 rounded-full text-[10px] font-bold tracking-wider transition-colors flex items-center gap-1 ${prompt.isPinned ? 'bg-[#C8A969]/20 text-[#C8A969] border border-[#C8A969]/40' : 'bg-white/5 text-zinc-500 hover:text-[#C8A969] border border-transparent'}`}
                  title={prompt.isPinned ? '추천 해제' : '추천 고정'}
                >
                  <Star size={11} fill={prompt.isPinned ? 'currentColor' : 'none'} /> 추천
                </button>
              </>}
              <button onClick={() => onLike(prompt.id, isLiked)} className={`flex items-center gap-1 p-2 rounded-full bg-white/5 text-xs ${isLiked ? 'text-rose-400' : 'text-zinc-400 hover:text-white'}`} title="좋아요">
                <Heart size={13} fill={isLiked ? 'currentColor' : 'none'} /> {prompt.likeCount || 0}
              </button>
              <button onClick={() => onFavorite && onFavorite(prompt.id)} className={`flex items-center gap-1 p-2 rounded-full bg-white/5 text-xs ${isFavorite ? 'text-[#C8A969]' : 'text-zinc-400 hover:text-white'}`} title="즐겨찾기 (개인)">
                <Star size={13} fill={isFavorite ? 'currentColor' : 'none'} />
              </button>
              <div className="relative" ref={folderMenuRef}>
                <button onClick={() => setFolderMenuOpen(v => !v)}
                  className={`flex items-center gap-1 p-2 rounded-full bg-white/5 text-xs ${inAnyFolder ? 'text-[#C8A969]' : 'text-zinc-400 hover:text-white'}`}
                  title="내 폴더에 저장"
                ><FolderPlus size={13} /> 내 폴더</button>
                {folderMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-[#181818] border border-white/10 rounded-xl shadow-2xl p-2 z-[120]">
                    <div className="px-2 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">내 폴더에 저장</div>
                    <div className="max-h-56 overflow-y-auto arc-scrollbar">
                      {(folders || []).length === 0 ? (
                        <div className="px-3 py-3 text-[11px] text-zinc-500 text-center">아직 폴더가 없어요</div>
                      ) : (
                        folders.map(f => {
                          const checked = (f.items || []).includes(prompt.id);
                          return (
                            <button key={f.id}
                              onClick={() => onToggleFolderItem && onToggleFolderItem(f.id, prompt.id)}
                              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left hover:bg-white/5 ${checked ? 'text-[#C8A969]' : 'text-zinc-300'}`}
                            >
                              <span className={`w-4 h-4 inline-flex items-center justify-center rounded border ${checked ? 'border-[#C8A969] bg-[#C8A969]/10' : 'border-white/20'}`}>
                                {checked && <Check size={10} />}
                              </span>
                              <Folder size={12} className="text-zinc-500" />
                              <span className="flex-1 truncate">{f.name}</span>
                              <span className="text-[9px] text-zinc-600">{(f.items || []).length}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                    <div className="border-t border-white/5 mt-1 pt-2 px-1 flex items-center gap-1">
                      <input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter' && newFolderName.trim()) {
                            await onCreateFolder?.(newFolderName.trim());
                            setNewFolderName('');
                          }
                        }}
                        placeholder="+ 새 폴더"
                        className="flex-1 bg-[#0A0A0A] border border-white/5 rounded px-2 py-1 text-[11px] text-white outline-none focus:border-[#C8A969]"
                      />
                      <button onClick={async () => { if (newFolderName.trim()) { await onCreateFolder?.(newFolderName.trim()); setNewFolderName(''); } }}
                        className="p-1.5 text-zinc-500 hover:text-[#C8A969] rounded"
                      ><Plus size={12} /></button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-5 arc-scrollbar space-y-4">
            {(cleanTags.length > 0 || cleanKws.length > 0) && (
              <div className="space-y-2">
                {cleanTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {cleanTags.map((t, i) => (
                      <span key={i} className="px-2.5 py-1 bg-[#C8A969]/15 border border-[#C8A969]/30 text-[#C8A969] text-[10px] font-bold rounded-md">#{t}</span>
                    ))}
                  </div>
                )}
                {cleanKws.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {cleanKws.map((k, i) => (
                      <span key={`k${i}`} className="px-2 py-0.5 border border-white/10 text-zinc-500 text-[9px] rounded">{k}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {currentDesc && <p className="text-[11px] text-zinc-400 leading-relaxed">{currentDesc}</p>}

            {/* ─── 연관 아이템 섹션 ─── */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-zinc-500">
                  <Link2 size={11} className="text-[#C8A969]" /> 연관 아이템
                  {relatedItems.length > 0 && <span className="text-[#C8A969]">{relatedItems.length}</span>}
                </div>
                {canEdit && (
                  <div className="relative" ref={pickerRef}>
                    <button onClick={() => setPickerOpen(v => !v)}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5">
                      <Plus size={11} /> 연관 아이템 추가
                    </button>
                    {pickerOpen && (
                      <div className="absolute right-0 top-full mt-2 w-72 bg-[#181818] border border-white/10 rounded-xl shadow-2xl z-[160] overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
                          <Search size={12} className="text-zinc-500" />
                          <input autoFocus value={pickerQuery} onChange={e => setPickerQuery(e.target.value)}
                            placeholder="제목·태그·키워드 검색" className="flex-1 bg-transparent outline-none text-[12px] text-white placeholder:text-zinc-600" />
                        </div>
                        <div className="max-h-72 overflow-y-auto arc-scrollbar">
                          {pickerResults.length === 0 ? (
                            <div className="px-3 py-4 text-[11px] text-zinc-500 text-center">{pickerQuery ? '결과가 없어요' : '검색어를 입력하세요'}</div>
                          ) : pickerResults.map(p => {
                            const t = p.type || inferRelatedType(p);
                            const thumb = p.thumbnail || p.images?.[0];
                            return (
                              <button key={p.id} onClick={() => handleAddRelated(p.id)}
                                className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-white/5">
                                <PromptImage src={thumb} alt={p.title} className="w-9 h-9 rounded object-cover bg-zinc-900 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-[12px] text-zinc-200 truncate">{p.title || 'Untitled'}</div>
                                  <span className={`inline-block mt-0.5 px-1 py-0.5 text-[8px] font-bold rounded border ${TYPE_BADGE_COLOR[t] || TYPE_BADGE_COLOR['기타']}`}>{t}</span>
                                </div>
                                <Plus size={11} className="text-zinc-500" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {relatedItems.length === 0 ? (
                <div className="px-3 py-4 rounded-lg border border-dashed border-white/5 text-[11px] text-zinc-600 text-center">
                  연관 아이템이 없어요.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {relatedItems.map(rel => {
                    const t = rel.type || inferRelatedType(rel);
                    const thumb = rel.thumbnail || rel.images?.[0];
                    return (
                      <div key={rel.id} className="group relative rounded-lg overflow-hidden border border-white/5 hover:border-[#C8A969]/40 bg-[#0A0A0A] cursor-pointer"
                        onClick={() => onOpenRelated && onOpenRelated(rel)}>
                        <div className="aspect-square w-full">
                          <PromptImage src={thumb} alt={rel.title} className="w-full h-full object-cover bg-zinc-900" />
                        </div>
                        <div className={`absolute top-1 left-1 px-1 py-0.5 text-[8px] font-bold rounded border ${TYPE_BADGE_COLOR[t] || TYPE_BADGE_COLOR['기타']}`}>{t}</div>
                        {canEdit && (
                          <button onClick={(e) => { e.stopPropagation(); handleRemoveRelated(rel.id); }}
                            className="absolute top-1 right-1 p-1 rounded bg-black/70 text-zinc-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="연결 해제"><X size={10} /></button>
                        )}
                        <div className="px-2 py-1.5 text-[10px] text-zinc-300 truncate bg-black/40">{rel.title || 'Untitled'}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* ─── /연관 아이템 섹션 ─── */}
            {images.length > 1 && activeMedia?.type === 'image' && (
              <div className="flex gap-2 overflow-x-auto arc-scrollbar pb-1">
                {images.map((_, idx) => (
                  <button key={idx} onClick={() => setMediaIdx(idx + (videoUrl ? 1 : 0))}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap border ${idx === mainIdx ? 'bg-[#C8A969]/20 text-[#C8A969] border-[#C8A969]/40' : 'bg-white/5 text-zinc-500 border-white/5 hover:border-white/20'}`}>
                    Step {idx + 1}
                  </button>
                ))}
              </div>
            )}
            {currentPrompt && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-mono font-bold text-zinc-500">&gt;_ FINAL PROMPT{images.length > 1 ? ` (Step ${mainIdx + 1})` : ''}</span>
                  <button onClick={() => copyToClipboard(currentPrompt, () => { setCopied(true); setTimeout(() => setCopied(false), 2000); showToast('복사됐어요!'); })}
                    className="px-3 py-1 text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[10px] font-bold flex items-center gap-1">
                    {copied ? <><Check size={10} />Copied!</> : <><Copy size={10} />복사</>}
                  </button>
                </div>
                <div className="bg-[#0A0A0A] border border-white/5 rounded-lg p-4">
                  <pre className="text-[11px] text-zinc-300 font-mono whitespace-pre-wrap break-words leading-relaxed">{currentPrompt}</pre>
                </div>
              </div>
            )}
          </div>
          <div ref={actionMenuRef} className="absolute right-6 bottom-6 z-[600]">
            <button onClick={() => setActionMenuOpen(v => !v)}
              className={`p-3 rounded-2xl transition-colors shadow-lg border ${actionMenuOpen ? 'bg-zinc-800 border-zinc-700' : 'bg-[#1c1c1e]/80 backdrop-blur border-transparent hover:border-white/10 text-zinc-400 hover:bg-white/10 hover:text-zinc-200'}`}
              title="이 프롬프트로 이어서 작업"
            ><MoreHorizontal className="w-5 h-5" /></button>
            {actionMenuOpen && (
              <div className="absolute bottom-full right-0 mb-4 w-[210px] rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-bottom-2 border bg-[#1c1c1e] border-white/5">
                {sendTargets.map(t => {
                  const isDisabled = !!APP_MAP[t.id]?.disabled;
                  return (
                    <button key={t.id} disabled={isDisabled}
                      onClick={() => {
                        if (isDisabled) return;
                        setActionMenuOpen(false);
                        const currentImageUrl = activeMedia?.type === 'image'
                          ? activeMedia.src
                          : (prompt.thumbnail || prompt.images?.[0] || '');
                        const enriched = {
                          ...prompt,
                          content: currentPrompt || prompt.content || '',
                          thumbnail: currentImageUrl,
                          images: currentImageUrl ? [currentImageUrl, ...(prompt.images || []).slice(1)] : (prompt.images || []),
                        };
                        onSendToApp(t.id, enriched);
                        onClose();
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-xl transition-colors text-left ${isDisabled ? 'text-zinc-600 cursor-not-allowed opacity-50' : 'text-[#a1a1aa] hover:bg-white/5 hover:text-white'}`}
                      title={isDisabled ? '준비 중인 앱입니다' : undefined}
                    >
                      <span className="shrink-0" style={{ color: APP_MAP[t.id]?.color }}>{t.icon}</span>
                      <span className="leading-snug flex-1">{t.label}</span>
                      {isDisabled && <span className="text-[8px] font-bold tracking-wider text-zinc-600 uppercase">준비중</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
