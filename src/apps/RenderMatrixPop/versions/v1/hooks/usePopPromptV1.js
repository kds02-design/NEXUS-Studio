/* eslint-disable */
// v1 전용 메인 상태/핸들러 훅. 원본 App() 의 useState/useEffect/핸들러 묶음을 그대로 옮긴 격리 사본.
import { useState, useRef, useEffect } from 'react';
import { fetchWithRetry, parseJSON } from '../constants/utils.js';
import { PRESET_GROUPS } from '../constants/options.js';
import {
    generateIR, generateEditIR,
    compileNanoBanana, compileChatGPT, compileMidjourney,
    compileEditNanoBanana, compileEditChatGPT, compileEditMidjourney,
    performLogicAudit, calculateQualityScore, calculatePromptBudget,
} from '../constants/compilers.js';

export function usePopPromptV1() {
    const [currentView, setCurrentView] = useState("editor");

    // Creation State
    const [directorPersona, setDirectorPersona] = useState("CasualUI");
    const [typographyScale, setTypographyScale] = useState("Macro");
    const [shapeFeel, setShapeFeel] = useState("Original");
    const [shapeFidelity, setShapeFidelity] = useState("Strict");
    const [baseStyle, setBaseStyle] = useState("PopChrome");
    const [colorPalette, setColorPalette] = useState("VividPop");
    const [outlineStyle, setOutlineStyle] = useState("None");
    const [depthStyle, setDepthStyle] = useState("Chunky3D");
    const [fxStyle, setFxStyle] = useState("Sparkle");
    const [background, setBackground] = useState("SolidPop");
    const [userIntent, setUserIntent] = useState("");
    const [vfxPassMode, setVfxPassMode] = useState(false);

    // Reference Image State
    const [refImage, setRefImage] = useState(null);
    const [isDraggingRef, setIsDraggingRef] = useState(false);
    const [isAnalyzingRef, setIsAnalyzingRef] = useState(false);
    const [extractedRefDetails, setExtractedRefDetails] = useState("");

    const [aiModel, setAiModel] = useState("NanoBanana");

    // Micro-Edit State
    const [editImage, setEditImage] = useState(null);
    const [editBudget, setEditBudget] = useState("Locked");
    const [activeEditIntents, setActiveEditIntents] = useState({ material: false, color: false, outline: false, vfx: false });
    const [editBaseStyle, setEditBaseStyle] = useState("Jelly");
    const [editColorPalette, setEditColorPalette] = useState("PastelDream");
    const [editOutlineStyle, setEditOutlineStyle] = useState("CleanStroke");
    const [editFxStyle, setEditFxStyle] = useState("Bubble");
    const [editBg, setEditBg] = useState("Transparent");
    const [editIntent, setEditIntent] = useState("");
    const [editVfxPassMode, setEditVfxPassMode] = useState(false);
    const [isDraggingEdit, setIsDraggingEdit] = useState(false);

    // Output State
    const [currentIR, setCurrentIR] = useState(null);
    const [compiledOutputs, setCompiledOutputs] = useState({ NanoBanana: "", ChatGPT: "", Midjourney: "", Runway: "", Luma: "" });

    const [optimizedPrompts, setOptimizedPrompts] = useState({ NanoBanana: null, ChatGPT: null, Midjourney: null });
    const [isOptimizing, setIsOptimizing] = useState(false);

    const [auditIssues, setAuditIssues] = useState([]);
    const [qualityScores, setQualityScores] = useState({ structure: 100, cuteFeel: 100, readability: 100, fxControl: 100 });
    const [promptBudget, setPromptBudget] = useState({ shape: 40, material: 20, color: 25, env: 15 });
    const [isCopied, setIsCopied] = useState(false);
    const [toastMsg, setToastMsg] = useState(null);

    const [activeTroubleshoots, setActiveTroubleshoots] = useState([]);
    const [troubleshootHistory, setTroubleshootHistory] = useState({});

    const [isExpandingIntent, setIsExpandingIntent] = useState(false);
    const [isChatModalOpen, setIsChatModalOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const [isChatting, setIsChatting] = useState(false);
    const [tempIntent, setTempIntent] = useState("");
    const chatScrollRef = useRef(null);

    const [activePresetGroup, setActivePresetGroup] = useState(PRESET_GROUPS[0].id);
    const [activePresetId, setActivePresetId] = useState(null);
    const [isPresetModified, setIsPresetModified] = useState(false);

    const handleChange = (setter) => (val) => {
        setter(val);
        if (activePresetId) {
            setIsPresetModified(true);
        }
        setActiveTroubleshoots([]);
        setTroubleshootHistory({});
        setOptimizedPrompts({ NanoBanana: null, ChatGPT: null, Midjourney: null });
    };

    const analyzeReferenceImage = async (dataUrl) => {
        setIsAnalyzingRef(true);
        setToastMsg("🔍 레퍼런스 이미지의 장르와 디테일을 분석 중입니다...");

        try {
            const [prefix, base64Data] = dataUrl.split(',');
            const mimeType = prefix.match(/:(.*?);/)[1];

            const apiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

            const prompt = `You are an expert game UI and pop-art designer. Analyze this logo image's typography, materials, depth, and effects.
          CRITICAL INSTRUCTION 1: Write a highly detailed English prompt phrase describing the OVERALL GENRE (e.g., 'dark sci-fi cyberpunk', 'glitch art', 'cute pastel pop'), the EXACT material of the text face (e.g., 'bright polished silver chrome text face'), the color and style of the 3D extrusion/sides (e.g., 'thick deep black sides with glowing fiery orange edges'), and any specific lighting or FX.
          CRITICAL INSTRUCTION 2: Does the typography have stylistic distortion, like glitching, sliced letters, or chromatic aberration? Output "Relaxed" for shapeFidelity if it does, otherwise "Strict".
          CRITICAL INSTRUCTION 3: Pay close attention to the uniformity and bevels of the shapes.
          - If the text has irregular, hand-carved, asymmetrical bevels (like rock or wood), output "OrganicBorder" and "OrganicBevel".
          - If the text has sharp, precision-cut metallic angles like diamond or cinematic movie logos (e.g., Wakanda Forever), output "FacetedBevel" for depthStyle and describe the "sharp chiseled metallic bevels" in the extracted_prompt.
          CRITICAL INSTRUCTION 4 (MULTI-PART TYPOGRAPHY): If the text is split into multiple lines with DIFFERENT materials or colors (e.g., top word is green dripping slime, bottom word is chunky purple block), EXPLICITLY state this split in the extracted_prompt (e.g., 'Two-part typography: top text is dripping toxic green slime, bottom text is purple stone block').
          Respond STRICTLY in JSON format with exactly these keys:
          {
            "shapeFeel": "Original" | "SoftRounded" | "Balloon" | "ClayLike",
            "shapeFidelity": "Strict" | "Relaxed",
            "outlineStyle": "None" | "CleanStroke" | "ThickSticker" | "DoubleOutline" | "SoftShadowOutline" | "OrganicBorder",
            "depthStyle": "Flat2D" | "SoftShadow" | "StickerLift" | "Puffy25D" | "LayeredPaper" | "Chunky3D" | "OrganicBevel" | "FacetedBevel",
            "fxStyle": "None" | "Sparkle" | "Confetti" | "Bubble" | "StarPop" | "HeartPop" | "MagicDust" | "Glitch" | "SlimeDrips",
            "extracted_prompt": "An English phrase strictly describing the overall genre/vibe, the face material(s), and the color/lighting of the 3D extrusion side walls. Detail multi-part colors if necessary. DO NOT describe the background.",
            "intent_ko": "A 1-2 sentence description in Korean"
          }`;

            const payload = {
                contents: [{
                    role: "user",
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType, data: base64Data } }
                    ]
                }],
                generationConfig: { responseMimeType: "application/json" }
            };

            const response = await fetchWithRetry(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

            if (text) {
                const parsed = parseJSON(text);
                if (parsed) {
                    setDirectorPersona("AutoRef");
                    setBaseStyle("AutoRef");
                    setColorPalette("AutoRef");
                    setEditBaseStyle("AutoRef");
                    setEditColorPalette("AutoRef");

                    if (parsed.shapeFeel) setShapeFeel(parsed.shapeFeel);
                    if (parsed.shapeFidelity) setShapeFidelity(parsed.shapeFidelity);
                    if (parsed.outlineStyle) {
                        setOutlineStyle(parsed.outlineStyle);
                        setEditOutlineStyle(parsed.outlineStyle);
                    }
                    if (parsed.depthStyle) setDepthStyle(parsed.depthStyle);
                    if (parsed.fxStyle) {
                        setFxStyle(parsed.fxStyle);
                        setEditFxStyle(parsed.fxStyle);
                    }
                    if (parsed.intent_ko) setUserIntent(parsed.intent_ko);
                    if (parsed.extracted_prompt) setExtractedRefDetails(parsed.extracted_prompt);

                    setActivePresetId(null);

                    if (parsed.depthStyle === "FacetedBevel") {
                        setToastMsg("💎 정밀 세공 감지! 다이아몬드처럼 날카롭게 깎인 시네마틱 입체를 복사합니다.");
                    } else if (parsed.shapeFidelity === "Relaxed") {
                        setToastMsg("💥 실무용 글리치/슬라임(Relaxed) 모드 활성화! 형태는 지키되 표면 효과를 적용합니다.");
                    } else {
                        setToastMsg("✨ 무드 완벽 동기화! 배경 노이즈를 제거하고 텍스트 디테일만 복사했습니다.");
                    }
                    setTimeout(() => setToastMsg(null), 3500);
                }
            }
        } catch (error) {
            console.error("Analysis Error:", error);
            setToastMsg("❌ 이미지 분석에 실패했습니다.");
            setTimeout(() => setToastMsg(null), 3000);
        } finally {
            setIsAnalyzingRef(false);
        }
    };

    const handleRefImageUpload = (file) => {
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = async () => {
            const dataUrl = reader.result;
            setRefImage(dataUrl);
            await analyzeReferenceImage(dataUrl);
        };
        reader.readAsDataURL(file);
    };

    const handleOptimizePrompt = async () => {
        if (!currentIR) return;
        setIsOptimizing(true);

        try {
            const apiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

            const targetPrompt = compiledOutputs[aiModel];
            const currentIntentText = currentView === 'editor' ? userIntent : editIntent;

            const systemPrompt = `You are a world-class AI Prompt Engineer.
Your task is to optimize the given base prompt for a typography graphic.
CRITICAL RULES:
1. If the prompt contains extracted details from a reference image (e.g., "[Reference Style Override Active]"), YOU MUST STRICTLY PRESERVE THOSE DETAILS. Do NOT force the style to be "casual" or "cute" if the reference is epic, metallic, sci-fi, or dark. Enhance the reference's specific vibe instead.
2. If it is purely a "casual pop" prompt without a reference, add powerful negative prompts against gritty textures, rust, horror, and cinematic darkness.
3. ALWAYS enforce a clean, isolated background without any messy details, noise, or clutter to make it easy to extract (mask).

Maintain the model's syntax (e.g., tags and Negative prompt for NanoBanana).
Output JSON with exactly two keys:
"en": The heavily optimized prompt string in English.
"ko": A short Korean explanation of what you optimized.`;

            const payload = {
                contents: [{ role: "user", parts: [{ text: `Model Type: ${aiModel}\nOriginal Custom Intent: ${currentIntentText || "None"}\nBase Prompt to optimize:\n${targetPrompt}` }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
                generationConfig: { responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { en: { type: "STRING" }, ko: { type: "STRING" } }, required: ["en", "ko"] } }
            };

            const result = await fetchWithRetry(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (text) {
                const parsed = parseJSON(text);
                if (parsed && parsed.en) {
                    setOptimizedPrompts(prev => ({ ...prev, [aiModel]: parsed.en }));
                    setToastMsg(`✨ 최적화 완료: ${parsed.ko.substring(0, 30)}...`);
                    setTimeout(() => setToastMsg(null), 4000);
                }
            }
        } catch (err) {
            console.error(err);
            setToastMsg("❌ 최적화 중 오류가 발생했습니다.");
            setTimeout(() => setToastMsg(null), 3000);
        } finally {
            setIsOptimizing(false);
        }
    };

    const handleExpandIntent = async () => {
        const currentIntentText = currentView === 'editor' ? userIntent : editIntent;
        if (!currentIntentText) {
            setToastMsg("⚠️ 확장할 키워드나 아이디어를 먼저 입력해주세요.");
            setTimeout(() => setToastMsg(null), 3000);
            return;
        }
        setIsExpandingIntent(true);
        try {
            const apiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

            let systemPrompt = `당신은 아트 디렉터입니다. 사용자의 짧은 키워드를 시각적 묘사로 구체화하세요. 3문장 이내(한국어)로 작성하세요.`;

            const payload = { contents: [{ role: "user", parts: [{ text: `Expand this concept in Korean: "${currentIntentText}"` }] }], systemInstruction: { parts: [{ text: systemPrompt }] } };
            const result = await fetchWithRetry(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (text) currentView === 'editor' ? setUserIntent(text.trim()) : setEditIntent(text.trim());
        } catch (err) {
            setToastMsg("❌ 통신에 실패했습니다.");
            setTimeout(() => setToastMsg(null), 3000);
        } finally {
            setIsExpandingIntent(false);
        }
    };

    const openChatModal = () => {
        const currentIntentText = currentView === 'editor' ? userIntent : editIntent;
        setTempIntent(currentIntentText);
        setChatMessages([{ role: 'model', text: currentIntentText ? `현재 의도: "${currentIntentText}"\n어떤 부분을 더 캐주얼하거나 팝하게 바꾸고 싶으신가요? (예: '색감을 더 쨍하게 해줘')` : "어떤 느낌을 원하시는지 자유롭게 말씀해 주세요!" }]);
        setIsChatModalOpen(true);
    };

    const handleSendChatMessage = async () => {
        if (!chatInput.trim()) return;
        const newMessages = [...chatMessages, { role: 'user', text: chatInput }];
        setChatMessages(newMessages);
        setChatInput("");
        setIsChatting(true);

        try {
            const apiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

            const systemPrompt = `당신은 아트 디렉터입니다. 사용자의 피드백을 반영해 텍스트의 재질이나 효과를 보완하세요. 형태 변형 금지.
          반드시 JSON 형식으로 응답: { "message": "친절한 응답", "updated_intent": "수정된 최종 3문장 이내 한글 묘사" }`;

            const payload = {
                contents: newMessages.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] })),
                systemInstruction: { parts: [{ text: systemPrompt }] },
                generationConfig: { responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { message: { type: "STRING" }, updated_intent: { type: "STRING" } }, required: ["message", "updated_intent"] } }
            };

            const result = await fetchWithRetry(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (text) {
                const parsed = parseJSON(text);
                if (parsed && parsed.message && parsed.updated_intent) {
                    setChatMessages([...newMessages, { role: 'model', text: parsed.message }]);
                    setTempIntent(parsed.updated_intent);
                }
            }
        } catch (err) {
            setChatMessages([...newMessages, { role: 'model', text: "오류가 발생했습니다." }]);
        } finally { setIsChatting(false); }
    };

    const applyChatIntent = () => { currentView === 'editor' ? setUserIntent(tempIntent) : setEditIntent(tempIntent); setIsChatModalOpen(false); };

    useEffect(() => {
        const stateObj = {
            currentView, directorPersona, typographyScale, shapeFeel, shapeFidelity, baseStyle, colorPalette, outlineStyle, depthStyle, fxStyle, background, userIntent, vfxPassMode,
            hasRefImage: !!refImage, extractedRefDetails,
            editImage, editBudget, activeEditIntents, editBg, editIntent, editBaseStyle, editColorPalette, editOutlineStyle, editFxStyle, editVfxPassMode
        };

        if (currentView === "editor") {
            const ir = generateIR(stateObj);
            setCurrentIR(ir);
            setCompiledOutputs({ NanoBanana: compileNanoBanana(ir, stateObj), ChatGPT: compileChatGPT(ir, stateObj), Midjourney: compileMidjourney(ir, stateObj) });
        } else if (currentView === "edit") {
            const ir = generateEditIR(stateObj);
            setCurrentIR(ir);
            setCompiledOutputs({
                NanoBanana: !editImage ? "Target 이미지를 업로드해주세요." : compileEditNanoBanana(ir, stateObj),
                ChatGPT: !editImage ? "Target 이미지를 업로드해주세요." : compileEditChatGPT(ir),
                Midjourney: !editImage ? "Target 이미지를 업로드해주세요." : compileEditMidjourney(ir, stateObj)
            });
        }

        setAuditIssues(performLogicAudit(stateObj));
        setQualityScores(calculateQualityScore(stateObj));
        setPromptBudget(calculatePromptBudget(stateObj));

    }, [directorPersona, typographyScale, shapeFeel, shapeFidelity, baseStyle, colorPalette, outlineStyle, depthStyle, fxStyle, background, userIntent, extractedRefDetails, vfxPassMode, currentView, editImage, editBudget, activeEditIntents, editBg, editIntent, editBaseStyle, editColorPalette, editOutlineStyle, editFxStyle, editVfxPassMode]);

    const copyToClipboard = () => {
        const text = optimizedPrompts[aiModel] || compiledOutputs[aiModel];
        if (!text) return;
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try { document.execCommand('copy'); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); } catch (err) { }
        document.body.removeChild(textArea);
    };

    const handleApplyPreset = (preset) => {
        if (!preset) return;

        setRefImage(null);
        setExtractedRefDetails("");

        if (preset.settings.directorPersona) setDirectorPersona(preset.settings.directorPersona);
        if (preset.settings.shapeFeel) setShapeFeel(preset.settings.shapeFeel);
        if (preset.settings.shapeFidelity) setShapeFidelity(preset.settings.shapeFidelity);
        if (preset.settings.baseStyle) setBaseStyle(preset.settings.baseStyle);
        if (preset.settings.colorPalette) setColorPalette(preset.settings.colorPalette);
        if (preset.settings.outlineStyle) setOutlineStyle(preset.settings.outlineStyle);
        if (preset.settings.depthStyle) setDepthStyle(preset.settings.depthStyle);
        if (preset.settings.fxStyle) setFxStyle(preset.settings.fxStyle);
        if (preset.settings.background) setBackground(preset.settings.background);
        if (preset.settings.userIntent !== undefined) setUserIntent(preset.settings.userIntent);

        setActivePresetId(preset.id); setIsPresetModified(false);
        setActiveTroubleshoots([]); setTroubleshootHistory({});
        setOptimizedPrompts({ NanoBanana: null, ChatGPT: null, Midjourney: null });

        setToastMsg(`✨ [${preset.label}] 스타일 적용됨`); setTimeout(() => setToastMsg(null), 3000);
    };

    const stateSetters = {
        directorPersona: setDirectorPersona,
        shapeFeel: setShapeFeel,
        shapeFidelity: setShapeFidelity,
        baseStyle: setBaseStyle,
        colorPalette: setColorPalette,
        outlineStyle: setOutlineStyle,
        depthStyle: setDepthStyle,
        fxStyle: setFxStyle,
        background: setBackground,
        userIntent: setUserIntent,
        typographyScale: setTypographyScale,
        vfxPassMode: setVfxPassMode,
        editVfxPassMode: setEditVfxPassMode,
        editBudget: setEditBudget,
        editBaseStyle: setEditBaseStyle,
        editColorPalette: setEditColorPalette,
        editOutlineStyle: setEditOutlineStyle,
        editFxStyle: setEditFxStyle,
        editBg: setEditBg,
        editIntent: setEditIntent,
        activeEditIntents: setActiveEditIntents
    };
    const currentStateVals = { directorPersona, shapeFeel, shapeFidelity, baseStyle, colorPalette, outlineStyle, depthStyle, fxStyle, background, userIntent, typographyScale, vfxPassMode, editVfxPassMode, editBudget, editBaseStyle, editColorPalette, editOutlineStyle, editFxStyle, editBg, editIntent, activeEditIntents };

    const applyAction = (opt, isTroubleshoot = false) => {
        if (!opt || !opt.action) return;
        setOptimizedPrompts({ NanoBanana: null, ChatGPT: null, Midjourney: null });

        if (isTroubleshoot && opt.id && activeTroubleshoots.includes(opt.id)) {
            const historyToRestore = troubleshootHistory[opt.id];
            if (historyToRestore) {
                Object.keys(historyToRestore).forEach(key => {
                    const setter = stateSetters[key];
                    if (setter && typeof setter === 'function') {
                        setter(historyToRestore[key]);
                    }
                });
            }
            setActiveTroubleshoots(prev => prev.filter(id => id !== opt.id));
            if (opt.label) { setToastMsg(`↩️ '${opt.label.split(' ').slice(1).join(' ')}' 조치 해제됨`); setTimeout(() => setToastMsg(null), 3000); }
            return;
        }

        const action = opt.action;
        if (isTroubleshoot && opt.id) {
            const historyToSave = {};
            Object.keys(action).forEach(key => {
                if (currentStateVals[key] !== undefined) {
                    historyToSave[key] = currentStateVals[key];
                }
            });
            setTroubleshootHistory(prev => ({ ...prev, [opt.id]: historyToSave }));
            setActiveTroubleshoots(prev => [...prev, opt.id]);
        }

        Object.keys(action).forEach(key => {
            const setter = stateSetters[key];
            if (setter && typeof setter === 'function') {
                setter(action[key]);
            }
        });

        if (activePresetId) setIsPresetModified(true);
        if (opt.label) { setToastMsg(`✅ '${opt.label.split(' ').slice(1).join(' ')}' 조치 반영됨`); setTimeout(() => setToastMsg(null), 3000); }
    };

    return {
        // view
        currentView, setCurrentView,
        // creation state + setters
        directorPersona, setDirectorPersona,
        typographyScale, setTypographyScale,
        shapeFeel, setShapeFeel,
        shapeFidelity, setShapeFidelity,
        baseStyle, setBaseStyle,
        colorPalette, setColorPalette,
        outlineStyle, setOutlineStyle,
        depthStyle, setDepthStyle,
        fxStyle, setFxStyle,
        background, setBackground,
        userIntent, setUserIntent,
        vfxPassMode, setVfxPassMode,
        // ref image
        refImage, setRefImage,
        isDraggingRef, setIsDraggingRef,
        isAnalyzingRef, setIsAnalyzingRef,
        extractedRefDetails, setExtractedRefDetails,
        // ai model
        aiModel, setAiModel,
        // edit state
        editImage, setEditImage,
        editBudget, setEditBudget,
        activeEditIntents, setActiveEditIntents,
        editBaseStyle, setEditBaseStyle,
        editColorPalette, setEditColorPalette,
        editOutlineStyle, setEditOutlineStyle,
        editFxStyle, setEditFxStyle,
        editBg, setEditBg,
        editIntent, setEditIntent,
        editVfxPassMode, setEditVfxPassMode,
        isDraggingEdit, setIsDraggingEdit,
        // output
        currentIR, compiledOutputs, optimizedPrompts,
        isOptimizing,
        auditIssues, qualityScores, promptBudget,
        isCopied, toastMsg,
        // troubleshoot
        activeTroubleshoots, troubleshootHistory,
        // chat / intent expand
        isExpandingIntent, isChatModalOpen, setIsChatModalOpen,
        chatMessages, chatInput, setChatInput,
        isChatting, tempIntent, chatScrollRef,
        // presets
        activePresetGroup, setActivePresetGroup,
        activePresetId, isPresetModified,
        // handlers
        handleChange,
        handleRefImageUpload,
        handleOptimizePrompt,
        handleExpandIntent,
        openChatModal,
        handleSendChatMessage,
        applyChatIntent,
        copyToClipboard,
        handleApplyPreset,
        applyAction,
    };
}
