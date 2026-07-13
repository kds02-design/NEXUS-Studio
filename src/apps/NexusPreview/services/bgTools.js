import { renderWithImagen } from "../../../lib/imagenRender";
import { RENDER_MODEL } from "./qualityEnhancer";

const loadImage = (src) => new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error("합성 이미지를 읽지 못했습니다.")); image.src = src; });

async function createComposeDraft(backgroundUrl, assetUrl) {
  if (!assetUrl) return backgroundUrl;
  const [bg, asset] = await Promise.all([loadImage(backgroundUrl), loadImage(assetUrl)]);
  const max = 2048, scale = Math.min(1, max / Math.max(bg.naturalWidth, bg.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bg.naturalWidth * scale); canvas.height = Math.round(bg.naturalHeight * scale);
  const ctx = canvas.getContext("2d"); ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
  const assetScale = Math.min((canvas.width * .38) / asset.naturalWidth, (canvas.height * .58) / asset.naturalHeight);
  const w = asset.naturalWidth * assetScale, h = asset.naturalHeight * assetScale;
  ctx.drawImage(asset, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  return canvas.toDataURL("image/png");
}

const composePrompt = (intent, hasAsset) => `게임 프로모션 KV 합성 전문가로 작업하세요. 입력 이미지의 캔버스 비율, 기존 배경 구도, 색감과 주요 요소를 유지하세요.
${hasAsset ? "입력 이미지 중앙에 임시 배치된 업로드 소스를 합성 재료로 사용하세요. 소스의 정체성과 실루엣은 보존하되, 요청 위치로 이동하고 불필요한 원본 배경은 제거한 뒤 조명·원근·그림자·색온도를 배경과 자연스럽게 맞추세요." : "사용자 요청에 명시된 요소만 새로 추가하세요."}
타이틀, 로고, 주요 캐릭터를 가리지 말고 임의의 글자나 UI를 만들지 마세요. 결과에는 완성된 KV 한 장만 출력하세요.

[사용자 요청]
${intent}`;

export async function renderBgCompose(backgroundUrl, intent, assetUrl = null, modelId = RENDER_MODEL) {
  const draft = await createComposeDraft(backgroundUrl, assetUrl);
  const result = await renderWithImagen(composePrompt(String(intent || "").trim(), !!assetUrl), modelId, draft, { imageSize: "4K", matchInputAspect: true });
  return result?.dataUrl || null;
}

const generatePrompt = (concept, hasRef) => `고품질 게임 프로모션 KV 배경을 생성하세요. ${hasRef ? "참고 이미지는 분위기와 색감만 참고하고 인물·글자·로고는 복제하지 마세요." : ""}
인물, 텍스트, 로고, UI 없이 배경만 만들고 중앙과 주요 배치 영역에 충분한 여백을 남기세요. 명확한 전경·중경·후경, 영화적 조명과 깊이감을 사용하세요.

[콘셉트]
${concept}`;

export async function renderBgGenerate(concept, refDataUrl = null, { aspectRatio = "16:9", imageSize = "2K", modelId = RENDER_MODEL } = {}) {
  const result = await renderWithImagen(generatePrompt(String(concept || "").trim(), !!refDataUrl), modelId, refDataUrl, { aspectRatio, imageSize, matchInputAspect: false });
  return result?.dataUrl || null;
}
