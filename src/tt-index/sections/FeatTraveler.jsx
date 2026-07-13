import SectionHeader from '../components/SectionHeader.jsx'
import NumberWatermark from '../components/NumberWatermark.jsx'
import CountdownWatermark from '../components/CountdownWatermark.jsx'

// 3장 게임특징[2] 캐릭터+총기 — Figma 318:3113 (1920×900). 액센트 마젠타 #ff2e99.
// 캐릭터 키비주얼 + 여행자 벌집(포트레이트)은 렌더 이미지, 텍스트/라벨/이름표 라이브.

// COMING SOON 라벨 (318:3164 등) — 중심 x 기준 2줄
function ComingSoon({ cx, top }) {
  const base = { position: 'absolute', left: cx, top, width: 90, transform: 'translateX(-50%)', textAlign: 'center', opacity: 0.7 }
  return (
    <>
      <p className="f-ob-b" style={{ ...base, fontSize: 13, letterSpacing: 1, color: 'rgba(255,255,255,0.7)' }}>COMING</p>
      <p className="f-ob-b" style={{ ...base, top: top + 16, fontSize: 13, letterSpacing: 2, color: 'rgba(27,184,242,0.9)' }}>SOON</p>
    </>
  )
}

export default function FeatTraveler() {
  return (
    <section className="tt-section" style={{ height: 900, background: 'linear-gradient(to right, #0a0e14, #0d121c)' }}>
      {/* 메인 캐릭터 비주얼 (318:3114) */}
      <img src="/tt-index/assets/traveler/bg.png" alt="" style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 900 }} />
      {/* 여행자 벌집 (318:3123) */}
      <img src="/tt-index/assets/traveler/hex.png" alt="" style={{ position: 'absolute', left: 257, top: 210, width: 758, height: 425 }} />

      {/* 대형 워터마크 "2" (319:3739) */}
      <NumberWatermark char="2" left={1550} top={-54} color="rgba(255,46,153,0.08)" />

      {/* 헤더 (318:3118) */}
      <SectionHeader
        eyebrow="GAME FEATURE 02 · 여행자"
        title={['원하는 여행자를', '픽업하세요']}
        body={['각 시간대에서 사연을 품고 모인 여행자들. 공격·유틸·방어', '서로 다른 스킬과 전략. 당신의 플레이스타일대로 선택하세요.']}
        accent="#ff2e99"
        left={1120}
        top={290}
        bodyTop={490}
        bodyWidth={600}
      />

      {/* COMING SOON 라벨 4종 (318:3164~3173) */}
      <ComingSoon cx={415} top={280} />
      <ComingSoon cx={856} top={280} />
      <ComingSoon cx={415} top={535} />
      <ComingSoon cx={856} top={535} />

      {/* TRAVELER 07 / 13 (318:3163) */}
      <p className="f-ob-m" style={{ position: 'absolute', left: 569, top: 644, width: 160, transform: 'translateX(-50%)', textAlign: 'center', fontSize: 12, letterSpacing: 1, color: 'rgba(255,255,255,0.5)' }}>
        TRAVELER <span style={{ color: '#fff' }}>07</span> / <span style={{ color: 'rgba(255,255,255,0.3)' }}>13</span>
      </p>

      {/* 선택 이름표 (318:3143) */}
      <div style={{ position: 'absolute', left: 498, top: 668, display: 'flex', gap: 12, alignItems: 'center', padding: '10px 18px 10px 16px', borderRadius: 8, background: 'rgba(10,14,20,0.34)', border: '0.6px solid #ff2e99', boxShadow: '0px 6px 16px 0px rgba(0,0,0,0.5)' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff2e99' }} />
        <span className="f-pl-b" style={{ fontSize: 18, color: '#fff', whiteSpace: 'nowrap' }}>엘리스</span>
        {/* 원본 Rajdhani → 미보유로 Orbitron 대체 */}
        <span className="f-ob-m" style={{ fontSize: 13, color: '#ff2e99', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>ELLIS · AL-15</span>
        <span style={{ display: 'inline-flex', padding: '4px 9px', borderRadius: 4, background: 'rgba(255,46,153,0.16)', border: '1px solid rgba(255,46,153,0.5)' }}>
          <span className="f-pl-m" style={{ fontSize: 12, color: '#ff2e99', whiteSpace: 'nowrap' }}>전투 · 서포트</span>
        </span>
      </div>

      {/* 우측하단 카운트 (319:3763) */}
      <CountdownWatermark value="02:05" opacity={0.23} top={683} left={1426} />
    </section>
  )
}
