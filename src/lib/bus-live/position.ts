// Moteur pur de position estimée des bus. Zéro I/O.
// Convention import : valeurs cross-module en relatif + extension .ts
// (le loader node de check-bus-live.mjs ne résout pas l'alias @/ ;
// allowImportingTsExtensions est activé donc tsc accepte l'extension).
// Spec : docs/superpowers/specs/2026-06-15-bus-live-engine-design.md

/** Normalise un nom de lieu : minuscules, sans diacritiques, alphanum + espaces. */
export function normalizePlace(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function bigrams(s: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2));
  return out;
}

/** Similarité 0..1 (Dice sur bigrammes de caractères), tolérante Chania/Khania. */
export function placeSimilarity(a: string, b: string): number {
  const na = normalizePlace(a).replace(/ /g, "");
  const nb = normalizePlace(b).replace(/ /g, "");
  if (na.length === 0 || nb.length === 0) return 0;
  if (na === nb) return 1;
  const ba = bigrams(na);
  const bb = bigrams(nb);
  if (ba.length === 0 || bb.length === 0) return 0;
  const count = new Map<string, number>();
  for (const g of bb) count.set(g, (count.get(g) ?? 0) + 1);
  let inter = 0;
  for (const g of ba) {
    const c = count.get(g) ?? 0;
    if (c > 0) { inter++; count.set(g, c - 1); }
  }
  return (2 * inter) / (ba.length + bb.length);
}
