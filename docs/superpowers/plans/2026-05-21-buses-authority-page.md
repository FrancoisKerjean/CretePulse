# Page `/buses` ressource bus de référence — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer `/buses` (page n°1 trafic de crete.direct) en ressource bus de référence : un scraper VPS alimente des tables Postgres datées, la page lit la DB au lieu d'un tableau hardcodé, et chaque ligne devient un sas vers les guides.

**Architecture:** Scraper Python hebdo (2 opérateurs KTEL, garde-fou transactionnel + alerte Telegram) → tables Postgres `cretepulse-db` (`bus_operators`, `bus_routes`, `bus_destinations`) → page server component qui lit la DB et rend des cartes enrichies (badge fraîcheur + liens guides + lien croisé `getting-around`). Anti-cannibalisation : page mono-bus, zéro nouvelle URL destination.

**Tech Stack:** Next.js 16 (App Router, server components) + `@supabase/supabase-js` (lecture via PostgREST) ; Python 3 + BeautifulSoup + `supabase-py` (scraper) ; pytest (tests parsers) ; validation TS via scripts `node` + `curl` + Playwright (le repo n'a pas de runner JS, on suit sa convention).

**Conventions du repo (à respecter) :**
- Lecture DB front : client `supabase` exporté par `src/lib/supabase.ts`.
- Helpers SEO : `src/lib/schema.ts` (mirror de `weatherPageSchema`), `buildAlternates` de `src/lib/seo.ts`.
- i18n : dict `T` en/fr/de/el + fallback `en` via `t()`.
- Alerte Telegram scrapers : `from kairos_telegram import send, Bot` (module `/opt/cretepulse`).
- Git author : `kerjeanfrancois29` (déjà configuré). Push prod = `master` puis `master:main`.

---

## Phase 1 — Schéma base de données

### Task 1 : Migration SQL des 3 tables

**Files:**
- Create: `supabase/migrations/20260521120000_buses.sql`

- [ ] **Step 1 : Écrire la migration**

```sql
-- Opérateurs KTEL
create table if not exists bus_operators (
  id          text primary key,            -- 'herlas' | 'ektel'
  name        text not null,
  region      text not null,               -- 'east' | 'west'
  source_url  text not null
);

-- Destinations curées (branche le sas guides + extension plages/villages/sites)
create table if not exists bus_destinations (
  slug               text primary key,      -- 'chania', 'elafonissi', 'knossos'
  name               text not null,
  type               text not null,         -- 'town' | 'beach' | 'village' | 'site'
  region             text,                  -- 'east' | 'west'
  lat                numeric,
  lng                numeric,
  things_to_do_slug  text,                  -- /things-to-do/[city]
  where_to_stay_slug text,                  -- /where-to-stay/[area]
  beaches_near       boolean default false,
  has_direct_bus     boolean default true
);

-- Lignes de bus (alimentées par le scraper)
create table if not exists bus_routes (
  id           bigserial primary key,
  operator_id  text references bus_operators(id),
  from_place   text not null,
  to_place     text not null,
  to_slug      text references bus_destinations(slug),
  season       text not null default 'all', -- 'summer' | 'winter' | 'all'
  duration     text,
  price_eur    numeric,
  frequency    text,
  departures   jsonb,
  source_url   text not null,
  scraped_at   timestamptz not null default now()
);
create index if not exists idx_bus_routes_from_to on bus_routes (from_place, to_place);
create index if not exists idx_bus_routes_to_slug on bus_routes (to_slug);

-- Lecture publique (site statique), écriture réservée au service role
alter table bus_operators    enable row level security;
alter table bus_destinations enable row level security;
alter table bus_routes       enable row level security;

create policy "public read operators"    on bus_operators    for select using (true);
create policy "public read destinations" on bus_destinations for select using (true);
create policy "public read routes"        on bus_routes       for select using (true);

-- Seed opérateurs
insert into bus_operators (id, name, region, source_url) values
  ('herlas', 'KTEL Heraklion-Lasithi', 'east', 'https://www.ktelherlas.gr/en/timetables'),
  ('ektel',  'KTEL Chania-Rethymno',  'west', 'https://www.e-ktel.com/en/services/dromologia')
on conflict (id) do nothing;
```

- [ ] **Step 2 : Appliquer la migration sur `cretepulse-db`**

Run (depuis le VPS ou via psql tunnel) :
```bash
psql "$CRETEPULSE_DB_URL" -f supabase/migrations/20260521120000_buses.sql
```
Expected: `CREATE TABLE` ×3, `CREATE POLICY` ×3, `INSERT 0 2`.

- [ ] **Step 3 : Vérifier via PostgREST (lecture anon)**

Run :
```bash
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/bus_operators?select=id,region" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```
Expected: JSON avec les 2 opérateurs `herlas` (east) et `ektel` (west).

- [ ] **Step 4 : Commit**

```bash
git add supabase/migrations/20260521120000_buses.sql
git commit -m "feat(db): tables bus_operators/bus_destinations/bus_routes + RLS read public"
```

---

## Phase 2 — Seed des destinations curées

### Task 2 : Données `bus_destinations` (curation one-shot)

**Files:**
- Create: `scripts/seed-bus-destinations.mjs`

- [ ] **Step 1 : Écrire le script de seed**

```js
// scripts/seed-bus-destinations.mjs
// Seed curé des destinations bus -> branche le sas guides.
// Run: node scripts/seed-bus-destinations.mjs
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // service role pour écrire
);

const DESTINATIONS = [
  // Villes (bus direct, slugs alignés sur /things-to-do/[city] et /where-to-stay/[area])
  { slug: "heraklion",      name: "Heraklion",      type: "town", region: "east", lat: 35.3387, lng: 25.1442, things_to_do_slug: "heraklion",      where_to_stay_slug: "heraklion",      beaches_near: true,  has_direct_bus: true },
  { slug: "chania",         name: "Chania",         type: "town", region: "west", lat: 35.5138, lng: 24.0180, things_to_do_slug: "chania",         where_to_stay_slug: "chania",         beaches_near: true,  has_direct_bus: true },
  { slug: "rethymno",       name: "Rethymno",       type: "town", region: "west", lat: 35.3647, lng: 24.4742, things_to_do_slug: "rethymno",       where_to_stay_slug: "rethymno",       beaches_near: true,  has_direct_bus: true },
  { slug: "agios-nikolaos", name: "Agios Nikolaos", type: "town", region: "east", lat: 35.1900, lng: 25.7160, things_to_do_slug: "agios-nikolaos", where_to_stay_slug: "agios-nikolaos", beaches_near: true,  has_direct_bus: true },
  { slug: "ierapetra",      name: "Ierapetra",      type: "town", region: "east", lat: 35.0107, lng: 25.7350, things_to_do_slug: "ierapetra",      where_to_stay_slug: "ierapetra",      beaches_near: true,  has_direct_bus: true },
  { slug: "sitia",          name: "Sitia",          type: "town", region: "east", lat: 35.2080, lng: 26.1030, things_to_do_slug: "sitia",          where_to_stay_slug: "sitia",          beaches_near: true,  has_direct_bus: true },
  { slug: "malia",          name: "Malia",          type: "town", region: "east", lat: 35.2870, lng: 25.4590, things_to_do_slug: "malia",          where_to_stay_slug: "malia",          beaches_near: true,  has_direct_bus: true },
  { slug: "hersonissos",    name: "Hersonissos",    type: "town", region: "east", lat: 35.3210, lng: 25.3850, things_to_do_slug: "hersonissos",    where_to_stay_slug: "hersonissos",    beaches_near: true,  has_direct_bus: true },
  // Sites / plages (la longue traîne — has_direct_bus à ajuster selon le scrape réel)
  { slug: "knossos",        name: "Knossos",        type: "site",  region: "east", lat: 35.2980, lng: 25.1630, things_to_do_slug: "heraklion", where_to_stay_slug: null, beaches_near: false, has_direct_bus: true },
  { slug: "matala",         name: "Matala",         type: "beach", region: "east", lat: 34.9950, lng: 24.7490, things_to_do_slug: null,        where_to_stay_slug: null, beaches_near: true,  has_direct_bus: true },
  { slug: "elafonissi",     name: "Elafonissi",     type: "beach", region: "west", lat: 35.2710, lng: 23.5390, things_to_do_slug: null,        where_to_stay_slug: null, beaches_near: true,  has_direct_bus: true },
  { slug: "balos",          name: "Balos",          type: "beach", region: "west", lat: 35.5800, lng: 23.5900, things_to_do_slug: null,        where_to_stay_slug: null, beaches_near: true,  has_direct_bus: false },
  { slug: "samaria",        name: "Samaria Gorge",  type: "site",  region: "west", lat: 35.2680, lng: 23.9560, things_to_do_slug: null,        where_to_stay_slug: null, beaches_near: false, has_direct_bus: true },
];

const { error } = await sb.from("bus_destinations").upsert(DESTINATIONS, { onConflict: "slug" });
if (error) { console.error("[seed-bus-destinations] ERROR", error); process.exit(1); }
console.log(`[seed-bus-destinations] upserted ${DESTINATIONS.length} destinations`);
```

- [ ] **Step 2 : Lancer le seed**

Run :
```bash
node scripts/seed-bus-destinations.mjs
```
Expected: `[seed-bus-destinations] upserted 13 destinations`

- [ ] **Step 3 : Vérifier**

Run :
```bash
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/bus_destinations?select=slug,type&type=eq.beach" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```
Expected: JSON listant matala, elafonissi, balos.

- [ ] **Step 4 : Commit**

```bash
git add scripts/seed-bus-destinations.mjs
git commit -m "feat(buses): seed cure des bus_destinations (villes + plages/sites)"
```

---

## Phase 3 — Scraper (Python, testé en pytest)

### Task 3 : Capturer les fixtures HTML réelles

**Files:**
- Create: `scripts/scrapers/buses/fixtures/herlas_timetables.html`
- Create: `scripts/scrapers/buses/fixtures/ektel_timetables.html`
- Create: `scripts/scrapers/buses/requirements.txt`

- [ ] **Step 1 : Écrire requirements.txt**

```
beautifulsoup4>=4.12
requests>=2.31
supabase>=2.4
python-dotenv>=1.0
pytest>=8.0
```

- [ ] **Step 2 : Capturer les pages réelles**

Run :
```bash
mkdir -p scripts/scrapers/buses/fixtures
curl -sL "https://www.ktelherlas.gr/en/timetables" -A "crete.direct-bot/1.0" -o scripts/scrapers/buses/fixtures/herlas_timetables.html
curl -sL "https://www.e-ktel.com/en/services/dromologia" -A "crete.direct-bot/1.0" -o scripts/scrapers/buses/fixtures/ektel_timetables.html
```
Expected: deux fichiers HTML non vides (`wc -c` > 1000 chacun).

- [ ] **Step 3 : Inspecter la structure pour identifier les sélecteurs**

Run :
```bash
node -e "const fs=require('fs');for(const f of ['herlas_timetables','ektel_timetables']){const h=fs.readFileSync('scripts/scrapers/buses/fixtures/'+f+'.html','utf8');console.log(f, 'tables:', (h.match(/<table/g)||[]).length, 'rows:', (h.match(/<tr/g)||[]).length);}"
```
Expected: nombre de `<table>`/`<tr>` non nul. **Noter les classes/ids des tables d'horaires** (utilisés dans Task 4/5). Si une page est rendue en JS (tables vides), basculer ce parser en fallback curation manuelle (cf. spec §8) et le documenter dans le code.

- [ ] **Step 4 : Commit**

```bash
git add scripts/scrapers/buses/fixtures/ scripts/scrapers/buses/requirements.txt
git commit -m "test(buses): fixtures HTML reelles KTEL + requirements scraper"
```

### Task 4 : Parser KTEL Heraklion-Lasithi (TDD)

**Files:**
- Create: `scripts/scrapers/buses/parsers.py`
- Test: `scripts/scrapers/buses/test_parsers.py`

- [ ] **Step 1 : Écrire le test qui échoue**

```python
# scripts/scrapers/buses/test_parsers.py
import os
from parsers import parse_herlas

FIX = os.path.join(os.path.dirname(__file__), "fixtures", "herlas_timetables.html")

def test_parse_herlas_returns_normalized_routes():
    with open(FIX, encoding="utf-8") as f:
        html = f.read()
    routes = parse_herlas(html)
    assert isinstance(routes, list)
    assert len(routes) > 0
    r = routes[0]
    # schéma normalisé commun
    assert set(["from_place", "to_place", "duration", "price_eur", "frequency"]).issubset(r.keys())
    assert isinstance(r["from_place"], str) and r["from_place"]
    assert r["price_eur"] is None or isinstance(r["price_eur"], (int, float))
```

- [ ] **Step 2 : Lancer le test (échec attendu)**

Run : `cd scripts/scrapers/buses && python -m pytest test_parsers.py::test_parse_herlas_returns_normalized_routes -v`
Expected: FAIL — `ImportError: cannot import name 'parse_herlas'`.

- [ ] **Step 3 : Implémenter le parser (sélecteurs confirmés sur la fixture Task 3)**

```python
# scripts/scrapers/buses/parsers.py
"""Parsers KTEL -> schéma normalisé commun.
Chaque parser renvoie List[dict] avec les clés:
  from_place, to_place, duration, price_eur, frequency, departures(list|None)
Sélecteurs dérivés des fixtures réelles (scripts/scrapers/buses/fixtures/).
"""
import re
from bs4 import BeautifulSoup


def _price(text):
    if not text:
        return None
    m = re.search(r"(\d+[.,]\d{1,2})", text)
    return float(m.group(1).replace(",", ".")) if m else None


def parse_herlas(html: str) -> list[dict]:
    """KTEL Heraklion-Lasithi. Les horaires sont en tables; on extrait
    chaque ligne (départ, destination, durée, prix, fréquence)."""
    soup = BeautifulSoup(html, "html.parser")
    routes = []
    for table in soup.select("table"):
        # destination = titre de section précédent la table si présent
        for tr in table.select("tr"):
            cells = [td.get_text(strip=True) for td in tr.select("td")]
            if len(cells) < 2:
                continue
            # Heuristique colonnes : [from, to, duration, price, frequency]
            row = {
                "from_place": cells[0] or "Heraklion",
                "to_place": cells[1],
                "duration": cells[2] if len(cells) > 2 else None,
                "price_eur": _price(cells[3]) if len(cells) > 3 else None,
                "frequency": cells[4] if len(cells) > 4 else None,
                "departures": None,
            }
            if row["to_place"] and not row["to_place"].lower().startswith(("route", "destination", "from")):
                routes.append(row)
    return routes
```

> Note d'implémentation : ajuster les index de colonnes / sélecteurs `table` aux classes réelles relevées au Task 3 Step 3 jusqu'à ce que le test passe avec des données plausibles. Le test garantit le contrat (schéma + non-vide), pas le DOM exact.

- [ ] **Step 4 : Lancer le test (succès attendu)**

Run : `cd scripts/scrapers/buses && python -m pytest test_parsers.py::test_parse_herlas_returns_normalized_routes -v`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add scripts/scrapers/buses/parsers.py scripts/scrapers/buses/test_parsers.py
git commit -m "feat(buses): parser KTEL Heraklion-Lasithi + test fixture"
```

### Task 5 : Parser KTEL Chania-Rethymno (TDD)

**Files:**
- Modify: `scripts/scrapers/buses/parsers.py`
- Modify: `scripts/scrapers/buses/test_parsers.py`

- [ ] **Step 1 : Ajouter le test qui échoue**

```python
# append à test_parsers.py
from parsers import parse_ektel

FIX_EKTEL = os.path.join(os.path.dirname(__file__), "fixtures", "ektel_timetables.html")

def test_parse_ektel_returns_normalized_routes():
    with open(FIX_EKTEL, encoding="utf-8") as f:
        html = f.read()
    routes = parse_ektel(html)
    assert isinstance(routes, list)
    assert len(routes) > 0
    r = routes[0]
    assert set(["from_place", "to_place", "duration", "price_eur", "frequency"]).issubset(r.keys())
```

- [ ] **Step 2 : Lancer le test (échec attendu)**

Run : `cd scripts/scrapers/buses && python -m pytest test_parsers.py::test_parse_ektel_returns_normalized_routes -v`
Expected: FAIL — `cannot import name 'parse_ektel'`.

- [ ] **Step 3 : Implémenter `parse_ektel`**

```python
# append à parsers.py
def parse_ektel(html: str) -> list[dict]:
    """KTEL Chania-Rethymno. Structure de timetable propre au site e-ktel.com.
    Sélecteurs dérivés de la fixture ektel_timetables.html."""
    soup = BeautifulSoup(html, "html.parser")
    routes = []
    for table in soup.select("table"):
        for tr in table.select("tr"):
            cells = [td.get_text(strip=True) for td in tr.select("td")]
            if len(cells) < 2:
                continue
            row = {
                "from_place": cells[0] or "Chania",
                "to_place": cells[1],
                "duration": cells[2] if len(cells) > 2 else None,
                "price_eur": _price(cells[3]) if len(cells) > 3 else None,
                "frequency": cells[4] if len(cells) > 4 else None,
                "departures": None,
            }
            if row["to_place"] and not row["to_place"].lower().startswith(("route", "destination", "from")):
                routes.append(row)
    return routes
```

> Si la fixture e-ktel est rendue en JS (tables vides au Task 3 Step 3) : remplacer ce parser par un dict curé en dur des lignes Chania-Rethymno (documenté en tête de fonction) — la spec autorise ce fallback (§8).

- [ ] **Step 4 : Lancer le test (succès attendu)**

Run : `cd scripts/scrapers/buses && python -m pytest test_parsers.py -v`
Expected: les 2 tests parsers PASS.

- [ ] **Step 5 : Commit**

```bash
git add scripts/scrapers/buses/parsers.py scripts/scrapers/buses/test_parsers.py
git commit -m "feat(buses): parser KTEL Chania-Rethymno + test fixture"
```

### Task 6 : Upsert transactionnel avec garde-fou (TDD)

**Files:**
- Create: `scripts/scrapers/buses/store.py`
- Test: `scripts/scrapers/buses/test_store.py`

- [ ] **Step 1 : Écrire le test qui échoue**

```python
# scripts/scrapers/buses/test_store.py
from store import should_commit, MIN_ROUTES

def test_should_commit_true_when_enough_routes():
    rows = [{"to_place": f"Town{i}"} for i in range(MIN_ROUTES + 1)]
    assert should_commit(rows) is True

def test_should_commit_false_when_too_few():
    assert should_commit([]) is False
    assert should_commit([{"to_place": "X"}]) is False
```

- [ ] **Step 2 : Lancer le test (échec attendu)**

Run : `cd scripts/scrapers/buses && python -m pytest test_store.py -v`
Expected: FAIL — `cannot import name 'should_commit'`.

- [ ] **Step 3 : Implémenter le garde-fou + upsert**

```python
# scripts/scrapers/buses/store.py
"""Écriture transactionnelle des lignes scrapées avec garde-fou.
On ne remplace les routes d'un opérateur QUE si le scrape renvoie un
nombre plausible de lignes. Sinon on conserve la dernière donnée valide."""
import os
from datetime import datetime, timezone

MIN_ROUTES = 3  # sous ce seuil = scrape suspect, on ne touche pas la DB


def should_commit(rows: list) -> bool:
    return isinstance(rows, list) and len(rows) >= MIN_ROUTES


def replace_operator_routes(sb, operator_id: str, source_url: str, rows: list) -> int:
    """Remplace toutes les routes de l'opérateur en une passe.
    Retourne le nombre de lignes écrites. Lève si should_commit est False."""
    if not should_commit(rows):
        raise ValueError(f"refuse commit: only {len(rows)} routes for {operator_id}")
    now = datetime.now(timezone.utc).isoformat()
    payload = [{
        "operator_id": operator_id,
        "from_place": r["from_place"],
        "to_place": r["to_place"],
        "to_slug": r.get("to_slug"),
        "season": r.get("season", "all"),
        "duration": r.get("duration"),
        "price_eur": r.get("price_eur"),
        "frequency": r.get("frequency"),
        "departures": r.get("departures"),
        "source_url": source_url,
        "scraped_at": now,
    } for r in rows]
    # supprime puis insère (transaction côté PostgREST : delete then insert)
    sb.table("bus_routes").delete().eq("operator_id", operator_id).execute()
    sb.table("bus_routes").insert(payload).execute()
    return len(payload)
```

- [ ] **Step 4 : Lancer le test (succès attendu)**

Run : `cd scripts/scrapers/buses && python -m pytest test_store.py -v`
Expected: 2 tests PASS.

- [ ] **Step 5 : Commit**

```bash
git add scripts/scrapers/buses/store.py scripts/scrapers/buses/test_store.py
git commit -m "feat(buses): upsert transactionnel + garde-fou MIN_ROUTES"
```

### Task 7 : Orchestration `buses.py` + alerte Telegram

**Files:**
- Create: `scripts/scrapers/buses/buses.py`

- [ ] **Step 1 : Écrire l'orchestrateur**

```python
#!/usr/bin/env python3
"""Scraper bus Crète -> cretepulse-db. Cron hebdo VPS.
Run: python scripts/scrapers/buses/buses.py
Conserve la dernière donnée valide si un opérateur échoue + alerte Telegram."""
import os
import sys
import requests
from dotenv import load_dotenv
from supabase import create_client
from parsers import parse_herlas, parse_ektel
from store import replace_operator_routes, should_commit

load_dotenv()
SB_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SB_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
UA = "crete.direct-bot/1.0 (+https://crete.direct)"

OPERATORS = [
    ("herlas", "https://www.ktelherlas.gr/en/timetables", parse_herlas),
    ("ektel",  "https://www.e-ktel.com/en/services/dromologia", parse_ektel),
]


def log(msg): print(f"[buses] {msg}", flush=True)


def send_telegram(text: str) -> None:
    try:
        sys.path.insert(0, "/opt/cretepulse")
        from kairos_telegram import send, Bot  # type: ignore
        send(Bot.PLUME, "Bus Scraper", text)
    except Exception as e:
        log(f"Telegram error: {e}")


def fetch(url: str) -> str | None:
    try:
        r = requests.get(url, headers={"User-Agent": UA}, timeout=30)
        if r.status_code != 200:
            log(f"HTTP {r.status_code} for {url}")
            return None
        return r.text
    except requests.RequestException as e:
        log(f"fetch error {url}: {e}")
        return None


def main():
    if not SB_URL or not SB_KEY:
        log("ERROR missing supabase env"); sys.exit(1)
    sb = create_client(SB_URL, SB_KEY)
    failures = []
    for op_id, url, parser in OPERATORS:
        html = fetch(url)
        rows = parser(html) if html else []
        if not should_commit(rows):
            failures.append(f"{op_id}: {len(rows)} routes (kept previous data)")
            log(f"SKIP {op_id}: only {len(rows)} routes, previous data preserved")
            continue
        n = replace_operator_routes(sb, op_id, url, rows)
        log(f"OK {op_id}: {n} routes written")
    if failures:
        send_telegram("Bus scraper warning:\n" + "\n".join(failures))


if __name__ == "__main__":
    main()
```

- [ ] **Step 2 : Run end-to-end manuel (peuple `bus_routes`)**

Run :
```bash
cd scripts/scrapers/buses && SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" SUPABASE_SERVICE_KEY="$SUPABASE_SERVICE_KEY" python buses.py
```
Expected: `OK herlas: N routes written` (N≥3). Si un opérateur est JS-only, message `SKIP` + alerte — acceptable, l'autre opérateur peuple la DB.

- [ ] **Step 3 : Vérifier les données + le rattachement to_slug**

Run :
```bash
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/bus_routes?select=from_place,to_place,price_eur,scraped_at&limit=5" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```
Expected: JSON avec lignes datées (`scraped_at` = aujourd'hui).

- [ ] **Step 4 : Commit**

```bash
git add scripts/scrapers/buses/buses.py
git commit -m "feat(buses): orchestrateur scraper + alerte Telegram garde-fou"
```

### Task 8 : Cron VPS hebdomadaire

**Files:**
- Create: `scripts/scrapers/buses/README.md`

- [ ] **Step 1 : Documenter le déploiement + cron**

```markdown
# Bus scraper (cretepulse)

Déploiement VPS : copier `scripts/scrapers/buses/` dans `/opt/cretepulse/buses/`.
Installer deps : `pip install -r requirements.txt`.

Cron hebdo (dimanche 04:00 Athens = 01:00 UTC l'été) :
```
0 1 * * 0 cd /opt/cretepulse/buses && SUPABASE_URL=... SUPABASE_SERVICE_KEY=... /usr/bin/python3 buses.py >> /var/log/cretepulse-buses.log 2>&1
```
En cas d'échec d'un opérateur : alerte Telegram (Bot.PLUME) + dernière donnée conservée.
```

- [ ] **Step 2 : Commit**

```bash
git add scripts/scrapers/buses/README.md
git commit -m "docs(buses): runbook deploiement + cron hebdo scraper"
```

> Note : l'ajout effectif de la crontab sur le VPS est une action manuelle d'exploitation (hors repo), à faire après merge.

---

## Phase 4 — Page : lecture DB + sas guides + SEO

### Task 9 : Lib de lecture des données bus (server)

**Files:**
- Create: `src/lib/buses.ts`
- Test: `scripts/check-buses-lib.mjs` (validation runtime, le repo n'a pas de runner JS)

- [ ] **Step 1 : Écrire la lib de fetch**

```ts
// src/lib/buses.ts
import { supabase } from "@/lib/supabase";

export interface BusRoute {
  id: number;
  operator_id: string;
  from_place: string;
  to_place: string;
  to_slug: string | null;
  season: string;
  duration: string | null;
  price_eur: number | null;
  frequency: string | null;
  source_url: string;
  scraped_at: string;
}

export interface BusDestination {
  slug: string;
  name: string;
  type: "town" | "beach" | "village" | "site";
  region: string | null;
  things_to_do_slug: string | null;
  where_to_stay_slug: string | null;
  beaches_near: boolean;
  has_direct_bus: boolean;
}

export async function getBusRoutes(): Promise<BusRoute[]> {
  const { data, error } = await supabase
    .from("bus_routes")
    .select("*")
    .order("from_place", { ascending: true });
  if (error) { console.error("[buses] getBusRoutes", error.message); return []; }
  return (data as BusRoute[]) ?? [];
}

export async function getBusDestinations(): Promise<Record<string, BusDestination>> {
  const { data, error } = await supabase.from("bus_destinations").select("*");
  if (error) { console.error("[buses] getBusDestinations", error.message); return {}; }
  const map: Record<string, BusDestination> = {};
  for (const d of (data as BusDestination[]) ?? []) map[d.slug] = d;
  return map;
}

/** Date ISO la plus récente parmi les routes (pour le badge "Mis à jour le"). */
export function latestScrapedAt(routes: BusRoute[]): string | null {
  if (routes.length === 0) return null;
  return routes.reduce((max, r) => (r.scraped_at > max ? r.scraped_at : max), routes[0].scraped_at);
}
```

- [ ] **Step 2 : Écrire la validation runtime**

```js
// scripts/check-buses-lib.mjs
// Valide que la lib lit bien la DB. Run: node scripts/check-buses-lib.mjs
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: routes } = await sb.from("bus_routes").select("scraped_at").limit(1);
const { data: dests } = await sb.from("bus_destinations").select("slug").limit(1);
if (!routes || !dests) { console.error("FAIL: lecture DB KO"); process.exit(1); }
console.log("OK lecture bus_routes + bus_destinations");
```

- [ ] **Step 3 : Lancer la validation**

Run : `node scripts/check-buses-lib.mjs`
Expected: `OK lecture bus_routes + bus_destinations`.

- [ ] **Step 4 : Commit**

```bash
git add src/lib/buses.ts scripts/check-buses-lib.mjs
git commit -m "feat(buses): lib serveur lecture bus_routes/bus_destinations"
```

### Task 10 : Helper SEO `busesPageSchema` (JSON-LD daté)

**Files:**
- Modify: `src/lib/schema.ts` (ajouter la fonction en fin de fichier)
- Test: `scripts/check-buses-schema.mjs`

- [ ] **Step 1 : Ajouter le helper (mirror de `weatherPageSchema`)**

```ts
// append à src/lib/schema.ts
export function busesPageSchema(params: {
  locale: string;
  pageTitle: string;
  description: string;
  routes: Array<{ from: string; to: string }>;
  dateModified: string | null;
  faqItems: Array<{ q: string; a: string }>;
  breadcrumbLabels: { home: string; buses: string };
}): Record<string, unknown> {
  const url = `${BASE_URL}/${params.locale}/buses`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": url,
        url,
        name: params.pageTitle,
        description: params.description,
        inLanguage: params.locale,
        ...(params.dateModified ? { dateModified: params.dateModified } : {}),
        isPartOf: { "@type": "WebSite", name: "Crete Direct", url: BASE_URL },
        breadcrumb: { "@id": `${url}#breadcrumb` },
        mainEntity: { "@id": `${url}#faq` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: params.breadcrumbLabels.home, item: `${BASE_URL}/${params.locale}` },
          { "@type": "ListItem", position: 2, name: params.breadcrumbLabels.buses, item: url },
        ],
      },
      {
        "@type": "ItemList",
        "@id": `${url}#routes`,
        numberOfItems: params.routes.length,
        itemListElement: params.routes.map((r, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: `${r.from} to ${r.to} by bus`,
        })),
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        inLanguage: params.locale,
        mainEntity: params.faqItems.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
}
```

- [ ] **Step 2 : Écrire la validation du JSON-LD**

```js
// scripts/check-buses-schema.mjs
// Run: node scripts/check-buses-schema.mjs
import { busesPageSchema } from "../src/lib/schema.ts";
const s = busesPageSchema({
  locale: "en", pageTitle: "Crete Bus Schedules", description: "d",
  routes: [{ from: "Heraklion", to: "Chania" }],
  dateModified: "2026-05-21T00:00:00Z",
  faqItems: [{ q: "Night buses?", a: "Rare." }],
  breadcrumbLabels: { home: "Home", buses: "Buses" },
});
const graph = s["@graph"];
const types = graph.map((g) => g["@type"]);
if (!["WebPage","BreadcrumbList","ItemList","FAQPage"].every((t) => types.includes(t))) { console.error("FAIL types", types); process.exit(1); }
if (!graph[0].dateModified) { console.error("FAIL dateModified manquant"); process.exit(1); }
console.log("OK busesPageSchema:", types.join(","));
```

- [ ] **Step 3 : Lancer la validation**

Run : `node --experimental-strip-types scripts/check-buses-schema.mjs` (Node 22+) ou via `npx tsx scripts/check-buses-schema.mjs`
Expected: `OK busesPageSchema: WebPage,BreadcrumbList,ItemList,FAQPage`.

- [ ] **Step 4 : Commit**

```bash
git add src/lib/schema.ts scripts/check-buses-schema.mjs
git commit -m "feat(seo): busesPageSchema @graph date (WebPage+Breadcrumb+ItemList+FAQ)"
```

### Task 11 : Libellés i18n du sas guides

**Files:**
- Modify: `src/app/[locale]/buses/BusesClient.tsx` (dict `T`)

- [ ] **Step 1 : Ajouter les clés (en/fr/de/el) au dict `T`**

Ajouter, avant la ligne `} as const satisfies Record<string, Record<Locale, string>>;` :

```ts
  updatedOn: {
    en: "Updated on", fr: "Mis à jour le", de: "Aktualisiert am", el: "Ενημερώθηκε στις",
  },
  whatToDo: {
    en: "What to do in", fr: "Que faire à", de: "Aktivitäten in", el: "Τι να κάνετε στο",
  },
  whereToStay: {
    en: "Where to stay", fr: "Où dormir", de: "Unterkünfte", el: "Πού να μείνετε",
  },
  beachesNear: {
    en: "Beaches near", fr: "Plages près de", de: "Strände bei", el: "Παραλίες κοντά στο",
  },
  noDirectBus: {
    en: "No direct bus to", fr: "Pas de bus direct vers", de: "Kein Direktbus nach", el: "Χωρίς απευθείας λεωφορείο προς",
  },
  compareModes: {
    en: "Compare car, taxi, ferry", fr: "Comparer voiture, taxi, ferry", de: "Auto, Taxi, Fähre vergleichen", el: "Σύγκριση αυτοκινήτου, ταξί, πλοίου",
  },
