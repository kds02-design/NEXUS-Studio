// 섹션 공통 헤더 — eyebrow(Orbitron) + 타이틀(Paperlogy Bold) + 본문(Paperlogy Medium).
// Figma: GAME FEATURE 0N 패턴. accent 컬러만 섹션별로 다름(대부분 시안, 앱 시스템만 옐로).
export default function SectionHeader({
  eyebrow,
  title,        // 배열이면 줄바꿈
  body,         // 배열이면 줄바꿈
  accent = '#1bb8f2',
  left = 240,
  top = 300,
  titleSize = 52,
  titleWidth = 620,
  bodyTop,      // 본문 top (절대). 없으면 렌더 안 함
  bodyWidth = 600,
}) {
  const titleLines = Array.isArray(title) ? title : [title]
  const bodyLines = Array.isArray(body) ? body : body ? [body] : []
  return (
    <>
      <p
        className="f-ob-m"
        style={{ position: 'absolute', left, top, color: accent, fontSize: 15, letterSpacing: 2, whiteSpace: 'nowrap' }}
      >
        {eyebrow}
      </p>
      <div
        className="f-pl-b"
        style={{ position: 'absolute', left, top: top + 32, width: titleWidth, color: '#fff', fontSize: titleSize, lineHeight: 1.15 }}
      >
        {titleLines.map((t, i) => (
          <p key={i}>{t}</p>
        ))}
      </div>
      {bodyLines.length > 0 && (
        <div
          className="f-pl-m"
          style={{ position: 'absolute', left, top: bodyTop, width: bodyWidth, color: '#a8b2c4', fontSize: 18, lineHeight: 1.6 }}
        >
          {bodyLines.map((t, i) => (
            <p key={i}>{t}</p>
          ))}
        </div>
      )}
    </>
  )
}
