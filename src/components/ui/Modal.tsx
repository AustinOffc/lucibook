"use client";

import { X } from "lucide-react";
import { ReactNode, useEffect } from "react";

export default function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button type="button" onClick={onClose} className="btn-ghost -mr-2 p-2" aria-label="Tutup">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
