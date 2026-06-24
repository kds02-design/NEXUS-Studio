// BriefStudio · Prism — 오늘의 상품 스페셜 분석 기록의 서버 저장(Firestore).
// localStorage(브라우저 종속) 대신 사용자 계정 기준으로 저장 → 다른 컴퓨터에서도 보이고
// 삭제 전까지 유지. 경로: artifacts/{appId}/users/{uid}/briefPromoItems/{id}
//   (firestore.rules 의 artifacts/{appId}/users/{uid}/{document=**} 본인 read/write 규칙 적용 — 규칙 추가 불필요)
//
// data(분석 결과 전체 JSON)는 중첩 구조 안전성을 위해 dataJson 문자열로 저장하고 로드 시 파싱.

import { db, appId } from "../../../lib/firebase";
import { collection, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";

const itemsCol = (uid) =>
  uid && db ? collection(db, "artifacts", appId, "users", uid, "briefPromoItems") : null;

// 실시간 구독. cb(items[]) 로 UI 형태({id,title,month,rev,stats,kvTheme,kvName,data,createdAt,updatedAt})를 돌려준다.
// 정렬은 생성 시각(createdAt) 고정 — 불러오기/편집으로 updatedAt 이 바뀌어도 위치가 안 움직인다.
// (Firestore orderBy 대신 클라이언트 정렬 — createdAt 없는 옛 문서도 updatedAt 폴백으로 안전히 포함)
export function subscribePromoItems(uid, cb) {
  const c = itemsCol(uid);
  if (!c) { cb([]); return () => {}; }
  return onSnapshot(
    c,
    (snap) => {
      const items = snap.docs.map((d) => {
        const x = d.data() || {};
        let data;
        try { data = x.dataJson ? JSON.parse(x.dataJson) : (x.data || null); } catch { data = null; }
        return {
          id: d.id,
          title: x.title || "",
          month: x.month || "",
          rev: x.rev || 1,
          stats: x.stats || null,
          kvTheme: x.kvTheme || null,
          kvName: x.kvName || "",
          data,
          createdAt: x.createdAt || x.updatedAt || 0,
          updatedAt: x.updatedAt || 0,
        };
      });
      items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); // 최신 생성이 위, 고정
      cb(items);
    },
    (err) => { console.warn("[promoStore] 구독 실패", err?.code || err); cb([]); }
  );
}

// 항목 upsert(생성/갱신). item 은 UI 형태. data 는 dataJson 으로 직렬화해 저장.
export async function savePromoItem(uid, item) {
  const c = itemsCol(uid);
  if (!c || !item || !item.id) return;
  await setDoc(doc(c, item.id), {
    title: item.title || "",
    month: item.month || "",
    rev: item.rev || 1,
    stats: item.stats || null,
    kvTheme: item.kvTheme || null,
    kvName: item.kvName || "",
    dataJson: JSON.stringify(item.data || null),
    createdAt: item.createdAt || item.updatedAt || Date.now(), // 생성 시각 보존(정렬 기준)
    updatedAt: item.updatedAt || Date.now(),
  });
}

export async function deletePromoItem(uid, id) {
  const c = itemsCol(uid);
  if (!c || !id) return;
  await deleteDoc(doc(c, id));
}
