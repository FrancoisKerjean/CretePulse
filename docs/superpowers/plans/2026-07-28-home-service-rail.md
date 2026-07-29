# Home v2 crete.direct : hero baromètre + rail services : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Refondre le hero de la home crete.direct en baromètre de faits observés, et insérer un rail de quatre services (voiture, van, activités, villa) dont le bloc villa est câblé mais éteint par feature-flag.

**Architecture:** Deux modules purs (`home-services.ts`, `island-now.ts`) portent toute la logique et sont testés sans navigateur par des scripts `check:*` câblés à `npm run check`. Une route serveur `/api/island-now` lit les tables `flux_*` avec la clé service (le rôle anonyme est refusé) et renvoie des agrégats cachés 10 minutes au CDN, ce qui laisse la home en ISR 2 h. Deux composants de présentation (`IslandBarometer`, `ServiceRail`) consomment ces modules.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, next-intl (22 locales), Supabase JS sur PostgREST self-hosted, Plausible.

**Spec:** `docs/superpowers/specs/2026-07-28-home-service-rail-design.md`
**Mockup:** `docs/mockups/2026-07-28-home-v2-services.html`
**Branche:** `feat/home-service-rail`, worktree `C:\Users\fkerj\cp-home-rail`

---

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `src/lib/home-services.ts` | **Créer.** Catalogue des 4 services et règle de visibilité du flag. Pur. |
| `scripts/check-home-services.mjs` | **Créer.** Tests purs du catalogue, dont l'existence réelle des photos. |
| `src/lib/island-now.ts` | **Créer.** Choix de l'escale du jour, comptage des bus, règle de masquage nocturne. Pur. |
| `scripts/check-island-now.mjs` | **Créer.** Tests purs des trois règles. |
| `src/app/api/island-now/route.ts` | **Créer.** Lecture `flux_*` avec la clé service, agrégats, cache CDN. |
| `src/components/home/IslandBarometer.tsx` | **Créer.** Panneau du hero : mer en props, croisière et bus en fetch. |
| `src/components/home/ServiceRail.tsx` | **Créer.** Bandeau voiture plus trois cartes. |
| `src/messages/*.json` (22) | **Modifier.** Clés `barometer.*` et `serviceRail.*`. |
| `src/components/home/HomeClient.tsx` | **Modifier.** Hero, insertion du rail, dégonflage actus et guides. |
| `src/app/[locale]/page.tsx` | **Modifier.** Lecture du flag, passage des services en props. |
| `package.json` | **Modifier.** Deux scripts `check:*` ajoutés à l'agrégat. |

---

## Task 1 : catalogue des services

**Files:**
- Create: `src/lib/home-services.ts`
- Create: `scripts/check-home-services.mjs`
- Modify: `package.json`

- [x] **Step 1 : écrire le test qui échoue**

Créer `scripts/check-home-services.mjs` :

```js
// scripts/check-home-services.mjs : tests purs du catalogue des services de la home.
import assert from "node:assert/strict";
import fs from "node:fs";
import { getHomeServices } from "../src/lib/home-services.ts";

let n = 0;
function ok(name, fn) { fn(); n++; console.log(`  ok ${name}`); }

ok("flag eteint : 3 services, pas de villa", () => {
  const s = getHomeServices({ staysEnabled: false });
  assert.equal(s.length, 3);
  assert.deepEqual(s.map((x) => x.id), ["car", "van", "activities"]);
});

ok("flag allume : 4 services, villa en dernier", () => {
  const s = getHomeServices({ staysEnabled: true });
  assert.equal(s.length, 4);
  assert.deepEqual(s.map((x) => x.id), ["car", "van", "activities", "stays"]);
});

ok("la voiture est le seul bandeau et arrive en premier", () => {
  const s = getHomeServices({ staysEnabled: true });
  assert.equal(s[0].id, "car");
  assert.equal(s[0].layout, "band");
  assert.deepEqual(s.slice(1).map((x) => x.layout), ["card", "card", "card"]);
});

ok("seul le van est externe", () => {
  const s = getHomeServices({ staysEnabled: true });
  assert.deepEqual(s.filter((x) => x.external).map((x) => x.id), ["van"]);
  assert.ok(s.find((x) => x.id === "van").href.startsWith("https://"));
});

ok("aucun href vide", () => {
  for (const s of getHomeServices({ staysEnabled: true })) {
    assert.ok(s.href.length > 1, `href vide pour ${s.id}`);
  }
});

ok("chaque photo existe reellement dans public/", () => {
  for (const s of getHomeServices({ staysEnabled: true })) {
    assert.ok(fs.existsSync(`public${s.photo}`), `photo manquante : public${s.photo}`);
  }
});

console.log(`check:home-services OK (${n} tests)`);
```

- [x] **Step 2 : lancer le test et vérifier qu'il échoue**

Run : `node --experimental-strip-types scripts/check-home-services.mjs`
Attendu : `ERR_MODULE_NOT_FOUND` sur `../src/lib/home-services.ts`.

- [x] **Step 3 : écrire l'implémentation minimale**

Créer `src/lib/home-services.ts` :

```ts
// Catalogue des services commerciaux exposes sur la home (rail « Reserver en direct »).
// Module PUR : aucune dependance React, aucun acces reseau. Teste par
// scripts/check-home-services.mjs. Spec : docs/superpowers/specs/2026-07-28-home-service-rail-design.md
export type HomeServiceId = "car" | "van" | "activities" | "stays";

export interface HomeService {
  id: HomeServiceId;
  /** Chemin interne (locale ajoutee par le Link i18n) ou URL absolue. */
  href: string;
  /** Derive de href, jamais saisi a la main. */
  external: boolean;
  /** Chemin sous public/. */
  photo: string;
  layout: "band" | "card";
}

const CATALOG: Omit<HomeService, "external">[] = [
  { id: "car", href: "/car-rental", photo: "/images/partners/car-rental.jpg", layout: "band" },
  { id: "van", href: "https://van.crete.direct", photo: "/images/partners/ferry.jpg", layout: "card" },
  { id: "activities", href: "/activities", photo: "/images/partners/tours.jpg", layout: "card" },
  { id: "stays", href: "/stays", photo: "/images/partners/villa.jpg", layout: "card" },
];

/**
 * Le bloc villa n'est retourne que si le flag est allume : /stays est en
 * noindex et sans annonce reelle publiee (decision Kami 25/07/2026).
 */
export function getHomeServices(opts: { staysEnabled: boolean }): HomeService[] {
  return CATALOG
    .filter((s) => s.id !== "stays" || opts.staysEnabled)
    .map((s) => ({ ...s, external: /^https?:\/\//.test(s.href) }));
}
```

