import { buildLightFxPrompt, buildCompactLightFxPrompt } from '../../../apps/RubiconForge/services/lightfx.js';
import { runGoogleImage, extractGeneratedImage } from '../googleImageRunner.js';

export const rubiconLightFxAdapter = {
  id: 'rubicon-lightfx',
  actions: ['generate-lightfx'],
  async run({ action, input = {}, render = {} }) {
    if (action !== 'generate-lightfx') throw new Error(`Unsupported action: ${action}`);
    const prompt = buildLightFxPrompt(input);
    const compactPrompt = buildCompactLightFxPrompt(input);
    const raw = await runGoogleImage({ prompt, image: render.image, model: render.model, imageSize: render.imageSize, aspectRatio: render.aspectRatio });
    return { engine: 'RubiconForge.buildLightFxPrompt', prompt, compactPrompt, image: extractGeneratedImage(raw) };
  },
};
