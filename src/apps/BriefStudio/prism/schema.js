// BriefStudio · Prism — prism/schema.js
// Gemini responseSchema (OpenAPI subset). 프롬프트로만 JSON을 강제하지 않고 API 레벨에서 형식을 고정한다.

const PATTERNS = ['craft-formula', 'result-grid', 'package-card', 'selection-grid', 'craft-rows', 'showcase', 'unknown'];

const namedCount = {
  type: 'object',
  properties: { name: { type: 'string' }, count: { type: 'string' } },
};

export const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    meta: {
      type: 'object',
      properties: {
        doc_type: { type: 'string' },     // 제작요청서 | 수정요청서
        game: { type: 'string' },
        page_title: { type: 'string' },
        period: { type: 'string' },
        servers: { type: 'string' },
        etc: { type: 'string' },
      },
    },
    structure: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          pattern: { type: 'string', enum: PATTERNS },
          title: { type: 'string' },
          note: { type: 'string' },
        },
        required: ['pattern', 'title'],
      },
    },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          pattern: { type: 'string', enum: PATTERNS },
          tag: { type: 'string' },        // 전서버 | 상시 | EVENT 등
          title: { type: 'string' },
          desc: { type: 'string' },
          heading: { type: 'string' },
          formula: {
            type: 'object',
            properties: {
              sources: { type: 'array', items: namedCount },
              result: namedCount,
              arrow: { type: 'string' }, // 제작 | 확정 제작 | 성공확률 N% 등
            },
          },
          outcomes: {
            type: 'array',
            items: {
              type: 'object',
              properties: { name: { type: 'string' }, count: { type: 'string' }, prob: { type: 'string' } },
            },
          },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: { name: { type: 'string' }, count: { type: 'string' }, note: { type: 'string' } },
            },
          },
          price: { type: 'string' },
          seal: { type: 'string' },
          notes: { type: 'array', items: { type: 'string' } }, // ※ 원문 그대로
        },
        required: ['pattern', 'title'],
      },
    },
    uncertain: { type: 'array', items: { type: 'string' } },
  },
  required: ['meta', 'structure', 'sections'],
};

export const OPS_SCHEMA = {
  type: 'object',
  properties: {
    ops: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          scope: { type: 'array', items: { type: 'string' } },
          cellIndex: { type: 'integer' },
          slot: { type: 'string' },
          type: { type: 'string' },
          value: { type: 'string' },
          match: { type: 'string' },
          asset: { type: 'string' },
          _review: { type: 'string' },
        },
        required: ['slot', 'type'],
      },
    },
  },
  required: ['ops'],
};
