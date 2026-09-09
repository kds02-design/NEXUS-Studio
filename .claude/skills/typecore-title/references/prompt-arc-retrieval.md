# Prompt Arc title-recipe retrieval

Use this only for `creative-new`. Skip it for a confident `repeat-update`.

## Search contract

1. Build a compact retrieval profile from the title-direction brief:
   - exact row count and requested line breaks;
   - character count per row and which row dominates;
   - width class: compact, balanced, or wide;
   - stroke language: monumental serif, blade serif, geometric gothic, rounded, handwritten, or calligraphic;
   - theme and mood;
   - flat-shape style versus rendered-material reference.
2. Call `nexus_prompt_arc_list` with:
   - `category: "타이포"`;
   - `nature: "typography"`;
   - `style: "2d_bw" | "3d_render" | "calligraphy"` as appropriate;
   - `theme: "rpg_fantasy" | "casual_cartoon" | "sf_cyberpunk"` when supported by the brief;
   - one short `query` at a time.
3. Prefer two or three targeted queries over one overloaded sentence. Useful query terms describe shape or production intent, such as `2줄 전투 명조`, `상단 소제목 하단 메인`, `각진 고딕`, or a named campaign motif.
4. Retrieve no more than 24 results per targeted query unless the first pass has no credible structural match. Do not paginate indefinitely.
5. Fetch up to five strongest IDs with `nexus_prompt_arc_get`. A list result is not enough to select a recipe.

## Candidate scoring

Compare in this order:

1. exact row-count and hierarchy compatibility;
2. per-row character-length class and width relationship;
3. stroke language and counter treatment;
4. silhouette rhythm, terminal motifs, and optical weight;
5. engine compatibility: Sovereign or Breeze;
6. theme, palette, and material.

Reject candidates whose only similarity is color, genre, or material. A structurally mismatched title must not control shape generation.

## Recipe reuse

Separate the retrieved prompt into:

- **locked:** engine persona, structural hierarchy, stroke grammar, width rhythm, terminal rules, counter rules, avoid clauses, and reference-preservation clauses;
- **changeable:** verbatim title text, explicit line breaks, output ratio, campaign palette, and requested material.

Keep locked clauses verbatim. Do not combine multiple Prompt Arc recipes unless the user explicitly requests a hybrid. Use the selected source image as a style/structure reference only after any required transmission authorization.

## Records

Save `prompt-arc-audit.json` with:

- retrieval profile;
- all list calls and filters;
- candidate IDs and URLs;
- structural scores and rejection reasons;
- selected ID or `none`;
- selected prompt stages;
- locked and changeable fields;
- engine mapping;
- applied final prompt;
- output validation result.

If no candidate passes structural comparison, continue with the normal Typecore direction brief and record why Prompt Arc was not used.
