# Taxi Partners Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Comparatif bus vs taxi + slot partenaire sponsorisé sur les 85 pages `/buses/[pair]` et le planificateur `/buses`, page `/partners` avec Stripe Payment Link, rapport Plausible mensuel automatique.

**Architecture:** Deux libs pures (`taxi-fare.ts` estimation au compteur réglementé, `taxi-partners.ts` zones + lookup data-driven sur `src/data/taxi-partners.json`), un composant `TaxiCompare` partagé server/client, une page `/partners`, un script VPS cron mensuel. Spec : `docs/superpowers/specs/2026-06-10-taxi-partners-design.md`.

**Tech Stack:** Next.js 16 App Router, TS pur testé par `scripts/check-*.mjs` (node type-stripping, `import type` only dans les libs), Python 3 stdlib sur VPS (urllib), Plausible CE Stats API v2, Resend, Stripe Payment Link (MCP).

**Conventions repo:** auteur git `kerjeanfrancois29`, stage SÉLECTIF (autre terminal actif : `explore/`, `Header.tsx`, `cb-places.ts` ≠ à nous), push master ET main seulement en fin de build (un deploy prod pages paires est en vérification). Jamais `dev` et `build` simultanés. Après chaque test Playwright : `Get-NetTCPConnection -LocalPort 3000 -State Listen | % { taskkill /PID $_.OwningProcess /F /T }`.

---

### Task 1: Lib pure `taxi-fare.ts` (estimation compteur) — TDD

**Files:**
- Create: `src/lib/taxi-fare.ts`
- Test: `scripts/check-taxi-fare.mjs`

- [ ] **Step 1: Écrire le test qui échoue**

`scripts/check-taxi-fare.mjs` :

```js
// Assertions du module taxi-fare. Run: node scripts/check-taxi-fare.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { taxiFareRange, SLUG_COORDS, TAXI_TARIFF } from "../src/lib/taxi-fare.ts";

// --- couverture : chaque slug de BUS_PLACE_SLUGS a des coordonnees -----------
const pairsSrc = readFileSync(new URL("../src/lib/bus-pairs.ts", import.meta.url), "utf8");
const slugSet = new Set([...pairsSrc.matchAll(/:\s*"([a-z0-9-]+)"/g)].map((m) => m[1]));
for (const slug of slugSet) {
  assert.ok(SLUG_COORDS[slug], `coords manquantes pour le slug "${slug}"`);
}

// --- symetrie + forme ---------------------------------------------------------
const ab = taxiFareRange("heraklion", "ierapetra");
const ba = taxiFareRange("ierapetra", "heraklion");
assert.deepEqual(ab, ba);
assert.ok(ab.low < ab.high);
assert.equal(ab.low % 5, 0);                       // arrondi aux 5 EUR
assert.equal(ab.high % 5, 0);
assert.ok(ab.km > 60 && ab.km < 120, `km Heraklion-Ierapetra: ${ab.km}`);

// --- slug inconnu -> null (jamais de prix invente) -----------------------------
assert.equal(taxiFareRange("heraklion", "atlantis"), null);

// --- plancher : course courte >= minFare ---------------------------------------
const short = taxiFareRange("malia", "stalida");
assert.ok(short.low >= TAXI_TARIFF.minFare);

// --- calibration : prix compteur reel (dist route x perKm + pickup) dans la
// fourchette, sur des distances routieres connues (Google/ViaMichelin 06/2026).
const ROAD_KM = [
  ["heraklion", "chania", 140],
  ["heraklion", "agios-nikolaos", 64],
  ["heraklion", "ierapetra", 100],
  ["heraklion", "sitia", 130],
  ["chania", "paleochora", 77],
  ["heraklion", "matala", 67],
  ["chania", "rethymno", 60],
];
for (const [a, b, roadKm] of ROAD_KM) {
  const r = taxiFareRange(a, b);
  const realMeter = roadKm * TAXI_TARIFF.perKm + TAXI_TARIFF.pickup;
  assert.ok(
    realMeter >= r.low && realMeter <= r.high,
    `${a}->${b}: compteur reel ${realMeter.toFixed(0)} hors fourchette [${r.low}, ${r.high}]`,
  );
}

console.log("OK check-taxi-fare:", slugSet.size, "slugs couverts");
```

- [ ] **Step 2: Vérifier qu'il échoue**

Run: `node scripts/check-taxi-fare.mjs`
Expected: FAIL `Cannot find module '../src/lib/taxi-fare.ts'`

- [ ] **Step 3: Implémenter `src/lib/taxi-fare.ts`**

