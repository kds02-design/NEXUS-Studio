import { useEffect, useMemo, useReducer, useCallback, useRef } from 'react';
import {
  X, Heart, Monitor, Smartphone, Download, Copy, Plus,
  Lock, ZoomIn, ZoomOut, Layers, Edit3,
  Signal, Wifi, Battery, Link as LinkIcon, Sparkles, Frame,
  ChevronLeft, ChevronRight, RotateCw, Star,
} from "lucide-react";
import { getWebFinalScore100, hasWebEvaluation } from '../../constants/webEvalCriteria';

const YEAR_LIST = [2026, 2025, 2024, 2023];

const initialState = {
  activeTab: "pc",
  isFullView: false,
  isActualSize: false,
  isPanning: false,
  panStart: { x: 0, y: 0, scrollLeft: 0, scrollTop: 0 },
  now: new Date(),
  isLinkInputVisible: false,
  isEditing: false,  // 편집 모드 — 헤더 우측 Edit 버튼으로 토글. OFF 면 게임/일정/제목은 읽기 전용 표시.
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_TAB": return { ...state, activeTab: action.tab, isFullView: false, isActualSize: false };
    case "TOGGLE_FULL_VIEW": return { ...state, isFullView: !state.isFullView, isActualSize: false };
    case "TOGGLE_ACTUAL_SIZE": return { ...state, isActualSize: !state.isActualSize, isPanning: false };
    case "PAN_START": return { ...state, isPanning: true, panStart: action.payload };
    case "PAN_END": return { ...state, isPanning: false };
    case "SET_NOW": return { ...state, now: action.now };
    case "SET_LINK_VISIBLE": return { ...state, isLinkInputVisible: action.value };
    case "TOGGLE_EDITING": return { ...state, isEditing: !state.isEditing };
    default: return state;
  }
}

