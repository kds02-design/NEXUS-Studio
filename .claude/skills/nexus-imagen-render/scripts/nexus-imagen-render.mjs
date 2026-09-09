#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const argv=process.argv.slice(2),opt={};
for(let i=0;i<argv.length;i+=2) opt[argv[i].replace(/^--/,'')]=argv[i+1];
const knownNexusEnv='C:/work/00_claude/.env';
const envFile=opt.env||(
  fs.existsSync('.env') ? '.env' :
  fs.existsSync(knownNexusEnv) ? knownNexusEnv :
  '.env'
);
let fileEnv={};
if(fs.existsSync(envFile)) fileEnv=Object.fromEntries(fs.readFileSync(envFile,'utf8').split(/\r?\n/).filter(x=>x&&!x.trim().startsWith('#')&&x.includes('=')).map(x=>{const i=x.indexOf('=');return [x.slice(0,i).trim(),x.slice(i+1).trim().replace(/^['"]|['"]$/g,'')]}));
const apiBase=(process.env.NEXUS_API_BASE_URL||fileEnv.NEXUS_API_BASE_URL||'').replace(/\/$/,'');
const proxyUrl=process.env.NEXUS_IMAGE_PROXY_URL||fileEnv.NEXUS_IMAGE_PROXY_URL||(apiBase?`${apiBase}/api/codex-imagen`:null);
const proxyToken=process.env.NEXUS_CODEX_RENDER_TOKEN||fileEnv.NEXUS_CODEX_RENDER_TOKEN;
const key=process.env.GEMINI_API_KEY||fileEnv.GEMINI_API_KEY||fileEnv.GEMINI_API_KEY_BRANDWEB;
const hasProxy=Boolean(proxyUrl&&proxyToken&&!/example|change|placeholder/i.test(proxyUrl+proxyToken));
const hasDirectKey=Boolean(key&&key.startsWith('AIza')&&!/proxy|change|placeholder/i.test(key));
if(!hasProxy&&!hasDirectKey) throw new Error('Configure NEXUS_API_BASE_URL + NEXUS_CODEX_RENDER_TOKEN (or NEXUS_IMAGE_PROXY_URL + token). Direct GEMINI_API_KEY is development-only.');
if(opt.check==='true') { console.log(hasProxy?'Nexus protected proxy configured':'Direct GEMINI_API_KEY configured'); process.exit(0); }
for(const k of ['input','prompt','output']) if(!opt[k]) throw new Error(`Missing --${k}`);
const input=path.resolve(opt.input), promptPath=path.resolve(opt.prompt), output=path.resolve(opt.output);
const ext=path.extname(input).toLowerCase();
const mime=ext==='.png'?'image/png':ext==='.webp'?'image/webp':'image/jpeg';
const model=opt.model||'gemini-3-pro-image-preview';
const config={responseModalities:['IMAGE','TEXT'],imageConfig:{}};
if(opt.aspect) config.imageConfig.aspectRatio=opt.aspect;
if(/3-pro/.test(model)) config.imageConfig.imageSize=opt.size||'4K';
if(!Object.keys(config.imageConfig).length) delete config.imageConfig;
const imageData=fs.readFileSync(input).toString('base64');
const prompt=fs.readFileSync(promptPath,'utf8');
const directBody={contents:[{parts:[{inlineData:{mimeType:mime,data:imageData}},{text:prompt}]}],generationConfig:config};
const proxyBody={model,prompt,image:{mimeType:mime,data:imageData},imageConfig:config.imageConfig||{}};
const url=hasProxy?proxyUrl:`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
const headers={'Content-Type':'application/json'};
if(hasProxy) headers.Authorization=`Bearer ${proxyToken}`;
const res=await fetch(url,{method:'POST',headers,body:JSON.stringify(hasProxy?proxyBody:directBody)});
const json=await res.json().catch(()=>({}));
if(!res.ok) throw new Error(json?.error?.message||`Google image API ${res.status}`);
const part=json.candidates?.[0]?.content?.parts?.find(p=>p.inlineData?.mimeType?.startsWith('image/'));
if(!part) throw new Error('Google image API returned no image');
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,Buffer.from(part.inlineData.data,'base64'));
console.log(JSON.stringify({output,model,mimeType:part.inlineData.mimeType},null,2));