- [x] **Step 4 : lancer le test et vérifier qu'il passe**

Run : `node --experimental-strip-types scripts/check-home-services.mjs`
Attendu : 6 lignes `ok` puis `check:home-services OK (6 tests)`.

- [x] **Step 5 : câbler le script**

Dans `package.json`, ajouter à `scripts` :

```json
"check:home-services": "node --experimental-strip-types scripts/check-home-services.mjs",
```

et insérer `npm run check:home-services && ` juste avant `npm run check:da` dans la valeur de `"check"`.

- [x] **Step 6 : vérifier l'agrégat**

Run : `npm run check:home-services`
Attendu : `check:home-services OK (6 tests)`.

- [x] **Step 7 : commit**

```bash
git add src/lib/home-services.ts scripts/check-home-services.mjs package.json
git commit -m "feat(home): catalogue des services du rail avec flag villa"
```

---

## Task 2 : logique pure du baromètre

**Files:**
- Create: `src/lib/island-now.ts`
- Create: `scripts/check-island-now.mjs`
- Modify: `package.json`

- [x] **Step 1 : écrire le test qui échoue**

Créer `scripts/check-island-now.mjs` :

```js
// scripts/check-island-now.mjs : tests purs du barometre de l'ile (hero home v2).
import assert from "node:assert/strict";
import { pickTodayCruise, countTrackedVehicles, shouldShowBuses, athensDate } from "../src/lib/island-now.ts";

let n = 0;
function ok(name, fn) { fn(); n++; console.log(`  ok ${name}`); }

const CALLS = [
  { call_date: "2026-07-28", port: "heraklion", ship_name: "Costa Fortuna", pax_capacity: 3470, eta: "08:00", etd: "18:30" },
  { call_date: "2026-08-02", port: "heraklion", ship_name: "Celestyal Discovery", pax_capacity: 1582, eta: "06:15", etd: "12:00" },
  { call_date: "2026-08-02", port: "heraklion", ship_name: "Vidanta Elegant", pax_capacity: 298, eta: "08:00", etd: "20:00" },
];

ok("aucune escale aujourd'hui = null", () => {
  assert.equal(pickTodayCruise(CALLS, "2026-07-29"), null);
});

ok("une escale = capacite du navire", () => {
  const c = pickTodayCruise(CALLS, "2026-07-28");
  assert.equal(c.paxCapacity, 3470);
  assert.equal(c.port, "heraklion");
  assert.deepEqual(c.ships.map((s) => s.name), ["Costa Fortuna"]);
});

ok("deux escales = somme des capacites, plus gros navire en tete", () => {
  const c = pickTodayCruise(CALLS, "2026-08-02");
  assert.equal(c.paxCapacity, 1880);
  assert.deepEqual(c.ships.map((s) => s.name), ["Celestyal Discovery", "Vidanta Elegant"]);
});

ok("capacite absente ou nulle : escale ignoree", () => {
  const calls = [{ call_date: "2026-07-28", port: "heraklion", ship_name: "Inconnu", pax_capacity: null, eta: null, etd: null }];
  assert.equal(pickTodayCruise(calls, "2026-07-28"), null);
});

ok("comptage bus = vehicules distincts", () => {
  assert.equal(countTrackedVehicles([{ vehicle_key: "a" }, { vehicle_key: "a" }, { vehicle_key: "b" }]), 2);
  assert.equal(countTrackedVehicles([]), 0);
});

ok("zero bus : ligne masquee", () => {
  assert.equal(shouldShowBuses(0, "2026-07-28T12:00:00Z", Date.parse("2026-07-28T12:01:00Z")), false);
});

ok("donnee fraiche : ligne affichee", () => {
  assert.equal(shouldShowBuses(32, "2026-07-28T12:00:00Z", Date.parse("2026-07-28T12:10:00Z")), true);
});

ok("donnee de plus de 15 min : ligne masquee (cas nuit)", () => {
  assert.equal(shouldShowBuses(32, "2026-07-28T19:50:00Z", Date.parse("2026-07-28T21:29:00Z")), false);
});

ok("horodatage absent : ligne masquee", () => {
  assert.equal(shouldShowBuses(32, null, Date.parse("2026-07-28T12:00:00Z")), false);
});

ok("date Athens au format ISO court", () => {
  assert.equal(athensDate(Date.parse("2026-07-28T21:29:00Z")), "2026-07-29");
  assert.equal(athensDate(Date.parse("2026-07-28T09:00:00Z")), "2026-07-28");
});

console.log(`check:island-now OK (${n} tests)`);
```

- [x] **Step 2 : lancer le test et vérifier qu'il échoue**

Run : `node --experimental-strip-types scripts/check-island-now.mjs`
Attendu : `ERR_MODULE_NOT_FOUND` sur `../src/lib/island-now.ts`.

- [x] **Step 3 : écrire l'implémentation minimale**

Créer `src/lib/island-now.ts` :

