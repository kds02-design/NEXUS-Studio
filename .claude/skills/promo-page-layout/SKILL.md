---
name: promo-page-layout
description: >-
  게임 프로모션 페이지(PC 랜딩·모바일 랜딩·브랜드웹 서브)와 포스트(SNS 정방형/세로/스토리·커뮤니티 공지·카드뉴스)의
  레이아웃을 잡는다. 요청서나 섹션 목록을 NEXUS Studio 의 페이지 문법(오상스형·제련석형·주문서형·브랜드웹 서브)과
  섹션 어휘로 구조화하고, 캔버스·안전폭·섹션 좌표·슬롯·읽기 순서·CTA 가 들어간 layout-spec.json + SVG 와이어프레임을
  산출한 뒤 프로모션 평가 기준으로 자가 검수한다. "프로모션 페이지 레이아웃", "이벤트 페이지 구성/섹션 잡아줘",
  "랜딩 와이어프레임", "모바일 프로모션 구성", "SNS 포스트/카드뉴스 레이아웃", "공지 포스트 구성", "페이지 골격",
  "layout for promotion page/post" 요청에 사용한다. 배너·KV 한 장의 캐릭터 구도는 photographer-layout,
  완성 페이지 채점은 nexus-design-evaluator 를 쓴다.
---

# Promo Page Layout — 프로모션 페이지·포스트 레이아웃

요청서(또는 한 줄 요구)를 **섹션 구조 → 측정된 페이지 문법 → 좌표 명세 → 와이어프레임 → 자가 검수** 순으로
레이아웃 계약(layout-spec.json)으로 바꾼다. 비주얼(캐릭터 원화·타이틀 렌더·프레임 부품)은 만들지 않는다 —
그 자리(슬롯)와 크기, 읽기 순서, 안전 영역을 확정하는 것이 이 스킬의 산출물이다.

```
요청서 / 요구사항
  → (1) 포맷·문법 판정      : promo-pc | promo-mobile | brandweb-sub | post-*  ×  osangseu | refine | scroll
  → (2) 섹션 구조화         : 섹션 어휘(references/section-vocabulary.md)로 블록 목록 작성 → brief.json
  → (3) 레퍼런스 대조       : nexus_promotion_library_list/get 로 같은 게임·같은 패턴의 고득점 페이지 확인
  → (4) 명세·와이어프레임   : scripts/build-layout-spec.mjs → layout-spec.json + wireframe.svg
  → (5) 자가 검수           : 스크립트 warnings + references/review-checklist.md (프로모션 평가 기준 키 기준)
  → (6) 인계               : NexusPreview 레이아웃 키·frameSlots / Figma / 디자이너용 명세
```

## (1) 포맷·문법 판정

| 포맷 id | 캔버스 | 안전 영역 | 언제 |
| --- | --- | --- | --- |
| `promo-pc` | 3000 폭 페이지 (NexusPreview 기준), KV 출력 높이 1688, 높이는 섹션 수에 따라 증가 | KV 요소 1920 폭(x 540~2460), 텍스트·부품 1100 폭(x 950~2050) | 이벤트/상점/제작 프로모션 PC 랜딩. `--width 1920` 으로 실제 제작 폭 환산 |
| `promo-mobile` | 750 폭, 5000+ 세로 스크롤 | 좌우 30 → 콘텐츠 690, 하단 sticky CTA 120 예약 | 모바일 랜딩. 평가 타입 `promotionMobile` |
| `brandweb-sub` | 1920×1080 고정 (스크롤 없음) | CNB 54 + 상단 여백 136 / 좌측 메뉴 310 / 하단 여백 156 | 브랜드웹 서브 페이지(사전예약·신서버·페이백) |
| `post-square` / `post-portrait` / `post-story` | 1080×1080 / 1080×1350 / 1080×1920 | 여백 60, 스토리는 상단 250·하단 300 UI 회피 | SNS 포스트·카드뉴스 1장 |
| `post-notice` | 860 폭, 높이 가변 | 여백 50 | 커뮤니티·카페·공식 홈 공지 이미지 |

