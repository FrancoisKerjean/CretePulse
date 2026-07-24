# Match géolocalisé + mode préparation — Design

Date : 2026-06-12
Statut : validé par Kami (pondération douce + ancrage futur logement)
Base : Match Swipe V1.2 (`docs/superpowers/specs/2026-06-11-match-swipe-design.md`)

## Objectif

Quand l'utilisateur est en Crète, le deck de swipe (/match) doit privilégier les
activités proches de sa position. Quand il est hors Crète, le deck bascule en
« Mode préparation » : il n'est pas sur place, il prépare son voyage, avec un
ancrage optionnel sur son futur lieu de séjour.

## Contraintes héritées (non négociables)

- Géoloc 100 % client-side, jamais envoyée au serveur (privacy « we do not track »).
- Activation uniquement au clic (jamais de prompt au mount) — pattern `useGeoPosition`.
- Logique pure dans `src/lib/match-scoring.ts`, zéro I/O, testable node.
- Aucune description scrapée cb_places dans le DOM (copyright).
- i18n inline en/fr/de/el comme le reste de MatchDeck, fallback EN.
- Captures à Kami AVANT tout déploiement de changement visuel.

## Réutilisation (rien de neuf côté infra)

- `useGeoPosition` (`src/components/geo/useGeoPosition.ts`) : opt-in clic,
  sessionStorage `cd-geo` partagé avec /near-me, `setManual(slug)`.
- `geo.ts` : `haversineKm`, `isOnCrete`, `GeoPos`.
- `PlacePicker` (`src/components/geo/PlacePicker.tsx`) : fallback ~46 lieux
  `SLUG_COORDS`, réutilisé pour « Où vas-tu loger ? ».
- `MatchPlace` porte déjà `latitude`/`longitude` (V1.1).

## Comportement

### Point d'entrée (écran deck)

Pill « Autour de moi » (icône MapPin) sous le titre. États :
- `idle` : pill neutre, clic → `requestGeo()`.
- `prompting` : pill en attente.
- `granted`/`manual` : pill active (fond aegean), affiche le mode courant,
  clic → désactiver (mode proximité off, la position sessionStorage reste).
- `denied`/`unavailable` : pill remplacée par le `PlacePicker` (choix manuel).

Si une position existe déjà en sessionStorage au mount (accordée sur /near-me
dans la même session), le mode proximité s'active d'office, pill en état actif.

### Trois états du deck

1. **Sans position** : deck actuel strictement inchangé.
2. **Position sur Crète** (`isOnCrete(pos)`) : pondération douce.
   - ~65 % du deck dans le rayon, 35 % découverte toute l'île.
   - Rayon adaptatif : 40 km ; si < 25 lieux du pool à 40 km → 70 km ;
     si < 25 à 70 km → 100 km ; sinon pas de pondération (pool trop clairsemé).
   - Badge distance « X km » sur chaque carte (chip `font-data`, arrondi entier,
     `< 1 km` affiché « 1 km »).
   - Croisement avec la pondération intérêts existante : split near/far 65/35
     d'abord, puis 75/25 types préférés à l'intérieur de chaque groupe.
   - Le choix du match (`pickMatch`) reste purement basé goûts : le deck étant
     déjà ancré localement, le match sort naturellement proche.
3. **Position hors Crète** : mode préparation.
   - Bandeau compact « Mode préparation — tu n'es pas encore sur place » +
     sous-texte « Où vas-tu loger ? » avec le `PlacePicker` (optionnel).
   - Lieu choisi → `setManual(slug)` : même pondération douce autour de ce
     point + badges km (libellé « depuis ton logement » dans le bandeau).
   - Pas de lieu choisi → deck classique toute l'île, badges masqués.

### Synthèse

- Position disponible (réelle ou logement) : sélection triée par distance
  croissante, km affiché par lieu à côté de la note.
- Mode préparation : sous-titre variant « prête pour ton voyage » et l'encart
  « Reçois ta sélection par email » remonte AVANT CarPromo/GYG (la conversion
  logique quand on prépare). Sur place : ordre actuel inchangé (Car d'abord).

### Re-deal / changement d'état

Activer, désactiver ou changer de point d'ancrage ré-échantillonne le deck
(`sampleDeck`) en conservant profil, likes et seen — même mécanique
qu'`applyInterests` (reset index/swipes, `lastSwipedRef` nul).

## Architecture

### `src/lib/match-scoring.ts` (logique pure, étendue)

- `nearSlugs(pool: MatchPlace[], pos: GeoPos, radii = [40, 70, 100], min = 25): Set<string>`
  → premier rayon avec ≥ `min` lieux ; Set vide si aucun (pas de pondération).
- `sampleDeck(pool, size, seen, preferred?, near?: Set<string>)` : si `near`
  non vide, split near/far 65/35 (near = `NEAR_RATIO` 0.65), pondération
  intérêts 75/25 appliquée dans chaque moitié, complétion croisée si une
  moitié est trop petite, shuffle final. Signature rétro-compatible.
- Import type `GeoPos` depuis `./geo` (déjà importable node).

### `src/components/match/MatchDeck.tsx`

- `useGeoPosition()` + état local `geoMode: "off" | "near" | "prep"` dérivé de
  `pos`/`isOnCrete` + toggle utilisateur.
- Pill + bandeau prépa + badges km (haversine client par carte visible).
- Clés i18n ajoutées (×4 langues) : `geoNearMe`, `geoActive`, `geoOff`,
  `prepTitle`, `prepSub`, `prepFrom`, `kmAway` (suffixe « km »), `synthSubPrep`.
- Events Plausible : `match_geo_enabled` (props `{ on_crete: "yes"|"no" }`,
  une fois par activation), `match_prep_place_set` (props `{ slug }`).

### Hors scope (YAGNI)

- Pas de carte, pas de tri du pool serveur (la position ne quitte pas le client).
- Pas de bonus proximité dans `scorePlace`/`pickMatch` (V2 si besoin mesuré).
- Pas de persistance du toggle au-delà de la session (sessionStorage existant).
- Email de sélection : km non inclus (le mail reste valable après déplacement).

## Tests / vérification

- `scripts/check-match-geo.mjs` (pattern check-bus-journey) : `nearSlugs`
  rayons adaptatifs + `sampleDeck` avec `near` (ratios, complétion, seen).
- `tsc` 0, build OK, Playwright local : pill, badges km (position mockée via
  sessionStorage `cd-geo`), bandeau prépa (position Paris), synthèse triée.
- Captures envoyées à Kami avant push/deploy.

## Mesure (J+14)

Ratio `match_geo_enabled` / `match_deck_start` dans Plausible ; répartition
`on_crete` yes/no pour valider l'existence réelle des deux usages.
