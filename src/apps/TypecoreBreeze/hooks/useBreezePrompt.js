import { staticOptions, getOptionEn, getOptionName } from '../constants/presets.js';
import { editOptions, directorPersonas, getSliderText } from '../constants/categories.jsx';

// buildPrompts: 현재 입력/옵션 상태를 받아 baseTechnical(en/ko) + outputContent + overview + conflicts 생성
// buildEditPrompts: Micro-Edit 뷰에서 동일 역할
//
// 컴포넌트에서는 매 렌더마다 호출되므로 외부 상태 의존성을 props 객체로 명시 — useMemo는 호출자가 원하면 적용.

// 한글 자모/완성형 1자라도 포함되면 가독성 보강 토큰 주입.
const HANGUL_RX = /[ㄱ-ㅎㅏ-ㆎ가-힣]/;
const hasHangul = (text) => HANGUL_RX.test(text || '');

// 2줄 적층 + 한글 텍스트 → 띄어쓰기 기반 균형 분할로 줄바꿈 위치 명시.
// Nano Banana 가 임의 위치에서 끊는 것을 막아 디자인 의도(상단/하단 균형) 유지.
const computeLineBreak = (text) => {
  const cleaned = (text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  const tokens = cleaned.split(' ');
  if (tokens.length >= 2) {
    let bestSplit = 1, bestDiff = Infinity;
    for (let i = 1; i < tokens.length; i++) {
      const a = tokens.slice(0, i).join(' ').length;
      const b = tokens.slice(i).join(' ').length;
      const diff = Math.abs(a - b);
      if (diff < bestDiff) { bestDiff = diff; bestSplit = i; }
    }
    return [tokens.slice(0, bestSplit).join(' '), tokens.slice(bestSplit).join(' ')];
  }
  const arr = Array.from(cleaned);
  const mid = Math.ceil(arr.length / 2);
  return [arr.slice(0, mid).join(''), arr.slice(mid).join('')];
};

// 옵션 조합 충돌 자동 해결.
// 정확한 모순(서로 동시에 만족 불가)만 해결 — 디자인 취향 차이는 건드리지 않음.
// 반환: { resolved, conflicts:[{msg, fix}] }
const resolveConflicts = (s) => {
  const out = { ...s };
  const conflicts = [];

  if (out.rhythmDynamic === 'Rhythm_Bouncy' && out.textFlow === 'Straight') {
    out.textFlow = 'Bouncy'; conflicts.push('리듬 Bouncy ↔ 베이스라인 Straight → Bouncy 베이스라인으로 통일');
  } else if (out.rhythmDynamic === 'Rhythm_Calm' && (out.textFlow === 'Bouncy' || out.textFlow === 'Wave')) {
    out.textFlow = 'Straight'; conflicts.push('리듬 Calm ↔ 베이스라인 Bouncy/Wave → Straight 베이스라인으로 통일');
  }

  if (out.internalDecoration === 'StickerBorder' && out.stemWeight === 'Weight_Thin') {
    out.stemWeight = 'Weight_Chunky'; conflicts.push('스티커 보더 ↔ 얇은 모노라인 → 두툼한 볼륨으로 강제');
  }

  if (out.internalDecoration === 'Extruded3D' && ['Tex_Watercolor', 'Tex_Chalk', 'Tex_DustyChalk'].includes(out.strokeTexture)) {
    out.internalDecoration = 'Solid'; conflicts.push('3D 입체 ↔ 수채화/분필 텍스처 → 텍스처 우선, 3D 해제');
  }

  if (out.internalDecoration === 'Highlight' && ['Tex_Watercolor', 'Tex_Chalk', 'Tex_DustyChalk', 'Tex_Grunge'].includes(out.strokeTexture)) {
    out.internalDecoration = 'Solid'; conflicts.push('글로시 하이라이트 ↔ 거친/번짐 텍스처 → 솔리드로 통일');
  }

  // 1줄 강제 + Extended 비례는 화면 폭 초과 위험 — 표준으로 완화.
  if (out.layoutType === '1Line' && out.charProportion === 'P_Extended' && out.aspectRatio !== '2.76:1') {
    out.charProportion = 'P_Std'; conflicts.push('1줄 + 확장 비례 → 화면 폭 초과 방지를 위해 표준 비례로');
  }

  return { resolved: out, conflicts };
};

export const buildPrompts = (raw) => {
  const { resolved: s, conflicts } = resolveConflicts(raw);

  // 수동 줄바꿈(\n) 처리 — 입력의 줄바꿈을 명시적 행(최대 3줄)으로 분리하고,
  // 본문 텍스트 자체는 한 줄로 정규화(모델에 깨끗한 텍스트 전달 + [LINE BREAK] 디렉티브로 분할 위치 지정).
  const rawInput = s.inputText || '';
  const manualLines = rawInput.includes('\n') ? rawInput.split('\n').map(t => t.trim()).filter(Boolean) : null;
  const manualLineCount = manualLines ? manualLines.length : 1;
  s.inputText = rawInput.replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim();
  // 효과적 줄 수 — 수동 줄바꿈이 우선(최대 3), 없으면 layoutType(1Line/2Lines/3Lines).
  const layoutLines = manualLineCount >= 3 ? 3
    : manualLineCount === 2 ? 2
    : s.layoutType === '3Lines' ? 3
    : s.layoutType === '2Lines' ? 2
    : 1;
  const styleList = [...staticOptions.CasualStyles, ...(s.dynamicOptions.CasualStyles || [])];
  const weightList = [...staticOptions.strokeWeights, ...(s.dynamicOptions.strokeWeights || [])];
  const kerningList = [...staticOptions.kerningOptions, ...(s.dynamicOptions.kerningOptions || [])];
  const terminalList = [...staticOptions.strokeEnds, ...(s.dynamicOptions.strokeEnds || [])];
  const sharpnessList = [...staticOptions.strokeSharpness, ...(s.dynamicOptions.strokeSharpness || [])];
  const textureList = [...staticOptions.strokeTextures, ...(s.dynamicOptions.strokeTextures || [])];
  const rhythmList = [...staticOptions.rhythmDynamics, ...(s.dynamicOptions.rhythmDynamics || [])];
  const slantList = staticOptions.slantAngles;
  // eslint-disable-next-line no-unused-vars
  const destList = [...staticOptions.analogImperfections, ...(s.dynamicOptions.analogImperfections || [])];

  const styleEn = getOptionEn(styleList, s.scriptType);
  const weightEn = getOptionEn(weightList, s.stemWeight);
  const kerningEn = getOptionEn(kerningList, s.kerning);
  const terminalEn = getOptionEn(terminalList, s.terminalStyle);
  const sharpnessEn = getOptionEn(sharpnessList, s.strokeSharpness);
  const textureEn = getOptionEn(textureList, s.strokeTexture);
  const widthEn = getOptionEn(staticOptions.widths, s.charWidth);
  const proportionEn = getOptionEn(staticOptions.proportions, s.charProportion);
  const extensionEn = getOptionEn(staticOptions.strokeExtensions, s.strokeExtension);
  const rhythmEn = getOptionEn(rhythmList, s.rhythmDynamic);
  const slantEn = getOptionEn(slantList, s.slantAngle);
  const occupancyEn = getOptionEn(staticOptions.occupancies, s.occupancy);
  const internalEn = getOptionEn(staticOptions.InternalDecorations, s.internalDecoration);
  const textFlowEn = getOptionEn(staticOptions.TextFlows, s.textFlow);
  const connectionEn = getOptionEn(staticOptions.LetterConnections, s.letterConnection);
  const surroundEn = getOptionEn(staticOptions.CasualSurroundings, s.casualSurrounding);

  const styleKo = getOptionName(styleList, s.scriptType);
  const weightKo = getOptionName(weightList, s.stemWeight);
  const kerningKo = getOptionName(kerningList, s.kerning);
  const terminalKo = getOptionName(terminalList, s.terminalStyle);
  const sharpnessKo = getOptionName(sharpnessList, s.strokeSharpness);
  const textureKo = getOptionName(textureList, s.strokeTexture);
  const widthKo = getOptionName(staticOptions.widths, s.charWidth);
  const proportionKo = getOptionName(staticOptions.proportions, s.charProportion);
  const extensionKo = getOptionName(staticOptions.strokeExtensions, s.strokeExtension);
  const rhythmKo = getOptionName(rhythmList, s.rhythmDynamic);
  const slantKo = getOptionName(slantList, s.slantAngle);
  const occupancyKo = getOptionName(staticOptions.occupancies, s.occupancy);
  const internalKo = getOptionName(staticOptions.InternalDecorations, s.internalDecoration);
  const textFlowKo = getOptionName(staticOptions.TextFlows, s.textFlow);
  const connectionKo = getOptionName(staticOptions.LetterConnections, s.letterConnection);
  const surroundKo = getOptionName(staticOptions.CasualSurroundings, s.casualSurrounding);

  const genreSpecEn = `- Fill Decoration: ${internalEn}\n- Text Flow Baseline: ${textFlowEn}\n- Connections: ${connectionEn}\n- Surrounding Elements: ${surroundEn}\n- Distortions: ${getOptionEn(staticOptions.playfulDistortions, s.playfulDistortion)}`;
  const layoutEn = layoutLines === 1
    ? `[LAYOUT MANDATE]: STRICT SINGLE HORIZONTAL ROW. ABSOLUTELY NO VERTICAL STACKING.`
    : layoutLines === 3
      ? `[LAYOUT MANDATE]: Balanced Three-tier vertical stacked composition (exactly 3 rows).`
      : `[LAYOUT MANDATE]: Balanced Two-tier vertical stacked composition.`;
  const userAuraEn = s.customDesignInjections ? `\n[USER DESIGN DIRECTION / AURA]: ${s.customDesignInjections}` : "";

  const layoutKo = layoutLines === 1
    ? `[레이아웃 강제]: 엄격한 1줄 가로 배열. 세로 적층 절대 금지.`
    : layoutLines === 3
      ? `[레이아웃 강제]: 균형잡힌 3줄 세로 적층 구성.`
      : `[레이아웃 강제]: 균형잡힌 2줄 세로 적층 구성.`;
  const userAuraKo = s.customDesignInjections ? `\n[사용자 디자인 지시 / 아우라]: ${s.customDesignInjections}` : "";
  const subTraitContextKo = `\n[세부 속성 집중도]: ${getSliderText(s.personaSliderValue)}`;
  const subTraitContext = `\n[SUB-TRAIT FOCUS]: ${getSliderText(s.personaSliderValue)}`;

  const artisticBoost = s.enhanceMode === 'wild' ? `\n[PLAYFUL CHAOS ENGINE]: ENABLED.\n- ASYMMETRY ENFORCED: Strict prohibition of boring bilateral symmetry.\n- DYNAMIC BOUNCE: Extreme size variations between letters, creating a fun, quirky rhythm.\n- SILHOUETTE HOOK: Create a charming, memorable outer shape that stands out.\n- SACRIFICE PERFECT LEGIBILITY: Allow letters to squash and overlap playfully for artistic mood.\n- NO 3D MATERIALS: Rely purely on flat, vector or illustrated structural forms.` : "";
  // 스타일 암시(calligraphy / bubbly / sticker) 제거 — 스타일은 페르소나·테마가 결정. 여기서는 마감 품질만.
  const qualityBoost = s.enhanceMode === 'perfection' ? `\n[FLAWLESS VECTOR ENGINE]: ENABLED.\n- PRISTINE CURVES: Bezier curves are perfectly clean with no jitter.\n- COMMERCIAL QUALITY: Production-grade visual finish.\n- CLEAN NEGATIVE SPACE: Internal counters are balanced and uncluttered.\n- READABILITY FIRST: Text is highly legible regardless of stylistic choices.` : "";
  const transformationBoost = s.enhanceMode === 'creative' ? `\n[CALLIGRAPHIC ORNAMENT ENGINE]: ENABLED.\n- FLOWING CONNECTIONS: Maximize elegant ligatures, swashes, and beautiful flourishes.\n- UNIFIED COMPOSITION: Letters must interlock naturally like a single continuous artistic gesture.\n- ANCHOR EXAGGERATION: Emphasize the first or last letter with dramatic, gorgeous sweeping curves.` : "";
  const momentumBoost = s.momentumActive ? `\n[RHYTHMIC BOUNCE ENGINE]: ENABLED.\n- DANCING TEXT: The typography must look like it is dancing, jumping, or flowing with energetic movement.\n- ACTION TRAJECTORY: Follow a dynamic sweeping baseline.\n- LIVELY ENERGY: Use slanted, stretching, or bouncing forms to convey pure joy or dynamic speed.` : "";
  const bgDesc = getOptionEn(staticOptions.base, s.baseStyle) || "JET BLACK Background";
  const bgDescKo = getOptionName(staticOptions.base, s.baseStyle) || "제트 블랙 배경";

  const artisticBoostKo = s.enhanceMode === 'wild' ? `\n[유쾌한 혼돈 시스템]: 활성화됨.\n- 비대칭 강제: 지루한 좌우 대칭을 엄격히 금지합니다.\n- 다이나믹 바운스: 글자 간의 극단적인 크기 변화를 통해 재미있고 독특한 리듬감을 만드세요.\n- 실루엣 훅: 멀리서도 눈에 띄는 매력적이고 기억에 남는 외곽 형태를 만드세요.\n- 가독성 희생 허용: 예술적인 분위기를 위해 글자들이 장난스럽게 찌그러지거나 겹치는 것을 허용합니다.\n- 3D 재질 금지: 순수한 평면, 벡터 또는 일러스트 구조에 의존하세요.` : "";
  const qualityBoostKo = s.enhanceMode === 'perfection' ? `\n[무결점 벡터 시스템]: 활성화됨.\n- 완벽한 곡선: 떨림 없는 깔끔한 베지어 곡선.\n- 상업적 퀄리티: 프로덕션급 시각 마감.\n- 깔끔한 여백: 내부 공간(카운터)이 균형 잡히고 깔끔함.\n- 가독성 최우선: 스타일 선택과 무관하게 텍스트가 매우 잘 읽힘.` : "";
  const transformationBoostKo = s.enhanceMode === 'creative' ? `\n[캘리그라피 장식 시스템]: 활성화됨.\n- 흐르는 연결성: 우아한 합자(Ligature), 스워시, 아름다운 플로리시(Flourishes)를 극대화하세요.\n- 통합된 구성: 글자들이 마치 하나의 연속된 예술적 제스처처럼 자연스럽게 얽혀야 합니다.\n- 앵커 과장: 첫 글자나 마지막 글자를 드라마틱하고 멋지게 뻗어나가는 곡선으로 강조하세요.` : "";
  const momentumBoostKo = s.momentumActive ? `\n[리듬 바운스 시스템]: 활성화됨.\n- 춤추는 텍스트: 타이포그래피가 춤을 추거나, 점프하거나, 에너지 넘치는 움직임으로 흐르는 것처럼 보여야 합니다.\n- 액션 궤적: 역동적이고 시원하게 뻗어나가는 베이스라인을 따르세요.\n- 생동감 있는 에너지: 기울어지거나, 늘어나거나, 통통 튀는 형태를 사용해 순수한 즐거움이나 역동적인 속도감을 전달하세요.` : "";

  const activePersonaData = directorPersonas.find(p => p.id === s.aiPersona) || directorPersonas[0];
  const morphologyBody = `${weightEn}, ${kerningEn}, Width(${widthEn}), Specific Proportion(${proportionEn}).`;
  const morphologyDetail = s.isAdvancedOptionsEnabled ? `\n- Detail: ${terminalEn}, ${sharpnessEn}, Texture(${textureEn}), Extension(${extensionEn}).\n${genreSpecEn}\n- Slant: ${slantEn}` : "";

  const morphologyBodyKo = `${weightKo}, ${kerningKo}, 자폭(${widthKo}), 특정 비율(${proportionKo}).`;
  const morphologyDetailKo = s.isAdvancedOptionsEnabled ? `\n- 디테일: ${terminalKo}, ${sharpnessKo}, 텍스처(${textureKo}), 연장선(${extensionKo}).\n- 채우기 장식: ${internalKo}\n- 베이스라인 흐름: ${textFlowKo}\n- 글자 연결성: ${connectionKo}\n- 주변 요소: ${surroundKo}\n- 왜곡: ${getOptionName(staticOptions.playfulDistortions, s.playfulDistortion)}\n- 기울기: ${slantKo}` : "";

  const personaMandate = `\n[DIRECTOR PERSONA MANDATE - ${activePersonaData.shortTitle}]:\n- Focus: Apply '${activePersonaData.keywords}' aesthetics heavily.\n${activePersonaData.instructionRule}`;
  const personaMandateKo = `\n[디렉터 페르소나 명령 - ${activePersonaData.shortTitle}]:\n- 역할: ${activePersonaData.role}\n- 집중: '${activePersonaData.keywords}' 미학을 강력하게 적용하십시오.\n${activePersonaData.instructionRule ? activePersonaData.instructionRule.replace('- Rule: ', '- 구조적 법칙: ') : ''}`;

  // 한글 가독성 보강 — Nano Banana 가 한글 8자 이상에서 자모 누락하는 패턴 차단.
  const hangulBoostEn = hasHangul(s.inputText)
    ? `\n[HANGUL LEGIBILITY]: (perfectly legible Korean Hangul "${s.inputText}":1.6), preserve every jamo and syllable block, absolutely no missing, substituted, or romanized characters, no spelling errors.`
    : '';
  // 줄 분할 위치 제공 — 사용자가 직접 줄바꿈하면 그 분할을 우선(최대 3줄), 아니면 2줄 한글일 때 자동 분할.
  let lineRows = null;
  if (manualLines && manualLineCount >= 2) {
    lineRows = manualLineCount >= 3
      ? [manualLines[0], manualLines[1], manualLines.slice(2).join(' ')]
      : [manualLines[0], manualLines.slice(1).join(' ')];
  } else if (s.layoutType === '2Lines' && hasHangul(s.inputText)) {
    lineRows = computeLineBreak(s.inputText);
  }
  const lineBreakEn = lineRows ? `\n[LINE BREAK]: ${lineRows.map((l, i) => `Line ${i + 1} "${l}"`).join(' / ')}.` : '';
  // 비율 보강 — 16:9 일 때 세로 변환 방지, 1:1 일 때 한쪽 늘어짐 방지.
  const arBoostEn = s.aspectRatio === '16:9'
    ? `(strict 16:9 horizontal widescreen format:1.6), landscape orientation, explicitly NOT vertical, NOT portrait`
    : s.aspectRatio === '2.76:1'
      ? `(strict 2.76:1 ultrawide cinematic letterbox:1.6), far wider than tall`
      : `(strict 1:1 perfect square format:1.5), equal width and height`;

  const baseTechnicalEn = `[MASTER TYPO SPECS V3.0] Text: "${s.inputText}". ${userAuraEn}${subTraitContext}
[CORE PHILOSOPHY]: DO NOT render standard flat fonts. Create artistic custom typography.
[CONFLICT POLICY]: When this spec implies competing directions, the PERSONA and STYLE win. Drop contradictory descriptors rather than averaging them.
[STRICT MONOCHROME]: NO COLORS. STRICT BLACK AND WHITE ONLY.
[SPATIAL MANDATE]: ${occupancyEn}
${layoutEn}${lineBreakEn}${personaMandate}${hangulBoostEn}
[PROPORTION SAFETY]: Force character proportion to ${proportionEn} and width to ${widthEn}. Expand horizontally. Strictly PROHIBIT vertical stretching to prevent unintended vertical text stacking.
[MORPHOLOGY]:
- Theme: ${styleEn}.
- Body: ${morphologyBody}${morphologyDetail}
[RHYTHM]: ${rhythmEn}.
[ENVIRONMENT]: AR ${arBoostEn}, ${bgDesc}.${artisticBoost}${qualityBoost}${transformationBoost}${momentumBoost}`.trim();

  const hangulBoostKo = hasHangul(s.inputText)
    ? `\n[한글 가독성]: "${s.inputText}" 의 모든 자모와 음절 블록을 완벽히 보존. 글자 누락·치환·로마자화 절대 금지, 맞춤법 오류 금지.`
    : '';
  const lineBreakKo = lineRows ? `\n[줄 분할]: ${lineRows.map((l, i) => `${i + 1}줄 "${l}"`).join(' / ')}.` : '';

  const baseTechnicalKo = `[마스터 타이포 스펙 V3.0 - 캐주얼 코어] 텍스트: "${s.inputText}". ${userAuraKo}${subTraitContextKo}
[핵심 철학 및 지시사항]:
1. 일반 폰트 렌더링 금지. '표준 시스템 폰트' 미학 배제.
2. 예술적인 수작업이나 아름답게 세공된 커스텀 타이포그래피 생성.
[엄격한 단색화]: 색상 금지, 채도 0, 순수 흑백으로만 구성.
[2D 강제]: 완벽한 평면 그래픽 실루엣. 깊이감 제로. 3D 금지.
[공간 할당]: ${occupancyKo}
${layoutKo}${lineBreakKo}${personaMandateKo}${hangulBoostKo}
[충돌 정책]: 사양 안에 상충되는 방향이 있을 때 페르소나와 스타일이 우선합니다. 모순 키워드는 평균내지 말고 제거하세요.
[비율 안전장치]: 글자 비율을 ${proportionKo}(으)로, 자폭을 ${widthKo}(으)로 강제. 가로 확장. 세로 적층을 막기 위해 '세로로 늘리기'나 '압축된 세로 종횡비' 엄격히 금지. 강력한 수평 흐름 유지.
[형태학]:
- 테마: ${styleKo}.
- 뼈대: ${morphologyBodyKo}${morphologyDetailKo}
[리듬감]: ${rhythmKo}.
[환경]: 화면비 ${s.aspectRatio}, ${bgDescKo}.${artisticBoostKo}${qualityBoostKo}${transformationBoostKo}${momentumBoostKo}`.trim();

  const baseTechnical = { en: baseTechnicalEn, ko: baseTechnicalKo };

  const overview = `[ V2.6 CASUAL & CALLI OVERVIEW ]
■ SUBJECT: "${s.inputText}"
■ DIRECTOR PERSONA: ${activePersonaData.shortTitle}
■ DESIGN AURA: ${s.customDesignInjections || "기본 셋업"}

[ CORE SETTINGS ]
• Theme: ${styleEn}
• Ends/Terminals: ${terminalEn}
• Rhythm: ${rhythmEn}`;

  const chatGPTOutput = {
    en: `Act as an expert Typography Engine. Render "${s.inputText}" in a 2D flat silhouette graphic. \n1. Constraints: Pure black and white. \n2. Layout: ${layoutEn}. \n3. Directing Aura: ${s.customDesignInjections}. \n4. Details: ${s.isAdvancedOptionsEnabled ? `Texture(${textureEn}), Slant(${slantEn})` : 'Aura Driven'}`,
    ko: `전문 타이포그래피 엔진으로 동작합니다. "${s.inputText}" 텍스트를 2D 흑백 그래픽으로 렌더링하세요.\n1. 제약 조건: 완전한 흑백.\n2. 레이아웃: ${layoutKo}.\n3. 연출 방향성: ${s.customDesignInjections}.\n4. 세부사항: ${s.isAdvancedOptionsEnabled ? `텍스처(${textureKo}), 기울기(${slantKo})` : '사용자 아우라 기반'}`
  };

  const midjourneyOutput = {
    en: `${s.inputText} typography logotype, ${s.customDesignInjections}, ${s.isAdvancedOptionsEnabled ? textureEn : ''} strictly single horizontal row, pure black and white, --ar ${s.aspectRatio.replace(':', ':')} --no 3d, font, color`,
    ko: `${s.inputText} 타이포그래피 로고타입, ${s.customDesignInjections}, ${s.isAdvancedOptionsEnabled ? textureKo : ''} 완전한 1줄 수평 배열, 완전한 흑백, --ar ${s.aspectRatio.replace(':', ':')} --no 3d, font, color`
  };

  let finalOut = overview;
  if (s.aiModel === 'NanoBanana') finalOut = s.nanoViewMode === 'optimized' ? s.optimizedPrompt : (s.dramaticPrompt || null);
  else if (s.aiModel === 'ChatGPT') finalOut = s.cgEnhancedPrompt || chatGPTOutput;
  else if (s.aiModel === 'Midjourney') finalOut = s.mjOptimizedPrompt || midjourneyOutput;

  return { baseTechnical, outputContent: finalOut || overview, overview, conflicts };
};

export const buildEditPrompts = (s) => {
  const baseLock = `[ABSOLUTE LOCKS]:\n1. PURE BLACK BACKGROUND.\n2. STRUCTURE PRESERVATION: Maintain exact layout and legibility.`;
  const baseLockKo = `[절대 규칙]:\n1. 순수 블랙 배경 유지.\n2. 구조 보존: 원본 텍스트의 레이아웃과 가독성 정확히 유지.`;

  let targetDetails = "";
  let targetDetailsKo = "";

  if (s.editTargetCategory === "texture") { targetDetails = `Apply internal texture: ${getOptionEn(editOptions.textures, s.editTexStyle)}`; targetDetailsKo = `내부 질감 적용: ${getOptionName(editOptions.textures, s.editTexStyle)}`; }
  else if (s.editTargetCategory === "edge") { targetDetails = `Modify stroke terminals and corners: ${getOptionEn(editOptions.edges, s.editEdgeStyle)}`; targetDetailsKo = `획 마감 및 모서리 수정: ${getOptionName(editOptions.edges, s.editEdgeStyle)}`; }
  else if (s.editTargetCategory === "extension") { targetDetails = `Add stroke extensions: ${getOptionEn(editOptions.extensions, s.editExtStyle)}`; targetDetailsKo = `획 연장 및 장식 추가: ${getOptionName(editOptions.extensions, s.editExtStyle)}`; }
  else if (s.editTargetCategory === "rhythm") { targetDetails = `Modify overall rhythm: ${getOptionEn(editOptions.rhythms, s.editRhythmStyle)}`; targetDetailsKo = `전체 리듬감 수정: ${getOptionName(editOptions.rhythms, s.editRhythmStyle)}`; }
  else if (s.editTargetCategory === "object") { targetDetails = `Replace the letter '${s.editObjLetter || "?"}' with a stylized graphic object of '${s.editObjItem || "?"}'.`; targetDetailsKo = `'${s.editObjLetter || "?"}' 글자를 '${s.editObjItem || "?"}' 그래픽 오브제로 치환.`; }

  const instruction = s.editInstruction ? `\n- Additional Note: ${s.editInstruction}` : "";
  const instructionKo = s.editInstruction ? `\n- 추가 노트: ${s.editInstruction}` : "";

  const baseTechnicalEn = `[IMAGE-TO-IMAGE TYPOGRAPHY MICRO-EDIT V2.0]\n${baseLock}\n\n[TARGETED EDIT INSTRUCTION]:\n- Edit Goal: MICRO-ADJUSTMENT\n- Focus: ${targetDetails}${instruction}\n\n[EXECUTION RULE]: ONLY apply the targeted edit. Keep everything else identical.`;
  const baseTechnicalKo = `[이미지-투-이미지 타이포그래피 마이크로 편집]\n${baseLockKo}\n\n[타겟 편집 지시]:\n- 편집 목표: 마이크로-조정\n- 집중: ${targetDetailsKo}${instructionKo}\n\n[실행 규칙]: 오직 타겟이 된 영역만 편집하고 나머지는 원본과 동일하게 유지할 것.`;

  const baseTechnical = { en: baseTechnicalEn, ko: baseTechnicalKo };

  const overview = `[ V2.6 I2I MICRO-EDIT OVERVIEW ]
■ EXPERT MODE: Surgical Precision Editor

[ ABSOLUTE LOCKS ]
• Background: STRICTLY BLACK
• Rule: Preserve base shape and layout

[ TARGET INSTRUCTION ]
• Category: ${editOptions.categories.find(c=>c.id === s.editTargetCategory)?.name}
• Target Detail: ${targetDetails.split(':')[1]?.trim() || targetDetails}
• Custom Note: ${s.editInstruction || "None"}`;

  const chatGPTOutput = {
    en: `Act as an expert Typography Editor. Redraw the provided base image applying ONLY a micro-edit. \nConstraints: Pure black background, keep exact text layout.\nEdit Request: ${targetDetails}. ${s.editInstruction}`,
    ko: `제공된 베이스 이미지를 바탕으로 정밀한 마이크로-에디팅만 적용하여 다시 그려주세요. \n제약조건: 순수 블랙 배경, 정확한 텍스트 레이아웃 유지.\n수정 요청사항: ${targetDetailsKo}. ${s.editInstruction}`
  };

  const midjourneyOutput = {
    en: `[UPLOAD BASE IMAGE AS REFERENCE] typography logotype, image-to-image micro edit, ${targetDetails.replace(':', '')}, ${s.editInstruction}, pure black background, pure white text, --ar 16:9 --iw 1.8 --style raw --no 3d, font, color`,
    ko: `[베이스 이미지를 레퍼런스로 업로드] 타이포그래피 로고타입, 이미지-투-이미지 마이크로 에디트, ${targetDetailsKo.replace(':', '')}, ${s.editInstruction}, 완전한 블랙 배경, 완전한 화이트 텍스트, --ar 16:9 --iw 1.8 --style raw --no 3d, font, color`
  };

  let finalOut = overview;
  if (s.editAiModel === 'NanoBanana') finalOut = s.editNanoMode === 'optimized' ? s.editOptimizedPrompt : (s.editDramaticPrompt || null);
  else if (s.editAiModel === 'ChatGPT') finalOut = s.editCgPrompt || chatGPTOutput;
  else if (s.editAiModel === 'Midjourney') finalOut = s.editMjPrompt || midjourneyOutput;

  return { baseTechnical, outputContent: finalOut || overview };
};
