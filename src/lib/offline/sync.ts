/**
 * Mesin sinkronisasi: mengirim antrean perubahan (outbox) ke server saat online,
 * lalu mengunduh keadaan terbaru server ke penyimpanan lokal.
 *
 * Aturan:
 *  - Perubahan dikirim berurutan (FIFO) supaya urutan kejadian tetap benar.
 *  - Unduh dari server (pull) hanya dilakukan saat antrean kosong, jadi perubahan lokal tidak pernah tertimpa.
 *  - Bila catatan diubah di dua perangkat, versi perangkat ini yang dipakai dan versi server
 *    disimpan sebagai catatan salinan "(versi lain)" — tidak ada data yang hilang.
 */
import { api } from "../api";
import type { Book, Label, Note } from "../types";
import { afterSyncWrite, setRemoteChangeHook, setWriteHook } from "./bus";
import { LocalError } from "./errors";
import { getActiveUser } from "./session";
import { countOps, currentUser, getNoteLocal, ro, rw } from "./store";
import { excerpt, isTmpId } from "./text";
import type { DroppedOp, LocalBook, LocalLabel, LocalNote, Op } from "./types";

/* --------------------------------- Status --------------------------------- */

export interface SyncStatus {
  online: boolean;
  syncing: boolean;
  pending: number;
  dropped: number;
  lastSyncAt: number | null;
  needsLogin: boolean;
}

const initialStatus: SyncStatus = {
  online: true,
  syncing: false,
  pending: 0,
  dropped: 0,
  lastSyncAt: null,
  needsLogin: false,
};

let status: SyncStatus = initialStatus;
const subscribers = new Set<() => void>();
let networkFailed = false;

function setStatus(patch: Partial<SyncStatus>) {
  const next = { ...status, ...patch };
  if ((Object.keys(next) as (keyof SyncStatus)[]).every((k) => next[k] === status[k])) return;
  status = next;
  subscribers.forEach((cb) => cb());
}

export const getSyncStatus = () => status;
export const getServerSyncStatus = () => initialStatus;
export function subscribeSync(cb: () => void) {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

function browserOnline() {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

function markNetwork(failed: boolean) {
  networkFailed = failed;
  setStatus({ online: browserOnline() && !failed });
}

/** Perkiraan online sekarang (dipakai UI untuk memutuskan perlu mengunduh isi catatan atau tidak). */
export const isOnline = () => browserOnline() && !networkFailed;

/* --------------------------------- Meta ----------------------------------- */

async function getMeta<T>(key: string): Promise<T | undefined> {
  return ro((tx) => tx.get<T>("meta", key));
}

async function setMeta(key: string, value: unknown) {
  await rw((tx) => tx.put("meta", value, key));
}

export async function getDroppedOps(): Promise<DroppedOp[]> {
  return (await getMeta<DroppedOp[]>("dropped")) ?? [];
}

export async function clearDroppedOps() {
  await setMeta("dropped", []);
  setStatus({ dropped: 0 });
}

async function logDropped(op: Op, message: string) {
  const list = await getDroppedOps();
  list.unshift({ type: op.type, message, at: Date.now() });
  await setMeta("dropped", list.slice(0, 20));
  setStatus({ dropped: Math.min(list.length, 20) });
}

async function refreshStatus() {
  if (!getActiveUser()) return;
  try {
    const [pending, dropped, lastSyncAt] = await Promise.all([
      countOps(),
      getDroppedOps(),
      getMeta<number>("lastSyncAt"),
    ]);
    setStatus({ pending, dropped: dropped.length, lastSyncAt: lastSyncAt ?? null });
  } catch {
    /* database belum siap */
  }
}

/* ------------------------------ Util HTTP/err ------------------------------ */

type AnyErr = { response?: { status?: number; data?: { message?: string } } };

type Failure = "offline" | "auth" | "error" | "drop";

function classify(err: unknown): { kind: Failure; message: string } {
  const e = err as AnyErr;
  if (!e || !e.response) return { kind: "offline", message: "Tidak ada koneksi" };
  const s = e.response.status ?? 0;
  const message = e.response.data?.message || `Server menolak (${s})`;
  if (s === 401) return { kind: "auth", message };
  if (s === 408 || s === 429 || s >= 500) return { kind: "error", message };
  return { kind: "drop", message };
}

const statusOf = (err: unknown) => (err as AnyErr)?.response?.status;

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    })
  );
  return out;
}