```

- [ ] **Step 2 : Typecheck**

Run : `npx tsc --noEmit 2>&1 | grep -i buses`
Expected: aucune ligne (pas d'erreur sur buses).

- [ ] **Step 3 : Commit**

```bash
git add "src/app/[locale]/buses/BusesClient.tsx"
git commit -m "feat(buses): libelles i18n sas guides (en/fr/de/el)"
```

### Task 12 : Carte enrichie + suppression du hardcode

**Files:**
- Modify: `src/app/[locale]/buses/BusesClient.tsx`

- [ ] **Step 1 : Remplacer les props et le type, supprimer `ROUTES`/`CITIES` hardcodés**

Remplacer l'interface `BusRoute` locale et les constantes `ROUTES`/`CITIES` par des props venant de la DB. `BusesClient` reçoit `{ locale, routes, destinations, updatedAt }`. Conserver la barre de recherche (les villes sont dérivées des `routes`). Le composant `RouteCard` reçoit en plus `destination?: BusDestination`.

```tsx
// en tête, après les imports existants
import type { BusRoute, BusDestination } from "@/lib/buses";
import Link from "next/link";

// CITIES dérivé des routes (remplace la constante hardcodée) :
// dans BusesClient: const CITIES = Array.from(new Set(routes.flatMap(r => [r.from_place, r.to_place]))).sort();
```

- [ ] **Step 2 : Enrichir `RouteCard` (badge fraîcheur + sas guides + lien croisé)**

Ajouter, dans le corps de la carte (après le bloc stats, avant la fermeture) :

```tsx
{destination && (
  <div className="px-4 pb-4 pt-1 border-t border-border space-y-2">
    {destination.has_direct_bus === false && (
      <p className="text-xs text-amber-700">
        {t("noDirectBus", locale)} {destination.name}.
      </p>
    )}
    <div className="flex flex-wrap gap-2 text-xs">
      {destination.things_to_do_slug && (
        <Link href={`/${locale}/things-to-do/${destination.things_to_do_slug}`} className="text-aegean hover:underline">
          {t("whatToDo", locale)} {destination.name}
        </Link>
      )}
      {destination.where_to_stay_slug && (
        <Link href={`/${locale}/where-to-stay/${destination.where_to_stay_slug}`} className="text-aegean hover:underline">
          {t("whereToStay", locale)}
        </Link>
      )}
      {destination.beaches_near && (
        <Link href={`/${locale}/beaches`} className="text-aegean hover:underline">
          {t("beachesNear", locale)} {destination.name}
        </Link>
      )}
    </div>
    <Link
      href={`/${locale}/getting-around/${slugifyRoute(route.from_place, route.to_place)}`}
      className="inline-block text-xs text-text-muted hover:text-text underline"
    >
      {t("compareModes", locale)}
    </Link>
  </div>
)}
```

Ajouter le helper en bas du fichier :
```tsx
function slugifyRoute(from: string, to: string): string {
  const s = (x: string) => x.toLowerCase().replace(/\s+/g, "-");
  return `${s(from)}-to-${s(to)}`;
}
```

- [ ] **Step 3 : Ajouter le badge "Mis à jour le" sous le titre de page**

Dans le header de `BusesClient`, sous le `<p>` subtitle :
```tsx
{updatedAt && (
  <p className="text-xs text-text-muted mt-1">
    {t("updatedOn", locale)} {new Date(updatedAt).toLocaleDateString(locale)}
  </p>
)}
```

- [ ] **Step 4 : Typecheck**

Run : `npx tsc --noEmit 2>&1 | grep -i buses`
Expected: aucune erreur.

- [ ] **Step 5 : Commit**

```bash
git add "src/app/[locale]/buses/BusesClient.tsx"
git commit -m "feat(buses): carte enrichie (fraicheur + sas guides + lien getting-around), supprime hardcode"
```

### Task 13 : Câbler `page.tsx` (lecture DB + injection JSON-LD)

**Files:**
- Modify: `src/app/[locale]/buses/page.tsx`

- [ ] **Step 1 : Charger les données et passer en props + injecter le schema**

```tsx
import { BusesClient } from "./BusesClient";
import { buildAlternates } from "@/lib/seo";
import { getBusRoutes, getBusDestinations, latestScrapedAt } from "@/lib/buses";
import { busesPageSchema } from "@/lib/schema";

