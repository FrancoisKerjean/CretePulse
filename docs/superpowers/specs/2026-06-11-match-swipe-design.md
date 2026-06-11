# Match Swipe — découverte de lieux façon Tinder

**Date** : 2026-06-11
**Statut** : validé par Kami (design approuvé en session)
**Objectif** : rendre l'arrivée sur crete.direct plus engageante via un jeu de swipe sur les lieux, qui débouche sur un « match » et renvoie vers la fiche du lieu.

## Contexte

- Pool de données : table Supabase `cb_places`, 2296 lieux scrapés (641 monastères, 475 plages, 173 gorges...), photos hébergées `media.crete.direct/places` (18,4K photos), accès via `src/lib/cb-places.ts`.
- `motion` v12 déjà en dépendance (drag gestures, exit animations).
- Le drawer `/explore` (`src/components/explore/ExploreView.tsx`, 498 lignes) n'est pas deep-linkable aujourd'hui.
- Contrainte copyright : les descriptions scrapées cretanbeaches.com ne doivent PAS être exposées à l'index. Le deck n'affiche que nom / photo / attributs / rating.

## Décisions (validées avec Kami)

1. **Contenu du deck** : les lieux `/explore` (pas les tours GYG, pas de mix).
2. **Emplacement** : teaser sur la home + page dédiée `/[locale]/match` plein écran.
3. **Mécanique** : match algorithmique après ~8 swipes (pas de like = match immédiat, pas de simple shortlist).
4. **Approche** : client pur, zéro backend (approche A). Pas de table `swipes`, pas d'auth, pas de RGPD. localStorage + events Plausible. V2 Supabase seulement si les métriques le justifient.

## Architecture

### Nouvelle route `/[locale]/match`
- `src/app/[locale]/match/page.tsx` : server component.
  - Charge un échantillon de ~70 lieux : `photo_count > 0` obligatoire ; `rating >= 3.5` quand présent, accepté sans rating si photos ; diversifiés par `place_type` et `prefecture` (échantillonnage stratifié plafonné à ~25 % par type, pas juste top-rated).
  - Metadata : titre type « Find your perfect spot in Crete », indexable, `buildAlternates` 22 locales (pattern existant).
  - Passe l'échantillon (champs légers : slug, name, place_type, prefecture, rating, photos[0..2], water_color, sand_type, crowds, accessibility) à `MatchDeck`.

### `src/components/match/MatchDeck.tsx` (client)
- Deck de cartes empilées, drag horizontal via `motion` (rotation pendant le drag, badges LIKE/PASS en overlay selon la direction, exit animé).
- Fallback boutons ❌ / ❤️ sous le deck ; desktop : flèches clavier ← →.
- Scoring local :
  - Like = +1 sur chaque attribut de la carte (place_type, prefecture, water_color, sand_type, crowds).
  - Pass = -0.5 sur les mêmes attributs.
- Au 8e swipe : scorer les lieux restants de l'échantillon contre le profil → le meilleur déclenche l'écran match.
- Écran match : plein écran, photo du lieu, « It's a match! », confettis sobres (charte), CTA primaire « Voir ce spot » → `/explore?place=slug`, CTA secondaire « Continuer à swiper » (reset du compteur, pas du profil).
- Shortlist : les likes s'accumulent dans une barre mini-vignettes en bas, cliquables vers `/explore?place=slug`.
- Persistance localStorage : profil de goûts + likes + lieux déjà vus (clé `cd_match_v1`).

### Deep-link `/explore?place=slug`
- `ExploreView.tsx` : au mount, lire `useSearchParams()` ; si `place` présent, fetch `getCbPlaceBySlug` et ouvrir le drawer.
- Aucun autre changement de comportement.

### Teaser home
- Carte « Trouve ton spot » dans le dashboard home (`src/components/home/`) : 2-3 photos en éventail léger (CSS transforms), libellé localisé, lien `/match`.
- Respecter les règles UI maison : `card-base`, `font-data` pour toute donnée chiffrée, icônes `icons.tsx`, pas de hors-tokens.

## i18n

UI traduite en/fr/de/el, fallback EN pour les 18 autres locales, hreflang propre via `buildAlternates` (pattern existant des pages airbnb).

## Mesure (Plausible)

Events : `match_deck_start`, `swipe_like`, `swipe_pass`, `match_shown`, `match_clicked`, `match_replay`.
Critère de succès : `match_clicked` / `match_deck_start` > 25 % après 2 semaines → justifie une V2 (persistance Supabase, social proof « X % ont liké »).

## Hors scope V1

- Table Supabase `swipes`, sessions, social proof.
- Tours GetYourGuide dans le deck.
- Pages individuelles `/places/[slug]` (blocage copyright sur les descriptions).
- Partage social du match (V2 possible : OG image dynamique du lieu).

## Risques

- **Photos lourdes** : précharger seulement les 3 prochaines cartes ; photos déjà servies par `media.crete.direct`.
- **Échantillon biaisé monastères** (641/2296) : l'échantillonnage stratifié plafonne chaque type à ~25 % du deck.
- **SEO** : page client-side au contenu mince ; indexable mais sans enjeu de ranking, aucune description scrapée exposée.
