import { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm }) => {
    const [password, setPassword] = useState('');

    // 모달이 열릴 때마다 입력창 초기화
    useEffect(() => {
        if (isOpen) setPassword('');
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (password === '1234') {
            onConfirm(); // 부모 컴포넌트의 삭제 함수 실행
            onClose();   // 모달 닫기
        } else {
            alert("비밀번호가 일치하지 않습니다.");
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200" 
            onClick={onClose}
        >
            <div 
                className="bg-[#1e1e20] border border-zinc-700 rounded-2xl p-6 w-full max-w-xs shadow-2xl" 
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-2">
                        <Lock className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">삭제 확인</h3>
                        <p className="text-zinc-400 text-sm mt-1">삭제하려면 비밀번호를 입력하세요.</p>
                    </div>
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleConfirm()} 
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-center text-white focus:border-red-500 focus:outline-none tracking-widest text-lg"
                        placeholder="비밀번호"
                        autoFocus
                    />
                    <div className="flex gap-2 w-full mt-2">
                        <button 
                            onClick={onClose} 
                            className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white font-bold text-sm"
                        >
                            취소
                        </button>
                        <button 
                            onClick={handleConfirm} 
                            className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm"
                        >
                            삭제
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmModal;