# Mesure crete.direct : un tableau de bord qui dit vrai, une machine qui rougit quand ça s'arrête

**Date** : 07/09/2026 · **Statut** : spec, aucun code écrit, aucun goal créé, VPS non touché ·
**Branche** : `feat/specs-360-2026-09` (worktree `~/cp-specs-360`)
**Périmètre** : Plausible CE 3.2.1 auto-hébergé (`analytics.crete.direct`, `site_id=1`), Search Console
(`sc-domain:crete.direct`), Postgres `cretepulse` (VPS, port 5433), les trois checks hebdo du poste.

## 0. Ce qui est mesuré le 07/09, et ce que le code explique

Faits relevés le 07/09 (ClickHouse `events_v2`, Postgres `plausible_db.goals`, GSC, Postgres `cretepulse`),
puis la cause lue dans le code. Rien ici n'est à re-déduire.

| Symptôme mesuré | Cause lue dans le code | Fichier |
|---|---|---|
| Rebond affiché 2 % ; vrai mono-page recalculé 65 % | `retention` est un event custom tiré à chaque session (9 017 visiteurs sur 9 382). Plausible dé-rebondit une session dès le 2e event, pageview ou non | `src/components/RetentionBeacon.tsx` L14-L23 |
| 698 sessions sur 30 j (7 %) sans aucune pageview, seulement `retention` (351 direct, 136 sur `/en`) | Le stub inline `window.plausible.q` (layout L133-L138) met `retention` en file dès le mount. Le script servi (`script.outbound-links.js`, `plausible.v=33`, relu le 07/09) **ne tire la pageview initiale que si `document.visibilityState` est `visible`** et la diffère sinon à `visibilitychange`, mais **vide la file `plausible.q` inconditionnellement juste après**. Onglet ouvert en arrière-plan, prerender, aperçu de lien : `retention` part, la pageview jamais | script Plausible, ordre : `n()` conditionnel puis `for(r=window.plausible.q...) g.apply(...)` ; `src/app/[locale]/layout.tsx` L121-L138 |
| 22 goals déclarés, 44 events distincts reçus, toutes les conversions hors panneau Goals | 33 noms d'events distincts dans `src/` via `window.plausible?.(` + `track()` de `MatchDeck.tsx` (16 noms) + `ImpressionTracker` (`promo_impression`) + `boarding-beacon.ts`. Aucun registre, aucun test ne compare code et instance | voir § 3 |
| 3 goals à 0 event sur 60 j : `finish_clicked`, `synthesis_route_clicked`, `synthesis_place_clicked` | Toujours émis par `src/components/match/MatchDeck.tsx` L938, L765/L774, L754. Le deck « match » n'est simplement plus utilisé jusqu'à la synthèse | idem |
| Recherche interne : 271 `search_query` sur 319 à `results=0` (85 %) | `/search` n'interroge **aucune base** : un tableau statique `SEARCH_INDEX` de 31 entrées (rubriques + 4 villes + 5 mois), filtre `includes` sur minuscules **sans retrait des accents ni translittération**. « Elounda », « Matala », « Plakias », « Ρέθυμνο » : 0 résultat par construction | `src/app/[locale]/search/page.tsx` L14-L182, L201-L214 |
| Les termes de recherche n'atteignent jamais `flux_intent_daily` | La page émet la prop **`q`** (L236) ; l'extracteur lit la prop **`query`** (`SPECS` : `("search_query", "query", ...)`) et filtre `HAVING v != ''`. Zéro ligne depuis le 13/06 | `vps/flux/intent_extract.py` L27-L33 ; `page.tsx` L236 |
| Wizard voiture : 24 des 28 submits en `fr` pour 12 % du trafic ; EN = 4 submits pour 188 steps | `Car Wizard Step` existe déjà avec `step` et `locale` (L405-L414). Son `useEffect` dépend aussi de `pickup` : choisir un pickup à l'étape 1 ré-émet « step 1 ». Le tunnel par locale n'est calculé nulle part | `src/components/car-rental/CarRentalWizard.tsx` L405-L414 |
| `guides_perf` : 0 ligne ; `guides_queue` figée au 14/06 | **Aucun écrivain n'existe** : grep `guides_perf` vide dans le dépôt, `~/cretepulse/`, `~/.claude/scripts/`. Le crontab cite `bin/perf-check.py` (lundi 09:00 UTC) qui n'est dans aucun dépôt. Le client GSC existe pourtant (`lib/gsc_client.py`, compte de service `/opt/cretepulse-content/gsc-service-account.json`) | `ops/crons/cretepulse-content.crontab` L21 ; `lib/gsc_client.py` |
| Check hebdo « IMPRESSIONS OK · ATTRIBUTION OK » avec 1 impression, 0 requête, 0 demande 7 j | `landingReq` somme `r.total` (cumul depuis juillet) ; `req7` est calculé puis **jamais lu par un verdict** ; `verdictImpr` teste `> 0` sur 28 j | `~/.claude/scripts/car-demand-gsc-check.mjs` L108-L124 |

