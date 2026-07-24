# Near-me arrêt-centré + normalisation ciblée des noms bus

Date : 2026-06-17
Statut : design validé (brainstorming), à transformer en plan d'implémentation
Auteur : Kami + Claude

## 1. Problème

Un voyageur à un arrêt de bus de Crète (ex. **Pachia Ammos**) ouvre `/near-me` et
veut voir **son arrêt**, **les lignes qui le desservent** et les **horaires de passage
estimés** par destination. Aujourd'hui ce n'est pas le cas, pour deux raisons vérifiées
sur les données de prod (17/06/2026, PostgREST) :

1. **`/near-me` lit la mauvaise couche.** Sa section « Ton arrêt de bus » est alimentée
   par `bus_routes` (377 liaisons **terminus-à-terminus**, via `BUS_PLACE_SLUGS` ∩
   `SLUG_COORDS`). Elle ne voit donc que des villes-terminus, pas les arrêts
   intermédiaires. Pachia Ammos n'est pas un terminus → il n'apparaît pas, alors qu'il
   existe dans `bus_stops` (id `1179`, slug `pakheia-ammos`).
2. **Le modèle near-me est liaison-centré, pas arrêt-centré.** Il affiche l'arrêt le plus
   proche + une liste plate d'horaires de départ, sans les lignes/destinations qui
   passent par cet arrêt.

La couche arrêt existe pourtant déjà : **517 arrêts** dans `bus_stops` (tous géolocalisés),
reliés aux lignes via `bus_line_stops`, issus du chantier GTFS. Pachia Ammos y est
desservi par 2 lignes : **LAS-04** (Agios Nikolaos ↔ Ierapetra) et **LAS-02**
(Agios Nikolaos ↔ Siteia).

En parallèle, **64 lignes sur 169 n'ont aucun horaire** rattaché : OSM contient toutes les
lignes (y compris les bus de ville), mais on n'a scrapé que le KTEL interurbain, et
l'appariement OSM↔KTEL casse sur des noms grecs mal translittérés (`ERAKLEIO`,
`REThUMNO`, `KhANIA`, `KsULOSKALO`). ~45 des 64 sont des bus urbains (hors périmètre) ;
**~14 sont de vraies lignes touristiques récupérables** (Heraklion↔Rethymno, Elafonisi,
Falasarna, Samaria, Preveli, Sfakia, Balos), perdues uniquement sur l'orthographe.

## 2. Objectif et critères de succès

Livrer une section near-me **arrêt-centrée** qui, pour la position de l'utilisateur,
affiche le ou les arrêts proches **desservis** avec, **par destination**, le prochain
passage estimé — et augmenter la couverture en réparant l'appariement des lignes
touristiques.

Critères de succès :

- À Pachia Ammos, `/near-me` affiche « vers Sitia ~HH:MM · vers Ierapetra ~HH:MM ·
  vers Agios Nikolaos ~HH:MM » + CTA planificateur prérempli.
- Couverture : **219 arrêts** (42 % des 517) dès WS2 seul ; **≈ 275 arrêts** (53 %)
  après WS1 (normalisation).
- La position de l'utilisateur **ne quitte jamais le navigateur** (contrainte ADN de
  near-me, écrite dans la page, la FAQ et la privacy policy en 4 langues).
- Bonus mesurable : les ~14 lignes réparées par WS1 obtiennent aussi leur **tracé sur
  `/live`** (même appariement `bus_routes.line_id`).

## 3. Périmètre

**Inclus**
- WS1 — Normalisation **ciblée** des noms dans le pipeline d'appariement KTEL↔OSM.
- WS2 — Section near-me arrêt-centrée (lib moteur + UI), architecture hybride B.

**Hors périmètre (explicitement)**
- Horaires des **bus de ville** Chania/Heraklion (~45 lignes orphelines : autre opérateur,
  jamais scrapé).
- **Normaliseur de translittération général** (Kh→Ch, Ks→X…) : risque de fusion à tort,
  reporté à un chantier dédié.
- GPS / temps réel : les passages restent **estimés** d'après l'horaire.
- Intégration au **planificateur / pages paires** : le moteur WS2 est conçu réutilisable,
  mais son câblage ailleurs est un chantier ultérieur.
- Les ~80 dessertes rurales villageoises (1 bus/j, intérêt touristique faible).

## 4. Données (modèle existant, vérifié prod)

- `bus_stops` (517) : `id, slug, name, lat, lng`. Tous géolocalisés.
- `bus_line_stops` : `line_id, stop_id, seq, cumulative_km, cumulative_minutes`
  (arrêts ordonnés seq 0→N le long de la ligne).
