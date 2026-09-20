import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // 4 depuis le 20/09/2026, 22 avant. Les 18 retirées sont dans RETIRED_LOCALES plus bas et
  // redirigent en 301 vers /en depuis next.config.ts : aucune URL ne casse, aucun backlink ne
  // meurt : la promesse du 01/08 tient, par la redirection au lieu du service.
  //
  // Motif, mesuré le 20/09/2026 sur la facture Vercel du cycle 19/08-18/09 : ISR Writes
  // 4 886 032 = 18,15 $, PREMIER poste des 56,36 $ de consommation. Une locale routée est un
  // jeu complet de ~24 000 routes ISR offertes aux robots, et 22 locales en faisaient ~528 000
  // pour 3 413 événements Web Analytics sur le mois.
  // ⛔ Le `noindex` du 01/08 n'y a rien changé : il agit sur l'indexation, pas sur le ROUTAGE,
  // et une page noindex se régénère quand un robot la demande, exactement comme les autres.
  locales: ["en", "fr", "de", "el"],
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
 * Les 18 locales retirées du routage le 20/09/2026. Elles ne sont plus servies :
 * `next.config.ts` les redirige en 301 vers l'équivalent sous /en.
 *
 * ⛔ CETTE LISTE ET `routing.locales` NE DOIVENT JAMAIS SE CHEVAUCHER NI LAISSER DE TROU.
 * Une locale présente dans les deux se redirigerait hors d'elle-même ; une locale absente des
 * deux rendrait 404 sur ses vieux liens. `routing.test.ts` vérifie les deux sens contre la
 * liste historique des 22, et une garde de source vérifie que `next.config.ts` redirige
 * exactement celles-ci.
 *
 * ⚠️ Ce qu'on accepte en les coupant, mesure GSC du 01/08/2026 : les 18 cumulaient ~700 clics
 * par mois AVANT l'effondrement du 19/07. Après, le site entier est à 40 impressions/jour :
 * ces 700 clics n'existent plus, et c'est ce qui rend l'arbitrage soutenable aujourd'hui.
 * Le retour arrière est une ligne, les fichiers de traduction restent au dépôt.
 */
export const RETIRED_LOCALES = [
  "it", "nl", "pl", "es", "pt", "ru", "ja", "ko", "zh",
  "tr", "sv", "da", "no", "fi", "cs", "hu", "ro", "ar",
] as const;

/**
 * Locales exposees a l'indexation.
 *
 * ⚠️ Depuis le 20/09/2026 cette liste est IDENTIQUE à `routing.locales` : tout ce qui est
 * routé est indexable. Elle reste séparée exprès : c'est elle que lisent le middleware,
 * `buildAlternates()` et le sitemap, et les deux notions redeviendraient distinctes le jour
 * où une locale serait routée sans être indexée. Le `X-Robots-Tag: noindex, follow` du
 * middleware ne se déclenche donc plus pour personne, et ce n'est pas un défaut.
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

/**
 * Locales qui s'écrivent de droite à gauche, pour le `dir` du `<html>`.
 *
 * ⚠️ `ar` est la seule, et elle est retirée du routage depuis le 20/09/2026 : aucune locale
 * servie n'est RTL aujourd'hui. La fonction reste exprès, et prend un `string` et non une
 * locale typée : écrit `locale === "ar"` dans le layout, TypeScript refusait la comparaison
 * dès que `ar` a quitté l'union, et la réactiver aurait rendu la page en `ltr` sans un mot.
 */
const RTL_LOCALES: readonly string[] = ["ar"];

export function isRtlLocale(locale: string): boolean {
  return RTL_LOCALES.includes(locale);
}

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
