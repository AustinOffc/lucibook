"use client";

import { Plus, Search, UserX } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import { ErrorBox, Pagination, RoleBadge, StatusBadge } from "@/components/owner/parts";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import { BlockSpinner } from "@/components/ui/Spinner";
import { getErrorMessage } from "@/lib/api";
import { Role, UserFilters, useCreateUser, useDebounced, useOwnerUsers } from "@/lib/owner";
import { displayName } from "@/lib/profile";
import { cn, formatDate, timeAgo } from "@/lib/utils";

export default function OwnerUsersPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<UserFilters["role"]>("");
  const [status, setStatus] = useState<UserFilters["status"]>("");
  const [sort, setSort] = useState<UserFilters["sort"]>("newest");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const dq = useDebounced(q.trim());

  useEffect(() => {
    setPage(1);
  }, [dq, role, status, sort]);

  const { data, isLoading, isPlaceholderData, error } = useOwnerUsers({ q: dq, role, status, sort, page });

  return (
    <>
      <PageHeader
        title="Pengguna"
        description="Kelola semua akun yang terdaftar di Lucibook."
        actions={
          <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Tambah akun
          </button>
        }
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Cari username atau nama…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input" value={role} onChange={(e) => setRole(e.target.value as UserFilters["role"])} aria-label="Filter role">
          <option value="">Semua role</option>
          <option value="USER">User</option>
          <option value="OWNER">Owner</option>
        </select>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value as UserFilters["status"])} aria-label="Filter status">
          <option value="">Semua status</option>
          <option value="active">Aktif</option>
          <option value="suspended">Ditangguhkan</option>
        </select>
        <select className="input" value={sort} onChange={(e) => setSort(e.target.value as UserFilters["sort"])} aria-label="Urutkan">
          <option value="newest">Terbaru</option>
          <option value="oldest">Terlama</option>
          <option value="last_login">Login terakhir</option>
          <option value="username">Username A–Z</option>
        </select>
      </div>

      {error && <ErrorBox message={getErrorMessage(error)} />}

      {isLoading ? (
        <BlockSpinner />
      ) : data && data.users.length === 0 ? (
        <EmptyState icon={<UserX className="h-6 w-6" />} title="Tidak ada pengguna" hint="Coba ubah kata kunci atau filter." />
      ) : data ? (
        <>
          <div className={cn("card overflow-x-auto", isPlaceholderData && "opacity-60")}>
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-pinksoft-100 text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Pengguna</th>
                  <th className="px-3 py-3 font-semibold">Role</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 text-right font-semibold">Buku</th>
                  <th className="px-3 py-3 text-right font-semibold">Catatan</th>
                  <th className="px-3 py-3 font-semibold">Terdaftar</th>
                  <th className="px-4 py-3 font-semibold">Login terakhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pinksoft-100">
                {data.users.map((u) => (
                  <tr key={u.id} className="hover:bg-pinksoft-50/60">
                    <td className="px-4 py-3">
                      <Link href={`/owner/users/${u.id}`} className="flex items-center gap-3">
                        <Avatar user={u} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-gray-800">{displayName(u)}</span>
                          <span className="block truncate text-xs text-gray-400">@{u.username}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge suspended={u.is_suspended} />
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{u.books_count}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{u.notes_count}</td>
                    <td className="px-3 py-3 text-gray-500">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-gray-500">{u.last_login_at ? timeAgo(u.last_login_at) : "Belum pernah"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
        </>
      ) : null}

      <CreateUserModal open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

function CreateUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateUser();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("USER");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setUsername("");
      setName("");
      setPassword("");
      setRole("USER");
      setError("");
    }
  }, [open]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await create.mutateAsync({ username: username.trim(), password, name: name.trim() || undefined, role });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Tambah akun">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Username</label>
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Nama tampilan (opsional)</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
          <input className="input" type="text" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" required />
          <p className="mt-1 text-xs text-gray-400">Minimal 8 karakter, kombinasi huruf dan angka.</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="USER">User</option>
            <option value="OWNER">Owner</option>
          </select>
        </div>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-outline" onClick={onClose} disabled={create.isPending}>
            Batal
          </button>
          <button type="submit" className="btn-primary" disabled={create.isPending}>
            {create.isPending ? "Menyimpan…" : "Buat akun"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
