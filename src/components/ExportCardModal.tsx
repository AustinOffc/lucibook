"use client";

import { Download, FileText, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CARD_THEMES, canvasToBlob, canvasToPdfBlob, cardFileName, renderCard, type CardOptions, type CardTheme } from "@/lib/exportCard";
import { cn } from "@/lib/utils";
import Modal from "./ui/Modal";

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Bagikan catatan sebagai kartu gambar (PNG) atau PDF, mirip kartu puisi di TikTok. */
export default function ExportCardModal({
  open,
  onClose,
  title,
  html,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  html: string;
}) {
  const [opts, setOpts] = useState<CardOptions>({ theme: "krem", showTitle: false, showBrand: true, serif: true });
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    try {
      const f = new File([""], "a.png", { type: "image/png" });
      setCanShare(typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [f] }));
    } catch {
      setCanShare(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError("");
    renderCard(title, html, opts)
      .then((c) => {
        if (cancelled) return;
        canvasRef.current = c;
        setPreview(c.toDataURL("image/png"));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        canvasRef.current = null;
        setPreview("");
        setError(err instanceof Error ? err.message : "Gagal membuat kartu.");
      });
    return () => {
      cancelled = true;
    };
  }, [open, title, html, opts]);

  async function run(kind: "png" | "pdf" | "share") {
    const c = canvasRef.current;
    if (!c) return;
    setBusy(true);
    try {
      if (kind === "pdf") {
        download(canvasToPdfBlob(c), cardFileName(title, "pdf"));
      } else {
        const blob = await canvasToBlob(c, "image/png");
        if (kind === "png") download(blob, cardFileName(title, "png"));
        else {
          const file = new File([blob], cardFileName(title, "png"), { type: "image/png" });
          await navigator.share({ files: [file], title: title || "Lucibook" });
        }
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setError(err instanceof Error ? err.message : "Gagal mengekspor.");
      }
    } finally {
      setBusy(false);
    }
  }

  const toggle = (key: "showTitle" | "showBrand" | "serif", label: string) => (
    <label className="flex items-center gap-2 text-sm text-gray-700">
      <input
        type="checkbox"
        className="h-4 w-4 accent-pinksoft-500"
        checked={opts[key]}
        onChange={(e) => setOpts((o) => ({ ...o, [key]: e.target.checked }))}
      />
      {label}
    </label>
  );

  return (
    <Modal open={open} onClose={onClose} title="Bagikan sebagai gambar">
      <div className="space-y-4">
        <div className="grid min-h-[8rem] place-items-center rounded-xl bg-gray-50 p-2">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Pratinjau kartu" className="max-h-[38vh] w-auto rounded-lg shadow" />
          ) : error ? (
            <p className="px-3 py-6 text-center text-sm text-red-600">{error}</p>
          ) : (
            <p className="text-sm text-gray-400">Menyiapkan pratinjau…</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {(Object.keys(CARD_THEMES) as CardTheme[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setOpts((o) => ({ ...o, theme: t }))}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
                opts.theme === t ? "border-pinksoft-400 bg-pinksoft-100 text-pinksoft-900" : "border-pinksoft-200 text-gray-600"
              )}
            >
              <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: CARD_THEMES[t].bg }} />
              {CARD_THEMES[t].label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {toggle("serif", "Font serif (gaya puisi)")}
          {toggle("showTitle", "Sertakan judul")}
          {toggle("showBrand", "Tanda Lucibook di bawah")}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn-primary" disabled={!preview || busy} onClick={() => run("png")}>
            <Download className="h-4 w-4" /> Unduh PNG
          </button>
          <button type="button" className="btn-outline" disabled={!preview || busy} onClick={() => run("pdf")}>
            <FileText className="h-4 w-4" /> Unduh PDF
          </button>
          {canShare && (
            <button type="button" className="btn-outline col-span-2" disabled={!preview || busy} onClick={() => run("share")}>
              <Share2 className="h-4 w-4" /> Bagikan…
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500">Gambar, video, dan embed tidak ikut tergambar di kartu; hanya teks dan formatnya.</p>
      </div>
    </Modal>
  );
}
