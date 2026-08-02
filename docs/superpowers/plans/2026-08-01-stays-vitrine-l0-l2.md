# Stays vitrine visiteur · lots L0 à L2 · plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** rendre la fiche `/[locale]/stays/[slug]` démontrable devant un propriétaire : toutes les photos, faits structurés, calendrier correct, devis chiffré, note Airbnb.

**Architecture:** trois couches étanches. La page ne fait que lire la base. Le scrape Airbnb et la traduction vivent dans des workers hors ligne. Toute la logique décidable (équipements, bornes de calendrier, parsing) est extraite en modules purs testés, les composants ne font que rendre.

**Tech Stack:** Next.js 16 (App Router, RSC), React 19, TypeScript, Supabase JS sur Postgres VPS, vitest (`src/**/*.test.ts`, environnement node), Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-08-01-stays-vitrine-visiteur-design.md`
**Worktree:** `C:\Users\fkerj\cp-stays-vitrine`, branche `feat/stays-vitrine`.

## Périmètre de ce plan

L0 socle, L1 données, L2 fiche. **L3 liste et filtres** et **L4 traduction** feront l'objet
de plans séparés : ils dépendent de L2 et ne sont pas démontrables sans lui.

## Contraintes à relire avant de commencer

- ⛔ **Aucun tiret cadratin** dans les `.ts/.tsx/.json`. Le gate `npm run check:da` (règle R11)
  refuse le commit. Séparateurs : point médian, virgule, point, deux-points.
- ⛔ **Zéro mention de Kairos** sur ces surfaces.
- ⛔ **`noindex` conservé.** Ne toucher à aucun fichier `metadata.ts`.
- ⛔ **Aucune donnée inventée.** Une valeur nulle ne s'affiche pas, elle ne devient jamais 0,
  « n/d » ou une valeur par défaut.
- Tests colocalisés : `src/lib/stays/xxx.test.ts`. Environnement node, donc **pas de test de
  composant React** : toute logique à tester vit dans un module pur.
- `npm run check` et `npx vitest run` verts avant chaque commit.

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `src/lib/stays/facts.ts` (créer) | Liste fermée des équipements, normalisation, ordre d'affichage |
| `src/lib/stays/calendar-rules.ts` (créer) | Bornes du calendrier : ce qui est cliquable en arrivée, en départ, et où s'arrête une plage |
| `src/lib/stays/airbnb-facts.ts` (créer) | `parseAirbnbFacts(html)`, pur, sans réseau |
| `src/lib/stays/db.ts` (modifier) | Ajout de `bookedRangesForListings` |
| `src/lib/stays/types.ts` (modifier) | Colonnes ajoutées à `StayListing` |
| `supabase/migrations/20260801_stays_vitrine.sql` (créer) | Colonnes |
| `src/app/[locale]/stays/content.ts` (modifier) | Libellés en/fr/de/el |
| `src/app/[locale]/stays/[slug]/Gallery.tsx` (créer) | Galerie, client, un seul état |
| `src/app/[locale]/stays/[slug]/BookingPanel.tsx` (créer) | Calendrier plus devis, client |
| `src/app/[locale]/stays/[slug]/page.tsx` (modifier) | Composition serveur |
| `scripts/capture-airbnb-facts.mjs` (créer) | Worker de capture |
| `src/lib/stays/fixtures/airbnb-pdp.html` (créer) | Fixture de test, extrait réel |

---

## Task 1 · Équipements, module pur

**Files:**
- Create: `src/lib/stays/facts.ts`
- Test: `src/lib/stays/facts.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { AMENITY_KEYS, normalizeAmenities, isAmenityKey } from "./facts";

