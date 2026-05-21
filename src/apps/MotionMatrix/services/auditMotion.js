// Motion 프롬프트 layer 조합의 모순/위험 패턴을 감지하고 one-click fix 옵션을 제시.
// RenderMatrix 의 performLogicAudit 와 동일한 패턴: { code, title, desc, fixes: [{ label, patch }] }
// patch 는 { layers?, exportMode?, animationMode? } — useMotionPrompt 의 applyAuditFix 가 setter 들에 분배.

export function performMotionAudit({ layers, exportMode, animationMode, targetModel, surfaceOptions, edgeOptions, ambientOptions }) {
  const issues = [];
  if (!layers) return issues;
  const sOpt = surfaceOptions?.find((o) => o.id === layers.surface);
  const eOpt = edgeOptions?.find((o) => o.id === layers.edge);
  const aOpt = ambientOptions?.find((o) => o.id === layers.ambient);

  // 1. 무한 루프 + 무작위 강약: 끝점이 시작점과 자연스럽게 맞지 않음
  if (animationMode === 'loop' && layers.dynamics === 'erratic_bursts') {
    issues.push({
      code: 'LOOP_ERRATIC_CLASH',
      title: '무한 루프 ↔ 불규칙 강약 충돌',
      desc: 'Erratic Bursts 는 무작위로 강도가 튀는 dynamic 이라 루프의 끝점이 시작점과 어색하게 끊깁니다.',
      fixes: [
        { label: 'A. Smooth & Steady', patch: { layers: { ...layers, dynamics: 'smooth' } } },
        { label: 'B. Internal Build-up', patch: { layers: { ...layers, dynamics: 'organic_swell' } } },
      ],
    });
  }

  // 2. 인트로 등장 + 외곽 침식 흐름: 안→밖 확장이 아니라 모서리→안 침식이라 0→full 등장과 안 맞음
  if (animationMode === 'intro' && layers.flow === 'edge_creep') {
    issues.push({
      code: 'INTRO_FLOW_CLASH',
      title: '인트로 등장 ↔ 외곽 침식 흐름 충돌',
      desc: 'Edge Creep 은 모서리에서 안쪽으로 침식하는 흐름이라 0→100% 등장과 어울리지 않습니다.',
      fixes: [
        { label: 'A. Contour Trace', patch: { layers: { ...layers, flow: 'contour_trace' } } },
        { label: 'B. Core Pulse', patch: { layers: { ...layers, flow: 'core_radiate' } } },
      ],
    });
  }

  // 3. VFX 매트 추출 모드 + 원본 효과 살리기: 정확한 모순
  if (exportMode === 'vfx_pass' && layers.ambient === 'animate_existing') {
    issues.push({
      code: 'VFXPASS_AMBIENT_CLASH',
      title: 'VFX 매트 추출 ↔ 원본 효과 살리기 충돌',
      desc: 'VFX Pass 모드는 원본 이미지의 모든 텍스처를 검은 실루엣으로 덮는 모드인데, "원본 주변 효과 살리기" ambient 는 정반대로 원본 효과를 보존하려 합니다.',
      fixes: [
        { label: 'A. Ambient 끄기 (Clean Space)', patch: { layers: { ...layers, ambient: 'none' } } },
        { label: 'B. Production 모드로 전환', patch: { exportMode: 'production' } },
      ],
    });
  }

  // 4. 형태 변형 위험(shapeRisk=high) 효과가 surface + edge 양쪽에 중첩
  if (sOpt?.shapeRisk === 'high' && eOpt?.shapeRisk === 'high') {
    issues.push({
      code: 'HIGH_SHAPE_RISK_STACK',
      title: '형태 변형 위험 효과가 중첩됨',
      desc: 'Surface 와 Edge 양쪽 모두 shapeRisk=high 효과를 선택했습니다. 형태 변형 확률이 높아져 글자 외곽선이 무너질 수 있습니다.',
      fixes: [
        { label: 'A. Edge 효과 끄기', patch: { layers: { ...layers, edge: 'none' } } },
        { label: 'B. Surface 안전 효과 (Light Shimmer)', patch: { layers: { ...layers, surface: 'light_shimmer' } } },
      ],
    });
  }

  // 5. Web Alpha 모드 + alphaRisk=high ambient: 배경 오염으로 알파 추출이 더러워짐
  if (exportMode === 'web_alpha' && aOpt?.alphaRisk === 'high') {
    issues.push({
      code: 'WEB_ALPHA_DIRTY',
      title: 'Web Alpha 모드 ↔ 배경 오염 위험 효과 충돌',
      desc: 'Web Alpha 모드는 깔끔한 알파 추출이 목적인데, 현재 ambient 효과가 배경을 오염시킬 가능성이 높습니다.',
      fixes: [
        { label: 'A. Ambient 끄기 (Clean Space)', patch: { layers: { ...layers, ambient: 'none' } } },
        { label: 'B. Production 모드로 전환', patch: { exportMode: 'production' } },
      ],
    });
  }

  // 6. 짧은 duration + subtle intensity + organic_swell: 효과가 인지되지 않음
  if (layers.duration === '3s' && layers.intensity === 'subtle' && layers.dynamics === 'organic_swell') {
    issues.push({
      code: 'SUBTLE_INVISIBLE',
      title: '효과가 너무 미세해서 안 보일 가능성',
      desc: '3초 안에 Subtle + Internal Build-up 조합은 효과가 거의 인지되지 않습니다.',
      fixes: [
        { label: 'A. 강도 ↑ (Medium)', patch: { layers: { ...layers, intensity: 'medium' } } },
        { label: 'B. 시간 ↑ (5초)', patch: { layers: { ...layers, duration: '5s' } } },
      ],
    });
  }

  // 7. Kling 모델 + core_radiate flow + loop: core_radiate 의 안→밖 확장이 Kling 의 "외부 확산 억제" 가이드라인과 충돌
  if (targetModel === 'kling' && layers.flow === 'core_radiate' && animationMode === 'loop') {
    issues.push({
      code: 'KLING_FLOW_OUTWARD',
      title: 'Kling 모델 ↔ 안→밖 확장 흐름 충돌',
      desc: 'Kling 은 외곽선 고정 + 내부 활성화에 최적화된 모델인데, Core Pulse 흐름은 내부 에너지가 밖으로 퍼져 입자가 프레임을 이탈할 수 있습니다.',
      fixes: [
        { label: 'A. Contour Trace 로 변경', patch: { layers: { ...layers, flow: 'contour_trace' } } },
        { label: 'B. Linear Sweep 으로 변경', patch: { layers: { ...layers, flow: 'linear_sweep' } } },
      ],
    });
  }

  return issues;
}
