// BriefStudio · Prism — prism/parserCore.js
// provider 무관 코어. 프롬프트·스키마·후처리는 여기서 고정하고, 모델은 어댑터로 갈아끼운다.

import { extractionPrompt, opsPrompt } from './prompts.js';
import { EXTRACTION_SCHEMA, OPS_SCHEMA } from './schema.js';

export function parseJsonLoose(t) {
  let s = String(t || '').replace(/```json|```/g, '').trim();
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  return JSON.parse(s);
}

export function createParserCore({ provider }) {
  if (!provider) throw new Error('provider가 필요합니다 (GeminiProvider)');

  return {
    /**
     * 요청서 → 구조+데이터 추출
     * @param {object} p
     * @param {{mimeType:string, base64:string}[]} [p.files] 이미지/PDF
     * @param {string} [p.text]  요청서 텍스트
     * @param {string} [p.note]  사용자 교정 지시
     */
    async extract({ files = [], text = '', note = '' }) {
      const prompt = extractionPrompt(note) + (text ? '\n\n[요청서 텍스트]\n' + text : '');
      const out = await provider.generateJSON({ prompt, parts: files, schema: EXTRACTION_SCHEMA, temperature: 0 });
      out.structure = out.structure || [];
      out.sections = out.sections || [];
      out.uncertain = out.uncertain || [];
      return out;
    },

    /**
     * 추출데이터 + 플러그인 스키마 → 슬롯필러 ops
     * @param {object} p
     * @param {object|string} p.extracted  extract() 결과
     * @param {object|string} p.schema     플러그인 '스키마 내보내기' 출력 {ops:[...]}
     */
    async generateOps({ extracted, schema }) {
      const exStr = typeof extracted === 'string' ? extracted : JSON.stringify(extracted, null, 1);
      const scObj = typeof schema === 'string' ? JSON.parse(schema) : schema;
      const scStr = JSON.stringify(scObj, null, 1);
      const out = await provider.generateJSON({ prompt: opsPrompt(exStr, scStr), schema: OPS_SCHEMA, temperature: 0 });
      return guardOps(scObj, out);
    },
  };
}

// id/slot/type 불변 가드 — 모델이 골격을 건드렸으면 스키마 쪽을 기준으로 복원하고 _review 표시.
// 모델 출력의 골격 훼손(필드 누락·변형)을 코드에서 흡수하는 안전망.
export function guardOps(schemaObj, outObj) {
  const sOps = (schemaObj && schemaObj.ops) || [];
  const oOps = (outObj && outObj.ops) || [];
  const keyOf = o => [o.id || '', JSON.stringify(o.scope || ''), o.cellIndex != null ? o.cellIndex : '', o.slot || '', o.type || ''].join('|');
  const byKey = new Map(oOps.map(o => [keyOf(o), o]));
  let restored = 0;
  const ops = sOps.map(s => {
    const m = byKey.get(keyOf(s));
    if (m) return m;
    restored++;
    return Object.assign({}, s, { _review: '모델 출력에서 골격 불일치 — 원본 유지' });
  });
  return { ops, _guard: { schemaCount: sOps.length, modelCount: oOps.length, restored } };
}
