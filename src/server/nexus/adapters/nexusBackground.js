import { STRENGTHS, chooseEngine, renderGoogleBackground, renderLocalBackground } from '../backgroundEnhancer.js';

export const nexusBackgroundAdapter = {
  id: 'nexus-background',
  actions: ['enhance'],
  async run({ action, input = {} }) {
    if (action !== 'enhance') throw new Error(`Unsupported action: ${action}`);
    const image = String(input.image || '');
    if (!image || image.length > 12_000_000) throw new Error('Image is missing or too large');
    const strength = STRENGTHS.has(input.strength) ? input.strength : 'standard';
    const requestedEngine = input.engine || 'google';
    const engine = chooseEngine(requestedEngine, input);
    if (engine === 'google') {
      const key = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_BRANDWEB;
      if (!key) throw new Error('Google rendering is unavailable: GEMINI_API_KEY is not configured');
      const dataUrl = await renderGoogleBackground(image, { ...input, strength }, key);
      return { engine, requestedEngine, strength, dataUrl };
    }
    const dataUrl = await renderLocalBackground(image, strength);
    return { engine, requestedEngine, strength, dataUrl };
  },
};
