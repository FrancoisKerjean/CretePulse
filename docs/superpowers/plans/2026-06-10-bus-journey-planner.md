# Planificateur d'itinéraire bus /buses — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sur `/buses`, l'utilisateur choisit départ → arrivée (liste des destinations atteignables) → date, et obtient itinéraire (horaires du jour, 1 correspondance max) + prix (officiel, curé ou estimé « indicatif »).

**Architecture:** Moteur pur côté client `src/lib/bus-journey.ts` (graphe directionnel sur les `BusRoute[]` déjà chargés par la page, ISR 24 h) + composant `JourneyPlanner` intégré à `BusesClient`. Côté data : extension du scraper VPS (`scripts/scrapers/buses/`) avec un module `prices.py` (plan A : API billetterie herlas si trouvée ; plan B validé : table curée + estimation au km, flag `price_estimated`).

**Tech Stack:** Next.js App Router + TS + Tailwind (existant), Python scraper (requests + pytest), Postgres self-hosted + PostgREST (VPS, container `cretepulse-postgres`), supabase-js côté lecture.

**Spec:** `docs/superpowers/specs/2026-06-10-bus-journey-planner-design.md`

**Conventions repo:** commits auteur `kerjeanfrancois29`, push `master` ET `main` (Vercel suit main). Pas de framework de test TS → scripts d'assertion node (`scripts/check-*.mjs`). Node 25 local : il importe les `.ts` par type-stripping (le moteur n'utilise que de la syntaxe effaçable et `import type`).

---

### Task 1 : Migration `price_estimated`

**Files:**
- Create: `supabase/migrations/20260610190000_bus_routes_price_estimated.sql`

- [ ] **Step 1 : Écrire la migration**

```sql
-- Prix indicatifs (plan B validé Kami 10/06/2026, spec bus-journey-planner) :
-- price_eur peut être officiel (scrape/curation) ou estimé au km.
-- price_estimated=true => l'UI affiche la mention « indicatif ».

alter table bus_routes
  add column if not exists price_estimated boolean not null default false;

-- PostgREST self-hosted : recharger le cache de schema
notify pgrst, 'reload schema';
```

- [ ] **Step 2 : Appliquer sur le VPS**

```bash
ssh kairos-vps "docker exec -i cretepulse-postgres psql -U postgres -d cretepulse" < supabase/migrations/20260610190000_bus_routes_price_estimated.sql
```

Expected: `ALTER TABLE` puis `NOTIFY`.

- [ ] **Step 3 : Vérifier l'exposition PostgREST**

```bash
node -e "const fs=require('fs');for(const l of fs.readFileSync('.env.local','utf8').split(/\r?\n/)){const m=l.match(/^([A-Z_0-9]+)=(.*)$/);if(m)process.env[m[1]]=m[2]}const{createClient}=require('@supabase/supabase-js');createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).from('bus_routes').select('id,price_estimated').limit(1).then(({data,error})=>console.log(error?'FAIL '+error.message:'OK '+JSON.stringify(data)))"
```

Expected: `OK [{"id":...,"price_estimated":false}]`

- [ ] **Step 4 : Commit**

```bash
git add supabase/migrations/20260610190000_bus_routes_price_estimated.sql
git commit -m "feat(buses): colonne price_estimated pour les prix indicatifs"
```

---

### Task 2 : Investigation API billetterie herlas (timebox 0,5 j)

**Files:**
- Create: `scripts/scrapers/buses/PRICES_INVESTIGATION.md` (note de décision)
- Create (si API trouvée): `scripts/scrapers/buses/fixtures/herlas_fare_response.json`

- [ ] **Step 1 : Chercher l'endpoint fare du site Next.js ktelherlas.gr**

Pistes concrètes, dans l'ordre :
1. `curl -A "crete.direct-bot/1.0" https://www.ktelherlas.gr/en/timetables?ds=<fromID>,<toID>` : chercher dans le HTML un `__NEXT_DATA__` contenant `price`/`fare` (les IDs `ds=` sont déjà connus du scraper horaires, cf `parse_herlas_index`).
2. Lister les routes API du build Next : chercher `"/api/` et `buildId` dans le HTML, tester `https://www.ktelherlas.gr/_next/data/<buildId>/en/timetables.json?ds=...`.
3. Flux de réservation de l'appli (Google Play `gr.ktelherlas.app`) : tester les hôtes évidents `api.ktelherlas.gr`, `tickets.ktelherlas.gr` (GET simple, pas d'auth brute-force).

- [ ] **Step 2 : Documenter la décision**

