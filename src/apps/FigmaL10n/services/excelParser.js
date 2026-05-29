// 엑셀 번역표 파싱 + 언어 자동 감지 + 번역 맵 빌드.
// xlsx 는 무거우므로 호출 시점에 동적 import (BriefStudio officeExtract 와 동일 패턴).
import { LANG_CONFIG, META_COLUMNS } from '../constants/langConfig';

// 파일 → SheetJS workbook. 호출부에서 try/catch.
export async function readWorkbook(file) {
  const XLSX = await import('xlsx');
  const data = await file.arrayBuffer();
  return XLSX.read(data, { type: 'array' });
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

function buildTranslationMap(rows, langCol, splitParen) {
  const map = {};
  rows.forEach(row => {
    const kr = row.KR ? String(row.KR).trim() : null;
    const val = row[langCol] ? String(row[langCol]).trim() : null;
    if (!kr || !val) return;

    const cleaned = val.replace(/<br>/gi, '\n');
    map[kr] = cleaned;

    if (splitParen) {
      const splits = splitByParen(kr, cleaned);
      if (splits) {
        splits.forEach(([k, v]) => {
          if (!(k in map)) map[k] = v;
        });
      }
    }
  });
  return map;
}

// workbook 분석 → { ok, error?, rows, sheetName, detected, unknownCols, langMaps }.
// sheetName 미지정 시 첫 시트. splitParen 으로 괄호 분리 키 생성 여부 제어.
export async function analyzeWorkbook(workbook, { sheetName = '', splitParen = true } = {}) {
  if (!workbook) return { ok: false, error: '업로드된 파일이 없습니다.' };

  const resolvedSheet = sheetName.trim() || workbook.SheetNames[0];
  if (!workbook.Sheets[resolvedSheet]) {
    return { ok: false, error: `시트 "${resolvedSheet}"를 찾을 수 없습니다. 사용 가능한 시트: ${workbook.SheetNames.join(', ')}` };
  }

  const XLSX = await import('xlsx');
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[resolvedSheet], { defval: null });
  if (rows.length === 0) return { ok: false, error: '빈 시트입니다.' };

  const columns = Object.keys(rows[0]);
  if (!columns.includes('KR')) {
    return { ok: false, error: 'KR 컬럼이 없습니다. 한국어 원본은 KR 컬럼에 있어야 합니다.' };
  }

  const detected = [];
  const unknownCols = [];
  columns.forEach(col => {
    const upper = col.trim().toUpperCase();
    if (upper === 'KR' || META_COLUMNS.includes(upper)) return;

    const nonEmpty = rows.filter(r => r[col] && String(r[col]).trim() !== '').length;
    if (nonEmpty === 0) return;

    if (LANG_CONFIG[upper]) detected.push({ code: upper, count: nonEmpty });
    else unknownCols.push(col);
  });

  if (detected.length === 0) {
    return { ok: false, error: '감지된 언어가 없습니다. KR 외의 언어 컬럼에 데이터를 입력해 주세요.' };
  }

  const langMaps = {};
  detected.forEach(({ code }) => {
    langMaps[code] = buildTranslationMap(rows, code, splitParen);
  });

  return { ok: true, rows, sheetName: resolvedSheet, detected, unknownCols, langMaps };
}
