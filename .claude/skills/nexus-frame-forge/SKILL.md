---
name: nexus-frame-forge
description: >-
  넥서스 스튜디오의 프레임포지(FrameForge)로 버튼·프레임·박스·배지·아이콘 같은 UI 부품을 생성하고,
  마스크포지(MaskForge) 스크립트로 결과물에 맞는 방식(마젠타 크로마키/흑배경 루마키)으로 투명화한 뒤,
  디자인 평가도구(부품 전용 rubric)로 검수해 80점 이상만 투명배경 PNG로 제공한다.
  "버튼 만들어줘", "프레임 만들어줘", "○○ 버튼/프레임/배지/아이콘 제작", "make a button/frame",
  UI 부품·테두리·아이콘 에셋 생성 요청에 사용한다.
---

# Nexus Frame Forge — 버튼·프레임 자동 제작

사용자가 버튼/프레임/박스/배지/아이콘을 요청하면 **생성 → 투명화 → 검수** 파이프라인으로
검수 통과한 **투명배경 PNG** 만 결과로 제시한다. UI 없이 번들 스크립트로 동작한다.

```
사용자 요청
  → (1) 스펙 확정        : 요청을 FrameForge 옵션 축으로 매핑
  → (2) 프레임포지 생성   : 대비 강한 플랫 배경으로 베이스 생성
  → (3) 마스크포지 투명화 : 배경 특성에 맞는 스크립트로 키잉 + 여백 트림 → PNG(alpha)
  → (4) 디자인 평가 검수  : 부품 rubric 채점, 80점 이상 = 합격
        ├─ 미달 → 최저 지표 기준 옵션 보정 후 (2)~(4) 재시도 (최대 3회)
        └─ 합격 → 투명배경 PNG 산출 및 결과 표시
```

## (1) 스펙 확정

요청에서 아래를 뽑아 FrameForge 옵션 축으로 매핑한다. 옵션 어휘의 **단일 진실 소스**는
[src/apps/FrameForge/index.jsx](../../../src/apps/FrameForge/index.jsx) 의 `COMPLETE_AXES`·`SIMPLE_MOODS`·
`buildCompletePrompt` 다. 축을 새로 만들지 말고 이 파일의 key 를 그대로 쓴다.

| 스펙 | FrameForge 축 | 비고 |
| --- | --- | --- |
| 용도 | `assetType` | button / box / frame / badge / divider / icon / ornament(타이틀·섹션·내비 장식) / slot(아이템 슬롯·홀더) |
| 형태 | `silhouette` | `assetType` 에 종속(`for` 필드로 후보 결정). 항목마다 `ratio`(렌더 캔버스 비율)가 있으며 `nexus_frameforge_prompt` 결과의 `aspectRatio` 로 전달됨 |
| 키트 | `nexus_frameforge_kit_prompts` | 브랜드웹 한 벌(기본 10종 / 보상·쿠폰 8종 / 내비·유틸 8종)을 같은 무드로 일괄 프롬프트화. 무드는 brandweb_gold / celestial / crimson_royal / frost_silver / modern_neon 권장 |
| 분위기 | `SIMPLE_MOODS` | preset+material+ornament 번들 |
| 표현 방식 | `renderStyle` | realistic_3d / illustrated / semi_realistic / flat_graphic |
| 라벨 | 자유 텍스트 | 버튼 문구가 있으면 정확 문구를 프롬프트에 명시 |
| 사이즈 | 출력 크기 | 버튼 기본 240×72, 프레임/박스 512×512 |
| 상태 | 반복 생성 | normal/hover/pressed/disabled 요청 시 각각 |

용도·분위기가 애매하면 **한 번만** 짧게 확인한다. 그 외는 합리적 기본값으로 진행.

## (2) 프레임포지 생성

`buildCompletePrompt(seed, userText)` 규칙으로 프롬프트를 만들고 렌더는
**`nexus-imagen-render` 스킬**(`scripts/nexus-imagen-render.mjs`)로 수행한다.

- **투명화를 마스크포지에 맡기므로**, `interior` 는 `empty`, 배경은 **플랫 마젠타 크로마(`#FF00FF`)**
  로 강제한다(대비가 커 컬러키가 깨끗). 발광/네온 이펙트 부품은 예외적으로 순흑 배경으로 뽑아 루마키를 쓴다.
- 초안은 `gemini-3.1-flash-image-preview`, 최종 품질은 `gemini-3-pro-image-preview`.
- 여러 상태를 요청받으면 상태별로 반복 생성한다.
- 소스 원본과 렌더 결과 파일은 분리 보관, 원본을 덮어쓰지 않는다.

