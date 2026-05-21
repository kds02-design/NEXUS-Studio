/* eslint-disable */
// current Validation Engine 탭: 점수 4종 + 충돌 로그.
import React from 'react';
import { Database, Terminal, Wand } from 'lucide-react';

const ScoreBar = ({ label, score, color }) => (
  <div className="flex flex-col gap-1.5 mb-3">
    <div className="flex justify-between items-center text-[11px] tracking-tight">
      <span className="text-zinc-400 uppercase font-bold">{label}</span>
      <span style={{ color }} className="font-bold">{score}%</span>
    </div>
    <div className="w-full bg-[#0A0A0A] h-1.5 rounded-full overflow-hidden border border-zinc-800/50">
      <div className="h-full transition-all duration-500" style={{ width: `${score}%`, backgroundColor: color }} />
    </div>
  </div>
);

const OverviewTab = ({ scores, executeAutoCorrection, handleApplyAllCorrections }) => (
  <div className="space-y-6 animate-in fade-in duration-300 mt-6">
    <div className="bg-[#121212] border border-zinc-800/80 rounded-[12px] shadow-sm flex flex-col md:flex-row overflow-hidden">
      {/* Validation Dashboard */}
      <div className="w-full md:w-1/2 p-6 border-b md:border-b-0 md:border-r border-zinc-800/80 bg-[#171717] relative">
        <div className="flex items-center gap-2 mb-6">
          <Database className="w-4 h-4 text-indigo-400" />
          <h3 className="text-[13px] font-bold text-zinc-200 uppercase tracking-widest">시스템 검증 엔진</h3>
        </div>
        <div className="space-y-4">
          <ScoreBar label="Shape Integrity (형태 무결성)" score={scores.shapeIntegrity} color="#3b82f6" />
          <ScoreBar label="Legibility (가독성 보존)" score={scores.legibility} color="#10b981" />
          <ScoreBar label="Style Consistency (스타일 일관성)" score={scores.styleConsistency} color="#a855f7" />
          <ScoreBar label="Layout Stability (레이아웃 안정성)" score={scores.layoutStability} color="#f59e0b" />
        </div>
      </div>

      {/* Conflict Resolution Log & Auto Correction */}
      <div className="w-full md:w-1/2 p-6 bg-[#0A0A0A] relative flex flex-col">
        <div className="flex items-center gap-2 mb-6 shrink-0">
          <Terminal className="w-4 h-4 text-rose-400" />
          <h3 className="text-[13px] font-bold text-zinc-200 uppercase tracking-widest">시스템 로그 및 충돌 해결</h3>
        </div>
        <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
          {scores.conflicts.map((c, idx) => (
            <div key={idx} className={`p-3.5 rounded-[8px] border text-[11px] flex flex-col gap-2.5 shadow-inner ${c.level === '치명적 위험' ? 'bg-rose-500/10 border-rose-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
              <div className="flex items-center justify-between">
                <span className={`font-bold ${c.level === '치명적 위험' ? 'text-rose-400' : 'text-amber-400'}`}>[{c.level}] {c.rule}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">조치 권고: {c.action}</span>
                <button onClick={() => executeAutoCorrection(c.fixId)} className={`px-2.5 py-1 rounded-[4px] font-bold transition-colors ${c.level === '치명적 위험' ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}>보정</button>
              </div>
            </div>
          ))}
          {scores.conflicts.length === 0 && (
            <div className="p-3.5 rounded-[8px] border border-emerald-500/20 bg-emerald-500/10 text-[11px] flex flex-col gap-1 shadow-inner">
              <span className="font-bold text-emerald-400">[검증 완료] 모든 파라미터 정상 조화</span>
              <span className="text-zinc-400">파라미터 간 논리적 충돌이 발견되지 않았습니다. 즉시 컴파일 가능합니다.</span>
            </div>
          )}
        </div>
        {scores.conflicts.length > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-800/60 shrink-0">
            <button onClick={handleApplyAllCorrections} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[8px] text-[12px] font-bold transition-colors flex items-center justify-center gap-2">
              <Wand className="w-4 h-4" /> 추천 안전 모드로 일괄 보정
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);

export default OverviewTab;
