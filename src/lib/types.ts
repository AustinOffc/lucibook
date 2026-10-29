export interface User {
  id: string;
  username: string;
  name?: string | null;
  avatar_url?: string | null;
  /** Peran akun. Hanya untuk tampilan: hak akses selalu dicek server. */
  role?: "USER" | "OWNER";
  created_at: string;
}

export interface Label {
  id: string;
  name: string;
  user_id?: string;
  _count?: { notes: number };
}

export interface Book {
  id: string;
  title: string;
  user_id: string;
  is_favorite: boolean;
  created_at: string;
  _count?: { pages: number };
}

/** Bentuk catatan dari backend (shapeNote). Daftar -> `excerpt`, detail -> `content`. */
export interface Note {
  id: string;
  title: string;
  content?: string;
  excerpt?: string;
  book_id: string;
  is_public: boolean;
  /** Tidak dikirim oleh GET /explore/:id (data pribadi pemilik). */
  is_favorite?: boolean;
  created_at: string;
  updated_at: string;
  labels: Label[];
  book: { id: string; title: string };
  author: string;
}

export interface NoteFilters {
  q?: string;
  book_id?: string;
  label_id?: string;
  favorite?: boolean;
}

export interface TrashBook {
  id: string;
  title: string;
  page_count: number;
  deleted_at: string;
  expires_at: string;
}

export interface TrashNote {
  id: string;
  title: string;
  excerpt: string;
  book: { id: string; title: string };
  deleted_at: string;
  expires_at: string;
}

export interface Trash {
  books: TrashBook[];
  notes: TrashNote[];
}
