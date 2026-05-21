import { useState, useEffect, useMemo, useRef } from "react";
import {
  X, Copy, Check, Plus, Loader2, Sparkles, Image as ImageIcon,
  ChevronLeft, ChevronRight, Film, Star, Camera, RotateCcw,
  Globe, Lock,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { isVideoFile, VIDEO_MAX_BYTES, VIDEO_ACCEPT } from "../../../lib/storage";
import { ARC_CATEGORIES } from "../constants/categories";
import { processMultipleFiles, compressImage, MAX_PROMPT_IMAGES } from "../services/cloudinary";
import { analyzeWithGemini } from "../services/gemini";
import { PromptImage } from "./ArcCard";

// 프롬프트가 어떤 모델을 대상으로 작성됐는지 — type 에 따라 다른 옵션 노출.
// 이미지: Gemini / ChatGPT(DALL·E) / Midjourney.
// 영상: Gemini(Veo) / Runway / Kling / Sora / Luma.
const IMAGE_MODELS = [
  { id: 'gemini',     label: 'Gemini' },
  { id: 'chatgpt',    label: 'ChatGPT' },
  { id: 'midjourney', label: 'Midjourney' },
];
const VIDEO_MODELS = [
  { id: 'gemini',  label: 'Gemini (Veo)' },
  { id: 'runway',  label: 'Runway' },
  { id: 'kling',   label: 'Kling' },
  { id: 'sora',    label: 'Sora' },
  { id: 'luma',    label: 'Luma' },
];

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
  const initVideos = Array.isArray(initialData?.videos) ? [...initialData.videos] : [];
  // 영상 URL이 하나라도 있으면 영상 모드로 진입한다. (썸네일이 images[] 에 함께 저장된 케이스 대응)
  // 명시적으로 type==='image' 가 설정돼 있고 videos 가 비어 있어야만 이미지 모드로 들어간다.
  const initType = (initialData?.type === 'video' || initVideos.length > 0) ? 'video' : 'image';

  // step 배열은 항상 슬롯 개수에 맞춰 정규화한다.
  // - 영상 모드: 슬롯 1개 (영상은 step 개념이 없으므로 메타 1세트만 보관)
  // - 이미지 모드: 이미지 장수만큼 (없으면 1개로 시작해 사용자가 추가할 때 step 데이터가 안정적으로 쌓이게)
  // 과거 영상 콘텐츠는 step 배열들이 길이 0~1로 들쭉날쭉 저장되어 있어, 수정 모드 진입 시
  // 입력이 sparse 인덱스로 들어가 저장본이 점점 더 뒤틀리는 버그가 있었다 — 여기서 한 번에 정렬한다.
  const slotCount = initType === 'video' ? 1 : Math.max(initImages.length, 1);
  const padArr = (src, fill) => {
    const a = Array.isArray(src) ? src.slice(0, slotCount) : [];
    while (a.length < slotCount) a.push(typeof fill === 'function' ? fill() : fill);
    return a;
  };
  const defaultTag = initType === 'video' ? 'Motion' : '기타';
  const initSP = padArr(initialData?.stepPrompts, initialData?.content || '');
  const initST = padArr(initialData?.stepTags, () => (Array.isArray(initialData?.tags) && initialData.tags.length ? [...initialData.tags] : [defaultTag]));
  const initSK = padArr(initialData?.stepKeywords, initialData?.aiKeywords || '');
  const initSD = padArr(initialData?.stepDescriptions, initialData?.description || '');
  const initSL = padArr(initialData?.stepLabels, '');

  const [data, setData] = useState({ ...initialData, type: initType, images: initImages, videos: initVideos, stepPrompts: initSP, stepTags: initST, stepKeywords: initSK, stepDescriptions: initSD, stepLabels: initSL });
  const [mainIdx, setMainIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [_isDragImg, setIsDragImg] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  // 사용자가 영상에서 직접 캡처한 프레임(dataURL 또는 이미 업로드된 URL).
  // null 이면 Cloudinary 자동 썸네일을 사용. 영상 제거 시 초기화.
  const [customPoster, setCustomPoster] = useState(initialData?.videoPoster || null);
  const videoEditRef = useRef(null);

  const videoPreviews = useMemo(() => {
    return (data.videos || []).map(v => (v instanceof File) ? URL.createObjectURL(v) : v);
  }, [data.videos]);
  // videoPreviews 가 갱신될 때마다 이전 blob URL 을 정리. (이전: deps []였어서 누수)
  useEffect(() => {
    return () => { videoPreviews.forEach(u => { if (u?.startsWith?.('blob:')) URL.revokeObjectURL(u); }); };
  }, [videoPreviews]);

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
    setCustomPoster(null);
  };

  // 현재 video 의 currentTime 프레임을 캔버스로 그려 dataURL 추출.
  // blob: URL (새 업로드)은 CORS 문제 없음. 이미 업로드된 Cloudinary URL 도 보통 통과되지만
  // 실패 시 toDataURL 이 SecurityError 던짐 → 안내 토스트.
  const captureCurrentFrame = () => {
    const video = videoEditRef.current;
    if (!video) { showToast?.("영상이 아직 준비되지 않았어요.", "error"); return; }
    if (!video.videoWidth) { showToast?.("영상이 로드되지 않았어요. 잠시 후 다시 시도하세요.", "error"); return; }
    try {
      const w = video.videoWidth;
      const h = video.videoHeight;
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setCustomPoster(dataUrl);
      showToast?.(`프레임 캡처 완료 (${video.currentTime.toFixed(1)}초)`);
    } catch (e) {
      console.error("[Frame capture]", e);
      showToast?.("프레임 캡처 실패 — CORS 차단 가능성 (저장 후 재시도)", "error");
    }
  };
  const clearCustomPoster = () => { setCustomPoster(null); showToast?.("자동 썸네일로 복원"); };
  const isUploadedPoster = typeof customPoster === 'string' && /^https?:/i.test(customPoster);

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

  // 인덱스 단위로 이미지와 5개 step 배열을 동시에 조작 — 인덱스가 어긋나면 프롬프트/태그가 다른 이미지에 붙는 사고가 남.
  const STEP_KEYS = ['stepPrompts', 'stepLabels', 'stepTags', 'stepKeywords', 'stepDescriptions'];

  const handleRemoveImage = (idx) => {
    const total = data.images?.length || 0;
    if (total <= 1) { showToast?.('마지막 이미지는 삭제할 수 없어요. 영상 모드로 전환하거나 새 이미지를 먼저 추가하세요.', 'error'); return; }
    if (!confirm(`Step ${idx + 1} 이미지를 삭제할까요?\n해당 스텝의 프롬프트·태그·키워드·설명도 같이 사라집니다.`)) return;
    setData(prev => {
      const drop = (arr) => Array.isArray(arr) ? arr.filter((_, i) => i !== idx) : arr;
      const next = { ...prev, images: drop(prev.images) };
      for (const k of STEP_KEYS) next[k] = drop(prev[k]);
      const m = Math.min(mainIdx > idx ? mainIdx - 1 : (mainIdx === idx ? Math.max(0, mainIdx - (mainIdx === total - 1 ? 1 : 0)) : mainIdx), (next.images?.length || 1) - 1);
      next.content = next.stepPrompts?.[m] || '';
      return next;
    });
    setMainIdx(prev => {
      const newLen = total - 1;
      if (prev > idx) return prev - 1;
      if (prev === idx) return Math.min(prev, newLen - 1);
      return prev;
    });
  };

  const handleReplaceImage = async (idx, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast?.('이미지 파일만 가능해요', 'error'); return; }
    try {
      const dataUrl = await compressImage(file);
      setData(prev => {
        const next = [...(prev.images || [])];
        next[idx] = dataUrl;
        return { ...prev, images: next };
      });
      showToast?.(`Step ${idx + 1} 이미지를 교체했어요.`);
    } catch (e) {
      console.error('[PromptArc] replace image failed', e);
      showToast?.('이미지 교체 실패', 'error');
    }
  };

  const [dragImgIdx, setDragImgIdx] = useState(null);
  const handleReorderImages = (fromIdx, toIdx) => {
    if (fromIdx === toIdx || fromIdx == null || toIdx == null) return;
    setData(prev => {
      const reorder = (arr) => {
        if (!Array.isArray(arr)) return arr;
        const a = [...arr];
        const [m] = a.splice(fromIdx, 1);
        a.splice(toIdx, 0, m);
        return a;
      };
      const next = { ...prev, images: reorder(prev.images) };
      for (const k of STEP_KEYS) next[k] = reorder(prev[k]);
      return next;
    });
    setMainIdx(prev => {
      if (prev === fromIdx) return toIdx;
      if (fromIdx < prev && prev <= toIdx) return prev - 1;
      if (toIdx <= prev && prev < fromIdx) return prev + 1;
      return prev;
    });
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
          // 사용자가 의미있는 태그를 이미 골랐다면 보존. 비어 있거나 기본값('기타')일 때만 Motion 자동 적용.
          const cur = (Array.isArray(st[mainIdx]) ? st[mainIdx] : []).filter(Boolean);
          const isDefaultOnly = cur.length === 0 || (cur.length === 1 && cur[0] === '기타');
          if (isDefaultOnly) st[mainIdx] = ['Motion'];
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
          // type 양쪽 모두에서 drag/drop 활성화. type 과 다른 매체 파일은 토스트로 안내 후 무시.
          onDragOver={e => { e.preventDefault(); }}
          onDragEnter={() => setIsDragImg(true)}
          onDragLeave={() => setIsDragImg(false)}
          onDrop={e => {
            e.preventDefault();
            setIsDragImg(false);
            const files = Array.from(e.dataTransfer.files || []);
            if (files.length === 0) return;
            if (data.type === 'video') {
              const v = files.find(isVideoFile);
              if (v) handleVideoFiles([v]);
              else showToast?.('영상 모드 — 영상 파일(mp4/webm/mov)을 드롭하세요.', 'error');
            } else {
              const imgs = files.filter(f => f.type.startsWith('image/'));
              if (imgs.length) handleImgFiles(imgs);
              else showToast?.('이미지 모드 — 이미지 파일을 드롭하세요.', 'error');
            }
          }}>
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
                  <video ref={videoEditRef} src={videoPreviews[0]} controls playsInline preload="metadata" crossOrigin="anonymous"
                    className="w-full bg-black rounded-lg border border-white/10" />
                  <button onClick={() => handleRemoveVideo(0)} className="absolute -top-2 -right-2 p-2 bg-red-500/90 hover:bg-red-500 text-white rounded-full shadow-lg" title="영상 제거"><X size={14} /></button>
                  {data.videos[0] instanceof File && (
                    <div className="mt-2 text-[10px] text-zinc-500 text-center font-mono">
                      {data.videos[0].name} · {(data.videos[0].size / 1024 / 1024).toFixed(1)}MB
                    </div>
                  )}

                  {/* 프레임 선택 — 재생 위치를 잡고 "이 프레임 사용" 클릭. 첫 프레임이 검은 영상의 해결책. */}
                  <div className="mt-3 p-3 rounded-lg border border-white/10 bg-black/40">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">썸네일 프레임</div>
                      <button onClick={captureCurrentFrame}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold border bg-[#C8A969]/15 border-[#C8A969]/40 text-[#C8A969] hover:bg-[#C8A969]/25 transition-colors">
                        <Camera size={11} /> 현재 프레임 사용
                      </button>
                    </div>
                    {customPoster ? (
                      <div className="flex items-center gap-3">
                        <img src={customPoster} alt="custom poster"
                          className="w-28 h-16 rounded border border-[#C8A969]/40 object-cover bg-black" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] text-[#C8A969] font-bold">{isUploadedPoster ? '저장된 사용자 지정 프레임' : '사용자 지정 프레임 (미저장)'}</div>
                          <div className="text-[9px] text-zinc-500 mt-0.5">{isUploadedPoster ? '저장된 포스터를 사용 중이에요. 새 프레임을 캡처하면 교체됩니다.' : '저장 시 Cloudinary에 업로드되어 포스터로 사용됩니다.'}</div>
                        </div>
                        <button onClick={clearCustomPoster}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] text-zinc-400 border border-white/10 hover:bg-white/5 shrink-0"
                          title="자동 썸네일로 복원">
                          <RotateCcw size={10} /> 기본값
                        </button>
                      </div>
                    ) : (
                      <div className="text-[10px] text-zinc-500 leading-relaxed">
                        영상을 재생하다가 원하는 시점에서 <span className="text-zinc-300 font-bold">현재 프레임 사용</span> 버튼을 누르세요.
                        선택하지 않으면 Cloudinary 자동 썸네일(첫 프레임 부근)이 사용됩니다.
                      </div>
                    )}
                  </div>
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
                  <div key={idx}
                    draggable
                    onDragStart={(e) => { setDragImgIdx(idx); e.dataTransfer.effectAllowed = 'move'; }}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                    onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (dragImgIdx !== null) handleReorderImages(dragImgIdx, idx); setDragImgIdx(null); }}
                    onDragEnd={() => setDragImgIdx(null)}
                    onClick={() => handleTabChange(idx)}
                    className={`group relative w-16 h-16 rounded-lg overflow-hidden border-2 cursor-pointer transition-opacity ${idx === mainIdx ? 'border-[#C8A969]' : 'border-transparent hover:border-white/30'} ${dragImgIdx === idx ? 'opacity-40' : ''}`}
                    title={`Step ${idx + 1} — 드래그해서 순서 변경`}
                  >
                    <img src={img} className="w-full h-full object-cover pointer-events-none" alt="" draggable={false} />
                    <span className="absolute bottom-0 left-0 px-1 py-0.5 text-[8px] font-bold text-white bg-black/60 pointer-events-none">{idx + 1}</span>
                    <label
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-0.5 left-0.5 p-1 rounded bg-black/70 text-zinc-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="이미지 교체"
                    >
                      <RotateCcw size={10} />
                      <input type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleReplaceImage(idx, f); e.target.value = ''; }} />
                    </label>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }}
                      className="absolute top-0.5 right-0.5 p-1 rounded bg-black/70 text-zinc-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="이미지 삭제"
                    ><X size={10} /></button>
                  </div>
                ))}
                {data.images.length < MAX_PROMPT_IMAGES && (
                  <label className="w-16 h-16 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-white/40 text-zinc-600 hover:text-zinc-400" title={`이미지 추가 (최대 ${MAX_PROMPT_IMAGES}장)`}>
                    <Plus size={18} /><input type="file" multiple accept="image/*" className="hidden" onChange={e => handleImgFiles(e.target.files)} />
                  </label>
                )}
              </div>
            </>
          )}

          {/* (제거됨) 좌측 우상단 "영상 추가" quick label —
              이미지/영상 동시 등록을 유발했으므로 type 토글로만 모드 전환하도록 단일화. */}
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
                // 어떤 미디어든 있으면 분석 가능. runAiAnalyze 가 video/image 모드를 자동 판정함.
                // (이전 조건은 data.type === 'video' 를 강요해서 영상-only 케이스에서 버튼이 비활성화되는 버그가 있었음.)
                disabled={isAiAnalyzing || (!data.images?.length && !data.videos?.[0])}
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
            {/* MODEL — 프롬프트 대상 모델 선택. type(image/video)에 따라 다른 옵션. 단일 선택. */}
            <div>
              <div className="text-[10px] font-mono font-bold text-zinc-500 mb-1.5">&gt;_ MODEL</div>
              <div className="flex flex-wrap gap-1.5">
                {(data.type === 'video' ? VIDEO_MODELS : IMAGE_MODELS).map(m => {
                  const active = data.model === m.id;
                  return (
                    <button key={m.id}
                      onClick={() => setData({ ...data, model: active ? '' : m.id })}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded border transition-colors ${
                        active
                          ? 'bg-[#C8A969]/15 text-[#C8A969] border-[#C8A969]/40'
                          : 'border-white/10 text-zinc-500 hover:text-zinc-200 hover:border-white/20'
                      }`}>
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
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
          <div className="p-5 border-t border-white/5 flex items-center justify-between gap-2">
            {/* 공개 범위 — 본인 작성물(또는 신규)만 변경 가능. 관리자라도 owner 의 비공개 선택은 존중. */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">공개</span>
              <div className="flex bg-[#0A0A0A] border border-white/10 rounded-lg p-0.5">
                <button
                  type="button"
                  disabled={!isAuthor && !!initialData}
                  onClick={() => setData(prev => ({ ...prev, visibility: 'public' }))}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded transition-colors ${
                    (data.visibility || 'public') === 'public'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'text-zinc-500 hover:text-zinc-300'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                  title="모두에게 공유"
                >
                  <Globe size={11} /> 공용
                </button>
                <button
                  type="button"
                  disabled={!isAuthor && !!initialData}
                  onClick={() => setData(prev => ({ ...prev, visibility: 'private' }))}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded transition-colors ${
                    data.visibility === 'private'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'text-zinc-500 hover:text-zinc-300'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                  title="본인만 조회"
                >
                  <Lock size={11} /> 비공개
                </button>
              </div>
              {data.visibility === 'private' && (
                <span className="text-[10px] text-amber-400/80">나만 볼 수 있어요</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="px-4 py-2 text-xs border border-white/10 text-zinc-400 rounded-lg hover:bg-white/5">취소</button>
              <button onClick={() => { if (!data.title) return showToast('제목을 입력해주세요.', 'error'); onSave({ ...data, videoPoster: customPoster || '' }); }}
                disabled={isSaving} className="px-6 py-2 text-xs font-bold bg-[#C8A969] text-black rounded-lg hover:bg-[#A88949] disabled:opacity-50">
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
