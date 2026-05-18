import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Copy, CheckCircle2, Star, Terminal } from 'lucide-react';

export const Tooltip = ({ children, text, position = 'top' }) => (
  <div className="relative group flex items-center justify-center">
    {children}
    <div className={`absolute ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} hidden group-hover:block w-max max-w-[200px] whitespace-normal bg-zinc-800 text-zinc-200 text-[10px] px-2.5 py-1.5 rounded-md shadow-xl border border-zinc-700 z-[9999] opacity-0 group-hover:opacity-100 transition-opacity duration-200 leading-tight text-center`}>
      {text}
    </div>
  </div>
);

export const SectionHeader = ({ id, label, icon }) => (
  <div className="flex items-center gap-2 pl-1 text-zinc-500 relative mt-4 first:mt-0 transition-all duration-700">
    {icon}
    <h3 className="text-[10px] font-semibold uppercase tracking-wider">{id}. {label}</h3>
  </div>
);

export const DropdownControl = ({ label, icon, data = [], value, onChange, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const selectedOption = data.find(o => o.id === value) || data[0] || { name: 'None' };
  const displayLabel = selectedOption.name;

  return (
    <div className={`space-y-1.5 relative transition-all duration-300 ${disabled ? 'opacity-40 grayscale pointer-events-none' : ''}`} ref={containerRef}>
      {label && <div className="flex items-center justify-between pl-1"><p className="text-[10px] font-bold uppercase tracking-tighter flex items-center gap-1.5 text-zinc-500">{icon} {label}</p></div>}
      <button onClick={() => !disabled && setIsOpen(!isOpen)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-md border transition-all bg-[#111111] border-zinc-800 hover:border-zinc-600 focus:outline-none">
        <span className={`text-[11px] font-bold truncate ${!disabled ? 'text-zinc-200' : ''}`}>{displayLabel}</span>
        <ChevronDown className="w-3.5 h-3.5 text-zinc-600" />
      </button>
      {isOpen && (
        <div className="nx-popover-panel absolute left-0 w-full mt-1 max-h-[250px] overflow-y-auto z-[9999] py-1">
          {data.map(opt => (
            <button key={opt.id} onClick={() => { onChange(opt.id); setIsOpen(false); }} className={`nx-popover-item ${value === opt.id ? 'is-active' : ''}`}>
              <span>{opt.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const AiOutputBox = ({ modelState, viewModeState, setViewMode, content, isEdit: _isEdit = false, outdatedFlag = false, onCopy, copiedState }) => {
  const [lang, setLang] = useState('ko');
  let textContent = "";
  let isJsonContent = false;
  let engContentForCopy = "";
  if (!content) { textContent = "결과가 이곳에 표시됩니다."; }
  else if (typeof content === 'string') { textContent = content; engContentForCopy = content; }
  else if (content.en && content.ko) { isJsonContent = true; textContent = content[lang] || content.en; engContentForCopy = content.en; }
  else { textContent = JSON.stringify(content); engContentForCopy = textContent; }

  let btnClass = "bg-violet-600 text-white";
  const isPlaceholderContent = !content || (typeof content === 'string' && (content.startsWith('[ V') || content.startsWith('[ V2.0')));

  return (
    <div className="rounded-xl p-5 sm:p-6 border bg-[#111111] border-zinc-800 relative transition-all duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 pb-4 border-b border-zinc-800/80 gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-[10px] font-bold uppercase text-zinc-400 flex items-center gap-1.5">
            {modelState === 'NanoBanana' ? <Star className="w-3.5 h-3.5 text-zinc-300"/> : <Terminal className="w-3.5 h-3.5"/>}
            {modelState} Output
          </p>
          {outdatedFlag && !isPlaceholderContent && (
            <span className="text-[10px] text-zinc-300 font-bold flex items-center gap-1 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">⚠️ 재생성 필요</span>
          )}
          {modelState === 'NanoBanana' && !isPlaceholderContent && (
            <div className="flex bg-zinc-900 rounded p-0.5 border border-zinc-800">
              <button onClick={() => setViewMode('enhanced')} className={`px-3 py-1 text-[10px] font-bold rounded ${viewModeState === 'enhanced' ? btnClass : 'text-zinc-600 hover:text-zinc-400'}`}>서술형</button>
              <button onClick={() => setViewMode('optimized')} className={`px-3 py-1 text-[10px] font-bold rounded ${viewModeState === 'optimized' ? btnClass : 'text-zinc-600 hover:text-zinc-400'}`}>태그형</button>
            </div>
          )}
          {isJsonContent && !isPlaceholderContent && (
            <div className="flex bg-zinc-900 rounded p-0.5 border border-zinc-800 ml-auto sm:ml-2">
              <button onClick={() => setLang('ko')} className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${lang === 'ko' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>KO</button>
              <button onClick={() => setLang('en')} className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${lang === 'en' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>EN</button>
            </div>
          )}
        </div>
        <Tooltip text={copiedState ? "복사 완료!" : (isJsonContent ? "AI용 영문 프롬프트 복사" : "복사하기")} position="top">
          <button onClick={() => onCopy(isJsonContent ? engContentForCopy : textContent, 'bottom')} className="p-1.5 rounded-md transition-all text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 flex items-center justify-center">
            {copiedState ? <CheckCircle2 className="w-4 h-4 text-blue-400" /> : <Copy className="w-4 h-4 text-blue-400" />}
          </button>
        </Tooltip>
      </div>
      <div className={`w-full text-left whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-zinc-300 ${outdatedFlag && !isPlaceholderContent ? 'opacity-50' : 'opacity-100'}`}>
        {textContent}
      </div>
    </div>
  );
};
