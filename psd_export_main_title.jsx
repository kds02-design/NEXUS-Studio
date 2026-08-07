var f = new File('C:/work/00_AI연습/23_배너자동화_피그마mcp/01_샘플/20260520_Live_봉마 소울패스 진무 시즌3/3. 배너/블소_봉마 소울패스 진무 시즌3_배너.psd');
var out = new File('C:/work/00_claude/psd_exports/1180_main_title.png');
var src = app.open(f);
function findSet(parent,name){for(var i=0;i<parent.layerSets.length;i++)if(parent.layerSets[i].name===name)return parent.layerSets[i];throw new Error(name);}
function findArt(parent,name){for(var i=0;i<parent.artLayers.length;i++)if(parent.artLayers[i].name===name)return parent.artLayers[i];throw new Error(name);}
var target=findSet(src,'1180x750_notice');
var title=findSet(target,'++ 타이틀');
var main=findSet(title,'그룹 4 복사 2');
var glow=findArt(title,'레이어 38');
var day=findSet(title,'++ day');
var dayBg=null;
for(var i=0;i<day.artLayers.length;i++) if(day.artLayers[i].kind!==LayerKind.TEXT) dayBg=day.artLayers[i];
if(!dayBg) throw new Error('Date background not found');
var temp=app.documents.add(UnitValue(1180,'px'),UnitValue(750,'px'),72,'main_title',NewDocumentMode.RGB,DocumentFill.TRANSPARENT);
app.activeDocument=src; glow.duplicate(temp,ElementPlacement.PLACEATBEGINNING);
app.activeDocument=src; main.duplicate(temp,ElementPlacement.PLACEATBEGINNING);
app.activeDocument=src; dayBg.duplicate(temp,ElementPlacement.PLACEATBEGINNING);
app.activeDocument=temp;
var opts=new ExportOptionsSaveForWeb(); opts.format=SaveDocumentType.PNG; opts.PNG8=false; opts.transparency=true; opts.interlaced=false;
temp.exportDocument(out,ExportType.SAVEFORWEB,opts);
temp.close(SaveOptions.DONOTSAVECHANGES); src.close(SaveOptions.DONOTSAVECHANGES);
'EXPORTED_MAIN_TITLE';
