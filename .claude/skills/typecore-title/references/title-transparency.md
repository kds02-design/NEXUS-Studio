# Title transparency pass-through

Title transparency is completed before the asset enters Typecore handoff or Figma assembly.

Use the exact handed-off transparent PNG byte-for-byte. This is unconditional: do not inspect alpha to choose a processing route and do not create, replace, recompute, repair, trim, normalize, remap, or re-save the title. Never invoke Mask Forge, Remove AI, Adobe background removal, luminance-to-alpha, effect extraction, or another transparency tool on a handed-off title.

If the asset cannot be used directly, stop and return the same file to title production unchanged. QA may report the visible problem but must not generate a corrected derivative.
