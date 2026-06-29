// AssetLibrary — 에셋 라이브러리 앱.
// 다른 앱에서 영역 선택으로 잘라낸 이미지(타이틀/버튼/박스/아이템/아이콘)를 모아둠.
// 레이아웃: 좌측 사이드바(가상폴더+카테고리 nav) + 메인은 NEXUS 토큰 기반 단일 컬럼 카테고리 아코디언(Figma 시안).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, X, ChevronDown, Plus, Image as ImageIcon } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useGlobal } from "../../context/GlobalContext";
import { useUsageGate } from "../../components/UsageGate";
import { subscribeAssets, deleteAsset, toggleAssetLike } from "./services/firebase";
import { ASSET_CATEGORY_LIST, getCategoryMeta, isTempAsset } from "./constants/categories";
import AssetSidebar from "./components/AssetSidebar";
import AssetCard from "./components/AssetCard";
import AssetDetailModal from "./components/AssetDetailModal";
import AssetUploadModal from "./components/AssetUploadModal";

const APP_COLOR = "#55EFC4"; // asset-library app.color

// 카테고리 표시 메타 — 약자 칩 / 영문 라벨 / 설명. 색상은 ASSET_CATEGORY_LIST 에서.
const CAT_DISPLAY = {
  title:      { en: "Title",      abbr: "Ti", desc: "제목·로고 타이포" },
  button:     { en: "Button",     abbr: "Bt", desc: "CTA·탭·토글 버튼" },
  box:        { en: "Box",        abbr: "Bx", desc: "패널·프레임·말풍선" },
  item:       { en: "Item",       abbr: "It", desc: "아이템·일러스트" },
  icon:       { en: "Icon",       abbr: "Ic", desc: "아이콘·심볼·뱃지" },
  frame:      { en: "Frame",      abbr: "Fr", desc: "카드·아이템 슬롯 테두리" },
  bullet:     { en: "Bullet",     abbr: "Bu", desc: "목록·강조 마커" },
  lightfx:    { en: "Light FX",   abbr: "Lf", desc: "글로우·폭발·파티클" },
  background: { en: "Background", abbr: "Bg", desc: "패널 바탕·텍스처" },
  ornament:   { en: "Ornament",   abbr: "Or", desc: "코너·디바이더·리본" },
  etc:        { en: "Etc",        abbr: "Et", desc: "분류 미정" },
};

const isRealCategory = (id) => ASSET_CATEGORY_LIST.some((c) => c.id === id);

// 현재 선택(가상폴더 또는 카테고리) → 헤더 타이틀.
function headerTitleFor(category) {
  if (category === "all") return "전체 에셋";
  if (category === "favorites") return "즐겨찾기";
  if (category === "temp") return "임시 (가공 전)";
  if (category === "uploaded") return "업로드 완료";
  return getCategoryMeta(category).name;
}

