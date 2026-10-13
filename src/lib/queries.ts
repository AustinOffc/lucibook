import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { Book, Label, Note, NoteFilters } from "./types";

/* ------------------------------ Queries ------------------------------ */

export function useBooks(favorite = false) {
  return useQuery({
    queryKey: ["books", { favorite }],
    queryFn: async () =>
      (await api.get<{ books: Book[] }>("/books", { params: favorite ? { favorite: "true" } : undefined })).data.books,
  });
}

export function useBook(id: string) {
  return useQuery({
    queryKey: ["book", id],
    enabled: !!id,
    queryFn: async () => (await api.get<{ book: Book }>(`/books/${id}`)).data.book,
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
    queryFn: async () => (await api.get<{ notes: Note[] }>("/notes", { params })).data.notes,
  });
}

export function useNote(id: string) {
  return useQuery({
    queryKey: ["note", id],
    enabled: !!id,
    queryFn: async () => (await api.get<{ note: Note }>(`/notes/${id}`)).data.note,
  });
}

export function useLabels() {
  return useQuery({
    queryKey: ["labels"],
    queryFn: async () => (await api.get<{ labels: Label[] }>("/labels")).data.labels,
  });
}

/* Publik (tanpa login) */
export function useExplore(q: string) {
  return useQuery({
    queryKey: ["explore", q],
    placeholderData: keepPreviousData,
    queryFn: async () =>
      (await api.get<{ notes: Note[] }>("/explore", { params: q ? { q } : undefined })).data.notes,
  });
}

export function usePublicNote(id: string) {
  return useQuery({
    queryKey: ["explore-note", id],
    enabled: !!id,
    retry: false,
    queryFn: async () => (await api.get<{ note: Note }>(`/explore/${id}`)).data.note,
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
    mutationFn: async (title: string) => (await api.post<{ book: Book }>("/books", { title })).data.book,
    onSuccess: () => invalidate("books"),
  });
}

export function useUpdateBook() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (v: { id: string; title: string }) =>
      (await api.put<{ book: Book }>(`/books/${v.id}`, { title: v.title })).data.book,
    onSuccess: () => invalidate("books", "book", "notes", "note"),
  });
}

export function useDeleteBook() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/books/${id}`)).data,
    onSuccess: () => invalidate("books", "notes"),
  });
}

export function useToggleBookFavorite() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => (await api.patch<{ book: Book }>(`/books/${id}/favorite`)).data.book,
    onSuccess: () => invalidate("books", "book"),
  });
}

export function useCreateNote() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (v: { book_id: string; title: string; content?: string }) =>
      (await api.post<{ note: Note }>("/notes", v)).data.note,
    onSuccess: () => invalidate("notes", "books"),
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; title?: string; content?: string; book_id?: string }) =>
      (await api.put<{ note: Note }>(`/notes/${id}`, patch)).data.note,
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
    mutationFn: async (id: string) => (await api.delete(`/notes/${id}`)).data,
    onSuccess: (_d, id) => {
      qc.removeQueries({ queryKey: ["note", id] });
      invalidate("notes", "books", "labels");
    },
  });
}

export function useToggleNoteFavorite() {
  const qc = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => (await api.patch<{ note: Note }>(`/notes/${id}/favorite`)).data.note,
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
    mutationFn: async (id: string) => (await api.patch<{ note: Note }>(`/notes/${id}/public`)).data.note,
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
    mutationFn: async (v: { id: string; label_ids: string[] }) =>
      (await api.put<{ note: Note }>(`/notes/${v.id}/labels`, { label_ids: v.label_ids })).data.note,
    onSuccess: (note) => {
      qc.setQueryData(["note", note.id], note);
      invalidate("notes", "labels");
    },
  });
}

export function useCreateLabel() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (name: string) => (await api.post<{ label: Label }>("/labels", { name })).data.label,
    onSuccess: () => invalidate("labels"),
  });
}

export function useUpdateLabel() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (v: { id: string; name: string }) =>
      (await api.put<{ label: Label }>(`/labels/${v.id}`, { name: v.name })).data.label,
    onSuccess: () => invalidate("labels", "notes", "note"),
  });
}

export function useDeleteLabel() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/labels/${id}`)).data,
    onSuccess: () => invalidate("labels", "notes", "note"),
  });
}
