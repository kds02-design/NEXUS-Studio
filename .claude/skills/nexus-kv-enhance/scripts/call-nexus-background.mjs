import fs from 'node:fs/promises';
import path from 'node:path';

const readArg = (name, fallback = '') => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
};

const inputArg = readArg('input');
const outputArg = readArg('output');
if (!inputArg || !outputArg) throw new Error('--input and --output are required');
let fileEnv = {};
const envArg = readArg('env');
if (envArg) {
  const envText = await fs.readFile(path.resolve(envArg), 'utf8');
  fileEnv = Object.fromEntries(envText.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#') && line.includes('=')).map((line) => {
    const index = line.indexOf('=');
    return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')];
  }));
}
const token = process.env.NEXUS_CODEX_RENDER_TOKEN || fileEnv.NEXUS_CODEX_RENDER_TOKEN;
if (!token) throw new Error('NEXUS_CODEX_RENDER_TOKEN is required');

const input = path.resolve(inputArg);
const output = path.resolve(outputArg);
const apiBase = String(process.env.NEXUS_API_BASE_URL || fileEnv.NEXUS_API_BASE_URL || '').replace(/\/$/, '');
const endpoint = readArg('endpoint', process.env.NEXUS_RENDER_ENDPOINT || fileEnv.NEXUS_RENDER_ENDPOINT || (apiBase ? `${apiBase}/api/nexus-background-enhance` : 'https://nexus-studio-five-plum.vercel.app/api/nexus-background-enhance'));
const extension = path.extname(input).toLowerCase();
const mimeType = extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : 'image/jpeg';
const bytes = await fs.readFile(input);
const response = await fetch(endpoint, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    image: `data:${mimeType};base64,${bytes.toString('base64')}`,
    engine: readArg('engine', 'google'),
    quality: readArg('quality', 'final'),
    strength: readArg('strength', 'standard'),
    concept: readArg('concept', ''),
    forceGenerative: readArg('force-generative', 'false') === 'true',
    options: { dramaticLight: true, atmosphere: true, particles: true, depthSeparation: true, preserveComposition: true },
  }),
});
const json = await response.json();
if (!response.ok || !json.dataUrl) throw new Error(json?.error?.message || `Nexus API ${response.status}`);
const match = /^data:([^;]+);base64,(.+)$/.exec(json.dataUrl);
if (!match) throw new Error('API returned an invalid image');
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, Buffer.from(match[2], 'base64'));
process.stdout.write(JSON.stringify({ ok: true, engine: json.engine, output }, null, 2));
