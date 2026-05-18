// 버전 뱃지 — 현재 활성 버전을 시각적으로 표시. index.jsx 버전 탭 바에서 사용 가능.
const COLORS = { v1: "#74B9FF", v2: "#A29BFE", latest: "#0eb9b3" };
const LABELS = { v1: "v1 안정", v2: "v2 개선", latest: "최신" };

export default function SovereignVersionBadge({ version }) {
  const c = COLORS[version] || "#9aa0a8";
  const l = LABELS[version] || version;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
      color: c, background: `${c}1A`, border: `1px solid ${c}55`,
      padding: "2px 8px", borderRadius: 4, whiteSpace: "nowrap",
    }}>{l}</span>
  );
}
