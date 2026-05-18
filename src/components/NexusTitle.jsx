import { useEffect, useRef } from "react";
import { THEME } from "../config/apps";

// 모든 앱에서 동일한 NEXUS 타이틀 스타일.
// 사용 예: <NexusTitle first="NEXUS" second="STUDIO" color={THEME.accent} size={24} />
//
// 일부 앱이 `body, ..., span { font-family: ... !important }` 같은 글로벌 룰을 inline <style>로
// 주입하기 때문에, 인라인 style만으로는 폰트가 덮어써질 수 있음.
// → ref + setProperty('font-family', ..., 'important')로 inline !important 강제.
export default function NexusTitle({ first, second, color = THEME.accent, size = 24, className = "", style }) {
  const s = typeof size === "number" ? `${size}px` : size;
  const wrapRef = useRef(null);
  const firstRef = useRef(null);
  const secondRef = useRef(null);

  useEffect(() => {
    const teko = "'Teko', sans-serif";
    wrapRef.current?.style.setProperty("font-family", teko, "important");
    firstRef.current?.style.setProperty("font-family", teko, "important");
    secondRef.current?.style.setProperty("font-family", teko, "important");
  });

  return (
    <span
      ref={wrapRef}
      className={`nexus-title ${className}`}
      style={{ fontSize: s, fontFamily: "'Teko', sans-serif", ...style }}
    >
      <span ref={firstRef} className="nexus-title-first" style={{ fontFamily: "'Teko', sans-serif" }}>{first}</span>
      {second && <span ref={secondRef} className="nexus-title-second" style={{ color, fontFamily: "'Teko', sans-serif" }}>{second}</span>}
    </span>
  );
}
