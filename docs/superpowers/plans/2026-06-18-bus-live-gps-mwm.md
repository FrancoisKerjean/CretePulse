> **⚠️ PLAN SUSPENDU (18/06/2026)** — Le spike a finalement montré que l'API KTEL Herlas
> **n'expose AUCUNE position GPS de bus** (cf `2026-06-18-bus-gps-spike-report.md`, verdict corrigé).
> Option A est sans objet : il n'y a rien à scraper. Ce plan est conservé pour traçabilité mais
> n'est PAS à exécuter. Voir les options B/C dans le rapport de spike.

# Bus Live — GPS réel (KTEL Herlas) + autonomie — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Brancher les vraies positions GPS des bus KTEL Heraklion-Lasithi (`GET https://backoffice.ktelherlas.gr/api/v1/transit`, auth Keycloak realm `ktel`) sur la carte `/live` de crete.direct, en gardant le moteur estimatif en repli, le tout collecté de façon autonome.

**Architecture:** Un service Python continu (VPS, systemd) s'authentifie via password grant Keycloak (compte de service), poll `/api/v1/transit` toutes les ~20 s, normalise les véhicules (`lat/lng/heading/speed/routeId/vehicleCode`) et les upsert dans une table Supabase `bus_vehicles_live` (TTL 2 min). Le front `/live` lit cette table (Supabase Realtime + repli polling), fusionne avec le moteur estimatif existant (GPS primaire, estimatif quand pas de signal frais) et affiche un badge par bus.

**Tech Stack:** Python 3 (requests), Supabase (Postgres + Realtime), Next.js 16 / React 19 / TypeScript, MapLibre GL (existant), systemd, Keycloak (OAuth2 password grant).

**Décisions verrouillées** (cf spec `2026-06-18-bus-live-gps-mwm-design.md` + spike `2026-06-18-bus-gps-spike-report.md`) : option A (scraping authentifié), scope v1 = Heraklion-Lasithi (Est), GPS primaire + estimatif repli, badge par bus.

**Pré-requis bloquant** : le `client_id` mobile exact + la confirmation du password grant ne sont PAS encore connus → **Task 1 est un gate**. Si Task 1 échoue (direct grants désactivés pour le client), le plan s'arrête à Task 1 (coût minimal) et on rebascule sur la voie B (accès officiel) ou C (statu quo estimatif).

---

## File Structure

**Collecteur (nouveau, Python)** — `scripts/scrapers/buses/gps/` :
- `ktel_auth.py` — obtention + cache + refresh du token Keycloak (password grant).
- `transit_client.py` — appel `GET /api/v1/transit` avec Bearer, renvoie le JSON brut.
- `normalize.py` — pur : JSON brut transit → liste de dicts `{vehicle_id, lat, lng, bearing, route_ref, captured_at}`.
- `store.py` — upsert dans `bus_vehicles_live` (Supabase service key).
- `collector.py` — boucle continue : auth → fetch → normalize → store → sleep ; alerte Telegram sur échec.
- `tests/` — `test_normalize.py`, `test_ktel_auth.py`, `test_transit_client.py` + `fixtures/transit-sample.json`.

**DB** — `supabase/migrations/20260618HHMMSS_bus_vehicles_live.sql`.

**Front** — `src/lib/bus-live/` (à côté de `position.ts` existant) :
- `gps-source.ts` — récupère les véhicules GPS depuis Supabase (subscribe Realtime + repli polling).
- `fuse.ts` — pur : fusionne véhicules GPS (frais) + bus estimés → liste unifiée avec `kind: 'gps' | 'estimated'`.
- modifier `src/components/live/LiveMapClient.tsx` — consommer la source fusionnée, badge global.
- modifier `src/components/live/busMarker.ts` — style marqueur GPS vs estimé.

**Ops** — `ops/cretepulse-gps.service` (unit systemd) + `ops/DEPLOY-gps.md`.

---

## Task 1 (GATE) : Capture runtime de l'auth + échantillon réel `/transit`

**But** : obtenir le `client_id` mobile exact, prouver que le password grant fonctionne avec un compte de service, et sauvegarder un échantillon réel de `/api/v1/transit` (sert de fixture à tout le reste). **Aucune ligne de collecteur n'est écrite avant que ce gate passe.**

**Files:**
- Create: `scripts/scrapers/buses/gps/tests/fixtures/transit-sample.json`
- Create: `scripts/scrapers/buses/gps/CAPTURE-NOTES.md` (client_id, realm, séquence d'auth, champs réels observés — PAS de secret/mot de passe versionné)

- [ ] **Step 1 : Émulateur + proxy**

Lancer un émulateur Android (Android Studio AVD, ou Genymotion) sur la machine de dev. Installer mitmproxy (`pip install mitmproxy`), lancer `mitmweb`. Configurer le proxy système de l'AVD vers mitmproxy (10.0.2.2:8080 pour l'AVD standard), installer le certif mitmproxy en CA système de l'AVD (writable system sur AVD sans Google Play).

