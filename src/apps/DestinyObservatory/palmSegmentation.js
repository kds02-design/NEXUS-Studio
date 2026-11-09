import { recognizePalm, drawNormalizedHand } from './handLandmarker';
import { modelFrame, modelToDisplay, drawModelInput } from './palmGeometry.js';
import { PALM_TYPES } from './photoReview';

export function segmentPixels(rgba, onStage, signal) {
  return new Promise((resolve,reject) => {
    const worker = new Worker(new URL('./palmSegmentation.worker.js',import.meta.url),{type:'module'});
    const clean = () => { clearTimeout(timer); worker.terminate(); signal?.removeEventListener('abort',abort); };
    const fail = error => { clean(); reject(error); };
    const abort = () => fail(new DOMException('촬영 분석을 취소했습니다.','AbortError'));
    const timer = setTimeout(() => fail(new Error('손금 추출 시간이 초과됐습니다. 네트워크를 확인하거나 다른 기기에서 다시 시도해 주세요.')),120000);
    if (signal?.aborted) { abort(); return; }
    signal?.addEventListener('abort',abort,{once:true});
    worker.onerror = () => fail(new Error('손금 모델을 실행하지 못했습니다. 최신 Safari 또는 Chrome에서 다시 시도해 주세요.'));
    worker.onmessage = ({data}) => {
      if (data.stage) { onStage?.(data.stage); return; }
      if (data.error) { fail(new Error(data.error)); return; }
      clean(); resolve(data);
    };
    worker.postMessage({id:1,rgba,baseUrl:new URL(import.meta.env.BASE_URL,location.origin).href},[rgba.buffer]);
  });
}

export function mapSegments(lines, frame) {
  return lines.map(line => {
    // Split again at the displayed image boundary. Dropping points in the middle
    // and joining the remainder would fabricate a line through missing pixels.
    const paths=[];
    for (const source of line.paths) {
      let path=[];
      const flush=()=> {if(path.length>=2) paths.push(path); path=[];};
      for(const p of source) {
        const point=modelToDisplay(p,frame);
        if(point.x<0 || point.x>100 || point.y<0 || point.y>100) flush(); else path.push(point);
      }
      flush();
    }
    return {...PALM_TYPES.find(type=>type.key===line.key),paths,path:paths[0] || [],source:'segmentation',confidence:line.confidence || 'confident'};
  }).filter(line=>line.paths.length);
}

export function measurePhoto(rgba, width, height, bounds) {
  const l=Math.max(1,Math.floor(bounds.minX)), r=Math.min(width-1,Math.ceil(bounds.maxX));
  const t=Math.max(1,Math.floor(bounds.minY)), b=Math.min(height-1,Math.ceil(bounds.maxY));
  const gray = (x,y) => { const i=(y*width+x)*4; return .299*rgba[i]+.587*rgba[i+1]+.114*rgba[i+2]; };
  let total=0,dark=0,light=0,edges=0,n=0;
  for(let y=t;y<b;y+=2) for(let x=l;x<r;x+=2) {
    const v=gray(x,y); total+=v; dark+=v<25; light+=v>245;
    edges+=Math.abs(4*v-gray(x-1,y)-gray(x+1,y)-gray(x,y-1)-gray(x,y+1)); n++;
  }
  if(!n) return {warnings:['손바닥 영역을 확인하지 못했습니다.'],brightness:0};
  const warnings=[];
  if(total/n<45 || dark/n>.35) warnings.push('손바닥이 어둡거나 강한 그림자가 있습니다.');
  if(light/n>.2) warnings.push('손바닥에 빛 반사가 강합니다.');
  if(edges/n<2) warnings.push('주름의 세부 대비가 부족합니다. 초점을 맞춰 다시 촬영해 주세요.');
  return {warnings,brightness:Math.round(total/n),detail:Math.round(edges/n)};
}

