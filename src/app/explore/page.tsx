"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import NotesGrid from "@/components/NotesGrid";
import { getErrorMessage } from "@/lib/api";
import { useExplore } from "@/lib/queries";

export default function ExplorePage() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const notes = useExplore(debounced);

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-coksu-900">Explore</h1>
        <p className="mt-2 text-gray-500">Catatan yang dibagikan publik oleh pengguna Lucibook.</p>
        <div className="relative mx-auto mt-5 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            className="input pl-10"
            placeholder="Cari catatan publik…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <NotesGrid
        publicMode
        notes={notes.data}
        loading={notes.isLoading}
        dimmed={notes.isPlaceholderData}
        error={notes.error ? getErrorMessage(notes.error) : undefined}
        emptyTitle={debounced ? "Tidak ada catatan yang cocok" : "Belum ada catatan publik"}
        emptyHint={debounced ? "Coba kata kunci lain." : "Jadikan catatanmu publik dari editor untuk muncul di sini."}
      />
    </>
  );
}
