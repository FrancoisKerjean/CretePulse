// src/app/manifest.ts
// Manifest PWA : rend possible l'ajout à l'écran d'accueil (prérequis du web
// push sur iOS 16.4+). Couleurs DA crete.direct (night #07374A).
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Crete Direct",
    short_name: "Crete Direct",
    description: "Crete live: bus alerts, weather, practical info.",
    start_url: "/",
    display: "standalone",
    background_color: "#07374A",
    theme_color: "#07374A",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
