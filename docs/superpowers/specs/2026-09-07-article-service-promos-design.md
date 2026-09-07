# Articles crete.direct : encarts voiture, van et bus dans les guides

**Date :** 2026-09-07
**Statut :** design, en attente de validation avant plan d'implémentation
**Branche :** `feat/specs-360-2026-09` · worktree `C:\Users\fkerj\cp-specs-360`
**Patterns repris :** `docs/superpowers/specs/2026-07-28-home-service-rail-design.md` (module pur + `check:*` + `promo_impression`) et `2026-07-29-hero-clickable-design.md` (pas de cible prouvée, pas de lien ; vérification des events au navigateur).

## 1. Objectif et non-objectifs

### Constat mesuré (Plausible ClickHouse, 30 jours au 07/09/2026)

| Fait | Valeur |
|---|---|
| Section `/[locale]/articles/*` | 4 061 visiteurs (+28 %), 43 % du site, 1re section |
| Guides publiés | 374 (`status = published`) |
| ChatGPT, 1re source du site | 1 935 visiteurs, 87 % mobile, atterrit à 63 % sur un article |
| Sessions ChatGPT | mono-page à 81 à 100 %, 1,53 pages par session |
| `promo_impression` avec `source` article | **0**. Sources existantes : `home`, `explore-carousel`, `bus-pair`, `bus-pair-complete`, beach, village |
| Impressions car-promo / van-promo, tout le site | 3 470 / 325 |
| Conversion van | 9,4 % (8 réservations pour 85 visiteurs) |
| Articles à 50 visiteurs ou plus / à moins de 10 | 23 / 115 |
| Lighthouse guide | LCP 9,7 s |

Lecture : environ 40 % du trafic du site entre par un article, y lit une page, et repart sans avoir vu une seule offre. Le service qui convertit le mieux (van) est celui qui a le moins d'impressions. Il n'y a rien à inventer, seulement à monter sur les articles les composants qui existent déjà partout ailleurs.

Vérifié dans le code : `src/app/[locale]/articles/[slug]/page.tsx` n'importe ni `CarPromo`, ni `VanPromo`, ni `ImpressionTracker`. Les 20 pages qui montent `CarPromo` (`grep -rl CarPromo src/app`) sont des pages plage, village, randonnée, bus, aéroport, itinéraire. Aucune page article.

### Objectif

Chaque article publié montre, dans le HTML rendu par le serveur, un ou deux encarts vers le service crete.direct qui répond à ce que l'article fait naître : une voiture, une place de van, ou un horaire de bus. Chaque encart est mesuré avec le `promo_impression` existant, `source: "article"`, et son clic se retrouve dans les events de conversion déjà en place.

### Non-objectifs

- **Pas de stays.** `/stays` est noindex et n'encaisse pas (décision du 25/07, `src/app/[locale]/stays/metadata.ts`). Aucune carte villa, aucun lien vers `/stays`, même sur les articles « où loger ».
- **Aucune mention ni lien vers une marque tierce.** La page article porte aujourd'hui un bloc `KAIROS_CTA` (constante dans `page.tsx`, quatre locales, lien externe `target="_blank"` vers un site d'immobilier). Ce bloc contrevient au cloisonnement de crete.direct et il **est retiré dans ce chantier** : l'encart de fin prend sa place exacte dans le DOM. Ce n'est pas un ajout au scope, c'est la seule position de fin de page disponible.
- Pas d'activités dans cette itération : `/activities` n'a pas de composant `PromoBox` prêt, et 39 activités pour 374 articles obligerait à un routage géographique qu'on ne sait pas encore tester. Reporté après la lecture à 30 jours.
- Pas de refonte du wizard voiture, de `van.crete.direct` ni du planificateur bus. Les encarts leur envoient du trafic avec une `source`, ils ne les modifient pas.
- Pas de nouvelle dépendance, pas de nouveau composant visuel : `PromoBox` reste l'unique pattern d'encart du site (`src/components/PromoBox.tsx`, en-tête du fichier).

## 2. Règle de routage article vers service

### 2.1 Ce que la base sait vraiment d'un article

Colonnes utiles de `guides` (type `Guide`, `src/lib/guides.ts`) : `slug`, `format`, `category` (texte libre), `keywords text[]`, `titles jsonb`, `contents jsonb`, 22 locales. **Il n'y a pas de colonne `tags`** : le brief la citait, elle n'existe pas ; `keywords` joue ce rôle.

Le type TypeScript déclare `format: "long" | "mid" | "daily"` mais la base contient aussi `news` et `short`. Le module de routage doit élargir le type localement, ou un article `news` tomberait dans le défaut sans qu'on le voie.

Répartition réelle des 374 guides publiés, mesurée le 07/09/2026 via PostgREST (`format/category : nombre`) :

