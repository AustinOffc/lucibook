"use client";

import { Check, Plus, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { getErrorMessage } from "@/lib/api";
import { useCreateLabel, useLabels, useSetNoteLabels } from "@/lib/queries";
import type { Note } from "@/lib/types";
import { cn } from "@/lib/utils";
import LabelChip from "./LabelChip";

export default function LabelPicker({ note }: { note: Note }) {
  const { data: labels = [] } = useLabels();
  const setLabels = useSetNoteLabels();
  const createLabel = useCreateLabel();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const selectedIds = note.labels.map((l) => l.id);

  const apply = (ids: string[]) => setLabels.mutate({ id: note.id, label_ids: ids });
  const toggle = (id: string) =>
    apply(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);

  async function addNew(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setError("");
    try {
      const label = await createLabel.mutateAsync(trimmed);
      apply([...selectedIds, label.id]);
      setName("");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="relative flex flex-wrap items-center gap-1.5">
      {note.labels.map((l) => (
        <span key={l.id} className="inline-flex items-center gap-0.5">
          <LabelChip name={l.name} />
          <button
            type="button"
            onClick={() => toggle(l.id)}
            className="-ml-1.5 rounded-full p-0.5 text-coksu-700 hover:bg-coksu-200"
            aria-label={`Lepas label ${l.name}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      <button type="button" onClick={() => setOpen((v) => !v)} className="btn-outline px-2.5 py-1 text-xs">
        <Plus className="h-3.5 w-3.5" /> Label
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-30 mt-2 w-64 rounded-2xl border border-coksu-100 bg-white p-2 shadow-lg">
            <div className="max-h-48 overflow-y-auto">
              {labels.length === 0 && <p className="px-2 py-2 text-xs text-gray-500">Belum ada label. Buat di bawah.</p>}
              {labels.map((l) => {
                const active = selectedIds.includes(l.id);
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => toggle(l.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-sm hover:bg-coksu-50",
                      active && "font-semibold text-coksu-800"
                    )}
                  >
                    <span className="truncate">{l.name}</span>
                    {active && <Check className="h-4 w-4 text-coksu-600" />}
                  </button>
                );
              })}
            </div>
            <form onSubmit={addNew} className="mt-1 border-t border-coksu-100 pt-2">
              <div className="flex gap-1.5">
                <input
                  className="input py-2"
                  placeholder="Label baru…"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <button type="submit" className="btn-primary px-3" disabled={createLabel.isPending} aria-label="Buat label">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
            </form>
          </div>
        </>
      )}
    </div>
  );
}
