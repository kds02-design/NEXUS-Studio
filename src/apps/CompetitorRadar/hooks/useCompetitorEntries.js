import { useEffect, useMemo, useState } from "react";
import { subscribeToEntries, subscribeToReports } from "../services/firebase";

// 엔트리/리포트 실시간 구독 + 클라이언트 필터(경쟁사/유형/신규만/검색).
export const useCompetitorEntries = () => {
  const [entries, setEntries] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const [competitorFilter, setCompetitorFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [onlyNew, setOnlyNew] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsubE = subscribeToEntries((d) => { setEntries(d); setLoading(false); }, (e) => { console.warn("[CompetitorRadar] entries sub failed", e); setLoading(false); });
    const unsubR = subscribeToReports(setReports, (e) => console.warn("[CompetitorRadar] reports sub failed", e));
    return () => { unsubE?.(); unsubR?.(); };
  }, []);

  const competitors = useMemo(() => {
    const set = new Set(entries.map(e => e.competitor).filter(Boolean));
    return Array.from(set).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter(e => {
      if (competitorFilter !== "all" && e.competitor !== competitorFilter) return false;
      if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
      if (onlyNew && !e.isNew) return false;
      if (q) {
        const hay = [e.title, e.competitor, e.summary, ...(e.tags || []), ...(e.styleTraits || [])].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [entries, competitorFilter, categoryFilter, onlyNew, search]);

  return {
    entries, reports, loading, competitors, filtered,
    competitorFilter, setCompetitorFilter,
    categoryFilter, setCategoryFilter,
    onlyNew, setOnlyNew, search, setSearch,
  };
};
