import SectionHeader from '../components/SectionHeader.jsx'
import NumberWatermark from '../components/NumberWatermark.jsx'
import CountdownWatermark from '../components/CountdownWatermark.jsx'

// 3장 게임특징[1] 매커니즘 — Figma 318:3086 (1920×900).
// 미디어(게임스크린샷+시간에너지 오브+HUD)는 풀블리드 배경 이미지, 텍스트/워터마크 라이브,
// 오브로 수렴하는 네온 라인은 CSS(원본이 linear-gradient 바).

// 네온 라인 — 컨테이너 중심에 회전된 그라데이션 바
function NeonLine({ cx, cy, w, h, rot, color }) {
  return (
    <div
      style={{
        position: 'absolute', left: cx - w / 2, top: cy - h / 2, width: w, height: h,
        transform: `rotate(${rot}deg)`,
        background: `linear-gradient(to right, transparent, ${color}, transparent)`,
      }}
    />
  )
}

export default function FeatMechanic() {
  return (
    <section className="tt-section" style={{ height: 900, background: 'linear-gradient(to right, #0a0e14, #0d121c)' }}>
      {/* 미디어 (318:3087) — 게임 스크린샷 + 시간에너지 오브 + HUD, 섹션 전체 배경 */}
      <img src="/tt-index/assets/mechanic/media.png" alt="" style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 900 }} />

      {/* 배경 장식 — 오브로 수렴하는 네온 라인 (318:3107, 318:3108) */}
      <NeonLine cx={1158.66} cy={512.24} w={420} h={4} rot={24} color="rgba(0,229,255,0.9)" />
      <NeonLine cx={1176.42} cy={542.38} w={300} h={3} rot={24} color="rgba(255,43,214,0.8)" />
      <NeonLine cx={1307.19} cy={356.30} w={180} h={3} rot={30} color="rgba(255,210,74,0.7)" />
      <NeonLine cx={1581.81} cy={356.28} w={360} h={4} rot={-18} color="rgba(182,255,58,0.85)" />
      <NeonLine cx={1594.10} cy={431.26} w={260} h={3} rot={-18} color="rgba(0,229,255,0.8)" />

      {/* 대형 워터마크 "1" (318:3636) */}
      <NumberWatermark char="1" left={44} top={-87} color="rgba(34,211,255,0.08)" />

      {/* 헤더 (318:3099 / 3100 / 3101) */}
      <SectionHeader
        eyebrow="GAME FEATURE 01 · 메커니즘 소개"
        title={['시간을 모으고', '생존하세요']}
        body="시간을 확보해 생존 시간을 늘리고, 성장 자원도 함께 획득합니다. 전투는 단순 킬 경쟁이 아니라 시간을 뺏고 지키는 싸움입니다."
        accent="#1bb8f2"
        top={340}
        bodyTop={540}
        bodyWidth={600}
      />

      {/* 우측하단 카운트 (319:3755) */}
      <CountdownWatermark value="01:10" opacity={0.53} top={683} left={1424} />
    </section>
  )
}
