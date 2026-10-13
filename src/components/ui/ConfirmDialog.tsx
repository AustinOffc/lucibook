"use client";

import { useState } from "react";
import { getErrorMessage } from "@/lib/api";
import Modal from "./Modal";

export default function ConfirmDialog({
  open,
  onClose,
  title,
  message,
  confirmText = "Hapus",
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText?: string;
  onConfirm: () => Promise<unknown> | void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-gray-600">{message}</p>
      {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn-outline" onClick={onClose} disabled={busy}>
          Batal
        </button>
        <button type="button" className="btn-danger" onClick={run} disabled={busy}>
          {busy ? "Memproses…" : confirmText}
        </button>
      </div>
    </Modal>
  );
}