- [ ] **Step 2 : Installer l'app et capturer le login**

Installer l'APK `gr.ktelherlas.app` (déjà téléchargé dans `.spike/app1.apk`). Si TLS pinning bloque, patcher avec `apk-mitm` (`npx apk-mitm .spike/app1.apk`) puis réinstaller le `-patched.apk`. Créer un compte dans l'app (email + mot de passe dédié = futur compte de service), se connecter.

- [ ] **Step 3 : Identifier la requête token**

Dans mitmweb, repérer l'appel à `keycloak.ktelherlas.gr/realms/ktel/protocol/openid-connect/token`. Noter : `client_id`, `grant_type` (password ou authorization_code), présence d'un `client_secret`, le `scope`. Repérer ensuite l'appel `GET backoffice.ktelherlas.gr/api/v1/transit` avec le header `Authorization: Bearer ...`.

- [ ] **Step 4 : Vérifier le password grant en CLI (le gate)**

Avec le `client_id` observé et les identifiants du compte de service, exécuter :

```bash
curl -s -X POST "https://keycloak.ktelherlas.gr/realms/ktel/protocol/openid-connect/token" \
  -d "grant_type=password" -d "client_id=<CLIENT_ID>" \
  --data-urlencode "username=<SERVICE_USER>" --data-urlencode "password=<SERVICE_PASS>" \
  [--data-urlencode "client_secret=<SECRET>" si client confidentiel]
```

Attendu : un JSON avec `access_token` + `refresh_token`.
**GATE** : si la réponse est `unauthorized_client` (« Direct access grants are not allowed »), le password grant est OFF pour ce client → **STOP option A**, remonter à Kami pour bascule B/C. Ne pas continuer le plan.

- [ ] **Step 5 : Tirer l'échantillon réel**

```bash
TOKEN=<access_token de Step 4>
curl -s -H "Authorization: Bearer $TOKEN" "https://backoffice.ktelherlas.gr/api/v1/transit" \
  -o scripts/scrapers/buses/gps/tests/fixtures/transit-sample.json
```

Vérifier que le fichier contient un tableau de véhicules avec lat/lng/heading/routeId. **Anonymiser** si un champ contient une donnée nominative (a priori non : positions de bus uniquement).

- [ ] **Step 6 : Documenter (sans secrets)**

Écrire `scripts/scrapers/buses/gps/CAPTURE-NOTES.md` : `client_id`, realm, grant_type, scope, host API, noms de champs RÉELS observés dans l'échantillon (lat vs latitude, etc.), cadence de refresh observée. Les identifiants du compte de service vont dans `.env` (jamais committé), pas ici.

- [ ] **Step 7 : Commit (fixture + notes uniquement)**

```bash
git add scripts/scrapers/buses/gps/tests/fixtures/transit-sample.json scripts/scrapers/buses/gps/CAPTURE-NOTES.md
git commit -m "spike(gps): echantillon reel /api/v1/transit + notes auth (client_id, password grant confirme)"
```

---

## Task 2 : Migration table `bus_vehicles_live`

**Files:**
- Create: `supabase/migrations/20260618000000_bus_vehicles_live.sql`

- [ ] **Step 1 : Écrire la migration**

```sql
-- Positions GPS live des bus KTEL (instantané, upsert par véhicule).
create table if not exists public.bus_vehicles_live (
  vehicle_id   text primary key,
  lat          double precision not null,
  lng          double precision not null,
  bearing      real,
  route_ref    text,                 -- routeId brut renvoyé par l'API KTEL
  line_id      bigint references public.bus_lines(id),  -- résolu si mappable, sinon null
  speed        real,
  captured_at  timestamptz not null, -- horodatage source
  updated_at   timestamptz not null default now()
);

create index if not exists bus_vehicles_live_updated_idx on public.bus_vehicles_live (updated_at);

alter table public.bus_vehicles_live enable row level security;

-- Lecture publique (le front la consomme en anon), écriture réservée à la service key.
create policy "bus_vehicles_live read" on public.bus_vehicles_live
  for select using (true);
```

- [ ] **Step 2 : Appliquer en local/staging**

Run: `supabase db push` (ou appliquer le SQL sur le Postgres VPS selon le flux existant du repo — cf migrations `bus_routes_line_id.sql`).
Expected: table créée, pas d'erreur FK (`bus_lines` existe déjà).

- [ ] **Step 3 : Activer Realtime sur la table**

Dans Supabase (dashboard ou SQL) : ajouter `bus_vehicles_live` à la publication `supabase_realtime`.

```sql
alter publication supabase_realtime add table public.bus_vehicles_live;
```

