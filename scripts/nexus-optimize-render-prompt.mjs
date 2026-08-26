#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const opt = {};
for (let i = 0; i < argv.length; i += 2) opt[argv[i].replace(/^--/, '')] = argv[i + 1];
for (const key of ['input', 'output']) if (!opt[key]) throw new Error(`Missing --${key}`);

let fileEnv = {};
if (fs.existsSync(opt.env || '.env')) {
  fileEnv = Object.fromEntries(fs.readFileSync(opt.env || '.env', 'utf8')
    .split(/\r?\n/)
    .filter(line => line && !line.trim().startsWith('#') && line.includes('='))
    .map(line => {
      const index = line.indexOf('=');
      return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')];
    }));
}

const key = process.env.GEMINI_API_KEY || fileEnv.GEMINI_API_KEY;
const imageProxyUrl = process.env.NEXUS_IMAGE_PROXY_URL || fileEnv.NEXUS_IMAGE_PROXY_URL;
const proxyToken = process.env.NEXUS_CODEX_RENDER_TOKEN || fileEnv.NEXUS_CODEX_RENDER_TOKEN;
const hasDirectKey = Boolean(key && key.startsWith('AIza'));
if (!hasDirectKey && !imageProxyUrl) throw new Error('A valid GEMINI_API_KEY or Nexus proxy URL is required');

const basePrompt = fs.readFileSync(path.resolve(opt.input), 'utf8');
const systemPrompt = `You are the Render Matrix AI optimizer for high-end game typography. Improve the supplied NanoBanana image-edit prompt before final Pro rendering.

HIGHEST PRIORITY: preserve the exact input Korean glyph silhouettes, counters, spacing, line count, scale, framing, and canvas placement. Creative changes are limited to material, surface finish, lighting, and restrained FX.

Optimization rules:
1. Keep every shape-lock instruction and strengthen it when useful.
2. Keep the entire title fully inside the frame with the same safe margins. No zoom or crop.
3. Keep minimal projection depth and straight-on telephoto framing. Do not escalate bevel, emboss, extrusion, or perspective.
4. Render the composition exactly once. No repeated or extra text.
5. Keep the pure-black isolated background. Never create a plaque, backing slab, signboard, emblem, scenery, or full-frame material.
6. Convert vague material language into physically coherent PBR surface, controlled key/fill/rim lighting, clean value separation, and production-grade edge highlights.
7. Preserve all negative constraints. Do not summarize them away.
8. Return only the optimized English prompt, with no commentary or Markdown.`;

const model = opt.model || 'gemini-2.5-flash';
const googleTarget = `/v1beta/models/${encodeURIComponent(model)}:generateContent`;
const url = hasDirectKey
  ? `https://generativelanguage.googleapis.com${googleTarget}?key=${encodeURIComponent(key)}`
  : (() => {
      const proxy = new URL(imageProxyUrl);
      proxy.pathname = '/api/gemini';
      proxy.search = `?target=${encodeURIComponent(googleTarget)}`;
      return proxy.toString();
    })();
const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(!hasDirectKey && proxyToken ? { Authorization: `Bearer ${proxyToken}` } : {}),
  },
  body: JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: basePrompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { temperature: 0.35 },
  }),
});
const json = await response.json().catch(() => ({}));
if (!response.ok) throw new Error(json?.error?.message || `Gemini optimizer ${response.status}`);
const optimized = json.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
if (!optimized) throw new Error('Gemini optimizer returned no prompt');

const output = path.resolve(opt.output);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, optimized);
console.log(JSON.stringify({ output, model, chars: optimized.length }, null, 2));