```ts
// Estimation taxi au compteur (tarif reglemente grec hors agglomeration).
// Pur, zero I/O : importable client (JourneyPlanner), serveur (page paire)
// et node (scripts/check-taxi-fare.mjs).
// Spec : docs/superpowers/specs/2026-06-10-taxi-partners-design.md
//
// Methode : haversine entre coords des slugs x ROAD_FACTOR (routes cretoises
// sinueuses, calibre sur 7 distances routieres connues) x tarif 2 (~1,25 EUR/km
// 2026) + prise en charge. Fourchette volontairement large [x0.80, x1.25] :
// c'est une estimation indicative, jamais un prix annonce.

export const TAXI_TARIFF = {
  pickup: 1.8,      // prise en charge
  perKm: 1.25,      // tarif 2 (hors agglomeration), EUR/km
  minFare: 10,      // plancher affiche pour un trajet intercite
  roadFactor: 1.45, // route reelle / haversine, calibre (check-taxi-fare)
  low: 0.8,         // bornes de la fourchette autour de l'estimation
  high: 1.25,
} as const;

// Coordonnees par slug de BUS_PLACE_SLUGS (est : PLACE_COORDS du scraper
// prices.py ; ouest : curation OSM 10/06/2026).
export const SLUG_COORDS: Record<string, [number, number]> = {
  // Est (herlas)
  "heraklion": [35.3387, 25.1442],
  "agios-nikolaos": [35.1909, 25.7136],
  "ierapetra": [35.0114, 25.7411],
  "sitia": [35.2078, 26.1029],
  "malia": [35.2853, 25.4624],
  "hersonissos": [35.3186, 25.3928],
  "matala": [34.9959, 24.7492],
  "moires": [35.0511, 24.8728],
  "anogeia": [35.2899, 24.8826],
  "ano-viannos": [35.0461, 25.4067],
  "kokkini-hani": [35.3306, 25.2419],
  "elounda": [35.2576, 25.7204],
  "kritsa": [35.1601, 25.6471],
  "makry-gyalos": [35.0394, 25.9728],
  "myrtos": [35.0042, 25.5879],
  "mochos": [35.2864, 25.4427],
  "stalida": [35.2937, 25.4378],
  "sisi": [35.3092, 25.5237],
  "gouves": [35.3271, 25.3066],
  "tympaki": [35.0719, 24.7681],
  "agia-galini": [35.0967, 24.6906],
  "phaistos": [35.0514, 24.8136],
  "arkalochori": [35.1481, 25.2622],
  "kastelli-pediados": [35.2069, 25.3361],
  "archanes": [35.2381, 25.1611],
  "thrapsano": [35.2167, 25.2833],
  "myrtia": [35.2433, 25.2103],
  "zakros": [35.0989, 26.2186],
  "palekastro": [35.1986, 26.2486],
  "ziros": [35.0931, 26.1306],
  "mochlos": [35.1856, 25.9061],
  "kalo-chorio": [35.1497, 25.7956],
  "ferma": [35.0119, 25.8003],
  "mesochorio": [35.0394, 25.355],
  "demati": [35.0617, 25.3083],
  "krousonas": [35.2306, 24.9617],
  "kamares": [35.1392, 24.8294],
  "cretaquarium": [35.3325, 25.2792],
  "plaka": [35.2828, 25.7367],
  "kroustas": [35.1392, 25.6442],
  "avgeniki": [35.2106, 25.0806],
  // Ouest (ektel)
  "chania": [35.5138, 24.018],
  "rethymno": [35.3644, 24.4821],
  "chania-airport": [35.5317, 24.1497],
  "kissamos": [35.4944, 23.6558],
  "elafonissi": [35.2706, 23.54],
  "paleochora": [35.2261, 23.6786],
  "sougia": [35.2486, 23.8089],
  "chora-sfakion": [35.2008, 24.1364],
  "georgioupolis": [35.3617, 24.2581],
  "kavros": [35.3681, 24.2767],
  "bali": [35.4106, 24.7831],
  "plakias": [35.1894, 24.3992],
  "almyrida": [35.4569, 24.1614],
  "kalyves": [35.4628, 24.1283],
  "stavros": [35.5919, 24.0958],
  "panormo": [35.4144, 24.6906],
  "margarites": [35.3247, 24.6594],
  "theriso": [35.3486, 23.9931],
  "meskla": [35.3672, 23.9347],
  "vamos": [35.4072, 24.2003],
  "spili": [35.2128, 24.5364],
  "perama": [35.3681, 24.7],
  "anogeia-west": [35.2899, 24.8826],
  "voukolies": [35.4642, 23.7853],
  "sternes": [35.4789, 24.0731],
  "maleme": [35.5219, 23.8289],
  "arkadi": [35.31, 24.6289],
  "ano-meros": [35.2517, 24.6592],
};

export interface TaxiFareRange {
  low: number;  // EUR, arrondi aux 5
  high: number; // EUR, arrondi aux 5
  km: number;   // distance route estimee, arrondie
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const [lat1, lng1] = a.map((d) => (d * Math.PI) / 180);
  const [lat2, lng2] = b.map((d) => (d * Math.PI) / 180);
  const h =
    Math.sin((lat2 - lat1) / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng2 - lng1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const round5 = (n: number) => Math.round(n / 5) * 5;

export function taxiFareRange(slugA: string, slugB: string): TaxiFareRange | null {
  const ca = SLUG_COORDS[slugA];
  const cb = SLUG_COORDS[slugB];
  if (!ca || !cb || slugA === slugB) return null;
  const km = haversineKm(ca, cb) * TAXI_TARIFF.roadFactor;
  const meter = km * TAXI_TARIFF.perKm + TAXI_TARIFF.pickup;
  const low = Math.max(TAXI_TARIFF.minFare, round5(meter * TAXI_TARIFF.low));
  const high = Math.max(low + 5, round5(meter * TAXI_TARIFF.high));
  return { low, high, km: Math.round(km) };
}
```

- [ ] **Step 4: Vérifier que le test passe**

Run: `node scripts/check-taxi-fare.mjs`
Expected: `OK check-taxi-fare: NN slugs couverts`. Si une assertion de calibration échoue, ajuster `roadFactor` (1.40-1.50) ou les bornes low/high — PAS les distances de référence.

- [ ] **Step 5: tsc + commit**

Run: `npx tsc --noEmit` → 0 erreur.
```bash
git add src/lib/taxi-fare.ts scripts/check-taxi-fare.mjs
git commit -m "feat(taxi): pure metered-fare estimate lib (coords per bus slug, calibrated)"
```

---

### Task 2: Zones + partenaires (`taxi-partners.json` + lib) — TDD

**Files:**
- Create: `src/data/taxi-partners.json`
- Create: `src/lib/taxi-partners.ts`
- Test: `scripts/check-taxi-partners.mjs`

- [ ] **Step 1: Écrire le test qui échoue**

`scripts/check-taxi-partners.mjs` :

```js
// Assertions zones/partenaires. Run: node scripts/check-taxi-partners.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { zoneOfSlug, partnerForPair, activePartners, PARTNER_PRICE_EUR } from "../src/lib/taxi-partners.ts";

const data = JSON.parse(readFileSync(new URL("../src/data/taxi-partners.json", import.meta.url), "utf8"));

// --- schema -------------------------------------------------------------------
assert.ok(Array.isArray(data.zones) && data.zones.length >= 5);
for (const z of data.zones) {
  assert.match(z.id, /^[a-z0-9-]+$/);
  assert.ok(z.label && Array.isArray(z.placeSlugs) && z.placeSlugs.length > 0);
}
for (const p of data.partners) {
  assert.ok(data.zones.some((z) => z.id === p.zoneId), `zone inconnue ${p.zoneId}`);
  assert.ok(p.name && p.phone && p.reportEmail && p.since);
}

// --- chaque slug de BUS_PLACE_SLUGS a exactement une zone ----------------------
const pairsSrc = readFileSync(new URL("../src/lib/bus-pairs.ts", import.meta.url), "utf8");
const slugSet = new Set([...pairsSrc.matchAll(/:\s*"([a-z0-9-]+)"/g)].map((m) => m[1]));
for (const slug of slugSet) {
  const zones = data.zones.filter((z) => z.placeSlugs.includes(slug));
  assert.equal(zones.length, 1, `slug "${slug}" dans ${zones.length} zones`);
  assert.equal(zoneOfSlug(data, slug)?.id, zones[0].id);
}

// --- lookup partenaire : priorite zone de A, deterministe ----------------------
const fx = {
  zones: [
    { id: "za", label: "A", placeSlugs: ["aa"] },
    { id: "zb", label: "B", placeSlugs: ["bb"] },
  ],
  partners: [
    { zoneId: "zb", name: "Taxi B", phone: "+30 123", reportEmail: "b@x.gr", since: "2026-07-01" },
  ],
};
assert.equal(partnerForPair(fx, "aa", "bb").name, "Taxi B"); // zone A sans partenaire -> B
fx.partners.push({ zoneId: "za", name: "Taxi A", phone: "+30 456", reportEmail: "a@x.gr", since: "2026-07-01" });
assert.equal(partnerForPair(fx, "aa", "bb").name, "Taxi A"); // A prioritaire
assert.equal(partnerForPair(fx, "zz", "yy"), null);

// --- etat de lancement : zero partenaire, prix defini ---------------------------
assert.equal(activePartners(data).length, 0);
assert.equal(typeof PARTNER_PRICE_EUR, "number");

console.log("OK check-taxi-partners:", data.zones.length, "zones,", slugSet.size, "slugs");
```

- [ ] **Step 2: Vérifier qu'il échoue**

