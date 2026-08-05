// 스킬 레지스트리 — 대화형(채팅) 생성 스킬의 단일 진실 소스.
// 새 스킬 추가: 매니페스트 파일을 만들어 여기 배열에 등록하면 CommandPalette 에 자동 노출된다.
// (앱 추가와 달리 라우팅 switch 동기화 불필요 — 러너 SkillChat 가 매니페스트만으로 동작)
import { lightfxSkill } from "./lightfxSkill";
import { frameforgeSkill } from "./frameforgeSkill";
import { nexusPreviewSkills } from "./nexuspreviewSkills";

export const SKILL_REGISTRY = [lightfxSkill, frameforgeSkill, ...nexusPreviewSkills];

export const SKILL_MAP = Object.fromEntries(SKILL_REGISTRY.map((s) => [s.id, s]));

export const skillMatches = (skill, q) => {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    String(skill.label || "").toLowerCase().includes(needle) ||
    String(skill.sub || "").toLowerCase().includes(needle) ||
    "skill 스킬".includes(needle)
  );
};
