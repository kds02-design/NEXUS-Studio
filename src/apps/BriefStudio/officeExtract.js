// docx / pptx 텍스트 추출. Gemini API 가 Office 포맷을 공식 지원하지 않아
// 브라우저에서 평문만 뽑아 기존 텍스트 파이프라인에 흘려보낸다.
// mammoth / jszip 은 무거우므로 호출 시점에 동적 import.

export async function extractDocxText(file) {
  const mammoth = (await import('mammoth')).default || (await import('mammoth'));
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return (result.value || '').trim();
}

// pptx 는 zip 안의 ppt/slides/slide{N}.xml 들에서 <a:t>...</a:t> 텍스트 노드만 모은다.
// 슬라이드 순서대로 \n\n 으로 구분.
export async function extractPptxText(file) {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slidePaths = Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/i.test(p))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)\.xml/i)[1], 10);
      const nb = parseInt(b.match(/slide(\d+)\.xml/i)[1], 10);
      return na - nb;
    });
  const tag = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
  const decodeEntities = (s) => s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
  const slides = [];
  for (let i = 0; i < slidePaths.length; i += 1) {
    const xml = await zip.files[slidePaths[i]].async('string');
    const parts = [];
    let m;
    while ((m = tag.exec(xml)) !== null) {
      const t = decodeEntities(m[1]).trim();
      if (t) parts.push(t);
    }
    if (parts.length) slides.push(`[Slide ${i + 1}]\n${parts.join('\n')}`);
  }
  return slides.join('\n\n').trim();
}

export const isDocx = (file) => /\.docx$/i.test(file.name);
export const isPptx = (file) => /\.pptx$/i.test(file.name);
