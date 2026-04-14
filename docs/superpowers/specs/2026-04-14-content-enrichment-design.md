# CretePulse Content Enrichment - Design Spec

## Contexte

Audit du 14/04/2026 : crete.direct est une coquille de données avec 56K URLs dans le sitemap mais un contenu squelettique. 88.7% des news sans traduction, 0 descriptions sur plages/restos/randonnées, erreurs factuelles, sections vides. Le site n'a aucune valeur SEO en l'état.

## Objectif

Transformer crete.direct d'un agrégateur de données en un vrai guide touristique avec du contenu utile, traduit, et factuel.

## Périmètre

### 1. Plages (166 existantes + ajouts)

**Problème** : 166 plages en base, 0 descriptions, erreurs factuelles (Elafonisi = parking false, kids_friendly false - les deux sont faux). Plages majeures manquantes (Balos, Preveli, Matala absentes de la base).

**Solution** :

**Phase 1A - Correction données + ajouts manquants**
- Ajouter les plages manquantes : Balos, Preveli, Matala, Seitan Limania, Kedrodasos, Glyka Nera, Damnoni, Triopetra, Frangokastello, Loutro, Sougia (+ toute autre top plage absente)
- Corriger les booléens `parking`, `kids_friendly`, `sunbeds`, `taverna`, `snorkeling` et le champ `type` :
  - Top 30 : dictionnaire hardcodé dans le script avec des données vérifiées (connaissance locale Kami)
  - 136 autres : prompt Haiku avec nom + coordonnées GPS + région → estimation des booléens. Résultat vérifié par spot-check sur 10 plages random.

**Phase 1B - Enrichissement top 30**
Plages prioritaires : Elafonisi, Balos, Vai, Preveli, Matala, Falassarna, Seitan Limania, Stavros, Georgioupoli, Agia Pelagia, Elounda, Plakias, Paleochora, Sougia, Loutro, Malia Beach, Stalis, Agiofarago, Kedrodasos, Glyka Nera, Damnoni, Triopetra, Frangokastello, Makrigialos, Xerokampos, Sitia Beach, Istro, Almyrida, Marathi, Kalathas

Pour chaque :
- `description_en` : 500-800 mots via `claude -p --model sonnet`. Structure : intro (ambiance, ce qui rend cette plage unique), accès (voiture, à pied, bateau), activités, conseils pratiques (meilleure heure, vent, foule), meilleure saison, pour qui (familles, couples, aventuriers). Le prompt inclut les coordonnées GPS, la région, et les booléens corrigés comme contexte.
- `description_fr`, `description_de`, `description_el` : traduction via `claude -p --model haiku`

**Phase 1C - Enrichissement 136 restantes**
- `description_en` : 150 mots via Haiku. Paragraphe unique : type de plage, accès, ambiance, pour qui.
- Traduit EN → FR/DE/EL via Haiku

**Script** : `/opt/cretepulse/enrich-beaches.py`
- Connexion directe Postgres (psycopg2, localhost:5433)
- Sonnet pour les top 30, Haiku pour les 136 autres + toutes les traductions
- Idempotent : skip si `description_en` non vide
- Flag `--force-slug=elafonisi-beach` pour forcer la réécriture d'une plage spécifique
- Flag `--top-only` pour ne traiter que les top 30
- Batch de 5, pause 2s entre chaque appel claude
- **Durée estimée** : top 30 = ~50 min (30x60s Sonnet + 90x15s Haiku), 136 restantes = ~100 min (136x15s + 408x10s)

### 2. News pipeline (refonte writer.py)

**Problème** : `news.py` scrape 500+ articles/jour en grec. `writer.py` est censé les réécrire mais utilise Groq API (payant, qualité variable). 3 298 articles n'ont que le titre grec. Le trigger `news_fill_titles` copie le titre grec vers les champs EN/FR/DE quand ils sont vides, ce qui fait apparaître du grec sur toutes les pages non-grecques.

**Solution** :

**Phase 2A - Purge articles toxiques**
- Condition de purge : `source_lang = 'el' AND (summary_en IS NULL OR summary_en = '') AND (rewritten IS NULL OR rewritten = false)` (articles grecs jamais réécrits = titre grec copié partout par le trigger, aucun contenu utile)
- Compter avant de supprimer, log le nombre exact
- Note : `title_en` peut contenir du grec à cause du trigger, donc ne pas l'utiliser comme critère

