// PromptAudit — Gemini 기반 프롬프트 충돌 분석.
// 입력: { prompt, sourceApp?, sourceMeta? }
// 출력: { summary, score, conflicts:[{...}], globalSuggestions, improvedPrompt }
import { GEMINI_API_KEY, geminiUrl, DEFAULT_GEMINI_MODEL } from "../../../lib/gemini";

// 상수·감사 지시문·요청 본문 빌더는 순수 모듈(auditPrompt.js) — MCP(nexus_prompt_audit_prompt)와 공유. 기존 import 경로 호환용 재수출.
import { PROMPT_MAX_LENGTH, CONFLICT_TYPES, SEVERITY_META, SOURCE_CONTEXT, ANALYZER_INSTRUCTIONS, buildContents, buildAuditPromptText } from "./auditPrompt";
export { PROMPT_MAX_LENGTH, CONFLICT_TYPES, SEVERITY_META, SOURCE_CONTEXT, ANALYZER_INSTRUCTIONS, buildContents, buildAuditPromptText };

// JSON 추출 — Gemini 가 가끔 코드블록으로 감싸 보내거나, 토큰 초과로 끝이 잘릴 수 있음.
function extractJson(text) {
  if (!text) return null;
  // ```json ... ``` 우선
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1] : text;
  // 첫 { 위치
  const first = raw.indexOf("{");
  if (first < 0) return null;
  const candidate = raw.slice(first);
  // 1차: 마지막 } 까지 정상 슬라이스 시도
  const last = candidate.lastIndexOf("}");
  if (last > 0) {
    try { return JSON.parse(candidate.slice(0, last + 1)); }
    catch { /* truncate 보정으로 진행 */ }
  }
  // 2차: 잘림 보정 — 열린 괄호 카운트해서 부족한 만큼 닫아본다.
  let depth = 0, bracket = 0, inStr = false, esc = false;
  let lastValidEnd = -1;
  for (let i = 0; i < candidate.length; i++) {
    const ch = candidate[i];
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0 && bracket === 0) lastValidEnd = i; }
    else if (ch === "[") bracket++;
    else if (ch === "]") bracket--;
  }
  // 문자열 미닫이 보정 + 부족한 ] / } 채우기
  let fixed = candidate;
  if (inStr) fixed += '"';
  fixed += "]".repeat(Math.max(0, bracket));
  fixed += "}".repeat(Math.max(0, depth));
  try { return JSON.parse(fixed); }
  catch (e) {
    console.warn("[PromptAudit] JSON parse failed even after truncation repair:", e?.message);
    return null;
  }
}

export async function analyzePrompt({ prompt, sourceApp = null, sourceMeta = null, model = DEFAULT_GEMINI_MODEL }) {
  if (!GEMINI_API_KEY) throw new Error("VITE_GEMINI_API_KEY 누락");
  const trimmed = String(prompt || "").trim();
  if (!trimmed) throw new Error("EMPTY_PROMPT");
  if (trimmed.length > PROMPT_MAX_LENGTH) throw new Error(`프롬프트는 최대 ${PROMPT_MAX_LENGTH}자까지 분석할 수 있습니다.`);

  const body = {
    contents: buildContents(trimmed, sourceApp, sourceMeta),
    generationConfig: {
      temperature: 0.3,
      // 한국어 JSON 응답은 토큰 비용이 높음. conflicts 최대 5개 + 대안 3개 기준 약 3~5k 토큰.
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  };
  const res = await fetch(geminiUrl(model), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  const cand = data?.candidates?.[0];
  const text = cand?.content?.parts?.[0]?.text || "";
  const finishReason = cand?.finishReason || "";
  const parsed = extractJson(text);
  if (!parsed) {
    console.warn("[PromptAudit] raw response (parse failed):", text.slice(0, 1200), "finishReason:", finishReason);
    if (finishReason === "MAX_TOKENS") {
      throw new Error("응답이 너무 길어 잘렸습니다. 프롬프트를 줄여서 다시 시도해 주세요.");
    }
    if (finishReason === "SAFETY" || finishReason === "RECITATION" || finishReason === "BLOCKLIST") {
      throw new Error(`Gemini 안전 필터에 차단됐습니다 (${finishReason}).`);
    }
    throw new Error("응답 파싱 실패 — 다시 시도해 주세요. (응답이 JSON이 아닙니다)");
  }
  // 충돌 0건도 정상 케이스. issues/problems 같은 변형 키도 흡수.
  const rawConflicts =
    parsed.conflicts ?? parsed.issues ?? parsed.problems ?? [];
  if (!Array.isArray(rawConflicts)) {
    console.warn("[PromptAudit] conflicts field is not array:", typeof rawConflicts);
    parsed.conflicts = [];
  } else {
    parsed.conflicts = rawConflicts;
  }
  // 정합성 보정
  parsed.conflicts = parsed.conflicts.map((c, i) => ({
    id: c.id || `c${i+1}`,
    type: CONFLICT_TYPES[c.type] ? c.type : "VAGUE_DIRECTION",
    severity: SEVERITY_META[c.severity] ? c.severity : "med",
    title: String(c.title || "충돌 항목"),
    evidence: String(c.evidence || ""),
    explanation: String(c.explanation || ""),
    suggestions: Array.isArray(c.suggestions) ? c.suggestions.slice(0, 4).map((s, j) => ({
      label: String(s.label || `옵션 ${j+1}`),
      rewrite: String(s.rewrite || ""),
    })) : [],
  }));
  if (typeof parsed.score !== "number") parsed.score = Math.max(0, 100 - parsed.conflicts.length * 12);
  parsed.summary = String(parsed.summary || "");
  parsed.improvedPrompt = String(parsed.improvedPrompt || trimmed);
  parsed.globalSuggestions = Array.isArray(parsed.globalSuggestions) ? parsed.globalSuggestions.slice(0, 5) : [];
  return parsed;
}
