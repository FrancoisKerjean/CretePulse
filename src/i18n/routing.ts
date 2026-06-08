import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "fr", "de", "el", "it", "nl", "pl", "es", "pt", "ru", "ja", "ko", "zh", "tr", "sv", "da", "no", "fi", "cs", "hu", "ro", "ar"],
  defaultLocale: "en",
  localePrefix: "always",
  // false on purpose: localeDetection:true made next-intl read Accept-Language and set a
  // NEXT_LOCALE cookie on every request, which forced `Cache-Control: no-store` and made the
  // CDN never cache the ISR output (X-Vercel-Cache: MISS on every hit). With it off, pages are
  // served as static HTML from the edge -> much better TTFB/LCP and far less Supabase/Vercel load.
  // First-time visitors land on the default locale (en) and can switch via the language picker.
  localeDetection: false,
  alternateLinks: true,
});