| Famille | Couples | Total |
|---|---|---|
| Daily | `daily/daily-weather` 105 · `daily/daily-news` 67 | 172 |
| News | `news/infrastructure` 26 · `news/permits` 6 · `news/airport` 4 · `news/tourism` 2 · `news/news` 2 · `long/news` 1 | 41 |
| Plages | `mid/beaches` 10 · `long/beaches` 9 | 19 |
| Randonnée et nature | `long/hikes` 6 · `mid/hikes` 6 · `long/nature` 5 · `mid/nature` 4 | 21 |
| Excursions | `long/day-trips` 4 · `mid/day-trips` 3 | 7 |
| Voyage, pratique | `long/travel` 23 · `mid/travel` 6 · `short/travel` 2 · `long/tourism` 6 · `long/practical` 3 · `long/data` 2 | 42 |
| Ville : cuisine, culture, histoire, nuit | `long/food` 7 · `mid/food` 7 · `mid/culture` 8 · `long/culture` 2 · `long/history` 7 · `mid/history` 5 · `mid/nightlife` 5 | 41 |
| Famille, bien-être | `long/family` 6 · `mid/family` 6 · `long/wellness` 1 | 13 |
| Expat, immobilier | `long/expat` 5 · `mid/expat` 3 · `long/real-estate` 3 · `mid/real-estate` 4 · `long/property` 3 | 18 |

Les 7 catégories de `CATEGORY_LABELS` (`src/app/[locale]/articles/articles-shared.tsx` : beaches, hikes, travel, food, expat, news, family) ne couvrent donc que la moitié des valeurs réelles. Le routage travaille sur la valeur brute de `category`, avec un défaut, jamais sur ces libellés.

Catégories des dix premiers articles d'entrée, vérifiées en base : `best-beaches-crete` beaches · `balos-lagoon-guide` beaches · `best-areas-to-stay-crete` travel · `long-term-rentals-crete` real-estate · `e4-trail-crete` hikes · `knossos-palace-complete-guide` history · `day-trips-from-heraklion` day-trips · `best-tavernas-chania` food · `elafonisi-vs-balos` (beaches, même famille) · `snorkeling-spots-crete-guide` (slug exact en base).

### 2.2 Module pur `src/lib/article-promo.ts`

Aucun JSX, aucun accès réseau, comme `home-services.ts` et `hero-links.ts`.

```ts
export type ArticlePromoKind = "car" | "van" | "bus" | "none";

export interface ArticlePromo {
  kind: ArticlePromoKind;
  variant: 1 | 2 | 3;                 // stable par slug (hash), jamais aléatoire
  pickup?: string;                    // slug CAR_ZONES (car)
  landing?: string;                   // slug CAR_LANDINGS explicite (car, aéroport)
  corridor?: VanCorridor;             // van, corridor nommé ; absent = van générique
  busFrom?: string; busTo?: string;   // bus, noms de lieux BUS_PLACE_SLUGS
}

export interface ArticlePromoPlan {
  mid: ArticlePromo;                  // après le 2e H2
  end: ArticlePromo;                  // après la FAQ
}

export function resolveArticlePromo(
  guide: Pick<Guide, "slug" | "format" | "category" | "keywords" | "titles" | "contents">,
): ArticlePromoPlan;

export function detectPlaces(text: string): DetectedPlaces;   // corridor, pickup, bus places
export function splitAfterSecondH2(html: string): [string, string] | null;
export const PILOT_SLUGS: readonly string[];                    // les 23 de la phase 1
```

### 2.3 Détection des lieux

Un article ne porte un lieu que dans son texte. Vérifié sur les slugs des 162 guides éditoriaux : `heraklion` 9, `chania` 9, `rethymno` 3, et **zéro** pour Sitia, Ierapetra, Matala, Paleochora, Makrigialos, Elounda, Agios Nikolaos, Kissamos. Le slug seul ne suffit donc pas.

`detectPlaces` lit, dans cet ordre et en anglais : le titre `titles.en`, les `keywords`, le slug, puis les **1 500 premiers caractères** de `contents.en` (chapô et premiers H2). Jamais le contenu entier : coût borné, résultat prévisible, et le lieu qui compte est nommé tôt ou n'est pas le sujet.

Dictionnaire, construit une fois au chargement du module à partir des listes déjà dans le dépôt, sans nouvelle liste à tenir en phase :

- extrémités des corridors : `VAN_CORRIDORS` (`src/lib/van-corridors.ts`), champs `fromName` et `toName`, 16 corridors actifs, 8 paires ;
- pickups voiture : `CAR_ZONES[].pickups` (`src/lib/car-partners.ts`), 23 slugs dans 4 zones ;
- landings : `CAR_LANDINGS` (`src/lib/car-landings.ts`), 14 slugs, dont `heraklion-airport` et `chania-airport` ;
- lieux bus : `BUS_PLACE_SLUGS` (`src/lib/bus-pairs.ts`).

Correspondance mot entier, plus long nom d'abord, même mécanique que `autolinkHtml` (`src/lib/autolink.ts`) : regex `(?<![\p{L}\p{N}])nom(?![\p{L}\p{N}])` avec le drapeau `u`. « Sitia » ne matche pas « Sitiaki ». Les alias du bus vers les corridors passent par `normalizeBusSlug` (déjà dans `van-corridors.ts` : `heraklion` vers `heraklion-airport`, `makry-gyalos` vers `makrigialos`).

Le corridor retenu est celui dont l'extrémité **hors aéroport** est citée (Paleochora, Matala, Sitia, Ierapetra, Makrigialos, Agios Nikolaos, Rethymno) ; on prend le sens aéroport vers ville, qui est celui d'un lecteur qui prépare son arrivée. Deux villes citées : la première dans le texte gagne. Aucune : van générique.

