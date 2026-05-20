/* eslint-disable */
// v1 전용 메인 상태/핸들러 훅. 원본 App() 의 모든 state, useEffect, 핸들러,
// 그리고 buildPrompts / buildEditPrompts 와 fetch 호출까지 그대로 옮긴 격리 사본.
import { useState, useRef, useEffect } from 'react';
import { directorPersonas } from '../constants/personas.jsx';
import { staticOptions } from '../constants/options.js';
import {
    extractJson,
    getOptionEn,
    getOptionName,
    getSliderText,
    getSliderTextKo,
    dictionary,
} from '../constants/utils.js';

export function useSovereignPromptV1({ apiKey }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [currentView, setCurrentView] = useState("editor");

    const [inputText, setInputText] = useState("데스나이트");
    const [base64Image, setBase64Image] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    // 페르소나 및 핵심 옵션
    const [aiPersona, setAiPersona] = useState('sovereign');
    const [personaDropdownOpen, setPersonaDropdownOpen] = useState(false);
    const [isAdvancedOptionsEnabled, setIsAdvancedOptionsEnabled] = useState(false);
    const [isEnhanceModeEnabled, setIsEnhanceModeEnabled] = useState(true);
    const [enhanceMode, setEnhanceMode] = useState("refine");
    const [momentumActive, setMomentumActive] = useState(false);
    const [auraPriority, setAuraPriority] = useState("Balanced");
    const [personaSliderValue, setPersonaSliderValue] = useState(50);

    // MMO Specific States
    const [baseStyle, setBaseStyle] = useState("BlackWhite");
    const [aspectRatio, setAspectRatio] = useState("16:9");
    const [occupancy, setOccupancy] = useState("50%");
    const [layoutType, setLayoutType] = useState("1Line");
    const [layoutPreset, setLayoutPreset] = useState("WideTitle");
    const [stemWeight, setStemWeight] = useState("Stem_Heavy");
    const [charWidth, setCharWidth] = useState("Normal");
    const [charProportion, setCharProportion] = useState("P_Std");
    const [kerning, setKerning] = useState("Kern_Std");
    const [subTitleSize, setSubTitleSize] = useState("Sub_Small");

    const [scriptType, setScriptType] = useState("Lineage_M");
    const [terminalStyle, setTerminalStyle] = useState("Term_Chisel");
    const [strokeTexture, setStrokeTexture] = useState("Tex_Frayed");
    const [strokeSharpness, setStrokeSharpness] = useState("Sharp_Razor");
    const [strokeExtension, setStrokeExtension] = useState("Ext_Razor");
    const [cornerStyle, setCornerStyle] = useState("Corner_Right");
    const [slantAngle, setSlantAngle] = useState("Slant_0");
    const [kineticVelocity, setKineticVelocity] = useState("Vel_Slashing");
    const [slicingIntensity, setSlicingIntensity] = useState("Slic_Partial");
    const [deformationDamage, setDeformationDamage] = useState("Damage_None");

    const [letterConnection, setLetterConnection] = useState("Conn_Indep");
    const [internalSpace, setInternalSpace] = useState("Space_Std");
    const [logoDegree, setLogoDegree] = useState("Logo_Std");

    const [mmoSilhouetteFraming, setMmoSilhouetteFraming] = useState("Horizontal");
    const [mmoSurroundingElement, setMmoSurroundingElement] = useState("Clean");

    const [dynamicOptions, setDynamicOptions] = useState({
        MMOStyles: [], strokeTextures: [], deformationDamages: [], terminalStyles: [], stemWeights: [],
        strokeSharpness: [], writingSpeeds: [], widths: [], kerningOptions: [], strokeExtensions: [],
        kineticVelocities: [], slicingIntensities: [], editStrokeMods: [], editElementMods: [], editSurfaceMods: []
    });

    const [customDesignInjections, setCustomDesignInjections] = useState("");
    const [aiModel, setAiModel] = useState("Overview");

    // Prompt Output States
    const [dramaticPrompt, setDramaticPrompt] = useState("");
    const [mjOptimizedPrompt, setMjOptimizedPrompt] = useState("");
    const [cgEnhancedPrompt, setCgEnhancedPrompt] = useState("");

    const [aiRecSummary, setAiRecSummary] = useState(null);

    // Loading States
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [isMjOptimizing, setIsMjOptimizing] = useState(false);
    const [isCgEnhancing, setIsCgEnhancing] = useState(false);
    const [isExpandingIntent, setIsExpandingIntent] = useState(false);
    const [isRecommending, setIsRecommending] = useState(false);

    const [copiedTop, setCopiedTop] = useState(false);
    const [copiedBottom, setCopiedBottom] = useState(false);
    const [baseLangView, setBaseLangView] = useState('ko');

    // Manual Override Prompts
    const [manualBasePrompt, setManualBasePrompt] = useState(null);
    const [editManualBasePrompt, setEditManualBasePrompt] = useState(null);

    // Edit Mode States
    const [editUploadedImage, setEditUploadedImage] = useState(null);
    const [editInstruction, setEditInstruction] = useState("");
    const [editAuraPriority, setEditAuraPriority] = useState("Balanced");
    const [applyAiRecInEdit, setApplyAiRecInEdit] = useState(false);
    const [applyAutoRefine, setApplyAutoRefine] = useState(false);
    const [editAiModel, setEditAiModel] = useState("Overview");
    const [editDramaticPrompt, setEditDramaticPrompt] = useState("");
    const [editMjPrompt, setEditMjPrompt] = useState("");
    const [editCgPrompt, setEditCgPrompt] = useState("");

    const [editStrokeMod, setEditStrokeMod] = useState("E_Stroke_None");
    const [editElementMod, setEditElementMod] = useState("E_Elem_None");
    const [editSurfaceMod, setEditSurfaceMod] = useState("E_Surf_None");

    const [openCardId, setOpenCardId] = useState("layout");
    const [editOpenCardId, setEditOpenCardId] = useState("edit_retouch");

    const [isEditEnhancing, setIsEditEnhancing] = useState(false);
    const [isEditMjOptimizing, setIsEditMjOptimizing] = useState(false);
    const [isEditCgEnhancing, setIsEditCgEnhancing] = useState(false);
    const [isEditExpandingIntent, setIsEditExpandingIntent] = useState(false);

    // Prompt Collapse States
    const [isPromptExpanded, setIsPromptExpanded] = useState(false);
    const [isEditPromptExpanded, setIsEditPromptExpanded] = useState(false);

    // Outdated Prompt States
    const [isOutdated, setIsOutdated] = useState(false);
    const [isEditOutdated, setIsEditOutdated] = useState(false);

    // Tuning Modals
    const [isTuningModalOpen, setIsTuningModalOpen] = useState(false);
    const [isEditTuningModalOpen, setIsEditTuningModalOpen] = useState(false);
    const [tuningChatHistory, setTuningChatHistory] = useState([]);
    const [editTuningChatHistory, setEditTuningChatHistory] = useState([]);
    const [tuningInputValue, setTuningInputValue] = useState("");
    const [editTuningInputValue, setEditTuningInputValue] = useState("");
    const [isTuningLoading, setIsTuningLoading] = useState(false);
    const [isEditTuningLoading, setIsEditTuningLoading] = useState(false);
    const [currentTunedAura, setCurrentTunedAura] = useState("");
    const [currentTunedEditAura, setCurrentTunedEditAura] = useState("");

    // Tuning Reference Image States
    const [tuningReferenceImage, setTuningReferenceImage] = useState(null);
    const [editTuningReferenceImage, setEditTuningReferenceImage] = useState(null);

    // Background Mood Analysis State
    const moodImageRef = useRef(null);
    const [isAnalyzingMood, setIsAnalyzingMood] = useState(false);

    // Prompt Inspector States
    const [isInspectorModalOpen, setIsInspectorModalOpen] = useState(false);
    const [isInspecting, setIsInspecting] = useState(false);
    const [inspectionResult, setInspectionResult] = useState(null);
    const [selectedResolutionIndex, setSelectedResolutionIndex] = useState(0);

    const tuningChatRef = useRef(null);
    const editTuningChatRef = useRef(null);

    const [user, setUser] = useState(null);

    const dict = dictionary.ko;

    const handleToggleCard = (id) => {
        setOpenCardId(prev => prev === id ? null : id);
    };

    const handleEditToggleCard = (id) => {
        setEditOpenCardId(prev => prev === id ? null : id);
    };

    // Options Change Detection
    useEffect(() => {
        setIsOutdated(true);
        setManualBasePrompt(null);
    }, [aiPersona, personaSliderValue, inputText, customDesignInjections, isEnhanceModeEnabled, enhanceMode, momentumActive, baseStyle, aspectRatio, occupancy, layoutType, layoutPreset, stemWeight, charWidth, charProportion, kerning, subTitleSize, scriptType, terminalStyle, strokeTexture, strokeSharpness, strokeExtension, cornerStyle, slantAngle, kineticVelocity, slicingIntensity, deformationDamage, letterConnection, internalSpace, logoDegree, mmoSilhouetteFraming, mmoSurroundingElement, isAdvancedOptionsEnabled]);

    useEffect(() => {
        setIsEditOutdated(true);
        setEditManualBasePrompt(null);
    }, [aiPersona, personaSliderValue, editInstruction, editUploadedImage, editAuraPriority, applyAiRecInEdit, applyAutoRefine, isEnhanceModeEnabled, enhanceMode, momentumActive, layoutType, subTitleSize, mmoSilhouetteFraming, mmoSurroundingElement, kineticVelocity, slantAngle, deformationDamage, slicingIntensity, editStrokeMod, editElementMod, editSurfaceMod, cornerStyle]);

    useEffect(() => {
        if (tuningChatRef.current) tuningChatRef.current.scrollTop = tuningChatRef.current.scrollHeight;
    }, [tuningChatHistory, isTuningLoading]);

    useEffect(() => {
        if (editTuningChatRef.current) editTuningChatRef.current.scrollTop = editTuningChatRef.current.scrollHeight;
    }, [editTuningChatHistory, isEditTuningLoading]);

    const updateDynamic = (key, val) => {
        if (val && typeof val === 'object' && val.id && val.name) {
            setDynamicOptions(prev => {
                const exists = prev[key]?.find(o => o.id === val.id);
                if (!exists) return { ...prev, [key]: [...(prev[key] || []), val] };
                return prev;
            });
            return val.id;
        }
        return val && typeof val === 'object' ? val.id || val : val;
    };

    const handleScriptPresetChange = (presetId) => {
        setScriptType(presetId);
        if (presetId === "Gen_Original" || presetId === "Lineage_Classic") { setStemWeight("Stem_Ultra"); setTerminalStyle("Term_Serif"); setStrokeTexture("Tex_Scorched"); setDeformationDamage("Damage_Erosion"); }
        else if (presetId === "Gen_Fantasy" || presetId === "Lineage_2") { setStemWeight("Stem_Light"); setTerminalStyle("Term_Serif"); setStrokeSharpness("Sharp_Crisp"); setKineticVelocity("Vel_Static"); }
        else if (presetId === "Gen_Gothic" || presetId === "Lineage_M") { setStemWeight("Stem_Heavy"); setTerminalStyle("Term_Chisel"); setStrokeSharpness("Sharp_Razor"); setKineticVelocity("Vel_Slashing"); }
        else if (presetId === "Gen_Thorn" || presetId === "Lineage_2M") { setStemWeight("Stem_Light"); setTerminalStyle("Term_Thorn"); setStrokeSharpness("Sharp_Razor"); setCharProportion("P_Slim"); }
        else if (presetId === "Gen_Agony" || presetId === "Lineage_W") { setStemWeight("Stem_Ultra"); setTerminalStyle("Term_Blade"); setDeformationDamage("Damage_Erosion"); setSlicingIntensity("Slic_Partial"); }
        else if (presetId === "Gen_Tower" || presetId === "Aion_Original") { setCharProportion("P_Condensed"); setStemWeight("Stem_Std"); setTerminalStyle("Term_Round"); setKineticVelocity("Vel_Swift"); }
        else if (presetId === "Aion_2") { setTerminalStyle("Term_Blade"); setStrokeTexture("Tex_Hologram"); setKineticVelocity("Vel_Warp"); setCharProportion("P_Slim"); }
        else if (presetId === "BNS") { setStemWeight("Stem_Heavy"); setTerminalStyle("Term_Blade"); setStrokeSharpness("Sharp_Razor"); setKineticVelocity("Vel_Swift"); setSlantAngle("Slant_Forward"); }
        else if (presetId === "Throne_Liberty") { setStemWeight("Stem_Light"); setTerminalStyle("Term_Serif"); setStrokeSharpness("Sharp_Crisp"); setCharProportion("P_Std"); setKineticVelocity("Vel_Static"); }
        else if (presetId === "Epic") { setStemWeight("Stem_Ultra"); setTerminalStyle("Term_Chisel"); setStrokeSharpness("Sharp_Razor"); setKineticVelocity("Vel_Static"); setCharWidth("Wide"); }
        else if (presetId === "MMO_Saviors") { setStemWeight("Stem_Light"); setTerminalStyle("Term_Blade"); setStrokeSharpness("Sharp_Crisp"); setKineticVelocity("Vel_Static"); setCharProportion("P_Slim"); }
        else if (presetId === "MMO_Antharas") { setStemWeight("Stem_Heavy"); setTerminalStyle("Term_Thorn"); setStrokeSharpness("Sharp_Razor"); setKineticVelocity("Vel_Slashing"); }
        else if (presetId === "MMO_Aden") { setStemWeight("Stem_Ultra"); setTerminalStyle("Term_Chisel"); setStrokeSharpness("Sharp_Razor"); setKineticVelocity("Vel_Static"); setCharWidth("Wide"); }
    };

    const handleLayoutPresetChange = (presetId) => {
        setLayoutPreset(presetId);
        if (presetId === "WideTitle") {
            setAspectRatio("16:9"); setLayoutType("1Line"); setOccupancy("50%"); setMmoSilhouetteFraming("Horizontal");
        } else if (presetId === "CenterLogo") {
            setAspectRatio("1:1"); setLayoutType("Center"); setOccupancy("65%"); setMmoSilhouetteFraming("Auto");
        } else if (presetId === "CinematicPan") {
            setAspectRatio("2.76:1"); setLayoutType("1Line"); setOccupancy("40%"); setMmoSilhouetteFraming("Expanded");
        } else if (presetId === "TitleSubPre") {
            setAspectRatio("16:9"); setLayoutType("TitleSub"); setOccupancy("50%"); setMmoSilhouetteFraming("Horizontal");
        } else if (presetId === "SubTitlePre") {
            setAspectRatio("16:9"); setLayoutType("SubTitle"); setOccupancy("50%"); setMmoSilhouetteFraming("Horizontal");
        }
    };

    const handleReset = () => {
        setDynamicOptions({ MMOStyles: [], strokeTextures: [], deformationDamages: [], terminalStyles: [], stemWeights: [], strokeSharpness: [], writingSpeeds: [], widths: [], kerningOptions: [], strokeExtensions: [], kineticVelocities: [], slicingIntensities: [], editStrokeMods: [], editElementMods: [], editSurfaceMods: [] });
        setCustomDesignInjections(""); setDramaticPrompt("");
        setMjOptimizedPrompt(""); setCgEnhancedPrompt(""); setEnhanceMode("refine"); setMomentumActive(false); setIsAdvancedOptionsEnabled(false);
        setAuraPriority("Balanced"); setPersonaSliderValue(50); setBase64Image(null); setAiRecSummary(null); setAiPersona('sovereign');
        handleScriptPresetChange("Lineage_M");
        setLetterConnection("Conn_Indep"); setInternalSpace("Space_Std"); setLogoDegree("Logo_Std"); setSubTitleSize("Sub_Small");
        setManualBasePrompt(null);
        setTuningReferenceImage(null);
        setEditTuningReferenceImage(null);
    };

    const handleAiRecommendation = async () => {
        if (isRecommending) return;
        setIsRecommending(true);
        const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];

        const prompt = `Act as an Elite Art Director for a Dark Fantasy RPG typography project.
    [YOUR PERSONA]: ${persona.role}
    [YOUR TONE]: ${persona.tone}
    [KEYWORDS YOU FAVOR]: ${persona.keywords}
    [CURRENT SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)}

    [USER INPUT]: Text: "${inputText}"
    [DETAILED DESIGN INTENT / AURA]: "${customDesignInjections || "None"}"
    [CRITICAL INSTRUCTION]: You MUST base your setup heavily on the "[DETAILED DESIGN INTENT / AURA]" and your Persona. Reflect the [CURRENT SUB-TRAIT FOCUS] deeply in your choices.
    IMPORTANT: You must create ENTIRELY NEW CUSTOM OPTIONS that perfectly manifest the user's aura. Do not just use existing vague IDs.
    For each typography property, you MUST return a JSON object with this exact structure: { "id": "Unique_English_ID", "name": "Korean Display Name", "en": "English technical prompt description" }

    Return JSON: {
      "summary": { "title": "한글 제목", "reason": "추천 사유" },
      "setStyle": { "id": "...", "name": "...", "en": "..." },
      "setWeight": { "id": "...", "name": "...", "en": "..." },
      "setTerminal": { "id": "...", "name": "...", "en": "..." },
      "setTexture": { "id": "...", "name": "...", "en": "..." },
      "setKinetic": { "id": "...", "name": "...", "en": "..." },
      "setSharpness": { "id": "...", "name": "...", "en": "..." },
      "setKerning": { "id": "...", "name": "..." , "en": "..."}
    }`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.7 } })
            });
            const data = await response.json();
            const res = extractJson(data.candidates[0].content.parts[0].text);

            if (res?.summary) setAiRecSummary(res.summary);
            if (res?.setStyle) setScriptType(updateDynamic('MMOStyles', res.setStyle));
            if (res?.setWeight) setStemWeight(updateDynamic('stemWeights', res.setWeight));
            if (res?.setTerminal) setTerminalStyle(updateDynamic('terminalStyles', res.setTerminal));
            if (res?.setTexture) setStrokeTexture(updateDynamic('strokeTextures', res.setTexture));
            if (res?.setKinetic) setKineticVelocity(updateDynamic('kineticVelocities', res.setKinetic));
            if (res?.setSharpness) setStrokeSharpness(updateDynamic('strokeSharpness', res.setSharpness));
            if (res?.setKerning) setKerning(updateDynamic('kerningOptions', res.setKerning));

            setIsAdvancedOptionsEnabled(true);
        } catch (e) { console.error(e); } finally { setIsRecommending(false); }
    };

    const copyToClipboard = (text, type) => {
        const textArea = document.createElement("textarea");
        textArea.value = text || '';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            if (type === 'top') {
                setCopiedTop(true);
            } else {
                setCopiedBottom(true);
            }
            setTimeout(() => {
                setCopiedTop(false);
                setCopiedBottom(false);
            }, 2000);
        } catch (err) {
            console.error("Failed to copy", err);
        }
        document.body.removeChild(textArea);
    };

    const processFile = (file) => {
        const reader = new FileReader();
        reader.onloadend = () => { setBase64Image(reader.result.split(',')[1]); };
        reader.readAsDataURL(file);
    };

    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => { setIsDragging(false); };
    const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file && file.type.startsWith('image/')) processFile(file); };

    const handleEditDrop = (e) => {
        e.preventDefault(); setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => setEditUploadedImage(reader.result);
            reader.readAsDataURL(file);
        }
    };
    const handleEditImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setEditUploadedImage(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleMoodImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setIsAnalyzingMood(true);

        try {
            const base64Promises = files.map(file => {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve({ inlineData: { mimeType: file.type, data: reader.result.split(',')[1] } });
                    reader.readAsDataURL(file);
                });
            });

            const imageParts = await Promise.all(base64Promises);
            const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];

            const systemPrompt = `You are a legendary Typography Art Director specialized in STRICTLY 2D FLAT BLACK-AND-WHITE SILHOUETTE typography.
      [YOUR PERSONA]: ${persona.role}
      [YOUR TONE]: ${persona.tone}

      Analyze the provided reference image(s). They may include a single background, or a mix of backgrounds, characters, and props.
      Synthesize their core worldview, narrative tension, and character traits.

      [CRITICAL RULE FOR TYPOGRAPHY AURA]:
      The resulting typography MUST be a pure 2D flat silhouette. ABSOLUTELY NO textures, NO lighting, NO 3D, NO materials, NO gradient colors.
      Focus ONLY on structural morphology: stroke weight, edge sharpness, tension, flow, structural proportion, dynamic momentum, and rhythm.

      Return ONLY a 2-3 sentence Korean description (Aura) detailing how the structural lines and shapes of the typography should be formed to match the combined mood of the images.
      Example: "거대한 배경의 압도적인 스케일과 캐릭터의 예리한 무기 형태를 결합합니다. 묵직하고 단단한 사각 기둥 뼈대를 바탕으로, 획의 끝단에 베어내는 듯한 날카로운 사선 텐션을 주입하여 질감이 배제된 서늘한 2D 실루엣을 완성합니다."`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: systemPrompt },
                            ...imageParts
                        ]
                    }],
                    generationConfig: { temperature: 0.7 }
                })
            });
            const data = await response.json();
            const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (resultText) {
                setCustomDesignInjections(resultText.trim());
            }
        } catch (error) {
            console.error("Mood analysis failed:", error);
        } finally {
            setIsAnalyzingMood(false);
            if (moodImageRef.current) moodImageRef.current.value = "";
        }
    };

    const handleTuningImageUpload = (e, isEdit) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result.split(',')[1];
                if (isEdit) setEditTuningReferenceImage(base64);
                else setTuningReferenceImage(base64);
            };
            reader.readAsDataURL(file);
        }
    };

    const openTuningRoom = () => {
        setCurrentTunedAura(customDesignInjections);
        setTuningChatHistory([{ role: 'assistant', content: "안녕하세요! 현재 구체화된 아이디어를 바탕으로 어떤 부분들을 더 추가하거나 수정하고 싶으신가요?\n원하시는 방향을 자유롭게 말씀해 주세요! (예: '조금 더 차갑고 날카로운 느낌으로 바꿔줘')" }]);
        setIsTuningModalOpen(true);
    };

    const openEditTuningRoom = () => {
        setCurrentTunedEditAura(editInstruction);
        setEditTuningChatHistory([{ role: 'assistant', content: "이미지 편집 튜닝룸입니다!\n현재 작성된 지시사항을 바탕으로 원하시는 수정 방향을 대화하듯 말씀해 주세요.\n(예: '지금 묘사에서 부식된 효과를 조금 더 세게 강조해줘')" }]);
        setIsEditTuningModalOpen(true);
    };

    const handleSendTuningMessage = async () => {
        if (!tuningInputValue.trim() && !tuningReferenceImage) return;
        const userMsg = tuningInputValue.trim() || "이미지 스타일을 분석해줘.";
        setTuningInputValue("");
        setTuningChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsTuningLoading(true);

        const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];

        const systemPrompt = `You are a Typography Art Director and a friendly assistant. [YOUR PERSONA]: ${persona.role}
    [CURRENT SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)}
    [Current Aura]: "${currentTunedAura}"
    [User Request]: "${userMsg}"

    IF a reference image is provided: Visually analyze its typography morphology (weight, terminals, texture, layout, kinetics). You MUST return 'updateOptions' to change the editor settings to match the image perfectly. Create ENTIRELY NEW CUSTOM OPTIONS for properties that manifest the image's aura exactly.
    Task: Update the [Current Aura] to reflect the [User Request] and visual analysis. Make it professional. APPLY YOUR PERSONA'S VIBE AND KEYWORDS: ${persona.keywords}. Reflect the [CURRENT SUB-TRAIT FOCUS].
    Write a short, friendly reply in Korean explaining what you changed and analyzed. Tone: ${persona.tone}.
    Return JSON strictly in this format: {
      "newAura": "The updated aura string",
      "replyMessage": "Your friendly reply in Korean",
      "updateOptions": {
         "setStyle": { "id": "...", "name": "...", "en": "..." },
         "setWeight": { "id": "...", "name": "...", "en": "..." },
         "setTerminal": { "id": "...", "name": "...", "en": "..." },
         "setTexture": { "id": "...", "name": "...", "en": "..." },
         "setKinetic": { "id": "...", "name": "...", "en": "..." },
         "setSharpness": { "id": "...", "name": "...", "en": "..." },
         "setKerning": { "id": "...", "name": "...", "en": "..." }
      } // Include updateOptions ONLY if a reference image is analyzed or structural change is requested.
    }`;

        const parts = [{ text: "Process the tuning request. Analyze the reference image if provided." }];
        if (tuningReferenceImage) {
            parts.push({ inlineData: { mimeType: "image/jpeg", data: tuningReferenceImage } });
        }

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json", temperature: 0.7 } })
            });
            const data = await response.json(); const result = extractJson(data.candidates?.[0]?.content?.parts?.[0]?.text);
            if (result?.newAura && result?.replyMessage) {
                setCurrentTunedAura(result.newAura);
                setTuningChatHistory(prev => [...prev, { role: 'assistant', content: result.replyMessage }]);
                if (result.updateOptions) {
                    const opts = result.updateOptions;
                    if (opts.setStyle) setScriptType(updateDynamic('MMOStyles', opts.setStyle));
                    if (opts.setWeight) setStemWeight(updateDynamic('stemWeights', opts.setWeight));
                    if (opts.setTerminal) setTerminalStyle(updateDynamic('terminalStyles', opts.setTerminal));
                    if (opts.setTexture) setStrokeTexture(updateDynamic('strokeTextures', opts.setTexture));
                    if (opts.setKinetic) setKineticVelocity(updateDynamic('kineticVelocities', opts.setKinetic));
                    if (opts.setSharpness) setStrokeSharpness(updateDynamic('strokeSharpness', opts.setSharpness));
                    if (opts.setKerning) setKerning(updateDynamic('kerningOptions', opts.setKerning));
                    setIsAdvancedOptionsEnabled(true);
                }
            }
        } catch (e) { setTuningChatHistory(prev => [...prev, { role: 'assistant', content: "오류가 발생했습니다." }]); } finally { setIsTuningLoading(false); setTuningReferenceImage(null); }
    };

    const handleSendEditTuningMessage = async () => {
        if (!editTuningInputValue.trim() && !editTuningReferenceImage) return;
        const userMsg = editTuningInputValue.trim() || "이미지 스타일을 분석해줘.";
        setEditTuningInputValue("");
        setEditTuningChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsEditTuningLoading(true);

        const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];

        const systemPrompt = `You are an expert Typography Art Director adjusting an Image-to-Image edit instruction. [YOUR PERSONA]: ${persona.role}
    [CURRENT SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)}
    [Current Edit Direction]: "${currentTunedEditAura}"
    [User Request]: "${userMsg}"

    IF a reference image is provided: Visually analyze its typography morphology. Return 'updateOptions' to change the micro-refinement settings (Stroke Mod, Element Mod, Surface Mod, Kinetic, Damage) to perfectly match the image. Create ENTIRELY NEW CUSTOM OPTIONS for these properties if needed.
    Task: Update the [Current Edit Direction] integrating the user's request and image analysis. Maintain a professional tone while applying your persona's vibe and keywords: ${persona.keywords}. Reflect the [CURRENT SUB-TRAIT FOCUS].
    Write a friendly response in Korean explaining the update. Tone: ${persona.tone}.
    Return JSON strictly: {
      "newAura": "Updated instruction string",
      "replyMessage": "Friendly response in Korean",
      "updateOptions": {
         "setEditStroke": { "id": "...", "name": "...", "en": "..." },
         "setEditElement": { "id": "...", "name": "...", "en": "..." },
         "setEditSurface": { "id": "...", "name": "...", "en": "..." },
         "setKinetic": { "id": "...", "name": "...", "en": "..." },
         "setDamage": { "id": "...", "name": "...", "en": "..." }
      } // Include updateOptions ONLY if a reference image is analyzed or structural change is requested.
    }`;

        const parts = [{ text: "Process the tuning request. Analyze the reference image if provided." }];
        if (editTuningReferenceImage) {
            parts.push({ inlineData: { mimeType: "image/jpeg", data: editTuningReferenceImage } });
        }

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json", temperature: 0.7 } })
            });
            const data = await response.json(); const result = extractJson(data.candidates?.[0]?.content?.parts?.[0]?.text);
            if (result?.newAura && result?.replyMessage) {
                setCurrentTunedEditAura(result.newAura);
                setEditTuningChatHistory(prev => [...prev, { role: 'assistant', content: result.replyMessage }]);
                if (result.updateOptions) {
                    const opts = result.updateOptions;
                    if (opts.setEditStroke) setEditStrokeMod(updateDynamic('editStrokeMods', opts.setEditStroke));
                    if (opts.setEditElement) setEditElementMod(updateDynamic('editElementMods', opts.setEditElement));
                    if (opts.setEditSurface) setEditSurfaceMod(updateDynamic('editSurfaceMods', opts.setEditSurface));
                    if (opts.setKinetic) setKineticVelocity(updateDynamic('kineticVelocities', opts.setKinetic));
                    if (opts.setDamage) setDeformationDamage(updateDynamic('deformationDamages', opts.setDamage));
                }
            }
        } catch (e) { setEditTuningChatHistory(prev => [...prev, { role: 'assistant', content: "오류가 발생했습니다." }]); } finally { setIsEditTuningLoading(false); setEditTuningReferenceImage(null); }
    };

    const handleExpandIntent = async () => {
        if (!customDesignInjections.trim() || isExpandingIntent) return;
        setIsExpandingIntent(true);
        const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];

        const systemPrompt = `[YOUR PERSONA]: ${persona.role}\n[YOUR TONE]: ${persona.tone}\n[CURRENT SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)}\nExpand the user's keyword into a detailed, highly professional morphological design direction. NO MATERIALS / NO LIGHTING. FOCUS ON PURE FORM. 2-3 sentences. Return ONLY the expanded text in Korean.`;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: customDesignInjections }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.7 } })
            });
            const data = await response.json(); if (data.candidates?.[0]?.content?.parts?.[0]?.text) setCustomDesignInjections(data.candidates[0].content.parts[0].text.trim());
        } catch (e) { } finally { setIsExpandingIntent(false); }
    };

    const handleEditExpandIntent = async () => {
        if (!editInstruction.trim() || isEditExpandingIntent) return;
        setIsEditExpandingIntent(true);
        const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];

        const systemPrompt = `[YOUR PERSONA]: ${persona.role}\n[YOUR TONE]: ${persona.tone}\n[CURRENT SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)}\nExpand the user's short edit keyword into a detailed, structural Image-to-Image morphological edit instruction incorporating the sub-trait focus. NO 3D/MATERIALS. Keep it 2D flat. Focus on stroke edges, dynamics, and destruction. Return only the expanded text in Korean.`;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: editInstruction }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.7 } })
            });
            const data = await response.json(); if (data.candidates?.[0]?.content?.parts?.[0]?.text) setEditInstruction(data.candidates[0].content.parts[0].text.trim());
        } catch (e) { } finally { setIsEditExpandingIntent(false); }
    };

    const buildPrompts = () => {
        const styleList = [...staticOptions.MMOStyles, ...(dynamicOptions.MMOStyles || [])];
        const weightList = [...staticOptions.stemWeights, ...(dynamicOptions.stemWeights || [])];
        const kerningList = [...staticOptions.kerningOptions, ...(dynamicOptions.kerningOptions || [])];
        const terminalList = [...staticOptions.terminalStyles, ...(dynamicOptions.terminalStyles || [])];
        const sharpnessList = [...staticOptions.strokeSharpness, ...(dynamicOptions.strokeSharpness || [])];
        const textureList = staticOptions.strokeTextures;
        const kineticList = [...staticOptions.kineticVelocities, ...(dynamicOptions.kineticVelocities || [])];
        const slantList = staticOptions.slantAngles;
        const destList = staticOptions.deformationDamages;

        // EN Strings
        const styleEn = getOptionEn(styleList, scriptType);
        const weightEn = getOptionEn(weightList, stemWeight);
        const kerningEn = getOptionEn(kerningList, kerning);
        const terminalEn = getOptionEn(terminalList, terminalStyle);
        const sharpnessEn = getOptionEn(sharpnessList, strokeSharpness);
        const textureEn = getOptionEn(textureList, strokeTexture);
        const widthEn = getOptionEn(staticOptions.widths, charWidth);
        const proportionEn = getOptionEn(staticOptions.proportions, charProportion);
        const extensionEn = getOptionEn(staticOptions.strokeExtensions, strokeExtension);
        const cornerList = [...staticOptions.cornerStyles, ...(dynamicOptions.cornerStyles || [])];
        const cornerEn = getOptionEn(cornerList, cornerStyle);
        const kineticEn = getOptionEn(kineticList, kineticVelocity);
        const slantEn = getOptionEn(slantList, slantAngle);
        const destructionEn = getOptionEn(destList, deformationDamage);
        const slicingEn = getOptionEn(staticOptions.slicingIntensities, slicingIntensity);
        const occupancyEn = getOptionEn(staticOptions.occupancies, occupancy);

        const letterConnEn = getOptionEn(staticOptions.letterConnections, letterConnection);
        const internalSpaceEn = getOptionEn(staticOptions.internalSpaces, internalSpace);
        const logoDegreeEn = getOptionEn(staticOptions.logoDegrees, logoDegree);

        const mmoSilhouetteEn = getOptionEn(staticOptions.MMOSilhouetteFramings, mmoSilhouetteFraming);
        const mmoSurroundEn = getOptionEn(staticOptions.MMOSurroundingElements, mmoSurroundingElement);

        // KO Strings
        const styleKo = getOptionName(styleList, scriptType);
        const weightKo = getOptionName(weightList, stemWeight);
        const kerningKo = getOptionName(kerningList, kerning);
        const terminalKo = getOptionName(terminalList, terminalStyle);
        const sharpnessKo = getOptionName(sharpnessList, strokeSharpness);
        const textureKo = getOptionName(textureList, strokeTexture);
        const widthKo = getOptionName(staticOptions.widths, charWidth);
        const proportionKo = getOptionName(staticOptions.proportions, charProportion);
        const extensionKo = getOptionName(staticOptions.strokeExtensions, strokeExtension);
        const cornerKo = getOptionName(cornerList, cornerStyle);
        const kineticKo = getOptionName(kineticList, kineticVelocity);
        const slantKo = getOptionName(slantList, slantAngle);
        const destructionKo = getOptionName(destList, deformationDamage);
        const occupancyKo = getOptionName(staticOptions.occupancies, occupancy);

        const letterConnKo = getOptionName(staticOptions.letterConnections, letterConnection);
        const internalSpaceKo = getOptionName(staticOptions.internalSpaces, internalSpace);
        const logoDegreeKo = getOptionName(staticOptions.logoDegrees, logoDegree);

        const mmoSilhouetteKo = getOptionName(staticOptions.MMOSilhouetteFramings, mmoSilhouetteFraming);
        const mmoSurroundKo = getOptionName(staticOptions.MMOSurroundingElements, mmoSurroundingElement);

        const genreSpecEn = `- Letter Connection: ${letterConnEn}\n- Internal Space: ${internalSpaceEn}\n- Logo Degree: ${logoDegreeEn}\n- Silhouette Framing: ${mmoSilhouetteEn}\n- Surrounding FX: ${mmoSurroundEn}\n- Dynamics: Slicing(${slicingEn})`;
        const genreSpecKo = `- 글자 결합: ${letterConnKo}\n- 내부 공간: ${internalSpaceKo}\n- 로고화 정도: ${logoDegreeKo}\n- 실루엣 프레이밍: ${mmoSilhouetteKo}\n- 주변 장식: ${mmoSurroundKo}\n- 동세/절단: ${getOptionName(staticOptions.slicingIntensities, slicingIntensity)}`;

        const subSizeEn = getOptionEn(staticOptions.subTitleSizes, subTitleSize);
        const subSizeKo = getOptionName(staticOptions.subTitleSizes, subTitleSize);

        let layoutEn = "";
        let layoutKo = "";
        if (layoutType === "1Line") {
            layoutEn = "[LAYOUT MANDATE]: STRICT SINGLE HORIZONTAL ROW. ABSOLUTELY NO VERTICAL STACKING. Prevent multi-line arrangements.";
            layoutKo = "[레이아웃 강제]: 엄격한 1줄 가로 배열. 세로 적층 절대 금지.";
        } else if (layoutType === "2Lines") {
            layoutEn = "[LAYOUT MANDATE]: Balanced Two-tier vertical stacked composition. Split text into two horizontal rows.";
            layoutKo = "[레이아웃 강제]: 균형잡힌 2줄 세로 적층 배열.";
        } else if (layoutType === "TitleSub") {
            layoutEn = `[LAYOUT MANDATE]: STRICT Hierarchical composition. Main title on top, subtitle below. CRITICAL: The subtitle MUST be visibly smaller. [SUBTITLE SCALE]: ${subSizeEn}`;
            layoutKo = `[레이아웃 강제]: 엄격한 계층적 구도. 큰 메인 타이틀이 상단, 서브 타이틀이 하단 배치. 서브타이틀은 메인 타이틀과 크기가 같으면 안 되며 확연히 작아야 함. [서브타이틀 크기]: ${subSizeKo}`;
        } else if (layoutType === "SubTitle") {
            layoutEn = `[LAYOUT MANDATE]: STRICT Hierarchical composition. Subtitle on top, main title below. CRITICAL: The subtitle MUST be visibly smaller. [SUBTITLE SCALE]: ${subSizeEn}`;
            layoutKo = `[레이아웃 강제]: 엄격한 계층적 구도. 서브 타이틀이 상단, 큰 메인 타이틀이 하단 배치. 서브타이틀은 메인 타이틀과 크기가 같으면 안 되며 확연히 작아야 함. [서브타이틀 크기]: ${subSizeKo}`;
        } else if (layoutType === "Center") {
            layoutEn = "[LAYOUT MANDATE]: Centralized composition, perfectly balanced and centered layout.";
            layoutKo = "[레이아웃 강제]: 완벽한 균형을 갖춘 중앙 집중형 구도.";
        }

        const isMultiLine = layoutType === "2Lines" || layoutType === "TitleSub" || layoutType === "SubTitle";
        const isHierarchical = layoutType === "TitleSub" || layoutType === "SubTitle";

        const proportionSafetyEn = isMultiLine
            ? `[PROPORTION SAFETY]: Force individual character proportion to ${proportionEn} and width to ${widthEn}. Strictly PROHIBIT vertical stretching of individual letters. Allow vertical stacking of rows as per layout mandate.`
            : `[PROPORTION SAFETY]: Force character proportion to ${proportionEn} and width to ${widthEn}. Expand horizontally. Strictly PROHIBIT vertical stretching or 'compressed vertical aspect ratios' to prevent vertical text stacking. Maintain strong horizontal gravity.`;

        const proportionSafetyKo = isMultiLine
            ? `[비율 안전장치]: 개별 글자 비율을 ${proportionKo}(으)로, 자폭을 ${widthKo}(으)로 강제. 개별 글자의 세로 늘리기를 엄격히 금지. 레이아웃 지시에 따른 줄(Row) 단위의 세로 적층은 허용.`
            : `[비율 안전장치]: 글자 비율을 ${proportionKo}(으)로, 자폭을 ${widthKo}(으)로 강제. 가로 확장. 세로 적층을 막기 위해 '세로로 늘리기'나 '압축된 세로 종횡비' 엄격히 금지. 강력한 수평 중력 유지.`;

        const userAuraEn = customDesignInjections ? `\n[USER DESIGN DIRECTION / AURA]: ${customDesignInjections}` : "";
        const userAuraKo = customDesignInjections ? `\n[유저 디자인 방향성 / 아우라]: ${customDesignInjections}` : "";

        const subTraitContextEn = `\n[SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)}`;
        const subTraitContextKo = `\n[세부 속성 집중도]: ${getSliderTextKo(personaSliderValue)}`;

        const priorityOverrideEn = auraPriority === "AuraMax" ? `\n[CRITICAL OVERRIDE]: The Aura MUST completely override base settings if conflicted.` : "";
        const priorityOverrideKo = auraPriority === "AuraMax" ? `\n[치명적 덮어쓰기]: 사용자의 아우라(Aura)가 다른 모든 기본 설정을 무시하고 최우선 적용되어야 합니다.` : "";

        let modifierBoostEn = "";
        let modifierBoostKo = "";

        if (isEnhanceModeEnabled) {
            if (enhanceMode === 'refine') {
                modifierBoostEn = `\n[REFINEMENT SYSTEM]: ENABLED.\n- MAXIMIZE STRUCTURAL PERFECTION: Maintain the original text and base skeleton. Refine optical balance, stroke contrast, spacing, and terminal structures to the highest commercial quality.\n- READABILITY PRIORITY: Suppress unnecessary deformation. Enhance both legibility and morphological density simultaneously.\n- TENSION & POLISH: Strengthen the tension of strokes and meticulously polish edges, serifs, and cuts.`;
                modifierBoostKo = `\n[정제 시스템]: 활성화됨.\n- 조형적 완결성 극대화: 원래 텍스트와 기본 골격을 최대한 유지하되, 광학 균형, 획 대비, 간격, 단부 구조를 정교하게 다듬어 최종 완성도를 높인다.\n- 가독성 우선: 불필요한 변형은 억제하고, 가독성과 조형적 밀도를 동시에 향상시킨다.\n- 텐션 및 정교화: 획의 긴장감을 강화하고 단부, 세리프, 절단면을 정교하게 다듬어 평범한 모양을 프리미엄 수준으로 끌어올린다.`;
            } else if (enhanceMode === 'variation') {
                modifierBoostEn = `\n[VARIATION SYSTEM]: ENABLED.\n- EXPAND STYLE CANDIDATES: Maintain core readability and base structure, but explore diverse morphological interpretations.\n- STRUCTURAL VARIATION: Allow modifications in proportion, stroke contrast, connection methods, and terminal treatments.\n- COUNTERFORM REINTERPRETATION: Reinterpret internal counterforms and stroke flows. Alter the cohesiveness between letters.\n- PRESERVE LOGIC: Ensure the design does not collapse completely; maintain legibility and structural logic while changing the overall impression.`;
                modifierBoostKo = `\n[변주 시스템]: 활성화됨.\n- 스타일 후보군 확장: 텍스트의 핵심 읽힘과 기본 구조는 유지하되, 다양한 조형적 해석을 탐색한다.\n- 구조적 변주: 비례, 획 대비, 결합 방식, 단부 처리의 변형을 허용한다.\n- 카운터폼 재해석: 내부 카운터폼과 획의 흐름을 재해석하고, 글자 간 응집도를 다르게 가져간다.\n- 논리 유지: 형태가 완전히 무너지지 않도록 가독성과 구조 논리를 유지하되, 전체적인 인상은 새롭게 바꾼다.`;
            } else if (enhanceMode === 'deconstruct') {
                modifierBoostEn = `\n[DECONSTRUCTION SYSTEM]: ENABLED.\n- RADICAL STYLE EXPERIMENT: Maintain minimal recognizability of the text, but disassemble and rearrange strokes.\n- FRAGMENTATION & MERGE: Allow cutting, deleting, overlapping, and fusing of structures to create a new 2D morphological language.\n- REDESIGN COUNTERFORMS: Rebuild counterforms and reassemble fragmented connections. Can form cohesive emblem-like structures.\n- LOGICAL DECONSTRUCTION: This is not simple noise. Create highly original silhouettes through logical deconstruction and reconstruction, enhancing asymmetry and tension.`;
                modifierBoostKo = `\n[해체 시스템]: 활성화됨.\n- 급진적 스타일 실험: 텍스트의 최소한의 인식 가능성은 유지하되, 획을 분해하고 재배열한다.\n- 파편화 및 융합: 구조의 절단, 생략, 중첩, 융합을 허용하여 새로운 2D 조형 언어를 만든다.\n- 카운터폼 재설계: 카운터폼을 재설계하고 파편화된 연결부를 재조립하여 응집형 엠블럼 구조를 형성할 수 있다.\n- 논리적 해체: 단순한 노이즈가 아닌 논리적인 해체와 재구성을 통해 독창적인 실루엣을 만들고 비대칭과 긴장감을 강화한다.`;
            }
        }

        const momentumBoostEn = momentumActive ? `\n[COMBAT DYNAMICS ENGINE]: ENABLED.\n- FORCE VECTOR INJECTION: Every form must have a clear direction vector showing where it is being pushed/pulled.\n- PRIMARY STRIKE AXIS: Establish one main strike axis traversing the entire structure. All distortion occurs along this axis.\n- STRUCTURAL DEFORMATION: Actual physical deformation required (compression, stretch, shear, displacement). No simple effects.\n- IMPACT ZONES: Clearly define 'Impact Zones' where force originates and where it erupts.\n- ASYMMETRIC FORCE DISTRIBUTION: Distribute force unevenly (heavy on one side, torn/light on the other).\n- SLASH IS NOT DECORATION: Slashing marks must actually cut through the structural mass.\n- MOTION TRAIL LOGIC: Motion trails must act as structural remnants of previous positions.\n- NO FAKE FX: Strictly prohibit light, particles, and magic FX. Express speed and force purely through structural deformation.` : "";
        const momentumBoostKo = momentumActive ? `\n[전투 동세 엔진]: 활성화됨.\n- 힘의 벡터 주입: 모든 형태는 어디로 밀리거나 당겨지는지 명확한 방향 벡터를 가져야 함.\n- 주 타격 축: 전체 구조를 관통하는 하나의 주 타격 축 설정. 모든 왜곡은 이 축을 따라 발생.\n- 구조적 변형: 단순 효과가 아닌 실제 물리적 변형(압축, 인장, 전단, 변위) 필수.\n- 임팩트 존: 힘이 시작되고 폭발하는 '임팩트 존' 명확히 정의.\n- 비대칭 힘 분배: 힘을 불균형하게 분배 (한쪽은 무겁고, 다른 쪽은 기어지거나 가볍게).\n- 베기(Slash)는 장식이 아님: 베기 자국은 실제 구조적 덩어리를 잘라내야 함.\n- 모션 트레일 논리: 모션 트레일은 이전 위치의 구조적 잔해 역할을 해야 함.\n- 가짜 FX 금지: 빛, 파티클, 마법 FX 엄격히 금지. 속도와 힘을 오직 구조적 변형으로만 표현.` : "";

        const bgDescEn = getOptionEn(staticOptions.base, baseStyle) || "JET BLACK Background";
        const bgDescKo = baseStyle === 'BlackWhite' ? "완전한 검은색 배경" : "완전한 흰색 배경";

        let personaSpecificInstructionEn = "";
        let personaSpecificInstructionKo = "";
        const activePersonaData = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];

        if (activePersonaData.id === 'sovereign') {
            personaSpecificInstructionEn = "\n- Structural Law: Build each character like an ancient fortress gate. Use heavy vertical pillars, controlled serif flares, and strict horizontal stability. Prioritize density, legibility, architectural balance, and premium RPG presence. Avoid excessive distortion, chaotic cracks, cartoon styling, or modern sci-fi shapes.";
            personaSpecificInstructionKo = "\n- 구조적 법칙: 각 글자를 고대 요새의 성문처럼 구축하십시오. 묵직한 수직 기둥, 절제된 세리프 확장, 엄격한 수평적 안정성을 사용하십시오. 획의 밀도, 가독성, 건축적 균형, 프리미엄 RPG의 존재감을 우선시하십시오. 과도한 왜곡, 혼란스러운 균열, 캐주얼한 형태를 피하십시오.";
        } else if (activePersonaData.id === 'obsidian') {
            personaSpecificInstructionEn = "\n- Structural Law: Treat vertical stems as forged steel slabs and terminals as lethal blade edges. Use controlled slash cuts, compressed tension, sharp serif extensions, and battle-forged silhouettes. Preserve strong readability while giving the typography a dangerous, premium combat presence.";
            personaSpecificInstructionKo = "\n- 구조적 법칙: 수직 획을 단조된 강철판으로, 끝단을 치명적인 칼날로 취급하십시오. 절제된 사선 절단, 압축된 긴장감, 날카로운 세리프 확장을 사용하십시오. 강력한 가독성을 유지하면서 타이포그래피에 위험하고 프리미엄한 전투적 존재감을 부여하십시오.";
        } else if (activePersonaData.id === 'aether') {
            personaSpecificInstructionEn = "\n- Structural Law: Combine disciplined brush anatomy with blade-like precision, flowing energy rhythm, and elegant spiritual tension. Use dynamic stroke contrast, graceful terminals, and controlled negative space to create a premium eastern-fantasy presence.";
            personaSpecificInstructionKo = "\n- 구조적 법칙: 절제된 붓획 구조와 칼날 같은 정밀함, 흐르는 에너지 리듬, 우아한 영적 긴장감을 결합하십시오. 역동적인 획 두께 대비, 우아한 마감, 절제된 여백을 사용하여 프리미엄 동양 판타지의 존재감을 만드십시오.";
        } else if (activePersonaData.id === 'director') {
            personaSpecificInstructionEn = "\n- Structural Law: Prioritize clear readability, optical balance, scalable silhouette, refined details, and strong brand usability across desktop, mobile, banners, and promotional pages. Keep the fantasy mood powerful but controlled. Avoid over-rendering, unreadable deformation, and excessive ornamentation.";
            personaSpecificInstructionKo = "\n- 구조적 법칙: 데스크탑, 모바일, 배너 전반에 걸쳐 명확한 가독성, 광학적 균형, 확장 가능한 실루엣, 정제된 디테일, 강력한 브랜드 사용성을 우선시하십시오. 판타지 분위기를 강력하지만 통제된 상태로 유지하십시오. 과도한 렌더링, 읽을 수 없는 왜곡, 지나친 장식을 피하십시오.";
        }

        const personaMandateEn = `\n[DIRECTOR PERSONA MANDATE - ${activePersonaData.shortTitle}]:\n- Role: ${activePersonaData.role}\n- Focus: Apply '${activePersonaData.keywords}' aesthetics heavily.${personaSpecificInstructionEn}`;
        const personaMandateKo = `\n[디렉터 페르소나 명령 - ${activePersonaData.shortTitle}]:\n- 역할: ${activePersonaData.role}\n- 집중: '${activePersonaData.keywords}' 미학을 강력하게 적용하십시오.${personaSpecificInstructionKo}`;

        const morphologyBodyEn = `${weightEn}, ${kerningEn}, Width(${widthEn}), Specific Proportion(${proportionEn}).`;
        const morphologyDetailEn = isAdvancedOptionsEnabled ? `\n- Detail: ${terminalEn}, ${sharpnessEn}, Texture(${textureEn}), Extension(${extensionEn}), Corner(${cornerEn}).\n${genreSpecEn}\n- Damage: ${destructionEn}\n- Slant: ${slantEn}` : "";

        const morphologyBodyKo = `${weightKo}, ${kerningKo}, 자폭(${widthKo}), 특정 비율(${proportionKo}).`;
        const morphologyDetailKo = isAdvancedOptionsEnabled ? `\n- 디테일: ${terminalKo}, ${sharpnessKo}, 질감(${textureKo}), 확장(${extensionKo}), 코너(${cornerKo}).\n${genreSpecKo}\n- 파괴: ${destructionKo}\n- 기울기: ${slantKo}` : "";

        const generatedBaseEn = `[MASTER TYPO SPECS V16.2 - RPG CORE] Text: "${inputText}". ${userAuraEn}${subTraitContextEn}
[CORE PHILOSOPHY & MANDATE]:
1. DO NOT render standard flat fonts. Prohibit 'Standard System Font' aesthetics.
2. Render characters as epic logotypes with strong structural integrity.
[STRICT MONOCHROME]: NO COLORS, ZERO CHROMA, STRICT BLACK AND WHITE ONLY.
[2D MANDATE]: STRICTLY FLAT GRAPHIC SILHOUETTE. ZERO DEPTH. NO 3D render. ABSOLUTELY NO LANDSCAPES, NO REALISTIC ARCHITECTURE, NO PEOPLE, NO SCENES.
[SPATIAL MANDATE]: ${occupancyEn}
${layoutEn}${personaMandateEn}
${proportionSafetyEn}
[MORPHOLOGY]:
- Theme: ${isAdvancedOptionsEnabled ? styleEn : `MMO Base Theme`}.
- Body: ${morphologyBodyEn}${morphologyDetailEn}
[MOMENTUM]: ${kineticEn}. ${priorityOverrideEn}
[ENVIRONMENT]: AR ${aspectRatio}, ${bgDescEn}.${modifierBoostEn}${momentumBoostEn}`.trim();

        const generatedBaseKo = `[마스터 타이포 스펙 V16.2 - RPG 코어] 텍스트: "${inputText}". ${userAuraKo}${subTraitContextKo}
[핵심 철학 및 지시사항]:
1. 일반 폰트 렌더링 금지. '표준 시스템 폰트' 미학 배제.
2. 강력한 구조적 무결성을 지닌 에픽 로고타입으로 각 캐릭터 렌더링.
[엄격한 단색화]: 색상 금지, 채도 0, 순수 흑백으로만 구성.
[2D 강제]: 완벽한 평면 그래픽 실루엣. 깊이감 제로. 3D 렌더링 금지. 풍경, 실제 건축물, 인물, 배경 묘사 절대 금지.
[공간 할당]: ${occupancyKo}
${layoutKo}${personaMandateKo}
${proportionSafetyKo}
[형태학]:
- 테마: ${isAdvancedOptionsEnabled ? styleKo : `MMO 기본 테마`}.
- 뼈대: ${morphologyBodyKo}${morphologyDetailKo}
[동세]: ${kineticKo}. ${priorityOverrideKo}
[환경]: 화면비 ${aspectRatio}, ${bgDescKo}.${modifierBoostKo}${momentumBoostKo}`.trim();

        const baseTechnicalEn = manualBasePrompt?.en || generatedBaseEn;
        const baseTechnicalKo = manualBasePrompt?.ko || generatedBaseKo;

        const overview = `[ V16.2 RPG TYPOGRAPHY OVERVIEW ]
■ SUBJECT: "${inputText}"
■ DIRECTOR PERSONA: ${activePersonaData.shortTitle}
■ DESIGN AURA: ${customDesignInjections || "기본 셋업"}

[ CORE SETTINGS ]
• Theme: ${styleKo}
• Weight: ${weightKo}
• Terminal: ${terminalKo}
• Sharpness: ${sharpnessKo}
• Dynamics: ${kineticKo}

[ LAYOUT & CANVAS ]
• Layout: ${getOptionName(staticOptions.layouts, layoutType).split(' ')[0]}
• Proportion & Width: ${getOptionName(staticOptions.proportions, charProportion)} / ${getOptionName(staticOptions.widths, charWidth)}
• Aspect Ratio & Occupancy: ${aspectRatio} / ${occupancyKo}

[ MODIFIERS ]
• Enhance Mode: ${isEnhanceModeEnabled ? (enhanceMode === 'refine' ? 'REFINE' : enhanceMode === 'variation' ? 'VARIATION' : 'DECONSTRUCT') : 'OFF'}
• Combat Dynamics: ${momentumActive ? "ON" : "OFF"}`;

        let cgTextInstruction = `Render "${inputText}"`;
        if (inputText.includes('\n')) {
            const lines = inputText.split('\n');
            if (layoutType === "TitleSub") {
                cgTextInstruction = `Render the following 2 lines EXACTLY in this vertical order:\n- [TOP ROW]: "${lines[0]}" (Main Title - Huge/Prominent)\n- [BOTTOM ROW]: "${lines[1] || ''}" (Subtitle - explicitly smaller scale)`;
            } else if (layoutType === "SubTitle") {
                cgTextInstruction = `Render the following 2 lines EXACTLY in this vertical order:\n- [TOP ROW]: "${lines[0]}" (Subtitle - explicitly smaller scale)\n- [BOTTOM ROW]: "${lines[1] || ''}" (Main Title - Huge/Prominent)`;
            } else if (layoutType === "2Lines") {
                cgTextInstruction = `Render the following 2 lines EXACTLY in this vertical order with equal scale:\n- [TOP ROW]: "${lines[0]}"\n- [BOTTOM ROW]: "${lines[1] || ''}"`;
            }
        }

        const chatGPTOutput = `Act as an expert Typography Engine. ${cgTextInstruction} in a 2D flat silhouette graphic.
1. Constraints: Pure black and white, ${occupancyEn}.
2. Layout & Proportion: ${layoutEn} Force ${proportionEn}. Prevent individual vertical stretching.
3. Directing Aura: ${customDesignInjections} ${subTraitContextEn}.
4. Modifiers: ${isEnhanceModeEnabled ? enhanceMode + ' mode. ' : ''}${momentumActive ? 'Combat kinetics.' : ''}
5. Details: ${isAdvancedOptionsEnabled ? `Texture(${textureEn}), Damage(${destructionEn}), Slicing(${slicingEn}), Corner(${cornerEn}), Slant(${slantEn})` : 'Aura Driven'}`;

        const midjourneyOutput = `${inputText.replace(/\n/g, ' ')} typography logotype, ${customDesignInjections}, MMO RPG theme, 2D flat graphic silhouette, pure black and white, ${isEnhanceModeEnabled ? (enhanceMode === 'deconstruct' ? 'iconic structural silhouette, morphological fun, ' : (enhanceMode === 'variation' ? 'diverse structural interpretations, ' : 'sharp architectural lines, ')) : ''}${momentumActive ? 'extreme dynamic momentum, ' : ''}${isAdvancedOptionsEnabled ? textureEn + ', ' + destructionEn + ', ' + slicingEn + ', ' + cornerEn + ', ' : ''}${isMultiLine ? (isHierarchical ? `hierarchical multi-line composition, explicitly smaller subtitle scale (${subSizeEn}), ` : 'balanced multi-line composition, ') : 'strictly single horizontal row, '}${proportionEn}, wide panoramic span, ${occupancy.replace('%', ' percent')} occupancy, --ar ${aspectRatio.replace(':', ':')} --no 3d, realistic background, landscape, people, font, color, texture, compressed vertical aspect ratio`;

        let finalOut = overview;
        if (aiModel === 'NanoBanana') finalOut = dramaticPrompt || "Click Build first.";
        else if (aiModel === 'ChatGPT') finalOut = cgEnhancedPrompt || chatGPTOutput;
        else if (aiModel === 'Midjourney') finalOut = mjOptimizedPrompt || midjourneyOutput;

        return { baseTechnicalEn, baseTechnicalKo, outputContent: finalOut, chatGPTOutput, midjourneyOutput, overview };
    };

    const buildEditPrompts = () => {
        const instruction = editInstruction || "원본 이미지의 형태를 유지하며 디테일을 보완합니다.";
        let priorityOverrideEn = "";
        let priorityOverrideKo = "";
        if (editAuraPriority === "AuraMax" || editAuraPriority === "Balanced" || editAuraPriority === "OptionMax") {
            priorityOverrideEn = `\n[AURA OVERRIDE SAFETY LIMIT]:\nCore silhouette MUST remain recognizable. Structural deformation limited to 15% maximum. Aura can influence detail, NOT structure replacement.`;
            priorityOverrideKo = `\n[아우라 덮어쓰기 안전 한계]:\n핵심 실루엣은 반드시 인식 가능해야 합니다. 구조적 변형은 최대 15%로 제한. 아우라는 디테일에만 영향을 미치며 구조 자체를 대체할 수 없습니다.`;
        }

        const subTraitContextEn = `\n[SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)}`;
        const subTraitContextKo = `\n[세부 속성 집중도]: ${getSliderTextKo(personaSliderValue)}`;

        const aiRecInstructionEn = applyAiRecInEdit ? "\n[AI RECOMMENDATION ENABLED]: AI will actively recommend and apply optimal micro-details." : "";
        const aiRecInstructionKo = applyAiRecInEdit ? "\n[AI 추천 활성화됨]: AI가 최적의 마이크로 디테일을 적극적으로 추천하고 적용합니다." : "";

        const autoRefineInstructionEn = applyAutoRefine ? `\n\n[SHAPE NORMALIZATION PROTOCOL]\nIf the base image appears rough, sketched, or geometrically imperfect, you MUST auto-correct its foundational structure:\n1. Stroke Consistency: Mathematically unify stroke weights and styling logic.\n2. Silhouette Clarity: Sharpen outer boundaries to create a premium 2D vector-level form.` : "";
        const autoRefineInstructionKo = applyAutoRefine ? `\n\n[형태 정규화 프로토콜]\n원본 이미지가 거칠거나 스케치 형태, 기하학적으로 불완전할 경우 기본 구조를 자동 교정합니다:\n1. 획 일관성: 획 두께와 스타일 논리를 수학적으로 통일.\n2. 실루엣 선명도: 외부 경계를 선명하게 다듬어 프리미엄 2D 벡터 수준의 형태로 만듦.` : "";

        const mmoSilhouetteEn = getOptionEn(staticOptions.MMOSilhouetteFramings, mmoSilhouetteFraming);
        const mmoSurroundEn = getOptionEn(staticOptions.MMOSurroundingElements, mmoSurroundingElement);
        const kineticEn = getOptionEn(staticOptions.kineticVelocities, kineticVelocity);
        const slantEn = getOptionEn(staticOptions.slantAngles, slantAngle);
        const destructionEn = getOptionEn(staticOptions.deformationDamages, deformationDamage);
        const slicingEn = getOptionEn(staticOptions.slicingIntensities, slicingIntensity);
        const cornerEn = getOptionEn(staticOptions.cornerStyles, cornerStyle);

        const mmoSilhouetteKo = getOptionName(staticOptions.MMOSilhouetteFramings, mmoSilhouetteFraming);
        const mmoSurroundKo = getOptionName(staticOptions.MMOSurroundingElements, mmoSurroundingElement);
        const kineticKo = getOptionName(staticOptions.kineticVelocities, kineticVelocity);
        const slantKo = getOptionName(staticOptions.slantAngles, slantAngle);
        const destructionKo = getOptionName(staticOptions.deformationDamages, deformationDamage);
        const cornerKo = getOptionName(staticOptions.cornerStyles, cornerStyle);

        const editStrokeEn = getOptionEn(staticOptions.editStrokeMods, editStrokeMod);
        const editElementEn = getOptionEn(staticOptions.editElementMods, editElementMod);
        const editSurfaceEn = getOptionEn(staticOptions.editSurfaceMods, editSurfaceMod);

        const editStrokeKo = getOptionName(staticOptions.editStrokeMods, editStrokeMod);
        const editElementKo = getOptionName(staticOptions.editElementMods, editElementMod);
        const editSurfaceKo = getOptionName(staticOptions.editSurfaceMods, editSurfaceMod);

        const subSizeEn = getOptionEn(staticOptions.subTitleSizes, subTitleSize);
        const subSizeKo = getOptionName(staticOptions.subTitleSizes, subTitleSize);

        let layoutEn = "";
        let layoutKo = "";
        if (layoutType === "1Line") {
            layoutEn = "[LAYOUT MANDATE]: STRICT SINGLE HORIZONTAL ROW. ABSOLUTELY NO VERTICAL STACKING. Prevent multi-line arrangements.";
            layoutKo = "[레이아웃 강제]: 엄격한 1줄 가로 배열. 세로 적층 절대 금지.";
        } else if (layoutType === "2Lines") {
            layoutEn = "[LAYOUT MANDATE]: Balanced Two-tier vertical stacked composition. Split text into two horizontal rows.";
            layoutKo = "[레이아웃 강제]: 균형잡힌 2줄 세로 적층 배열.";
        } else if (layoutType === "TitleSub") {
            layoutEn = `[LAYOUT MANDATE]: STRICT Hierarchical composition. Main title on top, subtitle below. CRITICAL: The subtitle MUST be visibly smaller. [SUBTITLE SCALE]: ${subSizeEn}`;
            layoutKo = `[레이아웃 강제]: 엄격한 계층적 구도. 큰 메인 타이틀이 상단, 서브 타이틀이 하단 배치. 서브타이틀은 메인 타이틀과 크기가 같으면 안 되며 확연히 작아야 함. [서브타이틀 크기]: ${subSizeKo}`;
        } else if (layoutType === "SubTitle") {
            layoutEn = `[LAYOUT MANDATE]: STRICT Hierarchical composition. Subtitle on top, main title below. CRITICAL: The subtitle MUST be visibly smaller. [SUBTITLE SCALE]: ${subSizeEn}`;
            layoutKo = `[레이아웃 강제]: 엄격한 계층적 구도. 서브 타이틀이 상단, 큰 메인 타이틀이 하단 배치. 서브타이틀은 메인 타이틀과 크기가 같으면 안 되며 확연히 작아야 함. [서브타이틀 크기]: ${subSizeKo}`;
        } else if (layoutType === "Center") {
            layoutEn = "[LAYOUT MANDATE]: Centralized composition, perfectly balanced and centered layout.";
            layoutKo = "[레이아웃 강제]: 완벽한 균형을 갖춘 중앙 집중형 구도.";
        }

        const isMultiLine = layoutType === "2Lines" || layoutType === "TitleSub" || layoutType === "SubTitle";
        const isHierarchical = layoutType === "TitleSub" || layoutType === "SubTitle";

        const proportionLockEn = isMultiLine
            ? `4. PROPORTION LOCK: Maintain the multi-line hierarchical layout. Prohibit vertical stretching of individual letters. [SUBTITLE SCALE IF APPLICABLE]: ${subSizeEn}`
            : `4. PROPORTION LOCK: Maintain horizontal panoramic frame. Prohibit vertical stacking.`;
        const proportionLockKo = isMultiLine
            ? `4. 비율 고정: 다중 줄 계층형 레이아웃을 유지. 개별 글자의 세로 늘리기 금지. [해당 시 서브타이틀 크기]: ${subSizeKo}`
            : `4. 비율 고정: 가로 파노라마 프레임 유지. 세로 적층 금지.`;

        const activePersonaData = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];
        const personaMandateEn = `\n[DIRECTOR PERSONA MANDATE - ${activePersonaData.shortTitle}]:\n- Role: ${activePersonaData.role}\n- Focus: Apply '${activePersonaData.keywords}' aesthetics.`;
        const personaMandateKo = `\n[디렉터 페르소나 명령 - ${activePersonaData.shortTitle}]:\n- 역할: ${activePersonaData.role}\n- 집중: '${activePersonaData.keywords}' 미학을 적용하십시오.`;

        const generatedBaseEn = `[IMAGE-TO-IMAGE TYPOGRAPHY EDIT V16.2 - RPG CORE]
[CORE MANDATE]:
1. BASE LOCK: Use the provided base image as the exact structural foundation. Do not reinvent the entire word.
2. STRICT MONOCHROME: Maintain Pure Black background, White subject.
3. STRICT 2D: Flat graphic silhouette only. ZERO 3D. ABSOLUTELY NO LANDSCAPES, NO REALISTIC ARCHITECTURE, NO PEOPLE, NO SCENES.
${proportionLockEn}

[EDIT DIRECTION / AURA]: ${instruction}${subTraitContextEn}
${personaMandateEn}

[FOCUSED MICRO-REFINEMENTS]:
- Stroke/Edge Mod: ${editStrokeEn}
- Element/Rhythm Mod: ${editElementEn}
- Surface/Texture Mod: ${editSurfaceEn}

[GLOBAL SHAPE & DYNAMICS]:
- Framing: ${mmoSilhouetteEn}
- FX & Surround: ${mmoSurroundEn}
- Kinetic Force: ${kineticEn}, Slant: ${slantEn}
- Corner Style: ${cornerEn}
- Damage/Erosion: ${destructionEn}
${priorityOverrideEn}${aiRecInstructionEn}${autoRefineInstructionEn}`.trim();

        const generatedBaseKo = `[이미지-투-이미지 타이포그래피 편집 V16.2 - RPG 코어]
[핵심 명령]:
1. 베이스 고정: 제공된 원본 이미지를 정확한 구조적 기반으로 사용. 전체 단어를 새로 디자인하지 말 것.
2. 엄격한 단색화: 순수 검은색 배경, 흰색 피사체 유지.
3. 엄격한 2D: 평면 그래픽 실루엣 전용. 3D 제로. 풍경, 실제 건축물, 인물, 배경 묘사 절대 금지.
${proportionLockKo}

[EDIT DIRECTION / AURA]: ${instruction}${subTraitContextKo}
${personaMandateKo}

[집중 마이크로-리터칭]:
- 획/엣지 수정: ${editStrokeKo}
- 요소/리듬 수정: ${editElementKo}
- 표면/질감 수정: ${editSurfaceKo}

[글로벌 형태 및 동세]:
- 프레이밍: ${mmoSilhouetteKo}
- FX & 장식: ${mmoSurroundKo}
- 물리적 힘: ${kineticKo}, 기울기: ${slantKo}
- 코너 성격: ${cornerKo}
- 파괴/침식: ${destructionKo}
${priorityOverrideKo}${aiRecInstructionKo}${autoRefineInstructionKo}`.trim();

        const baseTechnicalEn = editManualBasePrompt?.en || generatedBaseEn;
        const baseTechnicalKo = editManualBasePrompt?.ko || generatedBaseKo;

        const overview = `[ V16.2 I2I EDIT OVERVIEW ]
■ EDIT DIRECTION: ${instruction}
■ DIRECTOR PERSONA: ${activePersonaData.shortTitle}

[ MICRO REFINEMENTS ]
• Stroke Mod: ${editStrokeKo}
• Element Mod: ${editElementKo}
• Surface Mod: ${editSurfaceKo}

[ SHAPE & DYNAMICS ]
• Silhouette: ${mmoSilhouetteKo}
• Kinetic/Slant: ${kineticKo} / ${slantKo}
• Damage: ${destructionKo}

[ SETTINGS ]
• AI Recommendation: ${applyAiRecInEdit ? "ON" : "OFF"}
• Sketch Auto-Refine: ${applyAutoRefine ? "ON" : "OFF"}`;

        let cgEditTextInstruction = `Redraw the provided image. STRICTLY MAINTAIN basic shape, pure black/white monochrome, and 2D flat graphic style.`;
        if (inputText.includes('\n') && isMultiLine) {
            const lines = inputText.split('\n');
            if (layoutType === "TitleSub") {
                cgEditTextInstruction += `\nEnsure the text is placed exactly as:\n- [TOP ROW]: "${lines[0]}" (Main Title)\n- [BOTTOM ROW]: "${lines[1] || ''}" (Subtitle - explicitly smaller scale)`;
            } else if (layoutType === "SubTitle") {
                cgEditTextInstruction += `\nEnsure the text is placed exactly as:\n- [TOP ROW]: "${lines[0]}" (Subtitle - explicitly smaller scale)\n- [BOTTOM ROW]: "${lines[1] || ''}" (Main Title)`;
            }
        }

        const chatGPTOutput = `Act as an expert Typography Engine. ${cgEditTextInstruction}
1. Focused Edits: ${instruction} ${subTraitContextEn}.
2. Retouching: Stroke(${editStrokeEn}), Element(${editElementEn}), Surface(${editSurfaceEn}).
3. Dynamics: ${kineticEn}, ${destructionEn}, ${slicingEn}, Corner(${cornerEn}).
4. Layout Constraint: Keep horizontal ratio.`;

        const midjourneyOutput = `[UPLOAD BASE IMAGE AS REFERENCE] typography logotype, image-to-image edit, exact structural foundation, pure black and white, 2D flat graphic silhouette, ${instruction}, ${editStrokeEn}, ${editElementEn}, ${editSurfaceEn}, ${kineticEn}, ${destructionEn}, ${slicingEn}, ${cornerEn}, ${isMultiLine ? (isHierarchical ? `hierarchical multi-line composition, explicitly smaller subtitle scale (${subSizeEn}), ` : 'balanced multi-line composition, ') : 'strictly single horizontal row, '} wide panoramic span, --ar 16:9 --iw 1.5 --style raw --no 3d, realistic background, landscape, people, font, color, compressed vertical aspect ratio`;

        let finalOut = overview;
        if (editAiModel === 'NanoBanana') finalOut = editDramaticPrompt || "Click Build first.";
        else if (editAiModel === 'ChatGPT') finalOut = editCgPrompt || chatGPTOutput;
        else if (editAiModel === 'Midjourney') finalOut = editMjPrompt || midjourneyOutput;

        return { baseTechnicalEn, baseTechnicalKo, outputContent: finalOut };
    };

    const runInspector = async (isEdit = false) => {
        setIsInspecting(true);
        setSelectedResolutionIndex(0);
        const { baseTechnicalEn } = isEdit ? buildEditPrompts() : buildPrompts();

        const systemPrompt = `You are the 'Prompt Integrity Inspector' for an elite Dark Fantasy RPG typography generation engine.
    Your task is to analyze the user's [Base Technical Prompt] for logical conflicts that could confuse the AI image generator.

    [CRITICAL OCCUPANCY RULE]:
    The specified "SPATIAL MANDATE" (Occupancy/Margin, e.g., 50%) is the ABSOLUTE boundary.
    If the Persona, Aura, or any descriptive text includes size-enlarging adjectives (e.g., 'massive', 'giant', 'epic scale', 'huge', '거대한', '압도적인 크기'), you MUST rewrite them to describe 'density', 'thickness', or 'heavy mass' (e.g., 'dense', 'heavy structure', '고밀도의', '묵직한 덩어리감') instead. Descriptive adjectives MUST NEVER override or conflict with the Occupancy margin.

    Common conflicts include:
    - A Director Persona (like 'flawless balance') clashing with a Modifier (like 'Wild/Controlled Chaos' forcing asymmetry and distortion).
    - High Occupancy (e.g., 100%) but requesting many 'surrounding elements'.
    - Aura text that contradicts the chosen morphology settings (e.g., aura says "smooth curves" but terminal is set to "Chiseled/Blade").

    Analyze the prompt. If there is a logical clash or redundancy:
    1. "hasConflict": true
    2. "analysisMessage": Professional Korean explanation of what is conflicting and why it causes issues. (Start with '⚠️ [충돌 감지]')
    3. "resolutions": Provide EXACTLY TWO different resolution paths as objects in an array.
       - Path 1 (Aura Priority): Resolve conflicts by prioritizing the user's [USER DESIGN DIRECTION / AURA]. Adjust the conflicting mechanical options or Persona constraints to perfectly match the user's intended Aura.
       - Path 2 (System Priority): Resolve conflicts by strictly enforcing the selected system settings and [DIRECTOR PERSONA MANDATE]. Reinterpret or dial down the user's Aura so it fits the mechanical rules perfectly.
       Each object must have:
       - "title": "Korean Title (e.g., '🎨 아우라(의도) 최우선 반영' or '⚙️ 시스템 설정 및 페르소나 유지')"
       - "desc": "Brief Korean description of what was modified (e.g., '사용자의 의도를 살리기 위해 페르소나의 제한을 일부 완화했습니다.')."
       - "resolvedPromptEn": "The full revised prompt in English"
       - "resolvedPromptKo": "The full revised prompt translated to highly professional Korean"

    If the prompt is completely logical and synergistic:
    1. "hasConflict": false
    2. "analysisMessage": Professional Korean praise of the synergy. Explain why this combination will work well. (Start with '✅ [무결성 완벽]')
    3. "resolutions": []

    Return STRICTLY a valid JSON object: { "hasConflict": boolean, "analysisMessage": "string", "resolutions": [ { "title": "string", "desc": "string", "resolvedPromptEn": "string", "resolvedPromptKo": "string" } ] }`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: baseTechnicalEn }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json", temperature: 0.2 } })
            });
            const data = await response.json();
            const result = extractJson(data.candidates[0].content.parts[0].text);
            setInspectionResult({ ...result, isEdit });
            setIsInspectorModalOpen(true);
        } catch (e) {
            console.error("Inspector error", e);
        } finally {
            setIsInspecting(false);
        }
    };

    const requestDramaticEnhancement = async () => {
        if (isEnhancing) return;
        setIsEnhancing(true);
        const { baseTechnicalEn } = buildPrompts();
        const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];

        const systemPrompt = `You are a visionary Art Director for "Nano Banana 2". Transform technical specs into a morphological masterpiece.
    [YOUR PERSONA]: ${persona.role}
    [YOUR WRITING TONE]: ${persona.tone}
    [KEYWORDS]: ${persona.keywords}
    [CURRENT SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)}
    PROHIBIT 3D and MATERIALS.
    [CRITICAL ANTI-SCENE RULE]: NEVER describe landscapes, skies, realistic 3D buildings, environments, or people. The metaphors (e.g., fortress, blades) are strictly for 2D FLAT LETTER SHAPES. The output must remain a flat typography logotype on a solid background.
    [CRITICAL LAYOUT RULE]: Never suggest "compressed vertical aspect ratio". Strictly follow the [PROPORTION SAFETY] and [LAYOUT MANDATE] defined in the user prompt. If a subtitle is present, emphasize the size contrast heavily so they are not rendered at the same size. Describe horizontal expansion and heavy grounded gravity.
    Output format: \n1. # ARCHITECTURAL EVOLUTION \n2. # KINETIC ORGANIC ANATOMY \n3. # THE UNBOUNDED BOUNDARY \n4. # THE SUPREME COMMAND: Consolidated elite prompt string.`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: baseTechnicalEn }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.7 } })
            });
            const data = await response.json(); setDramaticPrompt(data.candidates?.[0]?.content?.parts?.[0]?.text || "");
            setIsOutdated(false);
        } catch (err) { } finally { setIsEnhancing(false); }
    };

    const requestEditDramaticEnhancement = async () => {
        if (isEditEnhancing) return;
        setIsEditEnhancing(true);
        const { baseTechnicalEn } = buildEditPrompts();
        const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];

        const systemPrompt = `You are a visionary Art Director for Nano Banana 2 Image-to-Image generation.
    [YOUR PERSONA]: ${persona.role}
    [YOUR WRITING TONE]: ${persona.tone}
    [KEYWORDS]: ${persona.keywords}
    PROHIBIT 3D and MATERIALS. \n[INTERPRETATION LIMIT]: Do NOT reinterpret the structure. Only enhance existing geometry. \n[CRITICAL ANTI-SCENE RULE]: NEVER describe landscapes, skies, realistic 3D buildings, environments, or people. The metaphors (e.g., fortress, blades) are strictly for 2D FLAT LETTER SHAPES. The output must remain a flat typography logotype on a solid background. \n[CRITICAL LAYOUT RULE]: Never suggest "compressed vertical aspect ratio". Strictly follow the [PROPORTION SAFETY] and [LAYOUT MANDATE] defined in the user prompt. If a subtitle is present, emphasize the size contrast heavily so they are not rendered at the same size. Describe horizontal expansion and heavy grounded gravity. \nOutput format: \n1. # ARCHITECTURAL EVOLUTION \n2. # KINETIC ORGANIC ANATOMY \n3. # THE UNBOUNDED BOUNDARY \n4. # THE SUPREME COMMAND: Consolidated elite I2I prompt string.`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: baseTechnicalEn }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.7 } })
            });
            const data = await response.json(); setEditDramaticPrompt(data.candidates?.[0]?.content?.parts?.[0]?.text || "");
            setIsEditOutdated(false);
        } catch (err) { } finally { setIsEditEnhancing(false); }
    };

    const requestMidjourneyOptimization = async (isEdit = false) => {
        if (isEdit) { if (isEditMjOptimizing) return; setIsEditMjOptimizing(true); } else { if (isMjOptimizing) return; setIsMjOptimizing(true); }
        const { baseTechnicalEn, midjourneyOutput } = isEdit ? buildEditPrompts() : buildPrompts();
        const currentAR = isEdit ? "16:9" : aspectRatio;

        const systemPrompt = `Convert specs into Midjourney V6 tag string. Use ::2 for critical traits. Force 2D flat silhouette.
End exactly with this exact suffix (DO NOT omit the --ar parameter): " --ar ${currentAR} --iw 1.5 --style raw --no 3d, volumetric, perspective, emboss, bevel, shadow, color, standard font, texture, glowing shader, material"`;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: baseTechnicalEn }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.2 } })
            });
            const data = await response.json();
            if (isEdit) { setEditMjPrompt(data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || midjourneyOutput); setIsEditOutdated(false); }
            else { setMjOptimizedPrompt(data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || midjourneyOutput); setIsOutdated(false); }
        } catch (err) { } finally { if (isEdit) setIsEditMjOptimizing(false); else setIsMjOptimizing(false); }
    };

    const requestChatGPTEnhancement = async (isEdit = false) => {
        if (isEdit) { if (isEditCgEnhancing) return; setIsEditCgEnhancing(true); } else { if (isCgEnhancing) return; setIsCgEnhancing(true); }
        const { baseTechnicalEn, chatGPTOutput } = isEdit ? buildEditPrompts() : buildPrompts();
        const systemPrompt = `Create DALL-E 3 instructions for this typography prompt. Bullet points for edits. Strictly forbid 3D/materials. Output ONLY the final prompt text.`;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: baseTechnicalEn }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.7 } })
            });
            const data = await response.json();
            if (isEdit) { setEditCgPrompt(data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || chatGPTOutput); setIsEditOutdated(false); }
            else { setCgEnhancedPrompt(data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || chatGPTOutput); setIsOutdated(false); }
        } catch (err) { } finally { if (isEdit) setIsEditCgEnhancing(false); else setIsCgEnhancing(false); }
    };

    return {
        // refs
        moodImageRef, tuningChatRef, editTuningChatRef,
        // dict
        dict,
        // sidebar / view
        isSidebarOpen, setIsSidebarOpen, currentView, setCurrentView,
        // base
        inputText, setInputText, base64Image, setBase64Image, isDragging, setIsDragging,
        // persona
        aiPersona, setAiPersona, personaDropdownOpen, setPersonaDropdownOpen,
        isAdvancedOptionsEnabled, setIsAdvancedOptionsEnabled,
        isEnhanceModeEnabled, setIsEnhanceModeEnabled,
        enhanceMode, setEnhanceMode, momentumActive, setMomentumActive,
        auraPriority, setAuraPriority, personaSliderValue, setPersonaSliderValue,
        // MMO
        baseStyle, setBaseStyle, aspectRatio, setAspectRatio, occupancy, setOccupancy,
        layoutType, setLayoutType, layoutPreset, setLayoutPreset,
        stemWeight, setStemWeight, charWidth, setCharWidth, charProportion, setCharProportion,
        kerning, setKerning, subTitleSize, setSubTitleSize,
        scriptType, setScriptType, terminalStyle, setTerminalStyle,
        strokeTexture, setStrokeTexture, strokeSharpness, setStrokeSharpness,
        strokeExtension, setStrokeExtension, cornerStyle, setCornerStyle,
        slantAngle, setSlantAngle, kineticVelocity, setKineticVelocity,
        slicingIntensity, setSlicingIntensity, deformationDamage, setDeformationDamage,
        letterConnection, setLetterConnection, internalSpace, setInternalSpace, logoDegree, setLogoDegree,
        mmoSilhouetteFraming, setMmoSilhouetteFraming, mmoSurroundingElement, setMmoSurroundingElement,
        dynamicOptions, setDynamicOptions, customDesignInjections, setCustomDesignInjections,
        aiModel, setAiModel,
        // output prompts
        dramaticPrompt, mjOptimizedPrompt, cgEnhancedPrompt,
        aiRecSummary,
        // loading
        isEnhancing, isMjOptimizing, isCgEnhancing, isExpandingIntent, isRecommending,
        // copy
        copiedTop, copiedBottom, baseLangView, setBaseLangView,
        // manual base
        manualBasePrompt, editManualBasePrompt, setManualBasePrompt, setEditManualBasePrompt,
        // edit mode
        editUploadedImage, setEditUploadedImage, editInstruction, setEditInstruction,
        editAuraPriority, setEditAuraPriority,
        applyAiRecInEdit, setApplyAiRecInEdit, applyAutoRefine, setApplyAutoRefine,
        editAiModel, setEditAiModel,
        editStrokeMod, setEditStrokeMod, editElementMod, setEditElementMod, editSurfaceMod, setEditSurfaceMod,
        openCardId, setOpenCardId, editOpenCardId, setEditOpenCardId,
        isEditEnhancing, isEditMjOptimizing, isEditCgEnhancing, isEditExpandingIntent,
        isPromptExpanded, setIsPromptExpanded, isEditPromptExpanded, setIsEditPromptExpanded,
        isOutdated, isEditOutdated,
        // tuning
        isTuningModalOpen, setIsTuningModalOpen, isEditTuningModalOpen, setIsEditTuningModalOpen,
        tuningChatHistory, editTuningChatHistory, tuningInputValue, setTuningInputValue,
        editTuningInputValue, setEditTuningInputValue,
        isTuningLoading, isEditTuningLoading,
        currentTunedAura, currentTunedEditAura,
        tuningReferenceImage, setTuningReferenceImage, editTuningReferenceImage, setEditTuningReferenceImage,
        isAnalyzingMood,
        // inspector
        isInspectorModalOpen, setIsInspectorModalOpen, isInspecting,
        inspectionResult, selectedResolutionIndex, setSelectedResolutionIndex,
        // handlers
        handleToggleCard, handleEditToggleCard,
        handleScriptPresetChange, handleLayoutPresetChange,
        handleReset, handleAiRecommendation,
        copyToClipboard, processFile,
        handleDragOver, handleDragLeave, handleDrop,
        handleEditDrop, handleEditImageUpload, handleMoodImageUpload, handleTuningImageUpload,
        openTuningRoom, openEditTuningRoom,
        handleSendTuningMessage, handleSendEditTuningMessage,
        handleExpandIntent, handleEditExpandIntent,
        buildPrompts, buildEditPrompts, runInspector,
        requestDramaticEnhancement, requestEditDramaticEnhancement,
        requestMidjourneyOptimization, requestChatGPTEnhancement,
    };
}
