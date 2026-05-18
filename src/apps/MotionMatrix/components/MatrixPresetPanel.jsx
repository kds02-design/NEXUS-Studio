import { PRESETS } from '../constants/presets';

export default function MatrixPresetPanel({
  activePreset, applyPreset,
  isImportOpen, setIsImportOpen,
  importText, setImportText, onImport,
}) {
  return (
    <div className="bg-[#181a1f] border border-[#2b2d31] rounded-xl p-4 relative z-[50]">
      <h3 className="text-[10px] font-medium text-[#9ca3af] tracking-wider uppercase mb-3 flex items-center justify-between">
        Production Presets
        <button onClick={() => setIsImportOpen(!isImportOpen)} className="text-[#a8c7fa] flex items-center gap-1 hover:text-[#c2d7fa] transition-colors">Import</button>
      </h3>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button key={p.id} onClick={() => applyPreset(p.id)} className={`px-3 py-1.5 rounded-full text-[10px] font-medium transition-colors border ${activePreset === p.id ? 'bg-[#a8c7fa]/10 border-[#a8c7fa]/50 text-[#a8c7fa]' : 'bg-[#0f1115] border-[#2b2d31] text-[#e3e3e3] hover:bg-[#2b2d31]'}`}>{p.label}</button>
        ))}
      </div>
      {isImportOpen && (
        <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-[#2b2d31] animate-fade-in-down w-full box-border">
          <textarea
            className="w-full bg-[#0f1115] border border-[#2b2d31] rounded-lg p-3 text-[11px] text-[#e3e3e3] outline-none focus:border-[#a8c7fa] resize-y custom-scrollbar min-h-[60px]"
            placeholder="이전 프롬프트를 붙여넣어 설정을 복원하세요."
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <button onClick={onImport} className="w-full py-2 bg-[#2b2d31] hover:bg-[#3f4145] text-[#e3e3e3] rounded-lg text-[11px] font-medium transition-colors">설정 복원하기</button>
        </div>
      )}
    </div>
  );
}
