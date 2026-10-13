"use client";

import { ArrowLeft, BookOpen, Check, Copy, FileX } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import LabelChip from "@/components/LabelChip";
import EmptyState from "@/components/ui/EmptyState";
import { BlockSpinner } from "@/components/ui/Spinner";
import { usePublicNote } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export default function PublicNotePage() {
  const { id } = useParams<{ id: string }>();
  const { data: note, isLoading, isError } = usePublicNote(id);
  const [copied, setCopied] = useState(false);

  if (isLoading) return <BlockSpinner />;
  if (isError || !note) {
    return (
      <EmptyState
        icon={<FileX className="h-6 w-6" />}
        title="Catatan tidak ditemukan"
        hint="Catatan ini sudah dihapus atau tidak lagi publik."
        action={
          <Link href="/explore" className="btn-primary">
            Kembali ke Explore
          </Link>
        }
      />
    );
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard tidak tersedia */
    }
  }

  return (
    <article className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link href="/explore" className="btn-ghost -ml-3 px-3 py-2">
          <ArrowLeft className="h-4 w-4" /> Explore
        </Link>
        <button type="button" onClick={copyLink} className="btn-outline px-3 py-2">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Tersalin" : "Salin tautan"}
        </button>
      </div>

      <div className="card p-5 sm:p-8">
        <h1 className="text-3xl font-bold text-gray-900">{note.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-500">
          <span className="font-medium text-coksu-800">@{note.author}</span>
          <span>·</span>
          <span>{formatDate(note.updated_at)}</span>
          <span className="inline-flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" /> {note.book.title}
          </span>
        </div>
        {note.labels.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {note.labels.map((l) => (
              <LabelChip key={l.id} name={l.name} />
            ))}
          </div>
        )}

        <hr className="my-6 border-coksu-100" />

        {/* Konten sudah disanitasi di server (script/event handler dibuang, iframe hanya host whitelist). */}
        <div className="note-content" dangerouslySetInnerHTML={{ __html: note.content ?? "" }} />
      </div>
    </article>
  );
}
