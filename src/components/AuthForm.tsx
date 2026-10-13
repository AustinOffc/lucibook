"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Logo from "./Logo";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isLogin = mode === "login";
  const router = useRouter();
  const { user, loading, login, register } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!isLogin && password !== confirm) {
      setError("Konfirmasi password tidak cocok");
      return;
    }
    setSubmitting(true);
    try {
      if (isLogin) await login(username.trim(), password);
      else await register(username.trim(), password);
      router.replace("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="card p-6 shadow-md sm:p-8">
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo size="lg" />
        <p className="mt-3 text-sm text-gray-500">
          {isLogin ? "Masuk untuk membuka catatanmu." : "Buat akun untuk mulai mencatat."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Username</label>
          <input
            className="input"
            autoComplete="username"
            autoCapitalize="none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="mis. austin_01"
            required
          />
          {!isLogin && <p className="mt-1 text-xs text-gray-400">3–30 karakter: huruf, angka, titik, underscore.</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
          <div className="relative">
            <input
              className="input pr-10"
              type={show ? "text" : "password"}
              autoComplete={isLogin ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-400 hover:text-gray-600"
              aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {!isLogin && <p className="mt-1 text-xs text-gray-400">Minimal 6 karakter.</p>}
        </div>

        {!isLogin && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Ulangi password</label>
            <input
              className="input"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
        )}

        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Memproses…" : isLogin ? "Masuk" : "Daftar"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-gray-500">
        {isLogin ? "Belum punya akun? " : "Sudah punya akun? "}
        <Link href={isLogin ? "/register" : "/login"} className="font-semibold text-coksu-700 hover:underline">
          {isLogin ? "Daftar" : "Masuk"}
        </Link>
      </p>
      <p className="mt-2 text-center text-sm">
        <Link href="/explore" className="text-gray-400 hover:text-coksu-700">
          Jelajahi catatan publik →
        </Link>
      </p>
    </div>
  );
}
