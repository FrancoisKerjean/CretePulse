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
- Corriger les booléens `parking`, `kids_friendly`, `sunbeds`, `taverna`, `snorkeling` et le champ `type` sur toutes les plages via un script de correction basé sur des données vérifiées

**Phase 1B - Enrichissement top 30**
Plages prioritaires : Elafonisi, Balos, Vai, Preveli, Matala, Falassarna, Seitan Limania, Stavros, Georgioupoli, Agia Pelagia, Elounda, Plakias, Paleochora, Sougia, Loutro, Malia Beach, Stalis, Agiofarago, Kedrodasos, Glyka Nera, Damnoni, Triopetra, Frangokastello, Makrigialos, Xerokampos, Sitia Beach, Istro, Almyrida, Marathi, Kalathas

Pour chaque :
- `description_en` : 500-800 mots. Structure : intro (ambiance, ce qui rend cette plage unique), accès (voiture, à pied, bateau), activités, conseils pratiques (meilleure heure, vent, foule), meilleure saison, pour qui (familles, couples, aventuriers)
- `description_fr`, `description_de`, `description_el` : traduction via `claude -p --model haiku`
- Source de vérité pour les faits : connaissance locale Kami + données OSM + Wikipedia

**Phase 1C - Enrichissement 136 restantes**
- `description_en` : 150 mots. Paragraphe unique : type de plage, accès, ambiance, pour qui.
- Traduit EN → FR/DE/EL via Haiku

**Script** : `/opt/cretepulse/enrich-beaches.py`
- Connexion directe Postgres (port 5433)
- Utilise `claude -p --model sonnet` pour les top 30 (descriptions longues)
- Utilise `claude -p --model haiku` pour les 136 autres + toutes les traductions
- Idempotent : skip si `description_en` non vide
- Flag `--force-slug=elafonisi-beach` pour forcer la réécriture d'une plage spécifique
- Batch de 5, pause 2s entre chaque (rate limit VPS)

### 2. News pipeline (refonte writer.py)

**Problème** : `news.py` scrape 500+ articles/jour en grec. `writer.py` est censé les réécrire mais utilise Groq API (payant, qualité variable). 3 298 articles n'ont que le titre grec. Le trigger `news_fill_titles` copie le titre grec dans les champs vides des autres langues, masquant le problème.

**Solution** :

**Phase 2A - Purge articles toxiques**
- DELETE les articles où `title_en = ''` AND `summary_en = ''` AND `title_el != ''` (articles grecs jamais traduits = thin content)
- Estimer le nombre avant de supprimer, confirmer avec Kami

**Phase 2B - Refonte writer.py**
Remplacer Groq par `claude -p` :
1. Le writer récupère les articles non réécrits (`rewritten = false`)
2. **Filtre pertinence** : prompt Haiku "Is this article relevant for a tourist visiting Crete? Score 0-10. Topics: travel, beaches, weather, events, culture, food, transport, safety, real estate. Return ONLY the score." Seuil >= 5.
3. **Réécriture EN** : prompt Sonnet "Rewrite this Cretan news article as a 100-150 word English summary for tourists. Facts only, no opinions. Include: what happened, where, when, why it matters for visitors."
4. **Traduction** : prompt Haiku pour traduire EN → FR/DE/EL (titre + summary)
5. **Titres 18 langues** : prompt Haiku pour traduire uniquement le titre EN vers IT/NL/PL/ES/PT/RU/JA/KO/ZH/TR/SV/DA/NO/FI/CS/HU/RO/AR
6. Marquer `rewritten = true`
7. Articles sous le seuil de pertinence : marquer `rewritten = true` + `category = 'filtered'` (pas supprimés, juste ignorés)

**Cron** : garder le */30 sur `news.py` (scrape), ajouter un cron toutes les heures sur le nouveau `writer.py` (batch 10 articles)

**Phase 2C - Modifier/désactiver le trigger `news_fill_titles`**
Le trigger copie le titre grec vers les champs vides, ce qui fait apparaître du grec dans les pages EN/FR/DE. Soit le supprimer, soit le modifier pour ne copier que dans la même langue.

### 3. Restaurants (top 200)

**Problème** : 1 995 restos en base, 0 descriptions, page `/food` affiche "No results" (bug front).

**Solution** :

**Phase 3A - Fix bug affichage `/food`**
Diagnostiquer pourquoi la page ne montre rien. Probable : filtre côté composant qui attend un champ non rempli, ou PostgREST query qui filtre sur description non nulle.

