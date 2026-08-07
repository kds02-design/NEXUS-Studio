import { createCanvas, loadImage } from '@napi-rs/canvas';
import { Buffer } from 'node:buffer';

export const ENGINES = new Set(['local', 'google', 'auto']);
export const STRENGTHS = new Set(['subtle', 'standard', 'dramatic']);

const MODEL_BY_QUALITY = {
  fast: 'gemini-3.1-flash-image-preview',
  final: 'gemini-3-pro-image-preview',
};

const STRENGTH_VALUE = { subtle: 0.28, standard: 0.46, dramatic: 0.64 };

export function buildBackgroundPrompt({ concept = '', strength = 'standard', options = {} } = {}) {
  const enabled = Object.entries(options)
    .filter(([, value]) => value === true)
    .map(([key]) => key)
    .join(', ');
  return `Enhance this existing game key-visual background. Preserve the exact composition, crop, camera, perspective, subject identity, silhouettes, object positions and edge fades. Do not add, remove, redraw or move any character, text, logo or scene object. Improve only lighting, atmosphere, color grading, texture clarity and depth separation. Keep one coherent light direction and stable exposure. Concept: ${concept || 'preserve the source art direction'}. Strength: ${strength}. Requested finishing: ${enabled || 'balanced cinematic polish'}. Return one finished image with the same aspect ratio. No new text, no outpainting, no layout changes.`;
}

function parseDataUrl(dataUrl) {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!match) throw new Error('image must be a PNG, JPEG, or WebP data URL');
  return { mimeType: match[1], data: match[2] };
}

export async function renderLocalBackground(dataUrl, strength = 'standard') {
  const { data } = parseDataUrl(dataUrl);
  const input = Buffer.from(data, 'base64');
  const image = await loadImage(input);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  const amount = STRENGTH_VALUE[strength] ?? STRENGTH_VALUE.standard;

  ctx.drawImage(image, 0, 0);
  ctx.globalCompositeOperation = 'soft-light';
  const grade = ctx.createLinearGradient(0, 0, image.width, image.height);
  grade.addColorStop(0, `rgba(255,196,112,${amount * 0.55})`);
  grade.addColorStop(0.48, 'rgba(44,82,61,0.04)');
  grade.addColorStop(1, `rgba(3,18,22,${amount * 0.82})`);
  ctx.fillStyle = grade;
  ctx.fillRect(0, 0, image.width, image.height);

  ctx.globalCompositeOperation = 'screen';
  const bloom = ctx.createRadialGradient(image.width * 0.72, image.height * 0.18, 0, image.width * 0.72, image.height * 0.18, image.width * 0.58);
  bloom.addColorStop(0, `rgba(255,224,164,${amount * 0.3})`);
  bloom.addColorStop(0.38, `rgba(220,246,207,${amount * 0.1})`);
  bloom.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, image.width, image.height);

  ctx.globalCompositeOperation = 'multiply';
  const vignette = ctx.createRadialGradient(image.width / 2, image.height / 2, image.width * 0.15, image.width / 2, image.height / 2, image.width * 0.72);
  vignette.addColorStop(0.58, 'rgba(255,255,255,0)');
  vignette.addColorStop(1, `rgba(3,12,12,${amount * 0.5})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, image.width, image.height);

  return `data:image/png;base64,${canvas.toBuffer('image/png').toString('base64')}`;
}

export function chooseEngine(engine, { quality = 'preview', forceGenerative = false } = {}) {
  if (!ENGINES.has(engine)) throw new Error('engine must be local, google, or auto');
  if (engine !== 'auto') return engine;
  return forceGenerative || quality === 'final' ? 'google' : 'local';
}

export async function renderGoogleBackground(dataUrl, request, apiKey, fetchImpl = fetch) {
  const { mimeType, data } = parseDataUrl(dataUrl);
  const quality = request.quality === 'final' ? 'final' : 'fast';
  const model = request.model || MODEL_BY_QUALITY[quality];
  const generationConfig = { responseModalities: ['IMAGE', 'TEXT'] };
  if (model.includes('3-pro')) generationConfig.imageConfig = { imageSize: request.imageSize || '2K' };
  const body = {
    contents: [{ parts: [{ inlineData: { mimeType, data } }, { text: buildBackgroundPrompt(request) }] }],
    generationConfig,
  };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetchImpl(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json?.error?.message || `Google image API ${response.status}`);
  const part = json.candidates?.[0]?.content?.parts?.find((item) => item.inlineData?.mimeType?.startsWith('image/'));
  if (!part) throw new Error('Google image response did not contain an image');
  return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
}
