// 비-AI 핸들러 모음 — preset/reset/clipboard/upload + tuning room open + dynamic option upsert.
// AI 호출 핸들러는 breezeAiHandlers.js 에 분리.

import { applyScriptPreset, applyCategoryChange } from '../hooks/usePresets.js';

export const createHandlers = (b) => {
  const presetSetters = {
    setSelectedCategory: b.setSelectedCategory, setAiPersona: b.setAiPersona, setScriptType: b.setScriptType,
    setStemWeight: b.setStemWeight, setTerminalStyle: b.setTerminalStyle, setStrokeTexture: b.setStrokeTexture,
    setAnalogImperfection: b.setAnalogImperfection, setStrokeExtension: b.setStrokeExtension,
    setLetterConnection: b.setLetterConnection, setStrokeSharpness: b.setStrokeSharpness,
    setRhythmDynamic: b.setRhythmDynamic, setTextFlow: b.setTextFlow, setPlayfulDistortion: b.setPlayfulDistortion,
    setCharProportion: b.setCharProportion, setInternalDecoration: b.setInternalDecoration,
    setSlantAngle: b.setSlantAngle, setCasualSurrounding: b.setCasualSurrounding,
  };

  const handleScriptPresetChange = (id) => applyScriptPreset(id, presetSetters);
  const handleCategoryChange = (cat) => applyCategoryChange(cat, presetSetters);

  // Micro-Edit 진입 — 생성 이미지가 있고 레퍼런스가 비어있으면 자동으로 base(레퍼런스)로 임포트.
  // (사용자가 이미 직접 올린 레퍼런스가 있으면 덮어쓰지 않음.)
  const enterMicroEdit = () => {
    b.setBaseLangView('ko');
    if (!b.editUploadedImage && b.renderedImage?.dataUrl) b.setEditUploadedImage(b.renderedImage.dataUrl);
    b.setCurrentView('edit');
  };

  // 렌더된 이미지를 Micro-Edit 레퍼런스(base)로 전송 — Creation/Edit 양쪽에서 호출.
  // Edit 뷰에서 누르면 방금 편집한 결과를 다시 base 로 올려 추가 효과를 반복 적용할 수 있음.
  const sendRenderedToEditReference = () => {
    if (!b.renderedImage?.dataUrl) return;
    b.setEditUploadedImage(b.renderedImage.dataUrl);
    b.setBaseLangView('ko');
    b.setCurrentView('edit');
  };

  const handleReset = () => {
    b.setDynamicOptions({ CasualStyles: [], strokeTextures: [], analogImperfections: [], strokeEnds: [], strokeWeights: [], strokeSharpness: [], widths: [], kerningOptions: [], strokeExtensions: [], rhythmDynamics: [], playfulDistortions: [] });
    b.setCustomDesignInjections(""); b.setNanoViewMode("enhanced"); b.setAiModel("Overview");
    b.setEnhanceMode("perfection"); b.setMomentumActive(false); b.setIsAdvancedOptionsEnabled(false);
    b.setPersonaSliderValue(50); b.setBase64Image(null);
    b.setAiRecSummary(null); b.setLastRecSource(null);
    b.setStyleImage(null); b.setVerificationLog("");
    b.setDramaticPrompt(null); b.setOptimizedPrompt(null); b.setMjOptimizedPrompt(null); b.setCgEnhancedPrompt(null);
    b.setEditDramaticPrompt(null); b.setEditOptimizedPrompt(null); b.setEditMjPrompt(null); b.setEditCgPrompt(null);
    handleCategoryChange(b.selectedCategory);
  };

  const copyToClipboard = (text, type) => {
    const ta = document.createElement("textarea");
    ta.value = text || ''; document.body.appendChild(ta); ta.select();
    try {
      document.execCommand('copy');
      if (type === 'top') b.setCopiedTop(true); else b.setCopiedBottom(true);
      setTimeout(() => { b.setCopiedTop(false); b.setCopiedBottom(false); }, 2000);
    } catch (err) { console.error("Failed to copy", err); }
    document.body.removeChild(ta);
  };

  // dynamicOptions 에 새 옵션 upsert. 객체면 추가하고 id 반환, 문자열이면 그대로.
  const upsertDynamic = (key, val) => {
    if (val && typeof val === 'object' && val.id && val.name) {
      b.setDynamicOptions(prev => {
        const exists = prev[key]?.find(o => o.id === val.id);
        if (!exists) return { ...prev, [key]: [...(prev[key] || []), val] };
        return prev;
      });
      return val.id;
    }
    return val && typeof val === 'object' ? val.id || val : val;
  };

  const openTuningRoom = () => {
    b.setCurrentTunedAura(b.customDesignInjections);
    b.setTuningChatHistory([{ role: 'assistant', content: "안녕하세요! 구체화된 아이디어를 바탕으로 추가 수정하고 싶으신 방향을 자유롭게 말씀해 주세요." }]);
    b.setTuningInputValue(""); b.setIsTuningModalOpen(true);
  };

  const openEditTuningRoom = () => {
    b.setCurrentTunedEditAura(b.editInstruction);
    b.setEditTuningChatHistory([{ role: 'assistant', content: "이미지 편집 튜닝룸입니다! 원하시는 수정 방향을 대화하듯 말씀해 주세요." }]);
    b.setEditTuningInputValue(""); b.setIsEditTuningModalOpen(true);
  };

  const processStyleFile = (file) => { const r = new FileReader(); r.onloadend = () => b.setStyleImage(r.result); r.readAsDataURL(file); };
  const handleEditDrop = (e) => { e.preventDefault(); b.setIsDragging(false); const f = e.dataTransfer.files[0]; if (f && f.type.startsWith('image/')) { const r = new FileReader(); r.onloadend = () => b.setEditUploadedImage(r.result); r.readAsDataURL(f); } };
  const handleEditImageUpload = (e) => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onloadend = () => b.setEditUploadedImage(r.result); r.readAsDataURL(f); } };
  const handleDragOver = (e) => { e.preventDefault(); b.setIsDragging(true); };
  const handleDragLeave = () => { b.setIsDragging(false); };
  const handleStyleDragOver = (e) => { e.preventDefault(); b.setIsStyleDragging(true); };
  const handleStyleDragLeave = () => { b.setIsStyleDragging(false); };
  const handleStyleDrop = (e) => { e.preventDefault(); b.setIsStyleDragging(false); const f = e.dataTransfer.files[0]; if (f && f.type.startsWith('image/')) processStyleFile(f); };
  const handleStyleImageUpload = (e) => { const f = e.target.files[0]; if (f) processStyleFile(f); };

  return {
    handleScriptPresetChange, handleCategoryChange, handleReset, copyToClipboard, upsertDynamic,
    enterMicroEdit, sendRenderedToEditReference,
    openTuningRoom, openEditTuningRoom,
    handleEditDrop, handleEditImageUpload, handleDragOver, handleDragLeave,
    handleStyleDragOver, handleStyleDragLeave, handleStyleDrop, handleStyleImageUpload,
  };
};
