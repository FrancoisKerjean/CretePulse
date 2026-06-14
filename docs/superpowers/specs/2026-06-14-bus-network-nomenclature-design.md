# Réseau bus crete.direct — référentiel d'arrêts, lignes nommées, heures de passage

**Date** : 2026-06-14
**Auteur** : Kami + Claude (brainstorming)
**Statut** : design validé, prêt pour plan d'implémentation

## Problème

Le site modélise les bus en **paires de villes**. La table `bus_routes` stocke
`from_place → to_place`, `via_stops` (arrêts intermédiaires en texte brut, non
géolocalisés), `departures_by_day` (uniquement les **heures de départ depuis
l'origine**), `duration`, `price`. Le planner (`src/lib/bus-journey.ts`) et les
85 pages paires raisonnent là-dessus.

Manquent, pour « mapper proprement » :

1. un **référentiel d'arrêts** physiques géolocalisés et dédupliqués ;
2. de vraies **lignes** = séquences ordonnées d'arrêts dans un corridor ;
3. l'**heure de passage estimée à chaque arrêt** (KTEL ne publie que le départ
   du terminus) ;
4. une **nomenclature crete.direct** pour nommer/numéroter les lignes (KTEL n'a
   aucun système de numéros officiel).

## Objectif

Deux usages aval validés (décident le niveau de précision) :

- **Planner plus précis** : pouvoir monter/descendre à un arrêt intermédiaire
  avec heure de passage estimée, et de meilleures correspondances.
- **Carte réseau réelle** : tracés de lignes suivant les vraies routes + arrêts
  géolocalisés cliquables, façon plan de réseau.

**Périmètre V1** : toute la Crète (Est `herlas` + Ouest `ektel`).

## Décisions de cadrage (verrouillées avec Kami)

| Sujet | Décision |
|---|---|
| Précision tracés + heures | **Routing routier réel (OSRM/OSM)**, pré-calculé offline |
| Nomenclature | **Préfixe préfecture + numéro** : `HER-01`, `LAS-02`, `CHA-03`, `RET-04` |
| Direction | Ligne **bidirectionnelle** (mêmes arrêts), offsets retour symétriques en V1 |
| Préfixe multi-préfecture | Préfecture du **terminus origine** (tête de ligne) |
| Granularité des arrêts | **Arrêts nommés par KTEL** (titres de routes) — pas les arrêts « sauvages » à la demande, non publiés |

## Principe directeur

`bus_routes` **reste la source de vérité brute scrapée** (inchangée). On
construit par-dessus un **réseau dérivé** dans de nouvelles tables, reconstruit
au scrape hebdomadaire. Rien dans le pipeline de scrape ni le planner actuel
n'est cassé : le réseau dérivé est additif.

## Modèle de données (3 tables nouvelles)

### `bus_stops` — référentiel d'arrêts unique

| Colonne | Type | Note |
|---|---|---|
| `id` | serial PK | |
| `slug` | text unique | clé de dédup normalisée (`_norm`) |
| `name` | text | libellé d'affichage EN/translittéré |
| `name_el` | text null | grec si connu |
| `lat`, `lng` | double null | null si non géocodable |
| `prefecture` | text | `HER`/`LAS`/`CHA`/`RET` (par proximité géo) |
| `coords_source` | text | `referentiel` / `cb_places` / `geocoded` / `none` |
| `coords_confidence` | text | `high` (~ville connue) / `low` (géocodé approx) |

Construit par dédup de tous les `from_place`, `to_place`, `via_stops` de
`bus_routes`, via la même normalisation `_norm` que `prices.py`.

### `bus_lines` — une ligne = un corridor

| Colonne | Type | Note |
|---|---|---|
| `id` | serial PK | |
| `code` | text unique | nomenclature `PREF-NN` |
| `name` | text | « Heraklion ⇄ Sitia par la côte » |
| `prefecture` | text | préfecture du terminus origine |
| `operator_id` | text | `herlas` / `ektel` |
| `geometry` | jsonb null | polyline du tracé routier réel OSRM (`[[lng,lat],…]`) |
| `color` | text | couleur stable pour la carte (dérivée du code) |
| `length_km` | double null | longueur routière OSRM |
| `total_minutes` | int null | durée terminus→terminus (KTEL si connue, sinon estimée) |

