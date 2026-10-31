/**
 * Konstanta gaya editor yang dipakai bersama oleh editor, CSS (globals.css) dan
 * ekspor kartu gambar/PDF. Jika warna diubah, samakan juga dengan `.note-content mark[...]` di globals.css
 * dan daftar `data-color` di backend (src/utils/sanitize.ts).
 */
export const HIGHLIGHT_COLORS = [
  { id: "orange", label: "Oranye", hex: "#F9A66C" },
  { id: "yellow", label: "Kuning", hex: "#FDE047" },
  { id: "pink", label: "Pink", hex: "#F9A8D4" },
  { id: "green", label: "Hijau", hex: "#86EFAC" },
  { id: "blue", label: "Biru", hex: "#93C5FD" },
] as const;

export type HighlightId = (typeof HIGHLIGHT_COLORS)[number]["id"];

export const HIGHLIGHT_HEX: Record<string, string> = Object.fromEntries(HIGHLIGHT_COLORS.map((c) => [c.id, c.hex]));

export const FONT_STACKS = {
  serif: 'Georgia, "Times New Roman", ui-serif, serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
} as const;

export type BlockFont = "sans" | "serif" | "mono";
export type BlockSpacing = "tight" | "normal" | "loose";
