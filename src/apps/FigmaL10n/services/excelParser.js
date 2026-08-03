// 엑셀 번역표 파싱 + 시트/헤더 자동 탐지 + 언어 자동 감지 + 번역 맵 빌드.
// xlsx 는 무거우므로 호출 시점에 동적 import (BriefStudio officeExtract 와 동일 패턴).
//
// 두 가지 레이아웃을 하나의 알고리즘으로 처리한다:
//  (A) 단순 형식 — 헤더 1행, 언어당 1컬럼 (KR/EN/JA ...)
//  (B) 요청서 형식(TL_NCA) — 여러 시트 중 'L10n', 병합된 언어 헤더가
//      언어당 2컬럼에 걸쳐 있고, 한 행에 2개 항목이 들어가는 피벗 레이아웃.
//      코드도 JP·es-MX·pt-BR 처럼 지역 접미사가 붙는다.
import { LANG_CONFIG, META_COLUMNS } from '../constants/langConfig';

// 파일 → SheetJS workbook. 호출부에서 try/catch.
export async function readWorkbook(file) {
  const XLSX = await import('xlsx');
  const data = await file.arrayBuffer();
  return XLSX.read(data, { type: 'array' });
}

// 헤더 정규화 — 양끝 공백/BOM/개행/NBSP 제거 후 대문자화.
// JS \s 는 BOM(U+FEFF)·NBSP(U+00A0) 까지 포함하므로 'kr' / 'KR ' / ' KR\n' 등을 모두 'KR' 로 맞춘다.
function normalizeHeader(col) {
  if (col == null) return '';
  return String(col).replace(/^\s+|\s+$/g, '').toUpperCase();
}

// 한국어 원본(source) 헤더 토큰 — 감지 대상이 아니라 번역 키로 쓰인다.
const SOURCE_CODES = new Set(['KR', 'KO', 'KOR', 'KO-KR', 'KOKR']);
function isSourceToken(norm) {
  return SOURCE_CODES.has(norm.replace(/_/g, '-'));
}

// 지역 접미사·표기 변형을 LANG_CONFIG 키로 정규화.
// 대부분은 하이픈 앞부분(es-MX→ES)으로 처리되고, zh·jp 계열만 명시 별칭이 필요하다.
const CODE_ALIAS = {
  JP: 'JA', JPN: 'JA', 'JA-JP': 'JA',
  ZH: 'CN', 'ZH-CN': 'CN', 'ZH-HANS': 'CN', 'ZH-HANS-CN': 'CN', ZHCN: 'CN', CMN: 'CN',
  'ZH-TW': 'TW', 'ZH-HANT': 'TW', 'ZH-HANT-TW': 'TW', ZHTW: 'TW',
  IN: 'ID', 'ID-ID': 'ID',
};

// 헤더 토큰 → LANG_CONFIG 키. 언어가 아니면 null.
function normalizeCode(raw) {
  const t = normalizeHeader(raw).replace(/_/g, '-');
  if (!t) return null;
  if (LANG_CONFIG[t]) return t;
  if (CODE_ALIAS[t]) return CODE_ALIAS[t];
  const base = t.split('-')[0];
  if (LANG_CONFIG[base]) return base;
  if (CODE_ALIAS[base]) return CODE_ALIAS[base];
  return null;
}

// '제목(필수)' / '제목 (필수)' → ['제목', '(필수)'] 형태로 분리.
// KR 과 번역값을 함께 받아 양쪽이 같은 괄호 구조일 때만 분리한다.
function splitByParen(kr, val) {
  const mKr = kr.match(/^(.+?)(\([^()]+\))$/);
  const mVal = val.match(/^(.+?)(\([^()]+\))$/);
  if (mKr && mVal) {
    return [
      [mKr[1].trim(), mVal[1].trim()],
      [mKr[2].trim(), mVal[2].trim()],
    ];
  }
  return null;
}

// 셀 원값 → 트림된 문자열 (빈 값은 null).
function cellText(v) {
  if (v == null) return null;
  const s = String(v).replace(/^\s+|\s+$/g, '');
  return s === '' ? null : s;
}

// 워크시트 저수준 접근 헬퍼 묶음. (getRaw: 표시값 우선, 병합 헤더 전개 포함)
function makeSheetAccess(XLSX, ws) {
  const getRaw = (r, c) => {
    const cell = ws[XLSX.utils.encode_cell({ r, c })];
    if (cell == null) return null;
    return cell.w != null ? cell.w : cell.v;
  };
  // 병합 셀 내부 좌표 → 좌상단 좌표. (헤더 병합 전개용)
  const mergeMap = new Map();
  for (const m of ws['!merges'] || []) {
    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) {
        if (r !== m.s.r || c !== m.s.c) mergeMap.set(r + ':' + c, [m.s.r, m.s.c]);
      }
    }
  }
  // 병합 헤더는 좌상단에만 값이 있으므로, 빈 칸이면 소속 병합의 좌상단 값을 끌어온다.
  const headerVal = (row, c) => {
    let v = getRaw(row, c);
    if (v == null || String(v).trim() === '') {
      const tl = mergeMap.get(row + ':' + c);
      if (tl) v = getRaw(tl[0], tl[1]);
    }
    return v;
  };
  return { getRaw, headerVal };
}

