import Gnb from './sections/Gnb.jsx'
import Hero from './sections/Hero.jsx'
import News from './sections/News.jsx'
import FeatMechanic from './sections/FeatMechanic.jsx'
import FeatTraveler from './sections/FeatTraveler.jsx'
import FeatApp from './sections/FeatApp.jsx'
import FeatGameMode from './sections/FeatGameMode.jsx'
import FeatMap from './sections/FeatMap.jsx'
import ClosingCta from './sections/ClosingCta.jsx'
import Footer from './sections/Footer.jsx'
import SnsRail from './components/SnsRail.jsx'

// 페이지 셸 — Figma 프레임 "TT_Index — 발전안 (B안)" 의 세로 섹션 스택(합계 7637px).
// GNB(sticky) 는 히어로 위에 겹치므로 음수 margin 으로 플로우 공간을 제거해 상단 고정.
export default function TTIndex() {
  return (
    <div className="tt-page">
      <Gnb />
      <Hero />
      <News />
      <FeatMechanic />
      <FeatTraveler />
      <FeatApp />
      <FeatGameMode />
      <FeatMap />
      <ClosingCta />
      <Footer />
      <SnsRail />
    </div>
  )
}
