import { BreezeProvider, useBreeze } from './context/BreezeContext.jsx';
import BreezeSidebar from './components/BreezeSidebar.jsx';
import BreezeHeader from './components/BreezeHeader.jsx';
import BreezePromptForm from './components/BreezePromptForm.jsx';
import BreezePresetPanel from './components/BreezePresetPanel.jsx';
import BreezeResultPanel from './components/BreezeResultPanel.jsx';
import BreezeModals from './components/BreezeModals.jsx';

// 뷰별 라우팅 — Creation 뷰는 Header(상단 페르소나 + 폼) + PresetPanel(고급 옵션) / Edit 뷰는 PromptForm(편집 사이드바).
function BreezeViews() {
  const { currentView, usageModal } = useBreeze();
  return (
    <div className="flex flex-col h-screen bg-[#0A0A0A] text-zinc-200 font-sans overflow-hidden transition-colors duration-500 relative selection:bg-zinc-700 selection:text-white">
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
            <aside className="w-[360px] shrink-0 border-r bg-[#111111] flex flex-col border-zinc-800/80 overflow-y-auto p-5 space-y-6 custom-scrollbar">
              <BreezeHeader />
              <BreezePresetPanel />
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
