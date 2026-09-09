// MCP 서버 + 로컬 배치 CLI 번들 — src/ 의 확장자 없는 ESM import(Vite 스타일)를 Node 가 실행 가능하게 번들.
// node_modules 패키지는 전부 external(런타임에 리포 node_modules 에서 해석) — 번들 대상은 src/ 모듈만.
// import.meta.env 는 {} 로 정의해 Vite 전용 참조를 무해화 (Gemini 키는 서버가 .env 에서 직접 읽음).
// 두 번들은 같은 src/lib 픽셀 모듈을 공유한다 — 앱에서 로직을 고치면 MCP·CLI 가 함께 따라간다.
import { build } from "esbuild";

const common = {
  bundle: true,
  platform: "node",
  format: "esm",
  jsx: "automatic",
  packages: "external",
  define: { "import.meta.env": "{}" },
  logLevel: "info",
};

await build({
  ...common,
  entryPoints: ["mcp/server.mjs"],
  outfile: "mcp/nexus-mcp.bundle.mjs",
  banner: { js: "// 자동 생성 파일 — 수정 금지. 원본: mcp/server.mjs (npm run mcp:build 로 재생성)" },
});

await build({
  ...common,
  entryPoints: ["mcp/cli.mjs"],
  outfile: "mcp/nexus-cli.bundle.mjs",
  banner: { js: "// 자동 생성 파일 — 수정 금지. 원본: mcp/cli.mjs (npm run mcp:build 로 재생성)" },
});
