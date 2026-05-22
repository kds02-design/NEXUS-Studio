// Typecore Sovereign — 진입점.
// 버전 셀렉터는 PromptEngine 내부 사이드바 헤더(생성/리터칭 토글 위)에 인라인 노출.
// 글로벌 VersionSubHeader는 Shell.jsx에서 typecore-sovereign 일 때 렌더하지 않음.
//
// React.lazy 미사용 — 번들 크기 증가보다 폰트 깜빡임/지연 렌더 UX 회피가 우선.
// 세 버전 모두 직접 import 하여 Shell 마운트와 동시에 평가됨.
import EngineFriendly from "./versions/friendly/PromptEngine";
import EngineV1 from "./versions/v1/PromptEngine";
import EngineV2 from "./versions/v2/PromptEngine";
import EngineLatest from "./versions/current/PromptEngine";

const ENGINES = {
  friendly: EngineFriendly,
  v1:       EngineV1,
  v2:       EngineV2,
  latest:   EngineLatest,
};

export default function TypecoreSovereign({ version = "friendly", setVersion, versions }) {
  const Engine = ENGINES[version] || ENGINES.friendly;
  return (
    <div style={{ height: "100%", background: "#0f1115" }}>
      <Engine key={version} version={version} setVersion={setVersion} versions={versions} />
    </div>
  );
}
