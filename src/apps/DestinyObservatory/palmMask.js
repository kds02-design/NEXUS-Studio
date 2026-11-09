// Conservative pixel segmentation decoding, with NO gap closing or curve template.
export function normalizeRGB(rgba) {
  const n = rgba.length / 4, tensor = new Float32Array(n * 3);
  const mean = [.485, .456, .406], std = [.229, .224, .225];
  for (let c = 0; c < 3; c++) for (let i = 0; i < n; i++) tensor[c * n + i] = (rgba[i * 4 + c] / 255 - mean[c]) / std[c];
  return tensor;
}

export function decodeLogits(logits, width, height, threshold = .6, margin = .15) {
  const n = width * height;
  if (logits.length !== n * 4) throw new Error('손금 모델 출력 크기가 다릅니다.');
  const labels = new Uint8Array(n), probabilities = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let best = 0, max = logits[i], second = -Infinity;
    for (let c = 1; c < 4; c++) {
      const v = logits[c * n + i];
      if (v > max) { second = max; max = v; best = c; } else second = Math.max(second, v);
    }
    if (!Number.isFinite(max)) continue;
    let denominator = 0;
    for (let c = 0; c < 4; c++) denominator += Math.exp(logits[c * n + i] - max);
    const probability = 1 / denominator;
    if (best && probability >= threshold && probability - Math.exp(second - max) / denominator >= margin) {
      labels[i] = best; probabilities[i] = probability;
    }
  }
  return { labels, probabilities };
}

const NEIGHBORS = [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
export function components(binary, width, height) {
  const seen = new Uint8Array(binary.length), result = [];
  for (let seed = 0; seed < binary.length; seed++) {
    if (!binary[seed] || seen[seed]) continue;
    const queue = [seed]; seen[seed] = 1;
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const id = queue[cursor], x = id % width, y = Math.floor(id / width);
      for (const [dx, dy] of NEIGHBORS) {
        const nx = x + dx, ny = y + dy, next = ny * width + nx;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height || seen[next] || !binary[next]) continue;
        seen[next] = 1; queue.push(next);
      }
    }
    result.push(queue);
  }
  return result;
}

// Zhang-Suen thinning only REMOVES foreground pixels; it never invents a bridge.
export function thinMask(binary, width, height) {
  const mask = binary.slice();
  for (let round = 0; round < 256; round++) {
    let changed = false;
    for (let pass = 0; pass < 2; pass++) {
      const remove = [];
      for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
        const id = y * width + x;
        if (!mask[id]) continue;
        const p = NEIGHBORS.map(([dx,dy]) => mask[(y + dy) * width + x + dx]);
        const count = p.reduce((a,b) => a + b, 0);
        if (count < 2 || count > 6) continue;
        let turns = 0;
        for (let i = 0; i < 8; i++) if (!p[i] && p[(i + 1) % 8]) turns++;
        if (turns !== 1) continue;
        if (pass === 0 ? (p[0]*p[2]*p[4] || p[2]*p[4]*p[6]) : (p[0]*p[2]*p[6] || p[0]*p[4]*p[6])) continue;
        remove.push(id);
      }
      for (const id of remove) mask[id] = 0;
      changed ||= remove.length > 0;
    }
    if (!changed) break;
  }
  return mask;
}

function neighbors(id, active, width, height) {
  const x = id % width, y = Math.floor(id / width), result = [];
  for (const [dx,dy] of NEIGHBORS) {
    const nx=x+dx, ny=y+dy, next=ny*width+nx;
    if (nx<0 || nx>=width || ny<0 || ny>=height || !active.has(next)) continue;
    // Skip diagonal shortcuts when a cardinal connection already exists.
    if (dx && dy && (active.has(y*width+nx) || active.has(ny*width+x))) continue;
    result.push(next);
  }
  return result;
}

export function traceSkeleton(skeleton, width, height, minLength = 12) {
  const paths = [];
  for (const component of components(skeleton, width, height)) {
    const active = new Set(component);
    const graph = new Map(component.map(id => [id, neighbors(id, active, width, height)]));
    const visited = new Set();
    const edgeKey = (a,b) => a<b ? `${a}:${b}` : `${b}:${a}`;
    const walk = (start,next) => {
      const path = [start]; let prev = start, current = next;
      while (!visited.has(edgeKey(prev,current))) {
        visited.add(edgeKey(prev,current)); path.push(current);
        const adjacent = graph.get(current);
        if (adjacent.length !== 2) break;
        const following = adjacent.find(id => id !== prev); prev = current; current = following;
      }
      if (path.length >= minLength) paths.push(path.map(id => ({ x: id % width + .5, y: Math.floor(id / width) + .5 })));
    };
    // Split at branches; never connect distinct pieces by their endpoints.
    for (const id of component) if (graph.get(id).length !== 2) for (const next of graph.get(id)) walk(id,next);
    for (const id of component) for (const next of graph.get(id)) if (!visited.has(edgeKey(id,next))) walk(id,next);
  }
  return paths;
}

export function extractSegments(labels, width, height) {
  return [1,2,3].map((classId) => {
    const binary = Uint8Array.from(labels, value => Number(value === classId));
    for (const component of components(binary,width,height)) if (component.length < 20) for (const id of component) binary[id]=0;
    const skeleton = thinMask(binary,width,height);
    return { key: ['heart','head','life'][classId-1], paths: traceSkeleton(skeleton,width,height) };
  }).filter(line => line.paths.length);
}
