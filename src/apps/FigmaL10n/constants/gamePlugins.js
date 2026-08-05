// 게임별 완성 번역 플러그인 데이터.
// FigmaL10n 앱은 이제 '엑셀 업로드 → 생성'이 아니라, 게임별로 미리 완성된 번역 맵을
// 그대로 플러그인(manifest/code/ui)으로 내려주는 다운로드 허브다.
// 번역이 갱신되면 이 파일의 langMaps 만 수정하면 된다. (엑셀 파서 경로는 사용하지 않음)
//
// langMaps: { [LANG_CONFIG 코드]: { [한국어 원본]: 번역문 } }
//   - 코드는 LANG_CONFIG 키(EN·DE·FR·ES·PT·JA·TW·CN ...)와 일치해야 폰트/표시명이 붙는다.
//   - ready:false 게임은 앱에서 '준비 중'으로 표시된다.
import { TL_LANG_MAPS } from './tlLangMaps';

export const GAME_PLUGINS = {
  tl: {
    key: 'tl',
    label: 'TL',
    name: 'Throne and Liberty',
    color: '#5C7CFA',
    pluginName: 'TL L10N 번역 적용기',
    ready: true,
    // 메뉴 용어 + 페이지 문구(제목·설명) 전체 — TL_NCA 요청서 L10n 시트 추출. 갱신은 tlLangMaps.js.
    langMaps: TL_LANG_MAPS,
  },
  aion2: {
    key: 'aion2',
    label: '아이온2',
    name: 'AION2',
    color: '#F4B860',
    pluginName: '아이온2 L10N 번역 적용기',
    ready: false,
    langMaps: {},
  },
};

// 버전 키 → 게임 데이터. 알 수 없으면 tl 로 폴백.
export function getGamePlugin(versionKey) {
  return GAME_PLUGINS[versionKey] || GAME_PLUGINS.tl;
}
