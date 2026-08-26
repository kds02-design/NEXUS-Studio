import { useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { Check, Download, FileText, FolderOpen, ImagePlus, Layers, Loader2, PackageOpen, Sparkles, Upload, X } from 'lucide-react';
import { BANNER_OUTPUT_SIZES, BANNER_SIZE } from './presets';
import PsdImportModal from '../NexusPreview/components/PsdImportModal';
import { analyzeBannerRequest } from './requestVision';
import { BANNER_LAYOUT_LIBRARY, getLayoutById, LAYOUT_GUIDE_PRESETS, recommendLayouts, toPreset } from './layoutLibrary';
import layoutSheet01 from './layout-samples/sheet-01.png';
import layoutSheet02 from './layout-samples/sheet-02.png';
import layoutSheet03 from './layout-samples/sheet-03.png';
import layoutSheet04 from './layout-samples/sheet-04.png';

const T = {
  bg:'#101113', panel:'#17181B', surface:'#17181B', line:'#292B31', border:'#292B31',
  text:'#F4F4F5', muted:'#94969E', textMuted:'#94969E', textDim:'#666972', accent:'#E17055',
};

const LAYOUT_SHEETS = {
  '01': { src:layoutSheet01, width:1023, height:1537, top:[8,0,1007,451], rows:[[8,511],[459,715,971,1226]] },
  '02': { src:layoutSheet02, width:1023, height:1537, top:[52,8,919,482], rows:[[52,518],[510,766,1022,1278]] },
  '03': { src:layoutSheet03, width:1024, height:1536, top:[7,0,1010,407], rows:[[7,516],[414,690,966,1242]] },
  '04': { src:layoutSheet04, width:1023, height:1537, top:[7,0,1009,449], rows:[[7,512],[455,711,967,1223]] },
};
const COMPOSITION_GUIDES = Object.fromEntries(Object.entries(import.meta.glob('./composition-guides/*.png', { eager:true, query:'?url', import:'default' })).map(([key,url]) => [key.split('/').pop().replace('.png',''),url]));

const getSketchCrop = (layout) => {
  const sheet = LAYOUT_SHEETS[layout.family];
  if (layout.variant === 'BASE') return { sheet, x:sheet.top[0], y:sheet.top[1], w:sheet.top[2], h:sheet.top[3] };
  const index = 'ABCDEFGH'.indexOf(layout.variant);
  const column = index % 2;
  const row = Math.floor(index / 2);
  const x = sheet.rows[0][column];
  const y = sheet.rows[1][row];
  const nextY = sheet.rows[1][row + 1] || sheet.height;
  const nextX = column === 0 ? sheet.rows[0][1] : sheet.width;
  return { sheet, x, y, w:nextX-x-(column===0?7:8), h:nextY-y-7 };
};

const unionBounds = (slots) => {
  if (!slots.length) return null;
  const x=Math.min(...slots.map((slot)=>slot.x)), y=Math.min(...slots.map((slot)=>slot.y));
  const right=Math.max(...slots.map((slot)=>slot.x+slot.w)), bottom=Math.max(...slots.map((slot)=>slot.y+slot.h));
  return { x:Math.max(0,x-.015), y:Math.max(0,y-.015), w:Math.min(1,right+.015)-Math.max(0,x-.015), h:Math.min(1,bottom+.015)-Math.max(0,y-.015) };
};

const compositionGuideFor = (layout, slots, kind) => {
  if (!slots.length) return null;
  const locked=LAYOUT_GUIDE_PRESETS[layout.id]?.[kind];
  let name=locked;
  if (kind === 'character') {
    const count=slots.length;
    if (!name && count>=3) name=layout.tags.includes('copy-right')?'character-3-left':layout.tags.includes('copy-left')?'character-3-right':layout.tags.includes('five-characters')?'character-3-lineup':'character-3-center';
    else if (!name && count===2) name=layout.tags.includes('duel')?'character-2-duel':layout.tags.includes('copy-right')?'character-2-left':layout.tags.includes('copy-left')?'character-2-right':'character-2-center';
    else if (!name) name=layout.tags.includes('action')?'character-1-action':layout.tags.includes('copy-left')?'character-1-right':layout.tags.includes('center')?'character-1-center':'character-1-left';
  } else if (!name) {
    name=layout.tags.includes('radial')?'item-radial':layout.tags.includes('five-items')?'item-five-row':layout.tags.includes('comparison')?'item-compare':layout.tags.includes('three-items')?'item-three-products':layout.tags.includes('cluster')?'item-hero-support':slots.length>=4?'item-crystal-cluster':'item-single';
  }
  if (name==='slot-aware') return null;
  return { kind:name?.startsWith('monster-')?'monster':kind, name, src:COMPOSITION_GUIDES[name], bounds:unionBounds(slots) };
};

const readFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve({ dataUrl:reader.result, name:file.name, type:file.type || 'image/png' });
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const downloadBlob = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
};

const dataUrlToBlob = async (url) => (await fetch(url)).blob();
const isPsd = (file) => file?.name?.toLowerCase().endsWith('.psd') || file?.type === 'image/vnd.adobe.photoshop';
const isImage = (file) => file?.type?.startsWith('image/') && !isPsd(file);
const estimateTextHeight = (config, value) => {
  const charsPerLine = Math.max(5, Math.floor((config?.w || .5) * 26));
  const lines = String(value || '').split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
  return Math.min(.22, Math.max(.035, lines * ((config?.size || 22) / BANNER_SIZE.height) * 1.18));
};

const RESOURCE_HINTS = {
  background:['background','bg','back','scene','landscape','배경','맵','환경'],
  character:['character','char','hero','npc','person','인물','캐릭터','영웅','주인공'],
  monster:['monster','boss','enemy','mob','몬스터','보스','적'],
  product:['item','reward','product','weapon','sword','box','chest','coin','crystal','icon','보상','아이템','무기','검','상자','코인','결정'],
  environment:['portal','gate','tower','mountain','environment','포탈','게이트','탑','산','랜드마크'],
  badge:['logo','badge','tag','neo','로고','배지','태그','네오'],
};

const resourceText = (item) => `${item.path || ''} ${item.name || ''}`.toLowerCase();
const hintScore = (text, hints) => hints.reduce((score, hint) => score + (text.includes(hint) ? 12 : 0), 0);
const scoreResourceForSlot = (item, slot) => {
  const text=resourceText(item);
  const role=slot.role === 'character' || slot.id === 'hero' || /^support-/.test(slot.id) ? 'character' : slot.role;
  let score=hintScore(text, RESOURCE_HINTS[role] || RESOURCE_HINTS.product);
  if (role === 'character') score += hintScore(text, RESOURCE_HINTS.monster) * (String(slot.label).includes('몬스터') ? 2 : -.5);
  score += hintScore(text, [slot.id, slot.label?.toLowerCase()].filter(Boolean));
  if (/thumb|thumbnail|preview|sample|시안/.test(text)) score -= 8;
  return score;
};

