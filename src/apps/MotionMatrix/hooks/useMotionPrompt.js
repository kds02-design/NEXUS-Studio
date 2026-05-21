import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LOOP_SURFACE_FX, LOOP_EDGE_FX, LOOP_AMBIENT_FX,
  INTRO_SURFACE_FX, INTRO_EDGE_FX, INTRO_AMBIENT_FX,
  TRANS_SURFACE_FX, TRANS_EDGE_FX, TRANS_AMBIENT_FX,
  INTRO_STYLES, FLOW_STYLES, MOTION_DYNAMICS, INTENSITY_LEVELS,
  TRANSITION_TARGETS,
} from '../constants/presets';
import { performMotionAudit } from '../services/auditMotion';

// --- Pure prompt-build helpers (exported for components that need raw text) ---

export const inspectAndOptimizePrompt = (rawText, targetModel) => {
  let opt = rawText || '';
  const logs = [];
  let replacements = [
    { rx: /\b(sweeps across|sweeps|sweeping)\b/gi, rep: 'scans in-place across', reason: '카메라 패닝 유발 방지' },
    { rx: /\b(radiates outward|radiates|radiating)\b/gi, rep: 'pulses in-place', reason: '형태 팽창(Scale up) 방지' },
    { rx: /\b(creeps inward|creeping inward|creeps)\b/gi, rep: 'materializes', reason: 'Z축 줌인 유발 방지' },
    { rx: /\b(erupts from|erupts|erupting)\b/gi, rep: 'flashes at', reason: '오브젝트 파괴/변형 방지' },
    { rx: /\b(fly off|flying outwards?)\b/gi, rep: 'spark locally', reason: '입자 프레임 이탈 방지' },
    { rx: /\b(blows off|blowing)\b/gi, rep: 'dissolves near', reason: '연기/가루의 화면 잠식 방지' },
    { rx: /\b(aggressively spreads|spreads outward|spreads)\b/gi, rep: 'illuminates', reason: '질감의 스케일 확장 방지' },
    { rx: /\b(organic swell)\b/gi, rep: 'in-place swell', reason: '스케일 꿀렁임(Wobbling) 방지' },
    { rx: /\b(aggressively animate|animate heavily)\b/gi, rep: 'animate in-place', reason: '과도한 픽셀 뭉개짐 방지' },
  ];
  if (targetModel === 'kling') {
    replacements = replacements.filter((r) => !['오브젝트 파괴/변형 방지', '과도한 픽셀 뭉개짐 방지', '스케일 꿀렁임(Wobbling) 방지', '질감의 스케일 확장 방지'].includes(r.reason));
  }
  replacements.forEach(({ rx, rep, reason }) => {
    const match = opt.match(rx);
    if (match && match.length > 0) {
      opt = opt.replace(rx, rep);
      logs.push(`⚠️ 단어 교체: "${match[0]}" ➡️ "${rep}" (${reason})`);
    }
  });
  const oldLen = opt.length;
  opt = opt.replace(/\n\s*\n/g, '\n');
  opt = opt.replace(/  +/g, ' ');
  if (oldLen > opt.length + 20) logs.push(`✅ 빈칸 및 토큰 낭비 압축 완료`);
  return { optimizedText: opt, logs };
};

