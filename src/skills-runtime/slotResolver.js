// 스킬 런타임 — 슬롯 리졸버.
// 사용자의 자유 텍스트 요청을 각 스킬 슬롯(옵션 목록)의 id 로 매핑한다.
// RubiconForge 의 keywordOptionSetup 과 같은 아이디어를 스킬 매니페스트 범용으로 일반화.
// Gemini JSON 모드를 쓰되, 실패해도 빈 객체를 반환해 러너가 대화로 되물으면 되도록 graceful.
import { geminiUrl } from "../lib/gemini";

async function postGemini(payload, model = "gemini-2.5-flash") {
  // lib/gemini 의 window.fetch 래퍼가 /api/gemini 프록시로 자동 우회 + key 제거.
  const res = await fetch(geminiUrl(model), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// freeText → { [slotKey]: id }. 확신이 없으면 그 키는 생략(러너가 되물음).
export async function resolveSlots(freeText, slots) {
  const optioned = (slots || []).filter((s) => Array.isArray(s.options) && s.options.length);
  const text = String(freeText || "").trim();
  if (!optioned.length || !text) return {};

  const lists = optioned
    .map((s) => `- ${s.key}: [${s.options.map((o) => o.id).join(", ")}]  // ${s.label}`)
    .join("\n");
  const keys = optioned.map((s) => s.key).join(", ");
  const system = `너는 사용자의 한국어 요청을 프리셋 옵션 ID로 매핑하는 도구다. 각 key 에 대해 목록 중 가장 잘 맞는 id 하나를 고르고, 요청에서 분명히 드러나지 않으면 그 key 는 null 로 두어라. 반드시 순수 JSON 객체로만 응답하고 키는 정확히 이것들: ${keys}. 값은 각 목록에 있는 id 문자열 또는 null 이어야 한다.
[옵션 목록]
${lists}`;

  try {
    const r = await postGemini({
      contents: [{ role: "user", parts: [{ text: `요청: "${text}"` }] }],
      systemInstruction: { parts: [{ text: system }] },
      generationConfig: { responseMimeType: "application/json" },
    });
    const raw = r.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const parsed = JSON.parse(raw);
    const out = {};
    for (const s of optioned) {
      const v = parsed[s.key];
      if (v && s.options.some((o) => o.id === v)) out[s.key] = v; // 유효 id 만 채택
    }
    return out;
  } catch {
    return {}; // 텍스트 매핑 실패 → 러너가 모든 필수 슬롯을 대화로 물음
  }
}
