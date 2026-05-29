import { useState, useEffect, memo } from 'react';
import { Image as ImageIcon, Loader2, Copy, Check, Layers, Zap } from 'lucide-react';
import { fetchBannerImage } from '../services/firebase';

const safeRender = (v, fb = '') => {
  if (v == null) return fb;
  if (typeof v === 'object') return fb;
  return String(v);
};

const CodexCard = memo(({
  banner, selected, toggleSelection, onOpenPreview, onCopyPath,
  isProcessing, isAdminMode, isLightMode, isLastViewed, isInCart, onToggleCart
}) => {
  const initialSrc = banner.preview || banner.imageUrl || banner.thumbnailUrl || null;
  const [imageData, setImageData] = useState(initialSrc);
  const [isLoadingImage, setIsLoadingImage] = useState(!initialSrc && !!banner.imageId);

  useEffect(() => {
    let isMounted = true;
    if (initialSrc) { setIsLoadingImage(false); return () => { isMounted = false; }; }
    if (banner.imageId && !banner.isTemp) {
      (async () => {
        try {
          const data = await fetchBannerImage(banner.imageId);
          if (data && isMounted) setImageData(data.thumbnail || data.original);
        } catch (e) { console.error("Image load failed", e); }
        finally { if (isMounted) setIsLoadingImage(false); }
      })();
    } else if (isMounted) setIsLoadingImage(false);
    return () => { isMounted = false; };
  }, [banner.imageId, banner.isTemp, initialSrc]);

  const safeTitle = safeRender(banner.title, '제목 없음');
  const displayScore = safeRender(banner.score, null);
  const displayTag = Array.isArray(banner.tags) && banner.tags.length > 0 ? safeRender(banner.tags[0], null) : null;
  const showSelect = isAdminMode || banner.isTemp;

  return (
    <div onClick={() => onOpenPreview({ ...banner, loadedImage: banner.isTemp ? banner.loadedImage : imageData })}
      role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpenPreview({ ...banner, loadedImage: banner.isTemp ? banner.loadedImage : imageData })}
      className={`group relative rounded-lg overflow-hidden border transition-all duration-300 flex flex-col cursor-pointer w-full h-full ${selected && showSelect ? isLightMode ? 'bg-white border-[#0eb9b3] ring-2 ring-[#0eb9b3] shadow-lg' : 'bg-[#111] border-[#0eb9b3] ring-2 ring-[#0eb9b3] shadow-lg' : isLastViewed ? isLightMode ? 'bg-white border-[#4285f4] ring-2 ring-[#4285f4]/50 shadow-md' : 'bg-[#111] border-[#4285f4] ring-2 ring-[#4285f4]/50 shadow-lg shadow-[#4285f4]/10' : isLightMode ? 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md' : 'bg-[#0a0a0a] border-white/5 hover:border-white/10 hover:bg-[#151515]'}`}
    >
      {showSelect && (
        <button onClick={(e) => toggleSelection(banner.id, e)}
          className={`absolute top-3 left-3 z-30 p-1.5 rounded-lg backdrop-blur-sm transition-colors ${selected ? 'bg-[#0eb9b3] text-white shadow-sm' : 'bg-black/50 text-white hover:bg-black/70 border border-white/20'}`}>
          {selected ? <Check className="w-4 h-4 stroke-[3]" /> : <div className="w-4 h-4 border-2 border-current rounded-sm" />}
        </button>
      )}
      <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
        {isLoadingImage ? (
          <div className="w-full h-full animate-pulse flex items-center justify-center">
            <ImageIcon className={`w-8 h-8 ${isLightMode ? 'text-slate-300' : 'text-zinc-800'} opacity-50`} />
          </div>
        ) : (
          <img src={imageData} alt={safeTitle}
            className={`w-full h-full object-contain transition-transform duration-500 ${selected && showSelect ? 'scale-105' : 'group-hover:scale-105'}`} />
        )}
        <div className={`absolute inset-0 transition-colors pointer-events-none ${selected && showSelect ? 'bg-[#0eb9b3]/10' : 'bg-black/0 group-hover:bg-black/40'}`} />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none flex flex-col justify-between p-3 z-20">
          <div className="flex justify-end w-full gap-2">
            <button onClick={(e) => { e.stopPropagation(); onToggleCart(banner.id); }}
              className={`pointer-events-auto p-2 rounded-lg backdrop-blur-sm transition-colors shadow-lg border border-white/10 ${isInCart ? 'bg-[#0eb9b3] text-white hover:bg-[#0b948f]' : 'bg-black/60 hover:bg-[#0eb9b3] text-white'}`}
              title={isInCart ? "담기 해제" : "담기"}>
              <Layers className={`w-3.5 h-3.5 ${isInCart ? 'fill-current' : ''}`} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onCopyPath(banner.path); }}
              className="pointer-events-auto p-2 bg-black/60 hover:bg-[#0eb9b3] text-white rounded-lg backdrop-blur-sm transition-colors shadow-lg border border-white/10" title="경로 복사">
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex justify-start items-center gap-1.5 w-full">
            {displayScore && (
              <span className={`pointer-events-auto px-2 py-1 bg-black/60 text-[11px] font-bold rounded-md border border-white/10 backdrop-blur-sm shadow-lg flex items-center gap-1 ${parseFloat(displayScore) >= 8.7 ? 'text-[#0eb9b3]' : parseFloat(displayScore) >= 8.2 ? 'text-[#0eb9b3]' : parseFloat(displayScore) >= 7.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                {displayScore}
              </span>
            )}
            {displayTag && (
              <span className="pointer-events-auto px-2.5 py-1 bg-black/60 text-white text-[11px] font-medium rounded-md border border-white/10 backdrop-blur-sm shadow-lg">#{displayTag}</span>
            )}
            {banner.isTemp && (
              <span className="pointer-events-auto px-2.5 py-1 bg-violet-600/80 text-white text-[10px] font-bold rounded-md border border-white/10 backdrop-blur-sm shadow-lg flex items-center gap-1">
                <Zap className="w-3 h-3 fill-current" />임시
              </span>
            )}
          </div>
        </div>
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-30">
            <Loader2 className="w-6 h-6 text-[#0eb9b3] animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
});

export default CodexCard;
