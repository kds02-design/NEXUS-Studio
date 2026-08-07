import fs from 'node:fs';import path from 'node:path';
const args=Object.fromEntries(process.argv.slice(2).reduce((a,v,i,s)=>{if(v.startsWith('--'))a.push([v.slice(2),s[i+1]]);return a;},[]));
if(!args.input||!args.output) throw new Error('--input and --output are required');
const brief={version:1,sourceLogic:'Render Matrix',input:args.input,concept:args.concept||'premium game title',settings:{editBudget:'Locked',cameraLens:'Telephoto',projectionDepth:'None',shapeLock:'exact alpha silhouette, counters, spacing, line breaks, and Hangul are immutable'},prompt:'Apply material, surface, and controlled lighting only. Preserve the exact input letterform silhouette and transparent separation. No cyan/teal/magenta fringe, no counter filling, no outline growth, no font substitution, no extra text.'};
fs.mkdirSync(path.dirname(args.output),{recursive:true});fs.writeFileSync(args.output,JSON.stringify(brief,null,2));
