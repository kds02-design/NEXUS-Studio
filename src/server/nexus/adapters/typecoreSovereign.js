import { TYPECORE_VERSION } from '../../../apps/TypecoreSovereign/versions/current/constants/utils.js';
import { runGoogleImage, extractGeneratedImage } from '../googleImageRunner.js';

export const typecoreSovereignAdapter = {
  id: 'typecore-sovereign',
  actions: ['generate-flat'],
  async run({ action, input = {}, render = {} }) {
    if (action !== 'generate-flat') throw new Error(`Unsupported action: ${action}`);
    const prompt = String(input.imagenPrompt || '').trim();
    if (!prompt) {
      throw new Error('Sovereign requires input.imagenPrompt compiled by the current Typecore engine. The UI hook must be extracted before high-level state can be accepted safely.');
    }
    const raw = await runGoogleImage({ prompt, image: render.image, model: render.model, imageSize: render.imageSize, aspectRatio: render.aspectRatio });
    return { engine: 'TypecoreSovereign', engineVersion: TYPECORE_VERSION, prompt, image: extractGeneratedImage(raw) };
  },
};