```ts
// Barometre de l'ile (hero home v2) : regles pures de selection et d'affichage.
// AUCUNE estimation ici, uniquement des faits observes ou planifies.
// Teste par scripts/check-island-now.mjs.
// Spec : docs/superpowers/specs/2026-07-28-home-service-rail-design.md
export interface CruiseCallRow {
  call_date: string;
  port: string;
  ship_name: string;
  pax_capacity: number | null;
  eta: string | null;
  etd: string | null;
}

export interface CruiseLine {
  port: string;
  /** Somme des capacites des navires a quai ce jour. C'est une CAPACITE, pas un comptage. */
  paxCapacity: number;
  ships: { name: string; eta: string | null; etd: string | null }[];
}

/** Fenetre de fraicheur du GPS bus, en minutes. */
export const BUS_MAX_AGE_MIN = 15;

/** Date du jour a Athens au format YYYY-MM-DD (en-CA rend l'ISO court). */
export function athensDate(now: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Athens" }).format(new Date(now));
}

export function pickTodayCruise(calls: CruiseCallRow[], today: string): CruiseLine | null {
  const todays = calls
    .filter((c) => c.call_date === today && typeof c.pax_capacity === "number" && c.pax_capacity > 0)
    .sort((a, b) => (b.pax_capacity as number) - (a.pax_capacity as number));
  if (todays.length === 0) return null;
  return {
    port: todays[0].port,
    paxCapacity: todays.reduce((sum, c) => sum + (c.pax_capacity as number), 0),
    ships: todays.map((c) => ({ name: c.ship_name, eta: c.eta, etd: c.etd })),
  };
}

export function countTrackedVehicles(rows: { vehicle_key: string }[]): number {
  return new Set(rows.map((r) => r.vehicle_key)).size;
}

/**
 * Les reseaux urbains ne roulent pas la nuit et les crons GPS tournent de 4h a
 * 20h UTC : on masque la ligne au lieu d'afficher zero.
 */
export function shouldShowBuses(tracked: number, asOf: string | null, now: number, maxAgeMin = BUS_MAX_AGE_MIN): boolean {
  if (tracked <= 0 || !asOf) return false;
  const t = Date.parse(asOf);
  if (Number.isNaN(t)) return false;
  return now - t <= maxAgeMin * 60_000;
}
```

- [x] **Step 4 : lancer le test et vérifier qu'il passe**

Run : `node --experimental-strip-types scripts/check-island-now.mjs`
Attendu : 10 lignes `ok` puis `check:island-now OK (10 tests)`.

- [x] **Step 5 : câbler le script**

Dans `package.json` :

```json
"check:island-now": "node --experimental-strip-types scripts/check-island-now.mjs",
```

et insérer `npm run check:island-now && ` juste après `npm run check:home-services && ` dans `"check"`.

- [x] **Step 6 : commit**

```bash
git add src/lib/island-now.ts scripts/check-island-now.mjs package.json
git commit -m "feat(home): regles pures du barometre de l'ile"
```

---

## Task 3 : route serveur `/api/island-now`

**Files:**
- Create: `src/app/api/island-now/route.ts`

- [x] **Step 1 : écrire la route**

Créer `src/app/api/island-now/route.ts` :

```ts
// Barometre de l'ile : agregats servis au hero de la home.
// La home est en ISR 2 h : le live passe par ici, cache CDN 10 min.
// Les tables flux_* REFUSENT le role anonyme (42501 permission denied, verifie
// le 28/07/2026) : lecture avec la cle service, cote serveur uniquement.
// Spec : docs/superpowers/specs/2026-07-28-home-service-rail-design.md
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  athensDate,
  countTrackedVehicles,
  shouldShowBuses,
  pickTodayCruise,
  BUS_MAX_AGE_MIN,
  type CruiseCallRow,
} from "@/lib/island-now";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
};

export async function GET() {
  const now = Date.now();
  const today = athensDate(now);

  const [cruiseRes, busRes] = await Promise.all([
    supabaseAdmin
      .from("flux_cruise_calls")
      .select("call_date,port,ship_name,pax_capacity,eta,etd")
      .eq("call_date", today),
    supabaseAdmin
      .from("flux_bus_positions")
      .select("vehicle_key,recorded_at")
      .gte("recorded_at", new Date(now - BUS_MAX_AGE_MIN * 60_000).toISOString())
      .order("recorded_at", { ascending: false })
      .limit(2000),
  ]);

  // Une source en echec ne casse pas le hero : sa ligne disparait, point.
  const cruise = cruiseRes.error ? null : pickTodayCruise((cruiseRes.data ?? []) as CruiseCallRow[], today);

  let buses: { tracked: number; asOf: string } | null = null;
  if (!busRes.error && busRes.data && busRes.data.length > 0) {
    const rows = busRes.data as { vehicle_key: string; recorded_at: string }[];
    const tracked = countTrackedVehicles(rows);
    const asOf = rows[0].recorded_at;
    if (shouldShowBuses(tracked, asOf, now)) buses = { tracked, asOf };
  }

  return NextResponse.json({ cruise, buses, stock: null }, { headers: CACHE_HEADERS });
}
```

- [x] **Step 2 : vérifier le typage**

Run : `npx tsc --noEmit`
Attendu : aucune erreur.

- [x] **Step 3 : vérifier la réponse en local**

Run :
```bash
npm run dev
# dans un autre terminal
curl -s http://localhost:3000/api/island-now
```
Attendu en journée : `{"cruise":{"port":"heraklion","paxCapacity":...,"ships":[...]},"buses":{"tracked":...,"asOf":"..."},"stock":null}`.
Attendu la nuit ou sans clé service en local : `{"cruise":null,"buses":null,"stock":null}`. C'est un résultat valide, pas un échec : la clé service n'existe que sur Vercel.

- [x] **Step 4 : commit**

```bash
git add src/app/api/island-now/route.ts
git commit -m "feat(home): route /api/island-now (croisieres du jour, bus suivis)"
```

---

## Task 4 : clés i18n

**Files:**
- Modify: `src/messages/en.json`, `fr.json`, `de.json`, `el.json` et les 18 autres

- [x] **Step 1 : ajouter les clés dans `en.json`**

Dans l'objet `home` de `src/messages/en.json`, ajouter :

