import { buildPrompts } from '../../../apps/TypecoreBreeze/hooks/useBreezePrompt.js';
import { runGoogleImage, extractGeneratedImage } from '../googleImageRunner.js';

export const typecoreBreezeAdapter = {
  id: 'typecore-breeze',
  actions: ['generate-flat'],
  async run({ action, input = {}, render = {} }) {
    if (action !== 'generate-flat') throw new Error(`Unsupported action: ${action}`);
    const compiled = buildPrompts(input);
    const prompt = compiled.imagenPrompt || compiled.baseTechnicalEn || compiled.outputContent;
    if (!prompt) throw new Error('Breeze engine did not produce an Imagen prompt');
    const raw = await runGoogleImage({ prompt, image: render.image, model: render.model, imageSize: render.imageSize, aspectRatio: render.aspectRatio });
    return { engine: 'TypecoreBreeze.buildPrompts', compiled, image: extractGeneratedImage(raw) };
  },
};
