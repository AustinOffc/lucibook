import axios from "axios";
import { api } from "./api";

export type LutinModelId = "v1" | "v2";

export const LUTIN_MODELS: { id: LutinModelId; name: string; hint: string; supportsImage: boolean }[] = [
  { id: "v1", name: "Lutin-AI v1.0", hint: "Cepat dan ringan. Tidak mendukung gambar.", supportsImage: false },
  { id: "v2", name: "Lutin-AI v2.0", hint: "Mendukung gambar.", supportsImage: true },
];

/** Model yang aktif saat user baru membuka halaman Lutin-AI. */
export const DEFAULT_LUTIN_MODEL: LutinModelId = "v1";

export function getLutinModel(id: LutinModelId) {
  return LUTIN_MODELS.find((m) => m.id === id) ?? LUTIN_MODELS[0];
}

/** Server menolak karena sesi chat sudah mencapai batas -> user harus membuka chat baru. */
export function isSessionLimitError(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.data?.code === "SESSION_LIMIT";
}

export type LutinMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  has_image: boolean;
  created_at: string;
  /** Hanya ada di browser untuk pesan yang baru dikirim; gambar tidak disimpan di server. */
  preview?: string;
};

export type LutinSessionSummary = {
  id: string;
  title: string;
  model?: LutinModelId;
  created_at: string;
  updated_at: string;
};

export type LutinAttachment = {
  /** data URL untuk pratinjau */
  dataUrl: string;
  /** base64 murni (tanpa prefix) untuk dikirim ke server */
  base64: string;
};

export const LUTIN_SESSIONS_KEY = ["lutin-sessions"] as const;

export async function fetchSessions(): Promise<LutinSessionSummary[]> {
  const { data } = await api.get<{ sessions: LutinSessionSummary[] }>("/lutin-ai/sessions");
  return data.sessions;
}

export async function fetchSession(
  id: string
): Promise<{ id: string; title: string; model: LutinModelId; messages: LutinMessage[] }> {
  const { data } = await api.get(`/lutin-ai/sessions/${id}`);
  return data.session;
}

export async function removeSession(id: string): Promise<void> {
  await api.delete(`/lutin-ai/sessions/${id}`);
}

export async function renameSession(id: string, title: string): Promise<void> {
  await api.patch(`/lutin-ai/sessions/${id}`, { title });
}

export async function removeAllSessions(): Promise<void> {
  await api.delete("/lutin-ai/sessions");
}

export async function sendChat(input: {
  sessionId: string | null;
  model: LutinModelId;
  message: string;
  image: LutinAttachment | null;
}): Promise<{
  session: LutinSessionSummary;
  user_message: LutinMessage;
  assistant_message: LutinMessage;
}> {
  const { data } = await api.post(
    "/lutin-ai/chat",
    {
      session_id: input.sessionId ?? undefined,
      model: input.model,
      message: input.message,
      image: input.image ? { mime: "image/jpeg", data: input.image.base64 } : undefined,
    },
    { timeout: 90_000 }
  );
  return data;
}

/**
 * Kecilkan gambar (sisi terpanjang maks 1280px) dan ubah ke JPEG supaya upload cepat di HP
 * dan selalu di bawah batas ukuran server.
 */
export async function prepareImage(file: File, maxSide = 1280, quality = 0.85): Promise<LutinAttachment> {
  if (!file.type.startsWith("image/")) throw new Error("File yang dipilih bukan gambar");
  if (file.size > 20 * 1024 * 1024) throw new Error("Ukuran gambar terlalu besar (maks 20 MB)");

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Gambar ini tidak bisa dibaca. Coba format JPG atau PNG."));
      el.src = url;
    });

    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Browser tidak mendukung pemrosesan gambar");
    ctx.fillStyle = "#ffffff"; // latar putih untuk PNG transparan
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    return { dataUrl, base64: dataUrl.slice(dataUrl.indexOf(",") + 1) };
  } finally {
    URL.revokeObjectURL(url);
  }
}
