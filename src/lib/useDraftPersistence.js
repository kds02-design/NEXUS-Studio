// 앱 옵션 드래프트를 localStorage 에 디바운스 저장하고, 재진입 시 복원 후보를 제공하는 공용 훅.
// 배경: 타이포 계열 앱들은 상태가 전부 메모리 전용이라 새로고침 한 번에 30분 튜닝이 소실됨.
//
// 사용법:
//   const draft = useDraftPersistence("nx:typecore-breeze:draft", snapshotObj);
//   draft.saved        — 마운트 시점에 읽어 둔 이전 드래프트 (없으면 null). 복원 값의 원본.
//   draft.showRestore  — 복원 배너 노출 여부 (saved 존재 + 아직 닫지 않음).
//   draft.dismiss()    — 복원 배너만 닫음 (저장은 계속).
//   draft.clear()      — 저장된 드래프트 삭제 + 배너 닫음 (앱의 "초기화" 버튼에서 함께 호출).
//
// saved 는 마운트 때 메모리로 떠 두므로, 이후 디바운스 저장이 localStorage 를 덮어써도
// 사용자가 [복원] 을 누르는 시점까지 안전하다.
// ⚠️ snapshot 에 dataURL·업로드 이미지 등 대용량 값을 넣지 말 것 (localStorage quota).

import { useEffect, useMemo, useRef, useState } from "react";

export function useDraftPersistence(storageKey, snapshot, { debounceMs = 800 } = {}) {
  const [saved] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [showRestore, setShowRestore] = useState(() => saved != null);

  const timerRef = useRef(null);

  // snapshot 이 바뀔 때마다 타이머를 리셋하므로 클로저의 snapshot 이 항상 최신값.
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(snapshot));
      } catch {
        /* quota 초과 등 — 드래프트는 편의 기능이므로 조용히 무시 */
      }
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [storageKey, debounceMs, snapshot]);

  return useMemo(
    () => ({
      saved,
      showRestore,
      dismiss: () => setShowRestore(false),
      clear: () => {
        try {
          localStorage.removeItem(storageKey);
        } catch {
          /* noop */
        }
        setShowRestore(false);
      },
    }),
    [saved, showRestore, storageKey],
  );
}
