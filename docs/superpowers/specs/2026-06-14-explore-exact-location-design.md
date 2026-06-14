# Position exacte sur l'Explorer — Design

Date : 2026-06-14
Projet : cretepulse-build (crete.direct)
Statut : validé (brainstorming) + révisé après relecture critique, prêt pour plan

## Problème

Sur `/explore`, le bouton « Autour de moi » (`toggleNearMe` dans
`src/components/explore/ExploreView.tsx`) appelle uniquement le GPS du navigateur
(`useGeoPosition.requestGeo()`) puis trie la liste par distance. Trois manques :

1. **Aucun marqueur « vous êtes ici »** sur la carte : le tri proximité est invisible
   géographiquement, l'utilisateur ne voit pas son point d'origine.
2. **Aucun moyen de fixer/corriger sa position exacte** : si le GPS est imprécis
   (cas fréquent sur mobile en bord de mer / montagne) ou refusé, le bouton se grise
   et l'utilisateur est bloqué. Il ne peut pas dire « je suis *ici* précisément ».
3. **Le visiteur hors de Crète** (préparation de voyage depuis chez lui) reçoit une
   position GPS à ~2000 km : le tri « au plus près » devient inutile et recentrer la
   carte dessus la vide. Le helper `isOnCrete(pos)` existe déjà (`geo.ts`) mais n'est
   pas exploité ici.

Demande Kami : « quand on clique proche de moi, on puisse mettre la localisation
exacte de là où on se trouve, pour voir plus facilement ce qu'on a à côté ».

## Décision d'interaction (validée)

**GPS puis point déplaçable.** Un clic pose un marqueur via GPS, que l'utilisateur
peut ensuite glisser-déposer pour corriger. Fonctionne aussi quand le GPS est
refusé/indisponible ou hors Crète (le point est posé au centre de la vue, à déplacer).
Un **disque de rayon** matérialise « ce qu'on a à côté ».

## Comportement

1. Clic sur **« Autour de moi »** (desktop + mobile) :
   - active le tri proximité (`nearActive = true`) ;
   - si aucune position connue, déclenche `geo.requestGeo()` (GPS).
2. **Résolution GPS** (réaction asynchrone au changement de statut, voir Architecture) :
   - **succès et sur la Crète** (`isOnCrete`) → pose le marqueur « Vous êtes ici » au
     point GPS et recentre la carte dessus (`flyTo`, zoom ≥ 11) ;
   - **succès mais hors Crète** → ne recentre PAS sur le point lointain ; garde la carte
     sur la Crète, pose le marqueur déplaçable au centre de la vue, indice « Tu n'es pas
     en Crète, place ton point là où tu seras » ;
   - **refus / indisponible** → pose le marqueur au centre de la vue courante, indice
     « Glisse le point sur ta position ».
3. Le marqueur est **glissable** (souris + tactile). Au `dragend` :
   - `geo.setPosition(lat, lon)` met à jour la position d'origine ;
   - la liste, les badges « X km » et le disque de rayon se recalculent
     (déjà câblés via le `useMemo` `displayed` → `nearestBy(geo.pos)`).
4. **Disque de rayon** : un disque translucide rempli + contour, ~10 km de rayon,
   centré sur le point, rendu **sous** les pins de lieux. **Purement visuel : il ne
   filtre pas la liste** (la liste reste complète, triée par distance). Suit le point.
5. **Re-clic** sur le bouton actif : désactive le tri proximité, retire le marqueur,
   le disque et l'indice (toggle, comportement actuel conservé).

## Architecture

Trois fichiers touchés + i18n. Aucune nouvelle dépendance (maplibre-gl déjà présent).

### `src/components/geo/useGeoPosition.ts`
- Ajouter `setPosition(lat: number, lon: number)` : fixe une position à coordonnées
  libres (et non plus seulement un slug prédéfini), **statut `"manual"` réutilisé**
  (un point posé/glissé est sémantiquement une position manuelle), persistance
  `sessionStorage` (`cd-geo`) réutilisée telle quelle.
- **Pas de nouvelle valeur dans le type `GeoStatus`.** `GeoStatus` est consommé par 6
  composants (`MatchDeck`, `NearMeClient`, `JourneyPlanner`, `CarRentalWizard`,
  `DepartureBoard`, `NearestSwimSpot`) ; réutiliser `"manual"` évite tout risque sur un
  éventuel matching exhaustif et garde la surface de type inchangée.
- `requestGeo`, `setManual`, la persistance et le reste de la signature de retour
  restent **inchangés** → zéro régression sur les autres écrans.

### `src/components/explore/ExploreView.tsx`
- **Réaction à la résolution GPS** (Comportement 2) : un `useEffect` qui surveille la
  transition de `geo.status` via une ref `prevGeoStatus` — **pattern déjà utilisé dans
  `MatchDeck.tsx` (~ligne 480)**. `requestGeo()` étant asynchrone, le refus/le succès
  n'est connu que dans un callback ; on ne peut donc PAS décider dans `toggleNearMe`.
  L'effet gère les trois branches (sur Crète / hors Crète / refusé) et pose le point au
  centre via `geo.setPosition(center.lat, center.lng)` quand il faut un placement manuel.
