import { FONT_STACKS, HIGHLIGHT_HEX, type BlockFont, type BlockSpacing } from "./editorStyles";

/**
 * Ekspor catatan jadi kartu gambar (PNG) / PDF — tanpa library tambahan, digambar langsung di <canvas>.
 * Mendukung: rata kiri/tengah/kanan, highlight warna, tebal/miring/garis bawah/coret, judul, daftar,
 * kutipan, garis pemisah, font sans/serif/mono, dan jarak baris. Gambar & embed tidak ikut digambar.
 */

export type CardTheme = "krem" | "putih" | "pink" | "gelap";

export const CARD_THEMES: Record<CardTheme, { label: string; bg: string; fg: string; muted: string }> = {
  krem: { label: "Krem", bg: "#F7E6DA", fg: "#2B2118", muted: "#8A6F5C" },
  putih: { label: "Putih", bg: "#FFFFFF", fg: "#1F2937", muted: "#9CA3AF" },
  pink: { label: "Pink", bg: "#FFEEF3", fg: "#6E3049", muted: "#C2567F" },
  gelap: { label: "Gelap", bg: "#1E1815", fg: "#F5EBE0", muted: "#A8957F" },
};

export interface CardOptions {
  theme: CardTheme;
  showTitle: boolean;
  showBrand: boolean;
  /** Pakai font serif untuk teks yang fontnya masih default (gaya puisi). */
  serif: boolean;
}

type Align = "left" | "center" | "right";
interface Style {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  highlight: string | null;
}
interface Run extends Style {
  text: string;
}
interface Block {
  kind: "text" | "hr";
  runs: Run[];
  align: Align;
  font: BlockFont;
  spacing: BlockSpacing;
  size: number;
  bold: boolean;
  indent: number;
  bullet?: string;
  quote?: boolean;
}

const W = 1080;
const PAD = 96;
const MIN_H = 1350;
const MAX_H = 12000;
const BASE = 46;
const HEAD_SIZE: Record<string, number> = { h1: 64, h2: 56, h3: 50 };
const LINE_FACTOR: Record<BlockSpacing, number> = { tight: 1.3, normal: 1.55, loose: 1.95 };
const GAP_FACTOR: Record<BlockSpacing, number> = { tight: 0.15, normal: 0.6, loose: 1.1 };
const BASE_STYLE: Style = { bold: false, italic: false, underline: false, strike: false, highlight: null };
const DARK_TEXT = "#2B2118";

function asAlign(v: string | null): Align {
  return v === "center" || v === "right" ? v : "left";
}
function asFont(v: string | null): BlockFont {
  return v === "serif" || v === "mono" ? v : "sans";
}
function asSpacing(v: string | null): BlockSpacing {
  return v === "tight" || v === "loose" ? v : "normal";
}

