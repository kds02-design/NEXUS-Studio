import { GEMINI_API_KEY } from "../../../lib/gemini";
import { ARC_CATEGORIES } from "../constants/categories";
import { captureVideoFirstFrame, cloudinaryVideoThumb } from "./cloudinary";

// Gemini-2.5-flash로 이미지 또는 영상 첫 프레임을 분석해서
// { title, tags, keywords, description } 을 반환.
// - 영상은 모션 추정 + 'Motion' 태그 자동 적용 (호출부 책임)
// - 이미지는 ARC_CATEGORIES 중 일부 태그 + 키워드/설명
export async function analyzeWithGemini({ isVideoMode, videoSource, imageSource }) {
  if (!GEMINI_API_KEY) throw new Error('Gemini API 키가 설정되지 않았습니다.');

  let base64Data;
  if (isVideoMode) {
    if (!videoSource) throw new Error('분석할 영상이 없어요.');
    let dataUrl;
    try {
      dataUrl = await captureVideoFirstFrame(videoSource);
    } catch (capErr) {
      console.warn('[gemini] 첫 프레임 캡처 실패, Cloudinary 썸네일 fallback 시도', capErr);
      const thumbUrl = typeof videoSource === 'string' ? cloudinaryVideoThumb(videoSource) : null;
      if (!thumbUrl) throw capErr;
      const res = await fetch(thumbUrl);
      if (!res.ok) throw new Error(`썸네일 fetch 실패: ${res.status}`);
      const blob = await res.blob();
      dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onloadend = () => resolve(String(r.result));
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
    }
    base64Data = dataUrl.split(',')[1];
  } else {
    if (!imageSource) throw new Error('분석할 이미지가 없어요.');
    if (imageSource.startsWith('data:')) {
      base64Data = imageSource.split(',')[1];
    } else {
      const res = await fetch(imageSource);
      if (!res.ok) throw new Error(`미디어 fetch 실패: ${res.status}`);
      const blob = await res.blob();
      base64Data = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onloadend = () => resolve(String(r.result).split(',')[1]);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
    }
  }

  const TAG_OPTIONS = ARC_CATEGORIES
    .filter(c => c.id !== 'all' && c.type !== 'divider' && c.type !== 'folders' && c.id !== '즐겨찾기')
    .map(c => c.id);

  const STYLE_REQ = '2D/흑백, 3D/렌더링, 캘리그라피 중 하나';
  const THEME_REQ = 'RPG/판타지, 캐주얼/카툰, SF/사이버펑크 중 하나';
  const prompt = isVideoMode
    ? `이 영상의 첫 프레임 썸네일을 보고 영상 모션을 추정 분석하세요. 모션 스타일, 움직임 방식, 속도감, 타이포그래피 애니메이션 특징, 분위기를 중심으로 작성하세요.\n반드시 다음 형식의 JSON만 출력 (코드블록·설명 금지):\n{"title": "2~4단어 한글 제목", "keywords": "콤마로 구분된 한글 모션 키워드 4~6개 (반드시 [${STYLE_REQ}] 1개 + [${THEME_REQ}] 1개를 포함)", "description": "이 영상의 모션 스타일/속도감/분위기를 한 문장으로 설명 (한글 40~100자)"}`
    : `이 이미지와 프롬프트를 분석해서 JSON으로 반환하세요.\n허용 태그 ID 목록: ${TAG_OPTIONS.join(', ')}\n반드시 다음 형식의 JSON만 출력 (코드블록·설명 금지):\n{"title": "2~4단어 한글 제목", "tags": ["태그ID1","태그ID2"], "keywords": "콤마로 구분된 한글 키워드 4~6개 (반드시 [${STYLE_REQ}] 1개 + [${THEME_REQ}] 1개를 포함)", "description": "이 이미지를 한 문장으로 설명 (한글 30~80자)"}`;

  const body = {
    contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: base64Data } }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
  };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(new Error("Gemini timeout 30s")), 30000);
  let response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal }
    );
  } finally { clearTimeout(t); }
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Gemini ${response.status}: ${errText.slice(0, 200)}`);
  }
  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('AI 응답이 비어있어요');
  try { return { parsed: JSON.parse(text), TAG_OPTIONS }; }
  catch { throw new Error('AI 응답 JSON 파싱 실패'); }
}

// 연관 아이템 추천. 후보 목록을 메타데이터만 보내고, 상위 3개 ID 배열만 받는다.
// 비용 절감을 위해 후보는 호출부에서 미리 후보군 선별 후 (예: 같은 type, 또는 최근 N개)
// 200개 이내로 잘라 넘기는 것을 권장.
// 실패하면 빈 배열을 반환 — 사용자 흐름을 막지 않는다.
export async function suggestRelatedPrompts({ target, candidates, max = 3 }) {
  if (!GEMINI_API_KEY) return [];
  if (!target || !Array.isArray(candidates) || candidates.length === 0) return [];

  const summarize = (p) => ({
    id: p.id,
    title: String(p.title || '').slice(0, 60),
    tags: (Array.isArray(p.tags) ? p.tags : []).slice(0, 8),
    keywords: String(p.aiKeywords || '').slice(0, 200),
    type: p.type || '',
  });
  const summarizedTarget = summarize(target);
  const summarizedCandidates = candidates.slice(0, 200).map(summarize);

  const prompt = `이 아이템과 연관될 수 있는 아이템을 후보 중에서 찾아줘.
판단 기준: 제목 유사도, 공통 태그, 공통 키워드.
같은 type이거나 시각적·주제적으로 자연스럽게 이어지는 작품을 우선해.

[기준 아이템]
${JSON.stringify(summarizedTarget)}

[후보 목록]
${JSON.stringify(summarizedCandidates)}

상위 ${max}개의 후보 ID만 JSON 배열로 출력 (코드블록 금지). 예: ["id1","id2","id3"]
관련성이 낮으면 ${max}개 미만이어도 좋고, 하나도 없으면 [] 를 반환.`;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(new Error('Gemini timeout 20s')), 20000);
    let response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
          }),
          signal: ctrl.signal,
        },
      );
    } finally { clearTimeout(t); }
    if (!response.ok) return [];
    const json = await response.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return [];
    const ids = JSON.parse(text);
    if (!Array.isArray(ids)) return [];
    const candidateIds = new Set(summarizedCandidates.map(c => c.id));
    return ids.filter(id => typeof id === 'string' && candidateIds.has(id) && id !== target.id).slice(0, max);
  } catch (e) {
    console.warn('[PromptArc] suggestRelatedPrompts failed (non-fatal)', e);
    return [];
  }
}
