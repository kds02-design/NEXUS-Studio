var psdFile = new File('C:/work/00_AI연습/23_배너자동화_피그마mcp/01_샘플/20260520_Live_봉마 소울패스 진무 시즌3/3. 배너/블소_봉마 소울패스 진무 시즌3_배너.psd');
var outDir = new Folder('C:/work/00_claude/psd_exports');
if (!outDir.exists) outDir.create();
var src = app.open(psdFile);

function findSet(parent, name) {
  for (var i = 0; i < parent.layerSets.length; i++) if (parent.layerSets[i].name === name) return parent.layerSets[i];
  throw new Error('Group not found: ' + name);
}

function exportIsolated(fileName, layers) {
  var temp = app.documents.add(UnitValue(1180,'px'), UnitValue(750,'px'), 72, fileName, NewDocumentMode.RGB, DocumentFill.TRANSPARENT);
  for (var i = layers.length - 1; i >= 0; i--) {
    app.activeDocument = src;
    layers[i].duplicate(temp, ElementPlacement.PLACEATBEGINNING);
  }
  app.activeDocument = temp;
  var opts = new ExportOptionsSaveForWeb();
  opts.format = SaveDocumentType.PNG;
  opts.PNG8 = false;
  opts.transparency = true;
  opts.interlaced = false;
  temp.exportDocument(new File(outDir.fsName + '/' + fileName), ExportType.SAVEFORWEB, opts);
  temp.close(SaveOptions.DONOTSAVECHANGES);
}

var target = findSet(src, '1180x750_notice');
var image = findSet(target, '++이미지');
var bg = findSet(image, '+BG');
var decor = findSet(image, '+꾸밈');
var character = findSet(image, '+캐릭터');
var title = findSet(target, '++ 타이틀');

exportIsolated('1180_background.png', [bg, decor]);
exportIsolated('1180_character.png', [character]);
exportIsolated('1180_title.png', [title]);
src.close(SaveOptions.DONOTSAVECHANGES);
'EXPORTED_TRANSPARENT';
