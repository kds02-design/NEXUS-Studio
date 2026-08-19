// 앱 상단 뷰 전환 탭. 키비주얼 편집(메인) / 리스킨 / 리디자인.
// index.jsx 최상단으로 리프트되어 모든 뷰에서 보인다. (광원·빛효과는 키비주얼 편집 내부 모드로 이동)

import { Image as ImageIcon, LayoutTemplate, Sparkles } from 'lucide-react';

export default function ForgeHeader({ currentView, setCurrentView }) {
  const tab = (id, Icon, label) => (
    <button
      onClick={() => setCurrentView(id)}
      className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-md text-[12px] font-bold transition-all ${currentView === id ? 'bg-[#2A2A2E] text-white shadow-md border border-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <div className="px-4 py-3 border-b border-zinc-800/50 shrink-0">
      <div className="flex bg-[#111111] p-1.5 rounded-lg border border-zinc-800/50 w-full max-w-[620px] shadow-inner gap-1">
        {tab('kvedit',     ImageIcon,      '키비주얼 편집')}
        {tab('creation',   LayoutTemplate, '리스킨')}
        {tab('micro-edit', Sparkles,       '리디자인')}
      </div>
    </div>
  );
}
