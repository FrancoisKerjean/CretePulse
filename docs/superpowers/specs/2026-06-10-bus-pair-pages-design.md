# Pages SEO par paire — /buses/[pair] (crete.direct)

Date : 2026-06-10
Statut : préco présentée à Kami (« go pour les pages SEO par paire » + « Preco ? » → option data-driven complète retenue)

## Objectif

Capter la longue traîne « bus <ville A> <ville B> horaires/prix » avec ~70-90
pages programmatiques par paire de lieux, alimentées par les données réelles
`bus_routes` (horaires par jour rafraîchis chaque dimanche par le scraper,
prix officiels/curés/estimés, durées).

## Contexte décisif

Les pages `/getting-around/[route]` (8 pages curées en dur, multi-modes) ont
été **noindexées** après 28 j de GSC : 704 impressions, 2 clics, position 38.
Causes identifiées : contenu figé, requêtes génériques ultra-concurrentielles,
maillage faible. Cette feature fait l'inverse : data vivante, longue traîne,
292 liens internes depuis /buses (74 % du trafic du site). Réversible :
noindex possible à J+45 si GSC dit non.

## Décisions

1. **Pas de pilote** : le volume (~80 pages) est nécessaire pour capter la
   longue traîne ; les 10 grosses liaisons seules = segment le plus
   concurrentiel, signal non représentatif.
2. **1 page par paire bidirectionnelle** (`heraklion-to-ierapetra` = aller ET
   retour) : anti-duplicate, contenu plus riche. Ordre du slug : ordre
   alphabétique des slugs des deux lieux.
3. **Filtre qualité** : une paire a une page seulement si les DEUX extrémités
   sont des lieux reconnus = présents dans `bus_destinations` (slug) OU dans
   la liste de lieux à coordonnées du scraper (mirror TS `BUS_PLACE_SLUGS`).
   Les arrêts hôtels/supermarchés (« A1 Super Market », « Stella
   Blue-(Analipsis Hotels) »...) n'ont jamais de page.
4. **Routes directes uniquement** : pas de pages pour les paires à
   correspondance (thin content) ; le bloc « continuer vers » les couvre en
   maillage interne.

## Architecture

### 1. `src/lib/bus-pairs.ts` (pur, zéro I/O, testé par script node)

- `BUS_PLACE_SLUGS: Record<string, string>` : lieu DB → slug URL, mirror
  curé des lieux « dignes » (mêmes ~46 lieux que PLACE_COORDS du scraper,
  est + ouest). Sert aussi de libellé propre.
- `slugifyPlace(place)` / `pairSlug(a, b)` : slug alphabétique stable.
- `eligiblePairs(routes)` : paires directes dont les 2 bouts sont reconnus,
  dédupliquées bidirectionnellement → `[{ slug, placeA, placeB }]`.
- `pairRoutes(routes, slug)` : { outbound: BusRoute[], inbound: BusRoute[] }.
- `onwardPlaces(routes, place)` : destinations directes depuis un lieu
  (pour le bloc « continuer vers » et le maillage).

### 2. Route `src/app/[locale]/buses/[pair]/page.tsx`

- `generateStaticParams` : 4 locales complètes (en/fr/de/el) × paires
  éligibles (pattern airbnb/[neighbourhood] : les 18 autres locales en ISR
  on-demand, fallback EN). `revalidate = 86400`. `notFound()` si slug inconnu.
- Contenu (réutilise les composants/styles de BusesClient) :
  - H1 « Bus Heraklion ↔ Ierapetra : horaires & prix » + badge « Mis à jour le ».
  - Section aller : grilles d'horaires par jour (rendu complet dans le HTML,
    pattern DepartureChips), prix (badge « indicatif » si estimé), durée,
    fréquence. Section retour idem.
  - CTA planificateur : lien `/[locale]/buses?from=X&to=Y` (JourneyPlanner
    apprend à lire les query params — petit ajout).
  - Bloc « continuer depuis <B> » : destinations directes (liens vers les
    autres pages paires éligibles).
  - Liens guides existants : things-to-do / where-to-stay / beaches via
    `bus_destinations` (mêmes garde-fous de slugs que GuideLinks).
  - Lien comparatif `/getting-around/[route]` quand le slug existe (4 routes).
  - Disclaimer horaires + lien source officielle opérateur.
- SEO : metadata title/description 4 langues, `buildAlternates`, JSON-LD
  BreadcrumbList + FAQPage (3 Q générées des données : « Combien coûte le
  bus de A à B ? », « Combien de temps dure le trajet ? », « Quel est le
  premier/dernier départ ? » — uniquement les questions dont on A la donnée).

### 3. Maillage et indexation

- `RouteCard` (/buses) : le header from→to devient un lien vers la page
  paire quand elle existe.
- Sitemap : `push('/buses/<slug>', 'weekly', 0.7)` pour chaque paire
  éligible (lecture DB dans la route sitemap, comme les autres entrées DB).
- IndexNow après deploy.
- JourneyPlanner : lit `?from=&to=` à l'init (useSearchParams) pour le CTA.

### 4. Tests / vérification

- `scripts/check-bus-pairs.mjs` : assertions sur fixtures synthétiques
  (éligibilité — hôtel exclu, slug stable quel que soit le sens, fusion
  aller/retour, onward) + un check DB léger (nombre de paires éligibles
  raisonnable, 50-120).
- tsc + build complet (vérifie generateStaticParams).
- Playwright dev puis prod sur 2 pages (heraklion-to-ierapetra,
  chania-to-paleochora) : H1, horaires aller/retour, FAQ JSON-LD, CTA
  planificateur prérempli.
- Sitemap prod contient les slugs.

## Hors périmètre

- Pages pour paires à correspondance.
- Traductions au-delà du pattern 4 langues + fallback EN.
- Contenu éditorial rédigé par IA (la page est 100 % data + templates).

## Critère de sortie / réversibilité

GSC à J+45 (25/07/2026) : si clics ≈ 0 et position > 30 sur l'ensemble,
basculer noindex comme getting-around (une ligne dans la route + retrait
sitemap). Owner : Kami (revue GSC), exécution Claude.
