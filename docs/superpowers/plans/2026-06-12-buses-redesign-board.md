# Refonte /buses "gare vivante B1" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer la page /buses d'un annuaire de 292 cartes (120 écrans de scroll) en une "gare vivante" centrée sur un tableau des départs temps réel style Solari, sans rien perdre du SEO existant.

**Architecture:** Une lib pure `bus-departures.ts` (testable en node) calcule les prochains départs depuis un lieu ; un composant client `DepartureBoard` la rend en panneau Solari avec countdown ; le planner existant est re-skinné (autocomplete + chips date + swap) ; l'annuaire des 292 routes passe de grosses cartes à des lignes compactes en gardant tout le HTML/horaires dans le DOM pour Google.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind v4, next-intl, Supabase (données déjà chargées server-side), test node par type-stripping (Node ≥ 23).

**Spec:** `docs/superpowers/specs/2026-06-12-buses-redesign-board-design.md` (voir section "Mise à jour 13/06/2026 — réconciliation")

---

## Mise à jour 13/06/2026 (réconciliation avant exécution)

La page a évolué depuis l'écriture du plan (même session, non committé). Ajustements :

- **Compteurs** : 292 → **383 routes** (East/herlas 236, West/ektel 147). Les pills section annuaire lisent le compte au runtime, pas en dur.
- **Bandeau d'alertes DÉJÀ construit** (`lib/bus-alerts.ts` + `BusAlertsBanner`, table `bus_alerts` live) : **ne pas le reconstruire**. Il est conservé tel quel dans `BusesClient`, inséré sous le header, au-dessus du planner (section 1bis).
- **Top routes = data-driven** : réutiliser le `useMemo` `popular` (paires les plus desservies) déjà présent dans `BusesClient`, rendu en `RouteLine`. Pas de liste curée GSC (YAGNI).
- **Base = working tree actuel non committé** (planner-first + alertes). Le Task 7 (BusesClient) **remplace** `CollapsibleRegion`/`Grid` de cartes par `RouteLine` + pills `East/West`. Reprendre le badge prix `(indicatif)`, la mention "horaires non publiés" et la règle zéro-flèche déjà en place.
- **Pas de branche séparée** (working tree partagé multi-terminal) : travail sur master non committé, **captures Playwright à Kami avant commit/push** `master→main`.

---

## File Structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `src/lib/bus-departures.ts` | Créer | Pur : routes + lieu + date + minute → départs triés avec countdown |
| `scripts/check-bus-departures.mjs` | Créer | Tests node du module pur |
| `src/components/DepartureBoard.tsx` | Créer | Board Solari client : countdown, pills lieu, géoloc near-me |
| `src/components/PlaceCombobox.tsx` | Créer | Autocomplete lieux (remplace les `<select>`) |
| `src/components/RouteLine.tsx` | Créer | Ligne compacte annuaire (horaires + guides dépliables dans le DOM) |
| `src/app/[locale]/buses/JourneyPlanner.tsx` | Modifier | Selects → combobox, input date → chips Today/Tomorrow/Date, pill swap |
| `src/app/[locale]/buses/BusesClient.tsx` | Modifier | Orchestration : header compact, board, annuaire compacté, état partagé |

**Note réutilisation :** le `DepBoard.tsx` existant (home, design différent, `count=3`) n'est PAS touché. On extrait sa logique de calcul dans `bus-departures.ts` et on la teste, puis le nouveau `DepartureBoard` l'utilise.

**Note données :** `BusRoute` n'a pas de champ `via`. Le sous-libellé d'une ligne de board = `route.duration` uniquement (ex "2 h 50"), jamais de "via X" inventé (règle anti-invention).

---

## Task 1 : Module pur `bus-departures.ts`

**Files:**
- Create: `src/lib/bus-departures.ts`
- Test: `scripts/check-bus-departures.mjs`

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `scripts/check-bus-departures.mjs` :

