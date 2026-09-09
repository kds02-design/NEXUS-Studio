// 투명화 자동 분류(triage) — 이미지 한 장을 보고 "어떤 투명화 경로가 맞는지" 규칙으로 제안한다.
// 사람이 plan.json 에서 고칠 수 있는 출발점이지 최종 판정이 아니다. 앱·MCP·CLI 공용(DOM 없음).
//
//   flat     : 테두리 색이 단색(std ≤ FLAT_STD) → 색상 키 기본값
//   vignette : 테두리에 완만한 그라디언트/비네팅(FLAT_STD < std ≤ NONFLAT_STD) → tolerance 상향 + killFaint
//   glow     : 배경 위 픽셀 대부분이 옅음(발광 플레이트) → 이펙트 추출
//   lowcontrast : 피사체가 배경과 색이 가까움(회색 위 크롬, 남색 위 진청) → 낮은 허용치로 키잉, 결과 확인 필수
//   nonflat  : 테두리 색 분산이 큼(사진·텍스처·회로판 배경) → 색상 키 대상 아님, AI 분리(Remove AI) 대상
//
// 판단 재료: borderStats(테두리 링 색 분산) · edgeHardness(피사체 경계 중 '단단한' 경계 비율) · softRatio(참고 통계).
// 발광 판정은 edgeHardness 로만 한다 — 옅은 픽셀 비율(softRatio)은 저대비 불투명 피사체(회색 배경 위 크롬,
// 남색 위 진청 버튼)도 높게 나와 오판이 잦았다(seoin 66장 실측: 크롬·버튼·헤이즈 프레임 8장 오판).
// 반면 글로우는 배경과 만나는 경계가 전부 부드러워 hardRatio ≈ 0.02, 불투명 피사체는 0.13 이상이었다.
import { borderStats } from "./alphaCleanup.js";
import { detectBg } from "./colorKeyExtract.js";
import { KEY_DEFAULTS } from "./colorKeyExtract.js";

export const TRIAGE_DEFAULTS = {
  flatStd: 8,        // 이하: 단색 매트
  nonflatStd: 45,    // 초과: 사진/텍스처 배경
  softDist: 110,     // 배경과의 색거리가 이 값 미만이면 '옅은' 픽셀 (통계용)
  hardDist: 84,      // 경계 픽셀의 색거리가 이 이상이면 '단단한' 경계 (= tolerance 40 + feather 22 × 2)
  edgeRadius: 2,     // 경계 판정 이웃 거리(px)
  glowHardRatio: 0.08, // 단단한 경계 비율이 이 미만이면 발광 플레이트
  lowContrastP50: 120, // 피사체 색거리 중앙값이 이 미만이면 저대비(회색 위 크롬 등) — 허용치를 올리면 피사체가 뚫린다
  minSubjectFrac: 0.002, // 배경과 다른 픽셀이 이보다 적으면 판단 보류(빈 이미지)
};

// 배경과 다른 픽셀 중 옅은 픽셀 비율. 샘플링(step)으로 2048² 도 수 ms.
export function softRatio(data, W, H, bg, { tolerance = KEY_DEFAULTS.tolerance, softDist = TRIAGE_DEFAULTS.softDist } = {}) {
  const step = Math.max(1, Math.floor(Math.sqrt((W * H) / 250000))); // 약 25만 샘플
  let subject = 0, soft = 0, total = 0;
  const t2 = tolerance * tolerance, s2 = softDist * softDist;
  const hist = new Uint32Array(450); // 피사체 픽셀의 색거리 히스토그램(1 단위) — 중앙값(p50) 계산용
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const i = (y * W + x) * 4;
      const dr = data[i] - bg[0], dg = data[i + 1] - bg[1], db = data[i + 2] - bg[2];
      const d2 = dr * dr + dg * dg + db * db;
      total++;
      if (d2 > t2) { subject++; if (d2 < s2) soft++; hist[Math.min(449, Math.sqrt(d2) | 0)]++; }
    }
  }
  let acc = 0, p50 = 0;
  for (let d = 0; d < hist.length; d++) { acc += hist[d]; if (acc >= subject / 2) { p50 = d; break; } }
  return { subjectFrac: subject / total, softRatio: subject ? soft / subject : 0, subjectP50: p50 };
}

