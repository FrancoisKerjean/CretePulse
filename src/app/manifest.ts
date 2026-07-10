// src/app/manifest.ts
// Manifest PWA : rend possible l'ajout à l'écran d'accueil (prérequis du web
// push sur iOS 16.4+). Couleurs DA crete.direct (night #07374A).
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Crete Direct",
    short_name: "Crete Direct",
    description: "Crete live: buses with real GPS, beach conditions, practical info.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#07374A",
    theme_color: "#07374A",
    categories: ["travel", "navigation"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      // Icône chèvre kri-kri dédiée maskable (safe zone respectée), générée 10/07.
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Live buses", url: "/live", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Beaches today", url: "/beaches/today", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
