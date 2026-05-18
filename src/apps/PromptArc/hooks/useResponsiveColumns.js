import { useState, useEffect } from "react";

// viewMode 변경에 따른 메이슨리 컬럼 수 계산. 윈도우 너비 추적까지 포함.
export function useResponsiveColumns(viewMode) {
  const [colCount, setColCount] = useState(4);
  useEffect(() => {
    const upd = () => {
      const w = window.innerWidth;
      if (viewMode === 'large') setColCount(w >= 768 ? 2 : 1);
      else if (viewMode === 'small') {
        if (w >= 1536) setColCount(8);
        else if (w >= 1280) setColCount(6);
        else if (w >= 1024) setColCount(5);
        else if (w >= 768) setColCount(4);
        else setColCount(3);
      } else {
        if (w >= 1280) setColCount(5);
        else if (w >= 1024) setColCount(4);
        else if (w >= 768) setColCount(3);
        else setColCount(2);
      }
    };
    upd();
    window.addEventListener('resize', upd);
    return () => window.removeEventListener('resize', upd);
  }, [viewMode]);
  return colCount;
}