// 피사체 경계의 단단함 — 배경(dist ≤ tolerance)과 edgeRadius px 안에서 만나는 피사체 픽셀 중,
// 색거리가 hardDist 이상인 비율. 글로우/연기는 경계가 전부 부드러워 0 에 가깝고 불투명 피사체는 실루엣이 단단하다.
export function edgeHardness(data, W, H, bg, { tolerance = KEY_DEFAULTS.tolerance, hardDist = TRIAGE_DEFAULTS.hardDist, edgeRadius = TRIAGE_DEFAULTS.edgeRadius } = {}) {
  const N = W * H, r = edgeRadius;
  const dist = new Float32Array(N);
  for (let p = 0; p < N; p++) {
    const i = p * 4;
    const dr = data[i] - bg[0], dg = data[i + 1] - bg[1], db = data[i + 2] - bg[2];
    dist[p] = Math.sqrt(dr * dr + dg * dg + db * db);
  }
  let boundary = 0, hard = 0;
  for (let y = r; y < H - r; y++) {
    for (let x = r; x < W - r; x++) {
      const p = y * W + x;
      if (dist[p] <= tolerance) continue;
      if (!(dist[p - r] <= tolerance || dist[p + r] <= tolerance || dist[p - r * W] <= tolerance || dist[p + r * W] <= tolerance)) continue;
      boundary++;
      if (dist[p] >= hardDist) hard++;
    }
  }
  return { boundary, hardRatio: boundary ? hard / boundary : 0 };
}

// 분류 결과: { class, mode, params, bg, stats, reason }
//   mode: 'key' | 'effect' | 'ai'   params: plan 항목에 그대로 병합할 옵션
export function triageImage(px, opts = {}) {
  const o = { ...TRIAGE_DEFAULTS, ...opts };
  const { data, width: W, height: H } = px;
  const st = borderStats(data, W, H);
  const bg = detectBg(data, W, H);
  const sr = softRatio(data, W, H, bg, { softDist: o.softDist });
  const eh = edgeHardness(data, W, H, bg, { hardDist: o.hardDist, edgeRadius: o.edgeRadius });
  const stats = { bgStd: Math.round(st.std * 10) / 10, bgMaxDist: Math.round(st.maxDist), subjectFrac: Math.round(sr.subjectFrac * 1000) / 1000, softRatio: Math.round(sr.softRatio * 100) / 100, subjectP50: sr.subjectP50, hardRatio: Math.round(eh.hardRatio * 1000) / 1000 };
  const bgOut = { r: bg[0], g: bg[1], b: bg[2] };

  if (st.std > o.nonflatStd) {
    return { class: "nonflat", mode: "ai", params: {}, bg: bgOut, stats, reason: `테두리 색 분산 std ${stats.bgStd} > ${o.nonflatStd} — 사진/텍스처 배경, 색상 키 불가(AI 분리 대상)` };
  }
  if (sr.subjectFrac < o.minSubjectFrac) {
    return { class: "flat", mode: "key", params: {}, bg: bgOut, stats, reason: `배경과 다른 픽셀이 ${(sr.subjectFrac * 100).toFixed(2)}% — 거의 빈 이미지, 기본값 유지(확인 필요)` };
  }
  if (eh.hardRatio < o.glowHardRatio) {
    return { class: "glow", mode: "effect", params: { cleanIslands: false, killFaint: 0 }, bg: bgOut, stats, reason: `경계의 ${(eh.hardRatio * 100).toFixed(1)}% 만 단단함(< ${o.glowHardRatio * 100}%) — 발광 플레이트, 이펙트 추출` };
  }
  if (st.std > o.flatStd && sr.subjectP50 < o.lowContrastP50) {
    // 배경은 평탄하지 않은데 피사체 절반이 배경과 색거리 120 미만 — 허용치를 올리면 피사체 본체가 뚫린다.
    // 기본값 근처의 낮은 허용치 + 넓은 페더로 보수적으로 키잉하고 얼룩 제거(killFaint)는 끈다. 단색 매트(std ≤ flatStd)면 그냥 flat.
    return { class: "lowcontrast", mode: "key", params: { tolerance: 45, feather: 40, killFaint: 0 }, bg: bgOut, stats, reason: `테두리 std ${stats.bgStd} 인데 피사체 색거리 중앙값 ${sr.subjectP50} < ${o.lowContrastP50} — 저대비 피사체(크롬/유리/동색 계열), tolerance 45·feather 40 로 보수적 키잉. 잔여 그림자·반사·헤이즈는 수동 확인 또는 AI 분리` };
  }
  if (st.std > o.flatStd) {
    // 허용치는 테두리 분산에 비례하되 피사체 색거리 중앙값의 절반을 넘지 않게 — 그라디언트는 지우고 피사체는 남긴다.
    const tolerance = Math.max(55, Math.min(110, Math.round(40 + 2.2 * st.std), Math.round(sr.subjectP50 * 0.5)));
    return { class: "vignette", mode: "key", params: { tolerance, feather: 35, killFaint: 160 }, bg: bgOut, stats, reason: `테두리 std ${stats.bgStd}, 피사체 p50 ${sr.subjectP50} — 비네팅/그라디언트, tolerance ${tolerance} + killFaint 160` };
  }
  return { class: "flat", mode: "key", params: {}, bg: bgOut, stats, reason: `테두리 std ${stats.bgStd} — 단색 매트, 색상 키 기본값` };
}
