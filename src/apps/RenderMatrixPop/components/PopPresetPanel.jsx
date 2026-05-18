import { PRESET_GROUPS } from "../constants/presets";
// 카드 스타일은 RenderMatrix 와 동일하므로 그대로 재사용.
import MatrixStyleCard from "../../RenderMatrix/components/MatrixStyleCard";

// Pop 전용 프리셋 패널. PRESET_GROUPS 만 다르고 레이아웃은 RenderMatrix 와 동일.
export default function PopPresetPanel({
  activePresetGroup, setActivePresetGroup,
  activePresetId, isPresetModified,
  onApplyPreset,
}) {
  const group = PRESET_GROUPS.find(g => g.id === activePresetGroup);
  return (
    <div>
      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2 pl-1">Theme Presets (캐주얼/팝 템플릿)</label>
      <div className="flex gap-1 bg-[#121214] p-1 rounded-xl border border-zinc-800/80 mb-2 shadow-inner">
        {PRESET_GROUPS.map(g => (
          <button key={g.id} onClick={() => setActivePresetGroup(g.id)}
            className={`flex-1 text-[10px] py-2 rounded-lg transition-colors font-bold flex items-center justify-center gap-1 ${activePresetGroup === g.id ? 'bg-[#27272A] text-white shadow-sm border border-zinc-700/50' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {g.icon} {g.name}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-1.5 p-2 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
        {group?.presets.map(p => (
          <MatrixStyleCard
            key={p.id} preset={p}
            active={activePresetId === p.id}
            isPresetModified={isPresetModified}
            onApply={onApplyPreset}
          />
        ))}
      </div>
    </div>
  );
}