Run: `node scripts/check-taxi-partners.mjs`
Expected: FAIL `Cannot find module '../src/lib/taxi-partners.ts'`

- [ ] **Step 3: Créer `src/data/taxi-partners.json`**

```json
{
  "zones": [
    {
      "id": "heraklion",
      "label": "Heraklion & the south",
      "placeSlugs": ["heraklion", "malia", "hersonissos", "stalida", "mochos", "sisi", "gouves", "kokkini-hani", "cretaquarium", "archanes", "myrtia", "thrapsano", "kastelli-pediados", "arkalochori", "krousonas", "avgeniki", "anogeia", "moires", "tympaki", "phaistos", "matala", "agia-galini", "kamares", "ano-viannos", "mesochorio", "demati"]
    },
    {
      "id": "lasithi-north",
      "label": "Agios Nikolaos – Elounda",
      "placeSlugs": ["agios-nikolaos", "elounda", "plaka", "kritsa", "kroustas", "kalo-chorio", "mochlos"]
    },
    {
      "id": "ierapetra-southeast",
      "label": "Ierapetra – Makrigialos",
      "placeSlugs": ["ierapetra", "myrtos", "ferma", "makry-gyalos"]
    },
    {
      "id": "sitia",
      "label": "Sitia & the far east",
      "placeSlugs": ["sitia", "palekastro", "zakros", "ziros"]
    },
    {
      "id": "chania",
      "label": "Chania & the northwest",
      "placeSlugs": ["chania", "chania-airport", "kissamos", "theriso", "meskla", "vamos", "voukolies", "sternes", "maleme", "stavros", "kalyves", "almyrida", "georgioupolis", "kavros"]
    },
    {
      "id": "chania-south",
      "label": "Southwest coast (Paleochora – Sfakia)",
      "placeSlugs": ["elafonissi", "paleochora", "sougia", "chora-sfakion"]
    },
    {
      "id": "rethymno",
      "label": "Rethymno",
      "placeSlugs": ["rethymno", "bali", "panormo", "margarites", "perama", "arkadi", "spili", "plakias", "ano-meros", "anogeia-west"]
    }
  ],
  "partners": []
}
```

- [ ] **Step 4: Créer `src/lib/taxi-partners.ts`**

```ts
// Zones taxi exclusives + lookup partenaire. Pur : les fonctions prennent les
// donnees en parametre (le JSON n'est importe qu'aux points d'usage Next ;
// les scripts check-*.mjs le lisent via fs — node type-stripping n'accepte
// pas les imports JSON sans attribute).
// Spec : docs/superpowers/specs/2026-06-10-taxi-partners-design.md

export const PARTNER_PRICE_EUR = 49; // hypothese 10/06/2026, a trancher par Kami

export interface TaxiZone {
  id: string;
  label: string;
  placeSlugs: string[];
}

export interface TaxiPartner {
  zoneId: string;
  name: string;
  phone: string;       // affiche + href tel:
  website?: string;
  reportEmail: string; // destinataire du rapport Plausible mensuel
  since: string;       // ISO date de debut
}

export interface TaxiPartnersData {
  zones: TaxiZone[];
  partners: TaxiPartner[];
}

export function zoneOfSlug(data: TaxiPartnersData, slug: string): TaxiZone | null {
  return data.zones.find((z) => z.placeSlugs.includes(slug)) ?? null;
}

/** Partenaire du slot pour une paire : zone de A prioritaire, sinon zone de B. */
export function partnerForPair(
  data: TaxiPartnersData,
  slugA: string,
  slugB: string,
): (TaxiPartner & { zone: TaxiZone }) | null {
  for (const slug of [slugA, slugB]) {
    const zone = zoneOfSlug(data, slug);
    if (!zone) continue;
    const partner = data.partners.find((p) => p.zoneId === zone.id);
    if (partner) return { ...partner, zone };
  }
  return null;
}

export function activePartners(data: TaxiPartnersData): TaxiPartner[] {
  return data.partners;
}
```

- [ ] **Step 5: Vérifier que le test passe + tsc**

Run: `node scripts/check-taxi-partners.mjs` → `OK check-taxi-partners: 7 zones, NN slugs`
Run: `npx tsc --noEmit` → 0 erreur.

- [ ] **Step 6: Commit**

```bash
git add src/data/taxi-partners.json src/lib/taxi-partners.ts scripts/check-taxi-partners.mjs
git commit -m "feat(taxi): exclusive zones + partner lookup (data-driven, zero partners at launch)"
```

---

### Task 3: Composants `TaxiCompare` + `TaxiCallButton`

**Files:**
- Create: `src/components/TaxiCompare.tsx`
- Create: `src/components/TaxiCallButton.tsx`

- [ ] **Step 1: Créer `src/components/TaxiCallButton.tsx`** (client, event Plausible)

```tsx
"use client";

import { Phone } from "lucide-react";

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Record<string, string> }) => void;
  }
}

export function TaxiCallButton({ phone, zone, pair, partner }: {
  phone: string; zone: string; pair: string; partner: string;
}) {
  return (
    <a
      href={`tel:${phone.replace(/\s+/g, "")}`}
      onClick={() => window.plausible?.("Taxi Call", { props: { zone, pair, partner } })}
      className="inline-flex items-center gap-2 rounded-lg bg-aegean text-white text-sm font-semibold px-4 py-2 hover:opacity-90"
    >
      <Phone className="w-4 h-4" /> {phone}
    </a>
  );
}
```

- [ ] **Step 2: Créer `src/components/TaxiCompare.tsx`** (non-async, importable server ET client)

