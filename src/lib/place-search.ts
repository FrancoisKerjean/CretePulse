// Recherche de lieux pour /search : correspondance par début de mot sur les noms de
// cb_places, servis par /search-index.json. Module pur, testé sans réseau.

/** [nom, slug, place_type] : un tableau par lieu, pour garder l'index léger. */
export type PlaceIndexRow = [name: string, slug: string, type: string];

export const normalizeSearch = (s: string): string =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

// Graphies latines concurrentes d'un même nom grec, repliées des deux côtés :
// « pachia ammos » trouve « Pahia Ammos », « kalives » trouve « Kalyves ».
const fold = (s: string): string =>
  s.replace(/[ck]h/g, "h").replace(/ph/g, "f").replace(/y/g, "i").replace(/ou/g, "u");

// Mots qui ne distinguent aucun lieu : « balos beach » doit trouver « Balos lagoon ».
const NOISE = new Set(["beach", "beaches", "plage", "plages", "strand", "paralia", "the"]);

// Un terme touche un mot du nom s'il en est le début, ou si le mot est le début d'un
// terme assez long : « rethymno » et « rethymnos » trouvent « Rethymnon ».
const termHits = (term: string, words: string[]): boolean =>
  words.some((w) => w.startsWith(term) || (term.length >= 5 && w.length >= 4 && term.startsWith(w)));

export function searchPlaces(index: PlaceIndexRow[], query: string, limit = 12): PlaceIndexRow[] {
  const all = normalizeSearch(query).split(" ").filter(Boolean);
  const folded = (t: string[]) => t.map(fold);
  const kept = all.filter((t) => !NOISE.has(t));
  const terms = folded(kept.length ? kept : all);
  if (terms.join("").length < 2) return [];

  const hits: { row: PlaceIndexRow; key: [number, number, number] }[] = [];
  for (const row of index) {
    const words = folded(normalizeSearch(row[0]).split(" "));
    if (!terms.every((t) => termHits(t, words))) continue;
    // Le nom qui commence par la requête d'abord, puis les plages (ce qu'on cherche le
    // plus), puis le nom le plus court, qui est le plus souvent le lieu lui-même.
    hits.push({ row, key: [words[0].startsWith(terms[0]) ? 0 : 1, row[2] === "beach" ? 0 : 1, row[0].length] });
  }
  hits.sort((a, b) => a.key[0] - b.key[0] || a.key[1] - b.key[1] || a.key[2] - b.key[2]);
  return hits.slice(0, limit).map((h) => h.row);
}
