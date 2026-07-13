// KV 컴포저 — 프로모션별 상단 비주얼 구도 + Figma용 레이어 분리 출력. (Figma식 3분할 에디터)
//   좌: 레이어/가이드 · 중앙: 풀-높이 캔버스(휠 줌·팬·드래그·핸들) · 우: 속성/배경.
//   페이지 3000×3620, KV 출력영역 상단 1688. 하단 알파 페이드는 배경색을 비춘다(미리보기).
//   세션: 프로모션 id 별 독립 — 로컬(LS+IndexedDB) 작업본 + '저장' 시 Firestore/Cloudinary 발행.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Download, UploadCloud, DownloadCloud, Loader2, X, Plus, Minus, Maximize2, Trash2, Eye, EyeOff, ChevronDown, AlignCenterHorizontal, Layers as LayersIcon, Undo2, Sparkles, Send,
} from "lucide-react";
import { useGlobal } from "../../../context/GlobalContext";
import { useAuth } from "../../../context/AuthContext";
import {
  KV_W, KV_EXPORT_H, BLEND_MODES, renderBase, renderKvThumb, downloadKvSet, dimRadialParams,
} from "../services/kvComposer";
import { trimTransparent, filterString, loadImageEl } from "../services/imageUtils";
import { isPsdFile, canServerExtract, PSD_BROWSER_LIMIT } from "../services/psdImport";
import { BASE_THEME, ENUM_LIST, extractPalette, analyzeKvTheme } from "../services/theme";
import { idbSave, idbLoad } from "../services/kvStore";
import { savePromotionSession, sessionToLocal, AREA_FIELDS, LEGACY_SESSION_PROMOTION_ID } from "../services/promotions";
import { buildFigmaVariablesJson, renderThemeSheetPng, downloadJson, downloadDataUrl } from "../services/themeDoc";
import { PROMO_LAYOUTS, AREA_LAYOUTS, defaultLayoutFor } from "./promoLayouts";
import { useUsageGate } from "../../../components/UsageGate";
import PsdImportModal from "./PsdImportModal";

// 프로모션별 영속 키 — 레거시(프로모션 도입 전) 단일 키는 첫 기본 프로모션이 물려받는다.
const LEGACY_LS_KEY = "nexus-preview:kv-settings";
const LEGACY_THEME_KEY = "nexus-preview:kv-theme";
const LEGACY_IDB_KEY = "session";
const lsKeyFor = (pid) => `nexus-preview:kv-settings:${pid}`;
const themeKeyFor = (pid) => `nexus-preview:kv-theme:${pid}`;
const idbKeyFor = (pid) => `session:${pid}`;
const LAYER_ORDER = ["bgImage", "female", "male", "title"];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// 가이드/부품 미리보기/레이어 역할은 프로모션 레이아웃(promoLayouts.jsx)이 정의 —
// guideVis 는 { [guideId]: bool } 이며 "키 없음 = 켜짐" 규약(레이아웃마다 가이드 id 가 다름).
const DEFAULTS = {
  bgColor: "#1E1E1E",
  pattern: { src: null, opacity: 0.4, blend: "soft-light", fit: "cover" },
  fadeStart: 62,
  sideFade: 0,
  guideVis: {},
  // 타이틀 뒤 원형 딤 (amount 0 = 끔) / 브랜드웹 좌측 메뉴 뒤 딤
  titleDim: { amount: 0, scale: 1, aspect: 1.6, softness: 0.5 },
  menuDim: { amount: 0, width: 0.3 },
  dateText: "", // 브랜드웹 날짜 텍스트 (비우면 샘플 문구)
  buttonText: "", // 브랜드웹 중앙 버튼 텍스트 (비우면 '사전예약')
};

function loadSettings(pid) {
  const read = (k) => { try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : null; } catch { return null; } };
  const raw = read(lsKeyFor(pid)) ?? (pid === LEGACY_SESSION_PROMOTION_ID ? read(LEGACY_LS_KEY) : null);
  if (raw) return {
    ...DEFAULTS, ...raw,
    pattern: { ...DEFAULTS.pattern, ...(raw.pattern || {}), src: null },
    titleDim: { ...DEFAULTS.titleDim, ...(raw.titleDim || {}) },
    menuDim: { ...DEFAULTS.menuDim, ...(raw.menuDim || {}) },
    _hasLocal: true,
  };
  return { ...DEFAULTS, _hasLocal: false };
}

const readImageFile = (file, cb) => {
  if (!file || !file.type?.startsWith("image/")) return;
  const r = new FileReader();
  r.onload = () => cb(r.result);
  r.readAsDataURL(file);
};

// 레이어 기본 배치 — 프로모션 레이아웃은 오상스 기준 통일(중앙 타이틀 + 좌우 캐릭터), 브랜드웹만 별도(1920×1080).
function defaultRect(id, nW, nH, layoutKey = "osangseu") {
  const cv = PROMO_LAYOUTS[layoutKey]?.canvas || { w: KV_W, exportH: KV_EXPORT_H };
  const W = cv.w, EH = cv.exportH;
  const ar = nW / nH;
  if (id === "bgImage") { const s = Math.max(W / nW, EH / nH); const w = nW * s, h = nH * s; return { x: (W - w) / 2, y: (EH - h) / 2, w, h }; }
  if (layoutKey.startsWith("brandweb")) {
    if (id === "title") {
      const sub = layoutKey === "brandwebSub"; // 서브 페이지 타이틀 — 가이드(y190, w800)와 동일 기준
      const w = (sub ? 0.42 : 0.40) * W, h = w / ar;
      return { x: (W - w) / 2, y: (sub ? 0.176 : 0.18) * EH, w, h };
    }
    // 중앙 캐릭터 구성이면 female 이 중앙, 그 외엔 좌/우
    const cx = layoutKey === "brandwebCenter" && id === "female" ? 0.5 : id === "female" ? 0.16 : 0.84;
    const h = 0.85 * EH, w = h * ar;
    return { x: cx * W - w / 2, y: EH - h, w, h };
  }
  if (id === "title") { const w = 0.42 * W, h = w / ar; return { x: (W - w) / 2, y: 0.14 * EH, w, h }; }
  const hf = id === "female" ? 0.82 : 0.86, cx = id === "female" ? 0.30 : 0.70;
  const h = hf * EH, w = h * ar;
  return { x: cx * W - w / 2, y: 0.99 * EH - h, w, h };
}

// 8방향 핸들 리사이즈. 기본 자유(코너=양축, 변=한 축), lock(Shift) 시 코너 비율 유지.
function resizeRect(orig, handle, dx, dy, lock) {
  const E = handle.includes("e"), W = handle.includes("w"), N = handle.includes("n"), S = handle.includes("s");
  let w = orig.w + (E ? dx : 0) - (W ? dx : 0);
  let h = orig.h + (S ? dy : 0) - (N ? dy : 0);
  if (lock && (E || W) && (N || S)) { // 코너 + Shift → 비율 유지
    const ar = orig.w / orig.h;
    if (w / orig.w >= h / orig.h) h = w / ar; else w = h * ar;
  }
  w = Math.max(24, w); h = Math.max(24, h);
  let x = orig.x, y = orig.y;
  if (W) x = orig.x + orig.w - w; // 좌측 변/코너는 좌상단이 움직임
  if (N) y = orig.y + orig.h - h;
  return { x, y, w, h };
}

const HANDLES = [
  { h: "nw", cur: "nwse-resize" }, { h: "n", cur: "ns-resize" }, { h: "ne", cur: "nesw-resize" },
  { h: "e", cur: "ew-resize" }, { h: "se", cur: "nwse-resize" }, { h: "s", cur: "ns-resize" },
  { h: "sw", cur: "nesw-resize" }, { h: "w", cur: "ew-resize" },
];

const loadTheme = (pid) => {
  const read = (k) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch { return null; } };
  return read(themeKeyFor(pid)) ?? (pid === LEGACY_SESSION_PROMOTION_ID ? read(LEGACY_THEME_KEY) : null) ?? BASE_THEME;
};

// 페이지 부품 프레임 4종 — key 는 고정(저장 스키마·몽타주 라운드트립 공유), 라벨은 레이아웃이 정의.
const EMPTY_FRAMES = { product: null, banner: null, bonus: null, mobile: null };

// KV 월 테마 → RubiconForge 리스킨/리디자인용 사람이 읽는 색·재질 지시 문자열.
function themeToHint(theme) {
  const t = theme?.tokens || {};
  const parts = [];
  if (theme?.name && theme.name !== "월 테마") parts.push(theme.name);
  if (theme?.concept) parts.push(theme.concept);
  const cols = [];
  if (t.primary) cols.push(`주조색 ${t.primary}`);
  if (t.accent) cols.push(`강조 ${t.accent}`);
  if (t.title) cols.push(`타이틀 ${t.title}`);
  if (t.panel) cols.push(`패널/카드 ${t.panel}`);
  if (t.bgTop || t.bgBottom) cols.push(`배경 ${t.bgTop || ""}~${t.bgBottom || ""}`);
  if (cols.length) parts.push(`팔레트: ${cols.join(", ")}`);
  return parts.filter(Boolean).join(" — ");
}
const PENDING_SLOT_KEY = "nexus-preview:kv-pending-frame";
const PENDING_SET_KEY = "nexus-preview:kv-pending-frameset"; // 3종 일괄 전송 시 몽타주 분할 정보

// 마지막으로 연 PSD 파일 — 모달을 닫아도 "다시 열기"로 복원 (모듈 보관: 프로모션 전환에도 유지).
// 파싱 결과는 psdImport.js 가 캐시하므로 재오픈은 즉시.
let lastPsdFileRef = null;

// 프레임 여러 종을 격자 몽타주로 합쳐 "한 번에" 리스킨/리디자인 → 반환 시 같은 스타일로 분할.
//   한 번의 렌더라 모든 종의 톤·질감·장식이 완전히 일치한다. 셀 경계는 정규화(0~1)로 저장해
//   반환 이미지가 균일 스케일돼도 비율로 분할 가능.
//   ⚠ 외곽·셀 사이에 여백(PAD/GAP)을 둬 프레임이 캔버스 가장자리에 닿지 않게 한다 —
//     모델이 가장자리를 재프레이밍하거나 imagenRender 의 비율 보정 center-crop 이 상/하단을 잘라도
//     여백 안에서만 잘려 프레임 본체는 보존된다(분할 후 trimTransparent 로 여백 제거).
const MONTAGE_GAP = 96;   // 셀 사이 투명 간격
const MONTAGE_PAD = 120;  // 외곽 여백(상하좌우) — 잘림 방지 버퍼
async function buildFrameMontage(items) {
  const imgs = await Promise.all(items.map((it) => loadImageEl(it.src)));
  const n = imgs.length;
  const cols = n <= 3 ? n : 2;                 // 4종은 2×2 격자(극단적 가로비 방지 → 리스킨 충실도↑)
  const rows = Math.ceil(n / cols);
  const cellW = Math.max(...imgs.map((i) => i.naturalWidth));
  const cellH = Math.max(...imgs.map((i) => i.naturalHeight));
  const W = MONTAGE_PAD * 2 + cols * cellW + (cols - 1) * MONTAGE_GAP;
  const H = MONTAGE_PAD * 2 + rows * cellH + (rows - 1) * MONTAGE_GAP;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const cells = [];
  imgs.forEach((img, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    const cellX = MONTAGE_PAD + c * (cellW + MONTAGE_GAP);
    const cellY = MONTAGE_PAD + r * (cellH + MONTAGE_GAP);
    ctx.drawImage(img, cellX + (cellW - img.naturalWidth) / 2, cellY + (cellH - img.naturalHeight) / 2);
    // 셀 박스 + 인접 여백 절반까지 포함해 연속 분할(빈 부분은 트림으로 제거).
    cells.push({
      slot: items[i].slot,
      x0: (cellX - (c === 0 ? MONTAGE_PAD : MONTAGE_GAP / 2)) / W,
      x1: (cellX + cellW + (c === cols - 1 ? MONTAGE_PAD : MONTAGE_GAP / 2)) / W,
      y0: (cellY - (r === 0 ? MONTAGE_PAD : MONTAGE_GAP / 2)) / H,
      y1: (cellY + cellH + (r === rows - 1 ? MONTAGE_PAD : MONTAGE_GAP / 2)) / H,
    });
  });
  return { dataUrl: canvas.toDataURL("image/png"), cells };
}
async function splitFrameSet(dataUrl, cells) {
  const img = await loadImageEl(dataUrl);
  if (!img) return {};
  const W = img.naturalWidth, H = img.naturalHeight;
  const out = {};
  for (const c of cells) {
    const sx = Math.round(c.x0 * W), sw = Math.max(1, Math.round((c.x1 - c.x0) * W));
    const sy = Math.round((c.y0 ?? 0) * H), sh = Math.max(1, Math.round(((c.y1 ?? 1) - (c.y0 ?? 0)) * H));
    const cv = document.createElement("canvas");
    cv.width = sw; cv.height = sh;
    cv.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    let d = cv.toDataURL("image/png");
    try { const t = await trimTransparent(d); d = t.dataUrl; } catch { /* 트림 실패 시 원본 */ }
    out[c.slot] = d;
  }
  return out;
}

