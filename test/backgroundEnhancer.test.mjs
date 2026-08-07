import assert from 'node:assert/strict';
import { buildBackgroundPrompt, chooseEngine } from '../src/server/nexus/backgroundEnhancer.js';

assert.equal(chooseEngine('auto', { quality: 'preview' }), 'local');
assert.equal(chooseEngine('auto', { quality: 'final' }), 'google');
assert.equal(chooseEngine('auto', { forceGenerative: true }), 'google');
assert.equal(chooseEngine('local', { quality: 'final' }), 'local');
assert.match(buildBackgroundPrompt({ concept: 'spring forest' }), /spring forest/);
assert.match(buildBackgroundPrompt({}), /Do not add, remove, redraw or move/);
console.log('backgroundEnhancer tests passed');