## (3) 마스크포지 투명화

프레임포지 결과의 배경 특성에 **맞는** 스크립트를 고른다(로직 철학은
[src/lib/smartTransparency.js](../../../src/lib/smartTransparency.js) 와 동일).

| 배경 특성 | 스크립트 | 옵션 요령 |
| --- | --- | --- |
| 마젠타 크로마(기본) | `scripts/remove_magenta_key.ps1` | 스필 제거 내장. 후광 남으면 재생성 시 배경 채도 조정 |
| 순흑(발광/네온/이펙트) | `scripts/maskforge_effect_transparency.ps1` | `-Cutoff`(기본6) 낮게=글로우 보존, `-Gamma`(기본.85) 감쇠, `-Opacity` |
| 순흑(단순 오브젝트) | `scripts/remove_black_luma.ps1` | 밝기 기반 키 |
| 복잡/사진 배경 | 로컬 키잉 불가 | MaskForge Remove.bg 폴백(키는 `localStorage('mask-forge:apiKey')`) 필요 → 사용자 안내 |

투명화 후 **반드시** `scripts/trim-transparent.ps1 -Padding 8` 로 투명 여백을 잘라 정렬을 맞춘다.
최종 출력은 **PNG(알파 채널 포함)**. 예:

```powershell
# 1) 키잉
powershell -File scripts/remove_magenta_key.ps1 -InputPath raw.png -OutputPath keyed.png
# 2) 여백 트림
powershell -File scripts/trim-transparent.ps1 -InputPath keyed.png -OutputPath out.png -Padding 8
```

목표는 **깨끗한 알파** 다. 후광/스필/계단현상이 보이면 옵션을 바꿔 재적용한다.

## (4) 디자인 평가 검수

투명 PNG 를 부품 전용 rubric 으로 채점한다. **배너 rubric 을 쓰지 말 것** — 반드시
[references/component-rubric.md](references/component-rubric.md) 를 읽고 그 7개 지표로 판단한다.

1. rubric 을 완독하고, 실제 이미지를 원본 해상도로 관찰(에지·알파·실루엣·라벨 먼저).
2. 각 지표 0–100 점수 + 한국어 근거 1줄. 라벨 없는 부품은 `labelText` 생략.
3. hardFailures(배경 잔여·후광·오탈자·클리핑·아이콘 의미 오류)를 기록.
4. 채점 JSON 저장 후 실행:

```powershell
node scripts/score-component.mjs --input raw.json --output report.json
```

- **합격 = overall ≥ 80 AND 모든 지표 ≥ 70 AND hardFailures 없음** (스크립트가 `pass` 로 판정).
- 미달이면 `report.priorities`(최저 지표)와 rubric 의 교정 매핑을 보고 원인에 맞춰 조정:
  - silhouette/style → 프레임포지 축 재선택 후 재생성
  - edgeAlpha → 마스크포지 재키잉/트림 파라미터 조정
  - labelText/color → 프롬프트·컬러 보정
- **(2)~(4)를 최대 3회 재시도.** 재키잉만으로 고칠 수 있으면 재생성 없이 (3)만 반복.
- 3회 후에도, 또는 2회 연속 1점 미만 개선이면 중단. 최고 점수 버전을 보존한다.

## 결과 표시

- 합격한 투명배경 PNG 경로를 명확히 제시.
- 함께 보고: 최종 overall 점수, 사이즈, 적용한 주요 옵션 요약, 재시도 횟수, (있으면) 상태별 파일·점수.
- 시각 비교가 유용하면 결과 PNG 들을 artifact 로 미리보기(선택).

## 무결성 규칙 (nexus-design-evaluator 계승)

- 게이트 통과를 위해 점수를 부풀리지 않는다. 수동 보정 금지.
- 배경 잔여·후광·오탈자·클리핑·아이콘 의미 오류는 점수와 무관하게 hard failure.
- 관찰 사실과 심미 판단을 분리한다.
- 렌더/키잉/평가가 **실제로 산출한** 경로·점수만 보고한다(추정·예측 금지).
- 검수 미통과 결과물을 합격인 것처럼 제시하지 않는다.

## 합격선 메모

기본 합격선은 사용자 요청대로 **80점**(부품 rubric). 스튜디오 배너 평가
(`nexus-design-evaluator`)의 게이트는 더 엄격한 **85점 + 전 지표 75 + hardFailures 0** 이다.
버튼/프레임을 배너 기준으로 평가하려면 그 스킬을 대신 호출하고, 기준을 바꾸려면
`score-component.mjs --pass <n> --floor <n>` 으로 조정한다.
