// RubiconForge 메인 상태 + 프롬프트 빌드/AI 호출 오케스트레이션 훅.
// 원본 index.jsx 의 모든 state, handler, useEffect, useMemo 를 그대로 이전.

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useGlobal } from '../../../context/GlobalContext';
import { staticOptions, getOptionEn, getOptionProp, getOptionName } from '../constants/categories';
import {
  translatePrompt,
  optimizeComponentPrompt,
  expandIntent as expandIntentApi,
  keywordOptionSetup,
  chatTuningMessage as chatTuningMessageApi,
  analyzeStyleImage,
  generateLore as generateLoreApi,
} from '../services/gemini';
import { renderVariation, renderAtlasVariation } from '../services/variations';
import { renderWithImagen, IMAGEN_MODELS } from '../../../lib/imagenRender';
import {
  VARIATION_MOODS, STYLE_BY_ID, defaultStyleIdsFor,
} from '../constants/variations';

export function useForgePrompt() {
  // 전역 테마와 동기화 — 루트만 light 대응. 내부 위젯은 다크 하드코딩.
  const { isLight } = useGlobal();
  const theme = isLight ? "light" : "dark";
  const [currentView, setCurrentView] = useState("creation");

  const [themeDna, setThemeDna] = useState("LineageDarkRoyal");
  const [assetType, setAssetType] = useState("Button");
  const [outputFormat, setOutputFormat] = useState("Isolated");
  const [layoutArchetype, setLayoutArchetype] = useState("SingleFocal");
  const [slotStructure, setSlotStructure] = useState("CenterCTA");
  const [buttonShape, setButtonShape] = useState("PointedHexagon");
  const [buttonRatio, setButtonRatio] = useState("Wide");
  const [textSafeZone, setTextSafeZone] = useState("Wide");
  const [surfaceTreatment, setSurfaceTreatment] = useState("Glossy3D");
  const [material, setMaterial] = useState("DarkCrimson");
  const [dramaticTex, setDramaticTex] = useState("None");
  const [rimThickness, setRimThickness] = useState("Narrow");
  const [rimMaterial, setRimMaterial] = useState("OrnateGold");
  const [rimColor, setRimColor] = useState("LuxuryGold");
  const [buttonDeco, setButtonDeco] = useState("CompactCorner");
  const [energyCore, setEnergyCore] = useState("None");
  const [enableGlint, setEnableGlint] = useState(false);
  const [shapeDistortion, setShapeDistortion] = useState("None");
  const [userIntent, setUserIntent] = useState("");

  const [styleImage, setStyleImage] = useState(null);
  const [isDraggingStyle, setIsDraggingStyle] = useState(false);
  const [isExpandingIntent, setIsExpandingIntent] = useState(false);
  const [isKeywordSetting, setIsKeywordSetting] = useState(false);
  const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false);
  const [isCopiedBase, setIsCopiedBase] = useState(false);
  const [isCopiedEnhanced, setIsCopiedEnhanced] = useState(false);

  const [aiModel, setAiModel] = useState("NanoBanana");
  const [showOriginalPrompt, setShowOriginalPrompt] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [outputLang, setOutputLang] = useState("EN");
  const [optimizedPrompts, setOptimizedPrompts] = useState({});
  const [translatedPrompts, setTranslatedPrompts] = useState({});
  const [lore, setLore] = useState("");
  const [isGeneratingLore, setIsGeneratingLore] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [tempIntent, setTempIntent] = useState("");
  const chatScrollRef = useRef(null);

  // 변형(베리에이션) 모드 — Micro-Edit 탭에서 사용.
  //   sourceAsset: 원본 dataURL
  //   backgroundRef: (선택) 배경 참고 dataURL — 어울리는 컬러/형태로 조정
  //   selectedMoodId: 분위기 카테고리 (플랫/캐주얼/다크판타지/모던테크/럭셔리)
  //   selectedStyleIds: 4개 — 카테고리 내 구체 스타일 4종 선택
  //   variationResults: 4 슬롯 { styleId, theme, dataUrl?, error?, isLoading }
  const [sourceAsset, setSourceAsset] = useState(null);
  const [isDraggingSource, setIsDraggingSource] = useState(false);
  const [backgroundRef, setBackgroundRef] = useState(null);
  const [isDraggingBackground, setIsDraggingBackground] = useState(false);
  const [selectedMoodId, setSelectedMoodId] = useState(VARIATION_MOODS[2].id); // 기본 다크 판타지
  const [selectedStyleIds, setSelectedStyleIds] = useState(defaultStyleIdsFor(VARIATION_MOODS[2].id));
  const [variationResults, setVariationResults] = useState(() =>
    defaultStyleIdsFor(VARIATION_MOODS[2].id).map(id => {
      const s = STYLE_BY_ID[id];
      return { styleId: id, theme: s, dataUrl: null, error: null, prompt: null, isLoading: false };
    })
  );
  const [isGeneratingVariations, setIsGeneratingVariations] = useState(false);
  // 정제 강도 — 'source' (기본, 원본 밀도 유지) / 'refined' (60% 단순화) / 'minimal' (핵심만)
  const [refinementLevel, setRefinementLevel] = useState('source');

  // ─── 아틀라스(디자인 시스템) 모드 — 변형 모드와 동일 구조, 별도 state 유지 ─────────
  // 단일 에셋 변형과 분리한 이유: 탭 전환 시 업로드/선택이 섞이면 혼란.
  const [atlasSource, setAtlasSource] = useState(null);
  const [isDraggingAtlasSource, setIsDraggingAtlasSource] = useState(false);
  const [atlasBackgroundRef, setAtlasBackgroundRef] = useState(null);
  const [isDraggingAtlasBackground, setIsDraggingAtlasBackground] = useState(false);
  const [selectedAtlasMoodId, setSelectedAtlasMoodId] = useState(VARIATION_MOODS[2].id);
  const [selectedAtlasStyleIds, setSelectedAtlasStyleIds] = useState(defaultStyleIdsFor(VARIATION_MOODS[2].id));
  const [atlasResults, setAtlasResults] = useState(() =>
    defaultStyleIdsFor(VARIATION_MOODS[2].id).map(id => {
      const s = STYLE_BY_ID[id];
      return { styleId: id, theme: s, dataUrl: null, error: null, prompt: null, isLoading: false };
    })
  );
  const [isGeneratingAtlas, setIsGeneratingAtlas] = useState(false);
  const [atlasRefinementLevel, setAtlasRefinementLevel] = useState('source');
  // 마스터 템플릿에서 송신된 명세(마크다운). 있으면 atlas 프롬프트에 ATLAS STRUCTURE SPEC 으로 주입.
  const [atlasSpec, setAtlasSpec] = useState('');
  const [atlasSpecTitle, setAtlasSpecTitle] = useState('');

  // 신규 생성(creation) 탭의 이미지 렌더링 — 컴파일된 영문 프롬프트를 Nano Banana 에 전송.
  // creationRenderModel 은 IMAGEN_MODELS 의 id 중 하나. 기본 빠른 Flash.
  const [creationRenderModel, setCreationRenderModel] = useState(IMAGEN_MODELS[0]?.id || 'gemini-3.1-flash-image-preview');
  // 변형/아틀라스 모드의 렌더 모델 — 기본 Flash, 사용자가 Pro 로 토글 가능.
  // 503 같은 일시 capacity 이슈 회피용으로도 유용 (다른 모델 슬롯 시도).
  const [variationRenderModel, setVariationRenderModel] = useState(IMAGEN_MODELS[0]?.id || 'gemini-3.1-flash-image-preview');
  const [atlasRenderModel, setAtlasRenderModel] = useState(IMAGEN_MODELS[0]?.id || 'gemini-3.1-flash-image-preview');
  const [creationRenderResult, setCreationRenderResult] = useState(null); // { dataUrl, modelId }
  const [creationRenderError, setCreationRenderError] = useState('');
  const [isCreationRendering, setIsCreationRendering] = useState(false);


  const handleAssetTypeChange = (type) => {
    setAssetType(type);
    if (type === 'Button') {
        setLayoutArchetype('SingleFocal'); setSlotStructure('CenterCTA');
        setButtonShape(themeDna === 'ModernFlatBrand' ? 'Pill' : 'PointedHexagon');
        setButtonRatio('Wide'); setButtonDeco('None');
    } else if (type === 'UtilityButton') {
        setLayoutArchetype('SingleFocal'); setSlotStructure('CenterCTA');
        setButtonShape('ChamferedRect'); setButtonRatio('Standard'); setButtonDeco('None'); setRimMaterial('HeavyIron');
    } else if (type === 'RewardCard') {
        setLayoutArchetype('FocalPlusDesc'); setSlotStructure('TopObjectBottomText');
        setButtonShape('RoundedRect'); setButtonRatio('Vertical'); setButtonDeco('None');
    } else if (type === 'FeatureCard') {
        setLayoutArchetype('FocalPlusDesc'); setSlotStructure('TopObjectBottomText');
        setButtonShape('RoundedRect'); setButtonRatio('Square'); setButtonDeco('None');
    } else if (type === 'EventPanel') {
        setLayoutArchetype('HeaderFocalFooter'); setSlotStructure('HeaderBodyFooter');
        setButtonShape('TopTabPanel'); setButtonRatio('Wide'); setButtonDeco('CompactCorner');
    } else if (type === 'SplitPanel') {
        setLayoutArchetype('SplitTwoColumn'); setSlotStructure('LeftTextRightObject');
        setButtonShape('ChamferedRect'); setButtonRatio('Wide'); setButtonDeco('None');
    } else if (type === 'HeaderTab') {
        setLayoutArchetype('SingleFocal'); setSlotStructure('CenterCTA');
        setButtonShape('Ribbon'); setButtonRatio('Wide'); setButtonDeco('None');
    } else if (type === 'BadgeStamp') {
        setLayoutArchetype('SingleFocal'); setSlotStructure('CenterCTA');
        setButtonShape('Starburst'); setButtonRatio('Square'); setButtonDeco('None');
    } else if (type === 'DecoPart') {
        setLayoutArchetype('SingleFocal'); setSlotStructure('FullBleedGraphic');
        setButtonShape('Pedestal'); setButtonRatio('Wide'); setButtonDeco('FloatingShapes');
    }
  };

  const handleThemeDnaChange = (newDna) => {
    setThemeDna(newDna);
    if (newDna === 'LineageDarkRoyal' || newDna === 'CrimsonSiege') {
        setSurfaceTreatment('RoughStone'); setRimThickness('Narrow'); setRimMaterial('OrnateGold');
        setButtonDeco('CompactCorner'); setEnergyCore('None');
    } else if (newDna === 'ImperialBronze') {
        setSurfaceTreatment('Parchment'); setRimThickness('Narrow'); setRimMaterial('HeavyIron'); setEnergyCore('None');
    } else if (newDna === 'ModernFlatBrand') {
        setSurfaceTreatment('Flat'); setRimThickness('None'); setRimMaterial('SolidColor');
        setButtonDeco('None'); setEnergyCore('DropShadow');
    } else if (newDna === 'SoftPastel3D') {
        setSurfaceTreatment('SoftClay'); setRimThickness('None'); setRimMaterial('None');
        setButtonDeco('FloatingShapes'); setEnergyCore('None');
    }
  };

  const handleResetSettings = () => {
    handleThemeDnaChange("LineageDarkRoyal");
    handleAssetTypeChange("Button");
    setOutputFormat("Isolated"); setRimThickness("Narrow"); setEnergyCore("None"); setUserIntent("");
  };

  useEffect(() => {
    setOptimizedPrompts({});
    setTranslatedPrompts({});
  }, [themeDna, assetType, layoutArchetype, slotStructure, buttonShape, buttonRatio, textSafeZone, outputFormat, surfaceTreatment, material, dramaticTex, rimThickness, rimMaterial, rimColor, energyCore, buttonDeco, shapeDistortion, enableGlint, userIntent]);

  const copyToClipboard = (text, type = "enhanced") => {
    if (!text) return;
    const textArea = document.createElement("textarea");
    textArea.value = text; document.body.appendChild(textArea); textArea.select();
    try {
        document.execCommand('copy');
        if (type === "base") { setIsCopiedBase(true); setTimeout(() => setIsCopiedBase(false), 2000); }
        else { setIsCopiedEnhanced(true); setTimeout(() => setIsCopiedEnhanced(false), 2000); }
    } catch (err) { setErrorMsg("클립보드 복사에 실패했습니다."); }
    document.body.removeChild(textArea);
  };

  const handleStyleFile = (file) => {
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setStyleImage(reader.result);
        reader.readAsDataURL(file);
    }
  };
  const handleStyleImageUpload = (e) => handleStyleFile(e.target.files[0]);
  const handleStyleDragOver = useCallback((e) => { e.preventDefault(); setIsDraggingStyle(true); }, []);
  const handleStyleDragLeave = useCallback((e) => { e.preventDefault(); setIsDraggingStyle(false); }, []);
  const handleStyleDrop = useCallback((e) => { e.preventDefault(); setIsDraggingStyle(false); handleStyleFile(e.dataTransfer.files[0]); }, []);
  const handleClearStyleImage = (e) => { e.stopPropagation(); e.preventDefault(); setStyleImage(null); };

  // ─── 변형 모드: 원본 / 배경참고 업로드 ───────────────────────────────
  const handleSourceFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onloadend = () => setSourceAsset(reader.result);
    reader.readAsDataURL(file);
  };
  const handleSourceUpload = (e) => handleSourceFile(e.target.files[0]);
  const handleSourceDragOver = useCallback((e) => { e.preventDefault(); setIsDraggingSource(true); }, []);
  const handleSourceDragLeave = useCallback((e) => { e.preventDefault(); setIsDraggingSource(false); }, []);
  const handleSourceDrop = useCallback((e) => { e.preventDefault(); setIsDraggingSource(false); handleSourceFile(e.dataTransfer.files[0]); }, []);
  const handleClearSource = () => {
    setSourceAsset(null);
    setVariationResults(prev => prev.map(s => ({ ...s, dataUrl: null, error: null, isLoading: false })));
  };

  const handleBackgroundFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onloadend = () => setBackgroundRef(reader.result);
    reader.readAsDataURL(file);
  };
  const handleBackgroundUpload = (e) => handleBackgroundFile(e.target.files[0]);
  const handleBackgroundDragOver = useCallback((e) => { e.preventDefault(); setIsDraggingBackground(true); }, []);
  const handleBackgroundDragLeave = useCallback((e) => { e.preventDefault(); setIsDraggingBackground(false); }, []);
  const handleBackgroundDrop = useCallback((e) => { e.preventDefault(); setIsDraggingBackground(false); handleBackgroundFile(e.dataTransfer.files[0]); }, []);
  const handleClearBackground = () => setBackgroundRef(null);

  // ─── 변형 모드: 분위기 / 스타일 선택 ──────────────────────────────────
  // 분위기 변경 → 그 카테고리 앞 4개로 자동 채움. 사용자는 이후 토글로 교체 가능.
  const handleSelectMood = (moodId) => {
    setSelectedMoodId(moodId);
    const defaults = defaultStyleIdsFor(moodId);
    setSelectedStyleIds(defaults);
    setVariationResults(defaults.map(id => {
      const s = STYLE_BY_ID[id];
      return { styleId: id, theme: s, dataUrl: null, error: null, prompt: null, isLoading: false };
    }));
  };

  // 스타일 칩 토글: 이미 선택 → 해제. 미선택 → 추가. 상한 없음 (카테고리 내 스타일 수만큼 가능).
  const handleToggleStyle = (styleId) => {
    const isSelected = selectedStyleIds.includes(styleId);
    const next = isSelected
      ? selectedStyleIds.filter(id => id !== styleId)
      : [...selectedStyleIds, styleId];
    setSelectedStyleIds(next);
    setVariationResults(next.map(id => {
      const s = STYLE_BY_ID[id];
      return { styleId: id, theme: s, dataUrl: null, error: null, prompt: null, isLoading: false };
    }));
  };

  // ─── 변형 모드: 4개 병렬 생성 ──────────────────────────────────────────
  // 각 슬롯은 자기 결과가 도착하는 즉시 isLoading → false 로 전환되어 도착 순서대로 표시.
  const handleGenerateVariations = async () => {
    if (!sourceAsset) { setErrorMsg('원본 에셋 이미지를 먼저 업로드해주세요.'); return; }
    if (selectedStyleIds.length === 0) { setErrorMsg('스타일을 1개 이상 선택해주세요.'); return; }
    if (isGeneratingVariations) return;
    setIsGeneratingVariations(true);
    const styles = selectedStyleIds.map(id => STYLE_BY_ID[id]).filter(Boolean);
    setVariationResults(styles.map(s => ({ styleId: s.id, theme: s, dataUrl: null, error: null, prompt: null, isLoading: true })));
    await Promise.all(styles.map(async (style, idx) => {
      const result = await renderVariation(sourceAsset, style.promptHint, {
        backgroundRefDataUrl: backgroundRef,
        refinementLevel,
        modelId: variationRenderModel,
      });
      setVariationResults(prev => {
        const next = prev.slice();
        next[idx] = {
          styleId: style.id,
          theme: style,
          dataUrl: result.ok ? result.dataUrl : null,
          error: result.ok ? null : (result.error || '생성 실패'),
          prompt: result.prompt || null,
          isLoading: false,
        };
        return next;
      });
    }));
    setIsGeneratingVariations(false);
  };

  // 단일 슬롯 재시도 — 4장 중 하나만 실패하거나 마음에 안 들 때 그 슬롯만 다시 호출.
  const handleRegenerateVariation = async (idx) => {
    if (!sourceAsset) return;
    const slot = variationResults[idx];
    if (!slot || slot.isLoading) return;
    setVariationResults(prev => {
      const next = prev.slice();
      next[idx] = { ...slot, dataUrl: null, error: null, isLoading: true };
      return next;
    });
    const result = await renderVariation(sourceAsset, slot.theme.promptHint, {
      backgroundRefDataUrl: backgroundRef,
      refinementLevel,
      modelId: variationRenderModel,
    });
    setVariationResults(prev => {
      const next = prev.slice();
      next[idx] = {
        styleId: slot.styleId,
        theme: slot.theme,
        dataUrl: result.ok ? result.dataUrl : null,
        error: result.ok ? null : (result.error || '생성 실패'),
        prompt: result.prompt || null,
        isLoading: false,
      };
      return next;
    });
  };

  // ─── 아틀라스(디자인 시스템) 모드 핸들러 ──────────────────────────────────
  // 단일 변형 핸들러 세트와 동일 구조 — 별도 state 만 사용하도록 분리.
  const handleAtlasSourceFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onloadend = () => setAtlasSource(reader.result);
    reader.readAsDataURL(file);
  };
  const handleAtlasSourceUpload = (e) => handleAtlasSourceFile(e.target.files[0]);
  const handleAtlasSourceDragOver = useCallback((e) => { e.preventDefault(); setIsDraggingAtlasSource(true); }, []);
  const handleAtlasSourceDragLeave = useCallback((e) => { e.preventDefault(); setIsDraggingAtlasSource(false); }, []);
  const handleAtlasSourceDrop = useCallback((e) => { e.preventDefault(); setIsDraggingAtlasSource(false); handleAtlasSourceFile(e.dataTransfer.files[0]); }, []);
  const handleClearAtlasSource = () => {
    setAtlasSource(null);
    setAtlasResults(prev => prev.map(s => ({ ...s, dataUrl: null, error: null, prompt: null, isLoading: false })));
  };

  const handleAtlasBackgroundFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onloadend = () => setAtlasBackgroundRef(reader.result);
    reader.readAsDataURL(file);
  };
  const handleAtlasBackgroundUpload = (e) => handleAtlasBackgroundFile(e.target.files[0]);
  const handleAtlasBackgroundDragOver = useCallback((e) => { e.preventDefault(); setIsDraggingAtlasBackground(true); }, []);
  const handleAtlasBackgroundDragLeave = useCallback((e) => { e.preventDefault(); setIsDraggingAtlasBackground(false); }, []);
  const handleAtlasBackgroundDrop = useCallback((e) => { e.preventDefault(); setIsDraggingAtlasBackground(false); handleAtlasBackgroundFile(e.dataTransfer.files[0]); }, []);
  const handleClearAtlasBackground = () => setAtlasBackgroundRef(null);

  const handleSelectAtlasMood = (moodId) => {
    setSelectedAtlasMoodId(moodId);
    const defaults = defaultStyleIdsFor(moodId);
    setSelectedAtlasStyleIds(defaults);
    setAtlasResults(defaults.map(id => {
      const s = STYLE_BY_ID[id];
      return { styleId: id, theme: s, dataUrl: null, error: null, prompt: null, isLoading: false };
    }));
  };

  const handleToggleAtlasStyle = (styleId) => {
    const isSelected = selectedAtlasStyleIds.includes(styleId);
    const next = isSelected
      ? selectedAtlasStyleIds.filter(id => id !== styleId)
      : [...selectedAtlasStyleIds, styleId];
    setSelectedAtlasStyleIds(next);
    setAtlasResults(next.map(id => {
      const s = STYLE_BY_ID[id];
      return { styleId: id, theme: s, dataUrl: null, error: null, prompt: null, isLoading: false };
    }));
  };

  const handleGenerateAtlas = async () => {
    if (!atlasSource) { setErrorMsg('아틀라스 이미지를 먼저 업로드해주세요.'); return; }
    if (selectedAtlasStyleIds.length === 0) { setErrorMsg('스타일을 1개 이상 선택해주세요.'); return; }
    if (isGeneratingAtlas) return;
    setIsGeneratingAtlas(true);
    const styles = selectedAtlasStyleIds.map(id => STYLE_BY_ID[id]).filter(Boolean);
    setAtlasResults(styles.map(s => ({ styleId: s.id, theme: s, dataUrl: null, error: null, prompt: null, isLoading: true })));
    await Promise.all(styles.map(async (style, idx) => {
      const result = await renderAtlasVariation(atlasSource, style.promptHint, {
        backgroundRefDataUrl: atlasBackgroundRef,
        refinementLevel: atlasRefinementLevel,
        atlasSpec,
        modelId: atlasRenderModel,
      });
      setAtlasResults(prev => {
        const next = prev.slice();
        next[idx] = {
          styleId: style.id,
          theme: style,
          dataUrl: result.ok ? result.dataUrl : null,
          error: result.ok ? null : (result.error || '생성 실패'),
          prompt: result.prompt || null,
          isLoading: false,
        };
        return next;
      });
    }));
    setIsGeneratingAtlas(false);
  };

  const handleRegenerateAtlas = async (idx) => {
    if (!atlasSource) return;
    const slot = atlasResults[idx];
    if (!slot || slot.isLoading) return;
    setAtlasResults(prev => {
      const next = prev.slice();
      next[idx] = { ...slot, dataUrl: null, error: null, isLoading: true };
      return next;
    });
    const result = await renderAtlasVariation(atlasSource, slot.theme.promptHint, {
      backgroundRefDataUrl: atlasBackgroundRef,
      refinementLevel: atlasRefinementLevel,
      atlasSpec,
      modelId: atlasRenderModel,
    });
    setAtlasResults(prev => {
      const next = prev.slice();
      next[idx] = {
        styleId: slot.styleId,
        theme: slot.theme,
        dataUrl: result.ok ? result.dataUrl : null,
        error: result.ok ? null : (result.error || '생성 실패'),
        prompt: result.prompt || null,
        isLoading: false,
      };
      return next;
    });
  };

  const buildPrompts = useCallback((rawOnly = false, forceLang = null, ignoreOpt = false) => {
    const activeLang = forceLang || outputLang;
    const themeEn = getOptionEn(staticOptions.themeDna, themeDna);
    const typeEn = getOptionEn(staticOptions.assetTypes, assetType);
    const layoutEn = getOptionEn(staticOptions.layoutArchetypes, layoutArchetype);
    const slotEn = getOptionEn(staticOptions.slotStructures, slotStructure);
    const shapeEn = getOptionEn(staticOptions.buttonShapes, buttonShape);
    const ratioEn = getOptionEn(staticOptions.buttonRatios, buttonRatio);
    const safeZoneEn = getOptionEn(staticOptions.textSafeZones, textSafeZone);
    const formatEn = getOptionEn(staticOptions.outputFormats, outputFormat);
    const surfaceEn = getOptionEn(staticOptions.surfaceTreatments, surfaceTreatment);
    const matEn = getOptionEn(staticOptions.materials, material);
    // eslint-disable-next-line no-unused-vars
    const texEn = getOptionEn(staticOptions.dramaticTextures, dramaticTex);
    const rimThickEn = getOptionEn(staticOptions.rimThicknesses, rimThickness);
    const rimMatEn = getOptionEn(staticOptions.rimMaterials, rimMaterial);
    const rimColorEn = getOptionEn(staticOptions.rimColors, rimColor);
    const energyEn = getOptionEn(staticOptions.energyCores, energyCore);
    const decoEn = getOptionEn(staticOptions.buttonDecos, buttonDeco);
    // eslint-disable-next-line no-unused-vars
    const distortEn = getOptionEn(staticOptions.shapeDistortions, shapeDistortion);

    let targetAR = getOptionProp(staticOptions.buttonRatios, buttonRatio, 'ar') || "2:1";
    if (outputFormat === "HeroMockup") targetAR = "16:9";

    if (rawOnly) return `[COMPONENT ARCHITECTURE SPEC]\nTheme DNA: ${themeDna}\nComponent Type: ${assetType}\nLayout Archetype: ${layoutArchetype}\nSlot Structure: ${slotStructure}\nShape/Ratio: ${shapeEn} (${ratioEn})\nSafeZone: ${safeZoneEn}\nSurface/Frame: ${surfaceEn} + ${rimThickEn} ${rimMatEn}\nDeco: ${decoEn}\nFX: ${energyEn}\nOutput: ${formatEn}\n${userIntent ? `User Intent: ${userIntent}` : ''}`;

    const baseNegatives = "text, words, typography, watermark, photograph, hand holding phone, screen perspective, messy, cluttered";
    let lightNegatives = "";
    if (energyCore === "None" || energyCore === "DropShadow") {
        lightNegatives = "sunburst, light rays, glowing background, backlighting, ambient light, glowing aura, radiating rays, light beams";
    }
    let structuralNegatives = "protruding ornaments, messy spreading borders, overly thick frame";
    let styleNegatives = "";
    if (themeDna === 'ModernFlatBrand') styleNegatives = "3d render, photorealism, realistic textures, glossy, heavy shading, volumetric lighting, bevel, emboss";
    if (themeDna === 'SoftPastel3D') styleNegatives = "sharp edges, metallic, dirty, noisy, grunge, realistic, dark fantasy";

    const mjNegatives = `--no ${baseNegatives}, ${lightNegatives}, ${structuralNegatives}, ${styleNegatives}`.replace(/,\s*,/g, ',');

    let layoutConstraint = "CRITICAL BACKGROUND: Strictly pure matte black background. ZERO background lighting, NO sunburst, NO backglow. Tightly bounded edges. The component MUST be perfectly isolated in the center with AMPLE EMPTY SPACE around it.";
    if (outputFormat === "HeroMockup") layoutConstraint = "CRITICAL CANVAS: Full screen dramatic promotional web banner layout, central focus on the component, complementary immersive background environment.";
    if (outputFormat === "Kit") layoutConstraint = "CRITICAL CANVAS: A sprite sheet or kit layout containing multiple variations of this component on a dark background.";

    // eslint-disable-next-line no-unused-vars
    const colorConsistencyRule = `STRICT COLOR PALETTE: Main body is ${matEn}. Frame is ${rimMatEn} with ${rimColorEn} accents.`;
    const textSpaceConstraint = `CRITICAL TEXT SAFE ZONE: ${safeZoneEn}. The central area MUST remain completely empty and clean for typography. No icons or patterns in the exact center.`;
    const decorationRules = buttonDeco === "None" ? "STRICTLY NO decorations." : `DECORATIONS: ${decoEn}. Must remain compact.`;
    const frameConstraint = `FRAME: ${rimThickEn} made of ${rimMatEn}. Ensure it is tightly bounded and does not protrude excessively.`;
    const glintTechnical = enableGlint ? "Add dramatic crisp specular highlights on the edges to draw attention." : "Soft diffuse lighting on edges.";

    const gptPrompt = `Create a professional promotional web component.
Theme/Vibe: ${themeEn}
Component Type: ${typeEn}
Layout Archetype: ${layoutEn}
Slot Structure (CRITICAL): ${slotEn}
Base Shape & Ratio: ${shapeEn}, ${ratioEn}
Surface Finish: ${surfaceEn}
Frame & Border: ${frameConstraint}
Decorations & FX: ${decorationRules} ${energyEn}. ${glintTechnical}
Output Constraint: ${layoutConstraint}
${textSpaceConstraint}
${userIntent ? `Specific Feature: ${userIntent}. ` : ''}The final image must be perfectly structured for use in a campaign website layout. Ensure edges are tight and background is free of stray light rays unless specified.`.trim();

    let strictNanoBackground = outputFormat === 'Isolated' ? 'isolated on pure black background void, (no background light:1.5), (no sunburst:1.5), perfectly clean background, tightly bounded shape' : 'campaign mockup';
    const nanoPrompt = `masterpiece, best quality, web promotional asset, ${typeEn}, ${themeEn}, ${layoutEn}, ${slotEn}, ${shapeEn}, ${surfaceEn}, ${rimThickEn} ${rimMatEn} frame, tightly contained edges, non-protruding, ${decoEn}, ${energyEn}, ${enableGlint ? "crisp highlights" : "flat lighting"}, ${strictNanoBackground}, ${safeZoneEn}, blank central area for text, vector graphic style, highly detailed, 8k${userIntent ? `, ${userIntent}` : ''}`.trim();

    const mjPrompt = `/imagine prompt: masterpiece game UI asset design, ${typeEn} component. THEME: ${themeEn}. LAYOUT ARCHETYPE: ${layoutEn}. SLOT STRUCTURE: ${slotEn}. BASE SHAPE: ${shapeEn} (${ratioEn}). SURFACE: ${surfaceEn}. ${frameConstraint} DECORATION: ${decoEn}. ${textSpaceConstraint} ${layoutConstraint} ${energyEn}. ${glintTechnical} ${userIntent ? `Focus: ${userIntent}. ` : ''}highly detailed marketing graphic, 8k --ar ${targetAR} --stylize 150 ${mjNegatives} --v 6.1`.trim();

    const summaryKo = `[Rubicon Forge 컴포넌트 설계서]\n- 테마 DNA: ${getOptionName(staticOptions.themeDna, themeDna)}\n- 컴포넌트: ${getOptionName(staticOptions.assetTypes, assetType)}\n- 레이아웃: ${getOptionName(staticOptions.layoutArchetypes, layoutArchetype)}\n- 베이스 형태: ${getOptionName(staticOptions.buttonShapes, buttonShape)}\n- 텍스트 세이프존: ${getOptionName(staticOptions.textSafeZones, textSafeZone)}\n- 표면: ${getOptionName(staticOptions.surfaceTreatments, surfaceTreatment)}\n- 프레임 굵기: ${getOptionName(staticOptions.rimThicknesses, rimThickness)}\n- 프레임 재질: ${getOptionName(staticOptions.rimMaterials, rimMaterial)}\n- 주변 효과: ${getOptionName(staticOptions.energyCores, energyCore)}\n${userIntent ? `- 커스텀 요구사항: ${userIntent}\n` : ''}`;

    let finalStr = "";
    if (aiModel === "NanoBanana") finalStr = (!ignoreOpt && optimizedPrompts[aiModel]) ? optimizedPrompts[aiModel] : nanoPrompt;
    else if (aiModel === "ChatGPT") finalStr = (!ignoreOpt && optimizedPrompts[aiModel]) ? optimizedPrompts[aiModel] : gptPrompt;
    else if (aiModel === "Midjourney") finalStr = (!ignoreOpt && optimizedPrompts[aiModel]) ? optimizedPrompts[aiModel] : mjPrompt;
    else return summaryKo;

    return (activeLang === "KR" && aiModel !== "Overview") ? (translatedPrompts[aiModel + finalStr] || finalStr) : finalStr;
  }, [aiModel, outputLang, themeDna, assetType, layoutArchetype, slotStructure, buttonShape, buttonRatio, textSafeZone, outputFormat, surfaceTreatment, material, dramaticTex, rimThickness, rimMaterial, rimColor, energyCore, buttonDeco, shapeDistortion, enableGlint, optimizedPrompts, translatedPrompts, userIntent]);

  const finalOutput = buildPrompts(false, null, showOriginalPrompt);
  const originalOutput = buildPrompts(false, null, true);
  const baseSpec = buildPrompts(true);

  const handleTranslatePrompt = async (englishText) => {
    if (!englishText || translatedPrompts[aiModel + englishText]) return;
    setIsTranslating(true);
    try {
      const text = await translatePrompt(englishText);
      if (text) setTranslatedPrompts(prev => ({ ...prev, [aiModel + englishText]: text }));
    } catch (err) { setErrorMsg("한국어 번역 중 오류가 발생했습니다."); }
    finally { setIsTranslating(false); }
  };

  const toggleLanguage = () => {
    const nextLang = outputLang === "EN" ? "KR" : "EN";
    setOutputLang(nextLang);
    if (nextLang === "KR" && aiModel !== "Overview") {
        handleTranslatePrompt(buildPrompts(false, "EN", true));
        if (optimizedPrompts[aiModel]) handleTranslatePrompt(optimizedPrompts[aiModel]);
    }
  };

  const handleOptimizePrompt = async () => {
    if (aiModel === 'Overview') return;
    const currentBase = buildPrompts(true, "EN");
    setIsOptimizing(true);
    try {
      const text = await optimizeComponentPrompt(currentBase);
      if (text) {
          setOptimizedPrompts(prev => ({ ...prev, [aiModel]: text }));
          if (outputLang === "KR") handleTranslatePrompt(text);
      }
    } catch (err) { setErrorMsg("프롬프트 최적화 실패."); }
    finally { setIsOptimizing(false); }
  };

  const handleExpandIntent = async () => {
    if (!userIntent) { setErrorMsg("확장할 짧은 키워드나 아이디어를 먼저 입력해주세요."); return; }
    setIsExpandingIntent(true);
    try {
        const text = await expandIntentApi(userIntent, assetType, themeDna);
        if (text) setUserIntent(text);
    } catch (err) { setErrorMsg("아이디어 구체화에 실패했습니다."); }
    finally { setIsExpandingIntent(false); }
  };

  const handleKeywordSetup = async () => {
    if (!userIntent) { setErrorMsg("키워드나 요구사항을 먼저 입력해주세요."); return; }
    setIsKeywordSetting(true);
    try {
        const validIds = {
            buttonShape: staticOptions.buttonShapes.map(o=>o.id).join(', '),
            textSafeZone: staticOptions.textSafeZones.map(o=>o.id).join(', '),
            buttonDeco: staticOptions.buttonDecos.map(o=>o.id).join(', '),
            shapeDistortion: staticOptions.shapeDistortions.map(o=>o.id).join(', '),
            surfaceTreatment: staticOptions.surfaceTreatments.map(o=>o.id).join(', '),
            material: staticOptions.materials.map(o=>o.id).join(', '),
            dramaticTex: staticOptions.dramaticTextures.map(o=>o.id).join(', '),
            rimThickness: staticOptions.rimThicknesses.map(o=>o.id).join(', '),
            rimMaterial: staticOptions.rimMaterials.map(o=>o.id).join(', '),
            rimColor: staticOptions.rimColors.map(o=>o.id).join(', ')
        };
        const config = await keywordOptionSetup(userIntent, themeDna, assetType, validIds);
        if (config.buttonShape) setButtonShape(config.buttonShape);
        if (config.textSafeZone) setTextSafeZone(config.textSafeZone);
        if (config.buttonDeco) setButtonDeco(config.buttonDeco);
        if (config.shapeDistortion) setShapeDistortion(config.shapeDistortion);
        if (config.surfaceTreatment) setSurfaceTreatment(config.surfaceTreatment);
        if (config.material) setMaterial(config.material);
        if (config.dramaticTex) setDramaticTex(config.dramaticTex);
        if (config.rimThickness) setRimThickness(config.rimThickness);
        if (config.rimMaterial) setRimMaterial(config.rimMaterial);
        if (config.rimColor) setRimColor(config.rimColor);
    } catch (err) { setErrorMsg("키워드 기반 옵션 자동 셋업에 실패했습니다. 다시 시도해주세요."); }
    finally { setIsKeywordSetting(false); }
  };

  const openChatModal = () => {
    if (!userIntent) { setErrorMsg("먼저 키워드를 입력하거나 구체화해주세요."); return; }
    setTempIntent(userIntent);
    setChatMessages([{ role: 'model', text: "안녕하세요! 현재 프로모션 에셋 시안을 어떻게 튜닝해 드릴까요?" }]);
    setIsChatModalOpen(true);
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const newMessages = [...chatMessages, { role: 'user', text: chatInput }];
    setChatMessages(newMessages); setChatInput(""); setIsChatting(true);
    try {
        const parsed = await chatTuningMessageApi(newMessages, tempIntent);
        if (parsed.message && parsed.updated_intent) {
            setChatMessages([...newMessages, { role: 'model', text: parsed.message }]);
            setTempIntent(parsed.updated_intent);
        }
    } catch (err) { setChatMessages([...newMessages, { role: 'model', text: "오류가 발생했습니다." }]); }
    finally { setIsChatting(false); }
  };
  const applyChatIntent = () => { setUserIntent(tempIntent); setIsChatModalOpen(false); };
  useEffect(() => { if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight; }, [chatMessages]);

  const analyzeStyle = async () => {
    if (!styleImage) return;
    setIsAnalyzingStyle(true);
    try {
        const config = await analyzeStyleImage(styleImage, assetType, themeDna);
        if (config.surfaceTreatment) setSurfaceTreatment(config.surfaceTreatment);
        if (config.material) setMaterial(config.material);
        if (config.dramaticTex) setDramaticTex(config.dramaticTex);
        if (config.rimThickness) setRimThickness(config.rimThickness);
        if (config.rimColor) setRimColor(config.rimColor);
        if (config.rimMaterial) setRimMaterial(config.rimMaterial);
        if (config.buttonShape) setButtonShape(config.buttonShape);
        if (config.textSafeZone) setTextSafeZone(config.textSafeZone);
        if (config.buttonDeco) setButtonDeco(config.buttonDeco);
        if (config.shapeDistortion) setShapeDistortion(config.shapeDistortion);
        if (config.energyCore) setEnergyCore(config.energyCore);
    } catch (err) { setErrorMsg("스타일 추출에 실패했습니다."); }
    finally { setIsAnalyzingStyle(false); }
  };

  const validation = useMemo(() => {
    let warnings = [];
    if (textSafeZone === "Narrow" && (assetType === "EventPanel" || assetType === "Button")) warnings.push("패널/버튼에 텍스트 세이프존이 좁아 가독성 확보가 어려울 수 있습니다.");
    if (outputFormat === "Isolated" && energyCore !== "None") warnings.push("누끼 작업 시 배경 효과로 인해 경계가 지저분해질 수 있습니다.");
    if (rimThickness === "Thick" && assetType === "Button") warnings.push("프레임이 너무 두꺼우면 텍스트 공간이 침범될 수 있습니다.");
    if (buttonDeco === "CornerOrnaments" && textSafeZone === "UltraWide") warnings.push("화려한 모서리 장식이 넓은 텍스트 영역을 침범할 수 있습니다.");
    if (warnings.length === 0) return { status: 'Optimal', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', icon: React.createElement(CheckCircle2, { className: 'w-3.5 h-3.5' }), msg: '배너/캠페인 최적화됨' };
    if (warnings.length <= 1) return { status: 'Warning', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', icon: React.createElement(AlertCircle, { className: 'w-3.5 h-3.5' }), msg: '사용 양호 (유의사항 확인)' };
    return { status: 'Danger', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: React.createElement(X, { className: 'w-3.5 h-3.5' }), msg: '주의 (실사용성 저하 우려)' };
  }, [outputFormat, energyCore, rimThickness, buttonDeco, assetType, textSafeZone]);

  const handleFixValidation = () => {
    if (assetType === "EventPanel" || assetType === "Button") setTextSafeZone("Wide");
    if (outputFormat === "Isolated") setEnergyCore("None");
    if (assetType === "Button") setRimThickness("Narrow");
    if (buttonDeco === "CornerOrnaments") setButtonDeco("CompactCorner");
  };

  const handleGenerateLore = async () => {
    if (!finalOutput) return;
    setIsGeneratingLore(true);
    try {
        const text = await generateLoreApi(finalOutput);
        if (text) setLore(text);
    } catch (err) { setErrorMsg("카피 생성 실패."); }
    finally { setIsGeneratingLore(false); }
  };

  // 신규 생성 모드 이미지 렌더 — 항상 EN 프롬프트 사용 (Gemini Image 는 영문 최적화).
  // 사용자가 KR 뷰로 보고 있어도 모델에는 EN 이 가야 결과 품질 안정.
  const handleCreationRender = async () => {
    const promptForRender = buildPrompts(false, 'EN', false);
    if (!promptForRender || !promptForRender.trim()) {
      setCreationRenderError('프롬프트가 비어있습니다.');
      return;
    }
    if (isCreationRendering) return;
    setIsCreationRendering(true);
    setCreationRenderError('');
    setCreationRenderResult(null);
    try {
      const result = await renderWithImagen(promptForRender, creationRenderModel);
      setCreationRenderResult({ dataUrl: result.dataUrl, modelId: result.modelId });
    } catch (e) {
      setCreationRenderError(e?.message || '이미지 생성 실패');
    } finally {
      setIsCreationRendering(false);
    }
  };

  const handleClearCreationRender = () => {
    setCreationRenderResult(null);
    setCreationRenderError('');
  };

  const isOptionDisabled = useCallback((key) => {
    if (themeDna === 'ModernFlatBrand') return ['dramaticTex', 'shapeDistortion'].includes(key);
    if (themeDna === 'SoftPastel3D') return ['dramaticTex', 'shapeDistortion'].includes(key);
    return false;
  }, [themeDna, assetType]);

  return {
    // theme/view
    theme, currentView, setCurrentView,
    // variation (Micro-Edit) mode
    sourceAsset, isDraggingSource,
    handleSourceUpload, handleSourceDragOver, handleSourceDragLeave, handleSourceDrop, handleClearSource,
    backgroundRef, isDraggingBackground,
    handleBackgroundUpload, handleBackgroundDragOver, handleBackgroundDragLeave, handleBackgroundDrop, handleClearBackground,
    selectedMoodId, selectedStyleIds,
    handleSelectMood, handleToggleStyle,
    variationResults, isGeneratingVariations,
    handleGenerateVariations, handleRegenerateVariation,
    refinementLevel, setRefinementLevel,
    variationRenderModel, setVariationRenderModel,
    // atlas (디자인 시스템) mode
    atlasSource, isDraggingAtlasSource,
    handleAtlasSourceUpload, handleAtlasSourceDragOver, handleAtlasSourceDragLeave, handleAtlasSourceDrop, handleClearAtlasSource,
    atlasBackgroundRef, isDraggingAtlasBackground,
    handleAtlasBackgroundUpload, handleAtlasBackgroundDragOver, handleAtlasBackgroundDragLeave, handleAtlasBackgroundDrop, handleClearAtlasBackground,
    selectedAtlasMoodId, selectedAtlasStyleIds,
    handleSelectAtlasMood, handleToggleAtlasStyle,
    atlasResults, isGeneratingAtlas,
    handleGenerateAtlas, handleRegenerateAtlas,
    atlasRefinementLevel, setAtlasRefinementLevel,
    atlasRenderModel, setAtlasRenderModel,
    atlasSpec, setAtlasSpec, atlasSpecTitle, setAtlasSpecTitle,
    setAtlasSource,
    // core options
    themeDna, setThemeDna, handleThemeDnaChange,
    assetType, setAssetType, handleAssetTypeChange,
    outputFormat, setOutputFormat,
    layoutArchetype, setLayoutArchetype,
    slotStructure, setSlotStructure,
    buttonShape, setButtonShape,
    buttonRatio, setButtonRatio,
    textSafeZone, setTextSafeZone,
    surfaceTreatment, setSurfaceTreatment,
    material, setMaterial,
    dramaticTex, setDramaticTex,
    rimThickness, setRimThickness,
    rimMaterial, setRimMaterial,
    rimColor, setRimColor,
    buttonDeco, setButtonDeco,
    energyCore, setEnergyCore,
    enableGlint, setEnableGlint,
    shapeDistortion, setShapeDistortion,
    userIntent, setUserIntent,
    // style ref
    styleImage, setStyleImage, isDraggingStyle, setIsDraggingStyle,
    handleStyleImageUpload, handleStyleDragOver, handleStyleDragLeave, handleStyleDrop, handleClearStyleImage,
    // loading flags
    isExpandingIntent, isKeywordSetting, isAnalyzingStyle,
    isCopiedBase, isCopiedEnhanced,
    // model / output
    aiModel, setAiModel,
    showOriginalPrompt, setShowOriginalPrompt,
    isOptimizing, isTranslating,
    outputLang, setOutputLang,
    optimizedPrompts, translatedPrompts,
    lore, isGeneratingLore,
    errorMsg, setErrorMsg,
    // chat
    isChatModalOpen, setIsChatModalOpen,
    chatMessages, chatInput, setChatInput,
    isChatting, tempIntent, setTempIntent,
    chatScrollRef,
    // derived
    finalOutput, originalOutput, baseSpec,
    validation,
    // handlers
    handleResetSettings,
    copyToClipboard,
    toggleLanguage,
    handleOptimizePrompt,
    handleExpandIntent,
    handleKeywordSetup,
    openChatModal,
    handleSendChatMessage,
    applyChatIntent,
    analyzeStyle,
    handleFixValidation,
    handleGenerateLore,
    // creation 모드 이미지 렌더
    creationRenderModel, setCreationRenderModel,
    creationRenderResult, creationRenderError, isCreationRendering,
    handleCreationRender, handleClearCreationRender,
    isOptionDisabled,
  };
}