- `bus_lines` (169) : `id, code, source('osm'|'ktel'), geometry, total_minutes,
  length_km, partial_geo`.
- `bus_routes` (377) : `from_place, to_place, line_id, departures_by_day, duration,
  price_eur, duration_estimated, …`. **100 % ont `departures_by_day`** (grille par jour
  de semaine). `line_id` non nul sur 212/377.
- Une ligne est « à horaire » si ≥1 `bus_route` pointe vers elle (105/169 aujourd'hui).

## 5. Architecture — Approche B (hybride)

Deux ateliers indépendants.

### WS1 — Appariement GPS (Python / VPS)

> **MAJ 18/06/2026 — approche révisée (décision Kami).** La normalisation des noms
> (décrite ci-dessous, conservée pour contexte) est ABANDONNÉE au profit d'un
> **appariement par coordonnées GPS** : les noms KTEL/OSM sont trop incohérents pour un
> matching fiable ; la géographie ne ment pas. Plan dédié :
> `docs/superpowers/plans/2026-06-18-ws1-appariement-gps.md`. Cible = branche
> `feat/bus-network` (où vit le pipeline d'appariement), pas master.

Le pipeline d'appariement (`ktel_resolve.py`, `ktel_apparier.py`, `net_places.py`,
tracés dans le repo et déployés `/opt/cretepulse`) lie chaque `bus_route` scrapé à une
ligne OSM en posant `bus_routes.line_id`. Cet unique appariement alimente **à la fois**
le tracé `/live` (la route hérite d'une géométrie) **et** l'horaire de la ligne (la ligne
devient « à horaire » → ses arrêts s'allument dans near-me).

Cause racine (vérifiée par l'audit du 17/06 11:16) : `ktel_resolve.resolve()` fait un
lookup **exact** `_norm(name)` sans curation, et la curation `net_places` (ALIAS_FIX +
filtre bruit) **n'est pas câblée** dans le résolveur.

Fix ciblé :
1. **Câbler `net_places`** (ALIAS_FIX + filtre bruit) dans `ktel_resolve.resolve()`.
2. **Strip des suffixes pollués** avant résolution : `Every Day`, `-Express`,
   `(… Gorge)` / `(Samaria Gorge)`, ` Old Road`, `, On The National Road`.
3. **Ajouter les coords manquantes** à `PLACE_COORDS` : `Vai`, `Agia Irini`, `Pelekanou`.
4. **Rejouer l'appariement** → re-peuple `bus_routes.line_id`.

Cible de validation : les **14 lignes** touristiques récupérables (HER-02
Heraklion↔Rethymno, CHA-07 Elafonisi, CHA-22 Falasarna, CHA-09/CHA-46 Samaria,
RET-05 Preveli, RET-06/RET-07 Imbros/Sfakia, RET-19 Spili, CHA-17/CHA-21 Kissamos,
CHA-38/39 port, CHA-10 Sougia-Paleochora) obtiennent un `line_id` ; et le nombre de
trajets sans tracé (165) baisse d'autant.

**Garde-fou** : ne PAS retirer le bruit hôtel du **planificateur** (un client à un pickup
d'hôtel veut quand même un itinéraire). La curation ne sert qu'à l'**appariement de
tracé/ligne**, pas à supprimer des liaisons de `bus_routes`.

### WS2 — Near-me arrêt-centré (TypeScript / Next.js)

Côté serveur (`near-me/page.tsx`, ISR 30 min) : sérialiser le **graphe statique** vers le
client — arrêts (`id, name, lat, lng`), leur appartenance aux lignes avec offset
(`line_id, cumulative_minutes`, `line.total_minutes`), et pour chaque ligne ses routes à
horaire (`departures_by_day`, `duration`, `to_place`, sens). Payload borné, mis en cache.

Côté client : géolocalisation locale (existant `useGeoPosition`, la position ne sort pas
du navigateur), puis pour les **1 à 3 arrêts retenus** seulement, calcul des passages
estimés à l'heure courante. Le décompte vit avec l'horloge sans re-fetch.

Réutilise les primitives déjà écrites dans `src/lib/bus-live/` (`orientRoute`,
`elapsedToKm`) et le pattern « fonctions pures côté client » du planificateur
(`bus-journey.ts`).

Nouveau module pur : `src/lib/stop-departures.ts` (testable Node, zéro I/O), réutilisable
plus tard par le planificateur.

## 6. Moteur de passage estimé (cœur de WS2)

Pour un arrêt `S` sur une ligne `L` (position `cumulative_minutes = c_S`, total
`L.total_minutes = T`) et une route à horaire `R` (départs `{t_i}`, durée réelle `D_R`,
destination `R.to_place`) :

- **Fraction de parcours** à `S`, dans le sens de circulation de `R` (orientation via
  `orientRoute(R, L)`) :
  - sens direct : `f = c_S / T`
  - sens inverse : `f = (T − c_S) / T`
- **Passage estimé** à `S` pour le départ `t_i` : `t_i + f × D_R`.
- **Proratisation volontaire** : on multiplie par la **durée réelle KTEL** `D_R`, pas par
  `T` (géométrie OSM), pour absorber l'écart OSM↔KTEL (ex. LAS-04 `T=104` min ≠ durée
  trajet `40` min).
- **Span** : ne compter `R` que si `S` est **entre** les deux terminus de `R` le long de
  `L` (par position cumulée). Une route ne couvrant qu'un sous-tronçon ne « passe » pas
  un arrêt hors de son span.
- **Groupement par destination** : regrouper les passages estimés par `R.to_place`,
  garder le(s) prochain(s) ≥ heure d'Athènes. Si `duration` manque (route sans `D_R`),
  afficher la destination **sans horaire estimé** (« horaires au guichet »), pas une
  estimation fausse.

Sortie : `getStopDepartures(stopId, graph, nowAthens)` →
`Array<{ destination, lineCode, nextTimes: string[], estimated: true, durationKnown }>`.

## 7. UX / affichage

Section « Ton arrêt de bus » :
- **Arrêt mis en avant** = le plus proche **desservi** (qui a ≥1 passage estimable) ;
  jusqu'à **2 arrêts alternatifs** proches en secondaire (gère « marche 300 m pour mieux »).
- Par arrêt : nom + distance, puis **par destination** une ligne : « vers {to_place}
  ~HH:MM » (1-2 prochains passages), avec mention **« estimé »** et `~`.
- Note méthodo courte (« passages estimés d'après l'horaire, pas de GPS »), cohérente avec
  le badge « indicatif » du planificateur et le « estimé d'après l'horaire » de `/live`.
- CTA « Tous les horaires d'ici » → `/buses?from={stop.name}` (existant).
- 4 langues inline (en/fr/de/el) + fallback EN, comme le reste de near-me.
- Tracking Plausible : événement existant `Near Me` (section `bus`), sans donnée de
  position.

## 8. Edge cases

- **Arrêt sur une ligne sans horaire** (les 298 « noirs ») : il peut être l'alternatif,
  affiché avec ses lignes mais « horaires au guichet », jamais une estimation inventée.
- **Plus de passage aujourd'hui** : afficher le **premier** passage de demain, marqué
  comme tel (parité avec `bus-departures.ts`).
- **Hors Crète / position refusée** : comportement existant (sélecteur manuel) inchangé.
- **Aucun arrêt desservi à proximité** : message clair + lien `/buses`.
- **Durée KTEL manquante** : destination affichée sans horaire estimé.
- **Route en sous-tronçon** : exclue si `S` hors span (cf. §6).

## 9. Tests

- `stop-departures.ts` : suite Node pure (à la `check-bus-journey.mjs`) — orientation
  directe/inverse, proratisation, span, groupement par destination, filtrage heure,
  bascule demain, durée manquante. Cas réel ancré : **stop 1179 Pakheia Ammos** sur
  LAS-02 + LAS-04 → 3 destinations attendues.
- WS1 : tests Python sur la résolution (noms pollués → résolus), non-régression du
  planificateur (aucune liaison `bus_routes` supprimée).
- Vérif prod post-déploiement : `/fr/near-me` (Playwright, position simulée Pachia Ammos)
  + recomptage `bus_routes.line_id` (165 → attendu plus bas) + 1-2 pages `/live` des
  lignes réparées (UA navigateur).

## 10. Risques et garde-fous

- **Multi-terminal** : WS1 touche le pipeline d'appariement précédemment investigué par un
  autre terminal (entrée 17/06 11:16). Monopole confirmé par Kami, mais re-`git fetch`
  avant d'écrire et vérifier l'état des fichiers `ktel_*` / `net_places` avant modif.
- **Contention build Vercel** : ne pousser que `master:main` au déploiement, annuler les
  builds redondants (pattern connu). Pas de gros job DB VPS pendant un build.
- **Estimation trompeuse** : la proratisation OSM↔KTEL peut dériver sur longue distance →
  mention « estimé » obligatoire, jamais d'heure ferme.
- **Confidentialité** : aucune position envoyée au serveur (rejette l'approche API).

## 11. Séquencement

WS2 est livrable **seul** sur les 219 arrêts (valeur immédiate, dont Pachia Ammos).
WS1 monte ensuite la couverture à ~275 et répare les tracés `/live`. Les deux sont
indépendants ; ordre conseillé : WS2 d'abord (valeur visible vite), WS1 ensuite.