```tsx
// Bloc comparatif bus vs taxi + slot partenaire sponsorise.
// Non-async, zero I/O : utilise sur les pages paires (server) et dans le
// planificateur (client). Les donnees partenaires arrivent en props (JSON
// importe aux points d'usage).
import { CarTaxiFront, ExternalLink } from "lucide-react";
import Link from "next/link";
import { taxiFareRange } from "@/lib/taxi-fare";
import { partnerForPair, type TaxiPartnersData } from "@/lib/taxi-partners";
import type { Locale } from "@/lib/types";
import { TaxiCallButton } from "./TaxiCallButton";

const T = {
  title: { en: "By taxi", fr: "En taxi", de: "Mit dem Taxi", el: "Με ταξί" },
  estimate: {
    en: (lo: number, hi: number, km: number) => `${lo}–${hi} € · ~${km} km`,
    fr: (lo: number, hi: number, km: number) => `${lo}–${hi} € · ~${km} km`,
    de: (lo: number, hi: number, km: number) => `${lo}–${hi} € · ~${km} km`,
    el: (lo: number, hi: number, km: number) => `${lo}–${hi} € · ~${km} km`,
  },
  method: {
    en: "Estimate at the official meter rate. Agree the fare before departure.",
    fr: "Estimation au compteur, tarif officiel. Convenez du prix avant le départ.",
    de: "Schätzung zum offiziellen Taxameter-Tarif. Preis vor Abfahrt vereinbaren.",
    el: "Εκτίμηση με το επίσημο ταξίμετρο. Συμφωνήστε την τιμή πριν την αναχώρηση.",
  },
  vsBus: {
    en: (p: string) => `Bus from ${p}`,
    fr: (p: string) => `Bus à partir de ${p}`,
    de: (p: string) => `Bus ab ${p}`,
    el: (p: string) => `Λεωφορείο από ${p}`,
  },
  sponsored: { en: "Sponsored", fr: "Sponsorisé", de: "Gesponsert", el: "Χορηγία" },
  inbound: {
    en: "Run a taxi in this area? Get this spot →",
    fr: "Vous exploitez un taxi dans la région ? Réservez cet emplacement →",
    de: "Sie fahren Taxi in dieser Region? Diesen Platz sichern →",
    el: "Έχετε ταξί στην περιοχή; Αποκτήστε αυτή τη θέση →",
  },
} as const;

export function TaxiCompare({ locale, slugA, slugB, pairSlug, busPriceEur, partnersData, compact }: {
  locale: Locale;
  slugA: string;
  slugB: string;
  pairSlug: string;
  busPriceEur: number | null;
  partnersData: TaxiPartnersData;
  compact?: boolean;
}) {
  const fare = taxiFareRange(slugA, slugB);
  if (!fare) return null;
  const partner = partnerForPair(partnersData, slugA, slugB);

  return (
    <section className={`rounded-xl border border-border bg-white ${compact ? "p-4 mt-4" : "p-5 mb-8"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
        <h2 className="text-base font-semibold text-text flex items-center gap-2 m-0">
          <CarTaxiFront className="w-5 h-5 text-aegean" /> {T.title[locale]} :{" "}
          {T.estimate[locale](fare.low, fare.high, fare.km)}
        </h2>
        {busPriceEur != null && (
          <span className="text-sm text-text-muted">
            {T.vsBus[locale](`${busPriceEur.toFixed(2)} €`)}
          </span>
        )}
      </div>
      <p className="text-xs text-text-muted mb-0">{T.method[locale]}</p>

      {partner ? (
        <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-3">
          <span className="text-[10px] uppercase tracking-wider font-semibold bg-amber-100 text-amber-800 border border-amber-200 rounded px-1.5 py-0.5">
            {T.sponsored[locale]}
          </span>
          <span className="text-sm font-semibold text-text">{partner.name}</span>
          <TaxiCallButton phone={partner.phone} zone={partner.zone.id} pair={pairSlug} partner={partner.name} />
          {partner.website && (
            <a href={partner.website} target="_blank" rel="nofollow noopener sponsored"
               className="text-sm text-aegean hover:underline inline-flex items-center gap-1">
              <ExternalLink className="w-3.5 h-3.5" /> {new URL(partner.website).hostname}
            </a>
          )}
        </div>
      ) : (
        <p className="mt-3 pt-3 border-t border-border mb-0">
          <Link href={`/${locale}/partners`} className="text-xs text-text-muted hover:text-aegean hover:underline">
            {T.inbound[locale]}
          </Link>
        </p>
      )}
    </section>
  );
}
```

Note : `rel="sponsored"` sur le lien site partenaire = exigence Google pour les liens payés.

- [ ] **Step 3: tsc + commit**

Run: `npx tsc --noEmit` → 0 erreur.
```bash
git add src/components/TaxiCompare.tsx src/components/TaxiCallButton.tsx
git commit -m "feat(taxi): TaxiCompare block + tel: click tracking (Plausible Taxi Call event)"
```

---

### Task 4: Intégration pages paires (bloc + FAQ AEO)

**Files:**
- Modify: `src/app/[locale]/buses/[pair]/page.tsx`

- [ ] **Step 1: Brancher le bloc et la FAQ taxi**

Dans `src/app/[locale]/buses/[pair]/page.tsx` :

1. Imports en tête :
```ts
import { TaxiCompare } from "@/components/TaxiCompare";
import { taxiFareRange } from "@/lib/taxi-fare";
import partnersData from "@/data/taxi-partners.json";
```
(L'import JSON statique est supporté par Next ; les libs restent pures.)

2. Ajouter au bloc `T` (après `faqFirstLast`) :
```ts
  faqTaxi: {
    en: (a: string, b: string, lo: number, hi: number, bus: string | null) => [
      `How much is a taxi from ${a} to ${b}?`,
      `A taxi from ${a} to ${b} costs around ${lo}–${hi} € at the official meter rate${bus ? `; the KTEL bus costs ${bus}` : ""}. Agree the fare before departure.`,
    ],
    fr: (a: string, b: string, lo: number, hi: number, bus: string | null) => [
      `Combien coûte un taxi de ${a} à ${b} ?`,
      `Un taxi de ${a} à ${b} coûte environ ${lo}–${hi} € au compteur officiel${bus ? ` ; le bus KTEL coûte ${bus}` : ""}. Convenez du prix avant le départ.`,
    ],
    de: (a: string, b: string, lo: number, hi: number, bus: string | null) => [
      `Was kostet ein Taxi von ${a} nach ${b}?`,
      `Ein Taxi von ${a} nach ${b} kostet etwa ${lo}–${hi} € zum offiziellen Taxameter-Tarif${bus ? `; der KTEL-Bus kostet ${bus}` : ""}. Preis vor Abfahrt vereinbaren.`,
    ],
    el: (a: string, b: string, lo: number, hi: number, bus: string | null) => [
      `Πόσο κοστίζει το ταξί από ${a} προς ${b};`,
      `Το ταξί από ${a} προς ${b} κοστίζει περίπου ${lo}–${hi} € με το επίσημο ταξίμετρο${bus ? `· το ΚΤΕΛ κοστίζει ${bus}` : ""}. Συμφωνήστε την τιμή πριν την αναχώρηση.`,
    ],
  },
```

3. Dans `BusPairPage`, après la construction du tableau `faq` existant (après le bloc `if (deps.length > 1)`), ajouter :
```ts
  const sa = slugifyPlace(placeA)!;
  const sb = slugifyPlace(placeB)!;
  const taxiFare = taxiFareRange(sa, sb);
  if (taxiFare) {
    const busP = ref?.price_eur != null ? `${ref.price_eur.toFixed(2)} €` : null;
    faq.push(T.faqTaxi[ui](placeA, placeB, taxiFare.low, taxiFare.high, busP) as [string, string]);
  }
```

4. Dans le JSX, entre `<DirectionSection from={placeB} ... />` et la section `onwardB`, insérer :
```tsx
        {taxiFare && (
          <TaxiCompare
            locale={ui}
            slugA={sa}
            slugB={sb}
            pairSlug={pair}
            busPriceEur={ref?.price_eur ?? null}
            partnersData={partnersData}
            compact={false}
          />
        )}
```

- [ ] **Step 2: Vérifier**

Run: `npx tsc --noEmit` → 0 erreur.
Run: `node scripts/check-bus-pairs.mjs` → toujours OK (module non touché, sanity).

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/buses/[pair]/page.tsx"
git commit -m "feat(taxi): bus-vs-taxi block + taxi FAQ (AEO) on the 85 pair pages"
```

---

### Task 5: Intégration planificateur `/buses`

**Files:**
- Modify: `src/app/[locale]/buses/JourneyPlanner.tsx`

