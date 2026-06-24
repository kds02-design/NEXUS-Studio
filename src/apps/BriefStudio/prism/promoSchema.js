// BriefStudio · Prism — prism/promoSchema.js
// "오늘의 상품 스페셜" 프로모션 전용 추출 스키마 + 플러그인 JSON 변환기.
// 오상스 슬롯필러 플러그인의 data.{월}.json 구조(boxes/slotIcons/milestones/cardPresets/
// popup/popupTexts/replacements)를 Gemini responseSchema로 고정하고, 화면 렌더용 구조화 형태로
// 받은 뒤 toPluginJson() 으로 플러그인이 바로 먹는 형태로 변환한다.
//
// 동적 키 오브젝트(popupTexts·cardPresets)는 Gemini responseSchema가 약하므로
// 배열({key,value} / {card,items})로 받아 코드에서 오브젝트로 합친다.

const strArr = { type: 'array', items: { type: 'string' } };

// 1단계 전사용 스키마 — 이미지에서 "반영 희망 내용" 텍스트 + 빨간색 대표 아이콘을 별도 추출.
export const TRANSCRIBE_SCHEMA = {
  type: 'object',
  properties: {
    transcript: { type: 'string' },
    // 상세구성/삽입아이콘 표에서 빨간색으로 인쇄된 항목 = 그 상자의 대표 아이콘.
    redItems: {
      type: 'array',
      items: { type: 'object', properties: { box: { type: 'string' }, item: { type: 'string' } }, required: ['box', 'item'] },
    },
  },
  required: ['transcript'],
};

export const PROMO_SCHEMA = {
  type: 'object',
  properties: {
    meta: {
      type: 'object',
      properties: {
        game: { type: 'string' },          // 게임명 (예: 블소 오상스)
        month: { type: 'string' },         // 대상 월 (예: 6월)
        title: { type: 'string' },         // 배너/페이지 타이틀 (예: 6월 오늘의 상품 스페셜)
        salePeriod: { type: 'string' },    // 판매 기간 원문
        rewardPeriod: { type: 'string' },  // 보상 수령 기간 원문
      },
    },
    // 상품 4칸 — 윗줄(top) / 아랫줄(name). 대표 아이콘 이름은 slotIcons 와 순서 일치.
    boxes: {
      type: 'array',
      items: {
        type: 'object',
        properties: { top: { type: 'string' }, name: { type: 'string' } },
        required: ['name'],
      },
    },
    slotIcons: strArr, // 상품 1~4번 대표 아이콘 이름 (boxes 순서와 1:1)
    // 카드 롤오버 1~4 — 각 카드의 구성품 목록
    rollovers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          card: { type: 'string' }, // "1" | "2" | "3" | "4"
          items: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, count: { type: 'string' } } } },
        },
        required: ['card'],
      },
    },
    // 보너스 5단계 마일스톤. magnify=돋보기(상세 팝업 연결) 표시.
    milestones: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          threshold: { type: 'string' },   // 누적 신석 기준 (예 "5,000","10,000","40,000")
          magnify: { type: 'boolean' },     // 상세 팝업(돋보기) 연결 — 일부만 true
        },
        required: ['name'],
      },
    },
    // 전체상품 팝업 — 일자별 블록(날짜 + 상품|가격 행). 가격 0/무료는 "0".
    popupDays: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string' }, // 예: "6월 25일 (목)"
          rows: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, price: { type: 'string' } } } },
        },
        required: ['date'],
      },
    },
    // 개별 팝업 텍스트 — 타이틀/아이템명. key=ptxt 슬롯키(무기제목·천체조각제목·천체조각1명 등).
    popupTexts: {
      type: 'array',
      items: { type: 'object', properties: { key: { type: 'string' }, value: { type: 'string' } }, required: ['key', 'value'] },
    },
    // 공지/타이틀/기간 치환 — 슬롯 없는 고정문구 (이전→새).
    replacements: {
      type: 'array',
      items: { type: 'object', properties: { before: { type: 'string' }, after: { type: 'string' } }, required: ['before', 'after'] },
    },
    uncertain: strArr, // 불확실·확인 필요 항목
    changes: strArr,   // 2차 병합 시: 1차 대비 변경/추가/삭제 내역 (사람이 읽는 한 줄씩)
  },
  required: ['meta', 'boxes', 'milestones', 'popupDays'],
};

// 박스 제목 "분류 / 상품명" 분리 — 플러그인 박스 제목이 윗줄(분류)+아랫줄(상품명) 두 줄이라
// JSON 도 슬래시로 구분돼야 두 줄이 정확히 채워진다. top 이 비어 한 덩어리로 온 경우
// 알려진 분류 접두어로 자동 분리. (접두어 없는 상품은 top 없이 name 한 줄 그대로 — 의도된 동작)
const BOX_TOP_RE = /^(오늘의\s*선물\s*상자|화려한\s*결정)\s+(.+)$/;
function splitBoxName(top, name) {
  let t = String(top || '').trim();
  let nm = String(name || '').trim();
  // top 이 비어 한 덩어리로 온 경우 알려진 분류 접두어로 분리.
  if (!t && nm) {
    const m = nm.match(BOX_TOP_RE);
    if (m) { t = m[1].replace(/\s+/g, ' ').trim(); nm = m[2].trim(); }
  }
  // top·name 접두어 중복 제거(공백 무시) — name 이 top 으로 시작하면 떼어내,
  // "오늘의 선물상자 / 오늘의 선물상자 진무" 처럼 JSON·플러그인에 겹쳐 들어가는 것을 막는다.
  if (t && nm) {
    const st = t.replace(/\s+/g, '');
    let acc = '', cut = 0;
    for (let k = 0; k < nm.length && acc.length < st.length; k++) {
      cut = k + 1;
      if (!/\s/.test(nm[k])) acc += nm[k];
    }
    if (st && acc === st) {
      const rest = nm.slice(cut).trim();
      if (rest) nm = rest; else t = '';   // 남는 이름만; name===top 이면 한 줄만
    }
  }
  return { top: t, name: nm };
}

