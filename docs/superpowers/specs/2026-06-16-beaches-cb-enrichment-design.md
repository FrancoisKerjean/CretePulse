# Enrichissement des pages plages avec les données cb_places

**Date :** 2026-06-16
**Branche :** `feat/beaches-cb-enrichment`
**Statut :** spec — en attente relecture Kami

## Contexte

Le site crete.direct expose les plages à travers deux tables Supabase distinctes,
alimentées par deux scrapers différents :

- **`beaches`** (182 lignes) — origine scraper Wikipedia Commons. Couche
  éditoriale : noms multilingues (`name_en/fr/de/el`), flags curatés
  (`parking`, `snorkeling`, `kids_friendly`), `image_url` unique. Alimente les
  pages SEO `/beaches/*` (liste, `[slug]`, `best-for/[activity]`,
  `near/[village]`, `today`) et `/map`.
- **`cb_places`** (2296 lignes dont 475 `place_type=beach`) — origine
  cretanbeaches.com. Couche données terrain riche : `rating`, `water_color`,
  `sand_type`, `depth`, `sea_surface`, `crowds`, `facilities`, `accessibility`,
  galerie `photos` (hébergée sur `media.crete.direct`). Alimente l'explorer
  (`/explore`, carte + drawer), `/match`, `/near-me`.

Les deux tables couvrent en grande partie le **même territoire** : 180/182 plages
de `beaches` ont déjà un équivalent `cb_places` à moins de 1,5 km (mesuré
11/06/2026, `cb-beach-match.ts`). La table `beaches` est par ailleurs pauvre et
parfois fautive : `name_fr/de/el` souvent vides, `type` souvent `null`, flags à
`false` par défaut, et certaines `image_url` Wikipedia montrent la mauvaise
plage (ex. `agios-charalampos-beach` affiche une plage de Thrace).

## Problème

Les données riches de `cb_places` sont déjà partiellement affichées sur la
**fiche détail** `/beaches/[slug]` (attributs traduits en 4 langues via
`cb-beach-labels.ts`, note ★). Trois limites :

1. Le lien `beaches ↔ cb_places` est **recalculé à chaque requête** par
   proximité GPS (`getCbBeachNear`, balayage bbox + haversine). Coûteux et
   potentiellement faux (peut pointer une plage voisine à < 1,5 km).
2. La **galerie photos** `cb_places` n'est pas affichée : la fiche reste sur
   l'`image_url` Wikipedia (médiocre ou fausse).
3. L'enrichissement n'apparaît **que sur la fiche détail** : la liste
   `/beaches`, `best-for` et `near` n'en bénéficient pas.

## Objectif

Verser les données riches de `cb_places` dans les pages `beaches`, en **figeant**
le lien entre les deux tables, sans fusion physique ni changement d'URL.

### Dans le périmètre
- Figer le lien `beaches.cb_slug → cb_places.slug` (colonne + script one-shot).
- Lire le lien figé sur la fiche détail et dans le moteur `swim-today`.
- Afficher la galerie photos `cb_places` sur la fiche détail.
- Afficher note ★ + photo de tête sur la liste `/beaches`, `best-for`, `near`.
- Ajouter un bouton « Voir sur la carte » → `/explore?place=<cb_slug>`.

### Hors périmètre (volontaire)
- Aucune **fusion physique** des deux tables.
- Aucun **changement d'URL** (`/beaches/[slug]` et `/explore/[slug]` inchangés).
- **Pas d'import** des ~290 plages `cb_places` absentes de `beaches` (ce serait
  un chantier « plus de plages » distinct).
- Pas d'amélioration du taux d'appariement au-delà de la revue manuelle des cas
  douteux.

## Conception

### Brique 1 — Figer le lien (`cb_slug`)

**Migration.** Ajouter à la table `beaches` :
- `cb_slug text` (nullable) — slug `cb_places` apparié, ou `NULL` si aucun match
  fiable.
- `cb_match_m integer` (nullable) — distance en mètres au candidat retenu, pour
  audit/debug.

