/* eslint-disable */
// v1 전용 프롬프트 무결성 검사 결과 모달.
import React from 'react';
import { ScanLine, X, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';

const InspectorModal = ({
    isOpen, onClose, result, selectedResolutionIndex, setSelectedResolutionIndex,
    onApplyResolution,
}) => {
    if (!isOpen || !result) return null;
    return (
        <div className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-[600px] bg-[#121212] border border-zinc-800 rounded-[10px] shadow-2xl flex flex-col relative overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-zinc-800/60 shrink-0 bg-[#1A1A1A]">
                    <div className="flex items-center gap-2.5">
                        <ScanLine className="w-5 h-5 text-zinc-300" />
                        <h3 className="text-white font-bold text-[15px] tracking-wide">프롬프트 무결성 검사</h3>
                    </div>
                    <button onClick={onClose} className="text-[#a6a6a6] hover:text-white transition-colors p-1 rounded-[10px] hover:bg-zinc-800">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar space-y-6 bg-[#121212]">
                    <div className={`p-5 rounded-[10px] border ${result.hasConflict ? 'bg-[#1C1C1C] border-zinc-600' : 'bg-[#1C1C1C] border-zinc-700'}`}>
                        <h4 className={`text-[12px] font-bold flex items-center gap-2 mb-3 ${result.hasConflict ? 'text-zinc-200' : 'text-[#a6a6a6]'}`}>
                            {result.hasConflict ? <><AlertCircle className="w-4 h-4" /> 논리적 충돌 감지됨</> : <><CheckCircle className="w-4 h-4" /> 무결성 검증 완료</>}
                        </h4>
                        <p className="text-[13px] text-[#a6a6a6] leading-relaxed whitespace-pre-wrap">{result.analysisMessage}</p>
                    </div>

                    {result.hasConflict && result.resolutions && result.resolutions.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3 px-1">
                                <Sparkles className="w-4 h-4 text-[#a6a6a6]" />
                                <h4 className="text-[12px] font-bold text-zinc-300">AI 교정 방향 선택</h4>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                {result.resolutions.map((res, idx) => (
                                    <div key={idx} onClick={() => setSelectedResolutionIndex(idx)} className={`p-4 rounded-[10px] border cursor-pointer transition-all ${selectedResolutionIndex === idx ? 'border-purple-500 bg-purple-500/10' : 'border-zinc-800 bg-[#1C1C1C] hover:border-zinc-600'}`}>
                                        <h5 className={`text-[12px] font-bold mb-1.5 ${selectedResolutionIndex === idx ? 'text-purple-300' : 'text-zinc-200'}`}>{res.title}</h5>
                                        <p className="text-[10px] text-[#a6a6a6] leading-relaxed break-keep">{res.desc}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="p-5 bg-[#1C1C1C] border border-zinc-800 rounded-[10px] shadow-inner">
                                <p className="text-[12px] font-sans text-zinc-400 leading-relaxed whitespace-pre-wrap">{result.resolutions[selectedResolutionIndex]?.resolvedPromptKo}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-5 border-t border-zinc-800/60 bg-[#1A1A1A] flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-[10px] text-[12px] font-bold text-[#a6a6a6] hover:text-white hover:bg-zinc-800 transition-colors">
                        닫기
                    </button>
                    {result.hasConflict && result.resolutions && result.resolutions.length > 0 && (
                        <button onClick={onApplyResolution} className="px-6 py-2.5 rounded-[10px] text-[12px] font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md">
                            선택한 교정안 적용
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InspectorModal;
