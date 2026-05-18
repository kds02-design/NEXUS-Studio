// RenderMatrix 는 현재 사용자가 올린 이미지를 외부에 업로드하지 않고
// FileReader 로 메모리 내(data URL) 처리만 한다.
// 폴더 구조 통일을 위해 공유 Cloudinary 유틸 re-export 와 fileToDataUrl 헬퍼만 노출.
export { uploadBase64 } from "../../../lib/storage";

// File → base64 data URL. ImageDropzone 등 컴포넌트에서 동기적으로 사용하기 좋게 Promise 화.
export const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith("image/")) {
      reject(new Error("이미지 파일만 지원합니다."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
