# Nexus background API

Endpoint: `POST /api/nexus-background-enhance`

Authenticate with `Authorization: Bearer $NEXUS_CODEX_RENDER_TOKEN`.

Request fields:

- `image`: PNG, JPEG, or WebP data URL.
- `engine`: `local`, `google`, or `auto`.
- `quality`: `preview` or `final`.
- `strength`: `subtle`, `standard`, or `dramatic`.
- `concept`: short art-direction description.
- `forceGenerative`: route `auto` to Google regardless of quality.
- `options`: optional flags for lighting, atmosphere, particles, depth, and composition preservation.

Production routing:

- Send `engine: google` and `quality: final`.
- Do not send `engine: auto` for production; it may route preview requests to the local renderer.
- Use `local` only after explicit user authorization.

Use this skill's `scripts/call-nexus-background.mjs`. Set `NEXUS_API_BASE_URL` to the Nexus deployment origin. `NEXUS_RENDER_ENDPOINT` may override the complete endpoint URL.
