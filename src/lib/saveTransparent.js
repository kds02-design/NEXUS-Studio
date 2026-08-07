// 오브젝트 이미지 저장 시 자동 투명화.
// smartTransparentPng 이 배경을 분석해 오브젝트에 적합한 툴을 스스로 선택한다:
//   순흑 발광 → 루마키 · 단색/크로마 → 색상 키 · 복잡 배경 → 실패 판정(호출부가 원본 저장 + Mask Forge 안내).
// 생성 배경색을 아는 앱(RubiconForge)은 자체 colorToTransparentPng 를 쓰고, 배경색을 모르는
// 앱(FrameForge/NexusPreview/스킬 런타임)이 이 헬퍼로 자동 판별한다.
import { smartTransparentPng } from "./smartTransparency";

// returns { dataUrl, transparent, method?, reason? }
//   transparent=true  → dataUrl 은 투명 PNG
//   transparent=false → dataUrl 은 원본(그대로 저장), reason: 'complex'|'taint'|'load'|'error'
export async function transparentForSave(src) {
  try {
    const r = await smartTransparentPng(src);
    if (r.ok) return { dataUrl: r.dataUrl, transparent: true, method: r.method };
    return { dataUrl: src, transparent: false, reason: r.reason || "complex" };
  } catch {
    return { dataUrl: src, transparent: false, reason: "error" };
  }
}
