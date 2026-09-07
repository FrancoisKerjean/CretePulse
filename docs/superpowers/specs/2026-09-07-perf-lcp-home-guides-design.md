# Performance crete.direct : LCP home et guides, payload RSC : design

**Date** : 07/09/2026 · **Statut** : spec, aucun code écrit · **Branche** : `feat/specs-360-2026-09` (worktree `~/cp-specs-360`)
**Suite de** : `memory/audit_crete_direct_360_2026-09-07.md` (section « Site live et perf », chantiers 5 et 10)
**Stack** : Next.js 16.2 (App Router, ISR), React 19.2, next-intl 4.8, `@vercel/og` 0.11, Vercel Pro

## 0. Ce qui est mesuré, et ce que le code explique

Tout est `[FACT 2026-09-07]` : Lighthouse 12 mobile local le matin, puis `curl` sur la prod à 13h pour cette spec.

| Page | Mesure | Valeur |
|---|---|---|
| `/fr` | perf · FCP · **LCP** · TBT | 71 · 2,3 s · **5,8 s (élément : le `<h1>` texte)** · 260 ms |
| `/fr` | décomposition LCP | TTFB 0,66 s · **Render Delay 5,2 s** |
| `/fr` | console | `Minified React error #418` (mismatch d'hydratation) |
| `/fr` | HTML | 233 187 o dont **146 588 o de `<script>` inline** · 11 chunks RSC · le chunk 10 pèse **118 787 o** (12 guides × 22 locales + 14 routes de bus complètes) |
| `/fr` | cache | `X-Vercel-Cache: HIT`, `Age: 3397` à 13h (`revalidate = 7200`) · le HTML servi dit `Γεια σου ! lundi 7 septembre` et `14h` sur les news |
| `/fr` | hero SSR | le badge et le `<h1>` sont enfants d'un `<div style="opacity:0;filter:blur(6px);transform:translateY(-6px)">` |
| `/fr` | images | 8 `<img>`, 3 Wikimedia dont 1 via `/_next/image` · 3 partenaires `/images/partners/*.jpg` en brut : 210 063 + 171 401 + 61 379 o |
| `/fr` | autres audits | preconnect `analytics.crete.direct` absent (360 ms) · CSS bloquant 300 ms · JS inutilisé 65 Ko · main thread 2,9 s · bootup 1,3 s · bundle first-party 344 Ko gz / 1 108 Ko brut, 12 fichiers |
| `/fr/articles/agia-irini-gorge-hike` | perf · **LCP** | 71 · **9,7 s (image héros Wikimedia)** : Load Delay 0,8 s · Load 1,7 s · **Render Delay 6,6 s** |
| idem | images | 6 `<img>`, 5 hotlink `upload.wikimedia.org` en original (1 155 Ko), 0 via `/_next/image`, **0 `<figure>` dans le corps** (les 6 sont émises par React, pas par le HTML stocké) · 1 `src` sur `thumb.wikimedia.org` · cookie tiers `WMF-Uniq` |
| idem | `og:image` | `https://upload.wikimedia.org/wikipedia/commons/e/e8/Agia_Eirini_Gorge.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled` (l'original, pas un dérivé) |
| `/fr/articles` | HTML | **1 007 415 o** dont **932 749 o inline** : un seul chunk de **905 068 o** = 160 guides × (`titles` + `meta_descs` + `keywords`) × 22 locales, pour 25 cartes affichées |
| `/fr/buses` | HTML | 831 349 o = **550 799 o de HTML** (2 135 `<li>` d'horaires, 319 routes rendues) + 280 550 o inline (chunk de 225 484 o : 319 `BusRoute` complets, `departures_by_day` + `via_stops` + `source_url` × 319, plus les destinations) |
| `/fr/beaches` | HTML | 625 921 o = 262 907 o de HTML (182 cartes) + 363 014 o inline en **148 chunks** (l'arbre serveur sérialisé, pas des props) |
| `/api/og` | Vercel | **124 erreurs satori `substFormat: 3` depuis le 11/07**, 1 timeout 300 s |

### Le mécanisme de la home, lu dans le code

`src/app/[locale]/page.tsx` (`HomePage`, `revalidate = 7200`) rend `<HomeClient>` (`src/components/home/HomeClient.tsx`, `"use client"`, 575 lignes : **toute la page est un seul composant client**). Trois calculs d'horloge y tournent **au rendu**, donc une fois au build ISR et une fois à l'hydratation :

1. `greekGreeting()` L150-158 : `new Date()` → `Καλημέρα / Γεια σου / Καλησπέρα` selon l'heure d'Athènes.
2. `dateLabel` L183-185 : `Intl.DateTimeFormat(locale).format(new Date())` → « lundi 7 septembre ».
3. `timeAgo()` L45-54 : `Date.now()` → « 14h », « 1d » sur les 4 lignes de news (L490).

Le HTML servi a jusqu'à 2 h d'âge (`Age: 3397` mesuré). Le navigateur recalcule, le texte diffère, React 19 lève `#418` et **abandonne le DOM serveur pour re-rendre `HomeClient` entier côté client**. Ce re-rendu attend le bootup JS (1,3 s) et le main thread (2,9 s) : c'est le « hero vide plusieurs secondes » vu au navigateur.

Indépendamment du mismatch, le `<h1>` L236-240 est enfant de `<BlurFade delay={0.05}>` L225 (`src/components/ui/blur-fade.tsx` : `motion.div initial="hidden"`). Motion sérialise l'état initial dans le SSR : **le H1 est servi à `opacity:0`** et ne peut être peint qu'après hydratation + 0,09 s de délai + 0,4 s d'animation. Même sans `#418`, le LCP texte ne peut pas descendre sous « fin de l'hydratation ». Avec `#418`, il attend en plus le re-rendu complet. Les deux causes se cumulent : c'est le Render Delay de 5,2 s.

### Le mécanisme des guides, lu dans le code

`src/app/[locale]/articles/[slug]/page.tsx` (`ArticleDetailPage`) : le héros est un `<img src={heroImage}>` brut L360-364 (`heroImage = sanitizeImageUrl(guide.image_url)` L304), les 3 guides liés sont des `<img src={rel.image_url}>` L493-498, et `src/components/DiscoverCrete.tsx` L33-38 émet les 2 dernières (`e.imageUrl`). Le corps (`linkedContent`, `dangerouslySetInnerHTML` L451-454) ne contient aucune image sur la page mesurée. **Il n'y a donc pas de HTML stocké à réécrire : les six balises sont émises par des composants React** et passent à `next/image` directement. `next.config.ts` L30-31 autorise déjà `upload.wikimedia.org` et `**.wikimedia.org` (la home et `CardThumb` s'en servent).

Le `?utm_source=commons.wikimedia.org…&utm_content=thumbnail_unscaled` vient de la base : `guides.image_url` a été enregistrée telle que Commons la donne. `thumbnail_unscaled` = **le fichier original**, souvent plusieurs Mo.

## 1. Objectifs chiffrés et non-objectifs

| Objectif | Aujourd'hui | Cible | Comment on le lit |
|---|---|---|---|
| Home `/fr` LCP mobile | 5,8 s | **< 2,5 s** | Lighthouse 12 mobile, médiane de 3 runs |
| Guide LCP mobile | 9,7 s | **< 3 s** | idem, sur `agia-irini-gorge-hike` |
| Perf mobile home et guide | 71 / 71 | **≥ 90** | idem |
| Erreur React `#418` sur `/fr` | 1 | **0** | audit Lighthouse `errors-in-console` + console Chrome sur un HTML d'`Age` > 600 s |
| HTML brut `/fr/articles` | 1 007 Ko | **< 200 Ko** | `curl -s -A Mozilla -o /dev/null -w '%{size_download}'` |
| HTML brut `/fr` | 233 Ko | < 160 Ko | idem |
| HTML brut `/fr/buses` | 831 Ko | < 450 Ko | idem (dépend d'une décision, section 4) |
| HTML brut `/fr/beaches` | 626 Ko | < 350 Ko | idem (PR optionnelle) |
| `/api/og` en erreur | 124 depuis le 11/07 | **0 en 7 j**, jamais un 500 | `get_runtime_logs` Vercel filtré `/api/og` |

**Non-objectifs** (nommés pour ne pas être réclamés à la recette) :
- Réduire le bundle JS first-party (344 Ko gz) et le « JS inutilisé 65 Ko » : cela passe par le découpage de `HomeClient` en îlots serveur, chiffré en 2.4 comme suite possible, pas comme livrable.
- Le CSS bloquant (300 ms) : Tailwind v4 en un seul fichier, pas de découpage ici.
- CSP, `X-Powered-By`, HSTS : chantier sécurité de l'audit, pas perf.
- Les `<img>` du corps des guides : 0 sur la page mesurée ; on vérifie le stock (section 3.5) et on n'écrit un réécriveur que si le stock n'est pas vide.
- Le `width/height` HTML des 8 `<img>` home : CLS 0 mesuré, aucun décalage réel. Les migrations `next/image` de cette spec les posent au passage, rien de plus.

## 2. Home

### 2.1 Salut et date : les deux options comparées

| | A. `useSyncExternalStore` avec instantané serveur | B. `useEffect` + `useState(null)` | C. Îlot client minuscule `<HeroGreeting>` |
|---|---|---|---|
| Principe | Le serveur calcule salut et date **une fois, dans `page.tsx`**, et les passe en props chaînes. `HomeClient` lit l'horloge via `useSyncExternalStore(subscribeNoop, () => Date.now(), () => null)` : pendant l'hydratation React sert l'instantané serveur (`null`), le composant affiche les chaînes serveur ; au premier rendu suivant il recalcule côté client | Rend une valeur neutre au serveur ET à l'hydratation, remplit après montage | Sort le badge dans un composant client de 30 lignes ; le reste de `HomeClient`… reste client aussi, tant que 2.4 n'est pas fait |
| `#418` | 0 : le HTML serveur et le premier rendu client sont identiques par construction | 0 | 0 |
| Ce que l'utilisateur voit | Le badge complet dès le premier octet (valeur d'au plus 2 h d'âge), corrigé en silence après l'hydratation | Un badge sans salut ni date pendant 1 à 3 s, puis un saut de largeur du pill | Comme A ou B selon l'implémentation interne |
| CLS | 0 (le texte change de 0 à 3 caractères, « Γεια σου » vs « Καλησπέρα », dans un pill inline) | Petit décalage du pill au remplissage | idem |
| Code | 1 hook de 8 lignes + 3 props · pattern React 19 natif, déjà utilisé nulle part dans le dépôt (0 occurrence) | pattern déjà présent (`DepBoard.tsx` L37, `IslandBarometer.tsx` L82) | +1 fichier, même choix A ou B à l'intérieur |
| Piège | L'instantané serveur doit être **la chaîne formatée sur le serveur**, pas un timestamp reformaté côté client : l'ICU de Node et celui du navigateur peuvent formater « lundi 7 septembre » différemment pour certaines des 22 locales, ce qui recréerait le mismatch | aucun | aucun de plus |

**Décision : A.** C'est le seul des trois qui ne dégrade pas le premier écran (le badge « live » est la première chose lue du hero) et il tue le mismatch par construction plutôt que par contournement. B reste le plan de repli si A pose un problème imprévu à l'implémentation : même diff côté `page.tsx`, hook différent.

Concrètement :
- Nouveau module pur `src/lib/home-clock.ts` : `greekGreeting(now: Date): string`, `homeDateLabel(now: Date, locale: string): string` (reprend `safeIntlLocale` L171-177), `timeAgo(now: number, dateStr: string): string`. **Aucune de ces fonctions n'appelle `new Date()` ni `Date.now()` : `now` est toujours un paramètre.** C'est ce qui rend le garde de la section 5 grep-able.
- Nouveau hook `src/lib/use-client-now.ts` : `useClientNow(): number | null`, `useSyncExternalStore` dont `getServerSnapshot` renvoie `null` et `getSnapshot` renvoie `Date.now()` arrondi à la minute (sinon chaque rendu produit une valeur différente et React boucle). Seul fichier du périmètre home autorisé à contenir `Date.now(`.
- `page.tsx` (`HomePage`) : calcule `serverNow = new Date()` et passe `serverGreeting`, `serverDateLabel`, `serverNowMs` à `HomeClient`. Le salut serveur a l'âge du cache : au pire 2 h, corrigé dès l'hydratation.
- `HomeClient` : `const now = useClientNow(); const greeting = now === null ? serverGreeting : greekGreeting(new Date(now))`. Même schéma pour la date et pour `timeAgo` des 4 news (`now === null ? timeAgo(serverNowMs, item.published_at) : timeAgo(now, …)`).

### 2.2 Un H1 statique côté serveur pour le LCP

Règle posée par cette spec : **rien de ce qui est au-dessus du pli ne démarre à `opacity:0`.** Le H1 est l'élément LCP désigné par Lighthouse ; il doit être peint dès le premier rendu HTML, avant tout JS.

- Le `<BlurFade delay={0.05}>` L225-295 qui enveloppe badge, H1, phrase mer, baromètre, CTA et réseaux est **retiré du hero**. Le `<BlurFade delay={0.15}>` L298-313 autour de la carte l'est aussi : sur mobile la carte est sous le pli, mais sur desktop elle est le plus grand élément visible et deviendrait le LCP candidat suivant.
- Si l'entrée animée du hero doit être conservée pour la DA, elle se fait en **CSS pur** (`@keyframes` sur une classe `hero-enter`, `animation-fill-mode: backwards`, 0,4 s), qui anime à partir du premier paint sans attendre l'hydratation. Lighthouse mesure le LCP au moment où l'élément atteint son état peint final : une animation CSS d'opacité de 0,4 s décale le LCP de 0,4 s au plus. Le mockup (section 6) tranche entre « sans animation » et « CSS 0,4 s ».
- Les `BlurFade` des tuiles outils L439, news L486 et guides L528 restent : sous le pli, sans effet sur le LCP.

### 2.3 Images partenaires via `next/image`

`src/components/home/ServiceRail.tsx` L36-37 : `<img src={s.photo} loading={band ? "eager" : "lazy"}>` sert les JPEG bruts de `public/images/partners/` (`car-rental.jpg` 210 Ko, `tours.jpg` 171 Ko, `van.jpg` 61 Ko). Même source dans `src/components/car-rental/CarPromo.tsx` L77 et `src/components/InvestmentCTA.tsx` L134.

- Remplacer par `<Image src={s.photo} alt="" fill sizes=… />` avec `sizes="(max-width: 768px) 100vw, 1152px"` pour le bandeau et `"(max-width: 768px) 100vw, 33vw"` pour les trois cartes (le conteneur est `max-w-6xl` = 1152 px). Pas de `priority` : le rail est sous le DepBoard, hors pli sur mobile. `next/image` produit l'AVIF déjà configuré (`formats` dans `next.config.ts`).
- Attendu : 443 Ko → ~70 Ko pour les trois visibles, et l'audit « formats next-gen 165 Ko » disparaît.
- Coût : des transformations d'images Vercel supplémentaires pour 4 fichiers × ~7 largeurs, mises en cache 31 j (`minimumCacheTTL`). Négligeable ; la facture reste surveillée dans `dev_state.md` (plafond 35 $).

### 2.4 Projection des props de la home

Le chunk RSC de 119 Ko vient de `page.tsx` L96-103 qui passe à `HomeClient` bien plus que ce qu'il affiche :

| Prop | Passé | Utilisé (`HomeClient`) | Projection |
|---|---|---|---|
| `latestGuides` | `getEditorialGuides(12)`, 12 guides × `titles`/`meta_descs`/`keywords` × 22 locales | `guides = latestGuides.slice(0, 2)` L193 ; `slug`, `image_url`, `read_time`, `titles[locale]` | `getEditorialGuides(2)` puis `{ slug, title, image_url, read_time }` |
| `boardRoutes` | 14 `BusRoute` complets | `DepBoard` : `from_place`, `to_place`, `price_eur`, `departures_by_day`, `departures` (via `timesForDate`, `src/lib/bus-journey.ts` L87-98), `id` | garder ces 6 champs, retirer `source_url`, `scraped_at`, `via_stops`, `line_id`, `to_slug`, `season`, `frequency`, `duration*` |
| `latestNews` | 8 `NewsItem` | `news = latestNews.slice(0, 4)` L192 ; `slug`, `published_at`, `title_{locale}`, `category`, `source_name` | `getLatestNews(4, locale)` et 5 champs |
| `upcomingEvents` | 5 `Event` | uniquement `.length === 0` L452 | `hasEvents: boolean` |
| `cities` | toutes les villes | 4 (`WTILE_CITIES` L166) : `name`, `temp`, `windSpeed`, `windDir`, `seaTemp` ; `heroCity.temp` | filtrer aux 4 + la ville du swimPick, 5 champs |

Attendu : chunk 119 Ko → < 25 Ko, HTML `/fr` 233 → ~130 Ko. Les types `HomeGuideLite`, `HomeNewsLite`, `BoardRoute` vivent à côté de `SwimPickLite` dans `HomeClient.tsx` (même pattern que L109-129, déjà fait pour le swim : « le SwimToday complet est lourd », commentaire L123-124).

**Suite possible, hors périmètre** : faire de `HomeClient` un composant serveur et ne garder en client que `NewsletterFormCompact`, `DepBoard`, `IslandBarometer`, `ServiceRail` (tracking) et la carte. C'est ce qui ferait tomber le bootup de 1,3 s et le JS inutilisé. À chiffrer après mesure des PR 1 à 3 : si la home est à ≥ 90 sans cela, on ne le fait pas.

### 2.5 Preconnect analytics

`src/app/[locale]/layout.tsx` L121-126 charge `https://analytics.crete.direct/js/script.outbound-links.js` en `afterInteractive`. Une ligne dans le composant `LocaleLayout`, avant le `return` : `preconnect("https://analytics.crete.direct")` importé de `react-dom` (API React 19, fonctionne en composant serveur, émet le `<link rel="preconnect">` dans `<head>`). Le gain de 360 ms porte sur le premier événement Plausible, pas sur le LCP : c'est une ligne, pas un chantier.

## 3. Guides

### 3.1 Les six `<img>` passent à `next/image`

| Où | Aujourd'hui | Après |
|---|---|---|
| Héros, `[slug]/page.tsx` L360-364 | `<img src={heroImage} className="w-full h-full object-cover">` dans un `<header class="relative h-[60vh]">` | `<Image src={heroImage} alt={title} fill priority sizes="100vw" className="object-cover" />`. `priority` pose `fetchpriority="high"` et le `<link rel="preload">` : Load Delay 0,8 s → ~0 |
| 3 guides liés, L493-498 | `<img loading="lazy">` dans `h-32` | `<Image fill sizes="(max-width: 640px) 100vw, 33vw" />`, lazy par défaut |
| `DiscoverCrete.tsx` L33-38 | `<img loading="lazy">` dans `aspect-[4/3]` | `<Image fill sizes="(max-width: 640px) 50vw, 33vw" />` |
| `articles-shared.tsx` `GuideCard` L79 et `ArticlesPageClient.tsx` `FeaturedCard` L47 | `<img>` brut (14 Wikimedia sur `/fr/articles`) | `<Image fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />`, `priority` sur la `FeaturedCard` seule |

`remotePatterns` : rien à ajouter. `1 src` sur `thumb.wikimedia.org` a été vu : ce sous-domaine est couvert par `**.wikimedia.org` mais `[HYP]` il n'existe pas (les vignettes Commons vivent sous `upload.wikimedia.org/wikipedia/commons/thumb/`). À vérifier par un `curl -I` ; si 404, réécrire l'hôte dans le nettoyeur ci-dessous.

### 3.2 Largeur plafond 1 200 et source allégée

Deux plafonds distincts :
- **Ce que l'optimiseur sert** : `images.deviceSizes = [360, 414, 640, 750, 828, 1080, 1200]` dans `next.config.ts`. Aujourd'hui la liste par défaut monte à 3 840 : un desktop 1440 px en DPR 2 demande une variante 2 880 → 3 840 px du héros. Coût du plafond : un héros de 1 200 px étiré sur un écran retina de 1 440 px est légèrement doux. 87 % du trafic ChatGPT et l'essentiel du trafic Google sont mobiles (audit du 07/09) : on prend le plafond. Réglage global, il s'applique aussi aux images `fill` de la home.
- **Ce que l'optimiseur télécharge chez Commons** : avec `thumbnail_unscaled` Vercel va chercher l'original (jusqu'à 10 Mo, et c'est le profil du timeout 300 s vu sur `/api/og`, qui a la même origine de données). Nouvelle fonction `commonsThumb(url: string, width = 1200): string` dans `src/lib/beaches.ts` à côté de `sanitizeImageUrl` : `…/commons/e/e8/Agia_Eirini_Gorge.jpg` → `…/commons/thumb/e/e8/Agia_Eirini_Gorge.jpg/1200px-Agia_Eirini_Gorge.jpg` ; une URL déjà en `/thumb/…/1920px-` est ramenée à 1200 ; les fichiers `.svg`, `.pdf`, `.djvu`, `page1-` sont rejetés comme aujourd'hui. Appliquée dans `sanitizeImageUrl` (cause racine : elle est déjà appelée par les guides, les plages, `JsonLdSchemas` et `og:image`, un seul point de fix couvre les quatre).

### 3.3 `utm_*` retirés à la lecture et en base

`sanitizeImageUrl` retire toute clé de requête `utm_*` (`new URL()`, `searchParams.delete`). Une requête SQL unique sur `cretepulse-postgres` nettoie le stock : `UPDATE guides SET image_url = regexp_replace(image_url, '\?utm_.*$', '') WHERE image_url LIKE '%utm_%'`, précédée d'un `SELECT count(*)` consigné dans `dev_state.md`, et la même sur `beaches`. Le filtre à la lecture reste : c'est la garde pour les prochains scrapes.

### 3.4 `og:image` sans hotlink ni `utm_*`

Aujourd'hui (`generateMetadata` L51-52) : l'original Commons avec ses `utm_*`, déclaré `1200 × 630` alors qu'il n'a ni cette taille ni ce ratio. Options :

| | (a) `/_next/image?url=<commonsThumb 1200>&w=1200&q=75` | (b) `/api/og?title=…` pour tous | (c) vignette Commons 1200 nue |
|---|---|---|---|
| Photo réelle | oui | non (carte de marque) | oui |
| Même origine, mis en cache Vercel 31 j | oui | oui | non, hotlink |
| Discover (exige une photo ≥ 1200 px) | oui | dégradé | oui |
| Dépend de la santé de `/api/og` | non | oui (124 erreurs) | non |

**Décision : (a)** pour les guides qui ont une photo, `/api/og` reste le repli sans photo (comportement actuel L52). Dans `openGraph.images`, déclarer `width: 1200` et **ne plus déclarer `height: 630`** : on n'annonce que ce qui est vrai. Le `w=1200` doit figurer dans `deviceSizes` (3.2) sinon `/_next/image` répond 400.

### 3.5 Corps des guides : vérifier avant d'écrire

`SELECT count(*) FROM guides WHERE status = 'published' AND contents->>'en' LIKE '%<img%'` sur `cretepulse-postgres`. Résultat 0 : rien à faire, cette ligne sort de la spec. Résultat > 0 : une passe `rewriteBodyImages(html)` dans `src/lib/guides.ts`, appliquée après `autolinkHtml` (`[slug]/page.tsx` L308), qui réécrit `src` vers `/_next/image?url=<commonsThumb>&w=1200&q=75` et pose `loading="lazy" decoding="async"`. Pas de `next/image` possible dans du HTML injecté.

### 3.6 Réparer `/api/og` (satori, `substFormat: 3`)

Lecture de `src/app/api/og/route.tsx` : `new ImageResponse(…, { width, height })` **sans option `fonts`**, et `fontFamily: "system-ui, sans-serif"` L43 que satori ignore. `@vercel/og` embarque alors Noto Sans latin, et pour tout glyphe hors de cette couverture son chargeur dynamique télécharge à la volée une police Google Fonts découpée par plage Unicode et la parse avec son fork d'opentype.js. Douze appelants construisent l'URL avec un `title` localisé (`layout.tsx` L57, `buses/page.tsx` L30, `[pair]/page.tsx` L160, `beaches/today` L321, `explore` L106, `news/[slug]` L32, `schema.ts` L131 et L574, `articles/[slug]` L52 et L149…) pour **22 locales dont `el`, `ru`, `ar`, `ja`, `ko`, `zh`**.

`[HYP]` La police fautive est l'une de celles que ce chargeur télécharge : `substFormat: 3` est un format de table GSUB (substitution contextuelle) que le parseur ne gère pas. Le 11/07 ne correspond à aucun changement de `route.tsx` ; il correspond `[HYP]` à une mise à jour de la police servie par Google Fonts. **Diagnostic avant tout code (30 min)** : `get_runtime_logs` Vercel filtré `/api/og` statut 500, lire le paramètre `title` des 124 requêtes, classer par plage Unicode. Si toutes sont grecques, c'est Noto Sans Greek ; si elles sont mêlées, c'est le chargeur lui-même. Le résultat est consigné dans `dev_state.md` avec sa date.

Correctif, indépendant du verdict du diagnostic :
1. **Polices explicites** dans `ImageResponse` : `Baloo2-Bold.ttf` (latin, latin-ext : la police des titres du site, `globals.css` L42) et `Comfortaa-Bold.ttf` (grec, cyrillique : déjà le repli de marque, même ligne). **Instances statiques uniquement** : satori ne lit pas une police variable (table `fvar`), erreur payée sur Race Care le 21/08 (`Cannot read properties of undefined (reading '256')`, mémoire `project_triathlon_marketplace.md`). Fichiers dans `src/app/api/og/fonts/`, chargés par `fetch(new URL("./fonts/Baloo2-Bold.ttf", import.meta.url))`, hors de tout dossier listé dans `.vercelignore`. Avec ces deux polices, latin + grec + cyrillique (19 locales sur 22) ne déclenchent plus le chargeur dynamique. Effet de bord voulu : l'image de partage porte enfin la typo de la DA au lieu de Noto Sans.
2. **Jamais un 500** : `try { return new ImageResponse(carteAvecTitre) } catch { return new ImageResponse(carteSansTitre) }`. `ar`, `ja`, `ko`, `zh` (polices de 5 à 15 Mo, hors budget edge) passent par le chargeur dynamique et, s'il échoue, reçoivent la carte de marque avec le sous-titre « crete.direct » : une image existe toujours. Un crawler qui reçoit 500 garde le lien nu en cache, c'est le vrai coût des 124 erreurs.
3. **Plafonds** : `title.slice(0, 90)`, `subtitle.slice(0, 140)` (l'audit a vu un title de 94 et une description de 190 caractères qui débordent du cadre 1200 × 630).

## 4. Payload RSC : projeter sur les champs affichés

Méthode commune : la projection se fait **à la frontière serveur → client, dans le `page.tsx`**, jamais dans `src/lib/*` (les `select("*")` de `getBusRoutes` servent 20 autres appelants). Les composants client changent de type de props : c'est le compilateur qui garantit qu'aucun champ oublié ne passe.

### 4.1 `/fr/articles` : 1 007 Ko → ~120 Ko

`articles/page.tsx` L51 : `getEditorialGuides(200)` → `ArticlesPageClient guides={guides}`. Champs lus par `ArticlesPageClient.tsx` (`FeaturedCard` L34-72, filtres L78-82) et `articles-shared.tsx` (`GuideCard` L66-106) : `slug`, `category`, `image_url`, `read_time`, `titles[locale]`. Jamais lus : `titles` des 21 autres locales, `meta_descs` (22 locales), `keywords`, `id`, `format`, `published_at`, `status`.

Type `GuideCardData = { slug: string; category: string; image_url: string | null; read_time: number | null; title: string }`, construit dans `ArticlesPage` : `guides.map(g => ({ slug, category, image_url: sanitizeImageUrl(g.image_url), read_time, title: getLocalizedGuideField(g, "titles", loc) }))`. `GuideCard` et `FeaturedCard` prennent `GuideCardData` (leurs deux seuls appelants sont dans ce dossier). Attendu : 160 × ~180 o ≈ 30 Ko de chunk ; HTML total ≈ 75 Ko de HTML + 30 Ko + messages next-intl (8 Ko) + références de modules ≈ 120 Ko.

### 4.2 `/fr/buses` : 831 Ko, deux leviers de nature différente

**Levier 1, projection (mécanique, ~60 Ko)** : `buses/page.tsx` L93-98 passe 319 `BusRoute` avec toutes les colonnes. Champs consommés : `BusesClient.tsx` (`from_place`, `to_place`, `operator_id`, `price_eur`, `duration`, `id`, `departures`), `JourneyPlanner.tsx` → `buildGraph` (`via_stops`, `bus-journey.ts` L127) et `timesForDate` (`departures_by_day`, `departures`), `RouteLine.tsx` (`price_estimated`, `duration_estimated`), `DepartureBoard`, `BusNetworkMap`. Type `PlannerRoute = Pick<BusRoute, "id" | "from_place" | "to_place" | "operator_id" | "price_eur" | "price_estimated" | "duration" | "duration_estimated" | "via_stops" | "departures" | "departures_by_day">`, fonction `toPlannerRoute` dans `src/lib/buses.ts`, appliquée dans `BusesPage`. Sortent : `source_url` (319 URL), `scraped_at`, `line_id`, `to_slug`, `season`, `frequency`. `departures_by_day` reste et domine : gain ~20 % du chunk.

**Levier 2, décision produit (~330 Ko)** : les 551 Ko de HTML viennent de `RouteList` (`BusesClient.tsx` L224-243) qui rend **les 319 routes et leurs 2 135 horaires en `<li>`**, masqués par `hidden` au-delà de `hideAfter` et dans `RouteLine.tsx` L48-58, avec le commentaire « horaires toujours dans le DOM (SEO) ». `🔎 REPÉRÉ, PAS TOUCHÉ` : cette spec ne tranche pas seule. Fait à peser : chaque paire a sa page canonique `/buses/[pair]` avec les mêmes horaires, et du contenu `display:none` n'a pas la valeur d'un contenu visible `[HYP]`. Si Francois valide, `RouteList` ne rend que les lignes visibles et un bouton « toutes les lignes » déplie le reste depuis les props déjà en mémoire : HTML 551 → ~200 Ko, total sous 450 Ko. Sinon la cible `/buses` devient « < 750 Ko » par le levier 1 seul.

### 4.3 `/fr/beaches` : 626 Ko, pas de props à projeter

`beaches/page.tsx` est un composant serveur : les 363 Ko inline en 148 chunks sont **l'arbre serveur lui-même** (182 cartes, chacune avec un `BeachImage` client qui sérialise `src`, `alt`, `className`). Aucune projection ne s'applique. Leviers réels, tous deux à décision :
- Paginer le hub à 60 cartes (`?page=2`, liens `rel="next"`), le schéma `ItemList` L95-102 restant sur 100 : HTML 263 → ~90 Ko, inline 363 → ~120 Ko, total ≈ 230 Ko. Coût : 122 liens internes de moins sur le hub (compensé par `/beaches/best-for` et `/beaches/near` qui existent).
- Remplacer le `BeachImage` client (nécessaire pour le repli `onError` sur les URL Commons cassées) par un `next/image` serveur : retire 182 frontières client, mais perd le repli. Non retenu tant que le stock d'URL cassées n'est pas mesuré.

PR 8, optionnelle, dernière de l'ordre.

### 4.4 Mesure avant / après

Une commande, la même avant et après chaque PR, consignée dans le message de PR :
```
for p in fr fr/articles fr/buses fr/beaches; do
  curl -s -A "Mozilla/5.0" -o /dev/null -w "$p brut=%{size_download}\n" "https://crete.direct/$p"
  curl -s -A "Mozilla/5.0" --compressed -o /dev/null -w "$p transfert=%{size_download}\n" "https://crete.direct/$p"
done
```
Le brut est ce que le navigateur parse (coût CPU) ; le transféré est ce que Vercel facture en bande passante. Les deux comptent.

## 5. Budget de performance en CI

Deux gardes, deux natures, parce que `checks.yml` tourne « sans secret ni DB » (commentaire en tête du workflow) et ne peut pas builder les pages.

### 5.1 Garde statique, dans `npm run check` : `scripts/check-perf-budget.mjs`

Même famille que `scripts/check-da.mjs` (lecture de `src/`, exit 1, message nommant fichier et ligne). Trois règles :
1. **Horloge au rendu** : les fichiers `src/components/home/**/*.tsx` et `src/app/[locale]/page.tsx` contiennent **0 occurrence** de `new Date(` et de `Date.now(`. Pas d'exception « hors `useEffect` » à détecter par analyse de portée : la règle est absolue parce que la section 2.1 a déplacé tout calcul d'horloge dans `src/lib/home-clock.ts` (fonctions à paramètre `now`) et `src/lib/use-client-now.ts` (seul fichier autorisé, listé dans le script). `Footer.tsx` L143 (`new Date().getFullYear()`) est hors périmètre : une année ne change pas en 2 h de cache, mais elle changera le 31/12 à minuit ; à basculer sur le même hook au passage.
2. **H1 hors animation** : dans `HomeClient.tsx`, la ligne `<h1` n'est pas descendante d'un `<BlurFade` ouvert non refermé (comptage des balises `<BlurFade` / `</BlurFade>` entre le début du fichier et la ligne du `<h1`). Simple, et c'est exactement la régression qui a coûté 5 s.
3. **Types de props** : `ArticlesPageClient.tsx` et `BusesClient.tsx` ne déclarent plus `guides: Guide[]` ni `routes: BusRoute[]` (regex sur la déclaration `interface Props`). Un retour au type complet rouvre le payload sans qu'aucun test ne rougisse.

### 5.2 Garde de taille réelle, après déploiement : `scripts/check-payload.mjs`

Prend une base URL, télécharge `/fr`, `/fr/articles`, `/fr/buses`, `/fr/beaches` avec `--compressed` désactivé, calcule le total et la part inline (la regex `<script(?![^>]*src=)` de cette spec), compare à des seuils, exit 1 au dépassement. Seuils initiaux : `/fr/articles` ≤ **200 Ko** (aujourd'hui 1 007), `/fr` ≤ **160 Ko**, `/fr/buses` et `/fr/beaches` en avertissement tant que les décisions 4.2 et 4.3 ne sont pas prises. Branché en dernière étape du job de `.github/workflows/daily-deploy.yml`, après la promotion `master → main`, avec un délai de 3 min pour laisser le build prod servir ; l'échec fait rougir le run et passe dans le message Telegram que le workflow envoie déjà (étape « Notifier Telegram », secrets `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` L55-78). Il ne bloque pas le déploiement (il arrive après) : il rend la régression visible le soir même au lieu de la découvrir à l'audit suivant.

### 5.3 Test de sérialisation, dans vitest

`src/app/[locale]/articles/projection.test.ts` : `JSON.stringify(200 GuideCardData de fixture).length < 60 000`. Déterministe, sans réseau, bloque en CI. Il ne remplace pas 5.2 (il ne voit pas les messages next-intl ni l'arbre), il attrape un champ lourd rajouté à la projection.

## 6. Risques

| Risque | Où | Parade |
|---|---|---|
| **ICU serveur ≠ ICU navigateur** pour « lundi 7 septembre » dans une des 22 locales | 2.1 | L'instantané d'hydratation est la **chaîne** formatée par le serveur, jamais un recalcul client depuis un timestamp ; le client ne formate qu'après hydratation |
| Boucle de rendu `useSyncExternalStore` (`getSnapshot` instable) | 2.1 | `Date.now()` arrondi à la minute ; test unitaire du hook |
| **Cache ISR** : salut serveur d'au plus 2 h d'âge (`revalidate = 7200`) plus `stale-while-revalidate` 300 s | 2.1 | Assumé : corrigé en < 1 s après hydratation, sans mismatch. La date qui bascule à minuit Athènes est corrigée de la même façon |
| **Régression visuelle du hero** : disparition de l'entrée animée du badge, du H1 et de la carte | 2.2 | `feedback_mockup_avant_deploy.md` : captures Playwright 390 px et 1 440 px avant / après, référence `docs/design/kalimera/home-v8.html`, jointes à la PR 1 ; Francois tranche « sans animation » ou « CSS 0,4 s » sur les captures |
| Commons refuse ou ralentit l'optimiseur Vercel (User-Agent, 429) | 3.1 | Le pattern tourne déjà en prod sur la home (`HomeClient.tsx` L381) et `CardThumb` ; `commonsThumb` réduit la taille du fichier source demandé, donc le temps d'origine |
| Coût des transformations d'images : ~160 héros de guides + 14 Wikimedia par liste × 7 largeurs | 3.1, 3.2 | Cache 31 j, `deviceSizes` réduit à 7 largeurs ; lecture de la facture Vercel à J+30 dans `finance_state.md` |
| `og:image` en `/_next/image` : `w=1200` refusé si absent de `deviceSizes` | 3.4 | 3.2 le pose ; test curl post-deploy dans 8 |
| Diagnostic satori non concluant | 3.6 | Le correctif 2 (repli sans titre, jamais 500) ne dépend pas du diagnostic : l'objectif « 0 erreur 500 » tient quoi qu'il en soit |
| Police statique introuvable en prod (dossier ignoré par `.vercelignore`) | 3.6 | Piège déjà payé le 21/08 sur Race Care : fichiers sous `src/app/api/og/fonts/`, vérification `curl /api/og?title=Δρομολόγια` sur le Preview `[preview]` avant `ship` |
| Un champ oublié dans une projection casse un composant enfant | 4 | Le type projeté remplace le type complet dans les props : `tsc` (dans `npm run check`) refuse tout accès à un champ absent |
| `/buses` : retirer les horaires masqués change le HTML crawlé | 4.2 | Décision explicite de Francois, pas dans cette spec ; les pages `/buses/[pair]` portent déjà ces horaires en visible |
| SEO `/beaches` : moins de liens internes sur le hub | 4.3 | PR optionnelle, décision explicite |

## 7. Tests

| Fichier | Ce qu'il tient |
|---|---|
| `src/lib/home-clock.test.ts` (nouveau) | `greekGreeting` aux bornes 11:59 / 12:00 / 16:59 / 17:00 Athènes, hiver et été (DST) · `homeDateLabel` en fr / de / el / en et repli sur `en` pour une locale invalide · `timeAgo` : « now », minutes, heures, « 1d », jours |
| `src/lib/use-client-now.test.ts` (nouveau) | instantané serveur `null` · instantané client arrondi à la minute, stable entre deux appels dans la même minute |
| `src/components/home/HomeClient.test.tsx` (nouveau ; `vitest.config.ts` : `include` étendu à `*.test.tsx`) | `renderToStaticMarkup` sous `NextIntlClientProvider` avec `src/messages/fr.json` : le markup contient `<h1` avec `heroMain.pre` ; aucun `opacity:0` entre l'ouverture de la `<section` hero et le `<h1` ; le badge contient `serverGreeting` et `serverDateLabel` tels que passés |
| `scripts/check-perf-budget.mjs` (nouveau, dans `npm run check`) | les 3 règles de 5.1, avec un cas rouge volontaire dans le message de PR |
| `src/lib/beaches.test.ts` (nouveau) | `sanitizeImageUrl` retire `utm_*` et conserve les autres paramètres · rejette `.pdf`, `.djvu`, `page1-` (comportement actuel) · `commonsThumb` : original → `/thumb/…/1200px-`, `1920px-` → `1200px-`, noms encodés `%C3%AA`, `.svg` refusé |
| `src/app/[locale]/articles/projection.test.ts` (nouveau) | champs exacts de `GuideCardData` · titre replié sur `en` · taille sérialisée de 200 fixtures < 60 Ko |
| `src/lib/buses.test.ts` (nouveau ou existant) | `toPlannerRoute` retire `source_url`, `scraped_at`, `line_id`, `to_slug`, `season`, `frequency` · `timesForDate` et `buildGraph` donnent le même résultat sur la route projetée et sur la route complète |
| `src/app/api/og/route.test.ts` (nouveau) | `safeTitle` plafonne à 90 · le `GET` avec un titre grec renvoie 200 `image/png` · un `ImageResponse` qui jette est rattrapé et renvoie 200 (mock de `@vercel/og`) |
| `scripts/check-payload.mjs` | pas de test unitaire : il **est** la mesure, lancé à la main sur le Preview puis par `daily-deploy.yml` |

## 8. Mesure après déploiement

- **J+0, sur le Preview** (`[preview]` dans le message de commit, `scripts/vercel-ignore.sh`) puis **J+1 sur la prod** après le déploiement de 20h Athènes : `npx lighthouse@12 <url> --form-factor=mobile --throttling-method=simulate --output=json --output-path=…`, **3 runs par page**, on lit la **médiane** de `audits.largest-contentful-paint.numericValue` et `categories.performance.score` sur `/fr`, `/fr/articles/agia-irini-gorge-hike`, `/fr/articles`. Le run doit être fait sur un HTML **déjà en cache** (`Age > 600` dans les en-têtes) : c'est la condition du mismatch d'origine ; un run sur un HTML frais ne prouve rien.
- `#418` : audit `errors-in-console` à 0 sur les 3 runs, plus la console Chrome ouverte sur `/fr` à `Age > 3600`.
- `scripts/check-payload.mjs https://crete.direct` : les quatre tailles brutes et transférées, collées dans `dev_state.md` avec la date.
- `/api/og` : `get_runtime_logs` filtré `/api/og` à J+7, attendu 0 statut 500 ; `curl -I "https://crete.direct/api/og?title=Δρομολόγια%20ΚΤΕΛ"` et la même en arabe et en japonais, attendu 200 `image/png` trois fois.
- **J+28, terrain** : CrUX. L'audit du 07/09 note « pas de CrUX » (origine sous le seuil de trafic) et le quota PSI dépassé. Donc : rapport Signaux Web essentiels de Search Console (onglet mobile, URL groupées) à J+28 ; s'il reste vide, le lab reste la seule mesure et on le dit tel quel, on n'invente pas de chiffre terrain.
- Effet indirect à suivre, sans le promettre : `/fr` est « crawled, not indexed » depuis le 13/06 (audit). Un LCP à 2 s ne le réindexera pas seul ; on note simplement l'état à J+28 dans `project_crete_direct.md`.

## 9. Effort et ordre des PR

PR petites, chacune livrable et mesurable seule, toutes depuis `master` (branche `feat/perf-<n>-<sujet>`, `npm run ship` en fin de chantier, promotion à 20h Athènes).

| # | PR | Contenu | Heures | Dépend de |
|---|---|---|---|---|
| 1 | `feat/perf-1-home-clock` | 2.1 + 2.2 : `home-clock.ts`, `use-client-now.ts`, props serveur, H1 hors `BlurFade`, mockups avant / après, tests, garde 5.1 règles 1 et 2 | 2,5 | rien |
| 2 | `feat/perf-2-home-images` | 2.3 + 2.5 : `next/image` dans `ServiceRail`, `CarPromo`, `InvestmentCTA` ; `preconnect` | 1 | rien |
| 3 | `feat/perf-3-home-props` | 2.4 : projection des 5 props de la home | 1,5 | rien |
| 4 | `feat/perf-4-guides-images` | 3.1 à 3.5 : `next/image` × 4 fichiers, `commonsThumb`, `utm_*`, `deviceSizes`, `og:image`, SQL de nettoyage, vérification du stock `<img>` du corps | 2,5 | rien |
| 5 | `feat/perf-5-og-fonts` | 3.6 : diagnostic 30 min, polices statiques, repli sans 500, plafonds | 2 | rien |
| 6 | `feat/perf-6-articles-payload` | 4.1 + 5.2 + 5.3 : projection `/articles`, `check-payload.mjs`, étape `daily-deploy.yml`, garde 5.1 règle 3 | 2 | rien |
| 7 | `feat/perf-7-buses-payload` | 4.2 levier 1 (+ levier 2 si décidé) | 1,5 (+1) | décision Francois pour le levier 2 |
| 8 | `feat/perf-8-beaches-pages` | 4.3 pagination, optionnelle | 1,5 | décision Francois |

**Total : 14,5 h** sans les options, 17 h avec. Ordre d'exécution recommandé : **1 puis 4** (les deux LCP, le cœur de l'objectif), puis 6 (le Ko facturé le plus lourd), puis 2, 3, 5, 7, 8. Les PR 1 à 6 n'ont aucune dépendance entre elles : deux terminaux peuvent les mener en parallèle sans se marcher dessus, à condition qu'une seule PR touche `next.config.ts` (la 4) et une seule `vitest.config.ts` (la 1).

Ce que ça débloque : un LCP home sous 2,5 s rend la page éligible au « bon » CrUX si le trafic repasse le seuil ; les 900 Ko de `/articles` en moins par vue se lisent directement sur la ligne bande passante de la facture Vercel ; et `/api/og` qui ne répond plus 500 remet une image sur chaque lien partagé en `el`, `ru` et au-delà.

## Fichiers lus pour cette spec

- `src/components/home/HomeClient.tsx` (intégral, 575 lignes)
- `src/components/home/ServiceRail.tsx` · `src/components/home/IslandBarometer.tsx` (en-tête et hooks)
- `src/components/ui/blur-fade.tsx` (intégral)
- `src/components/CreteMap.tsx` (en-tête) · `src/components/DepBoard.tsx` L1-60 · `src/components/CardThumb.tsx` · `src/components/BeachImage.tsx` · `src/components/beaches/BeachesLiveNow.tsx` (en-tête) · `src/components/DiscoverCrete.tsx` L1-45 · `src/components/RouteLine.tsx` L40-61
- `src/app/[locale]/page.tsx` (intégral) · `src/app/[locale]/layout.tsx` L1-40 et L95-150 · `src/app/layout.tsx` (intégral)
- `src/app/[locale]/articles/page.tsx` · `src/app/[locale]/articles/ArticlesPageClient.tsx` · `src/app/[locale]/articles/articles-shared.tsx` (signatures et champs) · `src/app/[locale]/articles/[slug]/page.tsx` (intégral)
- `src/app/[locale]/buses/page.tsx` (intégral) · `src/app/[locale]/buses/BusesClient.tsx` L1-40 et L218-260 · `src/app/[locale]/buses/JourneyPlanner.tsx` (usages de `routes`)
- `src/app/[locale]/beaches/page.tsx` L1-200
- `src/app/api/og/route.tsx` (intégral)
- `src/lib/guides.ts` (type `Guide`, `getEditorialGuides`, `getGuideBySlug`, `getRelatedGuides`) · `src/lib/buses.ts` (types, `getBusRoutes`, `getBusDestinations`) · `src/lib/bus-journey.ts` L87-136 · `src/lib/beaches.ts` (`sanitizeImageUrl`, `getAllBeaches`) · `src/lib/home-services.ts` (photos) · `src/lib/autolink.ts` (exports)
- `src/i18n/request.ts` · `src/i18n/routing.ts` (locales) · `src/messages/fr.json` (taille)
- `next.config.ts` · `package.json` (scripts, versions) · `vitest.config.ts` · `.github/workflows/checks.yml` · `.github/workflows/daily-deploy.yml` (étape Telegram)
- `scripts/check-da.mjs` L1-60 · `scripts/check-hero-links.mjs` L1-40
- `src/app/globals.css` (polices L39-42, `.article-prose figure` L345-353)
- `public/images/partners/` (tailles) · `public/` (absence de `fonts/`)
- `docs/superpowers/specs/2026-08-01-seo-locale-scope-design.md` (format de spec)
- `memory/audit_crete_direct_360_2026-09-07.md` (section perf et chantiers) · `memory/project_triathlon_marketplace.md` (leçon satori / police variable, 21/08)
- HTML prod téléchargés le 07/09 à 13h : `/fr`, `/fr/articles`, `/fr/buses`, `/fr/beaches`, `/fr/articles/agia-irini-gorge-hike` (tailles, part inline, images, `og:image`, en-têtes `Age` et `X-Vercel-Cache`)
