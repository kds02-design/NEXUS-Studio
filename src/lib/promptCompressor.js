// 프롬프트 압축 — PromptAudit 의 analyzePrompt 로직을 재사용해서 inline 으로 짧은 프롬프트를 얻는다.
// 사용처: RenderMatrix, MotionMatrix, RenderMatrixPop 등 결과 프롬프트가 길어지는 앱.
//
// compressPrompt(prompt, sourceApp) → { improvedPrompt, conflicts, summary, savedChars, savedPct }
//   savedChars / savedPct: 압축으로 줄어든 글자 수 / 비율 (0~100). improvedPrompt 가 원본보다 짧을 때만 양수.

import { analyzePrompt } from "../apps/PromptAudit/services/gemini";

export async function compressPrompt(prompt, sourceApp = null) {
  const trimmed = String(prompt || "").trim();
  if (!trimmed) throw new Error("EMPTY_PROMPT");

  const result = await analyzePrompt({ prompt: trimmed, sourceApp });
  const improved = String(result.improvedPrompt || trimmed).trim();
  const savedChars = Math.max(0, trimmed.length - improved.length);
  const savedPct = trimmed.length > 0 ? Math.round((savedChars / trimmed.length) * 100) : 0;
  return {
    improvedPrompt: improved,
    conflicts: result.conflicts || [],
    summary: result.summary || "",
    score: typeof result.score === "number" ? result.score : null,
    savedChars,
    savedPct,
  };
}
