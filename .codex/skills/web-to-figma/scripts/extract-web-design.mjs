import { chromium } from 'playwright';
import { lookup } from 'node:dns/promises';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const presets = {
  desktop: {
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
  mobile: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
  },
};

function parseArgs(argv) {
  const options = {
    viewports: ['desktop', 'mobile'],
    waitMs: 2000,
    maxNodes: 2500,
    overwrite: false,
    dryRun: false,
    allowPrivateNetwork: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`${token} requires a value`);
      index += 1;
      return value;
    };
    if (token === '--url') options.url = next();
    else if (token === '--output') options.output = next();
    else if (token === '--viewports') options.viewports = next().split(',').map((value) => value.trim()).filter(Boolean);
    else if (token === '--wait-ms') options.waitMs = Number(next());
    else if (token === '--max-nodes') options.maxNodes = Number(next());
    else if (token === '--selector') options.selector = next();
    else if (token === '--overwrite') options.overwrite = true;
    else if (token === '--dry-run') options.dryRun = true;
    else if (token === '--allow-private-network') options.allowPrivateNetwork = true;
    else if (token === '--help' || token === '-h') options.help = true;
    else throw new Error(`unknown option: ${token}`);
  }
  return options;
}

function usage() {
  return `Usage:
  node scripts/extract-web-design.mjs --url <https://...> --output <directory> [options]

Options:
  --viewports desktop,mobile  Presets to extract (default: desktop,mobile)
  --selector <css>            Limit extraction and screenshot to one element
  --wait-ms <number>          Post-load settling wait (default: 2000)
  --max-nodes <number>        Visible-node cap per viewport (default: 2500)
  --overwrite                 Replace files in a non-empty output directory
  --allow-private-network     Allow an explicitly user-owned private development URL
  --dry-run                   Validate without network or file writes
  --help                      Show this help`;
}

function isPrivateAddress(address) {
  const value = address.toLowerCase();
  if (value === '::1' || value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe80:')) return true;
  const parts = value.split('.').map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false;
  return parts[0] === 10
    || parts[0] === 127
    || (parts[0] === 169 && parts[1] === 254)
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168);
}

async function validateTarget(rawUrl, allowPrivateNetwork, resolveDns = true) {
  const url = new URL(rawUrl);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('only public HTTP(S) URLs are supported');
  const hostname = url.hostname.toLowerCase();
  const obviousPrivate = hostname === 'localhost' || hostname.endsWith('.local') || isPrivateAddress(hostname);
  if (obviousPrivate && !allowPrivateNetwork) throw new Error('private, loopback, and local targets require --allow-private-network');
  if (resolveDns && !allowPrivateNetwork) {
    const addresses = await lookup(hostname, { all: true });
    if (addresses.some((entry) => isPrivateAddress(entry.address))) throw new Error('target resolves to a private or link-local address');
  }
  return url;
}

