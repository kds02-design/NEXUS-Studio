// Master Template Firestore CRUD — 분석 결과를 영속화해서 나중에 재사용·송신 가능.
// 경로: artifacts/{appId}/users/{uid}/masterTemplates/{id} — 사용자 스코프.
// 다른 사용자 데이터 격리 + 어드민의 다중 컬렉션과도 충돌 없음.

import {
  collection, doc, addDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db, appId } from '../../../lib/firebase';

const colRef = (uid) => collection(db, 'artifacts', appId, 'users', uid, 'masterTemplates');
const docRef = (uid, id) => doc(db, 'artifacts', appId, 'users', uid, 'masterTemplates', id);

// 새 마스터 템플릿 저장.
// payload: 분석 결과 + 사용자가 입력한 title + 원본 배너 id 목록 (역추적용).
export async function saveMasterTemplate(uid, payload) {
  if (!uid) throw new Error('로그인이 필요합니다.');
  const data = {
    title: String(payload.title || '제목 없음').slice(0, 120),
    groupHint: String(payload.groupHint || ''),
    summary: String(payload.summary || ''),
    fixedRegions: Array.isArray(payload.fixedRegions) ? payload.fixedRegions : [],
    fixedCopy: Array.isArray(payload.fixedCopy) ? payload.fixedCopy : [],
    dynamicPlaceholders: Array.isArray(payload.dynamicPlaceholders) ? payload.dynamicPlaceholders : [],
    variableElements: Array.isArray(payload.variableElements) ? payload.variableElements : [],
    masterTemplateSpec: String(payload.masterTemplateSpec || ''),
    sourceBannerIds: Array.isArray(payload.sourceBannerIds) ? payload.sourceBannerIds.slice(0, 32) : [],
    sourceCount: Number(payload.sourceCount) || (payload.sourceBannerIds?.length || 0),
    sampleImageUrl: payload.sampleImageUrl || null,
    createdAt: serverTimestamp(),
    createdBy: uid,
  };
  const ref = await addDoc(colRef(uid), data);
  return ref.id;
}

// 실시간 구독 — 최신순. unsubscribe 함수 반환.
export function subscribeMasterTemplates(uid, callback) {
  if (!uid) {
    callback([]);
    return () => {};
  }
  const q = query(colRef(uid), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(list);
    },
    (err) => {
      console.error('[masterTemplates] subscribe error', err);
      callback([]);
    }
  );
}

export async function deleteMasterTemplate(uid, id) {
  if (!uid || !id) return;
  await deleteDoc(docRef(uid, id));
}

// 마스터 템플릿 → RubiconForge 아틀라스 모드로 보낼 payload 구성.
// 샘플 이미지는 RubiconForge 에서 atlas source 로 자동 설정되고,
// spec 은 atlasSpec 으로 프롬프트에 주입됨.
export function buildHandoffPayload(template) {
  return {
    source: 'promotion-archive',
    target: 'rubicon-forge',
    prompt: { text: '', tags: [], style: '' },
    image: {
      url: template.sampleImageUrl || '',
      metadata: { kind: 'atlas-master-template' },
    },
    params: {
      masterTemplateId: template.id,
      view: 'atlas',
      atlasSpec: template.masterTemplateSpec || '',
      atlasTitle: template.title || '',
      atlasSummary: template.summary || '',
    },
    timestamp: Date.now(),
  };
}
