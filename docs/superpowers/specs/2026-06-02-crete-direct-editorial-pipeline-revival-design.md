# crete.direct — Revival du pipeline éditorial autonome (design)

**Date** : 2026-06-02
**Owner** : Kami (validation) / Claude (implémentation)
**Status** : DRAFT — en attente revue Kami avant writing-plans
**Topic** : Réparer et industrialiser le pipeline éditorial autonome long-form de crete.direct avec source d'inspiration auto-alimentée à impact SEO maximum.

---

## 1. Contexte et problème

### 1.1 Constat
Audit 02/06/2026 : trou de 7 jours sans article éditorial long-form du 26/05 au 02/06. Dernier vrai éditorial = `id=73` ("airbnb-property-types-crete-breakdown") le 25/05 07:00 UTC. Les pipelines daily-weather + daily-news + news scrapées (palantir `writer-v2.py`) continuent normalement et masquent visuellement le trou sur la home.

### 1.2 Pourquoi les pipelines éditoriaux sont en panne
**Pipeline `writer-l1.py` (L1 putaclick, 3x/jour 06/12/18 UTC)** :
- Log `/var/log/cretepulse-content/writer-l1.log` montre `"No pending items in guides_queue — nothing to do"` répété 3x/jour depuis le 23/05.
- Table `guides_queue` contient 24 lignes TOTAL toutes datées 01/05 20:21:44Z, status `processed` ou `error`, jamais re-remplie.
- Cause racine : `discover.py` (cron `cretepulse` dimanche 04:00 UTC, supposé remplir la queue chaque semaine) échoue silencieusement sur Reddit. Les 3 sources Reddit (r/Crete, r/greece, r/travel) renvoient HTTP 403 systématiquement parce que le User-Agent par défaut de `requests` (`python-requests/2.x`) est bloqué par Reddit depuis 2023. Seuls les 5 flux RSS classiques marchent, mais ils ressortent des URLs déjà processées, qui sont déduplifées. Conclusion : à chaque dimanche, 0 nouveau sujet ajouté. La queue s'est vidée le ~23/05 et n'a jamais été re-remplie.

**Pipeline `airbnb-articles.py` (timer hebdo `cretepulse-airbnb-articles.timer` lundi 07:00 UTC)** :
- Log 01/06 07:04 : `"No eligible angle right now (all within cooldown). Exiting cleanly."`
- Le script a 5 angles codés en dur (`neighbourhoods-pricing`, `professional-vs-amateur`, `crete-vs-south-aegean`, `best-yield-neighbourhoods`, `property-types-breakdown`) avec cooldown `min_days_between` géré via ledger Postgres `airbnb_articles_ledger`. Les 5 angles ont tous été consommés entre le 02/05 et le 25/05. Tous sont encore dans leur fenêtre cooldown au 01/06.

### 1.3 Pourquoi rien n'a alerté
Les deux scripts sont défensifs (`exit 0` quand rien à faire). Pas de mail d'alerte, pas de notification Telegram, pas de log d'erreur. Détection uniquement par observation visuelle de la prod, ce qui s'est passé le 02/06 quand Kami a constaté l'absence d'articles éditoriaux.

---

## 2. Objectifs et non-objectifs

### 2.1 Objectifs
1. **Auto-alimentation des sujets éditoriaux** : remplacer le scoring Reddit cassé + seeds hardcodés par une source d'inspiration durable et data-driven.
2. **Impact SEO maximum** : prioriser les sujets pour lesquels crete.direct a déjà du signal Google (striking distance) et les questions réelles posées par les utilisateurs (PAA + autocomplete).
3. **Pyramide de formats** : pillar (2/sem) + mid (5/sem) + short (7/sem), soit 14 articles long-form par semaine, multi-cibles, multi-modèles.
4. **Discipline AEO native** : chaque article doit être citable instantanément par ChatGPT/Perplexity/Gemini (question H1 + réponse chiffrée dans 100 premiers mots + tableau + FAQPage JSON-LD).
5. **Zéro régression** : `news.py` palantir (writer-v2), `daily_weather.py`, `daily_news.py`, `translator-batch.py`, indexnow restent fonctionnels et inchangés.

