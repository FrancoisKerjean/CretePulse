# Flux touristiques couche 1 : capteur d'intentions crete.direct — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Historiser dans Postgres les intentions de déplacement des ~1100 visiteurs/j de crete.direct (paires origine-destination bus demandées, y compris NON desservies, recherches POI, leads voiture) en exploitant le pipeline Plausible existant, sans nouvelle collecte côté client.

**Architecture:** Les events Plausible couvrent déjà l'essentiel (`bus_search` avec from/to/date/**results**, `ticket_intent`, `search_query`, `Car Lead`, `Taxi Call`, `Near Me`, `Activity Lead`) et s'accumulent dans le ClickHouse self-hosted (`/opt/plausible`, table `events_v2`) depuis le déploiement de chaque event. On ajoute UN event manquant (`explore_search`) côté site, puis un script VPS quotidien extrait les agrégats de ClickHouse vers une table Postgres `flux_intent_daily` (jointable avec les tables `flux_*` des couches 2-3). Zéro cookie, zéro PII : agrégats par jour uniquement.

**Tech Stack:** Next.js 16 (1 event Plausible ajouté), Python 3 + `docker exec clickhouse-client` (extraction), Postgres 17 local.

**Contexte vérifié (exploration 10/07/2026, ne pas re-déduire) :**
- `src/components/explore/ExploreView.tsx` : state `query` ligne ~274, input lignes ~1192-1198, `runRemoteSearch()` lignes ~1018-1036 (Nominatim borné Crète), event Plausible existant `explore_activities_cta` ligne ~1580 (= pattern d'appel à imiter).
- `JourneyPlanner.tsx` émet déjà `bus_search` (props `from`, `to`, `date`, `results`) ligne ~478, debounce 400 ms. `results=0` = paire demandée non desservie.
- Plausible CE v3.2.1 sur kairos-vps, `/opt/plausible/`, ClickHouse `clickhouse/clickhouse-server:24.12-alpine`, db analytics `plausible_events_db`.
- Pattern migrations : fichier `supabase/migrations/*.sql` appliqué via `docker exec ... psql -U postgres -d cretepulse` + `notify pgrst, 'reload schema'` (GRANTs : copier `20260710_activity_catalog.sql`).
- Déploiement site : `main` = Production, `master` = Preview → prod = `git push origin master:main`.

---

## Fichiers

- Modify: `src/components/explore/ExploreView.tsx` (~10 lignes, event `explore_search`)
- Create: `supabase/migrations/20260710_flux_intent.sql`
- Create: `vps/flux/intent_extract.py`
- Modify (VPS): crontab root

---

### Task 1: Event Plausible `explore_search`

**Files:**
- Modify: `src/components/explore/ExploreView.tsx`

- [ ] **Step 1: Repérer le pattern d'appel Plausible existant**

Ouvrir `ExploreView.tsx` ligne ~1580 (`explore_activities_cta`) et copier la forme exacte de l'appel (helper importé ou `window.plausible` direct). Utiliser strictement la même forme.

- [ ] **Step 2: Émettre l'event dans `runRemoteSearch()`**

Dans `runRemoteSearch()` (lignes ~1018-1036), après la fusion des résultats locaux+Nominatim dans `searchResults`, ajouter (adapter le nom de variable des résultats fusionnés) :

```typescript
// Signal d'intention : recherche POI sur la carte (agrégé côté Plausible, zéro PII)
const q = query.trim().toLowerCase().slice(0, 80);
if (q.length >= 2) {
  window.plausible?.("explore_search", {
    props: { query: q, results: merged.length },
  });
}
```

(Si le fichier utilise un typage strict de `window`, reprendre le cast exact utilisé ligne ~1580.)

- [ ] **Step 3: Vérifier tsc + build**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 4: Vérification manuelle en dev**

Run: `npm run dev`, ouvrir `http://localhost:3000/en/explore`, taper « matala » + Entrée, onglet Network : requête POST vers `analytics.crete.direct/api/event` avec `n: "explore_search"` et props `{query: "matala", results: N}`.
Expected: requête émise une seule fois par recherche.

- [ ] **Step 5: Commit**

```bash
git add src/components/explore/ExploreView.tsx
git commit -m "feat(flux): event explore_search (signal d'intention recherche POI)"
```

---

### Task 2: Migration table flux_intent_daily

**Files:**
- Create: `supabase/migrations/20260710_flux_intent.sql`

- [ ] **Step 1: Écrire la migration** (GRANTs : copier le bloc de `20260710_activity_catalog.sql`)

```sql
-- Agrégats quotidiens des signaux d'intention (extraction ClickHouse Plausible)
create table if not exists flux_intent_daily (
  id bigint generated always as identity primary key,
  day date not null,
  event_name text not null,       -- 'bus_search' | 'bus_search_zero' | 'search_query' | ...
  prop_key text not null,         -- 'od' | 'query' | 'zone' | 'section' | 'total'
  prop_value text not null,       -- ex 'heraklion→matala'
  events_count int not null,
  unique (day, event_name, prop_key, prop_value)
);
create index if not exists idx_flux_intent_day on flux_intent_daily (day, event_name);
-- GRANTs service_role (pattern activity_catalog) puis : notify pgrst, 'reload schema';
```

- [ ] **Step 2: Appliquer sur le VPS**

```bash
ssh root@89.167.115.63 "docker exec -i <conteneur postgres cretepulse> psql -U postgres -d cretepulse" < supabase/migrations/20260710_flux_intent.sql
```

Expected: `CREATE TABLE`, `CREATE INDEX`, pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260710_flux_intent.sql
git commit -m "feat(flux): table flux_intent_daily (agregats intentions Plausible)"
```

---

### Task 3: Script d'extraction ClickHouse → Postgres

**Files:**
- Create: `vps/flux/intent_extract.py`

- [ ] **Step 1: Inspecter le schéma ClickHouse réel** (étape d'exploration obligatoire — le nom des colonnes de props varie selon la version CE)

```bash
ssh root@89.167.115.63 '
docker ps --format "{{.Names}}" | grep -i clickhouse
CH=$(docker ps --format "{{.Names}}" | grep -im1 clickhouse)
docker exec $CH clickhouse-client -q "DESCRIBE plausible_events_db.events_v2" | grep -Ei "meta|name|timestamp|site"
docker exec $CH clickhouse-client -q "SELECT site_id, count() FROM plausible_events_db.events_v2 GROUP BY site_id"
docker exec $CH clickhouse-client -q "SELECT name, count() FROM plausible_events_db.events_v2 WHERE name NOT IN ('\''pageview'\'') GROUP BY name ORDER BY 2 DESC LIMIT 20"
'
```

Noter : (a) le nom du conteneur ClickHouse, (b) le `site_id` de crete.direct (un seul site), (c) les colonnes props (attendu : `meta.key Array(String)` / `meta.value Array(String)` — sinon adapter `PROP()` ci-dessous), (d) la liste réelle des events accumulés et leur volumétrie (= depuis quand on a de l'historique).

- [ ] **Step 2: Écrire le script** (remplacer `CH_CONTAINER` et `SITE_ID` par les valeurs du Step 1)

```python
#!/usr/bin/env python3
"""Extrait les agregats quotidiens d'intentions depuis ClickHouse (Plausible) vers Postgres.

Cron : 50 4 * * * (traite J-1). Backfill : python3 intent_extract.py --backfill 90
"""
import subprocess
import sys
from datetime import date, timedelta

from db import connect

CH_CONTAINER = "plausible-clickhouse-1"   # cf Step 1
SITE_ID = 1                                # cf Step 1

# event -> (prop_key stocke, expression valeur, filtre supplementaire)
PROP = "arrayElement(meta.value, indexOf(meta.key, '{k}'))"
SPECS = [
    ("bus_search",      "od",      f"concat({PROP.format(k='from')}, '→', {PROP.format(k='to')})",
     f"{PROP.format(k='results')} != '0'"),
    ("bus_search_zero", "od",      f"concat({PROP.format(k='from')}, '→', {PROP.format(k='to')})",
     f"{PROP.format(k='results')} = '0'"),
    ("ticket_intent",   "od",      f"concat({PROP.format(k='from')}, '→', {PROP.format(k='to')})", None),
    ("search_query",    "query",   PROP.format(k="query"), None),
    ("explore_search",  "query",   PROP.format(k="query"), None),
    ("Car Lead",        "zone",    PROP.format(k="zone"), None),
    ("Taxi Call",       "zone",    PROP.format(k="zone"), None),
    ("Near Me",         "section", PROP.format(k="section"), None),
    ("Activity Lead",   "total",   "'all'", None),
]

UPSERT_SQL = """
insert into flux_intent_daily (day, event_name, prop_key, prop_value, events_count)
values (%s, %s, %s, %s, %s)
on conflict (day, event_name, prop_key, prop_value)
do update set events_count = excluded.events_count;
"""


def ch(query):
    out = subprocess.run(
        ["docker", "exec", CH_CONTAINER, "clickhouse-client",
         "--database", "plausible_events_db", "-q", query],
        capture_output=True, text=True, check=True)
    return [line.split("\t") for line in out.stdout.strip().split("\n") if line]


def extract_day(day):
    rows = []
    for stored_name, prop_key, value_expr, extra in SPECS:
        event = stored_name.replace("_zero", "")  # bus_search_zero lit l'event bus_search
        where = (f"name = '{event}' AND toDate(timestamp) = '{day.isoformat()}'"
                 f" AND site_id = {SITE_ID}")
        if extra:
            where += f" AND {extra}"
        q = (f"SELECT {value_expr} AS v, count() AS c FROM events_v2"
             f" WHERE {where} GROUP BY v HAVING v != '' AND v != '→' FORMAT TSV")
        for v, c in ch(q):
            rows.append((day, stored_name, prop_key, v[:120], int(c)))
    return rows


def run(days):
    conn = connect()
    conn.autocommit = True
    total = 0
    with conn, conn.cursor() as cur:
        for day in days:
            rows = extract_day(day)
            for row in rows:
                cur.execute(UPSERT_SQL, row)
            total += len(rows)
    conn.close()
    print(f"intent: {total} agregats sur {len(days)} jour(s)")


if __name__ == "__main__":
    try:
        if "--backfill" in sys.argv:
            n = int(sys.argv[sys.argv.index("--backfill") + 1])
            run([date.today() - timedelta(days=i) for i in range(1, n + 1)])
        else:
            run([date.today() - timedelta(days=1)])
    except Exception as exc:
        print(f"intent_extract ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
```

- [ ] **Step 3: Déployer + backfill historique**

```bash
scp vps/flux/intent_extract.py root@89.167.115.63:/opt/cretepulse/flux/
ssh root@89.167.115.63 "cd /opt/cretepulse/flux && python3 intent_extract.py --backfill 90"
```

Expected: `intent: N agregats sur 90 jour(s)` — N proportionnel à l'ancienneté des events (`bus_search` existe depuis des semaines : l'historique OD est récupéré d'un coup).

- [ ] **Step 4: Vérifier la donnée qui compte (paires non desservies)**

```bash
ssh root@89.167.115.63 "docker exec -i <conteneur postgres> psql -U postgres -d cretepulse -c \"
select prop_value, sum(events_count) as demandes
from flux_intent_daily where event_name = 'bus_search_zero'
group by 1 order by 2 desc limit 15;\""
```

Expected: un top des paires origine-destination demandées et NON desservies = la donnée inédite pour KTEL/Région. Noter les 3 premières dans la fiche mémoire (Task 4).

- [ ] **Step 5: Cron quotidien**

Ajouter au crontab VPS (bloc flux existant du plan couches 2-3) :

```cron
50 4 * * *     cd /opt/cretepulse/flux && python3 intent_extract.py >> /opt/cretepulse/flux/flux.log 2>&1
```

- [ ] **Step 6: Commit**

```bash
git add vps/flux/intent_extract.py
git commit -m "feat(flux): extraction quotidienne intentions Plausible (ClickHouse) vers flux_intent_daily"
```

---

### Task 4: Déploiement prod + mémoire

- [ ] **Step 1: Pousser le site en prod** (l'event explore_search ne collecte qu'après déploiement)

```bash
git push origin master          # preview
git push origin master:main     # production (main = prod chez CretePulse)
```

- [ ] **Step 2: Vérifier en prod** (après build Vercel ~15 min)

Ouvrir `https://crete.direct/en/explore`, faire une recherche, vérifier dans le dashboard `https://analytics.crete.direct` (site crete.direct, section events) que `explore_search` apparaît.

- [ ] **Step 3: Mémoire**

Compléter la fiche `project_crete_direct_flux_data.md` (créée par le plan couches 2-3, sinon la créer) : capteur intentions LIVE, table `flux_intent_daily`, backfill fait ([FACT] avec le compte), top 3 paires non desservies. Ligne session_log + index MEMORY.md.
