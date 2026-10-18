/** Ringkasan teks polos — salinan persis dari `excerpt()` di backend (src/utils/sanitize.ts). */
export function excerpt(html: string, length = 160): string {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > length ? text.slice(0, length) + "…" : text;
}

export const TRASH_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export function expiresAt(deletedAt: string): string {
  return new Date(new Date(deletedAt).getTime() + TRASH_DAYS * DAY_MS).toISOString();
}

export function isTrashExpired(deletedAt: string): boolean {
  return new Date(deletedAt).getTime() < Date.now() - TRASH_DAYS * DAY_MS;
}

export function tmpId(): string {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `tmp_${rnd}`;
}

export const isTmpId = (id: string) => id.startsWith("tmp_");
export const nowIso = () => new Date().toISOString();
