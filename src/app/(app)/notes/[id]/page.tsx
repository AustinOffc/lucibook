"use client";

import { FileX } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import NoteEditor from "@/components/NoteEditor";
import EmptyState from "@/components/ui/EmptyState";
import { BlockSpinner } from "@/components/ui/Spinner";
import { useNote } from "@/lib/queries";

export default function NotePage() {
  const { id } = useParams<{ id: string }>();
  const { data: note, isLoading, isError } = useNote(id);

  if (isLoading) return <BlockSpinner />;
  if (isError || !note) {
    return (
      <EmptyState
        icon={<FileX className="h-6 w-6" />}
        title="Catatan tidak ditemukan"
        hint="Mungkin sudah dihapus atau bukan milikmu."
        action={
          <Link href="/dashboard" className="btn-primary">
            Ke dashboard
          </Link>
        }
      />
    );
  }

  // key: pastikan state editor di-reset bila pindah ke catatan lain.
  return <NoteEditor key={note.id} note={note} />;
}
