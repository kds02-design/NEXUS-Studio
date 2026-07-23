// 렌더 결과 전체화면 확대 모달 — 휠 줌(1~6x) + 드래그 팬 + 더블클릭 토글 + Esc/배경 클릭 닫기.
// 렌더메트릭스/소버린/브리즈 렌더 영역이 공유. portal 로 body 에 렌더해 레이아웃 overflow 영향 회피.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function ImageZoomModal({ src, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    // React onWheel 은 passive 라 preventDefault 불가 — 네이티브 리스너로 부착.
    const onWheel = (e) => {
      e.preventDefault();
      setZoom((z) => {
        const next = Math.min(6, Math.max(1, z * (e.deltaY < 0 ? 1.2 : 1 / 1.2)));
        if (next === 1) setPan({ x: 0, y: 0 });
        return next;
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onMouseDown = (e) => {
    if (zoom <= 1) return;
    e.preventDefault();
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y };
    const move = (ev) => { const d = dragRef.current; if (d) setPan({ x: d.ox + ev.clientX - d.sx, y: d.oy + ev.clientY - d.sy }); };
    const up = () => { setTimeout(() => { dragRef.current = null; }, 0); window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  if (!src) return null;
  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 overflow-hidden"
      onClick={() => { if (!dragRef.current) onClose(); }}
    >
      <img
        src={src}
        alt="render fullscreen"
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => { e.stopPropagation(); setZoom((z) => { const n = z > 1 ? 1 : 2.5; if (n === 1) setPan({ x: 0, y: 0 }); return n; }); }}
        onMouseDown={onMouseDown}
        draggable={false}
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, cursor: zoom > 1 ? "grab" : "zoom-in", transition: dragRef.current ? "none" : "transform 0.15s ease" }}
        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl select-none"
      />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-[11px] font-semibold pointer-events-none">
        {Math.round(zoom * 100)}% · 휠 확대/축소 · 더블클릭 토글 · 드래그 이동 · Esc 닫기
      </div>
      <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors" title="닫기 (Esc)">
        <X className="w-5 h-5" />
      </button>
    </div>,
    document.body
  );
}