describe("normalizeAmenities", () => {
  it("garde les cles connues, dans l ordre d affichage", () => {
    expect(normalizeAmenities(["wifi", "pool"])).toEqual(["pool", "wifi"]);
  });

  it("jette les cles inconnues sans lever", () => {
    expect(normalizeAmenities(["pool", "jacuzzi", "helipad"])).toEqual(["pool"]);
  });

  it("dedoublonne", () => {
    expect(normalizeAmenities(["wifi", "wifi"])).toEqual(["wifi"]);
  });

  it("accepte une entree nulle, absente ou mal typee", () => {
    expect(normalizeAmenities(null)).toEqual([]);
    expect(normalizeAmenities(undefined)).toEqual([]);
    expect(normalizeAmenities("pool" as unknown as string[])).toEqual([]);
    expect(normalizeAmenities([1, {}, null] as unknown as string[])).toEqual([]);
  });

  it("isAmenityKey discrimine", () => {
    expect(isAmenityKey("pool")).toBe(true);
    expect(isAmenityKey("sauna")).toBe(false);
  });

  it("AMENITY_KEYS est la liste fermee de la spec", () => {
    expect(AMENITY_KEYS).toEqual(["pool", "sea_view", "ac", "wifi", "bbq", "parking", "pets"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/stays/facts.test.ts`
Expected: FAIL, `Failed to resolve import "./facts"`.

- [ ] **Step 3: Write minimal implementation**

```ts
// Liste FERMEE des equipements affichables. Sept cles seulement : celles que le
// scrape Airbnb sait remplir et qui decident d une location. Une cle absente ne
// s affiche jamais en negatif : "pas de piscine" ne se dit pas.
// L ordre du tableau EST l ordre d affichage sur la fiche.
export const AMENITY_KEYS = [
  "pool",
  "sea_view",
  "ac",
  "wifi",
  "bbq",
  "parking",
  "pets",
] as const;

export type AmenityKey = (typeof AMENITY_KEYS)[number];

export function isAmenityKey(v: unknown): v is AmenityKey {
  return typeof v === "string" && (AMENITY_KEYS as readonly string[]).includes(v);
}

/**
 * Normalise la colonne jsonb `stay_listings.amenities`, qui est du contenu non
 * verifie par le type : elle peut porter n importe quoi. On garde les cles
 * connues, dedoublonnees, dans l ordre d affichage. Ne leve jamais.
 */
export function normalizeAmenities(raw: unknown): AmenityKey[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<AmenityKey>();
  for (const item of raw) if (isAmenityKey(item)) seen.add(item);
  return AMENITY_KEYS.filter((k) => seen.has(k));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/stays/facts.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stays/facts.ts src/lib/stays/facts.test.ts
git commit -m "feat(stays): liste fermee des equipements et normalisation"
```

---

## Task 2 · Migration et types

**Files:**
- Create: `supabase/migrations/20260801_stays_vitrine.sql`
- Modify: `src/lib/stays/types.ts` (interface `StayListing`, lignes 26 à 52)

- [ ] **Step 1: Write the migration**

```sql
-- Vitrine visiteur (lot C). Colonnes de faits manquantes plus note Airbnb.
-- La note et le nombre d avis vivent sur l annonce : c est un couple de scalaires,
-- une table dediee n apporterait qu une jointure. Aucune table d avis : les textes
-- ne sont pas atteignables dans le HTML statique d Airbnb (mesure du 01/08/2026).
alter table stay_listings add column if not exists bathrooms smallint;
alter table stay_listings add column if not exists area_sqm smallint;
alter table stay_listings add column if not exists description_locale text;
alter table stay_listings add column if not exists rating_avg numeric(3,2);
alter table stay_listings add column if not exists reviews_count integer;
alter table stay_listings add column if not exists reviews_captured_at timestamptz;
```

- [ ] **Step 2: Apply and verify**

Run:
```bash
psql "$CRETEPULSE_DATABASE_URL" -f supabase/migrations/20260801_stays_vitrine.sql
psql "$CRETEPULSE_DATABASE_URL" -c "\d stay_listings" | grep -E "bathrooms|area_sqm|description_locale|rating_avg|reviews_count|reviews_captured_at"
```
Expected: les 6 colonnes listées. Si `CRETEPULSE_DATABASE_URL` n'est pas dans
l'environnement, demander la chaîne à François avant d'aller plus loin : ne pas
inventer d'URL, ne pas appliquer sur une autre base.

- [ ] **Step 3: Extend the type**

Dans `src/lib/stays/types.ts`, ajouter à `interface StayListing`, juste après `beds`:

```ts
  bathrooms: number | null;
  area_sqm: number | null;
  /** Langue reelle de `description`, issue du scrape ou declaree. Jamais devinee. */
  description_locale: string | null;
  rating_avg: number | null;
  reviews_count: number | null;
  reviews_captured_at: string | null;
```

- [ ] **Step 4: Verify the build**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260801_stays_vitrine.sql src/lib/stays/types.ts
git commit -m "feat(stays): colonnes faits et note Airbnb"
```

---

## Task 3 · Nuits prises, requête agrégée

`bookedRangesForListing` est mono-annonce. La liste en aurait besoin pour N annonces :
l'appeler en boucle ferait N requêtes par affichage.

**Files:**
- Modify: `src/lib/stays/db.ts` (après `bookedRangesForListing`, ligne 166)
- Test: `src/lib/stays/db.test.ts`

- [ ] **Step 1: Read the existing function first**

Run: `sed -n '150,180p' src/lib/stays/db.ts`
Reproduire exactement sa façon de filtrer les statuts et de mapper vers `DateRange`.

- [ ] **Step 2: Write the failing test**

Le test porte sur le regroupement, pas sur Supabase. Extraire la partie pure.

```ts
import { describe, it, expect } from "vitest";
import { groupRangesByListing } from "./db";

describe("groupRangesByListing", () => {
  it("regroupe par listing_id et convertit en DateRange", () => {
    const rows = [
      { listing_id: 1, date_from: "2026-08-10", date_to: "2026-08-14" },
      { listing_id: 2, date_from: "2026-09-01", date_to: "2026-09-03" },
      { listing_id: 1, date_from: "2026-08-20", date_to: "2026-08-22" },
    ];
    expect(groupRangesByListing(rows)).toEqual({
      1: [
        { dateFrom: "2026-08-10", dateTo: "2026-08-14" },
        { dateFrom: "2026-08-20", dateTo: "2026-08-22" },
      ],
      2: [{ dateFrom: "2026-09-01", dateTo: "2026-09-03" }],
    });
  });

  it("rend un objet vide sur une entree vide ou nulle", () => {
    expect(groupRangesByListing([])).toEqual({});
    expect(groupRangesByListing(null)).toEqual({});
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/stays/db.test.ts -t groupRangesByListing`
Expected: FAIL, `groupRangesByListing is not a function`.

- [ ] **Step 4: Implement**

```ts
type AvailabilityRow = { listing_id: number; date_from: string; date_to: string };

/** Partie pure de bookedRangesForListings, testable sans base. */
export function groupRangesByListing(
  rows: AvailabilityRow[] | null,
): Record<number, DateRange[]> {
  const out: Record<number, DateRange[]> = {};
  for (const r of rows ?? []) {
    (out[r.listing_id] ??= []).push({ dateFrom: r.date_from, dateTo: r.date_to });
  }
  return out;
}

/**
 * Nuits prises de PLUSIEURS annonces en UNE requete. La version mono-annonce
 * appelee en boucle ferait N allers-retours par affichage de la liste.
 */
export async function bookedRangesForListings(
  ids: number[],
): Promise<Record<number, DateRange[]>> {
  if (ids.length === 0) return {};
  const { data } = await supabaseAdmin
    .from("stay_availability")
    .select("listing_id,date_from,date_to")
    .in("listing_id", ids)
    .in("status", ["booked", "blocked_ota", "hold"]);
  return groupRangesByListing(data as AvailabilityRow[] | null);
}
```

⚠️ Aligner le nom de table et la liste de statuts sur ce qu'a lu l'étape 1. Si
`bookedRangesForListing` filtre autrement, **copier son filtre**, ne pas en inventer un
second : deux définitions du mot « pris » finiraient par diverger.

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/lib/stays/db.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/stays/db.ts src/lib/stays/db.test.ts
git commit -m "feat(stays): nuits prises de plusieurs annonces en une requete"
```

---

## Task 4 · Bornes du calendrier, module pur

Le point le plus subtil du lot. Convention `[)` : **une nuit prise D interdit l'arrivée le D,
jamais le départ le D.** Deux séjours qui se touchent ne se chevauchent pas
(`availability.ts:13-17`). Un calendrier qui grise D casse la vente de tous les trous
adjacents à une réservation.

**Files:**
- Create: `src/lib/stays/calendar-rules.ts`
- Test: `src/lib/stays/calendar-rules.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { canCheckIn, canCheckOut, maxCheckOut } from "./calendar-rules";

// Nuits prises : 10, 11, 12, 13 aout. Le sejour part le 14 au matin.
const taken = ["2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13"];

describe("canCheckIn", () => {
  it("refuse une nuit prise", () => {
    expect(canCheckIn(taken, "2026-08-10")).toBe(false);
  });
  it("accepte le jour de depart du sejour precedent", () => {
    expect(canCheckIn(taken, "2026-08-14")).toBe(true);
  });
  it("accepte une nuit libre", () => {
    expect(canCheckIn(taken, "2026-08-05")).toBe(true);
  });
});

describe("canCheckOut", () => {
  it("accepte le premier jour d une serie prise : on dort la veille, on part le matin", () => {
    expect(canCheckOut(taken, "2026-08-09", "2026-08-10")).toBe(true);
  });
  it("refuse un depart qui enjambe une nuit prise", () => {
    expect(canCheckOut(taken, "2026-08-09", "2026-08-12")).toBe(false);
  });
  it("refuse un depart avant ou egal a l arrivee", () => {
    expect(canCheckOut(taken, "2026-08-09", "2026-08-09")).toBe(false);
    expect(canCheckOut(taken, "2026-08-09", "2026-08-08")).toBe(false);
  });
});

describe("maxCheckOut", () => {
  it("s arrete au premier jour pris apres l arrivee", () => {
    expect(maxCheckOut(taken, "2026-08-08")).toBe("2026-08-10");
  });
  it("rend null quand plus rien n est pris apres", () => {
    expect(maxCheckOut(taken, "2026-08-20")).toBe(null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/stays/calendar-rules.test.ts`
Expected: FAIL, import non résolu.

- [ ] **Step 3: Implement**

```ts
// Bornes du calendrier de la fiche. Convention [) : la borne de sortie est exclue.
// Consequence NON INTUITIVE et deja gravee en base par la contrainte GIST :
// une nuit prise D interdit l ARRIVEE le D, jamais le DEPART le D. Deux sejours
// qui se touchent ne se chevauchent pas. Griser D en depart rendrait invendable
// tout trou adjacent a une reservation.
import { eachNight } from "./availability";

/** Une nuit prise ne peut pas etre une date d arrivee. */
export function canCheckIn(takenNights: string[], day: string): boolean {
  return !takenNights.includes(day);
}

/**
 * Depart valide : strictement apres l arrivee, et aucune nuit prise entre les
 * deux. Le jour de depart lui-meme n est PAS une nuit dormie, il peut etre pris.
 */
export function canCheckOut(takenNights: string[], from: string, to: string): boolean {
  const nights = eachNight(from, to);
  if (nights.length === 0) return false;
  return !nights.some((n) => takenNights.includes(n));
}

/**
 * Premiere nuit prise apres l arrivee : c est le dernier depart atteignable.
 * null si plus rien n est pris ensuite, l interface laisse alors courir.
 */
export function maxCheckOut(takenNights: string[], from: string): string | null {
  const after = takenNights.filter((n) => n > from).sort();
  return after[0] ?? null;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/stays/calendar-rules.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stays/calendar-rules.ts src/lib/stays/calendar-rules.test.ts
git commit -m "feat(stays): bornes du calendrier, depart autorise sur une nuit prise"
```

---

## Task 5 · Libellés i18n

**Files:**
- Modify: `src/app/[locale]/stays/content.ts`

Le type `StaysStrings` est déclaré en tête, les 4 blocs de traduction suivent
(`en` ligne 176, `fr` 210, `de` 244, `el` 278, positions à revérifier). **Le type impose la
parité : une langue incomplète ne compile pas.**

- [ ] **Step 1: Extend the type**

Dans `StaysStrings`, ajouter après le bloc `listing`:

```ts
  facts: {
    guests: string;
    bedrooms: string;
    bathrooms: string;
    area: string;
    amenities: Record<
      "pool" | "sea_view" | "ac" | "wifi" | "bbq" | "parking" | "pets",
      string
    >;
  };
  calendar: {
    checkIn: string;
    checkOut: string;
    nightsTaken: string;
    minNights: string;
  };
  quote: {
    nights: string;
    cleaning: string;
    fee: string;
    total: string;
    deposit: string;
    estimate: string;
  };
  rating: { summary: string; source: string };
  langNote: string;
```

- [ ] **Step 2: Fill the four locales**

`en`:
```ts
  facts: {
    guests: "guests", bedrooms: "bedrooms", bathrooms: "bathrooms", area: "sqm",
    amenities: { pool: "Pool", sea_view: "Sea view", ac: "Air conditioning",
      wifi: "Wifi", bbq: "Barbecue", parking: "Parking", pets: "Pets allowed" },
  },
  calendar: { checkIn: "Arrival", checkOut: "Departure",
    nightsTaken: "Nights already booked", minNights: "Minimum {n} nights" },
  quote: { nights: "{price} x {n} nights", cleaning: "Cleaning, once per stay",
    fee: "Payment fee 5 %", total: "Total", deposit: "{deposit} today, balance of {balance} fourteen days before arrival",
    estimate: "Estimate based on the listed rate, confirmed by the owner within 48 hours." },
  rating: { summary: "{rating} out of {count} reviews", source: "Rating taken from Airbnb on {date}." },
  langNote: "Translated automatically. Original written in {lang} by the owner.",
```

`fr`:
```ts
  facts: {
    guests: "voyageurs", bedrooms: "chambres", bathrooms: "salles de bain", area: "m2",
    amenities: { pool: "Piscine", sea_view: "Vue mer", ac: "Climatisation",
      wifi: "Wifi", bbq: "Barbecue", parking: "Parking", pets: "Animaux acceptes" },
  },
  calendar: { checkIn: "Arrivee", checkOut: "Depart",
    nightsTaken: "Nuits deja reservees", minNights: "Minimum {n} nuits" },
  quote: { nights: "{price} x {n} nuits", cleaning: "Menage, une fois par sejour",
    fee: "Frais de paiement 5 %", total: "Total",
    deposit: "{deposit} aujourd hui, le solde de {balance} quatorze jours avant l arrivee",
    estimate: "Estimation sur la base du tarif affiche, confirmee par le proprietaire sous 48 heures." },
  rating: { summary: "{rating} sur {count} avis", source: "Note relevee sur Airbnb le {date}." },
  langNote: "Traduit automatiquement. Version originale redigee en {lang} par le proprietaire.",
```

`de`:
```ts
  facts: {
    guests: "Gaste", bedrooms: "Schlafzimmer", bathrooms: "Badezimmer", area: "qm",
    amenities: { pool: "Pool", sea_view: "Meerblick", ac: "Klimaanlage",
      wifi: "WLAN", bbq: "Grill", parking: "Parkplatz", pets: "Haustiere erlaubt" },
  },
  calendar: { checkIn: "Anreise", checkOut: "Abreise",
    nightsTaken: "Bereits gebuchte Nachte", minNights: "Mindestens {n} Nachte" },
  quote: { nights: "{price} x {n} Nachte", cleaning: "Endreinigung, einmal pro Aufenthalt",
    fee: "Zahlungsgebuhr 5 %", total: "Gesamt",
    deposit: "{deposit} heute, Restbetrag von {balance} vierzehn Tage vor Anreise",
    estimate: "Schatzung auf Basis des angegebenen Preises, vom Gastgeber innerhalb von 48 Stunden bestatigt." },
  rating: { summary: "{rating} bei {count} Bewertungen", source: "Bewertung von Airbnb, erhoben am {date}." },
  langNote: "Automatisch ubersetzt. Original vom Gastgeber auf {lang} verfasst.",
```

`el`:
```ts
  facts: {
    guests: "επισκεπτες", bedrooms: "υπνοδωματια", bathrooms: "μπανια", area: "τ.μ.",
    amenities: { pool: "Πισινα", sea_view: "Θεα στη θαλασσα", ac: "Κλιματισμος",
      wifi: "Wifi", bbq: "Ψησταρια", parking: "Παρκινγκ", pets: "Δεκτα κατοικιδια" },
  },
  calendar: { checkIn: "Αφιξη", checkOut: "Αναχωρηση",
    nightsTaken: "Ημερομηνιες που ειναι ηδη κλεισμενες", minNights: "Ελαχιστο {n} διανυκτερευσεις" },
  quote: { nights: "{price} x {n} διανυκτερευσεις", cleaning: "Καθαρισμος, μια φορα ανα διαμονη",
    fee: "Χρεωση πληρωμης 5 %", total: "Συνολο",
    deposit: "{deposit} σημερα, το υπολοιπο {balance} δεκατεσσερις ημερες πριν την αφιξη",
    estimate: "Εκτιμηση με βαση την αναγραφομενη τιμη, επιβεβαιωνεται απο τον ιδιοκτητη εντος 48 ωρων." },
  rating: { summary: "{rating} απο {count} κριτικες", source: "Βαθμολογια απο το Airbnb, καταγραφη {date}." },
  langNote: "Αυτοματη μεταφραση. Το πρωτοτυπο γραφτηκε στα {lang} απο τον ιδιοκτητη.",
```

- [ ] **Step 3: Verify parity and DA**

Run: `npx tsc --noEmit && npm run check:da`
Expected: exit 0 sur les deux. Une langue incomplète fait échouer `tsc`.

- [ ] **Step 4: Commit**

```bash
git add "src/app/[locale]/stays/content.ts"
git commit -m "feat(stays): libelles vitrine en 4 langues"
```

---

## Task 6 · Parseur Airbnb, pur et testé sur fixture

**Files:**
- Create: `src/lib/stays/airbnb-facts.ts`
- Create: `src/lib/stays/fixtures/airbnb-pdp.html`
- Test: `src/lib/stays/airbnb-facts.test.ts`

- [ ] **Step 1: Build the fixture**

Récupérer une page réelle et n'en committer qu'un extrait, la page entière pèse 600 KB.

```bash
curl -s -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36" \
  "https://www.airbnb.fr/rooms/1217351117805110828" -o /tmp/pdp.html
grep -o -E '.{0,400}(personCapacity|starRating|reviewCount|descriptionLanguage).{0,400}' /tmp/pdp.html \
  | head -20 > src/lib/stays/fixtures/airbnb-pdp.html
```

Vérifier à l'oeil que la fixture contient bien `personCapacity`, `starRating`, `reviewCount`,
`descriptionLanguage`. **Aucune donnée personnelle dans la fixture** : si un nom d'hôte ou une
photo de profil apparaît, le retirer avant de committer.

- [ ] **Step 2: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseAirbnbFacts } from "./airbnb-facts";

const html = readFileSync(join(__dirname, "fixtures/airbnb-pdp.html"), "utf8");

describe("parseAirbnbFacts", () => {
  it("lit la note et le nombre d avis", () => {
    const f = parseAirbnbFacts(html);
    expect(f.ratingAvg).toBeGreaterThan(0);
    expect(f.ratingAvg).toBeLessThanOrEqual(5);
    expect(f.reviewsCount).toBeGreaterThan(0);
  });

  it("lit la capacite et la langue de la description", () => {
    const f = parseAirbnbFacts(html);
    expect(f.maxGuests).toBeGreaterThan(0);
    expect(f.descriptionLocale).toMatch(/^[a-z]{2}$/);
  });

  it("rend des nulls sur un html vide, sans lever", () => {
    expect(parseAirbnbFacts("")).toEqual({
      ratingAvg: null, reviewsCount: null, maxGuests: null,
      lat: null, lng: null, descriptionLocale: null,
    });
  });

  it("rend null sur une note hors bornes plutot que de la propager", () => {
    expect(parseAirbnbFacts('"starRating":9.9').ratingAvg).toBe(null);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/stays/airbnb-facts.test.ts`
Expected: FAIL, import non résolu.

- [ ] **Step 4: Implement**

```ts
// Parseur des faits d une page annonce Airbnb. PUR : il recoit du HTML, il ne fait
// aucun appel reseau, il est teste sur une fixture committee.
// Mesure du 01/08/2026 sur une page reelle : starRating, reviewCount, personCapacity,
// listingLat, listingLng et descriptionLanguage sont dans le HTML statique. Les TEXTES
// des avis n y sont PAS, ils viennent d un second appel GraphQL signe : ce parseur ne
// tente pas de les lire.
export interface AirbnbFacts {
  ratingAvg: number | null;
  reviewsCount: number | null;
  maxGuests: number | null;
  lat: number | null;
  lng: number | null;
  descriptionLocale: string | null;
}

function num(html: string, key: string): number | null {
  const m = html.match(new RegExp(`"${key}":\\s*(-?[0-9]+(?:\\.[0-9]+)?)`));
  if (!m) return null;
  const v = Number(m[1]);
  return Number.isFinite(v) ? v : null;
}

function str(html: string, key: string): string | null {
  const m = html.match(new RegExp(`"${key}":\\s*"([^"]{1,16})"`));
  return m ? m[1] : null;
}

/** Une valeur hors bornes est rendue null : mieux vaut rien qu une note fausse. */
const inRange = (v: number | null, lo: number, hi: number): number | null =>
  v != null && v >= lo && v <= hi ? v : null;

export function parseAirbnbFacts(html: string): AirbnbFacts {
  const locale = str(html, "descriptionLanguage");
  return {
    ratingAvg: inRange(num(html, "starRating"), 1, 5),
    reviewsCount: inRange(num(html, "reviewCount"), 0, 100_000),
    maxGuests: inRange(num(html, "personCapacity"), 1, 50),
    lat: inRange(num(html, "listingLat"), -90, 90),
    lng: inRange(num(html, "listingLng"), -180, 180),
    descriptionLocale: locale && /^[a-z]{2}$/.test(locale) ? locale : null,
  };
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/lib/stays/airbnb-facts.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/stays/airbnb-facts.ts src/lib/stays/airbnb-facts.test.ts src/lib/stays/fixtures/airbnb-pdp.html
git commit -m "feat(stays): parseur des faits Airbnb, teste sur fixture"
```

---

## Task 7 · Worker de capture

**Files:**
- Create: `scripts/capture-airbnb-facts.mjs`

Suivre le modèle de `scripts/backfill-affiliate-content.mjs` pour le chargement de
l'environnement et le client Supabase. **Le lire avant d'écrire.**

- [ ] **Step 1: Read the reference worker**

Run: `sed -n '1,60p' scripts/backfill-affiliate-content.mjs`

- [ ] **Step 2: Write the worker**

```js
#!/usr/bin/env node
// Capture des faits Airbnb d une annonce Stays. Tourne sur le VPS ou en local, JAMAIS
// depuis Vercel : Airbnb bloque les IP cloud.
// Regle d ecriture : un fait n est ecrit QUE si la colonne est nulle, une saisie du
// proprietaire n est jamais ecrasee. Note, nombre d avis et date de releve sont eux
// toujours rafraichis, c est leur raison d etre.
// Echec : RIEN n est ecrit, sortie 1. Une capture ratee ne doit jamais vider une note.
//
// Usage : node scripts/capture-airbnb-facts.mjs --id 12
//         node scripts/capture-airbnb-facts.mjs --all-missing
import { createClient } from "@supabase/supabase-js";
import { parseAirbnbFacts } from "../src/lib/stays/airbnb-facts.ts";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY absent");
  process.exit(1);
}
const db = createClient(url, key);

async function captureOne(listing) {
  if (!listing.airbnb_url) return { id: listing.id, ok: false, why: "no airbnb_url" };
  let html;
  try {
    const res = await fetch(listing.airbnb_url, { headers: { "User-Agent": UA } });
    if (!res.ok) return { id: listing.id, ok: false, why: `http ${res.status}` };
    html = await res.text();
  } catch (e) {
    return { id: listing.id, ok: false, why: String(e) };
  }

  const f = parseAirbnbFacts(html);
  if (f.ratingAvg == null && f.maxGuests == null) {
    return { id: listing.id, ok: false, why: "rien de parsable" };
  }

  const patch = { reviews_captured_at: new Date().toISOString() };
  if (f.ratingAvg != null) patch.rating_avg = f.ratingAvg;
  if (f.reviewsCount != null) patch.reviews_count = f.reviewsCount;
  // Faits : seulement si la colonne est vide.
  if (listing.max_guests == null && f.maxGuests != null) patch.max_guests = f.maxGuests;
  if (listing.lat == null && f.lat != null) patch.lat = f.lat;
  if (listing.lng == null && f.lng != null) patch.lng = f.lng;
  if (listing.description_locale == null && f.descriptionLocale != null) {
    patch.description_locale = f.descriptionLocale;
  }

  const { error } = await db.from("stay_listings").update(patch).eq("id", listing.id);
  if (error) return { id: listing.id, ok: false, why: error.message };
  return { id: listing.id, ok: true, patch };
}

const args = process.argv.slice(2);
const idArg = args.indexOf("--id");
let q = db
  .from("stay_listings")
  .select("id,airbnb_url,max_guests,lat,lng,description_locale");
if (idArg >= 0) q = q.eq("id", Number(args[idArg + 1]));
else if (args.includes("--all-missing")) q = q.is("reviews_captured_at", null);
else {
  console.error("usage : --id <n> | --all-missing");
  process.exit(1);
}

const { data, error } = await q;
if (error) { console.error(error.message); process.exit(1); }

let failed = 0;
for (const listing of data ?? []) {
  const r = await captureOne(listing);
  console.log(JSON.stringify(r));
  if (!r.ok) failed++;
  await new Promise((r2) => setTimeout(r2, 3000)); // une page toutes les 3 s
}
process.exit(failed > 0 && failed === (data ?? []).length ? 1 : 0);
```

- [ ] **Step 3: Dry run on one listing**

Run: `node scripts/capture-airbnb-facts.mjs --id <un id reel>`
Expected: une ligne JSON `{"id":...,"ok":true,"patch":{...}}`. Si `ok:false`, lire la
raison et **ne pas contourner** : un `http 403` veut dire qu'Airbnb bloque cette IP, ce qui
est une information, pas un bug à forcer.

- [ ] **Step 4: Verify in database**

Run: `psql "$CRETEPULSE_DATABASE_URL" -c "select id,rating_avg,reviews_count,reviews_captured_at,max_guests from stay_listings order by id"`
Expected: les colonnes remplies pour l'annonce traitée, les autres intactes.

- [ ] **Step 5: Commit**

```bash
git add scripts/capture-airbnb-facts.mjs
git commit -m "feat(stays): worker de capture des faits Airbnb"
```

---

## Task 8 · Galerie

**Files:**
- Create: `src/app/[locale]/stays/[slug]/Gallery.tsx`
- Test: aucun. Composant de rendu sans logique décidable, l'environnement vitest est `node`.

- [ ] **Step 1: Write the component**

```tsx
"use client";
// Galerie de la fiche. Le defaut corrige ici : page.tsx ne rendait que photos[0] et
// jetait les autres, alors que la base en porte plusieurs dizaines par annonce.
// Un seul etat : l index de la photo mise en avant. Pas de lightbox, la grille est
// deja en grande taille.
import Image from "next/image";
import { useState } from "react";

export default function Gallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [lead, setLead] = useState(0);
  if (photos.length === 0) return null;

  const rest = photos.filter((_, i) => i !== lead).slice(0, 4);
  const hidden = photos.length - 1 - rest.length;

  return (
    <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr] md:grid-rows-2">
      <div className="md:row-span-2">
        <Image
          src={photos[lead]}
          alt={alt}
          width={1200}
          height={800}
          className="h-full w-full rounded-3xl object-cover"
          priority
        />
      </div>
      {rest.map((src) => {
        const idx = photos.indexOf(src);
        return (
          <button
            key={src}
            type="button"
            onClick={() => setLead(idx)}
            className="relative overflow-hidden rounded-2xl"
          >
            <Image src={src} alt="" width={480} height={320} className="h-full w-full object-cover" />
            {hidden > 0 && src === rest[rest.length - 1] && (
              <span className="absolute bottom-2 right-2 rounded-full bg-white/95 px-3 py-1 text-[12.5px] font-bold text-text">
                plus {hidden}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Check the domain allowlist**

`next/image` refuse un hôte non déclaré. Les photos viennent de `a0.muscache.com`.

Run: `grep -A12 "images:" next.config.ts`
Si `a0.muscache.com` n'est pas dans `remotePatterns`, l'ajouter. **Sans cette étape la
galerie rend une erreur en production alors que le build passe.**

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/stays/[slug]/Gallery.tsx" next.config.ts
git commit -m "feat(stays): galerie, toutes les photos au lieu de la premiere"
```

---

## Task 9 · Bloc réservation, calendrier et devis

**Files:**
- Create: `src/app/[locale]/stays/[slug]/BookingPanel.tsx`
- Modify: `src/app/[locale]/stays/[slug]/RequestForm.tsx` (les champs de date natifs sont remplacés, le reste du formulaire est conservé)

- [ ] **Step 1: Read the existing form**

Run: `cat "src/app/[locale]/stays/[slug]/RequestForm.tsx"`
Relever exactement : la forme du POST vers `/api/stays/request`, les noms de champs, la
gestion d'erreur, les chaînes utilisées. **Le tunnel d'envoi ne change pas**, seule la
saisie des dates et l'ajout du devis changent.

- [ ] **Step 2: Wire the calendar rules**

Le composant importe `canCheckIn`, `canCheckOut`, `maxCheckOut` de `calendar-rules.ts` et
`computeQuote` de `pricing.ts`. **Aucune arithmétique de prix dans le composant.**

Règles d'interaction, elles viennent de la spec §6.1 :
- Clic 1 pose l'arrivée, seulement si `canCheckIn(taken, day)`.
- Après l'arrivée, un jour est proposé en départ si `canCheckOut(taken, from, day)`.
- Les jours au-delà de `maxCheckOut(taken, from)` sont désactivés.
- Une nuit prise reste **cliquable en départ**.

- [ ] **Step 3: Guard the quote**

```tsx
// nightsBetween LEVE si nights <= 0 (pricing.ts:9-11). Le devis n est calcule que
// lorsque les deux dates sont posees ET que depart > arrivee.
const quote =
  from && to && to > from
    ? computeQuote({
        basePriceEur: basePrice,
        cleaningFeeEur: cleaningFee,
        commissionRate,
        dateFrom: from,
        dateTo: to,
      })
    : null;
```

- [ ] **Step 4: Label the estimate**

Sous le total, rendre `strings.quote.estimate`. ⛔ **Cette ligne n'est pas décorative** : le
prix encaissé est celui que le propriétaire saisit à l'approbation
(`approve/route.ts:28`). Afficher un total sans dire qu'il est estimatif serait un
engagement de prix que le produit ne tient pas.

- [ ] **Step 5: Pass the data from the server**

Dans `[slug]/page.tsx`, passer à `BookingPanel` : `basePriceEur`, `cleaningFeeEur`,
`commissionRate` (`listing.commission_rate`), `minNights`, et les nuits prises déjà
calculées par la page (`unavailable`).

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit && npm run check:da && npx vitest run`
Expected: exit 0, aucun test en échec.

- [ ] **Step 7: Commit**

```bash
git add "src/app/[locale]/stays/[slug]/"
git commit -m "feat(stays): calendrier et devis estimatif sur la fiche"
```

---

## Task 10 · Pré-remplir le prix à l'approbation

Sans cette tâche, le propriétaire arrive sur un champ vide et ressaisit un prix qui n'a
aucune raison de coïncider avec celui vu par le voyageur.

**Files:**
- Modify: `src/app/[locale]/stays/approve/[token]/ApprovePanel.tsx:41`
- Modify: `src/app/[locale]/stays/approve/[token]/page.tsx` (passer la valeur)

- [ ] **Step 1: Read both files**

Run: `sed -n '1,60p' "src/app/[locale]/stays/approve/[token]/page.tsx"`
Vérifier ce que la page charge déjà : la demande, et l'annonce.

- [ ] **Step 2: Compute the suggestion server side**

Dans `page.tsx`, calculer `suggestedPrice = listing.base_price_eur * nightsBetween(req.date_from, req.date_to)`
et le passer en prop. ⛔ Utiliser `nightsBetween` de `pricing.ts`, ne pas soustraire deux
dates à la main.

- [ ] **Step 3: Use it as initial state**

```tsx
const [price, setPrice] = useState(suggestedPrice > 0 ? String(suggestedPrice) : "");
```

Le champ reste modifiable : c'est le propriétaire qui décide, on lui évite seulement la
ressaisie.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npx vitest run`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/stays/approve/"
git commit -m "fix(stays): pre-remplir le prix d approbation avec le tarif affiche"
```

---

## Task 11 · Composition de la fiche

**Files:**
- Modify: `src/app/[locale]/stays/[slug]/page.tsx`

- [ ] **Step 1: Replace the single photo**

Remplacer le bloc `{listing.photos?.[0] && <Image .../>}` par
`<Gallery photos={listing.photos ?? []} alt={listing.title ?? ""} />`.

- [ ] **Step 2: Add the facts line**

Sous le titre, rendre dans cet ordre, **en sautant toute valeur nulle** : zone
(`listing.location_slug`), `max_guests`, `bedrooms`, `bathrooms`, `area_sqm`. Séparateur :
point médian.

- [ ] **Step 3: Add the amenities row**

```tsx
import { normalizeAmenities } from "@/lib/stays/facts";
// ...
{normalizeAmenities(listing.amenities).map((k) => (
  <li key={k} className="rounded-xl border border-border bg-white px-3 py-1.5 text-[13.5px]">
    {t.facts.amenities[k]}
  </li>
))}
```

- [ ] **Step 4: Add the language note**

```tsx
{listing.description_locale && listing.description_locale !== pickStaysLocale(locale) && (
  <p className="mt-1.5 text-[12.5px] italic text-text-light">
    {t.langNote.replace("{lang}", listing.description_locale)}
  </p>
)}
```

⛔ Rien ne s'affiche si `description_locale` est nul. On ne devine jamais une langue.

- [ ] **Step 5: Add the rating block**

```tsx
{listing.reviews_count != null && listing.reviews_count > 0 && listing.rating_avg != null && (
  <section className="mt-10">
    <p className="m-0 font-heading text-2xl font-extrabold">
      {t.rating.summary
        .replace("{rating}", String(listing.rating_avg))
        .replace("{count}", String(listing.reviews_count))}
    </p>
    <p className="m-0 mt-1 text-[12.5px] text-text-light">
      {t.rating.source.replace("{date}", (listing.reviews_captured_at ?? "").slice(0, 10))}
    </p>
  </section>
)}
```

⛔ Aucun lien vers Airbnb. Décision commerciale de la spec §3.3.

- [ ] **Step 6: Remove the old chips list**

La liste de dates barrées sous le formulaire (`page.tsx:101`) fait doublon avec le
calendrier. La supprimer, ainsi que les chaînes `unavailableTitle` et `unavailableEmpty`
si plus rien ne les utilise.

- [ ] **Step 7: Full verification**

Run: `npm run check && npx vitest run && npx next build`
Expected: exit 0 partout.

- [ ] **Step 8: Visual check before any deploy**

Lancer `npm run dev`, ouvrir `/fr/stays/villa-danae-makrigialos`, comparer avec
`docs/mockups/2026-08-01-stays-fiche.html`. **Vérifier aussi sous 768 px de large.**
⛔ Ne pas pousser en production sans que François ait vu le rendu.

- [ ] **Step 9: Commit**

```bash
git add "src/app/[locale]/stays/[slug]/page.tsx" "src/app/[locale]/stays/content.ts"
git commit -m "feat(stays): fiche complete, galerie faits calendrier devis note"
```

---

## Auto-revue du plan

**Couverture de la spec.** §5.1 colonnes → T2 · §6.1 bornes → T4 et T9 · §6.2 devis et
estimation → T9 · §6.2 pré-remplissage → T10 · galerie §6.2 → T8 · faits et équipements
§6.1 et §6.3 → T1, T11 · note §6.6 → T7, T11 · langue §6.4 → T6, T11 · §7 liste → **hors
plan, L3** · §8.1 traduction → **hors plan, L4** · §8.2 capture → T6, T7 · §2.1 mesure
Airbnb → T6.

**Non couvert volontairement et à planifier ensuite** : la re-capture depuis `/admin/stays`
(§8.2, dernier point), la saisie des faits dans le wizard et l'espace propriétaire. Les deux
demandent un écran d'écriture, ils iront dans le plan L3 avec la liste. En attendant, les
faits se remplissent par le worker T7 et par SQL direct.

**Cohérence des noms.** `normalizeAmenities`, `canCheckIn`, `canCheckOut`, `maxCheckOut`,
`parseAirbnbFacts`, `groupRangesByListing`, `bookedRangesForListings`, `computeQuote`
(existant), `nightsBetween` (existant) : chaque nom est défini une fois et réutilisé à
l'identique. `computeQuote` est bien le nom réel, `quoteFor` n'existe pas.
