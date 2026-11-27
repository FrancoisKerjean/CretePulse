// Flotte réelle des loueurs : quels modèles montrer pour une catégorie du
// catalogue, et quelle photo poser sur une offre. Pur, zéro I/O : lit la
// projection versionnée src/data/car-fleet.json (npm run gen:car-fleet).
// SHORTCUT: flotte statique versionnée, au-delà de 15 loueurs ou dès qu'un loueur veut modifier sa flotte lui-même, passer à une table car_partner_models éditée depuis le portail
import fleetData from "@/data/car-fleet.json";
import type { CarCategory } from "./car-catalogue";
import { modelKey, type CarFleet, type FleetModel } from "./car-fleet-build";

const FLEET = fleetData as unknown as CarFleet;

export interface ShowcasePhoto { model: string; partnerId: number; src640: string; src1280: string }
export interface CategoryShowcase { models: string[]; photo: ShowcasePhoto | null }
/** `exact` : la photo est celle du modèle de l'offre ; sinon une voiture du loueur dans la catégorie. */
export interface FleetPhoto { model: string; src640: string; src1280: string; exact: boolean }

// La version 1280 n'existe que pour les sources d'au moins 1 100 px
// (data/car-fleet/fleet-photos-report.md) : la 640 suffit, la 1280 retombe sur elle.
const hasPhoto = (m: FleetModel) => !!m.photo640;
const large = (m: FleetModel) => m.photo1280 ?? m.photo640!;

function inCategory(m: FleetModel, category: CarCategory): boolean {
  return category === "automatic" ? m.gearbox === "automatic" || m.gearbox === "both" : m.body === category;
}

/** Modèles du loueur dans une catégorie : confirmés, puis avec photo, puis les plus cités en devis 2026. */
export function fleetModelsFor(partnerId: number, category: CarCategory, fleet: CarFleet = FLEET): FleetModel[] {
  const models = fleet[String(partnerId)]?.models ?? [];
  return models
    .filter((m) => inCategory(m, category))
    .map((m, i) => ({ m, i }))
    .sort((a, b) =>
      Number(b.m.confirmed) - Number(a.m.confirmed)
      || Number(hasPhoto(b.m)) - Number(hasPhoto(a.m))
      || b.m.quotes2026 - a.m.quotes2026
      || a.i - b.i)
    .map(({ m }) => m);
}

/**
 * Vitrine d'une catégorie chez ces loueurs : les 3 modèles proposés par le plus
 * de loueurs (« Fiat Panda, Kia Picanto, Hyundai i10 ou similaire ») et la
 * meilleure photo (qualité « good », fond uni, puis celle d'un modèle cité).
 */
export function categoryShowcase(category: CarCategory, partnerIds: number[], fleet: CarFleet = FLEET): CategoryShowcase {
  const groups = new Map<string, { name: string; partners: Set<number>; quotes: number }>();
  const photos: Array<{ m: FleetModel; partnerId: number; key: string; order: number }> = [];
  for (const id of new Set(partnerIds)) {
    for (const m of fleet[String(id)]?.models ?? []) {
      if (!inCategory(m, category)) continue;
      const key = modelKey(m.model);
      const g = groups.get(key) ?? { name: m.model, partners: new Set<number>(), quotes: 0 };
      g.partners.add(id);
      g.quotes += m.quotes2026;
      groups.set(key, g);
      if (hasPhoto(m)) photos.push({ m, partnerId: id, key, order: photos.length });
    }
  }
  const ranked = [...groups.entries()]
    .sort(([ka, a], [kb, b]) => b.partners.size - a.partners.size || b.quotes - a.quotes || (ka < kb ? -1 : ka > kb ? 1 : 0))
    .map(([k]) => k);
  const rank = (key: string) => ranked.indexOf(key);
  const top = (key: string) => Math.min(rank(key), 3);
  photos.sort((a, b) =>
    Number(b.m.photoQuality === "good") - Number(a.m.photoQuality === "good")
    || Number(!!b.m.photoUniform) - Number(!!a.m.photoUniform)
    || top(a.key) - top(b.key)
    || rank(a.key) - rank(b.key)
    || a.order - b.order);
  const best = photos[0];
  return {
    models: ranked.slice(0, 3).map((k) => groups.get(k)!.name),
    photo: best ? { model: best.m.model, partnerId: best.partnerId, src640: best.m.photo640!, src1280: large(best.m) } : null,
  };
}

export type ZoneShowcases = Record<string, Partial<Record<CarCategory, CategoryShowcase>>>;

