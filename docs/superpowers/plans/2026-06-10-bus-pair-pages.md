# Pages SEO par paire /buses/[pair] — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ~70-110 pages programmatiques `/buses/heraklion-to-ierapetra` (1 page bidirectionnelle par paire de lieux reconnus reliés en direct), alimentées par `bus_routes`, indexables, maillées depuis /buses.

**Architecture:** Module pur `src/lib/bus-pairs.ts` (éligibilité, slugs, lookup aller/retour) + route `src/app/[locale]/buses/[pair]/page.tsx` (server component, pattern airbnb : 4 locales prerendered, 18 ISR fallback EN, revalidate 86400) + maillage (RouteCard → page paire, sitemap weekly 0.7, IndexNow) + JourneyPlanner lit `?from=&to=`.

**Tech Stack:** Next.js App Router + TS + Tailwind (existant), node check scripts (pas de framework de test TS), IndexNow via `vps/indexnow.py` (`submit(urls)`).

**Spec:** `docs/superpowers/specs/2026-06-10-bus-pair-pages-design.md`

**Conventions:** commits `kerjeanfrancois29`, push master+main, stage sélectif (autre terminal actif dans le repo). Node 25 importe les `.ts` purs par type-stripping.

---

### Task 1 : Module `src/lib/bus-pairs.ts` (assertions d'abord)

**Files:**
- Create: `src/lib/bus-pairs.ts`
- Create: `scripts/check-bus-pairs.mjs`

**Contrainte :** `bus-pairs.ts` n'importe rien à l'exécution (`import type` uniquement) — exécutable par node et importable côté client (RouteCard) comme serveur (sitemap, page).

- [ ] **Step 1 : Écrire le script d'assertions (échec d'abord)**

```js
// scripts/check-bus-pairs.mjs
// Run: node scripts/check-bus-pairs.mjs
import assert from "node:assert/strict";
import {
  BUS_PLACE_SLUGS, slugifyPlace, pairSlug, eligiblePairs, pairRoutes, onwardPlaces,
} from "../src/lib/bus-pairs.ts";

const R = (id, from, to) => ({ id, from_place: from, to_place: to });

// --- slugs --------------------------------------------------------------
assert.equal(slugifyPlace("Heraklion"), "heraklion");
assert.equal(slugifyPlace("Makry Gyalos"), "makry-gyalos");
assert.equal(slugifyPlace("Plaka(Ag.Nikolaos)"), "plaka");
assert.equal(slugifyPlace("A1 Super Market"), null);          // pas digne -> null
// slug stable quel que soit le sens (ordre alphabetique des slugs)
assert.equal(pairSlug("Heraklion", "Ierapetra"), "heraklion-to-ierapetra");
assert.equal(pairSlug("Ierapetra", "Heraklion"), "heraklion-to-ierapetra");
assert.equal(pairSlug("Chania", "A1 Super Market"), null);    // un bout indigne -> null

// --- eligibilite ----------------------------------------------------------
const routes = [
  R(1, "Heraklion", "Ierapetra"),
  R(2, "Ierapetra", "Heraklion"),                 // retour -> meme page
  R(3, "Heraklion", "Stella Blue-(Analipsis Hotels)"), // hotel -> exclu
  R(4, "Chania", "Paleochora"),
  R(5, "Chania", "Chania"),                       // self-loop -> exclu
];
const pairs = eligiblePairs(routes);
const slugs = pairs.map((p) => p.slug).sort();
assert.deepEqual(slugs, ["chania-to-paleochora", "heraklion-to-ierapetra"]);
const hi = pairs.find((p) => p.slug === "heraklion-to-ierapetra");
assert.equal(hi.placeA, "Heraklion");             // ordre alphabetique des slugs
assert.equal(hi.placeB, "Ierapetra");

// --- lookup aller/retour ----------------------------------------------------
const pr = pairRoutes(routes, "heraklion-to-ierapetra");
assert.equal(pr.outbound.length, 1);              // Heraklion -> Ierapetra
assert.equal(pr.outbound[0].id, 1);
assert.equal(pr.inbound.length, 1);               // Ierapetra -> Heraklion
assert.equal(pr.inbound[0].id, 2);
assert.equal(pairRoutes(routes, "x-to-y"), null);

// --- onward ------------------------------------------------------------------
const onward = onwardPlaces(routes, "Heraklion", "Ierapetra");
assert.ok(!onward.includes("Ierapetra"));         // exclut l'autre bout de la paire
assert.ok(!onward.includes("Stella Blue-(Analipsis Hotels)")); // indigne exclu

console.log("OK check-bus-pairs:", pairs.length, "paires sur fixtures");
```

