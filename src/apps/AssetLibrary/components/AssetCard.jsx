// 에셋 카드 — 16:9 비율 컨테이너, 안에 contain 으로 원본 비율 유지 + 블러 배경.
import { useState } from "react";
import { Heart, Trash2, ExternalLink, Image as ImageIcon } from "lucide-react";
import { getCategoryMeta } from "../constants/categories";

export default function AssetCard({ asset, onLikeToggle, onDelete, onClick }) {
  const [hov, setHov] = useState(false);
  const meta = getCategoryMeta(asset.category);
  return (
    <div
      onClick={() => onClick?.(asset)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="group relative rounded-xl border border-white/5 bg-[#111] overflow-hidden cursor-pointer transition-all"
      style={{
        aspectRatio: "16 / 10",
        boxShadow: hov ? `0 8px 24px ${meta.color}22` : "none",
        borderColor: hov ? `${meta.color}55` : undefined,
      }}
    >
      {/* 블러 배경 */}
      {asset.imageUrl && (
        <img
          src={asset.imageUrl}
          alt=""
          aria-hidden="true"
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover", filter: "blur(20px) saturate(1.1)",
            transform: "scale(1.1)", opacity: 0.5, display: "block",
          }}
        />
      )}
      {/* 원본 — contain */}
      {asset.imageUrl ? (
        <img
          src={asset.imageUrl}
          alt={asset.title || asset.category}
          loading="lazy"
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "contain", display: "block",
          }}
          onDragStart={(e) => e.preventDefault()}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-zinc-600">
          <ImageIcon size={28} />
        </div>
      )}

      {/* 카테고리 뱃지 */}
      <span
        className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider z-20"
        style={{
          background: `${meta.color}25`,
          color: meta.color,
          border: `1px solid ${meta.color}55`,
          backdropFilter: "blur(6px)",
        }}
      >
        {meta.name}
      </span>

      {/* 크기 정보 */}
      <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-mono text-white/80 bg-black/60 backdrop-blur-sm z-20">
        {asset.width || "?"}×{asset.height || "?"}
      </span>

      {/* 출처 */}
      {asset.source?.bannerTitle && (
        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[9px] text-white/70 bg-black/60 backdrop-blur-sm z-20 truncate max-w-[60%] flex items-center gap-1">
          <ExternalLink size={9} />
          {asset.source.bannerTitle}
        </span>
      )}

      {/* hover 액션 */}
      <div className="absolute top-2 right-2 z-30 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onLikeToggle?.(asset); }}
          className={`p-1.5 rounded-md backdrop-blur-sm ${
            asset.liked ? "bg-rose-500 text-white" : "bg-black/60 text-zinc-300 hover:text-rose-400"
          }`}
          title="좋아요"
        >
          <Heart size={12} fill={asset.liked ? "currentColor" : "none"} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete?.(asset); }}
          className="p-1.5 rounded-md bg-black/60 text-zinc-300 hover:text-rose-400 backdrop-blur-sm"
          title="삭제"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
