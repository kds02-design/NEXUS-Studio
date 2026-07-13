// 클로징 CTA — Figma 318:3376 (1920×686).
// 배경 = 렌더 이미지, 대형 타이머/텍스트/버튼 = 라이브.
export default function ClosingCta() {
  return (
    <section className="tt-section" style={{ height: 686, background: 'linear-gradient(to bottom, #0d1a29, #0a0e14)' }}>
      {/* 배경 이미지 (imgCta) */}
      <img src="/tt-index/assets/closing/bg.png" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.2 }} />

      <div style={{ position: 'absolute', left: 676, top: 131, width: 568, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        {/* 타이머 (318:3378) — 시안 방사형 글로우 + 03:53 */}
        <div style={{ position: 'relative', width: 289, height: 159 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 100% 100% at 50% 50%, rgba(34,211,255,0.6) 0%, rgba(34,211,255,0.1) 71%, rgba(34,211,255,0) 100%)' }} />
          <p
            className="f-num"
            style={{
              position: 'absolute', left: '50%', top: 48, transform: 'translateX(-50%)', width: 405, textAlign: 'center',
              color: '#9bebff', fontSize: 105, letterSpacing: -0.2813,
              textShadow: '0px 0px 6.75px rgba(51,119,255,0.45), 0px 0px 16.875px rgba(34,211,255,0.45)',
            }}
          >
            03:53
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 50, width: '100%' }}>
          {/* 텍스트 (318:3382) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p className="f-ob-m" style={{ color: '#1bb8f2', fontSize: 15, letterSpacing: 3, whiteSpace: 'nowrap' }}>COMING SOON · STEAM</p>
            <p className="f-pl-b" style={{ marginTop: 28, color: '#fff', fontSize: 56, whiteSpace: 'nowrap' }}>시간은 기다려주지 않는다</p>
          </div>
          {/* 버튼 컨테이너 (318:3385) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 }}>
            <div style={{ position: 'relative', width: 220, height: 52 }}>
              <img src="/tt-index/assets/closing/steam-btn.png" alt="" style={{ position: 'absolute', inset: 0, width: 220, height: 52 }} />
              <p className="f-pl-b" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#021018', fontSize: 18, letterSpacing: 0.6, whiteSpace: 'nowrap' }}>STEAM 위시리스트</p>
            </div>
            <img src="/tt-index/assets/closing/platforms.png" alt="Steam Xbox PlayStation" style={{ width: 514, height: 38, objectFit: 'contain' }} />
          </div>
        </div>
      </div>
    </section>
  )
}
