import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Clock, CheckCircle2, XCircle, PauseCircle, ListChecks,
  Upload, FolderPlus, Folder, ChevronLeft, X,
  Smartphone, Monitor, Trash2, Plus, Check,
} from "lucide-react";
import { useGlobal } from "../../context/GlobalContext";
import ReviewWorkspace from "./components/ReviewWorkspace";

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
// 1) 파일명 힌트 → 2) 이미지 비율 (h/w > 1.2 면 mobile).
function guessDeviceFromName(name) {
  const n = String(name || "").toLowerCase();
  if (/(^|[_\-\s])(m|mb|mob|mobile|모바일)([_\-\s.]|$)/.test(n)) return "mobile";
  if (/(^|[_\-\s])(pc|desktop|web|데스크탑)([_\-\s.]|$)/.test(n)) return "pc";
  return null;
}

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

async function fileToImage(file, idx) {
  const url = await loadImageDataURL(file);
  let device = guessDeviceFromName(file.name);
  if (!device) {
    const { w, h } = await measureImage(url);
    device = (w > 0 && h > 0 && h / w > 1.2) ? "mobile" : "pc";
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
  const { payload, clearPayload } = useGlobal();
  const [activeMenu, setActiveMenu] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ─── 핵심 상태 ─────────────────────────────────────────────
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [activeImageId, setActiveImageId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);

  // mount 시 localStorage 복원 + 레거시 이미지 마이그레이션.
  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const migrated = parsed.map(p => ({
            ...p,
            images: (p.images || []).map(migrateImage),
          }));
          setProjects(migrated);
        }
      }
    } catch (e) {
      console.warn("[BrandWebReview] restore failed", e);
    }
  }, []);

  // 영속화 — projects 변경 시 자동 저장. 별도 effect 로 분리해서 setState 와 분리.
  const persist = useCallback((next) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
    catch (e) { console.warn("[BrandWebReview] save failed (localStorage quota?)", e); }
  }, []);
  const updateProjects = useCallback((updater) => {
    setProjects(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist(next);
      return next;
    });
  }, [persist]);

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
      const device = (w > 0 && h > 0 && h / w > 1.2) ? "mobile" : "pc";
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
      };
      updateProjects(prev => [proj, ...prev]);
      setActiveProjectId(proj.id);
      setActiveImageId(newImage.id);
      clearPayload?.();
    });
  }, [incoming, updateProjects, clearPayload]);

  // ─── 파일 → 프로젝트 / 이미지 ─────────────────────────────
  const createProjectFromFiles = useCallback(async (files, customName) => {
    const list = Array.from(files || []).filter(f => f.type?.startsWith("image/"));
    if (!list.length) return;
    setIsUploading(true);
    try {
      const images = [];
      for (let i = 0; i < list.length; i++) {
        images.push(await fileToImage(list[i], i));
      }
      const proj = {
        id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: (customName?.trim() || inferProjectName(list)),
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
  }, [updateProjects]);

  const addImagesToProject = useCallback(async (projectId, files) => {
    const list = Array.from(files || []).filter(f => f.type?.startsWith("image/"));
    if (!list.length) return;
    setIsUploading(true);
    try {
      const baseIdx = projects.find(p => p.id === projectId)?.images?.length || 0;
      const newImages = [];
      for (let i = 0; i < list.length; i++) {
        newImages.push(await fileToImage(list[i], baseIdx + i));
      }
      updateProjects(prev => prev.map(p =>
        p.id === projectId ? { ...p, images: [...p.images, ...newImages] } : p
      ));
    } finally {
      setIsUploading(false);
    }
  }, [projects, updateProjects]);

  // ─── 노트 / 컨펌 / 삭제 / 상태 변경 ────────────────────────
  // 활성 버전의 notes 만 갱신.
  const handleNotesChange = useCallback((nextNotes) => {
    if (!activeProjectId || !activeImageId) return;
    updateProjects(prev => prev.map(p => {
      if (p.id !== activeProjectId) return p;
      return {
        ...p,
        images: p.images.map(im => {
          if (im.id !== activeImageId) return im;
          return {
            ...im,
            versions: im.versions.map(v => v.id === im.activeVersionId ? { ...v, notes: nextNotes } : v),
          };
        }),
      };
    }));
  }, [activeProjectId, activeImageId, updateProjects]);

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

  // 같은 이미지(페이지)에 새 버전 추가. 자동으로 새 버전이 active.
  const addImageVersion = useCallback(async (file) => {
    if (!activeProjectId || !activeImageId || !file) return;
    const url = await loadImageDataURL(file);
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
  }, [activeProjectId, activeImageId, updateProjects]);

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
          isUploading={isUploading}
        />
      )}
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
        <div className="text-sm font-semibold text-zinc-200 truncate mb-1.5">{project.name}</div>
        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
          {pcCount > 0 && (<span className="flex items-center gap-1"><Monitor className="w-3 h-3"/>{pcCount}</span>)}
          {mobileCount > 0 && (<span className="flex items-center gap-1"><Smartphone className="w-3 h-3"/>{mobileCount}</span>)}
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
function ProjectDetailView({ project, onBack, onSelectImage, onAddImages, onDeleteImage, onDeleteProject, onSetStatus, isUploading }) {
  const addFileRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const pcImages = project.images.filter(im => im.device === "pc");
  const mobileImages = project.images.filter(im => im.device === "mobile");

  // PC/Mobile 탭 — 둘 다 있으면 둘 다 표시, 하나만 있으면 그쪽 default.
  const [deviceTab, setDeviceTab] = useState(
    pcImages.length === 0 && mobileImages.length > 0 ? "mobile" : "pc"
  );

  // 새 이미지 추가 시 — 마지막으로 들어온 이미지의 device 로 자동 탭 전환.
  const prevCountRef = useRef(project.images.length);
  useEffect(() => {
    const currCount = project.images.length;
    if (currCount > prevCountRef.current) {
      const added = project.images.slice(prevCountRef.current);
      const last = added[added.length - 1];
      if (last?.device === "mobile") setDeviceTab("mobile");
      else if (last?.device === "pc") setDeviceTab("pc");
    }
    prevCountRef.current = currCount;
  }, [project.images]);

  const visibleImages = deviceTab === "mobile" ? mobileImages : pcImages;

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
          <span className="text-[11px] text-zinc-500 shrink-0">· {project.images.length}장</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
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
          <button onClick={onDeleteProject} className="p-1.5 rounded hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors" title="프로젝트 삭제">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* PC/Mobile 탭 — 이미지가 1장 이상일 때만 노출. */}
      {project.images.length > 0 && (
        <div className="shrink-0 px-6 pt-3 border-b border-white/5 flex items-center gap-1">
          <DeviceTab
            active={deviceTab === "pc"}
            onClick={() => setDeviceTab("pc")}
            icon={<Monitor className="w-3.5 h-3.5" />}
            label="PC"
            count={pcImages.length}
            color="#74B9FF"
          />
          <DeviceTab
            active={deviceTab === "mobile"}
            onClick={() => setDeviceTab("mobile")}
            icon={<Smartphone className="w-3.5 h-3.5" />}
            label="Mobile"
            count={mobileImages.length}
            color="#FD79A8"
          />
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
          </div>
        ) : visibleImages.length === 0 ? (
          <div className="max-w-2xl mx-auto rounded-xl border border-dashed border-white/10 bg-[#111118] p-12 text-center">
            {deviceTab === "mobile" ? <Smartphone className="w-8 h-8 text-zinc-600 mx-auto mb-3" /> : <Monitor className="w-8 h-8 text-zinc-600 mx-auto mb-3" />}
            <p className="text-xs text-zinc-500">
              아직 {deviceTab === "mobile" ? "모바일" : "PC"} 이미지가 없습니다.
            </p>
            <p className="text-[10px] text-zinc-600 mt-1.5">
              이미지를 드래그하면 파일명/비율에 따라 자동 분류됩니다.
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

function DeviceTab({ active, onClick, icon, label, count, color }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors border-b-2 -mb-px"
      style={{
        color: active ? color : "#71717a",
        borderColor: active ? color : "transparent",
      }}
    >
      {icon}
      <span>{label}</span>
      <span className="text-[10px] font-normal opacity-70 tabular-nums">{count}</span>
    </button>
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

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="rounded-lg border border-white/5 bg-[#16161F] hover:border-white/15 transition-colors cursor-pointer overflow-hidden"
    >
      <div className="relative aspect-[16/10] bg-[#0c0c0e] overflow-hidden">
        <img src={url} alt={image.name} className="w-full h-full object-cover" />
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
function NewProjectModal({ onClose, onCreate, isUploading }) {
  const [name, setName] = useState("");
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const addFiles = (incoming) => {
    const next = Array.from(incoming || []).filter(f => f.type?.startsWith("image/"));
    if (!next.length) return;
    setFiles(prev => [...prev, ...next]);
  };
  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));
  const submit = () => {
    if (!files.length) { alert("이미지를 1장 이상 선택하세요."); return; }
    onCreate(files, name);
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

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">이미지 <span className="text-zinc-600">(여러 장 선택 가능 · PC/모바일 자동 분류)</span></label>
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
              <p className="text-[10px] text-zinc-600 mt-1">파일명에 "mobile" / "m_" / "pc" 등이 있으면 자동 분류, 없으면 비율 기준</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*"
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
