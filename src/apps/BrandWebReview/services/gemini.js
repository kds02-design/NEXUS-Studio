// 첫 PC 이미지를 Gemini 에 보내 추정 게임명을 받아오는 보조 서비스.
// Brand Web Review → Library 발행 시 사용자가 게임 카테고리를 빠르게 채울 수 있게 한다.

import { GEMINI_API_KEY, geminiUrl, DEFAULT_GEMINI_MODEL } from "../../../lib/gemini";

// 입력: Cloudinary url 또는 dataURL.
// 출력: { game: string, confidence: 'high'|'medium'|'low', note: string }
export async function inferGameFromImage(imageUrl, knownGames = []) {
  if (!GEMINI_API_KEY) throw new Error("VITE_GEMINI_API_KEY 누락");
  if (!imageUrl) throw new Error("이미지가 없습니다");

  // 이미지 → base64 변환 (CORS 안전한 fetch).
  let base64;
  let mimeType = "image/jpeg";
  if (imageUrl.startsWith("data:")) {
    const [meta, b] = imageUrl.split(",");
    base64 = b;
    mimeType = meta.match(/data:([^;]+);/)?.[1] || "image/jpeg";
  } else {
    const res = await fetch(imageUrl, { mode: "cors" });
    if (!res.ok) throw new Error(`이미지 다운로드 실패 ${res.status}`);
    const blob = await res.blob();
    mimeType = blob.type || "image/jpeg";
    const dataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    base64 = dataUrl.split(",")[1];
  }

  const knownList = (knownGames || []).filter(Boolean).slice(0, 30);
  const knownText = knownList.length
    ? `\n[기존 라이브러리 게임 목록]\n${knownList.join(", ")}\n  → 위 목록과 일치하는 게임이면 정확히 동일한 표기를 사용. 새 게임이면 새 이름 제안.`
    : "";

  const systemPrompt = `당신은 NC 게임사의 브랜드 웹 디자인을 분석하는 큐레이터입니다.
입력된 브랜드 사이트 스크린샷을 보고 어떤 게임의 프로모션인지 추정하세요.

[추정 단서]
- 로고/타이틀 텍스트 (한글 또는 영문)
- UI 컬러 톤, 폰트 스타일
- 캐릭터/일러스트 단서
- 게임명이 직접 노출되어 있다면 그대로 사용
${knownText}

[출력 — JSON 만, 코드블록/설명 금지]
{
  "game": "추정 게임명 (한국어 표기 우선)",
  "confidence": "high|medium|low",
  "note": "한 문장 근거 (한국어)"
}

규칙:
1. 게임명을 도저히 추정할 수 없으면 "기타" 반환 + confidence "low".
2. 알려진 NC 타이틀 예시: 아이온, 블레이드앤소울(블소), 리니지, 리니지M, 리니지W, TL(쓰론앤리버티), 호연, 길드워, 트리니티.
3. 한국어/영문 혼용 시 일반적인 한국어 표기 선호.
4. note 는 40자 이내.`;

  const body = {
    contents: [{
      role: "user",
      parts: [
        { inlineData: { mimeType, data: base64 } },
        { text: "이 브랜드 웹 스크린샷의 게임을 추정해주세요." },
      ],
    }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 256,
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(geminiUrl(DEFAULT_GEMINI_MODEL), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  let parsed;
  try { parsed = JSON.parse(text); }
  catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("응답 파싱 실패");
    parsed = JSON.parse(m[0]);
  }
  return {
    game: String(parsed.game || "기타").trim() || "기타",
    confidence: ["high", "medium", "low"].includes(parsed.confidence) ? parsed.confidence : "low",
    note: String(parsed.note || "").trim(),
  };
}
