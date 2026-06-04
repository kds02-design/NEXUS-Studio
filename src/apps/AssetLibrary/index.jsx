// AssetLibrary — 에셋 라이브러리 앱.
// 다른 앱에서 영역 선택으로 잘라낸 이미지(타이틀/버튼/박스/아이템/아이콘)를 모아둠.
// PromptArc 와 동일한 사이드바 + 카드 그리드 구조.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Grip, LayoutGrid, Maximize2, ChevronDown, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useGlobal } from "../../context/GlobalContext";
import { useUsageGate } from "../../components/UsageGate";
import { subscribeAssets, deleteAsset, toggleAssetLike } from "./services/firebase";
import {
  ASSET_CATEGORY_LIST, getCategoryMeta, isTempAsset,
} from "./constants/categories";
import {
  ASSET_THEME_LIST, getThemeMeta,
  isAutoThemeEnabled, setAutoThemeEnabled,
} from "./constants/themes";
import AssetSidebar from "./components/AssetSidebar";
import AssetCard from "./components/AssetCard";
import AssetDetailModal from "./components/AssetDetailModal";

// source.app 사람이 읽는 라벨. 알 수 없는 키는 그대로 노출.
const SOURCE_APP_LABEL = {
  "banner-codex": "Banner Codex",
  "brand-web-review": "Brand Web Library",
  "promotion-archive": "Promotion Archive",
  "asset-library": "Asset Library",
};
const sourceAppLabel = (app) => SOURCE_APP_LABEL[app] || app || "출처 미상";
// 출처 그룹 키 — 같은 배너/프로모션에서 나온 에셋들을 묶는다.
// app 만 있고 bannerId 가 없는 옛 데이터는 app 단위로만 묶임.
const sourceGroupKey = (a) => {
  const app = a?.source?.app;
  const bid = a?.source?.bannerId;
  if (!app) return null;
  return bid ? `${app}:${bid}` : `${app}:`;
};
const sourceGroupLabel = (a) => {
  const app = a?.source?.app;
  const title = a?.source?.bannerTitle;
  if (title) return title;
  return sourceAppLabel(app);
};

