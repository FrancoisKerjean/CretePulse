# Design — Refonte UI/UX « données vivantes » crete.direct

Date : 11/06/2026. Validé Kami en session (périmètre « tout d'un coup », ambition « signature,
pas nettoyage »). Diagnostic fondé sur 16 captures prod desktop+mobile (`ui-audit/`, 8 pages).

## Diagnostic (constat factuel)

Les pages utilitaires récentes (buses, paires, /partners, beach finder, airbnb) partagent un
système propre : crème, aegean, titres Playfair, cartes sobres. Trois foyers de dégradation :
1. **Home** : empilement hero news + 2 tickers + stats + 4 cartes édito à fonds criards + mur
   de news aux vignettes hétéroclites + sidebar déséquilibrée + section Explore en 4 blocs de
   couleurs plates hors palette. En mobile : tunnel sans hiérarchie. La home dit « agrégateur
   de news », pas « compagnon pratique données live ».
2. **Hub /articles** : mur uniforme de 40+ cartes, vignettes de qualité très variable, aucun
   tri News/Guides/Daily, aucune hiérarchie.
3. **Corps étrangers trans-site** : bandeau funnel Kairos noir+jaune (pages airbnb), 3-4 styles
   de cartes selon l'ancienneté, 3 designs d'encarts cross-sell pour le même rôle.

**Principe directeur : la donnée EST le design.** L'asset unique du site (météo/mer/bus/aéroports
/Airbnb live) doit être visible, vivant et beau — pas rangé dans des tables. Référence interne =
le système des pages bus ; on ramène tout le reste vers lui.

## Décisions de cadrage

- Contraintes invariantes : 22 langues (UI complète en/fr/de/el, fallback EN), ISR, 100 %
  automatique, zéro curation manuelle d'images, mouvement CSS only (perf).
- Hors scope (décision Kami) : logo/identité de marque, motifs minoens, recherche cmd+K,
  dark mode, refonte individuelle des 24K pages programmatiques (elles héritent du système
  via les composants partagés).
- Multi-terminal : un autre terminal travaille sur `explore/` et `beaches` — commits fréquents,
  stage sélectif, relecture de `git status` avant chaque commit.

## 1. Système (fondation — tout le reste s'appuie dessus)

Les tokens existent déjà (`globals.css @theme` : aegean/terra/olive/sand/stone/surface/border).
Le problème est l'indiscipline d'usage, pas l'absence de tokens.

- **Règle d'usage des couleurs** : surfaces = `stone`/`surface`/blanc ; texte = `text`/`text-muted` ;
  action et liens = `aegean` ; highlight éditorial et alerte chaude = `terra` ; `olive`/`sand` =
  réservés aux gradients de fallback et touches mineures. Toute couleur hors tokens est interdite
  (le noir+jaune du bandeau Kairos, les aplats de la section Explore disparaissent).
- **Typographie 3 voix** : Playfair (`--font-heading`) = titres/display ; Geist = UI et corps ;
  **mono = toute donnée chiffrée** (horaires, prix, températures, stats, dates de mise à jour).
  Ajouter `Geist_Mono` via next/font → variable `--font-data`, utilitaire `.font-data`
  (`font-family: var(--font-data); font-variant-numeric: tabular-nums`). Les horaires bus le
  font déjà en font-mono : généraliser ce tic visuel — c'est la signature « données ».
- **Carte unique** : classe utilitaire `card-base` (globals.css `@utility`) = fond blanc,
  `border-border`, `rounded-xl`, hover lift discret (`shadow-md` + `-translate-y-0.5`,
  transition 150ms). Tous les styles de cartes convergent vers elle.
- **`PromoBox`** (`src/components/PromoBox.tsx`) : l'unique pattern d'encart cross-sell —
  icône + titre + 1 ligne + CTA, fond `aegean-faint`, bordure `aegean/15`, disclosure
  optionnelle (« Lien partenaire »). Remplace : bandeau Kairos noir+jaune (airbnb), le style
  custom de `AffiliateBanner`, l'encart « Stay in eastern Crete » — `BusAccessBox` garde son
  contenu mais adopte le style.
- **`CardThumb`** (`src/components/CardThumb.tsx`) : vignette d'article/carte unifiée —
  ratio 16:10, `object-cover`, **voile teintant uniforme** (overlay `aegean` en multiply
  ~10 % + légère désaturation CSS) qui masque l'hétérogénéité des photos scrapées, fallback
  gradient catégorisé (réutilise la logique existante des guides). Utilisée par home, hub
  articles, more-guides.

## 2. Barre live trans-site (la signature)

`src/components/LiveBar.tsx`, montée dans `src/app/[locale]/layout.tsx` au-dessus du header,
sur toutes les pages.

- **Contenu** (gauche → droite) : pastille `● LIVE` pulsante (animation CSS) · température +
  icône vent orientée Heraklion · idem Chania · état mer du jour (calme/modérée/agitée, dérivé
  de la houle des stations — logique swim-today) · date locale courte · « updated HH:MM ».
  Typographie mono xs, fond aegean foncé, texte crème. Statique (pas de défilement).
  Mobile : 2 items prioritaires (Heraklion + mer), le reste masqué.
