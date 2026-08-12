const GOOGLE_ORIGIN = 'https://generativelanguage.googleapis.com';

const ALLOWED_MODELS = new Set([
  'gemini-3-pro-image-preview',
  'gemini-3.1-flash-image-preview',
]);
const ALLOWED_SIZES = new Set(['1K', '2K', '4K']);
const ALLOWED_RATIOS = new Set(['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9']);

export async function runGoogleImage({ prompt, image, model = 'gemini-3-pro-image-preview', imageSize = '2K', aspectRatio = '1:1' }) {
  const key = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_BRANDWEB;
  if (!key) throw new Error('Server GEMINI_API_KEY is not configured');
  if (!ALLOWED_MODELS.has(model)) throw new Error(`Model not allowed: ${model}`);
  if (!prompt || prompt.length > 30000) throw new Error('Invalid prompt length');
  if (imageSize && !ALLOWED_SIZES.has(imageSize)) throw new Error(`Invalid image size: ${imageSize}`);
  if (aspectRatio && !ALLOWED_RATIOS.has(aspectRatio)) throw new Error(`Invalid aspect ratio: ${aspectRatio}`);

  const parts = [];
  if (image?.data) {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(image.mimeType)) throw new Error('Unsupported image type');
    if (image.data.length > 4_000_000) throw new Error('Reference image too large');
    parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
  }
  parts.push({ text: prompt });

  const generationConfig = { responseModalities: ['IMAGE', 'TEXT'], imageConfig: { aspectRatio } };
  if (model.includes('3-pro')) generationConfig.imageConfig.imageSize = imageSize;
  const url = `${GOOGLE_ORIGIN}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts }], generationConfig }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json?.error?.message || `Google image request failed (${response.status})`);
  return json;
}

export function extractGeneratedImage(json) {
  const parts = json?.candidates?.flatMap((candidate) => candidate?.content?.parts || []) || [];
  const imagePart = parts.find((part) => part.inlineData?.data);
  if (!imagePart) throw new Error('Image engine returned no image');
  return {
    mimeType: imagePart.inlineData.mimeType || 'image/png',
    data: imagePart.inlineData.data,
    text: parts.filter((part) => typeof part.text === 'string').map((part) => part.text).join('\n').trim(),
  };
}
