// BrandWebReview 전용 Firestore 어댑터.
// 패턴: artifacts/{appId}/users/{uid}/brandWebProjects/{projectId}
// 각 프로젝트 doc 에 images[] 와 그 안의 versions[]·notes[] 전부 포함 (1MB 제한 회피 위해 이미지/첨부는 Cloudinary URL 만 저장).

import {
  collection, doc, onSnapshot,
  setDoc, deleteDoc, query, getDocs, where, addDoc,
} from "firebase/firestore";
import { auth, db, appId } from "../../../lib/firebase";

export { db, appId, auth };

const projectsCol = (uid) =>
  collection(db, "artifacts", appId, "users", uid, "brandWebProjects");
const projectDoc = (uid, id) =>
  doc(db, "artifacts", appId, "users", uid, "brandWebProjects", id);

// 시간 정렬 헬퍼 — createdAt 이 Timestamp / number / string 인 경우 다 처리.
const toMs = (v) => {
  if (typeof v === "number") return v;
  if (typeof v === "string") { const t = Date.parse(v); return Number.isNaN(t) ? 0 : t; }
  if (v && typeof v.toMillis === "function") return v.toMillis();
  return 0;
};

export function subscribeToProjects(uid, onData, onError) {
  if (!db || !uid) return () => {};
  const q = query(projectsCol(uid));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
    onData(list);
  }, onError);
}

export async function saveProject(uid, project) {
  if (!db || !uid || !project?.id) return;
  // sanitize — Firestore 는 undefined 를 안 받음. JSON round-trip 으로 정리.
  const safe = JSON.parse(JSON.stringify({
    ...project,
    updatedAt: Date.now(),
  }));
  await setDoc(projectDoc(uid, project.id), safe, { merge: false });
}

export async function deleteProject(uid, projectId) {
  if (!db || !uid || !projectId) return;
  await deleteDoc(projectDoc(uid, projectId));
}

// 한 번에 여러 프로젝트 저장 (로컬 → 클라우드 마이그레이션 용).
export async function bulkSaveProjects(uid, projects) {
  if (!db || !uid || !projects?.length) return;
  for (const p of projects) {
    try { await saveProject(uid, p); }
    catch (e) { console.warn(`[BrandWebReview] bulkSave failed for ${p?.id}`, e); }
  }
}

// Firestore 에 이 uid 의 어떤 projectId 들이 이미 있는지 — 마이그레이션 시 중복 회피.
export async function getExistingProjectIds(uid) {
  if (!db || !uid) return new Set();
  try {
    const snap = await getDocs(projectsCol(uid));
    return new Set(snap.docs.map(d => d.id));
  } catch (e) {
    console.warn("[BrandWebReview] getExistingProjectIds failed", e);
    return new Set();
  }
}

// ─── Brand Web Library(PromotionArchive) 등록 ───────────────────────────────
// 같은 컬렉션을 공유하므로 promotion-banners 경로에 assetType='브랜드웹' 으로 doc 생성.
// 활성 버전의 url 만 사용 (이전 버전은 history 로 보냄).
const promoCol = () => collection(db, "artifacts", appId, "public", "data", "promotion-banners");

function getActiveVersion(image) {
  if (!image?.versions?.length) return null;
  return image.versions.find(v => v.id === image.activeVersionId) || image.versions[image.versions.length - 1];
}

// 이미 같은 sourceProjectId 로 등록된 brand-web banner 가 있는지 확인 (중복 방지).
export async function findExistingBrandWebBanner(sourceProjectId) {
  if (!db || !sourceProjectId) return null;
  try {
    const q = query(promoCol(), where("sourceProjectId", "==", sourceProjectId));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
  } catch (e) {
    console.warn("[BrandWebReview] findExistingBrandWebBanner failed", e);
    return null;
  }
}

// approved 프로젝트 → brand-web banner 1건 생성.
// 페이지 1개당 1 entry. pages[] 에 모든 PC/Mobile 이미지(활성 버전 url) 기록.
// 첫 PC = full_image / preview, 첫 Mobile = mobile_image. 둘 다 없으면 첫 페이지 url.
export async function registerProjectAsBrandWebBanner(uid, project) {
  if (!db) throw new Error("Firestore 미연결");
  if (!uid) throw new Error("로그인이 필요합니다");
  if (!project?.id) throw new Error("프로젝트 정보가 없습니다");
  if (project.status !== "approved") throw new Error("컨펌 완료(approved) 상태에서만 등록할 수 있습니다");

  const existing = await findExistingBrandWebBanner(project.id);
  if (existing) {
    const e = new Error("이미 라이브러리에 등록된 프로젝트입니다");
    e.code = "ALREADY_REGISTERED";
    e.bannerId = existing.id;
    throw e;
  }

  // 모든 페이지(이미지)의 활성 버전 정리.
  const pages = (project.images || [])
    .map((im, idx) => {
      const v = getActiveVersion(im);
      if (!v?.url) return null;
      return {
        id: im.id, name: im.name || `page_${idx + 1}`, device: im.device || "pc",
        url: v.url, order: idx,
        confirmedAt: v.confirmed ? Date.now() : null,
        noteCount: (v.notes || []).length,
      };
    })
    .filter(Boolean);

  if (pages.length === 0) throw new Error("등록할 이미지가 없습니다");

  const pcPages = pages.filter(p => p.device === "pc");
  const mobilePages = pages.filter(p => p.device === "mobile");
  const firstPc = pcPages[0];
  const firstMobile = mobilePages[0];
  const thumbSrc = firstPc?.url || firstMobile?.url || pages[0].url;

  const doc_ = {
    title: project.name || "브랜드 웹",
    assetType: "브랜드웹",
    game: "기타",
    year: new Date().getFullYear().toString(),
    path: "",
    preview: thumbSrc,
    full_image: firstPc?.url || thumbSrc,
    mobile_image: firstMobile?.url || "",
    pages,              // 브랜드웹 전용 — PreviewModal 페이지 navigator
    pageCount: pages.length,
    created_at: new Date().toISOString(),
    ownerUid: uid,
    visibility: project.visibility || "public",
    liked: 0,
    tags: Array.isArray(project.tags) ? project.tags : [],
    history: [],
    sourceProjectId: project.id,
    sourceProjectName: project.name || "",
    sourceOwner: project.owner || "",
    sourceDescription: project.description || "",
  };
  const ref = await addDoc(promoCol(), doc_);
  return { id: ref.id, ...doc_ };
}
