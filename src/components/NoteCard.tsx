"use client";

import { BookOpen, Globe, Star } from "lucide-react";
import Link from "next/link";
import { useToggleNoteFavorite } from "@/lib/queries";
import type { Note } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";
import LabelChip from "./LabelChip";

export default function NoteCard({
  note,
  href,
  publicMode = false,
}: {
  note: Note;
  href: string;
  /** Mode Explore: tanpa tombol favorit, tampilkan nama penulis. */
  publicMode?: boolean;
}) {
  const toggleFav = useToggleNoteFavorite();

  return (
    <article className="card group relative flex flex-col p-4 transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={href} className="absolute inset-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-coksu-400" aria-label={note.title} />

      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 font-semibold text-gray-900">{note.title}</h3>
        {!publicMode && (
          <button
            type="button"
            onClick={() => toggleFav.mutate(note.id)}
            disabled={toggleFav.isPending}
            className="relative z-10 -m-1.5 shrink-0 rounded-lg p-1.5 hover:bg-coksu-100"
            aria-label={note.is_favorite ? "Hapus dari favorit" : "Tambah ke favorit"}
          >
            <Star className={cn("h-4 w-4", note.is_favorite ? "fill-coksu-500 text-coksu-500" : "text-gray-400")} />
          </button>
        )}
      </div>

      <p className="mt-1.5 line-clamp-3 min-h-[3.75rem] text-sm text-gray-500">{note.excerpt || "Belum ada isi."}</p>

      {note.labels.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {note.labels.slice(0, 3).map((l) => (
            <LabelChip key={l.id} name={l.name} />
          ))}
          {note.labels.length > 3 && <span className="text-xs text-gray-400">+{note.labels.length - 3}</span>}
        </div>
      )}

      <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
        <BookOpen className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{publicMode ? `@${note.author}` : note.book.title}</span>
        <span>·</span>
        <span className="shrink-0">{timeAgo(note.updated_at)}</span>
        {!publicMode && note.is_public && <Globe className="ml-auto h-3.5 w-3.5 shrink-0 text-coksu-600" aria-label="Publik" />}
      </div>
    </article>
  );
}