```json
"barometer": {
  "sea": "{temp}° in the water, wind {wind} km/h, air {air}°",
  "cruise": "Up to {pax} cruise passengers in {port} today",
  "buses": "{count} buses tracked live",
  "src": { "weather": "weather stations", "port": "official port schedule", "gps": "GPS, every 5 min" }
},
"serviceRail": {
  "title": "Book direct",
  "lead": "Four services run from the island. No international middleman, no hidden commission.",
  "van": { "kicker": "Shared van", "title": "Airport to town", "sub": "From 40 € a seat, on routes the bus does not cover.", "cta": "See routes" },
  "activities": { "kicker": "Activities", "title": "Hiking, boat, cooking", "sub": "Several local operators quote your request.", "cta": "Get a quote" },
  "stays": { "kicker": "Villa and house", "title": "Rent without Airbnb", "sub": "The owner sets the price, you pay 5 % in fees instead of about 14 %.", "cta": "See places" }
}
```

- [x] **Step 2 : ajouter les mêmes clés dans `fr.json`**

```json
"barometer": {
  "sea": "{temp}° dans l'eau, vent {wind} km/h, air {air}°",
  "cruise": "Jusqu'à {pax} croisiéristes à {port} aujourd'hui",
  "buses": "{count} bus suivis en direct",
  "src": { "weather": "stations météo", "port": "calendrier officiel du port", "gps": "GPS, toutes les 5 min" }
},
"serviceRail": {
  "title": "Réserver en direct",
  "lead": "Quatre services opérés depuis l'île. Sans intermédiaire international, sans commission cachée.",
  "van": { "kicker": "Van partagé", "title": "Aéroport vers ville", "sub": "Dès 40 € le siège, sur les trajets que le bus ne fait pas.", "cta": "Voir les trajets" },
  "activities": { "kicker": "Activités", "title": "Randonnée, bateau, cuisine", "sub": "Plusieurs prestataires chiffrent votre demande.", "cta": "Demander un devis" },
  "stays": { "kicker": "Villa et maison", "title": "Louez sans Airbnb", "sub": "Le propriétaire fixe son prix, vous payez 5 % de frais au lieu d'environ 14 %.", "cta": "Voir les logements" }
}
```

- [x] **Step 3 : ajouter les mêmes clés dans `de.json`**

```json
"barometer": {
  "sea": "{temp}° im Wasser, Wind {wind} km/h, Luft {air}°",
  "cruise": "Bis zu {pax} Kreuzfahrtgäste heute in {port}",
  "buses": "{count} Busse live verfolgt",
  "src": { "weather": "Wetterstationen", "port": "offizieller Hafenkalender", "gps": "GPS, alle 5 Min." }
},
"serviceRail": {
  "title": "Direkt buchen",
  "lead": "Vier Dienste, betrieben von der Insel aus. Ohne internationalen Zwischenhändler, ohne versteckte Provision.",
  "van": { "kicker": "Sammelvan", "title": "Flughafen in die Stadt", "sub": "Ab 40 € pro Sitz, auf Strecken ohne Busverbindung.", "cta": "Strecken ansehen" },
  "activities": { "kicker": "Aktivitäten", "title": "Wandern, Boot, Kochen", "sub": "Mehrere örtliche Anbieter machen Ihnen ein Angebot.", "cta": "Angebot anfordern" },
  "stays": { "kicker": "Villa und Haus", "title": "Mieten ohne Airbnb", "sub": "Der Eigentümer setzt den Preis, Sie zahlen 5 % Gebühren statt rund 14 %.", "cta": "Unterkünfte ansehen" }
}
```

- [x] **Step 4 : ajouter les mêmes clés dans `el.json`**

```json
"barometer": {
  "sea": "{temp}° στο νερό, άνεμος {wind} χλμ/ώρα, αέρας {air}°",
  "cruise": "Έως {pax} επιβάτες κρουαζιέρας σήμερα στο {port}",
  "buses": "{count} λεωφορεία σε ζωντανή παρακολούθηση",
  "src": { "weather": "μετεωρολογικοί σταθμοί", "port": "επίσημο πρόγραμμα λιμένα", "gps": "GPS, κάθε 5 λεπτά" }
},
"serviceRail": {
  "title": "Κρατήστε απευθείας",
  "lead": "Τέσσερις υπηρεσίες από το νησί. Χωρίς διεθνή μεσάζοντα, χωρίς κρυφή προμήθεια.",
  "van": { "kicker": "Κοινό βαν", "title": "Αεροδρόμιο προς πόλη", "sub": "Από 40 € η θέση, σε διαδρομές χωρίς λεωφορείο.", "cta": "Δείτε τις διαδρομές" },
  "activities": { "kicker": "Δραστηριότητες", "title": "Πεζοπορία, σκάφος, μαγειρική", "sub": "Πολλοί τοπικοί συνεργάτες δίνουν προσφορά.", "cta": "Ζητήστε προσφορά" },
  "stays": { "kicker": "Βίλα και σπίτι", "title": "Νοικιάστε χωρίς Airbnb", "sub": "Ο ιδιοκτήτης ορίζει την τιμή, πληρώνετε 5 % αντί για περίπου 14 %.", "cta": "Δείτε τα καταλύματα" }
}
```

- [x] **Step 5 : traduire les 18 locales restantes**

Fichiers : `ar, cs, da, es, fi, hu, it, ja, ko, nl, no, pl, pt, ro, ru, sv, tr, zh`.
Même arborescence de clés, mêmes placeholders `{temp} {wind} {air} {pax} {port} {count}` conservés à l'identique.
Procédure identique au commit `ab2d927` (44 chaînes × 22 langues) : traduire dans la langue cible, jamais de recopie de l'anglais, jamais de mélange d'alphabets.
Contraintes de contenu : aucun tiret cadratin, garder « jusqu'à » ou son équivalent devant le nombre de croisiéristes (c'est une capacité), garder le symbole `€` et l'espace insécable avant `%` dans les langues qui l'utilisent.

- [x] **Step 6 : vérifier la parité des clés**

Run : `npm run check:i18n`
Attendu : aucune ligne `MANQUANTE` ni `EN TROP`, sortie finale OK sur 22 fichiers.

- [x] **Step 7 : vérifier l'absence de mélange d'alphabets**

