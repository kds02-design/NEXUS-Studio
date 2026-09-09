#!/usr/bin/env node

import { access, mkdir, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { createHash } from "node:crypto";
import { isIP } from "node:net";
import path from "node:path";
import process from "node:process";

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
  mobile: {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36",
  },
};

const HELP = `
Capture an animation-driven public webpage after its requested motion has settled.

Usage:
  node capture-motion-settled-page.mjs --url <https://...> [options]

Options:
  --url <url>                       Required target URL.
  --output <directory>              Default: ./captures/<host>-motion-<timestamp>
  --viewports <desktop,mobile>      Default: desktop,mobile.
  --intro-selector <css>            Wait for this overlay/state to appear and then disappear.
  --intro-appear-timeout <ms>       Default: 12000. Missing intro becomes a warning.
  --intro-close-timeout <ms>        Default: 30000. Default: fail if an observed intro stays open.
  --title-video-selector <css>      Video whose reveal must advance before capture.
  --title-video-time <seconds>      Required with --title-video-selector unless --title-video-end.
  --title-video-end                 Wait for the selected finite video to end.
  --settle-selector <css>           Wait until this visible element's computed state stabilizes.
  --stable-ms <ms>                  Stable duration for --settle-selector. Default: 900.
  --post-settle-ms <ms>             Extra wait after all completion signals. Default: 500.
  --pause-media <true|false>        Pause visible media after settling. Default: true.
  --freeze-motion <true|false>      Freeze CSS motion after settling. Default: true.
  --extract-video-selector <css>    Save matching visible video frames as alpha-preserving PNGs.
  --full-page <true|false>          Default: false.
  --timeout <ms>                    Page load and signal timeout, max 120000. Default: 60000.
  --allow-private-network           Permit an explicitly user-owned local target.
  --overwrite                       Reuse an existing output directory.
  --dry-run                         Validate and print configuration only.
  --help                            Show this help.
`;