/* ------------------------------ Bentuk server ------------------------------ */

interface ServerNote {
  id: string;
  title: string;
  content?: string;
  excerpt?: string;
  book_id: string;
  is_public: boolean;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  labels: { id: string; name: string }[];
  book: { id: string; title: string };
  author: string;
}

/* --------------------------- Operasi DB internal --------------------------- */

const touchesNote = (o: Op, id: string) =>
  (o.type.startsWith("note.") && "id" in o && o.id === id) ||
  (o.type === "note.create" && o.tmp_id === id) ||
  ((o.type === "trash.restoreNote" || o.type === "trash.purgeNote") && o.id === id);

/** Ganti id sementara menjadi id server di seluruh data lokal + antrean. */
async function remapId(tx: import("./idb").Tx, tmp: string, real: string, kind: "book" | "note" | "label") {
  await tx.put("idmap", { tmp, real });

  if (kind === "book") {
    const b = await tx.get<LocalBook>("books", tmp);
    if (b) {
      await tx.del("books", tmp);
      await tx.put("books", { ...b, id: real });
    }
    for (const n of await tx.getAll<LocalNote>("notes")) {
      if (n.book_id === tmp) await tx.put("notes", { ...n, book_id: real });
    }
  } else if (kind === "note") {
    const n = await tx.get<LocalNote>("notes", tmp);
    if (n) {
      await tx.del("notes", tmp);
      await tx.put("notes", { ...n, id: real });
    }
    const c = await tx.get<{ id: string; content: string }>("contents", tmp);
    if (c) {
      await tx.del("contents", tmp);
      await tx.put("contents", { ...c, id: real });
    }
  } else {
    const l = await tx.get<LocalLabel>("labels", tmp);
    if (l) {
      await tx.del("labels", tmp);
      await tx.put("labels", { ...l, id: real });
    }
    for (const n of await tx.getAll<LocalNote>("notes")) {
      if (n.label_ids.includes(tmp)) await tx.put("notes", { ...n, label_ids: n.label_ids.map((x) => (x === tmp ? real : x)) });
    }
  }

  const sw = (v: string) => (v === tmp ? real : v);
  for (const o of await tx.getAll<Op>("outbox")) {
    let next: Op = o;
    if ("id" in o && o.id === tmp) next = { ...next, id: real } as Op;
    if (o.type === "note.create" && o.book_id === tmp) next = { ...next, book_id: real } as Op;
    if (o.type === "note.update" && o.patch.book_id === tmp) next = { ...next, patch: { ...o.patch, book_id: real } } as Op;
    if (o.type === "note.labels" && o.label_ids.includes(tmp)) next = { ...next, label_ids: o.label_ids.map(sw) } as Op;
    if (next !== o) await tx.put("outbox", next);
  }
}

const FMT_ATTR = /\sdata-(?:align|font|spacing|color)=/g;
const fmtCount = (html: string) => (html.match(FMT_ATTR) ?? []).length;

/** Terapkan versi catatan dari server ke data lokal (kecuali masih ada perubahan lokal yang menunggu). */
async function applyServerNote(tx: import("./idb").Tx, sn: ServerNote, currentSeq?: number) {
  const local = await tx.get<LocalNote>("notes", sn.id);
  if (!local) return;
  const ops = await tx.getAll<Op>("outbox");
  const pending = ops.some((o) => o.seq !== currentSeq && touchesNote(o, sn.id));
  if (pending) {
    await tx.put("notes", { ...local, base_updated_at: sn.updated_at, created_at: sn.created_at });
    return;
  }
  // Server lama membuang atribut format (rata teks, highlight, font, jarak baris). Jangan timpa isi lokal
  // yang lebih lengkap dengan versi polos — itulah yang membuat format "kembali ke default".
  const serverContent = sn.content ?? "";
  const localContent = sn.content !== undefined ? (await tx.get<{ id: string; content: string }>("contents", sn.id))?.content : undefined;
  const keepLocal = localContent !== undefined && fmtCount(localContent) > fmtCount(serverContent);
  const content = keepLocal ? (localContent as string) : serverContent;
  await tx.put("notes", {
    ...local,
    title: sn.title,
    excerpt: excerpt(content),
    book_id: sn.book_id,
    is_public: sn.is_public,
    is_favorite: sn.is_favorite,
    created_at: sn.created_at,
    updated_at: sn.updated_at,
    label_ids: sn.labels.map((l) => l.id),
    base_updated_at: sn.updated_at,
    has_content: true,
  } satisfies LocalNote);
  if (sn.content !== undefined && !keepLocal) await tx.put("contents", { id: sn.id, content });
}