Écrire `PRICES_INVESTIGATION.md` : ce qui a été testé, ce qui répond, décision **plan A** (endpoint + format, committer une réponse réelle dans `fixtures/herlas_fare_response.json`) ou **plan B** (rien d'exploitable → estimation, déjà validée par Kami).

- [ ] **Step 3 : Commit**

```bash
git add scripts/scrapers/buses/PRICES_INVESTIGATION.md scripts/scrapers/buses/fixtures/herlas_fare_response.json
git commit -m "docs(buses): investigation API billetterie herlas (decision plan A/B prix)"
```

(Si plan A retenu : `fetch_official_fares()` de la Task 3 sera implémentée contre la fixture au lieu de retourner `{}`.)

---

### Task 3 : Recouper la table de prix curée

**Files:**
- Modify: `scripts/scrapers/buses/PRICES_INVESTIGATION.md` (section « Prix curés, sources »)

- [ ] **Step 1 : Vérifier chaque liaison principale sur 2 sources web**

WebFetch sur `https://www.greeka.com/crete/heraklion/car-bus/` et `https://www.greeka.com/crete/lassithi/car-bus/` (+ rome2rio par liaison si doute). Liaisons à couvrir (est, intercity) :
Heraklion ↔ Agios Nikolaos, Ierapetra, Sitia, Malia, Hersonissos, Matala, Moires, Anogeia, Ano Viannos, Kokkini Hani ; Agios Nikolaos ↔ Sitia, Ierapetra, Elounda, Kritsa ; Ierapetra ↔ Makry Gyalos, Myrtos, Sitia.

Valeurs de départ connues (10/06/2026, source greeka.com, à recouper) : Heraklion→Kokkini Hani 2,10 €, →Malia 4,20 €, →Matala 8,50 €, →Chania 15,00 € (cohérent DB ektel).

- [ ] **Step 2 : Consigner le tableau final (liaison, prix, source, date) dans PRICES_INVESTIGATION.md et commit**

```bash
git add scripts/scrapers/buses/PRICES_INVESTIGATION.md
git commit -m "docs(buses): table de prix curee est-Crete, sources recoupees"
```

---

### Task 4 : Module `prices.py` du scraper (TDD)

**Files:**
- Create: `scripts/scrapers/buses/prices.py`
- Create: `scripts/scrapers/buses/test_prices.py`
- Modify: `scripts/scrapers/buses/store.py` (champ `price_estimated`)
- Modify: `scripts/scrapers/buses/buses.py` (wiring `enrich_prices`)
- Modify: `scripts/scrapers/buses/test_store.py` (champ dans normalize)

- [ ] **Step 1 : Écrire les tests qui échouent**

```python
# test_prices.py
from prices import (
    CURATED_PRICES, PLACE_COORDS, lookup_curated, estimate_price, enrich_prices,
)


def test_lookup_curated_is_symmetric():
    assert lookup_curated("Heraklion", "Malia") == lookup_curated("Malia", "Heraklion")
    assert lookup_curated("Heraklion", "Malia") is not None


def test_estimate_price_known_coords_plausible():
    # Heraklion -> Sitia ~ 100 km a vol d'oiseau : prix entre 8 et 20 EUR, arrondi 0.10
    p = estimate_price("Heraklion", "Siteia")
    assert p is not None and 8.0 <= p <= 20.0
    assert round(p * 10) == p * 10


def test_estimate_price_unknown_place_returns_none():
    assert estimate_price("Heraklion", "A1 Super Market Nowhere") is None


def test_enrich_keeps_official_price():
    routes = [{"from_place": "Chania", "to_place": "Rethymno", "price_eur": 6.2}]
    enrich_prices(routes)
    assert routes[0]["price_eur"] == 6.2
    assert routes[0]["price_estimated"] is False


def test_enrich_prefers_curated_over_estimate():
    routes = [{"from_place": "Heraklion", "to_place": "Malia", "price_eur": None}]
    enrich_prices(routes)
    assert routes[0]["price_eur"] == lookup_curated("Heraklion", "Malia")
    assert routes[0]["price_estimated"] is False


def test_enrich_estimates_when_no_curated():
    routes = [{"from_place": "Heraklion", "to_place": "Mochos", "price_eur": None}]
    enrich_prices(routes)
    assert routes[0]["price_eur"] is not None
    assert routes[0]["price_estimated"] is True


def test_enrich_leaves_none_when_unknown_coords():
    routes = [{"from_place": "Blue Bay", "to_place": "Zorbas Village", "price_eur": None}]
    enrich_prices(routes)
    assert routes[0]["price_eur"] is None
    assert routes[0]["price_estimated"] is False
```

- [ ] **Step 2 : Vérifier qu'ils échouent**

```bash
cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_prices.py -q
```

Expected: `ModuleNotFoundError: No module named 'prices'`

- [ ] **Step 3 : Implémenter `prices.py`**

```python
"""Prix des routes bus (est-Crete, herlas).

Plan A : tarifs officiels via l'API billetterie ktelherlas (voir
PRICES_INVESTIGATION.md). Si aucune API exploitable, fetch_official_fares
retourne {} et le plan B s'applique.
Plan B (valide Kami 10/06/2026) :
  1. CURATED_PRICES : liaisons principales, sources recoupees (greeka.com,
     rome2rio, consultees 10/06/2026) -> price_estimated=False.
  2. Estimation au km : haversine entre PLACE_COORDS, tarif BASE + EUR_PER_KM
     calibre sur les prix cures -> price_estimated=True, l'UI affiche
     « indicatif ».
  3. Coordonnees inconnues -> pas de prix (UI : « tarif au guichet »).
"""
from math import asin, cos, radians, sin, sqrt

# (from, to) en minuscules ; lookup symetrique. Source: PRICES_INVESTIGATION.md
CURATED_PRICES: dict[tuple[str, str], float] = {
    ("heraklion", "kokkini hani"): 2.10,
    ("heraklion", "malia"): 4.20,
    ("heraklion", "hersonisos"): 3.80,
    ("heraklion", "matala"): 8.50,
    ("heraklion", "moires"): 7.10,
    ("heraklion", "agios nikolaos"): 8.30,
    ("heraklion", "ierapetra"): 12.10,
    ("heraklion", "siteia"): 15.10,
    ("heraklion", "anogeia"): 4.50,
    ("heraklion", "ano viannos"): 7.60,
    ("agios nikolaos", "siteia"): 8.30,
    ("agios nikolaos", "ierapetra"): 4.10,
    ("agios nikolaos", "eloynta"): 1.90,
    ("agios nikolaos", "kritsa"): 1.90,
    ("ierapetra", "makry gyalos"): 4.10,
    ("ierapetra", "myrtos"): 2.30,
    ("ierapetra", "siteia"): 6.90,
}
# NB : valeurs a figer en Task 3 (sources recoupees) avant de merger.

# Lieux principaux est-Crete (lat, lng). Couvre les liaisons intercity ;
# les arrets hotels/supermarches restent sans prix (tarif au guichet).
PLACE_COORDS: dict[str, tuple[float, float]] = {
    "heraklion": (35.3387, 25.1442),
    "agios nikolaos": (35.1909, 25.7136),
    "ierapetra": (35.0114, 25.7411),
    "siteia": (35.2078, 26.1029),
    "malia": (35.2853, 25.4624),
    "hersonisos": (35.3186, 25.3928),
    "matala": (34.9959, 24.7492),
    "moires": (35.0511, 24.8728),
    "anogeia": (35.2899, 24.8826),
    "ano viannos": (35.0461, 25.4067),
    "kokkini hani": (35.3306, 25.2419),
    "eloynta": (35.2576, 25.7204),
    "kritsa": (35.1601, 25.6471),
    "makry gyalos": (35.0394, 25.9728),
    "myrtos": (35.0042, 25.5879),
    "mochos": (35.2864, 25.4427),
    "stalida": (35.2937, 25.4378),
    "sisi": (35.3092, 25.5237),
    "gouves": (35.3271, 25.3066),
    "tympaki": (35.0719, 24.7681),
    "agia galini": (35.0967, 24.6906),
    "faistos": (35.0514, 24.8136),
    "arkalochori": (35.1481, 25.2622),
    "kastelli pediados": (35.2069, 25.3361),
    "ano archanes": (35.2381, 25.1611),
    "thrapsano": (35.2167, 25.2833),
    "myrtia": (35.2433, 25.2103),
    "zakros": (35.0989, 26.2186),
    "palaiokastro sitia": (35.1986, 26.2486),
    "ziros": (35.0931, 26.1306),
    "mochlos": (35.1856, 25.9061),
    "kalo chorio lasithioy": (35.1497, 25.7956),
    "ferma": (35.0119, 25.8003),
    "peykos": (35.0306, 25.5169),
    "sykologos": (35.0292, 25.4831),
    "mesochorio": (35.0394, 25.3550),
    "demati": (35.0617, 25.3083),
    "chania": (35.5138, 24.0180),
    "rethymno": (35.3644, 24.4821),
}

BASE_FARE = 1.20    # plancher (ticket zone urbaine herlas)
EUR_PER_KM = 0.115  # calibre sur CURATED_PRICES (cf test_eur_per_km_calibration)


def _norm(place: str) -> str:
    return place.lower().strip()


def haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lng1, lat2, lng2 = map(radians, (a[0], a[1], b[0], b[1]))
    h = sin((lat2 - lat1) / 2) ** 2 + cos(lat1) * cos(lat2) * sin((lng2 - lng1) / 2) ** 2
    return 2 * 6371.0 * asin(sqrt(h))


def lookup_curated(from_place: str, to_place: str) -> float | None:
    key = (_norm(from_place), _norm(to_place))
    return CURATED_PRICES.get(key) or CURATED_PRICES.get((key[1], key[0]))


def estimate_price(from_place: str, to_place: str) -> float | None:
    ca, cb = PLACE_COORDS.get(_norm(from_place)), PLACE_COORDS.get(_norm(to_place))
    if not ca or not cb:
        return None
    km = haversine_km(ca, cb)
    return max(BASE_FARE, round((BASE_FARE + km * EUR_PER_KM) * 10) / 10)


def fetch_official_fares() -> dict[tuple[str, str], float]:
    """Plan A : tarifs officiels par paire d'arrets via l'API billetterie.
    Aucune API exploitable identifiee (PRICES_INVESTIGATION.md) -> {}."""
    return {}


def enrich_prices(routes: list[dict]) -> list[dict]:
    """Complete price_eur/price_estimated in-place. Priorite :
    prix deja scrape > officiel API > cure > estime > rien."""
    official = fetch_official_fares()
    for r in routes:
        if r.get("price_eur") is not None:
            r["price_estimated"] = False
            continue
        key = (_norm(r["from_place"]), _norm(r["to_place"]))
        off = official.get(key) or official.get((key[1], key[0]))
        if off is not None:
            r["price_eur"], r["price_estimated"] = off, False
            continue
        cur = lookup_curated(r["from_place"], r["to_place"])
        if cur is not None:
            r["price_eur"], r["price_estimated"] = cur, False
            continue
        est = estimate_price(r["from_place"], r["to_place"])
        if est is not None:
            r["price_eur"], r["price_estimated"] = est, True
        else:
            r["price_eur"], r["price_estimated"] = None, False
    return routes
```

(Si la Task 2 a retenu le plan A : implémenter `fetch_official_fares` contre `fixtures/herlas_fare_response.json` avec un test pytest dédié, même pattern que les parsers existants.)

- [ ] **Step 4 : Ajouter un test de calibration du EUR_PER_KM**

```python
# test_prices.py (suite)
from prices import BASE_FARE, EUR_PER_KM, PLACE_COORDS, haversine_km


def test_eur_per_km_calibration():
    """EUR_PER_KM doit rester proche du ratio moyen des prix cures (±25 %)."""
    ratios = []
    for (a, b), price in CURATED_PRICES.items():
        if a in PLACE_COORDS and b in PLACE_COORDS:
            km = haversine_km(PLACE_COORDS[a], PLACE_COORDS[b])
            if km > 5:
                ratios.append((price - BASE_FARE) / km)
    mean = sum(ratios) / len(ratios)
    assert abs(EUR_PER_KM - mean) / mean < 0.25, f"recalibrer EUR_PER_KM ~ {mean:.3f}"
```

- [ ] **Step 5 : Lancer les tests**

```bash
cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_prices.py -q
```

Expected: tous PASS (ajuster `EUR_PER_KM` à la valeur moyenne affichée si la calibration échoue).

- [ ] **Step 6 : Brancher dans `store.py` et `buses.py`**

`store.py`, dans `normalize_for_db`, ajouter après `"price_eur"` :

```python
        "price_estimated": r.get("price_estimated", False),
```

`buses.py` :

```python
from prices import enrich_prices
```

et dans `scrape_herlas()`, dernière ligne :

```python
    return enrich_prices(_attach_to_slug(routes))
```

et dans `scrape_ektel()`, dernière ligne :

```python
    return enrich_prices(_attach_to_slug(all_routes))
```

`test_store.py` : dans le test de `normalize_for_db`, ajouter l'assertion :

```python
    assert rows[0]["price_estimated"] is False
```

- [ ] **Step 7 : Relancer toute la suite**

```bash
cd scripts/scrapers/buses && .venv/Scripts/python -m pytest -q
```

Expected: tous PASS (les tests parsers/store existants ne doivent pas casser).

- [ ] **Step 8 : Commit**

```bash
git add scripts/scrapers/buses/prices.py scripts/scrapers/buses/test_prices.py scripts/scrapers/buses/store.py scripts/scrapers/buses/buses.py scripts/scrapers/buses/test_store.py
git commit -m "feat(buses): prix cures + estimation au km dans le scraper (plan B, flag price_estimated)"
```

---

### Task 5 : Déployer le scraper et remplir les prix en DB

**Files:** aucun (ops VPS)

- [ ] **Step 1 : Copier le code sur le VPS et lancer**

```bash
scp scripts/scrapers/buses/prices.py scripts/scrapers/buses/store.py scripts/scrapers/buses/buses.py kairos-vps:/opt/cretepulse/buses/
ssh kairos-vps "cd /opt/cretepulse && venv/bin/python buses/buses.py"
```

Expected: `OK herlas: ~224 routes written`, `OK ektel: ...`, pas d'alerte Telegram.

- [ ] **Step 2 : Vérifier la couverture prix en DB**

```bash
node -e "const fs=require('fs');for(const l of fs.readFileSync('.env.local','utf8').split(/\r?\n/)){const m=l.match(/^([A-Z_0-9]+)=(.*)$/);if(m)process.env[m[1]]=m[2]}const{createClient}=require('@supabase/supabase-js');createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).from('bus_routes').select('price_eur,price_estimated').then(({data})=>{const p=data.filter(r=>r.price_eur!=null);console.log('avec prix:',p.length,'/',data.length,'| estimes:',p.filter(r=>r.price_estimated).length)})"
```

Expected: nette amélioration vs 6/230 (cible : >150 routes avec prix, le solde = arrêts hôtels sans coordonnées).

---

### Task 6 : Type `BusRoute.price_estimated` côté site

**Files:**
- Modify: `src/lib/buses.ts:16` (interface `BusRoute`)

- [ ] **Step 1 : Ajouter le champ**

Dans `src/lib/buses.ts`, interface `BusRoute`, après `price_eur: number | null;` :

```ts
  price_estimated: boolean | null;
```

- [ ] **Step 2 : Vérifier**

```bash
npx tsc --noEmit
```

Expected: 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/lib/buses.ts
git commit -m "feat(buses): expose price_estimated dans BusRoute"
```

---

### Task 7 : Moteur `src/lib/bus-journey.ts` (assertions d'abord)

**Files:**
- Create: `src/lib/bus-journey.ts`
- Create: `scripts/check-bus-journey.mjs`

**Contrainte :** `bus-journey.ts` n'importe RIEN à l'exécution (uniquement `import type`), pour rester exécutable par node via le check script et testable sans DB.

- [ ] **Step 1 : Écrire le script d'assertions (échoue d'abord)**

```js
// scripts/check-bus-journey.mjs
// Assertions sur fixtures synthetiques. Run: node scripts/check-bus-journey.mjs
// (Node >= 23 : importe le .ts par type-stripping)
import assert from "node:assert/strict";
import {
  dayToken, timesForDate, parseDurationMin, addMinutes,
  buildGraph, reachableFrom, findJourneys,
} from "../src/lib/bus-journey.ts";

const R = (id, from, to, extra = {}) => ({
  id, operator_id: "herlas", from_place: from, to_place: to, to_slug: null,
  season: "all", duration: null, price_eur: null, price_estimated: false,
  frequency: null, departures: null, departures_by_day: null,
  source_url: "x", scraped_at: "2026-06-10", ...extra,
});

// --- helpers date/heure -----------------------------------------------------
assert.equal(dayToken("2026-06-14"), "Sun");
assert.equal(dayToken("2026-06-10"), "Wed");
assert.equal(parseDurationMin("2h 30min"), 150);
assert.equal(parseDurationMin("50min"), 50);
assert.equal(parseDurationMin("1h"), 60);
assert.equal(parseDurationMin(null), null);
assert.equal(addMinutes("08:30", 105), "10:15");

// --- horaires du jour --------------------------------------------------------
const weekSun = R(1, "Heraklion", "Ierapetra", {
  departures: ["07:00", "09:00", "18:00"],
  departures_by_day: [
    { days: "Mon, Tue, Wed, Thu, Fri, Sat", times: ["07:00", "09:00"] },
    { days: "Sun", times: ["18:00"] },
  ],
});
assert.deepEqual(timesForDate(weekSun, "2026-06-10"), ["07:00", "09:00"]); // mercredi
assert.deepEqual(timesForDate(weekSun, "2026-06-14"), ["18:00"]);          // dimanche
assert.deepEqual(
  timesForDate(R(2, "A", "B", { departures: ["10:00"] }), "2026-06-10"),
  ["10:00"],
); // fallback flat
assert.deepEqual(
  timesForDate(R(3, "A", "B", {
    departures: ["06:00"],
    departures_by_day: [{ days: "EVERY DAY", times: ["06:00"] }],
  }), "2026-06-14"),
  ["06:00"],
);
assert.deepEqual(
  timesForDate(R(4, "A", "B", {
    departures: ["06:00"],
    departures_by_day: [{ days: "Mon-Fri", times: ["06:00"] }],
  }), "2026-06-13"),
  [],
); // samedi hors plage Mon-Fri

// --- graphe / atteignabilite -------------------------------------------------
const routes = [
  R(10, "Makry Gyalos", "Ierapetra", {
    departures: ["08:00", "14:00"],
    departures_by_day: [{ days: "EVERY DAY", times: ["08:00", "14:00"] }],
    duration: "40min", price_eur: 4.1,
  }),
  R(11, "Ierapetra", "Heraklion", {
    departures: ["07:30", "09:30", "15:30"],
    departures_by_day: [{ days: "EVERY DAY", times: ["07:30", "09:30", "15:30"] }],
    price_eur: 12.1,
  }),
  R(12, "Heraklion", "Ierapetra", {
    departures: ["08:15"],
    departures_by_day: [{ days: "EVERY DAY", times: ["08:15"] }],
    price_eur: 12.1,
  }),
  R(13, "Heraklion", "Mochos", {
    departures: ["11:00"],
    departures_by_day: [{ days: "Mon, Tue, Wed, Thu, Fri, Sat", times: ["11:00"] }],
    price_eur: 4.6, price_estimated: true,
  }),
];
const g = buildGraph(routes);

const reach = reachableFrom(g, "Makry Gyalos");
assert.ok(reach.includes("Ierapetra"));           // direct
assert.ok(reach.includes("Heraklion"));           // 1 correspondance
assert.ok(!reach.includes("Makry Gyalos"));       // pas soi-meme

// --- direct ------------------------------------------------------------------
const direct = findJourneys(g, "Heraklion", "Ierapetra", "2026-06-10");
assert.equal(direct.length, 1);
assert.equal(direct[0].legs.length, 1);
assert.deepEqual(direct[0].legs[0].times, ["08:15"]);
assert.equal(direct[0].priceTotal, 12.1);
assert.equal(direct[0].priceEstimated, false);

// --- correspondance avec marge 15 min ----------------------------------------
const via = findJourneys(g, "Makry Gyalos", "Heraklion", "2026-06-10");
assert.equal(via.length, 1);
assert.equal(via[0].hub, "Ierapetra");
assert.equal(via[0].legs.length, 2);
// arrivee 08:40 (+15 min marge = 08:55) -> 09:30 et 15:30 valides, pas 07:30
assert.deepEqual(via[0].legs[1].times, ["09:30", "15:30"]);
assert.equal(via[0].priceTotal, 16.2);
assert.equal(via[0].durationKnown, true);

// --- pas de service ce jour --------------------------------------------------
assert.equal(findJourneys(g, "Heraklion", "Mochos", "2026-06-14").length, 0); // dimanche
// --- prix estime propage -----------------------------------------------------
const est = findJourneys(g, "Heraklion", "Mochos", "2026-06-10");
assert.equal(est[0].priceEstimated, true);
// --- inconnu -----------------------------------------------------------------
assert.equal(findJourneys(g, "Heraklion", "Nulle Part", "2026-06-10").length, 0);

console.log("OK check-bus-journey: toutes les assertions passent");
```

- [ ] **Step 2 : Vérifier qu'il échoue**

```bash
node scripts/check-bus-journey.mjs
```

Expected: `Cannot find module '../src/lib/bus-journey.ts'`

- [ ] **Step 3 : Implémenter `src/lib/bus-journey.ts`**

```ts
// Moteur d'itineraire bus : fonctions pures, zero I/O (import type uniquement),
// executees cote client sur les routes deja chargees par la page /buses.
// Teste par scripts/check-bus-journey.mjs (node, type-stripping).
import type { BusRoute } from "./buses";

export interface JourneyLeg {
  route: BusRoute;
  /** Departs du jour choisi (filtres par la marge de correspondance pour le tronçon 2). */
  times: string[];
}

export interface Journey {
  legs: JourneyLeg[];           // 1 = direct, 2 = correspondance
  hub: string | null;           // lieu de correspondance
  priceTotal: number | null;    // null si un tronçon n'a pas de prix
  priceEstimated: boolean;      // au moins un tronçon estime -> mention « indicatif »
  priceIncomplete: boolean;     // au moins un tronçon sans prix -> « + tarif au guichet »
  durationKnown: boolean;       // duree tronçon 1 connue -> correspondance filtree
}

const DAY_TOKENS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const TRANSFER_MARGIN_MIN = 15;
const MAX_JOURNEYS = 3;

/** Jour de semaine ("Mon".."Sun") d'une date calendaire YYYY-MM-DD. */
export function dayToken(dateISO: string): string {
  return DAY_TOKENS[new Date(`${dateISO}T12:00:00Z`).getUTCDay()];
}

/** "2h 30min" -> 150 ; "50min" -> 50 ; "1h" -> 60 ; sinon null. */
export function parseDurationMin(duration: string | null): number | null {
  if (!duration) return null;
  const h = duration.match(/(\d+)\s*h/i);
  const m = duration.match(/(\d+)\s*min/i);
  if (!h && !m) return null;
  return (h ? parseInt(h[1], 10) * 60 : 0) + (m ? parseInt(m[1], 10) : 0);
}

export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Le libelle de jours KTEL ("Mon, Tue, ...", "Sun", "Mon-Fri", "EVERY DAY") couvre-t-il ce jour ? */
function daysMatch(days: string, day: string): boolean {
  const norm = days.toLowerCase();
  if (norm.includes("every") || norm.includes("daily")) return true;
  const d = day.toLowerCase();
  const range = norm.match(/(mon|tue|wed|thu|fri|sat|sun)\s*[-–]\s*(mon|tue|wed|thu|fri|sat|sun)/);
  if (range) {
    const i = DAY_ORDER.indexOf(range[1]);
    const j = DAY_ORDER.indexOf(range[2]);
    const k = DAY_ORDER.indexOf(d);
    return i <= j ? k >= i && k <= j : k >= i || k <= j;
  }
  return norm.includes(d);
}

/** Departs de la route pour une date donnee (sous-grille du jour, fallback flat). */
export function timesForDate(route: BusRoute, dateISO: string): string[] {
  const day = dayToken(dateISO);
  const groups = route.departures_by_day;
  if (groups && groups.length > 0) {
    const out = new Set<string>();
    for (const g of groups) {
      if (daysMatch(g.days, day)) for (const t of g.times) out.add(t);
    }
    return [...out].sort();
  }
  return route.departures ?? [];
}

export interface BusGraph {
  routes: BusRoute[];
  byFrom: Map<string, BusRoute[]>;
}

export function buildGraph(routes: BusRoute[]): BusGraph {
  const byFrom = new Map<string, BusRoute[]>();
  for (const r of routes) {
    const list = byFrom.get(r.from_place) ?? [];
    list.push(r);
    byFrom.set(r.from_place, list);
  }
  return { routes, byFrom };
}

/** Destinations atteignables (direct ou 1 correspondance), triees, sans le depart. */
export function reachableFrom(g: BusGraph, from: string): string[] {
  const out = new Set<string>();
  for (const r1 of g.byFrom.get(from) ?? []) {
    out.add(r1.to_place);
    for (const r2 of g.byFrom.get(r1.to_place) ?? []) out.add(r2.to_place);
  }
  out.delete(from);
  return [...out].sort((a, b) => a.localeCompare(b));
}

export function findJourneys(g: BusGraph, from: string, to: string, dateISO: string): Journey[] {
  const directs: Journey[] = [];
  for (const r of g.byFrom.get(from) ?? []) {
    if (r.to_place !== to) continue;
    const times = timesForDate(r, dateISO);
    if (times.length === 0) continue;
    directs.push(makeJourney([{ route: r, times }], null));
  }
  if (directs.length > 0) return directs.slice(0, MAX_JOURNEYS);

  const transfers: Journey[] = [];
  for (const r1 of g.byFrom.get(from) ?? []) {
    if (r1.to_place === to) continue;
    const t1 = timesForDate(r1, dateISO);
    if (t1.length === 0) continue;
    for (const r2 of g.byFrom.get(r1.to_place) ?? []) {
      if (r2.to_place !== to) continue;
      let t2 = timesForDate(r2, dateISO);
      if (t2.length === 0) continue;
      const dur = parseDurationMin(r1.duration);
      if (dur != null) {
        const earliestArrival = addMinutes(t1[0], dur + TRANSFER_MARGIN_MIN);
        t2 = t2.filter((t) => t >= earliestArrival);
        if (t2.length === 0) continue;
      }
      transfers.push(makeJourney([{ route: r1, times: t1 }, { route: r2, times: t2 }], r1.to_place));
    }
  }
  // un seul itineraire par hub, les mieux desservis d'abord
  const byHub = new Map<string, Journey>();
  for (const j of transfers) {
    const prev = byHub.get(j.hub!);
    if (!prev || score(j) > score(prev)) byHub.set(j.hub!, j);
  }
  return [...byHub.values()].sort((a, b) => score(b) - score(a)).slice(0, MAX_JOURNEYS);
}

function score(j: Journey): number {
  return j.legs.reduce((n, l) => n + l.times.length, 0);
}

function makeJourney(legs: JourneyLeg[], hub: string | null): Journey {
  const prices = legs.map((l) => l.route.price_eur);
  const priceIncomplete = prices.some((p) => p == null);
  const priceTotal = priceIncomplete
    ? null
    : Math.round(prices.reduce((s, p) => s! + p!, 0)! * 100) / 100;
  return {
    legs,
    hub,
    priceTotal,
    priceEstimated: legs.some((l) => l.route.price_estimated === true),
    priceIncomplete,
    durationKnown: parseDurationMin(legs[0].route.duration) != null,
  };
}
```

- [ ] **Step 4 : Lancer les assertions**

```bash
node scripts/check-bus-journey.mjs
```

Expected: `OK check-bus-journey: toutes les assertions passent`

- [ ] **Step 5 : Vérifier les types**

```bash
npx tsc --noEmit
```

Expected: 0 erreur.

- [ ] **Step 6 : Commit**

```bash
git add src/lib/bus-journey.ts scripts/check-bus-journey.mjs
git commit -m "feat(buses): moteur d'itineraire pur (direct + 1 correspondance, horaires par jour)"
```

---

### Task 8 : Composant `JourneyPlanner` + intégration `BusesClient`

**Files:**
- Create: `src/app/[locale]/buses/JourneyPlanner.tsx`
- Modify: `src/app/[locale]/buses/BusesClient.tsx` (remplacer la carte de recherche, lignes ~447-484)

- [ ] **Step 1 : Créer `JourneyPlanner.tsx`**

```tsx
"use client";

// Planificateur d'itineraire : depart -> arrivees atteignables -> date ->
// itineraire(s) + prix. Calcul 100 % local (moteur bus-journey, routes deja
// chargees par la page). Spec : docs/superpowers/specs/2026-06-10-bus-journey-planner-design.md
import { useMemo, useState } from "react";
import { ArrowRight, Bus, Clock, Euro, Info } from "lucide-react";
import type { Locale } from "@/lib/types";
import type { BusRoute } from "@/lib/buses";
import {
  buildGraph, reachableFrom, findJourneys, parseDurationMin,
  type Journey, type JourneyLeg,
} from "@/lib/bus-journey";

const TP = {
  searchTitle: {
    en: "Plan your journey", fr: "Préparez votre trajet",
    de: "Fahrt planen", el: "Σχεδιάστε τη διαδρομή σας",
  },
  from: { en: "From", fr: "Départ", de: "Von", el: "Από" },
  to: { en: "To", fr: "Arrivée", de: "Nach", el: "Προς" },
  date: { en: "Date", fr: "Date", de: "Datum", el: "Ημερομηνία" },
  allPlaces: { en: "All places", fr: "Tous les lieux", de: "Alle Orte", el: "Όλα τα μέρη" },
  yourJourney: {
    en: "Your journey", fr: "Votre itinéraire", de: "Ihre Verbindung", el: "Η διαδρομή σας",
  },
  via: { en: "Change at", fr: "Correspondance à", de: "Umstieg in", el: "Αλλαγή στο" },
  departuresThatDay: {
    en: "Departures on that day", fr: "Départs ce jour-là",
    de: "Abfahrten an diesem Tag", el: "Αναχωρήσεις εκείνη την ημέρα",
  },
  total: { en: "Total", fr: "Total", de: "Gesamt", el: "Σύνολο" },
  indicative: { en: "indicative", fr: "indicatif", de: "Richtwert", el: "ενδεικτική" },
  atTicketOffice: {
    en: "+ fare at the ticket office for one leg",
    fr: "+ tarif au guichet pour un tronçon",
    de: "+ Fahrpreis am Schalter für einen Abschnitt",
    el: "+ εισιτήριο στο εκδοτήριο για ένα σκέλος",
  },
  connectionNotGuaranteed: {
    en: "Leg durations unknown – allow time for the connection, it is not guaranteed.",
    fr: "Durées inconnues – prévoyez de la marge, la correspondance n'est pas garantie.",
    de: "Fahrzeiten unbekannt – Puffer einplanen, der Anschluss ist nicht garantiert.",
    el: "Άγνωστη διάρκεια – αφήστε περιθώριο, η ανταπόκριση δεν είναι εγγυημένη.",
  },
  noServiceThatDay: {
    en: "No departure on that date – try another day.",
    fr: "Pas de départ à cette date – essayez un autre jour.",
    de: "Keine Abfahrt an diesem Datum – anderen Tag versuchen.",
    el: "Καμία αναχώρηση εκείνη την ημερομηνία – δοκιμάστε άλλη μέρα.",
  },
  noRoute: {
    en: "No route found (direct or with one change). Try reversing origin and destination.",
    fr: "Aucun trajet trouvé (direct ou avec une correspondance). Essayez d'inverser départ et arrivée.",
    de: "Keine Verbindung gefunden (direkt oder mit Umstieg). Start und Ziel tauschen.",
    el: "Δεν βρέθηκε διαδρομή (άμεση ή με ανταπόκριση). Αντιστρέψτε αφετηρία και προορισμό.",
  },
  westPartial: {
    en: "West Crete data is partial for now – see KTEL Chania-Rethymno for full schedules.",
    fr: "Les données Crète ouest sont partielles pour l'instant – voir KTEL La Canée-Rethymnon.",
    de: "Westkreta-Daten sind derzeit unvollständig – siehe KTEL Chania-Rethymno.",
    el: "Τα δεδομένα δυτικής Κρήτης είναι ελλιπή προς το παρόν – δείτε ΚΤΕΛ Χανίων-Ρεθύμνου.",
  },
  priceMethodo: {
    en: "Prices marked “indicative” are estimated from distance; others come from operators or published fares.",
    fr: "Les prix « indicatifs » sont estimés à partir de la distance ; les autres viennent des opérateurs ou de grilles publiées.",
    de: "Mit „Richtwert“ markierte Preise sind aus der Entfernung geschätzt; andere stammen von Betreibern oder veröffentlichten Tarifen.",
    el: "Οι «ενδεικτικές» τιμές εκτιμώνται από την απόσταση· οι υπόλοιπες προέρχονται από τους φορείς ή δημοσιευμένους τιμοκαταλόγους.",
  },
  duration: { en: "Duration", fr: "Durée", de: "Dauer", el: "Διάρκεια" },
} as const satisfies Record<string, Record<Locale, string>>;

function tp(key: keyof typeof TP, locale: Locale): string {
  return TP[key][locale] ?? TP[key].en;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function maxDateISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 60);
  return d.toISOString().slice(0, 10);
}

