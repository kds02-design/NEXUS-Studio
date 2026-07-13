import SectionHeader from '../components/SectionHeader.jsx'
import NumberWatermark from '../components/NumberWatermark.jsx'
import CountdownWatermark from '../components/CountdownWatermark.jsx'

// 3장 게임특징[4] 게임 모드 — Figma 318:3293 (1920×900). 액센트 틸 #1beef2.
// 글로우 + 3인 캐릭터 = 렌더 이미지, 텍스트/캐러셀 = 라이브.
export default function FeatGameMode() {
  return (
    <section className="tt-section" style={{ height: 900, background: 'linear-gradient(to bottom, #0a0e14, #0d121c)' }}>
      {/* 상단 글로우 (318:3296, mix-blend-screen) */}
      <img src="/tt-index/assets/mode/glow.png" alt="" style={{ position: 'absolute', left: -786, top: -199.57, width: 1456, height: 719, mixBlendMode: 'screen' }} />
      {/* 3인 캐릭터 (319:4000) */}
      <img src="/tt-index/assets/mode/chars.png" alt="" style={{ position: 'absolute', left: 229, top: 31, width: 860, height: 838 }} />
      {/* 하단 페이드 (324:128) */}
      <div style={{ position: 'absolute', left: 0, bottom: 0, width: 1920, height: 260, background: 'linear-gradient(to bottom, rgba(13,18,31,0), #0d121f)' }} />

      {/* 대형 워터마크 "4" (319:3836) */}
      <NumberWatermark char="4" left={1613} top={-72} color="rgba(20,117,152,0.08)" />

      {/* 헤더 (318:3298) */}
      <SectionHeader
        eyebrow="GAME FEATURE 04 · 게임 모드"
        title={['트리오 모드', '3 vs 3 vs 3 vs 3', '4개 팀으로 생존을 겨룬다']}
        body={['각 시간대에서 사연을 품고 모인 여행자들. 공격·유틸·방어', '서로 다른 스킬과 전략. 당신의 플레이스타일대로 선택하세요.']}
        accent="#1beef2"
        left={1126}
        top={300}
        titleSize={46}
        bodyTop={532}
        bodyWidth={600}
      />

      {/* 캐러셀 도트 + 화살표 (318:3308) */}
      <img src="/tt-index/assets/mode/carousel.png" alt="" style={{ position: 'absolute', left: 518, top: 752, width: 262, height: 47 }} />

      {/* 우측하단 카운트 (319:3779) */}
      <CountdownWatermark value="03:20" opacity={0.23} top={683} left={1426} />
    </section>
  )
}
