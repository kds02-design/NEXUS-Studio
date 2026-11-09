import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRGB,decodeLogits,extractSegments,thinMask} from './palmMask.js';
import {modelFrame,modelToDisplay,displayToModel} from './palmGeometry.js';
import {linePaths,editPoint,controlIndices,renderPalmOverlay,reviewLines} from './photoReview.js';

test('RGB normalization exactly follows RGB NCHW ImageNet contract',()=>{
 const result=normalizeRGB(new Uint8ClampedArray([255,0,128,255,0,255,0,255]));
 assert.equal(result.length,6);
 assert.ok(Math.abs(result[0]-(1-.485)/.229)<1e-6);
 assert.ok(Math.abs(result[2]-(0-.456)/.224)<1e-6);
 assert.ok(Math.abs(result[4]-(128/255-.406)/.225)<1e-6);
});
test('uncertain logits and background produce no guessed paths',()=>{
 const uncertain=decodeLogits(new Float32Array(4*64*64),64,64);
 assert.equal(uncertain.labels.some(Boolean),false);
 assert.deepEqual(extractSegments(uncertain.labels,64,64),[]);
 assert.throws(()=>decodeLogits(new Float32Array(5),64,64));
});
test('high certainty class decoded without inventing the unsupported fate class',()=>{
 const values=new Float32Array(16);values[8]=10; values[13]=10;
 const {labels}=decodeLogits(values,2,2);
 assert.deepEqual([...labels],[2,3,0,0]);
});
test('two disconnected wrinkles stay disconnected and every center point has mask support',()=>{
 const width=100,height=100,labels=new Uint8Array(width*height);
 for(let x=10;x<40;x++)for(let y=20;y<25;y++)labels[y*width+x]=1;
 for(let x=60;x<90;x++)for(let y=20;y<25;y++)labels[y*width+x]=1;
 const [heart]=extractSegments(labels,width,height);
 assert.equal(heart.key,'heart');assert.equal(heart.paths.length,2);
 for(const path of heart.paths)for(const p of path)assert.equal(labels[Math.floor(p.y)*width+Math.floor(p.x)],1);
 assert.ok(heart.paths.every(path=>path.every(p=>p.x<40)||path.every(p=>p.x>=60)));
});
test('thinning never introduces new pixels and ignores isolated specks',()=>{
 const binary=new Uint8Array(80*80); for(let y=5;y<75;y++)for(let x=35;x<40;x++)binary[y*80+x]=1;
 const skeleton=thinMask(binary,80,80);
 skeleton.forEach((v,i)=>{if(v)assert.equal(binary[i],1);});
 const noise=new Uint8Array(80*80);noise[1]=3;noise[25]=3;
 assert.deepEqual(extractSegments(noise,80,80),[]);
});
function geometry(handedness){return {handedness,frame:{crop:{x:-40,y:80,width:800,height:1000}},landmarks:Array.from({length:21},(_,i)=>({x:80+i*24,y:100+i*25}))};}
test('left/right and non-square crop coordinates are reversible',()=>{
 for(const hand of ['왼손','오른손']){
  const frame=modelFrame(geometry(hand));
  for(const p of [{x:0,y:0},{x:20.2,y:65.3},{x:100,y:100}]){
   const result=modelToDisplay(displayToModel(p,frame),frame);
   assert.ok(Math.abs(p.x-result.x)<1e-9); assert.ok(Math.abs(p.y-result.y)<1e-9);
  }
 }
 const left=modelFrame(geometry('왼손')),right=modelFrame(geometry('오른손'));
 const a=displayToModel({x:20,y:50},left),b=displayToModel({x:20,y:50},right);
 assert.ok(Math.abs(a.x+b.x-(2*left.padX+left.contentWidth))<1e-9);
});
test('edit affects only selected fragment; dense path remains intact with sparse handles',()=>{
 const path=Array.from({length:101},(_,i)=>({x:30,y:i}));
 const lines=[{key:'life',paths:[path,[{x:70,y:50},{x:80,y:70}]],path}];
 const edited=editPoint(lines,'life',40,{x:35,y:40},0);
 assert.equal(linePaths(edited[0])[0].length,101);
 assert.deepEqual(linePaths(edited[0])[1],linePaths(lines[0])[1]);
 assert.equal(lines[0].paths[0][40].x,30);
 assert.equal(edited[0].paths[0][40].x,35);
 assert.ok(controlIndices(path).length<20);
});
test('export starts a fresh path per disconnected fragment, no smoothing or chords',()=>{
 const calls=[];const ctx=Object.fromEntries(['beginPath','moveTo','lineTo','stroke'].map(name=>[name,(...args)=>calls.push([name,...args])]));
 globalThis.document={createElement:()=>({getContext:()=>ctx,toDataURL:()=>''})};
 try{renderPalmOverlay([{key:'heart',paths:[[{x:10,y:20},{x:20,y:20}],[{x:60,y:20},{x:80,y:20}]]}]);}finally{delete globalThis.document;}
 assert.equal(calls.filter(c=>c[0]==='moveTo').length,2);
 assert.equal(calls.filter(c=>c[0]==='lineTo').length,2);
});
test('editing handles keep stable indices while the curve is adjusted',()=>{
 const path=Array.from({length:100},(_,i)=>({x:i/2,y:50}));
 const [line]=reviewLines([{key:'heart',path}]);
 const moved=editPoint([line],'heart',line.controls[0][1],{x:25,y:40});
 assert.deepEqual(reviewLines(moved)[0].controls,line.controls);
});
