// Prism 페이지 프로필 레지스트리 — 범용 규칙(rules.js) + 페이지별 슬롯 매핑.
// 새 프로모션 페이지가 생기면 프로필만 추가한다. 규칙 본문은 건드리지 않는다.
import { osangseuProfile } from './osangseu.js';

export const PRISM_PROFILES = { [osangseuProfile.key]: osangseuProfile };
export const listPrismProfiles = () => Object.values(PRISM_PROFILES).map((p) => ({ id: p.key, label: p.label, game: p.game, description: p.description, stages: Object.keys(p.stages) }));
export const getPrismProfile = (key) => PRISM_PROFILES[key] || null;
