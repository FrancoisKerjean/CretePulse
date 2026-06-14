# Position exacte sur l'Explorer — Design

Date : 2026-06-14
Projet : cretepulse-build (crete.direct)
Statut : validé (brainstorming), prêt pour plan d'implémentation

## Problème

Sur `/explore`, le bouton « Autour de moi » (`toggleNearMe` dans
`src/components/explore/ExploreView.tsx`) appelle uniquement le GPS du navigateur
(`useGeoPosition.requestGeo()`) puis trie la liste par distance. Deux manques :

1. **Aucun marqueur « vous êtes ici »** sur la carte : le tri proximité est invisible
   géographiquement, l'utilisateur ne voit pas son point d'origine.
2. **Aucun moyen de fixer/corriger sa position exacte** : si le GPS est imprécis
   (cas fréquent sur mobile en bord de mer / montagne) ou refusé, le bouton se grise
   et l'utilisateur est bloqué. Il ne peut pas dire « je suis *ici* précisément ».

Demande Kami : « quand on clique proche de moi, on puisse mettre la localisation
exacte de là où on se trouve, pour voir plus facilement ce qu'on a à côté ».

## Décision d'interaction (validée)

**GPS puis point déplaçable.** Un clic pose un marqueur via GPS, que l'utilisateur
peut ensuite glisser-déposer pour corriger. Fonctionne aussi quand le GPS est
refusé/indisponible (le point est posé au centre de la vue, à déplacer).
Un **cercle de rayon** matérialise « ce qu'on a à côté ».

## Comportement

1. Clic sur **« Autour de moi »** (desktop + mobile) :
   - active le tri proximité (`nearActive = true`) ;
   - si aucune position connue, déclenche `geo.requestGeo()` (GPS) ;
   - à la réception de la position, pose un marqueur **« Vous êtes ici »** distinct
     et recentre la carte dessus (`flyTo`, zoom ≥ 11).
2. Le marqueur est **glissable** (souris + tactile). À chaque `dragend` :
   - `geo.setPosition(lat, lon)` met à jour la position d'origine ;
   - la liste, les badges « X km » et le cercle de rayon se recalculent en temps réel
     (déjà câblés via le `useMemo` `displayed` → `nearestBy(geo.pos)`).
3. **GPS refusé / indisponible** : au lieu de griser le bouton, on pose le point au
   **centre de la vue courante**, statut `"pinned"`, avec un indice transitoire
   « Glissez le point sur votre position ». L'utilisateur reste autonome.
4. **Cercle de rayon** : un anneau de ~10 km de rayon centré sur le point, rendu sous
   les pins de lieux, pour visualiser le voisinage. Suit le point au drag.
5. **Re-clic** sur le bouton actif : désactive le tri proximité, retire le marqueur
   et le cercle (toggle, comportement actuel conservé).

## Architecture

Trois fichiers touchés + i18n. Aucune nouvelle dépendance (maplibre-gl déjà présent).

### `src/components/geo/useGeoPosition.ts`
- Ajouter `setPosition(lat: number, lon: number)` : fixe une position à coordonnées
  libres (et non plus seulement un slug prédéfini), statut `"pinned"`, persistance
  `sessionStorage` (`cd-geo`) réutilisée telle quelle.
- Étendre le type `GeoStatus` avec `"pinned"`. Au rechargement, `"pinned"` est restauré
  comme une position manuelle (même branche que `"manual"`).
- `requestGeo`, `setManual`, la persistance et la signature de retour restent
  **inchangées** → zéro régression sur `/near-me`, `NearMeClient`, le calcul taxi.

### `src/components/explore/ExploreView.tsx`
- **Marqueur** : un `useEffect([nearActive, geo.pos, mapReady])` crée/met à jour un
  unique `maplibre.Marker` (`draggable: true`, `anchor: "bottom"`) à `geo.pos` quand
  `nearActive && geo.pos`, et le retire sinon. Élément DOM custom : pastille pulsante
  couleur marque (`aegean #0B5E78`), label « Vous êtes ici », visuellement distincte
  des pins de lieux et des photo-pins. `marker.on("dragend", …)` → `geo.setPosition(...)`.
  Référence stockée dans un `useRef` (`userMarkerRef`) nettoyée au démontage, sur le
  modèle de `photoMarkersRef`.
- **Recentrage** : à la première pose GPS (transition `null` → `pos`), `flyTo` sur le
  point, zoom `max(zoom courant, 11)`.
- **Cas refusé** : dans `toggleNearMe`, si `geo.status` devient `"denied"`/`"unavailable"`
  après la demande, poser le point au centre courant via `geo.setPosition(center.lat,
  center.lng)` et afficher l'indice transitoire (état local `hintShown`, masqué au
  premier drag ou après quelques secondes).
- **Cercle de rayon** : source + couche GeoJSON `user-radius` (anneau ~10 km) ajoutées
  au `load` de la carte (sous `clusters`/`places-circles`), `setData` mis à jour à
  chaque changement de `geo.pos` quand `nearActive`, vidées sinon. Polygone cercle
  généré localement (petit helper trigonométrique, ~64 segments) — pas de dépendance.
- Le tri par distance, les badges « X km », `nearestBy`, le carousel mobile et le
  panneau liste restent inchangés (ils consomment déjà `geo.pos`).

### i18n
- Ajouter aux tables `T` de `ExploreView.tsx` (en/fr/de/el) :
  - `youAreHere` : « Vous êtes ici » / « You are here » / « Sie sind hier » / « Είστε εδώ »
  - `dragToAdjust` : « Glissez le point sur votre position » (+ EN/DE/EL)
- Modèle identique aux clés existantes (`nearMe`, `geoUnavailable`).

## Hors périmètre

- Pas de recherche d'adresse / géocodage (le drag couvre le besoin).
- Pas de modification de `/near-me`, du `PlacePicker`, ni du calcul taxi.
- Pas de rayon configurable par l'utilisateur (valeur fixe ~10 km ; ajustable plus tard
  si besoin).

## Gestion d'erreurs

- GPS refusé/indisponible → point au centre de la vue, drag manuel (cf. comportement 3).
- Lieux sans coordonnées → déjà exclus par `nearestBy`.
- `sessionStorage` indisponible → la position reste en mémoire de session (try/catch
  déjà en place dans le hook).

## Tests

Le repo n'a **pas de framework de test** (cf. CLAUDE.md / pattern récent) : vérification
par `tsc` + `next build` + lint, puis contrôle visuel Playwright.

- **Type/build** : `npx tsc --noEmit` et `next build` propres.
- **Manuel (Playwright)** :
  1. Clic « Autour de moi » → marqueur « Vous êtes ici » + cercle de rayon visibles,
     carte recentrée.
  2. Drag du marqueur → la liste se réordonne, les badges « km » et le cercle suivent.
  3. GPS refusé (permission bloquée) → point posé au centre, indice affiché, drag OK.
  4. Re-clic → marqueur et cercle retirés, tri revient sur « Mieux notés ».
- **Logique pure** : si un fichier helper `geo.ts` est étendu (cercle), une vérif
  rapide du polygone (premier = dernier point, rayon ≈ 10 km au centre) suffit.

## Fichiers

- `src/components/geo/useGeoPosition.ts` (modifié)
- `src/components/explore/ExploreView.tsx` (modifié)
- `src/lib/geo.ts` (helper cercle, optionnel selon implémentation)