- **Mode alerte** : si une fire alert est active (source existante du widget sidebar home),
  la barre passe fond `terra` et affiche l'alerte — l'info critique devient trans-site.
- **Données** : composant server async, `fetchAllCitiesWeather()` + houle stations (libs
  existantes), cache `revalidate` 1800 s. Échec fetch → la barre rend la date seule (jamais
  d'erreur visible).
- **Remplace** : le Marquee events et le ticker breaking de la home (supprimés tous les deux).
- i18n : libellés courts en/fr/de/el inline + fallback EN ; symboles (°C, km/h) universels
  pour les 18 autres locales.

## 3. Home « la Crète, aujourd'hui » (refonte page.tsx + HomeClient)

Structure cible, dans l'ordre :
1. **Hero compact « Crete, today »** : titre Playfair + date du jour ; à droite/dessous, la
   **préco baignade du jour** (photo de la plage du jour via swim-today, overlay données
   vent/mer, lien /beaches/today) + **3 tuiles météo région** (est/centre/ouest : temp, icône,
   flèche de vent orientée — données fetchAllCitiesWeather). Plus de hero news plein écran.
2. **Rangée outils** (6 tuiles `card-base`, icône + titre + 1 ligne) : Bus planner ·
   Where to swim today · Explore (le nouveau module 2296 lieux) · Airports · Airbnb data ·
   Weather. C'est le produit, au-dessus de la ligne de flottaison.
3. **Contenu 2 colonnes** : News curées (8 max, `CardThumb`) | Guides éditoriaux (6,
   `CardThumb`). La sidebar disparaît : fire alerts → LiveBar (mode alerte) ; newsletter →
   bande pleine largeur sobre entre contenu et Explore.
4. **Explore** : 4 tuiles `card-base` dans la palette (les aplats bleu/orange/vert/olive
   disparaissent).
5. **Mobile** : même ordre, page ≈ 2× plus courte (limites d'items), zéro section dupliquée.
Stats NumberTicker : conservées mais intégrées au hero (discrètes, mono).

## 4. Utilitaire magnifié

- **`NextDeparture`** (client) : « Prochain départ HH:MM (dans X min) » calculé en TZ
  Europe/Athens depuis `departures_by_day`, badge aegean en tête des cartes direction des
  pages paires + résultats du planificateur. L'info n°1 du touriste, affichée d'abord.
- **Carte réseau bus** : le SVG spaghetti de /buses est remplacé par MapLibre GL (déjà au
  stack, carte interactive existante comme référence d'intégration) : polylines entre les
  lieux (coords = `SLUG_COORDS` de taxi-fare, réutilisées), couleur par opérateur
  (aegean = herlas, terra = ektel), points cliquables → préremplit le planificateur.
  Repliée par défaut (`<details>`) sur mobile.
- **Vent visualisé** : petite flèche orientée (`rotate(deg)` CSS depuis wind_direction) à
  côté de chaque vitesse de vent — beach finder, tuiles météo home, LiveBar.
- **Header 3 univers** (`Header.tsx`, 240 lignes, refonte) : **Plan** (Buses, Airports,
  Weather, Ferries quand live) · **Discover** (Beaches, Explore, Villages, Food, Hikes) ·
  **Today** (News, Events, Daily, Guides). Dropdowns au survol desktop, accordéon mobile.
  4 langues + fallback.
- **Hub /articles** : 1 article à la une (dernier guide éditorial, grande `CardThumb`) +
  filtres client All/News/Guides/Daily + grille `CardThumb` + « Load more » par paliers de 24.
- **OG images** (`/api/og`) : template restylé (crème, aegean, Playfair, pastille live) —
  chaque partage Facebook devient une pub du design.

## 5. Erreurs et dégradations

- LiveBar : tout échec de données → date seule, jamais de layout shift (hauteur fixe).
- Home : section météo/baignade absente si data indisponible → la rangée outils monte.
- NextDeparture : pas de départ restant aujourd'hui → « Premier bus demain HH:MM » ;
  données horaires absentes → badge masqué.
- MapLibre : échec de chargement → fallback liste des lignes (annuaire existant).

## 6. Tests et vérification

- `npx tsc --noEmit`, `npm run build` (EXIT 0), checks node existants inchangés verts.
- Playwright : screenshots après sur les 8 pages auditées (comparaison avant = `ui-audit/`),
  assertions : LiveBar présente sur 3 pages différentes, home = 0 aplat hors palette,
  hub articles filtre fonctionnel, NextDeparture cohérent avec l'heure mockée.
- Lighthouse home : perf ≥ baseline avant refonte.
- Vérif visuelle 4 locales (en/fr/de/el) + 1 locale fallback (it).

## Séquence de build (6 phases, chacune committable/livrable seule)

1. **Système** : font-data + card-base + CardThumb + PromoBox + rebrand bandeau Kairos/affiliés.
2. **LiveBar** (+ suppression des 2 tickers home).
3. **Home** refonte complète.
4. **Hub /articles**.
5. **Bus** : NextDeparture + carte MapLibre + vent visualisé.
6. **Header 3 univers + OG + passe finale** (chasse aux couleurs hors tokens restantes).