페이지 문법(`grammar`)은 프로모션 성격으로 고른다. 세 문법의 실측 좌표는
[references/page-grammars.md](references/page-grammars.md) 에 있고, 단일 진실 소스는
[src/apps/NexusPreview/components/promoLayouts.jsx](../../../src/apps/NexusPreview/components/promoLayouts.jsx) 의 `PROMO_LAYOUTS` 다.
좌표를 새로 지어내지 말고 그 파일의 `guideDefs`·부품 좌표를 따른다.

- `osangseu` — 상품 판매형(블소 오상스). 좌우 캐릭터 + 중앙 타이틀, 상품 카드 4열 → 현황 박스 → 보너스 5열.
- `refine` — 제작 이벤트형(리니지 제련석). 섹션 배지 → 그라데이션 타이틀 → 레시피 컨테이너(A+B→C) → 패키지 카드.
- `scroll` — 확정 제작·주문서형(리니지 주문서). 리본 배지 → 마름모 슬롯 레시피 → 패키지 카드 2장 나란히.
- `auto` — 게임명이 리니지면 refine, 그 외 osangseu (`defaultLayoutFor` 와 동일 규칙).

포맷과 문법이 요청에 없으면 합리적 기본값(PC 랜딩 + auto)으로 진행하고 가정을 한 줄로 밝힌다.
출력 매체가 바뀌면 결과가 완전히 달라지는 경우(포스트 vs 페이지)에만 한 번 확인한다.

## (2) 섹션 구조화 → brief.json

요청서가 이미지/PDF 면 먼저 `nexus_brief_extraction_prompt`(범용) 또는 `nexus_brief_profile_prompt`(오상스 전용)로
섹션 패턴을 추출한다. 그 결과의 패턴 어휘(`craft-formula | result-grid | package-card | selection-grid |
craft-rows | showcase`)는 이 스킬의 섹션 타입과 같은 이름을 쓴다. 전체 타입 목록과 기본 열 수·높이는
[references/section-vocabulary.md](references/section-vocabulary.md).

brief.json 예 (`assets/examples/` 에 3종):

```json
{
  "format": "promo-pc",
  "grammar": "refine",
  "title": "제련석 제작 이벤트",
  "game": "리니지",
  "period": "2026. 3. 11.(수) 정기점검 후 ~ 3. 25.(수) 정기점검 전",
  "kv": { "characters": "dual" },
  "sections": [
    { "type": "craft-formula", "badge": "전서버", "title": "제련석 제작 이벤트", "subtitle": "제작 기간 : …", "rows": 2, "cta": "제작 이벤트 자세히 보기" },
    { "type": "package-card", "badge": "전서버", "title": "제련석 패키지", "count": 1 },
    { "type": "craft-rows", "badge": "본서버 · 상시", "title": "용맹의 메달로 제련석 교환", "rows": 1, "note": "주간 5개 한정" }
  ]
}
```

구조화 원칙:
- **읽기 순서를 먼저 정한다** — 타이틀 → 캐릭터 → 기간 → 첫 섹션 보상 → CTA. 두 요소가 모두 "주인공"이면 여기서 해소한다.
- 한 섹션 = 배지(선택) + 그라데이션 타이틀 + 서브카피(선택) + 본문 블록 + CTA(선택) + 유의사항(선택). 이 순서를 바꾸지 않는다.
- 보상·상품은 **카드 열 수**로 표현한다(PC 4~5열, 모바일 2~3열). 6개 이상이면 열을 늘리지 말고 행을 늘린다.
- 페이지 상단 첫 섹션은 항상 캠페인의 핵심 보상/제작식이다. 유의사항·확률 표는 마지막.
- 포스트는 블록 5개 이하(브랜드 바 · 타이틀 · 비주얼 · 보상/기간 · CTA/해시태그). 한 장에 두 메시지를 넣지 않는다.

## (3) 레퍼런스 대조

