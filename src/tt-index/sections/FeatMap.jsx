import SectionHeader from '../components/SectionHeader.jsx'
import NumberWatermark from '../components/NumberWatermark.jsx'
import CountdownWatermark from '../components/CountdownWatermark.jsx'

// 3장 게임특징[5] 맵+몬스터 — Figma 318:3319 (1920×900). 액센트 시안 #1bb8f2.
// 3개 맵 카드(이미지+카드텍스트 baked) = 렌더 이미지, 헤더/화살표/도트 = 라이브.
export default function FeatMap() {
  return (
    <section className="tt-section" style={{ height: 900, background: 'linear-gradient(to right, #0a0e14, #0d121c)' }}>
      {/* 맵 카드 3종 (318:3326) */}
      <img src="/tt-index/assets/map/cards.png" alt="" style={{ position: 'absolute', left: 274, top: 260, width: 1377, height: 560 }} />

      {/* 대형 워터마크 "5" (319:3839) */}
      <NumberWatermark char="5" left={28} top={-60} color="rgba(20,117,152,0.08)" />

      {/* 헤더 (318:3321) */}
      <SectionHeader
        eyebrow="GAME FEATURE 05 · 맵 및 몬스터"
        title="전장 자체가 또 하나의 변수다"
        accent="#1bb8f2"
        left={240}
        top={98}
        titleSize={46}
        titleWidth={527}
      />

      {/* 이전/다음 화살표 (318:3366 / 318:3369) */}
      <img src="/tt-index/assets/map/arrow.png" alt="이전" style={{ position: 'absolute', left: 229, top: 460, width: 96, height: 96, transform: 'scaleX(-1)' }} />
      <img src="/tt-index/assets/map/arrow.png" alt="다음" style={{ position: 'absolute', left: 1602, top: 460, width: 96, height: 96 }} />

      {/* 캐러셀 도트 (318:3372) */}
      <img src="/tt-index/assets/map/dots.png" alt="" style={{ position: 'absolute', left: 931, top: 801, width: 58, height: 7 }} />

      {/* 우측하단 카운트 (319:3787) */}
      <CountdownWatermark value="03:32" opacity={0.23} top={683} left={1426} />
    </section>
  )
}
