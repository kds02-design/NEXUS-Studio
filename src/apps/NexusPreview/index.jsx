// NEXUS Preview — 생성된 타이틀을 실제 플랫폼 목업 위에 배치·검수·출력 + 퀄리티 업.
// 상위 계층: 배치 미리보기 / 퀄리티 업.
// 배치: 카테고리 탭(프로모션/브랜드/배너) → 각 카테고리의 변형(PC/모바일·사이즈)을 동시 표시.
//   카드를 클릭하면 그 변형이 "편집 대상"이 되어 좌측 메뉴가 그것만 조절.
//   타이틀·검정배경제거·공통(전체 적용)은 상단 공유. 프리뷰 전용 콘텐츠 가이드 라인 지원.
// 화면 프리뷰는 DOM(transform + cqh), 다운로드는 canvas — 같은 비율 수식으로 "본 대로 출력".
import { useEffect, useRef, useState } from "react";
import { Download, Image as ImageIcon, Layers, Lock, Unlock, Eraser, ChevronDown, Save, FolderOpen, Loader2 } from "lucide-react";
import { useGlobal, useTheme } from "../../context/GlobalContext";
import { useAuth } from "../../context/AuthContext";
import { APP_MAP } from "../../config/apps";
import { subscribeToGameLogos } from "../../lib/gameLogos";
import {
  PLATFORM_TEMPLATES, PLATFORM_MAP, CATEGORIES, idsOfCategory,
  scrimToCss, bottomFadeToCss, vignetteToCss, radialDimToCss, SUB_FONT_OPTIONS,
} from "./constants/platformTemplates";
import { downloadPlatformPng, knockoutBlack } from "./services/compositor";
import { saveWork, workDocToSnapshot } from "./services/works";
import WorksPanel from "./components/WorksPanel";
import QualityEnhancer from "./components/QualityEnhancer";

const ACCENT = APP_MAP["nexus-preview"]?.color || "#22B8CF";
const SIZE_KEY = (id) => `nexus-preview:size:${id}`;
const DEFAULT_SCALE = 2;
const WEIGHTS = [300, 400, 500, 600, 700, 800];
const GUIDE_COLOR = "rgba(34,184,207,0.75)";
// 카드 프리뷰 공유 높이 — 브라우저 크기에 따라 늘어남(vh/vw clamp). 너비는 비율로 계산.
// 높이를 통일해 PC(가로)·모바일(세로)이 같은 높이로 균형 있게 보이게 함.
const PREVIEW_H = "clamp(320px, min(58vh, 40vw), 880px)";

const MODE_TABS = [
  { key: "placement", label: "배치 미리보기" },
  { key: "quality", label: "퀄리티 업" },
];

function loadLockedSizes() {
  const locked = {}, sizes = {};
  for (const p of PLATFORM_TEMPLATES) {
    try {
      const v = localStorage.getItem(SIZE_KEY(p.id));
      if (v != null) { const n = Number(v); if (Number.isFinite(n)) { locked[p.id] = true; sizes[p.id] = n; } }
    } catch { /* noop */ }
  }
  return { locked, sizes };
}

function readImageFile(file, cb) {
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = (e) => cb(e.target.result);
  reader.readAsDataURL(file);
}