Sentry : les tokens de `~/.kairos-keys` répondent 403/400, projet configuré `kairos`. Hors périmètre code.
Prérequis humain : François régénère un token sur le bon projet [15/09/2026]. Rien dans cette spec n'en dépend.

## 1. Objectif et non-objectifs

**Objectif.** Deux choses, dans cet ordre.
1. Un tableau de bord Plausible qui dit vrai : un rebond réel, zéro session fantôme, chaque conversion
   visible dans le panneau Goals, un tunnel voiture lisible par langue.
2. Une machine de mesure qui rougit quand ça s'arrête : verdicts hebdo sur fenêtre 7 j et 28 j, message
   Telegram ops seulement sur rouge ou orange, `guides_perf` alimentée chaque nuit, un test qui casse quand
   le code émet un event que l'instance ignore.

**Non-objectifs.**
- Pas de nouvel outil d'analytics, pas de bandeau cookies (Plausible ne pose aucun cookie ; l'audit RGPD
  du 14/08 côté Race Care s'appuie dessus, même instance).
- Pas de recherche full-text serveur (Postgres `tsvector`, Meilisearch) : la recherche interne fait 175
  visiteurs par mois, un routage client sur les lieux déjà servis à `/explore` suffit (§ 5).
- Pas de réécriture des 33 appels `window.plausible?.(` : un registre et un test, pas une migration.
- Pas de Sentry, pas de Core Web Vitals, pas de reprise du chantier SEO du 19/07 (fiche `project_crete_direct`).
- Pas de remontée de `guides_perf` dans la priorisation de `guides_queue` : on mesure d'abord, on
  pilote ensuite (follow-up daté § 10).

## 2. `retention` : fusionner dans la pageview, supprimer les sessions fantômes

### 2.1 Les deux options comparées

| | A. Garder l'event, corriger l'ordre | B. Props sur la pageview, plus d'event `retention` |
|---|---|---|
| Principe | `RetentionBeacon` n'émet qu'après `document.visibilityState === "visible"` **et** `window.plausible.l === true` (drapeau posé par le script à la fin de son init, relu le 07/09) | Script `script.manual.pageview-props.outbound-links.js` ; un composant `PageviewBeacon` appelle `plausible("pageview", { props })` à chaque changement de `usePathname()`, les 3 props de rétention attachées |
| Sessions fantômes | Disparaissent (plus rien ne part avant la pageview) | Disparaissent (nous portons la même garde de visibilité que le script) |
| Rebond | **Reste faux** : le 2e event dé-rebondit toujours | **Redevient vrai** : une session mono-page n'a qu'un event |
| Dénominateur nouveaux/revenants | Inchangé (`name='retention'`) | Passe sur la pageview : `uniqIf(session_id, prop bucket != '')` |
| Risque | Aucun | Nous tirons les pageviews nous-mêmes : un oubli de route = trou de mesure. `usePathname()` ne réclame pas de Suspense (contrairement à `useSearchParams`, évité exprès dans `BusesClient.tsx` L361-L372) |
| Coût | 1 h | 4 h avec tests |

**Décision : B.** A ne répare que la moitié du symptôme et l'objectif § 1 est un rebond vrai.

### 2.2 Design de B

- `src/lib/retention.ts` : inchangé (`computeRetention` reste pur, `check:retention` reste vert).
- Nouveau `src/lib/pageview-beacon.ts`, pur, testé : `nextPageview(state, ev)` où `state` = `{ sentFor: string | null, props: RetentionProps | null }` et `ev` = `{ pathname, visible: boolean }`. Règles :
  1. Props calculées **une fois par session** (cache `sessionStorage` `cd_r_props`, remplace `cd_r_sent`) ;
     `localStorage cd_visit` mis à jour à ce moment-là, comme aujourd'hui.
  2. Pas d'émission tant que `visible` est faux. À `visible`, une émission pour le `pathname` courant.
  3. Même `pathname` deux fois de suite = une seule émission (`StrictMode`, re-render).
  4. Nouveau `pathname` = nouvelle pageview avec les **mêmes** props de session.
- `src/components/RetentionBeacon.tsx` devient `PageviewBeacon.tsx` : `usePathname()` + écouteur
  `visibilitychange` + `pageshow` (`persisted`, bfcache, comme le script). Ordre des props : `visit_number`,
  `days_since_first`, `bucket`, plafonds inchangés (50+, 30+, 5 buckets), zéro identifiant.
- `src/app/[locale]/layout.tsx` L121-L126 : `src` passe à `script.manual.pageview-props.outbound-links.js`.
  Le stub inline L133-L138 reste (les events émis au mount avant chargement du script, `bus_boarding_proxy`
  par exemple, en dépendent toujours).
