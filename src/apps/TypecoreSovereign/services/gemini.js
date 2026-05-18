// 통합 Gemini 서비스 — API 키와 (이후 추가될) AI 분석 헬퍼.
// 모든 PromptEngine은 이 모듈만 import하여 Gemini를 호출한다.
export { GEMINI_API_KEY } from "../../../lib/gemini";

// TODO(Phase 2): fetch 호출을 감싸는 헬퍼 (e.g. callGemini(prompt, opts)) 추출.
// 현재는 각 PromptEngine 내부에 인라인 fetch가 남아 있음.
