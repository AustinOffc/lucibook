"use client";

import { FileX } from "lucide-react";
import Link from "next/link";
import NoteEditor from "@/components/NoteEditor";
import EmptyState from "@/components/ui/EmptyState";
import { BlockSpinner } from "@/components/ui/Spinner";
import { isLocalError } from "@/lib/offline/errors";
import { useNote } from "@/lib/queries";
import { useRouteId } from "@/lib/useRouteId";

export default function NotePage() {
  const id = useRouteId("/notes/");
  const { data: note, isLoading, isError, error } = useNote(id);

  if (isLoading) return <BlockSpinner />;
  if (isError || !note) {
    return (
      <EmptyState
        icon={<FileX className="h-6 w-6" />}
        title="Catatan tidak ditemukan"
        hint={
          isLocalError(error) && error.status === 503
            ? error.message
            : "Mungkin sudah dihapus atau bukan milikmu."
        }
        action={
          <Link href="/dashboard" className="btn-primary">
            Ke dashboard
          </Link>
        }
      />
    );
  }

  // key = id di URL (bukan note.id): id sementara berganti jadi id server setelah sinkron,
  // dan editor tidak boleh dibuat ulang saat itu terjadi.
  return <NoteEditor key={id} note={note} />;
}
