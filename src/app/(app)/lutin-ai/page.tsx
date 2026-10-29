"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Image as ImageIcon, ImagePlus, Loader2, Pencil, Plus, Send, Sparkles, Trash2, X } from "lucide-react";
import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import ChatText from "@/components/lutin/ChatText";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import NameModal from "@/components/ui/NameModal";
import PageHeader from "@/components/ui/PageHeader";
import { BlockSpinner } from "@/components/ui/Spinner";
import { getErrorMessage } from "@/lib/api";
import {
  fetchSession,
  fetchSessions,
  LUTIN_SESSIONS_KEY,
  LutinAttachment,
  LutinMessage,
  LutinSessionSummary,
  prepareImage,
  removeAllSessions,
  removeSession,
  renameSession,
  sendChat,
} from "@/lib/lutinai";
import { cn, timeAgo } from "@/lib/utils";

const SUGGESTIONS = ["Bantu aku rapikan catatan", "Kasih ide judul buat buku harianku", "Jelasin konsep ini dengan simpel"];

function Avatar() {
  return (
    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-pinksoft-100 text-pinksoft-700">
      <Sparkles className="h-4 w-4" />
    </div>
  );
}

function Bubble({ m }: { m: LutinMessage }) {
  const mine = m.role === "user";
  return (
    <div className={cn("flex gap-2", mine ? "justify-end" : "justify-start")}>
      {!mine && <Avatar />}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm",
          mine ? "rounded-br-md bg-pinksoft-600 text-white" : "rounded-bl-md border border-pinksoft-100 bg-white text-gray-800"
        )}
      >
        {m.has_image &&
          (m.preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.preview} alt="Gambar yang dikirim" className="mb-2 max-h-56 rounded-xl object-cover" />
          ) : (
            <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-white/20 px-2 py-1 text-xs">
              <ImageIcon className="h-3.5 w-3.5" />
              Gambar dilampirkan
            </div>
          ))}
        {mine ? (
          m.content && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.content}</p>
        ) : (
          <ChatText text={m.content} />
        )}
      </div>
    </div>
  );
}

