/**
 * Pembungkus IndexedDB yang sangat tipis (tanpa dependensi).
 * Satu database per pengguna: `lucibook:<userId>` (data milik user lain tidak pernah tercampur).
 */

export type StoreName = "books" | "notes" | "contents" | "labels" | "outbox" | "idmap" | "meta" | "cache";

const STORES: { name: StoreName; options?: IDBObjectStoreParameters }[] = [
  { name: "books", options: { keyPath: "id" } },
  { name: "notes", options: { keyPath: "id" } }, // metadata catatan (tanpa isi) supaya daftar tetap ringan
  { name: "contents", options: { keyPath: "id" } }, // isi HTML catatan: { id, content }
  { name: "labels", options: { keyPath: "id" } },
  { name: "outbox", options: { keyPath: "seq", autoIncrement: true } }, // antrean perubahan yang belum terkirim
  { name: "idmap", options: { keyPath: "tmp" } }, // id sementara -> id server
  { name: "meta" }, // key-value
  { name: "cache" }, // cache bebas (Explore)
];

const DB_VERSION = 1;
const opened = new Map<string, Promise<IDBDatabase>>();

export function dbName(userId: string | null) {
  return userId ? `lucibook:${userId}` : "lucibook:public";
}

export function openDb(name: string): Promise<IDBDatabase> {
  let p = opened.get(name);
  if (p) return p;
  p = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB tidak tersedia di browser ini"));
      return;
    }
    const req = indexedDB.open(name, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of STORES) {
        if (!db.objectStoreNames.contains(s.name)) db.createObjectStore(s.name, s.options);
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      // Bila tab lain meminta upgrade / hapus database, lepaskan koneksi ini.
      db.onversionchange = () => {
        db.close();
        opened.delete(name);
      };
      resolve(db);
    };
    req.onerror = () => reject(req.error ?? new Error("Gagal membuka database lokal"));
    req.onblocked = () => reject(new Error("Database lokal terblokir oleh tab lain"));
  });
  p.catch(() => opened.delete(name));
  opened.set(name, p);
  return p;
}

export async function deleteDb(name: string): Promise<void> {
  const existing = opened.get(name);
  if (existing) {
    try {
      (await existing).close();
    } catch {
      /* abaikan */
    }
    opened.delete(name);
  }
  if (typeof indexedDB === "undefined") return;
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

const wrap = <T>(req: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

/** Operasi di dalam satu transaksi. Hanya `await` operasi Tx di dalam `run` (jangan fetch/timeout). */
export class Tx {
  constructor(private t: IDBTransaction) {}
  get<T>(store: StoreName, key: IDBValidKey) {
    return wrap<T | undefined>(this.t.objectStore(store).get(key) as IDBRequest<T | undefined>);
  }
  getAll<T>(store: StoreName) {
    return wrap<T[]>(this.t.objectStore(store).getAll() as IDBRequest<T[]>);
  }
  put<T>(store: StoreName, value: T, key?: IDBValidKey) {
    return wrap<IDBValidKey>(this.t.objectStore(store).put(value, key));
  }
  del(store: StoreName, key: IDBValidKey) {
    return wrap<undefined>(this.t.objectStore(store).delete(key));
  }
  clear(store: StoreName) {
    return wrap<undefined>(this.t.objectStore(store).clear());
  }
}

export async function runTx<T>(
  name: string,
  stores: StoreName[],
  mode: IDBTransactionMode,
  run: (tx: Tx) => Promise<T>
): Promise<T> {
  const db = await openDb(name);
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(stores, mode);
    let result: T;
    let failed = false;
    t.oncomplete = () => (failed ? undefined : resolve(result));
    t.onerror = () => {
      failed = true;
      reject(t.error);
    };
    t.onabort = () => {
      failed = true;
      reject(t.error ?? new Error("Transaksi dibatalkan"));
    };
    run(new Tx(t)).then(
      (r) => {
        result = r;
      },
      (err) => {
        failed = true;
        try {
          t.abort();
        } catch {
          /* sudah selesai */
        }
        reject(err);
      }
    );
  });
}
