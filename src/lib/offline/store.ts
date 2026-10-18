/**
 * Penyimpanan lokal (IndexedDB) = sumber data untuk seluruh tampilan.
 * Semua baca/tulis aplikasi lewat sini; setiap perubahan juga dicatat di antrean (outbox)
 * dan dikirim ke server oleh sync.ts saat online.
 */
import type { Book, Label, Note, NoteFilters, Trash } from "../types";
import { afterLocalWrite } from "./bus";
import { LocalError } from "./errors";
import { dbName, runTx, StoreName, Tx } from "./idb";
import { getActiveUser } from "./session";
import { excerpt, expiresAt, isTrashExpired, nowIso, tmpId } from "./text";
import type { LocalBook, LocalLabel, LocalNote, NewOp, Op } from "./types";

export const ALL_STORES: StoreName[] = ["books", "notes", "contents", "labels", "outbox", "idmap", "meta"];

export function currentUser() {
  const u = getActiveUser();
  if (!u) throw new LocalError("Sesi tidak aktif. Silakan masuk lagi.", 401);
  return u;
}

export const rw = <T>(fn: (tx: Tx) => Promise<T>) => runTx(dbName(currentUser().id), ALL_STORES, "readwrite", fn);
export const ro = <T>(fn: (tx: Tx) => Promise<T>) => runTx(dbName(currentUser().id), ALL_STORES, "readonly", fn);

/* ------------------------------ Util internal ------------------------------ */

/** Id sementara -> id server (bila sudah tersinkron). */
export async function rid(tx: Tx, id: string): Promise<string> {
  const m = await tx.get<{ tmp: string; real: string }>("idmap", id);
  return m ? m.real : id;
}

function cleanText(value: string, label: string, max: number): string {
  const t = (value ?? "").trim();
  if (!t) throw new LocalError(`${label} wajib diisi`);
  if (t.length > max) throw new LocalError(`${label} maksimal ${max} karakter`);
  return t;
}

const byId = <T extends { id: string }>(rows: T[]) => new Map(rows.map((r) => [r.id, r]));

function shapeLabel(l: LocalLabel, count?: number): Label {
  return { id: l.id, name: l.name, user_id: l.user_id, ...(count !== undefined ? { _count: { notes: count } } : {}) };
}

function shapeBook(b: LocalBook, pages: number): Book {
  return {
    id: b.id,
    title: b.title,
    user_id: b.user_id,
    is_favorite: b.is_favorite,
    created_at: b.created_at,
    _count: { pages },
  };
}

function shapeNote(n: LocalNote, books: Map<string, LocalBook>, labels: Map<string, LocalLabel>, content?: string): Note {
  const labelList = n.label_ids
    .map((id) => labels.get(id))
    .filter((l): l is LocalLabel => !!l)
    .map((l) => ({ id: l.id, name: l.name }));
  return {
    id: n.id,
    title: n.title,
    ...(content !== undefined ? { content } : { excerpt: n.excerpt }),
    book_id: n.book_id,
    is_public: n.is_public,
    is_favorite: n.is_favorite,
    created_at: n.created_at,
    updated_at: n.updated_at,
    labels: labelList,
    book: { id: n.book_id, title: books.get(n.book_id)?.title ?? "" },
    author: n.author,
  };
}

const activeBook = (b: LocalBook | undefined): b is LocalBook => !!b && !b.deleted_at;

async function loadMaps(tx: Tx) {
  const [books, labels] = await Promise.all([tx.getAll<LocalBook>("books"), tx.getAll<LocalLabel>("labels")]);
  return { books: byId(books), labels: byId(labels) };
}

/** Catatan yang boleh tampil: tidak di Sampah dan bukunya aktif. */
async function visibleNote(tx: Tx, rawId: string) {
  const id = await rid(tx, rawId);
  const note = await tx.get<LocalNote>("notes", id);
  const book = note ? await tx.get<LocalBook>("books", note.book_id) : undefined;
  if (!note || note.deleted_at || !activeBook(book)) throw new LocalError("Catatan tidak ditemukan", 404);
  return note;
}

async function activeBookOrThrow(tx: Tx, rawId: string) {
  const id = await rid(tx, rawId);
  const book = await tx.get<LocalBook>("books", id);
  if (!activeBook(book)) throw new LocalError("Buku tidak ditemukan", 404);
  return book;
}

/* -------------------------------- Antrean --------------------------------- */

export async function pushOp(tx: Tx, op: NewOp) {
  const full: Op = { ...op, created: Date.now() };
  await tx.put("outbox", full);
}

