// Gemini 호출이 필요한 핸들러들 — verify/recommend/analyze/tuning/expand/request*
// breezeHandlers.js 와 분리하여 200줄 제약을 지킨다.

import { buildPrompts, buildEditPrompts } from '../hooks/useBreezePrompt.js';
import * as gemini from '../services/gemini.js';
import { directorPersonas, getSliderText } from '../constants/categories.jsx';

export const createAiHandlers = (b, { upsertDynamic }) => {
  const getStateSnapshot = () => ({
    inputText: b.inputText, customDesignInjections: b.customDesignInjections, personaSliderValue: b.personaSliderValue,
    enhanceMode: b.enhanceMode, momentumActive: b.momentumActive, baseStyle: b.baseStyle, aspectRatio: b.aspectRatio,
    occupancy: b.occupancy, layoutType: b.layoutType, stemWeight: b.stemWeight, charWidth: b.charWidth,
    charProportion: b.charProportion, kerning: b.kerning, scriptType: b.scriptType, terminalStyle: b.terminalStyle,
    strokeTexture: b.strokeTexture, strokeSharpness: b.strokeSharpness, strokeExtension: b.strokeExtension,
    slantAngle: b.slantAngle, rhythmDynamic: b.rhythmDynamic, playfulDistortion: b.playfulDistortion,
    analogImperfection: b.analogImperfection, internalDecoration: b.internalDecoration, textFlow: b.textFlow,
    letterConnection: b.letterConnection, casualSurrounding: b.casualSurrounding, dynamicOptions: b.dynamicOptions,
    isAdvancedOptionsEnabled: b.isAdvancedOptionsEnabled, aiPersona: b.aiPersona, aiModel: b.aiModel,
    nanoViewMode: b.nanoViewMode, dramaticPrompt: b.dramaticPrompt, optimizedPrompt: b.optimizedPrompt,
    mjOptimizedPrompt: b.mjOptimizedPrompt, cgEnhancedPrompt: b.cgEnhancedPrompt,
    editTargetCategory: b.editTargetCategory, editTexStyle: b.editTexStyle, editEdgeStyle: b.editEdgeStyle,
    editExtStyle: b.editExtStyle, editRhythmStyle: b.editRhythmStyle, editObjLetter: b.editObjLetter,
    editObjItem: b.editObjItem, editInstruction: b.editInstruction, editAiModel: b.editAiModel,
    editNanoMode: b.editNanoMode, editDramaticPrompt: b.editDramaticPrompt, editOptimizedPrompt: b.editOptimizedPrompt,
    editMjPrompt: b.editMjPrompt, editCgPrompt: b.editCgPrompt,
  });
  const getPrompts = () => buildPrompts(getStateSnapshot());
  const getEditPrompts = () => buildEditPrompts(getStateSnapshot());

  const verifyPromptLogic = async () => {
    if (b.isVerifyingLogic) return;
    b.setIsVerifyingLogic(true);
    const persona = directorPersonas.find(p => p.id === b.aiPersona) || directorPersonas[0];
    const stateStr = `Persona: ${persona.shortTitle}\nAura: "${b.customDesignInjections}"\nOptions: Weight(${b.stemWeight}), Terminal(${b.terminalStyle}), Texture(${b.strokeTexture}), Sharpness(${b.strokeSharpness}), Rhythm(${b.rhythmDynamic}), Distortion(${b.playfulDistortion}), Internal(${b.internalDecoration})`;
    try {
      const res = await gemini.auditPromptLogic(stateStr);
      if (res.auditLog) { b.setVerificationLog(res.auditLog); b.setIsAuditedHighlight(true); b.setIsAuditModalOpen(true); setTimeout(() => b.setIsAuditedHighlight(false), 2000); }
      if (res.fixedAura) b.setCustomDesignInjections(res.fixedAura);
      if (res.fixedOptions) {
        const f = res.fixedOptions;
        if (f.stemWeight) b.setStemWeight(f.stemWeight);
        if (f.terminalStyle) b.setTerminalStyle(f.terminalStyle);
        if (f.strokeTexture) b.setStrokeTexture(f.strokeTexture);
        if (f.strokeSharpness) b.setStrokeSharpness(f.strokeSharpness);
        if (f.rhythmDynamic) b.setRhythmDynamic(f.rhythmDynamic);
        if (f.playfulDistortion) b.setPlayfulDistortion(f.playfulDistortion);
        if (f.internalDecoration) b.setInternalDecoration(f.internalDecoration);
      }
    } catch (e) { console.error("Audit failed", e); } finally { b.setIsVerifyingLogic(false); }
  };

  const handleAiRecommendation = async () => {
    if (b.isRecommending) return;
    b.setIsRecommending(true);
    const persona = directorPersonas.find(p => p.id === b.aiPersona) || directorPersonas[0];
    try {
      const res = await gemini.recommendStyle({ persona, sliderText: getSliderText(b.personaSliderValue), inputText: b.inputText, customDesignInjections: b.customDesignInjections });
      if (res.summary) { b.setAiRecSummary({ ...res.summary, source: 'text' }); b.setLastRecSource('text'); }
      if (res.setStyle) b.setScriptType(upsertDynamic('CasualStyles', res.setStyle));
      if (res.setWeight) b.setStemWeight(upsertDynamic('strokeWeights', res.setWeight));
      if (res.setTerminal) b.setTerminalStyle(upsertDynamic('strokeEnds', res.setTerminal));
      if (res.setTexture) b.setStrokeTexture(upsertDynamic('strokeTextures', res.setTexture));
      if (res.setRhythm) b.setRhythmDynamic(upsertDynamic('rhythmDynamics', res.setRhythm));
      if (res.setSharpness) b.setStrokeSharpness(upsertDynamic('strokeSharpness', res.setSharpness));
      if (res.setKerning) b.setKerning(upsertDynamic('kerningOptions', res.setKerning));
      b.setIsAdvancedOptionsEnabled(true);
    } catch (e) { console.error(e); } finally { b.setIsRecommending(false); }
  };

  const analyzeStyleImage = async () => {
    if (!b.styleImage || b.isAnalyzingStyle) return;
    b.setIsAnalyzingStyle(true);
    try {
      const res = await gemini.analyzeStyleImage(b.styleImage);
      if (res.aura) b.setCustomDesignInjections(res.aura);
      if (res.setStyle) b.setScriptType(upsertDynamic('CasualStyles', res.setStyle));
      if (res.setWeight) b.setStemWeight(upsertDynamic('strokeWeights', res.setWeight));
      if (res.setTexture) b.setStrokeTexture(upsertDynamic('strokeTextures', res.setTexture));
      if (res.setTerminal) b.setTerminalStyle(upsertDynamic('strokeEnds', res.setTerminal));
      if (res.setRhythm) b.setRhythmDynamic(upsertDynamic('rhythmDynamics', res.setRhythm));
      b.setAiRecSummary({ title: "이미지 스타일 학습 완료", reason: "업로드한 레퍼런스의 조형적 특징을 분석하여 텍스트 프롬프트와 엔진 옵션에 자동 적용했습니다.", source: 'image' });
      b.setLastRecSource('image'); b.setIsAdvancedOptionsEnabled(true);
    } catch (e) { console.error("Style Analysis Failed:", e); } finally { b.setIsAnalyzingStyle(false); }
  };

  const handleSendTuningMessage = async () => {
    if (!b.tuningInputValue.trim() || b.isTuningLoading) return;
    const userMsg = b.tuningInputValue.trim();
    b.setTuningInputValue(""); b.setTuningChatHistory(prev => [...prev, { role: 'user', content: userMsg }]); b.setIsTuningLoading(true);
    const persona = directorPersonas.find(p => p.id === b.aiPersona) || directorPersonas[0];
    try {
      const result = await gemini.sendTuningMessage({ personaRole: persona.role, currentAura: b.currentTunedAura, userMsg });
      if (result.newAura && result.replyMessage) { b.setCurrentTunedAura(result.newAura); b.setTuningChatHistory(prev => [...prev, { role: 'assistant', content: result.replyMessage }]); }
    } catch (e) { b.setTuningChatHistory(prev => [...prev, { role: 'assistant', content: "오류가 발생했습니다." }]); } finally { b.setIsTuningLoading(false); }
  };

  const handleSendEditTuningMessage = async () => {
    if (!b.editTuningInputValue.trim() || b.isEditTuningLoading) return;
    const userMsg = b.editTuningInputValue.trim();
    b.setEditTuningInputValue(""); b.setEditTuningChatHistory(prev => [...prev, { role: 'user', content: userMsg }]); b.setIsEditTuningLoading(true);
    try {
      const result = await gemini.sendEditTuningMessage({ currentAura: b.currentTunedEditAura, userMsg });
      if (result.newAura && result.replyMessage) { b.setCurrentTunedEditAura(result.newAura); b.setEditTuningChatHistory(prev => [...prev, { role: 'assistant', content: result.replyMessage }]); }
    } catch (e) { b.setEditTuningChatHistory(prev => [...prev, { role: 'assistant', content: "오류가 발생했습니다." }]); } finally { b.setIsEditTuningLoading(false); }
  };

  const handleExpandIntent = async () => {
    if (!b.customDesignInjections.trim() || b.isExpandingIntent) return;
    b.setIsExpandingIntent(true);
    try { const t = await gemini.expandIntent(b.customDesignInjections); if (t) b.setCustomDesignInjections(t.trim()); }
    catch (e) {} finally { b.setIsExpandingIntent(false); }
  };

  const handleEditExpandIntent = async () => {
    if (!b.editInstruction.trim() || b.isEditExpandingIntent) return;
    b.setIsEditExpandingIntent(true);
    try { const t = await gemini.expandEditIntent(b.editInstruction); if (t) b.setEditInstruction(t.trim()); }
    catch (e) {} finally { b.setIsEditExpandingIntent(false); }
  };

  const requestDramaticEnhancement = async () => {
    if (b.isEnhancing) return;
    if (!(await b.ensureCanGenerate())) return;
    b.setIsEnhancing(true);
    const { baseTechnical } = getPrompts();
    try { const r = await gemini.generateDramaticPrompt(baseTechnical.en); b.setDramaticPrompt(r); b.setNanoViewMode('enhanced'); b.setIsOutdated(false); }
    catch (err) {} finally { b.setIsEnhancing(false); }
  };

  const requestEditDramaticEnhancement = async () => {
    if (b.isEditEnhancing) return;
    b.setIsEditEnhancing(true);
    const { baseTechnical } = getEditPrompts();
    try { const r = await gemini.generateEditDramaticPrompt(baseTechnical.en); b.setEditDramaticPrompt(r); b.setEditNanoMode('enhanced'); b.setIsEditOutdated(false); }
    catch (err) {} finally { b.setIsEditEnhancing(false); }
  };

  const requestPromptOptimization = async (isEdit = false) => {
    if (isEdit) { if (b.isEditOptimizing) return; b.setIsEditOptimizing(true); } else { if (b.isOptimizing) return; b.setIsOptimizing(true); }
    const { baseTechnical } = isEdit ? getEditPrompts() : getPrompts();
    try {
      const r = await gemini.generateOptimizedTags(baseTechnical.en);
      if (isEdit) { b.setEditOptimizedPrompt(r); b.setEditNanoMode("optimized"); b.setIsEditOutdated(false); }
      else { b.setOptimizedPrompt(r); b.setNanoViewMode("optimized"); b.setIsOutdated(false); }
    } catch (err) {} finally { if (isEdit) b.setIsEditOptimizing(false); else b.setIsOptimizing(false); }
  };

  const requestMidjourneyOptimization = async (isEdit = false) => {
    if (isEdit) { if (b.isEditMjOptimizing) return; b.setIsEditMjOptimizing(true); } else { if (b.isMjOptimizing) return; b.setIsMjOptimizing(true); }
    const { baseTechnical } = isEdit ? getEditPrompts() : getPrompts();
    try {
      const r = await gemini.generateMidjourneyPrompt(baseTechnical.en);
      if (isEdit) { b.setEditMjPrompt(r); b.setIsEditOutdated(false); } else { b.setMjOptimizedPrompt(r); b.setIsOutdated(false); }
    } catch (err) {} finally { if (isEdit) b.setIsEditMjOptimizing(false); else b.setIsMjOptimizing(false); }
  };

  const requestChatGPTEnhancement = async (isEdit = false) => {
    if (isEdit) { if (b.isEditCgEnhancing) return; b.setIsEditCgEnhancing(true); } else { if (b.isCgEnhancing) return; b.setIsCgEnhancing(true); }
    const { baseTechnical } = isEdit ? getEditPrompts() : getPrompts();
    try {
      const r = await gemini.generateChatGPTPrompt(baseTechnical.en);
      if (isEdit) { b.setEditCgPrompt(r); b.setIsEditOutdated(false); } else { b.setCgEnhancedPrompt(r); b.setIsOutdated(false); }
    } catch (err) {} finally { if (isEdit) b.setIsEditCgEnhancing(false); else b.setIsCgEnhancing(false); }
  };

  return {
    verifyPromptLogic, handleAiRecommendation, analyzeStyleImage,
    handleSendTuningMessage, handleSendEditTuningMessage,
    handleExpandIntent, handleEditExpandIntent,
    requestDramaticEnhancement, requestEditDramaticEnhancement, requestPromptOptimization,
    requestMidjourneyOptimization, requestChatGPTEnhancement,
    getPrompts, getEditPrompts,
  };
};
