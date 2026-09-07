# Sécurité crete.direct : dépendances, en-têtes, CSP (design)

**Date** : 07/09/2026 · **Statut** : spec, aucun code écrit, rien installé, rien commité · **Branche** : `feat/specs-360-2026-09` (worktree `~/cp-specs-360`) · **Suite de** : `memory/audit_crete_direct_360_2026-09-07.md`, chantier 6 (« `npm audit fix` non-major, CSP, `poweredByHeader: false`, HSTS `includeSubDomains` »)

Stack au moment de l'écriture : Next.js 16.2.1, next-intl 4.8.3, React 19.2.4, Vercel (plan Hobby, 1 slot de build), Turbopack, 22 locales, ~24 000 pages ISR.

## 0. Ce qui est mesuré le 07/09, et ce qui reste à recouper

| Fait | Valeur | Source |
|---|---|---|
| En-têtes servis sur `https://crete.direct/en` | `Strict-Transport-Security: max-age=63072000` (posé par Vercel, pas par le code), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`, `X-Powered-By: Next.js`, **aucune `Content-Security-Policy`** | `curl -sI`, 07/09 + `next.config.ts` L16-21 |
| Sous-domaines en HTTPS | `www.` 307 (Vercel, HSTS 2 ans) · `van.` 307 (Vercel, HSTS 2 ans) · `analytics.` 200 (Plausible, HSTS `includeSubDomains; preload` déjà posé) · `media.` 404 à la racine (Caddy, **aucun HSTS**) ; les 5 hôtes redirigent `http://` en 308 vers `https://`, `ssl_verify_result=0` partout | `curl`, 07/09 |
| `npm audit --omit=dev --json` | 36 vulnérabilités : 0 critique, **14 high**, 18 moderate, 4 low | mesuré le 07/09 **sur le lockfile d'un autre worktree** ; `~/cp-specs-360` n'a pas de `node_modules` (vérifié). ⚠️ **À recouper** : `npm ci && npm audit --omit=dev --json` dans ce worktree avant d'ouvrir la PR 1. Le `package-lock.json` est le même fichier suivi en git, l'écart attendu est nul, mais la CI note déjà un drift du lockfile (`.github/workflows/checks.yml` : « npm install (pas ci) : le package-lock.json du repo est désynchronisé ») |
| Versions verrouillées (lockfile de `~/cp-specs-360`) | `next` 16.2.1 · `next-intl` 4.8.3 · `@vercel/og` 0.11.1 (satori 0.25.0, sharp optionnel ^0.34.5) · `undici` 7.28.0 · `path-to-regexp` 6.3.0 (via `msw`) et 8.x (via `router`) · `sharp` 0.34.5 · `postcss` 8.5.23 (et 8.4.31 épinglé en dur par `next`) · `ws` 8.20.0 (via `@supabase/realtime-js`) · `nanoid` 3.3.16 · `js-yaml` 4.1.1 (via `cosmiconfig`) · `hono` 4.12.9 (via `@hono/node-server` et `@modelcontextprotocol/sdk`, tirés par `shadcn` déclaré en `dependencies`) · `ip-address` 10.1.0 (via `express-rate-limit`) · `fast-uri` 3.1.0 (via `ajv`) · `brace-expansion` 5.0.4 · `browserslist` 4.28.1 · `dompurify` 3.4.10 · `sanitize-html` 2.17.4 · `svix` 1.86.0 (via `resend` 6.9.4) · `@sentry/nextjs` 10.45.0 | `grep` dans `package-lock.json`, 07/09 |
| Dernières versions publiées | `next` latest 16.3.4, dernier patch de la ligne 16.2 = **16.2.12** · `next-intl` 4.14.2 · `@sentry/nextjs` 10.73.0 · `resend` 6.26.0 · `sanitize-html` 2.17.7 · `dompurify` 3.4.15 · `isomorphic-dompurify` 4.1.0 (major) · `@vercel/og` 1.0.2 (major) · `satori` 0.33.4 · `maplibre-gl` 6.7.0 (major) · `motion` 13.2.0 (major) | registre npm, 07/09 |
| Avis next-intl `GHSA-8f24-v5vv-gm5j` (open redirect) | affecte `< 4.9.1`, corrigé en **4.9.1**. Mécanisme : le middleware, **configuré avec `localePrefix: 'as-needed'`**, laisse passer des segments `//` ou des caractères de contrôle qui font rediriger vers un hôte externe | github.com/amannn/next-intl/security, 07/09 |
| Notre config next-intl | `localePrefix: "always"`, `localeDetection: false`, `localeCookie: false`, `alternateLinks: false` | `src/i18n/routing.ts` L3-22 |
| Avis Next `GHSA-m99w-x7hq-7vfj` (DoS App Router via Server Actions) | affecte 16.0.0 à 16.2.10, corrigé en **16.2.11** ; ne concerne que les apps App Router **avec Server Actions** | github.com/vercel/next.js/security, 07/09 |
| Server Actions dans le dépôt | **oui**, 2 fichiers : `src/app/admin/activities/actions.ts`, `src/app/admin/car-rental/actions.ts` | `grep '"use server"'` |
| `/api/og` | `runtime = "edge"`, `ImageResponse` de `@vercel/og` ; **124 erreurs satori `substFormat: 3` depuis le 11/07 + 1 timeout 300 s** | `src/app/api/og/route.tsx` L1-4 · audit 360 |
| Autres consommateurs de satori | `src/app/[locale]/articles/[slug]/opengraph-image.tsx` et `src/app/[locale]/news/[slug]/opengraph-image.tsx` importent **`next/og`** (satori embarqué dans `next`, pas `@vercel/og`), `runtime = "nodejs"` | lecture des 2 fichiers |

⛔ Deux lectures à ne pas faire : (a) l'open redirect next-intl vise `as-needed`, nous sommes en `always` : l'exposition réelle est faible, mais on monte quand même, c'est un patch de la même ligne majeure et l'audit restera rouge sinon ; (b) `substFormat: 3` n'est pas une vulnérabilité, c'est un bug de rendu : il conditionne le **choix** de monter `@vercel/og` en 1.0, pas l'urgence.

## 1. Objectif et non-objectifs

