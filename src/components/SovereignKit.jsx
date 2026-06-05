// SovereignKit — TypecoreSovereign 의 "초보자 5분 온보딩" UI 패턴을 다른 앱에서 재사용하기 위한 공용 컴포넌트.
//
// 핵심 디자인 원칙:
//   1) 번호 매김 단계(Step 1, 2, 3...) — 첫 사용자가 무엇부터 할지 시각적으로 명확
//   2) FRIENDLY 사전 — 전문용어를 한국어로 매핑, 원본 용어는 title 툴팁으로 보존
//   3) 고급 옵션 토글 — 처음엔 상단 3개만 보이고, 세부 옵션은 펼침 영역으로 숨김
//
// 사용 예 (앱 사이드바):
//   <StepCard step="1" accent={app.color} title="어떤 글자?" hint="실제로 그려질 텍스트" pro="Subject Text">
//     <textarea ... />
//   </StepCard>
//   <AdvancedToggle open={open} onToggle={() => setOpen(v => !v)}>
//     <SectionGroup>...</SectionGroup>
//   </AdvancedToggle>
import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

// Quick Start 카드 — 항상 펼쳐진 강조 카드. 좌측 단계 번호 배지.
// step: 1, 2, 3 같은 순서 번호. accent 는 앱 포인트 컬러.
export const StepCard = ({ step, accent = '#A29BFE', title, hint, pro, children }) => (
  <div
    className="rounded-[12px] border border-zinc-800 bg-[#161616] p-3 transition-colors hover:border-zinc-700"
    title={pro || undefined}
  >
    <div className="mb-2 flex items-center gap-2">
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
        style={{ background: `${accent}1f`, color: accent, border: `1px solid ${accent}55` }}
      >
        {step}
      </div>
      <div className="min-w-0">
        <div className="text-[12px] font-bold text-zinc-100 leading-none">{title}</div>
        {hint && <div className="text-[10px] text-zinc-500 mt-1 leading-snug">{hint}</div>}
      </div>
    </div>
    <div className="space-y-2.5">{children}</div>
  </div>
);

// 일관된 라벨 + 보조 설명 헤더 — StepCard 내부의 각 필드 위에 사용.
// pro 가 있으면 호버 시 원본 전문용어가 툴팁으로 노출됨.
export const FieldHeader = ({ icon, label, hint, right, pro }) => (
  <div className="mb-1.5 flex items-start justify-between gap-2" title={pro || undefined}>
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-zinc-200">
        {icon}
        <span>{label}</span>
      </div>
      {hint && <div className="text-[10px] text-zinc-500 mt-0.5 leading-snug">{hint}</div>}
    </div>
    {right && <div className="shrink-0">{right}</div>}
  </div>
);

// 고급 옵션 토글 — 한 번의 클릭으로 세부 옵션 묶음을 펼치고 접는다.
// 처음 진입한 초보자에겐 닫혀 있어 상단 StepCard 만 보이고, 고급 사용자만 펼침.
// overflow-hidden 으로 자식 콘텐츠가 박스 모서리/border 를 침범하는 것 방지.
export const AdvancedToggle = ({ open, onToggle, label = '고급 옵션', sublabel, accent = '#A29BFE', children }) => (
  <div className="rounded-[12px] border border-zinc-800/80 bg-[#0e0e10] overflow-hidden">
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-zinc-900/60"
    >
      <div className="min-w-0">
        <div className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
          <span style={{ color: accent }}>⚙</span>
          <span>{label}</span>
        </div>
        {sublabel && <div className="text-[10px] text-zinc-500 mt-0.5">{sublabel}</div>}
      </div>
      {open ? <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />}
    </button>
    {open && <div className="px-3 pb-3 pt-1 space-y-3 border-t border-zinc-800/80 overflow-hidden">{children}</div>}
  </div>
);

// 사이드바 헤더 — Quick Start 모드 안내 문구. 각 앱별 1-2 줄 안내.
// 예) "① 텍스트 → ② 분위기 → ③ 프리셋 순서로 채우면 5분 안에 결과가 나옵니다."
export const QuickStartHeader = ({ title, steps, accent = '#A29BFE' }) => (
  <div className="rounded-[12px] border border-zinc-800/80 bg-[#0e0e10] px-3 py-2.5">
    <div className="text-[11px] font-bold tracking-wide" style={{ color: accent }}>
      {title}
    </div>
    {steps && <div className="text-[10px] text-zinc-400 mt-1 leading-snug">{steps}</div>}
  </div>
);

// 친근 라벨 사전 헬퍼 — 각 앱마다 FRIENDLY 객체를 정의하고, 이걸 getFriendly(dict, key) 로 꺼냄.
// 누락 시 key 자체를 라벨로 폴백.
export const getFriendly = (dict, key) => {
  const e = dict?.[key];
  if (!e) return { label: key, hint: '', pro: '' };
  return { label: e.label || key, hint: e.hint || '', pro: e.pro || '' };
};
