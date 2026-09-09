export const NARRATIVE_INTENSITIES = [
  { id: 'off', name: '0 · 기본형', budget: '0%', readability: '100%', maxGlyphs: 0 },
  { id: 'subtle', name: '1 · 미세', budget: '5-8%', readability: '92%', maxGlyphs: 1 },
  { id: 'restrained', name: '2 · 절제', budget: '8-12%', readability: '88%', maxGlyphs: 2 },
  { id: 'accent', name: '3 · 강조', budget: '12-15%', readability: '85%', maxGlyphs: 2 },
];

export const NARRATIVE_SCOPES = [
  { id: 'one', name: '한 글자', en: 'exactly one syllable or glyph' },
  { id: 'two', name: '최대 두 글자', en: 'no more than two syllables or glyphs' },
  { id: 'rhythm', name: '전체 리듬', en: 'the global spacing or baseline rhythm without redrawing individual glyphs' },
];

export const NARRATIVE_MUTATIONS = [
  { id: 'auto', name: '콘셉트 자동', en: 'choose one restrained structural cue that best expresses the supplied story or emotional direction' },
  { id: 'counter', name: '내부 여백', en: 'reshape or narrow one internal counter or negative-space aperture' },
  { id: 'terminal', name: '획 끝', en: 'alter one terminal, serif, or stroke ending' },
  { id: 'cut', name: '미세 절단', en: 'introduce one small, clean structural cut without fragmenting the character' },
  { id: 'connection', name: '획 연결', en: 'create or release one subtle connection between neighboring strokes or glyphs' },
  { id: 'proportion', name: '국소 비례', en: 'slightly compress or extend one selected glyph while preserving its skeleton' },
  { id: 'baseline', name: '기준선', en: 'apply a restrained spacing or baseline displacement as the single narrative cue' },
];

const findById = (items, id, fallbackId) => items.find((item) => item.id === id)
  || items.find((item) => item.id === fallbackId)
  || items[0];

export function buildNarrativeDirective({
  active = false,
  intensity = 'subtle',
  scope = 'one',
  mutation = 'auto',
  target = '',
} = {}) {
  if (!active) {
    return {
      active: false,
      en: '',
      ko: '',
      budget: '0%',
      readability: '100%',
      allowed: 'None',
      forbidden: 'Any narrative mutation',
    };
  }

  const intensityOption = findById(NARRATIVE_INTENSITIES, intensity, 'subtle');
  const scopeOption = findById(NARRATIVE_SCOPES, scope, 'one');
  const mutationOption = findById(NARRATIVE_MUTATIONS, mutation, 'auto');
  if (intensityOption.id === 'off') {
    return {
      active: true,
      en: `[NARRATIVE MINIMAL MODE — BASE ONLY]\n- Use a restrained, neutral editorial title with disciplined negative space.\n- Do not apply a story mutation. Preserve every glyph as a clean, conventional, highly legible silhouette.\n- No surrounding symbols, particles, frames, textures, outlines, shadows, glow, gradients, materials, or 3D effects.`,
      ko: `[내러티브 미니멀 모드 — 기본형]\n- 절제된 중립 편집 타이틀과 충분한 여백만 적용합니다.\n- 서사 변형을 적용하지 않고 모든 글자를 관습적이며 명확한 실루엣으로 유지합니다.\n- 주변 심볼·파티클·프레임·질감·외곽선·그림자·글로우·그라디언트·재질·3D를 금지합니다.`,
      budget: '0%',
      readability: '100%',
      allowed: 'Optical spacing and balance only',
      forbidden: 'Any glyph mutation, literal icon, texture, surrounding decoration, or readability loss',
    };
  }
  const targetText = (target || '').trim();
  const targetEn = targetText
    ? `Apply the cue only to the exact target "${targetText}".`
    : `Select the most semantically useful target automatically, but limit the intervention to ${scopeOption.en}.`;
  const targetKo = targetText
    ? `정확한 대상 "${targetText}"에만 단서를 적용합니다.`
    : `의미상 가장 적절한 대상을 자동 선택하되 범위는 ${scopeOption.name}로 제한합니다.`;

  const en = `[NARRATIVE MINIMAL MODE]
- Keep 85-95% of the title neutral, editorial, and visually quiet.
- Express the story with exactly one structural idea: ${mutationOption.en}.
- ${targetEn}
- Mutation budget: ${intensityOption.budget}; readability floor: ${intensityOption.readability}.
- Preserve every Hangul syllable block and jamo. The title must read correctly before the concept cue is noticed.
- Use silhouette, spacing, terminals, connections, or negative space only. Do not insert literal illustrations or replace a glyph with an object.
- No surrounding symbols, particles, frames, textures, outlines, shadows, glow, gradients, materials, or 3D effects.
- If the creative direction contains several motifs, choose the single quietest and most structurally relevant one.`;

  const ko = `[내러티브 미니멀 모드]
- 타이틀의 85-95%는 중립적이고 편집적이며 조용한 형태로 유지합니다.
- 하나의 구조적 아이디어만 사용합니다: ${mutationOption.name}.
- ${targetKo}
- 변형 예산 ${intensityOption.budget}, 가독성 하한 ${intensityOption.readability}.
- 모든 한글 음절 블록과 자모를 보존하고, 콘셉트보다 철자 인지가 먼저 이루어져야 합니다.
- 실루엣·간격·획 끝·연결·내부 여백만 사용하며 글자를 사물 그림으로 치환하지 않습니다.
- 주변 심볼·파티클·프레임·질감·외곽선·그림자·글로우·그라디언트·재질·3D를 금지합니다.
- 여러 모티프가 입력되면 가장 조용하고 구조적으로 적합한 하나만 선택합니다.`;

  return {
    active: true,
    en,
    ko,
    budget: intensityOption.budget,
    readability: intensityOption.readability,
    allowed: `${mutationOption.en}; limited to ${scopeOption.en}`,
    forbidden: 'Multiple motifs, literal icons, object substitution, full-word deformation, texture, surrounding decoration, or readability loss',
  };
}
