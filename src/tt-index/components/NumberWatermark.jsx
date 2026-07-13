// 대형 섹션 번호 워터마크 — Orbitron Bold 380px, 저투명 컬러. (텍스트라 CSS 렌더)
export default function NumberWatermark({ char, left, top, color, size = 380 }) {
  return (
    <p
      className="f-ob-b"
      style={{ position: 'absolute', left, top, color, fontSize: size, lineHeight: 'normal', whiteSpace: 'nowrap' }}
    >
      {char}
    </p>
  )
}
