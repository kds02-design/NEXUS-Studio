# NEXUS Studio MCP 서버

외부 AI(Claude Code / Claude Desktop / 기타 MCP 클라이언트)가 NEXUS Studio 의
프롬프트 엔진·Gemini 렌더 파이프라인·픽셀 후처리 툴과 Banner Codex 라이브러리를 그대로 쓸 수 있게 노출하는
stdio MCP 서버.

**단일 진실 소스** — 프롬프트 빌더와 옵션 카탈로그는 `src/` 의 실제 앱 모듈을 import 해서
esbuild 로 번들한다. 앱에서 프롬프트를 고치면 `npm run mcp:build` 한 번으로 MCP 도 따라간다.
스킬 본문(`src/skills/**/*.md`)과 디자인 루브릭은 파일을 런타임에 직접 읽으므로 재번들 없이 즉시 반영.

## 빌드 · 테스트

```bash
npm run mcp:build   # mcp/server.mjs → mcp/nexus-mcp.bundle.mjs (src 모듈 번들)
npm run mcp:test    # SDK 클라이언트로 12개 툴 전수 스모크 (Gemini 실호출 없음)
```

전제: 리포에서 `npm install` 완료 상태 (번들은 node_modules 를 external 로 참조).

## 등록

### Claude Code

```bash
claude mcp add nexus-studio -- node --use-system-ca c:\work\00_claude\mcp\nexus-mcp.bundle.mjs
```

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "nexus-studio": {
      "command": "node",
      "args": ["--use-system-ca", "c:\\work\\00_claude\\mcp\\nexus-mcp.bundle.mjs"]
    }
  }
}
```

### Codex CLI

```bash
codex mcp add nexus-studio -- node --use-system-ca c:\work\00_claude\mcp\nexus-mcp.bundle.mjs
```

또는 `~/.codex/config.toml` 에 직접:

```toml
[mcp_servers.nexus-studio]
command = "node"
args = ["--use-system-ca", "c:\\work\\00_claude\\mcp\\nexus-mcp.bundle.mjs"]
```

그 외 Cursor·Gemini CLI 등 MCP 지원 클라이언트도 같은 방식(command: `node`, args: 번들 경로)으로 등록하면 된다.

### 서버 API 키

`nexus_render_image` 만 키가 필요하다. 우선순위:

1. 환경변수 `GEMINI_API_KEY`
2. 리포 루트 `.env` 의 `GEMINI_API_KEY` (자동 인식 — 웹앱 프록시와 같은 서버 전용 키, `VITE_` 접두사 아님)

`nexus_remove_ai`는 같은 우선순위로 `REMOVE_BG_API_KEY`를 읽는다. 전송 가능한 폴더는 세미콜론으로 구분한 `REMOVE_BG_ALLOWED_ROOTS`로 제한하며, 미설정 시 리포 루트만 허용한다. 브라우저 Mask Forge의 `localStorage('mask-forge:apiKey')`와 MCP 프로세스는 저장소를 공유하지 않으므로 MCP용 키를 별도로 설정해야 한다.

투명화는 `nexus_remove_background` 색상 키잉, 효과 알파 추출, `nexus_split_character_effect` 같은 로컬·결정적 방법을 먼저 사용한다. 실제 알파 픽셀, 외곽 프린지, 닫힌 글자 공간, 어두운 재질 보존 QA가 실패한 경우에만 `nexus_remove_ai`를 최종 fallback으로 호출한다.

## 툴 목록

| 툴 | 역할 |
|---|---|
| `nexus_guide` | 사용법 개요 — 처음이면 이것부터 |
| `nexus_list_options` | 모든 옵션 id·한글 라벨 카탈로그(JSON) |
| `nexus_render_image` | Gemini 이미지 모델 호출 → PNG 저장 (참조 이미지 파일 첨부 가능) |
| `nexus_frameforge_prompt` | FrameForge 프레임·버튼·박스·배지·디바이더·아이콘·장식·아이템 슬롯 완성형 프롬프트 (aspectRatio 포함) |
| `nexus_frameforge_kit_prompts` | 브랜드웹 키트 — 같은 무드의 부품 세트(기본/보상·쿠폰/내비·유틸) 프롬프트 일괄 생성 |
| `nexus_asset_library_list` | 2025년 이후 프로모션·브랜드웹 재사용 UI 에셋 검색 |
| `nexus_asset_library_get` | 투명 PNG·PSD 레이어·FX·출처 상세 조회 |
| `nexus_lightfx_prompt` | RubiconForge 광원/빛효과 — 순흑/단색 배경 합성용 발광 에셋 |
| `nexus_variation_prompt` | RubiconForge 리스킨 — 컬러·재질 오버레이 패스(구조 보존) |
| `nexus_design_alternative_prompt` | RubiconForge 디자인 대안 — 모티프·재질 재해석(골격 유지) |
| `nexus_item_bundle_prompt` | NexusPreview 아이템 꾸러미 — 원본 절대 보존 합성 (참조 = 아이템당 1장) |
| `nexus_quality_up_prompt` | NexusPreview KV 배경 품질 향상 — 캐릭터·타이틀 보존 가드 포함 |
| `nexus_character_fx_prompt` | NexusPreview 캐릭터 연출 — 형태 99%·얼굴 99.9% 보존, 분리 최적 배경 자동 |
| `nexus_remove_ai` | 로컬 투명화·QA 실패 시 최종 fallback: Remove.bg AI 피사체 세그멘테이션 → 투명 PNG (`REMOVE_BG_API_KEY`, 허용 루트, 호출별 외부 전송 확인 필요) |
| `nexus_remove_background` | 단색 배경 키잉 + 배경색 역산(unmix) → 투명 PNG |
| `nexus_split_character_effect` | 캐릭터(알파) / 발광 이펙트(스크린 블렌드) 레이어 분리 |
| `nexus_design_rubric` | NEXUS 디자인 평가 루브릭(마크다운) |
| `nexus_banner_codex_list` | Banner Codex 저장 배너 목록·검색·게임/연도/점수 필터 (읽기 전용) |
| `nexus_banner_codex_get` | Banner Codex 배너 1건의 상세 메타데이터·이미지 URL 조회 (읽기 전용) |

## 기본 흐름

```
nexus_list_options → nexus_*_prompt → nexus_render_image → (nexus_remove_background | nexus_split_character_effect) → nexus_design_rubric 로 평가
```

- 아이템 꾸러미: 참조를 **아이템 1개 = 이미지 1장**으로 첨부하고 `itemCount` 를 참조 수와 일치시켜야 중복 없음.
- 광원 에셋: 순흑 렌더 후 `nexus_remove_background(bg=black)` 로 알파 추출하거나 스크린 블렌드로 합성.
- 캐릭터 연출: 자동 배경이 블랙이면 `nexus_split_character_effect` 로 캐릭터/이펙트 분리 가능.

## 구조

```
mcp/
  server.mjs             # 서버 원본 (src/ 모듈 import — 여기를 수정)
  build.mjs              # esbuild 번들 스크립트
  nexus-mcp.bundle.mjs   # 생성물 — 직접 수정 금지, mcp:build 로 재생성
  smoke.mjs              # 스모크 테스트 (mcp:test)
