import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, AlertTriangle, CheckCircle2,
  BookOpen, Clock3, Database, Download, FileJson2, FileText, FolderOpen,
  GitBranch, Network, Plus, RotateCcw, Save, Split, TimerReset, Trash2,
  Upload, Wrench, X, Zap,
} from "lucide-react";
import { APP_MAP } from "../../config/apps";
import { useTheme } from "../../context/GlobalContext";
import { IMAGEN_MODELS } from "../../lib/imagenRender";
import { PRESET_GROUPS as MATRIX_PRESET_GROUPS } from "../RenderMatrix/constants/presets";
import { PRESET_GROUPS as POP_PRESET_GROUPS } from "../RenderMatrixPop/constants/presets";
import { cloneDefaultModel, loadModel, normalizeModel, saveModel, scoreRun } from "./model";
import { optionLabel, STAGE_SETTING_SCHEMAS } from "./settingSchemas";

const APP = APP_MAP["skill-control"];
const ACCENT = APP?.color || "#FFB84D";
const TABS = [
  { id: "overview", label: "운영 현황", icon: Activity },
  { id: "workflow", label: "실행 순서", icon: Network },
  { id: "skills", label: "스킬 트리", icon: GitBranch },
  { id: "documents", label: "스킬 문서", icon: BookOpen },
  { id: "runs", label: "실행 분석", icon: TimerReset },
  { id: "improvements", label: "개선 백로그", icon: Wrench },
  { id: "changes", label: "변경 이력", icon: Database },
];

const STATUS = {
  on: { label: "ON", color: "#34D399" }, auto: { label: "AUTO", color: "#60A5FA" },
  option: { label: "OPTION", color: "#A78BFA" }, off: { label: "OFF", color: "#94A3B8" },
  open: { label: "OPEN", color: "#FB7185" }, doing: { label: "DOING", color: "#FBBF24" },
  done: { label: "DONE", color: "#34D399" },
};

const TITLE_RENDER_PROVIDERS = [
  { id: "nexus-google", label: "Nexus Google API", note: "보호 경로 /api/codex-imagen" },
  { id: "gpt-image", label: "GPT Image 렌더", note: "Codex imagegen 경로" },
];
const GPT_IMAGE_MODELS = [{ id: "gpt-image-tool", label: "GPT Image · 현재 도구 관리", desc: "모델 버전은 Codex 렌더 도구가 관리" }];
const MATRIX_SOURCES = [
  { id: "render-metrics", label: "Render Matrix" },
  { id: "render-matrix-pop", label: "Render Matrix: Pop" },
];
const TITLE_INTENSITIES = [
  { id: "T1", label: "T1 · 절제" },
  { id: "T2", label: "T2 · 균형 (기본)" },
  { id: "T3", label: "T3 · 강조" },
];
const ALPHA_ROUTES = [
  { id: "nexus-mask-forge", label: "Nexus Mask Forge · Remove AI" },
  { id: "title-lock", label: "로컬 Title Lock · 승인 형태 마스크" },
];

const makeId = (prefix = "id") => `${prefix}-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10)}`;
const recordChange = (next, summary, impact = []) => ({ ...next, changes: [{ id: makeId("change"), at: new Date().toISOString(), summary, impact }, ...(next.changes || [])].slice(0, 100) });
const createRun = (campaign, stages) => ({ id: makeId("run"), campaign, game: "", sample: false, status: "active", createdAt: new Date().toISOString(), stages: stages.map((stage) => ({ stageId: stage.id, active: 0, wait: 0, attempts: 1, gate: "pending" })) });

function Button({ children, onClick, icon: Icon, tone = "default", disabled, title, type = "button" }) {
  const T = useTheme();
  const colors = tone === "accent"
    ? { color: "#171717", background: ACCENT, border: ACCENT }
    : tone === "danger"
      ? { color: "#FB7185", background: "rgba(251,113,133,.08)", border: "rgba(251,113,133,.32)" }
      : { color: T.text, background: T.hoverBg, border: T.border };
  return <button type={type} onClick={onClick} disabled={disabled} title={title} style={{ ...colors, minHeight: 34, padding: "0 12px", borderRadius: 9, border: `1px solid ${colors.border}`, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, fontSize: 11, fontWeight: 800, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .45 : 1 }}>
    {Icon && <Icon size={13}/>} {children}
  </button>;
}

function Pill({ value, color }) {
  const cfg = STATUS[value] || { label: String(value || "-"), color: color || "#94A3B8" };
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 7px", borderRadius: 99, fontSize: 9, fontWeight: 900, color: color || cfg.color, background: `${color || cfg.color}16`, border: `1px solid ${color || cfg.color}40`, letterSpacing: ".04em" }}><span style={{ width: 5, height: 5, borderRadius: 99, background: color || cfg.color }}/>{cfg.label}</span>;
}

function MetricCard({ label, value, note, icon: Icon, color = ACCENT }) {
  const T = useTheme();
  return <div style={{ minWidth: 0, padding: 16, borderRadius: 14, border: `1px solid ${T.border}`, background: T.surface, boxShadow: "inset 0 1px 0 rgba(255,255,255,.05)" }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, color: T.textMuted, fontSize: 10, fontWeight: 800 }}><span>{label}</span><Icon size={15} color={color}/></div>
    <div style={{ marginTop: 9, fontSize: 24, lineHeight: 1, fontWeight: 900, color: T.text, letterSpacing: "-.03em" }}>{value}</div>
    <div style={{ marginTop: 7, color: T.textDim, fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{note}</div>
  </div>;
}

function SectionTitle({ eyebrow, title, note, action }) {
  const T = useTheme();
  return <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 18, marginBottom: 14 }}>
    <div><div style={{ color: ACCENT, fontSize: 9, fontWeight: 900, letterSpacing: ".14em", textTransform: "uppercase" }}>{eyebrow}</div><div style={{ color: T.text, fontSize: 18, fontWeight: 900, marginTop: 4, letterSpacing: "-.02em" }}>{title}</div>{note && <div style={{ color: T.textMuted, fontSize: 11, marginTop: 5, lineHeight: 1.5 }}>{note}</div>}</div>
    {action}
  </div>;
}

