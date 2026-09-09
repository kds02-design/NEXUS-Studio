import fs from "node:fs";
import path from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const root=path.resolve(".");
initializeApp({credential:cert(JSON.parse(fs.readFileSync(path.join(root,"service-account.json"),"utf8")))});
const outDir=path.join(root,".tmp","asset-library-sync","audit");fs.mkdirSync(outDir,{recursive:true});
const snap=await getFirestore().collection("artifacts").doc("promo-arc").collection("public").doc("data").collection("assets").where("ownerUid","==","shared-asset-sync").get();
if(process.argv.includes("--reject-text-nav")){
  const rejected=snap.docs.filter((doc)=>/^_?(navi|nav|gnb|네비|내비)$/i.test(String(doc.data().title||"").trim())&&Number(doc.data().width||0)>400);
  for(const doc of rejected)await doc.ref.update({trashed:true,visibility:"private",reviewStatus:"rejected",rejectionReason:"전체 내비게이션·텍스트 그룹 — 개별 재사용 에셋 아님"});
  console.log(`[asset-audit] rejected=${rejected.length}`);
}
if(process.argv.includes("--reject-campaign-sample")){
  const rejected=snap.docs.filter((doc)=>doc.data().campaign==="20251015_선포"&&doc.data().schemaVersion!==3);
  for(const doc of rejected)await doc.ref.update({trashed:true,visibility:"private",reviewStatus:"superseded",rejectionReason:"무문자 베이스 v3로 교체"});
  console.log(`[asset-audit] superseded=${rejected.length}`);
}
if(process.argv.includes("--reject-direct-png-seed")){
  const rejected=snap.docs.filter((doc)=>doc.data().source?.kind==="png"&&doc.data().ownerUid==="shared-asset-sync");
  for(const doc of rejected)await doc.ref.update({trashed:true,visibility:"private",reviewStatus:"rejected",rejectionReason:"제작리소스 PNG 오탐 — 디자인 폴더 UI 전용 규칙으로 교체"});
  console.log(`[asset-audit] rejectedDirectPng=${rejected.length}`);
}
const rows=snap.docs.map((doc)=>({id:doc.id,...doc.data()})).sort((a,b)=>String(b.indexedAt?.toDate?.()||"").localeCompare(String(a.indexedAt?.toDate?.()||""))).slice(0,12);
for(const [index,row] of rows.entries()){
  if(!row.imageUrl)continue;
  const response=await fetch(row.imageUrl);if(!response.ok)throw new Error(`${row.id}: image ${response.status}`);
  const file=path.join(outDir,`${String(index+1).padStart(2,"0")}_${row.id}.png`);fs.writeFileSync(file,Buffer.from(await response.arrayBuffer()));
  console.log(JSON.stringify({id:row.id,title:row.title,category:row.category,subtype:row.subtype,width:row.width,height:row.height,hasEffects:row.hasEffects,layerPath:row.source?.layerPath,file}));
}
console.log(`[asset-audit] records=${rows.length} output=${outDir}`);
