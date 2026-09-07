# Empreinte indexable de crete.direct : réduction et hygiène technique

**Date** : 07/09/2026 · **Statut** : spec de design, aucun code écrit, rien commité, rien soumis à GSC
**Suite de** : `2026-08-01-seo-locale-scope-design.md` (en prod depuis `550275f`, 13/08) et `2026-07-22-news-noindex-plan-b.md` (lot 1 en prod le 22/07)
**Dépôt** : `~/cp-specs-360`, branche `feat/specs-360-2026-09`, Next.js 16 App Router, next-intl, 22 locales servies

## 0. Ce que la mesure du 07/09 dit, et ce qu'elle disait à tort

Faits API GSC + curl du 07/09, à ne pas re-déduire :

| Fait | Valeur |
|---|---|
| Impressions/jour, moyenne hebdo depuis le 03/08 | 40 · 44 · 21 · 15 · **10** |
| Pages avec au moins 1 impression sur 28 j | **432** contre 8 410 avant le 19/07 |
| `sitemap.xml` | `lastDownloaded` 13/08, **24 jours sans relecture**, 3 767 URL, 3,1 Mo |
| `sitemap-news.xml` | relu le 30/08 |
| Répartition du sitemap | explore 2 295 · news 501 · articles 345 · beaches 218 · weather 121 · buses 81 · hikes 51 · car-rental 15 |
| URL Inspection | `/en` indexée · `/fr` « crawled, currently not indexed », dernier crawl 13/06 · `/en/buses/chania-to-heraklion` crawlée le 02/09 et refusée · un article du sitemap « unknown to Google » · `/en/car-rental/heraklion-airport` indexée, 0 impression |
| `/en/news/*` du sitemap | **7 sur 8 testées servent `noindex, follow`** |
| Visiteurs 30 j | Google **97** · Bing + DDG + Ecosia + Yahoo **4 520** |
| robots.txt, canonical | aucun problème |
| `favicon.ico` | **404** (`src/app/icon.svg` existe) |
| `http://www.crete.direct/` | **3 sauts** : 308 `https://www` → 307 `https://crete.direct/` → 307 `/en` |
| `/buses?from=&to=` | affichées par Google malgré `canonical` → `/buses` |

Deux points du brief sont **corrigés par la relecture du code et un second curl** (07/09, `curl -A Mozilla`) :

1. **Les hreflang SONT dans le `<head>`.** `/en`, `/fr/beaches`, `/en/buses/chania-to-heraklion`, `/en/explore/korakas-gorge` portent chacune 5 `<link rel="alternate" hrefLang="…">` (en, fr, de, el, x-default). Next rend l'attribut en casse React, `hrefLang` et non `hreflang` : un grep sensible à la casse compte zéro. Google lit l'attribut sans tenir compte de la casse. ⛔ Le check hebdo (§9) doit grepper en `-i`.
2. **Les 18 locales hors périmètre sont déjà en `noindex`** : `/ja/buses` répond `X-Robots-Tag: noindex, follow` (en-tête posé par `src/middleware.ts`, présent même sur `X-Vercel-Cache: HIT`). Ce qui dit « index, follow » est la balise `<meta name="robots">` héritée de `src/app/[locale]/layout.tsx:generateMetadata`. Doctrine Google documentée : quand en-tête et balise se contredisent, **la directive la plus restrictive gagne**. Le noindex est donc effectif ; la contradiction reste à nettoyer (§1).

Conséquence : la spec du 01/08 est **entièrement déployée depuis 25 jours** (hreflang à 4, en-têtes `Link` coupés, `X-Robots-Tag`, sitemap à 5 alternates) et **la baisse a continué** : 40 impr/j la semaine du déploiement, 10 aujourd'hui. C'est exactement la condition « rien ne bouge à J+30 » que la spec du 01/08 réservait à son lot 4. Cette spec l'instruit, et traite en même temps les défauts d'hygiène mesurés (sitemap menteur, news noindex déclarées, planner en query, metas tronquées, favicon, sauts www).

**Hypothèse de travail** (le brief la pose, le code ne la contredit pas) : Google a réévalué la qualité du site entier après avoir connu ~237 000 URL pour 3 705 pages, dont 18 langues machine-traduites. Le `noindex` retire ces pages de l'index **au rythme où Google les re-crawle**, et il ne re-crawle presque plus (24 jours sans relire le sitemap). Il faut donc : rendre l'empreinte plus petite de façon définitive (§1, §7), rendre le sitemap crédible (§3), et supprimer les faux signaux (§2, §4, §5, §6).

