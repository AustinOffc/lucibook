"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { useRef } from "react";
import { editorExtensions } from "./extensions";
import Toolbar from "./Toolbar";

export default function RichEditor({
  initialContent,
  onChange,
}: {
  initialContent: string;
  onChange: (html: string) => void;
}) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: editorExtensions("Mulai menulis catatanmu…"),
    content: initialContent,
    immediatelyRender: false, // hindari mismatch hidrasi SSR
    editorProps: {
      attributes: { class: "note-content min-h-[50vh] px-4 py-4 sm:px-6 focus:outline-none" },
    },
    onUpdate: ({ editor }) => onChangeRef.current(editor.getHTML()),
  });

  return (
    <div className="card">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
