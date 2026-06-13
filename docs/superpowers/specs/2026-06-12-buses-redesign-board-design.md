# Refonte /buses · "La gare vivante" (direction B1)

Date : 12/06/2026
Statut : design validé par Kami (mockups `ui-buses-redesign-directions-v2.html` puis `ui-buses-redesign-b-board.html`, réponses "b" puis "B1, anatomie ok")
Page concernée : `src/app/[locale]/buses/` (~46 % du trafic humain du site)

## Problème

La page actuelle est un annuaire : 2 selects natifs, puis 292 grosses cartes de routes (103 000 px de haut sur mobile, ~120 écrans de scroll). Aucune immédiateté, aucune sensation "données live". Le positionnement du site est "utilitaire géolocalisé style Waze, recos calculées" (décision Kami 11/06) : la page la plus vue du site doit l'incarner.

## Décisions actées avec Kami

1. **Direction B** : la page s'organise autour d'un tableau des départs temps réel ("gare vivante"), pas autour de l'annuaire.
2. **Style B1 "Solari"** : board fond `night`, heures `sun` en Baloo 2, destinations en capitales, sous-ligne provenance/via/durée en `sky` clair, badge compte à rebours `sun` qui passe `terra` quand le départ est dans moins de 15 min, prix colonne droite discrète.
3. **Anatomie 7 sections** (ordre mobile) : header compact, planner re-skinné, board LIVE, carte réseau (repliée mobile), top routes, all routes compacté, disclaimer + le reste inchangé.
4. **Défaut du board** : la position de l'utilisateur si la géoloc a déjà été accordée ailleurs sur le site (sessionStorage `cd-geo` existant), sinon Heraklion. Jamais de prompt géoloc non sollicité.
5. **Le board montre les départs DEPUIS le lieu actif uniquement** (modèle mental gare routière, pas d'arrivées).
6. **Zéro flèche, zéro em dash** dans tous les libellés (règles `feedback_zero_fleches` + `feedback_no_emdash`) : séparateur "·", mot "to"/"via" pour les directions.

## Anatomie détaillée

### 1. Header compact
- H1 court : "Bus in Crete" (4 langues). Le titre SEO complet reste dans `<title>`/meta/JSON-LD (inchangés, déjà optimisés "Crete Bus Timetables 2026").
- Sous-titre une ligne : "Live timetables and prices from both KTEL operators · updated daily" + date de mise à jour existante.

### 2. Planner re-skinné (même moteur)
- Moteur `bus-journey.ts`, résultats `JourneyCard`, `TaxiCompare`, `CarPromo`, deep-link `?from=&to=` : tout conservé tel quel.
- Les `<select>` natifs deviennent des champs **autocomplete** (combobox : input filtrant la liste des lieux, navigation clavier, fermeture Escape/clic dehors). Étendre ou réutiliser `PlacePicker` (components/geo) si adapté, sinon nouveau `PlaceCombobox` partagé.
- **From prérempli par géoloc** quand `cd-geo` est déjà en sessionStorage (lieu le plus proche via `nearestBy`, logique "From here" existante). Le bouton compas reste pour déclencher la demande.
- Date : chips **Today / Tomorrow / Date** (la 3e ouvre le date picker natif). Défaut Today.
- Pill texte **swap** (échange From/To), pas de symbole.
- Le reset existant reste.

### 3. Departure board LIVE (la nouveauté)
- **Données** : module pur `src/lib/bus-departures.ts`. Entrée : `routes: BusRoute[]`, `place: string`, `date: ISO`, `nowAthens`. Sortie : liste triée par heure de `{ time, toPlace, via, durationLabel, priceEur, priceEstimated, pairSlug, minutesUntil }`. Réutilise `timesForDate`/`parseDurationMin` de `bus-journey.ts` et la TZ de `athens-time.ts`. Testé par script node (`scripts/check-bus-departures.mjs`).
- **Affichage** : composant client `DepartureBoard.tsx`. 8 prochains départs par défaut, bouton texte "Show later departures" (par tranches de 8), lien "Full day timetable". Countdown recalculé chaque minute (setInterval aligné minute). Badge : `in X min` (sun), `terra` si < 15 min ; au-delà de 60 min : `in 1 h 05`.
- **Filtre lieu** : rangée de pills : `📍 Near me` (déclenche/réutilise la géoloc) + hubs fixes `Heraklion · Chania · Rethymno · Ag. Nikolaos · Ierapetra · Sitia` + le lieu near-me détecté s'il n'est pas un hub. Le lieu actif est aussi synchronisé si l'utilisateur choisit un From au planner (board = From courant).
- Tap sur une ligne du board : navigation vers la page paire `/buses/[pair]` quand `pairSlug` existe, sinon préremplit le planner.
- Jour affiché = Today par défaut ; si l'utilisateur a choisi une autre date au planner, le board suit et le label l'indique ("Departures · Heraklion · Sat 14 June", sans countdown pour un jour futur).
- État vide (aucun départ restant aujourd'hui) : KriKri empty + "No more departures today · first bus tomorrow at HH:MM" + bascule auto sur les départs du lendemain.

### 4. Carte réseau
- `BusNetworkMap` conservé tel quel (SVG indexable, réagit à From/To). Repliée par défaut sur mobile (comportement actuel), visible sur desktop.

### 5. Top routes
- 8 liaisons les plus consultées, **liste statique curée** (constante dans `bus-pairs.ts`, choisie depuis GSC/Plausible au moment du dev ; pas d'appel API au runtime, YAGNI). Lignes compactes : "Heraklion · Chania · every 30-60 min · 2 h 50" + prix. Lien page paire.

### 6. All routes compacté
- Les 292 routes restent **rendues dans le HTML** avec tous leurs horaires (SEO préservé, y compris `departures_by_day`), mais le rendu visuel passe de grosses cartes à des **lignes d'une hauteur** : "Agia Galini · Heraklion · 6 today · from 8.80 €" + lien "timetable" (page paire quand elle existe). Les horaires détaillés d'une ligne sans page paire restent accessibles par dépliage inline (toggle client, contenu déjà dans le DOM).
- Pills de section : `East · 228`, `West · 64`, `No direct bus` (remplace les 3 sections empilées). Le contenu des 3 groupes reste dans le DOM ; les pills ne font que masquer visuellement (CSS), pas de re-render.
- "Show all" par tranches comme aujourd'hui.
- Les cartes "no direct bus" deviennent des lignes du même langage.

### 7. Le reste inchangé
- Disclaimer sun/16, liens KTEL officiels, FAQ JSON-LD, `busesPageSchema`, revalidate 86400.
- GuideLinks (maillage things-to-do / where-to-stay / beaches) : retirés des lignes compactes, déplacés dans le **dépliage inline** d'une ligne (le maillage SEO reste dans le DOM, comme les horaires).

## Desktop (lg+)
- Grille 2 colonnes : board à gauche (colonne ~55 %), carte réseau dépliée à droite, sticky. Planner pleine largeur au-dessus. Top routes + all routes pleine largeur en dessous.

## Composants (résumé)

| Unité | Type | Rôle | Dépend de |
|---|---|---|---|
| `lib/bus-departures.ts` | pur, testé | routes + lieu + date vers départs triés | bus-journey, athens-time |
| `DepartureBoard.tsx` | client | board Solari, countdown, pills lieu | bus-departures, useGeoPosition, nearestBy |
| `PlaceCombobox.tsx` | client | autocomplete lieux (planner From/To) | rien (liste en prop) |
| `JourneyPlanner.tsx` | refonte UI | mêmes props + état date partagé avec board | existant |
| `RouteLine.tsx` | serveur/client léger | ligne compacte annuaire, horaires dans le DOM | bus-pairs |
| `BusesClient.tsx` | refonte | orchestration, état partagé from/to/date/lieu board | tout ci-dessus |

## Ce qui ne change pas (garde-fous)
- Moteur d'itinéraires, prix, TaxiCompare, CarPromo, NextDeparture (réutilisé par le board), pages paires `[pair]`, sitemap, JSON-LD, métas, FAQ, IndexNow.
- SEO : tout le contenu horaires reste server-rendered dans le DOM. Aucune suppression de texte indexé, uniquement de la densité visuelle.
- 4 langues inline (en/fr/de/el) pour tous les nouveaux libellés, fallback EN.

## Risques et mitigations
- **CLS/hydratation** : le countdown est client ; rendre les heures côté serveur et n'hydrater que les badges (suppressHydrationWarning sur les minutes) pour éviter le mismatch SSR.
- **Perf** : 292 routes en lignes = DOM bien plus léger qu'aujourd'hui (moins de nodes par route). Le board ne calcule que le lieu actif.
- **Géoloc** : jamais de prompt automatique ; uniquement réutilisation du consentement existant (`cd-geo`) ou clic explicite.
- **Multi-terminal** : travail sur branche `feat/buses-board`, captures Playwright montrées à Kami AVANT merge (process mockup-avant-deploy + leçon "jamais de lot retenu sur master partagé").

## Tests / vérification
- `scripts/check-bus-departures.mjs` : cas tri, filtre lieu, minuit, jour sans service, date future, prix estimés.
- `tsc` 0 erreur, build complet EXIT 0.
- Playwright : board visible avec départs plausibles, pills filtrent, planner autocomplete fonctionne, deep-link `?from=&to=` intact, FR + EN, captures mobile + desktop pour validation Kami.
- Vérif SEO : `curl` du HTML prod : horaires d'une route est + ouest présents dans le HTML, FAQPage intact.

## Hors scope (explicitement)
- Données temps réel GPS des bus (n'existent pas chez KTEL) : "LIVE" = horaires du jour + countdown, comme le reste du site.
- Refonte des pages paires `[pair]` (déjà récentes).
- MapLibre / carte canvas (rejetée Phase 14, SVG conservé).
- Top routes dynamiques via API Plausible.

## Mise à jour 13/06/2026 — réconciliation avec l'état réel de la page

Entre la validation (12/06) et l'implémentation (13/06), la page `/buses` a évolué (même session) : durcissement du scraper + ajout d'un bandeau d'alertes + restructuration "planner-first" intermédiaire (toutes non committées sur master). Trois ajustements à la spec :

1. **Compteurs de routes** : la spec dit "292 routes, East 228 / West 64". Après durcissement du scraper PDF ektel (commit `99d8b83`, prod), c'est **383 routes : East (herlas) 236, West (ektel) 147**. Les pills de la section 6 deviennent `East · 236`, `West · 147`. Le nombre exact se lit au runtime (`routes.filter(operator_id)`), pas en dur.

2. **Bandeau d'alertes service (nouveau, déjà construit)** : module `lib/bus-alerts.ts` + `BusAlertsBanner` (commit scraper `1d55984`, table `bus_alerts` live). Il s'insère dans l'anatomie comme **section 1bis**, juste sous le header compact et **au-dessus du planner** : bandeau ambre, alertes KTEL Est datées (itinéraires modifiés/travaux), lien annonce officielle. Conservé tel quel dans la refonte (déjà i18n 4 langues, déjà testé). Le board et le bandeau sont indépendants.

3. **Réutilisation du travail planner-first intermédiaire** :
   - Le bloc "Lignes populaires" déjà codé (paires les plus desservies, dérivées de `routes` par nombre de départs) **devient la section 5 "Top routes"** : on garde l'approche **data-driven** (réutilise le `useMemo` `popular` existant) plutôt que la liste curée GSC de la spec initiale — plus simple, déjà construit, pas d'appel runtime (YAGNI tenu autrement). Rendu en lignes compactes (langage section 6).
   - Les **accordéons de cartes** (planner-first intermédiaire) sont **remplacés** par la section 6 "all routes compacté en lignes" (`RouteLine.tsx`). Le `CollapsibleRegion` + `Grid` de cartes sont retirés au profit des lignes + pills `East/West`.
   - Le fix badge prix `(indicatif)`, la mention "horaires non publiés" et la règle zéro-flèche déjà en place sont **repris** dans `RouteLine`.

4. **Base d'implémentation** : on construit **sur l'état actuel non committé** de `BusesClient.tsx` (planner-first + bandeau alertes), pas depuis la version committée. Vu le working tree partagé multi-terminal (autres chantiers non committés), **pas de branche `feat/buses-board` séparée** : travail sur le working tree master, **captures Playwright montrées à Kami AVANT qu'il committe/déploie** (même garde-fou "mockup avant deploy", adapté). Déploiement = commit du bundle `/buses` complet + push `master→main` (Vercel), sur go explicite Kami.

Le reste de la spec (board Solari, planner combobox, desktop 2 colonnes, garde-fous SEO) est inchangé.
