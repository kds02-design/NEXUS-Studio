# Motion-settled capture

Use this mode for pages whose requested visual state appears only after an intro, title reveal, route transition, or video sequence. It uses local Playwright because a fixed Cloudflare delay cannot verify page-specific completion signals.

## Choose completion signals

Use the smallest reliable set:

- `--intro-selector`: a modal, body class, or overlay that appears and then disappears. If it never appears, capture continues with a manifest warning; if it appears but never closes, that viewport fails.
- `--title-video-selector` with `--title-video-time`: wait until a transparent or composited title video reaches a visually verified final-reveal timestamp.
- `--title-video-end`: use instead of a timestamp only for a finite video that truly reaches `ended`. Do not use this for a script-restarted or looping reveal.
- `--settle-selector`: wait until a DOM element's class, opacity, transform, filter, visibility, and bounds remain stable. This cannot detect changing pixels inside Canvas or video.

Do not use the entire screenshot hash as the completion signal when backgrounds, particles, Canvas, or video loop continuously.

## Example

```powershell
node scripts/capture-motion-settled-page.mjs `
  --url "https://example.com/event" `
  --output ".tmp/captures/event-final" `
  --viewports desktop,mobile `
  --intro-selector "body.intro-open" `
  --title-video-selector "#hero video.title" `
  --title-video-time 4.8 `
  --extract-video-selector "#hero video" `
  --overwrite
```

The command writes desktop/mobile reference PNGs, optional alpha-preserving video-frame PNGs, and `capture.json`. The manifest records the observed intro state, title video time/duration, media readiness, hashes, warnings, and errors.

## Validation

Inspect every reference image and each extracted video layer. For transparent overlays, confirm the PNG has an alpha channel and a transparent corner; an opaque white background is a failure. Compare reference and separated-layer compositions at the same viewport dimensions before importing them into Figma.
