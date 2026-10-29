"use client";

import { ArrowLeft, BookOpen, Crown, FileText, KeyRound, Lock, MessageSquare, Pencil, Trash2, Unlock, UserX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import { ErrorBox, Pagination, Pill, RoleBadge, StatusBadge } from "@/components/owner/parts";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import NameModal from "@/components/ui/NameModal";
import { BlockSpinner } from "@/components/ui/Spinner";
import { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useDeleteUser, useOwnerUser, useOwnerUserChats, useResetPassword, useUpdateUser } from "@/lib/owner";
import { displayName } from "@/lib/profile";
import { formatDate, formatDateTime, timeAgo } from "@/lib/utils";
import { useRouteId } from "@/lib/useRouteId";

export default function OwnerUserDetailPage() {
  const id = useRouteId("/owner/users/");
  const router = useRouter();
  const { user: me } = useAuth();
  const { data, isLoading, isError } = useOwnerUser(id);
  const update = useUpdateUser();
  const resetPw = useResetPassword();
  const remove = useDeleteUser();

  const [editName, setEditName] = useState(false);
  const [confirm, setConfirm] = useState<null | "suspend" | "activate" | "promote" | "demote" | "delete">(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [chatPage, setChatPage] = useState(1);
  const chats = useOwnerUserChats(id, chatPage);

  if (isLoading) return <BlockSpinner />;
  if (isError || !data) {
    return (
      <EmptyState
        icon={<UserX className="h-6 w-6" />}
        title="Pengguna tidak ditemukan"
        action={
          <Link href="/owner/users" className="btn-primary">
            Kembali ke Pengguna
          </Link>
        }
      />
    );
  }

  const u = data.user;
  const isSelf = me?.id === u.id;
  const isOwner = u.role === "OWNER";

  return (
    <>
      <Link href="/owner/users" className="btn-ghost -ml-3 mb-2 px-3 py-2">
        <ArrowLeft className="h-4 w-4" /> Semua pengguna
      </Link>

      {notice && <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}

      <div className="card p-5">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar user={u} className="h-16 w-16 text-2xl" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold text-gray-900">{displayName(u)}</h1>
            <p className="text-sm text-gray-500">@{u.username}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <RoleBadge role={u.role} />
              <StatusBadge suspended={u.is_suspended} />
              {isSelf && <Pill tone="pink">Ini akunmu</Pill>}
            </div>
          </div>
        </div>

        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Terdaftar" value={formatDateTime(u.created_at)} />
          <Info label="Login terakhir" value={u.last_login_at ? formatDateTime(u.last_login_at) : "Belum pernah"} />
          <Info label="Buku aktif" value={u.books_count} />
          <Info label="Catatan aktif" value={u.notes_count} />
          <Info label="Catatan publik" value={u.public_notes_count} />
          <Info label="Catatan di Sampah" value={u.trashed_notes_count} />
          <Info label="Label" value={u.labels_count} />
          <Info label="Sesi Lutin-AI" value={u.chats_count} />
        </dl>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-pinksoft-100 pt-4">
          <button type="button" className="btn-outline" onClick={() => setEditName(true)}>
            <Pencil className="h-4 w-4" /> Ubah nama
          </button>
          {!isSelf && (
            <>
              {!isOwner && (
                <button type="button" className="btn-outline" onClick={() => setResetOpen(true)}>
                  <KeyRound className="h-4 w-4" /> Reset password
                </button>
              )}
              <button type="button" className="btn-outline" onClick={() => setConfirm(isOwner ? "demote" : "promote")}>
                <Crown className="h-4 w-4" /> {isOwner ? "Jadikan User biasa" : "Jadikan Owner"}
              </button>
              {!isOwner && (
                <button type="button" className="btn-outline" onClick={() => setConfirm(u.is_suspended ? "activate" : "suspend")}>
                  {u.is_suspended ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  {u.is_suspended ? "Aktifkan akun" : "Tangguhkan akun"}
                </button>
              )}
              {!isOwner && (
                <button type="button" className="btn-outline text-red-600 hover:bg-red-50" onClick={() => setConfirm("delete")}>
                  <Trash2 className="h-4 w-4" /> Hapus akun
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Project pengguna ({data.books.length} buku)</h2>
          <Link href={`/owner/notes?user=${u.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-pinksoft-700 hover:underline">
            <FileText className="h-4 w-4" /> Lihat semua catatannya
          </Link>
        </div>
        {data.books.length === 0 ? (
          <EmptyState icon={<BookOpen className="h-6 w-6" />} title="Belum ada buku" hint="Pengguna ini belum membuat project apa pun." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.books.map((b) => (
              <Link key={b.id} href={`/owner/books/${b.id}`} className="card flex items-start gap-3 p-4 transition hover:border-pinksoft-300">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pinksoft-100 text-pinksoft-700">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">{b.title}</p>
                  <p className="text-xs text-gray-500">
                    {b.pages_count} halaman · {formatDate(b.created_at)}
                  </p>
                  {b.deleted_at && (
                    <span className="mt-1 inline-block">
                      <Pill tone="red">Di Sampah</Pill>
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-semibold text-gray-900">Riwayat chat Lutin-AI ({u.chats_count} sesi)</h2>
        {!chats.data || chats.data.sessions.length === 0 ? (
          <EmptyState icon={<MessageSquare className="h-6 w-6" />} title="Belum ada chat" hint="Pengguna ini belum memakai Lutin-AI." />
        ) : (
          <>
            <div className="space-y-2">
              {chats.data.sessions.map((c) => (
                <Link key={c.id} href={`/owner/chats/${c.id}`} className="card flex items-center gap-3 p-4 transition hover:border-pinksoft-300">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-pinksoft-100 text-pinksoft-700">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">{c.title}</p>
                    <p className="text-xs text-gray-500">
                      {c.messages_count} pesan · {timeAgo(c.updated_at)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
            <Pagination page={chats.data.page} pages={chats.data.pages} total={chats.data.total} onChange={setChatPage} />
          </>
        )}
      </section>

      <NameModal
        open={editName}
        onClose={() => setEditName(false)}
        title="Ubah nama tampilan"
        label="Nama"
        initial={u.name ?? ""}
        onSubmit={(name) => update.mutateAsync({ id: u.id, name })}
      />

      <ConfirmDialog
        open={confirm === "suspend"}
        onClose={() => setConfirm(null)}
        title="Tangguhkan akun?"
        message={`@${u.username} langsung keluar dari semua perangkat dan tidak bisa login sampai akunnya diaktifkan lagi. Datanya tetap tersimpan.`}
        confirmText="Tangguhkan"
        onConfirm={() => update.mutateAsync({ id: u.id, is_suspended: true })}
      />
      <ConfirmDialog
        open={confirm === "activate"}
        onClose={() => setConfirm(null)}
        title="Aktifkan akun?"
        message={`@${u.username} bisa login kembali.`}
        confirmText="Aktifkan"
        onConfirm={() => update.mutateAsync({ id: u.id, is_suspended: false })}
      />
      <ConfirmDialog
        open={confirm === "promote"}
        onClose={() => setConfirm(null)}
        title="Jadikan Owner?"
        message={`@${u.username} akan punya akses penuh ke panel owner: bisa melihat semua data pengguna, menghapus akun, dan mengubah konten. Lakukan hanya untuk orang yang kamu percaya.`}
        confirmText="Jadikan Owner"
        onConfirm={() => update.mutateAsync({ id: u.id, role: "OWNER" })}
      />
      <ConfirmDialog
        open={confirm === "demote"}
        onClose={() => setConfirm(null)}
        title="Jadikan User biasa?"
        message={`@${u.username} kehilangan akses ke panel owner.`}
        confirmText="Turunkan"
        onConfirm={() => update.mutateAsync({ id: u.id, role: "USER" })}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onClose={() => setConfirm(null)}
        title="Hapus akun permanen?"
        message={`Akun @${u.username} beserta ${u.books_count} buku, ${u.notes_count} catatan, label, dan riwayat Lutin-AI-nya akan dihapus selamanya dan tidak bisa dipulihkan.`}
        confirmText="Hapus permanen"
        onConfirm={async () => {
          await remove.mutateAsync(u.id);
          router.replace("/owner/users");
        }}
      />

      <ResetPasswordModal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        username={u.username}
        onSubmit={async (pw) => {
          await resetPw.mutateAsync({ id: u.id, new_password: pw });
          setNotice(`Password @${u.username} berhasil direset. Semua sesi lamanya sudah keluar.`);
        }}
      />
    </>
  );
}

function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-pinksoft-50 px-3 py-2.5">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 font-semibold text-gray-900">{typeof value === "number" ? value.toLocaleString("id-ID") : value}</dd>
    </div>
  );
}

function ResetPasswordModal({
  open,
  onClose,
  username,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  username: string;
  onSubmit: (password: string) => Promise<unknown>;
}) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setPw("");
      setError("");
    }
  }, [open]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSubmit(pw);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Reset password @${username}`}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Password baru</label>
          <input className="input" type="text" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="off" required />
          <p className="mt-1 text-xs text-gray-400">Minimal 8 karakter, kombinasi huruf dan angka. Sampaikan ke pengguna secara pribadi.</p>
        </div>
        {error && <ErrorBox message={error} />}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-outline" onClick={onClose} disabled={busy}>
            Batal
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Menyimpan…" : "Reset password"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
