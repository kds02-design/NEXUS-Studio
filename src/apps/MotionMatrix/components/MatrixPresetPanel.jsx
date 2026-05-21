import { PRESET_GROUPS } from '../constants/presets';
import MatrixStyleCard from './MatrixStyleCard';

// RenderMatrix 패턴 — 그룹 탭 + 카드 리스트.
// Import (이전 프롬프트 복원) 기능은 그대로 유지하되 panel 하단으로 분리.
export default function MatrixPresetPanel({
  activePresetGroup, setActivePresetGroup,
  activePresetId, isPresetModified, onApplyPreset,
  isImportOpen, setIsImportOpen,
  importText, setImportText, onImport,
}) {
  const group = PRESET_GROUPS.find(g => g.id === activePresetGroup) || PRESET_GROUPS[0];
  return (
    <div className="bg-[#18181B] border border-zinc-800 rounded-xl p-4 relative z-[50]">
      <div className="flex items-center justify-between mb-3">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Production Presets</label>
        <button onClick={() => setIsImportOpen(!isImportOpen)}
          className="text-[10px] text-[#FDCB6E] hover:text-[#FDCB6E]/90 transition-colors">
          Import
        </button>
      </div>

      {/* 그룹 탭 — RenderMatrix MatrixPresetPanel 과 동일 디자인 */}
      <div className="flex gap-1 bg-[#121214] p-1 rounded-xl border border-zinc-800/80 mb-2 shadow-inner">
        {PRESET_GROUPS.map(g => (
          <button key={g.id} onClick={() => setActivePresetGroup(g.id)}
            className={`flex-1 text-[10px] py-2 rounded-lg transition-colors font-bold flex items-center justify-center gap-1 ${activePresetGroup === g.id ? 'bg-[#27272A] text-white shadow-sm border border-zinc-700/50' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {g.icon} {g.name}
          </button>
        ))}
      </div>

      {/* 카드 리스트 */}
      <div className="flex flex-col gap-1.5 p-2 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
        {group?.presets?.map(p => p && (
          <MatrixStyleCard
            key={p.id}
            preset={p}
            active={activePresetId === p.id}
            isPresetModified={isPresetModified}
            onApply={onApplyPreset}
          />
        ))}
      </div>

      {/* Import 패널 — 기존 동작 그대로 */}
      {isImportOpen && (
        <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-zinc-800 animate-fade-in-down w-full box-border">
          <textarea
            className="w-full bg-black/40 border border-zinc-800 rounded-lg p-3 text-[11px] text-zinc-100 outline-none focus:border-[#FDCB6E] resize-y custom-scrollbar min-h-[60px]"
            placeholder="이전 프롬프트를 붙여넣어 설정을 복원하세요."
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <button onClick={onImport}
            className="w-full py-2 bg-zinc-800 hover:bg-[#3f4145] text-zinc-100 rounded-lg text-[11px] font-medium transition-colors">
            설정 복원하기
          </button>
        </div>
      )}
    </div>
  );
}