const PreviewModal = ({
  isOpen, onClose, banner, editedBanner, onEditChange,
  onSave, hasChanges, onToggleLike, collectionIds, onToggleCollection, availableGames,
  onOpenAnalysis, gameLogos = {}, isAdminMode: _isAdminMode = false,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => dispatch({ type: "SET_NOW", now: new Date() }), 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    if (editedBanner?.promotionUrl) dispatch({ type: "SET_LINK_VISIBLE", value: true });
  }, [editedBanner?.promotionUrl]);

  const pcImage = useMemo(() => (banner?.full_image || banner?.preview || ""), [banner]);
  const moImage = useMemo(() => (banner?.mobile_image || banner?.preview || ""), [banner]);
  const formattedTime = useMemo(
    () => state.now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }),
    [state.now]
  );

  const handleCopyPath = async (text) => {
    if (!text) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        alert("경로가 복사되었습니다.");
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) alert("경로가 복사되었습니다.");
        else throw new Error('복사 실패');
      }
    } catch (_err) {
      alert("복사에 실패했습니다.");
    }
  };

  const onPointerDown = (e) => {
    if (!state.isActualSize || !scrollRef.current) return;
    scrollRef.current.setPointerCapture(e.pointerId);
    dispatch({
      type: "PAN_START",
      payload: { x: e.clientX, y: e.clientY, scrollLeft: scrollRef.current.scrollLeft, scrollTop: scrollRef.current.scrollTop }
    });
  };

  const onPointerMove = (e) => {
    if (!state.isPanning || !scrollRef.current) return;
    const dx = e.clientX - state.panStart.x;
    const dy = e.clientY - state.panStart.y;
    scrollRef.current.scrollLeft = state.panStart.scrollLeft - dx;
    scrollRef.current.scrollTop = state.panStart.scrollTop - dy;
  };

  const onPointerUp = (e) => {
    if (scrollRef.current) scrollRef.current.releasePointerCapture(e.pointerId);
    dispatch({ type: "PAN_END" });
  };

  const handleDownload = useCallback(async () => {
    const imageUrl = state.activeTab === "pc" ? pcImage : moImage;
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${banner?.title || 'image'}_${state.activeTab}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (_e) { alert("다운로드에 실패했습니다."); }
  }, [pcImage, moImage, state.activeTab, banner?.title]);

  if (!isOpen || !banner) return null;

  const labelStyle = "text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block";
  const inputStyle = "w-full bg-zinc-900 border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-zinc-300 outline-none focus:ring-0 focus:border-[#d8b17e] transition-colors";
  const hasEval = hasWebEvaluation(banner);

  return (
    <div
      className="fixed top-[52px] left-0 right-0 bottom-0 z-[2000] flex items-center justify-center p-6 sm:p-10 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <style>{`
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>

      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-6 right-6 sm:top-8 sm:right-8 p-2.5 rounded-full transition-colors z-[2010] border bg-[#1a1a1a] border-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white shadow-lg"
      >
        <X className="w-5 h-5" />
      </button>

      <div
        className="w-full max-w-[1720px] flex rounded-[24px] overflow-hidden shadow-2xl relative bg-[#0c0c0e] border border-white/10"
        style={{ height: '88vh', maxHeight: '920px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 좌측 뷰어 */}
        <div className="flex-1 relative flex flex-col h-full overflow-hidden bg-black">
          {/* 상단 컨트롤 바 */}
          <div className="w-full px-4 pt-4 pb-2 flex justify-between items-start z-50 relative gap-3">
            <div className="flex gap-1.5">
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-[11px] font-bold border bg-black/50 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 backdrop-blur-md transition-all"
              >
                <Download className="w-3.5 h-3.5" /> 이미지 저장
              </button>
              <button
                onClick={() => onToggleLike(banner?.id)}
                className={`flex items-center justify-center p-2 rounded-md border transition-all ${
                  banner?.liked
                    ? "bg-pink-500/20 text-pink-500 border-pink-500/30"
                    : "bg-black/50 text-zinc-300 border-white/10 hover:bg-white/10"
                }`}
                title="좋아요"
              >
                <Heart size={14} className={banner?.liked ? "fill-pink-500" : ""} />
              </button>
            </div>

            {/* 프레임 토글(좌) + 데스크톱/모바일 세그먼트(우) — 가로 정렬.
                프레임/원본/맞춤은 데스크톱 탭에서만 노출. */}
            <div className="flex items-center gap-2">
              {state.activeTab === "pc" && (
                <div className="inline-flex items-center gap-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-1.5 py-1 animate-in fade-in slide-in-from-left-1 duration-200">
                  <button
                    onClick={() => dispatch({ type: "TOGGLE_FULL_VIEW" })}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                      state.isFullView
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                        : "text-zinc-400 hover:text-zinc-200 border border-transparent"
                    }`}
                    title="프레임 보기 / 풀뷰"
                  >
                    <Frame size={10} />
                    {state.isFullView ? '풀뷰' : '프레임'}
                  </button>
                  {state.isFullView && (
                    <button
                      onClick={() => dispatch({ type: "TOGGLE_ACTUAL_SIZE" })}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                        state.isActualSize
                          ? "bg-orange-500/20 text-orange-300 border border-orange-500/40"
                          : "text-zinc-400 hover:text-zinc-200 border border-transparent"
                      }`}
                      title="실제 크기"
                    >
                      {state.isActualSize ? <ZoomOut size={10} /> : <ZoomIn size={10} />}
                      {state.isActualSize ? '맞춤' : '원본'}
                    </button>
                  )}
                </div>
              )}
              <div className="inline-flex items-center rounded-full bg-white/[0.06] backdrop-blur-xl border border-white/10 p-1">
                {[
                  { id: 'pc', label: '데스크톱', Icon: Monitor },
                  { id: 'mobile', label: '모바일', Icon: Smartphone },
                ].map(({ id, label, Icon }) => {
                  const isActive = state.activeTab === id;
                  return (
                    <button
                      key={id}
                      onClick={() => dispatch({ type: 'SET_TAB', tab: id })}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                        isActive
                          ? 'bg-white/15 text-white shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Icon size={13} />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="w-[120px]" />
          </div>

          {/* 본문 영역 */}
          <div className="flex-1 overflow-hidden relative w-full h-full">
            {state.activeTab === "pc" ? (
              <div
                ref={scrollRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className={`w-full h-full relative touch-none scrollbar-hide ${
                  state.isFullView
                    ? (state.isActualSize ? "overflow-auto cursor-grab active:cursor-grabbing" : "overflow-y-auto")
                    : "overflow-hidden"
                }`}
              >
                <div className={`min-h-full flex flex-col items-center justify-center transition-all duration-700 ${state.isFullView ? "p-0" : "p-8"}`}>
                  {state.isFullView ? (
                    <div className={`${state.isActualSize ? "w-max m-auto" : "w-full max-w-[1920px]"} bg-white shadow-2xl transition-all duration-300`}>
                      <img src={pcImage} alt="PC" className={`${state.isActualSize ? "w-auto max-w-none" : "w-full"} block`} draggable={false} />
                    </div>
                  ) : (
                    <div className="relative w-full max-w-[1280px] flex flex-col items-center animate-in zoom-in-95 duration-500">
                      {/* 글로우 */}
                      <div className="absolute -inset-x-10 -top-6 -bottom-20 bg-gradient-radial from-white/[0.04] to-transparent blur-2xl pointer-events-none" />

                      {/* 브라우저 윈도우 */}
                      <div className="relative z-10 w-full rounded-xl overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6),0_8px_24px_-8px_rgba(0,0,0,0.4)] border border-black/30 bg-white">
                        {/* 타이틀바 */}
                        <div className="bg-gradient-to-b from-[#e8eaed] to-[#dadce0] border-b border-black/10 px-3 pt-2.5 pb-1.5">
                          <div className="flex items-center gap-3">
                            {/* 트래픽 라이트 */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <div className="group/tl w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e0443e] shadow-inner" />
                              <div className="w-3 h-3 rounded-full bg-[#febc2e] border border-[#dea123] shadow-inner" />
                              <div className="w-3 h-3 rounded-full bg-[#28c840] border border-[#1aab29] shadow-inner" />
                            </div>
                            {/* 네비 컨트롤 */}
                            <div className="flex items-center gap-0.5 text-zinc-500 shrink-0 ml-1">
                              <button className="w-6 h-6 rounded-md hover:bg-black/5 flex items-center justify-center" tabIndex={-1}>
                                <ChevronLeft size={14} />
                              </button>
                              <button className="w-6 h-6 rounded-md hover:bg-black/5 flex items-center justify-center text-zinc-400" tabIndex={-1}>
                                <ChevronRight size={14} />
                              </button>
                              <button className="w-6 h-6 rounded-md hover:bg-black/5 flex items-center justify-center" tabIndex={-1}>
                                <RotateCw size={12} />
                              </button>
                            </div>
                            {/* URL 바 */}
                            <div className="flex-1 h-7 bg-white border border-black/10 rounded-md flex items-center px-2.5 gap-2 text-[11px] text-zinc-700 font-medium shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] min-w-0">
                              <Lock size={11} className="text-emerald-600 shrink-0" />
                              <span className="truncate">plaync.com/{banner?.game}{banner?.title ? `/${encodeURIComponent(banner.title).slice(0, 28)}` : ''}</span>
                              <Star size={11} className="text-zinc-400 shrink-0 ml-auto" />
                            </div>
                            {/* 우측 사용자 아바타 자리 */}
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#d8b17e] to-[#a8814e] shrink-0 shadow-inner border border-white/40" />
                          </div>
                          {/* 탭 영역 */}
                          <div className="flex items-end gap-1 mt-2 -mb-1.5">
                            <div className="bg-white rounded-t-md px-3 py-1 flex items-center gap-1.5 text-[10px] text-zinc-700 font-medium shadow-[inset_0_1px_0_rgba(0,0,0,0.04)] max-w-[200px]">
                              <div className="w-2.5 h-2.5 rounded-full bg-[#d8b17e]/70 shrink-0" />
                              <span className="truncate">{banner?.title || 'Promotion'}</span>
                            </div>
                            <div className="bg-black/5 rounded-t-md px-2.5 py-1 text-[10px] text-zinc-500 max-w-[140px] truncate">새 탭</div>
                          </div>
                        </div>
                        {/* 컨텐츠 */}
                        <div className="relative w-full aspect-[16/10] bg-white overflow-hidden">
                          <div className="absolute inset-0 overflow-y-auto scrollbar-hide">
                            <img src={pcImage} alt="PC" className="w-full h-auto block" draggable={false} />
                          </div>
                        </div>
                      </div>

                      {/* 책상 반사 */}
                      <div className="relative z-0 w-full max-w-[1100px] h-10 mt-1 overflow-hidden pointer-events-none opacity-50">
                        <div
                          className="w-full h-full bg-gradient-to-b from-white/10 to-transparent"
                          style={{ maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)', WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center p-8 animate-in fade-in duration-300">
                {/* 디바이스 외부 베젤 (티타늄) */}
                <div
                  className="relative rounded-[44px] p-[3px] overflow-hidden shadow-[0_30px_60px_-12px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)]"
                  style={{
                    background: 'linear-gradient(145deg, #4a4a4f 0%, #2a2a2e 35%, #1a1a1e 65%, #3a3a3e 100%)',
                    width: 360, height: 740,
                  }}
                >
                  {/* 사이드 버튼들 */}
                  <div className="absolute left-0 top-[110px] w-[3px] h-7 bg-[#1a1a1e] z-10" />
                  <div className="absolute left-0 top-[160px] w-[3px] h-12 bg-[#1a1a1e] z-10" />
                  <div className="absolute left-0 top-[220px] w-[3px] h-12 bg-[#1a1a1e] z-10" />
                  <div className="absolute right-0 top-[180px] w-[3px] h-20 bg-[#1a1a1e] z-10" />

                  {/* 디바이스 내부 베젤 (블랙) */}
                  <div className="relative w-full h-full rounded-[41px] bg-black p-[8px] overflow-hidden">
                    {/* 스크린 — isolate로 새 스택 컨텍스트 + transform으로 컴포지팅 강제 */}
                    <div
                      className="relative w-full h-full bg-white rounded-[33px] overflow-hidden isolate flex flex-col"
                      style={{ transform: 'translateZ(0)' }}
                    >
                      {/* 컨텐츠 영역 — 스테이터스 바 아래로 스크롤 */}
                      <div className="absolute inset-0 overflow-y-auto bg-white pt-[44px] pb-[24px] scrollbar-hide">
                        <img src={moImage} alt="Mobile" className="w-full h-auto block" draggable={false} />
                      </div>
                      {/* 스테이터스 바 (고정) */}
                      <div className="absolute top-0 left-0 right-0 h-[44px] z-40 bg-white flex justify-between items-center pt-[14px] px-7 text-black text-[11px] font-semibold pointer-events-none">
                        <span className="tabular-nums">{formattedTime}</span>
                        <div className="flex items-center gap-1.5">
                          <Signal size={11} strokeWidth={2.5} />
                          <Wifi size={11} strokeWidth={2.5} />
                          <Battery size={14} strokeWidth={2.2} />
                        </div>
                      </div>
                      {/* Dynamic Island (고정) */}
                      <div className="absolute top-[10px] left-1/2 -translate-x-1/2 w-[110px] h-[32px] bg-black rounded-full z-50 shadow-[inset_0_0_0_1px_rgba(40,40,40,0.8)]" />
                      {/* 홈 인디케이터 (고정) */}
                      <div className="absolute bottom-0 left-0 right-0 h-[20px] z-40 bg-white flex items-center justify-center pointer-events-none">
                        <div className="w-[120px] h-[5px] bg-black/80 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 우측 사이드바 — BannerCodex CodexDetailModal 패턴 */}
        <aside className="w-[340px] shrink-0 flex flex-col h-full shadow-2xl bg-[#111111] border-l border-white/5 relative">
          <div className="flex-1 overflow-y-auto scrollbar-hide p-6 pt-7 pb-20">

            {/* 헤더 — 게임 로고 + 제목 + (날짜는 제목 아래 한 곳에서만) */}
            <div className="flex items-center gap-3 mb-5">
              {/* 게임 로고 — BannerCodex 와 동일한 settings/gameLogos 컬렉션 공유. 없으면 첫 글자. */}
              <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 overflow-hidden border bg-black border-zinc-800 text-white">
                {gameLogos[editedBanner?.game]
                  ? <img src={gameLogos[editedBanner?.game]} alt={editedBanner?.game} className="w-full h-full object-cover" />
                  : <span className="text-xl font-bold">{editedBanner?.game ? editedBanner.game.substring(0, 1) : '?'}</span>}
              </div>
              <div className="flex-1 min-w-0">
                {state.isEditing ? (
                  <div className="space-y-2">
                    <input type="text" value={editedBanner?.title || ""} onChange={(e) => onEditChange("title", e.target.value)}
                      className="w-full text-base font-bold px-2 py-1.5 border rounded-lg bg-zinc-900 border-zinc-700 text-white focus:border-[#d8b17e] focus:outline-none transition-colors"
                      placeholder="배너 제목" />
                    <div className="flex gap-1.5">
                      <select value={editedBanner?.year || 2026} onChange={(e) => onEditChange("year", Number(e.target.value))}
                        className="flex-1 text-xs px-2 py-1.5 border rounded-lg bg-zinc-900 border-zinc-700 text-white focus:border-[#d8b17e] focus:outline-none">
                        {YEAR_LIST.map(y => <option key={`year-${y}`} value={y}>{y}년</option>)}
                      </select>
                      <select value={editedBanner?.month || 1} onChange={(e) => onEditChange("month", Number(e.target.value))}
                        className="w-[72px] text-xs px-2 py-1.5 border rounded-lg bg-zinc-900 border-zinc-700 text-white focus:border-[#d8b17e] focus:outline-none">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                          <option key={`month-${m}`} value={m}>{m}월</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-lg font-bold leading-tight mb-1.5 break-words pr-2 text-white" title={editedBanner?.title}>
                      {editedBanner?.title || "(제목 없음)"}
                    </h2>
                    <div className="text-[11px] font-medium text-zinc-500">
                      {editedBanner?.year || "-"}년 {editedBanner?.month ? `${editedBanner.month}월` : ""}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 액션 버튼 행 — 컬렉션 → Edit → 좋아요. Edit 은 좋아요 바로 왼쪽. 40x40 원형 패턴. */}
            <div className="flex items-center gap-2 mb-8 border-b border-white/5 pb-8">
              <button onClick={() => onToggleCollection(banner?.id)}
                className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${
                  collectionIds.includes(banner?.id)
                    ? "bg-[#d8b17e] text-black border-[#d8b17e]"
                    : "border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
                title="컬렉션에 담기">
                <Layers className="w-4 h-4" />
              </button>
              <button onClick={() => dispatch({ type: "TOGGLE_EDITING" })}
                className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${
                  state.isEditing
                    ? "bg-[#d8b17e] text-black border-[#d8b17e]"
                    : "border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
                title="속성 직접 편집">
                <Edit3 className="w-4 h-4" />
              </button>
              <button onClick={() => onToggleLike(banner?.id)}
                className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${
                  banner?.liked
                    ? "bg-pink-500/10 text-pink-400 border-pink-500/30"
                    : "border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
                title="좋아요">
                <Heart className={`w-4 h-4 ${banner?.liked ? "fill-pink-500" : ""}`} />
              </button>
            </div>

            {/* Game — 표시: chip(태그와 다른 #d8b17e 컬러) / 편집: select */}
            <div className="mb-5 pb-5 border-b border-white/5">
              <label className={labelStyle}>Game</label>
              {state.isEditing ? (
                <select className={inputStyle} value={editedBanner?.game || ""} onChange={(e) => onEditChange("game", e.target.value)}>
                  {availableGames?.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              ) : (
                editedBanner?.game ? (
                  <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-bold rounded border bg-[#d8b17e]/15 text-[#d8b17e] border-[#d8b17e]/40">
                    {editedBanner.game}
                  </span>
                ) : (
                  <span className="text-[11px] text-zinc-600">미지정</span>
                )
              )}
            </div>

            {/* Tags — 표시: chip / 편집: chip + X + new input */}
            <div className="mb-5 pb-5 border-b border-white/5">
              <label className={labelStyle}>Tags</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {editedBanner?.tags?.map((tag, idx) => (
                  <span key={`tag-${tag}-${idx}`} className="flex items-center gap-1 px-1.5 py-0.5 text-zinc-400 text-[10px] font-bold border border-white/10 rounded hover:text-zinc-200">
                    #{tag}
                    {state.isEditing && (
                      <X size={9} className="cursor-pointer hover:text-red-400"
                        onClick={() => onEditChange("tags", editedBanner.tags.filter(t => t !== tag))} />
                    )}
                  </span>
                ))}
                {(!editedBanner?.tags || editedBanner.tags.length === 0) && !state.isEditing && (
                  <span className="text-[11px] text-zinc-600">없음</span>
                )}
              </div>
              {state.isEditing && (
                <input className="w-full bg-transparent border-0 border-b border-white/5 focus:border-[#d8b17e] outline-none px-0 py-1 text-[11px] text-zinc-300 placeholder:text-zinc-600 transition-colors"
                  placeholder="New tag…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.target.value.trim()) {
                      onEditChange("tags", [...(editedBanner?.tags || []), e.target.value.trim()]);
                      e.target.value = "";
                    }
                  }} />
              )}
            </div>

            {/* Asset Path — 박스 유지 + 카피 버튼 컬러 액센트 */}
            <div className="mb-5 pb-5 border-b border-white/5">
              <label className={labelStyle}>Asset Path</label>
              <div className="flex gap-1.5">
                <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-md px-2.5 py-2 text-[10px] text-zinc-500 font-mono break-all leading-relaxed">
                  {banner?.path || '경로 없음'}
                </div>
                <button onClick={() => handleCopyPath(banner?.path)}
                  className="p-1.5 rounded-md text-[#d8b17e] bg-[#d8b17e]/10 border border-[#d8b17e]/40 hover:bg-[#d8b17e] hover:text-black transition-colors self-start shrink-0"
                  title="경로 복사">
                  <Copy size={12} />
                </button>
              </div>
            </div>

            {/* Upload + Link */}
            <div className="mb-5 pb-5 border-b border-white/5 space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Initial Upload</label>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {banner?.created_at ? new Date(banner.created_at).toLocaleDateString() : "-"}
                </span>
              </div>
              <div>
                <label className={labelStyle}>Promotion Page Link</label>
                {(state.isLinkInputVisible || editedBanner?.promotionUrl) ? (
                  <div className="relative">
                    <LinkIcon className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-500" size={12} />
                    <input
                      className="w-full bg-transparent border-0 border-b border-white/5 focus:border-[#d8b17e] outline-none pl-5 py-1 text-[11px] text-zinc-300 placeholder:text-zinc-600 transition-colors disabled:cursor-not-allowed"
                      placeholder="https://…"
                      value={editedBanner?.promotionUrl || ""}
                      onChange={(e) => onEditChange("promotionUrl", e.target.value)}
                      disabled={!state.isEditing}
                    />
                  </div>
                ) : (
                  <button onClick={() => state.isEditing && dispatch({ type: "SET_LINK_VISIBLE", value: true })}
                    disabled={!state.isEditing}
                    className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-[#d8b17e] disabled:opacity-50 disabled:hover:text-zinc-500 transition-colors">
                    <Plus size={12} /> URL 추가
                  </button>
                )}
              </div>
            </div>

            {/* AI 디자인 분석 — 명확한 버튼 (border + hover bg) */}
            <button onClick={() => onOpenAnalysis?.(banner)}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/[0.02] hover:border-[#d8b17e]/50 hover:bg-[#d8b17e]/5 transition-all group">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-zinc-500 group-hover:text-[#d8b17e] transition-colors" />
                <span className="text-xs font-bold text-zinc-300 group-hover:text-white transition-colors">AI 디자인 분석</span>
              </div>
              {hasEval ? (
                <div className="text-2xl font-black text-[#d8b17e] font-mono tracking-tighter leading-none">
                  {getWebFinalScore100(banner)}
                </div>
              ) : (
                <span className="text-[10px] font-medium text-zinc-500 tracking-wider group-hover:text-zinc-300 transition-colors">미분석 ›</span>
              )}
            </button>
          </div>

          {/* 변경사항 저장 바 */}
          {hasChanges && (
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5 bg-[#111111]/95 backdrop-blur flex gap-2 shrink-0">
              <button
                onClick={() => onEditChange("reset", banner)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 transition-colors"
              >
                취소
              </button>
              <button
                onClick={onSave}
                className="flex-[2] py-2.5 rounded-xl text-xs font-black bg-[#d8b17e] hover:bg-[#e2c08e] text-black transition-colors shadow-lg shadow-[#d8b17e]/20"
              >
                저장하기
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default PreviewModal;
