// 평가 항목/가중치/라벨/프롬프트의 단일 진실 소스는 NexusAdmin 의 `evaluationCriteria` 컬렉션.
// 이 파일은 어드민 시드/활성 버전을 PromotionArchive 컨텍스트로 라우팅하는 헬퍼와
// 프롬프트 인트로 템플릿(평가 항목 리스트 자리는 {{CRITERIA_LIST}} 로 비워둠)을 제공.
import { CRITERIA_TYPES } from "../../../lib/evaluationCriteria";

// 브랜드웹 판정 — assetType === '브랜드웹'.
export const isBrandWebBanner = (banner) => banner?.assetType === '브랜드웹';

// 브랜드웹 메인/서브 — 기본 'main'. 평가 렌즈 결정에만 사용 (필터/카드 표시와 무관).
export const getBrandWebKind = (banner) => (banner?.brandWebKind === 'sub' ? 'sub' : 'main');

// banner → 어드민 평가기준 타입 매핑.
// 브랜드웹+sub → brandwebSub, 브랜드웹+main → brandweb, 그 외 → promotion.
export const resolveWebCriteriaType = (banner) => {
  if (isBrandWebBanner(banner)) {
    return getBrandWebKind(banner) === 'sub' ? CRITERIA_TYPES.brandwebSub : CRITERIA_TYPES.brandweb;
  }
  return CRITERIA_TYPES.promotion;
};

// 최종 점수 (0~99) — 저장된 webAiScore(0~9.9) × 10 + 수동 보정.
export const getWebFinalScore100 = (banner) => {
  const aiBase100 = banner?.webAiScore != null
    ? Math.round(parseFloat(banner.webAiScore) * 10)
    : Math.round(parseFloat(banner?.designScore || 0) * 10) - parseInt(banner?.webManualScoreAdj || 0);
  return Math.min(99, Math.max(0, aiBase100 + parseInt(banner?.webManualScoreAdj || 0)));
};

// 평가 존재 여부 — 키 셋과 무관하게 webScores 안에 score 가 한 개라도 있으면 true.
// (옛 키 셋으로 저장된 도큐먼트도 점수 칩은 표시되도록.)
export const hasWebEvaluation = (banner) => {
  if (!banner?.webScores) return false;
  return Object.values(banner.webScores).some(v => v && typeof v.score === 'number');
};

// ───────────────────────────────────────────────────────────
// 프롬프트 인트로 템플릿. 평가 항목 리스트 자리는 {{CRITERIA_LIST}} 로 둠 —
// services/gemini.js 가 활성 criteria 를 formatCriteriaList() 로 채워 넣음.
// ───────────────────────────────────────────────────────────

export const PROMOTION_INTRO_TEMPLATE = `당신은 브랜드 웹사이트 디자인을 심사하는 최고 권위의 AI 평가단입니다.
첨부된 프로모션 웹페이지 이미지를 아래 평가 항목으로 정밀 평가하세요.

**⚠️ 이미지 입력 구조 (중요)**
요청에는 여러 장의 이미지가 첨부됩니다:
  · 앞쪽 이미지들 = **앵커 참고 이미지** (점수 캘리브레이션 전용 — 메타데이터/점수 추출 대상 아님)
  · "[평가 대상 이미지 — ...]" 마커 직후의 **마지막 이미지** = 진짜 분석 대상
모든 메타데이터(title, date_info, tags, summary)와 모든 평가 점수는 **오직 마지막 평가 대상 이미지에서만** 추출하세요.
앵커 이미지의 제목·날짜·태그를 그대로 가져오거나 혼합하는 것은 절대 금지.

[임무 1: 메타데이터 추출 — 평가 대상 이미지만 보고 작성]
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

[임무 2: 평가 항목 (각 항목 0~100점)]
**⚠️ 반드시 아래 평가 항목 전부에 대해 score 와 reason 을 작성해야 합니다. 키 이름은 그대로 사용.**

{{CRITERIA_LIST}}

* 60~95점 사이 폭넓은 점수 대역을 사용해 변별력을 확보하세요.
* reason 은 군더더기 없이 핵심만 한 줄로 작성하세요.

반드시 지정된 JSON 스키마에 맞추어 답변하세요.`;

export const BRANDWEB_INTRO_TEMPLATE = `당신은 게임 브랜드 공식 사이트 디자인을 심사하는 최고 권위의 AI 평가단입니다.
첨부된 브랜드 사이트 페이지 이미지를 아래 평가 항목으로 정밀 평가하세요.
브랜드 사이트는 **이벤트/혜택 페이지가 아니라** 게임 IP·세계관·메인 메시지를 전달하는 페이지입니다.

**⚠️ 이미지 입력 구조 (중요)**
요청에는 여러 장의 이미지가 첨부됩니다:
  · 앞쪽 이미지들 = **앵커 참고 이미지** (점수 캘리브레이션 전용 — 메타데이터/점수 추출 대상 아님)
  · "[평가 대상 이미지 — ...]" 마커 직후의 **마지막 이미지** = 진짜 분석 대상
모든 메타데이터(title, date_info, tags, summary)와 모든 평가 점수는 **오직 마지막 평가 대상 이미지에서만** 추출하세요.
앵커 이미지의 제목·날짜·태그를 그대로 가져오거나 혼합하는 것은 절대 금지.

[임무 1: 메타데이터 추출 — 평가 대상 이미지만 보고 작성]
- title: 이 브랜드 사이트의 **공식 사이트 명 또는 메인 카피**.
  - 게임 IP명 + 사이트 컨셉(예: "리니지M 캐릭터 사이트"), 메인 슬로건, 캠페인 카피 등.
  - 네비게이션 메뉴/카테고리 헤더/푸터/저작권 텍스트는 제외.
  - 찾을 수 없으면 빈 문자열.
- date_info: 사이트에 명시된 **출시일·업데이트 일자** 등이 있으면 추출 (이벤트 기간 아님).
  - year/month/full_date — 없으면 모두 빈 문자열. 추측 금지.
- tags: 분위기/스타일/브랜드 키워드 위주로 반드시 '한글'로만 3~5개.
- summary: 사이트의 메인 메시지·인상에 대한 한 줄 요약.

[임무 2: 평가 항목 (각 항목 0~100점)]
**⚠️ 반드시 아래 평가 항목 전부에 대해 score 와 reason 을 작성. 키 이름은 그대로 사용.**

{{CRITERIA_LIST}}

* 60~95점 사이 폭넓은 점수 대역을 사용해 변별력 확보.
* reason 은 군더더기 없이 핵심만 한 줄로.

반드시 지정된 JSON 스키마에 맞추어 답변하세요.`;

// 서브 페이지일 때 인트로에 한 줄 부가 컨텍스트.
export const BRANDWEB_SUB_SUFFIX = `\n[참고: 이 페이지는 브랜드웹 서브 페이지(메인 히어로가 아닌 내부 콘텐츠 페이지)입니다. 메인 히어로의 강한 임팩트보다는 콘텐츠 구조·정보 위계·브랜드 연속성에 무게를 두어 평가하세요.]\n`;

// 타입별 인트로 셀렉터.
export const getIntroTemplateFor = (criteriaType) => {
  if (criteriaType === CRITERIA_TYPES.brandweb || criteriaType === CRITERIA_TYPES.brandwebSub) {
    return BRANDWEB_INTRO_TEMPLATE + (criteriaType === CRITERIA_TYPES.brandwebSub ? BRANDWEB_SUB_SUFFIX : '');
  }
  return PROMOTION_INTRO_TEMPLATE;
};
