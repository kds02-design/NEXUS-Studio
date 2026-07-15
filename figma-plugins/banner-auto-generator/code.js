/* global figma, __html__ */
figma.showUI(__html__, { width: 420, height: 560, themeColors: true });

const decodeDataUrl = (url) => {
  const base64 = url.split(',')[1] || '';
  const binary = figma.base64Decode(base64);
  return binary;
};

const clamp01 = (value, fallback=0) => Math.min(1,Math.max(0,Number.isFinite(Number(value))?Number(value):fallback));
const rectOf = (layer, width, height) => ({
  x:clamp01(layer.x) * width, y:clamp01(layer.y) * height,
  w:Math.max(.02,clamp01(layer.w,.5)) * width, h:Math.max(.02,clamp01(layer.h,.2)) * height,
});

const visibleForOutput = (layer, output) => {
  if (layer.type === 'text') {
    if (layer.id === 'badge') return output.showBadge === true;
    return output.content === 'title';
  }
  if (layer.id === 'background' && output.transparent) return false;
  if (output.mode === 'micro' && layer.type === 'image') {
    return layer.id === 'background' || /^(hero|main-box|package-1|step-1|reward-left|fixed-1)$/.test(layer.id);
  }
  if (output.mode === 'micro' && layer.type === 'panel') return false;
  return true;
};

async function addImage(parent, layer, asset, width, height) {
  if (!asset) return;
  const node = figma.createRectangle();
  node.name = layer.name || layer.id;
  let r = rectOf(layer, width, height);
  if (layer.id === 'background') r = { x:0, y:0, w:width, h:height };
  node.resize(Math.max(1,r.w), Math.max(1,r.h)); node.x=r.x; node.y=r.y;
  const image = figma.createImage(decodeDataUrl(asset));
  node.fills = [{ type:'IMAGE', imageHash:image.hash, scaleMode:layer.fit === 'contain' ? 'FIT' : 'FILL' }];
  if (layer.ring) node.cornerRadius = Math.min(r.w,r.h)/2;
  parent.appendChild(node);
}

async function addText(parent, layer, width, height, mode) {
  if (!layer.value) return;
  await figma.loadFontAsync({ family:'Inter', style:'Bold' });
  const node = figma.createText(); node.name=layer.name || layer.id; node.fontName={ family:'Inter', style:'Bold' };
  let r=rectOf(layer,width,height);
  if (mode === 'compact' && layer.id === 'title') r={ x:width*.08,y:height*.76,w:width*.84,h:height*.17 };
  if (mode === 'micro' && layer.id === 'title') r={ x:width*.06,y:height*.24,w:width*.74,h:height*.55 };
  node.resize(Math.max(1,r.w),Math.max(1,r.h)); node.x=r.x; node.y=r.y;
  const scale=Math.min(width/1180,height/750);
  const longest=Math.max(1,...String(layer.value).split('\n').map((line)=>line.length));
  const fit=Math.min(1,Math.sqrt(28/longest));
  node.fontSize=Math.max(mode==='micro'?7:10,(layer.size || 22)*scale*fit);
  node.characters=layer.value; node.textAlignHorizontal=layer.align === 'center' ? 'CENTER' : 'LEFT';
  node.textAutoResize='HEIGHT'; node.fills=[{type:'SOLID',color:{r:1,g:1,b:1}}];
  parent.appendChild(node);
}

function hexColor(hex) {
  const value=String(hex || '#126A85').replace('#','');
  const num=parseInt(value.length===3?value.split('').map((c)=>c+c).join(''):value,16);
  return { r:((num>>16)&255)/255, g:((num>>8)&255)/255, b:(num&255)/255 };
}

function addPanel(parent, layer, width, height) {
  const node=figma.createRectangle(); const r=rectOf(layer,width,height);
  node.name=layer.name || layer.id; node.resize(Math.max(1,r.w),Math.max(1,r.h)); node.x=r.x; node.y=r.y;
  node.fills=[{type:'SOLID',color:hexColor(layer.color)}]; node.opacity=.9;
  node.strokes=[{type:'SOLID',color:{r:1,g:1,b:1}}]; node.strokeWeight=1; node.strokeAlign='INSIDE';
  parent.appendChild(node);
}

async function generate(data) {
  const outputs=data.outputs || [{id:'notice',label:'공지',width:data.canvas.width,height:data.canvas.height,mode:'full'}];
  const section=figma.createSection(); section.name=`${data.name || '배너'} · 자동 생성`;
  let cursorX=0,cursorY=0,rowH=0;
  for (const output of outputs) {
    const frame=figma.createFrame(); frame.name=`${output.label}_${output.width}x${output.height}`;
    frame.resize(output.width,output.height); frame.x=cursorX; frame.y=cursorY; frame.clipsContent=true;
    frame.fills=output.transparent ? [] : [{type:'SOLID',color:{r:.06,g:.065,b:.075}}]; section.appendChild(frame);
    const layers=data.layers || [];
    for (let i=0;i<layers.length;i++) {
      const layer=layers[i]; if (!visibleForOutput(layer,output)) continue;
      if (layer.type === 'image') await addImage(frame,layer,data.embeddedAssets?.[layer.id],output.width,output.height);
      if (layer.type === 'panel') addPanel(frame,layer,output.width,output.height);
      if (layer.type === 'text') await addText(frame,layer,output.width,output.height,output.mode);
    }
    cursorX += output.width + 100; rowH=Math.max(rowH,output.height);
    if (cursorX > 3000) { cursorX=0; cursorY += rowH + 140; rowH=0; }
  }
  section.resizeWithoutConstraints(Math.max(1600,Math.min(4200,cursorX || 3000)),cursorY+rowH+120);
  figma.currentPage.appendChild(section); figma.viewport.scrollAndZoomIntoView([section]);
  figma.ui.postMessage({ type:'done', count:outputs.length });
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'generate') {
    try { await generate(msg.data); }
    catch (error) { figma.ui.postMessage({ type:'error', message:error?.message || String(error) }); }
  }
  if (msg.type === 'close') figma.closePlugin();
};