- **Marqueur (lifecycle séparé de la position)** :
  - un effet **crée** le `maplibre.Marker` (`draggable: true`, `anchor: "bottom"`) une
    seule fois quand `nearActive && geo.pos && mapReady` deviennent vrais, et le
    **retire** quand l'une redevient fausse ;
  - un effet distinct **met à jour** la position du marqueur existant via
    `marker.setLngLat(...)` quand `geo.pos` change (pas de recréation à chaque drag) ;
  - `marker.on("dragend", …)` → `geo.setPosition(...)`. Référence dans un `useRef`
    (`userMarkerRef`), nettoyée au démontage (et dans le teardown de la carte, comme
    `photoMarkersRef`).
  - Élément DOM custom : pastille pulsante couleur marque (`aegean #0B5E78`), label
    « Vous êtes ici », **`z-index` élevé** (les markers DOM maplibre s'empilent par
    latitude ; on force le marqueur utilisateur au-dessus des photo-pins), cible
    tactile ≥ 40 px.
- **Disque de rayon** : source + couche GeoJSON `user-radius` ajoutées au `load` de la
  carte **avant** `clusters`/`places-circles` (donc dessous). Deux couches : `fill`
  (opacité ~0.08) + `line` (contour). `setData` au montage du point et à chaque
  `dragend` (pas pendant le drag, pour la perf), vidé quand `nearActive` est faux.
  Polygone cercle généré localement (helper trigonométrique ~64 segments, approximation
  équirectangulaire à la latitude du point) — pas de dépendance.
- **Bouton « Autour de moi »** : aujourd'hui `geoBlocked` (status `denied`/`unavailable`)
  grise le bouton. Avec le placement manuel, **le clic doit rester actif** pour poser un
  pin ; on retire l'état désactivé (on peut garder un libellé d'aide au survol).
- Le tri par distance, les badges « X km », `nearestBy`, le carousel mobile et le
  panneau liste restent inchangés (ils consomment déjà `geo.pos`).

### i18n
- Ajouter aux tables `T` de `ExploreView.tsx` (en/fr/de/el) :
  - `youAreHere` : « Vous êtes ici » / « You are here » / « Sie sind hier » / « Είστε εδώ »
  - `dragToAdjust` : « Glisse le point sur ta position » (+ EN/DE/EL)
  - `notOnCrete` : « Tu n'es pas en Crète, place ton point là où tu seras » (+ EN/DE/EL)
- Choix **délibéré** : toute l'UI de `ExploreView` est déjà en 4 langues inline avec
  fallback EN (`T[locale] || T.en`). Les nouvelles clés suivent ce pattern — pas besoin
  des 22 fichiers `messages/*.json` (mécanisme i18n distinct, non utilisé par cet écran).

## Hors périmètre

- Pas de recherche d'adresse / géocodage (le drag couvre le besoin).
- Pas de modification de `/near-me`, du `PlacePicker`, ni du calcul taxi.
- Pas de rayon configurable par l'utilisateur (valeur fixe ~10 km ; ajustable plus tard).
- Pas de glisser-déposer au clavier (limitation connue des markers DOM maplibre ; les
  non-pointeurs gardent le placement GPS auto + la liste entièrement utilisable).

## Gestion d'erreurs / cas limites

- GPS refusé/indisponible → point au centre de la vue, drag manuel (Comportement 2).
- GPS hors Crète → carte gardée sur la Crète, point au centre, indice (Comportement 2).
- Lieux sans coordonnées → déjà exclus par `nearestBy`.
- `sessionStorage` indisponible → la position reste en mémoire de session (try/catch
  déjà en place dans le hook).
- Position partagée site-wide via `cd-geo` (intentionnel : un point posé sur Explore est
  réutilisé par `/near-me`, `/match`, etc. — cohérent avec le `setManual` existant).

## Tests

Le repo n'a **pas de framework de test** : vérification par `tsc` + `next build` + lint,
puis contrôle visuel Playwright.

- **Type/build** : `npx tsc --noEmit` et `next build` propres.
- **Manuel (Playwright)** :
  1. Clic « Autour de moi » (GPS simulé en Crète) → marqueur « Vous êtes ici » + disque
     visibles, carte recentrée.
  2. Drag du marqueur → la liste se réordonne, badges « km » et disque suivent.
  3. GPS refusé → point au centre, indice affiché, drag OK, bouton non grisé.
  4. GPS simulé hors Crète → carte reste sur la Crète, point au centre, indice dédié.
  5. Re-clic → marqueur, disque et indice retirés ; tri revient sur « Mieux notés ».
- **Logique pure** : si le helper cercle est ajouté à `geo.ts`, vérif rapide du polygone
  (fermé, rayon ≈ 10 km au centre).

## Fichiers

- `src/components/geo/useGeoPosition.ts` (modifié — `setPosition`)
- `src/components/explore/ExploreView.tsx` (modifié — marqueur, disque, réaction GPS, i18n)
- `src/lib/geo.ts` (helper cercle, optionnel selon implémentation)
