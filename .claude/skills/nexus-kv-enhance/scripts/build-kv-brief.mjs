import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const get = (k, d='') => { const i=args.indexOf(`--${k}`); return i>=0 && args[i+1] ? args[i+1] : d; };
const mode=get('mode');
if(!['background','character-light'].includes(mode)) throw new Error('--mode must be background or character-light');
const concept=get('concept','coherent premium game key visual');
const brief=mode==='background' ? {
  mode, engine:'NexusPreview Background Quality Up', concept,
  prompt:`Edit the input key visual background. Preserve composition, crop, camera, perspective, all object positions, subject identity, title letterforms, and edge fades exactly. Enhance only lighting, atmosphere, particles, color grading, texture clarity, and depth separation. Direction: ${concept}. Use one coherent light source and stable exposure. Add no text, logo, character, silhouette, object, scenery, or outpainting.`,
  avoid:'layout change, crop change, identity change, new text, new object, HDR, clipped highlights, crushed blacks, excessive flare'
} : {
  mode, engine:'RubiconForge Light FX + NexusPreview Character Up', concept,
  prompt:`Use the input character only as a silhouette placement reference. Generate LIGHT ONLY on pure black #000000. Create a sparse thin edge-hugging rim, restrained backlight bloom, a few tiny glints, and optional short wisps. Direction: ${concept}. Keep the interior and most of the canvas black. Never reproduce the face, body, clothes, weapon, text, scene, or any solid object.`,
  avoid:'reproduced character, solid silhouette fill, dense particles, full-frame haze, large lens flare, excessive bloom'
};
const out=get('output'); const json=JSON.stringify(brief,null,2);
if(out){fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(out,json,'utf8');}
process.stdout.write(json+'\n');