// area: "promo"(프로모션 페이지) | "brandweb"(메인 히어로) | "brandweb-sub" | "brandweb-sub2" —
// 영역(브랜드웹은 페이지 단위)별로 세션(로컬 키·Firestore 필드)이 분리된다.
const AREA_LOCAL_PREFIX = { promo: "", brandweb: "bw:", "brandweb-sub": "bws:", "brandweb-sub2": "bws2:" };
const AREA_FILE_PREFIX = { promo: "kv", brandweb: "bw", "brandweb-sub": "bw_sub", "brandweb-sub2": "bw_sub2" };
export default function KvComposer({ T, accent, promotion, area = "promo" }) {
  const isBrandweb = area.startsWith("brandweb");
  const pid = `${AREA_LOCAL_PREFIX[area] ?? ""}${promotion?.id || "default"}`;
  const init = useMemo(() => loadSettings(pid), [pid]);
  const { ensureCanGenerate, modal: usageModal } = useUsageGate();
  const { navigate, payload, clearPayload } = useGlobal();
  const { user } = useAuth();
  const [frames, setFrames] = useState(EMPTY_FRAMES); // 섹션별 프레임 이미지 4종 (IndexedDB 영속)
  const setFrame = useCallback((key, src) => setFrames((f) => ({ ...f, [key]: src })), []);
  const [theme, setTheme] = useState(() => loadTheme(pid));
  const [cloudSaving, setCloudSaving] = useState(false);
  // 페이지 레이아웃 — 페이지 구성(오상스/제련석/주문서/브랜드웹)마다 캔버스 치수·가이드·부품이 다름.
  // LS/세션 영속, 기본값은 영역/게임/id 추정. 영역별 허용 레이아웃만 선택 가능.
  const [layoutKey, setLayoutKey] = useState(() => {
    const k = init.layout || defaultLayoutFor(promotion, area);
    return AREA_LAYOUTS[area]?.includes(k) ? k : defaultLayoutFor(promotion, area);
  });
  const L = PROMO_LAYOUTS[layoutKey] || PROMO_LAYOUTS.osangseu;
  const CV = L.canvas; // { w, h, exportH }
  // 클라우드 발행본 — 영역별 필드 분리 (session / brandwebSession / brandwebSubSession / …)
  const cloudSession = promotion?.[(AREA_FIELDS[area] || AREA_FIELDS.promo).session] || null;
  const [themeBusy, setThemeBusy] = useState(false);
  const [themeMsg, setThemeMsg] = useState(null);
  const [forgeMode, setForgeMode] = useState("reskin"); // 프레임 일괄 전송 모드: reskin | redesign
  const [forgeThemeText, setForgeThemeText] = useState(""); // 사용자 테마 지시(비우면 KV 테마 자동)
  const [bgColor, setBgColor] = useState(init.bgColor);
  const [pattern, setPattern] = useState(init.pattern);
  // 로컬 설정이 없으면 레이아웃 기본값 사용 (브랜드웹은 하단 페이드 없음 = 100)
  const [fadeStart, setFadeStart] = useState(() => (init._hasLocal ? init.fadeStart : (L.defaultFadeStart ?? init.fadeStart)));
  const [sideFade, setSideFade] = useState(init.sideFade ?? 0);
  const [psdFile, setPsdFile] = useState(null);
  const [lastPsd, setLastPsd] = useState(lastPsdFileRef);
  // 타이틀 임시 텍스트 — 타이포 완성 전 자리 잡기용(최대 3줄). 타이틀 이미지가 있으면 이미지 우선.
  const [titleText, setTitleText] = useState(init.titleText || "");
  // 브랜드웹 날짜/버튼 텍스트 — 부품 미리보기에 표시 (페이지별 세션 영속)
  const [dateText, setDateText] = useState(init.dateText || "");
  const [buttonText, setButtonText] = useState(init.buttonText || "");
  // 딤 효과 — 타이틀 뒤 원형(전 영역) / 좌측 메뉴 뒤 밴드(브랜드웹)
  const [titleDim, setTitleDim] = useState(init.titleDim);
  const [menuDim, setMenuDim] = useState(init.menuDim);
  const patchTitleDim = (p) => setTitleDim((prev) => ({ ...prev, ...p }));
  const patchMenuDim = (p) => setMenuDim((prev) => ({ ...prev, ...p }));
  const [guideVis, setGuideVis] = useState(init.guideVis);
  const [guidesCollapsed, setGuidesCollapsed] = useState(false);
  const [showParts, setShowParts] = useState(init.showParts !== false); // 페이지 부품(가이드와 별개)
  const [layers, setLayers] = useState({ bgImage: null, female: null, male: null, title: null });
  const [selId, setSelId] = useState(null);
  const [history, setHistory] = useState([]); // layers 스냅샷 스택 (undo)
  const [view, setView] = useState({ zoom: 0.2, panX: 40, panY: 20 });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [spacePan, setSpacePan] = useState(false); // 스페이스 누름(팬 모드) — 커서 표시용
  const [panning, setPanning] = useState(false);    // 실제 팬 드래그 중

  const viewportRef = useRef(null);
  const baseRef = useRef(null);
  const dragRef = useRef(null);
  const viewRef = useRef(view);
  const layersRef = useRef(layers);
  const historyRef = useRef(history);
  const spaceRef = useRef(false);
  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => { layersRef.current = layers; }, [layers]);
  useEffect(() => { historyRef.current = history; }, [history]);

  // 변경 직전 layers 스냅샷을 히스토리에 저장(최대 60). 위치/크기/추가/삭제 시 호출.
  const pushHistory = useCallback(() => { setHistory((h) => [...h.slice(-59), layersRef.current]); }, []);
  const undo = useCallback(() => {
    const h = historyRef.current;
    if (!h.length) return;
    const prev = h[h.length - 1];
    setHistory(h.slice(0, -1));
    setLayers(prev);
    setSelId((s) => (s && prev[s] ? s : null));
  }, []);

  useEffect(() => {
    try { localStorage.setItem(lsKeyFor(pid), JSON.stringify({ bgColor, pattern: { ...pattern, src: null }, fadeStart, sideFade, guideVis, showParts, layout: layoutKey, titleText, titleDim, menuDim, dateText, buttonText })); } catch { /* noop */ }
  }, [pid, bgColor, pattern, fadeStart, sideFade, guideVis, showParts, layoutKey, titleText, titleDim, menuDim, dateText, buttonText]);

  useEffect(() => { try { localStorage.setItem(themeKeyFor(pid), JSON.stringify(theme)); } catch { /* noop */ } }, [pid, theme]);

  // 이미지 영속화(IndexedDB) — 마운트 시 1회 복원, 이후 변경분 디바운스 저장.
  //   layers(배경/캐릭터/타이틀) + pattern.src(패턴) + frames(프레임 4종) 은 대용량 dataURL 이라 localStorage 불가.
  //   복원 우선순위: ① 프로모션별 IDB 작업본 → ② (첫 기본 프로모션 한정) 레거시 단일 세션 → ③ Firestore 발행본(URL).
  const idbReadyRef = useRef(false); // 복원 완료 전에는 저장 금지(빈 상태로 덮어쓰기 방지)
  useEffect(() => {
    let alive = true;
    (async () => {
      let s = await idbLoad(idbKeyFor(pid));
      if (!s && pid === LEGACY_SESSION_PROMOTION_ID) s = await idbLoad(LEGACY_IDB_KEY);
      const cloud = !s && cloudSession ? sessionToLocal(cloudSession) : null;
      if (!alive) return;
      if (s) {
        if (s.layers) setLayers((cur) => {
          const empty = !cur.bgImage && !cur.female && !cur.male && !cur.title;
          return empty ? { bgImage: null, female: null, male: null, title: null, ...s.layers } : cur;
        });
        if (s.patternSrc) setPattern((p) => (p.src ? p : { ...p, src: s.patternSrc }));
        if (s.frames) setFrames((f) => {
          const merged = { ...EMPTY_FRAMES };
          for (const k of Object.keys(EMPTY_FRAMES)) merged[k] = f[k] || s.frames[k] || null;
          return merged;
        });
      } else if (cloud) {
        setLayers((cur) => {
          const empty = !cur.bgImage && !cur.female && !cur.male && !cur.title;
          return empty ? { bgImage: null, female: null, male: null, title: null, ...cloud.layers } : cur;
        });
        if (cloud.pattern?.src) setPattern((p) => (p.src ? p : { ...p, src: cloud.pattern.src }));
        setFrames((f) => {
          const merged = { ...EMPTY_FRAMES };
          for (const k of Object.keys(EMPTY_FRAMES)) merged[k] = f[k] || cloud.frames?.[k] || null;
          return merged;
        });
        // 스칼라/테마는 로컬 설정이 아예 없던 경우만 클라우드 값으로 (로컬 작업본 우선).
        if (!init._hasLocal) {
          if (cloud.bgColor) setBgColor(cloud.bgColor);
          if (cloud.fadeStart != null) setFadeStart(cloud.fadeStart);
          if (cloud.sideFade != null) setSideFade(cloud.sideFade);
          if (cloud.guideVis) setGuideVis((g) => ({ ...g, ...cloud.guideVis }));
          setShowParts(cloud.showParts !== false);
          if (cloud.theme) setTheme(cloud.theme);
          if (cloud.layout && PROMO_LAYOUTS[cloud.layout]) setLayoutKey(cloud.layout);
          if (cloud.titleText) setTitleText(cloud.titleText);
          if (cloud.titleDim) setTitleDim((d) => ({ ...d, ...cloud.titleDim }));
          if (cloud.menuDim) setMenuDim((d) => ({ ...d, ...cloud.menuDim }));
          if (cloud.dateText) setDateText(cloud.dateText);
          if (cloud.buttonText) setButtonText(cloud.buttonText);
        }
      }
    })().finally(() => { if (alive) idbReadyRef.current = true; });
    return () => { alive = false; };
    // pid 전환은 부모의 key 리마운트로 처리 — 마운트 시 1회만.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!idbReadyRef.current) return;
    const id = setTimeout(() => { idbSave(idbKeyFor(pid), { layers, patternSrc: pattern.src, frames }); }, 500);
    return () => clearTimeout(id);
  }, [pid, layers, pattern.src, frames]);

  // RubiconForge 등에서 부품(프레임) 반환 payload 수신 → 직전에 보낸 슬롯(pending)에 적용.
  const consumedFrameRef = useRef(null);
  useEffect(() => {
    if (!payload || payload.target !== "nexus-preview" || payload.params?.slot !== "frame") return;
    if (consumedFrameRef.current === payload.timestamp) return;
    consumedFrameRef.current = payload.timestamp;
    const img = payload.params?.frameImage || payload.image?.url;
    if (!img) { try { clearPayload?.(); } catch { /* noop */ } return; }
    let setCells = null;
    try { const r = localStorage.getItem(PENDING_SET_KEY); if (r) setCells = JSON.parse(r); } catch { /* noop */ }
    if (setCells && setCells.length) {
      // 3종 일괄 반환 — 몽타주를 분할해 각 슬롯에 적용
      (async () => {
        try {
          const parts = await splitFrameSet(img, setCells);
          setFrames((f) => ({ ...f, ...parts }));
          setThemeMsg({ ok: true, msg: `프레임 ${Object.keys(parts).length}종 일괄 적용 완료` });
        } catch (e) { setThemeMsg({ ok: false, msg: `분할 실패: ${e.message}` }); }
        finally { try { localStorage.removeItem(PENDING_SET_KEY); } catch { /* noop */ } }
      })();
    } else {
      let slot = "product";
      try { slot = localStorage.getItem(PENDING_SLOT_KEY) || "product"; } catch { /* noop */ }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFrame(slot, img);
    }
    try { clearPayload?.(); } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload?.timestamp]);

  const setToken = (k, v) => setTheme((t) => ({ ...t, tokens: { ...t.tokens, [k]: v } }));
  const setVariant = (k, v) => setTheme((t) => ({ ...t, variants: { ...t.variants, [k]: v } }));

  const kvThumbOpts = () => ({ bgColor, pattern, bgImage: layersRef.current.bgImage, female: layersRef.current.female, male: layersRef.current.male, pageW: CV.w, pageH: CV.h, exportH: CV.exportH });

  // 무API 역할 기반 팔레트 추출(node-vibrant) — 다양한 색을 즉시 반영.
  const extractTheme = async () => {
    setThemeBusy(true); setThemeMsg(null);
    try {
      const thumb = await renderKvThumb(kvThumbOpts(), 0.3);
      const pal = await extractPalette(thumb);
      if (!pal) throw new Error("팔레트 추출 실패");
      setTheme((t) => ({ ...t, tokens: { ...t.tokens, ...pal } }));
      setThemeMsg({ ok: true, msg: "KV 팔레트 추출 완료 (Vibrant)" });
    } catch (e) { setThemeMsg({ ok: false, msg: `추출 실패: ${e.message}` }); }
    finally { setThemeBusy(false); }
  };

  // AI 정제 — 무드·variants·톤 보정(analysis 1c). 팔레트 위에 얹음.
  const refineTheme = async () => {
    setThemeBusy(true); setThemeMsg(null);
    try {
      const ok = ensureCanGenerate ? await ensureCanGenerate("analysis") : true;
      if (!ok) { setThemeMsg({ ok: false, msg: "크레딧 부족 — 정제 스킵" }); return; }
      const thumb = await renderKvThumb(kvThumbOpts(), 0.3);
      const refined = await analyzeKvTheme(thumb, theme);
      setTheme(refined);
      setThemeMsg({ ok: true, msg: `AI 정제 완료: ${refined.name}` });
    } catch (e) { setThemeMsg({ ok: false, msg: `정제 실패: ${e.message}` }); }
    finally { setThemeBusy(false); }
  };

  // 특정 섹션 프레임을 소스로, KV를 배경 참조로 RubiconForge에 전송 → 리스킨 후 "넥서스 프리뷰로".
  const sendFrameToForge = async (key, label) => {
    const src = frames[key];
    if (!src) return;
    setThemeBusy(true); setThemeMsg(null);
    try {
      try { localStorage.setItem(PENDING_SLOT_KEY, key); } catch { /* noop */ } // 반환 적용 슬롯 기억
      const thumb = await renderKvThumb(kvThumbOpts(), 0.42);
      navigate("rubicon-forge", {
        source: "nexus-preview", target: "rubicon-forge",
        prompt: { text: "", tags: [], style: "" },
        image: { url: src, metadata: {} },
        params: { slot: key, slotLabel: `${label} 프레임`, kvReference: thumb, kvTheme: theme.tokens },
        timestamp: Date.now(),
      });
    } catch (e) { setThemeMsg({ ok: false, msg: `전송 실패: ${e.message}` }); setThemeBusy(false); }
  };

  // 프레임 여러 종을 몽타주 한 장으로 묶어 한 번에 리스킨/리디자인 → 반환 시 같은 스타일로 분할·적용.
  const sendFrameSetToForge = async () => {
    const items = L.frameSlots.filter(({ key }) => frames[key]).map(({ key }) => ({ slot: key, src: frames[key] }));
    if (!items.length) { setThemeMsg({ ok: false, msg: "먼저 프레임을 올리세요" }); return; }
    setThemeBusy(true); setThemeMsg(null);
    try {
      const { dataUrl, cells } = await buildFrameMontage(items);
      try { localStorage.setItem(PENDING_SET_KEY, JSON.stringify(cells)); localStorage.removeItem(PENDING_SLOT_KEY); } catch { /* noop */ }
      const thumb = await renderKvThumb(kvThumbOpts(), 0.42);
      const themeText = (forgeThemeText || "").trim() || themeToHint(theme);
      const modeLabel = forgeMode === "redesign" ? "리디자인" : "리스킨";
      navigate("rubicon-forge", {
        source: "nexus-preview", target: "rubicon-forge",
        prompt: { text: "", tags: [], style: "" },
        image: { url: dataUrl, metadata: {} },
        params: { slot: "frameSet", mode: forgeMode, themeText, slotLabel: `프레임 ${items.length}종(일괄·${modeLabel})`, kvReference: thumb, kvTheme: theme.tokens },
        timestamp: Date.now(),
      });
    } catch (e) { setThemeMsg({ ok: false, msg: `전송 실패: ${e.message}` }); setThemeBusy(false); }
  };

  // 월 테마 + KV 레퍼런스를 RubiconForge로 전송 — 그 톤에 맞춰 부품 리스킨/리디자인.
  const sendToForge = async () => {
    setThemeBusy(true); setThemeMsg(null);
    try {
      const thumb = await renderKvThumb(kvThumbOpts(), 0.42);
      navigate("rubicon-forge", {
        source: "nexus-preview", target: "rubicon-forge",
        prompt: { text: "", tags: [], style: "" },
        image: { url: thumb, metadata: {} },
        params: { kvTheme: theme.tokens, kvThemeName: theme.name },
        timestamp: Date.now(),
      });
    } catch (e) { setThemeMsg({ ok: false, msg: `전송 실패: ${e.message}` }); setThemeBusy(false); }
  };

  // 배경 베이스(단색+패턴 이미지) 렌더 → 프레임 배경 캔버스(페이지 전체)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const base = await renderBase({ bgColor, pattern }, CV.w, CV.h, 0.3);
        if (cancelled || !baseRef.current) return;
        const c = baseRef.current; c.width = base.width; c.height = base.height;
        c.getContext("2d").drawImage(base, 0, 0);
      } catch (e) { console.warn("[KvComposer] base render", e?.message || e); }
    })();
    return () => { cancelled = true; };
  }, [bgColor, pattern, CV.w, CV.h]);

  const updateLayer = useCallback((id, patch) => {
    setLayers((prev) => ({ ...prev, [id]: prev[id] ? { ...prev[id], ...patch } : prev[id] }));
  }, []);
  const addLayer = useCallback((id, src) => {
    const img = new Image();
    img.onload = () => { pushHistory(); setLayers((prev) => ({ ...prev, [id]: { src, ...defaultRect(id, img.naturalWidth, img.naturalHeight, layoutKey), visible: true, opacity: 1 } })); setSelId(id); };
    img.src = src;
  }, [pushHistory, layoutKey]);
  const removeLayer = useCallback((id) => { pushHistory(); setLayers((prev) => ({ ...prev, [id]: null })); setSelId((s) => (s === id ? null : s)); }, [pushHistory]);

  // PSD 열기 — 모듈에 파일을 기억해 모달을 닫아도 "다시 열기" 가능 (파싱은 서비스가 캐시).
  // 대용량(>250MB)은 dev 서버(Node) 추출로 자동 우회(모달이 처리). 프로덕션(서버 추출 불가)만 경고.
  const openPsd = useCallback((f) => {
    if (!f) return;
    const mb = Math.round(f.size / 1024 / 1024);
    if (f.size > PSD_BROWSER_LIMIT && !canServerExtract() && !confirm(
      `PSD 가 ${mb}MB 입니다. 브라우저 파싱은 약 250MB 를 넘으면 메모리 부족으로 실패할 수 있어요.\n\n` +
      `권장: 로컬 개발 서버(npm run dev)에서 열면 Node 가 대신 추출합니다.\n` +
      `또는 터미널에서: node scripts/psd-extract.mjs "${f.name}"\n\n그래도 브라우저에서 시도할까요?`,
    )) return;
    lastPsdFileRef = f; setLastPsd(f); setPsdFile(f);
  }, []);

  // 파일 → 레이어. PSD 는 모달로, 이미지는 투명 여백 자동 트림 후 등록.
  const importImage = useCallback((id, file) => {
    if (!file) return;
    if (isPsdFile(file)) { openPsd(file); return; }
    readImageFile(file, async (src) => {
      try { const { dataUrl } = await trimTransparent(src); addLayer(id, dataUrl); }
      catch { addLayer(id, src); }
    });
  }, [addLayer, openPsd]);
  const toggleVisible = useCallback((id) => setLayers((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], visible: prev[id].visible === false } } : prev)), []);

  // 다른 앱(Mask Forge / Typecore / Theme Forge 등)에서 보낸 이미지 payload → 타이틀 레이어로.
  // (params.slot 이 있는 프레임 반환 payload 는 위의 프레임 effect 가 소비.)
  const consumedTitleRef = useRef(null);
  useEffect(() => {
    if (!payload || payload.target !== "nexus-preview" || payload.params?.slot) return;
    const url = payload.image?.url;
    if (!url || !payload.timestamp || consumedTitleRef.current === payload.timestamp) return;
    consumedTitleRef.current = payload.timestamp;
    (async () => {
      let src = url;
      // dataURL 만 트림 — 원격 URL 은 canvas taint 위험이 있어 그대로 등록.
      if (url.startsWith("data:")) { try { const { dataUrl } = await trimTransparent(url); src = dataUrl; } catch { /* noop */ } }
      addLayer("title", src);
    })();
    try { clearPayload?.(); } catch { /* noop */ }
  }, [payload, addLayer, clearPayload]);

  // 현재 세션(설정+이미지+테마)을 Firestore/Cloudinary 로 발행 — 목록 항목(썸네일·수정일)이 갱신된다.
  const handleCloudSave = async () => {
    if (cloudSaving) return;
    if (!user?.uid) { setStatus({ ok: false, msg: "클라우드 저장은 로그인이 필요합니다." }); return; }
    setCloudSaving(true); setStatus(null);
    try {
      let thumbDataUrl = null;
      try { thumbDataUrl = await renderKvThumb(kvThumbOpts(), 0.2); } catch { /* 썸네일 실패는 무시 */ }
      await savePromotionSession(promotion?.id || "default", {
        bgColor, pattern, fadeStart, sideFade, guideVis, showParts, layout: layoutKey, titleText, titleDim, menuDim, dateText, buttonText,
        layers: layersRef.current, frames, theme, thumbDataUrl,
      }, area);
      setStatus({ ok: true, msg: `'${promotion?.name || pid}' 저장 완료 — 목록에 반영됨` });
    } catch (e) { setStatus({ ok: false, msg: `클라우드 저장 실패: ${e.message || e}` }); }
    finally { setCloudSaving(false); }
  };

  // 타이틀 임시 텍스트 → Typecore Breeze 로 전송해 타이포 제작. 완성본은 브리즈에서
  // "넥서스 프리뷰로" 보내면 타이틀 레이어로 자동 수신(payload 효과).
  const sendTitleToBreeze = () => {
    const text = titleText.trim();
    if (!text) return;
    navigate("typecore-breeze", {
      source: "nexus-preview", target: "typecore-breeze",
      prompt: { text, tags: [], style: "" },
      params: { from: "kv-title", promotionId: pid },
      timestamp: Date.now(),
    });
  };

  // 세션 데이터(sessionToLocal 결과)를 현재 상태에 통째로 적용 — 최신 복원/히스토리 불러오기 공용.
  const applyCloudSession = (cloud, label) => {
    if (!cloud) return;
    pushHistory();
    setLayers({ bgImage: null, female: null, male: null, title: null, ...cloud.layers });
    setPattern(cloud.pattern);
    setFrames({ ...EMPTY_FRAMES, ...cloud.frames });
    if (cloud.bgColor) setBgColor(cloud.bgColor);
    if (cloud.fadeStart != null) setFadeStart(cloud.fadeStart);
    if (cloud.sideFade != null) setSideFade(cloud.sideFade);
    if (cloud.guideVis) setGuideVis((g) => ({ ...g, ...cloud.guideVis }));
    setShowParts(cloud.showParts !== false);
    if (cloud.theme) setTheme(cloud.theme);
    if (cloud.layout && PROMO_LAYOUTS[cloud.layout]) setLayoutKey(cloud.layout);
    setTitleText(cloud.titleText || "");
    if (cloud.titleDim) setTitleDim((d) => ({ ...d, ...cloud.titleDim }));
    if (cloud.menuDim) setMenuDim((d) => ({ ...d, ...cloud.menuDim }));
    setDateText(cloud.dateText || "");
    setButtonText(cloud.buttonText || "");
    setSelId(null);
    setStatus({ ok: true, msg: `'${label}' 불러옴` });
  };

  // Firestore 최신 발행본으로 현재 상태 덮어쓰기 (로컬 작업본 폐기).
  const handleCloudRestore = () => {
    const cloud = cloudSession ? sessionToLocal(cloudSession) : null;
    if (!cloud) { setStatus({ ok: false, msg: "클라우드에 저장된 세션이 없습니다." }); return; }
    if (!confirm("클라우드 최신 발행본으로 되돌릴까요? 현재 로컬 작업 내용은 대체됩니다.")) return;
    applyCloudSession(cloud, "최신 발행본");
  };

  // 줌/팬
  const fitView = useCallback(() => {
    const vp = viewportRef.current; if (!vp) return;
    const { width: vw, height: vh } = vp.getBoundingClientRect();
    const zoom = Math.min(vw / CV.w, vh / CV.h) * 0.94;
    setView({ zoom, panX: (vw - CV.w * zoom) / 2, panY: (vh - CV.h * zoom) / 2 });
  }, [CV.w, CV.h]); // 레이아웃 전환(캔버스 치수 변경) 시 화면 다시 맞춤
  useEffect(() => { const t = setTimeout(fitView, 30); return () => clearTimeout(t); }, [fitView]);

  const applyZoom = useCallback((nextZoom, cx, cy) => {
    setView((v) => { const z = clamp(nextZoom, 0.04, 4); const wx = (cx - v.panX) / v.zoom, wy = (cy - v.panY) / v.zoom; return { zoom: z, panX: cx - wx * z, panY: cy - wy * z }; });
  }, []);

  useEffect(() => {
    const vp = viewportRef.current; if (!vp) return;
    const onWheel = (e) => { e.preventDefault(); const r = vp.getBoundingClientRect(); const f = e.deltaY < 0 ? 1.12 : 1 / 1.12; applyZoom(viewRef.current.zoom * f, e.clientX - r.left, e.clientY - r.top); };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [applyZoom]);

  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current; if (!d) return;
      const zoom = viewRef.current.zoom;
      if (d.mode === "pan") setView((v) => ({ ...v, panX: d.orig.panX + (e.clientX - d.startX), panY: d.orig.panY + (e.clientY - d.startY) }));
      else if (d.mode === "move") updateLayer(d.id, { x: d.orig.x + (e.clientX - d.startX) / zoom, y: d.orig.y + (e.clientY - d.startY) / zoom });
      else if (d.mode === "resize") updateLayer(d.id, resizeRect(d.orig, d.corner, (e.clientX - d.startX) / zoom, (e.clientY - d.startY) / zoom, e.shiftKey));
    };
    const onUp = () => { dragRef.current = null; setPanning(false); };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [updateLayer]);

  // 키보드 — 화살표 미세이동 / Delete 삭제 / Space 팬
  useEffect(() => {
    const isField = (t) => t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    const onDown = (e) => {
      if (isField(e.target)) return; // 입력창에선 기본 동작(텍스트 undo 등)
      if (e.code === "Space") { spaceRef.current = true; setSpacePan(true); e.preventDefault(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) { e.preventDefault(); undo(); return; }
      if (!selId) return;
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); removeLayer(selId); return; }
      const step = e.shiftKey ? 20 : 1;
      const L = layersRef.current[selId]; if (!L) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); updateLayer(selId, { x: L.x - step }); }
      else if (e.key === "ArrowRight") { e.preventDefault(); updateLayer(selId, { x: L.x + step }); }
      else if (e.key === "ArrowUp") { e.preventDefault(); updateLayer(selId, { y: L.y - step }); }
      else if (e.key === "ArrowDown") { e.preventDefault(); updateLayer(selId, { y: L.y + step }); }
    };
    const onUp = (e) => { if (e.code === "Space") { spaceRef.current = false; setSpacePan(false); } };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
  }, [selId, removeLayer, updateLayer, undo]);

  const panFrom = (e) => { setPanning(true); dragRef.current = { mode: "pan", startX: e.clientX, startY: e.clientY, orig: { panX: viewRef.current.panX, panY: viewRef.current.panY } }; };
  const onViewportDown = (e) => { if (spaceRef.current) { panFrom(e); return; } setSelId(null); panFrom(e); };
  const startMove = (e, id) => { e.stopPropagation(); if (spaceRef.current) { panFrom(e); return; } pushHistory(); setSelId(id); dragRef.current = { mode: "move", id, startX: e.clientX, startY: e.clientY, orig: { ...layersRef.current[id] } }; };
  const startResize = (e, id, corner) => { e.stopPropagation(); if (spaceRef.current) { panFrom(e); return; } pushHistory(); const L = layersRef.current[id]; dragRef.current = { mode: "resize", id, corner, startX: e.clientX, startY: e.clientY, orig: { ...L } }; };

  // 타이틀 딤 기준 영역 — 타이틀 레이어가 있으면 그 위치를 따라가고, 없으면 레이아웃 타이틀 가이드.
  const titleRectForDim = () => {
    const tl = layers.title;
    if (tl) return { cx: tl.x + tl.w / 2, cy: tl.y + tl.h / 2, w: tl.w, h: tl.h };
    const g = L.guideDefs.find((d) => d.id === "title")?.rect;
    if (g) return { cx: g.x + g.w / 2, cy: g.y + g.h / 2, w: g.w, h: g.h };
    return { cx: CV.w / 2, cy: CV.exportH * 0.3, w: CV.w * 0.4, h: CV.exportH * 0.25 };
  };

  // 컬러 시스템 문서 — 피그마 변수 JSON + 스와치 시트 PNG 다운로드 (테마 패널·KV 출력 공용).
  const docName = `${promotion?.name || "Promo"} 컬러 시스템`;
  const exportThemeDoc = () => {
    try {
      downloadJson(buildFigmaVariablesJson(theme, docName), `${promotion?.name || "promo"}_컬러변수.json`);
      downloadDataUrl(renderThemeSheetPng(theme, docName), `${promotion?.name || "promo"}_컬러시스템.png`);
      setThemeMsg({ ok: true, msg: "피그마 변수 JSON + 스와치 PNG 내보냄" });
    } catch (e) { setThemeMsg({ ok: false, msg: `내보내기 실패: ${e.message || e}` }); }
  };

  const handleDownload = async () => {
    setBusy(true); setStatus(null);
    const prefix = AREA_FILE_PREFIX[area] ?? "kv";
    try {
      const files = await downloadKvSet({
        bgColor, pattern, ...layers, pageW: CV.w, pageH: CV.h, exportH: CV.exportH, filePrefix: prefix,
        // 딤 레이어 — 투명 PNG 로 동봉 (배경 위 / 타이틀 아래 스택용)
        titleDim: titleDim.amount > 0 ? { ...titleDim, rect: titleRectForDim() } : null,
        menuDim: area === "brandweb" && menuDim.amount > 0 ? menuDim : null,
      });
      // 컬러 시스템 문서 동봉 — 이미지들과 함께 피그마 변수 JSON + 스와치 PNG 출력.
      try {
        downloadDataUrl(renderThemeSheetPng(theme, docName), `${prefix}_컬러시스템.png`);
        downloadJson(buildFigmaVariablesJson(theme, docName), `${prefix}_컬러변수.json`);
        files.push(`${prefix}_컬러시스템.png`, `${prefix}_컬러변수.json`);
      } catch { /* 컬러 문서 실패는 레이어 출력에 영향 없음 */ }
      setStatus({ ok: true, msg: `${files.length}개 다운로드: ${files.join(" · ")}` });
    }
    catch (e) { setStatus({ ok: false, msg: `출력 실패: ${e.message}` }); }
    finally { setBusy(false); }
  };

  const zoomAtCenter = (factor) => { const vp = viewportRef.current; applyZoom(view.zoom * factor, (vp?.clientWidth || 0) / 2, (vp?.clientHeight || 0) / 2); };

  // 배경 이미지를 KV 프레임(3000×1688)에 cover/contain 로 비율 맞춤.
  const fitBg = (mode) => {
    const L = layersRef.current.bgImage; if (!L) return;
    const img = new Image();
    img.onload = () => {
      const nW = img.naturalWidth, nH = img.naturalHeight;
      const s = mode === "cover" ? Math.max(CV.w / nW, CV.exportH / nH) : Math.min(CV.w / nW, CV.exportH / nH);
      const w = nW * s, h = nH * s;
      updateLayer("bgImage", { x: (CV.w - w) / 2, y: (CV.exportH - h) / 2, w, h });
    };
    img.src = L.src;
  };

  // 캔버스(바탕)에 이미지/PSD 드래그 → PSD는 모달, 이미지는 빈 슬롯부터 순서대로 등록.
  const handleCanvasDrop = (e) => {
    e.preventDefault();
    const all = Array.from(e.dataTransfer.files || []);
    const psd = all.find((f) => isPsdFile(f));
    if (psd) { openPsd(psd); return; }
    const files = all.filter((f) => f.type?.startsWith("image/"));
    if (!files.length) return;
    const empties = LAYER_ORDER.filter((id) => !layersRef.current[id]);
    files.forEach((f) => { const target = empties.shift() || selId || "bgImage"; importImage(target, f); });
  };

  const border = T.border, panelBg = T.surface;
  const hs = 12 / view.zoom;
  const sel = selId ? layers[selId] : null;
  // 하단(세로) + 좌우(가로) 페이드 마스크 합성. 좌우는 대칭(우측 시작 옵션 없음).
  const vMask = `linear-gradient(180deg, #000 ${fadeStart}%, transparent 100%)`;
  const hMask = sideFade > 0
    ? `linear-gradient(90deg, transparent 0%, #000 ${sideFade}%, #000 ${100 - sideFade}%, transparent 100%)`
    : `linear-gradient(90deg, #000 0%, #000 100%)`;
  const fadeMask = { img: `${vMask}, ${hMask}` };
  const setGuide = (k, v) => setGuideVis((g) => ({ ...g, [k]: v }));
  // guideVis 규약: 키 없음 = 켜짐 (레이아웃마다 가이드 id 가 달라서 기본 전체 on)
  const guideOn = (k) => guideVis[k] !== false;
  const allGuideIds = [...L.guideDefs.map((g) => g.id), "safe", "boundary"];
  const anyGuideOn = allGuideIds.some(guideOn);
  const setAllGuides = (v) => setGuideVis(Object.fromEntries(allGuideIds.map((id) => [id, v])));

  return (
    <div style={{ display: "flex", height: "100%", minHeight: 0, background: T.bg, color: T.text, fontFamily: "'Noto Sans KR', sans-serif" }}>
      {/* ─── 좌: 레이어 + 가이드 ─── */}
      <aside style={{ width: 236, flexShrink: 0, borderRight: `1px solid ${border}`, background: panelBg, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "10px 10px 2px", display: "flex", flexDirection: "column", gap: 6 }}>
          <PsdButton T={T} accent={accent} onFile={(f) => f && openPsd(f)} />
          {lastPsd && !psdFile && (
            <button onClick={() => setPsdFile(lastPsd)} title={`'${lastPsd.name}' 추출 결과 다시 열기 (재파싱 없음)`}
              style={{ width: "100%", padding: "6px 9px", borderRadius: 8, border: `1px dashed ${border}`, background: "transparent", color: T.textMuted, fontSize: 10.5, cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              ↺ 최근 PSD 다시 열기 — {lastPsd.name}
            </button>
          )}
        </div>

        {/* 페이지 구성 — 페이지 문법 선택 (오상스형/제련석형/주문서형). 영역별 허용 목록만, 1개면 숨김 */}
        {(AREA_LAYOUTS[area] || []).length > 1 && (
          <>
            <PanelTitle T={T}>페이지 구성</PanelTitle>
            <div style={{ padding: "0 10px 4px", display: "flex", flexDirection: "column", gap: 5 }}>
              {(AREA_LAYOUTS[area] || []).map((k) => PROMO_LAYOUTS[k]).filter(Boolean).map((opt) => {
                const on = layoutKey === opt.key;
                return (
                  <button key={opt.key} onClick={() => setLayoutKey(opt.key)} style={{
                    padding: "7px 10px", borderRadius: 8, fontSize: 11, fontWeight: on ? 800 : 600, cursor: "pointer", textAlign: "left",
                    border: `1px solid ${on ? accent : border}`, background: on ? `${accent}1C` : "transparent",
                    color: on ? accent : T.textMuted,
                  }}>{opt.label}</button>
                );
              })}
            </div>
          </>
        )}

        <PanelTitle T={T}>레이어</PanelTitle>
        <div style={{ padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
          {LAYER_ORDER.map((id) => (
            <LayerRow key={id} T={T} accent={accent} id={id} label={L.layerLabels[id]} layer={layers[id]}
              selected={selId === id} onSelect={() => layers[id] && setSelId(id)}
              onToggle={() => toggleVisible(id)} onRemove={() => removeLayer(id)}
              onFile={(f) => importImage(id, f)} />
          ))}
        </div>

        {/* 타이틀 임시 텍스트 — 타이포 완성 전 자리 잡기(최대 3줄) + 브리즈로 타이포 제작 전송 */}
        <div style={{ padding: "0 10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          <FieldLabel T={T}>타이틀 임시 텍스트 (최대 3줄{layers.title ? " · 타이틀 이미지가 우선" : ""})</FieldLabel>
          <textarea
            value={titleText}
            onChange={(e) => setTitleText(e.target.value.split("\n").slice(0, 3).join("\n"))}
            rows={3}
            placeholder={"예)\n새로고침\n제련석"}
            style={{ width: "100%", resize: "none", borderRadius: 8, border: `1px solid ${border}`, background: T.bg, color: T.text, fontSize: 11, lineHeight: 1.5, padding: "8px 10px", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
          />
          <button onClick={sendTitleToBreeze} disabled={!titleText.trim()}
            title={titleText.trim() ? "이 텍스트로 Typecore Breeze 에서 타이포 제작 → 완성본은 타이틀 레이어로 돌아옵니다" : "텍스트를 먼저 입력하세요"}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "8px", borderRadius: 8, border: `1px solid ${accent}55`, background: `${accent}14`, color: accent, fontSize: 11, fontWeight: 800, cursor: titleText.trim() ? "pointer" : "default", opacity: titleText.trim() ? 1 : 0.45 }}>
            <Sparkles size={13} /> 타이포 만들기 → 브리즈
          </button>
        </div>

        {/* 가이드 — 톤 낮춤 + 접기/펼치기 + 전체 끄기 */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "12px 8px 6px" }}>
          <button onClick={() => setGuidesCollapsed((c) => !c)}
            style={{ display: "flex", alignItems: "center", gap: 4, flex: 1, background: "transparent", border: 0, cursor: "pointer", color: T.textDim, fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", padding: "4px 4px" }}>
            <ChevronDown size={13} style={{ transform: guidesCollapsed ? "rotate(-90deg)" : "none", transition: "transform 0.15s" }} /> 가이드
          </button>
          <button onClick={() => setAllGuides(!anyGuideOn)} title="전체 가이드 끄기/켜기"
            style={{ fontSize: 10, color: T.textDim, background: "transparent", border: `1px solid ${border}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}>
            {anyGuideOn ? "전체 끄기" : "전체 켜기"}
          </button>
        </div>
        {!guidesCollapsed && (
          <div style={{ padding: "0 10px 14px", display: "flex", flexDirection: "column", gap: 2, opacity: 0.85 }}>
            {L.guideDefs.map((g) => (
              <GuideToggle key={g.id} T={T} label={g.label} color={g.color} on={guideOn(g.id)} onToggle={() => setGuide(g.id, !guideOn(g.id))} />
            ))}
            {L.safeWidths.length > 0 && <GuideToggle T={T} label={`안전영역 (${L.safeWidths.join(" · ")})`} color={accent} on={guideOn("safe")} onToggle={() => setGuide("safe", !guideOn("safe"))} />}
            {CV.exportH < CV.h && <GuideToggle T={T} label={`KV 출력경계 (${CV.exportH})`} color="#9aa0aa" on={guideOn("boundary")} onToggle={() => setGuide("boundary", !guideOn("boundary"))} />}
          </div>
        )}

        {/* 페이지 부품(프레임 등록·리스킨) — 프로모션 전용. 브랜드웹은 우측 패널의 버튼/박스 슬롯 사용 */}
        {!isBrandweb && (<>
        <PanelTitle T={T}>페이지 부품</PanelTitle>
        <div style={{ padding: "0 12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
          <GuideToggle T={T} label="KV 아래 부품 미리보기 (월 테마)" color={accent} on={showParts} onToggle={() => setShowParts((s) => !s)} />
          <div style={{ fontSize: 10.5, color: T.textDim, lineHeight: 1.5 }}>섹션별 프레임 4종({L.frameSlots.map((s) => s.label).join("·")}). 업로드 → 한 번에 리스킨/리디자인 → 결과셀 <b style={{ color: T.textMuted }}>넥서스 프리뷰로</b> 로 각 슬롯에 자동 적용됩니다.</div>

          {/* 일괄 렌더: 모드 선택 + KV 테마 지시 + 전송 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, borderRadius: 10, border: `1px solid ${border}`, background: T.surface }}>
            <div style={{ display: "flex", gap: 6 }}>
              {[["reskin", "리스킨"], ["redesign", "리디자인"]].map(([m, lbl]) => (
                <button key={m} onClick={() => setForgeMode(m)}
                  style={{ flex: 1, padding: "7px", borderRadius: 8, border: `1px solid ${forgeMode === m ? accent : border}`, background: forgeMode === m ? `${accent}22` : "transparent", color: forgeMode === m ? accent : T.textMuted, fontSize: 11, fontWeight: 800, cursor: "pointer" }}>
                  {lbl}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
              <FieldLabel T={T}>테마 · 색·재질 지시</FieldLabel>
              <button onClick={() => setForgeThemeText(themeToHint(theme))}
                style={{ padding: "3px 8px", borderRadius: 6, border: `1px solid ${accent}55`, background: `${accent}14`, color: accent, fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                title="현재 월 테마에서 색·팔레트 지시문 자동 생성">
                KV 테마 채우기
              </button>
            </div>
            <textarea value={forgeThemeText} onChange={(e) => setForgeThemeText(e.target.value)} rows={3}
              placeholder="비우면 KV 월 테마 팔레트가 자동 적용됩니다. 예) 청량한 아쿠아 블루 + 화이트골드 프레임, 유리질 하이라이트"
              style={{ width: "100%", resize: "vertical", borderRadius: 8, border: `1px solid ${border}`, background: T.bg || "#101012", color: T.text, fontSize: 10.5, lineHeight: 1.5, padding: "8px 10px", outline: "none", fontFamily: "inherit" }} />
            {(() => { const n = L.frameSlots.filter(({ key }) => frames[key]).length; return (
              <button onClick={sendFrameSetToForge} disabled={themeBusy || n === 0}
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "9px", borderRadius: 9, border: 0, background: accent, color: "#04222a", fontSize: 11, fontWeight: 800, cursor: (themeBusy || n === 0) ? "default" : "pointer", opacity: (themeBusy || n === 0) ? 0.45 : 1 }}
                title={n ? `프레임 ${n}종을 몽타주로 묶어 한 번에 ${forgeMode === "redesign" ? "리디자인" : "리스킨"}(동일 스타일)` : "프레임을 먼저 올리세요"}>
                <Send size={13} /> {n || ""}종 한번에 {forgeMode === "redesign" ? "리디자인" : "리스킨"} (동일 스타일)
              </button>
            ); })()}
          </div>

          {L.frameSlots.map(({ key, label }) => (
            <div key={key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <FieldLabel T={T}>프레임 · {label}</FieldLabel>
              <UploadTile T={T} src={frames[key]} onFile={(f) => readImageFile(f, (s) => setFrame(key, s))} onClear={() => setFrame(key, null)} hint={`${label} 프레임 업로드`} />
              <button onClick={() => sendFrameToForge(key, label)} disabled={themeBusy || !frames[key]}
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "7px", borderRadius: 8, border: `1px solid ${accent}55`, background: `${accent}14`, color: accent, fontSize: 11, fontWeight: 700, cursor: (themeBusy || !frames[key]) ? "default" : "pointer", opacity: (themeBusy || !frames[key]) ? 0.45 : 1 }}
                title={frames[key] ? `${label} 프레임을 KV 톤으로 리스킨` : "프레임을 먼저 올리세요"}>
                <Send size={12} /> 리스킨 → RubiconForge
              </button>
            </div>
          ))}
        </div>
        </>)}
      </aside>

      {/* ─── 중앙: 캔버스 ─── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* 툴바 */}
        <div style={{ height: 46, flexShrink: 0, borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", gap: 8, padding: "0 12px" }}>
          <IconBtn T={T} onClick={() => zoomAtCenter(1 / 1.2)} title="축소"><Minus size={15} /></IconBtn>
          <div style={{ fontFamily: "monospace", fontSize: 11, color: T.textMuted, minWidth: 46, textAlign: "center" }}>{Math.round(view.zoom * 100)}%</div>
          <IconBtn T={T} onClick={() => zoomAtCenter(1.2)} title="확대"><Plus size={15} /></IconBtn>
          <IconBtn T={T} onClick={fitView} title="화면 맞춤 (전체)"><Maximize2 size={14} /></IconBtn>
          <div style={{ width: 1, height: 18, background: border, margin: "0 2px" }} />
          <button onClick={undo} disabled={!history.length} title="되돌리기 (Ctrl+Z)"
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 8, border: `1px solid ${border}`, background: "transparent", color: history.length ? T.textMuted : T.textDim, cursor: history.length ? "pointer" : "default", opacity: history.length ? 1 : 0.5 }}>
            <Undo2 size={14} />
          </button>
          {sel && (<><div style={{ width: 1, height: 18, background: border, margin: "0 4px" }} /><span style={{ fontSize: 11, color: accent, fontWeight: 700 }}>{L.layerLabels[selId]}</span></>)}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={handleCloudRestore} disabled={cloudSaving || !cloudSession}
              title={cloudSession ? "클라우드 발행본으로 되돌리기" : "클라우드에 저장된 세션 없음"}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 9, border: `1px solid ${border}`, background: "transparent", color: cloudSession ? T.textMuted : T.textDim, fontWeight: 700, fontSize: 11, cursor: cloudSession && !cloudSaving ? "pointer" : "not-allowed" }}>
              <DownloadCloud size={14} /> 복원
            </button>
            <button onClick={handleCloudSave} disabled={cloudSaving}
              title={user?.uid ? "현재 세션을 클라우드에 저장 (팀 공유)" : "로그인하면 클라우드에 저장할 수 있습니다"}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 13px", borderRadius: 9, border: `1px solid ${accent}55`, background: `${accent}14`, color: accent, fontWeight: 800, fontSize: 11, cursor: cloudSaving ? "wait" : "pointer", opacity: cloudSaving ? 0.6 : 1 }}>
              {cloudSaving ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}{cloudSaving ? "저장 중…" : "저장"}
            </button>
            <button onClick={handleDownload} disabled={busy}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 15px", borderRadius: 9, border: 0, background: accent, color: "#04222a", fontWeight: 800, fontSize: 12, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1 }}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}{busy ? "출력 중…" : "KV 레이어 출력"}
            </button>
          </div>
        </div>

        {/* 뷰포트 */}
        <div ref={viewportRef} onPointerDown={onViewportDown}
          onDragOver={(e) => e.preventDefault()} onDrop={handleCanvasDrop}
          style={{
            position: "relative", flex: 1, minHeight: 0, overflow: "hidden", background: T.bg, touchAction: "none",
            cursor: panning ? "grabbing" : spacePan ? "grab" : "default",
            backgroundImage: `linear-gradient(45deg, ${border}44 25%, transparent 25%), linear-gradient(-45deg, ${border}44 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${border}44 75%), linear-gradient(-45deg, transparent 75%, ${border}44 75%)`,
            backgroundSize: "22px 22px", backgroundPosition: "0 0, 0 11px, 11px -11px, -11px 0px",
          }}>
          <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: `translate(${view.panX}px, ${view.panY}px) scale(${view.zoom})` }}>
            {/* 페이지 프레임 — 레이아웃 캔버스 치수 (프로모션 3000×3620 / 브랜드웹 1920×1080) */}
            <div style={{ position: "relative", width: CV.w, height: CV.h, boxShadow: "0 0 0 1px rgba(255,255,255,0.12)" }}>
              {/* 베이스: 단색 + 패턴 (페이지 전체, 페이드 없음) */}
              <canvas ref={baseRef} style={{ position: "absolute", left: 0, top: 0, width: CV.w, height: CV.h, pointerEvents: "none" }} />

              {/* KV 비주얼(배경이미지+캐릭터) — 상단 출력영역, 하단+좌우 페이드 → 베이스(배경색) 비침.
                  선택된 레이어는 여기서 제외하고 아래에서 클립 없이 온전히 렌더(편집 중 전체가 보이도록). */}
              <div style={{ position: "absolute", left: 0, top: 0, width: CV.w, height: CV.exportH, overflow: "hidden",
                WebkitMaskImage: fadeMask.img, WebkitMaskComposite: "source-in", maskImage: fadeMask.img, maskComposite: "intersect" }}>
                {["bgImage", "female", "male"].map((id) => { const L = layers[id]; if (!L || L.visible === false || id === selId) return null;
                  return <img key={id} src={L.src} alt={id} draggable={false} onPointerDown={(e) => startMove(e, id)}
                    style={{ position: "absolute", left: L.x, top: L.y, width: L.w, height: L.h, maxWidth: "none", maxHeight: "none", opacity: L.opacity ?? 1, filter: filterString(L.filter), cursor: spacePan ? "grab" : "move" }} />; })}
              </div>

              {/* 좌측 메뉴 뒤 딤 (브랜드웹) — KV 비주얼 위, 타이틀·부품 아래 */}
              {area === "brandweb" && menuDim.amount > 0 && (
                <div style={{
                  position: "absolute", left: 0, top: 0, width: CV.w * menuDim.width, height: CV.exportH, pointerEvents: "none",
                  background: `linear-gradient(90deg, rgba(0,0,0,${menuDim.amount}) 0%, rgba(0,0,0,${(menuDim.amount * 0.7).toFixed(3)}) 55%, transparent 100%)`,
                }} />
              )}

              {/* 타이틀 뒤 원형 딤 — 캐릭터 위·타이틀 아래. 타이틀 레이어 위치를 따라감 (출력 PNG 수식과 동일) */}
              {titleDim.amount > 0 && (() => {
                const r = titleRectForDim();
                const { rx, ry, inner } = dimRadialParams(r, titleDim);
                return (
                  <div style={{
                    position: "absolute", left: 0, top: 0, width: CV.w, height: CV.exportH, pointerEvents: "none",
                    background: `radial-gradient(${rx}px ${ry}px at ${r.cx}px ${r.cy}px, rgba(0,0,0,${titleDim.amount}) 0%, rgba(0,0,0,${titleDim.amount}) ${Math.round(inner * 100)}%, transparent 100%)`,
                  }} />
                );
              })()}

              {/* 타이틀 — 페이드 위(항상 선명) */}
              {layers.title && layers.title.visible !== false && selId !== "title" && (
                <img src={layers.title.src} alt="title" draggable={false} onPointerDown={(e) => startMove(e, "title")}
                  style={{ position: "absolute", left: layers.title.x, top: layers.title.y, width: layers.title.w, height: layers.title.h, maxWidth: "none", maxHeight: "none", opacity: layers.title.opacity ?? 1, filter: filterString(layers.title.filter), cursor: spacePan ? "grab" : "move" }} />
              )}

              {/* 타이틀 임시 텍스트 — 타이틀 이미지가 없을 때 가이드 위치에 테마 그라데이션으로 표시 (미리보기 전용, 출력 PNG 제외) */}
              {!layers.title && titleText.trim() && (() => {
                const rect = L.guideDefs.find((d) => d.id === "title")?.rect || { x: CV.w * 0.3, y: 200, w: CV.w * 0.4, h: 420 };
                const lines = titleText.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 3);
                const maxLen = Math.max(...lines.map((l) => l.length), 1);
                const fs = Math.max(48, Math.min((rect.h / lines.length) * 0.78, (rect.w / maxLen) * 1.12));
                const tTop = theme.tokens.titleTop || theme.tokens.title, tBot = theme.tokens.titleBottom || theme.tokens.accent;
                return (
                  <div style={{
                    position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    pointerEvents: "none", textAlign: "center", fontFamily: "'Noto Sans KR', sans-serif",
                    fontWeight: 900, lineHeight: 1.12, fontSize: fs, letterSpacing: "-0.01em", wordBreak: "keep-all",
                    backgroundImage: `linear-gradient(180deg, ${tTop} 13%, ${tBot} 97%)`,
                    WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", WebkitTextFillColor: "transparent",
                    filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.45))",
                  }}>
                    {lines.map((l, i) => <div key={i}>{l}</div>)}
                  </div>
                );
              })()}

              {/* 선택 레이어 — 클립·페이드 없이 온전히 표시(프레임 밖까지) → 비율 유지 리사이즈가 그대로 보임 */}
              {sel && sel.visible !== false && (
                <img src={sel.src} alt="selected" draggable={false} onPointerDown={(e) => startMove(e, selId)}
                  style={{ position: "absolute", left: sel.x, top: sel.y, width: sel.w, height: sel.h, maxWidth: "none", maxHeight: "none", opacity: sel.opacity ?? 1, filter: filterString(sel.filter), cursor: spacePan ? "grab" : "move" }} />
              )}

              {/* KV 아래 페이지 부품 미리보기 — 레이아웃별 구성 + 월 테마 적용, 콘텐츠 위 */}
              {showParts && <L.Parts theme={theme} frames={frames} dateText={dateText} buttonText={buttonText} />}

              {/* 가이드 오버레이 — 라인 투명도 50% */}
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.5 }}>
                {L.guideDefs.filter((g) => guideOn(g.id)).map((g) => (
                  <div key={g.id} style={{ position: "absolute", left: g.rect.x, top: g.rect.y, width: g.rect.w, height: g.rect.h, border: `${2 / view.zoom}px dashed ${g.color}`, boxSizing: "border-box" }}>
                    <span style={{ position: "absolute", left: 0, top: -15 / view.zoom, fontSize: 10 / view.zoom, color: g.color, background: "rgba(0,0,0,0.5)", padding: `${1.5 / view.zoom}px ${4 / view.zoom}px`, borderRadius: 3 / view.zoom, whiteSpace: "nowrap", fontWeight: 600 }}>{g.label}</span>
                  </div>
                ))}
                {guideOn("safe") && L.safeWidths.map((wd) => {
                  const l = (CV.w - wd) / 2, r = l + wd;
                  return [l, r].map((x, i) => (
                    <div key={`${wd}-${i}`} style={{ position: "absolute", left: x, top: 0, width: Math.max(1, 1.5 / view.zoom), height: CV.h, background: `${accent}cc` }}>
                      {i === 0 && <span style={{ position: "absolute", left: 4 / view.zoom, top: 6 / view.zoom, fontSize: 10 / view.zoom, color: accent, fontWeight: 600, whiteSpace: "nowrap" }}>{wd}</span>}
                    </div>
                  ));
                })}
                {guideOn("boundary") && CV.exportH < CV.h && (() => {
                  const tick = 180, th = Math.max(1, 2 / view.zoom);
                  return (
                    <>
                      {/* 전체 가로선 대신 양쪽 끝 짧은 눈금(배경을 가로지르지 않음) */}
                      <div style={{ position: "absolute", left: 0, top: CV.exportH - th / 2, width: tick, height: th, background: "#ffffff88" }} />
                      <div style={{ position: "absolute", left: CV.w - tick, top: CV.exportH - th / 2, width: tick, height: th, background: "#ffffff88" }} />
                      <span style={{ position: "absolute", right: 4 / view.zoom, top: CV.exportH + 6 / view.zoom, fontSize: 10 / view.zoom, color: "#fff", background: "rgba(0,0,0,0.55)", padding: `${1.5 / view.zoom}px ${4 / view.zoom}px`, borderRadius: 3 / view.zoom, whiteSpace: "nowrap", fontWeight: 600 }}>KV 출력 {CV.w}×{CV.exportH}</span>
                    </>
                  );
                })()}
              </div>

              {/* 선택 핸들 */}
              {sel && (
                <div style={{ position: "absolute", left: sel.x, top: sel.y, width: sel.w, height: sel.h, pointerEvents: "none", outline: `${2 / view.zoom}px solid ${accent}` }}>
                  {HANDLES.map(({ h, cur }) => (
                    <div key={h} onPointerDown={(e) => startResize(e, selId, h)}
                      style={{ position: "absolute", width: hs, height: hs, background: accent, borderRadius: 2 / view.zoom, pointerEvents: "auto", cursor: cur,
                        left: h.includes("w") ? -hs / 2 : h.includes("e") ? sel.w - hs / 2 : sel.w / 2 - hs / 2,
                        top: h.includes("n") ? -hs / 2 : h.includes("s") ? sel.h - hs / 2 : sel.h / 2 - hs / 2 }} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ position: "absolute", left: 12, bottom: 10, fontSize: 10.5, color: T.textDim, background: "rgba(0,0,0,0.45)", padding: "4px 9px", borderRadius: 6, pointerEvents: "none" }}>
            휠 줌 · 빈 곳/Space 드래그 팬 · 레이어 드래그 이동 · 모서리/변 크기(Shift=비율) · 화살표 미세이동 · Del 삭제
          </div>
          {status && <div style={{ position: "absolute", right: 12, bottom: 10, fontSize: 11, padding: "8px 12px", borderRadius: 9, background: status.ok ? `${accent}22` : "rgba(244,63,94,0.18)", border: `1px solid ${status.ok ? `${accent}66` : "rgba(244,63,94,0.5)"}`, color: status.ok ? accent : "#fda4af", maxWidth: "60%" }}>{status.msg}</div>}
        </div>
      </div>

      {/* ─── 우: 속성 + 배경 ─── */}
      <aside style={{ width: 264, flexShrink: 0, borderLeft: `1px solid ${border}`, background: panelBg, overflowY: "auto" }}>
        {sel ? (
          <>
            <PanelTitle T={T}>{L.layerLabels[selId]} 속성</PanelTitle>
            <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <Num T={T} label="X" value={sel.x} onChange={(v) => updateLayer(selId, { x: v })} />
                <Num T={T} label="Y" value={sel.y} onChange={(v) => updateLayer(selId, { y: v })} />
                <Num T={T} label="W" value={sel.w} onChange={(v) => updateLayer(selId, { w: Math.max(24, v) })} />
                <Num T={T} label="H" value={sel.h} onChange={(v) => updateLayer(selId, { h: Math.max(24, v) })} />
              </div>
              <div style={{ fontSize: 10.5, color: T.textDim }}>코너=자유 리사이즈 · 변=한 축만 · Shift=비율 유지</div>
              {/* 정렬 */}
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => updateLayer(selId, { x: (CV.w - sel.w) / 2 })} style={alignBtn(T, accent)}><AlignCenterHorizontal size={13} /> 가로 중앙</button>
                {selId === "title" && <button onClick={() => updateLayer(selId, { x: (CV.w - sel.w) / 2, y: (CV.exportH - sel.h) / 2 })} style={alignBtn(T, accent)}>화면 중앙</button>}
              </div>
              {selId === "bgImage" && (
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => fitBg("cover")} style={alignBtn(T, accent)}>화면 채우기</button>
                  <button onClick={() => fitBg("contain")} style={alignBtn(T, accent)}>맞추기</button>
                </div>
              )}
              <Slider T={T} accent={accent} label="불투명도" min={0} max={1} step={0.01} value={sel.opacity ?? 1} onChange={(v) => updateLayer(selId, { opacity: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
              {/* 이미지 보정 — 채도/컬러톤 */}
              <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: T.textMuted }}>이미지 보정</span>
                  <button onClick={() => updateLayer(selId, { filter: undefined })} style={{ fontSize: 10, color: T.textDim, background: "transparent", border: `1px solid ${T.border}`, borderRadius: 6, padding: "2px 7px", cursor: "pointer" }}>초기화</button>
                </div>
                <Slider T={T} accent={accent} label="채도" min={0} max={200} step={1} value={sel.filter?.sat ?? 100} onChange={(v) => updateLayer(selId, { filter: { ...(sel.filter || {}), sat: v } })} fmt={(v) => `${v}%`} />
                <Slider T={T} accent={accent} label="밝기" min={20} max={200} step={1} value={sel.filter?.bri ?? 100} onChange={(v) => updateLayer(selId, { filter: { ...(sel.filter || {}), bri: v } })} fmt={(v) => `${v}%`} />
                <Slider T={T} accent={accent} label="대비" min={20} max={200} step={1} value={sel.filter?.con ?? 100} onChange={(v) => updateLayer(selId, { filter: { ...(sel.filter || {}), con: v } })} fmt={(v) => `${v}%`} />
                <Slider T={T} accent={accent} label="색조" min={-180} max={180} step={1} value={sel.filter?.hue ?? 0} onChange={(v) => updateLayer(selId, { filter: { ...(sel.filter || {}), hue: v } })} fmt={(v) => `${v}°`} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { const img = new Image(); img.onload = () => updateLayer(selId, defaultRect(selId, img.naturalWidth, img.naturalHeight, layoutKey)); img.src = sel.src; }}
                  style={{ flex: 1, fontSize: 11, color: T.textMuted, background: "transparent", border: `1px solid ${border}`, borderRadius: 8, padding: "8px", cursor: "pointer" }}>위치 초기화</button>
                <button onClick={() => removeLayer(selId)} style={{ fontSize: 11, color: "#fda4af", background: "transparent", border: `1px solid rgba(244,63,94,0.4)`, borderRadius: 8, padding: "8px 12px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}><Trash2 size={13} /> 삭제</button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: 14, fontSize: 11, color: T.textDim, lineHeight: 1.6 }}>레이어를 선택하면 위치·크기·불투명도를 조절할 수 있어요.</div>
        )}

        <PanelTitle T={T}>배경</PanelTitle>
        <div style={{ padding: "0 12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <Row label="배경색"><ColorInput value={bgColor} onChange={setBgColor} /></Row>
          <div>
            <FieldLabel T={T}>패턴 이미지 (스모그 등)</FieldLabel>
            <UploadTile T={T} src={pattern.src} onFile={(f) => readImageFile(f, (s) => setPattern({ ...pattern, src: s }))} onClear={() => setPattern({ ...pattern, src: null })} hint="패턴 이미지 업로드" />
          </div>
          {pattern.src && (
            <>
              <Slider T={T} accent={accent} label="패턴 농도" min={0} max={1} step={0.01} value={pattern.opacity} onChange={(v) => setPattern({ ...pattern, opacity: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
              <div>
                <FieldLabel T={T}>블렌드</FieldLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {BLEND_MODES.map((b) => { const on = pattern.blend === b.id; return (
                    <button key={b.id} onClick={() => setPattern({ ...pattern, blend: b.id })} style={{ padding: "4px 9px", borderRadius: 999, fontSize: 10.5, cursor: "pointer", border: `1px solid ${on ? accent : border}`, background: on ? `${accent}1F` : "transparent", color: on ? accent : T.textMuted, fontWeight: on ? 700 : 500 }}>{b.label}</button>
                  ); })}
                </div>
              </div>
              <div>
                <FieldLabel T={T}>맞춤</FieldLabel>
                <div style={{ display: "flex", gap: 5 }}>
                  {[["cover", "채우기"], ["tile", "타일"]].map(([id, lb]) => { const on = pattern.fit === id; return (
                    <button key={id} onClick={() => setPattern({ ...pattern, fit: id })} style={{ flex: 1, padding: "5px", borderRadius: 8, fontSize: 11, cursor: "pointer", border: `1px solid ${on ? accent : border}`, background: on ? `${accent}1F` : "transparent", color: on ? accent : T.textMuted, fontWeight: on ? 700 : 500 }}>{lb}</button>
                  ); })}
                </div>
              </div>
            </>
          )}
          <Slider T={T} accent={accent} label="하단 알파 페이드 시작" min={30} max={95} step={1} value={fadeStart} onChange={setFadeStart} fmt={(v) => `${v}%`} />
          <Slider T={T} accent={accent} label="좌우 페이드 (대칭)" min={0} max={30} step={1} value={sideFade} onChange={setSideFade} fmt={(v) => (v ? `${v}%` : "끔")} />
          <div style={{ fontSize: 10.5, color: T.textDim, lineHeight: 1.5 }}>하단·좌우가 배경색·패턴을 비추며 사라집니다(좌우 대칭). 실제 알파는 Figma에서 자동 처리 — 출력 PNG엔 페이드 없음.</div>
        </div>

        {/* 브랜드웹 — 날짜 텍스트 (부품 미리보기의 날짜 표시, 페이지별 세션 영속) */}
        {isBrandweb && (
          <>
            <PanelTitle T={T}>날짜</PanelTitle>
            <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
              <input value={dateText} onChange={(e) => setDateText(e.target.value)}
                placeholder={area === "brandweb" ? "예) 2026. 3. 25. GRAND OPEN" : "예) 2026. 3. 11.(수) 12:00 ~ 3. 24.(화) 23:59"}
                style={{ width: "100%", padding: "9px 11px", borderRadius: 8, border: `1px solid ${border}`, background: T.bg, color: T.text, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
              <div style={{ fontSize: 10.5, color: T.textDim }}>비우면 샘플 문구로 표시됩니다.</div>
            </div>
          </>
        )}

        {/* 브랜드웹 메인 — 중앙 버튼 슬롯: 업로드로 교체 or FrameForge 에서 제작 */}
        {area === "brandweb" && (
          <>
            <PanelTitle T={T}>중앙 버튼</PanelTitle>
            <div style={{ padding: "0 12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              <FieldLabel T={T}>버튼 텍스트</FieldLabel>
              <input value={buttonText} onChange={(e) => setButtonText(e.target.value)} placeholder="예) 사전예약"
                style={{ width: "100%", padding: "9px 11px", borderRadius: 8, border: `1px solid ${border}`, background: T.bg, color: T.text, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
              <FieldLabel T={T}>버튼 박스 프레임 (텍스트 없는 프레임만)</FieldLabel>
              <UploadTile T={T} src={frames.product} onFile={(f) => readImageFile(f, (s) => setFrame("product", s))} onClear={() => setFrame("product", null)} hint="버튼 프레임 업로드" />
              <button onClick={() => navigate("frame-forge")}
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", borderRadius: 8, border: `1px solid ${accent}55`, background: `${accent}14`, color: accent, fontSize: 11, fontWeight: 800, cursor: "pointer" }}
                title="FrameForge 에서 버튼 프레임을 새로 제작 — 완성본을 여기에 업로드">
                <Sparkles size={12} /> FrameForge 에서 제작
              </button>
              <div style={{ fontSize: 10.5, color: T.textDim, lineHeight: 1.5 }}>프레임 위에 버튼 텍스트가 얹혀 표시됩니다. 프레임을 비우면 테마 버튼 + 텍스트로 표시.</div>
            </div>
          </>
        )}

        {/* 브랜드웹 서브 — 콘텐츠 박스 프레임 슬롯 */}
        {(area === "brandweb-sub" || area === "brandweb-sub2") && (
          <>
            <PanelTitle T={T}>콘텐츠 박스</PanelTitle>
            <div style={{ padding: "0 12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              <UploadTile T={T} src={frames.banner} onFile={(f) => readImageFile(f, (s) => setFrame("banner", s))} onClear={() => setFrame("banner", null)} hint="박스 프레임 업로드 (교체)" />
              <div style={{ fontSize: 10.5, color: T.textDim, lineHeight: 1.5 }}>업로드하면 미리보기 콘텐츠 박스가 교체됩니다. 비우면 테마 패널로 표시.</div>
            </div>
          </>
        )}

        {/* 딤 효과 — 타이틀 뒤 원형(공통) + 좌측 메뉴 뒤 밴드(브랜드웹). 출력 시 투명 PNG 레이어로 동봉. */}
        <PanelTitle T={T}>딤 효과</PanelTitle>
        <div style={{ padding: "0 12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <Slider T={T} accent={accent} label="타이틀 뒤 딤 · 투명도" min={0} max={0.9} step={0.01} value={titleDim.amount} onChange={(v) => patchTitleDim({ amount: v })} fmt={(v) => (v ? `${Math.round(v * 100)}%` : "끔")} />
          {titleDim.amount > 0 && (
            <div style={{ paddingLeft: 10, borderLeft: `2px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
              <Slider T={T} accent={accent} label="크기" min={0.4} max={2.5} step={0.05} value={titleDim.scale} onChange={(v) => patchTitleDim({ scale: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
              <Slider T={T} accent={accent} label="가로세로 비율" min={0.5} max={3} step={0.05} value={titleDim.aspect} onChange={(v) => patchTitleDim({ aspect: v })} fmt={(v) => v.toFixed(2)} />
              <Slider T={T} accent={accent} label="부드러움" min={0} max={0.9} step={0.01} value={titleDim.softness} onChange={(v) => patchTitleDim({ softness: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
              <div style={{ fontSize: 10.5, color: T.textDim, lineHeight: 1.5 }}>타이틀 레이어 위치를 따라갑니다. 출력 시 <b style={{ color: T.textMuted }}>타이틀딤.png</b> 투명 레이어로 동봉.</div>
            </div>
          )}
          {area === "brandweb" && (
            <>
              <Slider T={T} accent={accent} label="좌측 메뉴 뒤 딤 · 투명도" min={0} max={0.9} step={0.01} value={menuDim.amount} onChange={(v) => patchMenuDim({ amount: v })} fmt={(v) => (v ? `${Math.round(v * 100)}%` : "끔")} />
              {menuDim.amount > 0 && (
                <div style={{ paddingLeft: 10, borderLeft: `2px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
                  <Slider T={T} accent={accent} label="폭" min={0.15} max={0.6} step={0.01} value={menuDim.width} onChange={(v) => patchMenuDim({ width: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
                  <div style={{ fontSize: 10.5, color: T.textDim, lineHeight: 1.5 }}>좌측에서 오른쪽으로 사라지는 밴드 — 메뉴 가독성용. 출력 시 <b style={{ color: T.textMuted }}>메뉴딤.png</b> 로 동봉.</div>
                </div>
              )}
            </>
          )}
        </div>

        {/* 월 테마 팔레트 — 프로모션 전용 (브랜드웹은 부품 테마·컬러 시스템 추출을 쓰지 않음) */}
        {!isBrandweb && (<>
        <PanelTitle T={T}>월 테마 · 부품 공통</PanelTitle>
        <div style={{ padding: "0 12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={extractTheme} disabled={themeBusy || !layers.bgImage}
              style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", borderRadius: 9, border: `1px solid ${accent}66`, background: `${accent}18`, color: accent, fontSize: 11, fontWeight: 800, cursor: (themeBusy || !layers.bgImage) ? "default" : "pointer", opacity: (themeBusy || !layers.bgImage) ? 0.5 : 1 }}
              title={layers.bgImage ? "node-vibrant 역할 기반 팔레트 추출(무료)" : "배경 이미지를 먼저 올리세요"}>
              {themeBusy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} 팔레트 추출
            </button>
            <button onClick={refineTheme} disabled={themeBusy || !layers.bgImage}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: "transparent", color: T.textMuted, fontSize: 11, fontWeight: 700, cursor: (themeBusy || !layers.bgImage) ? "default" : "pointer", opacity: (themeBusy || !layers.bgImage) ? 0.5 : 1 }}
              title="AI로 무드·variant 정제 (1c)">AI 정제</button>
          </div>
          {themeMsg && <div style={{ fontSize: 11, color: themeMsg.ok ? accent : "#fda4af" }}>{themeMsg.msg}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <ThemeSwatch T={T} label="강조/버튼" value={theme.tokens.primary} onChange={(v) => setToken("primary", v)} />
            <ThemeSwatch T={T} label="금장" value={theme.tokens.accent} onChange={(v) => setToken("accent", v)} />
            <ThemeSwatch T={T} label="타이틀" value={theme.tokens.titleTop || theme.tokens.title} onChange={(v) => setToken("titleTop", v)} />
            <ThemeSwatch T={T} label="사용처/패널" value={theme.tokens.panel} onChange={(v) => setToken("panel", v)} />
          </div>
          <GradBar T={T} label="배경" stops={[theme.tokens.bgTop, theme.tokens.bgMid, theme.tokens.bgBottom]} />
          <GradBar T={T} label="타이틀" stops={[theme.tokens.titleTop || theme.tokens.title, theme.tokens.titleBottom || theme.tokens.accent]} />
          <GradBar T={T} label="버튼" stops={[theme.tokens.btnTop || theme.tokens.primary, theme.tokens.btnBottom || theme.tokens.primary]} border={theme.tokens.btnBorder} />
          {[["frame", "프레임"], ["button", "버튼"], ["container", "박스"], ["motif", "모티프"]].map(([k, lb]) => (
            <div key={k}>
              <FieldLabel T={T}>{lb}</FieldLabel>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {ENUM_LIST[k].map((v) => { const on = theme.variants[k] === v; return (
                  <button key={v} onClick={() => setVariant(k, v)} style={{ padding: "3px 9px", borderRadius: 999, fontSize: 10.5, cursor: "pointer", border: `1px solid ${on ? accent : T.border}`, background: on ? `${accent}1F` : "transparent", color: on ? accent : T.textMuted, fontWeight: on ? 700 : 500 }}>{v}</button>
                ); })}
              </div>
            </div>
          ))}
          {/* 피그마 변수 문서 — JSON(변수 임포트용) + 스와치 시트 PNG */}
          <button onClick={exportThemeDoc}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "9px", borderRadius: 9, border: `1px solid ${accent}55`, background: `${accent}14`, color: accent, fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}
            title="피그마 변수 컬러 문서 내보내기 — JSON(변수 생성용) + 스와치 시트 PNG">
            <Download size={13} /> 피그마 변수 문서 (JSON + PNG)
          </button>
          <button onClick={sendToForge} disabled={themeBusy || !layers.bgImage}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "9px", borderRadius: 9, border: 0, background: accent, color: "#04222a", fontSize: 11.5, fontWeight: 800, cursor: (themeBusy || !layers.bgImage) ? "default" : "pointer", opacity: (themeBusy || !layers.bgImage) ? 0.5 : 1 }}
            title="이 테마·KV를 RubiconForge로 보내 부품을 리스킨/리디자인">
            <Send size={13} /> 월 테마·KV → RubiconForge
          </button>
          <div style={{ fontSize: 10.5, color: T.textDim, lineHeight: 1.5 }}>테마는 아래 부품에 공통 적용됩니다. RubiconForge로 보내면 KV가 배경 참조로 설정돼 그 톤으로 부품을 생성합니다.</div>
        </div>
        </>)}
      </aside>

      {psdFile && (
        <PsdImportModal T={T} accent={accent} file={psdFile} onClose={() => setPsdFile(null)}
          onAdd={(slot, dataUrl) => { (async () => { try { const { dataUrl: d } = await trimTransparent(dataUrl); addLayer(slot, d); } catch { addLayer(slot, dataUrl); } })(); }} />
      )}
      {usageModal}
    </div>
  );
}

function GradBar({ T, label, stops, border }) {
  return (
    <div>
      <FieldLabel T={T}>{label}</FieldLabel>
      <div style={{ height: 20, borderRadius: 6, border: `1px solid ${border || T.border}`, background: `linear-gradient(180deg, ${(stops || []).filter(Boolean).join(", ")})` }} />
    </div>
  );
}

function ThemeSwatch({ T, label, value, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 8px", cursor: "pointer" }}>
      <span style={{ width: 20, height: 20, borderRadius: 5, background: value, border: "1px solid rgba(255,255,255,0.2)", flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 10.5, color: T.textMuted }}>{label}</span>
        <span style={{ display: "block", fontSize: 10, color: T.textDim, fontFamily: "monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</span>
      </span>
      <input type="color" value={/^#[0-9a-f]{6}$/i.test(value || "") ? value : "#000000"} onChange={(e) => onChange(e.target.value)} style={{ width: 0, height: 0, opacity: 0, position: "absolute" }} />
    </label>
  );
}

const alignBtn = (T, accent) => ({ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: 11, color: accent, background: `${accent}12`, border: `1px solid ${accent}44`, borderRadius: 8, padding: "7px", cursor: "pointer" });

function PsdButton({ accent, onFile }) {
  const ref = useRef(null);
  return (
    <button onClick={() => ref.current?.click()}
      style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "9px", borderRadius: 9, border: `1px solid ${accent}55`, background: `${accent}14`, color: accent, fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}>
      <input ref={ref} type="file" accept=".psd,image/vnd.adobe.photoshop" style={{ display: "none" }} onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      <LayersIcon size={15} /> PSD 가져오기 (PNG 변환·추출)
    </button>
  );
}

/* ── UI 조각 ── */
function PanelTitle({ T, children }) { return <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: T.textMuted, padding: "12px 12px 8px" }}>{children}</div>; }
function FieldLabel({ T, children }) { return <div style={{ fontSize: 10.5, color: T.textMuted, marginBottom: 6 }}>{children}</div>; }
function Row({ label, children }) { return <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}><span style={{ fontSize: 11, color: "#9aa" }}>{label}</span>{children}</div>; }

function LayerRow({ T, accent, label, layer, selected, onSelect, onToggle, onRemove, onFile }) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);
  if (!layer) {
    return (
      <button onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files?.[0]); }}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 9px", borderRadius: 8, border: `1px dashed ${over ? accent : T.border}`, background: over ? `${accent}14` : "transparent", color: over ? accent : T.textMuted, cursor: "pointer", fontSize: 11}}>
        <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => onFile(e.target.files?.[0])} />
        <UploadCloud size={15} /> {label} 업로드 · 드롭
      </button>
    );
  }
  const hidden = layer.visible === false;
  return (
    <div onClick={onSelect} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, border: `1px solid ${selected ? accent : T.border}`, background: selected ? `${accent}14` : "transparent", cursor: "pointer" }}>
      <button onClick={(e) => { e.stopPropagation(); onToggle(); }} style={{ border: 0, background: "transparent", color: hidden ? T.textDim : T.textMuted, cursor: "pointer", display: "flex", padding: 0 }} title={hidden ? "표시" : "숨김"}>{hidden ? <EyeOff size={14} /> : <Eye size={14} />}</button>
      <div style={{ width: 28, height: 28, borderRadius: 5, overflow: "hidden", background: "#0A0A0F", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: hidden ? 0.4 : 1 }}>
        <img src={layer.src} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
      </div>
      <span style={{ flex: 1, fontSize: 11, color: selected ? accent : T.text, fontWeight: selected ? 700 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", opacity: hidden ? 0.5 : 1 }}>{label}</span>
      <button onClick={(e) => { e.stopPropagation(); onRemove(); }} style={{ border: 0, background: "transparent", color: T.textDim, cursor: "pointer", display: "flex", padding: 0 }} title="삭제"><X size={13} /></button>
    </div>
  );
}

function GuideToggle({ T, label, color, on, onToggle }) {
  return (
    <button onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 4px", background: "transparent", border: 0, cursor: "pointer", textAlign: "left" }}>
      <span style={{ width: 12, height: 12, borderRadius: 3, border: `1.5px solid ${color}88`, background: on ? `${color}aa` : "transparent", flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: on ? T.textMuted : T.textDim }}>{label}</span>
    </button>
  );
}

function ColorInput({ value, onChange }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontFamily: "monospace", fontSize: 11, color: "#9aa" }}>{value}</span>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} style={{ width: 30, height: 26, padding: 0, border: "none", borderRadius: 6, background: "transparent", cursor: "pointer" }} />
    </div>
  );
}

function Num({ T, label, value, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${T.border}`, borderRadius: 7, padding: "5px 8px", background: T.bg }}>
      <span style={{ fontSize: 10.5, color: T.textMuted, width: 12 }}>{label}</span>
      <input type="number" value={Math.round(value)} onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", border: 0, background: "transparent", color: T.text, fontSize: 11, fontFamily: "monospace", outline: "none" }} />
    </label>
  );
}

function Slider({ T, accent, label, min, max, step, value, onChange, fmt }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: T.textMuted, marginBottom: 3 }}><span>{label}</span><span style={{ fontFamily: "monospace", color: accent }}>{fmt ? fmt(value) : value}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", accentColor: accent }} />
    </label>
  );
}

function UploadTile({ T, src, onFile, onClear, hint }) {
  const inputRef = useRef(null);
  return (
    <div onClick={() => !src && inputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]); }}
      style={{ position: "relative", borderRadius: 10, border: `1px dashed ${T.border}`, background: "#0A0A0F", minHeight: 76, display: "flex", alignItems: "center", justifyContent: "center", cursor: src ? "default" : "pointer", overflow: "hidden" }}>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => onFile(e.target.files?.[0])} />
      {src ? (<>
        <img src={src} alt="" style={{ maxHeight: 100, maxWidth: "100%", objectFit: "contain" }} />
        <button onClick={(e) => { e.stopPropagation(); onClear(); }} style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 6, border: 0, background: "rgba(0,0,0,0.6)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={13} /></button>
      </>) : (<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: T.textMuted }}><UploadCloud size={20} /><span style={{ fontSize: 10.5}}>{hint}</span></div>)}
    </div>
  );
}

function IconBtn({ T, onClick, title, children }) {
  return <button onClick={onClick} title={title} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent", color: T.textMuted, cursor: "pointer" }}>{children}</button>;
}
