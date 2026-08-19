# UI 부품(버튼·프레임) 평가 rubric

> 배너 rubric(`nexus-design-evaluator/references/rubric.md`)과 **별개**다. 배너용 지표
> (typography 18 · conversion · flow · brand …)는 라벨·날짜·캐릭터가 있는 키비주얼 기준이라
> 투명 UI 부품에 그대로 쓰면 왜곡된다. 여기서는 부품에 맞는 7개 지표로 채점하고 합격선은 **80점**.

## 채점 JSON 스키마

```json
{
  "asset": "button_pill_240x72_normal",
  "scores": {
    "silhouette":   {"score": 0, "reason": ""},
    "styleMatch":   {"score": 0, "reason": ""},
    "material":     {"score": 0, "reason": ""},
    "edgeAlpha":    {"score": 0, "reason": ""},
    "labelText":    {"score": 0, "reason": ""},
    "colorHarmony": {"score": 0, "reason": ""},
    "usability":    {"score": 0, "reason": ""}
  },
  "hardFailures": [],
  "recommendedCorrections": []
}
```

라벨이 없는 프레임·아이콘·디바이더는 `labelText` 키를 **아예 넣지 말 것**. 채점기가 남은
지표끼리 자동 재정규화한다.

## 지표와 가중치

| Key | 가중치 | 판단 기준 |
| --- | ---: | --- |
| silhouette | 18 | 요청한 용도(버튼/프레임/배지/아이콘)와 형태 실루엣의 정확도. 비율·대칭·모서리 |
| styleMatch | 16 | 요청한 분위기·프리셋·표현 방식(실사3D/일러스트/플랫 등) 부합 |
| material | 12 | 재질 표현과 마감 완성도 (하이라이트/마모/질감의 자연스러움) |
| edgeAlpha | 20 | **투명 부품 핵심** — 에지 클린니스, 후광(halo)·프린지·계단현상·배경 잔여물 없음 |
| labelText | 12 | (텍스트 버튼) 라벨 문구 정확·철자·가독·정렬. 텍스트 없으면 생략 |
| colorHarmony | 10 | 색 조화, 요청 컬러 부합, 내부/테두리 대비 |
| usability | 12 | 실사용 적합성 — 여백/스케일, 상태(normal/hover/pressed) 간 일관성 |

## 캘리브레이션

- 90–99: 즉시 프로덕션 투입 가능, 에지·마감 흠 없음
- 85–89: 강함, 미세 보정만 필요
- 80–84: 합격이나 다소 평범/밋밋하거나 개선 여지 보임
- 70–79: 실루엣·대비·마감·에지에 눈에 띄는 문제
- 70 미만: 심각한 형태·가독·투명화 실패

## Hard Failures (점수와 무관하게 즉시 불합격)

- 배경이 완전히 제거되지 않음 (남은 색 배경/체크무늬가 아닌 실제 배경 잔여)
- 경계 후광(halo)·색 번짐(spill)·거친 계단현상이 명확
- 라벨 문구 오탈자 또는 요청과 다른 텍스트
- 실루엣이 잘림(clipping) 또는 프레임 모서리 비대칭
- 아이콘 의미가 요청과 다름 (예: 오른쪽 화살표 요청 → 왼쪽)

## 교정 매핑 (감점 지표 → 조정 대상)

- silhouette → 프레임포지 `silhouette`/`assetType` 재선택, 비율 프롬프트 보정
- styleMatch → `preset`/`renderStyle`/`mood` 재선택
- material → `material` 축 변경, 하이라이트 강도
- edgeAlpha → 마스크포지 재키잉: 마젠타 `Cutoff`/spill 조정, 루마 `Cutoff`/`Gamma`, 이후 `trim-transparent`
- labelText → 라벨 프롬프트 명시(정확 문구), 폰트 대비/여백
- colorHarmony → 컬러/재질/그레이딩 조정
- usability → 사이즈·여백·상태별 스케일 정렬