- [ ] **Step 1: Bloc compact sous les résultats**

Dans `JourneyPlanner.tsx` :

1. Imports :
```ts
import { TaxiCompare } from "@/components/TaxiCompare";
import { slugifyPlace, pairSlug } from "@/lib/bus-pairs";
import partnersData from "@/data/taxi-partners.json";
```

2. Dans le corps du composant `JourneyPlanner`, après le calcul `journeys` :
```ts
  const taxiSlugA = fromPlace ? slugifyPlace(fromPlace) : null;
  const taxiSlugB = toPlace ? slugifyPlace(toPlace) : null;
  const taxiPair = fromPlace && toPlace ? pairSlug(fromPlace, toPlace) : null;
```

3. Dans le JSX, juste après la liste des résultats `journeys` (et aussi visible quand `noJourney`, le taxi est alors l'alternative), ajouter en fin du bloc résultats :
```tsx
      {taxiSlugA && taxiSlugB && taxiPair && (
        <TaxiCompare
          locale={locale}
          slugA={taxiSlugA}
          slugB={taxiSlugB}
          pairSlug={taxiPair}
          busPriceEur={journeys[0]?.priceTotal ?? null}
          partnersData={partnersData}
          compact
        />
      )}
```
Placement exact : à l'intérieur du conteneur des résultats, après le `.map` des `JourneyCard` et après les messages no-service/no-route (lire le JSX réel à l'exécution et poser le bloc au niveau frère des cartes).

- [ ] **Step 2: Vérifier**

Run: `npx tsc --noEmit` → 0 erreur.
Run: `node scripts/check-bus-journey.mjs` → toujours OK.

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/buses/JourneyPlanner.tsx"
git commit -m "feat(taxi): compact taxi compare under journey planner results"
```

---

### Task 6: Page `/partners`

**Files:**
- Create: `src/app/[locale]/partners/page.tsx`
- Modify: `src/app/sitemap.xml/route.ts` (ajouter `/partners`)

- [ ] **Step 1: Créer la page**

`src/app/[locale]/partners/page.tsx` — server component, 4 langues inline (pattern page paire), fallback EN, `revalidate = 86400` :

```tsx
import { setRequestLocale } from "next-intl/server";
import { CheckCircle2, BarChart3, Tag, MailOpen } from "lucide-react";
import { buildAlternates } from "@/lib/seo";
import { PARTNER_PRICE_EUR, type TaxiPartnersData } from "@/lib/taxi-partners";
import partnersData from "@/data/taxi-partners.json";
import type { Locale } from "@/lib/types";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";
const SUPPORTED: Locale[] = ["en", "fr", "de", "el"];
const STRIPE_URL = process.env.NEXT_PUBLIC_PARTNERS_STRIPE_URL || "";
const CONTACT = "contact@kairosguest.com";

function pickUiLoc(l: string): Locale {
  return (SUPPORTED as string[]).includes(l) ? (l as Locale) : "en";
}

const T = {
  title: {
    en: "Taxi partners — your company on the busiest bus pages in Crete",
    fr: "Partenaires taxi — votre compagnie sur les pages bus les plus consultées de Crète",
    de: "Taxi-Partner — Ihr Unternehmen auf den meistbesuchten Busseiten Kretas",
    el: "Συνεργάτες ταξί — η εταιρεία σας στις πιο δημοφιλείς σελίδες λεωφορείων της Κρήτης",
  },
  metaDesc: {
    en: "One exclusive taxi partner per zone on crete.direct bus pages. Clearly labelled, monthly traffic report, cancel anytime.",
    fr: "Un partenaire taxi exclusif par zone sur les pages bus de crete.direct. Étiqueté sponsorisé, rapport mensuel, résiliable à tout moment.",
    de: "Ein exklusiver Taxi-Partner pro Zone auf den Busseiten von crete.direct. Klar gekennzeichnet, monatlicher Bericht, jederzeit kündbar.",
    el: "Ένας αποκλειστικός συνεργάτης ταξί ανά ζώνη στις σελίδες λεωφορείων του crete.direct. Με σήμανση, μηνιαία αναφορά, ακύρωση οποτεδήποτε.",
  },
  pitch: {
    en: "Around 3 out of 4 visits to crete.direct land on our live KTEL bus pages, in 7+ languages. Travellers compare the bus with a taxi right there. One taxi company per zone gets that spot — clearly labelled as sponsored.",
    fr: "Environ 3 visites sur 4 de crete.direct arrivent sur nos pages bus KTEL en direct, en 7+ langues. Les voyageurs y comparent le bus et le taxi. Une seule compagnie de taxi par zone obtient cet emplacement — clairement étiqueté sponsorisé.",
    de: "Rund 3 von 4 Besuchen auf crete.direct landen auf unseren Live-KTEL-Busseiten in 7+ Sprachen. Reisende vergleichen dort Bus und Taxi. Ein Taxiunternehmen pro Zone erhält diesen Platz — klar als gesponsert gekennzeichnet.",
    el: "Περίπου 3 στις 4 επισκέψεις στο crete.direct καταλήγουν στις σελίδες λεωφορείων ΚΤΕΛ, σε 7+ γλώσσες. Οι ταξιδιώτες συγκρίνουν εκεί λεωφορείο και ταξί. Μία εταιρεία ταξί ανά ζώνη παίρνει αυτή τη θέση — με σαφή σήμανση χορηγίας.",
  },
  includes: {
    en: ["Exclusive: one partner per zone", "Your name + phone on every bus page of your zone", "Monthly Plausible report: calls and page views", "No meeting, no contract — email and Stripe, cancel anytime"],
    fr: ["Exclusif : un partenaire par zone", "Votre nom + téléphone sur chaque page bus de votre zone", "Rapport Plausible mensuel : appels et pages vues", "Sans rendez-vous, sans engagement — email et Stripe, résiliable à tout moment"],
    de: ["Exklusiv: ein Partner pro Zone", "Ihr Name + Telefon auf jeder Busseite Ihrer Zone", "Monatlicher Plausible-Bericht: Anrufe und Seitenaufrufe", "Kein Termin, kein Vertrag — E-Mail und Stripe, jederzeit kündbar"],
    el: ["Αποκλειστικότητα: ένας συνεργάτης ανά ζώνη", "Όνομα + τηλέφωνο σε κάθε σελίδα λεωφορείων της ζώνης σας", "Μηνιαία αναφορά Plausible: κλήσεις και προβολές", "Χωρίς ραντεβού, χωρίς δέσμευση — email και Stripe, ακύρωση οποτεδήποτε"],
  },
  price: {
    en: (p: number) => `${p} €/month per zone`,
    fr: (p: number) => `${p} €/mois par zone`,
    de: (p: number) => `${p} €/Monat pro Zone`,
    el: (p: number) => `${p} €/μήνα ανά ζώνη`,
  },
  zones: { en: "Zones", fr: "Zones", de: "Zonen", el: "Ζώνες" },
  available: { en: "Available", fr: "Disponible", de: "Verfügbar", el: "Διαθέσιμη" },
  taken: { en: "Taken", fr: "Prise", de: "Vergeben", el: "Κατειλημμένη" },
  cta: { en: "Become the partner of your zone", fr: "Devenez le partenaire de votre zone", de: "Werden Sie Partner Ihrer Zone", el: "Γίνετε ο συνεργάτης της ζώνης σας" },
  ctaEmail: {
    en: "Questions? Write to us:", fr: "Des questions ? Écrivez-nous :",
    de: "Fragen? Schreiben Sie uns:", el: "Ερωτήσεις; Γράψτε μας:",
  },
  howTitle: { en: "How it works", fr: "Comment ça marche", de: "So funktioniert es", el: "Πώς λειτουργεί" },
  how: {
    en: ["Pay via Stripe and name your zone — first come, first served (we refund if the zone is taken).", "We add your company to every bus page of the zone within 48 h.", "Every month you receive the Plausible numbers: taxi-block calls and page views. Honest data, nothing else."],
    fr: ["Payez via Stripe en indiquant votre zone — premier arrivé, premier servi (remboursement si la zone est prise).", "Nous ajoutons votre compagnie sur chaque page bus de la zone sous 48 h.", "Chaque mois vous recevez les chiffres Plausible : appels du bloc taxi et pages vues. Des données honnêtes, rien d'autre."],
    de: ["Per Stripe zahlen und Ihre Zone angeben — wer zuerst kommt (Erstattung, falls vergeben).", "Wir fügen Ihr Unternehmen innerhalb von 48 h auf jeder Busseite der Zone hinzu.", "Jeden Monat erhalten Sie die Plausible-Zahlen: Anrufe und Seitenaufrufe. Ehrliche Daten, sonst nichts."],
    el: ["Πληρώστε μέσω Stripe δηλώνοντας τη ζώνη σας — σειρά προτεραιότητας (επιστροφή αν είναι κατειλημμένη).", "Προσθέτουμε την εταιρεία σας σε κάθε σελίδα λεωφορείων της ζώνης εντός 48 ωρών.", "Κάθε μήνα λαμβάνετε τα νούμερα του Plausible: κλήσεις και προβολές. Τίμια δεδομένα, τίποτα άλλο."],
  },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ui = pickUiLoc(locale);
  return {
    title: `${T.title[ui]} | Crete Direct`,
    description: T.metaDesc[ui],
    alternates: buildAlternates(locale, "/partners"),
    openGraph: { title: T.title[ui], description: T.metaDesc[ui], url: `${BASE_URL}/${locale}/partners`, type: "website" },
  };
}