## 1. Périmètre indexable : 4 locales, et le sort des 18 autres

**Inchangé** : `en`, `fr`, `de`, `el` indexables, source de vérité `INDEXABLE_LOCALES` dans `src/i18n/routing.ts`. Aucune exception par section (voir le chiffrage ci-dessous).

### Les trois options pour les 18 locales

| Option | Mécanisme | Coût dev | Ce que Google voit | Ce que perd un visiteur | Risque |
|---|---|---|---|---|---|
| **A. Statu quo** : `X-Robots-Tag: noindex, follow` (en place) | rien | 0 | 68 000 URL toujours servies, toujours dans le « connu », retirées de l'index une par une au re-crawl | rien | 25 jours mesurés sans effet. Les URL restent dans le périmètre de l'évaluation qualité tant qu'elles n'ont pas été re-crawlées |
| **B. 410 Gone** | middleware répond 410 sur les 18 préfixes | 0,5 j | retrait définitif au re-crawl, même cadence que A | **tout** : 4 520 visiteurs/30 j viennent de Bing/DDG, qui rankent encore ces pages. Un 410 les jette | perte sèche du seul trafic qui marche, pour un gain de cadence nul par rapport à C |
| **C. Retrait des routes + 301 vers `/en/…`** | `routing.locales` → 4, redirection permanente des 18 préfixes vers la même page en anglais | 1 j | 68 000 URL qui **cessent d'exister comme pages** : un 301 replie l'URL sur sa cible au re-crawl, plus rien à évaluer | rien de fonctionnel : le visiteur Bing arrive sur la page anglaise (le titre de `/ja/buses` est déjà en anglais, mesuré) | perte des impressions résiduelles ja/it/tr (chiffrée ci-dessous), bascule UI du `LocaleSwitcher` |

**Recommandation : C**, sous une porte de décision datée.

- **Porte** : la semaine du 07/09 au 13/09 (J+25 à J+31 du déploiement). Si la moyenne remonte au-dessus de 40 impr/j (niveau de la semaine du déploiement), A a fini par mordre et C est reporté d'un mois. Sinon C part le **14/09**. Cette porte est celle que la spec du 01/08 avait écrite (« lot 4 en réserve si rien ne bouge à J+30 »).
- **Ce que C change par rapport au 01/08** : la phrase « les 18 autres restent servies » tombe. Elle protégeait deux choses : les backlinks (préservés par le 301, mieux qu'un 410) et le visiteur qui veut lire en espagnol (perdu : il lira en anglais). La spec du 01/08 acceptait déjà ce coût (~700 clics/mois d'avant-chute, 14,5 %), il est aujourd'hui de l'ordre de 2 visiteurs/mois.
- **B est rejeté** pour une seule raison, qui suffit : 4 520 visiteurs/30 j hors Google contre 97 chez Google. On ne casse pas ce qui marche pour parler à un moteur qui n'écoute plus.

### Exceptions `/xx/buses` (ja, it, tr) : non

Chiffrage sur la seule mesure disponible par langue (GSC, 30 j avant la chute, spec du 01/08) : ja 16 clics + it 54 + tr 17 = **87 clics/mois sur 4 130, soit 2,1 %**. Rapporté aux 97 visiteurs Google des 30 derniers jours, la part proportionnelle est de **2 visiteurs/mois**. Garder trois locales pour ça obligerait à maintenir un périmètre indexable variable par section (routing, middleware, sitemap, hreflang) : le coût de maintenance dépasse le gain de deux visiteurs. Et `/ja/buses` sert un titre anglais : la page « japonaise » n'en est pas une.

### Design de C

Fichiers et fonctions :