- [ ] **Step 2 : Vérifier l'échec**

Run: `node scripts/check-bus-pairs.mjs`
Expected: `Cannot find module '../src/lib/bus-pairs.ts'`

- [ ] **Step 3 : Implémenter `src/lib/bus-pairs.ts`**

```ts
// Paires de lieux "dignes" pour les pages SEO /buses/[pair].
// Pur, zero I/O (import type) : importable client (RouteCard), serveur
// (page, sitemap) et node (scripts/check-bus-pairs.mjs).
// Spec : docs/superpowers/specs/2026-06-10-bus-pair-pages-design.md
import type { BusRoute } from "./buses";

/** Route minimale acceptee par les helpers (sitemap ne select que from/to). */
export type PairRouteLike = Pick<BusRoute, "from_place" | "to_place">;

// Lieu DB (orthographe exacte bus_routes) -> slug URL. Un lieu absent de
// cette table n'a JAMAIS de page (arrets hotels, supermarches, bruit).
// Est = lieux PLACE_COORDS du scraper ; ouest = villes/villages reconnus
// des PDF e-ktel (orthographe DB constatee le 10/06/2026).
export const BUS_PLACE_SLUGS: Record<string, string> = {
  // Est (herlas)
  "Heraklion": "heraklion",
  "Agios Nikolaos": "agios-nikolaos",
  "Ierapetra": "ierapetra",
  "Siteia": "sitia",
  "Malia": "malia",
  "Hersonisos": "hersonissos",
  "Matala": "matala",
  "Moires": "moires",
  "Anogeia": "anogeia",
  "Ano Viannos": "ano-viannos",
  "Kokkini Hani": "kokkini-hani",
  "Eloynta": "elounda",
  "Kritsa": "kritsa",
  "Makry Gyalos": "makry-gyalos",
  "Myrtos": "myrtos",
  "Mochos": "mochos",
  "Stalida": "stalida",
  "Sisi": "sisi",
  "Gouves": "gouves",
  "Tympaki": "tympaki",
  "Agia Galini": "agia-galini",
  "Faistos": "phaistos",
  "Arkalochori": "arkalochori",
  "Kastelli Pediados": "kastelli-pediados",
  "Ano Archanes": "archanes",
  "Thrapsano": "thrapsano",
  "Myrtia": "myrtia",
  "Zakros": "zakros",
  "Palaiokastro Sitia": "palekastro",
  "Ziros": "ziros",
  "Mochlos": "mochlos",
  "Kalo Chorio Lasithioy": "kalo-chorio",
  "Ferma": "ferma",
  "Mesochorio": "mesochorio",
  "Demati": "demati",
  "Kroysonas": "krousonas",
  "Kamares": "kamares",
  "Cretaquarium": "cretaquarium",
  "Cretaquarium (Gournes)": "cretaquarium",
  "Plaka(Ag.Nikolaos)": "plaka",
  "Kroystas": "kroustas",
  "Aygeniki": "avgeniki",
  // Ouest (ektel)
  "Chania": "chania",
  "Rethymno": "rethymno",
  "Chania Airport": "chania-airport",
  "Kissamos": "kissamos",
  "Kasteli": "kissamos",
  "Elafonissi": "elafonissi",
  "Elafonisi": "elafonissi",
  "Paleochora": "paleochora",
  "Sougia": "sougia",
  "Chora Sfakion": "chora-sfakion",
  "Georgioupolis": "georgioupolis",
  "Kavros": "kavros",
  "Bali": "bali",
  "Plakias": "plakias",
  "Almirida": "almyrida",
  "Kalives": "kalyves",
  "Stavros": "stavros",
  "Panormo": "panormo",
  "Margarites": "margarites",
  "Theriso": "theriso",
  "Meskla": "meskla",
  "Vamos": "vamos",
  "Spili": "spili",
  "Perama": "perama",
  "Anogia": "anogeia-west",
  "Voukolies": "voukolies",
  "Sternes": "sternes",
  "Maleme": "maleme",
  "Arkadi": "arkadi",
  "Ano Meros": "ano-meros",
};

export interface BusPair {
  slug: string;
  placeA: string; // nom DB, slug alphabetiquement premier
  placeB: string;
}

export function slugifyPlace(place: string): string | null {
  return BUS_PLACE_SLUGS[place] ?? null;
}

/** Slug stable de la paire (ordre alphabetique des slugs), null si un bout est indigne. */
export function pairSlug(a: string, b: string): string | null {
  const sa = slugifyPlace(a);
  const sb = slugifyPlace(b);
  if (!sa || !sb || sa === sb) return null;
  return sa < sb ? `${sa}-to-${sb}` : `${sb}-to-${sa}`;
}

/** Paires bidirectionnelles eligibles (routes directes entre lieux dignes). */
export function eligiblePairs(routes: PairRouteLike[]): BusPair[] {
  const bySlug = new Map<string, BusPair>();
  for (const r of routes) {
    const slug = pairSlug(r.from_place, r.to_place);
    if (!slug || bySlug.has(slug)) continue;
    const sa = slugifyPlace(r.from_place)!;
    const sb = slugifyPlace(r.to_place)!;
    const [placeA, placeB] = sa < sb
      ? [r.from_place, r.to_place]
      : [r.to_place, r.from_place];
    bySlug.set(slug, { slug, placeA, placeB });
  }
  return [...bySlug.values()].sort((x, y) => x.slug.localeCompare(y.slug));
}

export interface PairRoutes<T extends PairRouteLike> {
  pair: BusPair;
  outbound: T[]; // placeA -> placeB (toutes orthographes mappant les memes slugs)
  inbound: T[];  // placeB -> placeA
}

export function pairRoutes<T extends PairRouteLike>(
  routes: T[],
  slug: string,
): PairRoutes<T> | null {
  const pair = eligiblePairs(routes).find((p) => p.slug === slug);
  if (!pair) return null;
  const sa = slugifyPlace(pair.placeA)!;
  const sb = slugifyPlace(pair.placeB)!;
  const outbound = routes.filter(
    (r) => slugifyPlace(r.from_place) === sa && slugifyPlace(r.to_place) === sb,
  );
  const inbound = routes.filter(
    (r) => slugifyPlace(r.from_place) === sb && slugifyPlace(r.to_place) === sa,
  );
  return { pair, outbound, inbound };
}

/** Destinations directes dignes depuis `place`, hors `exclude` (bloc "continuer vers"). */
export function onwardPlaces(
  routes: PairRouteLike[],
  place: string,
  exclude: string,
): string[] {
  const sx = slugifyPlace(exclude);
  const out = new Set<string>();
  for (const r of routes) {
    if (r.from_place !== place) continue;
    const s = slugifyPlace(r.to_place);
    if (s && s !== sx && s !== slugifyPlace(place)) out.add(r.to_place);
  }
  return [...out].sort((a, b) => a.localeCompare(b));
}
```

