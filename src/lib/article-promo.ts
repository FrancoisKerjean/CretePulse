// Routage article vers service (voiture, van partagé, bus) et découpe du HTML d'un guide.
// Module PUR : aucun JSX, aucun accès réseau. Testé par scripts/check-article-promo.mjs.
// Spec : docs/superpowers/specs/2026-09-07-article-service-promos-design.md
//
// Imports relatifs avec extension .ts : le type-stripping de node (scripts check:*)
// ne résout pas l'alias @/ (même raison que car-partners.ts, activity-lead.ts).
import { VAN_CORRIDORS, normalizeBusSlug, type VanCorridor } from "./van-corridors.ts";
import { CAR_ZONES } from "./car-partners.ts";
import { CAR_LANDINGS } from "./car-landings.ts";
import { BUS_PLACE_SLUGS } from "./bus-pairs.ts";

export type ArticlePromoKind = "car" | "van" | "bus" | "none";

export interface ArticlePromo {
  kind: ArticlePromoKind;
  /** Stable par slug (hash FNV-1a), jamais aléatoire. Toujours 1 pour kind none. */
  variant: 1 | 2 | 3;
  /** Slug CAR_ZONES (car). Indéfini hors zone : le wizard ouvre à l'étape 1. */
  pickup?: string;
  /** Slug CAR_LANDINGS explicite (car, aéroport). */
  landing?: string;
  /** Corridor VAN_CORRIDORS nommé (van). Absent = van générique. */
  corridor?: VanCorridor;
  /** Noms de lieux DB (clés de BUS_PLACE_SLUGS), tels que BusesClient les lit dans ?from=&to=. */
  busFrom?: string;
  busTo?: string;
}

export interface ArticlePromoPlan {
  /** Avant le 3e H2. */
  mid: ArticlePromo;
  /** Après la FAQ, à l'ancienne place du bloc de fin. */
  end: ArticlePromo;
}

/**
 * Le type Guide déclare format "long" | "mid" | "daily" mais la base contient aussi
 * "news" et "short" : on lit format comme une chaîne pour ne pas les perdre en silence.
 */
export interface ArticlePromoInput {
  slug: string;
  format: string;
  category: string;
  keywords: string[] | null;
  titles: Record<string, string> | null;
  contents: Record<string, string> | null;
}

export interface DetectedPlaces {
  corridor: VanCorridor | null;
  pickup: string | null;
  airportLanding: string | null;
  /** Noms DB, dans l'ordre de première apparition dans le texte. */
  busPlaces: string[];
  /** Le texte parle d'arrivée : airport, transfer, arrival, getting to. */
  arrival: boolean;
}

/** Caractères du contenu EN lus pour la détection : chapô et premiers H2, jamais l'article entier. */
export const DETECT_WINDOW = 1500;
/** Sous ce nombre de H2, aucun encart mid : il couperait la lecture au lieu de l'accompagner. */
export const MIN_H2_FOR_MID = 3;

const CAR_VARIANTS = 3;
const VAN_VARIANTS = 2;
const BUS_PAIR_VARIANTS = 2;

const NONE: ArticlePromo = { kind: "none", variant: 1 };

// ── Dictionnaire de lieux, construit une fois au chargement, à partir des listes du dépôt ──

