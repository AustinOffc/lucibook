"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { clearDroppedOps, getDroppedOps, syncNow } from "@/lib/offline/sync";
import { useSyncStatus } from "@/lib/offline/useSyncStatus";
import type { DroppedOp } from "@/lib/offline/types";

const TYPE_LABEL: Record<string, string> = {
  "book.create": "Buat buku",
  "book.update": "Ubah nama buku",
  "book.favorite": "Favorit buku",
  "book.delete": "Hapus buku",
  "note.create": "Buat catatan",
  "note.update": "Ubah catatan",
  "note.favorite": "Favorit catatan",
  "note.public": "Publik/privat catatan",
  "note.labels": "Label catatan",
  "note.delete": "Hapus catatan",
  "label.create": "Buat label",
  "label.update": "Ubah label",
  "label.delete": "Hapus label",
  "trash.restoreBook": "Pulihkan buku",
  "trash.restoreNote": "Pulihkan catatan",
  "trash.purgeBook": "Hapus permanen buku",
  "trash.purgeNote": "Hapus permanen catatan",
  "trash.empty": "Kosongkan Sampah",
};

export default function SyncPanel() {
  const s = useSyncStatus();
  const [dropped, setDropped] = useState<DroppedOp[]>([]);

  useEffect(() => {
    getDroppedOps()
      .then(setDropped)
      .catch(() => setDropped([]));
  }, [s.dropped]);

  const state = !s.online ? "Offline" : s.syncing ? "Menyinkronkan…" : s.pending > 0 ? "Menunggu dikirim" : "Semua tersimpan";

  return (
    <section className="card p-5">
      <h2 className="mb-3 font-semibold text-gray-900">Sinkronisasi &amp; offline</h2>
      <p className="mb-3 text-sm text-gray-600">
        Catatanmu disimpan di perangkat ini, jadi tetap bisa dibuka dan ditulis tanpa internet. Perubahan dikirim otomatis saat kamu online lagi.
      </p>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-gray-500">Status</dt>
          <dd className="font-medium text-gray-900">{state}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-gray-500">Perubahan menunggu</dt>
          <dd className="font-medium text-gray-900">{s.pending}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-gray-500">Terakhir sinkron</dt>
          <dd className="font-medium text-gray-900">{s.lastSyncAt ? new Date(s.lastSyncAt).toLocaleString("id-ID") : "-"}</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={() => void syncNow({ pull: true })}
        disabled={!s.online || s.syncing}
        className="btn-outline mt-4"
      >
        <RefreshCw className={s.syncing ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Sinkronkan sekarang
      </button>

      {dropped.length > 0 && (
        <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <p className="font-medium">Beberapa perubahan ditolak server:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {dropped.map((d, i) => (
              <li key={i}>
                {TYPE_LABEL[d.type] ?? d.type}: {d.message}
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => void clearDroppedOps().then(() => setDropped([]))} className="mt-2 text-xs font-semibold underline">
            Tutup pemberitahuan
          </button>
        </div>
      )}
    </section>
  );
}