- `~/.claude/scripts/flux-impact-weekly.mjs` `returningShare()` : `name='retention'` devient
  `name='pageview'` avec `uniq(session_id)`, et une ligne datée dans `memory/flux_impact_log.md` marque la
  rupture de série.
- `vps/flux/intent_extract.py` : rien, `retention` n'y figure pas.

### 2.3 Effet attendu

- Rebond : de 2 % vers 55 à 65 % (le mono-page recalculé le 07/09 est 65 % ; les navigations SPA comptent
  désormais comme 2e pageview, ce qui est juste).
- Sessions sans pageview : de 7 % vers 0 (`SELECT count() FROM sessions_v2 WHERE pageviews = 0`).
- Les pages qui émettent au mount (`Car Wizard Viewed`, `now_panel_shown`, `promo_impression`,
  `install_banner_shown`) dé-rebondissent encore leur page : c'est de l'intention mesurée, on l'accepte et
  on le note sur le tableau de bord (§ 9).

## 3. Goals : déclarer les conversions, supprimer les fantômes, tester code contre instance

### 3.1 Registre unique dans le code

Nouveau `src/lib/analytics-events.ts` : la liste **exhaustive** des noms d'events émis par `src/`
(33 aujourd'hui, relevés le 07/09 par grep), et le sous-ensemble `CONVERSION_GOALS`. Aucun appelant
n'est réécrit ; le registre sert au test § 3.4 et à la commande § 3.3.

### 3.2 Les conversions à déclarer (type `event`, props lues dans le code)

| Event | Où il est émis | Props | Ce qu'il mesure |
|---|---|---|---|
| `Car Lead` | `CarRentalWizard.tsx` L486 | `zone, pickup, carType, source` | Demande voiture aboutie (le chiffre d'affaires 2026 vient de là) |
| `Car Wizard Submit` | `CarRentalWizard.tsx` L462, L483, L496, L502, L508 | `status` (attempt, success, fallback, http_N, network_error), `source, pickup, locale` | Tentatives et échecs, par langue |
| `car_offer_viewed` | `car-offer/[token]/OfferBeacon.tsx` L38 | (props du beacon) | Le client ouvre sa page d'offres : la mesure `f654da4` attendue depuis le 30/08 |
| `car_offer_accept` | `car-offer/[token]/AcceptButton.tsx` L74 | idem | Offre acceptée |
| `car_offer_decline` | `DeclineButton.tsx` L29, L34 | idem | Refus explicite (⛔ `declined_by_client` en base n'en est pas un, fiche car_demand) |
| `Activity Lead` | `activities/ActivityWizard.tsx` L306 | (props du wizard) | Demande activité, commission 15 % |
| `van_interest` | `buses/VanInterest.tsx` L134 | `from, to, source` | Demande van partagé |
| `van_offer_click` | `VanInterest.tsx` L167, L258 ; `VanPromo.tsx` L57 | `from, to, source` ou `corridor, source` | Clic vers l'offre van |
| `Taxi Call` | `TaxiCallButton.tsx` L17 | `zone, pair, partner` | Appel taxi partenaire |
| `ticket_intent` | `buses/` (prop `from, to`, lu par `intent_extract.py` L34) | `from, to` | Intention billet bus |
| `synthesis_email_sent` | `MatchDeck.tsx` L558 | `likes` | Email collecté par le deck (seule conversion vivante du match) |

Onze events. Le rapprochement avec les 22 goals existants se fait à l'exécution sur
`select id, event_name from goals where site_id = 1` : ce qui est déjà déclaré est laissé tel quel, le
reste est créé. `van_booking_submit` / `van_booking_ok` ne sont **pas** dans ce dépôt (sous-domaine van) et
Plausible y sous-compte de façon prouvée (`project_crete_direct_van_partage.md`, booking `id=27`
invisible) : on ne déclare pas un goal dont la base fait foi.

À supprimer : `finish_clicked`, `synthesis_route_clicked`, `synthesis_place_clicked` (0 event sur 60 j).
Les events continueront d'arriver bruts si quelqu'un termine un deck ; ils n'encombrent plus le panneau.

### 3.3 Commande rpc (méthode documentée en mémoire, `dev_state.md` L1405, 18/06/2026)

Le goal NovAI « Diagnostic Submit » a été créé par `docker compose exec plausible /app/bin/plausible rpc`
avec `Plausible.Goals.create`, retour `{:goal_created, 1, "Diagnostic Submit"}`. Même méthode, depuis
`/opt/plausible` sur le VPS, une commande par goal :

```
docker compose exec -T plausible /app/bin/plausible rpc \
  'site = Plausible.Repo.get_by!(Plausible.Site, domain: "crete.direct");
   {:ok, g} = Plausible.Goals.create(site, %{"event_name" => "Car Lead"});
   IO.inspect({:goal_created, g.id, g.event_name})'
```

Suppression : `Plausible.Goals.delete(id, site)` avec l'`id` lu dans `plausible_db.goals`
[HYP : signature à confirmer dans l'iex de l'instance avant exécution, `h Plausible.Goals.delete`].
Un script `vps/plausible/goals-sync.sh` porte la liste (générée depuis le registre § 3.1 par
`scripts/gen-plausible-goals.mjs`, même patron que `gen-car-partners-json.mjs`) : idempotent, il lit
d'abord les goals existants et n'appelle `create` que pour les manquants. Il n'est **pas** lancé par cette
spec ; il l'est à la main, une fois, par un terminal qui a le SSH.

### 3.4 Le test qui compare le code et l'instance

`scripts/check-analytics-events.mjs`, ajouté à la chaîne `npm run check` :
1. **Statique, toujours** : grep de `src/` sur trois formes, `window.plausible?.("X"`, `track("X"` dans
   `MatchDeck.tsx`, `event="X"` sur `<ImpressionTracker`. L'ensemble trouvé doit être **égal** au registre
   (un event émis non listé = rouge ; un event listé non émis = rouge, c'est un goal fantôme en devenir).
   `CONVERSION_GOALS ⊆ registre`.
2. **Vivant, sur option `--live`** : `ssh kairos-vps docker exec plausible-plausible_db-1 psql ...
   "select event_name from goals where site_id=1"`. Rouge si un `CONVERSION_GOALS` manque, rouge si un goal
   déclaré n'est plus dans le registre (le fantôme de demain). Ce mode tourne dans le check hebdo § 7, pas
   dans `npm run check` (pas de SSH en CI).

## 4. Tunnel voiture par locale

### 4.1 Ce qui existe déjà et ce qui manque

`Car Wizard Viewed` (L392-L403), `Started` (L361-L369), `Step` (L405-L414, props `step, source, pickup,
locale`) et `Submit` sont en prod. Ce qui manque :
- **Dédoublonnage de `Step`** : retirer `pickup` des dépendances du `useEffect` (garder `step`, `view`,
  `locale`, `source`) ; l'étape 1 ne doit être comptée qu'une fois par session. Test : rendu du wizard, choix
  d'un pickup, une seule émission `step=1` (ajout à `scripts/check-car-lead.mjs` ou fichier voisin).
- **Le tunnel calculé** : dans `flux-impact-weekly.mjs`, une requête ClickHouse par locale sur 28 j :
  `uniqIf(session_id, name='Car Wizard Viewed')`, puis `Step` par valeur de `step`, puis `Submit`
  `status='success'`, puis `Car Lead`, en colonnes `en | fr | de | el`. Le décrochage se lit à l'étape où la
  colonne EN s'effondre.
- **Funnel Plausible** : CE 3.2.1 expose un écran Funnels dans les réglages du site [HYP : à vérifier en
  ouvrant Site settings ; si absent en CE, la requête ci-dessus est le funnel et on n'insiste pas]. S'il
  existe, un funnel `Viewed → Step 2 → Step 3 → Submit success → Car Lead`, filtré `locale=en` puis `fr`.
- **Exclusion des tests maison** : `localStorage.plausible_ignore = "true"` sur les navigateurs de François
  (garde présente dans le script, ligne relue le 07/09). 24 submits `fr` pour 12 % de trafic : c'est la
  première hypothèse à écarter, avant tout bug EN.

### 4.2 Protocole de test manuel du wizard EN (10 lignes)

1. Chrome, fenêtre privée, `plausible_ignore` non posé, DevTools > Réseau filtré sur `api/event`.
2. Ouvrir `https://crete.direct/en/car-rental/heraklion-airport` : attendre `Car Wizard Viewed` `entry_step=2`, `locale=en`.
3. Sans rien toucher : `Car Wizard Step step=2` une seule fois. Recharger : toujours une seule.
4. Choisir un type de voiture, avancer : `Step step=3`. Vérifier que le formulaire dates accepte la saisie clavier ET le sélecteur natif (format `YYYY-MM-DD`, `datesValid` L446-L448).
5. Mettre une date de fin égale au début : le message `tooShort` doit apparaître en anglais, pas en français ni vide.
6. Saisir nom + email valides, téléphone vide : `contactValid` vrai, bouton actif.
7. Envoyer : `Car Wizard Submit status=attempt` puis `status=success`, puis `Car Lead`, écran « sent ».
8. Refaire 2 à 7 avec `pickup` non servi (ex. un village de l'ouest) : écran suggestion, pas de submit fantôme.
9. Refaire 2 à 7 sur Safari iOS (le sélecteur de dates y diffère) : même séquence d'events.
10. Comparer les events reçus à ceux d'un passage identique en `/fr/` : toute divergence de nombre ou d'ordre est le bug.

## 5. Recherche interne : router, normaliser, journaliser les zéros

### 5.1 Normalisation partagée

Le dépôt a **deux** copies de `norm()` avec `GREEK_MAP` (`src/lib/citybus/engine.ts` L29-L32,
`src/lib/urban-journey.ts` L175) et un `normalizeForSearch` sans grec (`src/components/map/mapUtils.ts`
L66-L71). ⛔ `GREEK_MAP` ne couvre que les **majuscules** `Α-Ω` : « ρέθυμνο » saisi en minuscules ne se
translittère pas. Nouveau `src/lib/text-normalize.ts` : une fonction `normalizeText()` = minuscules,
`NFD`, retrait des diacritiques, translittération grecque majuscules **et** minuscules (`ς` compris), les
trois appelants ci-dessus pointent dessus. Test `scripts/check-text-normalize.mjs`.

### 5.2 Routage des requêtes (pur, testé)

Nouveau `src/lib/site-search.ts` : `routeQuery(q, locale, places) => Result[]`, ordre de priorité :
1. **Trajet** : `^(.+?)\s+(to|à|a|vers|nach|προς|->)\s+(.+)$` ou présence de `bus|ktel|λεωφορείο` avec un
   ou deux lieux reconnus → `/buses?from=<place>&to=<place>` (les deux paramètres sont déjà lus par
   `BusesClient.tsx` L363-L372 ; les valeurs doivent être les libellés `from_place` du planner, donc
   résolution via la table d'alias des lieux du planner, pas le slug).
2. **Météo** : `weather|météo|meteo|wetter|καιρός|temperature|rain|wind` → `/weather` (route existante).
3. **Lieu** : correspondance sur `normalizeText(p.name)` dans les lieux slim déjà servis à `/explore`
   (`getAllCbPlacesSlim` + `packCbPlaces`, `src/lib/cb-places`, comme `explore/page.tsx` L134) :
   `beach → /beaches/<slug>`, `village → /villages/<slug>`, `hike → /hikes/<slug>`, `food → /food/<slug>`,
   autre type → `/explore` centré sur le lieu [paramètre d'URL de centrage à vérifier dans `ExploreView`,
   sinon `/explore?q=` avec pré-remplissage du champ].
4. **Rubrique** : l'actuel `SEARCH_INDEX` (conservé, mais passé par `normalizeText`).
La page `/search` devient un composant serveur qui charge les lieux slim une fois et rend le client
existant avec `routeQuery`. Le préfixe de locale est ajouté par le `Link` comme aujourd'hui.

### 5.3 Journal des zéro-résultat : la table existe déjà

Pas de nouvelle table. `flux_intent_daily` (migration `20260710_flux_intent.sql`) et la vue
`v_flux_intent_top` sont faites pour ça, et `admin/flux/page.tsx` L229 affiche déjà `search_query`.
Trois corrections :
- `search/page.tsx` L236 : prop `q` → `query`, et `results` reste (déjà en nombre, à passer en string comme
  `explore_search`).
- `intent_extract.py` `SPECS` : `search_query` filtré `results != '0'` et nouveau `search_query_zero`
  filtré `results = '0'`, même patron que `bus_search` / `bus_search_zero` L27-L30.
- `discover.py` : mode `--mode=search-zero` (dimanche, à côté de `gsc-rss`) qui lit
  `flux_intent_daily where event_name='search_query_zero' and day > current_date - 28 group by prop_value
  having sum(events_count) >= 3` et insère dans `guides_queue` avec `source='search'`, `source_meta`
  `{count, first_day}`, format `short`. Le pipeline éditorial redémarre sur de la demande réelle.

**Objectif** : `search_query_zero / (search_query + search_query_zero)` < 30 % sur 28 j glissants, lu dans
`flux-impact-weekly.mjs` (ligne « RECHERCHE »), 85 % le 07/09.

## 6. `guides_perf` : un job quotidien, une vue

### 6.1 Où il tourne : VPS Python, pas Vercel

Trois raisons, toutes techniques : le compte de service GSC vit sur le VPS
(`/opt/cretepulse-content/gsc-service-account.json`, `lib/gsc_client.py` L6) ; ClickHouse se lit par
`docker exec` local (`intent_extract.py` L47-L52) ; Postgres `cretepulse` écoute en local sur 5433
(`vps/flux/db.py`). Une route cron Vercel devrait porter trois secrets de plus et traverser Internet trois
fois. Le job rejoint la famille `vps/flux/*` : `vps/flux/guides_perf.py`, cron `10 5 * * *` (après
`intent_extract` à 04:50), backfill `--backfill 28`.

### 6.2 Schéma

`guides_perf` existe avec 0 ligne et un schéma que personne n'a documenté. Première action du job :
`\d guides_perf` ; à 0 ligne, la recréer coûte zéro. Schéma cible :

```
guides_perf (
  guide_slug        text not null,      -- slug sans préfixe de locale
  window_end        date not null,      -- fin de fenêtre 28 j (J-3, latence GSC)
  gsc_impressions   int, gsc_clicks int, gsc_position numeric(5,1),
  gsc_top_locale    text,               -- locale qui porte le plus d'impressions
  pl_visitors       int,                -- uniq(user_id) sur 28 j, pathname like '%/articles/<slug>%'
  pl_from_chatgpt   int,                -- referrer_source in ('chatgpt.com','ChatGPT')  [à confirmer sur les sources réelles]
  pl_from_google    int,
  computed_at       timestamptz default now(),
  primary key (guide_slug, window_end)
)
```
Rétention : 180 jours de `window_end`, purge dans le même job. Une ligne par guide et par jour donne la
pente ; la dernière fenêtre donne le classement.

### 6.3 Le job

1. GSC : `searchanalytics().query` dimensions `["page"]`, `rowLimit 5000`, filtre `page contains
   "/articles/"`, fenêtre `[J-31, J-3]`. Slug = dernier segment après `/articles/`, locale = premier
   segment après le domaine (les URL `/fr/articles/<slug>` et `/articles/<slug>` s'agrègent).
2. Plausible : une requête ClickHouse `events_v2` `name='pageview' AND pathname LIKE '%/articles/%'`, même
   fenêtre, `uniq(user_id)` et `uniqIf(user_id, referrer_source = ...)`, groupée par slug extrait par
   `extract(pathname, '/articles/([^/?]+)')`.
3. Upsert `on conflict (guide_slug, window_end) do update`.
4. Sortie standard : `guides_perf: N guides, M avec impression, K depuis ChatGPT` ; erreur = code de sortie
   1 comme `intent_extract.py`, pour que `watchdog.py` et `tasks_health` la voient.

Prérequis humain, à vérifier avant le premier run : le fichier compte de service existe et le compte a le
droit de lecture sur la propriété (`discover.py` L160-L163 « graceful GSC skip » masque un fichier absent
depuis des semaines sans que personne ne le sache ; le job, lui, doit **échouer** bruyamment si le fichier
manque : c'est son seul travail).

### 6.4 La vue

`src/app/admin/guides/page.tsx`, même patron que `admin/flux/page.tsx` (composant serveur, lecture
`supabase.from("v_guides_perf_latest")`), vue SQL `v_guides_perf_latest` = dernière `window_end` par
slug. Un seul tableau, triable : slug, impressions, clics, position, visiteurs, ChatGPT, Google,
`published_at` (jointure `guides`). Pas d'export : la page se copie. Aucune info que l'écran montre déjà
n'est répétée (`feedback_no_useless_info`).

## 7. Verdicts des checks hebdo : fenêtre 7 j et 28 j, Telegram sur rouge

### 7.1 `car-demand-gsc-check.mjs` (tâche `Kairos-CarDemand-GSC-Check`, lundi 09:15, vérifiée Ready le 07/09)

La logique de verdict sort dans un module pur `~/.claude/scripts/lib/weekly-verdict.mjs`, `verdict(m)` avec
`m = { req7, req28, impr7, impr28, submitSuccess7 }` :

| Règle | Couleur |
|---|---|
| `req7 == 0` et `req28 / 4 > 3` | 🔴 « 0 demande en 7 j, baseline 28 j = X/semaine » |
| `req7 < (req28 / 4) / 2` | 🟠 « demandes 7 j à moins de la moitié de la baseline » |
| `impr7 == 0` et `impr28 > 20` | 🔴 « landings sorties de Google cette semaine » |
| `submitSuccess7 > 0` et `req7 == 0` | 🔴 « Plausible voit des submits, la base n'a rien : mesure ou API cassée » |
| sinon | 🟢, une ligne dans le log, rien d'autre |

Données à ajouter au script : `req28` (même SQL que `req7` avec `interval '28 days'`), `impr7` (seconde
requête GSC `startDate = end - 6`), `submitSuccess7` (ClickHouse, comme `flux-impact-weekly.mjs` le fait
déjà par SSH). La ligne « ATTRIBUTION OK (12 demande(s) landing-*) » disparaît : un cumul n'est pas un
verdict. Sur les données du 07/09 (`req7 = 0`, `req28 = 2`), la règle 1 ne rougit pas (baseline 0,5) mais la
règle 3 rougit : 1 impression sur 28 j après 2 landings avec impressions le 31/08, `impr7 = 0`.

### 7.2 `flux-impact-weekly.mjs` (tâche `Kairos-Flux-Impact-Weekly`, lundi 09:30)

Trois lignes de plus : « RECHERCHE » (ratio zéro § 5.3), « TUNNEL VOITURE par locale » (§ 4.1), « GOALS »
(sortie de `check-analytics-events.mjs --live`, § 3.4). Même module de verdict, mêmes couleurs.

### 7.3 `crete-direct-seo-check.mjs` (manuel)

Inchangé dans sa lecture (il porte déjà la règle `lastDownloaded`, pas `lastSubmitted`). Un seul ajout : un
verdict rouge si le sitemap principal a `lastDownloaded` > 14 j ou si les pages avec impression sur 7 j
sont sous 50 % de celles sur 28 j, pour qu'il puisse rejoindre une tâche planifiée plus tard.

### 7.4 Telegram

Les trois scripts du poste n'envoient rien aujourd'hui (« Pas de Telegram, lu au /brief » en tête de
`flux-impact-weekly.mjs`). Le module existe : `~/kairos-telegram/kairos_telegram.ts` exporte `send()`
(L383) et `sendRaw()` (L304) avec `Bot` et `Priority` ; la version Python `kairos_telegram.send(bot, title,
body, priority, channel, dedup_key, ...)` est celle qu'utilise le VPS (`vps/telegram.py`). Règle : un message
sur le canal **ops** uniquement pour 🔴 et 🟠, `dedup_key` = `car-demand-<semaine ISO>`, jamais pour 🟢. Le
message porte la règle déclenchée et les deux nombres, pas le snapshot entier. Le log `memory/*_log.md`
continue de tout recevoir.

## 8. Tests (fichiers)

| Fichier | Ce qu'il tient |
|---|---|
| `scripts/check-pageview-beacon.mjs` (nouveau, dans `npm run check`) | `nextPageview` : rien tant que caché, une émission à visible, pas de doublon sur même pathname, nouvelle pathname = nouvelle pageview avec props identiques, props calculées une fois par session |
| `scripts/check-retention.mjs` (existant, 10 tests) | Inchangé, doit rester vert |
| `scripts/check-analytics-events.mjs` (nouveau, dans `npm run check` ; `--live` dans le hebdo) | Grep `src/` = registre ; `CONVERSION_GOALS ⊆ registre` ; en `--live`, diff avec `plausible_db.goals` |
| `scripts/check-text-normalize.mjs` (nouveau) | Accents FR/DE, grec majuscules et minuscules, `ς`, chaîne vide, idempotence |
| `scripts/check-site-search.mjs` (nouveau) | « heraklion to elounda » → planner ; « bus chania » → planner from ; « météo » → `/weather` ; « Ρέθυμνο » → village ; « elafonissi » → beach ; « xyzzy » → `[]` ; priorité trajet > lieu |
| `scripts/check-car-lead.mjs` (existant, à étendre) | `Car Wizard Step step=1` émis une fois malgré un changement de pickup |
| `vps/flux/tests/test_guides_perf.py` (nouveau) | Extraction slug + locale depuis 4 formes d'URL, agrégation multi-locale, fenêtre `[J-31, J-3]`, échec si fichier compte de service absent |
| `vps/flux/tests/test_intent_extract_search.py` (nouveau) | `search_query` / `search_query_zero` se partagent l'event et ne se recouvrent pas |
| `~/.claude/scripts/tests/weekly-verdict.test.mjs` (nouveau, `node --test`) | Les 5 règles § 7.1, dont le cas du 07/09 (rouge par la règle 3, pas par la 1) |

## 9. Mesure de succès (à relire 4 semaines après le déploiement, 05/10/2026)

1. Rebond Plausible entre 50 et 70 % ; `sessions_v2` sans pageview < 0,5 % (7 % le 07/09).
2. Panneau Goals : `Car Lead`, `Activity Lead`, `van_interest`, `car_offer_viewed` y figurent avec des
   comptes égaux à ClickHouse ; `check-analytics-events --live` vert dans le hebdo.
3. Recherche interne : ratio zéro < 30 % (85 %) ; `guides_queue` reçoit au moins 5 candidats `source='search'`.
4. `guides_perf` > 300 lignes par jour, `/admin/guides` répond en moins d'une seconde, les 10 premiers
   guides ChatGPT sont nommés dans la fiche `project_crete_direct_guides.md`.
5. Le tunnel par locale donne un nombre par étape pour `en` et `fr` ; l'écart EN est expliqué ou réparé.
6. Un lundi sur les quatre au moins, un verdict non vert a produit un message Telegram ops, et aucun 🟢 n'en a produit.

## 10. Effort et ordre

| # | Lot | Heures | Pourquoi cet ordre |
|---|---|---|---|
| 1 | Registre + `check-analytics-events` + génération des commandes rpc (§ 3) | 3 | Visibilité immédiate des conversions, zéro risque prod, le rpc se lance à part |
| 2 | Pageview avec props, fin de `retention` (§ 2) | 4 | Le rebond vrai ; tout le reste se lit dessus |
| 3 | Verdicts 7 j / 28 j + Telegram (§ 7) | 3 | Arrête le « OK » mensonger dès lundi prochain |
| 4 | `search_query` prop + `search_query_zero` + mode discover (§ 5.3) | 1,5 | Une ligne de prop et 5 lignes Python ; débloque le journal |
| 5 | Dédoublonnage `Step` + tunnel par locale + protocole EN (§ 4) | 2 | Réponse à l'anomalie 24/28 |
| 6 | Normalisation partagée + routage recherche (§ 5.1, 5.2) | 6 | Le plus gros lot, indépendant des autres |
| 7 | `guides_perf.py` + vue admin (§ 6) | 6 | Dépend du prérequis compte de service |
| | **Total** | **25,5** | |

Follow-up daté, hors périmètre : brancher `guides_perf` sur la priorité de `guides_queue`
[François, décision après 4 semaines de données, 05/10/2026]. Sentry : token à régénérer [François, 15/09/2026].

## Fichiers lus pour écrire cette spec

- `src/lib/retention.ts` · `src/components/RetentionBeacon.tsx` · `src/app/[locale]/layout.tsx` (L108-L145)
- `https://analytics.crete.direct/js/script.outbound-links.js` (3 493 octets, `plausible.v=33`, relu le 07/09)
- `src/components/car-rental/CarRentalWizard.tsx` (L340-L520) · `src/components/car-rental/CarPriceEstimate.tsx`
- `src/components/ui/ImpressionTracker.tsx` et ses 5 appelants · `src/components/match/MatchDeck.tsx` (`track()` L275 et 16 appels)
- `src/app/[locale]/car-offer/[token]/{AcceptButton,DeclineButton,OfferBeacon}.tsx` · `src/components/activities/ActivityWizard.tsx`
- `src/app/[locale]/buses/VanInterest.tsx` · `src/components/VanPromo.tsx` · `src/components/TaxiCallButton.tsx` · `src/lib/boarding-beacon.ts`
- `src/components/home/{HomeClient,IslandBarometer,ServiceRail}.tsx` · `src/components/beaches/QuieterAltLink.tsx` · `src/components/ShareBar.tsx`
- `src/app/[locale]/search/page.tsx` (intégral) · `src/app/[locale]/search/layout.tsx` (listé)
- `src/components/explore/ExploreView.tsx` (L1001-L1050) · `src/components/map/mapUtils.ts` (L60-L80) · `src/app/[locale]/explore/page.tsx` (L2-L3, L134, L172)
- `src/lib/citybus/engine.ts` (L27-L37) · `src/lib/urban-journey.ts` (L175) · `src/app/[locale]/buses/BusesClient.tsx` (L355-L380)
- `src/app/admin/flux/page.tsx` (L120-L240) · `src/lib/guides.ts` (L40-L95) · `src/app/[locale]/articles/[slug]/page.tsx` (L8-L57)
- `vps/flux/intent_extract.py` · `vps/flux/db.py` · `vps/flux/watchdog.py` (L1-L45) · `vps/flux/tests/` (listé) · `vps/setup_plausible_key.sh` · `vps/partner_report.py` (L29-L46) · `vps/telegram.py` (L1-L40)
- `supabase/migrations/20260710_flux_intent.sql` · `supabase/migrations/20260710_flux_views.sql` (L22-L40) · `supabase/migrations/20260612_car_requests.sql` (L7-L28)
- `migrations/2026-06-02-queue-extended-schema.sql` · `migrations/2026-06-02-seeds-initial.sql` (grep) · `ops/crons/cretepulse-content.crontab`
- `lib/gsc_client.py` (L1-L60) · `discover.py` (grep `gsc`, L152-L193) · `tests/` (listé)
- `package.json` (scripts) · `vitest.config.ts` · `vercel.json` · `src/app/api/cron/` (listé) · `scripts/check-retention.mjs` · `scripts/check-hero-links.mjs` (L1-L40)
- `~/.claude/scripts/car-demand-gsc-check.mjs` · `~/.claude/scripts/flux-impact-weekly.mjs` · `~/.claude/scripts/crete-direct-seo-check.mjs` · `~/.claude/scripts/tasks-health-weekly.mjs` (L6-L10)
- `~/kairos-telegram/kairos_telegram/sender.py` (L334-L352) · `~/kairos-telegram/kairos_telegram.ts` (exports)
- Mémoire : `dev_state.md` L1164, L1403, L1405 (rpc `Plausible.Goals.create`, CE 3.2.1) · `project_crete_direct.md` L522, L621 · `project_crete_direct_van_partage.md` L45-L56 · `project_crete_direct_car_demand.md` L682 · `car_demand_log.md` (2 derniers relevés) · `docs/superpowers/specs/2026-08-01-seo-locale-scope-design.md` (L1-L25, format)
- `Get-ScheduledTask Kairos-*` (07/09) : `Kairos-CarDemand-GSC-Check`, `Kairos-Flux-Impact-Weekly`, `Kairos-GateA-GSC-Check`, `Kairos-Tasks-Health` en `Ready`
