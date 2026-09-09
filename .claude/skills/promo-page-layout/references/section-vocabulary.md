# 섹션 어휘

BriefStudio Prism 의 패턴 어휘(`src/apps/BriefStudio/prism/prompts.js` `PATTERN_VOCAB`)와 이름을 맞춘다.
앞 6개는 요청서 추출 결과가 그대로 들어오는 타입이고, 나머지는 페이지 문법에서 반복되는 블록이다.

## brief.json 섹션 공통 필드

| 필드 | 의미 |
| --- | --- |
| `type` | 아래 표의 타입 id |
| `badge` | 섹션 배지/리본 문구 (전서버·본서버·EVENT 1). 없으면 배지 블록 생략 |
| `title` | 섹션 그라데이션 타이틀. 첫 섹션은 필수 |
| `subtitle` | 서브카피 한 줄 |
| `cta` | 본문 뒤에 붙는 pill 버튼 문구 |
| `note` | 본문 뒤 ※ 안내문 (문자열 또는 배열) |
| `count` / `rows` / `cols` | 카드 수 / 행 수 / 열 수 (타입별 기본값 있음) |
| `h` | `custom` 타입의 높이 |

## 타입

| type | 뜻 | PC 기본 | 모바일 기본 | 출처 |
| --- | --- | --- | --- | --- |
| `craft-formula` | 제작식 A+B→C 컨테이너. `rows` 행 반복 | 1100 × (110 + rows×275), 슬롯 170/결과 190 | 690 × (90 + rows×520), 세로 스택 | Prism / refine·scroll |
| `craft-rows` | 교환·확정제작 행 X→Y (횟수 제한) | 1100 × (60 + rows×240) | 690 × (60 + rows×300) | Prism / refine 메달 교환 |
| `result-grid` | 결과 그리드 (확률·OR 분기) | 5열, 정사각 | 3열 | Prism |
| `package-card` | 유료 패키지 카드 (가격·인장·구성품) | 1장 760×440 중앙 / N장 (1100−40(N−1))/N × 470 | 전폭 420, 세로 스택 | Prism / refine·scroll |
| `selection-grid` | N종 중 택1 상자 그리드 | 4열, 비율 1.2 | 2열 | Prism |
| `showcase` | 대표 상품 쇼케이스 + 혜택 태그 | 1100×520 | 690×560 | Prism |
| `product-grid` | 상품 카드 N열 (오상스 스페셜 상품) | 4열 278×366 | 2열 | osangseu |
| `bonus-grid` | 조건형 보상 카드 (오상스 보너스 선물) | 5열 228×402 | 3열 | osangseu |
| `status-box` | 현황/로그인 박스 | 719×376 중앙 | 690×300 | osangseu 신석 현황 |
| `tabs` | 서버/카테고리 탭 | 700×120 중앙 | 690×88 | refine·scroll 히어로 |
| `text` | 자유 텍스트 블록 | 1100 × (h 또는 120) | 690 × (h 또는 100) | 공통 |
| `notice` | ※ 유의사항 목록. `lines` 수 | 40 + lines×34 | 30 + lines×30 | 공통, 항상 마지막 |
| `cta` | 단독 CTA pill | 420×96 | 600×96 | 공통 |
| `custom` | 문법 밖 블록. `h` 필수, 이유를 `reason` 에 적는다 | 1100×h | 690×h | unknown |

포스트 포맷 전용 블록(`post-*`): `brand-bar`(상단 로고 바) · `title` · `subcopy` · `visual`(KV) · `reward-strip`(보상 아이콘 행) ·
`period` · `cta`(참여/해시태그) · `text` · `notice` · `footer`. 스크립트가 안전 영역 안에서 비율로 나눈다
(title 0.22 / subcopy 0.08 / visual 0.40 / reward-strip 0.16 / period 0.07 / cta 0.10 / text 0.12 / notice 0.08).

## 구조화 규칙

- 첫 섹션 = 캠페인의 핵심 보상 또는 제작식. 패키지(유료)는 그 다음. 교환·상시 콘텐츠·유의사항은 뒤로.
- 같은 타입이 연속되면 하나로 합치고 `rows`/`count` 를 늘린다(컨테이너 두 개보다 행 두 개).
- 카드 6장 이상은 열을 늘리지 말고 행을 늘린다. PC 최대 5열, 모바일 최대 3열.
- 배지는 서버 구분(전서버/본서버/특화서버)이나 이벤트 번호가 있을 때만. 장식용 배지는 넣지 않는다.
- CTA 문구는 요청서 원문. 없으면 "자세히 보기" 계열 자리표시자 `［CTA］`.
- `custom` 은 마지막 수단. 쓰면 `reason` 에 어휘 밖인 이유를 적고 SKILL 산출 보고에 그대로 남긴다.
