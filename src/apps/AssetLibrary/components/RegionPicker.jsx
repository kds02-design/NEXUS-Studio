// 영역 선택기 — active=true 면 전체화면 라이트박스로 열림.
// 좌표 계산:
//   - imgWrapperRef 를 IMG 정확히 감싸는 div 에 부착
//   - 매 포인터 이벤트마다 wrapper.getBoundingClientRect() 를 새로 측정 → 스크롤/줌과 무관
//   - sel.x/y 는 wrapper 좌상단 기준 px → 그대로 IMG 좌상단 기준 px (wrapper 가 IMG 와 동일 크기)
//   - 선택 박스도 wrapper 안에 absolute 배치 → 스크롤 시 자연스럽게 따라감
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { captureAndSaveAsset } from "../services/firebase";
import { ASSET_CATEGORY_LIST, getCategoryIcon } from "../constants/categories";

export default function RegionPicker({ imageUrl, active, onCancel, onSaved, source, showToast }) {
  const { user } = useAuth();
  const imgRef = useRef(null);
  const imgWrapperRef = useRef(null);     // IMG 를 정확히 감싸는 div — 좌표 기준
  const scrollRef = useRef(null);
  // sel.x/y/w/h 는 wrapper(=IMG) 좌상단 기준 px.
  const [sel, setSel] = useState(null);
  const [drawing, setDrawing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // 팝오버 위치 — 스크롤 따라 갱신해야 하므로 state 로 둠.
  const [popoverPos, setPopoverPos] = useState(null);

  const reset = useCallback(() => { setSel(null); setDrawing(false); setSaving(false); setPopoverPos(null); }, []);
  const close = useCallback(() => { reset(); onCancel?.(); }, [reset, onCancel]);

  // active 토글 시 초기화.
  useEffect(() => {
    if (!active) { reset(); setLoaded(false); }
  }, [active, reset]);

  // ESC 닫기.
  useEffect(() => {
    if (!active) return;
    const onKey = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, close]);

  // 팝오버 위치 계산 헬퍼 — 스크롤/리사이즈/선택 변경 시 호출.
  const recomputePopover = useCallback(() => {
    if (!sel || drawing || sel.w <= 5 || sel.h <= 5 || !imgWrapperRef.current) {
      setPopoverPos(null);
      return;
    }
    const rect = imgWrapperRef.current.getBoundingClientRect();
    const POP_W = 240;
    const POP_H = 220;
    const selRight = rect.left + sel.x + sel.w;
    const selLeft = rect.left + sel.x;
    const selTop = rect.top + sel.y;
    const spaceRight = window.innerWidth - selRight - 16;
    const left = spaceRight >= POP_W ? selRight + 12 : Math.max(8, selLeft - POP_W - 12);
    const top = Math.max(8, Math.min(window.innerHeight - POP_H - 8, selTop));
    setPopoverPos({ left, top });
  }, [sel, drawing]);

  // 선택이 끝나면 팝오버 위치 계산.
  useEffect(() => { recomputePopover(); }, [recomputePopover]);

  // 스크롤/리사이즈 시 팝오버 위치 갱신.
  useEffect(() => {
    if (!active) return;
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => recomputePopover();
    el.addEventListener("scroll", handler, { passive: true });
    window.addEventListener("resize", handler);
    return () => {
      el.removeEventListener("scroll", handler);
      window.removeEventListener("resize", handler);
    };
  }, [active, recomputePopover]);

  if (!active) return null;
  if (typeof document === "undefined") return null;

  // 매 이벤트마다 wrapper rect 를 새로 측정 → 스크롤/줌 어긋남 없음.
  const wrapperRect = () => imgWrapperRef.current?.getBoundingClientRect();
  const toLocal = (clientX, clientY) => {
    const r = wrapperRect();
    if (!r) return null;
    return { x: clientX - r.left, y: clientY - r.top, w: r.width, h: r.height };
  };

  const onPointerDown = (e) => {
    if (e.target.closest(".region-popover") || e.target.closest(".region-toolbar")) return;
    const p = toLocal(e.clientX, e.clientY);
    if (!p) return;
    if (p.x < 0 || p.y < 0 || p.x > p.w || p.y > p.h) return; // 이미지 바깥
    setSel({ x: p.x, y: p.y, w: 0, h: 0, startX: p.x, startY: p.y });
    setDrawing(true);
    setPopoverPos(null);
  };
  const onPointerMove = (e) => {
    if (!drawing || !sel) return;
    const p = toLocal(e.clientX, e.clientY);
    if (!p) return;
    const cx = Math.max(0, Math.min(p.x, p.w));
    const cy = Math.max(0, Math.min(p.y, p.h));
    setSel((prev) => ({
      ...prev,
      x: Math.min(cx, prev.startX),
      y: Math.min(cy, prev.startY),
      w: Math.abs(cx - prev.startX),
      h: Math.abs(cy - prev.startY),
    }));
  };
  const onPointerUp = () => setDrawing(false);

  // 저장 — wrapper 크기 기준 ratio.
  const handleSelectCategory = async (categoryId) => {
    if (!sel || !imageUrl) return;
    const rect = wrapperRect();
    if (!rect) return;
    if (!user?.uid) { showToast?.("로그인이 필요합니다.", "error"); return; }
    const ratio = {
      x: sel.x / rect.width,
      y: sel.y / rect.height,
      w: sel.w / rect.width,
      h: sel.h / rect.height,
    };
    setSaving(true);
    try {
      const asset = await captureAndSaveAsset({
        uid: user.uid,
        sourceImageUrl: imageUrl,
        rect: ratio,
        category: categoryId,
        source: source || {},
      });
      showToast?.(`에셋 저장 완료: ${categoryId}`);
      onSaved?.(asset);
      close();
    } catch (e) {
      console.error("[RegionPicker] save failed", e);
      showToast?.(`저장 실패: ${e.message}`, "error");
      setSaving(false);
    }
  };

  const isValidSel = sel && !drawing && sel.w > 5 && sel.h > 5;

  // createPortal — 부모 modal 의 stacking context / overflow:hidden 영향 받지 않도록
  // document.body 에 직접 마운트. 또한 부모 modal 의 click 핸들러로 이벤트 버블링되지 않음.
  return createPortal(
    <div
      className="fixed inset-0 z-[2500] bg-black/95 flex flex-col select-none animate-in fade-in duration-200"
      style={{ touchAction: "none" }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 상단 안내 + 닫기 */}
      <div className="region-toolbar shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/60 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-[11px] font-bold tracking-wider">
            에셋 추출 모드
          </span>
          <span className="text-[11px] text-zinc-400 hidden md:inline">
            드래그로 영역 선택 · 스크롤로 페이지 탐색 · ESC 로 닫기
          </span>
        </div>
        <button
          onClick={close}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
          title="닫기 (ESC)"
        >
          <X size={14} /> 닫기
        </button>
      </div>

      {/* 스크롤 가능한 이미지 영역 — 자체 overflow-auto. 긴 페이지도 스크롤로 탐색 가능. */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto custom-scrollbar"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* min-h-full + flex 로 짧은 이미지는 가운데 정렬, 긴 이미지는 자연스럽게 흐름. */}
        <div className="min-h-full min-w-full flex items-start justify-center py-8 px-8 cursor-crosshair">
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-500 pointer-events-none">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
          {/* IMG wrapper — 좌표 기준점. IMG 와 동일 크기로 자동 맞춰짐 (inline-block + img block). */}
          <div ref={imgWrapperRef} className="relative inline-block">
            <img
              ref={imgRef}
              src={imageUrl}
              alt=""
              crossOrigin="anonymous"
              draggable={false}
              onLoad={() => setLoaded(true)}
              onDragStart={(e) => e.preventDefault()}
              // pointer-events-none 으로 부모 div 가 모든 드래그 이벤트를 받게 함.
              // max-w 로 너무 큰 이미지는 적절히 제한 (그래도 viewport 보다 크면 스크롤).
              className="block pointer-events-none shadow-2xl rounded-sm"
              style={{ opacity: loaded ? 1 : 0, maxWidth: "1600px" }}
            />
            {/* 선택 박스 — wrapper 안에 absolute, 스크롤에 자연 추종. */}
            {sel && (
              <div
                className="absolute border-2 border-dashed border-cyan-400 bg-cyan-400/10 rounded-sm pointer-events-none"
                style={{ left: sel.x, top: sel.y, width: sel.w, height: sel.h }}
              />
            )}
          </div>
        </div>
      </div>

      {/* 카테고리 팝오버 — viewport fixed, 스크롤 시 recomputePopover 로 위치 갱신. */}
      {isValidSel && popoverPos && (
        <div
          className="region-popover fixed z-[2520] w-[240px] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150"
          style={popoverPos}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">에셋으로 저장</div>
            <span className="text-[9px] text-zinc-600 font-mono">
              {Math.round(sel.w)}×{Math.round(sel.h)}px
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {ASSET_CATEGORY_LIST.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleSelectCategory(cat.id)}
                disabled={saving}
                className="flex items-center gap-1.5 px-2 py-2 rounded-md text-[11px] font-medium border border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700 hover:text-white hover:border-zinc-500 transition-colors disabled:opacity-40 disabled:cursor-wait"
              >
                <span className="shrink-0 text-zinc-400">
                  {getCategoryIcon(cat.id, 13)}
                </span>
                <span className="truncate">{cat.name}</span>
              </button>
            ))}
          </div>
          {saving && (
            <div className="mt-2 flex items-center gap-2 text-[10px] text-cyan-400">
              <Loader2 size={11} className="animate-spin" /> 저장 중...
            </div>
          )}
          <div className="mt-2 pt-2 border-t border-zinc-800 flex justify-end">
            <button
              onClick={reset}
              disabled={saving}
              className="text-[10px] text-zinc-500 hover:text-white px-2 py-1 rounded disabled:opacity-30"
            >
              다시 선택
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
