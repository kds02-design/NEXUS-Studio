var f = new File('C:/work/00_AI연습/23_배너자동화_피그마mcp/01_샘플/20260520_Live_봉마 소울패스 진무 시즌3/3. 배너/블소_봉마 소울패스 진무 시즌3_배너.psd');
var doc = app.open(f);
function findSet(parent, name) { for (var i=0;i<parent.layerSets.length;i++) if(parent.layerSets[i].name===name) return parent.layerSets[i]; throw new Error(name); }
function art(parent, name) { for (var i=0;i<parent.artLayers.length;i++) if(parent.artLayers[i].name===name) return parent.artLayers[i]; throw new Error(name); }
function esc(s){return String(s).replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\r/g,'\\r').replace(/\n/g,'\\n');}
function info(l){var t=l.textItem,b=l.bounds,c=t.color.rgb;return '{"name":"'+esc(l.name)+'","contents":"'+esc(t.contents)+'","font":"'+esc(t.font)+'","size":'+t.size.as('px')+',"color":{"r":'+c.red+',"g":'+c.green+',"b":'+c.blue+'},"bounds":['+b[0].as('px')+','+b[1].as('px')+','+b[2].as('px')+','+b[3].as('px')+']}';}
var target=findSet(doc,'1180x750_notice');
var title=findSet(target,'++ 타이틀');
var day=findSet(title,'++ day');
var subtitle=art(title,'진무 시즌을 소울패스와 함께 성장 부스트!');
var dateLayer=day.artLayers[0].kind===LayerKind.TEXT ? day.artLayers[0] : day.artLayers[1];
var result='{"subtitle":'+info(subtitle)+',"date":'+info(dateLayer)+'}';
doc.close(SaveOptions.DONOTSAVECHANGES);
result;
