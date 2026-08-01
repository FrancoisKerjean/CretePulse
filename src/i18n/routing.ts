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
  // Disable the NEXT_LOCALE cookie. next-intl set it on every request, which forced
  // `Cache-Control: private, no-store` and made the CDN never cache the output. Locale lives
  // in the URL prefix (/en, /fr...) so the cookie is not needed. Pairs with setRequestLocale()
  // in the layout + pages to make next-intl render statically (cacheable at the edge).
  localeCookie: false,
  // false depuis le 01/08/2026 : next-intl ajoutait un en-tete HTTP
  // `Link: <...>; rel="alternate"; hreflang="..."` pour les 22 locales sur CHAQUE reponse,
  // ce qui declarait a Google 22 variantes de chaque page. Les hreflang du perimetre
  // indexable sont desormais emis par buildAlternates() dans le <head>, et par le sitemap.
  alternateLinks: false,
});

/**
 * Locales exposees a l'indexation. Les autres restent SERVIES (aucune URL ne casse,
 * aucun backlink ne meurt) mais sortent des hreflang et recoivent un `X-Robots-Tag:
 * noindex, follow` dans le middleware.
 *
 * Contexte : effondrement Google du 19/07/2026, -93 % d'impressions site-wide.
 * Google connaissait ~237 000 URL pour 3 705 pages declarees au sitemap, et rejetait
 * massivement les variantes traduites. Perimetre tranche par Francois le 01/08/2026
 * sur la mesure GSC des 30 jours precedant la chute : en 1 800 clics, fr 1 375, de 872,
 * el 83 = 85,1 % du total ; les 18 autres langues cumulaient ~700 clics/mois.
 * `el` est garde pour la legitimite locale et le dossier B2G KTEL, pas pour son trafic.
 *
 * Spec : docs/superpowers/specs/2026-08-01-seo-locale-scope-design.md
 */
export const INDEXABLE_LOCALES = ["en", "fr", "de", "el"] as const;

export type IndexableLocale = (typeof INDEXABLE_LOCALES)[number];

export function isIndexableLocale(locale: string): locale is IndexableLocale {
  return (INDEXABLE_LOCALES as readonly string[]).includes(locale);
}

/**
 * Locale portee par le premier segment du chemin, ou null.
 *
 * Compare le SEGMENT entier, jamais un prefixe : un `startsWith("/en")` ferait passer
 * `/enquete/paradoxe-tourisme-crete` pour la locale `en`. Sur un prefixe hors perimetre
 * la meme faute mettrait en noindex une page qui doit rester indexee.
 */
export function localeFromPathname(pathname: string): string | null {
  const segment = pathname.split("/")[1];
  if (!segment) return null;
  return (routing.locales as readonly string[]).includes(segment) ? segment : null;
}
