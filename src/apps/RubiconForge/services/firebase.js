// RubiconForge 는 현재 Firestore CRUD 를 직접 수행하지 않는다.
// 다른 앱(RenderMatrix 등)과 동일한 폴더 구조 유지를 위해 공유 lib + firestore primitives 를 re-export.
// 향후 시안 저장/공유 기능 추가 시 이 모듈을 확장하면 된다.
export { db, appId } from "../../../lib/firebase";
export {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