**Phase 2B - Refonte writer.py**
Remplacer Groq par `claude -p` :
1. Le writer récupère les articles non réécrits (`rewritten = false` ou `rewritten IS NULL`)
2. **Filtre pertinence** : prompt Haiku avec le titre dans sa langue source (Haiku comprend le grec, pas besoin de pré-traduction). Prompt : "Rate 0-10 how relevant this article is for a tourist visiting Crete. Topics: travel, beaches, weather, events, culture, food, transport, safety, real estate. Article title: {title}. Return ONLY the number." Seuil >= 5.
3. **Réécriture EN** : prompt Sonnet avec titre + summary source → résumé 100-150 mots EN orienté touriste. Input = titre + summary dans la langue source (Sonnet comprend EL/FR/DE).
4. **Traduction** : prompt Haiku unique pour traduire EN → FR/DE/EL (titre + summary en un seul appel, retour JSON)
5. **Titres 18 langues** : prompt Haiku unique pour traduire le titre EN vers les 18 autres langues (un seul appel, retour JSON)
6. Marquer `rewritten = true`
7. Articles sous le seuil de pertinence : `rewritten = true` + `category = 'filtered'` (pas supprimés, juste exclus de l'affichage)

**Cron** : garder `*/30` sur `news.py` (scrape), remplacer le cron writer existant par le nouveau `writer.py` toutes les heures (batch 10 articles)

**Pré-requis** : vérifier que la colonne `rewritten` existe en base. Si absente, l'ajouter : `ALTER TABLE news ADD COLUMN IF NOT EXISTS rewritten BOOLEAN DEFAULT false;`

**Phase 2C - Modifier le trigger `news_fill_titles`**
Le trigger copie le titre de la langue source vers TOUS les champs titre vides (y compris les autres langues). Modifier le trigger pour ne PAS copier entre langues différentes. Comportement cible : le trigger ne remplit que le champ de sa propre langue (`source_lang = 'el'` → remplit `title_el` seulement, laisse `title_en/fr/de` vides).

### 3. Restaurants (top 200)

**Problème** : 1 995 restos en base, 0 descriptions, page `/food` affiche "No results" (bug front).

**Solution** :

**Phase 3A - Fix bug affichage `/food`**
**Root cause identifiée** : `src/lib/food.ts` fait `.order("rating", { ascending: false, nullsFirst: false })` mais la colonne `rating` n'existe pas dans la table `food_places`. PostgREST renvoie 400, le try/catch avale l'erreur → tableau vide → "No results".
Fix :
- Soit retirer le `.order("rating", ...)` de toutes les fonctions dans `food.ts` (tri par nom à la place)
- Soit ajouter les colonnes `rating` et `review_count` à la table (ALTER TABLE) et les remplir plus tard
- Recommandation : retirer l'order by rating pour débloquer immédiatement, ajouter les colonnes plus tard quand on aura une source de ratings
- Aussi : le filtre JS ligne 144 de `/food/page.tsx` filtre les restos sans `cuisine` ET sans description. 1 201 restos sur 1 995 n'ont ni l'un ni l'autre → filtrés. Après enrichissement des 200 restos featured, ce filtre gardera les 200 enrichis + les 794 avec cuisine.

**Phase 3B - Sélection top 200**
Pas de colonne `rating` en base. Sélection par :
- Type prioritaire : `taverna` > `restaurant` > `cafe` > `bar` > `fast_food`
- Répartition géo proportionnelle à la base : ~88 west, ~62 east, ~50 central
- Le script marque les 200 sélectionnés via un champ `featured BOOLEAN DEFAULT false` (ALTER TABLE)

**Phase 3C - Enrichissement**
- `description_en` : 100-150 mots via Haiku. Input au prompt : nom, type, village, region, cuisine. Output : spécialité, ambiance, fourchette de prix indicative, localisation par rapport aux attractions proches.
- Traduit EN → FR/DE/EL via Haiku (un seul appel, retour JSON)
- **Durée estimée** : ~60 min (200 descriptions x 10s + 200 traductions x 10s)

**Script** : `/opt/cretepulse/enrich-restaurants.py`
- Même pattern que enrich-beaches.py
- Ne traite que les `featured = true`
- Idempotent, batch 10, pause 1s

### 4. Randonnées (50 pages)

**Problème** : 50 hikes en base avec données structurelles (distance, dénivelé, durée, difficulté) mais 0 descriptions.

**Solution** :
- `description_en` : 150 mots via Haiku. Input : nom, distance_km, elevation_gain_m, duration_hours, difficulty, type, water_available, coordonnées. Output : ce qu'on voit, niveau requis, meilleure saison, point de départ, conseils.
- Traduit EN → FR/DE/EL via Haiku
- Script : `/opt/cretepulse/enrich-hikes.py`, même pattern
- **Durée estimée** : ~15 min (50x10s + 50x10s)

### 5. Nettoyage sitemap

**Problème** : le sitemap référence des sections vides (events, articles/guides, food sans description).

**Solution** (dans `src/app/sitemap.ts`) :
- Retirer le bloc `fetchSlugs("events")` et le bloc `fetchSlugs("guides", "guides")` (tables vide/inexistante)
- Modifier `fetchSlugs("food_places")` pour ne retourner que les slugs où `description_en IS NOT NULL` (via `.neq("description_en", "")` dans la query Supabase ou `WHERE description_en IS NOT NULL AND description_en != ''` en SQL)
- Le sitemap est déjà splitté en 22 sub-sitemaps (fix audit précédent)

### 6. Correction slugs non-ASCII

**Problème** : les articles avec des accents/umlauts dans le slug génèrent des 404 (ex: `kreta-urlaub-2026-diese-drei-strände`).

**Solution** :
- Dans `news.py` fonction `slugify()` : ajouter `unicodedata.normalize('NFKD').encode('ascii', 'ignore').decode('ascii')` pour stripper les caractères non-ASCII
- Script one-shot pour corriger les slugs existants en base : UPDATE news SET slug = normalized_slug WHERE slug ~ '[^\x00-\x7F]'

## Architecture technique

Tous les scripts d'enrichissement :
- Python 3 + psycopg2 (connexion directe Postgres localhost:5433, pas via PostgREST/Supabase client)
- Génération de contenu via `subprocess.run(["claude", "-p", prompt, "--model", model])` (OAuth VPS, pas de tokens consommés)
- Modèle Sonnet pour : descriptions longues top 30 plages, réécriture news
- Modèle Haiku pour : descriptions courtes (plages/restos/hikes), toutes les traductions, filtre pertinence news
- Idempotents (skip si description_en existe et non vide)
- Batch avec pause inter-requête (2s entre appels)
- Logs stdout + fichier `/var/log/cretepulse-enrich.log`
- Parsing réponse : JSON quand possible (traductions groupées), texte brut pour les descriptions

## Ordre d'exécution

1. Phase 2A : Purge news toxiques (nettoyer la base avant tout)
2. Phase 2C : Fix trigger `news_fill_titles` (empêcher la pollution grecque)
3. Phase 5 : Nettoyage sitemap (retirer events/guides/food non enrichis)
4. Phase 6 : Fix slugs non-ASCII dans news.py + correction base existante
5. Phase 3A : Fix bug `/food` (diagnostic + correction front)
6. Phase 1A : Correction données plages + INSERT plages manquantes
7. Phase 1B : Enrichissement top 30 plages (~50 min background VPS)
8. Phase 1C : Enrichissement 136 plages restantes (~100 min background VPS)
9. Phase 3B+3C : Sélection + enrichissement 200 restos (~60 min background VPS)
10. Phase 4 : Enrichissement 50 hikes (~15 min background VPS)
11. Phase 2B : Refonte writer.py (pipeline live pour les futurs articles)
12. Rebuild + deploy Vercel

Les phases 7-10 sont indépendantes et peuvent tourner en parallèle sur le VPS.

## Hors périmètre

- Events (session dédiée, saisonnier)
- Table guides / articles originaux (pas de table, pas de contenu source)
- Traductions descriptions au-delà de EN/FR/DE/EL (les 18 autres langues ne reçoivent que les titres news traduits)
- Newsletter (0 abonnés, pas un problème de contenu)
- Affiliates (IDs placeholder, session séparée)

## Critères de succès

- 0 page avec `description_en` vide dans le sitemap
- Top 30 plages : 500+ mots EN + 3 traductions, données factuelles corrigées
- News : < 100 articles/jour retenus, tous avec titre + summary en 4 langues
- 0 titre grec sur les pages EN/FR/DE
- `/food` affiche les 200 restaurants enrichis
- Build clean, deploy OK, pas de régression
