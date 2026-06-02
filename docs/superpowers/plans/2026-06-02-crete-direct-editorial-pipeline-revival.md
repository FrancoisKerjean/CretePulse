# crete.direct — Pipeline éditorial autonome — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Réparer le pipeline éditorial long-form de crete.direct cassé depuis 25/05 (file d'attente épuisée + cooldown angles bloquant) et l'industrialiser avec une source d'inspiration auto-alimentée (GSC striking distance + PAA expansion + Reddit RSS) qui produit 14 articles long-form par semaine selon la pyramide pillar/mid/short.

**Architecture:** 1 script `discover.py` paramétrable (modes `gsc-rss` et `paa`) qui remplit la table `guides_queue` étendue (colonnes format/priority/source/source_meta) + 1 script `writer.py` paramétrable (argument `--format`) qui pop la queue selon format et choisit modèle Claude (Opus/Sonnet/Haiku) + prompt template. Toutes les invocations Claude passent par `claude-capped.sh` (OAuth, cap 250/24h, jamais d'API key). 5 crons cretepulse au lieu des 3 actuels. `airbnb-articles.py` élargi à 10 angles (5 existants + 5 nouveaux) avec cooldown 60j.

**Tech Stack:** Python 3.12.3, Postgres 17 + PostgREST, Claude CLI OAuth via `claude-capped.sh`, libs `psycopg2`, `requests`, `feedparser`, `beautifulsoup4`, `google-auth`, `google-api-python-client`, pytest pour tests unitaires.

**Spec source:** `docs/superpowers/specs/2026-06-02-crete-direct-editorial-pipeline-revival-design.md`

---

## File Structure

### Création
| Path (sur VPS `/opt/cretepulse-content/`) | Responsabilité |
|-------------------------------------------|----------------|
| `migrations/2026-06-02-queue-extended-schema.sql` | Migration idempotente : `guides_queue` (format/priority/source/source_meta + index partiel) + `guides` (target_query/format_tier/source_meta) |
| `migrations/2026-06-02-seeds-initial.sql` | Insertion des 15 sujets seed dans `guides_queue` |
| `prompts/writer-pillar.md` | Prompt template Claude Opus, 2000-3000 mots, structure pillar avec internal linking |
| `prompts/writer-mid.md` | Prompt template Claude Sonnet, 1000-1500 mots, mid-form comparatif ou guide |
| `prompts/writer-short.md` | Prompt template Claude Haiku, 500-800 mots, Q&A AEO-first |
| `lib/__init__.py` | Module commun |
| `lib/aeo_check.py` | Validation post-génération : H1/H2 question, chiffre dans 100 premiers mots, tableau, FAQPage JSON-LD |
| `lib/gsc_client.py` | Wrapper service account GSC API (search analytics query) |
| `lib/paa_scraper.py` | Scraping Google PAA + autocomplete avec User-Agent réaliste + délai |
| `tests/__init__.py` | Package tests |
| `tests/test_aeo_check.py` | Tests unitaires AEO validation |
| `tests/test_gsc_client.py` | Tests unitaires GSC payload parsing (mock API) |
| `tests/test_paa_scraper.py` | Tests unitaires PAA HTML parsing (fixtures HTML) |
| `tests/test_writer_format_routing.py` | Tests routing format → modèle/prompt |

### Refactor
| Path | Action |
|------|--------|
| `discover.py` | Refonte complète : argparse `--mode`, 4 sources (GSC, PAA, Reddit RSS, RSS), insert dans `guides_queue` étendu. Backup `discover.py.bak-2026-06-02` |
| `writer.py` | Refactor depuis `writer-l1.py` : argparse `--format`, mapping modèle/prompt/longueur, AEO check post-génération. `writer-l1.py` renommé `writer-l1.py.bak-2026-06-02` |
| `airbnb-articles.py` | Ajout 5 nouveaux angles dans `ANGLES` + bump `min_days_between` 30→60 par défaut. Backup `airbnb-articles.py.bak-2026-06-02-pre-expansion` |

### Inchangé
`news.py`, `weather.py`, `daily_weather.py`, `daily_news.py`, `daily_common.py`, `translator-batch.py`, `indexnow.py`, `hcaa-crete-airports.py`, `fraport-chq-traffic.py`, `eurostat-tourism.py`, `bin/claude-capped.sh`, `bin/run-batch.sh`.

### Configuration
| Path | Action |
|------|--------|
| `/opt/cretepulse-content/gsc-service-account.json` | Création (Kami dépose, Claude pose chmod 600) |
| Crontab user `cretepulse` | Replace 3 lignes `run-batch.sh` par 5 nouvelles entrées |

---

## Phase A — Déblocage immédiat (DB + seeds)

### Task 1: Migration DB schema `guides_queue` + `guides`

**Files:**
- Create: `/opt/cretepulse-content/migrations/2026-06-02-queue-extended-schema.sql`

- [ ] **Step 1: Créer le fichier migration**

```sql
-- /opt/cretepulse-content/migrations/2026-06-02-queue-extended-schema.sql
BEGIN;

ALTER TABLE guides_queue
  ADD COLUMN IF NOT EXISTS format TEXT NOT NULL DEFAULT 'mid' CHECK (format IN ('pillar','mid','short')),
  ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'seed',
  ADD COLUMN IF NOT EXISTS source_meta JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_guides_queue_pending
  ON guides_queue (status, format, priority DESC, created_at ASC)
  WHERE status = 'pending';

ALTER TABLE guides
  ADD COLUMN IF NOT EXISTS source_meta JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS target_query TEXT,
  ADD COLUMN IF NOT EXISTS format_tier TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'guides_format_tier_check'
  ) THEN
    ALTER TABLE guides
      ADD CONSTRAINT guides_format_tier_check
      CHECK (format_tier IS NULL OR format_tier IN ('pillar','mid','short'));
  END IF;
END $$;

COMMIT;
```

- [ ] **Step 2: Appliquer la migration**

Run:
```bash
ssh root@89.167.115.63 'mkdir -p /opt/cretepulse-content/migrations'
scp /local/path/2026-06-02-queue-extended-schema.sql root@89.167.115.63:/opt/cretepulse-content/migrations/
ssh root@89.167.115.63 'PGPASSWORD=$(grep POSTGRES_PASSWORD /opt/cretepulse-db/.env | cut -d= -f2) psql -h 127.0.0.1 -p 5433 -U postgres -d cretepulse -f /opt/cretepulse-content/migrations/2026-06-02-queue-extended-schema.sql'
```

Expected: `BEGIN`, 4× `ALTER TABLE`, `CREATE INDEX`, `DO`, `COMMIT`.

- [ ] **Step 3: Vérifier le schéma appliqué**

Run:
```bash
ssh root@89.167.115.63 "PGPASSWORD=\$(grep POSTGRES_PASSWORD /opt/cretepulse-db/.env | cut -d= -f2) psql -h 127.0.0.1 -p 5433 -U postgres -d cretepulse -c '\\d guides_queue'"
```

Expected: colonnes `format`, `priority`, `source`, `source_meta` présentes. Index `idx_guides_queue_pending` présent.

- [ ] **Step 4: Commit la migration**

```bash
cd /local/repo/cretepulse-build
mkdir -p migrations
cp /local/path/2026-06-02-queue-extended-schema.sql migrations/
git add migrations/2026-06-02-queue-extended-schema.sql
git commit -m "feat(db): extend guides_queue with format/priority/source/source_meta"
```

---

### Task 2: Seed initial 15 sujets

**Files:**
- Create: `/opt/cretepulse-content/migrations/2026-06-02-seeds-initial.sql`

- [ ] **Step 1: Créer le fichier seeds**

```sql
-- /opt/cretepulse-content/migrations/2026-06-02-seeds-initial.sql
BEGIN;

-- 2 PILLAR
INSERT INTO guides_queue (slug, title, status, format, priority, source, source_meta) VALUES
  ('where-to-stay-crete-12-zones-compared', 'Where to stay in Crete: 12 zones compared honestly by traveler type', 'pending', 'pillar', 95, 'seed-2026-06-02', '{"target_query":"where to stay in crete","seeded_by":"kami","design_doc":"2026-06-02-crete-direct-editorial-pipeline-revival-design.md"}'::jsonb),
  ('crete-in-may-weather-crowds-prices-2026', 'Crete in May 2026: weather, crowds, prices, what to actually do', 'pending', 'pillar', 92, 'seed-2026-06-02', '{"target_query":"crete in may","seeded_by":"kami"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- 5 MID
INSERT INTO guides_queue (slug, title, status, format, priority, source, source_meta) VALUES
  ('balos-vs-elafonisi-which-paradise-wins', 'Balos Lagoon vs Elafonisi: which Crete paradise beach really wins', 'pending', 'mid', 75, 'seed-2026-06-02', '{"target_query":"balos vs elafonisi","seeded_by":"kami"}'::jsonb),
  ('knossos-palace-worth-it-honest-take', 'Knossos Palace: is it worth the 20 euros and 2h in the heat?', 'pending', 'mid', 73, 'seed-2026-06-02', '{"target_query":"is knossos worth visiting","seeded_by":"kami"}'::jsonb),
  ('crete-with-kids-7-day-itinerary', 'Crete with kids: 7-day itinerary that won''t burn out parents', 'pending', 'mid', 72, 'seed-2026-06-02', '{"target_query":"crete with kids itinerary","seeded_by":"kami"}'::jsonb),
  ('driving-in-crete-mountain-roads-parking', 'Driving in Crete: what nobody tells you about mountain roads, parking, fuel', 'pending', 'mid', 71, 'seed-2026-06-02', '{"target_query":"driving in crete tips","seeded_by":"kami"}'::jsonb),
  ('heraklion-to-chania-4-ways-compared-2026', 'Heraklion Airport to Chania: 4 ways to get there with prices 2026', 'pending', 'mid', 70, 'seed-2026-06-02', '{"target_query":"heraklion to chania transport","seeded_by":"kami"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- 8 SHORT
INSERT INTO guides_queue (slug, title, status, format, priority, source, source_meta) VALUES
  ('tap-water-crete-can-you-drink', 'Can you drink tap water in Crete?', 'pending', 'short', 55, 'seed-2026-06-02', '{"target_query":"can you drink tap water in crete","seeded_by":"kami"}'::jsonb),
  ('cash-vs-card-crete-2026', 'How much cash should you bring to Crete vs card in 2026?', 'pending', 'short', 54, 'seed-2026-06-02', '{"target_query":"cash or card in crete","seeded_by":"kami"}'::jsonb),
  ('uber-crete-2026-alternatives', 'Is Uber available in Crete in 2026?', 'pending', 'short', 54, 'seed-2026-06-02', '{"target_query":"is uber available in crete","seeded_by":"kami"}'::jsonb),
  ('mosquitoes-crete-when-where', 'Are there mosquitoes in Crete? When and where they get bad', 'pending', 'short', 53, 'seed-2026-06-02', '{"target_query":"are there mosquitoes in crete","seeded_by":"kami"}'::jsonb),
  ('solo-female-travel-crete-safe-2026', 'Is Crete safe for solo female travelers in 2026?', 'pending', 'short', 53, 'seed-2026-06-02', '{"target_query":"is crete safe for solo female travelers","seeded_by":"kami"}'::jsonb),
  ('swim-crete-october-sea-temperature', 'Can you swim in Crete in October? Sea temperature month by month', 'pending', 'short', 52, 'seed-2026-06-02', '{"target_query":"can you swim in crete in october","seeded_by":"kami"}'::jsonb),
  ('tipping-crete-restaurants-how-much', 'Do you tip in Crete restaurants? How much is normal', 'pending', 'short', 52, 'seed-2026-06-02', '{"target_query":"do you tip in crete restaurants","seeded_by":"kami"}'::jsonb),
  ('dress-code-crete-monasteries', 'What''s the dress code for Crete monasteries (Arkadi, Toplou, Preveli)?', 'pending', 'short', 51, 'seed-2026-06-02', '{"target_query":"dress code crete monasteries","seeded_by":"kami"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
```

- [ ] **Step 2: Appliquer le seed**

Run:
```bash
scp /local/path/2026-06-02-seeds-initial.sql root@89.167.115.63:/opt/cretepulse-content/migrations/
ssh root@89.167.115.63 'PGPASSWORD=$(grep POSTGRES_PASSWORD /opt/cretepulse-db/.env | cut -d= -f2) psql -h 127.0.0.1 -p 5433 -U postgres -d cretepulse -f /opt/cretepulse-content/migrations/2026-06-02-seeds-initial.sql'
```

Expected: `BEGIN`, 3× `INSERT 0 N`, `COMMIT`.

- [ ] **Step 3: Vérifier les inserts**

Run:
```bash
curl -s "https://kairos-n8n.duckdns.org/cretepulse-db/rest/v1/guides_queue?status=eq.pending&select=slug,format,priority&order=priority.desc" -H "Accept: application/json"
```

Expected: 15 lignes, format `pillar`×2, `mid`×5, `short`×8, priorities 95→51.

- [ ] **Step 4: Commit le seed**

```bash
cd /local/repo/cretepulse-build
git add migrations/2026-06-02-seeds-initial.sql
git commit -m "feat(content): seed 15 editorial topics (2 pillar + 5 mid + 8 short)"
```

---

## Phase B — Writer paramétrable

### Task 3: Prompt template `writer-short.md`

**Files:**
- Create: `/opt/cretepulse-content/prompts/writer-short.md`

- [ ] **Step 1: Écrire le prompt template short**

```markdown
You are a senior travel writer for crete.direct, an English-first independent travel site about Crete, Greece. Your job is to write ONE short-form AEO-optimized article (500-800 words EN + 500-800 words FR) that answers a specific traveler question with concrete, citable facts.

## Article specs (NON-NEGOTIABLE)
- Length: 500-800 words EN, 500-800 words FR. Reject if under 400.
- H1 = the exact question (interrogative form).
- The first 100 words MUST contain the direct answer with at least one specific number (date, price in EUR, temperature in °C, distance in km, percentage).
- Body MUST contain at least one HTML `<table>` OR `<ul>` with ≥4 distinct items.
- End with 3-5 FAQ pairs as proper JSON-LD (see schema below).
- No em-dashes. Use commas, periods, semicolons.
- No first-person opinion ("I think", "in my opinion"). Use evidence: "the data shows", "according to X", "based on Y".
- No fabricated sources. If you cite a source, it must be verifiable (Greek government site, Open-Meteo, Eurostat, official airport authority, established travel publication).

## Input
- target_query: {target_query}
- title: {title}
- slug: {slug}

## Output format
Return strictly valid JSON with the schema below. No markdown fences, no commentary, just JSON.

```json
{
  "title_en": "...",
  "title_fr": "...",
  "meta_desc_en": "≤155 chars",
  "meta_desc_fr": "≤155 chars",
  "content_en": "<h1>...</h1><p>...</p><table>...</table>...",
  "content_fr": "<h1>...</h1>...",
  "faq_jsonld": {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {"@type": "Question", "name": "...", "acceptedAnswer": {"@type": "Answer", "text": "..."}}
    ]
  },
  "confidence": "high|medium|low",
  "places_mentioned": ["chania", "ierapetra", ...]
}
```

## Anti-hallucination
Every Crete place, restaurant, beach, or service named in `places_mentioned` will be cross-checked against our database. If you mention "Chania" or "Heraklion" (universally known), fine. If you mention "Taverna O Manolis" or "Stavros Beach" specifically, you MUST be confident it exists.

## Forbidden words
investissement sur, garantie de revenus, passif, paradis fiscal, facile, cheap, simple, secret-magique. Avoid hyperbole. Be direct and accurate.

Write the article now.
```