### `bus_line_stops` — séquence ordonnée + profil de temps

| Colonne | Type | Note |
|---|---|---|
| `line_id` | int FK | |
| `stop_id` | int FK | |
| `seq` | int | ordre 0..N dans le sens aller |
| `cumulative_km` | double | distance routière cumulée depuis le terminus origine |
| `cumulative_minutes` | int | **offset de passage depuis le départ** |

PK composite `(line_id, seq)`. C'est la clé des heures de passage.

## Heure de passage — calculée, pas stockée par départ

On **ne stocke pas** un horaire par (départ × arrêt) : ça exploserait
(centaines de départs × dizaines d'arrêts). On stocke **un seul profil par
ligne** (`cumulative_minutes` par arrêt) et on calcule à la volée :

```
heure_passage(arrêt, départ) = heure_départ_terminus + cumulative_minutes[arrêt]
```

`cumulative_minutes` est dérivé des **distances routières OSRM** entre arrêts
consécutifs, puis **mis à l'échelle** pour que le dernier arrêt tombe exactement
sur `total_minutes` (la durée KTEL réelle quand elle existe ; sinon l'enveloppe
estimée de `durations.py`). Toute heure de passage intermédiaire est affichée
**étiquetée « estimé »**.

Sens retour V1 : `cumulative_minutes_retour[i] = total_minutes - cumulative_minutes[N-i]`
(symétrie). Acceptable pour l'affichage ; raffinable en V2.

## Pipeline `build_network.py` (offline, branché sur le scrape hebdo)

Nouveau module dans `scripts/scrapers/buses/`, lancé par `buses.py` **après** le
scrape (donc après que `bus_routes` est à jour), avec garde-fou identique
(ne reconstruit que si le scrape a commité).

1. **Arrêts** : collecte `from`/`via`/`to` de toutes les routes → dédup `_norm`
   → upsert `bus_stops`. Géocodage en cascade : `PLACE_COORDS` (référentiel
   main, `high`) → `cb_places` (match par slug, `high`) → Nominatim
   (`low`, throttlé, caché sur disque) → `none`.
2. **Lignes** : regroupe les routes d'un même corridor. Heuristique = fusion des
   séquences quand l'une est préfixe/sous-séquence de l'autre et même opérateur
   (`A-B-C` + `A-B-C-D` → une ligne `A-B-C-D`). Les variantes incompatibles
   restent des lignes distinctes. Chaque ligne garde le lien vers les
   `bus_routes` qui la composent (pour les horaires).
3. **Tracé + distances** : **un seul appel OSRM par ligne** (table service ou
   route service sur la séquence d'arrêts géocodés) → polyline + distances
   routières inter-arrêts. Résultats **stockés en DB** → zéro dépendance OSRM au
   runtime. Fallback segment droit (haversine) pour tout arrêt non géocodé ou si
   OSRM échoue (`geometry` partielle marquée). La couverture réelle OSRM/KTEL en
   Crète est vérifiée à l'implémentation (spike sur 3-4 lignes avant de
   généraliser).
4. **Profil de temps** : `cumulative_km` → `cumulative_minutes` mis à l'échelle
   sur `total_minutes`.
5. **Nomenclature** : attribue `PREF-NN` (voir ci-dessous), couleur dérivée.
6. **Écriture transactionnelle** : delete+insert des 3 tables réseau, même
   garde-fou `MIN_*` que `store.py` (jamais de réseau vide en prod).

### Nomenclature `PREF-NN`

- Préfixes : `HER` (Heraklion), `LAS` (Lasithi), `CHA` (Chania), `RET` (Rethymno).
- Préfixe = préfecture du **terminus origine** (tête de ligne ; pour une ligne
  bidirectionnelle, le terminus de la plus grande ville / chef-lieu).
- Numérotation : déterministe et **stable entre deux builds** — tri des lignes
  d'une préfecture par (longueur décroissante, puis slug origine, puis slug
  destination), `NN` = rang. L'axe principal d'une préfecture tend vers `01`.
  La stabilité prime : un mapping `code ↔ (origine,destination,operator)` est
  persisté pour ne pas renuméroter une ligne existante quand une nouvelle
  apparaît (les nouveaux codes prennent les rangs libres).