const buildAutomaticAssignments = (files, targetPreset) => {
  const unused=[...files];
  const takeBest=(score, minimum=-Infinity) => {
    if (!unused.length) return null;
    let bestIndex=0, bestScore=-Infinity;
    unused.forEach((item,index) => { const value=score(item); if(value>bestScore){bestScore=value;bestIndex=index;} });
    return bestScore >= minimum ? unused.splice(bestIndex,1)[0] : null;
  };
  const background=takeBest((item) => {
    const text=resourceText(item);
    return hintScore(text,RESOURCE_HINTS.background) - hintScore(text,[...RESOURCE_HINTS.character,...RESOURCE_HINTS.product,...RESOURCE_HINTS.badge]);
  },1);
  const slots={};
  targetPreset.slots.forEach((slot) => { const match=takeBest((item)=>scoreResourceForSlot(item,slot)); if(match) slots[slot.id]=match; });
  return { background, slots };
};

async function readSharedDirectory(directory, basePath = '') {
  const found = [];
  for await (const [name, handle] of directory.entries()) {
    const path = basePath ? `${basePath}/${name}` : name;
    if (handle.kind === 'directory') found.push(...await readSharedDirectory(handle, path));
    else {
      const file = await handle.getFile();
      if (isImage(file)) found.push({ file, name:file.name, path, url:URL.createObjectURL(file) });
    }
  }
  return found;
}

async function readRequest(file) {
  if (file.name.toLowerCase().endsWith('.docx')) {
    const mammothModule = await import('mammoth');
    const mammoth = mammothModule.default || mammothModule;
    return (await mammoth.extractRawText({ arrayBuffer:await file.arrayBuffer() })).value;
  }
  if (file.type?.startsWith('image/') || file.type === 'application/pdf') return '';
  return file.text();
}