/**
 * Vitrines de l'étape « Quelle voiture ? », calculées côté serveur (le JSON de
 * flotte ne part jamais dans le bundle client) : une entrée par zone servie,
 * avec ses seuls loueurs, plus « all » pour tous les loueurs actifs. Une
 * catégorie sans aucun modèle chez ces loueurs est absente.
 */
export function showcasesByZone(
  partners: Array<{ id: number; zone_ids: string[] | null }>,
  zoneIds: string[],
  categories: readonly CarCategory[],
  fleet: CarFleet = FLEET,
): ZoneShowcases {
  const build = (ids: number[]) => {
    const out: Partial<Record<CarCategory, CategoryShowcase>> = {};
    for (const c of categories) {
      const sc = categoryShowcase(c, ids, fleet);
      if (sc.models.length > 0 || sc.photo) out[c] = sc;
    }
    return out;
  };
  const result: ZoneShowcases = { all: build(partners.map((p) => p.id)) };
  for (const z of zoneIds) {
    const ids = partners.filter((p) => p.zone_ids?.includes(z)).map((p) => p.id);
    if (ids.length > 0) result[z] = build(ids);
  }
  return result;
}

// « VW Polo or similar », « I10, Panda », « VW Polo auto · Automatic » : on retire
// la mention « ou similaire » (4 langues), puis on coupe sur les séparateurs.
const SIMILAR = /\b(?:or|ou|oder|o)\s+(?:similar|similaire|ahnlich|equivalent)\b|η παρομοιο|\bsimilar\b/g;
const SEPARATORS = /[,;/|·•+&()]|\s+(?:or|ou|oder|and|et|und|η)\s+|\s-\s/;

function fragments(text: string): string[][] {
  const plain = text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(SIMILAR, " ");
  return plain.split(SEPARATORS).map((f) => modelKey(f).split(" ").filter(Boolean)).filter((t) => t.length > 0);
}

const containsRun = (hay: string[], needle: string[]) =>
  needle.length > 0 && hay.some((_, i) => needle.every((t, j) => hay[i + j] === t));

// Mots qui suivent un modèle sans en changer : boîte, motorisation (« VW Polo auto », « Yaris Hybrid »).
const NOISE = new Set(["auto", "automatic", "automatique", "automatik", "manual", "manuel", "manuelle", "hybrid", "hybride", "diesel", "petrol", "essence", "benzin", "new"]);

/**
 * Le modèle trouvé couvre-t-il tout le fragment, à un mot de boîte ou une année près ?
 * « Citroën C3 Aircross » contre une flotte qui n'a que la C3 : non, la photo n'est pas exacte.
 */
function coversFragment(fragment: string[], model: string): boolean {
  const tokens = modelKey(model).split(" ");
  for (const run of [tokens, tokens.slice(1)]) {
    if (run.length === 0) continue;
    const i = fragment.findIndex((_, k) => run.every((t, j) => fragment[k + j] === t));
    if (i >= 0) return fragment.slice(i + run.length).every((t) => NOISE.has(t) || /^\d{4}$/.test(t));
  }
  return false;
}

/** Nombre de mots du modèle retrouvés dans le fragment (nom complet, ou sans la marque), 0 sinon. */
function matchScore(fragment: string[], model: string): number {
  const tokens = modelKey(model).split(" ");
  if (containsRun(fragment, tokens)) return tokens.length;
  const noBrand = tokens.slice(1);
  return containsRun(fragment, noBrand) ? noBrand.length : 0;
}

/**
 * Photo d'une offre : celle du modèle saisi par le loueur s'il est reconnu dans
 * sa flotte, sinon sa vitrine dans la catégorie, sinon null (jamais la voiture
 * d'un autre loueur).
 */
export function offerCarPhoto(
  partnerId: number,
  category: CarCategory,
  modelText: string | null | undefined,
  fleet: CarFleet = FLEET,
): FleetPhoto | null {
  const withPhoto = (fleet[String(partnerId)]?.models ?? []).filter(hasPhoto);
  if (withPhoto.length === 0) return null;
  for (const frag of modelText ? fragments(modelText) : []) {
    let best: FleetModel | null = null;
    let bestScore = 0;
    for (const m of withPhoto) {
      const s = matchScore(frag, m.model);
      if (s > bestScore) { best = m; bestScore = s; }
    }
    if (best) return { model: best.model, src640: best.photo640!, src1280: large(best), exact: coversFragment(frag, best.model) };
  }
  const p = categoryShowcase(category, [partnerId], fleet).photo;
  return p ? { model: p.model, src640: p.src640, src1280: p.src1280, exact: false } : null;
}
