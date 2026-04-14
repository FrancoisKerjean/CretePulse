# CretePulse Content Enrichment - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer crete.direct d'une coquille de données en un vrai guide touristique avec un Palantir grec (monitoring actualité crétoise temps réel, filtrage pertinence, réécriture 4 langues) et du contenu riche sur plages/restos/randonnées.

**Architecture:** Scripts Python sur VPS (kairos-vps 89.167.115.63), connexion directe Postgres localhost:5433, génération contenu via `claude -p` (OAuth, 0 tokens). Code front Next.js dans le repo local cretepulse-build, déploiement Vercel auto.

**Tech Stack:** Python 3 + psycopg2, `claude -p` (Sonnet/Haiku), Postgres 17, Next.js 16, Supabase JS client (PostgREST)

**Spec:** `docs/superpowers/specs/2026-04-14-content-enrichment-design.md`

---

## Task 1: Purge news toxiques + schema prep

**Files:**
- Modify: VPS `/opt/cretepulse-db` (SQL direct)

- [ ] **Step 1: Compter les articles à purger**

```bash
ssh kairos-vps "docker exec cretepulse-postgres psql -U postgres -d cretepulse -c \"
  SELECT COUNT(*) as to_purge FROM news
  WHERE source_lang = 'el'
    AND (summary_en IS NULL OR summary_en = '')
    AND (title_en = '' OR title_en IS NULL OR title_en = title_el);
\""
```

Expected: ~3 200-3 300 articles

- [ ] **Step 2: Purger les articles grecs sans contenu EN**

```bash
ssh kairos-vps "docker exec cretepulse-postgres psql -U postgres -d cretepulse -c \"
  DELETE FROM news
  WHERE source_lang = 'el'
    AND (summary_en IS NULL OR summary_en = '')
    AND (title_en = '' OR title_en IS NULL OR title_en = title_el);
\""
```

- [ ] **Step 3: Ajouter colonne rewritten**

```bash
ssh kairos-vps "docker exec cretepulse-postgres psql -U postgres -d cretepulse -c \"
  ALTER TABLE news ADD COLUMN IF NOT EXISTS rewritten BOOLEAN DEFAULT false;
  UPDATE news SET rewritten = true WHERE summary_en IS NOT NULL AND summary_en != '';
\""
```

- [ ] **Step 4: Vérifier l'état post-purge**

```bash
ssh kairos-vps "docker exec cretepulse-postgres psql -U postgres -d cretepulse -c \"
  SELECT COUNT(*) as total,
         COUNT(CASE WHEN rewritten THEN 1 END) as rewritten,
         COUNT(CASE WHEN NOT rewritten THEN 1 END) as pending
  FROM news;
\""
```

Expected: ~400 articles restants, la plupart rewritten=true

- [ ] **Step 5: Commit note dans session_log**

---

## Task 2: Fix slugs non-ASCII dans news.py

**Files:**
- Modify: VPS `/opt/cretepulse/news.py`

- [ ] **Step 1: Corriger la fonction slugify**

```bash
ssh kairos-vps "cp /opt/cretepulse/news.py /opt/cretepulse/news.py.bak.$(date +%Y%m%d)"
```

Remplacer la fonction `slugify` dans `/opt/cretepulse/news.py`. Après la boucle de remplacement grec et avant les regex, ajouter la normalisation Unicode :

```python
import unicodedata

def slugify(text: str) -> str:
    text = text.lower().strip()
    # Greek transliteration
    replacements = {
        "α": "a", "β": "b", "γ": "g", "δ": "d", "ε": "e", "ζ": "z", "η": "i",
        "θ": "th", "ι": "i", "κ": "k", "λ": "l", "μ": "m", "ν": "n", "ξ": "x",
        "ο": "o", "π": "p", "ρ": "r", "σ": "s", "ς": "s", "τ": "t", "υ": "y",
        "φ": "f", "χ": "ch", "ψ": "ps", "ω": "o",
        "ά": "a", "έ": "e", "ή": "i", "ί": "i", "ό": "o", "ύ": "y", "ώ": "o",
    }
    for gr, lat in replacements.items():
        text = text.replace(gr, lat)
        text = text.replace(gr.upper(), lat)
    # Strip accented latin chars (ä→a, é→e, ñ→n, etc.)
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('ascii')
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    text = re.sub(r"^-+|-+$", "", text)
    return text[:100]
```

- [ ] **Step 2: Corriger les slugs existants en base**

```bash
ssh kairos-vps "docker exec cretepulse-postgres psql -U postgres -d cretepulse -c \"
  SELECT id, slug FROM news WHERE slug ~ '[^a-z0-9-]';
\""
```

S'il y en a, les corriger manuellement ou via un script Python one-shot.

- [ ] **Step 3: Vérifier**