export default async function PartnersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ui = pickUiLoc(locale);
  const data = partnersData as TaxiPartnersData;
  const takenZones = new Set(data.partners.map((p) => p.zoneId));

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-aegean mb-4">{T.title[ui]}</h1>
        <p className="text-text mb-8">{T.pitch[ui]}</p>

        <ul className="space-y-2 mb-8 list-none p-0">
          {T.includes[ui].map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-text">
              <CheckCircle2 className="w-4 h-4 text-aegean shrink-0 mt-0.5" /> {item}
            </li>
          ))}
        </ul>

        <div className="rounded-xl border border-aegean/30 bg-white p-5 mb-8">
          <p className="text-2xl font-bold text-aegean mb-3">{T.price[ui](PARTNER_PRICE_EUR)}</p>
          {STRIPE_URL ? (
            <a href={STRIPE_URL} target="_blank" rel="noopener"
               className="inline-flex items-center gap-2 rounded-lg bg-aegean text-white font-semibold px-5 py-2.5 hover:opacity-90">
              <Tag className="w-4 h-4" /> {T.cta[ui]}
            </a>
          ) : null}
          <p className="text-sm text-text-muted mt-3 mb-0 flex items-center gap-1.5">
            <MailOpen className="w-4 h-4" /> {T.ctaEmail[ui]}{" "}
            <a href={`mailto:${CONTACT}`} className="text-aegean hover:underline">{CONTACT}</a>
          </p>
        </div>

        <h2 className="text-xl font-semibold text-text mb-3">{T.zones[ui]}</h2>
        <div className="grid sm:grid-cols-2 gap-3 mb-10">
          {data.zones.map((z) => (
            <div key={z.id} className="rounded-xl border border-border bg-white p-4 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-text">{z.label}</span>
              {takenZones.has(z.id) ? (
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">{T.taken[ui]}</span>
              ) : (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5">{T.available[ui]}</span>
              )}
            </div>
          ))}
        </div>

        <h2 className="text-xl font-semibold text-text mb-3 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-aegean" /> {T.howTitle[ui]}
        </h2>
        <ol className="space-y-2 mb-4 pl-5">
          {T.how[ui].map((item, i) => (
            <li key={i} className="text-sm text-text">{item}</li>
          ))}
        </ol>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Sitemap**

Dans `src/app/sitemap.xml/route.ts`, localiser l'endroit où les pages statiques par locale sont émises (pattern existant pour `/buses`) et ajouter `/partners` (changefreq monthly, priority 0.5) pour les locales. Lire le fichier à l'exécution et suivre le pattern exact.

- [ ] **Step 3: Vérifier + commit**

Run: `npx tsc --noEmit` → 0 erreur.
```bash
git add "src/app/[locale]/partners/page.tsx" src/app/sitemap.xml/route.ts
git commit -m "feat(taxi): /partners page (zone grid, Stripe CTA, honest pitch) + sitemap"
```

---

### Task 7: Stripe Payment Link (MCP)

**Files:**
- Modify: `.env.local` (NEXT_PUBLIC_PARTNERS_STRIPE_URL)
- Vercel env production/preview

- [ ] **Step 1: Créer le produit + prix + Payment Link via MCP Stripe**

Via ToolSearch charger `mcp__stripe__create_product`, `mcp__stripe__create_price`, `mcp__stripe__create_payment_link` :
1. Product : name `Crete Direct — Taxi partner slot (exclusive zone)`, description `Sponsored taxi spot on crete.direct bus pages for one exclusive zone. Monthly Plausible report. Cancel anytime.`
2. Price : 4900 (centimes), `eur`, recurring monthly.
3. Payment Link sur ce price, quantity 1. Si l'outil MCP n'expose pas les custom fields, créer le link puis noter dans le runbook que la zone est demandée par email de confirmation (le paiement Stripe contient l'email du payeur ; Kami confirme la zone par retour d'email — zéro friction supplémentaire).

- [ ] **Step 2: Poser l'URL**

- `.env.local` : `NEXT_PUBLIC_PARTNERS_STRIPE_URL=https://buy.stripe.com/...`
- Vercel : `npx vercel env add NEXT_PUBLIC_PARTNERS_STRIPE_URL production` (et `preview`) avec la même valeur.

- [ ] **Step 3: Vérifier**

`npx vercel env ls` montre la variable. Pas de commit (env only). Si MCP Stripe indisponible : laisser vide (la page affiche le mailto seul, dégradation propre) + tâche Kami documentée en mémoire avec butoir 17/06/2026.

---

### Task 8: Rapport mensuel `vps/partner_report.py`

**Files:**
- Create: `vps/partner_report.py`
- VPS : `/opt/cretepulse/partner_report.py`, `/opt/cretepulse/taxi-partners.json`, crontab, `/opt/cretepulse/.env` (PLAUSIBLE_API_KEY, RESEND_API_KEY)