Run :
```bash
node -e "const fs=require('fs');for(const f of fs.readdirSync('src/messages')){const j=JSON.parse(fs.readFileSync('src/messages/'+f,'utf8')).home;const s=JSON.stringify([j.barometer,j.serviceRail]);const cyr=/[\u0400-\u04FF]/.test(s),grk=/[\u0370-\u03FF]/.test(s),lat=/[A-Za-z]{4}/.test(s);if(f!=='ru.json'&&cyr)console.log('cyrillique inattendu:',f);if(f!=='el.json'&&grk)console.log('grec inattendu:',f);if((f==='ru.json'||f==='el.json')&&lat)console.log('latin suspect dans:',f);}"
```
Attendu : aucune sortie. `km/h`, `GPS` et `Airbnb` restent en latin partout, c'est voulu : si le script signale `ru.json` ou `el.json`, vérifier à la main que seuls ces termes sont concernés.

- [x] **Step 8 : commit**

```bash
git add src/messages
git commit -m "i18n(home): cles barometre et rail services dans les 22 locales"
```

---

## Task 5 : composant du baromètre

**Files:**
- Create: `src/components/home/IslandBarometer.tsx`

- [x] **Step 1 : écrire le composant**

Créer `src/components/home/IslandBarometer.tsx` :

```tsx
"use client";

// Barometre de l'ile : panneau du hero. Trois lignes de FAITS observes.
// La mer arrive en props (deja rendue cote serveur, ISR 2 h) ; croisiere et bus
// viennent de /api/island-now (cache CDN 10 min). Une source absente = ligne
// absente, jamais de zero affiche, jamais d'estimation.
// Spec : docs/superpowers/specs/2026-07-28-home-service-rail-design.md
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CiBus, CiWave } from "@/components/icons";
import { Ship } from "lucide-react";

interface IslandNow {
  cruise: { port: string; paxCapacity: number; ships: { name: string; eta: string | null; etd: string | null }[] } | null;
  buses: { tracked: number; asOf: string } | null;
  stock: null;
}

const PORT_LABEL: Record<string, string> = {
  heraklion: "Heraklion",
  souda: "Souda",
  chania: "Chania",
  sitia: "Sitia",
  agios_nikolaos: "Agios Nikolaos",
};

export function IslandBarometer({
  seaTemp,
  windSpeed,
  airTemp,
}: {
  seaTemp: number | null;
  windSpeed: number | null;
  airTemp: number | null;
}) {
  const t = useTranslations("home");
  const [data, setData] = useState<IslandNow | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/island-now")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (alive) setData(j); })
      .catch(() => { /* une source muette n'affiche rien, elle ne casse rien */ });
    return () => { alive = false; };
  }, []);

  const showSea = seaTemp != null && windSpeed != null && airTemp != null;
  const cruise = data?.cruise ?? null;
  const buses = data?.buses ?? null;
  if (!showSea && !cruise && !buses) return null;

  return (
    <div className="bg-white/86 rounded-[22px] px-4 py-0.5 mb-4 max-w-[470px] shadow-[0_12px_30px_rgba(11,94,120,.14)]">
      {showSea && (
        <div className="flex items-center gap-3 py-3">
          <CiWave className="w-[18px] h-[18px] text-sea shrink-0" aria-hidden />
          <p className="flex-1 text-[13.5px] leading-snug text-text m-0">
            {t("barometer.sea", { temp: seaTemp, wind: windSpeed, air: airTemp })}
          </p>
          <span className="text-[10px] text-text-muted text-right max-w-[96px] leading-tight hidden sm:block">
            {t("barometer.src.weather")}
          </span>
        </div>
      )}

      {cruise && (
        <div className="flex items-center gap-3 py-3 border-t border-text/8">
          <Ship className="w-[18px] h-[18px] text-sea shrink-0" aria-hidden />
          <p className="flex-1 text-[13.5px] leading-snug text-text m-0">
            {t("barometer.cruise", {
              pax: cruise.paxCapacity.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " "),
              port: PORT_LABEL[cruise.port] ?? cruise.port,
            })}
            <br />
            <span className="text-[11.5px] text-text-muted">
              {cruise.ships.map((s) => `${s.name}${s.eta && s.etd ? ` ${s.eta}-${s.etd}` : ""}`).join(" · ")}
            </span>
          </p>
          <span className="text-[10px] text-text-muted text-right max-w-[96px] leading-tight hidden sm:block">
            {t("barometer.src.port")}
          </span>
        </div>
      )}

      {buses && (
        <div className="flex items-center gap-3 py-3 border-t border-text/8">
          <CiBus className="w-[18px] h-[18px] text-sea shrink-0" aria-hidden />
          <p className="flex-1 text-[13.5px] leading-snug text-text m-0">
            {t("barometer.buses", { count: buses.tracked })}
          </p>
          <span className="text-[10px] text-text-muted text-right max-w-[96px] leading-tight hidden sm:block">
            {t("barometer.src.gps")}
          </span>
        </div>
      )}
    </div>
  );
}
```

- [x] **Step 2 : vérifier le typage**

Run : `npx tsc --noEmit`
Attendu : aucune erreur.

- [x] **Step 3 : commit**

```bash
git add src/components/home/IslandBarometer.tsx
git commit -m "feat(home): composant barometre de l'ile"
```

---

## Task 6 : composant du rail services

**Files:**
- Create: `src/components/home/ServiceRail.tsx`

- [x] **Step 1 : écrire le composant**

Créer `src/components/home/ServiceRail.tsx` :

