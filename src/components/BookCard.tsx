"use client";

import { BookOpen, Pencil, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useToggleBookFavorite } from "@/lib/queries";
import type { Book } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function BookCard({
  book,
  onEdit,
  onDelete,
}: {
  book: Book;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const toggleFav = useToggleBookFavorite();
  const count = book._count?.pages ?? 0;

  return (
    <article className="card group relative p-4 transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/books/${book.id}`} className="absolute inset-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-coksu-400" aria-label={book.title} />

      <div className="flex items-start justify-between">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-coksu-100 text-coksu-700">
          <BookOpen className="h-5 w-5" />
        </div>
        <button
          type="button"
          onClick={() => toggleFav.mutate(book.id)}
          disabled={toggleFav.isPending}
          className="relative z-10 -m-1.5 rounded-lg p-1.5 hover:bg-coksu-100"
          aria-label={book.is_favorite ? "Hapus dari favorit" : "Tambah ke favorit"}
        >
          <Star className={cn("h-4 w-4", book.is_favorite ? "fill-coksu-500 text-coksu-500" : "text-gray-400")} />
        </button>
      </div>

      <h3 className="mt-3 line-clamp-2 font-semibold text-gray-900">{book.title}</h3>
      <p className="mt-0.5 text-sm text-gray-500">{count} halaman</p>

      {(onEdit || onDelete) && (
        <div className="relative z-10 mt-3 flex gap-1 border-t border-coksu-100 pt-3">
          {onEdit && (
            <button type="button" onClick={onEdit} className="btn-ghost px-2.5 py-1.5 text-xs">
              <Pencil className="h-3.5 w-3.5" /> Ubah
            </button>
          )}
          {onDelete && (
            <button type="button" onClick={onDelete} className="btn-ghost px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50">
              <Trash2 className="h-3.5 w-3.5" /> Hapus
            </button>
          )}
        </div>
      )}
    </article>
  );
}
