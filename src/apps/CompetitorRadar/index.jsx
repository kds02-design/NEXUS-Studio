import { useState, useCallback, useRef } from "react";
import { Loader2, Radar } from "lucide-react";
import { APP_MAP } from "../../config/apps";
import { useGlobal, useTheme } from "../../context/GlobalContext";
import { useUsageGate } from "../../components/UsageGate";
import { useCompetitorEntries } from "./hooks/useCompetitorEntries";
import { addEntry, updateEntry, deleteEntry, addReport, deleteReport } from "./services/firebase";
import { analyzeCompetitorDesign, generateTrendReport, prepareImageForAI } from "./services/gemini";
import RadarHeader from "./components/RadarHeader";
import EntryCard from "./components/EntryCard";
import EntryDetailModal from "./components/EntryDetailModal";
import RegisterModal from "./components/RegisterModal";
import ReportPanel from "./components/ReportPanel";

const COLOR = APP_MAP["competitor-radar"]?.color || "#FF7675";

export default function CompetitorRadar() {
  const T = useTheme();
  const { user } = useGlobal();
  const { ensureCanGenerate, modal: usageModal } = useUsageGate();
  const radar = useCompetitorEntries();

  const [registerOpen, setRegisterOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  const notify = useCallback((msg) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2800);
  }, []);

  const newCount = radar.entries.filter(e => e.isNew).length;

  // 분석 실행 — 이미지(dataURL 또는 Cloudinary URL) → base64 → Gemini → write-back.
  const analyzeEntry = useCallback(async (id, imageSources) => {
    if (!(await ensureCanGenerate("analysis"))) return;
    setAnalyzingId(id);
    try {
      const b64s = (await Promise.all(imageSources.filter(Boolean).map(prepareImageForAI))).filter(Boolean);
      if (b64s.length === 0) { notify("분석할 이미지를 불러오지 못했습니다."); return; }
      const r = await analyzeCompetitorDesign(b64s);
      if (r.ok) {
        await updateEntry(id, {
          title: r.title, category: r.category, promoDate: r.promoDate,
          styleTraits: r.styleTraits, colorPalette: r.colorPalette,
          layoutPattern: r.layoutPattern, copyTone: r.copyTone,
          tags: r.tags, summary: r.summary,
          isAnalyzed: true, analyzedAt: new Date().toISOString(),
        });
        notify("분석 완료");
      } else notify("분석 실패: " + r.error);
    } catch (e) {
      notify("분석 오류: " + (e.message || e));
    } finally { setAnalyzingId(null); }
  }, [ensureCanGenerate, notify]);

  const handleRegister = useCallback(async (form) => {
    setRegisterOpen(false);
    try {
      const res = await addEntry(form, user);
      if (!res.isNew) { notify("이미 등록된 URL입니다 — 재등장 카운트 +1"); return; }
      notify("등록 완료 — 분석 중…");
      await analyzeEntry(res.id, [form.images.full, form.images.mobile]);
    } catch (e) {
      notify("등록 실패: " + (e.message || e));
    }
  }, [user, notify, analyzeEntry]);

  const openDetail = useCallback((entry) => {
    setDetail(entry);
    if (entry.isNew) updateEntry(entry.id, { isNew: false }).catch(() => {}); // 열람 = 확인 처리
  }, []);

  // detail 은 스냅샷 당시 객체라 분석 후 갱신 반영 위해 최신 entries 에서 다시 찾음.
  const liveDetail = detail ? (radar.entries.find(e => e.id === detail.id) || detail) : null;

  const handleReanalyze = useCallback((entry) => {
    analyzeEntry(entry.id, [entry.full_image, entry.mobile_image]);
  }, [analyzeEntry]);

  const handleDelete = useCallback(async (entry) => {
    if (!window.confirm(`"${entry.title || entry.competitor}" 항목을 삭제할까요?`)) return;
    await deleteEntry(entry.id);
    setDetail(null);
    notify("삭제됨");
  }, [notify]);

  const handleGenerateReport = useCallback(async (candidates, label) => {
    if (!candidates.length) return;
    if (!(await ensureCanGenerate("analysis"))) return;
    setGenerating(true);
    try {
      const r = await generateTrendReport(candidates);
      if (r.ok) {
        await addReport({ periodEnd: new Date().toISOString(), markdown: `> ${label} · ${candidates.length}건\n\n${r.markdown}`, entryIds: candidates.map(c => c.id) }, user);
        notify("리포트 생성 완료");
      } else notify("리포트 실패: " + r.error);
    } catch (e) {
      notify("리포트 오류: " + (e.message || e));
    } finally { setGenerating(false); }
  }, [ensureCanGenerate, user, notify]);

  return (
    <div className="min-h-full px-6 md:px-10 py-6" style={{ background: T.bg, color: T.text }}>
      <RadarHeader
        color={COLOR}
        competitors={radar.competitors}
        competitorFilter={radar.competitorFilter} setCompetitorFilter={radar.setCompetitorFilter}
        categoryFilter={radar.categoryFilter} setCategoryFilter={radar.setCategoryFilter}
        onlyNew={radar.onlyNew} setOnlyNew={radar.setOnlyNew}
        search={radar.search} setSearch={radar.setSearch}
        total={radar.filtered.length} newCount={newCount}
        onRegister={() => setRegisterOpen(true)} onOpenReports={() => setReportsOpen(true)}
      />

      {radar.loading ? (
        <div className="flex items-center justify-center py-32" style={{ color: T.textDim }}><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : radar.filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 text-center gap-3">
          <Radar className="w-10 h-10" style={{ color: T.textDim }} />
          <div className="text-sm" style={{ color: T.textMuted }}>
            {radar.entries.length === 0 ? "아직 등록된 경쟁사 디자인이 없습니다." : "필터에 맞는 항목이 없습니다."}
          </div>
          {radar.entries.length === 0 && (
            <button onClick={() => setRegisterOpen(true)} className="px-4 py-2 rounded-lg text-sm font-bold text-white" style={{ background: COLOR }}>첫 디자인 등록</button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {radar.filtered.map(e => (
            <EntryCard key={e.id} entry={e} color={COLOR} analyzing={analyzingId === e.id} onClick={() => openDetail(e)} />
          ))}
        </div>
      )}

      {registerOpen && <RegisterModal color={COLOR} onClose={() => setRegisterOpen(false)} onRegister={handleRegister} />}
      {liveDetail && (
        <EntryDetailModal entry={liveDetail} color={COLOR} analyzing={analyzingId === liveDetail.id}
          onClose={() => setDetail(null)} onReanalyze={handleReanalyze} onDelete={handleDelete} />
      )}
      {reportsOpen && (
        <ReportPanel reports={radar.reports} entries={radar.entries} color={COLOR} generating={generating}
          onGenerate={handleGenerateReport} onClose={() => setReportsOpen(false)} onDeleteReport={(id) => deleteReport(id)} />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg"
          style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }}>
          {toast}
        </div>
      )}
      {usageModal}
    </div>
  );
}
