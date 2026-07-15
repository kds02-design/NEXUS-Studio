// 운명 관측소 — 공용 UI 조각 (본체 + AI 섹션 공유). 토큰·데이터는 ./shared.js
import { C } from "./shared";

export function Panel({ children, style }) {
  return <div style={{ background: C.panel, border: `1px solid ${C.line}`, padding: 18, ...style }}>{children}</div>;
}

export function Eyebrow({ children }) {
  return <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 11, letterSpacing: 3, color: C.gold, textTransform: "uppercase", marginBottom: 12 }}>{children}</div>;
}