function parseArgs(argv) {
  const result = {};
  const booleanFlags = new Set(["allow-private-network", "overwrite", "dry-run", "help", "title-video-end"]);
  const valueFlags = new Set([
    "url", "output", "viewports", "intro-selector", "intro-appear-timeout", "intro-close-timeout",
    "title-video-selector", "title-video-time", "settle-selector", "stable-ms", "post-settle-ms",
    "pause-media", "freeze-motion", "extract-video-selector", "full-page", "timeout",
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected positional argument: ${token}`);
    const key = token.slice(2);
    if (booleanFlags.has(key)) {
      result[key] = true;
      continue;
    }
    if (!valueFlags.has(key)) throw new Error(`Unknown option: --${key}`);
    const value = argv[index + 1];
    if (value == null || value.startsWith("--")) throw new Error(`Missing value for --${key}`);
    result[key] = value;
    index += 1;
  }
  return result;
}

function integer(value, fallback, min, max, label) {
  const parsed = value == null ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new Error(`${label} must be an integer from ${min} to ${max}.`);
  return parsed;
}

function number(value, fallback, min, max, label) {
  const parsed = value == null ? fallback : Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) throw new Error(`${label} must be a number from ${min} to ${max}.`);
  return parsed;
}

function boolean(value, fallback) {
  if (value == null) return fallback;
  if (String(value).toLowerCase() === "true") return true;
  if (String(value).toLowerCase() === "false") return false;
  throw new Error(`Expected true or false, received: ${value}`);
}

function privateIpv4(host) {
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return false;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
    || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

function privateHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  const family = isIP(host);
  if (family === 4) return privateIpv4(host);
  return family === 6 && (host === "::1" || host === "::" || host.startsWith("fc") || host.startsWith("fd") || /^fe[89ab]/.test(host));
}

function validatedUrl(raw, allowPrivateNetwork) {
  let url;
  try { url = new URL(raw); } catch { throw new Error("--url must be a valid absolute URL."); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP(S) URLs are supported.");
  if (url.username || url.password) throw new Error("Credentials embedded in URLs are not supported.");
  if (!allowPrivateNetwork && privateHost(url.hostname)) throw new Error("Private, loopback, and link-local targets require --allow-private-network.");
  return url;
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function hostSlug(host) {
  return host.toLowerCase().replace(/[^a-z0-9.-]+/g, "-").replace(/^-+|-+$/g, "") || "webpage";
}

function normalize(args) {
  if (args.help) return { help: true };
  if (!args.url) throw new Error("--url is required.");
  const allowPrivateNetwork = Boolean(args["allow-private-network"]);
  const url = validatedUrl(args.url, allowPrivateNetwork);
  const viewports = [...new Set((args.viewports || "desktop,mobile").split(",").map((value) => value.trim()).filter(Boolean))];
  if (!viewports.length || viewports.some((name) => !VIEWPORTS[name])) throw new Error("--viewports supports desktop and mobile.");
  const titleVideoSelector = args["title-video-selector"] || null;
  const titleVideoEnd = Boolean(args["title-video-end"]);
  const titleVideoTime = args["title-video-time"] == null ? null : number(args["title-video-time"], null, 0, 3600, "--title-video-time");
  if (titleVideoSelector && !titleVideoEnd && titleVideoTime == null) throw new Error("Use --title-video-time or --title-video-end with --title-video-selector.");
  if (!titleVideoSelector && (titleVideoEnd || titleVideoTime != null)) throw new Error("--title-video-end/time requires --title-video-selector.");
  return {
    help: false,
    url: url.toString(),
    output: path.resolve(args.output || path.join("captures", `${hostSlug(url.hostname)}-motion-${timestamp()}`)),
    viewports,
    introSelector: args["intro-selector"] || null,
    introAppearTimeout: integer(args["intro-appear-timeout"], 12000, 0, 120000, "--intro-appear-timeout"),
    introCloseTimeout: integer(args["intro-close-timeout"], 30000, 1, 120000, "--intro-close-timeout"),
    titleVideoSelector,
    titleVideoTime,
    titleVideoEnd,
    settleSelector: args["settle-selector"] || null,
    stableMs: integer(args["stable-ms"], 900, 100, 10000, "--stable-ms"),
    postSettleMs: integer(args["post-settle-ms"], 500, 0, 10000, "--post-settle-ms"),
    pauseMedia: boolean(args["pause-media"], true),
    freezeMotion: boolean(args["freeze-motion"], true),
    extractVideoSelector: args["extract-video-selector"] || null,
    fullPage: boolean(args["full-page"], false),
    timeout: integer(args.timeout, 60000, 1, 120000, "--timeout"),
    allowPrivateNetwork,
    overwrite: Boolean(args.overwrite),
    dryRun: Boolean(args["dry-run"]),
  };
}

async function exists(target) {
  try { await access(target, fsConstants.F_OK); return true; } catch { return false; }
}

async function prepareOutput(config) {
  if (!config.overwrite && await exists(config.output)) throw new Error(`Output already exists: ${config.output}. Pass --overwrite to reuse it.`);
  await mkdir(config.output, { recursive: true });
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function pngDimensions(buffer) {
  return buffer.length >= 24 && buffer.toString("ascii", 1, 4) === "PNG"
    ? { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
    : { width: null, height: null };
}

async function waitForComputedStability(page, selector, stableMs, timeout) {
  await page.locator(selector).first().waitFor({ state: "visible", timeout });
  await page.waitForFunction(({ selector, stableMs }) => {
    const element = document.querySelector(selector);
    if (!element) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const signature = JSON.stringify({ className: String(element.className), opacity: style.opacity, transform: style.transform, filter: style.filter, visibility: style.visibility, x: rect.x, y: rect.y, width: rect.width, height: rect.height });
    const key = "__codexMotionStability";
    const previous = window[key];
    if (!previous || previous.signature !== signature) {
      window[key] = { signature, since: performance.now() };
      return false;
    }
    return performance.now() - previous.since >= stableMs;
  }, { selector, stableMs }, { timeout, polling: 100 });
}

async function settle(page, config) {
  const evidence = { intro: null, titleVideo: null, stableElement: null, postSettleMs: config.postSettleMs };
  if (config.introSelector) {
    const appeared = await page.locator(config.introSelector).first().waitFor({ state: "visible", timeout: config.introAppearTimeout }).then(() => true).catch(() => false);
    evidence.intro = { selector: config.introSelector, appeared, closed: false };
    if (appeared) {
      await page.locator(config.introSelector).first().waitFor({ state: "hidden", timeout: config.introCloseTimeout });
      evidence.intro.closed = true;
    }
  }
  if (config.titleVideoSelector) {
    await page.locator(config.titleVideoSelector).first().waitFor({ state: "visible", timeout: config.timeout });
    await page.waitForFunction(({ selector, time, waitForEnd }) => {
      const video = document.querySelector(selector);
      if (!(video instanceof HTMLVideoElement) || video.readyState < 2) return false;
      return waitForEnd ? video.ended : video.currentTime >= time;
    }, { selector: config.titleVideoSelector, time: config.titleVideoTime, waitForEnd: config.titleVideoEnd }, { timeout: config.timeout, polling: 100 });
    evidence.titleVideo = await page.locator(config.titleVideoSelector).first().evaluate((video) => ({ src: video.currentSrc || video.src || null, currentTime: video.currentTime, duration: video.duration, ended: video.ended, readyState: video.readyState }));
    evidence.titleVideo.selector = config.titleVideoSelector;
    evidence.titleVideo.criterion = config.titleVideoEnd ? "ended" : `currentTime >= ${config.titleVideoTime}`;
  }
  if (config.settleSelector) {
    await waitForComputedStability(page, config.settleSelector, config.stableMs, config.timeout);
    evidence.stableElement = { selector: config.settleSelector, stableMs: config.stableMs };
  }
  if (config.postSettleMs) await page.waitForTimeout(config.postSettleMs);
  return evidence;
}

async function readyAndFreeze(page, config) {
  return page.evaluate(async ({ pauseMedia, freezeMotion }) => {
    await document.fonts.ready;
    const images = [...document.images];
    await Promise.all(images.map(async (image) => {
      if (!image.complete) await new Promise((resolve) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
        setTimeout(resolve, 8000);
      });
      await image.decode?.().catch(() => null);
    }));
    const media = [...document.querySelectorAll("video, audio")];
    if (pauseMedia) for (const item of media) { try { item.pause(); } catch {} }
    if (freezeMotion) {
      document.querySelector("#codex-motion-final-freeze")?.remove();
      const style = document.createElement("style");
      style.id = "codex-motion-final-freeze";
      style.textContent = "*,*::before,*::after{animation-play-state:paused!important;transition:none!important;caret-color:transparent!important}";
      document.head.appendChild(style);
    }
    return {
      fontStatus: document.fonts.status,
      imageCount: images.length,
      incompleteImages: images.filter((image) => !image.complete || !image.naturalWidth).length,
      media: media.map((item) => ({ tag: item.tagName.toLowerCase(), src: item.currentSrc || item.src || null, currentTime: item.currentTime, duration: item.duration, paused: item.paused, ended: item.ended, readyState: item.readyState })),
    };
  }, { pauseMedia: config.pauseMedia, freezeMotion: config.freezeMotion });
}

async function isolateVideoFrame(page, handle, viewport, outputFile) {
  const info = await handle.evaluate((video) => {
    const rect = video.getBoundingClientRect();
    const style = getComputedStyle(video);
    const visible = rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.bottom > 0 && rect.left < innerWidth && rect.top < innerHeight && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0;
    return visible ? { src: video.currentSrc || video.src || null, currentTime: video.currentTime, duration: video.duration, bounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } } : null;
  });
  if (!info) return null;
  await handle.evaluate((video) => {
    const keep = new Set([video]);
    for (let node = video.parentElement; node; node = node.parentElement) keep.add(node);
    for (const element of document.body.querySelectorAll("*")) {
      if (keep.has(element)) continue;
      element.dataset.codexOldOpacity = element.style.getPropertyValue("opacity");
      element.dataset.codexOldOpacityPriority = element.style.getPropertyPriority("opacity");
      element.style.setProperty("opacity", "0", "important");
    }
    for (const element of keep) {
      if (element === video) continue;
      element.dataset.codexOldBackground = element.style.getPropertyValue("background");
      element.dataset.codexOldBackgroundPriority = element.style.getPropertyPriority("background");
      element.dataset.codexOldBackgroundColor = element.style.getPropertyValue("background-color");
      element.dataset.codexOldBackgroundColorPriority = element.style.getPropertyPriority("background-color");
      element.style.setProperty("background", "transparent", "important");
      element.style.setProperty("background-color", "transparent", "important");
    }
  });
  const left = Math.max(0, info.bounds.x);
  const top = Math.max(0, info.bounds.y);
  const clip = { x: left, y: top, width: Math.min(viewport.width, info.bounds.x + info.bounds.width) - left, height: Math.min(viewport.height, info.bounds.y + info.bounds.height) - top };
  if (clip.width <= 0 || clip.height <= 0) return null;
  const buffer = await page.screenshot({ type: "png", clip, omitBackground: true });
  await handle.evaluate(() => {
    for (const element of document.querySelectorAll("[data-codex-old-opacity]")) {
      const value = element.dataset.codexOldOpacity || "";
      const priority = element.dataset.codexOldOpacityPriority || "";
      if (value) element.style.setProperty("opacity", value, priority); else element.style.removeProperty("opacity");
      delete element.dataset.codexOldOpacity;
      delete element.dataset.codexOldOpacityPriority;
    }
    for (const element of document.querySelectorAll("[data-codex-old-background]")) {
      const value = element.dataset.codexOldBackground || "";
      const priority = element.dataset.codexOldBackgroundPriority || "";
      const color = element.dataset.codexOldBackgroundColor || "";
      const colorPriority = element.dataset.codexOldBackgroundColorPriority || "";
      if (value) element.style.setProperty("background", value, priority); else element.style.removeProperty("background");
      if (color) element.style.setProperty("background-color", color, colorPriority); else element.style.removeProperty("background-color");
      delete element.dataset.codexOldBackground;
      delete element.dataset.codexOldBackgroundPriority;
      delete element.dataset.codexOldBackgroundColor;
      delete element.dataset.codexOldBackgroundColorPriority;
    }
  });
  await writeFile(outputFile, buffer);
  return { ...info, clip, bytes: buffer.length, sha256: sha256(buffer), dimensions: pngDimensions(buffer) };
}

async function run(config) {
  if (config.dryRun) {
    console.log(JSON.stringify(config, null, 2));
    return 0;
  }
  await prepareOutput(config);
  let playwright;
  try { playwright = await import("playwright"); } catch { throw new Error("Motion-settled capture requires playwright and an installed Chromium browser."); }
  const browser = await playwright.chromium.launch({ headless: true });
  const manifest = { schemaVersion: 1, requestedUrl: config.url, capturedAt: new Date().toISOString(), provider: "local-playwright-motion-settled", configuration: { ...config, output: undefined, dryRun: undefined, overwrite: undefined, allowPrivateNetwork: undefined }, captures: [], videoLayers: [], warnings: [], errors: [] };
  try {
    for (const viewportName of config.viewports) {
      const viewport = VIEWPORTS[viewportName];
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.deviceScaleFactor,
        ...(viewport.userAgent ? { userAgent: viewport.userAgent } : {}),
        ...(viewport.isMobile ? { isMobile: true, hasTouch: true } : {}),
      });
      const page = await context.newPage();
      const runtimeErrors = [];
      page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
      page.on("requestfailed", (request) => runtimeErrors.push(`requestfailed: ${request.url()} (${request.failure()?.errorText || "unknown"})`));
      try {
        await page.goto(config.url, { waitUntil: "domcontentloaded", timeout: config.timeout });
        const completion = await settle(page, config);
        if (completion.intro && !completion.intro.appeared) manifest.warnings.push(`${viewportName}: intro selector did not appear before timeout`);
        const readiness = await readyAndFreeze(page, config);
        const reference = await page.screenshot({ type: "png", fullPage: config.fullPage });
        const file = `${viewportName}.png`;
        await writeFile(path.join(config.output, file), reference);
        manifest.captures.push({ viewport: viewportName, viewportWidth: viewport.width, viewportHeight: viewport.height, deviceScaleFactor: viewport.deviceScaleFactor, file, ...pngDimensions(reference), bytes: reference.length, sha256: sha256(reference), finalUrl: page.url(), title: await page.title().catch(() => null), completion, readiness, runtimeErrors: runtimeErrors.slice(0, 20) });
        if (config.extractVideoSelector) {
          const handles = await page.locator(config.extractVideoSelector).elementHandles();
          let visibleOrder = 0;
          for (const handle of handles) {
            const layerFile = `${viewportName}-video-${visibleOrder}.png`;
            const layer = await isolateVideoFrame(page, handle, viewport, path.join(config.output, layerFile));
            if (!layer) continue;
            manifest.videoLayers.push({ viewport: viewportName, order: visibleOrder, file: layerFile, ...layer });
            visibleOrder += 1;
          }
        }
      } catch (error) {
        manifest.errors.push({ viewport: viewportName, message: error?.message || String(error), runtimeErrors: runtimeErrors.slice(0, 20) });
      } finally {
        await page.close();
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  manifest.completedAt = new Date().toISOString();
  manifest.status = manifest.captures.length === config.viewports.length ? "success" : manifest.captures.length ? "partial" : "error";
  const manifestFile = path.join(config.output, "capture.json");
  await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ output: config.output, manifest: manifestFile, status: manifest.status, captures: manifest.captures.length, videoLayers: manifest.videoLayers.length, warnings: manifest.warnings, errors: manifest.errors }, null, 2));
  return manifest.status === "success" ? 0 : 1;
}

async function main() {
  try {
    const config = normalize(parseArgs(process.argv.slice(2)));
    if (config.help) { console.log(HELP.trim()); return 0; }
    return await run(config);
  } catch (error) {
    console.error(`[web-page-capture/motion] ${error?.message || error}`);
    return 1;
  }
}

process.exitCode = await main();
