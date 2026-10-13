"use client";

import { BookOpen, Plus } from "lucide-react";
import { useState } from "react";
import BookCard from "@/components/BookCard";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import NameModal from "@/components/ui/NameModal";
import PageHeader from "@/components/ui/PageHeader";
import { BlockSpinner } from "@/components/ui/Spinner";
import { useBooks, useCreateBook, useDeleteBook, useUpdateBook } from "@/lib/queries";
import type { Book } from "@/lib/types";

export default function BooksPage() {
  const { data: books, isLoading } = useBooks();
  const createBook = useCreateBook();
  const updateBook = useUpdateBook();
  const deleteBook = useDeleteBook();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [deleting, setDeleting] = useState<Book | null>(null);

  const newButton = (
    <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
      <Plus className="h-4 w-4" /> Buku baru
    </button>
  );

  return (
    <>
      <PageHeader title="Buku" description="Buku adalah folder utama tempat halaman catatan disimpan." actions={newButton} />

      {isLoading ? (
        <BlockSpinner />
      ) : !books || books.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title="Belum ada buku"
          hint="Buat buku pertama, misalnya “Kuliah”, “Ide Proyek”, atau “Jurnal”."
          action={newButton}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((b) => (
            <BookCard key={b.id} book={b} onEdit={() => setEditing(b)} onDelete={() => setDeleting(b)} />
          ))}
        </div>
      )}

      <NameModal
        open={creating}
        onClose={() => setCreating(false)}
        title="Buku baru"
        label="Judul buku"
        placeholder="mis. Ide Proyek"
        submitText="Buat"
        onSubmit={(title) => createBook.mutateAsync(title)}
      />
      <NameModal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Ubah nama buku"
        label="Judul buku"
        initial={editing?.title}
        onSubmit={(title) => updateBook.mutateAsync({ id: editing!.id, title })}
      />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Hapus buku?"
        message={`Buku "${deleting?.title}" beserta SEMUA halaman di dalamnya akan dihapus permanen.`}
        onConfirm={() => deleteBook.mutateAsync(deleting!.id)}
      />
    </>
  );
}