- [ ] **Step 2: Déployer sur VPS**

```bash
ssh root@89.167.115.63 'mkdir -p /opt/cretepulse-content/prompts'
scp /local/path/writer-short.md root@89.167.115.63:/opt/cretepulse-content/prompts/
```

- [ ] **Step 3: Vérifier le déploiement**

Run:
```bash
ssh root@89.167.115.63 'wc -l /opt/cretepulse-content/prompts/writer-short.md'
```

Expected: ~45 lignes.

- [ ] **Step 4: Commit**

```bash
cd /local/repo/cretepulse-build
mkdir -p prompts
cp /local/path/writer-short.md prompts/
git add prompts/writer-short.md
git commit -m "feat(content): writer-short prompt template (AEO Q&A 500-800 words)"
```

---

### Task 4: Prompt template `writer-mid.md`

**Files:**
- Create: `/opt/cretepulse-content/prompts/writer-mid.md`

- [ ] **Step 1: Écrire le prompt template mid**

```markdown
You are a senior travel writer for crete.direct. Your job is to write ONE mid-form article (1000-1500 words EN + 1000-1500 words FR) that helps travelers make a comparative or planning decision about Crete.

## Article specs (NON-NEGOTIABLE)
- Length: 1000-1500 words EN, 1000-1500 words FR. Reject if under 800 EN.
- H1 = answers the target_query directly (can be statement OR question).
- First 100 words must include the TL;DR with at least 2 specific facts (numbers, places, dates).
- Body structure: intro (TL;DR) → 3-6 H2 sections → "Practical tips" or "Watch out for" → FAQ.
- At least 1 comparison `<table>` (if "X vs Y" article) OR 1 step-by-step `<ol>` (if "how to") OR 1 itinerary `<ul>` (if guide).
- 3-5 FAQ Q&A pairs at the bottom, returned separately as JSON-LD.
- Internal linking: suggest 2-3 relevant existing articles on crete.direct (via `internal_link_suggestions` field, format: query keyword → suggested anchor text).
- No em-dashes. No first-person opinion. No fabricated sources.

## Input
- target_query: {target_query}
- title: {title}
- slug: {slug}
- existing_related_articles: {existing_articles}  // list of {slug, title} pulled from DB

## Output format
Return strictly valid JSON:

```json
{
  "title_en": "...",
  "title_fr": "...",
  "meta_desc_en": "≤155 chars",
  "meta_desc_fr": "≤155 chars",
  "content_en": "<h1>...</h1>...",
  "content_fr": "<h1>...</h1>...",
  "faq_jsonld": {...},
  "internal_link_suggestions": [
    {"slug": "samaria-gorge-hiking-guide", "anchor_text_en": "the Samaria gorge guide", "anchor_text_fr": "le guide des gorges de Samaria"}
  ],
  "confidence": "high|medium|low",
  "places_mentioned": [...]
}
```

## Anti-hallucination
Same rules as short: places must exist, no fabricated taverns, no invented prices. If you mention a price, source it (or hedge: "around 20 EUR according to official Knossos site as of 2025").

## Forbidden words
Same list as short. Plus: no "must-see", no "hidden gem" (overused). Use "worth visiting", "less crowded", "underrated by tourists".

Write the article now.
```

- [ ] **Step 2: Déployer + verify + commit** (même pattern que Task 3)

```bash
scp /local/path/writer-mid.md root@89.167.115.63:/opt/cretepulse-content/prompts/
ssh root@89.167.115.63 'wc -l /opt/cretepulse-content/prompts/writer-mid.md'
cd /local/repo/cretepulse-build
cp /local/path/writer-mid.md prompts/
git add prompts/writer-mid.md
git commit -m "feat(content): writer-mid prompt template (comparative 1000-1500 words)"
```

---

### Task 5: Prompt template `writer-pillar.md`

**Files:**
- Create: `/opt/cretepulse-content/prompts/writer-pillar.md`

- [ ] **Step 1: Écrire le prompt template pillar**

```markdown
You are a senior travel writer for crete.direct. Your job is to write ONE pillar-form deep-dive (2000-3000 words EN + 2000-3000 words FR) that serves as the authoritative crete.direct resource on its target_query, designed to attract organic backlinks and rank top 5 on Google.

## Article specs (NON-NEGOTIABLE)
- Length: 2000-3000 words EN, 2000-3000 words FR. Reject if under 1800 EN.
- H1 = direct match or close paraphrase of target_query.
- First 200 words: clear thesis + 3-5 bullet TL;DR with hard data.
- Body structure: 6-10 H2 sections, each ≥150 words, each with at least 1 chiffre/stat OR 1 quote/anecdote OR 1 table cell.
- Mandatory components:
  - 2+ comparison tables OR data visualizations described in HTML
  - 1 "common myths" or "what travelers get wrong" section
  - 1 "by region" or "by month" or "by traveler type" breakdown
  - 5-8 FAQ pairs at the bottom as proper JSON-LD
- Internal linking: 4-6 suggestions to existing crete.direct articles.
- External authoritative refs (1-3): link to Greek tourism stats (insete.gr), HCAA, official Greek gov sites, Eurostat.
- No em-dashes. No first-person opinion. Evidence-based tone.

## Input
- target_query: {target_query}
- title: {title}
- slug: {slug}
- existing_related_articles: {existing_articles}
- data_hints: {data_hints}  // optional pre-extracted facts (e.g. HCAA passenger numbers, Open-Meteo monthly means)

## Output format
Return strictly valid JSON:

```json
{
  "title_en": "...",
  "title_fr": "...",
  "meta_desc_en": "≤155 chars",
  "meta_desc_fr": "≤155 chars",
  "content_en": "<h1>...</h1>...",
  "content_fr": "<h1>...</h1>...",
  "faq_jsonld": {...},
  "internal_link_suggestions": [...],
  "external_references": [
    {"url": "https://insete.gr/...", "context_en": "Greek Tourism Confederation 2024 report"}
  ],
  "confidence": "high|medium|low",
  "places_mentioned": [...]
}
```

## Anti-hallucination
Critical at pillar level. If you cite a stat, it MUST be from a real source. If unsure, write "around X" or "approximately X" and source the range. Better an honest range than a fabricated specific number.

## Forbidden words
Same as mid. Plus: no clickbait phrasing ("you won't believe", "shocking truth"). Pillar tone is calm, authoritative, evidence-based, slightly contrarian when warranted by data.

Write the article now.
```

