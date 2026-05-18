// RenderMatrix 자체는 현재 Firestore 를 사용하지 않음.
// 다른 앱(PromptArc 등)과 동일한 폴더 구조 유지를 위해 공유 lib 모듈을 re-export.
// 향후 즐겨찾기 프리셋 저장, 결과 공유 등이 추가될 때 이 파일을 확장.
export { db, appId } from "../../../lib/firebase";
