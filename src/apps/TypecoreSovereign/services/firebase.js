// 통합 Firebase 서비스 — db/appId 싱글톤과 자주 쓰는 firestore 함수 재노출.
// PromptEngine은 `firebase/firestore`나 `../../../lib/firebase`를 직접 import하지 않고
// 이 모듈을 거쳐서 단일 진입점을 유지한다.
export { db, appId } from "../../../lib/firebase";
export {
  collection,
  addDoc,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
