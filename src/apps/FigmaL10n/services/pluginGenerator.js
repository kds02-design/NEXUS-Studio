// Figma 플러그인 3종 파일(manifest.json / code.js / ui.html)을 번역 맵에서 생성.
// 생성되는 코드는 Figma 데스크톱에서 그대로 동작하는 검증된 산출물 — 가급적 손대지 말 것.
// (escape 시퀀스가 plugin 런타임 기준으로 정밀하게 맞춰져 있음)
import { LANG_CONFIG } from '../constants/langConfig';

export function generateManifest(pluginName) {
  return JSON.stringify({
    name: pluginName,
    id: 'l10n-translator-' + Date.now(),
    api: '1.0.0',
    main: 'code.js',
    ui: 'ui.html',
    editorType: ['figma'],
    capabilities: []
  }, null, 2);
}

export function generateCodeJs(langMaps) {
  const langCodes = Object.keys(langMaps);

  const mapLines = langCodes.map(code => {
    const json = JSON.stringify(langMaps[code]);
    return `const ${code}_MAP = ${json};`;
  }).join('\n');

  const fontEntries = langCodes.map(code => `  ${code.toLowerCase()}: '${LANG_CONFIG[code].font}'`).join(',\n');
  const mapLookup = langCodes.map(code => `lang === '${code.toLowerCase()}' ? ${code}_MAP`).join(' : ') + ' : null';
  const langLabel = langCodes.map(code => {
    const cfg = LANG_CONFIG[code];
    return `lang === '${code.toLowerCase()}' ? '${cfg.name}(${code}) · ${cfg.font}'`;
  }).join(' : ') + " : ''";

  return `// L10N 번역 플러그인 — 자동 생성됨
// 지원 언어: ${langCodes.join(', ')}

${mapLines}

const FONT_FAMILY = {
${fontEntries}
};

const NOTO_STYLES = ['Thin', 'Light', 'Regular', 'Medium', 'SemiBold', 'Bold', 'Black'];

function mapFontStyle(s) {
  s = s.toLowerCase();
  if (s.includes('thin')) return 'Thin';
  if (s.includes('extralight') || s.includes('extra light')) return 'Light';
  if (s.includes('light')) return 'Light';
  if (s.includes('semibold') || s.includes('semi bold') || s.includes('demibold')) return 'SemiBold';
  if (s.includes('extrabold') || s.includes('extra bold') || s.includes('heavy')) return 'Black';
  if (s.includes('black')) return 'Black';
  if (s.includes('bold')) return 'Bold';
  if (s.includes('medium')) return 'Medium';
  return 'Regular';
}

figma.showUI(__html__, { width: 420, height: 600 });

function getAllTextNodes(node) {
  let nodes = [];
  if (node.type === 'TEXT') nodes.push(node);
  else if ('children' in node)
    for (const child of node.children) nodes = nodes.concat(getAllTextNodes(child));
  return nodes;
}

function isInAutoLayout(node) {
  return node.parent && 'layoutMode' in node.parent &&
         (node.parent.layoutMode === 'HORIZONTAL' || node.parent.layoutMode === 'VERTICAL');
}

function enforceOneLine(node, originalWidth) {
  if (isInAutoLayout(node)) {
    try {
      if ('layoutSizingHorizontal' in node) {
        const beforeWidth = node.width;
        try { node.layoutSizingHorizontal = 'HUG'; } catch (e) {}
        const afterWidth = node.width;
        return { expanded: afterWidth > beforeWidth };
      }
    } catch (e) {}
    return { expanded: false };
  }
  if (node.textAutoResize === 'NONE') {
    node.textAutoResize = 'WIDTH_AND_HEIGHT';
    const w = node.width;
    node.textAutoResize = 'NONE';
    if (w > originalWidth) { node.resize(w, node.height); return { expanded: true }; }
    return { expanded: false };
  }
  if (node.textAutoResize === 'HEIGHT') {
    node.textAutoResize = 'WIDTH_AND_HEIGHT';
    const w = node.width;
    node.textAutoResize = 'HEIGHT';
    if (w > originalWidth) { node.resize(w, node.height); return { expanded: true }; }
    return { expanded: false };
  }
  return { expanded: false };
}

async function applyTranslation(node, translatedText, lang) {
  const targetFamily = FONT_FAMILY[lang];
  if (!targetFamily) throw new Error('Invalid lang: ' + lang);
  const originalWidth = node.width;

  const existingFonts = new Set();
  if (node.fontName === figma.mixed) {
    for (let i = 0; i < node.characters.length; i++) {
      const fn = node.getRangeFontName(i, i + 1);
      if (fn !== figma.mixed) existingFonts.add(JSON.stringify(fn));
    }
  } else {
    existingFonts.add(JSON.stringify(node.fontName));
  }
  for (const fnStr of existingFonts) {
    await figma.loadFontAsync(JSON.parse(fnStr)).catch(() => {});
  }

  const style = node.fontName !== figma.mixed ? mapFontStyle(node.fontName.style) : 'Regular';
  let targetFont = { family: targetFamily, style };
  try {
    await figma.loadFontAsync(targetFont);
  } catch (e) {
    targetFont = { family: targetFamily, style: 'Regular' };
    try { await figma.loadFontAsync(targetFont); }
    catch (e2) { throw new Error(targetFamily + ' 폰트 로드 실패'); }
  }
  node.characters = translatedText;
  node.setRangeFontName(0, translatedText.length, targetFont);
  return enforceOneLine(node, originalWidth);
}

function lookupTranslation(MAP, text) {
  function variants(t) {
    var list = [t];
    var bulletToStar = t.replace(/^[•·▪︎\\-]\\s*/, '*');
    if (bulletToStar !== t) list.push(bulletToStar);
    var noSpace = t.replace(/ \\(/g, '(');
    if (noSpace !== t) list.push(noSpace);
    var single = t.split('\\\\\\\\').join('\\\\');
    var dbl    = t.split('\\\\').join('\\\\\\\\');
    if (single !== t) list.push(single);
    if (dbl !== t) list.push(dbl);
    var withBr = t.split('\\n').join('<br>');
    var withNl = t.split('<br>').join('\\n');
    if (withBr !== t) list.push(withBr);
    if (withNl !== t) list.push(withNl);
    return list;
  }

  for (const v of variants(text)) if (MAP[v] !== undefined) return MAP[v];
  const noSpace = text.replace(/ \\(/g, '(');
  if (noSpace !== text) for (const v of variants(noSpace)) if (MAP[v] !== undefined) return MAP[v];
  const star = text.replace(/^[•·▪︎\\-]\\s*/, '*');
  if (star !== text) {
    for (const v of variants(star)) if (MAP[v] !== undefined) return MAP[v];
    for (const v of variants(star.replace(/ \\(/g, '('))) if (MAP[v] !== undefined) return MAP[v];
  }

  if (text.indexOf('\\n') !== -1) {
    const lines = text.split('\\n');
    const translatedLines = [];
    let anyMatched = false;
    for (const line of lines) {
      const t = line.trim();
      if (t.length === 0) { translatedLines.push(line); continue; }
      const r = lookupSingleLine(MAP, t);
      if (r !== null) { translatedLines.push(r); anyMatched = true; }
      else translatedLines.push(line);
    }
    if (anyMatched) return translatedLines.join('\\n');
  }

  return null;
}

function lookupSingleLine(MAP, text) {
  if (MAP[text] !== undefined) return MAP[text];
  const noSpace = text.replace(/ \\(/g, '(');
  if (MAP[noSpace] !== undefined) return MAP[noSpace];
  const single = text.split('\\\\\\\\').join('\\\\');
  if (MAP[single] !== undefined) return MAP[single];
  const dbl = text.split('\\\\').join('\\\\\\\\');
  if (MAP[dbl] !== undefined) return MAP[dbl];
  const star = text.replace(/^[•·▪︎\\-]\\s*/, '*');
  if (MAP[star] !== undefined) return MAP[star];
  return null;
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'translate') {
   try {
    const lang = msg.lang;
    const scope = msg.scope;
    const MAP = ${mapLookup};
    if (!MAP) throw new Error('Invalid lang: ' + lang);
    const langLabel = ${langLabel};

    let targetNodes = [];
    if (scope === 'selection') {
      for (const node of figma.currentPage.selection)
        targetNodes = targetNodes.concat(getAllTextNodes(node));
    } else {
      targetNodes = getAllTextNodes(figma.currentPage);
    }

    if (targetNodes.length === 0) {
      figma.ui.postMessage({ type: 'result', success: false, message: '텍스트 노드를 찾을 수 없습니다.' });
      return;
    }

    const targetFamily = FONT_FAMILY[lang];
    for (const style of NOTO_STYLES) {
      await figma.loadFontAsync({ family: targetFamily, style }).catch(() => {});
    }

    let matched = 0, expanded = 0, fontErrors = [], unmatched = [];

    for (const node of targetNodes) {
      const original = node.characters.trim();
      let lookupText = original;
      let isAutoBullet = false;
      try {
        if ('getRangeListOptions' in node && original.length > 0) {
          const lo = node.getRangeListOptions(0, Math.min(1, original.length));
          if (lo && lo.type === 'UNORDERED') {
            isAutoBullet = true;
            lookupText = original.split('\\n').map(line => {
              const t = line.trim();
              if (t.length === 0) return line;
              return t.startsWith('*') ? line : '*' + line;
            }).join('\\n');
          }
        }
      } catch (e) {}

      let translated = lookupTranslation(MAP, lookupText);
      if (translated === null && isAutoBullet) translated = lookupTranslation(MAP, original);
      if (translated === null && !isAutoBullet) {
        const starPrefixed = original.split('\\n').map(line => {
          const t = line.trim();
          if (t.length === 0 || t.startsWith('*')) return line;
          return '*' + line;
        }).join('\\n');
        if (starPrefixed !== original) translated = lookupTranslation(MAP, starPrefixed);
      }
      if (translated !== null && isAutoBullet) {
        translated = translated.split('\\n').map(l => l.replace(/^\\*/, '')).join('\\n');
      }

      if (translated !== null) {
        try {
          const result = await applyTranslation(node, translated, lang);
          matched++;
          if (result && result.expanded) expanded++;
        } catch (e) {
          fontErrors.push(original.substring(0, 30));
        }
      } else {
        if (original.length > 0) unmatched.push(original);
      }
    }

    figma.ui.postMessage({
      type: 'result', success: true, lang: langLabel,
      matched, expanded, total: targetNodes.length,
      unmatched: unmatched.slice(0, 50),
      fontErrors: fontErrors.slice(0, 10)
    });
   } catch (err) {
    figma.ui.postMessage({ type: 'result', success: false, message: '오류: ' + err.message });
   }
  }

  if (msg.type === 'close') figma.closePlugin();
};
`;
}

