"use client";

import { Globe, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <>
      <PageHeader title="Pengaturan" />

      <div className="max-w-xl space-y-4">
        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-gray-900">Akun</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Username</dt>
              <dd className="font-medium text-gray-900">{user?.username}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Bergabung</dt>
              <dd className="font-medium text-gray-900">{user ? formatDate(user.created_at) : "-"}</dd>
            </div>
          </dl>
          <button type="button" onClick={handleLogout} className="btn-outline mt-4">
            <LogOut className="h-4 w-4" /> Keluar
          </button>
        </section>

        <Link href="/explore" className="btn-outline">
          <Globe className="h-4 w-4" /> Buka Explore
        </Link>
      </div>
    </>
  );
}
