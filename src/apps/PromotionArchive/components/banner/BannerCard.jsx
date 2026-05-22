import { Heart, Check, X, Lock } from 'lucide-react';
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
      <div className="relative w-full overflow-hidden bg-zinc-900 aspect-[4/5]">
        {(() => {
          // 브랜드웹 — 메인 + 서브 2분할. 두 영역 모두 동일 비율(4:5 카드 / 위아래 50%/50% → 각 영역 16:10)
          // 로 잘려서 두 이미지의 잘림 정도가 일관됨.
          // 결정 우선순위:
          //   메인: banner.mainPageId 가 가리키는 page > banner.full_image > 첫 PC > preview
          //   서브: banner.subPageId 가 가리키는 page > banner.mobile_image > 첫 Mobile > 두 번째 PC
          if (banner.assetType === '브랜드웹') {
            const pages = Array.isArray(banner.pages) ? banner.pages : [];
            const findPageUrl = (id) => (id ? pages.find(p => p?.id === id)?.url : null);
            const mainSrc =
              findPageUrl(banner.mainPageId)
              || banner.full_image
              || pages.find(p => p?.device === 'pc')?.url
              || banner.preview
              || banner.imageUrl;
            const firstMobile = pages.find(p => p?.device === 'mobile')?.url;
            const pcAfterMain = pages.filter(p => p?.device === 'pc' && p?.url !== mainSrc)[0]?.url;
            const subSrc =
              findPageUrl(banner.subPageId)
              || banner.mobile_image
              || firstMobile
              || pcAfterMain
              || null;
            const hasSub = !!subSrc && subSrc !== mainSrc;
            const transform = selected ? 'scale-105' : 'group-hover:scale-105';
            return (
              <div className="absolute inset-0 flex flex-col">
                {/* 메인 — 위 50% (영역 비율 16:10) */}
                <div className="relative w-full overflow-hidden border-b border-black/40" style={{ flex: hasSub ? '1 1 50%' : '1 1 100%' }}>
                  <img src={mainSrc} alt={banner.title} loading="lazy"
                    className={`w-full h-full object-cover object-top transition-transform duration-500 ${transform}`} />
                </div>
                {/* 서브 — 아래 50% (동일 16:10) */}
                {hasSub && (
                  <div className="relative w-full overflow-hidden" style={{ flex: '1 1 50%' }}>
                    <img src={subSrc} alt={`${banner.title} sub`} loading="lazy"
                      className={`w-full h-full object-cover object-top transition-transform duration-500 ${transform}`} />
                  </div>
                )}
              </div>
            );
          }
          // 프로모션/배너 (기존)
          return (
            <img
              src={banner.preview || banner.imageUrl}
              alt={banner.title}
              className={`w-full h-full object-cover object-top transition-transform duration-500 ${selected ? 'scale-105' : 'group-hover:scale-105'}`}
              loading="lazy"
            />
          );
        })()}

        <div className={`absolute inset-0 transition-colors pointer-events-none ${selected ? 'bg-[#d8b17e]/10' : 'bg-black/0 group-hover:bg-black/40'}`} />

        {/* 우상단 배지 스택 — BRAND / 장수, 비공개. 둘 다 우상단이라 컬럼 정렬로 공존시킴. */}
        {(banner.assetType === '브랜드웹' || banner.visibility === 'private') && (
          <div className="absolute top-3 right-3 z-30 flex flex-col items-end gap-1">
            {banner.assetType === '브랜드웹' && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[10px] font-bold shadow">
                <span className="text-rose-400 tracking-wider">BRAND</span>
                {typeof banner.pageCount === 'number' && banner.pageCount > 0 && (
                  <>
                    <span className="text-zinc-700">/</span>
                    <span className="text-zinc-200 font-mono">{banner.pageCount}장</span>
                  </>
                )}
              </div>
            )}
            {banner.visibility === 'private' && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/90 text-amber-950 text-[10px] font-bold backdrop-blur-sm shadow" title="나만 볼 수 있는 비공개 항목">
                <Lock size={10} strokeWidth={2.5} /> 비공개
              </div>
            )}
          </div>
        )}

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
