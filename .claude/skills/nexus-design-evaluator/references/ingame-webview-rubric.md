# In-game web browser and webview design rubric

Use this profile for notice, event, system, maintenance, error, community, support, and similar pages presented inside a game client or over a dimmed game screen.

This is a visual and interaction-design evaluation. Do not score SDK integration, browser-engine behavior, callbacks, authentication, performance, security, analytics, deep links, or implementation feasibility unless the user explicitly requests a separate technical audit.

## Scoring schema

```json
{
  "profile": "ingame-webview",
  "frame": "667x375_News_Event_Light",
  "scores": {
    "context_fit": {"score": 0, "reason": ""},
    "viewport_fit": {"score": 0, "reason": ""},
    "navigation": {"score": 0, "reason": ""},
    "information_architecture": {"score": 0, "reason": ""},
    "typography": {"score": 0, "reason": ""},
    "spacing": {"score": 0, "reason": ""},
    "interaction": {"score": 0, "reason": ""},
    "theme_consistency": {"score": 0, "reason": ""},
    "overlay_safety": {"score": 0, "reason": ""},
    "detail": {"score": 0, "reason": ""}
  },
  "hardFailures": [],
  "recommendedCorrections": []
}
```

## Metrics and weights

| Key | Weight | Judge |
| --- | ---: | --- |
| context_fit | 8 | Whether the page feels appropriate inside a game and remains subordinate to the game context without looking like an unrelated desktop website |
| viewport_fit | 14 | Stability at the target and smallest supplied viewport: clipping, ellipsis, responsive proportions, safe margins, image crop, and usable information density |
| navigation | 10 | Clarity and placement of back, forward, refresh, title, menu, close, previous/list/support, and recovery controls; chrome-to-content separation |
| information_architecture | 12 | Understandable relationship among tabs, list, selected item, reading pane, system state, dates, policy links, and supporting actions |
| typography | 14 | Readability, hierarchy, Korean line breaks, truncation quality, font consistency, line height, tracking, and title/date/body differentiation |
| spacing | 12 | Alignment, repeated gaps, panel balance, list-item padding, image/text rhythm, scrollbar clearance, and integer-coordinate discipline |
| interaction | 10 | Visible selected/inactive/pressed meaning, adequate control size, predictable tabs, share/menu affordance, scroll cues, and prototype discoverability |
| theme_consistency | 8 | Equivalent meaning and hierarchy in light and dark modes without merely inverting colors; controlled contrast and consistent component geometry |
| overlay_safety | 6 | Separation from the game scene: dimming, outer close-button visibility, edge safety, modal/page radius, and avoidance of background interference |
| detail | 6 | Icon scale and alignment, 1px rendering, corner consistency, scrollbar treatment, image quality, divider finish, and absence of glow or fractional artifacts |

## Evaluation method

- Score the declared master screen and inspect other screens as consistency evidence.
- When both light and dark modes exist, `theme_consistency` must reference both. Do not issue two independent overall scores unless requested.
- When both event and system pages exist, verify that tabs, lists, reading panes, scrollbars, and shared chrome keep the same geometry unless content needs justify a documented exception.
- Inspect the design at 100% and at the smallest supplied or prototype preview. Downscaled glow, 1px shimmer, collapsed gaps, and clipped labels count as visible defects.
- Judge controls by their whole clickable container, not only glyph size. A visually tiny glyph inside a sufficiently large, clearly bounded button is not automatically a failure.
- Ellipsis is acceptable when it is intentional, single-line, and leaves enough text to identify the item. Repeated early truncation across most rows is a viewport-fit and typography problem.
- A deliberately scrolled system page may crop earlier content when the scroll position is clearly communicated and required bottom content remains separated and readable.

## Hard failures

Record a hard failure when visible evidence shows any of the following:

- Required close, back, recovery, or support action is missing, clipped, or visually indistinguishable from the background.
- Critical title, error message, maintenance period, policy text, or required legal copy overlaps another element or cannot be read.
- Selected and inactive states communicate opposite meanings between light and dark modes.
- The page or toolbar overlaps, escapes, or is materially cropped by the intended viewport.
- A scrollbar, divider, or fixed footer visibly covers content.
- The game scene is not dimmed or separated where the design family requires an overlay treatment, causing critical UI to blend into the game.
- Incorrect required game name, company name, date, logo, or mandated copy is visible.

Do not create a hard failure solely because a design file lacks actual scrolling, hover behavior, SDK wiring, or browser functionality. Those require a prototype or implementation audit.

## Calibration and gate

- 90–99: production-ready across the smallest viewport, both themes, and all supplied states; only negligible refinements remain.
- 85–89: strong and shippable with minor polish issues that do not impair scanning or control discovery.
- 80–84: usable and coherent but with visible density, truncation, contrast, scrollbar, or consistency issues.
- 70–79: meaningful navigation, hierarchy, viewport, or theme problems that should be corrected before handoff.
- Below 70: severe readability, clipping, state, or overlay failures.

Pass only when the weighted overall is at least 85, every metric is at least 75, and `hardFailures` is empty.

## Correction mapping

- context_fit: webview surface hierarchy, game-context restraint, chrome/content relationship
- viewport_fit: panel proportions, smallest-view crop, ellipsis, responsive margins, image width and height
- navigation: toolbar alignment, button containers, close/menu/back visibility, recovery action grouping
- information_architecture: tab/list/detail relationship, date placement, policy/footer separation, state-page structure
- typography: size, weight, line height, tracking, Korean wrapping, truncation threshold
- spacing: consistent 4/5/8px gaps, list padding, column balance, image/text rhythm, scrollbar clearance
- interaction: active/inactive states, touch/click target, affordance, prototype links, share/menu icon treatment
- theme_consistency: corresponding light/dark component colors, contrast, geometry, and state meaning
- overlay_safety: dim layer, outer close button, screen-edge clearance, panel radius, background interference
- detail: 1px strokes, anti-aliasing, integer coordinates, icon alignment, scrollbar opacity, dividers