**Objectif.** En trois PR séquencées, obtenir : `npm audit --omit=dev` **0 high** hors `@vercel/og` (ou 0 tout court si la PR 1b passe), `X-Powered-By` retiré, HSTS étendu aux sous-domaines, et une **CSP réelle** d'abord en `Report-Only` pendant 14 jours puis en mode bloquant, sans casser la carte MapLibre, Plausible, les vidéos YouTube, ni le rendu statique ISR qui porte tout le SEO.

**Non-objectifs (assumés, à ne pas rouvrir dans ces PR).**
- Aucune montée de version majeure hors `@vercel/og` : `typescript` 5.9 (7 dispo), `vitest` 4 (5), `eslint` 9 (10), `maplibre-gl` 5 (6), `motion` 12 (13), `isomorphic-dompurify` 3 (4), `@types/node` 25 (26) restent en place. Chacune est un chantier à part, avec ses propres tests visuels.
- Pas de WAF, pas de règles Vercel Firewall, pas de rate limiting nouveau : le middleware bloque déjà CN et les crawlers commerciaux (`src/middleware.ts` L44-56), c'est un autre sujet.
- Pas de CSP à nonce (voir 3.3 : incompatible avec l'ISR et le cache CDN dont dépend le site).
- Pas de `preload` HSTS dans ces PR (option documentée en 4.3, décision de François).
- Pas de refonte des 14 `dangerouslySetInnerHTML` recensés : la CSP ne les couvre pas (ce sont des injections HTML côté serveur, pas des scripts inline) et ils ont chacun leur garde ; voir l'inventaire en 3.2 pour ce que la CSP protège réellement.

## 2. Plan de mise à jour des dépendances (PR 1)

### 2.1 Ordre

1. **Base saine** : `npm ci` dans `~/cp-specs-360` (ou le worktree qui portera la PR), puis `npm audit --omit=dev --json > /tmp/audit-avant.json` pour figer le point de départ réel.
2. **`next` d'abord, épinglé sur la ligne 16.2** : `npm install next@16.2.12 eslint-config-next@16.2.12`. Pourquoi épingler : `package.json` déclare `^16.2.1`, donc un `npm audit fix` ou un `npm update` nu sauterait directement en **16.3.4** (mineure : nouveau moteur de cache, nouvelles dépréciations). Le correctif DoS est dans 16.2.11, 16.2.12 est le dernier patch ; on prend le plus petit pas qui ferme l'avis. La 16.3 est un chantier séparé.
3. **`next-intl` ensuite** : `npm install next-intl@4.14.2`. Couvre `GHSA-8f24-v5vv-gm5j` (4.9.1) et les deux avis `precompile` d'avril (`GHSA-4c35-wcg5-mm9h`, `GHSA-r27j-894h-3w3p`, option `experimental.messages.precompile` que nous n'utilisons pas). Vérifier après montée : le middleware composé (`src/middleware.ts`, `createMiddleware(routing)` puis `X-Robots-Tag` posé sur la réponse) et `next-intl/plugin` dans `next.config.ts` L7 n'ont pas changé de signature entre 4.8 et 4.14 (API stable en 4.x ; à confirmer sur le CHANGELOG au moment du bump).
4. **Vert intermédiaire** : `npm run check` (les 25 `check:*` + `tsc --noEmit`), `npm test` (95 fichiers vitest), puis `npx next build`. Le build est le seul filet pour Turbopack + ISR : on ne pousse pas sans.
5. **Le reste des non-majors, en un geste** : `npm audit fix` **sans `--force`**. Ce que ça couvre (résolution dans les plages `^` déjà déclarées) :
   - directs : `@sentry/nextjs` 10.45 → 10.73 (OpenTelemetry moderate), `resend` 6.9 → 6.26 (`svix` moderate), `sanitize-html` 2.17.4 → 2.17.7, `isomorphic-dompurify` 3.17 → dernier 3.x (tire `dompurify` 3.4.15), `@supabase/supabase-js` (tire `ws` corrigé), `stripe` patch ;
   - transitifs : `undici`, `path-to-regexp` 6.x (via `msw`), `nanoid`, `js-yaml`, `hono`, `ip-address`, `fast-uri`, `brace-expansion`, `browserslist`, `postcss` 8.5.x.
   Ce que ça **ne couvre pas** : `sharp` ≤ 0.34 tiré par `@vercel/og` 0.11.1 (le correctif est `sharp` ^0.35, qui n'arrive qu'avec `@vercel/og` 1.0.x, donc major : voir 2.2) ; et `postcss` **8.4.31 épinglé en dur par `next`** dans son propre sous-arbre (`next -> "postcss": "8.4.31"` dans le lockfile) : si l'audit le signale encore après 16.2.12, c'est une décision de l'équipe Next, pas la nôtre, on le note dans le rapport et on ne le force pas.
6. **Vert final** : `npm run check && npm test && npx next build`, puis `npm audit --omit=dev --json > /tmp/audit-apres.json` et un diff du nombre de high par paquet, collé dans le message de PR.
7. **Lockfile** : la PR régénère `package-lock.json` proprement. Bonus à saisir dans la même PR (une ligne) : repasser `checks.yml` de `npm install` à `npm ci` si `npm ci` passe en local, ce qui rend la CI déterministe. Si ça ne passe pas, ne pas insister, ce n'est pas le sujet.

Commit de la PR 1 avec `[preview]` dans le message pour obtenir une URL de preview (politique `scripts/vercel-ignore.sh`), y vérifier `/en`, `/fr/explore` (carte), `/en/buses`, `/api/og?title=Test`, un article avec vidéo, puis `npm run ship`.

### 2.2 Le cas `@vercel/og` 0.11.1 → 1.0.2 (PR 1b, séparée, même journée ou plus tard)

