export const WEB_SCORE_LABELS = {
  info_structure: '정보 구조',
  visual_hierarchy: '비주얼 위계',
  typography: '타이포그래피',
  color_system: '컬러 시스템',
  layout_spacing: '레이아웃·여백',
  cta_interaction: 'CTA·인터랙션',
  brand_consistency: '브랜드 일관성',
  event_clarity: '이벤트·혜택 전달력',
  content_readability: '콘텐츠 가독성',
  impact: '차별화·임팩트',
};

export const getWebScoreLabel = (key) => WEB_SCORE_LABELS[String(key).toLowerCase()] || key;

export const WEB_EVALUATION_KEYS = [
  'info_structure', 'visual_hierarchy', 'typography', 'color_system', 'layout_spacing',
  'cta_interaction', 'brand_consistency', 'event_clarity', 'content_readability', 'impact',
];

export const getWebFinalScore100 = (banner) => {
  const aiBase100 = banner?.webAiScore != null
    ? Math.round(parseFloat(banner.webAiScore) * 10)
    : Math.round(parseFloat(banner?.designScore || 0) * 10) - parseInt(banner?.webManualScoreAdj || 0);
  return Math.min(99, Math.max(0, aiBase100 + parseInt(banner?.webManualScoreAdj || 0)));
};

export const hasWebEvaluation = (banner) => {
  if (!banner?.webScores) return false;
  return WEB_EVALUATION_KEYS.some(k => banner.webScores[k]?.score != null);
};

export const DEFAULT_WEB_EVAL_PROMPT = `당신은 브랜드 웹사이트 디자인을 심사하는 최고 권위의 AI 평가단입니다.
첨부된 프로모션 웹페이지 이미지를 10가지 세부 항목으로 나누어 정밀 평가하세요.

[임무 1: 메타데이터 추출]
- title: 이 프로모션·이벤트 페이지의 **공식 캠페인/이벤트 명**.
  - 보통 페이지 최상단 히어로 영역에 가장 큰 비주얼 타이틀로 노출됨.
  - 한글/영문 혼용 가능. 부제·서브 카피·CTA 문구는 제외.
  - **다음은 절대 title 로 잡지 마세요**:
    · 네비게이션·메뉴 항목 (홈/공지/이벤트 같은 단어 단독)
    · 카테고리·섹션 헤더 ("EVENT", "NEWS", "BENEFIT" 같은 라벨)
    · 게임 IP 이름 단독 (단, 게임명 + 이벤트명이면 OK)
    · 푸터·약관·저작권 텍스트
    · "지금 참여하기", "자세히 보기" 같은 행동 유도 문구
  - 공식 캠페인명을 찾을 수 없으면 빈 문자열로 반환.

- date_info: 페이지에 표시된 **이벤트/프로모션 기간**을 정확히 추출.
  - year: 4자리 연도 (예: "2026"). 찾을 수 없으면 빈 문자열.
  - month: 2자리 월 (예: "03"). 찾을 수 없으면 빈 문자열. 시작·종료가 다르면 **시작 월**.
  - full_date: 원문 그대로의 기간 표기 (예: "2026.03.05 ~ 2026.03.19"). 없으면 빈 문자열.
  - **반드시 이벤트 기간**을 찾으세요. 다음과 혼동 금지:
    · ⓒ 2024 NCSOFT 같은 **저작권 연도**
    · 뉴스/공지의 **게시일**
    · 게임 출시일·서비스 시작일 (이벤트 기간이 아닌 경우)
  - "이벤트 기간", "행사 기간", "참여 기간", "프로모션 기간" 등 명시적 라벨 옆 날짜를 우선.
  - **중요**: 페이지에 명확한 이벤트 기간이 없으면 절대 추측하지 말고 모두 빈 문자열로 반환하세요.

- tags: 분위기, 스타일, 키워드 위주로 반드시 '한글'로만 3~5개 작성.
- summary: 페이지 전체 인상에 대한 한 줄 요약.

[임무 2: 10대 평가 항목 (100점 만점)]
**⚠️ 반드시 아래 10개 항목 전부에 대해 score와 reason을 작성해야 합니다. 누락 금지.**

1. info_structure (정보 구조): 콘텐츠 계층, 섹션 구분, 정보 우선순위가 명확한가
2. visual_hierarchy (비주얼 위계): 시선이 따라가야 할 흐름과 강조가 의도대로 설계되었는가
3. typography (타이포그래피): 폰트 선택, 사이즈 위계, 줄간격, 자간이 브랜드와 어울리는가
4. color_system (컬러 시스템): 컬러 팔레트의 일관성, 메인/서브 컬러 사용 비율, 대비가 적절한가
5. layout_spacing (레이아웃·여백): 그리드 구조, 여백 운용, 정렬이 정돈되어 있는가
6. cta_interaction (CTA·인터랙션): 핵심 버튼/링크의 위치, 크기, 시각적 끌림이 충분한가
7. brand_consistency (브랜드 일관성): 게임 IP / 브랜드 톤앤매너와 페이지 디자인이 일치하는가
8. event_clarity (이벤트·혜택 전달력): 핵심 혜택·일정·참여 방법이 한눈에 들어오고, 사용자가 무엇을 얻고 어떻게 참여하는지 즉시 파악되는가
9. content_readability (콘텐츠 가독성): 본문/설명 텍스트가 읽기 편하고 정보가 잘 전달되는가
10. impact (차별화·임팩트): 다른 프로모션과 비교했을 때 인상에 남는 차별성과 완성도

* 60~95점 사이 폭넓은 점수 대역을 사용해 변별력을 확보하세요.
* reason은 군더더기 없이 핵심만 한 줄로 작성하세요.

반드시 지정된 JSON 스키마에 맞추어 답변하세요.`;
