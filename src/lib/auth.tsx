"use client";

import { useQueryClient } from "@tanstack/react-query";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, TOKEN_KEY, UNAUTHORIZED_EVENT } from "./api";
import { cacheUser, readCachedUser, setActiveUser } from "./offline/session";
import { wipeLocalData } from "./offline/store";
import { flushPending, startSync, stopSync } from "./offline/sync";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  /** Mengembalikan false bila dibatalkan (masih ada perubahan yang belum terkirim). */
  logout: () => Promise<boolean>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // `setActiveUser` harus jalan SEBELUM `setUser`: komponen anak langsung membaca data lokal milik user ini.
  const adopt = useCallback((u: User) => {
    cacheUser(u);
    setActiveUser(u);
    setUser((prev) => (prev && prev.id === u.id && prev.username === u.username ? prev : u));
  }, []);

  // Pulihkan sesi dari token yang tersimpan. Saat offline, pakai profil yang tersimpan di perangkat.
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setLoading(false);
      return;
    }
    const cached = readCachedUser();
    if (cached) {
      adopt(cached);
      setLoading(false);
    }
    api
      .get<{ user: User }>("/auth/me")
      .then((res) => {
        if (cached && cached.id !== res.data.user.id) qc.clear(); // token milik akun lain
        adopt(res.data.user);
      })
      .catch(() => {
        /* 401 sudah ditangani interceptor; error jaringan: tetap pakai sesi tersimpan */
      })
      .finally(() => setLoading(false));
  }, [adopt, qc]);

  // Sinkronisasi otomatis berjalan selama ada pengguna aktif.
  useEffect(() => {
    if (!user) return;
    startSync();
    return () => stopSync();
  }, [user]);

  // Token kedaluwarsa / ditolak server. Data lokal TIDAK dihapus: perubahan yang belum terkirim
  // tetap aman dan dikirim setelah pengguna yang sama masuk lagi.
  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
      setActiveUser(null);
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
      adopt(data.user);
    },
    [qc, adopt]
  );

  const login = useCallback((u: string, p: string) => authenticate("/auth/login", u, p), [authenticate]);
  const register = useCallback((u: string, p: string) => authenticate("/auth/register", u, p), [authenticate]);

  const logout = useCallback(async () => {
    // Kirim dulu sisa perubahan; jangan sampai catatan yang belum tersinkron hilang tanpa sepengetahuan user.
    let remaining = 0;
    try {
      remaining = await flushPending();
    } catch {
      /* abaikan: dihitung dari antrean di bawah */
    }
    if (remaining > 0) {
      const ok = window.confirm(
        `Masih ada ${remaining} perubahan yang belum terkirim ke server (kamu offline atau server tidak terjangkau).\n\n` +
          "Jika keluar sekarang, perubahan itu akan hilang. Tetap keluar?"
      );
      if (!ok) return false;
    }
    try {
      await api.post("/auth/logout");
    } catch {
      /* tetap keluar di sisi klien */
    }
    stopSync();
    try {
      await wipeLocalData(); // perangkat bersama: data pengguna ini tidak boleh tertinggal
    } catch {
      /* abaikan */
    }
    cacheUser(null);
    setActiveUser(null);
    localStorage.removeItem(TOKEN_KEY);
    qc.clear();
    setUser(null);
    return true;
  }, [qc]);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}
