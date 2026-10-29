"use client";

import { Camera, Eye, EyeOff, Trash2 } from "lucide-react";
import { ChangeEvent, FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { getErrorMessage, saveToken } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { changePassword, removeAvatar, updateProfile, uploadAvatar } from "@/lib/profile";
import Avatar from "./Avatar";

type Notice = { type: "ok" | "error"; text: string } | null;

function NoticeBox({ notice }: { notice: Notice }) {
  if (!notice) return null;
  const tone = notice.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700";
  return <p className={`rounded-xl px-3 py-2 text-sm ${tone}`}>{notice.text}</p>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function PasswordField({
  label,
  hint,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label} hint={hint}>
      <div className="relative">
        <input
          className="input pr-10"
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
    </Field>
  );
}

function AvatarSection() {
  const { user, updateUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setNotice(null);
    try {
      updateUser(await uploadAvatar(file));
      setNotice({ type: "ok", text: "Foto profil diperbarui." });
    } catch (err) {
      setNotice({ type: "error", text: getErrorMessage(err, "Gagal mengunggah foto.") });
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    setBusy(true);
    setNotice(null);
    try {
      updateUser(await removeAvatar());
      setNotice({ type: "ok", text: "Foto profil dihapus." });
    } catch (err) {
      setNotice({ type: "error", text: getErrorMessage(err, "Gagal menghapus foto.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-5">
      <h2 className="mb-4 font-semibold text-gray-900">Foto profil</h2>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar user={user} className="h-20 w-20 text-2xl" />
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-outline" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Camera className="h-4 w-4" /> {busy ? "Memproses…" : user?.avatar_url ? "Ganti foto" : "Pasang foto"}
          </button>
          {user?.avatar_url && (
            <button type="button" className="btn-ghost" disabled={busy} onClick={onRemove}>
              <Trash2 className="h-4 w-4" /> Hapus
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      </div>
      <div className="mt-3">
        <NoticeBox notice={notice} />
      </div>
    </section>
  );
}

function IdentitySection() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    setName(user?.name ?? "");
    setUsername(user?.username ?? "");
  }, [user?.name, user?.username]);

  const nameChanged = name.trim() !== (user?.name ?? "");
  const usernameChanged = username.trim() !== (user?.username ?? "");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    if (!nameChanged && !usernameChanged) return;
    if (usernameChanged && !password) {
      setNotice({ type: "error", text: "Masukkan password saat ini untuk mengganti username." });
      return;
    }
    setBusy(true);
    try {
      const updated = await updateProfile({
        ...(nameChanged ? { name: name.trim() } : {}),
        ...(usernameChanged ? { username: username.trim(), current_password: password } : {}),
      });
      updateUser(updated);
      setName(updated.name ?? "");
      setUsername(updated.username);
      setPassword("");
      setNotice({ type: "ok", text: "Perubahan disimpan." });
    } catch (err) {
      setNotice({ type: "error", text: getErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-5">
      <h2 className="mb-4 font-semibold text-gray-900">Informasi akun</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nama" hint="Nama yang ditampilkan di aplikasi. Boleh dikosongkan.">
          <input
            className="input"
            autoComplete="name"
            maxLength={50}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="mis. Austin"
          />
        </Field>

        <Field label="Username" hint="3–30 karakter: huruf, angka, titik, underscore.">
          <input
            className="input"
            autoComplete="username"
            autoCapitalize="none"
            maxLength={30}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </Field>

        {usernameChanged && (
          <PasswordField
            label="Password saat ini"
            hint="Diperlukan untuk mengganti username."
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
        )}

        <NoticeBox notice={notice} />

        <button type="submit" className="btn-primary" disabled={busy || (!nameChanged && !usernameChanged)}>
          {busy ? "Menyimpan…" : "Simpan perubahan"}
        </button>
      </form>
    </section>
  );
}

function PasswordSection() {
  const { updateUser } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    if (next.length < 8) {
      setNotice({ type: "error", text: "Password baru minimal 8 karakter." });
      return;
    }
    if (next !== confirm) {
      setNotice({ type: "error", text: "Konfirmasi password tidak cocok." });
      return;
    }
    setBusy(true);
    try {
      const data = await changePassword(current, next);
      saveToken(data.token);
      updateUser(data.user);
      setCurrent("");
      setNext("");
      setConfirm("");
      setNotice({ type: "ok", text: "Password diperbarui. Perangkat lain perlu masuk ulang." });
    } catch (err) {
      setNotice({ type: "error", text: getErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-5">
      <h2 className="mb-4 font-semibold text-gray-900">Ubah password</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <PasswordField label="Password saat ini" value={current} onChange={setCurrent} autoComplete="current-password" />
        <PasswordField
          label="Password baru"
          hint="Minimal 8 karakter, kombinasi huruf dan angka."
          value={next}
          onChange={setNext}
          autoComplete="new-password"
        />
        <PasswordField label="Ulangi password baru" value={confirm} onChange={setConfirm} autoComplete="new-password" />

        <NoticeBox notice={notice} />

        <button type="submit" className="btn-primary" disabled={busy || !current || !next || !confirm}>
          {busy ? "Menyimpan…" : "Ubah password"}
        </button>
      </form>
    </section>
  );
}

export default function ProfileSettings() {
  return (
    <>
      <AvatarSection />
      <IdentitySection />
      <PasswordSection />
    </>
  );
}
