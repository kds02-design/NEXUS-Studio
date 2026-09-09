// 2025년 이후 프로모션·브랜드웹 제작 폴더의 재사용 UI 에셋 색인기.
// 기본은 읽기 전용 dry-run이며 --apply 일 때만 PNG 업로드와 Firestore 등록을 수행한다.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { readPsd, initializeCanvas } from "ag-psd";

initializeCanvas(createCanvas);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "banner-codex-sync.config.json"), "utf8"));
const args = process.argv.slice(2);
const valueOf = (flag, fallback = "") => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : fallback; };
const APPLY = args.includes("--apply");
const START_YEAR = Math.max(2025, Number(valueOf("--year", 2025)) || 2025);
const END_YEAR = Math.max(START_YEAR, Number(valueOf("--to-year", new Date().getFullYear())) || new Date().getFullYear());
const GAME = valueOf("--game", "");
const CAMPAIGN = valueOf("--campaign", "").toLowerCase();
const LIMIT = Math.max(0, Number(valueOf("--limit", 0)) || 0);
const PSD_OFFSET = Math.max(0, Number(valueOf("--psd-offset", 0)) || 0);
const PSD_LIMIT = Math.max(0, Number(valueOf("--psd-limit", 0)) || 0);
const PSD_MAX_MB = Math.max(64, Number(valueOf("--psd-max-mb", 700)) || 700);
const MAX_DIM = Math.max(256, Number(valueOf("--max-dim", 2400)) || 2400);
const CACHE_DIR = process.env.NEXUS_ASSET_CACHE_DIR || path.join(os.homedir(), "Documents", "NexusAssetLibraryCache");
const REPORT_DIR = path.join(ROOT, ".tmp", "asset-library-sync");

const UI_RE = /(^|[\s_\-[\]()])(btn|button|cta|tab|arrow|arr|next|prev|scroll|down|up|frame|border|line|divider|bullet|badge|chip|icon|navi|nav|gnb|버튼|화살표|스크롤|프레임|테두리|라인|구분선|블릿|배지|아이콘|네비|내비)(?=$|[\s_\-[\]()])/i;
const DIRECT_UI_RE = /(^|[\s_\-[\]()])(btn|button|cta|tab|arrow|arr|next|prev|scroll|frame|border|divider|bullet|navi|nav|gnb|버튼|화살표|스크롤|프레임|테두리|구분선|블릿|네비|내비)(?=$|[\s_\-[\]()])/i;
const FX_RE = /(shadow|drop|glow|light|flare|shine|spark|particle|aura|fx|그림자|빛|광|발광|글로우|파티클|오라|효과)/i;
const IGNORE_RE = /(copy|복사본|backup|bak|old|guide|가이드|thumb|thumbnail|시안|컨펌)/i;
const sanitize = (s) => String(s || "asset").replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_").slice(0, 90);
const norm = (s) => String(s || "").replace(/[\\/]+/g, "\\").toLowerCase();
const hash = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 20);

