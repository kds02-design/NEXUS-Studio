// 캐릭터/이펙트 분리 — 단색 배경 위 "불투명 피사체 + 발광 이펙트" 이미지를
// 피사체 레이어(straight-alpha)와 이펙트 레이어(스크린 블렌드용)로 나눈다.
// 사용처: MaskForge '캐릭터+이펙트' 모드, NexusPreview 캐릭터 렌더 향상 결과 분리 다운로드.
// 원리: 확실한 피사체(배경 색거리 ≥ solidLevel)를 시드로 형태학적 닫힘 + 내부 구멍 채움 →
// 피사체 마스크. 마스크 밖 발광은 검정 위 가산광 그대로 두어 스크린 블렌드에서 정확.

const clamp255 = (v) => Math.max(0, Math.min(255, Math.round(v)));

export const CHAR_SPLIT_DEFAULTS = { solidLevel: 90, closeRadius: 12, edgeSoft: 4 };

// 피사체 마스크 계산 — d: 배경 색거리(0..255), dComp: 피사체 깊이(chamfer×3), r3: 닫힘 반경×3.
export function computeCharMask(srcData, { bg, solidLevel, closeRadius }) {
  const W = srcData.width, H = srcData.height, N = W * H, s = srcData.data;
  const [br, bgC, bb] = bg || [0, 0, 0];

  // 배경과의 색거리(max-norm, 0..255)
  const d = new Uint8ClampedArray(N);
  for (let p = 0; p < N; p++) {
    const i = p * 4;
    d[p] = Math.max(Math.abs(s[i] - br), Math.abs(s[i + 1] - bgC), Math.abs(s[i + 2] - bb));
  }

  // chamfer 3/4 거리 변환 (시드=0, 두 패스, 거리 단위 = px×3)
  const chamfer = (isSeed) => {
    const INF = 0x3FFFFFFF;
    const dist = new Int32Array(N);
    for (let p = 0; p < N; p++) dist[p] = isSeed(p) ? 0 : INF;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; let v = dist[i];
      if (v === 0) continue;
      if (x > 0 && dist[i - 1] + 3 < v) v = dist[i - 1] + 3;
      if (y > 0) {
        if (dist[i - W] + 3 < v) v = dist[i - W] + 3;
        if (x > 0 && dist[i - W - 1] + 4 < v) v = dist[i - W - 1] + 4;
        if (x < W - 1 && dist[i - W + 1] + 4 < v) v = dist[i - W + 1] + 4;
      }
      dist[i] = v;
    }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x; let v = dist[i];
      if (v === 0) continue;
      if (x < W - 1 && dist[i + 1] + 3 < v) v = dist[i + 1] + 3;
      if (y < H - 1) {
        if (dist[i + W] + 3 < v) v = dist[i + W] + 3;
        if (x < W - 1 && dist[i + W + 1] + 4 < v) v = dist[i + W + 1] + 4;
        if (x > 0 && dist[i + W - 1] + 4 < v) v = dist[i + W - 1] + 4;
      }
      dist[i] = v;
    }
    return dist;
  };

  const r3 = Math.max(1, closeRadius) * 3;
  // ① 팽창 — 피사체 시드로부터 closeRadius 이내 → D (틈·머리카락 사이 메움)
  // dS0 는 블록을 벗어나면 GC 대상 (17MP 급 이미지 메모리 대비)
  const D = new Uint8Array(N);
  {
    const dS0 = chamfer((p) => d[p] >= solidLevel);
    for (let p = 0; p < N; p++) D[p] = dS0[p] <= r3 ? 1 : 0;
  }

  // ② 내부 구멍 채움 — 테두리에서 complement(D) flood, 도달 불가 = 피사체 안 어두운 영역
  {
    const stack = []; const ext = new Uint8Array(N);
    const seed = (p) => { if (!D[p] && !ext[p]) { ext[p] = 1; stack.push(p); } };
    for (let x = 0; x < W; x++) { seed(x); seed((H - 1) * W + x); }
    for (let y = 0; y < H; y++) { seed(y * W); seed(y * W + W - 1); }
    while (stack.length) {
      const p = stack.pop(), x = p % W, y = (p / W) | 0;
      if (x > 0) seed(p - 1);
      if (x < W - 1) seed(p + 1);
      if (y > 0) seed(p - W);
      if (y < H - 1) seed(p + W);
    }
    for (let p = 0; p < N; p++) if (!D[p] && !ext[p]) D[p] = 1;
  }

  // ③ 침식 — complement(D)로부터 closeRadius 초과 깊이만 피사체 (닫힘 완성)
  const dComp = chamfer((p) => !D[p]);
  return { d, dComp, r3 };
}

// 캐릭터/이펙트 분리 출력 — 두 레이어는 정렬을 위해 같은 캔버스 크기(트림 없음).
//   charBlob — 피사체만 straight-alpha (경계 배경색 역산으로 다크 프린지 제거)
//   fxBlob   — 피사체를 부드럽게 지운 발광 원본(불투명 PNG) → 블렌드 모드 '스크린'으로 사용
export function charSplitToBlobs(srcData, { bg, solidLevel, closeRadius, edgeSoft }) {
  const W = srcData.width, H = srcData.height, N = W * H, s = srcData.data;
  const [br, bgC, bb] = bg || [0, 0, 0];
  const { d, dComp, r3 } = computeCharMask(srcData, { bg, solidLevel, closeRadius });
  const edge3 = Math.max(1, edgeSoft) * 3;

  const charCv = document.createElement('canvas'); charCv.width = W; charCv.height = H;
  const fxCv = document.createElement('canvas'); fxCv.width = W; fxCv.height = H;
  const charCtx = charCv.getContext('2d'), fxCtx = fxCv.getContext('2d');
  const co = charCtx.createImageData(W, H), c = co.data;
  const fo = fxCtx.createImageData(W, H), f = fo.data;

  for (let p = 0; p < N; p++) {
    const i = p * 4;
    const depth = dComp[p] - r3;
    const ramp = depth <= 0 ? 0 : Math.min(1, depth / edge3); // 피사체 커버리지
    if (ramp > 0) {
      const a = ramp * (s[i + 3] / 255);
      let r = s[i], g = s[i + 1], b = s[i + 2];
      if (ramp < 1) {
        const at = Math.max(d[p] / 255, ramp, 0.004), inv = 1 - at;
        r = clamp255((r - inv * br) / at);
        g = clamp255((g - inv * bgC) / at);
        b = clamp255((b - inv * bb) / at);
      }
      c[i] = r; c[i + 1] = g; c[i + 2] = b; c[i + 3] = clamp255(a * 255);
    }
    const keep = 1 - ramp;
    f[i] = clamp255(s[i] * keep);
    f[i + 1] = clamp255(s[i + 1] * keep);
    f[i + 2] = clamp255(s[i + 2] * keep);
    f[i + 3] = 255;
  }
  charCtx.putImageData(co, 0, 0);
  fxCtx.putImageData(fo, 0, 0);

  const toBlob = (cv) => new Promise((resolve, reject) => cv.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG 변환 실패'))), 'image/png'));
  return Promise.all([toBlob(charCv), toBlob(fxCv)]).then(([charBlob, fxBlob]) => ({ charBlob, fxBlob, width: W, height: H }));
}

// dataURL → 원본 해상도 ImageData (분리 호출 편의 헬퍼)
export function dataUrlToImageData(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
    };
    img.onerror = () => reject(new Error('이미지 로드 실패'));
    img.src = dataUrl;
  });
}
