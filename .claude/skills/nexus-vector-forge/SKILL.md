---
name: nexus-vector-forge
description: >-
  흑백 타이틀·로고·아이콘 비트맵(타이포코어 렌더, 마스크포지 투명 PNG, 스캔)을 SVG/AI 벡터로 변환한다.
  기본은 potrace(Node) 로 즉시 변환하고, 납품용 최고 품질이 필요하면 로컬 Illustrator Image Trace 를 COM 으로 무인 실행해
  .ai + .svg 를 만든다. 두 경로 모두 원본 대비 IoU 로 자동 검수한다.
  "벡터로 변환", "SVG 만들어줘", "일러스트 외곽선 추적", "Image Trace", "타이틀 벡터화", "ai 파일로", "vectorize",
  "Vector Forge 결과가 별로" 요청에 사용한다. 컬러 일러스트·사진 벡터화(포스터라이즈)는 범위 밖.
---

# Nexus Vector Forge — 비트맵 → 벡터

```
입력 PNG
  → (1) 준비   : 알파/반전/임계값 자동 판정 → 이진화 PNG(검정 잉크·흰 배경) 생성
  → (2) 추적   : potrace(Node, 기본)  또는  Illustrator Image Trace(COM, --engine illustrator)
  → (2b) 정리  : 직선화 · 꺾임 복원 · 각도 스냅 (--refine, 기본 normal). 진짜 곡선은 유지
  → (3) 검수   : 결과를 래스터화해 원본 마스크와 IoU 비교 — 0.985 이상 · 누락 2% 이하 합격 (정리 전 기준, 정리 후 -0.01 이내)
        ├─ 미달 → references/parameters.md 증상표로 한 번 보정 후 재실행 (최대 2회)
        └─ 합격 → .svg (+ .ai) 와 qa.json 을 결과로 제시
```

앱(Vector Forge, `src/apps/VectorForge`) 과 이 스킬은 `src/lib/vectorCore.js` 의 이진화·프리셋·SVG 조립을 공유한다.
프리셋 값을 바꿀 때는 그 파일 하나만 고친다.

## 엔진 선택

| 상황 | 엔진 | 이유 |
| --- | --- | --- |
| 빠른 검토, Figma 투입, 앱 결과 재현 | `potrace` (기본) | 2K 이미지 0.1초. 설치 불필요. 결과는 단일 컴파운드 패스 |
| 납품용 .ai 필요, 사용자가 "일러스트 품질" 요구 | `illustrator` | 로컬 Illustrator 2026 의 Image Trace 그대로. Illustrator 가 실행되며 종료하지 않음 |
| Illustrator 미설치 / macOS | `potrace` | COM 자동화는 Windows 전용. 미설치면 스크립트가 즉시 실패를 알림 |

Illustrator 엔진은 사용자 화면에 Illustrator 창을 띄운다. 처음 실행은 30초 이상 걸릴 수 있다. 이미 열려 있는 문서는 건드리지 않는다.

## 명령

```bash
# 기본 (potrace, 타이틀 프리셋, 자동 임계값·자동 반전·알파 자동)
node .claude/skills/nexus-vector-forge/scripts/vectorize.mjs <input.png> --out <dir>

# 각진 서체 / 캘리그라피 / 디테일 / 노이즈 강제거
node .claude/skills/nexus-vector-forge/scripts/vectorize.mjs <input.png> --preset sharp|smooth|detail|clean

# Illustrator Image Trace (.ai + .svg)
node .claude/skills/nexus-vector-forge/scripts/vectorize.mjs <input.png> --engine illustrator --ai-paths 50 --ai-corners 75 --ai-noise 25

# 흰 글자·검정 배경 / 투명 PNG 의 흰 글자
node .claude/skills/nexus-vector-forge/scripts/vectorize.mjs <input.png> --invert true
node .claude/skills/nexus-vector-forge/scripts/vectorize.mjs <input.png> --alpha on
```

옵션 전체는 `vectorize.mjs --help`. 종료 코드 0 합격 / 2 QA 미달 / 1 오류. stdout 마지막 줄이 결과 JSON 이다.

산출물: `<name>_bw.png`(이진화 원본) · `<name>.svg` · `<name>.ai`(illustrator 만) · `<name>.qa.json`.

## (1) 준비 — 입력 판정

스크립트가 자동으로 하지만, 결과가 이상하면 이 순서로 의심한다.