- [ ] **Step 4 : Commit**

```bash
git add supabase/migrations/20260618000000_bus_vehicles_live.sql
git commit -m "feat(db): table bus_vehicles_live (positions GPS live, RLS read public + realtime)"
```

---

## Task 3 : `normalize.py` (pur, TDD sur la fixture réelle)

**Files:**
- Create: `scripts/scrapers/buses/gps/normalize.py`
- Test: `scripts/scrapers/buses/gps/tests/test_normalize.py`

- [ ] **Step 1 : Écrire le test (basé sur la fixture Task 1)**

```python
import json, os
from scripts.scrapers.buses.gps.normalize import normalize_transit

FIX = os.path.join(os.path.dirname(__file__), "fixtures", "transit-sample.json")

def test_normalize_maps_fields():
    raw = json.load(open(FIX, encoding="utf-8"))
    out = normalize_transit(raw)
    assert len(out) >= 1
    v = out[0]
    assert set(["vehicle_id", "lat", "lng", "bearing", "route_ref", "captured_at"]).issubset(v.keys())
    # coords plausibles pour la Crète
    assert 34.5 < v["lat"] < 36.0
    assert 23.0 < v["lng"] < 27.0

def test_normalize_skips_invalid_coords():
    out = normalize_transit([{"vehicleCode": "X", "lat": None, "lng": None}])
    assert out == []
```

- [ ] **Step 2 : Lancer le test → échec**

Run: `python -m pytest scripts/scrapers/buses/gps/tests/test_normalize.py -v`
Expected: FAIL (module introuvable).

- [ ] **Step 3 : Implémenter (ajuster les clés aux noms RÉELS de CAPTURE-NOTES.md)**

```python
"""Normalise la réponse /api/v1/transit en records pour bus_vehicles_live."""

def _f(d, *keys):
    for k in keys:
        if k in d and d[k] is not None:
            return d[k]
    return None

def normalize_transit(raw):
    items = raw.get("data", raw) if isinstance(raw, dict) else raw
    out = []
    for it in items or []:
        lat = _f(it, "lat", "latitude")
        lng = _f(it, "lng", "longitude", "lon")
        vid = _f(it, "vehicleCode", "deviceId", "vehicleId", "id")
        if lat is None or lng is None or vid is None:
            continue
        try:
            lat = float(lat); lng = float(lng)
        except (TypeError, ValueError):
            continue
        out.append({
            "vehicle_id": str(vid),
            "lat": lat,
            "lng": lng,
            "bearing": _f(it, "heading", "bearing", "direction"),
            "speed": _f(it, "speed"),
            "route_ref": (str(_f(it, "routeId", "route_id")) if _f(it, "routeId", "route_id") is not None else None),
            "captured_at": _f(it, "timestamp", "timeStamp", "lastUpdate"),
        })
    return out
```

- [ ] **Step 4 : Lancer le test → succès**

Run: `python -m pytest scripts/scrapers/buses/gps/tests/test_normalize.py -v`
Expected: PASS (2 tests).

- [ ] **Step 5 : Commit**

```bash
git add scripts/scrapers/buses/gps/normalize.py scripts/scrapers/buses/gps/tests/test_normalize.py
git commit -m "feat(gps): normalize_transit (champs reels -> records bus_vehicles_live)"
```

---

## Task 4 : `ktel_auth.py` (token Keycloak + cache + refresh)

**Files:**
- Create: `scripts/scrapers/buses/gps/ktel_auth.py`
- Test: `scripts/scrapers/buses/gps/tests/test_ktel_auth.py`

- [ ] **Step 1 : Écrire le test (HTTP injecté, pas de réseau réel)**

```python
from scripts.scrapers.buses.gps.ktel_auth import TokenManager

class FakePost:
    def __init__(self): self.calls = []
    def __call__(self, url, data=None, timeout=None):
        self.calls.append(data)
        class R:
            status_code = 200
            def json(self_inner):
                grant = data.get("grant_type")
                return {"access_token": f"AT-{grant}", "refresh_token": "RT", "expires_in": 60}
            def raise_for_status(self_inner): pass
        return R()

def test_first_call_uses_password_grant():
    fp = FakePost()
    tm = TokenManager(token_url="u", client_id="c", username="user", password="pw",
                      now=lambda: 1000.0, post=fp)
    assert tm.get_token() == "AT-password"
    assert fp.calls[0]["grant_type"] == "password"

def test_reuses_cached_token_before_expiry():
    fp = FakePost()
    t = [1000.0]
    tm = TokenManager(token_url="u", client_id="c", username="user", password="pw",
                      now=lambda: t[0], post=fp)
    tm.get_token()
    t[0] = 1030.0  # avant expiry (60s - marge)
    tm.get_token()
    assert len(fp.calls) == 1  # pas de second appel réseau

def test_refreshes_after_expiry():
    fp = FakePost()
    t = [1000.0]
    tm = TokenManager(token_url="u", client_id="c", username="user", password="pw",
                      now=lambda: t[0], post=fp)
    tm.get_token()
    t[0] = 1100.0  # après expiry
    tm.get_token()
    assert fp.calls[-1]["grant_type"] == "refresh_token"
```

