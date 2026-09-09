# 파라미터 대응표 — Illustrator Image Trace ↔ potrace ↔ Vector Forge 앱

세 곳은 같은 계열의 알고리즘(이진화 → 윤곽 추적 → 코너 검출 → 최소자승 베지어 피팅)을 쓴다. 이름만 다르다.

| 의미 | Image Trace (흑백 로고) | potrace / 스킬 `vectorize.mjs` | Vector Forge 앱 슬라이더 |
| --- | --- | --- | --- |
| 흑백 분리점 | Threshold 1–255 | `--threshold auto\|N` (auto = Otsu) | 임계값 + "자동 임계값" |
| 곡선이 픽셀 경계에 얼마나 붙는가 | Paths 0–100 (높을수록 밀착) | `--opttolerance 0..1` (**낮을수록** 밀착) · `--ai-paths` | 곡선 오차 |
| 코너를 얼마나 살리는가 | Corners 0–100 (높을수록 코너 많음) | `--alphamax 0..1.34` (**낮을수록** 코너 많음) · `--ai-corners` | 코너 |
| 얼룩 제거 | Noise 1–100 px² | `--turdsize N` px² · `--ai-noise` | 노이즈 |
| 곡선 최적화(앵커 병합) | 항상 켜짐 | `--no-optcurve` 로 끔 | 곡선 최적화 |
| 흰 배경 무시 | Ignore White | 항상 (잉크만 패스) | 투명 배경 |
| 흰 글자 / 검정 배경 | 없음 (미리 반전 필요) | `--invert auto\|true\|false` | 반전 |
| 투명 PNG 의 흰 글자 | 없음 (미리 평탄화 필요) | `--alpha auto\|on\|off` (불투명=잉크) | 자동 (알파 모드) |

## 프리셋 (`src/lib/vectorCore.js` PRESETS — 단일 원본)

| id | alphaMax | turdSize | optTolerance | 용도 |
| --- | --- | --- | --- | --- |
| `title` | 1.0 | 2 | 0.2 | 타이포코어 흑백 타이틀 기본 |
| `sharp` | 0.55 | 2 | 0.15 | 고딕·각진 획, 코너 보존 |
| `smooth` | 1.2 | 4 | 0.35 | 붓·캘리그라피, 부드럽게 |
| `detail` | 0.8 | 1 | 0.05 | 원본 충실, 앵커 많음 |
| `clean` | 1.0 | 12 | 0.3 | 지저분한 렌더·스캔 |

Illustrator 엔진 권장값(흑백 로고 프리셋 기준): Paths 50 · Corners 75 · Noise 25. 각진 서체는 Corners 90, 캘리그라피는 Corners 50 · Paths 40.

## 증상별 조정

| 증상 | 원인 | 조정 |
| --- | --- | --- |
| 획 모서리가 둥글어짐 | alphaMax 높음 | `--alphamax 0.5~0.7` (Illustrator: Corners ↑) |
| 곡선에 자잘한 꺾임 | alphaMax 낮음 / 계단 노이즈 | `--alphamax 1.1~1.2`, 앱은 블러 0.5 |
| 앵커가 너무 많음 | optTolerance 낮음 | `--opttolerance 0.3~0.5` (Illustrator: Paths ↓) |
| 가는 획이 끊김 | 임계값이 획보다 밝음 | `--threshold` 를 올리거나(어두운 쪽 포함) 원본을 2배 업스케일 후 추적 |
| 글자 안쪽 카운터(구멍)가 메워짐 | 노이즈 제거가 구멍을 삼킴 | `--turdsize` 낮춤 |
| 결과가 비어 있음 / 전부 검정 | 반전 오판 | `--invert true|false` 명시. 투명 PNG 면 `--alpha on` |
| QA `missing` 높음 | 원본 잉크가 결과에 없음 | 임계값·turdsize 확인. 안티에일리어싱 경계는 1~2% 가 정상 |
| QA `extra` 높음 | 결과에만 있는 잉크 | 노이즈 dot 이 살아남음 → turdsize ↑ |

