"use client";

import { Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useSearch } from "@/lib/search";

/** Halaman yang menampilkan hasil pencarian. Di halaman lain, mengetik akan membawa ke dashboard. */
function isSearchable(path: string) {
  return path === "/dashboard" || path === "/favorites" || path.startsWith("/books/") || path.startsWith("/labels/");
}

export default function Topbar({ onMenu }: { onMenu: () => void }) {
  const { q, setQ } = useSearch();
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  function onChange(value: string) {
    setQ(value);
    if (value && !isSearchable(pathname)) router.push("/dashboard");
  }

  return (
    <header className="flex items-center gap-3 border-b border-pinksoft-100 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
      <button type="button" onClick={onMenu} className="btn-ghost p-2 lg:hidden" aria-label="Buka menu">
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative max-w-xl flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          className="input pl-9 pr-9"
          placeholder="Cari judul atau isi catatan…"
          value={q}
          onChange={(e) => onChange(e.target.value)}
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:text-gray-600"
            aria-label="Hapus pencarian"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Link
        href="/settings"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pinksoft-200 text-sm font-bold uppercase text-pinksoft-900"
        aria-label="Pengaturan akun"
      >
        {user?.username.charAt(0)}
      </Link>
    </header>
  );
}
