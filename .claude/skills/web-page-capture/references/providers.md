# Capture providers

Read only the section for the selected provider.

## Cloudflare Browser Run

Use the REST Quick Action for public remote pages that do not require scripted interaction.

Required process environment variables:

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

The token needs the narrow `Browser Rendering - Edit` permission. Keep both values server-side. The script calls:

```text
POST https://api.cloudflare.com/client/v4/accounts/{accountId}/browser-rendering/screenshot
```

Each viewport is a separate Quick Action and therefore consumes browser time. Consult the current official pricing and limits before large batches:

- https://developers.cloudflare.com/browser-run/pricing/
- https://developers.cloudflare.com/browser-run/limits/
- https://developers.cloudflare.com/browser-run/quick-actions/screenshot-endpoint/

Cloudflare returns image bytes for the screenshot endpoint. It may identify itself as automation and does not bypass the target's WAF, Turnstile, or bot policy. Use a Browser Session workflow outside this script when the page requires clicks, scrolling, or stateful interaction.

## Local Playwright

Use local mode for user-owned development pages or environments without Cloudflare credentials.

The current Node resolution path must provide the `playwright` package and an installed Chromium binary. Install browsers through the environment's normal dependency workflow rather than from inside the skill. The script launches a clean headless context and does not reuse the user's browser profile or cookies.

## Application integration

The bundled CLI is suitable for an agent or scheduled worker. A web application should call a server endpoint that wraps the same contract rather than running the script in the browser.

A production wrapper must additionally:

- authenticate callers and rate-limit requests;
- allowlist target domains or resolve DNS and reject private, loopback, link-local, and metadata-service addresses after every redirect;
- keep Cloudflare credentials server-side;
- cap response size, page time, and viewport count;
- store images outside Firestore documents and record only durable URLs plus the manifest fields;
- use deterministic request IDs so retries do not create duplicate records.