function parseBlocks(html: string): Block[] {
  const doc = new DOMParser().parseFromString(html || "", "text/html");
  const blocks: Block[] = [];

  const inline = (node: Node, st: Style, runs: Run[]) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent ?? "";
      if (t) runs.push({ text: t, ...st });
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    const tag = node.tagName.toLowerCase();
    if (tag === "br") {
      runs.push({ text: "\n", ...st });
      return;
    }
    if (["iframe", "audio", "video", "img", "script", "style"].includes(tag)) return;
    const next = { ...st };
    if (tag === "strong" || tag === "b") next.bold = true;
    if (tag === "em" || tag === "i") next.italic = true;
    if (tag === "u") next.underline = true;
    if (tag === "s" || tag === "del" || tag === "strike") next.strike = true;
    if (tag === "mark") next.highlight = HIGHLIGHT_HEX[node.getAttribute("data-color") ?? ""] ?? HIGHLIGHT_HEX.yellow;
    node.childNodes.forEach((c) => inline(c, next, runs));
  };

  const textBlock = (el: HTMLElement, extra: Partial<Block> = {}) => {
    const runs: Run[] = [];
    el.childNodes.forEach((c) => inline(c, BASE_STYLE, runs));
    blocks.push({
      kind: "text",
      runs,
      align: asAlign(el.getAttribute("data-align")),
      font: asFont(el.getAttribute("data-font")),
      spacing: asSpacing(el.getAttribute("data-spacing")),
      size: BASE,
      bold: false,
      indent: 0,
      ...extra,
    });
  };

  const walk = (el: Element, ctx: { indent: number; quote: boolean }) => {
    const tag = el.tagName.toLowerCase();
    if (!(el instanceof HTMLElement)) return;
    if (tag === "p") return textBlock(el, { indent: ctx.indent, quote: ctx.quote });
    if (tag in HEAD_SIZE) return textBlock(el, { size: HEAD_SIZE[tag], bold: true, indent: ctx.indent, quote: ctx.quote });
    if (tag === "hr") {
      blocks.push({ kind: "hr", runs: [], align: "left", font: "sans", spacing: "normal", size: BASE, bold: false, indent: 0 });
      return;
    }
    if (tag === "pre") {
      const text = (el.textContent ?? "").replace(/\n$/, "");
      blocks.push({
        kind: "text",
        runs: [{ text, ...BASE_STYLE }],
        align: "left",
        font: "mono",
        spacing: "tight",
        size: Math.round(BASE * 0.85),
        bold: false,
        indent: ctx.indent,
      });
      return;
    }
    if (tag === "blockquote") {
      Array.from(el.children).forEach((c) => walk(c, { indent: ctx.indent + 44, quote: true }));
      return;
    }
    if (tag === "ul" || tag === "ol") {
      let n = 0;
      Array.from(el.children).forEach((li) => {
        if (li.tagName.toLowerCase() !== "li") return;
        n += 1;
        let first = true;
        Array.from(li.children).forEach((c) => {
          const ct = c.tagName.toLowerCase();
          if (ct === "ul" || ct === "ol") {
            walk(c, { indent: ctx.indent + 48, quote: ctx.quote });
          } else if (c instanceof HTMLElement && (ct === "p" || ct in HEAD_SIZE)) {
            textBlock(c, { indent: ctx.indent + 48, quote: ctx.quote, bullet: first ? (tag === "ol" ? `${n}.` : "•") : undefined, align: "left" });
            first = false;
          } else {
            walk(c, { indent: ctx.indent + 48, quote: ctx.quote });
          }
        });
        if (first) {
          // <li> berisi teks langsung
          textBlock(li as HTMLElement, { indent: ctx.indent + 48, quote: ctx.quote, bullet: tag === "ol" ? `${n}.` : "•", align: "left" });
        }
      });
      return;
    }
    // elemen pembungkus lain
    Array.from(el.children).forEach((c) => walk(c, ctx));
  };

  Array.from(doc.body.children).forEach((c) => walk(c, { indent: 0, quote: false }));
  return blocks;
}

interface Token {
  text: string;
  style: Style;
  width: number;
  space: boolean;
}
interface Line {
  tokens: Token[];
  width: number;
}