export async function analyzePalmImage(file,onStage,signal) {
  const url=URL.createObjectURL(file);
  try {
    const image=new Image(); image.src=url;
    try { await image.decode(); } catch { throw new Error('사진을 읽지 못했습니다. JPG 또는 PNG를 선택해 주세요.'); }
    if(signal?.aborted) throw new DOMException('취소','AbortError');
    onStage?.('손의 위치와 방향을 찾고 있습니다.');
    const geometry=await recognizePalm(image,720,900);
    if(signal?.aborted) throw new DOMException('취소','AbortError');
    const canvas=document.createElement('canvas'); canvas.width=720; canvas.height=900;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    drawNormalizedHand(ctx,image,geometry,720,900);
    const previewUrl=canvas.toDataURL('image/jpeg',.94);
    const quality=measurePhoto(ctx.getImageData(0,0,720,900).data,720,900,geometry.palmBounds);
    const sourcePalmWidth=geometry.palmBounds.width*geometry.frame.crop.width/720;
    if(sourcePalmWidth<220) quality.warnings.push('원본에서 손바닥이 너무 작습니다. 더 가까이 촬영해 주세요.');
    const result={version:8,analysisMode:'palm-segmentation-local',reviewStatus:'draft',createdAt:Date.now(),
      previewUrl,lines:[],automaticWarning:'',qualityWarnings:quality.warnings,
      // 랜드마크는 표시 좌표(0~100%)로 저장 — 손 모양 분류와 선 길이·위치 정규화에 쓴다(사진은 저장하지 않음).
      hand:{detected:true,handedness:geometry.handedness,landmarkCount:21,confidence:Math.round(geometry.confidence*100)/100,
        landmarks:geometry.landmarks.map(p=>({x:Math.round(p.x/7.2*100)/100,y:Math.round(p.y/9*100)/100}))},
      vision:{model:'palm-line-student-exp2/bc48939/fp16',transmitted:false},
      metrics:{resolution:`${image.naturalWidth}×${image.naturalHeight}`,brightness:quality.brightness}};
    if(quality.warnings.length) return {...result,automaticWarning:quality.warnings.join(' ')+' 자동 추출을 보류했습니다.'};
    const frame=modelFrame(geometry);
    const modelCanvas=document.createElement('canvas'); modelCanvas.width=512; modelCanvas.height=512;
    const modelContext=modelCanvas.getContext('2d',{willReadFrequently:true});
    drawModelInput(modelContext,image,geometry,frame);
    try {
      const raw=await segmentPixels(modelContext.getImageData(0,0,512,512).data,onStage,signal);
      result.lines=mapSegments(raw.lines,frame);
      // Store the real model evidence separately from editable centerlines.
      const maskCanvas=document.createElement('canvas'); maskCanvas.width=512; maskCanvas.height=512;
      const maskContext=maskCanvas.getContext('2d'), pixels=maskContext.createImageData(512,512);
      const colors=[[0,0,0],[240,78,69],[114,159,240],[85,184,154]];
      raw.labels.forEach((value,i)=>{if(value){pixels.data.set([...colors[value],180],i*4);}});
      maskContext.putImageData(pixels,0,0);
      const evidence=document.createElement('canvas'); evidence.width=720;evidence.height=900;
      const e=evidence.getContext('2d');
      const p=modelToDisplay({x:0,y:0},frame), q=modelToDisplay({x:512,y:512},frame);
      e.translate(p.x*7.2,p.y*9);e.scale((q.x-p.x)*7.2/512,(q.y-p.y)*9/512);e.drawImage(maskCanvas,0,0);
      result.evidenceUrl=evidence.toDataURL('image/png');
      result.fragmentCount=result.lines.reduce((n,line)=>n+line.paths.length,0);
      if(!result.lines.length) result.automaticWarning='확실한 손금 중심선을 추출하지 못했습니다. 추정선은 표시하지 않습니다.';
    } catch(error) {
      if(error.name==='AbortError') throw error;
      result.automaticWarning=`자동 추출을 완료하지 못했습니다. ${error.message}`;
    }
    return result;
  } finally { URL.revokeObjectURL(url); }
}
