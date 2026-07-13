// 우측하단 카운트 — Figma "우측하단 카운트" 그룹 반복 요소.
// blur 처리된 base(03:53) 뒤판 + 섹션별 값 전면, 하단 "점점" 점선 텍스처.
export default function CountdownWatermark({ value, base = '03:53', opacity = 0.23, top = 683, left = 1426 }) {
  return (
    <div style={{ position: 'absolute', left, top, width: 454, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      <div
        className="f-num"
        style={{ position: 'relative', fontSize: 195, letterSpacing: -0.2813, marginBottom: -22, opacity, textAlign: 'center', whiteSpace: 'nowrap', lineHeight: 'normal' }}
      >
        <span style={{ position: 'absolute', inset: 0, filter: 'blur(23px)', opacity: 0.5, color: '#fff' }}>{base}</span>
        <span style={{ position: 'relative', marginLeft: 1, color: 'rgba(255,255,255,0.2)' }}>{value}</span>
      </div>
      <div style={{ width: 379, height: 34, opacity: 0.1 }}>
        <img src="/tt-index/assets/common/dotline.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    </div>
  )
}
