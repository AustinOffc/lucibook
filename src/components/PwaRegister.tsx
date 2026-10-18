"use client";

import { useEffect } from "react";

/** Mendaftarkan service worker (hanya di produksi) dan meminta penyimpanan permanen untuk data offline. */
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          // Saat online: pastikan kerangka halaman tersimpan (mis. instalasi pertama sempat gagal sebagian).
          if (navigator.onLine) reg.active?.postMessage({ type: "WARM" });
        })
        .catch(() => undefined);
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    // Cegah browser menghapus IndexedDB saat penyimpanan perangkat menipis.
    navigator.storage?.persist?.().catch(() => undefined);
  }, []);
  return null;
}