- [ ] **Step 4 : Vérifier**

Run: `node scripts/check-bus-pairs.mjs` → `OK check-bus-pairs: 2 paires sur fixtures`
Run: `npx tsc --noEmit` → 0 erreur.

- [ ] **Step 5 : Commit**

```bash
git add src/lib/bus-pairs.ts scripts/check-bus-pairs.mjs
git commit -m "feat(buses): module bus-pairs (eligibilite, slugs, lookup paires)"
```

---

### Task 2 : Comptage réel des paires (garde-fou avant la page)

**Files:** aucun

- [ ] **Step 1 : Compter les paires éligibles sur la DB réelle**

```bash
node -e "import('./src/lib/bus-pairs.ts').then(async ({eligiblePairs})=>{const fs=await import('fs');for(const l of fs.readFileSync('.env.local','utf8').split(/\r?\n/)){const m=l.match(/^([A-Z_0-9]+)=(.*)$/);if(m)process.env[m[1]]=m[2]}const{createClient}=await import('@supabase/supabase-js');const{data}=await createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).from('bus_routes').select('from_place,to_place');const pairs=eligiblePairs(data);console.log(pairs.length,'paires eligibles');console.log(pairs.map(p=>p.slug).join('\n'))})"
```

Expected: entre 50 et 120 paires, slugs propres (aucun slug contenant hotel/market/super). Si hors plage ou slugs sales : ajuster `BUS_PLACE_SLUGS` avant de continuer.

---

### Task 3 : JourneyPlanner lit `?from=&to=`

