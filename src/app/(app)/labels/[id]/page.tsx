"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import NotesGrid from "@/components/NotesGrid";
import PageHeader from "@/components/ui/PageHeader";
import { getErrorMessage } from "@/lib/api";
import { useLabels, useNotes } from "@/lib/queries";
import { useSearch } from "@/lib/search";
import { useRouteId } from "@/lib/useRouteId";

export default function LabelDetailPage() {
  const id = useRouteId("/labels/");
  const { debouncedQ } = useSearch();
  const { data: labels } = useLabels();
  const notes = useNotes({ label_id: id, q: debouncedQ });
  const label = labels?.find((l) => l.id === id);

  return (
    <>
      <Link href="/labels" className="btn-ghost -ml-3 mb-2 px-3 py-2">
        <ArrowLeft className="h-4 w-4" /> Semua label
      </Link>
      <PageHeader title={label ? `# ${label.name}` : "Label"} description={debouncedQ ? `Hasil untuk “${debouncedQ}”` : undefined} />
      <NotesGrid
        notes={notes.data}
        loading={notes.isLoading}
        dimmed={notes.isPlaceholderData}
        error={notes.error ? getErrorMessage(notes.error) : undefined}
        emptyTitle="Belum ada catatan dengan label ini"
        emptyHint="Buka sebuah catatan, lalu pasang label ini dari editor."
      />
    </>
  );
}
