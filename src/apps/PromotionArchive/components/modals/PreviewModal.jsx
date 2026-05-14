import React, { useEffect, useMemo, useReducer, useCallback, useRef } from "react";
import {
  X, Heart, Monitor, Smartphone, Download, Copy, Plus, 
  Lock, ZoomIn, ZoomOut, Layers, CheckCircle, 
  MonitorOff, Signal, Wifi, Battery, Link as LinkIcon
} from "lucide-react";

const YEAR_LIST = [2026, 2025, 2024, 2023];

const initialState = {
  activeTab: "pc",
  isFullView: false,
  isActualSize: false,
  isPanning: false,
  panStart: { x: 0, y: 0, scrollLeft: 0, scrollTop: 0 },
  now: new Date(),
  isLinkInputVisible: false,
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
    default: return state;
  }
}

const PreviewModal = ({
  isOpen, onClose, onOpenConfirm, banner, editedBanner, onEditChange,
  onSave, hasChanges, onToggleLike, collectionIds, onToggleCollection, availableGames,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const scrollRef = useRef(null);

  const isConfirming = banner?.history && banner.history.length > 0;
  const lastVer = isConfirming ? banner.history[banner.history.length - 1].version : 0;
  const isCompleted = banner?.isCompleted;

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
  const formattedTime = useMemo(() => state.now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }), [state.now]);

  // ✨ 안전한 경로 복사 로직 (HTTP/HTTPS 모두 대응)
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
        if (successful) alert("경로가 복사되었습니다. (보안 환경 아님)");
        else throw new Error('복사 실패');
      }
    } catch (err) {
      alert("복사에 실패했습니다. 수동으로 복사해주세요.");
    }
  };

  const onPointerDown = (e) => {
    if (!state.isActualSize || !scrollRef.current) return;
    scrollRef.current.setPointerCapture(e.pointerId);
    dispatch({ type: "PAN_START", payload: { x: e.clientX, y: e.clientY, scrollLeft: scrollRef.current.scrollLeft, scrollTop: scrollRef.current.scrollTop } });
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
    } catch (e) { alert("다운로드에 실패했습니다."); }
  }, [pcImage, moImage, state.activeTab, banner?.title]);

  if (!isOpen || !banner) return null;

  const labelStyle = "text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block";
  const inputStyle = "w-full bg-zinc-900 border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-zinc-300 outline-none focus:ring-0 focus:border-[#d8b17e] transition-colors";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-300 select-none overflow-hidden outline-none">
      
      {/* 스크롤바 제거 스타일 */}
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {!state.isFullView && (
        <div className="absolute inset-0 z-0 opacity-40 blur-[100px] scale-110 pointer-events-none transition-all duration-1000"
          style={{ 
            backgroundImage: `url(${state.activeTab === "pc" ? pcImage : moImage})`, 
            backgroundSize: "cover", 
            backgroundPosition: "center" 
          }} />
      )}

      <div className="w-full h-full flex overflow-hidden relative z-10 outline-none">
        
        {/* 좌측 뷰어 영역 */}
        <div className={`flex-1 relative flex flex-col h-full overflow-hidden transition-colors duration-700 outline-none ${!state.isFullView ? "bg-black/10" : "bg-[#0c0c0e]"}`}>
          
          <div className="w-full h-14 p-3 flex justify-between items-start z-50 relative">
            <button onClick={onClose} className="rounded-full p-1.5 bg-black/30 hover:bg-black/60 text-zinc-300 hover:text-white backdrop-blur-md border border-white/10 transition-all outline-none">
              <X size={18} />
            </button>
            <div className="absolute left-1/2 -translate-x-1/2 top-3 flex flex-col items-center gap-1.5">
              <div className="flex p-1 rounded-full bg-black/50 border border-white/10 backdrop-blur-xl">
                {["pc", "mobile"].map((tab) => (
                  <button key={tab} onClick={() => dispatch({ type: "SET_TAB", tab })}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all ${state.activeTab === tab ? "bg-gradient-to-b from-[#e8cba7] to-[#d8b17e] text-black shadow-lg" : "text-zinc-500 hover:text-zinc-300"}`}>
                    {tab === "pc" ? <Monitor size={10} /> : <Smartphone size={10} />} {tab.toUpperCase()}
                  </button>
                ))}
              </div>
              {state.activeTab === "pc" && (
                <div className="flex gap-1 animate-in slide-in-from-top-1">
                  <button onClick={() => dispatch({ type: "TOGGLE_FULL_VIEW" })} className={`p-1 rounded-full border transition-all ${state.isFullView ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50" : "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
                    {state.isFullView ? <MonitorOff size={12} /> : <Monitor size={12} />}
                  </button>
                  {state.isFullView && (
                    <button onClick={() => dispatch({ type: "TOGGLE_ACTUAL_SIZE" })} className={`p-1 rounded-full border transition-all ${state.isActualSize ? "bg-orange-500/20 text-orange-400 border-orange-500/50" : "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
                      {state.isActualSize ? <ZoomOut size={12} /> : <ZoomIn size={12} />}
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-1.5">
              <button onClick={handleDownload} className="flex items-center justify-center p-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 rounded-full transition-all outline-none"><Download size={16} /></button>
              <button onClick={() => onToggleLike(banner?.id)} className={`flex items-center justify-center p-1.5 rounded-full border transition-all ${banner?.liked ? "bg-pink-500/20 text-pink-500 border-pink-500/30" : "bg-white/5 text-zinc-300 border-white/10"}`}><Heart size={16} className={banner?.liked ? "fill-pink-500" : ""} /></button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden relative w-full h-full">
            {state.activeTab === "pc" ? (
              <div 
                ref={scrollRef} 
                onPointerDown={onPointerDown} 
                onPointerMove={onPointerMove} 
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className={`w-full h-full relative touch-none scrollbar-hide ${state.isFullView ? (state.isActualSize ? "overflow-auto cursor-grab active:cursor-grabbing" : "overflow-y-auto") : "overflow-hidden"}`}
              >
                <div className={`min-h-full flex flex-col items-center justify-center transition-all duration-700 ${state.isFullView ? "p-0" : "p-10"}`}>
                  {state.isFullView ? (
                    <div className={`${state.isActualSize ? "w-max m-auto" : "w-full max-w-[1920px]"} bg-white shadow-2xl transition-all duration-300`}>
                      <img src={pcImage} alt="PC" className={`${state.isActualSize ? "w-auto max-w-none" : "w-full"} block`} draggable={false} />
                    </div>
                  ) : (
                    <div className="relative w-full max-w-[1200px] flex flex-col items-center animate-in zoom-in-95 duration-700 outline-none">
                      <div className="relative z-10 w-full bg-gradient-to-b from-white/90 to-white/70 backdrop-blur-md rounded-[2rem] shadow-2xl border border-white p-4 pb-0">
                        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-black/80 rounded-full z-30" />
                        <div className="relative w-full bg-white rounded-t-xl overflow-hidden aspect-[16/9] border-x border-t border-black/10 flex flex-col">
                          <div className="bg-[#dee1e6] shrink-0 border-b border-[#bdbebf] p-1.5 pb-0">
                            <div className="flex items-center px-2 space-x-1 mb-1.5">
                              <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                              <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                              <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                            </div>
                            <div className="h-7 bg-white flex items-center px-3 gap-2 rounded-t-lg text-[10px] text-zinc-500 font-medium shadow-sm">
                              <Lock size={10} /> plaync.com/{banner?.game}
                            </div>
                          </div>
                          <div className="flex-1 overflow-y-auto scrollbar-hide bg-white">
                            <img src={pcImage} alt="PC" className="w-full h-auto block" draggable={false} />
                          </div>
                        </div>
                        <div className="h-10 w-full bg-gradient-to-b from-[#d1d1d1] to-[#b0b0b0] rounded-b-[1.8rem]" />
                      </div>
                      <div className="relative z-0 flex flex-col items-center -mt-4">
                        <div className="w-36 h-20 bg-white/20 backdrop-blur-3xl shadow-inner" style={{ clipPath: "polygon(15% 0, 85% 0, 100% 100%, 0% 100%)" }} />
                        <div className="w-40 h-2 bg-white/30 backdrop-blur-md rounded-full mt-[-2px]" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div key="mobile-tab" className="w-full h-full flex items-center justify-center p-10 animate-in fade-in duration-500">
                <div className="relative w-[340px] h-[700px] bg-[#0a0a0a] rounded-[3.5rem] shadow-2xl border-[12px] border-[#111] overflow-hidden z-10">
                  <div className="w-full h-full bg-black flex flex-col relative rounded-[2.5rem] overflow-hidden">
                    <div className="h-10 flex justify-between items-center px-8 pt-4 bg-white/90 backdrop-blur-xl z-50 absolute top-0 w-full">
                      <span className="text-black text-xs font-bold">{formattedTime}</span>
                      <div className="absolute left-1/2 -translate-x-1/2 top-3 w-24 h-6 bg-black rounded-full" />
                      <div className="flex items-center gap-1 text-black"><Signal size={12} /><Wifi size={12} /><Battery size={14} /></div>
                    </div>
                    <div className="flex-1 overflow-y-auto bg-white pt-[40px] scrollbar-hide">
                      <img src={moImage} alt="Mobile" className="w-full h-auto block" draggable={false} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 우측 사이드바 영역 */}
        <aside className={`w-[360px] flex flex-col h-full shrink-0 p-6 space-y-6 overflow-y-auto z-20 transition-all duration-700 border-l border-white/10 outline-none ${!state.isFullView ? "bg-black/40 backdrop-blur-[60px]" : "bg-[#121214]"} scrollbar-hide`}>
          <section>
            <button onClick={() => onOpenConfirm?.(banner)} className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white rounded-lg font-bold shadow-lg transition-all active:scale-[0.97]">
              <CheckCircle size={14} /> <span className="text-xs uppercase tracking-tight">Confirm Workspace</span>
            </button>
          </section>

          <div className="h-px bg-white/10 w-full" />

          {isCompleted && (
             <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-violet-400" /><span className="text-xs font-bold text-violet-400">컨펌 완료됨</span></div>
             </div>
          )}
          {!isCompleted && isConfirming && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center justify-between animate-in fade-in slide-in-from-left-2">
                <div className="flex items-center gap-2">
                    <div className="relative"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div><div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20"></div></div>
                    <span className="text-xs font-bold text-green-400">수정 진행중</span>
                </div>
                <span className="text-[10px] font-mono text-green-500/70">Version {lastVer}.0</span>
            </div>
          )}

          <section>
            <label className={labelStyle}>Promotion Title</label>
            <div className="flex gap-1.5">
              <input className={`${inputStyle} text-sm font-bold flex-1 bg-zinc-900/50`} value={editedBanner?.title || ""} onChange={(e) => onEditChange("title", e.target.value)} />
              <button onClick={() => onToggleCollection(banner?.id)} className={`w-9 h-9 rounded-md border flex items-center justify-center transition-all ${collectionIds.includes(banner?.id) ? "bg-[#d8b17e] text-black shadow-lg" : "bg-white/5 border-white/10 text-zinc-500"}`}><Layers size={14} /></button>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelStyle}>Game</label>
              <select className={inputStyle} value={editedBanner?.game || ""} onChange={(e) => onEditChange("game", e.target.value)}>{availableGames?.map(g => <option key={g} value={g}>{g}</option>)}</select>
            </div>
            <div>
              <label className={labelStyle}>Schedule</label>
              <div className="flex gap-1.5">
                <select className={inputStyle} value={editedBanner?.year || 2026} onChange={(e) => onEditChange("year", Number(e.target.value))}>
                  {YEAR_LIST.map(y => <option key={`year-${y}`} value={y}>{y}</option>)}
                </select>
                <select className={`${inputStyle} w-[54px] px-1`} value={editedBanner?.month || 1} onChange={(e) => onEditChange("month", Number(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={`month-${m}`} value={m}>{m}M</option>)}
                </select>
              </div>
            </div>
          </section>

          <section>
            <label className={labelStyle}>Asset Path</label>
            <div className="flex gap-1.5">
              <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-md px-2.5 py-2 text-[10px] text-zinc-500 font-mono break-all leading-relaxed shadow-inner">{banner?.path}</div>
              <button onClick={() => handleCopyPath(banner?.path)} className="p-1.5 bg-zinc-800 rounded-md text-zinc-400 hover:text-white border border-zinc-700 outline-none transition-colors"><Copy size={12} /></button>
            </div>
          </section>

          <section className="space-y-4 pt-1 border-t border-white/5">
            <div className="flex justify-between items-center">
              <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Initial Upload</label>
              <span className="text-[10px] text-zinc-400 font-mono">{banner?.created_at ? new Date(banner.created_at).toLocaleDateString() : "-"}</span>
            </div>
            <div>
              <label className={labelStyle}>Promotion Page Link</label>
              {state.isLinkInputVisible ? (
                <div className="relative"><LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" size={12} /><input className={`${inputStyle} pl-8 py-1.5`} placeholder="https://..." value={editedBanner?.promotionUrl || ""} onChange={(e) => onEditChange("promotionUrl", e.target.value)} /></div>
              ) : (
                <button onClick={() => dispatch({ type: "SET_LINK_VISIBLE", value: true })} className="w-full border border-dashed border-zinc-700 rounded-md py-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-all flex items-center justify-center gap-1.5"><Plus size={12} /> ADD URL</button>
              )}
            </div>
          </section>

          <section>
            <label className={labelStyle}>Tags</label>
            <div className="flex flex-wrap gap-1 mb-2.5">
              {editedBanner?.tags?.map((tag, idx) => (
                <span key={`tag-${tag}-${idx}`} className="flex items-center gap-1 px-1.5 py-0.5 bg-white/5 text-zinc-400 text-[9px] font-bold rounded border border-white/10 hover:text-zinc-200">
                  #{tag} <X size={8} className="cursor-pointer hover:text-red-400" onClick={() => onEditChange("tags", editedBanner.tags.filter(t => t !== tag))} />
                </span>
              ))}
            </div>
            <input className={`${inputStyle} py-1.5 text-[11px]`} placeholder="New tag..." onKeyDown={(e) => { if (e.key === "Enter" && e.target.value.trim()) { onEditChange("tags", [...(editedBanner?.tags || []), e.target.value.trim()]); e.target.value = ""; } }} />
          </section>
        </aside>

        {hasChanges && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] bg-white/10 backdrop-blur-3xl border border-white/20 rounded-2xl px-6 py-3 flex items-center gap-8 shadow-2xl animate-in slide-in-from-bottom-5">
            <span className="text-white text-[11px] font-bold">변경사항이 저장되지 않았습니다.</span>
            <div className="flex gap-2">
              <button onClick={() => onEditChange("reset", banner)} className="text-zinc-400 hover:text-white text-[11px] font-bold px-2">취소</button>
              <button onClick={onSave} className="bg-[#d8b17e] text-black px-5 py-1.5 rounded-lg text-[11px] font-black shadow-lg">저장하기</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewModal;