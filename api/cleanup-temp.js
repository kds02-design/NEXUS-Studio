// Vercel Cron — 임시 파일(NEXUS 자동 저장물) 2단계 수명 정리.
// 클라이언트 lazy 스윕과 동일 로직을 서버에서 스케줄대로 수행:
//   1) 활성 만료(temporary, !trashed, expiresAt<now)  → trashed 마킹 + '쓰레기통' 폴더로 이동
//   2) 휴지통 만료(trashed, trashExpiresAt<now)        → 영구 삭제
//   공개(visibility==='public')로 발행한 항목은 두 단계 모두 제외(보존).
//   temporary 플래그는 lib/promptArcSave.js 의 savePromptToArc(=RubiconForge 리스킨/벡터
//   자동 저장)만 설정한다. 사용자가 직접 만든 프롬프트는 건드리지 않는다.
//
// 스케줄: vercel.json 의 "crons" (기본 매일 03:00 UTC). 현재 미사용(env 미설정 시 비활성).
//
// 필요한 서버 환경변수 (Vercel 대시보드):
//   FIREBASE_SERVICE_ACCOUNT = <서비스 계정 JSON 전체를 한 줄 문자열로>
//   CRON_SECRET             = <임의 문자열> (설정 시 Vercel Cron 이 Authorization 헤더로 자동 인증)
//   VITE_FIREBASE_PROJECT_ID(선택) — 없으면 서비스 계정의 project_id 사용 (appId === projectId)

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const TRASH_TTL_DAYS = 15;
const TRASH_TTL_MS = TRASH_TTL_DAYS * 24 * 60 * 60 * 1000;
const TRASH_FOLDER_NAME = '쓰레기통';

let cachedDb = null;
let cachedAppId = null;

function init() {
  if (cachedDb) return { db: cachedDb, appId: cachedAppId };
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT 가 서버에 설정되지 않았습니다.');
  const sa = JSON.parse(raw);
  if (!getApps().length) initializeApp({ credential: cert(sa) });
  cachedDb = getFirestore();
  cachedAppId = process.env.VITE_FIREBASE_PROJECT_ID || sa.project_id; // appId === projectId
  return { db: cachedDb, appId: cachedAppId };
}

const promptsCol = (db, appId) =>
  db.collection('artifacts').doc(appId).collection('public').doc('data').collection('prompts');

const foldersCol = (db, uid) => db.collection('users').doc(uid).collection('folders');

async function ensureTrashFolder(db, uid) {
  const fcol = foldersCol(db, uid);
  const q = await fcol.where('name', '==', TRASH_FOLDER_NAME).limit(1).get();
  if (!q.empty) return q.docs[0].id;
  const ref = await fcol.add({ name: TRASH_FOLDER_NAME, items: [], createdAt: FieldValue.serverTimestamp() });
  return ref.id;
}

// 한 사용자의 폴더 재배치: 새로 버린 것 → 쓰레기통 추가 + 원폴더 제거, 삭제분 → 쓰레기통에서도 제거.
async function reorgFolders(db, uid, trashIds, deleteIds) {
  const fcol = foldersCol(db, uid);
  const trashId = trashIds.length ? await ensureTrashFolder(db, uid) : null;
  const trashSet = new Set(trashIds);
  const delSet = new Set(deleteIds);
  const snap = await fcol.get();
  await Promise.all(snap.docs.map(d => {
    const items = Array.isArray(d.data().items) ? d.data().items : [];
    let next;
    if (d.id === trashId) {
      next = items.filter(id => !delSet.has(id));
      for (const id of trashIds) if (!next.includes(id)) next.push(id);
    } else {
      next = items.filter(id => !trashSet.has(id) && !delSet.has(id));
    }
    const changed = next.length !== items.length || next.some((v, i) => v !== items[i]);
    return changed ? d.ref.update({ items: next }).catch(() => {}) : null;
  }));
}

export default async function handler(req, res) {
  // 인증 — CRON_SECRET 설정 시, Vercel Cron 이 보내는 Authorization: Bearer 헤더 검증.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers?.authorization || '';
    if (auth !== `Bearer ${secret}`) { res.status(401).json({ ok: false, error: 'unauthorized' }); return; }
  }

  try {
    const { db, appId } = init();
    const now = Date.now();

    // expiresAt 가 존재하고 과거인 문서 = 만료 후보(활성 만료 + 이미 휴지통). 단일 범위 → 복합 인덱스 불필요.
    const snap = await promptsCol(db, appId).where('expiresAt', '<', now).get();
    const candidates = snap.docs.filter(d => {
      const x = d.data();
      return x?.temporary === true && x?.visibility !== 'public'; // NEXUS 자동 저장물 + 비공개만
    });
    const toTrash = candidates.filter(d => d.data().trashed !== true);
    const toDelete = candidates.filter(d => {
      const x = d.data();
      return x.trashed === true && typeof x.trashExpiresAt === 'number' && x.trashExpiresAt < now;
    });

    if (toTrash.length === 0 && toDelete.length === 0) {
      res.status(200).json({ ok: true, trashed: 0, deleted: 0, scanned: snap.size });
      return;
    }

    // 1) 문서 상태 변경 (배치 400단위): 활성 만료 → trashed 마킹, 휴지통 만료 → 삭제.
    const byOwner = {}; // uid -> { trash:Set, del:Set }
    const track = (uid, kind, id) => {
      if (!uid) return;
      (byOwner[uid] ||= { trash: new Set(), del: new Set() })[kind].add(id);
    };
    const ops = [
      ...toTrash.map(d => ({ d, kind: 'trash' })),
      ...toDelete.map(d => ({ d, kind: 'del' })),
    ];
    for (let i = 0; i < ops.length; i += 400) {
      const batch = db.batch();
      for (const { d, kind } of ops.slice(i, i + 400)) {
        const uid = d.data()?.ownerUid;
        if (kind === 'trash') {
          batch.update(d.ref, { trashed: true, trashExpiresAt: now + TRASH_TTL_MS, updatedAt: now });
          track(uid, 'trash', d.id);
        } else {
          batch.delete(d.ref);
          track(uid, 'del', d.id);
        }
      }
      await batch.commit();
    }

    // 2) 사용자별 폴더 재배치.
    for (const [uid, sets] of Object.entries(byOwner)) {
      try { await reorgFolders(db, uid, [...sets.trash], [...sets.del]); }
      catch (e) { console.warn('[cleanup-temp] reorg failed for', uid, e?.message || e); }
    }

    res.status(200).json({ ok: true, trashed: toTrash.length, deleted: toDelete.length, scanned: snap.size });
  } catch (e) {
    console.error('[cleanup-temp]', e);
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}
