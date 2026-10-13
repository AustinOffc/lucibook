"use client";

import { BookOpen, FileText, RotateCcw, Trash2 } from "lucide-react";
import { ReactNode, useState } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { BlockSpinner } from "@/components/ui/Spinner";
import { getErrorMessage } from "@/lib/api";
import {
  useEmptyTrash,
  usePurgeBook,
  usePurgeNote,
  useRestoreBook,
  useRestoreNote,
  useTrash,
} from "@/lib/queries";
import { daysLeft, formatDate } from "@/lib/utils";

type Target = { kind: "book" | "note"; id: string; title: string };

function Row({
  icon,
  title,
  meta,
  expires,
  onRestore,
  onPurge,
  busy,
}: {
  icon: ReactNode;
  title: string;
  meta: string;
  expires: string;
  onRestore: () => void;
  onPurge: () => void;
  busy: boolean;
}) {
  const left = daysLeft(expires);
  return (
    <li className="card flex flex-wrap items-center gap-3 p-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-coksu-100 text-coksu-700">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-gray-900">{title}</p>
        <p className="truncate text-xs text-gray-500">{meta}</p>
        <p className={left <= 3 ? "text-xs font-medium text-red-600" : "text-xs text-gray-400"}>
          {left === 0 ? "Dihapus permanen hari ini" : `Dihapus permanen dalam ${left} hari`}
        </p>
      </div>
      <div className="flex gap-1">
        <button type="button" onClick={onRestore} disabled={busy} className="btn-outline px-3 py-2 text-xs">
          <RotateCcw className="h-3.5 w-3.5" /> Pulihkan
        </button>
        <button type="button" onClick={onPurge} disabled={busy} className="btn-ghost px-3 py-2 text-xs text-red-600 hover:bg-red-50">
          <Trash2 className="h-3.5 w-3.5" /> Hapus
        </button>
      </div>
    </li>
  );
}

export default function TrashPage() {
  const { data, isLoading, error } = useTrash();
  const restoreBook = useRestoreBook();
  const restoreNote = useRestoreNote();
  const purgeBook = usePurgeBook();
  const purgeNote = usePurgeNote();
  const emptyTrash = useEmptyTrash();
  const [purging, setPurging] = useState<Target | null>(null);
  const [emptying, setEmptying] = useState(false);
  const [actionError, setActionError] = useState("");

  const books = data?.books ?? [];
  const notes = data?.notes ?? [];
  const total = books.length + notes.length;
  const busy =
    restoreBook.isPending || restoreNote.isPending || purgeBook.isPending || purgeNote.isPending || emptyTrash.isPending;

  async function restore(kind: Target["kind"], id: string) {
    setActionError("");
    try {
      await (kind === "book" ? restoreBook : restoreNote).mutateAsync(id);
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title="Sampah"
        description="Buku dan catatan yang dihapus ada di sini selama 30 hari, lalu hilang permanen."
        actions={
          total > 0 && (
            <button type="button" className="btn-outline text-red-600" onClick={() => setEmptying(true)} disabled={busy}>
              <Trash2 className="h-4 w-4" /> Kosongkan sampah
            </button>
          )
        }
      />

      {actionError && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</p>}

      {isLoading ? (
        <BlockSpinner />
      ) : error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{getErrorMessage(error)}</p>
      ) : total === 0 ? (
        <EmptyState
          icon={<Trash2 className="h-6 w-6" />}
          title="Sampah kosong"
          hint="Buku atau catatan yang kamu hapus akan muncul di sini dan bisa dipulihkan dalam 30 hari."
        />
      ) : (
        <div className="space-y-6">
          {books.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Buku ({books.length})</h2>
              <ul className="space-y-2">
                {books.map((b) => (
                  <Row
                    key={b.id}
                    icon={<BookOpen className="h-5 w-5" />}
                    title={b.title}
                    meta={`${b.page_count} halaman · dihapus ${formatDate(b.deleted_at)}`}
                    expires={b.expires_at}
                    busy={busy}
                    onRestore={() => restore("book", b.id)}
                    onPurge={() => setPurging({ kind: "book", id: b.id, title: b.title })}
                  />
                ))}
              </ul>
            </section>
          )}

          {notes.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Catatan ({notes.length})</h2>
              <ul className="space-y-2">
                {notes.map((n) => (
                  <Row
                    key={n.id}
                    icon={<FileText className="h-5 w-5" />}
                    title={n.title}
                    meta={`Dari buku “${n.book.title}” · dihapus ${formatDate(n.deleted_at)}`}
                    expires={n.expires_at}
                    busy={busy}
                    onRestore={() => restore("note", n.id)}
                    onPurge={() => setPurging({ kind: "note", id: n.id, title: n.title })}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!purging}
        onClose={() => setPurging(null)}
        title="Hapus permanen?"
        message={`"${purging?.title}" akan dihapus selamanya dan tidak bisa dipulihkan.${
          purging?.kind === "book" ? " Semua halaman di dalamnya ikut terhapus." : ""
        }`}
        confirmText="Hapus permanen"
        onConfirm={() => (purging!.kind === "book" ? purgeBook : purgeNote).mutateAsync(purging!.id)}
      />
      <ConfirmDialog
        open={emptying}
        onClose={() => setEmptying(false)}
        title="Kosongkan sampah?"
        message={`${books.length} buku dan ${notes.length} catatan akan dihapus selamanya dan tidak bisa dipulihkan.`}
        confirmText="Kosongkan"
        onConfirm={() => emptyTrash.mutateAsync()}
      />
    </>
  );
}
