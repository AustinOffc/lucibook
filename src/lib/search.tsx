"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

interface SearchState {
  q: string;
  setQ: (v: string) => void;
  /** Nilai q yang sudah di-debounce (dipakai untuk request ke API). */
  debouncedQ: string;
}

const SearchContext = createContext<SearchState | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const value = useMemo(() => ({ q, setQ, debouncedQ }), [q, debouncedQ]);
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch(): SearchState {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch harus dipakai di dalam SearchProvider");
  return ctx;
}
