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
