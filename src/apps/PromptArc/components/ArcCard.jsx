import { useState, useEffect, useRef } from "react";
import { Image as ImageIcon, Trash2, Play, Link2 } from "lucide-react";
import { cloudinaryVideoThumb } from "../services/cloudinary";

export const PromptImage = ({ src, alt, className }) => {
  const [error, setError] = useState(false);
  useEffect(() => { setError(false); }, [src]);
  if (error || !src) return <div className={`flex items-center justify-center bg-zinc-900 text-zinc-600 ${className}`}><ImageIcon size={24} /></div>;
  return <img src={src} alt={alt} className={className} onError={() => setError(true)} loading="lazy" onDragStart={e => e.preventDefault()} />;
};

export default function ArcCard({ prompt, onClick, onDelete, isAdminMode, isSelected, onToggleSelect }) {
  const videoUrl = Array.isArray(prompt.videos) && typeof prompt.videos[0] === 'string' ? prompt.videos[0] : null;
  const baseImage = prompt.thumbnail || (prompt.images?.length > 0 ? prompt.images[0] : prompt.image);
  // 사용자 지정 포스터(videoPoster) → Cloudinary 자동 썸네일 순으로 폴백.
  const autoPoster = videoUrl ? cloudinaryVideoThumb(videoUrl) : null;
  const videoPosterSrc = prompt.videoPoster || autoPoster;
  const videoPoster = !baseImage && videoPosterSrc ? videoPosterSrc : null;
  const displayImage = baseImage || videoPoster;
  const isVideoOnly = (prompt.type === 'video') || (!baseImage && !!videoUrl);
  const [hov, setHov] = useState(false);
  const [inView, setInView] = useState(false);
  const containerRef = useRef(null);
  const videoRef = useRef(null);

  // 카드가 뷰포트에 진입하면 inView=true → 영상 자동 재생.
  // 영상 없는 카드는 옵저버 생성 자체를 스킵.
  useEffect(() => {
    if (!videoUrl) return;
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      const e = entries[0];
      setInView(!!e?.isIntersecting);
    }, { threshold: 0.1, rootMargin: '100px' });
    io.observe(el);
    return () => io.disconnect();
  }, [videoUrl]);

  // inView 가 변하면 재생/일시정지. currentTime 은 유지해서 다시 보일 때 이어서 재생.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (inView) {
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } else {
      v.pause();
    }
  }, [inView, videoUrl]);

  // 영상 노출 조건 — hover 가 아닌 뷰포트 진입 여부로 판단.
  const showVideo = !!videoUrl && inView;

  return (
    <div ref={containerRef} onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      className={`group bg-[#111111] rounded-xl border transition-all cursor-pointer overflow-hidden relative break-inside-avoid ${isSelected ? 'border-purple-500/50' : 'border-white/5 hover:border-[#C8A969]/50'}`}
      style={{ boxShadow: hov ? '0 8px 32px rgba(200,169,105,0.08)' : 'none' }}
    >
      <div className="relative w-full">
        {isVideoOnly && !displayImage ? (
          <div className="relative w-full aspect-video bg-gradient-to-br from-[#1a1521] to-[#0a0a0a] flex items-center justify-center">
            <div className={`text-5xl transition-transform ${showVideo ? 'scale-90 opacity-30' : 'scale-100 opacity-80'}`}>🎬</div>
            {videoUrl && (
              <video ref={videoRef} src={videoUrl} poster={videoPosterSrc || undefined} muted loop playsInline preload="metadata"
                className={`absolute inset-0 w-full h-full object-cover bg-black ${showVideo ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity`} />
            )}
          </div>
        ) : (
          <>
            <PromptImage src={displayImage} alt={prompt.title} className={`w-full h-auto object-scale-down block bg-[#0A0A0A] ${showVideo ? 'opacity-0' : 'opacity-100'} transition-opacity`} />
            {videoUrl && (
              <video ref={videoRef} src={videoUrl} poster={videoPosterSrc || undefined} muted loop playsInline preload="metadata"
                className={`absolute inset-0 w-full h-full object-cover bg-black ${showVideo ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity`} />
            )}
          </>
        )}
      </div>
      {prompt.isLive && <div className="absolute top-0 left-0 px-2 py-0.5 bg-rose-950/80 text-rose-200 text-[9px] font-bold rounded-br-lg z-30 tracking-wider">LIVE</div>}
      {videoUrl && (
        <div className="absolute bottom-2 left-2 z-30 flex items-center gap-1.5 max-w-[calc(100%-1rem)]">
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-black/70 rounded text-[10px] font-bold text-white shrink-0">
            <Play size={10} fill="currentColor" /> VIDEO
          </div>
          <div className={`flex items-center gap-1 overflow-hidden transition-opacity ${hov ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {(prompt.tags || []).slice(0, 4).map((tag, i) => (
              <span key={i} className="px-1.5 py-0.5 bg-black/70 rounded text-[10px] font-bold text-zinc-200 whitespace-nowrap">#{tag}</span>
            ))}
          </div>
        </div>
      )}
      <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1">
        {Array.isArray(prompt.relatedIds) && prompt.relatedIds.length > 0 && (
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-[#C8A969]/80 rounded text-[10px] font-bold text-black" title={`연관 아이템 ${prompt.relatedIds.length}개`}>
            <Link2 size={9} strokeWidth={3} /> {prompt.relatedIds.length}
          </div>
        )}
        {prompt.images?.length > 1 && <div className="px-1.5 py-0.5 bg-black/60 rounded text-[10px] font-bold text-white">+{prompt.images.length - 1}</div>}
      </div>
      {isAdminMode && (
        <div className="absolute top-2 left-2 z-40" onClick={e => e.stopPropagation()}>
          <input type="checkbox" checked={isSelected} onChange={e => { e.stopPropagation(); onToggleSelect(prompt.id); }} className="w-3.5 h-3.5 accent-purple-500 cursor-pointer" />
        </div>
      )}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-40">
        <button onClick={e => { e.stopPropagation(); onDelete(prompt.id); }} className="p-1.5 rounded-lg bg-[#151515]/80 text-zinc-300 hover:text-red-400 backdrop-blur-sm"><Trash2 size={13} /></button>
      </div>
      <div className="absolute bottom-2 left-2 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 z-20 pointer-events-none">
        {!videoUrl && (prompt.tags || []).map((tag, i) => <span key={i} className="px-1.5 py-0.5 bg-black/70 rounded text-[10px] font-bold text-zinc-300">#{tag}</span>)}
      </div>
    </div>
  );
}
