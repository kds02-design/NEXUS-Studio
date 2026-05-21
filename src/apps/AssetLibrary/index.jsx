// AssetLibrary — 에셋 라이브러리 앱.
// 다른 앱에서 영역 선택으로 잘라낸 이미지(타이틀/버튼/박스/아이템/아이콘)를 모아둠.
// PromptArc 와 동일한 사이드바 + 카드 그리드 구조.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Search, X, ExternalLink, Grip, LayoutGrid, Maximize2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useGlobal } from "../../context/GlobalContext";
import { subscribeAssets, deleteAsset, toggleAssetLike } from "./services/firebase";
import { ASSET_CATEGORY_LIST, getCategoryMeta } from "./constants/categories";
import AssetSidebar from "./components/AssetSidebar";
import AssetCard from "./components/AssetCard";

export default function AssetLibraryApp() {
  const { user } = useAuth();
  const { navigate, payload, clearPayload } = useGlobal();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all"); // all / favorites / title / button / ...
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [toast, setToast] = useState(null);
  const [detail, setDetail] = useState(null); // 클릭한 에셋
  // 그리드 크기 — BannerCodex 동일 3단계.
  const [gridSize, setGridSize] = useState('medium');
  const gridMinPx = gridSize === 'small' ? 140 : gridSize === 'large' ? 320 : 220;

  // 토스트
  const showToast = useCallback((msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2200);
  }, []);

  // 실시간 구독
  useEffect(() => {
    const unsub = subscribeAssets(
      (list) => { setAssets(list); setLoading(false); },
      (err) => { console.warn("[AssetLibrary] subscribe err", err); setLoading(false); }
    );
    return () => unsub && unsub();
  }, []);

  // 출처에서 닫고 돌아오기 — payload.params.openAssetId 가 있으면 그 asset detail 자동 오픈.
  const consumedPayloadRef = useRef(null);
  useEffect(() => {
    if (!payload || payload.target !== 'asset-library') return;
    const id = payload.params?.openAssetId;
    if (!id) return;
    if (consumedPayloadRef.current === payload.timestamp) return;
    if (assets.length === 0) return; // 구독 응답 대기
    const found = assets.find(a => a.id === id);
    if (found) {
      setDetail(found);
      consumedPayloadRef.current = payload.timestamp;
      clearPayload?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload?.timestamp, payload?.target, assets.length]);

  const handleSidebarClick = useCallback((e) => {
    if (e.target === e.currentTarget || e.target.tagName === "NAV") {
      setIsSidebarCollapsed((v) => !v);
    }
  }, []);

  // 필터링
  const filtered = useMemo(() => {
    let list = assets;
    if (category === "favorites") list = list.filter((a) => a.liked);
    else if (category !== "all") list = list.filter((a) => a.category === category);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) =>
        (a.title || "").toLowerCase().includes(q) ||
        (a.source?.bannerTitle || "").toLowerCase().includes(q) ||
        (a.tags || []).some((t) => (t || "").toLowerCase().includes(q))
      );
    }
    return list;
  }, [assets, category, searchQuery]);

  // 카테고리별 카운트
  const countByCat = useMemo(() => {
    const m = {};
    for (const a of assets) m[a.category] = (m[a.category] || 0) + 1;
    return m;
  }, [assets]);

  const handleDelete = async (asset) => {
    if (!confirm("이 에셋을 삭제하시겠습니까?")) return;
    try { await deleteAsset(asset.id); showToast("삭제됨"); }
    catch (e) { showToast(`삭제 실패: ${e.message}`, "error"); }
  };
  const handleLike = async (asset) => {
    try { await toggleAssetLike(asset.id, asset.liked); }
    catch (e) { showToast(`좋아요 실패: ${e.message}`, "error"); }
  };

  return (
    <div className="flex bg-[#0a0a0c] text-zinc-200 font-sans overflow-hidden" style={{ height: "calc(100vh - 52px)" }}>
      <AssetSidebar
        isSidebarCollapsed={isSidebarCollapsed}
        handleSidebarClick={handleSidebarClick}
        category={category}
        setCategory={setCategory}
      />

      <main className="flex-1 my-3 mr-3 ml-3 rounded-[16px] border border-zinc-800/80 bg-[#0c0c0e] shadow-2xl overflow-hidden flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 px-4 md:px-6 flex items-center gap-3 border-b border-white/5 shrink-0">
          <h2 className="text-sm md:text-base font-bold text-white truncate flex items-baseline gap-2">
            <span>{category === "all" ? "전체 에셋" : category === "favorites" ? "즐겨찾기" : getCategoryMeta(category).name}</span>
            {/* 카운트 — 폭 고정 (tabular-nums + min-w). */}
            <span className="text-xs text-zinc-500 font-mono tabular-nums inline-block text-left shrink-0" style={{ minWidth: 32 }}>{filtered.length}</span>
          </h2>

          <div className="ml-auto flex items-center gap-2 shrink-0">
            <div className="relative w-[180px] md:w-[220px] shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" strokeWidth={2} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="제목/태그/출처 검색..."
                className="w-full pl-9 pr-8 py-1.5 bg-[#121212] border border-white/10 rounded-lg text-white text-xs outline-none placeholder:text-zinc-600 focus:border-white/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {/* 그리드 토글 — BannerCodex 동일 패턴 3단계 */}
            <div className="hidden md:flex items-center bg-white/5 rounded-lg p-0.5 shrink-0">
              <button onClick={() => setGridSize('small')} title="작게"
                className={`p-1.5 rounded transition-colors ${gridSize === 'small' ? 'bg-[#1A1A1A] text-[#d8b17e]' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <Grip className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setGridSize('medium')} title="보통"
                className={`p-1.5 rounded transition-colors ${gridSize === 'medium' ? 'bg-[#1A1A1A] text-[#d8b17e]' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setGridSize('large')} title="크게"
                className={`p-1.5 rounded transition-colors ${gridSize === 'large' ? 'bg-[#1A1A1A] text-[#d8b17e]' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && assets.length === 0 ? (
            <div className="text-center py-20 text-zinc-500 text-sm">로딩 중...</div>
          ) : assets.length === 0 ? (
            <EmptyState />
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-zinc-500 text-sm">
              조건에 맞는 에셋이 없습니다.
            </div>
          ) : (
            <>
              {/* 카테고리별 요약 (전체 보기에서만) */}
              {category === "all" && !searchQuery && (
                <div className="mb-5 flex flex-wrap gap-2">
                  {ASSET_CATEGORY_LIST.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCategory(c.id)}
                      className="px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors hover:scale-105"
                      style={{
                        background: `${c.color}12`,
                        color: c.color,
                        borderColor: `${c.color}44`,
                      }}
                    >
                      {c.name}
                      <span className="ml-1.5 text-[9px] opacity-70">{countByCat[c.id] || 0}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${gridMinPx}px, 1fr))` }}>
                {filtered.map((a) => (
                  <AssetCard
                    key={a.id}
                    asset={a}
                    onClick={setDetail}
                    onLikeToggle={handleLike}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* 상세 모달 — 가벼운 lightbox */}
      {detail && (
        <DetailLightbox
          asset={detail}
          onClose={() => setDetail(null)}
          onLike={handleLike}
          onDelete={(a) => { handleDelete(a); setDetail(null); }}
          onJumpToSource={(a) => {
            // 옛 asset 호환 — source.app/bannerId 가 누락된 경우 silent fail 대신 안내.
            if (!a.source?.app || !a.source?.bannerId) {
              console.warn('[AssetLibrary] jumpToSource: missing source info', a);
              showToast(
                !a.source ? '이 에셋에는 출처 정보가 없어요 (옛 데이터)'
                : !a.source.app ? '출처 앱 정보가 없어요'
                : '출처 배너 ID가 없어요',
                'error'
              );
              return;
            }
            navigate(a.source.app, {
              source: "asset-library",
              target: a.source.app,
              prompt: { text: "", tags: [], style: "" },
              image: { url: "", metadata: {} },
              params: {
                viewBannerId: a.source.bannerId,
                // 출처로 이동 시 캡처 위치 하이라이트용 — rect 는 0-1 비율.
                sourceRect: a.source.rect || null,
                sourceImageUrl: a.source.sourceImageUrl || null,
                // 미리보기 닫을 때 다시 AssetLibrary 로 돌아오기 위한 표식.
                returnToAssetId: a.id,
              },
              timestamp: Date.now(),
            });
            setDetail(null);
          }}
          user={user}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[200] animate-in slide-in-from-bottom-4">
          <div
            className={`px-4 py-2.5 rounded-lg text-sm font-medium shadow-2xl border ${
              toast.type === "error"
                ? "bg-rose-500/90 border-rose-400 text-white"
                : "bg-emerald-500/90 border-emerald-400 text-white"
            }`}
          >
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
      <div className="text-5xl opacity-30">📦</div>
      <div className="text-base font-bold text-zinc-400">아직 에셋이 없습니다</div>
      <div className="text-xs text-zinc-600 max-w-md leading-relaxed">
        Brand Web Library 또는 Banner Codex 의 상세보기에서 <b className="text-zinc-400">"에셋 추출"</b> 버튼을 누르고
        타이틀/버튼/박스 등 원하는 영역을 드래그해서 저장하세요.
      </div>
    </div>
  );
}

function DetailLightbox({ asset, onClose, onLike: _onLike, onDelete, onJumpToSource, user }) {
  const meta = getCategoryMeta(asset.category);
  const handleDownload = async () => {
    try {
      const res = await fetch(asset.imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${asset.category}_${asset.id}.jpg`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (_e) { alert("다운로드 실패"); }
  };
  const canJump = !!(asset.source?.app && asset.source?.bannerId);
  const sourceAppLabel = asset.source?.app === "banner-codex" ? "배너 코덱스"
    : asset.source?.app === "promotion-archive" ? "Brand Web Library"
    : asset.source?.app || "";
  return (
    <div
      className="fixed top-[52px] left-0 right-0 bottom-0 z-[2000] bg-black/85 backdrop-blur-sm flex items-center justify-center p-8"
      onClick={onClose}
    >
      <div
        className="max-w-[90vw] max-h-[80vh] bg-[#111] rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider shrink-0"
              style={{ background: `${meta.color}25`, color: meta.color, border: `1px solid ${meta.color}55` }}
            >
              {meta.name}
            </span>
            <span className="text-xs text-zinc-500 font-mono shrink-0">{asset.width}×{asset.height}</span>
            {asset.source?.bannerTitle && (
              <span className="text-xs text-zinc-500 truncate">
                <span className="text-zinc-600">출처:</span> [{sourceAppLabel}] {asset.source.bannerTitle}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {canJump && (
              <button
                onClick={() => onJumpToSource(asset)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 hover:text-cyan-200 transition-colors"
                title={`${sourceAppLabel} 에서 원본 배너 열기`}
              >
                <ExternalLink size={12} /> 출처로 이동
              </button>
            )}
            <button onClick={handleDownload} className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs text-zinc-300 hover:text-white hover:bg-white/5">
              <Download size={12} /> 다운로드
            </button>
            {(user?.uid === asset.ownerUid) && (
              <button onClick={() => onDelete(asset)} className="px-2.5 py-1.5 rounded text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10">
                삭제
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded text-zinc-500 hover:text-white">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center bg-[#050505] p-6 min-h-0">
          <img
            src={asset.imageUrl}
            alt={asset.title || asset.category}
            className="max-w-full max-h-[70vh] object-contain"
            onDragStart={(e) => e.preventDefault()}
          />
        </div>
      </div>
    </div>
  );
}
