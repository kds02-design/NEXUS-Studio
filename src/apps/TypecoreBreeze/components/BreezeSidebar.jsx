import { PenTool, Edit3, Smile, Feather } from 'lucide-react';
import { useBreeze } from '../context/BreezeContext.jsx';

export default function BreezeSidebar() {
  const {
    isSidebarOpen,
    currentView, setCurrentView, setBaseLangView, enterMicroEdit,
    selectedCategory, handleCategoryChange,
  } = useBreeze();

  return (
    <aside className={`${isSidebarOpen ? 'w-[240px]' : 'w-[72px]'} border-r bg-[#111111] border-zinc-800/80 flex flex-col transition-all duration-300 shrink-0 z-[200]`}>
      <div className="p-4">
        <div className="flex rounded-md p-1 bg-[#1A1A1A] border border-zinc-800 relative">
          <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded shadow-[0_1px_3px_rgba(0,0,0,0.5)] transition-all duration-300 ${currentView === 'editor' ? 'left-1 bg-[#2C2C2C]' : 'left-[calc(50%+2px)] bg-[#2C2C2C]'}`}></div>
          <button onClick={() => { setCurrentView('editor'); setBaseLangView('ko'); }} className={`flex-1 py-1.5 text-[11px] font-bold rounded relative z-10 flex items-center justify-center gap-1.5 ${currentView === 'editor' ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}><PenTool className="w-3.5 h-3.5" /> Creation</button>
          <button onClick={enterMicroEdit} className={`flex-1 py-1.5 text-[11px] font-bold rounded relative z-10 flex items-center justify-center gap-1.5 ${currentView === 'edit' ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}><Edit3 className="w-3.5 h-3.5" /> Micro-Edit</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 custom-scrollbar">
        <div className="text-[10px] font-bold text-zinc-600 mb-3 px-1">WORKSPACE</div>
        <button onClick={() => handleCategoryChange('casual')} className={`flex items-center w-full px-3 py-2.5 rounded-md justify-start gap-3 transition-all ${selectedCategory === 'casual' ? 'bg-zinc-800 text-zinc-100 font-bold shadow-sm' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>
          <Smile className={`w-4 h-4 shrink-0 ${selectedCategory === 'casual' ? 'text-zinc-300' : ''}`} /> {isSidebarOpen && <span className="text-[12px]">Casual Pop</span>}
        </button>
        <button onClick={() => handleCategoryChange('calli')} className={`flex items-center w-full px-3 py-2.5 rounded-md justify-start gap-3 transition-all ${selectedCategory === 'calli' ? 'bg-zinc-800 text-zinc-100 font-bold shadow-sm' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>
          <Feather className={`w-4 h-4 shrink-0 ${selectedCategory === 'calli' ? 'text-zinc-300' : ''}`} /> {isSidebarOpen && <span className="text-[12px]">Calligraphy</span>}
        </button>
      </div>
    </aside>
  );
}
