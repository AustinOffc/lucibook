import { api, API_URL } from "./api";
import { LocalError } from "./offline/errors";
import type { User } from "./types";

const AVATAR_SIZE = 256;
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

type Nameable = Pick<User, "username" | "name"> | null | undefined;

export function displayName(user: Nameable): string {
  return user?.name?.trim() || user?.username || "";
}

export function initialOf(user: Nameable): string {
  return displayName(user).charAt(0).toUpperCase();
}

export function avatarSrc(user: Pick<User, "avatar_url"> | null | undefined): string | null {
  return user?.avatar_url ? `${API_URL}${user.avatar_url}` : null;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new LocalError("Gambar tidak dapat dibaca. Coba pilih file lain."));
    };
    img.src = url;
  });
}

async function prepareAvatar(file: File): Promise<{ mime: "image/jpeg"; data: string }> {
  if (!file.type.startsWith("image/")) throw new LocalError("File harus berupa gambar (JPG, PNG, atau WEBP).");
  if (file.size > MAX_SOURCE_BYTES) throw new LocalError("Ukuran gambar maksimal 10 MB.");

  const img = await loadImage(file);
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  if (!side) throw new LocalError("Gambar tidak valid.");

  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new LocalError("Browser tidak mendukung pengolahan gambar.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
  ctx.drawImage(
    img,
    (img.naturalWidth - side) / 2,
    (img.naturalHeight - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE
  );

  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  const data = dataUrl.split(",")[1];
  if (!data) throw new LocalError("Gagal memproses gambar.");
  return { mime: "image/jpeg", data };
}

export async function uploadAvatar(file: File): Promise<User> {
  const payload = await prepareAvatar(file);
  const { data } = await api.put<{ user: User }>("/profile/avatar", payload);
  return data.user;
}

export async function removeAvatar(): Promise<User> {
  const { data } = await api.delete<{ user: User }>("/profile/avatar");
  return data.user;
}

export async function updateProfile(input: {
  name?: string;
  username?: string;
  current_password?: string;
}): Promise<User> {
  const { data } = await api.patch<{ user: User }>("/profile", input);
  return data.user;
}

export async function changePassword(
  current_password: string,
  new_password: string
): Promise<{ user: User; token: string }> {
  const { data } = await api.put<{ user: User; token: string }>("/profile/password", {
    current_password,
    new_password,
  });
  return data;
}
