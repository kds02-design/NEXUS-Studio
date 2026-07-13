import SectionHeader from '../components/SectionHeader.jsx'
import NumberWatermark from '../components/NumberWatermark.jsx'
import CountdownWatermark from '../components/CountdownWatermark.jsx'

// 3장 게임특징[3] 앱(스킬) 시스템 — Figma 318:3176 (1920×900). 액센트 옐로 #ffd14a.
// 배경 텍스처 + 스킬 벌집 = 렌더 이미지, 텍스트/선택 앱 정보 카드 = 라이브.
export default function FeatApp() {
  return (
    <section className="tt-section" style={{ height: 900, background: 'linear-gradient(to right, #0a0e14, #0d121c)' }}>
      {/* 배경 텍스처 (img33) + 옐로 컬러번 + 그라데이션 오버레이 */}
      <img src="/tt-index/assets/app/bg-texture.png" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.65 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,209,74,0.2)', mixBlendMode: 'color-burn' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(243deg, rgb(10,17,36) 3%, rgba(20,15,10,0.4) 45%, rgba(102,102,102,0) 68%)' }} />

      {/* 후면 스킬 벌집 (318:3188) */}
      <img src="/tt-index/assets/app/skills.png" alt="" style={{ position: 'absolute', left: 709, top: 138, width: 882, height: 633 }} />

      {/* 대형 워터마크 "3" (319:3833) */}
      <NumberWatermark char="3" left={32} top={-79} color="rgba(255,209,74,0.08)" />

      {/* 헤더 (319:3850) */}
      <SectionHeader
        eyebrow="GAME FEATURE 03 · 앱 시스템"
        title={['전략에 맞는', '앱을 선택하라']}
        body={['무기·앱·스킬의 무한 빌드 조합.', '필드에서 타임 에너지를 수집해', '샵에서 앱을 구매·업그레이드·판매합니다.']}
        accent="#ffd14a"
        left={240}
        top={300}
        bodyTop={500}
        bodyWidth={600}
      />

      {/* 선택 앱 정보 카드 (321:126) */}
      <div style={{ position: 'absolute', left: 1170, top: 589, width: 288, height: 144, display: 'flex', flexDirection: 'column', gap: 10, padding: '20px 22px', borderRadius: 8, background: 'rgba(10,14,20,0.6)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <p className="f-ob-sb" style={{ color: '#ffd14a', fontSize: 12, letterSpacing: 2, whiteSpace: 'nowrap' }}>▸ SELECTED APP</p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <p className="f-pl-b" style={{ fontSize: 24, color: '#fff', whiteSpace: 'nowrap' }}>아이언 템페스트</p>
          <span style={{ display: 'inline-flex', padding: '3px 9px', borderRadius: 4, background: '#ffd14a' }}>
            <span className="f-pl-m" style={{ fontSize: 12, color: '#0a0e14', whiteSpace: 'nowrap' }}>액티브</span>
          </span>
        </div>
        <p className="f-ob-m" style={{ color: '#ffd14a', fontSize: 12, letterSpacing: 1.5, whiteSpace: 'nowrap' }}>IRON TEMPEST</p>
        <p className="f-pl-m" style={{ fontSize: 12, color: 'rgba(140,140,140,0.85)', letterSpacing: 0.5, whiteSpace: 'pre' }}>코스트 155   ·   쿨다운 12s   ·   광역</p>
      </div>

      {/* 우측하단 카운트 (319:3771) */}
      <CountdownWatermark value="02:48" opacity={0.23} top={684} left={1426} />
    </section>
  )
}
