import { useState } from 'react';
import { BreezeProvider, useBreeze } from './context/BreezeContext.jsx';
import BreezeSidebar from './components/BreezeSidebar.jsx';
import BreezeHeader from './components/BreezeHeader.jsx';
import BreezePromptForm from './components/BreezePromptForm.jsx';
import BreezeEffectGallery from './components/BreezeEffectGallery.jsx';
import BreezePresetPanel from './components/BreezePresetPanel.jsx';
import BreezeResultPanel from './components/BreezeResultPanel.jsx';
import BreezeModals from './components/BreezeModals.jsx';
import { AdvancedToggle } from '../../components/SovereignKit.jsx';

// 뷰별 라우팅 — Creation 뷰는 Header(Quick Start StepCard ①②③) + PresetPanel(고급 옵션 토글 안) / Edit 뷰는 PromptForm.
function BreezeViews() {
  const { currentView, usageModal } = useBreeze();
  // 고급 옵션 토글 — 초보자는 처음 진입 시 닫힌 상태로 봄. 한 번 펼치면 세션 동안 유지.
  const [advancedOpen, setAdvancedOpen] = useState(false);
  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 dark:bg-[#0A0A0A] dark:text-zinc-200 font-sans overflow-hidden transition-colors duration-500 relative selection:bg-zinc-700 selection:text-white">
      {usageModal}
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }`}</style>
      <main className="flex-1 flex overflow-hidden">
        <BreezeSidebar />
        {currentView === 'edit' && (
          <>
            <BreezePromptForm />
            <BreezeResultPanel />
          </>
        )}
        {currentView === 'editor' && (
          <>
            {/* aside 자체는 height 컨테이너, 내부 div 가 실제 스크롤 영역.
                flex 안의 overflow 가 자식 크기로 늘어나는 문제 방지(min-h-0 + 2-layer).
                pr-2 — 스크롤바가 안쪽에 들어와 박스 우측 border 가 가려지는 것 방지.
                마지막에 명시적 spacer(div h-16) — 스크롤 끝까지 내려도 박스 bottom border 가 viewport 와 맞물리지 않게. */}
            <aside className="w-[360px] shrink-0 border-r bg-[#111111] border-zinc-800/80 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto pl-4 pr-2 py-4 space-y-3 custom-scrollbar">
                <BreezeEffectGallery />
                <BreezeHeader />
                <AdvancedToggle
                  open={advancedOpen}
                  onToggle={() => setAdvancedOpen(v => !v)}
                  accent="#D4AF37"
                  label="고급 옵션"
                  sublabel="레이아웃 · 획 · 마감 · 강도 등 세부 조정"
                >
                  <BreezePresetPanel />
                </AdvancedToggle>
                {/* 명시적 spacer — pb 만으로는 일부 케이스에서 박스 하단 border 가 잘려 보임. */}
                <div className="h-16 shrink-0" aria-hidden="true" />
              </div>
            </aside>
            <BreezeResultPanel />
          </>
        )}
      </main>
      <BreezeModals />
    </div>
  );
}

export default function App() {
  return (
    <BreezeProvider>
      <BreezeViews />
    </BreezeProvider>
  );
}
