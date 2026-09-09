// 앱 상단 뷰 전환 탭 — 핸드오프 문맥이 있을 때만 렌더. 루비콘 포지 = NEXUS Preview 에서 조합할 KV 재료(배경·캐릭터·타이틀·아이템·광원)를 만드는 이미지 도구.
// 평소(키비주얼 편집만)에는 탭이 하나뿐이라 헤더를 숨기고, KvEdit 내부 모드 세그먼트가 상단 내비 역할을 한다.
// 리스킨(creation) / 리디자인(micro-edit) / 프레임 세트(atlas) 는 수동 탭에서 내렸지만 엔진과 뷰는 살아 있다:
// KV 컴포저의 프레임 핸드오프(단일 → creation/micro-edit, 세트 → atlas)와 PromotionArchive 마스터 템플릿 핸드오프가
// setCurrentView 로 진입시키면 그 뷰의 탭이 문맥 탭으로 나타나 키비주얼 편집과 오갈 수 있다. (2026-09 정리)
// index.jsx 최상단으로 리프트되어 모든 뷰에서 보인다. (광원·빛효과는 키비주얼 편집 내부 모드)

import { Image as ImageIcon, LayoutTemplate, Sparkles, Grid2x2 } from 'lucide-react';

// 핸드오프로만 진입하는 뷰 — 현재 뷰가 이 중 하나일 때만 탭으로 노출.
const HANDOFF_VIEWS = {
  'creation':   { Icon: LayoutTemplate, label: '리스킨' },
  'micro-edit': { Icon: Sparkles,       label: '리디자인' },
  'atlas':      { Icon: Grid2x2,        label: '프레임 세트' },
};

export default function ForgeHeader({ currentView, setCurrentView, handoffView }) {
  const tab = (id, Icon, label, badge) => (
    <button
      key={id}
      onClick={() => setCurrentView(id)}
      className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-md text-[12px] font-bold transition-all ${currentView === id ? 'bg-[#2A2A2E] text-white shadow-md border border-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{label}</span>
      {badge && <span className="ml-1 shrink-0 rounded px-1 py-0.5 text-[8px] font-bold leading-none bg-zinc-700/70 text-zinc-300">{badge}</span>}
    </button>
  );
  // 현재 뷰 또는 마지막 핸드오프 뷰 — 키비주얼 편집으로 돌아갔다가 다시 핸드오프 결과로 돌아올 수 있게.
  const contextId = HANDOFF_VIEWS[currentView] ? currentView : (HANDOFF_VIEWS[handoffView] ? handoffView : null);
  const ctx = contextId ? HANDOFF_VIEWS[contextId] : null;
  // 핸드오프 문맥이 없으면 탭이 하나뿐이라 의미가 없다 — 헤더 자체를 숨긴다. (키비주얼 편집은 내부 모드 세그먼트가 이미 있음)
  if (!ctx) return null;

  return (
    <div className="px-4 py-3 border-b border-zinc-800/50 shrink-0">
      <div className="flex bg-[#111111] p-1.5 rounded-lg border border-zinc-800/50 w-full max-w-[620px] shadow-inner gap-1">
        {tab('kvedit', ImageIcon, '키비주얼 편집')}
        {tab(contextId, ctx.Icon, ctx.label, '핸드오프')}
      </div>
    </div>
  );
}
