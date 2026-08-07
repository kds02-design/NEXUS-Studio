import crypto from 'node:crypto';

export const config = { maxDuration: 60 };

const GOOGLE_ORIGIN = 'https://generativelanguage.googleapis.com';
const ALLOWED_MODELS = new Set([
  'gemini-3-pro-image-preview',
  'gemini-3.1-flash-image-preview',
]);
const ALLOWED_SIZES = new Set(['1K', '2K', '4K']);
const ALLOWED_RATIOS = new Set(['1:1','2:3','3:2','3:4','4:3','4:5','5:4','9:16','16:9','21:9']);
const MAX_PROMPT_CHARS = 30000;
const MAX_IMAGE_BASE64_CHARS = 4_000_000;

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && aa.length > 0 && crypto.timingSafeEqual(aa, bb);
}

function unauthorized(res) {
  res.status(401).json({ error: { message: 'Unauthorized' } });
}

export default async function handler(req, res) {
  const renderToken = process.env.NEXUS_CODEX_RENDER_TOKEN;
  const auth = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!renderToken || !safeEqual(auth, renderToken)) return unauthorized(res);

  if (req.method === 'GET') {
    res.status(200).json({ ok: true, service: 'codex-imagen', models: [...ALLOWED_MODELS] });
    return;
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: { message: 'Method not allowed' } });
    return;
  }

  const key = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_BRANDWEB;
  if (!key) {
    res.status(500).json({ error: { message: 'Server GEMINI_API_KEY is not configured' } });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const model = String(body.model || 'gemini-3-pro-image-preview');
  const prompt = String(body.prompt || '');
  const mimeType = String(body.image?.mimeType || '');
  const data = String(body.image?.data || '');
  const imageSize = body.imageConfig?.imageSize ? String(body.imageConfig.imageSize) : undefined;
  const aspectRatio = body.imageConfig?.aspectRatio ? String(body.imageConfig.aspectRatio) : undefined;

  if (!ALLOWED_MODELS.has(model)) return res.status(400).json({ error: { message: 'Model not allowed' } });
  if (!prompt || prompt.length > MAX_PROMPT_CHARS) return res.status(400).json({ error: { message: 'Invalid prompt length' } });
  if (!['image/png','image/jpeg','image/webp'].includes(mimeType)) return res.status(400).json({ error: { message: 'Unsupported image type' } });
  if (!data || data.length > MAX_IMAGE_BASE64_CHARS) return res.status(413).json({ error: { message: 'Reference image too large' } });
  if (imageSize && !ALLOWED_SIZES.has(imageSize)) return res.status(400).json({ error: { message: 'Invalid image size' } });
  if (aspectRatio && !ALLOWED_RATIOS.has(aspectRatio)) return res.status(400).json({ error: { message: 'Invalid aspect ratio' } });

  const generationConfig = { responseModalities: ['IMAGE', 'TEXT'], imageConfig: {} };
  if (imageSize && model.includes('3-pro')) generationConfig.imageConfig.imageSize = imageSize;
  if (aspectRatio) generationConfig.imageConfig.aspectRatio = aspectRatio;
  if (!Object.keys(generationConfig.imageConfig).length) delete generationConfig.imageConfig;

  const googleBody = {
    contents: [{ parts: [{ inlineData: { mimeType, data } }, { text: prompt }] }],
    generationConfig,
  };
  const url = `${GOOGLE_ORIGIN}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  try {
    const google = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(googleBody) });
    const json = await google.json().catch(() => ({}));
    res.status(google.status).json(json);
  } catch (error) {
    res.status(502).json({ error: { message: `Google image proxy failed: ${error?.message || error}` } });
  }
}