export const compileNegativePrompt = (layers, exportMode, animationMode, targetModel, surfaceOpts, edgeOpts, ambientOpts) => {
  const sOpt = surfaceOpts.find((o) => o.id === layers.surface);
  const eOpt = edgeOpts.find((o) => o.id === layers.edge);
  const aOpt = ambientOpts.find((o) => o.id === layers.ambient);
  const exempt = [...(sOpt?.negExempt || []), ...(eOpt?.negExempt || []), ...(aOpt?.negExempt || [])];
  let baseNegatives = [];
  if (exportMode === 'lite_test') {
    baseNegatives = ['camera movement', 'zoom', 'lens flare', 'external laser beams', 'distortion', 'morphing', 'warping', 'wobbling', 'scenery', '3D'];
    if (animationMode === 'loop') baseNegatives.push('non-looping');
  } else if (exportMode === 'vfx_pass') {
    baseNegatives = [
      'camera movement', 'zoom', 'pan', 'scale change',
      'morphing', 'distortion', 'typography changes', 'visible text face', 'textured letters', 'lit background',
      'scenery', 'background scene', 'floor shadow', 'lens flare', 'anamorphic streak', 'external laser beams', 'audio',
      'original texture', 'visible letters', 'surface details', 'base image colors', 'lit text', 'metal texture', 'stone texture',
      'reflections on text', 'ambient light on letters', 'inner fill',
    ];
    if (animationMode === 'loop') baseNegatives.push('lingering glow', 'non-looping');
  } else {
    baseNegatives = [
      'camera movement', 'zoom', 'zoom out', 'zoom in', 'pan', 'dolly', 'parallax', 'reframe', 'crop shift',
      'scale change', 'shrinking text', 'growing text', 'depth motion', 'backward drift', 'forward drift', 'breathing scale',
      'morphing', 'distortion', 'typography changes', 'warping', 'wobbling', 'liquefying', 'jelly-like motion', 'melting',
      'scenery', 'background scene', 'floor shadow',
      'large smoke', 'messy particles', 'clipping edges', 'wide aura', 'lens flare', 'anamorphic streak', 'volumetric light', 'external laser beams', 'flash', 'glare', 'amateur', 'flat lighting',
      'audio', 'abrupt cuts', 'high contrast black stains',
    ];
    if (animationMode === 'loop') baseNegatives.push('lingering glow', 'non-looping', 'one-way movement', 'linear animation');
    else baseNegatives = baseNegatives.filter((n) => n !== 'typography changes');
  }
  if (animationMode === 'intro') baseNegatives.push('flying in', 'scaling up', 'zooming out from black', 'pop in', 'sliding text', 'moving text', 'visible at start');
  if (targetModel === 'runway') baseNegatives.push('micro-zoom', 'creeping scale', 'subtle zoom', 'slow push-in', 'perspective shift');
  else if (targetModel === 'gemini') baseNegatives.push('excessive effects', 'flashy', 'cluttered', 'busy', 'over-the-top', 'chaotic');
  else if (targetModel === 'kling') {
    baseNegatives = baseNegatives.filter((n) => !['typography changes'].includes(n));
    baseNegatives.push('frozen texture', 'static photo', 'dead pixels', 'wobbling', 'warping', 'liquefying', 'morphing letterforms', 'letter deformation');
  }
  return baseNegatives.filter((n) => !exempt.includes(n)).join(', ');
};