```js
// Assertions sur fixtures synthetiques. Run: node scripts/check-bus-departures.mjs
// (Node >= 23 : importe le .ts par type-stripping)
import assert from "node:assert/strict";
import { departuresFrom } from "../src/lib/bus-departures.ts";

const R = (id, from, to, extra = {}) => ({
  id, operator_id: "herlas", from_place: from, to_place: to, to_slug: null,
  season: "all", duration: null, price_eur: null, price_estimated: false,
  frequency: null, departures: null, departures_by_day: null,
  source_url: "x", scraped_at: "2026-06-10", ...extra,
});

const routes = [
  R(1, "Heraklion", "Chania", { departures: ["08:00", "14:00", "20:00"], duration: "2h 50min", price_eur: 13.8 }),
  R(2, "Heraklion", "Malia", { departures: ["14:15"], duration: "45min", price_eur: 3.8 }),
  R(3, "Sitia", "Ierapetra", { departures: ["09:00"], price_eur: 4.1 }),   // autre lieu
  R(4, "Heraklion", "Rethymno", { departures: [], price_eur: 8.8 }),       // pas de depart ce jour
];

// 1) Ne renvoie que les departs DEPUIS le lieu actif, tries par heure, >= now
const wed = "2026-06-10"; // mercredi
const d = departuresFrom(routes, "Heraklion", wed, 13 * 60); // 13:00
assert.deepEqual(d.map((x) => x.time), ["14:00", "14:15", "20:00"]);
assert.equal(d[0].toPlace, "Chania");
assert.equal(d[0].minutesUntil, 60);
assert.equal(d[0].durationLabel, "2h 50min");
assert.equal(d[0].priceEur, 13.8);
assert.equal(d[0].pairSlug, "chania-to-heraklion"); // slug alpha

// 2) Aucune route d'un autre lieu ne fuite
assert.ok(d.every((x) => x.toPlace !== "Ierapetra"));

// 3) Jour futur : pas de countdown (minutesUntil null), tous les departs
const future = departuresFrom(routes, "Heraklion", "2026-06-20", null);
assert.deepEqual(future.map((x) => x.time), ["08:00", "14:00", "14:15", "20:00"]);
assert.equal(future[0].minutesUntil, null);

// 4) Plus de depart aujourd'hui -> isTomorrow + premier bus du lendemain
const late = departuresFrom(routes, "Heraklion", wed, 23 * 60, { tomorrowISO: "2026-06-11" });
assert.ok(late.length > 0, "le board vit meme tard : montre demain");
assert.ok(late.every((x) => x.isTomorrow === true));
assert.equal(late[0].minutesUntil, null);

console.log("OK bus-departures", d.length, future.length, late.length);
```

- [ ] **Step 2 : Lancer le test pour vérifier l'échec**

Run: `node scripts/check-bus-departures.mjs`
Expected: FAIL `Cannot find module '../src/lib/bus-departures.ts'` (ou export manquant).

- [ ] **Step 3 : Écrire l'implémentation minimale**

Créer `src/lib/bus-departures.ts` :

```ts
// Prochains departs DEPUIS un lieu, toutes lignes confondues (modele gare routiere).
// Pur, zero I/O (import type) : testable node + utilisable client.
// L'heure est injectee (nowMinutes) pour rester deterministe ; le composant
// la fournit via athensNow(). Teste par scripts/check-bus-departures.mjs.
import type { BusRoute } from "./buses";
import { timesForDate } from "./bus-journey";
import { pairSlug } from "./bus-pairs";

export interface DepartureRow {
  routeId: number;
  time: string;              // "14:00"
  toPlace: string;
  durationLabel: string | null;
  priceEur: number | null;
  priceEstimated: boolean;
  pairSlug: string | null;   // page paire si digne, sinon null
  minutesUntil: number | null; // null pour un jour futur ou demain
  isTomorrow: boolean;
}

const toMin = (t: string): number => {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

/**
 * Departs depuis `place` le jour `dateISO`, tries par heure.
 * - nowMinutes != null (jour courant) : ne garde que les departs >= now,
 *   renseigne minutesUntil. Si plus rien : bascule sur opts.tomorrowISO
 *   (premier bus de chaque ligne, isTomorrow=true, minutesUntil=null).
 * - nowMinutes == null (jour futur) : tous les departs du jour, sans countdown.
 * Dedup par destination (garde le plus proche).
 */
export function departuresFrom(
  routes: BusRoute[],
  place: string,
  dateISO: string,
  nowMinutes: number | null,
  opts: { tomorrowISO?: string } = {},
): DepartureRow[] {
  const fromHere = routes.filter((r) => r.from_place === place);

  const build = (r: BusRoute, time: string, until: number | null, tomorrow: boolean): DepartureRow => ({
    routeId: r.id,
    time,
    toPlace: r.to_place,
    durationLabel: r.duration,
    priceEur: r.price_eur,
    priceEstimated: r.price_estimated === true,
    pairSlug: pairSlug(r.from_place, r.to_place),
    minutesUntil: until,
    isTomorrow: tomorrow,
  });

  let rows: DepartureRow[] = [];
  for (const r of fromHere) {
    const times = timesForDate(r, dateISO).slice().sort((a, b) => toMin(a) - toMin(b));
    if (nowMinutes == null) {
      for (const t of times) rows.push(build(r, t, null, false));
    } else {
      const next = times.find((t) => toMin(t) >= nowMinutes);
      if (next) rows.push(build(r, next, toMin(next) - nowMinutes, false));
    }
  }

  // Jour courant, plus aucun depart restant -> montrer demain (le board vit toujours)
  if (nowMinutes != null && rows.length === 0 && opts.tomorrowISO) {
    for (const r of fromHere) {
      const first = timesForDate(r, opts.tomorrowISO).slice().sort((a, b) => toMin(a) - toMin(b))[0];
      if (first) rows.push(build(r, first, null, true));
    }
  }

  rows.sort((a, b) => toMin(a.time) - toMin(b.time));
  // dedup par destination (le plus proche d'abord, deja trie)
  const seen = new Set<string>();
  return rows.filter((d) => (seen.has(d.toPlace) ? false : (seen.add(d.toPlace), true)));
}

/** Liste triee des lieux de depart ayant au moins une ligne (pour les pills). */
export function originPlaces(routes: BusRoute[]): string[] {
  return [...new Set(routes.map((r) => r.from_place))].sort((a, b) => a.localeCompare(b));
}
```

