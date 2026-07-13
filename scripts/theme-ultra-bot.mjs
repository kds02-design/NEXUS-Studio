#!/usr/bin/env node
/*
 * theme-ultra-bot.mjs — ThemeForge 프롬프트 큐를 Gemini(웹앱)에서 무인 배치 생성.
 *
 * ⚠️  경고 / 책임 범위
 *   - 이 스크립트는 gemini.google.com UI 를 브라우저 자동화로 조종합니다.
 *   - Google 서비스 약관(ToS)상 자동화는 회색지대이며, 봇 감지·CAPTCHA·UI 변경으로 언제든 깨질 수 있습니다.
 *   - 본인이 구독한 본인 계정을 본인 PC에서 본인 작업용으로만 사용하세요. 대량/상업 자동화·계정 공유 금지.
 *   - 자격증명은 코드에 넣지 않습니다. 최초 1회 브라우저에서 수동 로그인 → 영속 프로필(쿠키)로 이후 무인 실행.
 *
 * 준비 (최초 1회)
 *   npm i -D playwright
 *   npx playwright install chromium
 *
 * 최초 로그인 (헤드풀 1회)
 *   node scripts/theme-ultra-bot.mjs --login
 *   → 열린 창에서 Google 로그인 완료 후 터미널에서 Enter. 프로필이 .ultra-profile/ 에 저장됨.
 *
 * 무인 배치 (퇴근 시)
 *   node scripts/theme-ultra-bot.mjs --queue theme-prompts.json --out theme-output
 *   (환경변수도 가능: QUEUE, OUT, HEADLESS=1, MAX, PREFIX)
 *
 * 입력: ThemeForge "내보내기 → .json" 결과 ([{tags, prompt}] 또는 문자열 배열) / 또는 .txt(빈 줄 구분).
 * 출력: OUT 폴더에 NNN_태그.png + run-log.json.
 *
 * UI 셀렉터는 자주 바뀝니다 → 아래 CONFIG.selectors 를 필요 시 조정하세요. 실패 시 OUT/_debug 에 스크린샷 저장.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

// Playwright 는 devDependency. 미설치 시 친절한 안내.
let chromium;
try { ({ chromium } = await import('playwright')); }
catch {
  console.error('\n[theme-ultra-bot] playwright 가 설치되어 있지 않습니다.\n  npm i -D playwright\n  npx playwright install chromium\n');
  process.exit(1);
}

// ─── 인자 파싱 ────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 && args[i + 1] ? args[i + 1] : def; };

const CONFIG = {
  url: 'https://gemini.google.com/app',
  userDataDir: opt('profile', process.env.PROFILE || '.ultra-profile'),
  queueFile: opt('queue', process.env.QUEUE || 'theme-prompts.json'),
  outDir: opt('out', process.env.OUT || 'theme-output'),
  headless: flag('login') ? false : (process.env.HEADLESS === '1' || flag('headless')),
  loginOnly: flag('login'),
  maxItems: Number(opt('max', process.env.MAX || 0)),          // 0 = 전체
  // 이미지 생성 강제용 접두어. Gemini 가 텍스트로 답하지 않고 이미지를 그리도록 유도.
  promptPrefix: opt('prefix', process.env.PREFIX || 'Generate a single high-detail image (no text explanation): '),
  perPromptTimeoutMs: Number(process.env.PROMPT_TIMEOUT || 150000),
  betweenMs: Number(process.env.BETWEEN || 5000),              // 요청 간 간격 (봇감지 완화)
  // ⚙️ TUNE — UI 바뀌면 여기 조정. 여러 후보를 콤마 OR 로.
  selectors: {
    input: 'div[contenteditable="true"], rich-textarea div[contenteditable="true"], textarea',
    sendButton: 'button[aria-label*="Send" i], button[aria-label*="보내기"], button[aria-label*="전송"], button.send-button',
    // 생성 이미지 후보 — googleusercontent 호스트가 가장 안정적.
    generatedImg: 'img[src*="googleusercontent"], message-content img, response-container img, img[alt*="image" i]',
    loginNeeded: 'a[href*="accounts.google.com"], input[type="email"]',
  },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitForEnter = (msg) => new Promise((res) => {
  process.stdout.write(msg);
  process.stdin.resume();
  process.stdin.once('data', () => { process.stdin.pause(); res(); });
});
const slug = (s) => String(s || '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'item';

// ─── 큐 로드 ──────────────────────────────────────────────
function loadQueue(file) {
  if (!fs.existsSync(file)) { console.error(`[theme-ultra-bot] 큐 파일 없음: ${file}`); process.exit(1); }
  const raw = fs.readFileSync(file, 'utf8');
  let items = [];
  if (file.endsWith('.json')) {
    const j = JSON.parse(raw);
    items = (Array.isArray(j) ? j : []).map((it) => typeof it === 'string' ? { prompt: it, tags: [] } : { prompt: it.prompt || '', tags: it.tags || [] });
  } else {
    // .txt — 빈 줄 구분, '#' 로 시작하는 헤더 줄은 제거.
    items = raw.split(/\n\s*\n/).map((block) => {
      const lines = block.split('\n').filter((l) => !l.trim().startsWith('#'));
      return { prompt: lines.join(' ').trim(), tags: [] };
    });
  }
  items = items.filter((it) => it.prompt && it.prompt.trim());
  if (CONFIG.maxItems > 0) items = items.slice(0, CONFIG.maxItems);
  return items;
}

// ─── 페이지 유틸 ──────────────────────────────────────────
async function firstVisible(page, selector, timeout = 8000) {
  try { const loc = page.locator(selector).first(); await loc.waitFor({ state: 'visible', timeout }); return loc; }
  catch { return null; }
}

async function ensureLoggedIn(page) {
  await page.goto(CONFIG.url, { waitUntil: 'domcontentloaded' });
  await sleep(3000);
  const input = await firstVisible(page, CONFIG.selectors.input, 8000);
  if (input) return true;
  // 로그인 벽 감지
  if (CONFIG.headless) {
    console.error('\n[theme-ultra-bot] 로그인 세션이 없습니다. 먼저 헤드풀 로그인을 실행하세요:\n  node scripts/theme-ultra-bot.mjs --login\n');
    return false;
  }
  console.log('\n[theme-ultra-bot] 열린 브라우저에서 Google 로그인을 완료하세요.');
  await waitForEnter('로그인 완료 후 이 터미널에서 Enter 를 누르세요… ');
  const input2 = await firstVisible(page, CONFIG.selectors.input, 8000);
  return !!input2;
}

// 프롬프트 1건 전송 → 새로 나타난 생성 이미지 src 목록 반환.
async function generateOne(page, prompt) {
  const before = await page.locator(CONFIG.selectors.generatedImg).count().catch(() => 0);

  const input = await firstVisible(page, CONFIG.selectors.input, 10000);
  if (!input) throw new Error('입력창을 찾지 못함 (selectors.input 조정 필요)');
  await input.click();
  await input.fill('');
  await input.type(CONFIG.promptPrefix + prompt, { delay: 6 });

  const send = await firstVisible(page, CONFIG.selectors.sendButton, 3000);
  if (send) await send.click(); else await page.keyboard.press('Enter');

  // 새 이미지가 나타날 때까지 폴링.
  const deadline = Date.now() + CONFIG.perPromptTimeoutMs;
  let count = before;
  while (Date.now() < deadline) {
    await sleep(2500);
    count = await page.locator(CONFIG.selectors.generatedImg).count().catch(() => before);
    if (count > before) { await sleep(2500); break; } // 렌더 안정화 여유
  }
  if (count <= before) throw new Error('시간 내 생성 이미지 미검출 (timeout 또는 selectors.generatedImg 조정)');

  const imgs = page.locator(CONFIG.selectors.generatedImg);
  const total = await imgs.count();
  const srcs = [];
  for (let i = before; i < total; i++) {
    const src = await imgs.nth(i).getAttribute('src').catch(() => null);
    if (src) srcs.push(src);
  }
  return srcs;
}

// 브라우저 컨텍스트(로그인 쿠키 보유) 안에서 이미지 fetch → base64.
async function downloadInPage(page, src) {
  return page.evaluate(async (url) => {
    const r = await fetch(url);
    const blob = await r.blob();
    return await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
  }, src);
}
function saveDataUrl(dataUrl, filePath) {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  if (!m) return false;
  fs.writeFileSync(filePath, Buffer.from(m[2], 'base64'));
  return true;
}

// ─── 메인 ─────────────────────────────────────────────────
(async () => {
  fs.mkdirSync(CONFIG.outDir, { recursive: true });
  const debugDir = path.join(CONFIG.outDir, '_debug');

  const context = await chromium.launchPersistentContext(CONFIG.userDataDir, {
    headless: CONFIG.headless,
    viewport: { width: 1280, height: 900 },
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const page = context.pages()[0] || await context.newPage();

  try {
    const ok = await ensureLoggedIn(page);
    if (!ok) { await context.close(); process.exit(1); }
    console.log('[theme-ultra-bot] 로그인 확인됨.');

    if (CONFIG.loginOnly) {
      console.log('[theme-ultra-bot] 로그인 프로필 저장 완료. 이제 무인 실행이 가능합니다.');
      await context.close();
      process.exit(0);
    }

    const queue = loadQueue(CONFIG.queueFile);
    console.log(`[theme-ultra-bot] 큐 ${queue.length}건 · 출력 → ${CONFIG.outDir}`);

    const log = [];
    let okCount = 0;
    for (let i = 0; i < queue.length; i++) {
      const { prompt, tags } = queue[i];
      const label = `${String(i + 1).padStart(3, '0')}/${queue.length}`;
      const base = `${String(i + 1).padStart(3, '0')}_${slug(tags[0] ? tags.slice(0, 3).join('-') : prompt)}`;
      try {
        console.log(`[${label}] 생성 중… ${tags.join(', ') || prompt.slice(0, 50)}`);
        const srcs = await generateOne(page, prompt);
        let saved = 0;
        for (let s = 0; s < srcs.length; s++) {
          const dataUrl = await downloadInPage(page, srcs[s]).catch(() => null);
          const file = path.join(CONFIG.outDir, srcs.length > 1 ? `${base}_${s + 1}.png` : `${base}.png`);
          if (dataUrl && saveDataUrl(dataUrl, file)) saved++;
        }
        okCount += saved > 0 ? 1 : 0;
        log.push({ i: i + 1, tags, prompt, saved, images: srcs.length, ok: saved > 0 });
        console.log(`[${label}] 저장 ${saved}장`);
      } catch (e) {
        console.warn(`[${label}] 실패: ${e.message}`);
        fs.mkdirSync(debugDir, { recursive: true });
        await page.screenshot({ path: path.join(debugDir, `${base}_fail.png`), fullPage: true }).catch(() => {});
        log.push({ i: i + 1, tags, prompt, ok: false, error: e.message });
      }
      fs.writeFileSync(path.join(CONFIG.outDir, 'run-log.json'), JSON.stringify(log, null, 2));
      await sleep(CONFIG.betweenMs);
    }

    console.log(`\n[theme-ultra-bot] 완료 — 성공 ${okCount}/${queue.length}. 로그: ${path.join(CONFIG.outDir, 'run-log.json')}`);
  } catch (e) {
    console.error('[theme-ultra-bot] 치명적 오류:', e);
  } finally {
    await context.close();
  }
  process.exit(0);
})();
