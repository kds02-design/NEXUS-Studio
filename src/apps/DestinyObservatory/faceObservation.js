export function inspectFace(faces, width, height) {
  if (!faces?.length) throw new Error('얼굴을 찾지 못했습니다. 밝은 곳에서 얼굴 전체를 정면으로 촬영해 주세요.');
  if (faces.length !== 1) throw new Error('한 사람만 나오도록 다시 촬영해 주세요.');
  const points = faces[0];
  if (points.length < 468 || points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) throw new Error('얼굴 좌표를 읽지 못했습니다. 다시 촬영해 주세요.');
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const bounds = { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
  const distance = (a, b) => Math.hypot((a.x - b.x) * width, (a.y - b.y) * height);
  const faceWidth = distance(points[234], points[454]);
  const faceHeight = distance(points[10], points[152]);
  const eyeAngle = Math.abs(Math.atan2(Math.abs(points[263].y - points[33].y) * height, Math.abs(points[263].x - points[33].x) * width) * 180 / Math.PI);
  const sideRatio = Math.abs(distance(points[1], points[234]) - distance(points[1], points[454])) / Math.max(faceWidth, 1);
  const warnings = [];
  if (faceWidth < 160) warnings.push('얼굴이 작게 촬영됐습니다. 조금 더 가까이 촬영해 주세요.');
  if (bounds.left < .02 || bounds.right > .98 || bounds.top < .02 || bounds.bottom > .98) warnings.push('얼굴 윤곽이 화면 가장자리에 닿았습니다. 얼굴 전체를 담아 주세요.');
  if (eyeAngle > 12) warnings.push('고개가 기울어진 것으로 보입니다. 수평을 맞춰 주세요.');
  if (sideRatio > .22) warnings.push('얼굴이 옆으로 돌아간 것으로 보입니다. 정면을 바라봐 주세요.');
  return { landmarks: points.map(({ x, y }) => ({ x, y })), bounds, warnings,
    ratio: Number((faceHeight / Math.max(faceWidth, 1)).toFixed(2)), roll: Math.round(eyeAngle) };
}
