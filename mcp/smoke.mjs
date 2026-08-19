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
for (const n of ["nexus_guide", "nexus_list_options", "nexus_render_image", "nexus_lightfx_prompt", "nexus_variation_prompt", "nexus_design_alternative_prompt", "nexus_item_bundle_prompt", "nexus_quality_up_prompt", "nexus_character_fx_prompt", "nexus_typecore_sovereign_prompt", "nexus_typecore_breeze_prompt", "nexus_remove_background", "nexus_split_character_effect", "nexus_design_rubric"]) {
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
  ok("rubric:read", !r.isError && r.text.length > 200, `len=${r.text.length}`);
}

// 11) 렌더 툴 — 키 검출 경로만 (실호출은 비용 문제로 생략)
{
  const r = await callText("nexus_render_image", { prompt: "test", referenceImagePaths: ["없는파일.png"] });
  ok("render:refError", r.isError && /참조 이미지|GEMINI_API_KEY/.test(r.text), r.text.slice(0, 120));
}

console.log(`\n${pass} passed, ${fail} failed`);
await client.close();
process.exit(fail ? 1 : 0);
