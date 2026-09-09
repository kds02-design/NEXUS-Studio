// 투명화 후처리 — straight-alpha RGBA 버퍼에서 "매트 잔여물"을 제거한다.
// 색상 키(colorKeyExtract) · 이펙트 추출(effectExtract) 결과에 공통으로 붙는 정리 단계.
//   cleanIslands     : 어디에도 붙지 않은 작은 옅은 점(JPEG 노이즈·비네팅 부스러기) 제거
//   killFaintIslands : 크기와 무관하게 "최대 알파가 낮은" 고립 성분 제거(그라디언트 배경의 넓은 얼룩)
// 두 함수 모두 피사체 본체(최대 알파가 높은 성분)는 절대 건드리지 않는다.
//
// DOM 없이 동작(앱·MCP·CLI 공용). 연결 성분은 4-연결 라벨링(반복, 스택 기반 — 2048² 에서도 안전).

// 알파>0 픽셀의 4-연결 성분 라벨링. 반환: { labels: Int32Array(N, 0=배경), count, size[], maxAlpha[] }
export function labelAlphaComponents(data, W, H) {
  const N = W * H;
  const labels = new Int32Array(N);
  const size = [0], maxAlpha = [0];
  const stack = new Int32Array(N);
  let count = 0;
  for (let p = 0; p < N; p++) {
    if (labels[p] !== 0 || data[p * 4 + 3] === 0) continue;
    const id = ++count;
    let sz = 0, mx = 0, sp = 0;
    stack[sp++] = p; labels[p] = id;
    while (sp > 0) {
      const idx = stack[--sp];
      const a = data[idx * 4 + 3];
      sz++; if (a > mx) mx = a;
      const x = idx % W, y = (idx / W) | 0;
      if (x > 0) { const q = idx - 1; if (labels[q] === 0 && data[q * 4 + 3] !== 0) { labels[q] = id; stack[sp++] = q; } }
      if (x < W - 1) { const q = idx + 1; if (labels[q] === 0 && data[q * 4 + 3] !== 0) { labels[q] = id; stack[sp++] = q; } }
      if (y > 0) { const q = idx - W; if (labels[q] === 0 && data[q * 4 + 3] !== 0) { labels[q] = id; stack[sp++] = q; } }
      if (y < H - 1) { const q = idx + W; if (labels[q] === 0 && data[q * 4 + 3] !== 0) { labels[q] = id; stack[sp++] = q; } }
    }
    size.push(sz); maxAlpha.push(mx);
  }
  return { labels, count, size, maxAlpha };
}

// 성분 제거 공통 루틴 — kill[id] 가 true 인 성분의 알파를 0 으로. 제거 픽셀 수를 반환.
function dropComponents(data, labels, kill) {
  let removed = 0;
  for (let p = 0, N = labels.length; p < N; p++) {
    const id = labels[p];
    if (id !== 0 && kill[id]) { data[p * 4 + 3] = 0; removed++; }
  }
  return removed;
}

export const CLEANUP_DEFAULTS = {
  // cleanIslands: 최대 알파 < islandAlpha 이고 크기 < 전체의 islandFrac 인 성분 제거
  islandAlpha: 96,
  islandFrac: 0.0015,
  // killFaintIslands: 최대 알파 < faintAlpha 인 성분은 크기와 무관하게 제거
  faintAlpha: 150,
};

// 작은 옅은 점 제거. 피사체와 떨어진 JPEG 노이즈·비네팅 부스러기용. 결과는 in-place, 제거 픽셀 수 반환.
export function cleanIslands(px, { islandAlpha = CLEANUP_DEFAULTS.islandAlpha, islandFrac = CLEANUP_DEFAULTS.islandFrac } = {}) {
  const { data, width: W, height: H } = px;
  const { labels, count, size, maxAlpha } = labelAlphaComponents(data, W, H);
  if (count === 0) return 0;
  const limit = W * H * islandFrac;
  const kill = new Uint8Array(count + 1);
  for (let id = 1; id <= count; id++) if (maxAlpha[id] < islandAlpha && size[id] < limit) kill[id] = 1;
  return dropComponents(data, labels, kill);
}

// 옅은 고립 성분 제거(크기 무관). 배경 그라디언트가 tolerance 를 살짝 넘어 남긴 넓은 얼룩용.
// 피사체가 전체적으로 반투명(연기·안개)이면 본체까지 지울 수 있으니 이펙트 플레이트엔 쓰지 말 것.
export function killFaintIslands(px, { faintAlpha = CLEANUP_DEFAULTS.faintAlpha } = {}) {
  const { data, width: W, height: H } = px;
  const { labels, count, maxAlpha } = labelAlphaComponents(data, W, H);
  if (count === 0) return 0;
  const kill = new Uint8Array(count + 1);
  for (let id = 1; id <= count; id++) if (maxAlpha[id] < faintAlpha) kill[id] = 1;
  return dropComponents(data, labels, kill);
}

// 알파 통계 — QA 카운트 재계산(후처리 뒤 값이 바뀌므로).
export function alphaStats(px) {
  const d = px.data; let transparentPixels = 0, opaquePixels = 0, partialPixels = 0;
  for (let i = 3; i < d.length; i += 4) {
    const a = d[i];
    if (a === 0) transparentPixels++; else if (a >= 254) opaquePixels++; else partialPixels++;
  }
  return { transparentPixels, opaquePixels, partialPixels, totalPixels: d.length / 4 };
}

// 테두리 링 색 분산 — 배경이 평탄 매트인지 판단하는 힌트. detectBg 와 같은 링을 샘플한다.
// 반환: { mean:[r,g,b], std:number(0~255 유클리드), maxDist:number }  std<6 이면 사실상 단색.
export function borderStats(data, W, H) {
  const step = Math.max(1, Math.floor(Math.min(W, H) / 120));
  const pts = [];
  const add = (x, y) => { const i = (y * W + x) * 4; pts.push([data[i], data[i + 1], data[i + 2]]); };
  for (let x = 0; x < W; x += step) { add(x, 0); add(x, H - 1); }
  for (let y = 0; y < H; y += step) { add(0, y); add(W - 1, y); }
  const n = pts.length || 1;
  const mean = [0, 0, 0];
  for (const p of pts) { mean[0] += p[0]; mean[1] += p[1]; mean[2] += p[2]; }
  mean[0] /= n; mean[1] /= n; mean[2] /= n;
  let sq = 0, maxDist = 0;
  for (const p of pts) {
    const d2 = (p[0] - mean[0]) ** 2 + (p[1] - mean[1]) ** 2 + (p[2] - mean[2]) ** 2;
    sq += d2; if (d2 > maxDist) maxDist = d2;
  }
  return { mean: mean.map(Math.round), std: Math.sqrt(sq / n), maxDist: Math.sqrt(maxDist) };
}
