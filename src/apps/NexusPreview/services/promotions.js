// NEXUS Preview — 프로모션(캠페인) 목록 + KV 세션 Firestore/Cloudinary 어댑터.
// 경로: artifacts/{appId}/public/data/nexusPromotions/{id} — 팀 공유 (BannerCodex/PromptArc 와 같은 public 패턴).
//   - 이미지(레이어/패턴/프레임/썸네일)는 Cloudinary 업로드 후 URL 만 doc 에 저장 (Firestore 1MB 제한 회피).
//   - 스칼라 설정(배경색/페이드/가이드/테마 토큰)은 doc 의 session 필드에 직접.
import {
  collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, serverTimestamp, updateDoc,
} from "firebase/firestore";
import { db, appId } from "../../../lib/firebase";
import { uploadBase64 } from "../../../lib/storage";

const colRef = () => collection(db, "artifacts", appId, "public", "data", "nexusPromotions");

// 기본 프로모션 4종 — 컬렉션이 완전히 비어있는 최초 1회만 시드(fixed id → 중복 생성 없음).
// 이후 이름 변경/삭제는 Firestore 가 진실 소스 (삭제한 기본 항목은 되살리지 않음).
export const DEFAULT_PROMOTIONS = [
  { id: "bns-osangseu",    name: "블소 오상스",   game: "블레이드&소울" },
  { id: "lineage-refine",  name: "리니지 제련석", game: "리니지" },
  { id: "lineage-scroll",  name: "리니지 주문서", game: "리니지" },
  { id: "lineage-relic",   name: "리니지 유물",   game: "리니지" },
];
// 레거시 단일 세션(프로모션 개념 도입 전) 을 물려받는 프로모션 id.
export const LEGACY_SESSION_PROMOTION_ID = DEFAULT_PROMOTIONS[0].id;

export async function ensureSeedPromotions() {
  if (!db) return;
  try {
    const snap = await getDocs(colRef());
    if (!snap.empty) return;
    await Promise.all(DEFAULT_PROMOTIONS.map((p, i) =>
      setDoc(doc(colRef(), p.id), {
        name: p.name, game: p.game, order: i,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      })
    ));
  } catch (e) { console.warn("[NexusPreview/promotions] seed failed", e?.message || e); }
}

// 라이브 구독 — order(시드 순) → createdAt 순으로 클라이언트 정렬 (인덱스 불필요).
export function subscribeToPromotions(onData, onError) {
  if (!db) { onData?.([]); return () => {}; }
  return onSnapshot(colRef(),
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.order ?? 1e15) - (b.order ?? 1e15) || String(a.name).localeCompare(String(b.name), "ko"));
      onData?.(list);
    },
    (err) => onError?.(err),
  );
}

