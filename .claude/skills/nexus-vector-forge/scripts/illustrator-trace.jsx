// nexus-vector-forge — Illustrator Image Trace 자동화 (ExtendScript)
//
// run-illustrator-trace.ps1 이 %TEMP%\nexus-vector-forge\job.json 을 쓰고 COM(DoJavaScriptFile) 으로 이 스크립트를 실행한다.
// job.json:
//   { "input": "<bw.png>", "svg": "<out.svg>", "ai": "<out.ai>", "tracePng": "<out_trace.png>", "result": "<result.json>",
//     "threshold": 128, "paths": 50, "corners": 75, "noise": 25, "snap": true }
// 동작: 새 RGB 문서 → PNG 배치·임베드 → 아트보드를 이미지 크기로 → Image Trace(흑백 로고 계열 옵션) → 확장
//       → 1:1 PNG24(QA 용) + SVG 1.1 내보내기 + .ai 저장 → result.json 기록 → 문서 닫기. Illustrator 는 종료하지 않는다.
// 주의: 입력은 이미 이진화된 검정 잉크 / 흰 배경 PNG 여야 한다(반전·알파 처리는 vectorize.mjs 가 먼저 수행).
// #target illustrator

var __topArgs = (typeof arguments !== 'undefined') ? arguments : null;

