export type ParsedEmbed =
  | { type: "iframe"; src: string; kind: "video" | "audio"; height: number }
  | { type: "audio" | "video"; src: string };

/**
 * Ubah tautan biasa menjadi sumber embed. Host iframe HARUS sama dengan whitelist backend
 * (src/utils/sanitize.ts): youtube-nocookie/youtube, open.spotify.com, player.vimeo.com, w.soundcloud.com.
 */
export function parseEmbedUrl(input: string): ParsedEmbed | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
  const path = url.pathname;

  const youtube = (id?: string | null): ParsedEmbed | null =>
    id && /^[\w-]{6,}$/.test(id)
      ? { type: "iframe", kind: "video", height: 315, src: `https://www.youtube-nocookie.com/embed/${id}` }
      : null;

  // YouTube
  if (host === "youtu.be") return youtube(path.slice(1).split("/")[0]);
  if (host === "youtube.com" || host === "music.youtube.com") {
    return youtube(url.searchParams.get("v") || path.match(/^\/(?:embed|shorts|live)\/([\w-]+)/)?.[1]);
  }

  // Spotify
  if (host === "open.spotify.com") {
    const m = path.match(/^\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/);
    if (m) {
      const compact = m[1] === "track" || m[1] === "episode";
      return { type: "iframe", kind: "audio", height: compact ? 152 : 352, src: `https://open.spotify.com/embed/${m[1]}/${m[2]}` };
    }
    return null;
  }

  // Vimeo
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = path.match(/^\/(?:video\/)?(\d+)/)?.[1];
    return id ? { type: "iframe", kind: "video", height: 315, src: `https://player.vimeo.com/video/${id}` } : null;
  }

  // SoundCloud
  if (host === "soundcloud.com") {
    const target = encodeURIComponent(url.origin + url.pathname);
    return {
      type: "iframe",
      kind: "audio",
      height: 166,
      src: `https://w.soundcloud.com/player/?url=${target}&color=%23e46f96&auto_play=false`,
    };
  }

  // Berkas langsung
  if (/\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(path)) return { type: "audio", src: url.toString() };
  if (/\.(mp4|webm|mov|m4v)$/i.test(path)) return { type: "video", src: url.toString() };

  return null;
}