```bash
ssh kairos-vps "python3 -c \"
from news import slugify
print(slugify('Kreta-Urlaub 2026: Diese drei Strände'))
print(slugify('Café Méditerranée à Héraklion'))
print(slugify('Τα καλύτερα εστιατόρια στα Χανιά'))
\""
```

Expected: `kreta-urlaub-2026-diese-drei-strande`, `cafe-mediterranee-a-heraklion`, `ta-kalytera-estiatioria-sta-chania`

---

## Task 3: Fix bug /food (colonne rating inexistante)

**Files:**
- Modify: `src/lib/food.ts`

- [ ] **Step 1: Retirer l'order by rating de toutes les fonctions**

Dans `src/lib/food.ts`, remplacer toutes les occurrences de :
```typescript
.order("rating", { ascending: false, nullsFirst: false })
```
par :
```typescript
.order("name", { ascending: true })
```

Il y a 4 occurrences : `getAllFoodPlaces()`, `getFoodByRegionAndType()`, `getFoodByRegion()`, `getNearbyFoodPlaces()`.

Aussi retirer `rating, review_count` du `.select()` dans toutes les fonctions (les colonnes n'existent pas).

- [ ] **Step 2: Retirer les références rating/review_count du composant FoodCard**

Dans `src/app/[locale]/food/page.tsx`, supprimer le bloc rating (lignes ~348-355) :

```typescript
        {/* Rating */}
        {place.rating && (
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-amber-500">{place.rating}</span>
            <span className="text-amber-400">{"★".repeat(Math.round(place.rating))}</span>
            {place.review_count && (
              <span className="text-[11px] text-text-light">({place.review_count.toLocaleString()})</span>
            )}
          </div>
        )}
```

- [ ] **Step 3: Retirer rating/review_count du type FoodPlace**

Vérifier dans `src/lib/types.ts` si `rating` et `review_count` sont dans l'interface FoodPlace. Si oui, les retirer.

- [ ] **Step 4: Vérifier le build**

```bash
cd /c/Users/fkerj/cretepulse-build && npx tsc --noEmit
```

Expected: 0 erreurs

- [ ] **Step 5: Tester en local**

```bash
cd /c/Users/fkerj/cretepulse-build && npm run dev &
# Tester http://localhost:3000/en/food - devrait afficher des restaurants
```

- [ ] **Step 6: Commit**

```bash
cd /c/Users/fkerj/cretepulse-build
git add src/lib/food.ts src/app/\[locale\]/food/page.tsx src/lib/types.ts
git commit -m "fix(food): remove non-existent rating column references, unblock /food page"
```

---

## Task 4: Nettoyage sitemap (retirer sections vides)

**Files:**
- Modify: `src/app/sitemap.ts`

- [ ] **Step 1: Retirer events et guides du sitemap**

Dans `src/app/sitemap.ts`, dans la fonction `sitemap()`, retirer les appels :
```typescript
fetchSlugs("events", "events"),
fetchSlugs("guides", "guides"),
```

Et les boucles correspondantes :
```typescript
for (const s of events) add(`/events/${s}`, "weekly", 0.7);
for (const s of guides) add(`/articles/${s}`, "monthly", 0.8);
```

Mettre à jour le destructuring `Promise.all` pour retirer `events` et `guides`.

- [ ] **Step 2: Filtrer food_places par description non vide**

Modifier la fonction `fetchSlugs` pour accepter un filtre optionnel. Ou plus simple, ajouter un cas spécifique pour food_places :

Dans `fetchSlugs()`, ajouter :
```typescript
} else if (extra === "food_featured") {
  query = supabase.from(table).select("slug").neq("description_en", "");
}
```

Et remplacer `fetchSlugs("food_places")` par `fetchSlugs("food_places", "food_featured")`.

- [ ] **Step 3: Build check**

```bash
cd /c/Users/fkerj/cretepulse-build && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/sitemap.ts
git commit -m "fix(sitemap): remove empty events/guides, filter food by description"
```

---

## Task 5: Correction données plages + INSERT manquantes

**Files:**
- Create: VPS `/opt/cretepulse/fix-beaches.py`

- [ ] **Step 1: Vérifier quelles top plages manquent**

```bash
ssh kairos-vps "docker exec cretepulse-postgres psql -U postgres -d cretepulse -c \"
  SELECT slug FROM beaches WHERE slug IN (
    'balos','balos-beach','balos-lagoon',
    'preveli','preveli-beach',
    'matala','matala-beach',
    'seitan-limania','seitan-limania-beach',
    'kedrodasos','kedrodasos-beach',
    'glyka-nera','sweet-water-beach',
    'damnoni','damnoni-beach',
    'triopetra','triopetra-beach',
    'frangokastello','frangokastello-beach',
    'loutro','loutro-beach',
    'sougia','sougia-beach'
  );
\""
```

- [ ] **Step 2: Créer le script fix-beaches.py sur le VPS**

Script qui :
1. INSERT les plages manquantes avec coordonnées GPS, région, type, booléens vérifiés
2. UPDATE les booléens des top 30 existantes avec des données hardcodées vérifiées

Déployer via `scp` ou `ssh cat >` le script sur le VPS.

Le script contient un dictionnaire `TOP_30_CORRECTIONS` avec les données vérifiées pour chaque plage (parking, kids_friendly, sunbeds, taverna, snorkeling, type). Exemple :

```python
TOP_30_CORRECTIONS = {
    "elafonisi-beach": {"parking": True, "kids_friendly": True, "sunbeds": True, "taverna": True, "snorkeling": True, "type": "sand"},
    "palm-beach-vai": {"parking": True, "kids_friendly": True, "sunbeds": True, "taverna": True, "snorkeling": True, "type": "sand"},
    "falassarna": {"parking": True, "kids_friendly": True, "sunbeds": True, "taverna": True, "snorkeling": False, "type": "sand"},
    # ... etc pour les 30
}

MISSING_BEACHES = [
    {"slug": "balos-lagoon", "name_en": "Balos Lagoon", "name_fr": "Lagon de Balos", "name_de": "Balos-Lagune", "name_el": "Μπάλος", "latitude": 35.578, "longitude": 23.588, "region": "west", "type": "sand", "parking": True, "kids_friendly": True, "sunbeds": False, "taverna": False, "snorkeling": True},
    {"slug": "preveli-beach", "name_en": "Preveli Beach", "name_fr": "Plage de Preveli", "name_de": "Preveli Strand", "name_el": "Πρέβελη", "latitude": 35.155, "longitude": 24.475, "region": "west", "type": "sand", "parking": True, "kids_friendly": False, "sunbeds": False, "taverna": True, "snorkeling": True},
    # ... etc
]
```

- [ ] **Step 3: Exécuter le script**

```bash
ssh kairos-vps "cd /opt/cretepulse && ./venv/bin/python3 fix-beaches.py"
```

- [ ] **Step 4: Vérifier**

```bash
ssh kairos-vps "docker exec cretepulse-postgres psql -U postgres -d cretepulse -c \"
  SELECT slug, parking, kids_friendly, type FROM beaches
  WHERE slug IN ('elafonisi-beach','balos-lagoon','preveli-beach','palm-beach-vai')
  ORDER BY slug;
\""
```

Expected: toutes les valeurs corrigées, balos-lagoon et preveli-beach présents.

---

## Task 6: Enrichissement top 30 plages (background VPS)

**Files:**
- Create: VPS `/opt/cretepulse/enrich-beaches.py`

- [ ] **Step 1: Créer le script enrich-beaches.py**

Script Python qui :
1. Se connecte à Postgres via psycopg2 localhost:5433
2. Récupère les plages sans `description_en` (ou avec `--force-slug`)
3. Pour chaque plage top 30 : appelle `claude -p --model sonnet` avec un prompt contenant nom, coordonnées, région, type, booléens, et demandant 500-800 mots EN
4. Traduit via `claude -p --model haiku` en FR/DE/EL (un appel, retour JSON)
5. UPDATE la base avec les 4 descriptions
6. Pause 2s entre chaque plage

```python
#!/opt/cretepulse/venv/bin/python3
"""Enrich beach descriptions via Claude CLI."""
import subprocess, json, sys, time, os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_HOST = "localhost"
DB_PORT = 5433
DB_NAME = "cretepulse"
DB_USER = "postgres"
DB_PASS = os.environ["POSTGRES_PASSWORD"]

TOP_30_SLUGS = [
    "elafonisi-beach", "balos-lagoon", "palm-beach-vai", "preveli-beach",
    "matala-beach", "falassarna", "seitan-limania-beach", "stavros-beach",
    "georgioupoli-beach", "agia-pelagia-beach", "elounda-beach", "plakias-beach",
    "paleochora-beach", "sougia-beach", "loutro-beach", "malia-beach",
    "stalis-beach", "agiofarago-beach", "kedrodasos-beach", "glyka-nera-beach",
    "damnoni-beach", "triopetra-beach", "frangokastello-beach", "makrigialos-beach",
    "xerokampos-beach", "sitia-beach", "istro-beach", "almyrida-beach",
    "marathi-beach", "kalathas-beach",
]

def claude(prompt, model="haiku"):
    result = subprocess.run(
        ["claude", "-p", prompt, "--model", model],
        capture_output=True, text=True, timeout=180
    )
    return result.stdout.strip()

def enrich_beach(cur, beach, is_top30):
    slug = beach["slug"]
    model = "sonnet" if is_top30 else "haiku"
    word_target = "500-800" if is_top30 else "120-150"

    prompt = f"""Write a {word_target} word English description of {beach['name_en']} beach in Crete, Greece.

Location: {beach['region']} Crete, coordinates {beach['latitude']}, {beach['longitude']}
Beach type: {beach['type'] or 'unknown'}
Parking: {'yes' if beach['parking'] else 'no'}
Family-friendly: {'yes' if beach['kids_friendly'] else 'no'}
Sunbeds: {'yes' if beach['sunbeds'] else 'no'}
Taverna nearby: {'yes' if beach['taverna'] else 'no'}
Snorkeling: {'yes' if beach['snorkeling'] else 'no'}

Structure: Opening (what makes it special), How to get there, Activities, Practical tips (best time, wind, crowds), Best season, Who it's for.
Write for tourists. Be factual, specific, useful. No marketing fluff. No em dashes."""

    print(f"  [{model}] Generating EN description for {slug}...")
    desc_en = claude(prompt, model)
    if not desc_en or len(desc_en) < 50:
        print(f"  SKIP {slug}: empty response")
        return False

    time.sleep(2)

    # Translate to FR/DE/EL in one call
    tr_prompt = f"""Translate this beach description to French, German, and Greek.

RULES:
- French: all accents mandatory (é, è, ê, à, ç, etc.)
- German: correct umlauts and grammar
- Greek: modern Greek, tourist-friendly
- No em dashes in any language
- Keep the same structure and length

Text to translate:
{desc_en}

Return ONLY valid JSON:
{{"fr": "...", "de": "...", "el": "..."}}"""

    print(f"  [haiku] Translating {slug}...")
    tr_raw = claude(tr_prompt, "haiku")
    time.sleep(2)

    try:
        # Extract JSON from response (may have markdown fences)
        json_str = tr_raw
        if "```" in json_str:
            json_str = json_str.split("```")[1]
            if json_str.startswith("json"):
                json_str = json_str[4:]
        translations = json.loads(json_str.strip())
    except (json.JSONDecodeError, IndexError):
        print(f"  WARN {slug}: translation parse failed, saving EN only")
        translations = {}

    cur.execute("""
        UPDATE beaches SET
            description_en = %s,
            description_fr = %s,
            description_de = %s,
            description_el = %s
        WHERE slug = %s
    """, (
        desc_en,
        translations.get("fr", ""),
        translations.get("de", ""),
        translations.get("el", ""),
        slug,
    ))

    print(f"  OK {slug}: {len(desc_en)} chars EN")
    return True

def main():
    force_slug = None
    top_only = "--top-only" in sys.argv
    for arg in sys.argv[1:]:
        if arg.startswith("--force-slug="):
            force_slug = arg.split("=", 1)[1]

    conn = psycopg2.connect(host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER, password=DB_PASS)
    conn.autocommit = True
    cur = conn.cursor()

    if force_slug:
        cur.execute("SELECT slug, name_en, latitude, longitude, region, type, parking, kids_friendly, sunbeds, taverna, snorkeling FROM beaches WHERE slug = %s", (force_slug,))
    elif top_only:
        placeholders = ",".join(["%s"] * len(TOP_30_SLUGS))
        cur.execute(f"SELECT slug, name_en, latitude, longitude, region, type, parking, kids_friendly, sunbeds, taverna, snorkeling FROM beaches WHERE slug IN ({placeholders})", TOP_30_SLUGS)
    else:
        cur.execute("SELECT slug, name_en, latitude, longitude, region, type, parking, kids_friendly, sunbeds, taverna, snorkeling FROM beaches WHERE (description_en IS NULL OR description_en = '') ORDER BY slug")

    cols = [d[0] for d in cur.description]
    rows = [dict(zip(cols, row)) for row in cur.fetchall()]
    print(f"[enrich-beaches] {len(rows)} beaches to process")

    ok, fail = 0, 0
    for beach in rows:
        is_top30 = beach["slug"] in TOP_30_SLUGS
        try:
            if enrich_beach(cur, beach, is_top30):
                ok += 1
            else:
                fail += 1
        except Exception as e:
            print(f"  ERROR {beach['slug']}: {e}")
            fail += 1

    cur.close()
    conn.close()
    print(f"[enrich-beaches] Done: {ok} OK, {fail} failed")

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Déployer et installer psycopg2**

```bash
scp enrich-beaches.py kairos-vps:/opt/cretepulse/
ssh kairos-vps "/opt/cretepulse/venv/bin/pip install psycopg2-binary"
```

- [ ] **Step 3: Test sur 1 plage**

```bash
ssh kairos-vps "cd /opt/cretepulse && ./venv/bin/python3 enrich-beaches.py --force-slug=elafonisi-beach"
```

Vérifier que la description est factuelle (parking=oui, famille=oui, sable rose, lagon).

- [ ] **Step 4: Lancer top 30 en background**

```bash
ssh kairos-vps "cd /opt/cretepulse && nohup ./venv/bin/python3 enrich-beaches.py --top-only > /var/log/cretepulse-enrich-beaches-top30.log 2>&1 &"
```

Durée estimée : ~50 min

- [ ] **Step 5: Vérification spot-check quand terminé**

```bash
ssh kairos-vps "docker exec cretepulse-postgres psql -U postgres -d cretepulse -c \"
  SELECT slug, LENGTH(description_en) as len_en, LENGTH(description_fr) as len_fr
  FROM beaches WHERE slug IN ('elafonisi-beach','balos-lagoon','palm-beach-vai')
\""
```

Expected: len_en > 2000 (500+ mots), len_fr > 1500

---

## Task 7: Enrichissement 136 plages restantes (background VPS)

- [ ] **Step 1: Lancer sur toutes les plages sans description**

```bash
ssh kairos-vps "cd /opt/cretepulse && nohup ./venv/bin/python3 enrich-beaches.py > /var/log/cretepulse-enrich-beaches-all.log 2>&1 &"
```

Le script est idempotent : il skip les plages déjà enrichies (top 30). Durée estimée : ~100 min.

- [ ] **Step 2: Spot-check 5 plages random quand terminé**

```bash
ssh kairos-vps "docker exec cretepulse-postgres psql -U postgres -d cretepulse -c \"
  SELECT slug, LENGTH(description_en), LENGTH(description_fr) FROM beaches
  WHERE description_en IS NOT NULL AND description_en != ''
  ORDER BY RANDOM() LIMIT 5;
\""
```

---

## Task 8: Sélection + enrichissement 200 restaurants (background VPS)

**Files:**
- Modify: VPS DB (ALTER TABLE food_places)
- Create: VPS `/opt/cretepulse/enrich-restaurants.py`

- [ ] **Step 1: Ajouter colonne featured**

```bash
ssh kairos-vps "docker exec cretepulse-postgres psql -U postgres -d cretepulse -c \"
  ALTER TABLE food_places ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
\""
```

- [ ] **Step 2: Sélectionner les top 200**

```bash
ssh kairos-vps "docker exec cretepulse-postgres psql -U postgres -d cretepulse -c \"
  -- Priorité : taverna > restaurant > cafe, répartition géo proportionnelle
  WITH ranked AS (
    SELECT id, slug, name, type, region,
      ROW_NUMBER() OVER (
        PARTITION BY region
        ORDER BY
          CASE type WHEN 'taverna' THEN 1 WHEN 'restaurant' THEN 2 WHEN 'cafe' THEN 3 ELSE 4 END,
          name
      ) as rn,
      CASE region
        WHEN 'west' THEN 88
        WHEN 'east' THEN 62
        WHEN 'central' THEN 50
      END as quota
    FROM food_places
    WHERE cuisine IS NOT NULL AND cuisine != ''
  )
  UPDATE food_places SET featured = true
  WHERE id IN (SELECT id FROM ranked WHERE rn <= quota);
\""
```

Vérifier : `SELECT region, COUNT(*) FROM food_places WHERE featured GROUP BY region;`

- [ ] **Step 3: Créer enrich-restaurants.py**

Même pattern que enrich-beaches.py mais :
- Ne traite que `featured = true AND (description_en IS NULL OR description_en = '')`
- Prompt Haiku : "Write a 100-150 word English description of {name}, a {type} in {village}, {region} Crete. Cuisine: {cuisine}. Describe: specialties, atmosphere, price indication, what to order. Write for tourists. Factual, no fluff. No em dashes."
- Traduction FR/DE/EL en un appel Haiku
- Batch 10, pause 1s

- [ ] **Step 4: Déployer et lancer**

```bash
scp enrich-restaurants.py kairos-vps:/opt/cretepulse/
ssh kairos-vps "cd /opt/cretepulse && nohup ./venv/bin/python3 enrich-restaurants.py > /var/log/cretepulse-enrich-restaurants.log 2>&1 &"
```

Durée estimée : ~60 min

---

## Task 9: Enrichissement 50 randonnées (background VPS)

**Files:**
- Create: VPS `/opt/cretepulse/enrich-hikes.py`

- [ ] **Step 1: Créer enrich-hikes.py**

Même pattern. Prompt Haiku : "Write a 120-150 word English description of the {name} hike in Crete. Distance: {distance_km}km, elevation gain: {elevation_gain_m}m, duration: {duration_hours}h, difficulty: {difficulty}. Water available: {water}. Describe: what you'll see, required fitness level, best season, starting point, practical tips (water, shoes, time of day). Factual, for hikers. No em dashes."

- [ ] **Step 2: Déployer et lancer**

```bash
scp enrich-hikes.py kairos-vps:/opt/cretepulse/
ssh kairos-vps "cd /opt/cretepulse && nohup ./venv/bin/python3 enrich-hikes.py > /var/log/cretepulse-enrich-hikes.log 2>&1 &"
```

Durée estimée : ~15 min

---

## Task 10: Palantir grec - refonte writer.py

**Files:**
- Create: VPS `/opt/cretepulse/writer-v2.py`
- Modify: VPS crontab

C'est la pièce maîtresse : le moteur d'intelligence qui transforme l'actualité grecque brute en contenu touristique multilingue.

- [ ] **Step 1: Backup writer actuel**

```bash
ssh kairos-vps "cp /opt/cretepulse/writer.py /opt/cretepulse/writer-v1-groq.py.bak"
```

- [ ] **Step 2: Créer writer-v2.py**

```python
#!/opt/cretepulse/venv/bin/python3
"""CretePulse Palantir - Greek news intelligence pipeline.
Filters Cretan news by tourist relevance, rewrites in EN, translates to FR/DE/EL + 18 title langs.
Uses claude -p (VPS OAuth, zero tokens).
Cron: 0 * * * * (hourly)
"""
import subprocess, json, sys, time, os, re
import psycopg2
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

DB_HOST = "localhost"
DB_PORT = 5433
DB_NAME = "cretepulse"
DB_USER = "postgres"
DB_PASS = os.environ["POSTGRES_PASSWORD"]

BATCH_SIZE = 10
RELEVANCE_THRESHOLD = 5

OTHER_LANGS = ["it", "nl", "pl", "es", "pt", "ru", "ja", "ko", "zh", "tr", "sv", "da", "no", "fi", "cs", "hu", "ro", "ar"]

def claude(prompt, model="haiku"):
    try:
        result = subprocess.run(
            ["claude", "-p", prompt, "--model", model],
            capture_output=True, text=True, timeout=180
        )
        return result.stdout.strip()
    except Exception as e:
        print(f"  claude error: {e}")
        return ""

def extract_json(raw):
    """Extract JSON from a response that may contain markdown fences."""
    if not raw:
        return None
    text = raw.strip()
    if "```" in text:
        parts = text.split("```")
        for part in parts[1:]:
            cleaned = part.strip()
            if cleaned.startswith("json"):
                cleaned = cleaned[4:].strip()
            try:
                return json.loads(cleaned)
            except json.JSONDecodeError:
                continue
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None

def score_relevance(title, summary=""):
    """Score 0-10 how relevant an article is for tourists in Crete."""
    text = f"{title} {summary}".strip()
    prompt = f"""Rate 0-10 how relevant this news article is for a tourist visiting Crete, Greece.

Relevant topics (score 7-10): travel, beaches, weather alerts, cultural events, festivals, food/restaurants, transport disruptions, flight news, safety alerts, real estate, hotel openings, archaeological discoveries.

Somewhat relevant (score 4-6): general Crete economy, local politics affecting tourism, infrastructure projects (roads, airports), environmental news.

Not relevant (score 0-3): local crime blotter, national Greek politics, sports results, celebrity gossip, obituaries.

Article: {text[:500]}

Return ONLY a single number 0-10, nothing else."""

    raw = claude(prompt, "haiku")
    try:
        score = int(re.search(r'\d+', raw or "0").group())
        return min(max(score, 0), 10)
    except (AttributeError, ValueError):
        return 0

def rewrite_en(title, summary, source_lang):
    """Rewrite article as 100-150 word English tourist summary."""
    prompt = f"""Rewrite this Cretan news article as a 100-150 word English summary for tourists visiting Crete.

Original ({source_lang}):
Title: {title}
Content: {summary[:1500]}

RULES:
- Write in clear, factual English
- Focus on: what happened, where exactly in Crete, when, why it matters for visitors
- Include practical implications for tourists when relevant
- No opinions, no sensationalism
- No em dashes
- If it's about infrastructure/transport: mention impact on travel plans
- If it's about weather/safety: include practical advice
- If it's about culture/events: include dates, locations, how to attend

Return ONLY the rewritten summary, no title, no prefix."""

    return claude(prompt, "sonnet")

def translate_4lang(title_en, summary_en):
    """Translate title + summary to FR/DE/EL in one call."""
    prompt = f"""Translate this news article title and summary to French, German, and Greek.

Title: {title_en}
Summary: {summary_en}

RULES:
- French: all accents mandatory (é, è, ê, à, ç, etc.)
- German: correct umlauts, Nachrichtenstil
- Greek: modern Greek, tourist-friendly
- No em dashes in any language

Return ONLY valid JSON:
{{"title_fr":"...","title_de":"...","title_el":"...","summary_fr":"...","summary_de":"...","summary_el":"..."}}"""

    raw = claude(prompt, "haiku")
    return extract_json(raw) or {}

def translate_18_titles(title_en):
    """Translate title to 18 other languages in one call."""
    langs_str = ", ".join(OTHER_LANGS)
    prompt = f"""Translate this news title to these languages: {langs_str}

Title: {title_en}

Return ONLY valid JSON with language codes as keys:
{{"it":"...","nl":"...","pl":"...","es":"...","pt":"...","ru":"...","ja":"...","ko":"...","zh":"...","tr":"...","sv":"...","da":"...","no":"...","fi":"...","cs":"...","hu":"...","ro":"...","ar":"..."}}"""

    raw = claude(prompt, "haiku")
    return extract_json(raw) or {}

def process_article(cur, article):
    """Process a single unprocessed article through the Palantir pipeline."""
    aid = article["id"]
    slug = article["slug"]

    # Determine source title and summary
    title = article.get("title_el") or article.get("title_en") or article.get("title_fr") or article.get("title_de") or ""
    summary = article.get("summary_el") or article.get("summary_en") or article.get("summary_fr") or article.get("summary_de") or ""
    source_lang = article.get("source_lang") or "el"

    if not title:
        cur.execute("UPDATE news SET rewritten = true, category = 'filtered' WHERE id = %s", (aid,))
        return "skip_empty"

    # Step 1: Relevance filter
    score = score_relevance(title, summary)
    print(f"  [{slug[:40]}] relevance={score}/10", end="")
    time.sleep(1)

    if score < RELEVANCE_THRESHOLD:
        cur.execute("UPDATE news SET rewritten = true, category = 'filtered' WHERE id = %s", (aid,))
        print(" -> filtered")
        return "filtered"

    # Step 2: Rewrite in English
    summary_en = rewrite_en(title, summary, source_lang)
    if not summary_en or len(summary_en) < 30:
        cur.execute("UPDATE news SET rewritten = true, category = 'filtered' WHERE id = %s", (aid,))
        print(" -> rewrite failed")
        return "rewrite_fail"
    time.sleep(2)

    # Generate EN title from the rewrite
    title_en_prompt = f"Write a concise news headline (max 80 chars) in English for this article summary. Return ONLY the headline, no quotes:\n\n{summary_en[:500]}"
    title_en = claude(title_en_prompt, "haiku")
    if not title_en:
        title_en = title[:80]
    time.sleep(1)

    # Step 3: Translate to FR/DE/EL
    tr = translate_4lang(title_en, summary_en)
    time.sleep(1)

    # Step 4: Translate title to 18 other languages
    titles_18 = translate_18_titles(title_en)
    time.sleep(1)

    # Step 5: Update database
    cur.execute("""
        UPDATE news SET
            title_en = %s, summary_en = %s,
            title_fr = %s, summary_fr = %s,
            title_de = %s, summary_de = %s,
            title_el = COALESCE(NULLIF(title_el, ''), %s),
            summary_el = COALESCE(NULLIF(summary_el, ''), %s),
            rewritten = true, category = %s
        WHERE id = %s
    """, (
        title_en, summary_en,
        tr.get("title_fr", ""), tr.get("summary_fr", ""),
        tr.get("title_de", ""), tr.get("summary_de", ""),
        tr.get("title_el", ""), tr.get("summary_el", ""),
        "tourism" if score >= 7 else "general",
        aid,
    ))

    print(f" -> OK ({len(summary_en)} chars, score={score})")
    return "ok"

def main():
    started = datetime.now(timezone.utc)
    print(f"[palantir] {started.isoformat()} - processing batch of {BATCH_SIZE}")

    conn = psycopg2.connect(host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER, password=DB_PASS)
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute("""
        SELECT id, slug, title_en, title_fr, title_de, title_el,
               summary_en, summary_fr, summary_de, summary_el, source_lang
        FROM news
        WHERE (rewritten IS NULL OR rewritten = false)
        ORDER BY published_at DESC
        LIMIT %s
    """, (BATCH_SIZE,))

    cols = [d[0] for d in cur.description]
    articles = [dict(zip(cols, row)) for row in cur.fetchall()]

    if not articles:
        print("[palantir] No unprocessed articles")
        cur.close()
        conn.close()
        return

    stats = {"ok": 0, "filtered": 0, "skip_empty": 0, "rewrite_fail": 0}
    for article in articles:
        try:
            result = process_article(cur, article)
            stats[result] = stats.get(result, 0) + 1
        except Exception as e:
            print(f"  ERROR {article['slug'][:40]}: {e}")

    elapsed = (datetime.now(timezone.utc) - started).total_seconds()
    print(f"[palantir] Done in {elapsed:.0f}s: {stats}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Déployer**

```bash
scp writer-v2.py kairos-vps:/opt/cretepulse/writer-v2.py
ssh kairos-vps "chmod +x /opt/cretepulse/writer-v2.py"
```

- [ ] **Step 4: Test sur 3 articles**

```bash
ssh kairos-vps "cd /opt/cretepulse && BATCH_SIZE=3 ./venv/bin/python3 writer-v2.py"
```

Vérifier : score pertinence cohérent, réécriture EN lisible, traductions présentes.

- [ ] **Step 5: Vérifier en base**

```bash
ssh kairos-vps "docker exec cretepulse-postgres psql -U postgres -d cretepulse -c \"
  SELECT slug, LEFT(title_en, 60) as title, LEFT(summary_en, 80) as summary, category
  FROM news WHERE rewritten = true
  ORDER BY published_at DESC LIMIT 5;
\""
```

- [ ] **Step 6: Remplacer l'ancien writer dans le cron**

```bash
ssh kairos-vps "(crontab -l | grep -v 'writer.py' ; echo '0 * * * * cd /opt/cretepulse && ./venv/bin/python3 writer-v2.py >> /var/log/cretepulse-palantir.log 2>&1') | crontab -"
```

Vérifier : `ssh kairos-vps "crontab -l | grep cretepulse"`

---

## Task 11: Deploy Vercel + vérification finale

**Files:**
- Modify: `src/app/sitemap.ts` (déjà fait Task 4)
- Push: git commit + push

- [ ] **Step 1: Vérifier que les enrichissements background sont terminés**

```bash
ssh kairos-vps "docker exec cretepulse-postgres psql -U postgres -d cretepulse -c \"
  SELECT 'beaches' as type, COUNT(*) as total, COUNT(CASE WHEN description_en IS NOT NULL AND description_en != '' THEN 1 END) as enriched FROM beaches
  UNION ALL
  SELECT 'food_places', COUNT(*), COUNT(CASE WHEN description_en IS NOT NULL AND description_en != '' THEN 1 END) FROM food_places
  UNION ALL
  SELECT 'hikes', COUNT(*), COUNT(CASE WHEN description_en IS NOT NULL AND description_en != '' THEN 1 END) FROM hikes
  UNION ALL
  SELECT 'news', COUNT(*), COUNT(CASE WHEN rewritten THEN 1 END) FROM news;
\""
```

- [ ] **Step 2: Commit et push tout le code front**

```bash
cd /c/Users/fkerj/cretepulse-build
git add -A
git commit -m "fix: /food bug + sitemap cleanup + content enrichment prep"
git push origin master:main && git push origin master
```

- [ ] **Step 3: Vérification prod après deploy**

```bash
python3 -c "
import requests
pages = ['/en/food', '/en/beaches/elafonisi-beach', '/en/hikes', '/en/news']
for p in pages:
    r = requests.get(f'https://crete.direct{p}', timeout=10)
    print(f'{p}: {r.status_code}')
"
```

- [ ] **Step 4: Vérifier /food affiche des restaurants**

```bash
python3 -c "
import requests
from bs4 import BeautifulSoup
r = requests.get('https://crete.direct/en/food', timeout=10)
soup = BeautifulSoup(r.text, 'html.parser')
links = [a for a in soup.find_all('a') if a.get('href','').startswith('/en/food/')]
print(f'Restaurants affichés: {len(links)}')
"
```

Expected: > 0 restaurants

- [ ] **Step 5: Vérifier sitemap propre**

```bash
python3 -c "
import requests
r = requests.get('https://crete.direct/sitemap.xml', timeout=10)
print(r.text[:500])
# Vérifier : pas de /events/, pas de /articles/
assert '/events/' not in r.text
print('OK: no events in sitemap')
"
```

- [ ] **Step 6: MAJ session_log**

---

## Ordre d'exécution et parallélisme

```
Task 1 (purge news) ─────────────────────────┐
Task 2 (fix slugs) ──────────────────────────┤ Séquentiel : nettoyage DB
Task 3 (fix /food) ──────────────────────────┤ puis code front
Task 4 (sitemap cleanup) ────────────────────┘
                                              │
Task 5 (fix beach data) ─────────────────────┘
                                              │
                    ┌─────────────────────────┼──────────────────────┐
Task 6 (top 30 beaches) ◄─ background   Task 8 (200 restos) ◄─ bg  Task 9 (50 hikes) ◄─ bg
Task 7 (136 beaches) ◄─ après Task 6         │                      │
                    └─────────────────────────┼──────────────────────┘
                                              │
Task 10 (Palantir writer-v2) ────────────────┘ quand Tasks 6-9 terminées
Task 11 (deploy + vérif) ────────────────────── dernier
```

Tasks 6, 8, 9 tournent en parallèle sur le VPS. Task 7 attend que Task 6 finisse (même script, idempotent). Task 10 est indépendant mais lancé après pour ne pas surcharger le VPS en appels claude simultanés.