## Intégration produit

### Planner (`src/lib/bus-journey.ts`)

- Nouvelle lecture des tables réseau (`bus_lines` + `bus_line_stops`).
- Fonctionnalité « descendre/monter à un arrêt intermédiaire » : pour une route
  donnée, exposer les arrêts de la ligne avec `heure_passage` estimée.
- Correspondances : inchangées en logique (1 hub max), mais les heures de
  passage intermédiaires affinent les marges.
- **Rétrocompat** : si une route n'a pas de ligne dérivée (arrêts non
  géocodés), le planner dégrade vers le comportement actuel (from→to). Aucun
  chemin existant ne casse.

### Carte réseau (MapLibre)

- Nouveau calque : `bus_lines.geometry` en polylines colorées par `code` +
  `bus_stops` en marqueurs cliquables.
- Popup arrêt : nom, lignes qui le desservent (codes + couleurs), prochains
  passages estimés (réutilise `athens-time.ts` + le profil de temps).
- **Mockup validé par Kami AVANT déploiement** (règle `feedback-mockup-avant-deploy`).
- Repli SSR/indexabilité : la liste des lignes (codes, arrêts) reste dans le DOM
  (le canvas MapLibre est invisible à Google — leçon Phase 13).

## Non-objectifs (YAGNI V1)

- Pas de pages SEO `/buses/ligne/[code]` en V1 (réservé si la fondation tient ;
  le code nomenclature est conçu pour les alimenter plus tard sans refonte).
- Pas d'arrêts « sauvages » non publiés par KTEL.
- Pas de profil de temps retour asymétrique (symétrie V1).
- Pas de routing OSRM au runtime (tout pré-calculé).
- Pas de GTFS export (le modèle s'en approche mais n'est pas un objectif).

## Limites honnêtes (assumées, à afficher)

- Heures de passage intermédiaires = **estimées** (interpolation routière
  calibrée sur la durée KTEL), jamais publiées par KTEL → étiquette « estimé »
  partout.
- Géocodage `low` pour les arrêts hors référentiel → précision ~1 km, suffisante
  pour la carte et l'estimation, marquée `coords_confidence`.
- Couverture OSM/KTEL en Crète rurale incertaine → fallback segment droit
  documenté, pas de blocage.

## Stratégie de test

- `build_network.py` : pytest sur fixtures (dédup arrêts, fusion de séquences,
  mise à l'échelle du profil de temps, attribution `PREF-NN` stable, fallback
  géométrie). Pattern TDD comme les parsers existants.
- `bus-journey.ts` : extension de `scripts/check-bus-journey.mjs` (heure de
  passage intermédiaire, dégradation sans ligne dérivée).
- Vérif réseau : un script de sanity (`scripts/check-bus-network.mjs`) =
  invariants (chaque ligne ≥ 2 arrêts, `seq` continu, `cumulative_minutes`
  croissant, dernier = `total_minutes`).
- Spike OSRM sur 3-4 lignes réelles avant généralisation.

## Risques

| Risque | Mitigation |
|---|---|
| Couverture OSRM/OSM faible en Crète | Spike d'abord ; fallback haversine ; tracé reste affichable |
| Fusion de corridors trop agressive (lignes fusionnées à tort) | Heuristique conservatrice (préfixe strict, même opérateur) ; revue manuelle des lignes produites |
| Renumérotation instable des codes | Mapping `code ↔ ligne` persisté ; nouveaux codes sur rangs libres |
| Contention VPS pendant le build (leçon Phase 7) | Build réseau jamais pendant un deploy Vercel ; throttle Nominatim |
| Arrêts non géocodés cassent une ligne | Fallback segment droit + dégradation planner ; `coords_source=none` traçable |