async function assertOutput(output, overwrite) {
  try {
    const info = await stat(output);
    if (!info.isDirectory()) throw new Error('output exists and is not a directory');
    const entries = await readdir(output);
    if (entries.length > 0 && !overwrite) throw new Error('output directory is not empty; pass --overwrite to replace capture files');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function warmLazyContent(page, transformDriven) {
  if (transformDriven) return;
  await page.evaluate(async () => {
    const distance = Math.max(500, Math.floor(innerHeight * 0.8));
    const limit = Math.min(document.documentElement.scrollHeight, 30000);
    for (let y = 0; y < limit; y += distance) {
      scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    scrollTo(0, 0);
  });
  await page.waitForTimeout(300);
}

async function extractProfile(browser, sourceUrl, output, name, options) {
  const preset = presets[name];
  const context = await browser.newContext({
    ...preset,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(options.waitMs);
  await page.evaluate(() => document.fonts?.ready);

  if (options.selector) await page.locator(options.selector).first().waitFor({ state: 'visible' });

  const detection = await page.evaluate(() => {
    const htmlStyle = getComputedStyle(document.documentElement);
    const bodyStyle = getComputedStyle(document.body);
    const viewportSections = [...document.querySelectorAll('section, [id^="section-"], [class*="section"]')]
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return ['absolute', 'fixed'].includes(style.position)
          && rect.width >= innerWidth * 0.85
          && rect.height >= innerHeight * 0.75;
      }).length;
    const fixedBody = bodyStyle.position === 'fixed' || ['hidden', 'clip'].includes(bodyStyle.overflowY);
    const transformDriven = fixedBody && document.documentElement.scrollHeight <= innerHeight * 1.6 && viewportSections >= 2;
    return {
      transformDriven,
      fixedBody,
      viewportSections,
      htmlOverflowY: htmlStyle.overflowY,
      bodyOverflowY: bodyStyle.overflowY,
    };
  });

  await warmLazyContent(page, detection.transformDriven);

  const rootSelector = options.selector ?? 'body';
  const extracted = await page.evaluate(({ rootSelector: selector, maxNodes }) => {
    const root = document.querySelector(selector);
    if (!root) throw new Error(`selector not found: ${selector}`);

    const absoluteUrl = (value) => {
      if (!value) return null;
      try { return new URL(value, document.baseURI).href; } catch { return value; }
    };
    const cssUrls = (value) => {
      if (!value || value === 'none') return [];
      return [...value.matchAll(/url\(["']?(.*?)["']?\)/g)].map((match) => absoluteUrl(match[1]));
    };
    const directText = (element) => [...element.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent ?? '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    const selectorFor = (element) => {
      const parts = [];
      let current = element;
      while (current && current.nodeType === Node.ELEMENT_NODE && parts.length < 6) {
        let part = current.tagName.toLowerCase();
        if (current.id) {
          part += `#${CSS.escape(current.id)}`;
          parts.unshift(part);
          break;
        }
        const classes = [...current.classList].slice(0, 2).map((value) => `.${CSS.escape(value)}`).join('');
        if (classes) part += classes;
        else if (current.parentElement) {
          const siblings = [...current.parentElement.children].filter((child) => child.tagName === current.tagName);
          if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
        }
        parts.unshift(part);
        current = current.parentElement;
      }
      return parts.join(' > ');
    };
    const pseudoData = (element, pseudo) => {
      const style = getComputedStyle(element, pseudo);
      const content = style.content && !['none', 'normal'].includes(style.content) ? style.content : null;
      const backgrounds = cssUrls(style.backgroundImage);
      if (!content && backgrounds.length === 0) return null;
      return {
        pseudo,
        content,
        backgroundImage: style.backgroundImage,
        color: style.color,
        display: style.display,
        position: style.position,
      };
    };
    const classify = (element, text, style) => {
      const tag = element.tagName.toLowerCase();
      if (tag === 'svg') return 'vector';
      if (tag === 'canvas' || tag === 'video') return 'raster-fallback';
      if (tag === 'img' || style.backgroundImage !== 'none') return text ? 'hybrid' : 'image';
      if (text) return 'text';
      return 'container';
    };

    const assets = [];
    const nodes = [];
    const warnings = new Set();
    const all = [root, ...root.querySelectorAll('*')];
    for (const element of all) {
      if (nodes.length >= maxNodes) {
        warnings.add(`visible node inventory truncated at ${maxNodes}`);
        break;
      }
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const visible = rect.width > 0 && rect.height > 0
        && style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number.parseFloat(style.opacity || '1') > 0;
      if (!visible) continue;

      const tag = element.tagName.toLowerCase();
      const text = directText(element);
      const backgroundUrls = cssUrls(style.backgroundImage);
      let assetUrl = null;
      if (tag === 'img') assetUrl = absoluteUrl(element.currentSrc || element.src);
      else if (tag === 'video') assetUrl = absoluteUrl(element.poster || element.currentSrc || element.src);
      else if (backgroundUrls.length) assetUrl = backgroundUrls[0];
      if (assetUrl) assets.push({ type: tag === 'video' ? 'video' : tag === 'img' ? 'image' : 'background', url: assetUrl });
      for (const url of backgroundUrls.slice(1)) assets.push({ type: 'background', url });
      if (tag === 'canvas') warnings.add('Canvas content requires a raster fallback');
      if (tag === 'video') warnings.add('Video is represented by a poster or settled frame');
      if (style.filter !== 'none' || style.backdropFilter !== 'none') warnings.add('CSS filters may require raster fallback');

      const meaningful = text || assetUrl || ['svg', 'canvas', 'video', 'img'].includes(tag)
        || style.backgroundColor !== 'rgba(0, 0, 0, 0)'
        || style.borderTopWidth !== '0px'
        || style.boxShadow !== 'none';
      if (!meaningful) continue;

      const before = pseudoData(element, '::before');
      const after = pseudoData(element, '::after');
      nodes.push({
        id: `n${nodes.length + 1}`,
        selector: selectorFor(element),
        tag,
        role: element.getAttribute('role'),
        kind: classify(element, text, style),
        bounds: {
          x: Math.round((rect.x + scrollX) * 100) / 100,
          y: Math.round((rect.y + scrollY) * 100) / 100,
          width: Math.round(rect.width * 100) / 100,
          height: Math.round(rect.height * 100) / 100,
        },
        text: text || null,
        assetUrl,
        styles: {
          display: style.display,
          position: style.position,
          zIndex: style.zIndex,
          overflow: style.overflow,
          opacity: style.opacity,
          transform: style.transform,
          color: style.color,
          backgroundColor: style.backgroundColor,
          backgroundImage: style.backgroundImage,
          backgroundSize: style.backgroundSize,
          backgroundPosition: style.backgroundPosition,
          border: style.border,
          borderRadius: style.borderRadius,
          boxShadow: style.boxShadow,
          filter: style.filter,
          backdropFilter: style.backdropFilter,
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          fontStyle: style.fontStyle,
          lineHeight: style.lineHeight,
          letterSpacing: style.letterSpacing,
          textAlign: style.textAlign,
          objectFit: style.objectFit,
          objectPosition: style.objectPosition,
        },
        pseudo: [before, after].filter(Boolean),
      });
    }

    const dedupedAssets = [...new Map(assets.map((asset) => [`${asset.type}:${asset.url}`, asset])).values()];
    const fonts = [...new Set(nodes.map((node) => node.styles.fontFamily).filter(Boolean))];
    return {
      finalUrl: location.href,
      document: {
        title: document.title,
        lang: document.documentElement.lang || null,
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      },
      fonts,
      assets: dedupedAssets,
      nodes,
      warnings: [...warnings],
    };
  }, { rootSelector, maxNodes: options.maxNodes });

  const screenshotPath = path.join(output, `${name}.png`);
  const locator = options.selector ? page.locator(options.selector).first() : null;
  if (locator) await locator.screenshot({ path: screenshotPath, animations: 'disabled' });
  else await page.screenshot({ path: screenshotPath, fullPage: !detection.transformDriven, animations: 'disabled' });
  const screenshot = await readFile(screenshotPath);

  const result = {
    name,
    viewport: preset.viewport,
    deviceScaleFactor: preset.deviceScaleFactor,
    screenshot: {
      file: path.basename(screenshotPath),
      bytes: screenshot.length,
      sha256: sha256(screenshot),
      mode: options.selector ? 'element' : detection.transformDriven ? 'viewport' : 'full-page',
    },
    document: { ...extracted.document, ...detection },
    fonts: extracted.fonts,
    assets: extracted.assets,
    nodes: extracted.nodes,
    warnings: [...extracted.warnings],
  };
  if (detection.transformDriven) result.warnings.push('Transform-driven full-screen page detected; capture stable section states separately with web-page-capture');
  await context.close();
  return { result, finalUrl: extracted.finalUrl };
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  console.log(usage());
  process.exit(0);
}
if (!options.url || !options.output) throw new Error('--url and --output are required');
if (!Number.isFinite(options.waitMs) || options.waitMs < 0 || options.waitMs > 60000) throw new Error('--wait-ms must be between 0 and 60000');
if (!Number.isInteger(options.maxNodes) || options.maxNodes < 1 || options.maxNodes > 10000) throw new Error('--max-nodes must be an integer between 1 and 10000');
if (options.viewports.some((name) => !presets[name])) throw new Error(`unknown viewport preset; use ${Object.keys(presets).join(',')}`);

const sourceUrl = await validateTarget(options.url, options.allowPrivateNetwork, !options.dryRun);
const output = path.resolve(options.output);
if (options.dryRun) {
  console.log(JSON.stringify({ valid: true, url: sourceUrl.href, output, options: { ...options, url: undefined, output: undefined } }, null, 2));
  process.exit(0);
}

await assertOutput(output, options.overwrite);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const profiles = [];
let finalUrl = sourceUrl.href;
try {
  for (const name of options.viewports) {
    const extracted = await extractProfile(browser, sourceUrl.href, output, name, options);
    profiles.push(extracted.result);
    finalUrl = extracted.finalUrl;
  }
} finally {
  await browser.close();
}

const manifest = {
  capturedAt: new Date().toISOString(),
  sourceUrl: sourceUrl.href,
  finalUrl,
  profiles,
  warnings: [...new Set(profiles.flatMap((profile) => profile.warnings))],
};
await writeFile(path.join(output, 'extraction.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  output,
  profiles: profiles.map((profile) => ({
    name: profile.name,
    nodes: profile.nodes.length,
    assets: profile.assets.length,
    screenshot: profile.screenshot,
    warnings: profile.warnings,
  })),
}, null, 2));
