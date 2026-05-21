/* eslint-disable */
// current 사이드바 상단 — 타이틀 / 버전 / 생성·리터칭 토글.
// 디자인 렉시콘 스타일에 맞춰 단정한 헤더 + 얇은 디바이더.
import React from 'react';
import { PenTool, Edit3 } from 'lucide-react';

const SidebarHeader = ({ version, setVersion, versions, isEditMode, setCurrentView }) => (
  <div className="shrink-0 border-b border-zinc-800">
    <div className="px-5 pt-5 pb-3">
      <h1
        className="text-lg font-bold text-white tracking-wide"
        style={{ fontFamily: "'Noto Sans KR', sans-serif", letterSpacing: '0.5px' }}
      >
        Typecore Sovereign
      </h1>
      <p className="text-[10px] text-zinc-500 mt-1">RPG 타이포그래피 프롬프트 생성기</p>
    </div>

    {/* 버전 셀렉터 — 단정한 칩 그룹 */}
    {versions?.length > 0 && setVersion && (
      <div className="px-3 pb-2">
        <div className="flex items-center gap-1 bg-zinc-900/60 border border-zinc-800 rounded-lg p-0.5">
          {versions.map((v) => {
            const isActive = v.key === version;
            return (
              <button
                key={v.key}
                onClick={() => setVersion(v.key)}
                title={`${v.label} 버전`}
                className={`flex-1 px-2 py-1 rounded-md text-[10px] font-semibold tracking-wide transition-colors whitespace-nowrap ${
                  isActive ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
                style={isActive ? { color: v.color } : undefined}
              >
                {v.label}
              </button>
            );
          })}
        </div>
      </div>
    )}

    {/* 생성/리터칭 모드 토글 — 두꺼운 칩 슬라이더 대신 단정한 분절 탭 */}
    <div className="px-3 pb-3">
      <div className="flex items-center gap-1 bg-zinc-900/60 border border-zinc-800 rounded-lg p-0.5">
        <button
          onClick={() => setCurrentView('editor')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
            !isEditMode ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <PenTool className="w-3 h-3 shrink-0" />
          <span>생성</span>
        </button>
        <button
          onClick={() => setCurrentView('edit')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
            isEditMode ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Edit3 className="w-3 h-3 shrink-0" />
          <span>리터칭</span>
        </button>
      </div>
    </div>
  </div>
);

export default SidebarHeader;
