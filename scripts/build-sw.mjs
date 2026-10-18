// Membuat public/sw.js dari scripts/sw.template.js + daftar berkas hasil build (.next/static).
// Dijalankan otomatis oleh "postbuild". Tanpa folder .next (mis. dev) hasilnya SW dengan precache kosong.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const staticDir = join(root, ".next", "static");

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (!name.endsWith(".map")) out.push(p);
  }
  return out;
}

const files = existsSync(staticDir)
  ? walk(staticDir)
      .map((p) => "/_next/static/" + relative(staticDir, p).split(sep).join("/"))
      .sort()
  : [];

const buildIdPath = join(root, ".next", "BUILD_ID");
const buildId = existsSync(buildIdPath) ? readFileSync(buildIdPath, "utf8").trim() : "dev";
const version = createHash("sha1").update(buildId + files.join("|")).digest("hex").slice(0, 12);

const template = readFileSync(join(root, "scripts", "sw.template.js"), "utf8");
const out = template.replace("__VERSION__", version).replace("__PRECACHE__", JSON.stringify(files));
writeFileSync(join(root, "public", "sw.js"), out);
console.log(`[sw] public/sw.js dibuat: versi ${version}, ${files.length} berkas di-precache`);
