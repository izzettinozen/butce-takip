import type { MetadataRoute } from "next";

/**
 * PWA manifest'i — Next.js metadata route'u.
 * /manifest.webmanifest adresinde sunulur.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bütçe Takip",
    short_name: "Bütçe",
    description: "Kişisel bütçe ve gider takip uygulaması",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "tr",
    dir: "ltr",
    background_color: "#f8fafc",
    theme_color: "#6366f1",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
