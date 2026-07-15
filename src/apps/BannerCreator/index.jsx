import { useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { Check, Download, FileText, FolderOpen, ImagePlus, Layers, Loader2, PackageOpen, Upload, X } from 'lucide-react';
import { BANNER_OUTPUT_SIZES, BANNER_SIZE, BOX_BANNER_PRESETS } from './presets';
import PsdImportModal from '../NexusPreview/components/PsdImportModal';
import { analyzeBannerRequest } from './requestVision';

const T = {
  bg:'#101113', panel:'#17181B', surface:'#17181B', line:'#292B31', border:'#292B31',
  text:'#F4F4F5', muted:'#94969E', textMuted:'#94969E', textDim:'#666972', accent:'#E17055',
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
  const [presetId, setPresetId] = useState(BOX_BANNER_PRESETS[0].id);
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
  const preset = useMemo(() => BOX_BANNER_PRESETS.find((p) => p.id === presetId) || BOX_BANNER_PRESETS[0], [presetId]);
  const documentLayout = requestAnalysis?.layout;
  const titleLayout = documentLayout?.title || preset.title;
  const subtitleLayout = documentLayout?.subtitle || preset.subtitle;
  const periodLayout = documentLayout?.period || preset.period;
  const effectiveSlots = preset.slots.map((slot) => ({ ...slot, ...layoutOverrides.slots[slot.id] }));
  const effectiveGroups = (preset.groups || []).map((group) => ({ ...group, ...layoutOverrides.groups[group.id] }));
  const effectiveTitle = { ...titleLayout, ...layoutOverrides.texts.title };
  const effectiveSubtitle = { ...subtitleLayout, ...layoutOverrides.texts.subtitle };
  const effectivePeriod = { ...periodLayout, ...layoutOverrides.texts.period };
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
      const presetMap = { character:'character_showcase', three_products:'three_packages', copy_first:'copy_first', radial_rewards:'radial_rewards', character_reward_table:'character_reward_table' };
      if (presetMap[analysis.visualPriority]) setPresetId(presetMap[analysis.visualPriority]);
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
    } catch (error) {
      if (error?.name !== 'AbortError') setResourceError(error.message || '폴더를 읽지 못했습니다.');
    } finally { setResourceReading(false); }
  };

  const assignResource = async (slotId) => {
    if (!selectedResource) return;
    const value = await readFile(selectedResource.file);
    if (slotId === 'background') setBackground(value); else setAssets((prev) => ({ ...prev, [slotId]:value }));
  };

  const manifest = () => ({
    $schema:'nexus-banner/figma-layout@1',
    name:title || '상자 프로모션 배너', category:'box-item-banner',
    canvas:BANNER_SIZE, preset:{ id:preset.id, label:preset.label },
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
    downloadBlob(new Blob([JSON.stringify(data)], { type:'application/json' }), `banner_figma_${preset.id}_${Date.now()}.json`);
  };

  return <div style={{ height:'100%', display:'grid', gridTemplateColumns:'minmax(320px, 0.85fr) minmax(480px, 1.4fr)', background:T.bg, color:T.text, overflow:'hidden', fontFamily:"'Noto Sans KR', sans-serif" }}>
    <aside style={{ overflowY:'auto', padding:24, borderRight:`1px solid ${T.line}` }}>
      <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:6 }}><PackageOpen size={19} color={T.accent}/><b style={{ fontSize:16 }}>상자 배너 설계</b></div>
      <p style={{ margin:'0 0 24px', color:T.muted, fontSize:11, lineHeight:1.6 }}>구도와 데이터를 정하고 Figma에서 최종 조립합니다.</p>

      <Label>1. 제작 요청서 파악</Label>
      <UploadRow label={requestAnalyzing?'비전 AI가 요청서를 읽는 중…':requestFile?.name || '제작 요청서 업로드'} sub="이미지 · PDF · DOCX · TXT" active={!!requestFile} icon={requestAnalyzing?<Loader2 size={14} className="animate-spin"/>:<FileText size={14}/>} onClick={() => requestInput.current?.click()} onDrop={(files) => handleRequest(files[0])} onClear={requestFile ? () => { setRequestFile(null); setRequestText(''); setRequestAnalysis(null); setRequestError(''); } : null}/>
      <input ref={requestInput} hidden type="file" accept="image/*,.pdf,.docx,.txt,application/pdf,text/plain" onChange={(e) => { const file=e.target.files?.[0]; e.target.value=''; handleRequest(file); }}/>
      {requestError && <div style={{ color:'#FDA4AF', fontSize:10, margin:'-2px 0 15px' }}>{requestError}</div>}
      {requestAnalysis && <RequestAnalysis analysis={requestAnalysis}/>}
      {requestText && <details style={{ margin:'-1px 0 22px', borderLeft:`2px solid ${T.line}`, paddingLeft:10 }}><summary style={{ color:T.muted, fontSize:10, cursor:'pointer' }}>추출 내용 확인·수정</summary><textarea value={requestText} onChange={(e) => setRequestText(e.target.value)} rows={7} style={{ width:'100%', boxSizing:'border-box', marginTop:8, background:T.panel, color:T.text, border:`1px solid ${T.line}`, borderRadius:7, padding:9, fontSize:10, resize:'vertical' }}/></details>}

      <Label>2. 구도 프리셋</Label>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:24 }}>{BOX_BANNER_PRESETS.map((p) => <button key={p.id} onClick={() => { setPresetId(p.id); resetLayout(); }} style={choice(p.id === presetId)}><b>{p.label}</b><span>{p.description}</span></button>)}</div>

      <Label>3. 제작 리소스</Label>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
        <UploadRow compact label="PSD 파일 열기" icon={<Layers size={14}/>} onClick={() => psdInput.current?.click()}/>
        <UploadRow compact label={resourceReading?'폴더 읽는 중…':resourceFolderName || '리소스 폴더 공유'} icon={resourceReading?<Loader2 size={14} className="animate-spin"/>:<FolderOpen size={14}/>} onClick={shareResourceFolder}/>
      </div>
      <input ref={psdInput} hidden type="file" accept=".psd,image/vnd.adobe.photoshop" onChange={(e) => { const file=e.target.files?.[0]; e.target.value=''; if(file) setPsdFile(file); }}/>
      {resourceError && <div style={{ color:'#FDA4AF', fontSize:10, margin:'-2px 0 12px' }}>{resourceError}</div>}
      {resourceFiles.length > 0 && <ResourceLibrary files={resourceFiles} selected={selectedResource} onSelect={setSelectedResource} slots={preset.slots} onAssign={assignResource}/>}

      <Label>4. 공통 배경</Label>
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
      <div style={{ display:'flex', alignItems:'end', justifyContent:'space-between', marginBottom:12 }}><div><Label>구도 미리보기 · 요소를 드래그해서 이동</Label><b>{preset.label}</b></div><div style={{ display:'flex', alignItems:'center', gap:10 }}><button onClick={resetLayout} style={{ border:0, background:'none', color:T.muted, fontSize:10, cursor:'pointer' }}>배치 초기화</button><span style={{ color:T.muted, fontSize:10 }}>{BANNER_SIZE.width} × {BANNER_SIZE.height}</span></div></div>
      <div ref={previewRef} style={{ position:'relative', width:'100%', aspectRatio:`${BANNER_SIZE.width}/${BANNER_SIZE.height}`, overflow:'hidden', background:'#202127', boxShadow:'0 18px 50px rgba(0,0,0,.35)', touchAction:'none' }}>
        {background
          ? <img src={background.dataUrl} alt="배경" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }}/>
          : <EmptyBackground onClick={() => bgInput.current?.click()}/>
        }
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,rgba(0,0,0,.03),rgba(0,0,0,.42))' }}/>
        {effectiveGroups.map((group) => <PreviewGroup key={group.id} group={group} onMove={(e) => startMove(e,'groups',group.id,group)}/>)}
        {effectiveSlots.map((slot) => <PreviewSlot key={slot.id} slot={slot} asset={assets[slot.id]} onMove={(e) => startMove(e,'slots',slot.id,slot)}/>)}
        <PreviewText config={effectiveTitle} value={title || '타이틀'} weight={900} onMove={(e) => startMove(e,'texts','title',effectiveTitle)}/><PreviewText config={effectiveSubtitle} value={subtitle || '설명 문구'} weight={500} onMove={(e) => startMove(e,'texts','subtitle',effectiveSubtitle)}/><PreviewText config={effectivePeriod} value={period || '프로모션 기간'} weight={500} onMove={(e) => startMove(e,'texts','period',effectivePeriod)}/>
        <PreviewBadge config={effectiveBadge} value={badge} onMove={(e) => startMove(e,'texts','badge',effectiveBadge)}/>
      </div>
      <div style={{ marginTop:14, display:'flex', gap:18, color:T.muted, fontSize:10 }}><span><Check size={11} style={{ display:'inline', marginRight:5 }}/>배경·오브젝트 분리</span><span><Check size={11} style={{ display:'inline', marginRight:5 }}/>정규화 좌표 JSON</span><span><Check size={11} style={{ display:'inline', marginRight:5 }}/>원본 에셋 포함 ZIP</span></div>
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
function EmptyBackground({ onClick }) { return <button onClick={onClick} style={{ position:'absolute', inset:0, border:0, background:'radial-gradient(circle at 50% 25%,#353741,#17181C 70%)', color:'#696C76', cursor:'pointer' }}><ImagePlus size={28}/><div style={{ marginTop:8, fontSize:11 }}>배경을 올려주세요</div></button>; }
function PreviewBadge({ config, value, onMove }) { return <div onPointerDown={onMove} title="배지 · 드래그해서 이동" style={{ position:'absolute', left:`${config.x*100}%`, top:`${config.y*100}%`, width:`${config.w*100}%`, height:`${config.h*100}%`, background:'#42C7EA', clipPath:'polygon(0 0,100% 0,100% 100%)', color:'#FFF', fontWeight:900, fontSize:'clamp(8px,1.8vw,22px)', textAlign:'right', padding:'2% 1% 0 0', boxSizing:'border-box', textShadow:'0 2px 3px #000', cursor:'grab', userSelect:'none' }}>{value}</div>; }
function PreviewGroup({ group, onMove }) { return <><div onPointerDown={onMove} title="드래그해서 이동" style={{ position:'absolute', left:`${group.x*100}%`, top:`${group.y*100}%`, width:`${group.w*100}%`, height:`${group.h*100}%`, background:group.color || 'rgba(12,92,116,.88)', border:'1px solid rgba(255,255,255,.18)', cursor:'grab' }}/><div onPointerDown={onMove} style={{ position:'absolute', left:`${(group.x+.08)*100}%`, top:`${(group.y-.055)*100}%`, width:`${Math.max(.14,group.w-.16)*100}%`, padding:'1.2% 0', background:'rgba(73,75,84,.95)', color:'#FFF', textAlign:'center', fontWeight:800, fontSize:'clamp(8px,1.4vw,18px)', cursor:'grab' }}>{group.label}</div></>; }
function PreviewSlot({ slot, asset, onMove }) { return <button onPointerDown={onMove} title={`${slot.label} · 드래그해서 이동`} style={{ position:'absolute', left:`${slot.x*100}%`, top:`${slot.y*100}%`, width:`${slot.w*100}%`, height:`${slot.h*100}%`, border:asset?'0':'1px dashed rgba(255,255,255,.3)', borderRadius:slot.ring?'50%':8, background:slot.ring?'radial-gradient(circle,rgba(107,80,255,.22),rgba(70,45,170,.08) 55%,rgba(155,130,255,.45) 57%,transparent 61%)':'rgba(255,255,255,.035)', cursor:'grab', padding:0, overflow:'hidden' }}>{asset ? <img src={asset.dataUrl} alt={slot.label} draggable="false" style={{ width:'100%', height:'100%', objectFit:slot.fit || 'contain', pointerEvents:'none' }}/> : <span style={{ color:'rgba(255,255,255,.48)', fontSize:'clamp(7px,1vw,12px)', pointerEvents:'none' }}>{slot.label}</span>}</button>; }
function PreviewText({ config, value, weight, onMove }) {
  const clamp01 = (n, fallback) => Math.min(1, Math.max(0, Number.isFinite(Number(n)) ? Number(n) : fallback));
  const lines = String(value || '').split('\n');
  const longest = Math.max(1, ...lines.map((line) => line.length));
  const fit = Math.min(1, Math.sqrt(28 / longest));
  const size = Math.max(8, (Number(config?.size) || 22) * fit);
  return <div onPointerDown={onMove} title="드래그해서 이동" style={{ position:'absolute', left:`${clamp01(config?.x,0)*100}%`, top:`${clamp01(config?.y,0)*100}%`, width:`${Math.max(.08,clamp01(config?.w,.5))*100}%`, color:'#FFF', textAlign:config?.align || 'center', fontWeight:weight, fontSize:`clamp(8px, ${size/28}vw, ${size}px)`, lineHeight:1.15, textShadow:'0 3px 8px #000,0 1px 2px #000', whiteSpace:'pre-wrap', overflow:'visible', wordBreak:'keep-all', cursor:'grab', userSelect:'none' }}>{value}</div>;
}
function choice(active) { return { minHeight:72, padding:'11px 12px', borderRadius:8, border:`1px solid ${active?'rgba(225,112,85,.5)':T.line}`, background:active?'rgba(225,112,85,.10)':T.panel, color:T.text, textAlign:'left', cursor:'pointer', display:'flex', flexDirection:'column', gap:5, fontSize:11 }; }