// 한 시트에서 헤더 행 후보를 찾는다. (source + 언어 코드가 함께 있는 행 중 언어가 가장 많은 행)
function scanHeaderRow(XLSX, ws, range) {
  const { getRaw } = makeSheetAccess(XLSX, ws);
  const maxR = Math.min(range.s.r + 30, range.e.r);
  let best = null;
  for (let r = range.s.r; r <= maxR; r++) {
    let hasSrc = false;
    const langs = new Set();
    for (let c = range.s.c; c <= range.e.c; c++) {
      const raw = getRaw(r, c);
      if (raw == null) continue;
      const norm = normalizeHeader(raw);
      if (!norm || META_COLUMNS.includes(norm)) continue;
      if (isSourceToken(norm)) { hasSrc = true; continue; }
      const code = normalizeCode(raw);
      if (code) langs.add(code);
    }
    if (hasSrc && langs.size > 0 && (!best || langs.size > best.score)) {
      best = { row: r, score: langs.size };
    }
  }
  return best;
}

// workbook 분석 → { ok, error?, rows, sheetName, detected, unknownCols, langMaps }.
// sheetName 지정 시 그 시트만, 미지정 시 전체 시트를 훑어 번역표 시트를 자동 선택.
// splitParen 으로 괄호 분리 키 생성 여부 제어.
export async function analyzeWorkbook(workbook, { sheetName = '', splitParen = true } = {}) {
  if (!workbook) return { ok: false, error: '업로드된 파일이 없습니다.' };
  const XLSX = await import('xlsx');

  const wanted = sheetName.trim();
  const candidates = wanted
    ? (workbook.Sheets[wanted] ? [wanted] : [])
    : workbook.SheetNames;
  if (candidates.length === 0) {
    return { ok: false, error: `시트 "${wanted}"를 찾을 수 없습니다. 사용 가능한 시트: ${workbook.SheetNames.join(', ')}` };
  }

  // 시트 + 헤더 행 자동 선택 — 언어가 가장 많이 감지되는 조합.
  let best = null;
  for (const name of candidates) {
    const ws = workbook.Sheets[name];
    if (!ws || !ws['!ref']) continue;
    const range = XLSX.utils.decode_range(ws['!ref']);
    const hit = scanHeaderRow(XLSX, ws, range);
    if (hit && (!best || hit.score > best.score)) {
      best = { name, ws, range, headerRow: hit.row, score: hit.score };
    }
  }
  if (!best) {
    return {
      ok: false,
      error: `KR(원본) 컬럼이 있는 번역표를 찾지 못했습니다. 시트: ${workbook.SheetNames.join(', ')}. `
        + `한 행에 KR 컬럼과 언어 컬럼(EN·JP 등)이 함께 있어야 합니다.`,
    };
  }

  const { ws, range, headerRow } = best;
  const { getRaw, headerVal } = makeSheetAccess(XLSX, ws);

  // 헤더 행을 컬럼 단위로 분류: source / 언어별 컬럼 목록 / 미지원 토큰.
  const srcCols = [];
  const langColsMap = {};
  const unknownSet = new Set();
  for (let c = range.s.c; c <= range.e.c; c++) {
    const raw = headerVal(headerRow, c);
    const norm = normalizeHeader(raw);
    if (!norm || META_COLUMNS.includes(norm)) continue;
    if (isSourceToken(norm)) { srcCols.push(c); continue; }
    const code = normalizeCode(raw);
    if (code) (langColsMap[code] || (langColsMap[code] = [])).push(c);
    else unknownSet.add(String(raw).trim());
  }

  const dataR0 = headerRow + 1;
  // 병합으로 생긴 스페이서(항상 빈) 컬럼을 걸러낸다.
  const colHasData = (c) => {
    for (let r = dataR0; r <= range.e.r; r++) {
      const v = getRaw(r, c);
      if (v != null && String(v).trim() !== '') return true;
    }
    return false;
  };
  const srcColsF = srcCols.filter(colHasData).sort((a, b) => a - b);
  if (srcColsF.length === 0) {
    return { ok: false, error: 'KR(원본) 컬럼을 찾았지만 데이터가 비어 있습니다.' };
  }

  // 통계용 — 원본 내용이 하나라도 있는 데이터 행 수.
  let rowCount = 0;
  for (let r = dataR0; r <= range.e.r; r++) {
    if (srcColsF.some(c => cellText(getRaw(r, c)) !== null)) rowCount++;
  }

  // 언어별 번역 맵 빌드 — 각 언어의 하위 컬럼을 KR 하위 컬럼과 위치로 정렬(slot).
  const detected = [];
  const langMaps = {};
  Object.keys(langColsMap).forEach(code => {
    const cols = langColsMap[code].filter(colHasData).sort((a, b) => a - b);
    if (cols.length === 0) return;
    const slots = Math.min(srcColsF.length, cols.length);
    const map = {};
    for (let r = dataR0; r <= range.e.r; r++) {
      for (let i = 0; i < slots; i++) {
        const kr = cellText(getRaw(r, srcColsF[i]));
        const val = cellText(getRaw(r, cols[i]));
        if (!kr || !val) continue;
        const cleaned = val.replace(/<br>/gi, '\n');
        map[kr] = cleaned;
        if (splitParen) {
          const splits = splitByParen(kr, cleaned);
          if (splits) splits.forEach(([k, v]) => { if (!(k in map)) map[k] = v; });
        }
      }
    }
    if (Object.keys(map).length === 0) return;
    langMaps[code] = map;
    detected.push({ code, count: Object.keys(map).length });
  });

  if (detected.length === 0) {
    return { ok: false, error: '감지된 언어가 없습니다. KR 외의 언어 컬럼에 번역 데이터를 입력해 주세요.' };
  }

  return {
    ok: true,
    rows: Array.from({ length: rowCount }),
    sheetName: best.name,
    detected,
    unknownCols: [...unknownSet],
    langMaps,
  };
}