function loadEnv() {
  const out = {};
  for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

function classify(name) {
  const s = String(name || "").toLowerCase();
  if (/scroll|스크롤/.test(s)) return { category:"icon", subtype:"scroll-down", terms:["스크롤다운","scroll indicator","navigation"] };
  if (/arrow|next|prev|arr|화살표/.test(s)) return { category:"icon", subtype:"arrow", terms:["화살표","arrow","navigation"] };
  if (/btn|button|cta|버튼/.test(s)) return { category:"button", subtype:/tab|탭/.test(s)?"tab":"cta", terms:["버튼","CTA","control"] };
  if (/frame|border|테두리|프레임/.test(s)) return { category:"frame", subtype:"frame", terms:["프레임","border","container"] };
  if (/divider|line|구분선|라인/.test(s)) return { category:"ornament", subtype:"divider", terms:["구분선","divider","line"] };
  if (/bullet|블릿/.test(s)) return { category:"bullet", subtype:"bullet", terms:["블릿","bullet","list marker"] };
  if (/badge|chip|배지/.test(s)) return { category:"icon", subtype:"badge", terms:["배지","badge","chip"] };
  if (/icon|아이콘|navi|nav|gnb|네비|내비/.test(s)) return { category:"icon", subtype:"navigation", terms:["아이콘","navigation","UI"] };
  return null;
}

function campaignInfo(filePath, target, section, year) {
  const template = section === "brandweb" ? target.share : target.promoShare;
  const share = template?.replace("{year}", String(year));
  const rel = share ? path.relative(share, filePath) : filePath;
  const campaign = rel.split(/[\\/]/)[0] || "";
  return { campaign, campaignDate:campaign.match(/20\d{6}/)?.[0] || "", sourceRelativePath:rel };
}

function walkFiles(root, out) {
  if (!root || !fs.existsSync(root)) return;
  const stack=[root];
  while (stack.length) {
    const dir=stack.pop(); let entries=[];
    try { entries=fs.readdirSync(dir,{withFileTypes:true}); } catch { continue; }
    for (const entry of entries) {
      if (IGNORE_RE.test(entry.name) && entry.isDirectory()) continue;
      const full=path.join(dir,entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && /\.(png|psd)$/i.test(entry.name)) out.push(full);
    }
  }
}

function flattenLayers(nodes, parents=[], out=[]) {
  for (const node of nodes || []) {
    const layerPath=[...parents,node.name || "layer"];
    out.push({node,layerPath,name:node.name || "layer",isGroup:!!node.children?.length});
    if (node.children?.length) flattenLayers(node.children,layerPath,out);
  }
  return out;
}

function inspectPsd(file) {
  const sizeMb=fs.statSync(file).size/1024/1024;
  if (sizeMb>PSD_MAX_MB) return {skipped:"large-psd",sizeMb:Math.round(sizeMb),candidates:[]};
  const psd=readPsd(fs.readFileSync(file),{skipLayerImageData:true,skipCompositeImageData:true,skipThumbnail:true});
  const layers=flattenLayers(psd.children);
  const candidates=layers.filter((x)=>UI_RE.test(x.name)&&!IGNORE_RE.test(x.name)&&!(x.isGroup&&/^_?(navi|nav|gnb|네비|내비)$/i.test(x.name.trim()))).map((x)=>({
    layerPath:x.layerPath,name:x.name,isGroup:x.isGroup,
    fxLayers:flattenLayers(x.node.children||[]).filter((c)=>FX_RE.test(c.name)).map((c)=>c.layerPath.join(" / ")),
    effects:Object.keys(x.node.effects||{}).filter((key)=>x.node.effects?.[key]),
  }));
  return {width:psd.width,height:psd.height,layerCount:layers.length,sizeMb:Math.round(sizeMb),candidates};
}

function collectLeaves(node,out=[]) {
  for (const child of node.children||[]) child.children?.length?collectLeaves(child,out):child.canvas&&!child.hidden&&!child.text&&out.push(child);
  return out;
}

function renderNode(node) {
  const leaves=node.children?.length?collectLeaves(node):(node.canvas?[node]:[]);
  if (!leaves.length) return null;
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for (const layer of leaves) { const w=layer.canvas.width,h=layer.canvas.height,x=layer.left||0,y=layer.top||0; minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x+w);maxY=Math.max(maxY,y+h); }
  const width=maxX-minX,height=maxY-minY;
  if (width<4||height<4) return null;
  const scale=Math.min(1,MAX_DIM/Math.max(width,height));
  const canvas=createCanvas(Math.max(1,Math.round(width*scale)),Math.max(1,Math.round(height*scale)));
  const ctx=canvas.getContext("2d");
  for (const layer of [...leaves].reverse()) { ctx.globalAlpha=layer.opacity==null?1:layer.opacity;ctx.drawImage(layer.canvas,((layer.left||0)-minX)*scale,((layer.top||0)-minY)*scale,layer.canvas.width*scale,layer.canvas.height*scale); }
  return {buffer:canvas.toBuffer("image/png"),width:canvas.width,height:canvas.height,sourceRect:{x:minX,y:minY,width,height}};
}

