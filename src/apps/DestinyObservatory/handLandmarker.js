const MEDIAPIPE_VERSION = "1.0.1";
const VISION_MODULE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/vision_bundle.mjs`;
const WASM_ROOT_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

let detectorPromise;

async function getHandDetector() {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const vision = await import(/* @vite-ignore */ VISION_MODULE_URL);
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM_ROOT_URL);
      return vision.HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
        runningMode: "IMAGE",
        numHands: 1,
        minHandDetectionConfidence: 0.58,
        minHandPresenceConfidence: 0.58,
        minTrackingConfidence: 0.5,
      });
    })().catch((error) => {
      detectorPromise = null;
      throw error;
    });
  }
  return detectorPromise;
}

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function rotatePoint(point, center, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const x = point.x - center.x;
  const y = point.y - center.y;
  return {
    x: center.x + x * cos - y * sin,
    y: center.y + x * sin + y * cos,
  };
}

function convexHull(points) {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (sorted.length <= 2) return sorted;
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), point) <= 0) lower.pop();
    lower.push(point);
  }
  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const point = sorted[i];
    while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), point) <= 0) upper.pop();
    upper.push(point);
  }
  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

function fitCrop(points, aspectRatio) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  let minX = Math.min(...xs);
  let maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);
  const handWidth = Math.max(1, maxX - minX);
  const handHeight = Math.max(1, maxY - minY);
  minX -= handWidth * 0.14;
  maxX += handWidth * 0.14;
  minY -= handHeight * 0.1;
  maxY += handHeight * 0.1;

  let width = maxX - minX;
  let height = maxY - minY;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  if (width / height > aspectRatio) height = width / aspectRatio;
  else width = height * aspectRatio;

  return { x: centerX - width / 2, y: centerY - height / 2, width, height };
}

function mapToCanvas(point, crop, width, height) {
  return {
    x: (point.x - crop.x) * (width / crop.width),
    y: (point.y - crop.y) * (height / crop.height),
  };
}

export async function recognizePalm(image, width, height) {
  let result;
  try {
    const detector = await getHandDetector();
    result = detector.detect(image);
  } catch (error) {
    throw new Error(`손바닥 인식 모델을 불러오지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요. (${error?.message || "model error"})`, { cause: error });
  }

  const landmarks = result?.landmarks?.[0];
  if (!landmarks || landmarks.length < 21) {
    throw new Error("손바닥을 인식하지 못했습니다. 손가락을 펴고 손목까지 화면에 들어오도록 다시 찍어주세요.");
  }

  const handednessResult = result.handedness?.[0]?.[0] || result.handednesses?.[0]?.[0] || {};
  const confidence = Number(handednessResult.score || 0);
  if (confidence < 0.5) {
    throw new Error("손 인식 신뢰도가 낮습니다. 밝은 단색 배경에서 손바닥 전체를 다시 찍어주세요.");
  }

  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  const sourcePoints = landmarks.map((point) => ({ x: point.x * naturalWidth, y: point.y * naturalHeight }));
  const wrist = sourcePoints[0];
  const middleMcp = sourcePoints[9];
  const centerIndices = [0, 5, 9, 13, 17];
  const center = centerIndices.reduce((acc, index) => ({
    x: acc.x + sourcePoints[index].x / centerIndices.length,
    y: acc.y + sourcePoints[index].y / centerIndices.length,
  }), { x: 0, y: 0 });
  const handAngle = Math.atan2(middleMcp.y - wrist.y, middleMcp.x - wrist.x);
  const rotation = -Math.PI / 2 - handAngle;
  const rotatedPoints = sourcePoints.map((point) => rotatePoint(point, center, rotation));
  const crop = fitCrop(rotatedPoints, width / height);
  const mappedLandmarks = rotatedPoints.map((point) => mapToCanvas(point, crop, width, height));

  const extendedFingers = [[8, 5], [12, 9], [16, 13], [20, 17]]
    .filter(([tip, mcp]) => distance(sourcePoints[tip], wrist) > distance(sourcePoints[mcp], wrist) * 1.18)
    .length;
  if (extendedFingers < 3) {
    throw new Error("손바닥은 찾았지만 손가락이 충분히 펴지지 않았습니다. 네 손가락을 펴고 다시 찍어주세요.");
  }

  const palmPolygon = convexHull([0, 1, 2, 5, 9, 13, 17].map((index) => mappedLandmarks[index]));
  const xs = palmPolygon.map((point) => point.x);
  const ys = palmPolygon.map((point) => point.y);
  const palmBounds = {
    minX: Math.max(0, Math.min(...xs)),
    maxX: Math.min(width, Math.max(...xs)),
    minY: Math.max(0, Math.min(...ys)),
    maxY: Math.min(height, Math.max(...ys)),
  };
  palmBounds.width = Math.max(1, palmBounds.maxX - palmBounds.minX);
  palmBounds.height = Math.max(1, palmBounds.maxY - palmBounds.minY);

  const category = String(handednessResult.categoryName || handednessResult.displayName || "").toLowerCase();
  const handedness = category.includes("left") ? "왼손" : category.includes("right") ? "오른손" : "손";

  return {
    confidence,
    handedness,
    landmarks: mappedLandmarks,
    palmPolygon,
    palmBounds,
    frame: { center, rotation, crop, naturalWidth, naturalHeight },
  };
}

export function drawNormalizedHand(context, image, geometry, width, height) {
  const { center, rotation, crop } = geometry.frame;
  context.save();
  context.fillStyle = "#0c0c0b";
  context.fillRect(0, 0, width, height);
  context.scale(width / crop.width, height / crop.height);
  context.translate(-crop.x, -crop.y);
  context.translate(center.x, center.y);
  context.rotate(rotation);
  context.translate(-center.x, -center.y);
  context.drawImage(image, 0, 0, geometry.frame.naturalWidth, geometry.frame.naturalHeight);
  context.restore();
}
