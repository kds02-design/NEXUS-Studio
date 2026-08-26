#!/usr/bin/env node
// 실제 Remove.bg 연결 테스트. 합성 이미지만 전송하며 preview 크기를 사용한다.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/, "")), "..");
const scratch = path.join(ROOT, ".tmp");
fs.mkdirSync(scratch, { recursive: true });
const input = path.join(scratch, "remove-ai-test-input.png");
const output = path.join(scratch, "remove-ai-test-output.png");

const canvas = createCanvas(200, 200);
const ctx = canvas.getContext("2d");
ctx.fillStyle = "#235a9f";
ctx.fillRect(0, 0, 200, 200);
ctx.fillStyle = "#f4c542";
ctx.beginPath();
ctx.arc(100, 100, 58, 0, Math.PI * 2);
ctx.fill();
fs.writeFileSync(input, canvas.toBuffer("image/png"));

const client = new Client({ name: "remove-ai-test", version: "1.0.0" });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["--use-system-ca", path.join(ROOT, "mcp", "nexus-mcp.bundle.mjs")],
});
await client.connect(transport);
try {
  const result = await client.callTool({
    name: "nexus_remove_ai",
    arguments: { imagePath: input, outputPath: output, size: "preview", confirmExternalUpload: true },
  });
  if (result.isError) throw new Error(result.content?.[0]?.text || "nexus_remove_ai failed");
  if (!fs.existsSync(output)) throw new Error("output file was not created");
  const image = await loadImage(output);
  const check = createCanvas(image.width, image.height);
  const checkCtx = check.getContext("2d");
  checkCtx.drawImage(image, 0, 0);
  const pixels = checkCtx.getImageData(0, 0, image.width, image.height).data;
  let transparent = 0;
  let opaque = 0;
  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] === 0) transparent++;
    if (pixels[i] === 255) opaque++;
  }
  if (!transparent || !opaque) throw new Error(`invalid alpha: transparent=${transparent}, opaque=${opaque}`);
  console.log(JSON.stringify({ pass: true, output, width: image.width, height: image.height, transparentPixels: transparent, opaquePixels: opaque }));
} finally {
  await client.close();
}
