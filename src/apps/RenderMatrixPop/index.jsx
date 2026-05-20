// Render Matrix: Pop — 진입점.
// Shell의 Topbar 중앙 탭에서 버전을 선택하면 prop으로 내려옴.
import { lazy, Suspense } from 'react';

const ENGINES = {
  v1:      lazy(() => import('./versions/v1/PromptEngine.jsx')),
  current: lazy(() => import('./versions/current/PromptEngine.jsx')),
};

const FALLBACK_LABEL = { v1: 'v1 안정', current: '최신' };

export default function RenderMatrixPop({ version = 'current' }) {
  const Engine = ENGINES[version] || ENGINES.current;
  return (
    <div className="h-full w-full">
      <Suspense fallback={
        <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400 dark:bg-[#0A0A0A] dark:text-zinc-500 text-xs gap-2">
          <span className="w-3 h-3 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
          Loading {FALLBACK_LABEL[version] || '최신'}…
        </div>
      }>
        <Engine key={version} />
      </Suspense>
    </div>
  );
}
