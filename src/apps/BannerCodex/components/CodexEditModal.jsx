import {
  X, Upload, Plus, MinusSquare, Calendar, Check, AlertCircle, Edit3,
  Trash2, RotateCcw, Loader2, Bot, Sparkles, Maximize2, Save, FileText,
  Download, Layers
} from 'lucide-react';
import { DEFAULT_AI_PROMPT } from '../constants/categories';

const safeRender = (v, fb = '') => {
  if (v == null) return fb;
  if (typeof v === 'object') return fb;
  return String(v);
};

// eslint-disable-next-line no-unused-vars
const ModalShell = ({ onClose, children, isLightMode, max = 'max-w-sm' }) => (
  <div className="fixed inset-0 bg-[#0c0c0e]/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
    <div className={`${isLightMode ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0c0c0e] border-zinc-800 text-white'} border rounded-xl shadow-2xl w-full ${max} p-6 space-y-4`} onClick={e => e.stopPropagation()}>
      {children}
    </div>
  </div>
);

export const UploadModal = ({ isOpen, onClose, pendingFiles, filteredPendingFiles, uploadSettings, setUploadSettings,
  fileFilters, setFileFilters, isAddingNewGame, setIsAddingNewGame, newGameName, setNewGameName,
  skipDuplicates, setSkipDuplicates, confirmUpload, isLightMode: _isLightMode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-[#0c0c0e]/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">업로드 설정</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="text-sm text-zinc-400">
          탐색된 <span className="text-white font-bold">{pendingFiles.length}</span>개의 파일 중<br />
          <span className="text-[#0eb9b3] font-bold text-base">{filteredPendingFiles.length}</span>개를 업로드합니다.
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">게임 선택</label>
            <div className="grid grid-cols-3 gap-2">
              {['리니지', '리니지M', '리니지2M'].map(g => (
                <button key={g} onClick={() => { setUploadSettings(p => ({ ...p, game: g })); setIsAddingNewGame(false); }}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border ${uploadSettings.game === g ? 'bg-[#0c0c0e] text-[#0eb9b3] border-[#0eb9b3]' : 'bg-[#0c0c0e] text-zinc-400 border-zinc-800'}`}>{g}</button>
              ))}
              <button onClick={() => setIsAddingNewGame(!isAddingNewGame)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1 col-span-3 ${isAddingNewGame ? 'bg-[#0c0c0e] text-[#0eb9b3] border-[#0eb9b3]' : 'bg-[#0c0c0e] text-zinc-400 border-zinc-800'}`}>{isAddingNewGame ? '취소' : '+ 다른 게임 직접 추가'}</button>
            </div>
            {isAddingNewGame && (
              <div className="mt-2 animate-in slide-in-from-top-1">
                <input type="text" placeholder="새 게임 이름 입력" value={newGameName}
                  onChange={(e) => { setNewGameName(e.target.value); setUploadSettings(p => ({ ...p, game: e.target.value })); }}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:border-[#0eb9b3] focus:outline-none" />
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">연도 설정</label>
            <select className="w-full bg-[#0c0c0e] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-[#0eb9b3] focus:outline-none focus:border-[#0eb9b3]"
              value={uploadSettings.year} onChange={(e) => setUploadSettings(p => ({ ...p, year: e.target.value }))}>
              {[0, 1, 2, 3, 4].map(i => { const y = new Date().getFullYear() - i; return <option key={y} value={y}>{y}년</option>; })}
            </select>
          </div>
          <div className="pt-3 border-t border-zinc-800">
            <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-wider">파일 필터링 (경로/파일명)</label>
            <div className="space-y-3">
              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-bold mb-1 text-[#0eb9b3]"><Plus className="w-3 h-3" /> 포함 키워드 <span className="font-normal opacity-70">(쉼표로 다중 입력)</span></label>
                <input type="text" placeholder="예: 1180, banner" value={fileFilters.include} onChange={(e) => setFileFilters(p => ({ ...p, include: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-xs focus:outline-none transition-colors bg-zinc-900 border-zinc-700 text-white focus:border-[#0eb9b3] placeholder:text-zinc-600" />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 mb-1"><MinusSquare className="w-3 h-3" /> 제외 키워드 <span className="font-normal opacity-70">(쉼표로 다중 입력)</span></label>
                <input type="text" placeholder="예: old, draft" value={fileFilters.exclude} onChange={(e) => setFileFilters(p => ({ ...p, exclude: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-xs focus:outline-none transition-colors bg-zinc-900 border-zinc-700 text-white focus:border-red-500 placeholder:text-zinc-600" />
              </div>
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800">
                <label className="flex items-center gap-1.5 text-[10px] font-bold whitespace-nowrap text-zinc-400"><Calendar className="w-3 h-3" /> 이후 날짜만 업로드:</label>
                <input type="date" value={fileFilters.startDate} onChange={(e) => setFileFilters(p => ({ ...p, startDate: e.target.value }))}
                  className="w-[140px] border rounded-lg px-2 py-1.5 text-xs focus:outline-none transition-colors bg-zinc-900 border-zinc-700 text-white focus:border-[#0eb9b3] [color-scheme:dark]" />
              </div>
            </div>
          </div>
          <div className="pt-2">
            <label onClick={() => setSkipDuplicates(!skipDuplicates)} className="flex items-center gap-2 cursor-pointer group w-max">
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${skipDuplicates ? 'bg-[#0eb9b3] border-[#0eb9b3]' : 'border-zinc-700 group-hover:border-zinc-500'}`}>
                {skipDuplicates && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
              </div>
              <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">중복 데이터 건너뛰기</span>
            </label>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-lg text-xs font-bold text-zinc-400 border border-zinc-700 hover:text-white hover:bg-zinc-800 transition-colors">취소</button>
          <button onClick={confirmUpload} className="flex-[2] border border-zinc-700 hover:border-[#0eb9b3] text-[#0eb9b3] hover:text-[#39d4ce] py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-colors"><Upload className="w-4 h-4" /> 업로드 시작</button>
        </div>
      </div>
    </div>
  );
};

export const BatchEditModal = ({ isOpen, onClose, batchForm, setBatchForm, selectedIds, availableGames, handleBatchSave }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-[#0c0c0e]/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl shadow-2xl w-full max-w-sm p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2"><Edit3 className="w-4 h-4 text-[#0eb9b3]" /><h3 className="text-base font-bold text-white">{selectedIds.length > 1 ? '속성 일괄 변경' : '속성 변경'}</h3></div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="bg-[#0eb9b3]/10 border border-[#0eb9b3]/20 rounded-lg p-2.5 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-[#0eb9b3] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-xs text-[#9ef2ef] font-bold">{selectedIds.length > 1 ? `${selectedIds.length}개 항목 선택됨` : '1개 항목 선택됨'}</p>
            <p className="text-[10px] text-zinc-400">{selectedIds.length > 1 ? '선택한 모든 배너의 속성을 한 번에 변경합니다. 변경하지 않을 항목은 그대로 두세요.' : '배너의 속성 및 경로를 변경합니다. 변경하지 않을 항목은 그대로 두세요.'}</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">게임명 변경</label>
              <button onClick={() => setBatchForm(prev => ({ ...prev, isCustomGame: !prev.isCustomGame, game: prev.isCustomGame ? 'mixed' : '', customGame: '' }))} className="text-[10px] text-[#0eb9b3] hover:text-[#39d4ce] transition-colors">{batchForm.isCustomGame ? '목록에서 선택' : '직접 입력'}</button>
            </div>
            {batchForm.isCustomGame ? (
              <input type="text" value={batchForm.customGame} onChange={(e) => setBatchForm(prev => ({ ...prev, customGame: e.target.value }))} placeholder="새로운 게임 이름 입력" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-[#0eb9b3] focus:outline-none placeholder:text-zinc-600" />
            ) : (
              <select value={batchForm.game} onChange={(e) => setBatchForm(prev => ({ ...prev, game: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-[#0eb9b3] focus:outline-none appearance-none">
                {batchForm.game === 'mixed' && <option value="mixed">여러 게임 혼합 (변경 안 함)</option>}
                <option value="">변경 안 함 (기존 유지)</option>
                {availableGames.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">연도 변경</label>
            <select value={batchForm.year} onChange={(e) => setBatchForm(prev => ({ ...prev, year: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-[#0eb9b3] focus:outline-none appearance-none">
              {batchForm.year === 'mixed' && <option value="mixed">여러 연도 혼합 (변경 안 함)</option>}
              <option value="">변경 안 함 (기존 유지)</option>
              {[0, 1, 2, 3, 4, 5].map(i => { const y = new Date().getFullYear() - i + 1; return y.toString(); }).map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">디렉토리 경로 일괄 변경 (옵션)</label>
            <input type="text" value={batchForm.path} onChange={(e) => setBatchForm(prev => ({ ...prev, path: e.target.value }))} placeholder="예: \\\\ppc-file\\... (비워두면 자동 생성)" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-[#0eb9b3] focus:outline-none placeholder:text-zinc-600" />
            <p className="text-[9px] text-zinc-500 mt-1 leading-relaxed">입력 시 선택된 모든 항목의 경로가 해당 텍스트로 <span className="text-white">강제 덮어쓰기</span> 됩니다.</p>
          </div>
        </div>
        <div className="pt-1 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">취소</button>
          <button onClick={handleBatchSave} className="flex-1 bg-[#0b948f] hover:bg-[#0eb9b3] text-white py-2 rounded-lg text-xs font-bold shadow-lg shadow-[#086663]/20 transition-all flex items-center justify-center gap-1.5"><Check className="w-3.5 h-3.5" /> {selectedIds.length > 1 ? '일괄 적용' : '적용'}</button>
        </div>
      </div>
    </div>
  );
};

export const ConfirmModal = ({ isOpen, isLightMode, icon: Icon, color = 'red', title, message, confirmLabel, onConfirm, onClose, extra }) => {
  if (!isOpen) return null;
  const colorMap = {
    red: { iconBg: 'bg-red-500/10 text-red-500', confirmBg: 'bg-red-500 hover:bg-red-600' },
    yellow: { iconBg: 'bg-yellow-500/10 text-yellow-500', confirmBg: 'bg-yellow-500 hover:bg-yellow-600' },
  };
  const c = colorMap[color] || colorMap.red;
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
      <div className={`w-full max-w-sm p-6 rounded-xl border shadow-2xl ${isLightMode ? 'bg-white border-slate-200' : 'bg-[#0c0c0e] border-zinc-800'}`} onClick={e => e.stopPropagation()}>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${c.iconBg}`}><Icon className="w-6 h-6" /></div>
          <h3 className={`text-lg font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{title}</h3>
          <p className={`text-sm ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`} dangerouslySetInnerHTML={{ __html: message }} />
          {extra}
          <div className="flex gap-3 w-full mt-2">
            <button onClick={onClose} className={`flex-1 py-3 rounded-lg text-sm font-medium border transition-colors ${isLightMode ? 'border-slate-200 text-slate-500 hover:bg-slate-50' : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'}`}>취소</button>
            <button onClick={onConfirm} className={`flex-1 py-3 rounded-lg text-sm font-bold ${c.confirmBg} text-white transition-colors shadow-lg`}>{confirmLabel}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PromptManagerModal = ({ isOpen, onClose, isLightMode, editingPromptText, setEditingPromptText, handlePromptFileUpload, handlePromptFileDownload, handleSavePrompt }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[300] flex items-center justify-center p-4 sm:p-8 animate-in fade-in" onClick={onClose}>
      <div className={`w-full max-w-4xl h-[90vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${isLightMode ? 'bg-white border-slate-200' : 'bg-[#0c0c0e] border-zinc-800'}`} onClick={e => e.stopPropagation()}>
        <div className={`flex items-center justify-between p-5 border-b ${isLightMode ? 'border-slate-200 bg-slate-50' : 'border-zinc-800 bg-[#111]'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0eb9b3]/10 flex items-center justify-center"><FileText className="w-5 h-5 text-[#0eb9b3]" /></div>
            <div>
              <h3 className={`text-base font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>AI 평가 프롬프트 관리</h3>
              <p className={`text-xs ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>클라우드에 저장되어 모든 사용자에게 실시간 반영됩니다.</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isLightMode ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'}`}><X className="w-5 h-5" /></button>
        </div>
        <div className={`p-4 border-b flex flex-wrap items-center gap-3 ${isLightMode ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-[#0c0c0e]'}`}>
          <label className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors border ${isLightMode ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200' : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-white'}`}>
            <Upload className="w-4 h-4" /> .txt 파일에서 불러오기
            <input type="file" accept=".txt" className="hidden" onChange={handlePromptFileUpload} />
          </label>
          <button onClick={handlePromptFileDownload} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors border ${isLightMode ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200' : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-white'}`}>
            <Download className="w-4 h-4" /> .txt 파일로 내보내기
          </button>
          <button onClick={() => setEditingPromptText(DEFAULT_AI_PROMPT)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors border ${isLightMode ? 'text-red-500 border-red-200 hover:bg-red-50' : 'text-red-400 border-red-900/50 hover:bg-red-900/20'}`}>
            <RotateCcw className="w-4 h-4" /> 기본값으로 초기화
          </button>
          <div className="flex-1"></div>
          <div className={`text-[10px] px-3 py-1.5 rounded-md ${isLightMode ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'}`}>
            💡 <span className="font-mono font-bold">{"{{LEARNING_CONTEXT}}"}</span> 문구를 삽입하면 그 위치에 사용자의 학습(코멘트) 데이터가 자동으로 들어갑니다.
          </div>
        </div>
        <div className="flex-1 p-4 overflow-hidden">
          <textarea value={editingPromptText} onChange={(e) => setEditingPromptText(e.target.value)} className={`w-full h-full p-4 rounded-xl text-sm font-mono leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-[#0eb9b3]/50 transition-all custom-scrollbar ${isLightMode ? 'bg-slate-50 border border-slate-300 text-slate-800' : 'bg-black border border-zinc-800 text-zinc-300'}`} spellCheck="false" />
        </div>
        <div className={`p-5 border-t flex justify-end gap-3 ${isLightMode ? 'border-slate-200 bg-slate-50' : 'border-zinc-800 bg-[#111]'}`}>
          <button onClick={onClose} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-colors border ${isLightMode ? 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100' : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800'}`}>취소</button>
          <button onClick={handleSavePrompt} className="px-6 py-2.5 rounded-xl text-sm font-bold bg-[#0eb9b3] hover:bg-[#39d4ce] text-white shadow-lg shadow-[#0eb9b3]/20 flex items-center gap-2 transition-all">
            <Save className="w-4 h-4" /> 클라우드에 저장 적용
          </button>
        </div>
      </div>
    </div>
  );
};

export const DuplicateItem = ({ banner, isToDelete, onToggle, isLightMode }) => {
  const safeTitle = safeRender(banner.title, '제목 없음');
  const safePath = safeRender(banner.path, '경로 없음');
  const safeCreatedAt = safeRender(banner.createdAt, '');
  const img = banner.preview || banner.imageUrl || banner.thumbnailUrl || null;
  return (
    <div onClick={() => onToggle(banner.id)}
      className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all aspect-[2/1] ${isToDelete ? 'border-red-500 scale-95 opacity-70' : (isLightMode ? 'border-[#0eb9b3] shadow-md' : 'border-[#0eb9b3]')} bg-black/20`}>
      {img ? <img src={img} className="w-full h-full object-cover" alt={safeTitle} /> : <div className={`w-full h-full animate-pulse ${isLightMode ? 'bg-slate-200' : 'bg-zinc-800'}`} />}
      <div className={`absolute inset-0 transition-colors pointer-events-none ${isToDelete ? 'bg-red-500/20' : 'bg-black/0 hover:bg-white/10'}`} />
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none flex flex-col gap-0.5">
        <div className="text-[10px] text-white/70 font-mono leading-none truncate">{safePath.split('\\').pop()}</div>
        <div className="text-xs text-white font-bold font-mono leading-none">{safeCreatedAt.slice(0, 16).replace('T', ' ')}</div>
      </div>
      <div className={`absolute top-2 left-2 px-2.5 py-1 rounded-md text-[10px] font-bold shadow-md flex items-center gap-1 ${isToDelete ? 'bg-red-500 text-white' : 'bg-[#0eb9b3] text-white'}`}>
        {isToDelete ? <span className="flex items-center gap-1"><Trash2 className="w-3 h-3" /> 삭제 예정</span> : <span className="flex items-center gap-1"><Check className="w-3 h-3" /> 원본 (Keep)</span>}
      </div>
    </div>
  );
};

export const DuplicateModal = ({ isOpen, onClose, isLightMode, duplicateGroups, duplicateIdsToDelete, toggleDuplicateSelection, processDuplicateDeletion }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-[#0c0c0e]/95 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in">
      <div className={`w-full max-w-6xl h-[90vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl border ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-[#050505] border-zinc-800'}`}>
        <div className={`p-6 border-b flex justify-between items-center ${isLightMode ? 'bg-white border-slate-200' : 'bg-[#0c0c0e] border-white/5'}`}>
          <div>
            <h2 className={`text-xl font-bold flex items-center gap-2 ${isLightMode ? 'text-slate-900' : 'text-white'}`}><Trash2 className="w-6 h-6 text-red-500" /> 중복 데이터 정리</h2>
            <p className={`text-sm mt-1 ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>가장 최근에 생성된 배너가 <span className="text-[#0eb9b3] font-bold">원본(Keep)</span>으로 설정됩니다.</p>
          </div>
          <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isLightMode ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'}`}><X className="w-6 h-6" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          {duplicateGroups.map((group, groupIdx) => (
            <div key={groupIdx} className={`space-y-4 p-6 rounded-2xl border ${isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0c0c0e] border-white/5'}`}>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <span className="bg-[#0eb9b3]/20 px-2 py-0.5 rounded text-[#0eb9b3]">{group[0].game}</span>
                <span className={isLightMode ? 'text-slate-900' : 'text-white'}>
                  {group[0].ocrProcessed && group[0].title !== '제목 없음' ? `${group[0].title} (${group[0].date || group[0].year})` : safeRender(group[0].originalTitle)}
                </span>
                {group[0].ocrProcessed && <span className="px-1.5 py-0.5 ml-1 text-[9px] border border-violet-500/50 text-violet-400 rounded-sm">AI 판단</span>}
                <span className={`text-xs ml-2 ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>({group.length}개)</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {group.map(banner => <DuplicateItem key={banner.id} banner={banner} isToDelete={duplicateIdsToDelete.includes(banner.id)} onToggle={toggleDuplicateSelection} isLightMode={isLightMode} />)}
              </div>
            </div>
          ))}
        </div>
        <div className={`p-6 border-t flex justify-end gap-3 ${isLightMode ? 'bg-white border-slate-200' : 'bg-[#0c0c0e] border-white/5'}`}>
          <button onClick={onClose} className={`py-3 px-6 rounded-xl text-sm font-bold transition-colors ${isLightMode ? 'bg-slate-100 hover:bg-slate-200 text-slate-600' : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300'}`}>취소</button>
          <button onClick={processDuplicateDeletion} className="py-3 px-6 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-600/20 transition-all flex items-center gap-2"><Trash2 className="w-4 h-4" /> 선택 {duplicateIdsToDelete.length}개 삭제</button>
        </div>
      </div>
    </div>
  );
};

export const OCRProgressModal = ({ ocrProgress, setOcrProgress, isLightMode, runSelectedOCR, handleCancelBatch }) => {
  if (!ocrProgress.isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onMouseDown={() => { if (ocrProgress.status === 'confirm') setOcrProgress(prev => ({ ...prev, isOpen: false })); }}>
      <div className={`w-full max-w-sm rounded-3xl p-8 flex flex-col items-center shadow-2xl border ${isLightMode ? 'bg-white border-slate-200' : 'bg-[#1c1c1e] border-zinc-800'}`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-violet-500/20 blur-xl rounded-full"></div>
          {ocrProgress.status === 'processing' ? <Bot className="w-12 h-12 text-violet-500 animate-pulse relative z-10" /> : <Sparkles className="w-12 h-12 text-violet-500 relative z-10" />}
        </div>
        <h3 className={`text-xl font-bold mb-2 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{ocrProgress.status === 'processing' ? 'AI 분석 진행 중...' : '일괄 AI 분석'}</h3>
        {ocrProgress.status === 'processing' ? (
          <>
            <p className={`text-sm mb-2 text-center ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>{ocrProgress.current} / {ocrProgress.total} 개 완료</p>
            <p className={`text-xs font-mono w-full text-center truncate mb-6 px-4 py-2 rounded-lg ${isLightMode ? 'bg-slate-100 text-slate-600' : 'bg-zinc-900 text-zinc-500'}`}>{ocrProgress.target || '분석 준비 중...'}</p>
            <div className={`w-full h-2 rounded-full overflow-hidden ${isLightMode ? 'bg-slate-200' : 'bg-zinc-800'}`}>
              <div className="h-full bg-violet-500 transition-all duration-300 ease-out" style={{ width: `${(ocrProgress.current / Math.max(1, ocrProgress.total)) * 100}%` }} />
            </div>
            <div className="w-full flex justify-between mt-2 mb-6">
              <span className={`text-[10px] ${isLightMode ? 'text-slate-400' : 'text-zinc-600'}`}>0%</span>
              <span className="text-[10px] text-violet-500 font-bold">{Math.round((ocrProgress.current / Math.max(1, ocrProgress.total)) * 100)}%</span>
            </div>
            <div className="flex w-full gap-3">
              <button onClick={() => setOcrProgress(prev => ({ ...prev, isOpen: false }))} className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors border ${isLightMode ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border-zinc-700'}`}>창 숨기기</button>
              <button onClick={handleCancelBatch} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-1.5 group border ${isLightMode ? 'bg-white border-red-200 text-red-500 hover:bg-red-50' : 'bg-zinc-900 border-red-900/50 text-red-400 hover:bg-red-900/30'}`}><X className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />분석 중지</button>
            </div>
          </>
        ) : (
          <>
            <p className={`text-sm mb-6 text-center ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>
              선택한 <span className="font-bold text-violet-500">{ocrProgress.total}개</span> 배너의 AI 분석을 시작하시겠습니까?<br />
              <span className="text-xs text-violet-500/80 mt-2 block">(대량 분석 시 다소 시간이 소요될 수 있습니다)</span>
            </p>
            <div className="flex w-full gap-3">
              <button onClick={() => setOcrProgress(prev => ({ ...prev, isOpen: false }))} className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors border ${isLightMode ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border-zinc-700'}`}>취소</button>
              <button onClick={runSelectedOCR} className="flex-1 py-3 rounded-xl text-sm font-bold bg-violet-500 hover:bg-violet-600 text-white transition-colors shadow-lg shadow-violet-500/20">분석 시작</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const UploadProgressModal = ({ isUploading, uploadProgress, isLightMode, handleCancelUpload }) => {
  if (!isUploading || uploadProgress.total === 0) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className={`w-full max-w-sm rounded-2xl p-8 flex flex-col items-center shadow-2xl border ${isLightMode ? 'bg-white border-slate-200' : 'bg-[#1c1c1e] border-zinc-800'}`}>
        <div className="relative mb-6"><div className="absolute inset-0 bg-[#0eb9b3]/20 blur-xl rounded-full"></div><Loader2 className="w-12 h-12 text-[#0eb9b3] animate-spin relative z-10" /></div>
        <h3 className={`text-xl font-bold mb-2 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>데이터 처리 중...</h3>
        <p className={`text-sm mb-1 ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>잠시만 기다려주세요 ({uploadProgress.current} / {uploadProgress.total})</p>
        {uploadProgress.skipped > 0 ? <p className="text-[#0eb9b3] text-xs mb-6 font-medium bg-[#0eb9b3]/10 px-3 py-1 rounded-full border border-[#0eb9b3]/20">✨ 중복 스킵: {uploadProgress.skipped}개</p> : <div className="mb-6"></div>}
        <div className={`w-full h-2 rounded-full overflow-hidden ${isLightMode ? 'bg-slate-200' : 'bg-zinc-800'}`}>
          <div className="h-full bg-[#0eb9b3] transition-all duration-300 ease-out" style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }} />
        </div>
        <div className="w-full flex justify-between mt-2">
          <span className={`text-[10px] ${isLightMode ? 'text-slate-400' : 'text-zinc-600'}`}>0%</span>
          <span className="text-[10px] text-[#0eb9b3] font-bold">{Math.round((uploadProgress.current / uploadProgress.total) * 100)}%</span>
        </div>
        <button onClick={handleCancelUpload} className={`mt-6 px-6 py-2 rounded-full text-xs font-medium transition-colors flex items-center gap-2 group border ${isLightMode ? 'border-slate-300 text-slate-600 hover:bg-red-50 hover:text-red-500 hover:border-red-200' : 'bg-zinc-800 hover:bg-red-900/30 text-zinc-400 hover:text-red-400 border-zinc-700 hover:border-red-900/50'}`}>
          <X className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />취소하기
        </button>
      </div>
    </div>
  );
};

export const ProcessingFilesModal = ({ isOpen, isLightMode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className={`rounded-2xl p-8 flex flex-col items-center shadow-2xl border ${isLightMode ? 'bg-white border-slate-200' : 'bg-[#1c1c1e] border-zinc-800'}`}>
        <Loader2 className="w-12 h-12 text-[#0eb9b3] animate-spin mb-4" />
        <h3 className={`text-xl font-bold mb-2 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>작업을 준비하는 중...</h3>
        <p className={`text-sm ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>대량의 데이터를 처리하고 있습니다. 잠시만 기다려주세요.</p>
      </div>
    </div>
  );
};

export const NotificationToast = ({ notification, isLightMode }) => {
  if (!notification) return null;
  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 z-[2000] w-max ${isLightMode ? 'bg-white text-slate-900 border-slate-200 shadow-slate-200/50' : 'bg-zinc-900 text-white border-zinc-800'}`}>
      <div className={`w-2 h-2 rounded-full animate-pulse ${isLightMode ? 'bg-[#0eb9b3]' : 'bg-white'}`} />
      <span className="text-sm font-medium">{typeof notification === 'string' ? notification : '알림'}</span>
    </div>
  );
};

export const BatchProcessingPill = ({ isBatchProcessing, isOpen, ocrProgress, onClick }) => {
  if (!isBatchProcessing || isOpen) return null;
  return (
    <button onClick={onClick} className="fixed bottom-6 left-6 z-[1000] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl bg-violet-600 hover:bg-violet-500 text-white transition-all animate-in slide-in-from-bottom-4 border border-violet-400/30 group" title="진행 상황 보기">
      <div className="relative flex items-center justify-center w-6 h-6"><Loader2 className="w-5 h-5 animate-spin text-white" /><div className="absolute inset-0 bg-white/20 rounded-full blur-md animate-pulse"></div></div>
      <div className="flex flex-col text-left"><span className="text-xs font-bold leading-tight">AI 분석 진행 중</span><span className="text-[10px] text-violet-200 leading-none mt-0.5">{ocrProgress.current} / {ocrProgress.total} 완료</span></div>
      <Maximize2 className="w-3.5 h-3.5 ml-2 opacity-50 group-hover:opacity-100 transition-opacity" />
    </button>
  );
};

export const GlobalDragOverlay = ({ isDraggingOverGlobal }) => {
  if (!isDraggingOverGlobal) return null;
  return (
    <div className="fixed inset-0 bg-[#0c0c0e]/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-8 pointer-events-none">
      <div className="w-full max-w-2xl h-96 border-4 border-dashed border-violet-500/50 rounded-[40px] flex flex-col items-center justify-center bg-violet-500/10 animate-in zoom-in-95 duration-200 shadow-2xl">
        <div className="w-24 h-24 bg-violet-500/20 rounded-full flex items-center justify-center mb-6 animate-bounce"><Upload className="w-10 h-10 text-violet-400" /></div>
        <h2 className="text-3xl font-bold text-white mb-2">이미지 파일을 이곳에 놓으세요</h2>
        <p className="text-zinc-400 text-center">임시 평가 폴더가 생성되며 즉시 디자인 평가를 시작할 수 있습니다.<br />(새로고침 시 임시 파일은 삭제됩니다)</p>
      </div>
    </div>
  );
};

export const SelectionToolbar = ({ selectedCount, isLightMode, isAdminMode, isBatchProcessing, activeView, activeCategory,
  handleOpenBatchEdit, handleAddToCart, handleRemoveFromCart, handleResetAI, openOCRConfirm, openDeleteConfirm, clearSelection }) => {
  if (selectedCount === 0 || activeView !== 'grid' || (!isAdminMode && activeCategory !== 'temp')) return null;
  return (
    <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center p-1.5 border rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 fade-in ${isLightMode ? 'bg-white border-slate-200 shadow-slate-200/50' : 'bg-[#1c1c1e] border-zinc-800/50 shadow-black/50'}`}>
      <div className={`flex items-center justify-center min-w-[40px] px-2 h-10 rounded-xl text-[#0eb9b3] font-bold text-base mr-1.5 shadow-inner ${isLightMode ? 'bg-slate-100' : 'bg-zinc-900'}`}>{selectedCount}</div>
      <div className={`flex items-center rounded-xl h-10 border backdrop-blur-md ${isLightMode ? 'bg-slate-100/50 border-slate-200' : 'bg-[#2c2c2e]/50 border-white/5'}`}>
        <button onClick={() => handleOpenBatchEdit()} className={`w-11 h-10 flex items-center justify-center transition-colors rounded-l-xl ${isLightMode ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50' : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'}`} title="속성 일괄 변경"><Edit3 className="w-4 h-4" /></button>
        <div className={`w-px h-4 ${isLightMode ? 'bg-slate-300' : 'bg-zinc-600'}`}></div>
        {activeCategory === 'cart' ? (
          <button onClick={handleRemoveFromCart} className={`w-11 h-10 flex items-center justify-center transition-colors ${isLightMode ? 'text-slate-600 hover:bg-slate-200/50' : 'text-zinc-400 hover:bg-zinc-700/50'}`} title="선택한 항목 빼기"><MinusSquare className="w-4 h-4" /></button>
        ) : (
          <button onClick={handleAddToCart} className={`w-11 h-10 flex items-center justify-center transition-colors ${isLightMode ? 'text-[#0b948f] hover:bg-[#0eb9b3]/10' : 'text-[#39d4ce] hover:bg-[#0eb9b3]/20'}`} title="선택한 항목 담기"><Layers className="w-4 h-4" /></button>
        )}
        <div className={`w-px h-4 ${isLightMode ? 'bg-slate-300' : 'bg-zinc-600'}`}></div>
        <button onClick={handleResetAI} disabled={isBatchProcessing} className={`w-11 h-10 flex items-center justify-center transition-colors ${isBatchProcessing ? 'opacity-50 cursor-not-allowed' : isLightMode ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50' : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'}`} title="AI 분석 결과 초기화"><RotateCcw className="w-4 h-4" /></button>
        <div className={`w-px h-4 ${isLightMode ? 'bg-slate-300' : 'bg-zinc-600'}`}></div>
        <button onClick={openOCRConfirm} className={`w-11 h-10 flex items-center justify-center transition-colors group ${isLightMode ? 'hover:bg-slate-200/50' : 'hover:bg-zinc-700/50'}`} title="일괄 AI 분석"><Sparkles className="w-4 h-4 text-violet-400 group-hover:text-violet-500 transition-colors" /></button>
        <div className={`w-px h-4 ${isLightMode ? 'bg-slate-300' : 'bg-zinc-600'}`}></div>
        <button onClick={openDeleteConfirm} className={`w-11 h-10 flex items-center justify-center transition-colors ${isLightMode ? 'text-red-500 hover:bg-red-50' : 'text-red-500 hover:bg-red-900/20'}`} title="선택 항목 삭제"><Trash2 className="w-4 h-4" /></button>
        <div className={`w-px h-4 ${isLightMode ? 'bg-slate-300' : 'bg-zinc-600'}`}></div>
        <button onClick={clearSelection} className={`w-11 h-10 flex items-center justify-center transition-colors rounded-r-xl ${isLightMode ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50' : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'}`} title="선택 취소"><X className="w-4 h-4" /></button>
      </div>
    </div>
  );
};

