import { Extension, Mark, mergeAttributes, Node } from "@tiptap/core";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import type { BlockFont, BlockSpacing, HighlightId } from "@/lib/editorStyles";

/**
 * Atribut iframe dibatasi ke yang diizinkan sanitizer backend:
 * src, width, height, allow, allowfullscreen, frameborder (+ class).
 */
export const IframeEmbed = Node.create({
  name: "iframeEmbed",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      width: { default: "100%" },
      height: { default: "315" },
      class: { default: "embed-video" },
      allow: { default: "autoplay; encrypted-media; picture-in-picture; fullscreen" },
      allowfullscreen: { default: "true" },
      frameborder: { default: "0" },
    };
  },
  parseHTML() {
    return [{ tag: "iframe[src]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["iframe", mergeAttributes(HTMLAttributes)];
  },
});

function mediaNode(tag: "audio" | "video") {
  return Node.create({
    name: `${tag}Embed`,
    group: "block",
    atom: true,
    draggable: true,
    addAttributes() {
      return { src: { default: null }, controls: { default: "true" } };
    },
    parseHTML() {
      return [{ tag: `${tag}[src]` }];
    },
    renderHTML({ HTMLAttributes }) {
      return [tag, mergeAttributes(HTMLAttributes)];
    },
  });
}

export const AudioEmbed = mediaNode("audio");
export const VideoEmbed = mediaNode("video");

/**
 * Rata teks: kiri / tengah / kanan.
 * Disimpan sebagai atribut `data-align` di <p>, <h1>-<h3> (kiri = default, tidak ditulis).
 * Nilainya divalidasi juga oleh sanitizer backend.
 */
export type TextAlignValue = "left" | "center" | "right";
const ALIGN_VALUES: TextAlignValue[] = ["left", "center", "right"];
const ALIGN_TYPES = ["paragraph", "heading"];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textAlign: {
      setTextAlign: (alignment: TextAlignValue) => ReturnType;
    };
  }
}

export const TextAlign = Extension.create({
  name: "textAlign",
  addGlobalAttributes() {
    return [
      {
        types: ALIGN_TYPES,
        attributes: {
          textAlign: {
            default: "left",
            parseHTML: (el: HTMLElement) => {
              const v = el.getAttribute("data-align");
              return v && ALIGN_VALUES.includes(v as TextAlignValue) ? v : "left";
            },
            renderHTML: (attrs: Record<string, unknown>) =>
              attrs.textAlign && attrs.textAlign !== "left" ? { "data-align": attrs.textAlign as string } : {},
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setTextAlign:
        (alignment: TextAlignValue) =>
        ({ commands }) => {
          if (!ALIGN_VALUES.includes(alignment)) return false;
          return ALIGN_TYPES.map((t) => commands.updateAttributes(t, { textAlign: alignment })).every(Boolean);
        },
    };
  },
  addKeyboardShortcuts() {
    return {
      "Mod-Shift-l": () => this.editor.commands.setTextAlign("left"),
      "Mod-Shift-e": () => this.editor.commands.setTextAlign("center"),
      "Mod-Shift-r": () => this.editor.commands.setTextAlign("right"),
    };
  },
});

/**
 * Highlight warna (mirip blok warna di teks TikTok). Disimpan sebagai <mark data-color="orange">.
 */
const HIGHLIGHT_IDS = ["orange", "yellow", "pink", "green", "blue"];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    highlight: {
      setHighlight: (color: HighlightId) => ReturnType;
      unsetHighlight: () => ReturnType;
    };
  }
}

export const Highlight = Mark.create({
  name: "highlight",
  addAttributes() {
    return {
      color: {
        default: "yellow",
        parseHTML: (el: HTMLElement) => {
          const v = el.getAttribute("data-color");
          return v && HIGHLIGHT_IDS.includes(v) ? v : "yellow";
        },
        renderHTML: (attrs: Record<string, unknown>) => ({ "data-color": String(attrs.color || "yellow") }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "mark" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["mark", mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return {
      setHighlight:
        (color: HighlightId) =>
        ({ commands }) =>
          commands.setMark(this.name, { color }),
      unsetHighlight:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name, { extendEmptyMarkRange: true }),
    };
  },
});

/**
 * Font (sans/serif/mono) dan jarak baris (rapat/normal/lega) per paragraf & judul.
 * Disimpan sebagai data-font / data-spacing (nilai default tidak ditulis).
 */
const FONT_VALUES: BlockFont[] = ["sans", "serif", "mono"];
const SPACING_VALUES: BlockSpacing[] = ["tight", "normal", "loose"];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    blockStyle: {
      setBlockFont: (font: BlockFont) => ReturnType;
      setBlockSpacing: (spacing: BlockSpacing) => ReturnType;
    };
  }
}

export const BlockStyle = Extension.create({
  name: "blockStyle",
  addGlobalAttributes() {
    return [
      {
        types: ALIGN_TYPES,
        attributes: {
          font: {
            default: "sans",
            parseHTML: (el: HTMLElement) => {
              const v = el.getAttribute("data-font");
              return v && FONT_VALUES.includes(v as BlockFont) ? v : "sans";
            },
            renderHTML: (attrs: Record<string, unknown>) =>
              attrs.font && attrs.font !== "sans" ? { "data-font": attrs.font as string } : {},
          },
          spacing: {
            default: "normal",
            parseHTML: (el: HTMLElement) => {
              const v = el.getAttribute("data-spacing");
              return v && SPACING_VALUES.includes(v as BlockSpacing) ? v : "normal";
            },
            renderHTML: (attrs: Record<string, unknown>) =>
              attrs.spacing && attrs.spacing !== "normal" ? { "data-spacing": attrs.spacing as string } : {},
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setBlockFont:
        (font: BlockFont) =>
        ({ commands }) => {
          if (!FONT_VALUES.includes(font)) return false;
          return ALIGN_TYPES.map((t) => commands.updateAttributes(t, { font })).every(Boolean);
        },
      setBlockSpacing:
        (spacing: BlockSpacing) =>
        ({ commands }) => {
          if (!SPACING_VALUES.includes(spacing)) return false;
          return ALIGN_TYPES.map((t) => commands.updateAttributes(t, { spacing })).every(Boolean);
        },
    };
  },
});

/** Gambar dari tautan https (atribut dibatasi ke src & alt sesuai sanitizer backend). */
export const ImageEmbed = Node.create({
  name: "imageEmbed",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return { src: { default: null }, alt: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "img[src]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes)];
  },
});

export const editorExtensions = (placeholder: string) => [
  StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
  Underline,
  TextAlign,
  BlockStyle,
  Highlight,
  Link.configure({
    openOnClick: false,
    autolink: true,
    HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
  }),
  Placeholder.configure({ placeholder }),
  IframeEmbed,
  AudioEmbed,
  VideoEmbed,
  ImageEmbed,
];
