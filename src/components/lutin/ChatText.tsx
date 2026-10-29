"use client";

import { Check, Copy } from "lucide-react";
import { ReactNode, useState } from "react";

/**
 * Render ringan untuk jawaban AI: blok kode ```, **tebal**, `kode`, dan daftar "- ".
 * Semua dirender sebagai node React (bukan HTML mentah), jadi aman dari XSS.
 */

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard bisa diblokir; abaikan */
    }
  }

  return (
    <div className="my-2 overflow-hidden rounded-xl bg-pinksoft-900 text-pinksoft-50">
      <div className="flex items-center justify-between px-3 py-1.5 text-[11px] text-pinksoft-200">
        <span className="uppercase tracking-wide">{lang || "kode"}</span>
        <button type="button" onClick={copy} className="flex items-center gap-1 hover:text-white" aria-label="Salin kode">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Tersalin" : "Salin"}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 pb-3 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*\n]+\*\*|`[^`\n]+`)/g).map((part, i) => {
    if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded-md bg-pinksoft-100 px-1.5 py-0.5 text-[0.85em] text-pinksoft-900">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function TextBlock({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim());
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} className="whitespace-pre-wrap [&:not(:first-child)]:mt-2">
          {p
            .split("\n")
            .map((line) => line.replace(/^(\s*)[-*]\s+/, "$1• "))
            .map((line, j, arr) => (
              <span key={j}>
                {renderInline(line)}
                {j < arr.length - 1 ? "\n" : null}
              </span>
            ))}
        </p>
      ))}
    </>
  );
}

export default function ChatText({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  const fence = /```([\w+#.-]*)\n?([\s\S]*?)```/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = fence.exec(text)) !== null) {
    if (match.index > last) nodes.push(<TextBlock key={`t${last}`} text={text.slice(last, match.index)} />);
    nodes.push(<CodeBlock key={`c${match.index}`} lang={match[1]} code={match[2].replace(/\n$/, "")} />);
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(<TextBlock key={`t${last}`} text={text.slice(last)} />);

  return <div className="break-words text-sm leading-relaxed">{nodes}</div>;
}
