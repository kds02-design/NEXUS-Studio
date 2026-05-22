import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Clock, CheckCircle2, XCircle, PauseCircle, ListChecks,
  Upload, FolderPlus, Folder, ChevronLeft, X,
  Smartphone, Monitor, Trash2, Plus, Check,
  Info, ExternalLink, Image as Image2,
} from "lucide-react";
import { useGlobal } from "../../context/GlobalContext";
import ReviewWorkspace from "./components/ReviewWorkspace";
import PublishModal from "./components/PublishModal";
import { uploadBase64 } from "../../lib/storage";
import { pickSharedFolderFromFiles, GAMES_FOR_BRANDWEB } from "../../lib/sharedFolderPath";
import {
  subscribeToProjects,
  saveProject,
  deleteProject as deleteProjectRemote,
  bulkSaveProjects,
  getExistingProjectIds,
  registerProjectAsBrandWebBanner,
} from "./services/firebase";

// 사이드바 메뉴 — 프로젝트 상태 필터.
const REVIEW_MENUS = [
  { id: "all",        name: "전체",       icon: <ListChecks size={16}/> },
  { id: "in_review",  name: "검토중",     icon: <Clock size={16}/> },
  { id: "approved",   name: "컨펌 완료",  icon: <CheckCircle2 size={16}/> },
  { id: "rejected",   name: "반려",       icon: <XCircle size={16}/> },
  { id: "on_hold",    name: "보류",       icon: <PauseCircle size={16}/> },
];

// localStorage 키 — 전체 프로젝트 배열을 통째로 저장. 이미지 dataURL 누적 시 quota 위험 있음 → 추후 IndexedDB/Cloudinary 마이그레이션 고려.
const STORAGE_KEY = "brandWebReview:projects";

// ─── 디바이스 자동 추정 ─────────────────────────────────────
// 1) 파일명 힌트 → 2) 이미지 비율.
//   banner (h/w < 0.5, 와이드 가로형) > mobile (h/w > 1.4, 세로형) > pc (그 외).
function guessDeviceFromName(name) {
  const n = String(name || "").toLowerCase();
  if (/(^|[_\-\s])(banner|배너|bnr)([_\-\s.]|$)/.test(n)) return "banner";
  if (/(^|[_\-\s])(m|mb|mob|mobile|모바일)([_\-\s.]|$)/.test(n)) return "mobile";
  if (/(^|[_\-\s])(pc|desktop|web|데스크탑)([_\-\s.]|$)/.test(n)) return "pc";
  return null;
}
function deviceFromRatio(w, h) {
  if (!(w > 0 && h > 0)) return "pc";
  const ratio = h / w;
  if (ratio < 0.5) return "banner";
  if (ratio > 1.4) return "mobile";
  return "pc";
}

// device 표시 메타 — 라벨 / 아이콘 키 / 컬러. 코드 한 곳에서 관리.
// thumbAspect 는 카드 썸네일에 적용되는 Tailwind aspect 클래스 (PC 가로형 / Mobile 세로형 / Banner 와이드).
const DEVICE_META = {
  pc:     { label: "PC",     color: "#74B9FF", thumbAspect: "aspect-[16/10]" },
  mobile: { label: "Mobile", color: "#FD79A8", thumbAspect: "aspect-[9/16]"  },
  banner: { label: "Banner", color: "#FDCB6E", thumbAspect: "aspect-[16/5]"  },
};
// 헬퍼 — 알 수 없는 device 는 PC 폴백.
const thumbAspectFor = (device) => DEVICE_META[device]?.thumbAspect || DEVICE_META.pc.thumbAspect;
const DEVICE_ORDER = ["pc", "mobile", "banner"];

function loadImageDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function measureImage(url) {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 0, h: 0 });
    img.src = url;
  });
}

// 파일 → 이미지 객체. Cloudinary 업로드 성공 시 secure URL, 실패하거나 user 가 없으면 dataURL (로컬 모드).
async function fileToImage(file, idx, { useCloud = true } = {}) {
  const dataUrl = await loadImageDataURL(file);
  let device = guessDeviceFromName(file.name);
  if (!device) {
    const { w, h } = await measureImage(dataUrl);
    device = deviceFromRatio(w, h);
  }
  let url = dataUrl;
  if (useCloud) {
    try { url = await uploadBase64(dataUrl); }
    catch (e) {
      console.warn("[BrandWebReview] Cloudinary upload failed, fallback to dataURL", e);
      url = dataUrl;
    }
  }
  const id = `img_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`;
  const v1Id = `${id}_v1`;
  return {
    id,
    name: file.name,
    device,
    addedAt: Date.now(),
    versions: [
      { id: v1Id, label: "v1", url, addedAt: Date.now(), notes: [], confirmed: false },
    ],
    activeVersionId: v1Id,
  };
}

// dataURL 이면 Cloudinary 로 올려서 URL 받아오기. 이미 http(s) URL 이면 그대로.
async function ensureHostedUrl(value) {
  if (!value) return value;
  if (typeof value !== "string") return value;
  if (value.startsWith("data:")) {
    try { return await uploadBase64(value); }
    catch (e) {
      console.warn("[BrandWebReview] attachment upload failed", e);
      return value; // 실패 시 그대로 (Firestore 1MB 위험은 있지만 데이터 손실 회피)
    }
  }
  return value;
}

// 노트 배열 안의 attachment 가 dataURL 이면 모두 Cloudinary URL 로 변환.
async function hostNotesAttachments(notes) {
  if (!Array.isArray(notes) || notes.length === 0) return notes;
  return Promise.all(notes.map(async n => {
    if (!n) return n;
    if (typeof n.attachment === "string" && n.attachment.startsWith("data:")) {
      const hosted = await ensureHostedUrl(n.attachment);
      return { ...n, attachment: hosted };
    }
    return n;
  }));
}

// 레거시 image({ url, notes, confirmed, addedAt, ... }) → 신규 모델(versions[]) 마이그레이션.
// 이미 신규 모델이면 그대로 반환.
function migrateImage(im) {
  if (!im || typeof im !== "object") return im;
  if (Array.isArray(im.versions) && im.versions.length > 0) return im;
  const v1Id = `${im.id}_v1`;
  return {
    id: im.id,
    name: im.name,
    device: im.device,
    addedAt: im.addedAt,
    ...(im.meta ? { meta: im.meta } : {}),
    versions: [
      {
        id: v1Id,
        label: "v1",
        url: im.url,
        addedAt: im.addedAt,
        notes: im.notes || [],
        confirmed: !!im.confirmed,
      },
    ],
    activeVersionId: v1Id,
  };
}

function getActiveVersion(image) {
  if (!image?.versions?.length) return null;
  return image.versions.find(v => v.id === image.activeVersionId) || image.versions[image.versions.length - 1];
}

// 페이지 상태 — 활성(보통 최신) 버전 기준.
// "none"=수정 없음(노트 0) / "pending"=수정 요청(미해결 있음) / "done"=수정 완료(노트 모두 resolved).
function getPageStatus(image) {
  const v = getActiveVersion(image);
  if (!v) return "none";
  const total = v.notes?.length || 0;
  if (total === 0) return "none";
  const unresolved = v.notes.filter(n => !n.resolved).length;
  if (unresolved > 0) return "pending";
  return "done";
}

const STATUS_DOT = {
  none:    { color: "#71717a", label: "수정 없음" },
  pending: { color: "#FDCB6E", label: "수정 요청" },
  done:    { color: "#0eb9b3", label: "수정 완료" },
};

// 파일명 → 프로젝트 이름 자동 추정. "brand_main_pc_01.jpg" → "brand"
function inferProjectName(files) {
  if (!files?.length) return "새 프로젝트";
  const first = files[0]?.name || "";
  const base = first.replace(/\.[^.]+$/, "");
  // 첫 토큰 추출 (- 또는 _ 분리). 2글자 이상이면 채택.
  const token = base.split(/[_\-\s]/)[0];
  return token && token.length >= 2 ? token : (base || "새 프로젝트");
}

// 이전·다음 projects 배열에서 ref 가 바뀐(=수정된) 프로젝트 id 만 추출.
// 불변 업데이트 컨벤션에 기댐 — 변경된 프로젝트만 .map 으로 새 객체가 됨.
function diffProjectIds(prev, next) {
  const prevMap = new Map((prev || []).map(p => [p.id, p]));
  const out = [];
  for (const p of (next || [])) {
    const before = prevMap.get(p.id);
    if (before !== p) out.push(p.id); // 신규 또는 변경됨.
  }
  return out;
}

const STATUS_LABEL = {
  in_review: "검토중",
  approved: "컨펌 완료",
  rejected: "반려",
  on_hold: "보류",
};
const STATUS_COLOR = {
  in_review: "#FDCB6E",
  approved: "#0eb9b3",
  rejected: "#FD79A8",
  on_hold: "#74B9FF",
};

