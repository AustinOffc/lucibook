"use client";

import { ArrowLeft, ImageIcon, MessageSquare } from "lucide-react";
import Link from "next/link";
import ChatText from "@/components/lutin/ChatText";
import EmptyState from "@/components/ui/EmptyState";
import { BlockSpinner } from "@/components/ui/Spinner";
import { useOwnerChat } from "@/lib/owner";
import { cn, formatDateTime } from "@/lib/utils";
import { useRouteId } from "@/lib/useRouteId";

export default function OwnerChatPage() {
  const id = useRouteId("/owner/chats/");
  const { data: chat, isLoading, isError } = useOwnerChat(id);

  if (isLoading) return <BlockSpinner />;
  if (isError || !chat) {
    return (
      <EmptyState
        icon={<MessageSquare className="h-6 w-6" />}
        title="Sesi chat tidak ditemukan"
        hint="Sesi ini mungkin sudah dihapus oleh pengguna."
        action={
          <Link href="/owner/users" className="btn-primary">
            Kembali ke Pengguna
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/owner/users/${chat.user.id}`} className="btn-ghost -ml-3 mb-2 px-3 py-2">
        <ArrowLeft className="h-4 w-4" /> @{chat.user.username}
      </Link>

      <div className="card mb-4 p-5">
        <h1 className="text-xl font-bold text-gray-900">{chat.title}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Dimulai {formatDateTime(chat.created_at)} · {chat.messages.length} pesan · hanya baca
        </p>
      </div>

      <div className="space-y-3">
        {chat.messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                m.role === "user" ? "bg-pinksoft-600 text-white" : "border border-pinksoft-100 bg-white text-gray-800"
              )}
            >
              {m.has_image && (
                <p className="mb-1 inline-flex items-center gap-1 text-xs opacity-80">
                  <ImageIcon className="h-3.5 w-3.5" /> Melampirkan gambar (tidak disimpan)
                </p>
              )}
              {m.role === "user" ? <p className="whitespace-pre-wrap break-words">{m.content}</p> : <ChatText text={m.content} />}
              <p className={cn("mt-1 text-[10px]", m.role === "user" ? "text-white/70" : "text-gray-400")}>{formatDateTime(m.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
