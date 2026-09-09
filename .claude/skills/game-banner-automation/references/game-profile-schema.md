# Game profile schema and extension

Profiles live in `references/game-profiles/*.json`. `resolve-game-profile.mjs` discovers them automatically; adding a game does not require editing the core script.

## Required fields

```json
{
  "schema": "game-banner-profile/v1",
  "id": "game-id",
  "displayName": "Game Name",
  "version": 1,
  "aliases": ["game-id", "localized name"],
  "guide": "references/games/game-id.md",
  "framePolicy": {
    "sourceOfTruth": "live-figma | profile",
    "frames": []
  },
  "brand": {
    "assetAuthority": [],
    "channels": {},
    "placements": {},
    "protectedZones": {}
  }
}
```

Frame entries use `name`, optional `width` and `height`, `role`, and `visibleRoles`. Omit fixed dimensions when live Figma is authoritative.

Placement records may be keyed by frame and channel. Use `{x,y,width,height}` bounds and an optional protected zone. A maintained profile default is weaker than a user-approved live frame or approved repeat master.

## Add a future game

1. Add one unique JSON profile with aliases. Layout selection remains in the shared cross-game pool.
2. Add the guide named by `guide` containing only game-specific rules.
3. Add immutable official assets under `assets/games/<id>/` when they are approved and reusable.
4. Run `resolve-game-profile.mjs --game <alias>` and the regression test.

Do not copy the shared production pipeline or layout catalog into a game profile. Do not add title, character, quality, effect, or Figma mechanics that belong to shared specialist skills.

## Campaign-local custom profile

For an unmaintained game, create the same JSON structure inside the campaign workspace and resolve it with `--profile <path>`. Use supplied or live-approved brand assets only. Once repeated work proves the rules stable, promote the profile and its approved assets into this skill.
