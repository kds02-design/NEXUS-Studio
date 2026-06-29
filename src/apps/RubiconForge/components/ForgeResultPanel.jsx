// 우측 결과 패널 — 현재 뷰에 맞는 그리드로 위임.
//   creation   → 버튼 리스킨 결과 그리드 (기존 버튼을 테마 톤별로 recolor)
//   micro-edit → 세부 에셋 디자인 대안 그리드
//   atlas      → 디자인 시스템(아틀라스) 리테마 그리드
// (구 프롬프트 생성 엔진 UI 는 리스킨 방식 개편으로 제거됨. 빌더 로직은 hook 에 보존.)

import ForgeReskinGrid from './ForgeReskinGrid';
import ForgeVariationGrid from './ForgeVariationGrid';
import ForgeAtlasGrid from './ForgeAtlasGrid';
import ForgeLightFxPanel from './ForgeLightFxPanel';

export default function ForgeResultPanel({ forge }) {
  const { currentView } = forge;
  if (currentView === 'micro-edit') return <ForgeVariationGrid forge={forge} />;
  if (currentView === 'lightfx') return <ForgeLightFxPanel forge={forge} />;
  // atlas 는 탭에서 내렸지만 PromotionArchive 마스터 핸드오프로 진입 시 그대로 동작.
  if (currentView === 'atlas') return <ForgeAtlasGrid forge={forge} />;
  return <ForgeReskinGrid forge={forge} />; // creation = 리스킨
}