### 2.4 Table de routage

Le tableau se lit ligne par ligne, première ligne qui matche. `mid` est l'encart principal, `end` l'encart secondaire ; les deux ne montrent jamais le même service (sinon `end = none`).

| # | Condition (format, catégorie, texte) | `mid` | `end` | Pourquoi |
|---|---|---|---|---|
| 1 | `format = daily`, `category = daily-weather` (105) | none | none | Bulletin lu par des gens déjà sur place, existe en anglais seul (noindex sur 21 locales, `isGuideTranslated`), aucun dans les 23 premiers, et la page embarque déjà une vidéo verticale (`YouTubeEmbed vertical`). Un encart de plus y coûte du LCP pour un trafic qu'on ne mesure pas. Réexamen à 30 jours si un daily dépasse 50 visiteurs. |
| 2 | `format = daily`, `category = daily-news` (67) | bus générique | none | Lecteur sur l'île ou local : le bus est l'outil qui lui sert aujourd'hui, la voiture est hors sujet à J0. Un seul encart, en fin d'article, pour ne pas alourdir un format court. |
| 3 | `format = news`, `category = airport` (4) | car, `landing: "heraklion-airport"` | van générique | Article d'aéroport : le lecteur arrive ou part. Même choix que `src/app/[locale]/airport/[slug]/page.tsx`. |
| 4 | `format = news`, autres catégories (37) | none | bus générique | Infrastructure, permis, tourisme : lectorat informé, souvent local ou professionnel. Le bus n'engage à rien et se mesure. Format court, souvent moins de 3 H2 : l'encart va en fin d'article comme pour daily-news, sinon la découpe ne le montrerait jamais. |
| 5 | Texte cite « airport », « transfer », « arrival », « getting to » | van corridor si détecté, sinon van générique | car, `landing` de l'aéroport cité | Le van convertit à 9,4 % et n'a que 325 impressions : quand l'article parle d'arrivée, il passe devant. |
| 6 | `category` dans beaches | car, `pickup` de la zone détectée | van corridor si une ville de corridor est citée, sinon bus si un lieu bus est cité, sinon none | Balos, Elafonisi, Falassarna, Preveli : parking et pistes, le bus n'y va qu'en saison et une fois par jour. La voiture reste l'offre principale. |
| 7 | `category` dans hikes, nature | car, `pickup` détecté | bus si un lieu bus est cité | Départs de gorges hors réseau KTEL sauf Samaria et Imbros ; la mention d'un lieu bus donne un bloc horaire honnête. |
| 8 | `category` dans day-trips | car, `pickup` détecté | van corridor si détecté | « day-trips-from-heraklion » : voiture depuis Héraklion, van si Matala ou Agios Nikolaos sont cités. |
| 9 | `category` dans food, culture, history, nightlife (article de ville) | car, `pickup` = ville détectée (`landingForPickup` route vers `/car-rental/chania` etc.) | bus, `busFrom` = ville détectée, `busTo` si un second lieu bus est cité | Le lecteur d'un guide tavernes de La Canée dort à La Canée ; le bus lui sert pour rayonner, la voiture s'il veut sortir de la ville. |
| 10 | `category` dans travel, tourism, practical, data, short (hébergement, saison, budget, « best areas to stay ») | car générique, ou `pickup` si une ville est citée | van générique | Choisir sa base, c'est ensuite choisir comment en sortir. Aucun lien vers `/stays`. |
| 11 | `category` dans family, wellness | car | none | Poussettes et sièges enfant (`car-child-seats.ts` existe) : la voiture est la seule offre pertinente. |
| 12 | `category` dans expat, real-estate, property | car générique | none | « long-term-rentals-crete » fait 107 visiteurs : ce lecteur visite avant de louer. Une voiture, sans plus. Pas de stays, pas de conseil immobilier. |
| 13 | Tout le reste | car générique | none | Défaut demandé, et le format prouvé (bandeau voiture à 5,7 % de clic sur la home). |

Règles transverses :

- **Moins de trois H2 dans le contenu : pas d'encart `mid`**, seulement `end`. Un encart au tiers d'un article de 500 mots coupe la lecture, il ne l'accompagne pas. `extractToc` (`src/lib/guides.ts`) compte déjà les H2 porteurs d'`id`.
- **Pickup non couvert par `zoneForPickup` : `pickup` reste indéfini**, le wizard ouvre à l'étape 1 (comportement documenté dans l'en-tête de `CarPromo.tsx`). On ne devine pas une agence.
- **Pas de cible prouvée, pas de lien** (règle de la spec hero) : un corridor s'affiche seulement s'il est dans `VAN_CORRIDORS` ; une paire bus seulement si les deux slugs existent dans `BUS_PLACE_SLUGS`.
- `variant` = `hash(slug) mod N` avec N le nombre de variantes du service. Stable d'un rendu à l'autre, réparti à peu près également, lisible dans Plausible. Pas d'A/B côté client : ce serait du JavaScript et du CLS.

### 2.5 Cibles des liens