```tsx
"use client";

// Rail « Reserver en direct » : bandeau voiture (format prouve a 5,7 % de clic)
// plus trois cartes de poids egal. Le contenu vient de getHomeServices, la
// visibilite du bloc villa d'un flag serveur.
// Spec : docs/superpowers/specs/2026-07-28-home-service-rail-design.md
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ImpressionTracker } from "@/components/ui/ImpressionTracker";
import type { HomeService, HomeServiceId } from "@/lib/home-services";

const COPY_KEY: Record<HomeServiceId, { kicker: string; title: string; sub: string; cta: string }> = {
  car: { kicker: "carRentalKicker", title: "carRentalTitle", sub: "carRentalSub", cta: "carRentalCta" },
  van: { kicker: "serviceRail.van.kicker", title: "serviceRail.van.title", sub: "serviceRail.van.sub", cta: "serviceRail.van.cta" },
  activities: { kicker: "serviceRail.activities.kicker", title: "serviceRail.activities.title", sub: "serviceRail.activities.sub", cta: "serviceRail.activities.cta" },
  stays: { kicker: "serviceRail.stays.kicker", title: "serviceRail.stays.title", sub: "serviceRail.stays.sub", cta: "serviceRail.stays.cta" },
};

function track(service: HomeServiceId, layout: HomeService["layout"]) {
  (window as unknown as { plausible?: (e: string, o?: { props?: Record<string, string> }) => void })
    .plausible?.("service_rail_click", { props: { service, layout } });
}

function Card({ s, band }: { s: HomeService; band: boolean }) {
  const t = useTranslations("home");
  const k = COPY_KEY[s.id];
  const inner = (
    <>
      <ImpressionTracker event="promo_impression" props={{ block: "service-rail", source: "home", service: s.id }} />
      <img src={s.photo} alt="" loading="lazy" aria-hidden
           className="absolute inset-0 h-full w-full object-cover transition-transform duration-[4000ms] ease-out group-hover:scale-105" />
      <div className={`absolute inset-0 ${band
        ? "bg-gradient-to-r from-[#08263a]/85 via-[#08263a]/50 to-[#08263a]/10"
        : "bg-gradient-to-b from-[#08263a]/15 via-[#08263a]/45 to-[#08263a]/88"}`} aria-hidden />
      <div className={`relative ${band ? "p-6 md:p-8 md:min-h-[210px] flex items-center" : "p-5 flex h-full items-end"}`}>
        <div className="min-w-0 max-w-xl">
          <p className="m-0 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 font-heading text-[10.5px] font-bold uppercase tracking-widest text-white/90 backdrop-blur-sm">
            {t(k.kicker)}
          </p>
          <h3 className={`m-0 mt-3 font-heading font-extrabold leading-tight text-white [text-wrap:balance] drop-shadow-[0_1px_3px_rgba(8,38,58,0.6)] ${band ? "text-[28px] md:text-[32px]" : "text-[19px]"}`}>
            {t(k.title)}
          </h3>
          <p className={`m-0 mt-1.5 text-white/90 drop-shadow-[0_1px_2px_rgba(8,38,58,0.6)] ${band ? "text-[14px]" : "text-[12.5px]"}`}>
            {t(k.sub)}
          </p>
          <span className={`mt-4 inline-flex items-center rounded-full bg-white font-heading font-bold text-terracotta shadow-soft transition-transform group-hover:scale-[1.03] ${band ? "px-7 py-3 text-[14.5px]" : "px-4 py-2 text-[12.5px]"}`}>
            {t(k.cta)}
          </span>
        </div>
      </div>
    </>
  );

  const cls = `group relative block overflow-hidden rounded-[26px] no-underline shadow-card ${band ? "" : "min-h-[200px]"}`;

  return s.external ? (
    <a href={s.href} target="_blank" rel="noopener" className={cls} onClick={() => track(s.id, s.layout)}>{inner}</a>
  ) : (
    <Link href={s.href} className={cls} onClick={() => track(s.id, s.layout)}>{inner}</Link>
  );
}

export function ServiceRail({ services }: { services: HomeService[] }) {
  const t = useTranslations("home");
  const band = services.find((s) => s.layout === "band");
  const cards = services.filter((s) => s.layout === "card");

  return (
    <section className="mt-10">
      <h2 className="font-heading text-[28px] font-extrabold text-text m-0">{t("serviceRail.title")}</h2>
      <p className="text-[13.5px] text-text-muted mt-1 mb-4 max-w-2xl">{t("serviceRail.lead")}</p>
      {band && <Card s={band} band />}
      <div className={`grid gap-3.5 mt-3.5 ${cards.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        {cards.map((s) => <Card key={s.id} s={s} band={false} />)}
      </div>
    </section>
  );
}
```

- [x] **Step 2 : vérifier le typage**

Run : `npx tsc --noEmit`
Attendu : aucune erreur.

- [x] **Step 3 : commit**

```bash
git add src/components/home/ServiceRail.tsx
git commit -m "feat(home): composant rail services"
```

---

## Task 7 : câblage dans la home

**Files:**
- Modify: `src/app/[locale]/page.tsx`
- Modify: `src/components/home/HomeClient.tsx`

- [x] **Step 1 : lire le flag et passer les services en props**

Dans `src/app/[locale]/page.tsx`, ajouter l'import :

```ts
import { getHomeServices } from "@/lib/home-services";
```

puis, dans le composant de page, juste avant le `return` qui rend `<HomeClient ... />` :

```ts
// Flag serveur : /stays est en noindex sans annonce reelle (decision Kami 25/07).
const services = getHomeServices({ staysEnabled: process.env.STAYS_HOME_BLOCK === "on" });
```

et ajouter `services={services}` à la liste des props de `<HomeClient />`.

- [x] **Step 2 : déclarer la prop côté client**

Dans `src/components/home/HomeClient.tsx`, ajouter aux imports :

```ts
import { ServiceRail } from "@/components/home/ServiceRail";
import { IslandBarometer } from "@/components/home/IslandBarometer";
import type { HomeService } from "@/lib/home-services";
```

Dans `interface HomeClientProps`, ajouter :

```ts
  services: HomeService[];
