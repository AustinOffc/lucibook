"use client";

import { useQueryClient } from "@tanstack/react-query";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, TOKEN_KEY, UNAUTHORIZED_EVENT } from "./api";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Pulihkan sesi dari token yang tersimpan.
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setLoading(false);
      return;
    }
    api
      .get<{ user: User }>("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => {
        /* 401 sudah ditangani interceptor; error jaringan: biarkan user null */
      })
      .finally(() => setLoading(false));
  }, []);

  // Token kedaluwarsa / ditolak server.
  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
      qc.clear();
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [qc]);

  const authenticate = useCallback(
    async (path: "/auth/login" | "/auth/register", username: string, password: string) => {
      const { data } = await api.post<{ user: User; token: string }>(path, { username, password });
      localStorage.setItem(TOKEN_KEY, data.token);
      qc.clear();
      setUser(data.user);
    },
    [qc]
  );

  const login = useCallback((u: string, p: string) => authenticate("/auth/login", u, p), [authenticate]);
  const register = useCallback((u: string, p: string) => authenticate("/auth/register", u, p), [authenticate]);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* tetap keluar di sisi klien */
    }
    localStorage.removeItem(TOKEN_KEY);
    qc.clear();
    setUser(null);
  }, [qc]);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}
