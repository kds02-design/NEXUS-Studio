// RubiconForge 엔트리포인트. 비지니스 로직은 useForgePrompt / usePresets 훅에 위임하고
// 여기서는 컴포넌트 컴포지션 + 글로벌 에러 토스트 + 외부 payload 수신만 담당.

import { useEffect } from 'react';
import { AlertCircle, X, Layers } from 'lucide-react';
import { useGlobal } from '../../context/GlobalContext';
import { useForgePrompt } from './hooks/useForgePrompt';
import { usePresets } from './hooks/usePresets';
import ForgeSidebar from './components/ForgeSidebar';
import ForgeResultPanel from './components/ForgeResultPanel';

// 외부에서 받은 dataURL/일반 URL 을 atlasSource 용 dataURL 로 변환.
// CORS 가능한 호스트(Cloudinary 등)는 fetch + FileReader 로, 안 되면 직접 src 로 fallback.
async function loadImageAsDataUrl(url) {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('[RubiconForge] payload image fetch failed, using URL directly', e);
    return url;
  }
}

export default function App() {
  const forge = useForgePrompt();
  usePresets();
  const { payload, clearPayload } = useGlobal();

  // 외부 앱(PromotionArchive 마스터 템플릿 송신 등) payload 수신.
  // params.atlasSpec / atlasTitle / view = 'atlas' / image.url 가 있으면 디자인 시스템 탭으로 자동 전환 + 프리로드.
  useEffect(() => {
    if (!payload) return;
    const params = payload.params || {};
    const isAtlasHandoff = params.view === 'atlas' || params.atlasSpec || params.masterTemplateId;
    if (!isAtlasHandoff) return;

    let cancelled = false;
    (async () => {
      if (params.atlasSpec) forge.setAtlasSpec(String(params.atlasSpec));
      if (params.atlasTitle) forge.setAtlasSpecTitle(String(params.atlasTitle));
      forge.setCurrentView('atlas');
      const url = payload.image?.url;
      if (url) {
        const dataUrl = await loadImageAsDataUrl(url);
        if (!cancelled && dataUrl) forge.setAtlasSource(dataUrl);
      }
      clearPayload();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload]);

  return (
    <div className={`flex flex-col h-screen ${forge.theme === 'dark' ? 'bg-[#030304] text-zinc-100' : 'bg-white text-zinc-900'} overflow-hidden relative`} style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap');
        .custom-scrollbar::-webkit-scrollbar { width: 2px; height: 2px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(161, 161, 170, 0.1); border-radius: 10px; transition: background 0.3s; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(161, 161, 170, 0.3); }
      `}</style>

      {forge.errorMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-red-500/95 text-white px-6 py-3 rounded-md font-bold text-[12px] shadow-[0_10px_30px_rgba(239,68,68,0.3)] z-[1000] flex items-center gap-3 animate-in slide-in-from-top-4">
            <AlertCircle className="w-4 h-4" />
            {forge.errorMsg}
            <button onClick={() => forge.setErrorMsg(null)} className="ml-2 hover:bg-white/20 p-1 rounded-full transition-colors"><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* 마스터 템플릿 송신 알림 — 디자인 시스템 탭에서 spec 이 활성화됐을 때 */}
      {forge.currentView === 'atlas' && forge.atlasSpec && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-fuchsia-500/95 text-white px-5 py-2.5 rounded-md font-bold text-[11px] shadow-[0_10px_30px_rgba(217,70,239,0.35)] z-[1000] flex items-center gap-3 animate-in slide-in-from-top-4">
            <Layers className="w-3.5 h-3.5" />
            마스터 적용 중{forge.atlasSpecTitle ? `: ${forge.atlasSpecTitle}` : ''} — 모든 변형에 명세가 주입됩니다
            <button
              onClick={() => { forge.setAtlasSpec(''); forge.setAtlasSpecTitle(''); }}
              className="ml-2 hover:bg-white/20 p-1 rounded-full transition-colors"
              title="마스터 명세 해제"
            >
              <X className="w-3 h-3" />
            </button>
        </div>
      )}

      <main className="flex-1 flex overflow-hidden">
        <ForgeSidebar forge={forge} />
        <ForgeResultPanel forge={forge} />
      </main>
    </div>
  );
}