export async function renderCard(title: string, html: string, opts: CardOptions): Promise<HTMLCanvasElement> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* abaikan */
    }
  }
  const theme = CARD_THEMES[opts.theme];
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung canvas.");

  const sansStack = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  const stackOf = (f: BlockFont) => {
    const eff: BlockFont = f === "sans" && opts.serif ? "serif" : f;
    return eff === "serif" ? FONT_STACKS.serif : eff === "mono" ? FONT_STACKS.mono : sansStack;
  };
  const fontStr = (b: Block, st: Style) =>
    `${st.italic ? "italic " : ""}${b.bold || st.bold ? "700" : "400"} ${b.size}px ${stackOf(b.font)}`;

  const blocks = parseBlocks(html).filter((b) => b.kind === "hr" || b.runs.some((r) => r.text.trim()) || true);

  // Rata dominan → dipakai untuk judul & pemusatan vertikal.
  const count: Record<Align, number> = { left: 0, center: 0, right: 0 };
  blocks.forEach((b) => b.kind === "text" && b.runs.some((r) => r.text.trim()) && (count[b.align] += 1));
  const major: Align = count.center > count.left && count.center >= count.right ? "center" : count.right > count.left ? "right" : "left";

  if (opts.showTitle && title.trim()) {
    blocks.unshift({
      kind: "text",
      runs: [{ text: title.trim(), ...BASE_STYLE }],
      align: major,
      font: "sans",
      spacing: "normal",
      size: 60,
      bold: true,
      indent: 0,
    });
  }

  const maxW = W - PAD * 2;
  const tokenize = (b: Block): Line[] => {
    const lines: Line[] = [];
    let cur: Line = { tokens: [], width: 0 };
    const avail = maxW - b.indent;
    const push = () => {
      while (cur.tokens.length && cur.tokens[cur.tokens.length - 1].space) {
        cur.width -= cur.tokens.pop()!.width;
      }
      lines.push(cur);
      cur = { tokens: [], width: 0 };
    };
    const add = (tk: Token) => {
      if (tk.space && cur.tokens.length === 0) return; // tidak ada spasi di awal baris
      if (!tk.space && cur.width + tk.width > avail && cur.tokens.length > 0) push();
      cur.tokens.push(tk);
      cur.width += tk.width;
    };
    for (const run of b.runs) {
      ctx.font = fontStr(b, run);
      const parts = run.text.split("\n");
      parts.forEach((part, pi) => {
        if (pi > 0) push();
        const pieces = part.match(/\s+|\S+/g) ?? [];
        for (const piece of pieces) {
          const space = /^\s/.test(piece);
          const text = space ? " " : piece;
          const width = ctx.measureText(text).width;
          if (!space && width > avail) {
            // kata sangat panjang: pecah per karakter
            for (const ch of Array.from(text)) {
              const cw = ctx.measureText(ch).width;
              add({ text: ch, style: run, width: cw, space: false });
            }
          } else {
            add({ text, style: run, width, space });
          }
        }
      });
    }
    push();
    return lines;
  };

  interface Laid {
    block: Block;
    lines: Line[];
    lineH: number;
    gap: number;
    height: number;
  }
  const laid: Laid[] = blocks.map((block) => {
    if (block.kind === "hr") return { block, lines: [], lineH: 0, gap: BASE * 0.9, height: 4 };
    const lines = tokenize(block);
    const lineH = block.size * LINE_FACTOR[block.spacing];
    const gap = block.size * GAP_FACTOR[block.spacing];
    return { block, lines, lineH, gap, height: lines.length * lineH };
  });

  const topPad = PAD;
  const bottomPad = opts.showBrand ? PAD + 56 : PAD;
  let content = 0;
  laid.forEach((l, i) => (content += l.height + (i > 0 ? l.gap : 0)));
  const H = Math.max(MIN_H, Math.ceil(topPad + content + bottomPad));
  if (H > MAX_H) throw new Error("Catatan terlalu panjang untuk dijadikan satu gambar. Coba pilih bagian yang lebih pendek.");

  canvas.width = W;
  canvas.height = H;

  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "alphabetic";

  let y = topPad;
  if (major === "center") y += Math.max(0, (H - topPad - bottomPad - content) / 2);

  const x0 = PAD;
  laid.forEach((l, i) => {
    const { block, lines, lineH } = l;
    if (i > 0) y += l.gap;

    if (block.kind === "hr") {
      ctx.fillStyle = theme.muted;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x0 + W * 0.3 - PAD * 0.3, y, W * 0.4 - PAD * 1.4 + PAD * 0.6, 3);
      ctx.globalAlpha = 1;
      y += l.height;
      return;
    }

    const blockTop = y;
    const contentX = x0 + block.indent;
    const avail = maxW - block.indent;

    lines.forEach((line, li) => {
      const baseline = y + (lineH - block.size) / 2 + block.size * 0.82;
      let x = contentX;
      if (block.align === "center") x = contentX + (avail - line.width) / 2;
      else if (block.align === "right") x = contentX + avail - line.width;

      // 1) highlight (gabungkan token berurutan dengan warna sama)
      let cx = x;
      let g: { start: number; end: number; color: string } | null = null;
      const flush = () => {
        if (!g) return;
        ctx.fillStyle = g.color;
        const pad = block.size * 0.16;
        const top = baseline - block.size * 0.9;
        const h = block.size * 1.14;
        ctx.beginPath();
        const rx = g.start - pad;
        const rw = g.end - g.start + pad * 2;
        const r = Math.min(12, h / 2);
        ctx.moveTo(rx + r, top);
        ctx.arcTo(rx + rw, top, rx + rw, top + h, r);
        ctx.arcTo(rx + rw, top + h, rx, top + h, r);
        ctx.arcTo(rx, top + h, rx, top, r);
        ctx.arcTo(rx, top, rx + rw, top, r);
        ctx.closePath();
        ctx.fill();
        g = null;
      };
      for (const tk of line.tokens) {
        const color = tk.style.highlight;
        if (color) {
          if (g && g.color === color) g.end = cx + tk.width;
          else {
            flush();
            g = { start: cx, end: cx + tk.width, color };
          }
        } else flush();
        cx += tk.width;
      }
      flush();

      // 2) teks + garis bawah / coret
      cx = x;
      for (const tk of line.tokens) {
        ctx.font = fontStr(block, tk.style);
        ctx.fillStyle = tk.style.highlight ? DARK_TEXT : theme.fg;
        if (!tk.space) ctx.fillText(tk.text, cx, baseline);
        if (tk.style.underline || tk.style.strike) {
          const thick = Math.max(2, block.size / 18);
          if (tk.style.underline) ctx.fillRect(cx, baseline + block.size * 0.1, tk.width, thick);
          if (tk.style.strike) ctx.fillRect(cx, baseline - block.size * 0.3, tk.width, thick);
        }
        cx += tk.width;
      }

      // 3) bullet / nomor
      if (block.bullet && li === 0) {
        ctx.font = fontStr(block, BASE_STYLE);
        ctx.fillStyle = theme.muted;
        ctx.textAlign = "right";
        ctx.fillText(block.bullet, contentX - 14, baseline);
        ctx.textAlign = "left";
      }
      y += lineH;
    });

    if (block.quote) {
      ctx.fillStyle = theme.muted;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(x0 + Math.max(0, block.indent - 30), blockTop, 6, Math.max(lineH, y - blockTop));
      ctx.globalAlpha = 1;
    }
  });

  if (opts.showBrand) {
    ctx.font = `600 28px ${sansStack}`;
    ctx.fillStyle = theme.muted;
    ctx.textAlign = "center";
    ctx.fillText("Lucibook", W / 2, H - PAD * 0.7);
    ctx.textAlign = "left";
  }
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png", quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Gagal membuat gambar."))), type, quality);
  });
}