| Service | Href | Ce qui porte la source |
|---|---|---|
| Voiture | `/${locale}/car-rental/${landing}` ou `/${locale}/car-rental`, `?pickup=` si différent de la landing, `?source=article` | `CarRentalWizard.tsx` ligne 330 : `sp.get("source")` prime sur la prop, puis part dans `Car Wizard Viewed` (ligne 395) et dans tous les events du tunnel |
| Van corridor | `https://van.crete.direct/${locale ∈ en,fr,de,el ? locale : "en"}/${corridor.slug}?source=article` | même construction que `VanPromo.tsx` ; le dépôt `~/van-crete-direct` (séparé, branche `master`, route `src/app/[locale]/[corridor]`) stocke un champ `source` sur ses réservations (`src/lib/types.ts` ligne 103) |
| Van générique | `https://van.crete.direct/?source=article` | racine, comme `home-services.ts` |
| Bus | `/${locale}/buses?from=${busFrom}&to=${busTo}` (noms de lieux, pas slugs) | `BusesClient.tsx` lignes 361 à 372 lit `from` et `to` après hydratation et préremplit le planificateur ; `busTo` absent : `from` seul, le board de départs suit |

`van.crete.direct` est un autre dépôt (`grep van_booking|van_corridors src` ne renvoie que `src/lib/van-corridors.ts`, copie manuelle de la table). Aucune modification n'y est nécessaire : `source` est déjà accepté en query.

## 3. Placement et rendu

### 3.1 Deux positions, pas plus

```
Hero (60vh, image LCP)            inchangé
Barre auteur                      inchangé
[YouTubeEmbed]                    inchangé
<article> partie 1 : jusqu'au 2e H2 inclus et sa section
► ENCART MID                      nouveau (si 3 H2 ou plus)
<article> partie 2 : le reste
FaqSection                        inchangé
► ENCART END                      remplace le bloc KAIROS_CTA, même position
Related guides                    inchangé
DiscoverCrete                     inchangé
```

« Après le 2e H2 » signifie après la section ouverte par le 2e H2, c'est-à-dire juste avant le 3e `<h2`. Le lecteur a lu l'introduction et deux sections : il sait s'il ira. Insérer avant, c'est de la publicité ; après, c'est une réponse.

### 3.2 Découpage du HTML

`splitAfterSecondH2(html)` opère sur `linkedContent`, donc **après** `autolinkHtml` (les liens internes du corps sont conservés tels quels). Découpe au début de la 3e occurrence de `<h2\b`. Garde-fous, tous testés :

- moins de trois `<h2` : retourne `null`, pas d'encart mid ;
- la partie 1 doit avoir un nombre égal d'ouvertures et de fermetures pour `div`, `section`, `ul`, `ol`, `blockquote`, `table`, `figure` ; sinon `null`. Un H2 imbriqué dans un bloc ouvert produirait un DOM invalide et, lui, un vrai CLS à l'hydratation ;
- jamais de découpe à l'intérieur d'un `<a>` ou d'un `<pre>` (même compteur).

Rendu dans `page.tsx` : deux `<div dangerouslySetInnerHTML>` portant la classe `article-prose`, l'encart entre les deux, le tout dans le même `<article>`. Pas de `<article>` scindé, la sémantique et le schéma `Article` ne bougent pas. `ReadingProgressBar` mesure le défilement du document, il n'est pas affecté.

### 3.3 Performance : les contraintes non négociables

- **Rendu serveur.** `page.tsx` est un composant serveur en ISR (`revalidate = 172800`). `resolveArticlePromo` et `splitAfterSecondH2` s'exécutent au rendu, l'encart est dans le HTML servi par le CDN. Aucun `useEffect`, aucun fetch client.
- **Zéro CLS.** L'encart occupe sa place dans le flux HTML dès le premier octet. `PromoBox` positionne sa photo en `absolute` avec `loading="lazy"`, la hauteur vient du texte : rien ne saute quand l'image arrive.
- **LCP intact.** Le LCP de la page est l'image du hero (`<img>` 60vh sans `priority`, sujet à part, non traité ici). Les encarts sont sous le pli sur mobile (390 px : le hero fait 440 px minimum, puis barre auteur et deux sections) et leurs images sont paresseuses. Mesure avant et après sur `balos-lagoon-guide` en mobile Lighthouse, la valeur ne doit pas bouger de plus que le bruit de mesure (0,3 s).
- **JavaScript client ajouté : rien de nouveau.** `ImpressionTracker` (`src/components/ui/ImpressionTracker.tsx`, `IntersectionObserver`, span de hauteur 0) et `VanPromo` (`"use client"` pour `onClickCapture`) sont déjà dans le bundle des pages bus. `CarPromo` n'a pas de directive client. Le nouveau `BusPromo` suit `VanPromo`.
- **ChatGPT et les crawlers n'exécutent pas le JavaScript.** Ce qu'ils lisent, c'est le HTML serveur : l'encart y est, avec son lien. Le visiteur qui clique depuis ChatGPT arrive dans un vrai navigateur, où `ImpressionTracker` mesure normalement.

### 3.4 Composants

