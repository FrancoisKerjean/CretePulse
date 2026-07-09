// Logique pure du catalogue d'exemples d'activités (spec 2026-07-09).
// Node-safe (importable par check-activity-catalog.mjs), zéro I/O.
// La lecture Supabase vit dans activity-catalog-db.ts ; ici : localisation
// (fallback en), tri et sélections pour les 3 niveaux de pages.

/** Item localisé, prêt à afficher. Jamais de source_url/source_name ici. */
export interface CatalogItem {
  id: number;
  category: string;
  city: string;
  title: string;
  summary: string;
  duration_label: string | null;
  price_from_eur: number | null;
}

/** Row brute renvoyée par la db (title/summary = EN source). */
export interface CatalogRow extends CatalogItem {
  translations: Record<string, { title?: string; summary?: string }>;
  display_order: number;
}

/** Applique la traduction de la locale (champ par champ, fallback EN). */
export function localizeItem(row: CatalogRow, locale: string): CatalogItem {
  const tr = row.translations?.[locale];
  // || délibéré (pas ??) : une traduction vide "" doit retomber sur l'anglais.
  return {
    id: row.id,
    category: row.category,
    city: row.city,
    title: tr?.title || row.title,
    summary: tr?.summary || row.summary,
    duration_label: row.duration_label,
    price_from_eur: row.price_from_eur,
  };
}

/** Tri stable : display_order asc puis id asc. */
export function sortCatalogRows(rows: CatalogRow[]): CatalogRow[] {
  return [...rows].sort((a, b) => a.display_order - b.display_order || a.id - b.id);
}

/** Vitrine page mère : round-robin sur les catégories pour représenter chacune. */
export function pickHighlights(rows: CatalogRow[], limit: number): CatalogRow[] {
  const sorted = sortCatalogRows(rows);
  const byCat = new Map<string, CatalogRow[]>();
  for (const r of sorted) {
    const list = byCat.get(r.category) ?? [];
    list.push(r);
    byCat.set(r.category, list);
  }
  const queues = [...byCat.values()];
  const out: CatalogRow[] = [];
  let idx = 0;
  while (out.length < limit && queues.some((q) => q.length)) {
    const q = queues[idx % queues.length];
    const item = q.shift();
    if (item) out.push(item);
    idx++;
  }
  return out;
}

/** Page catégorie : au plus `perCity` items par ville (ordre trié). */
export function mixByCity(rows: CatalogRow[], perCity: number): CatalogRow[] {
  const sorted = sortCatalogRows(rows);
  const count = new Map<string, number>();
  const out: CatalogRow[] = [];
  for (const r of sorted) {
    const n = count.get(r.city) ?? 0;
    if (n < perCity) { out.push(r); count.set(r.city, n + 1); }
  }
  return out;
}