function StageCard({ stage, selected, onClick, bottleneck }) {
  const T = useTheme();
  const lockColor = stage.lock === "locked" ? "#FB7185" : stage.lock === "controlled" ? "#FBBF24" : "#34D399";
  return <button onClick={onClick} style={{ minWidth: 0, textAlign: "left", padding: 13, borderRadius: 13, border: `1px solid ${selected ? ACCENT : bottleneck ? "rgba(251,113,133,.55)" : T.border}`, background: selected ? `${ACCENT}14` : bottleneck ? "rgba(251,113,133,.07)" : T.surface, color: T.text, cursor: "pointer", position: "relative" }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><span style={{ color: selected ? ACCENT : T.textMuted, fontSize: 10, fontWeight: 900 }}>{String(stage.order).padStart(2, "0")}</span><span style={{ width: 7, height: 7, borderRadius: 99, background: stage.enabled ? "#34D399" : T.textDim }}/></div>
    <div style={{ marginTop: 11, fontSize: 12, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{stage.label}</div>
    <div style={{ marginTop: 6, minHeight: 30, color: T.textMuted, fontSize: 9.5, lineHeight: 1.45 }}>{stage.skills.slice(0, 2).join(" · ")}{stage.skills.length > 2 ? ` +${stage.skills.length - 2}` : ""}</div>
    <div style={{ marginTop: 9, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 5 }}><span style={{ fontSize: 8.5, fontWeight: 900, color: lockColor }}>{stage.lock.toUpperCase()}</span>{bottleneck && <Pill value="병목" color="#FB7185"/>}</div>
  </button>;
}

function Modal({ title, children, onClose }) {
  const T = useTheme();
  return <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 9000, display: "grid", placeItems: "center", padding: 18, background: "rgba(0,0,0,.58)", backdropFilter: "blur(6px)" }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div style={{ width: "min(560px, 100%)", maxHeight: "84vh", overflow: "auto", padding: 20, borderRadius: 16, border: `1px solid ${T.border}`, background: T.bg, boxShadow: "0 28px 90px rgba(0,0,0,.55)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}><strong style={{ color: T.text, fontSize: 15 }}>{title}</strong><button aria-label="닫기" onClick={onClose} style={{ width: 30, height: 30, border: 0, borderRadius: 8, background: T.hoverBg, color: T.textMuted, display: "grid", placeItems: "center", cursor: "pointer" }}><X size={14}/></button></div>
      {children}
    </div>
  </div>;
}

function Field({ label, children, hint }) {
  const T = useTheme();
  return <label style={{ display: "grid", gap: 6, marginBottom: 13 }}><span style={{ color: T.textMuted, fontSize: 10, fontWeight: 800 }}>{label}</span>{children}{hint && <span style={{ color: T.textDim, fontSize: 9.5 }}>{hint}</span>}</label>;
}

function SkillForm({ parent, stages, onSubmit, onClose }) {
  const T = useTheme();
  const [id, setId] = useState(""); const [name, setName] = useState(""); const [description, setDescription] = useState("");
  const inputStyle = { width: "100%", minHeight: 38, borderRadius: 9, border: `1px solid ${T.border}`, background: T.surface, color: T.text, padding: "8px 10px", fontSize: 11, outline: 0 };
  const submit = (e) => { e.preventDefault(); const clean = id.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-"); if (!clean || !name.trim()) return; onSubmit({ id: clean, name: name.trim(), mode: "auto", kind: parent ? "subskill" : "specialist", parentId: parent?.id || null, stages: parent?.stages || [stages[0]?.id].filter(Boolean), description: description.trim() || "새 스킬 설명을 입력하세요.", capabilities: [], outputs: [] }); };
  return <form onSubmit={submit}>
    {parent && <div style={{ marginBottom: 14, padding: 10, borderRadius: 9, color: T.textMuted, background: T.hoverBg, fontSize: 10.5 }}>부모 스킬: <strong style={{ color: ACCENT }}>{parent.name}</strong></div>}
    <Field label="스킬 ID" hint="영문 소문자와 하이픈을 권장합니다."><input value={id} onChange={(e) => setId(e.target.value)} style={inputStyle} placeholder="background-quality-up" autoFocus/></Field>
    <Field label="표시 이름"><input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="Background Quality Up"/></Field>
    <Field label="기능 설명"><textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, minHeight: 92, resize: "vertical" }} placeholder="입력, 책임, 출력 경계를 설명하세요."/></Field>
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><Button onClick={onClose}>취소</Button><Button type="submit" tone="accent" icon={Plus}>{parent ? "하위 스킬 추가" : "스킬 추가"}</Button></div>
  </form>;
}

export default function SkillControl() {
  const T = useTheme();
  const [model, setModel] = useState(loadModel);
  const [tab, setTab] = useState("overview");
  const [stageId, setStageId] = useState(model.stages[0]?.id);
  const [skillId, setSkillId] = useState(model.skills[0]?.id);
  const [runId, setRunId] = useState(model.runs[0]?.id);
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState("");
  const [catalog, setCatalog] = useState(null);
  const [catalogSkillId, setCatalogSkillId] = useState("");
  const [catalogFilePath, setCatalogFilePath] = useState("");
  const [documentText, setDocumentText] = useState("");
  const [documentSearch, setDocumentSearch] = useState("");
  const importRef = useRef(null);

  const stages = useMemo(() => [...model.stages].sort((a, b) => a.order - b.order), [model.stages]);
  const selectedStage = stages.find((s) => s.id === stageId) || stages[0];
  const selectedSkill = model.skills.find((s) => s.id === skillId) || model.skills[0];
  const selectedRun = model.runs.find((r) => r.id === runId) || model.runs[0];
  const scores = useMemo(() => scoreRun(selectedRun), [selectedRun]);
  const bottleneck = scores[0];
  const totalActive = selectedRun?.stages?.reduce((n, x) => n + Number(x.active || 0), 0) || 0;
  const totalWait = selectedRun?.stages?.reduce((n, x) => n + Number(x.wait || 0), 0) || 0;
  const selectedCatalogSkill = catalog?.skills?.find((skill) => skill.id === catalogSkillId) || catalog?.skills?.[0];
  const selectedCatalogFile = selectedCatalogSkill?.files?.find((file) => file.path === catalogFilePath) || selectedCatalogSkill?.files?.[0];

  useEffect(() => { try { saveModel(model); } catch {} }, [model]);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(""), 2400); return () => clearTimeout(t); }, [notice]);
  useEffect(() => {
    let active = true;
    fetch(`${import.meta.env.BASE_URL}skill-control/catalog.json`).then((response) => response.ok ? response.json() : Promise.reject()).then((data) => {
      if (!active) return;
      const firstSkill = data.skills?.[0]; const firstFile = firstSkill?.files?.find((file) => file.path === "SKILL.md") || firstSkill?.files?.[0];
      setCatalog(data); setCatalogSkillId(firstSkill?.id || ""); setCatalogFilePath(firstFile?.path || ""); setDocumentText(firstFile?.content || "");
    }).catch(() => { if (active) setCatalog({ skills: [], error: true }); });
    return () => { active = false; };
  }, []);

  const mutate = (fn, summary, impact) => setModel((prev) => recordChange(fn(structuredClone(prev)), summary, impact));
  const selectStage = (id) => setStageId(id);
  const openCatalogFile = (skill, file) => {
    if (!skill || !file) return;
    const draft = model.documentDrafts?.[`${skill.id}:${file.path}`];
    setCatalogSkillId(skill.id); setCatalogFilePath(file.path); setDocumentText(draft?.content ?? file.content ?? "");
  };
  const openCatalogSkill = (skill) => {
    const file = skill?.files?.find((item) => item.path === "SKILL.md") || skill?.files?.[0];
    openCatalogFile(skill, file);
  };
  const saveDocumentDraft = () => {
    if (!selectedCatalogSkill || !selectedCatalogFile?.editable) return;
    const key = `${selectedCatalogSkill.id}:${selectedCatalogFile.path}`;
    mutate((next) => { next.documentDrafts ||= {}; next.documentDrafts[key] = { skillId: selectedCatalogSkill.id, path: selectedCatalogFile.path, content: documentText, sourceModifiedAt: selectedCatalogFile.modifiedAt, savedAt: new Date().toISOString(), applyMode: "review-required" }; return next; }, `${selectedCatalogSkill.koreanName} · ${selectedCatalogFile.path} 문서 초안 저장`, [selectedCatalogSkill.id]);
    setNotice("문서 수정 초안을 저장했습니다.");
  };

  const addSkill = (skill) => {
    if (model.skills.some((s) => s.id === skill.id)) { setNotice("같은 ID의 스킬이 있습니다."); return; }
    mutate((next) => { next.skills.push(skill); skill.stages.forEach((sid) => { const st = next.stages.find((s) => s.id === sid); if (st && !st.skills.includes(skill.id)) st.skills.push(skill.id); }); return next; }, `${skill.name} ${skill.parentId ? "분해" : "추가"}`, skill.stages);
    setSkillId(skill.id); setModal(null); setNotice("스킬 트리를 업데이트했습니다.");
  };

  const deleteSkill = () => {
    if (!selectedSkill || model.skills.some((s) => s.parentId === selectedSkill.id)) { setNotice("하위 스킬을 먼저 이동하거나 삭제해 주세요."); return; }
    if (!confirm(`${selectedSkill.name}을 트리에서 삭제할까요? 실제 스킬 파일은 변경되지 않습니다.`)) return;
    mutate((next) => { next.skills = next.skills.filter((s) => s.id !== selectedSkill.id); next.stages.forEach((s) => { s.skills = s.skills.filter((id) => id !== selectedSkill.id); }); return next; }, `${selectedSkill.name} 삭제`, selectedSkill.stages);
    setSkillId(model.skills.find((s) => s.id !== selectedSkill.id)?.id); setNotice("스킬을 삭제했습니다.");
  };

  const downloadModel = () => {
    const catalogSnapshot = catalog ? { generatedAt: catalog.generatedAt, source: catalog.source, skills: catalog.skills?.map((skill) => ({ id: skill.id, rootPath: skill.rootPath, files: skill.files?.map(({ path, kind, size, modifiedAt }) => ({ path, kind, size, modifiedAt })) })) } : null;
    const packageData = { ...model, skillCatalog: catalogSnapshot, exportedAt: new Date().toISOString(), applyMode: "review-required", note: "Codex가 원본을 다시 읽고 검증한 후 실제 SKILL.md·references·scripts에 반영해야 합니다." };
    const url = URL.createObjectURL(new Blob([JSON.stringify(packageData, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `nexus-skill-control-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url);
    setNotice("변경 패키지를 내보냈습니다.");
  };

  const importModel = (file) => {
    if (!file) return; const reader = new FileReader();
    reader.onload = () => { try { const parsed = normalizeModel(JSON.parse(String(reader.result || ""))); if (!Array.isArray(parsed.stages) || !Array.isArray(parsed.skills)) throw new Error(); setModel(recordChange(parsed, "외부 관리 패키지 가져오기", ["all"])); setStageId(parsed.stages[0]?.id); setSkillId(parsed.skills[0]?.id); setNotice("관리 패키지를 가져왔습니다."); } catch { setNotice("지원하지 않는 JSON입니다."); } };
    reader.readAsText(file);
  };

  const addRun = () => {
    const campaign = prompt("캠페인 이름을 입력하세요.", "새 배너 캠페인"); if (!campaign) return;
    const run = createRun(campaign, stages);
    mutate((next) => { next.runs.unshift(run); return next; }, `${campaign} 실행 기록 추가`, ["telemetry"]); setRunId(run.id); setNotice("실행 기록을 추가했습니다.");
  };

  const updateRunStage = (sid, key, value) => setModel((prev) => { const next = structuredClone(prev); const run = next.runs.find((r) => r.id === selectedRun.id); const item = run.stages.find((s) => s.stageId === sid); item[key] = key === "gate" ? value : Math.max(0, Number(value || 0)); return next; });
  const updateImprovement = (id, status) => setModel((prev) => { const next = structuredClone(prev); next.improvements.find((x) => x.id === id).status = status; return next; });
  const stageSchema = STAGE_SETTING_SCHEMAS[selectedStage?.id] || [];
  const titleSettings = selectedStage?.id === "04-title-render" ? selectedStage.settings : null;
  const matrixGroups = titleSettings?.matrixSource === "render-matrix-pop" ? POP_PRESET_GROUPS : MATRIX_PRESET_GROUPS;
  const selectedMatrixGroup = matrixGroups.find((group) => group.id === titleSettings?.matrixGroup) || matrixGroups[0];
  const selectedMatrixPreset = selectedMatrixGroup?.presets?.find((preset) => preset.id === titleSettings?.matrixPreset) || selectedMatrixGroup?.presets?.[0];
  const selectedTitleModel = [...IMAGEN_MODELS, ...GPT_IMAGE_MODELS].find((modelOption) => modelOption.id === titleSettings?.renderModel);
  const openStageChangeRequest = () => {
    const skill = catalog?.skills?.find((item) => selectedStage?.skills?.includes(item.id));
    setTab("documents");
    if (skill) openCatalogSkill(skill);
  };

  const renderOverview = () => <>
    <div className="sc-metrics"><MetricCard label="활성 단계" value={`${stages.filter((s) => s.enabled).length}/7`} note="단계 게이트 정상" icon={Network}/><MetricCard label="등록 스킬" value={model.skills.length} note={`하위 스킬 ${model.skills.filter((s) => s.parentId).length}개`} icon={GitBranch} color="#A78BFA"/><MetricCard label="실작업 / 대기" value={`${totalActive} / ${totalWait}m`} note={selectedRun?.sample ? "예시 실행 데이터" : selectedRun?.campaign || "실행 없음"} icon={Clock3} color="#60A5FA"/><MetricCard label="최대 병목" value={bottleneck ? String(stages.find((s) => s.id === bottleneck.stageId)?.order || "-").padStart(2, "0") : "-"} note={bottleneck ? `${stages.find((s) => s.id === bottleneck.stageId)?.label} · ${bottleneck.score}점` : "데이터 없음"} icon={AlertTriangle} color="#FB7185"/></div>
    <section className="sc-panel"><SectionTitle eyebrow="Workflow" title="7단계 실행 흐름" note="단계를 선택하면 게이트·설정·담당 스킬을 확인할 수 있습니다."/>
      <div className="sc-stage-grid">{stages.map((stage) => <StageCard key={stage.id} stage={stage} selected={stage.id === selectedStage?.id} onClick={() => selectStage(stage.id)} bottleneck={stage.id === bottleneck?.stageId}/>)}</div>
      {selectedStage && <div className="sc-detail"><div><span>선택 단계</span><strong>{selectedStage.label}</strong></div><div><span>게이트</span><strong>{selectedStage.gate}</strong></div><div><span>담당 스킬</span><strong>{selectedStage.skills.join(" · ")}</strong></div></div>}
    </section>
    <div className="sc-two"><section className="sc-panel"><SectionTitle eyebrow="Bottleneck" title="병목 상위 단계" note="Cycle·대기·재작업을 함께 반영합니다."/>{scores.slice(0, 5).map((item) => { const stage = stages.find((s) => s.id === item.stageId); return <div key={item.stageId} className="sc-bar-row"><span>{String(stage?.order || "-").padStart(2, "0")} {stage?.label}</span><div><i style={{ width: `${Math.max(4, item.score)}%` }}/></div><strong>{item.score}</strong></div>; })}</section>
      <section className="sc-panel"><SectionTitle eyebrow="Improvements" title="개선 필요 항목" note="영향도가 큰 항목부터 처리합니다."/>{model.improvements.slice(0, 4).map((item) => <button key={item.id} className="sc-improvement" onClick={() => setTab("improvements")}><Pill value={item.status}/><span><strong>{item.title}</strong><small>{item.action}</small></span><em>{item.priority}</em></button>)}</section></div>
  </>;

  const renderTitleRenderSettings = () => <>
    <div className="sc-current-summary">
      <div><span>렌더 경로</span><strong>{TITLE_RENDER_PROVIDERS.find((item) => item.id === titleSettings.renderProvider)?.label || titleSettings.renderProvider}</strong><small>{selectedTitleModel?.label || titleSettings.renderModel} · {titleSettings.renderSize}</small></div>
      <div><span>재질 프리셋</span><strong>{selectedMatrixPreset?.label || titleSettings.matrixPreset}</strong><small>{MATRIX_SOURCES.find((item) => item.id === titleSettings.matrixSource)?.label} · {selectedMatrixPreset?.styleId || selectedMatrixPreset?.id}</small></div>
      <div><span>형태·효과 정책</span><strong>{TITLE_INTENSITIES.find((item) => item.id === titleSettings.intensity)?.label || titleSettings.intensity}</strong><small>{titleSettings.editBudget} · 형태 보존 {titleSettings.shapePreserved ? "필수" : "확인 필요"}</small></div>
      <div><span>투명화</span><strong>{ALPHA_ROUTES.find((item) => item.id === titleSettings.alphaRoute)?.label || titleSettings.alphaRoute}</strong><small>{titleSettings.alphaQA === "required" ? "알파 QA 필수" : titleSettings.alphaQA}</small></div>
    </div>
    <div className="sc-preset-card"><div><strong>{selectedMatrixPreset?.label || "프리셋 없음"}</strong><small>Render Matrix에서 수정</small></div><p>{selectedMatrixPreset?.description}</p></div>
  </>;

  const renderWorkflow = () => <div className="sc-workspace"><section className="sc-panel"><SectionTitle eyebrow="Workflow Map" title="실행 순서" note="현재 적용 구조를 읽기 전용으로 보여줍니다. 실제 변경은 원본 스킬이나 해당 Nexus 앱에서 수행합니다."/>{stages.map((stage) => <button key={stage.id} className={`sc-list-row ${selectedStage?.id === stage.id ? "active" : ""}`} onClick={() => selectStage(stage.id)}><b>{String(stage.order).padStart(2, "0")}</b><span><strong>{stage.label}</strong><small>{stage.id}</small></span><Pill value={stage.enabled ? "on" : "off"}/><em>{stage.lock}</em></button>)}</section>
    <aside className="sc-panel sc-inspector"><SectionTitle eyebrow="현재 적용값" title={selectedStage?.label || "단계 선택"} action={<Button icon={FileText} onClick={openStageChangeRequest}>변경 제안 작성</Button>}/>{selectedStage && <><Field label="상태"><div className="sc-readonly">{selectedStage.enabled ? "활성" : "비활성"} · {selectedStage.lock === "locked" ? "잠금 단계" : "통제 단계"}</div></Field><Field label="통과 조건"><div className="sc-readonly">{selectedStage.gate}</div></Field><Field label="담당 스킬"><div className="sc-chip-wrap">{selectedStage.skills.map((skill) => <span key={skill}>{skill}</span>)}</div></Field>{titleSettings ? renderTitleRenderSettings() : <div className="sc-current-summary">{stageSchema.map((field) => <div key={field.key}><span>{field.label}</span><strong>{optionLabel(field, selectedStage.settings?.[field.key])}{field.suffix ? ` ${field.suffix}` : ""}</strong><small>{field.key}</small></div>)}</div>}<div className="sc-safe"><Zap size={13}/><span>이 화면의 값은 현황 확인용입니다. 이미지 향상은 Nexus Preview, 재질은 Render Matrix, 스킬 지침은 Codex에서 수정합니다.</span></div></>}</aside></div>;

  const roots = model.skills.filter((s) => !s.parentId);
  const renderSkillNode = (skill, depth = 0) => <div key={skill.id}><button className={`sc-skill-node ${selectedSkill?.id === skill.id ? "active" : ""}`} style={{ marginLeft: depth * 22, width: `calc(100% - ${depth * 22}px)` }} onClick={() => setSkillId(skill.id)}><Pill value={skill.mode}/><span><strong>{skill.name}</strong><small>{skill.id} · {skill.kind}</small></span><em>{skill.stages.map((id) => id.slice(0, 2)).join(" · ")}</em></button>{model.skills.filter((s) => s.parentId === skill.id).map((child) => renderSkillNode(child, depth + 1))}</div>;
  const renderSkills = () => <div className="sc-workspace"><section className="sc-panel"><SectionTitle eyebrow="Skill Architecture" title="스킬 트리" note="스킬을 추가하거나 선택한 스킬을 더 작은 책임으로 분해합니다." action={<Button tone="accent" icon={Plus} onClick={() => setModal("add")}>스킬 추가</Button>}/><div className="sc-tree">{roots.map((skill) => renderSkillNode(skill))}</div></section>
    <aside className="sc-panel sc-inspector"><SectionTitle eyebrow="Skill Detail" title={selectedSkill?.name || "스킬 선택"}/>{selectedSkill && <><div style={{ display: "flex", gap: 7, marginBottom: 15 }}><Pill value={selectedSkill.mode}/><Pill value={selectedSkill.kind} color="#A78BFA"/></div><p className="sc-description">{selectedSkill.description}</p><Field label="호출 단계"><div className="sc-chip-wrap">{selectedSkill.stages.map((id) => <span key={id}>{id.slice(0, 2)}</span>)}</div></Field><Field label="기능"><div className="sc-chip-wrap">{selectedSkill.capabilities.map((x) => <span key={x}>{x}</span>)}</div></Field><Field label="출력"><div className="sc-chip-wrap">{selectedSkill.outputs.map((x) => <span key={x}>{x}</span>)}</div></Field><div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}><Button tone="accent" icon={Split} onClick={() => setModal("split")}>하위 스킬로 분해</Button><Button tone="danger" icon={Trash2} onClick={deleteSkill}>삭제</Button></div><div className="sc-safe"><Zap size={13}/><span>대시보드 변경은 설계안입니다. 실제 스킬 파일은 내보낸 패키지를 Codex가 검증한 뒤 적용합니다.</span></div></>}</aside></div>;

  const filteredCatalogSkills = (catalog?.skills || []).filter((skill) => !documentSearch || `${skill.koreanName} ${skill.id} ${skill.description}`.toLowerCase().includes(documentSearch.toLowerCase()));
  const documentDraftKey = selectedCatalogSkill && selectedCatalogFile ? `${selectedCatalogSkill.id}:${selectedCatalogFile.path}` : "";
  const selectedDocumentDraft = model.documentDrafts?.[documentDraftKey];
  const renderDocuments = () => <div className="sc-doc-layout"><section className="sc-panel sc-doc-skills"><SectionTitle eyebrow="Installed Skills" title="실제 스킬 목록" note={catalog?.generatedAt ? `로컬 스킬 동기화 · ${new Date(catalog.generatedAt).toLocaleString("ko-KR")}` : "스킬 카탈로그를 불러오는 중입니다."}/><input className="sc-search" value={documentSearch} onChange={(event) => setDocumentSearch(event.target.value)} placeholder="스킬 이름·역할 검색"/>{filteredCatalogSkills.map((skill) => <button key={skill.id} className={`sc-doc-skill ${selectedCatalogSkill?.id === skill.id ? "active" : ""}`} onClick={() => openCatalogSkill(skill)}><span><strong>{skill.koreanName}</strong><small>{skill.id}{skill.virtual ? " · 내장 정책" : ""}</small></span><em>{skill.files?.length || 0}개</em></button>)}{catalog?.error && <div className="sc-empty"><AlertTriangle size={16}/>스킬 카탈로그를 생성한 뒤 다시 열어 주세요.</div>}</section>
    <section className="sc-panel sc-doc-files"><SectionTitle eyebrow="Files" title={selectedCatalogSkill?.koreanName || "문서 선택"} note={selectedCatalogSkill?.rootPath}/>{selectedCatalogSkill && <div className="sc-doc-summary"><span><b>{selectedCatalogSkill.counts?.지침 || 0}</b>지침</span><span><b>{selectedCatalogSkill.counts?.레퍼런스 || 0}</b>레퍼런스</span><span><b>{selectedCatalogSkill.counts?.스크립트 || 0}</b>스크립트</span><span><b>{selectedCatalogSkill.counts?.에셋 || 0}</b>에셋</span></div>}<div className="sc-file-list">{selectedCatalogSkill?.files?.map((file) => <button key={file.path} className={selectedCatalogFile?.path === file.path ? "active" : ""} onClick={() => openCatalogFile(selectedCatalogSkill, file)}><FileText size={12}/><span><strong>{file.path.split("/").at(-1)}</strong><small>{file.kind} · {(file.size / 1024).toFixed(1)}KB</small></span>{model.documentDrafts?.[`${selectedCatalogSkill.id}:${file.path}`] && <i>초안</i>}</button>)}</div></section>
    <section className="sc-panel sc-doc-editor"><SectionTitle eyebrow={selectedCatalogFile?.kind || "Document"} title={selectedCatalogFile?.path || "파일을 선택하세요"} note={selectedCatalogFile?.editable ? "원문은 외부에 복제하지 않습니다. 이곳에는 한글로 변경할 내용과 이유를 작성합니다." : "이미지·대용량 파일은 실제 메타데이터만 표시합니다."} action={selectedCatalogFile?.editable && <div className="sc-actions"><Button icon={RotateCcw} onClick={() => setDocumentText("")}>초안 비우기</Button><Button tone="accent" icon={Save} onClick={saveDocumentDraft}>변경 제안 저장</Button></div>}/>{selectedCatalogFile?.editable ? <textarea className="sc-document-editor" value={documentText} onChange={(event) => setDocumentText(event.target.value)} spellCheck={false} placeholder={`변경 목적\n- 무엇을 바꿀지\n- 적용할 실제 값 또는 순서\n- 영향을 받는 레퍼런스·스크립트\n- 검증 방법`}/> : <div className="sc-binary"><FolderOpen size={22}/><strong>{selectedCatalogFile?.path || "파일 없음"}</strong><span>원본 위치: {selectedCatalogSkill?.rootPath}</span></div>}{selectedDocumentDraft && <div className="sc-safe"><CheckCircle2 size={14}/><span>변경 제안 저장됨 · 실제 파일 반영은 변경 패키지 검토 후 진행됩니다.</span></div>}</section></div>;

  const renderRuns = () => <><section className="sc-panel"><SectionTitle eyebrow="Telemetry" title="캠페인 실행 분석" note="실작업·대기·시도 횟수를 분리해 병목을 찾습니다." action={<Button tone="accent" icon={Plus} onClick={addRun}>실행 추가</Button>}/><div className="sc-run-tabs">{model.runs.map((run) => <button key={run.id} className={run.id === selectedRun?.id ? "active" : ""} onClick={() => setRunId(run.id)}>{run.campaign}{run.sample && <small>예시</small>}</button>)}</div>{selectedRun && <div className="sc-table"><div className="sc-tr sc-th"><span>단계</span><span>실작업</span><span>대기</span><span>시도</span><span>게이트</span><span>병목</span></div>{stages.map((stage) => { const item = selectedRun.stages.find((x) => x.stageId === stage.id) || {}; const score = scores.find((x) => x.stageId === stage.id)?.score || 0; return <div className="sc-tr" key={stage.id}><span><b>{String(stage.order).padStart(2, "0")}</b> {stage.label}</span><input type="number" value={item.active || 0} onChange={(e) => updateRunStage(stage.id, "active", e.target.value)}/><input type="number" value={item.wait || 0} onChange={(e) => updateRunStage(stage.id, "wait", e.target.value)}/><input type="number" min="1" value={item.attempts || 1} onChange={(e) => updateRunStage(stage.id, "attempts", e.target.value)}/><select value={item.gate || "pending"} onChange={(e) => updateRunStage(stage.id, "gate", e.target.value)}><option value="pending">PENDING</option><option value="pass">PASS</option><option value="fail">FAIL</option></select><strong style={{ color: score >= 60 ? "#FB7185" : score >= 35 ? "#FBBF24" : "#34D399" }}>{score}</strong></div>; })}</div>}</section></>;

  const renderImprovements = () => <section className="sc-panel"><SectionTitle eyebrow="Continuous Improvement" title="개선 백로그" note="병목 근거와 설정 변경을 연결해 다음 실행에 반영합니다." action={<Button icon={Plus} onClick={() => { const title = prompt("개선 항목을 입력하세요."); if (!title) return; setModel((prev) => ({ ...prev, improvements: [{ id: `IMP-${String(prev.improvements.length + 1).padStart(2, "0")}`, title, cause: "원인을 입력하세요.", action: "개선 조치를 입력하세요.", owner: "Unassigned", status: "open", priority: "medium" }, ...prev.improvements] })); }}>항목 추가</Button>}/><div className="sc-backlog">{model.improvements.map((item) => <article key={item.id}><div><Pill value={item.status}/><span>{item.id}</span><em>{item.priority}</em></div><h3>{item.title}</h3><p><b>원인</b>{item.cause}</p><p><b>조치</b>{item.action}</p><footer><span>{item.owner}</span><select value={item.status} onChange={(e) => updateImprovement(item.id, e.target.value)}><option value="open">OPEN</option><option value="doing">DOING</option><option value="done">DONE</option></select></footer></article>)}</div></section>;

  const renderChanges = () => <div className="sc-two"><section className="sc-panel"><SectionTitle eyebrow="Change Package" title="동기화 및 백업" note="승인된 설계안을 JSON으로 내보내 Codex 적용 단계로 전달합니다."/><div className="sc-actions"><Button tone="accent" icon={Download} onClick={downloadModel}>변경 패키지 내보내기</Button><Button icon={Upload} onClick={() => importRef.current?.click()}>JSON 가져오기</Button><Button tone="danger" icon={RotateCcw} onClick={() => { if (!confirm("기본 구조로 초기화할까요?")) return; setModel(cloneDefaultModel()); setNotice("기본 구조로 초기화했습니다."); }}>기본값 복원</Button><input ref={importRef} type="file" accept="application/json" hidden onChange={(e) => { importModel(e.target.files?.[0]); e.target.value = ""; }}/></div><div className="sc-safe"><FileJson2 size={15}/><span>내보낸 파일에는 순서·스킬 트리·실행 기록·개선 백로그·변경 이력이 포함됩니다.</span></div></section><section className="sc-panel"><SectionTitle eyebrow="Audit Log" title="최근 변경" note="최신 변경이 위에 표시됩니다."/>{model.changes.length ? model.changes.slice(0, 12).map((item) => <div className="sc-change" key={item.id}><span>{new Date(item.at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span><strong>{item.summary}</strong><small>{item.impact?.join(" · ")}</small></div>) : <div className="sc-empty"><CheckCircle2 size={18}/>아직 기록된 변경이 없습니다.</div>}</section></div>;

  return <div className="sc-root" style={{ background: T.bg, color: T.text }}><style>{`
    .sc-root{height:100%;overflow:auto;padding:22px 24px 56px}.sc-container{max-width:1480px;margin:0 auto}.sc-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:18px}.sc-hero h1{font-size:21px;margin:0;font-weight:900;letter-spacing:-.03em}.sc-hero p{margin:6px 0 0;font-size:11px;color:${T.textMuted};line-height:1.55}.sc-actions{display:flex;gap:7px;flex-wrap:wrap}.sc-tabs{display:flex;gap:4px;padding:4px;border:1px solid ${T.border};background:${T.surface};border-radius:12px;margin-bottom:18px;overflow:auto}.sc-tabs button{flex:0 0 auto;height:34px;padding:0 12px;border:0;border-radius:8px;background:transparent;color:${T.textMuted};font:800 10.5px inherit;display:flex;align-items:center;gap:6px;cursor:pointer}.sc-tabs button.active{color:${T.text};background:${T.hoverBg};box-shadow:inset 0 0 0 1px ${T.border}}.sc-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:10px}.sc-panel{padding:17px;border-radius:15px;border:1px solid ${T.border};background:${T.surface};box-shadow:inset 0 1px 0 rgba(255,255,255,.04);min-width:0;margin-bottom:10px}.sc-stage-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px}.sc-detail{display:grid;grid-template-columns:1fr 2fr 2fr;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid ${T.border}}.sc-detail div{min-width:0}.sc-detail span{display:block;color:${T.textDim};font-size:9px;margin-bottom:4px}.sc-detail strong{display:block;color:${T.text};font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sc-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}.sc-bar-row{display:grid;grid-template-columns:145px 1fr 28px;gap:9px;align-items:center;margin:10px 0;font-size:10px}.sc-bar-row>span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sc-bar-row>div{height:7px;border-radius:99px;background:${T.hoverBg};overflow:hidden}.sc-bar-row i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,${ACCENT},#FB7185)}.sc-bar-row strong{text-align:right}.sc-improvement{width:100%;display:grid;grid-template-columns:auto 1fr auto;gap:9px;align-items:center;padding:9px 0;border:0;border-bottom:1px solid ${T.border};background:transparent;color:${T.text};text-align:left;cursor:pointer}.sc-improvement span span{display:block}.sc-improvement strong{display:block;font-size:10.5px}.sc-improvement small{display:block;margin-top:3px;color:${T.textMuted};font-size:9.5px}.sc-improvement em{font:800 8.5px inherit;color:${T.textDim};text-transform:uppercase}.sc-workspace{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(410px,.9fr);gap:10px}.sc-inspector{position:sticky;top:0;align-self:start}.sc-inspector-wide{max-height:calc(100vh - 130px);overflow:auto}.sc-list-row{width:100%;display:grid;grid-template-columns:38px 1fr auto 78px;align-items:center;gap:10px;padding:11px;border:0;border-bottom:1px solid ${T.border};background:transparent;color:${T.text};text-align:left;cursor:pointer}.sc-list-row.active{background:${ACCENT}10}.sc-list-row>b{color:${ACCENT};font-size:10px}.sc-list-row strong,.sc-skill-node strong{display:block;font-size:11px}.sc-list-row small,.sc-skill-node small{display:block;margin-top:3px;color:${T.textDim};font-size:9px}.sc-list-row em{color:${T.textMuted};font:800 8px inherit;text-transform:uppercase}.sc-readonly{padding:10px;border-radius:9px;background:${T.hoverBg};border:1px solid ${T.border};font-size:10.5px;line-height:1.5}.sc-code{width:100%;height:190px;resize:vertical;padding:11px;border-radius:9px;border:1px solid ${T.border};background:${T.bg};color:${T.text};font:10.5px/1.55 'JetBrains Mono',monospace;outline:0}.sc-settings-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 10px}.sc-settings-grid>label{min-width:0}.sc-input-suffix{position:relative}.sc-input-suffix span{position:absolute;right:9px;top:50%;transform:translateY(-50%);font-size:9px;color:${T.textDim}}.sc-preset-card{grid-column:1/-1;padding:12px;border:1px solid ${T.border};border-radius:11px;background:${T.hoverBg};margin:2px 0 12px}.sc-preset-card>div:first-child{display:flex;justify-content:space-between;gap:10px}.sc-preset-card strong{font-size:11px}.sc-preset-card small{color:${ACCENT};font-size:9px}.sc-preset-card p{font-size:9.5px;line-height:1.5;color:${T.textMuted}}.sc-preset-spec{display:flex;flex-wrap:wrap;gap:5px}.sc-preset-spec span{display:flex;gap:5px;padding:4px 6px;border:1px solid ${T.border};border-radius:7px;color:${T.textMuted};font-size:8.5px}.sc-preset-spec b{color:${T.text};font-weight:800}.sc-advanced{border-top:1px solid ${T.border};margin-top:4px;padding-top:12px}.sc-advanced summary{cursor:pointer;color:${T.textMuted};font-size:10px;font-weight:800;margin-bottom:12px}.sc-toggle{display:flex;align-items:center;gap:8px;border:0;background:transparent;color:${T.text};font:800 10px inherit;cursor:pointer}.sc-toggle>span{width:34px;height:19px;border-radius:99px;background:${T.textDim};position:relative}.sc-toggle>span:after{content:'';position:absolute;width:13px;height:13px;left:3px;top:3px;border-radius:99px;background:#fff;transition:.15s}.sc-toggle>span.on{background:#34D399}.sc-toggle>span.on:after{transform:translateX(15px)}.sc-tree{display:grid;gap:4px}.sc-skill-node{width:calc(100% - var(--indent,0px));display:grid;grid-template-columns:auto 1fr 62px;align-items:center;gap:10px;padding:10px;border:1px solid transparent;border-radius:10px;background:transparent;color:${T.text};text-align:left;cursor:pointer;position:relative}.sc-skill-node:hover,.sc-skill-node.active{background:${T.hoverBg};border-color:${T.border}}.sc-skill-node em{font:800 8.5px inherit;color:${T.textDim}}.sc-description{margin:0 0 18px;color:${T.textMuted};font-size:11px;line-height:1.65}.sc-chip-wrap{display:flex;gap:5px;flex-wrap:wrap}.sc-chip-wrap span{padding:4px 7px;border-radius:7px;background:${T.hoverBg};border:1px solid ${T.border};font-size:9px;color:${T.textMuted}}.sc-safe{display:flex;gap:8px;align-items:flex-start;margin-top:14px;padding:10px;border-radius:10px;border:1px solid rgba(251,191,36,.25);background:rgba(251,191,36,.07);color:${T.textMuted};font-size:9.5px;line-height:1.55}.sc-doc-layout{display:grid;grid-template-columns:250px 280px minmax(0,1fr);gap:10px}.sc-doc-skills,.sc-doc-files,.sc-doc-editor{min-height:620px}.sc-search{width:100%;height:36px;border:1px solid ${T.border};border-radius:9px;background:${T.bg};color:${T.text};padding:0 10px;font-size:10px;outline:0;margin-bottom:10px}.sc-doc-skill{width:100%;display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px;border:0;border-radius:9px;background:transparent;color:${T.text};text-align:left;cursor:pointer}.sc-doc-skill:hover,.sc-doc-skill.active{background:${T.hoverBg}}.sc-doc-skill strong{display:block;font-size:10.5px}.sc-doc-skill small{display:block;color:${T.textDim};font-size:8.5px;margin-top:3px}.sc-doc-skill em{font:800 8px inherit;color:${T.textMuted}}.sc-doc-summary{display:grid;grid-template-columns:repeat(2,1fr);gap:5px;margin-bottom:10px}.sc-doc-summary span{padding:7px;border:1px solid ${T.border};border-radius:8px;font-size:8.5px;color:${T.textMuted}}.sc-doc-summary b{display:block;color:${ACCENT};font-size:12px}.sc-file-list{display:grid;gap:3px;max-height:500px;overflow:auto}.sc-file-list button{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:7px;padding:8px;border:0;border-radius:8px;background:transparent;color:${T.text};text-align:left;cursor:pointer}.sc-file-list button:hover,.sc-file-list button.active{background:${T.hoverBg}}.sc-file-list strong{display:block;font-size:9.5px;overflow:hidden;text-overflow:ellipsis}.sc-file-list small{display:block;color:${T.textDim};font-size:8px;margin-top:2px}.sc-file-list i{color:${ACCENT};font:800 8px inherit}.sc-heading-strip{display:flex;gap:5px;overflow:auto;margin-bottom:9px}.sc-heading-strip span{flex:0 0 auto;padding:4px 7px;border:1px solid ${T.border};border-radius:7px;color:${T.textMuted};font-size:8.5px}.sc-document-editor{width:100%;min-height:500px;resize:vertical;border:1px solid ${T.border};border-radius:10px;background:${T.bg};color:${T.text};padding:14px;font:10.5px/1.65 'JetBrains Mono',monospace;outline:0;white-space:pre}.sc-binary{min-height:460px;display:grid;place-content:center;justify-items:center;gap:9px;color:${T.textMuted};font-size:9.5px}.sc-binary strong{color:${T.text};font-size:11px}.sc-run-tabs{display:flex;gap:6px;overflow:auto;margin-bottom:12px}.sc-run-tabs button{border:1px solid ${T.border};background:transparent;color:${T.textMuted};padding:7px 10px;border-radius:8px;font:700 10px inherit;cursor:pointer}.sc-run-tabs button.active{color:${T.text};border-color:${ACCENT};background:${ACCENT}10}.sc-run-tabs small{margin-left:6px;color:#FBBF24}.sc-table{border:1px solid ${T.border};border-radius:11px;overflow:hidden}.sc-tr{display:grid;grid-template-columns:minmax(180px,1.5fr) repeat(4,minmax(70px,.6fr)) minmax(60px,.45fr);align-items:center;border-top:1px solid ${T.border};min-height:43px}.sc-tr:first-child{border-top:0}.sc-tr>span,.sc-tr>strong{padding:0 11px;font-size:10px}.sc-tr b{color:${ACCENT};margin-right:7px}.sc-th{background:${T.hoverBg};font-weight:900;color:${T.textMuted}}.sc-tr input,.sc-tr select{width:calc(100% - 12px);margin:5px 6px;height:30px;border-radius:7px;border:1px solid ${T.border};background:${T.bg};color:${T.text};padding:0 7px;font-size:10px}.sc-backlog{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.sc-backlog article{padding:14px;border:1px solid ${T.border};border-radius:12px;background:${T.hoverBg};min-width:0}.sc-backlog article>div{display:flex;align-items:center;gap:7px;color:${T.textDim};font-size:9px}.sc-backlog article>div em{margin-left:auto}.sc-backlog h3{font-size:12px;margin:13px 0}.sc-backlog p{display:grid;grid-template-columns:34px 1fr;gap:6px;margin:7px 0;color:${T.textMuted};font-size:9.5px;line-height:1.45}.sc-backlog footer{display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:10px;border-top:1px solid ${T.border};font-size:9px;color:${T.textDim}}.sc-backlog select{border:1px solid ${T.border};background:${T.bg};color:${T.text};border-radius:7px;padding:4px 6px;font-size:9px}.sc-change{display:grid;grid-template-columns:90px 1fr;gap:5px 10px;padding:9px 0;border-bottom:1px solid ${T.border}}.sc-change span,.sc-change small{color:${T.textDim};font-size:9px}.sc-change strong{font-size:10.5px}.sc-change small{grid-column:2}.sc-empty{display:flex;align-items:center;gap:8px;color:${T.textMuted};font-size:10.5px;padding:18px}.sc-notice{position:fixed;left:50%;bottom:24px;z-index:9500;transform:translateX(-50%);padding:10px 15px;border-radius:10px;background:${ACCENT};color:#171717;font-size:10.5px;font-weight:900;box-shadow:0 16px 42px rgba(0,0,0,.35)}
    .sc-current-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-bottom:10px}.sc-current-summary>div{padding:10px;border:1px solid ${T.border};border-radius:10px;background:${T.hoverBg};min-width:0}.sc-current-summary span,.sc-current-summary small{display:block;color:${T.textDim};font-size:8.5px}.sc-current-summary strong{display:block;margin:5px 0;color:${T.text};font-size:10.5px;line-height:1.35}
    @media(max-width:1100px){.sc-metrics{grid-template-columns:repeat(2,1fr)}.sc-stage-grid{grid-template-columns:repeat(4,1fr)}.sc-backlog{grid-template-columns:repeat(2,1fr)}.sc-doc-layout{grid-template-columns:220px 1fr}.sc-doc-editor{grid-column:1/-1}}@media(max-width:760px){.sc-root{padding:16px 14px 48px}.sc-hero{align-items:flex-start;flex-direction:column}.sc-metrics,.sc-two,.sc-workspace,.sc-doc-layout{grid-template-columns:1fr}.sc-stage-grid{grid-template-columns:repeat(2,1fr)}.sc-detail,.sc-settings-grid,.sc-current-summary{grid-template-columns:1fr}.sc-inspector{position:static;max-height:none}.sc-doc-editor{grid-column:auto}.sc-doc-skills,.sc-doc-files,.sc-doc-editor{min-height:0}.sc-backlog{grid-template-columns:1fr}.sc-tr{grid-template-columns:150px repeat(5,75px);min-width:620px}.sc-table{overflow:auto}}
  `}</style><div className="sc-container"><header className="sc-hero"><div><h1>배너 자동화 운영 현황</h1><p>실제 스킬 지침·레퍼런스·실행값·병목·개선안을 한글 화면에서 관리합니다.</p></div><div className="sc-actions"><Button icon={FileJson2} onClick={() => setTab("changes")}>변경 패키지</Button><Button tone="accent" icon={Download} onClick={downloadModel}>JSON 내보내기</Button></div></header><nav className="sc-tabs" aria-label="스킬 관리 메뉴">{TABS.map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon size={13}/>{label}</button>)}</nav>{tab === "overview" && renderOverview()}{tab === "workflow" && renderWorkflow()}{tab === "skills" && renderSkills()}{tab === "documents" && renderDocuments()}{tab === "runs" && renderRuns()}{tab === "improvements" && renderImprovements()}{tab === "changes" && renderChanges()}</div>{modal && <Modal title={modal === "split" ? `${selectedSkill?.name} 분해` : "새 스킬 추가"} onClose={() => setModal(null)}><SkillForm parent={modal === "split" ? selectedSkill : null} stages={stages} onSubmit={addSkill} onClose={() => setModal(null)}/></Modal>}{notice && <div className="sc-notice">{notice}</div>}</div>;
}
