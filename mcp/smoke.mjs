// NEXUS MCP 스모크 테스트 — SDK Client 로 번들 서버를 stdio 스폰해 전체 툴을 검증.
// 실행: npm run mcp:test  (선행: npm run mcp:build). 실제 Gemini 렌더는 비용 문제로 호출하지 않음.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createCanvas } from "@napi-rs/canvas";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/, "")), "..");
const SCRATCH = path.join(ROOT, ".tmp");

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`PASS ${name}`); }
  else { fail++; console.log(`FAIL ${name} ${detail}`); }
};

// 테스트 이미지: 블랙 배경 + 불투명 캐릭터(원) + 주변 글로우
const testImg = path.join(SCRATCH, "char-glow-test.png");
{
  const cv = createCanvas(200, 200);
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 200, 200);
  const grad = ctx.createRadialGradient(100, 100, 40, 100, 100, 95);
  grad.addColorStop(0, "rgba(80,60,255,0.9)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 200, 200);
  ctx.fillStyle = "#e8b06a";
  ctx.beginPath(); ctx.arc(100, 100, 38, 0, Math.PI * 2); ctx.fill();
  fs.writeFileSync(testImg, cv.toBuffer("image/png"));
}

const client = new Client({ name: "smoke", version: "0.0.1" });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(ROOT, "mcp", "nexus-mcp.bundle.mjs")],
});
await client.connect(transport);

// 1) 툴 목록
const { tools } = await client.listTools();
const names = tools.map((t) => t.name).sort();
console.log("tools:", names.join(", "));
for (const n of ["nexus_guide", "nexus_list_options", "nexus_render_image", "nexus_frameforge_prompt", "nexus_lightfx_prompt", "nexus_variation_prompt", "nexus_design_alternative_prompt", "nexus_item_bundle_prompt", "nexus_quality_up_prompt", "nexus_character_fx_prompt", "nexus_typecore_sovereign_prompt", "nexus_typecore_breeze_prompt", "nexus_remove_ai", "nexus_remove_background", "nexus_alpha_plan", "nexus_alpha_batch", "nexus_split_character_effect", "nexus_design_rubric", "nexus_banner_codex_list", "nexus_banner_codex_get", "nexus_brand_web_library_list", "nexus_brand_web_library_get", "nexus_promotion_library_list", "nexus_promotion_library_get", "nexus_prompt_arc_list", "nexus_prompt_arc_get", "nexus_asset_library_list", "nexus_asset_library_get"]) {
  ok(`tool:${n}`, names.includes(n));
}

const callText = async (name, args) => {
  const r = await client.callTool({ name, arguments: args });
  return { text: r.content?.[0]?.text || "", isError: !!r.isError };
};

// 2) 옵션 카탈로그
{
  const { text } = await callText("nexus_list_options", {});
  const j = JSON.parse(text);
  ok("options:lightfx.material", Array.isArray(j.lightfx.material) && j.lightfx.material.length > 0);
  ok("options:itemBundle.ground", j.itemBundle.ground.some((o) => /회오리|vortex/.test(JSON.stringify(o))) || j.itemBundle.ground.length > 3);
  ok("options:characterFx.bg", j.characterFx.bg.some((o) => o.id === "chroma"));
  ok("options:typecore.sovereign", j.typecore.sovereignArchetype.some((o) => o.id === "core_blade"));
  ok("options:typecore.breeze", j.typecore.breezePersona.some((o) => o.id === "bubble_pop"));
  ok("options:frameforge.frame", j.frameforge.assetType.some((o) => o.id === "frame"));
  ok("options:frameforge.silhouette", j.frameforge.silhouette.some((o) => o.id === "frame_wide" && o.for.includes("frame")));
}

// 2b) FrameForge — 앱의 실제 옵션/완성형 프롬프트 빌더 재사용
{
  const f = await callText("nexus_frameforge_prompt", { assetType: "frame", silhouette: "frame_wide", mood: "gold_kingdom", renderStyle: "illustrated", userText: "날짜 텍스트 뒤에 배치할 얇은 무림풍 장식" });
  ok("frameforge:prompt", !f.isError && /frame|border|gold/i.test(f.text) && /날짜 텍스트/.test(f.text), f.text.slice(0, 160));
  const invalid = await callText("nexus_frameforge_prompt", { assetType: "badge", silhouette: "frame_wide", mood: "dark_rpg" });
  ok("frameforge:asset-silhouette-guard", invalid.isError && /사용할 수 없습니다/.test(invalid.text), invalid.text.slice(0, 160));
}

