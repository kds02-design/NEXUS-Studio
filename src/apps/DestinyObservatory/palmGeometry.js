// One reversible transform: model pixels -> rotated source -> displayed image.
// Training reference: palm-line-reader bc48939 / pipeline/hand_preprocess.py.
export function modelFrame(geometry, displayWidth = 720, displayHeight = 900) {
  const { crop } = geometry.frame;
  const pts = geometry.landmarks.map(p => ({ x: crop.x + p.x * crop.width / displayWidth,
    y: crop.y + p.y * crop.height / displayHeight }));
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  // The published label pipeline crops the FULL landmark box plus 100 source
  // pixels, then letterboxes. A palm-only crop is not its actual training input.
  const left = Math.min(...xs) - 100, top = Math.min(...ys) - 100;
  const width = Math.ceil(Math.max(...xs) + 100 - left);
  const height = Math.ceil(Math.max(...ys) + 100 - top);
  // Match the teacher's 1024 letterbox (including integer rounding), down to 512.
  const scale = Math.min(1024 / width, 1024 / height);
  const contentWidth = Math.floor(width * scale) / 2;
  const contentHeight = Math.floor(height * scale) / 2;
  const padX = Math.floor((1024 - contentWidth * 2) / 2) / 2;
  const padY = Math.floor((1024 - contentHeight * 2) / 2) / 2;
  return { left, top, width, height, contentWidth, contentHeight, padX, padY,
    flip: geometry.handedness === '오른손', displayCrop: crop, displayWidth, displayHeight };
}

export function modelToDisplay(point, frame) {
  const x = (point.x - frame.padX) / frame.contentWidth;
  const y = (point.y - frame.padY) / frame.contentHeight;
  const sourceX = frame.left + (frame.flip ? 1 - x : x) * frame.width;
  const sourceY = frame.top + y * frame.height;
  return { x: (sourceX - frame.displayCrop.x) / frame.displayCrop.width * 100,
    y: (sourceY - frame.displayCrop.y) / frame.displayCrop.height * 100 };
}

export function displayToModel(point, frame) {
  const sourceX = frame.displayCrop.x + point.x / 100 * frame.displayCrop.width;
  const sourceY = frame.displayCrop.y + point.y / 100 * frame.displayCrop.height;
  const x = (sourceX - frame.left) / frame.width;
  return { x: frame.padX + (frame.flip ? 1 - x : x) * frame.contentWidth,
    y: frame.padY + (sourceY - frame.top) / frame.height * frame.contentHeight };
}

export function drawModelInput(ctx, image, geometry, frame) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 512, 512);
  ctx.save();
  ctx.translate(frame.padX, frame.padY);
  ctx.beginPath(); ctx.rect(0, 0, frame.contentWidth, frame.contentHeight); ctx.clip();
  if (frame.flip) { ctx.translate(frame.contentWidth, 0); ctx.scale(-1, 1); }
  ctx.scale(frame.contentWidth / frame.width, frame.contentHeight / frame.height);
  ctx.translate(-frame.left, -frame.top);
  const { center, rotation } = geometry.frame;
  ctx.translate(center.x, center.y); ctx.rotate(rotation); ctx.translate(-center.x, -center.y);
  ctx.drawImage(image, 0, 0, geometry.frame.naturalWidth, geometry.frame.naturalHeight);
  ctx.restore();
}
