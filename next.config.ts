import path from "node:path";
import { fileURLToPath } from "node:url";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Racine Turbopack epinglee au depot. Sans cela, Next remonte jusqu'au premier
// lockfile trouve : en local, `C:\Users\fkerj` en porte un (monorepo perso du
// home), Turbopack prend le home pour racine de workspace et `next dev` sert un
// 404 sur TOUTES les routes API. Sur Vercel le depot est cloné seul, la valeur
// est donc identique et le build ne change pas.
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
];

const nextConfig: NextConfig = {
  turbopack: { root: projectRoot },
  images: {
    // Optimisation activée (AVIF/WebP + resize) — gain ~3-4x sur les images.
    // Coût Vercel à l'usage, borné (transformations cachées 31j). Surveillé.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2678400, // 31j — réduit les re-transformations facturées
    remotePatterns: [
      { hostname: "upload.wikimedia.org" },
      { hostname: "**.wikimedia.org" },
      { hostname: "images.unsplash.com" },
      { hostname: "images.pexels.com" },
      { hostname: "a0.muscache.com" },
      // Sert aussi les 55 photos des 3 annonces /stays depuis le 12/08/2026.
      // Les hotes kairosguest.com et le bucket Supabase Kairos ont ete retires
      // le meme jour, APRES la bascule de stay_listings.photos : les retirer
      // avant aurait fait repondre 400 a /_next/image et vide les fiches.
      { hostname: "media.crete.direct" },
    ],
  },
  async redirects() {
    const qr = (code: string, slug: string) => ({
      source: `/go/${code}`,
      destination: `/en/near-me?from=${slug}&utm_source=qr&utm_medium=print&utm_campaign=${code}`,
      permanent: false, // 307 : garder la main sur la destination tant que la campagne print n'est pas figée
    });
    // Cannibalisation SEO : les 4 getting-around inter-villes doublonnent les pages-trajet
    // canoniques /buses/[pair]. 301 vers le canonique (slug alphabétique) pour concentrer
    // l'autorité. getting-around ne garde que le multimodal réel (aéroport, ferry).
    const gar = (from: string, pair: string) => ({
      source: `/:locale/getting-around/${from}`,
      destination: `/:locale/buses/${pair}`,
      permanent: true, // 301
    });
    // ⛔ LES 18 LOCALES RETIRÉES DU ROUTAGE LE 20/09/2026, ET CETTE LISTE DOIT RESTER LE
    // COMPLÉMENT EXACT DE `routing.locales`. Elle est écrite en clair ici, pas importée :
    // `next.config.ts` est chargé avant le bundle et une garde de source
    // (`src/i18n/routing.test.ts`) vérifie qu'elle correspond à `RETIRED_LOCALES`.
    // Motif : chaque locale routée est un jeu de ~24 000 routes ISR offertes aux robots, et
    // les ISR Writes sont le 1er poste de la facture Vercel (18,15 $ sur 56,36 $, cycle
    // 19/08-18/09). 301 et non 404 : aucun vieux lien ne meurt.
    const retired = "it|nl|pl|es|pt|ru|ja|ko|zh|tr|sv|da|no|fi|cs|hu|ro|ar";
    return [
      // Le préfixe nu (`/ja`) ET le préfixe suivi d'un chemin (`/ja/beaches`) : `:path*`
      // accepte zéro segment, mais la règle nue évite un `/en/` à slash final.
      { source: `/:locale(${retired})`, destination: "/en", permanent: true },
      { source: `/:locale(${retired})/:path*`, destination: "/en/:path*", permanent: true },
      qr("her", "heraklion"), qr("chq", "chania-airport"), qr("jsh", "sitia"),
      gar("heraklion-to-chania", "chania-to-heraklion"),
      gar("heraklion-to-rethymno", "heraklion-to-rethymno"),
      gar("heraklion-to-agios-nikolaos", "agios-nikolaos-to-heraklion"),
      gar("heraklion-to-sitia", "heraklion-to-sitia"),
      // /map supprimée (décision 09/07/2026) : /explore est LA carte unique du site.
      { source: "/:locale/map", destination: "/:locale/explore", permanent: true },
      { source: "/map", destination: "/explore", permanent: true },
    ];
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  silent: true,
  disableLogger: true,
});
