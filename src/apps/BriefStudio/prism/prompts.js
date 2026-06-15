// BriefStudio · Prism — prism/prompts.js
// 프롬프트는 provider와 무관하게 동일하게 유지한다. 모델 차이는 어댑터(responseSchema·temperature)로 흡수.

export const PATTERN_VOCAB =
  'craft-formula(제작식 A+B→C) | result-grid(결과 그리드, 확률·OR 분기) | ' +
  'package-card(유료 패키지 카드: 가격·인장·구성품) | selection-grid(N종 중 택1 선택 상자 그리드) | ' +
  'craft-rows(교환/확정제작 행 반복: X→Y, 횟수 제한) | showcase(대표 상품 쇼케이스: 혜택 태그) | ' +
  'unknown(어휘 밖 신규 패턴)';

export function extractionPrompt(extraNote = '') {
  return [
    '당신은 NCSOFT 게임 프로모션 페이지 제작을 위한 요청서 분석기다.',
    '입력은 사업부서의 제작요청서 또는 수정요청서이며 형식이 일정하지 않다. 맥락을 읽고 페이지의 전체 구조와 세부 데이터를 추출한다.',
    '',
    '섹션 패턴 어휘: ' + PATTERN_VOCAB,
    '',
    '규칙:',
    '- 수치(X150, 99%, 50,000, 계정당 8회, 기간)는 문서 원문 그대로 보존한다.',
    '- 아이템명은 정식 명칭 그대로, 괄호·강화수치(+5~+7) 포함.',
    '- 해당 없는 필드는 빈 문자열/빈 배열로 둔다. structure는 페이지 등장 순서.',
    '- 패턴 어휘에 맞지 않으면 pattern을 "unknown"으로 두고 note에 형태를 설명한다.',
    '- 확신이 없는 부분은 비워두지 말고 최선 추정 후 uncertain 배열에 사유를 적는다.',
    extraNote ? '\n사용자 교정 지시 (최우선 반영): ' + extraNote : '',
  ].join('\n');
}

export function opsPrompt(extractedJson, schemaJson) {
  return [
    '아래 [추출데이터]는 요청서에서 뽑은 페이지 데이터이고, [스키마]는 Figma 템플릿의 슬롯 골격(ops)이다.',
    '스키마의 각 op에서 value(텍스트류) 또는 match(이미지류)만 추출데이터의 올바른 값으로 교체하라.',
    '',
    '규칙:',
    '- id, slot, type 필드는 절대 변경·삭제·추가하지 않는다. op 순서도 유지한다.',
    '- type이 image인 op의 match는 해당 셀 아이템의 정식 명칭으로 넣는다.',
    '- 추출데이터에 대응 값이 없거나 매칭이 불확실하면 원래 값을 유지하고 "_review" 필드에 사유를 적는다.',
    '',
    '[추출데이터]', extractedJson, '', '[스키마]', schemaJson,
  ].join('\n');
}
