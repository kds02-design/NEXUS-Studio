import crypto from 'node:crypto';
import {
  STRENGTHS,
  chooseEngine,
  renderGoogleBackground,
  renderLocalBackground,
} from '../src/server/nexus/backgroundEnhancer.js';

export const config = { maxDuration: 60 };
const MAX_BODY_IMAGE_CHARS = 12_000_000;

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right);
}

export default async function handler(req, res) {
  const expected = process.env.NEXUS_CODEX_RENDER_TOKEN;
  const supplied = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!expected || !safeEqual(expected, supplied)) return res.status(401).json({ error: { message: 'Unauthorized' } });

  if (req.method === 'GET') return res.status(200).json({ ok: true, service: 'nexus-background-enhance', engines: ['local', 'google', 'auto'] });
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const image = String(body.image || '');
    if (!image || image.length > MAX_BODY_IMAGE_CHARS) return res.status(413).json({ error: { message: 'Image is missing or too large' } });
    const strength = STRENGTHS.has(body.strength) ? body.strength : 'standard';
    const requestedEngine = body.engine || 'auto';
    const engine = chooseEngine(requestedEngine, body);
    const request = { ...body, strength };

    let dataUrl;
    if (engine === 'google') {
      const key = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_BRANDWEB;
      if (!key) return res.status(503).json({ error: { message: 'Google rendering is unavailable: GEMINI_API_KEY is not configured' } });
      dataUrl = await renderGoogleBackground(image, request, key);
    } else {
      dataUrl = await renderLocalBackground(image, strength);
    }

    return res.status(200).json({ ok: true, engine, requestedEngine, strength, dataUrl });
  } catch (error) {
    return res.status(400).json({ error: { message: error?.message || String(error) } });
  }
}

