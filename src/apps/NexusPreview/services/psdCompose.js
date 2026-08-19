// 레이어드 PSD 조립 — 투명 PNG 레이어들을 블렌드 모드·순서 지정된 .psd 한 파일로 write.
// ag-psd(writePsd) 사용. 브라우저에서 각 레이어 dataURL → 캔버스 → PSD 레이어로 넣는다.
//
//   buildLayeredPsd(layers, { width, height }) → { blob, previewDataUrl, width, height }
//     layers: 아래→위 순서의 [{ name, dataUrl, blendMode, opacity }]
//     blendMode 는 ag-psd 표기(camelCase): "normal" | "screen" | "linearDodge" | "multiply" ...
//
// 문서 크기(width/height)를 주면 그 크기로, 없으면 첫 유효 레이어의 자연 크기로 맞춘다.
// 모든 레이어는 문서 크기로 스케일해 (0,0) 정렬 — 아이템/이펙트 렌더가 같은 비율이면 정합 유지.
import { writePsd } from "ag-psd";

const loadImg = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error("레이어 이미지를 읽지 못했습니다."));
  img.src = src;
});

// ag-psd blendMode(camelCase) → canvas globalCompositeOperation (컴포지트 프리뷰 생성용).
const PREVIEW_OP = {
  normal: "source-over", screen: "screen", linearDodge: "lighter",
  multiply: "multiply", lighten: "lighten", overlay: "overlay",
};

async function toCanvas(dataUrl, W, H) {
  const img = await loadImg(dataUrl);
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0, W, H);
  return c;
}

export async function buildLayeredPsd(layers, { width, height } = {}) {
  const valid = (layers || []).filter((l) => l && l.dataUrl);
  if (!valid.length) throw new Error("합칠 레이어가 없습니다.");

  // 문서 크기 결정 — 지정값 우선, 없으면 첫 유효 레이어 자연 크기.
  let W = Math.round(width || 0), H = Math.round(height || 0);
  if (!W || !H) {
    const first = await loadImg(valid[0].dataUrl);
    W = first.naturalWidth || first.width;
    H = first.naturalHeight || first.height;
  }
  if (!W || !H) throw new Error("문서 크기를 결정할 수 없습니다.");

  // 각 레이어를 문서 크기 캔버스로.
  const children = [];
  for (const l of valid) {
    const canvas = await toCanvas(l.dataUrl, W, H);
    children.push({
      name: l.name || "layer",
      canvas,
      blendMode: l.blendMode || "normal",
      opacity: l.opacity == null ? 1 : l.opacity,
      hidden: false,
    });
  }

  // 컴포지트 프리뷰 — 문서 미리보기(썸네일)이자 UI 표시용. children 은 아래→위 순서.
  const preview = document.createElement("canvas");
  preview.width = W; preview.height = H;
  const pctx = preview.getContext("2d");
  children.forEach((ch, idx) => {
    pctx.globalCompositeOperation = idx === 0 ? "source-over" : (PREVIEW_OP[ch.blendMode] || "source-over");
    pctx.globalAlpha = ch.opacity;
    pctx.drawImage(ch.canvas, 0, 0);
  });
  pctx.globalAlpha = 1;
  pctx.globalCompositeOperation = "source-over";

  const psd = { width: W, height: H, canvas: preview, children };
  const buffer = writePsd(psd);
  const blob = new Blob([buffer], { type: "image/vnd.adobe.photoshop" });
  return { blob, previewDataUrl: preview.toDataURL("image/png"), width: W, height: H };
}
