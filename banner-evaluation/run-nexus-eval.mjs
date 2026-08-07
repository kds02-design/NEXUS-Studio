import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('banner-evaluation/season4');
const env = Object.fromEntries(fs.readFileSync('.env','utf8').split(/\r?\n/).filter(x=>x && !x.startsWith('#') && x.includes('=')).map(x=>{const i=x.indexOf('=');return [x.slice(0,i).trim(),x.slice(i+1).trim().replace(/^['"]|['"]$/g,'')]}));
const key=env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY;
if(!key) throw new Error('Gemini API key not configured');
const weights={impression:14,concept:9,layout:8,typography:18,color:8,readability:9,brand:8,flow:8,detail:14,conversion:4};
const files=fs.readdirSync(root).filter(x=>x.endsWith('.png')).sort();
const scoreObj={type:'OBJECT',properties:{score:{type:'NUMBER'},reason:{type:'STRING'}},required:['score','reason']};
const scoreProps=Object.fromEntries(Object.keys(weights).map(k=>[k,scoreObj]));
const toolSchema={type:'OBJECT',properties:{scores:{type:'OBJECT',properties:scoreProps,required:Object.keys(weights)},summary:{type:'STRING'}},required:['scores','summary']};
const schema={type:'OBJECT',properties:{designEvaluator:toolSchema,bannerCodex:toolSchema,hardFailures:{type:'ARRAY',items:{type:'STRING'}},recommendedCorrections:{type:'ARRAY',items:{type:'STRING'}}},required:['designEvaluator','bannerCodex','hardFailures','recommendedCorrections']};
const metricText=Object.entries(weights).map(([k,w])=>`${k}(${w}%)`).join(', ');
const results=[];
for(const file of files){
  const image=fs.readFileSync(path.join(root,file)).toString('base64');
  const imageOnly=!file.startsWith('1180')&&!file.startsWith('1200');
  const prompt=`Nexus Studio의 배너 디자인 평가를 수행한다. 같은 이미지를 두 관점으로 독립 채점하라.\n1) designEvaluator: 일반 게임 프로모션 디자인 완성도 관점.\n2) bannerCodex: 축적된 게임 배너 사례와 실무 전환 관점.\n각 관점은 다음 10개 key를 모두 {score:0~100, reason:구체적 한글 한 문장}으로 출력: ${metricText}.\n엄격한 규칙: 단순 중앙배치/평면적 구성은 overall 85 이하, 텍스트와 배경 대비 부족 시 typography/readability/color 60~70대, 캐릭터와 이펙트 불일치는 detail/layout 감점. 완성도가 탁월할 때만 90 이상.\n파일=${file}, imageOnly=${imageOnly}. 이미지 전용이면 텍스트 부재를 감점하지 말고 크롭·주목성·투명 영역·캐릭터 중심성을 평가하라. Toast는 상단 70px 투명, Ingame은 캐릭터만 투명, 72x40은 얼굴 확대가 요구사항이다. 1200은 우측 상단 공식 게임 로고가 필수다.\nhardFailures에는 명백한 요구사항 위반만 기록하고, recommendedCorrections에는 가장 중요한 수정 최대 3개만 기록하라. JSON만 출력.`;
  const body={contents:[{parts:[{text:prompt},{inlineData:{mimeType:'image/png',data:image}}]}],generationConfig:{temperature:.1,responseMimeType:'application/json',responseSchema:schema}};
  const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${key}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!res.ok) throw new Error(`${file}: ${res.status} ${await res.text()}`);
  const raw=await res.json();
  const parsed=JSON.parse(raw.candidates[0].content.parts[0].text);
  const normalize=(tool)=>{let sum=0,total=0;for(const [k,w] of Object.entries(weights)){const v=Number(tool.scores?.[k]?.score);if(Number.isFinite(v)){sum+=v*w;total+=w}}return {overall:Math.round((sum/total)*10)/10,scores:tool.scores,reasons:Object.fromEntries(Object.entries(tool.scores||{}).map(([k,v])=>[k,v.reason])) ,summary:tool.summary};};
  results.push({frame:path.basename(file,'.png'),designEvaluator:normalize(parsed.designEvaluator),bannerCodex:normalize(parsed.bannerCodex),hardFailures:parsed.hardFailures||[],recommendedCorrections:parsed.recommendedCorrections||[]});
  console.log(`${file} complete`);
}
fs.writeFileSync('banner-evaluation/season4-evaluation.json',JSON.stringify({frames:results},null,2));
console.log('banner-evaluation/season4-evaluation.json');
