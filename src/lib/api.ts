import axios from "axios";
import { isLocalError } from "./offline/errors";

export const TOKEN_KEY = "lucibook_token";
export const UNAUTHORIZED_EVENT = "lucibook:unauthorized";

export function saveToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    return;
  }
}

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api").replace(/\/+$/, "");

/**
 * Frontend (Vercel) dan backend (tunnel) beda origin, jadi cookie lintas-situs bisa diblokir browser.
 * Karena itu token dari body login disimpan di localStorage dan dikirim sebagai header Bearer.
 * `withCredentials` tetap aktif agar cookie HttpOnly ikut terkirim bila browser mengizinkan.
 */
export const api = axios.create({ baseURL: API_URL, withCredentials: true });

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const url: string = error?.config?.url || "";
    const isCredentialCall = url.startsWith("/auth/login") || url.startsWith("/auth/register");
    if (status === 401 && !isCredentialCall && typeof window !== "undefined") {
      const sent = String(error?.config?.headers?.Authorization ?? "");
      const current = localStorage.getItem(TOKEN_KEY);
      if (!current || sent === `Bearer ${current}`) {
        localStorage.removeItem(TOKEN_KEY);
        window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(err: unknown, fallback = "Terjadi kesalahan, coba lagi."): string {
  if (isLocalError(err)) return err.message;
  if (axios.isAxiosError(err)) {
    const message = err.response?.data?.message;
    if (typeof message === "string" && message) return message;
    if (!err.response) return "Tidak dapat terhubung ke server. Periksa koneksi internetmu lalu coba lagi.";
  }
  return fallback;
}