(function () {
  function jobFilePath() {
    if (__topArgs && __topArgs.length > 0 && __topArgs[0]) return String(__topArgs[0]);
    return Folder.temp.fsName + '/nexus-vector-forge/job.json';
  }
  function readText(p) {
    var f = new File(p); f.encoding = 'UTF-8';
    if (!f.exists) throw new Error('job 파일 없음: ' + p);
    f.open('r'); var t = f.read(); f.close();
    if (t.charCodeAt(0) === 0xFEFF) t = t.substring(1);
    return t;
  }
  function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n'); }
  function toJson(obj) {
    var parts = [];
    for (var k in obj) {
      if (!obj.hasOwnProperty(k)) continue;
      var v = obj[k];
      var enc = (typeof v === 'number' || typeof v === 'boolean') ? String(v) : (v === null || v === undefined ? 'null' : '"' + esc(v) + '"');
      parts.push('"' + k + '":' + enc);
    }
    return '{' + parts.join(',') + '}';
  }
  function writeResult(p, obj) {
    var f = new File(p); f.encoding = 'UTF-8'; f.open('w'); f.write(toJson(obj)); f.close();
  }
  // 버전마다 이름이 다른 속성을 순서대로 시도 (CS6+ *Fidelity / 구버전 pathFitting·cornerAngle·minArea)
  function setFirst(target, names, value) {
    if (value === undefined || value === null) return null;
    for (var i = 0; i < names.length; i++) {
      try { target[names[i]] = value; return names[i]; } catch (e) { /* 다음 이름 */ }
    }
    return null;
  }
  function countPaths(item) {
    var n = 0;
    try { n += item.pathItems.length; } catch (e) {}
    try { n += item.compoundPathItems.length; } catch (e) {}
    try { for (var i = 0; i < item.groupItems.length; i++) n += countPaths(item.groupItems[i]); } catch (e) {}
    return n;
  }

  var jobPath = jobFilePath();
  var job = null; var resultPath = null;
  try {
    job = eval('(' + readText(jobPath) + ')');
    resultPath = job.result;
  } catch (e) {
    // job 을 못 읽으면 결과 경로도 모름 — 기본 경로에 기록
    writeResult(Folder.temp.fsName + '/nexus-vector-forge/result.json', { ok: false, error: 'job 읽기 실패: ' + e.message });
    return;
  }

  var doc = null;
  try {
    var input = new File(job.input);
    if (!input.exists) throw new Error('입력 PNG 없음: ' + job.input);

    var prevLevel = app.userInteractionLevel;
    app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

    doc = app.documents.add(DocumentColorSpace.RGB, 1000, 1000);
    var placed = doc.placedItems.add();
    placed.file = input;
    placed.embed(); // PlacedItem → RasterItem
    if (doc.rasterItems.length < 1) throw new Error('임베드 후 RasterItem 을 찾지 못함');
    var raster = doc.rasterItems[0];
    var w = raster.width; var h = raster.height;
    doc.artboards[0].artboardRect = [0, 0, w, -h];
    raster.position = [0, 0];

    // RasterItem.trace() 는 PluginItem 을 돌려주고, TracingObject 는 그 .tracing 속성 (2026 에서 확인)
    var plugin = raster.trace();
    var tracing = (plugin && plugin.tracing) ? plugin.tracing : plugin;
    if (!tracing || !tracing.tracingOptions) throw new Error('TracingObject 를 얻지 못함 (trace() 반환: ' + (plugin ? plugin.typename : 'null') + ')');
    var o = tracing.tracingOptions;
    o.tracingMode = TracingModeType.TRACINGMODEBLACKANDWHITE;
    try { o.threshold = job.threshold || 128; } catch (e0) {}
    var usedPaths = setFirst(o, ['pathFidelity', 'pathFitting'], job.paths);
    var usedCorners = setFirst(o, ['cornerFidelity', 'cornerAngle'], job.corners);
    var usedNoise = setFirst(o, ['noiseFidelity', 'minArea'], job.noise);
    try { o.tracingMethod = TracingMethodType.TRACINGMETHODABUTTING; } catch (e1) {}
    try { o.fills = true; } catch (e2) {}
    try { o.strokes = false; } catch (e3) {}
    try { o.ignoreWhite = true; } catch (e4) {}
    try { o.snapCurveToLines = (job.snap === true || job.snap === 1); } catch (e5) {}  // 정리 단계 대응: 직선에 가까운 곡선을 직선으로
    try { o.viewMode = ViewType.TRACINGVIEWVECTORTRACINGRESULT; } catch (e6) {}
    app.redraw();

    var group = tracing.expandTracing();
    app.redraw();
    var pathCount = countPaths(group);

    // QA 용 1:1 PNG (아트보드 클리핑, 흰 배경)
    var pngOpt = new ExportOptionsPNG24();
    pngOpt.artBoardClipping = true; pngOpt.transparency = false; pngOpt.antiAliasing = true;
    pngOpt.horizontalScale = 100; pngOpt.verticalScale = 100;
    doc.exportFile(new File(job.tracePng), ExportType.PNG24, pngOpt);

    // SVG 1.1
    var svgOpt = new ExportOptionsSVG();
    svgOpt.embedRasterImages = false;
    svgOpt.coordinatePrecision = 3;
    try { svgOpt.DTD = SVGDTDVersion.SVG1_1; } catch (e7) {}
    try { svgOpt.fontSubsetting = SVGFontSubsetting.None; } catch (e8) {}
    try { svgOpt.documentEncoding = SVGDocumentEncoding.UTF8; } catch (e9) {}
    try { svgOpt.cssProperties = SVGCSSPropertyLocation.PRESENTATIONATTRIBUTES; } catch (e10) {}
    doc.exportFile(new File(job.svg), ExportType.SVG, svgOpt);

    // .ai (PDF 호환)
    var aiOpt = new IllustratorSaveOptions();
    try { aiOpt.pdfCompatible = true; } catch (e11) {}
    doc.saveAs(new File(job.ai), aiOpt);
    doc.close(SaveOptions.DONOTSAVECHANGES);
    doc = null;
    app.userInteractionLevel = prevLevel;

    writeResult(resultPath, {
      ok: true, width: w, height: h, pathCount: pathCount,
      svg: job.svg, ai: job.ai, tracePng: job.tracePng,
      props: [usedPaths, usedCorners, usedNoise].join(','),
      version: String(app.version)
    });
  } catch (err) {
    try { if (doc) doc.close(SaveOptions.DONOTSAVECHANGES); } catch (e12) {}
    writeResult(resultPath || (Folder.temp.fsName + '/nexus-vector-forge/result.json'), {
      ok: false, error: String(err.message || err), line: (err.line || 0), version: String(app.version)
    });
  }
})();