### 2.2 Non-objectifs
- **Pas d'API key Anthropic** : le pipeline continue d'utiliser `claude-capped.sh` (OAuth, cap fair-use 250 invocations/24h).
- **Pas de refonte UI** : aucun changement sur le frontend Next.js crete.direct.
- **Pas de migration DB lourde** : ajout de colonnes uniquement, pas de refonte de schéma.
- **Pas de nouveau service externe** : on utilise GSC API (gratuit), Google PAA (scraping fair-use), Reddit RSS public. Pas de SEMrush, Ahrefs, etc.
- **Pas de cible propriétaires/investisseurs** : décision Q1 brainstorming, on optimise pour le volume touristes. Le funnel discret vers Kairos `/property-management` reste en place mais n'est pas la cible éditoriale.
- **Refresh annuel 2026→2027** : reporté à janvier 2027 (cf décision Phase 2 du 22/05).

---

## 3. Architecture globale

```
   ┌─────────────────┐
   │ discover.py v2  │  Cron dimanche 03:00 UTC (GSC pull + Reddit RSS + RSS feeds)
   │                 │  Cron lundi 04:00 UTC (PAA expansion sur articles 7 derniers jours)
   │  • GSC API      │
   │  • PAA scraping │──┐
   │  • Reddit RSS   │  │ Scoring qualité (Haiku) → threshold 6+
   │  • RSS feeds    │  │ Insert into guides_queue (format, priority, source_meta)
   └─────────────────┘  │
                        ▼
              ┌──────────────────────┐
              │  guides_queue        │ Schema étendu : +format, +priority, +source, +source_meta
              │  (Postgres)          │ Index partiel sur (status='pending', format, priority DESC)
              └──────────────────────┘
                        │
                        ▼
   ┌─────────────────────────────────────────────┐
   │ writer.py --format=<pillar|mid|short>       │ 3 crons distincts (voir §6)
   │                                              │
   │  • pop top priority matching format          │
   │  • sélectionne modèle Claude par format     │
   │  • charge prompt template par format         │
   │  • anti-hallu DB check (commun)             │
   │  • hero image Pexels (commun)               │
   │  • insert guide draft EN+FR                  │
   │  • trigger translator-batch (commun)        │
   │  • ping IndexNow (commun)                   │
   └─────────────────────────────────────────────┘

   ┌────────────────────────────┐
   │ airbnb-articles.py         │ Timer hebdo lundi 07:00 UTC (inchangé sauf 5 nouveaux angles + cooldown 30→60j)
   │ + 5 nouveaux angles        │
   └────────────────────────────┘
```

`airbnb-articles.py` reste un script séparé (pas dans la pyramide writer.py) parce que c'est un pipeline data-exclusive avec SQL complexe et logique de cooldown propre. Il alimente le format `pillar` de facto (articles 2000-3000 mots data-driven) à raison de 1/sem.

---

## 4. Composants détaillés

### 4.1 `discover.py` v2 (refonte de `discover.py`)

**Triggers** :
- Cron primaire `0 3 * * 0` (dimanche 03:00 UTC) : pull GSC + RSS + Reddit RSS → remplit la queue avec format `pillar`/`mid`
- Cron secondaire `0 4 * * 1` (lundi 04:00 UTC) : PAA expansion sur articles des 7 derniers jours → remplit avec format `short`

**Source 1 — GSC striking distance (priorité haute)** :
- API : `searchconsole.googleapis.com/v1/sites/sc-domain:crete.direct/searchAnalytics/query`
- Auth : service account JSON dans `/opt/cretepulse-content/gsc-service-account.json` (chmod 600)
- Paramètres requête : last 28 days, dimensions `["query"]`, rowLimit 500
- Filtres post-réception :
  - impressions ≥ 20
  - position entre 5.0 et 30.0
  - query absente de `guides.slug` (regex fuzzy match) et `guides_queue.title`
- Scoring : `score = impressions × (1 / position) × ctr_potential` où `ctr_potential = max(0, 0.30 - current_ctr)`
- Mapping format :
  - position 5-15 + impressions ≥ 50 → `pillar` priority=90
  - position 8-30 + impressions ≥ 20 → `mid` priority=70
- Top 30 candidats insérés dans `guides_queue`, source=`"gsc"`, source_meta = `{impressions, position, ctr, score}` en JSONB

