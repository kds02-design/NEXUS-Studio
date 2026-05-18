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
  const videoPoster = !baseImage && videoUrl ? cloudinaryVideoThumb(videoUrl) : null;
  const displayImage = baseImage || videoPoster;
  const isVideoOnly = (prompt.type === 'video') || (!baseImage && !!videoUrl);
  const [hov, setHov] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (hov) {
      v.currentTime = 0;
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } else {
      v.pause();
      v.currentTime = 0;
    }
  }, [hov, videoUrl]);

  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      className={`group bg-[#111111] rounded-xl border transition-all cursor-pointer overflow-hidden relative break-inside-avoid ${isSelected ? 'border-purple-500/50' : 'border-white/5 hover:border-[#C8A969]/50'}`}
      style={{ boxShadow: hov ? '0 8px 32px rgba(200,169,105,0.08)' : 'none' }}
    >
      <div className="relative w-full">
        {isVideoOnly && !displayImage ? (
          <div className="relative w-full aspect-video bg-gradient-to-br from-[#1a1521] to-[#0a0a0a] flex items-center justify-center">
            <div className={`text-5xl transition-transform ${hov ? 'scale-90 opacity-30' : 'scale-100 opacity-80'}`}>🎬</div>
            {videoUrl && (
              <video ref={videoRef} src={videoUrl} muted loop playsInline preload="metadata"
                className={`absolute inset-0 w-full h-full object-cover bg-black ${hov ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity`} />
            )}
          </div>
        ) : (
          <>
            <PromptImage src={displayImage} alt={prompt.title} className={`w-full h-auto object-scale-down block bg-[#0A0A0A] ${videoUrl && hov ? 'opacity-0' : 'opacity-100'} transition-opacity`} />
            {videoUrl && (
              <video ref={videoRef} src={videoUrl} muted loop playsInline preload="metadata"
                className={`absolute inset-0 w-full h-full object-cover bg-black ${hov ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity`} />
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
