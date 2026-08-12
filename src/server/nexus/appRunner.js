const adapterDefinitions = new Map([
  ['nexus-background', { actions: ['enhance'], load: () => import('./adapters/nexusBackground.js').then((m) => m.nexusBackgroundAdapter) }],
  ['typecore-breeze', { actions: ['generate-flat'], load: () => import('./adapters/typecoreBreeze.js').then((m) => m.typecoreBreezeAdapter) }],
  ['typecore-sovereign', { actions: ['generate-flat'], load: () => import('./adapters/typecoreSovereign.js').then((m) => m.typecoreSovereignAdapter) }],
  ['render-matrix', { actions: ['render-material'], load: () => import('./adapters/renderMatrix.js').then((m) => m.renderMatrixAdapter) }],
  ['rubicon-lightfx', { actions: ['generate-lightfx'], load: () => import('./adapters/rubiconLightFx.js').then((m) => m.rubiconLightFxAdapter) }],
]);

export function listNexusAppAdapters() {
  return [...adapterDefinitions.entries()].map(([id, { actions }]) => ({ id, actions }));
}

export async function runNexusApp(request) {
  const app = String(request?.app || '');
  const action = String(request?.action || '');
  const definition = adapterDefinitions.get(app);
  if (!definition) throw new Error(`Unknown Nexus app: ${app}`);
  if (!definition.actions.includes(action)) throw new Error(`Unsupported ${app} action: ${action}`);
  const adapter = await definition.load();
  const startedAt = Date.now();
  const result = await adapter.run({ action, input: request.input, render: request.render });
  return { ok: true, app, action, elapsedMs: Date.now() - startedAt, ...result };
}
