# Planificateur d'itinéraire bus — page /buses (crete.direct)

Date : 2026-06-10
Statut : validé par Kami (design + plan B prix)

## Objectif

Sur la page `/buses`, l'utilisateur choisit sa ville de départ, voit la liste
des villes d'arrivée réellement atteignables, choisit une date, et obtient
son itinéraire (horaires du jour choisi, durée, correspondance éventuelle)
et son prix.

## Contexte données (état au 10/06/2026)

- Table `bus_routes` (Supabase) : 230 routes. 224 opérateur `herlas`
  (KTEL Héraklion-Lassithi, est), 6 `ektel` (Chania-Rethymnon, ouest).
- 224 routes ont `departures` + `departures_by_day` ; 101 ont des horaires
  qui varient selon le jour de la semaine → le champ date est utile.
- Seulement 6 routes ont `price_eur` et `duration` (les 6 ektel).
- `season` vaut toujours `all` actuellement.
- KTEL herlas ne publie PAS de grille tarifaire publique sur son site ;
  les prix existent dans son système de billetterie (site Next.js + appli).

## Décisions de cadrage (Kami, 10/06/2026)

1. **Prix** : scraper les tarifs officiels KTEL (plan A), avec plan B validé
   (table curée + estimation au km étiquetée « indicatif »).
2. **Itinéraire** : correspondance unique maximum (pas de routing illimité).
3. **Périmètre** : est de la Crète d'abord (224 routes herlas) ; extension
   du scraper e-ktel.gr (ouest) = phase 2 séparée.

## Architecture

Approche retenue : moteur d'itinéraire 100 % côté client dans la page
existante. Les routes sont déjà chargées par `/buses` (ISR 24 h), aucun
appel réseau supplémentaire. Pas d'API route, pas de pages par paire
(candidates pour une phase ultérieure SEO).

### 1. Data : prix + durées (scraper VPS)

**Plan A — API billetterie herlas (investigation timeboxée)**
- Le site ktelherlas.gr est en Next.js ; chercher l'endpoint JSON utilisé
  par le flux de réservation (fare par paire d'arrêts `ds=fromID,toID`,
  IDs déjà connus du scraper horaires).
- Timebox : une demi-journée d'investigation. Si l'endpoint est exploitable
  et stable → remplir `price_eur` + `duration` des 224 routes herlas,
  rafraîchies par le cron hebdo existant (dimanche 04:00 Athens).
- Garde-fou existant conservé : `replace_operator_routes` ne remplace que
  si ≥ `MIN_ROUTES` lignes ; alerte Telegram (Bot.PLUME) sinon.

**Plan B — si l'API est inexploitable (validé par Kami)**
- Table de prix curée pour les ~15 liaisons principales (grille affichée
  en gare + sources secondaires recoupées : Héraklion→Malia 4,20 €,
  →Matala 8,50 €, →Chania 16 €, etc.), stockée en migration SQL versionnée.
- Pour le reste : prix estimé au km (haversine entre lieux, €/km calibré
  par régression sur les prix connus), arrondi à 0,10 €, plafonné/planché
  sur les bornes observées.
- Nouvelle colonne `price_estimated boolean` sur `bus_routes` : tout prix
  non officiel est affiché avec la mention « indicatif » dans l'UI.
- Méthodologie affichée honnêtement sur la page (pattern beach finder).

### 2. Moteur `src/lib/bus-journey.ts` (fonctions pures, zéro I/O)

- `buildGraph(routes: BusRoute[])` : graphe directionnel from→to.
  Les routes sont traitées comme directionnelles (les horaires retour
  existent en base comme routes séparées) ; pas d'inversion implicite.
- `reachableFrom(graph, from)` : destinations atteignables en direct ou
  via 1 correspondance → alimente le select « Arrivée ».
- `findJourneys(graph, from, to, date)` :
  - trajets directs d'abord ;
  - sinon correspondance unique via hub commun (route from→H et H→to) ;
  - si plusieurs hubs, trier par nombre de départs du jour puis prix total.
- Horaires du jour : date → jour de semaine (timezone Europe/Athens) →
  match sur `departures_by_day[].days` (parsing des libellés
  « Mon, Tue, Wed, Thu, Fri, Sat » / « Sun », etc.) ; fallback sur
  `departures` à plat si pas de groupes.
- Correspondance : si `duration` du tronçon 1 connue, ne proposer que les
  départs du tronçon 2 ≥ arrivée + 15 min de marge ; sinon afficher les
  deux grilles avec avertissement « correspondance à prévoir, durée non
  garantie ».
- Prix : total = somme des tronçons. Mention « indicatif » si au moins un
  tronçon est estimé ; « + tarif au guichet » si un tronçon n'a pas de prix.

### 3. UI (`BusesClient.tsx` + nouveau composant `JourneyPlanner`)

- La carte de recherche actuelle (From/To) devient le planificateur :
  Départ → Arrivée (options = `reachableFrom`, plus « tous les lieux »
  pour conserver le comportement filtre actuel) → Date (input date,
  défaut aujourd'hui, max +60 j) → résultat instantané (pas de bouton
  submit nécessaire, calcul local).
- Carte résultat : tronçon(s) avec horaires du jour choisi, durée si
  connue, prix (badge « indicatif » le cas échéant), point de
  correspondance mis en évidence, lien horaires officiels opérateur.
- Pas de résultat : message existant `noRoute` enrichi (suggestion
  d'inverser, lien comparatif voiture/taxi quand il existe).
- Ville ouest choisie avec données insuffisantes : message clair
  « données ouest partielles, voir KTEL Chania-Rethymnon ».
- Le reste de la page ne bouge pas : `BusNetworkMap` (continue de réagir
  à from/to), annuaire des lignes par région, JSON-LD, FAQ, disclaimer.
- i18n : pattern `T` inline existant (en/fr/de/el, fallback en).
- Accents et caractères spéciaux corrects dans toutes les langues
  (règle projet non négociable).

### 4. Tests et vérification

- Scraper (Python) : pytest sur fixtures réelles committées (HTML/JSON),
  comme l'existant dans `scripts/scrapers/buses/`.
- Moteur (TS) : `scripts/check-bus-journey.mjs`, assertions node sur cas
  réels (direct, correspondance via Ierapetra, dimanche vs semaine, ville
  sans bus, prix estimé vs officiel) — pattern `check-buses-lib.mjs`,
  le projet n'a pas de framework de test TS.
- Vérif locale : Playwright sur dev (sélection départ/arrivée/date,
  itinéraire affiché) + `npm run build` complet avant push.
- Vérif prod après deploy Vercel (curl + Playwright) + IndexNow si
  changement de contenu indexable.

## Risques

- **API billetterie introuvable/instable** : couvert par le plan B validé.
- **Sélecteurs herlas fragiles** : parsers par préfixe (pattern existant),
  fixtures committées.
- **Lieux bruités en base** (« A1 Super Market », arrêts hôtels…) : v1
  les conserve tels quels dans les selects (données réelles d'arrêts) ;
  normalisation/regroupement = amélioration ultérieure si gênant.
- **Correspondances sans durée** : jamais présentées comme garanties,
  avertissement explicite (honnêteté méthodo = positionnement du site).

## Hors périmètre (phases ultérieures)

- Extension scraper e-ktel.gr (ouest) : phase 2.
- Pages statiques SEO par paire `/buses/[from]-to-[to]`.
- Saisons multiples (la base n'a que `all` aujourd'hui).
- Billetterie/réservation (on ne vend rien, on informe).