**Source 2 — PAA expansion (cron lundi)** :
- Pour chaque article publié depuis 7 jours (format `pillar` ou `mid`), extraire la `target_query` stockée dans `guides.source_meta`
- Pour chaque query, fetch `https://www.google.com/search?q={query}` avec User-Agent réaliste (`Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 ...`)
- Parser HTML pour extraire :
  - PAA boxes (selector `div[jsname="Cpkphb"]` ou équivalent stable)
  - Autocomplete via `https://suggestqueries.google.com/complete/search?client=firefox&q={query}` (endpoint JSON public, pas de scraping HTML)
- Délai entre requêtes : 5 secondes (random jitter ±2s) pour respecter fair-use
- Max 20 queries fetched par run → max 20 articles déjà publiés analysés
- Sortie : 4-10 nouvelles questions par article publié → insert format=`short`, priority=50, source=`"paa"`

**Source 3 — Reddit RSS réparé (fallback)** :
- Endpoints publics RSS (pas d'OAuth, pas d'API key) :
  - `https://www.reddit.com/r/Crete/.rss`
  - `https://www.reddit.com/r/greece/search.rss?q=crete&sort=hot&restrict_sr=on`
  - `https://www.reddit.com/r/travel/search.rss?q=crete&sort=hot&restrict_sr=on`
- User-Agent réaliste : `CreteDirect/1.0 (https://crete.direct; contact: admin@crete.direct)` (Reddit a relâché les 403 sur les flux RSS, c'est l'API JSON et endpoints HTML qui exigent OAuth)
- Parsing via `feedparser`
- Sortie : 5-10 topics/sem max → insert format=`mid`, priority=60, source=`"reddit"`

**Source 4 — RSS feeds éditoriaux (existant maintenu)** :
- 5 flux RSS existants (cretetravel, thetinybook, greekreporter, ekathimerini, explorecrete)
- Sortie : format=`mid`, priority=55, source=`"rss"`

**Scoring qualité commun (Haiku)** :
Tous les candidats sont scorés en batch via Haiku sur 3 axes (intent commercial, originalité vs existant, AEO-friendliness), threshold 6/10 minimum pour insert. Le scoring actuel de `discover.py` (ligne 56+) est conservé, juste enrichi des nouveaux signaux GSC/PAA.

**Output** : insert atomique transactionnel dans `guides_queue` avec `ON CONFLICT (slug) DO NOTHING`.

### 4.2 `writer.py` (refactor de `writer-l1.py`)

**Argparse** :
- `--format` : `pillar` | `mid` | `short` (obligatoire en cron, optionnel en CLI manuel)
- `--slug` : override slug (existant, garde la sémantique actuelle)
- `--dry-run` : log + prompt + dataset sans appel Claude ni insert (nouveau)

**Mapping format → params** :
| Format | Modèle | Mots cible (min/max) | Prompt template | Cooldown intra-format |
|--------|--------|---------------------|-----------------|----------------------|
| `pillar` | `opus` | 2000 / 3000 | `prompts/writer-pillar.md` | aucun (pop top priority) |
| `mid` | `sonnet` | 1000 / 1500 | `prompts/writer-mid.md` | aucun |
| `short` | `haiku` | 500 / 800 | `prompts/writer-short.md` | aucun |

**Pop logic** :
```sql
SELECT * FROM guides_queue
WHERE status = 'pending' AND format = $1
ORDER BY priority DESC, created_at ASC
LIMIT 1 FOR UPDATE SKIP LOCKED;
```

**Anti-hallu** : code existant (vérification places vs DB + GENERIC_WHITELIST) inchangé, appliqué après génération.

**Length check post-génération** :
- Compter mots (whitespace split) sur `content_en`
- Si `wc < 0.80 * target_min` : reject + retry max 2x (régénération avec prompt enrichi `"target word count: at least N words"`)
- Si toujours < seuil : log failure, marquer queue row en `status='error'`, exit avec code != 0

**Hero image** : code existant Pexels API inchangé.

**Trigger translator-batch** : `subprocess.run(["./bin/translator-batch.py", "--guide-id", str(guide_id)])` (signature actuelle).

**IndexNow ping** : appel `indexnow.py` après insertion + 22 traductions (logique existante).

### 4.3 `airbnb-articles.py` (élargissement minimal)

