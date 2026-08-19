# Approved banner specification

Reference file: `yfrEN3GMD2RPqs7I2MbryK`, Season 4 page `31:16`.

## Frames

| Frame | Size | Content |
| --- | ---: | --- |
| `1180x750_Notice` | 1180×750 | Full text composition |
| `1200x628_Facebook` | 1200×628 | Full text composition + official logo at top-right |
| `1352x860_PURPLE` | 1352×860 | Image only; character centered |
| `620x640_PC_MO` | 620×640 | Image only; character centered |
| `600x340_EventON` | 600×340 | Image only; character centered |
| `357x230_Toast` | 357×230 | Image only; top 70 px transparent |
| `266x280_Ingame` | 266×280 | Transparent character only; background and atmosphere hidden |
| `72x40_List` | 72×40 | Image only; face-focused close crop |

## Finalized 1180 anchors

These reflect the user-adjusted Season 4 file and are starting points, not blind constants.

| Layer | x | y | width | height |
| --- | ---: | ---: | ---: | ---: |
| background | 0 | 0 | 1180 | 750 |
| atmosphere | 0 | 0 | 1180 | 750 |
| character | -20 | 0 | 610 | 860 |
| character FX canvas | -192 | -15 | 972 | 890 |
| combined title | 470 | 167 | 700 | 302.45 |
| subcopy | 548.5 | 455 | 543 | 30 |
| date dim | 550 | 510 | 540 | 48 |
| date | 583.5 | 525 | 473 | 18 |

Subcopy font size is 30 px; date font size is 18 px. Center both within the right-hand text block. Apply text shadow for separation only when the active background requires it.

## 1200 duplication rule

Duplicate the finalized 1180 frame. Adapt anchor positions with `sx=1200/1180` and `sy=628/750`, while retaining the intrinsic sizes of foreground artwork and text unless clipping requires adjustment. The approved Season 4 result used:

- title `(477.97, 125.60, 700, 302.45)`
- subcopy `(557.80, 409.99, 543, 30)`
- date dim `(559.32, 456.04, 540, 48)`
- date `(593.39, 468.60, 473, 18)`

Place the approved official game logo at top-right after duplication. The logo is an input asset and is not embedded in this skill.
Treat its visible bounds plus optical breathing room as a protected safe zone. Move the character and its FX together when resolving overlap. A user-adjusted 1200 composition takes precedence over the numeric anchors.

## Image-only crop anchors

- Purple character: approximately `(331, 0, 690, 973)`.
- 620 character: approximately `(60, 0, 500, 705)`.
- EventON character: approximately `(142.5, 0, 315, 444)`.
- Toast character: approximately `(5, 8, 175, 247)` with background beginning at y=70.
- Ingame character: approximately `(15, 10, 230, 324)`; background and mood layers hidden.
- List face crop: approximately `(-14, -8, 100, 168.4)`.

Favor the upper body. Re-center optically when a new character pose differs, but keep the same crop intent.
For Toast and Ingame, inspect the final rendered alpha bounds and move the character down/forward enough that the upper silhouette and FX remain inside the frame. Never move the character without applying the identical transform to its FX canvas.
