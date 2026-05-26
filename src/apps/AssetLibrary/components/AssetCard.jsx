// 에셋 카드 — 16:9 비율 컨테이너, 안에 contain 으로 원본 비율 유지 + 블러 배경.
import { useState } from "react";
import { Heart, Trash2, Image as ImageIcon, Clock } from "lucide-react";
import {
  getCategoryMeta,
  CATEGORY_BADGE_TONE,
  TEMP_BADGE_TONE,
  isTempAsset,
} from "../constants/categories";

export default function AssetCard({ asset, onLikeToggle, onDelete, onClick }) {
  const [hov, setHov] = useState(false);
  const meta = getCategoryMeta(asset.category);
  const temp = isTempAsset(asset);
  // hover 액센트는 카테고리 컬러 유지 — 무채색 일관성보다 카드 식별성 우선.
  const hoverAccent = meta.color;
  return (
    <div
      onClick={() => onClick?.(asset)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="group relative rounded-xl border border-white/5 bg-[#111] overflow-hidden cursor-pointer transition-all"
      style={{
        aspectRatio: "16 / 10",
        boxShadow: hov ? `0 8px 24px ${hoverAccent}22` : "none",
        borderColor: hov ? `${hoverAccent}55` : undefined,
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

      {/* 좌상단 딱지 — 카테고리(무채색) + 임시(강조). 가공 완료 시 임시 사라짐. */}
      <div className="absolute top-2 left-2 z-20 flex items-center gap-1">
        <span
          className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider"
          style={{
            background: CATEGORY_BADGE_TONE.bg,
            color: CATEGORY_BADGE_TONE.text,
            border: `1px solid ${CATEGORY_BADGE_TONE.border}`,
            backdropFilter: "blur(6px)",
          }}
        >
          {meta.name}
        </span>
        {temp && (
          <span
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider"
            style={{
              background: TEMP_BADGE_TONE.bg,
              color: TEMP_BADGE_TONE.text,
              border: `1px solid ${TEMP_BADGE_TONE.border}`,
              backdropFilter: "blur(6px)",
            }}
            title="가공 전 임시 캡처 — 원본 PNG 업로드 시 사라집니다"
          >
            <Clock size={9} />
            임시
          </span>
        )}
      </div>

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
