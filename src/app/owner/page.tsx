"use client";

import { BookOpen, FileText, Globe, Lock, MessageSquare, Tag, Trash2, UserCheck, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { ErrorBox, RoleBadge, StatCard, StatusBadge } from "@/components/owner/parts";
import PageHeader from "@/components/ui/PageHeader";
import { BlockSpinner } from "@/components/ui/Spinner";
import { getErrorMessage } from "@/lib/api";
import { useOwnerStats } from "@/lib/owner";
import { displayName } from "@/lib/profile";
import { formatDate } from "@/lib/utils";

export default function OwnerOverviewPage() {
  const { data, isLoading, error } = useOwnerStats();

  if (isLoading) return <BlockSpinner />;
  if (error || !data) return <ErrorBox message={getErrorMessage(error, "Gagal memuat ringkasan.")} />;

  const t = data.totals;
  const max = Math.max(1, ...data.signups.map((s) => s.count));

  return (
    <>
      <PageHeader title="Ringkasan" description="Kondisi website Lucibook saat ini." />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Users className="h-5 w-5" />} label="Total pengguna" value={t.users} hint={`${t.owners} owner`} />
        <StatCard icon={<UserPlus className="h-5 w-5" />} label="Pendaftar 7 hari" value={t.new_users_7d} hint={`${t.new_users_30d} dalam 30 hari`} />
        <StatCard icon={<UserCheck className="h-5 w-5" />} label="Aktif 7 hari" value={t.active_users_7d} hint="Login dalam 7 hari terakhir" />
        <StatCard icon={<Lock className="h-5 w-5" />} label="Ditangguhkan" value={t.suspended} />
        <StatCard icon={<BookOpen className="h-5 w-5" />} label="Buku" value={t.books} />
        <StatCard icon={<FileText className="h-5 w-5" />} label="Catatan" value={t.notes} />
        <StatCard icon={<Globe className="h-5 w-5" />} label="Catatan publik" value={t.notes_public} />
        <StatCard icon={<Trash2 className="h-5 w-5" />} label="Di Sampah" value={t.books_trashed + t.notes_trashed} hint={`${t.books_trashed} buku, ${t.notes_trashed} catatan`} />
        <StatCard icon={<Tag className="h-5 w-5" />} label="Label" value={t.labels} />
        <StatCard icon={<MessageSquare className="h-5 w-5" />} label="Sesi Lutin-AI" value={t.chat_sessions} hint={`${t.chat_messages.toLocaleString("id-ID")} pesan`} />
      </div>

      <section className="card mt-6 p-5">
        <h2 className="font-semibold text-gray-900">Pendaftar baru — 14 hari terakhir</h2>
        <div className="mt-4 flex h-40 items-end gap-1.5 sm:gap-2">
          {data.signups.map((s) => (
            <div key={s.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px] font-medium text-gray-500">{s.count > 0 ? s.count : ""}</span>
              <div
                className="w-full rounded-t-md bg-pinksoft-400"
                style={{ height: `${Math.max(s.count > 0 ? 6 : 2, (s.count / max) * 100)}%`, opacity: s.count > 0 ? 1 : 0.35 }}
                title={`${s.date}: ${s.count}`}
              />
              <span className="text-[10px] text-gray-400">{s.date.slice(8, 10)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Pengguna terbaru</h2>
            <Link href="/owner/users" className="text-sm font-medium text-pinksoft-700 hover:underline">
              Lihat semua
            </Link>
          </div>
          <ul className="divide-y divide-pinksoft-100">
            {data.recent_users.map((u) => (
              <li key={u.id}>
                <Link href={`/owner/users/${u.id}`} className="flex items-center gap-3 py-2.5 hover:opacity-80">
                  <Avatar user={u} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">{displayName(u)}</p>
                    <p className="truncate text-xs text-gray-400">
                      @{u.username} · {formatDate(u.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <RoleBadge role={u.role} />
                    {u.is_suspended && <StatusBadge suspended />}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-gray-900">Pengguna paling produktif</h2>
          {data.top_users.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada data.</p>
          ) : (
            <ul className="divide-y divide-pinksoft-100">
              {data.top_users.map((u, i) => (
                <li key={u.id}>
                  <Link href={`/owner/users/${u.id}`} className="flex items-center gap-3 py-2.5 hover:opacity-80">
                    <span className="w-5 text-center text-sm font-bold text-pinksoft-600">{i + 1}</span>
                    <Avatar user={u} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800">{displayName(u)}</p>
                      <p className="truncate text-xs text-gray-400">@{u.username}</p>
                    </div>
                    <p className="text-right text-xs text-gray-500">
                      <span className="font-semibold text-gray-800">{u.notes_count}</span> catatan
                      <br />
                      {u.books_count} buku
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