- [ ] **Step 2 : Lancer → échec**

Run: `python -m pytest scripts/scrapers/buses/gps/tests/test_ktel_auth.py -v`
Expected: FAIL (module introuvable).

- [ ] **Step 3 : Implémenter**

```python
"""Gère le token Keycloak (password grant + refresh, avec cache mémoire)."""
import requests

class TokenManager:
    def __init__(self, token_url, client_id, username, password,
                 client_secret=None, now=None, post=None, leeway=15):
        self.token_url = token_url
        self.client_id = client_id
        self.client_secret = client_secret
        self.username = username
        self.password = password
        self.leeway = leeway
        self._now = now or __import__("time").time
        self._post = post or requests.post
        self._access = None
        self._refresh = None
        self._exp = 0.0

    def _request(self, data):
        if self.client_secret:
            data["client_secret"] = self.client_secret
        data["client_id"] = self.client_id
        r = self._post(self.token_url, data=data, timeout=20)
        r.raise_for_status()
        j = r.json()
        self._access = j["access_token"]
        self._refresh = j.get("refresh_token")
        self._exp = self._now() + float(j.get("expires_in", 60))
        return self._access

    def get_token(self):
        if self._access and self._now() < self._exp - self.leeway:
            return self._access
        if self._refresh:
            try:
                return self._request({"grant_type": "refresh_token", "refresh_token": self._refresh})
            except Exception:
                pass  # refresh expiré → retombe sur password
        return self._request({"grant_type": "password",
                              "username": self.username, "password": self.password})
```

- [ ] **Step 4 : Lancer → succès**

Run: `python -m pytest scripts/scrapers/buses/gps/tests/test_ktel_auth.py -v`
Expected: PASS (3 tests).

- [ ] **Step 5 : Commit**

```bash
git add scripts/scrapers/buses/gps/ktel_auth.py scripts/scrapers/buses/gps/tests/test_ktel_auth.py
git commit -m "feat(gps): TokenManager Keycloak (password grant + refresh + cache)"
```

---

## Task 5 : `transit_client.py` (appel API)

**Files:**
- Create: `scripts/scrapers/buses/gps/transit_client.py`
- Test: `scripts/scrapers/buses/gps/tests/test_transit_client.py`

- [ ] **Step 1 : Écrire le test (token + HTTP injectés)**

```python
from scripts.scrapers.buses.gps.transit_client import fetch_transit

class FakeTM:
    def get_token(self): return "AT"

def test_fetch_sends_bearer_and_returns_json():
    seen = {}
    def fake_get(url, headers=None, timeout=None):
        seen["url"] = url; seen["auth"] = headers["Authorization"]
        class R:
            status_code = 200
            def json(self): return [{"vehicleCode": "1", "lat": 35.1, "lng": 25.1}]
            def raise_for_status(self): pass
        return R()
    data = fetch_transit("https://backoffice.ktelherlas.gr/api/v1/transit", FakeTM(), get=fake_get)
    assert seen["auth"] == "Bearer AT"
    assert data[0]["vehicleCode"] == "1"
```

- [ ] **Step 2 : Lancer → échec**

Run: `python -m pytest scripts/scrapers/buses/gps/tests/test_transit_client.py -v`
Expected: FAIL.

- [ ] **Step 3 : Implémenter**

```python
"""Appelle GET /api/v1/transit avec le Bearer du TokenManager."""
import requests

def fetch_transit(url, token_manager, get=None, timeout=20):
    get = get or requests.get
    r = get(url, headers={
        "Authorization": f"Bearer {token_manager.get_token()}",
        "User-Agent": "crete.direct-bot/1.0",
        "Accept": "application/json",
    }, timeout=timeout)
    r.raise_for_status()
    return r.json()
```

- [ ] **Step 4 : Lancer → succès**

Run: `python -m pytest scripts/scrapers/buses/gps/tests/test_transit_client.py -v`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add scripts/scrapers/buses/gps/transit_client.py scripts/scrapers/buses/gps/tests/test_transit_client.py
git commit -m "feat(gps): transit_client (GET /api/v1/transit avec Bearer)"
```

---

## Task 6 : `store.py` (upsert Supabase) + résolution `line_id`

**Files:**
- Create: `scripts/scrapers/buses/gps/store.py`
- Test: `scripts/scrapers/buses/gps/tests/test_store.py`

- [ ] **Step 1 : Écrire le test (client Supabase mocké + map route→line)**

```python
from scripts.scrapers.buses.gps.store import build_rows

