---
name: brandweb-lnb
description: >-
  브랜드웹(리니지2M 등 NC 게임 공식 홈 업데이트 페이지)의 좌측 메뉴(LNB)를 "기본 구조 + 스타일 변형" 방식으로
  생성한다. 메뉴 목록·활성 항목·스타일 변형(variant)만 주면 좌측 딤, 세로 라인, 매듭, 메뉴 텍스트(off/활성),
  배지, 활성 엠블럼을 실측 규칙(블록 세로 중심 542, 라인 x56, 메뉴 x78)대로 계산해 Figma 8프레임에 한 번에
  그리고 중심 좌표를 검증한다. "좌측 메뉴 만들어줘", "LNB 다시 그려줘", "메뉴 스타일을 캠페인 컨셉에 맞게",
  "브랜드웹 네비게이션", "lnb variant" 요청에 사용한다. CNB·헤더 버튼·스토어 버튼은 공통UI 계약
  (27_브랜드웹자동화/01_브랜드웹_제작구조.md ①)을 따르고 이 스킬 범위 밖이다.
---

# Brandweb LNB — 좌측 메뉴 생성 (기본 구조 + 스타일 변형)

좌측 메뉴는 게임·캠페인이 바뀌어도 **구조(structure)** 는 고정이고 **스타일(style)** 만 컨셉에 따라 달라진다.
이 스킬은 그 둘을 분리해서, 구조는 `styles/base.json` 하나로 잠그고 스타일은 `styles/variants/*.json` 으로
덮어쓴다. 산출물은 Figma 안의 `LNB` 프레임과 같은 값을 담은 `lnb-spec.json` 이다.

```
메뉴 JSON (항목·활성·페이지 매핑)  +  variant (또는 base)  +  --set 오버라이드
  → (1) scripts/build-lnb.mjs   : 행 좌표 계산 → lnb-spec.json · figma-code.js · preview.svg
  → (2) use_figma(figma-code.js) : 8프레임 LNB 교체(딤·라인·매듭·텍스트·배지·엠블럼), 실측값 반환
  → (3) scripts/check-lnb.mjs   : 블록 중심 542±2 · 엠블럼 y 검증 → PASS 여야 끝
  → (4) 스크린샷 대조           : 최종본/PSD 가 있으면 x20~140 띠를 확대 비교
```

## 구조 (변형해도 바꾸지 않는 값)

`styles/base.json` 의 `structure`. 2026 최종본 4종(도원결의·기적·라울·사이하) 실측으로 확정된 값이며,
캠페인마다 바꾸는 건 `rows` 간격뿐이다.

| 키 | 값 | 의미 |
| --- | --- | --- |
| `frame` | 0,0 620×1080 | LNB 프레임. fill 없음, clip 해제. 공통UI(cnb 띠 1920×55) 프레임 안에서 오버플로 |
| `blockAnchorY` | 542 | 메뉴 텍스트 블록(첫 행 top~마지막 행 bottom)의 세로 중심. 항목 수와 무관 |
| `lineX` | 56 | 세로 라인 중심 x. 매듭·엠블럼도 이 x 에 정렬 |
| `menuX` | 78 | 1depth 텍스트 x |
| `emblemX` | 39 | 활성 엠블럼 좌측 x (33 폭 → 중심 55.5) |
| `rows.pitch1 / subEnter / subPitch / subExit` | 32 / 33 / 26 / 32 | 1depth 간격, 1→2depth 진입, 2depth 간격, 2→1depth 복귀 (도원결의는 38/33/28/31) |

블록 y 는 `542 − 블록높이/2` 로 계산된다. **고정 y 를 쓰지 말 것** — 고정 y 300 은 항목 11개 기준 78px 위로
올라가던 원인이었다.

## 스타일 토큰 (variant 가 덮어쓰는 값)

| 그룹 | 토큰 | 기본 | 변형 예 |
| --- | --- | --- | --- |
| `dim` | 가로 그라디언트 stops | 검정 .87→.55→.18→0 | 밝은 배경 페이지는 .62→.45→.12→0 |
| `line` | `mode`(fixed/block) · `width` · `color` · `stops` · `padTop/padBottom` | fixed y270 h540, 1px 골드 | block(첫 행 −68 ~ 마지막 행 +30), 4px 적갈 `#3A0C06` |
| `knot` | `type`(none/image/dot) · `size` · `asset` · `color` | none | 도원결의: image 10×10 붉은 매듭, 1depth 행마다(활성 행은 엠블럼으로 대체) |
| `emblem` | `type`(image/none) · `w`·`h` · `asset` | 사자 엠블럼 33×27 | 게임/캠페인 엠블럼 PNG 교체 |
| `glow` | `enabled` · `size` · `color` | off | 네온·마법 컨셉이면 on |
| `text` | `family` · `size1/size2/sizeActive` · `styleOff/styleActive` · `color/colorActive` · `opacityOff/Hover/Active` | Noto Sans KR 15/13/16, `#C8AC91`, off .5 | 도원결의: 활성도 Regular 15, 색 동일·투명도만 1.0 |
| `badge` | `size` · `color` · `opacity` | 10, off 색, .5 | 이미지 배지가 필요하면 별도 부품(frame-forge) |

변형 파일은 `extends: "base"` 와 바꾸는 키만 적는다(깊은 병합). 일회성 조정은 파일을 만들지 말고
`--set style.line.color=#3A0C06 --set structure.rows.pitch1=40` 으로 준다.

