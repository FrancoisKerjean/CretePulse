# Spec — Planner citybus bidirectionnel (Heraklion + Chania)

Date : 2026-07-10 · Branche : `feat/citybus-bidirectional` · Statut : validé recon, en implémentation

## Problème

Le planner urbain citybus (`/buses/heraklion`, `/buses/chania`) ne couvre qu'une minorité
des paires d'arrêts : **HER 38,2 % / CHA 29,8 %** de paires aléatoires avec au moins un
trajet (direct ou 1 correspondance), mesuré sur 3000 paires seedées. Cause racine : l'API
`rest.citybus.gr` ne publie dans `lines[].routes` **qu'un seul sens par ligne**
(HER : 79/81 routes direction=2 ; CHA : 43/46 direction=1). Le sens retour n'existe pas
dans nos données : on sait planifier Elmepa vers Aerodromio mais pas le retour.

## Découverte recon (2026-07-10, vérifié live)

Les routes retour **existent en amont avec leurs propres codes**, absentes de `/lines`
mais découvrables via `/{lang}/{agency}/trips/stop/{stopCode}/day/{day}` :
- Arrêt 9911 (ΤΣ ΑΕΡΟΔΡΟΜΙΟ) : 195 départs/jour sur des routeCodes `21009, 21018, 1008,
  21033…` dont la plupart sont absents de `lines[].routes`.
- Leurs séquences répondent sur `/el/110/routes/{code}/sequence` (ex : `1008` = 63 arrêts
  depuis l'aéroport).
- Le réseau a des **arrêts jumeaux par sens** (ex : `9911 ΤΣ ΑΕΡΟΔΡΟΜΙΟ` vs `9311 ΤΣ
  ΑΕΡΟΔΡΟΜΙΟ ΕΠΙΣΤΡΟΦΗΣ`) : l'aller et le retour ne desservent pas les mêmes codes d'arrêt.
- Chaque trip porte `lineCode`, `routeCode`, `routeName`, heure — de quoi rattacher la
  route cachée à sa ligne.

## Approches considérées

1. **Découverte trips-by-stop (RETENUE)** : scanner les départs de tous les arrêts connus
   pour collecter les routeCodes cachés, puis fetch leurs vraies séquences. Données
   physiquement exactes, exhaustif, coût = ~25 min de fetch pacé (script manuel, rare).
2. **Miroir des séquences existantes (REJETÉE)** : inverser les stops des routes publiées.
   Zéro appel API mais physiquement faux : sens uniques, arrêts jumeaux de l'autre côté
   de la rue avec d'autres codes. Produirait des itinéraires mensongers.
3. **Pattern des codes (REJETÉE)** : `31018` retour = `21018`, `39310` retour = `29310`…
   mais `0032`/`1008` ne suit pas le pattern. Non documenté, incomplet, fragile.

## Design

### 1. `scripts/citybus_fetch.mjs` — étape « hidden routes »

Après le fetch des séquences publiées :
- Pour chaque arrêt du réseau × jour ∈ {1, 6, 7} (lundi/samedi/dimanche = les 3 régimes
  horaires), `GET /{el}/{agency}/trips/stop/{code}/day/{d}`, pacing 250 ms, retry 401
  (re-scrape token), 404 = vide.
- Collecter les `routeCode` absents des routes publiées, avec `lineCode` + `routeName`.
- Fetch `/el/{agency}/routes/{code}/sequence` pour chaque code caché (≥2 arrêts sinon skip).
- Dump enrichi rétro-compatible : `dump.hiddenRoutes = [{code, lineCode, name}]` +
  séquences ajoutées à `dump.sequences`.
- Volume : HER 527×3 + CHA 474×3 ≈ 3000 appels ≈ 2×12 min. Acceptable (manuel, rare).

### 2. `scripts/citybus_ingest.mjs` — merge des routes cachées

- Les routes cachées rejoignent `l.routes` de leur ligne avant le build (name via
  `displayName`, `direction` = opposé de la majorité des routes publiées de la ligne,
  `hidden: true` en interne).
- Les nouveaux arrêts (côté retour) entrent dans `usedCodes` donc dans le `.ts` et dans
  l'upsert Supabase `bus_stops` (avec `api_code` : bonus StopSheet live sur ces arrêts).
- **`primary` (bus_line_stops + totalMinutes/lengthKm de la ligne) reste choisi parmi les
  routes PUBLIÉES uniquement** : zéro churn sur la carte /live et les cumulés existants.
- Lignes inconnues référencées par un trip (hors `lines`) : loggées et ignorées.

### 3. `src/lib/citybus/engine.ts` — arrêts jumeaux

Même avec les deux sens, un utilisateur qui choisit l'arrêt du mauvais côté n'a aucun
trajet. Robustesse : `findTrips(from, to)` étend origine et destination aux arrêts situés
à **≤ 150 m** (précalcul lazy des voisins par arrêt). Pénalité de marche
(`walkMinFromKm`) ajoutée au `totalMinutes` des trajets partant/arrivant d'un jumeau ;
les legs affichent déjà le nom réel de l'arrêt utilisé, donc l'UI reste honnête sans
changement. Signature publique inchangée.

### 4. `scripts/citybus_coverage.mjs` — mesure

Script de mesure réutilisable : N=3000 paires aléatoires seedées (seed fixe pour
comparabilité), rapporte direct / 1 correspondance / sans trajet, par ville, avec et sans
extension jumeaux. Sert de critère d'acceptation et de non-régression future.

## Critères d'acceptation

- Couverture totale mesurée : **HER ≥ 70 %, CHA ≥ 60 %** (sinon investiguer et rapporter
  le vrai plafond du réseau).
- `tsc` + `next build` verts. Module agnik (`urban-journey.ts`) non touché.
- Cumuls monotones sur toutes les routes (check ingest existant).
- `/live` inchangé (primary stable, pas de réordonnancement bus_line_stops).
- Taille data client mesurée avant/après (les `.ts` sont passés en prop d'un composant
  client) ; si le delta gzip dépasse ~80 KB, envisager un dégraissage (noms de routes
  cachées raccourcis) en follow-up, pas bloquant.

## Hors scope (follow-ups notés)

- Horaires réels : les trips donnent les heures de passage exactes → un jour, vrais
  horaires + bus estimés `/live` pour HER/CHA. Pas maintenant.
- Dédup des arrêts jumeaux dans la recherche (`stopOptions`) : cosmétique.
- Couche `/live` citybus-stops pour les nouveaux arrêts retour hors primary.
