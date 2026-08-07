var f=new File('C:/work/00_AI연습/23_배너자동화_피그마mcp/01_샘플/20260520_Live_봉마 소울패스 진무 시즌3/3. 배너/블소_봉마 소울패스 진무 시즌3_배너.psd');
var outDir=new Folder('C:/work/00_claude/psd_exports/all');if(!outDir.exists)outDir.create();var src=app.open(f);
function child(p,n){for(var i=0;i<p.layers.length;i++)if(p.layers[i].name===n)return p.layers[i];throw new Error('missing '+n);}
function findPath(doc,a){var p=doc;for(var i=0;i<a.length;i++)p=child(p,a[i]);return p;}
function hide(p){for(var i=0;i<p.layers.length;i++){p.layers[i].visible=false;if(p.layers[i].typename==='LayerSet')hide(p.layers[i]);}}
function show(l){l.visible=true;var p=l.parent;while(p&&p.typename!=='Document'){p.visible=true;p=p.parent;}}
function exp(name,w,h,ox,oy,paths,black){var d=src.duplicate(name);hide(d);for(var i=0;i<paths.length;i++)show(findPath(d,paths[i]));if(black){var b=d.artLayers.add(),c=new SolidColor();b.name='SCREEN_BASE_BLACK';c.rgb.red=0;c.rgb.green=0;c.rgb.blue=0;d.selection.selectAll();d.selection.fill(c);d.selection.deselect();b.move(d.layers[d.layers.length-1],ElementPlacement.PLACEAFTER);}d.crop([UnitValue(ox,'px'),UnitValue(oy,'px'),UnitValue(ox+w,'px'),UnitValue(oy+h,'px')]);var o=new ExportOptionsSaveForWeb();o.format=SaveDocumentType.PNG;o.PNG8=false;o.transparency=!black;o.interlaced=false;d.exportDocument(new File(outDir.fsName+'/'+name+'.png'),ExportType.SAVEFORWEB,o);d.close(SaveOptions.DONOTSAVECHANGES);}
exp('purple_1352x860_background',1352,860,0,886,[['PURPLE_1352X860','++이미지','+BG'],['PURPLE_1352X860','++이미지','+꾸밈']],false);
exp('purple_1352x860_character',1352,860,0,886,[['PURPLE_1352X860','++이미지','+캐릭터']],false);
exp('600x340_background',600,340,1957,886,[['600x340','++이미지','+BG'],['600x340','++이미지','+꾸밈']],false);
exp('600x340_character',600,340,1957,886,[['600x340','++이미지','+캐릭터']],false);
exp('620x640_background',620,640,2657,886,[['620x640','++이미지','+BG'],['620x640','++이미지','+꾸밈']],false);
exp('620x640_character',620,640,2657,886,[['620x640','++이미지','+캐릭터']],false);
exp('facebook_background',1200,630,1357,0,[['Facebook_1200x630','++이미지','+BG'],['Facebook_1200x630','++이미지','+꾸밈']],false);
exp('facebook_character',1200,630,1357,0,[['Facebook_1200x630','++이미지','+캐릭터']],false);
exp('facebook_logo',1200,630,1357,0,[['Facebook_1200x630','★필!고정_BI']],false);
exp('facebook_title_main',1200,630,1357,0,[['Facebook_1200x630','++ 타이틀','그룹 4 복사 2','그룹 3 copy','진무 시즌 3'],['Facebook_1200x630','++ 타이틀','그룹 4 복사 2','그룹 3','봉마 소울패스']],false);
exp('facebook_title_light',1200,630,1357,0,[['Facebook_1200x630','++ 타이틀','그룹 4 복사 2','반짝'],['Facebook_1200x630','++ 타이틀','레이어 38'],['Facebook_1200x630','++ 타이틀','그룹 4 복사 2','그룹 3 copy','Layer 69'],['Facebook_1200x630','++ 타이틀','그룹 4 복사 2','그룹 3 copy','Layer 68'],['Facebook_1200x630','++ 타이틀','그룹 4 복사 2','그룹 3','Layer 67'],['Facebook_1200x630','++ 타이틀','그룹 4 복사 2','그룹 3','Layer 66']],true);
exp('facebook_date_decor',1200,630,1357,0,[['Facebook_1200x630','++ 타이틀','++ day','Layer 70']],false);
exp('266x280_background',266,280,1528,1166,[['266x280','Group 2','+캐릭터','Layer 72']],false);
exp('266x280_character',266,280,1528,1166,[['266x280','Group 2','+캐릭터','cat 1']],false);
exp('375x230_background',375,230,1528,1516,[['375x230','bg','Layer 26'],['375x230','bg','Layer 74'],['375x230','bg','Rectangle 3 copy 2']],false);
exp('375x230_character',375,230,1528,1516,[['375x230','bg','+캐릭터']],false);
exp('375x230_decor',375,230,1528,1516,[['375x230','커버(고정)']],false);
exp('72x40_background',72,40,1528,1045,[['72x40','Layer 76']],false);
exp('72x40_border',72,40,1528,1045,[['72x40','@고정_border']],false);
src.close(SaveOptions.DONOTSAVECHANGES);'EXPORTED_ALL_DUPLICATES';
