import { useState } from 'react';
import { X, Upload, Globe, Lock } from 'lucide-react';

const EMPTY_SCAN = { rawCount: 0, extOk: 0, blacklisted: 0, noDesignFolder: 0, notDirectChild: 0, noDeviceMatch: 0, pickedFiles: 0, groups: [] };

const UploadModal = ({
    isOpen,
    onClose,
    pendingFiles,
    setPendingFiles,
    scan: scanProp,
    uploadSettings,
    setUploadSettings,
    confirmUpload
}) => {
    // UI 관련 상태는 컴포넌트 내부로 가져왔습니다.
    const [isAddingNewGame, setIsAddingNewGame] = useState(false);
    const [newGameName, setNewGameName] = useState('');

    // 사전 스캔 결과는 부모(handleFileUpload)에서 ProcessingModal 안에서 미리 계산해 prop 으로 전달.
    // 여기서 직접 계산하면 큰 폴더(수천~수만 파일)에서 모달 첫 paint 가 freeze 됨.
    const scan = scanProp || EMPTY_SCAN;
    const campaignCount = scan.groups.length;
    const previewGroups = scan.groups.slice(0, 5);
    const hasMore = scan.groups.length > 5;

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
                
                {/* 사전 스캔 요약 — 실제 등록될 캠페인 수와 누락 사유를 한눈에. */}
                <div className="space-y-2 text-xs bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                        <span className="text-zinc-500">스캔된 파일</span>
                        <span className="text-zinc-300 font-mono">{scan.rawCount.toLocaleString()}개</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-zinc-500">→ 등록 대상 파일</span>
                        <span className="text-zinc-300 font-mono">{scan.pickedFiles.toLocaleString()}개</span>
                    </div>
                    <div className="h-px bg-white/5 my-1" />
                    <div className="flex items-center justify-between">
                        <span className="text-emerald-400 font-bold">등록 예정 캠페인</span>
                        <span className="text-emerald-300 font-mono font-bold">{campaignCount.toLocaleString()}개</span>
                    </div>
                    {/* 누락 사유 — 디버깅용. 0이면 표시 안 함. */}
                    {(scan.noDesignFolder + scan.notDirectChild + scan.noDeviceMatch + scan.blacklisted) > 0 && (
                        <details className="mt-2 pt-2 border-t border-white/5">
                            <summary className="text-[10px] text-zinc-500 cursor-pointer hover:text-zinc-300">제외된 파일 사유 보기</summary>
                            <div className="mt-2 space-y-1 text-[10px] text-zinc-500">
                                {scan.blacklisted > 0 && <div>· 블랙리스트(개발/팝업/popup): {scan.blacklisted.toLocaleString()}개</div>}
                                {scan.noDesignFolder > 0 && <div>· '디자인' 폴더 외부: {scan.noDesignFolder.toLocaleString()}개</div>}
                                {scan.notDirectChild > 0 && <div>· pc/mobile 직속 아님 (crop 등): {scan.notDirectChild.toLocaleString()}개</div>}
                                {scan.noDeviceMatch > 0 && <div>· pc/mobile 아닌 폴더 (banner 등): {scan.noDeviceMatch.toLocaleString()}개</div>}
                            </div>
                        </details>
                    )}
                </div>

                {/* 캠페인 미리보기 — 처음 5개. */}
                {previewGroups.length > 0 && (
                    <div className="text-xs">
                        <div className="text-zinc-500 mb-1.5">캠페인 미리보기</div>
                        <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                            {previewGroups.map((g, i) => (
                                <div key={i} className="flex items-center gap-2 text-[10px] text-zinc-400 py-0.5">
                                    <span className="flex-1 truncate" title={g.title}>{g.title}</span>
                                    <span className={`font-mono ${g.hasPc ? 'text-emerald-400' : 'text-zinc-700'}`}>PC</span>
                                    <span className={`font-mono ${g.hasMo ? 'text-emerald-400' : 'text-zinc-700'}`}>MO</span>
                                </div>
                            ))}
                            {hasMore && (
                                <div className="text-[10px] text-zinc-600 italic pt-1">…외 {(scan.groups.length - 5).toLocaleString()}개</div>
                            )}
                        </div>
                    </div>
                )}

                {/* 캠페인 0개일 때 경고. */}
                {campaignCount === 0 && (
                    <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
                        ⚠️ 등록될 캠페인이 0개입니다. 선택한 폴더에 '03.디자인/pc/' 또는 '03.디자인/mobile/' 직속 jpg/png 파일이 있는지 확인해주세요.
                    </div>
                )}

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

                    {/* 공개 범위 — 비공개는 본인만 조회 가능. */}
                    <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">공개 범위</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setUploadSettings(p => ({ ...p, visibility: 'public' }))}
                                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                                    (uploadSettings.visibility || 'public') === 'public'
                                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40'
                                        : 'bg-[#0c0c0e] text-zinc-500 border-zinc-800 hover:text-zinc-300'
                                }`}
                                title="모두에게 공유"
                            >
                                <Globe className="w-3.5 h-3.5" /> 공용
                            </button>
                            <button
                                type="button"
                                onClick={() => setUploadSettings(p => ({ ...p, visibility: 'private' }))}
                                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                                    uploadSettings.visibility === 'private'
                                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/40'
                                        : 'bg-[#0c0c0e] text-zinc-500 border-zinc-800 hover:text-zinc-300'
                                }`}
                                title="본인만 조회"
                            >
                                <Lock className="w-3.5 h-3.5" /> 비공개
                            </button>
                        </div>
                        {uploadSettings.visibility === 'private' && (
                            <div className="text-[10px] text-amber-400/80 mt-1.5 ml-0.5">나만 볼 수 있어요</div>
                        )}
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