import { useState } from 'react';
import { X, Upload } from 'lucide-react';

const UploadModal = ({ 
    isOpen, 
    onClose, 
    pendingFiles, 
    setPendingFiles, 
    uploadSettings, 
    setUploadSettings, 
    confirmUpload 
}) => {
    // UI 관련 상태는 컴포넌트 내부로 가져왔습니다.
    const [isAddingNewGame, setIsAddingNewGame] = useState(false);
    const [newGameName, setNewGameName] = useState('');

    if (!isOpen) return null;

    const handleClose = () => {
        setPendingFiles([]); // 파일 목록 비우기
        onClose(); // 모달 닫기
    };

    return (
        <div className="fixed inset-0 bg-[#0c0c0e]/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">업로드 설정</h3>
                    <button onClick={handleClose} className="text-zinc-500 hover:text-white">
                        <X className="w-5 h-5"/>
                    </button>
                </div>
                
                <div className="text-sm text-zinc-400">
                    {pendingFiles.length}개의 항목(PC/MO 통합)을 업로드합니다.
                </div>

                <div className="space-y-3">
                    {/* 게임 선택 영역 */}
                    <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">게임 선택</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['아이온', '블소', '기타'].map(g => (
                                <button 
                                    key={g} 
                                    onClick={() => { 
                                        setUploadSettings(p => ({ ...p, game: g })); 
                                        setIsAddingNewGame(false); 
                                    }} 
                                    className={`px-3 py-2 rounded-lg text-xs font-medium border ${uploadSettings.game === g ? 'bg-[#0c0c0e] text-[#d8b17e] border-[#d8b17e]' : 'bg-[#0c0c0e] text-zinc-400 border-zinc-800'}`}
                                >
                                    {g}
                                </button>
                            ))}
                            <button 
                                onClick={() => setIsAddingNewGame(!isAddingNewGame)} 
                                className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1 ${isAddingNewGame ? 'bg-[#0c0c0e] text-[#d8b17e] border-[#d8b17e]' : 'bg-[#0c0c0e] text-zinc-400 border-zinc-800'}`}
                            >
                                {isAddingNewGame ? '취소' : '+ 추가'}
                            </button>
                        </div>
                        
                        {isAddingNewGame && (
                            <div className="mt-2 animate-in slide-in-from-top-1">
                                <input 
                                    type="text" 
                                    placeholder="새 게임 이름 입력" 
                                    value={newGameName} 
                                    onChange={(e) => { 
                                        setNewGameName(e.target.value); 
                                        setUploadSettings(p => ({ ...p, game: e.target.value })); 
                                    }} 
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:border-[#d8b17e] focus:outline-none"
                                />
                            </div>
                        )}
                    </div>

                    {/* 연도 설정 영역 */}
                    <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">연도 설정</label>
                        <select 
                            className="w-full bg-[#0c0c0e] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-[#d8b17e] focus:outline-none focus:border-[#d8b17e]" 
                            value={uploadSettings.year} 
                            onChange={(e) => setUploadSettings(p => ({ ...p, year: e.target.value }))}
                        >
                            {[0, 1, 2, 3, 4].map(i => { 
                                const y = new Date().getFullYear() - i; 
                                return <option key={y} value={y}>{y}년</option> 
                            })}
                        </select>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={handleClose} 
                        className="flex-1 py-3 rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors text-xs font-bold"
                    >
                        취소
                    </button>
                    <button 
                        onClick={confirmUpload} 
                        className="flex-1 border border-zinc-700 hover:border-[#d8b17e] text-[#d8b17e] hover:text-yellow-400 py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                    >
                        <Upload className="w-4 h-4" /> 업로드 시작
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UploadModal;