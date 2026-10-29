import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "./api";

/* ------------------------------- Tipe ------------------------------- */

export type Role = "USER" | "OWNER";
export type Visibility = "all" | "public" | "private" | "trashed";

export interface OwnerUser {
  id: string;
  username: string;
  name: string | null;
  role: Role;
  avatar_url: string | null;
  created_at: string;
  is_suspended: boolean;
  last_login_at: string | null;
  books_count: number;
  notes_count: number;
  labels_count: number;
  chats_count: number;
}

export interface OwnerUserDetail extends OwnerUser {
  public_notes_count: number;
  trashed_notes_count: number;
}

export interface OwnerBookRow {
  id: string;
  title: string;
  is_favorite: boolean;
  created_at: string;
  deleted_at: string | null;
  pages_count: number;
}

export interface OwnerStats {
  totals: {
    users: number;
    owners: number;
    suspended: number;
    new_users_7d: number;
    new_users_30d: number;
    active_users_7d: number;
    books: number;
    books_trashed: number;
    notes: number;
    notes_public: number;
    notes_trashed: number;
    labels: number;
    chat_sessions: number;
    chat_messages: number;
  };
  signups: { date: string; count: number }[];
  recent_users: OwnerUser[];
  top_users: {
    id: string;
    username: string;
    name: string | null;
    avatar_url: string | null;
    books_count: number;
    notes_count: number;
  }[];
}

export interface Paged {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface UserFilters {
  q: string;
  role: "" | Role;
  status: "" | "active" | "suspended";
  sort: "newest" | "oldest" | "last_login" | "username";
  page: number;
}

export interface OwnerNoteRow {
  id: string;
  title: string;
  excerpt: string;
  is_public: boolean;
  in_trash: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  book: { id: string; title: string };
  author: { id: string; username: string; name: string | null };
}

export interface OwnerNoteDetail extends OwnerNoteRow {
  content: string;
  labels: { id: string; name: string }[];
}

export interface OwnerBookDetail {
  id: string;
  title: string;
  is_favorite: boolean;
  created_at: string;
  deleted_at: string | null;
  owner: { id: string; username: string; name: string | null; avatar_url: string | null };
  pages: {
    id: string;
    title: string;
    excerpt: string;
    is_public: boolean;
    is_favorite: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  }[];
}

export interface OwnerChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages_count: number;
}

export interface OwnerChatDetail {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  user: { id: string; username: string; name: string | null };
  messages: { id: string; role: "user" | "assistant"; content: string; has_image: boolean; created_at: string }[];
}

export interface OwnerSystem {
  app: string;
  environment: string;
  node: string;
  uptime_seconds: number;
  memory_mb: number;
  host_memory_total_mb: number;
  db: { ok: boolean; latency_ms: number };
  lutin_ai_configured: boolean;
  cors_origins: string[];
  trash: { retention_days: number; expired_books: number; expired_notes: number };
}

/* ------------------------------ Util ------------------------------ */

export function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/* ------------------------------ Queries ------------------------------ */

export function useOwnerStats() {
  return useQuery({
    queryKey: ["owner", "stats"],
    staleTime: 10_000,
    queryFn: async () => (await api.get<OwnerStats>("/owner/stats")).data,
  });
}

export function useOwnerUsers(f: UserFilters) {
  const params = { q: f.q || undefined, role: f.role || undefined, status: f.status || undefined, sort: f.sort, page: f.page, limit: 20 };
  return useQuery({
    queryKey: ["owner", "users", params],
    placeholderData: keepPreviousData,
    staleTime: 5_000,
    queryFn: async () => (await api.get<{ users: OwnerUser[] } & Paged>("/owner/users", { params })).data,
  });
}

export function useOwnerUser(id: string) {
  return useQuery({
    queryKey: ["owner", "user", id],
    enabled: !!id,
    retry: false,
    staleTime: 5_000,
    queryFn: async () => (await api.get<{ user: OwnerUserDetail; books: OwnerBookRow[] }>(`/owner/users/${id}`)).data,
  });
}

