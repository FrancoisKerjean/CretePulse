# Réseau bus - Sous-projet 4 : carte live estimative

**Date** : 2026-06-15
**Auteur** : Kami + Claude (brainstorming)
**Statut** : design validé, prêt pour plan d'implémentation
**Prédécesseurs** :
- SP1 (`2026-06-14-osm-bus-network-ingestion-design.md`) : réseau OSM en prod (489 stops / 78 lignes / 835 line_stops, `geometry` + `bus_line_stops.cumulative_km/minutes`).
- SP2 (`2026-06-14-ktel-apparier-design.md`) : horaires KTEL appariés aux tracés. **Déployé en prod le 15/06** : `bus_routes.line_id` peuplé (196 routes appariées, ~48 % des paires) + 78 lignes fallback `source='ktel'`. La dépendance de SP4 est levée.

**Coordination moteur (arbitrage Kami 15/06)** : le moteur de position est une **couche partagée unique** `src/lib/bus-live/` (spec `2026-06-15-bus-live-engine-design.md`), développée dans **ce même worktree** (`cretepulse-live`, branche `feat/bus-live-map`) — pas d'endpoint serveur, pas de second worktree. L'ancien découpage « moteur = autre terminal (cretepulse-sp3) » est abandonné ; moteur + carte vivent ensemble, le découpage reste une frontière de **couches** (headless vs rendu), pas de terminaux.

## Vision

Une carte animée de la Crète où **tous les bus avancent en direct estimatif** : leur position est calculée à l'instant courant depuis l'horaire de départ + le tracé + le profil de temps. Aucun GPS. Badge honnête « position estimée selon l'horaire ». C'est la preuve visible que la chaîne données -> carte fonctionne, et la fondation sur laquelle le GPS réel se branchera plus tard.

## Contexte

La donnée nécessaire existe déjà en base (Postgres self-hosted VPS, lu via PostgREST/supabase-js) :
- `bus_lines.geometry` : polyligne `[[lng,lat], ...]` du tracé (OSRM, ex 485 points pour LAS-07 Agios Nikolaos<->Elounda).
- `bus_line_stops.seq / cumulative_km / cumulative_minutes` : profil de temps par arrêt.
- `bus_routes.departures` (`string[]`, ex `["09:00","11:00","13:00","16:00"]`), `frequency`, `departures_by_day`, `line_id` (FK SP2 vers la ligne desservie).

**Point clé** : le composant carte existant `BusNetworkMap.tsx` est un plan **schématique** style métro (coordonnées inventées en viewBox, gardé ainsi pour le SEO). Il ne peut pas porter des bus à leur vraie position. SP4 est donc une **nouvelle surface géographique** (MapLibre, déjà dans la stack via `ExploreView`/`MapView`), pas une modification du SVG Beck.

## Objectif

