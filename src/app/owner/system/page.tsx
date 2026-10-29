"use client";

import { CheckCircle2, Cpu, Database, Sparkles, Trash2, XCircle } from "lucide-react";
import { ReactNode, useState } from "react";
import { ErrorBox, StatCard } from "@/components/owner/parts";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import PageHeader from "@/components/ui/PageHeader";
import { BlockSpinner } from "@/components/ui/Spinner";
import { getErrorMessage } from "@/lib/api";
import { useOwnerSystem, usePurgeTrash } from "@/lib/owner";
import { formatUptime } from "@/lib/utils";

export default function OwnerSystemPage() {
  const { data, isLoading, error } = useOwnerSystem();
  const purge = usePurgeTrash();
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState("");

  if (isLoading) return <BlockSpinner />;
  if (error || !data) return <ErrorBox message={getErrorMessage(error, "Gagal memuat info sistem.")} />;

  const expired = data.trash.expired_books + data.trash.expired_notes;

  return (
    <>
      <PageHeader title="Sistem" description="Status server dan pemeliharaan." />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Database className="h-5 w-5" />}
          label="Database"
          value={data.db.ok ? "Terhubung" : "Bermasalah"}
          hint={`${data.db.latency_ms} ms`}
        />
        <StatCard icon={<Cpu className="h-5 w-5" />} label="Uptime server" value={formatUptime(data.uptime_seconds)} hint={`Node ${data.node}`} />
        <StatCard icon={<Cpu className="h-5 w-5" />} label="Memori proses" value={`${data.memory_mb} MB`} hint={`Total host ${data.host_memory_total_mb} MB`} />
        <StatCard
          icon={<Sparkles className="h-5 w-5" />}
          label="Lutin-AI"
          value={data.lutin_ai_configured ? "API key terpasang" : "API key kosong"}
        />
      </div>

      <section className="card mt-6 p-5">
        <h2 className="mb-3 font-semibold text-gray-900">Konfigurasi</h2>
        <dl className="space-y-2 text-sm">
          <Row label="Aplikasi" value={data.app} />
          <Row label="Environment" value={data.environment} />
          <Row
            label="CORS origins"
            value={
              data.cors_origins.length ? (
                <span className="flex flex-col items-end gap-0.5">
                  {data.cors_origins.map((o) => (
                    <span key={o} className="break-all">
                      {o}
                    </span>
                  ))}
                </span>
              ) : (
                "—"
              )
            }
          />
          <Row
            label="Status database"
            value={
              data.db.ok ? (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> OK
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-red-700">
                  <XCircle className="h-4 w-4" /> Gagal
                </span>
              )
            }
          />
        </dl>
      </section>

      <section className="card mt-6 p-5">
        <h2 className="font-semibold text-gray-900">Sampah kedaluwarsa</h2>
        <p className="mt-1 text-sm text-gray-500">
          Item di Sampah dihapus otomatis setelah {data.trash.retention_days} hari (dicek tiap 6 jam). Saat ini ada{" "}
          <span className="font-semibold text-gray-800">{data.trash.expired_books}</span> buku dan{" "}
          <span className="font-semibold text-gray-800">{data.trash.expired_notes}</span> catatan yang sudah lewat masa simpan.
        </p>
        {result && <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{result}</p>}
        <button type="button" className="btn-outline mt-4" onClick={() => setConfirm(true)} disabled={expired === 0}>
          <Trash2 className="h-4 w-4" /> Bersihkan sekarang
        </button>
      </section>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Bersihkan sampah kedaluwarsa?"
        message="Semua buku dan catatan yang sudah lewat masa simpan akan dihapus permanen dari seluruh pengguna."
        confirmText="Bersihkan"
        onConfirm={async () => {
          const r = await purge.mutateAsync();
          setResult(`Selesai: ${r.purged_books} buku dan ${r.purged_notes} catatan dihapus permanen.`);
        }}
      />
    </>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-pinksoft-100 pb-2 last:border-0 last:pb-0">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-800">{value}</dd>
    </div>
  );
}
