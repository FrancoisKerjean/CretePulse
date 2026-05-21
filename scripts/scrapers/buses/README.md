# Bus scraper (cretepulse)

Alimente les tables `bus_operators` / `bus_destinations` / `bus_routes` de
`cretepulse-db` (Postgres self-hosted + PostgREST sur le VPS). Lu par
`/buses` sur crete.direct.

## Stratégie (décision Kami 21/05, Option 1)

- **herlas** (Heraklion-Lasithi, EST, zone Kairos) : site Next.js. Crawl 2 étapes :
  index `/en/timetables` → liens détail `?ds=fromID,toID` → pages détail
  (`timetable_box` : titre « FROM - TO », jours, horaires). Vraies données fraîches.
- **ektel** (Chania-Rethymno, OUEST) : site Joomla, horaires en PDF. Routes ouest
  curées (`CURATED_EKTEL`) + date `valid from` rafraîchie depuis l'index.
- **Filtre Crète-only** : les liaisons longue distance vers le continent
  (Thessaloniki, Patra, Athènes…) listées par KTEL sont exclues (`is_crete_route`).

## Sélecteurs fragiles

Les classes CSS-module herlas (`timetable_time__iH0GL`…) changent à chaque build
du site KTEL. Les parsers matchent par **préfixe** (`timetable_time`, `timetable_box`,
`timetable_title`, `timetable_daysWrapper`) pour survivre aux redéploiements.

## Déploiement VPS

Code dans `/opt/cretepulse/buses/` (`parsers.py`, `store.py`, `buses.py`).
Dépendances dans le venv cretepulse :

```bash
/opt/cretepulse/venv/bin/pip install -r /opt/cretepulse/buses/requirements.txt
```

## Run manuel

```bash
cd /opt/cretepulse && venv/bin/python buses/buses.py
```
(le CWD `/opt/cretepulse` permet à `load_dotenv()` de lire `.env` :
`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, tokens Telegram.)

## Cron hebdomadaire

Dimanche 04:00 Athens (= 01:00 UTC l'été). Les horaires KTEL bougent par saison,
pas par jour ; un fetch hebdo par opérateur suffit et ne martèle pas les sites.

```cron
0 1 * * 0 cd /opt/cretepulse && venv/bin/python buses/buses.py >> /var/log/cretepulse-buses.log 2>&1
```

## Garde-fou

`replace_operator_routes` ne remplace les routes d'un opérateur que si le scrape
renvoie ≥ `MIN_ROUTES` (3) lignes. Sinon la dernière donnée valide est conservée
et une alerte Telegram (`Bot.PLUME`) est envoyée. Jamais de page vide ni de
périmé silencieux.

## Tests

```bash
cd scripts/scrapers/buses && .venv/Scripts/python -m pytest -q   # Windows local
# ou sur le VPS : /opt/cretepulse/venv/bin/python -m pytest -q
```
Parsers testés sur fixtures HTML réelles committées (`fixtures/`).
