#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2), opt = {};
for (let i = 0; i < argv.length; i += 2) opt[argv[i].replace(/^--/, '')] = argv[i + 1];
const envFile = opt.env || '.env';
let fileEnv = {};
if (fs.existsSync(envFile)) {
  fileEnv = Object.fromEntries(fs.readFileSync(envFile, 'utf8').split(/\r?\n/)
    .filter(x => x && !x.trim().startsWith('#') && x.includes('='))
    .map(x => { const i = x.indexOf('='); return [x.slice(0, i).trim(), x.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')]; }));
}
const proxyUrl = process.env.NEXUS_IMAGE_PROXY_URL || fileEnv.NEXUS_IMAGE_PROXY_URL;
const proxyToken = process.env.NEXUS_CODEX_RENDER_TOKEN || fileEnv.NEXUS_CODEX_RENDER_TOKEN;
if (!proxyUrl || !proxyToken) throw new Error('Protected Nexus image proxy is not configured');
for (const k of ['prompt', 'output']) if (!opt[k]) throw new Error(`Missing --${k}`);
const prompt = fs.readFileSync(path.resolve(opt.prompt), 'utf8');
const model = opt.model || 'gemini-3-pro-image-preview';
const imageConfig = { aspectRatio: opt.aspect || '16:9', imageSize: opt.size || '4K' };
const image = opt.input ? (() => {
  const input = path.resolve(opt.input);
  const ext = path.extname(input).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  return { mimeType, data: fs.readFileSync(input).toString('base64') };
})() : undefined;
const res = await fetch(proxyUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${proxyToken}` },
  body: JSON.stringify({ model, prompt, ...(image ? { image } : {}), imageConfig }),
});
const json = await res.json().catch(() => ({}));
if (!res.ok) throw new Error(json?.error?.message || `Google image API ${res.status}`);
const part = json.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.mimeType?.startsWith('image/'));
if (!part) throw new Error('Google image API returned no image');
const output = path.resolve(opt.output);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, Buffer.from(part.inlineData.data, 'base64'));
console.log(JSON.stringify({ output, model, mimeType: part.inlineData.mimeType }, null, 2));
