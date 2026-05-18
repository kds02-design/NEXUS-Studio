import { FolderOpen, RefreshCw, X } from 'lucide-react';

const CodexFolderSelector = ({
  isLightMode, lastFolderName,
  onPickFolder, onReopenLast, onForgetLast,
  disabled
}) => {
  return (
    <>
      <button onClick={(e) => { e.stopPropagation(); onPickFolder(); }} disabled={disabled}
        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors text-xs w-full text-left ${isLightMode ? 'hover:bg-slate-100 text-slate-600 hover:text-slate-900' : 'hover:bg-white/5 text-zinc-400 hover:text-white'}`}>
        <FolderOpen className="w-4 h-4 shrink-0" /> <span>폴더 선택 (Z:\, 네트워크)</span>
      </button>
      {lastFolderName && (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); onReopenLast(); }} disabled={disabled}
            className={`flex-1 flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors text-xs text-left ${isLightMode ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-white/5 text-zinc-500'}`}
            title={`마지막 폴더 다시 열기: ${lastFolderName}`}>
            <RefreshCw className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">↺ {lastFolderName}</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onForgetLast(); }}
            className={`p-2 rounded-lg ${isLightMode ? 'text-slate-400 hover:text-red-500 hover:bg-slate-100' : 'text-zinc-500 hover:text-red-400 hover:bg-white/5'}`}
            title="기억 지우기">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </>
  );
};

export default CodexFolderSelector;