function LegRow({ leg, locale }: { leg: JourneyLeg; locale: Locale }) {
  const dur = parseDurationMin(leg.route.duration);
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 flex-wrap text-sm font-semibold text-text">
        <Bus className="w-4 h-4 text-aegean shrink-0" />
        <span>{leg.route.from_place}</span>
        <ArrowRight className="w-3.5 h-3.5 text-text-muted shrink-0" />
        <span>{leg.route.to_place}</span>
        {dur != null && (
          <span className="text-xs font-normal text-text-muted inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> {leg.route.duration}
          </span>
        )}
        {leg.route.price_eur != null && (
          <span className="text-xs font-normal text-text-muted">
            {leg.route.price_eur.toFixed(2)} €
            {leg.route.price_estimated ? ` (${tp("indicative", locale)})` : ""}
          </span>
        )}
      </div>
      <p className="text-[11px] uppercase tracking-wide text-text-muted mt-2 mb-1">
        {tp("departuresThatDay", locale)}
      </p>
      <ul className="flex flex-wrap gap-1.5 list-none p-0 m-0">
        {leg.times.map((time, i) => (
          <li
            key={`${time}-${i}`}
            className="px-2 py-0.5 rounded bg-aegean/5 border border-aegean/15 text-xs font-mono text-text"
          >
            {time}
          </li>
        ))}
      </ul>
    </div>
  );
}

