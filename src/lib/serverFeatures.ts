import { API_URL } from "./api";

export interface ServerFeatures {
  rich_format: boolean;
  images: boolean;
}

let cached: Promise<ServerFeatures | null> | null = null;

/**
 * Tanya /health backend. Backend lama tidak punya field `features`, jadi hasilnya false untuk semuanya —
 * artinya server masih memakai kode lama yang membuang format teks. null = server tidak terjangkau.
 */
export function getServerFeatures(): Promise<ServerFeatures | null> {
  if (!cached) {
    cached = (async () => {
      try {
        const res = await fetch(`${new URL(API_URL).origin}/health`, { cache: "no-store" });
        if (!res.ok) return null;
        const j = (await res.json()) as { features?: Partial<ServerFeatures> };
        return { rich_format: j?.features?.rich_format === true, images: j?.features?.images === true };
      } catch {
        return null;
      }
    })().then((r) => {
      if (!r) cached = null; // coba lagi nanti kalau gagal terhubung
      return r;
    });
  }
  return cached;
}
