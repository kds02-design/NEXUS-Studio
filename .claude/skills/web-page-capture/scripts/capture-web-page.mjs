#!/usr/bin/env node

import { access, mkdir, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { createHash } from "node:crypto";
import { isIP } from "node:net";
import path from "node:path";
import process from "node:process";

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1, userAgent: null },
  mobile: {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    userAgent: "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36",
  },
};

const HELP = `
Capture a public webpage in desktop and/or mobile viewports.

Usage:
  node capture-web-page.mjs --url <https://...> [options]

Options:
  --url <url>                    Required target URL.
  --output <directory>           Default: ./captures/<host>-<timestamp>
  --provider <auto|cloudflare|local>
                                 Default: auto.
  --viewports <desktop,mobile>   Default: desktop,mobile.
  --format <jpeg|png>            Default: jpeg.
  --quality <1-100>              JPEG quality. Default: 85.
  --full-page <true|false>       Default: true.
  --selector <css>               Capture one element instead of the page.
  --hide-selectors <css,css>     Hide matching elements before capture.
  --wait-until <mode>            domcontentloaded, load, networkidle0, networkidle2.
  --timeout <ms>                 Page load timeout, max 60000. Default: 45000.
  --wait-ms <ms>                 Additional post-load wait, max 60000. Default: 1500.
  --allow-private-network        Permit localhost/private targets explicitly.
  --overwrite                    Permit writing into an existing output directory.
  --dry-run                      Validate and print configuration only.
  --help                         Show this help.
`;

function parseArgs(argv) {
  const out = {};
  const booleanFlags = new Set(["allow-private-network", "overwrite", "dry-run", "help"]);
  const valueFlags = new Set([
    "url", "output", "provider", "viewports", "format", "quality", "full-page",
    "selector", "hide-selectors", "wait-until", "timeout", "wait-ms",
  ]);
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) throw new Error(`Unexpected positional argument: ${token}`);
    const key = token.slice(2);
    if (booleanFlags.has(key)) {
      out[key] = true;
      continue;
    }
    if (!valueFlags.has(key)) throw new Error(`Unknown option: --${key}`);
    const value = argv[i + 1];
    if (value == null || value.startsWith("--")) throw new Error(`Missing value for --${key}`);
    out[key] = value;
    i += 1;
  }
  return out;
}

function parseBoolean(value, fallback) {
  if (value == null) return fallback;
  if (value === true || String(value).toLowerCase() === "true") return true;
  if (value === false || String(value).toLowerCase() === "false") return false;
  throw new Error(`Expected true or false, received: ${value}`);
}

