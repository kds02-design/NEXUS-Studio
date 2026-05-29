import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Upload, Image as ImageIcon, Loader2, Sparkles, Settings, X, Bot, BrainCircuit,
  ChevronDown, Copy, Check, Edit3, Download, ZoomIn, MousePointer2,
  Layers, Send, Plus, Clock, Trash2, ClipboardCheck,
} from 'lucide-react';
import { collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { GEMINI_API_KEY } from '../../lib/gemini';
import {
  fetchActiveCriteria, getSeedCriteria, formatCriteriaList, CRITERIA_TYPES,
  weightsMap, resolveCriteriaType, getActiveRules, getSeedRules,
  fetchAnchors, addAnchor, removeAnchor, formatAnchorsForPrompt,
  fetchCalibration, buildAnchorFewShot, applyOffset,
} from '../../lib/evaluationCriteria';
import { prepareAnchorImages } from '../../lib/anchorImages';
import { db, appId } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useGlobal } from '../../context/GlobalContext';

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
    // ─── 2D 타이포 ───
    if (cat.includes('2d') && cat.includes('타이포')) {
        const map = {
            impression: '첫인상 / 시각 임팩트', concept: '콘셉트 표현력', layout: '구성/여백', typography: '자간/조판 정밀도',
            color: '색 조화', readability: '가독성', brand: '브랜드 톤 일치', flow: '시각 리듬',
            detail: '마감/디테일', conversion: '정렬/그리드 정확성'
        };
        return map[key.toLowerCase()] || key;
    }
    // ─── 렌더링 타이포 ───
    if (cat.includes('렌더링') && cat.includes('타이포')) {
        const map = {
            impression: '시네마틱 임팩트', concept: '콘셉트 일치도', layout: '입체감 (Volume)', typography: '실루엣 보존',
            color: '컬러 그레이딩', readability: '모서리/엣지 정밀도', brand: '재질 표현 (Material)', flow: '라이팅 (Lighting)',
            detail: '표면 디테일', conversion: '배경 분리 / 기술 완성도'
        };
        return map[key.toLowerCase()] || key;
    }
    // ─── 모션 타이포 ───
    if (cat.includes('모션') && cat.includes('타이포')) {
        const map = {
            impression: '모션 임팩트', concept: '콘셉트 표현', layout: '카메라 무빙', typography: '형태 안정성',
            color: '컬러 그레이딩', readability: '모션 중 가독성', brand: '모션 리듬', flow: '타이밍 (호흡)',
            detail: '기술 품질', conversion: '루프/이펙트 완성도'
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
  const { user } = useAuth();
  const { navigate } = useGlobal();
  const [history, setHistory] = useState([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);
  // 좌측 메뉴 — 평가중(현재 작업) / 평가완료(저장 목록 그리드). 'detail' = 메인 영역에 이미지+결과, 'list' = 그리드.
  const [viewMode, setViewMode] = useState('detail');
  const [isCriteriaHelpOpen, setIsCriteriaHelpOpen] = useState(false);
  const [, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [aspectRatio, setAspectRatio] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [resultData, setResultData] = useState(null);

  const [manualScoreAdj, setManualScoreAdj] = useState(0);
  // ── 새로고침 후 이미지/결과 유지 (localStorage) ──
  // mount 1회 복원 + 변경 시마다 저장.
  useEffect(() => {
    try {
      const pv = localStorage.getItem('designEval:previewUrl');
      if (pv) setPreviewUrl(pv);
      const ar = parseFloat(localStorage.getItem('designEval:aspectRatio'));
      if (Number.isFinite(ar) && ar > 0) setAspectRatio(ar);
      const rd = localStorage.getItem('designEval:resultData');
      if (rd) { try { setResultData(JSON.parse(rd)); } catch {} }
      const adj = parseInt(localStorage.getItem('designEval:manualScoreAdj'), 10);
      if (Number.isFinite(adj) && adj >= -3 && adj <= 3) setManualScoreAdj(adj);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { try { if (previewUrl) localStorage.setItem('designEval:previewUrl', previewUrl); else localStorage.removeItem('designEval:previewUrl'); } catch {} }, [previewUrl]);
  useEffect(() => { try { localStorage.setItem('designEval:aspectRatio', String(aspectRatio)); } catch {} }, [aspectRatio]);
  useEffect(() => { try { if (resultData) localStorage.setItem('designEval:resultData', JSON.stringify(resultData)); else localStorage.removeItem('designEval:resultData'); } catch {} }, [resultData]);
  useEffect(() => { try { localStorage.setItem('designEval:manualScoreAdj', String(manualScoreAdj)); } catch {} }, [manualScoreAdj]);
  const [userComment, setUserComment] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('auto');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('api');
  const [notification, setNotification] = useState(null);
  const [isCopied, setIsCopied] = useState(false);
  const fileInputRef = useRef(null);

  // ── 컬럼 너비 조절 (드래그) ──
  // leftPct: lg 이상에서 좌측(이미지) 컬럼의 % 너비. localStorage 에 보존.
  // 25 ~ 75 사이로 clamp 해서 한쪽이 사라지지 않도록.
  const [leftPct, setLeftPct] = useState(() => {
    try { const v = parseFloat(localStorage.getItem('designEval:leftPct')); return Number.isFinite(v) && v >= 25 && v <= 75 ? v : 50; }
    catch { return 50; }
  });
  const [isLg, setIsLg] = useState(false);
  const splitContainerRef = useRef(null);
  const isResizingRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsLg(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  useEffect(() => {
    const onMove = (e) => {
      if (!isResizingRef.current || !splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.max(25, Math.min(75, pct)));
    };
    const onUp = () => {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      try { localStorage.setItem('designEval:leftPct', String(leftPct)); } catch {}
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [leftPct]);
  const startResize = (e) => {
    if (!isLg) return;
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  // ── 평가 히스토리 — 로그인 사용자별 Firestore 컬렉션. ──
  // path: artifacts/{appId}/users/{uid}/evaluations/{evalId}
  // PromptArc favorites/folders 와 동일한 per-user 패턴.
  const evaluationsCol = useMemo(
    () => (user && db ? collection(db, "artifacts", appId, "users", user.uid, "evaluations") : null),
    [user]
  );
  // Mount 시 localStorage 캐시를 먼저 띄움 → Firestore 응답 오기 전까지 빈 화면 방지.
  // 캐시는 메타 only(image 제외)이므로 그리드의 image src 는 잠깐 placeholder 였다가 Firestore 응답 후 채워짐.
  useEffect(() => {
    try {
      const cached = localStorage.getItem('designEval:historyCache');
      if (cached) {
        const arr = JSON.parse(cached);
        if (Array.isArray(arr) && arr.length > 0) setHistory(arr);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!evaluationsCol) { /* 미로그인은 캐시 유지 */ return; }
    const unsub = onSnapshot(evaluationsCol,
      (snap) => {
        const arr = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const am = a.createdAt?.toMillis?.() || a.createdAt || 0;
            const bm = b.createdAt?.toMillis?.() || b.createdAt || 0;
            return bm - am;
          });
        // 진단 — image 보유 비율 콘솔 (이미지 안 뜸 보고 추적용).
        const withImage = arr.filter(x => typeof x.image === 'string' && x.image.length > 100).length;
        console.log(`[Evaluator] history loaded: ${arr.length}건 (image 포함 ${withImage}건)`);
        setHistory(arr);
      },
      (err) => console.warn("[Evaluator] history subscribe err", err)
    );
    return () => unsub();
  }, [evaluationsCol]);

  // history 가 바뀌면 캐시 갱신.
  // ★ 변경: image 필드는 캐시에 절대 저장하지 않음 (quota 회피 + 옛 quota-실패 캐시가 메타만 남아 영영 그대로 표시되는 버그 회피).
  //   이미지는 항상 Firestore 에서 받아 표시. 캐시는 "응답 대기 중 메타만" 용도.
  useEffect(() => {
    if (history.length === 0) return;
    const top = history.slice(0, 30).map(h => {
      const { image: _img, ...rest } = h;
      return {
        ...rest,
        createdAt: h.createdAt?.toMillis?.() || h.createdAt || 0,
      };
    });
    try { localStorage.setItem('designEval:historyCache', JSON.stringify(top)); }
    catch (e) { console.warn('[Evaluator] history cache write failed', e); }
  }, [history]);

  // 평가 결과를 히스토리에 저장. 호출부에서 setResultData 후 await 으로 호출.
  // image 압축 → Firestore 저장. 실패 시 alert 으로 사용자에게 알림(silent 방지).
  const saveEvaluationToHistory = async (result, image, category) => {
    if (!evaluationsCol) return; // 미로그인
    let compressed = image;
    try {
      // image 가 너무 크면 Firestore 1MB 제한에 걸리므로 압축.
      if (image && image.startsWith('data:')) {
        compressed = await compressImage(image, 480, 0.7);
      }
    } catch (e) {
      console.error('[Evaluator] image compress failed', e);
      compressed = image; // 압축 실패 시 원본으로 시도
    }
    // 안전장치 — 1MB 근접 시 한 번 더 작게 압축.
    if (typeof compressed === 'string' && compressed.length > 900_000) {
      console.warn(`[Evaluator] image still too large (${compressed.length}b), recompressing 320/0.6`);
      try { compressed = await compressImage(image, 320, 0.6); } catch {}
    }
    try {
      await addDoc(evaluationsCol, {
        title: result.title || '제목 없음',
        category: result.category || category || 'auto',
        tags: result.tags || [],
        scores: result.scores || {},
        finalScore: getFinalScore100(result, 0),
        image: compressed,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error('[Evaluator] save history failed', e);
      alert(`평가 저장 실패: ${e.message || e.code}\n\n이미지가 너무 크거나 권한 문제일 수 있습니다.`);
    }
  };

  // 히스토리 항목 클릭 → 평가 결과 복원.
  const loadHistoryItem = (item) => {
    setPreviewUrl(item.image || null);
    setResultData({
      title: item.title,
      category: item.category,
      tags: item.tags || [],
      scores: item.scores || {},
      // 저장 시 finalScore(0~99)를 넣으므로, 다시 사용할 수 있도록 그대로 보존.
      // getFinalScore100 가 aiScore 없을 때 finalScore 폴백.
      finalScore: item.finalScore,
    });
    setManualScoreAdj(0);
    setSelectedHistoryId(item.id);
    setViewMode('detail');
  };

  const deleteHistoryItem = async (e, id) => {
    e.stopPropagation();
    if (!evaluationsCol || !id) return;
    if (!confirm('이 평가 기록을 삭제할까요?')) return;
    try {
      await deleteDoc(doc(evaluationsCol, id));
      if (selectedHistoryId === id) setSelectedHistoryId(null);
    } catch (err) { console.warn("[Evaluator] delete history failed", err); }
  };

  // ── 외부 앱으로 보내기 ──
  // 카테고리에 따라 등록 대상이 달라짐:
  //   - 브랜드웹/프로모션 → promotion-archive (Brand Web Library)
  //   - 그 외 (배너 등) → banner-codex
  const getRegisterTarget = (cat = '') => {
    const c = String(cat).toLowerCase();
    if (c.includes('브랜드') || c.includes('brand') || c.includes('프로모션') || c.includes('promotion')) {
      return { id: 'promotion-archive', label: '브랜드 웹 라이브러리에 등록' };
    }
    return { id: 'banner-codex', label: '배너 코덱스에 등록' };
  };
  const registerTarget = getRegisterTarget(resultData?.category);

  const sendToRegisterTarget = () => {
    if (!resultData || !previewUrl) { setNotification("이미지와 평가 결과가 필요합니다."); setTimeout(() => setNotification(null), 2500); return; }
    navigate(registerTarget.id, {
      source: 'design-eval', target: registerTarget.id,
      prompt: { text: resultData.title || '', tags: resultData.tags || [], style: resultData.category || '' },
      image: { url: previewUrl, metadata: { finalScore: getFinalScore100(resultData, manualScoreAdj), scores: resultData.scores } },
      params: { mode: 'register' },
    });
  };
  // 배너 에디터 (Banner Creator) — 이미지를 출발점으로 디자인 편집 흐름 시작.
  const sendToBannerCreator = () => {
    if (!previewUrl) { setNotification("이미지를 먼저 업로드하세요."); setTimeout(() => setNotification(null), 2500); return; }
    navigate('banner-creator', {
      source: 'design-eval', target: 'banner-creator',
      prompt: { text: resultData?.title || '', tags: resultData?.tags || [], style: resultData?.category || '' },
      image: { url: previewUrl, metadata: {} },
      params: {},
    });
  };
  // Brand Web Review — 브랜드웹/프로모션 카테고리에서 컨펌·피드백 워크스페이스로 이동.
  // imageFile.webkitRelativePath 가 있으면 (폴더 업로드) 공유 폴더 경로를 자동 추론해 전달.
  const sendToBrandWebReview = async () => {
    if (!previewUrl) { setNotification("이미지를 먼저 업로드하세요."); setTimeout(() => setNotification(null), 2500); return; }
    let sharedFolderUrl = "";
    try {
      if (imageFile?.webkitRelativePath) {
        const { buildSharedFolderPath } = await import("../../lib/sharedFolderPath");
        sharedFolderUrl = buildSharedFolderPath(imageFile, { section: 'brandweb' });
      }
    } catch (e) {
      console.warn('[DesignEvaluator] sharedFolderPath infer failed', e?.message);
    }
    navigate('brand-web-review', {
      source: 'design-eval', target: 'brand-web-review',
      prompt: { text: resultData?.title || '제목 없음', tags: resultData?.tags || [], style: resultData?.category || '' },
      image: { url: previewUrl, metadata: { finalScore: getFinalScore100(resultData, manualScoreAdj), sourcePath: sharedFolderUrl } },
      params: { mode: 'review', sharedFolderUrl },
    });
  };
  // eslint-disable-next-line no-unused-vars
  const txtFileInputRef = useRef(null);

  const [geminiApiKey, setGeminiApiKey] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('geminiApiKey') || '' : '');
  const [openAiApiKey, setOpenAiApiKey] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('openAiApiKey') || '' : '');

  // ─── Firestore evaluationCriteria 동기화 ───
  // banner / promotion / brandweb / typo2d / typoRender / typoMotion 활성 버전을 한꺼번에 로드 → 카테고리별 기준 텍스트로 합성
  const seedEntry = (type) => ({ items: getSeedCriteria(type), versionName: "(시드)", rules: getSeedRules(type) });
  const [criteriaByType, setCriteriaByType] = useState({
    banner:      seedEntry(CRITERIA_TYPES.banner),
    promotion:   seedEntry(CRITERIA_TYPES.promotion),
    brandweb:    seedEntry(CRITERIA_TYPES.brandweb),
    brandwebSub: seedEntry(CRITERIA_TYPES.brandwebSub),
    typo2d:      seedEntry(CRITERIA_TYPES.typo2d),
    typoRender:  seedEntry(CRITERIA_TYPES.typoRender),
    typoMotion:  seedEntry(CRITERIA_TYPES.typoMotion),
  });
  const [criteriaLoading, setCriteriaLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCriteriaLoading(true);
      try {
        const [b, p, w, ws, t2, tr, tm] = await Promise.all([
          fetchActiveCriteria(CRITERIA_TYPES.banner),
          fetchActiveCriteria(CRITERIA_TYPES.promotion),
          fetchActiveCriteria(CRITERIA_TYPES.brandweb),
          fetchActiveCriteria(CRITERIA_TYPES.brandwebSub),
          fetchActiveCriteria(CRITERIA_TYPES.typo2d),
          fetchActiveCriteria(CRITERIA_TYPES.typoRender),
          fetchActiveCriteria(CRITERIA_TYPES.typoMotion),
        ]);
        if (cancelled) return;
        const pickOrSeed = (v, type) => (v && Array.isArray(v.criteria) && v.criteria.length > 0)
          ? { items: v.criteria, versionName: v.name || "active", rules: getActiveRules(v) || getSeedRules(type) }
          : { items: getSeedCriteria(type), versionName: "(시드 fallback)", rules: getSeedRules(type) };
        setCriteriaByType({
          banner:      pickOrSeed(b,  CRITERIA_TYPES.banner),
          promotion:   pickOrSeed(p,  CRITERIA_TYPES.promotion),
          brandweb:    pickOrSeed(w,  CRITERIA_TYPES.brandweb),
          brandwebSub: pickOrSeed(ws, CRITERIA_TYPES.brandwebSub),
          typo2d:      pickOrSeed(t2, CRITERIA_TYPES.typo2d),
          typoRender:  pickOrSeed(tr, CRITERIA_TYPES.typoRender),
          typoMotion:  pickOrSeed(tm, CRITERIA_TYPES.typoMotion),
        });
      } catch (e) {
        console.warn("[DesignEvaluator] criteria load failed; using seeds", e);
      } finally { if (!cancelled) setCriteriaLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // 동적으로 카테고리별 평가 기준 텍스트 생성 (Gemini 프롬프트에 주입)
  // 타이포 평가 항목 id 는 기존 일반 디자인 평가 id 와 다르므로 (kerning/material/timing 등),
  // Gemini 가 카테고리에 맞는 id 키로 출력하도록 명시적으로 노출.
  const evaluationCriteria = useMemo(() => {
    return `[임무 2: 카테고리별 평가 항목 (각 100점 만점)]
각 항목에 대해 100점 만점 기준의 점수(score)와 핵심을 찌르는 심플한 한 줄 평가(reason)를 작성하세요.

[★ 카테고리별 평가 항목, 가중치, JSON 키 매핑 ★]
AI는 판별/지정된 카테고리에 따라 다음의 기준으로 평가하고, **반드시 괄호 안의 (JSON 키)에 맞춰** 점수와 이유를 기입하세요.
카테고리에 따라 평가 항목 키가 완전히 다르므로 (예: 일반 디자인은 impression/concept/..., 타이포는 kerning/material/timing 등),
판별된 카테고리에 정확히 일치하는 키 셋을 사용하세요.

▶ [배너] 및 [기타] 카테고리:
${formatCriteriaList(criteriaByType.banner.items)}

▶ [프로모션 페이지] 카테고리:
${formatCriteriaList(criteriaByType.promotion.items)}

▶ [브랜드웹_메인] 카테고리:
${formatCriteriaList(criteriaByType.brandweb.items)}

▶ [브랜드웹_서브] 카테고리:
${formatCriteriaList(criteriaByType.brandwebSub.items)}

▶ [2D 타이포] 카테고리 (평면 디자인 — 벡터/플랫):
${formatCriteriaList(criteriaByType.typo2d.items)}

▶ [렌더링 타이포] 카테고리 (3D/PBR — Render Matrix 산출물):
${formatCriteriaList(criteriaByType.typoRender.items)}

▶ [모션 타이포] 카테고리 (영상/모션 — 대표 키프레임 기준):
${formatCriteriaList(criteriaByType.typoMotion.items)}

[중요: 이유(reason) 작성 시 강력한 규칙]
- 고점 항목 (85점 이상): 어떤 디자인 요소가 훌륭한지 구체적으로 짚어 명확히 칭찬하세요.
- 저점 항목 (80점 미만): 절대 칭찬하거나 "무난하다"고 타협하지 마세요. 명확한 단점과 아쉬운 점을 날카롭게 비판하고 지적하세요.
- 구어체나 불필요한 미사여구를 빼고 핵심만 심플하게 작성하세요.
- 모션 타이포 카테고리는 키프레임 한 장으로 평가하지만, 가능한 한 시간 축의 흔적(motion blur, sequential frames, easing 흔적 등)을 추론하여 timing/loop/모션 관련 항목에도 점수를 매기세요.`;
  }, [criteriaByType]);

  // 카테고리별 채점 규칙(rules) — 공유 기준의 rules. 비어있지 않은 것만 라벨과 함께 노출.
  // 판별/지정된 카테고리에 해당하는 규칙을 AI 가 적용하도록 프롬프트에 주입.
  const scoringRulesText = useMemo(() => {
    const labelOf = {
      banner: "배너 / 기타", promotion: "프로모션 페이지", brandweb: "브랜드웹_메인",
      brandwebSub: "브랜드웹_서브", typo2d: "2D 타이포", typoRender: "렌더링 타이포", typoMotion: "모션 타이포",
    };
    const blocks = Object.entries(criteriaByType)
      .filter(([, v]) => v?.rules && v.rules.trim())
      .map(([type, v]) => `▶ [${labelOf[type] || type}] 채점 규칙:\n${v.rules.trim()}`);
    return blocks.length
      ? `\n[★ 카테고리별 채점 규칙 — 판별된 카테고리에 해당하는 규칙을 반드시 적용하세요]\n${blocks.join("\n\n")}\n`
      : "";
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

  const callGeminiAPI = async (prompt, imageBase64 = null, anchorImages = []) => {
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
      // 앵커 few-shot 이미지가 있으면 [프롬프트 → 참고 이미지들 → 평가 대상] 순으로 배치.
      const anchorParts = Array.isArray(anchorImages) ? anchorImages.filter(Boolean) : [];
      const targetPart = imageBase64 ? [{ inlineData: { mimeType: "image/jpeg", data: imageBase64 } }] : [];
      const parts = anchorParts.length
        ? [{ text: prompt }, ...anchorParts, { text: "[평가 대상 이미지 — 위 참고 이미지들의 점수 감각으로 채점하세요]" }, ...targetPart]
        : [{ text: prompt }, ...targetPart];
      const requestBody = {
          contents: [{ parts }],
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
              ? `- category: 이미지의 형태와 목적에 따라 다음 중 하나로 정확히 분류하세요:
  · "배너" (캠페인/이벤트 배너)
  · "프로모션 페이지" (세로로 긴 랜딩 페이지)
  · "브랜드웹_메인" / "브랜드웹_서브" (게임/브랜드 사이트)
  · "2D 타이포" (글자 자체가 주인공인 평면 타이포그래피 디자인 — 벡터/플랫, 배경 효과 거의 없음)
  · "렌더링 타이포" (3D/PBR 렌더링된 타이포 — 금속/얼음/돌 재질감, 라이팅, 깊이감)
  · "모션 타이포" (영상이나 모션이 강하게 느껴지는 키프레임 — 모션 블러, 파티클 궤적, 시퀀스 흔적, 글자가 시간 축으로 움직이는 인상)
  · "기타"
  (구분 팁: 글자 자체에 3D 입체감/재질감이 있으면 "렌더링 타이포". 모션블러나 글자 주변에 시간성 효과(궤적)가 있으면 "모션 타이포". 평면이면 "2D 타이포".)`
              : `- category: 이 디자인은 "${selectedCategory}"입니다. 반드시 이 값으로 고정하여 출력하고, 평가 기준도 해당 카테고리에 맞춰 진행하세요.`;
          const introInstruction = selectedCategory === 'auto'
              ? '첨부된 이미지를 분석하여 디자인 카테고리를 분류하고,'
              : `첨부된 디자인은 [${selectedCategory}]입니다. 이 사실을 바탕으로`;

          // 기준점 앵커 — 카테고리가 고정된 경우에만 해당 타입 앵커를 few-shot 으로 주입.
          // (auto 모드는 분석 전 타입을 알 수 없어 생략.) 썸네일 있는 앵커는 시각 이미지로,
          // 없는 앵커는 텍스트로. 점수대를 고르게 덮는 상위 N개를 이미지로 첨부.
          let anchorsText = "";
          let anchorImageParts = [];
          if (selectedCategory !== 'auto') {
            try {
              const rawAnchors = await fetchAnchors(resolveCriteriaType(selectedCategory));
              const { anchors: pickedAnchors } = buildAnchorFewShot(rawAnchors);
              const prepared = pickedAnchors.length ? await prepareAnchorImages(pickedAnchors) : [];
              const fewShot = prepared.length ? buildAnchorFewShot(prepared.map(p => p.anchor)) : { text: '' };
              anchorImageParts = prepared.map(p => ({ inlineData: { mimeType: 'image/jpeg', data: p.base64 } }));
              const textOnly = (rawAnchors || []).filter(a => !a?.thumbnailUrl);
              anchorsText = `${fewShot.text || ''}${formatAnchorsForPrompt(textOnly) || ''}`;
            }
            catch (e) { console.warn('[DesignEvaluator] fetchAnchors failed', e); }
          }

          const dynamicPrompt = `당신은 게임/IT 디자인을 심사하는 최고 권위의 AI 평가단입니다.
${introInstruction} 반드시 10가지 세부 항목 '모두'에 대해 누락 없이 정밀 평가하세요.

[임무 1: 메타데이터 추출]
- title: 디자인의 메인 텍스트(제목) 추출.
${categoryInstruction}
- date_info: 이벤트 기간/날짜 (있을 경우).
- tags: 컬러, 분위기, 특징 위주로 반드시 '한글'로만 3~5개 작성 (예: "다크판타지", "황금빛", "캐주얼", "화려한").

${evaluationCriteria}
${scoringRulesText}${anchorsText}
반드시 지정된 JSON 스키마에 맞추어 10개 평가 항목 전체를 단 하나도 누락 없이 답변하세요.`;

          let geminiResult = null;
          let openaiResult = null;
          const promises = [callGeminiAPI(dynamicPrompt, base64Image, anchorImageParts)];
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
              // 가중치 단일 소스 — 공유 평가 기준(criteriaByType[resolvedType])의 weight 사용.
              // 누락/합≠100 안전하게 weight 합으로 정규화한 가중 평균(0~100) → 0~10.
              const resolvedType = resolveCriteriaType(detectedCategory);
              const weights = weightsMap(criteriaByType[resolvedType]?.items || []);
              const keys = ['impression', 'concept', 'layout', 'typography', 'color', 'readability', 'brand', 'flow', 'detail', 'conversion'];
              const mergedScoresData = {};
              let weightedSum = 0, totalW = 0;
              keys.forEach(key => {
                  const gScore = geminiData?.scores_data?.[key]?.score;
                  const oScore = openaiData?.scores_data?.[key]?.score;
                  const score = mergeScore(gScore, oScore);
                  const w = Number(weights[key]) > 0 ? Number(weights[key]) : 1;
                  const reason = mergeReason(geminiData?.scores_data?.[key]?.reason, openaiData?.scores_data?.[key]?.reason);
                  mergedScoresData[key] = { score: Math.round(score), reason, weight: w };
                  weightedSum += score * w; totalW += w;
              });
              const weightedAvg100 = totalW > 0 ? weightedSum / totalW : 0;
              // 전역 보정(offset) 적용 — resolvedType 별 평가자 점수 감각으로 점수대 시프트.
              let calibOffset = 0;
              try { calibOffset = (await fetchCalibration(resolvedType))?.offset || 0; }
              catch (e) { console.warn('[DesignEvaluator] fetchCalibration failed', e); }
              const adjusted100 = applyOffset(weightedAvg100, calibOffset);
              let aiScore = Math.round((adjusted100 / 10) * 10) / 10;
              const finalResult = {
                  title: primaryData.title,
                  category: detectedCategory,
                  tags: primaryData.tags || [],
                  scores: mergedScoresData,
                  aiScore: aiScore,
                  score: aiScore
              };
              setResultData(finalResult);
              showNotification("분석이 성공적으로 완료되었습니다.");
              // 로그인 사용자면 히스토리에 자동 저장 (fire-and-forget).
              if (user) saveEvaluationToHistory(finalResult, previewUrl, detectedCategory);
              setSelectedHistoryId(null);
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
      // 우선순위: aiScore (0~10 분석 직후) → finalScore (히스토리 저장본, 이미 0~99) → 0
      let base = 0;
      if (Number.isFinite(parseFloat(data.aiScore))) {
        base = Math.round(parseFloat(data.aiScore) * 10);
      } else if (Number.isFinite(parseFloat(data.finalScore))) {
        base = Math.round(parseFloat(data.finalScore));
      }
      const a = Number.isFinite(parseFloat(adj)) ? parseFloat(adj) : 0;
      return Math.min(99, Math.max(0, base + a));
  };

  // ─── 기준점(앵커) 큐레이션 — 이 앱이 허브. 추가/삭제/목록. ───
  const ANCHOR_TYPE_TABS = [
    { id: CRITERIA_TYPES.banner, label: '배너' },
    { id: CRITERIA_TYPES.promotion, label: '프로모션' },
    { id: CRITERIA_TYPES.brandweb, label: '브랜드웹 메인' },
    { id: CRITERIA_TYPES.brandwebSub, label: '브랜드웹 서브' },
    { id: CRITERIA_TYPES.typo2d, label: '2D 타이포' },
    { id: CRITERIA_TYPES.typoRender, label: '렌더링 타이포' },
    { id: CRITERIA_TYPES.typoMotion, label: '모션 타이포' },
  ];
  const [anchorMgrType, setAnchorMgrType] = useState(CRITERIA_TYPES.banner);
  const [anchorMgrList, setAnchorMgrList] = useState([]);
  const [anchorMgrLoading, setAnchorMgrLoading] = useState(false);
  const loadAnchorMgr = async (type) => {
    setAnchorMgrLoading(true);
    try { setAnchorMgrList(await fetchAnchors(type)); }
    catch { setAnchorMgrList([]); }
    finally { setAnchorMgrLoading(false); }
  };
  useEffect(() => {
    if (isSettingsOpen && settingsTab === 'anchors') loadAnchorMgr(anchorMgrType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSettingsOpen, settingsTab, anchorMgrType]);
  const handleAddAnchor = async () => {
    if (!resultData) return;
    const type = resolveCriteriaType(resultData.category);
    // 평가자의 "진짜 점수" 입력 — ±3 보정 캡과 무관. 현재 화면 점수를 prefill.
    const aiScore100 = Number.isFinite(parseFloat(resultData.aiScore)) ? Math.round(parseFloat(resultData.aiScore) * 10) : null;
    const prefill = getFinalScore100(resultData, manualScoreAdj);
    const scoreStr = window.prompt('이 디자인에 대한 당신의 점수(0~99)를 입력하세요.\n이 점수가 향후 분석의 기준점이 됩니다:', String(prefill));
    if (scoreStr === null) return; // 취소
    const myScore = Math.max(0, Math.min(99, parseInt(scoreStr, 10)));
    if (Number.isNaN(myScore)) { showNotification('숫자 점수를 입력해주세요.'); return; }
    const verdict = window.prompt('점수의 근거가 되는 한 줄 평을 입력하세요:', '');
    if (verdict === null) return; // 취소
    try {
      // 썸네일 — 시각 few-shot 레퍼런스. 작게 압축한 dataURL 저장(앵커 수가 적어 1MB 무관).
      let thumbnailUrl = '';
      try {
        let src = previewUrl;
        if (src?.startsWith('blob:')) src = await blobUrlToBase64(src);
        if (src?.startsWith('data:image')) thumbnailUrl = await compressImage(src, 320, 0.7);
      } catch (e) { console.warn('[DesignEvaluator] anchor thumbnail capture failed', e); }
      await addAnchor(type, {
        score: myScore, aiScore: aiScore100,
        verdict, tags: resultData.tags || [], thumbnailUrl,
      });
      showNotification('기준점으로 추가했습니다. 이후 분석에 반영됩니다.');
      if (settingsTab === 'anchors') loadAnchorMgr(anchorMgrType);
    } catch (e) { showNotification('기준점 추가 실패: ' + (e.message || e)); }
  };
  const handleRemoveAnchor = async (id) => {
    try { await removeAnchor(anchorMgrType, id); await loadAnchorMgr(anchorMgrType); }
    catch (e) { showNotification('삭제 실패: ' + (e.message || e)); }
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
        // Lexicon-style 레이아웃 — 좌측 히스토리 사이드바 + 우측 메인.
        // 루트는 overflow:hidden + flex column. 사이드바와 메인이 독립 스크롤.
        className="h-screen overflow-hidden flex flex-col bg-slate-50 text-slate-900 dark:bg-[#0c0c0e] dark:text-zinc-300 font-sans selection:bg-[#df6a78]/30"
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

      {/* 상단 header(Settings) 제거됨 — API 키 설정 등은 ProfilePopover 또는 NEXUS Admin 에서 관리. */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측 사이드바 — 텍스트 메뉴 (평가중 / 평가완료). 클릭 시 우측 뷰모드 전환. */}
        <aside className="w-[180px] shrink-0 bg-black/30 border-r border-white/5 flex flex-col">
            <div className="p-4 border-b border-white/5">
                <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">메뉴</h2>
            </div>
            <nav className="flex-1 p-2 flex flex-col gap-0.5">
                {[
                    { id: 'current', label: '평가중', icon: <Sparkles className="w-3.5 h-3.5" />, count: resultData || previewUrl ? 1 : 0, view: 'detail' },
                    { id: 'completed', label: '평가완료', icon: <Layers className="w-3.5 h-3.5" />, count: history.length, view: 'list' },
                ].map((m) => {
                    const active = viewMode === m.view;
                    return (
                        <button
                            key={m.id}
                            onClick={() => {
                                setViewMode(m.view);
                                if (m.view === 'detail' && !previewUrl && !resultData) setSelectedHistoryId(null);
                            }}
                            className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left transition-colors ${active ? 'bg-[#df6a78]/15 text-[#df6a78] border border-[#df6a78]/30' : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
                        >
                            <span className="flex items-center gap-2 text-[12px] font-medium">
                                {m.icon} {m.label}
                            </span>
                            <span className={`text-[10px] font-mono tabular-nums ${active ? 'text-[#df6a78]' : 'text-zinc-600'}`}>{m.count}</span>
                        </button>
                    );
                })}
                <div className="border-t border-white/5 my-2" />
                <button
                    onClick={() => {
                        setResultData(null); setPreviewUrl(null); setImageFile(null);
                        setSelectedHistoryId(null); setManualScoreAdj(0); setAspectRatio(1);
                        setViewMode('detail');
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors text-zinc-400 hover:text-white hover:bg-white/5 text-[12px] font-medium"
                ><Plus className="w-3.5 h-3.5" /> 새 평가</button>
            </nav>
            <div className="p-2 border-t border-white/5 flex flex-col gap-1">
                <button
                    onClick={() => setIsCriteriaHelpOpen(true)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors text-zinc-400 hover:text-white hover:bg-white/5 text-[12px] font-medium"
                    title="카테고리별 평가 기준 보기"
                >
                    <BrainCircuit className="w-3.5 h-3.5" /> 평가 기준 도움말
                </button>
                <div className="px-3 pt-1 pb-2 text-[9px] text-zinc-600 leading-relaxed">
                    {user ? `로그인: ${user.displayName || user.email?.split('@')[0]}` : '로그인하면 자동 저장'}
                </div>
            </div>
        </aside>

        {/* 우측 메인 — 자체 스크롤. 모드별로 다른 콘텐츠. */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
        <main className="w-full p-6 md:p-8">

          {viewMode === 'list' ? (
            // 평가완료 리스트 — BannerCodex 카드 그리드 스타일
            <div className="w-full">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#df6a78]" /> 평가 완료 항목
                        <span className="text-[11px] font-normal text-zinc-500">({history.length})</span>
                    </h2>
                </div>
                {!user ? (
                    <div className="text-center py-20 text-zinc-500 text-sm">로그인하면 평가 결과가 자동으로 저장됩니다.</div>
                ) : history.length === 0 ? (
                    <div className="text-center py-20 text-zinc-500 text-sm">아직 저장된 평가가 없습니다.<br/>좌측 메뉴에서 "새 평가" 를 눌러 시작하세요.</div>
                ) : (
                    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                        {history.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => loadHistoryItem(item)}
                                className="group relative rounded-xl overflow-hidden border border-white/5 hover:border-[#df6a78]/40 cursor-pointer transition-all bg-[#0a0a0a]"
                            >
                                {item.image ? (
                                    <div className="relative w-full aspect-video bg-black overflow-hidden">
                                        <img src={item.image} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                                        {typeof item.finalScore === 'number' && (
                                            <span className="absolute top-2 right-2 px-2 py-0.5 text-[11px] font-bold rounded bg-black/70 text-[#df6a78] tabular-nums">
                                                {item.finalScore}
                                            </span>
                                        )}
                                        <button
                                            onClick={(e) => deleteHistoryItem(e, item.id)}
                                            title="삭제"
                                            className="absolute top-2 left-2 p-1.5 rounded bg-black/60 text-zinc-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        ><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                ) : (
                                    <div className="w-full aspect-video bg-zinc-900 flex items-center justify-center relative">
                                        <ImageIcon className="w-8 h-8 text-zinc-700" />
                                        {/* Firestore 응답 전 캐시 메타만 있을 때(.image 없음) → 로딩 표시.
                                            응답 후에도 image 가 없으면 진짜 빠진 데이터. */}
                                        <div className="absolute bottom-1.5 left-1.5 text-[9px] text-zinc-600">
                                            이미지 로딩…
                                        </div>
                                    </div>
                                )}
                                <div className="p-3">
                                    <div className="text-[12px] font-bold text-white truncate mb-0.5">{item.title || '제목 없음'}</div>
                                    <div className="text-[10px] text-zinc-500 truncate">{item.category}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          ) : (
          <>
          {/* TOP TOOLBAR — split 위에 분리. 양쪽 상단 라인을 동일 y 로 맞추기 위해
              [카테고리 selector + 평가 시작] 컨트롤을 row 바깥으로 옮김. */}
          <div className="w-full bg-white/5 border border-white/10 rounded-xl p-2 mb-4 flex gap-2 items-center shadow-lg">
              <div className="relative flex-1">
                  <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full bg-transparent border-none pl-3 pr-7 py-1.5 text-[11px] font-medium text-white appearance-none focus:outline-none cursor-pointer">
                      <option value="auto" className="bg-zinc-900">✨ AI 자동 판별 (권장)</option>
                      <option value="배너" className="bg-zinc-900">🖼️ 배너 (Banner)</option>
                      <option value="프로모션 페이지" className="bg-zinc-900">📜 프로모션 페이지 (Landing)</option>
                      <option value="브랜드웹_메인" className="bg-zinc-900">🌐 브랜드 사이트 (메인)</option>
                      <option value="브랜드웹_서브" className="bg-zinc-900">🌐 브랜드 사이트 (서브)</option>
                      <option value="2D 타이포" className="bg-zinc-900">🅰️ 2D 타이포 (평면)</option>
                      <option value="렌더링 타이포" className="bg-zinc-900">💎 렌더링 타이포 (3D/PBR)</option>
                      <option value="모션 타이포" className="bg-zinc-900">🎬 모션 타이포 (영상 키프레임)</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
              </div>
              <div className="w-px h-5 bg-white/10 shrink-0"></div>
              <button onClick={handleAnalyze} disabled={isAnalyzing || !previewUrl} className={`px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${isAnalyzing ? 'bg-[#df6a78]/50 text-white cursor-not-allowed' : !previewUrl ? 'bg-transparent text-zinc-500 cursor-not-allowed' : 'bg-[#df6a78] hover:bg-[#c95160] text-white'}`}>
                  {isAnalyzing ? (<><Loader2 className="w-3 h-3 animate-spin" /> 분석 중</>) : (<><Sparkles className="w-3 h-3" /> 평가 시작</>)}
              </button>
          </div>

          <div
            ref={splitContainerRef}
            className={isLg ? "flex items-start gap-0" : "flex flex-col gap-6"}
          >

            {/* LEFT: 평가 대상 이미지 — lg 이상에서 sticky + 가변 너비 (leftPct%) */}
            <div
                className="lg:sticky lg:top-20 z-30 lg:pr-3"
                style={isLg ? { width: `${leftPct}%`, flexShrink: 0 } : { width: '100%' }}
            >
                <div
                    // 이미지가 있으면: 가로 꽉, 세로는 자연 비율로 늘어남. maxHeight 초과 시 내부 스크롤.
                    // 이미지가 없으면: 16:9 placeholder.
                    className={`w-full bg-black/40 border rounded-2xl relative group transition-all duration-300 shadow-inner ${previewUrl ? 'overflow-hidden' : 'overflow-hidden'} ${isDragging ? 'border-[#df6a78] bg-[#df6a78]/10' : 'border-white/10'}`}
                    style={!previewUrl ? { aspectRatio: 16/9 } : undefined}
                >
                    {previewUrl ? (
                        <>
                            {/* 내부 스크롤 컨테이너 — 이미지를 width 100% 로 넣고 height 는 자연.
                                긴 portrait/landing 이미지면 maxHeight 에 걸려 세로 스크롤 발생. */}
                            <div
                                className="w-full overflow-y-auto custom-scrollbar"
                                style={{ maxHeight: 'calc(100vh - 6rem)' }}
                            >
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className="w-full h-auto block"
                                />
                            </div>
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
            </div>
            {/* /LEFT */}

            {/* DIVIDER — lg 이상에서만 노출. 드래그로 좌우 너비 조절. */}
            {isLg && (
                <div
                    onMouseDown={startResize}
                    title="드래그로 너비 조절"
                    className="sticky top-20 self-stretch flex items-center justify-center cursor-col-resize group select-none"
                    style={{ width: 10, height: 'calc(100vh - 6rem)', flexShrink: 0 }}
                >
                    <div className="w-0.5 h-12 bg-white/10 group-hover:bg-[#df6a78]/60 rounded-full transition-colors" />
                </div>
            )}

            {/* RIGHT: 평가 결과 — 가변 너비 (100 - leftPct)%. 상단 라인이 좌측 이미지와 일치. */}
            <div
                className="flex flex-col gap-4 min-w-0 lg:pl-3"
                style={isLg ? { width: `calc(${100 - leftPct}% - 10px)`, flexShrink: 0 } : { width: '100%' }}
            >
                <div className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-5 md:p-6 flex flex-col shadow-2xl">
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
                            {/* 헤더 — Lexicon 스타일 compact: 카테고리 뱃지 + 제목 + 태그 + 최종 점수 (작은 버전) */}
                            <div className="flex items-start justify-between gap-4 mb-6 pb-5 border-b border-white/10">
                                <div className="flex-1 min-w-0">
                                    <span className="inline-block px-2 py-0.5 bg-[#df6a78]/15 border border-[#df6a78]/40 text-[#df6a78] text-[10px] font-bold rounded uppercase tracking-wider mb-2">
                                        {resultData.category}
                                    </span>
                                    <h2 className="text-base font-bold text-white leading-snug break-words mb-2">{resultData.title}</h2>
                                    {resultData.tags?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {resultData.tags.map((tag, idx) => (
                                                <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-zinc-400">#{tag}</span>
                                            ))}
                                        </div>
                                    )}
                                    {/* 액션 아이콘 행 — 결과 복사 / 등록 / 에디터로 보내기.
                                        에디터 보내기는 배너 카테고리에서만 의미가 있어 프로모션/브랜드웹에서는 숨김. */}
                                    <div className="flex gap-1.5">
                                        <button onClick={copyResultJson}
                                            title={isCopied ? '복사 완료' : '결과 JSON 복사'}
                                            className={`p-1.5 rounded-md border transition-colors ${isCopied ? 'bg-[#df6a78]/15 border-[#df6a78]/40 text-[#df6a78]' : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-400 hover:text-white'}`}>
                                            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                        <button onClick={sendToRegisterTarget}
                                            title={registerTarget.label}
                                            className="p-1.5 rounded-md bg-[#0eb9b3]/10 hover:bg-[#0eb9b3]/20 border border-[#0eb9b3]/40 text-[#0eb9b3] transition-colors">
                                            <Layers className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={handleAddAnchor}
                                            title="이 평가를 기준점(캘리브레이션 앵커)으로 추가 — 이후 분석이 이 점수 감각에 맞춰짐"
                                            className="p-1.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-400 transition-colors">
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                        {registerTarget.id === 'banner-codex' && (
                                            <button onClick={sendToBannerCreator}
                                                title="배너 에디터로 보내기"
                                                className="p-1.5 rounded-md bg-[#E17055]/10 hover:bg-[#E17055]/20 border border-[#E17055]/40 text-[#E17055] transition-colors">
                                                <Send className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        {registerTarget.id === 'promotion-archive' && (
                                            <button onClick={sendToBrandWebReview}
                                                title="브랜드 웹 리뷰로 보내기 (컨펌·피드백 워크스페이스)"
                                                className="p-1.5 rounded-md bg-[#FD79A8]/10 hover:bg-[#FD79A8]/20 border border-[#FD79A8]/40 text-[#FD79A8] transition-colors">
                                                <ClipboardCheck className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="shrink-0 text-right">
                                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">최종</div>
                                    <div className="font-black text-[#f15d72] leading-[0.85] tabular-nums" style={{ fontSize: '72px', letterSpacing: '-0.02em' }}>
                                        {getFinalScore100(resultData, manualScoreAdj)}
                                    </div>
                                </div>
                            </div>

                            {/* 점수 카드 그리드 — 구분선 없음, 점수 컬러 복원, 최고/최저 카드 배경 차등. */}
                            <div className="grid gap-2 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                                {fixedOrder.map((key) => {
                                    const data = resultData.scores?.[key];
                                    if (!data) return null;
                                    const scoreVal = Math.round(data.score);
                                    const isMax = validScores.length > 1 && scoreVal === maxScore && maxScore !== minScore;
                                    const isMin = validScores.length > 1 && scoreVal === minScore && maxScore !== minScore;
                                    // 카드 배경 — 최고/최저는 살짝 컬러 틴트, 보더도 같이 강조.
                                    const cardClass = isMax
                                        ? 'bg-[#0eb9b3]/10 border-[#0eb9b3]/30 hover:bg-[#0eb9b3]/15'
                                        : isMin
                                            ? 'bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/15'
                                            : 'bg-[#18181B] border-zinc-800 hover:border-zinc-700';
                                    // 점수 컬러 — 저채도 톤, 카드 배경과 어우러지게.
                                    const scoreColor = isMax ? '#7FB5B0' : isMin ? '#C77E83' : '#A1A1AA';
                                    return (
                                        <div key={key}
                                            className={`${cardClass} border rounded-lg overflow-hidden transition-colors flex flex-col px-3 py-2.5 gap-1.5`}
                                        >
                                            {/* 타이틀 행 — 구분선/배경 없이 흘러서 카드와 합쳐짐 */}
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[11px] font-bold text-white leading-tight break-words flex-1 uppercase tracking-wider" style={{ letterSpacing: '0.04em' }}>
                                                    {getScoreLabel(key, resultData.category)}
                                                </span>
                                                <span className="text-[18px] font-bold leading-none tabular-nums shrink-0" style={{ color: scoreColor }}>
                                                    {scoreVal}
                                                </span>
                                            </div>
                                            {/* 평가 코멘트 — Noto Sans KR (프로젝트 기본), 한 단계 큰 사이즈 */}
                                            <p
                                                className="text-zinc-400 leading-relaxed break-words break-keep flex-1"
                                                style={{
                                                    fontFamily: "'Noto Sans KR', sans-serif",
                                                    fontSize: '12px',
                                                    lineHeight: 1.6,
                                                }}
                                            >
                                                {data.reason}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* 점수 보정 + 코멘트 + 하단 액션 행 모두 제거 — 액션 아이콘은 헤더 우측 태그 아래로 이동됨. */}
                        </div>
                    );
                })()}
                </div>
            </div>
            {/* /RIGHT */}

          </div>
          </>
          )}
        </main>
        </div>
        {/* /main scroll wrapper */}
      </div>
      {/* /flex 컨테이너 (sidebar + main) */}

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
                            <button onClick={() => setSettingsTab('anchors')} className={`text-lg font-bold flex items-center gap-2 transition-colors ${settingsTab === 'anchors' ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>
                                <Sparkles className={`w-5 h-5 ${settingsTab === 'anchors' ? 'text-[#df6a78]' : ''}`} /> 기준점
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
                        ) : settingsTab === 'prompt' ? (
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
                        ) : (
                            <div className="flex flex-col h-full min-h-[300px]">
                                <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                                    {ANCHOR_TYPE_TABS.map(t => (
                                        <button key={t.id} onClick={() => setAnchorMgrType(t.id)}
                                            className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${anchorMgrType === t.id ? 'bg-[#df6a78]/15 border-[#df6a78]/40 text-[#df6a78]' : 'border-white/10 text-zinc-400 hover:text-white'}`}>
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[11px] text-zinc-500 mb-2 leading-relaxed">기준점은 분석 시 few-shot 으로 주입되어 평가자의 점수 감각에 맞춥니다. 평가 결과 화면의 <b className="text-amber-400">＋</b> 버튼으로 추가하세요. (BannerCodex 분석에도 동일하게 반영)</p>
                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 min-h-[200px]">
                                    {anchorMgrLoading ? (
                                        <div className="text-center py-8 text-zinc-500 text-xs">불러오는 중...</div>
                                    ) : anchorMgrList.length === 0 ? (
                                        <div className="text-center py-8 text-zinc-600 text-xs">등록된 기준점이 없습니다.</div>
                                    ) : anchorMgrList.map(a => (
                                        <div key={a.id} className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-lg px-3 py-2">
                                            <span className="text-base font-black tabular-nums text-[#df6a78] w-9 text-center shrink-0">{a.score}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[12px] text-zinc-200 truncate">{a.verdict || '(한줄평 없음)'}</div>
                                                {a.tags?.length > 0 && <div className="text-[10px] text-zinc-500 truncate">{a.tags.map(t => `#${t}`).join(' ')}</div>}
                                            </div>
                                            <button onClick={() => handleRemoveAnchor(a.id)} className="p-1.5 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-6 pt-0 shrink-0">
                        <button onClick={() => setIsSettingsOpen(false)} className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-sm font-bold text-white transition-colors">저장 및 닫기</button>
                    </div>
                </div>
            </div>
        )}

        {isCriteriaHelpOpen && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in"
                onClick={() => setIsCriteriaHelpOpen(false)}>
                <div className="bg-[#111] border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
                    onClick={(e) => e.stopPropagation()}>
                    <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
                        <h2 className="text-base font-bold text-white flex items-center gap-2"><BrainCircuit className="w-4 h-4 text-[#df6a78]" /> 평가 기준 도움말</h2>
                        <button onClick={() => setIsCriteriaHelpOpen(false)} className="p-1.5 rounded text-zinc-500 hover:text-white hover:bg-white/5"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-5 text-[12px] text-zinc-300 leading-relaxed">
                        <section>
                            <h3 className="text-[11px] font-bold text-[#df6a78] uppercase tracking-widest mb-2">평가 방식</h3>
                            <p>업로드된 이미지의 카테고리를 AI 가 자동 판별(또는 수동 선택)한 뒤, 카테고리별 10개 세부 항목을 0~10점으로 채점합니다. 각 항목에는 가중치가 있어 최종 0~99점으로 환산됩니다. 우측 "결과 복사" 로 JSON 내보내기, 좌측 "평가완료" 에 자동 저장됩니다.</p>
                        </section>
                        <section>
                            <h3 className="text-[11px] font-bold text-[#df6a78] uppercase tracking-widest mb-2">카테고리</h3>
                            <ul className="space-y-1 ml-3 list-disc list-outside marker:text-zinc-600">
                                <li><span className="text-white font-semibold">배너 (Banner)</span> — 캠페인·이벤트 단일 비주얼. 임팩트·메시지·가독성 위주.</li>
                                <li><span className="text-white font-semibold">프로모션 페이지 (Landing)</span> — 스토리텔링형 긴 페이지. 스크롤 흐름·전환·디테일 평가.</li>
                                <li><span className="text-white font-semibold">브랜드 사이트 (메인)</span> — 브랜드의 첫인상. 정체성·세계관 몰입도 위주.</li>
                                <li><span className="text-white font-semibold">브랜드 사이트 (서브)</span> — 정보 페이지. 구조·가독성·운영 안정성 위주.</li>
                            </ul>
                        </section>
                        <section>
                            <h3 className="text-[11px] font-bold text-[#df6a78] uppercase tracking-widest mb-2">10가지 세부 항목 (배너 기준)</h3>
                            <p className="text-[11px] text-zinc-500 mb-2">* 카테고리에 따라 항목 이름이 달라질 수 있습니다.</p>
                            <ul className="space-y-1 ml-3 list-disc list-outside marker:text-zinc-600">
                                <li><span className="text-white font-semibold">첫인상 / 임팩트</span> — 클릭하고 싶게 만드는 시각적 끌림</li>
                                <li><span className="text-white font-semibold">컨셉 명확성</span> — 메시지·테마 전달의 직관성</li>
                                <li><span className="text-white font-semibold">레이아웃 균형</span> — 요소 배치·여백·시선 흐름</li>
                                <li><span className="text-white font-semibold">타이포그래피</span> — 폰트 선택·위계·정렬</li>
                                <li><span className="text-white font-semibold">컬러</span> — 팔레트·대비·브랜드 정합성</li>
                                <li><span className="text-white font-semibold">가독성</span> — 메인 카피·서브 카피의 식별성</li>
                                <li><span className="text-white font-semibold">브랜드 일관성</span> — 톤앤매너·로고·심볼 활용</li>
                                <li><span className="text-white font-semibold">시각 흐름 / 스크롤</span> — 시선 유도·정보 위계</li>
                                <li><span className="text-white font-semibold">디테일 완성도</span> — 폰트 커닝·정렬·소품·이펙트 마감</li>
                                <li><span className="text-white font-semibold">전환 / 기억성</span> — CTA·메시지가 행동/회상으로 이어지는지</li>
                            </ul>
                        </section>
                        <section>
                            <h3 className="text-[11px] font-bold text-[#df6a78] uppercase tracking-widest mb-2">점수 색상</h3>
                            <ul className="space-y-1 ml-3 list-disc list-outside marker:text-zinc-600">
                                <li><span style={{ color: '#7FB5B0' }} className="font-bold">muted teal</span> — 카테고리 내 최고 점수 항목 (강점)</li>
                                <li><span style={{ color: '#C77E83' }} className="font-bold">muted rose</span> — 카테고리 내 최저 점수 항목 (개선점)</li>
                                <li><span className="text-zinc-400 font-bold">zinc</span> — 그 외 일반 항목</li>
                            </ul>
                        </section>
                        <section>
                            <h3 className="text-[11px] font-bold text-[#df6a78] uppercase tracking-widest mb-2">결과 활용</h3>
                            <ul className="space-y-1 ml-3 list-disc list-outside marker:text-zinc-600">
                                <li>"결과 복사" — JSON 으로 클립보드 복사 (외부 노션·스프레드시트에 붙여넣기)</li>
                                <li>"배너 코덱스 / Brand Web Library 에 등록" — 카테고리에 따라 자동 분기되어 등록</li>
                                <li>"배너 에디터로 보내기" — 평가한 이미지를 Banner Creator 로 가져가서 편집 시작</li>
                                <li>"코멘트 (기준 업데이트용)" — 부족했던 평가 기준을 입력하고 "프롬프트에 추가" 누르면 AI 가 다음 평가부터 학습</li>
                            </ul>
                        </section>
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