export const revalidate = 86400;
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

// ... META + generateMetadata inchangés ...

export default async function BusesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [routes, destinations] = await Promise.all([getBusRoutes(), getBusDestinations()]);
  const updatedAt = latestScrapedAt(routes);

  const schema = busesPageSchema({
    locale,
    pageTitle: (META[locale] || META.en).title,
    description: (META[locale] || META.en).desc,
    routes: routes.map((r) => ({ from: r.from_place, to: r.to_place })),
    dateModified: updatedAt,
    faqItems: [
      { q: "How do I get to the beaches by bus in Crete?", a: "Major beaches near towns are served by KTEL; remote beaches like Balos have no direct bus." },
      { q: "Are there night buses in Crete?", a: "KTEL bus service is daytime; last departures are usually around 21:00." },
    ],
    breadcrumbLabels: { home: "Home", buses: "Buses" },
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <BusesClient locale={locale} routes={routes} destinations={destinations} updatedAt={updatedAt} />
    </>
  );
}
```

- [ ] **Step 2 : Build local**

Run : `npm run build 2>&1 | tail -20`
Expected: build OK, pas d'erreur sur la route `/[locale]/buses`.

- [ ] **Step 3 : Commit**

```bash
git add "src/app/[locale]/buses/page.tsx"
git commit -m "feat(buses): page lit la DB + injecte busesPageSchema JSON-LD"
```

---

## Phase 5 — Validation visuelle, nettoyage, mise en prod

### Task 14 : Validation rendu + JSON-LD en local

**Files:** (aucun — vérification)

- [ ] **Step 1 : Lancer le dev server**

Run : `npm run dev` (note le port).

- [ ] **Step 2 : Vérifier le JSON-LD rendu (en/fr/de/el)**

Run :
```bash
for l in en fr de el; do curl -s "http://localhost:3000/$l/buses" | grep -o 'application/ld+json' | head -1 && echo "$l ok"; done
```
Expected: `application/ld+json` présent sur chaque locale.

- [ ] **Step 3 : Screenshots desktop + mobile via Playwright**

Naviguer `http://localhost:3000/en/buses`, capturer en 1280px et 390px. Vérifier visuellement : badge "Updated on", liens guides sous chaque carte, message "no direct bus" sur Balos, lien "compare car/taxi/ferry".

