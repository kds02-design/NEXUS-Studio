import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LOOP_SURFACE_FX, LOOP_EDGE_FX, LOOP_AMBIENT_FX,
  INTRO_SURFACE_FX, INTRO_EDGE_FX, INTRO_AMBIENT_FX,
  TRANS_SURFACE_FX, TRANS_EDGE_FX, TRANS_AMBIENT_FX,
} from '../constants/presets';
import { performMotionAudit } from '../services/auditMotion';

// 순수 컴파일러(compileRawPrompt / compileNegativePrompt / inspectAndOptimizePrompt / DEFAULT_LAYERS)는
// services/motionCompiler.js 로 이동 — MCP(nexus_motion_prompt)와 공유. 기존 import 경로 호환용 재수출.
import { DEFAULT_LAYERS, inspectAndOptimizePrompt, compileNegativePrompt, compileRawPrompt } from '../services/motionCompiler.js';
export { DEFAULT_LAYERS, inspectAndOptimizePrompt, compileNegativePrompt, compileRawPrompt };

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