let decodedPsdPath="";
let decodedPsd=null;
async function extractPsdCandidate(file,candidate) {
  if(decodedPsdPath!==file){decodedPsd=null;decodedPsdPath=file;decodedPsd=readPsd(fs.readFileSync(file),{useImageData:false,skipLayerImageData:false,skipCompositeImageData:true,skipThumbnail:true,totalMemoryLimit:undefined});}
  const psd=decodedPsd;
  const target=flattenLayers(psd.children).find((x)=>x.layerPath.join("\u0000")===candidate.layerPath.join("\u0000"));
  return target?renderNode(target.node):null;
}

async function pngInfo(file) { const image=await loadImage(file);return {buffer:fs.readFileSync(file),width:image.width,height:image.height,sourceRect:null}; }

async function uploadCloudinary(buffer,env) {
  const form=new FormData();form.append("file",new Blob([buffer],{type:"image/png"}),"asset.png");form.append("upload_preset",env.VITE_CLOUDINARY_UPLOAD_PRESET);form.append("folder","nexus/asset-library/shared-2025");
  const res=await fetch(`https://api.cloudinary.com/v1_1/${env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,{method:"POST",body:form});
  if(!res.ok)throw new Error(`Cloudinary ${res.status}: ${(await res.text()).slice(0,160)}`);return (await res.json()).secure_url;
}

function semanticText(record) {
  return [record.title,record.category,record.subtype,...record.tags,record.game,record.sectionKo,record.campaign,record.source?.fileName,record.source?.layerPath?.join(" "),record.hasEffects?"그림자 빛효과 글로우 효과 포함":"플랫 에셋",record.alpha?"투명 PNG 누끼":"배경 포함",record.width>record.height*2?"가로형 와이드":record.height>record.width*2?"세로형":"균형 비율"].filter(Boolean).join(" · ").toLowerCase();
}

async function main() {
  fs.mkdirSync(REPORT_DIR,{recursive:true});
  const inventory=[];
  for(let year=START_YEAR;year<=END_YEAR;year++)for(const target of CONFIG.targets){if(GAME&&target.game!==GAME)continue;for(const section of ["promotion","brandweb"]){const template=section==="promotion"?target.promoShare:target.share;if(!template)continue;const share=template.replace("{year}",String(year));const files=[];walkFiles(share,files);for(const file of files)inventory.push({file,year,game:target.game,section,...campaignInfo(file,target,section,year)});}}
  const scopedInventory=CAMPAIGN?inventory.filter((x)=>x.campaign.toLowerCase().includes(CAMPAIGN)):inventory;
  const directPng=scopedInventory.filter((x)=>/\.png$/i.test(x.file)&&DIRECT_UI_RE.test(path.basename(x.file))&&!IGNORE_RE.test(path.basename(x.file))&&/(^|[\\/])(디자인|design|pc|mobile|mo)([\\/]|$)/i.test(x.file));
  // UI 컴포넌트는 완성 디자인 PSD에서 수집한다. 제작리소스 원화·아이템 PSD까지
  // 모두 해석하면 수 시간과 수십 GB 메모리가 들고 재사용 UI 오탐도 커진다.
  const allPsdFiles=scopedInventory.filter((x)=>/\.psd$/i.test(x.file)&&/(^|[\\/])(디자인|design|pc|mobile|mo)([\\/]|$)/i.test(x.file));
  const psdFiles=allPsdFiles.slice(PSD_OFFSET,PSD_LIMIT?PSD_OFFSET+PSD_LIMIT:undefined);const candidates=[];
  for(const item of directPng)candidates.push({...item,kind:"png",name:path.basename(item.file),classification:classify(path.basename(item.file)),layer:null});
  for(const item of psdFiles){let info;try{info=inspectPsd(item.file);}catch(error){candidates.push({...item,kind:"error",error:error.message});continue;}for(const layer of info.candidates)candidates.push({...item,kind:"psd-layer",name:layer.name,classification:classify(layer.name),layer,psd:info});}
  const usable=candidates.filter((x)=>x.classification&&x.kind!=="error").slice(0,LIMIT||undefined);
  const report={generatedAt:new Date().toISOString(),mode:APPLY?"apply":"dry",years:[START_YEAR,END_YEAR],game:GAME||"all",campaign:CAMPAIGN||"all",scannedFiles:scopedInventory.length,psdFiles:psdFiles.length,directPng:directPng.length,candidates:usable.length,cacheDir:CACHE_DIR,items:usable.map((x)=>({...x,fileSize:fs.statSync(x.file).size}))};
  const reportPath=path.join(REPORT_DIR,`inventory-${Date.now()}.json`);fs.writeFileSync(reportPath,JSON.stringify(report,null,2));console.log(`[asset-sync] scan=${inventory.length} psd=${psdFiles.length} png=${directPng.length} candidates=${usable.length}`);console.log(`[asset-sync] report=${reportPath}`);if(!APPLY)return;
  const env=loadEnv();if(!env.VITE_CLOUDINARY_CLOUD_NAME||!env.VITE_CLOUDINARY_UPLOAD_PRESET)throw new Error("Cloudinary 환경 변수가 없습니다.");if(!getApps().length)initializeApp({credential:cert(JSON.parse(fs.readFileSync(path.join(ROOT,"service-account.json"),"utf8")))});
  const col=getFirestore().collection("artifacts").doc("promo-arc").collection("public").doc("data").collection("assets");fs.mkdirSync(CACHE_DIR,{recursive:true});let saved=0,skipped=0,failed=0;
  for(const item of usable){const layerPath=item.layer?.layerPath||[];const sourceKey=hash(`v3|${norm(item.file)}|${layerPath.join("/")}`);const existing=await col.where("sourceKey","==",sourceKey).limit(1).get();if(!existing.empty){skipped++;continue;}try{const rendered=item.kind==="png"?await pngInfo(item.file):await extractPsdCandidate(item.file,item.layer);if(!rendered){skipped++;continue;}const hasEffects=!!(item.layer?.fxLayers?.length||item.layer?.effects?.length||FX_RE.test(item.name));const cachedPath=path.join(CACHE_DIR,`${sourceKey}_${sanitize(item.name)}.png`);if(item.kind==="psd-layer"&&(item.psd?.sizeMb>=PSD_MAX_MB*.6||hasEffects))fs.writeFileSync(cachedPath,rendered.buffer);const imageUrl=await uploadCloudinary(rendered.buffer,env);const tags=[...new Set([...item.classification.terms,item.game,item.section==="brandweb"?"브랜드웹":"프로모션",String(item.year),hasEffects?"효과 포함":"플랫","무문자 베이스"])];const record={imageUrl,width:rendered.width,height:rendered.height,category:item.classification.category,subtype:item.classification.subtype,title:item.name.replace(/\.(png|psd)$/i,""),tags,liked:0,isTemp:false,ownerUid:"shared-asset-sync",visibility:"public",sourceKey,game:item.game,year:item.year,section:item.section,sectionKo:item.section==="brandweb"?"브랜드웹":"프로모션",campaign:item.campaign,campaignDate:item.campaignDate,alpha:true,textExcluded:item.kind==="psd-layer",hasEffects,effectLayers:item.layer?.fxLayers||[],psdEffects:item.layer?.effects||[],bundleRole:hasEffects?"composite-with-fx":"base",source:{app:"asset-library-sync",kind:item.kind,fileName:path.basename(item.file),sourcePath:item.file,sourceRelativePath:item.sourceRelativePath,psdPath:item.kind==="psd-layer"?item.file:null,layerPath,sourceRect:rendered.sourceRect,localCachePath:fs.existsSync(cachedPath)?cachedPath:null},createdAt:FieldValue.serverTimestamp(),indexedAt:FieldValue.serverTimestamp(),schemaVersion:3};record.aiSearchText=semanticText(record);await col.add(record);saved++;console.log(`[asset-sync] ${saved} ${item.game}/${item.section} ${item.name}`);}catch(error){failed++;console.warn(`[asset-sync] failed ${item.file} :: ${error.message}`);}}
  console.log(`[asset-sync] done saved=${saved} skipped=${skipped} failed=${failed}`);
}
main().catch((error)=>{console.error(error);process.exitCode=1;});