```

Dans la signature de `export function HomeClient({ ... })`, ajouter `services` à la déstructuration.

- [x] **Step 3 : remplacer les chips du hero par le baromètre**

Dans le hero, remplacer le bloc `<div className="flex flex-wrap gap-3 font-data"> ... </div>` (chips air, mer, vent, CTA baignade) par :

```tsx
              <IslandBarometer
                seaTemp={swimPick?.seaTemp ?? null}
                windSpeed={swimPick?.windSpeed ?? null}
                airTemp={heroCity?.temp ?? null}
              />
              <div className="flex flex-wrap gap-3 font-data">
                <Link href="/beaches/today" className="bg-sun text-text rounded-[17px] px-4 py-2.5 text-sm font-heading font-bold shadow-[0_10px_26px_rgba(11,94,120,.16)] no-underline hover:brightness-105 transition-all">
                  {t("ctaBeach")}
                </Link>
              </div>
```

Le `WindArrow` n'est plus utilisé dans le hero mais reste employé par les tuiles météo plus bas : ne pas retirer son import.

- [x] **Step 4 : insérer le rail après le board départs**

Juste après le bloc `{boardRoutes.length > 0 && ( ... <DepBoard ... /> ... )}`, remplacer toute la `<section className="mt-10">` qui contient le bandeau `/car-rental` par :

```tsx
        <ServiceRail services={services} />
```

Le bandeau voiture n'est pas supprimé : il est désormais rendu par `ServiceRail` à partir du catalogue, avec les mêmes clés `carRental*`.

- [x] **Step 5 : dégonfler actus, guides et événements**

Remplacer :

```ts
  const news = latestNews.slice(0, 6);
  const guides = latestGuides.slice(0, 4);
  const events = upcomingEvents.slice(0, 3);
```

par :

```ts
  // Degonfle 28/07 : le bloc occupait ~40 % de la hauteur pour 3,7 % des clics.
  const news = latestNews.slice(0, 4);
  const guides = latestGuides.slice(0, 2);
```

Supprimer le bloc `{events.length > 0 && ( ... )}` en entier, ainsi que l'import `CiCalendar` et la fonction `formatEventDate` s'ils ne sont plus référencés. Conserver la prop `upcomingEvents` : elle sert encore au garde-fou maintenance `latestNews.length === 0 && upcomingEvents.length === 0`.

- [x] **Step 6 : vérifier le typage**

Run : `npx tsc --noEmit`
Attendu : aucune erreur. Si `MapPin` ou `localizeLocation` ne sont plus utilisés, retirer leurs imports.

- [x] **Step 7 : vérifier le rendu**

Run : `npm run dev` puis ouvrir `http://localhost:3000/fr`.
Attendu : le hero montre le panneau baromètre, le rail affiche **trois** services (flag absent), le bloc actus montre 4 titres et 2 guides, plus aucun bloc événements.

Puis relancer avec le flag :

```bash
STAYS_HOME_BLOCK=on npm run dev
```
Attendu : quatre services, la carte villa en dernier.

- [x] **Step 8 : commit**

```bash
git add "src/app/[locale]/page.tsx" src/components/home/HomeClient.tsx
git commit -m "feat(home): hero barometre, rail services et bloc actus degonfle"
```

---

## Task 8 : vérification complète et livraison

**Files:**
- Modify: `public/og-home.jpg`, `public/og-home-fr.jpg`

- [x] **Step 1 : lancer l'agrégat de vérification**

Run : `npm run check`
Attendu : `check:home-services OK (6 tests)`, `check:island-now OK (10 tests)`, `check:i18n` vert, `tsc --noEmit` sans erreur.
Note : `check:da` porte des violations préexistantes sur `master` sans rapport avec ce chantier. Contrôle ciblé :

```bash
node scripts/check-da.mjs 2>&1 | grep -E "home-services|island-now|IslandBarometer|ServiceRail|HomeClient"
```
Attendu : aucune ligne.

**Résultat 29/07/2026** : `check:home-services OK (6 tests)`, `check:island-now OK (10 tests)`,
`check:da` « 0 nouvelle violation DA (119 dettes grandfatherées via baseline) »,
`check:i18n` « 22 locales en parité (172 clés chacune) », `tsc --noEmit` code 0.
Contrôle du mélange d'alphabets (Task 4 step 7) : `el.json` et `ru.json` signalés,
vérifié à la main, le seul latin est `Airbnb` dans `serviceRail.stays.title`, c'est voulu.

- [x] **Step 2 : build de production**

Run : `npm run build`
Attendu : build vert.

**Résultat 29/07/2026** : vert, 13 190 pages statiques générées en 13 min, code 0.

- [x] **Step 3 : contrôle visuel en 390 px**

Ouvrir `http://localhost:3000/en` en largeur 390 px dans les outils navigateur.
Vérifier : le baromètre tient sans débordement, les libellés de source sont masqués, les trois cartes du rail sont empilées, le bandeau voiture reste lisible.

**Résultat 29/07/2026, sur `next start` port 3100, captures Playwright 390 px et 1280 px.**
Conforme : `scrollWidth - clientWidth = 0` aux deux largeurs (aucun débordement
horizontal), libellés de source masqués sous `sm`, blocs du rail empilés, actus à 4
titres, guides à 2, plus aucun bloc événements, baromètre réduit à la seule ligne mer
(pas de clé service en local, donc `cruise` et `buses` à `null` : comportement attendu).

**Deux défauts trouvés, corrigés avant livraison.** Le build ne les voyait pas :
ils ne sont visibles qu'à l'image.

1. **Le lead comptait faux.** `serviceRail.lead` annonçait « Quatre services » dans
   les 22 locales alors que le flag villa est éteint en production : la page en
   affiche trois. Numéral retiré partout ; la copie survit désormais au basculement
   du flag sans retouche i18n. Décision reportée dans la spec, section 6.
2. **Titres illisibles sur les cartes van et activités.** `min-h-[200px]` valait
   exactement la hauteur du contenu, donc `items-end` ne décalait rien et le titre
   se posait dans la zone `from-[#08263a]/15` du dégradé, c'est-à-dire sur du ciel
   clair. Corrigé en `min-h-[250px]` plus dégradé carte `/32 → /58 → /92`. Même
   cause sur le bandeau voiture en mobile : son dégradé est horizontal et la zone
   calme est à gauche, or sous `md` la carte n'a pas de zone calme à droite et la
   deuxième ligne du sous-titre tombait sur le sable. Le bandeau passe en dégradé
   vertical sous `md` et garde l'horizontal à partir de `md`.

