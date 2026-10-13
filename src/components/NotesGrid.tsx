import { FileText } from "lucide-react";
import { ReactNode } from "react";
import type { Note } from "@/lib/types";
import { cn } from "@/lib/utils";
import EmptyState from "./ui/EmptyState";
import { BlockSpinner } from "./ui/Spinner";
import NoteCard from "./NoteCard";

export default function NotesGrid({
  notes,
  loading,
  error,
  dimmed,
  emptyTitle,
  emptyHint,
  emptyAction,
  publicMode = false,
}: {
  notes?: Note[];
  loading: boolean;
  error?: string;
  dimmed?: boolean;
  emptyTitle: string;
  emptyHint?: string;
  emptyAction?: ReactNode;
  publicMode?: boolean;
}) {
  if (loading && !notes) return <BlockSpinner />;
  if (error) return <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>;
  if (!notes || notes.length === 0) {
    return <EmptyState icon={<FileText className="h-6 w-6" />} title={emptyTitle} hint={emptyHint} action={emptyAction} />;
  }

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", dimmed && "opacity-60 transition-opacity")}>
      {notes.map((n) => (
        <NoteCard key={n.id} note={n} publicMode={publicMode} href={publicMode ? `/explore/${n.id}` : `/notes/${n.id}`} />
      ))}
    </div>
  );
}