```

서버가 import 하는 순수 모듈(브라우저/Node 공용, 앱과 공유):
`src/apps/NexusPreview/services/bundlePrompt.js` · `characterPresets.js` · `qualityUpSkills.js` ·
`src/apps/RubiconForge/services/{lightfx,variations}.js` + `constants/*` · `src/lib/charEffectSplit.js`

## 로컬 배치 CLI (`mcp/nexus-cli.bundle.mjs`)

MCP 는 이미지 한 장당 한 번 왕복이라 수십~수백 장 투명화에는 맞지 않는다. `npm run mcp:build` 가 서버 번들과 함께
`mcp/nexus-cli.bundle.mjs` 를 만든다 — 원본 `mcp/cli.mjs`, 픽셀 로직은 앱·MCP 와 같은 `src/lib`
(`colorKeyExtract` · `effectExtract` · `alphaCleanup`) 이라 결과가 픽셀 단위로 같다.

```bash
node mcp/nexus-cli.bundle.mjs plan  --in <폴더> --out plan.json --out-dir out      # 편집 가능한 계획 + 테두리 색 통계(bgStats)
node mcp/nexus-cli.bundle.mjs alpha --plan plan.json --jobs 6 --sheet sheet.png    # 워커 병렬 · PNG + report.json + 체커보드 시트
node mcp/nexus-cli.bundle.mjs alpha --in <폴더> --out-dir out --mode key|effect     # 계획 없이 폴더 전체 한 모드
```

항목 옵션: `mode`(key|effect) `bg`(auto|black|white|chroma|#hex) `tolerance` `feather` `holeProtect` `holeSize` `decontam`
`cutoff` `gamma` `opacity` `recoverColor` `trim` `cleanIslands`(옅은 점 제거) `killFaint`(임계 알파, 옅은 고립 얼룩 제거 — 이펙트엔 0).
`plan` 의 `bgStats.std` 는 배경 평탄도 힌트: ≤6 단색 매트, 15~40 비네팅(허용치↑·killFaint), ≥60 사진 배경(색상 키 대상 아님).
검증: `npm run mcp:test` → `mcp/test-cli.mjs` 가 CLI 결과와 `src/lib` 직접 호출을 픽셀 비교한다.
실측: 2048² 66장 → 6워커 7초.

### 자동 분류(triage) · MCP 배치 툴 · 피그마 납품

- `plan` 은 기본으로 `src/lib/alphaTriage.js` 가 항목마다 경로를 제안한다 — `flat`(색상 키 기본값) · `vignette`(테두리 std 8~45: tolerance 를 std 에 비례해 올리되 피사체 색거리 중앙값의 절반을 넘지 않음 + killFaint 160) · `lowcontrast`(비평탄 배경인데 피사체 색거리 중앙값 < 120: tolerance 45·feather 40, killFaint 끔, 수동 확인) · `glow`(피사체 경계 중 단단한 경계 < 8%: 이펙트 추출) · `nonflat`(std > 45: mode `ai`, alpha 가 건너뜀 → nexus_remove_ai). 발광 판정에 '옅은 픽셀 비율' 을 쓰지 않는 이유는 소스 주석 참조(저대비 불투명 피사체 오판). `--no-triage` 면 통계만 기록.
- MCP: `nexus_alpha_plan(inputDir, planPath)` → 검토·수정 → `nexus_alpha_batch(planPath | inputDir+mode)`. 둘 다 `nexus-cli.bundle.mjs` 를 자식 프로세스로 실행하므로 단건 툴과 결과가 같다.
- 피그마 납품: `scripts/figma-place-assets.mjs layout|upload|apply` — 폴더 → 섹션 생성 use_figma 코드 → (에이전트가 upload_assets 로 받은 URL 로) 업로드 → imageHash fill 적용 코드. upload_assets 의 nodeIds 자동 배치가 동작하지 않아 hash 를 직접 넣는다.