- [ ] **Step 2-4: Déployer + verify + commit**

```bash
scp /local/path/writer-pillar.md root@89.167.115.63:/opt/cretepulse-content/prompts/
ssh root@89.167.115.63 'wc -l /opt/cretepulse-content/prompts/writer-pillar.md'
cd /local/repo/cretepulse-build
cp /local/path/writer-pillar.md prompts/
git add prompts/writer-pillar.md
git commit -m "feat(content): writer-pillar prompt template (deep-dive 2000-3000 words)"
```

---

### Task 6: Module `lib/aeo_check.py` avec tests TDD

**Files:**
- Create: `/opt/cretepulse-content/lib/__init__.py`
- Create: `/opt/cretepulse-content/lib/aeo_check.py`
- Create: `/opt/cretepulse-content/tests/__init__.py`
- Create: `/opt/cretepulse-content/tests/test_aeo_check.py`

- [ ] **Step 1: Créer le test failing**

```python
# /opt/cretepulse-content/tests/test_aeo_check.py
import pytest
from lib.aeo_check import check_aeo_compliance, AEOFailure

def test_passes_with_h1_question_and_number_and_table():
    html = """<h1>Can you drink tap water in Crete?</h1>
    <p>Yes, tap water in Crete is safe to drink in 95% of villages as of 2026.</p>
    <table><tr><td>A</td></tr><tr><td>B</td></tr><tr><td>C</td></tr><tr><td>D</td></tr></table>"""
    faq_jsonld = {"@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": "Q1", "acceptedAnswer": {"@type": "Answer", "text": "A1"}},
        {"@type": "Question", "name": "Q2", "acceptedAnswer": {"@type": "Answer", "text": "A2"}},
        {"@type": "Question", "name": "Q3", "acceptedAnswer": {"@type": "Answer", "text": "A3"}},
    ]}
    result = check_aeo_compliance(html, faq_jsonld)
    assert result.passed is True

def test_fails_when_no_question_in_h1_or_h2():
    html = """<h1>Crete water</h1><p>It is fine 95% of the time.</p>
    <table><tr><td>A</td></tr><tr><td>B</td></tr><tr><td>C</td></tr><tr><td>D</td></tr></table>"""
    faq = {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": "Q", "acceptedAnswer": {"@type": "Answer", "text": "A"}}] * 3}
    result = check_aeo_compliance(html, faq)
    assert result.passed is False
    assert "no_question_heading" in result.failures

def test_fails_when_no_number_in_first_100_words():
    html = """<h1>Can you drink tap water in Crete?</h1>
    <p>""" + ("safe water everywhere always good " * 30) + """</p>
    <table><tr><td>A</td></tr><tr><td>B</td></tr><tr><td>C</td></tr><tr><td>D</td></tr></table>"""
    faq = {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": "Q", "acceptedAnswer": {"@type": "Answer", "text": "A"}}] * 3}
    result = check_aeo_compliance(html, faq)
    assert result.passed is False
    assert "no_number_in_intro" in result.failures

def test_fails_when_no_table_and_no_long_list():
    html = """<h1>Can you drink tap water in Crete?</h1>
    <p>Yes 95% of the time.</p><ul><li>one</li><li>two</li></ul>"""
    faq = {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": "Q", "acceptedAnswer": {"@type": "Answer", "text": "A"}}] * 3}
    result = check_aeo_compliance(html, faq)
    assert result.passed is False
    assert "no_table_or_long_list" in result.failures

def test_fails_when_faq_under_3_entries():
    html = """<h1>Can you drink tap water in Crete?</h1>
    <p>Yes 95% of the time.</p>
    <table><tr><td>A</td></tr><tr><td>B</td></tr><tr><td>C</td></tr><tr><td>D</td></tr></table>"""
    faq = {"@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": "Q1", "acceptedAnswer": {"@type": "Answer", "text": "A1"}},
        {"@type": "Question", "name": "Q2", "acceptedAnswer": {"@type": "Answer", "text": "A2"}},
    ]}
    result = check_aeo_compliance(html, faq)
    assert result.passed is False
    assert "faq_too_short" in result.failures
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
ssh root@89.167.115.63 'cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && pip install pytest beautifulsoup4 && pytest tests/test_aeo_check.py -v'
```

Expected: 5 FAILED with `ModuleNotFoundError: No module named 'lib.aeo_check'`.

- [ ] **Step 3: Écrire le module aeo_check.py**

```python
# /opt/cretepulse-content/lib/aeo_check.py
"""AEO post-generation compliance check for crete.direct articles."""
from dataclasses import dataclass, field
from typing import List, Dict, Any
import re
from bs4 import BeautifulSoup


@dataclass
class AEOFailure:
    passed: bool
    failures: List[str] = field(default_factory=list)
    details: Dict[str, Any] = field(default_factory=dict)


_NUMBER_RE = re.compile(r"\b\d+([.,]\d+)?\b|\b\d+%|\b\d+\s*(eur|EUR|€|km|°C|min|h|m|kg|m²)\b")


def check_aeo_compliance(html: str, faq_jsonld: dict) -> AEOFailure:
    soup = BeautifulSoup(html, "html.parser")
    failures: List[str] = []
    details: Dict[str, Any] = {}

    h1 = soup.find("h1")
    h2s = soup.find_all("h2")
    has_question = False
    if h1 and "?" in h1.get_text():
        has_question = True
    if not has_question:
        for h2 in h2s:
            if "?" in h2.get_text():
                has_question = True
                break
    if not has_question:
        failures.append("no_question_heading")

    text = soup.get_text(" ", strip=True)
    words = text.split()
    intro = " ".join(words[:100])
    if not _NUMBER_RE.search(intro):
        failures.append("no_number_in_intro")
    details["intro_word_count"] = min(100, len(words))

    has_table = bool(soup.find("table"))
    has_long_list = False
    for ul in soup.find_all(["ul", "ol"]):
        if len(ul.find_all("li")) >= 4:
            has_long_list = True
            break
    if not (has_table or has_long_list):
        failures.append("no_table_or_long_list")

    main_entity = (faq_jsonld or {}).get("mainEntity", [])
    if not isinstance(main_entity, list) or len(main_entity) < 3:
        failures.append("faq_too_short")
    details["faq_count"] = len(main_entity) if isinstance(main_entity, list) else 0

    return AEOFailure(passed=len(failures) == 0, failures=failures, details=details)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
ssh root@89.167.115.63 'cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && pytest tests/test_aeo_check.py -v'
```

Expected: 5 PASSED.

- [ ] **Step 5: Commit**

```bash
cd /local/repo/cretepulse-build
mkdir -p lib tests
cp /local/path/aeo_check.py lib/
cp /local/path/test_aeo_check.py tests/
touch lib/__init__.py tests/__init__.py
git add lib/__init__.py lib/aeo_check.py tests/__init__.py tests/test_aeo_check.py
git commit -m "feat(content): AEO compliance check (H1/H2 question, number in intro, table, FAQ ≥3)"
```

---

### Task 7: Refactor `writer-l1.py` → `writer.py` paramétrable

**Files:**
- Create: `/opt/cretepulse-content/writer.py`
- Modify: backup `writer-l1.py` → `writer-l1.py.bak-2026-06-02`

- [ ] **Step 1: Lire writer-l1.py en entier pour identifier les sections à refactor**

Run:
```bash
ssh root@89.167.115.63 'cat /opt/cretepulse-content/writer-l1.py' > /tmp/writer-l1-original.py
wc -l /tmp/writer-l1-original.py
```

Expected: ~700-900 lignes. Identifier les sections : argparse, DB pop, prompt construction, claude call, anti-hallu, insert.

- [ ] **Step 2: Créer test routing format**

```python
# /opt/cretepulse-content/tests/test_writer_format_routing.py
import pytest
from writer import FORMAT_CONFIG, get_format_config

def test_pillar_routes_to_opus():
    cfg = get_format_config("pillar")
    assert cfg["model"] == "opus"
    assert cfg["min_words"] == 2000
    assert cfg["max_words"] == 3000
    assert cfg["prompt_path"].endswith("writer-pillar.md")

def test_mid_routes_to_sonnet():
    cfg = get_format_config("mid")
    assert cfg["model"] == "sonnet"
    assert cfg["min_words"] == 1000
    assert cfg["max_words"] == 1500

def test_short_routes_to_haiku():
    cfg = get_format_config("short")
    assert cfg["model"] == "haiku"
    assert cfg["min_words"] == 500
    assert cfg["max_words"] == 800

def test_unknown_format_raises():
    with pytest.raises(ValueError, match="unknown format"):
        get_format_config("xxl")
```

- [ ] **Step 3: Run test (should fail, writer.py not yet created)**

```bash
ssh root@89.167.115.63 'cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && pytest tests/test_writer_format_routing.py -v'
```

Expected: 4 FAILED `ModuleNotFoundError`.

- [ ] **Step 4: Copier writer-l1.py → writer.py et adapter**

Le refactor du writer.py se fait en gardant 90% du code de writer-l1.py et en ajoutant/modifiant :

