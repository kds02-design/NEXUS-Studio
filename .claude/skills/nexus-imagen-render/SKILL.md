---
name: nexus-imagen-render
description: Render or edit game banner assets through the same Google Gemini image-generation path used by Nexus Studio, using Nano Banana Pro/Imagen-style image-to-image requests with reference preservation, 1K-4K output, and server-side or environment API keys. Use when Nexus-quality API rendering, Google image generation, background quality-up, character lighting, or title material rendering is requested.
---

# Nexus Imagen Render

Use Google image generation only after the user authorizes transmitting the supplied reference image to Google. Never embed or print the API key.

## Setup

Prefer `NEXUS_API_BASE_URL` plus `NEXUS_CODEX_RENDER_TOKEN`. Derive the proxy route as `${NEXUS_API_BASE_URL}/api/codex-imagen`. `NEXUS_IMAGE_PROXY_URL` may override the derived route. The protected Nexus server owns `GEMINI_API_KEY`; the skill never receives it. Use a direct `GEMINI_API_KEY` only for explicit local development fallback. Read configuration from the process environment first, then an explicit `--env` file, then the current working directory's `.env`. Reject placeholders.

The recommended server route is `/api/codex-imagen`. It must authenticate the Bearer token, allowlist models/sizes/ratios, limit payload size, and keep the Google key server-side.

On this Windows workstation, invoke Node with `--use-system-ca` so the Nexus proxy's certificate chain is validated through the Windows certificate store. Do not disable TLS verification.

Use `gemini-3-pro-image-preview` for final quality and `gemini-3.1-flash-image-preview` for fast drafts. Keep model IDs configurable because preview models may change. For title-material renders, request `1K`; reserve 2K/4K for backgrounds, characters, and full key visuals.

## Render

1. Prepare a preservation-first prompt through the calling skill.
2. Run:

```powershell
node --use-system-ca scripts/nexus-imagen-render.mjs --env C:/work/00_claude/.env --input source.png --prompt prompt.txt --output rendered.jpg --model gemini-3-pro-image-preview --size 4K --aspect 16:9
```

For title-material mode use `--size 1K` and require a solid pure-black background. Never request transparency, alpha, a transparent background, a checkerboard, or simulated transparency from the image model. Only after the final approved title render passes validation, use Mask Forge for transparency removal and alpha-bound trimming, then proportionally downscale the final title PNG when necessary so neither width nor height exceeds `1500px`. Never upscale a smaller title. Record both the Nexus render size and final trimmed delivery size.

3. Inspect the actual result against the reference. Reject identity, composition, spelling, silhouette, line-break, or alpha changes forbidden by the calling skill.
4. Keep the source and rendered output separate. Never overwrite the source.
5. If the API is unavailable, report the endpoint and status. Do not use a local fallback unless the user explicitly authorizes it.

## Mode contracts

- Background: enhance lighting, atmosphere, grading, particles, texture clarity, and depth only; preserve camera, crop, objects, characters, text, and edge fades.
- Character FX: generate light/effect material on black or chroma while preserving the original character separately; pass the result through Mask Forge.
- Title material: use a flat Typecore image as immutable reference; preserve every glyph, counter, line break, and silhouette; render only surface/material/outline/light on a solid pure-black background. Do not request transparency during AI generation. After final approval and validation, use Mask Forge once, trim transparent margins, and cap the final long edge at 1500px.
