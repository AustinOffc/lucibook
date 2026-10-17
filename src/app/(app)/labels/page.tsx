"use client";

import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import NameModal from "@/components/ui/NameModal";
import PageHeader from "@/components/ui/PageHeader";
import { BlockSpinner } from "@/components/ui/Spinner";
import { useCreateLabel, useDeleteLabel, useLabels, useUpdateLabel } from "@/lib/queries";
import type { Label } from "@/lib/types";

export default function LabelsPage() {
  const { data: labels, isLoading } = useLabels();
  const createLabel = useCreateLabel();
  const updateLabel = useUpdateLabel();
  const deleteLabel = useDeleteLabel();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Label | null>(null);
  const [deleting, setDeleting] = useState<Label | null>(null);

  const newButton = (
    <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
      <Plus className="h-4 w-4" /> Label baru
    </button>
  );

  return (
    <>
      <PageHeader title="Label" description="Kelompokkan catatan lintas buku. Pasang label dari halaman editor." actions={newButton} />

      {isLoading ? (
        <BlockSpinner />
      ) : !labels || labels.length === 0 ? (
        <EmptyState icon={<Tag className="h-6 w-6" />} title="Belum ada label" hint="Buat label seperti “penting”, “ide”, atau “belajar”." action={newButton} />
      ) : (
        <ul className="card divide-y divide-pinksoft-100">
          {labels.map((l) => (
            <li key={l.id} className="flex items-center gap-3 px-4 py-3">
              <Link href={`/labels/${l.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-pinksoft-100 text-pinksoft-700">
                  <Tag className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-gray-900">{l.name}</span>
                  <span className="block text-xs text-gray-500">{l._count?.notes ?? 0} catatan</span>
                </span>
              </Link>
              <button type="button" onClick={() => setEditing(l)} className="btn-ghost p-2" aria-label={`Ubah ${l.name}`}>
                <Pencil className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setDeleting(l)} className="btn-ghost p-2 text-red-600 hover:bg-red-50" aria-label={`Hapus ${l.name}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <NameModal
        open={creating}
        onClose={() => setCreating(false)}
        title="Label baru"
        label="Nama label"
        submitText="Buat"
        onSubmit={(name) => createLabel.mutateAsync(name)}
      />
      <NameModal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Ubah nama label"
        label="Nama label"
        initial={editing?.name}
        onSubmit={(name) => updateLabel.mutateAsync({ id: editing!.id, name })}
      />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Hapus label?"
        message={`Label "${deleting?.name}" akan dilepas dari semua catatan. Catatannya sendiri tidak dihapus.`}
        onConfirm={() => deleteLabel.mutateAsync(deleting!.id)}
      />
    </>
  );
}
