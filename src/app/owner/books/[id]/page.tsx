"use client";

import { ArrowLeft, BookOpen, FileText, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Avatar from "@/components/Avatar";
import { Pill } from "@/components/owner/parts";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import { BlockSpinner } from "@/components/ui/Spinner";
import { useDeleteOwnerBook, useOwnerBook } from "@/lib/owner";
import { displayName } from "@/lib/profile";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useRouteId } from "@/lib/useRouteId";

export default function OwnerBookPage() {
  const id = useRouteId("/owner/books/");
  const router = useRouter();
  const { data: book, isLoading, isError } = useOwnerBook(id);
  const remove = useDeleteOwnerBook();
  const [deleting, setDeleting] = useState(false);

  if (isLoading) return <BlockSpinner />;
  if (isError || !book) {
    return (
      <EmptyState
        icon={<BookOpen className="h-6 w-6" />}
        title="Buku tidak ditemukan"
        action={
          <Link href="/owner/users" className="btn-primary">
            Kembali ke Pengguna
          </Link>
        }
      />
    );
  }

  const active = book.pages.filter((p) => !p.deleted_at).length;

  return (
    <>
      <Link href={`/owner/users/${book.owner.id}`} className="btn-ghost -ml-3 mb-2 px-3 py-2">
        <ArrowLeft className="h-4 w-4" /> @{book.owner.username}
      </Link>

      <div className="card mb-6 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold text-gray-900">{book.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <Avatar user={book.owner} className="h-6 w-6 text-xs" />
              <Link href={`/owner/users/${book.owner.id}`} className="font-medium text-pinksoft-800 hover:underline">
                {displayName(book.owner)}
              </Link>
              <span>·</span>
              <span>Dibuat {formatDate(book.created_at)}</span>
              <span>·</span>
              <span>{active} halaman aktif</span>
              {book.deleted_at && <Pill tone="red">Di Sampah sejak {formatDate(book.deleted_at)}</Pill>}
            </div>
          </div>
          <button type="button" className="btn-outline text-red-600 hover:bg-red-50" onClick={() => setDeleting(true)}>
            <Trash2 className="h-4 w-4" /> Hapus permanen
          </button>
        </div>
      </div>

      <h2 className="mb-3 font-semibold text-gray-900">Halaman ({book.pages.length})</h2>
      {book.pages.length === 0 ? (
        <EmptyState icon={<FileText className="h-6 w-6" />} title="Buku ini kosong" />
      ) : (
        <div className="space-y-3">
          {book.pages.map((p) => (
            <Link key={p.id} href={`/owner/notes/${p.id}`} className="card block p-4 transition hover:border-pinksoft-300">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="min-w-0 truncate font-medium text-gray-900">{p.title}</h3>
                {p.is_public && <Pill tone="green">Publik</Pill>}
                {p.deleted_at && <Pill tone="red">Di Sampah</Pill>}
              </div>
              {p.excerpt && <p className="mt-1 line-clamp-2 text-sm text-gray-500">{p.excerpt}</p>}
              <p className="mt-1.5 text-xs text-gray-400">Diubah {formatDateTime(p.updated_at)}</p>
            </Link>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Hapus buku permanen?"
        message={`Buku "${book.title}" milik @${book.owner.username} beserta ${book.pages.length} halamannya akan dihapus selamanya (tidak lewat Sampah).`}
        confirmText="Hapus permanen"
        onConfirm={async () => {
          await remove.mutateAsync(book.id);
          router.replace(`/owner/users/${book.owner.id}`);
        }}
      />
    </>
  );
}
