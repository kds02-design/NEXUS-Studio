import fs from 'node:fs/promises';
import path from 'node:path';

function arg(name, fallback = '') {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const input = path.resolve(arg('input'));
const output = path.resolve(arg('output'));
const endpoint = arg('endpoint', process.env.NEXUS_RENDER_ENDPOINT || 'https://nexus-studio-five-plum.vercel.app/api/nexus-background-enhance');
const token = process.env.NEXUS_CODEX_RENDER_TOKEN;
if (!input || !output) throw new Error('--input and --output are required');
if (!token) throw new Error('NEXUS_CODEX_RENDER_TOKEN is required');

const extension = path.extname(input).toLowerCase();
const mimeType = extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : 'image/jpeg';
const data = await fs.readFile(input);
const response = await fetch(endpoint, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    image: `data:${mimeType};base64,${data.toString('base64')}`,
    engine: arg('engine', 'auto'),
    quality: arg('quality', 'preview'),
    strength: arg('strength', 'standard'),
    concept: arg('concept', ''),
    forceGenerative: arg('force-generative', 'false') === 'true',
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