Ce que dit le paquet lui-même (le dépôt `github.com/vercel/og` déclaré dans `package.json` répond **404**, il n'y a **pas de changelog public** ; ce qui suit vient des deux `package.json` publiés sur npm) :

| | 0.11.1 | 1.0.2 |
|---|---|---|
| `engines.node` | `>= 16` | **`>= 22`** |
| `satori` | 0.25.0 | **0.33.3** |
| `@resvg/resvg-wasm` | 2.4.0 | 2.4.1 |
| `sharp` (optionnel) | ^0.34.5 | **^0.35.3** (c'est le correctif high de l'audit) |
| exports | `.` avec variantes edge / edge-light / browser / worker / workerd / node, `type: module` | identiques |
| API `ImageResponse` (README 1.0.2) | | `width`, `height`, `emoji`, `fonts[]`, `debug`, `status`, `statusText`, `headers` ; police par défaut Noto Sans ; `cache-control: public, immutable, no-transform, max-age=31536000` en prod |

Lecture : **aucun breaking change d'API documenté**. Le passage en 1.0 est un saut de satori (0.25 → 0.33) et une exigence Node 22. Deux points concrets pour nous :
- `runtime = "edge"` dans `src/app/api/og/route.tsx` L4 : l'Edge Runtime de Vercel n'est pas concerné par `engines.node` ; côté build, Vercel est en Node 22 (`checks.yml` aussi) [FACT 2026-09-07 sur la CI, `[ASSUMED]` pour le réglage Node du projet Vercel, à lire dans les settings avant la PR].
- satori 0.26 à 0.33, releases lues le 07/09 : 0.26 runtime JSX minimal intégré · 0.28.1 « render text matching Object.prototype property names as glyphs » (un titre `constructor` ou `toString` rendait mal) · 0.29.0 WebP · 0.29.1 durcissement du garde SSRF sur les images distantes · 0.30 à 0.32 `corner-shape`, `clip-path: shape()`, `backdrop-filter` · **0.33.0 « Add HarfBuzz text shaping »** · 0.33.1 à 0.33.4 cache des polices et perf.

**Impact sur les 124 erreurs `substFormat: 3`.** `[HYP]` L'erreur vient du parseur de tables GSUB (ligatures) d'opentype.js dans satori 0.25, déclenchée quand une police de repli est chargée pour un titre non latin (grec, arabe, japonais, russe : nous servons 22 locales et `/api/og?title=` reçoit le titre traduit). Le passage à HarfBuzz en 0.33.0 change précisément cette couche. C'est l'hypothèse la plus probable, **pas une preuve** : la PR 1b doit la tester avec les titres qui plantent aujourd'hui (les tirer des logs Vercel de `/api/og`, 124 entrées, avant de toucher au code). Si les erreurs persistent en 1.0.2, le repli est d'embarquer explicitement une police (`fonts: [{ name, data }]`) couvrant grec et cyrillique et de rendre les autres scripts en latin translittéré, ce qui est un autre chantier.

Procédure PR 1b : `npm install @vercel/og@1.0.2`, `npx next build`, preview `[preview]`, comparer pixel à pixel `/api/og?title=Balos&type=beach` et un titre grec et un titre japonais entre prod et preview (le rendu HarfBuzz peut décaler le crénage de quelques pixels : acceptable, à constater), vérifier la taille de réponse et le temps (le timeout 300 s de l'audit ne doit pas réapparaître). Les deux `opengraph-image.tsx` utilisent `next/og` et ne bougent pas avec cette PR (leur satori suit la version de `next`).

Si la PR 1b est jugée trop risquée avant le 20/09 (FTT), elle attend : l'objectif de mesure reste alors « 0 high hors `@vercel/og` », comme demandé.

### 2.3 Liste exacte des cibles

| Paquet | Actuel | Cible | Type | Raison |
|---|---|---|---|---|
| `next` | 16.2.1 | **16.2.12** | patch | DoS Server Actions (16.2.11), middleware bypass, SSRF rewrites, image SVG DoS |
| `eslint-config-next` | 16.2.6 | 16.2.12 | patch | aligné sur `next` |
| `next-intl` | 4.8.3 | **4.14.2** | mineure | open redirect (4.9.1), prototype pollution |
| `@sentry/nextjs` | 10.45.0 | 10.73.0 | mineure | OpenTelemetry moderate |
| `resend` | 6.9.4 | 6.26.0 | mineure | `svix` moderate |
| `sanitize-html` | 2.17.4 | 2.17.7 | patch | moderate |
| `isomorphic-dompurify` | 3.17.0 | dernier 3.x | patch | `dompurify` 3.4.15 |
| `@supabase/supabase-js` | 2.100.0 | 2.115.0 | mineure | `ws` |
| `stripe` | 22.3.2 | 22.6.1 | mineure | hygiène, aucun avis |
| transitifs listés en 2.1 | | résolus par `npm audit fix` | | |
| `@vercel/og` | 0.11.1 | **1.0.2** (PR 1b) | **major** | `sharp` ^0.35, satori 0.33 |
| `typescript`, `vitest`, `eslint`, `maplibre-gl`, `motion`, `@types/node` | | **inchangés** | major | hors périmètre |

## 3. Content-Security-Policy (PR 3)

### 3.1 Inventaire des origines, lu dans le code

Tout ce qui suit est tiré de `src/` le 07/09 ; la phase Report-Only (3.4) est là pour attraper ce que la lecture a raté.

**Scripts exécutés côté client**
- `https://analytics.crete.direct/js/script.outbound-links.js` : Plausible, `<Script strategy="afterInteractive">` dans `src/app/[locale]/layout.tsx` L121-126.
- Stub inline `#plausible-init` (`window.plausible = window.plausible || function(){...}`), `src/app/[locale]/layout.tsx` L133-139 : inline **volontairement brut**, exécuté au parse, avant l'hydratation (commentaire du fichier : sans lui les événements de rétention partaient dans le vide).
- Horloge inline `CLOCK_JS`, `src/app/admin/cockpit/page.tsx` L367 (route admin, hors matcher du middleware mais couverte par `headers()` de `next.config.ts` qui s'applique à `/(.*)`).
- **Les scripts inline de Next 16 lui-même** : le flux RSC est injecté dans le HTML sous forme de `<script>self.__next_f.push([...])</script>` (l'audit 360 mesure 933 Ko de RSC inline sur `/fr/articles`), plus le bootstrap d'hydratation. Ils changent à chaque page et à chaque build.
- Bundles `/_next/static/*` : `'self'`.
- Sentry : SDK dans les bundles (`'self'`), pas de script externe.
- Sur les **previews** uniquement : la toolbar Vercel injecte `https://vercel.live` (script + iframe + websocket). Absente en prod.

**Ce que la CSP ne regarde pas** : les 10 blocs `<script type="application/ld+json">` (`src/components/JsonLd.tsx` L25-29 et `src/app/[locale]/explore/page.tsx` L168-171) sont des blocs de données, pas des scripts exécutables : `script-src` ne s'applique pas. Le JSON-LD ne pèse donc **pas** dans le choix nonce vs hash, contrairement à ce qu'on lit souvent.

**Styles** : `next/font/google` (Geist, Baloo 2, Comfortaa) auto-hébergé, CSS inline dans le `<head>` · attributs `style=""` rendus côté serveur par React (dizaines de composants, `motion`) · `<style dangerouslySetInnerHTML>` : `ARTICLE_CSS` (`src/app/[locale]/enquete/paradoxe-tourisme-crete/page.tsx` L657), `PRINT_CSS` (`src/app/[locale]/invoice/[token]/page.tsx` L102 et L147) · MapLibre injecte sa propre feuille et des styles inline sur le canvas · `Content-Type` des fonds de carte : `tiles.basemaps.cartocdn.com` sert aussi le sprite CSS.

**Images**
- `images.remotePatterns` de `next.config.ts` L27-37 : `upload.wikimedia.org`, `**.wikimedia.org`, `images.unsplash.com`, `images.pexels.com`, `a0.muscache.com`, `media.crete.direct`. Via `next/image` elles passent par `/_next/image` (`'self'`), **mais 24 `<img>` bruts** hotlinkent directement `guide.image_url` et consorts (`src/app/[locale]/articles/articles-shared.tsx` L79, `articles/[slug]/page.tsx` L360 et L493, `food/page.tsx` L348, `hikes/*`, `news/page.tsx` L152, etc.) : ces hôtes doivent donc figurer **aussi** dans `img-src`.
- `https://i.ytimg.com` (miniatures YouTube), `https://www.google.com` (liens, à confirmer si une image en vient).
- Fonds de carte : style `https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json` (5 appelants : `ExploreView.tsx` L463, `LiveMapClient.tsx` L129, `MapCell.tsx` L9, `LineMap.tsx` L30, `admin/flux/FluxMap.tsx` L127). Le style, lu le 07/09, référence `tiles.basemaps.cartocdn.com` (TileJSON, sprite, glyphes `/fonts/{fontstack}/{range}.pbf`) et le TileJSON pointe les tuiles vers **`tiles-a` à `tiles-d.basemaps.cartocdn.com`**. Satellite : `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` (`ExploreView.tsx` L476).
- MapLibre 5 charge tuiles, sprite et glyphes par `fetch()` puis `createImageBitmap` : ils relèvent de **`connect-src`**, pas de `img-src`. On les met dans les deux : le coût est nul et ça évite une régression si MapLibre repasse par `<img>` pour un format.
- `data:` et `blob:` : MapLibre crée des `blob:` pour ses workers et certains canvases ; aucun `data:` explicite trouvé dans `src/` (grep vide), mais `next/image` et les icônes SVG en `<use>` (`src/components/IconSprite.tsx`) n'en ont pas besoin. On autorise `data:` et `blob:` dans `img-src` seulement (pratique standard, risque nul sur les images).

**Connexions (XHR, fetch, beacon, WebSocket)**
- `'self'` : tous les formulaires et beacons du site tapent `/api/*` (38 composants client font `fetch(`, aucun vers une URL externe sauf ci-dessous).
- `https://analytics.crete.direct` (événements Plausible).
- `https://nominatim.openstreetmap.org` : recherche distante de `/explore`, `src/components/explore/ExploreView.tsx` L1024-1025, composant `"use client"`.
- `https://basemaps.cartocdn.com`, `https://tiles.basemaps.cartocdn.com`, `https://tiles-a.basemaps.cartocdn.com`, `tiles-b`, `tiles-c`, `tiles-d`, `https://server.arcgisonline.com` (MapLibre).
- Sentry : le DSN `NEXT_PUBLIC_SENTRY_DSN` (`sentry.client.config.ts`) envoie vers `https://oNNN.ingest.sentry.io` ou `https://oNNN.ingest.de.sentry.io`. **L'hôte exact est à lire dans les variables Vercel** avant d'écrire la directive ; on écrit `https://*.ingest.sentry.io https://*.ingest.de.sentry.io` pour ne pas dépendre de la région. ⛔ Rappel de l'audit : les tokens Sentry répondent 403 et le projet est `kairos`, pas crete.direct (`⛔ BLOQUÉ François`). La CSP n'a pas besoin du token, seulement de l'hôte du DSN, lisible dans le tableau de bord Vercel.
- Aucun appel client vers Supabase (`src/lib/supabase.ts` n'est importé par aucun composant `"use client"`, `NEXT_PUBLIC_SUPABASE_URL` n'est lu que côté serveur) ni vers Stripe (`NEXT_PUBLIC_PARTNERS_STRIPE_URL` est un lien). Open-Meteo, Photon, citybus.gr, Google Places, EFFIS : tous appelés **côté serveur** (`src/lib/weather*.ts`, `src/app/api/geocode/route.ts`, `src/app/api/buses/citybus-live/[stop]/route.ts`, `src/lib/google-rating-server.ts`, pages `weather` et `fire-alerts`) : hors CSP.
- Web Push : l'abonnement (`src/components/PushBell.tsx`) parle au service push du navigateur, pas à une origine soumise à la CSP.

**Cadres** : `https://www.youtube-nocookie.com/embed/...` (`src/components/YouTubeEmbed.tsx` L32). Aucun autre `<iframe>` trouvé. `vercel.live` en preview.

**Workers** : `/sw.js` (`src/components/SwRegister.tsx`, `public/sw.js`, même origine) et le worker MapLibre créé en `blob:`.

**Media** : aucun `<video>`/`<audio>` trouvé dans `src/` ; `'self'` suffit, à confirmer en Report-Only.

**Polices** : `next/font` = fichiers sous `/_next/static/media` = `'self'`. Aucune police Google chargée à la volée côté client. Les glyphes MapLibre sont des `.pbf` en `fetch` (connect-src).

**Formulaires** : tous en `'self'` (aucun `action="https://..."` externe, grep vide). Le paiement Stripe redirige par `window.location`, ce n'est pas une soumission de formulaire.

### 3.2 La politique cible

Écrite en clair, une directive par ligne ; le code la joindra en une chaîne. `[preview]` note ce qui ne s'ajoute que si `process.env.VERCEL_ENV === "preview"` (évalué au build dans `next.config.ts`).

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://analytics.crete.direct [preview: https://vercel.live];
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://upload.wikimedia.org https://*.wikimedia.org https://images.unsplash.com https://images.pexels.com https://a0.muscache.com https://media.crete.direct https://i.ytimg.com https://tiles.basemaps.cartocdn.com https://tiles-a.basemaps.cartocdn.com https://tiles-b.basemaps.cartocdn.com https://tiles-c.basemaps.cartocdn.com https://tiles-d.basemaps.cartocdn.com https://server.arcgisonline.com;
connect-src 'self' https://analytics.crete.direct https://nominatim.openstreetmap.org https://basemaps.cartocdn.com https://tiles.basemaps.cartocdn.com https://tiles-a.basemaps.cartocdn.com https://tiles-b.basemaps.cartocdn.com https://tiles-c.basemaps.cartocdn.com https://tiles-d.basemaps.cartocdn.com https://server.arcgisonline.com https://*.ingest.sentry.io https://*.ingest.de.sentry.io [preview: https://vercel.live wss://ws-us3.pusher.com];
font-src 'self';
frame-src https://www.youtube-nocookie.com [preview: https://vercel.live];
worker-src 'self' blob:;
media-src 'self';
manifest-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests;
report-uri /api/csp-report;
report-to csp
```

Accompagnée de l'en-tête `Reporting-Endpoints: csp="/api/csp-report"` (mécanisme moderne ; `report-uri` reste pour Safari et Firefox anciens).

Ce qu'elle bloque réellement, malgré `'unsafe-inline'` sur `script-src` : le chargement d'un script depuis **toute origine tierce non listée** (une injection `<script src=https://evil>` dans une description scrapée ne charge plus), l'exfiltration par `fetch`/`img` vers un hôte inconnu (`connect-src`, `img-src`), les `<object>`/`<embed>`, la réécriture de `<base>`, la soumission de formulaire vers l'extérieur, et le framing du site (voir 5). Ce qu'elle ne bloque **pas** : un script inline injecté dans le HTML. Pour ça, la vraie garde reste en amont : `JsonLd.tsx` échappe `<` en `<` (L17-19), `events/[slug]/page.tsx` L196-199 passe par `sanitize-html` avec liste blanche, `reviews/sanitize.ts` retire tout HTML. Deux injections restent **sans sanitisation explicite** et méritent une ligne dans la PR 3, sans en faire un préalable : `articles/[slug]/page.tsx` L453 (`linkedContent`, contenu généré par notre pipeline `writer.py` puis `autolinkHtml`, source interne) et `news/[slug]/page.tsx` L310 (`summary`, source interne, scrapée puis réécrite). `🔎 REPÉRÉ, PAS TOUCHÉ` : les passer par `sanitize-html` coûterait 10 lignes et un test chacun ; à décider par François, hors de cette spec.

### 3.3 Nonce, hash ou `'unsafe-inline'` : recommandation et justification

**Recommandation : `'unsafe-inline'` sur `script-src` et `style-src`, marqué `SHORTCUT`, avec le reste de la politique strict.**

Pourquoi pas le nonce, qui est la voie « propre » documentée par Next (`docs/01-app/02-guides/content-security-policy.mdx`, lu via context7 le 07/09) :
- Le nonce exige que **chaque page soit rendue dynamiquement** (« When Content Security Policy nonces are used, all pages in your Next.js application must be dynamically rendered. This means static optimization and Incremental Static Regeneration (ISR) are disabled »). Le site vit de l'ISR : ~24 000 pages × 22 locales servies depuis le CDN, `localeCookie: false` et `localeDetection: false` ont été choisis exprès pour que « pages are served as static HTML from the edge » (`src/i18n/routing.ts` L9-14). Un nonce par requête casse ce modèle : chaque hit devient une invocation, la facture Vercel (plafond 35 $, `dev_state.md`) explose et le TTFB avec.
- Le nonce se pose dans le middleware, dont le `matcher` **exclut** `api`, `admin`, `go`, `_next` et tout chemin avec un point (`src/middleware.ts` L89-93) : ces routes n'auraient pas de nonce, donc pas de CSP, ou une CSP différente. Deux politiques à maintenir.
- PPR / Cache Components (que la 16.3 pousse) sont eux aussi incompatibles avec le nonce (même doc).

Pourquoi pas les hashes :
- Le flux RSC inline (`self.__next_f.push`) change à chaque page et à chaque build : impossible à hacher statiquement. Next ne publie pas la liste des hashes de ses scripts de bootstrap.
- Les deux inline « à nous » (`plausible-init`, `CLOCK_JS`) sont hachables, mais ça ne suffit pas à retirer `'unsafe-inline'` tant que les scripts Next ne le sont pas. Un hash ne sert à rien si la même directive porte déjà `'unsafe-inline'` : les navigateurs ignorent alors `'unsafe-inline'` quand un nonce ou un hash est présent, et bloqueraient les scripts Next.
- Pour `style-src`, les attributs `style=""` rendus côté serveur ne se hachent pas sans `'unsafe-hashes'` et un hash par valeur : irréaliste avec `motion` et MapLibre.

Ce que ça vaut : une CSP « niveau 1 » (contrôle des origines), pas une CSP « niveau 3 » (`strict-dynamic`). Mozilla Observatory retire des points pour `'unsafe-inline'` dans `script-src` ; c'est le prix du rendu statique. Marqueur à poser dans le code, ligne de la directive : `// SHORTCUT: 'unsafe-inline' dans script-src tant que le site est ISR ; déclencheur d'upgrade : bascule en rendu dynamique ou support officiel des hashes RSC par Next.`

### 3.4 Déploiement : Report-Only d'abord

**Mécanisme** : l'en-tête est posé dans `headers()` de `next.config.ts` à côté de `securityHeaders` (aucun middleware, donc ISR et CDN intacts, et les routes `admin`/`api`/`go` couvertes aussi). Le nom de l'en-tête est piloté par une variable d'environnement Vercel lue **au build** : `CSP_MODE=report-only` (défaut) émet `Content-Security-Policy-Report-Only`, `CSP_MODE=enforce` émet `Content-Security-Policy`, `CSP_MODE=off` n'émet rien (kill switch sans code). Une variable lue au build implique un redeploy pour changer de mode : c'est voulu, le changement passe par la file de 20h ou par le bouton « Run workflow » de `daily-deploy`, jamais par une bascule silencieuse.

**Endpoint de rapport : route interne `src/app/api/csp-report/route.ts`**, pas Sentry. Raisons : le compte Sentry est en 403 et pointe le mauvais projet (audit 360, ⛔ BLOQUÉ) ; le « CSP report » Sentry est facturé à l'événement ; une route interne coûte une invocation Vercel par rapport, ce qui se maîtrise. Contrat de la route : `POST` uniquement, accepte `application/csp-report` et `application/reports+json`, corps plafonné à 8 Ko, réponse `204` immédiate, écrit **une ligne JSON structurée** dans `console.warn` (`{directive, blockedUri, documentUri, sourceFile, line, ua}`) : elle apparaît dans les Runtime Logs Vercel, filtrables et exportables, sans table Supabase ni nouvelle dépendance. Doublons : les navigateurs dédupliquent déjà par page. Garde-fou de coût : si les invocations de la route dépassent 2 000 par jour sur 3 jours (lisible dans l'onglet Usage Vercel), passer `CSP_MODE=off` et réduire la politique avant de reprendre : c'est le signe qu'une directive est fausse, pas d'une attaque.

**Durée d'observation : 14 jours** à compter du premier deploy prod en Report-Only. Pourquoi 14 et pas 7 : le trafic est saisonnier et multi-locale, la carte `/explore` et le planner bus sont utilisés surtout le week-end, les crons Vercel hebdomadaires (`newsletter` lundi 05:00, `google-ratings` lundi 04:40) rendent des pages qu'on ne visite pas, et il faut au moins deux cycles pour voir un faux positif rare (une police de repli, un CDN d'image alternatif d'un partenaire).

**Bascule** : à J+14, si les rapports des 7 derniers jours ne contiennent que du bruit connu (extensions navigateur : `chrome-extension://`, `moz-extension://`, `safari-web-extension://`, `about:blank`, `inline` provenant de scripts d'extensions ; on les filtre par `blockedUri` avant lecture), passer `CSP_MODE=enforce` et redeployer. Garder `report-uri` en mode bloquant : les violations réelles remontent alors aussi.

**Previews** : la politique s'y applique aussi (même `next.config.ts`), avec les ajouts `[preview]` pour la toolbar Vercel. Les rapports de preview arrivent sur la route de la preview, pas de prod : pas de pollution.

## 4. `poweredByHeader`, HSTS, `preload` (PR 2)

### 4.1 `poweredByHeader: false`
Une clé dans `nextConfig` (`next.config.ts`, à côté de `turbopack`). Retire `X-Powered-By: Next.js`. Gain réel modeste (le HTML trahit Next de dix autres façons), coût nul, et c'est le premier point que lèvent securityheaders.com et Observatory.

### 4.2 HSTS `includeSubDomains`
Aujourd'hui l'en-tête est **posé par Vercel** (`max-age=63072000`, rien dans `next.config.ts`). On le redéfinit dans `securityHeaders` : `Strict-Transport-Security: max-age=63072000; includeSubDomains`. Vercel laisse la valeur applicative primer quand elle est présente [`[ASSUMED]`, à vérifier au `curl` sur la preview : si Vercel écrase, la voie de repli est la même valeur dans `vercel.json` `headers`].

Inventaire des sous-domaines, mesuré le 07/09 :

| Hôte | Serveur | HTTPS | `http://` → | HSTS actuel | Risque avec `includeSubDomains` |
|---|---|---|---|---|---|
| `crete.direct` | Vercel | 307 vers `/en` | 308 https | 2 ans | aucun |
| `www.crete.direct` | Vercel | 307 | 308 https | 2 ans | aucun |
| `van.crete.direct` | Vercel | 307 | 308 https | 2 ans | aucun |
| `analytics.crete.direct` | Plausible (VPS) | 200 | 308 https | **déjà `includeSubDomains; preload`** | aucun |
| `media.crete.direct` | Caddy (VPS) | 404 à la racine, cert valide | 308 https | **aucun** | aucun : Caddy sert du HTTPS auto-renouvelé ; le 404 racine est normal, seuls les chemins d'images existent |

Le vrai risque n'est pas dans cette liste, il est dans **ce que la liste ne voit pas** : un sous-domaine créé plus tard (un outil interne sur `xxx.crete.direct` en HTTP simple, un CNAME de test) deviendrait inaccessible pendant 2 ans pour tout navigateur ayant visité l'apex. La règle à écrire dans `docs/WORKFLOW-MULTI-TERMINAL.md` (une ligne) : **tout nouveau sous-domaine de `crete.direct` est HTTPS ou n'existe pas.** ⚠️ Zone DNS non énumérée ici (pas d'accès au registrar depuis ce worktree) : avant la PR 2, lister les enregistrements dans le panneau DNS et vérifier qu'aucun autre hôte que ces 5 ne répond. `⛔ BLOQUÉ` sur cette vérification : François, avant le 14/09/2026.

### 4.3 `preload` (option, pas dans la PR 2)
`preload` inscrit le domaine dans la liste codée en dur de Chrome, Firefox, Safari : irréversible à l'échelle de mois, et exige `includeSubDomains` + `max-age ≥ 31536000` + redirection http→https sur l'apex (les trois seraient réunis après la PR 2). Recommandation : **attendre 30 jours** après la PR 2 sans incident de sous-domaine, puis soumettre sur hstspreload.org. Décision de François.

## 5. `X-Frame-Options` et `frame-ancestors`

Les deux disent la même chose : personne n'embarque crete.direct dans un cadre. `frame-ancestors 'none'` (dans la CSP, PR 3) est la version moderne, respectée par tous les navigateurs courants et **prioritaire** sur `X-Frame-Options` quand les deux sont présents. On **garde** `X-Frame-Options: DENY` (`next.config.ts` L17) : il couvre les navigateurs sans CSP niveau 2 et ne coûte rien. Aucun cas d'usage d'embarquement recensé (pas de widget partenaire, pas d'iframe fournie aux loueurs). Si un jour un partenaire veut intégrer le planner bus, la réponse est `frame-ancestors https://partenaire.example`, pas le retrait des deux.

## 6. Tests

**6.1 Test unitaire des en-têtes (vitest, tourne en CI via `npm test`).** Pour tester sans importer `next.config.ts` (dont l'export est enveloppé par `withSentryConfig(withNextIntl(...))`, lourd et à effets de bord), déplacer `securityHeaders` et la construction de la CSP dans un module pur `src/lib/security-headers.ts`, importé par `next.config.ts`. Le test `src/lib/__tests__/security-headers.test.ts` (pattern des 95 tests existants, `environment: "node"`, `vitest.config.ts`) vérifie :
- présence et valeur exacte de `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security` (contient `includeSubDomains`, `max-age ≥ 31536000`) ;
- la CSP se découpe en directives ; `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `form-action 'self'` présents ; `'unsafe-eval'` **absent** en production ; `report-uri /api/csp-report` présent ;
- **couplage avec la config image** : chaque hôte de `images.remotePatterns` (exporté du même module ou lu depuis un tableau partagé) figure dans `img-src`, pour qu'un futur ajout d'hôte d'image casse le test au lieu de casser une page ;
- `vercel.live` n'apparaît que si `VERCEL_ENV === "preview"` ;
- le mode `CSP_MODE=off` n'émet aucun en-tête CSP, `report-only` émet `Content-Security-Policy-Report-Only`, `enforce` émet `Content-Security-Policy`.

**6.2 Test e2e `curl` sur la preview et la prod (manuel, script versionné).** `scripts/check-security-headers.mjs` (pattern des `scripts/check-*.mjs`), `SITE_URL=https://<preview>.vercel.app node scripts/check-security-headers.mjs` : `HEAD /en`, `/fr/explore`, `/api/og?title=x`, `/admin` (attend 401 ou redirection, mais les en-têtes doivent y être aussi), `/sw.js`. Assertions : les 6 en-têtes présents, `X-Powered-By` **absent**, CSP présente sous le nom attendu par le mode. Réseau requis, donc **hors** `npm run check` (qui doit rester pur et rapide) ; lancé à la main sur chaque preview `[preview]` des PR 2 et 3, résultat collé dans la PR. Un second run sur `https://crete.direct` le lendemain du deploy de 20h.

**6.3 Vérification visuelle avant push** (règle `feedback_mockup_avant_deploy.md`) : sur la preview de la PR 3, ouvrir la console sur `/fr/explore` (carte, satellite, recherche Nominatim), `/en/buses/agios-nikolaos` (LineMap), un article avec vidéo YouTube, `/en/enquete/paradoxe-tourisme-crete` (style inline), une facture `/fr/invoice/<token>` de test : zéro ligne rouge CSP en console.

## 7. Rollback

- **PR 1 (deps)** : `git revert` du commit de lockfile sur une branche `fix/*`, `npm run ship`, et si l'incident est en prod avant 20h, l'exception documentée : `git push origin master:main` ou « Run workflow » sur `daily-deploy` (`docs/WORKFLOW-MULTI-TERMINAL.md`, section Hotfix). Plus rapide encore, sans build : **Instant Rollback** Vercel vers le déploiement précédent (quelques secondes), puis le revert git derrière pour que la file de 20h ne redéploie pas la version cassée.
- **PR 1b (`@vercel/og`)** : `npm install @vercel/og@0.11.1`, même chemin. Les images OG sont cachées 1 an côté CDN (`cache-control: immutable`) : un mauvais rendu déjà servi reste en cache jusqu'à purge ; tester sur la preview **avant** est donc la vraie protection.
- **PR 2 (en-têtes)** : revert d'un fichier. HSTS `includeSubDomains` est le seul irréversible côté client : une fois reçu par un navigateur, il tient 2 ans pour ce navigateur. D'où la vérification DNS préalable de 4.2.
- **PR 3 (CSP)** : `CSP_MODE=off` dans Vercel + redeploy (bouton « Run workflow ») : zéro changement de code. En Report-Only, il n'y a par construction rien à annuler côté visiteur.

## 8. Mesure

| Indicateur | Avant (07/09) | Cible | Comment |
|---|---|---|---|
| `npm audit --omit=dev` high | 14 | **0** hors `@vercel/og` (PR 1) · **0** (PR 1b) | JSON avant/après dans la PR |
| `npm audit --omit=dev` moderate | 18 | ≤ 2 (ce que `next` épingle lui-même) | idem |
| securityheaders.com | non mesuré (attendu D : pas de CSP, `X-Powered-By`) | **A** après PR 3 en `enforce` (B+ ou A- en Report-Only, l'outil ne compte pas Report-Only comme une CSP) | scan manuel, capture dans `dev_state.md` |
| Mozilla HTTP Observatory | non mesuré | **B+ (≥ 75)** : plafonné par `'unsafe-inline'` dans `script-src`, assumé en 3.3 | idem |
| Rapports CSP | 0 | < 20 / jour hors extensions à J+14 | Runtime Logs Vercel filtrés sur la route |
| `/api/og` erreurs satori | 124 depuis le 11/07 | 0 sur 7 jours après PR 1b | Runtime Logs, filtre `substFormat` |
| Invocations `/api/csp-report` | 0 | < 2 000 / jour | Usage Vercel |
| `X-Vercel-Cache: HIT` sur `/en`, `/fr/explore` | HIT | **HIT inchangé** (preuve que la CSP statique n'a pas cassé l'ISR) | `curl -sI` |

## 9. Effort et ordre des PR

| PR | Contenu | Effort | Quand |
|---|---|---|---|
| **PR 1** `fix/deps-audit-2026-09` | `next` 16.2.12, `next-intl` 4.14.2, `npm audit fix`, lockfile, `checks.yml` en `npm ci` si possible, preview, `npm run ship` | **3 à 4 h** (dont 1 h de build + tests, 1 h de vérification preview) | en premier, cette semaine |
| **PR 1b** `fix/vercel-og-1` | `@vercel/og` 1.0.2, comparaison OG prod/preview sur 3 scripts, lecture des 124 logs | **2 h** | après PR 1 en prod, ou après le 20/09 |
| **PR 2** `fix/security-headers` | `poweredByHeader: false`, HSTS `includeSubDomains`, module `src/lib/security-headers.ts`, test vitest, `scripts/check-security-headers.mjs`, une ligne dans le WORKFLOW | **1,5 h** + vérification DNS par François | après PR 1 |
| **PR 3** `feat/csp-report-only` | politique 3.2, `CSP_MODE`, route `/api/csp-report`, `Reporting-Endpoints`, tests étendus, vérification visuelle | **4 h** | après PR 2 |
| **PR 3 bis** (pas de code) | lecture des rapports à J+7 et J+14, ajustement de directives si besoin, `CSP_MODE=enforce` | **1 h** + éventuel patch | J+14 |
| **Total** | | **≈ 12 h** étalées sur 3 semaines | |

Chaque PR suit le flux du dépôt : branche depuis `master`, commits `[preview]` pour l'URL de vérification, `npm run ship` (`scripts/ship.sh` : working tree propre, `npm run check`, merge `origin/master`, push `HEAD:master`), promotion `master → main` par `daily-deploy` à 20h Athènes. Aucune de ces PR ne justifie le hotfix manuel vers `main`, sauf un rollback (7).

## Fichiers lus pour écrire cette spec

Dans `~/cp-specs-360` :
- `next.config.ts` (en-têtes L16-21, `images.remotePatterns` L27-37, `headers()` L71-73, absence de `poweredByHeader`)
- `src/middleware.ts` (composition next-intl, matcher L89-93)
- `src/i18n/routing.ts` (`localePrefix: "always"`, `localeCookie: false`, périmètre indexable)
- `package.json`, `package-lock.json` (versions verrouillées et parents des paquets vulnérables)
- `vercel.json` (crons, `ignoreCommand`)
- `sentry.client.config.ts`, `sentry.edge.config.ts`
- `src/app/[locale]/layout.tsx` (Plausible `<Script>` L121-126, stub inline L133-139, `next/font`)
- `src/app/layout.tsx` (import `next/font/google`)
- `src/app/globals.css` (polices)
- `src/components/JsonLd.tsx`
- `src/app/[locale]/explore/page.tsx` L141-171 (JSON-LD inline)
- `src/app/admin/cockpit/page.tsx` L367 (`CLOCK_JS`)
- `src/app/[locale]/articles/[slug]/page.tsx` (L308 `linkedContent`, L453 injection, L360 et L493 `<img>`)
- `src/app/[locale]/articles/articles-shared.tsx` L76-84
- `src/app/[locale]/events/[slug]/page.tsx` L195-199 (`sanitize-html`)
- `src/app/[locale]/news/[slug]/page.tsx` L27-29, L181-182, L310
- `src/app/[locale]/enquete/paradoxe-tourisme-crete/page.tsx` L657-658
- `src/app/[locale]/invoice/[token]/page.tsx` L102, L147
- `src/components/campagne/Card.tsx` L5-7, L67-73
- `src/components/IconSprite.tsx`
- `src/lib/reviews/sanitize.ts`
- `src/components/explore/ExploreView.tsx` (L1-3, L463-476 fonds de carte, L1018-1032 Nominatim)
- `src/components/explore/bento/shared/MapCell.tsx` L9, `src/components/live/LiveMapClient.tsx` L129, `src/app/[locale]/buses/agios-nikolaos/LineMap.tsx` L30, `src/app/admin/flux/FluxMap.tsx` L127
- `src/components/YouTubeEmbed.tsx` L32
- `src/components/SwRegister.tsx`, `public/sw.js` (L1-30)
- `src/components/PushBell.tsx` L48, `src/app/[locale]/partners/page.tsx` L15, `src/lib/supabase.ts` L3, `src/lib/supabase-admin.ts` L16
- `src/app/api/og/route.tsx`, `src/app/[locale]/articles/[slug]/opengraph-image.tsx` L1-12
- `src/app/admin/activities/actions.ts`, `src/app/admin/car-rental/actions.ts` (présence de `"use server"`)
- `scripts/ship.sh`, `docs/WORKFLOW-MULTI-TERMINAL.md`, `CLAUDE.md` du dépôt
- `.github/workflows/checks.yml`, `vitest.config.ts`, `src/lib/__tests__/` (liste)
- `docs/superpowers/specs/2026-08-01-seo-locale-scope-design.md` (format de spec du dépôt)

Hors dépôt :
- `~/.claude/projects/C--Users-fkerj/memory/audit_crete_direct_360_2026-09-07.md` L40-70
- `https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json` et `https://tiles.basemaps.cartocdn.com/vector/carto.streets/v1/tiles.json` (hôtes MapLibre)
- registre npm : `@vercel/og` 0.11.1 et 1.0.2 (`package.json`, README 1.0.2), dist-tags de `next`, `next-intl`, `@sentry/nextjs`, `resend`, `sanitize-html`, `dompurify`, `isomorphic-dompurify`, `maplibre-gl`, `motion`, `stripe`, `@supabase/supabase-js`, `svix`, `satori`
- GitHub Security Advisories : next-intl (`GHSA-8f24-v5vv-gm5j`, `GHSA-4c35-wcg5-mm9h`, `GHSA-r27j-894h-3w3p`), Next.js (`GHSA-m99w-x7hq-7vfj` et la liste 2026) ; releases `vercel/satori` 0.25 à 0.33.4 ; `github.com/vercel/og` (404)
- context7 : `/vercel/next.js` (guide Content Security Policy, contrainte de rendu dynamique du nonce), `/amannn/next-intl` (composition de middleware)
- `curl` sur `crete.direct`, `www.`, `van.`, `media.`, `analytics.` (07/09)
