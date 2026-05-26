import { useEffect, useMemo, useReducer, useCallback, useRef, useState } from 'react';
import {
  X, Heart, Monitor, Smartphone, Download, Copy, Check, Plus,
  ZoomIn, ZoomOut, Layers, Edit3, Scissors,
  Signal, Wifi, Battery, Link as LinkIcon, Sparkles, Frame,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Star, Trash2, Repeat,
} from "lucide-react";
import { getWebFinalScore100, hasWebEvaluation } from '../../constants/webEvalCriteria';
import RegionPicker from '../../../AssetLibrary/components/RegionPicker';

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
    case "SET_TAB": return { ...state, activeTab: action.tab };
    case "TOGGLE_FULL_VIEW": return { ...state, isFullView: !state.isFullView, isActualSize: false };
    case "SET_FULL_VIEW": return { ...state, isFullView: !!action.value, isActualSize: false };
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
  jumpHighlight, onJumpHandled, // { rect:{x,y,w,h} 0-1, imageUrl? } | null
  returnTo, // { app, label } | null — 닫기 시 돌아갈 곳 (시각 힌트용)
  onAddMobilePages, // (files: FileList) => Promise<void> — 브랜드웹에 모바일 페이지 추가 업로드
  onSetMainPage,    // (pageId) => void — 그리드 카드의 메인으로 지정 (재클릭 시 해제)
  onSetSubPage,     // (pageId) => void — 그리드 카드의 서브로 지정
  onDeletePage,     // (pageId) => void — 페이지 삭제
  onReplacePage,    // (pageId, file: File) => void — 페이지 이미지 교체
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const scrollRef = useRef(null);
  // 경로 복사 후 1.5초 동안 버튼에 체크 + "복사됨" 표시.
  const [pathCopied, setPathCopied] = useState(false);
  const copyResetRef = useRef(null);
  // 에셋 추출 모드 — true 일 때 RegionPicker 오버레이 활성화.
  const [pickMode, setPickMode] = useState(false);
  const [pickToast, setPickToast] = useState(null);
  const showPickToast = (msg, type = "info") => {
    setPickToast({ msg, type });
    setTimeout(() => setPickToast(null), 2000);
  };

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => dispatch({ type: "SET_NOW", now: new Date() }), 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    if (editedBanner?.promotionUrl) dispatch({ type: "SET_LINK_VISIBLE", value: true });
  }, [editedBanner?.promotionUrl]);

  // ─── 브랜드웹 페이지 navigator — pages[] 가 있으면 device 별 페이지 인덱스로 이미지 결정 ───
  const isBrandWeb = banner?.assetType === '브랜드웹' && Array.isArray(banner?.pages) && banner.pages.length > 0;
  const pcPages = useMemo(() => (isBrandWeb ? banner.pages.filter(p => p.device === 'pc') : []), [isBrandWeb, banner]);
  const moPages = useMemo(() => (isBrandWeb ? banner.pages.filter(p => p.device === 'mobile') : []), [isBrandWeb, banner]);
  const [pcPageIdx, setPcPageIdx] = useState(0);
  const [moPageIdx, setMoPageIdx] = useState(0);
  // 페이지 인덱스 reset — banner 가 바뀌면(다른 카드 열기) 0 으로.
  useEffect(() => { setPcPageIdx(0); setMoPageIdx(0); }, [banner?.id]);

  // 페이지 네비게이터 접기/펴기 — 모바일 뷰 하단과 겹치는 경우 사용자가 직접 숨길 수 있도록.
  // localStorage 영속화 (다음 진입 시 마지막 상태 복원).
  const [isPagerCollapsed, setIsPagerCollapsed] = useState(() => {
    try { return localStorage.getItem("pa:pager-collapsed") === "1"; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem("pa:pager-collapsed", isPagerCollapsed ? "1" : "0"); } catch { /* ignore */ }
  }, [isPagerCollapsed]);

  // 브랜드웹 — 한 페이지씩 cross-fade 전환 (패럴렉스). wheel/key 이벤트로 다음/이전 페이지.
  // 디바운스 락으로 한 번에 한 페이지씩만 이동.
  const wheelLockRef = useRef(0);
  const replacePageFileRef = useRef(null);
  const replacePageTargetRef = useRef(null);
  const handlePageWheel = useCallback((e) => {
    if (!isBrandWeb) return;
    const list = state.activeTab === 'pc' ? pcPages : moPages;
    const idx = state.activeTab === 'pc' ? pcPageIdx : moPageIdx;
    const setIdx = state.activeTab === 'pc' ? setPcPageIdx : setMoPageIdx;
    if (list.length <= 1) return;
    // isActualSize 면 페이지 안의 스크롤이 필요하니 패럴렉스 비활성.
    if (state.isActualSize) return;
    if (Date.now() < wheelLockRef.current) { e.preventDefault?.(); return; }
    const dir = e.deltaY > 0 ? 1 : -1;
    const next = Math.max(0, Math.min(list.length - 1, idx + dir));
    if (next !== idx) {
      e.preventDefault?.();
      setIdx(next);
      wheelLockRef.current = Date.now() + 550; // transition 시간 + 여유
    }
  }, [isBrandWeb, state.activeTab, state.isActualSize, pcPages, moPages, pcPageIdx, moPageIdx]);
  // 키보드 ←/→ ↑/↓ 도 지원.
  useEffect(() => {
    if (!isOpen || !isBrandWeb) return;
    const onKey = (e) => {
      const list = state.activeTab === 'pc' ? pcPages : moPages;
      const idx = state.activeTab === 'pc' ? pcPageIdx : moPageIdx;
      const setIdx = state.activeTab === 'pc' ? setPcPageIdx : setMoPageIdx;
      if (list.length <= 1) return;
      const fwd = e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown';
      const bwd = e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp';
      if (!fwd && !bwd) return;
      e.preventDefault();
      setIdx(Math.max(0, Math.min(list.length - 1, idx + (fwd ? 1 : -1))));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isBrandWeb, state.activeTab, pcPages, moPages, pcPageIdx, moPageIdx]);

  const pcImage = useMemo(() => {
    if (isBrandWeb) return pcPages[pcPageIdx]?.url || pcPages[0]?.url || banner?.preview || "";
    return banner?.full_image || banner?.preview || "";
  }, [isBrandWeb, pcPages, pcPageIdx, banner]);
  const moImage = useMemo(() => {
    if (isBrandWeb) return moPages[moPageIdx]?.url || moPages[0]?.url || banner?.preview || "";
    return banner?.mobile_image || banner?.preview || "";
  }, [isBrandWeb, moPages, moPageIdx, banner]);

  // ─── 출처로 이동(jumpHighlight) — sourceImageUrl 기준으로 PC/Mobile 탭 결정 후 풀뷰 + 스크롤 + 펄스 ───
  const [highlightActive, setHighlightActive] = useState(false);
  // 1단계: jumpHighlight 받으면 풀뷰 + 탭 결정 + 브랜드웹은 해당 페이지로 이동.
  useEffect(() => {
    if (!isOpen || !jumpHighlight?.rect) return;
    const imgUrl = jumpHighlight.imageUrl;
    // 브랜드웹 — pages[] 안에서 url 매칭으로 PC/Mobile + page idx 결정.
    if (isBrandWeb && imgUrl) {
      const pcIdx = pcPages.findIndex((p) => p.url === imgUrl);
      const moIdx = moPages.findIndex((p) => p.url === imgUrl);
      if (pcIdx >= 0) {
        dispatch({ type: "SET_TAB", tab: "pc" });
        setPcPageIdx(pcIdx);
      } else if (moIdx >= 0) {
        dispatch({ type: "SET_TAB", tab: "mobile" });
        setMoPageIdx(moIdx);
      } else {
        // url 매칭 실패 — 폴백: mobile_image 비교로만 탭 결정.
        const isMobileFallback = banner?.mobile_image && imgUrl === banner.mobile_image;
        dispatch({ type: "SET_TAB", tab: isMobileFallback ? "mobile" : "pc" });
      }
      dispatch({ type: "SET_FULL_VIEW", value: true });
      console.log('[PreviewModal] jumpHighlight (brandweb)', { rect: jumpHighlight.rect, pcIdx, moIdx });
      return;
    }
    // 일반 배너 — 기존 동작 (mobile_image 비교).
    const isMobile = imgUrl && banner?.mobile_image && imgUrl === banner.mobile_image;
    dispatch({ type: "SET_TAB", tab: isMobile ? "mobile" : "pc" });
    dispatch({ type: "SET_FULL_VIEW", value: true });
    console.log('[PreviewModal] jumpHighlight received', { rect: jumpHighlight.rect, tab: isMobile ? 'mobile' : 'pc' });
  }, [isOpen, jumpHighlight?.rect?.x, jumpHighlight?.rect?.y, jumpHighlight?.imageUrl, banner?.mobile_image, isBrandWeb, pcPages, moPages]);

  // 2단계: 풀뷰가 켜진 후 scrollRef 가 새 모드로 마운트되면 스크롤 + 하이라이트 시작.
  // state.isFullView / state.activeTab 변화를 기다림 → stale ref 회피.
  useEffect(() => {
    if (!jumpHighlight?.rect || !state.isFullView) return;
    setHighlightActive(true);
    let cancelled = false;
    const doScroll = () => {
      const sc = scrollRef.current;
      if (!sc) { console.warn('[PreviewModal] scrollRef not mounted yet'); return; }
      const targetY = jumpHighlight.rect.y * sc.scrollHeight;
      const scrollTop = Math.max(0, targetY - sc.clientHeight * 0.3);
      sc.scrollTo({ top: scrollTop, behavior: 'smooth' });
      console.log('[PreviewModal] scrollTo', { scrollHeight: sc.scrollHeight, targetY, scrollTop });
    };
    // 1차: 다음 RAF — DOM 업데이트 직후.
    const raf = requestAnimationFrame(() => {
      if (cancelled) return;
      doScroll();
      // 2차: 이미지 로드 후 scrollHeight 가 정확해진 시점에 보정.
      setTimeout(() => { if (!cancelled) doScroll(); }, 500);
    });
    // 4초 후 펄스 종료 + 부모에 알림.
    const fadeTimer = setTimeout(() => {
      setHighlightActive(false);
      onJumpHandled?.();
    }, 4000);
    return () => { cancelled = true; cancelAnimationFrame(raf); clearTimeout(fadeTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isFullView, state.activeTab, jumpHighlight?.rect?.x, jumpHighlight?.rect?.y]);

  // 캡처 위치 박스 — 풀뷰의 이미지 부모에 absolute 로 렌더. rect 비율 그대로 % 단위.
  const HighlightBox = ({ rect }) => (
    <div
      className="absolute pointer-events-none border-[3px] border-[#d8b17e] rounded-md z-30"
      style={{
        left: `${rect.x * 100}%`,
        top: `${rect.y * 100}%`,
        width: `${rect.w * 100}%`,
        height: `${rect.h * 100}%`,
        boxShadow: '0 0 0 9999px rgba(0,0,0,0.45), 0 0 24px rgba(216,177,126,0.7)',
        animation: 'highlightPulse 1.2s ease-in-out infinite',
      }}
    />
  );
  const formattedTime = useMemo(
    () => state.now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }),
    [state.now]
  );

  // 복사 성공 시 alert 대신 버튼 자체에 인라인 피드백.
  const handleCopyPath = async (text) => {
    if (!text) return;
    const flashCopied = () => {
      setPathCopied(true);
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
      copyResetRef.current = setTimeout(() => setPathCopied(false), 1500);
    };
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        flashCopied();
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
        if (successful) flashCopied();
        else throw new Error('복사 실패');
      }
    } catch (_err) {
      // 실패 시에도 alert 대신 조용히 처리 — 콘솔에만 흔적.
      console.warn('[PreviewModal] 경로 복사 실패', _err);
    }
  };

  // 언마운트 / 모달 닫힘 시 타이머 정리.
  useEffect(() => () => { if (copyResetRef.current) clearTimeout(copyResetRef.current); }, []);

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

  const labelStyle = "text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block";
  const inputStyle = "w-full bg-zinc-900 border border-zinc-700 rounded-md px-2.5 py-1.5 text-[13px] text-zinc-300 outline-none focus:ring-0 focus:border-[#d8b17e] transition-colors";
  const hasEval = hasWebEvaluation(banner);

  return (
    <div
      className="fixed top-[52px] left-0 right-0 bottom-0 z-[2000] flex items-center justify-center p-6 sm:p-10 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <style>{`
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        @keyframes highlightPulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.015); }
        }
      `}</style>

      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        title={returnTo ? `${returnTo.label}로 돌아가기` : '닫기'}
        className={`absolute top-6 right-6 sm:top-8 sm:right-8 flex items-center gap-2 rounded-full transition-colors z-[2010] border shadow-lg ${
          returnTo
            ? 'pl-3 pr-3.5 py-2 bg-[#d8b17e]/15 border-[#d8b17e]/50 text-[#d8b17e] hover:bg-[#d8b17e]/25'
            : 'p-2.5 bg-[#1a1a1a] border-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
        }`}
      >
        {returnTo && <ChevronLeft className="w-4 h-4" />}
        <X className="w-5 h-5" />
        {returnTo && <span className="text-[11px] font-bold whitespace-nowrap">{returnTo.label}</span>}
      </button>

      <div
        className="w-full max-w-[1720px] flex rounded-[24px] overflow-hidden shadow-2xl relative bg-[#0c0c0e] border border-white/10"
        style={{ height: '88vh', maxHeight: '920px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 좌측 뷰어 */}
        <div className="flex-1 relative flex flex-col h-full overflow-hidden bg-black">
          {/* 상단 컨트롤 바 — 좌(액션) / 중앙 absolute(프레임 + 데스크톱/모바일 탭) 레이아웃.
              justify-between 으로 우측에 붙던 탭을 absolute 중앙으로 옮겨 좌측 버튼 폭과 무관하게 정중앙 고정. */}
          <div className="w-full px-4 pt-4 pb-2 flex items-start z-50 relative gap-3">
            <div className="flex gap-1.5">
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-[11px] font-bold border bg-black/50 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 backdrop-blur-md transition-all"
              >
                <Download className="w-3.5 h-3.5" /> 이미지 저장
              </button>
              <button
                onClick={() => setPickMode((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-[11px] font-bold border backdrop-blur-md transition-all ${
                  pickMode
                    ? 'bg-cyan-500/25 border-cyan-400/60 text-cyan-200'
                    : 'bg-black/50 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10'
                }`}
                title="이미지에서 타이틀/버튼/박스 영역을 드래그로 잘라 에셋 라이브러리에 저장"
              >
                <Scissors className="w-3.5 h-3.5" /> {pickMode ? '에셋 추출 ON' : '에셋 추출'}
              </button>
            </div>

            {/* 프레임 아이콘 토글 — ON 이면 데스크톱은 브라우저 윈도우, 모바일은 폰 베젤이 함께 적용.
                OFF 이면 둘 다 raw 이미지(풀뷰). 활성 시 시안 액센트로 강조.
                원본/맞춤은 풀뷰(OFF) 상태에서만 노출. */}
            <div className="absolute left-1/2 -translate-x-1/2 top-4 flex items-center gap-2">
              <div className="inline-flex items-center gap-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-1.5 py-1">
                <button
                  onClick={() => dispatch({ type: "TOGGLE_FULL_VIEW" })}
                  className={`flex items-center justify-center w-7 h-7 rounded-full transition-all ${
                    !state.isFullView
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "text-zinc-400 hover:text-zinc-200 border border-transparent"
                  }`}
                  title={state.isFullView ? "프레임 켜기" : "프레임 끄기 (풀뷰)"}
                  aria-pressed={!state.isFullView}
                >
                  <Frame size={12} />
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
            {/* 브랜드웹 페이지 navigator — 이미지 영역 중앙 하단 floating. CodexDetailModal 줌 슬라이더 디자인 차용.
                isPagerCollapsed === true 면 작은 칩(페이지 N/M + 펼치기 화살표)만 노출 — 모바일 뷰와 겹침 회피. */}
            {isBrandWeb && (() => {
              const list = state.activeTab === 'pc' ? pcPages : moPages;
              const idx = state.activeTab === 'pc' ? pcPageIdx : moPageIdx;
              const setIdx = state.activeTab === 'pc' ? setPcPageIdx : setMoPageIdx;
              const currentPage = list[idx];
              const isMain = currentPage && banner?.mainPageId === currentPage.id;
              const isSub = currentPage && banner?.subPageId === currentPage.id;
              if (list.length <= 1 && !onSetMainPage) return null;
              // 접혔을 때 — 작은 칩만 표시. 좌우 화살표/페이지 카운트 + 펼치기.
              if (isPagerCollapsed) {
                return (
                  <div
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 z-[510] px-2 py-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-full shadow-lg"
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                  >
                    {list.length > 1 && (
                      <>
                        <button onClick={() => { const i = Math.max(0, idx - 1); setIdx(i); }} disabled={idx <= 0}
                          title="이전 페이지"
                          className="w-6 h-6 flex items-center justify-center rounded-full text-white hover:bg-white/10 disabled:opacity-25 disabled:cursor-not-allowed">
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                        <span className="text-[10px] font-bold text-white tabular-nums min-w-[36px] text-center">
                          {idx + 1} <span className="text-white/40">/</span> {list.length}
                        </span>
                        <button onClick={() => { const i = Math.min(list.length - 1, idx + 1); setIdx(i); }} disabled={idx >= list.length - 1}
                          title="다음 페이지"
                          className="w-6 h-6 flex items-center justify-center rounded-full text-white hover:bg-white/10 disabled:opacity-25 disabled:cursor-not-allowed">
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </>
                    )}
                    <button onClick={() => setIsPagerCollapsed(false)}
                      title="페이지 컨트롤 펼치기"
                      className="w-6 h-6 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10">
                      <ChevronUp className="w-3 h-3" />
                    </button>
                  </div>
                );
              }
              return (
                <div
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-[510] px-2.5 py-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-full shadow-lg"
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  {/* 접기 — 좌측 끝에 한 번 노출. 클릭하면 작은 칩으로 축소. */}
                  <button onClick={() => setIsPagerCollapsed(true)}
                    title="페이지 컨트롤 접기"
                    className="w-7 h-7 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-5 bg-white/15" />
                  {/* 메인/서브 지정 + 교체/삭제 — 현재 페이지에 대해 */}
                  {currentPage && onSetMainPage && (
                    <>
                      <button
                        onClick={() => onSetMainPage(currentPage.id)}
                        title={isMain ? '메인 해제' : '카드 메인 이미지로 지정'}
                        className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                          isMain
                            ? 'bg-[#d8b17e] text-black'
                            : 'text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <Star className="w-3.5 h-3.5" fill={isMain ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        onClick={() => onSetSubPage(currentPage.id)}
                        title={isSub ? '서브 해제' : '카드 서브 이미지로 지정'}
                        className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                          isSub
                            ? 'bg-white/25 text-white'
                            : 'text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                      </button>
                      {(onReplacePage || onDeletePage) && <div className="w-px h-5 bg-white/15" />}
                      {/* 교체 — 현재 페이지의 이미지를 다른 파일로 */}
                      {onReplacePage && (
                        <button
                          onClick={() => { replacePageTargetRef.current = currentPage.id; replacePageFileRef.current?.click(); }}
                          title="이 페이지 이미지 교체"
                          className="w-7 h-7 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <Repeat className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {/* 삭제 — 페이지가 1장 이하면 비활성 */}
                      {onDeletePage && (
                        <button
                          onClick={() => onDeletePage(currentPage.id)}
                          disabled={list.length <= 1}
                          title={list.length <= 1 ? '마지막 페이지는 삭제할 수 없습니다' : '이 페이지 삭제'}
                          className="w-7 h-7 flex items-center justify-center rounded-full text-white/70 hover:text-rose-400 hover:bg-rose-500/15 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {list.length > 1 && <div className="w-px h-5 bg-white/15" />}
                    </>
                  )}
                  {list.length > 1 && (
                    <>
                      <button
                        onClick={() => { const i = Math.max(0, idx - 1); setIdx(i) }}
                        disabled={idx <= 0}
                        title="이전 페이지"
                        className="w-7 h-7 flex items-center justify-center rounded-full text-white hover:bg-white/10 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[11px] font-bold text-white tabular-nums shrink-0 min-w-[36px] text-center">
                        {idx + 1} <span className="text-white/40">/</span> {list.length}
                      </span>
                      {/* 줌 슬라이더와 동일한 트랙 + thumb 스타일 */}
                      <div className="relative flex items-center w-[100px] md:w-[120px] h-11" style={{ touchAction: 'none' }}>
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[5px] bg-white/15 rounded-full pointer-events-none" />
                        <input
                          type="range"
                          min="1"
                          max={list.length}
                          step="1"
                          value={idx + 1}
                          onChange={(e) => {
                            const i = Math.max(0, Math.min(list.length - 1, parseInt(e.target.value, 10) - 1));
                            setIdx(i);
                            if (state.isFullView) scrollToPage(state.activeTab, i);
                          }}
                          style={{ touchAction: 'none' }}
                          className="w-full h-full bg-transparent appearance-none cursor-pointer outline-none relative z-10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-11 [&::-webkit-slider-thumb]:h-11 [&::-webkit-slider-thumb]:bg-[#d8b17e] [&::-webkit-slider-thumb]:bg-clip-content [&::-webkit-slider-thumb]:p-[10px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-grab active:[&::-webkit-slider-thumb]:cursor-grabbing active:[&::-webkit-slider-thumb]:scale-110 [&::-moz-range-thumb]:w-11 [&::-moz-range-thumb]:h-11 [&::-moz-range-thumb]:bg-[#d8b17e] [&::-moz-range-thumb]:bg-clip-content [&::-moz-range-thumb]:p-[10px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:shadow-lg active:[&::-moz-range-thumb]:scale-110 transition-transform"
                        />
                      </div>
                      <button
                        onClick={() => { const i = Math.min(list.length - 1, idx + 1); setIdx(i) }}
                        disabled={idx >= list.length - 1}
                        title="다음 페이지"
                        className="w-7 h-7 flex items-center justify-center rounded-full text-white hover:bg-white/10 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  {/* 페이지 교체용 hidden file input */}
                  <input
                    ref={replacePageFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      const pid = replacePageTargetRef.current;
                      if (f && pid && onReplacePage) onReplacePage(pid, f);
                      replacePageTargetRef.current = null;
                      e.target.value = '';
                    }}
                  />
                </div>
              );
            })()}

            {/* 에셋 추출 오버레이 — active 시에만 마운트되어 드래그 영역 선택 + 카테고리 팝오버 */}
            <RegionPicker
              active={pickMode}
              imageUrl={state.activeTab === "pc" ? pcImage : moImage}
              onCancel={() => setPickMode(false)}
              onSaved={(asset) => { showPickToast(`에셋 저장: ${asset.category}`); }}
              source={{
                app: 'promotion-archive',
                bannerId: banner?.id || null,
                bannerTitle: banner?.title || '',
              }}
              showToast={showPickToast}
            />
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
                    // 프레임 모드는 overflow-hidden — max-width 가 viewport 에 맞춰 비례 축소되므로 항상 fit.
                    // 스크롤 가능 영역을 제거해 휠 이벤트로 전체 프레임이 위아래로 이동하는 흔들림 방지.
                    : "overflow-hidden"
                }`}
              >
                {/* 일반 뷰: h-full 로 부모 높이에 딱 맞춰 padding 도 box-sizing border-box 로 안쪽 흡수 → 스크롤 안 생김.
                    풀뷰: min-h-full + start 정렬 — 컨텐츠가 길면 자연 스크롤. */}
                <div
                  className={`flex flex-col items-center transition-all duration-700 ${state.isFullView ? "min-h-full p-0 justify-start" : "h-full py-4 px-6 justify-center"}`}
                >
                  {state.isFullView ? (
                    // 풀뷰 — 브랜드웹은 패럴렉스 cross-fade(한 페이지씩), 그 외는 단일 이미지.
                    isBrandWeb && pcPages.length > 0 ? (
                      <div
                        className={`${state.isActualSize ? "w-max m-auto" : "w-full max-w-[1920px]"} shadow-2xl relative aspect-video bg-black overflow-hidden`}
                        onWheel={handlePageWheel}
                      >
                        {/* lineagew 캠페인 페이지 패턴 — translateY 로 한 페이지씩 위로 슬라이드. */}
                        <div
                          className="absolute inset-0 transition-transform ease-[cubic-bezier(0.7,0,0.3,1)]"
                          style={{ transform: `translateY(-${pcPageIdx * 100}%)`, transitionDuration: '700ms' }}
                        >
                          {pcPages.map((p, i) => (
                            <div
                              key={p.id || i}
                              className="absolute left-0 right-0 h-full flex items-center justify-center"
                              style={{ top: `${i * 100}%` }}
                            >
                              <img src={p.url} alt={p.name || `PC ${i + 1}`} draggable={false}
                                className="max-w-full max-h-full w-full h-full object-contain block" />
                            </div>
                          ))}
                        </div>
                        {highlightActive && jumpHighlight?.rect && state.activeTab === "pc" && <HighlightBox rect={jumpHighlight.rect} />}
                      </div>
                    ) : (
                      <div className={`${state.isActualSize ? "w-max m-auto" : "w-full max-w-[1920px]"} shadow-2xl relative`}>
                        <img src={pcImage} alt="PC" className={`${state.isActualSize ? "w-auto max-w-none" : "w-full"} block`} draggable={false} />
                        {highlightActive && jumpHighlight?.rect && state.activeTab === "pc" && <HighlightBox rect={jumpHighlight.rect} />}
                      </div>
                    )
                  ) : (
                    // PC 일반 뷰 — Chrome 브라우저 프레임 (주소창 제거, 탭 영역만 남김).
                    // maxWidth 는 모달 높이(88vh, cap 920px) 기준으로 산정 — 모달 내부 reserved 영역
                    // (상단 컨트롤 56 + py-4 padding 32 + 탭 헤더 35 + 페이저/여유 ~ 130px) 을 뺀 만큼
                    // aspect-video(16:9) 로 컨텐츠가 들어가도록 계산.
                    <div
                      className="relative w-full flex flex-col items-center animate-in zoom-in-95 duration-500"
                      style={{ maxWidth: 'min(1280px, calc((88vh - 130px) * 16 / 9))' }}
                    >
                      {/* 글로우 */}
                      <div className="absolute -inset-x-10 -top-6 -bottom-20 bg-gradient-radial from-white/[0.04] to-transparent blur-2xl pointer-events-none" />

                      {/* 브라우저 윈도우 — Chrome 다크 모드 스타일 (탭만) */}
                      <div className="relative z-10 w-full rounded-xl overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7),0_8px_24px_-8px_rgba(0,0,0,0.5)] border border-white/5 bg-[#202124]">
                        {/* 타이틀바 — 탭 영역만 (트래픽라이트는 탭 왼쪽에 인라인 배치) */}
                        <div className="bg-[#202124] border-b border-white/5 px-3 pt-2 pb-0">
                          <div className="flex items-end gap-2">
                            {/* 트래픽 라이트 — 탭과 정렬되도록 인라인 */}
                            <div className="flex items-center gap-1.5 shrink-0 pb-2">
                              <div className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e0443e] shadow-inner" />
                              <div className="w-3 h-3 rounded-full bg-[#febc2e] border border-[#dea123] shadow-inner" />
                              <div className="w-3 h-3 rounded-full bg-[#28c840] border border-[#1aab29] shadow-inner" />
                            </div>
                            {/* 탭 영역 */}
                            <div className="bg-[#35363a] rounded-t-md px-3 py-1.5 flex items-center gap-1.5 text-[10px] text-[#e8eaed] font-medium max-w-[200px]">
                              <div className="w-2.5 h-2.5 rounded-full bg-[#d8b17e]/70 shrink-0" />
                              <span className="truncate">{banner?.title || 'Promotion'}</span>
                            </div>
                            <div className="rounded-t-md px-2.5 py-1.5 text-[10px] text-[#9aa0a6] max-w-[140px] truncate hover:bg-white/5">새 탭</div>
                          </div>
                        </div>
                        {/* 컨텐츠 — 16:9 (PC 시안 표준). 브랜드웹은 vertical slide. bg-black 으로 letterbox 흰 라인 제거. */}
                        <div className="relative w-full aspect-video bg-black overflow-hidden border-t border-[#35363a]" onWheel={handlePageWheel}>
                          {isBrandWeb && pcPages.length > 0 ? (
                            <div
                              className="absolute inset-0 transition-transform ease-[cubic-bezier(0.7,0,0.3,1)]"
                              style={{ transform: `translateY(-${pcPageIdx * 100}%)`, transitionDuration: '700ms' }}
                            >
                              {pcPages.map((p, i) => (
                                <div
                                  key={p.id || i}
                                  className="absolute left-0 right-0 h-full flex items-center justify-center"
                                  style={{ top: `${i * 100}%` }}
                                >
                                  <img src={p.url} alt={p.name || `PC ${i + 1}`} draggable={false}
                                    className="w-full h-full object-contain block" />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="absolute inset-0 overflow-y-auto scrollbar-hide bg-white">
                              <img src={pcImage} alt="PC" className="w-full h-auto block" draggable={false} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : state.isFullView ? (
              // 모바일 풀뷰 — 폰 베젤 없이 raw 모바일 이미지. PC 풀뷰와 동일 패턴
              // (스크롤/팬). isActualSize 면 실제 픽셀 폭으로 노출, 아니면 화면 너비에 맞춤.
              <div
                ref={scrollRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className={`w-full h-full relative touch-none scrollbar-hide ${
                  state.isActualSize ? "overflow-auto cursor-grab active:cursor-grabbing" : "overflow-y-auto"
                }`}
              >
                <div className="min-h-full flex flex-col items-center justify-center p-0">
                  {isBrandWeb && moPages.length === 0 ? (
                    <MobileUploadZone onAddMobilePages={onAddMobilePages} />
                  ) : isBrandWeb && moPages.length > 0 ? (
                    // 브랜드웹 모바일 풀뷰 — 고정 aspect-[9/16] 제거, viewport 높이 기반 산정.
                    // 24인치 1080p 에서 max-w-480 * 16/9 = 854px > 가용 높이 ~830px 이어서 하단이 잘리던 사고 해소.
                    <div
                      className={`${state.isActualSize ? "w-max m-auto" : "w-full max-w-[480px]"} shadow-2xl relative bg-black overflow-hidden rounded-xl`}
                      style={{ height: 'calc(100vh - 180px)' }}
                      onWheel={handlePageWheel}
                    >
                      <div
                        className="absolute inset-0 transition-transform ease-[cubic-bezier(0.7,0,0.3,1)]"
                        style={{ transform: `translateY(-${moPageIdx * 100}%)`, transitionDuration: '700ms' }}
                      >
                        {moPages.map((p, i) => (
                          <div
                            key={p.id || i}
                            className="absolute left-0 right-0 h-full flex items-center justify-center"
                            style={{ top: `${i * 100}%` }}
                          >
                            <img src={p.url} alt={p.name || `Mobile ${i + 1}`} draggable={false}
                              className="w-full h-full object-contain block" />
                          </div>
                        ))}
                      </div>
                      {highlightActive && jumpHighlight?.rect && state.activeTab === "mobile" && <HighlightBox rect={jumpHighlight.rect} />}
                    </div>
                  ) : (
                    <div className={`${state.isActualSize ? "w-max m-auto" : "w-full max-w-[480px]"} shadow-2xl relative`}>
                      <img src={moImage} alt="Mobile" className={`${state.isActualSize ? "w-auto max-w-none" : "w-full"} block`} draggable={false} />
                      {highlightActive && jumpHighlight?.rect && state.activeTab === "mobile" && <HighlightBox rect={jumpHighlight.rect} />}
                    </div>
                  )}
                </div>
              </div>
            ) : isBrandWeb && moPages.length === 0 ? (
              // 일반 뷰 — 모바일 페이지가 0 인 브랜드웹: 폰 베젤 대신 업로드 영역.
              <div className="w-full h-full flex items-center justify-center p-8 overflow-y-auto scrollbar-hide animate-in fade-in duration-300">
                <MobileUploadZone onAddMobilePages={onAddMobilePages} />
              </div>
            ) : (
              // 모바일 일반 뷰 — 브랜드웹/프로모션 공통 iPhone 베젤 프레임.
              // 베젤(360×740) 은 layout 사이즈는 고정하고 CSS scale 로 비례 축소 — px 단위 자식들
              // (노치, 사이드버튼, 스테이터스 바 등) 도 함께 줄어들어 깨지지 않음.
              // scale 공식은 실제 viewport(100vh) 기준 — 모달 outer 의 top-[52px] + p-10 패딩(80px)
              // + 상단 컨트롤바(56) + py-4 패딩(32) + 페이저 영역(40) + 여유(20) = 280px 차감.
              // overflow-hidden 으로 layout 오버플로(스케일은 visual 만 줄이고 box 는 그대로)를 가림.
              <div className="w-full h-full flex items-center justify-center py-4 px-6 overflow-hidden animate-in fade-in duration-300 relative">
                {/* 블러 배경 — 현재 모바일 이미지를 크게 깔고 blur + 낮은 opacity 로 깔아 뒷배경이 비어 보이지 않게.
                    pointer-events-none 으로 베젤 위 인터랙션 방해 없음. */}
                {moImage && (
                  <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
                    <img
                      src={moImage}
                      alt=""
                      draggable={false}
                      className="absolute inset-0 w-full h-full object-cover scale-150 opacity-30"
                      style={{ filter: 'blur(60px) saturate(1.2)' }}
                    />
                    {/* 살짝 어둡게 덮어 베젤 가독성 보장 */}
                    <div className="absolute inset-0 bg-black/40" />
                  </div>
                )}
                {/* 디바이스 외부 베젤 (티타늄)
                    scale 계산: calc((100vh - 280px) / 1px / 740) — `/ 1px` 로 length 를 unitless 로
                    변환해야 scale() 에 들어갈 수 있다(없으면 단위 불일치로 CSS 가 무시함).
                    280 = top-[52] + outer p-10 (80) + 상단바 (56) + py-4 (32) + 페이저 (40) + 여유 (20) */}
                <div
                  className="relative rounded-[44px] p-[3px] overflow-hidden shadow-[0_30px_60px_-12px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)] shrink-0"
                  style={{
                    background: 'linear-gradient(145deg, #4a4a4f 0%, #2a2a2e 35%, #1a1a1e 65%, #3a3a3e 100%)',
                    width: 360, height: 740,
                    transform: 'scale(clamp(0.3, calc((100vh - 280px) / 1px / 740), 1))',
                    transformOrigin: 'center',
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
                      {/* 컨텐츠 영역 — 브랜드웹은 vertical slide. bg-black 으로 letterbox 흰 라인 제거. */}
                      <div className="absolute inset-0 bg-black pt-[44px] pb-[24px] scrollbar-hide overflow-hidden" onWheel={handlePageWheel}>
                        {isBrandWeb && moPages.length > 0 ? (
                          <div
                            className="absolute inset-x-0 top-[44px] bottom-[24px] transition-transform ease-[cubic-bezier(0.7,0,0.3,1)]"
                            style={{ transform: `translateY(-${moPageIdx * 100}%)`, transitionDuration: '700ms' }}
                          >
                            {moPages.map((p, i) => (
                              <div
                                key={p.id || i}
                                className="absolute left-0 right-0 h-full flex items-center justify-center"
                                style={{ top: `${i * 100}%` }}
                              >
                                <img src={p.url} alt={p.name || `Mobile ${i + 1}`} draggable={false}
                                  className="w-full h-full object-contain block" />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="w-full h-full overflow-y-auto scrollbar-hide bg-white">
                            <img src={moImage} alt="Mobile" className="w-full h-auto block" draggable={false} />
                          </div>
                        )}
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
                    <div className="text-[12px] font-medium text-zinc-500">
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
                  <span className="inline-flex items-center px-2 py-0.5 text-[12px] font-bold rounded border bg-[#d8b17e]/15 text-[#d8b17e] border-[#d8b17e]/40">
                    {editedBanner.game}
                  </span>
                ) : (
                  <span className="text-[12px] text-zinc-600">미지정</span>
                )
              )}
            </div>

            {/* Tags — 표시: chip / 편집: chip + X + new input */}
            <div className="mb-5 pb-5 border-b border-white/5">
              <label className={labelStyle}>Tags</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {editedBanner?.tags?.map((tag, idx) => (
                  <span key={`tag-${tag}-${idx}`} className="flex items-center gap-1 px-1.5 py-0.5 text-zinc-400 text-[11px] font-bold border border-white/10 rounded hover:text-zinc-200">
                    #{tag}
                    {state.isEditing && (
                      <X size={9} className="cursor-pointer hover:text-red-400"
                        onClick={() => onEditChange("tags", editedBanner.tags.filter(t => t !== tag))} />
                    )}
                  </span>
                ))}
                {(!editedBanner?.tags || editedBanner.tags.length === 0) && !state.isEditing && (
                  <span className="text-[12px] text-zinc-600">없음</span>
                )}
              </div>
              {state.isEditing && (
                <input className="w-full bg-transparent border-0 border-b border-white/5 focus:border-[#d8b17e] outline-none px-0 py-1 text-[12px] text-zinc-300 placeholder:text-zinc-600 transition-colors"
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
                <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-md px-2.5 py-2 text-[11px] text-zinc-500 font-mono break-all leading-relaxed">
                  {banner?.path || '경로 없음'}
                </div>
                {/* 고정 width 아이콘 버튼 — 복사 전/후 폭이 동일해야 path 박스 width 가 흔들리지 않음.
                    텍스트 없이 컬러만 emerald 로 전환되어 시각 피드백 (1.5초 후 원복). */}
                <button onClick={() => handleCopyPath(banner?.path)}
                  className={`w-9 h-9 flex items-center justify-center rounded-md border transition-colors self-start shrink-0 ${
                    pathCopied
                      ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/40'
                      : 'text-[#d8b17e] bg-[#d8b17e]/10 border-[#d8b17e]/40 hover:bg-[#d8b17e] hover:text-black'
                  }`}
                  title={pathCopied ? "복사됨" : "경로 복사"}
                  aria-label={pathCopied ? "경로 복사됨" : "경로 복사"}
                  aria-live="polite">
                  {pathCopied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Upload + Link */}
            <div className="mb-5 pb-5 border-b border-white/5 space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Initial Upload</label>
                <span className="text-[11px] text-zinc-400 font-mono">
                  {banner?.created_at ? new Date(banner.created_at).toLocaleDateString() : "-"}
                </span>
              </div>
              <div>
                <label className={labelStyle}>Promotion Page Link</label>
                {(state.isLinkInputVisible || editedBanner?.promotionUrl) ? (
                  <div className="relative">
                    <LinkIcon className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-500" size={12} />
                    <input
                      className="w-full bg-transparent border-0 border-b border-white/5 focus:border-[#d8b17e] outline-none pl-5 py-1 text-[12px] text-zinc-300 placeholder:text-zinc-600 transition-colors disabled:cursor-not-allowed"
                      placeholder="https://…"
                      value={editedBanner?.promotionUrl || ""}
                      onChange={(e) => onEditChange("promotionUrl", e.target.value)}
                      disabled={!state.isEditing}
                    />
                  </div>
                ) : (
                  <button onClick={() => state.isEditing && dispatch({ type: "SET_LINK_VISIBLE", value: true })}
                    disabled={!state.isEditing}
                    className="flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-[#d8b17e] disabled:opacity-50 disabled:hover:text-zinc-500 transition-colors">
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
                <span className="text-[13px] font-bold text-zinc-300 group-hover:text-white transition-colors">AI 디자인 분석</span>
              </div>
              {hasEval ? (
                <div className="text-2xl font-black text-[#d8b17e] font-mono tracking-tighter leading-none">
                  {getWebFinalScore100(banner)}
                </div>
              ) : (
                <span className="text-[11px] font-medium text-zinc-500 tracking-wider group-hover:text-zinc-300 transition-colors">미분석 ›</span>
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

        {/* 에셋 추출 토스트 */}
        {pickToast && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[2020] pointer-events-none animate-in fade-in slide-in-from-bottom-2">
            <div className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-2xl border ${
              pickToast.type === "error"
                ? "bg-rose-500/90 border-rose-400 text-white"
                : "bg-emerald-500/90 border-emerald-400 text-white"
            }`}>
              {pickToast.msg}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 브랜드웹 카드에 모바일 페이지가 없을 때 PreviewModal Mobile 탭에 노출되는 업로드 영역.
// 드래그&드롭 + 파일 선택 둘 다 지원. onAddMobilePages 가 부모(index.jsx)에서 Cloudinary 업로드 + pages[] 갱신.
function MobileUploadZone({ onAddMobilePages }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    if (!onAddMobilePages) { alert('업로드 핸들러가 없습니다.'); return; }
    setIsUploading(true);
    try { await onAddMobilePages(files); }
    finally { setIsUploading(false); }
  };
  return (
    <div
      onClick={() => !isUploading && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
      className={`w-[360px] max-w-full aspect-[9/16] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
        isDragging
          ? 'border-[#d8b17e] bg-[#d8b17e]/10'
          : 'border-white/20 bg-white/[0.02] hover:border-white/40 hover:bg-white/[0.04]'
      } ${isUploading ? 'opacity-50 cursor-wait' : ''}`}
    >
      <Smartphone className="w-10 h-10 text-zinc-500 mb-3" />
      <div className="text-sm font-bold text-zinc-300 mb-1">
        {isUploading ? '업로드 중…' : '모바일 시안 추가'}
      </div>
      <div className="text-[11px] text-zinc-500 px-6 text-center leading-relaxed">
        {isUploading ? '잠시만 기다려주세요' : '클릭하거나 이미지를 끌어다 놓으면\n이 브랜드웹 카드에 모바일 페이지로 추가됩니다'}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
}

export default PreviewModal;
