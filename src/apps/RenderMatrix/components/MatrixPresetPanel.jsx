import { PRESET_GROUPS } from "../constants/presets";
import MatrixStyleCard from "./MatrixStyleCard";

// "Theme Presets" 패널: 그룹 탭 + 그룹 안 프리셋 카드 리스트.
// groups prop 으로 다른 그룹 셋(Motion 등)도 같은 UI 로 재사용.
// label 로 패널 제목 커스터마이즈 가능.
export default function MatrixPresetPanel({
  activePresetGroup, setActivePresetGroup,
  activePresetId, isPresetModified,
  onApplyPreset,
  groups,
  label = "Theme Presets (스타일 템플릿)",
}) {
  const list = groups || PRESET_GROUPS;
  const group = list.find(g => g.id === activePresetGroup) || list[0];
  return (
    <div>
      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2 pl-1">{label}</label>
      <div className="flex gap-1 bg-[#121214] p-1 rounded-xl border border-zinc-800/80 mb-2 shadow-inner">
        {list.map(g => (
          <button key={g.id} onClick={() => setActivePresetGroup(g.id)}
            className={`flex-1 text-[10px] py-2 rounded-lg transition-colors font-bold flex items-center justify-center gap-1 ${activePresetGroup === g.id ? 'bg-[#27272A] text-white shadow-sm border border-zinc-700/50' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {g.icon} {g.name}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-1.5 p-2 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
        {group?.presets.map(p => (
          <MatrixStyleCard
            key={p.id}
            preset={p}
            active={activePresetId === p.id}
            isPresetModified={isPresetModified}
            onApply={onApplyPreset}
          />
        ))}
      </div>
    </div>
  );
}
