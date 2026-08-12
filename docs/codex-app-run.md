# Nexus Studio app runner API

`POST /api/codex-app-run` executes the prompt compiler owned by a Nexus Studio app and then calls the server-side Google image engine. All requests require `Authorization: Bearer $NEXUS_CODEX_RENDER_TOKEN`.

## Health and discovery

`GET /api/codex-app-run` returns the registered app IDs and actions.

## Request envelope

```json
{
  "app": "rubicon-lightfx",
  "action": "generate-lightfx",
  "input": {},
  "render": {
    "model": "gemini-3-pro-image-preview",
    "imageSize": "2K",
    "aspectRatio": "1:1",
    "image": { "mimeType": "image/png", "data": "BASE64_ONLY" }
  }
}
```

## Adapters

- `nexus-background / enhance`: uses `src/server/nexus/backgroundEnhancer.js`. `input.image` is a complete data URL; set `input.engine` to `google` for the real generative engine.
- `typecore-breeze / generate-flat`: uses `TypecoreBreeze.buildPrompts`. `input` is the Breeze editor state.
- `typecore-sovereign / generate-flat`: accepts the current UI engine's `imagenPrompt`. This bridge is version-stamped with `TYPECORE_VERSION`; high-level state compilation remains client-owned until the large React-hook compiler is extracted.
- `render-matrix / render-material`: uses `RenderMatrix.promptCompiler`. Pass `input.state` and `input.appOptions` exactly as the app does.
- `rubicon-lightfx / generate-lightfx`: uses `RubiconForge.buildLightFxPrompt`. `input` is the Light FX spec.

## Server environment

Set both variables in the Vercel project and redeploy:

- `NEXUS_CODEX_RENDER_TOKEN`: a long random token used by Codex clients.
- `GEMINI_API_KEY` (or `GEMINI_API_KEY_BRANDWEB`): kept on the server only.

The response includes `engine`, the compiled prompt/IR where applicable, elapsed time, and the generated base64 image. Never put either secret in a skill file or commit it to the repository.
