// 배경 퀄리티업 — 스킬 조합 순서 (★순수 모듈 — 브라우저/Node 공용★).
// qualityEnhancer.js 에서 분리: 의존이 없어 MCP 서버에서도 그대로 import 한다.
// 순서·삽입 규칙 수정은 이 파일 한 곳에서 — qualityEnhancer 가 재수출하므로 앱 호출부는 변화 없음.

// 배경 모드 정책: 캐릭터(얼굴·체형·의상·포즈)·타이틀 형태는 절대 보존하되, ★배경★의 빛·색·대기를
// 드라마틱하게 강화. bg-preserve-layout(배치만 고정, 배경 색·빛은 변경 허용) 이 핵심.
// bg-mood-theme 은 분위기 프리셋/컬러 시스템 연동이 있을 때만 삽입 (아래 buildEnhancePrompt).
export const ENHANCE_SKILLS_BG = [
  "quality-up/bg-intro",
  "quality-up/no-new-elements",
  "quality-up/no-new-text",
  "quality-up/preserve-letterform",
  "quality-up/preserve-face",
  "quality-up/preserve-subject",
  "quality-up/bg-preserve-layout",
  "quality-up/preserve-edge-fade",
  "quality-up/bg-dramatic-light",
  "quality-up/title-hero",
  "quality-up/allow-title-finish",
  "quality-up/outro",
];

// 스킬 id 조합 — mood/palette(부스트) 있으면 bg-mood-theme 을 title-hero 앞에 삽입,
// 추가 지시가 있으면 user-extra-guard 를 끝에 붙인다. (composeSkills 호출은 각 런타임이 담당.)
export function buildQualityUpSkillIds(hasBoost = false, hasExtra = false) {
  const ids = [...ENHANCE_SKILLS_BG];
  if (hasBoost) ids.splice(ids.indexOf("quality-up/title-hero"), 0, "quality-up/bg-mood-theme");
  if (hasExtra) ids.push("quality-up/user-extra-guard");
  return ids;
}
