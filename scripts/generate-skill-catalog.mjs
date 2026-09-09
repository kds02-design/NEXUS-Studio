import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const localSkillRoot = path.join(codexHome, "skills");
const pluginRoot = path.join(codexHome, "plugins", "cache");
const outputPath = path.resolve("public", "skill-control", "catalog.json");

const requested = [
  ["game-banner-automation", "배너 자동화 총괄"],
  ["photographer-layout", "레이아웃·구도"],
  ["typecore-title", "타이틀 형태"],
  ["gpt-banner-title", "GPT 타이틀"],
  ["nexus-imagen-render", "Nexus Google 렌더"],
  ["nexus-mask-forge", "고형 피사체 투명화"],
  ["nexus-kv-enhance", "키비주얼 향상"],
  ["nexus-effect-extractor", "발광 이펙트 추출"],
  ["rubicon-item-effect-template", "아이템 이펙트"],
  ["nexus-design-evaluator", "디자인 평가"],
];

const textExtensions = new Set([".md", ".json", ".yaml", ".yml", ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".py", ".ps1", ".txt"]);
const ignoredDirectories = new Set([".git", "node_modules", "dist", "__pycache__"]);

function walk(root, depth = 0, maxDepth = 20) {
  if (!fs.existsSync(root) || depth > maxDepth) return [];
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...walk(full, depth + 1, maxDepth));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

function findSkill(root, id, depth = 0, maxDepth = 9) {
  if (!fs.existsSync(root) || depth > maxDepth) return null;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || ignoredDirectories.has(entry.name)) continue;
    const full = path.join(root, entry.name);
    if (entry.name === id && fs.existsSync(path.join(full, "SKILL.md"))) return full;
    const found = findSkill(full, id, depth + 1, maxDepth);
    if (found) return found;
  }
  return null;
}

function kindOf(relativePath) {
  const normalized = relativePath.replaceAll("\\", "/");
  if (normalized === "SKILL.md") return "지침";
  if (normalized.startsWith("references/")) return "레퍼런스";
  if (normalized.startsWith("scripts/")) return "스크립트";
  if (normalized.startsWith("agents/")) return "에이전트";
  if (normalized.startsWith("assets/")) return "에셋";
  if (normalized.startsWith("tests/")) return "테스트";
  return "기타";
}

function readFrontmatter(text) {
  const head = text.match(/^---\s*\n([\s\S]*?)\n---/m)?.[1] || "";
  const value = (key) => head.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]?.trim() || "";
  return { name: value("name"), description: value("description") };
}

function fileRecord(root, full) {
  const stat = fs.statSync(full);
  const relativePath = path.relative(root, full).replaceAll("\\", "/");
  const ext = path.extname(full).toLowerCase();
  return { path: relativePath, kind: kindOf(relativePath), size: stat.size, modifiedAt: stat.mtime.toISOString(), editable: textExtensions.has(ext), sourceContentIncluded: false };
}

function buildSkill(id, koreanName, root) {
  if (!root) return { id, koreanName, missing: true, rootPath: null, files: [], counts: {} };
  const files = walk(root).map((file) => fileRecord(root, file)).sort((a, b) => a.path.localeCompare(b.path, "ko"));
  let frontmatter = { name: id, description: "" };
  try { frontmatter = readFrontmatter(fs.readFileSync(path.join(root, "SKILL.md"), "utf8")); } catch {}
  const counts = files.reduce((result, file) => ({ ...result, [file.kind]: (result[file.kind] || 0) + 1 }), {});
  const logicalRoot = root.startsWith(localSkillRoot) ? `$CODEX_HOME/skills/${id}` : `$CODEX_PLUGIN_CACHE/.../${id}`;
  return { id, koreanName, name: frontmatter.name || id, description: frontmatter.description || "", missing: false, rootPath: logicalRoot, counts, files };
}

const skills = requested.map(([id, koreanName]) => buildSkill(id, koreanName, fs.existsSync(path.join(localSkillRoot, id)) ? path.join(localSkillRoot, id) : findSkill(pluginRoot, id)));
const figmaRoot = findSkill(pluginRoot, "figma-use");
skills.push(buildSkill("figma-use", "Figma 조립 브리지", figmaRoot));

const bannerSkill = skills.find((skill) => skill.id === "game-banner-automation");
if (bannerSkill && !bannerSkill.missing) {
  const profileFiles = bannerSkill.files.filter((file) => file.path === "references/game-profile-schema.md" || file.path.startsWith("references/game-profiles/") || file.path.startsWith("references/games/"));
  skills.push({ id: "game-profile", koreanName: "게임별 브랜드 프로필", name: "game-profile", description: "배너 자동화 총괄 스킬에 내장된 게임별 프레임·로고·배지·가이드 정책입니다.", missing: false, virtual: true, rootPath: bannerSkill.rootPath, counts: profileFiles.reduce((result, file) => ({ ...result, [file.kind]: (result[file.kind] || 0) + 1 }), {}), files: profileFiles });
}

const payload = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: "installed-codex-skills",
  skills,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Skill catalog: ${skills.length} skills -> ${outputPath}`);
