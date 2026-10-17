"use client";

import { BookOpen, Globe, LayoutDashboard, LogOut, Settings, Star, Tag, Trash2, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useBooks, useLabels } from "@/lib/queries";
import { cn } from "@/lib/utils";
import Logo from "./Logo";

const NAV = [
  { href: "/dashboard", label: "Semua catatan", icon: LayoutDashboard },
  { href: "/books", label: "Buku", icon: BookOpen },
  { href: "/favorites", label: "Favorit", icon: Star },
  { href: "/labels", label: "Label", icon: Tag },
  { href: "/trash", label: "Sampah", icon: Trash2 },
  { href: "/explore", label: "Explore", icon: Globe },
  { href: "/settings", label: "Pengaturan", icon: Settings },
];

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { data: books = [] } = useBooks();
  const { data: labels = [] } = useLabels();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-pinksoft-100 bg-white transition-transform duration-200 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <Link href="/dashboard">
            <Logo />
          </Link>
          <button type="button" onClick={onClose} className="btn-ghost p-2 lg:hidden" aria-label="Tutup menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
          <ul className="space-y-1">
            {NAV.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                    isActive(href) ? "bg-pinksoft-100 font-semibold text-pinksoft-800" : "text-gray-600 hover:bg-pinksoft-50"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          {books.length > 0 && (
            <div>
              <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Buku saya</p>
              <ul className="space-y-0.5">
                {books.slice(0, 6).map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/books/${b.id}`}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm",
                        pathname === `/books/${b.id}` ? "bg-pinksoft-50 font-medium text-pinksoft-800" : "text-gray-600 hover:bg-pinksoft-50"
                      )}
                    >
                      <BookOpen className="h-3.5 w-3.5 shrink-0 text-pinksoft-500" />
                      <span className="truncate">{b.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {labels.length > 0 && (
            <div>
              <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Label</p>
              <ul className="space-y-0.5">
                {labels.slice(0, 8).map((l) => (
                  <li key={l.id}>
                    <Link
                      href={`/labels/${l.id}`}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm",
                        pathname === `/labels/${l.id}` ? "bg-pinksoft-50 font-medium text-pinksoft-800" : "text-gray-600 hover:bg-pinksoft-50"
                      )}
                    >
                      <Tag className="h-3.5 w-3.5 shrink-0 text-pinksoft-500" />
                      <span className="truncate">{l.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>

        <div className="flex items-center gap-3 border-t border-pinksoft-100 p-4">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pinksoft-200 text-sm font-bold uppercase text-pinksoft-900">
            {user?.username.charAt(0)}
          </div>
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">{user?.username}</p>
          <button type="button" onClick={handleLogout} className="btn-ghost p-2" aria-label="Keluar">
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </div>
      </aside>
    </>
  );
}