// 1b) FrameForge 확장(2026-09) — 장식/슬롯 용도 + 실루엣 비율 + 브랜드웹 키트
{
  const o = await callText("nexus_frameforge_prompt", { assetType: "ornament", silhouette: "orn_title_sides", mood: "brandweb_gold", renderStyle: "illustrated" });
  ok("frameforge:ornament", !o.isError && /NO frame, NO box/i.test(o.text) && /21:9/.test(o.text), o.text.slice(0, 160));
  const sl = await callText("nexus_frameforge_prompt", { assetType: "slot", silhouette: "slot_ground_ring", mood: "celestial" });
  ok("frameforge:slot", !sl.isError && /remain unfilled|completely empty/i.test(sl.text) && /16:9/.test(sl.text), sl.text.slice(0, 160));
  const k = await callText("nexus_frameforge_kit_prompts", { kit: "brandweb_core", mood: "brandweb_gold", userText: "리니지M 사전예약 사이트" });
  ok("frameforge:kit", !k.isError && /10종/.test(k.text) && /리니지M 사전예약/.test(k.text) && (k.text.match(/Create /g) || []).length === 10, k.text.slice(0, 160));
}

// 1c) Render Matrix — 앱 컴파일러 동일 (2026-09)
{
  const r = await callText("nexus_render_matrix_prompt", { material: "MatteGold", exactText: "시즌 4\n연못의 서약", lines: ["시즌 4", "연못의 서약"] });
  ok("rendermatrix:prompt", !r.isError && /masterpiece, best quality/.test(r.text) && /TYPOGRAPHY CONTENT LOCK/.test(r.text) && /"projectionDepth":"None"/.test(r.text), r.text.slice(0, 120));
  const p = await callText("nexus_render_matrix_prompt", { preset: "gold_relic", strictLock: false });
  ok("rendermatrix:preset", !p.isError && /"material":"AntiqueGold"/.test(p.text) && /"directorPersona":"DarkSmith"/.test(p.text), p.text.slice(-200));
  const pop = await callText("nexus_render_matrix_prompt", { variant: "pop" });
  ok("rendermatrix:pop", !pop.isError && /"directorPersona":"Chameleon"/.test(pop.text), pop.text.slice(-160));
  const bad = await callText("nexus_render_matrix_prompt", { material: "NoSuchMaterial" });
  ok("rendermatrix:guard", bad.isError && /옵션 id 오류/.test(bad.text), bad.text.slice(0, 100));
  const o = await callText("nexus_list_options", {});
  ok("options:renderMatrix", /renderMatrix/.test(o.text) && /gold_relic/.test(o.text), "catalog");
}

// 1d) 2순위 도구 — NexusPreview 4모드 / Prompt Audit / Promo Skin / Motion (2026-09)
{
  const t = await callText("nexus_title_effect_prompt", { effects: [], color: "gold", intent: "겨울 시즌" });
  ok("titlefx:prompt", !t.isError && t.text.length > 200 && /겨울 시즌/.test(t.text), t.text.slice(0, 100));
  const g = await callText("nexus_bg_generate_prompt", { concept: "서리 덮인 고대 왕성", hasReference: true });
  ok("bggen:prompt", !g.isError && /서리 덮인 고대 왕성/.test(g.text) && /복제하지 마세요/.test(g.text), g.text.slice(0, 100));
  const c = await callText("nexus_bg_compose_prompt", { intent: "우측에 용 실루엣 추가", hasAsset: false });
  ok("bgcompose:prompt", !c.isError && /새 문자 생성 절대 금지/.test(c.text) && /용 실루엣/.test(c.text), c.text.slice(0, 100));
  const f = await callText("nexus_floating_items_prompt", { itemCount: 3, effect: "lightning", outputMode: "layered-transparent" });
  ok("floating:prompt", !f.isError && /groupPlan/.test(f.text) && /Create a production-grade floating-item/.test(f.text), f.text.slice(0, 100));
  const au = await callText("nexus_prompt_audit_prompt", { prompt: "static camera, slow panning shot, photorealistic cartoon", sourceApp: "motion-metrics" });
  ok("audit:prompt", !au.isError && /Prompt Auditor/.test(au.text) && /motion-metrics/.test(au.text) && /static camera/.test(au.text), au.text.slice(0, 100));
  const th = await callText("nexus_theme_preset_prompt", { concept: "황금 축제" });
  ok("theme:prompt", !th.isError && /테마 디자이너/.test(th.text) && /황금 축제/.test(th.text), th.text.slice(0, 100));
  const mo = await callText("nexus_motion_prompt", { animationMode: "intro" });
  ok("motion:prompt", !mo.isError && mo.text.length > 100 && /negative/.test(mo.text), mo.text.slice(0, 100));
  const o = await callText("nexus_list_options", {});
  ok("options:p2", /titleFx/.test(o.text) && /floating/.test(o.text) && /motion/.test(o.text) && /promptAudit/.test(o.text), "catalog");
}

