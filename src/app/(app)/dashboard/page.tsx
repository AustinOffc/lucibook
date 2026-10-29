"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import BookCard from "@/components/BookCard";
import NewNoteModal from "@/components/NewNoteModal";
import NotesGrid from "@/components/NotesGrid";
import PageHeader from "@/components/ui/PageHeader";
import { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { displayName } from "@/lib/profile";
import { useBooks, useNotes } from "@/lib/queries";
import { useSearch } from "@/lib/search";

export default function DashboardPage() {
  const { user } = useAuth();
  const { debouncedQ } = useSearch();
  const notes = useNotes({ q: debouncedQ });
  const books = useBooks();
  const [newOpen, setNewOpen] = useState(false);
  const searching = debouncedQ.length > 0;

  return (
    <>
      <PageHeader
        title={searching ? `Hasil untuk “${debouncedQ}”` : `Halo, ${displayName(user)}`}
        description={searching ? `${notes.data?.length ?? 0} catatan ditemukan` : "Semua catatanmu, yang terbaru di atas."}
        actions={
          <button type="button" className="btn-primary" onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4" /> Catatan baru
          </button>
        }
      />

      {!searching && books.data && books.data.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Buku</h2>
            <Link href="/books" className="text-sm font-medium text-pinksoft-700 hover:underline">
              Lihat semua
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {books.data.slice(0, 4).map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        </section>
      )}

      <section>
        {!searching && <h2 className="mb-3 font-semibold text-gray-900">Catatan</h2>}
        <NotesGrid
          notes={notes.data}
          loading={notes.isLoading}
          dimmed={notes.isPlaceholderData}
          error={notes.error ? getErrorMessage(notes.error) : undefined}
          emptyTitle={searching ? "Tidak ada catatan yang cocok" : "Belum ada catatan"}
          emptyHint={searching ? "Coba kata kunci lain." : "Buat catatan pertamamu — simpan di dalam sebuah Buku."}
          emptyAction={
            !searching && (
              <button type="button" className="btn-primary" onClick={() => setNewOpen(true)}>
                <Plus className="h-4 w-4" /> Catatan baru
              </button>
            )
          }
        />
      </section>

      <NewNoteModal open={newOpen} onClose={() => setNewOpen(false)} />
    </>
  );
}
