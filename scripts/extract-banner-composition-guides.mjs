import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve('src/apps/BannerCreator/composition-guides');
const jobs=[
  ['character-1-sheet.png',['character-1-left','character-1-right','character-1-center','character-1-action']],
  ['character-2-sheet.png',['character-2-left','character-2-right','character-2-duel','character-2-center']],
  ['character-3-sheet.png',['character-3-center','character-3-left','character-3-right','character-3-lineup']],
  ['item-a-sheet.png',['item-single','item-radial','item-three-products','item-hero-support']],
  ['item-b-sheet.png',['item-five-row','item-compare','item-crystal-cluster','item-burst']],
];

const removeConnectedBackground=(pixels,width,height)=>{
  const data=pixels.data;
  const background=new Uint8Array(width*height);
  const stack=[0,width-1,(height-1)*width,height*width-1];
  stack.forEach((index)=>{ background[index]=1; });
  while(stack.length){
    const current=stack.pop();
    const x=current%width,y=Math.floor(current/width);
    const base=current*4;
    const neighbors=[current-1,current+1,current-width,current+width];
    for(const next of neighbors){
      if(next<0||next>=background.length||background[next]) continue;
      const nx=next%width,ny=Math.floor(next/width);
      if(Math.abs(nx-x)+Math.abs(ny-y)!==1) continue;
      const offset=next*4;
      const delta=Math.max(Math.abs(data[offset]-data[base]),Math.abs(data[offset+1]-data[base+1]),Math.abs(data[offset+2]-data[base+2]));
      if(delta>13) continue;
      background[next]=1; stack.push(next);
    }
  }
  for(let pixel=0;pixel<background.length;pixel++){
    const offset=pixel*4;
    if(background[pixel]) data[offset+3]=0;
    else {
      const luma=data[offset]*.2126+data[offset+1]*.7152+data[offset+2]*.0722;
      data[offset]=Math.min(data[offset],92); data[offset+1]=Math.min(data[offset+1],94); data[offset+2]=Math.min(data[offset+2],98);
      data[offset+3]=Math.round(Math.max(0,Math.min(255,(250-luma)*4.2)));
    }
  }
};

await mkdir(root,{recursive:true});
for(const [source,names] of jobs){
  const image=await loadImage(path.join(root,'sources',source));
  const cellWidth=Math.floor(image.width/2),cellHeight=Math.floor(image.height/2);
  for(let index=0;index<4;index++){
    const canvas=createCanvas(cellWidth,cellHeight),context=canvas.getContext('2d');
    context.drawImage(image,(index%2)*cellWidth,Math.floor(index/2)*cellHeight,cellWidth,cellHeight,0,0,cellWidth,cellHeight);
    const pixels=context.getImageData(0,0,cellWidth,cellHeight);
    removeConnectedBackground(pixels,cellWidth,cellHeight);
    context.putImageData(pixels,0,0);
    await writeFile(path.join(root,`${names[index]}.png`),canvas.toBuffer('image/png'));
  }
}
console.log('Extracted 20 banner composition guides.');