// 1e) Brief Studio Prism — 범용 규칙 + 오상스 프로필 (2026-09)
{
  const g = await callText("nexus_brief_extraction_prompt", { extraNote: "상품명 원문 유지" });
  ok("brief:generic", !g.isError && /수정요청서 해석 규칙/.test(g.text) && /craft-formula/.test(g.text) && /상품명 원문 유지/.test(g.text), g.text.slice(0, 100));
  const t = await callText("nexus_brief_profile_prompt", { profile: "osangseu", stage: "transcribe" });
  ok("brief:osangseu-transcribe", !t.isError && /빨간색 대표 아이콘/.test(t.text) && /redItems/.test(t.text), t.text.slice(0, 100));
  const e = await callText("nexus_brief_profile_prompt", { profile: "osangseu", stage: "extract", sourceText: "디자인 수정: 오늘의 선물상자 진무" });
  ok("brief:osangseu-extract", !e.isError && /slotIcons/.test(e.text) && /\[반영 희망 내용 \(전사\)\]/.test(e.text) && /오늘의 선물상자 진무/.test(e.text), e.text.slice(0, 100));
  const m = await callText("nexus_brief_profile_prompt", { profile: "osangseu", stage: "merge" });
  ok("brief:merge-guard", m.isError && /prevJson/.test(m.text), m.text.slice(0, 80));
  const pj = await callText("nexus_brief_plugin_json", { profile: "osangseu", data: { meta: { title: "6월 오늘의 상품 스페셜" }, boxes: [{ top: "오늘의 선물상자", name: "진무" }], slotIcons: [""], rollovers: [], milestones: [], popupDays: [], popupTexts: [], replacements: [], uncertain: ["테스트"] }, redItems: [{ box: "오늘의 선물상자 진무", item: "진무강 200개" }, { box: "오늘의 선물상자 진무", item: "수호수 결정 400개" }] });
  ok("brief:plugin-json", !pj.isError && /stats/.test(pj.text) && /uncertain\] 1건/.test(pj.text) && /진무강 \/ 200개 \+ 수호수 결정 \/ 400개/.test(pj.text), pj.text.slice(0, 160));
  const ex2 = await callText("nexus_brief_profile_prompt", { profile: "osangseu", stage: "extract", sourceText: "전사본", redItems: [{ box: "A", item: "x" }, { box: "A", item: "y" }] });
  ok("brief:extract-redlist", !ex2.isError && /\[붉은색 대표 아이콘 \(상자→아이템\)\]/.test(ex2.text) && /A → x \+ y/.test(ex2.text), ex2.text.slice(-200));
  const o = await callText("nexus_list_options", {});
  ok("options:brief", /osangseu/.test(o.text), "catalog");
}