def test_build_rows_resolves_line_id_and_keeps_unmapped():
    recs = [
        {"vehicle_id": "1", "lat": 35.1, "lng": 25.1, "bearing": 90, "speed": 30,
         "route_ref": "42", "captured_at": "2026-06-18T10:00:00Z"},
        {"vehicle_id": "2", "lat": 35.2, "lng": 25.2, "bearing": None, "speed": None,
         "route_ref": "999", "captured_at": "2026-06-18T10:00:00Z"},
    ]
    route_to_line = {"42": 7}
    rows = build_rows(recs, route_to_line)
    assert rows[0]["line_id"] == 7
    assert rows[1]["line_id"] is None   # route inconnue → null, on garde le véhicule
    assert rows[0]["vehicle_id"] == "1"
```

- [ ] **Step 2 : Lancer → échec**

Run: `python -m pytest scripts/scrapers/buses/gps/tests/test_store.py -v`
Expected: FAIL.

- [ ] **Step 3 : Implémenter**

```python
"""Construit les lignes pour bus_vehicles_live et les upsert dans Supabase."""

def build_rows(records, route_to_line):
    rows = []
    for r in records:
        rows.append({
            "vehicle_id": r["vehicle_id"],
            "lat": r["lat"], "lng": r["lng"],
            "bearing": r.get("bearing"),
            "speed": r.get("speed"),
            "route_ref": r.get("route_ref"),
            "line_id": route_to_line.get(r.get("route_ref")) if r.get("route_ref") else None,
            "captured_at": r.get("captured_at"),
        })
    return rows

def upsert_rows(supabase, rows):
    if not rows:
        return 0
    supabase.table("bus_vehicles_live").upsert(rows, on_conflict="vehicle_id").execute()
    return len(rows)

def load_route_to_line(supabase):
    """Construit la map route_ref -> line_id depuis bus_routes (line_id déjà résolu par l'appariement)."""
    res = supabase.table("bus_routes").select("ktel_route_id,line_id").execute()
    out = {}
    for row in res.data or []:
        if row.get("line_id") is not None and row.get("ktel_route_id") is not None:
            out[str(row["ktel_route_id"])] = row["line_id"]
    return out
```

> NB : `load_route_to_line` suppose une colonne reliant le `routeId` KTEL aux `bus_routes`. Si le nom diffère (cf appariement existant `ktel_apparier.py`), ajuster la requête. Si aucune correspondance n'existe encore, `line_id` reste null (le front affiche quand même le bus GPS).

- [ ] **Step 4 : Lancer → succès**

Run: `python -m pytest scripts/scrapers/buses/gps/tests/test_store.py -v`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add scripts/scrapers/buses/gps/store.py scripts/scrapers/buses/gps/tests/test_store.py
git commit -m "feat(gps): store build_rows + upsert bus_vehicles_live + map route->line"
```

---

## Task 7 : `collector.py` (boucle + alerte) + purge périmés

**Files:**
- Create: `scripts/scrapers/buses/gps/collector.py`
- Test: `scripts/scrapers/buses/gps/tests/test_collector.py`

- [ ] **Step 1 : Écrire le test du tick (une itération, deps injectées)**

```python
from scripts.scrapers.buses.gps.collector import run_tick

def test_run_tick_normalizes_and_upserts():
    raw = [{"vehicleCode": "1", "lat": 35.1, "lng": 25.1, "heading": 90,
            "routeId": "42", "timestamp": "2026-06-18T10:00:00Z"}]
    upserted = {}
    def fake_fetch(): return raw
    def fake_upsert(rows): upserted["n"] = len(rows); upserted["row"] = rows[0]; return len(rows)
    n = run_tick(fetch=fake_fetch, route_to_line={"42": 7}, upsert=fake_upsert)
    assert n == 1
    assert upserted["row"]["line_id"] == 7
    assert upserted["row"]["vehicle_id"] == "1"
```

- [ ] **Step 2 : Lancer → échec**

Run: `python -m pytest scripts/scrapers/buses/gps/tests/test_collector.py -v`
Expected: FAIL.

- [ ] **Step 3 : Implémenter**

