import React from 'react';
import { Heart, Check, X } from 'lucide-react';

const BannerCard = ({ 
  banner, 
  selected, 
  toggleSelection, 
  toggleLike, 
  onOpenPreview, 
  onTagClick,
  isProcessing,
  isCollectionMode,
  onRemove
}) => {
  
  return (
    <div 
      className={`group relative flex flex-col bg-[#18181b] rounded-xl overflow-hidden border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl
        ${selected 
          ? 'border-[#d8b17e] ring-1 ring-[#d8b17e]' 
          : 'border-zinc-800 hover:border-zinc-600'
        }
      `}
    >
      {/* 이미지 영역 */}
      <div 
        className="relative aspect-[4/5] w-full overflow-hidden bg-zinc-900 cursor-pointer"
        onClick={() => onOpenPreview(banner)}
      >
        <img 
          src={banner.preview || banner.imageUrl} 
          alt={banner.title} 
          className="w-full h-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-110 transform-gpu"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />

        {/* 좌측 상단: 체크박스 */}
        <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
            <button
                onClick={() => toggleSelection(banner.id)}
                className={`w-6 h-6 rounded-md flex items-center justify-center border transition-all duration-200
                    ${selected 
                        ? 'bg-[#d8b17e] border-[#d8b17e] text-black shadow-lg scale-110' 
                        : 'bg-black/40 border-white/30 text-transparent hover:border-white/70 hover:bg-black/60'
                    }
                `}
            >
                <Check size={14} strokeWidth={3} />
            </button>
        </div>

        {/* 우측 상단: 좋아요 / 삭제 */}
        <div className="absolute top-3 right-3 z-10" onClick={(e) => e.stopPropagation()}>
            {isCollectionMode ? (
                <button 
                    onClick={() => onRemove(banner.id)}
                    className="p-2 rounded-full bg-black/40 hover:bg-red-500/80 text-white/70 hover:text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0"
                    title="보관함에서 제거"
                >
                    <X size={16} />
                </button>
            ) : (
                <button 
                    onClick={() => toggleLike(banner.id)}
                    className={`p-2 rounded-full backdrop-blur-sm transition-all duration-300 transform hover:scale-110
                        ${banner.liked 
                            ? 'bg-red-500/20 text-red-500' 
                            : 'bg-black/40 text-white/70 hover:bg-black/60 hover:text-white opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0'
                        }
                    `}
                >
                    <Heart size={18} className={banner.liked ? "fill-current" : ""} />
                </button>
            )}
        </div>
      </div>

      {/* 텍스트 및 태그 정보 영역 */}
      <div className="p-4 flex flex-col gap-3 bg-[#18181b] relative min-h-[80px]">
        {/* 타이틀 */}
        <div className="flex justify-between items-start">
            <h3 className="text-sm font-bold text-zinc-200 line-clamp-1 group-hover:text-[#d8b17e] transition-colors" title={banner.title}>
                {banner.title}
            </h3>
        </div>
        
        {/* 해시태그 영역 (게임, 년도 삭제됨) */}
        {banner.tags && banner.tags.length > 0 && (
            <div className="flex flex-wrap content-start gap-1.5">
                {banner.tags.map((tag, idx) => (
                    <span 
                        key={idx} 
                        onClick={(e) => { e.stopPropagation(); onTagClick(tag); }}
                        className="px-2 py-0.5 rounded-md bg-zinc-800/50 text-[10px] text-zinc-400 border border-zinc-800 hover:border-zinc-600 hover:text-zinc-200 cursor-pointer transition-colors"
                    >
                        #{tag}
                    </span>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default BannerCard;