export function useOwnerBook(id: string) {
  return useQuery({
    queryKey: ["owner", "book", id],
    enabled: !!id,
    retry: false,
    staleTime: 5_000,
    queryFn: async () => (await api.get<{ book: OwnerBookDetail }>(`/owner/books/${id}`)).data.book,
  });
}

export function useOwnerNotes(f: { q: string; visibility: Visibility; user_id?: string; page: number }) {
  const params = { q: f.q || undefined, visibility: f.visibility, user_id: f.user_id || undefined, page: f.page, limit: 20 };
  return useQuery({
    queryKey: ["owner", "notes", params],
    placeholderData: keepPreviousData,
    staleTime: 5_000,
    queryFn: async () => (await api.get<{ notes: OwnerNoteRow[] } & Paged>("/owner/notes", { params })).data,
  });
}

export function useOwnerNote(id: string) {
  return useQuery({
    queryKey: ["owner", "note", id],
    enabled: !!id,
    retry: false,
    staleTime: 5_000,
    queryFn: async () => (await api.get<{ note: OwnerNoteDetail }>(`/owner/notes/${id}`)).data.note,
  });
}

export function useOwnerUserChats(userId: string, page: number) {
  return useQuery({
    queryKey: ["owner", "user-chats", userId, page],
    enabled: !!userId,
    placeholderData: keepPreviousData,
    staleTime: 5_000,
    queryFn: async () =>
      (await api.get<{ sessions: OwnerChatSession[] } & Paged>(`/owner/users/${userId}/chats`, { params: { page, limit: 10 } })).data,
  });
}

export function useOwnerChat(id: string) {
  return useQuery({
    queryKey: ["owner", "chat", id],
    enabled: !!id,
    retry: false,
    staleTime: 5_000,
    queryFn: async () => (await api.get<{ session: OwnerChatDetail }>(`/owner/chats/${id}`)).data.session,
  });
}

export function useOwnerSystem() {
  return useQuery({
    queryKey: ["owner", "system"],
    staleTime: 5_000,
    queryFn: async () => (await api.get<OwnerSystem>("/owner/system")).data,
  });
}

/* ----------------------------- Mutations ----------------------------- */

/** Semua data owner di-refresh setelah ada perubahan. */
function useOwnerMutation<TVars, TData = unknown>(fn: (v: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["owner"] }),
  });
}

export function useCreateUser() {
  return useOwnerMutation(async (v: { username: string; password: string; name?: string; role: Role }) =>
    (await api.post<{ user: OwnerUser }>("/owner/users", v)).data.user
  );
}

export function useUpdateUser() {
  return useOwnerMutation(async ({ id, ...body }: { id: string; name?: string; role?: Role; is_suspended?: boolean }) =>
    (await api.patch<{ user: OwnerUser }>(`/owner/users/${id}`, body)).data.user
  );
}

export function useResetPassword() {
  return useOwnerMutation(async ({ id, new_password }: { id: string; new_password: string }) =>
    (await api.post<{ message: string }>(`/owner/users/${id}/reset-password`, { new_password })).data
  );
}

export function useDeleteUser() {
  return useOwnerMutation(async (id: string) => (await api.delete(`/owner/users/${id}`)).data);
}

export function useDeleteOwnerBook() {
  return useOwnerMutation(async (id: string) => (await api.delete(`/owner/books/${id}`)).data);
}

export function useSetNotePublic() {
  return useOwnerMutation(async ({ id, is_public }: { id: string; is_public: boolean }) =>
    (await api.patch<{ is_public: boolean }>(`/owner/notes/${id}/public`, { is_public })).data
  );
}

export function useDeleteOwnerNote() {
  return useOwnerMutation(async (id: string) => (await api.delete(`/owner/notes/${id}`)).data);
}

export function usePurgeTrash() {
  return useOwnerMutation(async (_v: void) =>
    (await api.post<{ purged_books: number; purged_notes: number }>("/owner/system/purge-trash")).data
  );
}