```python
"""Service continu : auth -> fetch -> normalize -> upsert. Alerte Telegram sur échec répété."""
import os, time
from .normalize import normalize_transit
from .store import build_rows

def run_tick(fetch, route_to_line, upsert):
    raw = fetch()
    recs = normalize_transit(raw)
    rows = build_rows(recs, route_to_line)
    return upsert(rows)

def main():  # pragma: no cover (boucle réseau, testée via run_tick)
    from supabase import create_client
    from .ktel_auth import TokenManager
    from .transit_client import fetch_transit
    from .store import upsert_rows, load_route_to_line

    interval = int(os.environ.get("KTEL_GPS_INTERVAL", "20"))
    api_url = os.environ["KTEL_TRANSIT_URL"]
    tm = TokenManager(
        token_url=os.environ["KTEL_TOKEN_URL"],
        client_id=os.environ["KTEL_CLIENT_ID"],
        client_secret=os.environ.get("KTEL_CLIENT_SECRET"),
        username=os.environ["KTEL_SERVICE_USER"],
        password=os.environ["KTEL_SERVICE_PASS"],
    )
    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
    route_to_line = load_route_to_line(sb)
    fails = 0
    while True:
        try:
            n = run_tick(
                fetch=lambda: fetch_transit(api_url, tm),
                route_to_line=route_to_line,
                upsert=lambda rows: upsert_rows(sb, rows),
            )
            fails = 0
            print(f"[gps] upserted {n} vehicles", flush=True)
        except Exception as e:
            fails += 1
            print(f"[gps] tick error ({fails}): {e}", flush=True)
            if fails in (3, 30):  # alerte à 3 puis 30 échecs consécutifs
                _alert_telegram(f"KTEL GPS collector: {fails} échecs consécutifs ({e})")
        time.sleep(interval)

def _alert_telegram(msg):  # pragma: no cover
    import requests
    tok = os.environ.get("TELEGRAM_BOT_TOKEN"); chat = os.environ.get("TELEGRAM_CHANNEL_ID")
    if not (tok and chat):
        return
    try:
        requests.post(f"https://api.telegram.org/bot{tok}/sendMessage",
                      data={"chat_id": chat, "text": msg}, timeout=10)
    except Exception:
        pass

if __name__ == "__main__":
    main()
```

> Purge des périmés : pas de DELETE — la fraîcheur est gérée côté front par le TTL (`updated_at`). Option future : un cron `delete from bus_vehicles_live where updated_at < now() - interval '10 minutes'`.

- [ ] **Step 4 : Lancer → succès**

Run: `python -m pytest scripts/scrapers/buses/gps/tests/test_collector.py -v`
Expected: PASS.

- [ ] **Step 5 : Smoke réel (manuel, après Task 1)**

Avec `.env` rempli (creds compte de service) : `python -m scripts.scrapers.buses.gps.collector` quelques secondes → vérifier des lignes dans `bus_vehicles_live` (Supabase). Ctrl-C.

- [ ] **Step 6 : Commit**

```bash
git add scripts/scrapers/buses/gps/collector.py scripts/scrapers/buses/gps/tests/test_collector.py
git commit -m "feat(gps): collector boucle continue + alerte Telegram + run_tick testable"
```

---

## Task 8 : Déploiement service systemd (VPS)

**Files:**
- Create: `ops/cretepulse-gps.service`
- Create: `ops/DEPLOY-gps.md`

- [ ] **Step 1 : Unit systemd**

```ini
[Unit]
Description=CretePulse KTEL GPS collector
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/cretepulse
EnvironmentFile=/opt/cretepulse/.env
ExecStart=/opt/cretepulse/venv/bin/python -m scripts.scrapers.buses.gps.collector
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

- [ ] **Step 2 : Doc de déploiement**

Écrire `ops/DEPLOY-gps.md` : variables `.env` requises (`KTEL_TOKEN_URL`, `KTEL_CLIENT_ID`, `KTEL_CLIENT_SECRET?`, `KTEL_SERVICE_USER`, `KTEL_SERVICE_PASS`, `KTEL_TRANSIT_URL`, `KTEL_GPS_INTERVAL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `TELEGRAM_*`), commandes `systemctl enable --now cretepulse-gps`, `journalctl -u cretepulse-gps -f`, healthcheck (lignes récentes dans `bus_vehicles_live`).

- [ ] **Step 3 : Commit**

```bash
git add ops/cretepulse-gps.service ops/DEPLOY-gps.md
git commit -m "ops(gps): unit systemd cretepulse-gps + doc deploiement"
```

> Déploiement réel sur le VPS = acte outward-facing, sur GO Kami (cf Task 12).

---

## Task 9 : `gps-source.ts` (front : lire les positions live)

**Files:**
- Create: `src/lib/bus-live/gps-source.ts`
- Test: `src/lib/bus-live/__tests__/gps-source.test.ts` (si infra de test front présente ; sinon `scripts/check-gps-source.mjs`)

- [ ] **Step 1 : Écrire le test (mapping ligne DB → objet front)**

```ts
import { rowToGpsBus } from "../gps-source";

test("rowToGpsBus maps db row to GpsBus", () => {
  const row = { vehicle_id: "1", lat: 35.1, lng: 25.1, bearing: 90,
                line_id: 7, route_ref: "42", captured_at: "2026-06-18T10:00:00Z",
                updated_at: "2026-06-18T10:00:05Z" };
  const b = rowToGpsBus(row);
  expect(b.id).toBe("1");
  expect(b.lat).toBe(35.1);
  expect(b.lineId).toBe(7);
  expect(b.kind).toBe("gps");
});
```