export default function BannerCreator() {
  const [presetId, setPresetId] = useState(BANNER_LAYOUT_LIBRARY[0].id);
  const [layoutFamily, setLayoutFamily] = useState('all');
  const [background, setBackground] = useState(null);
  const [assets, setAssets] = useState({});
  const [title, setTitle] = useState('광기의 보물 상자');
  const [subtitle, setSubtitle] = useState('상자를 열고 특별한 보상을 획득하세요');
  const [period, setPeriod] = useState('2026. 3. 4.(수) 정기점검 후 ~ 2026. 3. 18.(수) 정기점검 전');
  const [badge, setBadge] = useState('네오');
  const [exporting, setExporting] = useState(false);
  const [psdFile, setPsdFile] = useState(null);
  const [requestFile, setRequestFile] = useState(null);
  const [requestText, setRequestText] = useState('');
  const [requestAnalysis, setRequestAnalysis] = useState(null);
  const [requestAnalyzing, setRequestAnalyzing] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [resourceFiles, setResourceFiles] = useState([]);
  const [selectedResource, setSelectedResource] = useState(null);
  const [resourceFolderName, setResourceFolderName] = useState('');
  const [resourceReading, setResourceReading] = useState(false);
  const [resourceError, setResourceError] = useState('');
  const [layoutOverrides, setLayoutOverrides] = useState({ slots:{}, groups:{}, texts:{} });
  const bgInput = useRef(null);
  const psdInput = useRef(null);
  const requestInput = useRef(null);
  const slotInputs = useRef({});
  const previewRef = useRef(null);
  const selectedLayout = useMemo(() => getLayoutById(presetId), [presetId]);
  const preset = useMemo(() => toPreset(selectedLayout), [selectedLayout]);
  const recommendedIds = useMemo(() => recommendLayouts(requestAnalysis || {}), [requestAnalysis]);
  const titleLayout = preset.title;
  const subtitleLayout = preset.subtitle;
  const periodLayout = preset.period;
  const effectiveSlots = preset.slots.map((slot) => ({ ...slot, ...layoutOverrides.slots[slot.id] }));
  const characterSlots = effectiveSlots.filter((slot) => slot.role === 'character' || slot.id === 'hero' || /^support-/.test(slot.id));
  const itemSlots = effectiveSlots.filter((slot) => ['product','reward','feature'].includes(slot.role));
  const environmentSlots = effectiveSlots.filter((slot) => slot.role === 'environment');
  const characterComposition = compositionGuideFor(selectedLayout,characterSlots,'character');
  const itemComposition = compositionGuideFor(selectedLayout,itemSlots,'item');
  const environmentName = LAYOUT_GUIDE_PRESETS[selectedLayout.id]?.environment;
  const environmentComposition = environmentName ? { kind:'environment', name:environmentName, bounds:unionBounds(environmentSlots.length?environmentSlots:[{x:0,y:0,w:1,h:1}]) } : null;
  const showCharacterComposition = characterComposition && !characterSlots.some((slot) => assets[slot.id]);
  const showItemComposition = itemComposition && !itemSlots.some((slot) => assets[slot.id]);
  const showEnvironmentComposition = environmentComposition && !background && !environmentSlots.some((slot) => assets[slot.id]);
  const effectiveGroups = (preset.groups || []).map((group) => ({ ...group, ...layoutOverrides.groups[group.id] }));
  const effectiveTitle = { ...titleLayout, ...layoutOverrides.texts.title };
  const titleHeight = estimateTextHeight(effectiveTitle, title);
  const rhythm = selectedLayout.rhythm || {};
  const relationalSubtitle = { ...subtitleLayout, y:Math.max(subtitleLayout.y, effectiveTitle.y + titleHeight + (rhythm.titleSubtitleGap || 0)) };
  const effectiveSubtitle = { ...relationalSubtitle, ...layoutOverrides.texts.subtitle };
  const subtitleHeight = estimateTextHeight(effectiveSubtitle, subtitle);
  const relationalPeriod = { ...periodLayout, y:Math.max(periodLayout.y, effectiveSubtitle.y + subtitleHeight + (rhythm.subtitlePeriodGap || 0)) };
  const effectivePeriod = { ...relationalPeriod, ...layoutOverrides.texts.period };
  const effectiveBadge = { x:.88, y:0, w:.12, h:.15, ...layoutOverrides.texts.badge };
  const resetLayout = () => setLayoutOverrides({ slots:{}, groups:{}, texts:{} });


  const startMove = (event, kind, id, item) => {
    const canvas = previewRef.current;
    if (!canvas) return;
    event.preventDefault(); event.stopPropagation();
    const rect = canvas.getBoundingClientRect();
    const startX = event.clientX, startY = event.clientY;
    const originX = Number(item.x) || 0, originY = Number(item.y) || 0;
    const maxX = Math.max(0, 1 - (Number(item.w) || .1));
    const maxY = Math.max(0, 1 - (Number(item.h) || .08));
    const move = (e) => {
      const x=Math.min(maxX,Math.max(0,originX+(e.clientX-startX)/rect.width));
      const y=Math.min(maxY,Math.max(0,originY+(e.clientY-startY)/rect.height));
      setLayoutOverrides((prev) => ({ ...prev, [kind]:{ ...prev[kind], [id]:{ ...prev[kind][id], x, y } } }));
    };
    const end = () => { window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',end); };
    window.addEventListener('pointermove',move); window.addEventListener('pointerup',end,{once:true});
  };

  const setImage = async (file, slotId) => {
    if (!file) return;
    if (isPsd(file)) {
      setPsdFile(file);
      return;
    }
    if (!file.type?.startsWith('image/')) return;
    const value = await readFile(file);
    if (slotId === 'background') setBackground(value);
    else setAssets((prev) => ({ ...prev, [slotId]:value }));
  };

  const setManyImages = async (files, preferredSlot) => {
    const valid = [...files].filter(isImage);
    if (!valid.length) return;
    const familyMatch = String(preferredSlot || '').match(/^(reward|package|step|fixed|bonus)-/);
    const candidates = preset.slots.map((slot) => slot.id).filter((id) => !familyMatch || id.startsWith(`${familyMatch[1]}-`));
    const slots = [preferredSlot, ...candidates].filter((id, i, all) => id && all.indexOf(id) === i);
    const values = await Promise.all(valid.slice(0, slots.length).map(readFile));
    setAssets((prev) => ({ ...prev, ...Object.fromEntries(values.map((value, i) => [slots[i], value])) }));
  };

  const handleRequest = async (file) => {
    if (!file) return;
    setRequestFile(file); setRequestAnalysis(null); setRequestError(''); setRequestAnalyzing(true);
    try {
      const text = await readRequest(file); setRequestText(text);
      const analysis = await analyzeBannerRequest(file, text); setRequestAnalysis(analysis);
      resetLayout();
      if (analysis.title) setTitle(analysis.title);
      if (analysis.subtitleVerbatim) setSubtitle(analysis.subtitleVerbatim);
      if (analysis.period) setPeriod(analysis.period);
      if (analysis.serviceBadge) setBadge(analysis.serviceBadge);
      const [recommended] = recommendLayouts(analysis);
      if (recommended) {
        setPresetId(recommended);
        if (resourceFiles.length) await generatePreviewFromResources(resourceFiles,toPreset(getLayoutById(recommended)));
      } else if (resourceFiles.length) await generatePreviewFromResources(resourceFiles,preset);
    } catch (error) { setRequestError(error.message || '요청서를 분석하지 못했습니다.'); }
    finally { setRequestAnalyzing(false); }
  };

  const shareResourceFolder = async () => {
    setResourceError('');
    if (!window.showDirectoryPicker) {
      setResourceError('이 브라우저는 폴더 공유를 지원하지 않습니다. Chrome 또는 Edge에서 열어주세요.');
      return;
    }
    try {
      const directory = await window.showDirectoryPicker({ mode:'read', id:'banner-creator-resources' });
      setResourceReading(true);
      const next = await readSharedDirectory(directory);
      resourceFiles.forEach((item) => URL.revokeObjectURL(item.url));
      setResourceFolderName(directory.name); setResourceFiles(next); setSelectedResource(next[0] || null);
      if (!next.length) setResourceError('공유한 폴더에서 지원되는 이미지 파일을 찾지 못했습니다.');
      else await generatePreviewFromResources(next,preset);
    } catch (error) {
      if (error?.name !== 'AbortError') setResourceError(error.message || '폴더를 읽지 못했습니다.');
    } finally { setResourceReading(false); }
  };

  const assignResource = async (slotId) => {
    if (!selectedResource) return;
    const value = await readFile(selectedResource.file);
    if (slotId === 'background') setBackground(value); else setAssets((prev) => ({ ...prev, [slotId]:value }));
  };

  const generatePreviewFromResources = async (files=resourceFiles, targetPreset=preset) => {
    if (!files.length) return;
    setResourceReading(true); setResourceError('');
    try {
      const assignment=buildAutomaticAssignments(files,targetPreset);
      const [nextBackground, ...slotValues]=await Promise.all([
        assignment.background ? readFile(assignment.background.file) : Promise.resolve(null),
        ...Object.entries(assignment.slots).map(async ([id,item]) => [id,await readFile(item.file)]),
      ]);
      setBackground(nextBackground);
      setAssets(Object.fromEntries(slotValues));
    } catch (error) { setResourceError(error.message || '리소스로 프리뷰를 만들지 못했습니다.'); }
    finally { setResourceReading(false); }
  };

  const manifest = () => ({
    $schema:'nexus-banner/figma-layout@2',
    name:title || '프로모션 배너', category:'game-promotion-banner',
    canvas:BANNER_SIZE, preset:{ id:preset.id, label:preset.label },
    layoutContract:{
      source:'figma-36-layout-library',
      layoutId:selectedLayout.id,
      family:selectedLayout.family,
      variant:selectedLayout.variant,
      safeArea:selectedLayout.safeArea,
      readingOrder:selectedLayout.readingOrder,
      textRhythm:selectedLayout.rhythm,
      characterCrop:selectedLayout.characterCrop || null,
    },
    outputs:BANNER_OUTPUT_SIZES,
    layers:[
      { id:'background', name:'01_BG', type:'image', file:background ? `assets/background_${background.name}` : null, x:0, y:0, w:1, h:1, fit:'cover' },
      ...effectiveGroups.flatMap((group, index) => [
        { ...group, name:`${String(index + 2).padStart(2,'0')}_${group.label}_PANEL`, type:'panel' },
        { id:`${group.id}-label`, name:`${String(index + 2).padStart(2,'0')}_${group.label}_LABEL`, type:'text', value:group.label, x:group.x+.08, y:group.y-.055, w:Math.max(.14,group.w-.16), align:'center', size:24 },
      ]),
      ...effectiveSlots.map((s, i) => ({ ...s, name:`${String(i + 2).padStart(2, '0')}_${s.label}`, type:'image', file:assets[s.id] ? `assets/${s.id}_${assets[s.id].name}` : null })),
      { id:'title', name:'90_TITLE', type:'text', value:title, ...effectiveTitle },
      { id:'subtitle', name:'91_SUBTITLE', type:'text', value:subtitle, ...effectiveSubtitle },
      { id:'period', name:'92_PERIOD', type:'text', value:period, ...effectivePeriod },
      { id:'badge', name:'93_BADGE', type:'text', value:badge, ...effectiveBadge, align:'center' },
    ],
    notes:['좌표와 크기는 0~1 정규화 값', '이미지 생성은 배경과 오브젝트 레이어를 분리 유지', 'Figma 플러그인에서 캔버스 크기에 곱해 배치'],
  });

  const exportFigmaPackage = async () => {
    setExporting(true);
    try {
      const zip = new JSZip();
      zip.file('banner-layout.json', JSON.stringify(manifest(), null, 2));
      if (selectedLayout.characterCrop) zip.file('character-crop-contract.json', JSON.stringify({ frame:'1180x750_Notice', ...selectedLayout.characterCrop }, null, 2));
      if (background) zip.file(`assets/background_${background.name}`, await dataUrlToBlob(background.dataUrl));
      for (const slot of preset.slots) {
        const asset = assets[slot.id];
        if (asset) zip.file(`assets/${slot.id}_${asset.name}`, await dataUrlToBlob(asset.dataUrl));
      }
      zip.file('README.txt', 'banner-layout.json을 Figma 플러그인에서 불러오세요. 모든 좌표는 캔버스 대비 0~1 비율입니다. 누락 슬롯은 Figma에서 교체할 수 있습니다.');
      downloadBlob(await zip.generateAsync({ type:'blob' }), `banner_${preset.id}_${Date.now()}.zip`);
    } finally { setExporting(false); }
  };

  const exportFigmaJson = async () => {
    const data = manifest();
    data.embeddedAssets = {
      ...(background ? { background:background.dataUrl } : {}),
      ...Object.fromEntries(Object.entries(assets).map(([id, asset]) => [id, asset.dataUrl])),
    };
    downloadBlob(new Blob([JSON.stringify(data)], { type:'application/json' }), `banner_figma_${preset.id}.json`);
  };

  return <div style={{ height:'100%', display:'grid', gridTemplateColumns:'minmax(320px, 0.85fr) minmax(480px, 1.4fr)', background:T.bg, color:T.text, overflow:'hidden', fontFamily:"'Noto Sans KR', sans-serif" }}>
    <aside style={{ overflowY:'auto', padding:24, borderRight:`1px solid ${T.line}` }}>
      <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:6 }}><PackageOpen size={19} color={T.accent}/><b style={{ fontSize:16 }}>배너 레이아웃 설계</b></div>
      <p style={{ margin:'0 0 24px', color:T.muted, fontSize:11, lineHeight:1.6 }}>문서와 리소스 폴더를 넣으면 36개 검증 레이아웃 중 적합한 구도를 골라 프리뷰를 자동 생성합니다.</p>

      <Label>1. 제작 요청서 파악</Label>
      <UploadRow label={requestAnalyzing?'비전 AI가 요청서를 읽는 중…':requestFile?.name || '제작 요청서 업로드'} sub="이미지 · PDF · DOCX · TXT" active={!!requestFile} icon={requestAnalyzing?<Loader2 size={14} className="animate-spin"/>:<FileText size={14}/>} onClick={() => requestInput.current?.click()} onDrop={(files) => handleRequest(files[0])} onClear={requestFile ? () => { setRequestFile(null); setRequestText(''); setRequestAnalysis(null); setRequestError(''); } : null}/>
      <input ref={requestInput} hidden type="file" accept="image/*,.pdf,.docx,.txt,application/pdf,text/plain" onChange={(e) => { const file=e.target.files?.[0]; e.target.value=''; handleRequest(file); }}/>
      {requestError && <div style={{ color:'#FDA4AF', fontSize:10, margin:'-2px 0 15px' }}>{requestError}</div>}
      {requestAnalysis && <RequestAnalysis analysis={requestAnalysis}/>}
      {requestText && <details style={{ margin:'-1px 0 22px', borderLeft:`2px solid ${T.line}`, paddingLeft:10 }}><summary style={{ color:T.muted, fontSize:10, cursor:'pointer' }}>추출 내용 확인·수정</summary><textarea value={requestText} onChange={(e) => setRequestText(e.target.value)} rows={7} style={{ width:'100%', boxSizing:'border-box', marginTop:8, background:T.panel, color:T.text, border:`1px solid ${T.line}`, borderRadius:7, padding:9, fontSize:10, resize:'vertical' }}/></details>}

      <Label>2. 리소스 폴더 입력</Label>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
        <UploadRow compact label="PSD 파일 열기" icon={<Layers size={14}/>} onClick={() => psdInput.current?.click()}/>
        <UploadRow compact label={resourceReading?'폴더 읽는 중…':resourceFolderName || '리소스 폴더 공유'} icon={resourceReading?<Loader2 size={14} className="animate-spin"/>:<FolderOpen size={14}/>} onClick={shareResourceFolder}/>
      </div>
      <input ref={psdInput} hidden type="file" accept=".psd,image/vnd.adobe.photoshop" onChange={(e) => { const file=e.target.files?.[0]; e.target.value=''; if(file) setPsdFile(file); }}/>
      {resourceError && <div style={{ color:'#FDA4AF', fontSize:10, margin:'-2px 0 12px' }}>{resourceError}</div>}
      {resourceFiles.length > 0 && <button onClick={() => generatePreviewFromResources()} disabled={resourceReading} style={{ width:'100%', margin:'0 0 9px', padding:'10px 12px', border:0, borderRadius:8, background:'rgba(225,112,85,.14)', color:T.accent, fontSize:11, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}><Sparkles size={14}/>{resourceReading?'프리뷰 생성 중…':`${resourceFiles.length}개 리소스로 다시 그리기`}</button>}
      {resourceFiles.length > 0 && <ResourceLibrary files={resourceFiles} selected={selectedResource} onSelect={setSelectedResource} slots={preset.slots} onAssign={assignResource}/>}

      <Label>3. 자동 선택된 레이아웃</Label>
      <LayoutLibraryPicker selectedId={presetId} family={layoutFamily} onFamily={setLayoutFamily} recommendedIds={recommendedIds} onSelect={(id) => { setPresetId(id); resetLayout(); if(resourceFiles.length) generatePreviewFromResources(resourceFiles,toPreset(getLayoutById(id))); }}/>

      <Label>4. 자동 배치 보정</Label>
      <UploadRow label={background ? background.name : '배경 이미지 업로드 또는 드롭'} active={!!background} onClick={() => bgInput.current?.click()} onDrop={(files) => setImage(files[0], 'background')} onClear={background ? () => setBackground(null) : null}/>
      <input ref={bgInput} hidden type="file" accept="image/*" onChange={(e) => { const file=e.target.files?.[0]; e.target.value=''; setImage(file, 'background'); }}/>

      <Label>5. 오브젝트·보상 슬롯</Label>
      <div style={{ display:'grid', gap:7, marginBottom:24 }}>{preset.slots.map((slot) => <div key={slot.id}>
        <UploadRow label={assets[slot.id]?.name || `${slot.label} 이미지 드롭`} sub={`${Math.round(slot.w*100)}% × ${Math.round(slot.h*100)}%`} active={!!assets[slot.id]} onClick={() => slotInputs.current[slot.id]?.click()} onDrop={(files) => setManyImages(files, slot.id)} onClear={assets[slot.id] ? () => setAssets((prev) => { const next={...prev}; delete next[slot.id]; return next; }) : null}/>
        <input ref={(el) => { slotInputs.current[slot.id]=el; }} hidden type="file" accept="image/*" multiple onChange={(e) => { const files=e.target.files; e.target.value=''; setManyImages(files, slot.id); }}/>
      </div>)}</div>

      <Label>6. 배너 데이터</Label>
      <Field label="타이틀" value={title} onChange={setTitle}/><Field label="설명" value={subtitle} onChange={setSubtitle}/><Field label="기간" value={period} onChange={setPeriod}/><Field label="우측 배지" value={badge} onChange={setBadge}/>

      <button onClick={exportFigmaJson} style={{ width:'100%', marginTop:8, padding:'12px 14px', border:0, borderRadius:9, background:T.accent, color:'#190B08', fontWeight:800, cursor:'pointer', display:'flex', justifyContent:'center', alignItems:'center', gap:8 }}><Download size={15}/>Figma 자동 생성 파일</button>
      <button onClick={exportFigmaPackage} disabled={exporting} style={{ width:'100%', marginTop:8, padding:'10px 14px', border:`1px solid ${T.line}`, borderRadius:9, background:T.panel, color:T.text, fontWeight:700, cursor:'pointer', display:'flex', justifyContent:'center', alignItems:'center', gap:8 }}><Download size={14}/>{exporting ? '패키지 만드는 중…' : '에셋 ZIP 별도 저장'}</button>
    </aside>

    <main style={{ minWidth:0, overflow:'auto', padding:'24px clamp(20px, 4vw, 56px)', display:'flex', flexDirection:'column', justifyContent:'center' }}>
      <div style={{ display:'flex', alignItems:'end', justifyContent:'space-between', gap:18, marginBottom:12 }}><div style={{ minWidth:0 }}><Label>구도 미리보기 · 요소를 드래그해서 이동</Label><b>{preset.label}</b><div style={{ color:T.muted, fontSize:10, marginTop:4 }}>{selectedLayout.description}</div></div><div style={{ display:'flex', alignItems:'end', gap:12 }}><div style={{ width:180, border:`1px solid ${T.line}`, borderRadius:7, overflow:'hidden', boxShadow:'0 8px 20px rgba(0,0,0,.25)' }}><LayoutMini layout={selectedLayout}/></div><div style={{ display:'grid', justifyItems:'end', gap:7 }}><button onClick={resetLayout} style={{ border:0, background:'none', color:T.muted, fontSize:10, cursor:'pointer' }}>배치 초기화</button><span style={{ color:T.muted, fontSize:10 }}>{BANNER_SIZE.width} × {BANNER_SIZE.height}</span></div></div></div>
      <div ref={previewRef} style={{ position:'relative', width:'100%', aspectRatio:`${BANNER_SIZE.width}/${BANNER_SIZE.height}`, overflow:'hidden', background:'#202127', boxShadow:'0 18px 50px rgba(0,0,0,.35)', touchAction:'none' }}>
        {background
          ? <img src={background.dataUrl} alt="배경" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }}/>
          : <EmptyBackground onClick={() => bgInput.current?.click()}/>
        }
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,rgba(0,0,0,.03),rgba(0,0,0,.42))' }}/>
        {showEnvironmentComposition && <CompositionGuide guide={environmentComposition}/>} 
        {showCharacterComposition && <CompositionGuide guide={characterComposition}/>} 
        {showItemComposition && <CompositionGuide guide={itemComposition}/>} 
        {effectiveGroups.map((group) => <PreviewGroup key={group.id} group={group} onMove={(e) => startMove(e,'groups',group.id,group)}/>)}
        {effectiveSlots.map((slot) => <PreviewSlot key={slot.id} slot={slot} asset={assets[slot.id]} sketchMode={!background} compositionCovered={(showCharacterComposition&&characterSlots.includes(slot))||(showItemComposition&&itemSlots.includes(slot))||(showEnvironmentComposition&&environmentSlots.includes(slot))} onMove={(e) => startMove(e,'slots',slot.id,slot)}/>)}
        <PreviewText config={effectiveTitle} value={title || '타이틀'} kind="title" sketchMode={!background} weight={900} onMove={(e) => startMove(e,'texts','title',effectiveTitle)}/><PreviewText config={effectiveSubtitle} value={subtitle || '설명 문구'} kind="subtitle" sketchMode={!background} weight={500} onMove={(e) => startMove(e,'texts','subtitle',effectiveSubtitle)}/><PreviewText config={effectivePeriod} value={period || '프로모션 기간'} kind="period" sketchMode={!background} weight={500} onMove={(e) => startMove(e,'texts','period',effectivePeriod)}/>
        <PreviewBadge config={effectiveBadge} value={badge} onMove={(e) => startMove(e,'texts','badge',effectiveBadge)}/>
      </div>
      <div style={{ marginTop:14, display:'flex', flexWrap:'wrap', gap:18, color:T.muted, fontSize:10 }}><span><Check size={11} style={{ display:'inline', marginRight:5 }}/>36개 샘플 계약</span><span><Check size={11} style={{ display:'inline', marginRight:5 }}/>텍스트 관계 간격</span><span><Check size={11} style={{ display:'inline', marginRight:5 }}/>캐릭터 크롭 계약</span><span><Check size={11} style={{ display:'inline', marginRight:5 }}/>Figma JSON·ZIP</span></div>
    </main>
    {psdFile && <PsdImportModal
      T={T}
      accent={T.accent}
      file={psdFile}
      slots={[{ id:'background', t:'배경' }, ...preset.slots.map((slot) => ({ id:slot.id, t:slot.label }))]}
      onClose={() => setPsdFile(null)}
      onAdd={(slotId, dataUrl) => {
        const value = { dataUrl, name:`${slotId}_from_psd.png`, type:'image/png' };
        if (slotId === 'background') setBackground(value);
        else setAssets((prev) => ({ ...prev, [slotId]:value }));
        setPsdFile(null);
      }}
    />}
  </div>;
}