- [ ] **Step 1: Écrire le script**

```python
#!/usr/bin/env python3
"""Rapport Plausible mensuel aux partenaires taxi (cron 1er du mois).

Lit /opt/cretepulse/taxi-partners.json (copie de src/data/taxi-partners.json,
deployee avec ce script). Zero partenaire -> exit 0 silencieux.
Par partenaire : Stats API v2 Plausible self-hosted -> events "Taxi Call"
(props.zone) + pageviews des pages /buses contenant un slug de la zone,
sur le mois civil precedent. Email via Resend (from = hello@crete.direct,
domaine deja verifie pour la newsletter). --dry-run imprime sans envoyer.

Env requis (charge depuis /opt/cretepulse/.env) :
  PLAUSIBLE_API_KEY (Stats API key, admin analytics.crete.direct)
  RESEND_API_KEY
"""
import json
import os
import sys
import urllib.request
from datetime import date, timedelta
from pathlib import Path

BASE = Path(__file__).resolve().parent
PLAUSIBLE_URL = "https://analytics.crete.direct/api/v2/query"
RESEND_URL = "https://api.resend.com/emails"
SITE_ID = "crete.direct"
FROM_EMAIL = "Crete Direct <hello@crete.direct>"
COPY_TO = "contact@kairosguest.com"


def load_env() -> None:
    env_file = BASE / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text().splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


def prev_month_range(today: date) -> tuple[str, str]:
    first_this = today.replace(day=1)
    last_prev = first_this - timedelta(days=1)
    return last_prev.replace(day=1).isoformat(), last_prev.isoformat()


def plausible_query(payload: dict) -> dict:
    req = urllib.request.Request(
        PLAUSIBLE_URL,
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {os.environ['PLAUSIBLE_API_KEY']}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def zone_stats(zone_id: str, place_slugs: list[str], date_range: list[str]) -> dict:
    calls = plausible_query({
        "site_id": SITE_ID,
        "metrics": ["visitors", "events"],
        "date_range": date_range,
        "filters": [
            ["is", "event:name", ["Taxi Call"]],
            ["is", "event:props:zone", [zone_id]],
        ],
    })
    pageviews = plausible_query({
        "site_id": SITE_ID,
        "metrics": ["visitors", "pageviews"],
        "date_range": date_range,
        "filters": [
            ["contains", "event:page", ["/buses/"]],
            ["contains", "event:page", place_slugs],
        ],
    })
    c = (calls.get("results") or [{}])[0].get("metrics", [0, 0])
    p = (pageviews.get("results") or [{}])[0].get("metrics", [0, 0])
    return {"call_visitors": c[0], "call_events": c[1],
            "page_visitors": p[0], "pageviews": p[1]}


def build_email(partner: dict, zone: dict, stats: dict, period: list[str]) -> dict:
    month = period[0][:7]
    text = f"""Hello {partner['name']},

Your sponsored taxi spot on crete.direct — {zone['label']} — for {month}:

  Calls from the taxi block (tel: taps): {stats['call_events']} ({stats['call_visitors']} unique visitors)
  Bus pages of your zone: {stats['pageviews']} page views ({stats['page_visitors']} unique visitors)

Numbers come straight from our self-hosted Plausible analytics. No estimates,
no inflation — what you see is what happened.

Questions or cancellation: just reply to this email.

Crete Direct
"""
    return {
        "from": FROM_EMAIL,
        "to": [partner["reportEmail"]],
        "cc": [COPY_TO],
        "subject": f"Your crete.direct taxi report — {zone['label']} — {month}",
        "text": text,
    }


def send_email(payload: dict) -> None:
    req = urllib.request.Request(
        RESEND_URL,
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {os.environ['RESEND_API_KEY']}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        resp.read()


def main() -> int:
    dry = "--dry-run" in sys.argv
    load_env()
    data = json.loads((BASE / "taxi-partners.json").read_text())
    if not data["partners"]:
        return 0
    period = list(prev_month_range(date.today()))
    zones = {z["id"]: z for z in data["zones"]}
    failures = []
    for partner in data["partners"]:
        zone = zones[partner["zoneId"]]
        try:
            stats = zone_stats(zone["id"], zone["placeSlugs"], period)
            email = build_email(partner, zone, stats, period)
            if dry:
                print(json.dumps(email, indent=2))
            else:
                send_email(email)
        except Exception as exc:  # un partenaire en echec ne bloque pas les autres
            failures.append(f"{partner['name']}: {exc}")
    if failures:
        alert = {
            "from": FROM_EMAIL, "to": [COPY_TO],
            "subject": "partner_report.py: failures",
            "text": "\n".join(failures),
        }
        if dry:
            print(json.dumps(alert, indent=2))
        else:
            send_email(alert)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Dry-run local avec partenaire fictif**

En local (PowerShell, depuis `cretepulse-build`) : copier temporairement `src/data/taxi-partners.json` vers `vps/taxi-partners.json`, y injecter un partenaire fictif `{"zoneId": "ierapetra-southeast", "name": "Test Taxi", "phone": "+30 000", "reportEmail": "test@example.com", "since": "2026-06-10"}`, puis :
Run: `py -3 vps/partner_report.py --dry-run`
Expected : JSON de l'email imprimé (les requêtes Plausible partent réellement → nécessite PLAUSIBLE_API_KEY dans `vps/.env` local OU échec attrapé → email d'alerte imprimé : les deux prouvent le flux). Retirer le partenaire fictif et le fichier temporaire après test.

- [ ] **Step 3: Clé API Plausible**

Sur le VPS (`ssh root@89.167.115.63`) : tenter la génération par console Elixir (pattern Phase 6, création admin par rpc) :
```
cd /opt/plausible && docker compose exec plausible /app/bin/plausible rpc '
user = Plausible.Repo.get_by!(Plausible.Auth.User, email: "kairos.guest.management@gmail.com")
{:ok, key} = Plausible.Auth.create_api_key(user, "partner-report", Ecto.UUID.generate() |> Base.encode64())
IO.puts(key.key)
'
```
Si l'API interne diffère (vérifier le module réel : `grep -r "create_api_key" /` dans le conteneur ou consulter le code Plausible CE v3.2.1), adapter ; en dernier recours, tâche Kami : Settings → API Keys dans l'UI admin (10 min, butoir 17/06/2026).
Poser la clé dans `/opt/cretepulse/.env` : `PLAUSIBLE_API_KEY=...`

- [ ] **Step 4: RESEND_API_KEY sur le VPS**

En local : `npx vercel env pull .env.vercel-prod --environment=production`, extraire RESEND_API_KEY, l'ajouter à `/opt/cretepulse/.env` sur le VPS, supprimer `.env.vercel-prod` localement. Ne JAMAIS logger la valeur.

- [ ] **Step 5: Déployer + cron**

```
scp vps/partner_report.py root@89.167.115.63:/opt/cretepulse/
scp src/data/taxi-partners.json root@89.167.115.63:/opt/cretepulse/taxi-partners.json
ssh root@89.167.115.63 "cd /opt/cretepulse && python3 partner_report.py --dry-run && echo EXIT=\$?"
```
Expected : `EXIT=0` silencieux (zéro partenaire). Crontab (vérifier la timezone : `timedatectl` ; si UTC, 05:00 UTC ≈ 08:00 Athens été) :
```
(crontab -l; echo "0 5 1 * * cd /opt/cretepulse && python3 partner_report.py >> /var/log/partner_report.log 2>&1") | crontab -
```

- [ ] **Step 6: Commit**

```bash
git add vps/partner_report.py
git commit -m "feat(taxi): monthly Plausible report to partners (VPS cron, Resend, dry-run)"
```

---

### Task 9: Runbook signature partenaire

**Files:**
- Create: `docs/runbooks/taxi-partner-signup.md`

- [ ] **Step 1: Écrire le runbook**

```markdown
# Runbook — signature d'un partenaire taxi