`npm run check` et `npm run build` rejoués verts après ces deux correctifs.

- [ ] **Step 4 : régénérer les aperçus sociaux**

Le hero a changé, donc `og-home.jpg` et `og-home-fr.jpg` sont périmés. À rejouer **après** la mise en production, quand `https://crete.direct/en` sert la nouvelle home :

```bash
node scripts/capture-og-home.mjs
OG_URL=https://crete.direct/fr OG_OUT=$PWD/public/og-home-fr.jpg node scripts/capture-og-home.mjs
git add public/og-home.jpg public/og-home-fr.jpg
git commit -m "chore(home): apercus sociaux regeneres apres la refonte du hero"
```

- [ ] **Step 5 : livrer**

Run : `npm run ship`
Attendu : intégration dans `master` et push. La promotion vers `main` part automatiquement à 20h Athens. **Ne jamais pousser `main` à la main.**

**Décision du 29/07/2026 sur la promotion.** Le chantier se termine à 03h Athens et
demande une vérification du rendu **en production**, pas seulement du build. Attendre
le cron de 20h ne la rendrait possible que 17 heures plus tard. La promotion est donc
déclenchée par `gh workflow run daily-deploy.yml`, c'est-à-dire le bouton « Run
workflow » prévu par le `workflow_dispatch` de l'Action. Ce n'est **pas** un
`git push origin master:main` à la main : la règle « jamais `main` » tient, c'est
l'Action qui promeut, en un seul build comme le soir.
Coût assumé : deux builds prod dans la journée au lieu d'un, donc deux vagues
d'écritures ISR. Effet de bord connu et accepté : la file `master` contenait déjà
5 commits d'autres terminaux, dont `feat(stays)` Phase 1 (#6) ; ils partent en prod
16 h plus tôt que prévu. Sans risque de surface : `/stays` est en noindex, sans
annonce publiée, et `STAYS_HOME_BLOCK` reste éteint donc la home ne pointe pas dessus.

**Conflit rencontré au premier `ship`.** `package.json` : le chantier Stays avait
ajouté `check:stays` et `check:car-demand` à l'agrégat `check` pendant que ce
chantier y ajoutait `check:home-services` et `check:island-now`. Résolu en union,
les quatre sont dans la chaîne, `check:stays` avant les deux nouveaux et `check:da`
toujours en avant-dernier. La fusion de `master` a aussi tiré la dépendance
`stripe` : `npm install` dans le worktree, sinon `tsc` échoue sur
`src/lib/stays/stripe-helpers.ts`. Le `package-lock.json` réécrit par ce
`npm install` a été **rejeté** : son diff n'était que du bruit npm-Windows
(suppression des champs `libc` des dépendances optionnelles), il n'y avait aucune
résolution à ajouter. `npm run check` et `npm run build` rejoués verts sur le
résultat de la fusion, avec le code Stays embarqué.

- [ ] **Step 6 : vérifier en production après la promotion**

```bash
curl -s https://crete.direct/api/island-now
curl -s https://crete.direct/fr | grep -c "serviceRail\|Réserver en direct"
```
Attendu : la route renvoie un JSON avec `cruise` non nul si une escale est prévue ce jour, et la home contient le titre du rail.

---

## Suites hors de ce plan

- **Réparation du capteur vols HER** : trou du 19 au 26/07, comptes gonflés jusqu'à 776 arrivées par jour. Owner Claude, butoir 04/08/2026. Tant qu'il n'est pas réparé, `stock` reste `null` et la quatrième ligne du baromètre n'existe pas.
- **Allumage du bloc villa** : poser `STAYS_HOME_BLOCK=on` sur Vercel une fois `feat/stays-marketplace` mergée, `/stays` indexable et au moins une annonce réelle publiée. **Poser la variable ne suffit pas** : elle est figée dans l'image du déploiement, il faut redéployer. Sans redéploiement manuel, l'effet arrive au deploy automatique de 20h Athènes, donc jusqu'à 24 heures plus tard.
- **Dette assumée** : `getUpcomingEvents(5)` charge encore 5 événements complets alors que la home ne s'en sert plus que pour tester `length === 0` dans le garde-fou de maintenance. Coût faible, la requête ne tourne qu'à la régénération ISR toutes les 2 h, mais c'est du poids mort. À remplacer par un comptage `head: true` au prochain passage sur `page.tsx`. Owner Claude, butoir 30/09/2026, sinon `ABANDONED`.
- [ ] **Relevé J+14 de l'instrumentation. Owner Kami, butoir 12/08/2026.**
  Vérifié en place le 29/07/2026 avant livraison : `promo_impression` avec
  `block: "service-rail"`, `source: "home"`, `service: <id>` part une fois par bloc
  au passage à 50 % dans le viewport (`ImpressionTracker`, un par carte, `props`
  mémoïsé pour ne pas relancer l'observer) ; `service_rail_click` avec
  `service: <id>` et `layout: "band" | "card"` part au clic avant la navigation.
  Les deux passent par le stub `window.plausible` posé dans `[locale]/layout.tsx`,
  donc rien ne tombe dans le vide avant le chargement du script.
  **Baseline à battre**, 30 jours avant bascule : **71 clics voiture, 0 clic van,
  0 clic activités**, 5,7 % de taux de clic du bloc commercial.
  À relever : taux de clic du rail entier, répartition par service (clics ÷
  impressions, pas les clics absolus), et part relative des clics home vers
  `/explore`, `/buses` et `/beaches`.
  **Garde-fou déjà décidé, pas à rediscuter le jour du relevé** : si ces trois
  destinations perdent plus de 15 % de part relative, le rail redescend sous
  « Où se baigner », sans aucun autre changement. Si le butoir passe sans relevé :
  marquer `ABANDONED` plutôt que laisser traîner.
- **Photo van** dédiée, owner Kami, butoir 15/08/2026. Le catalogue pointe `ferry.jpg` en attendant : un seul chemin à changer dans `home-services.ts`.