// area: "promo" | "brandweb" — 문서는 한 영역에 속하며 목록 탭이 이 값으로 필터한다.
// (구 문서엔 area 가 없음 → "promo" 취급)
export async function createPromotion(name, game = "", area = "promo") {
  const ref = doc(colRef()); // auto id
  await setDoc(ref, {
    name: String(name || "").trim() || "(이름 없음)", game: String(game || "").trim(),
    area,
    order: Date.now(), // 시드(0~3) 뒤에 생성순으로 붙음
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  return ref.id;
}

// 이름/게임 수정 — 목록 카드의 편집 버튼에서 사용.
export async function updatePromotion(id, { name, game }) {
  const fields = { updatedAt: serverTimestamp() };
  if (name != null) fields.name = String(name).trim() || "(이름 없음)";
  if (game != null) fields.game = String(game).trim();
  await updateDoc(doc(colRef(), id), fields);
}

export async function deletePromotion(id) {
  await deleteDoc(doc(colRef(), id));
}

// ── KV 세션 저장/복원 ────────────────────────────────────────────────────────

// dataURL → Cloudinary URL. 이미 http(s) URL 이면 그대로(멱등). 같은 dataURL 은 1회만 업로드.
function makeUrlCache() {
  const cache = new Map();
  return async (src) => {
    if (!src || typeof src !== "string") return null;
    if (!src.startsWith("data:")) return src;
    if (!cache.has(src)) cache.set(src, uploadBase64(src).catch((e) => {
      console.warn("[NexusPreview/promotions] upload failed", e?.message || e);
      return null;
    }));
    return cache.get(src);
  };
}

// undefined 제거 (Firestore 가 undefined 를 거부) — JSON 왕복으로 안전 정리.
const sanitize = (o) => JSON.parse(JSON.stringify(o ?? null));

// snapshot → 업로드 완료된 session 데이터 + 썸네일 URL (dataURL 은 Cloudinary URL 로 치환).
async function buildSessionPayload(snapshot) {
  const up = makeUrlCache();
  const layers = {};
  for (const [key, L] of Object.entries(snapshot.layers || {})) {
    if (!L?.src) { layers[key] = null; continue; }
    const { src, ...rest } = L;
    layers[key] = { ...rest, url: await up(src) };
  }
  const frames = {};
  for (const [key, src] of Object.entries(snapshot.frames || {})) frames[key] = await up(src);
  const p = snapshot.pattern || {};
  const pattern = { opacity: p.opacity ?? 0.4, blend: p.blend || "soft-light", fit: p.fit || "cover", url: await up(p.src) };
  const thumbnailUrl = await up(snapshot.thumbDataUrl);
  const sessionData = sanitize({
    bgColor: snapshot.bgColor, fadeStart: snapshot.fadeStart, sideFade: snapshot.sideFade,
    guideVis: snapshot.guideVis, showParts: snapshot.showParts !== false,
    layout: snapshot.layout || null, // 페이지 레이아웃(osangseu/refine/scroll/brandweb) — promoLayouts.jsx 참조
    titleText: snapshot.titleText || "", // 타이틀 임시 텍스트(최대 3줄)
    titleDim: snapshot.titleDim || null, menuDim: snapshot.menuDim || null, // 딤 효과 설정
    dateText: snapshot.dateText || "", // 브랜드웹 날짜 텍스트
    buttonText: snapshot.buttonText || "", // 브랜드웹 중앙 버튼 텍스트
    pattern, layers, frames, theme: snapshot.theme || null,
  });
  return { sessionData, thumbnailUrl };
}

// 영역(area) → Firestore 필드 매핑. 브랜드웹은 페이지(메인/서브/서브2)마다 세션이 분리된다.
export const AREA_FIELDS = {
  promo:          { session: "session",             thumb: "thumbnailUrl" },
  brandweb:       { session: "brandwebSession",     thumb: "brandwebThumbnailUrl" },
  "brandweb-sub": { session: "brandwebSubSession",  thumb: "brandwebSubThumbnailUrl" },
  "brandweb-sub2": { session: "brandwebSub2Session", thumb: "brandwebSub2ThumbnailUrl" },
};

// 현재 KvComposer 상태를 프로모션 doc 에 저장 — 목록 항목(썸네일·updatedAt)이 함께 갱신된다.
export async function savePromotionSession(id, snapshot, area = "promo") {
  if (!db) throw new Error("Firestore 미연결");
  if (!id) throw new Error("프로모션 id 없음");
  const fields = AREA_FIELDS[area] || AREA_FIELDS.promo;
  const sessionField = fields.session;
  const thumbField = fields.thumb;
  const { sessionData, thumbnailUrl } = await buildSessionPayload(snapshot);

  await setDoc(doc(colRef(), id), {
    [sessionField]: sessionData,
    ...(thumbnailUrl ? { [thumbField]: thumbnailUrl } : {}),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// doc.session → KvComposer 로컬 상태 형태 (url → src 매핑).
export function sessionToLocal(session) {
  if (!session) return null;
  const layers = {};
  for (const [key, L] of Object.entries(session.layers || {})) {
    if (!L?.url) { layers[key] = null; continue; }
    const { url, ...rest } = L;
    layers[key] = { ...rest, src: url };
  }
  const frames = {};
  for (const [key, url] of Object.entries(session.frames || {})) frames[key] = url || null;
  const p = session.pattern || {};
  return {
    bgColor: session.bgColor, fadeStart: session.fadeStart, sideFade: session.sideFade,
    guideVis: session.guideVis, showParts: session.showParts !== false,
    layout: session.layout || null,
    titleText: session.titleText || "",
    titleDim: session.titleDim || null, menuDim: session.menuDim || null,
    dateText: session.dateText || "",
    buttonText: session.buttonText || "",
    pattern: { src: p.url || null, opacity: p.opacity ?? 0.4, blend: p.blend || "soft-light", fit: p.fit || "cover" },
    layers, frames, theme: session.theme || null,
  };
}
