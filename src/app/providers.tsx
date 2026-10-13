"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import { ReactNode, useState } from "react";
import { AuthProvider } from "@/lib/auth";

export default function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // Jangan ulangi permintaan yang ditolak server (4xx); ulangi sekali untuk gangguan jaringan / 5xx.
            retry: (count, error) =>
              count < 1 && !(axios.isAxiosError(error) && error.response && error.response.status < 500),
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
