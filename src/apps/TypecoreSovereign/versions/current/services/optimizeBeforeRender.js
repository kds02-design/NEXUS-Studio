const CACHE_PREFIX = 'typecore-sovereign:render-opt:v1:';

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function buildRenderOptimizationKey({ basePrompt, targetModel, locks }) {
  return CACHE_PREFIX + hashString(JSON.stringify({ basePrompt, targetModel, locks }));
}

function requiredLockBlock(locks) {
  const exactText = String(locks?.exactText || '').trim();
  const lines = Array.isArray(locks?.lines) && locks.lines.length
    ? locks.lines
    : (exactText ? exactText.split('\n') : []);
  return `[IMMUTABLE TYPECORE LOCKS — HIGHEST PRIORITY]
${exactText ? `- Exact text: "${exactText}"\n- Exact rows: ${JSON.stringify(lines)}\n- Row count: ${lines.length}` : '- Edit mode: preserve every glyph and row from the supplied reference image; do not infer replacement text.'}
- Aspect ratio: ${locks?.aspectRatio || 'source setting'}
- Typography occupancy: ${locks?.occupancy || 'source setting'}
- Background: uniform solid pure black #000000
- Lettering: solid opaque white, flat 2D
- Never add, remove, translate, duplicate, romanize, or rearrange glyphs.
- Never add transparency, checkerboard, color, material, lighting, depth, bevel, shadow, glow, scenery, or unrelated graphics.`;
}

export function validateAndRepairOptimizedPrompt(prompt, locks) {
  const source = String(prompt || '').trim();
  if (!source) throw new Error('AI 최적화 결과가 비어 있습니다.');
  const exactText = String(locks?.exactText || '').trim();
  const hasText = !exactText || source.includes(exactText);
  const hasBlack = /#000000|pure black|solid black/i.test(source);
  const hasFlat = /flat 2d|flat typography|2d flat/i.test(source);
  const lockBlock = requiredLockBlock(locks);
  const repaired = [lockBlock, source].join('\n\n');
  return {
    prompt: repaired,
    repaired: !(hasText && hasBlack && hasFlat),
    checks: { exactText: hasText, pureBlack: hasBlack, flat2D: hasFlat },
  };
}

export async function optimizeBeforeRender({ apiKey, basePrompt, targetModel, locks, cache }) {
  if (!apiKey) throw new Error('Gemini API 키가 없어 렌더 전 최적화를 실행할 수 없습니다.');
  const key = buildRenderOptimizationKey({ basePrompt, targetModel, locks });
  const memoryHit = cache?.get?.(key);
  if (memoryHit) return { ...memoryHit, cacheHit: true };

  try {
    const persisted = window.localStorage.getItem(key);
    if (persisted) {
      const parsed = JSON.parse(persisted);
      cache?.set?.(key, parsed);
      return { ...parsed, cacheHit: true };
    }
  } catch { /* localStorage unavailable — memory cache still works */ }

  const systemInstruction = `You are the final prompt optimizer immediately before a Google image render.
Preserve every immutable Typecore setting. Do not redesign or invent a new direction.
Only remove redundancy, resolve contradictions in favor of immutable locks, and rewrite the prompt for the target image model.
Return JSON with exactly one string field named "optimizedPrompt".`;
  const lockBlock = requiredLockBlock(locks);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: `Target image model: ${targetModel}\n\n${lockBlock}\n\nBase prompt:\n${basePrompt}` }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
    }),
  });
  if (!response.ok) throw new Error(`렌더 전 AI 최적화 실패 (${response.status})`);
  const data = await response.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error('렌더 전 AI 최적화가 빈 응답을 반환했습니다.');
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error('렌더 전 AI 최적화 응답을 해석하지 못했습니다.'); }
  const validated = validateAndRepairOptimizedPrompt(parsed?.optimizedPrompt, locks);
  const result = { ...validated, cacheHit: false, cacheKey: key };
  cache?.set?.(key, result);
  try { window.localStorage.setItem(key, JSON.stringify(result)); } catch { /* noop */ }
  return result;
}
