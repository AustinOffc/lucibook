"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { SearchProvider } from "@/lib/search";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { FullScreenSpinner } from "./ui/Spinner";

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // Tutup drawer mobile setelah pindah halaman.
  useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  if (loading || !user) return <FullScreenSpinner />;

  return (
    <SearchProvider>
      <div className="flex h-dvh overflow-hidden bg-slate-50">
        <Sidebar open={drawer} onClose={() => setDrawer(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenu={() => setDrawer(true)} />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
          </main>
        </div>
      </div>
    </SearchProvider>
  );
}
