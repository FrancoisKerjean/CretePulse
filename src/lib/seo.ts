import { routing } from "@/i18n/routing";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

/**
 * Build alternates metadata for hreflang tags.
 * @param path - The path after locale, e.g. "/beaches/balos" or "" for home
 */
export function buildAlternates(locale: string, path: string = "") {
  const canonical = `${BASE_URL}/${locale}${path}`;
  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    languages[loc] = `${BASE_URL}/${loc}${path}`;
  }
  languages["x-default"] = `${BASE_URL}/en${path}`;
  return { canonical, languages };
}
