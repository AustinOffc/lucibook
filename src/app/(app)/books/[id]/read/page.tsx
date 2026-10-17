"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Pencil } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef } from "react";
import BookPager from "@/components/BookPager";
import LabelChip from "@/components/LabelChip";
import EmptyState from "@/components/ui/EmptyState";
import { BlockSpinner } from "@/components/ui/Spinner";
import { api, getErrorMessage } from "@/lib/api";
import { useBook, useNote, useNotes } from "@/lib/queries";
import type { Note } from "@/lib/types";
import { formatDate } from "@/lib/utils";

/**
 * Mode baca (read-only): satu catatan = satu halaman buku.
 * Urutan halaman mengikuti waktu dibuat (terlama = halaman 1).
 * Nomor halaman disimpan di URL (?p=3) sehingga refresh tetap di halaman yang sama.
 */
function Reader() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const search = useSearchParams();
  const qc = useQueryClient();
  const topRef = useRef<HTMLDivElement>(null);

  const book = useBook(id);
  const list = useNotes({ book_id: id });

  const pages = useMemo(
    () => [...(list.data ?? [])].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [list.data]
  );
  const total = pages.length;

  const parsed = parseInt(search.get("p") ?? "1", 10);
  const current = Math.min(Math.max(Number.isFinite(parsed) ? parsed : 1, 1), Math.max(total, 1));
  const meta = pages[current - 1];
  const noteQ = useNote(meta?.id ?? "");
  const note = noteQ.data;

  function goTo(p: number) {
    if (p < 1 || p > total || p === current) return;
    router.replace(`/books/${id}/read?p=${p}`, { scroll: false });
  }

  // Ke atas setiap pindah halaman.
  useEffect(() => {
    topRef.current?.scrollIntoView({ block: "start" });
  }, [current]);

  // Muat halaman berikutnya lebih dulu supaya pindah halaman terasa instan.
  const nextId = pages[current]?.id;
  useEffect(() => {
    if (!nextId) return;
    qc.prefetchQuery({
      queryKey: ["note", nextId],
      queryFn: async () => (await api.get<{ note: Note }>(`/notes/${nextId}`)).data.note,
    });
  }, [nextId, qc]);

  // Panah kiri/kanan di keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.key === "ArrowRight") goTo(current + 1);
      if (e.key === "ArrowLeft") goTo(current - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (book.isLoading || (list.isLoading && !list.data)) return <BlockSpinner />;
  if (book.isError || !book.data) {
    return (
      <EmptyState
        icon={<BookOpen className="h-6 w-6" />}
        title="Buku tidak ditemukan"
        action={
          <Link href="/books" className="btn-primary">
            Kembali ke Buku
          </Link>
        }
      />
    );
  }
  if (list.error) {
    return <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{getErrorMessage(list.error)}</p>;
  }

  const b = book.data;

  return (
    <div ref={topRef} className="mx-auto max-w-3xl scroll-mt-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link href={`/books/${id}`} className="btn-ghost -ml-3 px-3 py-2">
          <ArrowLeft className="h-4 w-4" />
          <span className="max-w-[12rem] truncate">{b.title}</span>
        </Link>
        {meta && (
          <Link href={`/notes/${meta.id}`} className="btn-outline px-3 py-2">
            <Pencil className="h-4 w-4" /> Edit halaman ini
          </Link>
        )}
      </div>

      {total === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title="Buku ini masih kosong"
          hint="Belum ada halaman untuk dibaca."
          action={
            <Link href={`/books/${id}`} className="btn-primary">
              Ke buku
            </Link>
          }
        />
      ) : (
        <>
          {/* Lembar buku */}
          <article className="relative min-h-[60vh] rounded-2xl border border-pinksoft-200 bg-[#fffcfd] p-6 shadow-md sm:p-10">
            <span className="pointer-events-none absolute inset-y-0 left-0 w-1.5 rounded-l-2xl bg-gradient-to-b from-pinksoft-300 to-pinksoft-500" />

            <p className="text-xs font-semibold uppercase tracking-widest text-pinksoft-600">{b.title}</p>

            {noteQ.isLoading || !note ? (
              noteQ.isError ? (
                <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{getErrorMessage(noteQ.error)}</p>
              ) : (
                <BlockSpinner />
              )
            ) : (
              <>
                <h1 className="mt-2 font-serif text-3xl font-bold text-gray-900">{note.title}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-500">
                  <span>{formatDate(note.updated_at)}</span>
                  {note.labels.map((l) => (
                    <LabelChip key={l.id} name={l.name} />
                  ))}
                </div>

                <hr className="my-6 border-pinksoft-100" />

                {/* Konten sudah disanitasi di server (sama seperti halaman Explore). */}
                {note.content ? (
                  <div className="note-content font-serif text-[1.05rem]" dangerouslySetInnerHTML={{ __html: note.content }} />
                ) : (
                  <p className="text-sm italic text-gray-400">Halaman ini belum ada isinya.</p>
                )}

                <p className="mt-10 text-center font-serif text-sm text-pinksoft-600">— {current} —</p>
              </>
            )}
          </article>

          {/* Navigasi halaman: menempel di bawah layar */}
          <div className="sticky bottom-0 z-10 -mx-4 mt-4 border-t border-pinksoft-100 bg-slate-50/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <p className="mb-2 text-center text-xs text-gray-500">
              Halaman {current} dari {total}
            </p>
            <BookPager current={current} total={total} onChange={goTo} />
          </div>
        </>
      )}
    </div>
  );
}

export default function ReadBookPage() {
  return (
    <Suspense fallback={<BlockSpinner />}>
      <Reader />
    </Suspense>
  );
}
