# Flux touristiques couches 2+3 : ingest VPS (flux publics + proxies affluence) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Historiser dans le Postgres self-hosted du VPS les flux touristiques publics (positions GPS bus urbains, arrivées aéroport HER, escales croisières Héraklion) et les proxies d'affluence (pageviews Wikipedia, Popular Times Google, occupation Airbnb par zone) pour constituer la série temporelle propriétaire crete.direct.

**Architecture:** Nouveaux scripts Python autonomes dans `vps/flux/` (repo cretepulse-build), déployés sur kairos-vps dans `/opt/cretepulse/flux/`, cron-és, écrivant via psycopg2 dans le Postgres local (`localhost:5433`, db `cretepulse`) dans 6 nouvelles tables `flux_*`. Les fonctions de parsing sont pures (module `parsers.py`) et testées pytest en local. L'agrégation occupation Airbnb vit dans le repo scrapper (les données source y sont déjà : `listing_snapshots`).

**Tech Stack:** Python 3 (urllib, BeautifulSoup4, pdfplumber, psycopg2, python-dotenv — tous déjà sur le VPS sauf bs4/LivePopularTimes), Postgres 17 self-hosted, cron.

**Contexte vérifié (recon 10/07/2026, ne pas re-déduire) :**
- `screen.herairport.com/arr2web.php` = fragment HTML des arrivées HER, MAJ 15 s, colonnes `ScheduledTime`/`DestinationNameEng`(=provenance)/logo compagnie (`airplane/XX.png`)/`flight_number_arr`/`checkins_arr`(belt)/`remtxt`(statut). Vérifié par curl depuis le PC.
- `portheraklion.gr` : escales croisières = PDF annuel officiel, liens de la forme `/images/3.attachments/cruise/CRUISE_SHIP_SCHEDULE_<YYYY>.pdf` (2027 vérifié, 2026 à confirmer en Task 1).
- `agncitybus.gr/map/get_location_route.php?route=1|2|3` = JSON positions GPS temps réel, non authentifié : `[{latitude,longitude,speed,alt,sat,direction,timenow,route,number,imei,pinakida}]` (déjà proxifié par `src/app/api/buses/agncitybus-live/route.ts`).
- `rest.citybus.gr/api/v1/el/{agency}/stops/live/{stopCode}` (HER agency `110`, JWT Bearer scrapé dans le HTML de `{ville}.citybus.gr/el/stops`, regex `const token = '...'`) : `{vehicles:[{lineCode,...,latitude,longitude,departureMins,vehicleCode,...}]}` ; lat/lng = **strings**, `"0"` = pas de GPS ; arrêt sans passage = **404**. Arrêts vérifiés : HER `0122`, CHA `74003`. Logique de référence : `src/app/api/buses/citybus-live/[stop]/route.ts` (agency codes HER/CHA + regex token à y reprendre).
- Chania aéroport : PAS de tableau public équivalent (503 anti-bot). Hors scope v1 (extension OpenSky `/flights/arrival?airport=LGSA` notée en backlog).
- Ferries : aucune source vérifiée à ce jour. **Hors scope v1** (les croisières + vols couvrent l'entrant mesurable ; à re-cadrer si besoin).
- Scrapper : `pipeline/calendar.py` collecte DÉJÀ les calendriers Airbnb chaque vendredi (`listing_snapshots` : occupancy_rate_30/60/90 ; Supabase cloud du scrapper, PAS le Postgres cretepulse). La couche 3 « occupation » = simple agrégation par zone.
- Patterns VPS : `.env` dans `/opt/cretepulse/.env`, psycopg2 `host=localhost port=5433 dbname=cretepulse user=postgres password=POSTGRES_PASSWORD` (modèle : `vps/enrich-beaches.py`), pdfplumber déjà requis par `vps/bus/buses.py`.

---

## Fichiers

- Create: `vps/flux/db.py` — connexion psycopg2 + insert helper
- Create: `vps/flux/parsers.py` — fonctions de parsing PURES (testables sans DB)
- Create: `vps/flux/bus_positions.py` — poll GPS agncitybus + citybus HER/CHA
- Create: `vps/flux/flight_arrivals.py` — scrape arrivées HER
- Create: `vps/flux/cruise_calls.py` — parse PDF croisières
- Create: `vps/flux/wiki_interest.py` — pageviews Wikipedia
- Create: `vps/flux/crowd_snapshots.py` — Popular Times (best-effort)
- Create: `vps/flux/tests/test_parsers.py` + `vps/flux/tests/fixtures/arr2web_sample.html`
- Create: `supabase/migrations/20260710_flux_tables.sql`
- Create (repo scrapper): `pipeline/zone_flux_export.py`
- Modify (repo scrapper): `pipeline/run_weekly.sh` — ajout étape export
- Modify (VPS): crontab root

---

### Task 1: Recon accessibilité des sources depuis le VPS

Les endpoints sont vérifiés depuis une IP résidentielle. Le VPS est en datacenter (rappel : `backoffice.ktelherlas.gr` bloque les IP datacenter). Il faut vérifier chaque source AVANT de coder les crons.

- [ ] **Step 1: Tester les 4 sources depuis le VPS**

```bash
ssh root@89.167.115.63 '
curl -s -m 15 -o /dev/null -w "agncitybus: %{http_code}\n" "https://www.agncitybus.gr/map/get_location_route.php?route=1"
curl -s -m 15 -o /dev/null -w "herairport: %{http_code}\n" "https://screen.herairport.com/arr2web.php"
curl -s -m 15 -o /dev/null -w "portheraklion: %{http_code}\n" "https://www.portheraklion.gr/index.php/en/cruise/cruise-schedule"
curl -s -m 15 -o /dev/null -w "citybus-page: %{http_code}\n" "https://irakleio.citybus.gr/el/stops"
curl -s -m 15 -o /dev/null -w "wikimedia: %{http_code}\n" "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia.org/all-access/user/Knossos/daily/20260701/20260701"
'
```

Expected: `200` partout. Le proxy Vercel appelle déjà `rest.citybus.gr` depuis un datacenter sans blocage, donc citybus devrait passer.

- [ ] **Step 2: Décision par source**

Pour toute source qui répond ≠200 depuis le VPS : le script correspondant sera déployé sur le PC de Kami en tâche planifiée Windows (pattern existant `Kairos-Bus-Herlas-API`, dim 06:00 Athens) au lieu du cron VPS, en écrivant dans Postgres via le tunnel PostgREST public (`https://kairos-n8n.duckdns.org/cretepulse-db`) avec la service key. Noter la décision dans le commit de la Task 10.

- [ ] **Step 3: Vérifier l'URL du PDF croisières 2026**

```bash
curl -s -o /dev/null -w "%{http_code}\n" "https://www.portheraklion.gr/images/3.attachments/cruise/CRUISE_SHIP_SCHEDULE_2026.pdf"
# si 404 :
curl -s "https://www.portheraklion.gr/index.php/en/cruise/cruise-schedule" | grep -oiE 'href="[^"]*cruise[^"]*\.pdf"'
```

Expected: un lien PDF 2026 valide. Le noter pour la Task 6.

---

### Task 2: Migration SQL tables flux_*

**Files:**
- Create: `supabase/migrations/20260710_flux_tables.sql`

- [ ] **Step 1: Écrire la migration**

Reprendre le bloc GRANT/NOTIFY exact d'une migration récente (`supabase/migrations/20260710_activity_catalog.sql`) pour les rôles PostgREST. Contenu :

```sql
-- Historisation flux touristiques (plan 2026-07-10, couches 2+3)

create table if not exists flux_bus_positions (
  id bigint generated always as identity primary key,
  source text not null,              -- 'agncitybus' | 'citybus-her' | 'citybus-cha'
  line_code text,
  vehicle_key text not null,         -- sha256 tronqué (imei/vehicleCode), RGPD-safe
  lat double precision not null,
  lng double precision not null,
  speed_kmh double precision,
  bearing double precision,
  recorded_at timestamptz not null default now()
);
create index if not exists idx_flux_bus_pos on flux_bus_positions (source, recorded_at);

create table if not exists flux_flight_arrivals (
  id bigint generated always as identity primary key,
  airport text not null default 'HER',
  service_date date not null,
  sched_time text not null,          -- 'HH:MM' heure locale affichée
  flight_no text not null,
  airline_code text,
  origin text,
  status text,
  belt text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  landed_at timestamptz,
  unique (airport, service_date, flight_no, sched_time)
);

create table if not exists flux_cruise_calls (
  id bigint generated always as identity primary key,
  port text not null default 'heraklion',
  call_date date not null,
  ship_name text not null,
  eta text,
  etd text,
  pax_capacity int,
  source text not null default 'portheraklion-pdf',
  updated_at timestamptz not null default now(),
  unique (port, call_date, ship_name)
);

create table if not exists flux_interest_daily (
  id bigint generated always as identity primary key,
  source text not null,              -- 'wikipedia' (v1)
  entity text not null,              -- titre article
  lang text not null default 'en',
  day date not null,
  value double precision not null,
  unique (source, entity, lang, day)
);

create table if not exists flux_crowd_snapshots (
  id bigint generated always as identity primary key,
  place_name text not null,
  lat double precision,
  lng double precision,
  captured_at timestamptz not null default now(),
  current_popularity int,            -- live 0-100, null si Google ne l'expose pas
  usual_popularity int               -- baseline heure courante
);

create table if not exists flux_zone_occupancy (
  id bigint generated always as identity primary key,
  zone text not null,
  snapshot_date date not null,
  listings_count int not null,
  occupancy_rate_30 double precision,
  occupancy_rate_60 double precision,
  occupancy_rate_90 double precision,
  unique (zone, snapshot_date)
);

-- GRANTs : copier le pattern exact de 20260710_activity_catalog.sql (service_role all, pas d'anon en v1)
-- puis: notify pgrst, 'reload schema';
```

- [ ] **Step 2: Appliquer sur le VPS**

```bash
ssh root@89.167.115.63 "docker exec -i \$(docker ps --format '{{.Names}}' | grep -m1 postgres | grep cretepulse || echo cretepulse-db-postgres-1) psql -U postgres -d cretepulse" < supabase/migrations/20260710_flux_tables.sql
```

(Si le nom du conteneur diffère : `ssh root@89.167.115.63 "docker ps"` pour l'identifier — c'est celui du compose `/opt/cretepulse-db`.)

Expected: `CREATE TABLE` × 6, pas d'erreur.

- [ ] **Step 3: Vérifier**

```bash
ssh root@89.167.115.63 "docker exec -i <conteneur> psql -U postgres -d cretepulse -c \"\\dt flux_*\""
```

Expected: 6 tables listées.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260710_flux_tables.sql
git commit -m "feat(flux): tables historisation flux touristiques (bus, vols, croisieres, interet, affluence, occupation)"
```

---

### Task 3: Module vps/flux — db.py, parsers.py, tests (TDD)

**Files:**
- Create: `vps/flux/db.py`
- Create: `vps/flux/parsers.py`
- Create: `vps/flux/tests/test_parsers.py`
- Create: `vps/flux/tests/fixtures/arr2web_sample.html`

- [ ] **Step 1: Créer la fixture arrivées** (extrait réel capturé le 10/07/2026)

`vps/flux/tests/fixtures/arr2web_sample.html` :

```html
<div>Last Update: 10 July 2026 13:03</div>
<table class="the_table" cellpadding="0" cellspacing="0" border="0"><tr class="line back_1 ">
  <td class="first_arr_time"><span class="ScheduledTime">11:05</span><br></td>
  <td class="first_arr"><span class="DestinationNameEng">Ostende</span></td>
  <td class="logoarea"><img id="foo" src="https://screen.herairport.com/airplane/TB.png" class="logo" /></td>
  <td class="flight_number_arr">TB 2281</td>
  <td class="checkins_arr"></td>
  <td class="Remark_arr"><span class="remtxt">Landed</span></td>
</tr>
<tr class="line back_0 ">
  <td class="first_arr_time"><span class="ScheduledTime">11:15</span><br></td>
  <td class="first_arr"><span class="DestinationNameEng">Tel Aviv</span></td>
  <td class="logoarea"><img id="foo" src="https://screen.herairport.com/airplane/BZ.png" class="logo" /></td>
  <td class="flight_number_arr">BZ 756</td>
  <td class="checkins_arr">01</td>
  <td class="Remark_arr"><span class="remtxt">Landed</span></td>
</tr></table>
```

- [ ] **Step 2: Écrire les tests (rouges)**

`vps/flux/tests/test_parsers.py` :

```python
from datetime import date
from pathlib import Path

from flux.parsers import normalize_agn, parse_arrivals, parse_service_date

FIXTURE = (Path(__file__).parent / "fixtures" / "arr2web_sample.html").read_text(encoding="utf-8")


def test_parse_service_date():
    assert parse_service_date(FIXTURE) == date(2026, 7, 10)


def test_parse_arrivals():
    rows = parse_arrivals(FIXTURE)
    assert len(rows) == 2
    assert rows[0]["sched_time"] == "11:05"
    assert rows[0]["flight_no"] == "TB 2281"
    assert rows[0]["airline_code"] == "TB"
    assert rows[0]["origin"] == "Ostende"
    assert rows[0]["status"] == "Landed"
    assert rows[1]["belt"] == "01"


def test_normalize_agn():
    payload = [
        {"latitude": "35.1907", "longitude": "25.7161", "speed": "32",
         "direction": "103.5", "route": "1", "imei": "35745", "pinakida": "HKZ 3297"},
        {"latitude": "0", "longitude": "0", "imei": "junk"},          # hors Crète -> drop
        {"latitude": "garbage", "longitude": "25.7", "imei": "bad"},  # invalide -> drop
    ]
    rows = normalize_agn(payload, 1)
    assert len(rows) == 1
    src, line, vkey, lat, lng, speed, bearing = rows[0]
    assert (src, line) == ("agncitybus", "1")
    assert abs(lat - 35.1907) < 1e-6
    assert speed == 32.0 and bearing == 103.5
    assert len(vkey) == 12 and "35745" not in vkey  # anonymisé
```

- [ ] **Step 3: Lancer les tests, vérifier l'échec**

Run (depuis `vps/`): `py -m pytest flux/tests -v`
Expected: FAIL / erreur d'import `flux.parsers` (module inexistant). Créer aussi `vps/flux/__init__.py` et `vps/flux/tests/__init__.py` vides pour l'import.

- [ ] **Step 4: Écrire `vps/flux/parsers.py`** (pur, aucune dépendance DB)

```python
"""Parsing pur des sources flux (testable sans reseau ni DB)."""
import hashlib
import re
from datetime import datetime, timezone

from bs4 import BeautifulSoup


def vehicle_key(raw) -> str:
    return hashlib.sha256(str(raw).encode()).hexdigest()[:12]


def _f(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def normalize_agn(payload, route):
    """JSON agncitybus -> tuples (source, line, vkey, lat, lng, speed, bearing)."""
    rows = []
    for b in payload or []:
        lat, lng = _f(b.get("latitude")), _f(b.get("longitude"))
        if lat is None or lng is None:
            continue
        if not (34.5 < lat < 36.0 and 23.0 < lng < 26.5):  # bbox Crète
            continue
        rows.append(("agncitybus", str(route), vehicle_key(b.get("imei") or b.get("number")),
                     lat, lng, _f(b.get("speed")), _f(b.get("direction"))))
    return rows


def normalize_citybus_vehicles(payload, source):
    """JSON rest.citybus.gr stops/live -> tuples. lat/lng strings, '0' = pas de GPS."""
    rows = {}
    for v in (payload or {}).get("vehicles", []):
        lat, lng = _f(v.get("latitude")), _f(v.get("longitude"))
        if not lat or not lng:  # 0.0 ou None -> pas de GPS
            continue
        code = v.get("vehicleCode") or ""
        rows[code] = (source, str(v.get("lineCode") or ""), vehicle_key(code),
                      lat, lng, None, None)
    return list(rows.values())


def parse_service_date(html):
    m = re.search(r"Last Update:\s*(\d{1,2} \w+ \d{4})", html)
    if not m:
        return datetime.now(timezone.utc).date()
    return datetime.strptime(m.group(1), "%d %B %Y").date()


def parse_arrivals(html):
    soup = BeautifulSoup(html, "html.parser")
    rows = []
    for tr in soup.select("tr.line"):
        time_el = tr.select_one(".ScheduledTime")
        flight_el = tr.select_one(".flight_number_arr")
        if not time_el or not flight_el:
            continue
        airline = None
        img = tr.select_one(".logoarea img")
        if img and img.get("src"):
            m = re.search(r"/([A-Z0-9]{2,3})\.png$", img["src"])
            airline = m.group(1) if m else None
        origin_el = tr.select_one(".DestinationNameEng")
        belt_el = tr.select_one(".checkins_arr")
        status_el = tr.select_one(".remtxt")
        rows.append({
            "sched_time": time_el.get_text(strip=True),
            "flight_no": " ".join(flight_el.get_text(strip=True).split()),
            "airline_code": airline,
            "origin": origin_el.get_text(strip=True) if origin_el else None,
            "belt": (belt_el.get_text(strip=True) or None) if belt_el else None,
            "status": status_el.get_text(strip=True) if status_el else None,
        })
    return rows
```

- [ ] **Step 5: Relancer les tests**

Run: `py -m pytest flux/tests -v` (installer bs4 en local si absent : `py -m pip install beautifulsoup4 pytest`)
Expected: 3 PASS.

- [ ] **Step 6: Écrire `vps/flux/db.py`**

```python
"""Connexion Postgres locale (self-host cretepulse) pour les scripts flux."""
import os

import psycopg2
from dotenv import load_dotenv

load_dotenv("/opt/cretepulse/.env")


def connect():
    return psycopg2.connect(
        host="localhost", port=5433, dbname="cretepulse",
        user="postgres", password=os.environ["POSTGRES_PASSWORD"],
    )


def insert_rows(sql, rows):
    if not rows:
        return 0
    conn = connect()
    conn.autocommit = True
    with conn, conn.cursor() as cur:
        cur.executemany(sql, rows)
    conn.close()
    return len(rows)
```

- [ ] **Step 7: Commit**

```bash
git add vps/flux/
git commit -m "feat(flux): module parsers purs + acces db + tests (arrivees HER, GPS agncitybus/citybus)"
```

---

### Task 4: Script flight_arrivals.py (arrivées HER)

**Files:**
- Create: `vps/flux/flight_arrivals.py`

- [ ] **Step 1: Écrire le script**

```python
#!/usr/bin/env python3
"""Historise les arrivees de l'aeroport d'Heraklion (tableau officiel, MAJ 15s).

Cron : */10 * * * *. Upsert par (airport, service_date, flight_no, sched_time).
"""
import sys
import urllib.request

from db import connect
from parsers import parse_arrivals, parse_service_date

URL = "https://screen.herairport.com/arr2web.php"
UA = "Mozilla/5.0 (compatible; CreteDirectFlux/1.0; +https://crete.direct)"

UPSERT_SQL = """
insert into flux_flight_arrivals
  (airport, service_date, sched_time, flight_no, airline_code, origin, status, belt, landed_at)
values ('HER', %(service_date)s, %(sched_time)s, %(flight_no)s, %(airline_code)s,
        %(origin)s, %(status)s, %(belt)s,
        case when %(status)s = 'Landed' then now() end)
on conflict (airport, service_date, flight_no, sched_time) do update set
  status = excluded.status,
  belt = coalesce(excluded.belt, flux_flight_arrivals.belt),
  last_seen_at = now(),
  landed_at = coalesce(flux_flight_arrivals.landed_at, excluded.landed_at);
"""


def run():
    req = urllib.request.Request(URL, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        html = r.read().decode("utf-8", errors="replace")
    day = parse_service_date(html)
    rows = parse_arrivals(html)
    for row in rows:
        row["service_date"] = day
    conn = connect()
    conn.autocommit = True
    with conn, conn.cursor() as cur:
        for row in rows:
            cur.execute(UPSERT_SQL, row)
    conn.close()
    print(f"HER {day}: {len(rows)} vols upsert")


if __name__ == "__main__":
    try:
        run()
    except Exception as exc:  # cron : log et exit != 0
        print(f"flight_arrivals ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
```

Note : les imports sont `from db import ...` / `from parsers import ...` (exécution `cd /opt/cretepulse/flux && python3 flight_arrivals.py`). Les tests importent `flux.parsers` depuis `vps/` — les deux fonctionnent car `parsers.py` n'importe pas `db`.

- [ ] **Step 2: Déployer et tester en réel sur le VPS**

```bash
ssh root@89.167.115.63 "mkdir -p /opt/cretepulse/flux && pip3 install --quiet beautifulsoup4"
scp vps/flux/db.py vps/flux/parsers.py vps/flux/flight_arrivals.py root@89.167.115.63:/opt/cretepulse/flux/
ssh root@89.167.115.63 "cd /opt/cretepulse/flux && python3 flight_arrivals.py"
```

Expected: `HER 2026-07-10: N vols upsert` (N ≈ 20-60 en saison).

- [ ] **Step 3: Vérifier les données**

```bash
ssh root@89.167.115.63 "docker exec -i <conteneur postgres> psql -U postgres -d cretepulse -c \"select service_date, count(*), count(landed_at) as landed from flux_flight_arrivals group by 1;\""
```

Expected: 1 ligne, count > 0.

- [ ] **Step 4: Commit**

```bash
git add vps/flux/flight_arrivals.py
git commit -m "feat(flux): historisation arrivees aeroport Heraklion (scrape tableau officiel /10min)"
```

---

### Task 5: Script bus_positions.py (GPS Ag.Nik + citybus HER/CHA)

**Files:**
- Create: `vps/flux/bus_positions.py`

- [ ] **Step 1: Récupérer les constantes citybus du proxy existant**

Lire `src/app/api/buses/citybus-live/[stop]/route.ts` : noter (a) l'agency code de Chania (HER = `110`), (b) l'URL exacte de la page token par ville, (c) la regex de scrape du token. Les reporter dans le dict `CITYBUS` du script ci-dessous.

- [ ] **Step 2: Choisir les arrêts hubs à poller** (10-12 par ville)

Objectif : couvrir les nœuds où passent le plus de lignes. Sur le VPS :

```sql
-- psql cretepulse : arrêts HER les plus desservis (adapter les noms de colonnes si besoin,
-- schéma de référence : migration 20260521120000_buses.sql + ALTER api_code du 09/07)
select s.api_code, s.name, count(distinct ls.line_id) as nb_lignes
from bus_stops s join bus_line_stops ls on ls.stop_id = s.id
where s.slug like 'hkl-%' and s.api_code is not null
group by 1, 2 order by 3 desc limit 15;
-- idem CHA : slug like 'cha-%' (vérifier le préfixe réel : select distinct left(slug,4) from bus_stops)
```

Retenir les 10-12 premiers par ville + toujours inclure HER `0122` et CHA `74003` (vérifiés). Coller les codes dans `CITYBUS[...]["stops"]`.

- [ ] **Step 3: Écrire le script**

```python
#!/usr/bin/env python3
"""Historise les positions GPS des bus urbains.

- agncitybus (Agios Nikolaos)  : positions completes routes 1-3   -> cron * 4-19 * * * (UTC)
- citybus HER/CHA              : vehicules vus aux arrets hubs     -> cron */5 4-20 * * * (--citybus)
"""
import json
import re
import sys
import urllib.error
import urllib.request

from db import insert_rows
from parsers import normalize_agn, normalize_citybus_vehicles

UA = "Mozilla/5.0 (compatible; CreteDirectFlux/1.0; +https://crete.direct)"
AGN_URL = "https://www.agncitybus.gr/map/get_location_route.php?route={r}"
CITYBUS_REST = "https://rest.citybus.gr/api/v1"
TOKEN_RE = re.compile(r"const token = '([^']+)'")  # verifier vs route.ts (Step 1)

CITYBUS = {
    # stops : remplis en Step 2 ; agency CHA : repris de route.ts en Step 1
    "citybus-her": {"page": "https://irakleio.citybus.gr/el/stops", "agency": "110",
                    "stops": ["0122"]},
    "citybus-cha": {"page": "<page CHA, cf route.ts>", "agency": "<agency CHA, cf route.ts>",
                    "stops": ["74003"]},
}

INSERT_SQL = ("insert into flux_bus_positions"
              " (source, line_code, vehicle_key, lat, lng, speed_kmh, bearing)"
              " values (%s,%s,%s,%s,%s,%s,%s)")


def http_get(url, headers=None):
    req = urllib.request.Request(url, headers={"User-Agent": UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read().decode("utf-8", errors="replace")


def run_agn():
    rows = []
    for r in (1, 2, 3):
        try:
            rows += normalize_agn(json.loads(http_get(AGN_URL.format(r=r))), r)
        except Exception as exc:
            print(f"agn route {r}: {exc}", file=sys.stderr)
    print(f"agncitybus: {insert_rows(INSERT_SQL, rows)} positions")


def run_citybus():
    for source, cfg in CITYBUS.items():
        try:
            token = TOKEN_RE.search(http_get(cfg["page"])).group(1)
        except Exception as exc:
            print(f"{source} token: {exc}", file=sys.stderr)
            continue
        rows = {}
        for code in cfg["stops"]:
            url = f"{CITYBUS_REST}/el/{cfg['agency']}/stops/live/{code}"
            try:
                payload = json.loads(http_get(url, {"Authorization": f"Bearer {token}"}))
            except urllib.error.HTTPError as exc:
                if exc.code == 404:   # arret sans passage = normal
                    continue
                print(f"{source} stop {code}: HTTP {exc.code}", file=sys.stderr)
                continue
            except Exception as exc:
                print(f"{source} stop {code}: {exc}", file=sys.stderr)
                continue
            for row in normalize_citybus_vehicles(payload, source):
                rows[row[2]] = row  # dedup par vehicle_key entre arrets
        print(f"{source}: {insert_rows(INSERT_SQL, list(rows.values()))} positions")


if __name__ == "__main__":
    if "--citybus" in sys.argv:
        run_citybus()
    else:
        run_agn()
```

- [ ] **Step 4: Test réel sur le VPS** (en journée 07:00-22:00 Athens, sinon 0 position = normal)

```bash
scp vps/flux/bus_positions.py root@89.167.115.63:/opt/cretepulse/flux/
ssh root@89.167.115.63 "cd /opt/cretepulse/flux && python3 bus_positions.py && python3 bus_positions.py --citybus"
```

Expected: `agncitybus: N positions` (N ≥ 0) et `citybus-her: M positions` sans traceback.

- [ ] **Step 5: Commit**

```bash
git add vps/flux/bus_positions.py
git commit -m "feat(flux): historisation positions GPS bus urbains (AgNik complet + hubs HER/CHA)"
```

---

### Task 6: Script cruise_calls.py (escales croisières Héraklion)

**Files:**
- Create: `vps/flux/cruise_calls.py`

- [ ] **Step 1: Inspecter le PDF** (structure de tableau inconnue — étape d'exploration obligatoire)

```bash
curl -s -o /tmp/cruise2026.pdf "<URL PDF 2026 notée en Task 1>"
python3 - <<'EOF'
import pdfplumber
with pdfplumber.open("/tmp/cruise2026.pdf") as pdf:
    for row in (pdf.pages[0].extract_table() or [])[:8]:
        print(row)
EOF
```

Noter : index des colonnes date / navire / ETA / ETD / passagers, format de date. Adapter `COL_*` et `parse_call_date` ci-dessous en conséquence.

- [ ] **Step 2: Écrire le script** (adapter le mapping colonnes au résultat du Step 1)

```python
#!/usr/bin/env python3
"""Historise le calendrier officiel des escales croisieres du port d'Heraklion (PDF annuel).

Cron : 0 5 1 * * (mensuel, le PDF est mis a jour en cours de saison).
"""
import re
import sys
import urllib.request
from datetime import datetime

import pdfplumber

from db import connect

PDF_URL = "<URL PDF 2026 notée en Task 1>"
YEAR = 2026
# Indices de colonnes constatés au Step 1 (à ajuster) :
COL_DATE, COL_SHIP, COL_ETA, COL_ETD, COL_PAX = 1, 2, 3, 4, 5

UPSERT_SQL = """
insert into flux_cruise_calls (port, call_date, ship_name, eta, etd, pax_capacity, updated_at)
values ('heraklion', %s, %s, %s, %s, %s, now())
on conflict (port, call_date, ship_name) do update set
  eta = excluded.eta, etd = excluded.etd,
  pax_capacity = coalesce(excluded.pax_capacity, flux_cruise_calls.pax_capacity),
  updated_at = now();
"""


def parse_call_date(raw):
    raw = (raw or "").strip()
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%d/%m", "%d %B %Y", "%d %b"):
        try:
            d = datetime.strptime(raw, fmt)
            return d.replace(year=YEAR).date() if d.year == 1900 else d.date()
        except ValueError:
            continue
    return None


def parse_pax(raw):
    m = re.search(r"\d[\d.,]*", raw or "")
    return int(re.sub(r"[.,]", "", m.group(0))) if m else None


def run():
    urllib.request.urlretrieve(PDF_URL, "/tmp/cruise_schedule.pdf")
    calls = []
    with pdfplumber.open("/tmp/cruise_schedule.pdf") as pdf:
        for page in pdf.pages:
            for row in page.extract_table() or []:
                if not row or len(row) <= max(COL_SHIP, COL_DATE):
                    continue
                day = parse_call_date(row[COL_DATE])
                ship = (row[COL_SHIP] or "").strip()
                if not day or not ship or ship.lower() in ("vessel", "ship", "name"):
                    continue
                calls.append((day, ship,
                              (row[COL_ETA] or "").strip() or None,
                              (row[COL_ETD] or "").strip() or None,
                              parse_pax(row[COL_PAX]) if len(row) > COL_PAX else None))
    conn = connect()
    conn.autocommit = True
    with conn, conn.cursor() as cur:
        for call in calls:
            cur.execute(UPSERT_SQL, call)
    conn.close()
    print(f"croisieres heraklion: {len(calls)} escales upsert")


if __name__ == "__main__":
    try:
        run()
    except Exception as exc:
        print(f"cruise_calls ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
```

- [ ] **Step 3: Test réel sur le VPS**

```bash
scp vps/flux/cruise_calls.py root@89.167.115.63:/opt/cretepulse/flux/
ssh root@89.167.115.63 "cd /opt/cretepulse/flux && python3 cruise_calls.py"
ssh root@89.167.115.63 "docker exec -i <conteneur postgres> psql -U postgres -d cretepulse -c \"select count(*), min(call_date), max(call_date) from flux_cruise_calls;\""
```

Expected: plusieurs dizaines d'escales couvrant avril-octobre 2026. Contrôle qualité : vérifier 2-3 escales connues (ex Costa Fortuna 30/06, Seven Seas Voyager 01/07 — vues sur CruiseMapper le 10/07).

- [ ] **Step 4: Commit**

```bash
git add vps/flux/cruise_calls.py
git commit -m "feat(flux): calendrier escales croisieres port Heraklion (PDF officiel, mensuel)"
```

---

### Task 7: Script wiki_interest.py (pageviews Wikipedia)

**Files:**
- Create: `vps/flux/wiki_interest.py`

- [ ] **Step 1: Écrire le script**

```python
#!/usr/bin/env python3
"""Historise l'interet quotidien pour les POI cretois via pageviews Wikipedia (API officielle).

Cron : 30 5 * * * (quotidien). Lag donnees Wikimedia ~24-48h -> on requete J-3.
"""
import json
import sys
import urllib.error
import urllib.request
from datetime import date, timedelta

from db import insert_rows

UA = "CreteDirectFlux/1.0 (https://crete.direct; contact@kairosguest.com)"
API = ("https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/"
       "en.wikipedia.org/all-access/user/{title}/daily/{d}/{d}")

ENTITIES = [
    "Knossos", "Elafonisi", "Balos", "Samariá_Gorge", "Heraklion", "Chania",
    "Rethymno", "Agios_Nikolaos,_Crete", "Ierapetra", "Sitia", "Spinalonga",
    "Matala,_Crete", "Phaistos", "Preveli", "Arkadi_Monastery", "Falasarna",
    "Loutro", "Elounda", "Malia,_Crete", "Hersonissos", "Vai,_Greece", "Crete",
]

INSERT_SQL = ("insert into flux_interest_daily (source, entity, lang, day, value)"
              " values ('wikipedia', %s, 'en', %s, %s)"
              " on conflict (source, entity, lang, day) do nothing")


def run():
    day = date.today() - timedelta(days=3)
    d = day.strftime("%Y%m%d")
    rows, misses = [], []
    for title in ENTITIES:
        url = API.format(title=urllib.parse.quote(title, safe=""), d=d)
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                items = json.loads(resp.read()).get("items", [])
            if items:
                rows.append((title, day, float(items[0]["views"])))
        except urllib.error.HTTPError as exc:
            misses.append(f"{title}:{exc.code}")
        except Exception as exc:
            misses.append(f"{title}:{exc}")
    print(f"wikipedia {day}: {insert_rows(INSERT_SQL, rows)} entites" +
          (f" | manquants: {', '.join(misses)}" if misses else ""))


if __name__ == "__main__":
    import urllib.parse  # noqa: E402 (utilise dans run)
    try:
        run()
    except Exception as exc:
        print(f"wiki_interest ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
```

(Déplacer l'`import urllib.parse` en tête de fichier avec les autres imports — noté ici pour lisibilité du diff.)

- [ ] **Step 2: Test réel + purge des titres 404**

```bash
scp vps/flux/wiki_interest.py root@89.167.115.63:/opt/cretepulse/flux/
ssh root@89.167.115.63 "cd /opt/cretepulse/flux && python3 wiki_interest.py"
```

Expected: `wikipedia YYYY-MM-DD: ~20 entites`. Si `manquants:` liste des titres en 404 : corriger le titre (chercher l'article réel sur en.wikipedia.org) ou le retirer de `ENTITIES`, redéployer, relancer. La liste finale ne doit produire AUCUN 404.

- [ ] **Step 3: Commit**

```bash
git add vps/flux/wiki_interest.py
git commit -m "feat(flux): interet quotidien POI cretois via pageviews Wikipedia"
```

---

### Task 8: Script crowd_snapshots.py (Popular Times — best-effort)

⚠️ Source non officielle (scraping Google Maps), lib instable. Cette brique est **non bloquante** : si elle casse, elle log et sort en erreur sans impacter le reste. Ne pas y passer plus d'une heure ; si la lib ne renvoie rien d'exploitable, marquer la task ABANDONED dans le commit et passer à la suite.

**Files:**
- Create: `vps/flux/crowd_snapshots.py`

- [ ] **Step 1: Installer et tester la lib sur le VPS**

```bash
ssh root@89.167.115.63 "pip3 install --quiet LivePopularTimes && python3 -c \"
import livepopulartimes
d = livepopulartimes.get_populartimes_by_address('Knossos Palace, Heraklion, Greece')
print(d.get('current_popularity'), bool(d.get('populartimes')))\""
```

Expected: un entier (ou None hors heures) + `True`. Si exception ou données vides : STOP, task ABANDONED.

- [ ] **Step 2: Écrire le script**

```python
#!/usr/bin/env python3
"""Snapshots d'affluence Google Popular Times sur les POI majeurs (best-effort, source fragile).

Cron : 15 5-19 * * * avec TZ=Europe/Athens (1 snapshot/h en journee).
"""
import sys
from datetime import datetime

import livepopulartimes

from db import insert_rows

POIS = [
    "Knossos Palace, Heraklion, Greece",
    "Heraklion Archaeological Museum, Heraklion, Greece",
    "Elafonisi Beach, Crete, Greece",
    "Balos Lagoon, Kissamos, Greece",
    "Matala Beach, Crete, Greece",
    "Spinalonga, Elounda, Greece",
    "Vai Beach, Crete, Greece",
    "Falassarna Beach, Crete, Greece",
    "Preveli Beach, Crete, Greece",
    "Old Venetian Harbor, Chania, Greece",
    "Lake Voulismeni, Agios Nikolaos, Greece",
    "Samaria Gorge National Park, Crete, Greece",
    "Arkadi Monastery, Rethymno, Greece",
    "Makrigialos Beach, Crete, Greece",
    "Voulisma Beach, Istron, Greece",
]

INSERT_SQL = ("insert into flux_crowd_snapshots"
              " (place_name, lat, lng, current_popularity, usual_popularity)"
              " values (%s,%s,%s,%s,%s)")


def run():
    now = datetime.now()  # TZ=Europe/Athens via cron
    rows, errors = [], 0
    for name in POIS:
        try:
            d = livepopulartimes.get_populartimes_by_address(name) or {}
            coords = d.get("coordinates") or {}
            usual = None
            pts = d.get("populartimes")
            if pts:
                usual = pts[now.weekday()]["data"][now.hour]
            cur = d.get("current_popularity")
            if cur is None and usual is None:
                continue
            rows.append((name, coords.get("lat"), coords.get("lng"), cur, usual))
        except Exception as exc:
            errors += 1
            print(f"crowd {name}: {exc}", file=sys.stderr)
    print(f"crowd: {insert_rows(INSERT_SQL, rows)} snapshots ({errors} erreurs)")


if __name__ == "__main__":
    run()
```

- [ ] **Step 3: Test réel**

```bash
scp vps/flux/crowd_snapshots.py root@89.167.115.63:/opt/cretepulse/flux/
ssh root@89.167.115.63 "cd /opt/cretepulse/flux && TZ=Europe/Athens python3 crowd_snapshots.py"
```

Expected: `crowd: N snapshots` avec N ≥ 8 (tous les POI ne renvoient pas toujours du live).

- [ ] **Step 4: Commit**

```bash
git add vps/flux/crowd_snapshots.py
git commit -m "feat(flux): snapshots affluence Popular Times POI majeurs (best-effort)"
```

---

### Task 9: Export occupation Airbnb par zone (repo scrapper)

**Files:**
- Create (repo `C:\Users\fkerj\scrapper`): `pipeline/zone_flux_export.py`
- Modify: `pipeline/run_weekly.sh`

- [ ] **Step 1: Vérifier le nom de la colonne zone**

Ouvrir `C:\Users\fkerj\scrapper\migrations\001_listings_v2.sql` et confirmer le nom de la colonne zone de la table `listings` (attendu : `zone`). Adapter le script si différent.

- [ ] **Step 2: Écrire le script** (tourne sur le VPS après le pipeline hebdo ; lit le Supabase scrapper, écrit dans le Postgres cretepulse local)

```python
"""Agrege l'occupation Airbnb par zone -> flux_zone_occupancy (Postgres cretepulse local).

Lance par run_weekly.sh apres pipeline.calendar. Lit listing_snapshots (fenetre 10 jours).
"""
import os
from collections import defaultdict
from datetime import date, timedelta

import psycopg2
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])


def fetch_all(table, columns, filters=None):
    out, start = [], 0
    while True:
        q = sb.table(table).select(columns).range(start, start + 999)
        for f in filters or []:
            q = f(q)
        batch = q.execute().data
        out += batch
        if len(batch) < 1000:
            return out
        start += 1000


def run():
    since = (date.today() - timedelta(days=10)).isoformat()
    snaps = fetch_all("listing_snapshots",
                      "airbnb_id,snapshot_date,occupancy_rate_30,occupancy_rate_60,occupancy_rate_90",
                      [lambda q: q.gte("snapshot_date", since)])
    zones = {l["airbnb_id"]: l["zone"] for l in fetch_all("listings", "airbnb_id,zone") if l.get("zone")}

    latest = {}
    for s in snaps:  # snapshot le plus recent par listing
        cur = latest.get(s["airbnb_id"])
        if not cur or s["snapshot_date"] > cur["snapshot_date"]:
            latest[s["airbnb_id"]] = s

    agg = defaultdict(lambda: {"n": 0, "o30": [], "o60": [], "o90": []})
    for aid, s in latest.items():
        zone = zones.get(aid)
        if not zone:
            continue
        a = agg[zone]
        a["n"] += 1
        for key, col in (("o30", "occupancy_rate_30"), ("o60", "occupancy_rate_60"), ("o90", "occupancy_rate_90")):
            if s.get(col) is not None:
                a[key].append(float(s[col]))

    mean = lambda xs: (sum(xs) / len(xs)) if xs else None
    conn = psycopg2.connect(host="localhost", port=5433, dbname="cretepulse",
                            user="postgres", password=os.environ["POSTGRES_PASSWORD"])
    conn.autocommit = True
    with conn, conn.cursor() as cur:
        for zone, a in agg.items():
            cur.execute("""
                insert into flux_zone_occupancy
                  (zone, snapshot_date, listings_count, occupancy_rate_30, occupancy_rate_60, occupancy_rate_90)
                values (%s, %s, %s, %s, %s, %s)
                on conflict (zone, snapshot_date) do update set
                  listings_count = excluded.listings_count,
                  occupancy_rate_30 = excluded.occupancy_rate_30,
                  occupancy_rate_60 = excluded.occupancy_rate_60,
                  occupancy_rate_90 = excluded.occupancy_rate_90
            """, (zone, date.today(), a["n"], mean(a["o30"]), mean(a["o60"]), mean(a["o90"])))
    conn.close()
    print(f"zone occupancy: {len(agg)} zones exportees")


if __name__ == "__main__":
    run()
```

Prérequis env : `POSTGRES_PASSWORD` doit être présent dans le `.env` du scrapper sur le VPS (`/opt/scrapper/.env`) — l'ajouter depuis `/opt/cretepulse-db/.env` si absent.

- [ ] **Step 3: Ajouter au pipeline hebdo**

Dans `pipeline/run_weekly.sh`, après l'étape `python -m pipeline.calendar` (et avant le report), ajouter :

```bash
python -m pipeline.zone_flux_export || echo "zone_flux_export failed (non bloquant)"
```

- [ ] **Step 4: Test réel sur le VPS**

```bash
scp pipeline/zone_flux_export.py root@89.167.115.63:/opt/scrapper/pipeline/
ssh root@89.167.115.63 "cd /opt/scrapper && python3 -m pipeline.zone_flux_export"
ssh root@89.167.115.63 "docker exec -i <conteneur postgres> psql -U postgres -d cretepulse -c \"select zone, listings_count, round(occupancy_rate_30::numeric,3) from flux_zone_occupancy order by listings_count desc limit 10;\""
```

Expected: ~35 zones, occupations entre 0 et 1, cohérentes (été : plutôt hautes).

- [ ] **Step 5: Commit (repo scrapper)**

```bash
git add pipeline/zone_flux_export.py pipeline/run_weekly.sh
git commit -m "feat(flux): export hebdo occupation Airbnb par zone vers flux_zone_occupancy"
```

---

### Task 10: Crontab VPS + vérification bout-en-bout + mémoire

- [ ] **Step 1: Ajouter les crons** (`ssh root@89.167.115.63 "crontab -e"` ou `crontab -l | ... | crontab -`)

```cron
# --- flux touristiques crete.direct (plan 2026-07-10) ---
* 4-19 * * *   cd /opt/cretepulse/flux && python3 bus_positions.py           >> /opt/cretepulse/flux/flux.log 2>&1
*/5 4-20 * * * cd /opt/cretepulse/flux && python3 bus_positions.py --citybus >> /opt/cretepulse/flux/flux.log 2>&1
*/10 * * * *   cd /opt/cretepulse/flux && python3 flight_arrivals.py         >> /opt/cretepulse/flux/flux.log 2>&1
30 5 * * *     cd /opt/cretepulse/flux && python3 wiki_interest.py           >> /opt/cretepulse/flux/flux.log 2>&1
15 5-19 * * *  cd /opt/cretepulse/flux && TZ=Europe/Athens python3 crowd_snapshots.py >> /opt/cretepulse/flux/flux.log 2>&1
0 5 1 * *      cd /opt/cretepulse/flux && python3 cruise_calls.py            >> /opt/cretepulse/flux/flux.log 2>&1
```

(Heures UTC : 4-19 UTC = 7-22 Athens. Ajuster si une source a basculé côté PC Windows en Task 1.)

- [ ] **Step 2: Logrotate simple** — le log est en append sans rotation : ajouter en fin de crontab

```cron
0 3 * * 0      tail -c 5M /opt/cretepulse/flux/flux.log > /tmp/flux.log && mv /tmp/flux.log /opt/cretepulse/flux/flux.log
```

- [ ] **Step 3: Vérification bout-en-bout à H+2** (après 2 h de crons)

```bash
ssh root@89.167.115.63 "docker exec -i <conteneur postgres> psql -U postgres -d cretepulse -c \"
select 'bus' as t, count(*) from flux_bus_positions where recorded_at > now() - interval '2 hours'
union all select 'vols', count(*) from flux_flight_arrivals where last_seen_at > now() - interval '2 hours'
union all select 'crowd', count(*) from flux_crowd_snapshots where captured_at > now() - interval '2 hours';\""
```

Expected: chaque compteur > 0 (bus = 0 acceptable si hors 7h-22h Athens). Consulter aussi `tail -50 /opt/cretepulse/flux/flux.log` : aucune stacktrace répétée.

- [ ] **Step 4: Estimation volume disque** (disque VPS à ~66%)

```bash
ssh root@89.167.115.63 "docker exec -i <conteneur postgres> psql -U postgres -d cretepulse -c \"select pg_size_pretty(pg_total_relation_size('flux_bus_positions'));\""
```

Ordre de grandeur attendu : quelques Mo/mois (rows texte courtes). Si > 100 Mo/mois constaté plus tard : downsampler agncitybus à */2 min.

- [ ] **Step 5: Push + mémoire**

```bash
git push origin master   # scripts vps/ : PAS besoin de main (rien côté Vercel)
```

Mettre à jour `~/.claude/projects/C--Users-fkerj/memory/` : fiche `project_crete_direct_flux_data.md` (nouvelle, état des 6 capteurs + crons + tables) + ligne MEMORY.md + session_log. Tagger [FACT] avec les comptes de la vérification Step 3.

---

## Backlog explicitement HORS SCOPE v1 (ne pas construire)

- Arrivées Chania (OpenSky `/flights/arrival?airport=LGSA`, nécessite compte) — activer si la preuve HER convainc.
- Ferries (aucune source vérifiée).
- Google Trends (pytrends instable, valeur marginale vs Wikipedia).
- GPS loueurs (gelé, cf `project_crete_direct_flux_voiture.md`, déclencheur = retour Kotsoglou).
- Exposition publique des données (pages/API crete.direct) — d'abord accumuler 2-4 semaines de série.
