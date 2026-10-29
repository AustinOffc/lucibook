"use client";

import { ArrowLeft, FileText, Globe, EyeOff, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import LabelChip from "@/components/LabelChip";
import { ErrorBox, Pill } from "@/components/owner/parts";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import { BlockSpinner } from "@/components/ui/Spinner";
import { getErrorMessage } from "@/lib/api";
import { useDeleteOwnerNote, useOwnerNote, useSetNotePublic } from "@/lib/owner";
import { formatDateTime } from "@/lib/utils";
import { useRouteId } from "@/lib/useRouteId";

export default function OwnerNoteDetailPage() {
  const id = useRouteId("/owner/notes/");
  const router = useRouter();
  const { data: note, isLoading, isError } = useOwnerNote(id);
  const setPublic = useSetNotePublic();
  const remove = useDeleteOwnerNote();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  if (isLoading) return <BlockSpinner />;
  if (isError || !note) {
    return (
      <EmptyState
        icon={<FileText className="h-6 w-6" />}
        title="Catatan tidak ditemukan"
        action={
          <Link href="/owner/notes" className="btn-primary">
            Kembali ke Catatan
          </Link>
        }
      />
    );
  }

  async function togglePublic() {
    if (!note) return;
    setError("");
    try {
      await setPublic.mutateAsync({ id: note.id, is_public: !note.is_public });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <article className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href={`/owner/books/${note.book.id}`} className="btn-ghost -ml-3 px-3 py-2">
          <ArrowLeft className="h-4 w-4" /> {note.book.title}
        </Link>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-outline" onClick={togglePublic} disabled={setPublic.isPending}>
            {note.is_public ? <EyeOff className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
            {note.is_public ? "Cabut status publik" : "Jadikan publik"}
          </button>
          <button type="button" className="btn-outline text-red-600 hover:bg-red-50" onClick={() => setDeleting(true)}>
            <Trash2 className="h-4 w-4" /> Hapus permanen
          </button>
        </div>
      </div>

      {error && <ErrorBox message={error} />}

      <div className="card p-5 sm:p-8">
        <h1 className="text-3xl font-bold text-gray-900">{note.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-500">
          <Link href={`/owner/users/${note.author.id}`} className="font-medium text-pinksoft-800 hover:underline">
            @{note.author.username}
          </Link>
          <span>·</span>
          <span>Diubah {formatDateTime(note.updated_at)}</span>
          {note.is_public && !note.in_trash && <Pill tone="green">Publik</Pill>}
          {note.in_trash && <Pill tone="red">Di Sampah</Pill>}
        </div>
        {note.labels.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {note.labels.map((l) => (
              <LabelChip key={l.id} name={l.name} />
            ))}
          </div>
        )}

        <hr className="my-6 border-pinksoft-100" />

        {/* Konten sudah disanitasi di server saat disimpan (script/event handler dibuang, iframe hanya host whitelist). */}
        <div className="note-content" dangerouslySetInnerHTML={{ __html: note.content }} />
      </div>

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Hapus catatan permanen?"
        message={`Catatan "${note.title}" milik @${note.author.username} akan dihapus selamanya (tidak lewat Sampah).`}
        confirmText="Hapus permanen"
        onConfirm={async () => {
          await remove.mutateAsync(note.id);
          router.replace(`/owner/books/${note.book.id}`);
        }}
      />
    </article>
  );
}