function parseInteger(value, fallback, min, max, label) {
  const parsed = value == null ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${label} must be an integer from ${min} to ${max}.`);
  }
  return parsed;
}

function isPrivateIpv4(host) {
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
    || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

function isPrivateHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  const family = isIP(host);
  if (family === 4) return isPrivateIpv4(host);
  if (family === 6) {
    return host === "::1" || host === "::" || host.startsWith("fc") || host.startsWith("fd")
      || host.startsWith("fe8") || host.startsWith("fe9") || host.startsWith("fea") || host.startsWith("feb");
  }
  return false;
}

function validateUrl(raw, allowPrivateNetwork) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("--url must be a valid absolute URL.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Only HTTP(S) URLs are supported.");
  if (parsed.username || parsed.password) throw new Error("Credentials embedded in URLs are not supported.");
  if (!allowPrivateNetwork && isPrivateHost(parsed.hostname)) {
    throw new Error("Private, loopback, and link-local targets require --allow-private-network.");
  }
  return parsed;
}

function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function safeHost(hostname) {
  return hostname.toLowerCase().replace(/[^a-z0-9.-]+/g, "-").replace(/^-+|-+$/g, "") || "webpage";
}

function normalizeConfig(args) {
  if (args.help) return { help: true };
  if (!args.url) throw new Error("--url is required.");
  const allowPrivateNetwork = Boolean(args["allow-private-network"]);
  const url = validateUrl(args.url, allowPrivateNetwork);
  const provider = args.provider || "auto";
  if (!["auto", "cloudflare", "local"].includes(provider)) throw new Error("--provider must be auto, cloudflare, or local.");
  const viewports = (args.viewports || "desktop,mobile").split(",").map((v) => v.trim()).filter(Boolean);
  if (!viewports.length || viewports.some((v) => !VIEWPORTS[v])) throw new Error("--viewports supports desktop and mobile.");
  const format = (args.format || "jpeg").toLowerCase().replace("jpg", "jpeg");
  if (!["jpeg", "png"].includes(format)) throw new Error("--format must be jpeg or png.");
  const waitUntil = args["wait-until"] || "networkidle0";
  if (!["domcontentloaded", "load", "networkidle0", "networkidle2"].includes(waitUntil)) {
    throw new Error("--wait-until must be domcontentloaded, load, networkidle0, or networkidle2.");
  }
  return {
    help: false,
    url: url.toString(),
    output: path.resolve(args.output || path.join("captures", `${safeHost(url.hostname)}-${timestampSlug()}`)),
    provider,
    viewports: [...new Set(viewports)],
    format,
    quality: parseInteger(args.quality, 85, 1, 100, "--quality"),
    fullPage: parseBoolean(args["full-page"], true),
    selector: args.selector || null,
    hideSelectors: (args["hide-selectors"] || "").split(",").map((v) => v.trim()).filter(Boolean),
    waitUntil,
    timeout: parseInteger(args.timeout, 45000, 1, 60000, "--timeout"),
    waitMs: parseInteger(args["wait-ms"], 1500, 0, 60000, "--wait-ms"),
    allowPrivateNetwork,
    overwrite: Boolean(args.overwrite),
    dryRun: Boolean(args["dry-run"]),
  };
}

function selectedProvider(config) {
  if (config.provider !== "auto") return config.provider;
  return process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN ? "cloudflare" : "local";
}

async function pathExists(target) {
  try {
    await access(target, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function prepareOutput(config) {
  const manifestPath = path.join(config.output, "capture.json");
  if (!config.overwrite && (await pathExists(config.output) || await pathExists(manifestPath))) {
    throw new Error(`Output already exists: ${config.output}. Pass --overwrite to reuse it.`);
  }
  await mkdir(config.output, { recursive: true });
}

function imageName(viewport, format) {
  return `${viewport}.${format === "jpeg" ? "jpg" : "png"}`;
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function imageDimensions(buffer, format) {
  if (format === "png" && buffer.length >= 24 && buffer.toString("ascii", 1, 4) === "PNG") {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (format === "jpeg" && buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    const sofMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
    let offset = 2;
    while (offset + 8 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1];
      offset += 2;
      if (marker === 0xd8 || marker === 0xd9) continue;
      if (marker === 0xda || offset + 2 > buffer.length) break;
      const length = buffer.readUInt16BE(offset);
      if (length < 2 || offset + length > buffer.length) break;
      if (sofMarkers.has(marker)) {
        return { width: buffer.readUInt16BE(offset + 5), height: buffer.readUInt16BE(offset + 3) };
      }
      offset += length;
    }
  }
  return { width: null, height: null };
}

function hiddenCss(selectors) {
  return selectors.length ? `${selectors.join(",")} { display: none !important; visibility: hidden !important; }` : null;
}

async function cloudflareCapture(config, viewportName) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new Error("Cloudflare mode requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.");
  }
  const viewport = VIEWPORTS[viewportName];
  const body = {
    url: config.url,
    viewport: { width: viewport.width, height: viewport.height, deviceScaleFactor: viewport.deviceScaleFactor },
    screenshotOptions: {
      fullPage: config.fullPage,
      type: config.format,
      ...(config.format === "jpeg" ? { quality: config.quality } : {}),
    },
    gotoOptions: { waitUntil: config.waitUntil, timeout: config.timeout },
    ...(config.waitMs ? { waitForTimeout: config.waitMs } : {}),
    ...(config.selector ? { selector: config.selector } : {}),
    ...(viewport.userAgent ? { userAgent: viewport.userAgent } : {}),
  };
  const css = hiddenCss(config.hideSelectors);
  if (css) body.addStyleTag = [{ content: css }];

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/browser-rendering/screenshot`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(config.timeout + config.waitMs + 15000),
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 500);
    throw new Error(`Cloudflare screenshot failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error("Cloudflare returned an empty screenshot.");
  return {
    buffer,
    finalUrl: null,
    title: null,
    browserMsUsed: Number(response.headers.get("x-browser-ms-used")) || null,
  };
}

function localWaitUntil(waitUntil) {
  return waitUntil === "networkidle0" || waitUntil === "networkidle2" ? "networkidle" : waitUntil;
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    throw new Error("Local mode requires the playwright package and an installed Chromium browser.");
  }
}

async function localCaptures(config) {
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  const results = new Map();
  try {
    for (const viewportName of config.viewports) {
      const viewport = VIEWPORTS[viewportName];
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.deviceScaleFactor,
        ...(viewport.userAgent ? { userAgent: viewport.userAgent, isMobile: true, hasTouch: true } : {}),
      });
      try {
        const page = await context.newPage();
        await page.goto(config.url, { waitUntil: localWaitUntil(config.waitUntil), timeout: config.timeout });
        const css = hiddenCss(config.hideSelectors);
        if (css) await page.addStyleTag({ content: css });
        if (config.waitMs) await page.waitForTimeout(config.waitMs);
        const options = { type: config.format, ...(config.format === "jpeg" ? { quality: config.quality } : {}) };
        const buffer = config.selector
          ? await page.locator(config.selector).screenshot(options)
          : await page.screenshot({ ...options, fullPage: config.fullPage });
        results.set(viewportName, {
          buffer,
          finalUrl: page.url(),
          title: await page.title().catch(() => null),
          browserMsUsed: null,
        });
      } catch (error) {
        results.set(viewportName, { error });
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  return results;
}

async function run(config) {
  const provider = selectedProvider(config);
  if (config.dryRun) {
    console.log(JSON.stringify({ ...config, provider }, null, 2));
    return 0;
  }

  await prepareOutput(config);
  const startedAt = new Date();
  const manifest = {
    schemaVersion: 1,
    requestedUrl: config.url,
    capturedAt: startedAt.toISOString(),
    provider,
    status: "running",
    configuration: {
      viewports: config.viewports,
      format: config.format,
      quality: config.format === "jpeg" ? config.quality : null,
      fullPage: config.fullPage,
      selector: config.selector,
      hiddenSelectorCount: config.hideSelectors.length,
      waitUntil: config.waitUntil,
      timeout: config.timeout,
      waitMs: config.waitMs,
    },
    captures: [],
    errors: [],
  };

  const localResults = provider === "local" ? await localCaptures(config) : null;
  for (const viewportName of config.viewports) {
    try {
      const result = provider === "cloudflare"
        ? await cloudflareCapture(config, viewportName)
        : localResults.get(viewportName);
      if (result?.error) throw result.error;
      const filename = imageName(viewportName, config.format);
      await writeFile(path.join(config.output, filename), result.buffer);
      const viewport = VIEWPORTS[viewportName];
      const pixels = imageDimensions(result.buffer, config.format);
      manifest.captures.push({
        viewport: viewportName,
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
        deviceScaleFactor: viewport.deviceScaleFactor,
        file: filename,
        imageWidth: pixels.width,
        imageHeight: pixels.height,
        format: config.format,
        bytes: result.buffer.length,
        sha256: sha256(result.buffer),
        finalUrl: result.finalUrl,
        title: result.title,
        browserMsUsed: result.browserMsUsed,
      });
    } catch (error) {
      manifest.errors.push({ viewport: viewportName, message: error?.message || String(error) });
    }
  }

  manifest.completedAt = new Date().toISOString();
  manifest.durationMs = Date.now() - startedAt.getTime();
  manifest.status = manifest.captures.length === config.viewports.length
    ? "success"
    : manifest.captures.length > 0 ? "partial" : "error";
  const manifestPath = path.join(config.output, "capture.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    output: config.output,
    manifest: manifestPath,
    status: manifest.status,
    captures: manifest.captures.length,
    errors: manifest.errors,
  }, null, 2));
  return manifest.status === "success" ? 0 : 1;
}

async function main() {
  try {
    const config = normalizeConfig(parseArgs(process.argv.slice(2)));
    if (config.help) {
      console.log(HELP.trim());
      return 0;
    }
    return await run(config);
  } catch (error) {
    console.error(`[web-page-capture] ${error?.message || error}`);
    return 1;
  }
}

process.exitCode = await main();
