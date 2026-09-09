// Prism 페이지 프로필 — "오늘의 상품 스페셜"(오상스) 월간 프로모션 페이지.
// 슬롯 구조(상품 4칸·보너스 5단계·돋보기 팝업·팝업 슬롯 키)와 오상스 플러그인 규약(` + ` 구분자)은 이 페이지 전용.
// 규칙 본문은 promoPrompt.js / promoSchema.js 가 원본이며 여기서는 프로필 객체로 묶기만 한다 — 문구를 여기 복사하지 말 것.
import { promoExtractionPrompt, transcribePrompt, promoMergePrompt } from '../promoPrompt.js';
import { TRANSCRIBE_SCHEMA, PROMO_SCHEMA, toPluginJson, promoStats, groupRedItems, buildTranscriptSourceText, applyRedIconsToBoxes } from '../promoSchema.js';

export const osangseuProfile = {
  key: 'osangseu',
  label: '오늘의 상품 스페셜 (오상스)',
  game: '블레이드앤소울',
  description: '월간 스페셜 상품 4칸 · 누적 보너스 5단계 · 일자별 전체상품 팝업 · 돋보기 상세 팝업. 오상스 Figma 플러그인 JSON 출력.',
  // 2단계 흐름: ① 전사(이미지/PDF → "반영 희망 내용" 텍스트 + 빨강 항목) ② 구조화 추출(전사 텍스트만, 이미지 미전달)
  stages: {
    transcribe: { prompt: () => transcribePrompt(), schema: TRANSCRIBE_SCHEMA, input: 'image/pdf parts', note: '옛 캡처 무시 · 빨강 대표 아이콘 전부 redItems 로' },
    extract: { prompt: (note = '') => promoExtractionPrompt(note), schema: PROMO_SCHEMA, input: 'transcript text (+redItems)', note: '슬롯 구조 매핑 · 원문 보존 · uncertain' },
    merge: { prompt: (prevJson, note = '') => promoMergePrompt(prevJson, note), schema: PROMO_SCHEMA, input: 'prev data + 이번 차수 전사', note: '2차 이후 수정요청서 병합' },
  },
  toPluginJson,
  stats: promoStats,
  // 전사 → 추출 사이의 결정적 처리 (빨강 대표 아이콘). 앱 PromoSpecial 과 동일.
  groupRedItems,
  buildTranscriptSourceText,
  applyRedIconsToBoxes,
};
