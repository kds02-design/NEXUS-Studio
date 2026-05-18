// Pop 도 RenderMatrix 와 동일하게 외부 업로드 없이 File → data URL 만 사용.
// RenderMatrix 의 helper 를 그대로 재사용 (shared/ 이동 시 한 곳만 갱신하면 됨).
export { uploadBase64 } from "../../../lib/storage";
export { fileToDataUrl } from "../../RenderMatrix/services/cloudinary";