// 현재 카테고리(또는 가상 필터) → 헤더 타이틀.
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
  const [category, setCategory] = useState("all"); // all / favorites / temp / uploaded / title / button / ...
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [toast, setToast] = useState(null);
  const [detail, setDetail] = useState(null); // 클릭한 에셋
  // 그리드 크기 — BannerCodex 동일 3단계.
  const [gridSize, setGridSize] = useState('medium');
  const gridMinPx = gridSize === 'small' ? 140 : gridSize === 'large' ? 320 : 220;
  // 출처(source group) / 테마(theme) 다중 선택 필터. 빈 Set = 필터 OFF.
  const [sourceFilter, setSourceFilter] = useState(() => new Set());
  const [themeFilter, setThemeFilter] = useState(() => new Set());
  const [sourceMenuOpen, setSourceMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  // AI 자동 추정 토글 — localStorage 영속화.
  const [autoTheme, setAutoTheme] = useState(() => isAutoThemeEnabled());
  const toggleAutoTheme = useCallback(() => {
    setAutoTheme((v) => { setAutoThemeEnabled(!v); return !v; });
  }, []);

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

  // detail 모달이 열려 있는 동안 구독 데이터가 갱신되면 detail 도 최신 doc 으로 따라가게 함.
  // (원본 업로드 후 isTemp/imageUrl 등 변화가 모달에 즉시 반영되도록.)
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

  // 필터링 — 카테고리 AND 출처(OR) AND 테마(OR) AND 검색.
  // 테마 필터 적용 시 theme 가 null/undefined 인 에셋은 제외 (기존 에셋이 노이즈처럼 끼지 않도록).
  const filtered = useMemo(() => {
    let list = assets;
    if (category === "favorites") list = list.filter((a) => a.liked);
    else if (category === "temp") list = list.filter((a) => isTempAsset(a));
    else if (category === "uploaded") list = list.filter((a) => !isTempAsset(a));
    else if (category !== "all") list = list.filter((a) => a.category === category);
    if (sourceFilter.size > 0) {
      list = list.filter((a) => {
        const k = sourceGroupKey(a);
        return k && sourceFilter.has(k);
      });
    }
    if (themeFilter.size > 0) {
      list = list.filter((a) => a.theme && themeFilter.has(a.theme));
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
  }, [assets, category, sourceFilter, themeFilter, searchQuery]);

  // 카테고리별 카운트
  const countByCat = useMemo(() => {
    const m = {};
    for (const a of assets) m[a.category] = (m[a.category] || 0) + 1;
    return m;
  }, [assets]);

  // 출처 그룹 목록 + 카운트 — 사이드바 카테고리 필터 적용 전 전체 기준으로 산출.
  // 그래야 카테고리 좁혀도 같은 출처에서 다른 에셋이 있는지 보이는 효과.
  const sourceGroups = useMemo(() => {
    const m = new Map(); // key -> { key, label, app, count }
    for (const a of assets) {
      const k = sourceGroupKey(a);
      if (!k) continue;
      if (m.has(k)) {
        m.get(k).count += 1;
      } else {
        m.set(k, { key: k, label: sourceGroupLabel(a), app: a.source?.app || "", count: 1 });
      }
    }
    // 라벨 사전순 정렬. 빈도 높은 게 위로 가는 게 자연스럽지만 칩이 흔들리는 게 더 거슬릴 수 있어 라벨순 유지.
    return Array.from(m.values()).sort((x, y) => x.label.localeCompare(y.label, "ko"));
  }, [assets]);

  // 테마별 카운트
  const countByTheme = useMemo(() => {
    const m = {};
    for (const a of assets) if (a.theme) m[a.theme] = (m[a.theme] || 0) + 1;
    return m;
  }, [assets]);

  const toggleSource = useCallback((key) => {
    setSourceFilter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);
  const toggleTheme = useCallback((id) => {
    setThemeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  const clearAllFilters = useCallback(() => {
    setSourceFilter(new Set());
    setThemeFilter(new Set());
  }, []);
  const hasAnyFilter = sourceFilter.size > 0 || themeFilter.size > 0;

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
        sourceRect: a.source.rect || null,
        sourceImageUrl: a.source.sourceImageUrl || null,
        returnToAssetId: a.id,
      },
      timestamp: Date.now(),
    });
    setDetail(null);
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
            <span>{headerTitleFor(category)}</span>
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

        {/* Filter chips — 출처 / 테마 다중 필터 + AI 자동 추정 토글 */}
        <div className="px-4 md:px-6 py-2 border-b border-white/5 flex items-center gap-2 flex-wrap shrink-0">
          {/* 출처 드롭다운 */}
          <div className="relative">
            <button
              onClick={() => { setSourceMenuOpen((v) => !v); setThemeMenuOpen(false); }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                sourceFilter.size > 0
                  ? "bg-white/10 border-white/20 text-white"
                  : "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/15"
              }`}
            >
              출처
              {sourceFilter.size > 0 && (
                <span className="text-[9px] px-1 rounded bg-white/20 text-white">{sourceFilter.size}</span>
              )}
              <ChevronDown className="w-3 h-3" />
            </button>
            {sourceMenuOpen && (
              <>
                <div className="fixed inset-0 z-[40]" onClick={() => setSourceMenuOpen(false)} />
                <div className="absolute left-0 top-full mt-1 z-[50] min-w-[240px] max-h-[320px] overflow-y-auto bg-[#1A1A1A] border border-white/10 rounded-lg shadow-2xl py-1">
                  {sourceGroups.length === 0 ? (
                    <div className="px-3 py-3 text-[11px] text-zinc-500">출처 정보가 있는 에셋이 없어요</div>
                  ) : (
                    sourceGroups.map((g) => {
                      const active = sourceFilter.has(g.key);
                      return (
                        <button
                          key={g.key}
                          onClick={() => toggleSource(g.key)}
                          className={`flex items-center gap-2 w-full px-3 py-1.5 text-[11px] text-left transition-colors ${
                            active ? "bg-white/10 text-white" : "text-zinc-300 hover:bg-white/5"
                          }`}
                        >
                          <span
                            className={`w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 ${
                              active ? "bg-white/80 border-white/80 text-black" : "border-white/30"
                            }`}
                          >
                            {active && <span className="text-[8px] leading-none">✓</span>}
                          </span>
                          <span className="flex-1 truncate">{g.label}</span>
                          <span className="text-[9px] text-zinc-500 shrink-0">[{sourceAppLabel(g.app).split(" ")[0]}]</span>
                          <span className="text-[9px] text-zinc-500 tabular-nums shrink-0">{g.count}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>

          {/* 테마 드롭다운 */}
          <div className="relative">
            <button
              onClick={() => { setThemeMenuOpen((v) => !v); setSourceMenuOpen(false); }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                themeFilter.size > 0
                  ? "bg-white/10 border-white/20 text-white"
                  : "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/15"
              }`}
            >
              테마
              {themeFilter.size > 0 && (
                <span className="text-[9px] px-1 rounded bg-white/20 text-white">{themeFilter.size}</span>
              )}
              <ChevronDown className="w-3 h-3" />
            </button>
            {themeMenuOpen && (
              <>
                <div className="fixed inset-0 z-[40]" onClick={() => setThemeMenuOpen(false)} />
                <div className="absolute left-0 top-full mt-1 z-[50] min-w-[180px] bg-[#1A1A1A] border border-white/10 rounded-lg shadow-2xl py-1">
                  {ASSET_THEME_LIST.map((t) => {
                    const active = themeFilter.has(t.id);
                    const cnt = countByTheme[t.id] || 0;
                    return (
                      <button
                        key={t.id}
                        onClick={() => toggleTheme(t.id)}
                        className={`flex items-center gap-2 w-full px-3 py-1.5 text-[11px] text-left transition-colors ${
                          active ? "bg-white/10 text-white" : "text-zinc-300 hover:bg-white/5"
                        }`}
                      >
                        <span
                          className={`w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 ${
                            active ? "bg-white/80 border-white/80 text-black" : "border-white/30"
                          }`}
                        >
                          {active && <span className="text-[8px] leading-none">✓</span>}
                        </span>
                        <span
                          className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                          style={{ background: t.swatch }}
                        />
                        <span className="flex-1">{t.name}</span>
                        <span className="text-[9px] text-zinc-500 tabular-nums shrink-0">{cnt}</span>
                      </button>
                    );
                  })}
                  <div className="my-1 border-t border-white/5" />
                  <label className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-zinc-400 hover:bg-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoTheme}
                      onChange={toggleAutoTheme}
                      className="accent-white/80"
                    />
                    <Sparkles className="w-3 h-3" />
                    <span className="flex-1">새 에셋 자동 추정</span>
                  </label>
                </div>
              </>
            )}
          </div>

          {/* 선택된 출처 칩 */}
          {Array.from(sourceFilter).map((key) => {
            const g = sourceGroups.find((x) => x.key === key);
            const label = g?.label || key;
            return (
              <span
                key={`src-${key}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-white/10 text-zinc-200 border border-white/10"
              >
                <span className="text-zinc-500">출처:</span>
                <span className="truncate max-w-[160px]">{label}</span>
                <button
                  onClick={() => toggleSource(key)}
                  className="ml-0.5 text-zinc-500 hover:text-white"
                  title="필터 해제"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            );
          })}

          {/* 선택된 테마 칩 */}
          {Array.from(themeFilter).map((id) => {
            const meta = getThemeMeta(id);
            if (!meta) return null;
            return (
              <span
                key={`th-${id}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-white/10 text-zinc-200 border border-white/10"
              >
                <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ background: meta.swatch }} />
                {meta.name}
                <button
                  onClick={() => toggleTheme(id)}
                  className="ml-0.5 text-zinc-500 hover:text-white"
                  title="필터 해제"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            );
          })}

          {hasAnyFilter && (
            <button
              onClick={clearAllFilters}
              className="ml-1 text-[10px] text-zinc-500 hover:text-white underline-offset-2 hover:underline"
            >
              필터 초기화
            </button>
          )}
        </div>

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
              {/* 카테고리별 요약 (전체 보기에서만) — 무채색 톤. */}
              {category === "all" && !searchQuery && (
                <div className="mb-5 flex flex-wrap gap-2">
                  {ASSET_CATEGORY_LIST.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCategory(c.id)}
                      className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08] hover:text-white transition-colors"
                    >
                      {c.name}
                      <span className="ml-1.5 text-[9px] text-zinc-500">{countByCat[c.id] || 0}</span>
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

      {/* 상세 모달 — BannerCodex CodexDetailModal 레이아웃 */}
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
                : "bg-emerald-500/90 border-emerald-400 text-white"
            }`}
          >
            {toast.msg}
          </div>
        </div>
      )}

      {/* 크레딧 부족 모달 (Gemini 분석용) */}
      {usageModal}
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
