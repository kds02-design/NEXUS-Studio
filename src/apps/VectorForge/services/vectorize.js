// Marching Squares + Catmull-Rom bezier fitting → SVG path.
// 원본 VECTORIZER 알고리즘을 그대로 옮긴 순수 JS 함수. React 의존성 없음.
//
// vectorize(canvas, opts, onProgress) → { svg, stats: { outerN, holeN, totalPts, sizeKB } }
//   onProgress(pct, msg) — 진행률(0–100) + 단계 메시지 콜백 (선택)

export function vectorize(canvas, opts, onProgress = () => {}) {
  const { threshold = 128, blur = 0.5, alpha = 1.0, optimize = 0.2, turd = 8, invert = false, fg = '#000000', bg = '#ffffff' } = opts;
  const W = canvas.width;
  const H = canvas.height;
  const tNorm = threshold / 255;

  onProgress(5, '이미지 분석 중...');

  // 1) blur 적용 후 휘도 추출
  const tmpC = document.createElement('canvas');
  tmpC.width = W; tmpC.height = H;
  const tc = tmpC.getContext('2d');
  if (blur > 0) tc.filter = `blur(${blur}px)`;
  tc.drawImage(canvas, 0, 0);
  const data = tc.getImageData(0, 0, W, H).data;

  const field = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    field[i] = (data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114) / 255;
  }

  onProgress(20, '이진화...');

  const ins = (v) => (invert ? v > tNorm : v < tNorm);

  // Marching squares 코드별 교차 엣지 매핑 (4비트)
  const MS = [
    null, [[3, 2]], [[2, 1]], [[3, 1]],
    [[1, 0]], [[3, 0], [1, 2]], [[2, 0]], [[3, 0]],
    [[0, 3]], [[0, 2]], [[0, 1], [2, 3]], [[0, 1]],
    [[1, 3]], [[1, 2]], [[2, 3]], null,
  ];

  const lerp = (x0, y0, v0, x1, y1, v1) => {
    const d = v1 - v0;
    if (Math.abs(d) < 1e-9) return [(x0 + x1) / 2, (y0 + y1) / 2];
    const k = (tNorm - v0) / d;
    return [x0 + k * (x1 - x0), y0 + k * (y1 - y0)];
  };

  onProgress(30, '윤곽선 추출...');

  const segs = [];
  for (let cy = 0; cy < H - 1; cy++) {
    for (let cx = 0; cx < W - 1; cx++) {
      const tl = field[cy * W + cx];
      const tr = field[cy * W + cx + 1];
      const bl = field[(cy + 1) * W + cx];
      const br = field[(cy + 1) * W + cx + 1];
      const code = (ins(tl) ? 8 : 0) | (ins(tr) ? 4 : 0) | (ins(br) ? 2 : 0) | (ins(bl) ? 1 : 0);
      const edges = MS[code];
      if (!edges) continue;
      const ep = [
        lerp(cx, cy, tl, cx + 1, cy, tr),
        lerp(cx + 1, cy, tr, cx + 1, cy + 1, br),
        lerp(cx + 1, cy + 1, br, cx, cy + 1, bl),
        lerp(cx, cy + 1, bl, cx, cy, tl),
      ];
      for (let p = 0; p < edges.length; p++) {
        segs.push([ep[edges[p][0]], ep[edges[p][1]]]);
      }
    }
  }

  onProgress(50, '패스 연결...');

  // 인접 세그먼트 → 체인으로 연결
  const K = (pt) => `${Math.round(pt[0] * 8)}_${Math.round(pt[1] * 8)}`;
  const adj = {};
  for (let s = 0; s < segs.length; s++) {
    const k0 = K(segs[s][0]);
    const k1 = K(segs[s][1]);
    if (!adj[k0]) adj[k0] = []; adj[k0].push([s, 0]);
    if (!adj[k1]) adj[k1] = []; adj[k1].push([s, 1]);
  }
  const used = new Uint8Array(segs.length);
  const polys = [];
  for (let s = 0; s < segs.length; s++) {
    if (used[s]) continue;
    used[s] = 1;
    const chain = [segs[s][0], segs[s][1]];
    for (let go = true; go;) {
      go = false;
      const cd = adj[K(chain[chain.length - 1])];
      if (cd) for (let c = 0; c < cd.length; c++) {
        const si = cd[c][0];
        if (used[si]) continue;
        used[si] = 1;
        chain.push(cd[c][1] === 0 ? segs[si][1] : segs[si][0]);
        go = true; break;
      }
    }
    for (let go2 = true; go2;) {
      go2 = false;
      const cd2 = adj[K(chain[0])];
      if (cd2) for (let c = 0; c < cd2.length; c++) {
        const si2 = cd2[c][0];
        if (used[si2]) continue;
        used[si2] = 1;
        chain.unshift(cd2[c][1] === 0 ? segs[si2][1] : segs[si2][0]);
        go2 = true; break;
      }
    }
    if (chain.length > 4) polys.push(chain);
  }

  onProgress(65, '노이즈 제거...');

  const polyArea = (pts) => {
    let a = 0; const n = pts.length;
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; a += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1]; }
    return Math.abs(a) / 2;
  };
  const signedArea = (pts) => {
    let a = 0; const n = pts.length;
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; a += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1]; }
    return a / 2;
  };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
  const norm = (v) => Math.sqrt(v[0] * v[0] + v[1] * v[1]);

  const minArea = turd * turd * 0.5;
  const filtered = polys.filter((p) => polyArea(p) >= minArea);

  onProgress(78, '베지어 피팅...');

  // Ramer-Douglas-Peucker 단순화
  const rdp = (pts, eps) => {
    if (pts.length <= 2) return pts;
    const ax = pts[0][0], ay = pts[0][1];
    const bx = pts[pts.length - 1][0], by = pts[pts.length - 1][1];
    const L = Math.hypot(bx - ax, by - ay);
    let maxD = 0; let idx = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = L < 1e-9
        ? Math.hypot(pts[i][0] - ax, pts[i][1] - ay)
        : Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / L;
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > eps) return rdp(pts.slice(0, idx + 1), eps).slice(0, -1).concat(rdp(pts.slice(idx), eps));
    return [pts[0], pts[pts.length - 1]];
  };

  const fr = (n) => Math.round(n * 100) / 100;

  const dParts = [];
  let outerN = 0;
  let holeN = 0;
  let totalPts = 0;

  filtered.forEach((rawPts) => {
    const pts = rdp(rawPts, optimize > 0 ? optimize * 2 : 0.3);
    if (pts.length < 3) return;
    totalPts += pts.length;
    if (signedArea(pts) > 0) outerN++; else holeN++;

    let d = `M${fr(pts[0][0])} ${fr(pts[0][1])}`;
    const n = pts.length;
    const ext = pts.concat(pts.slice(0, 3));
    for (let i = 0; i < n; i++) {
      const p0 = ext[i];
      const p1 = ext[i + 1];
      const p2 = ext[i + 2];
      const p3 = ext[i + 3] || ext[0];
      const d1 = sub(p1, p0);
      const d2 = sub(p2, p1);
      const n1 = norm(d1);
      const n2 = norm(d2);
      let cosA = (n1 > 0 && n2 > 0) ? dot(d1, d2) / (n1 * n2) : 1;
      cosA = Math.max(-1, Math.min(1, cosA));
      const ang = Math.acos(cosA) / Math.PI;
      if (ang > (1 - alpha + 0.01) && alpha < 1.34) {
        d += ` L${fr(p2[0])} ${fr(p2[1])}`;
      } else {
        const t = Math.max(0.1, 1 - 0.5 * (1 - alpha));
        const cp1 = [p1[0] + (p2[0] - p0[0]) * t / 6, p1[1] + (p2[1] - p0[1]) * t / 6];
        const cp2 = [p2[0] - (p3[0] - p1[0]) * t / 6, p2[1] - (p3[1] - p1[1]) * t / 6];
        d += ` C${fr(cp1[0])} ${fr(cp1[1])} ${fr(cp2[0])} ${fr(cp2[1])} ${fr(p2[0])} ${fr(p2[1])}`;
      }
    }
    dParts.push(`${d}Z`);
  });

  onProgress(92, 'SVG 생성...');

  const svg = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`,
    `  <rect width="${W}" height="${H}" fill="${bg}"/>`,
    dParts.length ? `  <path fill="${fg}" fill-rule="evenodd" d="${dParts.join(' ')}"/>` : '',
    '</svg>',
  ].join('\n');

  onProgress(100, '완료');

  return {
    svg,
    stats: {
      outerN,
      holeN,
      totalPts,
      sizeKB: Math.round(svg.length / 102.4) / 10,
    },
  };
}