Déclencheur : paiement Stripe reçu (email Stripe) OU accord par email.

1. Vérifier le paiement dans Stripe (subscription active, 49 €/mois).
2. Confirmer la zone par email avec le partenaire (nom exact, téléphone à
   afficher, site web éventuel, email destinataire du rapport mensuel).
   Si la zone est déjà prise : rembourser via Stripe et proposer une zone voisine.
3. Ajouter l'entrée dans `src/data/taxi-partners.json` → `partners` :
   `{ "zoneId": "...", "name": "...", "phone": "+30 ...", "website": "https://...",
      "reportEmail": "...", "since": "AAAA-MM-JJ" }`
4. PREMIER PARTENAIRE UNIQUEMENT — bascule honnête des textes "no ads" :
   - `src/messages/en.json` `footer.about` : remplacer "No ads (yet). No tracking."
     par "Clearly-labelled local sponsors. No tracking." (mêmes clés dans les
     21 autres fichiers messages/*.json si la chaîne y est traduite).
   - `src/app/llms.txt/route.ts` ligne "No tracking. No ads." → "No tracking.
     Clearly-labelled local sponsors."
   - `src/app/[locale]/about/page.tsx` description "No ads, no tracking, no
     affiliation." → "Clearly-labelled local sponsors, no tracking."
5. `node scripts/check-taxi-partners.mjs` puis commit + push master ET main.
6. Copier le JSON sur le VPS :
   `scp src/data/taxi-partners.json root@89.167.115.63:/opt/cretepulse/taxi-partners.json`
7. Vérifier en prod (page paire de la zone : badge "Sponsored" + tel:).
8. Répondre au partenaire : slot live + date du premier rapport (le 1er du mois).
9. Mémoire : ligne session_log LEAD + MAJ `commerce_state.md`.
```

- [ ] **Step 2: Commit**

```bash
git add docs/runbooks/taxi-partner-signup.md
git commit -m "docs(taxi): partner signup runbook (incl. honest no-ads copy switch)"
```

---

### Task 10: Vérification build + Playwright + push + prod

**Files:** aucun nouveau.

- [ ] **Step 1: Tests unitaires + build local**

```
node scripts/check-taxi-fare.mjs
node scripts/check-taxi-partners.mjs
node scripts/check-bus-pairs.mjs
node scripts/check-bus-journey.mjs
npx tsc --noEmit
$env:SUPABASE_SERVICE_KEY="dummy"; npm run build
```
Expected : tous OK, build EXIT 0. (Jamais `dev` pendant le build.)

- [ ] **Step 2: Vérification visuelle Playwright (dev)**

Avec le skill webapp-testing (`with_server.py`) : 
- `/fr/buses/heraklion-to-ierapetra` : bloc « En taxi : ~95–145 € » (valeurs ≈), mention compteur, ligne inbound /partners, FAQ taxi dans le JSON-LD (`page.content()` contient "taxi de Heraklion").
- `/en/buses` : planificateur Heraklion → Ierapetra → bloc compact taxi sous l'itinéraire.
- `/en/partners` + `/el/partners` : grille 7 zones « Available », prix 49 €, mailto.
- Test partenaire fictif : ajouter temporairement un partenaire `ierapetra-southeast` au JSON, vérifier badge Sponsored + bouton tel: sur la page paire, puis RETIRER le partenaire fictif (`git diff` doit être propre sur le JSON).
APRÈS le test : `Get-NetTCPConnection -LocalPort 3000 -State Listen | % { taskkill /PID $_.OwningProcess /F /T }`

- [ ] **Step 3: Push (master + main)**

Précondition : le deploy prod pages paires (dpl_6qSMUD9v5LbyZxC9eRqyVCzNkzPC) est sorti de la file (Ready ou Error géré — cf tâche deploy #1 de la session). Puis :
```bash
git push origin master
git push origin master:main
```

- [ ] **Step 4: Vérifier prod au Ready**

```
curl -s https://crete.direct/fr/buses/heraklion-to-ierapetra | grep -c "En taxi"   # >= 1
curl -s https://crete.direct/en/partners | grep -c "exclusive"                      # >= 1
curl -s https://crete.direct/sitemap.xml | grep -c "/partners"                      # >= 1
```

- [ ] **Step 5: IndexNow + mémoire**

- IndexNow : pinger les 4 URLs /partners (en/fr/de/el) + re-pinger un échantillon de pages paires n'est PAS nécessaire (contenu modifié = recrawl naturel ; les 340 URLs paires sont déjà pingées par la tâche deploy #1).
- session_log : ligne DEPLOY [FACT sources: commits + deploy + curl].
- `project_crete_direct.md` : section Phase 11 « Produit partenaire taxi » (build livré, prix 49 € à trancher Kami à la revue de page butoir 17/06/2026, 1er email outreach butoir 30/06/2026 owner Kami+NovAI).
- `MEMORY.md` : re-coudre la ligne project_crete_direct (index sync).
- `commerce_state.md` : nouvelle offre « slot taxi crete.direct » avec statut.
```

## Self-review du plan

1. **Couverture spec :** lib fare (T1) ✓, zones/JSON (T2) ✓, composants + étiquette sponsorisé (T3) ✓, pages paires + FAQ AEO (T4) ✓, planificateur (T5) ✓, /partners + sitemap (T6) ✓, Stripe (T7) ✓, rapport + clés + cron (T8) ✓, runbook no-ads (T9) ✓, vérifs/push/prod/mémoire (T10) ✓. Gestion d'erreurs spec : coords manquantes → null (T1), prix bus absent → taxi seul (T3 busPriceEur null), Plausible down → email alerte (T8), double zone → priorité A (T2). ✓
2. **Placeholders :** aucun TBD ; T6 step 2 et T5 step 3 renvoient à la lecture du fichier réel pour le point d'insertion exact (fichiers vivants, pattern à suivre donné). Acceptable.
3. **Cohérence types :** `taxiFareRange(slugA, slugB)` → `{low, high, km}` partout ; `partnerForPair(data, slugA, slugB)` → `TaxiPartner & {zone}` utilisé dans TaxiCompare ✓ ; `PARTNER_PRICE_EUR` importé en T6 ✓ ; props TaxiCompare identiques T4/T5 ✓.
