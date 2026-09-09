// 디자인 평가 프롬프트 빌더 — 순수 모듈(React/Firestore/브라우저 의존 없음).
// DesignEvaluator 앱이 쓰던 인라인 문구를 그대로 옮겼다. MCP(nexus_design_evaluation_prompt)와 스킬이
// 같은 함수를 호출하므로 "앱에서 매긴 점수"와 "스킬이 매긴 점수"의 프롬프트가 갈라지지 않는다.
//
//   buildCriteriaPromptText(source)      — [임무 2] 카테고리별 평가 항목 블록 (+ 필수 사전 검사 + reason 규칙)
//   buildScoringRulesPromptText(source)  — [카테고리별 채점 규칙] 블록 (rules 가 있는 타입만)
//   buildCategoryInstruction(category)   — auto 면 분류 지시, 고정이면 카테고리 고정 지시
//   buildDesignEvaluationPrompt({...})   — 위를 조립한 전체 프롬프트 (앱의 dynamicPrompt 와 동일)
//   buildEvaluationResponseSchema(keys)  — Gemini responseSchema (scores_data 를 활성 항목 id 로 강제)
//   criteriaSourceFromSnapshot(snapshot) — MCP 스냅샷 → source 형태 { [type]: { items, rules } }
//
// source 형태: { [criteriaType]: { items:[{id,name,weight,description}], rules?:string } }
import { formatCriteriaList } from "./evaluationCriteriaSeeds.js";

export const CRITERIA_PROMPT_LABELS = {
  banner: "배너 / 기타", promotion: "프로모션 페이지", promotionMobile: "프로모션 모바일",
  promotionKv: "프로모션 키비주얼", brandweb: "브랜드웹_메인", brandwebSub: "브랜드웹_서브",
  brandwebMobile: "브랜드웹_모바일", typo2d: "2D 타이포", typoRender: "렌더링 타이포", typoMotion: "모션 타이포",
};


export const buildCriteriaPromptText = (source) => `[임무 2: 카테고리별 평가 항목 (각 100점 만점)]
각 항목에 대해 100점 만점 기준의 점수(score)와 관찰 근거가 분명한 한 줄 평가(reason)를 작성하세요.
판별/지정된 카테고리의 항목만 사용하고, 괄호 안 JSON 키를 정확히 유지하세요.

${Object.entries(source || {}).map(([type, entry]) => `▶ [${CRITERIA_PROMPT_LABELS[type] || type}]\n${formatCriteriaList(entry?.items || [])}`).join("\n\n")}

[필수 사전 검사]
- 잘못된 카피·날짜·로고, 콘텐츠 잘림, 깨진 투명도, 캐릭터/FX 오정렬을 발견하면 hardFailures에 기록하세요.
- 의도적으로 텍스트나 CTA가 없는 이미지형 배너에는 누락 자체를 감점하지 마세요.
- recommendedCorrections에는 가장 영향이 큰 수정만 최대 3개 작성하세요.

[reason 작성 규칙]
- 85점 이상은 우수한 요소의 구체적인 시각 근거를 작성하세요.
- 80점 미만은 명확한 문제와 수정 방향을 작성하세요.
- 구어체와 미사여구를 제외하세요.`;

export const buildScoringRulesPromptText = (source) => {
  const blocks = Object.entries(source || {})
    .filter(([, value]) => value?.rules && value.rules.trim())
    .map(([type, value]) => `▶ [${CRITERIA_PROMPT_LABELS[type] || type}] 채점 규칙:\n${value.rules.trim()}`);
  return blocks.length ? `\n[카테고리별 채점 규칙]\n${blocks.join("\n\n")}\n` : "";
};


// auto 분류 지시 — 앱의 카테고리 목록·모바일/데스크톱 구분 기준을 그대로 유지한다.
export const AUTO_CATEGORY_INSTRUCTION = `- category: 이미지의 형태와 목적에 따라 다음 중 하나로 정확히 분류하세요:
  · "배너" (캠페인/이벤트 배너 — 가로형/정사각형의 단일 시안)
  · "프로모션 페이지" (데스크톱 세로로 긴 랜딩 페이지 — 폭이 넓고 컬럼이 여럿 가능)
  · "프로모션 모바일" (모바일 세로 랜딩 페이지 — 폭이 좁고 단일 컬럼, 보통 750×5000+ 비율)
  · "프로모션 키비주얼" (프로모션 최상단 키비주얼/히어로 영역만 잘라낸 단일 시안 — 메인 일러스트+타이틀 중심, 하단 보상/약관 없음)
  · "브랜드웹_메인" / "브랜드웹_서브" (데스크톱 게임/브랜드 사이트)
  · "브랜드웹_모바일" (모바일 브랜드/게임 사이트 — 단일 화면 mockup, 보통 750×1234 또는 9:16~9:22 비율)
  · "2D 타이포" (글자 자체가 주인공인 평면 타이포그래피 디자인 — 벡터/플랫, 배경 효과 거의 없음)
  · "렌더링 타이포" (3D/PBR 렌더링된 타이포 — 금속/얼음/돌 재질감, 라이팅, 깊이감)
  · "모션 타이포" (영상이나 모션이 강하게 느껴지는 키프레임 — 모션 블러, 파티클 궤적, 시퀀스 흔적, 글자가 시간 축으로 움직이는 인상)
  · "기타"
  ★ 모바일/데스크톱 구분 기준 (매우 중요):
     - 이미지 가로폭이 캔버스 짧은 변 기준 800px 이하 또는 좁은 폭(폰 베젤·단일 컬럼 레이아웃)이 명확하면 모바일.
     - 단일 폰 화면 mockup(세로 9:14~9:22 부근, 보통 750×~1234) → "브랜드웹_모바일" 또는 "프로모션 모바일".
     - 같은 모바일이라도 단일 화면 단위면 "브랜드웹_모바일", 길게 스크롤되는 랜딩이면 "프로모션 모바일".
  (타이포 구분 팁: 글자 자체에 3D 입체감/재질감이 있으면 "렌더링 타이포". 모션블러나 글자 주변에 시간성 효과(궤적)가 있으면 "모션 타이포". 평면이면 "2D 타이포".)`;

