import { useState, useRef, useCallback } from 'react';
import { callGeminiAPI, callOpenAIAPI, buildEvalPrompt, buildLearningContext } from '../services/gemini';
import { prepareImageForAI } from '../services/cloudinary';
import { fetchBannerImage } from '../services/firebase';
import { DEFAULT_AI_PROMPT, EVALUATION_KEYS } from '../constants/categories';

const safeRender = (v, fb = '') => {
  if (v == null) return fb;
  if (typeof v === 'object') return fb;
  return String(v);
};

export const useEvaluation = ({
  banners, updateBanner, customAiPrompt, criteriaListText,
  geminiApiKey, openAiApiKey, showNotification, onSelectionAffect,
}) => {
  const [processingBannerId, setProcessingBannerId] = useState(null);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState({ isOpen: false, status: 'idle', current: 0, total: 0, target: '' });
  const stopBatchRef = useRef(false);
  const activeFetchControllerRef = useRef(null);

  const handleSmartAnalysis = useCallback(async (banner, e, isBatch = false) => {
    if (e) e.stopPropagation();
    setProcessingBannerId(banner.id);
    if (!isBatch) {
      if (openAiApiKey) showNotification("듀얼 AI(Gemini + ChatGPT) 10대 지표 분석 중...");
      else showNotification("AI 10대 지표 분석 중... (단일 모델)");
    }
    try {
      let imgSource = banner.loadedImage || banner.preview || banner.imageUrl || banner.thumbnailUrl || null;
      if (!imgSource && banner.imageId && !banner.isTemp) {
        try {
          const data = await fetchBannerImage(banner.imageId);
          if (data) imgSource = data.original || data.thumbnail;
        } catch (err) { console.error("[BannerCodex] legacy image load failed", err); }
      }
      if (!imgSource) {
        showNotification("분석할 이미지 데이터를 불러올 수 없습니다.");
        setProcessingBannerId(null); return;
      }

      let base64Image;
      try { base64Image = await prepareImageForAI(imgSource); }
      catch (err) {
        console.error("[BannerCodex] image conversion failed", err);
        showNotification(`이미지 변환 실패: ${err.message || err}`);
        setProcessingBannerId(null); return;
      }
      if (!base64Image) {
        showNotification("이미지를 base64로 변환하지 못했습니다.");
        setProcessingBannerId(null); return;
      }

      const learningContext = buildLearningContext(banner, banners);
      const dynamicPrompt = buildEvalPrompt(customAiPrompt || DEFAULT_AI_PROMPT, learningContext, criteriaListText);

      let geminiResult = null;
      let openaiResult = null;
      try {
        const promises = [callGeminiAPI(dynamicPrompt, base64Image, true, {
          apiKey: geminiApiKey, isBatchCall: isBatch, stopRef: stopBatchRef,
          onController: (c) => { activeFetchControllerRef.current = c; }
        })];
        if (openAiApiKey) promises.push(callOpenAIAPI(dynamicPrompt, base64Image, openAiApiKey));
        const results = await Promise.allSettled(promises);
        if (results[0].status === 'fulfilled' && !results[0].value?.startsWith?.('ERROR:')) geminiResult = results[0].value;
        else if (!isBatch) showNotification(`Gemini API 오류: ${results[0].value?.replace?.('ERROR:', '')}`);
        if (openAiApiKey && results[1]?.status === 'fulfilled' && results[1].value) openaiResult = results[1].value;
      } catch (err) { console.error("병렬 API 호출 실패", err); }

      if (!geminiResult && !openaiResult) {
        if (!isBatch) showNotification("AI 분석에 실패했습니다. (API 응답 없음)");
        setProcessingBannerId(null); return;
      }

      let geminiData = null, openaiData = null;
      if (geminiResult) try { geminiData = JSON.parse(geminiResult.replace(/```json|```/g, '').trim()); } catch (e) { console.error("Gemini JSON Parse Error", e); }
      if (openaiResult) try { openaiData = JSON.parse(openaiResult.replace(/```json|```/g, '').trim()); } catch (e) { console.error("OpenAI JSON Parse Error", e); }

      const primaryData = geminiData || openaiData;
      if (primaryData) {
        const updateData = { ocrProcessed: true };
        if (primaryData.title) updateData.title = String(primaryData.title);
        if (primaryData.date_info) {
          const isInvalid = (val) => !val || String(val).toLowerCase() === "null" || String(val).includes("없음") || String(val).includes("불명");
          if (primaryData.date_info.year && !isInvalid(primaryData.date_info.year)) updateData.year = String(primaryData.date_info.year);
          if (primaryData.date_info.month && !isInvalid(primaryData.date_info.month)) updateData.month = String(primaryData.date_info.month).padStart(2, '0');
          if (primaryData.date_info.full_date && !isInvalid(primaryData.date_info.full_date)) updateData.date = String(primaryData.date_info.full_date);
        }
        if (Array.isArray(primaryData.tags)) updateData.tags = primaryData.tags.map(String);
        if (primaryData.scores_data) {
          const mergeScore = (g, o) => {
            if (g != null && o != null) return (g + o) / 2;
            if (g != null) return g;
            if (o != null) return o;
            return null;
          };
          const mergeReason = (g, o) => g || o || '';
          const merged = {};
          let totalSum = 0, validCount = 0;
          const missing = [];
          EVALUATION_KEYS.forEach(key => {
            const gS = geminiData?.scores_data?.[key]?.score;
            const oS = openaiData?.scores_data?.[key]?.score;
            const score = mergeScore(gS, oS);
            const reason = mergeReason(geminiData?.scores_data?.[key]?.reason, openaiData?.scores_data?.[key]?.reason);
            if (score == null) {
              missing.push(key);
              merged[key] = { score: null, reason: reason || '(분석 누락 — AI 응답에 없음)' };
            } else {
              merged[key] = { score: Math.round(score), reason };
              totalSum += score; validCount++;
            }
          });
          if (missing.length > 0) console.warn(`[BannerCodex] AI 응답에서 누락된 항목 ${missing.length}/10: ${missing.join(', ')}`);
          const avg100 = validCount > 0 ? totalSum / validCount : 0;
          let aiScore = Math.round((avg100 / 10) * 10) / 10;
          updateData.scores = merged;
          updateData.aiScore = aiScore;
          updateData.scoredCount = validCount;
          updateData.manualScoreAdj = 0;
          updateData.score = Math.max(0.0, Math.min(9.9, aiScore)).toFixed(1);
          if (validCount < 10 && !isBatch) {
            showNotification(`분석 완료 — 단, ${10 - validCount}개 항목이 AI 응답에서 누락됨`);
          }
        }
        await updateBanner(banner.id, updateData);
        onSelectionAffect?.(banner.id, updateData);
        if (!isBatch) showNotification("분석 완료");
      } else if (!isBatch) showNotification("정보를 찾을 수 없습니다.");
    } catch (e) { if (!isBatch) showNotification("오류가 발생했습니다."); }
    finally { setProcessingBannerId(null); }
  }, [banners, customAiPrompt, criteriaListText, geminiApiKey, openAiApiKey, updateBanner, showNotification, onSelectionAffect]);

  // 일괄 분석 — 순차 처리 + 호출 사이 throttle.
  // 이전엔 concurrency=3 병렬 + Gemini 내부 retry 3회 조합으로 같은 시간에 최대 9건 동시 호출 가능했고,
  // 무료 Gemini RPM(분당 60) 또는 일일 quota 를 빠르게 소진해 중간에 멈추는 사례가 있었음.
  // PromotionArchive 패턴(순차)로 통일 + Gemini 무료 RPM 안전선(약 1.5초/요청) 확보.
  const BATCH_THROTTLE_MS = 800;
  const runSelectedOCR = useCallback(async (selectedIds, sourceBanners, onComplete) => {
    if (isBatchProcessing) { stopBatchRef.current = true; return; }
    const targets = sourceBanners.filter(b => selectedIds.includes(b.id));
    if (targets.length === 0) return;
    setIsBatchProcessing(true);
    stopBatchRef.current = false;
    setOcrProgress({ isOpen: true, status: 'processing', current: 0, total: targets.length, target: '' });
    showNotification(`${targets.length}개의 선택된 배너 순차 분석 시작`);
    let done = 0;
    try {
      for (let i = 0; i < targets.length; i++) {
        if (stopBatchRef.current) break;
        const banner = targets[i];
        setOcrProgress(prev => ({ ...prev, target: safeRender(banner?.title) || '분석 중...' }));
        try { await handleSmartAnalysis(banner, null, true); }
        catch (err) { console.error(`[BannerCodex] 분석 실패 (계속 진행):`, err); }
        done += 1;
        setOcrProgress(prev => ({ ...prev, current: done, target: safeRender(banner.title) || '분석 중...' }));
        // 호출 사이 throttle — 마지막 항목 뒤엔 대기 생략.
        if (i < targets.length - 1 && !stopBatchRef.current) {
          await new Promise(resolve => setTimeout(resolve, BATCH_THROTTLE_MS));
        }
      }
    } finally {
      activeFetchControllerRef.current = null;
      setIsBatchProcessing(false);
      setOcrProgress({ isOpen: false, status: 'idle', current: 0, total: 0, target: '' });
      if (!stopBatchRef.current) showNotification("선택된 항목 분석 완료");
      else showNotification("분석이 중지되었습니다.");
      onComplete?.();
    }
  }, [isBatchProcessing, handleSmartAnalysis, showNotification]);

  const handleCancelBatch = useCallback(() => {
    stopBatchRef.current = true;
    try { activeFetchControllerRef.current?.abort(new Error("사용자가 분석을 중지했습니다.")); } catch {}
  }, []);

  return {
    processingBannerId, isBatchProcessing, ocrProgress, setOcrProgress,
    handleSmartAnalysis, runSelectedOCR, handleCancelBatch,
  };
};
