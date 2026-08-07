#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const argv=process.argv.slice(2), opt={};
for(let i=0;i<argv.length;i+=2) opt[argv[i].replace(/^--/,'')]=argv[i+1];
if(!opt.input){console.error('Usage: node score-evaluation.mjs --input raw.json [--output report.json]');process.exit(2)}
const weights={impression:14,concept:9,layout:8,typography:18,color:8,readability:9,brand:8,flow:8,detail:14,conversion:4};
const raw=JSON.parse(fs.readFileSync(path.resolve(opt.input),'utf8'));
let weighted=0,total=0;
const metrics=Object.entries(weights).map(([key,weight])=>{
  const entry=raw.scores?.[key];
  const score=Number(entry?.score);
  if(!Number.isFinite(score)||score<0||score>100) throw new Error(`Invalid score: ${key}`);
  weighted+=score*weight; total+=weight;
  return {key,weight,score,reason:String(entry.reason||'')};
});
const overall=Math.round((weighted/total)*10)/10;
const hardFailures=Array.isArray(raw.hardFailures)?raw.hardFailures.filter(Boolean):[];
const lows=metrics.filter(x=>x.score<75).sort((a,b)=>a.score-b.score);
const ranked=[...metrics].sort((a,b)=>a.score-b.score).slice(0,3);
const report={frame:raw.frame||'',overall,pass:overall>=85&&!lows.length&&!hardFailures.length,hardFailures,metrics,priorities:ranked,recommendedCorrections:(raw.recommendedCorrections||[]).slice(0,3)};
const out=JSON.stringify(report,null,2)+'\n';
if(opt.output) fs.writeFileSync(path.resolve(opt.output),out,'utf8'); else process.stdout.write(out);
if(!report.pass) process.exitCode=1;