export default function AssetLibraryApp() {
  const { user } = useAuth();
  const { navigate, payload, clearPayload } = useGlobal();
  const { ensureCanGenerate, modal: usageModal } = useUsageGate();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all"); // all/favorites/temp/uploaded/<catId>
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [catOverride, setCatOverride] = useState({}); // 카테고리 id -> 사용자가 명시 토글한 펼침 상태
  const [toast, setToast] = useState(null);
  const [detail, setDetail] = useState(null);
  const [showUpload, setShowUpload] = useState(false);

  const showToast = useCallback((msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2400);
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
    if (!payload || payload.target !== "asset-library") return;
    const id = payload.params?.openAssetId;
    if (!id) return;
    if (consumedPayloadRef.current === payload.timestamp) return;
    if (assets.length === 0) return;
    const found = assets.find((a) => a.id === id);
    if (found) {
      setDetail(found);
      consumedPayloadRef.current = payload.timestamp;
      clearPayload?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload?.timestamp, payload?.target, assets.length]);

  // detail 모달 열린 동안 구독 갱신 따라가기.
  useEffect(() => {
    if (!detail?.id) return;
    const latest = assets.find((a) => a.id === detail.id);
    if (latest && latest !== detail) setDetail(latest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets]);

  const handleSidebarClick = useCallback((e) => {
    if (e.target === e.currentTarget || e.target.tagName === "NAV") {
      setIsSidebarCollapsed((v) => !v);
    }
  }, []);

  // 가상폴더(스코프) + 검색 필터.
  // 임시 이미지는 '임시' 폴더에서만 노출 — 전체/즐겨찾기/업로드/개별 카테고리 뷰에서는 모두 제외.
  const filtered = useMemo(() => {
    let list = assets;
    if (category === "temp") {
      list = list.filter((a) => isTempAsset(a));
    } else {
      list = list.filter((a) => !isTempAsset(a));
      if (category === "favorites") list = list.filter((a) => a.liked);
      // 'uploaded' 와 'all'·개별 카테고리는 이미 비임시만 남아 추가 필터 불필요.
    }
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

  // 표시할 카테고리 — 특정 카테고리 선택 시 그것만, 아니면 전체.
  const catsToShow = useMemo(
    () => (isRealCategory(category) ? ASSET_CATEGORY_LIST.filter((c) => c.id === category) : ASSET_CATEGORY_LIST),
    [category]
  );

  // 카테고리별 그룹 (현재 필터 기준).
  const byCat = useMemo(() => {
    const m = {};
    for (const c of ASSET_CATEGORY_LIST) m[c.id] = [];
    for (const a of filtered) (m[a.category] || m.etc).push(a);
    return m;
  }, [filtered]);

  const totalCount = useMemo(
    () => catsToShow.reduce((n, c) => n + (byCat[c.id]?.length || 0), 0),
    [catsToShow, byCat]
  );

  // 사이드바 nav 카운트 — 임시 격리 규칙 반영(임시는 '임시' 폴더에만 집계).
  const navCounts = useMemo(() => {
    const nonTemp = assets.filter((a) => !isTempAsset(a));
    const m = {
      all: nonTemp.length,
      favorites: nonTemp.filter((a) => a.liked).length,
      temp: assets.filter((a) => isTempAsset(a)).length,
      uploaded: nonTemp.length,
    };
    for (const c of ASSET_CATEGORY_LIST) m[c.id] = nonTemp.filter((a) => a.category === c.id).length;
    return m;
  }, [assets]);

  // 펼침 상태 — 사용자 명시 토글 우선, 아니면 "단일 카테고리 보기는 펼침 / 그 외 매칭 있으면 펼침".
  const isCatOpen = (id) =>
    id in catOverride
      ? catOverride[id]
      : catsToShow.length === 1 || (byCat[id] || []).length > 0;
  const toggleCat = (id) =>
    setCatOverride((prev) => ({ ...prev, [id]: !isCatOpen(id) }));

  const handleDelete = async (asset) => {
    if (!confirm("이 에셋을 삭제하시겠습니까?")) return;
    try { await deleteAsset(asset.id); showToast("삭제됨"); }
    catch (e) { showToast(`삭제 실패: ${e.message}`, "error"); }
  };
  const handleLike = async (asset) => {
    try { await toggleAssetLike(asset.id, asset.liked); }
    catch (e) { showToast(`좋아요 실패: ${e.message}`, "error"); }
  };

  const handleJumpToSource = (a) => {
    if (!a.source?.app || !a.source?.bannerId) {
      showToast(
        !a.source ? "이 에셋에는 출처 정보가 없어요 (옛 데이터)"
        : !a.source.app ? "출처 앱 정보가 없어요"
        : "출처 배너 ID가 없어요",
        "error"
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
        sourceRect: a.source.rect || null,
        sourceImageUrl: a.source.sourceImageUrl || null,
        returnToAssetId: a.id,
      },
      timestamp: Date.now(),
    });
    setDetail(null);
  };

  // "에셋 추가" — 등록 모달 오픈 (로그인 필요).
  const handleAdd = () => {
    if (!user) { showToast("로그인이 필요합니다", "error"); return; }
    setShowUpload(true);
  };
  const handleSaved = (asset) => {
    setShowUpload(false);
    showToast("에셋이 등록되었습니다");
    // 저장된 위치로 이동 — 임시면 임시 폴더, 아니면 해당 카테고리.
    setCategory(asset?.isTemp ? "temp" : (asset?.category || "all"));
    setSearchQuery("");
  };

  const isEmpty = !loading && assets.length === 0;

  return (
    <div
      className="flex bg-[#0A0A0F] text-[#E8E6FF] font-sans overflow-hidden"
      style={{ height: "calc(100vh - 52px)" }}
    >
      <AssetSidebar
        isSidebarCollapsed={isSidebarCollapsed}
        handleSidebarClick={handleSidebarClick}
        category={category}
        setCategory={setCategory}
        counts={navCounts}
      />

      <main className="flex-1 my-3 mr-3 ml-3 rounded-[16px] border border-[#1E1E2E] bg-[#0A0A0F] shadow-2xl overflow-hidden flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 px-4 md:px-6 flex items-center gap-3 border-b border-[#1E1E2E] shrink-0">
          <h2 className="text-sm md:text-base font-bold text-[#E8E6FF] truncate flex items-baseline gap-2">
            <span>{headerTitleFor(category)}</span>
            <span className="text-xs text-[#7A7A9A] font-mono tabular-nums inline-block text-left shrink-0" style={{ minWidth: 32 }}>
              {totalCount}
            </span>
          </h2>

          <div className="ml-auto flex items-center gap-2 shrink-0">
            <div className="relative w-[180px] md:w-[240px] shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7A7A9A]" strokeWidth={2} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="제목/태그/출처 검색…"
                className="w-full pl-9 pr-8 py-1.5 bg-[#16161F] border border-[#1E1E2E] rounded-lg text-[#E8E6FF] text-xs outline-none placeholder:text-[#7A7A9A] focus:border-[#55EFC4]/40"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#7A7A9A] hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <button
              onClick={handleAdd}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-90 shrink-0"
              style={{ background: APP_COLOR, color: "#0A0A0F" }}
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              에셋 추가
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {loading && assets.length === 0 ? (
            <div className="text-center py-24 text-[#7A7A9A] text-sm">로딩 중…</div>
          ) : isEmpty ? (
            <EmptyState onAdd={handleAdd} />
          ) : (
            <div className="space-y-4">
              {catsToShow.map((c) => (
                <CategoryAccordion
                  key={c.id}
                  cat={c}
                  items={byCat[c.id] || []}
                  open={isCatOpen(c.id)}
                  onToggle={() => toggleCat(c.id)}
                  onAssetClick={setDetail}
                  onLike={handleLike}
                  onDelete={handleDelete}
                  onAdd={handleAdd}
                />
              ))}

              {totalCount === 0 && (
                <div className="text-center py-16 text-[#7A7A9A] text-sm">
                  조건에 맞는 에셋이 없습니다.
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* 등록 모달 */}
      {showUpload && (
        <AssetUploadModal
          user={user}
          defaultCategory={isRealCategory(category) ? category : ""}
          onClose={() => setShowUpload(false)}
          onSaved={handleSaved}
          showToast={showToast}
          ensureCanGenerate={ensureCanGenerate}
        />
      )}

      {/* 상세 모달 */}
      {detail && (
        <AssetDetailModal
          asset={detail}
          onClose={() => setDetail(null)}
          onLike={handleLike}
          onDelete={(a) => { handleDelete(a); setDetail(null); }}
          onJumpToSource={handleJumpToSource}
          user={user}
          showToast={showToast}
          ensureCanGenerate={ensureCanGenerate}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[3000] animate-in slide-in-from-bottom-4">
          <div
            className={`px-4 py-2.5 rounded-lg text-sm font-medium shadow-2xl border ${
              toast.type === "error"
                ? "bg-rose-500/90 border-rose-400 text-white"
                : "bg-[#16161F] border-[#1E1E2E] text-[#E8E6FF]"
            }`}
          >
            {toast.msg}
          </div>
        </div>
      )}

      {usageModal}
    </div>
  );
}

// 카테고리 아코디언 카드 — 헤더(약자 칩 + 이름 + 카운트 + 셰브론) + 펼침 시 타일 그리드.
function CategoryAccordion({ cat, items, open, onToggle, onAssetClick, onLike, onDelete, onAdd }) {
  const disp = CAT_DISPLAY[cat.id] || { en: cat.name, abbr: cat.name.slice(0, 2), desc: "" };
  const count = items.length;
  const color = cat.color;
  return (
    <div className="rounded-xl border border-[#1E1E2E] bg-[#111118] overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3.5 px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span
          className="w-10 h-10 rounded-[10px] flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: `${color}1f`, border: `1px solid ${color}40`, color }}
        >
          {disp.abbr}
        </span>
        <span className="flex flex-col min-w-0">
          <span className="text-[16px] font-bold text-[#E8E6FF] leading-tight">{cat.name}</span>
          <span className="text-[12px] text-[#7A7A9A] leading-tight mt-0.5 truncate">
            {disp.en} · {disp.desc}
          </span>
        </span>
        <span className="ml-auto flex items-center gap-3.5 shrink-0">
          <span
            className="px-2.5 py-1 rounded-full text-[13px] font-semibold tabular-nums"
            style={
              count
                ? { background: `${color}24`, color }
                : { background: "rgba(255,255,255,0.04)", color: "#7A7A9A" }
            }
          >
            {count}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-[#7A7A9A] transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
          />
        </span>
      </button>

      {/* Body */}
      {open && (
        <div className="px-5 pb-5 pt-0">
          <div className="border-t border-[#1E1E2E] pt-4">
            <div
              className="grid gap-3.5"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(156px, 1fr))" }}
            >
              {items.map((a) => (
                <AssetCard
                  key={a.id}
                  asset={a}
                  onClick={onAssetClick}
                  onLikeToggle={onLike}
                  onDelete={onDelete}
                />
              ))}
              <button
                onClick={onAdd}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 bg-[#0A0A0F] text-[#7A7A9A] hover:border-[#55EFC4]/40 hover:text-[#55EFC4] transition-colors"
                style={{ aspectRatio: "16 / 10" }}
                title="에셋 추가 안내"
              >
                <Plus className="w-6 h-6" strokeWidth={1.5} />
                {count === 0 && <span className="text-[11px]">에셋 없음</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
      <div className="text-[#3A3A5A]"><ImageIcon size={48} /></div>
      <div className="text-base font-bold text-[#7A7A9A]">아직 에셋이 없습니다</div>
      <div className="text-xs text-[#7A7A9A]/70 max-w-md leading-relaxed">
        Brand Web Library 또는 Banner Codex 의 상세보기에서{" "}
        <b className="text-[#55EFC4]">"에셋 추출"</b> 버튼을 누르고 타이틀/버튼/박스 등
        원하는 영역을 드래그해서 저장하세요.
      </div>
      <button
        onClick={onAdd}
        className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-bold"
        style={{ background: "#55EFC4", color: "#0A0A0F" }}
      >
        <Plus className="w-4 h-4" strokeWidth={2.5} /> 에셋 추가 방법
      </button>
    </div>
  );
}
