"use client";

import { useState } from "react";
import BookCard from "@/components/BookCard";
import NotesGrid from "@/components/NotesGrid";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { BlockSpinner } from "@/components/ui/Spinner";
import { Star } from "lucide-react";
import { getErrorMessage } from "@/lib/api";
import { useBooks, useNotes } from "@/lib/queries";
import { useSearch } from "@/lib/search";
import { cn } from "@/lib/utils";

export default function FavoritesPage() {
  const [tab, setTab] = useState<"notes" | "books">("notes");
  const { debouncedQ } = useSearch();
  const notes = useNotes({ favorite: true, q: debouncedQ });
  const books = useBooks(true);

  return (
    <>
      <PageHeader title="Favorit" description="Catatan dan buku yang kamu bintangi." />

      <div className="mb-5 inline-flex rounded-xl bg-pinksoft-100 p-1">
        {(
          [
            ["notes", "Catatan"],
            ["books", "Buku"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "rounded-lg px-4 py-1.5 text-sm font-semibold transition",
              tab === key ? "bg-white text-pinksoft-900 shadow-sm" : "text-pinksoft-700 hover:text-pinksoft-900"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "notes" ? (
        <NotesGrid
          notes={notes.data}
          loading={notes.isLoading}
          dimmed={notes.isPlaceholderData}
          error={notes.error ? getErrorMessage(notes.error) : undefined}
          emptyTitle="Belum ada catatan favorit"
          emptyHint="Tekan ikon bintang pada catatan untuk menaruhnya di sini."
        />
      ) : books.isLoading ? (
        <BlockSpinner />
      ) : !books.data || books.data.length === 0 ? (
        <EmptyState icon={<Star className="h-6 w-6" />} title="Belum ada buku favorit" hint="Tekan ikon bintang pada buku untuk menaruhnya di sini." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.data.map((b) => (
            <BookCard key={b.id} book={b} />
          ))}
        </div>
      )}
    </>
  );
}
