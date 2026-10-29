/* Lucibook service worker — DIHASILKAN oleh scripts/build-sw.mjs saat `npm run build`. Edit sw.template.js, bukan public/sw.js. */
const VERSION = "__VERSION__";
const PRECACHE = __PRECACHE__; // semua berkas /_next/static/* hasil build
const STATIC_CACHE = "lucibook-static";
const PAGES_CACHE = "lucibook-pages-" + VERSION;

// Kerangka halaman yang disimpan agar aplikasi bisa dibuka tanpa internet.
// Rute dinamis memakai placeholder "_" (halaman membaca id dari URL, bukan dari kerangka ini).
const SHELLS = [
  "/", "/login", "/register", "/dashboard", "/books", "/favorites", "/labels", "/trash", "/settings", "/explore", "/lutin-ai",
  "/notes/_", "/books/_", "/books/_/read", "/labels/_", "/explore/_",
];
const EXTRA = ["/manifest.webmanifest", "/icon.svg", "/icons/icon-192.png", "/icons/icon-512.png"];

const normPath = (p) => (p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p);

function shellKey(pathname) {
  const p = normPath(pathname);
  if (/^\/notes\/[^/]+$/.test(p)) return "/notes/_";
  if (/^\/books\/[^/]+\/read$/.test(p)) return "/books/_/read";
  if (/^\/books\/[^/]+$/.test(p)) return "/books/_";
  if (/^\/labels\/[^/]+$/.test(p)) return "/labels/_";
  if (/^\/explore\/[^/]+$/.test(p)) return "/explore/_";
  return p;
}

const keyReq = (path) => new Request(self.location.origin + path);

async function putShell(cache, path) {
  const res = await fetch(path, { cache: "reload", credentials: "same-origin" });
  if (res.ok && !res.redirected) await cache.put(keyReq(path), res);
}

async function precache() {
  const pages = await caches.open(PAGES_CACHE);
  const statics = await caches.open(STATIC_CACHE);
  const jobs = [];
  for (const path of SHELLS) jobs.push(putShell(pages, path));
  for (const path of EXTRA) {
    jobs.push(
      statics.match(path).then((hit) => (hit ? undefined : fetch(path).then((r) => (r.ok ? statics.put(path, r) : undefined))))
    );
  }
  for (const url of PRECACHE) {
    jobs.push(
      statics.match(url).then((hit) => (hit ? undefined : fetch(url).then((r) => (r.ok ? statics.put(url, r) : undefined))))
    );
  }
  await Promise.allSettled(jobs); // sebagian gagal tidak boleh membatalkan instalasi
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith("lucibook-pages-") && name !== PAGES_CACHE) await caches.delete(name);
      }
      // Buang aset build lama (nama berkas ber-hash) supaya cache tidak membengkak.
      if (PRECACHE.length) {
        const keep = new Set(PRECACHE.map((u) => self.location.origin + u));
        const statics = await caches.open(STATIC_CACHE);
        for (const req of await statics.keys()) {
          if (new URL(req.url).pathname.startsWith("/_next/static/") && !keep.has(req.url)) await statics.delete(req);
        }
      }
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "WARM") event.waitUntil(precache());
});

async function cacheFirst(req) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    return Response.error();
  }
}

const OFFLINE_HTML =
  '<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  "<title>Lucibook offline</title></head>" +
  '<body style="font-family:system-ui,sans-serif;background:#FFF7F9;color:#6E3049;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:24px">' +
  "<div><h1>Kamu sedang offline</h1><p>Halaman ini belum tersimpan di perangkat. Buka Lucibook sekali saat online, lalu aplikasi bisa dipakai tanpa internet.</p>" +
  '<p><a href="/dashboard" style="color:#C2567F">Coba lagi</a></p></div></body></html>';

async function navigate(req, event) {
  const url = new URL(req.url);
  const key = shellKey(url.pathname);
  const pages = await caches.open(PAGES_CACHE);
  const cached = (await pages.match(keyReq(key))) || null;
  const isShellRoute = SHELLS.includes(key);

  const network = fetch(req).then((res) => {
    // Perbarui kerangka halaman di belakang layar supaya selalu mengarah ke build terbaru.
    if (res.ok && !res.redirected && res.type === "basic" && isShellRoute && url.pathname === key) {
      event.waitUntil(pages.put(keyReq(key), res.clone()));
    }
    return res;
  });

  const fallback = async () =>
    cached || (await pages.match(keyReq("/"))) || new Response(OFFLINE_HTML, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });

  if (!cached) return network.catch(fallback);
  // Ada salinan: tunggu jaringan maksimal 3 dtk (koneksi jelek), lalu pakai salinan.
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 3000));
  try {
    const res = await Promise.race([network, timeout]);
    return res || cached;
  } catch (err) {
    return cached;
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // API backend ada di origin lain & ditangani lapisan data lokal
  if (url.pathname === "/sw.js" || url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname === "/icon.svg" || url.pathname === "/manifest.webmanifest") {
    event.respondWith(cacheFirst(req));
    return;
  }
  if (req.mode === "navigate") {
    event.respondWith(navigate(req, event));
  }
  // Permintaan RSC / prefetch Next: biarkan ke jaringan; saat offline Next otomatis memuat ulang halaman penuh (ditangani di atas).
});
