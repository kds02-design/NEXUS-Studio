// 반려동물 MBTI — Gemini AI 심층 리포트.
// 유형 판정은 클라이언트 로직(결정론)이 하고, Gemini 는 관찰 응답을 근거로 한 해석·조언만 생성.
// URL 의 key 는 더미 — lib/gemini.js 의 window.fetch 래퍼가 /api/gemini 프록시로 우회, 서버가 키 주입.
import { geminiUrl, DEFAULT_GEMINI_MODEL } from "../../../lib/gemini";

const TIMEOUT_MS = 60000;

async function generateText(prompt, { temperature = 0.9, maxOutputTokens = 4096 } = {}) {
  const controller = new AbortController();
  const tid = setTimeout(() => { try { controller.abort(); } catch { /* noop */ } }, TIMEOUT_MS);
  try {
    const res = await fetch(geminiUrl(DEFAULT_GEMINI_MODEL), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        // flash 는 생각 토큰이 출력 한도를 먼저 소모해 본문이 잘릴 수 있음 → thinking 비활성.
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
    const out = (cand?.content?.parts || []).map((p) => p.text || "").join("").trim();
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

// 12문항 관찰 응답 + 판정 결과를 근거로 한 심층 성격 리포트.
export async function generatePetReport({ speciesLabel, callName, name, type, typeName, typeDesc, axisSummary, observations, ownerMbti, compat }) {
  const ownerBlock = ownerMbti
    ? `집사 MBTI: ${ownerMbti} (재미용 궁합 ${compat?.score ?? "?"}점 · ${compat?.t ?? ""})`
    : "집사 MBTI: 미입력";
  const prompt = `당신은 유쾌하고 다정한 반려동물 행동 전문가다. 아래는 집사가 12문항으로 관찰한 ${speciesLabel}의 성격 검사 결과다. 판정(유형·점수)은 이미 끝났으니 다시 계산하지 말고, 관찰 응답을 근거로 해석과 조언만 쓰라. 재미용 콘텐츠이며 의학적 진단이 아니다.

[검사 결과]
이름: ${name} (${speciesLabel})
판정 유형: ${type} 「${typeName}」 — ${typeDesc}
축별 점수: ${axisSummary}
${ownerBlock}

[집사의 관찰 응답 12개]
${observations.map((o, i) => `${i + 1}. ${o.q} → ${o.a}`).join("\n")}

작성 규칙 (한국어, 총 450~650자):
- 아래 3개 부분으로 나누고, 각 부분은 「제목 줄」 뒤에 문장을 쓴다. 부분 사이는 빈 줄.
  ① 우리 ${callName}의 속마음 — 관찰 응답 중 구체적인 행동 2~3개를 직접 인용하며 성격을 입체적으로 해석
  ② 맞춤 케어 꿀팁 — 이 유형·응답에 딱 맞는 놀이/환경/케어 팁 3가지 (번호로 짧게)
  ③ 집사와의 케미 — ${ownerMbti ? "집사 MBTI와의 궁합을 재미있게 풀어주고 관계 조언 1가지" : "이 아이와 더 가까워지는 관계 조언 1~2가지"}
- "~예요/~해요" 체의 다정하고 유쾌한 어조, 이모지는 부분 제목에만 1개씩 허용
- 마크다운 문법(#, *, - 등) 금지 — 제목 줄과 ①②③, 1.2.3. 번호만 사용
- 건강·질병 관련 단정 금지. 행동 문제가 심각해 보이면 전문가 상담을 부드럽게 권유`;
  return generateText(prompt, { temperature: 0.9 });
}
