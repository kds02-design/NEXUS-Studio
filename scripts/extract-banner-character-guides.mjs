import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const source = path.resolve('src/apps/BannerCreator/character-guides/character-guide-atlas.png');
const output = path.dirname(source);
const image = await loadImage(source);
const columns = 4;
const rows = 2;
const cellWidth = Math.floor(image.width / columns);
const cellHeight = Math.floor(image.height / rows);
await mkdir(output, { recursive:true });

for (let row=0; row<rows; row++) for (let column=0; column<columns; column++) {
  const canvas=createCanvas(cellWidth,cellHeight);
  const context=canvas.getContext('2d');
  context.drawImage(image,column*cellWidth,row*cellHeight,cellWidth,cellHeight,0,0,cellWidth,cellHeight);
  const pixels=context.getImageData(0,0,cellWidth,cellHeight);
  const data=pixels.data;
  for (let i=0; i<data.length; i+=4) {
    const luma=data[i]*.2126+data[i+1]*.7152+data[i+2]*.0722;
    const alpha=Math.max(0,Math.min(255,(246-luma)*8.5));
    data[i]=Math.min(data[i],88); data[i+1]=Math.min(data[i+1],90); data[i+2]=Math.min(data[i+2],94);
    data[i+3]=Math.round(alpha);
  }
  const visited=new Uint8Array(cellWidth*cellHeight);
  let largest=[];
  for (let seed=0; seed<visited.length; seed++) {
    if (visited[seed] || data[seed*4+3] < 24) continue;
    const component=[]; const stack=[seed]; visited[seed]=1;
    while (stack.length) {
      const current=stack.pop(); component.push(current);
      const x=current%cellWidth, y=Math.floor(current/cellWidth);
      const neighbors=[current-1,current+1,current-cellWidth,current+cellWidth];
      for (const next of neighbors) {
        if (next<0 || next>=visited.length || visited[next] || data[next*4+3]<24) continue;
        const nx=next%cellWidth, ny=Math.floor(next/cellWidth);
        if (Math.abs(nx-x)+Math.abs(ny-y)!==1) continue;
        visited[next]=1; stack.push(next);
      }
    }
    if (component.length>largest.length) largest=component;
  }
  const keep=new Uint8Array(cellWidth*cellHeight);
  largest.forEach((pixel)=>{ keep[pixel]=1; });
  for (let pixel=0; pixel<keep.length; pixel++) if (!keep[pixel]) data[pixel*4+3]=0;
  context.putImageData(pixels,0,0);
  const index=row*columns+column+1;
  await writeFile(path.join(output,`pose-${index}.png`),canvas.toBuffer('image/png'));
}

console.log(`Extracted ${columns*rows} transparent character guides to ${output}`);