export default function LutinAiPage() {
  const qc = useQueryClient();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LutinMessage[]>([]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<LutinAttachment | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [error, setError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LutinSessionSummary | null>(null);
  const [renameTarget, setRenameTarget] = useState<LutinSessionSummary | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  // Naik tiap pindah/ reset sesi, supaya balasan lama yang telat datang tidak menimpa layar sesi lain.
  const epoch = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const sessions = useQuery({ queryKey: LUTIN_SESSIONS_KEY, queryFn: fetchSessions, enabled: historyOpen });

  // Gulir ke pesan terbaru.
  useEffect(() => {
    const main = endRef.current?.closest("main");
    if (main) main.scrollTo({ top: main.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  // Textarea tumbuh mengikuti isi (maks 160px).
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  function resetChat() {
    epoch.current++;
    setSessionId(null);
    setMessages([]);
    setInput("");
    setImage(null);
    setError("");
    setSending(false);
    setLoadingSession(false);
  }

  async function openSession(id: string) {
    const myEpoch = ++epoch.current;
    setHistoryOpen(false);
    setLoadingSession(true);
    setSending(false);
    setError("");
    setInput("");
    setImage(null);
    try {
      const s = await fetchSession(id);
      if (epoch.current !== myEpoch) return;
      setSessionId(s.id);
      setMessages(s.messages);
    } catch (err) {
      if (epoch.current !== myEpoch) return;
      setError(getErrorMessage(err, "Gagal membuka riwayat chat."));
    } finally {
      if (epoch.current === myEpoch) setLoadingSession(false);
    }
  }

  async function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // supaya file yang sama bisa dipilih lagi
    if (!file) return;
    setError("");
    try {
      setImage(await prepareImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat gambar.");
    }
  }

  async function send() {
    const text = input.trim();
    if ((!text && !image) || sending || loadingSession) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError("Lutin-AI butuh koneksi internet. Cek koneksimu dulu ya.");
      return;
    }

    const myEpoch = epoch.current;
    const img = image;
    const optimistic: LutinMessage = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: text,
      has_image: !!img,
      created_at: new Date().toISOString(),
      preview: img?.dataUrl,
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    setImage(null);
    setError("");
    setSending(true);

    try {
      const res = await sendChat({ sessionId, message: text, image: img });
      qc.invalidateQueries({ queryKey: LUTIN_SESSIONS_KEY });
      if (epoch.current !== myEpoch) return;
      setSessionId(res.session.id);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimistic.id),
        { ...res.user_message, preview: img?.dataUrl },
        res.assistant_message,
      ]);
    } catch (err) {
      if (epoch.current !== myEpoch) return;
      // Kembalikan pesan ke kotak input supaya bisa langsung dikirim ulang.
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInput(text);
      setImage(img);
      setError(getErrorMessage(err, "Lutin-AI belum bisa menjawab. Coba lagi ya."));
    } finally {
      if (epoch.current === myEpoch) setSending(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter = kirim hanya di perangkat dengan keyboard fisik; di HP Enter tetap baris baru.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) {
      e.preventDefault();
      void send();
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await removeSession(deleteTarget.id);
    if (deleteTarget.id === sessionId) resetChat();
    await qc.invalidateQueries({ queryKey: LUTIN_SESSIONS_KEY });
  }

  async function confirmRename(title: string) {
    if (!renameTarget) return;
    await renameSession(renameTarget.id, title);
    await qc.invalidateQueries({ queryKey: LUTIN_SESSIONS_KEY });
  }

  async function confirmDeleteAll() {
    await removeAllSessions();
    resetChat(); // sesi yang sedang dibuka ikut terhapus
    await qc.invalidateQueries({ queryKey: LUTIN_SESSIONS_KEY });
  }

  const empty = messages.length === 0 && !sending;

  return (
    <div className="flex min-h-[calc(100dvh-8.5rem)] flex-col">
      <PageHeader
        title="Lutin-AI"
        description="Asisten AI buatan Austin. Bisa diajak ngobrol lewat teks dan gambar."
        actions={
          <>
            <button type="button" className="btn-outline" onClick={() => setHistoryOpen(true)}>
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Riwayat</span>
            </button>
            <button type="button" className="btn-primary" onClick={resetChat}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Chat baru</span>
            </button>
          </>
        }
      />

      <div className="flex-1 space-y-4" aria-live="polite">
        {loadingSession ? (
          <BlockSpinner />
        ) : empty ? (
          <EmptyState
            icon={<Sparkles className="h-6 w-6" />}
            title="Hai, aku Lutin-AI ✨"
            hint="Teman ngobrol kamu di Lucibook. Tanya apa aja, atau kirim gambar buat dibahas bareng."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="rounded-full border border-pinksoft-200 bg-white px-3 py-1.5 text-xs text-pinksoft-800 hover:bg-pinksoft-50"
                    onClick={() => {
                      setInput(s);
                      taRef.current?.focus();
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            }
          />
        ) : (
          messages.map((m) => <Bubble key={m.id} m={m} />)
        )}

        {sending && (
          <div className="flex gap-2">
            <Avatar />
            <div
              className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-pinksoft-100 bg-white px-4 py-3 shadow-sm"
              aria-label="Lutin-AI sedang mengetik"
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-2 w-2 animate-bounce rounded-full bg-pinksoft-400"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 -mb-6 bg-slate-50 pb-5 pt-3">
        {error && (
          <p className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        {image && (
          <div className="mb-2">
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.dataUrl} alt="Gambar terlampir" className="h-16 w-16 rounded-xl border border-pinksoft-200 object-cover" />
              <button
                type="button"
                onClick={() => setImage(null)}
                className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-gray-800 text-white"
                aria-label="Hapus gambar"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-end gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
          <button
            type="button"
            className="btn-outline h-11 w-11 shrink-0 p-0"
            onClick={() => fileRef.current?.click()}
            disabled={sending || loadingSession}
            aria-label="Lampirkan gambar"
          >
            <ImagePlus className="h-5 w-5" />
          </button>
          <textarea
            ref={taRef}
            rows={1}
            className="input max-h-40 min-h-[2.75rem] flex-1 resize-none"
            placeholder="Ketik pesan ke Lutin-AI…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={4000}
          />
          <button
            type="button"
            className="btn-primary h-11 w-11 shrink-0 p-0"
            onClick={() => void send()}
            disabled={sending || loadingSession || (!input.trim() && !image)}
            aria-label="Kirim"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-gray-400">Lutin-AI bisa keliru. Cek lagi info yang penting ya.</p>
      </div>

      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title="Riwayat chat">
        {sessions.isLoading ? (
          <BlockSpinner />
        ) : sessions.isError ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{getErrorMessage(sessions.error, "Gagal memuat riwayat.")}</p>
        ) : (sessions.data?.length ?? 0) === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">Belum ada riwayat. Mulai ngobrol dulu yuk!</p>
        ) : (
          <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
            {sessions.data!.map((s) => (
              <li key={s.id} className={cn("flex items-center gap-1 rounded-xl", s.id === sessionId && "bg-pinksoft-50")}>
                <button
                  type="button"
                  onClick={() => void openSession(s.id)}
                  className="min-w-0 flex-1 rounded-xl px-3 py-2 text-left hover:bg-pinksoft-50"
                >
                  <p className="truncate text-sm font-medium text-gray-800">{s.title}</p>
                  <p className="text-xs text-gray-400">{timeAgo(s.updated_at)}</p>
                </button>
                <button
                  type="button"
                  className="btn-ghost p-2 text-gray-400 hover:text-pinksoft-700"
                  onClick={() => setRenameTarget(s)}
                  aria-label={`Ganti judul ${s.title}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="btn-ghost p-2 text-gray-400 hover:text-red-600"
                  onClick={() => setDeleteTarget(s)}
                  aria-label={`Hapus ${s.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {(sessions.data?.length ?? 0) > 0 && (
          <div className="mt-4 border-t border-pinksoft-100 pt-3">
            <button type="button" className="btn-ghost w-full text-red-600 hover:bg-red-50" onClick={() => setConfirmClearAll(true)}>
              <Trash2 className="h-4 w-4" />
              Hapus semua riwayat
            </button>
          </div>
        )}
      </Modal>

      <NameModal
        open={!!renameTarget}
        onClose={() => setRenameTarget(null)}
        title="Ganti judul chat"
        label="Judul"
        initial={renameTarget?.title ?? ""}
        onSubmit={confirmRename}
      />

      <ConfirmDialog
        open={confirmClearAll}
        onClose={() => setConfirmClearAll(false)}
        title="Hapus semua riwayat?"
        message="Semua obrolan Lutin-AI milikmu akan dihapus permanen dan tidak bisa dikembalikan."
        confirmText="Hapus semua"
        onConfirm={confirmDeleteAll}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Hapus riwayat chat?"
        message={`Obrolan "${deleteTarget?.title ?? ""}" akan dihapus permanen.`}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