type EntryKind = "corridor" | "pickup" | "airport" | "bus";
interface Entry { name: string; re: RegExp; kind: EntryKind; value: string }

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function wordsOf(slug: string): string {
  return slug.replace(/-/g, " ");
}
/** Mot entier, insensible à la casse : même mécanique que autolinkHtml (src/lib/autolink.ts). */
function wholeWord(name: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(name)}(?![\\p{L}\\p{N}])`, "iu");
}

/** Corridor retenu par ville : le sens aéroport vers ville, premier de la table pour cette ville. */
const CORRIDOR_BY_CITY_SLUG = new Map<string, VanCorridor>();
/** Même sens, indexé `${aéroport}|${ville}` : Rethymno se dessert depuis les deux aéroports. */
const CORRIDOR_BY_AIRPORT_CITY = new Map<string, VanCorridor>();
for (const c of VAN_CORRIDORS) {
  const [from, to] = c.slug.split("--");
  if (from.endsWith("-airport") && !to.endsWith("-airport")) {
    if (!CORRIDOR_BY_CITY_SLUG.has(to)) CORRIDOR_BY_CITY_SLUG.set(to, c);
    CORRIDOR_BY_AIRPORT_CITY.set(`${from}|${to}`, c);
  }
}

function buildEntries(): Entry[] {
  const out: Entry[] = [];
  const add = (name: string, kind: EntryKind, value: string) => {
    const key = name.toLowerCase();
    if (!key || out.some((e) => e.kind === kind && e.name.toLowerCase() === key)) return;
    out.push({ name, re: wholeWord(name), kind, value });
  };
  for (const [citySlug, c] of CORRIDOR_BY_CITY_SLUG) {
    add(c.toName, "corridor", citySlug);
    add(wordsOf(citySlug), "corridor", citySlug);
  }
  for (const [busName, busSlug] of Object.entries(BUS_PLACE_SLUGS)) {
    add(busName, "bus", busName);
    add(wordsOf(busSlug), "bus", busName);
    // Alias bus vers corridor (Siteia, Makry Gyalos) via la même map que van-crete-direct.
    const corr = normalizeBusSlug(busSlug);
    if (CORRIDOR_BY_CITY_SLUG.has(corr)) {
      add(busName, "corridor", corr);
      add(wordsOf(busSlug), "corridor", corr);
    }
  }
  for (const z of CAR_ZONES) for (const p of z.pickups) add(wordsOf(p), "pickup", p);
  for (const l of CAR_LANDINGS) {
    if (l.kind === "airport") {
      add(wordsOf(l.slug), "airport", l.slug);
      add(wordsOf(l.slug), "pickup", l.pickup);
    }
  }
  // Plus long nom d'abord : « Chania Airport » est essayé avant « Chania ».
  return out.sort((a, b) => b.name.length - a.name.length);
}
const ENTRIES = buildEntries();

const ARRIVAL_RE = /(?<![\p{L}])(airport|transfers?|arrivals?|getting to)(?![\p{L}])/iu;

/**
 * Lit un texte anglais et en sort le corridor van, le pickup voiture, la landing
 * aéroport et les lieux bus cités. Pour chaque famille, la première occurrence
 * dans le texte gagne ; à position égale, le nom le plus long (ordre des entrées).
 */
export function detectPlaces(text: string): DetectedPlaces {
  const first: Partial<Record<EntryKind, { idx: number; value: string }>> = {};
  const bus: { idx: number; end: number; value: string }[] = [];
  for (const e of ENTRIES) {
    const m = e.re.exec(text);
    if (!m) continue;
    if (e.kind === "bus") {
      const end = m.index + m[0].length;
      // Un nom contenu dans un nom plus long déjà retenu (« Chania » dans « Chania Airport ») ne compte pas.
      if (!bus.some((b) => m.index >= b.idx && end <= b.end)) bus.push({ idx: m.index, end, value: e.value });
      continue;
    }
    const cur = first[e.kind];
    if (!cur || m.index < cur.idx) first[e.kind] = { idx: m.index, value: e.value };
  }
  // Dédoublonné par slug, pas par nom : Elafonisi et Elafonissi (ou Kissamos et Kasteli)
  // sont un seul lieu, jamais une paire. La première orthographe rencontrée reste.
  const busPlaces: string[] = [];
  const busSlugs = new Set<string>();
  for (const b of bus.sort((a, c) => a.idx - c.idx)) {
    const slug = BUS_PLACE_SLUGS[b.value];
    if (busSlugs.has(slug)) continue;
    busSlugs.add(slug);
    busPlaces.push(b.value);
  }
  const airportLanding = first.airport?.value ?? null;
  // Le corridor suit l'aéroport cité quand la table le sert ; sinon le premier de la table.
  const corridor = first.corridor
    ? (airportLanding ? CORRIDOR_BY_AIRPORT_CITY.get(`${airportLanding}|${first.corridor.value}`) : undefined)
      ?? CORRIDOR_BY_CITY_SLUG.get(first.corridor.value) ?? null
    : null;
  return {
    corridor,
    pickup: first.pickup?.value ?? null,
    airportLanding,
    busPlaces,
    arrival: ARRIVAL_RE.test(text),
  };
}

/** Sans diacritiques (Sitía, Réthymno), &nbsp; et retours à la ligne ramenés à un espace. */
function normalizeText(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/&nbsp;|\u00a0/g, " ").replace(/\s+/g, " ");
}

/**
 * Titre EN, mots-clés, slug : la tête de l'article, seule lue pour décider d'une
 * arrivée. « 30 minutes from Heraklion airport » dans le corps d'un guide plage
 * ne fait pas de l'article un guide de transfert.
 */
export function headText(input: ArticlePromoInput): string {
  return normalizeText([input.titles?.en ?? "", (input.keywords ?? []).join(" "), wordsOf(input.slug)].join("\n"));
}

/** Tête, puis les DETECT_WINDOW premiers caractères du contenu EN, balises retirées : pour les lieux. */
export function detectionText(input: ArticlePromoInput): string {
  const html = input.contents?.en ?? "";
  return headText(input) + " " + normalizeText(html.slice(0, DETECT_WINDOW).replace(/<[^>]*>/g, " "));
}

/** FNV-1a 32 bits du slug, réduit à 1..n. Stable d'un rendu à l'autre, réparti à peu près également. */
export function variantFor(slug: string, n: number): 1 | 2 | 3 {
  let h = 0x811c9dc5;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return ((h % n) + 1) as 1 | 2 | 3;
}

function car(slug: string, extra: { pickup?: string | null; landing?: string | null } = {}): ArticlePromo {
  const p: ArticlePromo = { kind: "car", variant: variantFor(slug, CAR_VARIANTS) };
  if (extra.pickup) p.pickup = extra.pickup;
  if (extra.landing) p.landing = extra.landing;
  return p;
}
function van(slug: string, corridor: VanCorridor | null): ArticlePromo {
  const p: ArticlePromo = { kind: "van", variant: variantFor(slug, VAN_VARIANTS) };
  if (corridor) p.corridor = corridor;
  return p;
}
function bus(slug: string, places: string[]): ArticlePromo {
  const [from, to] = places;
  if (!from) return { kind: "bus", variant: 1 };
  // La copie bus.pair.v2 nomme {to} : sans destination, seule la v1 est lisible.
  const p: ArticlePromo = { kind: "bus", variant: to ? variantFor(slug, BUS_PAIR_VARIANTS) : 1, busFrom: from };
  if (to) p.busTo = to;
  return p;
}

const CITY_CATEGORIES = new Set(["food", "culture", "history", "nightlife"]);
const TRAVEL_CATEGORIES = new Set(["travel", "tourism", "practical", "data"]);

/** Table de routage de la spec §2.4, première ligne qui matche. */
function route(input: ArticlePromoInput, d: DetectedPlaces): ArticlePromoPlan {
  const slug = input.slug;
  const fmt = (input.format ?? "").toLowerCase();
  const cat = (input.category ?? "").toLowerCase();

  // 1. Bulletin météo : lu sur place, en anglais seul, déjà une vidéo verticale.
  if (fmt === "daily" && cat === "daily-weather") return { mid: NONE, end: NONE };
  // 2. Actu du jour : un seul encart bus, en fin d'article.
  if (fmt === "daily" && cat === "daily-news") return { mid: NONE, end: bus(slug, []) };
  // 3. Article d'aéroport : même choix que la page /airport/[slug].
  if (fmt === "news" && cat === "airport") return { mid: car(slug, { landing: "heraklion-airport" }), end: van(slug, null) };
  // 4. Autres news : lectorat informé, le bus n'engage à rien. Format court : en fin, sinon la découpe avant le 3e H2 ne le montrerait jamais.
  if (fmt === "news") return { mid: NONE, end: bus(slug, []) };
  // 5. Le texte parle d'arrivée : le van passe devant.
  if (d.arrival) return { mid: van(slug, d.corridor), end: car(slug, { landing: d.airportLanding ?? "heraklion-airport" }) };
  // 6. Plages : la voiture reste l'offre principale.
  if (cat === "beaches") {
    return { mid: car(slug, { pickup: d.pickup }), end: d.corridor ? van(slug, d.corridor) : d.busPlaces.length ? bus(slug, d.busPlaces) : NONE };
  }
  // 7. Randonnée et nature.
  if (cat === "hikes" || cat === "nature") return { mid: car(slug, { pickup: d.pickup }), end: d.busPlaces.length ? bus(slug, d.busPlaces) : NONE };
  // 8. Excursions.
  if (cat === "day-trips") return { mid: car(slug, { pickup: d.pickup }), end: d.corridor ? van(slug, d.corridor) : NONE };
  // 9. Article de ville : le bus pour rayonner (générique si aucune ville n'est nommée), la voiture pour sortir.
  if (CITY_CATEGORIES.has(cat)) return { mid: car(slug, { pickup: d.pickup }), end: bus(slug, d.busPlaces) };
  // 10. Voyage, pratique, format court : choisir sa base, puis comment en sortir. Jamais /stays.
  if (TRAVEL_CATEGORIES.has(cat) || fmt === "short") return { mid: car(slug, { pickup: d.pickup }), end: van(slug, null) };
  // 11. Famille, bien-être.
  if (cat === "family" || cat === "wellness") return { mid: car(slug, { pickup: d.pickup }), end: NONE };
  // 12. Expat, immobilier : une voiture, sans plus.
  if (cat === "expat" || cat === "real-estate" || cat === "property") return { mid: car(slug), end: NONE };
  // 13. Défaut.
  return { mid: car(slug), end: NONE };
}

function countH2(html: string): number {
  return (html.match(/<h2\b/gi) ?? []).length;
}

/**
 * Plan complet pour un article, sans la garde pilote. `opts.html` est le HTML
 * réellement rendu (après autolink et dans la locale servie) ; à défaut on compte
 * les H2 de contents.en.
 */
export function planArticlePromo(input: ArticlePromoInput, opts: { html?: string } = {}): ArticlePromoPlan {
  const places = detectPlaces(detectionText(input));
  let { mid, end } = route(input, { ...places, arrival: ARRIVAL_RE.test(headText(input)) });
  if (mid.kind !== "none" && mid.kind === end.kind) end = NONE;
  if (countH2(opts.html ?? input.contents?.en ?? "") < MIN_H2_FOR_MID) {
    // Traduction courte : l'encart de fin ne coupe pas la lecture, le mid y glisse plutôt que de disparaître.
    if (end.kind === "none") end = mid;
    mid = NONE;
  }
  return { mid, end };
}

/**
 * Phase 1 (spec §5) : les 23 articles à 50 visiteurs ou plus sur 30 jours au
 * 07/09/2026, export Plausible ClickHouse (25 slugs au seuil, les 23 premiers
 * retenus, tous vérifiés publiés en base). Constante et non variable
 * d'environnement : une env var est figée à l'image de déploiement (piège
 * documenté par la spec du rail).
 * Phase 2 = commit qui supprime cette liste et la garde de resolveArticlePromo.
 */
export const PILOT_SLUGS: readonly string[] = [
  "best-beaches-crete",
  "balos-lagoon-guide",
  "best-areas-to-stay-crete",
  "long-term-rentals-crete",
  "e4-trail-crete",
  "knossos-palace-complete-guide",
  "day-trips-from-heraklion",
  "best-tavernas-chania",
  "elafonisi-vs-balos-which-beach",
  "snorkeling-spots-crete-guide",
  "crete-news-recap-2026-08-02",
  "cretan-festivals-panigiri-guide",
  "samaria-gorge-complete-guide",
  "crete-in-august",
  "heraklion-nightlife-guide",
  "crete-with-kids-family-guide",
  "kastelli-airport-2028-crete-tourism",
  "august-festivals-events-crete",
  "crete-sea-turtles-watching",
  "traditional-cretan-food-guide",
  "living-in-crete-expat-pros-cons",
  "preveli-beach-guide",
  "spinalonga-island-guide",
];

/** Ce que la page appelle : none/none hors pilote tant que PILOT_SLUGS existe. */
export function resolveArticlePromo(input: ArticlePromoInput, opts: { html?: string } = {}): ArticlePromoPlan {
  if (!PILOT_SLUGS.includes(input.slug)) return { mid: NONE, end: NONE };
  return planArticlePromo(input, opts);
}

/** Prix plancher et nombre de paires, lus dans VAN_CORRIDORS pour ne jamais figer un chiffre dans 22 fichiers. */
export function vanGenericFacts(): { price: number; count: number } {
  const pairs = new Set(VAN_CORRIDORS.map((c) => c.slug.split("--").sort().join("|")));
  return { price: Math.min(...VAN_CORRIDORS.map((c) => c.priceEur)), count: pairs.size };
}

/** Balises dont la partie 1 doit être équilibrée : un H2 imbriqué produirait un DOM invalide, donc un vrai CLS. */
const BALANCED_TAGS = ["div", "section", "ul", "ol", "blockquote", "table", "figure", "a", "pre"];

/**
 * Découpe le HTML au début de la 3e occurrence de `<h2` (après la section ouverte par
 * le 2e H2). Retourne null au moindre doute : l'article s'affiche alors entier.
 */
export function splitAfterSecondH2(html: string): [string, string] | null {
  const re = /<h2\b/gi;
  let m: RegExpExecArray | null;
  let seen = 0;
  let cut = -1;
  while ((m = re.exec(html))) {
    seen++;
    if (seen === MIN_H2_FOR_MID) { cut = m.index; break; }
  }
  if (cut < 0) return null;
  const head = html.slice(0, cut);
  for (const tag of BALANCED_TAGS) {
    const opens = (head.match(new RegExp(`<${tag}\\b(?![^>]*/>)`, "gi")) ?? []).length;
    const closes = (head.match(new RegExp(`</${tag}\\s*>`, "gi")) ?? []).length;
    if (opens !== closes) return null;
  }
  return [head, html.slice(cut)];
}
