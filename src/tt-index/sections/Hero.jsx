// 1장 히어로 — Figma 318:2797 (1920×1080).
// 배경/캐릭터/게임스크린샷/워드마크/타이머/CTA 가 마스크·블렌드로 합성된 복합 키비주얼이라
// 규칙("복잡한 비주얼은 export asset")에 따라 프레임 전체를 한 장으로 렌더해 사용.
export default function Hero() {
  return (
    <section className="tt-section" style={{ height: 1080 }}>
      <img src="/tt-index/assets/hero/hero-full.png" alt="TIME:TAKERS" style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080 }} />
    </section>
  )
}