**Files:**
- Modify: `src/app/[locale]/buses/BusesClient.tsx` (init states depuis l'URL)

- [ ] **Step 1 : Init depuis l'URL au mount**

Dans `BusesClient`, après `const [toPlace, setToPlace] = useState("");`, ajouter (et ajouter `useEffect` à l'import react existant) :

```tsx
  // Permet aux pages paires (et au partage) de preremplir le planificateur :
  // /buses?from=Heraklion&to=Ierapetra. window.location plutot que
  // useSearchParams pour ne pas imposer de Suspense boundary au prerender.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const f = p.get("from");
    const t = p.get("to");
    if (f) setFromPlace(f);
    if (t) setToPlace(t);
  }, []);
```

- [ ] **Step 2 : Vérifier**

Run: `npx tsc --noEmit` → 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add "src/app/[locale]/buses/BusesClient.tsx"
git commit -m "feat(buses): le planificateur lit ?from=&to= (CTA pages paires)"
```

---

### Task 4 : Page `src/app/[locale]/buses/[pair]/page.tsx`

**Files:**
- Create: `src/app/[locale]/buses/[pair]/page.tsx`

- [ ] **Step 1 : Créer la page (server component complet)**

```tsx
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ArrowRight, Bus, Clock, Euro, Info, ChevronLeft } from "lucide-react";
import { buildAlternates } from "@/lib/seo";
import { getBusRoutes, getBusDestinations, latestScrapedAt } from "@/lib/buses";
import type { BusRoute } from "@/lib/buses";
import { eligiblePairs, pairRoutes, onwardPlaces, pairSlug, slugifyPlace } from "@/lib/bus-pairs";
import type { Locale } from "@/lib/types";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";
const SUPPORTED: Locale[] = ["en", "fr", "de", "el"];

function pickUiLoc(l: string): Locale {
  return (SUPPORTED as string[]).includes(l) ? (l as Locale) : "en";
}

const T = {
  title: {
    en: (a: string, b: string) => `Bus ${a} ↔ ${b}: Timetable & Prices`,
    fr: (a: string, b: string) => `Bus ${a} ↔ ${b} : horaires & prix`,
    de: (a: string, b: string) => `Bus ${a} ↔ ${b}: Fahrplan & Preise`,
    el: (a: string, b: string) => `Λεωφορείο ${a} ↔ ${b}: Δρομολόγια & Τιμές`,
  },
  metaDesc: {
    en: (a: string, b: string) => `KTEL bus between ${a} and ${b}: departure times by day, ticket prices and journey duration, updated from the operators.`,
    fr: (a: string, b: string) => `Bus KTEL entre ${a} et ${b} : horaires de départ par jour, prix du billet et durée du trajet, mis à jour depuis les opérateurs.`,
    de: (a: string, b: string) => `KTEL-Bus zwischen ${a} und ${b}: Abfahrtszeiten nach Tag, Ticketpreise und Fahrtdauer, aktualisiert von den Betreibern.`,
    el: (a: string, b: string) => `Λεωφορείο ΚΤΕΛ ${a} – ${b}: ώρες αναχώρησης ανά ημέρα, τιμές εισιτηρίων και διάρκεια, ενημερωμένα από τους φορείς.`,
  },
  updatedOn: { en: "Updated on", fr: "Mis à jour le", de: "Aktualisiert am", el: "Ενημερώθηκε στις" },
  outbound: { en: "Departures from", fr: "Départs de", de: "Abfahrten ab", el: "Αναχωρήσεις από" },
  price: { en: "Price", fr: "Prix", de: "Preis", el: "Τιμή" },
  duration: { en: "Duration", fr: "Durée", de: "Dauer", el: "Διάρκεια" },
  frequency: { en: "Frequency", fr: "Fréquence", de: "Häufigkeit", el: "Συχνότητα" },
  indicative: { en: "indicative", fr: "indicatif", de: "Richtwert", el: "ενδεικτική" },
  atTicketOffice: {
    en: "fare at the ticket office", fr: "tarif au guichet",
    de: "Fahrpreis am Schalter", el: "εισιτήριο στο εκδοτήριο",
  },
  planCta: {
    en: "Plan this journey with dates", fr: "Préparer ce trajet avec une date",
    de: "Diese Fahrt mit Datum planen", el: "Σχεδιάστε τη διαδρομή με ημερομηνία",
  },
  onward: {
    en: "Direct buses onward from", fr: "Bus directs depuis",
    de: "Direkte Busse weiter ab", el: "Απευθείας λεωφορεία από",
  },
  allBuses: { en: "All bus routes", fr: "Toutes les lignes de bus", de: "Alle Buslinien", el: "Όλες οι γραμμές" },
  compare: {
    en: "Compare bus, car & taxi", fr: "Comparer bus, voiture, taxi",
    de: "Bus, Auto & Taxi vergleichen", el: "Σύγκριση λεωφορείου, αυτοκινήτου, ταξί",
  },
  noTimetable: {
    en: "Departure times not published yet — check the operator site.",
    fr: "Horaires non encore publiés — voir le site de l'opérateur.",
    de: "Abfahrtszeiten noch nicht veröffentlicht — Betreiberseite prüfen.",
    el: "Δεν έχουν δημοσιευτεί ώρες — δείτε τον φορέα.",
  },
  officialSchedule: { en: "Official schedule", fr: "Horaires officiels", de: "Offizieller Fahrplan", el: "Επίσημο πρόγραμμα" },
  disclaimer: {
    en: "Times follow the operators' seasonal timetables and may change. Always confirm on the official KTEL sites before travelling. Prices marked “indicative” are estimated from distance.",
    fr: "Les horaires suivent les calendriers saisonniers des opérateurs et peuvent changer. Vérifiez toujours sur les sites officiels KTEL avant de partir. Les prix « indicatifs » sont estimés à partir de la distance.",
    de: "Die Zeiten folgen den saisonalen Fahrplänen der Betreiber und können sich ändern. Immer auf den offiziellen KTEL-Seiten bestätigen. Mit „Richtwert“ markierte Preise sind aus der Entfernung geschätzt.",
    el: "Οι ώρες ακολουθούν τα εποχικά δρομολόγια των φορέων και μπορεί να αλλάξουν. Επιβεβαιώνετε πάντα στις επίσημες σελίδες ΚΤΕΛ. Οι «ενδεικτικές» τιμές εκτιμώνται από την απόσταση.",
  },
  faqPrice: {
    en: (a: string, b: string, p: string) => [`How much is the bus from ${a} to ${b}?`, `A one-way KTEL ticket from ${a} to ${b} costs ${p}.`],
    fr: (a: string, b: string, p: string) => [`Combien coûte le bus de ${a} à ${b} ?`, `Un billet KTEL aller simple de ${a} à ${b} coûte ${p}.`],
    de: (a: string, b: string, p: string) => [`Was kostet der Bus von ${a} nach ${b}?`, `Ein einfaches KTEL-Ticket von ${a} nach ${b} kostet ${p}.`],
    el: (a: string, b: string, p: string) => [`Πόσο κοστίζει το λεωφορείο από ${a} προς ${b};`, `Το απλό εισιτήριο ΚΤΕΛ από ${a} προς ${b} κοστίζει ${p}.`],
  },
  faqDuration: {
    en: (a: string, b: string, d: string) => [`How long is the bus ride from ${a} to ${b}?`, `The KTEL bus from ${a} to ${b} takes about ${d}.`],
    fr: (a: string, b: string, d: string) => [`Combien de temps dure le trajet en bus de ${a} à ${b} ?`, `Le bus KTEL de ${a} à ${b} met environ ${d}.`],
    de: (a: string, b: string, d: string) => [`Wie lange dauert die Busfahrt von ${a} nach ${b}?`, `Der KTEL-Bus von ${a} nach ${b} braucht etwa ${d}.`],
    el: (a: string, b: string, d: string) => [`Πόση ώρα είναι η διαδρομή από ${a} προς ${b};`, `Το ΚΤΕΛ από ${a} προς ${b} κάνει περίπου ${d}.`],
  },
  faqFirstLast: {
    en: (a: string, b: string, f: string, l: string) => [`What time is the first and last bus from ${a} to ${b}?`, `The first bus leaves ${a} at ${f} and the last at ${l} (varies by day of week and season).`],
    fr: (a: string, b: string, f: string, l: string) => [`À quelle heure partent le premier et le dernier bus de ${a} à ${b} ?`, `Le premier bus part de ${a} à ${f} et le dernier à ${l} (selon le jour de la semaine et la saison).`],
    de: (a: string, b: string, f: string, l: string) => [`Wann fährt der erste und letzte Bus von ${a} nach ${b}?`, `Der erste Bus fährt um ${f} ab ${a}, der letzte um ${l} (je nach Wochentag und Saison).`],
    el: (a: string, b: string, f: string, l: string) => [`Τι ώρα είναι το πρώτο και το τελευταίο λεωφορείο από ${a} προς ${b};`, `Το πρώτο φεύγει στις ${f} και το τελευταίο στις ${l} (ανάλογα με την ημέρα και την εποχή).`],
  },
} as const;

interface Params { locale: string; pair: string }

export async function generateStaticParams(): Promise<Params[]> {
  // 4 locales completes x paires ; les 18 autres locales du site en ISR
  // on-demand (fallback EN), pattern airbnb/[neighbourhood].
  const routes = await getBusRoutes();
  const pairs = eligiblePairs(routes);
  const out: Params[] = [];
  for (const locale of SUPPORTED) for (const p of pairs) out.push({ locale, pair: p.slug });
  return out;
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { locale, pair } = await params;
  setRequestLocale(locale);
  const routes = await getBusRoutes();
  const pr = pairRoutes(routes, pair);
  if (!pr) return {};
  const ui = pickUiLoc(locale);
  const title = `${T.title[ui](pr.pair.placeA, pr.pair.placeB)} | Crete Direct`;
  const description = T.metaDesc[ui](pr.pair.placeA, pr.pair.placeB);
  const url = `${BASE_URL}/${locale}/buses/${pair}`;
  return {
    title, description,
    alternates: buildAlternates(locale, `/buses/${pair}`),
    openGraph: { title, description, url, type: "website" },
  };
}

// Comparatif getting-around quand il existe (slugs en dur, mirror de la page).
const GETTING_AROUND = new Set([
  "heraklion-to-chania", "heraklion-to-rethymno",
  "heraklion-to-agios-nikolaos", "heraklion-to-sitia",
]);

function fmtPrice(r: BusRoute, ui: Locale): string | null {
  if (r.price_eur == null) return null;
  return `${r.price_eur.toFixed(2)} €${r.price_estimated ? ` (${T.indicative[ui]})` : ""}`;
}

function DirectionSection({ from, to, routes, ui }: {
  from: string; to: string; routes: BusRoute[]; ui: Locale;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold text-text mb-3 flex items-center gap-2 flex-wrap">
        <Bus className="w-5 h-5 text-aegean" /> {from}
        <ArrowRight className="w-4 h-4 text-text-muted" /> {to}
      </h2>
      {routes.length === 0 ? (
        <p className="text-sm text-text-muted">{T.noTimetable[ui]}</p>
      ) : routes.map((r) => (
        <div key={r.id} className="rounded-xl border border-border bg-white p-4 mb-3">
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm mb-3">
            {fmtPrice(r, ui) && (
              <span className="inline-flex items-center gap-1 font-semibold text-text">
                <Euro className="w-4 h-4 text-aegean" /> {T.price[ui]} : {fmtPrice(r, ui)}
              </span>
            )}
            {r.price_eur == null && (
              <span className="inline-flex items-center gap-1 text-text-muted">
                <Euro className="w-4 h-4 text-aegean" /> {T.atTicketOffice[ui]}
              </span>
            )}
            {r.duration && (
              <span className="inline-flex items-center gap-1 text-text">
                <Clock className="w-4 h-4 text-aegean" /> {T.duration[ui]} : {r.duration}
              </span>
            )}
            {r.frequency && (
              <span className="text-text-muted">{T.frequency[ui]} : {r.frequency}</span>
            )}
          </div>
          {(r.departures_by_day && r.departures_by_day.length > 0
            ? r.departures_by_day
            : r.departures && r.departures.length > 0
              ? [{ days: "", times: r.departures }]
              : []
          ).map((g, gi) => (
            <div key={gi} className="mb-2">
              {g.days && (
                <p className="text-[11px] uppercase tracking-wide text-text-muted mb-1">{g.days}</p>
              )}
              <ul className="flex flex-wrap gap-1.5 list-none p-0 m-0">
                {g.times.map((time, i) => (
                  <li key={`${time}-${i}`} className="px-2 py-0.5 rounded bg-aegean/5 border border-aegean/15 text-xs font-mono text-text">
                    {time}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <a href={r.source_url} rel="nofollow noopener" target="_blank"
             className="text-xs text-aegean hover:underline">
            {T.officialSchedule[ui]} →
          </a>
        </div>
      ))}
    </section>
  );
}

export default async function BusPairPage({ params }: { params: Promise<Params> }) {
  const { locale, pair } = await params;
  setRequestLocale(locale);
  const ui = pickUiLoc(locale);
  const [routes, destinations] = await Promise.all([getBusRoutes(), getBusDestinations()]);
  const pr = pairRoutes(routes, pair);
  if (!pr) notFound();
  const { placeA, placeB } = pr.pair;
  const updatedAt = latestScrapedAt([...pr.outbound, ...pr.inbound]);

  // FAQ data-driven : uniquement les questions dont on a la donnee.
  const ref = pr.outbound[0] ?? pr.inbound[0];
  const faq: Array<[string, string]> = [];
  if (ref?.price_eur != null) {
    const p = `${ref.price_eur.toFixed(2)} €${ref.price_estimated ? ` (${T.indicative[ui]})` : ""}`;
    faq.push(T.faqPrice[ui](placeA, placeB, p) as [string, string]);
  }
  if (ref?.duration) faq.push(T.faqDuration[ui](placeA, placeB, ref.duration) as [string, string]);
  const deps = pr.outbound[0]?.departures ?? [];
  if (deps.length > 1) {
    faq.push(T.faqFirstLast[ui](placeA, placeB, deps[0], deps[deps.length - 1]) as [string, string]);
  }

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${BASE_URL}/${locale}` },
          { "@type": "ListItem", position: 2, name: "Buses", item: `${BASE_URL}/${locale}/buses` },
          { "@type": "ListItem", position: 3, name: `${placeA} ↔ ${placeB}`, item: `${BASE_URL}/${locale}/buses/${pair}` },
        ],
      },
      ...(faq.length > 0 ? [{
        "@type": "FAQPage",
        mainEntity: faq.map(([q, a]) => ({
          "@type": "Question", name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      }] : []),
    ],
  };

  const onwardB = onwardPlaces(routes, placeB, placeA).slice(0, 8);
  const destB = destinations[slugifyPlace(placeB) ?? ""];

  return (
    <main className="min-h-screen bg-surface">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href={`/${locale}/buses`} className="inline-flex items-center gap-1 text-sm text-aegean hover:underline mb-6">
          <ChevronLeft className="w-4 h-4" /> {T.allBuses[ui]}
        </Link>

        <h1 className="text-3xl font-bold text-aegean mb-1">
          {T.title[ui](placeA, placeB)}
        </h1>
        {updatedAt && (
          <p className="text-xs text-text-muted mb-6">
            {T.updatedOn[ui]} {new Date(updatedAt).toLocaleDateString(locale)}
          </p>
        )}

        <Link
          href={`/${locale}/buses?from=${encodeURIComponent(placeA)}&to=${encodeURIComponent(placeB)}`}
          className="inline-flex items-center gap-2 rounded-lg bg-aegean text-white text-sm font-semibold px-4 py-2 mb-8 hover:opacity-90"
        >
          <Bus className="w-4 h-4" /> {T.planCta[ui]}
        </Link>

        <DirectionSection from={placeA} to={placeB} routes={pr.outbound} ui={ui} />
        <DirectionSection from={placeB} to={placeA} routes={pr.inbound} ui={ui} />

        {onwardB.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-text mb-3">{T.onward[ui]} {placeB}</h2>
            <div className="flex flex-wrap gap-2">
              {onwardB.map((p) => {
                const s = pairSlug(placeB, p);
                return s ? (
                  <Link key={p} href={`/${locale}/buses/${s}`}
                        className="px-3 py-1.5 rounded-lg border border-border bg-white text-sm text-aegean hover:shadow-sm">
                    {placeB} → {p}
                  </Link>
                ) : null;
              })}
            </div>
          </section>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-8">
          {GETTING_AROUND.has(pair) && (
            <Link href={`/${locale}/getting-around/${pair}`} className="text-aegean hover:underline">
              {T.compare[ui]}
            </Link>
          )}
          {destB?.things_to_do_slug && (
            <Link href={`/${locale}/things-to-do/${destB.things_to_do_slug}`} className="text-aegean hover:underline">
              {placeB} ✓
            </Link>
          )}
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">{T.disclaimer[ui]}</p>
        </div>
      </div>
    </main>
  );
}
```

NB : le lien guide `{placeB} ✓` est un libellé provisoire à remplacer par le pattern GuideLinks (texte « What to do in X ») — reprendre les libellés `whatToDo`/`whereToStay` de BusesClient si `destB` existe.

- [ ] **Step 2 : Vérifier types + build**

Run: `npx tsc --noEmit` → 0 erreur.
Run: `npm run build` (background) → EXIT 0, le log « Generating static pages » inclut les pages /buses/[pair] (4 locales × ~N paires).

- [ ] **Step 3 : Vérif visuelle dev (Playwright)**

`http://localhost:3000/fr/buses/heraklion-to-ierapetra` : H1 « Bus Heraklion ↔ Ierapetra », sections aller ET retour avec grilles par jour, prix, FAQ JSON-LD dans le HTML, CTA pointe `/fr/buses?from=Heraklion&to=Ierapetra` et le planificateur arrive prérempli. Slug inconnu `/fr/buses/foo-to-bar` → 404.

- [ ] **Step 4 : Commit**

```bash
git add "src/app/[locale]/buses/[pair]/page.tsx"
git commit -m "feat(buses): pages SEO par paire /buses/[pair] (horaires, prix, FAQ, maillage)"
```

---

### Task 5 : Maillage — RouteCard + sitemap

**Files:**
- Modify: `src/app/[locale]/buses/BusesClient.tsx` (RouteCard : header → lien page paire)
- Modify: `src/app/sitemap.xml/route.ts` (entrées /buses/[pair])

- [ ] **Step 1 : RouteCard linke sa page paire**

Dans `BusesClient.tsx`, importer `pairSlug` :

```tsx
import { pairSlug } from "@/lib/bus-pairs";
```

Dans `RouteCard`, remplacer le bloc header :

```tsx
      <div className="bg-aegean px-5 py-4 text-white">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-base">{route.from_place}</span>
          <ArrowRight className="w-4 h-4 text-white/70 shrink-0" />
          <span className="font-bold text-base">{route.to_place}</span>
        </div>
      </div>
```

par :

```tsx
      {(() => {
        const ps = pairSlug(route.from_place, route.to_place);
        const header = (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-base">{route.from_place}</span>
            <ArrowRight className="w-4 h-4 text-white/70 shrink-0" />
            <span className="font-bold text-base">{route.to_place}</span>
          </div>
        );
        return ps ? (
          <Link href={`/${locale}/buses/${ps}`} className="block bg-aegean px-5 py-4 text-white hover:bg-aegean/90">
            {header}
          </Link>
        ) : (
          <div className="bg-aegean px-5 py-4 text-white">{header}</div>
        );
      })()}
```

- [ ] **Step 2 : Sitemap**

Dans `src/app/sitemap.xml/route.ts`, ajouter l'import :

```ts
import { eligiblePairs } from "@/lib/bus-pairs";
```

et dans `GET()`, près des autres entrées DB :

```ts
  // Pages par paire de villes /buses/[pair] (spec 2026-06-10-bus-pair-pages)
  const { data: busRoutes } = await supabase.from("bus_routes").select("from_place,to_place");
  for (const p of eligiblePairs(busRoutes ?? [])) push(`/buses/${p.slug}`, "weekly", 0.7);
```

- [ ] **Step 3 : Vérifier**

Run: `npx tsc --noEmit` → 0 erreur. `npm run build` → EXIT 0.

- [ ] **Step 4 : Commit**

```bash
git add "src/app/[locale]/buses/BusesClient.tsx" src/app/sitemap.xml/route.ts
git commit -m "feat(buses): maillage pages paires (RouteCard + sitemap weekly 0.7)"
```

---

### Task 6 : Push, deploy, vérif prod, IndexNow, mémoire

**Files:** aucun

- [ ] **Step 1 : Push**

```bash
git push origin master && git push origin master:main
```

- [ ] **Step 2 : Attendre Ready (poll vercel inspect du deploy production), puis vérif prod**

Playwright sur `https://crete.direct/fr/buses/heraklion-to-ierapetra` et `https://crete.direct/en/buses/chania-to-paleochora` : H1, grilles aller/retour, FAQ JSON-LD, CTA prérempli. Sitemap : `curl https://crete.direct/sitemap.xml | grep -c "buses/"` → ≥ nombre de paires.

- [ ] **Step 3 : IndexNow (toutes les URLs paires, 4 locales)**

```bash
node -e "import('./src/lib/bus-pairs.ts').then(async({eligiblePairs})=>{const fs=await import('fs');for(const l of fs.readFileSync('.env.local','utf8').split(/\r?\n/)){const m=l.match(/^([A-Z_0-9]+)=(.*)$/);if(m)process.env[m[1]]=m[2]}const{createClient}=await import('@supabase/supabase-js');const{data}=await createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).from('bus_routes').select('from_place,to_place');const urls=[];for(const p of eligiblePairs(data))for(const l of ['en','fr','de','el'])urls.push('https://crete.direct/'+l+'/buses/'+p.slug);fs.writeFileSync('pair-urls.txt',urls.join('\n'));console.log(urls.length,'urls -> pair-urls.txt')})"
py -3 -c "import sys; sys.path.insert(0,'vps'); from indexnow import submit; submit(open('pair-urls.txt').read().splitlines())"
del pair-urls.txt
```

Expected: réponses Yandex 202 / Naver 200 (Bing 403 tant que BWT non vérifié = connu).

- [ ] **Step 4 : Mémoire**

session_log (DEPLOY, sources : commits, deploy id, vérifs) + fiche `project_crete_direct.md` (Phase 10) + ligne MEMORY.md re-cousue + rappel revue GSC J+45 (25/07/2026, owner Kami) déjà dans la spec.

---

## Self-review (fait à l'écriture)

- **Couverture spec :** module pur (T1), garde-fou volume réel (T2), query params planner (T3), page complète avec FAQ/breadcrumb/hreflang/CTA/onward/getting-around/disclaimer (T4), maillage RouteCard+sitemap (T5), IndexNow+vérif prod+mémoire+réversibilité (T6, GSC J+45 dans spec). Hors périmètre respecté.
- **Placeholders :** le libellé provisoire du lien guide en T4 est explicitement flaggé avec sa résolution (reprendre les libellés GuideLinks) — à faire pendant T4, pas après.
- **Type consistency :** `eligiblePairs(PairRouteLike[])` accepte les selects partiels du sitemap (T5) et de T2 ; `pairSlug`/`slugifyPlace` utilisés dans T4/T5 = signatures T1.