function JourneyCard({ journey, locale }: { journey: Journey; locale: Locale }) {
  return (
    <div className="rounded-xl border border-aegean/30 bg-white overflow-hidden shadow-sm">
      <div className="bg-aegean px-4 py-2.5 text-white flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm font-bold">
          {tp("yourJourney", locale)}
          {journey.hub ? ` · ${tp("via", locale)} ${journey.hub}` : ""}
        </span>
        {journey.priceTotal != null && (
          <span className="text-sm font-bold inline-flex items-center gap-1">
            <Euro className="w-4 h-4" />
            {tp("total", locale)} {journey.priceTotal.toFixed(2)} €
            {journey.priceEstimated && (
              <span className="text-[11px] font-normal bg-white/20 rounded px-1.5 py-0.5">
                {tp("indicative", locale)}
              </span>
            )}
          </span>
        )}
      </div>
      <div className="divide-y divide-border">
        {journey.legs.map((leg) => (
          <LegRow key={leg.route.id} leg={leg} locale={locale} />
        ))}
      </div>
      {(journey.priceIncomplete || (journey.legs.length > 1 && !journey.durationKnown)) && (
        <div className="px-4 py-2 border-t border-border bg-amber-50 text-xs text-amber-800 space-y-0.5">
          {journey.priceIncomplete && <p>{tp("atTicketOffice", locale)}</p>}
          {journey.legs.length > 1 && !journey.durationKnown && (
            <p>{tp("connectionNotGuaranteed", locale)}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function JourneyPlanner({
  routes,
  locale,
  fromPlace,
  toPlace,
  onFromChange,
  onToChange,
}: {
  routes: BusRoute[];
  locale: Locale;
  fromPlace: string;
  toPlace: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}) {
  const [date, setDate] = useState(todayISO);

  const graph = useMemo(() => buildGraph(routes), [routes]);
  const allPlaces = useMemo(
    () => Array.from(new Set(routes.flatMap((r) => [r.from_place, r.to_place]))).sort(),
    [routes],
  );
  const toOptions = fromPlace ? reachableFrom(graph, fromPlace) : allPlaces;
  const journeys = fromPlace && toPlace ? findJourneys(graph, fromPlace, toPlace, date) : [];

  // depart choisi mais arrivee devenue inatteignable -> reset silencieux
  if (toPlace && fromPlace && !toOptions.includes(toPlace)) onToChange("");

  const westOnly = useMemo(() => {
    const east = new Set(
      routes.filter((r) => r.operator_id === "herlas").flatMap((r) => [r.from_place, r.to_place]),
    );
    return (p: string) => Boolean(p) && !east.has(p);
  }, [routes]);

  const reachableSet = fromPlace ? new Set(reachableFrom(graph, fromPlace)) : null;
  const noJourney = Boolean(fromPlace && toPlace) && journeys.length === 0;
  const noServiceThatDay = noJourney && reachableSet !== null && reachableSet.has(toPlace);
  const westNotice = noJourney && (westOnly(fromPlace) || westOnly(toPlace));

  return (
    <div className="rounded-xl border border-border bg-white p-5 mb-6 shadow-sm">
      <p className="text-sm font-semibold text-text mb-3">{tp("searchTitle", locale)}</p>
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <select
          value={fromPlace}
          onChange={(e) => onFromChange(e.target.value)}
          className="flex-1 border border-border rounded-lg px-3 py-2 text-sm text-text bg-white focus:outline-none focus:ring-2 focus:ring-aegean/30"
        >
          <option value="">{tp("from", locale)} – {tp("allPlaces", locale)}</option>
          {allPlaces.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <ArrowRight className="w-5 h-5 text-text-muted shrink-0 hidden sm:block" />

        <select
          value={toPlace}
          onChange={(e) => onToChange(e.target.value)}
          className="flex-1 border border-border rounded-lg px-3 py-2 text-sm text-text bg-white focus:outline-none focus:ring-2 focus:ring-aegean/30"
        >
          <option value="">{tp("to", locale)} – {tp("allPlaces", locale)}</option>
          {toOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <input
          type="date"
          value={date}
          min={todayISO()}
          max={maxDateISO()}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          aria-label={tp("date", locale)}
          className="border border-border rounded-lg px-3 py-2 text-sm text-text bg-white focus:outline-none focus:ring-2 focus:ring-aegean/30"
        />

        {(fromPlace || toPlace) && (
          <button
            onClick={() => { onFromChange(""); onToChange(""); }}
            className="text-xs text-text-muted hover:text-text underline shrink-0 px-1"
          >
            ✕ Reset
          </button>
        )}
      </div>

      {journeys.length > 0 && (
        <div className="mt-4 space-y-3">
          {journeys.map((j, i) => (
            <JourneyCard key={`${j.hub ?? "direct"}-${i}`} journey={j} locale={locale} />
          ))}
          <p className="text-xs text-text-muted flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {tp("priceMethodo", locale)}
          </p>
        </div>
      )}

      {noJourney && (
        <div className="mt-4 rounded-lg border border-border bg-surface p-4 text-sm text-text-muted space-y-1">
          <p>{noServiceThatDay ? tp("noServiceThatDay", locale) : tp("noRoute", locale)}</p>
          {westNotice && <p>{tp("westPartial", locale)}</p>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2 : Intégrer dans `BusesClient.tsx`**

Ajouter l'import en tête (après l'import `BusNetworkMap`) :

```tsx
import { JourneyPlanner } from "./JourneyPlanner";
```

Remplacer tout le bloc « Search bar » (le `<div className="rounded-xl border border-border bg-white p-5 mb-6 shadow-sm">` complet, lignes ~448-484) par :

```tsx
        {/* Planificateur d'itineraire — pilote aussi la carte réseau */}
        <JourneyPlanner
          routes={routes}
          locale={locale}
          fromPlace={fromPlace}
          toPlace={toPlace}
          onFromChange={setFromPlace}
          onToChange={setToPlace}
        />
```

Les états `fromPlace`/`toPlace`, `BusNetworkMap`, le grid filtré et le reste de la page ne changent pas. Supprimer dans `BusesClient.tsx` les clés `T` devenues inutilisées si ESLint les signale (`searchTitle`, `from`, `to`, `allPlaces` restent utilisées seulement si le lint le dit — sinon ne pas toucher).

- [ ] **Step 3 : Vérifier types + lint + build**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

Expected: 0 erreur TS, lint OK, build EXIT 0.

- [ ] **Step 4 : Vérification visuelle Playwright sur dev**

Lancer `npm run dev`, puis avec le skill webapp-testing vérifier sur `http://localhost:3000/fr/buses` :
1. Sélectionner Départ = « Heraklion » → le select Arrivée ne liste que les destinations atteignables.
2. Arrivée = « Ierapetra », date = aujourd'hui → carte « Votre itinéraire » avec horaires du jour + prix.
3. Date = dimanche prochain → les horaires changent (sous-grille Sun) ou message « pas de départ ».
4. Paire sans direct (ex. « Makry Gyalos » → « Malia ») → carte avec « Correspondance à … », 2 tronçons, total ou mention guichet.
5. Badge « indicatif » présent sur un prix estimé.
6. La carte réseau réagit toujours aux sélecteurs ; l'annuaire des lignes s'affiche toujours.
7. Vérifier aussi `/en/buses` (textes anglais).

- [ ] **Step 5 : Commit**

```bash
git add src/app/[locale]/buses/JourneyPlanner.tsx src/app/[locale]/buses/BusesClient.tsx
git commit -m "feat(buses): planificateur d'itineraire depart/arrivee/date avec prix et correspondance"
```

---

### Task 9 : Push, deploy, vérification prod

**Files:** aucun

- [ ] **Step 1 : Push**

```bash
git push origin master && git push origin master:main
```

- [ ] **Step 2 : Attendre le deploy Vercel puis vérifier prod**

```bash
npx vercel ls --scope <team> 2>$null   # ou dashboard : attendre Ready
curl -s https://crete.direct/fr/buses | findstr /C:"Votre itin"
```

Puis Playwright sur `https://crete.direct/fr/buses` : re-dérouler les checks 1-4 de la Task 8 Step 4.

- [ ] **Step 3 : Mémoire**

Ajouter la ligne session_log (DEPLOY) avec sources (commits, deploy id, vérifs prod) + mettre à jour la fiche projet crete.direct et `MEMORY.md` si la description change (règle index sync).

---

## Self-review (fait à l'écriture)

- **Couverture spec :** migration+flag (§1 data), plan A timeboxé (Task 2), plan B curé+estimation (Tasks 3-4), moteur pur avec jour de semaine/marge 15 min/prix agrégés (Task 7), UI selects+date+résultat+messages ouest/guichet/indicatif+méthodo (Task 8), tests pytest + check node + Playwright + build (Tasks 4/7/8), vérif prod (Task 9). Hors périmètre respecté (pas d'ektel scraper, pas de pages par paire).
- **Pas de placeholder :** chaque step a son code/commande/résultat attendu. Les valeurs CURATED_PRICES sont des valeurs de départ explicitement à figer en Task 3 (étape concrète avec sources).
- **Cohérence types :** `price_estimated` ajouté à `BusRoute` (Task 6) avant son usage dans le moteur (Task 7) et l'UI (Task 8) ; signatures `buildGraph/reachableFrom/findJourneys/parseDurationMin` identiques entre Task 7 et Task 8.
