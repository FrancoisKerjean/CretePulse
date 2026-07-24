# Instrumentation boucle de feedback flux — design

Date : 2026-07-11
Statut : validé Kami (cadrage AskUserQuestion : « events + rapport hebdo auto » + « proxy passif »), mandat « jusqu'au bout » sans checkpoint intermédiaire.

## Problème

crete.direct mesure les flux (capteurs, estimateur stock) et agit dessus (planner bus, live GPS, alternatives plages, devis voiture), mais ne mesure pas l'effet de ses propres actions. Trois trous identifiés par audit code du 11/07 :

1. Le funnel bus s'arrête à `bus_search` : les pages `/live` (suivi GPS) n'émettent aucun event, et rien ne capture « consulte les horaires dans la fenêtre de départ » = le meilleur proxy passif « je vais monter dans ce bus ».
2. La section « alternatives plus calmes » des pages plages (l'angle redistribution des flux du lobbying) n'a aucun event de clic.
3. Les events existants vivent en silos Plausible : aucun agrégat hebdo présentable (Kotsoglou, dossier pilote B2G).

Le funnel voiture, lui, est déjà instrumenté bout en bout (`Car Wizard Step`/`Car Lead` avec `source=`, `car_requests` en DB, relevé `car_demand_log.md`) : il sert de modèle, pas de chantier.

## Objectif

Fermer la boucle « mesurer → agir → mesurer l'effet » avec : 2 nouveaux events passifs RGPD-clean + 1 rapport hebdo automatique qui assemble le funnel complet par surface.

## Composant 1 — lib pure `src/lib/boarding-proxy.ts` (TDD)

Fonctions pures, zéro dépendance DOM :

- `inBoardingWindow(inMin: number): boolean` — vrai si `-5 <= inMin <= 15` (départ imminent ou bus à quai depuis peu).
- `bucketInMin(inMin: number): "due" | "0-5" | "6-15"` — bucketing pour props Plausible (cardinalité bornée, jamais la valeur brute).
- `nearStopLabel(distanceM: number | null): "yes" | "no" | "unknown"` — seuil 300 m, `null` → `unknown`.

Tests : `scripts/check-boarding.mjs` (pattern `check-retention.mjs`, `node --experimental-strip-types`), câblé dans `npm run check` (`check:boarding`).

## Composant 2 — event `bus_boarding_proxy`

Un seul nom d'event, prop `surface` discrimine. Dédup sessionStorage : 1 émission max par surface+clé par session (pattern `RetentionBeacon`).

### Surface `pair` (pages trajet `/buses/[pair]`)
- Émis par `NextDeparture.tsx` quand le prochain départ tombe dans la fenêtre (`inBoardingWindow`).
- **Gate anti-réutilisation** : `NextDeparture` est aussi rendu par `JourneyPlanner`. Nouvelle prop optionnelle `trackSurface?: "pair"` passée UNIQUEMENT depuis `buses/[pair]/page.tsx`. Sans la prop, aucun event (comportement existant intact).
- Props : `{ surface: "pair", pair: <route.id>, in_bucket, near_stop }`.

### Surface `live` (page `/live`, suivi GPS)
- Émis par `LiveMapClient.tsx` après **30 s d'engagement continu** onglet visible (timer + `document.visibilityState`), pas au chargement — filtre les rebonds.
- Props : `{ surface: "live", source: "gps" | "estimated", near_stop }` (`source` = gps si au moins un bus agncitybus GPS affiché au moment de l'émission).

### Enrichissement `near_stop` (passif strict)
- Util client `src/lib/passive-position.ts` : `navigator.permissions.query({ name: "geolocation" })` ; **uniquement si `state === "granted"`** → `getCurrentPosition` silencieux → appel `/api/buses/nearest-stop` (endpoint existant NowPanel) → distance → `nearStopLabel`.
- Jamais de prompt de permission. Échec ou permission absente → `unknown`. Timeout court (3 s) : l'event part avec `unknown` plutôt que de ne pas partir.

## Composant 3 — event `quieter_beach_click`

- Nouveau composant client mince `src/components/beaches/QuieterAltLink.tsx` (`"use client"`) : wrappe le `<Link>` d'une alternative avec `onClick` → `window.plausible?.("quieter_beach_click", { props: { from, to, band } })`.
- `QuieterAlternatives` (server, `BeachCrowd.tsx` L62-92) rend `QuieterAltLink` à la place des `<Link>` bruts. Aucune autre modification du composant serveur.
- Props : `from` = slug plage courante (busy/moderate), `to` = slug alternative, `band` = band de l'alternative. Pas de km (cardinalité).

## Composant 4 — rapport hebdo `~/.claude/scripts/flux-impact-weekly.mjs`

Squelette repris de `car-demand-gsc-check.mjs` (SSH VPS + append log mémoire).

- **Source ClickHouse Plausible** (`ssh kairos-vps` → `docker exec` clickhouse-client, DB Plausible, table `events_v2 site_id=1`, fenêtre 7 jours glissants) :
  - `bus_search` (volume planner)
  - `bus_boarding_proxy` ventilé par `surface` et `near_stop` (props via `meta.key/meta.value`)
  - `quieter_beach_click` total + top 5 corridors `from → to`
  - `now_panel_click`, `Car Lead` par `source`, `Activity Lead`
  - `retention` : part des visiteurs `visit_number > 1`
- **Source Postgres cretepulse** (`docker exec cretepulse-postgres psql`) : `car_requests` 7 j par `source` (requête existante du script car-demand).
- **Sortie** : append `~/.claude/projects/C--Users-fkerj/memory/flux_impact_log.md` — bloc daté avec funnel formaté :
  - BUS : recherches → consultations fenêtre départ (pair) → sessions live engagées, dont % near_stop=yes
  - REDISTRIBUTION : clics alternatives calmes + top corridors
  - CAR : leads par source → demandes DB
  - deltas vs bloc précédent quand disponible
- **Planification** : tâche Windows `Kairos-Flux-Impact-Weekly`, lundi 09:30 Athens (après `Kairos-CarDemand-GSC-Check` 09:15). Premier passage 13/07 = baseline quasi vide (prod effective au deploy du 12/07 20h Athens), premier relevé signifiant 20/07.
- **Pas de Telegram** (décision explicite) : le log est lu au `/brief`, même modèle que `car_demand_log.md`.

## RGPD / cohérence privacy

Aucun identifiant, props à cardinalité bornée, geoloc jamais sollicitée (lecture passive si permission déjà accordée par ailleurs), Plausible sans cookie. Cohérent avec la privacy policy « we do not track » et le précédent `RetentionBeacon`.

## Hors périmètre (décisions explicites)

- Dashboard `/admin/impact` (le log markdown suffit ; revoir si le pilote B2G se signe).
- Bouton feedback actif « j'ai pris ce bus » (option écartée au cadrage).
- Toute campagne d'acquisition (Meta Ads) — dossier séparé pilote B2G.
- Calibration du proxy (taux de confirmation réel) : nécessiterait le bouton actif, assumé non calibré v1.

## Critères de succès

1. `npm run check` vert avec `check:boarding` intégré.
2. Events visibles dans Plausible (analytics.crete.direct) sous 24 h post-deploy.
3. `flux_impact_log.md` alimenté automatiquement chaque lundi, funnel 3 volets lisible sans contexte.

## Déploiement

Branche `feat/flux-impact` (worktree `C:\Users\fkerj\cp-flux-impact`), push `origin master` UNIQUEMENT après merge — le daily-deploy promeut `master → main` à 20h Athens (règle `428a74c`, réduction écritures ISR).