`nexus_promotion_library_list`(game·query·minScore 8·sort score) → `nexus_promotion_library_get` 으로 같은 게임·
같은 패턴의 고득점 페이지를 1~3건 본다. 확인할 것은 섹션 순서, 카드 열 수, CTA 위치·반복, 기간 표기 위치, 유의사항 밀도.
브랜드웹 서브는 `nexus_brand_web_library_list/get`. 라이브러리에 없으면 [references/page-grammars.md](references/page-grammars.md) 의
실측값이 기준이다. 레퍼런스 이미지의 내용을 보지 않고 인용하지 않는다.

## (4) 명세·와이어프레임 생성

```bash
node .claude/skills/promo-page-layout/scripts/build-layout-spec.mjs --brief brief.json --out-dir ./layout-out
node .claude/skills/promo-page-layout/scripts/build-layout-spec.mjs --brief brief.json --out-dir ./layout-out --width 1920
node .claude/skills/promo-page-layout/scripts/build-layout-spec.mjs --validate ./layout-out/layout-spec.json
```

산출물:
- `layout-spec.json` — `canvas`, `safe`(kv/content), `blocks[]`(id·type·role·rect·label·slots·order), `readingOrder`, `ctas`, `warnings`, `handoff`(NexusPreview 레이아웃 키·frameSlots 매핑).
- `wireframe.svg` — 캔버스·안전 컬럼·KV 출력선·블록·읽기 순서 번호. 브라우저나 Figma 에 그대로 붙여 확인.

블록 좌표는 3000 폭(또는 포맷 캔버스) 기준이며 `--width` 로 환산하면 `scale` 필드에 배율이 기록된다.
스크립트가 `warnings` 를 내면 brief 를 고쳐 다시 만든다 — 명세를 손으로 고쳐 경고를 지우지 않는다.
손으로 만든 다른 형태의 JSON 은 검증할 수 없으므로 명세로 취급하지 않는다.

## (5) 자가 검수

1. `warnings` 가 비어 있어야 한다(안전폭 이탈, 블록 겹침, CTA 부재, 스토리 UI 영역 침범, 하단 sticky 충돌).
2. [references/review-checklist.md](references/review-checklist.md) 로 프로모션 평가 키 10개(impression·brand·concept·color=보상 매력·
   layout=보상 구조·typography·conversion·readability·flow·detail)를 레이아웃 단계에서 미리 점검한다.
3. 와이어프레임을 썸네일 크기로 줄여 보고 타이틀 → 첫 보상 → CTA 가 3초 안에 잡히는지 확인한다.
4. 완성된 비주얼이 있으면 `nexus-design-evaluator` 스킬로 `promotion` / `promotionMobile` / `promotionKv` 채점. 점수는 예측하지 않는다.

## (6) 인계

- **NexusPreview** — `handoff.layoutKey`(osangseu/refine/scroll/brandwebSub) 와 `handoff.frameSlots`(product/banner/bonus/mobile 슬롯이
  어느 블록에 대응하는지). 슬롯 key 는 레이아웃과 무관하게 고정이며 라벨만 바뀐다.
- **Figma** — `wireframe.svg` 를 붙여 넣거나 `use_figma` 로 블록 rect 를 프레임으로 생성(`/figma-use` 먼저). 섹션 프레임 이름은 블록 `id` 그대로.
- **부품·비주얼 제작** — 프레임/버튼은 `nexus-frame-forge`, 타이틀은 `typecore-title`, KV 캐릭터 구도는 `photographer-layout`,
  아이템 묶음은 `rubicon-item-effect-template` 으로 넘긴다. 각 블록의 `slots` 크기를 그대로 전달한다.
- 디자이너용 명세는 표 하나로: 블록 id · 역할 · x,y,w,h · 내용 · 비고(안전폭/열 수/반복).

## 하지 않는 것

- 좌표를 눈대중으로 정하거나 문법에 없는 새 좌표를 근거 없이 만들지 않는다. 변형이 필요하면 어느 문법의 어느 블록을 얼마나 바꿨는지 기록한다.
- 카피·기간·가격을 지어내지 않는다. 요청서에 없으면 `［기간］` 같은 자리표시자로 둔다.
- 캐릭터 크롭·타이틀 렌더·프레임 생성을 이 스킬 안에서 하지 않는다.
- 스크립트를 돌리지 않고 "레이아웃을 잡았다"고 보고하지 않는다.
