"use client";

import { FileText, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ErrorBox, Pagination, Pill } from "@/components/owner/parts";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { BlockSpinner } from "@/components/ui/Spinner";
import { getErrorMessage } from "@/lib/api";
import { useDebounced, useOwnerNotes, Visibility } from "@/lib/owner";
import { cn, timeAgo } from "@/lib/utils";

const TABS: { value: Visibility; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "public", label: "Publik" },
  { value: "private", label: "Privat" },
  { value: "trashed", label: "Sampah" },
];

export default function OwnerNotesPage() {
  const [q, setQ] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("all");
  const [userId, setUserId] = useState("");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q.trim());

  // Filter ?user=<id> dari halaman detail pengguna (dibaca di klien agar halaman tetap statis).
  useEffect(() => {
    setUserId(new URLSearchParams(window.location.search).get("user") ?? "");
  }, []);

  useEffect(() => {
    setPage(1);
  }, [dq, visibility, userId]);

  const { data, isLoading, isPlaceholderData, error } = useOwnerNotes({ q: dq, visibility, user_id: userId, page });

  return (
    <>
      <PageHeader title="Catatan & Konten" description="Pantau dan moderasi semua catatan dari seluruh pengguna." />

      <div className="mb-3 relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder="Cari judul, isi, atau username penulis…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setVisibility(t.value)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
              visibility === t.value ? "bg-pinksoft-600 text-white" : "bg-white text-gray-600 ring-1 ring-pinksoft-200 hover:bg-pinksoft-50"
            )}
          >
            {t.label}
          </button>
        ))}
        {userId && (
          <button
            type="button"
            onClick={() => {
              setUserId("");
              window.history.replaceState(null, "", "/owner/notes");
            }}
            className="inline-flex items-center gap-1 rounded-full bg-pinksoft-100 px-3 py-1.5 text-sm font-medium text-pinksoft-800"
          >
            Filter satu pengguna <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {error && <ErrorBox message={getErrorMessage(error)} />}

      {isLoading ? (
        <BlockSpinner />
      ) : data && data.notes.length === 0 ? (
        <EmptyState icon={<FileText className="h-6 w-6" />} title="Tidak ada catatan" hint="Coba ubah kata kunci atau filter." />
      ) : data ? (
        <>
          <div className={cn("space-y-3", isPlaceholderData && "opacity-60")}>
            {data.notes.map((n) => (
              <Link key={n.id} href={`/owner/notes/${n.id}`} className="card block p-4 transition hover:border-pinksoft-300">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="min-w-0 truncate font-medium text-gray-900">{n.title}</h3>
                  {n.is_public && !n.in_trash && <Pill tone="green">Publik</Pill>}
                  {n.in_trash && <Pill tone="red">Di Sampah</Pill>}
                </div>
                {n.excerpt && <p className="mt-1 line-clamp-2 text-sm text-gray-500">{n.excerpt}</p>}
                <p className="mt-1.5 text-xs text-gray-400">
                  @{n.author.username} · {n.book.title} · {timeAgo(n.updated_at)}
                </p>
              </Link>
            ))}
          </div>
          <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
        </>
      ) : null}
    </>
  );
}
