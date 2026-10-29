import clsx, { ClassValue } from "clsx";

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)} hari lalu`;
  return formatDate(iso);
}

/** Sisa hari sebelum item Sampah dihapus permanen. */
export function daysLeft(expiresIso: string): number {
  return Math.max(0, Math.ceil((new Date(expiresIso).getTime() - Date.now()) / 86400000));
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d} hari ${h} jam`;
  if (h > 0) return `${h} jam ${m} menit`;
  return `${m} menit`;
}
