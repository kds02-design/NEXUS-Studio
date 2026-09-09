// PromptAudit — 충돌 유형·심각도·감사관 지시문·요청 본문 (순수 모듈). gemini.js(앱)와 MCP 가 같은 문구를 쓴다.

// 입력 프롬프트 글자 수 상한. UI textarea maxLength 와 service 가드에 모두 사용.
export const PROMPT_MAX_LENGTH = 3000;

export const CONFLICT_TYPES = {
  LOGIC_CONFLICT:    { label: "논리 충돌",      color: "#ef4444" },
  STYLE_MIX:         { label: "스타일 혼재",    color: "#f59e0b" },
  TOKEN_REDUNDANCY:  { label: "토큰 중복",      color: "#A29BFE" },
  NEGATIVE_CLASH:    { label: "Neg/Pos 모순",   color: "#fb7185" },
  RESOLUTION_ASPECT: { label: "해상도/비율",    color: "#0ea5e9" },
  VAGUE_DIRECTION:   { label: "지시 모호",      color: "#94a3b8" },
};

export const SEVERITY_META = {
  high: { label: "심각", color: "#ef4444", rank: 3 },
  med:  { label: "보통", color: "#f59e0b", rank: 2 },
  low:  { label: "경미", color: "#94a3b8", rank: 1 },
};

// sourceApp 별 추가 컨텍스트 — Gemini 가 도메인 특성에 맞게 분석하도록 힌트.
export const SOURCE_CONTEXT = {
  "typecore-sovereign": "RPG/판타지 게임 타이포그래피. 카메라 락, 정면 정렬, 메탈/스톤 재질, 림라이트, VFX 절제가 중요.",
  "typecore-breeze":    "캐주얼 게임 타이포그래피. 밝은 톤, 둥근 형태, 즐거운 모션이 중심.",
  "render-metrics":     "2D→2.5D 입체화 렌더링 (Imagen). 형태 보존이 최우선이며 카메라/조명/재질이 일관돼야 함.",
  "render-matrix-pop":  "팝 스타일 렌더링. 비비드한 컬러와 캐주얼 톤.",
  "motion-metrics":     "영상 모션 프롬프트 (Veo). 카메라 움직임, 시간 흐름, 시작-중간-끝 일관성.",
  "prompt-arc":         "공유 프롬프트 — 다양한 도메인이 섞여 있을 수 있음. 도메인 명시 여부도 검토.",
};

export const ANALYZER_INSTRUCTIONS = `당신은 시각·영상 프롬프트 감사관(Prompt Auditor)입니다.
입력 프롬프트에서 다음 충돌 유형을 찾아내고, 각 충돌마다 2~3개의 대안 수정안을 제시하세요.

[충돌 유형]
- LOGIC_CONFLICT — 상호 배타적 지시 (예: "static camera" + "panning")
- STYLE_MIX — 양립 불가 미학 (예: "photorealistic" + "cartoon")
- TOKEN_REDUNDANCY — 동의/반복 (예: "bright, luminous, glowing")
- NEGATIVE_CLASH — 긍정 토큰과 negative 토큰이 모순
- RESOLUTION_ASPECT — 비율/구도와 피사체 프레이밍 불일치
- VAGUE_DIRECTION — "epic", "amazing" 같은 모호어로 충돌은 아니지만 약점

[심각도]
- high: 결과를 망가뜨릴 가능성이 큰 충돌
- med:  결과가 약간 어긋날 가능성
- low:  스타일/표현 다듬기 수준

[출력 — JSON 만, 코드블록/설명 금지]
{
  "summary": "한 문장 총평 (한국어)",
  "score": 0-100,           // 명료도/일관성 종합 점수
  "conflicts": [
    {
      "id": "c1",
      "type": "LOGIC_CONFLICT|STYLE_MIX|TOKEN_REDUNDANCY|NEGATIVE_CLASH|RESOLUTION_ASPECT|VAGUE_DIRECTION",
      "severity": "high|med|low",
      "title": "한국어 짧은 제목 (12자 이내)",
      "evidence": "원문에서 추출한 인용구 (영어 그대로)",
      "explanation": "왜 문제인지 한국어로 1~2문장",
      "suggestions": [
        { "label": "옵션 짧은 한국어 라벨", "rewrite": "수정된 영문 표현" }
      ]
    }
  ],
  "globalSuggestions": ["전반적으로 추가하면 좋은 한국어 조언 1~3개"],
  "improvedPrompt": "충돌을 자동으로 해소한 최종 영문 프롬프트 1벌"
}

규칙:
1. conflicts 가 없으면 빈 배열로. summary 에 "충돌 없음" 명시.
2. suggestions 의 rewrite 는 원문 톤/길이를 유지하고 영문 그대로.
3. improvedPrompt 는 항상 1벌 — 충돌 없으면 원문을 그대로 반환.
4. JSON 외의 텍스트 절대 출력 금지.
5. **conflicts 는 최대 5개**, 각 suggestions 는 **최대 3개**. 우선순위 높은 항목만 보고.
6. summary 는 100자 이내, explanation 은 80자 이내 (토큰 절약).`;

export function buildContents(prompt, sourceApp, sourceMeta) {
  const ctx = SOURCE_CONTEXT[sourceApp] || "";
  const ctxLine = ctx ? `[도메인 컨텍스트] ${sourceApp}: ${ctx}\n\n` : "";
  const metaLine = sourceMeta?.title ? `[원본 제목] ${sourceMeta.title}\n` : "";
  const user = `${ctxLine}${metaLine}[입력 프롬프트]\n${prompt}`;
  return [{
    role: "user",
    parts: [{ text: `${ANALYZER_INSTRUCTIONS}\n\n${user}` }],
  }];
}

// 단일 텍스트 프롬프트 — 외부 모델(Claude 등)이 앱과 같은 감사를 수행할 때 그대로 사용.
export function buildAuditPromptText(prompt, sourceApp = null, sourceMeta = null) {
  return buildContents(prompt, sourceApp, sourceMeta)[0].parts[0].text;
}
