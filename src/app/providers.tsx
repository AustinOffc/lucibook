"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import { ReactNode, useEffect, useState } from "react";
import { AuthProvider } from "@/lib/auth";
import { onDataChanged } from "@/lib/offline/bus";
import { isLocalError } from "@/lib/offline/errors";

export default function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data dibaca dari penyimpanan lokal (tidak butuh internet): jangan dijeda saat offline.
            networkMode: "always",
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // Jangan ulangi permintaan yang ditolak server (4xx) atau error lokal; ulangi sekali untuk gangguan jaringan / 5xx.
            retry: (count, error) =>
              count < 1 &&
              !isLocalError(error) &&
              !(axios.isAxiosError(error) && error.response && error.response.status < 500),
          },
          mutations: { networkMode: "always" },
        },
      })
  );

  // Sinkronisasi / tab lain mengubah data lokal -> muat ulang tampilan.
  useEffect(() => onDataChanged(() => void client.invalidateQueries()), [client]);

  return (
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
