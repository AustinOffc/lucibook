"use client";

import { AlertTriangle, ArrowLeft, Check, CloudOff, Copy, Globe, Loader2, Lock, Share2, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getServerFeatures } from "@/lib/serverFeatures";
import { useBooks, useDeleteNote, useToggleNoteFavorite, useToggleNotePublic, useUpdateNote } from "@/lib/queries";
import type { Note } from "@/lib/types";
import { cn } from "@/lib/utils";
import ExportCardModal from "./ExportCardModal";
import LabelPicker from "./LabelPicker";
import RichEditor from "./editor/RichEditor";
import ConfirmDialog from "./ui/ConfirmDialog";

type Status = "saved" | "dirty" | "saving" | "error";

/**
 * Catatan dimuat sekali ke state lokal (title/content). Perubahan disimpan otomatis
 * (debounce 1,2 dtk) dan dikirim ulang saat pindah halaman bila masih ada yang belum tersimpan.
 */
export default function NoteEditor({ note }: { note: Note }) {
  const router = useRouter();
  const { data: books = [] } = useBooks();
  const update = useUpdateNote();
  const toggleFav = useToggleNoteFavorite();
  const togglePublic = useToggleNotePublic();
  const del = useDeleteNote();

  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content ?? "");
  const [status, setStatus] = useState<Status>("saved");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [serverOutdated, setServerOutdated] = useState(false);

  const latest = useRef({ title, content });
  latest.current = { title, content };
  const dirty = useRef(false);
  const mutateRef = useRef(update.mutateAsync);
  mutateRef.current = update.mutateAsync;

  const save = useCallback(async () => {
    if (!dirty.current) return;
    const snap = latest.current;
    if (!snap.title.trim()) {
      setStatus("error");
      return;
    }
    dirty.current = false;
    setStatus("saving");
    try {
      await mutateRef.current({ id: note.id, title: snap.title.trim(), content: snap.content });
      setStatus(dirty.current ? "dirty" : "saved");
    } catch {
      dirty.current = true;
      setStatus("error");
    }
  }, [note.id]);

  const markDirty = () => {
    dirty.current = true;
    setStatus("dirty");
  };

  // Autosave
  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(save, 1200);
    return () => clearTimeout(t);
  }, [title, content, save]);

  // Simpan sisa perubahan saat meninggalkan halaman; peringatkan saat menutup tab.
  useEffect(() => () => void save(), [save]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  // Backend lama membuang format teks saat menyimpan -> beri tahu, jangan diam-diam.
  useEffect(() => {
    let off = false;
    getServerFeatures().then((f) => {
      if (!off && f && (!f.rich_format || !f.images)) setServerOutdated(true);
    });
    return () => {
      off = true;
    };
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/explore/${note.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard tidak tersedia */
    }
  }

  const statusView = {
    saved: { icon: <Check className="h-4 w-4" />, text: "Tersimpan", cls: "text-emerald-600" },
    dirty: { icon: <Loader2 className="h-4 w-4" />, text: "Belum tersimpan", cls: "text-gray-400" },
    saving: { icon: <Loader2 className="h-4 w-4 animate-spin" />, text: "Menyimpan…", cls: "text-gray-500" },
    error: {
      icon: <CloudOff className="h-4 w-4" />,
      text: title.trim() ? "Gagal menyimpan" : "Judul wajib diisi",
      cls: "text-red-600",
    },
  }[status];

  return (
    <div className="space-y-4">
      {/* Bar atas */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`/books/${note.book_id}`} className="btn-ghost -ml-3 px-3 py-2">
          <ArrowLeft className="h-4 w-4" />
          <span className="max-w-[10rem] truncate">{note.book.title}</span>
        </Link>

        <div className="flex items-center gap-1">
          <span className={cn("mr-1 hidden items-center gap-1.5 text-sm sm:inline-flex", statusView.cls)}>
            {statusView.icon}
            {statusView.text}
          </span>
          <button
            type="button"
            onClick={() => toggleFav.mutate(note.id)}
            className="btn-ghost p-2"
            aria-label={note.is_favorite ? "Hapus dari favorit" : "Tambah ke favorit"}
          >
            <Star className={cn("h-5 w-5", note.is_favorite && "fill-pinksoft-500 text-pinksoft-500")} />
          </button>
          <button
            type="button"
            onClick={() => togglePublic.mutate(note.id)}
            disabled={togglePublic.isPending}
            className={cn("btn-ghost px-3 py-2", note.is_public && "bg-pinksoft-100 text-pinksoft-800")}
            aria-pressed={note.is_public}
          >
            {note.is_public ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {note.is_public ? "Publik" : "Privat"}
          </button>
          <button type="button" onClick={() => setShowExport(true)} className="btn-ghost p-2" aria-label="Bagikan sebagai gambar atau PDF">
            <Share2 className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => setConfirmDelete(true)} className="btn-ghost p-2 text-red-600 hover:bg-red-50" aria-label="Hapus catatan">
            <Trash2 className="h-5 w-5" />
          </button>
          <button type="button" onClick={save} disabled={status === "saving" || status === "saved"} className="btn-primary">
            Simpan
          </button>
        </div>
      </div>

      <span className={cn("inline-flex items-center gap-1.5 text-sm sm:hidden", statusView.cls)}>
        {statusView.icon}
        {statusView.text}
      </span>

      {/* Judul */}
      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          markDirty();
        }}
        placeholder="Judul catatan"
        maxLength={200}
        className="w-full bg-transparent text-2xl font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none sm:text-3xl"
      />

      {/* Meta: buku + label */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="input w-auto max-w-[14rem] py-2"
          value={note.book_id}
          onChange={(e) => update.mutate({ id: note.id, book_id: e.target.value })}
          aria-label="Pindahkan ke buku"
        >
          {books.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
          {!books.some((b) => b.id === note.book_id) && <option value={note.book_id}>{note.book.title}</option>}
        </select>
        <LabelPicker note={note} />
      </div>

      {serverOutdated && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Server belum diperbarui, jadi rata teks, warna highlight, font, jarak baris, dan unggah gambar belum tersimpan di server (di Explore tampil
            polos). Perbarui backend lalu restart, kemudian buka catatan ini dan ubah sedikit supaya tersimpan ulang.
          </span>
        </div>
      )}

      {note.is_public && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-pinksoft-50 px-4 py-2.5 text-sm text-pinksoft-800">
          <span className="inline-flex items-center gap-2">
            <Globe className="h-4 w-4" /> Catatan ini tampil di Explore (read-only untuk orang lain).
          </span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={copyLink} className="btn-ghost px-2.5 py-1.5 text-xs">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Tersalin" : "Salin tautan"}
            </button>
            <Link href={`/explore/${note.id}`} className="btn-ghost px-2.5 py-1.5 text-xs">
              Lihat
            </Link>
          </div>
        </div>
      )}

      <RichEditor
        initialContent={note.content ?? ""}
        onChange={(html) => {
          setContent(html);
          markDirty();
        }}
      />

      <ExportCardModal open={showExport} onClose={() => setShowExport(false)} title={title} html={content} />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Pindahkan catatan ke Sampah?"
        message={`"${note.title}" akan masuk Sampah dan dihapus permanen setelah 30 hari. Kamu bisa memulihkannya kapan saja sebelum itu.`}
        confirmText="Pindahkan"
        onConfirm={async () => {
          dirty.current = false; // jangan autosave catatan yang dihapus
          await del.mutateAsync(note.id);
          router.replace(`/books/${note.book_id}`);
        }}
      />
    </div>
  );
}
