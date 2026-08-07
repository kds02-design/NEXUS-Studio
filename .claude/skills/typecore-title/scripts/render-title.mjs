// render-title.mjs — 브리프/프롬프트로 Gemini 이미지 API를 직접 호출해 타이틀 PNG를 저장한다.
// 외부 imagegen 툴 없이 스킬만으로 완결되도록, 프로젝트 .env 의 GEMINI_API_KEY 를 읽어 호출한다.
//
// 사용:
//   node scripts/render-title.mjs --brief <brief.json> --output title-body.png [--model ...] [--aspect 2.76:1] [--size 2K]
//   node scripts/render-title.mjs --prompt "..." --output title-light.png [--negative "..."]
//
// 반환: stdout 에 { output, model, mimeType, bytes, aspectRatio } JSON. 실패 시 비0 종료 + 사유.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const get = (name, fallback = '') => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// GEMINI_API_KEY 탐색: 환경변수 우선 → cwd 와 스크립트 상위 경로들의 .env 파싱. (값은 절대 출력하지 않음)
function findApiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  const candidates = [];
  let d = process.cwd();
  for (let i = 0; i < 6; i++) { candidates.push(path.join(d, '.env')); const up = path.dirname(d); if (up === d) break; d = up; }
  d = __dirname;
  for (let i = 0; i < 7; i++) { candidates.push(path.join(d, '.env')); const up = path.dirname(d); if (up === d) break; d = up; }
  for (const p of candidates) {
    try {
      if (!fs.existsSync(p)) continue;
      const line = fs.readFileSync(p, 'utf8').split(/\r?\n/).find((l) => /^\s*GEMINI_API_KEY\s*=/.test(l));
      if (line) {
        let v = line.replace(/^\s*GEMINI_API_KEY\s*=/, '').trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        if (v && v !== 'proxy') return v;
      }
    } catch { /* skip */ }
  }
  return null;
}

// Gemini image API 가 지원하는 비율 — 요청 비율(W:H 또는 소수)을 가장 가까운 값으로 매핑.
const SUPPORTED_RATIOS = [
  ['1:1', 1], ['2:3', 2 / 3], ['3:2', 3 / 2], ['3:4', 3 / 4], ['4:3', 4 / 3],
  ['4:5', 4 / 5], ['5:4', 5 / 4], ['9:16', 9 / 16], ['16:9', 16 / 9], ['21:9', 21 / 9],
];
function nearestAspect(input) {
  if (!input) return null;
  let r;
  if (input.includes(':')) { const [w, h] = input.split(':').map(Number); r = w / h; }
  else r = Number(input);
  if (!Number.isFinite(r) || r <= 0) return null;
  return SUPPORTED_RATIOS.reduce((best, cur) => (Math.abs(cur[1] - r) < Math.abs(best[1] - r) ? cur : best))[0];
}

async function main() {
  const output = get('output');
  if (!output) throw new Error('--output <path.png> is required');

  let prompt = get('prompt');
  let negative = get('negative');
  const briefPath = get('brief');
  let ratio = get('aspect') || get('ratio');
  if (briefPath) {
    const brief = JSON.parse(fs.readFileSync(briefPath, 'utf8'));
    if (!prompt) prompt = brief.prompt || '';
    if (!negative) negative = brief.negativePrompt || '';
    if (!ratio) ratio = brief.ratio || '';
  }
  if (!prompt) throw new Error('--prompt or --brief (with .prompt) is required');
  if (negative) prompt += `\n[NEGATIVE] Avoid: ${negative}`;

  const model = get('model', 'gemini-3-pro-image-preview');
  const isPro = model.includes('3-pro');
  const size = get('size', '2K');
  const aspectRatio = nearestAspect(ratio);

  const apiKey = findApiKey();

  const generationConfig = { responseModalities: ['IMAGE', 'TEXT'] };
  const imageConfig = {};
  if (aspectRatio) imageConfig.aspectRatio = aspectRatio;
  if (isPro && ['1K', '2K', '4K'].includes(size)) imageConfig.imageSize = size; // Flash 는 imageSize 미지원
  if (Object.keys(imageConfig).length) generationConfig.imageConfig = imageConfig;

  // --check: 유료 호출 없이 구성만 검증(키 값은 출력하지 않음).
  if (args.includes('--check')) {
    process.stdout.write(JSON.stringify({ check: true, apiKey: apiKey ? 'found' : 'MISSING', model, isPro, aspectRatio: aspectRatio || 'default', imageSize: imageConfig.imageSize || '(flash 1K)', output, promptChars: prompt.length }, null, 2) + '\n');
    return;
  }
  if (!apiKey) throw new Error('GEMINI_API_KEY 를 찾지 못했습니다 (환경변수 또는 프로젝트 .env 확인).');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig }),
  });
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json())?.error?.message || ''; } catch { /* */ }
    throw new Error(`Gemini image API ${res.status}${detail ? ` — ${detail}` : ''}`);
  }
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const img = parts.find((p) => p.inlineData?.mimeType?.startsWith('image/'));
  if (!img) {
    const reason = data.candidates?.[0]?.finishReason;
    const txt = parts.find((p) => p.text)?.text;
    const block = data.promptFeedback?.blockReason;
    throw new Error(`이미지 응답 없음${[reason && `finishReason:${reason}`, block && `blocked:${block}`, txt && `"${txt.slice(0, 200)}"`].filter(Boolean).join(' / ') ? ` — ${[reason && `finishReason:${reason}`, block && `blocked:${block}`, txt && `"${txt.slice(0, 200)}"`].filter(Boolean).join(' / ')}` : ''}`);
  }
  const buf = Buffer.from(img.inlineData.data, 'base64');
  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  fs.writeFileSync(output, buf);
  process.stdout.write(JSON.stringify({ output, model, mimeType: img.inlineData.mimeType, bytes: buf.length, aspectRatio: aspectRatio || 'default' }, null, 2) + '\n');
}

main().catch((e) => { process.stderr.write(`[render-title] ${e?.message || e}\n`); process.exit(1); });