Migration additive, sûre (aucune écriture sur l'existant), réversible.

**Script de matching one-shot** (`scripts/match-beaches-cb.ts`). Pour chaque
plage de `beaches` ayant `latitude`/`longitude` :

1. Candidats = `cb_places` où `place_type='beach'` et coordonnées dans un rayon
   de 1500 m (préfiltre bbox en degrés + haversine exacte).
2. `best` = candidat le plus proche ; `second` = 2ᵉ plus proche.
3. Classification de confiance :
   - **`high`** (auto-lié) : `best ≤ 400 m` **et** (`second` absent **ou**
     `second > 2 × best`). Cas non ambigu, un seul voisin évident.
   - **`review`** (short-list Kami) : un candidat existe ≤ 1500 m mais ne
     satisfait pas `high` (best entre 400–1500 m, ou deux candidats proches).
   - **`none`** : aucun candidat ≤ 1500 m → `cb_slug = NULL`.
4. Sorties du script (lecture seule, n'écrit rien tout seul) :
   - `match-beaches-cb.high.sql` : `UPDATE` prêt à appliquer pour les `high`.
   - `match-beaches-cb.review.md` : tableau des `review` — `beach_slug`,
     `name_en`, et pour chaque candidat : `cb_slug`, `name`, distance. Kami coche
     le bon `cb_slug` (ou `none`).
   - `match-beaches-cb.none.md` : liste des plages sans candidat (info).

**Application.** Une fois la revue faite, un second passage applique les `high` + les choix
de Kami sur la short-list. La table `beaches` n'est modifiée qu'à cette étape
explicite. Un backup de la colonne (export des slugs concernés) est pris avant.

> **Note multi-terminal :** l'écriture en base est un acte conscient de Kami
> (accès Supabase prod), comme pour les autres chantiers GTFS/scraper.

### Brique 2 — Lecture du lien figé

- `cb-beach-match.ts` : `getCbBeachNear(lat, lng)` reste mais devient un
  **fallback**. La fiche détail lit d'abord `beach.cb_slug` ; si présent, on
  charge la ligne `cb_places` correspondante par slug (1 requête indexée).
  `getCbBeachNear` n'est appelé que si `cb_slug` est `NULL` (rétro-compat /
  plages non encore appariées).
- `swim-today.ts` : remplace l'appariement GPS de masse
  (`fetchCbBeaches` + `matchCbBeaches`) par une lecture des `cb_slug` figés des
  plages traitées. `shelterFactor(sea_surface)` est conservé tel quel.

### Brique 3 — Diffuser l'enrichissement

**Précédence photos.** Source d'image unifiée par une fonction
`beachHeroPhotos(beach, cb)` :
- Si `cb.photos` non vide → galerie `cb_places` (et `cb.photos[0]` comme image de
  tête / vignette de liste).
- Sinon → `sanitizeImageUrl(beach.image_url)` (comportement actuel).

**Fiche détail `/beaches/[slug]`.** Ajouter la galerie photos `cb_places`
(carrousel simple, même rendu que le drawer explorer). Les attributs traduits
restent inchangés.

**Liste `/beaches`, `best-for/[activity]`, `near/[village]`.** Chaque carte plage
affiche note ★ (si `rating > 0`) + photo de tête. Pour éviter N requêtes :
`getAllBeaches()` (et les variantes régionales) collectent les `cb_slug` non
nuls et font **une** requête `cb_places` batch
(`.in('slug', cbSlugs).select('slug, rating, photos')`), puis fusion en mémoire.
Sélection légère (pas de `description`).

### Brique 4 — Bouton « Voir sur la carte »

Sur la fiche détail, si `beach.cb_slug` est présent, afficher un bouton/lien
**« Voir sur la carte »** vers `/explore?place=<cb_slug>`. L'explorer gère déjà
ce deep-link (`ExploreView.tsx` lit `?place=slug` au montage et ouvre le drawer).
Vérifier/ajouter le centrage carte (`flyTo` sur le point) si l'ouverture du
drawer ne le déclenche pas déjà ; ajout minimal localisé à `ExploreView`.

## Modèle de données (résumé)

```sql
ALTER TABLE beaches ADD COLUMN cb_slug   text;
ALTER TABLE beaches ADD COLUMN cb_match_m integer;
-- cb_slug pointe (logiquement) vers cb_places.slug ; pas de FK dure car
-- cb_places peut être re-scrapé/réindexé indépendamment. Lecture par slug.
```

## Tests

- **Unitaire (cœur)** : fonction pure de classification de confiance
  `classifyMatch(best, second)` → `high | review | none`, avec fixtures couvrant
  les seuils (400 m, 1500 m, ratio 2×, candidat unique vs multiple).
- **Unitaire** : `beachHeroPhotos` (galerie cb prioritaire, fallback Wikipedia,
  sanitisation `.pdf`).
- **Intégration** : `getAllBeaches` enrichi renvoie bien `rating`/photo pour une
  plage avec `cb_slug`, et reste fonctionnel pour une plage `cb_slug = NULL`.
- Réutilisation des tests existants sur les labels (`cb-beach-labels`).

## Dégradation gracieuse

- `cb_slug = NULL` → la page fonctionne comme aujourd'hui (fallback Wikipedia,
  pas de note/galerie). Aucune régression pour les plages non appariées.
- `cb_places` indisponible (requête échoue) → on sert la donnée `beaches` seule
  (try/catch déjà présent dans `cb-beach-match`).
- Aucune URL modifiée → aucun risque SEO sur les 24K pages.

## Risques

| Risque | Mitigation |
|--------|-----------|
| Faux positif d'appariement (mauvaise plage voisine) | Garde-fou `high` strict (≤ 400 m + candidat unique) + revue manuelle des `review`. |
| Écriture en base prod | Acte conscient Kami, backup colonne avant application, script lecture seule jusqu'à l'`UPDATE`. |
| N+1 requêtes sur les listes | Une seule requête batch `cb_places.in('slug', …)`. |
| Re-scrape `cb_places` casse un `cb_slug` | `cb_slug` pointe par slug ; un slug disparu → fallback gracieux. Re-run du script de matching si refonte `cb_places`. |