export const compileRawPrompt = (layers, exportMode, animationMode, targetMat, vfxTarget, targetModel, surfaceOpts, edgeOpts, ambientOpts) => {
  const sOpt = surfaceOpts.find((f) => f.id === layers.surface) || surfaceOpts[0];
  const eOpt = edgeOpts.find((f) => f.id === layers.edge) || edgeOpts[0];
  const aOpt = ambientOpts.find((f) => f.id === layers.ambient) || ambientOpts[0];
  const tMat = TRANSITION_TARGETS.find((t) => t.id === targetMat) || TRANSITION_TARGETS[0];
  const flowOpt = FLOW_STYLES.find((f) => f.id === layers.flow) || FLOW_STYLES[0];
  const introOpt = INTRO_STYLES.find((i) => i.id === layers.intro) || INTRO_STYLES[0];
  const intensity = INTENSITY_LEVELS.find((f) => f.id === layers.intensity).en;
  const dynamics = MOTION_DYNAMICS.find((f) => f.id === layers.dynamics).en;
  const guardrails = Array.from(new Set([sOpt.guardrail, eOpt.guardrail, aOpt.guardrail].filter(Boolean))).join(' ');
  const halfway = parseInt(layers.duration) / 2;

  let modelInjection = '';
  if (targetModel === 'runway') modelInjection = `[ANTI-ZOOM] Do not scale, reframe, or zoom. Keep bounds identical. Zero depth motion.\n`;
  else if (targetModel === 'kling') modelInjection = `[KLING DYNAMICS] Outer silhouette is mathematically FROZEN. Zero morphing or shape distortion. BUT the INTERNAL textures, edges, and lighting MUST flow and animate vividly.\n`;
  else if (targetModel === 'gemini') modelInjection = `[MINIMALIST] Restrain effects. Subtle, clean motion. Do not over-render.\n`;

  const cinematicTone = `[TONE] Hollywood title sequence, masterpiece, photorealistic, cinematic lighting.\n`;

  if (exportMode === 'vfx_pass') {
    let fxToRender = '';
    if (vfxTarget === 'surface') fxToRender = `[SURFACE FX ONLY] ${sOpt.en} Zero edge/ambient.`;
    else if (vfxTarget === 'edge') fxToRender = `[EDGE FX ONLY] ${eOpt.en} Zero surface/ambient.`;
    else if (vfxTarget === 'ambient') fxToRender = `[AMBIENT FX ONLY] ${aOpt.en} Zero surface/edge.`;
    else fxToRender = `[FX] Surface: ${sOpt.en} Edge: ${eOpt.en} Ambient: ${aOpt.en}`;
    let modeLine = '';
    if (animationMode === 'transition') modeLine = `Progression: ${flowOpt.trans_en} End: Full FX.`;
    else if (animationMode === 'intro') modeLine = `Intro Reveal. Start(0s): Pitch black empty space. Progression: ${introOpt.en} End: Fully visible FX.`;
    else modeLine = `Seamless ${layers.duration} loop. ${flowOpt.loop_en} Dormant start -> peak ${halfway}s -> dormant end.`;
    return `${modelInjection}VFX Luma Matte Render Pass on pure #000000 background.\n${cinematicTone}[MASK OVERRIDE] IGNORE input textures/colors. OVERWRITE base image. ${animationMode === 'intro' ? 'Frame 0 MUST be completely black.' : ''} Transform typography into a flat, unlit, pure #000000 silhouette. Base text acts ONLY as hidden collision mesh. DO NOT render original material.\n[MOTION] ${modeLine} ${dynamics} (${intensity}). Zero camera movement. Zero depth drift.\n${fxToRender}\nRender ONLY bright glowing FX for Add/Screen compositing.\n[RULE] Preserve exact bounds & size. Pure #000000 BG. Zero flares, zero external lasers, zero scenery. --no-audio --zoom 0`;
  }

  if (exportMode === 'lite_test') {
    let modeLine = '';
    let baseImgLock = 'Use original image exactly as first frame.';
    if (animationMode === 'transition') modeLine = `Linear trans to ${tMat.base}. ${flowOpt.trans_en}`;
    else if (animationMode === 'intro') { modeLine = `Intro Reveal. ${introOpt.en}`; baseImgLock = 'CRITICAL: Image is FINAL target frame. Frame 0 MUST be pitch black.'; }
    else modeLine = `Seamless ${layers.duration} loop. ${flowOpt.loop_en}`;
    const motionLock = targetModel === 'kling'
      ? 'Outline is mathematically frozen. INTERNAL textures MUST animate vividly and shift continuously.'
      : 'Outer shape frozen. INTERNAL textures animate vividly.';
    return `${modelInjection}2D text on pure #000000. ${baseImgLock} 100% static camera. Zero zoom/pan/drift. Preserve exact size. Immutable shape.\n[MOTION] ${motionLock} ${modeLine} ${dynamics} (${intensity}).\n[FX] ${sOpt.en} ${eOpt.en} ${aOpt.en}\n[RULE] ${guardrails} Zero flares/scenery. --no-audio --zoom 0`;
  }

  let lockSection = '';
  if (targetModel === 'kling') {
    lockSection = animationMode === 'intro'
      ? `[CAM/SHAPE] CRITICAL OVERRIDE: Provided image is FINAL TARGET FRAME. Frame 0 MUST be completely pitch black. Fixed camera. Text boundaries are mathematically frozen. Zero wobbling or warping.`
      : `[CAM/SHAPE] Fixed camera, zero zoom/pan/drift. Text boundaries are mathematically frozen. Zero morphing, wobbling, or warping. The letters MUST NOT deform. Only the internal textures and edge lighting can shift.`;
  } else if (animationMode === 'intro') {
    lockSection = `[CAM/SHAPE LOCK]\nCRITICAL OVERRIDE: The provided image is the FINAL TARGET FRAME, NOT the first frame. Frame 0 MUST be completely pitch black and invisible. 100% static locked-off camera. The outer silhouette and bounding box are completely frozen. Zero zoom, pan, parallax, or perspective shift. Preserve the exact original text size, position, and margins.`;
  } else {
    lockSection = `[CAM/SHAPE LOCK]\nUse the provided image exactly as the first frame reference. 100% static locked-off camera. The outer silhouette and bounding box are completely frozen. Zero zoom, pan, parallax, or perspective shift. Preserve the exact original text size, position, and margins. CRITICAL: While the outer shape is locked, the INTERNAL textures, cracks, and existing electric/energy motifs MUST animate vividly.`;
  }

  let loopSection = '';
  let motionSection = '';
  if (animationMode === 'transition') {
    loopSection = `[TRANSITION] ONE-WAY cinematic material transition. Start(0s): Original base texture. Progression: ${flowOpt.trans_en} End(${layers.duration}): Surface converts entirely into ${tMat.base}.`;
    motionSection = `[MOTION] ${dynamics} (${intensity}). FX animate heavily during transition. Never move toward camera. Zero depth drift. No outward expansion.`;
  } else if (animationMode === 'intro') {
    loopSection = `[INTRO] ONE-WAY reveal animation. Start(0s): Typography is completely invisible, pitch black. Progression: ${introOpt.en} End(${layers.duration}): Text is 100% visible exactly as reference image.`;
    motionSection = `[MOTION] ${dynamics} (${intensity}). Text must reveal IN PLACE. Never move toward camera. Zero depth drift. No scaling/flying in.`;
  } else {
    loopSection = `[LOOP] Seamless ${layers.duration} loop. Frame 0 and final frame visually identical. Dormant start -> peak at ${halfway}s -> dormant end. Return to dormant affects only light intensity, never scale. Zero lingering FX.`;
    motionSection = `[MOTION] ${flowOpt.loop_en} Never move toward camera. Zero depth drift. ${dynamics} (${intensity}). Only internal FX animate. No expansion/shrink.`;
  }

  const fxSection = `[FX] Apply tracing & enhancing existing design elements (e.g. lightning, cracks).\nSurface: ${sOpt.en}\nEdge: ${eOpt.en}\nAmbient: ${aOpt.en}`;
  let guardrailSection = `[RULE] Razor-sharp readability. Pure #000000 background. Zero heat haze/scenery/smoke. CRITICAL: Zero lens flares, zero anamorphic streaks, zero external laser beams from empty space. Confine FX strictly to text surface. Particles MUST NOT clip frame edges. ${guardrails}`;
  if (exportMode === 'production' || exportMode === 'strict_lock') guardrailSection += ` --no-audio --zoom 0`;
  else if (exportMode === 'web_alpha') guardrailSection = `[RULE] Ultra-sharp edges. Zero wide glow. Particles dissolve before edges. ${guardrails} --no-audio --zoom 0`;

  if (targetModel === 'luma') {
    const refInst = animationMode === 'intro' ? 'CRITICAL: Image represents FINAL frame. Video MUST start completely black (Frame 0).' : 'Use image exactly as first frame reference.';
    return `Create a breathtaking Hollywood title sequence. Isolated 2D typography on pure #000000. Masterpiece, photorealistic cinematic lighting. ${refInst} 100% static camera. Zero zoom/pan/depth drift. Preserve exact text size.\nOuter silhouette is completely frozen, but internal textures/motifs animate vividly.\n${animationMode === 'transition' ? `Cinematic material transition. ${flowOpt.trans_en} Surface converts into ${tMat.base}.` : animationMode === 'intro' ? `Intro Reveal. ${introOpt.en} Fully visible by ${layers.duration}.` : `Seamless ${layers.duration} loop. ${flowOpt.loop_en} Dormant start, peak at ${halfway}s, completely dormant end.`}\nApply overlays: ${sOpt.en} ${eOpt.en} ${aOpt.en}\nDynamics: ${dynamics} (${intensity}). Razor-sharp readability. Zero lens flares, external lasers, volumetric light. Confine FX to text surface. ${guardrails} --no-audio --zoom 0`;
  }
  return `${modelInjection}Isolated 2D typography motion on pure #000000.\n${cinematicTone}${lockSection}\n${loopSection}\n${motionSection}\n${fxSection}\n${guardrailSection}`;
};