**5 nouveaux angles ajoutés à la constante `ANGLES`** :

1. **`seasonality-2024-vs-2025`**
   - Brief : "Compare Crete Airbnb occupation patterns between 2024 and 2025 snapshots. Where did demand grow fastest? Which dèmos lost traction? Show month-by-month seasonal curves."
   - SQL : nécessite snapshot 2024 en table `airbnb_listings_2024` (à confirmer présence en base ; sinon fallback comparaison à South Aegean comme proxy)

2. **`ama-license-coverage-by-region`**
   - Brief : "What share of Airbnb listings in each Crete dèmos has an AMA short-rental license? Where is regulatory grey zone strongest? What does it mean for travelers and buyers?"
   - SQL : GROUP BY neighbourhood, AVG(ama_license_pct) FROM airbnb_listings

3. **`multi-host-concentration`**
   - Brief : "Top 10 mega-hosts vs solo hosts in Crete: portfolio size, revenue concentration, geographic spread. Is Crete's Airbnb market still amateur-driven or pro-captured?"
   - SQL : window function sur listings per host_id

4. **`rating-revenue-correlation`**
   - Brief : "Do higher-rated Airbnb listings in Crete actually earn more? Scatter rating × revenue, where are the outliers (high revenue low rating = price-driven, high rating low revenue = under-monetized)?"
   - SQL : SELECT rating, annual_revenue, neighbourhood FROM airbnb_listings WHERE rating IS NOT NULL

5. **`weekend-vs-weekday-pricing`**
   - Brief : "Hidden weekend premium in Crete: which dèmos charge most for Fri-Sun stays vs Mon-Thu? Where is the pricing gap biggest?"
   - SQL : nécessite données calendrier nuitées (à confirmer présence ; sinon angle reporté)

**Cooldown ramené 30j → 60j** sur tous les angles (constante `MIN_DAYS_BETWEEN` par défaut, override par angle si besoin) pour éviter ré-épuisement rapide avec 10 angles total.

---

## 5. Schéma DB

**Migration `guides_queue`** (one-shot SQL, idempotente) :
```sql
ALTER TABLE guides_queue
  ADD COLUMN IF NOT EXISTS format TEXT NOT NULL DEFAULT 'mid' CHECK (format IN ('pillar','mid','short')),
  ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'seed',
  ADD COLUMN IF NOT EXISTS source_meta JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_guides_queue_pending
  ON guides_queue (status, format, priority DESC, created_at ASC)
  WHERE status = 'pending';
```

**Migration `guides`** (ajout pour traçabilité GSC feedback loop) :
```sql
ALTER TABLE guides
  ADD COLUMN IF NOT EXISTS source_meta JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS target_query TEXT,
  ADD COLUMN IF NOT EXISTS format_tier TEXT DEFAULT NULL CHECK (format_tier IN (NULL, 'pillar','mid','short'));
```

`target_query` stocke la query GSC qui a déclenché la création, pour permettre le PAA expansion ultérieur.

---

## 6. Scheduling

**Crontab user `cretepulse`** (remplace les 3 lignes `run-batch.sh` actuelles) :
```cron
# Discover GSC + RSS + Reddit RSS (weekly Sunday 03:00 UTC)
0 3 * * 0 cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && python3 discover.py --mode=gsc-rss >> /var/log/cretepulse-content/discover.log 2>&1

# Discover PAA expansion (weekly Monday 04:00 UTC, après publication week-end)
0 4 * * 1 cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && python3 discover.py --mode=paa >> /var/log/cretepulse-content/discover.log 2>&1

# Writer pillar (2x/sem mercredi + vendredi 06:00 UTC)
0 6 * * 3,5 cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && python3 writer.py --format=pillar >> /var/log/cretepulse-content/writer.log 2>&1

# Writer mid (5x/sem lun-ven 12:00 UTC)
0 12 * * 1-5 cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && python3 writer.py --format=mid >> /var/log/cretepulse-content/writer.log 2>&1

# Writer short (7x/sem daily 18:00 UTC)
0 18 * * * cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && python3 writer.py --format=short >> /var/log/cretepulse-content/writer.log 2>&1

# Weekly perf check (Monday 09:00 UTC) — INCHANGÉ
0 9 * * 1 cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && python3 bin/perf-check.py >> /var/log/cretepulse-content/perf.log 2>&1

# HCAA + Fraport monthly cron INCHANGÉS
0 6 5 * * cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && python3 hcaa-crete-airports.py >> /var/log/cretepulse-content/hcaa-crete.log 2>&1
0 7 7 * * cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && python3 fraport-chq-traffic.py >> /var/log/cretepulse-content/fraport-chq.log 2>&1
```