## QA 기준

`vectorize.mjs` 는 결과를 원본과 같은 크기로 래스터화해 이진 마스크와 비교한다.

- `iou` ≥ 0.985 · `missing` ≤ 0.02 → 합격 (종료 코드 0)
- 미달 → 종료 코드 2. 위 표로 한 번 보정 후 재실행. 두 번 미달이면 원본 해상도(짧은 변 600px 미만)나 이진화 실패를 의심.

## 좌표계 메모

- potrace C/wasm 원시 출력은 1/10 px 단위·y-up·상대 명령이며 `<g transform="translate(0,H) scale(0.1,-0.1)">` 전제. 앱은 `normalizePotracePath()` 로 절대 px 로 펼친다.
- Node `potrace` 패키지는 처음부터 절대 px 좌표를 낸다. 스킬은 이 `d` 를 그대로 `buildSvg()` 에 넣는다.
- 두 경로 모두 최종 SVG 는 `<path fill-rule="evenodd">` 하나 — Figma·Illustrator 에 붙여넣으면 컴파운드 패스 하나로 들어온다.

## 정리(refine) 단계 — 추적 후 후처리

`refinePath()`(`src/lib/vectorCore.js`) 가 potrace 결과에 세 가지를 순서대로 적용한다. 진짜 곡선(ㅇ·ㅎ·둥근 획)은 1번 조건을 만족하지 못해 그대로 남는다.

| 단계 | 하는 일 | 핵심 파라미터 (normal 기준) |
| --- | --- | --- |
| 직선화 | 베지어의 제어점이 현에서 `tol` 안이면 직선으로, 같은 방향 연속 직선 병합 | tol 0.45px × (짧은 변/600, 최대 3) |
| 꺾임 복원 | 긴 직선 두 개 사이의 짧은 필렛(총 길이 < filletMax) 을 지우고 교점으로 꺾음 | cornerAngle 25°, filletMax 7px |
| 각도 스냅 | 긴 직선의 각도 히스토그램에서 주 방향(수평·수직·이탤릭 기울기)을 찾고 ±snapTol 안의 직선을 그 각도로 회전, 이웃 정점은 교점/투영으로 재연결 | snapTol 2°, snapMinLen 12px, 주 방향 최소 비중 8% |

레벨: `off` / `light`(tol 0.25, snapTol 1.2) / `normal`(기본) / `strong`(tol 0.8, snapTol 3 — 흔들림 큰 렌더 원본).

- 스킬: `--refine off|light|normal|strong`. 정리 전 결과는 `<name>_raw.svg` 로 함께 저장.
- 앱: 툴바 "직선 정리" 셀렉트. 하단에 앵커 수 전/후와 스냅 각도 표시.
- Illustrator 엔진: Image Trace 의 "곡선을 직선에 스냅" 옵션을 켠다(refine 이 off 가 아닐 때).

QA 는 **정리 전(raw) IoU** 로 합격을 판정하고, 정리 후 IoU 가 raw 보다 0.01 이상 떨어지면 `overRefined` 로 실패 처리한다. 정리는 의도적으로 원본과 달라지므로 소폭 하락은 정상이다.

| 증상 | 조정 |
| --- | --- |
| 진짜 곡선이 각져 보임 | `--refine light` 또는 off. 원인은 tol 이 곡선 깊이보다 큰 것 |
| 이탤릭 획 기울기가 제각각 | 주 방향이 8% 비중을 못 넘은 것 → `--refine strong`(비중 6%) |
| 모서리가 여전히 둥긂 | 필렛이 filletMax 보다 김 → `--refine strong`(12px) 또는 potrace `--alphamax` 낮춤 |
| 획 끝이 이상하게 늘어남 | 꺾임 복원의 교점이 멀리 찍힘 → `--refine light`(cornerAngle 30°) |
