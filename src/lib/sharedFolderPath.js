// 공유 폴더 경로 빌더 — 사내 파일 서버 \\ppc-file\ 기반.
// 정식 경로 형식:
//   \\ppc-file\{게임폴더}\{연도}\{섹션폴더}\{캠페인폴더}\03.디자인\
//     - 게임폴더 : '1.리니지', '2.아이온', '4.블레이드앤소울' 등
//     - 연도     : '2026'
//     - 섹션폴더 : '프로모션' (PromotionArchive) / '브랜드웹' (BrandWebReview)
//     - 캠페인폴더: '20260325_아지트_1차' 등 (사용자 폴더명)
//
// 사용법:
//   import { buildSharedFolderPath } from '../../lib/sharedFolderPath';
//   const path = buildSharedFolderPath(file, { game: '리니지', year: '2026', section: '브랜드웹' });
//   // → \\ppc-file\1.리니지\2026\브랜드웹\20260325_아지트_1차\03.디자인
//
// File 객체가 webkitRelativePath (input[webkitdirectory]) 를 가지고 있으면 그걸 우선 사용.
// game/year/section 인자가 비어 있으면 path segment 에서 자동 추론.

export const DEFAULT_PATH_PREFIX = '\\\\ppc-file\\';

// 게임명 → 서버 폴더명 매핑.
export const GAME_FOLDER_MAP = {
  '리니지':         '1.리니지',
  '리니지M':        '1.리니지',
  '리니지2M':       '1.리니지',
  '리니지W':        '1.리니지',
  'lineage':        '1.리니지',
  '아이온':         '2.아이온',
  '아이온2':        '2.아이온',
  'aion':           '2.아이온',
  '블소':           '4.블레이드앤소울',
  '블레이드앤소울': '4.블레이드앤소울',
  'bns':            '4.블레이드앤소울',
  '기타':           '',
};

// 섹션 키 → 폴더명. canSend 흐름의 컨벤션.
export const SECTION_FOLDER = {
  promotion: '프로모션',
  brandweb:  '브랜드웹',
};

export const GAMES_FOR_BRANDWEB = ['리니지', '아이온', '블소', '기타'];

const getCanonicalPrefix = () => {
  try { return localStorage.getItem('shared_pathPrefix') || DEFAULT_PATH_PREFIX; }
  catch { return DEFAULT_PATH_PREFIX; }
};

// game 인자에서 정식 폴더명 추출. 정확/부분 매치 양방향 지원.
export function getGameFolder(game) {
  if (!game) return '';
  if (GAME_FOLDER_MAP[game] !== undefined) return GAME_FOLDER_MAP[game];
  const g = String(game).toLowerCase().trim();
  if (!g) return '';
  for (const [key, folder] of Object.entries(GAME_FOLDER_MAP)) {
    if (!folder) continue;
    const k = key.toLowerCase();
    if (g.includes(k) || k.includes(g)) return folder;
  }
  return '';
}

// path segment 들에서 게임/연도 자동 추론.
export function inferFromSegments(parts) {
  let game = '';
  let year = '';
  for (const p of parts) {
    // 게임 폴더: '1.리니지' / '2.아이온' / '4.블레이드앤소울'
    if (!game && /^\d{1,2}\./.test(p)) {
      const rest = p.replace(/^\d{1,2}\./, '');
      for (const folder of Object.values(GAME_FOLDER_MAP)) {
        if (folder === p) { game = p; break; }
      }
      if (!game) {
        // 부분 일치 fallback
        for (const [, folder] of Object.entries(GAME_FOLDER_MAP)) {
          if (folder && folder.endsWith(rest)) { game = folder; break; }
        }
      }
    }
    // 연도: '2026' 또는 '20260325_...' (앞 4자리)
    if (!year) {
      if (/^20\d{2}$/.test(p)) year = p;
      else if (/^20\d{2}\d{4}/.test(p)) year = p.slice(0, 4);
    }
  }
  return { game, year };
}

// File 한 개에서 정식 폴더 경로 빌드.
//   file       : <input webkitdirectory> 가 만든 File (webkitRelativePath 있음).
//                또는 일반 File (webkitRelativePath 없으면 빈 경로 반환).
//   options    : { game?, year?, section? }
//                game/year 가 없으면 file path 에서 자동 추론.
//                section 이 주어지면 path 에 없을 때 자동 prefix.
export function buildSharedFolderPath(file, { game = '', year = '', section = '' } = {}) {
  if (!file) return '';
  const rel = file.webkitRelativePath || '';
  if (!rel) return ''; // webkitdirectory 없이는 폴더 경로 추출 불가

  const parts = rel.split('/');
  parts.pop(); // 파일명 제거

  // 자동 추론 — 사용자가 명시한 값 우선.
  const inferred = inferFromSegments(parts);
  const gameFolder = game ? getGameFolder(game) : inferred.game;
  let yearStr = String(year || '').trim();
  if (!/^20\d{2}$/.test(yearStr)) yearStr = inferred.year || '';

  // 정규화 — 게임/연도/섹션이 path 앞쪽에 없으면 삽입.
  const firstSeg = parts[0] || '';
  const startsWithGameFolder = /^\d{1,2}\./.test(firstSeg);

  let normalized = [...parts];
  if (gameFolder && !startsWithGameFolder) {
    normalized.unshift(gameFolder);
    if (yearStr && !normalized.slice(1).some(p => /^20\d{2}$/.test(p))) {
      normalized.splice(1, 0, yearStr);
    }
  } else if (yearStr && !normalized.some(p => /^20\d{2}$/.test(p))) {
    normalized.splice(1, 0, yearStr);
  }

  // 섹션 삽입 — 연도 뒤. '프로모션'/'브랜드웹' 둘 다 path 어디에도 없으면 추가.
  const sectionName = SECTION_FOLDER[section] || section;
  if (sectionName && !normalized.includes(sectionName)) {
    const yearIdx = normalized.findIndex(p => /^20\d{2}$/.test(p));
    if (yearIdx >= 0) normalized.splice(yearIdx + 1, 0, sectionName);
    else normalized.push(sectionName);
  }

  return getCanonicalPrefix() + normalized.join('\\');
}

// 여러 파일에서 공통 부모 폴더 경로 1개 추출 — webkitdirectory 케이스에서 사용.
// 모든 파일의 webkitRelativePath 가 같은 prefix 를 공유한다고 가정.
export function pickSharedFolderFromFiles(fileList, options) {
  const arr = Array.from(fileList || []);
  if (!arr.length) return '';
  // 첫 파일 기준으로 빌드. webkitRelativePath 가 없으면 빈 문자열.
  return buildSharedFolderPath(arr[0], options);
}
