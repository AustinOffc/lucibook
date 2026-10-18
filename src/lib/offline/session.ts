import type { User } from "../types";

/**
 * Pengguna aktif di perangkat ini. Disimpan di localStorage supaya aplikasi bisa dibuka
 * saat offline tanpa perlu memanggil /auth/me lebih dulu.
 */
const USER_KEY = "lucibook_user";

let active: User | null = null;

export function readCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw) as User;
    return u && typeof u.id === "string" && typeof u.username === "string" ? u : null;
  } catch {
    return null;
  }
}

export function cacheUser(user: User | null) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* penyimpanan penuh / diblokir */
  }
}

export function setActiveUser(user: User | null) {
  active = user;
}

export function getActiveUser(): User | null {
  return active;
}
