import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Upload, Image as ImageIcon, Loader2, Sparkles, Settings, X, Bot, BrainCircuit,
  ChevronDown, Copy, Check, Edit3, Download, ZoomIn, MousePointer2
} from 'lucide-react';
import { GEMINI_API_KEY } from '../../lib/gemini';
import { fetchActiveCriteria, getSeedCriteria, formatCriteriaList, CRITERIA_TYPES } from '../../lib/evaluationCriteria';

const compressImage = (base64Str, maxWidth = 1024, quality = 0.8) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(base64Str);
    });
};

const blobUrlToBase64 = async (url) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Blob conversion failed", e);
    return url;
  }
};

const getScoreLabel = (key, category = '') => {
    const cat = category.toLowerCase();
    if (cat.includes('메인') || cat.includes('main')) {
        const map = {
            impression: '브랜드 정체성', concept: '히어로 임팩트', layout: '메인 비주얼', typography: '타이틀 존재감',
            color: '세계관 몰입도', readability: '시각적 위계', brand: '레이아웃 균형', flow: '탐색 스크롤 연출',
            detail: '진입 전환성', conversion: '기억성'
        };
        return map[key.toLowerCase()] || key;
    }
    if (cat.includes('서브') || cat.includes('sub')) {
        const map = {
            impression: '콘텐츠 명확성', concept: '브랜드 연속성', layout: '정보 구조', typography: '가독성',
            color: '섹션 위계', readability: '모듈 레이아웃', brand: '보조 비주얼', flow: '탐색 스크롤 흐름',
            detail: '디테일 완성도', conversion: '운영 안정성'
        };
        return map[key.toLowerCase()] || key;
    }
    if (cat.includes('프로모션') || cat.includes('promotion')) {
        const map = {
            impression: '첫 화면 흡입력', brand: '브랜드·이벤트 톤', concept: '캠페인 이해도', color: '보상 매력도',
            layout: '보상 구조·조건', typography: '정보 위계', conversion: '참여 동선·CTA', readability: '정보 가독성',
            flow: '스크롤 리듬', detail: '운영 신뢰성'
        };
        return map[key.toLowerCase()] || key;
    }
    const map = {
        impression: '첫인상 / 주목도', concept: '콘셉트 전달력', layout: '레이아웃 균형', typography: '타이포그래피',
        color: '컬러 완성도', readability: '정보 가독성', brand: '브랜드 적합성', flow: '시선 흐름',
        detail: '완성도 / 디테일', conversion: '클릭/전환 가능성'
    };
    return map[key.toLowerCase()] || key;
};

const getCategoryWeights = (category = '') => {
    const cat = category.toLowerCase();
    if (cat.includes('메인') || cat.includes('main')) {
        return { impression: 10, concept: 15, layout: 15, typography: 12, color: 12, readability: 10, brand: 8, flow: 6, detail: 6, conversion: 6 };
    }
    if (cat.includes('서브') || cat.includes('sub')) {
        return { impression: 14, concept: 10, layout: 15, typography: 14, color: 10, readability: 10, brand: 8, flow: 8, detail: 6, conversion: 5 };
    }
    if (cat.includes('프로모션') || cat.includes('promotion')) {
        return { impression: 10, brand: 8, concept: 10, color: 15, layout: 10, typography: 10, conversion: 10, readability: 12, flow: 8, detail: 7 };
    }
    return { impression: 10, concept: 10, layout: 10, typography: 10, color: 10, readability: 10, brand: 10, flow: 10, detail: 10, conversion: 10 };
};

// eslint-disable-next-line no-unused-vars
const defaultEvaluationCriteria = `[임무 2: 10대 평가 항목 (100점 만점)]
각 항목에 대해 100점 만점 기준의 점수(score)와 핵심을 찌르는 심플한 한 줄 평가(reason)를 작성하세요.

[★ 카테고리별 10대 평가 항목, 가중치, JSON 키 매핑 ★]
AI는 판별/지정된 카테고리에 따라 다음의 기준으로 평가하고, 반드시 괄호 안의 (JSON 키)에 맞춰 점수와 이유를 기입하세요.

▶ [배너] 및 [기타] 카테고리 (가중치 균등 10%):
1. (impression) 첫인상 / 주목도
2. (concept) 콘셉트 전달력
3. (layout) 레이아웃 균형
4. (typography) 타이포그래피
5. (color) 컬러 완성도
6. (readability) 정보 가독성
7. (brand) 브랜드 적합성
8. (flow) 시선 흐름
9. (detail) 완성도 / 디테일
10. (conversion) 클릭/전환 가능성

▶ [프로모션 페이지] 카테고리:
1. (impression) hook / 첫 화면 흡입력 [10%]
2. (brand) brand & event tone [8%]
3. (concept) campaign clarity [10%]
4. (color) reward appeal [15%]
5. (layout) reward logic [10%]
6. (typography) information hierarchy [10%]
7. (conversion) participation flow [10%]
8. (readability) readability [12%]
9. (flow) scroll rhythm [8%]
10. (detail) operational trust [7%]

▶ [브랜드웹_메인] 카테고리:
1. (impression) identity [10%]
2. (concept) hero impact [15%]
3. (layout) key visual [15%]
4. (typography) title presence [12%]
5. (color) world immersion [12%]
6. (readability) visual hierarchy [10%]
7. (brand) layout balance [8%]
8. (flow) scroll interaction [6%]
9. (detail) gateway conversion [6%]
10. (conversion) memorability [6%]

▶ [브랜드웹_서브] 카테고리:
1. (impression) content clarity [14%]
2. (concept) brand continuity [10%]
3. (layout) information architecture [15%]
4. (typography) readability [14%]
5. (color) section hierarchy [10%]
6. (readability) module layout [10%]
7. (brand) visual support [8%]
8. (flow) navigation usability [8%]
9. (detail) detail polish [6%]
10. (conversion) operational stability [5%]

[중요: 이유(reason) 작성 시 강력한 규칙]
- 고점 항목 (85점 이상): 어떤 디자인 요소가 훌륭한지 구체적으로 짚어 명확히 칭찬하세요.
- 저점 항목 (80점 미만): 절대 칭찬하거나 "무난하다"고 타협하지 마세요. 명확한 단점과 아쉬운 점을 날카롭게 비판하고 지적하세요.
- 구어체나 불필요한 미사여구를 빼고 핵심만 심플하게 작성하세요.`;