- `src/components/car-rental/CarPromo.tsx` : deux props optionnelles ajoutées, `copy?: { title; line; cta; disclosure }` (défaut : le `COPY` interne, rien ne change pour les 20 appelants) et `slug?: string` (ajouté aux props de `promo_impression` s'il est présent). Aucun appelant existant n'est touché.
- `src/components/VanPromo.tsx` : mêmes deux props ; `slug` est aussi ajouté aux props de `van_offer_click`. Nouvelle prop `generic?: { href }` pour le van sans corridor : aujourd'hui le composant retourne `null` sans corridor (`if (!main) return null`), le cas générique n'existe nulle part.
- `src/components/buses/BusPromo.tsx` : nouveau, calqué sur `VanPromo` : `PromoBox` avec l'icône `Bus` de lucide, `ImpressionTracker` `block: "bus-promo"`, clic tracé `bus_promo_click` avec `{ slug, from, to, source }`. Sans photo (variante compacte claire de `PromoBox`) : aucun asset nouveau, et un encart plus léger que les deux autres, ce qui correspond à son poids commercial.
- `src/components/articles/ArticlePromoSlot.tsx` : composant serveur qui reçoit un `ArticlePromo`, le `locale`, le `slug`, résout la copie via `getTranslations({ locale, namespace: "articlePromo" })` et rend le bon composant. C'est le seul endroit qui connaît les trois services. `kind: "none"` rend `null`.

Tous les liens internes passent par des `href` absolus préfixés de la locale, comme `CarPromo` le fait aujourd'hui.

## 4. Textes

### 4.1 Pourquoi les messages next-intl et pas les `COPY` internes

`CarPromo` et `VanPromo` portent chacun une table `COPY` en 4 locales avec repli anglais. Sur un article, 18 locales sur 22 recevraient donc l'encart en anglais au milieu d'un texte traduit. Le namespace `home` montre la voie : `serviceRail.*` existe dans les 22 fichiers `src/messages/*.json`, `check:i18n` garantit la parité des clés. Les textes des encarts article vivent dans un nouveau namespace `articlePromo` de ces mêmes fichiers.

### 4.2 Clés à ajouter (33 feuilles, dans les 22 fichiers)

```
articlePromo.disclosure.car            articlePromo.disclosure.van            articlePromo.disclosure.bus
articlePromo.car.v1.{title,line,cta}   articlePromo.car.v2.{title,line,cta}   articlePromo.car.v3.{title,line,cta}
articlePromo.van.corridor.v1.{title,line,cta}   articlePromo.van.corridor.v2.{title,line,cta}
articlePromo.van.generic.v1.{title,line,cta}    articlePromo.van.generic.v2.{title,line,cta}
articlePromo.bus.pair.v1.{title,line,cta}       articlePromo.bus.pair.v2.{title,line,cta}
articlePromo.bus.generic.{title,line,cta}
```

Variables ICU : `{from}`, `{to}`, `{price}` pour le van corridor ; `{from}` et `{to}` pour le bus. `check:i18n` passe de son compte actuel à +33 sur chaque locale.

### 4.3 Copie de référence (français, à traduire dans les 21 autres locales)

Contraintes : phrases courtes, un fait par ligne, aucun tiret cadratin (`check:da` R11 sur les `.json`), aucun chiffre non sourcé, aucune promesse de disponibilité ni d'économie. Le seul chiffre est le prix plancher des corridors, 20 € la place, lu dans `VAN_CORRIDORS` (Héraklion aéroport vers Agios Nikolaos), et il vient de la donnée, pas du texte.

| Clé | Texte |
|---|---|
| `disclosure.car` | Partenaire local |
| `disclosure.van` | van.crete.direct |
| `disclosure.bus` | Horaires officiels KTEL |
| `car.v1.title` | Une voiture pour ce trajet ? |
| `car.v1.line` | Agence locale, devis en quatre étapes, aucun prépaiement. |
| `car.v1.cta` | Obtenir un devis |
| `car.v2.title` | Le bus ne va pas partout ici. |
| `car.v2.line` | Louez auprès d'une agence de l'île. Prix annoncé, retrait à l'aéroport possible. |
| `car.v2.cta` | Voir les prix |
| `car.v3.title` | Vous avez le guide. Reste le trajet. |
| `car.v3.line` | Voiture de location locale, réponse rapide, espèces acceptées. |
| `car.v3.cta` | Demander un devis |
| `van.corridor.v1.title` | Van partagé {from} vers {to} |
| `van.corridor.v1.line` | Dès {price} € la place. Chauffeur local licencié, aucun paiement maintenant. |
| `van.corridor.v1.cta` | Rejoindre un groupe |
| `van.corridor.v2.title` | {to} depuis l'aéroport, sans louer de voiture |
| `van.corridor.v2.line` | Van partagé dès {price} € la place. Le départ est confirmé quand le groupe se remplit. |
| `van.corridor.v2.cta` | Voir les départs |
| `van.generic.v1.title` | De l'aéroport à votre ville, en van partagé |
| `van.generic.v1.line` | Huit trajets depuis Héraklion et La Canée, dès 20 € la place. |
| `van.generic.v1.cta` | Voir les trajets |
| `van.generic.v2.title` | Pas de voiture ? Partagez un van. |
| `van.generic.v2.line` | Chauffeur local, aucun paiement à la réservation. |
| `van.generic.v2.cta` | Voir les trajets |
| `bus.pair.v1.title` | Y aller en bus depuis {from} |
| `bus.pair.v1.line` | Horaires du jour, durée et prix du billet. |
| `bus.pair.v1.cta` | Voir les horaires |
| `bus.pair.v2.title` | Le bus {from} vers {to}, aujourd'hui |
| `bus.pair.v2.line` | Correspondances et prix, d'après les horaires KTEL. |
| `bus.pair.v2.cta` | Ouvrir le planificateur |
| `bus.generic.title` | Se déplacer en bus en Crète |
| `bus.generic.line` | Horaires, prix et correspondances des réseaux KTEL. |
| `bus.generic.cta` | Voir les horaires |

Le « dès 20 € » et le « huit trajets » de `van.generic.v1` sont des faits lus dans `VAN_CORRIDORS` le 07/09/2026. Si la table change, la ligne ment : l'implémentation calcule le minimum et le nombre de paires depuis `VAN_CORRIDORS` et les injecte comme variables (`{price}`, `{count}`) plutôt que de les figer dans 22 fichiers. Même leçon que le « Quatre services » corrigé le 29/07 dans la spec du rail.

## 5. Priorité de déploiement

### Phase 1 : les 23 articles à 50 visiteurs ou plus

`PILOT_SLUGS` dans `article-promo.ts` : la liste exacte des 23 slugs de l'export Plausible du 07/09/2026. Dix sont connus dans ce document (`best-beaches-crete`, `balos-lagoon-guide`, `best-areas-to-stay-crete`, `long-term-rentals-crete`, `e4-trail-crete`, `knossos-palace-complete-guide`, `day-trips-from-heraklion`, `best-tavernas-chania`, `elafonisi-vs-balos`, `snorkeling-spots-crete-guide`). Les 13 autres sont copiés du même export au moment de la tâche 1, pas devinés. `resolveArticlePromo` retourne `none/none` hors liste tant que la constante existe.

Ces 23 articles portent la majorité du trafic article : c'est là que sept jours suffisent à voir si les events partent, si les variantes se répartissent, et si le LCP tient. Pas de variable d'environnement pour ce cran : la spec du rail a documenté le piège (valeur figée à l'image de déploiement, effet jusqu'à 24 h après). Une constante et un commit de retrait sont plus courts et plus lisibles.

### Phase 2 : tous les articles

Commit qui supprime `PILOT_SLUGS` et la condition, après la lecture J+7 (section 6). Les 374 pages sont régénérées au déploiement suivant : `generateStaticParams` prébuilde jusqu'à 500 guides, un déploiement invalide le cache ISR, les 48 h de `revalidate` ne retardent donc rien.

## 6. Mesure

### 6.1 Events

| Étape | Event | Props utiles | Existe déjà |
|---|---|---|---|
| Impression | `promo_impression` | `block: car-promo, van-promo, bus-promo` · `source: article` · `slug` · `variant` | oui, `slug` et `variant` ajoutés |
| Clic voiture | `Car Wizard Viewed` | `source: article` · `pickup` · `entry_step` | oui, `CarRentalWizard.tsx` ligne 395 |
| Tunnel voiture | `Car Lead Submitted` et suivants | `source: article` | oui, mêmes events que les autres sources |
| Clic van | `van_offer_click` | `corridor` · `source: article` · `slug` | oui, `slug` ajouté |
| Réservation van | champ `source` de la réservation côté `van-crete-direct` | `article` | oui, à confirmer en lecture de la table à J+30 |
| Clic bus | `bus_promo_click` | `slug` · `from` · `to` · `source: article` | non, nouveau |

Le `pathname` est attaché par Plausible à chaque event : le CTR par article se lit sans requête ClickHouse, filtre `source = article`, répartition par `slug`.

### 6.2 Tableau de bord (requêtes ClickHouse `events_v2`, 30 jours)

1. Impressions `source = article`, par `block` et par `variant`.
2. `Car Wizard Viewed` où `source = article` divisé par impressions `car-promo` article : CTR voiture.
3. `van_offer_click` où `source = article` divisé par impressions `van-promo` article : CTR van ; puis réservations `source = article` dans `van-crete-direct`.
4. `bus_promo_click` divisé par impressions `bus-promo`.
5. Garde-fous : pages par session et durée moyenne sur `/articles/*`, comparées aux 30 jours précédents ; LCP Lighthouse mobile sur `balos-lagoon-guide` avant et après.

### 6.3 Objectifs à 30 jours après la phase 2

Baseline : 0 impression, 0 clic depuis les articles. Les chiffres ci-dessous sont des seuils de décision, pas des prévisions.

| Indicateur | Seuil | Raisonnement |
|---|---|---|
| Impressions `source = article` | 3 000 ou plus | 4 061 visiteurs par mois, encart mid vu par environ la moitié des lecteurs qui dépassent le 2e H2, encart de fin par un quart |
| `Car Wizard Viewed` `source = article` | 90 ou plus | 3 % des impressions, en dessous des 5,7 % du bandeau home qui est un format plus grand et plus haut |
| `van_offer_click` `source = article` | 30 ou plus, et 2 réservations | à 9,4 % de conversion sur van.crete.direct, 30 clics donnent 2 à 3 réservations ; c'est le signal qu'on cherche |
| `bus_promo_click` | 60 ou plus | outil gratuit, le clic coûte moins |
| Pages par session articles | pas de baisse au-delà de 5 % | un encart qui fait fuir se voit ici |
| LCP mobile `balos-lagoon-guide` | 9,7 s ± 0,3 s | inchangé |

Sous les seuils voiture et van à J+30 : on change les variantes, pas le placement. Sous le garde-fou pages par session : l'encart mid recule au 3e H2. Rien n'est retiré sur la base d'une semaine.

## 7. Risques

| Risque | Ce qu'on fait |
|---|---|
| **LCP 9,7 s aggravé** | Encarts sous le pli, images `loading="lazy"` en `absolute`, aucun script nouveau, mesure avant et après obligatoire (section 9). Le LCP est dû au hero, chantier distinct. |
| **CLS à l'insertion** | Rendu serveur dans le flux, hauteur portée par le texte, garde-fou d'équilibrage des balises avant découpe. Un DOM invalide serait la seule source de saut : il est testé. |
| **ChatGPT ne voit pas l'encart** | Il est dans le HTML serveur. Ce qui compte pour la conversion, c'est le lecteur qui arrive de ChatGPT dans son navigateur mobile, et lui exécute le JavaScript. |
| **Cannibalisation du texte** | Deux encarts au maximum, jamais avant le 3e H2, pas d'encart mid sous trois H2, `<aside>` sémantique. Garde-fou pages par session. |
| **Découpe qui casse un article** | `splitAfterSecondH2` retourne `null` dès qu'un doute existe ; l'article s'affiche alors entier, avec le seul encart de fin. Dégradation silencieuse plutôt que page cassée. |
| **Corridor détecté à tort** (« Rethymno » cité dans un article sur les plages de La Canée) | Détection limitée aux 1 500 premiers caractères et au titre ; première ville citée. Le pire cas est un corridor voisin, pas une erreur : la ville existe, le prix est vrai. Ajustement possible par slug si la lecture J+7 montre un cas absurde. |
| **`PromoBox` marque tout lien externe `rel="nofollow noopener sponsored"`** | `van.crete.direct` est un sous-domaine du site, `sponsored` n'est pas exact. Comportement existant sur les pages bus, laissé tel quel dans ce chantier ; `SHORTCUT: rel sponsored sur un lien interne au domaine, à lever quand van.crete.direct passe indexable`. |
| **18 locales en repli anglais** sur les articles non traduits | L'article lui-même y est en anglais (`getLocalizedGuideField` retombe sur `en`) et noindex. L'encart y sera traduit dans la langue de l'URL grâce aux messages : plus cohérent que le corps. Acceptable. |
| **Bloc `KAIROS_CTA` retiré** | C'était un lien sortant sur 374 pages vers un domaine tiers, en contradiction avec la règle de cloisonnement du site. Sa suppression fait partie de la remise en conformité, aucune valeur perdue côté crete.direct. |
| **`StickyNewsletterBar` chevauche l'encart de fin sur mobile** | Contrôle visuel à 390 px prévu. Si chevauchement, marge basse sur l'encart de fin, rien d'autre. |
| **Type `format` incomplet** | Le module élargit `format` à `"long" | "mid" | "short" | "daily" | "news"` et teste explicitement `news` et `short`. |

## 8. Tests à écrire

Pattern du dépôt : scripts purs `scripts/check-*.mjs` en `node --experimental-strip-types`, `assert/strict`, câblés dans `package.json` et dans l'agrégat `npm run check`, lui-même lancé par `scripts/ship.sh` (ligne 48).

### `scripts/check-article-promo.mjs` (nouveau, script `check:article-promo`)

Routage :
- chacun des dix slugs connus, avec sa catégorie réelle et un titre représentatif, donne le couple `mid/end` attendu par la table de la section 2.4 ;
- `daily/daily-weather` donne `none/none` ; `daily/daily-news` donne `none` en mid et `bus` générique en end ;
- `news/airport` donne car avec `landing: "heraklion-airport"` ; `news/infrastructure` donne `none` en mid et `bus` générique en end ;
- catégorie inconnue (`"zzz"`) donne car générique ;
- `format: "short"` et `format: "news"` ne tombent pas dans une branche par défaut silencieuse ;
- moins de trois H2 : `mid.kind === "none"` quelle que soit la catégorie ;
- mid et end ne sont jamais du même `kind` ;
- `variant` est stable pour un même slug sur deux appels, et prend chacune des valeurs sur un échantillon de 50 slugs.

Détection :
- « Paleochora » dans le titre donne le corridor `chania-airport--paleochora`, sens aéroport vers ville ;
- « Sitiaki » ne matche pas Sitia ; « Agios Nikolaos » matche malgré l'espace ;
- « Chania » donne `pickup: "chania"` et `landingForPickup` non nul ; « Kalyves » donne un pickup en zone mais aucune landing ;
- un texte sans lieu donne van générique et pickup indéfini ;
- le contenu au-delà de 1 500 caractères n'est pas lu (lieu placé à 1 600 caractères : non détecté).

Découpe :
- 0, 1, 2 H2 : `null` ; 3 H2 : deux parties, la seconde commence par `<h2` ;
- H2 dans un `<div>` ouvert : `null` ; H2 dans une `<ul>` ouverte : `null` ;
- les liens posés par `autolinkHtml` en partie 1 sont conservés octet pour octet ;
- la concaténation des deux parties est égale à l'entrée.

Pilote :
- `PILOT_SLUGS` a 23 entrées uniques, toutes en minuscules et sans slash.

### Contrôles existants qui couvrent le reste

- `check:i18n` : 33 clés `articlePromo.*` présentes dans les 22 fichiers.
- `check:da` : aucun tiret cadratin dans les nouveaux `.json` et `.tsx`.
- `tsc --noEmit` : les props ajoutées à `CarPromo` et `VanPromo` restent optionnelles, aucun appelant ne casse.

### Vérification au navigateur, jamais à la lecture du code

Méthode de la spec du rail, rejouable : build de production servi en local, `/en/articles/balos-lagoon-guide` en 390 px, bloquer `script.outbound-links.js`, défiler jusqu'à chaque encart, cliquer, lire `window.plausible.q`. Attendu : deux `promo_impression` (`source: article`, `slug: balos-lagoon-guide`, `variant`), un `Car Wizard Viewed` avec `source: article` sur la page d'arrivée, un `van_offer_click` ou `bus_promo_click` selon le plan de cet article. Espionner `window.plausible` donne un faux négatif, le script Plausible écrase la fonction.

## 9. Effort et ordre des tâches

| # | Tâche | Heures |
|---|---|---|
| 1 | Récupérer les 13 slugs manquants de l'export Plausible du 07/09, vérifier en base la catégorie des 23 ; écrire `src/lib/article-promo.ts` (routage, détection, découpe, `PILOT_SLUGS`) et `scripts/check-article-promo.mjs` en TDD ; câbler `check:article-promo` | 3,0 |
| 2 | Props `copy` et `slug` sur `CarPromo` et `VanPromo`, cas générique de `VanPromo`, nouveau `BusPromo`, `ArticlePromoSlot` | 2,0 |
| 3 | 33 clés `articlePromo.*` dans les 22 fichiers de messages, copie de référence de la section 4.3, `check:i18n` et `check:da` verts | 2,0 |
| 4 | Intégration dans `page.tsx` : découpe, deux slots, retrait de `KAIROS_CTA`, `tsc`, `next build` | 1,5 |
| 5 | Contrôle visuel desktop et 390 px, events lus dans `window.plausible.q`, Lighthouse mobile avant et après sur `balos-lagoon-guide` | 1,5 |
| 6 | `npm run ship` phase 1 ; J+7 : lecture des impressions par variante et des CTR, correction éventuelle d'un routage absurde ; commit de retrait de `PILOT_SLUGS` ; ship phase 2 | 1,0 |
| 7 | J+30 : requêtes de la section 6.2, décision selon la section 6.3, ligne dans `project_crete_direct.md` | 0,5 |
| | **Total** | **11,5** |

Ordre imposé : 1 avant 2 (les composants consomment le type `ArticlePromo`), 3 avant 4 (la page appelle `getTranslations` sur des clés qui doivent exister), 5 avant 6 (règle `feedback_mockup_avant_deploy` : visuel avant push).

## 10. Fichiers lus pour écrire cette spec

- `src/app/[locale]/articles/[slug]/page.tsx` (page article : ISR 48 h, `KAIROS_CTA`, `extractToc`, `autolinkHtml`, ordre des sections)
- `src/app/[locale]/articles/articles-shared.tsx` (`CATEGORY_LABELS`, 7 catégories)
- `src/lib/guides.ts` (type `Guide`, `getGuideBySlug`, `extractToc`, `isGuideTranslated`, requêtes `guides`)
- `src/lib/autolink.ts` (`getAutolinkIndex`, `autolinkHtml`, mécanique de correspondance mot entier)
- `src/components/car-rental/CarPromo.tsx`, `src/components/VanPromo.tsx`, `src/components/PromoBox.tsx`, `src/components/ui/ImpressionTracker.tsx`, `src/components/home/ServiceRail.tsx`, `src/components/DiscoverCrete.tsx`
- `src/components/car-rental/CarRentalWizard.tsx` (lecture de `?source=`, event `Car Wizard Viewed`)
- `src/lib/van-corridors.ts`, `src/lib/car-landings.ts`, `src/lib/car-partners.ts` (`CAR_ZONES`, `zoneForPickup`), `src/lib/home-services.ts`, `src/lib/bus-pairs.ts` (exports)
- `src/app/[locale]/buses/[pair]/page.tsx` (montage de `CarPromo` et `VanPromo`, sources `bus-pair`), `src/app/[locale]/buses/BusesClient.tsx` (lecture de `?from=&to=`), `src/app/[locale]/buses/VanInterest.tsx` (`van_offer_click`)
- `src/i18n/routing.ts`, `src/i18n/request.ts`, `src/messages/en.json` (namespaces, clés `home.carRental*` et `home.serviceRail.*`)
- `scripts/check-i18n.mjs`, `scripts/check-da.mjs`, `scripts/check-home-services.mjs`, `scripts/ship.sh`, `package.json` (scripts `check:*`)
- `docs/superpowers/specs/2026-07-28-home-service-rail-design.md`, `docs/superpowers/specs/2026-07-29-hero-clickable-design.md`
- `~/van-crete-direct` : arborescence `src/app/[locale]/[corridor]`, `src/lib/types.ts` (champ `source`)
- Base `guides` via PostgREST (07/09/2026) : catégorie et mots-clés des dix premiers articles, répartition des 374 guides par format et catégorie, slug exact de l'article snorkeling