```python
# /opt/cretepulse-content/writer.py
"""
CretePulse — Writer paramétrable
Pops 1 topic from guides_queue matching --format, generates EN+FR with the
right Claude model and prompt template, runs AEO check, hero image, inserts
as draft, triggers translator-batch.
Usage:
  python3 writer.py --format=<pillar|mid|short> [--slug override] [--dry-run]
"""

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
import requests
from dotenv import load_dotenv

load_dotenv("/opt/cretepulse-db/.env")
load_dotenv("/opt/cretepulse/.env")
load_dotenv("/opt/kairos-blog/.env")
sys.path.insert(0, "/opt/cretepulse")
sys.path.insert(0, "/opt/cretepulse-content")

from lib.aeo_check import check_aeo_compliance

STOP_FILE = "/opt/cretepulse-content/.STOP"
LOG_DIR = "/var/log/cretepulse-content"
PROMPTS_DIR = "/opt/cretepulse-content/prompts"
os.makedirs(LOG_DIR, exist_ok=True)

CLAUDE_WRAPPER = "/opt/cretepulse-content/bin/claude-capped.sh"
TRANSLATOR_SCRIPT = "/opt/cretepulse-content/translator-batch.py"
INDEXNOW_SCRIPT = "/opt/cretepulse-content/indexnow.py"

DB_PARAMS = {
    "host": "localhost",
    "port": 5433,
    "dbname": "cretepulse",
    "user": "postgres",
    "password": os.environ.get("POSTGRES_PASSWORD", ""),
}

FORMAT_CONFIG = {
    "pillar": {
        "model": "opus",
        "min_words": 2000,
        "max_words": 3000,
        "prompt_path": f"{PROMPTS_DIR}/writer-pillar.md",
        "include_related_articles": True,
        "include_data_hints": True,
    },
    "mid": {
        "model": "sonnet",
        "min_words": 1000,
        "max_words": 1500,
        "prompt_path": f"{PROMPTS_DIR}/writer-mid.md",
        "include_related_articles": True,
        "include_data_hints": False,
    },
    "short": {
        "model": "haiku",
        "min_words": 500,
        "max_words": 800,
        "prompt_path": f"{PROMPTS_DIR}/writer-short.md",
        "include_related_articles": False,
        "include_data_hints": False,
    },
}


def get_format_config(format_name: str) -> dict:
    if format_name not in FORMAT_CONFIG:
        raise ValueError(f"unknown format: {format_name}")
    return FORMAT_CONFIG[format_name]


def log(msg):
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    line = f"{ts} [writer] {msg}"
    print(line)
    with open(f"{LOG_DIR}/writer.log", "a") as f:
        f.write(line + "\n")


def pop_queue_item(conn, format_name: str, slug_override: str = None):
    """Pop the highest-priority pending item matching format (or specific slug)."""
    with conn.cursor() as cur:
        if slug_override:
            cur.execute(
                "SELECT id, slug, title, source_meta FROM guides_queue "
                "WHERE slug = %s AND status = 'pending' LIMIT 1 FOR UPDATE SKIP LOCKED",
                (slug_override,),
            )
        else:
            cur.execute(
                "SELECT id, slug, title, source_meta FROM guides_queue "
                "WHERE status = 'pending' AND format = %s "
                "ORDER BY priority DESC, created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED",
                (format_name,),
            )
        row = cur.fetchone()
        if not row:
            return None
        item = {
            "id": row[0],
            "slug": row[1],
            "title": row[2],
            "source_meta": row[3] or {},
        }
        cur.execute(
            "UPDATE guides_queue SET status = 'processing' WHERE id = %s",
            (item["id"],),
        )
    conn.commit()
    return item


def fetch_related_articles(conn, limit: int = 20) -> list:
    """Last 20 published guides for internal linking suggestions."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT slug, titles->>'en' AS title_en FROM guides "
            "WHERE format != 'daily' AND format != 'news' "
            "ORDER BY published_at DESC NULLS LAST LIMIT %s",
            (limit,),
        )
        return [{"slug": r[0], "title": r[1]} for r in cur.fetchall()]


def load_prompt_template(prompt_path: str) -> str:
    return Path(prompt_path).read_text(encoding="utf-8")


def call_claude(model: str, prompt: str, max_attempts: int = 2, retry_delay: int = 30, slug: str = "") -> dict:
    """Send prompt to claude-capped wrapper, return parsed JSON."""
    with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False, encoding="utf-8") as tmp:
        tmp.write(prompt)
        tmp_path = tmp.name
    try:
        cmd = f'cat "{tmp_path}" | {CLAUDE_WRAPPER} -p --model {model} --output-format json'
        for attempt in range(1, max_attempts + 1):
            try:
                result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=900)
            except subprocess.TimeoutExpired:
                log(f"Attempt {attempt} TIMEOUT 900s on claude {model}")
                if attempt < max_attempts:
                    time.sleep(retry_delay)
                    continue
                raise
            if result.returncode != 0:
                log(f"Attempt {attempt} claude returncode={result.returncode} stderr={result.stderr[:200]}")
                if attempt < max_attempts:
                    time.sleep(retry_delay)
                    continue
                raise RuntimeError(f"claude failed: {result.stderr[:500]}")
            try:
                envelope = json.loads(result.stdout)
                payload_text = envelope.get("result", envelope.get("content", result.stdout))
                if isinstance(payload_text, str):
                    payload_text = payload_text.strip()
                    if payload_text.startswith("```"):
                        payload_text = re.sub(r"^```(?:json)?\n", "", payload_text)
                        payload_text = re.sub(r"\n```$", "", payload_text)
                    return json.loads(payload_text)
                return payload_text
            except json.JSONDecodeError as e:
                log(f"Attempt {attempt} JSON parse failed: {e}")
                if attempt < max_attempts:
                    time.sleep(retry_delay)
                    continue
                raise
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


def word_count(text: str) -> int:
    return len(re.findall(r"\b\w+\b", text or ""))


def insert_guide(conn, queue_item: dict, format_name: str, payload: dict) -> int:
    """Insert into guides table as draft. Returns guide_id."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO guides (slug, format, category, titles, meta_descs, contents,
                                target_query, format_tier, source_meta, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'draft')
            RETURNING id
            """,
            (
                queue_item["slug"],
                "long" if format_name == "pillar" else format_name,
                queue_item.get("source_meta", {}).get("category", "travel"),
                json.dumps({"en": payload["title_en"], "fr": payload["title_fr"]}),
                json.dumps({"en": payload["meta_desc_en"], "fr": payload["meta_desc_fr"]}),
                json.dumps({"en": payload["content_en"], "fr": payload["content_fr"]}),
                queue_item.get("source_meta", {}).get("target_query"),
                format_name,
                json.dumps({
                    **(queue_item.get("source_meta") or {}),
                    "model_used": FORMAT_CONFIG[format_name]["model"],
                    "writer_version": "v2-2026-06-02",
                    "faq_jsonld": payload.get("faq_jsonld"),
                    "confidence": payload.get("confidence"),
                }),
            ),
        )
        guide_id = cur.fetchone()[0]
        cur.execute(
            "UPDATE guides_queue SET status = 'processed' WHERE id = %s",
            (queue_item["id"],),
        )
    conn.commit()
    return guide_id


def mark_queue_error(conn, queue_item_id: int, error_msg: str):
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE guides_queue SET status = 'error', source_meta = source_meta || %s::jsonb WHERE id = %s",
            (json.dumps({"last_error": error_msg, "errored_at": datetime.now(timezone.utc).isoformat()}), queue_item_id),
        )
    conn.commit()


