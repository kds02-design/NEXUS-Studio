// 아이템 꾸러미 · 4레이어(PSD) 렌더 — 아이템을 먼저 렌더한 뒤 그 결과를 "형태 참고"로
// 후광·바닥광·전방 이펙트를 각각 "빛만 순흑"으로 렌더 → 각 레이어 투명화 → 레이어드 PSD 조립.
//
//   renderBundleLayers(itemUrls, opts) → { psdBlob, previewDataUrl, layers, width, height }
//
// 레이어 구성(아래→위): 후광(Screen) · 바닥광(Screen) · 아이템(Normal) · 전방 이펙트(Screen)
// - 아이템: 순흑 배경에 클러스터만 렌더 → 색상 키(구멍 보호) 투명화.
// - 이펙트 3종: lightfx 서비스로 오브젝트 없이 빛만 순흑에 렌더(아이템을 참고로 위치 정렬) →
//   이펙트 추출(luma=알파, 헤일로 제거)로 Screen/Add 합성용 straight-alpha PNG.
import { renderItemBundle } from "./bgTools";
import { renderLightFx } from "../../RubiconForge/services/lightfx";
import { colorKeyToTransparentPng } from "../../../lib/colorKeyExtract";
import { effectToTransparentPng } from "../../../lib/effectExtract";
import { buildLayeredPsd } from "./psdCompose";
import { RENDER_MODEL } from "./qualityEnhancer";

const probeSize = (dataUrl) => new Promise((resolve) => {
  if (!dataUrl) { resolve({ w: 0, h: 0 }); return; }
  const img = new Image();
  img.onload = () => resolve({ w: img.naturalWidth || img.width, h: img.naturalHeight || img.height });
  img.onerror = () => resolve({ w: 0, h: 0 });
  img.src = dataUrl;
});

// 이펙트 레이어 정의 — 아이템을 참고로 빛만 순흑에 렌더할 lightfx spec.
const FX_LAYERS = {
  back:   { key: "back",   name: "후광 (Back Glow)",     spec: { category: "halo",     style: "soft",      form: "iconBack" } },
  ground: { key: "ground", name: "바닥광 (Ground)",       spec: { category: "ground",   style: "realistic", form: "groundPool" } },
  front:  { key: "front",  name: "전방 이펙트 (Front FX)", spec: { category: "particle", style: "sharp",     form: "free" } },
};

export async function renderBundleLayers(itemUrls, {
  layout = "normal",
  intent = "",
  imageSize = "2K",
  modelId = RENDER_MODEL,
  color = "gold",       // lightfx 컬러 id (gold/crimson/cyan/violet/white/holo)
  intensity = "medium", // subtle/medium/strong
  backGlow = true,
  groundLight = true,
  frontEffect = true,
  onProgress,
} = {}) {
  if (!itemUrls?.length || itemUrls.length < 2) throw new Error("아이템 이미지가 2장 이상 필요합니다.");
  const report = (s) => { try { onProgress?.(s); } catch { /* noop */ } };

  // 1) 아이템 레이어 — 순흑 배경, 빛/바닥 이펙트 없이 클러스터만.
  report("아이템 렌더 중…");
  const itemsRaw = await renderItemBundle(itemUrls, {
    light: "none", ground: "none", bg: "black", layout, intent, imageSize, modelId,
  });
  if (!itemsRaw) throw new Error("아이템 렌더 결과가 비어 있습니다.");
  const { w: W, h: H } = await probeSize(itemsRaw);
  const itemsPng = await colorKeyToTransparentPng(itemsRaw, { bg: [0, 0, 0] });

  // 2) 이펙트 3종 — 아이템을 형태 참고로 빛만 순흑에 렌더 → 이펙트 추출.
  const renderFx = async (def, label) => {
    report(`${label} 렌더 중…`);
    const r = await renderLightFx({
      ...def.spec, color, intensity, bg: "black",
      referenceDataUrl: itemsRaw, imageSize, modelId, index: 0,
    });
    if (!r?.ok || !r.dataUrl) return null;
    try { return await effectToTransparentPng(r.dataUrl, { bg: [0, 0, 0] }); }
    catch { return null; }
  };

  const [backPng, groundPng, frontPng] = await Promise.all([
    backGlow ? renderFx(FX_LAYERS.back, "후광") : Promise.resolve(null),
    groundLight ? renderFx(FX_LAYERS.ground, "바닥광") : Promise.resolve(null),
    frontEffect ? renderFx(FX_LAYERS.front, "전방 이펙트") : Promise.resolve(null),
  ]);

  // 3) PSD 조립 — 아래→위: 후광 · 바닥광 · 아이템 · 전방.
  report("PSD 합성 중…");
  const layerDefs = [
    backPng && { name: FX_LAYERS.back.name, dataUrl: backPng, blendMode: "screen", opacity: 1 },
    groundPng && { name: FX_LAYERS.ground.name, dataUrl: groundPng, blendMode: "screen", opacity: 1 },
    { name: "아이템 (Items)", dataUrl: itemsPng, blendMode: "normal", opacity: 1 },
    frontPng && { name: FX_LAYERS.front.name, dataUrl: frontPng, blendMode: "screen", opacity: 1 },
  ].filter(Boolean);

  const { blob, previewDataUrl, width, height } = await buildLayeredPsd(layerDefs, { width: W, height: H });

  return {
    psdBlob: blob,
    previewDataUrl,
    width, height,
    layers: {
      items: itemsPng,
      back: backPng,
      ground: groundPng,
      front: frontPng,
    },
  };
}
