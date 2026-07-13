import CountdownWatermark from '../components/CountdownWatermark.jsx'

// 2장 새소식 — Figma 318:2981 (1920×920).
// 배경/썸네일/HUD = get_screenshot 렌더 이미지, 텍스트·뱃지·보더 = 라이브.

function Badge({ label }) {
  return (
    <div style={{ display: 'inline-flex', padding: '7px 12px', borderRadius: 4, background: 'rgba(27,184,242,0.12)', border: '1px solid rgba(27,184,242,0.4)' }}>
      <span className="f-pl-m" style={{ color: '#1bb8f2', fontSize: 11, whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  )
}

// 우측 리스트 카드 (공지/개발자노트/시즌패치)
function SideCard({ top, thumb, badge, title, date, titleWidth }) {
  return (
    <div style={{ position: 'absolute', left: 1122, top, width: 558, height: 150, overflow: 'hidden', background: 'rgba(10,14,20,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <img src={thumb} alt="" style={{ position: 'absolute', left: 0, top: 0, width: 210, height: 150 }} />
      <div style={{ position: 'absolute', left: 229, top: 23, width: titleWidth, display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'flex-start' }}>
        <Badge label={badge} />
        <p className="f-pl-b" style={{ color: '#fff', fontSize: 19, lineHeight: 'normal' }}>{title}</p>
        <p style={{ fontFamily: "'Paperlogy'", fontWeight: 300, color: '#9ea8b8', fontSize: 11 }}>{date}</p>
      </div>
    </div>
  )
}

export default function News() {
  return (
    <section className="tt-section" style={{ height: 920 }}>
      {/* 배경 (318:2982) */}
      <img src="/tt-index/assets/news/bg.png" alt="" style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 920 }} />
      {/* 상단 HUD 구분선 (318:3067) + 좌측 HUD 그래픽 (318:3732) — 원본이 mix-blend(lighten/screen) → screen 블렌드로 배경 제거 */}
      <img src="/tt-index/assets/news/hud.png" alt="" style={{ position: 'absolute', left: 0, top: -28, width: 1920, height: 46, mixBlendMode: 'screen' }} />
      <img src="/tt-index/assets/news/hud-left.png" alt="" style={{ position: 'absolute', left: 0, top: 19, width: 593, height: 128, opacity: 0.4 }} />

      {/* 헤더 (319:3796) */}
      <p className="f-ob-sb" style={{ position: 'absolute', left: 240, top: 122, color: '#1bb8f2', fontSize: 14, letterSpacing: 3, whiteSpace: 'nowrap' }}>TIME LOG</p>
      <p className="f-pl-b" style={{ position: 'absolute', left: 240, top: 144, color: '#fff', fontSize: 46, whiteSpace: 'nowrap' }}>새소식</p>
      {/* 더 많은 소식 → (318:2988) — 원본 Pretendard, 미보유로 Paperlogy 대체 */}
      <p className="f-pl-m" style={{ position: 'absolute', left: 1584, top: 200, color: '#1bb8f2', fontSize: 16, whiteSpace: 'nowrap' }}>더 많은 소식 →</p>

      {/* 우측하단 카운트 (319:3744) */}
      <CountdownWatermark value="00:35" opacity={0.13} top={703} left={1426} />

      {/* 메인 소식 배너 (318:2990) */}
      <div style={{ position: 'absolute', left: 240, top: 250, width: 842, height: 500, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
        <img src="/tt-index/assets/news/card-main.png" alt="" style={{ position: 'absolute', left: 0, top: 0, width: 842, height: 500 }} />
        <div style={{ position: 'absolute', left: 39, top: 308, width: 802, display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'flex-start' }}>
          <Badge label="Update" />
          <p className="f-pl-b" style={{ color: '#fff', fontSize: 34, lineHeight: 'normal' }}>새로운 시즌, ‘1시간 여행자’ 공개</p>
          <p className="f-pl-m" style={{ color: '#9ca3af', fontSize: 15, letterSpacing: -0.3 }}>시즌 1이 시작됩니다. 새로운 전장과 신규 여행자 엘리스를 지금 바로 만나보세요.</p>
          <p style={{ fontFamily: "'Paperlogy'", fontWeight: 300, color: '#9ea8b8', fontSize: 13 }}>2026.06.24</p>
        </div>
      </div>

      {/* 우측 리스트 카드 3종 */}
      <SideCard top={250} thumb="/tt-index/assets/news/thumb1.png" badge="Media" title="시즌 1.0 서버 점검 안내" date="2026.06.22" titleWidth={182} />
      <SideCard top={425} thumb="/tt-index/assets/news/thumb2.png" badge="Update" title="‘시간 강탈’ 메커니즘의 설계" date="2026.06.20" titleWidth={207} />
      <SideCard top={600} thumb="/tt-index/assets/news/thumb3.png" badge="Dev Note" title="TIME TAKERS 0624 패치 노트" date="2026.06.18" titleWidth={261} />
    </section>
  )
}