const DEFAULT_LAYERS = { surface: 'metallic_sweep', edge: 'rim_trace', ambient: 'none', intensity: 'subtle', duration: '5s', flow: 'contour_trace', intro: 'fade_in', dynamics: 'smooth' };

// Main hook: motion-prompt state + computed output. The current animationMode
// determines which FX option lists are available.
export function useMotionPrompt() {
  const [animationMode, setAnimationMode] = useState('loop');
  const [targetModel, setTargetModel] = useState('universal');
  const [targetMaterial, setTargetMaterial] = useState('ice');
  const [vfxTarget, setVfxTarget] = useState('all');
  const [isOptimized, setIsOptimized] = useState(true);
  const [exportMode, setExportMode] = useState('production');
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [surfaceOptions, setSurfaceOptions] = useState(LOOP_SURFACE_FX);
  const [edgeOptions, setEdgeOptions] = useState(LOOP_EDGE_FX);
  const [ambientOptions, setAmbientOptions] = useState(LOOP_AMBIENT_FX);

  // animationMode change → swap option lists + keep selection valid
  useEffect(() => {
    let newSurf; let newEdge; let newAmb;
    if (animationMode === 'loop') { newSurf = LOOP_SURFACE_FX; newEdge = LOOP_EDGE_FX; newAmb = LOOP_AMBIENT_FX; }
    else if (animationMode === 'intro') { newSurf = INTRO_SURFACE_FX; newEdge = INTRO_EDGE_FX; newAmb = INTRO_AMBIENT_FX; }
    else { newSurf = TRANS_SURFACE_FX; newEdge = TRANS_EDGE_FX; newAmb = TRANS_AMBIENT_FX; }
    setSurfaceOptions(newSurf); setEdgeOptions(newEdge); setAmbientOptions(newAmb);
    setLayers((prev) => ({
      ...prev,
      surface: newSurf.some((o) => o.id === prev.surface) ? prev.surface : newSurf[0].id,
      edge: newEdge.some((o) => o.id === prev.edge) ? prev.edge : newEdge[0].id,
      ambient: newAmb.some((o) => o.id === prev.ambient) ? prev.ambient : newAmb[0].id,
    }));
  }, [animationMode]);

  const rawPromptData = useMemo(
    () => compileRawPrompt(layers, exportMode, animationMode, targetMaterial, vfxTarget, targetModel, surfaceOptions, edgeOptions, ambientOptions),
    [layers, exportMode, animationMode, targetMaterial, vfxTarget, targetModel, surfaceOptions, edgeOptions, ambientOptions],
  );
  const { optimizedText, logs } = useMemo(() => inspectAndOptimizePrompt(rawPromptData, targetModel), [rawPromptData, targetModel]);
  const activePrompt = isOptimized ? optimizedText : rawPromptData;
  const activeNegPrompt = useMemo(
    () => compileNegativePrompt(layers, exportMode, animationMode, targetModel, surfaceOptions, edgeOptions, ambientOptions),
    [layers, exportMode, animationMode, targetModel, surfaceOptions, edgeOptions, ambientOptions],
  );
  const currentMaxLimit = targetModel === 'kling' ? 2500 : (exportMode === 'lite_test' ? 1000 : 1200);

  // Layer 조합 audit — 모순/위험 패턴 감지 + one-click fix.
  const auditIssues = useMemo(
    () => performMotionAudit({ layers, exportMode, animationMode, targetModel, surfaceOptions, edgeOptions, ambientOptions }),
    [layers, exportMode, animationMode, targetModel, surfaceOptions, edgeOptions, ambientOptions],
  );

  // audit fix 의 patch 객체를 해당 setter 로 분배 적용. fix 옵션 버튼이 호출.
  const applyAuditFix = useCallback((patch) => {
    if (!patch) return;
    if (patch.layers) setLayers(patch.layers);
    if (patch.exportMode) setExportMode(patch.exportMode);
    if (patch.animationMode) setAnimationMode(patch.animationMode);
  }, []);

  return {
    animationMode, setAnimationMode,
    targetModel, setTargetModel,
    targetMaterial, setTargetMaterial,
    vfxTarget, setVfxTarget,
    isOptimized, setIsOptimized,
    exportMode, setExportMode,
    layers, setLayers,
    surfaceOptions, setSurfaceOptions,
    edgeOptions, setEdgeOptions,
    ambientOptions, setAmbientOptions,
    rawPromptData, optimizedText, logs,
    activePrompt, activeNegPrompt,
    currentMaxLimit,
    auditIssues, applyAuditFix,
    DEFAULT_LAYERS,
  };
}