/** Gabungkan perubahan beruntun pada catatan yang sama (autosave) menjadi satu entri antrean. */
async function pushNoteUpdate(tx: Tx, id: string, patch: { title?: string; content?: string; book_id?: string }) {
  const ops = await tx.getAll<Op>("outbox");
  let target: Op | undefined;
  for (let i = ops.length - 1; i >= 0; i--) {
    const o = ops[i];
    if (o.inflight) continue;
    if ((o.type === "note.update" && o.id === id) || (o.type === "note.create" && o.tmp_id === id)) {
      target = o;
      break;
    }
  }
  if (target) {
    // Jangan gabung bila patch merujuk buku sementara yang baru dibuat SETELAH entri target.
    const bookRef = patch.book_id;
    const createdLater =
      !!bookRef && ops.some((o) => o.type === "book.create" && o.tmp_id === bookRef && (o.seq ?? 0) > (target!.seq ?? 0));
    if (!createdLater) {
      if (target.type === "note.update") {
        await tx.put("outbox", { ...target, patch: { ...target.patch, ...patch } });
      } else if (target.type === "note.create") {
        await tx.put("outbox", {
          ...target,
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.content !== undefined ? { content: patch.content } : {}),
          ...(patch.book_id !== undefined ? { book_id: patch.book_id } : {}),
        });
      }
      return;
    }
  }
  await pushOp(tx, { type: "note.update", id, patch });
}

export async function countOps(): Promise<number> {
  const user = getActiveUser();
  if (!user) return 0;
  return runTx(dbName(user.id), ["outbox"], "readonly", async (tx) => (await tx.getAll<Op>("outbox")).length);
}

/* --------------------------------- Baca ----------------------------------- */

export function listBooks(favorite = false): Promise<Book[]> {
  return ro(async (tx) => {
    const [books, notes] = await Promise.all([tx.getAll<LocalBook>("books"), tx.getAll<LocalNote>("notes")]);
    const counts = new Map<string, number>();
    for (const n of notes) if (!n.deleted_at) counts.set(n.book_id, (counts.get(n.book_id) ?? 0) + 1);
    return books
      .filter((b) => !b.deleted_at && (!favorite || b.is_favorite))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((b) => shapeBook(b, counts.get(b.id) ?? 0));
  });
}

export function getBook(rawId: string): Promise<Book> {
  return ro(async (tx) => {
    const book = await activeBookOrThrow(tx, rawId);
    const notes = await tx.getAll<LocalNote>("notes");
    return shapeBook(book, notes.filter((n) => n.book_id === book.id && !n.deleted_at).length);
  });
}

export function listNotes(filters: NoteFilters = {}): Promise<Note[]> {
  return ro(async (tx) => {
    const [notes, maps] = await Promise.all([tx.getAll<LocalNote>("notes"), loadMaps(tx)]);
    const bookId = filters.book_id ? await rid(tx, filters.book_id) : undefined;
    const labelId = filters.label_id ? await rid(tx, filters.label_id) : undefined;

    let rows = notes.filter((n) => !n.deleted_at && activeBook(maps.books.get(n.book_id)));
    if (bookId) rows = rows.filter((n) => n.book_id === bookId);
    if (filters.favorite) rows = rows.filter((n) => n.is_favorite);
    if (labelId) rows = rows.filter((n) => n.label_ids.includes(labelId));

    const term = filters.q?.trim().toLowerCase();
    if (term) {
      const contents = new Map((await tx.getAll<{ id: string; content: string }>("contents")).map((c) => [c.id, c.content]));
      rows = rows.filter(
        (n) =>
          n.title.toLowerCase().includes(term) ||
          (contents.get(n.id) ?? "").toLowerCase().includes(term) ||
          // isi belum diunduh: cari di ringkasan
          (!contents.has(n.id) && n.excerpt.toLowerCase().includes(term))
      );
    }

    return rows
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .map((n) => shapeNote(n, maps.books, maps.labels));
  });
}

/** Catatan lengkap dengan isi dari penyimpanan lokal (tanpa jaringan). */
export function getNoteLocal(rawId: string): Promise<{ note: Note; hasContent: boolean; stored: boolean }> {
  return ro(async (tx) => {
    const n = await visibleNote(tx, rawId);
    const maps = await loadMaps(tx);
    const c = await tx.get<{ id: string; content: string }>("contents", n.id);
    return { note: shapeNote(n, maps.books, maps.labels, c?.content ?? ""), hasContent: !!c && n.has_content, stored: !!c };
  });
}