function LayoutLibraryPicker({ selectedId, family, onFamily, recommendedIds, onSelect }) {
  const layouts = family === 'all' ? BANNER_LAYOUT_LIBRARY : BANNER_LAYOUT_LIBRARY.filter((layout) => layout.family === family);
  return <div style={{ marginBottom:24 }}>
    <div style={{ display:'flex', gap:5, marginBottom:8 }}>
      {['all','01','02','03','04'].map((id) => <button key={id} onClick={() => onFamily(id)} style={{ flex:1, padding:'6px 4px', borderRadius:6, border:`1px solid ${family===id?T.accent:T.line}`, background:family===id?'rgba(225,112,85,.12)':T.panel, color:family===id?T.text:T.muted, fontSize:9, cursor:'pointer' }}>{id === 'all' ? '전체' : `${id}형`}</button>)}
    </div>
    {!!recommendedIds.length && <div style={{ color:T.muted, fontSize:9, marginBottom:7 }}>추천: {recommendedIds.map((id) => getLayoutById(id)).map((layout) => `${layout.family}-${layout.variant}`).join(' · ')}</div>}
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, maxHeight:360, overflowY:'auto', paddingRight:3 }}>
      {layouts.map((layout) => {
        const selected = layout.id === selectedId;
        const recommended = recommendedIds.includes(layout.id);
        return <button key={layout.id} onClick={() => onSelect(layout.id)} title={`${layout.name}\n${layout.description}`} style={{ position:'relative', padding:5, borderRadius:7, border:`1px solid ${selected?T.accent:recommended?'#777A84':T.line}`, background:selected?'rgba(225,112,85,.12)':T.panel, color:T.text, cursor:'pointer', textAlign:'left' }}>
          {recommended && <span style={{ position:'absolute', right:4, top:4, zIndex:2, padding:'2px 4px', borderRadius:4, background:T.accent, color:'#170A07', fontSize:7, fontWeight:900 }}>추천</span>}
          <LayoutMini layout={layout}/>
          <b style={{ display:'block', marginTop:5, fontSize:9 }}>{layout.family}-{layout.variant}</b>
          <span style={{ display:'block', marginTop:2, color:T.muted, fontSize:8, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{layout.name}</span>
        </button>;
      })}
    </div>
  </div>;
}

function LayoutMini({ layout }) {
  const crop = getSketchCrop(layout);
  return <div style={{ position:'relative', width:'100%', aspectRatio:`${crop.w}/${crop.h}`, overflow:'hidden', borderRadius:4, background:'#F4F4F2' }}>
    <img src={crop.sheet.src} alt={`${layout.family}-${layout.variant} 레이아웃 스케치`} draggable="false" style={{ position:'absolute', width:`${crop.sheet.width/crop.w*100}%`, height:'auto', maxWidth:'none', left:`${-crop.x/crop.w*100}%`, top:`${-crop.y/crop.h*100}%`, filter:'contrast(1.04)', pointerEvents:'none' }}/>
  </div>;
}

function Label({ children }) { return <div style={{ color:T.muted, fontSize:10, fontWeight:800, letterSpacing:'.08em', margin:'0 0 9px' }}>{children}</div>; }
function RequestAnalysis({ analysis }) {
  return <div style={{ margin:'-1px 0 14px', padding:'11px 12px', borderRadius:8, background:'rgba(225,112,85,.07)', border:'1px solid rgba(225,112,85,.22)' }}>
    <div style={{ display:'flex', alignItems:'center', gap:6, color:T.accent, fontSize:10, fontWeight:800, marginBottom:8 }}><Check size={12}/>비전 AI 분석 완료 · 신뢰도 {Math.round((analysis.confidence || 0) * 100)}%</div>
    <div style={{ display:'grid', gap:6, fontSize:10, lineHeight:1.5 }}>
      <AnalysisLine label="제목" value={analysis.title}/><AnalysisLine label="서브타이틀 원문" value={analysis.subtitleVerbatim}/><AnalysisLine label="핵심 내용" value={analysis.mainMessage}/><AnalysisLine label="대표 오브젝트" value={analysis.mainObject}/><AnalysisLine label="추천 구도" value={analysis.compositionReason}/>
      {!!analysis.rewards?.length && <AnalysisLine label={`보상 ${analysis.rewards.length}개`} value={analysis.rewards.join(' · ')}/>}
      {!!analysis.cautions?.length && <AnalysisLine label="주의" value={analysis.cautions.join(' · ')}/>}
    </div>
  </div>;
}
function AnalysisLine({ label, value }) { if (!value) return null; return <div><b style={{ color:T.text, marginRight:7 }}>{label}</b><span style={{ color:T.muted }}>{value}</span></div>; }
function Field({ label, value, onChange }) { return <label style={{ display:'block', marginBottom:10 }}><span style={{ display:'block', color:T.muted, fontSize:10, marginBottom:5 }}>{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} style={{ width:'100%', boxSizing:'border-box', padding:'10px 11px', borderRadius:8, border:`1px solid ${T.line}`, background:T.panel, color:T.text, outline:'none' }}/></label>; }
function UploadRow({ label, sub, active, onClick, onClear, onDrop, icon, compact }) {
  const [drag, setDrag] = useState(false);
  return <div
    onDragOver={onDrop ? (e) => { e.preventDefault(); setDrag(true); } : undefined}
    onDragLeave={onDrop ? () => setDrag(false) : undefined}
    onDrop={onDrop ? (e) => { e.preventDefault(); setDrag(false); onDrop([...e.dataTransfer.files]); } : undefined}
    style={{ display:'flex', alignItems:'center', gap:9, padding:compact?'9px':'9px 10px', marginBottom:8, border:`1px ${drag?'dashed':'solid'} ${drag ? T.accent : active ? '#4E5058' : T.line}`, borderRadius:8, background:drag?'rgba(225,112,85,.08)':T.panel }}>
    <button onClick={onClick} style={{ flex:1, minWidth:0, border:0, background:'none', color:active ? T.text:T.muted, display:'flex', alignItems:'center', justifyContent:compact?'center':'flex-start', gap:8, cursor:'pointer', textAlign:'left' }}>
      {icon || (active ? <ImagePlus size={14}/> : <Upload size={14}/>)}<span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:11 }}>{drag?'여기에 놓기':label}</span>{sub && <small style={{ marginLeft:'auto', color:'#666972' }}>{sub}</small>}
    </button>{onClear && <button onClick={onClear} title="삭제" style={{ border:0, background:'none', color:T.muted, cursor:'pointer' }}><X size={13}/></button>}
  </div>;
}