def trigger_translator(guide_id: int):
    subprocess.Popen(["python3", TRANSLATOR_SCRIPT, "--guide-id", str(guide_id)],
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def trigger_indexnow(slug: str):
    subprocess.Popen(["python3", INDEXNOW_SCRIPT, "--single-slug", slug],
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--format", required=True, choices=["pillar", "mid", "short"])
    parser.add_argument("--slug", help="Override slug to process specific queue item")
    parser.add_argument("--dry-run", action="store_true", help="Build prompt without calling Claude or inserting")
    args = parser.parse_args()

    if os.path.exists(STOP_FILE):
        log(f"STOP file present, exiting cleanly")
        sys.exit(98)

    cfg = get_format_config(args.format)
    log(f"=== writer.py START format={args.format} model={cfg['model']} ===")

    conn = psycopg2.connect(**DB_PARAMS)
    try:
        item = pop_queue_item(conn, args.format, slug_override=args.slug)
        if not item:
            log(f"No pending items in guides_queue for format={args.format} — nothing to do.")
            return

        log(f"Processing slug={item['slug']} title={item['title'][:60]}")

        related = []
        if cfg["include_related_articles"]:
            related = fetch_related_articles(conn, limit=20)

        template = load_prompt_template(cfg["prompt_path"])
        prompt = template.format(
            target_query=(item.get("source_meta") or {}).get("target_query", item["title"]),
            title=item["title"],
            slug=item["slug"],
            existing_articles=json.dumps(related) if related else "[]",
            data_hints=json.dumps((item.get("source_meta") or {}).get("data_hints", {})) if cfg["include_data_hints"] else "{}",
        )

        if args.dry_run:
            log(f"DRY-RUN prompt length={len(prompt)} chars, first 500: {prompt[:500]}")
            log(f"DRY-RUN: would call claude {cfg['model']} ; rolling back queue status")
            conn.rollback()
            with conn.cursor() as cur:
                cur.execute("UPDATE guides_queue SET status='pending' WHERE id=%s", (item["id"],))
            conn.commit()
            return

        payload = call_claude(cfg["model"], prompt, slug=item["slug"])

        wc_en = word_count(payload.get("content_en", ""))
        if wc_en < int(0.80 * cfg["min_words"]):
            err = f"content_en word count {wc_en} < 80% of {cfg['min_words']}"
            log(f"REJECT length: {err}")
            mark_queue_error(conn, item["id"], err)
            sys.exit(1)

        aeo = check_aeo_compliance(payload.get("content_en", ""), payload.get("faq_jsonld", {}))
        if not aeo.passed:
            err = f"AEO check failed: {aeo.failures}"
            log(f"REJECT AEO: {err}")
            mark_queue_error(conn, item["id"], err)
            sys.exit(1)

        guide_id = insert_guide(conn, item, args.format, payload)
        log(f"INSERTED guide_id={guide_id} slug={item['slug']} format={args.format} wc_en={wc_en}")

        trigger_translator(guide_id)
        trigger_indexnow(item["slug"])
        log(f"=== writer.py END ===")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
```

- [ ] **Step 5: Backup writer-l1.py et déployer writer.py**

```bash
ssh root@89.167.115.63 'cp /opt/cretepulse-content/writer-l1.py /opt/cretepulse-content/writer-l1.py.bak-2026-06-02'
scp /local/path/writer.py root@89.167.115.63:/opt/cretepulse-content/
ssh root@89.167.115.63 'chmod +x /opt/cretepulse-content/writer.py'
```

- [ ] **Step 6: Run test (should pass)**

```bash
ssh root@89.167.115.63 'cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && pytest tests/test_writer_format_routing.py -v'
```

Expected: 4 PASSED.

- [ ] **Step 7: Commit**

```bash
cd /local/repo/cretepulse-build
cp /local/path/writer.py vps-scripts/ 2>/dev/null || mkdir -p vps-scripts && cp /local/path/writer.py vps-scripts/
cp /local/path/test_writer_format_routing.py tests/
git add vps-scripts/writer.py tests/test_writer_format_routing.py
git commit -m "feat(content): writer.py parametrable --format=pillar|mid|short (refactor writer-l1)"
```

---

### Task 8: Smoke test `writer.py --format=short --dry-run`

**Files:** N/A (test exécution)

- [ ] **Step 1: Dry-run sur 1 seed short**

```bash
ssh root@89.167.115.63 'cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && python3 writer.py --format=short --slug=tap-water-crete-can-you-drink --dry-run'
```

Expected: log "DRY-RUN prompt length=..." + queue status revient à pending.

- [ ] **Step 2: Vérifier que le seed est toujours pending**

```bash
curl -s "https://kairos-n8n.duckdns.org/cretepulse-db/rest/v1/guides_queue?slug=eq.tap-water-crete-can-you-drink&select=slug,status,format" -H "Accept: application/json"
```

Expected: `status: "pending"`.

- [ ] **Step 3: Réel sur 1 seed short (smoke test full pipeline)**

```bash
ssh root@89.167.115.63 'cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && python3 writer.py --format=short --slug=tap-water-crete-can-you-drink' 2>&1 | tail -20
```

Expected: log "INSERTED guide_id=... slug=tap-water-crete-can-you-drink format=short" + translator + indexnow déclenchés.

- [ ] **Step 4: Vérifier l'insertion**

```bash
curl -s "https://kairos-n8n.duckdns.org/cretepulse-db/rest/v1/guides?slug=eq.tap-water-crete-can-you-drink&select=id,slug,format,target_query,format_tier,status" -H "Accept: application/json"
```

Expected: 1 ligne, `format: "short"`, `format_tier: "short"`, `target_query: "can you drink tap water in crete"`, `status: "draft"`.

- [ ] **Step 5: Vérifier que la page se rend en local prod (test 200)**

Attendre 1-2 min puis :
```bash
curl -sI "https://crete.direct/articles/tap-water-crete-can-you-drink" | head -1
```

Expected: `HTTP/2 200` (ou `200 OK`). Si 404, vérifier que la page passe `status='draft'` dans les filtres Next.js (sinon attendre que Kami publish).

---

## Phase C — Airbnb élargissement

### Task 9: Ajouter 5 nouveaux angles à `airbnb-articles.py` + bump cooldown

**Files:**
- Modify: `/opt/cretepulse-content/airbnb-articles.py` (insertion dans constante `ANGLES`, ligne ~94)
- Backup: `airbnb-articles.py.bak-2026-06-02-pre-expansion`

- [ ] **Step 1: Backup**

```bash
ssh root@89.167.115.63 'cp /opt/cretepulse-content/airbnb-articles.py /opt/cretepulse-content/airbnb-articles.py.bak-2026-06-02-pre-expansion'
```

- [ ] **Step 2: Vérifier les tables data disponibles pour les nouveaux angles**

```bash
ssh root@89.167.115.63 "PGPASSWORD=\$(grep POSTGRES_PASSWORD /opt/cretepulse-db/.env | cut -d= -f2) psql -h 127.0.0.1 -p 5433 -U postgres -d cretepulse -c \"\\dt airbnb_*\""
```

Inspecter les colonnes utiles :
```bash
ssh root@89.167.115.63 "PGPASSWORD=\$(grep POSTGRES_PASSWORD /opt/cretepulse-db/.env | cut -d= -f2) psql -h 127.0.0.1 -p 5433 -U postgres -d cretepulse -c \"\\d airbnb_listings\""
```

Si `ama_license_pct`, `host_id`, `rating`, `annual_revenue` présents → angles 2, 3, 4 OK. Si pas de snapshot 2024 → angle 1 reporté. Si pas de données calendrier nuitées → angle 5 reporté.

**Document les angles retenus dans une note** (à ajouter dans `airbnb-articles.py` commentaire) :

```python
# Angles ajoutés 02/06/2026 selon disponibilité data (vérifié au déploiement) :
#   2 ama-license-coverage-by-region : OK si ama_license_pct présent
#   3 multi-host-concentration : OK si host_id présent
#   4 rating-revenue-correlation : OK si rating + annual_revenue présents
#   1 seasonality-2024-vs-2025 : reporté si snapshot 2024 absent
#   5 weekend-vs-weekday-pricing : reporté si pas de data calendrier
```

- [ ] **Step 3: Insérer les nouveaux angles dans la constante ANGLES**

Editer `/opt/cretepulse-content/airbnb-articles.py`, insérer après le dernier angle existant (`property-types-breakdown`, ~ligne 230) :

```python
    # ---- Angles ajoutés 2026-06-02 ----
    {
        "id": "ama-license-coverage-by-region",
        "category": "regulation",
        "min_days_between": 60,
        "sql": """
            SELECT neighbourhood, neighbourhood_label,
                   COUNT(*) AS listings,
                   ROUND(AVG(ama_license_pct)::numeric, 1) AS ama_coverage_pct,
                   ROUND(AVG(avg_price)::numeric, 0) AS avg_price,
                   ROUND(AVG(annual_revenue)::numeric, 0) AS avg_annual_revenue
            FROM airbnb_listings
            WHERE neighbourhood IS NOT NULL AND ama_license_pct IS NOT NULL
            GROUP BY neighbourhood, neighbourhood_label
            HAVING COUNT(*) >= 100
            ORDER BY ama_coverage_pct DESC
            LIMIT 12;
        """,
        "angle_brief": (
            "Compare AMA short-rental license coverage across Crete neighbourhoods. "
            "Where do most Airbnb hosts hold proper licenses, where is grey-zone strongest? "
            "What does this mean for travelers (cleaner stay?) and buyers (compliance risk)?"
        ),
        "default_title": "AMA License Coverage Across Crete Airbnb Neighbourhoods",
    },
    {
        "id": "multi-host-concentration",
        "category": "market-structure",
        "min_days_between": 60,
        "sql": """
            WITH host_stats AS (
              SELECT host_id, COUNT(*) AS portfolio_size, SUM(annual_revenue) AS total_rev
              FROM airbnb_listings
              WHERE host_id IS NOT NULL
              GROUP BY host_id
            )
            SELECT
              CASE
                WHEN portfolio_size = 1 THEN 'Solo (1)'
                WHEN portfolio_size = 2 THEN 'Pair (2)'
                WHEN portfolio_size BETWEEN 3 AND 5 THEN 'Small pro (3-5)'
                WHEN portfolio_size BETWEEN 6 AND 20 THEN 'Pro (6-20)'
                ELSE 'Mega (20+)'
              END AS host_tier,
              COUNT(*) AS host_count,
              SUM(portfolio_size) AS listings_total,
              ROUND(AVG(total_rev)::numeric, 0) AS avg_revenue_per_host
            FROM host_stats
            GROUP BY host_tier
            ORDER BY listings_total DESC;
        """,
        "angle_brief": (
            "Decompose Crete's Airbnb host market by portfolio size tier (solo / pair / small pro / "
            "pro / mega). Where does the revenue concentrate? Is the island still amateur-driven or "
            "captured by a small number of pros? Implications for travelers (consistent service?) "
            "and buyers (entry barriers)."
        ),
        "default_title": "Crete Airbnb: Solo Hosts vs Mega-Operators in 2026",
    },
    {
        "id": "rating-revenue-correlation",
        "category": "data-deep-dive",
        "min_days_between": 60,
        "sql": """
            SELECT
              ROUND(rating::numeric, 1) AS rating_bin,
              COUNT(*) AS listings,
              ROUND(AVG(annual_revenue)::numeric, 0) AS avg_revenue,
              ROUND(AVG(avg_price)::numeric, 0) AS avg_price,
              ROUND(AVG(avg_occupancy_days)::numeric, 0) AS avg_occupancy_days
            FROM airbnb_listings
            WHERE rating IS NOT NULL AND annual_revenue IS NOT NULL
              AND rating >= 4.0
            GROUP BY rating_bin
            ORDER BY rating_bin DESC;
        """,
        "angle_brief": (
            "Does higher Airbnb rating in Crete translate into higher revenue? Bucket listings by "
            "rating (4.0 / 4.1 / ... / 5.0) and compute average revenue, price, occupancy per bin. "
            "Identify outliers: high-revenue low-rating (price-driven) and high-rating low-revenue "
            "(under-monetized hidden gems)."
        ),
        "default_title": "Crete Airbnb: Does a Better Rating Actually Earn More?",
    },
    # Angle 1 (seasonality-2024-vs-2025) et angle 5 (weekend-vs-weekday) ajoutés ici
    # si les données sont disponibles au moment du déploiement (voir Step 2).
```

- [ ] **Step 4: Bumper le cooldown par défaut**

Chercher dans le script la constante `MIN_DAYS_BETWEEN` (autour ligne 90 d'après le `grep` précédent) ou les `min_days_between` par angle. Modifier chaque angle existant pour avoir `"min_days_between": 60` au lieu de 30 (si valeur explicite). Si la valeur est globale, modifier la globale.

- [ ] **Step 5: Vérification syntaxe Python**

```bash
ssh root@89.167.115.63 'cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && python3 -c "import ast; ast.parse(open(\"airbnb-articles.py\").read()); print(\"OK\")"'
```

Expected: `OK`.

- [ ] **Step 6: List angles**

```bash
ssh root@89.167.115.63 'cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && python3 airbnb-articles.py --list'
```

Expected: 10 angles listés (5 originaux + 3-5 nouveaux selon Step 2).

- [ ] **Step 7: Commit**

```bash
cd /local/repo/cretepulse-build
cp /local/path/airbnb-articles.py vps-scripts/
git add vps-scripts/airbnb-articles.py
git commit -m "feat(content): airbnb-articles +3 new angles (ama-coverage, multi-host, rating-revenue) + cooldown 60d"
```

---

### Task 10: Smoke test 1 nouvel angle airbnb-articles

**Files:** N/A

- [ ] **Step 1: Dry-run angle `ama-license-coverage-by-region`**

```bash
ssh root@89.167.115.63 'cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && python3 airbnb-articles.py --angle=ama-license-coverage-by-region --dry-run'
```

Expected: dataset affiché, prompt construit, pas d'appel Claude, pas d'insert.

- [ ] **Step 2: Run réel sur cet angle**

```bash
ssh root@89.167.115.63 'cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && python3 airbnb-articles.py --angle=ama-license-coverage-by-region' 2>&1 | tail -10
```

Expected: log "inserted draft guide_id=..."

- [ ] **Step 3: Vérifier l'article inséré**

```bash
curl -s "https://kairos-n8n.duckdns.org/cretepulse-db/rest/v1/guides?category=eq.regulation&select=id,slug,format,published_at&order=created_at.desc&limit=1" -H "Accept: application/json"
```

---

## Phase D — Setup GSC service account (action Kami)

### Task 11: Kami setup GSC + Claude pose le JSON

**Files:**
- Create on VPS: `/opt/cretepulse-content/gsc-service-account.json` (chmod 600)

- [ ] **Step 1: Kami exécute la procédure §7 du spec**

7 étapes documentées dans le spec, durée ~15 min :
1. https://console.cloud.google.com/projectcreate → projet `cretepulse-gsc-reader`
2. https://console.cloud.google.com/apis/library/searchconsole.googleapis.com → Enable
3. https://console.cloud.google.com/iam-admin/serviceaccounts → créer service account `cretepulse-gsc-reader`
4. Onglet "Keys" → "Add Key" → "Create new key" → JSON → Download
5. https://search.google.com/search-console/users?resource_id=sc-domain%3Acrete.direct → Add user → coller email service account → permission "Restricted"
6. Transmettre le JSON à Claude (via Drive privé ou paste base64)

- [ ] **Step 2: Claude pose le JSON sur VPS**

```bash
ssh root@89.167.115.63 'mkdir -p /opt/cretepulse-content'
# Selon méthode de transfert (cat > via SSH heredoc, ou scp depuis poste local)
scp /local/path/gsc-service-account.json root@89.167.115.63:/opt/cretepulse-content/
ssh root@89.167.115.63 'chmod 600 /opt/cretepulse-content/gsc-service-account.json && chown cretepulse:cretepulse /opt/cretepulse-content/gsc-service-account.json'
```

- [ ] **Step 3: Installer libs Google**

```bash
ssh root@89.167.115.63 'source /opt/cretepulse/venv/bin/activate && pip install google-auth google-api-python-client'
```

- [ ] **Step 4: Test access GSC API**

```bash
ssh root@89.167.115.63 'cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && python3 -c "
from google.oauth2 import service_account
from googleapiclient.discovery import build
creds = service_account.Credentials.from_service_account_file(
    \"/opt/cretepulse-content/gsc-service-account.json\",
    scopes=[\"https://www.googleapis.com/auth/webmasters.readonly\"])
sc = build(\"searchconsole\", \"v1\", credentials=creds)
r = sc.searchanalytics().query(siteUrl=\"sc-domain:crete.direct\",
    body={\"startDate\":\"2026-05-01\",\"endDate\":\"2026-05-31\",\"dimensions\":[\"query\"],\"rowLimit\":10}).execute()
print(\"Rows:\", len(r.get(\"rows\", [])))
for row in r.get(\"rows\", [])[:5]: print(row)
"'
```

Expected: `Rows: 10` puis 5 queries avec impressions/clicks/CTR/position.

Si erreur 403 → service account pas ajouté à GSC. Si erreur 401 → JSON mal-formé ou perms manquantes. Si 0 rows → propriété GSC vide (impossible vu baseline 1258 impressions/28j 14/05).

---

## Phase E — Discover refactor

### Task 12: Module `lib/gsc_client.py` avec tests

**Files:**
- Create: `/opt/cretepulse-content/lib/gsc_client.py`
- Create: `/opt/cretepulse-content/tests/test_gsc_client.py`

- [ ] **Step 1: Tests TDD (scoring + filtering, pas l'appel API)**

```python
# /opt/cretepulse-content/tests/test_gsc_client.py
import pytest
from lib.gsc_client import compute_score, classify_format, filter_candidates

def test_compute_score_higher_with_more_impressions():
    s_low = compute_score(impressions=50, position=10.0, ctr=0.01)
    s_high = compute_score(impressions=500, position=10.0, ctr=0.01)
    assert s_high > s_low

def test_compute_score_higher_with_lower_position():
    s_low_pos = compute_score(impressions=100, position=5.0, ctr=0.01)
    s_high_pos = compute_score(impressions=100, position=25.0, ctr=0.01)
    assert s_low_pos > s_high_pos

def test_classify_format_pillar_when_high_impressions_and_top_position():
    fmt = classify_format(impressions=80, position=8.0)
    assert fmt == "pillar"

def test_classify_format_mid_when_moderate():
    fmt = classify_format(impressions=30, position=15.0)
    assert fmt == "mid"

def test_classify_format_none_when_below_threshold():
    fmt = classify_format(impressions=5, position=15.0)
    assert fmt is None

def test_filter_candidates_excludes_existing_slugs():
    candidates = [
        {"query": "best beaches in crete", "impressions": 100, "position": 12.0, "ctr": 0.01},
        {"query": "crete in october worth visiting", "impressions": 50, "position": 8.0, "ctr": 0.02},
    ]
    existing_slugs = ["crete-october-november-worth-visiting"]
    out = filter_candidates(candidates, existing_slugs)
    assert len(out) == 1
    assert out[0]["query"] == "best beaches in crete"
```

- [ ] **Step 2: Run tests → 6 FAILED**

```bash
ssh root@89.167.115.63 'cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && pytest tests/test_gsc_client.py -v'
```

- [ ] **Step 3: Implémenter `lib/gsc_client.py`**

```python
# /opt/cretepulse-content/lib/gsc_client.py
"""GSC service account wrapper + striking distance scoring."""
import re
from typing import List, Dict, Optional
from google.oauth2 import service_account
from googleapiclient.discovery import build


GSC_CRED_PATH = "/opt/cretepulse-content/gsc-service-account.json"
GSC_SITE_URL = "sc-domain:crete.direct"
GSC_SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]


def get_client():
    creds = service_account.Credentials.from_service_account_file(GSC_CRED_PATH, scopes=GSC_SCOPES)
    return build("searchconsole", "v1", credentials=creds, cache_discovery=False)


def fetch_striking_distance(days: int = 28, row_limit: int = 500) -> List[Dict]:
    from datetime import date, timedelta
    end = date.today()
    start = end - timedelta(days=days)
    sc = get_client()
    resp = sc.searchanalytics().query(
        siteUrl=GSC_SITE_URL,
        body={
            "startDate": start.isoformat(),
            "endDate": end.isoformat(),
            "dimensions": ["query"],
            "rowLimit": row_limit,
        },
    ).execute()
    rows = resp.get("rows", [])
    out = []
    for r in rows:
        q = r["keys"][0]
        out.append({
            "query": q,
            "impressions": int(r.get("impressions", 0)),
            "clicks": int(r.get("clicks", 0)),
            "ctr": float(r.get("ctr", 0.0)),
            "position": float(r.get("position", 99.0)),
        })
    return out


def compute_score(impressions: int, position: float, ctr: float) -> float:
    """Score = impressions × (1/position) × ctr_potential. Higher = more priority."""
    ctr_potential = max(0.0, 0.30 - ctr)
    return impressions * (1.0 / max(position, 1.0)) * (ctr_potential + 0.01)


def classify_format(impressions: int, position: float) -> Optional[str]:
    """Map (impressions, position) to format tier or None (below threshold)."""
    if impressions >= 50 and 5.0 <= position <= 15.0:
        return "pillar"
    if impressions >= 20 and 8.0 <= position <= 30.0:
        return "mid"
    return None


def _slug_fuzzy_match(query: str, slug: str) -> bool:
    """Loose match: query tokens covered ≥70% by slug tokens."""
    q_tokens = set(re.findall(r"[a-z0-9]+", query.lower()))
    s_tokens = set(re.findall(r"[a-z0-9]+", slug.lower()))
    if not q_tokens:
        return False
    overlap = len(q_tokens & s_tokens)
    return (overlap / len(q_tokens)) >= 0.70


def filter_candidates(candidates: List[Dict], existing_slugs: List[str]) -> List[Dict]:
    return [c for c in candidates if not any(_slug_fuzzy_match(c["query"], s) for s in existing_slugs)]
```

- [ ] **Step 4: Run tests → 6 PASSED**

```bash
ssh root@89.167.115.63 'cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && pytest tests/test_gsc_client.py -v'
```

- [ ] **Step 5: Commit**

```bash
cd /local/repo/cretepulse-build
cp /local/path/gsc_client.py lib/
cp /local/path/test_gsc_client.py tests/
git add lib/gsc_client.py tests/test_gsc_client.py
git commit -m "feat(content): GSC client with striking-distance scoring and format classification"
```

---

### Task 13: Module `lib/paa_scraper.py` avec tests

**Files:**
- Create: `/opt/cretepulse-content/lib/paa_scraper.py`
- Create: `/opt/cretepulse-content/tests/test_paa_scraper.py`
- Create: `/opt/cretepulse-content/tests/fixtures/google_serp_sample.html`

- [ ] **Step 1: Fixture HTML SERP**

Sauvegarder un sample HTML d'une page Google SERP avec PAA dans `tests/fixtures/google_serp_sample.html`. Format minimal :

```html
<html><body>
<div jsname="Cpkphb"><div class="related-question-pair"><span>What is the best time to visit Crete?</span></div></div>
<div jsname="Cpkphb"><div class="related-question-pair"><span>How many days do you need in Crete?</span></div></div>
<div jsname="Cpkphb"><div class="related-question-pair"><span>Is Crete expensive for tourists?</span></div></div>
</body></html>
```

- [ ] **Step 2: Tests TDD**

```python
# /opt/cretepulse-content/tests/test_paa_scraper.py
from pathlib import Path
from lib.paa_scraper import extract_paa_questions, fetch_autocomplete

def test_extract_paa_questions_from_fixture():
    html = (Path(__file__).parent / "fixtures" / "google_serp_sample.html").read_text(encoding="utf-8")
    questions = extract_paa_questions(html)
    assert len(questions) >= 3
    assert any("best time to visit" in q.lower() for q in questions)

def test_extract_paa_questions_empty_html():
    assert extract_paa_questions("<html></html>") == []

def test_fetch_autocomplete_returns_list(monkeypatch):
    import lib.paa_scraper as paa
    monkeypatch.setattr(paa, "_http_get_json", lambda url, headers: ["seed", ["seed query 1", "seed query 2", "seed query 3"]])
    out = fetch_autocomplete("seed")
    assert out == ["seed query 1", "seed query 2", "seed query 3"]
```

- [ ] **Step 3: Run tests → 3 FAILED**

- [ ] **Step 4: Implémenter `lib/paa_scraper.py`**

```python
# /opt/cretepulse-content/lib/paa_scraper.py
"""Google PAA + autocomplete scraping with realistic UA + delays."""
import json
import time
import random
from typing import List
import requests
from bs4 import BeautifulSoup


USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def _http_get_text(url: str, headers: dict = None) -> str:
    h = HEADERS.copy()
    if headers:
        h.update(headers)
    resp = requests.get(url, headers=h, timeout=15)
    resp.raise_for_status()
    return resp.text


def _http_get_json(url: str, headers: dict = None):
    text = _http_get_text(url, headers)
    return json.loads(text)


def extract_paa_questions(html: str) -> List[str]:
    soup = BeautifulSoup(html, "html.parser")
    questions = []
    for el in soup.find_all(attrs={"jsname": "Cpkphb"}):
        text = el.get_text(" ", strip=True)
        if "?" in text and 10 < len(text) < 200:
            questions.append(text)
    for el in soup.select(".related-question-pair, div[data-q]"):
        text = el.get_text(" ", strip=True)
        if "?" in text and 10 < len(text) < 200:
            questions.append(text)
    seen = set()
    out = []
    for q in questions:
        nq = q.strip().rstrip("?") + "?"
        if nq.lower() not in seen:
            seen.add(nq.lower())
            out.append(nq)
    return out


def fetch_paa_for_query(query: str, delay_seconds: float = 5.0) -> List[str]:
    url = f"https://www.google.com/search?q={requests.utils.quote(query)}&hl=en&gl=us"
    try:
        html = _http_get_text(url)
        time.sleep(delay_seconds + random.uniform(-1.5, 1.5))
        return extract_paa_questions(html)
    except Exception as e:
        return []


def fetch_autocomplete(query: str) -> List[str]:
    url = f"https://suggestqueries.google.com/complete/search?client=firefox&q={requests.utils.quote(query)}"
    try:
        data = _http_get_json(url, headers={"Accept": "application/json"})
        if isinstance(data, list) and len(data) >= 2 and isinstance(data[1], list):
            return data[1]
        return []
    except Exception:
        return []
```

- [ ] **Step 5: Run tests → 3 PASSED**

- [ ] **Step 6: Commit**

```bash
cd /local/repo/cretepulse-build
cp /local/path/paa_scraper.py lib/
cp /local/path/test_paa_scraper.py tests/
mkdir -p tests/fixtures
cp /local/path/google_serp_sample.html tests/fixtures/
git add lib/paa_scraper.py tests/test_paa_scraper.py tests/fixtures/google_serp_sample.html
git commit -m "feat(content): PAA + autocomplete scraper with realistic UA"
```

---

### Task 14: Refactor `discover.py` v2

**Files:**
- Backup `discover.py` → `discover.py.bak-2026-06-02`
- Create new `discover.py`

- [ ] **Step 1: Backup**

```bash
ssh root@89.167.115.63 'cp /opt/cretepulse-content/discover.py /opt/cretepulse-content/discover.py.bak-2026-06-02'
```

- [ ] **Step 2: Écrire le nouveau `discover.py`**

```python
#!/usr/bin/env python3
"""
CretePulse — Discover v2
Modes :
  --mode=gsc-rss : pull GSC striking distance + Reddit RSS + 5 RSS feeds, insert into guides_queue
  --mode=paa     : PAA expansion on articles published in last 7 days, insert short-format candidates
Cron:
  0 3 * * 0  discover.py --mode=gsc-rss
  0 4 * * 1  discover.py --mode=paa
"""

import argparse
import json
import os
import random
import re
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timezone, timedelta
from typing import List, Dict

import requests
import feedparser
import psycopg2
from dotenv import load_dotenv

load_dotenv("/opt/cretepulse-db/.env")
load_dotenv("/opt/cretepulse/.env")
sys.path.insert(0, "/opt/cretepulse-content")

from lib.gsc_client import fetch_striking_distance, compute_score, classify_format, filter_candidates
from lib.paa_scraper import fetch_paa_for_query, fetch_autocomplete

STOP_FILE = "/opt/cretepulse-content/.STOP"
LOG_DIR = "/var/log/cretepulse-content"
os.makedirs(LOG_DIR, exist_ok=True)

CLAUDE_WRAPPER = "/opt/cretepulse-content/bin/claude-capped.sh"

DB_PARAMS = {
    "host": "localhost",
    "port": 5433,
    "dbname": "cretepulse",
    "user": "postgres",
    "password": os.environ.get("POSTGRES_PASSWORD", ""),
}

REDDIT_RSS_FEEDS = [
    "https://www.reddit.com/r/Crete/.rss",
    "https://www.reddit.com/r/greece/search.rss?q=crete&sort=hot&restrict_sr=on",
    "https://www.reddit.com/r/travel/search.rss?q=crete&sort=hot&restrict_sr=on",
]
REDDIT_UA = "CreteDirect/1.0 (https://crete.direct; admin@crete.direct)"

RSS_FEEDS = [
    "https://www.cretetravel.com/feed/",
    "https://www.thetinybook.com/feed/",
    "https://greekreporter.com/tag/crete/feed/",
    "https://www.ekathimerini.com/feed/?post_type=post&category=news/greece",
    "https://explorecrete.com/feed/",
]


def log(msg):
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    line = f"{ts} [discover] {msg}"
    print(line)
    with open(f"{LOG_DIR}/discover.log", "a") as f:
        f.write(line + "\n")


def db_conn():
    return psycopg2.connect(**DB_PARAMS)


def get_existing_slugs(conn) -> List[str]:
    with conn.cursor() as cur:
        cur.execute("SELECT slug FROM guides")
        return [r[0] for r in cur.fetchall()] + (
            [r[0] for r in conn.cursor().execute("SELECT slug FROM guides_queue") or []]
        )


def get_existing_slugs_clean(conn) -> List[str]:
    with conn.cursor() as cur:
        cur.execute("SELECT slug FROM guides UNION SELECT slug FROM guides_queue")
        return [r[0] for r in cur.fetchall()]


def insert_candidate(conn, slug: str, title: str, fmt: str, priority: int, source: str, source_meta: dict):
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO guides_queue (slug, title, status, format, priority, source, source_meta) "
            "VALUES (%s, %s, 'pending', %s, %s, %s, %s) ON CONFLICT (slug) DO NOTHING",
            (slug, title, fmt, priority, source, json.dumps(source_meta)),
        )
    conn.commit()


def slugify(text: str) -> str:
    s = text.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:80]


def score_candidates_with_haiku(candidates: List[Dict]) -> List[Dict]:
    """Send candidates to Haiku in batch for intent/originality/AEO score 0-10."""
    if not candidates:
        return []
    prompt = "Score each query 0-10 on (commercial intent + originality + AEO-friendliness for a Crete tourism site). Return JSON array of {query, score}.\n\n"
    prompt += json.dumps([c["query"] for c in candidates], ensure_ascii=False, indent=2)
    with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False, encoding="utf-8") as tmp:
        tmp.write(prompt)
        tmp_path = tmp.name
    try:
        cmd = f'cat "{tmp_path}" | {CLAUDE_WRAPPER} -p --model haiku --output-format json'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            log(f"Haiku scoring failed: {result.stderr[:200]} — keeping candidates as-is")
            for c in candidates:
                c["haiku_score"] = 6
            return candidates
        envelope = json.loads(result.stdout)
        text = envelope.get("result", envelope.get("content", ""))
        if isinstance(text, str):
            text = text.strip().lstrip("`json").rstrip("`").strip()
            scores = json.loads(re.search(r"\[.*\]", text, re.DOTALL).group(0))
        else:
            scores = text
        score_by_query = {s["query"]: s.get("score", 6) for s in scores if isinstance(s, dict)}
        for c in candidates:
            c["haiku_score"] = score_by_query.get(c["query"], 6)
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
    return [c for c in candidates if c["haiku_score"] >= 6]


def mode_gsc_rss(conn):
    """GSC striking distance + Reddit RSS + RSS feeds."""
    log("=== mode=gsc-rss START ===")
    existing = get_existing_slugs_clean(conn)
    log(f"Existing slugs to exclude: {len(existing)}")

    inserted = 0

    # ---- GSC ----
    try:
        gsc_rows = fetch_striking_distance(days=28, row_limit=500)
        log(f"GSC returned {len(gsc_rows)} queries")
        candidates = filter_candidates(gsc_rows, existing)
        log(f"GSC after dedup: {len(candidates)}")
        for c in candidates:
            c["fmt"] = classify_format(c["impressions"], c["position"])
            c["score"] = compute_score(c["impressions"], c["position"], c["ctr"])
        candidates = [c for c in candidates if c["fmt"] is not None]
        candidates.sort(key=lambda c: c["score"], reverse=True)
        top = candidates[:30]
        scored = score_candidates_with_haiku([{"query": c["query"]} for c in top])
        keep_queries = {s["query"] for s in scored}
        for c in top:
            if c["query"] not in keep_queries:
                continue
            slug = slugify(c["query"])
            priority = 90 if c["fmt"] == "pillar" else 70
            insert_candidate(conn, slug, c["query"], c["fmt"], priority, "gsc", {
                "target_query": c["query"],
                "impressions": c["impressions"], "position": c["position"],
                "ctr": c["ctr"], "score": c["score"],
            })
            inserted += 1
        log(f"GSC inserted: {inserted}")
    except Exception as e:
        log(f"GSC source failed: {e}")

    # ---- Reddit RSS ----
    try:
        reddit_topics = []
        for url in REDDIT_RSS_FEEDS:
            feed = feedparser.parse(url, agent=REDDIT_UA)
            for entry in feed.entries[:20]:
                title = entry.get("title", "")
                if title and "crete" in title.lower():
                    reddit_topics.append({"query": title, "url": entry.get("link", "")})
            time.sleep(2)
        log(f"Reddit RSS collected: {len(reddit_topics)}")
        reddit_topics = [t for t in reddit_topics if not any(s in slugify(t["query"]) for s in existing)]
        scored_reddit = score_candidates_with_haiku(reddit_topics[:15])
        for t in scored_reddit:
            slug = slugify(t["query"])
            insert_candidate(conn, slug, t["query"], "mid", 60, "reddit", {"target_query": t["query"], "reddit_url": t.get("url", "")})
            inserted += 1
        log(f"Reddit inserted: {len(scored_reddit)}")
    except Exception as e:
        log(f"Reddit source failed: {e}")

    # ---- RSS feeds (existant) ----
    try:
        rss_items = []
        for url in RSS_FEEDS:
            feed = feedparser.parse(url)
            for entry in feed.entries[:5]:
                rss_items.append({"query": entry.get("title", ""), "url": entry.get("link", "")})
        log(f"RSS collected: {len(rss_items)}")
        rss_items = [t for t in rss_items if t["query"] and not any(slugify(t["query"]).startswith(s[:30]) for s in existing)]
        scored_rss = score_candidates_with_haiku(rss_items[:15])
        for t in scored_rss:
            slug = slugify(t["query"])
            insert_candidate(conn, slug, t["query"], "mid", 55, "rss", {"target_query": t["query"], "rss_url": t.get("url", "")})
            inserted += 1
        log(f"RSS inserted: {len(scored_rss)}")
    except Exception as e:
        log(f"RSS source failed: {e}")

    log(f"=== mode=gsc-rss END inserted={inserted} ===")


def mode_paa(conn):
    """PAA expansion on last 7d published articles."""
    log("=== mode=paa START ===")
    with conn.cursor() as cur:
        cur.execute(
            "SELECT slug, target_query, source_meta FROM guides "
            "WHERE published_at > NOW() - INTERVAL '7 days' "
            "AND format_tier IN ('pillar', 'mid') "
            "AND target_query IS NOT NULL "
            "ORDER BY published_at DESC LIMIT 20"
        )
        articles = cur.fetchall()
    log(f"Articles to PAA-expand: {len(articles)}")

    existing = get_existing_slugs_clean(conn)
    inserted = 0
    for slug, target_query, source_meta in articles:
        questions = fetch_paa_for_query(target_query, delay_seconds=5.0)
        autocomplete = fetch_autocomplete(target_query)
        candidates = []
        for q in questions[:6]:
            candidates.append({"query": q, "parent_slug": slug, "type": "paa"})
        for q in autocomplete[:4]:
            if "?" not in q:
                q = q.rstrip(".") + "?"
            candidates.append({"query": q, "parent_slug": slug, "type": "autocomplete"})
        candidates = [c for c in candidates if not any(slugify(c["query"]).startswith(s[:30]) for s in existing)]
        scored = score_candidates_with_haiku(candidates[:10])
        for c in scored:
            cslug = slugify(c["query"])
            insert_candidate(conn, cslug, c["query"], "short", 50, "paa", {
                "target_query": c["query"], "parent_article_slug": c["parent_slug"], "expansion_type": c["type"],
            })
            inserted += 1
            existing.append(cslug)
    log(f"=== mode=paa END inserted={inserted} ===")


def main():
    if os.path.exists(STOP_FILE):
        log("STOP file present, exiting")
        sys.exit(98)

    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["gsc-rss", "paa"], required=True)
    args = parser.parse_args()

    conn = db_conn()
    try:
        if args.mode == "gsc-rss":
            mode_gsc_rss(conn)
        elif args.mode == "paa":
            mode_paa(conn)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Vérification syntaxe + imports**

```bash
scp /local/path/discover.py root@89.167.115.63:/opt/cretepulse-content/discover.py
ssh root@89.167.115.63 'cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && python3 -c "import ast; ast.parse(open(\"discover.py\").read()); print(\"OK\")"'
```

- [ ] **Step 4: Dry-run mode=gsc-rss (sans changement DB grâce à transaction rollback temporaire — pas implementé donc faire en réel mais surveiller)**

Préparer un test "soft" : lancer en réel mais surveiller le log :
```bash
ssh root@89.167.115.63 'cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && python3 discover.py --mode=gsc-rss' 2>&1 | tail -30
```

Expected: log "GSC returned N queries", "GSC inserted: M", "Reddit RSS collected: K", etc. Pas d'erreur fatale.

- [ ] **Step 5: Vérifier que la queue s'est remplie**

```bash
curl -s "https://kairos-n8n.duckdns.org/cretepulse-db/rest/v1/guides_queue?status=eq.pending&select=count" -H "Accept: application/json" -H "Prefer: count=exact"
```

Expected: ≥ 15 (les 15 seeds + nouveaux candidats GSC/Reddit/RSS).

- [ ] **Step 6: Commit**

```bash
cd /local/repo/cretepulse-build
cp /local/path/discover.py vps-scripts/
git add vps-scripts/discover.py
git commit -m "feat(content): discover.py v2 — GSC + PAA + Reddit RSS + RSS"
```

---

## Phase F — Activation crons

### Task 15: Mettre à jour crontab user `cretepulse`

**Files:**
- Modify crontab via `crontab -u cretepulse -e` ou `crontab -u cretepulse < file`

- [ ] **Step 1: Backup crontab actuel**

```bash
ssh root@89.167.115.63 'crontab -u cretepulse -l > /tmp/cretepulse-crontab.bak-2026-06-02'
```

- [ ] **Step 2: Composer le nouveau crontab**

```bash
cat > /tmp/cretepulse-crontab-new.txt <<'EOF'
# CretePulse pipeline éditorial v2 — crete.direct
# Managed by Claude design 2026-06-02-crete-direct-editorial-pipeline-revival

# Discover : GSC + Reddit RSS + RSS (weekly Sunday 03:00 UTC)
0 3 * * 0 cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && python3 discover.py --mode=gsc-rss >> /var/log/cretepulse-content/discover.log 2>&1

# Discover : PAA expansion (weekly Monday 04:00 UTC)
0 4 * * 1 cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && python3 discover.py --mode=paa >> /var/log/cretepulse-content/discover.log 2>&1

# Writer pillar (2x/sem mercredi+vendredi 06:00 UTC, Opus)
0 6 * * 3,5 cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && python3 writer.py --format=pillar >> /var/log/cretepulse-content/writer.log 2>&1

# Writer mid (5x/sem lun-ven 12:00 UTC, Sonnet)
0 12 * * 1-5 cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && python3 writer.py --format=mid >> /var/log/cretepulse-content/writer.log 2>&1

# Writer short (7x/sem daily 18:00 UTC, Haiku)
0 18 * * * cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && python3 writer.py --format=short >> /var/log/cretepulse-content/writer.log 2>&1

# Weekly perf check (Monday 09:00 UTC) — INCHANGÉ
0 9 * * 1 cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && python3 bin/perf-check.py >> /var/log/cretepulse-content/perf.log 2>&1

# HCAA + Fraport monthly cron INCHANGÉS
0 6 5 * * cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && python3 hcaa-crete-airports.py >> /var/log/cretepulse-content/hcaa-crete.log 2>&1
0 7 7 * * cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && python3 fraport-chq-traffic.py >> /var/log/cretepulse-content/fraport-chq.log 2>&1
EOF
scp /tmp/cretepulse-crontab-new.txt root@89.167.115.63:/tmp/
```

- [ ] **Step 3: Activer le nouveau crontab**

```bash
ssh root@89.167.115.63 'crontab -u cretepulse /tmp/cretepulse-crontab-new.txt && crontab -u cretepulse -l'
```

Expected: les 8 lignes du nouveau crontab listées.

- [ ] **Step 4: Commit le crontab dans le repo**

```bash
cd /local/repo/cretepulse-build
mkdir -p ops/crons
cp /tmp/cretepulse-crontab-new.txt ops/crons/cretepulse-content.crontab
git add ops/crons/cretepulse-content.crontab
git commit -m "chore(ops): cretepulse crontab v2 (5 entries: 2 discover + 3 writer)"
```

---

### Task 16: Smoke test final — 3 formats en réel

**Files:** N/A

- [ ] **Step 1: writer.py --format=mid sur un seed mid**

```bash
ssh root@89.167.115.63 'cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && python3 writer.py --format=mid --slug=balos-vs-elafonisi-which-paradise-wins' 2>&1 | tail -20
```

Expected: INSERTED guide_id=... format=mid wc_en=≥800.

- [ ] **Step 2: writer.py --format=pillar sur un seed pillar**

```bash
ssh root@89.167.115.63 'cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && python3 writer.py --format=pillar --slug=where-to-stay-crete-12-zones-compared' 2>&1 | tail -20
```

Expected: INSERTED guide_id=... format=pillar wc_en=≥1800. Note: Opus peut prendre 5-10 min, ne pas couper.

- [ ] **Step 3: Vérifier les 3 articles en prod**

Attendre 2-3 min après chaque insertion pour ISR Next.js. Test :
```bash
for slug in tap-water-crete-can-you-drink balos-vs-elafonisi-which-paradise-wins where-to-stay-crete-12-zones-compared; do
  echo "--- $slug ---"
  curl -sI "https://crete.direct/articles/$slug" | head -1
done
```

Expected: 3× `HTTP/2 200`.

- [ ] **Step 4: Vérifier que le translator-batch a démarré pour les 3**

```bash
ssh root@89.167.115.63 'tail -30 /var/log/cretepulse-content/translator.log'
```

Expected: 3 traductions en cours pour les 3 guide_ids.

---

## Phase G — Monitoring J+7 (post-implem)

### Task 17: Pull GSC sur seeds publiés J+7 (mémoire J+7)

**Files:** N/A (mesure)

- [ ] **Step 1: J+7 (09/06/2026) — pull GSC positions pour les 15 seeds**

```bash
ssh root@89.167.115.63 'cd /opt/cretepulse-content && source /opt/cretepulse/venv/bin/activate && python3 -c "
from lib.gsc_client import fetch_striking_distance, get_client
sc = get_client()
queries = [\"can you drink tap water in crete\", \"is uber available in crete\", \"is knossos worth visiting\", \"where to stay in crete\"]
r = sc.searchanalytics().query(siteUrl=\"sc-domain:crete.direct\",
    body={\"startDate\":\"2026-06-02\",\"endDate\":\"2026-06-09\",\"dimensions\":[\"query\"],\"dimensionFilterGroups\":[{\"filters\":[{\"dimension\":\"query\",\"operator\":\"contains\",\"expression\":q}]}], \"rowLimit\":10}).execute() for q in queries
"'
```

(Vrai test : adapter syntaxe pour boucler proprement)

- [ ] **Step 2: Comparer baseline 14/05 (52 clics/28j) vs nouvelle mesure 28j incluant les 7-14 jours post-publication**

Document le résultat dans `clients-actions/crete-direct/2026-06-09-mesure-j7.md` :
- clics 28j courant
- impressions 28j
- positions sur les 15 seed queries
- Si volume > +30% → succès Phase 1
- Si volume stagne → ajuster seuils GSC ou prompts

- [ ] **Step 3: Commit mesure**

```bash
cd /local/repo/cretepulse-build
mkdir -p clients-actions/crete-direct
# Documenter le résultat dans un .md
git add clients-actions/crete-direct/2026-06-09-mesure-j7.md
git commit -m "docs(measure): J+7 GSC impact post pipeline editorial revival"
```

---

## Self-review (effectué par le rédacteur du plan)

**Spec coverage** :
- §1 contexte panne → Task 1-2 débloquent immédiatement
- §2 objectifs : auto-alimentation (Task 14), impact SEO max (Task 11+14), pyramide format (Task 6-7), AEO discipline (Task 6), zéro régression (crontab Task 15 garde news/perf/HCAA/Fraport)
- §3 archi → File Structure section + Tasks 1-17 implémentent tout
- §4.1 discover.py v2 (4 sources) → Task 14
- §4.2 writer.py paramétrable → Task 7
- §4.3 5 angles airbnb → Task 9 (avec caveat data dispo Step 2)
- §5 schéma DB → Task 1
- §6 scheduling → Task 15
- §7 setup GSC → Task 11
- §8 AEO discipline → Task 6 (module lib + check intégré writer)
- §9 15 seeds → Task 2
- §10 rollout J0/J+1/J+2/J+7/J+30 → Phases A, B, D, G
- §11 risques → mitigations dans tasks (timeout 900s call_claude, fallback 6 default score Haiku, etc.)
- §12 tests → Task 6 + 12 + 13 unit + Tasks 8/10/16 smoke E2E

**Placeholders scan** : aucun "TBD", "TODO" actif, "fill in details" — clean.

**Type consistency** : `get_format_config()` retourne dict avec keys cohérents (`model`, `min_words`, `max_words`, `prompt_path`, `include_related_articles`, `include_data_hints`) entre Task 6, Task 7 et Task 8. `compute_score()` signature `(impressions, position, ctr)` cohérent Task 12 + Task 14. `classify_format()` retourne `str|None` cohérent Task 12 + Task 14. `check_aeo_compliance()` retourne dataclass `AEOFailure(passed, failures, details)` cohérent Task 6 + Task 7.

**Ambiguïté résiduelle notée Step 2 Task 9** : 2 angles airbnb (`seasonality-2024-vs-2025`, `weekend-vs-weekday-pricing`) reportés si data absente. Décision data-dépendante au moment du déploiement, acceptable.

---

## Annexes

### A. Ordre d'exécution recommandé

**Aujourd'hui (J0)** : Tasks 1, 2 (déblocage queue + seeds insérés) → Tasks 3, 4, 5 (prompts) → Task 6 (AEO check + tests) → Task 7 (writer.py refactor) → Task 8 (smoke writer short).
**Si temps** : Task 9 + 10 (airbnb +3 angles).
**Demain (J+1)** : si Kami n'a pas fait setup GSC, juste activer crontab partiel (uniquement writer cron, pas discover GSC).
**J+2 ou J+3** : Task 11 (setup GSC Kami), Task 12 + 13 (lib GSC + PAA), Task 14 (discover refactor), Task 15 (crontab complet).
**J+7** : Task 17 (mesure GSC).

### B. Commandes d'urgence

**Stop pipeline** :
```bash
ssh root@89.167.115.63 'touch /opt/cretepulse-content/.STOP'
```

**Revert writer** :
```bash
ssh root@89.167.115.63 'cp /opt/cretepulse-content/writer-l1.py.bak-2026-06-02 /opt/cretepulse-content/writer-l1.py'
# Et restaurer ancien crontab
ssh root@89.167.115.63 'crontab -u cretepulse /tmp/cretepulse-crontab.bak-2026-06-02'
```

**Revert discover** :
```bash
ssh root@89.167.115.63 'cp /opt/cretepulse-content/discover.py.bak-2026-06-02 /opt/cretepulse-content/discover.py'
```

**Vider queue corrompue** :
```sql
UPDATE guides_queue SET status='abandoned' WHERE status='pending';
```
(Puis re-seeder via Task 2 SQL.)
