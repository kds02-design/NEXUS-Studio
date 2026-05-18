// uploader.js — Cloudinary 업로드 + Firestore 색인.
// 한 번 업로드한 원본에 transformation URL 두 종(preview / full_image)을 발급한다.
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { v2 as cloudinary } from 'cloudinary';

// ─── 초기화 ─────────────────────────────────────────────
let _db = null;

export function initFirebase() {
  if (_db) return _db;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKeyRaw) {
    throw new Error('FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY 환경변수가 누락되었습니다.');
  }
  // .env 에 저장된 \n 리터럴을 실제 줄바꿈으로 복원 (Firebase 표준 패턴)
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

  if (getApps().length === 0) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }
  _db = getFirestore();
  return _db;
}

export function initCloudinary() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error('CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET 환경변수가 누락되었습니다.');
  }
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
}

// ─── 컬렉션 경로 매핑 ──────────────────────────────────
// 앱별 Firestore 컬렉션 경로. NEXUS_APP_ID 가 artifacts/{appId}/... prefix 로 들어간다.
const COLLECTION_MAP = {
  'banner-codex': 'banners',
  'promotion-archive': 'promotion-banners',
};

export function getCollectionPath(appKey) {
  const sub = COLLECTION_MAP[appKey];
  if (!sub) throw new Error(`알 수 없는 app 값: ${appKey} (config.json watch[].app 확인)`);
  const appId = process.env.NEXUS_APP_ID;
  if (!appId) throw new Error('NEXUS_APP_ID 환경변수가 누락되었습니다.');
  return `artifacts/${appId}/public/data/${sub}`;
}

// ─── Cloudinary 업로드 ──────────────────────────────────
// 원본 1회 업로드 후, transformation URL 로 preview / full_image 두 종을 생성.
// folder 는 nexus-watcher/{appKey} 로 통일해 어드민이 분리해 볼 수 있게 한다.
export async function uploadToCloudinary(filePath, { appKey }) {
  const folder = `nexus-watcher/${appKey}`;
  const uploaded = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: 'image',
    overwrite: false,
    unique_filename: true,
    use_filename: true,
  });
  // Cloudinary transformation URL — 별도 호출 없이 변형 URL 생성.
  const publicId = uploaded.public_id;
  const preview = cloudinary.url(publicId, {
    secure: true,
    fetch_format: 'auto',
    quality: 'auto:eco',
    width: 600,
    crop: 'limit',
  });
  const fullImage = cloudinary.url(publicId, {
    secure: true,
    fetch_format: 'auto',
    quality: 'auto:good',
    width: 2000,
    crop: 'limit',
  });
  return {
    publicId,
    preview,
    fullImage,
    width: uploaded.width,
    height: uploaded.height,
    bytes: uploaded.bytes,
  };
}

// ─── Firestore 중복 체크 / 문서 생성 ────────────────────
// `sourcePath` 필드를 nexus-watcher 의 고유 dedup 키로 사용.
// 다른 경로에서 같은 파일명만 있는 경우엔 중복으로 잡지 않음 (서로 다른 자산일 수 있음).
export async function findExistingDoc(db, appKey, relativePath) {
  const col = getCollectionPath(appKey);
  const snap = await db.collection(col)
    .where('sourcePath', '==', relativePath)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, data: d.data() };
}

export async function createDoc(db, appKey, meta, cloud) {
  const col = getCollectionPath(appKey);
  const doc = {
    title: meta.title,
    game: meta.game,
    year: meta.year,
    month: meta.month,
    date: meta.date,
    path: meta.fullPath,
    sourcePath: meta.relativePath,
    tags: [],
    preview: cloud.preview,
    full_image: cloud.fullImage,
    cloudinaryPublicId: cloud.publicId,
    width: cloud.width,
    height: cloud.height,
    bytes: cloud.bytes,
    source: 'nexus-watcher',
    created_at: FieldValue.serverTimestamp(),
  };
  const ref = await db.collection(col).add(doc);
  return { id: ref.id, ...doc };
}
