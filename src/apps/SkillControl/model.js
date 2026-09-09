export const STORAGE_KEY = "nexus:skill-control:v1";

export const TITLE_RENDER_DEFAULTS = {
  renderProvider: "nexus-google",
  renderModel: "gemini-3-pro-image-preview",
  renderSize: "1K",
  providerRoute: "/api/codex-imagen",
  matrixSource: "render-metrics",
  matrixGroup: "banner",
  matrixPreset: "banner_season",
  matrixStyleId: "BANNER-001",
  editBudget: "Locked",
  intensity: "T2",
  shapePreserved: true,
  matchInputAspect: true,
  materialReferenceRequired: true,
  alphaRoute: "nexus-mask-forge",
  alphaQA: "required",
  matte: "pure-black",
  outputContract: "TITLE_MATERIAL_MASTER > TITLE_ALPHA_MASTER",
};

export const DEFAULT_MODEL = {
  schemaVersion: 5,
  updatedAt: null,
  stages: [
    { id: "01-request-analysis", order: 1, label: "요청·자원 분석", enabled: true, lock: "controlled", skills: ["game-banner-automation"], gate: "요청·원본·문구·규격·권한 잠금", settings: { sourcePolicy: "immutable", requestedGameSource: "request", workingCopyMaxWidth: 1920, workflowGate: "active-stage-only", profileBeforeStage6: false } },
    { id: "02-layout-selection", order: 2, label: "레이아웃 선택", enabled: true, lock: "locked", skills: ["photographer-layout"], gate: "공유 40종 전체 순위 + 측정 blueprint 잠금", settings: { catalogMode: "shared-pool", catalog: "aion-bns-shared-40", rankCount: 40, sourceGameWeight: "disabled", masterFrame: "1180x750", blueprintRequired: true, characterCropContract: true, fitMode: "cover-from-landmarks" } },
    { id: "03-title-shape", order: 3, label: "타이틀 형태", enabled: true, lock: "controlled", skills: ["typecore-title", "gpt-banner-title", "nexus-imagen-render"], gate: "정확한 글자·행·자연 장평·실루엣 잠금 + 명시적 후보 승인", settings: { titleModePriority: "repeat-update>reference-remap>creative-new", approvedLibraryFirst: true, enginePolicy: "auto", candidateCount: 2, approvalRequired: true, generationMatte: "pure-black", allowTransparencyPrompt: false, singleLineRatioTolerance: "±2%", canvasArtworkRatioSeparated: true, glyphAspectRatioRange: "0.78–1.15", horizontalGlyphCondensation: "forbidden-by-default", longSingleLineCanvasRatio: "2.76:1", longSingleLineWidthOccupancy: "90%", topBottomWhitespace: "auto-from-visible-title-ratio", proxyRecompositionMinLength: 9 } },
    { id: "04-title-render", order: 4, label: "타이틀 렌더", enabled: true, lock: "locked", skills: ["gpt-banner-title", "nexus-imagen-render", "nexus-mask-forge"], gate: "shapePreserved + preset fidelity + alpha QA", settings: { ...TITLE_RENDER_DEFAULTS } },
    { id: "05-image-enhancement", order: 5, label: "이미지 향상", enabled: true, lock: "controlled", skills: ["nexus-kv-enhance", "nexus-imagen-render", "nexus-character-identity-restore", "nexus-effect-extractor", "rubicon-item-effect-template"], gate: "layoutPreserved + identityPreserved + aligned canvas", settings: { productionEngine: "google", quality: "final", productionRoute: "/api/codex-imagen", maxWorkingWidth: 1920, operationOrder: "배경 > 캐릭터 비생성 그레이드 또는 승인된 향상+원본 복원 > 캐릭터 FX > 아이템 > 정렬 효과", characterEnhancementPolicy: "non-generative-default", identityRestoreWhen: "approved-generative-candidate", identityRestoreAlphaAuthority: "source", identityRestoreMaxRounds: 2, identityPreserved: true, effectCutoff: 6, effectGamma: 0.85, effectOpacity: 100, recoverColor: true, smokeOpacityRange: "15–25%", itemCandidateCount: 2, itemOpeningRange: "20–35", itemFrontCrossRange: "5–12" } },
    { id: "06-master-assembly", order: 6, label: "1180 마스터", enabled: true, lock: "locked", skills: ["figma-use", "nexus-design-evaluator", "game-profile"], gate: "10지표 평가 통과 + 명시적 최종 승인", settings: { profileActivationStage: "06-master-assembly", figmaGeometryReadback: true, evaluationMetricCount: 10, approvalRequired: true, maxRounds: 3, stallRounds: 2, minimumGain: 1, hardFailures: "문구·날짜·로고 오류, 클리핑, 투명화 파손, 캐릭터/FX 오정렬" } },
    { id: "07-variant-assembly", order: 7, label: "변형·납품", enabled: true, lock: "locked", skills: ["figma-use", "photographer-layout", "game-profile"], gate: "dimension·alpha·text·brand PASS + assert-delivery", settings: { propagationMode: "independent-recompose", preserveIntent: "impact-thesis-reading-order", fitMode: "cover-from-landmarks", deliveryChecks: "규격, 실제 알파, 문구, 브랜드, 크롭 계약", assertDelivery: true } },
  ],
  skills: [
    { id: "game-banner-automation", name: "Game Banner Automation", mode: "on", kind: "orchestrator", parentId: null, stages: ["01-request-analysis"], description: "7단계 상태·증거 게이트와 게임 프로필 경계를 관리합니다.", capabilities: ["workflow gate", "dependency invalidation", "delivery assertion"], outputs: ["workflow-state", "delivery-validation"] },
    { id: "photographer-layout", name: "Photographer Layout", mode: "on", kind: "specialist", parentId: null, stages: ["02-layout-selection", "07-variant-assembly"], description: "공유 레이아웃 풀, 캐릭터 크롭 계약, 멀티사이즈 구도를 관리합니다.", capabilities: ["layout ranking", "crop contract", "multi-size composition"], outputs: ["layout-blueprint-lock", "character-crop-contract"] },
    { id: "typecore-title", name: "Typecore Title", mode: "on", kind: "specialist", parentId: null, stages: ["03-title-shape"], description: "승인 레퍼런스와 반복 타이틀 라이브러리로 정확한 형태를 만듭니다.", capabilities: ["library reuse", "shape remap", "Hangul structure"], outputs: ["title-shape-lock"] },
    { id: "gpt-banner-title", name: "GPT Banner Title", mode: "auto", kind: "specialist", parentId: null, stages: ["03-title-shape", "04-title-render"], description: "새로운 타이틀 형태·재질·FX 방향이 필요할 때 호출합니다.", capabilities: ["new shape", "material render", "title FX"], outputs: ["opaque title source"] },
    { id: "nexus-mask-forge", name: "Nexus Mask Forge", mode: "on", kind: "utility", parentId: null, stages: ["04-title-render", "05-image-enhancement"], description: "고형 피사체의 어두운 재질과 내부 구멍을 보존해 투명화합니다.", capabilities: ["solid alpha", "dark preservation", "alpha QA"], outputs: ["transparent PNG", "alpha report"] },
    { id: "nexus-kv-enhance", name: "Nexus KV Enhance", mode: "on", kind: "orchestrator", parentId: null, stages: ["05-image-enhancement"], description: "배경과 캐릭터를 잠긴 구도 안에서 통합 개선합니다.", capabilities: ["background quality", "character integration", "light FX routing"], outputs: ["image-enhancement-manifest"] },
    { id: "nexus-imagen-render", name: "Nexus Imagen Render", mode: "auto", kind: "engine", parentId: "nexus-kv-enhance", stages: ["03-title-shape", "04-title-render", "05-image-enhancement"], description: "보호된 Nexus Google API로 타이틀 형태·재질과 참조 보존 렌더 후보를 생성합니다.", capabilities: ["flat title candidates", "title material 1K", "1K-4K render", "reference preservation"], outputs: ["title shape candidates", "title material master", "render candidate"] },
    { id: "nexus-character-identity-restore", name: "Nexus Character Identity Restore", mode: "auto", kind: "utility", parentId: "nexus-kv-enhance", stages: ["05-image-enhancement"], description: "향상된 캐릭터 위에 얼굴·손·문양 등 중요 부위의 원본 픽셀과 권위 알파를 복원합니다.", capabilities: ["identity protection mask", "original RGB restore", "source alpha authority", "seam QA"], outputs: ["identity-restored character", "protection mask", "QA report"] },
    { id: "nexus-effect-extractor", name: "Nexus Effect Extractor", mode: "auto", kind: "utility", parentId: "nexus-kv-enhance", stages: ["05-image-enhancement"], description: "빛·연기·오라·입자판을 정렬된 RGBA로 변환합니다.", capabilities: ["emissive alpha", "color recovery", "canvas alignment"], outputs: ["FX RGBA", "QA report"] },
    { id: "rubicon-item-effect-template", name: "Rubicon Item Effect", mode: "auto", kind: "specialist", parentId: "nexus-kv-enhance", stages: ["05-image-enhancement"], description: "아이템을 감싸는 후면·접촉·전면 효과 스택을 만듭니다.", capabilities: ["FX_BACK", "CONTACT", "OBJECT", "FX_FRONT"], outputs: ["aligned item stack"] },
    { id: "figma-use", name: "Figma Assembly", mode: "on", kind: "bridge", parentId: null, stages: ["06-master-assembly", "07-variant-assembly"], description: "역할 레이어를 조립하고 실제 지오메트리를 다시 읽습니다.", capabilities: ["editable roles", "live geometry", "frame variants"], outputs: ["node IDs", "frame manifest"] },
    { id: "nexus-design-evaluator", name: "Nexus Design Evaluator", mode: "on", kind: "quality", parentId: null, stages: ["06-master-assembly"], description: "10개 지표와 하드 실패로 마스터를 평가합니다.", capabilities: ["10 metrics", "hard failures", "layer-scoped corrections"], outputs: ["evaluation report"] },
    { id: "game-profile", name: "Game Profile", mode: "on", kind: "policy", parentId: null, stages: ["06-master-assembly", "07-variant-assembly"], description: "게임별 로고·배지·프레임·보호영역 차이만 정의합니다.", capabilities: ["brand routing", "frame roles", "delivery exceptions"], outputs: ["game-profile-lock"] },
  ],
  runs: [
    {
      id: "sample-run",
      campaign: "예시 · 시즌 업데이트 배너",
      game: "Sample",
      sample: true,
      status: "complete",
      createdAt: "2026-08-28T09:00:00+09:00",
      stages: [
        { stageId: "01-request-analysis", active: 18, wait: 12, attempts: 1, gate: "pass" },
        { stageId: "02-layout-selection", active: 42, wait: 8, attempts: 1, gate: "pass" },
        { stageId: "03-title-shape", active: 34, wait: 28, attempts: 2, gate: "pass" },
        { stageId: "04-title-render", active: 49, wait: 44, attempts: 3, gate: "pass" },
        { stageId: "05-image-enhancement", active: 71, wait: 96, attempts: 3, gate: "pass" },
        { stageId: "06-master-assembly", active: 36, wait: 82, attempts: 2, gate: "pass" },
        { stageId: "07-variant-assembly", active: 51, wait: 14, attempts: 1, gate: "pass" },
      ],
    },
  ],
  improvements: [
    { id: "IMP-01", title: "05단계 렌더 대기 분리", cause: "렌더와 검토 대기가 실작업에 섞여 있음", action: "active/wait 자동 계측 필드 추가", owner: "Pipeline", status: "open", priority: "high" },
    { id: "IMP-02", title: "타이틀 알파 재작업 감소", cause: "고형 피사체와 발광판 추출 경로 혼동", action: "Mask Forge / Effect Extractor 라우팅 검증", owner: "Title", status: "doing", priority: "medium" },
    { id: "IMP-03", title: "승인 대기 시간 기록", cause: "1180 승인 대기가 단계 시간에만 포함", action: "approvalWaitMinutes 이벤트 추가", owner: "Figma", status: "open", priority: "medium" },
  ],
  documentDrafts: {},
  changes: [],
};

