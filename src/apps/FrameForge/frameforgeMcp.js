// Browser-independent FrameForge bridge for Node/MCP.
// 앱과 같은 축·빌더(frameforgeAxes.js)를 그대로 쓴다 — 예전엔 실루엣 목록을 복제해 들고 있어 앱과 MCP 가 어긋났다.
import { COMPLETE_AXES, SIMPLE_MOODS, SIMPLE_RENDER_STYLES, BRANDWEB_KITS, buildCompletePrompt, buildKitSeeds, seedAspectRatio } from './frameforgeAxes.js';

export const FRAMEFORGE_ASSET_TYPES = COMPLETE_AXES.assetType.opts;
export const FRAMEFORGE_SILHOUETTES = COMPLETE_AXES.silhouette.opts;
export const FRAMEFORGE_MOODS = SIMPLE_MOODS;
export const FRAMEFORGE_RENDER_STYLES = SIMPLE_RENDER_STYLES;
export const FRAMEFORGE_KITS = BRANDWEB_KITS;
export { seedAspectRatio, buildKitSeeds };

// 무드 → 스타일 축 옵션 객체. 앱의 '2. 어떤 느낌인가요?' 버튼과 같은 매핑.
export function frameForgeSharedAxes(mood, renderStyle) {
  const A = COMPLETE_AXES;
  return {
    preset: A.preset.opts.find((o) => o.key === mood.preset) || A.preset.opts[0],
    material: A.material.opts.find((o) => o.ko === mood.material) || A.material.opts[0],
    ornament: A.ornament.opts.find((o) => o.ko === mood.ornament) || A.ornament.opts[0],
    frameWeight: A.frameWeight.opts[0],
    interior: A.interior.opts.find((o) => o.key === 'empty') || A.interior.opts[0],
    renderStyle: A.renderStyle.opts.find((o) => o.key === renderStyle.key) || A.renderStyle.opts[0],
  };
}

export function buildFrameForgeMcpPrompt({ assetType, silhouette, mood, renderStyle, userText = '' }) {
  const seed = { ...frameForgeSharedAxes(mood, renderStyle), assetType, silhouette };
  return buildCompletePrompt(seed, userText);
}
