import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lucibook",
    short_name: "Lucibook",
    description: "Catat, simpan, dan bagikan ide-idemu — juga saat offline.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#FFF7F9",
    theme_color: "#F092B1",
    lang: "id",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
