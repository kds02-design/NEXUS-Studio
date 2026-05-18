// NEXUS Studio 로고 SVG 컴포넌트.
// height prop으로 크기 조절, color prop으로 색상 변경 가능 (기본: 흰색).
export default function NexusLogo({ height = 20, color = "#ffffff", style = {} }) {
  // viewBox 비율: 334.62 x 203.16 → width = height * (334.62 / 203.16)
  const width = Math.round(height * (334.62 / 203.16));
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 334.62 203.16"
      width={width}
      height={height}
      style={{ flexShrink: 0, display: "block", ...style }}
      aria-label="NEXUS Studio 로고"
    >
      <path
        fill={color}
        d="M0,203.13l9.27-18.43L105.48.08h20.97s40.9,68.98,40.9,68.98l30.44-43.85c5.03-7.24,11.3-12.76,19-17.05C227.35,2.36,238.86-.27,251.12.02h83.49s-64.9,132.47-64.9,132.47l-35.02,70.6-23.54.07-44.88-66.47-27.58,37.89c-12.56,17.25-31.52,28.21-53.19,28.57l-85.5-.02ZM219.13,146.59l20.63-41.13,34.51-69.21-27.06.02c-7.71.4-13.77,4.3-18.49,10.36l-39,56.94,29.4,43.02ZM105,155.98l38.09-51.99-26.53-43.96-54.59,106.67,21.66-.03c8.52-.01,15.89-4.02,21.38-10.68Z"
      />
    </svg>
  );
}
