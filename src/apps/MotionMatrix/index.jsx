import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { useGlobal } from '../../context/GlobalContext';
import { useAuth } from '../../context/AuthContext';
import { useUsageGate } from '../../components/UsageGate';
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
import { renderWithVeo, VEO_MODELS } from '../../lib/veoRender';
import { uploadBase64, uploadVideoFile } from '../../lib/storage';
import { db, appId } from '../../lib/firebase';
import { serializeForFirestore } from '../PromptArc/services/firebase';
import { compressPrompt } from '../../lib/promptCompressor';

// dataURL(data:video/mp4;base64,...) → File 로 변환 (Cloudinary 영상 업로드용).
function dataUrlToFile(dataUrl, filename = `motion_${Date.now()}.mp4`) {
  const [meta, base64] = dataUrl.split(',');
  const mime = meta.match(/data:([^;]+);/)?.[1] || 'video/mp4';
  const bin = atob(base64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

function App() {
  const motion = useMotionPrompt();
  const presets = usePresets({ setLayers: motion.setLayers, setTargetMaterial: motion.setTargetMaterial, showToast });

  const [activeTab, setActiveTab] = useState('generate');
  const { payload, clearPayload } = useGlobal();
  const { user, grade } = useAuth();
  const { ensureCanGenerate, modal: usageModal } = useUsageGate();
  const canRender = grade === 'pro' || grade === 'pro_plus' || grade === 'expert';

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

  // ─── Veo 렌더 상태 ───
  const [selectedVeoModel, setSelectedVeoModel] = useState(VEO_MODELS[0].id);
  const [rendering, setRendering] = useState(false);
  const [renderedVideo, setRenderedVideo] = useState(null); // { dataUrl, modelId, durationSeconds, aspectRatio }
  const [renderError, setRenderError] = useState(null);
  const [savingToArc, setSavingToArc] = useState(false);

  // ─── 프롬프트 압축 상태 ───
  // compressedOutput 이 있으면 표시 프롬프트로 우선 사용. layers/모드 등 옵션이 바뀌면 자동 초기화.
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressedOutput, setCompressedOutput] = useState(null);

  function showToast(msg) {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 3000);
  }

  // 외부 앱(RenderMatrix / PromptArc) → 레퍼런스 이미지 + 텍스트 자동 임포트 + 추천 분석 + AI Director 자동 실행.
  const [pendingPayloadAnalysis, setPendingPayloadAnalysis] = useState(false);

  useEffect(() => {
    if (!payload || payload.target !== 'motion-metrics') return;
    if (!payload.timestamp || consumedPayloadRef.current === payload.timestamp) return;
    consumedPayloadRef.current = payload.timestamp;

    const text = payload.prompt?.text || '';
    const tags = Array.isArray(payload.prompt?.tags) ? payload.prompt.tags : [];
    const style = payload.prompt?.style || '';
    const source = payload.source || 'unknown';
    const imgUrl = payload.image?.url || '';

    setIncomingFromRender({ source, text, tags, style, status: imgUrl ? 'fetching-image' : 'analyzing' });
    try { clearPayload(); } catch {}

    (async () => {
      let dataUrl = null;
      if (imgUrl) {
        try {
          if (imgUrl.startsWith('data:')) {
            dataUrl = imgUrl;
          } else {
            const res = await fetch(imgUrl, { mode: 'cors' });
            if (!res.ok) throw new Error(`이미지 fetch ${res.status}`);
            const blob = await res.blob();
            dataUrl = await new Promise((resolve, reject) => {
              const r = new FileReader();
              r.onloadend = () => resolve(String(r.result));
              r.onerror = reject;
              r.readAsDataURL(blob);
            });
          }
          setImage(dataUrl);
        } catch (e) {
          console.error('[MotionMatrix] payload 이미지 fetch 실패', e);
        }
      }
      if (text) setDirectorNote(text);

      if (text && apiKey) {
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
      } else {
        setIncomingFromRender((s) => (s ? { ...s, status: dataUrl ? 'image-only' : 'no-text' } : null));
      }

      if (dataUrl || text) setPendingPayloadAnalysis(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload?.timestamp, payload?.target]);

  useEffect(() => {
    if (!pendingPayloadAnalysis) return;
    if (!image && !directorNote.trim()) return;
    setPendingPayloadAnalysis(false);
    Promise.resolve().then(() => { try { handleAiAnalysis(false); } catch (e) { console.error('[MotionMatrix] 자동 분석 호출 실패', e); } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPayloadAnalysis, image, directorNote]);

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
    setRenderedVideo(null); setRenderError(null);
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

  // ─── Veo 렌더 + PromptArc 자동 저장 ───
  const saveVideoToPromptArc = useCallback(async (promptText, video, sourceImage) => {
    if (!user?.uid || !video?.dataUrl) return;
    setSavingToArc(true);
    try {
      // 영상 → Cloudinary (video 파일 업로드)
      const file = dataUrlToFile(video.dataUrl);
      const videoUrl = await uploadVideoFile(file);
      // 참조 이미지가 dataURL 이면 Cloudinary 로 함께 업로드 (있을 때만)
      let thumbUrl = null;
      if (sourceImage) {
        try { thumbUrl = await uploadBase64(sourceImage); } catch (e) { console.warn('[MotionMatrix] 참조 이미지 업로드 실패', e); }
      }
      const id = Math.random().toString(36).slice(2);
      const now = Date.now();
      const modelLabel = VEO_MODELS.find((m) => m.id === video.modelId)?.label || video.modelId || 'Veo';
      const title = `MotionMatrix · ${new Date(now).toLocaleString('ko-KR')}`;
      const record = {
        id,
        title,
        content: promptText || '',
        videos: [videoUrl],
        images: thumbUrl ? [thumbUrl] : [],
        thumbnail: thumbUrl || '',
        stepPrompts: [promptText || ''],
        stepLabels: ['MotionMatrix'],
        stepTags: [['MotionMatrix', 'Veo', modelLabel]],
        stepKeywords: [''],
        stepDescriptions: [''],
        tags: ['MotionMatrix', 'Veo', modelLabel],
        visibility: 'private',
        ownerUid: user.uid,
        authorName: user.displayName || user.email || '',
        likeCount: 0,
        relatedIds: [],
        type: 'video',
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'prompts', id), serializeForFirestore(record));
      showToast('✨ PromptArc 내 폴더에 저장됐어요');
      return id;
    } catch (e) {
      console.error('[MotionMatrix] save to PromptArc failed', e);
      showToast(`PromptArc 저장 실패: ${e.message || e.code}`);
    } finally {
      setSavingToArc(false);
    }
  }, [user]);

  const handleRender = useCallback(async (promptText) => {
    if (!promptText) return;
    if (!canRender) {
      setRenderError('Veo 영상 렌더는 Pro 등급 이상만 사용할 수 있습니다.');
      return;
    }
    if (!image) {
      const msg = '참조 이미지를 먼저 등록해주세요. ("기본 이미지" 영역)';
      setRenderError(msg);
      showToast(msg);
      return;
    }
    // 주간 크레딧 30c 차감 (video). 부족하면 LimitReachedModal 자동 노출.
    const canGen = await ensureCanGenerate?.('video');
    if (canGen === false) {
      setRenderError('이번 주 크레딧이 부족합니다. (영상 생성 30c 필요)');
      return;
    }
    setRendering(true);
    setRenderError(null);
    setRenderedVideo(null);
    try {
      const result = await renderWithVeo(promptText, selectedVeoModel, image, {
        durationSeconds: 8,
        aspectRatio: '16:9',
        onProgress: (p) => {
          if (p.status === 'polling' && p.elapsedMs && p.elapsedMs % 30_000 < 5_000) {
            showToast(`Veo 생성 중… ${Math.floor(p.elapsedMs / 1000)}s 경과`);
          }
        },
      });
      setRenderedVideo(result);
      if (user?.uid && result?.dataUrl) {
        saveVideoToPromptArc(promptText, result, image);
      }
    } catch (e) {
      console.error('[MotionMatrix] veo failed', e);
      setRenderError(e.message || String(e));
    } finally {
      setRendering(false);
    }
  }, [canRender, image, selectedVeoModel, user, saveVideoToPromptArc, ensureCanGenerate]);

  const handleDownloadRendered = useCallback(() => {
    if (!renderedVideo?.dataUrl) return;
    const a = document.createElement('a');
    a.href = renderedVideo.dataUrl;
    a.download = `motionmatrix_${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [renderedVideo]);

  const handleSaveToPromptArc = useCallback(async (promptText) => {
    if (!user?.uid) { showToast('로그인이 필요합니다'); return; }
    if (!renderedVideo?.dataUrl) return;
    if (savingToArc) return;
    await saveVideoToPromptArc(promptText, renderedVideo, image);
  }, [user, renderedVideo, savingToArc, image, saveVideoToPromptArc]);

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
  // 옵션이 바뀌면 (=> activePrompt 가 변하면) 이전 압축 결과 무효화.
  useEffect(() => { setCompressedOutput(null); }, [motion.activePrompt, motion.activeNegPrompt, activeTab]);

  // 최종 표시용 — 압축본이 있으면 우선, 없으면 자동 합성된 combinedOutput.
  const displayedOutput = (activeTab === 'generate' && compressedOutput) || combinedOutput;
  const promptLength = displayedOutput ? displayedOutput.length : 0;
  const isOverLimit = promptLength > motion.currentMaxLimit;
  const isCompressed = activeTab === 'generate' && !!compressedOutput;

  // ─── 프롬프트 압축 ─── PromptAudit 로직으로 충돌·중복 제거 + 짧게 정리.
  // Negative prompt 가드는 옵티마이저와 동일하게 원본에서 복원.
  const handleCompressPrompt = useCallback(async () => {
    if (activeTab !== 'generate') { showToast('생성 탭에서만 압축할 수 있어요'); return; }
    if (!combinedOutput) { showToast('압축할 프롬프트가 없습니다'); return; }
    setIsCompressing(true);
    try {
      const result = await compressPrompt(combinedOutput, 'motion-metrics');
      let finalText = result.improvedPrompt || combinedOutput;
      // Negative prompt 가드 — 누락되면 원본에서 복원.
      const negMarker = '\n\nNegative prompt:';
      if (combinedOutput.includes(negMarker) && !finalText.includes('Negative prompt:')) {
        const original = combinedOutput.split(negMarker)[1] || '';
        finalText = `${finalText.trim()}${negMarker}${original}`;
        console.warn('[MotionMatrix] compressor dropped Negative prompt — restored');
      }
      if (finalText.length < combinedOutput.length) {
        setCompressedOutput(finalText);
        const conflictCount = result.conflicts?.length || 0;
        const tail = conflictCount > 0 ? ` · 충돌 ${conflictCount}건 정리` : '';
        showToast(`✨ 압축 완료 — ${result.savedChars}자 감소 (${result.savedPct}%)${tail}`);
      } else {
        showToast('프롬프트가 이미 충분히 간결합니다');
      }
    } catch (e) {
      console.error('[MotionMatrix] compress failed', e);
      showToast(`❌ 압축 실패: ${e?.message || e}`);
    } finally {
      setIsCompressing(false);
    }
  }, [combinedOutput, activeTab]);

  const handleClearCompressed = useCallback(() => setCompressedOutput(null), []);

  const sidebarProps = {
    activeTab, setActiveTab, onReset: handleReset,
    incomingFromRender, setIncomingFromRender, isArcAnalyzing, setArcRecommended, arcRecommended,
    animationMode: motion.animationMode, setAnimationMode: motion.setAnimationMode,
    targetModel: motion.targetModel, setTargetModel: motion.setTargetModel,
    targetMaterial: motion.targetMaterial, handleTargetMaterialChange: presets.handleTargetMaterialChange,
    layers: motion.layers, setLayers: motion.setLayers,
    surfaceOptions: motion.surfaceOptions, edgeOptions: motion.edgeOptions, ambientOptions: motion.ambientOptions,
    exportMode: motion.exportMode, vfxTarget: motion.vfxTarget, setVfxTarget: motion.setVfxTarget,
    activePreset: presets.activePreset, setActivePreset: presets.setActivePreset, applyPreset: presets.applyPreset,
    activePresetGroup: presets.activePresetGroup, setActivePresetGroup: presets.setActivePresetGroup,
    activePresetId: presets.activePresetId, isPresetModified: presets.isPresetModified,
    onApplyPreset: presets.handleApplyPreset,
    auditIssues: motion.auditIssues, applyAuditFix: motion.applyAuditFix,
    isImportOpen, setIsImportOpen, importText, setImportText, onImport: handleImportPrompt,
    image, setImage, isImageDragging, setIsImageDragging, onImageChange: handleImageChange,
    directorNote, setDirectorNote, aiInterpretation, setAiInterpretation,
    isAnalyzing, onAnalyze: handleAiAnalysis,
    downloadBlackFrame,
    resultVideo, analyzedFrames, isResultAnalyzing, isResultDragging, setIsResultDragging,
    onResultChange: handleResultChange, resultVideoRef,
    evalChecks, setEvalChecks, aiDetectedErrors,
    onClearValidate: () => { setEvalChecks({ cameraMoved: false, shapeMutated: false, loopBroken: false, particlesEscaped: false, alphaDirty: false }); setAiDetectedErrors(null); setResultVideo(null); setAnalyzedFrames([]); },
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
    combinedOutput: displayedOutput, finalOutput, promptLength, isOverLimit, handleCopy,
    // 압축
    isCompressing, isCompressed, onCompress: handleCompressPrompt, onClearCompressed: handleClearCompressed,
    baseValidatePrompt, setBaseValidatePrompt,
    // 기본 이미지 (참조)
    image, setImage, onImageChange: handleImageChange,
    // Veo 렌더
    veoModels: VEO_MODELS,
    selectedVeoModel, setSelectedVeoModel,
    onRender: handleRender,
    rendering, renderedVideo, renderError,
    onDownloadRendered: handleDownloadRendered,
    onSaveToPromptArc: handleSaveToPromptArc,
    savingToArc,
    isLoggedIn: !!user?.uid,
    canRender, grade,
    // compositing
    qaVideoSrc, qaVideoRef, qaIsPlaying, toggleQaPlay,
    qaIsLooping, setQaIsLooping, qaPlaybackRate, handleQaSpeedChange,
    qaCurrentTime, qaDuration, handleQaSeek, handleQaTimeUpdate, handleQaLoadedMetadata, formatTime,
    qaBgType, qaBlendMode, qaSettings, setQaSettings,
    qaDragActiveVideo, setQaDragActiveVideo, onQaDropMain: handleQaDropMain,
    getCanvasBackgroundStyle, isPanning, handlePanStart, handlePanMove, handlePanEnd,
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 text-slate-900 dark:bg-[#09090B] dark:text-zinc-100 p-5 overflow-hidden relative selection:bg-[#FDCB6E]/30 font-sans">
      {usageModal}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Space+Grotesk:wght@700&display=swap');
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(161,161,170,0.2); border-radius: 4px; transition: background 0.2s; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(161,161,170,0.5); }
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
        <div className="fixed top-8 left-1/2 -translate-x-1/2 text-white px-6 py-3 rounded-full font-bold text-[12px] shadow-2xl z-[1000] flex items-center gap-2 animate-fade-in-down whitespace-nowrap border backdrop-blur-md bg-emerald-500/90 border-emerald-400/50 shadow-[0_10px_30px_rgba(16,185,129,0.3)]">
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