- Page `/[locale]/live` : carte de Crète plein écran, marqueurs bus qui avancent selon l'horaire, rafraîchis en continu.
- **Calcul 100 % client**, sur données statiques chargées une fois. Aucune infra temps réel (pas d'endpoint, pas de WebSocket, pas de stockage).
- **Critère de succès vérifiable** : pour la ligne LAS-07 (Agios Nikolaos<->Elounda, profil arrêts 0/1/22/30/37 min), avec un départ à 09:00, le moteur place le bus à 09:22 entre Ellinika (22 min) et l'arrêt suivant, au bon point du tracé. Test unitaire sur fixture.

## Décisions de cadrage (verrouillées avec Kami au brainstorming)

| Sujet | Décision |
|---|---|
| Source de position v1 | **Estimatif** (horaire + profil de temps), pas de GPS. GPS réel = SP5/futur. |
| Méthode d'estimation | **Calcul déterministe** (interpolation), pas d'IA en v1. IA d'affinage des retards = futur. |
| Infra | **Zéro temps réel** : tout se calcule dans le navigateur à partir des horaires/tracés. |
| Surface | Nouvelle page `/live`, carte **MapLibre** géographique. Pas le SVG Beck (réservé SEO). |
| Honnêteté | Badge « estimé selon l'horaire ». Le style « EN DIRECT » reste en réserve pour le GPS. |
| Source réseau | `bus_routes.line_id` (SP2, **en prod depuis le 15/06**) joint horaires et tracés. v1 affiche les lignes appariées (~48 % et croissant) ; les lignes sans `line_id` sont ignorées. Mapping temporaire = secours, plus nécessaire. |
| Fuseau | Heure de référence = **Europe/Athens** (les `departures` KTEL sont en heure locale Crète, le visiteur peut être ailleurs). |
| Charte | Palette aegean/terra/sand, chiffres en mono, pastille live pulsante (cohérent design « données vivantes » 11/06). |

## Architecture & modules

| Fichier | Responsabilité |
|---|---|
| `@/lib/bus-live/` (couche moteur — spec `2026-06-15-bus-live-engine-design.md`, **même worktree**) | **Importé, jamais réécrit ici.** `busesAt(now, network) -> LiveBus[]` (moteur pur `position.ts`) + `loadLiveNetwork()` (`network.ts`, chargement client `supabase` anon, jointure `bus_routes.line_id`) + types (`LiveBus`). SP4 ne contient AUCUN code moteur. |
| `src/components/live/LiveMap.tsx` | Carte MapLibre (réutilise le setup `ExploreView`/`MapView`) : fond + tracés des lignes. |
| `src/components/live/LiveBusLayer.tsx` | Animation : tick (`setInterval` ~2 s) + interpolation fluide (`requestAnimationFrame`, `setLngLat`) pour que les marqueurs glissent sans saut. |
| `src/app/[locale]/live/page.tsx` | Page : carte plein écran + badge « estimé » + légende + compteur de bus en circulation. |

## Le moteur (délégué à la couche `bus-live`)

Le moteur de position n'est **pas (re)défini ici**. Il est spécifié, testé et possédé par `2026-06-15-bus-live-engine-design.md` (couche `src/lib/bus-live/`, même worktree). SP4 l'**importe** :

```ts
import { busesAt, loadLiveNetwork, type LiveBus } from "@/lib/bus-live";
```

SP4 consomme le contrat `LiveBus` (`lat`, `lng`, `bearing`, `nextStop`, `etaMinNext`, `headsign`, `progress`, `direction`, `degraded`) et **ne teste pas l'interpolation** (couverte par `scripts/check-bus-live.mjs`). Voir « Gestion du sens » et « Type LiveBus » dans le spec moteur.

## Tests (TDD)

Les tests du **moteur** (`elapsedToKm`, `kmToPoint`, `activeDepartures`, `busesAt`, sens arrière, KTEL-fallback) appartiennent à la couche `bus-live` (`scripts/check-bus-live.mjs`). SP4 teste ce qui lui est **propre** :

| Test | Assertion |
|---|---|
| interpolation d'animation | entre deux ticks (≈2 s), le marqueur glisse de façon monotone de `posₜ` vers `posₜ₊Δ` (RAF, `setLngLat`), sans saut. |
| `visibilitychange` | au retour de focus, recalcul complet `busesAt(athensNow(), network)` (pas de dérive des timers throttlés). |
| compteur | « N bus en circulation » = `busesAt(...).length`, honnête (0 hors plage horaire). |

## Périmètre

**Dans SP4 v1** : page `/live`, carte MapLibre + tracés, moteur d'estimation (TDD), couche bus animée, badge « estimé », démarrage sur N lignes, généralisation auto au merge SP2.

**Hors SP4 (futur)** : GPS réel / sonde passager / app native / style « EN DIRECT » ; IA d'affinage des retards ; notifications ; i18n au-delà de en/fr/de/el dans un premier temps.

## Dépendances & déploiement

- **Données** : SP1 (tracés/arrêts) **et SP2** (`bus_routes.line_id`, 196 routes) **tous deux en prod le 15/06** -> SP4 joint horaires<->tracés directement, aucun mapping requis. La couverture (~48 % des paires) monte avec la curation des alias KTEL ; les lignes sans `line_id` ne sont pas affichées en v1.
- **MapLibre** : déjà installé (utilisé par `ExploreView`).
- **Déploiement** : preview Vercel d'abord (voir la carte bouger hors prod). Merge `master` -> `main` = acte conscient, après validation Kami. SP4 est la première surface front qui lit `bus_lines`/`bus_line_stops`/`bus_routes`.

## Risques

| Risque | Mitigation |
|---|---|
| Position estimée prise pour du réel | Badge explicite « selon l'horaire », jamais « live » avant le GPS. |
| Profil de temps OSM approximatif | Suffisant pour de l'estimatif ; l'IA d'affinage viendra plus tard. |
| Lignes fallback KTEL (géométrie droite 2 terminus) | **Décision Kami 15/06** : le moteur les produit (`degraded:true`), la carte les **affiche marquées « tracé approximatif »** (densité visible dès la v1, honnêteté préservée par le marquage). |
| Onglet inactif (timers throttlés) | Recalcul complet au retour de focus (`visibilitychange`). |
| Densité visuelle faible hors saison | Compteur honnête « N bus en circulation » ; la densité monte avec la saison. |