// 대표 아이콘 한 조각을 "이름 / 개수" 형식으로 — 플러그인은 ' / ' 로 이름만 떼어 아이콘 PNG 를 매칭하므로,
// "진무강 200개"(개수가 이름에 공백으로 붙음)면 "진무강 200개" 라는 이름의 아이콘을 찾다 실패한다.
// 끝의 개수("200개","1,500개","15개" 등) 앞에 ' / ' 를 넣어 cardPresets("진무강 / 200개")와 형식을 통일.
function formatIconPiece(piece) {
  const p = String(piece || '').trim();
  if (!p || p.includes('/')) return p;            // 빈 값/이미 슬래시 형식이면 그대로
  return p.replace(/\s+([\d][\d,]*\s*개)\s*$/, ' / $1');
}

// 구조화 추출 → 플러그인 "데이터 채우기"가 그대로 먹는 data.{월}.json 형태로 변환.
export function toPluginJson(d) {
  d = d || {};
  const meta = d.meta || {};
  const cardPresets = {};
  (d.rollovers || []).forEach((r) => {
    if (!r || !r.card) return;
    cardPresets[String(r.card)] = (r.items || []).map((it) => (it.count ? `${it.name} / ${it.count}` : it.name)).filter(Boolean);
  });
  const popup = (d.popupDays || [])
    .map((day) => [day.date, ...((day.rows || []).map((row) => `${row.name} | ${row.price != null && row.price !== '' ? row.price : '0'}`))].join('\n'))
    .join('\n\n');
  const popupTexts = {};
  (d.popupTexts || []).forEach((t) => { if (t && t.key) popupTexts[t.key] = t.value || ''; });

  return {
    version: '1.0',
    source: `${meta.game || '오상스'} ${meta.month || ''} 오늘의 상품 스페셜`.trim(),
    salePeriod: meta.salePeriod || '',     // 배너 slot/date 판매 기간
    rewardPeriod: meta.rewardPeriod || '', // 배너 slot/date 수령 기간
    boxes: (d.boxes || []).map((b) => { const s = splitBoxName(b && b.top, b && b.name); return s.top ? `${s.top} / ${s.name}` : s.name; }).filter(Boolean),
    // 대표 아이콘 구분자 정규화 — 모델이 한 슬롯의 여러 빨강 아이템을 <br>·줄바꿈으로 이어붙여 와도
    // 플러그인 buildSlotComposites 는 ' + ' 로만 분리해 여러 PNG 를 한 장으로 합성한다. 따라서 ' + ' 로 통일.
    // (쉼표는 "1,500개" 같은 개수와 충돌하므로 구분자로 쓰지 않음)
    slotIcons: (d.slotIcons || [])
      .map((s) => String(s || '').replace(/<br\s*\/?>/gi, ' + ').replace(/\s*[\n;]+\s*/g, ' + ').replace(/\s*\+\s*/g, ' + ').trim())
      .filter(Boolean)
      .map((s) => s.split(' + ').map(formatIconPiece).filter(Boolean).join(' + ')), // 각 아이콘에 "이름 / 개수" 형식 적용
    // milestones: "보상명 / 조건(threshold) *" — 슬래시로 조건을 함께 실어야 플러그인이
    // milestone/cond(상단 [조건])까지 채운다. magnify(돋보기)는 끝의 " *". 조건 없으면 이름만.
    milestones: (d.milestones || []).map((m) => {
      if (!m || !m.name) return '';
      // 조건은 "10,000 누적 시" 형식으로. 이미 "누적" 표현이 있으면 그대로(중복 방지).
      let line = m.name;
      if (m.threshold) {
        const th = String(m.threshold).trim();
        const cond = /누적/.test(th) ? th : `${th} 누적 시`;
        line = `${m.name} / ${cond}`;
      }
      if (m.magnify) line += ' *';
      return line;
    }).filter(Boolean),
    cardPresets,
    popup,
    popupTexts,
    replacements: (d.replacements || []).filter((r) => r && r.before && r.after),
  };
}

// 화면 요약 카운트 (기획서 헤더 통계용).
export function promoStats(d) {
  d = d || {};
  return {
    boxes: (d.boxes || []).length,
    milestones: (d.milestones || []).length,
    days: (d.popupDays || []).length,
    popupTexts: (d.popupTexts || []).length,
    replacements: (d.replacements || []).length,
    rollovers: (d.rollovers || []).length,
  };
}
