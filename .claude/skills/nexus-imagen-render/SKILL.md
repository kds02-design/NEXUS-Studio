---
name: nexus-imagen-render
description: Render or edit game banner assets through the same Google Gemini image-generation path used by Nexus Studio, using Nano Banana Pro/Imagen-style image-to-image requests with reference preservation, 1K-4K output, and server-side or environment API keys. Use when Nexus-quality API rendering, Google image generation, background quality-up, character lighting, or title material rendering is requested.
---

# Nexus Imagen Render

Use Google image generation only after the user authorizes transmitting the supplied reference image to Google. Never embed or print the API key.

## Setup

Prefer `NEXUS_IMAGE_PROXY_URL` plus `NEXUS_CODEX_RENDER_TOKEN`. The protected Nexus server endpoint owns `GEMINI_API_KEY`; the skill never receives it. Use a direct `GEMINI_API_KEY` only for local development fallback. Read configuration from the process environment first, then from a local `.env` file. Reject placeholders.

The recommended server route is `/api/codex-imagen`. It must authenticate the Bearer token, allowlist models/sizes/ratios, limit payload size, and keep the Google key server-side.

Use `gemini-3-pro-image-preview` for final 2K/4K quality and `gemini-3.1-flash-image-preview` for fast drafts. Keep model IDs configurable because preview models may change.

## Render

1. Prepare a preservation-first prompt through the calling skill.
2. Run:

```powershell
node scripts/nexus-imagen-render.mjs --input source.png --prompt prompt.txt --output rendered.png --model gemini-3-pro-image-preview --size 4K --aspect 16:9
```

3. Inspect the actual result against the reference. Reject identity, composition, spelling, silhouette, line-break, or alpha changes forbidden by the calling skill.
4. Keep the source and rendered output separate. Never overwrite the source.
5. If the API is unavailable, report the blocker and use the calling skill's local fallback only when it preserves the user's intent.

## Mode contracts

- Background: enhance lighting, atmosphere, grading, particles, texture clarity, and depth only; preserve camera, crop, objects, characters, text, and edge fades.
- Character FX: generate light/effect material on black or chroma while preserving the original character separately; pass the result through Mask Forge.
- Title material: use a flat Typecore image as immutable reference; preserve every glyph, counter, line break, and silhouette; render only surface/material/outline/light.
