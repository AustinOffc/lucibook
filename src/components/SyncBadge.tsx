"use client";

import { Check, CloudUpload, Loader2, WifiOff } from "lucide-react";
import { useSyncStatus } from "@/lib/offline/useSyncStatus";
import { cn } from "@/lib/utils";

/** Penanda kecil di Topbar: offline / menyinkronkan / ada perubahan menunggu / semua tersimpan. */
export default function SyncBadge() {
  const s = useSyncStatus();

  let icon = <Check className="h-4 w-4" />;
  let text = "Tersinkron";
  let cls = "text-emerald-600";
  let title = "Semua perubahan sudah tersimpan di server";

  if (!s.online) {
    icon = <WifiOff className="h-4 w-4" />;
    text = s.pending > 0 ? `Offline · ${s.pending} menunggu` : "Offline";
    cls = "bg-amber-50 text-amber-700";
    title = "Kamu sedang offline. Perubahan disimpan di perangkat dan dikirim saat online lagi.";
  } else if (s.syncing) {
    icon = <Loader2 className="h-4 w-4 animate-spin" />;
    text = "Menyinkronkan…";
    cls = "text-gray-500";
    title = "Sedang menyinkronkan dengan server";
  } else if (s.pending > 0) {
    icon = <CloudUpload className="h-4 w-4" />;
    text = `${s.pending} menunggu`;
    cls = "bg-amber-50 text-amber-700";
    title = "Perubahan menunggu dikirim ke server";
  }

  return (
    <span
      role="status"
      title={title}
      className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium", cls)}
    >
      {icon}
      <span className="hidden sm:inline">{text}</span>
    </span>
  );
}
