"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/api";
import { useBooks, useCreateNote } from "@/lib/queries";
import Modal from "./ui/Modal";

export default function NewNoteModal({
  open,
  onClose,
  defaultBookId,
}: {
  open: boolean;
  onClose: () => void;
  defaultBookId?: string;
}) {
  const router = useRouter();
  const { data: books = [], isLoading } = useBooks();
  const createNote = useCreateNote();
  const [title, setTitle] = useState("");
  const [bookId, setBookId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle("");
      setError("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setBookId((cur) => (books.some((b) => b.id === cur) ? cur : defaultBookId || books[0]?.id || ""));
  }, [open, books, defaultBookId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!bookId) return;
    setError("");
    try {
      const note = await createNote.mutateAsync({ book_id: bookId, title: title.trim() || "Tanpa judul" });
      onClose();
      router.push(`/notes/${note.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Catatan baru">
      {!isLoading && books.length === 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Catatan disimpan di dalam Buku. Buat buku pertamamu dulu.</p>
          <Link href="/books" onClick={onClose} className="btn-primary w-full">
            Buat buku
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Judul</label>
            <input autoFocus className="input" placeholder="Tanpa judul" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Simpan di buku</label>
            <select className="input" value={bookId} onChange={(e) => setBookId(e.target.value)}>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-outline" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={createNote.isPending || !bookId}>
              {createNote.isPending ? "Membuat…" : "Buat & tulis"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