async function finish(op: Op, extra?: (tx: import("./idb").Tx) => Promise<void>) {
  await rw(async (tx) => {
    if (extra) await extra(tx);
    if (op.seq !== undefined) await tx.del("outbox", op.seq);
  });
}

/* ------------------------------ Kirim antrean ------------------------------ */

async function takeNext(): Promise<Op | null> {
  return rw(async (tx) => {
    const ops = await tx.getAll<Op>("outbox");
    const first = ops[0];
    if (!first) return null;
    if (!first.inflight) {
      const marked = { ...first, inflight: true };
      await tx.put("outbox", marked);
      return marked;
    }
    return first;
  });
}

async function releaseOp(op: Op, maybeSent = false) {
  await rw(async (tx) => {
    const cur = await tx.get<Op>("outbox", op.seq!);
    if (cur) await tx.put("outbox", { ...cur, inflight: false, ...(maybeSent ? { attempted: true } : {}) });
  });
}

/**
 * Permintaan "buat" yang balasannya hilang bisa saja sudah diproses server. Sebelum mengirim ulang,
 * cari entitas yang cocok di server (id-nya belum dikenal perangkat ini) supaya tidak terbentuk data ganda.
 */
async function findExistingBook(op: Extract<Op, { type: "book.create" }>): Promise<Book | undefined> {
  const known = new Set((await ro((tx) => tx.getAll<LocalBook>("books"))).map((b) => b.id));
  const { data } = await api.get<{ books: Book[] }>("/books");
  return data.books
    .filter((b) => b.title === op.title && !known.has(b.id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
}

async function findExistingNote(op: Extract<Op, { type: "note.create" }>): Promise<ServerNote | undefined> {
  const known = new Set((await ro((tx) => tx.getAll<LocalNote>("notes"))).map((n) => n.id));
  const { data } = await api.get<{ notes: ServerNote[] }>("/notes", { params: { book_id: op.book_id } });
  const want = excerpt(op.content);
  const hit = data.notes
    .filter((n) => n.title === op.title && !known.has(n.id) && (n.excerpt ?? "") === want)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  if (!hit) return undefined;
  return (await api.get<{ note: ServerNote }>(`/notes/${hit.id}`)).data.note;
}

async function dropOp(op: Op, message: string) {
  await finish(op);
  await logDropped(op, message);
}

const STALE_AFTER_MS = 15_000;

async function execute(op: Op): Promise<"ok" | Failure> {
  try {
    // Entitas induk gagal dibuat -> perubahan turunannya tidak mungkin dikirim.
    if ("id" in op && isTmpId(op.id)) {
      await dropOp(op, "Perubahan dibatalkan karena data induknya gagal disimpan");
      return "drop";
    }

    switch (op.type) {
      case "book.create": {
        const book =
          (op.attempted ? await findExistingBook(op) : undefined) ??
          (await api.post<{ book: Book }>("/books", { title: op.title })).data.book;
        await finish(op, async (tx) => {
          await remapId(tx, op.tmp_id, book.id, "book");
          const b = await tx.get<LocalBook>("books", book.id);
          if (b) await tx.put("books", { ...b, created_at: book.created_at, user_id: book.user_id });
        });
        break;
      }
      case "book.update":
        await api.put(`/books/${op.id}`, { title: op.title });
        await finish(op);
        break;
      case "book.favorite":
        await api.patch(`/books/${op.id}/favorite`);
        await finish(op);
        break;
      case "book.delete":
        await api.delete(`/books/${op.id}`);
        await finish(op);
        break;

      case "note.create": {
        if (isTmpId(op.book_id)) {
          await dropOp(op, "Catatan dibatalkan karena bukunya gagal disimpan");
          return "drop";
        }
        const note =
          (op.attempted ? await findExistingNote(op) : undefined) ??
          (await api.post<{ note: ServerNote }>("/notes", { book_id: op.book_id, title: op.title, content: op.content })).data.note;
        await finish(op, async (tx) => {
          await remapId(tx, op.tmp_id, note.id, "note");
          await applyServerNote(tx, note, op.seq);
        });
        break;
      }
      case "note.update": {
        if (op.patch.book_id && isTmpId(op.patch.book_id)) {
          await dropOp(op, "Pemindahan catatan dibatalkan karena bukunya gagal disimpan");
          return "drop";
        }
        // Perubahan yang lama menunggu (mis. dibuat saat offline): pastikan tidak menimpa edit dari perangkat lain.
        if (Date.now() - op.created > STALE_AFTER_MS && (op.patch.title !== undefined || op.patch.content !== undefined)) {
          await keepOtherVersion(op);
        }
        const { data } = await api.put<{ note: ServerNote }>(`/notes/${op.id}`, op.patch);
        await finish(op, (tx) => applyServerNote(tx, data.note, op.seq));
        break;
      }
      case "note.favorite":
      case "note.public": {
        const path = op.type === "note.favorite" ? "favorite" : "public";
        const { data } = await api.patch<{ note: ServerNote }>(`/notes/${op.id}/${path}`);
        await finish(op, (tx) => applyServerNote(tx, data.note, op.seq));
        break;
      }
      case "note.labels": {
        const ids = op.label_ids.filter((id) => !isTmpId(id));
        const { data } = await api.put<{ note: ServerNote }>(`/notes/${op.id}/labels`, { label_ids: ids });
        await finish(op, (tx) => applyServerNote(tx, data.note, op.seq));
        break;
      }
      case "note.delete":
        await api.delete(`/notes/${op.id}`);
        await finish(op);
        break;

      case "label.create": {
        let label: Label | undefined;
        try {
          label = (await api.post<{ label: Label }>("/labels", { name: op.name })).data.label;
        } catch (err) {
          if (statusOf(err) !== 409) throw err;
          // Nama sudah ada di server (mis. dibuat di perangkat lain): pakai label itu.
          const { data } = await api.get<{ labels: Label[] }>("/labels");
          label = data.labels.find((l) => l.name === op.name);
          if (!label) throw err;
        }
        if (!label) throw new Error("Label tidak ditemukan di server");
        const real: Label = label;
        await finish(op, async (tx) => {
          const existing = await tx.get<LocalLabel>("labels", real.id);
          if (existing && existing.id !== op.tmp_id) {
            // Label server yang sama sudah ada lokal: lebur, jangan gandakan.
            const l = await tx.get<LocalLabel>("labels", op.tmp_id);
            if (l) await tx.del("labels", op.tmp_id);
            await tx.put("idmap", { tmp: op.tmp_id, real: real.id });
            for (const n of await tx.getAll<LocalNote>("notes")) {
              if (n.label_ids.includes(op.tmp_id)) {
                const ids = Array.from(new Set(n.label_ids.map((x) => (x === op.tmp_id ? real.id : x))));
                await tx.put("notes", { ...n, label_ids: ids });
              }
            }
            for (const o of await tx.getAll<Op>("outbox")) {
              if (o.type === "note.labels" && o.label_ids.includes(op.tmp_id)) {
                await tx.put("outbox", { ...o, label_ids: o.label_ids.map((x) => (x === op.tmp_id ? real.id : x)) });
              } else if ("id" in o && o.id === op.tmp_id) {
                await tx.put("outbox", { ...o, id: real.id } as Op);
              }
            }
          } else {
            await remapId(tx, op.tmp_id, real.id, "label");
          }
        });
        break;
      }
      case "label.update":
        await api.put(`/labels/${op.id}`, { name: op.name });
        await finish(op);
        break;
      case "label.delete":
        await api.delete(`/labels/${op.id}`);
        await finish(op);
        break;

      case "trash.restoreBook":
        await api.post(`/trash/books/${op.id}/restore`);
        await finish(op);
        break;
      case "trash.restoreNote":
        await api.post(`/trash/notes/${op.id}/restore`);
        await finish(op);
        break;
      case "trash.purgeBook":
        await api.delete(`/trash/books/${op.id}`);
        await finish(op);
        break;
      case "trash.purgeNote":
        await api.delete(`/trash/notes/${op.id}`);
        await finish(op);
        break;
      case "trash.empty":
        await api.delete("/trash");
        await finish(op);
        break;
    }
    markNetwork(false);
    return "ok";
  } catch (err) {
    const c = classify(err);
    if (c.kind === "drop") {
      markNetwork(false);
      wantPull = true; // keadaan lokal mungkin berbeda dari server -> selaraskan
      await dropOp(op, c.message);
      return "drop";
    }
    if (c.kind === "offline") markNetwork(true);
    if (c.kind === "auth") setStatus({ needsLogin: true });
    const isCreate = op.type === "book.create" || op.type === "note.create";
    await releaseOp(op, isCreate && (c.kind === "offline" || c.kind === "error")).catch(() => undefined);
    return c.kind;
  }
}

/** Server berubah sejak terakhir kita sinkron & isinya berbeda -> simpan versi server sebagai salinan. */
async function keepOtherVersion(op: Extract<Op, { type: "note.update" }>) {
  let server: ServerNote;
  try {
    server = (await api.get<{ note: ServerNote }>(`/notes/${op.id}`)).data.note;
  } catch (err) {
    if (statusOf(err) === 404) return; // PUT berikutnya akan menjatuhkan op ini
    throw err;
  }
  const local = await ro((tx) => tx.get<LocalNote>("notes", op.id));
  if (!local?.base_updated_at || server.updated_at === local.base_updated_at) return;

  const titleDiffers = op.patch.title !== undefined && op.patch.title !== server.title;
  const contentDiffers = op.patch.content !== undefined && op.patch.content !== (server.content ?? "");
  if (!titleDiffers && !contentDiffers) return;

  await api.post("/notes", {
    book_id: server.book.id,
    title: `${server.title} (versi lain)`.slice(0, 200),
    content: server.content ?? "",
  });
  wantPull = true;
}

async function flush(): Promise<"done" | Failure> {
  for (let guard = 0; guard < 100_000; guard++) {
    const op = await takeNext();
    if (!op) return "done";
    const res = await execute(op);
    if (res === "ok" || res === "drop") continue;
    return res;
  }
  return "error";
}

/* ---------------------------------- Pull ---------------------------------- */

interface ServerTrash {
  books: { id: string; title: string; page_count: number; deleted_at: string }[];
  notes: { id: string; title: string; excerpt: string; book: { id: string; title: string }; deleted_at: string }[];
}

async function pull(): Promise<boolean> {
  const user = currentUser();
  const [booksR, labelsR, trashR] = await Promise.all([
    api.get<{ books: Book[] }>("/books"),
    api.get<{ labels: Label[] }>("/labels"),
    api.get<ServerTrash>("/trash"),
  ]);
  const books = booksR.data.books;
  const labels = labelsR.data.labels;
  const trash = trashR.data;

  const lists = await mapLimit(books, 4, async (b) => (await api.get<{ notes: ServerNote[] }>("/notes", { params: { book_id: b.id } })).data.notes);
  const seen = new Map<string, ServerNote>();
  for (const list of lists) for (const n of list) seen.set(n.id, n);
  const serverNotes = Array.from(seen.values());

  const applied = await rw(async (tx) => {
    // Ada perubahan lokal baru selama unduhan berjalan -> batalkan, jangan menimpa.
    if ((await tx.getAll<Op>("outbox")).length > 0) return false;

    const [localBooks, localNotes, contents] = await Promise.all([
      tx.getAll<LocalBook>("books"),
      tx.getAll<LocalNote>("notes"),
      tx.getAll<{ id: string }>("contents"),
    ]);
    const lb = new Map(localBooks.map((b) => [b.id, b]));
    const ln = new Map(localNotes.map((n) => [n.id, n]));
    const haveContent = new Set(contents.map((c) => c.id));

    // Buku
    await tx.clear("books");
    for (const b of books) {
      await tx.put("books", {
        id: b.id,
        title: b.title,
        user_id: b.user_id,
        is_favorite: b.is_favorite,
        created_at: b.created_at,
        deleted_at: null,
      } satisfies LocalBook);
    }
    const trashedBookIds = new Set<string>();
    for (const tb of trash.books) {
      trashedBookIds.add(tb.id);
      const prev = lb.get(tb.id);
      await tx.put("books", {
        id: tb.id,
        title: tb.title,
        user_id: prev?.user_id ?? user.id,
        is_favorite: prev?.is_favorite ?? false,
        created_at: prev?.created_at ?? tb.deleted_at,
        deleted_at: tb.deleted_at,
        page_count_hint: tb.page_count,
      } satisfies LocalBook);
    }

    // Label
    await tx.clear("labels");
    for (const l of labels) await tx.put("labels", { id: l.id, name: l.name, user_id: l.user_id ?? user.id } satisfies LocalLabel);

    // Catatan aktif
    const keep = new Set<string>();
    for (const sn of serverNotes) {
      const prev = ln.get(sn.id);
      const fresh = !!prev && prev.has_content && prev.base_updated_at === sn.updated_at && haveContent.has(sn.id);
      await tx.put("notes", {
        id: sn.id,
        title: sn.title,
        excerpt: sn.excerpt ?? "",
        book_id: sn.book_id,
        is_public: sn.is_public,
        is_favorite: sn.is_favorite,
        created_at: sn.created_at,
        updated_at: sn.updated_at,
        deleted_at: null,
        label_ids: sn.labels.map((l) => l.id),
        author: sn.author,
        base_updated_at: sn.updated_at,
        has_content: fresh,
      } satisfies LocalNote);
      keep.add(sn.id);
    }

    // Catatan di Sampah
    for (const tn of trash.notes) {
      const prev = ln.get(tn.id);
      await tx.put("notes", {
        id: tn.id,
        title: tn.title,
        excerpt: tn.excerpt,
        book_id: tn.book.id,
        is_public: prev?.is_public ?? false,
        is_favorite: prev?.is_favorite ?? false,
        created_at: prev?.created_at ?? tn.deleted_at,
        updated_at: prev?.updated_at ?? tn.deleted_at,
        deleted_at: tn.deleted_at,
        label_ids: prev?.label_ids ?? [],
        author: prev?.author ?? user.username,
        base_updated_at: prev?.base_updated_at ?? null,
        has_content: prev ? prev.has_content : false,
      } satisfies LocalNote);
      keep.add(tn.id);
    }

    // Halaman milik buku di Sampah tidak dikirim server: simpan yang sudah ada lokal (untuk pemulihan).
    for (const n of localNotes) {
      if (!keep.has(n.id) && trashedBookIds.has(n.book_id)) keep.add(n.id);
    }
    // Sisanya sudah dihapus permanen / dipindah di tempat lain.
    for (const n of localNotes) {
      if (!keep.has(n.id)) {
        await tx.del("notes", n.id);
        await tx.del("contents", n.id);
      }
    }
    await tx.put("meta", Date.now(), "lastSyncAt");
    return true;
  });

  if (applied) {
    setStatus({ lastSyncAt: Date.now() });
    afterSyncWrite();
  }
  return applied;
}

/** Unduh isi catatan (satu per satu, 4 paralel) yang belum ada/terbaru di perangkat. */
async function fillContents() {
  const missing = (await ro((tx) => tx.getAll<LocalNote>("notes"))).filter((n) => !n.deleted_at && !n.has_content).map((n) => n.id);
  if (!missing.length) return;
  let done = 0;
  await mapLimit(missing, 4, async (id) => {
    try {
      await fetchContent(id);
    } catch (err) {
      if (classify(err).kind === "offline") throw err;
    }
    if (++done % 25 === 0) afterSyncWrite();
  });
  afterSyncWrite();
}

/** Unduh isi satu catatan dari server dan simpan lokal (bila tidak ada perubahan lokal yang menunggu). */
export async function fetchContent(id: string): Promise<void> {
  const { data } = await api.get<{ note: ServerNote }>(`/notes/${id}`);
  markNetwork(false);
  const sn = data.note;
  await rw(async (tx) => {
    const n = await tx.get<LocalNote>("notes", sn.id);
    if (!n) return;
    const ops = await tx.getAll<Op>("outbox");
    if (ops.some((o) => touchesNote(o, sn.id))) return;
    await applyServerNote(tx, sn);
  });
}

/* ------------------------------- Orkestrasi ------------------------------- */

let running: Promise<void> | null = null;
let rerun = false;
let wantPull = false;
let lastPullAt = 0;

async function withLock(fn: () => Promise<void>) {
  const user = getActiveUser();
  const locks = typeof navigator !== "undefined" ? (navigator as Navigator & { locks?: LockManager }).locks : undefined;
  if (!user || !locks) return fn();
  await locks.request(`lucibook-sync:${user.id}`, { ifAvailable: true }, async (lock) => {
    if (!lock) return; // tab lain sedang sinkron
    await fn();
  });
}

async function cycle() {
  if (!getActiveUser()) return;
  if (!browserOnline()) {
    setStatus({ online: false });
    await refreshStatus();
    return;
  }
  await withLock(async () => {
    setStatus({ syncing: true });
    try {
      // Kita memegang kunci eksklusif: tanda "sedang dikirim" yang tersisa berasal dari sesi yang mati
      // (tab ditutup di tengah pengiriman). Permintaan itu mungkin sudah sampai ke server.
      await rw(async (tx) => {
        for (const o of await tx.getAll<Op>("outbox")) {
          if (o.inflight) await tx.put("outbox", { ...o, inflight: false, attempted: true });
        }
      });

      const result = await flush();
      if (result === "done") {
        const due = Date.now() - lastPullAt > 60_000;
        if (wantPull || due) {
          wantPull = false;
          const ok = await pull();
          markNetwork(false); // pull berhasil = server terjangkau
          if (ok) {
            lastPullAt = Date.now();
            await fillContents();
          } else {
            wantPull = true; // ada perubahan baru saat pull -> ulangi
            rerun = true;
          }
        }
      }
    } catch (err) {
      const c = classify(err);
      if (c.kind === "offline") markNetwork(true);
      if (c.kind === "auth") setStatus({ needsLogin: true });
    } finally {
      setStatus({ syncing: false });
      await refreshStatus();
    }
  });
}

/** Jalankan sinkronisasi (kirim antrean, lalu unduh bila perlu). Aman dipanggil berulang. */
export function syncNow(opts: { pull?: boolean } = {}): Promise<void> {
  if (opts.pull) wantPull = true;
  if (!getActiveUser()) return Promise.resolve();
  if (running) {
    rerun = true;
    return running;
  }
  running = (async () => {
    do {
      rerun = false;
      await cycle();
    } while (rerun && browserOnline() && !networkFailed);
  })().finally(() => {
    running = null;
  });
  return running;
}

/** Kirim antrean lalu kembalikan jumlah perubahan yang masih belum terkirim. */
export async function flushPending(): Promise<number> {
  await syncNow();
  return countOps();
}

let writeTimer: ReturnType<typeof setTimeout> | null = null;
let tickTimer: ReturnType<typeof setInterval> | null = null;
let teardown: (() => void) | null = null;

/** Mulai sinkronisasi otomatis untuk pengguna aktif. */
export function startSync() {
  stopSync();
  setStatus({ needsLogin: false, online: browserOnline() && !networkFailed });
  lastPullAt = 0;
  wantPull = true;

  setWriteHook(() => {
    void refreshStatus();
    if (writeTimer) clearTimeout(writeTimer);
    writeTimer = setTimeout(() => void syncNow(), 400);
  });
  setRemoteChangeHook(() => void refreshStatus());

  const onOnline = () => {
    networkFailed = false;
    setStatus({ online: true });
    void syncNow({ pull: true });
  };
  const onOffline = () => setStatus({ online: false });
  const onVisible = () => {
    if (document.visibilityState === "visible") void syncNow();
  };
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  document.addEventListener("visibilitychange", onVisible);

  tickTimer = setInterval(() => {
    if (document.visibilityState !== "visible") return;
    // Ada antrean -> coba kirim. Baru gagal koneksi -> "pull" berfungsi sebagai pemeriksa koneksi.
    // Selain itu cek perubahan dari perangkat lain.
    if (status.pending > 0) void syncNow();
    else if (networkFailed || Date.now() - lastPullAt > 90_000) void syncNow({ pull: true });
  }, 20_000);

  teardown = () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
    document.removeEventListener("visibilitychange", onVisible);
  };

  void refreshStatus().then(() => syncNow({ pull: true }));
}

export function stopSync() {
  teardown?.();
  teardown = null;
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = null;
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = null;
  setWriteHook(null);
  setRemoteChangeHook(null);
  setStatus({ ...initialStatus, online: browserOnline() });
}

/** Ambil catatan lengkap; unduh isinya dulu bila belum ada di perangkat dan sedang online. */
export async function getNote(id: string): Promise<Note> {
  const local = await getNoteLocal(id);
  if (local.hasContent) return local.note;

  if (isOnline()) {
    try {
      await fetchContent(local.note.id);
      return (await getNoteLocal(id)).note;
    } catch (err) {
      if (classify(err).kind === "offline") markNetwork(true);
      /* jatuh ke salinan lokal di bawah */
    }
  }
  if (local.stored) return local.note; // versi lama masih lebih baik daripada kosong
  throw new LocalError("Isi catatan ini belum diunduh ke perangkat. Hubungkan ke internet sekali untuk membukanya.", 503);
}
