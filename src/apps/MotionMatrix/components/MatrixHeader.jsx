
const MonitorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
    <line x1="8" y1="21" x2="16" y2="21"></line>
    <line x1="12" y1="17" x2="12" y2="21"></line>
  </svg>
);

export default function MatrixHeader({ activeTab, setActiveTab, onReset }) {
  return (
    <header className="h-14 border-b border-[#2b2d31] bg-[#181a1f] flex items-center justify-between px-5 shrink-0 z-20">
      <div className="flex items-center gap-6">
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('generate')} className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-colors ${activeTab === 'generate' ? 'bg-[#a8c7fa]/10 text-[#a8c7fa] border border-[#a8c7fa]/30' : 'text-[#9ca3af] hover:bg-[#2b2d31] hover:text-[#e3e3e3] border border-transparent'}`}>
            프롬프트 생성 모드
          </button>
          <button onClick={() => setActiveTab('validate')} className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-colors ${activeTab === 'validate' ? 'bg-[#a8c7fa]/10 text-[#a8c7fa] border border-[#a8c7fa]/30' : 'text-[#9ca3af] hover:bg-[#2b2d31] hover:text-[#e3e3e3] border border-transparent'}`}>
            영상 검수 및 보정 모드
          </button>
          <button onClick={() => setActiveTab('compositing')} className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-colors flex items-center gap-1.5 ${activeTab === 'compositing' ? 'bg-[#0F82FF]/10 text-[#0F82FF] border border-[#0F82FF]/30' : 'text-[#9ca3af] hover:bg-[#2b2d31] hover:text-[#e3e3e3] border border-transparent'}`}>
            <MonitorIcon /> 영상 합성 테스트
          </button>
        </div>
      </div>
      <button onClick={onReset} className="text-[11px] font-medium text-[#9ca3af] hover:text-[#e3e3e3] px-2.5 py-1.5 rounded hover:bg-[#2b2d31]/50 transition-colors">
        Reset Workspace
      </button>
    </header>
  );
}