1. **알파**: 투명 픽셀이 10% 이상이면 색과 무관하게 "불투명 = 잉크". 마스크포지 투명 PNG 의 흰 글자가 여기에 해당.
2. **반전**: 어두운 픽셀이 55% 를 넘으면 배경이 잉크로 잡힌 것 → 자동 반전. 검정 배경 위 흰 타이틀.
3. **임계값**: Otsu. 회색 안티에일리어싱 경계는 어느 쪽이든 1~2% 오차가 정상.
4. **해상도**: 짧은 변 600px 미만이면 곡선이 각진다. 먼저 2배 업스케일(nexus-imagen-render 의 업스케일 또는 단순 리샘플) 후 추적.

## (2) 추적 — 파라미터

프리셋 5종과 Image Trace 대응표는 [references/parameters.md](references/parameters.md). 핵심 셋만 기억:

- `--alphamax` 코너 (낮을수록 각짐, Image Trace Corners 의 반대 방향)
- `--opttolerance` 곡선 오차 (낮을수록 원본 밀착·앵커 증가, Image Trace Paths 의 반대 방향)
- `--turdsize` 노이즈 면적 px²

## (2b) 정리 — 직선·꺾임 정돈

렌더 원본의 1~2px 흔들림을 potrace 가 곡선으로 따라간 것을 후처리로 정돈한다. `--refine off|light|normal|strong`(기본 normal).
직선에 가까운 베지어 → 직선, 직선 사이 짧은 필렛 → 교점 꺾임, 주 방향(수평·수직·이탤릭)에 ±2° 안 직선 → 각도 스냅.
정리 전 결과는 `<name>_raw.svg` 로 같이 남는다. 진짜 곡선이 각져 보이면 `light`, 이탤릭 기울기가 안 맞으면 `strong`. 세부는 [references/parameters.md](references/parameters.md).

**범위 밖**: 금속 질감·글로우·텍스처가 있는 렌더링 타이틀은 실루엣 자체가 깨끗하지 않아 정리로 구제되지 않는다. 벡터는 렌더 전 플랫 형태(타이포코어 흑백)에서 뽑는다.

## (3) 검수 — 합격 기준과 보정

`qa.json` 의 `iou` ≥ 0.985 이고 `missing` ≤ 0.02 면 합격. 미달 시:

| 지표 | 보정 |
| --- | --- |
| `missing` 높음 | 가는 획 소실 → `--threshold` 를 올리거나 업스케일. 카운터가 메워졌으면 `--turdsize` ↓ |
| `extra` 높음 | 노이즈 dot 생존 → `--turdsize` ↑ (`--preset clean`) |
| 둘 다 낮은데 눈으로 각짐 | `--alphamax` 1.1~1.2 또는 `--preset smooth` |
| 둘 다 낮은데 모서리 둥금 | `--alphamax` 0.5~0.7 또는 `--preset sharp` |

두 번 보정해도 미달이면 이진화 PNG(`_bw.png`) 를 열어 원본 판정 자체가 틀렸는지 본다. 이 경우 `--invert`·`--alpha`·`--threshold` 를 명시한다.

## 결과 제시

- 합격한 `.svg`(와 `.ai`) 경로, 크기, 패스/앵커 수, IoU 를 한 줄 표로.
- Figma 에 넣을 때는 SVG 파일을 캔버스에 드롭하거나 SVG 코드를 붙여넣는다. 단일 컴파운드 패스로 들어온다.
- Illustrator 엔진 결과는 `.ai` 가 원본이고 `.svg` 는 내보내기다. 편집은 `.ai` 에서.
- QA 미달 상태로 끝났으면 미달 사실과 마지막 수치를 숨기지 않고 제시한다.

## 함정

- **Illustrator 엔진은 사용자 세션의 Illustrator 를 그대로 쓴다.** 저장 안 한 문서가 있어도 건드리지 않지만, 대화상자가 떠 있으면 스크립트가 대기하다 타임아웃(기본 300초)된다.
- `DoJavaScriptFile` 이 인자 전달을 거부하는 환경이 있어 JSX 는 `%TEMP%\nexus-vector-forge\job.json` 고정 경로도 읽는다. 동시에 두 개를 돌리지 말 것.
- ExtendScript 의 Image Trace 속성 이름은 버전에 따라 `pathFidelity/cornerFidelity/noiseFidelity`(CS6+) 또는 `pathFitting/cornerAngle/minArea`(구버전). JSX 가 순서대로 시도하고 `props` 에 실제 쓰인 이름을 기록한다.
- potrace 는 GPL-2.0. 사내 도구·산출물 사용은 문제없지만 엔진 자체를 외부 배포하는 경우 라이선스를 확인한다.
- 컬러·그라데이션 이미지는 흑백 로고 모드로만 처리된다. 포스터라이즈가 필요하면 이 스킬 범위 밖.
