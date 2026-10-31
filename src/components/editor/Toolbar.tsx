"use client";

import type { Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  PlayCircle,
  Quote,
  Redo2,
  Strikethrough,
  Type,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { FormEvent, ReactNode, useState } from "react";
import { HIGHLIGHT_COLORS } from "@/lib/editorStyles";
import { parseEmbedUrl } from "@/lib/embed";
import { cn } from "@/lib/utils";
import Modal from "../ui/Modal";

function Btn({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      // Cegah editor kehilangan fokus/seleksi saat tombol diklik.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-lg text-gray-600 transition hover:bg-pinksoft-100 disabled:opacity-40",
        active && "bg-pinksoft-200 text-pinksoft-900"
      )}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-1 h-5 w-px shrink-0 bg-pinksoft-200" />;

export default function Toolbar({ editor }: { editor: Editor | null }) {
  const [dialog, setDialog] = useState<"link" | "embed" | "image" | null>(null);
  const [panel, setPanel] = useState<"highlight" | "style" | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  if (!editor) return null;
  const e = editor;
  const icon = "h-[18px] w-[18px]";

  function openDialog(kind: "link" | "embed" | "image") {
    setValue(kind === "link" ? (e.getAttributes("link").href as string) || "" : "");
    setError("");
    setDialog(kind);
  }

  function submit(ev: FormEvent) {
    ev.preventDefault();
    const raw = value.trim();

    if (dialog === "link") {
      if (!raw) {
        e.chain().focus().extendMarkRange("link").unsetLink().run();
      } else {
        const href = /^(https?:|mailto:)/i.test(raw) ? raw : `https://${raw}`;
        e.chain().focus().extendMarkRange("link").setLink({ href }).run();
      }
      setDialog(null);
      return;
    }

    if (dialog === "image") {
      if (!/^https:\/\/\S+$/i.test(raw)) {
        setError("Tautan gambar harus diawali https:// dan tidak boleh mengandung spasi.");
        return;
      }
      e.chain().focus().insertContent([{ type: "imageEmbed", attrs: { src: raw, alt: "" } }, { type: "paragraph" }]).run();
      setDialog(null);
      return;
    }

    const parsed = parseEmbedUrl(raw);
    if (!parsed) {
      setError("Tautan tidak dikenali. Pakai YouTube, Spotify, Vimeo, SoundCloud, atau tautan langsung .mp3 / .mp4.");
      return;
    }
    const node =
      parsed.type === "iframe"
        ? {
            type: "iframeEmbed",
            attrs: {
              src: parsed.src,
              height: String(parsed.height),
              class: parsed.kind === "video" ? "embed-video" : "embed-audio",
            },
          }
        : { type: parsed.type === "audio" ? "audioEmbed" : "videoEmbed", attrs: { src: parsed.src } };

    e.chain().focus().insertContent([node, { type: "paragraph" }]).run();
    setDialog(null);
  }

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center gap-0.5 overflow-x-auto rounded-t-2xl border-b border-pinksoft-100 bg-white/95 px-2 py-1.5 backdrop-blur">
        <Btn label="Tebal" active={e.isActive("bold")} onClick={() => e.chain().focus().toggleBold().run()}>
          <Bold className={icon} />
        </Btn>
        <Btn label="Miring" active={e.isActive("italic")} onClick={() => e.chain().focus().toggleItalic().run()}>
          <Italic className={icon} />
        </Btn>
        <Btn label="Garis bawah" active={e.isActive("underline")} onClick={() => e.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className={icon} />
        </Btn>
        <Btn label="Coret" active={e.isActive("strike")} onClick={() => e.chain().focus().toggleStrike().run()}>
          <Strikethrough className={icon} />
        </Btn>
        <Btn label="Highlight" active={e.isActive("highlight")} onClick={() => setPanel("highlight")}>
          <Highlighter className={icon} />
        </Btn>
        <Sep />
        <Btn label="Rata kiri" active={e.isActive({ textAlign: "left" })} onClick={() => e.chain().focus().setTextAlign("left").run()}>
          <AlignLeft className={icon} />
        </Btn>
        <Btn label="Rata tengah" active={e.isActive({ textAlign: "center" })} onClick={() => e.chain().focus().setTextAlign("center").run()}>
          <AlignCenter className={icon} />
        </Btn>
        <Btn label="Rata kanan" active={e.isActive({ textAlign: "right" })} onClick={() => e.chain().focus().setTextAlign("right").run()}>
          <AlignRight className={icon} />
        </Btn>
        <Btn label="Font & jarak baris" onClick={() => setPanel("style")}>
          <Type className={icon} />
        </Btn>
        <Sep />
        <Btn label="Judul 1" active={e.isActive("heading", { level: 1 })} onClick={() => e.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 className={icon} />
        </Btn>
        <Btn label="Judul 2" active={e.isActive("heading", { level: 2 })} onClick={() => e.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className={icon} />
        </Btn>
        <Btn label="Judul 3" active={e.isActive("heading", { level: 3 })} onClick={() => e.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className={icon} />
        </Btn>
        <Sep />
        <Btn label="Daftar poin" active={e.isActive("bulletList")} onClick={() => e.chain().focus().toggleBulletList().run()}>
          <List className={icon} />
        </Btn>
        <Btn label="Daftar angka" active={e.isActive("orderedList")} onClick={() => e.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className={icon} />
        </Btn>
        <Btn label="Kutipan" active={e.isActive("blockquote")} onClick={() => e.chain().focus().toggleBlockquote().run()}>
          <Quote className={icon} />
        </Btn>
        <Btn label="Blok kode" active={e.isActive("codeBlock")} onClick={() => e.chain().focus().toggleCodeBlock().run()}>
          <Code2 className={icon} />
        </Btn>
        <Btn label="Garis pemisah" onClick={() => e.chain().focus().setHorizontalRule().run()}>
          <Minus className={icon} />
        </Btn>
        <Sep />
        <Btn label="Tautan" active={e.isActive("link")} onClick={() => openDialog("link")}>
          <Link2 className={icon} />
        </Btn>
        <Btn label="Sematkan audio / video" onClick={() => openDialog("embed")}>
          <PlayCircle className={icon} />
        </Btn>
        <Btn label="Sisipkan gambar" onClick={() => openDialog("image")}>
          <ImageIcon className={icon} />
        </Btn>
        <Sep />
        <Btn label="Urungkan" disabled={!e.can().undo()} onClick={() => e.chain().focus().undo().run()}>
          <Undo2 className={icon} />
        </Btn>
        <Btn label="Ulangi" disabled={!e.can().redo()} onClick={() => e.chain().focus().redo().run()}>
          <Redo2 className={icon} />
        </Btn>
      </div>

      <Modal open={dialog !== null} onClose={() => setDialog(null)} title={dialog === "link" ? "Sisipkan tautan" : dialog === "image" ? "Sisipkan gambar" : "Sematkan audio / video"}>
        <form onSubmit={submit} className="space-y-3">
          <input
            autoFocus
            className="input"
            placeholder={
              dialog === "link"
                ? "https://contoh.com"
                : dialog === "image"
                  ? "https://contoh.com/gambar.jpg"
                  : "Tempel tautan YouTube / Spotify / Vimeo / SoundCloud"
            }
            value={value}
            onChange={(ev) => setValue(ev.target.value)}
          />
          {dialog === "link" && <p className="text-xs text-gray-500">Kosongkan lalu simpan untuk menghapus tautan.</p>}
          {dialog === "image" && (
            <p className="text-xs text-gray-500">Tempel tautan langsung ke gambar (https). Gambar tampil rata tengah dan menyesuaikan lebar layar.</p>
          )}
          {dialog === "embed" && (
            <p className="text-xs text-gray-500">
              Embed dibatasi ke YouTube, Spotify, Vimeo, dan SoundCloud (sama dengan whitelist server), atau berkas .mp3/.mp4 langsung.
            </p>
          )}
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-outline" onClick={() => setDialog(null)}>
              Batal
            </button>
            <button type="submit" className="btn-primary">
              {dialog === "link" ? "Simpan" : dialog === "image" ? "Sisipkan" : "Sematkan"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={panel === "highlight"} onClose={() => setPanel(null)} title="Highlight teks">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Pilih teks lebih dulu, lalu ketuk warna.</p>
          <div className="flex flex-wrap gap-3">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => {
                  e.chain().focus().setHighlight(c.id).run();
                  setPanel(null);
                }}
                className="flex flex-col items-center gap-1 text-xs text-gray-600"
                aria-label={`Highlight ${c.label}`}
              >
                <span className="h-10 w-10 rounded-full border border-black/10 shadow-sm" style={{ background: c.hex }} />
                {c.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onMouseDown={(ev) => ev.preventDefault()}
            onClick={() => {
              e.chain().focus().unsetHighlight().run();
              setPanel(null);
            }}
            className="btn-outline w-full"
          >
            Hapus highlight
          </button>
        </div>
      </Modal>

      <Modal open={panel === "style"} onClose={() => setPanel(null)} title="Font & jarak baris">
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-700">Font</p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "sans", label: "Sans", cls: "font-sans" },
                  { id: "serif", label: "Serif", cls: "font-serif" },
                  { id: "mono", label: "Mono", cls: "font-mono" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => e.chain().focus().setBlockFont(f.id).run()}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-base",
                    f.cls,
                    e.isActive({ font: f.id }) ? "border-pinksoft-400 bg-pinksoft-100 text-pinksoft-900" : "border-pinksoft-200 text-gray-700"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-700">Jarak baris</p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "tight", label: "Rapat" },
                  { id: "normal", label: "Normal" },
                  { id: "loose", label: "Lega" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => e.chain().focus().setBlockSpacing(f.id).run()}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-sm",
                    e.isActive({ spacing: f.id }) ? "border-pinksoft-400 bg-pinksoft-100 text-pinksoft-900" : "border-pinksoft-200 text-gray-700"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">Berlaku untuk paragraf/baris yang sedang dipilih. Rapat cocok untuk baris puisi.</p>
          </div>
          <button type="button" className="btn-primary w-full" onClick={() => setPanel(null)}>
            Selesai
          </button>
        </div>
      </Modal>
    </>
  );
}