L'ancien `bin/run-batch.sh` n'est plus appelé par cron, mais conservé sur disque pour rollback rapide si besoin.

**Volume hebdo prévu** :
- 2 pillar + 5 mid + 7 short = **14 articles EN/sem**
- × 22 langues via translator-batch = **308 pages/sem**
- + 1 article airbnb-articles data exclusive (hebdo lundi) × 22 = 22 pages
- + news scrapées palantir (writer-v2 toutes les heures) inchangé
- + daily-weather + daily-news (cron à valider, hors scope de ce spec)
- **Total nouveau contenu indexable/sem ≈ 330 pages**

---

## 7. Setup GSC service account (procédure Kami)

**Durée estimée : 15 minutes one-shot.**

1. Google Cloud Console : créer ou réutiliser un projet (nom suggéré `cretepulse-gsc-reader`)
   - URL : https://console.cloud.google.com/projectcreate
2. Activer l'API "Google Search Console API"
   - URL : https://console.cloud.google.com/apis/library/searchconsole.googleapis.com
   - Cliquer "Enable"
3. Créer un service account
   - URL : https://console.cloud.google.com/iam-admin/serviceaccounts
   - Nom : `cretepulse-gsc-reader`
   - ID : `cretepulse-gsc` (l'email sera `cretepulse-gsc@PROJET.iam.gserviceaccount.com`)
   - Pas besoin de rôle IAM au niveau projet (GSC gère ses propres permissions)
4. Générer une clé JSON pour ce service account
   - Onglet "Keys" → "Add Key" → "Create new key" → JSON → Download
5. Ajouter le service account comme utilisateur de la propriété GSC `crete.direct`
   - URL : https://search.google.com/search-console/users?resource_id=sc-domain%3Acrete.direct
   - "Add user" → coller l'email service account → permission "Restricted" suffit
6. Transmettre le JSON à Claude (via Drive privé ou copie base64 dans une session)
   - Claude le pose dans `/opt/cretepulse-content/gsc-service-account.json` avec `chmod 600`
7. Test :
   ```bash
   cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && python3 -c "
   from google.oauth2 import service_account
   from googleapiclient.discovery import build
   creds = service_account.Credentials.from_service_account_file(
       'gsc-service-account.json',
       scopes=['https://www.googleapis.com/auth/webmasters.readonly'])
   sc = build('searchconsole', 'v1', credentials=creds)
   r = sc.searchanalytics().query(siteUrl='sc-domain:crete.direct',
       body={'startDate':'2026-05-01','endDate':'2026-05-31','dimensions':['query'],'rowLimit':10}).execute()
   for row in r.get('rows', []): print(row)
   "
   ```
   → doit afficher 10 queries avec impressions/clicks/CTR/position.

---

## 8. Discipline AEO (tous formats)

Tout article généré DOIT satisfaire les 4 critères suivants, vérifiés post-génération avant insertion :

1. **Question H1 ou H2 explicite** : le H1 ou un H2 doit être formulé comme une question complète. Si non, reject + retry.
2. **Réponse chiffrée dans les 100 premiers mots** : au moins une donnée quantifiée (température, prix, distance, %) dans les 100 premiers mots du body.
3. **Au moins 1 tableau structuré** (HTML `<table>` ou liste `<ul>` avec ≥4 items).
4. **JSON-LD `@type: FAQPage`** injecté dans le `<head>` avec minimum 3 paires Q&A. Le `writer.py` génère ce JSON-LD à partir des H2/H3 questions identifiées dans le content.

Le check est implémenté en post-génération via parseur HTML (BeautifulSoup) + comptage simple, pas via Claude (cap fair-use).

---

## 9. 15 sujets seed (rollout J0)

Insérés manuellement dans `guides_queue` immédiatement après migration DB, pour débloquer la prod dès le premier cron J+1.

### Pillar (2)
| Slug cible | target_query | priority |
|-----------|--------------|----------|
| `where-to-stay-crete-12-zones-compared` | "where to stay in crete" | 95 |
| `crete-in-may-weather-crowds-prices-2026` | "crete in may" | 92 |

### Mid (5)
| Slug cible | target_query | priority |
|-----------|--------------|----------|
| `balos-vs-elafonisi-which-paradise-wins` | "balos vs elafonisi" | 75 |
| `knossos-palace-worth-it-honest-take` | "is knossos worth visiting" | 73 |
| `crete-with-kids-7-day-itinerary` | "crete with kids itinerary" | 72 |
| `driving-in-crete-mountain-roads-parking` | "driving in crete tips" | 71 |
| `heraklion-to-chania-4-ways-compared-2026` | "heraklion to chania transport" | 70 |

### Short (8)
| Slug cible | target_query | priority |
|-----------|--------------|----------|
| `tap-water-crete-can-you-drink` | "can you drink tap water in crete" | 55 |
| `cash-vs-card-crete-2026` | "cash or card in crete" | 54 |
| `uber-crete-2026-alternatives` | "is uber available in crete" | 54 |
| `mosquitoes-crete-when-where` | "are there mosquitoes in crete" | 53 |
| `solo-female-travel-crete-safe-2026` | "is crete safe for solo female travelers" | 53 |
| `swim-crete-october-sea-temperature` | "can you swim in crete in october" | 52 |
| `tipping-crete-restaurants-how-much` | "do you tip in crete restaurants" | 52 |
| `dress-code-crete-monasteries` | "dress code crete monasteries" | 51 |

Tous les seeds ont source=`"seed-2026-06-02"` et source_meta = `{"seeded_by": "kami", "design_doc": "2026-06-02-crete-direct-editorial-pipeline-revival-design.md"}`.

---

## 10. Rollout en 3 étapes

### J0 (aujourd'hui, 02/06/2026)
1. Migration DB : ajout colonnes `format`, `priority`, `source`, `source_meta` sur `guides_queue` + ajout `target_query`, `format_tier`, `source_meta` sur `guides`. Création index partiel.
2. Refactor `writer.py` (depuis `writer-l1.py`) : argparse `--format`, mapping modèle, 3 prompt templates dans `prompts/`.
3. Élargissement `airbnb-articles.py` : 5 nouveaux angles + cooldown 30→60j.
4. Insert les 15 seeds dans `guides_queue`.
5. Remplacement des 3 lignes crontab `run-batch.sh` par les 3 lignes `writer.py --format=...` + ajout `discover.py --mode=...` (commenté tant que GSC pas en place).
6. Smoke test : `writer.py --format=short --dry-run` sur 1 seed → vérifie que le prompt est correct, dataset chargé, anti-hallu pass.

### J+1 (03/06)
1. Premier cron `writer.py --format=short` à 18:00 UTC publie le seed `tap-water-crete-can-you-drink`.
2. Vérification log + check guide inséré + traductions 22 langues lancées.
3. Vérifier prod : `curl -s https://crete.direct/articles/tap-water-crete-can-you-drink` → 200.

### J+2 ou J+3 (selon dispo Kami pour setup GSC)
1. Kami exécute la procédure §7 (15 min).
2. Claude pose le JSON sur VPS, fait le test API.
3. Active les crons `discover.py --mode=gsc-rss` (dimanche) et `discover.py --mode=paa` (lundi) en décommentant.
4. Premier dimanche post-activation : la queue se remplit auto avec 30 top striking distance + 5-10 Reddit RSS.

### J+7 (09/06)
1. Pull GSC manuel sur les 15 seeds publiés (1 sem post-publication).
2. Comparer positions GSC J-7 vs J+0 → mesure impact initial.
3. Ajustement seuils impressions/position si volume queue insuffisant (devrait être OK, à mesurer).

### J+30 (02/07)
1. Pull GSC global crete.direct : clics 28j vs baseline 14/05 = 52/28j → cible mesurable +50% à +100%.
2. Décider si on monte la cadence (passer short à 2x/jour) ou si on maintient.

---

## 11. Risques et mitigations

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|-----------|
| GSC API quota dépassé | Faible | Moyen | Quota 50K req/jour, on en utilise 1/sem |
| PAA scraping bloqué par Google (CAPTCHA) | Moyenne | Moyen | Délai 5s + UA réaliste + max 20 queries/run. Fallback : si 3 échecs consécutifs, mode dégradé (skip PAA, garder GSC seul) |
| Claude OAuth cap 250/24h dépassé | Très faible | Élevé | 14 articles/sem × 1 invocation = 14/sem, très loin du cap |
| `claude --model opus` indisponible en CLI OAuth | Faible | Moyen | Test au déploiement ; fallback `sonnet` pour pillar si opus pas servi |
| Qualité Haiku trop faible pour shorts AEO | Moyenne | Faible | Length check + AEO check post-génération force régénération. Si échec récurrent : promotion shorts à Sonnet (impact budget négligeable) |
| Seeds dupliquent un article existant (insert collision) | Faible | Très faible | `ON CONFLICT (slug) DO NOTHING` sur insert queue |
| Reddit relance 403 sur RSS public | Faible | Faible | Fallback gracieux, RSS feeds classiques continuent |
| translator-batch sature avec 14×22=308 pages/sem | Moyenne | Moyen | Surveiller log translator. Si latence > 24h, batcher par chunks ou prioriser EN→FR/DE/EL d'abord, autres locales en différé |

---

## 12. Tests

### 12.1 Unit-ish (peut être manuel via `--dry-run`)
- `discover.py --mode=gsc-rss --dry-run` : pull GSC + RSS sans insert, log payload final
- `discover.py --mode=paa --dry-run` : scrape PAA sans insert, log questions extraites
- `writer.py --format=short --slug=tap-water-crete-can-you-drink --dry-run` : génère le prompt complet, charge le seed, ne fait PAS d'appel Claude ni d'insert

### 12.2 Smoke E2E (1 article par format)
- Lancer manuellement `writer.py --format=short` puis vérifier guide inséré + traductions
- Idem `mid`, idem `pillar`
- Vérifier que les 3 articles sortis ont bien (a) question H1/H2, (b) chiffre dans 100 premiers mots, (c) tableau, (d) JSON-LD FAQPage

### 12.3 Tests de non-régression
- `news.py` palantir continue de scraper + insérer (vérifier log writer-v2 inchangé)
- `airbnb-articles.py` peut être lancé manuellement avec un des 5 nouveaux angles → vérifier insertion + qualité

---

## 13. Annexes

### 13.1 Décisions prises pendant le brainstorming
1. Cible touristes (vs investisseurs ou mix) — Q1
2. Hybride GSC + PAA explosion (vs GSC seul, PAA seul, ou Reddit ressuscité) — Q2
3. Kami fait le setup GSC service account aujourd'hui (vs bootstrap PAA-only) — Q3
4. Mix tiers pillar/mid/short = 2/5/7 articles/sem (vs all-pillar, all-mid, all-short) — Q4
5. 1 script paramétrable + 3 crons (vs 3 scripts distincts par format)
6. 15 sujets seed validés tels que listés §9

### 13.2 Fichiers impactés (création/modif/inchangé)
- **Création** : `prompts/writer-pillar.md`, `prompts/writer-mid.md`, `prompts/writer-short.md`, `migrations/2026-06-02-queue-extended-schema.sql`
- **Refactor** : `discover.py` (v2), `writer.py` (renommé depuis `writer-l1.py` et refactoré ; ancien fichier conservé `.bak-20260602`)
- **Élargissement** : `airbnb-articles.py` (5 nouveaux angles + cooldown bumped)
- **Inchangé** : `news.py`, `weather.py`, `translator-batch.py`, `indexnow.py`, `daily_*.py`, `eurostat-tourism.py`, `hcaa-crete-airports.py`, `fraport-chq-traffic.py`, `bin/claude-capped.sh`

### 13.3 Contraintes système rappelées
- **Pas d'API key Anthropic** : tout passage par `claude-capped.sh` (OAuth)
- **Cap fair-use 250/24h** sur les appels Claude
- **Pas de em dash** dans tout texte généré (CLAUDE.md rule, à inclure explicitement dans les 3 prompts templates)
- **Langue de génération initiale** : EN + FR via writer.py, puis 20 autres locales via translator-batch
- **Signature articles** : aucune (les guides sont publiés au nom du site crete.direct, pas signés Kami)
