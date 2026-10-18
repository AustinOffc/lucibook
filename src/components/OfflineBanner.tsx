"use client";

import { WifiOff } from "lucide-react";
import { useSyncStatus } from "@/lib/offline/useSyncStatus";

export default function OfflineBanner() {
  const s = useSyncStatus();
  if (s.online) return null;
  return (
    <div role="status" className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 sm:px-6">
      <WifiOff className="h-4 w-4 shrink-0" />
      <p>
        Mode offline. Catatanmu tetap bisa dibaca dan ditulis; perubahan disimpan di perangkat dan dikirim otomatis saat online lagi
        {s.pending > 0 ? ` (${s.pending} menunggu).` : "."}
      </p>
    </div>
  );
}
