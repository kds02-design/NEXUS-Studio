---
name: bns-banner-automation
description: Legacy explicit-only compatibility entrypoint for Blade & Soul banner requests. Route all production to game-banner-automation with the maintained BNS game profile.
---

# BNS Banner Automation Compatibility

Invoke `/game-banner-automation` with `requestedGame: bns` and follow its shared seven-stage pipeline. Use the shared Aion+BNS 40-layout pool during `02-layout-selection`. Resolve the BNS profile only during `06-master-assembly` for BI, channel-badge, frame, and delivery rules.

Do not execute or maintain an independent BNS production pipeline from this compatibility skill. Current live Figma geometry and approved repeat masters override profile defaults when recorded.