export function buildCategoryInstruction(category = 'auto') {
  return category === 'auto'
    ? AUTO_CATEGORY_INSTRUCTION
    : `- category: 이 디자인은 "${category}"입니다. 반드시 이 값으로 고정하여 출력하고, 평가 기준도 해당 카테고리에 맞춰 진행하세요.`;
}

// 전체 평가 프롬프트. criteriaText/rulesText 를 안 주면 criteriaSource 로부터 만든다.
export function buildDesignEvaluationPrompt({
  category = 'auto',
  criteriaSource = null,
  criteriaText = null,
  rulesText = null,
  anchorsText = '',
} = {}) {
  const introInstruction = category === 'auto'
    ? '첨부된 이미지를 분석하여 디자인 카테고리를 분류하고,'
    : `첨부된 디자인은 [${category}]입니다. 이 사실을 바탕으로`;
  const criteriaBlock = criteriaText ?? buildCriteriaPromptText(criteriaSource);
  const rulesBlock = rulesText ?? buildScoringRulesPromptText(criteriaSource);
  return `당신은 게임/IT 디자인을 심사하는 최고 권위의 AI 평가단입니다.
${introInstruction} 선택된 활성 기준의 평가 항목을 하나도 누락하지 말고 정밀 평가하세요.

[임무 1: 메타데이터 추출]
- title: 디자인의 메인 텍스트(제목) 추출.
${buildCategoryInstruction(category)}
- date_info: 이벤트 기간/날짜 (있을 경우).
- tags: 컬러, 분위기, 특징 위주로 반드시 '한글'로만 3~5개 작성 (예: "다크판타지", "황금빛", "캐주얼", "화려한").

${criteriaBlock}
${rulesBlock}${anchorsText || ''}
반드시 지정된 JSON 스키마에 맞추어 활성 평가 항목 전체를 단 하나도 누락 없이 답변하세요.`;
}

// Gemini responseSchema — scores_data 키를 활성 항목 id 로 강제. 앱(DesignEvaluator)과 동일 형태.
export function buildEvaluationResponseSchema(scoreKeys = [], { includeCategory = true, includePurpose = false, includeSummary = false } = {}) {
  const keys = (Array.isArray(scoreKeys) ? scoreKeys : []).map(String).filter(Boolean);
  const properties = {
    title: { type: "STRING" },
    ...(includeCategory ? { category: { type: "STRING" } } : {}),
    date_info: { type: "OBJECT", properties: { year: { type: "STRING" }, month: { type: "STRING" }, full_date: { type: "STRING" } } },
    tags: { type: "ARRAY", items: { type: "STRING" } },
    ...(includePurpose ? { purpose: { type: "STRING" } } : {}),
    ...(includeSummary ? { summary: { type: "STRING" } } : {}),
    scores_data: {
      type: "OBJECT",
      properties: Object.fromEntries(keys.map((key) => [key, {
        type: "OBJECT",
        properties: { score: { type: "NUMBER" }, reason: { type: "STRING" } },
        required: ["score", "reason"],
      }])),
      required: [...keys],
    },
    hardFailures: { type: "ARRAY", items: { type: "STRING" } },
    recommendedCorrections: { type: "ARRAY", items: { type: "STRING" } },
  };
  const required = ["title", ...(includeCategory ? ["category"] : []), "tags", "scores_data", "hardFailures", "recommendedCorrections"];
  return { type: "OBJECT", properties, required };
}

// MCP/스킬용 — loadActiveNexusCriteria 스냅샷(criteriaType/criteria/rules)을 source 형태로.
export function criteriaSourceFromSnapshot(snapshot) {
  if (!snapshot?.criteriaType) return {};
  return {
    [snapshot.criteriaType]: {
      items: Array.isArray(snapshot.criteria) ? snapshot.criteria : [],
      rules: typeof snapshot.rules === 'string' ? snapshot.rules : '',
      versionId: snapshot.criteriaVersionId || '',
      versionName: snapshot.criteriaVersionName || '',
    },
  };
}
