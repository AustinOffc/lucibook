"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { useRef, useState } from "react";
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
  const [stats, setStats] = useState({ words: 0, chars: 0 });

  const calc = (ed: Editor) => {
    const text = ed.getText({ blockSeparator: " " }).trim();
    setStats({ words: text ? text.split(/\s+/).length : 0, chars: text.length });
  };

  const editor = useEditor({
    extensions: editorExtensions("Mulai menulis catatanmu…"),
    content: initialContent,
    immediatelyRender: false, // hindari mismatch hidrasi SSR
    editorProps: {
      attributes: { class: "note-content min-h-[50vh] px-4 py-4 sm:px-6 focus:outline-none" },
    },
    onCreate: ({ editor }) => calc(editor),
    onUpdate: ({ editor }) => {
      onChangeRef.current(editor.getHTML());
      calc(editor);
    },
  });

  const minutes = stats.words > 0 ? Math.max(1, Math.ceil(stats.words / 200)) : 0;

  return (
    <div className="card">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-pinksoft-100 px-4 py-2 text-xs text-gray-400 sm:px-6">
        <span>{stats.words} kata</span>
        <span>{stats.chars} karakter</span>
        {minutes > 0 && <span>±{minutes} menit baca</span>}
      </div>
    </div>
  );
}
