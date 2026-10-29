"use client";

import { Crown, FileText, LayoutDashboard, LogOut, Menu, Server, Undo2, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { displayName } from "@/lib/profile";
import { cn } from "@/lib/utils";
import Avatar from "../Avatar";
import Logo from "../Logo";
import { FullScreenSpinner } from "../ui/Spinner";

const NAV = [
  { href: "/owner", label: "Ringkasan", icon: LayoutDashboard, exact: true },
  { href: "/owner/users", label: "Pengguna", icon: Users, exact: false },
  { href: "/owner/notes", label: "Catatan & Konten", icon: FileText, exact: false },
  { href: "/owner/system", label: "Sistem", icon: Server, exact: false },
];

export default function OwnerShell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.role !== "OWNER") router.replace("/dashboard");
  }, [loading, user, router]);

  useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  if (loading || !user || user.role !== "OWNER") return <FullScreenSpinner />;

  const isActive = (href: string, exact: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"));

  async function handleLogout() {
    if (await logout()) router.replace("/login");
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50">
      {drawer && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setDrawer(false)} />}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-pinksoft-100 bg-white transition-transform duration-200 lg:static lg:translate-x-0",
          drawer ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <Link href="/owner" className="flex flex-col items-start gap-1.5">
            <Logo layout="inline" />
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
              <Crown className="h-3 w-3" /> Panel Owner
            </span>
          </Link>
          <button type="button" onClick={() => setDrawer(false)} className="btn-ghost p-2 lg:hidden" aria-label="Tutup menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {NAV.map(({ href, label, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                isActive(href, exact) ? "bg-pinksoft-100 font-semibold text-pinksoft-800" : "text-gray-600 hover:bg-pinksoft-50"
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </Link>
          ))}
          <div className="my-3 border-t border-pinksoft-100" />
          <Link href="/dashboard" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-600 transition hover:bg-pinksoft-50">
            <Undo2 className="h-[18px] w-[18px]" />
            Buka aplikasi catatan
          </Link>
        </nav>

        <div className="flex items-center gap-3 border-t border-pinksoft-100 p-4">
          <Avatar user={user} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-800">{displayName(user)}</p>
            <p className="truncate text-xs text-gray-400">@{user.username}</p>
          </div>
          <button type="button" onClick={handleLogout} className="btn-ghost p-2" aria-label="Keluar">
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-pinksoft-100 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <button type="button" onClick={() => setDrawer(true)} className="btn-ghost p-2" aria-label="Buka menu">
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold text-gray-800">Panel Owner</span>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
