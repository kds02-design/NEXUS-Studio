# Nexus Typecore API handoff

Use the protected Nexus Imagen API for both Typecore candidate generation and approved-title material rendering. Do not depend on a browser tab or Nexus UI navigation.

## Preflight

1. Require `NEXUS_API_BASE_URL` and `NEXUS_CODEX_RENDER_TOKEN`.
2. Resolve the endpoint as `${NEXUS_API_BASE_URL}/api/codex-imagen` unless `NEXUS_IMAGE_PROXY_URL` explicitly overrides it.
3. Send an authenticated `GET` request and require `{ "ok": true, "service": "codex-imagen" }` before uploading an image.
4. Obtain authorization before transmitting user-supplied reference images. Never log or save the bearer token.

## Generate and retrieve

1. Build the canonical Typecore brief with the selected Sovereign or Breeze direction.
2. Use a solid pure-black blank PNG as the API image input when no visual reference is required. Use a supplied reference only after authorization.
3. Require a solid pure-black background in every AI-generation prompt. Never ask the image model for transparency, alpha, a transparent background, a checkerboard, or simulated transparency. Treat a checkerboard baked into an image as an invalid candidate and regenerate it on pure black.
4. Invoke `/nexus-imagen-render` twice with distinct structure directions and save the native outputs as `title-flat-a.png` and `title-flat-b.png`.
5. Record endpoint, model, image size, aspect ratio, engine, preset direction, prompt file, source asset, and response metadata.
6. Validate exact Hangul, counters, spacing, line breaks, silhouette, and pure-black background. Reject invalid candidates.
7. Display both valid candidates and stop for explicit selection.

## Approved-title material render

1. Preserve the selected candidate as `title-flat-approved.png`.
2. Invoke `/nexus-imagen-render` with only the approved flat title as the immutable image reference.
3. Request 1K locked-material rendering on a solid pure-black background. Permit only material, bevel, depth, outline, surface detail, and lighting. Do not request transparency from the image model.
4. Reject any changed glyph, counter, row structure, width relationship, or silhouette.
5. Record `renderMatrixMode: api` and keep the flat and material outputs separate.
6. After structure validation, accept only the externally completed transparent PNG supplied by title production. Use it unchanged; do not run Mask Forge or any transparency conversion in the handoff workflow.
7. Stop and report the HTTP status if the API fails. Do not substitute a local approximation without explicit user authorization.

## Handoff record

Save `render-matrix-handoff.json` with:

- `engine`
- `preset`
- `exactText`
- `lines`
- `candidates`
- `selectedCandidate`
- `approvalText`
- `approvedAt`
- `typecoreAsset`
- `apiEndpoint`
- `apiModel`
- `renderMatrixMode`
- `renderMatrixAsset`
- `fallbackUsed`
- `structureValidation`
