import { inspectFace } from './faceObservation';

const ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1';
let detectorPromise;
async function getDetector() {
  if (!detectorPromise) detectorPromise = (async () => {
    const vision = await import(/* @vite-ignore */ `${ROOT}/vision_bundle.mjs`);
    const files = await vision.FilesetResolver.forVisionTasks(`${ROOT}/wasm`);
    return vision.FaceLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task', delegate: 'CPU' },
      runningMode: 'IMAGE', numFaces: 2, minFaceDetectionConfidence: .5, minFacePresenceConfidence: .5,
      outputFaceBlendshapes: false, outputFacialTransformationMatrixes: false,
    });
  })().catch(error => { detectorPromise = null; throw error; });
  return detectorPromise;
}

export async function observeFace(file, onStage = () => {}) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url;
    try { await image.decode(); } catch { throw new Error('사진을 읽지 못했습니다. JPG 또는 PNG로 선택해 주세요.'); }
    const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    onStage('얼굴 인식 모델 준비 중 · 최초 실행 시 다운로드가 필요합니다.');
    let detector;
    try { detector = await getDetector(); } catch { throw new Error('얼굴 모델을 불러오지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.'); }
    onStage('기기에서 얼굴 위치를 확인하고 있습니다.');
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const result = inspectFace(detector.detect(canvas).faceLandmarks, canvas.width, canvas.height);
    const b = result.bounds;
    const x = Math.max(0, Math.floor(b.left * canvas.width)), y = Math.max(0, Math.floor(b.top * canvas.height));
    const w = Math.max(1, Math.min(canvas.width - x, Math.ceil((b.right - b.left) * canvas.width)));
    const h = Math.max(1, Math.min(canvas.height - y, Math.ceil((b.bottom - b.top) * canvas.height)));
    const pixels = ctx.getImageData(x, y, w, h).data;
    let light = 0;
    for (let i = 0; i < pixels.length; i += 4) light += .2126 * pixels[i] + .7152 * pixels[i + 1] + .0722 * pixels[i + 2];
    light /= pixels.length / 4;
    if (light < 45) result.warnings.push('얼굴 영역이 어둡습니다. 고른 조명에서 다시 촬영해 주세요.');
    if (light > 225) result.warnings.push('얼굴 영역이 너무 밝습니다. 강한 빛을 피해 다시 촬영해 주세요.');
    return { ...result, width: canvas.width, height: canvas.height, previewUrl: canvas.toDataURL('image/jpeg', .9), reviewStatus: 'draft' };
  } finally { URL.revokeObjectURL(url); }
}
