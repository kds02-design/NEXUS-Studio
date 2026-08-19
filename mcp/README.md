# NEXUS Studio MCP 서버

외부 AI(Claude Code / Claude Desktop / 기타 MCP 클라이언트)가 NEXUS Studio 의
프롬프트 엔진·Gemini 렌더 파이프라인·픽셀 후처리 툴을 그대로 쓸 수 있게 노출하는
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
claude mcp add nexus-studio -- node c:\work\00_claude\mcp\nexus-mcp.bundle.mjs
```

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "nexus-studio": {
      "command": "node",
      "args": ["c:\\work\\00_claude\\mcp\\nexus-mcp.bundle.mjs"]
    }
  }
}
```

### Codex CLI

```bash
codex mcp add nexus-studio -- node c:\work\00_claude\mcp\nexus-mcp.bundle.mjs
```

또는 `~/.codex/config.toml` 에 직접:

```toml
[mcp_servers.nexus-studio]
command = "node"
args = ["c:\\work\\00_claude\\mcp\\nexus-mcp.bundle.mjs"]
```

그 외 Cursor·Gemini CLI 등 MCP 지원 클라이언트도 같은 방식(command: `node`, args: 번들 경로)으로 등록하면 된다.

### Gemini API 키

`nexus_render_image` 만 키가 필요하다. 우선순위:

1. 환경변수 `GEMINI_API_KEY`
2. 리포 루트 `.env` 의 `GEMINI_API_KEY` (자동 인식 — 웹앱 프록시와 같은 서버 전용 키, `VITE_` 접두사 아님)

## 툴 목록

| 툴 | 역할 |
|---|---|
| `nexus_guide` | 사용법 개요 — 처음이면 이것부터 |
| `nexus_list_options` | 모든 옵션 id·한글 라벨 카탈로그(JSON) |
| `nexus_render_image` | Gemini 이미지 모델 호출 → PNG 저장 (참조 이미지 파일 첨부 가능) |
| `nexus_lightfx_prompt` | RubiconForge 광원/빛효과 — 순흑/단색 배경 합성용 발광 에셋 |
| `nexus_variation_prompt` | RubiconForge 리스킨 — 컬러·재질 오버레이 패스(구조 보존) |
| `nexus_design_alternative_prompt` | RubiconForge 디자인 대안 — 모티프·재질 재해석(골격 유지) |
| `nexus_item_bundle_prompt` | NexusPreview 아이템 꾸러미 — 원본 절대 보존 합성 (참조 = 아이템당 1장) |
| `nexus_quality_up_prompt` | NexusPreview KV 배경 품질 향상 — 캐릭터·타이틀 보존 가드 포함 |
| `nexus_character_fx_prompt` | NexusPreview 캐릭터 연출 — 형태 99%·얼굴 99.9% 보존, 분리 최적 배경 자동 |
| `nexus_remove_background` | 단색 배경 키잉 + 배경색 역산(unmix) → 투명 PNG |
| `nexus_split_character_effect` | 캐릭터(알파) / 발광 이펙트(스크린 블렌드) 레이어 분리 |
| `nexus_design_rubric` | NEXUS 디자인 평가 루브릭(마크다운) |

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