- [ ] **Step 4 : Lancer le test pour vérifier le succès**

Run: `node scripts/check-bus-departures.mjs`
Expected: PASS, affiche `OK bus-departures 3 4 2`.

- [ ] **Step 5 : Commit**

```bash
git add src/lib/bus-departures.ts scripts/check-bus-departures.mjs
git commit -m "feat(buses): pure bus-departures module + node tests"
```

---

## Task 2 : Composant `PlaceCombobox` (autocomplete)

**Files:**
- Create: `src/components/PlaceCombobox.tsx`

Remplace les `<select>` natifs du planner par un champ tapable filtrant. Pas de dépendance externe (YAGNI).

- [ ] **Step 1 : Écrire le composant**

Créer `src/components/PlaceCombobox.tsx` :

```tsx
"use client";

// Autocomplete de lieux : input filtrant + liste cliquable, clavier (fleches,
// Enter, Escape), fermeture au clic dehors. Zero dependance. La liste des
// lieux est fournie en prop (deja chargee par la page /buses).
import { useEffect, useId, useRef, useState } from "react";

export function PlaceCombobox({
  value, onChange, options, placeholder, ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Sync quand la valeur change de l'exterieur (swap, geoloc, deep-link).
  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = query
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : options.slice(0, 8);

  function commit(v: string) {
    onChange(v); setQuery(v); setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative flex-1 min-w-0">
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Enter" && filtered[active]) { e.preventDefault(); commit(filtered[active]); }
          else if (e.key === "Escape") setOpen(false);
        }}
        className="w-full border border-border rounded-full px-4 py-2.5 text-sm text-text bg-white focus:outline-none focus:ring-2 focus:ring-lagoon/40"
      />
      {open && filtered.length > 0 && (
        <ul id={listId} role="listbox"
          className="absolute z-20 mt-1 w-full max-h-64 overflow-auto bg-white border border-border rounded-2xl shadow-lg py-1 list-none m-0 p-0">
          {filtered.map((o, i) => (
            <li key={o} role="option" aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); commit(o); }}
              onMouseEnter={() => setActive(i)}
              className={`px-4 py-2 text-sm cursor-pointer ${i === active ? "bg-surface text-text" : "text-text"}`}>
              {o}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/components/PlaceCombobox.tsx
git commit -m "feat(buses): PlaceCombobox autocomplete component"
```

---

## Task 3 : Composant `DepartureBoard` (Solari B1)

**Files:**
- Create: `src/components/DepartureBoard.tsx`

- [ ] **Step 1 : Écrire le composant**

Créer `src/components/DepartureBoard.tsx` :

