"use client";

import { ArrowLeft, BookOpen, Pencil, Plus, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import NotesGrid from "@/components/NotesGrid";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import NameModal from "@/components/ui/NameModal";
import PageHeader from "@/components/ui/PageHeader";
import { BlockSpinner } from "@/components/ui/Spinner";
import { getErrorMessage } from "@/lib/api";
import {
  useBook,
  useCreateNote,
  useDeleteBook,
  useNotes,
  useToggleBookFavorite,
  useUpdateBook,
} from "@/lib/queries";
import { useSearch } from "@/lib/search";
import { cn } from "@/lib/utils";

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { debouncedQ } = useSearch();
  const book = useBook(id);
  const notes = useNotes({ book_id: id, q: debouncedQ });
  const updateBook = useUpdateBook();
  const deleteBook = useDeleteBook();
  const toggleFav = useToggleBookFavorite();
  const createNote = useCreateNote();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  if (book.isLoading) return <BlockSpinner />;
  if (book.isError || !book.data) {
    return (
      <EmptyState
        icon={<Pencil className="h-6 w-6" />}
        title="Buku tidak ditemukan"
        action={
          <Link href="/books" className="btn-primary">
            Kembali ke Buku
          </Link>
        }
      />
    );
  }
  const b = book.data;

  async function newPage() {
    setError("");
    try {
      const note = await createNote.mutateAsync({ book_id: id, title: "Tanpa judul" });
      router.push(`/notes/${note.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <>
      <Link href="/books" className="btn-ghost -ml-3 mb-2 px-3 py-2">
        <ArrowLeft className="h-4 w-4" /> Semua buku
      </Link>

      <PageHeader
        title={b.title}
        description={debouncedQ ? `Hasil untuk “${debouncedQ}”` : undefined}
        actions={
          <>
            <button type="button" onClick={() => toggleFav.mutate(id)} className="btn-ghost p-2" aria-label="Favorit">
              <Star className={cn("h-5 w-5", b.is_favorite && "fill-coksu-500 text-coksu-500")} />
            </button>
            <button type="button" onClick={() => setEditing(true)} className="btn-ghost p-2" aria-label="Ubah nama">
              <Pencil className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => setDeleting(true)} className="btn-ghost p-2 text-red-600 hover:bg-red-50" aria-label="Hapus buku">
              <Trash2 className="h-5 w-5" />
            </button>
            {(b._count?.pages ?? notes.data?.length ?? 0) > 0 && (
              <Link href={`/books/${id}/read`} className="btn-outline">
                <BookOpen className="h-4 w-4" /> Baca
              </Link>
            )}
            <button type="button" onClick={newPage} disabled={createNote.isPending} className="btn-primary">
              <Plus className="h-4 w-4" /> Halaman baru
            </button>
          </>
        }
      />

      {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <NotesGrid
        notes={notes.data}
        loading={notes.isLoading}
        dimmed={notes.isPlaceholderData}
        error={notes.error ? getErrorMessage(notes.error) : undefined}
        emptyTitle={debouncedQ ? "Tidak ada catatan yang cocok" : "Buku ini masih kosong"}
        emptyHint={debouncedQ ? "Coba kata kunci lain." : "Tambahkan halaman pertama."}
        emptyAction={
          !debouncedQ && (
            <button type="button" className="btn-primary" onClick={newPage}>
              <Plus className="h-4 w-4" /> Halaman baru
            </button>
          )
        }
      />

      <NameModal
        open={editing}
        onClose={() => setEditing(false)}
        title="Ubah nama buku"
        label="Judul buku"
        initial={b.title}
        onSubmit={(title) => updateBook.mutateAsync({ id, title })}
      />
      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Hapus buku?"
        message={`Buku "${b.title}" beserta semua halamannya akan dihapus permanen.`}
        onConfirm={async () => {
          await deleteBook.mutateAsync(id);
          router.replace("/books");
        }}
      />
    </>
  );
}
