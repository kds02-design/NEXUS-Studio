// 종류별 평가 리포트 모달.
//   - 분석된 배너를 타이틀 정규화로 그룹화 (typeReports.groupBannersByType)
//   - 좌측: 종류 리스트 (count desc)
//   - 우측: 선택된 종류의 통계 표 + Markdown 리포트 미리보기
//   - 하단: Markdown 다운로드
//
// 평가 기준은 promotion 타입 활성 버전을 자동 로드 (loadActiveWebCriteria).
// brandweb 타입은 별도 — promotion 으로 충분 (UI 단순화).

import { useMemo, useState } from 'react';
import { X, FileText, Download, BarChart3, AlertCircle } from 'lucide-react';
import { groupBannersByType, computeGroupStats, renderGroupReport } from '../../services/typeReports';

// criteriaItems 는 부모(index.jsx)에서 한 번 로드해서 prop 으로 전달 — 모달 안 useEffect+setState 회피.
const TypeReportModal = ({ isOpen, onClose, allBanners, criteriaItems = [] }) => {
  const [selectedGroupKey, setSelectedGroupKey] = useState(null);

  const groups = useMemo(() => groupBannersByType(allBanners || [], { minCount: 1 }), [allBanners]);
  const selectedGroup = groups.find(g => g.groupKey === selectedGroupKey) || null;
  const stats = useMemo(
    () => (selectedGroup ? computeGroupStats(selectedGroup, criteriaItems) : null),
    [selectedGroup, criteriaItems]
  );
  const reportMd = useMemo(
    () => (selectedGroup && stats ? renderGroupReport(selectedGroup, stats, criteriaItems) : ''),
    [selectedGroup, stats, criteriaItems]
  );

  const analyzedCount = (allBanners || []).filter(b => b.isWebAnalyzed).length;

  const handleDownload = () => {
    if (!reportMd || !selectedGroup) return;
    const safeName = selectedGroup.groupKey.replace(/[\\/:*?"<>|]/g, '_');
    const blob = new Blob([reportMd], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `평가-리포트-${safeName}-${Date.now()}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 animate-in fade-in duration-200" onClick={onClose}>
      <div className="w-full max-w-6xl h-[88vh] bg-[#0F0F12] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2 min-w-0">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-[14px] font-bold text-zinc-100">종류별 평가 리포트</h3>
            <span className="text-[11px] text-zinc-500 ml-2 truncate">
              — 분석 완료 {analyzedCount}건 · {groups.length}종류 감지
            </span>
          </div>
          <button onClick={onClose} className="p-2 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 본문 — 좌측 그룹 리스트 / 우측 리포트 */}
        <div className="flex-1 overflow-hidden flex min-h-0">

          <div className="w-[280px] shrink-0 border-r border-zinc-800 overflow-y-auto custom-scrollbar p-3 space-y-1.5">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-1 mb-1">감지된 종류</div>
            {groups.length === 0 ? (
              <div className="text-[11px] text-zinc-600 italic px-3 py-4 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>분석된 배너가 없습니다. 먼저 AI 분석을 실행하세요.</span>
              </div>
            ) : groups.map(g => {
              const active = selectedGroupKey === g.groupKey;
              return (
                <button
                  key={g.groupKey}
                  onClick={() => setSelectedGroupKey(g.groupKey)}
                  className={`w-full text-left p-2.5 rounded-md border transition-colors ${
                    active
                      ? 'bg-emerald-500/10 border-emerald-500/40'
                      : 'bg-[#0A0A0A] border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className={`text-[12px] font-bold truncate ${active ? 'text-emerald-300' : 'text-zinc-200'}`}>
                    {g.groupKey}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">{g.count}건</div>
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            {!selectedGroup ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                <FileText className="w-12 h-12 opacity-30 mb-3" />
                <div className="text-[12px]">왼쪽에서 종류를 선택하세요</div>
                {groups.length > 0 && (
                  <div className="text-[10px] text-zinc-700 mt-2">총 {groups.length}개 종류 — 정규화는 연도/월/대괄호 prefix 제거</div>
                )}
              </div>
            ) : (
              <>
                {/* 점수 분포 표 — Markdown 보다 가독성 좋게 별도 렌더 */}
                {stats?.overall && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 mb-5">
                    <div className="text-[11px] font-bold text-emerald-300 mb-1">{selectedGroup.groupKey}</div>
                    <div className="text-[10px] text-zinc-400">
                      {selectedGroup.count}건 · AI 평균 <span className="text-zinc-200 font-bold">{stats.overall.mean}</span> / 10
                      <span className="text-zinc-600"> · 최고 {stats.overall.max} / 최저 {stats.overall.min}</span>
                    </div>
                  </div>
                )}
                {stats && criteriaItems.length > 0 && (
                  <div className="mb-5">
                    <div className="text-[11px] font-bold text-zinc-300 mb-2">평가 기준별 점수 분포</div>
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-[11px] border-collapse">
                        <thead>
                          <tr className="text-zinc-500 border-b border-zinc-800">
                            <th className="text-left py-2 px-2 font-bold">기준</th>
                            <th className="text-right py-2 px-2 font-bold">평균</th>
                            <th className="text-right py-2 px-2 font-bold">중앙값</th>
                            <th className="text-right py-2 px-2 font-bold">최저</th>
                            <th className="text-right py-2 px-2 font-bold">최고</th>
                            <th className="text-right py-2 px-2 font-bold">표본</th>
                          </tr>
                        </thead>
                        <tbody>
                          {criteriaItems.map(c => {
                            const s = stats.perCriteria[c.id];
                            if (!s || !s.count) return null;
                            return (
                              <tr key={c.id} className="border-b border-zinc-900 hover:bg-white/[0.02]">
                                <td className="py-1.5 px-2 text-zinc-200">{c.label || c.name || c.id}</td>
                                <td className="py-1.5 px-2 text-right text-emerald-300 font-bold tabular-nums">{s.mean}</td>
                                <td className="py-1.5 px-2 text-right text-zinc-300 tabular-nums">{s.median}</td>
                                <td className="py-1.5 px-2 text-right text-zinc-500 tabular-nums">{s.min}</td>
                                <td className="py-1.5 px-2 text-right text-zinc-500 tabular-nums">{s.max}</td>
                                <td className="py-1.5 px-2 text-right text-zinc-500 tabular-nums">{s.count}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 전체 Markdown 미리보기 */}
                <div className="text-[11px] font-bold text-zinc-300 mb-2">Markdown 리포트 미리보기</div>
                <pre className="text-[11px] text-zinc-300 whitespace-pre-wrap leading-relaxed bg-[#050507] border border-zinc-800 rounded-md px-4 py-3 font-mono">
                  {reportMd}
                </pre>
              </>
            )}
          </div>
        </div>

        {/* 하단 — 다운로드 */}
        {selectedGroup && (
          <div className="border-t border-zinc-800 px-6 py-3 flex items-center justify-between gap-2">
            <div className="text-[10px] text-zinc-500 break-keep-all">
              평가 기준 활성 버전이 적용된 표본 통계. 새 디자인 평가 캘리브레이션 / 디자이너 온보딩 자료로 활용 가능.
            </div>
            <button
              onClick={handleDownload}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-zinc-900 text-[11px] font-bold transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Markdown 다운로드
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TypeReportModal;