export default function BrandWebReviewApp() {
  const { payload, clearPayload, user, navigate } = useGlobal();
  const uid = user?.uid || null;
  const [activeMenu, setActiveMenu] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ─── 핵심 상태 ─────────────────────────────────────────────
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [activeImageId, setActiveImageId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);

  // device 별 마지막 선택 페이지 기억 — PC ↔ Mobile 전환 시 직전 페이지 복원.
  // { [projectId]: { pc: imageId, mobile: imageId, banner: imageId } } 구조.
  const lastImageByDeviceRef = useRef({});

  // 최신 projects 를 ref 로 — Firestore 비동기 쓰기 시 stale closure 회피.
  const projectsRef = useRef([]);
  useEffect(() => { projectsRef.current = projects; }, [projects]);

  // mount 시 localStorage 캐시 즉시 표시(Firestore 응답 전 빈 화면 방지).
  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (!cached) return;
      const parsed = JSON.parse(cached);
      if (!Array.isArray(parsed)) return;
      const migrated = parsed.map(p => ({
        ...p,
        images: (p.images || []).map(migrateImage),
      }));
      setProjects(migrated);
    } catch (e) {
      console.warn("[BrandWebReview] localStorage restore failed", e);
    }
  }, []);

  // user 로그인 시 Firestore 구독 + 로컬 → 클라우드 1회 마이그레이션.
  useEffect(() => {
    if (!uid) return; // 비로그인은 로컬 모드 유지.
    let cancelled = false;

    // ① 로컬에만 있고 클라우드에는 없는 프로젝트를 1회 푸시.
    (async () => {
      try {
        const local = projectsRef.current || [];
        if (local.length === 0) return;
        const existing = await getExistingProjectIds(uid);
        const toUpload = local.filter(p => p?.id && !existing.has(p.id));
        if (toUpload.length === 0) return;
        if (cancelled) return;
        console.info(`[BrandWebReview] migrating ${toUpload.length} local project(s) → Firestore`);
        await bulkSaveProjects(uid, toUpload);
      } catch (e) {
        console.warn("[BrandWebReview] migration failed", e);
      }
    })();

    // ② onSnapshot 으로 진실의 원천 갱신.
    const unsub = subscribeToProjects(uid, (remote) => {
      if (cancelled) return;
      // 서버가 비어 있고 로컬에 데이터가 있으면(마이그레이션 진행 중) 로컬 유지.
      if (remote.length === 0 && (projectsRef.current?.length || 0) > 0) return;
      const normalized = remote.map(p => ({
        ...p,
        images: (p.images || []).map(migrateImage),
      }));
      setProjects(normalized);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized)); } catch {}
    }, (err) => console.warn("[BrandWebReview] subscribe error", err));

    return () => { cancelled = true; unsub?.(); };
  }, [uid]);

  // 캐시(로컬) — 어떤 모드든 항상 함께 갱신.
  const persistLocal = useCallback((next) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
    catch (e) { console.warn("[BrandWebReview] localStorage save failed (quota?)", e); }
  }, []);

  // 한 프로젝트를 백그라운드로 Firestore 에 저장 (낙관적 업데이트 패턴).
  const persistRemoteProject = useCallback((project) => {
    if (!uid || !project) return;
    saveProject(uid, project).catch(e => console.warn(`[BrandWebReview] saveProject(${project.id}) failed`, e));
  }, [uid]);

  // 핵심 mutator — projects state 갱신 + 로컬 캐시 + (변경된 프로젝트만) Firestore 쓰기.
  // touchedProjectIds 를 명시하면 그 id 들만 원격 저장. 미지정 시 모든 변경 프로젝트 자동 감지.
  const updateProjects = useCallback((updater, touchedProjectIds = null) => {
    setProjects(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persistLocal(next);
      if (uid) {
        const ids = touchedProjectIds || diffProjectIds(prev, next);
        ids.forEach(id => {
          const p = next.find(x => x.id === id);
          if (p) persistRemoteProject(p);
        });
        // 삭제된 프로젝트.
        const removedIds = (prev || []).filter(p => !next.find(n => n.id === p.id)).map(p => p.id);
        removedIds.forEach(id => deleteProjectRemote(uid, id).catch(e => console.warn(`[BrandWebReview] deleteProject(${id}) failed`, e)));
      }
      return next;
    });
  }, [uid, persistLocal, persistRemoteProject]);

  // ─── 외부 payload 수신 → 단일 이미지 프로젝트 자동 생성 ─────
  const incoming = useMemo(() => {
    if (payload?.target !== "brand-web-review") return null;
    return payload;
  }, [payload]);
  useEffect(() => {
    if (!incoming) return;
    const url = incoming.image?.url;
    if (!url) {
      console.warn("[BrandWebReview] payload received but image.url is empty", incoming);
      clearPayload?.();
      return;
    }
    const title = incoming.prompt?.text || "외부 수신 항목";
    measureImage(url).then(({ w, h }) => {
      const device = guessDeviceFromName(title) || deviceFromRatio(w, h);
      const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const v1Id = `${id}_v1`;
      const newImage = {
        id, name: title, device,
        addedAt: Date.now(),
        meta: incoming.image?.metadata || {},
        versions: [
          { id: v1Id, label: "v1", url, addedAt: Date.now(), notes: [], confirmed: false },
        ],
        activeVersionId: v1Id,
      };
      const proj = {
        id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: title,
        createdAt: Date.now(),
        status: "in_review",
        images: [newImage],
        source: incoming.source || "external",
        tags: incoming.prompt?.tags || [],
        // 외부 앱에서 폴더 경로를 함께 보내준 경우 자동 채움 (PromotionArchive·DesignEvaluator 흐름).
        sharedFolderUrl: incoming.params?.sharedFolderUrl || incoming.image?.metadata?.sourcePath || "",
        owner: incoming.params?.owner || "",
        description: incoming.params?.description || "",
      };
      updateProjects(prev => [proj, ...prev]);
      setActiveProjectId(proj.id);
      setActiveImageId(newImage.id);
      clearPayload?.();
    });
  }, [incoming, updateProjects, clearPayload]);

  // ─── 파일 → 프로젝트 / 이미지 ─────────────────────────────
  // 2번째 인자: string(=name) 또는 { name, owner, sharedFolderUrl, description }.
  const createProjectFromFiles = useCallback(async (files, nameOrMeta) => {
    const list = Array.from(files || []).filter(f => f.type?.startsWith("image/"));
    if (!list.length) return;
    const meta = typeof nameOrMeta === "string" ? { name: nameOrMeta } : (nameOrMeta || {});
    setIsUploading(true);
    try {
      const images = [];
      for (let i = 0; i < list.length; i++) {
        images.push(await fileToImage(list[i], i, { useCloud: !!uid }));
      }
      const proj = {
        id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: (meta.name?.trim() || inferProjectName(list)),
        owner: meta.owner?.trim() || "",
        sharedFolderUrl: meta.sharedFolderUrl?.trim() || "",
        description: meta.description?.trim() || "",
        createdAt: Date.now(),
        status: "in_review",
        images,
        source: "upload",
        tags: [],
      };
      updateProjects(prev => [proj, ...prev]);
      setActiveProjectId(proj.id);
      setActiveImageId(null);
    } finally {
      setIsUploading(false);
      setShowNewProject(false);
    }
  }, [uid, updateProjects]);

  const addImagesToProject = useCallback(async (projectId, files) => {
    const list = Array.from(files || []).filter(f => f.type?.startsWith("image/"));
    if (!list.length) return;
    setIsUploading(true);
    try {
      const baseIdx = projects.find(p => p.id === projectId)?.images?.length || 0;
      const newImages = [];
      for (let i = 0; i < list.length; i++) {
        newImages.push(await fileToImage(list[i], baseIdx + i, { useCloud: !!uid }));
      }
      updateProjects(prev => prev.map(p =>
        p.id === projectId ? { ...p, images: [...p.images, ...newImages] } : p
      ));
    } finally {
      setIsUploading(false);
    }
  }, [projects, uid, updateProjects]);

  // ─── 노트 / 컨펌 / 삭제 / 상태 변경 ────────────────────────
  // 활성 버전의 notes 만 갱신. 첨부 이미지(dataURL)는 Cloudinary 로 옮겨 Firestore 1MB 제한 회피.
  const handleNotesChange = useCallback(async (nextNotes) => {
    if (!activeProjectId || !activeImageId) return;
    const cleaned = uid ? await hostNotesAttachments(nextNotes) : nextNotes;
    updateProjects(prev => prev.map(p => {
      if (p.id !== activeProjectId) return p;
      return {
        ...p,
        images: p.images.map(im => {
          if (im.id !== activeImageId) return im;
          return {
            ...im,
            versions: im.versions.map(v => v.id === im.activeVersionId ? { ...v, notes: cleaned } : v),
          };
        }),
      };
    }));
  }, [activeProjectId, activeImageId, uid, updateProjects]);

  // 활성 버전을 confirmed=true 로. 모든 이미지의 활성 버전이 confirmed 면 프로젝트 자동 approved.
  const handleImageConfirm = useCallback(() => {
    if (!activeProjectId || !activeImageId) return;
    updateProjects(prev => prev.map(p => {
      if (p.id !== activeProjectId) return p;
      const images = p.images.map(im => {
        if (im.id !== activeImageId) return im;
        return {
          ...im,
          versions: im.versions.map(v => v.id === im.activeVersionId ? { ...v, confirmed: true } : v),
        };
      });
      const allConfirmed = images.length > 0 && images.every(im => {
        const av = getActiveVersion(im);
        return av?.confirmed;
      });
      return { ...p, images, status: allConfirmed ? "approved" : p.status };
    }));
    setActiveImageId(null);
  }, [activeProjectId, activeImageId, updateProjects]);

  // 같은 이미지(페이지)에 새 버전 추가. 자동으로 새 버전이 active. user 있으면 Cloudinary.
  const addImageVersion = useCallback(async (file) => {
    if (!activeProjectId || !activeImageId || !file) return;
    const dataUrl = await loadImageDataURL(file);
    let url = dataUrl;
    if (uid) {
      try { url = await uploadBase64(dataUrl); }
      catch (e) { console.warn("[BrandWebReview] version upload failed, fallback to dataURL", e); url = dataUrl; }
    }
    updateProjects(prev => prev.map(p => {
      if (p.id !== activeProjectId) return p;
      return {
        ...p,
        images: p.images.map(im => {
          if (im.id !== activeImageId) return im;
          const nextLabel = `v${im.versions.length + 1}`;
          const newVersion = {
            id: `${im.id}_${nextLabel}_${Math.random().toString(36).slice(2, 6)}`,
            label: nextLabel,
            url,
            addedAt: Date.now(),
            notes: [],
            confirmed: false,
          };
          return {
            ...im,
            versions: [...im.versions, newVersion],
            activeVersionId: newVersion.id,
          };
        }),
      };
    }));
  }, [activeProjectId, activeImageId, uid, updateProjects]);

  // 버전 전환 — 같은 이미지 안에서 다른 버전을 활성화.
  const handleSelectVersion = useCallback((versionId) => {
    if (!activeProjectId || !activeImageId) return;
    updateProjects(prev => prev.map(p => {
      if (p.id !== activeProjectId) return p;
      return {
        ...p,
        images: p.images.map(im => im.id === activeImageId ? { ...im, activeVersionId: versionId } : im),
      };
    }));
  }, [activeProjectId, activeImageId, updateProjects]);

  const handleDeleteProject = useCallback((projectId) => {
    if (!confirm("프로젝트를 삭제할까요? 모든 이미지와 노트가 사라집니다.")) return;
    updateProjects(prev => prev.filter(p => p.id !== projectId));
    if (activeProjectId === projectId) {
      setActiveProjectId(null);
      setActiveImageId(null);
    }
  }, [activeProjectId, updateProjects]);

  const handleDeleteImage = useCallback((projectId, imageId) => {
    updateProjects(prev => prev.map(p =>
      p.id !== projectId ? p :
      { ...p, images: p.images.filter(im => im.id !== imageId) }
    ));
    if (activeImageId === imageId) setActiveImageId(null);
  }, [activeImageId, updateProjects]);

  const handleSetProjectStatus = useCallback((projectId, status) => {
    updateProjects(prev => prev.map(p => p.id === projectId ? { ...p, status } : p));
  }, [updateProjects]);

  // 컨펌 완료 프로젝트를 Brand Web Library(PromotionArchive) 에 brand-web 카드로 등록.
  // confirm() 대신 PublishModal 을 열어 게임/연도 선택 + AI 추정 단계 거친 뒤 등록.
  const [isRegisteringLibrary, setIsRegisteringLibrary] = useState(false);
  const [publishModal, setPublishModal] = useState({ open: false, project: null });

  const handleRegisterToLibrary = useCallback((project) => {
    if (!uid) { alert("로그인이 필요합니다."); return; }
    if (!project) return;
    if (project.status !== "approved") {
      alert("컨펌 완료(approved) 상태인 프로젝트만 라이브러리에 등록할 수 있습니다.");
      return;
    }
    if (isRegisteringLibrary) return;
    setPublishModal({ open: true, project });
  }, [uid, isRegisteringLibrary]);

  // PublishModal 에서 game/year 선택 후 실제 등록 수행.
  const handleConfirmPublish = useCallback(async ({ game, year }) => {
    const project = publishModal.project;
    if (!project || !uid) return;
    setIsRegisteringLibrary(true);
    try {
      const created = await registerProjectAsBrandWebBanner(uid, project, { game, year });
      setPublishModal({ open: false, project: null });
      if (confirm(`✅ '${game}' 카테고리에 등록 완료 (${created.pageCount}페이지)\n\nBrand Web Library 로 이동해서 확인할까요?`)) {
        navigate("promotion-archive", {
          source: "brand-web-review",
          target: "promotion-archive",
          prompt: { text: "", tags: [], style: "" },
          image: { url: "", metadata: {} },
          params: { viewBannerId: created.id },
          timestamp: Date.now(),
        });
      }
    } catch (e) {
      if (e.code === "ALREADY_REGISTERED") {
        setPublishModal({ open: false, project: null });
        if (confirm(`이미 라이브러리에 등록된 프로젝트입니다.\n\n라이브러리에서 해당 항목을 열까요?`)) {
          navigate("promotion-archive", {
            source: "brand-web-review",
            target: "promotion-archive",
            prompt: { text: "", tags: [], style: "" },
            image: { url: "", metadata: {} },
            params: { viewBannerId: e.bannerId },
            timestamp: Date.now(),
          });
        }
      } else {
        console.error("[BrandWebReview] register failed", e);
        alert(`등록 실패: ${e.message || e.code}`);
      }
    } finally {
      setIsRegisteringLibrary(false);
    }
  }, [publishModal.project, uid, navigate]);

  // 프로젝트 정보 패치 (name, owner, sharedFolderUrl, description 등).
  const handleUpdateProjectInfo = useCallback((projectId, patch) => {
    if (!patch || typeof patch !== "object") return;
    updateProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...patch } : p));
  }, [updateProjects]);

  // device별 일괄 컨펌 — 해당 device 페이지의 활성 버전을 모두 confirmed=true.
  // 모든 device 가 다 confirmed 되면 자동으로 project.status='approved'.
  const handleConfirmDevice = useCallback((projectId, device) => {
    const proj = projectsRef.current.find(p => p.id === projectId);
    if (!proj) return;
    const devImages = proj.images.filter(im => im.device === device);
    if (devImages.length === 0) return;
    const unresolved = devImages.reduce((acc, im) => {
      const v = getActiveVersion(im);
      return acc + (v?.notes || []).filter(n => !n.resolved).length;
    }, 0);
    const label = DEVICE_META[device]?.label || device;
    const msg = unresolved > 0
      ? `${label} 미해결 수정사항 ${unresolved}건이 남아 있습니다. 그래도 ${label} 컨펌 완료 처리할까요?`
      : `${label} 페이지 ${devImages.length}장을 컨펌 완료 처리할까요?`;
    if (!confirm(msg)) return;
    updateProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const images = p.images.map(im => {
        if (im.device !== device) return im;
        return {
          ...im,
          versions: im.versions.map(v =>
            v.id === im.activeVersionId ? { ...v, confirmed: true } : v
          ),
        };
      });
      const allConfirmed = images.length > 0 && images.every(im => getActiveVersion(im)?.confirmed);
      return {
        ...p,
        images,
        status: allConfirmed ? "approved" : p.status,
        ...(allConfirmed ? { approvedAt: Date.now() } : {}),
      };
    }));
  }, [updateProjects]);

  // 프로젝트 전체 컨펌 — 활성 버전 전부 confirmed=true + status='approved'.
  // 미해결 노트가 있으면 한 번 더 확인.
  const handleProjectConfirmAll = useCallback((projectId) => {
    const proj = projectsRef.current.find(p => p.id === projectId);
    if (!proj) return;
    const unresolved = (proj.images || []).reduce((acc, im) => {
      const v = getActiveVersion(im);
      return acc + (v?.notes || []).filter(n => !n.resolved).length;
    }, 0);
    const msg = unresolved > 0
      ? `미해결 수정사항 ${unresolved}건이 남아 있습니다. 그래도 프로젝트를 컨펌 완료 처리할까요?`
      : `'${proj.name}' 프로젝트를 컨펌 완료 처리할까요?\n모든 페이지의 활성 버전이 확정됩니다.`;
    if (!confirm(msg)) return;
    updateProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        status: "approved",
        approvedAt: Date.now(),
        images: p.images.map(im => ({
          ...im,
          versions: im.versions.map(v =>
            v.id === im.activeVersionId ? { ...v, confirmed: true } : v
          ),
        })),
      };
    }));
  }, [updateProjects]);

  // ─── 파생 ─────────────────────────────────────────────────
  const activeProject = useMemo(
    () => projects.find(p => p.id === activeProjectId) || null,
    [projects, activeProjectId]
  );
  const activeImage = useMemo(
    () => activeProject?.images?.find(im => im.id === activeImageId) || null,
    [activeProject, activeImageId]
  );
  const activeVersion = useMemo(() => getActiveVersion(activeImage), [activeImage]);

  // 현재 페이지가 바뀔 때마다 device 별 마지막 선택을 ref 에 기록. 토글로 복원.
  useEffect(() => {
    if (!activeProjectId || !activeImage?.device || !activeImage?.id) return;
    if (!lastImageByDeviceRef.current[activeProjectId]) lastImageByDeviceRef.current[activeProjectId] = {};
    lastImageByDeviceRef.current[activeProjectId][activeImage.device] = activeImage.id;
  }, [activeProjectId, activeImage?.id, activeImage?.device]);

  const filteredProjects = useMemo(() => {
    if (activeMenu === "all") return projects;
    return projects.filter(p => p.status === activeMenu);
  }, [projects, activeMenu]);

  // 같은 device 안에서 페이지 순환 — ReviewWorkspace 헤더 인디케이터용.
  const sameDeviceImages = useMemo(() => {
    if (!activeProject || !activeImage) return [];
    return activeProject.images.filter(im => im.device === activeImage.device);
  }, [activeProject, activeImage]);
  const pageIndex = useMemo(
    () => sameDeviceImages.findIndex(im => im.id === activeImageId),
    [sameDeviceImages, activeImageId]
  );
  const handlePageNav = useCallback((dir) => {
    const next = pageIndex + dir;
    if (next < 0 || next >= sameDeviceImages.length) return;
    setActiveImageId(sameDeviceImages[next].id);
  }, [pageIndex, sameDeviceImages]);

  // ─── 프로젝트 전체 수정사항(모든 페이지·모든 버전의 노트) 평탄화 + 점프 ───
  const allNotes = useMemo(() => {
    if (!activeProject) return [];
    const out = [];
    activeProject.images.forEach(im => {
      // 페이지 번호는 같은 device 안에서 1부터.
      const sameDevice = activeProject.images.filter(x => x.device === im.device);
      const pageNumber = sameDevice.findIndex(x => x.id === im.id) + 1;
      (im.versions || []).forEach(v => {
        (v.notes || []).forEach(n => {
          out.push({
            id: n.id, text: n.text, resolved: !!n.resolved, date: n.date,
            attachment: n.attachment, rect: n.rect,
            pageId: im.id, pageName: im.name, pageNumber,
            device: im.device,
            versionId: v.id, versionLabel: v.label,
            isLatestVersion: v.id === im.activeVersionId,
          });
        });
      });
    });
    return out;
  }, [activeProject]);

  const [jumpTargetNoteId, setJumpTargetNoteId] = useState(null);
  const handleJumpToNote = useCallback((pageId, versionId, noteId) => {
    setActiveImageId(pageId);
    updateProjects(prev => prev.map(p => {
      if (p.id !== activeProjectId) return p;
      return {
        ...p,
        images: p.images.map(im => im.id === pageId ? { ...im, activeVersionId: versionId } : im),
      };
    }));
    setJumpTargetNoteId(noteId);
  }, [activeProjectId, updateProjects]);

  // 전체 수정사항 패널에서 임의 페이지·임의 버전의 노트 resolved 토글.
  const handleToggleNoteResolved = useCallback((pageId, versionId, noteId) => {
    if (!activeProjectId) return;
    updateProjects(prev => prev.map(p => {
      if (p.id !== activeProjectId) return p;
      return {
        ...p,
        images: p.images.map(im => {
          if (im.id !== pageId) return im;
          return {
            ...im,
            versions: im.versions.map(v => {
              if (v.id !== versionId) return v;
              return {
                ...v,
                notes: (v.notes || []).map(n =>
                  n.id === noteId ? { ...n, resolved: !n.resolved } : n
                ),
              };
            }),
          };
        }),
      };
    }));
  }, [activeProjectId, updateProjects]);

  // ─── 사이드바 ─────────────────────────────────────────────
  const handleSidebarClick = useCallback((e) => {
    const isInteractive = e.target.closest("button, input, label, select, a, span");
    if (!isInteractive && window.innerWidth >= 768) setSidebarOpen((v) => !v);
  }, []);

  return (
    <div className="flex h-full bg-[#0c0c0e] text-zinc-200 font-sans overflow-hidden" style={{ height: "calc(100vh - 52px)" }}>
      {/* ─── 사이드바 ─────────────────────────────────── */}
      <aside
        onClick={handleSidebarClick}
        className={`${sidebarOpen ? "w-[200px]" : "w-16"} shrink-0 border-r border-white/5 bg-[#111] flex flex-col transition-[width] duration-300 ease-in-out cursor-default`}
      >
        <div className={`flex items-center h-[60px] shrink-0 transition-all duration-300 ${sidebarOpen ? "px-4" : "justify-center"}`} />
        <nav className="flex-1 overflow-y-auto py-2 flex flex-col gap-0.5">
          {REVIEW_MENUS.map(m => {
            const active = activeMenu === m.id;
            return (
              <button
                key={m.id}
                onClick={(e) => { e.stopPropagation(); setActiveMenu(m.id); setActiveProjectId(null); setActiveImageId(null); }}
                title={!sidebarOpen ? m.name : undefined}
                className={`flex items-center gap-3 h-10 px-4 transition-colors text-left ${active ? "text-[#FD79A8] bg-[#FD79A8]/10 border-l-2 border-[#FD79A8]" : "text-zinc-500 hover:text-white hover:bg-white/5 border-l-2 border-transparent"}`}
              >
                <span className="shrink-0">{m.icon}</span>
                {sidebarOpen && <span className="text-xs font-medium">{m.name}</span>}
              </button>
            );
          })}
        </nav>
        <div className={`shrink-0 p-3 border-t border-white/5 ${sidebarOpen ? "" : "px-2"}`}>
          <button
            onClick={(e) => { e.stopPropagation(); setShowNewProject(true); }}
            title="새 프로젝트"
            className="w-full flex items-center justify-center gap-2 h-9 rounded-md bg-[#FD79A8]/10 hover:bg-[#FD79A8]/20 border border-[#FD79A8]/40 text-[#FD79A8] text-xs font-medium transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            {sidebarOpen && "새 프로젝트"}
          </button>
        </div>
      </aside>

      {/* ─── 메인 영역 ───────────────────────────────── */}
      {activeImage && activeVersion ? (
        <ReviewWorkspace
          title={`${activeProject.name} · ${activeImage.name}`}
          image={activeVersion.url}
          meta={{ device: activeImage.device, confirmed: activeVersion.confirmed, ...(activeImage.meta || {}) }}
          notes={activeVersion.notes || []}
          onNotesChange={handleNotesChange}
          onConfirm={handleImageConfirm}
          onBack={() => setActiveImageId(null)}
          // 좌측 PPT 썸네일 패널: 같은 device 페이지 목록.
          pages={sameDeviceImages.map((im, i) => {
            const v = getActiveVersion(im);
            return {
              id: im.id,
              name: im.name,
              thumbUrl: v?.url,
              pageNumber: i + 1,
              status: getPageStatus(im),
              versionsCount: im.versions.length,
              isActive: im.id === activeImageId,
            };
          })}
          activePageId={activeImageId}
          onSelectPage={(id) => setActiveImageId(id)}
          // 버전 탭 & 새 버전 업로드.
          versions={activeImage.versions}
          activeVersionId={activeImage.activeVersionId}
          onSelectVersion={handleSelectVersion}
          onUploadNewVersion={addImageVersion}
          device={activeImage.device}
          // device 전환 — 현재 프로젝트에 존재하는 device 의 첫 페이지로 active 이동.
          availableDevices={(() => {
            const order = ["pc", "mobile", "banner"];
            const present = new Set((activeProject?.images || []).map((im) => im.device).filter(Boolean));
            return order.filter((d) => present.has(d));
          })()}
          onSwitchDevice={(d) => {
            if (!activeProject) return;
            // 현재 보고 있는 페이지를 ref 에 device 별로 저장.
            if (activeImage?.device && activeImage?.id) {
              if (!lastImageByDeviceRef.current[activeProject.id]) lastImageByDeviceRef.current[activeProject.id] = {};
              lastImageByDeviceRef.current[activeProject.id][activeImage.device] = activeImage.id;
            }
            // 목표 device 의 마지막 선택 페이지 → 유효하면 복원, 아니면 첫 페이지.
            const memorized = lastImageByDeviceRef.current[activeProject.id]?.[d];
            const memorizedImg = memorized
              ? (activeProject.images || []).find((im) => im.id === memorized && im.device === d)
              : null;
            const target = memorizedImg || (activeProject.images || []).find((im) => im.device === d);
            if (target) setActiveImageId(target.id);
          }}
          // 전체 수정사항 리스트 + 점프 + 토글.
          allNotes={allNotes}
          onJumpToNote={handleJumpToNote}
          onToggleNoteResolved={handleToggleNoteResolved}
          jumpTargetNoteId={jumpTargetNoteId}
          onJumpHandled={() => setJumpTargetNoteId(null)}
        />
      ) : activeProject ? (
        <ProjectDetailView
          project={activeProject}
          onBack={() => setActiveProjectId(null)}
          onSelectImage={(imgId) => setActiveImageId(imgId)}
          onAddImages={(files) => addImagesToProject(activeProject.id, files)}
          onDeleteImage={(imgId) => handleDeleteImage(activeProject.id, imgId)}
          onDeleteProject={() => handleDeleteProject(activeProject.id)}
          onSetStatus={(status) => handleSetProjectStatus(activeProject.id, status)}
          onConfirmAll={() => handleProjectConfirmAll(activeProject.id)}
          onConfirmDevice={(device) => handleConfirmDevice(activeProject.id, device)}
          onUpdateInfo={(patch) => handleUpdateProjectInfo(activeProject.id, patch)}
          onRegisterToLibrary={() => handleRegisterToLibrary(activeProject)}
          isRegisteringLibrary={isRegisteringLibrary}
          currentUserName={user?.displayName || user?.email || ""}
          isUploading={isUploading}
        />
      ) : (
        <ProjectListView
          projects={filteredProjects}
          allCount={projects.length}
          activeMenu={activeMenu}
          onOpenProject={(projId) => { setActiveProjectId(projId); setActiveImageId(null); }}
          onDeleteProject={handleDeleteProject}
          onNewProject={() => setShowNewProject(true)}
        />
      )}

      {/* ─── 새 프로젝트 모달 ─────────────────────────── */}
      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreate={createProjectFromFiles}
          currentUserName={user?.displayName || user?.email || ""}
          isUploading={isUploading}
        />
      )}

      {/* Brand Web Library 발행 모달 — 컨펌 완료 프로젝트의 게임/연도 선택 + AI 추정 */}
      <PublishModal
        isOpen={publishModal.open}
        project={publishModal.project}
        thumbnailUrl={(() => {
          const p = publishModal.project;
          if (!p) return null;
          // 첫 PC 이미지 우선 → Mobile → 그냥 첫 페이지.
          const findActive = (im) => im?.versions?.find(v => v.id === im.activeVersionId) || im?.versions?.[im.versions.length - 1];
          const pcImage = (p.images || []).find(im => im.device === "pc");
          const mobileImage = (p.images || []).find(im => im.device === "mobile");
          const firstImage = (p.images || [])[0];
          return findActive(pcImage)?.url || findActive(mobileImage)?.url || findActive(firstImage)?.url || null;
        })()}
        existingGames={["아이온", "블레이드앤소울", "리니지", "리니지M", "리니지W", "TL", "호연", "기타"]}
        onClose={() => { if (!isRegisteringLibrary) setPublishModal({ open: false, project: null }); }}
        onSubmit={handleConfirmPublish}
        isSubmitting={isRegisteringLibrary}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 프로젝트 목록 뷰
