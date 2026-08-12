import crypto from 'node:crypto';
import { listNexusAppAdapters, runNexusApp } from '../src/server/nexus/appRunner.js';

export const config = { maxDuration: 120 };

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && aa.length > 0 && crypto.timingSafeEqual(aa, bb);
}

export default async function handler(req, res) {
  const expected = process.env.NEXUS_CODEX_RENDER_TOKEN;
  const actual = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!expected || !safeEqual(actual, expected)) return res.status(401).json({ error: { message: 'Unauthorized' } });
  if (req.method === 'GET') return res.status(200).json({ ok: true, service: 'codex-app-run', adapters: listNexusAppAdapters() });
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const result = await runNexusApp(body);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: { message: error?.message || String(error) } });
  }
}
