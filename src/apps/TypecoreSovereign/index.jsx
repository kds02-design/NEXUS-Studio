// Typecore Sovereign — 진입점.
// 버전 셀렉터는 PromptEngine 내부 사이드바 헤더(생성/리터칭 토글 위)에 인라인 노출.
// 글로벌 VersionSubHeader는 Shell.jsx에서 typecore-sovereign 일 때 렌더하지 않음.
//
// current(latest)만 정적 import — 레지스트리가 노출하는 유일한 라우팅 버전이라 첫 페인트 지연 없음.
// 아카이브 버전(v1/v2/friendly)은 React.lazy 로 코드 스플리팅 — 선택했을 때만 청크 로드.
import { Suspense, lazy } from "react";
import EngineLatest from "./versions/current/PromptEngine";

const EngineFriendly = lazy(() => import("./versions/friendly/PromptEngine"));
const EngineV1 = lazy(() => import("./versions/v1/PromptEngine"));
const EngineV2 = lazy(() => import("./versions/v2/PromptEngine"));

const ENGINES = {
  friendly: EngineFriendly,
  v1:       EngineV1,
  v2:       EngineV2,
  latest:   EngineLatest,
};

export default function TypecoreSovereign({ version = "latest", setVersion, versions }) {
  const Engine = ENGINES[version] || ENGINES.latest;
  return (
    <div style={{ height: "100%", background: "#0f1115" }}>
      <Suspense fallback={<div className="h-full flex items-center justify-center text-[12px] text-zinc-500">버전 불러오는 중…</div>}>
        <Engine key={version} version={version} setVersion={setVersion} versions={versions} />
      </Suspense>
    </div>
  );
}
