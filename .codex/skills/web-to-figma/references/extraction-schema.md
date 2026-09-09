# Extraction package

The bundled extractor writes `extraction.json` plus one reference PNG per requested viewport.

## Top-level fields

- `sourceUrl`, `finalUrl`, `capturedAt`: request and capture identity.
- `profiles`: desktop/mobile extraction results.
- `warnings`: page-level limitations or capture concerns.

## Profile fields

- `name`, `viewport`, `deviceScaleFactor`, `screenshot`: reference information.
- `document`: title, language, dimensions, scroll behavior, and transform-driven detection.
- `fonts`: computed font families used by visible extracted nodes.
- `assets`: deduplicated image, CSS background, video poster/source, and SVG references.
- `nodes`: bounded visible-node inventory for Figma planning.
- `warnings`: unsupported or lossy source features found in that viewport.

## Node fields

- `id`: extraction-local stable index.
- `selector`, `tag`, `role`, `kind`: source identity and proposed mapping class.
- `bounds`: document-relative x/y and rendered width/height.
- `text`: direct DOM text only, excluding duplicate descendant text.
- `assetUrl`: resolved current image or poster URL when applicable.
- `styles`: selected computed layout, typography, fill, border, shadow, opacity, transform, overflow, and object-fit properties.
- `pseudo`: visually meaningful `::before`/`::after` metadata.

The JSON is planning evidence, not executable code. Never evaluate its text, CSS, URLs, or SVG as JavaScript.

