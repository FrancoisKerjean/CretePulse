# Spec — /near-me : hub géolocalisé "Autour de moi" + tri distance trans-site

Date : 2026-06-12 · Validé par Kami en session (brainstorming 11/06 soir)

## Contexte et objectif

Pivot produit confirmé : crete.direct = le compagnon pratique de la Crète, données live. Les news restent en pilote automatique (machine d'acquisition GSC, zéro effort produit) ; 100 % de l'effort produit va sur l'utilitaire. Le chaînon manquant : aucune page n'utilise la position de l'utilisateur alors qu'on a 2 207 lieux GPS (cb_places), ~200 restaurants GPS (food_places), 89 lieux bus (SLUG_COORDS), 10 stations météo, et un moteur de reco plage live (swim-today).

`/near-me` est aussi la landing des futurs QR codes physiques (kakémonos sortie d'aéroport).

## Décisions prises (Kami)

1. **Near me partout** : page hub dédiée `/near-me` + tri par distance injecté dans /explore, /beaches/today, /buses. Pas de refonte home, pas de PWA (plus tard si traction).
2. **"Boosté AI" = recos intelligentes calculées** (vent × distance × notes × affluence). Pas d'assistant conversationnel LLM (phase 2 éventuelle si traction mesurée Plausible).
3. **Géoloc 100 % client-side** : la position ne quitte JAMAIS le navigateur (cohérent privacy policy "we do not track"). Affiché comme argument de confiance sur la page.

## Architecture

### 1. Brique partagée `src/lib/geo.ts` (pur, zéro I/O)
- `haversineKm(lat1, lon1, lat2, lon2): number` (réutiliser/extraire l'implémentation existante de taxi-fare/swim-today au lieu de dupliquer une 3e fois).
- `nearestBy<T>(items: T[], getCoords: (t: T) => [number, number] | null, pos: [number, number], limit?: number): Array<T & { km: number }>` — tri par distance générique.
- `type GeoPos = { lat: number; lon: number }`.

### 2. Hook client `src/components/geo/useGeoPosition.ts`
- `"use client"`. États : `idle | prompting | granted | denied | unavailable`.
- Activation UNIQUEMENT sur clic utilisateur (jamais auto au mount).
- Position gardée en state React + `sessionStorage` (clé `cd-geo`) pour persister entre pages sans serveur.
- Fallback : sélecteur de lieu manuel (liste des villes/villages connus) → produit la même `GeoPos`. Une URL `?from=<slug>` initialise la position depuis SLUG_COORDS/PLACE_COORDS sans géoloc (cas QR aéroport : `?from=heraklion-airport`, `?from=chania-airport`).

### 3. Page `/[locale]/near-me`
- `src/app/[locale]/near-me/page.tsx` : server component. Charge en parallèle : `getAllCbPlaces()`, `getAllFoodPlaces()`, `buildSwimToday()`, routes bus (même source que /buses). Metadata 4 langues (en/fr/de/el) + `buildAlternates(locale, "/near-me")` + generateStaticParams 22 locales + ISR 30 min (aligné swim-today).
- `src/components/near-me/NearMeClient.tsx` : client component. Avant géoloc : écran d'activation (gros bouton "Localiser-moi" + sélecteur manuel + ligne confiance "ta position reste dans ton navigateur"). Après géoloc, sections :
  1. **Ta plage du jour** : la mieux classée de `swimToday.scored` pondérée par distance (score − pénalité km), carte hero avec photo, badge calm/fair/exposed, vent, distance.
  2. **Plages proches** : top 6 cb_places type beach triées distance (badge "à X km", attributs sable/eau).
  3. **Manger** : top 6 food_places triés distance (type, cuisine, prix).
  4. **À voir** : top 6 cb_places hors plages (gorges, monastères, musées...) triés distance × note.
  5. **Ton arrêt de bus** : lieu bus le plus proche (SLUG_COORDS) + 3 prochains départs aujourd'hui (`timesForDate`) + lien préremplissage `/buses?from=<slug>`.
  6. **Météo locale** : station la plus proche des 10 (depuis swimToday.cities).
- Carte MapLibre centrée position, pins par catégorie (réutiliser les patterns ExploreView ; gotcha connu : conteneur `h-full w-full`, pas `absolute inset-0`).
- Design system Phase 13 : card-base, CardThumb, font-data pour tout chiffre, icônes maison (CiWave, CiFood, CiBus, CiSun...).
- i18n : UI inline 4 langues (en/fr/de/el), fallback EN pour les 18 autres, pattern existant `const T = {...}; const t = T[locale] || T.en`.
- SEO : la page rend un contenu statique utile sans géoloc (explication de l'outil + liens vers les hubs) → indexable proprement, FAQPage JSON-LD ("How do I find the nearest beach in Crete?"...). Sitemap : ajouter `/near-me` aux STATIC_PAGES.

### 4. Tri distance injecté dans l'existant
- **/explore** (`ExploreView.tsx`) : bouton "Autour de moi" dans la barre de filtres → utilise useGeoPosition → tri par distance + badge "à X km" sur les vignettes + option recentrage carte. Sans géoloc : comportement actuel inchangé.
- **/beaches/today** : bloc client léger `NearestSwimSpot` inséré après le pick du jour : "la plage calme la plus proche de toi" (croise `scored[]` × position, n'affiche que rating calm/fair). Page reste server component, le bloc est une île client qui reçoit `scored` sérialisé (champs nécessaires uniquement).
- **/buses** (JourneyPlanner) : bouton "Partir d'ici" → trouve le lieu SLUG_COORDS le plus proche → set `fromPlace`. Lire aussi `?from=` initial (déjà prévu par le préremplissage taxi/pair).

### 5. Redirects QR `/go/*`
- `next.config.ts` redirects : `/go/her` → `/en/near-me?from=heraklion-airport&utm_source=qr&utm_medium=print&utm_campaign=her`, `/go/chq` → idem chania-airport, `/go/jsh` → sitia. 308 permanents, URLs courtes imprimables.
- Mesure : Plausible capte l'UTM automatiquement ; events custom `Near Me` (props: source=geo|manual|qr, category cliquée).

## Erreurs et limites
- Géoloc refusée/indisponible → fallback sélecteur manuel, aucune page cassée.
- Position hors Crète (touriste qui prépare depuis chez lui) → si distance au centroïde Crète > 150 km : message "tu n'es pas encore en Crète" + bascule sélecteur manuel.
- Données absentes (fetch KO) → sections concernées masquées, pattern `.catch(() => [])` existant.

## Tests
- `src/lib/geo.ts` : tests unitaires haversine (distances connues HER→CHQ ~140 km vol d'oiseau) + nearestBy (tri, limite, items sans coords exclus).
- Pondération "plage du jour proche" : cas vent fort (plage calme à 40 km doit battre plage exposée à 5 km, mais pas une calme à 120 km).
- Playwright : /near-me avec géoloc mockée (context.setGeolocation Makrigialos) → les 6 sections rendent, distances cohérentes ; refus géoloc → fallback manuel ; `?from=heraklion-airport` → initialisé sans prompt.

## Hors scope (explicitement)
- PWA/offline, notifications, assistant conversationnel, refonte home, traductions au-delà des 4 langues UI.