- [ ] **Step 2 : Lancer → échec**

Run: `npm test -- gps-source` (ou `node scripts/check-gps-source.mjs`)
Expected: FAIL.

- [ ] **Step 3 : Implémenter**

```ts
import { createClient } from "@supabase/supabase-js";

export type GpsBus = {
  id: string; lat: number; lng: number; bearing: number | null;
  lineId: number | null; routeRef: string | null; updatedAt: number; kind: "gps";
};

export function rowToGpsBus(row: any): GpsBus {
  return {
    id: String(row.vehicle_id),
    lat: row.lat, lng: row.lng,
    bearing: row.bearing ?? null,
    lineId: row.line_id ?? null,
    routeRef: row.route_ref ?? null,
    updatedAt: new Date(row.updated_at).getTime(),
    kind: "gps",
  };
}

/** Abonne aux positions live (Realtime) + premier chargement. onChange reçoit la liste complète. */
export function subscribeGps(onChange: (buses: GpsBus[]) => void) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const state = new Map<string, GpsBus>();
  const emit = () => onChange([...state.values()]);

  sb.from("bus_vehicles_live").select("*").then(({ data }) => {
    (data ?? []).forEach((r) => state.set(String(r.vehicle_id), rowToGpsBus(r)));
    emit();
  });

  const ch = sb.channel("bus_vehicles_live")
    .on("postgres_changes", { event: "*", schema: "public", table: "bus_vehicles_live" },
      (payload: any) => {
        if (payload.eventType === "DELETE") state.delete(String(payload.old.vehicle_id));
        else { const b = rowToGpsBus(payload.new); state.set(b.id, b); }
        emit();
      })
    .subscribe();

  return () => { sb.removeChannel(ch); };
}
```

- [ ] **Step 4 : Lancer → succès**

Run: `npm test -- gps-source`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add src/lib/bus-live/gps-source.ts src/lib/bus-live/__tests__/gps-source.test.ts
git commit -m "feat(live): gps-source (Supabase Realtime + mapping GpsBus)"
```

---

## Task 10 : `fuse.ts` (front : GPS primaire, estimatif repli)

**Files:**
- Create: `src/lib/bus-live/fuse.ts`
- Test: `src/lib/bus-live/__tests__/fuse.test.ts`

- [ ] **Step 1 : Écrire le test**

```ts
import { fuseBuses } from "../fuse";

const NOW = 1_000_000;
const estimated = [
  { id: "e-42", lineId: 7, lat: 35.0, lng: 25.0, bearing: 10, kind: "estimated" as const },
  { id: "e-99", lineId: 9, lat: 35.5, lng: 25.5, bearing: 20, kind: "estimated" as const },
];

test("fresh GPS on a line replaces the estimated bus of that line", () => {
  const gps = [{ id: "v1", lineId: 7, lat: 35.1, lng: 25.1, bearing: 90,
                 routeRef: "42", updatedAt: NOW - 5_000, kind: "gps" as const }];
  const out = fuseBuses(gps, estimated, NOW, 120_000);
  expect(out.find((b) => b.lineId === 7)?.kind).toBe("gps");
  expect(out.find((b) => b.lineId === 9)?.kind).toBe("estimated");
  expect(out.length).toBe(2);
});

test("stale GPS falls back to estimated", () => {
  const gps = [{ id: "v1", lineId: 7, lat: 35.1, lng: 25.1, bearing: 90,
                 routeRef: "42", updatedAt: NOW - 200_000, kind: "gps" as const }];
  const out = fuseBuses(gps, estimated, NOW, 120_000);
  expect(out.find((b) => b.lineId === 7)?.kind).toBe("estimated");
});
```

- [ ] **Step 2 : Lancer → échec**

Run: `npm test -- fuse`
Expected: FAIL.

- [ ] **Step 3 : Implémenter**

```ts
import type { GpsBus } from "./gps-source";

export type EstimatedBus = {
  id: string; lineId: number | null; lat: number; lng: number;
  bearing: number | null; kind: "estimated";
};
export type FusedBus = (GpsBus | EstimatedBus);

