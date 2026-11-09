import { normalizeRGB, decodeLogits, extractSegments } from './palmMask.js';

let sessionPromise;
async function loadSession(baseUrl) {
  if (!sessionPromise) sessionPromise = (async () => {
    const runtimeUrl = new URL('vendor/ort-1.20.1/ort.wasm.min.mjs', baseUrl).href;
    const ort = await import(/* @vite-ignore */ runtimeUrl);
    ort.env.wasm.wasmPaths = new URL('vendor/ort-1.20.1/',baseUrl).href;
    ort.env.wasm.numThreads = 1; // Safari / no cross-origin isolation required.
    ort.env.wasm.proxy = false; // This code already runs outside the UI thread.
    const response = await fetch(new URL('models/palm-creases/student_fp16.onnx',baseUrl));
    if (!response.ok) throw new Error('손금 모델을 내려받지 못했습니다.');
    const bytes = await response.arrayBuffer();
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
    if(hash !== 'e2c9f826676b3aaf0a715f3087fcd4fc0b4dccd8c53de05fd26696a8399f8dd6') throw new Error('손금 모델 파일 검증에 실패했습니다. 새로고침 후 다시 시도해 주세요.');
    const session = await ort.InferenceSession.create(bytes,{ executionProviders:['wasm'], graphOptimizationLevel:'all' });
    return { ort, session };
  })().catch(error => { sessionPromise=null; throw error; });
  return sessionPromise;
}

self.onmessage = async ({data}) => {
  const { id, rgba, baseUrl } = data;
  try {
    self.postMessage({id,stage:'손금 전용 모델 준비 중 · 처음에는 약 23MB를 내려받습니다.'});
    const {ort,session} = await loadSession(baseUrl);
    self.postMessage({id,stage:'기기에서 손금 픽셀을 추출하고 있습니다.'});
    const input = new ort.Tensor('float32',normalizeRGB(rgba),[1,3,512,512]);
    let output;
    try {
      output = await session.run({[session.inputNames[0]]:input});
      const tensor = output[session.outputNames[0]];
      if (tensor.dims.join(',') !== '1,4,512,512') throw new Error('손금 모델 출력 형식이 맞지 않습니다.');
      const diagnostics={nonfinite:0,min:Infinity,max:-Infinity,argmax:[0,0,0,0]};
      for(const v of tensor.data){if(!Number.isFinite(v))diagnostics.nonfinite++;else{diagnostics.min=Math.min(diagnostics.min,v);diagnostics.max=Math.max(diagnostics.max,v);}}
      for(let i=0;i<512*512;i++){let best=0;for(let c=1;c<4;c++)if(tensor.data[c*512*512+i]>tensor.data[best*512*512+i])best=c;diagnostics.argmax[best]++;}
      if(diagnostics.nonfinite)throw new Error('손금 모델에서 유효하지 않은 수치가 반환됐습니다.');
      const {labels} = decodeLogits(tensor.data,512,512);
      self.postMessage({id,stage:'검출된 픽셀 안에서 중심선을 추출하고 있습니다.'});
      const lines = extractSegments(labels,512,512).map(line=>({...line,confidence:'confident'}));
      // 2단계: 엄격한 기준(확률 .6·여유 .15)으로 거의 잡히지 않은 선만, 완화 기준(확률 .42·여유 .06)의 argmax 픽셀을
      // '약한 후보'로 따로 추출한다. 확실한 선을 대체하지 않으며, 화면에서는 점선으로 구분해 사용자가 확인한다.
      const weakClasses=[1,2,3].filter(c=>{const found=lines.find(l=>l.key===['heart','head','life'][c-1]);return !found || found.paths.reduce((n,p)=>n+p.length,0)<40;});
      if(weakClasses.length){
        const relaxed=decodeLogits(tensor.data,512,512,.42,.06).labels;
        const weakOnly=relaxed.map(v=>weakClasses.includes(v)?v:0);
        const weakLines=extractSegments(Uint8Array.from(weakOnly),512,512).filter(l=>l.paths.reduce((n,p)=>n+p.length,0)>=40).map(line=>({...line,confidence:'weak'}));
        for(const weak of weakLines){const i=lines.findIndex(l=>l.key===weak.key); if(i>=0) lines.splice(i,1,weak); else lines.push(weak);}
        // 증거 레이어(검출 픽셀 보기)에도 약한 후보 픽셀을 합쳐 사용자가 근거를 볼 수 있게 한다.
        const accepted=new Set(weakLines.map(l=>['heart','head','life'].indexOf(l.key)+1));
        if(accepted.size) for(let i=0;i<relaxed.length;i++) if(!labels[i] && accepted.has(relaxed[i])) labels[i]=relaxed[i];
      }
      self.postMessage({id,lines,labels,diagnostics},[labels.buffer]);
    } finally {
      input.dispose();
      if (output) for (const tensor of Object.values(output)) tensor.dispose();
    }
  } catch (error) { self.postMessage({id,error:error.message || '손금 추출에 실패했습니다.'}); }
};