**Phase 3B - Sélection top 200**
Pas de colonne `rating` en base. Sélection par :
- Type prioritaire : `taverna` > `restaurant` > `cafe` > `bar` > `fast_food`
- Répartition géo : ~110 west (Chania/Rethymno), ~55 east (Lasithi), ~35 central (Heraklion)
- Proximité plages top 30 (bonus)

**Phase 3C - Enrichissement**
- `description_en` : 100-150 mots. Spécialité, ambiance, fourchette de prix indicative, ce qu'il faut commander, localisation par rapport aux attractions proches.
- Traduit EN → FR/DE/EL via Haiku

**Script** : `/opt/cretepulse/enrich-restaurants.py`
- Même pattern que enrich-beaches.py
- Input : nom, type, village, region, cuisine
- Haiku pour tout (descriptions courtes)
- Idempotent, batch 10

### 4. Randonnées (50 pages)

**Problème** : 50 hikes en base avec données structurelles (distance, dénivelé, durée, difficulté) mais 0 descriptions.

**Solution** :
- `description_en` : 150 mots. Ce qu'on voit, niveau requis, meilleure saison, point de départ, conseils (eau, chaussures, horaire).
- Traduit EN → FR/DE/EL via Haiku
- Script : `/opt/cretepulse/enrich-hikes.py`, même pattern

### 5. Nettoyage sitemap

**Problème** : le sitemap référence des sections vides.

**Solution** (dans `src/app/sitemap.ts`) :
- Retirer `/events/*` (table vide, on ne relance pas maintenant)
- Retirer `/articles/*` / `guides` (table inexistante)
- Retirer `/food/[slug]` pour les restos sans description (ne garder que les 200 enrichis)
- Le sitemap est déjà splitté en 22 sub-sitemaps (fix précédent)

### 6. Correction slugs non-ASCII

**Problème** : les articles avec des accents/umlauts dans le slug génèrent des 404.

**Solution** : dans `news.py`, normaliser les slugs avec `unicodedata.normalize('NFKD')` + strip non-ASCII. Script de correction pour les slugs existants en base.

## Architecture technique

Tous les scripts d'enrichissement :
- Python 3, exécutés sur kairos-vps (89.167.115.63)
- Connexion directe Postgres localhost:5433
- Génération de contenu via `claude -p` (OAuth, pas de tokens consommés)
- Modèle Sonnet pour les descriptions longues (top 30 plages, réécriture news)
- Modèle Haiku pour les descriptions courtes et toutes les traductions
- Idempotents (skip si description_en existe et non vide)
- Batch avec pause inter-requête (2s Sonnet, 1s Haiku)
- Logs stdout + fichier `/var/log/cretepulse-*.log`

## Ordre d'exécution

1. Phase 2A : Purge news toxiques (nettoyer avant d'enrichir)
2. Phase 2C : Fix trigger `news_fill_titles`
3. Phase 5 : Nettoyage sitemap (retirer sections vides)
4. Phase 6 : Fix slugs non-ASCII
5. Phase 3A : Fix bug `/food`
6. Phase 1A : Correction données plages + ajouts manquants
7. Phase 1B : Enrichissement top 30 plages (script tourne en background ~1h)
8. Phase 1C : Enrichissement 136 plages restantes (background ~30min)
9. Phase 3B+3C : Sélection + enrichissement 200 restos (background ~40min)
10. Phase 4 : Enrichissement 50 hikes (background ~15min)
11. Phase 2B : Refonte writer.py (le pipeline live pour les futurs articles)

## Hors périmètre

- Events (remis à une session dédiée, saisonnier)
- Table guides / articles originaux (pas de table, pas de contenu source)
- Traductions au-delà de EN/FR/DE/EL pour les descriptions (les 18 autres langues gardent les titres traduits uniquement pour les news)
- Newsletter (0 abonnés, pas un problème de contenu)
- Affiliates (IDs placeholder, session séparée)

## Critères de succès

- 0 page avec `description_en` vide dans le sitemap
- Top 30 plages : 500+ mots EN + 3 traductions, données factuelles corrigées
- News : < 100 articles/jour, tous avec titre + summary en 4 langues
- Pas de titre grec dans les pages EN/FR/DE
- `/food` affiche les restaurants
- Build clean, pas de régression
