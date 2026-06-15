// BriefStudio · Prism — prism/pptx.js
// PPTX는 ZIP + XML 구조다. 브라우저에서 JSZip으로 풀어 슬라이드 텍스트와 임베드 이미지를 추출한다.
// PDF/이미지 변환 단계 없이 .pptx를 extract() 입력 형태(텍스트 + 이미지 parts)로 바로 변환한다.
// jszip 은 무거우므로 호출 시점에 동적 import (officeExtract 와 동일 패턴).

/**
 * @param {File|Blob|ArrayBuffer|Uint8Array} input
 * @returns {Promise<{slides: {n:number,text:string}[], images: {name:string,mimeType:string,base64:string}[]}>}
 */
export async function loadPptx(input) {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(input);

  // 1) 슬라이드 텍스트 — ppt/slides/slideN.xml 을 번호순으로
  const slideEntries = Object.keys(zip.files)
    .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .map(n => ({ name: n, n: parseInt(n.match(/slide(\d+)\.xml$/)[1], 10) }))
    .sort((a, b) => a.n - b.n);

  const slides = [];
  for (const e of slideEntries) {
    const xml = await zip.file(e.name).async('text');
    slides.push({ n: e.n, text: extractSlideText(xml) });
  }

  // 2) 임베드 이미지 — ppt/media/*
  const mediaPaths = Object.keys(zip.files)
    .filter(p => /^ppt\/media\//.test(p) && !zip.files[p].dir)
    .sort();

  const images = [];
  for (const p of mediaPaths) {
    const ext = p.split('.').pop().toLowerCase();
    const mime = MIME[ext];
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

// <a:t>…</a:t> 안에 실제 텍스트가 들어있다. 단락(<a:p>) 단위로 줄바꿈.
function extractSlideText(xml) {
  const paras = xml.split(/<a:p[\s>]/i).slice(1); // 첫 split 앞 조각은 헤더라 버림
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

/** slides 배열을 LLM 프롬프트에 넣기 좋은 텍스트로 펼친다. */
export function slidesToText(slides) {
  return slides
    .filter(s => s.text)
    .map(s => `=== Slide ${s.n} ===\n${s.text}`)
    .join('\n\n');
}
