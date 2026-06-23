// BriefStudio · Prism — prism/pptx.js
// PPTX는 ZIP + XML(OOXML) 구조. JSZip으로 풀어 OOXML <a:t> 를 **authoritative 텍스트 소스**로 추출한다.
// 렌더가 아니라 OOXML을 읽으므로 — 렌더에서 잘리는 넘침 텍스트, 캔버스 밖 도형, 표 셀, 발표자 노트까지
// 위치/렌더와 무관하게 전부 잡힌다(좌표 비교·수동 캡처 불필요). PDF 렌더/임베드 이미지는 레이아웃 보조용.
// 표는 행/열을 살려 "셀 | 셀" 줄로 복원 → 수정요청서의 변경표(상품|가격, 이전|이후)가 뭉개지지 않는다.
// 파서는 브라우저 네이티브 DOMParser(무의존성). 실패 시 정규식 폴백.

/**
 * @param {File|Blob|ArrayBuffer|Uint8Array} input
 * @returns {Promise<{slides: {n:number,text:string,notes:string}[], images: {name:string,mimeType:string,base64:string}[]}>}
 */
export async function loadPptx(input) {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(input);

  // 1) 슬라이드 텍스트 — ppt/slides/slideN.xml 을 번호순으로 (+ 연결된 노트)
  const slideEntries = Object.keys(zip.files)
    .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .map(n => ({ name: n, n: parseInt(n.match(/slide(\d+)\.xml$/)[1], 10) }))
    .sort((a, b) => a.n - b.n);

  const slides = [];
  for (const e of slideEntries) {
    const xml = await zip.file(e.name).async('text');
    const notes = await readNotes(zip, e.n);
    slides.push({ n: e.n, text: extractSlideText(xml), notes });
  }

  // 2) 임베드 이미지 — ppt/media/* (텍스트가 authoritative, 이미지는 레이아웃 판단 보조용)
  const images = [];
  const mediaPaths = Object.keys(zip.files)
    .filter(p => /^ppt\/media\//.test(p) && !zip.files[p].dir)
    .sort();
  for (const p of mediaPaths) {
    const mime = MIME[p.split('.').pop().toLowerCase()];
    if (!mime) continue; // wmf/emf 등 비표준 포맷은 건너뜀
    const base64 = await zip.file(p).async('base64');
    images.push({ name: p.replace(/^ppt\/media\//, ''), mimeType: mime, base64 });
  }

  return { slides, images };
}

const MIME = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif: 'image/gif', webp: 'image/webp',
};

// slideN → 연결된 notesSlide 를 rels 로 정확히 매핑(번호가 1:1이 아닐 수 있어 rels 우선). 없으면 ''.
async function readNotes(zip, slideN) {
  const rel = zip.file(`ppt/slides/_rels/slide${slideN}.xml.rels`);
  if (!rel) return '';
  const m = (await rel.async('text')).match(/Target="([^"]*notesSlide\d+\.xml)"/i);
  if (!m) return '';
  // "../notesSlides/notesSlideX.xml" (slides 기준 상대) → "ppt/notesSlides/notesSlideX.xml"
  const target = ('ppt/slides/' + m[1].replace(/^\.?\//, '')).replace(/[^/]+\/\.\.\//g, '');
  const nf = zip.file(target);
  return nf ? extractSlideText(await nf.async('text')) : '';
}

// OOXML → 텍스트. 표(a:tbl)는 "셀 | 셀" 행으로, 그 외 단락(a:p)은 한 줄로.
function extractSlideText(xml) {
  try {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) return regexExtract(xml);
    const out = [];
    walk(doc.documentElement, out);
    const text = out.filter(Boolean).join('\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    return text || regexExtract(xml); // 빈 결과면 폴백으로 한 번 더
  } catch {
    return regexExtract(xml);
  }
}

// 네임스페이스 접두사(a:, p: …) 제거한 로컬명
const localName = (el) => el.localName || el.nodeName.replace(/^.*:/, '');

// 문서 순서대로 내려가며: 표는 통째로 복원, 단락은 한 줄. (표/단락엔 더 들어가지 않아 중복 방지)
function walk(el, out) {
  const kids = el.children;
  for (let i = 0; i < kids.length; i++) {
    const c = kids[i];
    const name = localName(c);
    if (name === 'tbl') out.push(tableText(c));
    else if (name === 'p') { const t = paraText(c); if (t) out.push(t); }
    else walk(c, out);
  }
}

// a:p 안의 모든 a:t 를 이어붙임 (DOMParser 가 XML 엔티티는 자동 디코딩)
function paraText(p) {
  const ts = p.getElementsByTagName('a:t');
  let s = '';
  for (let i = 0; i < ts.length; i++) s += ts[i].textContent || '';
  return s.replace(/\s+/g, ' ').trim();
}

// a:tbl → 행(a:tr)별로 셀(a:tc) 텍스트를 " | " 로, 행은 줄바꿈으로.
function tableText(tbl) {
  const rows = [];
  const trs = tbl.getElementsByTagName('a:tr');
  for (let i = 0; i < trs.length; i++) {
    const cells = [];
    const tcs = trs[i].children;
    for (let j = 0; j < tcs.length; j++) {
      if (localName(tcs[j]) !== 'tc') continue;
      const ps = tcs[j].getElementsByTagName('a:p');
      const parts = [];
      for (let k = 0; k < ps.length; k++) { const t = paraText(ps[k]); if (t) parts.push(t); }
      cells.push(parts.join(' '));
    }
    if (cells.some(Boolean)) rows.push(cells.join(' | '));
  }
  return rows.join('\n');
}

// 폴백: DOMParser 불가/실패 시 단락 단위 정규식 추출 (구버전 동작과 동일).
function regexExtract(xml) {
  const paras = xml.split(/<a:p[\s>]/i).slice(1); // 첫 조각(헤더) 버림
  const lines = [];
  for (const p of paras) {
    const runs = (p.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) || [])
      .map(m => m.replace(/^<a:t[^>]*>/, '').replace(/<\/a:t>$/, ''))
      .map(decodeXmlEntities);
    const line = runs.join('').replace(/\s+/g, ' ').trim();
    if (line) lines.push(line);
  }
  return lines.join('\n');
}

function decodeXmlEntities(s) {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, '&'); // &amp; 마지막에 — 이중 디코딩 방지
}

/** slides 배열을 LLM 프롬프트에 넣기 좋은 텍스트로 펼친다. (표·노트 포함) */
export function slidesToText(slides) {
  return slides
    .filter(s => s.text || s.notes)
    .map(s => {
      let block = `=== Slide ${s.n} ===\n${s.text || '(텍스트 없음)'}`;
      if (s.notes) block += `\n[발표자 노트]\n${s.notes}`;
      return block;
    })
    .join('\n\n');
}