// ═══════════════════════════════════════════════════════════
function ProjectListView({ projects, allCount, activeMenu, onOpenProject, onDeleteProject, onNewProject }) {
  const menuLabel = REVIEW_MENUS.find(m => m.id === activeMenu)?.name || "전체";
  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <header className="shrink-0 h-[60px] px-6 flex items-center justify-between border-b border-white/5">
        <div className="flex items-baseline gap-3">
          <h1 className="text-sm font-bold text-zinc-200">프로젝트</h1>
          <span className="text-[11px] text-zinc-500">{menuLabel} · {projects.length}개</span>
        </div>
        <button
          onClick={onNewProject}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#FD79A8]/10 hover:bg-[#FD79A8]/20 border border-[#FD79A8]/40 text-[#FD79A8] text-xs font-medium transition-colors"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          새 프로젝트
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {projects.length === 0 ? (
          <div className="max-w-3xl mx-auto">
            <div className="rounded-xl border border-dashed border-white/10 bg-[#111118] p-12 text-center">
              <Folder className="w-10 h-10 text-zinc-600 mx-auto mb-4" />
              <h2 className="text-base font-bold text-zinc-200 mb-2">
                {allCount === 0 ? "아직 프로젝트가 없어요" : `${menuLabel} 상태의 프로젝트가 없어요`}
              </h2>
              <p className="text-xs text-zinc-500 leading-relaxed mb-5">
                브랜드 사이트 한 건 = 1개 프로젝트.<br/>
                메인·서브·모바일 페이지를 한 번에 올리면 한 폴더로 묶입니다.
              </p>
              <button
                onClick={onNewProject}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#FD79A8]/10 hover:bg-[#FD79A8]/20 border border-[#FD79A8]/40 text-[#FD79A8] text-xs font-medium transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                이미지 업로드해서 시작
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} onOpen={() => onOpenProject(p.id)} onDelete={() => onDeleteProject(p.id)} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function ProjectCard({ project, onOpen, onDelete }) {
  const [hov, setHov] = useState(false);
  const thumb = getActiveVersion(project.images?.[0])?.url;
  const total = project.images?.length || 0;
  const confirmed = project.images?.filter(im => getActiveVersion(im)?.confirmed).length || 0;
  const noteCount = project.images?.reduce((acc, im) => acc + (getActiveVersion(im)?.notes?.length || 0), 0) || 0;
  const pcCount = project.images?.filter(im => im.device === "pc").length || 0;
  const mobileCount = project.images?.filter(im => im.device === "mobile").length || 0;
  const bannerCount = project.images?.filter(im => im.device === "banner").length || 0;
  const statusColor = STATUS_COLOR[project.status] || "#7A7A9A";

  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="rounded-lg border border-white/5 bg-[#16161F] hover:bg-[#1c1c28] hover:border-white/10 transition-colors cursor-pointer overflow-hidden group"
    >
      <div className="relative aspect-[16/10] bg-[#0c0c0e] overflow-hidden">
        {thumb ? (
          <img src={thumb} alt={project.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-700">
            <Folder className="w-8 h-8" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm" style={{ color: statusColor }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
          {STATUS_LABEL[project.status] || project.status}
        </div>
        <div className="absolute top-2 right-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-zinc-300">
          {total}장
        </div>
        {hov && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="absolute bottom-2 right-2 p-1.5 rounded-md bg-black/70 hover:bg-rose-500/80 text-white transition-colors"
            title="프로젝트 삭제"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
      <div className="p-3">
        <div className="text-sm font-semibold text-zinc-200 truncate mb-1" title={project.name}>{project.name}</div>
        {(project.owner || project.sharedFolderUrl) && (
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 mb-1.5 truncate">
            {project.owner && <span className="truncate" title={`작업자: ${project.owner}`}>👤 {project.owner}</span>}
            {project.sharedFolderUrl && (
              <a
                href={project.sharedFolderUrl} target="_blank" rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                title={project.sharedFolderUrl}
                className="text-violet-400 hover:text-violet-300 flex items-center gap-0.5 shrink-0"
              >
                <ExternalLink className="w-2.5 h-2.5" /> 폴더
              </a>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
          {pcCount > 0 && (<span className="flex items-center gap-1"><Monitor className="w-3 h-3"/>{pcCount}</span>)}
          {mobileCount > 0 && (<span className="flex items-center gap-1"><Smartphone className="w-3 h-3"/>{mobileCount}</span>)}
          {bannerCount > 0 && (<span className="flex items-center gap-1"><Image2 className="w-3 h-3"/>{bannerCount}</span>)}
          {confirmed > 0 && (<span className="flex items-center gap-1 text-[#0eb9b3]"><Check className="w-3 h-3"/>{confirmed}/{total}</span>)}
          {noteCount > 0 && (<span className="text-[#FDCB6E]">노트 {noteCount}</span>)}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 프로젝트 상세 — 이미지 그리드 (PC / 모바일 섹션)
// ═══════════════════════════════════════════════════════════
function ProjectDetailView({
  project, onBack, onSelectImage, onAddImages, onDeleteImage, onDeleteProject,
  onSetStatus, onConfirmAll, onConfirmDevice, onUpdateInfo, currentUserName, isUploading,
  onRegisterToLibrary, isRegisteringLibrary,
}) {
  const addFileRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  // device 별 이미지 + 진행 상태.
  const devicesData = useMemo(() => {
    return DEVICE_ORDER.map(d => {
      const images = project.images.filter(im => im.device === d);
      const confirmed = images.filter(im => getActiveVersion(im)?.confirmed).length;
      const unresolved = images.reduce((acc, im) => {
        const v = getActiveVersion(im);
        return acc + (v?.notes || []).filter(n => !n.resolved).length;
      }, 0);
      return {
        id: d,
        label: DEVICE_META[d].label,
        color: DEVICE_META[d].color,
        images,
        total: images.length,
        confirmed,
        unresolved,
        complete: images.length > 0 && confirmed === images.length,
      };
    });
  }, [project.images]);

  const totalImages = project.images.length;
  const totalConfirmed = devicesData.reduce((a, d) => a + d.confirmed, 0);
  const totalUnresolved = devicesData.reduce((a, d) => a + d.unresolved, 0);
  const isApproved = project.status === "approved";
  const canConfirm = totalImages > 0 && !isApproved;

  // 기본 활성 탭 = 이미지가 있는 첫 device. 없으면 pc.
  const firstAvailable = devicesData.find(d => d.total > 0)?.id || "pc";
  const [deviceTab, setDeviceTab] = useState(firstAvailable);

  // 새 이미지 추가 시 — 마지막으로 들어온 이미지의 device 로 자동 탭 전환.
  const prevCountRef = useRef(project.images.length);
  useEffect(() => {
    const currCount = project.images.length;
    if (currCount > prevCountRef.current) {
      const added = project.images.slice(prevCountRef.current);
      const last = added[added.length - 1];
      if (last?.device && DEVICE_META[last.device]) setDeviceTab(last.device);
    }
    prevCountRef.current = currCount;
  }, [project.images]);

  const activeDeviceData = devicesData.find(d => d.id === deviceTab) || devicesData[0];
  const visibleImages = activeDeviceData.images;
  const activeDeviceCanConfirm = activeDeviceData.total > 0 && !activeDeviceData.complete && !isApproved;

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    onAddImages(e.dataTransfer.files);
  };

  return (
    <main
      className="flex-1 flex flex-col overflow-hidden relative"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
      onDrop={handleDrop}
    >
      <header className="shrink-0 h-[60px] px-6 flex items-center justify-between border-b border-white/5 gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onBack} className="p-1.5 rounded hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-bold text-zinc-200 truncate">{project.name}</h1>
          <span className="text-[11px] text-zinc-500 shrink-0">· {totalImages}장</span>
          <button
            onClick={() => setInfoOpen(v => !v)}
            title={infoOpen ? "프로젝트 정보 접기" : "프로젝트 정보 보기/편집"}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
              infoOpen
                ? "bg-violet-500/15 border-violet-500/40 text-violet-300"
                : "bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Info className="w-3 h-3" />
            정보
          </button>
          {/* 진행률 칩 */}
          {totalImages > 0 && (
            <>
              <span
                title="컨펌 완료된 페이지 / 전체 페이지 (활성 버전 기준)"
                className={`shrink-0 text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded ${
                  totalConfirmed === totalImages
                    ? "bg-[#0eb9b3]/15 text-[#0eb9b3] border border-[#0eb9b3]/40"
                    : "bg-white/5 text-zinc-400 border border-white/10"
                }`}
              >
                컨펌 {totalConfirmed}/{totalImages}
              </span>
              {totalUnresolved > 0 && (
                <span
                  title="아직 미해결인 수정 요청 수"
                  className="shrink-0 text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/40"
                >
                  미해결 {totalUnresolved}
                </span>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Brand Web Library 등록 — approved 일 때만 활성. 다른 상태에서는 시각적으로 비활성 + tooltip 안내 */}
          {onRegisterToLibrary && (
            <button
              onClick={onRegisterToLibrary}
              disabled={project.status !== "approved" || isRegisteringLibrary}
              title={
                project.status !== "approved"
                  ? "컨펌 완료 상태에서만 등록할 수 있습니다"
                  : isRegisteringLibrary ? "등록 중…"
                  : "Brand Web Library 에 한 카드로 등록"
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                project.status === "approved" && !isRegisteringLibrary
                  ? "bg-[#d8b17e]/10 hover:bg-[#d8b17e]/20 border-[#d8b17e]/50 text-[#d8b17e]"
                  : "bg-zinc-800 border-zinc-700 text-zinc-600 cursor-not-allowed"
              }`}
            >
              <FolderPlus className="w-3.5 h-3.5" />
              {isRegisteringLibrary ? "등록 중…" : "Library 등록"}
            </button>
          )}
          <select
            value={project.status}
            onChange={(e) => onSetStatus(e.target.value)}
            className="text-[11px] px-2 py-1.5 rounded-md bg-[#16161F] border border-white/10 text-zinc-300 outline-none"
          >
            <option value="in_review">검토중</option>
            <option value="approved">컨펌 완료</option>
            <option value="rejected">반려</option>
            <option value="on_hold">보류</option>
          </select>
          <input
            ref={addFileRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => { onAddImages(e.target.files); e.target.value = ""; }}
          />
          <button
            onClick={() => addFileRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#FD79A8]/10 hover:bg-[#FD79A8]/20 border border-[#FD79A8]/40 text-[#FD79A8] text-xs font-medium transition-colors disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            이미지 추가
          </button>
          {/* 활성 device 컨펌 — 이 탭에 페이지가 있고 아직 다 컨펌 안 됐을 때만. */}
          {activeDeviceCanConfirm && (
            <button
              onClick={() => onConfirmDevice?.(activeDeviceData.id)}
              title={`${activeDeviceData.label} 페이지 ${activeDeviceData.total}장을 한 번에 컨펌 처리`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-bold transition-colors"
              style={{
                background: `${activeDeviceData.color}22`,
                borderColor: `${activeDeviceData.color}66`,
                color: activeDeviceData.color,
              }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {activeDeviceData.label} 컨펌
            </button>
          )}
          {/* 프로젝트 전체 컨펌 — 모든 device 가 끝나면 권장 톤. */}
          {canConfirm && (
            <button
              onClick={onConfirmAll}
              title={totalUnresolved > 0
                ? `미해결 ${totalUnresolved}건 있음 — 확인 후 진행`
                : "모든 페이지의 활성 버전을 컨펌하고 프로젝트를 완료 처리"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-bold transition-colors ${
                totalUnresolved > 0
                  ? "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/40 text-amber-300"
                  : "bg-[#0eb9b3]/15 hover:bg-[#0eb9b3]/25 border-[#0eb9b3]/50 text-[#0eb9b3]"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              프로젝트 컨펌
            </button>
          )}
          {isApproved && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0eb9b3]/10 border border-[#0eb9b3]/40 text-[#0eb9b3] text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              컨펌 완료
            </span>
          )}
          <button onClick={onDeleteProject} className="p-1.5 rounded hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors" title="프로젝트 삭제">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {infoOpen && (
        <ProjectInfoPanel
          project={project}
          onUpdate={onUpdateInfo}
          currentUserName={currentUserName}
          onClose={() => setInfoOpen(false)}
        />
      )}

      {/* PC/Mobile/Banner 탭 — 이미지가 있는 device 만 표시. */}
      {project.images.length > 0 && (
        <div className="shrink-0 px-6 pt-3 border-b border-white/5 flex items-center gap-1">
          {devicesData.filter(d => d.total > 0).map(d => (
            <DeviceTab
              key={d.id}
              active={deviceTab === d.id}
              onClick={() => setDeviceTab(d.id)}
              icon={
                d.id === "mobile" ? <Smartphone className="w-3.5 h-3.5" /> :
                d.id === "banner" ? <Image2 className="w-3.5 h-3.5" /> :
                <Monitor className="w-3.5 h-3.5" />
              }
              label={d.label}
              count={d.total}
              color={d.color}
              complete={d.complete}
              unresolved={d.unresolved}
            />
          ))}
          {/* 비어 있는 device 도 placeholder 탭으로 노출 — "Banner 1장 추가" 같은 액션 유도 */}
          {devicesData.filter(d => d.total === 0).map(d => (
            <DeviceTab
              key={`empty_${d.id}`}
              active={deviceTab === d.id}
              onClick={() => setDeviceTab(d.id)}
              icon={
                d.id === "mobile" ? <Smartphone className="w-3.5 h-3.5" /> :
                d.id === "banner" ? <Image2 className="w-3.5 h-3.5" /> :
                <Monitor className="w-3.5 h-3.5" />
              }
              label={d.label}
              count={0}
              color={d.color}
              muted
            />
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {project.images.length === 0 ? (
          <div className="max-w-2xl mx-auto rounded-xl border border-dashed border-white/10 bg-[#111118] p-12 text-center">
            <Upload className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-xs text-zinc-500 mb-3">이미지를 드래그해서 추가하거나</p>
            <button
              onClick={() => addFileRef.current?.click()}
              className="px-3 py-1.5 rounded-md bg-[#FD79A8]/10 hover:bg-[#FD79A8]/20 border border-[#FD79A8]/40 text-[#FD79A8] text-xs font-medium transition-colors"
            >
              파일 선택
            </button>
            <p className="text-[10px] text-zinc-600 mt-3">PC · Mobile · Banner 가 한 셋트 — 파일명/비율로 자동 분류됩니다.</p>
          </div>
        ) : visibleImages.length === 0 ? (
          <div className="max-w-2xl mx-auto rounded-xl border border-dashed border-white/10 bg-[#111118] p-12 text-center">
            {deviceTab === "mobile" ? <Smartphone className="w-8 h-8 text-zinc-600 mx-auto mb-3" /> :
             deviceTab === "banner" ? <Image2 className="w-8 h-8 text-zinc-600 mx-auto mb-3" /> :
             <Monitor className="w-8 h-8 text-zinc-600 mx-auto mb-3" />}
            <p className="text-xs text-zinc-500">
              아직 {activeDeviceData.label} 이미지가 없습니다.
            </p>
            <p className="text-[10px] text-zinc-600 mt-1.5">
              "이미지 추가" 또는 드래그하면 파일명/비율로 자동 분류됩니다.<br/>
              파일명에 <span className="font-mono text-zinc-400">banner</span> / <span className="font-mono text-zinc-400">mobile</span> / <span className="font-mono text-zinc-400">pc</span> 가 있으면 강제 지정.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            {visibleImages.map((im, idx) => (
              <ImageCard
                key={im.id}
                image={im}
                pageNumber={idx + 1}
                pageTotal={visibleImages.length}
                onSelect={() => onSelectImage(im.id)}
                onDelete={() => onDeleteImage(im.id)}
              />
            ))}
          </div>
        )}
      </div>

      {dragOver && (
        <div className="absolute inset-0 z-10 bg-[#FD79A8]/10 border-2 border-dashed border-[#FD79A8] flex items-center justify-center pointer-events-none">
          <div className="text-[#FD79A8] text-sm font-semibold flex items-center gap-2">
            <Upload className="w-5 h-5" />
            이미지를 놓으면 이 프로젝트에 추가
          </div>
        </div>
      )}

      {isUploading && (
        <div className="absolute bottom-4 right-4 px-3 py-2 rounded-md bg-[#16161F] border border-white/10 text-xs text-zinc-300 shadow-lg">
          업로드 중…
        </div>
      )}
    </main>
  );
}

function DeviceTab({ active, onClick, icon, label, count, color, complete, unresolved, muted }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors border-b-2 -mb-px"
      style={{
        color: active ? color : (muted ? "#52525b" : "#71717a"),
        borderColor: active ? color : "transparent",
        opacity: muted && !active ? 0.6 : 1,
      }}
      title={muted ? `${label} 이미지가 아직 없습니다` : undefined}
    >
      {icon}
      <span>{label}</span>
      <span className="text-[10px] font-normal opacity-70 tabular-nums">{count}</span>
      {complete && <Check className="w-3 h-3" style={{ color }} />}
      {!complete && unresolved > 0 && (
        <span className="text-[9px] font-bold px-1 py-0 rounded-sm bg-amber-500/20 text-amber-400">!{unresolved}</span>
      )}
    </button>
  );
}

// ─── 프로젝트 정보 패널 — 이름·작업자·공유폴더·설명 편집 ──────────
function ProjectInfoPanel({ project, onUpdate, currentUserName, onClose }) {
  const [name, setName] = useState(project.name || "");
  const [owner, setOwner] = useState(project.owner || "");
  const [sharedFolderUrl, setSharedFolderUrl] = useState(project.sharedFolderUrl || "");
  const [description, setDescription] = useState(project.description || "");
  const [dirty, setDirty] = useState(false);

  // 다른 프로젝트로 갈아탔을 때 폼 동기화.
  useEffect(() => {
    setName(project.name || "");
    setOwner(project.owner || "");
    setSharedFolderUrl(project.sharedFolderUrl || "");
    setDescription(project.description || "");
    setDirty(false);
  }, [project.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const mark = (setter) => (e) => { setter(e.target.value); setDirty(true); };
  const save = () => {
    onUpdate?.({
      name: name.trim() || project.name,
      owner: owner.trim(),
      sharedFolderUrl: sharedFolderUrl.trim(),
      description: description.trim(),
    });
    setDirty(false);
  };
  const fillCurrentUser = () => { if (currentUserName) { setOwner(currentUserName); setDirty(true); } };

  const createdLabel = project.createdAt
    ? new Date(project.createdAt).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" })
    : "—";

  return (
    <div className="shrink-0 px-6 py-3 border-b border-white/5 bg-[#0e0e14]">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
        <Field label="프로젝트 이름">
          <input
            value={name} onChange={mark(setName)}
            placeholder="예: 신작 게임 브랜드 사이트"
            className="w-full px-2 py-1.5 rounded-md bg-[#16161F] border border-white/10 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-[#FD79A8]/50"
          />
        </Field>
        <Field
          label="작업자"
          aside={currentUserName && owner !== currentUserName ? (
            <button onClick={fillCurrentUser} className="text-[9px] text-violet-400 hover:text-violet-300">내 이름</button>
          ) : null}
        >
          <input
            value={owner} onChange={mark(setOwner)}
            placeholder="디자이너 / 담당자"
            className="w-full px-2 py-1.5 rounded-md bg-[#16161F] border border-white/10 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-[#FD79A8]/50"
          />
        </Field>
        <Field
          label="공유 폴더"
          aside={sharedFolderUrl ? (
            <a href={sharedFolderUrl} target="_blank" rel="noreferrer" className="text-[9px] text-violet-400 hover:text-violet-300 flex items-center gap-0.5">
              열기 <ExternalLink className="w-2.5 h-2.5" />
            </a>
          ) : null}
        >
          <input
            value={sharedFolderUrl} onChange={mark(setSharedFolderUrl)}
            placeholder="https://drive.google.com/... 또는 \\\\share\\..."
            className="w-full px-2 py-1.5 rounded-md bg-[#16161F] border border-white/10 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-[#FD79A8]/50 font-mono"
          />
        </Field>
        <Field label="설명·비고">
          <input
            value={description} onChange={mark(setDescription)}
            placeholder="추가 메모 (선택)"
            className="w-full px-2 py-1.5 rounded-md bg-[#16161F] border border-white/10 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-[#FD79A8]/50"
          />
        </Field>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
        <span>생성 {createdLabel}{project.approvedAt ? ` · 컨펌 ${new Date(project.approvedAt).toLocaleDateString("ko-KR")}` : ""}</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={save}
            disabled={!dirty}
            className="px-2.5 py-1 rounded text-[10px] font-bold bg-[#FD79A8]/15 hover:bg-[#FD79A8]/25 border border-[#FD79A8]/40 text-[#FD79A8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            저장
          </button>
          <button onClick={onClose} className="px-2 py-1 rounded text-[10px] text-zinc-500 hover:text-zinc-300">닫기</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, aside, children }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
        {aside}
      </div>
      {children}
    </label>
  );
}

function ImageCard({ image, pageNumber, pageTotal, onSelect, onDelete }) {
  const [hov, setHov] = useState(false);
  const activeVersion = getActiveVersion(image);
  const url = activeVersion?.url;
  const notes = activeVersion?.notes || [];
  const confirmed = !!activeVersion?.confirmed;
  const versionCount = image.versions?.length || 1;
  const status = getPageStatus(image);
  const dot = STATUS_DOT[status];
  // device 별 비율 — PC 16:10 / Mobile 9:16 / Banner 16:5.
  const aspectClass = thumbAspectFor(image.device);
  // Mobile/Banner 는 잘림 없이 비율 그대로 보이도록 object-contain. PC 는 기존 cover 유지.
  const fitClass = image.device === "pc" ? "object-cover" : "object-contain";

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="rounded-lg border border-white/5 bg-[#16161F] hover:border-white/15 transition-colors cursor-pointer overflow-hidden"
    >
      <div className={`relative ${aspectClass} bg-[#0c0c0e] overflow-hidden`}>
        <img src={url} alt={image.name} className={`w-full h-full ${fitClass}`} />
        {/* 페이지 번호 + 상태 dot — 좌측 하단 */}
        {typeof pageNumber === "number" && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-mono font-semibold text-zinc-200 tabular-nums">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot.color }} title={dot.label} />
            {pageNumber}{pageTotal ? ` / ${pageTotal}` : ""}
          </div>
        )}
        {/* 버전 배지 — v2+ 일 때만 우측 하단 */}
        {versionCount > 1 && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-violet-600/80 backdrop-blur-sm text-[10px] font-bold text-white">
            v{versionCount}
          </div>
        )}
        {confirmed && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#0eb9b3]/90 text-[10px] font-bold text-white">
            <Check className="w-2.5 h-2.5" /> 컨펌
          </div>
        )}
        {(notes.length > 0) && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-medium text-[#FDCB6E]">
            노트 {notes.length}
          </div>
        )}
        {hov && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="absolute bottom-2 right-2 p-1.5 rounded-md bg-black/70 hover:bg-rose-500/80 text-white transition-colors"
            title="이미지 삭제"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
      <div className="px-2.5 py-2">
        <div className="text-[11px] text-zinc-300 truncate" title={image.name}>{image.name}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 새 프로젝트 모달
// ═══════════════════════════════════════════════════════════
function NewProjectModal({ onClose, onCreate, currentUserName, isUploading, initialFolderUrl = "" }) {
  const [name, setName] = useState("");
  const [owner, setOwner] = useState(currentUserName || "");
  const [sharedFolderUrl, setSharedFolderUrl] = useState(initialFolderUrl || "");
  const [folderAutoFilled, setFolderAutoFilled] = useState(false);
  const [description, setDescription] = useState("");
  const [game, setGame] = useState(GAMES_FOR_BRANDWEB[0]);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);
  const folderRef = useRef(null);

  // 미리보기 카운트 — Banner/Mobile/PC.
  const counts = useMemo(() => {
    const c = { pc: 0, mobile: 0, banner: 0 };
    for (const f of files) {
      const guess = guessDeviceFromName(f.name) || "pc"; // 비율 측정은 모달에서 생략, 기본 pc.
      c[guess] = (c[guess] || 0) + 1;
    }
    return c;
  }, [files]);

  // 파일들로부터 sharedFolderUrl 자동 추론 → 사용자가 직접 수정 안 했을 때만 채움.
  const tryAutoFillFolder = useCallback((incoming) => {
    const path = pickSharedFolderFromFiles(incoming, { game, year, section: 'brandweb' });
    if (!path) return;
    // 이미 사용자가 직접 입력했으면 유지. 자동 입력했던 케이스만 갱신.
    setSharedFolderUrl(prev => (!prev || folderAutoFilled) ? path : prev);
    setFolderAutoFilled(true);
  }, [game, year, folderAutoFilled]);

  const addFiles = (incoming) => {
    const next = Array.from(incoming || []).filter(f => f.type?.startsWith("image/"));
    if (!next.length) return;
    setFiles(prev => [...prev, ...next]);
    tryAutoFillFolder(next);
  };
  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));
  const submit = () => {
    if (!files.length) { alert("이미지를 1장 이상 선택하세요."); return; }
    onCreate(files, { name, owner, sharedFolderUrl, description });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl bg-[#111118] border border-white/10 shadow-2xl overflow-hidden"
      >
        <header className="shrink-0 px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-[#FD79A8]" />
            <h2 className="text-sm font-bold text-zinc-200">새 프로젝트</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">프로젝트 이름 <span className="text-zinc-600">(비우면 파일명에서 자동 추정)</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 브랜드 사이트 리뉴얼 2026"
              className="w-full px-3 py-2 rounded-md bg-[#0c0c0e] border border-white/10 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-[#FD79A8]/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">작업자</label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="디자이너 / 담당자"
                className="w-full px-3 py-2 rounded-md bg-[#0c0c0e] border border-white/10 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-[#FD79A8]/50"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">게임</label>
              <select
                value={game}
                onChange={(e) => { setGame(e.target.value); setFolderAutoFilled(false); }}
                className="w-full px-3 py-2 rounded-md bg-[#0c0c0e] border border-white/10 text-sm text-zinc-200 outline-none focus:border-[#FD79A8]/50"
              >
                {GAMES_FOR_BRANDWEB.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">연도</label>
              <input
                type="text"
                value={year}
                onChange={(e) => { setYear(e.target.value); setFolderAutoFilled(false); }}
                placeholder="2026"
                className="w-full px-3 py-2 rounded-md bg-[#0c0c0e] border border-white/10 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-[#FD79A8]/50 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
              공유 폴더 경로 <span className="text-zinc-600">(폴더 업로드 시 자동 채움 · 수정 가능)</span>
            </label>
            <input
              type="text"
              value={sharedFolderUrl}
              onChange={(e) => { setSharedFolderUrl(e.target.value); setFolderAutoFilled(false); }}
              placeholder={`\\\\ppc-file\\1.리니지\\${year || '2026'}\\브랜드웹\\20260325_아지트_1차\\03.디자인`}
              className="w-full px-3 py-2 rounded-md bg-[#0c0c0e] border border-white/10 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-[#FD79A8]/50 font-mono"
            />
            {folderAutoFilled && (
              <p className="mt-1 text-[10px] text-emerald-400/80 flex items-center gap-1">
                <Check className="w-3 h-3" /> 폴더에서 경로 자동 추출됨 — 필요하면 직접 수정하세요
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">설명·비고 <span className="text-zinc-600">(선택)</span></label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="예: 1차 시안 — 마케팅팀 컨펌 필요"
              className="w-full px-3 py-2 rounded-md bg-[#0c0c0e] border border-white/10 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-[#FD79A8]/50"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-medium text-zinc-400">이미지 <span className="text-zinc-600">(여러 장 · PC · Mobile · Banner 한 셋트)</span></label>
              <button
                type="button"
                onClick={() => folderRef.current?.click()}
                className="text-[10px] text-[#FD79A8] hover:text-[#FD79A8]/80 flex items-center gap-1"
                title="폴더 단위로 업로드 → 공유 폴더 경로 자동 추출"
              >
                <Folder className="w-3 h-3" /> 폴더로 추가
              </button>
            </div>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
              className={`rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${dragOver ? "border-[#FD79A8] bg-[#FD79A8]/10" : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"}`}
            >
              <Upload className="w-6 h-6 text-zinc-500 mx-auto mb-2" />
              <p className="text-xs text-zinc-400">
                <span className="text-[#FD79A8] font-medium">클릭</span> 또는 이미지를 끌어다 놓으세요
              </p>
              <p className="text-[10px] text-zinc-600 mt-1">
                파일명에 <span className="font-mono text-zinc-400">pc</span> · <span className="font-mono text-zinc-400">mobile</span> · <span className="font-mono text-zinc-400">banner</span> 가 있으면 자동 분류, 없으면 비율(세로형=mobile, 와이드 가로형=banner) 기준.
              </p>
              {files.length > 0 && (counts.pc + counts.mobile + counts.banner) > 0 && (
                <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-zinc-500">
                  {counts.pc > 0 && (<span className="flex items-center gap-1"><Monitor className="w-3 h-3 text-[#74B9FF]"/>PC {counts.pc}</span>)}
                  {counts.mobile > 0 && (<span className="flex items-center gap-1"><Smartphone className="w-3 h-3 text-[#FD79A8]"/>Mobile {counts.mobile}</span>)}
                  {counts.banner > 0 && (<span className="flex items-center gap-1"><Image2 className="w-3 h-3 text-[#FDCB6E]"/>Banner {counts.banner}</span>)}
                  <span className="text-zinc-700">· 파일명 기준 미리보기</span>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
            />
            {/* 폴더 picker — webkitdirectory 로 폴더 통째 선택. webkitRelativePath 로부터 경로 자동 추출. */}
            <input
              ref={folderRef}
              type="file"
              multiple
              webkitdirectory=""
              directory=""
              className="hidden"
              onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
            />
          </div>

          {files.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-zinc-400">선택된 이미지 {files.length}장</span>
                <button onClick={() => setFiles([])} className="text-[10px] text-zinc-500 hover:text-zinc-300">모두 제거</button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[200px] overflow-y-auto">
                {files.map((f, idx) => (
                  <div key={idx} className="relative aspect-square rounded bg-[#16161F] border border-white/5 overflow-hidden group">
                    <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeFile(idx)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/70 hover:bg-rose-500/80 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="제거"
                    >
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1 bg-gradient-to-t from-black/80 to-transparent text-[9px] text-zinc-300 truncate">
                      {f.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <footer className="shrink-0 px-5 py-3 border-t border-white/5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-3 py-1.5 rounded-md text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={submit}
            disabled={isUploading || files.length === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-[#FD79A8] hover:bg-[#FD79A8]/90 text-white text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isUploading ? "업로드 중…" : <><FolderPlus className="w-3.5 h-3.5" />프로젝트 생성</>}
          </button>
        </footer>
      </div>
    </div>
  );
}
