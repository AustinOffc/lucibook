"use client";

import { usePathname } from "next/navigation";

/**
 * Ambil id dari URL browser (bukan dari `useParams`). Saat offline, halaman disajikan dari cache
 * service worker dengan kerangka halaman lain; `usePathname` selalu mengikuti URL yang sebenarnya.
 */
export function useRouteId(prefix: string): string {
  const pathname = usePathname() ?? "";
  const rest = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : "";
  const seg = rest.split("/")[0] ?? "";
  try {
    return decodeURIComponent(seg);
  } catch {
    return seg;
  }
}