// 2a) Typecore 전용 프롬프트 — 앱 옵션/빌더 기반, 순흑 배경과 정확한 텍스트 락
{
  const s = await callText("nexus_typecore_sovereign_prompt", { text: "아스트라에", archetype: "core_blade", aspectRatio: "16:9", layout: "1Line" });
  ok("typecore:sovereign", !s.isError && /아스트라에/.test(s.text) && /pure black|#000000/i.test(s.text) && /blade|다크 판타지/i.test(s.text), s.text.slice(0, 160));
  const b = await callText("nexus_typecore_breeze_prompt", { text: "봄바람", persona: "bubble_pop", aspectRatio: "16:9", layout: "1Line" });
  ok("typecore:breeze", !b.isError && /봄바람/.test(b.text) && /JET BLACK|pure black|#000000/i.test(b.text) && /MASTER TYPO SPECS/i.test(b.text), b.text.slice(0, 160));
}

// 3) 광원 프롬프트
{
  const { text, isError } = await callText("nexus_lightfx_prompt", { category: (await (async () => JSON.parse((await callText("nexus_list_options", {})).text).lightfx.category[0].id)()), style: JSON.parse((await callText("nexus_list_options", {})).text).lightfx.style[0].id, color: JSON.parse((await callText("nexus_list_options", {})).text).lightfx.color[0].id, intensity: "strong", bg: "black" });
  ok("lightfx:prompt", !isError && /LIGHT \/ GLOW EFFECT/.test(text) && /jet-black|#000000/i.test(text), text.slice(0, 120));
}

// 4) 아이템 꾸러미 프롬프트
{
  const { text, isError } = await callText("nexus_item_bundle_prompt", { itemCount: 5, light: "soft", ground: "shadow", bg: "black", layout: "normal", intent: "상자는 크게" });
  ok("bundle:prompt", !isError && text.includes("5") && /원본|preserve|IDENTICAL/i.test(text), text.slice(0, 120));
}

// 5) 품질 향상 프롬프트 (fs composeSkills)
{
  const { text, isError } = await callText("nexus_quality_up_prompt", { extra: "노을빛 갓레이", moodPresets: "god rays" });
  ok("qualityup:prompt", !isError && text.length > 500 && text.includes("노을빛 갓레이"), `len=${text.length}`);
}

// 6) 캐릭터 연출 프롬프트 + 자동 배경
{
  const { text, isError } = await callText("nexus_character_fx_prompt", { light: "rim", particle: "magic" });
  ok("charfx:prompt", !isError && text.length > 500 && /99\.9|얼굴/.test(text), `len=${text.length}`);
  ok("charfx:autoBg", /블랙/.test(text), text.slice(-200));
}

// 7) 변형/디자인 대안 프롬프트
{
  const opts = JSON.parse((await callText("nexus_list_options", {})).text);
  const styleId = opts.variation.styles.flat[0].id;
  const v = await callText("nexus_variation_prompt", { style: styleId, refinement: "refined" });
  ok("variation:prompt", !v.isError && /OVERLAY PASS|retheme/i.test(v.text), v.text.slice(0, 120));
  const d = await callText("nexus_design_alternative_prompt", { direction: "simplify", strength: "bold" });
  ok("designalt:prompt", !d.isError && /minimal|VARIATION STRENGTH: bold/i.test(d.text), d.text.slice(0, 120));
}

// 8) 배경 제거 픽셀 툴
{
  const out = path.join(SCRATCH, "keyed.png");
  const r = await callText("nexus_remove_background", { imagePath: testImg, bg: "black", outputPath: out });
  ok("removebg:run", !r.isError && fs.existsSync(out), r.text);
  if (fs.existsSync(out)) {
    const { loadImage, createCanvas: cc } = await import("@napi-rs/canvas");
    const img = await loadImage(out);
    const cv = cc(img.width, img.height); const ctx = cv.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const px = (x, y) => ctx.getImageData(x, y, 1, 1).data;
    ok("removebg:cornerTransparent", px(2, 2)[3] === 0, `a=${px(2, 2)[3]}`);
    ok("removebg:centerOpaque", px(100, 100)[3] === 255, `a=${px(100, 100)[3]}`);
  }
  // 8b) 이펙트 커브 — 검정 위 방사형 글로우 합성 이미지
  {
    const { createCanvas: cc2 } = await import("@napi-rs/canvas");
    const cv = cc2(200, 200); const ctx = cv.getContext("2d");
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 200, 200);
    const g = ctx.createRadialGradient(100, 100, 0, 100, 100, 90);
    g.addColorStop(0, "rgb(255,220,160)"); g.addColorStop(1, "rgb(0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 200, 200);
    const src = path.join(SCRATCH, "glow-src.png"); fs.writeFileSync(src, cv.toBuffer("image/png"));
    const outFx = path.join(SCRATCH, "glow-fx.png");
    const e = await callText("nexus_extract_effect", { imagePath: src, outputPath: outFx });
    ok("effect:run", !e.isError && fs.existsSync(outFx) && /cutoff 6 · gamma 0.85/.test(e.text), e.text.slice(0, 100));
    if (fs.existsSync(outFx)) {
      const { loadImage: li2 } = await import("@napi-rs/canvas");
      const im2 = await li2(outFx); const c2 = cc2(im2.width, im2.height); const x2 = c2.getContext("2d"); x2.drawImage(im2, 0, 0);
      const p2 = (x, y) => x2.getImageData(x, y, 1, 1).data;
      ok("effect:cornerTransparent", p2(2, 2)[3] === 0, `a=${p2(2, 2)[3]}`);
      ok("effect:centerOpaque", p2(100, 100)[3] >= 250, `a=${p2(100, 100)[3]}`);
      ok("effect:midPartial", p2(100, 150)[3] > 20 && p2(100, 150)[3] < 235, `a=${p2(100, 150)[3]}`);
    }
  }
}

// 9) 캐릭터/이펙트 분리 픽셀 툴
{
  const r = await callText("nexus_split_character_effect", { imagePath: testImg, bg: "black", outputDir: SCRATCH });
  const m1 = r.text.match(/캐릭터.*?: (.+\.png)/);
  const m2 = r.text.match(/이펙트.*?: (.+\.png)/);
  ok("split:run", !r.isError && m1 && m2 && fs.existsSync(m1[1]) && fs.existsSync(m2[1]), r.text.slice(0, 200));
  if (m1 && fs.existsSync(m1[1])) {
    const { loadImage, createCanvas: cc } = await import("@napi-rs/canvas");
    const img = await loadImage(m1[1]);
    const cv = cc(img.width, img.height); const ctx = cv.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const c = ctx.getImageData(100, 100, 1, 1).data;
    const e = ctx.getImageData(10, 10, 1, 1).data;
    ok("split:charOpaqueCenter", c[3] > 250, `a=${c[3]}`);
    ok("split:charGlowRemoved", e[3] === 0, `a=${e[3]}`);
  }
}

// 10) 루브릭
{
  const r = await callText("nexus_design_rubric", {});
  ok("rubric:read", !r.isError && r.text.length > 200 && /버전:|criteriaVersionId/.test(r.text), `len=${r.text.length}`);
}

// 10b) 평가 프롬프트 + 채점 — 앱(DesignEvaluator)과 동일 경로
{
  const p = await callText("nexus_design_evaluation_prompt", { type: "banner" });
  const keys = (p.text.match(/\[scoreKeys\] ([^\n]+)/) || [])[1]?.split(",").filter(Boolean) || [];
  ok("eval:prompt", !p.isError && /\[임무 2/.test(p.text) && /\[필수 사전 검사\]/.test(p.text) && keys.length >= 5, `keys=${keys.length}`);
  const version = (p.text.match(/\[criteriaVersion\] banner\/([^\s]+)/) || [])[1];
  const scores = Object.fromEntries(keys.map((k) => [k, { score: 90, reason: "테스트" }]));
  const sc = await callText("nexus_design_evaluation_score", { type: "banner", scores, criteriaVersionId: version });
  ok("eval:score-pass", !sc.isError && /총점 90/.test(sc.text) && /PASS/.test(sc.text), sc.text.slice(0, 120));
  const low = { ...scores, [keys[0]]: { score: 40, reason: "낮음" } };
  const sf = await callText("nexus_design_evaluation_score", { type: "banner", scores: low, hardFailures: ["날짜 오타"] });
  ok("eval:score-fail", !sf.isError && /FAIL/.test(sf.text) && /hardFailures/.test(sf.text), sf.text.slice(0, 120));
  const mm = await callText("nexus_design_evaluation_score", { type: "banner", scores, criteriaVersionId: "no-such-version" });
  ok("eval:version-guard", mm.isError && /버전 불일치/.test(mm.text), mm.text.slice(0, 100));
}

// 11) 렌더 툴 — 키 검출 경로만 (실호출은 비용 문제로 생략)
{
  const r = await callText("nexus_render_image", { prompt: "test", referenceImagePaths: ["없는파일.png"] });
  ok("render:refError", r.isError && /참조 이미지|GEMINI_API_KEY/.test(r.text), r.text.slice(0, 120));
}

console.log(`\n${pass} passed, ${fail} failed`);
await client.close();
process.exit(fail ? 1 : 0);