### 제공 variant

| 이름 | 용도 | 근거 |
| --- | --- | --- |
| `gold-hairline` | 컨셉 확정 전 스캐폴딩(중립) | 레이아웃 테스트 Figma 초기값 |
| `dowon-red-knot` | 2026-03 ETERNAL BOND 도원결의 | `도원결의_v1.9.psd` +네비/navi 실측 (라인 4px x54 y294 h457, 매듭 9개, 활성 33×27) |
| `ink-oriental` | 동양풍·수묵 컨셉 **예시(미검증)** | 실전 투입 전 최종본 실측으로 값 확정 필요 |

### 새 variant 만드는 법 (컨셉 → 스타일)

1. 최종본 PNG 또는 PSD 에서 x 0~140 띠를 확대해 라인 색·굵기, 매듭 유무, 엠블럼, 텍스트 색·투명도를 읽는다.
   PSD 면 `.tmp/psd-layers.mjs` 로 네비 그룹(보통 `+네비/navi`: 프레임/라인/매듭, off/마우스/on)을 찾고
   `.tmp/psd-pick.mjs <psd> <out.png> 4000 <레이어명>` 으로 엠블럼·매듭을 알파 그대로 뽑아 `assets/<campaign>/` 에 둔다.
2. `styles/variants/<name>.json` 에 `extends: "base"` + 바뀐 토큰만 적고 `source` 에 PSD 경로를 남긴다.
3. `build-lnb.mjs --variant <name>` → `preview.svg` 로 간격·라인 범위를 먼저 보고, Figma 에 적용한다.
4. 스크린샷과 최종본의 x20~140 띠를 같은 배율로 나란히 놓고 확인한다. 색·굵기가 맞으면 variant 확정.

컨셉별 출발점: 골드 판타지 → `gold-hairline` + 엠블럼 교체 / 붉은 삼국·전쟁 → `dowon-red-knot` /
수묵·한지 → `ink-oriental` / 네온·SF → `gold-hairline` + `glow.enabled` + 라인 색 시안.

## 입력: 메뉴 JSON

`assets/examples/dowon-menu.json` 형식. `items[].children` 이 2depth, `badge` 는 라벨 뒤 작은 텍스트,
`pages[]` 는 "Figma 프레임 이름 → 활성 항목 id" 매핑이다. 요청서의 페이지 구성표를 그대로 옮기면 된다.

## 실행

```bash
# 1) 계산 (C:\work\00_claude 에서)
node .claude/skills/brandweb-lnb/scripts/build-lnb.mjs --menu <menu.json> --variant dowon-red-knot --out .tmp/lnb/out
#    옵션: --pages 01_인덱스,06_삼국지콜라보   --set style.line.width=3   --style <custom.json>
# 2) figma-code.js 내용을 use_figma(fileKey, code) 로 실행 → 결과 JSON 을 result.json 에 저장
# 3) 검증
node .claude/skills/brandweb-lnb/scripts/check-lnb.mjs --spec .tmp/lnb/out/lnb-spec.json --result result.json
```

- `use_figma` 전에 `get_figma_skill skill://figma/figma-use/SKILL.md` 를 읽고 `skillNames: "resource:figma-use"` 를 넘긴다.
- 생성 코드는 대상 페이지 프레임 안의 `공통UI*` 프레임에서 기존 `LNB` 를 찾아 같은 z 위치에 교체한다. 없으면 index 0 에 넣는다.
- 매듭 PNG(≈0.5KB)는 코드에 base64 로 내장돼 `figma.createImage` 로 들어간다. **엠블럼(≈2.6KB)은 같은 방법으로 넣으면 노드에 바이트는 있어도 MCP 렌더/스크린샷에 나오지 않았다(2026-09-08).** 그래서 (2) 뒤에 반드시 `upload_assets(nodeIds = 결과의 emblemId 8개, scaleMode FIT)` 로 `assets/<variant>/active_emblem_*.png` 를 다시 올린다. 생성 코드가 만든 엠블럼 노드 id 는 결과 JSON `emblemId` 에 있다.
- 코드 50,000자 제한: 8페이지 기준 약 26,000자. 페이지가 많으면 `--pages` 로 나눈다.

## 검수 기준

- 블록 중심 542 ±2, 활성 엠블럼 y = 활성 행 중심 − 13.5 ±2 (check-lnb.mjs 가 판정).
- 라인이 첫 행 위·마지막 행 아래로 `padTop/padBottom` 만큼만 나가는지(block 모드).
- 활성 행: 매듭 없음 + 엠블럼, 나머지 1depth 행: 매듭. 2depth 행: 매듭 없음.
- off 텍스트 투명도(.5)와 활성(1.0)이 최종본과 같은 대비인지 — 색을 바꾸지 말고 투명도로 상태를 표현한다.
- 공통UI 프레임 크기를 늘리지 않는다(cnb 띠 1920×55 유지, LNB 는 오버플로).

## 관련

- 공통UI 계약·z-order: `C:\work\00_AI연습\27_브랜드웹자동화\01_브랜드웹_제작구조.md` ①, `campaign/*/layout-plan.json` `commonUI.lnb`
- 페이지 골격: `promo-page-layout` 스킬(brandweb-sub 문법의 좌측 메뉴 310 폭 예약)
- 배지·엠블럼을 새로 그려야 하면 `nexus-frame-forge`(ornament / badge)
