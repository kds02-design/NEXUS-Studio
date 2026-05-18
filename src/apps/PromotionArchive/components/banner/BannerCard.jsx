import { Heart, Check, X } from 'lucide-react';
import { getWebFinalScore100, hasWebEvaluation } from '../../constants/webEvalCriteria';

const BannerCard = ({
  banner,
  selected,
  toggleSelection,
  toggleLike,
  onOpenPreview,
  _onTagClick,
  _isProcessing,
  isCollectionMode,
  onRemove,
  isAdminMode = false,
}) => {
  const hasEval = hasWebEvaluation(banner);
  const score = hasEval ? getWebFinalScore100(banner) : null;
  const scoreColor = score == null
    ? ''
    : score >= 87 ? 'text-[#d8b17e]'
    : score >= 80 ? 'text-[#d8b17e]'
    : score >= 70 ? 'text-yellow-400'
    : 'text-red-400';

  const showCheckbox = isAdminMode && !isCollectionMode;

  return (
    <div
      onClick={() => onOpenPreview(banner)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpenPreview(banner)}
      className={`group relative flex flex-col rounded-xl overflow-hidden border transition-all duration-300 cursor-pointer w-full
        ${selected
          ? 'bg-[#111] border-[#d8b17e] ring-2 ring-[#d8b17e] shadow-lg'
          : 'bg-[#0a0a0a] border-white/5 hover:border-white/10 hover:bg-[#151515]'
        }
      `}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-zinc-900">
        <img
          src={banner.preview || banner.imageUrl}
          alt={banner.title}
          className={`w-full h-full object-cover object-top transition-transform duration-500 ${selected ? 'scale-105' : 'group-hover:scale-105'}`}
          loading="lazy"
        />

        <div className={`absolute inset-0 transition-colors pointer-events-none ${selected ? 'bg-[#d8b17e]/10' : 'bg-black/0 group-hover:bg-black/40'}`} />

        {/* 좌측 상단: 체크박스 — 관리자 모드일 때만 */}
        {showCheckbox && (
          <div className="absolute top-3 left-3 z-30" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => toggleSelection(banner.id)}
              className={`p-1.5 rounded-lg backdrop-blur-sm transition-colors ${
                selected
                  ? 'bg-[#d8b17e] text-black shadow-sm'
                  : 'bg-black/50 text-white hover:bg-black/70 border border-white/20'
              }`}
            >
              {selected ? <Check className="w-4 h-4 stroke-[3]" /> : <div className="w-4 h-4 border-2 border-current rounded-sm" />}
            </button>
          </div>
        )}

        {/* 호버 오버레이 — 우측 상단 액션 + 좌측 하단 점수·제목 */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none flex flex-col justify-between p-3 z-20">
          <div className="flex justify-end w-full gap-2">
            {isCollectionMode ? (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(banner.id); }}
                className="pointer-events-auto p-2 bg-black/60 hover:bg-red-500/80 text-white rounded-lg backdrop-blur-sm transition-colors shadow-lg border border-white/10"
                title="보관함에서 제거"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); toggleLike(banner.id); }}
                className={`pointer-events-auto p-2 rounded-lg backdrop-blur-sm transition-colors shadow-lg border border-white/10 ${
                  banner.liked
                    ? 'bg-red-500/80 text-white hover:bg-red-500'
                    : 'bg-black/60 hover:bg-[#d8b17e] hover:text-black text-white'
                }`}
                title="좋아요"
              >
                <Heart className={`w-3.5 h-3.5 ${banner.liked ? 'fill-current' : ''}`} />
              </button>
            )}
          </div>

          {/* 좌측 하단: 점수 + 제목 */}
          <div className="flex items-end gap-2 w-full min-w-0">
            {score != null && (
              <span className={`pointer-events-auto px-2 py-1 bg-black/70 text-[11px] font-black rounded-md border border-white/10 backdrop-blur-sm shadow-lg shrink-0 ${scoreColor}`}>
                {score}
              </span>
            )}
            {banner.title && (
              <span className="pointer-events-none px-2 py-1 bg-black/60 text-white text-[11px] font-semibold rounded-md border border-white/10 backdrop-blur-sm shadow-lg truncate max-w-full">
                {banner.title}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BannerCard;
