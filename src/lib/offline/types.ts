/** Bentuk data di penyimpanan lokal (IndexedDB). Respons API dibentuk ulang dari sini. */

export interface LocalBook {
  id: string;
  title: string;
  user_id: string;
  is_favorite: boolean;
  created_at: string;
  deleted_at: string | null;
  /** Jumlah halaman menurut server untuk buku di Sampah yang isinya belum pernah diunduh. */
  page_count_hint?: number;
}

export interface LocalNote {
  id: string;
  title: string;
  excerpt: string;
  book_id: string;
  is_public: boolean;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  label_ids: string[];
  author: string;
  /** `updated_at` versi server yang terakhir diketahui perangkat ini (null = belum pernah ke server). */
  base_updated_at: string | null;
  /** false = isi terbaru belum diunduh (daftar tetap tampil dari ringkasan). */
  has_content: boolean;
}

export interface LocalLabel {
  id: string;
  name: string;
  user_id: string;
}

export type NewOp =
  | { type: "book.create"; tmp_id: string; title: string }
  | { type: "book.update"; id: string; title: string }
  | { type: "book.favorite"; id: string }
  | { type: "book.delete"; id: string }
  | { type: "note.create"; tmp_id: string; book_id: string; title: string; content: string }
  | { type: "note.update"; id: string; patch: { title?: string; content?: string; book_id?: string } }
  | { type: "note.favorite"; id: string }
  | { type: "note.public"; id: string }
  | { type: "note.labels"; id: string; label_ids: string[] }
  | { type: "note.delete"; id: string }
  | { type: "label.create"; tmp_id: string; name: string }
  | { type: "label.update"; id: string; name: string }
  | { type: "label.delete"; id: string }
  | { type: "trash.restoreBook"; id: string }
  | { type: "trash.restoreNote"; id: string }
  | { type: "trash.purgeBook"; id: string }
  | { type: "trash.purgeNote"; id: string }
  | { type: "trash.empty" };

export type Op = NewOp & {
  /** Kunci antrean (urutan kirim). */
  seq?: number;
  created: number;
  /** Sedang dikirim: tidak boleh digabung dengan perubahan baru. */
  inflight?: boolean;
  /** Pernah dikirim tetapi balasannya tidak diterima (koneksi putus): cek dulu ke server sebelum membuat ulang. */
  attempted?: boolean;
};

export interface DroppedOp {
  type: string;
  message: string;
  at: number;
}
