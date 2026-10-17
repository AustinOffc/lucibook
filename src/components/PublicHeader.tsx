"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import Logo from "./Logo";

export default function PublicHeader() {
  const { user, loading } = useAuth();
  return (
    <header className="sticky top-0 z-10 border-b border-pinksoft-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/explore">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          {loading ? null : user ? (
            <Link href="/dashboard" className="btn-primary">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                Masuk
              </Link>
              <Link href="/register" className="btn-primary">
                Daftar
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
