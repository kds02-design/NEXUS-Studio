import { GEMINI_API_KEY, geminiUrl } from '../../lib/gemini';

const SCHEMA = {
  type:'OBJECT',
  properties:{
    title:{ type:'STRING' },
    campaignType:{ type:'STRING', enum:['box','package','event','pass','costume','other'] },
    serviceBadge:{ type:'STRING' },
    mainMessage:{ type:'STRING' },
    supportingMessage:{ type:'STRING' },
    subtitleVerbatim:{ type:'STRING' },
    period:{ type:'STRING' },
    visualPriority:{ type:'STRING', enum:['character','three_products','copy_first','radial_rewards','character_reward_table'] },
    mainObject:{ type:'STRING' },
    rewards:{ type:'ARRAY', items:{ type:'STRING' } },
    requiredAssets:{ type:'ARRAY', items:{ type:'STRING' } },
    compositionReason:{ type:'STRING' },
    cautions:{ type:'ARRAY', items:{ type:'STRING' } },
    layout:{
      type:'OBJECT',
      properties:{
        title:{ type:'OBJECT', properties:{ x:{type:'NUMBER'}, y:{type:'NUMBER'}, w:{type:'NUMBER'}, align:{type:'STRING',enum:['left','center','right']}, size:{type:'NUMBER'} }, required:['x','y','w','align','size'] },
        subtitle:{ type:'OBJECT', properties:{ x:{type:'NUMBER'}, y:{type:'NUMBER'}, w:{type:'NUMBER'}, align:{type:'STRING',enum:['left','center','right']}, size:{type:'NUMBER'} }, required:['x','y','w','align','size'] },
        period:{ type:'OBJECT', properties:{ x:{type:'NUMBER'}, y:{type:'NUMBER'}, w:{type:'NUMBER'}, align:{type:'STRING',enum:['left','center','right']}, size:{type:'NUMBER'} }, required:['x','y','w','align','size'] },
      },
      required:['title','subtitle','period'],
    },
    confidence:{ type:'NUMBER' },
  },
  required:['title','campaignType','serviceBadge','mainMessage','supportingMessage','subtitleVerbatim','period','visualPriority','mainObject','rewards','requiredAssets','compositionReason','cautions','layout','confidence'],
};

const PROMPT = `당신은 게임 프로모션 배너 제작 요청서를 판독하는 시니어 아트디렉터다.
첨부된 요청서 이미지/PDF를 시각적으로 읽고, 함께 제공된 추출 텍스트가 있으면 교차 검증하라.
문서의 단순 OCR 요약이 아니라 실제 배너 제작에 필요한 정보 구조를 판단한다.
- title: 배너에 가장 크게 표시할 정확한 행사/상품 제목
- mainMessage/supportingMessage: 분석용 핵심 혜택과 보조 설명
- subtitleVerbatim: 요청서에서 배너 서브타이틀/설명으로 제시된 문장을 글자·띄어쓰기·문장부호·줄바꿈까지 원문 그대로 전사. 절대 요약, 축약, 교정, 재작성하지 않는다. 여러 줄이면 \n을 유지한다.
- period: 노출할 일정 원문. 없으면 빈 문자열
- serviceBadge: NEO/특화/라이브 등 우측 배지. 없으면 빈 문자열
- visualPriority: 캐릭터 중심, 3종 상품 비교, 카피 우선, 중앙 상자 방사형, 좌측 캐릭터+확정/추가 특전 2열 보상표 중 가장 적합한 구도
- mainObject: 대표 상자·캐릭터·상품
- rewards: 배너에 노출해야 하는 개별 보상 목록. 문서에 여러 개면 모두 분리
- requiredAssets: 제작자가 준비해야 할 배경·캐릭터·상자·아이콘 등
- cautions: 문구 길이, 필수 표기, 수량, 선택/교환 관계 등 제작 시 실수하기 쉬운 사항
- layout: 요청서의 배너 시안·스케치·레이아웃 지시를 시각적으로 판독해 title/subtitle/period의 위치를 캔버스 대비 0~1 좌표(x,y,w)로 기록한다. size는 1180×750 기준 권장 px. 문서에 레이아웃이 없으면 visualPriority에 적합한 안정적인 기본 배치를 제안한다.
문서에 없는 내용을 추측해서 상품명이나 날짜를 만들지 말고 JSON만 출력하라.`;

const fileToPart = async (file) => {
  if (!file || (!file.type?.startsWith('image/') && file.type !== 'application/pdf')) return null;
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=reject; reader.readAsDataURL(file);
  });
  return { inlineData:{ mimeType:file.type, data:dataUrl.split(',')[1] } };
};

export async function analyzeBannerRequest(file, extractedText = '') {
  const visualPart = await fileToPart(file);
  const parts = [{ text:`${PROMPT}\n\n추출 텍스트:\n${extractedText || '(없음 — 첨부 문서를 직접 판독)'}` }];
  if (visualPart) parts.push(visualPart);
  const response = await fetch(geminiUrl('gemini-2.5-flash', GEMINI_API_KEY), {
    method:'POST', headers:{ 'Content-Type':'application/json' },
    body:JSON.stringify({ contents:[{ role:'user', parts }], generationConfig:{ temperature:0.15, responseMimeType:'application/json', responseSchema:SCHEMA } }),
  });
  if (!response.ok) throw new Error(`요청서 AI 분석 실패 (${response.status})`);
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
  if (!text) throw new Error('요청서 분석 결과가 비어 있습니다.');
  return JSON.parse(text.replace(/^```json\s*|\s*```$/g, ''));
}
