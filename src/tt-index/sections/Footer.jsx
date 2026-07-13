// 푸터 — Figma 318:3401 (1920×451). 배경 #0c0c0f + 정책 링크/저작권 텍스트 + SNS/BI 아이콘.
// 원본 Noto Sans KR → 미보유로 Paperlogy 대체.
const LINKS = [
  { t: '회사소개' },
  { t: '이용약관' },
  { t: '개인정보처리방침', b: true },
  { t: '정보주체의 권리보장' },
  { t: '청소년보호정책', b: true },
  { t: '운영정책' },
  { t: '쿠키정책' },
  { t: 'NC 프라이버시 센터' },
  { t: 'NCSOFT 서비스 동의' },
]

export default function Footer() {
  return (
    <section className="tt-section" style={{ height: 451, background: '#0c0c0f' }}>
      {/* 정책 링크 (318:3406) — 중앙 정렬 */}
      <div style={{ position: 'absolute', left: '50%', top: 224, transform: 'translateX(-50%)', display: 'flex', gap: 16, alignItems: 'center', whiteSpace: 'nowrap' }}>
        {LINKS.map((l) => (
          <span key={l.t} className={l.b ? 'f-pl-b' : 'f-pl-m'} style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{l.t}</span>
        ))}
      </div>
      {/* 구분선 2 (318:3417 / 318:3418) */}
      <div style={{ position: 'absolute', left: 520, top: 209, width: 880, height: 1, background: 'rgba(255,255,255,0.08)' }} />
      <div style={{ position: 'absolute', left: 520, top: 260, width: 880, height: 1, background: 'rgba(255,255,255,0.08)' }} />

      {/* 언어 선택 (318:3420) */}
      <div style={{ position: 'absolute', left: 860, top: 61, width: 200, height: 44, borderRadius: 4, background: '#0b0d16', border: '1px solid #222' }}>
        <p className="f-pl-m" style={{ position: 'absolute', left: 15, top: 11, fontSize: 14, color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>한국어 - 대한민국</p>
        <span style={{ position: 'absolute', left: 174, top: 12, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>⌄</span>
      </div>

      {/* SNS 아이콘 (318:3432) */}
      <img src="/tt-index/assets/footer/sns.png" alt="SNS" style={{ position: 'absolute', left: 881, top: 134, width: 159, height: 45 }} />

      {/* 저작권 (318:3426) — 중앙 정렬 3줄 */}
      <p style={{ position: 'absolute', left: '50%', top: 283, transform: 'translateX(-50%)', width: 900, textAlign: 'center', fontSize: 12, lineHeight: '18px', color: 'rgba(255,255,255,0.38)', letterSpacing: -0.7, fontFamily: "'Paperlogy'", fontWeight: 400 }}>
        상호 (주)엔씨소프트 공동 대표 김택진, 박병무 사업자 등록번호 144-85-04244 통신판매업신고 제2013-경기성남-1268호 사업자정보확인<br />
        주소 경기도 성남시 분당구 대왕판교로 644번길 12 고객상담 1600-0020 팩스 02-2186-3550 이메일 credit@ncsoft.com<br />
        ⓒMistil Games Co. Ltd licensed to NCSOFT Corporation. All Rights Reserved.
      </p>

      {/* BI 로고 (318:3431) */}
      <img src="/tt-index/assets/footer/bi.png" alt="NC" style={{ position: 'absolute', left: 937, top: 366, width: 47, height: 25 }} />

      {/* 탑버튼 (318:3440) */}
      <img src="/tt-index/assets/footer/topbtn.png" alt="Top" style={{ position: 'absolute', left: 1864, top: 395, width: 46, height: 46 }} />
    </section>
  )
}
