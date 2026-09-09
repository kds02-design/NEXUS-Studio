# Web-to-Figma layer mapping

Use this reference to decide which source elements can be reconstructed without changing their meaning or appearance.

| Web source | Figma representation | Default treatment |
|---|---|---|
| Flow container | Frame or Auto Layout | Use Auto Layout only when children participate in normal row/column flow. |
| Absolute or fixed overlay | Frame with fixed coordinates | Preserve stacking and clipping; do not force it into Auto Layout. |
| DOM text | Text node | Preserve content, family, style, size, line height, letter spacing, alignment, opacity, and width. |
| Text baked into JPEG/PNG/video | Image content | Keep rasterized. OCR reconstruction is optional and must not duplicate visible text. |
| Solid color | Solid fill | Convert RGB/alpha to Figma 0–1 colors. |
| CSS gradient | Gradient fill | Recreate simple linear/radial gradients; rasterize complex conic or multi-mask results when fidelity would suffer. |
| `<img>` / CSS background | Image fill | Prefer image hashes from the faithful Figma web capture. Respect `object-fit` and background sizing/position. |
| Inline or fetched SVG | Vector node | Import source SVG; replace `currentColor` deliberately and verify viewBox sizing. |
| Border / radius | Stroke / corner radius | Preserve per-side differences only when they materially affect the design. |
| Box/text shadow | Effect | Recreate supported shadows; rasterize unsupported filter chains. |
| Pseudo-element | Native shape/text or part of parent | Create separately only when visually meaningful. |
| Canvas / WebGL | Raster fallback | Capture after it settles and mark the layer as non-editable. |
| Video | Poster or settled frame | Record the video source in extraction metadata; do not imply motion is preserved. |
| CSS animation / JS transition | Stable state frames | Capture only requested states after settling. |
| Sticky/fixed navigation | Repeated overlay or component | Keep as a component when repeated across section-state frames. |

## Hierarchy rules

- Preserve major semantic regions and meaningful groups; do not reproduce every wrapper `<div>`.
- Name frames by role and source order, such as `00 Hero`, `01 Features`, `Navigation`, and `Reference Screenshot`.
- Componentize repeated navigation, cards, buttons, tabs, and badges.
- Keep PC and mobile structures independent when responsive CSS changes hierarchy, visibility, or content order.
- Prefer the target file's existing components and variables over locally rebuilt primitives.

## Fidelity rules

- Compare at the source viewport size.
- Treat wrong fonts, clipped text, missing imagery, open drawers, and incorrect z-order as failures.
- A structurally editable result is not acceptable if it visibly diverges from the source.
- A pixel-faithful raster capture is a reference or fallback, not evidence that the page was converted into editable layers.