function ResourceLibrary({ files, selected, onSelect, slots, onAssign }) {
  return <details open style={{ margin:'2px 0 22px', border:`1px solid ${T.line}`, borderRadius:9, background:T.panel, overflow:'hidden' }}>
    <summary style={{ padding:'10px 11px', color:T.muted, fontSize:10, cursor:'pointer' }}>폴더 이미지 {files.length}개 · 클릭해서 배치</summary>
    <div style={{ maxHeight:230, overflowY:'auto', padding:8, display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
      {files.map((item) => <button key={item.path} title={item.path} onClick={() => onSelect(item)} style={{ aspectRatio:'1', padding:2, border:`1px solid ${selected===item?T.accent:T.line}`, borderRadius:6, background:'#0D0E10', overflow:'hidden', cursor:'pointer' }}><img src={item.url} alt={item.name} style={{ width:'100%', height:'100%', objectFit:'contain' }}/></button>)}
    </div>
    {selected && <div style={{ borderTop:`1px solid ${T.line}`, padding:9 }}>
      <div title={selected.path} style={{ color:T.text, fontSize:10, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:8 }}>{selected.name}</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}><button onClick={() => onAssign('background')} style={assignButton}>배경</button>{slots.map((slot) => <button key={slot.id} onClick={() => onAssign(slot.id)} style={assignButton}>{slot.label}</button>)}</div>
    </div>}
  </details>;
}

const assignButton = { padding:'5px 8px', borderRadius:6, border:`1px solid ${T.line}`, background:'#202126', color:T.text, fontSize:9, cursor:'pointer' };
function EmptyBackground({ onClick }) { return <button onClick={onClick} title="배경 이미지 업로드" style={{ position:'absolute', inset:0, border:0, background:'radial-gradient(circle at 50% 45%,#F7F7F4,#D9DBDC 72%)', color:'#777A80', cursor:'pointer' }}><div style={{ position:'absolute', inset:'3.5%', border:'1px dashed rgba(42,44,48,.25)' }}/><div style={{ position:'absolute', left:'50%', top:'50%', width:'70%', height:1, background:'rgba(42,44,48,.08)', transform:'translate(-50%,-50%) rotate(-8deg)' }}/><div style={{ position:'absolute', right:12, bottom:10, display:'flex', alignItems:'center', gap:5, fontSize:9 }}><ImagePlus size={11}/>배경 업로드</div></button>; }
function PreviewBadge({ config, value, onMove }) { return <div onPointerDown={onMove} title="배지 · 드래그해서 이동" style={{ position:'absolute', left:`${config.x*100}%`, top:`${config.y*100}%`, width:`${config.w*100}%`, height:`${config.h*100}%`, background:'#42C7EA', clipPath:'polygon(0 0,100% 0,100% 100%)', color:'#FFF', fontWeight:900, fontSize:'clamp(8px,1.8vw,22px)', textAlign:'right', padding:'2% 1% 0 0', boxSizing:'border-box', textShadow:'0 2px 3px #000', cursor:'grab', userSelect:'none' }}>{value}</div>; }
function PreviewGroup({ group, onMove }) { return <><div onPointerDown={onMove} title="드래그해서 이동" style={{ position:'absolute', left:`${group.x*100}%`, top:`${group.y*100}%`, width:`${group.w*100}%`, height:`${group.h*100}%`, background:group.color || 'rgba(12,92,116,.88)', border:'1px solid rgba(255,255,255,.18)', cursor:'grab' }}/><div onPointerDown={onMove} style={{ position:'absolute', left:`${(group.x+.08)*100}%`, top:`${(group.y-.055)*100}%`, width:`${Math.max(.14,group.w-.16)*100}%`, padding:'1.2% 0', background:'rgba(73,75,84,.95)', color:'#FFF', textAlign:'center', fontWeight:800, fontSize:'clamp(8px,1.4vw,18px)', cursor:'grab' }}>{group.label}</div></>; }
function CompositionGuide({ guide }) {
  const { bounds }=guide;
  return <div title={`${guide.name} 완성 구성 프리셋`} style={{ position:'absolute', left:`${bounds.x*100}%`, top:`${bounds.y*100}%`, width:`${bounds.w*100}%`, height:`${bounds.h*100}%`, pointerEvents:'none' }}>
    {guide.kind==='monster' ? <MonsterGuide variant={guide.name}/> : guide.kind==='environment' ? <EnvironmentGuide variant={guide.name}/> : <img src={guide.src} alt={guide.name} draggable="false" style={{ width:'100%', height:'100%', objectFit:'contain', objectPosition:'center', opacity:.9 }}/>} 
  </div>;
}
function MonsterGuide({ variant }) {
  const background=variant==='monster-background';
  return <svg viewBox="0 0 200 160" preserveAspectRatio="xMidYMid slice" style={{ width:'100%', height:'100%', overflow:'visible', opacity:.88 }} aria-label={variant}>
    <g fill="#44474D" stroke="#24262A" strokeWidth="2">
      <path d="M66 54 44 10l39 26c9-7 25-7 34 0l39-26-22 44 21 31-28 3-9 52H82L73 88l-28-3Z"/>
      <path d="m79 48 21-18 21 18-8 30-13 12-13-12Z" fill="#696C72"/>
      <path d="m84 59 11 3-10 6Zm32 0-11 3 10 6Z" fill="#E4E5E2" stroke="none"/>
      <path d="M75 91 30 113 2 151l67-18 31 24 31-24 67 18-28-38-45-22-10 53H85Z" opacity=".92"/>
      {background && <path d="M42 82 3 54l28 47-29 12 52 11M158 82l39-28-28 47 29 12-52 11" fill="none" strokeWidth="7"/>}
    </g>
  </svg>;
}
function EnvironmentGuide({ variant }) {
  const portal=variant==='portal-landmark';
  return <svg viewBox="0 0 1180 750" preserveAspectRatio="none" style={{ width:'100%', height:'100%', opacity:.48 }} aria-label={variant}>
    <g fill="none" stroke="#55585E" strokeWidth="8">
      {portal ? <>
        <path d="M230 650V270Q590-40 950 270v380M310 650V300Q590 70 870 300v350"/>
        <circle cx="590" cy="325" r="150" strokeWidth="18"/><circle cx="590" cy="325" r="112" strokeWidth="3" strokeDasharray="12 14"/>
        <path d="m590 175 26 70 73-5-57 46 27 68-69-39-69 39 27-68-57-46 73 5Z" fill="#888B91" opacity=".22"/>
        <path d="M90 690 420 430M1090 690 760 430M310 650h560" strokeWidth="4"/>
      </> : <>
        <path d="M0 520 170 220l110 190 170-340 145 315 140-260 150 320 135-225 100 300v230H0Z" fill="#8D9095" opacity=".27" stroke="none"/>
        <path d="M0 610 180 470l145 70 210-180 170 155 155-95 320 190M0 680h1180"/>
        <path d="M510 750 590 400l80 350" strokeWidth="3"/>
      </>}
    </g>
  </svg>;
}
function PreviewSlot({ slot, asset, sketchMode, compositionCovered, onMove }) {
  return <button onPointerDown={onMove} title={`${slot.label} · 드래그해서 이동`} style={{ position:'absolute', left:`${slot.x*100}%`, top:`${slot.y*100}%`, width:`${slot.w*100}%`, height:`${slot.h*100}%`, border:asset?'0':sketchMode?'0':'1px dashed rgba(255,255,255,.3)', borderRadius:slot.ring?'50%':0, background:asset?'transparent':slot.ring?'radial-gradient(circle,rgba(70,72,77,.12),rgba(40,42,46,.04) 55%,rgba(70,72,77,.3) 57%,transparent 61%)':'transparent', cursor:'grab', padding:0, overflow:'hidden' }}>
    {asset ? <img src={asset.dataUrl} alt={slot.label} draggable="false" style={{ width:'100%', height:'100%', objectFit:slot.fit === 'cover-from-landmarks' ? 'cover' : (slot.fit || 'contain'), objectPosition:slot.focus || 'center', pointerEvents:'none' }}/>
      : compositionCovered ? null
      : <ObjectPlaceholder slot={slot}/>} 
  </button>;
}

function ObjectPlaceholder({ slot }) {
  const product=slot.role==='product'||/box|product|상품|상자/i.test(`${slot.id} ${slot.label}`);
  const variant=Number(String(slot.id).match(/\d+/)?.[0]||1)%4;
  return <div style={{ position:'absolute', inset:'4%', display:'grid', placeItems:'center' }}>
    <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%', filter:'drop-shadow(0 5px 5px rgba(0,0,0,.2))' }} aria-label={slot.label}>
      <g fill="#666970" stroke="#292B30" strokeWidth="3" strokeLinejoin="round">
        {product ? <><path d="M16 37h68v48H16Z"/><path d="M12 38q4-25 20-25h36q16 0 20 25Z" fill="#85888E"/><path d="M45 13h10v72H45Z" fill="#A5A8AC"/><path d="m39 48 11-10 11 10-5 18H44Z" fill="#D0D2D2"/></>
          : variant===0 ? <><path d="M30 25h40l8 18-8 43H30l-8-43Z"/><path d="M31 25q19-19 38 0" fill="none"/><circle cx="50" cy="57" r="10" fill="#C9CBCC"/></>
          : variant===1 ? <><path d="m50 8 24 31-24 53-24-53Z" fill="#92959A"/><path d="m50 8 8 31-8 53-8-53Z" fill="#D2D3D3"/></>
          : variant===2 ? <><circle cx="50" cy="53" r="34"/><circle cx="50" cy="53" r="24" fill="#AEB0B3"/><path d="m50 34 7 13 15 2-11 10 3 15-14-7-14 7 3-15-11-10 15-2Z" fill="#E0E1E0"/></>
          : <><path d="M20 37h60v48H20Z"/><path d="M14 27h72v18H14Z" fill="#999CA1"/><path d="M45 27h10v58H45Z" fill="#D5D6D5"/><path d="M50 27q-18-24-27-6 5 9 27 6Zm0 0q18-24 27-6-5 9-27 6Z"/></>}
      </g>
    </svg>
    <span style={{ position:'absolute', bottom:0, maxWidth:'90%', padding:'2px 4px', borderRadius:3, background:'rgba(28,29,32,.58)', color:'#FFF', fontSize:'clamp(6px,.65vw,9px)', fontWeight:700, lineHeight:1.1, textAlign:'center' }}>{slot.label}</span>
  </div>;
}

function PreviewText({ config, value, kind, sketchMode, weight, onMove }) {
  const clamp01 = (n, fallback) => Math.min(1, Math.max(0, Number.isFinite(Number(n)) ? Number(n) : fallback));
  const lines = String(value || '').split('\n');
  const longest = Math.max(1, ...lines.map((line) => line.length));
  const fit = Math.min(1, Math.sqrt(28 / longest));
  const size = Math.max(8, (Number(config?.size) || 22) * fit);
  const massHeight = Math.max(kind==='title' ? 8 : 3, estimateTextHeight(config,value) * BANNER_SIZE.height);
  return <div onPointerDown={onMove} title="드래그해서 이동" style={{ position:'absolute', left:`${clamp01(config?.x,0)*100}%`, top:`${clamp01(config?.y,0)*100}%`, width:`${Math.max(.08,clamp01(config?.w,.5))*100}%`, minHeight:sketchMode?massHeight:undefined, padding:sketchMode?(kind==='title'?'1.4% 1%':'.35% 1%'):0, boxSizing:'border-box', background:sketchMode?(kind==='title'?'linear-gradient(120deg,#222429,#55585E)':'rgba(72,75,81,.72)'):'transparent', clipPath:sketchMode&&kind==='title'?'polygon(5% 0,100% 0,95% 100%,0 100%)':undefined, color:'#FFF', textAlign:config?.align || 'center', fontWeight:weight, fontSize:`clamp(8px, ${size/28}vw, ${size}px)`, lineHeight:1.15, textShadow:sketchMode?'none':'0 3px 8px #000,0 1px 2px #000', whiteSpace:'pre-wrap', overflow:'visible', wordBreak:'keep-all', cursor:'grab', userSelect:'none' }}>{value}</div>;
}
