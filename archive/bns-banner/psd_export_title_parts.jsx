var f=new File('C:/work/00_AI연습/23_배너자동화_피그마mcp/01_샘플/20260520_Live_봉마 소울패스 진무 시즌3/3. 배너/블소_봉마 소울패스 진무 시즌3_배너.psd');
var outDir=new Folder('C:/work/00_claude/psd_exports'); if(!outDir.exists)outDir.create();
var src=app.open(f);
function set(parent,name){for(var i=0;i<parent.layerSets.length;i++)if(parent.layerSets[i].name===name)return parent.layerSets[i];throw new Error(name);}
function art(parent,name){for(var i=0;i<parent.artLayers.length;i++)if(parent.artLayers[i].name===name)return parent.artLayers[i];throw new Error(name);}
function save(name,layers,black){
 var temp=app.documents.add(UnitValue(1180,'px'),UnitValue(750,'px'),72,name,NewDocumentMode.RGB,DocumentFill.TRANSPARENT);
 if(black){var base=temp.artLayers.add();base.name='SCREEN_BASE_BLACK';var c=new SolidColor();c.rgb.red=0;c.rgb.green=0;c.rgb.blue=0;temp.selection.selectAll();temp.selection.fill(c);temp.selection.deselect();}
 for(var i=layers.length-1;i>=0;i--){app.activeDocument=src;layers[i].duplicate(temp,ElementPlacement.PLACEATBEGINNING);}
 app.activeDocument=temp;
 var o=new ExportOptionsSaveForWeb();o.format=SaveDocumentType.PNG;o.PNG8=false;o.transparency=!black;o.interlaced=false;
 temp.exportDocument(new File(outDir.fsName+'/'+name+'.png'),ExportType.SAVEFORWEB,o);temp.close(SaveOptions.DONOTSAVECHANGES);
}
var target=set(src,'1180x750_notice'), title=set(target,'++ 타이틀'), mainWrap=set(title,'그룹 4 복사 2');
var mainA=set(mainWrap,'그룹 3 copy'), mainB=set(mainWrap,'그룹 3'), sparkle=set(mainWrap,'반짝'), glow=art(title,'레이어 38');
var titleA=art(mainA,'진무 시즌 3'), titleB=art(mainB,'봉마 소울패스');
var fxA1=mainA.artLayers[0],fxA2=mainA.artLayers[1],fxB1=mainB.artLayers[0],fxB2=mainB.artLayers[1];
var day=set(title,'++ day'), dayBg=null;for(var i=0;i<day.artLayers.length;i++)if(day.artLayers[i].kind!==LayerKind.TEXT)dayBg=day.artLayers[i];if(!dayBg)throw new Error('date decor');
save('1180_title_main',[titleA,titleB],false);
save('1180_title_light',[sparkle,glow,fxA1,fxA2,fxB1,fxB2],true);
save('1180_date_decor',[dayBg],false);
src.close(SaveOptions.DONOTSAVECHANGES);
'EXPORTED_TITLE_PARTS';