/** GPS frais (< ttlMs) prioritaire par ligne ; sinon on garde l'estimé. */
export function fuseBuses(gps: GpsBus[], estimated: EstimatedBus[], now: number, ttlMs: number): FusedBus[] {
  const freshGps = gps.filter((g) => g.lineId != null && now - g.updatedAt < ttlMs);
  const gpsLines = new Set(freshGps.map((g) => g.lineId));
  const keptEstimated = estimated.filter((e) => !gpsLines.has(e.lineId));
  return [...freshGps, ...keptEstimated];
}
```

- [ ] **Step 4 : Lancer → succès**

Run: `npm test -- fuse`
Expected: PASS (2 tests).

- [ ] **Step 5 : Commit**

```bash
git add src/lib/bus-live/fuse.ts src/lib/bus-live/__tests__/fuse.test.ts
git commit -m "feat(live): fuse GPS primaire + estimatif repli (TTL par ligne)"
```

---

## Task 11 : Intégration carte `/live` (badge par bus + compteur)

**Files:**
- Modify: `src/components/live/LiveMapClient.tsx`
- Modify: `src/components/live/busMarker.ts`

- [ ] **Step 1 : Marqueur — style GPS vs estimé**

Dans `busMarker.ts`, `createBusEl(bus)` ajoute une classe selon `bus.kind` :

```ts
// dans createBusEl(bus)
el.classList.add(bus.kind === "gps" ? "bus--gps" : "bus--estimated");
```

CSS associé (fichier de style du composant) : `.bus--gps` = halo « live » (ex. anneau vert pulsant) ; `.bus--estimated` = style actuel (atténué).

- [ ] **Step 2 : LiveMapClient — brancher la source fusionnée**

Au montage : `subscribeGps(setGps)` (cleanup au démontage). À chaque tick existant (~2 s) : calculer les estimés via `busesAt()` (inchangé), mapper en `EstimatedBus`, puis `const fused = fuseBuses(gps, estimated, Date.now(), 120_000)` et alimenter `reconcile()` avec `fused` au lieu des seuls estimés.

```tsx
const [gps, setGps] = useState<GpsBus[]>([]);
useEffect(() => subscribeGps(setGps), []);
// dans tick():
const estimated = busesAt(athensNow(), network).map(toEstimatedBus);
const fused = fuseBuses(gps, estimated, Date.now(), 120_000);
reconcile(fused);
```

- [ ] **Step 3 : Badge global**

Remplacer le compteur « N bus en circulation » par : `${nGps} en direct · ${nEst} estimés` (calcul depuis `fused` par `kind`). Conserver la pastille existante.

- [ ] **Step 4 : Vérif manuelle**

Run: `npm run dev` → ouvrir `/live`. Attendu : bus GPS (halo live) là où le collecteur tourne, bus estimés ailleurs, compteur correct, aucun doublon sur une même ligne. Sans collecteur actif : comportement identique à aujourd'hui (100 % estimé) — non-régression.

- [ ] **Step 5 : Commit**

```bash
git add src/components/live/LiveMapClient.tsx src/components/live/busMarker.ts
git commit -m "feat(live): carte fusion GPS/estime, badge par bus + compteur en direct/estime"
```

---

## Task 12 : Clôture autonomie + mise en prod

**Files:**
- Modify: crontab VPS (hors repo) / `ops/DEPLOY-gps.md`

- [ ] **Step 1 : Activer le cron d'appariement (jamais activé)**

Sur le VPS, ajouter les entrées prévues par SP2 (cf spec appariement) : `45 4 * * *` et `15 2 * * 0` → `run_apparier.py`. Vérifier que `bus_routes.line_id` se peuple → améliore la résolution `route_ref → line_id` du collecteur.

- [ ] **Step 2 : Déployer le collecteur**

Copier `scripts/scrapers/buses/gps/` sur `/opt/cretepulse`, remplir `.env`, `systemctl enable --now cretepulse-gps`, vérifier `journalctl -u cretepulse-gps -f` (upserts) + lignes fraîches dans `bus_vehicles_live`.

- [ ] **Step 3 : Merge front en prod**

Sur GO Kami : merger `feat/bus-live-gps` → `master` → `master:main` (cf flux de déploiement cretepulse), vérifier `/live` en prod (badge en direct visible). Variables `NEXT_PUBLIC_SUPABASE_*` présentes sur Vercel.

- [ ] **Step 4 : Healthcheck + supervision**

Vérifier l'alerte Telegram (couper temporairement le réseau du service → 3 échecs → message reçu). Documenter dans `ops/DEPLOY-gps.md`.

- [ ] **Step 5 : Commit final + MAJ mémoire**

```bash
git add ops/DEPLOY-gps.md
git commit -m "ops(gps): cron apparier active + checklist mise en prod GPS live"
```

---

## Notes de robustesse / risques (rappel spike)
- Endpoint/auth non documentés → fragiles ; le service alerte sur échec, le front dégrade en estimatif. Re-vérifier après chaque MAJ majeure de l'app KTEL.
- Compte de service dans LEUR Keycloak = zone grise CGU (décision Kami assumée, option A). Garder la voie B (accès officiel) en plan de repli.
- `route_ref → line_id` : si l'appariement ne couvre pas une ligne, le bus GPS s'affiche sans `lineId` (marqueur générique). Acceptable v1.
