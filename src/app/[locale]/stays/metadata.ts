import type { Metadata } from "next";
import { META, pickStaysLocale, type StaysMetaKey } from "./content";

// Toutes les pages /stays sont en noindex + nofollow (decision Kami 25/07/2026).
// Raison : la marketplace n'a pas encore d'annonce reelle, le solde 70 % n'est pas
// encaissable (fast-follow, butoir 15/08/2026) et crete.direct traverse un
// effondrement algo depuis le 19/07. Les pages restent accessibles par URL directe,
// ne sont liees ni depuis la nav ni depuis le Footer, et n'entrent pas au sitemap.
// A lever en meme temps que le premier listing publie : retirer le bloc `robots`,
// ajouter buildAlternates() et referencer /stays dans sitemap.xml + Footer.
export function staysMetadata(locale: string, key: StaysMetaKey): Metadata {
  const m = META[pickStaysLocale(locale)][key];
  return {
    title: m.title,
    description: m.desc,
    robots: { index: false, follow: false },
  };
}