export function cloneDefaultModel() {
  return JSON.parse(JSON.stringify(DEFAULT_MODEL));
}

export function normalizeModel(model) {
  if (!model || !Array.isArray(model.stages) || !Array.isArray(model.skills)) return cloneDefaultModel();
  const next = JSON.parse(JSON.stringify(model));
  const sourceSchemaVersion = Number(next.schemaVersion || 1);
  const titleStage = next.stages.find((stage) => stage.id === "04-title-render");
  if (titleStage) {
    titleStage.settings = { ...TITLE_RENDER_DEFAULTS, ...(titleStage.settings || {}) };
    titleStage.skills = Array.from(new Set([...(titleStage.skills || []), "nexus-imagen-render"]));
    titleStage.gate = "shapePreserved + preset fidelity + alpha QA";
  }
  const imagenSkill = next.skills.find((skill) => skill.id === "nexus-imagen-render");
  if (imagenSkill) imagenSkill.stages = Array.from(new Set(["03-title-shape", "04-title-render", ...(imagenSkill.stages || [])]));
  const imageStage = next.stages.find((stage) => stage.id === "05-image-enhancement");
  if (imageStage) imageStage.skills = Array.from(new Set([...(imageStage.skills || []), "nexus-character-identity-restore"]));
  if (!next.skills.some((skill) => skill.id === "nexus-character-identity-restore")) {
    next.skills.splice(
      Math.max(0, next.skills.findIndex((skill) => skill.id === "nexus-effect-extractor")),
      0,
      JSON.parse(JSON.stringify(DEFAULT_MODEL.skills.find((skill) => skill.id === "nexus-character-identity-restore"))),
    );
  }
  const defaultsByStage = Object.fromEntries(DEFAULT_MODEL.stages.map((stage) => [stage.id, stage.settings]));
  const stageContracts = Object.fromEntries(DEFAULT_MODEL.stages.map((stage) => [stage.id, stage]));
  next.stages = next.stages.map((stage) => {
    const contract = stageContracts[stage.id];
    if (!contract) return stage;
    const settings = sourceSchemaVersion < 3
      ? { ...(stage.settings || {}), ...(defaultsByStage[stage.id] || {}) }
      : { ...(defaultsByStage[stage.id] || {}), ...(stage.settings || {}) };
    return sourceSchemaVersion < 3
      ? { ...stage, label: contract.label, lock: contract.lock, skills: [...contract.skills], gate: contract.gate, settings }
      : { ...stage, settings };
  });
  const titleShapeStage = next.stages.find((stage) => stage.id === "03-title-shape");
  if (titleShapeStage) {
    delete titleShapeStage.settings.verticalScaleRange;
    if (sourceSchemaVersion < 5) {
      titleShapeStage.settings = { ...titleShapeStage.settings, ...DEFAULT_MODEL.stages.find((stage) => stage.id === "03-title-shape").settings };
      delete titleShapeStage.settings.verticalScaleRange;
      titleShapeStage.gate = DEFAULT_MODEL.stages.find((stage) => stage.id === "03-title-shape").gate;
    }
  }
  next.documentDrafts ||= {};
  next.schemaVersion = 5;
  return next;
}

export function loadModel() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefaultModel();
    const parsed = JSON.parse(raw);
    return normalizeModel(parsed);
  } catch {
    return cloneDefaultModel();
  }
}

export function saveModel(model) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...model, updatedAt: new Date().toISOString() }));
}

export function scoreRun(run) {
  if (!run?.stages?.length) return [];
  const total = run.stages.reduce((sum, item) => sum + Number(item.active || 0) + Number(item.wait || 0), 0) || 1;
  return run.stages.map((item) => {
    const active = Number(item.active || 0);
    const wait = Number(item.wait || 0);
    const cycle = active + wait;
    const cycleShare = cycle / total;
    const waitRatio = cycle ? wait / cycle : 0;
    const rework = Math.max(0, Number(item.attempts || 1) - 1);
    const fail = item.gate === "fail" ? 1 : 0;
    const score = Math.round(Math.min(1, cycleShare * 1.4 + waitRatio * 0.35 + rework * 0.12 + fail * 0.2) * 100);
    return { ...item, active, wait, cycle, cycleShare, waitRatio, score };
  }).sort((a, b) => b.score - a.score);
}