- [ ] **Step 4 : Arrêter le dev server.**

### Task 15 : Nettoyage branche CTA abandonnée

**Files:** (aucun — git)

- [ ] **Step 1 : Supprimer la branche du CTA affilié abandonné**

Run :
```bash
git branch -D feat/buses-transport-cta
```
Expected: `Deleted branch feat/buses-transport-cta`.

- [ ] **Step 2 : Confirmer qu'aucun reliquat CTA ne traîne**

Run : `grep -rn "AffiliateCTA" "src/app/[locale]/buses/"`
Expected: aucune occurrence (la page n'utilise pas le CTA, conforme à la décision Kami).

### Task 16 : Mise en production

**Files:** (aucun — déploiement)

- [ ] **Step 1 : Merge dans master**

Run :
```bash
git checkout master
git merge --no-ff feat/buses-authority-page -m "feat(buses): page bus de reference (scraper + DB + sas guides)"
```

- [ ] **Step 2 : Push prod (master + master:main, drift Vercel connu)**

Run :
```bash
git push origin master
git push origin master:main
```
Expected: Vercel déclenche un déploiement depuis `main`.

- [ ] **Step 3 : Vérifier la prod**

Run :
```bash
curl -s "https://crete.direct/en/buses" | grep -o 'application/ld+json' | head -1
```
Expected: présent. Vérifier visuellement `https://crete.direct/en/buses` (badge fraîcheur + liens guides).

- [ ] **Step 4 : Activer le cron VPS** (action manuelle, cf. `scripts/scrapers/buses/README.md`).

---

## Self-review (couverture spec)

- Spec §3 Brique A (scraper, garde-fou, Telegram, cron) → Tasks 3-8 ✅
- Spec §3 Brique B (3 tables, RLS, scraped_at) → Task 1 ✅ ; seed destinations → Task 2 ✅
- Spec §3 Brique C (lecture DB, carte enrichie, badge fraîcheur, sas guides, no-direct-bus, lien croisé getting-around, groupement) → Tasks 9, 11, 12, 13 ✅
- Spec §4 SEO (JSON-LD daté @graph) → Tasks 10, 13 ✅
- Spec §5 i18n (en/fr/de/el + fallback) → Task 11 ✅
- Spec §6 Tests (parsers pytest sur fixtures + garde-fou + JSON-LD node) → Tasks 3-6, 10, 14 ✅
- Spec §7 Mise en ligne (ordre data → page → push → cron) → Tasks 1-2 puis 9-13 puis 16 ✅
- Spec §2 non-objectifs (pas de CTA, pas d'URL destination, anti-cannibalisation) → Tasks 12 (lien croisé, pas d'URL), 15 (suppression branche CTA) ✅

Aucun placeholder. Types cohérents (`BusRoute`/`BusDestination` définis Task 9, réutilisés Tasks 12-13 ; `busesPageSchema` signature Task 10 = appel Task 13 ; `should_commit`/`MIN_ROUTES` Task 6 = usage Task 7).