export function generateUiHtml(langMaps, pluginName) {
  const langCodes = Object.keys(langMaps);

  const tabsHtml = langCodes.map((code, i) => {
    const cfg = LANG_CONFIG[code];
    const active = i === 0 ? ' active' : '';
    return `    <div class="lang-tab${active}" data-lang="${code.toLowerCase()}">
      <span class="flag">${cfg.flag}</span>
      <div class="label">${cfg.name}</div>
      <div class="font-name">${cfg.font}</div>
    </div>`;
  }).join('\n');

  const firstLangCode = langCodes[0].toLowerCase();
  const firstFont = LANG_CONFIG[langCodes[0]].font;
  const fontMapJs = '{' + langCodes.map(c => `${c.toLowerCase()}:'${LANG_CONFIG[c].font}'`).join(',') + '}';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Noto Sans KR', sans-serif; font-size: 13px; background: #f5f5f5; color: #1a1a1a; }
  .header { background: linear-gradient(135deg, #1a1a1a, #2a2a2a); color: white; padding: 16px 20px 14px; }
  .header h1 { font-size: 15px; font-weight: 700; }
  .header p { font-size: 11px; opacity: 0.7; margin-top: 3px; }
  .section { background: white; margin: 10px 10px 0; border-radius: 10px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.07); }
  .section-title { font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
  .lang-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
  .lang-tab { flex: 1; min-width: calc(33% - 6px); padding: 10px 6px; border: 2px solid #e5e5e5; border-radius: 8px; background: white; cursor: pointer; text-align: center; user-select: none; }
  .lang-tab .flag { font-size: 20px; display: block; margin-bottom: 3px; }
  .lang-tab .label { font-size: 11px; font-weight: 600; color: #555; }
  .lang-tab .font-name { font-size: 9px; color: #aaa; margin-top: 1px; }
  .lang-tab.active { border-color: #1a1a1a; background: #f0f0f0; }
  .lang-tab.active .label { color: #1a1a1a; }
  .info-badges { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
  .badge { display: flex; align-items: center; gap: 6px; border-radius: 7px; padding: 7px 11px; font-size: 11px; font-weight: 500; background: #f0f0f0; color: #444; }
  .scope-options { display: flex; gap: 8px; }
  .scope-opt { flex: 1; display: flex; align-items: center; gap: 8px; padding: 10px 12px; border: 2px solid #e5e5e5; border-radius: 8px; cursor: pointer; user-select: none; }
  .scope-opt.active { border-color: #1a1a1a; background: #f0f0f0; }
  .scope-opt .scope-icon { font-size: 18px; }
  .scope-opt .scope-text { font-size: 12px; font-weight: 600; color: #444; }
  .scope-opt .scope-sub { font-size: 10px; color: #aaa; }
  .btn-row { display: flex; gap: 8px; margin: 10px 10px 0; }
  .btn { flex: 1; padding: 11px; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
  .btn-apply { background: #1a1a1a; color: white; }
  .result-box { margin: 10px 10px 0; border-radius: 10px; padding: 14px 16px; display: none; }
  .result-success { background: #f0fdf4; border: 1px solid #86efac; }
  .result-error { background: #fef2f2; border: 1px solid #fca5a5; }
  .result-title { font-size: 13px; font-weight: 700; margin-bottom: 6px; }
  .stats-grid { display: flex; gap: 6px; margin-bottom: 10px; }
  .stat-card { flex: 1; background: white; border-radius: 7px; padding: 8px 10px; text-align: center; border: 1px solid #e5e5e5; }
  .stat-num { font-size: 18px; font-weight: 700; }
  .stat-lbl { font-size: 10px; color: #888; margin-top: 1px; }
  .sub-title { font-size: 11px; color: #888; font-weight: 600; margin: 8px 0 4px; }
  .item-list { font-size: 11px; color: #888; list-style: disc; padding-left: 16px; }
  .footer { height: 14px; }
</style>
</head>
<body>

<div class="header">
  <h1>🌏 ${pluginName}</h1>
  <p>지원 ${langCodes.length}개 언어 · 폰트 자동 변경 · 1줄 박스 자동 확장</p>
</div>

<div class="section">
  <div class="section-title">번역 언어 선택</div>
  <div class="lang-tabs">
${tabsHtml}
  </div>
  <div class="info-badges">
    <div class="badge">🔤 폰트 자동 교체 → <strong id="font-target">${firstFont}</strong></div>
    <div class="badge">↔ 텍스트 넘침 시 박스 너비 자동 확장 (1줄 유지)</div>
  </div>
</div>

<div class="section">
  <div class="section-title">적용 범위</div>
  <div class="scope-options">
    <div class="scope-opt active" id="scope-selection">
      <span class="scope-icon">🔲</span>
      <div><div class="scope-text">선택 영역</div><div class="scope-sub">선택된 레이어만</div></div>
    </div>
    <div class="scope-opt" id="scope-page">
      <span class="scope-icon">📄</span>
      <div><div class="scope-text">현재 페이지</div><div class="scope-sub">전체 페이지</div></div>
    </div>
  </div>
</div>

<div class="btn-row">
  <button class="btn btn-apply" id="btn-apply">✅ 번역 적용</button>
</div>

<div class="result-box" id="result-box">
  <div class="result-title" id="result-title"></div>
  <div class="stats-grid" id="stats-grid"></div>
  <div id="unmatched-wrap"></div>
</div>

<div class="footer"></div>

<script>
(function() {
  var selectedLang = '${firstLangCode}';
  var selectedScope = 'selection';
  var FONT_MAP = ${fontMapJs};

  document.querySelectorAll('.lang-tab').forEach(function(tab) {
    tab.addEventListener('click', function() { selectLang(tab.getAttribute('data-lang')); });
  });
  document.getElementById('scope-selection').addEventListener('click', function() { selectScope('selection'); });
  document.getElementById('scope-page').addEventListener('click', function() { selectScope('page'); });
  document.getElementById('btn-apply').addEventListener('click', doTranslate);

  function selectLang(lang) {
    selectedLang = lang;
    document.querySelectorAll('.lang-tab').forEach(function(tab) {
      tab.classList.toggle('active', tab.getAttribute('data-lang') === lang);
    });
    document.getElementById('font-target').textContent = FONT_MAP[lang];
    hideResults();
  }
  function selectScope(scope) {
    selectedScope = scope;
    document.getElementById('scope-selection').classList.toggle('active', scope === 'selection');
    document.getElementById('scope-page').classList.toggle('active', scope === 'page');
    hideResults();
  }
  function hideResults() { document.getElementById('result-box').style.display = 'none'; }
  function doTranslate() {
    document.getElementById('result-box').style.display = 'none';
    parent.postMessage({ pluginMessage: { type: 'translate', lang: selectedLang, scope: selectedScope } }, '*');
  }

  window.addEventListener('message', function(event) {
    var msg = event.data.pluginMessage;
    if (!msg) return;
    if (msg.type === 'result') {
      var box = document.getElementById('result-box');
      box.className = 'result-box ' + (msg.success ? 'result-success' : 'result-error');
      document.getElementById('result-title').textContent = msg.success ? '번역 적용 완료 ✅' : '오류 ❌';
      var grid = document.getElementById('stats-grid');
      if (msg.success) {
        grid.innerHTML =
          '<div class="stat-card"><div class="stat-num">' + msg.matched + '</div><div class="stat-lbl">번역</div></div>' +
          '<div class="stat-card"><div class="stat-num">' + msg.expanded + '</div><div class="stat-lbl">박스 확장</div></div>' +
          '<div class="stat-card"><div class="stat-num">' + (msg.unmatched ? msg.unmatched.length : 0) + '</div><div class="stat-lbl">미매칭</div></div>';
      } else {
        grid.innerHTML = '<div style="font-size:12px;color:#991b1b;">' + (msg.message || '') + '</div>';
      }
      var unmatchedWrap = document.getElementById('unmatched-wrap');
      unmatchedWrap.innerHTML = '';
      if (msg.unmatched && msg.unmatched.length > 0) {
        var title = document.createElement('div');
        title.className = 'sub-title';
        title.textContent = '미매칭 (' + msg.unmatched.length + '개):';
        unmatchedWrap.appendChild(title);
        var ul = document.createElement('ul');
        ul.className = 'item-list';
        msg.unmatched.forEach(function(t) {
          var li = document.createElement('li');
          li.textContent = JSON.stringify(t);
          li.style.fontFamily = 'monospace';
          li.style.fontSize = '10px';
          li.style.wordBreak = 'break-all';
          ul.appendChild(li);
        });
        unmatchedWrap.appendChild(ul);
      }
      box.style.display = 'block';
    }
  });
})();
</script>
</body>
</html>`;
}
