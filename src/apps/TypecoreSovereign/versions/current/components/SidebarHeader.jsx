/* eslint-disable */
// current 사이드바 상단 툴바: 버전 셀렉터 + 생성/리터칭 슬라이딩 토글.
import React from 'react';
import { PenTool, Edit3 } from 'lucide-react';

const SidebarHeader = ({ version, setVersion, versions, isEditMode, setCurrentView }) => (
  <div className="shrink-0 z-20 border-b border-zinc-800/80 bg-[#1A1A1A]">
    <div className="p-4 space-y-3">
      {/* 버전 셀렉터 — 토글 위 */}
      {versions?.length > 0 && setVersion && (
        <div className="flex items-center gap-1 bg-[#0A0A0A] border border-zinc-800/60 rounded-full p-1">
          {versions.map((v) => {
            const isActive = v.key === version;
            return (
              <button
                key={v.key}
                onClick={() => setVersion(v.key)}
                title={`${v.label} 버전으로 전환`}
                className={`flex-1 px-2 py-1 rounded-full text-[10px] font-bold tracking-[0.04em] transition-all whitespace-nowrap ${
                  isActive ? '' : 'text-zinc-500 hover:text-zinc-300'
                }`}
                style={isActive ? { background: `${v.color}22`, color: v.color } : undefined}
              >
                {v.label}
              </button>
            );
          })}
        </div>
      )}
      {/* 생성/리터칭 토글 */}
      <div className="flex rounded-md p-1 bg-[#1A1A1A] border border-zinc-800 relative">
        <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded shadow-[0_1px_3px_rgba(0,0,0,0.5)] bg-[#2C2C2C] transition-all duration-300 ${!isEditMode ? 'left-1' : 'left-[calc(50%+2px)]'}`} />
        <button onClick={() => setCurrentView('editor')} className={`flex-1 py-1.5 text-[11px] font-bold rounded relative z-10 flex items-center justify-center gap-1.5 whitespace-nowrap ${!isEditMode ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
          <PenTool className="w-3.5 h-3.5 shrink-0" /> <span>생성 어셈블리</span>
        </button>
        <button onClick={() => setCurrentView('edit')} className={`flex-1 py-1.5 text-[11px] font-bold rounded relative z-10 flex items-center justify-center gap-1.5 whitespace-nowrap ${isEditMode ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
          <Edit3 className="w-3.5 h-3.5 shrink-0" /> <span>마이크로 리터칭</span>
        </button>
      </div>
    </div>
  </div>
);

export default SidebarHeader;
