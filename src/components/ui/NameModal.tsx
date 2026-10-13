"use client";

import { FormEvent, useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/api";
import Modal from "./Modal";

/** Modal satu-kolom untuk membuat / mengganti nama Buku atau Label. */
export default function NameModal({
  open,
  onClose,
  title,
  label,
  placeholder,
  initial = "",
  submitText = "Simpan",
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  label: string;
  placeholder?: string;
  initial?: string;
  submitText?: string;
  onSubmit: (name: string) => Promise<unknown>;
}) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(initial);
      setError("");
    }
  }, [open, initial]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const name = value.trim();
    if (!name) {
      setError(`${label} wajib diisi`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSubmit(name);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
          <input
            autoFocus
            className="input"
            value={value}
            placeholder={placeholder}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-outline" onClick={onClose} disabled={busy}>
            Batal
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Menyimpan…" : submitText}
          </button>
        </div>
      </form>
    </Modal>
  );
}