- `src/i18n/routing.ts` : `routing.locales` passe aux 4 locales indexables. Nouvelle constante `RETIRED_LOCALES` (les 18, figées, avec le commentaire de date), pour que le middleware sache reconnaître un ancien préfixe. `INDEXABLE_LOCALES`, `isIndexableLocale`, `localeFromPathname` restent (le middleware d'en-tête devient sans objet mais garde son test « jamais sur les 4 »).
- `src/middleware.ts` : avant `intlMiddleware`, si le premier segment est dans `RETIRED_LOCALES`, `NextResponse.redirect(url avec /en à la place du préfixe, 308)` en conservant chemin et query. Le bloc `X-Robots-Tag` peut être supprimé (plus aucune locale servie hors périmètre) : le faire, le code mort est un piège pour la prochaine lecture.
- `src/app/[locale]/layout.tsx` : `generateStaticParams` suit `routing.locales`, donc 4 × pages au build au lieu de 22 × (le build raccourcit, la facture Vercel ISR aussi).
- `src/components/layout/Header.tsx` (`LocaleSwitcher`) : la liste des langues suit `routing.locales`. À vérifier au rendu qu'aucune liste locale en dur ne subsiste.
- `messages/*.json` des 18 locales : **conservés** dans le dépôt un mois (réversibilité), supprimés dans un commit séparé ensuite.
- `src/lib/seo.ts` : `FOOD_TITLE_TEMPLATES`, `VILLAGE_*` gardent leurs entrées it/es/pt/nl, inutilisées mais inoffensives ; nettoyage optionnel dans le même commit de suppression des messages.
- La balise `<meta name="robots" content="index, follow">` héritée du layout redevient vraie pour toutes les pages servies : la contradiction en-tête/balise disparaît par construction.

⚠️ `hasLocale(routing.locales, locale)` dans le layout renvoie `notFound()` pour un préfixe inconnu : sans le 308 du middleware, `/ja/*` passerait en 404. Le test du middleware doit couvrir **les 18 préfixes un par un**, comme le fait déjà `src/middleware.test.ts` pour l'en-tête.

## 2. hreflang dans le `<head>` : combler les trous, unifier

État : `buildAlternates(locale, path)` de `src/lib/seo.ts` émet 4 locales + x-default, canonical self, et est appelée dans **63 fichiers** de `src/app/[locale]`. Le sitemap (`src/lib/sitemap-entry.ts:sitemapUrlEntry`) émet les mêmes 5 `xhtml:link`. Les deux sont cohérents.

Routes avec `generateMetadata` mais **sans** `buildAlternates` (mesuré par grep, 14 fichiers) :

| Route | Décision |
|---|---|
| `compare/[slug]/page.tsx` | recopie à la main la boucle `["en","fr","de","el"]` + x-default : remplacer par `buildAlternates(locale, "/compare/" + slug)`. Même sortie aujourd'hui, mais une seconde source de vérité est un bug en attente |
| `buses/tickets/page.tsx` · `nouveautes/page.tsx` · `explore/[slug]/avis/page.tsx` · `car-partner-terms/page.tsx` | pages indexables sans hreflang : ajouter `alternates: buildAlternates(locale, path)` |
| `stays/**` (7 fichiers) · `newsletter/confirmed/page.tsx` | noindex (Stays non encaissable, page de confirmation) : pas de hreflang, rien à faire. Vérifier que chacune pose bien `robots: { index: false }` |

Pas de garde-fou automatique possible sur « toute page a un hreflang » sans un test de rendu : on l'ajoute au check hebdo (§9) sur 5 URL témoins, en grep insensible à la casse.

## 3. Sitemap : un index par section, sans mensonge

### Défauts mesurés dans `src/app/sitemap.xml/route.ts`

1. **`lastmod` faux sur ~2 900 URL** : `const lastmod = new Date().toISOString()` sert de fallback à toute entrée sans date (static, weather, beaches, villages, hikes, explore, activities, car-rental). Chaque régénération ISR (24 h) redate tout le site à aujourd'hui. Google documente qu'un `lastmod` systématiquement inexact finit ignoré, et c'est le seul signal de fraîcheur qu'il lit.
2. **News en `noindex` déclarées** : la requête prend les 500 dernières news ; `src/lib/news.ts:isNewsStale` met en `noindex` tout ce qui a plus de `NEWS_INDEXABLE_MAX_AGE_DAYS = 30` jours. Résultat : 7 des 8 testées sont déclarées ET interdites. Un sitemap qui contredit ses propres pages est la définition d'un sitemap non fiable.
3. **`changefreq` et `priority`** : ignorés par Google (documenté), ~90 octets par entrée pour rien.
4. **Un seul fichier de 3,1 Mo** : une seule relecture pour tout ou rien ; aucune visibilité par section dans GSC.

### Design

- `/sitemap.xml` devient un **sitemapindex** qui liste des fichiers par section : `/sitemap/static.xml`, `/sitemap/explore-1.xml` … `-N.xml`, `/sitemap/articles.xml`, `/sitemap/beaches.xml`, `/sitemap/buses.xml`, `/sitemap/car-rental.xml`, `/sitemap/weather.xml`, `/sitemap/hikes.xml`, `/sitemap/news.xml`. Le chemin `/sitemap/…` est déjà exclu du matcher du middleware (`sitemap/` et `.*\..*`), donc next-intl ne le capturera pas comme locale.
- Un seul route handler `src/app/sitemap/[name]/route.ts` et un registre pur `src/lib/sitemap-sections.ts` : `SECTIONS: Record<string, () => Promise<SitemapEntry[]>>` qui reprend, section par section, les boucles actuelles de `GET()` (STATIC_PAGES, CITIES × MONTHS, `qualityPairSlugs`, `CRETE_NEIGHBOURHOODS`, `CAR_LOCATION_SLUGS`, `ACTIVITY_CATEGORIES`, `fetchSlugs`, pagination `cb_places`). `chunk(entries, 700)` produit les fichiers `-1`, `-2`… ; l'index les énumère à partir du même registre, donc index et fichiers ne peuvent pas diverger.
- **Taille** : une entrée pèse ~600 octets (5 `xhtml:link` de ~110 octets, le reste est marginal). 700 entrées ≈ 420 Ko, sous la cible de 500 Ko. Seul `explore` dépasse 700 aujourd'hui (2 295, moins après §7) : 3 à 4 fichiers.
- **`lastmod`** : émis **uniquement** quand il est connu. `SitemapEntry.lastmod` devient la seule source ; `sitemapUrlEntry` n'a plus de `fallbackLastmod`. Sources réelles : `news.published_at`, `guides.published_at`, `pairLastmod` (max `scraped_at`) pour les bus ; pour `beaches`, `villages`, `hikes`, `cb_places` : la colonne `updated_at` si elle existe (à vérifier sur le schéma avant le code ; sinon pas de `lastmod`, ce qui est honnête).
- **`changefreq` et `priority` supprimés** du type `SitemapEntry` et de `sitemapUrlEntry`.
- **News** : le fetch prend `NEWS_INDEXABLE_MAX_AGE_DAYS` comme fenêtre (`gte published_at now-30j`) au lieu de `limit(500)`. La constante est partagée avec `isNewsStale` : la règle « déclaré = indexable » tient par construction. `sitemap-news.xml` (48 h, Google News) ne change pas.
- **Articles** : `loc` en `/en`, `title_en` toujours présent, pas de filtre à ajouter.
- `src/app/robots.ts` : `sitemap` liste l'index et `sitemap-news.xml`, rien d'autre.
- Le `revalidate = 86400` et le `Cache-Control` actuels sont conservés sur chaque fichier.

### Resoumission (action humaine, hors code)

1. Dans GSC > Sitemaps, `https://crete.direct/sitemap.xml` reste soumis : l'URL ne change pas, Google découvrira qu'elle est devenue un index à la prochaine lecture. Le re-soumettre à la main le jour du déploiement, une fois, pour accélérer.
2. Ne pas soumettre les fichiers enfants individuellement : ils apparaissent sous l'index dans l'API (`sitemaps.list` avec `sitemapIndex`), avec leur propre `lastDownloaded`, ce qui donne enfin une lecture par section.
3. URL Inspection > « Demander une indexation » sur 10 pages témoins (2 par section prioritaire : buses, articles, beaches, car-rental, explore filtrées). Quota ~10/j, à faire sur 2 jours.
4. Rien d'autre : pas d'outil de suppression, pas de désaveu.

## 4. Planner bus : l'état passe dans le hash

État : `src/app/[locale]/buses/BusesClient.tsx:361` lit `window.location.search` (`from`, `to`) après hydratation. Trois producteurs de liens `?from=…&to=…` : `buses/[pair]/page.tsx:358`, `buses/tickets/page.tsx:59`, `src/components/near-me/NearMeClient.tsx:623,636`. La page pose déjà `canonical` → `/buses`, que Google n'honore pas ici (URL affichées).

Trois options :

- `Disallow: /*?from=` dans robots.txt : bloque le crawl mais **pas** l'indexation d'une URL déjà connue (état « indexée malgré robots », sans titre) et cache le canonical à Google. Toucherait aussi `/near-me?from=` que les QR de la campagne print utilisent (`next.config.ts:qr`). Rejeté.
- `noindex` conditionnel côté serveur : obligerait la page à lire `searchParams`, donc à devenir dynamique, donc à perdre le cache CDN que `routing.ts` a payé cher à obtenir (`localeDetection: false`, `localeCookie: false`). Rejeté.
- **État dans le hash** : `/buses#from=Heraklion&to=Ierapetra`. Google ignore le fragment : une seule URL existe, plus rien à canonicaliser. Zéro coût serveur. **Retenu.**

Design : un petit module pur `src/app/[locale]/buses/planner-url.ts` avec `buildPlannerHref(locale, from, to?)` et `readPlannerState(location)` qui lit le hash **puis, à défaut, la query** (compatibilité des liens déjà partagés et indexés), et `history.replaceState` vers la forme hash quand une query legacy est lue. Les trois producteurs appellent `buildPlannerHref`. Les URL `?from=` connues de Google se replient d'elles-mêmes sur `/buses` au re-crawl (canonical + contenu identique).

## 5. Metas des articles : plafonds à la lecture, pas de réécriture

État : `src/app/[locale]/articles/[slug]/page.tsx:generateMetadata` sort `titles[locale]` et `meta_descs[locale]` tels quels (mesuré : 94 et 190 caractères, tronqués par Google). Les news font `substring(0, 160)` au milieu d'un mot (`news/[slug]/page.tsx:29`). Le générateur côté dépôt est `~/cretepulse/daily_common.py:build_guide_row(slug, category, title_en, meta_en, …)` ; le prompt de `daily_weather.py:100` demande « max 65 chars » et « 150-160 chars », au-dessus des plafonds visés ; le gros de la production tourne sur le VPS et n'est pas dans ce dépôt.

Design :

- `src/lib/seo.ts` : `clampMetaTitle(s, max = 60)` et `clampMetaDescription(s, max = 155)`, coupe au **dernier espace avant la limite**, sans points de suspension, et pour le titre, la limite inclut le suffixe ` | Crete Direct` (14 caractères) quand le template l'ajoute. Fonctions pures, testées.
- Appelées dans `articles/[slug]` et `news/[slug]` (remplace le `substring(0, 160)`), et dans `explore/[slug]/page.tsx:41` qui fait un `slice(0, 160)` du même genre.
- **Rattrapage des 345 existants** : c'est ce plafond à la lecture qui le fait, immédiatement et pour tout ce qui sera écrit ensuite depuis le VPS. Aucune réécriture en base, aucun appel LLM : une coupe au mot n'est pas une nouvelle génération de contenu.
- `daily_common.py:build_guide_row` applique le même plafond à l'écriture (5 lignes Python) et `daily_weather.py:100-101` passe à « max 60 » et « 130-155 » : la base cesse de se salir, la lecture reste le filet.

## 6. favicon.ico et sauts www

**favicon** : `/favicon.ico` répond 404. Google récupère cette URL pour la favicon SERP quand aucune balise ne l'oriente ; un 404 répété est un petit signal de site négligé. Design : ajouter `src/app/favicon.ico` (32 et 48 px, rendu depuis `src/app/icon.svg`), servi à la racine par la convention App Router ; `icon.svg` reste pour les navigateurs modernes. Le matcher du middleware exclut déjà `favicon\.ico`.

**www** : mesuré `http://www` → 308 `https://www` → 307 `https://crete.direct/` → 307 `/en`. Trois causes distinctes :

1. `http` → `https` : Vercel, incompressible, 1 saut pour les seules entrées en `http`.
2. `www` → apex : redirection de domaine du tableau de bord Vercel, en **307** (temporaire, donc Google ne consolide pas). ⚠️ Action humaine : passer ce réglage en 308 permanent, ou le supprimer pour laisser Next le faire (point suivant).
3. `/` → `/en` : next-intl, 307. Avec `localeDetection: false` la destination est déterministe, un 308 est juste. `next.config.ts:redirects()` : `{ source: "/", destination: "/en", permanent: true }` (les redirects de config passent avant le middleware).

Si le réglage Vercel est retiré, deux règles `has: [{ type: "host", value: "www.crete.direct" }]` dans `redirects()` : `/` → `https://crete.direct/en` et `/:path+` → `https://crete.direct/:path+`, en 308. Résultat : `https://www/` en **1 saut**, `http://www/` en 2 (le `http` → `https` reste chez Vercel). Le brief demandait 1 saut : c'est atteignable pour `https://www`, pas pour `http://www`, et il faut le dire plutôt que de promettre.

## 7. Qualité des fiches `explore` : un prédicat, deux consommateurs

Mesure : 2 295 fiches = 61 % du sitemap, **18 impressions** sur 28 j. Le commentaire du sitemap (« toutes les fiches sont indexables ») date d'avant la chute.

Données disponibles dans `src/lib/cb-places.ts` (type `CbPlace`) : `description`, `meta_description`, `photos`, `photo_count`. La page `explore/[slug]/page.tsx` ne pose pas de clé `robots` : elle hérite `index, follow` du layout.

Design :

- `src/lib/cb-places.ts` : `isThinPlace(place): boolean`, vrai si `photo_count < 1` **ou** `wordCount(description) < N`. Un seul prédicat, deux appelants : la section `explore` du sitemap (§3) l'exclut, et `explore/[slug]/page.tsx:generateMetadata` pose `robots: { index: false, follow: true }` quand il est vrai. Sortir du sitemap sans noindex laisserait ces pages dans l'évaluation qualité par le maillage interne (`/explore` les lie toutes) : ce serait la moitié du geste. Elles restent **servies** et liées, comme `/food/[slug]` et `/visit/[month]` avant elles.
- **N se calibre, il ne se devine pas.** Avant le code : (1) `select width_bucket(array_length(regexp_split_to_array(description, '\s+'), 1), 0, 400, 8), count(*) from cb_places group by 1` pour la distribution ; (2) croiser les pages `/en/explore/*` avec impression sur 28 j (API GSC, dimension `page`) avec leur longueur et `photo_count`. N est le seuil le plus haut qui **garde toutes les fiches ayant eu une impression**. Valeur de départ si la calibration ne tranche pas : **80 mots et 1 photo**.
- Attendu : plusieurs centaines de fiches sortent, le sitemap total passe sous 3 000 URL. Le chiffre exact est une sortie de la calibration, pas une promesse.

## 8. Ce que cette spec ne fait PAS

- **Pas de nouvelle génération de contenu** : ni réécriture LLM des 345 metas, ni traduction, ni article. Les plafonds §5 coupent, ils n'écrivent pas.
- **Pas de désaveu de liens**, pas d'outil de suppression GSC, pas de « demande de réexamen » (aucune action manuelle en cours, vérifié le 01/08).
- **Pas de purge en base** : ni news, ni `cb_places`, ni guides. Tout reste servi.
- **Pas de 410** (§1, option B).
- **Pas de changement de cadence de production** des news et guides : c'est le lot 3 du 22/07, décision produit distincte.
- **Pas d'IndexNow ni de travail Bing** : Bing marche (4 520 visiteurs/30 j), on ne touche pas ce qui marche.
- **Pas de retouche on-page** (contenu bus, guides) tant que le domaine est déprécié.
- **Pas de suppression des `messages/*.json`** des 18 locales avant un mois de recul sur C.

## 9. Mesure

Baseline 07/09 : 10 impr/j (semaine 31/08 au 06/09) · 432 pages avec impression sur 28 j · `sitemap.xml` `lastDownloaded` 13/08 · Google 97 visiteurs/30 j · hors Google 4 520.

| Échéance | Indicateur | Ce qui compte comme signal |
|---|---|---|
| J+14 après le dernier PR | `lastDownloaded` de l'index **et de chaque enfant** | au moins une date postérieure au déploiement. Sinon Google ne lit toujours pas : rien d'autre n'est interprétable |
| J+14 | GSC > Indexation, « pages indexées » | doit **baisser** (sortie des 18 locales et des explore fines) ; c'est la file de sortie, pas une alerte |
| J+45 | pages avec impression sur 28 j | > 432, et surtout réparties sur en/fr/de/el |
| J+45 | impr/j moyenne hebdo | > 40 (niveau du 13/08). ⛔ Le signe de reprise est la position moyenne sous 20 sur les 4 locales, pas le compteur d'URL, règle du 01/08 inchangée |
| continu | visiteurs hors Google (Plausible, referrer) | ne doit pas baisser de plus de 20 % après C ; sinon le 301 renvoie des visiteurs Bing sur des pages anglaises qui ne les retiennent pas |

### Évolution de `~/.claude/scripts/crete-direct-seo-check.mjs`

Le script lit déjà `sitemaps.list`, la courbe par jour et le nombre de pages avec impression. À ajouter, dans cet ordre de valeur :

1. **Enfants de l'index** : second appel `sitemaps.list?sitemapIndex=<url de l'index>`, une ligne par enfant avec `lastDownloaded`, `submitted`, `errors`.
2. **Pages avec impression par section** : regrouper les lignes de la requête `dimensions: ["page"]` par 2e segment de chemin (explore, articles, buses…) et par locale (les 4 gardées contre « autres ») : c'est la mesure de la §1 et de la §7.
3. **Curls de conformité** sur 5 URL témoins (une par section prioritaire) : 5 `hrefLang` (grep `-i`), `<meta name="robots">` attendu, `X-Robots-Tag` absent ; `favicon.ico` 200 ; nombre de sauts de `https://www.crete.direct/` (attendu 1) ; taille de chaque fichier sitemap < 500 Ko ; 0 URL `/news/` du sitemap en `noindex` (échantillon de 8, comme la mesure du 07/09).
4. Après C : 3 URL `/ja/…`, `/it/…`, `/tr/…` répondent 308 vers `/en/…`.

Sortie inchangée par ailleurs, lancement hebdo inchangé.

## 10. Risques

| Risque | Chiffre | Parade |
|---|---|---|
| Perte des impressions résiduelles ja/it/tr | 2,1 % du trafic d'avant-chute, ≈ 2 visiteurs/mois aujourd'hui | accepté, §1 |
| Visiteurs Bing/DDG sur les 18 locales renvoyés vers l'anglais | inconnu : la répartition par locale des 4 520 n'est pas mesurée. **À mesurer AVANT C** dans Plausible (referrer × préfixe de chemin) | si > 20 % du trafic hors Google atterrit sur les 18 locales, C reste (le 301 garde le visiteur) mais on surveille le rebond ; c'est la raison du rejet du 410 |
| Un préfixe oublié dans `RETIRED_LOCALES` tombe en 404 | 18 préfixes | test unitaire par préfixe, §11 |
| Restructuration du sitemap : GSC remet à zéro les stats par sitemap | cosmétique | les enfants donnent une lecture plus fine qu'avant |
| Liens `?from=` déjà partagés cassent | 0 si `readPlannerState` lit la query en secours | test, §11 |
| Le plafond à 60 coupe un titre en un titre pire | tous les articles | coupe au mot, jamais au caractère ; le suffixe de marque compte dans la limite |
| N trop haut sur `explore` retire une fiche qui recevait des impressions | 18 impressions à protéger | calibration §7 : N = le plus haut seuil qui les garde toutes |
| Redirection `www` à deux endroits (Vercel et Next) : boucle ou double saut | 1 réglage | ne faire qu'un des deux : retirer le réglage Vercel **puis** déployer la règle Next, curl de contrôle immédiat |
| Attribution : plusieurs leviers en même temps | tous | assumée : l'attribution est déjà perdue (la baisse a continué sous le levier du 13/08). On mesure l'ensemble, §9 |

## 11. Tests

Fichiers existants à étendre :

- `src/i18n/routing.test.ts` : `routing.locales` a 4 entrées ; `RETIRED_LOCALES` en a 18 ; les deux ensembles sont disjoints ; `INDEXABLE_LOCALES` égal à `routing.locales` après C.
- `src/middleware.test.ts` : pour chacun des 18 préfixes, `/xx/beaches/balos?x=1` → 308 `/en/beaches/balos?x=1` ; aucun 308 sur les 4 locales ni sur `/enquete/...` ; le blocage CN reste prioritaire ; le bloc `X-Robots-Tag` et ses tests disparaissent avec lui.
- `src/lib/seo.test.ts` : `clampMetaTitle` (coupe au mot, ≤ 60 avec suffixe, chaîne courte inchangée, aucun caractère de suspension) ; `clampMetaDescription` (≤ 155, idem).
- `src/lib/sitemap-entry.test.ts` : plus de `changefreq` ni `priority` dans la sortie ; `<lastmod>` absent quand l'entrée n'en a pas ; présent et identique quand elle en a un.

Nouveaux :

- `src/lib/sitemap-sections.test.ts` : `chunk` découpe à 700 ; l'index énumère exactement les fichiers produits ; la section `news` ne contient aucune entrée plus vieille que `NEWS_INDEXABLE_MAX_AGE_DAYS` (horloge injectée, comme `isNewsStale(publishedAt, now)`) ; la section `explore` n'émet aucune entrée pour laquelle `isThinPlace` est vrai (Supabase mocké).
- `src/lib/cb-places.test.ts` : `isThinPlace` sur les quatre cas (photo + long, photo + court, sans photo + long, description nulle).
- `src/app/[locale]/buses/planner-url.test.ts` : `buildPlannerHref` produit un hash, jamais une query ; `readPlannerState` lit le hash, puis la query en secours, encode et décode les noms avec espaces et accents.
- `next.config.redirects.test.ts` (à la racine, à côté de `next.config.ts`) : la fonction `redirects()` contient `/` → `/en` permanent et les deux règles `host: www.crete.direct`.

Hors tests unitaires : `npm run build` local pour vérifier que `favicon.ico` est servi et que le build passe à 4 locales ; curls du §9 après chaque déploiement.

## 12. Effort et ordre : cinq PR petites

| # | Contenu | Fichiers principaux | Effort | Dépend de |
|---|---|---|---|---|
| **PR 1** | plafonds metas (§5) · news du sitemap sur 30 j · `lastmod` réel, `changefreq`/`priority` retirés (§3, partie « sans mensonge ») | `src/lib/seo.ts`, `articles/[slug]`, `news/[slug]`, `explore/[slug]`, `src/lib/sitemap-entry.ts`, `src/app/sitemap.xml/route.ts`, `daily_common.py`, `daily_weather.py` | 0,5 j | rien. Le sitemap actuel devient vrai avant d'être découpé |
| **PR 2** | index de sitemaps par section (§3) · `isThinPlace` et son usage dans le sitemap et la page (§7) · `robots.ts` | `src/lib/sitemap-sections.ts`, `src/app/sitemap/[name]/route.ts`, `src/app/sitemap.xml/route.ts`, `src/lib/cb-places.ts`, `explore/[slug]/page.tsx`, `src/app/robots.ts` | 1 j + calibration N (0,5 j) | PR 1. **Puis resoumission GSC, action humaine, le jour même** |
| **PR 3** | planner en hash (§4) · hreflang sur les 5 routes (§2) · `compare` sur `buildAlternates` | `planner-url.ts`, `BusesClient.tsx`, `buses/[pair]`, `buses/tickets`, `NearMeClient.tsx`, `compare/[slug]`, `nouveautes`, `explore/[slug]/avis`, `car-partner-terms` | 0,5 j | rien |
| **PR 4** | `favicon.ico` · `/` → `/en` 308 · règles `www` (§6) | `src/app/favicon.ico`, `next.config.ts` | 0,25 j + réglage Vercel (humain) | rien |
| **PR 5** | retrait des 18 locales avec 308 vers `/en` (§1, option C) | `src/i18n/routing.ts`, `src/middleware.ts`, `Header.tsx`, tests | 1 j | **porte du 14/09** et mesure Plausible du trafic hors Google par locale, AVANT |
| script | évolution du check hebdo (§9) | `~/.claude/scripts/crete-direct-seo-check.mjs` | 0,25 j | PR 2 déployée |

Total ≈ 4 jours de dev, étalés : PR 1, 3, 4 peuvent partir dans la semaine du 07/09 (elles ne préjugent pas de la porte) ; PR 2 suit ; PR 5 attend le 14/09. Toutes passent par `npm run ship` depuis une branche `feat/*` vers `master`, promue vers `main` par le déploiement de 20h Athènes (`cretepulse-build/CLAUDE.md`).

## Fichiers lus pour écrire cette spec

- `docs/superpowers/specs/2026-08-01-seo-locale-scope-design.md`
- `docs/superpowers/specs/2026-07-22-news-noindex-plan-b.md` (titres de lots)
- `src/app/sitemap.xml/route.ts` · `src/app/sitemap-news.xml/route.ts` · `src/lib/sitemap-entry.ts` · `src/lib/sitemap-entry.test.ts`
- `src/app/robots.ts` · `src/i18n/routing.ts` · `src/i18n/routing.test.ts`
- `src/middleware.ts` · `src/middleware.test.ts`
- `src/lib/seo.ts` · `src/lib/seo.test.ts`
- `src/app/[locale]/layout.tsx`
- `src/app/[locale]/news/[slug]/page.tsx` · `src/lib/news.ts` (`isNewsStale`, `NEWS_INDEXABLE_MAX_AGE_DAYS`)
- `src/app/[locale]/buses/page.tsx` · `src/app/[locale]/buses/BusesClient.tsx` (lecture de `?from=&to=`) · producteurs de liens dans `buses/[pair]/page.tsx`, `buses/tickets/page.tsx`, `src/components/near-me/NearMeClient.tsx`
- `src/app/[locale]/articles/[slug]/page.tsx` · `src/lib/guides.ts`
- `src/app/[locale]/explore/[slug]/page.tsx` · `src/lib/cb-places.ts`
- `src/app/[locale]/compare/[slug]/page.tsx`
- `next.config.ts` · `vercel.json` · `src/app/manifest.ts` · `public/` (liste des icônes)
- `package.json` (scripts `test`, `ship`)
- `~/cretepulse/daily_common.py` (`build_guide_row`) · `~/cretepulse/daily_weather.py` (contraintes du prompt)
- `~/.claude/scripts/crete-direct-seo-check.mjs`
- Mesures curl du 07/09 sur `crete.direct` : `/en`, `/fr/beaches`, `/ja/buses` (en-têtes et balises), `/en/buses/chania-to-heraklion`, `/en/explore/korakas-gorge`, `/en/buses?from=chania&to=heraklion`, `http://www.crete.direct/`, `/favicon.ico`, `/sitemap.xml`
