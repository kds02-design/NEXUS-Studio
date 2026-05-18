import { useEffect, useRef, useState } from 'react';
import { useGlobal } from '../../context/GlobalContext';
import { useMotionPrompt } from './hooks/useMotionPrompt';
import { usePresets } from './hooks/usePresets';
import {
  apiKey,
  analyzeRenderPayloadForMotion,
  analyzeImageAndNote,
  analyzeResultVideoFrames,
  extractVideoFrames,
} from './services/gemini';
import {
  LOOP_SURFACE_FX, LOOP_EDGE_FX, LOOP_AMBIENT_FX, FLOW_STYLES, INTRO_STYLES,
  MOTION_DYNAMICS, INTENSITY_LEVELS, TIME_DURATION,
} from './constants/presets';
import MatrixSidebar from './components/MatrixSidebar';
import MatrixResultPanel, { AnalysisModal } from './components/MatrixResultPanel';

function App() {
  const motion = useMotionPrompt();
  const presets = usePresets({ setLayers: motion.setLayers, setTargetMaterial: motion.setTargetMaterial, showToast });

  const [activeTab, setActiveTab] = useState('generate');
  const { payload, clearPayload } = useGlobal();
  const [incomingFromRender, setIncomingFromRender] = useState(null);
  const [arcRecommended, setArcRecommended] = useState(null);
  const [isArcAnalyzing, setIsArcAnalyzing] = useState(false);
  const consumedPayloadRef = useRef(null);

  const [image, setImage] = useState(null);
  const [isImageDragging, setIsImageDragging] = useState(false);
  const [directorNote, setDirectorNote] = useState('');
  const [aiInterpretation, setAiInterpretation] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [baseValidatePrompt, setBaseValidatePrompt] = useState('');
  const [evalChecks, setEvalChecks] = useState({ cameraMoved: false, shapeMutated: false, loopBroken: false, particlesEscaped: false, alphaDirty: false });
  const [aiDetectedErrors, setAiDetectedErrors] = useState(null);
  const [resultVideo, setResultVideo] = useState(null);
  const [analyzedFrames, setAnalyzedFrames] = useState([]);
  const [isResultAnalyzing, setIsResultAnalyzing] = useState(false);
  const [isResultDragging, setIsResultDragging] = useState(false);
  const resultVideoRef = useRef(null);
  const [analysisModal, setAnalysisModal] = useState({ isOpen: false, results: null });
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef(null);
  // Compositing/QA state
  const [qaVideoSrc, setQaVideoSrc] = useState(null);
  const [qaVideoInfo, setQaVideoInfo] = useState({ width: 0, height: 0 });
  const [qaIsPlaying, setQaIsPlaying] = useState(false);
  const [qaIsLooping, setQaIsLooping] = useState(true);
  const [qaCurrentTime, setQaCurrentTime] = useState(0);
  const [qaDuration, setQaDuration] = useState(0);
  const [qaPlaybackRate, setQaPlaybackRate] = useState(1);
  const [qaBgType, setQaBgType] = useState('checker-dark');
  const [qaBgColor, setQaBgColor] = useState('#00FF00');
  const [qaBgImageSrc, setQaBgImageSrc] = useState(null);
  const [qaBlendMode, setQaBlendMode] = useState('screen');
  const [qaSettings, setQaSettings] = useState({ scale: 100, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [qaDragActiveVideo, setQaDragActiveVideo] = useState(false);
  const qaVideoRef = useRef(null);

  function showToast(msg) {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 3000);
  }

  // RenderMatrix payload → Gemini motion recommendation
  useEffect(() => {
    if (!payload || payload.target !== 'motion-metrics') return;
    if (!payload.timestamp || consumedPayloadRef.current === payload.timestamp) return;
    consumedPayloadRef.current = payload.timestamp;

    const text = payload.prompt?.text || '';
    const tags = Array.isArray(payload.prompt?.tags) ? payload.prompt.tags : [];
    const style = payload.prompt?.style || '';
    const source = payload.source || 'unknown';
    setIncomingFromRender({ source, text, tags, style, status: 'analyzing' });
    try { clearPayload(); } catch {}
    if (!text || !apiKey) { setIncomingFromRender((s) => (s ? { ...s, status: 'no-text' } : null)); return; }

    (async () => {
      setIsArcAnalyzing(true);
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(new Error('Gemini timeout 30s')), 30000);
      try {
        const rec = await analyzeRenderPayloadForMotion({ text, style, tags }, { signal: ctrl.signal });
        clearTimeout(t);
        setArcRecommended(rec);
        setIncomingFromRender((s) => (s ? { ...s, status: 'done', summary: rec.summary } : null));
      } catch (e) {
        clearTimeout(t);
        console.error('[MotionMatrix] 추천 분석 실패', e);
        setIncomingFromRender((s) => (s ? { ...s, status: 'failed', errorMessage: e.message } : null));
      } finally { setIsArcAnalyzing(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload?.timestamp, payload?.target]);

  const handleCopy = (text) => {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.top = '-9999px'; ta.style.left = '-9999px';
      document.body.appendChild(ta); ta.focus(); ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      showToast(ok ? '✅ 클립보드에 복사되었습니다!' : '❌ 복사에 실패했습니다. 수동으로 복사해주세요.');
    } catch { showToast('❌ 복사 중 오류가 발생했습니다.'); }
  };

  const handleReset = () => {
    motion.setLayers({ surface: 'none', edge: 'none', ambient: 'none', intensity: 'subtle', duration: '5s', flow: 'contour_trace', intro: 'fade_in', dynamics: 'smooth' });
    setImage(null); setResultVideo(null); setAnalyzedFrames([]);
    motion.setSurfaceOptions(LOOP_SURFACE_FX); motion.setEdgeOptions(LOOP_EDGE_FX); motion.setAmbientOptions(LOOP_AMBIENT_FX);
    setEvalChecks({ cameraMoved: false, shapeMutated: false, loopBroken: false, particlesEscaped: false, alphaDirty: false });
    setAiDetectedErrors(null); motion.setTargetMaterial('ice'); motion.setExportMode('production'); motion.setAnimationMode('loop'); motion.setVfxTarget('all'); motion.setTargetModel('universal');
    setImportText(''); setIsImportOpen(false); setBaseValidatePrompt('');
    setDirectorNote(''); setAiInterpretation(''); motion.setIsOptimized(true);
    setQaVideoSrc(null); setQaBgImageSrc(null); setQaBgType('checker-dark'); setQaBlendMode('screen');
    setQaSettings({ scale: 100, x: 0, y: 0 });
    showToast('초기화되었습니다.');
  };

  const handleImageChange = (file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setImage(e.target.result); reader.readAsDataURL(file);
      showToast('이미지가 로드되었습니다. AI 연출 해석을 실행해보세요.');
    } else if (file) showToast('❌ 이미지 파일만 업로드 가능합니다.');
  };

  const handleImportPrompt = () => {
    if (!importText.trim()) return showToast('프롬프트를 입력해주세요.');
    const newLayers = { ...motion.layers };
    const sMatch = motion.surfaceOptions.find((o) => importText.includes(o.en));
    if (sMatch) newLayers.surface = sMatch.id;
    const eMatch = motion.edgeOptions.find((o) => importText.includes(o.en));
    if (eMatch) newLayers.edge = eMatch.id;
    const aMatch = motion.ambientOptions.find((o) => importText.includes(o.en));
    if (aMatch) newLayers.ambient = aMatch.id;
    const fMatch = FLOW_STYLES.find((o) => importText.includes(o.loop_en) || importText.includes(o.trans_en));
    if (fMatch) newLayers.flow = fMatch.id;
    const iMatch = INTRO_STYLES.find((o) => importText.includes(o.en));
    if (iMatch) newLayers.intro = iMatch.id;
    const dynMatch = MOTION_DYNAMICS.find((o) => importText.includes(o.en));
    if (dynMatch) newLayers.dynamics = dynMatch.id;
    const intMatch = INTENSITY_LEVELS.find((o) => importText.includes(o.en) || importText.includes(`(${o.en})`));
    if (intMatch) newLayers.intensity = intMatch.id;
    const durMatch = TIME_DURATION.find((o) => importText.includes(`${o.id} loop`) || importText.includes(`End (${o.id})`));
    if (durMatch) newLayers.duration = durMatch.id;
    motion.setLayers(newLayers); presets.setActivePreset(''); setIsImportOpen(false); setImportText('');
    showToast('✅ 기존 설정이 성공적으로 복원되었습니다.');
  };

  const handleAiAnalysis = async (isSurpriseMode = false) => {
    if (!image && !directorNote.trim() && !isSurpriseMode) return showToast('이미지를 업로드하거나 연출 노트를 작성해주세요.');
    setIsAnalyzing(true);
    showToast(isSurpriseMode ? '🎲 마스터 디렉터가 이미지를 분석하여 최적의 세팅을 도출 중입니다...' : 'AI Director가 연출 의도를 분석 중입니다...');
    try {
      const result = await analyzeImageAndNote({
        animationMode: motion.animationMode, image, directorNote, isSurpriseMode,
        surfaceOptions: motion.surfaceOptions, edgeOptions: motion.edgeOptions, ambientOptions: motion.ambientOptions,
      });
      const newLayers = { ...motion.layers };
      const processLayer = (layerName, currentOptions, setOptions, resultValue) => {
        if (typeof resultValue === 'string' && currentOptions.some((o) => o.id === resultValue)) newLayers[layerName] = resultValue;
        else if (resultValue && typeof resultValue === 'object' && resultValue.id && resultValue.label && resultValue.en) {
          setOptions((prev) => (prev.some((o) => o.id === resultValue.id) ? prev : [...prev, resultValue]));
          newLayers[layerName] = resultValue.id;
        }
      };
      processLayer('surface', motion.surfaceOptions, motion.setSurfaceOptions, result.surface);
      processLayer('edge', motion.edgeOptions, motion.setEdgeOptions, result.edge);
      processLayer('ambient', motion.ambientOptions, motion.setAmbientOptions, result.ambient);
      if (result.intensity) newLayers.intensity = result.intensity;
      if (motion.animationMode !== 'intro' && result.flow) newLayers.flow = result.flow;
      if (motion.animationMode === 'intro' && result.intro) newLayers.intro = result.intro;
      if (result.dynamics) newLayers.dynamics = result.dynamics;
      motion.setLayers(newLayers); presets.setActivePreset('');
      if (result.interpretation) setAiInterpretation(result.interpretation);
      showToast('✨ 마스터 AI 디렉팅이 완료되었습니다.');
    } catch (e) { showToast(`분석 중 오류가 발생했습니다: ${e.message}`); }
    finally { setIsAnalyzing(false); }
  };

  const handleResultVideoAnalysis = async (file) => {
    if (!file) return;
    setIsResultAnalyzing(true);
    const videoUrl = URL.createObjectURL(file);
    setResultVideo(videoUrl); setAnalyzedFrames([]); setAiDetectedErrors(null);
    showToast('영상을 정밀 분석 중입니다... (Chain-of-Thought AI)');
    try {
      const frames = await extractVideoFrames(videoUrl);
      setAnalyzedFrames(frames.map((f) => `data:image/jpeg;base64,${f}`));
      const analysisResult = await analyzeResultVideoFrames(frames);
      setAiDetectedErrors({
        cameraMoved: !!analysisResult.cameraMoved, shapeMutated: !!analysisResult.shapeMutated,
        loopBroken: !!analysisResult.loopBroken, particlesEscaped: !!analysisResult.particlesEscaped,
        alphaDirty: !!analysisResult.alphaDirty,
        cameraMovedReasoning: analysisResult.cameraMovedReasoning,
        shapeMutatedReasoning: analysisResult.shapeMutatedReasoning,
        loopBrokenReasoning: analysisResult.loopBrokenReasoning,
        particlesEscapedReasoning: analysisResult.particlesEscapedReasoning,
        alphaDirtyReasoning: analysisResult.alphaDirtyReasoning,
      });
      const errorCount = [analysisResult.cameraMoved, analysisResult.shapeMutated, analysisResult.loopBroken, analysisResult.particlesEscaped, analysisResult.alphaDirty].filter(Boolean).length;
      if (errorCount > 0) setAnalysisModal({ isOpen: true, results: analysisResult });
      else showToast('✅ AI 검수 완료: 오류가 발견되지 않은 완벽한 영상입니다.');
    } catch (err) { console.error(err); showToast('영상 분석 중 오류가 발생했습니다.'); }
    finally { setIsResultAnalyzing(false); }
  };

  const handleResultChange = (file) => {
    if (file && (file.type === 'video/mp4' || file.type === 'video/webm')) handleResultVideoAnalysis(file);
    else if (file) showToast('❌ 영상 파일(.mp4, .webm)만 업로드 가능합니다.');
  };

  // Compositing (QA) handlers
  const processQaVideoFile = (file) => {
    if (file && file.type.startsWith('video/')) {
      setQaVideoSrc(URL.createObjectURL(file)); setQaIsPlaying(true); setQaSettings({ scale: 100, x: 0, y: 0 });
    } else showToast('❌ 영상 파일만 업로드 가능합니다.');
  };
  const processQaBgImageFile = (file) => {
    if (file && file.type.startsWith('image/')) { setQaBgImageSrc(URL.createObjectURL(file)); setQaBgType('image'); }
    else showToast('❌ 이미지 파일만 업로드 가능합니다.');
  };
  const handleQaDropMain = (e) => {
    e.preventDefault(); e.stopPropagation(); setQaDragActiveVideo(false);
    const file = e.dataTransfer.files?.[0]; if (!file) return;
    if (file.type.startsWith('video/')) processQaVideoFile(file);
    else if (file.type.startsWith('image/')) processQaBgImageFile(file);
  };
  const toggleQaPlay = () => {
    if (qaVideoRef.current) {
      if (qaIsPlaying) qaVideoRef.current.pause(); else qaVideoRef.current.play();
      setQaIsPlaying(!qaIsPlaying);
    }
  };
  const handleQaTimeUpdate = () => { if (qaVideoRef.current) setQaCurrentTime(qaVideoRef.current.currentTime); };
  const handleQaLoadedMetadata = () => {
    if (qaVideoRef.current) {
      setQaDuration(qaVideoRef.current.duration);
      setQaVideoInfo({ width: qaVideoRef.current.videoWidth, height: qaVideoRef.current.videoHeight });
      qaVideoRef.current.playbackRate = qaPlaybackRate;
    }
  };
  const handleQaSeek = (e) => {
    const time = parseFloat(e.target.value);
    if (qaVideoRef.current) { qaVideoRef.current.currentTime = time; setQaCurrentTime(time); }
  };
  const handleQaSpeedChange = (e) => {
    const speed = parseFloat(e.target.value); setQaPlaybackRate(speed);
    if (qaVideoRef.current) qaVideoRef.current.playbackRate = speed;
  };
  const formatTime = (time) => {
    const min = Math.floor(time / 60); const sec = Math.floor(time % 60); const ms = Math.floor((time % 1) * 100);
    return `${min}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };
  const getCanvasBackgroundStyle = () => {
    if (qaBgType === 'color') return { backgroundColor: qaBgColor };
    if (qaBgType === 'image' && qaBgImageSrc) return { backgroundImage: `url(${qaBgImageSrc})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' };
    return {};
  };
  const handlePanStart = (e) => { setIsPanning(true); setPanStart({ x: e.clientX - qaSettings.x, y: e.clientY - qaSettings.y }); };
  const handlePanMove = (e) => { if (!isPanning) return; setQaSettings((prev) => ({ ...prev, x: e.clientX - panStart.x, y: e.clientY - panStart.y })); };
  const handlePanEnd = () => setIsPanning(false);

  const downloadBlackFrame = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1920; canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const link = document.createElement('a');
    link.download = 'kling_start_frame_black.png'; link.href = canvas.toDataURL('image/png'); link.click();
    showToast('✅ 시작용 1080p 블랙 프레임이 다운로드되었습니다.');
  };

  // Derived prompts
  let correctionsList = [];
  if (evalChecks.cameraMoved) correctionsList.push('[CAMERA OVERRIDE] FORCE 100% STATIC FRAMING. Zero zoom/dolly/drift. Fixed pixel dimensions and exact margins.');
  if (evalChecks.shapeMutated) correctionsList.push('Strict geometry lock. Zero melting/deformation. Preserve exact bounding box.');
  if (evalChecks.loopBroken && motion.animationMode === 'loop') correctionsList.push('Force identical first/last frames. Zero popping. The return to dormant affects only light, never scale.');
  if (evalChecks.particlesEscaped) correctionsList.push('Confine particles to text radius. No outward expansion. Dissolve before frame edges.');
  if (evalChecks.alphaDirty) correctionsList.push('Pure #000000 background only. Zero scenery/smoke/wide glow.');
  const correctionsText = correctionsList.length > 0 ? `\n\n[CRITICAL CORRECTIONS]\n${correctionsList.join('\n')}` : '';
  const validatedPromptResult = baseValidatePrompt.trim() ? `${baseValidatePrompt.trim()}${correctionsText}` : correctionsText.trim();
  const finalOutput = activeTab === 'generate' ? motion.activePrompt : validatedPromptResult;

  let combinedOutput = '';
  if (activeTab === 'generate') combinedOutput = `${motion.activePrompt}\n\nNegative prompt:\n${motion.activeNegPrompt}`;
  else if (activeTab === 'validate') {
    const hasNegative = baseValidatePrompt.toLowerCase().includes('negative prompt');
    combinedOutput = hasNegative ? validatedPromptResult : `${validatedPromptResult}\n\nNegative prompt:\n${motion.activeNegPrompt}`;
  }
  const promptLength = combinedOutput ? combinedOutput.length : 0;
  const isOverLimit = promptLength > motion.currentMaxLimit;

  // Sidebar/result props bag (single spread on each side)
  const sidebarProps = {
    activeTab, setActiveTab, onReset: handleReset,
    incomingFromRender, setIncomingFromRender, isArcAnalyzing, setArcRecommended, arcRecommended,
    // generate tab
    animationMode: motion.animationMode, setAnimationMode: motion.setAnimationMode,
    targetModel: motion.targetModel, setTargetModel: motion.setTargetModel,
    targetMaterial: motion.targetMaterial, handleTargetMaterialChange: presets.handleTargetMaterialChange,
    layers: motion.layers, setLayers: motion.setLayers,
    surfaceOptions: motion.surfaceOptions, edgeOptions: motion.edgeOptions, ambientOptions: motion.ambientOptions,
    exportMode: motion.exportMode, vfxTarget: motion.vfxTarget, setVfxTarget: motion.setVfxTarget,
    activePreset: presets.activePreset, setActivePreset: presets.setActivePreset, applyPreset: presets.applyPreset,
    isImportOpen, setIsImportOpen, importText, setImportText, onImport: handleImportPrompt,
    image, setImage, isImageDragging, setIsImageDragging, onImageChange: handleImageChange,
    directorNote, setDirectorNote, aiInterpretation, setAiInterpretation,
    isAnalyzing, onAnalyze: handleAiAnalysis,
    downloadBlackFrame,
    // validate tab
    resultVideo, analyzedFrames, isResultAnalyzing, isResultDragging, setIsResultDragging,
    onResultChange: handleResultChange, resultVideoRef,
    evalChecks, setEvalChecks, aiDetectedErrors,
    onClearValidate: () => { setEvalChecks({ cameraMoved: false, shapeMutated: false, loopBroken: false, particlesEscaped: false, alphaDirty: false }); setAiDetectedErrors(null); setResultVideo(null); setAnalyzedFrames([]); },
    // compositing tab
    qaVideoSrc, qaVideoInfo, qaDuration,
    qaDragActiveVideo, setQaDragActiveVideo, onQaDropMain: handleQaDropMain,
    onProcessQaVideoFile: processQaVideoFile, onProcessQaBgImageFile: processQaBgImageFile,
    qaBgType, setQaBgType, qaBgColor, setQaBgColor, qaBgImageSrc, qaBlendMode, setQaBlendMode, qaSettings, setQaSettings,
  };

  const resultProps = {
    activeTab,
    exportMode: motion.exportMode, setExportMode: motion.setExportMode,
    isOptimized: motion.isOptimized, setIsOptimized: motion.setIsOptimized,
    logs: motion.logs, currentMaxLimit: motion.currentMaxLimit,
    combinedOutput, finalOutput, promptLength, isOverLimit, handleCopy,
    baseValidatePrompt, setBaseValidatePrompt,
    // compositing canvas + header playback
    qaVideoSrc, qaVideoRef, qaIsPlaying, toggleQaPlay,
    qaIsLooping, setQaIsLooping, qaPlaybackRate, handleQaSpeedChange,
    qaCurrentTime, qaDuration, handleQaSeek, handleQaTimeUpdate, handleQaLoadedMetadata, formatTime,
    qaBgType, qaBlendMode, qaSettings, setQaSettings,
    qaDragActiveVideo, setQaDragActiveVideo, onQaDropMain: handleQaDropMain,
    getCanvasBackgroundStyle, isPanning, handlePanStart, handlePanMove, handlePanEnd,
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#0f1115] text-[#e3e3e3] p-5 overflow-hidden relative selection:bg-[#a8c7fa]/30" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Space+Grotesk:wght@700&display=swap');
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2b2d31; border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4b4d52; }
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-down { animation: fadeInDown 0.2s ease-out forwards; }
        .bg-checker-dark {
          background-image: linear-gradient(45deg, #181a1f 25%, transparent 25%), linear-gradient(-45deg, #181a1f 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #181a1f 75%), linear-gradient(-45deg, transparent 75%, #181a1f 75%);
          background-color: #0f1115; background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
        }
        .bg-checker-light {
          background-image: linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%);
          background-color: #eee; background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
        }
      `}</style>

      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#181a1f] text-[#e3e3e3] px-5 py-2.5 rounded-full shadow-2xl font-medium text-[11px] border border-[#2b2d31] transition-all duration-300 animate-fade-in-down flex items-center gap-2">
          {toastMsg}
        </div>
      )}

      <AnalysisModal analysisModal={analysisModal} setAnalysisModal={setAnalysisModal} setEvalChecks={setEvalChecks} animationMode={motion.animationMode} showToast={showToast} />

      <main className="flex-1 flex gap-5 h-full overflow-hidden">
        <MatrixSidebar {...sidebarProps} />
        <MatrixResultPanel {...resultProps} />
      </main>
    </div>
  );
}

export default App;
