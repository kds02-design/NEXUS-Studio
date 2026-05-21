// 현재 로그인 사용자의 이번 주 크레딧 사용량을 실시간 구독.
// 반환: { used, byAction, cap, remaining, grade, weekKey, isLoading }
import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import {
  creditsRef, weekKey,
  creditCap, remainingCredits,
  setCreditCache,
} from "./grades";

export default function useWeeklyCredits() {
  const { user, grade } = useAuth();
  const [used, setUsed] = useState(0);
  const [byAction, setByAction] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const wk = weekKey();

  useEffect(() => {
    if (!user?.uid) {
      setUsed(0); setByAction({}); setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const ref = creditsRef(user.uid, wk);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.exists() ? snap.data() : {};
        const u = data.used || 0;
        const ba = data.byAction || {};
        setUsed(u);
        setByAction(ba);
        setCreditCache(user.uid, u, ba, wk);
        setIsLoading(false);
      },
      (err) => {
        console.warn("[useWeeklyCredits] listener error", err);
        setIsLoading(false);
      }
    );
    return () => unsub();
  }, [user?.uid, wk]);

  const cap = creditCap(grade);
  const remaining = remainingCredits(grade, used);
  return { used, byAction, cap, remaining, grade, weekKey: wk, isLoading };
}
