import { useState, useEffect, useMemo } from "react";
import {
  X, Copy, Check, Plus, Loader2, Sparkles, Image as ImageIcon,
  ChevronLeft, ChevronRight, Film, Star,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { isVideoFile, VIDEO_MAX_BYTES, VIDEO_ACCEPT } from "../../../lib/storage";
import { ARC_CATEGORIES } from "../constants/categories";
import { processMultipleFiles } from "../services/cloudinary";
import { analyzeWithGemini } from "../services/gemini";
import { PromptImage } from "./ArcCard";

const copyToClipboard = async (text, onSuccess) => {
  try { await navigator.clipboard.writeText(text); onSuccess?.(); }
  catch {
    const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t);
    t.select(); document.execCommand('copy'); document.body.removeChild(t); onSuccess?.();
  }
};

export default function ArcEditModal({ initialData, onSave, onClose, showToast, isSaving }) {
  const { user, isAdmin } = useAuth();
  const currentUid = user?.uid || null;
  const ownerUid = initialData?.ownerUid || initialData?.authorId || null;
  const isAuthor = !ownerUid || (currentUid && currentUid === ownerUid);
  const canModerate = isAdmin || isAuthor;
  const initImages = initialData?.images?.length ? [...initialData.images] : (initialData?.image ? [initialData.image] : []);
  const initSP = initialData?.stepPrompts?.length ? [...initialData.stepPrompts] : [initialData?.content || ''];
  const initST = initialData?.stepTags?.length ? [...initialData.stepTags] : initImages.map(() => initialData?.tags || ['기타']);
  const initSK = initialData?.stepKeywords?.length ? [...initialData.stepKeywords] : initImages.map(() => '');
  const initSD = initialData?.stepDescriptions?.length ? [...initialData.stepDescriptions] : initImages.map(() => '');
  const initSL = initialData?.stepLabels?.length ? [...initialData.stepLabels] : initImages.map(() => '');
  const initVideos = Array.isArray(initialData?.videos) ? [...initialData.videos] : [];

  const initType = initialData?.type || (initVideos.length > 0 && initImages.length === 0 ? 'video' : 'image');
  const [data, setData] = useState({ ...initialData, type: initType, images: initImages, videos: initVideos, stepPrompts: initSP, stepTags: initST, stepKeywords: initSK, stepDescriptions: initSD, stepLabels: initSL });
  const [mainIdx, setMainIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [_isDragImg, setIsDragImg] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

  const videoPreviews = useMemo(() => {
    return (data.videos || []).map(v => (v instanceof File) ? URL.createObjectURL(v) : v);
  }, [data.videos]);
  useEffect(() => {
    return () => { videoPreviews.forEach(u => { if (u?.startsWith?.('blob:')) URL.revokeObjectURL(u); }); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVideoFiles = (files) => {
    const arr = Array.from(files || []);
    if (arr.length === 0) return;
    if ((data.videos || []).length >= 1) { showToast?.('영상은 1개까지만 첨부할 수 있어요', 'error'); return; }
    const file = arr[0];
    if (!isVideoFile(file)) { showToast?.('지원하지 않는 영상 형식이에요 (mp4, webm, mov만 가능)', 'error'); return; }
    if (file.size > VIDEO_MAX_BYTES) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      showToast?.(`영상은 50MB 이하만 가능해요 (현재 ${mb}MB)`, 'error');
      return;
    }
    setData(prev => ({ ...prev, videos: [...(prev.videos || []), file] }));
  };

  const handleRemoveVideo = (idx) => {
    setData(prev => {
      const next = [...(prev.videos || [])];
      next.splice(idx, 1);
      return { ...prev, videos: next };
    });
  };

  const handleTabChange = (idx) => { setMainIdx(idx); setData(p => ({ ...p, content: p.stepPrompts?.[idx] || '' })); };

  const toggleTag = (tagId) => {
    setData(prev => {
      const raw = Array.isArray(prev.stepTags?.[mainIdx]) ? prev.stepTags[mainIdx] : ['기타'];
      const cur = raw.filter(t => t && typeof t === 'string');
      let newT;
      if (cur.includes(tagId)) { newT = cur.filter(t => t !== tagId); if (!newT.length) newT = ['기타']; }
      else { newT = tagId === '기타' ? ['기타'] : [...cur.filter(t => t !== '기타'), tagId]; }
      const st = [...(prev.stepTags || [])]; st[mainIdx] = newT;
      return { ...prev, tags: newT, stepTags: st };
    });
  };

  const handleImgFiles = (files) => {
    processMultipleFiles(files, data.images.length, (res) => {
      setData(prev => {
        const ni = [...(prev.images || []), ...res];
        return { ...prev, images: ni, stepPrompts: [...(prev.stepPrompts || []), ...res.map(() => '')], stepLabels: [...(prev.stepLabels || []), ...res.map(() => '')], stepTags: [...(prev.stepTags || []), ...res.map(() => ['기타'])], stepKeywords: [...(prev.stepKeywords || []), ...res.map(() => '')], stepDescriptions: [...(prev.stepDescriptions || []), ...res.map(() => '')] };
      });
    }, showToast);
  };

  const runAiAnalyze = async () => {
    const videoEntry = data.videos?.[0];
    const hasVideo = videoEntry instanceof File || (typeof videoEntry === 'string' && videoEntry);
    const isVideoMode = data.type === 'video' || (hasVideo && !data.images?.length);
    const currentImg = data.images?.[mainIdx];
    if (isVideoMode && !hasVideo) { showToast?.('분석할 영상이 없어요. 영상을 먼저 업로드하세요.', 'error'); return; }
    if (!isVideoMode && !currentImg) { showToast?.('분석할 이미지가 없어요. 먼저 이미지를 업로드하세요.', 'error'); return; }
    setIsAiAnalyzing(true);
    showToast?.(isVideoMode ? '영상 첫 프레임 캡처 중...' : 'AI 분석 중...');
    try {
      const { parsed, TAG_OPTIONS } = await analyzeWithGemini({
        isVideoMode,
        videoSource: videoEntry,
        imageSource: currentImg,
      });
      setData(prev => {
        const sk = [...(prev.stepKeywords || [])]; sk[mainIdx] = parsed.keywords || sk[mainIdx] || '';
        const sd = [...(prev.stepDescriptions || [])]; sd[mainIdx] = parsed.description || sd[mainIdx] || '';
        const st = [...(prev.stepTags || [])];
        if (isVideoMode) {
          st[mainIdx] = ['Motion'];
        } else if (Array.isArray(parsed.tags) && parsed.tags.length > 0) {
          const filtered = parsed.tags.filter(t => TAG_OPTIONS.includes(t));
          st[mainIdx] = filtered.length > 0 ? filtered : ['기타'];
        }
        const nextTitle = (!prev.title || !prev.title.trim()) && parsed.title
          ? String(parsed.title).trim() : prev.title;
        return {
          ...prev,
          title: nextTitle,
          stepKeywords: sk, aiKeywords: sk[mainIdx],
          stepDescriptions: sd, description: sd[mainIdx],
          stepTags: st, tags: st[mainIdx] || prev.tags,
        };
      });
      showToast?.(isVideoMode ? '영상 분석 완료! Motion 태그 자동 적용됨' : 'AI 분석 완료!');
    } catch (e) {
      console.error('[PromptArc] AI 분석 실패', e);
      showToast?.(`AI 분석 실패: ${e.message || e}`, 'error');
    } finally { setIsAiAnalyzing(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <button onClick={onClose} className="fixed top-4 right-4 z-[110] p-3 bg-white/10 hover:bg-white/20 text-white rounded-full border border-white/10"><X size={22} /></button>
      <div className="w-full max-w-5xl h-[90vh] bg-[#111] rounded-2xl border border-white/10 flex overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="w-[60%] bg-[#050505] relative flex flex-col"
          onDragOver={e => data.type === 'image' && e.preventDefault()}
          onDragEnter={() => data.type === 'image' && setIsDragImg(true)}
          onDragLeave={() => setIsDragImg(false)}
          onDrop={e => { if (data.type !== 'image') return; e.preventDefault(); setIsDragImg(false); handleImgFiles(e.dataTransfer.files); }}>
          <div className="absolute top-3 left-3 z-20 flex gap-1 p-1 rounded-lg bg-black/50 border border-white/10 backdrop-blur-sm">
            <button onClick={() => setData(prev => ({ ...prev, type: 'image' }))}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-colors flex items-center gap-1.5 ${data.type === 'image' ? 'bg-[#C8A969]/20 text-[#C8A969]' : 'text-zinc-500 hover:text-zinc-300'}`}
            ><ImageIcon size={11} /> 이미지</button>
            <button onClick={() => setData(prev => ({ ...prev, type: 'video' }))}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-colors flex items-center gap-1.5 ${data.type === 'video' ? 'bg-[#C8A969]/20 text-[#C8A969]' : 'text-zinc-500 hover:text-zinc-300'}`}
            ><Film size={11} /> 영상</button>
          </div>

          {canModerate && (
            <div className="absolute top-3 right-3 z-20 flex gap-1 p-1 rounded-lg bg-black/50 border border-white/10 backdrop-blur-sm">
              <button onClick={() => setData(prev => ({ ...prev, isLive: !prev.isLive }))} title="LIVE 딱지 토글"
                className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold tracking-wider transition-colors ${data.isLive ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-zinc-500 hover:text-rose-300 border border-transparent'}`}
              >LIVE</button>
              <button onClick={() => setData(prev => ({ ...prev, isPinned: !prev.isPinned }))} title="추천 고정 토글"
                className={`px-2 py-1.5 rounded-md text-[10px] transition-colors flex items-center gap-1 ${data.isPinned ? 'bg-[#C8A969]/20 text-[#C8A969] border border-[#C8A969]/40' : 'text-zinc-500 hover:text-[#C8A969] border border-transparent'}`}
              ><Star size={11} fill={data.isPinned ? 'currentColor' : 'none'} /> 추천</button>
            </div>
          )}

          {data.type === 'video' ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
              {videoPreviews.length === 0 ? (
                <label className="flex flex-col items-center gap-3 cursor-pointer p-12 border-2 border-dashed border-white/10 rounded-xl hover:border-white/30 transition-colors">
                  <Film size={40} className="text-zinc-600" />
                  <span className="text-sm text-zinc-400 font-bold">영상을 클릭해서 추가</span>
                  <span className="text-[11px] text-zinc-600">mp4 / webm / mov · 최대 50MB</span>
                  <input type="file" accept={VIDEO_ACCEPT} className="hidden" onChange={e => { handleVideoFiles(e.target.files); e.target.value = ''; }} />
                </label>
              ) : (
                <div className="relative w-full max-w-xl">
                  <video src={videoPreviews[0]} controls playsInline preload="metadata" className="w-full bg-black rounded-lg border border-white/10" />
                  <button onClick={() => handleRemoveVideo(0)} className="absolute -top-2 -right-2 p-2 bg-red-500/90 hover:bg-red-500 text-white rounded-full shadow-lg" title="영상 제거"><X size={14} /></button>
                  {data.videos[0] instanceof File && (
                    <div className="mt-2 text-[10px] text-zinc-500 text-center font-mono">
                      {data.videos[0].name} · {(data.videos[0].size / 1024 / 1024).toFixed(1)}MB
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
          <>
          {!data.images?.length ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <label className="flex flex-col items-center gap-3 cursor-pointer p-8 border-2 border-dashed border-white/10 rounded-xl hover:border-white/30 transition-colors">
                <ImageIcon size={32} className="text-zinc-600" />
                <span className="text-sm text-zinc-500">이미지를 드롭하거나 클릭해서 추가</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={e => handleImgFiles(e.target.files)} />
              </label>
            </div>
          ) : (
            <>
              <div className="flex-1 flex items-center justify-center p-4">
                <PromptImage src={data.images[mainIdx]} className="max-w-full max-h-full object-scale-down" />
              </div>
              {data.images.length > 1 && (
                <>
                  <button onClick={() => handleTabChange(mainIdx > 0 ? mainIdx - 1 : data.images.length - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 text-white rounded-full hover:bg-black/70"><ChevronLeft size={18} /></button>
                  <button onClick={() => handleTabChange(mainIdx < data.images.length - 1 ? mainIdx + 1 : 0)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 text-white rounded-full hover:bg-black/70"><ChevronRight size={18} /></button>
                </>
              )}
              <div className="absolute bottom-4 left-4 flex gap-2 z-10">
                {data.images.map((img, idx) => (
                  <div key={idx} onClick={() => handleTabChange(idx)} className={`w-16 h-16 rounded-lg overflow-hidden border-2 cursor-pointer ${idx === mainIdx ? 'border-[#C8A969]' : 'border-transparent hover:border-white/30'}`}>
                    <img src={img} className="w-full h-full object-cover" alt="" />
                  </div>
                ))}
                <label className="w-16 h-16 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-white/40 text-zinc-600 hover:text-zinc-400">
                  <Plus size={18} /><input type="file" multiple accept="image/*" className="hidden" onChange={e => handleImgFiles(e.target.files)} />
                </label>
              </div>
            </>
          )}

          <div className={`absolute right-4 z-10 ${canModerate ? 'top-[60px]' : 'top-4'}`}>
            {videoPreviews.length === 0 ? (
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-white/20 text-[11px] text-zinc-500 hover:text-zinc-300 hover:border-white/40 cursor-pointer bg-black/30 backdrop-blur-sm">
                <Film size={13} /> 영상 추가
                <input type="file" accept={VIDEO_ACCEPT} className="hidden" onChange={e => { handleVideoFiles(e.target.files); e.target.value = ''; }} />
              </label>
            ) : (
              <div className="relative group/video w-32 h-20 rounded-lg overflow-hidden border-2 border-[#C8A969]/60 bg-black">
                <video src={videoPreviews[0]} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                  <Film size={18} className="text-white/90" />
                </div>
                <button onClick={() => handleRemoveVideo(0)} className="absolute top-1 right-1 p-1 bg-black/70 text-zinc-200 hover:text-red-400 rounded opacity-0 group-hover/video:opacity-100 transition-opacity" title="영상 제거"><X size={11} /></button>
                {data.videos[0] instanceof File && (
                  <div className="absolute bottom-1 left-1 text-[9px] text-white/80 font-mono bg-black/60 px-1.5 py-0.5 rounded">
                    {(data.videos[0].size / 1024 / 1024).toFixed(1)}MB
                  </div>
                )}
              </div>
            )}
          </div>
          </>
          )}
        </div>
        {/* Right: form */}
        <div className="flex-1 flex flex-col bg-[#111]">
          <div className="px-5 pt-5 pb-3 border-b border-white/5 space-y-3">
            <div className="flex items-center gap-3">
              <input value={data.title || ''} onChange={e => setData({ ...data, title: e.target.value })} placeholder="제목을 입력하세요"
                className="flex-1 bg-transparent text-base font-bold text-zinc-200 outline-none placeholder:text-zinc-600 border-none" />
              <button onClick={runAiAnalyze}
                disabled={isAiAnalyzing || (!data.images?.length && !(data.type === 'video' && data.videos?.[0]))}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors bg-violet-500/10 border-violet-500/30 text-violet-300 hover:bg-violet-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                title="현재 미디어를 Gemini 2.5 Flash로 분석해서 제목·태그·키워드·설명을 자동 입력"
              >
                {isAiAnalyzing
                  ? <><Loader2 size={13} className="animate-spin" /> 분석 중...</>
                  : <><Sparkles size={13} /> AI 스마트 분석</>}
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-5 arc-scrollbar space-y-5">
            <div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">카테고리 태그</div>
              <div className="flex flex-wrap gap-1.5">
                {ARC_CATEGORIES.filter(c => c.id && c.name && c.type !== 'divider' && c.type !== 'folders' && c.id !== 'all' && c.id !== '즐겨찾기').map(c => {
                  const active = (data.stepTags?.[mainIdx] || []).filter(Boolean).includes(c.id);
                  return <button key={c.id} onClick={() => toggleTag(c.id)} className={`px-3 py-1.5 rounded-md text-[10px] border transition-colors ${active ? 'bg-[#C8A969]/20 text-[#C8A969] border-[#C8A969]/40 font-bold' : 'bg-white/5 text-zinc-500 border-white/5 hover:border-white/20'}`}>#{c.name}</button>;
                })}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">스타일 키워드</div>
              <input value={data.stepKeywords?.[mainIdx] || ''} onChange={e => { const a = [...(data.stepKeywords || [])]; a[mainIdx] = e.target.value; setData({ ...data, stepKeywords: a, aiKeywords: e.target.value }); }}
                placeholder="예) 2D/흑백, SF/사이버펑크, 네온" className="w-full bg-[#0A0A0A] border border-white/5 rounded-lg p-3 text-[11px] text-zinc-300 outline-none focus:border-white/20" />
              {(() => {
                const kws = (data.stepKeywords?.[mainIdx] || '').split(',').map(k => k.trim()).filter(Boolean);
                if (!kws.length) return null;
                return (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {kws.map((k, i) => (
                      <span key={i} className="px-2 py-0.5 border border-white/10 text-zinc-400 text-[9px] rounded">{k}</span>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">설명</div>
              <textarea value={data.stepDescriptions?.[mainIdx] || ''} onChange={e => { const a = [...(data.stepDescriptions || [])]; a[mainIdx] = e.target.value; setData({ ...data, stepDescriptions: a, description: e.target.value }); }}
                className="w-full bg-[#0A0A0A] border border-white/5 rounded-lg p-3 text-[11px] text-zinc-300 h-20 resize-none outline-none focus:border-white/20 arc-scrollbar" />
            </div>
            {data.images?.length > 1 && (
              <div className="space-y-2">
                <div className="flex gap-2 overflow-x-auto arc-scrollbar pb-1">
                  {data.images.map((_, idx) => (
                    <button key={idx} onClick={() => handleTabChange(idx)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap border ${idx === mainIdx ? 'bg-[#C8A969]/20 text-[#C8A969] border-[#C8A969]/40' : 'bg-white/5 text-zinc-500 border-white/5 hover:border-white/20'}`}>
                      Step {idx + 1}{data.stepLabels?.[idx] ? ` · ${data.stepLabels[idx]}` : ''}
                    </button>
                  ))}
                </div>
                <input value={data.stepLabels?.[mainIdx] || ''}
                  onChange={e => { const a = [...(data.stepLabels || [])]; a[mainIdx] = e.target.value; setData({ ...data, stepLabels: a }); }}
                  placeholder="스텝 목적을 입력하세요 (예: 스케치, VisualFX 적용 등)"
                  className="w-full bg-[#0A0A0A] border border-white/5 rounded-lg p-2.5 text-[11px] text-zinc-300 outline-none focus:border-white/20 placeholder:text-zinc-600"
                />
              </div>
            )}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-mono font-bold text-zinc-500">&gt;_ PROMPT{data.images?.length > 1 ? ` (Step ${mainIdx + 1})` : ''}</span>
                {(data.stepPrompts?.[mainIdx]) && (
                  <button onClick={() => copyToClipboard(data.stepPrompts[mainIdx], () => { setCopied(true); setTimeout(() => setCopied(false), 2000); showToast('복사됐어요!'); })}
                    className="px-3 py-1 text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[10px] font-bold flex items-center gap-1">
                    {copied ? <><Check size={10} />Copied!</> : <><Copy size={10} />복사</>}
                  </button>
                )}
              </div>
              <textarea value={data.stepPrompts?.[mainIdx] || ''} onChange={e => { const a = [...(data.stepPrompts || [])]; a[mainIdx] = e.target.value; setData({ ...data, stepPrompts: a, content: e.target.value }); }}
                placeholder="프롬프트를 입력하세요..." className="w-full bg-[#0A0A0A] border border-white/5 rounded-lg p-4 text-[11px] text-zinc-300 h-40 resize-none font-mono outline-none focus:border-white/20 arc-scrollbar" />
            </div>
          </div>
          <div className="p-5 border-t border-white/5 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs border border-white/10 text-zinc-400 rounded-lg hover:bg-white/5">취소</button>
            <button onClick={() => { if (!data.title) return showToast('제목을 입력해주세요.', 'error'); onSave(data); }}
              disabled={isSaving} className="px-6 py-2 text-xs font-bold bg-[#C8A969] text-black rounded-lg hover:bg-[#A88949] disabled:opacity-50">
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
