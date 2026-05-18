import { useState, useCallback } from "react";

// 이미지 viewer 용 줌·패닝 훅.
// 현재 RenderMatrix UI 에는 직접 사용되는 곳이 없지만 미래의 이미지 미리보기 패널을 위해 노출.
// Detail 모달이 생기면 onWheel/onMouseDown 핸들러들을 그대로 가져다 쓰면 됨.
export function useImageZoom({ min = 1, max = 5, wheelStep = 0.001 } = {}) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const reset = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const onWheel = useCallback((e) => {
    const adj = e.deltaY * -wheelStep;
    setScale((prev) => Math.min(Math.max(min, prev + adj), max));
  }, [min, max, wheelStep]);

  const onMouseDown = useCallback((e) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [scale, pan]);

  const onMouseMove = useCallback((e) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [isDragging, dragStart]);

  const onMouseUp = useCallback(() => setIsDragging(false), []);

  return {
    scale, setScale, pan, setPan,
    isDragging, reset,
    onWheel, onMouseDown, onMouseMove, onMouseUp,
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
  };
}
