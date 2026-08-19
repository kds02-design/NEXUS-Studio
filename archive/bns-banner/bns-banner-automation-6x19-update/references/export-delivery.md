# Final export and delivery

Use this procedure after the user approves or manually adjusts the final Figma frames.

## Destination

1. Resolve the exact request/resource folder; do not rely on wildcard-looking paths.
2. Create `3. 배너` directly below that folder.
3. Re-export from the live Figma frames immediately before saving so manual adjustments are included.

## File contract

| Frame | Output |
| --- | --- |
| `1180x750_Notice` | JPG, quality 80 |
| `1200x628_Facebook` | JPG, quality 80 |
| `1352x860_PURPLE` | JPG, quality 80 |
| `620x640_PC_MO` | JPG, quality 80 |
| `600x340_EventON` | JPG, quality 80 |
| `357x230_Toast` | transparent PNG |
| `266x280_Ingame` | transparent PNG |
| `72x40_List` | JPG, quality 80 |

Use the frame name as the filename. Preserve exact pixel dimensions.

## Reliable JPEG path

Export a lossless PNG from Figma first, then encode the six opaque outputs with an explicit JPEG quality value of 80. Do not assume a tool's default JPG quality equals 80. Confirm JPEG outputs are RGB and have the expected dimensions.

## Reliable transparency path

Some Figma asset-download/export routes flatten transparent frame backgrounds to white even though the file extension is PNG and the decoded pixel format is ARGB. For Toast and Ingame:

1. Prefer the Figma transparent screenshot/render URL (`get_screenshot` with `contentsOnly: true`) when the ordinary asset export flattens the background.
2. Download the returned PNG at the frame's native dimensions.
3. Inspect actual pixel alpha values, not only the file mode.
4. Require transparent pixels in the intended background area, corner alpha 0 where appropriate, and zero opaque near-white background pixels.
5. Preserve semi-transparent edge pixels for antialiasing and FX.

If the export is opaque, do not color-key white from the character. Re-export through a transparency-preserving Figma path; color-keying can damage white costumes, fur, highlights, and glow.

## Final verification

- Compare every saved image's width and height to the frame specification.
- Confirm exactly six JPG files and two PNG files.
- Confirm Toast retains its transparent top region and visible lower background.
- Confirm Ingame contains only character and FX on transparency.
- Confirm character ears/hair/weapons and rim light are not clipped at the top.
- Confirm 1200 preserves the top-right official-logo safe zone.
- Report the destination folder and any replaced files.
