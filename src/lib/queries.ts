import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchExplore, fetchPublicNote } from "./offline/explore";
import * as local from "./offline/store";
import { getNote } from "./offline/sync";
import type { Book, Label, Note, NoteFilters, Trash } from "./types";

/* ------------------------------ Queries ------------------------------ */

export function useBooks(favorite = false) {
  return useQuery({
    queryKey: ["books", { favorite }],
    queryFn: () => local.listBooks(favorite),
  });
}

export function useBook(id: string) {
  return useQuery({
    queryKey: ["book", id],
    enabled: !!id,
    queryFn: () => local.getBook(id),
  });
}

export function useNotes(filters: NoteFilters = {}) {
  const params: Record<string, string> = {};
  if (filters.q) params.q = filters.q;
  if (filters.book_id) params.book_id = filters.book_id;
  if (filters.label_id) params.label_id = filters.label_id;
  if (filters.favorite) params.favorite = "true";

  return useQuery({
    queryKey: ["notes", params],
    placeholderData: keepPreviousData,
    queryFn: () => local.listNotes(filters),
  });
}

/** Dipakai juga oleh mode baca untuk memuat halaman berikutnya lebih dulu. */
export const noteQueryFn = (id: string) => getNote(id);

export function useNote(id: string) {
  return useQuery({
    queryKey: ["note", id],
    enabled: !!id,
    retry: false,
    queryFn: () => noteQueryFn(id),
  });
}

export function useTrash() {
  return useQuery({
    queryKey: ["trash"],
    queryFn: (): Promise<Trash> => local.getTrash(),
  });
}

export function useLabels() {
  return useQuery({
    queryKey: ["labels"],
    queryFn: (): Promise<Label[]> => local.listLabels(),
  });
}

/* Publik (tanpa login) */
export function useExplore(q: string) {
  return useQuery({
    queryKey: ["explore", q],
    placeholderData: keepPreviousData,
    queryFn: () => fetchExplore(q),
  });
}

export function usePublicNote(id: string) {
  return useQuery({
    queryKey: ["explore-note", id],
    enabled: !!id,
    retry: false,
    queryFn: () => fetchPublicNote(id),
  });
}

/* ----------------------------- Mutations ----------------------------- */

function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: string[]) => {
    keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };
}

export function useCreateBook() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (title: string): Promise<Book> => local.createBook(title),
    onSuccess: () => invalidate("books"),
  });
}

export function useUpdateBook() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { id: string; title: string }) => local.renameBook(v.id, v.title),
    onSuccess: () => invalidate("books", "book", "notes", "note"),
  });
}

export function useDeleteBook() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => local.deleteBook(id),
    onSuccess: () => invalidate("books", "book", "notes", "note", "labels", "trash"),
  });
}

export function useToggleBookFavorite() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => local.toggleBookFavorite(id),
    onSuccess: () => invalidate("books", "book"),
  });
}

export function useCreateNote() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { book_id: string; title: string; content?: string }): Promise<Note> => local.createNote(v),
    onSuccess: () => invalidate("notes", "books"),
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; title?: string; content?: string; book_id?: string }) =>
      local.updateNote(id, patch),
    onSuccess: (note) => {
      qc.setQueryData(["note", note.id], note);
      invalidate("notes", "books");
    },
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => local.deleteNote(id),
    onSuccess: (_d, id) => {
      qc.removeQueries({ queryKey: ["note", id] });
      invalidate("notes", "books", "labels", "trash");
    },
  });
}

export function useToggleNoteFavorite() {
  const qc = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => local.toggleNoteFavorite(id),
    onSuccess: (note) => {
      qc.setQueryData(["note", note.id], note);
      invalidate("notes");
    },
  });
}

export function useToggleNotePublic() {
  const qc = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => local.toggleNotePublic(id),
    onSuccess: (note) => {
      qc.setQueryData(["note", note.id], note);
      invalidate("notes", "explore");
    },
  });
}

export function useSetNoteLabels() {
  const qc = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { id: string; label_ids: string[] }) => local.setNoteLabels(v.id, v.label_ids),
    onSuccess: (note) => {
      qc.setQueryData(["note", note.id], note);
      invalidate("notes", "labels");
    },
  });
}

export function useCreateLabel() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (name: string): Promise<Label> => local.createLabel(name),
    onSuccess: () => invalidate("labels"),
  });
}

export function useUpdateLabel() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { id: string; name: string }) => local.renameLabel(v.id, v.name),
    onSuccess: () => invalidate("labels", "notes", "note"),
  });
}

export function useDeleteLabel() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => local.deleteLabel(id),
    onSuccess: () => invalidate("labels", "notes", "note"),
  });
}

/* ------------------------------ Sampah ------------------------------- */

function useTrashMutation<V>(fn: (v: V) => Promise<unknown>) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => invalidate("trash", "books", "book", "notes", "note", "labels"),
  });
}

export const useRestoreBook = () => useTrashMutation((id: string) => local.restoreBook(id));
export const useRestoreNote = () => useTrashMutation((id: string) => local.restoreNote(id));
export const usePurgeBook = () => useTrashMutation((id: string) => local.purgeBook(id));
export const usePurgeNote = () => useTrashMutation((id: string) => local.purgeNote(id));
export const useEmptyTrash = () => useTrashMutation<void>(() => local.emptyTrash());
