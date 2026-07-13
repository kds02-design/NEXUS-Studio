// GNB (sticky) — Figma 318:2966. 히어로 상단에 겹치는 고정 헤더(1920×80).
// 음수 marginBottom 으로 플로우 공간 제거 → 히어로가 y0 부터 시작하도록.
const MENU = [
  { label: '게임소개', active: true },
  { label: '새소식' },
  { label: '여행자소개' },
  { label: '무기소개' },
  { label: '쿠폰 ↗' },
]

export default function Gnb() {
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        width: 1920,
        height: 80,
        marginBottom: -80,
        background: 'rgba(10,14,20,0.72)',
        backdropFilter: 'blur(6px)',
      }}
    >
      {/* 하단 보더 */}
      <div style={{ position: 'absolute', left: 0, top: 79, width: 1920, height: 1, background: 'rgba(255,255,255,0.1)' }} />
      {/* BI 로고 */}
      <div style={{ position: 'absolute', left: 64, top: 0, width: 191, height: 79 }}>
        <img src="/tt-index/assets/gnb/bi-logo.png" alt="TIME:TAKERS" style={{ width: 191, height: 79, objectFit: 'cover' }} />
      </div>
      {/* 메뉴 */}
      <div style={{ position: 'absolute', left: 350, top: 24.5, display: 'flex', gap: 44, alignItems: 'flex-start' }}>
        {MENU.map((m) => (
          <div key={m.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <p className="f-pl-sb" style={{ fontSize: 22, letterSpacing: 0.5, whiteSpace: 'nowrap', color: m.active ? '#1bb8f2' : '#fff' }}>
              {m.label}
            </p>
            {m.active && <div style={{ width: 28, height: 2, background: '#1bb8f2' }} />}
          </div>
        ))}
      </div>
    </div>
  )
}
