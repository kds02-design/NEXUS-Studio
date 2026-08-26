import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLightFxPrompt, buildCompactLightFxPrompt } from '../src/apps/RubiconForge/services/lightfx.js';

const base = {
  categoryHint: 'fine luminous particles and short light streaks',
  styleHint: 'premium restrained cinematic light',
  colorHint: 'warm golden light',
  intensity: 'subtle',
  hasRef: true,
  bg: { id: 'black', label: '블랙', hex: '#000000' },
};

test('character outline mode remains sparse and edge-bound', () => {
  const prompt = buildLightFxPrompt({
    ...base,
    formHint: 'localized aura along selected character edges',
    edgeHug: true,
  });
  assert.match(prompt, /EDGE-HUGGING DETAIL/);
  assert.match(prompt, /almost entirely dark\/empty/);
  assert.match(prompt, /NO REPRODUCED OBJECTS/);
});

test('title and item foreground mode stays in front without reproducing subjects', () => {
  const prompt = buildLightFxPrompt({
    ...base,
    formHint: 'foreground accents across selected lower edges',
    refMode: 'front',
  });
  const compact = buildCompactLightFxPrompt({
    ...base,
    formHint: 'foreground accents across selected lower edges',
    refMode: 'front',
  });
  assert.match(prompt, /FOREGROUND ACCENT MODE/);
  assert.match(prompt, /Do NOT trace the full silhouette/);
  assert.match(compact, /FOREGROUND ACCENT — LIGHT ONLY/);
  assert.match(compact, /Do NOT reproduce/);
});
