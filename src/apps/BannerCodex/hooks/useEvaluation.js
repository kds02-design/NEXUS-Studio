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
  banners, updateBanner, customAiPrompt, criteriaListText, criteriaWeights,
  criteriaRules, anchorsText,
  geminiApiKey, openAiApiKey, showNotification, onSelectionAffect,
}) => {
  const [processingBannerId, setProcessingBannerId] = useState(null);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState({ isOpen: false, status: 'idle', current: 0, total: 0, target: '' });
  const stopBatchRef = useRef(false);
  const activeFetchControllerRef = useRef(new Set()); // 진행 중 fetch controllers (동시성 취소 대응)

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

      // 앵커(기준점)를 학습 컨텍스트 앞에 결합 — 앵커 우선, 최근 피드백 보조.
      const baseLearning = buildLearningContext(banner, banners);
      const learningContext = `${anchorsText || ''}${baseLearning || ''}`;
      const dynamicPrompt = buildEvalPrompt(customAiPrompt || DEFAULT_AI_PROMPT, learningContext, criteriaListText, criteriaRules);

      let geminiResult = null;
      let openaiResult = null;
      try {
        let myController = null;
        const promises = [callGeminiAPI(dynamicPrompt, base64Image, true, {
          apiKey: geminiApiKey, isBatchCall: isBatch, stopRef: stopBatchRef,
          onController: (c) => { myController = c; activeFetchControllerRef.current.add(c); }
        })];
        if (openAiApiKey) promises.push(callOpenAIAPI(dynamicPrompt, base64Image, openAiApiKey));
        const results = await Promise.allSettled(promises);
        if (myController) activeFetchControllerRef.current.delete(myController);
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
          // 가중 평균 — 항목별 weight 로 가중. 누락 항목은 분모(totalWeight)에서도 빠져 점수 왜곡 방지.
          // weight 가 없거나 0 이면 1 로 폴백(= 단순 평균과 동일).
          let weightedSum = 0, totalWeight = 0, validCount = 0;
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
              const w = Number(criteriaWeights?.[key]) > 0 ? Number(criteriaWeights[key]) : 1;
              weightedSum += score * w; totalWeight += w; validCount++;
            }
          });
          if (missing.length > 0) console.warn(`[BannerCodex] AI 응답에서 누락된 항목 ${missing.length}/10: ${missing.join(', ')}`);
          const avg100 = totalWeight > 0 ? weightedSum / totalWeight : 0;
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
  }, [banners, customAiPrompt, criteriaListText, criteriaWeights, criteriaRules, anchorsText, geminiApiKey, openAiApiKey, updateBanner, showNotification, onSelectionAffect]);

  // 일괄 분석 — 제한된 동시성(concurrency) + 청크 사이 throttle.
  // flash + thinkingBudget:0 로 per-call 이 빨라졌고, 각 call 의 retry 는 순차라 동시성을 늘리지 않으므로
  // 어느 순간에도 동시 fetch 는 최대 BATCH_CONCURRENCY 건 → 무료 Gemini RPM(60/분) 안전선 내.
  // 더 빠르게/보수적으로 조정하려면 아래 두 상수만 바꾸면 됨.
  const BATCH_CONCURRENCY = 3;
  const BATCH_THROTTLE_MS = 300;
  const runSelectedOCR = useCallback(async (selectedIds, sourceBanners, onComplete) => {
    if (isBatchProcessing) { stopBatchRef.current = true; return; }
    const targets = sourceBanners.filter(b => selectedIds.includes(b.id));
    if (targets.length === 0) return;
    setIsBatchProcessing(true);
    stopBatchRef.current = false;
    setOcrProgress({ isOpen: true, status: 'processing', current: 0, total: targets.length, target: '' });
    showNotification(`${targets.length}개의 선택된 배너 분석 시작 (동시 ${BATCH_CONCURRENCY}건)`);
    let done = 0;
    try {
      for (let i = 0; i < targets.length; i += BATCH_CONCURRENCY) {
        if (stopBatchRef.current) break;
        const chunk = targets.slice(i, i + BATCH_CONCURRENCY);
        setOcrProgress(prev => ({ ...prev, target: `${i + 1}~${Math.min(i + chunk.length, targets.length)}번 동시 분석 중...` }));
        await Promise.allSettled(chunk.map(async (banner) => {
          try { await handleSmartAnalysis(banner, null, true); }
          catch (err) { console.error(`[BannerCodex] 분석 실패 (계속 진행):`, err); }
          done += 1;
          setOcrProgress(prev => ({ ...prev, current: done }));
        }));
        // 청크 사이 throttle — 마지막 청크 뒤엔 대기 생략.
        if (i + BATCH_CONCURRENCY < targets.length && !stopBatchRef.current) {
          await new Promise(resolve => setTimeout(resolve, BATCH_THROTTLE_MS));
        }
      }
    } finally {
      activeFetchControllerRef.current.clear();
      setIsBatchProcessing(false);
      setOcrProgress({ isOpen: false, status: 'idle', current: 0, total: 0, target: '' });
      if (!stopBatchRef.current) showNotification("선택된 항목 분석 완료");
      else showNotification("분석이 중지되었습니다.");
      onComplete?.();
    }
  }, [isBatchProcessing, handleSmartAnalysis, showNotification]);

  const handleCancelBatch = useCallback(() => {
    stopBatchRef.current = true;
    // 동시 진행 중인 모든 fetch 중단.
    try { activeFetchControllerRef.current.forEach(c => { try { c.abort(new Error("사용자가 분석을 중지했습니다.")); } catch {} }); } catch {}
  }, []);

  return {
    processingBannerId, isBatchProcessing, ocrProgress, setOcrProgress,
    handleSmartAnalysis, runSelectedOCR, handleCancelBatch,
  };
};
