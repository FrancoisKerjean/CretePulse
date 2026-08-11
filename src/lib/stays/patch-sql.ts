// Construction du SQL d ecriture des faits captures, pour l adaptateur psql du
// worker `scripts/capture-airbnb-facts.mjs`.
//
// Pourquoi ce module existe : sur le VPS, le worker n a pas de cle PostgREST et
// n en a pas besoin, Postgres est en local. Il ecrit donc par psql. Or les
// valeurs viennent d un scrape Airbnb, c est-a-dire d une source hostile par
// definition : la construction du SQL est le seul endroit ou une valeur non
// prevue pourrait devenir du code. Elle vit donc ici, pure et testee, plutot
// qu en concatenation au fil du script.
//
// Regle : liste FERMEE de colonnes, type impose par colonne, et toute valeur non
// reconnue LEVE au lieu d etre echappee au mieux. Un patch douteux ne s ecrit pas.

/** Les seules colonnes que le worker a le droit d ecrire. */
export const PATCH_COLUMNS = [
  "rating_avg",
  "reviews_count",
  "reviews_captured_at",
  "max_guests",
  "lat",
  "lng",
  "description_locale",
] as const;

export type PatchColumn = (typeof PATCH_COLUMNS)[number];
export type Patch = Partial<Record<PatchColumn, number | string>>;

const NUMERIC: ReadonlySet<string> = new Set([
  "rating_avg", "reviews_count", "max_guests", "lat", "lng",
]);

/** Code langue ISO 639-1, deux lettres minuscules. Rien d autre. */
const LOCALE_RE = /^[a-z]{2}$/;
/** Horodatage ISO 8601 UTC, tel que `new Date().toISOString()` le produit. */
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/;

function literal(column: string, value: unknown): string {
  if (NUMERIC.has(column)) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`${column} : nombre fini attendu, recu ${JSON.stringify(value)}`);
    }
    return String(value);
  }
  if (column === "description_locale") {
    if (typeof value !== "string" || !LOCALE_RE.test(value)) {
      throw new Error(`description_locale : code langue a deux lettres attendu, recu ${JSON.stringify(value)}`);
    }
    return `'${value}'`;
  }
  if (column === "reviews_captured_at") {
    if (typeof value !== "string" || !ISO_RE.test(value)) {
      throw new Error(`reviews_captured_at : horodatage ISO attendu, recu ${JSON.stringify(value)}`);
    }
    return `'${value}'`;
  }
  // Inatteignable tant que PATCH_COLUMNS et les branches ci-dessus restent en phase.
  throw new Error(`colonne sans type declare : ${column}`);
}

/**
 * Rend l UPDATE a passer a psql. Leve sur toute anomalie : identifiant non
 * entier, colonne inconnue, valeur du mauvais type, patch vide.
 */
export function buildUpdateSql(id: number, patch: Patch): string {
  if (!Number.isInteger(id)) {
    throw new Error(`id : entier attendu, recu ${JSON.stringify(id)}`);
  }
  const entries = Object.entries(patch);
  if (entries.length === 0) {
    throw new Error("patch vide : rien a ecrire, l appelant ne doit pas construire de SQL");
  }
  const sets = entries.map(([column, value]) => {
    if (!(PATCH_COLUMNS as readonly string[]).includes(column)) {
      throw new Error(`colonne interdite : ${column}`);
    }
    return `${column} = ${literal(column, value)}`;
  });
  return `update stay_listings set ${sets.join(", ")} where id = ${id};`;
}
