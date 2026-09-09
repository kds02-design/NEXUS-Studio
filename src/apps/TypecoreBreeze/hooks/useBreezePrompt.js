// 호환 shim — 빌더는 services/breezePrompt.js 로 이동 (React 훅이 아니라 순수 함수였음).
// 새 코드는 services/breezePrompt.js 를 직접 import 하세요.
export { buildPrompts, buildEditPrompts } from '../services/breezePrompt.js';
