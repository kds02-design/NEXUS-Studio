/* eslint-disable */
// v2 전용 — 프롬프트 텍스트로부터 설정 복원 모달.
import React from 'react';
import { FileUp, X, Download } from 'lucide-react';

const ImportModal = ({
    isOpen, onClose, importInputValue, setImportInputValue, onImport,
}) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-[600px] bg-[#121212] border border-zinc-800 rounded-[12px] shadow-2xl flex flex-col relative overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-zinc-800/60 shrink-0 bg-[#1A1A1A]">
                    <div className="flex items-center gap-2.5">
                        <FileUp className="w-5 h-5 text-emerald-400" />
                        <h3 className="text-white font-bold text-[15px] tracking-wide">프롬프트로 설정 복원 (Import)</h3>
                    </div>
                    <button onClick={onClose} className="text-[#a6a6a6] hover:text-white transition-colors p-1 rounded-[10px] hover:bg-zinc-800">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 flex flex-col gap-4">
                    <p className="text-[12px] text-zinc-400 leading-relaxed">
                        이전에 생성했던 <span className="text-zinc-200 font-bold">[Base Technical Prompt]</span> 전문을 아래에 붙여넣으세요. 엔진이 텍스트를 분석하여 당시의 모든 패널 설정을 자동으로 복구합니다.
                    </p>
                    <textarea
                        value={importInputValue}
                        onChange={e => setImportInputValue(e.target.value)}
                        placeholder="[TYPECORE V17... MASTER INSTRUCTION] 으로 시작하는 프롬프트를 붙여넣으세요."
                        className="w-full h-[250px] bg-[#0A0A0A] text-[11px] font-sans text-zinc-300 p-4 rounded-[8px] border border-zinc-700 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all custom-scrollbar resize-none"
                    />
                </div>
                <div className="p-5 border-t border-zinc-800/60 bg-[#1A1A1A] flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-[8px] text-[12px] font-bold text-[#a6a6a6] hover:text-white hover:bg-zinc-800 transition-colors">
                        취소
                    </button>
                    <button onClick={onImport} disabled={!importInputValue.trim()} className="px-6 py-2.5 rounded-[8px] text-[12px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md disabled:opacity-50 flex items-center gap-2">
                        <Download className="w-4 h-4" /> 설정 불러오기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImportModal;
