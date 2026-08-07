var psdFile = new File('C:/work/00_AI연습/23_배너자동화_피그마mcp/01_샘플/20260520_Live_봉마 소울패스 진무 시즌3/3. 배너/블소_봉마 소울패스 진무 시즌3_배너.psd');
if (!psdFile.exists) throw new Error('PSD not found: ' + psdFile.fsName);
var doc = app.open(psdFile);

function esc(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n');
}

function boundsArray(layer) {
  try {
    var b = layer.bounds;
    return '[' + b[0].as('px') + ',' + b[1].as('px') + ',' + b[2].as('px') + ',' + b[3].as('px') + ']';
  } catch (e) {
    return 'null';
  }
}

function layerJson(layer) {
  var parts = [];
  parts.push('"name":"' + esc(layer.name) + '"');
  parts.push('"typename":"' + esc(layer.typename) + '"');
  parts.push('"visible":' + (layer.visible ? 'true' : 'false'));
  parts.push('"bounds":' + boundsArray(layer));
  if (layer.typename === 'LayerSet') {
    var children = [];
    for (var i = 0; i < layer.layers.length; i++) children.push(layerJson(layer.layers[i]));
    parts.push('"children":[' + children.join(',') + ']');
  }
  return '{' + parts.join(',') + '}';
}

var layers = [];
for (var i = 0; i < doc.layers.length; i++) layers.push(layerJson(doc.layers[i]));
var result = '{"name":"' + esc(doc.name) + '","width":' + doc.width.as('px') + ',"height":' + doc.height.as('px') + ',"layers":[' + layers.join(',') + ']}';
doc.close(SaveOptions.DONOTSAVECHANGES);
result;
