import { mergeAttributes, Node } from "@tiptap/core";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";

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

export const editorExtensions = (placeholder: string) => [
  StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
  Underline,
  Link.configure({
    openOnClick: false,
    autolink: true,
    HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
  }),
  Placeholder.configure({ placeholder }),
  IframeEmbed,
  AudioEmbed,
  VideoEmbed,
];
