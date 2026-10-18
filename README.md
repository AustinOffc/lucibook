# Lucibook Frontend

Next.js 14 (App Router) + TypeScript + Tailwind CSS + Axios + React Query + TipTap.
Terhubung ke `lucibook-backend` (Express + Prisma) lewat REST API prefix `/api`.

## Menjalankan lokal

```bash
cp .env.example .env.local      # isi NEXT_PUBLIC_API_URL
npm install
npm run dev                     # http://localhost:3000
```

Backend harus jalan dulu (`npm run dev` di `lucibook-backend`, default port 3001).
Pastikan `CORS_ORIGINS` di backend memuat `http://localhost:3000`.

## Deploy ke Vercel

1. Push folder `lucibook-frontend` ke GitHub, import ke Vercel (framework: Next.js).
2. Environment Variable: `NEXT_PUBLIC_API_URL` = `https://<domain-tunnel-kamu>/api`
   (harus HTTPS, pakai `/api` di akhir, tanpa slash penutup).
3. Di backend (Pterodactyl) set `CORS_ORIGINS` ke domain Vercel kamu, mis. `https://lucibook.vercel.app`,
   atau biarkan `ALLOW_VERCEL_PREVIEWS=true` untuk domain preview `*.vercel.app`. Restart backend.
4. Redeploy frontend setiap kali `NEXT_PUBLIC_API_URL` berubah (nilainya ditanam saat build).

## Autentikasi

Login/register mengembalikan JWT di cookie HttpOnly **dan** di body. Karena Vercel dan tunnel beda
origin (cookie lintas-situs sering diblokir browser), frontend menyimpan `token` di `localStorage`
dan mengirimnya sebagai `Authorization: Bearer`. Bila server membalas 401, sesi dibersihkan dan
pengguna diarahkan ke `/login`.

## Peta halaman

| Rute | Keterangan |
|---|---|
| `/login`, `/register` | Autentikasi |
| `/dashboard` | Semua catatan + pencarian real-time (kolom cari di Topbar) |
| `/books`, `/books/[id]` | CRUD buku, daftar halaman di dalam buku |
| `/notes/[id]` | Editor rich text (autosave, favorit, publik/privat, label, pindah buku) |
| `/favorites` | Catatan & buku favorit |
| `/labels`, `/labels/[id]` | Kelola label, daftar catatan per label |
| `/settings` | Info akun, logout |
| `/explore`, `/explore/[id]` | Publik, read-only, tanpa login |

## Embed audio/video

Tombol ▶ di toolbar menerima tautan YouTube, Spotify, Vimeo, SoundCloud, atau berkas langsung
`.mp3`/`.mp4`, lalu mengubahnya menjadi iframe/audio/video. Host iframe sengaja sama dengan whitelist
sanitizer backend (`src/utils/sanitize.ts`); jika kamu menambah host di backend, tambahkan juga di
`src/lib/embed.ts`.

## Mode offline (PWA)

Lucibook bisa dibuka dan dipakai tanpa internet, dan data yang sudah tersimpan tetap ada.

**Cara kerja**
- Semua data (buku, catatan + isinya, label, Sampah) disalin ke **IndexedDB** di perangkat (satu database per akun).
  Semua tampilan membaca dari salinan ini, jadi cepat dan tetap jalan saat offline. Pencarian juga berjalan lokal.
- Setiap perubahan (buat/ubah/hapus/favorit/label/pindah buku/Sampah) langsung tersimpan lokal dan masuk **antrean**.
  Antrean dikirim ke server berurutan saat online (otomatis: saat koneksi kembali, setelah menulis, tiap 20 detik bila ada yang tertunda).
  Edit beruntun pada catatan yang sama digabung jadi satu pengiriman.
- Catatan/buku/label yang dibuat offline memakai id sementara (`tmp_...`) dan otomatis diganti id server setelah terkirim.
- Setelah antrean kosong, aplikasi mengunduh keadaan terbaru server (perubahan dari perangkat lain ikut masuk).
  Isi catatan diunduh di latar belakang; catatan yang belum sempat diunduh diunduh saat dibuka (butuh online sekali).
- **Konflik**: bila catatan yang sama diubah di dua perangkat, versi dari perangkat yang sedang offline dipakai
  dan versi server disimpan sebagai catatan baru berjudul "... (versi lain)". Tidak ada yang hilang.
- Perubahan yang ditolak server (mis. catatan sudah dihapus permanen di perangkat lain) tidak memblokir antrean;
  daftarnya muncul di **Pengaturan > Sinkronisasi & offline**.
- **Service worker** (`public/sw.js`, dibuat otomatis oleh `npm run build` lewat `scripts/build-sw.mjs`) menyimpan kerangka
  halaman dan semua aset `/_next/static`, sehingga aplikasi bisa dibuka (dan di-install ke layar utama) tanpa internet.
  Service worker hanya aktif di produksi (`npm run build && npm start` atau Vercel), tidak di `npm run dev`.
- Keluar (logout) menghapus data lokal akun itu dari perangkat. Bila masih ada perubahan yang belum terkirim, aplikasi
  mencoba mengirimnya dulu dan meminta konfirmasi kalau masih gagal. Sesi yang kedaluwarsa **tidak** menghapus data lokal.

**Batasan**
- Login/daftar tetap butuh internet. Akun harus sudah pernah masuk dan memuat data sekali di perangkat itu.
- Explore butuh internet (halaman yang pernah dibuka masih bisa dibaca dari cache).
- Daftar catatan dari server dibatasi 100 per buku (batas `GET /notes`); catatan di atas itu belum ikut tersalin.
- Safari/iOS bisa menghapus data situs yang tidak dipakai berminggu-minggu; install ke layar utama agar lebih aman.

Berkas: `src/lib/offline/` (`store.ts` data lokal + antrean, `sync.ts` sinkronisasi, `idb.ts`, `explore.ts`), `scripts/sw.template.js`.
