import { generateIR, compileNanoBanana, performLogicAudit, calculateQualityScore } from '../../../apps/RenderMatrix/services/promptCompiler.js';
import { runGoogleImage, extractGeneratedImage } from '../googleImageRunner.js';

export const renderMatrixAdapter = {
  id: 'render-matrix',
  actions: ['render-material'],
  async run({ action, input = {}, render = {} }) {
    if (action !== 'render-material') throw new Error(`Unsupported action: ${action}`);
    if (!input.state || !input.appOptions) throw new Error('Render Matrix requires input.state and input.appOptions');
    const ir = generateIR(input.state, input.appOptions);
    const prompt = compileNanoBanana(ir, input.state);
    const audit = performLogicAudit(input.state);
    const quality = calculateQualityScore(input.state);
    const raw = await runGoogleImage({ prompt, image: render.image, model: render.model, imageSize: render.imageSize, aspectRatio: render.aspectRatio });
    return { engine: 'RenderMatrix.promptCompiler', ir, audit, quality, prompt, image: extractGeneratedImage(raw) };
  },
};
