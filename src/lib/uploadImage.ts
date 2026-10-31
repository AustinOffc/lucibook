import { api, API_URL } from "./api";
import { LocalError } from "./offline/errors";

const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const MAX_SIDE = 1600;

/** Baca "magic bytes": jangan percaya ekstensi / file.type dari browser. SVG & file lain otomatis ditolak. */
async function sniffMime(file: File): Promise<"image/jpeg" | "image/png" | "image/gif" | "image/webp" | null> {
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "image/gif";
  const riff = String.fromCharCode(b[0], b[1], b[2], b[3]);
  const webp = String.fromCharCode(b[8], b[9], b[10], b[11]);
  if (riff === "RIFF" && webp === "WEBP") return "image/webp";
  return null;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new LocalError("File ini bukan gambar yang valid atau rusak."));
    };
    img.src = url;
  });
}

/**
 * Pilih gambar dari galeri -> divalidasi -> digambar ulang di canvas (maks 1600px, jadi piksel murni) -> diunggah.
 * Server memeriksa ulang dan menulis ulang gambar, jadi file palsu tetap ditolak walau lolos di sini.
 * Mengembalikan URL gambar yang siap disisipkan ke catatan.
 */
export async function uploadNoteImage(file: File): Promise<string> {
  if (file.size === 0) throw new LocalError("File kosong.");
  if (file.size > MAX_SOURCE_BYTES) throw new LocalError("Ukuran gambar maksimal 15 MB.");
  const kind = await sniffMime(file);
  if (!kind) throw new LocalError("Format tidak didukung. Pakai gambar JPG, PNG, WEBP, atau GIF.");

  const img = await loadImage(file); // gagal didekode browser = bukan gambar sungguhan
  const w0 = img.naturalWidth;
  const h0 = img.naturalHeight;
  if (!w0 || !h0) throw new LocalError("Gambar tidak valid.");

  const scale = Math.min(1, MAX_SIDE / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * scale));
  const h = Math.max(1, Math.round(h0 * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new LocalError("Browser tidak mendukung pengolahan gambar.");
  ctx.drawImage(img, 0, 0, w, h);

  let mime: "image/webp" | "image/jpeg" = "image/webp";
  let dataUrl = canvas.toDataURL("image/webp", 0.85);
  if (!dataUrl.startsWith("data:image/webp")) {
    // Browser tanpa dukungan WEBP: pakai JPEG berlatar putih.
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    dataUrl = canvas.toDataURL("image/jpeg", 0.88);
    mime = "image/jpeg";
  }
  const data = dataUrl.split(",")[1];
  if (!data) throw new LocalError("Gagal memproses gambar.");

  const res = await api.post<{ image: { id: string; path: string } }>("/images", { mime, data });
  return `${API_URL}${res.data.image.path}`;
}