/** PDF satu halaman berisi kartu (JPEG tertanam), ukuran halaman mengikuti kartu. */
export function canvasToPdfBlob(canvas: HTMLCanvasElement): Blob {
  const b64 = canvas.toDataURL("image/jpeg", 0.92).split(",")[1] ?? "";
  const bin = atob(b64);
  const jpg = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) jpg[i] = bin.charCodeAt(i);

  const w = (canvas.width * 0.75).toFixed(2);
  const h = (canvas.height * 0.75).toFixed(2);
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let pos = 0;
  const push = (d: string | Uint8Array) => {
    const u = typeof d === "string" ? enc.encode(d) : d;
    parts.push(u);
    pos += u.length;
  };
  const begin = (n: number) => {
    offsets[n] = pos;
    push(`${n} 0 obj\n`);
  };

  push("%PDF-1.4\n");
  begin(1);
  push("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  begin(2);
  push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  begin(3);
  push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`);
  begin(4);
  push(
    `<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`
  );
  push(jpg);
  push("\nendstream\nendobj\n");
  const content = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
  begin(5);
  push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);
  const xref = pos;
  push("xref\n0 6\n0000000000 65535 f \n");
  for (let n = 1; n <= 5; n++) push(`${String(offsets[n]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts as unknown as BlobPart[], { type: "application/pdf" });
}

export function cardFileName(title: string, ext: "png" | "pdf"): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${slug || "catatan"}-lucibook.${ext}`;
}
