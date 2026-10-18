/**
 * Explore (catatan publik) tetap butuh server. Hasil terakhir disimpan supaya halaman yang
 * pernah dibuka masih bisa dibaca saat offline.
 */
import { api } from "../api";
import type { Note } from "../types";
import { dbName, runTx } from "./idb";

const NAME = dbName(null);
const MAX_ENTRIES = 40;

interface Entry {
  key: string;
  at: number;
  value: unknown;
}

async function readCache<T>(key: string): Promise<T | undefined> {
  try {
    const e = await runTx(NAME, ["cache"], "readonly", (tx) => tx.get<Entry>("cache", key));
    return e?.value as T | undefined;
  } catch {
    return undefined;
  }
}

async function writeCache(key: string, value: unknown) {
  try {
    await runTx(NAME, ["cache"], "readwrite", async (tx) => {
      await tx.put("cache", { key, at: Date.now(), value } satisfies Entry, key);
      const all = await tx.getAll<Entry>("cache");
      if (all.length > MAX_ENTRIES) {
        all.sort((a, b) => a.at - b.at);
        for (const old of all.slice(0, all.length - MAX_ENTRIES)) await tx.del("cache", old.key);
      }
    });
  } catch {
    /* cache bersifat opsional */
  }
}

const isNetworkError = (err: unknown) => !(err as { response?: unknown })?.response;

export async function fetchExplore(q: string): Promise<Note[]> {
  const key = `explore:list:${q}`;
  try {
    const notes = (await api.get<{ notes: Note[] }>("/explore", { params: q ? { q } : undefined })).data.notes;
    void writeCache(key, notes);
    return notes;
  } catch (err) {
    if (isNetworkError(err)) {
      const cached = await readCache<Note[]>(key);
      if (cached) return cached;
    }
    throw err;
  }
}

export async function fetchPublicNote(id: string): Promise<Note> {
  const key = `explore:note:${id}`;
  try {
    const note = (await api.get<{ note: Note }>(`/explore/${id}`)).data.note;
    void writeCache(key, note);
    return note;
  } catch (err) {
    if (isNetworkError(err)) {
      const cached = await readCache<Note>(key);
      if (cached) return cached;
    }
    throw err;
  }
}
