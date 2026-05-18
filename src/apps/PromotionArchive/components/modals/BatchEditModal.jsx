import { useState } from 'react';
import { X, Edit3, Plus, Minus } from 'lucide-react';

const BatchEditModal = ({ 
    isOpen, 
    onClose, 
    selectedCount, 
    availableGames, 
    onApply 
}) => {
    const [batchForm, setBatchForm] = useState({
        game: '',
        year: '',
        addTags: [],
        removeTags: []
    });
    const [batchTagInput, setBatchTagInput] = useState({ add: '', remove: '' });

    if (!isOpen) return null;

    const handleBatchTagAdd = (type) => {
        const inputVal = batchTagInput[type].trim();
        if (!inputVal) return;
        
        setBatchForm(prev => ({
            ...prev,
            [type === 'add' ? 'addTags' : 'removeTags']: [...prev[type === 'add' ? 'addTags' : 'removeTags'], inputVal]
        }));
        setBatchTagInput(prev => ({ ...prev, [type]: '' }));
    };

    const handleBatchTagRemove = (type, tagToRemove) => {
        setBatchForm(prev => ({
            ...prev,
            [type === 'add' ? 'addTags' : 'removeTags']: prev[type === 'add' ? 'addTags' : 'removeTags'].filter(t => t !== tagToRemove)
        }));
    };

    const handleSubmit = () => {
        onApply(batchForm); // 부모에게 변경된 데이터 전달
        // 초기화
        setBatchForm({ game: '', year: '', addTags: [], removeTags: [] });
        setBatchTagInput({ add: '', remove: '' });
    };

    return (
        <div 
            className="fixed inset-0 bg-[#0c0c0e]/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-[#d8b17e]" /> 일괄 속성 변경
                    </h3>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-5 h-5"/></button>
                </div>
                <div className="text-sm text-zinc-400">선택된 {selectedCount}개 항목에 대해 다음 속성을 일괄 적용합니다.</div>
                
                <div className="space-y-4">
                    {/* 게임명 변경 */}
                    <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">게임명 변경</label>
                        <select 
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#d8b17e]"
                            value={batchForm.game}
                            onChange={(e) => setBatchForm(prev => ({...prev, game: e.target.value}))}
                        >
                            <option value="">변경 안 함</option>
                            {availableGames.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>

                    {/* 연도 변경 */}
                    <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">연도 변경</label>
                        <select 
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#d8b17e]"
                            value={batchForm.year}
                            onChange={(e) => setBatchForm(prev => ({...prev, year: e.target.value}))}
                        >
                            <option value="">변경 안 함</option>
                            {[0,1,2,3,4].map(i => { const y = new Date().getFullYear() - i; return <option key={y} value={y}>{y}</option> })}
                        </select>
                    </div>

                    {/* 태그 추가 */}
                    <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">태그 추가</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-[#d8b17e] focus:outline-none"
                                placeholder="추가할 태그 입력..."
                                value={batchTagInput.add}
                                onChange={(e) => setBatchTagInput(prev => ({...prev, add: e.target.value}))}
                                onKeyDown={(e) => e.key === 'Enter' && handleBatchTagAdd('add')}
                            />
                            <button onClick={() => handleBatchTagAdd('add')} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-2 rounded-lg border border-zinc-700"><Plus className="w-4 h-4" /></button>
                        </div>
                        {batchForm.addTags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {batchForm.addTags.map(tag => (
                                    <span key={tag} className="flex items-center gap-1 text-xs bg-[#d8b17e]/20 text-[#d8b17e] px-2 py-1 rounded border border-[#d8b17e]/30">
                                        +{tag} <button onClick={() => handleBatchTagRemove('add', tag)}><X className="w-3 h-3" /></button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 태그 삭제 */}
                    <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">태그 삭제</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
                                placeholder="삭제할 태그 입력..."
                                value={batchTagInput.remove}
                                onChange={(e) => setBatchTagInput(prev => ({...prev, remove: e.target.value}))}
                                onKeyDown={(e) => e.key === 'Enter' && handleBatchTagAdd('remove')}
                            />
                            <button onClick={() => handleBatchTagAdd('remove')} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-2 rounded-lg border border-zinc-700"><Minus className="w-4 h-4" /></button>
                        </div>
                        {batchForm.removeTags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {batchForm.removeTags.map(tag => (
                                    <span key={tag} className="flex items-center gap-1 text-xs bg-red-900/30 text-red-500 px-2 py-1 rounded border border-red-500/30">
                                        -{tag} <button onClick={() => handleBatchTagRemove('remove', tag)}><X className="w-3 h-3" /></button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="flex-1 py-3 rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors text-sm font-bold">취소</button>
                    <button onClick={handleSubmit} className="flex-1 py-3 rounded-lg bg-[#d8b17e] hover:bg-[#c6a36e] text-white shadow-lg shadow-[#d8b17e]/20 transition-all text-sm font-bold">일괄 적용</button>
                </div>
            </div>
        </div>
    );
};

export default BatchEditModal;