export function listLabels(): Promise<Label[]> {
  return ro(async (tx) => {
    const [labels, notes, books] = await Promise.all([
      tx.getAll<LocalLabel>("labels"),
      tx.getAll<LocalNote>("notes"),
      tx.getAll<LocalBook>("books"),
    ]);
    const bmap = byId(books);
    const counts = new Map<string, number>();
    for (const n of notes) {
      if (n.deleted_at || !activeBook(bmap.get(n.book_id))) continue;
      for (const id of n.label_ids) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return labels.sort((a, b) => a.name.localeCompare(b.name)).map((l) => shapeLabel(l, counts.get(l.id) ?? 0));
  });
}

export function getTrash(): Promise<Trash> {
  return ro(async (tx) => {
    const [books, notes] = await Promise.all([tx.getAll<LocalBook>("books"), tx.getAll<LocalNote>("notes")]);
    const bmap = byId(books);
    const pageCount = new Map<string, number>();
    for (const n of notes) if (!n.deleted_at) pageCount.set(n.book_id, (pageCount.get(n.book_id) ?? 0) + 1);

    return {
      books: books
        .filter((b) => b.deleted_at && !isTrashExpired(b.deleted_at))
        .sort((a, b) => b.deleted_at!.localeCompare(a.deleted_at!))
        .map((b) => ({
          id: b.id,
          title: b.title,
          page_count: pageCount.get(b.id) ?? b.page_count_hint ?? 0,
          deleted_at: b.deleted_at!,
          expires_at: expiresAt(b.deleted_at!),
        })),
      notes: notes
        .filter((n) => n.deleted_at && !isTrashExpired(n.deleted_at) && activeBook(bmap.get(n.book_id)))
        .sort((a, b) => b.deleted_at!.localeCompare(a.deleted_at!))
        .map((n) => ({
          id: n.id,
          title: n.title,
          excerpt: n.excerpt,
          book: { id: n.book_id, title: bmap.get(n.book_id)?.title ?? "" },
          deleted_at: n.deleted_at!,
          expires_at: expiresAt(n.deleted_at!),
        })),
    };
  });
}

/* -------------------------------- Buku ------------------------------------ */

export async function createBook(title: string): Promise<Book> {
  const t = cleanText(title, "Judul buku", 120);
  const user = currentUser();
  const book: LocalBook = { id: tmpId(), title: t, user_id: user.id, is_favorite: false, created_at: nowIso(), deleted_at: null };
  await rw(async (tx) => {
    await tx.put("books", book);
    await pushOp(tx, { type: "book.create", tmp_id: book.id, title: t });
  });
  afterLocalWrite();
  return shapeBook(book, 0);
}

export async function renameBook(rawId: string, title: string): Promise<Book> {
  const t = cleanText(title, "Judul buku", 120);
  const book = await rw(async (tx) => {
    const b = await activeBookOrThrow(tx, rawId);
    const next = { ...b, title: t };
    await tx.put("books", next);
    await pushOp(tx, { type: "book.update", id: b.id, title: t });
    return next;
  });
  afterLocalWrite();
  return shapeBook(book, 0);
}

export async function toggleBookFavorite(rawId: string): Promise<Book> {
  const book = await rw(async (tx) => {
    const b = await activeBookOrThrow(tx, rawId);
    const next = { ...b, is_favorite: !b.is_favorite };
    await tx.put("books", next);
    await pushOp(tx, { type: "book.favorite", id: b.id });
    return next;
  });
  afterLocalWrite();
  return shapeBook(book, 0);
}

export async function deleteBook(rawId: string): Promise<void> {
  await rw(async (tx) => {
    const b = await activeBookOrThrow(tx, rawId);
    await tx.put("books", { ...b, deleted_at: nowIso() });
    await pushOp(tx, { type: "book.delete", id: b.id });
  });
  afterLocalWrite();
}

/* ------------------------------- Catatan ---------------------------------- */

export async function createNote(input: { book_id: string; title: string; content?: string }): Promise<Note> {
  const title = cleanText(input.title, "Judul catatan", 200);
  const content = input.content ?? "";
  if (content.length > 1_000_000) throw new LocalError("Isi catatan terlalu panjang");
  const user = currentUser();

  const note = await rw(async (tx) => {
    const book = await activeBookOrThrow(tx, input.book_id);
    const now = nowIso();
    const n: LocalNote = {
      id: tmpId(),
      title,
      excerpt: excerpt(content),
      book_id: book.id,
      is_public: false,
      is_favorite: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      label_ids: [],
      author: user.username,
      base_updated_at: null,
      has_content: true,
    };
    await tx.put("notes", n);
    await tx.put("contents", { id: n.id, content });
    await pushOp(tx, { type: "note.create", tmp_id: n.id, book_id: book.id, title, content });
    const maps = await loadMaps(tx);
    return shapeNote(n, maps.books, maps.labels, content);
  });
  afterLocalWrite();
  return note;
}

export async function updateNote(
  rawId: string,
  patch: { title?: string; content?: string; book_id?: string }
): Promise<Note> {
  const cleaned: { title?: string; content?: string; book_id?: string } = {};
  if (patch.title !== undefined) cleaned.title = cleanText(patch.title, "Judul catatan", 200);
  if (patch.content !== undefined) {
    if (patch.content.length > 1_000_000) throw new LocalError("Isi catatan terlalu panjang");
    cleaned.content = patch.content;
  }

  const note = await rw(async (tx) => {
    const n = await visibleNote(tx, rawId);
    const next: LocalNote = { ...n, updated_at: nowIso() };
    if (cleaned.title !== undefined) next.title = cleaned.title;
    if (patch.book_id !== undefined && patch.book_id !== n.book_id) {
      const target = await activeBookOrThrow(tx, patch.book_id);
      next.book_id = target.id;
      cleaned.book_id = target.id;
    }
    let content: string | undefined;
    if (cleaned.content !== undefined) {
      next.excerpt = excerpt(cleaned.content);
      next.has_content = true; // isi lokal kini yang terbaru
      content = cleaned.content;
      await tx.put("contents", { id: n.id, content });
    }
    await tx.put("notes", next);
    await pushNoteUpdate(tx, n.id, cleaned);

    if (content === undefined) content = (await tx.get<{ id: string; content: string }>("contents", n.id))?.content ?? "";
    const maps = await loadMaps(tx);
    return shapeNote(next, maps.books, maps.labels, content);
  });
  afterLocalWrite();
  return note;
}

async function flipNote(rawId: string, field: "is_favorite" | "is_public", op: "note.favorite" | "note.public"): Promise<Note> {
  const note = await rw(async (tx) => {
    const n = await visibleNote(tx, rawId);
    const next: LocalNote = { ...n, [field]: !n[field] };
    await tx.put("notes", next);
    await pushOp(tx, { type: op, id: n.id });
    const c = await tx.get<{ id: string; content: string }>("contents", n.id);
    const maps = await loadMaps(tx);
    return shapeNote(next, maps.books, maps.labels, c?.content ?? "");
  });
  afterLocalWrite();
  return note;
}

export const toggleNoteFavorite = (id: string) => flipNote(id, "is_favorite", "note.favorite");
export const toggleNotePublic = (id: string) => flipNote(id, "is_public", "note.public");

export async function setNoteLabels(rawId: string, labelIds: string[]): Promise<Note> {
  const note = await rw(async (tx) => {
    const n = await visibleNote(tx, rawId);
    const ids: string[] = [];
    for (const raw of labelIds) {
      const id = await rid(tx, raw);
      if ((await tx.get("labels", id)) && !ids.includes(id)) ids.push(id);
    }
    const next: LocalNote = { ...n, label_ids: ids };
    await tx.put("notes", next);
    await pushOp(tx, { type: "note.labels", id: n.id, label_ids: ids });
    const c = await tx.get<{ id: string; content: string }>("contents", n.id);
    const maps = await loadMaps(tx);
    return shapeNote(next, maps.books, maps.labels, c?.content ?? "");
  });
  afterLocalWrite();
  return note;
}

export async function deleteNote(rawId: string): Promise<void> {
  await rw(async (tx) => {
    const n = await visibleNote(tx, rawId);
    await tx.put("notes", { ...n, deleted_at: nowIso() });
    await pushOp(tx, { type: "note.delete", id: n.id });
  });
  afterLocalWrite();
}

/* -------------------------------- Label ----------------------------------- */

async function assertLabelNameFree(tx: Tx, name: string, exceptId?: string) {
  const labels = await tx.getAll<LocalLabel>("labels");
  if (labels.some((l) => l.name === name && l.id !== exceptId)) {
    throw new LocalError("Label dengan nama itu sudah ada", 409);
  }
}

export async function createLabel(name: string): Promise<Label> {
  const t = cleanText(name, "Nama label", 40);
  const user = currentUser();
  const label = await rw(async (tx) => {
    await assertLabelNameFree(tx, t);
    const l: LocalLabel = { id: tmpId(), name: t, user_id: user.id };
    await tx.put("labels", l);
    await pushOp(tx, { type: "label.create", tmp_id: l.id, name: t });
    return l;
  });
  afterLocalWrite();
  return shapeLabel(label);
}

export async function renameLabel(rawId: string, name: string): Promise<Label> {
  const t = cleanText(name, "Nama label", 40);
  const label = await rw(async (tx) => {
    const id = await rid(tx, rawId);
    const l = await tx.get<LocalLabel>("labels", id);
    if (!l) throw new LocalError("Label tidak ditemukan", 404);
    await assertLabelNameFree(tx, t, id);
    const next = { ...l, name: t };
    await tx.put("labels", next);
    await pushOp(tx, { type: "label.update", id, name: t });
    return next;
  });
  afterLocalWrite();
  return shapeLabel(label);
}

export async function deleteLabel(rawId: string): Promise<void> {
  await rw(async (tx) => {
    const id = await rid(tx, rawId);
    if (!(await tx.get("labels", id))) throw new LocalError("Label tidak ditemukan", 404);
    await tx.del("labels", id);
    for (const n of await tx.getAll<LocalNote>("notes")) {
      if (n.label_ids.includes(id)) await tx.put("notes", { ...n, label_ids: n.label_ids.filter((x) => x !== id) });
    }
    await pushOp(tx, { type: "label.delete", id });
  });
  afterLocalWrite();
}

/* -------------------------------- Sampah ---------------------------------- */

export async function restoreBook(rawId: string): Promise<void> {
  await rw(async (tx) => {
    const id = await rid(tx, rawId);
    const b = await tx.get<LocalBook>("books", id);
    if (!b || !b.deleted_at) throw new LocalError("Buku tidak ada di Sampah", 404);
    await tx.put("books", { ...b, deleted_at: null });
    await pushOp(tx, { type: "trash.restoreBook", id });
  });
  afterLocalWrite();
}

export async function restoreNote(rawId: string): Promise<void> {
  await rw(async (tx) => {
    const id = await rid(tx, rawId);
    const n = await tx.get<LocalNote>("notes", id);
    if (!n || !n.deleted_at) throw new LocalError("Catatan tidak ada di Sampah", 404);
    const b = await tx.get<LocalBook>("books", n.book_id);
    if (!b || b.deleted_at) throw new LocalError("Pulihkan bukunya terlebih dulu", 409);
    await tx.put("notes", { ...n, deleted_at: null });
    await pushOp(tx, { type: "trash.restoreNote", id });
  });
  afterLocalWrite();
}

async function dropNoteLocal(tx: Tx, id: string) {
  await tx.del("notes", id);
  await tx.del("contents", id);
}

export async function purgeBook(rawId: string): Promise<void> {
  await rw(async (tx) => {
    const id = await rid(tx, rawId);
    const b = await tx.get<LocalBook>("books", id);
    if (!b || !b.deleted_at) throw new LocalError("Buku tidak ada di Sampah", 404);
    for (const n of await tx.getAll<LocalNote>("notes")) if (n.book_id === id) await dropNoteLocal(tx, n.id);
    await tx.del("books", id);
    await pushOp(tx, { type: "trash.purgeBook", id });
  });
  afterLocalWrite();
}

export async function purgeNote(rawId: string): Promise<void> {
  await rw(async (tx) => {
    const id = await rid(tx, rawId);
    const n = await tx.get<LocalNote>("notes", id);
    if (!n || !n.deleted_at) throw new LocalError("Catatan tidak ada di Sampah", 404);
    await dropNoteLocal(tx, id);
    await pushOp(tx, { type: "trash.purgeNote", id });
  });
  afterLocalWrite();
}

export async function emptyTrash(): Promise<void> {
  await rw(async (tx) => {
    const [books, notes] = await Promise.all([tx.getAll<LocalBook>("books"), tx.getAll<LocalNote>("notes")]);
    const trashedBooks = new Set(books.filter((b) => b.deleted_at).map((b) => b.id));
    for (const n of notes) if (n.deleted_at || trashedBooks.has(n.book_id)) await dropNoteLocal(tx, n.id);
    for (const id of trashedBooks) await tx.del("books", id);
    await pushOp(tx, { type: "trash.empty" });
  });
  afterLocalWrite();
}

/** Hapus seluruh data lokal pengguna aktif (dipakai saat logout) — lihat auth.tsx. */
export async function wipeLocalData(): Promise<void> {
  const user = getActiveUser();
  if (!user) return;
  await rw(async (tx) => {
    for (const s of ALL_STORES) await tx.clear(s);
  });
}