export default function NexusPreview() {
  const T = useTheme();
  const { payload, clearPayload } = useGlobal();
  const { user } = useAuth();

  const [mode, setMode] = useState("placement");
  const [category, setCategory] = useState("promo");
  const [activeId, setActiveId] = useState(() => idsOfCategory("promo")[0]);
  const [showGuides, setShowGuides] = useState(true);

  // 전역(타이틀 자체)
  const [titleSrc, setTitleSrc] = useState(null);
  const [knockout, setKnockout] = useState(false);
  const [knockoutThreshold, setKnockoutThreshold] = useState(40);
  const [processedTitle, setProcessedTitle] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [globalScale, setGlobalScale] = useState(DEFAULT_SCALE);

  // 플랫폼별 설정
  const [settings, setSettings] = useState(() => {
    const ls = loadLockedSizes();
    const base = {};
    for (const p of PLATFORM_TEMPLATES) base[p.id] = {
      bgSrc: null, scale: ls.sizes[p.id] ?? DEFAULT_SCALE, locked: !!ls.locked[p.id],
      dim: 0, radialDim: 0, radialScale: 1, radialAspect: 1, radialSoftness: 0,
      vignette: 0.3, fadeColor: "#0A0A0F",
      subCopy: "", dateText: "", subFont: SUB_FONT_OPTIONS[0].css,
      subCopyColor: "#FFFFFF", dateColor: "#E6E6F0", subImageSrc: null, selectedGame: "",
      subOffset: 0, copyFontMul: 1, dateFontMul: 1,
      copyWeight: p.subSlot?.copyWeight ?? 600, dateWeight: p.subSlot?.dateWeight ?? 400,
    };
    return base;
  });

  const [logos, setLogos] = useState({});
  const [busy, setBusy] = useState(false);
  const [titleDragOver, setTitleDragOver] = useState(false);
  const [commonCopy, setCommonCopy] = useState("");
  const [commonDate, setCommonDate] = useState("");
  // 작업목록
  const [worksPanelOpen, setWorksPanelOpen] = useState(false);
  const [savingWork, setSavingWork] = useState(false);
  const [toast, setToast] = useState(null); // { msg, type:'info'|'error' }
  const showToast = (msg, type = 'info') => { setToast({ msg, type }); setTimeout(() => setToast(null), 2500); };

  const titleInputRef = useRef(null);
  const globalBgInputRef = useRef(null);
  const consumedRef = useRef(null);

  const patch = (id, p) => setSettings(prev => ({ ...prev, [id]: { ...prev[id], ...p } }));

  useEffect(() => {
    if (!payload || payload.target !== "nexus-preview" || !payload.timestamp) return;
    if (consumedRef.current === payload.timestamp) return;
    consumedRef.current = payload.timestamp;
    const url = payload.image?.url;
    (async () => { if (url) setTitleSrc(url); try { clearPayload(); } catch { /* noop */ } })();
  }, [payload, clearPayload]);

  useEffect(() => {
    const unsub = subscribeToGameLogos(
      (data) => setLogos(data || {}),
      (e) => console.warn("[NexusPreview] gameLogos subscribe failed", e),
    );
    return () => { try { unsub && unsub(); } catch { /* noop */ } };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!knockout || !titleSrc) { setProcessedTitle(null); setProcessing(false); return; }
      setProcessing(true);
      try { const res = await knockoutBlack(titleSrc, knockoutThreshold); if (!cancelled) setProcessedTitle(res); }
      catch { if (!cancelled) setProcessedTitle(null); }
      finally { if (!cancelled) setProcessing(false); }
    })();
    return () => { cancelled = true; };
  }, [knockout, knockoutThreshold, titleSrc]);

  const effectiveTitle = knockout ? (processedTitle || titleSrc) : titleSrc;

  const selectCategory = (key) => { setCategory(key); setActiveId(idsOfCategory(key)[0]); };

  const applyGlobalScale = (v) => {
    setGlobalScale(v);
    setSettings(prev => {
      const next = { ...prev };
      for (const p of PLATFORM_TEMPLATES) if (!next[p.id].locked) next[p.id] = { ...next[p.id], scale: v };
      return next;
    });
  };
  const setScale = (id, v) => setSettings(prev => {
    const cur = prev[id];
    if (cur.locked) { try { localStorage.setItem(SIZE_KEY(id), String(v)); } catch { /* noop */ } }
    return { ...prev, [id]: { ...cur, scale: v } };
  });
  const toggleLock = (id) => setSettings(prev => {
    const cur = prev[id]; const nextLocked = !cur.locked;
    try {
      if (nextLocked) localStorage.setItem(SIZE_KEY(id), String(cur.scale));
      else localStorage.removeItem(SIZE_KEY(id));
    } catch { /* noop */ }
    return { ...prev, [id]: { ...cur, locked: nextLocked } };
  });
  const applyGlobalBg = (file) => readImageFile(file, (src) => setSettings(prev => {
    const next = { ...prev };
    for (const p of PLATFORM_TEMPLATES) next[p.id] = { ...next[p.id], bgSrc: src };
    return next;
  }));
  const applyCommonField = (key, v) => setSettings(prev => {
    const next = { ...prev };
    for (const p of PLATFORM_TEMPLATES) if (p.subSlot) next[p.id] = { ...next[p.id], [key]: v };
    return next;
  });
  const setAllCopy = (v) => { setCommonCopy(v); applyCommonField("subCopy", v); };
  const setAllDate = (v) => { setCommonDate(v); applyCommonField("dateText", v); };

  const downloadOpts = (tpl) => {
    const s = settings[tpl.id];
    return {
      bgSrc: s.bgSrc, titleSrc: effectiveTitle, titleScale: s.scale,
      dim: s.dim, radialDim: s.radialDim,
      radialShape: { scale: s.radialScale, aspect: s.radialAspect, softness: s.radialSoftness },
      vignette: s.vignette, bottomFadeColor: s.fadeColor,
      subCopy: s.subCopy, dateText: s.dateText, subFont: s.subFont,
      subCopyColor: s.subCopyColor, dateColor: s.dateColor, subImageSrc: s.subImageSrc,
      subCopyFont: tpl.subSlot ? tpl.subSlot.copyFont * s.copyFontMul : undefined,
      subDateFont: tpl.subSlot ? tpl.subSlot.dateFont * s.dateFontMul : undefined,
      subCopyWeight: s.copyWeight, subDateWeight: s.dateWeight, subOffsetY: s.subOffset,
      logoSrc: tpl.logoSlot && s.selectedGame ? logos[s.selectedGame] : null,
    };
  };

  const shown = idsOfCategory(category).map(id => PLATFORM_MAP[id]);
  const activeTpl = PLATFORM_MAP[activeId];

  const handleDownloadAll = async () => {
    if (!effectiveTitle || busy) return;
    setBusy(true);
    try { for (const tpl of shown) await downloadPlatformPng(tpl, downloadOpts(tpl)); }
    catch (e) { console.error("[NexusPreview] download failed:", e); }
    finally { setBusy(false); }
  };

  // 현재 시안(설정 + 이미지) 을 작업목록에 저장 — 이미지는 Cloudinary 로 업로드 후 URL 만 Firestore 에.
  const handleSaveWork = async () => {
    if (savingWork) return;
    if (!user?.uid) { showToast("로그인이 필요합니다.", "error"); return; }
    const name = prompt("작업 이름을 입력하세요 (예: '신작 타이틀 A — 시안 1')", `시안 ${new Date().toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}`);
    if (name === null) return;
    setSavingWork(true);
    try {
      await saveWork(user.uid, {
        name, category, mode,
        globalScale, knockout, knockoutThreshold,
        commonCopy, commonDate,
        titleSrc, settings,
      });
      showToast("✅ 작업목록에 저장되었습니다.");
    } catch (e) {
      console.error("[NexusPreview] saveWork failed", e);
      showToast("저장 실패: " + (e.message || e.code || e), "error");
    } finally { setSavingWork(false); }
  };

  // 작업목록에서 항목 클릭 → 현재 상태에 통째로 덮어쓰기 (이미지 URL 그대로 표시).
  const handleRestoreWork = (workDoc) => {
    const snap = workDocToSnapshot(workDoc);
    if (!snap) return;
    setMode(snap.mode || "placement");
    setCategory(snap.category || "promo");
    setGlobalScale(snap.globalScale ?? DEFAULT_SCALE);
    setKnockout(!!snap.knockout);
    setKnockoutThreshold(Number(snap.knockoutThreshold) || 40);
    setCommonCopy(snap.commonCopy || "");
    setCommonDate(snap.commonDate || "");
    setTitleSrc(snap.titleSrc || null);
    setProcessedTitle(null); // titleSrc 가 바뀌면 effect 가 재처리
    // settings — 저장된 플랫폼만 덮어쓰고 누락된 것은 현재값 유지(스키마 진화 안전망).
    setSettings(prev => {
      const next = { ...prev };
      for (const [pid, s] of Object.entries(snap.settings || {})) {
        if (next[pid]) next[pid] = { ...next[pid], ...s };
      }
      // 첫 카테고리 카드를 활성으로 — 복원 후에도 좌측 컨트롤이 자연스럽게 활성 카드와 동기화.
      return next;
    });
    setActiveId(idsOfCategory(snap.category || "promo")[0]);
    showToast(`'${workDoc.name}' 불러옴`);
  };

  return (
    <div style={{
      display: "flex", height: "100%", background: T.bg, color: T.text,
      fontFamily: "'Noto Sans KR', sans-serif", overflow: "hidden",
    }}>
      {/* ── 좌측 컨트롤 패널 (배치 모드) ───────────────────── */}
      {mode === "placement" && (
      <div style={{
        width: 262, minWidth: 262, borderRight: `1px solid ${T.border}`,
        padding: "20px 16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12,
      }}>
        {/* 타이틀 (공유) — 강조 */}
        <Group T={T} title="① 타이틀 (공유)" accent>
          <div
            onClick={() => titleInputRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); setTitleDragOver(false); readImageFile(e.dataTransfer.files?.[0], setTitleSrc); }}
            onDragOver={(e) => { e.preventDefault(); setTitleDragOver(true); }}
            onDragLeave={() => setTitleDragOver(false)}
            style={{
              height: 168, borderRadius: 10, cursor: "pointer",
              border: `2px dashed ${titleDragOver ? ACCENT : `${ACCENT}88`}`,
              background: titleDragOver ? `${ACCENT}22` : "repeating-conic-gradient(#1a1a24 0% 25%, #14141c 0% 50%) 50% / 18px 18px",
              display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
            }}
          >
            {effectiveTitle ? (
              <img src={effectiveTitle} alt="title" style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain" }} />
            ) : (
              <div style={{ textAlign: "center", color: T.textMuted, pointerEvents: "none" }}>
                <ImageIcon size={30} color={ACCENT} style={{ opacity: 0.7, marginBottom: 8 }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>타이틀 이미지 업로드</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3 }}>드래그 또는 클릭 · PNG</div>
              </div>
            )}
          </div>
          <input ref={titleInputRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => readImageFile(e.target.files?.[0], setTitleSrc)} />
          {titleSrc && <button onClick={() => { setTitleSrc(null); setProcessedTitle(null); }} style={ghostMini(T)}>타이틀 제거</button>}
          <button onClick={() => setKnockout(v => !v)} style={{
            width: "100%", padding: "8px 12px", borderRadius: 8,
            border: `1px solid ${knockout ? ACCENT : T.border}`,
            background: knockout ? `${ACCENT}1C` : T.card, color: knockout ? ACCENT : T.textMuted,
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}><Eraser size={13} /> 검정 배경 제거 {knockout ? "ON" : "OFF"}</button>
          {knockout && (
            <>
              <div style={{ fontSize: 11, color: T.textMuted }}>임계값 · {knockoutThreshold}{processing ? " · 처리 중…" : ""}</div>
              <input type="range" min={0} max={120} step={2} value={knockoutThreshold}
                onChange={(e) => setKnockoutThreshold(Number(e.target.value))} style={sliderStyle} />
            </>
          )}
        </Group>

        {/* 공통 (전체 적용) */}
        <Group T={T} title="공통 (전체 적용)" defaultOpen={false}>
          <div style={{ fontSize: 11, color: T.textDim }}>기본 크기 · {Math.round(globalScale * 100)}%</div>
          <input type="range" min={0.5} max={3} step={0.05} value={globalScale}
            onChange={(e) => applyGlobalScale(Number(e.target.value))} style={{ ...sliderStyle, marginTop: 4 }} />
          <GhostButton T={T} onClick={() => globalBgInputRef.current?.click()}>
            <Layers size={13} /> 공통 배경 — 전체 적용
          </GhostButton>
          <input ref={globalBgInputRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => applyGlobalBg(e.target.files?.[0])} />
          <textarea value={commonCopy} onChange={(e) => setAllCopy(e.target.value)}
            placeholder="서브카피 (전체)" rows={2} style={{ ...taStyle(T), marginTop: 0 }} />
          <textarea value={commonDate} onChange={(e) => setAllDate(e.target.value)}
            placeholder="날짜 (전체)" rows={1} style={{ ...taStyle(T), marginTop: 0 }} />
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.textMuted, cursor: "pointer", marginTop: 2 }}>
            <input type="checkbox" checked={showGuides} onChange={(e) => setShowGuides(e.target.checked)} style={{ accentColor: ACCENT }} />
            가이드 라인 표시
          </label>
        </Group>

        {/* 활성 플랫폼 설정 */}
        {activeTpl && (
          <PlatformControls
            T={T} template={activeTpl} s={settings[activeId]} logos={logos}
            onPatch={(p) => patch(activeId, p)} onScale={(v) => setScale(activeId, v)} onToggleLock={() => toggleLock(activeId)}
          />
        )}

        <div style={{ flex: 1, minHeight: 8 }} />

        <button onClick={handleDownloadAll} disabled={!effectiveTitle || busy} style={{
          width: "100%", padding: "11px", borderRadius: 9, border: `1px solid ${ACCENT}55`,
          background: effectiveTitle && !busy ? `${ACCENT}1C` : T.card,
          color: effectiveTitle ? ACCENT : T.textDim, fontSize: 13, fontWeight: 600,
          cursor: effectiveTitle && !busy ? "pointer" : "not-allowed",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <Download size={14} /> {busy ? "내보내는 중..." : `이 카테고리 다운로드 (${shown.length}장)`}
        </button>
      </div>
      )}

      {/* ── 메인 영역 ────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* 상위 계층 모드 스위치 + 작업목록 액션 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 28px 0", flexShrink: 0 }}>
          {MODE_TABS.map(m => (
            <button key={m.key} onClick={() => setMode(m.key)} style={{
              padding: "9px 18px", borderRadius: 10, fontSize: 13.5, fontWeight: 700, cursor: "pointer",
              fontFamily: "'Teko', sans-serif", letterSpacing: "0.02em",
              border: `1px solid ${mode === m.key ? ACCENT : T.border}`,
              background: mode === m.key ? ACCENT : "transparent", color: mode === m.key ? "#fff" : T.textMuted,
            }}>{m.label}</button>
          ))}
          {/* 우측 끝 — 작업 저장 / 작업목록 */}
          <div style={{ flex: 1 }} />
          <button
            onClick={handleSaveWork}
            disabled={savingWork || !user?.uid}
            title={user?.uid ? "현재 시안(설정·이미지)을 작업목록에 저장" : "로그인하면 작업목록에 저장할 수 있습니다"}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
              border: `1px solid ${T.border}`, background: T.card,
              color: user?.uid ? T.text : T.textDim,
              cursor: savingWork || !user?.uid ? "not-allowed" : "pointer",
              opacity: savingWork ? 0.6 : 1,
            }}
          >
            {savingWork ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} 저장
          </button>
          <button
            onClick={() => setWorksPanelOpen(true)}
            title="저장된 작업 시안 열기"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
              border: `1px solid ${ACCENT}55`, background: `${ACCENT}14`, color: ACCENT, cursor: "pointer",
            }}
          >
            <FolderOpen size={13} /> 작업목록
          </button>
        </div>

        {/* 카테고리 탭 */}
        {mode === "placement" && (
          <div style={{ display: "flex", gap: 6, padding: "14px 28px 0", flexShrink: 0 }}>
            {CATEGORIES.map(c => (
              <button key={c.key} onClick={() => selectCategory(c.key)} style={{
                padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                border: `1px solid ${category === c.key ? ACCENT : T.border}`,
                background: category === c.key ? `${ACCENT}1C` : "transparent",
                color: category === c.key ? ACCENT : T.textMuted,
              }}>{c.label}</button>
            ))}
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px 28px" }}>
          {mode === "quality" ? (
            <QualityEnhancer T={T} accent={ACCENT} />
          ) : (
            <div style={{ display: "flex", flexWrap: category === "banner" ? "nowrap" : "wrap", gap: 20, alignItems: "flex-start" }}>
              {shown.map((tpl) => (
                <PlatformCard
                  key={tpl.id} T={T} template={tpl} titleSrc={effectiveTitle} settings={settings[tpl.id]}
                  active={activeId === tpl.id} showGuides={showGuides} fill={category === "banner"}
                  logoSrc={tpl.logoSlot && settings[tpl.id].selectedGame ? logos[settings[tpl.id].selectedGame] : null}
                  onSelect={() => setActiveId(tpl.id)}
                  onBg={(file) => readImageFile(file, (src) => patch(tpl.id, { bgSrc: src }))}
                  onDownload={() => downloadPlatformPng(tpl, downloadOpts(tpl))}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 작업목록 모달 */}
      <WorksPanel
        open={worksPanelOpen}
        onClose={() => setWorksPanelOpen(false)}
        uid={user?.uid || null}
        T={T}
        onRestore={handleRestoreWork}
      />

      {/* 토스트 — 저장/복원 알림 */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
          padding: "10px 18px", borderRadius: 999, zIndex: 10000,
          background: toast.type === "error" ? "rgba(244,63,94,0.95)" : "rgba(34,184,207,0.95)",
          color: "#fff", fontSize: 12, fontWeight: 700,
          boxShadow: "0 12px 28px rgba(0,0,0,0.4)", pointerEvents: "none",
        }}>{toast.msg}</div>
      )}
    </div>
  );
}

/* ── 플랫폼별 좌측 컨트롤 ──────────────────────────────── */
function PlatformControls({ T, template, s, logos, onPatch, onScale, onToggleLock }) {
  const bgRef = useRef(null);
  const subImgRef = useRef(null);
  const gameNames = Object.keys(logos);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Label T={T} style={{ color: ACCENT }}>{template.label} · {template.variant} 설정</Label>

      <Group T={T} title="타이틀 크기">
        <div style={{ fontSize: 11, color: T.textDim }}>크기 · {Math.round(s.scale * 100)}%</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onToggleLock} title={s.locked ? "고정 해제" : "현재 크기 고정"} style={{
            width: 30, height: 30, borderRadius: 7, flexShrink: 0,
            border: `1px solid ${s.locked ? ACCENT : T.border}`, background: s.locked ? `${ACCENT}1C` : "transparent",
            color: s.locked ? ACCENT : T.textMuted, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{s.locked ? <Lock size={13} /> : <Unlock size={13} />}</button>
          <input type="range" min={0.5} max={3} step={0.05} value={s.scale}
            onChange={(e) => onScale(Number(e.target.value))} style={{ flex: 1, accentColor: ACCENT }} />
        </div>
      </Group>

      <Group T={T} title="배경 · 딤">
        <GhostButton T={T} onClick={() => bgRef.current?.click()}>
          <ImageIcon size={13} /> {s.bgSrc ? "배경 교체" : "배경 업로드"}
        </GhostButton>
        <input ref={bgRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={(e) => readImageFile(e.target.files?.[0], (src) => onPatch({ bgSrc: src }))} />
        {s.bgSrc && <button onClick={() => onPatch({ bgSrc: null })} style={ghostMini(T)}>배경 제거</button>}
        <div style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>배경 딤 · {Math.round(s.dim * 100)}%</div>
        <input type="range" min={0} max={0.85} step={0.01} value={s.dim} onChange={(e) => onPatch({ dim: Number(e.target.value) })} style={{ ...sliderStyle, marginTop: 4 }} />
        <div style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>타이틀 뒤 원형 딤 · {Math.round(s.radialDim * 100)}%</div>
        <input type="range" min={0} max={0.92} step={0.01} value={s.radialDim} onChange={(e) => onPatch({ radialDim: Number(e.target.value) })} style={{ ...sliderStyle, marginTop: 4 }} />
        {s.radialDim > 0 && (
          <div style={{ marginTop: 8, paddingLeft: 10, borderLeft: `2px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 11, color: T.textDim }}>크기 · {Math.round(s.radialScale * 100)}%</div>
            <input type="range" min={0.3} max={2.5} step={0.05} value={s.radialScale} onChange={(e) => onPatch({ radialScale: Number(e.target.value) })} style={sliderStyle} />
            <div style={{ fontSize: 11, color: T.textDim }}>가로세로 · {s.radialAspect.toFixed(2)} {s.radialAspect > 1.02 ? "(가로 타원)" : s.radialAspect < 0.98 ? "(세로 타원)" : "(원)"}</div>
            <input type="range" min={0.4} max={3} step={0.05} value={s.radialAspect} onChange={(e) => onPatch({ radialAspect: Number(e.target.value) })} style={sliderStyle} />
            <div style={{ fontSize: 11, color: T.textDim }}>부드러움 · {Math.round(s.radialSoftness * 100)}%</div>
            <input type="range" min={0} max={0.85} step={0.01} value={s.radialSoftness} onChange={(e) => onPatch({ radialSoftness: Number(e.target.value) })} style={sliderStyle} />
          </div>
        )}
      </Group>

      {(template.bottomFade || template.vignette) && (
        <Group T={T} title="효과">
          {template.bottomFade && (
            <>
              <div style={{ fontSize: 11, color: T.textDim }}>하단 연결색</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="color" value={s.fadeColor} onChange={(e) => onPatch({ fadeColor: e.target.value })} style={swatchStyle(T)} />
                <span style={{ fontSize: 12, color: T.textMuted }}>{s.fadeColor}</span>
              </div>
            </>
          )}
          {template.vignette && (
            <>
              <div style={{ fontSize: 11, color: T.textDim }}>비네팅 · {Math.round(s.vignette * 100)}%</div>
              <input type="range" min={0} max={0.9} step={0.01} value={s.vignette} onChange={(e) => onPatch({ vignette: Number(e.target.value) })} style={{ ...sliderStyle, marginTop: 4 }} />
            </>
          )}
        </Group>
      )}

      {template.subSlot && (
        <Group T={T} title="서브카피 / 날짜">
          {s.subImageSrc ? (
            <>
              <div style={{ height: 60, borderRadius: 8, border: `1px solid ${T.border}`, background: "repeating-conic-gradient(#1a1a24 0% 25%, #14141c 0% 50%) 50% / 14px 14px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <img src={s.subImageSrc} alt="sub" style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain" }} />
              </div>
              <button onClick={() => onPatch({ subImageSrc: null })} style={ghostMini(T)}>이미지 제거 (텍스트로)</button>
            </>
          ) : (
            <>
              <textarea value={s.subCopy} onChange={(e) => onPatch({ subCopy: e.target.value })} placeholder="서브카피" rows={2} style={{ ...taStyle(T), marginTop: 0, fontFamily: s.subFont }} />
              <textarea value={s.dateText} onChange={(e) => onPatch({ dateText: e.target.value })} placeholder="날짜" rows={1} style={{ ...taStyle(T), marginTop: 0, fontFamily: s.subFont }} />
              <select value={s.subFont} onChange={(e) => onPatch({ subFont: e.target.value })} style={{ ...selectStyle(T), width: "100%" }}>
                {SUB_FONT_OPTIONS.map(f => <option key={f.label} value={f.css}>{f.label}</option>)}
              </select>
              <div style={{ display: "flex", gap: 12 }}>
                <ColorField T={T} label="카피" value={s.subCopyColor} onChange={(v) => onPatch({ subCopyColor: v })} />
                <ColorField T={T} label="날짜" value={s.dateColor} onChange={(v) => onPatch({ dateColor: v })} />
              </div>
              <div style={{ fontSize: 11, color: T.textDim }}>카피 크기 · {Math.round(s.copyFontMul * 100)}%</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="range" min={0.4} max={2} step={0.05} value={s.copyFontMul} onChange={(e) => onPatch({ copyFontMul: Number(e.target.value) })} style={{ flex: 1, accentColor: ACCENT }} />
                <select value={s.copyWeight} onChange={(e) => onPatch({ copyWeight: Number(e.target.value) })} style={selectStyle(T)}>{WEIGHTS.map(w => <option key={w} value={w}>{w}</option>)}</select>
              </div>
              <div style={{ fontSize: 11, color: T.textDim }}>날짜 크기 · {Math.round(s.dateFontMul * 100)}%</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="range" min={0.4} max={2} step={0.05} value={s.dateFontMul} onChange={(e) => onPatch({ dateFontMul: Number(e.target.value) })} style={{ flex: 1, accentColor: ACCENT }} />
                <select value={s.dateWeight} onChange={(e) => onPatch({ dateWeight: Number(e.target.value) })} style={selectStyle(T)}>{WEIGHTS.map(w => <option key={w} value={w}>{w}</option>)}</select>
              </div>
            </>
          )}
          <div style={{ fontSize: 11, color: T.textDim }}>타이틀↔카피 간격 · {s.subOffset > 0 ? "+" : ""}{Math.round(s.subOffset * 100)}</div>
          <input type="range" min={-0.2} max={0.3} step={0.005} value={s.subOffset} onChange={(e) => onPatch({ subOffset: Number(e.target.value) })} style={{ ...sliderStyle, marginTop: 4 }} />
          <GhostButton T={T} onClick={() => subImgRef.current?.click()}>
            <ImageIcon size={13} /> {s.subImageSrc ? "이미지 교체" : "이미지로 대체"}
          </GhostButton>
          <input ref={subImgRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => readImageFile(e.target.files?.[0], (src) => onPatch({ subImageSrc: src }))} />
        </Group>
      )}

      {template.logoSlot && (
        <Group T={T} title="게임 로고 (우측 상단)">
          {gameNames.length ? (
            <select value={s.selectedGame} onChange={(e) => onPatch({ selectedGame: e.target.value })} style={{ ...selectStyle(T), width: "100%" }}>
              <option value="">로고 없음</option>
              {gameNames.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          ) : (
            <div style={{ fontSize: 11, color: T.textDim }}>NexusAdmin → 게임 로고에서 먼저 등록</div>
          )}
        </Group>
      )}
    </div>
  );
}

/* ── 플랫폼 카드 (라이브 DOM 프리뷰) ───────────────────── */
function PlatformCard({ T, template, titleSrc, settings: s, active, showGuides, fill, logoSrc, onSelect, onBg, onDownload }) {
  const bgInputRef = useRef(null);
  const { cx, cy, maxW, maxH } = template.slot;
  const sub = template.subSlot;
  const lg = template.logoSlot;
  const hasSub = sub && (s.subImageSrc || s.subCopy.trim() || s.dateText.trim());
  // 공유 높이(PREVIEW_H)에 비율을 곱해 너비 산출 → 브라우저 크기에 따라 같이 커짐.
  // fill=true(배너): 한 줄에 균등 분배(flex), 너비 고정 대신 행을 채움.
  const cardW = `calc(${(template.width / template.height).toFixed(4)} * ${PREVIEW_H})`;
  const sizing = fill ? { flex: "1 1 0", minWidth: 0 } : { width: cardW, maxWidth: "100%", flexShrink: 1 };

  return (
    <div style={{
      ...sizing,
      borderRadius: 12, border: `1px solid ${active ? ACCENT : s.locked ? `${ACCENT}66` : T.border}`,
      boxShadow: active ? `0 0 0 1px ${ACCENT}` : "none",
      background: T.card, overflow: "hidden", display: "flex", flexDirection: "column",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: `1px solid ${T.border}` }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
            {template.label} <span style={{ color: ACCENT, fontWeight: 700 }}>· {template.variant}</span>
            {active && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: ACCENT, background: `${ACCENT}1C`, padding: "2px 6px", borderRadius: 4 }}>편집 중</span>}
          </div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{template.sub}</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <IconBtn T={T} title="배경 교체" onClick={() => bgInputRef.current?.click()}><ImageIcon size={14} /></IconBtn>
          <IconBtn T={T} title="PNG 다운로드" disabled={!titleSrc} onClick={onDownload}><Download size={14} /></IconBtn>
          <input ref={bgInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => onBg(e.target.files?.[0])} />
        </div>
      </div>

      <div onClick={onSelect} title="클릭하면 이 변형을 편집 대상으로 선택" style={{
        position: "relative", width: "100%", aspectRatio: `${template.width} / ${template.height}`,
        background: "#0c0c12", overflow: "hidden", containerType: "size", cursor: "pointer",
      }}>
        {s.bgSrc ? (
          <img src={s.bgSrc} alt="bg" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: T.textDim, fontSize: 12, background: "repeating-conic-gradient(#15151f 0% 25%, #101018 0% 50%) 50% / 28px 28px" }}>배경 없음</div>
        )}

        {s.dim > 0 && <div style={{ position: "absolute", inset: 0, background: "#000", opacity: s.dim }} />}
        <div style={{ position: "absolute", inset: 0, background: scrimToCss(template.scrim) }} />
        {template.bottomFade && <div style={{ position: "absolute", inset: 0, background: bottomFadeToCss(template.bottomFade, s.fadeColor) }} />}
        {template.vignette && <div style={{ position: "absolute", inset: 0, background: vignetteToCss(s.vignette) }} />}
        {s.radialDim > 0 && <div style={{ position: "absolute", inset: 0, background: radialDimToCss(template.slot, template, s.radialDim, { scale: s.radialScale, aspect: s.radialAspect, softness: s.radialSoftness }) }} />}

        {!titleSrc && (
          <div style={{ position: "absolute", left: `${(cx - maxW / 2) * 100}%`, top: `${(cy - maxH / 2) * 100}%`, width: `${maxW * 100}%`, height: `${maxH * 100}%`, border: `1px dashed ${ACCENT}77`, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: `${ACCENT}aa`, fontSize: 11 }}>타이틀 영역</div>
        )}

        {titleSrc && (
          <div style={{ position: "absolute", left: `${(cx - maxW / 2) * 100}%`, top: `${(cy - maxH / 2) * 100}%`, width: `${maxW * 100}%`, height: `${maxH * 100}%`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src={titleSrc} alt="title" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", transform: `scale(${s.scale})` }} />
          </div>
        )}

        {hasSub && (
          <div style={{
            position: "absolute", left: `${(sub.cx - sub.maxW / 2) * 100}%`, top: `${(sub.cy + s.subOffset) * 100}%`,
            width: `${sub.maxW * 100}%`, transform: "translateY(-50%)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: `${sub.gap * 100}cqh`,
            textAlign: "center", whiteSpace: "pre-wrap", wordBreak: "keep-all", fontFamily: s.subFont,
          }}>
            {s.subImageSrc ? (
              <div style={{ width: "100%", height: `${sub.imgMaxH * 100}cqh`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={s.subImageSrc} alt="sub" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              </div>
            ) : (
              <>
                {s.subCopy.trim() && <div style={{ fontSize: `${sub.copyFont * s.copyFontMul * 100}cqh`, fontWeight: s.copyWeight, color: s.subCopyColor, lineHeight: 1.3, textShadow: "0 1px 6px rgba(0,0,0,0.55)" }}>{s.subCopy}</div>}
                {s.dateText.trim() && <div style={{ fontSize: `${sub.dateFont * s.dateFontMul * 100}cqh`, fontWeight: s.dateWeight, color: s.dateColor, lineHeight: 1.4, textShadow: "0 1px 6px rgba(0,0,0,0.55)" }}>{s.dateText}</div>}
              </>
            )}
          </div>
        )}

        {lg && logoSrc && (
          <div style={{ position: "absolute", top: `${lg.pad * (template.width / template.height) * 100}%`, right: `${lg.pad * 100}%`, width: `${lg.maxW * 100}%`, height: `${lg.maxH * 100}%`, display: "flex", alignItems: "flex-start", justifyContent: "flex-end" }}>
            <img src={logoSrc} alt="logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          </div>
        )}

        {/* 콘텐츠 가이드 (프리뷰 전용) */}
        {showGuides && template.guides?.map((gw) => {
          const frac = gw / template.width;
          return (
            <div key={gw} style={{
              position: "absolute", top: 0, bottom: 0, left: `${(1 - frac) / 2 * 100}%`, width: `${frac * 100}%`,
              borderLeft: `1px dashed ${GUIDE_COLOR}`, borderRight: `1px dashed ${GUIDE_COLOR}`,
              pointerEvents: "none", zIndex: 6,
            }}>
              <span style={{ position: "absolute", top: 4, left: "50%", transform: "translateX(-50%)", fontSize: 10, color: "#fff", background: GUIDE_COLOR, padding: "1px 6px", borderRadius: 4, whiteSpace: "nowrap" }}>{gw}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── 소형 컴포넌트 / 스타일 ─────────────────────────────── */
const sliderStyle = { width: "100%", marginTop: 8, accentColor: ACCENT };

function Group({ T, title, children, defaultOpen = true, accent }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      flexShrink: 0, // 패널 flex 컬럼에서 내용이 길어도 압축돼 잘리지 않게 (타이틀 드롭존 보존)
      border: `1px solid ${accent ? ACCENT : T.border}`, borderRadius: 10, overflow: "hidden",
      background: accent ? `${ACCENT}12` : T.surface,
      boxShadow: accent ? `0 0 0 1px ${ACCENT}40` : "none",
    }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: accent ? `${ACCENT}14` : "transparent", border: "none", cursor: "pointer" }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: accent ? ACCENT : T.textMuted }}>{title}</span>
        <ChevronDown size={14} color={accent ? ACCENT : T.textMuted} style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform .15s" }} />
      </button>
      {open && <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>}
    </div>
  );
}

function Label({ T, children, style }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", ...style }}>{children}</div>;
}
function ColorField({ T, label, value, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.textMuted, cursor: "pointer" }}>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} style={swatchStyle(T)} /> {label}
    </label>
  );
}
function swatchStyle(T) {
  return { width: 28, height: 28, padding: 0, borderRadius: 6, border: `1px solid ${T.border}`, background: "transparent", cursor: "pointer" };
}
function selectStyle(T) {
  return { padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: T.text, fontSize: 12, outline: "none", cursor: "pointer" };
}
function taStyle(T) {
  return { width: "100%", marginTop: 8, padding: "9px 11px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: T.text, fontSize: 12, resize: "none", outline: "none", boxSizing: "border-box", lineHeight: 1.5 };
}
function ghostMini(T) {
  return { width: "100%", padding: "7px", borderRadius: 7, border: `1px solid ${T.border}`, background: "transparent", color: T.textMuted, fontSize: 11, cursor: "pointer" };
}
function GhostButton({ T, onClick, children }) {
  return (
    <button onClick={onClick} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px dashed ${T.border}`, background: T.card, color: T.textMuted, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>{children}</button>
  );
}
function IconBtn({ T, title, onClick, disabled, children }) {
  return (
    <button title={title} onClick={onClick} disabled={disabled} style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${T.border}`, background: "transparent", color: disabled ? T.textDim : T.textMuted, cursor: disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</button>
  );
}
