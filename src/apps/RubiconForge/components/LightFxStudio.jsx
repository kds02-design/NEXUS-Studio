// 광원·빛효과 스튜디오 — KvEdit '광원·빛효과' 모드 본체.
// 좌측 옵션(ForgeLightFxOptions) + 우측 결과(ForgeLightFxPanel)를 기존 사이드바+패널 레이아웃으로 재현.
// lightfx 상태/핸들러/세이브 토스트는 forge(useForgePrompt)에 그대로 있고 여기로 주입만 한다.
import ForgeLightFxOptions from './ForgeLightFxOptions';
import ForgeLightFxPanel from './ForgeLightFxPanel';

export default function LightFxStudio({ forge }) {
  if (!forge) return null;
  return (
    <div className="flex-1 flex overflow-hidden h-full min-h-0 rounded-xl border border-zinc-800/60 bg-[#0b0b0d]">
      <aside className="w-[min(420px,42vw)] min-w-[300px] border-r border-zinc-800/60 bg-[#0F0F12] flex flex-col shrink-0">
        <ForgeLightFxOptions forge={forge} />
      </aside>
      <ForgeLightFxPanel forge={forge} />
    </div>
  );
}
