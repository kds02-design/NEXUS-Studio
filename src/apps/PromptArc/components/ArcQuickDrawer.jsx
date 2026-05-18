// 아이디어 튜닝룸 — 원본에서도 state만 존재하고 UI는 아직 구현되지 않은 상태.
// 기존 동작 100% 유지를 위해 동일하게 no-op 렌더로 유지한다.
// 향후 UI가 추가될 때 이 컴포넌트만 수정하면 됨.
export default function ArcQuickDrawer({ isOpen, onClose: _onClose }) {
  if (!isOpen) return null;
  return null;
}
