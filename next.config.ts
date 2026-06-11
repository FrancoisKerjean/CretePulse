import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
];

const nextConfig: NextConfig = {
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
      { hostname: "media.crete.direct" },
    ],
  },
  async redirects() {
    const qr = (code: string, slug: string) => ({
      source: `/go/${code}`,
      destination: `/en/near-me?from=${slug}&utm_source=qr&utm_medium=print&utm_campaign=${code}`,
      permanent: false, // 307 : garder la main sur la destination tant que la campagne print n'est pas figée
    });
    return [qr("her", "heraklion"), qr("chq", "chania-airport"), qr("jsh", "sitia")];
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  silent: true,
  disableLogger: true,
});
