// 광원 변형 · 형태 영역 유지(부드럽게) — 이전 발광 에셋(baseSrc)의 "방식·배치"만 유지하도록,
// base 의 발광 영역을 부드럽고 넉넉한 게이트로 만들어 새로 그린 고품질 렌더(resultSrc)를 그 영역에
// 합성한다. base 를 픽셀 단위로 베끼지 않으므로 레퍼런스가 저품질이어도 결과 디테일은 살아 있다.
//
//   maskLightToBaseFootprint(resultSrc, baseSrc, { softness }) → dataUrl(검은배경 PNG) | null
//
// 원리:
//   - base 를 blur 로 흐려(=팽창+페더) 발광 영역을 "부드럽게 확장"한 소프트 게이트를 만든다.
//     → base 의 저품질 하드 엣지를 감추고, 새 디테일이 원래 실루엣에 딱 잘려나가지 않게 한다.
//   - result(선명한 새 렌더) RGB 에 이 소프트 게이트를 곱해 검은 배경 위로 합성. 게이트 밖은
//     순흑이 되어 이후 루마키 누끼에서 자연스럽게 빠진다 → 방식·배치는 유지, 디테일은 새로.
//   - 게이트만 blur 하고 result 자체는 blur 하지 않으므로 내부 디테일은 그대로 선명하다.
//
// result 는 base 해상도에 맞춰 스케일해 정합을 맞춘다. CORS taint/로드 실패 시 null 반환 →
// 호출부는 변형된 원본 result 를 그대로 쓰도록 폴백(프롬프트 기반 방식 유지)하면 된다.

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('이미지 로드 실패'));
  img.src = src;
});

export async function maskLightToBaseFootprint(resultSrc, baseSrc, { softness = 0.015 } = {}) {
  if (!resultSrc || !baseSrc) return null;
  let baseImg, resImg;
  try { [baseImg, resImg] = await Promise.all([loadImage(baseSrc), loadImage(resultSrc)]); }
  catch { return null; }

  const w = baseImg.naturalWidth || baseImg.width;
  const h = baseImg.naturalHeight || baseImg.height;
  if (!w || !h) return null;

  // 소프트 게이트 반경 — 긴 변 대비 비율. base 저품질 엣지 은닉 + 새 디테일 클리핑 방지용 팽창/페더.
  const blurR = Math.max(2, Math.round(Math.min(w, h) * softness));

  const draw = (img, blur) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (blur) ctx.filter = `blur(${blur}px)`; // 지원 안 되면 무시됨 → 하드 게이트로 폴백
    ctx.drawImage(img, 0, 0, w, h);
    ctx.filter = 'none';
    return ctx;
  };

  let baseCtx, resCtx, baseData, resData;
  try {
    baseCtx = draw(baseImg, blurR); // 흐린 base → 부드럽게 확장된 발광 영역
    resCtx = draw(resImg, 0);       // 선명한 새 렌더 (blur 없음)
    baseData = baseCtx.getImageData(0, 0, w, h);
    resData = resCtx.getImageData(0, 0, w, h);
  } catch { return null; } // canvas taint

  // near-binary 게이트 — 발광 영역 안에서는 result 를 100% 보존(디테일 안 깎기), base 가
  // 확실히 비어 있는 바깥만 컬링. gamma(<1)로 중간 커버리지를 1 쪽으로 강하게 밀어 rim/내부
  // 디테일을 선명하게 유지하고, 아주 희미한 외곽 헤일로만 부드럽게 사라지게 한다.
  const threshold = 8, feather = 22;
  const bp = baseData.data;
  const rp = resData.data;
  for (let i = 0; i < bp.length; i += 4) {
    const lum = Math.max(bp[i], bp[i + 1], bp[i + 2]);
    let cov = lum <= threshold ? 0 : lum < threshold + feather ? (lum - threshold) / feather : 1;
    cov *= bp[i + 3] / 255;             // 기존 알파(투명 PNG base) 반영
    cov = cov <= 0 ? 0 : Math.min(1, Math.pow(cov, 0.4)); // 중간값→1 로 밀어 near-binary 화
    rp[i] = Math.round(rp[i] * cov);
    rp[i + 1] = Math.round(rp[i + 1] * cov);
    rp[i + 2] = Math.round(rp[i + 2] * cov);
    rp[i + 3] = 255; // 검은 배경 유지 (기존 파이프라인의 루마키 누끼와 호환)
  }
  resCtx.putImageData(resData, 0, 0);
  try { return resCtx.canvas.toDataURL('image/png'); }
  catch { return null; }
}
