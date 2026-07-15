// 운명 관측소 — Gemini 해석 서비스.
// 원칙: 사주·오행·용신 계산은 전부 클라이언트 로직(결정론)이 담당하고,
// Gemini 는 이미 계산이 끝난 명식 데이터를 "해석·문장·이미지"로만 풀어낸다
// — 환각으로 간지·오행 계산 자체가 틀어질 여지를 차단.
// URL 의 key 는 더미 — lib/gemini.js 의 window.fetch 래퍼가 /api/gemini(텍스트) ·
// /api/gemini-img(이미지) 프록시로 우회하고 서버가 실제 키를 주입한다.
import { geminiUrl, DEFAULT_GEMINI_MODEL } from "../../../lib/gemini";
import { renderWithImagen } from "../../../lib/imagenRender";

const TIMEOUT_MS = 60000;
const TALISMAN_MODEL = "gemini-3.1-flash-image-preview"; // Nano Banana 2 — $0.067/장

async function generateText(prompt, { temperature = 0.9, maxOutputTokens = 4096 } = {}) {
  const controller = new AbortController();
  const tid = setTimeout(() => { try { controller.abort(); } catch { /* noop */ } }, TIMEOUT_MS);
  try {
    const res = await fetch(geminiUrl(DEFAULT_GEMINI_MODEL), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        // thinkingBudget 0 — flash 는 생각 토큰이 maxOutputTokens 를 먼저 소모해
        // 본문이 중간에 잘리는 문제가 있음 (BriefStudio 프리즘과 동일 대응).
        generationConfig: { temperature, maxOutputTokens, thinkingConfig: { thinkingBudget: 0 } },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Gemini ${res.status}: ${text.slice(0, 160)}`);
    }
    const data = await res.json();
    const cand = data.candidates?.[0];
    const out = (cand?.content?.parts || [])
      .map((p) => p.text || "").join("").trim();
    if (cand?.finishReason === "MAX_TOKENS") {
      throw new Error("답변이 길어져 중간에 잘렸어요. 다시 시도해 주세요.");
    }
    if (!out) throw new Error(`응답이 비어 있어요 (${cand?.finishReason || "?"}). 잠시 후 다시 시도해 주세요.`);
    return out;
  } catch (e) {
    if (e?.name === "AbortError") throw new Error("응답 시간이 초과됐어요. 다시 시도해 주세요.", { cause: e });
    throw e;
  } finally {
    clearTimeout(tid);
  }
}

// 명식 요약 포매터(buildChartBrief)는 ./shared 로 이동 — 독립 PWA 번들 분리를 위해.

const GROUNDING_RULE = `아래 [명식 데이터]는 이미 계산이 끝난 확정 값이다. 간지·오행·용신을 다시 계산하거나 데이터에 없는 값을 지어내지 말고, 오직 이 데이터만 근거로 해석하라. 구체적 연도의 재난·질병·죽음·합격/불합격 같은 단정 예언은 금지.`;

// ─── 1. AI 관측사의 심층 예언 (니체 문체 총평) ────────────────────────────────
export async function generateOracleSummary(brief, styleSample) {
  const prompt = `당신은 "운명 관측소"의 관측사 — 니체의 잠언 문체를 흉내 내는 예언자다. (실제 니체 인용이 아닌 창작 문체임을 전제로 한 재미용 콘텐츠)

${GROUNDING_RULE}

[명식 데이터]
${brief}

[문체 참고 예시 — 이 어조와 구조를 따르되, 문장을 그대로 베끼지 말고 명식 데이터에서 새로운 재료를 골라 쓸 것]
${styleSample}

작성 규칙:
- 한국어 500~800자, 3~5개 문단(문단 사이 빈 줄)
- "보라," "허나 명심하라" 같은 선언적 잠언 어조, 2인칭 "그대"
- 용신·기신은 쉬운 이름(새싹·불꽃·땅·칼·물)으로 부르고, 명식 데이터의 구체 값(대운 흐름·12궁·삼재·다섯 갈래 운 등)을 최소 3가지 근거로 엮을 것
- 생활 개운 조언 1~2가지를 잠언 속에 자연스럽게 녹일 것
- 마지막 문단은 통렬하지만 웃음이 나는 반전으로 끝낼 것
- 마크다운·머리기호·이모지·제목 없이 순수 문장만 출력`;
  return generateText(prompt, { temperature: 1.0 });
}

// ─── 2. 관측소에 물어보기 (명식 기반 고민 상담) ──────────────────────────────
export async function askOracle(brief, question, history = []) {
  const historyBlock = history.length
    ? `\n[이전 문답]\n${history.map((h) => `Q: ${h.q}\nA: ${h.a}`).join("\n\n")}\n`
    : "";
  const prompt = `당신은 "운명 관측소"의 관측사다. 사용자의 명식을 근거로 고민에 답하는 재미용 상담 콘텐츠다.

${GROUNDING_RULE}

[명식 데이터]
${brief}
${historyBlock}
[이번 질문]
${question}

답변 규칙:
- 한국어 250~400자, "~예요/~해요" 체의 따뜻하고 신비로운 어조
- 반드시 명식의 구체 근거(용신·해당 12궁·현재 대운·삼재 등)를 1개 이상 짚어서 연결할 것
- 오늘부터 할 수 있는 실천 조언 1가지 포함 (행운 컬러·방위·습관 활용 가능)
- 의료·법률·투자·시험 결과 등은 단정하지 말고 "재미로 참고만" 하라고 부드럽게 선을 그을 것
- 마크다운·머리기호 없이 순수 문장만 출력`;
  return generateText(prompt, { temperature: 0.85 });
}

// ─── 3. 오늘의 타로 × 명식 맞춤 풀이 ─────────────────────────────────────────
export async function generateTarotReading(brief, card, todayStr) {
  const prompt = `오늘의 타로 카드를 사용자의 명식과 엮어 오늘 하루의 맞춤 조언을 쓰는 재미용 콘텐츠다.

${GROUNDING_RULE}

[명식 데이터]
${brief}

[오늘의 카드] ${card.name} (${card.no}) — ${card.keyword}
[카드 기본 조언] ${card.base}
[오늘 날짜] ${todayStr}

작성 규칙:
- 한국어 200~320자, 2개 문단(문단 사이 빈 줄), "~예요/~해요" 체
- 1문단: 이 카드의 기운이 이 사람의 용신·기신·현재 흐름과 어떻게 맞물리는지
- 2문단: 오늘 실천할 아주 구체적인 행동 1가지 (행운 컬러·방위·음식·습관 중 활용)
- 마크다운·머리기호·이모지 없이 순수 문장만 출력`;
  return generateText(prompt, { temperature: 0.9 });
}

// ─── 4. 행운 부적 카드 이미지 ─────────────────────────────────────────────────
// 한글·문장 렌더링은 이미지 모델의 약점이라, 글자는 용신 오행 한자 1글자만 허용.
export async function generateTalisman({ yongGlyph, luckColorNames, luckColorHex, archetype }) {
  const prompt = `A single vertical mystical Korean fortune TALISMAN CARD (부적), luxury tarot-card style.
Background: deep midnight navy (#0C0F2B) with faint constellation lines and tiny star specks.
Frame: ONE thin, ornate antique-gold (#C9A24B) border tracing the card edge — delicate filigree corners, never thick.
Centerpiece: the East-Asian five-elements glyph "${yongGlyph}" rendered as a large glowing golden seal-stamp emblem, centered inside a circular five-element (wu xing) diagram with fine golden orbit lines, small moon phases, and subtle drifting mist.
Accent palette woven into the ornaments: ${luckColorNames} (${luckColorHex}).
Mood: sacred, celestial, protective lucky charm made for "${archetype}".
Fine linework, symmetrical composition, flat illustration with subtle glow, high detail.
STRICT RULES: no human figures, no animals, no readable words, sentences, numbers, or letters — the single glyph "${yongGlyph}" is the ONLY character allowed anywhere in the image.`;
  const r = await renderWithImagen(prompt, TALISMAN_MODEL, null, { aspectRatio: "2:3" });
  return r.dataUrl;
}