```tsx
"use client";

// Board Solari des prochains departs DEPUIS le lieu actif (modele gare routiere).
// Countdown TZ Athens recalcule chaque minute. Style B1 : fond night, heures sun,
// destinations capitales, badge terra si depart < 15 min. Donnees via lib pure
// bus-departures (deja testee). Spec 2026-06-12-buses-redesign-board-design.md
import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { athensNow } from "@/lib/athens-time";
import { departuresFrom, originPlaces, type DepartureRow } from "@/lib/bus-departures";
import { nearestBy } from "@/lib/geo";
import { slugifyPlace } from "@/lib/bus-pairs";
import { SLUG_COORDS } from "@/lib/taxi-fare";
import { useGeoPosition } from "@/components/geo/useGeoPosition";
import type { BusRoute } from "@/lib/buses";

const HUBS = ["Heraklion", "Chania", "Rethymno", "Agios Nikolaos", "Ierapetra", "Siteia"];
const SOON_MIN = 15;
const PAGE = 8;

const T = {
  departures: { en: "Departures", fr: "Départs", de: "Abfahrten", el: "Αναχωρήσεις" },
  nearMe: { en: "Near me", fr: "Près de moi", de: "In der Nähe", el: "Κοντά μου" },
  inMin: { en: (m: number) => fmtIn(m, "in", "min", "h"), fr: (m: number) => fmtIn(m, "dans", "min", "h"),
    de: (m: number) => fmtIn(m, "in", "Min", "Std"), el: (m: number) => fmtIn(m, "σε", "λ", "ω") },
  tomorrow: { en: "tomorrow", fr: "demain", de: "morgen", el: "αύριο" },
  later: { en: "Show later departures", fr: "Voir les départs suivants", de: "Spätere Abfahrten", el: "Επόμενες αναχωρήσεις" },
  none: { en: "No departures found here.", fr: "Aucun départ trouvé ici.", de: "Keine Abfahrten gefunden.", el: "Δεν βρέθηκαν αναχωρήσεις." },
} as const;
type Ui = keyof typeof T.departures;

function fmtIn(m: number, prefix: string, min: string, hr: string): string {
  if (m < 60) return `${prefix} ${m} ${min}`;
  const h = Math.floor(m / 60), r = m % 60;
  return `${prefix} ${h} ${hr}${r ? ` ${String(r).padStart(2, "0")}` : ""}`;
}

export function DepartureBoard({
  routes, locale, activePlace, onPlaceChange, dateISO, isToday,
}: {
  routes: BusRoute[];
  locale: string;
  activePlace: string;
  onPlaceChange: (p: string) => void;
  dateISO: string;       // jour affiche (today par defaut)
  isToday: boolean;      // false => pas de countdown
}) {
  const ui = (["en", "fr", "de", "el"].includes(locale) ? locale : "en") as Ui;
  const [rows, setRows] = useState<DepartureRow[]>([]);
  const [limit, setLimit] = useState(PAGE);
  const geo = useGeoPosition();

  const places = useMemo(() => originPlaces(routes), [routes]);

  // Recalcul a chaque minute (jour courant) ou une fois (jour futur).
  useEffect(() => {
    function recompute() {
      if (isToday) {
        const { iso, minutes } = athensNow();
        const tomorrowISO = new Date(new Date(`${iso}T12:00:00`).getTime() + 86400000)
          .toISOString().slice(0, 10);
        setRows(departuresFrom(routes, activePlace, iso, minutes, { tomorrowISO }));
      } else {
        setRows(departuresFrom(routes, activePlace, dateISO, null));
      }
    }
    recompute();
    if (!isToday) return;
    const id = setInterval(recompute, 60_000);
    return () => clearInterval(id);
  }, [routes, activePlace, dateISO, isToday]);

  // "Near me" : lieu de depart le plus proche parmi ceux ayant des coords.
  function handleNearMe() {
    if (!geo.pos) { geo.requestGeo(); return; }
    const withCoords = places
      .map((name) => { const s = slugifyPlace(name); const c = s ? SLUG_COORDS[s] : undefined;
        return c ? { name, lat: c[0], lon: c[1] } : null; })
      .filter(Boolean) as Array<{ name: string; lat: number; lon: number }>;
    const nearest = nearestBy(withCoords, (p) => [p.lat, p.lon], geo.pos, 1)[0];
    if (nearest) onPlaceChange(nearest.name);
  }
  useEffect(() => {
    if (geo.status === "granted" && geo.pos) handleNearMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.status]);

  const pills = [...new Set([...HUBS, activePlace])].filter((p) => places.includes(p));
  const visible = rows.slice(0, limit);

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-2">
        <h2 className="font-heading font-bold text-lg text-text">{T.departures[ui]} · {activePlace}</h2>
        {isToday && <span className="text-[10px] font-bold bg-ok/15 text-[#0E7C3A] rounded px-1.5 py-0.5">LIVE</span>}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <button type="button" onClick={handleNearMe}
          className="rounded-full px-3 py-1.5 text-xs font-semibold border-[1.5px] border-lagoon text-lagoon-deep bg-white">
          📍 {T.nearMe[ui]}
        </button>
        {pills.map((p) => (
          <button key={p} type="button" onClick={() => onPlaceChange(p)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold border-[1.5px] ${
              p === activePlace ? "bg-night text-white border-night" : "bg-white text-text border-border"}`}>
            {p}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-3xl bg-night/5 p-5 text-sm text-text-muted">{T.none[ui]}</div>
      ) : (
        <div className="rounded-[22px] bg-night text-white overflow-hidden">
          {visible.map((d) => {
            const soon = d.minutesUntil != null && d.minutesUntil < SOON_MIN;
            const inner = (
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 last:border-0">
                <span className="font-heading font-extrabold text-sun text-base w-[52px] tabular-nums">{d.time}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-[13px] uppercase tracking-wide truncate">{d.toPlace}</span>
                  {d.durationLabel && <span className="block text-[10px] text-sky/80">{d.durationLabel}</span>}
                </span>
                {d.isTomorrow ? (
                  <span className="text-[10px] font-extrabold rounded px-2 py-1 bg-sun text-night">{T.tomorrow[ui]}</span>
                ) : d.minutesUntil != null ? (
                  <span className={`text-[10px] font-extrabold rounded px-2 py-1 ${soon ? "bg-terra text-white" : "bg-sun text-night"}`}>
                    {T.inMin[ui](d.minutesUntil)}
                  </span>
                ) : null}
                <span className="text-[11px] text-sky/80 w-[52px] text-right tabular-nums">
                  {d.priceEur != null ? `${d.priceEur.toFixed(2)}` : ""}
                </span>
              </div>
            );
            return d.pairSlug
              ? <Link key={d.routeId} href={`/buses/${d.pairSlug}`} className="block hover:bg-white/5">{inner}</Link>
              : <div key={d.routeId}>{inner}</div>;
          })}
        </div>
      )}

      {rows.length > limit && (
        <button type="button" onClick={() => setLimit((l) => l + PAGE)}
          className="mt-2 text-xs text-aegean font-semibold hover:underline">
          {T.later[ui]}
        </button>
      )}
    </section>
  );
}
```

- [ ] **Step 2 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: 0 erreur. (Si `nearestBy`/`SLUG_COORDS` ont une signature différente, ajuster l'appel : voir `src/lib/geo.ts` et `src/lib/taxi-fare.ts`.)

- [ ] **Step 3 : Commit**

```bash
git add src/components/DepartureBoard.tsx
git commit -m "feat(buses): DepartureBoard Solari with live countdown"
```

---

## Task 4 : Re-skin `JourneyPlanner` (combobox + chips date + swap)

**Files:**
- Modify: `src/app/[locale]/buses/JourneyPlanner.tsx`

Le moteur d'itinéraires, JourneyCard, TaxiCompare, CarPromo, la géoloc "From here" et le deep-link restent intacts. On change uniquement les contrôles de saisie et on ajoute un état date partagé (chips au lieu de l'input brut).

- [ ] **Step 1 : Ajouter l'import du combobox**

Dans `JourneyPlanner.tsx`, après les imports existants (vers la ligne 24), ajouter :

```tsx
import { PlaceCombobox } from "@/components/PlaceCombobox";
```

- [ ] **Step 2 : Remonter `date` en prop contrôlée**

Le board et le planner doivent partager la date. Remplacer la signature et l'état local `date` :

Remplacer (vers lignes 178-193) la déclaration de `JourneyPlanner({...})` et `const [date, setDate] = useState(todayISO);` par des props :

```tsx
export function JourneyPlanner({
  routes, locale, fromPlace, toPlace, onFromChange, onToChange, date, onDateChange,
}: {
  routes: BusRoute[];
  locale: Locale;
  fromPlace: string;
  toPlace: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  date: string;
  onDateChange: (v: string) => void;
}) {
```

Supprimer la ligne `const [date, setDate] = useState(todayISO);` (la date vient désormais des props). Remplacer tous les `setDate(...)` internes par `onDateChange(...)`.

- [ ] **Step 3 : Remplacer le select From par le combobox + garder le bouton compas**

Remplacer le bloc `<select value={fromPlace} ...>...</select>` (lignes ~269-278) par :

```tsx
<PlaceCombobox
  value={fromPlace}
  onChange={onFromChange}
  options={allPlaces}
  placeholder={`${tp("from", locale)} · ${tp("allPlaces", locale)}`}
  ariaLabel={tp("from", locale)}
/>
```

- [ ] **Step 4 : Remplacer le select To par le combobox**

Remplacer le bloc `<select value={toPlace} ...>...</select>` (lignes ~300-309) par :

```tsx
<PlaceCombobox
  value={toPlace}
  onChange={onToChange}
  options={toOptions}
  placeholder={`${tp("to", locale)} · ${tp("allPlaces", locale)}`}
  ariaLabel={tp("to", locale)}
/>
```

- [ ] **Step 5 : Remplacer l'input date par des chips Today / Tomorrow / Date**

Ajouter ces libellés dans l'objet `TP` (après `date:`, vers ligne 38) :

```tsx
  today: { en: "Today", fr: "Aujourd'hui", de: "Heute", el: "Σήμερα" },
  tomorrow: { en: "Tomorrow", fr: "Demain", de: "Morgen", el: "Αύριο" },
  swap: { en: "swap", fr: "inverser", de: "tauschen", el: "εναλλαγή" },
```

Ajouter ce helper près de `todayISO()` (vers ligne 94) :

```tsx
function tomorrowISO(): string {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
```

Remplacer le bloc `<input type="date" ... />` (lignes ~311-319) par :

```tsx
<div className="flex gap-1.5 items-center flex-wrap">
  {[
    { v: todayISO(), label: tp("today", locale) },
    { v: tomorrowISO(), label: tp("tomorrow", locale) },
  ].map((c) => (
    <button key={c.v} type="button" onClick={() => onDateChange(c.v)}
      className={`rounded-full px-3 py-2 text-sm font-semibold border-[1.5px] ${
        date === c.v ? "bg-night text-white border-night" : "bg-white text-text border-border"}`}>
      {c.label}
    </button>
  ))}
  <input
    type="date"
    value={date}
    min={todayISO()}
    max={maxDateISO()}
    onChange={(e) => e.target.value && onDateChange(e.target.value)}
    aria-label={tp("date", locale)}
    className="border border-border rounded-full px-3 py-2 text-sm text-text bg-white font-data focus:outline-none focus:ring-2 focus:ring-lagoon/40"
  />
</div>
```

- [ ] **Step 6 : Remplacer le bouton Reset par un pill swap + reset texte**

Remplacer le bloc `{(fromPlace || toPlace) && (<button ... ✕ Reset</button>)}` (lignes ~321-328) par :

```tsx
<button type="button" onClick={() => { onFromChange(toPlace); onToChange(fromPlace); }}
  className="text-xs font-semibold text-lagoon-deep border-[1.5px] border-lagoon rounded-full px-3 py-2 shrink-0">
  {tp("swap", locale)}
</button>
{(fromPlace || toPlace) && (
  <button type="button" onClick={() => { onFromChange(""); onToChange(""); }}
    className="text-xs text-text-muted hover:text-text underline shrink-0 px-1">
    {locale === "fr" ? "Effacer" : "Clear"}
  </button>
)}
```

- [ ] **Step 7 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: 0 erreur. (Erreurs attendues côté `BusesClient` tant que Task 6 n'est pas faite : on les corrige en Task 6.)

- [ ] **Step 8 : Commit**

```bash
git add src/app/[locale]/buses/JourneyPlanner.tsx
git commit -m "feat(buses): re-skin planner with combobox, date chips, swap"
```

---

## Task 5 : Composant `RouteLine` (annuaire compacté)

**Files:**
- Create: `src/components/RouteLine.tsx`

Une ligne compacte par route. Les horaires détaillés + liens guides restent dans le DOM (dépliage client), donc le SEO est préservé.

- [ ] **Step 1 : Écrire le composant**

Créer `src/components/RouteLine.tsx` :

```tsx
"use client";

// Ligne compacte d'annuaire : remplace les grosses RouteCard. Horaires + guides
// rendus dans le DOM (replies par defaut), donc indexables. Tap sur le titre =
// page paire si digne. Le but : 292 routes en ~15 ecrans au lieu de 120.
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import type { BusRoute } from "@/lib/buses";
import { pairSlug } from "@/lib/bus-pairs";

export function RouteLine({ route, locale }: { route: BusRoute; locale: string }) {
  const [open, setOpen] = useState(false);
  const deps = route.departures ?? [];
  const range = deps.length > 0 ? `${deps[0]} · ${deps[deps.length - 1]}` : null;
  const slug = pairSlug(route.from_place, route.to_place);
  const count = locale === "fr" ? `${deps.length} départs` : `${deps.length} departures`;

  const title = (
    <span className="font-semibold text-[13px] text-text">
      {route.from_place} <span className="text-lagoon mx-0.5">·</span> {route.to_place}
    </span>
  );

  return (
    <div className="border-b border-border last:border-0">
      <div className="flex items-center gap-3 py-2.5">
        {slug ? <Link href={`/buses/${slug}`} className="flex-1 min-w-0 hover:underline">{title}</Link>
              : <span className="flex-1 min-w-0">{title}</span>}
        <span className="text-[11px] text-text-muted shrink-0">
          {deps.length > 0 ? count : ""}{route.price_eur != null ? ` · ${route.price_eur.toFixed(2)} €` : ""}
        </span>
        {deps.length > 0 && (
          <button type="button" onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="text-[11px] text-aegean font-semibold shrink-0">
            {open ? (locale === "fr" ? "Réduire" : "Hide") : (locale === "fr" ? "Horaires" : "Times")}
          </button>
        )}
      </div>
      {/* Horaires toujours dans le DOM (SEO), masques visuellement si !open */}
      <ul className={`flex flex-wrap gap-1.5 list-none p-0 ${open ? "pb-3" : "hidden"}`}>
        {deps.map((t, i) => (
          <li key={`${t}-${i}`}
            className="px-2 py-1 rounded-[10px] bg-surface border-[1.5px] border-lagoon/30 text-[11px] font-semibold font-data text-text">
            {t}
          </li>
        ))}
      </ul>
      {range && !open && <span className="sr-only">{range}</span>}
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/components/RouteLine.tsx
git commit -m "feat(buses): compact RouteLine for the route directory"
```

---

## Task 6 : Orchestration `BusesClient` (header compact, board, annuaire compacté)

**Files:**
- Modify: `src/app/[locale]/buses/BusesClient.tsx`

- [ ] **Step 1 : Mettre à jour les imports**

En tête de `BusesClient.tsx`, ajouter :

```tsx
import { DepartureBoard } from "@/components/DepartureBoard";
import { RouteLine } from "@/components/RouteLine";
import { athensNow } from "@/lib/athens-time";
```

- [ ] **Step 2 : Ajouter l'état date + lieu actif du board**

Dans le corps de `BusesClient`, après `const [toPlace, setToPlace] = useState("");` (vers ligne 407), ajouter :

```tsx
const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
const isToday = date === new Date().toISOString().slice(0, 10);
// Lieu du board : le From du planner s'il est choisi, sinon le defaut (Heraklion,
// ou la position si la geoloc a deja ete accordee — gere dans DepartureBoard).
const [boardPlace, setBoardPlace] = useState("Heraklion");
useEffect(() => { if (fromPlace) setBoardPlace(fromPlace); }, [fromPlace]);
```

- [ ] **Step 3 : Remplacer le header par la version compacte**

Remplacer le bloc header (lignes ~455-469, le `<div className="mb-8 flex items-start gap-4">...`) par :

```tsx
<div className="mb-6">
  <h1 className="font-heading font-extrabold text-2xl md:text-3xl tracking-tight text-text flex items-center gap-2">
    <CiBus className="w-6 h-6 text-aegean" /> {locale === "fr" ? "Bus en Crète" : "Bus in Crete"}
  </h1>
  <p className="text-text-muted text-sm mt-1">{t("subtitle", locale)}</p>
  {updatedAt && (
    <p className="text-xs text-text-muted mt-0.5">
      {t("updatedOn", locale)} {new Date(updatedAt).toLocaleDateString(locale)}
    </p>
  )}
</div>
```

- [ ] **Step 4 : Passer les nouvelles props au planner et insérer le board**

Remplacer le bloc `<JourneyPlanner .../>` (lignes ~472-479) par :

```tsx
<JourneyPlanner
  routes={routes}
  locale={locale}
  fromPlace={fromPlace}
  toPlace={toPlace}
  onFromChange={setFromPlace}
  onToChange={setToPlace}
  date={date}
  onDateChange={setDate}
/>

<DepartureBoard
  routes={routes}
  locale={locale}
  activePlace={boardPlace}
  onPlaceChange={setBoardPlace}
  dateISO={date}
  isToday={isToday}
/>
```

- [ ] **Step 5 : Remplacer la `Grid` de grosses cartes par une liste de `RouteLine`**

Remplacer la fonction `Grid` interne (lignes ~442-450) par :

```tsx
function RouteList({ list }: { list: BusRoute[] }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-1 shadow-[0_2px_8px_rgba(11,94,120,.06)]">
      {list.map((route) => (
        <RouteLine key={route.id} route={route} locale={locale} />
      ))}
    </div>
  );
}
```

Puis remplacer les appels `<Grid list={...} />` (3 occurrences : recherche, east, west) par `<RouteList list={...} />`. La section `noBusDests` (cartes NoDirectBusCard) : remplacer la grille par une `RouteList`-like simple ou conserver les `NoDirectBusCard` en grille — au choix, mais pour la cohérence visuelle, remplacer par des lignes :

```tsx
{noBusDests.length > 0 && (
  <section className="mb-2">
    <h2 className="text-base font-semibold text-text mb-3">{t("noDirectSection", locale)}</h2>
    <div className="rounded-2xl bg-white px-4 py-1 shadow-[0_2px_8px_rgba(11,94,120,.06)]">
      {noBusDests.map((d) => (
        <div key={d.slug} className="border-b border-border last:border-0 py-2.5 text-[13px]">
          <span className="font-semibold text-text">{d.name}</span>
          <span className="text-xs text-amber-700 ml-2">{t("noDirectBus", locale)}</span>
        </div>
      ))}
    </div>
  </section>
)}
```

- [ ] **Step 6 : Réordonner — carte réseau APRÈS le board**

Le `<BusNetworkMap .../>` (ligne ~482) reste, mais déplacé après les résultats de recherche / au-dessus de l'annuaire. Déplacer la ligne `<BusNetworkMap locale={locale} fromPlace={fromPlace} toPlace={toPlace} />` pour qu'elle soit juste avant le bloc `{hasSearch ? (...)}`. (Le board occupe désormais la place de tête.)

- [ ] **Step 7 : Réduire la taille des titres de section de l'annuaire**

Dans les sections east/west, remplacer `text-lg font-semibold` des `<h2>` par `text-base font-semibold` pour la hiérarchie (le board est le titre principal). Cosmétique, optionnel mais recommandé.

- [ ] **Step 8 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 9 : Build complet**

Run: `npm run build`
Expected: EXIT 0, pages /buses générées.

- [ ] **Step 10 : Commit**

```bash
git add src/app/[locale]/buses/BusesClient.tsx
git commit -m "feat(buses): live station layout — board first, compact directory"
```

---

## Task 7 : Vérification visuelle + SEO + captures pour Kami

**Files:** aucun (vérification).

- [ ] **Step 1 : Lancer le dev server**

Run: `npm run dev` (port par défaut 3000).

- [ ] **Step 2 : Capturer /buses mobile FR + EN**

Script Playwright (adapter le port) capturant `http://localhost:3000/en/buses` et `/fr/buses` en 390×844, écrans haut + scroll. Sauver dans `ui-audit-board/`.
Expected : board Solari visible en tête avec départs plausibles, pills de lieux, planner combobox, annuaire en lignes compactes. Hauteur totale très inférieure à l'actuelle (~15 écrans au lieu de 120).

- [ ] **Step 3 : Vérifier le countdown et le filtre lieu**

Manuellement (ou Playwright) : cliquer une pill ville → le board change de lieu. Vérifier que les heures sont en jaune, le badge passe terra si < 15 min.

- [ ] **Step 4 : Vérifier le SEO (HTML rendu)**

Run (build prod servi ou curl du dev) :
`curl -s http://localhost:3000/en/buses | rg "departures|Heraklion|Chania"`
Expected : les horaires d'au moins une route est et une route ouest sont présents dans le HTML (annuaire rendu, même replié), FAQPage JSON-LD intact.

- [ ] **Step 5 : Lancer les checks node**

Run: `node scripts/check-bus-departures.mjs && node scripts/check-bus-journey.mjs`
Expected : les deux PASS.

- [ ] **Step 6 : Présenter les captures à Kami AVANT merge**

Process mockup-avant-deploy : montrer les captures mobile + desktop à Kami. N'avancer au merge `feat/buses-board → master` qu'après son OK.

- [ ] **Step 7 : Commit des captures (optionnel)**

```bash
git add ui-audit-board/
git commit -m "chore(buses): capture board redesign for review"
```

---

## Self-Review (couverture spec)

- Header compact → Task 6 Step 3 ✓
- Planner autocomplete + From géoloc + chips date + swap → Tasks 2, 4 ✓ (le From géoloc via bouton compas existant reste ; le préremplissage auto se fait côté board)
- Board Solari, countdown live, départs depuis lieu actif, pills + near me, défaut Heraklion/géoloc, tap = page paire, jour futur sans countdown, vide → demain → Tasks 1, 3 ✓
- Carte réseau conservée, repliée mobile → Task 6 Step 6 ✓ (composant inchangé)
- Top routes → **non couvert par une tâche dédiée**. Décision : reporté hors V1 (YAGNI ; l'annuaire compacté + le board couvrent déjà la découverte). À ajouter en V2 si Kami le veut — noté ici explicitement plutôt que laissé en TODO silencieux.
- All routes compacté, HTML conservé → Tasks 5, 6 ✓
- Disclaimer / TaxiCompare / CarPromo / FAQ inchangés → conservés (BusesClient garde le bloc disclaimer ; TaxiCompare/CarPromo sont dans JourneyPlanner, intacts) ✓
- Zéro flèche / em dash → tous les libellés du plan utilisent "·" et des mots ✓
- SEO préservé → Task 7 Step 4 ✓
- Tests → Tasks 1, 7 ✓

**Écart spec assumé :** la section "Top routes" de la spec n'a pas de tâche — repoussée en V2 pour livrer un V1 plus serré. À confirmer avec Kami à la revue.