export default function DesignEvaluator() {
  const [, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [aspectRatio, setAspectRatio] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [manualScoreAdj, setManualScoreAdj] = useState(0);
  const [userComment, setUserComment] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('auto');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('api');
  const [notification, setNotification] = useState(null);
  const [isCopied, setIsCopied] = useState(false);
  const fileInputRef = useRef(null);
  // eslint-disable-next-line no-unused-vars
  const txtFileInputRef = useRef(null);

  const [geminiApiKey, setGeminiApiKey] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('geminiApiKey') || '' : '');
  const [openAiApiKey, setOpenAiApiKey] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('openAiApiKey') || '' : '');

  // ─── Firestore evaluationCriteria 동기화 ───
  // banner / promotion / brandweb 활성 버전을 한꺼번에 로드 → 카테고리별 기준 텍스트로 합성
  const [criteriaByType, setCriteriaByType] = useState({
    banner:    { items: getSeedCriteria(CRITERIA_TYPES.banner),    versionName: "(시드)" },
    promotion: { items: getSeedCriteria(CRITERIA_TYPES.promotion), versionName: "(시드)" },
    brandweb:  { items: getSeedCriteria(CRITERIA_TYPES.brandweb),  versionName: "(시드)" },
  });
  const [criteriaLoading, setCriteriaLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCriteriaLoading(true);
      try {
        const [b, p, w] = await Promise.all([
          fetchActiveCriteria(CRITERIA_TYPES.banner),
          fetchActiveCriteria(CRITERIA_TYPES.promotion),
          fetchActiveCriteria(CRITERIA_TYPES.brandweb),
        ]);
        if (cancelled) return;
        const useOrSeed = (v, type) => (v && Array.isArray(v.criteria) && v.criteria.length > 0)
          ? { items: v.criteria, versionName: v.name || "active" }
          : { items: getSeedCriteria(type), versionName: "(시드 fallback)" };
        setCriteriaByType({
          banner:    useOrSeed(b, CRITERIA_TYPES.banner),
          promotion: useOrSeed(p, CRITERIA_TYPES.promotion),
          brandweb:  useOrSeed(w, CRITERIA_TYPES.brandweb),
        });
      } catch (e) {
        console.warn("[DesignEvaluator] criteria load failed; using seeds", e);
      } finally { if (!cancelled) setCriteriaLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // 동적으로 카테고리별 평가 기준 텍스트 생성 (Gemini 프롬프트에 주입)
  const evaluationCriteria = useMemo(() => {
    return `[임무 2: 10대 평가 항목 (100점 만점)]
각 항목에 대해 100점 만점 기준의 점수(score)와 핵심을 찌르는 심플한 한 줄 평가(reason)를 작성하세요.

[★ 카테고리별 평가 항목, 가중치, JSON 키 매핑 ★]
AI는 판별/지정된 카테고리에 따라 다음의 기준으로 평가하고, 반드시 괄호 안의 (JSON 키)에 맞춰 점수와 이유를 기입하세요.

▶ [배너] 및 [기타] 카테고리:
${formatCriteriaList(criteriaByType.banner.items)}

▶ [프로모션 페이지] 카테고리:
${formatCriteriaList(criteriaByType.promotion.items)}

▶ [브랜드웹_메인] / [브랜드웹_서브] 카테고리:
${formatCriteriaList(criteriaByType.brandweb.items)}

[중요: 이유(reason) 작성 시 강력한 규칙]
- 고점 항목 (85점 이상): 어떤 디자인 요소가 훌륭한지 구체적으로 짚어 명확히 칭찬하세요.
- 저점 항목 (80점 미만): 절대 칭찬하거나 "무난하다"고 타협하지 마세요. 명확한 단점과 아쉬운 점을 날카롭게 비판하고 지적하세요.
- 구어체나 불필요한 미사여구를 빼고 핵심만 심플하게 작성하세요.`;
  }, [criteriaByType]);

  useEffect(() => {
      localStorage.setItem('geminiApiKey', geminiApiKey);
      localStorage.setItem('openAiApiKey', openAiApiKey);
  }, [geminiApiKey, openAiApiKey]);

  const showNotification = (msg) => {
      setNotification(msg);
      setTimeout(() => setNotification(null), 3000);
  };

  const processFile = (file) => {
      if (file && file.type.startsWith('image/')) {
          setImageFile(file);
          const objectUrl = URL.createObjectURL(file);
          setPreviewUrl(objectUrl);
          setResultData(null);
          setManualScoreAdj(0);
          const img = new Image();
          img.onload = () => setAspectRatio(img.width / img.height);
          img.src = objectUrl;
      } else {
          showNotification("이미지 파일만 업로드 가능합니다.");
      }
  };

  useEffect(() => {
      const handlePaste = (e) => {
          if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
          const items = e.clipboardData?.items;
          if (!items) return;
          for (let i = 0; i < items.length; i++) {
              if (items[i].type.indexOf('image') !== -1) {
                  const file = items[i].getAsFile();
                  processFile(file);
                  break;
              }
          }
      };
      window.addEventListener('paste', handlePaste);
      return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleImageUpload = (e) => {
      const file = e.target.files[0];
      processFile(file);
  };

  // eslint-disable-next-line no-unused-vars
  const handleTxtImport = (e) => {
      // 평가 기준은 이제 NEXUS Admin > 평가 기준 관리 에서만 수정 가능합니다.
      e.target.value = '';
      showNotification("평가 기준은 NEXUS Admin 에서 관리합니다. (TXT 불러오기 비활성화)");
  };

  const callOpenAIAPI = async (prompt, imageBase64) => {
    if (!openAiApiKey) return null;
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openAiApiKey}` },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: "system", content: "You are a professional design evaluation AI. You must evaluate ALL 10 metrics without omitting any. You must output only valid JSON matching the exact schema requested by the user." },
                    { role: "user", content: [ { type: "text", text: prompt }, { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } } ] }
                ],
                response_format: { type: "json_object" },
                temperature: 0.1
            })
        });
        if (!response.ok) throw new Error("OpenAI API Error");
        const data = await response.json();
        return data.choices[0].message.content;
    } catch (e) {
        console.error("OpenAI API Failed:", e);
        return null;
    }
  };

  const callGeminiAPI = async (prompt, imageBase64 = null) => {
    const apiKey = geminiApiKey || GEMINI_API_KEY;
    const delays = [1000, 2000, 4000, 8000, 16000];
    try {
      const generationConfig = {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: {
              type: "OBJECT",
              properties: {
                  title: { type: "STRING" },
                  category: { type: "STRING" },
                  date_info: { type: "OBJECT", properties: { year: { type: "STRING" }, month: { type: "STRING" }, full_date: { type: "STRING" } } },
                  tags: { type: "ARRAY", items: { type: "STRING" } },
                  purpose: { type: "STRING" },
                  scores_data: {
                      type: "OBJECT",
                      properties: {
                          impression: { type: "OBJECT", properties: { score: { type: "NUMBER" }, reason: { type: "STRING" } } },
                          concept: { type: "OBJECT", properties: { score: { type: "NUMBER" }, reason: { type: "STRING" } } },
                          layout: { type: "OBJECT", properties: { score: { type: "NUMBER" }, reason: { type: "STRING" } } },
                          typography: { type: "OBJECT", properties: { score: { type: "NUMBER" }, reason: { type: "STRING" } } },
                          color: { type: "OBJECT", properties: { score: { type: "NUMBER" }, reason: { type: "STRING" } } },
                          readability: { type: "OBJECT", properties: { score: { type: "NUMBER" }, reason: { type: "STRING" } } },
                          brand: { type: "OBJECT", properties: { score: { type: "NUMBER" }, reason: { type: "STRING" } } },
                          flow: { type: "OBJECT", properties: { score: { type: "NUMBER" }, reason: { type: "STRING" } } },
                          detail: { type: "OBJECT", properties: { score: { type: "NUMBER" }, reason: { type: "STRING" } } },
                          conversion: { type: "OBJECT", properties: { score: { type: "NUMBER" }, reason: { type: "STRING" } } }
                      },
                      required: ["impression", "concept", "layout", "typography", "color", "readability", "brand", "flow", "detail", "conversion"]
                  }
              },
              required: ["title", "category", "tags", "scores_data"]
          }
      };
      const requestBody = {
          contents: [{ parts: [ { text: prompt }, ...(imageBase64 ? [{ inlineData: { mimeType: "image/jpeg", data: imageBase64 } }] : []) ] }],
          generationConfig,
          safetySettings: [
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
          ]
      };
      for (let attempt = 0; attempt <= 5; attempt++) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
            { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody) }
          );
          if (!response.ok) {
              let errorMsg = `HTTP ${response.status}`;
              try { const errData = await response.json(); if (errData.error && errData.error.message) errorMsg += ` - ${errData.error.message}`; } catch (e) {}
              throw new Error(errorMsg);
          }
          const data = await response.json();
          if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts.length > 0) {
             return data.candidates[0].content.parts[0].text;
          }
          return "ERROR:응답 결과가 없습니다. (API 안전 필터 차단 의심)";
        } catch (e) {
          if (attempt === 5) throw e;
          await new Promise(resolve => setTimeout(resolve, delays[attempt]));
        }
      }
    } catch (error) {
        console.error("Gemini API Error:", error); return `ERROR:${error.message}`;
    }
    return null;
  };

  const handleAnalyze = async () => {
      if (!previewUrl) {
          showNotification("먼저 이미지를 업로드해주세요.");
          return;
      }
      setIsAnalyzing(true);
      setResultData(null);
      setManualScoreAdj(0);
      try {
          let base64Image = previewUrl;
          if (base64Image.startsWith('data:image')) {
              base64Image = await compressImage(base64Image, 1024, 0.8);
              base64Image = base64Image.split(',')[1];
          } else if (base64Image.startsWith('blob:')) {
              const b64 = await blobUrlToBase64(base64Image);
              const compressed = await compressImage(b64, 1024, 0.8);
              base64Image = compressed.split(',')[1];
          }

          const categoryInstruction = selectedCategory === 'auto'
              ? '- category: 이미지의 형태와 목적에 따라 "배너", "프로모션 페이지", "브랜드웹_메인", "브랜드웹_서브", "기타" 중 하나로 정확히 분류하세요. (세로로 긴 정보성 페이지는 프로모션 페이지나 브랜드웹_서브입니다.)'
              : `- category: 이 디자인은 "${selectedCategory}"입니다. 반드시 이 값으로 고정하여 출력하고, 평가 기준도 해당 카테고리에 맞춰 진행하세요.`;
          const introInstruction = selectedCategory === 'auto'
              ? '첨부된 이미지를 분석하여 디자인 카테고리를 분류하고,'
              : `첨부된 디자인은 [${selectedCategory}]입니다. 이 사실을 바탕으로`;

          const dynamicPrompt = `당신은 게임/IT 디자인을 심사하는 최고 권위의 AI 평가단입니다.
${introInstruction} 반드시 10가지 세부 항목 '모두'에 대해 누락 없이 정밀 평가하세요.

[임무 1: 메타데이터 추출]
- title: 디자인의 메인 텍스트(제목) 추출.
${categoryInstruction}
- date_info: 이벤트 기간/날짜 (있을 경우).
- tags: 컬러, 분위기, 특징 위주로 반드시 '한글'로만 3~5개 작성 (예: "다크판타지", "황금빛", "캐주얼", "화려한").

${evaluationCriteria}

반드시 지정된 JSON 스키마에 맞추어 10개 평가 항목 전체를 단 하나도 누락 없이 답변하세요.`;

          let geminiResult = null;
          let openaiResult = null;
          const promises = [callGeminiAPI(dynamicPrompt, base64Image)];
          if (openAiApiKey) promises.push(callOpenAIAPI(dynamicPrompt, base64Image));
          const results = await Promise.allSettled(promises);

          if (results[0].status === 'fulfilled' && !results[0].value?.startsWith('ERROR:')) {
              geminiResult = results[0].value;
          } else {
              throw new Error(results[0].value?.replace('ERROR:', '') || 'Gemini API 실패');
          }
          if (openAiApiKey && results[1]?.status === 'fulfilled' && results[1].value) openaiResult = results[1].value;

          let geminiData = null;
          let openaiData = null;
          if (geminiResult) try { geminiData = JSON.parse(geminiResult.replace(/```json|```/g, '').trim()); } catch(e){}
          if (openaiResult) try { openaiData = JSON.parse(openaiResult.replace(/```json|```/g, '').trim()); } catch(e){}

          const primaryData = geminiData || openaiData;

          if (primaryData && primaryData.scores_data) {
              const mergeScore = (gScore, oScore) => {
                  if (gScore != null && oScore != null) return (gScore + oScore) / 2;
                  return gScore != null ? gScore : oScore != null ? oScore : 80;
              };
              const mergeReason = (gReason, oReason) => gReason || oReason || '';
              const detectedCategory = primaryData.category || '미분류';
              const weights = getCategoryWeights(detectedCategory);
              const keys = ['impression', 'concept', 'layout', 'typography', 'color', 'readability', 'brand', 'flow', 'detail', 'conversion'];
              const mergedScoresData = {};
              let weightedScoreSum = 0;
              keys.forEach(key => {
                  const gScore = geminiData?.scores_data?.[key]?.score;
                  const oScore = openaiData?.scores_data?.[key]?.score;
                  const score = mergeScore(gScore, oScore);
                  const weight = weights[key];
                  const reason = mergeReason(geminiData?.scores_data?.[key]?.reason, openaiData?.scores_data?.[key]?.reason);
                  mergedScoresData[key] = { score: Math.round(score), reason, weight };
                  weightedScoreSum += score * (weight / 100);
              });
              let aiScoreRaw = weightedScoreSum / 10;
              let aiScore = Math.round(aiScoreRaw * 10) / 10;
              setResultData({
                  title: primaryData.title,
                  category: detectedCategory,
                  tags: primaryData.tags || [],
                  scores: mergedScoresData,
                  aiScore: aiScore,
                  score: aiScore
              });
              showNotification("분석이 성공적으로 완료되었습니다.");
          } else {
              throw new Error("JSON 파싱 실패");
          }
      } catch (error) {
          showNotification(`분석 실패: ${error.message}`);
          console.error(error);
      } finally {
          setIsAnalyzing(false);
      }
  };

  const getFinalScore100 = (data, adj) => {
      if (!data) return 0;
      const base = Math.round(parseFloat(data.aiScore) * 10);
      return Math.min(99, Math.max(0, base + adj));
  };

  const copyResultJson = () => {
      if (!resultData) return;
      const exportData = {
          ...resultData,
          manualScoreAdj,
          finalScore: getFinalScore100(resultData, manualScoreAdj)
      };
      navigator.clipboard.writeText(JSON.stringify(exportData, null, 2))
          .then(() => {
              setIsCopied(true);
              setTimeout(() => setIsCopied(false), 2000);
              showNotification("분석 결과가 복사되었습니다.");
          });
  };

  const handleUpdateCriteria = () => {
      // 평가 기준은 이제 NEXUS Admin 에서 관리합니다. 임시 추가 지침 기능 비활성화.
      showNotification("평가 기준 변경은 NEXUS Admin > 평가 기준 관리에서 새 버전으로 저장하세요.");
  };

  const exportCriteriaToTxt = () => {
      const element = document.createElement("a");
      const file = new Blob([evaluationCriteria], {type: 'text/plain;charset=utf-8'});
      element.href = URL.createObjectURL(file);
      element.download = "DesignCodex_Evaluation_Criteria.txt";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      showNotification("평가 기준 텍스트 파일이 다운로드되었습니다.");
  };

  const fixedOrder = ['impression', 'concept', 'layout', 'typography', 'color', 'readability', 'brand', 'flow', 'detail', 'conversion'];

  return (
    <div
        className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0c0c0e] dark:text-zinc-300 font-sans selection:bg-[#df6a78]/30 overflow-x-hidden"
        onDragEnter={() => setIsDragging(true)}
    >
        <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(150, 150, 150, 0.3); border-radius: 10px; }
            input[type=range] { -webkit-appearance: none; appearance: none; background: transparent; }
            input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 16px; width: 16px; border-radius: 50%; background: #6b8af0; cursor: pointer; }
        `}</style>

        {isDragging && (
            <div
                className="fixed inset-0 bg-[#df6a78]/10 backdrop-blur-sm flex items-center justify-center border-[6px] border-[#df6a78] z-[999]"
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    processFile(e.dataTransfer.files[0]);
                }}
            >
                <div className="bg-black/90 px-10 py-8 rounded-3xl flex flex-col items-center gap-4 pointer-events-none shadow-2xl border border-white/10">
                    <Upload className="w-16 h-16 text-[#df6a78] animate-bounce" />
                    <span className="text-[#df6a78] font-bold text-4xl tracking-wide">DROP IMAGE HERE</span>
                    <span className="text-zinc-300 text-sm font-medium">화면 어디든 이미지를 놓아주세요</span>
                </div>
            </div>
        )}

        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

        <header className="h-16 border-b border-white/5 flex items-center justify-end px-6 bg-[#0c0c0e]/80 sticky top-0 z-40 backdrop-blur-md">
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full hover:bg-white/5 transition-colors text-zinc-400 hover:text-white">
                <Settings className="w-5 h-5" />
            </button>
        </header>

        <main className="max-w-[1200px] mx-auto p-6 md:p-8 flex flex-col gap-10 items-center min-h-[calc(100vh-64px)]">

            <div className="w-full flex flex-col gap-4 z-30">
                <div className={`w-full aspect-video bg-black/40 border rounded-2xl relative overflow-hidden group flex flex-col transition-all duration-300 shadow-inner ${isDragging ? 'border-[#df6a78] bg-[#df6a78]/10' : 'border-white/10'}`}>
                    {previewUrl ? (
                        <>
                            {(() => {
                                const currentCat = resultData ? resultData.category : selectedCategory;
                                let isFitWidth = false;
                                if (currentCat.includes('프로모션')) isFitWidth = true;
                                else if (currentCat.includes('배너') || currentCat.includes('브랜드')) isFitWidth = false;
                                else isFitWidth = aspectRatio < 0.75;
                                return isFitWidth ? (
                                    <div className="absolute inset-0 overflow-y-auto custom-scrollbar flex items-start justify-center p-2">
                                        <img src={previewUrl} alt="Preview" className="w-full h-auto rounded-xl" />
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center p-2">
                                        <img src={previewUrl} alt="Preview" className="h-full w-auto object-contain rounded-xl shadow-lg" />
                                    </div>
                                );
                            })()}
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                                <button onClick={() => setIsImageModalOpen(true)} className="p-2.5 bg-black/70 hover:bg-[#df6a78] rounded-xl text-white transition-colors backdrop-blur-md border border-white/10 shadow-lg" title="원본 크게 보기">
                                    <ZoomIn className="w-5 h-5" />
                                </button>
                                <button onClick={() => fileInputRef.current?.click()} className="p-2.5 bg-black/70 hover:bg-white/20 rounded-xl text-white transition-colors backdrop-blur-md border border-white/10 shadow-lg" title="다른 이미지 선택">
                                    <ImageIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </>
                    ) : (
                        <div onClick={() => fileInputRef.current?.click()} className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-5 p-6 cursor-pointer hover:bg-white/5 transition-colors">
                            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/5 shadow-inner">
                                <MousePointer2 className="w-8 h-8 opacity-50" />
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-zinc-300 text-lg mb-2">이미지 뷰어 (16:9)</p>
                                <p className="text-sm text-zinc-500 leading-relaxed">
                                    화면 <span className="text-white">어디든 이미지를 드롭</span> 하거나<br/>
                                    클릭하여 파일을 선택하세요.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 flex gap-2 items-center shadow-lg">
                    <div className="relative flex-1">
                        <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full bg-transparent border-none px-4 py-3 text-[13px] font-medium text-white appearance-none focus:outline-none cursor-pointer">
                            <option value="auto" className="bg-zinc-900">✨ AI 자동 판별 (권장)</option>
                            <option value="배너" className="bg-zinc-900">🖼️ 배너 (Banner)</option>
                            <option value="프로모션 페이지" className="bg-zinc-900">📜 프로모션 페이지 (Landing)</option>
                            <option value="브랜드웹_메인" className="bg-zinc-900">🌐 브랜드 사이트 (메인)</option>
                            <option value="브랜드웹_서브" className="bg-zinc-900">🌐 브랜드 사이트 (서브)</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    </div>
                    <div className="w-px h-8 bg-white/10 shrink-0"></div>
                    <button onClick={handleAnalyze} disabled={isAnalyzing || !previewUrl} className={`px-8 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap ${isAnalyzing ? 'bg-[#df6a78]/50 text-white cursor-not-allowed' : !previewUrl ? 'bg-transparent text-zinc-500 cursor-not-allowed' : 'bg-[#df6a78] hover:bg-[#c95160] text-white shadow-[0_0_15px_rgba(223,106,120,0.3)]'}`}>
                        {isAnalyzing ? (<><Loader2 className="w-4 h-4 animate-spin" /> 분석 중</>) : (<><Sparkles className="w-4 h-4" /> 평가 시작</>)}
                    </button>
                </div>
            </div>

            <div className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-6 md:p-10 flex flex-col shadow-2xl">
                {!resultData && !isAnalyzing && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 py-20">
                        <Bot className="w-16 h-16 text-zinc-600 mb-4" />
                        <h3 className="text-lg font-bold text-zinc-400">평가 대기 중</h3>
                        <p className="text-sm text-zinc-500 mt-2">상단 뷰어에 이미지를 띄우고 평가를 시작하면<br/>이곳에 상세한 분석 결과가 표시됩니다.</p>
                    </div>
                )}

                {isAnalyzing && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center animate-pulse py-20">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-[#df6a78]/20 blur-xl rounded-full"></div>
                            <Bot className="w-16 h-16 text-[#df6a78] relative z-10 animate-bounce" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">디자인 심사 중입니다</h3>
                        <p className="text-sm text-zinc-400">선택된 카테고리의 10가지 세부 가중치에 맞춰 정밀 분석 중...</p>
                    </div>
                )}

                {resultData && !isAnalyzing && (() => {
                    const validScores = fixedOrder.map(k => resultData.scores?.[k]?.score).filter(s => s != null).map(s => Math.round(s));
                    const maxScore = validScores.length > 0 ? Math.max(...validScores) : -1;
                    const minScore = validScores.length > 0 ? Math.min(...validScores) : 101;
                    return (
                        <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-8 border-b border-white/10">
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="px-3 py-1.5 bg-[#df6a78]/20 border border-[#df6a78]/40 text-[#df6a78] text-[12px] font-bold rounded-md shadow-sm">
                                            {resultData.category}
                                        </span>
                                    </div>
                                    <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 truncate max-w-2xl leading-tight">{resultData.title}</h2>
                                    <div className="flex flex-wrap gap-2">
                                        {resultData.tags?.map((tag, idx) => (
                                            <span key={idx} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm font-medium text-zinc-300">#{tag}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="text-zinc-400 text-xs font-bold mb-1 tracking-wider uppercase flex items-center justify-end gap-1">최종 환산 점수 <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-zinc-300 lowercase">가중치 적용</span></div>
                                    <div className="text-[90px] font-black text-[#f15d72] leading-[0.8] drop-shadow-[0_4px_24px_rgba(241,93,114,0.2)] mt-2">
                                        {getFinalScore100(resultData, manualScoreAdj)}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                                {fixedOrder.map((key) => {
                                    const data = resultData.scores?.[key];
                                    if (!data) return null;
                                    const scoreVal = Math.round(data.score);
                                    const isMax = validScores.length > 1 && scoreVal === maxScore && maxScore !== minScore;
                                    const isMin = validScores.length > 1 && scoreVal === minScore && maxScore !== minScore;
                                    const boxBgClass = isMax
                                        ? 'bg-[#0eb9b3]/15 border-[#0eb9b3]/40 hover:bg-[#0eb9b3]/25'
                                        : isMin
                                            ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20'
                                            : 'bg-black/30 border-white/[0.08] hover:bg-black/50';
                                    const scoreColorClass = isMax ? 'text-[#0eb9b3]' : 'text-[#df6a78]';
                                    return (
                                        <div key={key} className={`${boxBgClass} border rounded-2xl px-6 py-4 transition-colors flex items-center gap-6 shadow-sm`}>
                                            <div className="w-[160px] shrink-0 flex flex-col justify-center">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm text-zinc-200 font-bold tracking-tight">
                                                        {getScoreLabel(key, resultData.category)}
                                                    </span>
                                                </div>
                                                {data.weight && (
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                                                            <div className="h-full bg-zinc-600 rounded-full" style={{ width: `${(data.weight / 15) * 100}%` }}></div>
                                                        </div>
                                                        <span className="text-[10px] text-zinc-500 font-medium w-6 text-right">
                                                            {data.weight}%
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="w-px h-10 bg-white/10 shrink-0"></div>
                                            <div className="w-12 shrink-0 text-center">
                                                <span className={`text-3xl font-bold ${scoreColorClass} leading-none`}>{scoreVal}</span>
                                            </div>
                                            <p className="text-sm font-normal leading-relaxed text-zinc-300 break-keep flex-1">{data.reason}</p>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-auto">
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg flex flex-col justify-center">
                                    <div className="flex justify-between items-center mb-6">
                                        <label className="text-sm font-bold text-white flex items-center gap-2"><Settings className="w-4 h-4 text-[#df6a78]" />점수 보정</label>
                                        <span className={`text-sm text-xl font-bold px-4 py-1 rounded-lg border leading-none pt-1.5 ${manualScoreAdj > 0 ? 'bg-[#df6a78]/20 text-[#df6a78] border-[#df6a78]/30' : manualScoreAdj < 0 ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-white/10 text-zinc-300 border-white/10'}`}>
                                            {manualScoreAdj > 0 ? '+' : ''}{manualScoreAdj}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setManualScoreAdj(Math.max(-3, manualScoreAdj - 1))} className="text-2xl font-bold w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 text-zinc-400 hover:text-white transition-colors">-</button>
                                        <input type="range" min="-3" max="3" step="1" value={manualScoreAdj} onChange={(e) => setManualScoreAdj(parseInt(e.target.value))} className="flex-1 h-2 rounded-full appearance-none cursor-pointer focus:outline-none shadow-inner mx-2" style={{ background: `linear-gradient(to right, #ef4444 0%, #52525b 50%, #f15d72 100%)` }} />
                                        <button onClick={() => setManualScoreAdj(Math.min(3, manualScoreAdj + 1))} className="text-2xl font-bold w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 text-zinc-400 hover:text-white transition-colors">+</button>
                                    </div>
                                </div>

                                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 xl:col-span-2 flex flex-col sm:flex-row gap-5 shadow-lg items-center">
                                    <div className="flex-1 flex flex-col w-full">
                                        <div className="flex justify-between items-center mb-3">
                                            <label className="text-sm font-bold flex items-center gap-2 text-white"><Edit3 className="w-4 h-4 text-violet-400" /> 코멘트 (기준 업데이트용)</label>
                                            <button onClick={handleUpdateCriteria} className="text-[11px] px-2.5 py-1 rounded-md bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:bg-violet-500/30 transition-colors flex items-center gap-1">
                                                <BrainCircuit className="w-3 h-3" /> 프롬프트에 추가
                                            </button>
                                        </div>
                                        <textarea value={userComment} onChange={(e) => setUserComment(e.target.value)} placeholder="아쉬웠던 점이나 새로운 기준을 적고 '프롬프트에 추가'를 누르면, AI가 다음 평가부터 이 기준을 학습하여 채점합니다." className="w-full flex-1 p-4 rounded-xl border border-white/10 bg-black/40 text-[13px] font-normal resize-none focus:border-violet-500 focus:outline-none transition-all text-white placeholder:text-zinc-600 custom-scrollbar min-h-[80px]" />
                                    </div>
                                    <button onClick={copyResultJson} className={`shrink-0 w-full sm:w-[140px] h-[80px] sm:h-full rounded-xl flex flex-col items-center justify-center gap-2 transition-all border shadow-lg ${isCopied ? 'bg-[#df6a78]/20 border-[#df6a78]/50 text-[#df6a78]' : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300 hover:text-white'}`}>
                                        {isCopied ? <Check className="w-7 h-7" /> : <Copy className="w-7 h-7" />}
                                        <span className="text-sm font-bold">{isCopied ? '복사 완료!' : '결과 복사'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </main>

        {isSettingsOpen && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in" onClick={() => setIsSettingsOpen(false)}>
                <div className="bg-[#111] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center p-6 border-b border-white/10 shrink-0">
                        <div className="flex gap-6">
                            <button onClick={() => setSettingsTab('api')} className={`text-lg font-bold flex items-center gap-2 transition-colors ${settingsTab === 'api' ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>
                                <Settings className={`w-5 h-5 ${settingsTab === 'api' ? 'text-[#df6a78]' : ''}`} /> API 설정
                            </button>
                            <button onClick={() => setSettingsTab('prompt')} className={`text-lg font-bold flex items-center gap-2 transition-colors ${settingsTab === 'prompt' ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>
                                <Edit3 className={`w-5 h-5 ${settingsTab === 'prompt' ? 'text-[#0eb9b3]' : ''}`} /> 평가 기준 편집
                            </button>
                        </div>
                        <button onClick={() => setIsSettingsOpen(false)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
                    </div>
                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                        {settingsTab === 'api' ? (
                            <div className="space-y-5">
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5"><BrainCircuit className="w-4 h-4 text-[#df6a78]" /> Gemini API Key</label>
                                    <input type="password" value={geminiApiKey} onChange={(e) => setGeminiApiKey(e.target.value)} placeholder="Gemini API 키 입력" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#df6a78] focus:outline-none transition-colors placeholder:text-zinc-500" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-violet-400" /> OpenAI API Key (선택)</label>
                                    <input type="password" value={openAiApiKey} onChange={(e) => setOpenAiApiKey(e.target.value)} placeholder="ChatGPT API 키 입력" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-violet-500 focus:outline-none transition-colors placeholder:text-zinc-600" />
                                    <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed">Gemini 단독 평가도 가능하며, OpenAI 키를 추가로 입력하면 듀얼 AI 검증으로 더욱 정밀한 평균 점수를 도출합니다.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full min-h-[300px]">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                                        <Bot className="w-4 h-4 text-[#0eb9b3]" /> AI 채점 지침 (Prompt)
                                    </label>
                                    <div className="flex gap-2">
                                        <button onClick={exportCriteriaToTxt} className="text-[11px] px-3 py-1.5 rounded-md bg-[#0eb9b3]/10 border border-[#0eb9b3]/30 hover:bg-[#0eb9b3]/20 text-[#0eb9b3] transition-colors flex items-center gap-1">
                                            <Download className="w-3 h-3" /> 현재 활성 버전 내보내기
                                        </button>
                                    </div>
                                </div>
                                <div className="text-[10px] text-violet-300 bg-violet-500/10 border border-violet-500/30 rounded-md px-3 py-2 mb-2">
                                    평가 기준은 이제 <b>NEXUS Admin → 평가 기준 관리</b>에서 관리됩니다.
                                    {criteriaLoading ? " (불러오는 중...)" : ` 활성 버전: 배너 ${criteriaByType.banner.versionName} · 프로모션 ${criteriaByType.promotion.versionName} · 브랜드웹 ${criteriaByType.brandweb.versionName}`}
                                </div>
                                <textarea value={evaluationCriteria} readOnly className="w-full flex-1 min-h-[350px] bg-black/50 border border-white/10 rounded-lg p-4 text-[13px] text-zinc-400 outline-none transition-colors custom-scrollbar leading-relaxed resize-none cursor-default" />
                                <p className="text-[11px] text-zinc-500 mt-3 leading-relaxed">※ 위 내용은 Firestore 활성 버전을 합성한 결과로, 읽기 전용입니다. 변경하려면 NEXUS Admin 으로 이동하세요.</p>
                            </div>
                        )}
                    </div>
                    <div className="p-6 pt-0 shrink-0">
                        <button onClick={() => setIsSettingsOpen(false)} className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-sm font-bold text-white transition-colors">저장 및 닫기</button>
                    </div>
                </div>
            </div>
        )}

        {isImageModalOpen && previewUrl && (
            <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[200] flex flex-col p-4 md:p-8 animate-in fade-in" onClick={() => setIsImageModalOpen(false)}>
                <div className="flex justify-end mb-4 shrink-0">
                    <button onClick={() => setIsImageModalOpen(false)} className="p-3 bg-white/10 hover:bg-[#df6a78] border border-white/10 rounded-full text-white transition-all shadow-lg">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar flex justify-center items-start rounded-xl" onClick={(e) => e.stopPropagation()}>
                    <img src={previewUrl} alt="Full Size Preview" className="max-w-full h-auto shadow-2xl border border-white/10" />
                </div>
            </div>
        )}

        {notification && (
            <div className="fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-zinc-900 border border-zinc-700 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 z-[600]">
                <div className="w-2 h-2 rounded-full bg-[#df6a78] animate-pulse" />
                <span className="text-sm font-medium text-white">{notification}</span>
            </div>
        )}
    </div>
  );

}
