export const PALM_TYPES = [
  { key: 'heart', name: '감정선', color: '#f04e45', theme: '관계와 감정 표현' },
  { key: 'head', name: '두뇌선', color: '#729ff0', theme: '생각과 판단' },
  { key: 'life', name: '생명선', color: '#55b89a', theme: '생활 리듬' },
  { key: 'fate', name: '운명선', color: '#e9e4d6', theme: '일과 방향' },
];

export function photoPoint(clientX, clientY, rect) {
  return { x: Math.max(0, Math.min(100, (clientX - rect.left) / rect.width * 100)),
    y: Math.max(0, Math.min(100, (clientY - rect.top) / rect.height * 100)) };
}

export function linePaths(line) { return line.paths || [line.path || []]; }

// Keep dense detected pixels for rendering, but show well-spaced editing handles.
export function controlIndices(path) {
  if (!path.length) return [];
  const result=[0]; let length=0;
  for(let i=1;i<path.length;i++) {
    length+=Math.hypot((path[i].x-path[i-1].x)*7.2,(path[i].y-path[i-1].y)*9);
    if(length>=60){result.push(i);length=0;}
  }
  if(length>=30 && result.at(-1)!==path.length-1) result.push(path.length-1);
  return result;
}

export function editPoint(lines, key, index, point, pathIndex=0) {
  return lines.map(line => {
    if(line.key!==key) return line;
    const paths=linePaths(line).map((path,segment) => {
      if(segment!==pathIndex || !path[index]) return path;
      const anchor=path[index], dx=point.x-anchor.x, dy=point.y-anchor.y;
      const distances=[0];
      for(let i=1;i<path.length;i++) distances.push(distances.at(-1)+Math.hypot((path[i].x-path[i-1].x)*7.2,(path[i].y-path[i-1].y)*9));
      return path.map((p,i)=>{
        const weight=Math.max(0,1-Math.abs(distances[i]-distances[index])/60);
        return {x:Math.max(0,Math.min(100,p.x+dx*weight)),y:Math.max(0,Math.min(100,p.y+dy*weight))};
      });
    });
    return {...line,source:'manual',paths,path:paths[0]};
  });
}

export function reviewLines(lines) {
  return lines.filter(line => linePaths(line).some(path=>path.length>=2)).map(line => {
    const meta = PALM_TYPES.find(type => type.key === line.key);
    const paths=linePaths(line).filter(path=>path.length>=2);
    return { ...line, ...meta, paths, path:paths[0], controls:line.controls || paths.map(controlIndices), anchor: paths[0][Math.floor(paths[0].length / 2)],
      source: line.source || 'automatic' };
  });
}

export function renderPalmOverlay(lines) {
  const canvas = document.createElement('canvas');
  canvas.width = 720; canvas.height = 900;
  const ctx = canvas.getContext('2d');
  ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  reviewLines(lines).forEach(line => {
    ctx.strokeStyle = line.color;
    linePaths(line).forEach(path=>{
      ctx.beginPath();
      path.forEach((p, i) => ctx[i ? 'lineTo' : 'moveTo'](p.x * 7.2, p.y * 9));
      ctx.stroke();
    });
  });
  return canvas.toDataURL('image/png');
}
